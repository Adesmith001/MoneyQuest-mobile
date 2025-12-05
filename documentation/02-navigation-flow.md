# Navigation Flow

This document explains the navigation architecture and screen flow in MoneyQuest.

## Navigation Architecture

MoneyQuest uses **React Navigation v6** with a combination of Stack and Tab navigators.

```
AppNavigator (Root Stack)
├── Auth Flow (Unauthenticated)
│   ├── Welcome Screen
│   ├── Login Screen
│   ├── Register Screen
│   ├── ForgotPassword Screen
│   └── Onboarding Screens
│       ├── Age Selection
│       ├── Learning Limit
│       ├── Goal Selection
│       ├── Referral Source
│       └── Avatar Selection
│
└── Main Flow (Authenticated)
    ├── MainTabNavigator (Bottom Tabs)
    │   ├── Home Tab → HomeScreen
    │   ├── Streak Tab → DailyStreakScreen
    │   └── Profile Tab → ProfileStackNavigator
    │       ├── Profile Screen
    │       ├── Settings Screen
    │       ├── Edit Profile Screen
    │       └── Change Avatar Screen
    │
    └── Modal Screens (Overlay)
        ├── Question Screen
        └── Level Completion Screen
```

## AppNavigator (Root)

**Location**: `src/navigation/AppNavigator.tsx`

### Responsibilities

1. **Authentication Gate**: Switches between auth and main app flows
2. **Loading States**: Shows loading screen during auth checks
3. **Deep Linking**: Handles password reset and other deep links
4. **Onboarding**: Shows onboarding flow for new users

### Flow Logic

```typescript
if (isLoading) {
  return <LoadingScreen />;
}

if (showWelcomeScreen && user) {
  return <WelcomeSuccessScreen />;
}

if (showOnboarding) {
  return <OnboardingFlow />;
}

if (!isAuthenticated) {
  // Show Auth Stack
  return <WelcomeScreen | LoginScreen | RegisterScreen />;
}

// Show Main App
return <MainTabNavigator />;
```

### Navigation Type Definitions

```typescript
export type RootStackParamList = {
  // Auth
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: { userId?: string; secret?: string };
  
  // Onboarding
  AgeSelection: { registrationData: RegistrationData };
  LearningLimitSelection: { registrationData: any; age: number };
  // ... other onboarding screens
  
  // Main App
  MainApp: undefined;
  MainTabs: undefined;
  
  // Game
  Question: { level: number; section: number; sectionTitle: string };
  LevelCompletion: { xpGained: number; accuracy: number };
  
  // Profile
  Settings: undefined;
  EditProfile: undefined;
  ChangeAvatar: undefined;
};
```

## Authentication Flow

### Initial App Launch

```
App Start
    ↓
Check Auth State (Redux)
    ↓
├─ Not Authenticated ─→ Welcome Screen
│                           ↓
│                       Login / Register
│                           ↓
│                       [Authenticate]
│                           ↓
└─ Authenticated ─────→ Main App
```

### Registration Flow

```
Welcome Screen
    ↓
Register Screen (collect basic info)
    ↓
Age Selection
    ↓
Learning Limit Selection
    ↓
Goal Selection
    ↓
Referral Source
    ↓
Avatar Selection
    ↓
[Create Account & Session]
    ↓
Welcome Success Screen
    ↓
Main App (Home Screen)
```

**Navigation Code**:
```typescript
// From Register Screen to Onboarding
navigation.navigate('AgeSelection', {
  registrationData: {
    firstName,
    lastName,
    username,
    email,
    phoneNumber,
    password,
  }
});

// From Avatar Selection to Welcome Success
// Account is created, then navigate
navigation.navigate('WelcomeSuccess', {
  userName: firstName
});
```

### Login Flow

```
Welcome Screen
    ↓
Login Screen
    ↓
[Authenticate with Email/Password or OAuth]
    ↓
├─ Success ─→ Main App (Home Screen)
└─ Failed ──→ Show Error, Stay on Login
```

**Navigation Code**:
```typescript
// After successful login
// Auth state changes automatically trigger navigation
dispatch(signIn({ email, password }));
// AppNavigator detects isAuthenticated=true and shows Main App
```

## Main App Navigation

### Bottom Tab Navigator

**Location**: `src/navigation/MainTabNavigator.tsx`

Three tabs with custom icons:

```typescript
<Tab.Navigator>
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="Streak" component={DailyStreakScreen} />
  <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} />
</Tab.Navigator>
```

**Tab Configuration**:
- **No labels**: Icons only (`tabBarShowLabel: false`)
- **Active color**: Orange (`#FF6B35`)
- **Inactive color**: Gray (`#6C757D`)
- **Safe area**: Respects device safe areas

### Home Screen Flow

```
Home Screen (Learning Path)
    ↓
Select Section & Level
    ↓
Question Screen (Modal)
    ↓
Answer Questions (10 questions per level)
    ↓
Level Completion Screen
    ↓
├─ Continue ─→ Back to Home Screen (Next Level Unlocked)
└─ Review ───→ Back to Home Screen
```

**Navigation Code**:
```typescript
// From Home to Question Screen
navigation.navigate('Question', {
  level: levelNumber,
  section: sectionNumber,
  sectionTitle: sectionTitle,
});

// From Question Screen to Level Completion
navigation.replace('LevelCompletion', {
  xpGained: totalXP,
  accuracy: accuracy,
});

// From Level Completion back to Home
navigation.navigate('MainApp');
```

### Profile Stack Navigator

**Location**: `src/navigation/ProfileStackNavigator.tsx`

Nested stack within the Profile tab:

```
Profile Tab
    ↓
ProfileStackNavigator
    ├── Profile Screen (Main)
    ├── Settings Screen
    ├── Edit Profile Screen
    └── Change Avatar Screen
```

**Navigation Code**:
```typescript
// From Profile to Settings
navigation.navigate('Settings');

// From Profile to Edit Profile
navigation.navigate('EditProfile');

// From Edit Profile to Change Avatar
navigation.navigate('ChangeAvatar');
```

## Screen Navigation Patterns

### Stack Navigation (Push/Pop)

```typescript
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const Component = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // Push new screen
  navigation.navigate('ScreenName', { param: value });
  
  // Go back
  navigation.goBack();
  
  // Replace current screen
  navigation.replace('ScreenName');
  
  // Reset navigation stack
  navigation.reset({
    index: 0,
    routes: [{ name: 'Home' }],
  });
};
```

### Tab Navigation

```typescript
// Switch to specific tab
navigation.navigate('Home'); // Home tab
navigation.navigate('Streak'); // Streak tab
navigation.navigate('ProfileStack'); // Profile tab
```

### Passing Parameters

```typescript
// Define params in type
type RootStackParamList = {
  Question: {
    level: number;
    section: number;
    sectionTitle: string;
  };
};

// Navigate with params
navigation.navigate('Question', {
  level: 1,
  section: 1,
  sectionTitle: 'Money Basics',
});

// Access params in destination screen
const { level, section, sectionTitle } = route.params;
```

## Modal Screens

Screens that appear as overlays:

1. **Question Screen**: Full-screen quiz interface
2. **Level Completion**: Results and rewards screen

**Configuration**:
```typescript
<Stack.Screen 
  name="Question" 
  component={QuestionScreen}
  options={{
    gestureEnabled: false, // Prevent swipe back during quiz
  }}
/>
```

## Deep Linking

### Password Reset Link

```
URL: moneyquest://reset-password/:userId/:secret
Screen: ForgotPasswordScreen
```

**Configuration**:
```typescript
const linking = {
  prefixes: ['moneyquest://'],
  config: {
    screens: {
      ForgotPassword: {
        path: 'reset-password/:userId/:secret',
        parse: {
          userId: (userId: string) => userId,
          secret: (secret: string) => secret,
        },
      },
    },
  },
};
```

**Usage**:
```typescript
// User clicks link in email
// App opens and navigates to ForgotPasswordScreen
// userId and secret are automatically parsed from URL
const { userId, secret } = route.params;
```

## Navigation Best Practices

### 1. Type Safety

Always use typed navigation:

```typescript
type ScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ScreenName'
>;

const navigation = useNavigation<ScreenNavigationProp>();
```

### 2. Prevent Back Navigation

For screens where users shouldn't go back (e.g., during quiz):

```typescript
options={{
  gestureEnabled: false,
  headerLeft: () => null, // Remove back button
}}
```

### 3. Reset Navigation Stack

After logout or completing critical flows:

```typescript
navigation.reset({
  index: 0,
  routes: [{ name: 'Welcome' }],
});
```

### 4. Loading States

Show loading during async navigation operations:

```typescript
const [isNavigating, setIsNavigating] = useState(false);

const handleNavigate = async () => {
  setIsNavigating(true);
  await someAsyncOperation();
  navigation.navigate('NextScreen');
  setIsNavigating(false);
};
```

## Navigation Hooks

### useNavigation

Access navigation object:

```typescript
const navigation = useNavigation();
navigation.navigate('ScreenName');
```

### useRoute

Access route and params:

```typescript
const route = useRoute();
const { param1, param2 } = route.params;
```

### useFocusEffect

Run code when screen comes into focus:

```typescript
useFocusEffect(
  useCallback(() => {
    // Screen is focused
    loadData();
    
    return () => {
      // Screen is unfocused
      cleanup();
    };
  }, [])
);
```

### useIsFocused

Check if screen is currently focused:

```typescript
const isFocused = useIsFocused();

if (isFocused) {
  // Screen is active
}
```

## Common Navigation Scenarios

### Logout Flow

```typescript
// Dispatch logout action
await dispatch(signOut());

// Redux state changes to isAuthenticated: false
// AppNavigator automatically switches to Auth flow
```

### Complete Level Flow

```typescript
// 1. User completes all questions
// 2. Navigate to LevelCompletion
navigation.replace('LevelCompletion', {
  xpGained: totalXP,
  accuracy: accuracyPercentage,
});

// 3. From LevelCompletion, return to Home
navigation.navigate('MainApp');

// 4. Home Screen detects completion and unlocks next level
```

### Edit Profile Flow

```typescript
// 1. From Profile screen
navigation.navigate('EditProfile');

// 2. User makes changes and saves
await updateProfile(changes);

// 3. Navigate back
navigation.goBack();

// 4. Profile screen auto-refreshes from Redux state
```

## Navigation Guards

### Authentication Guard

Implemented in `AppNavigator`:

```typescript
if (!isAuthenticated) {
  return <AuthStack />;
}
return <MainApp />;
```

### Progress Gate

Preventing access to locked levels (in HomeScreen):

```typescript
const isLevelUnlocked = calculateLevelProgress(/* ... */);

if (!isLevelUnlocked) {
  // Show locked icon, disable tap
  return;
}

// Navigate to Question screen
navigation.navigate('Question', { /* ... */ });
```

---

**Previous**: [← Project Structure](./01-project-structure.md)  
**Next**: [State Management →](./03-state-management.md)
