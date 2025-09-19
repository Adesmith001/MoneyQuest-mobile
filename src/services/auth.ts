import { account, databases, storage, DB_ID, COLLECTIONS, STORAGE_BUCKET } from './appwrite';
import client from './appwrite';
import { ID } from 'react-native-appwrite';
import { User } from '../types';

class AuthService {
  // Create account with email and password
  async createAccount(email: string, password: string, name: string): Promise<any> {
    try {
      const newAccount = await account.create(ID.unique(), email, password, name);
      
      // Create user document in database
      await this.createUserDocument(newAccount.$id, email, name);
      
      return newAccount;
    } catch (error) {
      console.error('Create account error:', error);
      throw error;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<any> {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      await this.updateLastLoginDate();
      return session;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<any> {
    try {
      return await account.get();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Get user document from database
  async getUserDocument(userId: string): Promise<User | null> {
    try {
      const userDoc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      
      // Type-safe conversion from Appwrite document to User interface
      const user: User = {
        $id: userDoc.$id,
        email: userDoc.email,
        name: userDoc.name,
        profilePicture: userDoc.profilePicture,
        profilePictureId: userDoc.profilePictureId,
        xp: userDoc.xp || 0,
        level: userDoc.level || 1,
        currentSection: userDoc.currentSection || 1,
        streak: userDoc.streak || 0,
        lastLoginDate: userDoc.lastLoginDate,
        totalQuestionsAnswered: userDoc.totalQuestionsAnswered || 0,
        correctAnswers: userDoc.correctAnswers || 0,
        monthlyXP: userDoc.monthlyXP || 0,
        createdAt: userDoc.createdAt || userDoc.$createdAt,
        updatedAt: userDoc.updatedAt || userDoc.$updatedAt,
      };
      
      return user;
    } catch (error) {
      console.error('Get user document error:', error);
      return null;
    }
  }

  // Create user document in database
  async createUserDocument(userId: string, email: string, name: string): Promise<void> {
    try {
      const currentDate = new Date().toISOString();
      await databases.createDocument(DB_ID, COLLECTIONS.USERS, userId, {
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
        createdAt: currentDate,
        updatedAt: currentDate,
      });
    } catch (error) {
      console.error('Create user document error:', error);
      throw error;
    }
  }

  // Update user profile picture
  async updateProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      // Create file object for React Native Appwrite
      const fileName = `profile_${userId}_${Date.now()}.jpg`;
      const fileObject = {
        name: fileName,
        type: 'image/jpeg',
        size: 0, // This will be set by the library
        uri: imageUri,
      };
      
      // Upload to Appwrite storage
      const file = await storage.createFile(STORAGE_BUCKET, ID.unique(), fileObject);
      
      // Generate the file view URL
      const fileUrl = `${client.config.endpoint}/storage/buckets/${STORAGE_BUCKET}/files/${file.$id}/view?project=${client.config.project}`;
      
      // Update user document with profile picture ID
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        profilePictureId: file.$id,
        profilePicture: fileUrl,
        updatedAt: new Date().toISOString(),
      });

      return file.$id;
    } catch (error) {
      console.error('Update profile picture error:', error);
      throw error;
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

      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, currentUser.$id, {
        lastLoginDate: today.toISOString(),
        streak: newStreak,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Update last login date error:', error);
    }
  }

  // Send password recovery email
  async sendPasswordRecovery(email: string): Promise<void> {
    try {
      await account.createRecovery(email, 'http://localhost:3000/reset-password');
    } catch (error) {
      console.error('Send password recovery error:', error);
      throw error;
    }
  }

  // Complete password recovery
  async completePasswordRecovery(userId: string, secret: string, password: string): Promise<void> {
    try {
      await account.updateRecovery(userId, secret, password);
    } catch (error) {
      console.error('Complete password recovery error:', error);
      throw error;
    }
  }

  // Create verification for email
  async createEmailVerification(): Promise<void> {
    try {
      await account.createVerification('http://localhost:3000/verify-email');
    } catch (error) {
      console.error('Create email verification error:', error);
      throw error;
    }
  }

  // Confirm email verification
  async confirmEmailVerification(userId: string, secret: string): Promise<void> {
    try {
      await account.updateVerification(userId, secret);
    } catch (error) {
      console.error('Confirm email verification error:', error);
      throw error;
    }
  }

  // OAuth sign-in methods (TODO: Fix OAuth provider types)
  async signInWithGoogle(): Promise<void> {
    try {
      // TODO: Use correct OAuth provider enum when available
      await account.createOAuth2Session('google' as any, 'http://localhost:3000/auth/success', 'http://localhost:3000/auth/failure');
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async signInWithFacebook(): Promise<void> {
    try {
      // TODO: Use correct OAuth provider enum when available  
      await account.createOAuth2Session('facebook' as any, 'http://localhost:3000/auth/success', 'http://localhost:3000/auth/failure');
    } catch (error) {
      console.error('Facebook sign-in error:', error);
      throw error;
    }
  }

  async signInWithTwitter(): Promise<void> {
    try {
      // TODO: Use correct OAuth provider enum when available
      await account.createOAuth2Session('twitter' as any, 'http://localhost:3000/auth/success', 'http://localhost:3000/auth/failure');
    } catch (error) {
      console.error('Twitter sign-in error:', error);
      throw error;
    }
  }
}

export default new AuthService();