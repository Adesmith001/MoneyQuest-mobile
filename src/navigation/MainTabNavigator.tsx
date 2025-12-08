import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Tab Screens
import HomeScreen from "../screens/main/HomeScreen";
import DailyStreakScreen from "../screens/main/DailyStreakScreen";
import LeaderboardScreen from "../screens/main/LeaderboardScreen";
import ProfileStackNavigator from "./ProfileStackNavigator";
import ProfileTabIcon from "./ProfileTabIcon";

const Tab = createBottomTabNavigator();

const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#6C757D",
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.focusedIconContainer]}>
              <Image
                source={require("../../assets/homeIcon.png")}
                style={styles.tabIcon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      {/* <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
        }}
      /> */}
      <Tab.Screen
        name="Streak"
        component={DailyStreakScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.focusedIconContainer]}>
              <Image
                source={require("../../assets/streakIcon.png")}
                style={styles.tabIcon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    elevation: 5,
    paddingTop: 10,
    height: 70,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  focusedIconContainer: {
    backgroundColor: "#DDF4FF",
    borderWidth: 2,
    borderColor: "#FF5C02",
  },
  tabIcon: {
    width: 32,
    height: 32,
  },
});

export default MainTabNavigator;
