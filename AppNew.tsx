import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { getCurrentUser } from './src/store/slices/authSlice';
import NotificationService from './src/services/notifications';
import LoadingScreen from './src/components/LoadingScreen';

export default function App() {
  useEffect(() => {
    // Initialize app on startup
    const initializeApp = async () => {
      try {
        // Request notification permissions
        await NotificationService.requestPermissions();
        
        // Setup notification handlers
        NotificationService.setupNotificationResponseHandler();
        
        // Check for existing user session
        store.dispatch(getCurrentUser());
        
        // Schedule daily reminders
        await NotificationService.scheduleDailyReminder();
        
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}