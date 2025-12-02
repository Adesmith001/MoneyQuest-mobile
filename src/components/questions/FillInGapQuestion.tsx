import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FillInGapQuestion as FillInGapQuestionType } from '../../types';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';

interface Props {
  question: FillInGapQuestionType;
  userAnswers: { [blankId: string]: string }; // Map of blank_id -> user_answer
  onAnswerChange: (blankId: string, answer: string) => void;
  disabled?: boolean;
  showCorrect?: boolean;
  onPlayAudio?: () => void;
  isPlayingAudio?: boolean;
}

const FillInGapQuestion: React.FC<Props> = ({
  question,
  userAnswers,
  onAnswerChange,
  disabled = false,
  showCorrect = false,
  onPlayAudio,
  isPlayingAudio = false,
}) => {
  // Split question text by blank markers and render with inputs
  const renderQuestionWithBlanks = () => {
    let questionText = question.question;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let keyCounter = 0;

    question.blanks.forEach((blank) => {
      const blankMarker = `{${blank.id}}`;
      const blankIndex = questionText.indexOf(blankMarker, lastIndex);

      if (blankIndex !== -1) {
        // Add text before the blank
        if (blankIndex > lastIndex) {
          parts.push(questionText.substring(lastIndex, blankIndex));
        }

        // Add the blank input
        const isCorrect = showCorrect && 
          userAnswers[blank.id]?.toLowerCase().trim() === blank.correct_answer.toLowerCase().trim();
        const isIncorrect = showCorrect && 
          userAnswers[blank.id] && 
          userAnswers[blank.id]?.toLowerCase().trim() !== blank.correct_answer.toLowerCase().trim();

        parts.push(
          <View 
            key={`blank-${keyCounter++}`} 
            style={[
              styles.blankInputContainer,
              isCorrect && styles.correctBlank,
              isIncorrect && styles.incorrectBlank,
            ]}
          >
            {blank.options && blank.options.length > 0 ? (
              // Render as dropdown/buttons if options provided
              <View style={styles.optionsRow}>
                {blank.options.map((option, idx) => (
                  <TouchableOpacity
                    key={`option-${blank.id}-${idx}`}
                    style={[
                      styles.optionChip,
                      userAnswers[blank.id] === option && styles.selectedChip,
                    ]}
                    onPress={() => !disabled && onAnswerChange(blank.id, option)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        userAnswers[blank.id] === option && styles.selectedChipText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Render as text input
              <TextInput
                style={styles.blankInput}
                value={userAnswers[blank.id] || ''}
                onChangeText={(text) => onAnswerChange(blank.id, text)}
                placeholder="____"
                placeholderTextColor={COLORS.text + '50'}
                editable={!disabled}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            {showCorrect && isIncorrect && (
              <Text style={styles.correctAnswerHint}>
                Correct: {blank.correct_answer}
              </Text>
            )}
          </View>
        );

        lastIndex = blankIndex + blankMarker.length;
      }
    });

    // Add remaining text after last blank
    if (lastIndex < questionText.length) {
      parts.push(questionText.substring(lastIndex));
    }

    return (
      <Text style={styles.questionText}>
        {parts.map((part, idx) => 
          typeof part === 'string' ? (
            <Text key={`text-${idx}`}>{part}</Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.instructionText}>
          Fill in the blanks to complete the sentence
        </Text>
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
      {renderQuestionWithBlanks()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  instructionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text + '99',
    fontStyle: 'italic',
    flex: 1,
  },
  playButton: {
    padding: SPACING.xs,
  },
  questionText: {
    fontSize: FONT_SIZES.lg,
    lineHeight: 32,
    color: COLORS.text,
  },
  blankInputContainer: {
    marginVertical: SPACING.xs,
  },
  blankInput: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 100,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  optionChip: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  selectedChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  selectedChipText: {
    color: COLORS.card,
  },
  correctBlank: {
    backgroundColor: COLORS.success + '15',
    borderRadius: 4,
    padding: SPACING.xs,
  },
  incorrectBlank: {
    backgroundColor: COLORS.warning + '15',
    borderRadius: 4,
    padding: SPACING.xs,
  },
  correctAnswerHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
});

export default FillInGapQuestion;
