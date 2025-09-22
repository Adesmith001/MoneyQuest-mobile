import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getAvatarById } from '../utils/avatarUtils';

interface Props {
  focused: boolean;
}

const ProfileTabIcon: React.FC<Props> = ({ focused }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const avatarSource = getAvatarById(user?.avatar);

  return (
    <Image
      source={avatarSource}
      style={[styles.icon, focused && styles.focused]}
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: '#FF5722', // Use your app's primary color
    borderWidth: 2,
  },
});

export default ProfileTabIcon;