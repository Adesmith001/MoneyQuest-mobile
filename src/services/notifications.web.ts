import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Web variant of the notification service.
 *
 * Browsers cannot schedule local notifications and this app does not yet have a
 * web-push (service worker + VAPID) pipeline, so every native notification
 * feature is a graceful no-op on web. The singleton exposes the same API
 * surface as the native implementation so call sites need no platform checks.
 *
 * Metro resolves this file for web bundles (notifications.web.ts wins over
 * notifications.ts on `web`); native bundles keep the full implementation.
 */

const NOTIFICATION_KEYS = {
  USER_ENABLED: '@moneyquest_notifications_enabled',
} as const;

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

class NotificationService {
  private currentUserId: string | null = null;

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  async initialize(): Promise<void> {
    // No-op on web.
  }

  async setupAllNotifications(): Promise<boolean> {
    // No local notifications on web. Persist the user's stored preference but
    // never request permission or schedule anything.
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async getPermissionsStatus(): Promise<NotificationPermissionStatus> {
    return 'undetermined';
  }

  async getNotificationToggleState(): Promise<{
    preferenceEnabled: boolean;
    permissionStatus: NotificationPermissionStatus;
    effectiveEnabled: boolean;
  }> {
    const preferenceEnabled = await this.getNotificationPreference();
    return {
      preferenceEnabled,
      permissionStatus: 'undetermined',
      effectiveEnabled: false,
    };
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
      await AsyncStorage.setItem(
        NOTIFICATION_KEYS.USER_ENABLED,
        enabled ? 'true' : 'false'
      );
    } catch (error) {
      console.error('Failed to persist notification preference:', error);
    }
  }

  async enableNotificationsFromSettings(): Promise<boolean> {
    return false;
  }

  async disableNotificationsFromSettings(): Promise<void> {
    await this.cancelAllNotifications();
  }

  async scheduleDailyReminder(): Promise<void> {}

  async scheduleLifeFullNotification(_millisecondsUntilFull: number): Promise<void> {}

  async scheduleEngagementNotifications(): Promise<void> {}

  async scheduleDayEndInactivityReminder(): Promise<void> {}

  async scheduleTrialCountdownNotifications(): Promise<void> {}

  async sendImmediateNotification(
    _title: string,
    _body: string,
    _channelId?: string,
    _data?: Record<string, any>,
    _respectPreference?: boolean
  ): Promise<void> {}

  async sendSectionActiveNotification(_sectionTitle: string): Promise<void> {}

  async sendSectionCreatedNotification(_sectionTitle: string): Promise<void> {}

  async sendAppErrorNotification(_errorMessage: string): Promise<void> {}

  async syncAdminBroadcasts(_userId?: string): Promise<void> {}

  async cancelAllNotifications(): Promise<void> {}

  async cancelNotificationsByType(_type: string): Promise<void> {}

  async getScheduledNotifications(): Promise<any[]> {
    return [];
  }

  cleanup(): void {}
}

const notificationService = new NotificationService();
export { NotificationService, notificationService };
export default notificationService;
