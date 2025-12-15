# 🔔 Notification System Documentation

## Overview
Comprehensive push notification system for MoneyQuest app with support for Android and iOS. Handles daily learning reminders, lives-full alerts, and engagement notifications for user retention.

---

## 📋 Features

### 1. **Daily Learning Reminders**
- Sends notifications at **10:00 AM**, **2:00 PM**, and **7:00 PM** daily
- Encourages users to continue their financial education journey
- Uses `DailyTriggerInput` for precise scheduling

### 2. **Lives-Full Notifications**
- Notifies users when their lives regenerate to maximum (5/5)
- Calculates time until next life and schedules accordingly
- Minimum delay of 60 seconds to prevent spam

### 3. **Engagement Notifications**
- **24-hour inactivity**: "We miss you!" reminder
- **48-hour inactivity**: "Your streak is at risk!" warning
- Tracks last app open time via `AsyncStorage`

### 4. **Android Notification Channels**
Properly configured channels for Android 8.0+:
- `default`: General notifications
- `learning-reminders`: Daily learning prompts
- `lives-notifications`: Lives regeneration alerts
- `engagement`: Re-engagement messages

---

## 🚀 Quick Start

### Installation

1. **Install required packages:**
```bash
npx expo install expo-notifications expo-device
```

2. **Configure permissions in `app.json`:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#58CC02",
          "sounds": ["./assets/sounds/notification.mp3"],
          "androidMode": "default",
          "androidCollapsedTitle": "#{unread_notifications} new notifications"
        }
      ]
    ],
    "android": {
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "POST_NOTIFICATIONS"
      ]
    },
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#58CC02",
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_notifications} new notifications"
    }
  }
}
```

### Usage

**In `App.tsx`:**
```typescript
import notificationService from './src/services/notifications';

useEffect(() => {
  const initializeApp = async () => {
    // Initialize notification listeners
    await notificationService.initialize();
    
    // Request permissions
    const hasPermission = await notificationService.requestPermissions();
    
    if (hasPermission) {
      // Schedule all notifications
      await notificationService.scheduleDailyReminder();
      await notificationService.scheduleEngagementNotifications();
      console.log('✅ Notifications initialized');
    }
  };

  initializeApp();

  return () => {
    notificationService.cleanup();
  };
}, []);
```

**In Lives Service (`lives.ts`):**
```typescript
import { NotificationService } from './notifications';

// When lives reach maximum
if (lives === MAX_LIVES && currentLives < MAX_LIVES) {
  await NotificationService.sendImmediateNotification(
    '💚 Lives Restored!',
    'Your lives are full! Time to continue learning.',
    'lives-notifications'
  );
}

// Schedule notification for next life
if (lives < MAX_LIVES) {
  const timeUntilNextLife = this.getTimeUntilNextLife(lives, lastLifeRegenTime);
  await NotificationService.scheduleLifeFullNotification(timeUntilNextLife);
}
```

---

## 📱 Testing

### Using NotificationTestScreen

Navigate to the test screen:
```typescript
// Add to your navigator
import NotificationTestScreen from './src/screens/common/NotificationTestScreen';

// In ProfileStackNavigator or similar
<Stack.Screen 
  name="NotificationTest" 
  component={NotificationTestScreen}
  options={{ title: 'Notification Tests' }}
/>
```

**Test Actions Available:**
1. ✅ Request Permissions
2. 🧪 Send Immediate Test
3. 📅 Schedule Daily Reminders
4. ⏰ Schedule Engagement (24h/48h)
5. 💚 Schedule Life-Full (2-minute test)
6. 📋 View All Scheduled
7. 🗑️ Cancel All Notifications

### Important Testing Notes

⚠️ **Physical Device Required**
- iOS Simulator does NOT support push notifications
- Android Emulator has limited notification support
- Always test on real devices for accurate results

✅ **Test Checklist:**
- [ ] Permissions granted on first launch
- [ ] Immediate notification appears instantly
- [ ] Daily reminders scheduled correctly (check with "View All Scheduled")
- [ ] Life-full notification fires after calculated time
- [ ] Engagement notifications trigger after 24h/48h
- [ ] Tapping notification opens app
- [ ] Notifications show correct channel (Android)
- [ ] Badge count updates (iOS)

---

## 🛠️ API Reference

### Core Methods

#### `initialize()`
Sets up notification listeners and app state tracking.
```typescript
await notificationService.initialize();
```

#### `requestPermissions()`
Requests notification permissions from the user.
```typescript
const hasPermission = await notificationService.requestPermissions();
if (hasPermission) {
  // Proceed with scheduling
}
```

#### `scheduleDailyReminder()`
Schedules daily learning reminders at 10am, 2pm, 7pm.
```typescript
await notificationService.scheduleDailyReminder();
```

#### `scheduleLifeFullNotification(timeUntilFull: number)`
Schedules notification when lives regenerate to full.
```typescript
const timeUntilFull = 7200000; // 2 hours in ms
await notificationService.scheduleLifeFullNotification(timeUntilFull);
```

#### `scheduleEngagementNotifications()`
Schedules 24h and 48h inactivity reminders.
```typescript
await notificationService.scheduleEngagementNotifications();
```

#### `sendImmediateNotification(title: string, body: string, channelId?: string)`
Sends instant notification (useful for testing or special events).
```typescript
await notificationService.sendImmediateNotification(
  '🎉 Congratulations!',
  'You completed Level 10!',
  'default'
);
```

#### `cancelAllNotifications()`
Cancels all scheduled notifications.
```typescript
await notificationService.cancelAllNotifications();
```

#### `cancelNotificationsByType(type: string)`
Cancels specific notification type.
```typescript
await notificationService.cancelNotificationsByType('learning-reminder');
```

#### `getScheduledNotifications()`
Returns all scheduled notifications for debugging.
```typescript
const scheduled = await notificationService.getScheduledNotifications();
console.log(`${scheduled.length} notifications scheduled`);
```

#### `cleanup()`
Removes all listeners (call on app unmount).
```typescript
notificationService.cleanup();
```

---

## 🎯 Notification Types

### Learning Reminders
```typescript
{
  title: "📚 Time to Learn!",
  body: "Continue your financial education journey with MoneyQuest!",
  data: { type: 'learning-reminder', screen: 'Home' },
  channelId: 'learning-reminders', // Android
  categoryIdentifier: 'learning', // iOS
}
```

### Lives Full
```typescript
{
  title: "💚 Lives Restored!",
  body: "Your lives are full! Ready to continue learning?",
  data: { type: 'lives-full', screen: 'Home' },
  channelId: 'lives-notifications',
}
```

### 24h Engagement
```typescript
{
  title: "🎯 We Miss You!",
  body: "Continue your financial learning streak!",
  data: { type: 'engagement-24h', screen: 'Home' },
  channelId: 'engagement',
}
```

### 48h Engagement
```typescript
{
  title: "⚠️ Your Streak is at Risk!",
  body: "Don't lose your progress! Come back and learn.",
  data: { type: 'engagement-48h', screen: 'Home' },
  channelId: 'engagement',
}
```

---

## 🔧 Configuration

### Notification Timing

**Daily Reminders:**
```typescript
const DAILY_REMINDER_TIMES = [
  { hour: 10, minute: 0 }, // 10:00 AM
  { hour: 14, minute: 0 }, // 2:00 PM
  { hour: 19, minute: 0 }, // 7:00 PM
];
```

**Engagement Intervals:**
```typescript
const ENGAGEMENT_24H = 24 * 60 * 60; // 24 hours in seconds
const ENGAGEMENT_48H = 48 * 60 * 60; // 48 hours in seconds
```

**Life Regeneration:**
```typescript
const LIFE_REGEN_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours
```

### Android Channels

Channels are created in `setupAndroidChannels()`:

```typescript
// High-priority channel for lives
{
  name: 'lives-notifications',
  importance: Notifications.AndroidImportance.HIGH,
  bypassDnd: false,
  description: 'Notifications when your lives are restored',
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#58CC02',
}

// Default priority for learning reminders
{
  name: 'learning-reminders',
  importance: Notifications.AndroidImportance.DEFAULT,
  description: 'Daily reminders to continue learning',
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
}
```

---

## 🐛 Troubleshooting

### Notifications Not Appearing

1. **Check device settings:**
   - Go to Settings → Apps → MoneyQuest → Notifications
   - Ensure notifications are enabled
   - Check individual channel settings (Android)

2. **Check permissions in code:**
```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status); // Should be 'granted'
```

3. **Verify notifications are scheduled:**
```typescript
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log('Scheduled count:', scheduled.length);
```

4. **Test with immediate notification:**
```typescript
await notificationService.sendImmediateNotification(
  'Test',
  'If you see this, notifications work!',
  'default'
);
```

### Android-Specific Issues

**Problem:** Notifications don't appear on Android 13+
- **Solution:** Ensure `POST_NOTIFICATIONS` permission is in `app.json`

**Problem:** Notifications have no sound/vibration
- **Solution:** Check channel importance is at least `DEFAULT`

**Problem:** Notifications disappear immediately
- **Solution:** Increase channel importance to `HIGH` or `MAX`

### iOS-Specific Issues

**Problem:** Badge count not updating
- **Solution:** Set `badge` in notification content:
```typescript
content: {
  title: 'Title',
  body: 'Body',
  badge: 1, // iOS badge count
}
```

**Problem:** Notifications grouped incorrectly
- **Solution:** Set `categoryIdentifier`:
```typescript
content: {
  title: 'Title',
  body: 'Body',
  categoryIdentifier: 'learning', // iOS category
}
```

---

## 📊 Analytics & Monitoring

### Track Notification Events

```typescript
// In notification listener
const subscription = Notifications.addNotificationReceivedListener(notification => {
  const { type, screen } = notification.request.content.data || {};
  
  // Log to analytics
  console.log('Notification received:', type);
  
  // Track user action
  if (type === 'learning-reminder') {
    // Increment reminder_received counter
  }
});
```

### Monitor Notification Performance

```typescript
// Check scheduled notifications count
const scheduled = await notificationService.getScheduledNotifications();

// Log types
const types = scheduled.map(n => n.content.data?.type || 'unknown');
console.log('Scheduled types:', types);

// Check for duplicates
const duplicates = types.filter((item, index) => types.indexOf(item) !== index);
if (duplicates.length > 0) {
  console.warn('Duplicate notifications detected:', duplicates);
}
```

---

## 🔐 Best Practices

1. **Always check permissions before scheduling:**
```typescript
const hasPermission = await notificationService.requestPermissions();
if (!hasPermission) {
  // Show educational modal explaining why notifications are important
  return;
}
```

2. **Cancel old notifications before scheduling new ones:**
```typescript
await notificationService.cancelNotificationsByType('learning-reminder');
await notificationService.scheduleDailyReminder();
```

3. **Use appropriate channels for Android:**
```typescript
// High-priority for time-sensitive notifications
await notificationService.sendImmediateNotification(
  'Lives Full!',
  'Your lives are restored.',
  'lives-notifications' // HIGH importance channel
);

// Default priority for regular reminders
await notificationService.sendImmediateNotification(
  'Keep Learning!',
  'Continue your streak.',
  'learning-reminders' // DEFAULT importance channel
);
```

4. **Test on real devices throughout development:**
   - Emulators are unreliable for notification testing
   - Test both Android and iOS devices
   - Test different OS versions (Android 13+ has stricter permissions)

5. **Handle notification responses:**
```typescript
const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  const { screen } = response.notification.request.content.data || {};
  
  // Navigate to appropriate screen
  if (screen === 'Home') {
    navigation.navigate('Home');
  }
});
```

---

## 📚 Additional Resources

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [iOS Local Notifications](https://developer.apple.com/documentation/usernotifications)
- [Push Notification Best Practices](https://developer.apple.com/design/human-interface-guidelines/notifications)

---

## 🎉 Success Metrics

Monitor these KPIs to measure notification effectiveness:

- **Daily Active Users (DAU)** - increased by learning reminders
- **Retention Rate** - improved by engagement notifications
- **Session Frequency** - boosted by lives-full alerts
- **Notification Click-Through Rate (CTR)** - measure user engagement
- **Opt-Out Rate** - keep below 5% for healthy notification strategy

---

**Last Updated:** 2025
**Maintainer:** MoneyQuest Dev Team
