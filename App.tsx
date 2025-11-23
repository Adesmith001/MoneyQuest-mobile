import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notifications';
import soundService from './src/services/soundService';

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

  return (
    <Provider store={store}>
      <AppNavigator />
      <StatusBar style="auto" />
    </Provider>
  );
}
