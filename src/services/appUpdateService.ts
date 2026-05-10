import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Alert, Linking, Platform } from 'react-native';

const LAST_PROMPTED_VERSION_KEY_PREFIX = '@moneyquest_last_prompted_store_version';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const IOS_BUNDLE_ID = 'com.expo.moneyquest';
const ANDROID_PACKAGE_NAME = 'com.expo.moneyquest';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;

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
      const currentVersion = Application.nativeApplicationVersion || '';
      const storeName = Platform.OS === 'ios' ? 'App Store' : 'Play Store';
      const promptKey = `${LAST_PROMPTED_VERSION_KEY_PREFIX}_${Platform.OS}`;
      const updateInfo = Platform.OS === 'ios'
        ? await getIosStoreUpdate()
        : null;
      const latestVersion = updateInfo?.latestVersion || '';
      const storeUrl = updateInfo?.storeUrl || (Platform.OS === 'android' ? PLAY_STORE_URL : '');

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
            text: Platform.OS === 'ios' ? 'Open App Store' : 'Open Play Store',
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
