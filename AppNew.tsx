import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { getCurrentUser } from './src/store/slices/authSlice';
import NotificationService from './src/services/notifications';
import LoadingScreen from './src/components/LoadingScreen';
import livesService from './src/services/lives';
import { RootState } from './src/store';

function AppContent() {
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Initialize app on startup
    const initializeApp = async () => {
      try {
        // Request notification permissions
        await NotificationService.requestPermissions();
        
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

  // Sync lives to Appwrite periodically
  useEffect(() => {
    if (!user?.$id) return;

    const refreshUserLives = async () => {
      try {
        await livesService.refreshLives(
          user.$id,
          user.lives !== undefined && user.lives !== null ? user.lives : 5,
          user.lastLifeRegenTime || new Date().toISOString()
        );
      } catch (error) {
        console.error('Failed to refresh lives:', error);
      }
    };

    // Refresh immediately
    refreshUserLives();

    // Set up interval to check every 30 seconds
    const interval = setInterval(refreshUserLives, 30000);

    return () => clearInterval(interval);
  }, [user?.$id]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}