import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      console.error('Request permissions error:', error);
      return false;
    }
  }

  // Schedule daily reminder notification
  async scheduleDailyReminder(): Promise<void> {
    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule daily notification at 8 PM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Don't break your streak! 🔥",
          body: "Complete today's financial lesson to maintain your learning streak!",
          data: { type: 'daily_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 20,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Daily reminder scheduled');
    } catch (error) {
      console.error('Schedule daily reminder error:', error);
    }
  }

  // Schedule streak reminder (when user hasn't logged in)
  async scheduleStreakReminder(streakCount: number): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${streakCount} day streak at risk! ⚠️`,
          body: "Don't lose your amazing progress! Open the app now to continue learning.",
          data: { type: 'streak_reminder', streak: streakCount },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3600, // 1 hour from now
        },
      });

      console.log('Streak reminder scheduled');
    } catch (error) {
      console.error('Schedule streak reminder error:', error);
    }
  }

  // Send achievement notification
  async sendAchievementNotification(title: string, message: string, xpEarned?: number): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: xpEarned ? `${message} (+${xpEarned} XP)` : message,
          data: { type: 'achievement', xp: xpEarned },
        },
        trigger: null, // Send immediately
      });

      console.log('Achievement notification sent');
    } catch (error) {
      console.error('Send achievement notification error:', error);
    }
  }

  // Send level completion notification
  async sendLevelCompletionNotification(level: number, xpEarned: number): Promise<void> {
    try {
      await this.sendAchievementNotification(
        `Level ${level} Complete! 🎉`,
        `Congratulations! You've mastered level ${level}.`,
        xpEarned
      );
    } catch (error) {
      console.error('Send level completion notification error:', error);
    }
  }

  // Send leaderboard update notification
  async sendLeaderboardNotification(newRank: number, previousRank?: number): Promise<void> {
    try {
      let message = `You're now ranked #${newRank} on the leaderboard!`;
      
      if (previousRank && newRank < previousRank) {
        message = `You moved up to #${newRank} on the leaderboard! (from #${previousRank})`;
      }

      await this.sendAchievementNotification(
        'Leaderboard Update! 🏆',
        message
      );
    } catch (error) {
      console.error('Send leaderboard notification error:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Cancel all notifications error:', error);
    }
  }

  // Handle notification response (when user taps notification)
  setupNotificationResponseHandler(): void {
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      switch (data.type) {
        case 'daily_reminder':
        case 'streak_reminder':
          // Navigate to main learning screen
          // You'll implement navigation logic here
          console.log('Navigate to learning screen');
          break;
        case 'achievement':
          // Maybe show achievement modal
          console.log('Show achievement modal');
          break;
        default:
          console.log('Unknown notification type:', data.type);
      }
    });
  }

  // Get notification permissions status
  async getPermissionsStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Get permissions status error:', error);
      return 'undetermined';
    }
  }
}

export default new NotificationService();