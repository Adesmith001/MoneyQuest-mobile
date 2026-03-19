import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types';
import AuthService from '../../services/auth';
import googleAuthService from '../../services/googleAuth';
import { updateStreakOnLogin, resetStreakState } from './streakSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import revenueCatService from '../../services/revenueCatService';
import analyticsService from '../../services/analytics';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  showWelcomeScreen: false,
};

// Async thunks
export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue, dispatch }) => {
    try {
      await AuthService.signIn(email, password);
      const currentUser = await AuthService.getCurrentUser();
      const userDocument = await AuthService.getUserDocument(currentUser.$id);
      analyticsService.identifyUser(currentUser.$id);
      await analyticsService.trackEvent('login_succeeded', {
        auth_provider: 'email',
        has_onboarding: Boolean(userDocument?.avatar && userDocument?.learningLimit && userDocument?.mainGoal),
        ...analyticsService.buildUserProperties(userDocument),
      });
      
      // Update streak on login (silently fail if there are permission issues)
      if (userDocument?.$id) {
        try {
          dispatch(updateStreakOnLogin(userDocument.$id));
        } catch (error) {
          // Silently fail - streak is not critical for login
        }
      }
      // Identify user with RevenueCat (non-blocking)
      revenueCatService.identifyUser(currentUser.$id).catch(() => {});
      return { currentUser, userDocument };
    } catch (error: any) {
      await analyticsService.trackEvent('login_failed', {
        auth_provider: 'email',
        reason: error?.message || 'unknown',
      });
      return rejectWithValue(error.message);
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, name, phoneNumber, username }: { 
    email: string; 
    password: string; 
    name: string; 
    phoneNumber?: string;
    username?: string;
  }, { rejectWithValue }) => {
    try {
      await analyticsService.trackEvent('sign_up_started', {
        auth_provider: 'email',
        source: 'basic_sign_up',
        has_phone_number: Boolean(phoneNumber),
        has_username: Boolean(username),
      });
      // Step 1: Create the account
      await AuthService.createAccount(email, password, name, phoneNumber, username);
      
      // Step 2: Immediately sign in the user after account creation
      await AuthService.signIn(email, password);
      
      // Step 3: Get the current user (session is now established)
      const currentUser = await AuthService.getCurrentUser();
      const userDocument = await AuthService.getUserDocument(currentUser.$id);
      analyticsService.identifyUser(currentUser.$id);
      await analyticsService.trackEvent('sign_up_completed', {
        auth_provider: 'email',
        source: 'basic_sign_up',
        ...analyticsService.buildUserProperties(userDocument),
      });
      // Identify the new user with RevenueCat (non-blocking)
      revenueCatService.identifyUser(currentUser.$id).catch(() => {});
      return { currentUser, userDocument };
    } catch (error: any) {
      await analyticsService.trackEvent('sign_up_failed', {
        auth_provider: 'email',
        source: 'basic_sign_up',
        reason: error?.message || 'unknown',
      });
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await analyticsService.endSession('logout');
      analyticsService.identifyUser(null);
      await AuthService.signOut();
      // Reset streak state on sign out
      dispatch(resetStreakState());
      // Unlink RevenueCat user (non-blocking)
      revenueCatService.logOut().catch(() => {});
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const reactivateAccount = createAsyncThunk(
  'auth/reactivateAccount',
  async ({ userId }: { userId: string }, { rejectWithValue, dispatch }) => {
    try {
      await AuthService.reactivateAccount(userId);
      const currentUser = await AuthService.getCurrentUser();
      const userDocument = await AuthService.getUserDocument(currentUser.$id);
      if (userDocument?.$id) {
        try { dispatch(updateStreakOnLogin(userDocument.$id)); } catch {}
      }
      return { currentUser, userDocument };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signInWithGoogle = createAsyncThunk(
  "auth/signInWithGoogle",
  async (_, { rejectWithValue }) => {
    try {
      // This will open the browser and return user data
      const result = await googleAuthService.signInWithGoogle();
      
      // Return a pending state - actual login will complete via deep link
      return { pending: true };
    } catch (error: any) {
      return rejectWithValue(error.message || "Google sign-in failed");
    }
  }
);

// New thunk to handle OAuth callback
export const handleOAuthCallback = createAsyncThunk(
  "auth/handleOAuthCallback",
  async (url: string, { rejectWithValue }) => {
    try {
      const result = await googleAuthService.handleOAuthCallback(url);
      
      if (result.success && result.user) {
        await AsyncStorage.setItem("userId", result.user.$id);
        analyticsService.identifyUser(result.user.$id);
        await analyticsService.trackEvent('oauth_login_succeeded', {
          auth_provider: 'google',
          ...analyticsService.buildUserProperties(result.user),
        });
        // Link the Appwrite user ID to RevenueCat so store purchases are accessible
        revenueCatService.identifyUser(result.user.$id).catch(() => {});
        return result.user;
      } else {
        await analyticsService.trackEvent('oauth_login_failed', {
          auth_provider: 'google',
          reason: result.error || 'OAuth callback failed',
        });
        return rejectWithValue(result.error || "OAuth callback failed");
      }
    } catch (error: any) {
      await analyticsService.trackEvent('oauth_login_failed', {
        auth_provider: 'google',
        reason: error?.message || 'OAuth callback failed',
      });
      return rejectWithValue(error.message || "OAuth callback failed");
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        const userDocument = await AuthService.getUserDocument(currentUser.$id);
        
        // Update streak on app startup if user is already logged in (silently fail if there are permission issues)
        if (userDocument?.$id) {
          try {
            dispatch(updateStreakOnLogin(userDocument.$id));
          } catch (error) {
            // Silently fail - streak is not critical
          }
        }
        // Re-identify with RevenueCat on app startup (non-blocking)
        revenueCatService.identifyUser(currentUser.$id).catch(() => {});
        return { currentUser, userDocument };
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        const userDocument = await AuthService.getUserDocument(currentUser.$id);

        // Block disabled accounts on session restore
        if (userDocument?.accountStatus === 'disabled') {
          await AuthService.signOut();
          return null;
        }

        // Update streak on app startup if user is already authenticated (silently fail if there are permission issues)
        if (userDocument?.$id) {
          try {
            dispatch(updateStreakOnLogin(userDocument.$id));
          } catch (error) {
            // Silently fail - streak is not critical
          }
        }
        // Re-identify with RevenueCat on session restore (non-blocking)
        revenueCatService.identifyUser(currentUser.$id).catch(() => {});
        return { currentUser, userDocument };
      }
      return null;
    } catch (error: any) {
      // Don't reject for auth check - just return null
      return null;
    }
  }
);

export const refreshUserData = createAsyncThunk(
  'auth/refreshUserData',
  async (userId: string, { rejectWithValue }) => {
    try {
      const userDocument = await AuthService.getUserDocument(userId);
      return userDocument;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProfilePicture = createAsyncThunk(
  'auth/updateProfilePicture',
  async ({ userId, imageUri }: { userId: string; imageUri: string }, { rejectWithValue }) => {
    try {
      await AuthService.updateProfilePicture(userId, imageUri);
      const userDocument = await AuthService.getUserDocument(userId);
      return userDocument;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserOnboarding = createAsyncThunk(
  'auth/updateUserOnboarding',
  async ({ 
    userId, 
    age, 
    learningLimit, 
    mainGoal, 
    referralSource, 
    avatar 
  }: { 
    userId: string; 
    age: number;
    learningLimit: string;
    mainGoal: string;
    referralSource: string;
    avatar: string;
  }, { rejectWithValue }) => {
    try {
      await AuthService.updateUserOnboarding(userId, {
        age,
        learningLimit,
        mainGoal,
        referralSource,
        avatar
      });
      const userDocument = await AuthService.getUserDocument(userId);
      return userDocument;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signUpWithOnboarding = createAsyncThunk(
  'auth/signUpWithOnboarding',
  async ({ 
    registrationData, 
    onboardingData 
  }: { 
    registrationData: {
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      phoneNumber: string;
      password: string;
    };
    onboardingData: {
      age: number;
      learningLimit: string;
      mainGoal: string;
      referralSource: string;
      avatar: string;
    };
  }, { rejectWithValue }) => {
    try {
      const fullName = `${registrationData.firstName} ${registrationData.lastName}`;
      await analyticsService.trackEvent('sign_up_started', {
        auth_provider: 'email',
        source: 'onboarding_registration',
        has_phone_number: Boolean(registrationData.phoneNumber),
        has_username: Boolean(registrationData.username),
      });
      
      // Create account with all data including onboarding
      const result = await AuthService.createAccountWithOnboarding({
        email: registrationData.email,
        password: registrationData.password,
        name: fullName,
        username: registrationData.username,
        phoneNumber: registrationData.phoneNumber,
        ...onboardingData
      });
      analyticsService.identifyUser(result.userDocument?.$id || null);
      const analyticsProperties = analyticsService.buildUserProperties({
        $id: result.userDocument?.$id,
        age: onboardingData.age,
        referralSource: onboardingData.referralSource,
        learningLimit: onboardingData.learningLimit,
        avatar: onboardingData.avatar,
      });
      await analyticsService.trackEvent('sign_up_completed', {
        auth_provider: 'email',
        source: 'onboarding_registration',
        ...analyticsProperties,
      });
      await analyticsService.trackEvent('onboarding_completed', {
        source: 'email_sign_up',
        ...analyticsProperties,
        main_goal_count: onboardingData.mainGoal
          ? onboardingData.mainGoal.split(',').filter(Boolean).length
          : 0,
      });
      
      return result;
    } catch (error: any) {
      await analyticsService.trackEvent('sign_up_failed', {
        auth_provider: 'email',
        source: 'onboarding_registration',
        reason: error?.message || 'unknown',
      });
      return rejectWithValue(error.message);
    }
  }
);

// Update OAuth user with onboarding data
export const completeOAuthOnboarding = createAsyncThunk(
  'auth/completeOAuthOnboarding',
  async ({ 
    userId,
    onboardingData 
  }: { 
    userId: string;
    onboardingData: {
      age: number;
      learningLimit: string;
      mainGoal: string;
      referralSource: string;
      avatar: string;
    };
  }, { rejectWithValue }) => {
    try {
      // Update existing user document with onboarding data
      await AuthService.updateUserOnboarding(userId, onboardingData);
      const updatedUser = await AuthService.getUserDocument(userId);
      analyticsService.identifyUser(userId);
      await analyticsService.trackEvent('onboarding_completed', {
        source: 'oauth',
        ...analyticsService.buildUserProperties(updatedUser || {
          $id: userId,
          age: onboardingData.age,
          referralSource: onboardingData.referralSource,
          learningLimit: onboardingData.learningLimit,
          avatar: onboardingData.avatar,
        }),
        main_goal_count: onboardingData.mainGoal
          ? onboardingData.mainGoal.split(',').filter(Boolean).length
          : 0,
      });
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.isLoading = false;
      state.showWelcomeScreen = false;
    },
    completeWelcomeScreen: (state) => {
      state.showWelcomeScreen = false;
      state.isAuthenticated = true; // Now authenticate the user
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign In
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.userDocument;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.userDocument;
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Sign Out
      .addCase(signOut.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      // Google Sign In
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        // Keep loading state until OAuth callback completes
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Handle OAuth callback
      .addCase(handleOAuthCallback.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(handleOAuthCallback.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(handleOAuthCallback.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Get Current User
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.userDocument;
        } else {
          state.isAuthenticated = false;
          state.user = null;
        }
        state.isLoading = false;
      })
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.userDocument;
        } else {
          state.isAuthenticated = false;
          state.user = null;
        }
        state.isLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.isLoading = false;
      })
      // Update Profile Picture
      .addCase(updateProfilePicture.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user = action.payload;
        }
      })
      // Update User Onboarding
      .addCase(updateUserOnboarding.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user = action.payload;
        }
      })
      // Sign Up With Onboarding
      .addCase(signUpWithOnboarding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpWithOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false; // Don't authenticate yet, show welcome screen first
        state.user = action.payload.userDocument;
        state.error = null;
        state.showWelcomeScreen = true; // Flag to show welcome screen
      })
      .addCase(signUpWithOnboarding.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Complete OAuth Onboarding
      .addCase(completeOAuthOnboarding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeOAuthOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
        state.showWelcomeScreen = true; // Show welcome screen after completing onboarding
      })
      .addCase(completeOAuthOnboarding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Refresh User Data
      .addCase(refreshUserData.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user = action.payload;
        }
      })
      // Reactivate Account
      .addCase(reactivateAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reactivateAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.userDocument;
        state.error = null;
      })
      .addCase(reactivateAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateUser, logout, completeWelcomeScreen } = authSlice.actions;
export default authSlice.reducer;
