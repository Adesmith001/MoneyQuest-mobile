# State Management

This document explains Redux state management in MoneyQuest using Redux Toolkit.

## Redux Architecture

MoneyQuest uses **Redux Toolkit** for centralized state management with **Redux Persist** for data persistence.

```
Redux Store
├── auth (Authentication & User)
├── game (Quiz Progress)
├── leaderboard (Rankings)
└── streak (Daily Streaks)
```

## Store Configuration

**Location**: `src/store/index.ts`

### Setup

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'game', 'streak'], // Persisted slices
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Persistence

**Persisted Slices**: `auth`, `game`, `streak`
**Storage**: AsyncStorage (React Native)
**Rehydration**: Automatic on app launch

## State Slices

### 1. Auth Slice

**Location**: `src/store/slices/authSlice.ts`

Manages authentication and user profile data.

#### State Structure

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  showWelcomeScreen: boolean;
  oauthUrl?: string;
}
```

#### Actions

**Async Thunks**:

```typescript
// Sign In
dispatch(signIn({ email, password }));

// Sign Up
dispatch(signUp({ email, password, name, phoneNumber }));

// Sign Up with Onboarding
dispatch(signUpWithOnboarding({
  email, password, name, username, phoneNumber,
  age, learningLimit, mainGoal, referralSource, avatar
}));

// Sign Out
dispatch(signOut());

// Get Current User
dispatch(getCurrentUser());

// Update Profile
dispatch(updateProfile({ name, email, phoneNumber }));

// Update Avatar
dispatch(updateUserAvatar({ avatar }));

// OAuth Sign In
dispatch(signInWithGoogle());
```

**Sync Actions**:

```typescript
// Clear Error
dispatch(clearError());

// Hide Welcome Screen
dispatch(hideWelcomeScreen());

// Update User Data
dispatch(updateUserData({ xp, level, lives }));
```

#### Usage Example

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { signIn } from '../store/slices/authSlice';

const LoginScreen = () => {
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const handleLogin = async () => {
    try {
      await dispatch(signIn({ email, password })).unwrap();
      // Navigate on success
    } catch (err) {
      // Handle error (already in state.auth.error)
    }
  };
};
```

#### Selector Patterns

```typescript
// Basic selectors
const user = useSelector((state: RootState) => state.auth.user);
const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

// Derived data
const userName = useSelector((state: RootState) => 
  state.auth.user?.name?.split(' ')[0] || 'User'
);

const userLevel = useSelector((state: RootState) => 
  state.auth.user?.level || 1
);
```

### 2. Game Slice

**Location**: `src/store/slices/gameSlice.ts`

Manages quiz progress and game state.

#### State Structure

```typescript
interface GameState {
  currentLevel: number;
  currentSection: number;
  currentQuestion: number;
  progress: number;
  xp: number;
  streak: number;
  isQuestionActive: boolean;
  questionProgress: number;
  health: number;
  lives: number;
  lastLifeRegenTime: string;
}
```

#### Actions

```typescript
// Start Level
dispatch(startLevel({ level, section }));

// Next Question
dispatch(nextQuestion());

// Answer Question
dispatch(answerQuestion({ 
  isCorrect, 
  xpEarned, 
  questionIndex 
}));

// Complete Level
dispatch(completeLevel({ 
  xpGained, 
  accuracy 
}));

// Reset Game State
dispatch(resetGame());

// Update Lives
dispatch(updateLives({ lives, lastLifeRegenTime }));

// Deduct Life
dispatch(deductLife());

// Regenerate Lives
dispatch(regenerateLives());
```

#### Usage Example

```typescript
const QuestionScreen = () => {
  const dispatch = useDispatch();
  const { currentQuestion, lives, xp } = useSelector(
    (state: RootState) => state.game
  );

  const handleAnswer = (isCorrect: boolean) => {
    const xpEarned = isCorrect ? 10 : 0;
    
    dispatch(answerQuestion({
      isCorrect,
      xpEarned,
      questionIndex: currentQuestion,
    }));

    if (!isCorrect) {
      dispatch(deductLife());
    }
  };
};
```

### 3. Leaderboard Slice

**Location**: `src/store/slices/leaderboardSlice.ts`

Manages leaderboard data and rankings.

#### State Structure

```typescript
interface LeaderboardState {
  entries: LeaderboardEntry[];
  userRank: number | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface LeaderboardEntry {
  $id: string;
  userId: string;
  userName: string;
  profilePicture?: string;
  monthlyXP: number;
  rank: number;
  month: string;
  year: number;
}
```

#### Actions

```typescript
// Fetch Leaderboard
dispatch(fetchLeaderboard({ month, year, limit }));

// Update User Rank
dispatch(updateUserRank({ rank }));

// Clear Leaderboard
dispatch(clearLeaderboard());
```

#### Usage Example

```typescript
const LeaderboardScreen = () => {
  const dispatch = useDispatch();
  const { entries, userRank, isLoading } = useSelector(
    (state: RootState) => state.leaderboard
  );

  useEffect(() => {
    const now = new Date();
    dispatch(fetchLeaderboard({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      limit: 100,
    }));
  }, []);

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.$id}
      renderItem={({ item }) => (
        <LeaderboardItem entry={item} />
      )}
    />
  );
};
```

### 4. Streak Slice

**Location**: `src/store/slices/streakSlice.ts`

Manages daily streak tracking.

#### State Structure

```typescript
interface StreakState {
  currentStreak: number;
  totalStreak: number;
  lastLoginDate: string | null;
  streakStartDate: string | null;
  loginHistory: string[];
  isLoading: boolean;
  error: string | null;
  longestStreak: number;
  weeklyStreak: number;
}
```

#### Actions

```typescript
// Update Streak on Login
dispatch(updateStreakOnLogin(userId));

// Load Streak Data
dispatch(loadStreakData(userId));

// Get Streak Stats
dispatch(getStreakStats(userId));

// Set Streak Data (sync)
dispatch(setStreakData({
  currentStreak,
  totalStreak,
  lastLoginDate,
  streakStartDate,
  loginHistory,
}));
```

#### Usage Example

```typescript
const DailyStreakScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { 
    currentStreak, 
    longestStreak, 
    weeklyStreak 
  } = useSelector((state: RootState) => state.streak);

  useEffect(() => {
    if (user?.$id) {
      dispatch(loadStreakData(user.$id));
    }
  }, [user]);

  return (
    <View>
      <Text>Current Streak: {currentStreak} days</Text>
      <Text>Longest Streak: {longestStreak} days</Text>
      <Text>This Week: {weeklyStreak} days</Text>
    </View>
  );
};
```

## Redux Patterns

### 1. Async Thunk Pattern

Creating async actions:

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';

export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (params: Params, { rejectWithValue }) => {
    try {
      const data = await apiCall(params);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

Handling in reducer:

```typescript
extraReducers: (builder) => {
  builder
    .addCase(fetchData.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    })
    .addCase(fetchData.fulfilled, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    })
    .addCase(fetchData.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
}
```

### 2. Immer for Immutability

Redux Toolkit uses Immer for immutable updates:

```typescript
// Can mutate state directly (Immer handles immutability)
reducers: {
  updateUser: (state, action) => {
    state.user.xp += action.payload.xp;
    state.user.level = action.payload.level;
  },
}
```

### 3. TypeScript Integration

Type-safe hooks:

```typescript
// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

Usage:

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';

const Component = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
};
```

## State Flow Diagrams

### Login Flow

```
User Action (Login Button)
    ↓
dispatch(signIn({ email, password }))
    ↓
authSlice.pending → isLoading = true
    ↓
API Call (authService.signIn)
    ↓
├─ Success ─→ authSlice.fulfilled
│               ├── user = userData
│               ├── isAuthenticated = true
│               └── isLoading = false
│
└─ Error ───→ authSlice.rejected
                ├── error = errorMessage
                └── isLoading = false
```

### Question Answer Flow

```
User Selects Answer
    ↓
dispatch(answerQuestion({ isCorrect, xpEarned }))
    ↓
gameSlice Reducer
    ├── currentQuestion++
    ├── xp += xpEarned
    └── progress = (currentQuestion / totalQuestions) * 100
    ↓
if (!isCorrect)
    ↓
dispatch(deductLife())
    ↓
gameSlice Reducer
    └── lives--
```

## Persistence & Rehydration

### How It Works

1. **On State Change**: Redux Persist saves whitelisted slices to AsyncStorage
2. **On App Launch**: Redux Persist rehydrates state from storage
3. **On Logout**: Specific slices are cleared

### Manual Persistence

```typescript
import { persistor } from './store';

// Purge all persisted state
await persistor.purge();

// Flush pending writes
await persistor.flush();
```

### Clearing Persisted State

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear all AsyncStorage
await AsyncStorage.clear();

// Clear specific key
await AsyncStorage.removeItem('persist:root');
```

## Best Practices

### 1. Normalize State

Instead of nested structures:

```typescript
// ❌ Bad
state.sections[0].levels[1].questions[5]

// ✅ Good
state.questionsById[questionId]
state.levelsById[levelId]
```

### 2. Derived Data in Selectors

Don't store computed values:

```typescript
// ❌ Bad - storing computed value
state.accuracy = (correctAnswers / totalQuestions) * 100;

// ✅ Good - compute in selector
const selectAccuracy = (state: RootState) => {
  const { correctAnswers, totalQuestions } = state.game;
  return (correctAnswers / totalQuestions) * 100;
};
```

### 3. Single Source of Truth

Don't duplicate data across slices:

```typescript
// ❌ Bad - user data in multiple slices
state.auth.user.xp
state.game.xp

// ✅ Good - single source
state.auth.user.xp
// Game slice references auth.user.xp
```

### 4. Error Handling

Always handle errors in async thunks:

```typescript
export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      return await api.getData(params);
    } catch (error: any) {
      console.error('Fetch error:', error);
      return rejectWithValue(
        error.message || 'An unknown error occurred'
      );
    }
  }
);
```

### 5. Loading States

Track loading for async operations:

```typescript
interface SliceState {
  data: Data | null;
  isLoading: boolean;
  error: string | null;
}

// In component
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
return <DataView data={data} />;
```

## Debugging Redux

### Redux DevTools

Enable Redux DevTools in development:

```typescript
const store = configureStore({
  reducer: persistedReducer,
  devTools: __DEV__, // Enable in dev mode
});
```

### Logging Middleware

Add custom logging:

```typescript
const loggerMiddleware = (store) => (next) => (action) => {
  console.log('Dispatching:', action.type);
  console.log('Previous state:', store.getState());
  const result = next(action);
  console.log('Next state:', store.getState());
  return result;
};
```

### Accessing State in Console

```typescript
// In React Native debugger console
import { store } from './src/store';
console.log(store.getState());
```

## Common Issues

### Issue 1: State Not Updating

**Problem**: Component not re-rendering after dispatch

**Solution**: Use proper selectors

```typescript
// ❌ Wrong
const data = useSelector((state) => state);

// ✅ Correct
const data = useSelector((state: RootState) => state.slice.data);
```

### Issue 2: Persistence Not Working

**Problem**: State not persisting between sessions

**Solution**: Check whitelist configuration

```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'game', 'streak'], // Must include slice names
};
```

### Issue 3: Stale Data

**Problem**: Component shows old data

**Solution**: Refresh data on focus

```typescript
useFocusEffect(
  useCallback(() => {
    dispatch(fetchLatestData());
  }, [dispatch])
);
```

---

**Previous**: [← Navigation Flow](./02-navigation-flow.md)  
**Next**: [Services & API →](./04-services-api.md)
