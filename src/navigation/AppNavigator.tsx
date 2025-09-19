import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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

export type RootStackParamList = {
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
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return null; // Loading handled by PersistGate
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;