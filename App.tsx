import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import * as Linking from 'expo-linking';
import { Alert, Platform, ErrorUtils, View, Text, StyleSheet, LogBox } from 'react-native';
import * as Font from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import LoadingScreen from './src/components/LoadingScreen';
import notificationService from './src/services/notifications';
import soundService from './src/services/soundService';

// Ignore specific warnings that don't affect functionality
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

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

// Error boundary fallback component
const ErrorFallback = ({ error }: { error: Error }) => (
  <View style={errorStyles.container}>
    <Text style={errorStyles.title}>Something went wrong</Text>
    <Text style={errorStyles.message}>{error?.message || 'Unknown error'}</Text>
    <Text style={errorStyles.hint}>Please restart the app</Text>
  </View>
);

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    fontSize: 12,
    color: '#999',
  },
});

// Error Boundary Component to catch rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🔴 ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ErrorBoundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

function AppContent() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    async function prepare() {
      try {

        if (Platform.OS === 'android') {
          try {
            await NavigationBar.setVisibilityAsync('hidden');
            await NavigationBar.setBehaviorAsync('overlay-swipe');
          } catch (navErr) {
            console.warn('⚠️ Could not hide navigation bar:', navErr);
          }
        }

        // Only load fonts - skip other services that might cause issues on iOS
        // Initialize sound service (non-blocking)
        soundService.initialize().catch(err => {
          console.warn('⚠️ Sound service init failed (non-blocking):', err);
        });

        try {
          const fontPromise = Font.loadAsync({
            'Arial-Rounded-MT-Bold': require('./assets/fonts/ArialRoundedMTBold.ttf'),
          });
          // 5 second timeout for fonts
          const timeoutPromise = new Promise<void>((resolve) => 
            setTimeout(() => {
              resolve();
            }, 5000)
          );
          await Promise.race([fontPromise, timeoutPromise]);
        } catch (error) {
          console.error('❌ Font loading error:', error);
          // Continue anyway - use system fonts
        }

      } catch (error) {
        console.error('❌ Critical initialization error:', error);
        setInitError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        // ALWAYS set app ready after 3 seconds max
        setIsAppReady(true);

        // Setup notifications after app is ready (non-blocking)
        notificationService.setupAllNotifications().catch(err => {
          console.warn('⚠️ Notification setup failed (non-blocking):', err);
        });
      }
    }

    prepare();
    
    // Failsafe: Force app ready after 5 seconds no matter what
    const failsafe = setTimeout(() => {
      if (!isAppReady) {
        setIsAppReady(true);
      }
    }, 5000);
    
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        if (event.url.includes('oauth-callback/success')) {
          // The session should already be created by Appwrite
        } else if (event.url.includes('oauth-callback/failure')) {
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

  // Show error screen if initialization failed critically
  if (initError) {
    return <ErrorFallback error={initError} />;
  }

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

// Main App component with Error Boundary
export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
