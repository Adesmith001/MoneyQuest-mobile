import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform, PersistConfig } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import gameReducer from './slices/gameSlice';
import leaderboardReducer from './slices/leaderboardSlice';
import streakReducer from './slices/streakSlice';
import learningReducer from './slices/learningSlice';
import tutorialReducer, { normalizeTutorialState } from './slices/tutorialSlice';
import gamificationReducer from './slices/gamificationSlice';
import { watchTutorialProgress } from './tutorialPersistence';
import { AuthState } from '../types';
import {
  getAuthenticatedActionUserId,
  shouldResetUserScopedState,
} from '../utils/userScopedPersistence';

const appReducer = combineReducers({
  auth: authReducer,
  game: gameReducer,
  leaderboard: leaderboardReducer,
  streak: streakReducer,
  learning: learningReducer,
  tutorial: tutorialReducer,
  gamification: gamificationReducer,
});

type RootReducerState = ReturnType<typeof appReducer>;

const getInitialUserScopedState = () => ({
  game: gameReducer(undefined, { type: '@@moneyquest/INIT_USER_SCOPED_STATE' }),
  streak: streakReducer(undefined, { type: '@@moneyquest/INIT_USER_SCOPED_STATE' }),
  gamification: gamificationReducer(undefined, { type: '@@moneyquest/INIT_USER_SCOPED_STATE' }),
});

const rootReducer = (
  state: RootReducerState | undefined,
  action: Parameters<typeof appReducer>[1]
): RootReducerState => {
  const previousUserId = state?.auth?.user?.$id ?? null;
  const reducedState = appReducer(state, action);
  const nextState = previousUserId === (reducedState.auth.user?.$id ?? null)
    ? reducedState
    : { ...reducedState, tutorial: normalizeTutorialState(undefined) };

  if (action.type === 'auth/signOut/fulfilled' || action.type === 'auth/logout') {
    return {
      ...nextState,
      ...getInitialUserScopedState(),
    };
  }

  const nextUserId = getAuthenticatedActionUserId(action);
  if (shouldResetUserScopedState(previousUserId, nextUserId)) {
    return {
      ...nextState,
      ...getInitialUserScopedState(),
    };
  }

  return nextState;
};

const authStateTransform = createTransform<AuthState, AuthState, RootReducerState>(
  (inboundState) => ({
    ...inboundState,
    // Always start in the loading state after rehydration. On shared school
    // devices the persisted `isAuthenticated`/`user` belong to the previous
    // student; the navigator must wait for checkAuthStatus to resolve before
    // rendering anything, otherwise the previous student's dashboard flashes.
    isLoading: true,
    isCheckingSession: true,
    isLoggingOut: false,
    error: null,
    activeCheckRequestId: null,
    sessionCheckError: null,
  }),
  (outboundState) => ({
    ...outboundState,
    isLoading: true,
    isCheckingSession: true,
    isLoggingOut: false,
    error: null,
    activeCheckRequestId: null,
    sessionCheckError: null,
  }),
  { whitelist: ['auth'] }
);

const persistConfig: PersistConfig<RootReducerState> = {
  key: 'root',
  storage: AsyncStorage,
  transforms: [authStateTransform],
  whitelist: ['auth', 'game', 'streak', 'learning', 'gamification'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'auth/signInWithGoogle/fulfilled', 
          'auth/signInWithGoogle/pending',
          'auth/signInWithGoogle/rejected',
        ],
        ignoredPaths: ['auth.oauthUrl'], 
      },
    }),
});

watchTutorialProgress(store, AsyncStorage);
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
