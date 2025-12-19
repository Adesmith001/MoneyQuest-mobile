import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notifications';
import soundService from './src/services/soundService';
import * as Linking from 'expo-linking';
import { Alert, Platform, Text, ErrorUtils } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Font from 'expo-font';

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
      // Load custom fonts (critical - block rendering until done)
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
        // Continue without custom fonts to prevent crash
      } finally {
        // Always allow app to render, even if fonts fail
        setFontsLoaded(true);
      }

      // Configure navigation bar for Android (non-critical)
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('inset-swipe');
          await NavigationBar.setBackgroundColorAsync('#00000000');
        } catch (error) {
          console.error('❌ NavigationBar setup error:', error);
        }
      }

      // Initialize notifications (non-critical)
      try {
        await NotificationService.initialize();
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          await NotificationService.scheduleDailyReminder();
          await NotificationService.scheduleEngagementNotifications();
          console.log('✅ Notifications initialized and scheduled');
        } else {
          console.log('⚠️ Notification permissions not granted');
        }
      } catch (error) {
        console.error('❌ Notification initialization error:', error);
        // Continue without notifications
      }

      // Initialize sound service (non-critical)
      try {
        await soundService.initialize();
        console.log('✅ Sound service initialized');
      } catch (error) {
        console.error('❌ Sound service initialization error:', error);
        // Continue without sound effects
      }

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
      <AppNavigator />
      <StatusBar style="dark" translucent backgroundColor="transparent" />
    </Provider>
  );
}
