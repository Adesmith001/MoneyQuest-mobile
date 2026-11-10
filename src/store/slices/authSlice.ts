import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types';
import AuthService from '../../services/auth';
import googleAuthService from '../../services/googleAuth';
import { updateStreakOnLogin, resetStreakState } from './streakSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import revenueCatService from '../../services/revenueCatService';
import analyticsService from '../../services/analytics';
import schoolEntitlementService from '../../services/schoolEntitlementService';
import { shouldApplyAuthCheck } from '../../utils/authCheckPolicy';
import { getSupportCode } from '../../utils/supportCode';
import { createLoginTrace } from '../../services/loginDiagnostics';
import { captureIncident, recordBreadcrumb } from '../../services/errorMonitor';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isCheckingSession: true,
  isLoggingOut: false,
  error: null,
  showWelcomeScreen: false,
  activeCheckRequestId: null,
  sessionCheckError: null,
};

// Async thunks
export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue, dispatch }) => {
    const startedAt = Date.now();
    const trace = createLoginTrace(email, Boolean(password));
    recordBreadcrumb('login_submitted');
    try {
      const { currentUser, userDocument } = await AuthService.signIn(
        email, password, trace.step,
      );
      if (!currentUser?.$id) {
        throw new Error('Your account exists, but your profile could not be loaded. Please try again.');
      }
      if (!userDocument) throw new Error('Your profile could not be loaded. Please retry.');
      trace.finish('succeeded');
      analyticsService.identifyUser(currentUser.$id);
      void analyticsService.trackEvent('login_succeeded', {
        auth_provider: 'email',
        has_onboarding: Boolean(userDocument?.avatar && userDocument?.learningLimit && userDocument?.mainGoal),
        ...analyticsService.buildUserProperties(userDocument),
      }).catch(() => {});
      
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
      void captureIncident(error, {
        flow: 'login', stage: String(error?.authStage || 'session_request'),
        action: 'login_failed', severity: error?.type === 'user_invalid_credentials' ? 'warning' : 'error',
        statusCode: Number.isInteger(Number(error?.code)) ? Number(error.code) : undefined,
        errorType: String(error?.type || 'sign_in_failed'),
      });
      trace.finish('failed', error);
      void analyticsService.trackEvent('login_failed', {
        auth_provider: 'email',
        reason: String(error?.code || error?.type || 'unknown'),
        error_type: String(error?.type || ''),
        auth_stage: String(error?.authStage || 'unknown'),
        support_code: getSupportCode(),
        attempt_id: trace.attemptId,
        status_code: Number(error?.code) || 0,
        duration_ms: Date.now() - startedAt,
      }).catch(() => {});
      return rejectWithValue(Number(error?.code) === 429
        ? 'Too many login attempts. Wait a few minutes before trying again.'
        : error?.code === 'timeout'
          ? 'Sign-in timed out. Check your connection and try again.'
            : error?.type === 'user_session_already_exists'
              ? 'This browser already has an active account. Sign out before signing in with another account.'
              : error?.type === 'user_invalid_credentials'
                ? 'Email or password is incorrect.'
            : error?.message || 'Sign-in failed. Please try again.');
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
    recordBreadcrumb('signup_submitted');
    try {
      void analyticsService.trackEvent('sign_up_started', {
        auth_provider: 'email',
        source: 'basic_sign_up',
        has_phone_number: Boolean(phoneNumber),
        has_username: Boolean(username),
      }).catch(() => {});
      // Step 1: Create the account
      await AuthService.createAccount(email, password, name, phoneNumber, username);
      recordBreadcrumb('login_submitted');
      
      // Step 2: Immediately sign in the user after account creation
      const { currentUser, userDocument } = await AuthService.signIn(email, password);

      if (!currentUser?.$id) {
        throw new Error('Your account was created, but your profile could not be loaded. Please try signing in again.');
      }
      if (!userDocument) throw new Error('Your profile could not be loaded. Please retry.');
      analyticsService.identifyUser(currentUser.$id);
      void analyticsService.trackEvent('sign_up_completed', {
        auth_provider: 'email',
        source: 'basic_sign_up',
        ...analyticsService.buildUserProperties(userDocument),
      }).catch(() => {});
      // Identify the new user with RevenueCat (non-blocking)
      revenueCatService.identifyUser(currentUser.$id).catch(() => {});
      return { currentUser, userDocument };
    } catch (error: any) {
      void captureIncident(error, { flow: 'signup', stage: 'account_or_session',
        action: 'signup_failed', severity: 'error', errorType: String(error?.type || 'signup_failed') });
      void analyticsService.trackEvent('sign_up_failed', {
        auth_provider: 'email',
        source: 'basic_sign_up',
        reason: String(error?.code || error?.type || 'unknown'),
      }).catch(() => {});
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue, dispatch }) => {
    recordBreadcrumb('signout_started');
    try {
      // Do not expose the login screen until Appwrite has ended this session.
      await AuthService.signOut();
      analyticsService.identifyUser(null);
      void analyticsService.endSession('logout').catch(() => {});
      void AsyncStorage.removeItem('userId').catch(() => {});
      // Reset streak state on sign out
      dispatch(resetStreakState());
      // Unlink RevenueCat user (non-blocking)
      revenueCatService.logOut().catch(() => {});
      dispatch(logout());
    } catch (error: any) {
      void captureIncident(error, { flow: 'account', stage: 'signout', action: 'signout_failed', severity: 'error' });
      return rejectWithValue(error?.message || 'Could not sign out. Check your connection and try again.');
    }
  }
);

export const reactivateAccount = createAsyncThunk(
  'auth/reactivateAccount',
  async ({ userId }: { userId: string }, { rejectWithValue, dispatch }) => {
    try {
      await AuthService.reactivateAccount(userId);
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser?.$id) {
        throw new Error('Your session expired. Please sign in again.');
      }
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
    recordBreadcrumb('oauth_started');
    try {
      // This will open the browser and return user data
      const result = await googleAuthService.signInWithGoogle();
      
      if (!result.success || !result.user) throw new Error(result.error || 'Google sign-in failed');
      return result.user;
    } catch (error: any) {
      void captureIncident(error, { flow: 'login', stage: 'google_oauth',
        action: 'login_failed', severity: 'error' });
      return rejectWithValue(error.message || "Google sign-in failed");
    }
  }
);

// New thunk to handle OAuth callback
export const handleOAuthCallback = createAsyncThunk(
  "auth/handleOAuthCallback",
  async (url: string, { rejectWithValue }) => {
    recordBreadcrumb('oauth_callback');
    try {
      const result = await googleAuthService.handleOAuthCallback(url);
      
      if (result.success && result.user) {
        await AsyncStorage.setItem("userId", result.user.$id);
        analyticsService.identifyUser(result.user.$id);
        void analyticsService.trackEvent('oauth_login_succeeded', {
          auth_provider: 'google',
          ...analyticsService.buildUserProperties(result.user),
        }).catch(() => {});
        // Link the Appwrite user ID to RevenueCat so store purchases are accessible
        revenueCatService.identifyUser(result.user.$id).catch(() => {});
        return result.user;
      } else {
        void captureIncident(new Error(result.error || 'OAuth callback failed'), {
          flow: 'login', stage: 'oauth_callback', action: 'login_failed', severity: 'error',
        });
        void analyticsService.trackEvent('oauth_login_failed', {
          auth_provider: 'google',
          reason: 'oauth_callback_failed',
        }).catch(() => {});
        return rejectWithValue(result.error || "OAuth callback failed");
      }
    } catch (error: any) {
      void captureIncident(error, { flow: 'login', stage: 'oauth_callback',
        action: 'login_failed', severity: 'error' });
      void analyticsService.trackEvent('oauth_login_failed', {
        auth_provider: 'google',
        reason: String(error?.code || error?.type || 'oauth_callback_failed'),
      }).catch(() => {});
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
        void schoolEntitlementService.claimByEmail().catch(() => {});
        
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
    recordBreadcrumb('session_restore_started');
    try {
      // Never hang on a slow network: the app always renders after this
      // resolves, so cap the session check with a hard timeout.
      const verified = await Promise.race([
        (async () => {
          const currentUser = await AuthService.getCurrentUser(true);
          if (!currentUser) return null;
          const userDocument = await AuthService.getUserDocument(currentUser.$id);
          if (!userDocument) throw new Error('Profile unavailable');
          return { currentUser, userDocument };
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out. Please retry.')), 10000)
        ),
      ]);

      if (verified) {
        const { currentUser, userDocument } = verified;
        void schoolEntitlementService.claimByEmail().catch(() => {});

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
      void captureIncident(error, { flow: 'startup', stage: 'session_check',
        action: 'session_restore_failed', severity: 'error' });
      void analyticsService.trackEvent('app_error', {
        stage: 'session_check',
        support_code: getSupportCode(),
        error_code: String(error?.code ?? error?.status ?? 'network'),
      }).catch(() => {});
      return rejectWithValue('Could not verify your session. Check your connection and retry.');
    }
  }
);

export const refreshUserData = createAsyncThunk(
  'auth/refreshUserData',
  async (userId: string, { rejectWithValue }) => {
    try {
      const userDocument = await AuthService.getUserDocument(userId);
      if (!userDocument) throw new Error('Profile could not be loaded. Please retry.');
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
      if (!userDocument) throw new Error('Profile could not be loaded. Please retry.');
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
      schoolName?: string;
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
    recordBreadcrumb('signup_submitted');
    try {
      const signupStartedAt = Date.now();
      const fullName = `${registrationData.firstName} ${registrationData.lastName}`;
      void analyticsService.trackEvent('sign_up_started', {
        auth_provider: 'email',
        source: 'onboarding_registration',
        has_phone_number: Boolean(registrationData.phoneNumber),
        has_username: Boolean(registrationData.username),
      }).catch(() => {});
      
      // Create account with all data including onboarding
      const result = await AuthService.createAccountWithOnboarding({
        email: registrationData.email,
        password: registrationData.password,
        name: fullName,
        username: registrationData.username,
        schoolName: registrationData.schoolName,
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
      void analyticsService.trackEvent('sign_up_completed', {
        auth_provider: 'email',
        source: 'onboarding_registration',
        duration_ms: Date.now() - signupStartedAt,
        ...analyticsProperties,
      }).catch(() => {});
      void analyticsService.trackEvent('onboarding_completed', {
        source: 'email_sign_up',
        ...analyticsProperties,
        main_goal_count: onboardingData.mainGoal
          ? onboardingData.mainGoal.split(',').filter(Boolean).length
          : 0,
      }).catch(() => {});
      recordBreadcrumb('onboarding_step_completed');
      
      return result;
    } catch (error: any) {
      void captureIncident(error, { flow: 'signup', stage: 'onboarding_registration',
        action: 'signup_failed', severity: 'error', errorType: String(error?.type || 'signup_failed') });
      void analyticsService.trackEvent('sign_up_failed', {
        auth_provider: 'email',
        source: 'onboarding_registration',
        reason: String(error?.code || error?.type || 'unknown'),
      }).catch(() => {});
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
      await schoolEntitlementService.claimByEmail();
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
      void captureIncident(error, { flow: 'onboarding', stage: 'complete_oauth_onboarding',
        action: 'signup_failed', severity: 'error' });
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
      state.isCheckingSession = false;
      state.isLoggingOut = false;
      state.showWelcomeScreen = false;
      state.activeCheckRequestId = null;
      state.sessionCheckError = null;
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
        state.isCheckingSession = false;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
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
        state.isCheckingSession = false;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
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
      .addCase(signOut.pending, (state) => {
        state.isCheckingSession = false;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
        state.isLoggingOut = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.isLoggingOut = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoggingOut = false;
        state.error = action.payload as string;
      })
      // Google Sign In
      .addCase(signInWithGoogle.pending, (state) => {
        state.isCheckingSession = false;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Handle OAuth callback
      .addCase(handleOAuthCallback.pending, (state) => {
        state.isCheckingSession = false;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
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
      .addCase(checkAuthStatus.pending, (state, action) => {
        state.activeCheckRequestId = action.meta.requestId;
        state.sessionCheckError = null;
        state.isCheckingSession = true;
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        if (!shouldApplyAuthCheck(action.meta.requestId, state.activeCheckRequestId)) return;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
        state.isCheckingSession = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.userDocument;
        } else {
          state.isAuthenticated = false;
          state.user = null;
        }
        state.isLoading = false;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        if (!shouldApplyAuthCheck(action.meta.requestId, state.activeCheckRequestId)) return;
        state.activeCheckRequestId = null;
        state.sessionCheckError = String(action.payload || 'Could not verify your session.');
        state.isCheckingSession = false;
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
        state.isCheckingSession = false;
        state.activeCheckRequestId = null;
        state.sessionCheckError = null;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpWithOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
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
