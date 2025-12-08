import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
    <View style={[styles.container, focused && styles.focusedContainer]}>
      <Image
        source={avatarSource}
        style={styles.icon}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  focusedContainer: {
    backgroundColor: "#DDF4FF",
    borderWidth: 2,
    borderColor: "#FF5C02",
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default ProfileTabIcon;