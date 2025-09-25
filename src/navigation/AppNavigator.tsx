import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import * as Linking from 'expo-linking';

// Onboarding
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';
import AgeSelectionScreen from '../screens/onboarding/AgeSelectionScreen';
import LearningLimitScreen from '../screens/onboarding/LearningLimitScreen';
import GoalSelectionScreen from '../screens/onboarding/GoalSelectionScreen';
import ReferralSourceScreen from '../screens/onboarding/ReferralSourceScreen';
import AvatarSelectionScreen from '../screens/onboarding/AvatarSelectionScreen';
import WelcomeSuccessScreen from '../screens/onboarding/WelcomeSuccessScreen';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

// Main App
import MainTabNavigator from './MainTabNavigator';

// Other Screens
import LoadingScreen from '../screens/common/LoadingScreen'; // Import the new loading screen
import QuestionScreen from '../screens/game/QuestionScreen';
import LevelCompletionScreen from '../screens/game/LevelCompletionScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangeAvatarScreen from '../screens/profile/ChangeAvatarScreen'; // Import the new screen

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
  
  // Game Screens
  Question: {
    level: number;
    section: number;
    questionIndex: number;
  };
  LevelCompletion: {
    level: number;
    xpEarned: number;
    performance: number;
  };
  
  // Other Screens
  Settings: undefined;
  EditProfile: undefined;
  ChangeAvatar: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['moneyquest://'],
  config: {
    screens: {
      ForgotPassword: {
        path: 'reset-password/:userId/:secret',
        parse: {
          userId: (userId: string) => userId,
          secret: (secret: string) => secret,
        },
      },
    },
  },
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, showWelcomeScreen, user } = useSelector((state: RootState) => state.auth);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Show loading screen while auth state is being determined or during login/signup
  if (isLoading) {
    return <LoadingScreen />; // Display the loading screen instead of null
  }

  // Show welcome screen after successful signup
  if (showWelcomeScreen && user) {
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="WelcomeSuccess" 
            component={WelcomeSuccessScreen}
            initialParams={{ userName: user.name?.split(' ')[0] || user.name }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Show onboarding flow
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <NavigationContainer
      linking={linking}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            
            {/* Onboarding Screens */}
            <Stack.Screen name="AgeSelection" component={AgeSelectionScreen} />
            <Stack.Screen name="LearningLimitSelection" component={LearningLimitScreen} />
            <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
            <Stack.Screen name="ReferralSource" component={ReferralSourceScreen} />
            <Stack.Screen name="AvatarSelection" component={AvatarSelectionScreen} />
          </>
        ) : (
          // Authenticated Stack
          <>
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen 
              name="Question" 
              component={QuestionScreen}
              options={{
                gestureEnabled: false, // Prevent swipe to go back during questions
              }}
            />
            <Stack.Screen name="LevelCompletion" component={LevelCompletionScreen} />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
              }}
            />
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
  );
};

export default AppNavigator;