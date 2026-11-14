import {
  account,
  databases,
  storage,
  DB_ID,
  COLLECTIONS,
  STORAGE_BUCKET,
  Query,
} from "./appwrite";
import client from "./appwrite";
import { ID, OAuthProvider } from "react-native-appwrite";
import { Platform } from 'react-native';
import { User } from "../types";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { backendApi } from "./backendApi";
import { levelProgressService } from "./levelProgress";
import { getCurrentMonthKey, shouldResetMonthlyXP } from "../utils";
import { buildUserDocumentData, findOrCreateUserDocument } from "./authProfile";
import schoolEntitlementService from './schoolEntitlementService';
import { getPasswordValidationError } from '../utils/passwordValidation';
import { isMissingSessionError } from '../utils/authCheckPolicy';
import { authDeadline, authFailure, authRequest } from './authFailure';
import type { LoginStep } from './loginDiagnostics';

class AuthService {
  private sessionOperation: Promise<unknown> | null = null;

  private async changeSession<T>(start: () => Promise<T>, timeoutMs: number, stage: string): Promise<T> {
    if (this.sessionOperation) throw authFailure({ code: 'auth_in_progress' }, stage);
    const run = async () => {
      try {
        return await start();
      } catch (error) {
        throw authFailure(error, stage);
      }
    };
    const locks = this.isWeb() && typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const operation = locks
      ? locks.request('moneyquest-auth', { ifAvailable: true }, lock => {
        if (!lock) throw authFailure({ code: 'auth_in_progress' }, stage);
        return run();
      })
      : run();
    this.sessionOperation = operation;
    const release = () => {
      if (this.sessionOperation === operation) this.sessionOperation = null;
    };
    void operation.then(release, release);
    return authRequest(authDeadline(timeoutMs), () => operation, stage);
  }

  private async createEmailSession(email: string, password: string, deadline: ReturnType<typeof authDeadline>) {
    let pending: ReturnType<typeof account.createEmailPasswordSession> | undefined;
    try {
      return await authRequest(deadline, () => {
        pending = account.createEmailPasswordSession({ email: email.trim(), password });
        return pending;
      }, 'session_create');
    } catch (error) {
      if (authFailure(error, 'session_create').kind === 'timeout' && pending) {
        // Hold the session lock until this request settles. Delete only the session it created.
        const session = await pending.catch(() => null);
        if (session?.$id) await account.deleteSession(session.$id).catch(() => {});
      }
      throw error;
    }
  }

  clearLocalAuthCache() {
    backendApi.clearAuthCache();
  }

  private publishWebAccount(accountId: string | null) {
    if (!this.isWeb() || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('moneyquest_active_user_id', accountId ?? '');
    } catch { /* storage can be disabled */ }
  }

  private isWeb(): boolean {
    return Platform.OS === 'web';
  }

  /** Best-effort removal of any locally stored web session remnants. */
  private clearWebSessionRemnants(): void {
    if (!this.isWeb()) {
      return;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('cookieFallback');
      }
    } catch (error) {
      // Non-fatal
    }
  }

  private async ensureUserDocument(
    accountInfo: { $id: string; email: string; name: string },
    profileSeed?: {
      username?: string;
      schoolName?: string;
      phoneNumber?: string;
      age?: number;
      learningLimit?: string;
      mainGoal?: string;
      referralSource?: string;
      avatar?: string;
    }
  ): Promise<any> {
    return findOrCreateUserDocument({
      databases,
      dbId: DB_ID,
      usersCollectionId: COLLECTIONS.USERS,
      accountInfo,
      profileSeed,
    });
  }

  // Check if a username is already taken
  async isUsernameTaken(username: string): Promise<boolean> {
    try {
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal('username', username.toLowerCase().trim()),
        Query.limit(1),
      ]);
      return result.total > 0;
    } catch {
      return false;
    }
  }

  // Create account with email and password
  async createAccount(
    email: string,
    password: string,
    name: string,
    phoneNumber?: string,
    username?: string
  ): Promise<any> {
    let newAccount: any = null;

    try {
      // Validate inputs
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // Check username uniqueness before creating the Appwrite account
      if (username && username.trim()) {
        const taken = await this.isUsernameTaken(username);
        if (taken) {
          throw new Error('This username is already taken. Please choose a different one.');
        }
      }

      // Check if user already exists by trying to create account
      try {
        newAccount = await account.create(
          ID.unique(),
          email,
          password,
          name
        );
      } catch (accountError: any) {
        console.error('Account creation failed:', accountError);

        // Handle specific Appwrite errors
        if (accountError.code === 409) {
          throw new Error('An account with this email already exists. Please use a different email or try signing in.');
        } else if (accountError.code === 400) {
          throw new Error('Invalid email format or password requirements not met.');
        } else if (accountError.message) {
          throw new Error(`Account creation failed: ${accountError.message}`);
        }

        throw accountError;
      }

      // Create user document in database
      try {
        await this.createUserDocument(newAccount.$id, email, name, phoneNumber, username);
      } catch (docError: any) {
        console.error('User document creation failed:', docError);

        // If user document creation fails, we should delete the account to maintain consistency
        try {
          await account.deleteSession('current').catch(() => { }); // Clean up any session
          // Note: We can't delete the account directly, but we can warn the user
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError);
        }

        if (docError.code === 404) {
          throw new Error('Database or collection not found. Please contact support.');
        } else if (docError.code === 401) {
          throw new Error('Permission denied. Please contact support.');
        }

        throw new Error(`Account created but profile setup failed. Please try signing in and complete your profile setup. Error: ${docError.message}`);
      }

      return newAccount;
    } catch (error) {
      console.error("Create account error:", error);

      // Log more specific error details
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      throw error;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string, onStep?: (step: LoginStep) => void) {
    const deadline = authDeadline(15000);
    return this.changeSession(async () => {
      onStep?.('session_request_sent');
      const session = await this.createEmailSession(email, password, deadline);
      onStep?.('session_created');

      try {
        onStep?.('account_request_sent');
        const accountInfo = await authRequest(deadline, () => account.get(), 'account_read');
        onStep?.('account_read');
        onStep?.('profile_request_sent');
        const userDocument = await authRequest(deadline, () => this.ensureUserDocument(accountInfo), 'profile_read');
        onStep?.('profile_read');
        if (userDocument?.accountStatus === 'disabled') {
          throw authFailure(new Error('ACCOUNT_DISABLED:' + accountInfo.$id), 'profile_read');
        }
        this.clearLocalAuthCache();
        this.publishWebAccount(accountInfo.$id);
        return { currentUser: { ...userDocument, email: accountInfo.email, name: accountInfo.name }, userDocument };
      } catch (error) {
        if (authFailure(error, 'profile_read').kind !== 'disabled' && session?.$id) {
          onStep?.('session_cleanup_started');
          await account.deleteSession(session.$id).catch(() => {});
          onStep?.('session_cleanup_finished');
          backendApi.clearAuthCache();
        }
        throw error;
      }
    }, 15000, 'session_create');
  }

  async signOut(expectedUserId?: string): Promise<void> {
    await this.changeSession(async () => {
      if (expectedUserId && this.isWeb() && typeof window !== 'undefined') {
        let active: string | null = null;
        try { active = window.localStorage.getItem('moneyquest_active_user_id'); } catch { /* storage can be disabled */ }
        if (active && active !== expectedUserId) return;
      }
      backendApi.clearAuthCache();
      try {
        await account.deleteSession('current');
      } catch (error) {
        if (!isMissingSessionError(error)) throw error;
      }
      this.clearWebSessionRemnants();
      this.publishWebAccount(null);
    }, 15000, 'session_cleanup');
  }

  async restoreSession() {
    const deadline = authDeadline(15000);
    try {
      const session = await authRequest(deadline, () => account.getSession('current'), 'session_read');
      if (!session) return null;
      const closeInvalidSession = () => this.changeSession(async () => {
        try {
          await account.deleteSession(session.$id);
        } catch (error) {
          if (!isMissingSessionError(error)) throw error;
        }
      }, 15000, 'session_cleanup');
      if (session.provider === 'anonymous') {
        await authRequest(deadline, closeInvalidSession, 'session_cleanup');
        return null;
      }
      const info = await authRequest(deadline, () => account.get(), 'account_read');
      if (session.userId && session.userId !== info.$id) throw authFailure({ code: 'auth_in_progress' }, 'session_read');
      if (!info.email?.trim()) {
        await authRequest(deadline, closeInvalidSession, 'session_cleanup');
        return null;
      }
      const userDocument = await authRequest(deadline, () => this.ensureUserDocument(info), 'profile_read');
      const currentUser = { ...userDocument, $id: info.$id, email: info.email, name: info.name } as User;
      return { currentUser, userDocument };
    } catch (error) {
      const failure = authFailure(error, 'session_read');
      if (failure.kind === 'expired') return null;
      throw failure;
    }
  }

  // Get current user
  async getCurrentUser(strict = false): Promise<any> {
    try {
      return (await this.restoreSession())?.currentUser ?? null;
    } catch (error) {
      if (strict) throw error;
      return null;
    }
  }

  // Get user document from database
  async getUserDocument(userId: string): Promise<User | null> {
    try {
      // Get the document directly using the userId as the document ID
      const userDoc = await databases.getDocument(
        DB_ID,
        COLLECTIONS.USERS,
        userId
      );

      const currentMonthKey = getCurrentMonthKey();
      const needsMonthlyReset = shouldResetMonthlyXP(userDoc.lastMonthlyReset);

      if (needsMonthlyReset) {
        const resetPayload = {
          monthlyXP: 0,
          lastMonthlyReset: currentMonthKey,
          updatedAt: new Date().toISOString(),
        };

        try {
          await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, resetPayload);
        } catch (resetError) {
          console.error("Monthly XP reset error:", resetError);
        }

        userDoc.monthlyXP = 0;
        userDoc.lastMonthlyReset = currentMonthKey;
      }

      // Type-safe conversion from Appwrite document to User interface
      const user: User = {
        $id: userDoc.$id,
        email: userDoc.email,
        name: userDoc.name,
        username: userDoc.username,
        phoneNumber: userDoc.phoneNumber,
        profilePicture: userDoc.profilePicture,
        profilePictureId: userDoc.profilePictureId,
        age: userDoc.age,
        learningLimit: userDoc.learningLimit,
        mainGoal: userDoc.mainGoal,
        referralSource: userDoc.referralSource,
        avatar: userDoc.avatar,
        xp: userDoc.xp || 0,
        level: userDoc.level || 1,
        currentSection: userDoc.currentSection || 1,
        streak: userDoc.streak || 0,
        lastLoginDate: userDoc.lastLoginDate,
        totalQuestionsAnswered: userDoc.totalQuestionsAnswered || 0,
        correctAnswers: userDoc.correctAnswers || 0,
        monthlyXP: userDoc.monthlyXP || 0,
        totalXP: userDoc.totalXP || 0,
        lastMonthlyReset: userDoc.lastMonthlyReset,
        lives: userDoc.lives !== undefined && userDoc.lives !== null ? userDoc.lives : 5,
        lastLifeRegenTime: userDoc.lastLifeRegenTime || new Date().toISOString(),
        currentLevelId: userDoc.currentLevelId,
        currentSectionId: userDoc.currentSectionId,
        hasCompletedTutorial: userDoc.hasCompletedTutorial || false,
        accountStatus: userDoc.accountStatus,
        $createdAt: userDoc.$createdAt,
        $updatedAt: userDoc.$updatedAt,
      };

      return user;
    } catch (error) {
      console.error("Get user document error:", error);
      return null;
    }
  }

  // Create user document in database
  async createUserDocument(
    userId: string,
    email: string,
    name: string,
    phoneNumber?: string,
    username?: string
  ): Promise<any> {
    try {
      if (!DB_ID) {
        throw new Error('Database ID is not configured');
      }

      if (!COLLECTIONS.USERS) {
        throw new Error('Users collection ID is not configured');
      }

      return await findOrCreateUserDocument({
        databases,
        dbId: DB_ID,
        usersCollectionId: COLLECTIONS.USERS,
        accountInfo: {
          $id: userId,
          email,
          name,
        },
        profileSeed: {
          phoneNumber,
          username,
        },
      });
    } catch (error: any) {
      console.error("Create user document error:", error);
      console.error("DB_ID:", DB_ID);
      console.error("COLLECTIONS.USERS:", COLLECTIONS.USERS);
      console.error("userId:", userId);
      throw error;
    }
  }

  // Update user profile picture
  async updateProfilePicture(
    userId: string,
    imageUri: string
  ): Promise<string> {
    try {
      const fileName = `profile_${userId}_${Date.now()}.jpg`;

      // Web uses the official appwrite SDK, which accepts a browser File/Blob;
      // native uses react-native-appwrite's { uri, name, type } file object.
      let fileObject: any;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(imageUri)).blob();
        fileObject = new File([blob], fileName, { type: 'image/jpeg' });
      } else {
        fileObject = {
          name: fileName,
          type: 'image/jpeg',
          size: 0, // This will be set by the library
          uri: imageUri,
        };
      }

      // Upload to Appwrite storage
      const file = await storage.createFile(
        STORAGE_BUCKET,
        ID.unique(),
        fileObject
      );

      // Generate the file view URL
      const fileUrl = `${client.config.endpoint}/storage/buckets/${STORAGE_BUCKET}/files/${file.$id}/view?project=${client.config.project}`;

      // First find the user document by userId
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.USERS,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        throw new Error('User document not found');
      }

      const userDoc = response.documents[0];

      // Update user document with profile picture ID
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userDoc.$id, {
        profilePictureId: file.$id,
        profilePicture: fileUrl,
        updatedAt: new Date().toISOString(),
      });

      return file.$id;
    } catch (error) {
      console.error("Update profile picture error:", error);
      throw error;
    }
  }

  // Update user onboarding data
  async updateUserOnboarding(
    userId: string,
    onboardingData: {
      age: number;
      learningLimit: string;
      mainGoal: string;
      referralSource: string;
      avatar: string;
    }
  ): Promise<void> {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        age: onboardingData.age,
        learningLimit: onboardingData.learningLimit,
        mainGoal: onboardingData.mainGoal,
        referralSource: onboardingData.referralSource,
        avatar: onboardingData.avatar,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Update user onboarding error:", error);
      throw error;
    }
  }

  // Create account with all onboarding data at once
  async createAccountWithOnboarding({
    email,
    password,
    name,
    username,
    schoolName,
    phoneNumber,
    age,
    learningLimit,
    mainGoal,
    referralSource,
    avatar
  }: {
    email: string;
    password: string;
    name: string;
    username?: string;
    schoolName?: string;
    phoneNumber?: string;
    age: number;
    learningLimit: string;
    mainGoal: string;
    referralSource: string;
    avatar: string;
  }): Promise<any> {
    const deadline = authDeadline(20000);
    let accountCreated = false;
    try {
      return await this.changeSession(async () => {
        const passwordError = getPasswordValidationError(password);
        if (passwordError) throw authFailure({ code: 400 }, 'signup_validation');
        const newAccount = await account.create(ID.unique(), email.trim(), password, name).catch(error => {
          throw authFailure(error, 'account_create');
        });
        accountCreated = true;
        let session: Awaited<ReturnType<typeof account.createEmailPasswordSession>> | undefined;

        try {
          session = await this.createEmailSession(email, password, deadline);
          const user = await authRequest(deadline, () => account.get(), 'account_read');
          if (user.$id !== newAccount.$id) throw new Error('The active account changed');
          const userDocument = await authRequest(deadline, () => this.ensureUserDocument(user, {
            username, schoolName, phoneNumber, age, learningLimit, mainGoal, referralSource, avatar,
          }), 'profile_read');
          this.clearLocalAuthCache();
          this.publishWebAccount(user.$id);
          void schoolEntitlementService.claimByEmail().catch(() => {});
          return { currentUser: user, userDocument };
        } catch (error) {
          if (session?.$id) await account.deleteSession(session.$id).catch(() => {});
          throw { ...authFailure(error, 'profile_read'), kind: 'setup_interrupted' };
        }
      }, 20000, 'account_create');
    } catch (error) {
      const failure = authFailure(error, 'account_create');
      if (accountCreated && failure.kind === 'timeout') throw { ...failure, kind: 'setup_interrupted' };
      throw failure;
    }
  }

  // Update last login date and streak
  async updateLastLoginDate(): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) return;

      const userDoc = await this.getUserDocument(currentUser.$id);
      if (!userDoc) return;

      const today = new Date();
      const lastLogin = new Date(userDoc.lastLoginDate);
      const timeDiff = today.getTime() - lastLogin.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

      let newStreak = userDoc.streak;

      if (daysDiff === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (daysDiff > 1) {
        // Missed days, reset streak
        newStreak = 1;
      }
      // If daysDiff === 0, it's the same day, keep current streak

      await databases.updateDocument(
        DB_ID,
        COLLECTIONS.USERS,
        userDoc.$id, // Use document ID, not user ID
        {
          lastLoginDate: today.toISOString(),
          streak: newStreak,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Update last login date error:", error);
    }
  }

  // Send password recovery email
  // The user will reset their password on a web page and then login back in the app
  async sendPasswordRecovery(email: string): Promise<void> {
    await this.changeSession(async () => {
      try {
        await account.createRecovery(email.trim(), 'https://moneyquest.nurtureehaven.com/reset-password');
      } catch (error) {
        // Match the successful response when the address is unknown.
        if (Number((error as { code?: number })?.code) !== 404) throw error;
      }
    }, 15000, 'recovery_send');
  }

  async completePasswordRecovery(userId: string, secret: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword || password.length < 8) {
      throw authFailure({ code: 400 }, 'recovery_complete');
    }
    await this.changeSession(() => account.updateRecovery(userId, secret, password), 15000, 'recovery_complete');
  }

  // Create verification for email
  async createEmailVerification(): Promise<void> {
    try {
      await account.createVerification("http://localhost:3000/verify-email");
    } catch (error) {
      console.error("Create email verification error:", error);
      throw error;
    }
  }

  // Confirm email verification
  async confirmEmailVerification(
    userId: string,
    secret: string
  ): Promise<void> {
    try {
      await account.updateVerification(userId, secret);
    } catch (error) {
      console.error("Confirm email verification error:", error);
      throw error;
    }
  }

  // OAuth sign-in methods
  async signInWithGoogle(): Promise<User> {
    try {
      // Create the OAuth2 session with proper success/failure URLs
      const redirectUrl = 'moneyquest://oauth-callback';
      const successUrl = `${redirectUrl}/success`;
      const failureUrl = `${redirectUrl}/failure`;
      
      // This will open Google sign-in in browser
      await account.createOAuth2Session(
        'google' as OAuthProvider,
        successUrl,
        failureUrl
      );

      // Wait a bit for the session to be created
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the current session
      const session = await account.getSession('current');
      
      // Get user details
      const userAccount = await account.get();

      // Check if user exists in our database
      let userDoc;
      try {
        const existingUsers = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.USERS,
          [Query.equal('email', userAccount.email)]
        );

        if (existingUsers.documents.length > 0) {
          userDoc = existingUsers.documents[0];
        } else {
          // Create new user document
          userDoc = await databases.createDocument(
            DB_ID,
            COLLECTIONS.USERS,
            ID.unique(),
            {
              email: userAccount.email,
              name: userAccount.name,
              avatar: 'avatar1', // Default avatar
              xp: 0,
              lives: 5,
              createdAt: new Date().toISOString(),
            }
          );
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to create/retrieve user profile');
      }

      return {
        $id: userDoc.$id,
        email: userDoc.email,
        name: userDoc.name,
        username: userDoc.username,
        phoneNumber: userDoc.phoneNumber,
        profilePicture: userDoc.profilePicture,
        profilePictureId: userDoc.profilePictureId,
        age: userDoc.age,
        learningLimit: userDoc.learningLimit,
        mainGoal: userDoc.mainGoal,
        referralSource: userDoc.referralSource,
        avatar: userDoc.avatar,
        xp: userDoc.xp || 0,
        level: userDoc.level || 1,
        currentSection: userDoc.currentSection || 1,
        streak: userDoc.streak || 0,
        lastLoginDate: userDoc.lastLoginDate,
        totalQuestionsAnswered: userDoc.totalQuestionsAnswered || 0,
        correctAnswers: userDoc.correctAnswers || 0,
        monthlyXP: userDoc.monthlyXP || 0,
        totalXP: userDoc.totalXP || 0,
        lives: userDoc.lives !== undefined && userDoc.lives !== null ? userDoc.lives : 5,
        lastLifeRegenTime: userDoc.lastLifeRegenTime || new Date().toISOString(),
        currentLevelId: userDoc.currentLevelId,
        currentSectionId: userDoc.currentSectionId,
        hasCompletedTutorial: userDoc.hasCompletedTutorial || false,
        $createdAt: userDoc.$createdAt,
        $updatedAt: userDoc.$updatedAt,
      };
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async signInWithFacebook(): Promise<void> {
    try {
      // TODO: Use correct OAuth provider enum when available
      await account.createOAuth2Session(
        "facebook" as any,
        "moneyquest://oauth-callback/success",
        "moneyquest://oauth-callback/failure"
      );
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      throw error;
    }
  }

  async signInWithTwitter(): Promise<void> {
    try {
      // TODO: Use correct OAuth provider enum when available
      await account.createOAuth2Session(
        "twitter" as any,
        "moneyquest://oauth-callback/success",
        "moneyquest://oauth-callback/failure"
      );
    } catch (error) {
      console.error("Twitter sign-in error:", error);
      throw error;
    }
  }

  async signUp(email: string, password: string, name: string, phoneNumber?: string, username?: string) {
    try {
      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      // Step 1: Create the account
      const newAccount = await account.create(
        ID.unique(),
        email,
        password,
        name
      );

      // Step 2: Immediately sign in the user after account creation
      await account.createSession(email, password);

      // Step 3: Now get the current user (session is established)
      const user = await account.get();

      // Step 4: Create user document in your database with additional fields
      const documentId = ID.unique(); // Generate a separate document ID
      const userDocument = await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_USERS_COLLECTION_ID!,
        documentId, // Use generated ID
        {
          userId: user.$id, // Store the actual Appwrite user ID as a field
          email: user.email,
          name: user.name,
          username: username || '',
          phoneNumber: phoneNumber || '',
          profilePicture: '',
          profilePictureId: '',
          xp: 0,
          level: 1,
          currentSection: 1,
          streak: 0,
          lastLoginDate: new Date().toISOString(),
          totalQuestionsAnswered: 0,
          correctAnswers: 0,
          monthlyXP: 0,
        }
      );

      // Step 5: Return the combined user data
      return {
        $id: userDocument.$id, // Use the document ID
        userId: userDocument.userId,
        email: user.email,
        name: user.name,
        username: userDocument.username,
        phoneNumber: userDocument.phoneNumber,
        profilePicture: userDocument.profilePicture,
        profilePictureId: userDocument.profilePictureId,
        xp: userDocument.xp,
        level: userDocument.level,
        currentSection: userDocument.currentSection,
        streak: userDocument.streak,
        lastLoginDate: userDocument.lastLoginDate,
        totalQuestionsAnswered: userDocument.totalQuestionsAnswered,
        correctAnswers: userDocument.correctAnswers,
        monthlyXP: userDocument.monthlyXP,
        $createdAt: user.$createdAt,
        $updatedAt: user.$updatedAt,
      } as User;

    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Reactivate a previously disabled account.
   * Clears accountStatus so the user can sign in normally again.
   * Can only be called while a valid session exists (session is kept alive during the disabled check).
   */
  async reactivateAccount(userId: string): Promise<void> {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        accountStatus: 'active',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Reactivate account error:', error);
      throw new Error('Failed to reactivate account. Please try again.');
    }
  }

  /**
   * Disable (deactivate) the current user's account.
   * Sets accountStatus to 'disabled' on the user document and signs out.
   * The account data is preserved and can be reactivated later.
   */
  async disableAccount(userId: string): Promise<void> {
    try {
      backendApi.clearAuthCache();
      // Set accountStatus to disabled on user document
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        accountStatus: 'disabled',
        updatedAt: new Date().toISOString(),
      });

      // Sign out the user
      try {
        await account.deleteSession('current');
      } catch (err) {
        // Session may already be invalid
      }
    } catch (error) {
      console.error('Account disable failed:', error);
      throw new Error('Failed to disable account. Please try again or contact support.');
    }
  }

  /**
   * Delete the current user's account and all associated data.
   * 1. Deletes user progress documents
   * 2. Deletes streak documents
   * 3. Deletes the user document
   * 4. Deletes profile picture from storage (if any)
   * 5. Disables the Appwrite auth account via updateStatus()
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      backendApi.clearAuthCache();
      // 1. Delete user progress documents
      try {
        const progressDocs = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.USER_PROGRESS,
          [Query.equal('userId', userId), Query.limit(100)]
        );
        for (const doc of progressDocs.documents) {
          await databases.deleteDocument(DB_ID, COLLECTIONS.USER_PROGRESS, doc.$id);
        }
      } catch (err) {
        console.warn('Could not delete progress records:', err);
      }

      // 2. Delete streak documents
      try {
        const streakDocs = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.STREAKS,
          [Query.equal('userId', userId), Query.limit(10)]
        );
        for (const doc of streakDocs.documents) {
          await databases.deleteDocument(DB_ID, COLLECTIONS.STREAKS, doc.$id);
        }
      } catch (err) {
        console.warn('Could not delete streak records:', err);
      }

      // 3. Delete profile picture from storage (if any)
      try {
        const userDoc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
        if (userDoc?.profilePictureId) {
          await storage.deleteFile(STORAGE_BUCKET, userDoc.profilePictureId);
        }
      } catch (err) {
        console.warn('Could not delete profile picture:', err);
      }

      // 4. Delete the user document
      try {
        await databases.deleteDocument(DB_ID, COLLECTIONS.USERS, userId);
      } catch (err) {
        console.warn('Could not delete user document:', err);
      }

      // 5. Disable the Appwrite auth account (self-block)
      // This makes the account unusable — the user can no longer sign in
      try {
        await account.updateStatus();
      } catch (err) {
        console.warn('Could not disable auth account:', err);
      }

      // 6. Delete current session
      try {
        await account.deleteSession('current');
      } catch (err) {
        // Session may already be invalid after account disable
      }

    } catch (error) {
      console.error('Account deletion failed:', error);
      throw new Error('Failed to delete account. Please try again or contact support.');
    }
  }
}

export default new AuthService();
