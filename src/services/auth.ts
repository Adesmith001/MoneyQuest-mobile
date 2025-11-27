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
import { User } from "../types";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

class AuthService {

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
      console.log('Creating Appwrite account for:', { email, name });
      console.log('Password length:', password.length);
      console.log('Appwrite endpoint:', client.config.endpoint);
      console.log('Appwrite project ID:', client.config.project);

      // Validate inputs
      if (!email || !password || !name) {
        throw new Error('Email, password, and name are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Check if user already exists by trying to create account
      try {
        newAccount = await account.create(
          ID.unique(),
          email,
          password,
          name
        );
        console.log('Appwrite account created successfully:', newAccount.$id);
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
      console.log('Now creating user document in database...');
      try {
        await this.createUserDocument(newAccount.$id, email, name, phoneNumber, username);
        console.log('User document created successfully');
      } catch (docError: any) {
        console.error('User document creation failed:', docError);

        // If user document creation fails, we should delete the account to maintain consistency
        try {
          console.log('Attempting to clean up account due to document creation failure...');
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
  async signIn(email: string, password: string): Promise<any> {
    try {
      // Check if there's already an active session
      try {
        const currentSession = await account.getSession('current');
        if (currentSession) {
          // If there's already a session, delete it first
          await account.deleteSession('current');
        }
      } catch (error) {
        // No active session, which is fine
      }

      // Create email session
      await account.createEmailPasswordSession(email, password);

      // Get current user after session is created
      const user = await this.getCurrentUser();
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await account.deleteSession("current");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<any> {
    try {
      // First check if there's an active session
      let session;
      try {
        session = await account.getSession('current');
      } catch (error) {
        return null;
      }

      if (!session) {
        return null;
      }

      // Get the account info
      const account_info = await account.get();

      // Get the user document from your database using userId field
      const userDoc = await this.getUserDocument(account_info.$id);

      if (!userDoc) {
        return null;
      }

      return {
        $id: userDoc.$id, // Use document ID
        userId: userDoc.userId,
        email: account_info.email,
        name: account_info.name,
        username: userDoc.username,
        phoneNumber: userDoc.phoneNumber,
        profilePicture: userDoc.profilePicture,
        profilePictureId: userDoc.profilePictureId,
        age: userDoc.age,
        learningLimit: userDoc.learningLimit,
        mainGoal: userDoc.mainGoal,
        referralSource: userDoc.referralSource,
        avatar: userDoc.avatar,
        xp: userDoc.xp,
        level: userDoc.level,
        currentSection: userDoc.currentSection,
        streak: userDoc.streak,
        lastLoginDate: userDoc.lastLoginDate,
        totalQuestionsAnswered: userDoc.totalQuestionsAnswered,
        correctAnswers: userDoc.correctAnswers,
        monthlyXP: userDoc.monthlyXP,
        $createdAt: account_info.$createdAt,
        $updatedAt: account_info.$updatedAt,
      } as User;

    } catch (error) {
      console.error('Get current user error:', error);
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
        lives: userDoc.lives !== undefined ? userDoc.lives : 5,
        lastLifeRegenTime: userDoc.lastLifeRegenTime || new Date().toISOString(),
        currentLevelId: userDoc.currentLevelId,
        currentSectionId: userDoc.currentSectionId,
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
  ): Promise<void> {
    try {
      const currentDate = new Date().toISOString();

      console.log('Creating user document with configuration:');
      console.log('DB_ID:', DB_ID);
      console.log('COLLECTIONS.USERS:', COLLECTIONS.USERS);
      console.log('userId:', userId);

      if (!DB_ID) {
        throw new Error('Database ID is not configured');
      }

      if (!COLLECTIONS.USERS) {
        throw new Error('Users collection ID is not configured');
      }

      const userData: any = {
        email,
        name,
        xp: 0,
        level: 1,
        currentSection: 1,
        streak: 0,
        lastLoginDate: currentDate,
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        monthlyXP: 0,
        totalXP: 0,
        // Lives system - start with 5 lives
        lives: 5,
        lastLifeRegenTime: currentDate,
        // Current level/section tracking (will be set when user starts)
        currentLevelId: null,
        currentSectionId: null,
        // createdAt: currentDate,
        // updatedAt: currentDate,
      };

      if (phoneNumber && phoneNumber.trim() !== '') {
        userData.phoneNumber = phoneNumber;
      }

      if (username && username.trim() !== '') {
        userData.username = username;
      }

      console.log('User data to be created:', JSON.stringify(userData, null, 2));

      // Use the Appwrite user ID as the document ID to maintain consistency
      const document = await databases.createDocument(
        DB_ID,
        COLLECTIONS.USERS,
        userId, // Use the Appwrite user ID as the document ID
        userData
      );

      console.log('User document created successfully with ID:', document.$id);
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
      // Create file object for React Native Appwrite
      const fileName = `profile_${userId}_${Date.now()}.jpg`;
      const fileObject = {
        name: fileName,
        type: "image/jpeg",
        size: 0, // This will be set by the library
        uri: imageUri,
      };

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

      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userDoc.$id, {
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
    phoneNumber?: string;
    age: number;
    learningLimit: string;
    mainGoal: string;
    referralSource: string;
    avatar: string;
  }): Promise<any> {
    let newAccount: any = null;

    try {
      console.log('Creating Appwrite account with onboarding data for:', { email, name });

      // Step 1: Create the account
      newAccount = await account.create(
        ID.unique(),
        email,
        password,
        name
      );

      console.log('Appwrite account created successfully:', newAccount.$id);

      // Step 2: Immediately sign in the user after account creation
      await account.createEmailPasswordSession(email, password);

      // Step 3: Now get the current user (session is established)
      const user = await account.get();

      // Step 4: Create user document with ALL data including onboarding
      console.log('Creating user document with onboarding data...');
      const userDocument = await databases.createDocument(
        DB_ID,
        COLLECTIONS.USERS,
        user.$id, // Use the Appwrite user ID as the document ID
        {
          email: user.email,
          name: user.name,
          username: username || '',
          phoneNumber: phoneNumber || '',
          profilePicture: '',
          profilePictureId: '',
          age,
          learningLimit,
          mainGoal,
          referralSource,
          avatar,
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

      console.log('User document created successfully with onboarding data');

      // Step 5: Return the combined user data
      return {
        currentUser: user,
        userDocument: {
          $id: userDocument.$id, // Document ID (same as user ID)
          email: user.email,
          name: user.name,
          username: userDocument.username,
          phoneNumber: userDocument.phoneNumber,
          profilePicture: userDocument.profilePicture,
          profilePictureId: userDocument.profilePictureId,
          age: userDocument.age,
          learningLimit: userDocument.learningLimit,
          mainGoal: userDocument.mainGoal,
          referralSource: userDocument.referralSource,
          avatar: userDocument.avatar,
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
        }
      };

    } catch (error: any) {
      console.error('Create account with onboarding error:', error);

      // Clean up any created session if document creation failed
      if (newAccount && newAccount.$id) {
        try {
          console.log('Attempting to clean up session due to document creation failure...');
          // Only delete the session, not the account (account deletion requires different permissions)
          await account.deleteSession('current').catch(() => {
            // Ignore session deletion errors - session might not exist
          });
        } catch (cleanupError) {
          console.error('Session cleanup failed:', cleanupError);
        }
      }

      throw new Error(`Account creation failed: ${error.message}`);
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
  async sendPasswordRecovery(email: string): Promise<void> {
    try {
      const recoveryUrl = `https://reliable-twilight-323604.netlify.app/`;
      await account.createRecovery(email, recoveryUrl);
    } catch (error: any) {
      console.error("Send password recovery error:", error);
      if (error.code === 404) {
        throw new Error("No account found with this email address.");
      } else if (error.code === 429) {
        throw new Error("Too many requests. Please wait before trying again.");
      } else if (error.code === 400 && error.message?.includes('Invalid `url` param')) {
        throw new Error("Password reset is not properly configured. Please contact support.");
      }
      throw new Error(error.message || "Failed to send recovery email. Please try again.");
    }
  }

  // Complete password recovery
  async completePasswordRecovery(
    userId: string,
    secret: string,
    password: string,
    confirmPassword: string
  ): Promise<void> {
    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      await account.updateRecovery(userId, secret, password);
    } catch (error: any) {
      console.error("Complete password recovery error:", error);
      if (error.code === 401) {
        throw new Error("Invalid or expired recovery code. Please request a new password reset.");
      } else if (error.code === 400) {
        throw new Error("Invalid password format.");
      }
      throw new Error(error.message || "Failed to reset password. Please try again.");
    }
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
      console.log('Starting Google OAuth...');
      
      // Create the OAuth2 session with proper success/failure URLs
      const redirectUrl = 'moneyquest://oauth-callback';
      const successUrl = `${redirectUrl}/success`;
      const failureUrl = `${redirectUrl}/failure`;
      
      console.log('Success URL:', successUrl);
      console.log('Failure URL:', failureUrl);
      
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
      console.log('OAuth Session created:', session);
      
      // Get user details
      const userAccount = await account.get();
      console.log('User account retrieved:', userAccount);

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
          console.log('Existing user found:', userDoc);
        } else {
          // Create new user document
          console.log('Creating new user document...');
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
          console.log('New user created:', userDoc);
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
        lives: userDoc.lives !== undefined ? userDoc.lives : 5,
        lastLifeRegenTime: userDoc.lastLifeRegenTime || new Date().toISOString(),
        currentLevelId: userDoc.currentLevelId,
        currentSectionId: userDoc.currentSectionId,
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
}

export default new AuthService();