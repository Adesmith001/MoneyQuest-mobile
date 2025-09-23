import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types';
import AuthService from '../../services/auth';
import { updateStreakOnLogin, resetStreakState } from './streakSlice';

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
      
      // Update streak on login
      if (userDocument?.$id) {
        dispatch(updateStreakOnLogin(userDocument.$id));
      }
      
      return { currentUser, userDocument };
    } catch (error: any) {
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
      // Step 1: Create the account
      await AuthService.createAccount(email, password, name, phoneNumber, username);
      
      // Step 2: Immediately sign in the user after account creation
      await AuthService.signIn(email, password);
      
      // Step 3: Get the current user (session is now established)
      const currentUser = await AuthService.getCurrentUser();
      const userDocument = await AuthService.getUserDocument(currentUser.$id);
      return { currentUser, userDocument };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      await AuthService.signOut();
      // Reset streak state on sign out
      dispatch(resetStreakState());
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const result = await AuthService.signInWithGoogle();
      
      // Update streak on login
      if (result.userDocument?.$id) {
        dispatch(updateStreakOnLogin(result.userDocument.$id));
      }
      
      // Make sure we return serializable data
      return {
        currentUser: result.currentUser,
        userDocument: result.userDocument
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
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
        
        // Update streak on app startup if user is already logged in
        if (userDocument?.$id) {
          dispatch(updateStreakOnLogin(userDocument.$id));
        }
        
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
        
        // Update streak on app startup if user is already authenticated
        if (userDocument?.$id) {
          dispatch(updateStreakOnLogin(userDocument.$id));
        }
        
        return { currentUser, userDocument };
      }
      return null;
    } catch (error: any) {
      // Don't reject for auth check - just return null
      return null;
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
      
      // Create account with all data including onboarding
      const result = await AuthService.createAccountWithOnboarding({
        email: registrationData.email,
        password: registrationData.password,
        name: fullName,
        username: registrationData.username,
        phoneNumber: registrationData.phoneNumber,
        ...onboardingData
      });
      
      return result;
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
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.userDocument;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
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
      });
  },
});

export const { clearError, updateUser, logout, completeWelcomeScreen } = authSlice.actions;
export default authSlice.reducer;