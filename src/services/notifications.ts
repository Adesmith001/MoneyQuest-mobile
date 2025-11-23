import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is in foreground
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
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission denied');
        return false;
      }

      // For Android, create a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });
      }

      console.log('✅ Notification permission granted');
      return true;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionsStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Failed to get permissions status:', error);
      return 'undetermined';
    }
  }

  /**
   * Schedule daily reminder notifications at peak hours
   */
  async scheduleDailyReminder() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Peak hours to send notifications
      const peakHours = [
        { hour: 10, minute: 0, title: "Morning Learning! ☀️", body: "Start your day with a financial lesson!" },
        { hour: 14, minute: 0, title: "Afternoon Break! 📚", body: "Time for your daily financial literacy lesson!" },
        { hour: 19, minute: 0, title: "Evening Learning! 🌙", body: "Complete today's lesson before bed!" },
      ];

      // Schedule notification for each peak hour
      for (const peak of peakHours) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: peak.title,
            body: peak.body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: peak.hour,
            minute: peak.minute,
            repeats: true,
          },
        });
      }

      console.log('✅ Daily reminders scheduled for 10am, 2pm, and 7pm');
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  /**
   * Schedule a notification for when lives are full
   */
  async scheduleLifeFullNotification(minutesUntilFull: number) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Lives Restored! ❤️",
          body: "Your lives are full! Time to continue your learning journey.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: minutesUntilFull * 60,
          repeats: false,
        },
      });

      console.log(`✅ Life full notification scheduled for ${minutesUntilFull} minutes`);
    } catch (error) {
      console.error('Failed to schedule life notification:', error);
    }
  }

  /**
   * Send immediate notification (for testing or special events)
   */
  async sendImmediateNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Immediate notification sent');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📅 Scheduled notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }
}

export default new NotificationService();