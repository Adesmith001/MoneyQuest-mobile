import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchingQuestion as MatchingQuestionType } from '../../types';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';

interface Props {
  question: MatchingQuestionType;
  userMatches: { [key: string]: string }; // Map of left_id -> right_id
  onMatchChange: (leftId: string, rightId: string | null) => void;
  disabled?: boolean;
  showCorrect?: boolean;
}

const MatchingQuestion: React.FC<Props> = ({
  question,
  userMatches,
  onMatchChange,
  disabled = false,
  showCorrect = false,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const handleLeftItemPress = (leftId: string) => {
    if (disabled) return;
    setSelectedLeft(selectedLeft === leftId ? null : leftId);
  };

  const handleRightItemPress = (rightId: string) => {
    if (disabled || !selectedLeft) return;

    // Toggle match: if already matched to this right item, unmatch
    if (userMatches[selectedLeft] === rightId) {
      onMatchChange(selectedLeft, null);
    } else {
      onMatchChange(selectedLeft, rightId);
    }
    setSelectedLeft(null);
  };

  const isLeftMatched = (leftId: string) => !!userMatches[leftId];
  const isRightMatched = (rightId: string) => 
    Object.values(userMatches).includes(rightId);
  
  const getRightIdForLeft = (leftId: string) => userMatches[leftId];

  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.question}</Text>
      <Text style={styles.instructionText}>
        Tap an item on the left, then tap its match on the right
      </Text>

      <View style={styles.matchingContainer}>
        {/* Left Column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Items</Text>
          {question.left_items.map((item) => {
            const matched = isLeftMatched(item.id);
            const selected = selectedLeft === item.id;
            const isCorrect = showCorrect && 
              userMatches[item.id] === question.correct_matches[item.id];
            const isIncorrect = showCorrect && 
              matched && 
              userMatches[item.id] !== question.correct_matches[item.id];

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.matchItem,
                  selected && styles.selectedItem,
                  matched && styles.matchedItem,
                  isCorrect && styles.correctItem,
                  isIncorrect && styles.incorrectItem,
                ]}
                onPress={() => handleLeftItemPress(item.id)}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.matchText,
                    (selected || matched) && styles.matchedText,
                  ]}
                >
                  {item.text}
                </Text>
                {matched && !showCorrect && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
                {isCorrect && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                )}
                {isIncorrect && (
                  <Ionicons name="close-circle" size={20} color={COLORS.warning} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Connector Lines Placeholder */}
        <View style={styles.connector}>
          <View style={styles.connectorLine} />
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          <Text style={styles.columnHeader}>Matches</Text>
          {question.right_items.map((item) => {
            const matched = isRightMatched(item.id);
            const isCorrect = showCorrect && 
              Object.entries(question.correct_matches).some(
                ([leftId, rightId]) => 
                  rightId === item.id && userMatches[leftId] === rightId
              );

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.matchItem,
                  matched && styles.matchedItem,
                  isCorrect && styles.correctItem,
                  selectedLeft && !matched && styles.highlightedItem,
                ]}
                onPress={() => handleRightItemPress(item.id)}
                disabled={disabled || !selectedLeft}
              >
                <Text
                  style={[
                    styles.matchText,
                    matched && styles.matchedText,
                  ]}
                >
                  {item.text}
                </Text>
                {matched && !showCorrect && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    lineHeight: 26,
  },
  instructionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text + '99',
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  matchingContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  column: {
    flex: 1,
  },
  columnHeader: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  matchItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedItem: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  matchedItem: {
    backgroundColor: COLORS.primary + '25',
    borderColor: COLORS.primary + '50',
  },
  highlightedItem: {
    borderColor: COLORS.primary + '50',
    backgroundColor: COLORS.card,
  },
  correctItem: {
    backgroundColor: COLORS.success + '25',
    borderColor: COLORS.success,
  },
  incorrectItem: {
    backgroundColor: COLORS.warning + '25',
    borderColor: COLORS.warning,
  },
  matchText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  matchedText: {
    fontWeight: '600',
  },
  connector: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: COLORS.primary + '30',
  },
});

export default MatchingQuestion;
