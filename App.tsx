import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notifications';
import soundService from './src/services/soundService';
import cachedBackendApi from './src/services/cachedBackendApi';
import * as Linking from 'expo-linking';
import { Alert, Platform, Text, ErrorUtils } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Font from 'expo-font';
import LoadingScreen from './src/components/LoadingScreen';
import deviceCapabilities from './src/utils/DeviceCapabilities';
import imageCache from './src/services/ImageCache';

// Global error handler for React Native (prevents crashes)
if (ErrorUtils) {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('Global error handler:', error);
    if (isFatal) {
      console.error('FATAL ERROR:', error);
      // Log to error tracking service here (e.g., Sentry)
      Alert.alert(
        'Unexpected Error',
        'The app encountered an unexpected error. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  });
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // ⚡ CRITICAL: Initialize services in priority order
      // Priority 1: Cache system (data backbone)
      try {
        await cachedBackendApi.initializeCache();
        console.log('✅ Cache system initialized');
      } catch (error) {
        console.error('❌ Cache initialization error:', error);
      }

      // Priority 2: Device capabilities (affects rendering)
      try {
        await deviceCapabilities.initialize();
        console.log('✅ Device capabilities detected');
      } catch (error) {
        console.error('❌ Device capabilities error:', error);
      }

      // Priority 3: Image cache (improves perceived performance)
      try {
        await imageCache.initialize();
        console.log('✅ Image cache initialized');
      } catch (error) {
        console.error('❌ Image cache error:', error);
      }

      // Priority 4: Fonts (critical for UI rendering)
      try {
        await Font.loadAsync({
          'Arial-Rounded-MT-Bold': require('./assets/fonts/ArialRoundedMTBold.ttf'),
        });
        console.log('✅ Fonts loaded');

        // Set default font for all Text components
        const defaultFontFamily = { fontFamily: 'Arial-Rounded-MT-Bold' };
        // @ts-ignore - Setting default props
        Text.defaultProps = Text.defaultProps || {};
        // @ts-ignore - Setting default style
        Text.defaultProps.style = defaultFontFamily;
      } catch (error) {
        console.error('❌ Font loading error:', error);
      } finally {
        setFontsLoaded(true);
      }

      // ⏱️ NON-CRITICAL: Move to background after UI is interactive
      // This allows the app to render faster
      setTimeout(() => {
        // Configure navigation bar for Android (non-critical)
        if (Platform.OS === 'android') {
          NavigationBar.setVisibilityAsync('hidden')
            .then(() => NavigationBar.setBehaviorAsync('inset-swipe'))
            .then(() => NavigationBar.setBackgroundColorAsync('#00000000'))
            .catch(error => console.error('❌ NavigationBar setup error:', error));
        }

        // Initialize notifications (non-critical, background)
        NotificationService.initialize()
          .then(() => NotificationService.requestPermissions())
          .then(hasPermission => {
            if (hasPermission) {
              return Promise.all([
                NotificationService.scheduleDailyReminder(),
                NotificationService.scheduleEngagementNotifications(),
              ]);
            }
            return null;
          })
          .then(() => console.log('✅ Notifications initialized in background'))
          .catch(error => console.error('❌ Notification initialization error:', error));

        // Initialize sound service (non-critical, background)
        soundService.initialize()
          .then(() => console.log('✅ Sound service initialized in background'))
          .catch(error => console.error('❌ Sound service initialization error:', error));
      }, 500); // Delay 500ms to let UI render first

      // Mark app as ready
      setAppReady(true);
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      try {
        soundService.cleanup();
      } catch (e) {
        console.error('Sound cleanup error:', e);
      }
      try {
        NotificationService.cleanup();
      } catch (e) {
        console.error('Notification cleanup error:', e);
      }
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        console.log('Deep link received:', event.url);

        if (event.url.includes('oauth-callback/success')) {
          console.log('OAuth success callback received');
          // The session should already be created by Appwrite
        } else if (event.url.includes('oauth-callback/failure')) {
          console.log('OAuth failure callback received');
          Alert.alert('Authentication Failed', 'Could not sign in with Google');
        }
      } catch (error) {
        console.error('Deep link handling error:', error);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    }).catch((error) => {
      console.error('Error getting initial URL:', error);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Wait for fonts to load before rendering
  if (!fontsLoaded || !appReady) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AppNavigator />
        <StatusBar style="dark" translucent backgroundColor="transparent" />
      </PersistGate>
    </Provider>
  );
}
