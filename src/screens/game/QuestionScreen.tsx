import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';

interface Props {
  navigation: any;
  route: {
    params: {
      level: number;
      section: number;
      questionIndex: number;
    };
  };
}

const QuestionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { level, section, questionIndex } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Question Screen</Text>
        <Text style={styles.subtitle}>
          Level {level}, Section {section}, Question {questionIndex + 1}
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

export default QuestionScreen;