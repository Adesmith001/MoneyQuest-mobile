import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analyticsService from './analytics';

// Configure how notifications should be handled when the app is in foreground
// Wrap in try-catch to prevent iOS crash if notification system isn't ready
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.warn('Failed to set notification handler:', error);
}

class NotificationService {
  private appStateSubscription: any = null;
  private lastAppOpenTime: number = Date.now();
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Request notification permissions (works for both iOS and Android)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Check if it's a physical device
      if (!Device.isDevice) {
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      await analyticsService.trackEvent('notification_permission_updated', {
        previous_status: existingStatus,
        current_status: finalStatus,
      }, {
        featureName: 'notifications',
      });

      if (finalStatus !== 'granted') {
        return false;
      }

      // For Android 13+, request POST_NOTIFICATIONS permission
      if (Platform.OS === 'android') {
        // Create notification channels for Android
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels() {
    if (Platform.OS !== 'android') return;

    try {
      // Default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Learning reminders channel
      await Notifications.setNotificationChannelAsync('learning-reminders', {
        name: 'Learning Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Lives notifications channel
      await Notifications.setNotificationChannelAsync('lives-notifications', {
        name: 'Lives Full',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // Engagement channel
      await Notifications.setNotificationChannelAsync('engagement', {
        name: 'Stay Engaged',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

    } catch (error) {
      console.error('Failed to setup Android channels:', error);
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
   * Initialize notification listeners and app state tracking
   */
  async initialize() {
    try {
      // Set up notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        analyticsService.trackEvent('notification_received', {
          type: String(notification.request.content.data?.type || 'unknown'),
          title: notification.request.content.title || '',
        }, {
          featureName: 'notifications',
        }).catch(() => {});
      });

      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        analyticsService.trackEvent('notification_opened', {
          type: String(response.notification.request.content.data?.type || 'unknown'),
          title: response.notification.request.content.title || '',
        }, {
          featureName: 'notifications',
        }).catch(() => {});
      });

      // Track last app open time
      await this.updateLastAppOpenTime();

      // Set up app state listener for engagement tracking
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      await this.updateLastAppOpenTime();
      // Reschedule daily reminders and engagement notifications when app opens
      await this.scheduleDailyReminder();
      await this.scheduleEngagementNotifications();
    }
  };

  /**
   * Update last app open time in storage
   */
  private async updateLastAppOpenTime() {
    try {
      const now = Date.now();
      await AsyncStorage.setItem('lastAppOpenTime', now.toString());
      this.lastAppOpenTime = now;
    } catch (error) {
      console.error('Failed to update last app open time:', error);
    }
  }

  /**
   * Get last app open time from storage
   */
  private async getLastAppOpenTime(): Promise<number> {
    try {
      const time = await AsyncStorage.getItem('lastAppOpenTime');
      return time ? parseInt(time) : Date.now();
    } catch (error) {
      console.error('Failed to get last app open time:', error);
      return Date.now();
    }
  }

  /**
   * Schedule daily learning reminder notifications (cross-platform)
   * Each notification fires at its specific time: 10am, 2pm, 7pm
   */
  async scheduleDailyReminder() {
    try {
      // Cancel existing learning reminders
      await this.cancelNotificationsByType('learning-reminder');

      // Peak hours to send notifications
      const peakHours = [
        { hour: 10, minute: 0, title: "Morning Learning! ☀️", body: "Start your day with a financial lesson!" },
        { hour: 14, minute: 0, title: "Afternoon Break! 📚", body: "Time for your daily financial literacy lesson!" },
        { hour: 19, minute: 0, title: "Evening Learning! 🌙", body: "Complete today's lesson before bed!" },
      ];

      let scheduledCount = 0;

      // Schedule notification for each peak hour
      for (const peak of peakHours) {
        // Calculate the next occurrence of this time
        const now = new Date();
        const scheduledDate = new Date();
        scheduledDate.setHours(peak.hour, peak.minute, 0, 0);

        // If the time has passed today, schedule for tomorrow
        if (scheduledDate <= now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: peak.title,
            body: peak.body,
            sound: true,
            badge: 1,
            data: { 
              type: 'learning-reminder',
              screen: 'Home',
              scheduledHour: peak.hour,
            },
            ...(Platform.OS === 'android' && {
              channelId: 'learning-reminders',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              color: '#58CC02',
            }),
            ...(Platform.OS === 'ios' && {
              categoryIdentifier: 'learning',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: scheduledDate,
          },
        });

        scheduledCount++;
        const timeStr = `${peak.hour}:${peak.minute.toString().padStart(2, '0')}`;
        const nextFireTime = scheduledDate.toLocaleString();
      }

      // Verify scheduled notifications
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const reminderCount = allScheduled.filter(n => n.content.data?.type === 'learning-reminder').length;
    } catch (error) {
      console.error('❌ Failed to schedule daily reminders:', error);
    }
  }

  /**
   * Schedule a notification for when lives are full
   */
  async scheduleLifeFullNotification(minutesUntilFull: number) {
    try {
      // Cancel existing life-full notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'lives-full') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Only schedule if there's a meaningful wait time (at least 1 minute)
      if (minutesUntilFull < 1) {
        return;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Lives Restored! ❤️",
          body: "Your lives are full! Time to continue your learning journey.",
          sound: true,
          badge: 1,
          data: { type: 'lives-full' },
          ...(Platform.OS === 'android' && {
            channelId: 'lives-notifications',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(minutesUntilFull * 60, 60), // At least 60 seconds
          repeats: false,
        },
      });

    } catch (error) {
      console.error('Failed to schedule life notification:', error);
    }
  }

  /**
   * Schedule engagement notifications (e.g., "Where are you?" after 24 hours of inactivity)
   */
  async scheduleEngagementNotifications() {
    try {
      // Cancel existing engagement notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'engagement') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      const lastOpen = await this.getLastAppOpenTime();
      const now = Date.now();
      const hoursSinceLastOpen = (now - lastOpen) / (1000 * 60 * 60);

      // If app hasn't been opened in last 12 hours, schedule engagement notifications
      if (hoursSinceLastOpen > 12) {
        // Immediate notification if been away for 24+ hours
        if (hoursSinceLastOpen >= 24) {
          await this.sendImmediateNotification(
            "We miss you! 😢",
            "Your learning journey awaits. Come back and continue growing!",
            'engagement'
          );
        }

        // Schedule 24-hour check-in notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Where are you? 🤔",
            body: "It's been a day! Don't lose your streak. Continue learning now!",
            sound: true,
            badge: 1,
            data: { type: 'engagement' },
            ...(Platform.OS === 'android' && {
              channelId: 'engagement',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 24 * 60 * 60, // 24 hours
            repeats: false,
          },
        });

        // Schedule 48-hour follow-up
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Your progress is waiting! 📈",
            body: "Don't let your streak end. Jump back in and keep learning!",
            sound: true,
            badge: 1,
            data: { type: 'engagement' },
            ...(Platform.OS === 'android' && {
              channelId: 'engagement',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 48 * 60 * 60, // 48 hours
            repeats: false,
          },
        });

      }
    } catch (error) {
      console.error('Failed to schedule engagement notifications:', error);
    }
  }

  /**
   * Send immediate notification (for testing or special events)
   */
  async sendImmediateNotification(
    title: string, 
    body: string, 
    channelId: string = 'default'
  ) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          badge: 1,
          ...(Platform.OS === 'android' && {
            channelId,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          }),
        },
        trigger: null, // Send immediately
      });


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
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Cancel specific notification by type
   */
  async cancelNotificationsByType(type: string) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.type === type) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error(`Failed to cancel ${type} notifications:`, error);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      notifications.forEach((notif, index) => {
      });
      return notifications;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Setup all notifications (call this on app initialization)
   */
  async setupAllNotifications() {
    try {
      await this.initialize();
      const hasPermission = await this.requestPermissions();
      
      if (hasPermission) {
        await this.scheduleDailyReminder();
        await this.scheduleEngagementNotifications();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Failed to setup notifications:', error);
      return false;
    }
  }

  /**
   * Cleanup listeners when app is destroyed
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export { NotificationService, notificationService };
export default notificationService;
