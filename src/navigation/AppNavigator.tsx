import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, ActivityIndicator, View, Text } from 'react-native';
import googleAuthService from '../services/googleAuth';
import { updateUser } from '../store/slices/authSlice';
import { completeAppTour } from '../store/slices/tutorialSlice';

// ⚡ Import ALL screens directly - lazy loading causes white screen on iOS production
import LoadingScreen from '../screens/common/LoadingScreen';
import SplashScreen from '../screens/onboarding/SplashScreen';

// Onboarding
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';
import AgeSelectionScreen from '../screens/onboarding/AgeSelectionScreen';
import LearningLimitScreen from '../screens/onboarding/LearningLimitScreen';
import GoalSelectionScreen from '../screens/onboarding/GoalSelectionScreen';
import ReferralSourceScreen from '../screens/onboarding/ReferralSourceScreen';
import AvatarSelectionScreen from '../screens/onboarding/AvatarSelectionScreen';
import WelcomeSuccessScreen from '../screens/onboarding/WelcomeSuccessScreen';

// Tutorial
import AppTourScreen from '../screens/tutorial/AppTourScreen';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

// Main App
import MainTabNavigator from './MainTabNavigator';

// Other Screens
import PremiumScreen from '../screens/common/PremiumScreen';
import PremiumCodeEntryScreen from '../screens/common/PremiumCodeEntryScreen';
import PaymentPendingScreen from '../screens/common/PaymentPendingScreen';
import SchoolCodeEntryScreen from '../screens/common/SchoolCodeEntryScreen';
import QuestionScreen from '../screens/game/QuestionScreen';
import LevelCompletionScreen from '../screens/game/LevelCompletionScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangeAvatarScreen from '../screens/profile/ChangeAvatarScreen';

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
  PremiumCodeEntry: undefined;
  SchoolCodeEntry: undefined;
  PaymentPending: {
    reference: string;
    planType: 'monthly' | 'annual';
  };

  // Game Screens
  Question: {
    level: number;
    section: number;
    sectionTitle: string;
  };
  LevelCompletion: {
    xpGained: number;
    accuracy: number;
    sectionId?: string;
    passed?: boolean;
    nextLevelId?: string;
  };

  // Other Screens
  Settings: undefined;
  EditProfile: undefined;
  ChangeAvatar: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['moneyquest://', 'https://moneyquest.app'],
  config: {
    screens: {
      ForgotPassword: {
        path: 'reset-password/:userId?/:secret?',
        parse: {
          userId: (userId: string) => userId || '',
          secret: (secret: string) => secret || '',
        },
      },
      Login: 'oauth/:result',
    },
  },
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, showWelcomeScreen, user } = useSelector((state: RootState) => state.auth);
  const { hasCompletedAppTour } = useSelector((state: RootState) => state.tutorial);
  const dispatch = useDispatch<AppDispatch>();
  // Skip onboarding screens - users go directly to login/home
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  // Always show splash screen first when app opens
  const [showSplash, setShowSplash] = useState<boolean>(true);
  // Show app tour after welcome screen for new users
  const [showAppTour, setShowAppTour] = useState<boolean>(false);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Handle OAuth callbacks
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        // Handle OAuth callback
        if (url.includes('oauth/success') || url.includes('oauth/failure')) {
          const result = await googleAuthService.handleOAuthCallback(url);

          if (result.success && result.user) {
            // Check if user needs onboarding
            const needsOnboarding = !result.user.avatar || result.user.age === 0;

            // Update user in Redux store
            dispatch(updateUser(result.user));

            if (needsOnboarding) {
              Alert.alert('Welcome!', 'Let\'s complete your profile to get started.');
              // User will be redirected to onboarding by AppNavigator logic
            } else {
              Alert.alert('Success', 'Successfully signed in with Google!');
            }
          } else {
            Alert.alert('Error', result.error || 'Google sign-in failed');
          }
        }
      } catch (error) {
        console.error('Deep link handling error:', error);
        Alert.alert('Error', 'Failed to process deep link');
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

  // ALWAYS show splash screen first when app opens
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onComplete={handleSplashComplete} />
      </SafeAreaProvider>
    );
  }

  // Show loading screen while auth state is being determined or during login/signup
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  // Show welcome screen after successful signup
  if (showWelcomeScreen && user) {
    return (
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="WelcomeSuccess"
              component={WelcomeSuccessScreen}
              initialParams={{ userName: user.name?.split(' ')[0] || user.name }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Show app tour for first-time users right after welcome screen
  // or when triggered from tutorial hub
  if ((isAuthenticated && !hasCompletedAppTour) || showAppTour) {
    return (
      <SafeAreaProvider>
        <AppTourScreen
          onComplete={() => {
            setShowAppTour(false);
          }}
        />
      </SafeAreaProvider>
    );
  }

  // Show onboarding flow
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding">
              {() => <OnboardingFlow onComplete={handleOnboardingComplete} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Check if OAuth user needs onboarding
  const oauthUserNeedsOnboarding = isAuthenticated && user && (
    user.avatar === 'needs_onboarding' ||
    user.learningLimit === 'needs_onboarding' ||
    user.mainGoal === 'needs_onboarding'
  );

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
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
            ) : oauthUserNeedsOnboarding ? (
              // OAuth user needs onboarding
              <>
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
                  name="PremiumCodeEntry"
                  component={PremiumCodeEntryScreen}
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
                  name="PaymentPending"
                  component={PaymentPendingScreen}
                  options={{
                    headerShown: false,
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="Question"
                  component={QuestionScreen as any}
                  options={{
                    gestureEnabled: false, // Prevent swipe to go back during questions
                  }}
                />
                <Stack.Screen name="LevelCompletion" component={LevelCompletionScreen} />
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
    </SafeAreaProvider>
  );
};

export default AppNavigator;