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
import { Alert, Platform, ErrorUtils } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Font from 'expo-font';
import LoadingScreen from './src/components/LoadingScreen';

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
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 App initializing...');

        // Priority 1: Cache service (critical for data fetching)
        try {
          await cachedBackendApi.initializeCache();
          console.log('✅ Cache service initialized');
        } catch (error) {
          console.error('❌ Cache service error:', error);
          // Continue anyway - cache is not critical
        }

        // Priority 2: Fonts (critical for UI rendering) - with timeout
        try {
          const fontPromise = Font.loadAsync({
            'Arial-Rounded-MT-Bold': require('./assets/fonts/ArialRoundedMTBold.ttf'),
          });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Font loading timeout')), 10000)
          );
          await Promise.race([fontPromise, timeoutPromise]);
          console.log('✅ Fonts loaded');
        } catch (error) {
          console.error('❌ Font loading error:', error);
          // Continue anyway - use system fonts
        }

        // Priority 3: Sound service (non-blocking) - Skip on iOS for now
        if (Platform.OS !== 'ios') {
          try {
            await soundService.initialize();
            console.log('✅ Sound service initialized');
          } catch (error) {
            console.error('❌ Sound service error (non-fatal):', error);
          }
        } else {
          console.log('⚠️ Sound service skipped on iOS');
        }

        // Priority 4: Notification service (non-blocking) - Skip on iOS for now
        if (Platform.OS !== 'ios') {
          try {
            await NotificationService.initialize();
            console.log('✅ Notification service initialized');
          } catch (error) {
            console.error('❌ Notification service error (non-fatal):', error);
          }
        } else {
          console.log('⚠️ Notification service skipped on iOS');
        }

        // Priority 5: Android navigation bar (Android only)
        if (Platform.OS === 'android') {
          try {
            await NavigationBar.setBackgroundColorAsync('#FFFFFF');
            await NavigationBar.setButtonStyleAsync('dark');
            console.log('✅ Navigation bar configured (Android)');
          } catch (error) {
            console.error('❌ Navigation bar error:', error);
          }
        }

        console.log('✅ App initialization complete');
        setIsAppReady(true);
      } catch (error) {
        console.error('❌ Critical initialization error:', error);
        // Still set app ready to avoid infinite loading
        setIsAppReady(true);
      }
    }

    prepare();
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

  // Wait for app to be ready before rendering
  if (!isAppReady) {
    return <LoadingScreen />;
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
