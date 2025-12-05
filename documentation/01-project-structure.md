# Project Structure

This document provides a detailed overview of the MoneyQuest project structure.

## Root Directory

```
MoneyQuest/
├── src/                    # Source code
├── assets/                 # Static assets (images, fonts, sounds)
├── appwrite/              # Appwrite cloud functions
├── MoneyQuestProject-demo/# Python backend
├── documentation/         # Project documentation
├── App.tsx               # Application entry point
├── AppNew.tsx            # Alternative app entry (legacy)
├── index.ts              # Expo entry point
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
├── eas.json              # Expo Application Services config
└── env.ts                # Environment type definitions
```

## Source Directory (`src/`)

### Components (`src/components/`)

Reusable UI components organized by type:

```
components/
├── AnimatedTextInput.tsx      # Animated input field
├── CustomButton.tsx           # Styled button component
├── LoadingScreen.tsx          # Loading indicator
├── progressBar.tsx            # Progress indicator
├── ResponsiveContainer.tsx    # Responsive wrapper
├── SelectionButton.tsx        # Selection button component
├── modals/                    # Modal components
│   ├── CorrectAnswerModal.tsx
│   ├── IncorrectAnswerModal.tsx
│   ├── FeedbackModal.tsx
│   └── InviteFriendsModal.tsx
├── questions/                 # Question-specific components
│   ├── FillInGapQuestion.tsx
│   ├── MatchingQuestion.tsx
│   └── ScenarioQuestion.tsx
└── skeletons/                # Loading skeletons
    └── LearningPathSkeleton.tsx
```

**Purpose**: Components are small, reusable pieces of UI that can be used across multiple screens.

### Navigation (`src/navigation/`)

Navigation configuration and navigators:

```
navigation/
├── AppNavigator.tsx          # Root navigator (handles auth flow)
├── MainTabNavigator.tsx      # Bottom tab navigation
├── ProfileStackNavigator.tsx # Profile screen stack
└── ProfileTabIcon.tsx        # Custom profile tab icon
```

**Key Files**:
- `AppNavigator.tsx`: Manages authentication state and switches between auth and main app flows
- `MainTabNavigator.tsx`: Bottom tabs (Home, Streak, Profile)

### Screens (`src/screens/`)

Full-screen views organized by feature:

```
screens/
├── auth/                     # Authentication screens
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   └── ProfileSetupScreen.tsx
├── onboarding/              # First-time user onboarding
│   ├── OnboardingFlow.tsx
│   ├── AgeSelectionScreen.tsx
│   ├── LearningLimitScreen.tsx
│   ├── GoalSelectionScreen.tsx
│   ├── ReferralSourceScreen.tsx
│   ├── AvatarSelectionScreen.tsx
│   └── WelcomeSuccessScreen.tsx
├── main/                    # Main app screens
│   ├── HomeScreen.tsx       # Learning path/levels
│   ├── DailyStreakScreen.tsx
│   └── LeaderboardScreen.tsx
├── game/                    # Gameplay screens
│   ├── QuestionScreen.tsx   # Quiz interface
│   └── LevelCompletionScreen.tsx
├── profile/                 # User profile screens
│   ├── ProfileScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── EditProfileScreen.tsx
│   └── ChangeAvatarScreen.tsx
└── common/                  # Shared screens
    └── LoadingScreen.tsx
```

**Screen Types**:
- **Auth Screens**: Handle user authentication
- **Onboarding Screens**: Multi-step user setup
- **Main Screens**: Primary app functionality
- **Game Screens**: Quiz and level completion
- **Profile Screens**: User management

### Services (`src/services/`)

Backend communication and business logic:

```
services/
├── appwrite.ts           # Appwrite SDK initialization
├── auth.ts               # Authentication service
├── backendApi.ts         # Python backend API client
├── questions.ts          # Question fetching and management
├── learningService.ts    # Learning content service
├── levelProgress.ts      # Progress tracking
├── lives.ts              # Lives system
├── streak.ts             # Streak tracking (local)
├── streakAppwrite.ts     # Streak tracking (Appwrite)
├── audioService.ts       # Audio playback
├── soundService.ts       # Sound effects
├── notifications.ts      # Push notifications
└── cacheService.ts       # Local caching
```

**Service Responsibilities**:
- **auth.ts**: User registration, login, logout, password recovery
- **backendApi.ts**: Communication with Python FastAPI backend
- **questions.ts**: Fetch questions, submit answers, track progress
- **levelProgress.ts**: Track and update user progress
- **lives.ts**: Manage lives system (deduction, regeneration)
- **streak.ts**: Calculate and update daily streaks

### Store (`src/store/`)

Redux state management:

```
store/
├── index.ts              # Store configuration
└── slices/
    ├── authSlice.ts      # Authentication state
    ├── gameSlice.ts      # Game/quiz state
    ├── leaderboardSlice.ts # Leaderboard data
    └── streakSlice.ts    # Streak state
```

**State Slices**:
- **authSlice**: User data, authentication status
- **gameSlice**: Current level, section, progress
- **leaderboardSlice**: Ranking and competition data
- **streakSlice**: Daily streak tracking

### Types (`src/types/`)

TypeScript type definitions:

```
types/
├── index.ts              # Main types export
└── env.d.ts             # Environment variable types
```

**Key Interfaces**:
- `User`: User profile and progress data
- `Question`, `AnyQuestion`: Question type definitions
- `BackendLevel`, `BackendSection`: Backend data structures
- `AuthState`, `GameState`: Redux state types

### Configuration (`src/config/`)

Application configuration:

```
config/
├── appwrite.ts           # Appwrite configuration
├── learningPath.ts       # Learning path data
└── environment.dart      # Environment config (legacy)
```

### Utilities (`src/utils/`)

Helper functions and utilities:

```
utils/
├── index.ts              # Utility functions
├── avatarUtils.ts        # Avatar helper functions
└── linking.ts            # Deep linking configuration
```

### Data (`src/data/`)

Static data files:

```
data/
└── lessons.json          # Lesson content (legacy)
```

### Hooks (`src/hooks/`)

Custom React hooks:

```
hooks/
└── useStreak.ts          # Streak management hook
```

### Constants (`src/constants/`)

Application constants:

```
constants/
└── index.ts              # App-wide constants
```

## Backend Directory (`MoneyQuestProject-demo/`)

Python FastAPI backend for question generation and content management:

```
MoneyQuestProject-demo/
├── main.py                   # FastAPI application entry
├── config.py                 # Backend configuration
├── database_manager.py       # PostgreSQL management
├── qdrant_service.py        # Vector database service
├── Question_generator.py    # AI question generation
├── base_schemas.py          # Pydantic schemas
├── requirements.txt         # Python dependencies
├── upload_layer/            # Document upload & parsing
│   ├── upload_api.py
│   ├── document_parser.py
│   ├── ingest.py
│   └── schemas.py
├── audio/                   # Audio services
│   ├── audio_router.py
│   ├── audio_service.py
│   ├── tts_router.py
│   └── tts_service.py
└── database/               # Database schemas
    ├── schema.sql
    ├── learning_service.py
    └── metadata_router.py
```

**Backend Purpose**:
- Generate questions using OpenAI
- Manage learning content in Qdrant vector database
- Provide TTS (Text-to-Speech) services
- Track user progress in PostgreSQL

## Assets Directory (`assets/`)

Static resources:

```
assets/
├── fonts/                # Custom fonts
├── sounds/              # Sound effects and audio
└── *.png               # Images (avatars, icons, etc.)
```

## Appwrite Functions (`appwrite/functions/`)

Serverless functions:

```
appwrite/functions/
└── updateStreak/
    └── src/             # Streak update function
```

## Key Files Explained

### `App.tsx`

Main application entry point that:
- Wraps app with providers (Redux, SafeAreaProvider)
- Loads fonts and assets
- Initializes the navigation

### `package.json`

Dependencies include:
- **React Native & Expo**: Core framework
- **@react-navigation**: Navigation library
- **@reduxjs/toolkit**: State management
- **react-native-appwrite**: Appwrite SDK
- **expo-av**: Audio playback
- **expo-notifications**: Push notifications

### `tsconfig.json`

TypeScript configuration with:
- Strict type checking
- Path aliases for imports
- React Native preset

## Import Conventions

### Absolute vs Relative Imports

```typescript
// Absolute imports (preferred for services, types, etc.)
import { User } from '../types';
import authService from '../services/auth';
import { useAppDispatch } from '../store';

// Relative imports for local files
import CustomButton from './CustomButton';
```

### Common Import Patterns

```typescript
// Navigation
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Redux
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';

// React Native
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Services
import authService from '../services/auth';
import questionService from '../services/questions';
```

## Naming Conventions

### Files
- **Screens**: `ScreenName + Screen.tsx` (e.g., `HomeScreen.tsx`)
- **Components**: `ComponentName.tsx` (e.g., `CustomButton.tsx`)
- **Services**: `serviceName.ts` (e.g., `auth.ts`)
- **Types**: `index.ts` or `env.d.ts`

### Components
- **PascalCase** for component names
- **camelCase** for functions and variables
- **UPPER_SNAKE_CASE** for constants

```typescript
// Component
export const CustomButton: React.FC<Props> = ({ onPress, title }) => { ... }

// Function
const handleSubmit = () => { ... }

// Constant
const MAX_LIVES = 5;
```

## Module Organization Best Practices

1. **Keep related files together**: Components used only in one screen should be co-located
2. **Separate concerns**: Business logic in services, UI in components
3. **Shared first**: Common components go in `src/components/`
4. **Type everything**: Use TypeScript interfaces for all data structures
5. **One component per file**: Except for tightly coupled sub-components

---

**Next**: [Navigation Flow →](./02-navigation-flow.md)
