# User Progress & Lives System

This document explains user progress tracking and the lives system implementation.

## Progress System

### Progressive Unlocking

MoneyQuest uses a sequential unlocking system:
- Start with Section 1, Level 1
- Complete each level to unlock the next
- Complete all levels in a section to unlock the next section
- Avatar moves along the learning path

### Progress State

**Location**: `src/screens/main/HomeScreen.tsx`

```typescript
const calculateLevelProgress = (
  sectionId: string,
  levelId: string,
  levelIndex: number,
  sectionLevels: any[],
  firstSectionId?: string,
  completedLevelsSet?: Set<string>
) => {
  // Check if level is completed
  const isCompleted = completedLevelsSet.has(levelId);
  
  // First level of first section is always unlocked
  if (levelIndex === 0 && sectionId === firstSectionId) {
    return { isUnlocked: true, isCompleted, isCurrent: true };
  }
  
  // For subsequent levels, check if previous level is completed
  if (levelIndex > 0) {
    const previousLevel = sectionLevels[levelIndex - 1];
    const isUnlocked = completedLevelsSet.has(previousLevel.level_id);
    return { isUnlocked, isCompleted, isCurrent: false };
  }
  
  // For first level of subsequent sections
  // Check if ALL levels in previous section are completed
  const previousSection = sections[currentSectionIndex - 1];
  const previousSectionCompleted = previousSection?.levels?.every(
    level => completedLevelsSet.has(level.levelId)
  ) ?? false;
  
  return { 
    isUnlocked: previousSectionCompleted || isCompleted,
    isCompleted,
    isCurrent: false
  };
};
```

### User Progress Data

```typescript
interface User {
  xp: number;
  level: number;
  currentSection: number;
  currentLevelId: string;
  currentSectionId: string;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  monthlyXP: number;
  totalXP: number;
}
```

### Tracking Progress

```typescript
// After completing a level
const result = await levelProgressService.submitLevelProgress(
  userId,
  levelId,
  score,
  timeSpentMinutes,
  questionsCorrect,
  totalQuestions
);

// result contains:
// - passed: boolean
// - score: number
// - next_level_unlocked: boolean
// - next_level_id: string | null
// - message: string
```

### Fetching Completed Levels

```typescript
const loadCompletedLevels = async () => {
  try {
    const completed = await levelProgressService.getCompletedLevels(userId);
    const completedSet = new Set(completed.map(p => p.level_id));
    setCompletedLevels(completedSet);
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
};
```

## Lives System

### Configuration

```typescript
const MAX_LIVES = 5;
const LIFE_REGEN_TIME_MS = 60 * 60 * 1000; // 1 hour per life
```

### Lives Data

```typescript
interface User {
  lives: number; // Current lives (0-5)
  lastLifeRegenTime: string; // ISO timestamp
}
```

### Lives Regeneration

Lives regenerate automatically:
- 1 life regenerates every 1 hour
- Maximum 5 lives
- Regeneration stops at max lives

```typescript
const calculateRegeneratedLives = (
  currentLives: number,
  lastLifeRegenTime: string
): number => {
  if (currentLives >= MAX_LIVES) return MAX_LIVES;
  
  const now = Date.now();
  const lastRegen = new Date(lastLifeRegenTime).getTime();
  const timePassed = now - lastRegen;
  
  // Calculate how many lives should have regenerated
  const livesToRegen = Math.floor(timePassed / LIFE_REGEN_TIME_MS);
  
  const newLives = Math.min(currentLives + livesToRegen, MAX_LIVES);
  return newLives;
};
```

### Deducting Lives

```typescript
const deductLife = async (userId: string) => {
  const user = await getUserDocument(userId);
  
  // Calculate current lives (with regeneration)
  const currentLives = calculateRegeneratedLives(
    user.lives,
    user.lastLifeRegenTime
  );
  
  // Deduct 1 life
  const newLives = Math.max(0, currentLives - 1);
  
  // Update database
  await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    lives: newLives,
    lastLifeRegenTime: new Date().toISOString(),
  });
  
  return {
    lives: newLives,
    canContinue: newLives > 0,
  };
};
```

### Lives Display

```typescript
const LivesDisplay = ({ lives }) => (
  <View style={styles.livesContainer}>
    {Array.from({ length: MAX_LIVES }).map((_, index) => (
      <Ionicons
        key={index}
        name={index < lives ? 'heart' : 'heart-outline'}
        size={24}
        color={index < lives ? '#FF6B35' : '#CCC'}
      />
    ))}
  </View>
);
```

### Time Until Next Life

```typescript
const getTimeUntilNextLife = (
  currentLives: number,
  lastLifeRegenTime: string
): number => {
  if (currentLives >= MAX_LIVES) return 0;
  
  const now = Date.now();
  const lastRegen = new Date(lastLifeRegenTime).getTime();
  const timePassed = now - lastRegen;
  
  const timeForOneLife = LIFE_REGEN_TIME_MS;
  const timeUntilNext = timeForOneLife - (timePassed % timeForOneLife);
  
  return timeUntilNext;
};

// Display countdown
const formatTimeRemaining = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
```

### Lives Timer Component

```typescript
const LivesTimer = () => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const user = useSelector((state: RootState) => state.auth.user);
  
  useEffect(() => {
    const updateTimer = () => {
      const time = getTimeUntilNextLife(user.lives, user.lastLifeRegenTime);
      setTimeRemaining(time);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [user.lives, user.lastLifeRegenTime]);
  
  if (user.lives >= MAX_LIVES) {
    return <Text>Lives Full!</Text>;
  }
  
  return (
    <View>
      <Text>Next life in: {formatTimeRemaining(timeRemaining)}</Text>
    </View>
  );
};
```

## XP & Leveling

### XP Calculation

```typescript
const XP_PER_CORRECT_ANSWER = 10;

const calculateXP = (isCorrect: boolean): number => {
  return isCorrect ? XP_PER_CORRECT_ANSWER : 0;
};

// Update user XP
const updateXP = async (userId: string, xpEarned: number) => {
  const user = await getUserDocument(userId);
  
  const newXP = user.xp + xpEarned;
  const newMonthlyXP = user.monthlyXP + xpEarned;
  const newTotalXP = user.totalXP + xpEarned;
  
  // Calculate new level
  const newLevel = calculateLevel(newTotalXP);
  
  await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    xp: newXP,
    monthlyXP: newMonthlyXP,
    totalXP: newTotalXP,
    level: newLevel,
  });
};
```

### Level Calculation

```typescript
const calculateLevel = (totalXP: number): number => {
  // Level up every 100 XP
  const XP_PER_LEVEL = 100;
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
};

// Get XP needed for next level
const getXPForNextLevel = (currentLevel: number): number => {
  return currentLevel * 100;
};

// Get progress to next level
const getLevelProgress = (xp: number, level: number): number => {
  const xpForCurrentLevel = (level - 1) * 100;
  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeededForLevel = 100;
  
  return (xpIntoLevel / xpNeededForLevel) * 100;
};
```

### Level Up Animation

```typescript
const LevelUpModal = ({ visible, newLevel, onClose }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>Level Up!</Text>
        <Text style={styles.level}>Level {newLevel}</Text>
        <CustomButton title="Continue" onPress={onClose} />
      </View>
    </View>
  </Modal>
);
```

## Streak System

### Streak Tracking

```typescript
interface StreakData {
  currentStreak: number;
  totalStreak: number;
  lastLoginDate: string;
  streakStartDate: string;
  loginHistory: string[];
  longestStreak: number;
  weeklyStreak: number;
}
```

### Update Streak on Login

```typescript
const updateStreak = async (userId: string) => {
  const user = await getUserDocument(userId);
  
  const today = new Date().toISOString().split('T')[0];
  const lastLogin = new Date(user.lastLoginDate).toISOString().split('T')[0];
  
  const daysDiff = calculateDaysDifference(lastLogin, today);
  
  let newStreak = user.streak;
  
  if (daysDiff === 0) {
    // Same day, no change
    return;
  } else if (daysDiff === 1) {
    // Consecutive day
    newStreak += 1;
  } else {
    // Missed days, reset
    newStreak = 1;
  }
  
  await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    streak: newStreak,
    lastLoginDate: new Date().toISOString(),
  });
  
  return newStreak;
};
```

### Streak Display

```typescript
const StreakDisplay = ({ streak }) => (
  <View style={styles.streakContainer}>
    <Ionicons name="flame" size={32} color="#FF6B35" />
    <Text style={styles.streakText}>{streak} day streak</Text>
  </View>
);
```

## Leaderboard

### Monthly Rankings

```typescript
const fetchLeaderboard = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const response = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.LEADERBOARD,
    [
      Query.equal('month', month),
      Query.equal('year', year),
      Query.orderDesc('monthlyXP'),
      Query.limit(100),
    ]
  );
  
  return response.documents.map((doc, index) => ({
    ...doc,
    rank: index + 1,
  }));
};
```

### Update Leaderboard Entry

```typescript
const updateLeaderboardEntry = async (userId: string, monthlyXP: number) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  // Check if entry exists
  const existing = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.LEADERBOARD,
    [
      Query.equal('userId', userId),
      Query.equal('month', month),
      Query.equal('year', year),
    ]
  );
  
  if (existing.documents.length > 0) {
    // Update existing
    await databases.updateDocument(
      DB_ID,
      COLLECTIONS.LEADERBOARD,
      existing.documents[0].$id,
      { monthlyXP }
    );
  } else {
    // Create new entry
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.LEADERBOARD,
      ID.unique(),
      {
        userId,
        userName: user.name,
        monthlyXP,
        month,
        year,
      }
    );
  }
};
```

## Best Practices

### 1. Always Calculate Regenerated Lives

Before any operation with lives:

```typescript
const currentLives = calculateRegeneratedLives(user.lives, user.lastLifeRegenTime);
```

### 2. Update Progress Atomically

Wrap progress updates in try-catch:

```typescript
try {
  await updateXP(userId, xpEarned);
  await updateLevelProgress(userId, levelId);
  await updateLeaderboard(userId);
} catch (error) {
  console.error('Progress update failed:', error);
  // Retry or show error
}
```

### 3. Cache Progress Locally

Use Redux to cache progress:

```typescript
// After fetching from backend
dispatch(setCompletedLevels(completedLevels));

// Use cached data first
const cachedLevels = useSelector((state: RootState) => state.game.completedLevels);
```

### 4. Validate Level Access

Always check if level is unlocked:

```typescript
const handleLevelTap = (levelId: string, isUnlocked: boolean) => {
  if (!isUnlocked) {
    Alert.alert('Locked', 'Complete previous levels first');
    return;
  }
  
  navigation.navigate('Question', { levelId });
};
```

---

**Previous**: [← Question System](./06-question-system.md)  
**Next**: [Common Workflows →](./09-common-workflows.md)
