# Services & API

This document explains the service layer architecture and backend API integration in MoneyQuest.

## Service Layer Architecture

MoneyQuest uses a service layer to abstract API calls and business logic from UI components.

```
Components/Screens
    ↓
Services Layer
    ↓
Backend APIs
    ├── Appwrite (Auth, Database, Storage)
    └── Python FastAPI (Questions, TTS, Content)
```

## Services Overview

### Authentication Service

**Location**: `src/services/auth.ts`

**Purpose**: Handle user authentication and profile management

#### Key Methods

```typescript
// Create account
await authService.createAccount(email, password, name, phoneNumber, username);

// Sign in
await authService.signIn(email, password);

// Sign out
await authService.signOut();

// Get current user
const user = await authService.getCurrentUser();

// Create account with onboarding data
await authService.createAccountWithOnboarding({
  email, password, name, username, phoneNumber,
  age, learningLimit, mainGoal, referralSource, avatar
});

// Update user profile
await authService.updateUserOnboarding(userId, {
  age, learningLimit, mainGoal, referralSource, avatar
});

// Update profile picture
await authService.updateProfilePicture(userId, imageUri);

// Password recovery
await authService.sendPasswordRecovery(email);
await authService.completePasswordRecovery(userId, secret, password, confirmPassword);

// OAuth methods
await authService.signInWithGoogle();
await authService.signInWithFacebook();
await authService.signInWithTwitter();
```

#### Usage Example

```typescript
import authService from '../services/auth';

const LoginScreen = () => {
  const handleLogin = async () => {
    try {
      const user = await authService.signIn(email, password);
      console.log('Logged in:', user);
      // Update Redux state
      dispatch(setUser(user));
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Error', error.message);
    }
  };
};
```

#### OAuth Flow

```typescript
// 1. Initiate OAuth (opens browser)
await authService.signInWithGoogle();

// 2. User authenticates in browser
// 3. Redirects to app with success/failure
// 4. authService.getCurrentUser() retrieves authenticated user

// OAuth redirect URLs
const successUrl = 'moneyquest://oauth-callback/success';
const failureUrl = 'moneyquest://oauth-callback/failure';
```

### Question Service

**Location**: `src/services/questions.ts`

**Purpose**: Fetch and manage questions, track progress

#### Key Methods

```typescript
// Get questions for a level
const questions = await questionService.getQuestionsForLevel(
  levelId,          // Backend level UUID
  numQuestions,     // Default: 10
  difficulty,       // 'easy' | 'medium' | 'hard' | 'mixed'
  questionType,     // 'mcq' | 'scenario' | 'matching' | 'fill_in_gap' | 'mixed'
  randomize         // Default: true
);

// Record an answer
const result = await questionService.recordAnswer(
  userId,
  levelId,
  selectedAnswer,
  correctAnswer,
  isCorrect,
  timeSpent
);
// Returns: { livesRemaining, canContinue, xpEarned }

// Submit completed level
const progress = await questionService.submitLevelQuiz(
  userId,
  levelId,
  questionsCorrect,
  totalQuestions,
  timeSpentMinutes
);

// Get level details
const level = await questionService.getLevelDetails(levelId);

// Get section levels
const levels = await questionService.getSectionLevels(sectionId);

// Generate TTS audio
const audioUrl = await questionService.generateQuestionAudio(text, voice, speed);
```

#### Question Types

**MCQ (Multiple Choice)**:
```typescript
interface GeneratedQuestion {
  question_type: 'mcq';
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: { A: string; B: string; C: string; D: string };
  difficulty: string;
}
```

**Scenario-Based**:
```typescript
interface ScenarioQuestion {
  question_type: 'scenario';
  scenario_context: string;  // Story/context
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: { A: string; B: string; C: string; D: string };
  difficulty: string;
}
```

**Matching**:
```typescript
interface MatchingQuestion {
  question_type: 'matching';
  question: string;
  left_items: { id: string; text: string }[];
  right_items: { id: string; text: string }[];
  correct_matches: { [leftId: string]: string };
  explanation: string;
  difficulty: string;
}
```

**Fill-in-the-Gap**:
```typescript
interface FillInGapQuestion {
  question_type: 'fill_in_gap';
  question: string;  // Text with {blank1}, {blank2}
  blanks: {
    id: string;
    correct_answer: string;
    options?: string[];
  }[];
  explanation: string;
  difficulty: string;
}
```

#### Usage Example

```typescript
import questionService from '../services/questions';

const QuestionScreen = () => {
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const data = await questionService.getQuestionsForLevel(
        levelId,
        10,
        'mixed',
        'mixed',
        true
      );
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleAnswer = async (selectedAnswer: string) => {
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    
    const result = await questionService.recordAnswer(
      userId,
      levelId,
      selectedAnswer,
      currentQuestion.correct_answer,
      isCorrect,
      timeSpent
    );

    if (!result.canContinue) {
      // Out of lives
      Alert.alert('Out of Lives', 'Wait for lives to regenerate');
    }
  };
};
```

### Backend API Service

**Location**: `src/services/backendApi.ts`

**Purpose**: Communicate with Python FastAPI backend

#### API Configuration

```typescript
const API_BASE_URL = 'http://your-backend-url.com';

class BackendApiService {
  private async fetchApi(endpoint: string, options?: RequestInit) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
}
```

#### Key Methods

```typescript
// Sections & Levels
const sections = await backendApi.getSections();
const levels = await backendApi.getSectionLevels(sectionId);
const levelDetails = await backendApi.getLevelDetails(levelId);

// Questions
const questions = await backendApi.getLevelQuestions(
  levelId, limit, questionType, randomize
);

const generated = await backendApi.generateQuestions(
  levelId, numQuestions, difficulty, questionType, randomize
);

// Progress
const progress = await backendApi.submitLevelProgress(
  userId, levelId, score, timeSpent, questionsCorrect, totalQuestions
);

const userProgress = await backendApi.getUserProgress(userId, levelId);

// Document Management
const documents = await backendApi.listDocuments();
const docDetails = await backendApi.getDocumentDetails(documentId);

// Audio Services
const ttsResponse = await backendApi.generateTTS(text, voice, speed);
const audioUrl = backendApi.getAudioUrl(audioPath);

// Statistics
const stats = await backendApi.getStats();
```

#### Endpoints

```typescript
// Sections
GET /sections

// Levels
GET /sections/{section_id}/levels
GET /levels/{level_id}

// Questions
GET /levels/{level_id}/questions
POST /levels/{level_id}/generate-questions
GET /levels/{level_id}/scenario-questions
GET /levels/{level_id}/matching-questions
GET /levels/{level_id}/fill-in-gap-questions

// Progress
POST /progress/submit-level
GET /progress/user/{user_id}/level/{level_id}

// Audio
POST /audio/tts
GET /audio/files/{audio_path}

// Documents
GET /upload/list
GET /upload/{document_id}
```

### Level Progress Service

**Location**: `src/services/levelProgress.ts`

**Purpose**: Track user progress through levels

#### Key Methods

```typescript
// Submit level progress
const result = await levelProgressService.submitLevelProgress(
  userId,
  levelId,
  score,
  timeSpentMinutes,
  questionsCorrect,
  totalQuestions
);

// Get user progress for a level
const progress = await levelProgressService.getUserLevelProgress(
  userId,
  levelId
);

// Get all completed levels
const completedLevels = await levelProgressService.getCompletedLevels(userId);
```

#### Progress Status

```typescript
interface BackendUserProgress {
  user_id: string;
  level_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number;
  attempts: number;
  time_spent_minutes: number;
  completed_at?: string;
}
```

### Lives Service

**Location**: `src/services/lives.ts`

**Purpose**: Manage the lives system

#### Configuration

```typescript
const MAX_LIVES = 5;
const LIFE_REGEN_TIME_MS = 60 * 60 * 1000; // 1 hour
```

#### Key Methods

```typescript
// Deduct a life
const result = await livesService.deductLife(
  userId,
  currentLives,
  lastLifeRegenTime
);
// Returns: { lives, canContinue, lastLifeRegenTime }

// Calculate regenerated lives
const lives = livesService.calculateRegeneratedLives(
  currentLives,
  lastLifeRegenTime
);

// Get time until next life
const timeMs = livesService.getTimeUntilNextLife(
  currentLives,
  lastLifeRegenTime
);
```

#### Lives Logic

```typescript
// Lives regenerate 1 per hour
// Max 5 lives
// Lose 1 life per wrong answer
// Can't continue if 0 lives

const deductLife = async (userId, currentLives, lastLifeRegenTime) => {
  // Calculate regenerated lives
  const regeneratedLives = calculateRegeneratedLives(
    currentLives,
    lastLifeRegenTime
  );
  
  // Deduct 1 life
  const newLives = Math.max(0, regeneratedLives - 1);
  
  // Update database
  await updateUserLives(userId, newLives);
  
  return {
    lives: newLives,
    canContinue: newLives > 0,
    lastLifeRegenTime: new Date().toISOString(),
  };
};
```

### Streak Service

**Location**: `src/services/streak.ts` and `src/services/streakAppwrite.ts`

**Purpose**: Track daily login streaks

#### Streak Service (Local)

```typescript
// Calculate streak based on dates
const streakData = streakService.calculateStreak(
  lastLoginDate,
  loginHistory
);

// Check if dates are consecutive
const isConsecutive = streakService.isConsecutiveDay(date1, date2);

// Format date for comparison
const dateKey = streakService.formatDateKey(date);
```

#### Streak Appwrite Service

```typescript
// Initialize streak
const streak = await streakAppwriteService.initializeStreak(userId);

// Update streak on login
const updated = await streakAppwriteService.updateStreakOnLogin(userId);

// Get streak stats
const stats = await streakAppwriteService.getStreakStats(userId);

// Get streak data
const data = await streakAppwriteService.getStreakData(userId);
```

#### Streak Logic

```typescript
const updateStreak = (lastLoginDate: string): number => {
  const today = new Date();
  const lastLogin = new Date(lastLoginDate);
  
  const daysDiff = calculateDaysDifference(lastLogin, today);
  
  if (daysDiff === 0) {
    // Same day, no change
    return currentStreak;
  } else if (daysDiff === 1) {
    // Consecutive day, increment
    return currentStreak + 1;
  } else {
    // Missed days, reset to 1
    return 1;
  }
};
```

### Audio Services

**Location**: `src/services/audioService.ts` and `src/services/soundService.ts`

#### Audio Service (TTS)

```typescript
// Load and play audio
await audioService.loadAudio(audioUrl);
await audioService.playAudio();
await audioService.pauseAudio();
await audioService.stopAudio();

// Cleanup
await audioService.unloadAudio();
```

#### Sound Service (Effects)

```typescript
// Load sounds
await soundService.loadSounds();

// Play sound effects
await soundService.playCorrectSound();
await soundService.playIncorrectSound();
await soundService.playLevelCompleteSound();

// Cleanup
await soundService.unloadAll();
```

### Notification Service

**Location**: `src/services/notifications.ts`

**Purpose**: Handle push notifications

```typescript
// Request permissions
const hasPermission = await notificationService.requestPermissions();

// Schedule notification
await notificationService.scheduleNotification({
  title: 'Daily Reminder',
  body: 'Complete your daily lesson!',
  trigger: { seconds: 3600 },
});

// Cancel notifications
await notificationService.cancelAllNotifications();
```

### Cache Service

**Location**: `src/services/cacheService.ts`

**Purpose**: Local data caching

```typescript
// Set cache
await cacheService.set(key, value, expirationMs);

// Get cache
const value = await cacheService.get(key);

// Clear cache
await cacheService.clear(key);
await cacheService.clearAll();

// Check if expired
const isExpired = cacheService.isExpired(key);
```

## Appwrite Configuration

**Location**: `src/config/appwrite.ts` and `src/services/appwrite.ts`

### Configuration

```typescript
export const APPWRITE_CONFIG = {
  ENDPOINT: process.env.APPWRITE_ENDPOINT,
  PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
  DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
  COLLECTIONS: {
    USERS: process.env.APPWRITE_USERS_COLLECTION_ID,
    QUESTIONS: process.env.APPWRITE_QUESTIONS_COLLECTION_ID,
    LEADERBOARD: process.env.APPWRITE_LEADERBOARD_COLLECTION_ID,
    LEVELS: process.env.APPWRITE_LEVELS_COLLECTION_ID,
    USER_PROGRESS: process.env.APPWRITE_USER_PROGRESS_COLLECTION_ID,
    STREAKS: process.env.APPWRITE_STREAKS_COLLECTION_ID,
  },
  STORAGE_BUCKET_ID: process.env.APPWRITE_STORAGE_BUCKET_ID,
};
```

### SDK Initialization

```typescript
import { Client, Account, Databases, Storage, Query } from 'react-native-appwrite';

const client = new Client();
client
  .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
  .setProject(APPWRITE_CONFIG.PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { Query };
```

### Database Operations

```typescript
// Create document
const doc = await databases.createDocument(
  DB_ID,
  COLLECTION_ID,
  ID.unique(),
  data
);

// Get document
const doc = await databases.getDocument(
  DB_ID,
  COLLECTION_ID,
  documentId
);

// Update document
await databases.updateDocument(
  DB_ID,
  COLLECTION_ID,
  documentId,
  updates
);

// List documents
const response = await databases.listDocuments(
  DB_ID,
  COLLECTION_ID,
  [
    Query.equal('field', value),
    Query.orderDesc('$createdAt'),
    Query.limit(10),
  ]
);

// Delete document
await databases.deleteDocument(
  DB_ID,
  COLLECTION_ID,
  documentId
);
```

### Storage Operations

```typescript
// Upload file
const file = await storage.createFile(
  BUCKET_ID,
  ID.unique(),
  fileObject
);

// Get file URL
const url = storage.getFileView(BUCKET_ID, fileId);

// Download file
const fileData = await storage.getFileDownload(BUCKET_ID, fileId);

// Delete file
await storage.deleteFile(BUCKET_ID, fileId);
```

## Error Handling

### Service Error Pattern

```typescript
class ServiceClass {
  async method(params: any): Promise<Result> {
    try {
      const result = await apiCall(params);
      return result;
    } catch (error: any) {
      console.error('Method error:', error);
      
      // Handle specific errors
      if (error.code === 404) {
        throw new Error('Resource not found');
      } else if (error.code === 401) {
        throw new Error('Unauthorized');
      }
      
      // Generic error
      throw new Error(error.message || 'An error occurred');
    }
  }
}
```

### Component Error Handling

```typescript
const Component = () => {
  const handleAction = async () => {
    try {
      await service.method(params);
      // Success
    } catch (error: any) {
      console.error('Action failed:', error);
      Alert.alert('Error', error.message);
    }
  };
};
```

## Best Practices

### 1. Service Abstraction

Keep services decoupled from UI:

```typescript
// ✅ Good
const user = await authService.signIn(email, password);
dispatch(setUser(user));

// ❌ Bad
const response = await fetch(`${API_URL}/auth/signin`, { ... });
dispatch(setUser(response.data));
```

### 2. Error Messages

Provide user-friendly errors:

```typescript
// ✅ Good
throw new Error('Invalid email or password');

// ❌ Bad
throw error;
```

### 3. Loading States

Always handle loading:

```typescript
const [isLoading, setIsLoading] = useState(false);

const loadData = async () => {
  setIsLoading(true);
  try {
    const data = await service.getData();
    setData(data);
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Retry Logic

Implement retry for transient failures:

```typescript
const fetchWithRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 5. Caching

Cache frequently accessed data:

```typescript
const getCachedData = async (key: string) => {
  // Check cache first
  const cached = await cacheService.get(key);
  if (cached) return cached;
  
  // Fetch from API
  const data = await api.getData();
  
  // Cache for 1 hour
  await cacheService.set(key, data, 3600000);
  
  return data;
};
```

---

**Previous**: [← State Management](./03-state-management.md)  
**Next**: [Component Guide →](./05-component-guide.md)
