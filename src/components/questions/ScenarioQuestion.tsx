import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScenarioQuestion as ScenarioQuestionType } from '../../types';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';

interface Props {
  question: ScenarioQuestionType;
  selectedAnswer: string;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
  onPlayAudio?: () => void;
  isPlayingAudio?: boolean;
}

const ScenarioQuestion: React.FC<Props> = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  disabled = false,
  onPlayAudio,
  isPlayingAudio = false,
}) => {
  const optionsArray = [
    { key: 'A', value: question.options.A },
    { key: 'B', value: question.options.B },
    { key: 'C', value: question.options.C },
    { key: 'D', value: question.options.D },
  ];

  return (
    <View style={styles.container}>
      {/* Scenario Context */}
      <View style={styles.scenarioBox}>
        <Text style={styles.scenarioLabel}>Scenario</Text>
        <Text style={styles.scenarioText}>{question.scenario_context}</Text>
      </View>

      {/* Question with Audio */}
      <View style={styles.questionWithAudioContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
        {onPlayAudio && (
          <TouchableOpacity
            style={styles.playButton}
            onPress={onPlayAudio}
            disabled={isPlayingAudio}
          >
            <Ionicons
              name={isPlayingAudio ? "pause-circle" : "play-circle"}
              size={28}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {optionsArray.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              selectedAnswer === option.key && styles.selectedOption,
            ]}
            onPress={() => !disabled && onAnswerSelect(option.key)}
            disabled={disabled}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{option.key}.</Text>
              <Text
                style={[
                  styles.optionText,
                  selectedAnswer === option.key && styles.selectedOptionText,
                ]}
              >
                {option.value}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scenarioBox: {
    backgroundColor: COLORS.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scenarioLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scenarioText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    color: COLORS.text,
  },
  questionWithAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  questionText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 26,
    flex: 1,
  },
  playButton: {
    padding: SPACING.xs,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionButton: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 5,
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  optionLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 30,
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.card,
  },
});

export default ScenarioQuestion;
