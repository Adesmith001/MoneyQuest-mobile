import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

/**
 * Constrains the phone-shaped UI to a centered phone-width frame on web so it
 * doesn't stretch across a desktop viewport. No-op on native — screens keep
 * their normal full-screen behavior.
 */
const AppFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.webOuter}>
      <View style={styles.webFrame}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: '#E8E8ED',
    alignItems: 'center',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 32px rgba(0, 0, 0, 0.18)',
  },
});

export default AppFrame;
