import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import * as Linking from 'expo-linking';
import { Platform, ErrorUtils, View, Text, StyleSheet, LogBox, AppState, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import ErrorAlertHost from './src/components/ErrorAlertHost';
import ErrorNotice from './src/components/ErrorNotice';
import { showErrorAlert } from './src/services/errorAlerts';
import { getSupportCode } from './src/utils/supportCode';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import LoadingScreen from './src/components/LoadingScreen';
import AppFrame from './src/components/AppFrame';
import notificationService from './src/services/notifications';
import soundService from './src/services/soundService';
import revenueCatService from './src/services/revenueCatService';
import analyticsService from './src/services/analytics';
import appUpdateService from './src/services/appUpdateService';
import Constants from 'expo-constants';
import { buildErrorDiagnostics } from './src/utils/errorDiagnostics';
import { captureIncident, flushIncidents, recordBreadcrumb } from './src/services/errorMonitor';

const RELEASE_ID = Constants.expoConfig?.version || 'unknown';

// Ignore specific warnings that don't affect functionality
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

// Global error handler for React Native (prevents crashes)
if (ErrorUtils) {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('Global error handler:', error);
    void captureIncident(error, {
      flow: 'startup', stage: 'global_error', action: 'unhandled_error',
      severity: isFatal ? 'fatal' : 'error',
    });
    void analyticsService.trackEvent(isFatal ? 'fatal_error' : 'app_error', {
      stage: 'global_error',
      fatal: isFatal,
      support_code: getSupportCode(),
      ...buildErrorDiagnostics(error, '', RELEASE_ID),
    }).catch(() => {});
    notificationService.sendAppErrorNotification(error?.message || 'Unknown app error').catch(() => {});
    if (isFatal) {
      console.error('FATAL ERROR:', error);
      showErrorAlert(
        'Unexpected Error',
        'The app encountered an unexpected error. Please restart the app.',
      );
    }
  });
}

// Error boundary fallback component
const ErrorFallback = () => (
  <View style={errorStyles.container}>
    <Text style={errorStyles.title}>Something went wrong</Text>
    <ErrorNotice
      title="Something went wrong"
      message={`MoneyQuest could not finish loading. Please restart the app. Support code: ${getSupportCode()}.`}
    />
    {Platform.OS === 'web' && (
      <TouchableOpacity accessibilityRole="button" onPress={() => window.location.reload()} style={{ backgroundColor: '#FF5722', padding: 14, borderRadius: 8, marginTop: 20 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reload app</Text>
      </TouchableOpacity>
    )}
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
    void captureIncident(error, {
      flow: 'startup', stage: 'render_error', action: 'render_failed', severity: 'fatal',
    });
    void analyticsService.trackEvent('app_error', {
      stage: 'render_error',
      support_code: getSupportCode(),
      ...buildErrorDiagnostics(error, errorInfo.componentStack || '', RELEASE_ID),
    }).catch(() => {});
    notificationService.sendAppErrorNotification(error?.message || 'Rendering error').catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

function AppContent() {
  useEffect(() => {
    recordBreadcrumb('app_started');
    void flushIncidents();
    if (Platform.OS !== 'web') return;
    const onError = (event: ErrorEvent) => {
      void captureIncident(event.error || event.message, {
        flow: 'startup', stage: 'window_error', action: 'unhandled_error', severity: 'error',
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      void captureIncident(event.reason, {
        flow: 'startup', stage: 'unhandled_rejection', action: 'unhandled_error', severity: 'error',
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('online', flushIncidents);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('online', flushIncidents);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      (window as Window & { __moneyquestAppMounted?: () => void }).__moneyquestAppMounted?.();
    }
  }, []);

  useEffect(() => {
    const optionalTimer = setTimeout(() => {
      void analyticsService.initialize()
        .then(() => analyticsService.startSession('app_open'))
        .catch(() => {});
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      }
      soundService.initialize().catch(() => {});
      try { revenueCatService.configure(); } catch {}
      Font.loadAsync({
        ...Ionicons.font,
        'Arial-Rounded-MT-Bold': require('./assets/fonts/ArialRoundedMTBold.ttf'),
      }).catch(error => console.warn('Font loading failed:', error));
      notificationService.setupAllNotifications().catch(() => {});
      appUpdateService.checkForStoreUpdate(true).catch(() => {});
    }, Platform.OS === 'web' ? 1500 : 0);
    return () => clearTimeout(optionalTimer);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      analyticsService.handleAppStateChange(nextState).catch(() => {});
      if (nextState === 'active') {
        void flushIncidents();
        appUpdateService.checkForStoreUpdate().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
      analyticsService.endSession('shutdown').catch(() => {});
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        if (event.url.includes('oauth-callback/success')) {
          // The session should already be created by Appwrite
        } else if (event.url.includes('oauth-callback/failure')) {
          showErrorAlert('Authentication Failed', 'Could not sign in with Google');
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

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AppFrame>
          <AppNavigator />
          <StatusBar style="dark" />
        </AppFrame>
      </PersistGate>
    </Provider>
  );
}

// Main App component with Error Boundary
export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
      <ErrorAlertHost />
    </SafeAreaProvider>
  );
}
