import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notifications';
import { COLORS, FONT_SIZES, SPACING } from './src/constants';

// Loading component for PersistGate
const LoadingComponent = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>Loading MoneyQuest...</Text>
  </View>
);

export default function App() {
  useEffect(() => {
    // Initialize app services on startup
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing MoneyQuest app...');
        
        // Request notification permissions
        const permissionGranted = await NotificationService.requestPermissions();
        
        if (permissionGranted) {
          console.log('✅ Notification permissions granted');
          
          // Setup notification handlers
          NotificationService.setupNotificationResponseHandler();
          
          // Schedule daily reminders
          await NotificationService.scheduleDailyReminder();
          
          console.log('✅ Notifications setup complete');
        } else {
          console.log('⚠️ Notification permissions denied');
        }
        
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.error('❌ App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingComponent />} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});
