import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';

interface Props {
  navigation: any;
  route: {
    params: {
      level: number;
      xpEarned: number;
      performance: number;
    };
  };
}

const LevelCompletionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { level, xpEarned, performance } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Level {level} Complete!</Text>
        <Text style={styles.subtitle}>
          You earned {xpEarned} XP with {performance}% accuracy
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default LevelCompletionScreen;