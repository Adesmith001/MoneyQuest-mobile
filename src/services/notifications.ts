import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analyticsService from './analytics';
import { databases, DB_ID, Query, COLLECTIONS } from './appwrite';
import { ENV } from '../config/environment';
import { subscriptionService } from './subscriptionService';
import {
  LEARNING_REMINDER_SCHEDULE,
  buildDailyReminderTrigger,
  chooseNotificationTemplate,
  getTrialReminderMessage,
  getTrialReminderThresholds,
  type NotificationSelectionContext,
  type NotificationTemplateCategory,
  type NotificationTriggerType,
  type SelectedNotificationTemplate,
} from '../utils/notificationReminderConfig';
import { shouldResetMonthlyXP } from '../utils';

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

const NOTIFICATION_KEYS = {
  LAST_APP_OPEN_TIME: 'lastAppOpenTime',
  LAST_APP_OPEN_DAY: 'lastAppOpenDay',
  USER_ENABLED: '@moneyquest_notifications_enabled',
  SEEN_BROADCAST_IDS: '@moneyquest_seen_broadcast_ids',
  LAST_ERROR_FINGERPRINT: '@moneyquest_last_error_fingerprint',
  LAST_ERROR_TIMESTAMP: '@moneyquest_last_error_timestamp',
  LAST_TEMPLATE_IDS: '@moneyquest_notification_last_template_ids',
  TRIAL_REMINDER_MARKERS: '@moneyquest_trial_reminder_markers',
} as const;

const DAY_END_REMINDER_HOUR = 20;
const ERROR_NOTIFICATION_THROTTLE_MS = 5 * 60 * 1000;

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

type BroadcastDocument = {
  $id: string;
  title?: string;
  message?: string;
  body?: string;
  status?: string;
  priority?: string;
  audience?: string;
  startsAt?: string;
  startAt?: string;
  expiresAt?: string;
  expires_at?: string;
  updatedAt?: string;
  $updatedAt?: string;
  version?: number;
};

class NotificationService {
  private appStateSubscription: any = null;
  private lastAppOpenTime: number = Date.now();
  private notificationListener: any = null;
  private responseListener: any = null;
  private initialized = false;
  private currentUserId: string | null = null;

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async getNotificationPreference(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_KEYS.USER_ENABLED);
      if (stored === null) {
        return true;
      }
      return stored === 'true';
    } catch {
      return true;
    }
  }

  async setNotificationPreference(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_KEYS.USER_ENABLED, enabled ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to persist notification preference:', error);
    }
  }

  async getNotificationToggleState(): Promise<{
    preferenceEnabled: boolean;
    permissionStatus: NotificationPermissionStatus;
    effectiveEnabled: boolean;
  }> {
    const [preferenceEnabled, permissionStatus] = await Promise.all([
      this.getNotificationPreference(),
      this.getPermissionsStatus(),
    ]);

    return {
      preferenceEnabled,
      permissionStatus,
      effectiveEnabled: preferenceEnabled && permissionStatus === 'granted',
    };
  }

  private async shouldScheduleNotifications(): Promise<boolean> {
    const [preferenceEnabled, permissionStatus] = await Promise.all([
      this.getNotificationPreference(),
      this.getPermissionsStatus(),
    ]);
    return preferenceEnabled && permissionStatus === 'granted';
  }

  private async getSeenBroadcastIds(): Promise<Set<string>> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_KEYS.SEEN_BROADCAST_IDS);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed);
    } catch {
      return new Set<string>();
    }
  }

  private async saveSeenBroadcastIds(ids: Set<string>): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NOTIFICATION_KEYS.SEEN_BROADCAST_IDS,
        JSON.stringify(Array.from(ids))
      );
    } catch (error) {
      console.error('Failed to save seen broadcast ids:', error);
    }
  }

  private getBroadcastFingerprint(broadcast: BroadcastDocument): string {
    return `${broadcast.$id}:${String(
      broadcast.version ?? broadcast.updatedAt ?? broadcast.$updatedAt ?? ''
    )}`;
  }

  private isBroadcastActive(broadcast: BroadcastDocument, now: Date): boolean {
    const status = (broadcast.status || 'active').toLowerCase();
    if (status !== 'active') {
      return false;
    }

    const startsAt = broadcast.startsAt || broadcast.startAt;
    if (startsAt) {
      const start = new Date(startsAt);
      if (!Number.isNaN(start.getTime()) && now < start) {
        return false;
      }
    }

    const expiresAt = broadcast.expiresAt || broadcast.expires_at;
    if (expiresAt) {
      const end = new Date(expiresAt);
      if (!Number.isNaN(end.getTime()) && now > end) {
        return false;
      }
    }

    const audience = (broadcast.audience || 'everyone').toLowerCase();
    return audience === 'everyone' || audience === 'all' || audience === 'authenticated';
  }

  private async shouldSendErrorNotification(fingerprint: string): Promise<boolean> {
    try {
      const [lastFingerprint, lastTsStr] = await Promise.all([
        AsyncStorage.getItem(NOTIFICATION_KEYS.LAST_ERROR_FINGERPRINT),
        AsyncStorage.getItem(NOTIFICATION_KEYS.LAST_ERROR_TIMESTAMP),
      ]);

      if (!lastFingerprint || !lastTsStr) {
        return true;
      }

      const lastTs = parseInt(lastTsStr, 10);
      if (!Number.isFinite(lastTs)) {
        return true;
      }

      if (lastFingerprint === fingerprint && Date.now() - lastTs < ERROR_NOTIFICATION_THROTTLE_MS) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  }

  private async markErrorNotificationSent(fingerprint: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(NOTIFICATION_KEYS.LAST_ERROR_FINGERPRINT, fingerprint),
        AsyncStorage.setItem(NOTIFICATION_KEYS.LAST_ERROR_TIMESTAMP, Date.now().toString()),
      ]);
    } catch {
      // Non-fatal best-effort storage
    }
  }

  private async scheduleConfiguredNotifications() {
    await this.scheduleDailyReminder();
    await this.scheduleEngagementNotifications();
    await this.scheduleDayEndInactivityReminder();
    await this.scheduleTrialCountdownNotifications();
  }

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

      // Admin broadcasts channel
      await Notifications.setNotificationChannelAsync('admin-broadcasts', {
        name: 'Admin Broadcasts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      // App alerts channel
      await Notifications.setNotificationChannelAsync('app-alerts', {
        name: 'App Alerts',
        importance: Notifications.AndroidImportance.HIGH,
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
  async getPermissionsStatus(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        return 'granted';
      }
      if (status === 'denied') {
        return 'denied';
      }
      return 'undetermined';
    } catch (error) {
      console.error('Failed to get permissions status:', error);
      return 'undetermined';
    }
  }

  /**
   * Initialize notification listeners and app state tracking
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Set up notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        const data = notification.request.content.data || {};
        const fallbackTriggerType =
          typeof data.triggerType === 'string' && data.triggerType.trim().length > 0
            ? data.triggerType
            : typeof data.type === 'string' && data.type.trim().length > 0
              ? data.type
              : 'notification-without-trigger-label';

        analyticsService.trackEvent('notification_received', {
          type: typeof data.type === 'string' && data.type.trim().length > 0
            ? data.type
            : 'notification-without-trigger-label',
          title: notification.request.content.title || '',
          template_id: typeof data.templateId === 'string' ? data.templateId : '',
          template_category: typeof data.templateCategory === 'string' ? data.templateCategory : '',
          trigger_type: fallbackTriggerType,
          scheduled_hour: typeof data.scheduledHour === 'number' ? data.scheduledHour : undefined,
        }, {
          featureName: 'notifications',
        }).catch(() => {});
      });

      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data || {};
        const fallbackTriggerType =
          typeof data.triggerType === 'string' && data.triggerType.trim().length > 0
            ? data.triggerType
            : typeof data.type === 'string' && data.type.trim().length > 0
              ? data.type
              : 'notification-without-trigger-label';

        analyticsService.trackEvent('notification_opened', {
          type: typeof data.type === 'string' && data.type.trim().length > 0
            ? data.type
            : 'notification-without-trigger-label',
          title: response.notification.request.content.title || '',
          template_id: typeof data.templateId === 'string' ? data.templateId : '',
          template_category: typeof data.templateCategory === 'string' ? data.templateCategory : '',
          trigger_type: fallbackTriggerType,
          scheduled_hour: typeof data.scheduledHour === 'number' ? data.scheduledHour : undefined,
        }, {
          featureName: 'notifications',
        }).catch(() => {});
      });

      // Track last app open time
      await this.updateLastAppOpenTime();

      // Set up app state listener for engagement tracking
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      this.initialized = true;

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

      if (!(await this.shouldScheduleNotifications())) {
        return;
      }

      // Reschedule user-facing notifications when app opens
      await this.scheduleConfiguredNotifications();

      if (this.currentUserId) {
        await this.syncAdminBroadcasts(this.currentUserId);
      }
    }
  };

  /**
   * Update last app open time in storage
   */
  private async updateLastAppOpenTime() {
    try {
      const now = Date.now();
      const dayKey = this.getDateKey(new Date(now));
      await Promise.all([
        AsyncStorage.setItem(NOTIFICATION_KEYS.LAST_APP_OPEN_TIME, now.toString()),
        AsyncStorage.setItem(NOTIFICATION_KEYS.LAST_APP_OPEN_DAY, dayKey),
      ]);
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
      const time = await AsyncStorage.getItem(NOTIFICATION_KEYS.LAST_APP_OPEN_TIME);
      return time ? parseInt(time) : Date.now();
    } catch (error) {
      console.error('Failed to get last app open time:', error);
      return Date.now();
    }
  }

  private async getLastAppOpenDay(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(NOTIFICATION_KEYS.LAST_APP_OPEN_DAY);
    } catch (error) {
      console.error('Failed to get last app open day:', error);
      return null;
    }
  }

  private async getLastTemplateIdByCategory(): Promise<
    Partial<Record<NotificationTemplateCategory, string>>
  > {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_KEYS.LAST_TEMPLATE_IDS);
      if (!raw) {
        return {};
      }

      return JSON.parse(raw) as Partial<Record<NotificationTemplateCategory, string>>;
    } catch (error) {
      console.error('Failed to get notification template history:', error);
      return {};
    }
  }

  private async saveLastTemplateIdByCategory(
    value: Partial<Record<NotificationTemplateCategory, string>>
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_KEYS.LAST_TEMPLATE_IDS, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save notification template history:', error);
    }
  }

  private buildTrialReminderMarker(userId: string, trialEndDate: string, threshold: number): string {
    return `${userId}:${trialEndDate}:${threshold}`;
  }

  private async getTrialReminderMarkers(): Promise<Record<string, boolean>> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_KEYS.TRIAL_REMINDER_MARKERS);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch (error) {
      console.error('Failed to read trial reminder markers:', error);
      return {};
    }
  }

  private async saveTrialReminderMarkers(value: Record<string, boolean>): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_KEYS.TRIAL_REMINDER_MARKERS, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save trial reminder markers:', error);
    }
  }

  private buildNotificationData(
    template: SelectedNotificationTemplate,
    triggerType: NotificationTriggerType,
    scheduledHour?: number
  ) {
    return {
      type: triggerType,
      screen: 'Home',
      scheduledHour,
      triggerType,
      templateId: template.analytics.templateId,
      templateCategory: template.analytics.templateCategory,
    };
  }

  private async getNotificationUserContext(
    lastOpenTime: number
  ): Promise<NotificationSelectionContext> {
    const now = new Date();
    const todayKey = this.getDateKey(now);
    const lastOpenDay = await this.getLastAppOpenDay();

    const baseContext: NotificationSelectionContext = {
      hasOpenedToday: lastOpenDay === todayKey,
      hoursSinceLastOpen: (Date.now() - lastOpenTime) / (1000 * 60 * 60),
      currentStreak: 0,
      monthlyXP: 0,
    };

    if (!this.currentUserId) {
      return baseContext;
    }

    try {
      const [userDoc, streakResponse] = await Promise.all([
        databases.getDocument(DB_ID, COLLECTIONS.USERS, this.currentUserId),
        databases.listDocuments(DB_ID, COLLECTIONS.STREAKS, [
          Query.equal('userId', this.currentUserId),
          Query.limit(1),
        ]).catch(() => null),
      ]);

      const streakDoc = streakResponse?.documents?.[0] as any;

      return {
        ...baseContext,
        currentStreak: Number(streakDoc?.currentStreak ?? (userDoc as any)?.streak ?? 0) || 0,
        monthlyXP: shouldResetMonthlyXP((userDoc as any)?.lastMonthlyReset, now)
          ? 0
          : Number((userDoc as any)?.monthlyXP || 0),
      };
    } catch (error) {
      console.error('Failed to get notification user context:', error);
      return baseContext;
    }
  }

  async enableNotificationsFromSettings(): Promise<boolean> {
    await this.setNotificationPreference(true);

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      await this.setNotificationPreference(false);
      await this.cancelAllNotifications();
      return false;
    }

    await this.scheduleConfiguredNotifications();
    return true;
  }

  async disableNotificationsFromSettings(): Promise<void> {
    await this.setNotificationPreference(false);
    await this.cancelAllNotifications();
  }

  /**
   * Schedule daily learning reminder notifications (cross-platform)
   * Each notification fires at its specific time: 10am, 2pm, 7pm
   */
  async scheduleDailyReminder() {
    try {
      if (!(await this.shouldScheduleNotifications())) {
        return;
      }

      // Cancel existing learning reminders
      await this.cancelNotificationsByType('learning-reminder');

      // Peak hours to send notifications
      const peakHours = LEARNING_REMINDER_SCHEDULE;
      const lastOpenTime = await this.getLastAppOpenTime();
      const context = await this.getNotificationUserContext(lastOpenTime);
      const lastTemplateIdByCategory = await this.getLastTemplateIdByCategory();

      // Schedule notification for each peak hour as a repeating daily reminder
      for (const reminder of peakHours) {
        const template = chooseNotificationTemplate({
          triggerType: 'learning-reminder',
          scheduledHour: reminder.hour,
          context,
          lastTemplateIdByCategory,
        });

        lastTemplateIdByCategory[template.category] = template.id;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: template.title,
            body: template.body,
            sound: true,
            badge: 1,
            data: this.buildNotificationData(template, 'learning-reminder', reminder.hour),
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
            ...buildDailyReminderTrigger(reminder),
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
          },
        });

      }

      await this.saveLastTemplateIdByCategory(lastTemplateIdByCategory);
    } catch (error) {
      console.error('❌ Failed to schedule daily reminders:', error);
    }
  }

  /**
   * Schedule a notification for when lives are full
   */
  async scheduleLifeFullNotification(millisecondsUntilFull: number) {
    try {
      if (!(await this.shouldScheduleNotifications())) {
        return;
      }

      // Cancel existing life-full notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.content.data?.type === 'lives-full') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Only schedule if there's a meaningful wait time (at least 1 minute)
      if (millisecondsUntilFull < 60 * 1000) {
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
          seconds: Math.max(Math.ceil(millisecondsUntilFull / 1000), 60), // At least 60 seconds
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
      if (!(await this.shouldScheduleNotifications())) {
        return;
      }

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
        const context = await this.getNotificationUserContext(lastOpen);
        const lastTemplateIdByCategory = await this.getLastTemplateIdByCategory();
        // Immediate notification if been away for 24+ hours
        if (hoursSinceLastOpen >= 24) {
          const immediateTemplate = chooseNotificationTemplate({
            triggerType: 'engagement',
            context,
            lastTemplateIdByCategory,
          });

          lastTemplateIdByCategory[immediateTemplate.category] = immediateTemplate.id;

          await this.sendImmediateNotification(
            "We miss you! 😢",
            immediateTemplate.body,
            'engagement',
            this.buildNotificationData(immediateTemplate, 'engagement')
          );
        }

        // Schedule 24-hour check-in notification
        const firstFollowUpTemplate = chooseNotificationTemplate({
          triggerType: 'engagement',
          context,
          lastTemplateIdByCategory,
        });

        lastTemplateIdByCategory[firstFollowUpTemplate.category] = firstFollowUpTemplate.id;

        await Notifications.scheduleNotificationAsync({
          content: {
            // title: "Where are you? 🤔",
            title: firstFollowUpTemplate.title,
            body: firstFollowUpTemplate.body,
            sound: true,
            badge: 1,
            data: {
              ...this.buildNotificationData(firstFollowUpTemplate, 'engagement'),
              followUpHours: 24,
            },
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
        const secondFollowUpTemplate = chooseNotificationTemplate({
          triggerType: 'engagement',
          context,
          lastTemplateIdByCategory,
        });

        lastTemplateIdByCategory[secondFollowUpTemplate.category] = secondFollowUpTemplate.id;

        await Notifications.scheduleNotificationAsync({
          content: {
            // title: "Your progress is waiting! 📈",
            title: secondFollowUpTemplate.title,
            body: secondFollowUpTemplate.body,
            sound: true,
            badge: 1,
            data: {
              ...this.buildNotificationData(secondFollowUpTemplate, 'engagement'),
              followUpHours: 48,
            },
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
    channelId: string = 'default',
    data: Record<string, any> = {},
    respectPreference: boolean = true
  ) {
    try {
      if (respectPreference && !(await this.shouldScheduleNotifications())) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          badge: 1,
          data,
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

  async sendSectionActiveNotification(sectionTitle: string): Promise<void> {
    const title = 'New Section Unlocked!';
    const body = sectionTitle
      ? `${sectionTitle} is now active. Keep your momentum going.`
      : 'A new section is now active. Keep your momentum going.';
    await this.sendImmediateNotification(
      title,
      body,
      'default',
      { type: 'section-active', sectionTitle }
    );
  }

  async sendSectionCreatedNotification(sectionTitle: string): Promise<void> {
    const title = 'New Content Available';
    const body = sectionTitle
      ? `A new section was added: ${sectionTitle}. Tap to refresh and explore.`
      : 'A new section was added. Tap to refresh and explore.';
    await this.sendImmediateNotification(
      title,
      body,
      'admin-broadcasts',
      { type: 'section-created', sectionTitle }
    );
  }

  async sendAppErrorNotification(errorMessage: string): Promise<void> {
    const fingerprint = errorMessage
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .slice(0, 140);

    if (!(await this.shouldSendErrorNotification(fingerprint))) {
      return;
    }

    await this.sendImmediateNotification(
      'MoneyQuest Alert',
      'Something is wrong in the app right now. Please try again shortly.',
      'app-alerts',
      { type: 'app-error' }
    );

    await this.markErrorNotificationSent(fingerprint);
  }

  async scheduleTrialCountdownNotifications() {
    try {
      if (!(await this.shouldScheduleNotifications()) || !this.currentUserId) {
        return;
      }

      await this.cancelNotificationsByType('trial-countdown');

      const subscription =
        (await subscriptionService.getLocalSubscription(this.currentUserId)) ??
        (await subscriptionService.getUserSubscription(this.currentUserId));

      if (!subscription || subscription.status !== 'trial' || subscriptionService.isTrialExpired(subscription)) {
        return;
      }

      const now = new Date();
      const trialEnd = new Date(subscription.trialEndDate);
      const markers = await this.getTrialReminderMarkers();

      for (const threshold of getTrialReminderThresholds()) {
        const markerKey = this.buildTrialReminderMarker(
          this.currentUserId,
          subscription.trialEndDate,
          threshold
        );

        if (markers[markerKey]) {
          continue;
        }

        const message = getTrialReminderMessage(threshold);
        const triggerDate = new Date(trialEnd);
        triggerDate.setDate(triggerDate.getDate() - threshold);

        if (threshold === subscriptionService.getRemainingTrialDays(subscription)) {
          await this.sendImmediateNotification(
            message.title,
            message.body,
            'engagement',
            {
              type: 'trial-countdown',
              threshold,
              trialEndDate: subscription.trialEndDate,
            }
          );
          markers[markerKey] = true;
          continue;
        }

        if (triggerDate <= now) {
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            sound: true,
            badge: 1,
            data: {
              type: 'trial-countdown',
              threshold,
              trialEndDate: subscription.trialEndDate,
            },
            ...(Platform.OS === 'android' && {
              channelId: 'engagement',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }

      await this.saveTrialReminderMarkers(markers);
    } catch (error) {
      console.error('Failed to schedule trial countdown notifications:', error);
    }
  }

  async scheduleDayEndInactivityReminder() {
    try {
      if (!(await this.shouldScheduleNotifications())) {
        return;
      }

      await this.cancelNotificationsByType('day-end-inactive');

      const now = new Date();
      const lastOpenTime = await this.getLastAppOpenTime();
      const context = await this.getNotificationUserContext(lastOpenTime);
      const lastTemplateIdByCategory = await this.getLastTemplateIdByCategory();
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(DAY_END_REMINDER_HOUR, 0, 0, 0);
      const template = chooseNotificationTemplate({
        triggerType: 'day-end-inactive',
        scheduledHour: DAY_END_REMINDER_HOUR,
        context,
        lastTemplateIdByCategory,
      });

      lastTemplateIdByCategory[template.category] = template.id;

      await Notifications.scheduleNotificationAsync({
        content: {
          // title: 'Your day is almost over ⏰',
          title: template.title,
          body: template.body,
          sound: true,
          badge: 1,
          data: {
            ...this.buildNotificationData(template, 'day-end-inactive', DAY_END_REMINDER_HOUR),
            scheduledForDay: this.getDateKey(targetDate),
          },
          ...(Platform.OS === 'android' && {
            channelId: 'engagement',
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });

      await this.saveLastTemplateIdByCategory(lastTemplateIdByCategory);
    } catch (error) {
      console.error('Failed to schedule day-end inactivity reminder:', error);
    }
  }

  async syncAdminBroadcasts(userId?: string): Promise<void> {
    if (!userId) {
      return;
    }

    const collectionId = ENV.APPWRITE_BROADCASTS_COLLECTION_ID;
    if (!collectionId) {
      return;
    }

    try {
      if (!(await this.shouldScheduleNotifications())) {
        return;
      }

      const seenBroadcasts = await this.getSeenBroadcastIds();
      const now = new Date();

      const response = await databases.listDocuments(DB_ID, collectionId, [
        Query.orderDesc('createdAt'),
        Query.limit(25),
      ]);

      const broadcasts = response.documents as unknown as BroadcastDocument[];
      let hasUpdates = false;

      for (const broadcast of broadcasts) {
        if (!this.isBroadcastActive(broadcast, now)) {
          continue;
        }

        const fingerprint = this.getBroadcastFingerprint(broadcast);
        if (seenBroadcasts.has(fingerprint)) {
          continue;
        }

        const title = broadcast.title || 'MoneyQuest Update';
        const body = broadcast.message || broadcast.body || 'A new announcement is available.';
        const channelId = broadcast.priority === 'high' ? 'app-alerts' : 'admin-broadcasts';

        await this.sendImmediateNotification(
          title,
          body,
          channelId,
          {
            type: 'admin-broadcast',
            broadcastId: broadcast.$id,
            priority: broadcast.priority || 'normal',
          }
        );

        seenBroadcasts.add(fingerprint);
        hasUpdates = true;
      }

      if (hasUpdates) {
        await this.saveSeenBroadcastIds(seenBroadcasts);
      }
    } catch (error) {
      console.error('Failed to sync admin broadcasts:', error);
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

      const isEnabledByUser = await this.getNotificationPreference();
      if (!isEnabledByUser) {
        await this.cancelAllNotifications();
        return false;
      }

      const hasPermission = await this.requestPermissions();
      
      if (hasPermission) {
        await this.scheduleConfiguredNotifications();
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
    this.initialized = false;
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export { NotificationService, notificationService };
export default notificationService;
