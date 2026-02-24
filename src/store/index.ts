import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import gameReducer from './slices/gameSlice';
import leaderboardReducer from './slices/leaderboardSlice';
import streakReducer from './slices/streakSlice';
import learningReducer from './slices/learningSlice';
import tutorialReducer from './slices/tutorialSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'game', 'streak', 'learning', 'tutorial'], // Persist auth, game, streak, learning, and tutorial state
};

const rootReducer = combineReducers({
  auth: authReducer,
  game: gameReducer,
  leaderboard: leaderboardReducer,
  streak: streakReducer,
  learning: learningReducer,
  tutorial: tutorialReducer,
});

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