import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notifications';
import soundService from './src/services/soundService';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize notifications
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          console.log('✅ Notifications initialized');
        }

        // Initialize sound service
        await soundService.initialize();
        console.log('✅ Sound service initialized');
      } catch (error) {
        console.error('❌ App initialization error:', error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      soundService.cleanup();
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

  return (
    <Provider store={store}>
      <AppNavigator />
      <StatusBar style="auto" />
    </Provider>
  );
}
