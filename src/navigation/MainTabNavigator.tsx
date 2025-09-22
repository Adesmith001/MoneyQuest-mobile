import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

// Tab Screens
import HomeScreen from '../screens/main/HomeScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import ProfileTabIcon from './ProfileTabIcon'; 

export type MainTabParamList = {
  Home: undefined;
  Treasure: undefined;
  Leaderboard: undefined;
  Streak: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const renderTabIcon = (routeName: string, focused: boolean) => {
    let emoji: string;
    
    switch (routeName) {
      case 'Home':
        emoji = '🏠';
        break;
      case 'Treasure':
        emoji = '💰';
        break;
      case 'Leaderboard':
        emoji = '👑';
        break;
      case 'Streak':
        emoji = '🔥';
        break;
      case 'Profile':
        emoji = '👩🏾';
        break;
      default:
        emoji = '❓';
    }

    return (
      <View style={[
        styles.tabIconContainer,
        focused && styles.tabIconContainerFocused
      ]}>
        <Text style={[
          styles.tabIcon,
          focused && styles.tabIconFocused
        ]}>
          {emoji}
        </Text>
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => renderTabIcon(route.name, focused),
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarShowLabel: false,
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
      />
      {/* <Tab.Screen 
        name="Treasure" 
        component={LeaderboardScreen} 
      /> */}
      <Tab.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
      />
      <Tab.Screen 
        name="Streak" 
        component={LeaderboardScreen} 
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
          // You can remove tabBarLabel if you only want the icon
          tabBarLabel: () => null, 
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconContainerFocused: {
    backgroundColor: '#FF6B35',
  },
  tabIcon: {
    fontSize: 24,
  },
  tabIconFocused: {
    fontSize: 26,
  },
});

export default MainTabNavigator;