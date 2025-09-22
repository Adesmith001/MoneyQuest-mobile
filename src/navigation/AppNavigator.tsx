import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Onboarding
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

// Main App
import MainTabNavigator from './MainTabNavigator';

// Other Screens
import QuestionScreen from '../screens/game/QuestionScreen';
import LevelCompletionScreen from '../screens/game/LevelCompletionScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';

export type RootStackParamList = {
  // Onboarding
  Onboarding: undefined;
  
  // Auth Stack
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ProfileSetup: undefined;
  
  // Main App
  MainApp: undefined;
  
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
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Show loading while auth state is being determined
  if (isLoading) {
    return null; // Could add a loading component here
  }

  // Show onboarding flow
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <NavigationContainer>
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
          </>
        ) : (
          // Authenticated Stack
          <>
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;