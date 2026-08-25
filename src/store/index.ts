import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform, PersistConfig } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import gameReducer from './slices/gameSlice';
import leaderboardReducer from './slices/leaderboardSlice';
import streakReducer from './slices/streakSlice';
import learningReducer from './slices/learningSlice';
import tutorialReducer, { normalizeTutorialState, TutorialState } from './slices/tutorialSlice';
import gamificationReducer from './slices/gamificationSlice';
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
  tutorial: tutorialReducer(undefined, { type: '@@moneyquest/INIT_USER_SCOPED_STATE' }),
  gamification: gamificationReducer(undefined, { type: '@@moneyquest/INIT_USER_SCOPED_STATE' }),
});

const rootReducer = (
  state: RootReducerState | undefined,
  action: Parameters<typeof appReducer>[1]
): RootReducerState => {
  const previousUserId = state?.auth?.user?.$id ?? null;
  const reducedState = appReducer(state, action);

  if (action.type === 'auth/signOut/fulfilled') {
    return {
      ...reducedState,
      ...getInitialUserScopedState(),
    };
  }

  const nextUserId = getAuthenticatedActionUserId(action);
  if (shouldResetUserScopedState(previousUserId, nextUserId)) {
    return {
      ...reducedState,
      ...getInitialUserScopedState(),
    };
  }

  return reducedState;
};

const authStateTransform = createTransform<AuthState, AuthState, RootReducerState>(
  (inboundState) => ({
    ...inboundState,
    isLoading: false,
    isLoggingOut: false,
    error: null,
  }),
  (outboundState) => ({
    ...outboundState,
    isLoading: false,
    isLoggingOut: false,
    error: null,
  }),
  { whitelist: ['auth'] }
);

const tutorialStateTransform = createTransform<TutorialState, TutorialState, RootReducerState>(
  (inboundState) => normalizeTutorialState(inboundState),
  (outboundState) => normalizeTutorialState(outboundState),
  { whitelist: ['tutorial'] }
);

const persistConfig: PersistConfig<RootReducerState> = {
  key: 'root',
  storage: AsyncStorage,
  transforms: [authStateTransform, tutorialStateTransform],
  whitelist: ['auth', 'game', 'streak', 'learning', 'tutorial', 'gamification'], // Persist auth, game, streak, learning, tutorial, and gamification state
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

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
