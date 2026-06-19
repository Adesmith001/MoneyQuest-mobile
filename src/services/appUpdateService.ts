import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Alert, Linking, NativeEventEmitter, NativeModules, Platform } from 'react-native';

const LAST_PROMPTED_VERSION_KEY_PREFIX = '@moneyquest_last_prompted_store_version';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const IOS_BUNDLE_ID = 'com.expo.moneyquest';
const IN_APP_UPDATE_EVENT_NAME = 'inAppUpdateStatus';

type AndroidInAppUpdateStatus =
  | 'accepted'
  | 'canceled'
  | 'downloaded'
  | 'downloading'
  | 'failed'
  | 'installed'
  | 'installing'
  | 'pending'
  | 'started'
  | 'unknown'
  | 'up_to_date';

type InAppUpdateModule = {
  checkForFlexibleUpdate: () => Promise<AndroidInAppUpdateStatus>;
  completeFlexibleUpdate: () => Promise<void>;
};

type InAppUpdateEventPayload = {
  status?: AndroidInAppUpdateStatus;
};

const compareVersions = (left: string, right: string): number => {
  const leftParts = left.split('.').map(part => Number.parseInt(part, 10) || 0);
  const rightParts = right.split('.').map(part => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
};

const getIosStoreUpdate = async (): Promise<{
  latestVersion: string;
  storeUrl: string;
} | null> => {
  const response = await fetch(
    `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(IOS_BUNDLE_ID)}`
  );
  const data = await response.json();
  const result = data?.results?.[0];

  if (!result?.version || !result?.trackViewUrl) {
    return null;
  }

  return {
    latestVersion: result.version,
    storeUrl: result.trackViewUrl,
  };
};

class AppUpdateService {
  private isChecking = false;
  private lastCheckAt = 0;
  private androidUpdateEmitter: NativeEventEmitter | null = null;
  private androidUpdateSubscription: { remove: () => void } | null = null;
  private hasWarnedAboutMissingAndroidModule = false;
  private isRestartPromptVisible = false;

  private getAndroidInAppUpdateModule(): InAppUpdateModule | null {
    if (Platform.OS !== 'android') {
      return null;
    }

    return (NativeModules.InAppUpdateModule as InAppUpdateModule | undefined) || null;
  }

  private ensureAndroidUpdateListener() {
    if (Platform.OS !== 'android' || this.androidUpdateSubscription) {
      return;
    }

    const nativeModule = this.getAndroidInAppUpdateModule();
    if (!nativeModule) {
      if (!this.hasWarnedAboutMissingAndroidModule) {
        console.warn('InAppUpdateModule is unavailable on Android. Native flexible updates are disabled.');
        this.hasWarnedAboutMissingAndroidModule = true;
      }
      return;
    }

    this.androidUpdateEmitter = new NativeEventEmitter(NativeModules.InAppUpdateModule);
    this.androidUpdateSubscription = this.androidUpdateEmitter.addListener(
      IN_APP_UPDATE_EVENT_NAME,
      (payload: InAppUpdateEventPayload) => {
        this.handleAndroidUpdateStatus(payload?.status || 'unknown');
      }
    );
  }

  private handleAndroidUpdateStatus(status: AndroidInAppUpdateStatus) {
    if (status === 'downloaded') {
      this.promptAndroidRestartToInstall();
    }
  }

  private promptAndroidRestartToInstall() {
    if (this.isRestartPromptVisible) {
      return;
    }

    const nativeModule = this.getAndroidInAppUpdateModule();
    if (!nativeModule) {
      return;
    }

    this.isRestartPromptVisible = true;

    Alert.alert(
      'Update Ready',
      'The latest MoneyQuest update has been downloaded. Restart the app now to finish installing it.',
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            this.isRestartPromptVisible = false;
          },
        },
        {
          text: 'Restart now',
          onPress: () => {
            this.isRestartPromptVisible = false;
            nativeModule.completeFlexibleUpdate().catch(error => {
              console.warn('Flexible update completion failed:', error);
            });
          },
        },
      ],
      { cancelable: false }
    );
  }

  async checkForStoreUpdate(force: boolean = false): Promise<void> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return;
    }

    if (this.isChecking) {
      return;
    }

    if (!force && Date.now() - this.lastCheckAt < CHECK_INTERVAL_MS) {
      return;
    }

    this.isChecking = true;
    this.lastCheckAt = Date.now();

    try {
      if (Platform.OS === 'android') {
        this.ensureAndroidUpdateListener();
        const nativeModule = this.getAndroidInAppUpdateModule();

        if (!nativeModule) {
          return;
        }

        const status = await nativeModule.checkForFlexibleUpdate();
        this.handleAndroidUpdateStatus(status);
        return;
      }

      const currentVersion = Application.nativeApplicationVersion || '';
      const storeName = 'App Store';
      const promptKey = `${LAST_PROMPTED_VERSION_KEY_PREFIX}_${Platform.OS}`;
      const updateInfo = await getIosStoreUpdate();
      const latestVersion = updateInfo?.latestVersion || '';
      const storeUrl = updateInfo?.storeUrl || '';

      if (
        !currentVersion ||
        !latestVersion ||
        !storeUrl ||
        compareVersions(latestVersion, currentVersion) <= 0
      ) {
        return;
      }

      const lastPromptedVersion = await AsyncStorage.getItem(promptKey);
      if (!force && latestVersion && lastPromptedVersion === latestVersion) {
        return;
      }

      Alert.alert(
        'Update Available',
        latestVersion
          ? `Version ${latestVersion} is available on the ${storeName}. You are currently on ${currentVersion}. Please update for the best experience.`
          : `A newer version of MoneyQuest is available on the ${storeName}. Please update for the best experience.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Open App Store',
            onPress: () => {
              Linking.openURL(storeUrl).catch(() => {});
            },
          },
        ],
        { cancelable: true }
      );

      if (latestVersion) {
        await AsyncStorage.setItem(promptKey, latestVersion);
      }
    } catch (error) {
      console.warn('Store update check failed:', error);
    } finally {
      this.isChecking = false;
    }
  }
}

const appUpdateService = new AppUpdateService();
export default appUpdateService;
