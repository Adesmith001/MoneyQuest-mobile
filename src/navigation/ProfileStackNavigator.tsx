import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/main/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangeAvatarScreen from '../screens/profile/ChangeAvatarScreen';

const Stack = createStackNavigator();

const ProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangeAvatar" component={ChangeAvatarScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;