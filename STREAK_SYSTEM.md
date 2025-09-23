# Streak System Documentation

## Overview
The MoneyQuest app now includes a local streak tracking system that monitors user login patterns and maintains streak counts. The system tracks daily login streaks and resets monthly, encouraging consistent app usage.

## Features

### Core Functionality
- **Daily Login Tracking**: Counts consecutive days when users log into the app
- **Current Streak**: Shows the number of consecutive days the user has logged in
- **Total Streak**: Shows the total number of days the user has logged in this month
- **Monthly Reset**: Streak counters reset at the beginning of each month
- **Broken Streak Handling**: If a user misses a day, the current streak resets to 1 but total days continue counting

### Data Storage
- Uses React Native AsyncStorage for local persistence
- Data is stored per user ID to support multiple users
- Persisted through app restarts and updates

## Implementation Details

### Files Added/Modified

1. **src/services/streak.ts** (NEW)
   - Core streak logic and data management
   - Handles login detection, streak calculation, and storage

2. **src/store/slices/streakSlice.ts** (NEW)
   - Redux slice for global streak state management
   - Async thunks for streak operations

3. **src/store/index.ts** (MODIFIED)
   - Added streak reducer to store
   - Added streak to persistence whitelist

4. **src/store/slices/authSlice.ts** (MODIFIED)
   - Integrated streak updates into login flows
   - Dispatches streak actions on signin/signup/auth check

5. **src/screens/main/ProfileScreen.tsx** (MODIFIED)
   - Displays current streak, total streak, and monthly stats
   - Updated UI to show 4 stat cards in 2x2 grid

### Streak Logic

#### Login Detection
- Tracks the last login date for each user
- Compares current login with previous login to determine streak status

#### Streak Calculation Rules
1. **First Login**: Sets current streak to 1, total streak to 1
2. **Same Day**: No change to streak counts
3. **Consecutive Day**: Increments both current and total streak
4. **Broken Streak**: Resets current streak to 1, increments total streak
5. **New Month**: Resets both streaks to 1, updates monthly start date

#### Monthly Reset
- Automatically detects new month
- Resets streak counters on first login of new month
- Maintains separate tracking of monthly vs all-time streaks

## Usage

### For Users
The streak system works automatically:
1. Open the app (triggers login detection)
2. View streak stats on Profile screen
3. Continue daily logins to maintain streak

### For Developers

#### Accessing Streak Data
```typescript
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const MyComponent = () => {
  const { currentStreak, totalStreak, daysThisMonth } = useSelector(
    (state: RootState) => state.streak
  );
  
  return (
    <View>
      <Text>Current Streak: {currentStreak}</Text>
      <Text>Total Days: {totalStreak}</Text>
      <Text>This Month: {daysThisMonth}</Text>
    </View>
  );
};
```

#### Manual Streak Operations
```typescript
import StreakService from '../services/streak';

// Get current streak
const currentStreak = await StreakService.getCurrentStreak(userId);

// Get streak statistics
const stats = await StreakService.getStreakStats(userId);

// Check if user logged in today
const loggedToday = await StreakService.hasLoggedInToday(userId);

// Clear streak data (for testing or account deletion)
await StreakService.clearStreakData(userId);
```

## Testing

Use the provided test file (`test_streak.ts`) to verify functionality:

1. Import the test function in a component
2. Call `testStreakService()` to run automated tests
3. Check console output for results

Test scenarios include:
- First login
- Same day login
- Consecutive day login
- Broken streak handling
- Streak statistics

## Data Structure

### StreakData Interface
```typescript
interface StreakData {
  currentStreak: number;      // Current consecutive days
  totalStreak: number;        // Total days this month
  lastLoginDate: string;      // ISO timestamp of last login
  streakStartDate: string;    // When current streak started
  monthlyStreakStart: string; // When monthly period started
}
```

### Redux State
```typescript
interface StreakState {
  currentStreak: number;
  totalStreak: number;
  daysThisMonth: number;
  streakStartDate: string;
  lastLoginDate: string;
  isLoading: boolean;
  error: string | null;
}
```

## Future Enhancements

Potential improvements for the streak system:
1. **Rewards System**: XP bonuses for maintaining streaks
2. **Notifications**: Remind users to maintain their streak
3. **Social Features**: Share streak achievements with friends
4. **Analytics**: Track streak patterns and user engagement
5. **Backup**: Sync streak data to cloud storage
6. **Streak Recovery**: Allow users to recover broken streaks with in-app purchases

## Troubleshooting

### Common Issues

1. **Streak not updating**: Check if user ID is properly passed to streak functions
2. **Data persistence**: Verify AsyncStorage permissions and storage space
3. **Time zone issues**: All dates use ISO timestamps for consistency
4. **Redux state**: Ensure streak slice is properly configured in store

### Debug Steps

1. Check Redux DevTools for streak state changes
2. Verify AsyncStorage data using React Native Debugger
3. Test with multiple user accounts
4. Simulate date changes for testing edge cases

## Security Notes

- Streak data is stored locally and not transmitted to servers
- No sensitive information is stored in streak data
- User IDs are used as storage keys (ensure they're properly sanitized)
- Consider implementing data validation for production use