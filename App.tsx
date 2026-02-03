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
import { Alert, Platform, Text, ErrorUtils, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Font from 'expo-font';
import LoadingScreen from './src/components/LoadingScreen';
import deviceCapabilities from './src/utils/DeviceCapabilities';

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

//Trying new build for IOS white screen fix

// Simple loading component to show during initialization (prevents white screen)
const InitializingScreen = () => (
  <View style={initStyles.container}>
    <ActivityIndicator size="large" color="#FF5C02" />
  </View>
);

const initStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4E8F5',
  },
});

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      console.log('🚀 App initialization started');
      
      // ⚡ CRITICAL: Initialize services in priority order with proper error handling
      // Priority 1: Cache system (data backbone) - with timeout
      try {
        const cachePromise = cachedBackendApi.initializeCache();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cache init timeout')), 5000)
        );
        await Promise.race([cachePromise, timeoutPromise]);
        console.log('✅ Cache system initialized');
      } catch (error) {
        console.error('❌ Cache initialization error (continuing anyway):', error);
        // Don't block app on cache failure
      }

      // Priority 2: Device capabilities (affects rendering) - with timeout
      try {
        const devicePromise = deviceCapabilities.initialize();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Device capabilities timeout')), 3000)
        );
        await Promise.race([devicePromise, timeoutPromise]);
        console.log('✅ Device capabilities detected');
      } catch (error) {
        console.error('❌ Device capabilities error (continuing anyway):', error);
        // Don't block app on device detection failure
      }

      // Priority 3: Fonts (critical for UI rendering) - with timeout
      try {
        const fontPromise = Font.loadAsync({
          'Arial-Rounded-MT-Bold': require('./assets/fonts/ArialRoundedMTBold.ttf'),
        });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Font loading timeout')), 10000)
        );
        await Promise.race([fontPromise, timeoutPromise]);
        console.log('✅ Fonts loaded');

        // Set default font for all Text components
        const defaultFontFamily = { fontFamily: 'Arial-Rounded-MT-Bold' };
        // @ts-ignore - Setting default props
        Text.defaultProps = Text.defaultProps || {};
        // @ts-ignore - Setting default style
        Text.defaultProps.style = defaultFontFamily;
      } catch (error) {
        console.error('❌ Font loading error (using system font):', error);
        // App will work with system fonts
      }
      
      // Always set fonts as loaded (even if they failed)
      if (isMounted) {
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
      if (isMounted) {
        console.log('✅ App initialization complete');
        setAppReady(true);
      }
    };

    initializeApp().catch(error => {
      console.error('❌ Critical app initialization error:', error);
      if (isMounted) {
        setInitError(error?.message || 'Unknown initialization error');
        // Still try to render the app
        setFontsLoaded(true);
        setAppReady(true);
      }
    });

    // Cleanup on unmount
    return () => {
      isMounted = false;
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

  // Show loading screen during initialization (prevents white screen)
  if (!fontsLoaded || !appReady) {
    return <InitializingScreen />;
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
