import { AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { ID } from 'react-native-appwrite';
import { COLLECTIONS, DB_ID, databases } from './appwrite';

type AnalyticsEventName =
  | 'app_open'
  | 'session_start'
  | 'session_end'
  | 'screen_view'
  | 'sign_up_started'
  | 'sign_up_completed'
  | 'sign_up_failed'
  | 'login_succeeded'
  | 'login_failed'
  | 'oauth_login_succeeded'
  | 'oauth_login_failed'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'question_flagged'
  | 'feature_used'
  | 'paywall_viewed'
  | 'trial_started'
  | 'checkout_started'
  | 'subscription_activated'
  | 'subscription_restore_succeeded'
  | 'subscription_cancelled'
  | 'premium_code_redeemed'
  | 'notification_permission_updated'
  | 'notification_received'
  | 'notification_opened'
  | 'review_prompt_requested'
  | 'support_link_opened'
  | 'bug_report_opened'
  | 'app_error'
  | 'fatal_error';

type TrackableProperties = Record<string, string | number | boolean | null | undefined>;

interface TrackEventOptions {
  screenName?: string;
  featureName?: string;
  valueNumber?: number;
  valueText?: string;
}

const ANALYTICS_ANON_KEY = '@moneyquest_analytics_anonymous_id';

function getAgeGroup(age?: number): string | undefined {
  if (!age || Number.isNaN(age)) {
    return undefined;
  }

  if (age <= 12) return '5-12';
  if (age <= 17) return '13-17';
  if (age <= 25) return '18-25';
  return '26+';
}

function cleanProperties(properties: TrackableProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  );
}

class AnalyticsService {
  private anonymousId: string | null = null;
  private currentUserId: string | null = null;
  private currentSessionId: string | null = null;
  private currentSessionStartedAt: number | null = null;
  private currentScreenName: string | null = null;
  private initialized = false;
  private disabled = false;
  private lastTrackedScreenKey: string | null = null;

  private get appVersion() {
    return (
      Constants.expoConfig?.version ||
      Constants.nativeAppVersion ||
      'unknown'
    );
  }

  private get appBuild() {
    return Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode?.toString() ||
      Constants.nativeBuildVersion ||
      'unknown';
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const storedAnonymousId = await AsyncStorage.getItem(ANALYTICS_ANON_KEY);
      if (storedAnonymousId) {
        this.anonymousId = storedAnonymousId;
      } else {
        this.anonymousId = Crypto.randomUUID();
        await AsyncStorage.setItem(ANALYTICS_ANON_KEY, this.anonymousId);
      }
    } catch (error) {
      this.anonymousId = this.anonymousId || Crypto.randomUUID();
    } finally {
      this.initialized = true;
    }
  }

  identifyUser(userId?: string | null) {
    this.currentUserId = userId || null;
  }

  async startSession(reason: 'app_open' | 'app_resume' = 'app_open') {
    await this.initialize();

    if (this.currentSessionId && this.currentSessionStartedAt) {
      return;
    }

    this.currentSessionId = ID.unique();
    this.currentSessionStartedAt = Date.now();

    if (reason === 'app_open') {
      await this.trackEvent('app_open', { trigger: reason });
    }

    await this.trackEvent('session_start', { trigger: reason });
  }

  async endSession(reason: 'background' | 'inactive' | 'logout' | 'shutdown' = 'background') {
    if (!this.currentSessionId || !this.currentSessionStartedAt) {
      return;
    }

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - this.currentSessionStartedAt) / 1000),
    );

    await this.trackEvent(
      'session_end',
      {
        reason,
        duration_seconds: durationSeconds,
      },
      {
        valueNumber: durationSeconds,
      },
    );

    this.currentSessionId = null;
    this.currentSessionStartedAt = null;
  }

  async handleAppStateChange(nextState: AppStateStatus) {
    if (nextState === 'active') {
      await this.startSession('app_resume');
      return;
    }

    if (nextState === 'background' || nextState === 'inactive') {
      await this.endSession(nextState);
    }
  }

  async trackScreenView(screenName: string, properties: TrackableProperties = {}) {
    const screenKey = `${screenName}:${JSON.stringify(cleanProperties(properties))}`;
    if (this.lastTrackedScreenKey === screenKey) {
      this.currentScreenName = screenName;
      return;
    }

    this.currentScreenName = screenName;
    this.lastTrackedScreenKey = screenKey;
    await this.trackEvent('screen_view', properties, { screenName });
  }

  async trackFeatureUsage(featureName: string, properties: TrackableProperties = {}) {
    await this.trackEvent('feature_used', properties, {
      featureName,
      screenName: this.currentScreenName || undefined,
    });
  }

  async trackOnboardingStep(
    stepName: string,
    properties: TrackableProperties = {},
  ) {
    await this.trackEvent(
      'onboarding_step_completed',
      { step_name: stepName, ...properties },
      { featureName: stepName, screenName: stepName },
    );
  }

  async trackLessonStarted(
    levelId: string,
    sectionId: string,
    properties: TrackableProperties = {},
  ) {
    await this.trackEvent(
      'lesson_started',
      { level_id: levelId, section_id: sectionId, ...properties },
      {
        featureName: 'lesson',
        screenName: this.currentScreenName || 'Question',
      },
    );
  }

  async trackLessonCompleted(
    levelId: string,
    sectionId: string,
    properties: TrackableProperties = {},
  ) {
    await this.trackEvent(
      'lesson_completed',
      { level_id: levelId, section_id: sectionId, ...properties },
      {
        featureName: 'lesson',
        screenName: this.currentScreenName || 'LevelCompletion',
      },
    );
  }

  async trackError(
    eventName: 'app_error' | 'fatal_error',
    error: unknown,
    properties: TrackableProperties = {},
  ) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

    await this.trackEvent(
      eventName,
      {
        error_message: message,
        ...properties,
      },
      {
        featureName: 'error',
        screenName: this.currentScreenName || undefined,
        valueText: message.slice(0, 200),
      },
    );
  }

  async trackEvent(
    eventName: AnalyticsEventName,
    properties: TrackableProperties = {},
    options: TrackEventOptions = {},
  ) {
    await this.initialize();

    if (this.disabled || !DB_ID || !COLLECTIONS.ANALYTICS_EVENTS) {
      return;
    }

    try {
      const occurredAt = new Date().toISOString();
      const sanitizedProperties = cleanProperties(properties);
      const record = {
        eventName,
        userId: this.currentUserId || 'anonymous',
        anonymousId: this.anonymousId || 'unknown',
        sessionId: this.currentSessionId || 'no-session',
        occurredAt,
        eventDate: occurredAt.slice(0, 10),
        eventMonth: occurredAt.slice(0, 7),
        screenName: options.screenName || this.currentScreenName || 'unknown',
        featureName: options.featureName || '',
        platform: Platform.OS,
        appVersion: this.appVersion,
        appBuild: this.appBuild,
        deviceType: Device.deviceType ? String(Device.deviceType) : 'unknown',
        deviceModel: Device.modelName || 'unknown',
        osName: Device.osName || Platform.OS,
        osVersion: Device.osVersion || 'unknown',
        valueNumber: options.valueNumber ?? null,
        valueText: options.valueText || '',
        propertiesJson: JSON.stringify(sanitizedProperties),
      };

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.ANALYTICS_EVENTS,
        ID.unique(),
        record,
      );
    } catch (error: any) {
      const code = error?.code;
      if (code === 404 || code === 401 || code === 403) {
        this.disabled = true;
      }
      console.warn(`Analytics event skipped: ${eventName}`, error?.message || error);
    }
  }

  buildUserProperties(user?: {
    $id?: string;
    age?: number;
    referralSource?: string;
    learningLimit?: string;
    avatar?: string;
  } | null): TrackableProperties {
    return {
      age_group: getAgeGroup(user?.age),
      referral_source: user?.referralSource || null,
      learning_limit: user?.learningLimit || null,
      avatar_id: user?.avatar || null,
    };
  }
}

const analyticsService = new AnalyticsService();

export { AnalyticsService, getAgeGroup };
export default analyticsService;
