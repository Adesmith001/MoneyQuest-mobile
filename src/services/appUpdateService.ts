import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check-expo';

const LAST_PROMPTED_VERSION_KEY_PREFIX = '@moneyquest_last_prompted_store_version';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

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
      const updateInfo = await VersionCheck.needUpdate();
      const latestVersion = updateInfo?.latestVersion || '';
      const storeName = Platform.OS === 'ios' ? 'App Store' : 'Play Store';
      const promptKey = `${LAST_PROMPTED_VERSION_KEY_PREFIX}_${Platform.OS}`;

      if (!updateInfo?.isNeeded || !updateInfo.storeUrl) {
        return;
      }

      const lastPromptedVersion = await AsyncStorage.getItem(promptKey);
      if (!force && latestVersion && lastPromptedVersion === latestVersion) {
        return;
      }

      Alert.alert(
        'Update Available',
        `A newer version of MoneyQuest is available on the ${storeName}. Please update for the best experience.`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Update',
            onPress: () => {
              Linking.openURL(updateInfo.storeUrl).catch(() => {});
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