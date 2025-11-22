# MoneyQuest Backend Integration

## Overview
This document explains the integration between the MoneyQuest mobile app and the MoneyQuest backend API for fetching learning content, tracking progress, managing lives, and using audio services.

## Backend API
**Base URL:** `https://moneyquestproject-demo-production.up.railway.app`

## Key Features Implemented

### 1. Lives System
- Users start with **5 lives** (maximum)
- Lose 1 life for each incorrect answer
- Lives regenerate at a rate of **1 life per hour**
- Lives are tracked online in Appwrite database
- Game stops when lives reach 0 until regeneration

**Service:** `src/services/lives.ts`

**Key Functions:**
- `calculateCurrentLives()` - Calculate lives based on time passed
- `deductLife()` - Remove a life for incorrect answer
- `refreshLives()` - Update lives without deducting
- `getTimeUntilNextLife()` - Get countdown until next life regenerates

### 2. Level Progress Tracking
- User's current level position is saved (UUID-based)
- Progress is stored in `currentLevelId` and `currentSectionId`
- Users can continue from where they left off
- Progress is synced with backend API

**Service:** `src/services/levelProgress.ts`

**Key Functions:**
- `updateCurrentLevel()` - Save user's current position
- `submitLevelProgress()` - Submit quiz results to backend
- `getUserProgress()` - Fetch user's progress for a level
- `getNextLevel()` - Get the next level in sequence

### 3. XP System (Monthly Reset)
- Users earn XP for correct answers and completing levels
- **Monthly XP** (`monthlyXP`) - Resets at the start of each month
- **Total XP** (`totalXP`) - Also resets monthly (same as monthlyXP)
- Used for monthly leaderboard rankings

**Utilities:** `src/utils/index.ts`

**Key Functions:**
- `isNewMonth()` - Check if month has changed
- `getCurrentMonthKey()` - Get current month identifier
- `formatMonthlyXP()` - Format XP with month info
- `getDaysUntilMonthEnd()` - Days remaining in month

### 4. Backend API Integration
All learning content is now fetched from the MoneyQuest backend instead of dummy data.

**Service:** `src/services/backendApi.ts`

**Available Endpoints:**
- `getSectionLevels(sectionId)` - Get all levels in a section
- `getLevelDetails(levelId)` - Get level information
- `generateQuestions(levelId, numQuestions, difficulty)` - Generate AI questions
- `getLevelQuestions(levelId)` - Get previously generated questions
- `submitLevelResults(userId, levelId, score, timeSpent)` - Submit quiz results
- `getUserLevelProgress(userId, levelId)` - Get user's progress
- `generateTTS(text, voice, speed)` - Generate text-to-speech audio
- `getAudioUrl(audioPath)` - Get full audio file URL

### 5. Questions Service (Refactored)
Questions are now fetched from the backend API with AI-generated content.

**Service:** `src/services/questions.ts`

**Key Functions:**
- `getQuestionsForLevel(levelId, numQuestions, difficulty)` - Fetch questions for a level
- `recordAnswer()` - Record answer and deduct life if incorrect
- `submitLevelQuiz()` - Submit completed level with score
- `getLevelDetails()` - Get level information from backend
- `generateQuestionAudio()` - Generate TTS for question text

### 6. Audio Services (TTS)
Text-to-speech functionality for reading questions aloud.

**Features:**
- Convert question text to speech
- Multiple voice options
- Adjustable speed
- Audio URLs are returned from backend

## Database Schema Updates

### User Collection (Appwrite)
New fields added:
```typescript
{
  // Lives system
  lives: number;                    // Current lives (0-5)
  lastLifeRegenTime: string;        // ISO timestamp of last regeneration
  
  // Progress tracking
  currentLevelId: string | null;    // UUID of current level from backend
  currentSectionId: string | null;  // UUID of current section from backend
  
  // XP tracking (resets monthly)
  totalXP: number;                  // Total XP (resets monthly)
  monthlyXP: number;                // Monthly XP (existing field)
}
```

## Type Definitions

### Backend API Types
```typescript
// Question format from backend
interface BackendQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string; };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: { A: string; B: string; C: string; D: string; };
  difficulty: 'easy' | 'medium' | 'hard';
}

// Level format from backend
interface BackendLevel {
  level_id: string;
  level_number: number;
  title: string;
  description: string;
  has_quiz: boolean;
  min_score_to_pass: number;
  estimated_time_minutes: number;
}

// Progress format from backend
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

## Usage Examples

### 1. Fetching Questions for a Level
```typescript
import questionService from './services/questions';

// Get 10 questions for a level
const questions = await questionService.getQuestionsForLevel(
  'level-uuid-here',
  10,
  'mixed'  // difficulty
);
```

### 2. Recording an Answer
```typescript
import questionService from './services/questions';

const result = await questionService.recordAnswer(
  userId,
  levelId,
  'A',              // selected answer
  'B',              // correct answer
  false,            // is correct
  30                // time spent in seconds
);

console.log(`Lives remaining: ${result.livesRemaining}`);
console.log(`Can continue: ${result.canContinue}`);
console.log(`XP earned: ${result.xpEarned}`);
```

### 3. Checking Lives Status
```typescript
import livesService from './services/lives';

// Calculate current lives (with regeneration)
const { lives, lastLifeRegenTime } = livesService.calculateCurrentLives(
  user.lives,
  user.lastLifeRegenTime
);

// Get time until next life
const timeRemaining = livesService.getTimeUntilNextLife(
  lives,
  lastLifeRegenTime
);

// Format for display
const timeString = livesService.formatTimeRemaining(timeRemaining);
console.log(`Next life in: ${timeString}`);
```

### 4. Submitting Level Completion
```typescript
import questionService from './services/questions';

const result = await questionService.submitLevelQuiz(
  userId,
  levelId,
  8,    // questions correct
  10,   // total questions
  15    // time spent in minutes
);

if (result.passed) {
  console.log('Level passed!');
  console.log(`Next level: ${result.next_level_id}`);
} else {
  console.log('Try again!');
}
```

### 5. Tracking Level Progress
```typescript
import { levelProgressService } from './services/levelProgress';

// Update user's current level
await levelProgressService.updateCurrentLevel(
  userId,
  newLevelId,
  sectionId
);

// Get current level ID
const currentLevelId = await levelProgressService.getCurrentLevelId(userId);

// Check if monthly XP should reset
if (levelProgressService.shouldResetMonthlyXP(user)) {
  await levelProgressService.resetMonthlyXP(userId);
}
```

### 6. Generating TTS Audio
```typescript
import { backendApi } from './services/backendApi';

const audioResponse = await backendApi.generateTTS(
  'What is the difference between a need and a want?',
  'alloy',  // voice
  1.0       // speed
);

const audioUrl = backendApi.getAudioUrl(audioResponse.audio_url);
// Use audioUrl to play audio
```

## Configuration

### Environment Variables
Make sure `env.ts` has the backend URL:
```typescript
export const MONEYQUEST_API_BASE_URL = 'https://moneyquestproject-demo-production.up.railway.app';
```

### Appwrite Collections
Ensure these attributes exist in your User collection:
- `lives` (integer)
- `lastLifeRegenTime` (string/datetime)
- `currentLevelId` (string, optional)
- `currentSectionId` (string, optional)
- `totalXP` (integer)
- `monthlyXP` (integer)

## Important Notes

1. **Lives Regeneration**: Lives regenerate automatically based on time passed. The app calculates this client-side but stores the timestamp in Appwrite for consistency.

2. **Monthly XP Reset**: Both `monthlyXP` and `totalXP` reset at the start of each month. Implement a check in your app startup or profile screen to trigger the reset.

3. **Progress Continuity**: The app saves `currentLevelId` so users can resume from where they left off. Initialize this when a user first starts learning.

4. **Backend API**: All questions are AI-generated. The first time a level is accessed, questions are generated and cached on the backend.

5. **Audio Services**: TTS is available for accessibility. Audio files are generated on-demand and cached on the backend.

## Migration Notes

If you have existing users, you'll need to:
1. Add the new fields to existing user documents (default values)
2. Optionally migrate old progress data to new UUID-based system
3. Run a script to initialize `currentLevelId` for existing users

## Testing

Before deploying, test:
- [ ] Lives deduction on incorrect answers
- [ ] Lives regeneration after 1 hour
- [ ] Level progress saving and loading
- [ ] Question fetching from backend
- [ ] Monthly XP reset logic
- [ ] TTS audio generation
- [ ] Quiz submission and scoring

## Future Enhancements

Consider implementing:
- Lives purchase/boost system
- XP multipliers for streaks
- Achievements and badges
- Social features (challenge friends)
- Offline mode with cached questions
- Progressive difficulty adjustment

## Support

For backend API issues, check:
- Backend status: https://moneyquestproject-demo-production.up.railway.app/
- API documentation: See `MoneyQuestProject-demo/documentation.md`

For frontend issues, check:
- Service logs in Appwrite
- User document structure
- Network requests in debug mode
