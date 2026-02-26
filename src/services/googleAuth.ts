import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { account, databases, DB_ID, COLLECTIONS } from './appwrite';
import { ID, OAuthProvider } from 'react-native-appwrite';
import { User } from '../types';
import Constants from 'expo-constants';
import { URL } from 'react-native-url-polyfill';

WebBrowser.maybeCompleteAuthSession();

class GoogleAuthService {
  /**
   * Get the appropriate redirect URL based on environment
   */
  private getRedirectUrl(path: string): string {
    const isExpoGo = Constants.appOwnership === 'expo';
    
    if (isExpoGo) {
      return makeRedirectUri({
        scheme: undefined,
        path,
      });
    } else {
      return makeRedirectUri({
        scheme: 'moneyquest',
        path,
      });
    }
  }

  /**
   * Sign in with Google using Appwrite OAuth
   */
  async signInWithGoogle(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const successUrl = this.getRedirectUrl('oauth/success');
      const failureUrl = this.getRedirectUrl('oauth/failure');

      // 1. Generate the OAuth Token URL using the SDK
      // This hits the /tokens endpoint (instead of /sessions), ensuring secrets are returned in the URL
      const oauthUrl = await account.createOAuth2Token(
        OAuthProvider.Google,
        successUrl,
        failureUrl
      );

      if (!oauthUrl) {
        throw new Error('Failed to generate OAuth URL');
      }
      // 2. Open the browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl.toString(), // Convert URL object to string
        successUrl
      );

      if (result.type === 'success' && result.url) {
        // 3. Handle the callback immediately
        return await this.handleOAuthCallback(result.url);
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled.');
      } else {
        throw new Error('Google sign-in failed.');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Track callback processing to prevent duplicates
  private processingCallback = false;

  /**
   * Handle OAuth callback - Get session from URL parameters
   */
  async handleOAuthCallback(url: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Prevent duplicate processing
    if (this.processingCallback) {
      return { success: false, error: 'Already processing authentication' };
    }

    this.processingCallback = true;

    try {
      // Parse the URL
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search); // Params are usually in search, not hash, for Token flow

      // Use 'secret' and 'userId' which Appwrite returns in the Token flow
      const secret = params.get('secret');
      const userId = params.get('userId');

      if (!secret || !userId) {
        console.error('Missing secret or userId in callback URL');
        return { success: false, error: 'Authentication failed: Missing credentials.' };
      }
      // 4. Create the session in the App Client
      await account.createSession(userId, secret);
      // 5. Get User and Sync with Database
      const userAccount = await account.get();
      const userDoc = await this.findOrCreateUserDocument(userAccount);
      const user = this.formatUserData(userDoc, userAccount);

      return { success: true, user };

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      return { success: false, error: error.message || 'Failed to complete Google sign-in.' };
    } finally {
      // Reset processing flag after a delay to allow for UI updates
      setTimeout(() => {
        this.processingCallback = false;
      }, 1000);
    }
  }

  // ... (Keep your existing findOrCreateUserDocument method here)
  private async findOrCreateUserDocument(userAccount: any): Promise<any> {
    // ... paste your existing logic here
     try {
      // Try to get existing user document
      try {
        const existingDoc = await databases.getDocument(
          DB_ID,
          COLLECTIONS.USERS,
          userAccount.$id
        );
        return existingDoc;
      } catch (error: any) {
        if (error.code === 404) {
          const currentDate = new Date().toISOString();
          const newUserDoc = await databases.createDocument(
            DB_ID,
            COLLECTIONS.USERS,
            userAccount.$id,
            {
              email: userAccount.email,
              name: userAccount.name,
              username: userAccount.email.split('@')[0],
              avatar: 'needs_onboarding',
              age: 7,
              learningLimit: 'needs_onboarding',
              mainGoal: 'needs_onboarding',
              referralSource: 'google',
              xp: 0,
              level: 1,
              currentSection: 1,
              streak: 0,
              lastLoginDate: currentDate,
              totalQuestionsAnswered: 0,
              correctAnswers: 0,
              monthlyXP: 0,
              totalXP: 0,
              lives: 5,
              lastLifeRegenTime: currentDate,
              currentLevelId: null,
              currentSectionId: null,
            }
          );
          return newUserDoc;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error with user document:', error);
      throw new Error('Failed to setup user profile.');
    }
  }

  // ... (Keep your existing formatUserData method here)
   private formatUserData(userDoc: any, userAccount: any): User {
    return {
      $id: userDoc.$id,
      email: userDoc.email || userAccount.email,
      name: userDoc.name || userAccount.name,
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
      $createdAt: userDoc.$createdAt || userAccount.$createdAt,
      $updatedAt: userDoc.$updatedAt || userAccount.$updatedAt,
    };
  }
}

export default new GoogleAuthService();