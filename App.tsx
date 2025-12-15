import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notifications';
import soundService from './src/services/soundService';
import * as Linking from 'expo-linking';
import { Alert, Platform, Text } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Font from 'expo-font';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load custom fonts
        await Font.loadAsync({
          'Arial-Rounded-MT-Bold': require('./assets/fonts/ArialRoundedMTBold.ttf'),
        });
        setFontsLoaded(true);
        console.log('✅ Fonts loaded');

        // Set default font for all Text components
        const defaultFontFamily = { fontFamily: 'Arial-Rounded-MT-Bold' };
        // @ts-ignore
        Text.defaultProps = Text.defaultProps || {};
        // @ts-ignore
        Text.defaultProps.style = defaultFontFamily;

        // Configure navigation bar for Android
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('inset-swipe');
          await NavigationBar.setBackgroundColorAsync('#00000000');
        }

        // Initialize notifications
        await NotificationService.initialize();
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          // Schedule daily learning reminders
          await NotificationService.scheduleDailyReminder();
          // Schedule engagement notifications for inactivity tracking
          await NotificationService.scheduleEngagementNotifications();
          console.log('✅ Notifications initialized and scheduled');
        } else {
          console.log('⚠️ Notification permissions not granted');
        }

        // Initialize sound service
        await soundService.initialize();
        console.log('✅ Sound service initialized');
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setFontsLoaded(true); // Continue even if font loading fails
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      soundService.cleanup();
      NotificationService.cleanup();
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      
      if (event.url.includes('oauth-callback/success')) {
        console.log('OAuth success callback received');
        // The session should already be created by Appwrite
      } else if (event.url.includes('oauth-callback/failure')) {
        console.log('OAuth failure callback received');
        Alert.alert('Authentication Failed', 'Could not sign in with Google');
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Wait for fonts to load
  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <AppNavigator />
      <StatusBar style="dark" translucent backgroundColor="transparent" />
    </Provider>
  );
}
