import AuthService from '../services/auth';
import ErrorNotice from '../components/ErrorNotice';
import { showErrorAlert } from '../services/errorAlerts';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, ActivityIndicator, View, Text, Platform, TouchableOpacity } from 'react-native';
import { checkAuthStatus, handleOAuthCallback, logout, signOut } from '../store/slices/authSlice';
import revenueCatService from '../services/revenueCatService';
import analyticsService from '../services/analytics';
import { authFailureMessage } from '../services/authFailure';
import { getAppTourMode } from '../utils/tutorialBehavior';
import { getSupportCode } from '../utils/supportCode';
import { recordBreadcrumb } from '../services/errorMonitor';

// ⚡ Import ALL screens directly - lazy loading causes white screen on iOS production
import LoadingScreen from '../screens/common/LoadingScreen';
import SplashScreen from '../screens/onboarding/SplashScreen';

// Onboarding
import {
  OnboardingFlow, AgeSelectionScreen, LearningLimitScreen, GoalSelectionScreen,
  ReferralSourceScreen, AvatarSelectionScreen, WelcomeSuccessScreen, AppTourScreen,
} from './onboardingScreens';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

import {
  MainTabNavigator, PremiumScreen, SchoolCodeEntryScreen, QuestionScreen,
  CelebrationFlow, DailyQuestScreen, AchievementUnlockScreen,
  BadgeCatalogueScreen, EditProfileScreen, ChangeAvatarScreen,
} from './mainScreens';
import { BadgeCategory } from '../types/gamification';

// Simple fallback loading component (no longer using Suspense)
const SimpleFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <ActivityIndicator size="large" color="#FF5C02" />
    <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
  </View>
);

export type RootStackParamList = {
  // Onboarding
  Onboarding: undefined;
  AgeSelection: {
    registrationData: {
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      phoneNumber: string;
      password: string;
    };
  };
  LearningLimitSelection: {
    registrationData: any;
    age: number;
  };
  LearningLimit: {
    registrationData: any;
    age: number;
  };
  GoalSelection: {
    registrationData: any;
    age: number;
    learningLimit: string;
  };
  ReferralSource: {
    registrationData: any;
    age: number;
    learningLimit: string;
    mainGoal: string;
  };
  AvatarSelection: {
    registrationData: any;
    age: number;
    learningLimit: string;
    mainGoal: string;
    referralSource: string;
  };
  WelcomeSuccess: {
    userName: string;
  };

  // Auth Stack
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: {
    userId?: string;
    secret?: string;
  };
  ProfileSetup: undefined;

  // Main App
  MainApp: undefined;
  MainTabs: undefined;

  // Subscription
  Premium: undefined;
  SchoolCodeEntry: undefined;

  // Game Screens
  Question: {
    level: number;
    section: number;
    levelId?: string;
    sectionId?: string;
    levelTitle?: string;
    sectionTitle: string;
    useMultilevel?: boolean;
  };
  LevelCompletion: {
    xpGained: number;
    accuracy: number;
    sectionId?: string;
    passed?: boolean;
    nextLevelId?: string;
    completedLevelsCount?: number;
  };
  DailyQuest: {
    questPointEarned?: number;
    questTitle?: string;
    quests?: any[];
  };
  AchievementUnlock: {
    badgeCode: string;
    badgeName: string;
    subtitle?: string;
    progressValue?: number;
    targetValue?: number;
    progressLabel?: string;
  };
  BadgeCatalogue: { category?: BadgeCategory } | undefined;

  // Other Screens
  Settings: undefined;
  EditProfile: undefined;
  ChangeAvatar: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const linking: LinkingOptions<any> = {
  // Include the current web origin so a browser refresh restores the active
  // screen instead of dropping the user back to Home (feels like a new session).
  prefixes: [
    'moneyquest://',
    'https://moneyquest.app',
    Platform.OS === 'web' ? Linking.createURL('/') : '',
  ].filter(Boolean),
  config: {
    screens: {
      // Auth
      Welcome: 'welcome',
      Login: 'login',
      Register: 'register',
      ForgotPassword: {
        path: 'reset-password',
        parse: {
          userId: (userId: string) => userId || '',
          secret: (secret: string) => secret || '',
        },
      },
      ProfileSetup: 'profile-setup',
      WelcomeSuccess: 'welcome-success',
      // Main app tabs
      MainApp: {
        screens: {
          Home: 'home',
          Leaderboard: 'leaderboard',
          Streak: 'streak',
          ProfileStack: {
            screens: {
              ProfileMain: 'profile',
              EditProfile: 'edit-profile',
              ChangeAvatar: 'change-avatar',
              TutorialHub: 'tutorial-hub',
            },
          },
        },
      },
      MainTabs: 'main',
      // Game + subscription
      Question: 'question',
      LevelCompletion: 'level-complete',
      Premium: 'premium',
      SchoolCodeEntry: 'school-code',
    },
  },
};

function getActiveRouteName(state: any): string | null {
  if (!state || !state.routes?.length) {
    return null;
  }

  const route = state.routes[state.index ?? 0];
  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name || null;
}

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isCheckingSession, isLoggingOut, error, showWelcomeScreen, user, sessionCheckError } = useSelector((state: RootState) => state.auth);
  const { accountId: tutorialAccountId, hasCompletedAppTour, latestFeatureTourVersionSeen } = useSelector(
    (state: RootState) => state.tutorial
  );
  const dispatch = useDispatch<AppDispatch>();
  const startupTracked = useRef(false);
  // Skip onboarding screens - users go directly to login/home
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  // Always show splash screen first when app opens
  const [showSplash, setShowSplash] = useState<boolean>(Platform.OS !== 'web');
  // Show app tour after welcome screen for new users
  const [showAppTour, setShowAppTour] = useState<boolean>(false);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('userId') && params.get('secret')) return;
    }
    dispatch(checkAuthStatus());
  }, [dispatch]);

  useEffect(() => {
    if (Platform.OS === 'web' && !isCheckingSession && !sessionCheckError && !startupTracked.current) {
      startupTracked.current = true;
      void analyticsService.trackEvent('feature_used', {
        stage: 'first_usable_screen',
        duration_ms: Math.round(performance.now()),
        support_code: getSupportCode(),
      }).catch(() => {});
    }
  }, [isCheckingSession, sessionCheckError]);

  // Re-link RevenueCat whenever the signed-in user changes (covers app restart
  // from persisted Redux state, all sign-in paths, and Google OAuth callback).
  useEffect(() => {
    if (!isCheckingSession && !isLoading && !sessionCheckError && user?.$id) {
      revenueCatService.identifyUser(user.$id).catch(() => {});
    }
    if (!isLoading && !sessionCheckError) analyticsService.identifyUser(user?.$id || null);
  }, [user?.$id, isLoading, isCheckingSession, sessionCheckError]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !user?.$id) return;
    const accountId = user.$id;
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'moneyquest_active_user_id' && event.newValue !== accountId) {
        AuthService.clearLocalAuthCache();
        dispatch(logout());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch, user?.$id]);

  const [retrySeconds, setRetrySeconds] = useState(0);
  useEffect(() => {
    const retryAt = sessionCheckError?.retryAt ?? 0;
    const update = () => setRetrySeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sessionCheckError?.retryAt]);

  const [sessionWait, setSessionWait] = useState(false);
  useEffect(() => {
    setSessionWait(false);
    if (!isCheckingSession) return;
    const timer = setTimeout(() => setSessionWait(true), 3000);
    return () => clearTimeout(timer);
  }, [isCheckingSession]);

  // Handle OAuth callbacks
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        // Handle OAuth callback
        if (url.includes('oauth/success') || url.includes('oauth/failure')) {
          const result = await dispatch(handleOAuthCallback(url));

          if (handleOAuthCallback.fulfilled.match(result)) {
            const oauthUser = result.payload;
            // Check if user needs onboarding
            const needsOnboarding = !oauthUser.avatar || oauthUser.age === 0;

            if (needsOnboarding) {
              Alert.alert('Welcome!', 'Let\'s complete your profile to get started.');
              // User will be redirected to onboarding by AppNavigator logic
            } else {
              Alert.alert('Success', 'Successfully signed in with Google!');
            }
          } else {
            showErrorAlert('Google sign-in problem', String(result.payload || 'Google sign-in failed'));
          }
        }
      } catch (error) {
        console.error('Deep link handling error:', error);
        showErrorAlert('Sign-in link problem', 'Failed to process deep link');
      }
    };

    // Listen for deep link events
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
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
  }, [dispatch]);

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
    const query = new URLSearchParams(window.location.search);
    const userId = query.get('userId');
    const secret = query.get('secret');
    if (userId && secret) {
      const returnToSignIn = async () => {
        await AuthService.signOut(user?.$id).catch(() => {});
        window.location.replace('/login');
      };
      return <SafeAreaProvider>
        <ForgotPasswordScreen route={{ params: { userId, secret } }}
          navigation={{ replace: returnToSignIn, navigate: returnToSignIn }} />
      </SafeAreaProvider>;
    }
  }

  // ALWAYS show splash screen first when app opens
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onComplete={handleSplashComplete} />
      </SafeAreaProvider>
    );
  }

  // Show loading screen while auth state is being determined or during login/signup
  if (isCheckingSession) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
        {sessionWait && <Text accessibilityLiveRegion="polite" style={{ textAlign: 'center', padding: 12 }}>Checking your session is taking longer than expected.</Text>}
      </SafeAreaProvider>
    );
  }

  if (sessionCheckError) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>Session problem</Text>
          <ErrorNotice
            title="Session problem"
            message={`${error || authFailureMessage(sessionCheckError)} Support code: ${sessionCheckError.supportCode}.`}
            occurrence={error ? undefined : sessionCheckError}
          />
          {isLoggingOut && <ActivityIndicator color="#FF5722" />}
          {sessionCheckError.kind !== 'expired' && <TouchableOpacity accessibilityRole="button" disabled={isLoggingOut || retrySeconds > 0} onPress={() => dispatch(checkAuthStatus())} style={{ backgroundColor: '#FF5722', padding: 14, borderRadius: 8, opacity: isLoggingOut ? 0.5 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{retrySeconds ? "Try again in " + retrySeconds + "s" : "Retry session check"}</Text>
          </TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" disabled={isLoggingOut} onPress={() => sessionCheckError.kind === 'expired' ? dispatch(logout()) : dispatch(signOut())} style={{ padding: 14, marginTop: 12 }}>
            <Text style={{ color: '#333', fontWeight: 'bold' }}>{isLoggingOut ? 'Signing out…' : sessionCheckError.kind === 'expired' ? 'Sign in again' : 'Sign out and log in'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  // Show welcome screen after successful signup
  if (showWelcomeScreen && user) {
    return (
      <SafeAreaProvider>
        <React.Suspense fallback={<SimpleFallback />}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="WelcomeSuccess"
              component={WelcomeSuccessScreen}
              initialParams={{ userName: user.name?.split(' ')[0] || user.name }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        </React.Suspense>
      </SafeAreaProvider>
    );
  }

  const profileIncomplete = isAuthenticated && user && (
    !user.age || !user.avatar || user.avatar === 'needs_onboarding' ||
    !user.learningLimit || user.learningLimit === 'needs_onboarding' ||
    !user.mainGoal || user.mainGoal === 'needs_onboarding'
  );
  if (profileIncomplete) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  if (isAuthenticated && user?.$id && tutorialAccountId !== user.$id) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  const appTourMode = getAppTourMode({
    isAuthenticated,
    hasCompletedAppTour,
    latestFeatureTourVersionSeen,
  });

  // Show the full tour to new users and a concise feature tour once after updates.
  if (appTourMode || showAppTour) {
    return (
      <SafeAreaProvider>
        <React.Suspense fallback={<SimpleFallback />}>
        <AppTourScreen
          mode={appTourMode ?? 'first-run'}
          onComplete={() => {
            setShowAppTour(false);
          }}
        />
        </React.Suspense>
      </SafeAreaProvider>
    );
  }

  // Show onboarding flow
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <React.Suspense fallback={<SimpleFallback />}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding">
              {() => <OnboardingFlow onComplete={handleOnboardingComplete} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
        </React.Suspense>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <React.Suspense fallback={<SimpleFallback />}>
      <NavigationContainer
        linking={linking}
        onReady={() => {
          recordBreadcrumb('screen_opened', isAuthenticated ? 'MainApp' : 'Welcome');
          analyticsService.identifyUser(user?.$id || null);
          void analyticsService.trackScreenView(
            isAuthenticated ? 'MainApp' : 'Welcome',
          ).catch(() => {});
        }}
        onStateChange={(state) => {
          const routeName = getActiveRouteName(state);
          if (routeName) {
            recordBreadcrumb('screen_opened', routeName);
            if (['AgeSelection', 'LearningLimitSelection', 'LearningLimit', 'GoalSelection',
              'ReferralSource', 'AvatarSelection', 'WelcomeSuccess'].includes(routeName)) {
              recordBreadcrumb('onboarding_step_started', routeName);
            }
            analyticsService.identifyUser(user?.$id || null);
            void analyticsService.trackScreenView(routeName).catch(() => {});
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // Auth Stack
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                {/* Onboarding screens for new user registration */}
                <Stack.Screen name="AgeSelection" component={AgeSelectionScreen} />
                <Stack.Screen name="LearningLimitSelection" component={LearningLimitScreen} />
                <Stack.Screen name="LearningLimit" component={LearningLimitScreen} />
                <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
                <Stack.Screen name="ReferralSource" component={ReferralSourceScreen} />
                <Stack.Screen name="AvatarSelection" component={AvatarSelectionScreen} />
                <Stack.Screen name="WelcomeSuccess" component={WelcomeSuccessScreen} />
              </>
            ) : (
              // Authenticated Stack
              <>
                <Stack.Screen name="MainApp" component={MainTabNavigator} />
                <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                <Stack.Screen
                  name="Premium"
                  component={PremiumScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="SchoolCodeEntry"
                  component={SchoolCodeEntryScreen}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="Question"
                  component={QuestionScreen as any}
                  options={{
                    gestureEnabled: false, // Prevent swipe to go back during questions
                  }}
                />
                <Stack.Screen name="LevelCompletion" component={CelebrationFlow} />
                <Stack.Screen name="DailyQuest" component={DailyQuestScreen} />
                <Stack.Screen name="AchievementUnlock" component={AchievementUnlockScreen} />
                <Stack.Screen name="BadgeCatalogue" component={BadgeCatalogueScreen} />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="ChangeAvatar"
                  component={ChangeAvatarScreen}
                  options={{
                    headerShown: false,
                  }}
                />
              </>
            )}
          </Stack.Navigator>
      </NavigationContainer>
      </React.Suspense>
    </SafeAreaProvider>
  );
};

export default AppNavigator;
