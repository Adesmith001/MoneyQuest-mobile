import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchingQuestion as MatchingQuestionType } from '../../types';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import soundService from '../../services/soundService';

interface Props {
  question: MatchingQuestionType;
  userMatches: { [key: string]: string }; // Map of left_id -> right_id
  onMatchChange: (leftId: string, rightId: string | null) => void;
  disabled?: boolean;
  showResults?: boolean; // Changed from showCorrect
  onPlayAudio?: () => void;
  isPlayingAudio?: boolean;
}

const MatchingQuestion: React.FC<Props> = ({
  question,
  userMatches,
  onMatchChange,
  disabled = false,
  showResults = false,
  onPlayAudio,
  isPlayingAudio = false,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchFeedback, setMatchFeedback] = useState<{ [key: string]: 'correct' | 'incorrect' | null }>({});
  const [fadingMatches, setFadingMatches] = useState<Set<string>>(new Set());
  
  // Animation values for each item
  const animationRefs = useRef<{ [key: string]: { 
    opacity: Animated.Value;
    shake: Animated.Value;
    scale: Animated.Value;
  } }>({});

  // Initialize animation values for all items
  useEffect(() => {
    [...question.left_items, ...question.right_items].forEach(item => {
      if (!animationRefs.current[item.id]) {
        animationRefs.current[item.id] = {
          opacity: new Animated.Value(1),
          shake: new Animated.Value(0),
          scale: new Animated.Value(1),
        };
      }
    });
  }, [question]);

  const handleLeftItemPress = (leftId: string) => {
    if (disabled || fadingMatches.has(leftId)) return;
    setSelectedLeft(selectedLeft === leftId ? null : leftId);
  };

  const handleRightItemPress = (rightId: string) => {
    if (disabled || !selectedLeft || fadingMatches.has(selectedLeft)) return;

    const leftId = selectedLeft;
    const correctRightId = question.correct_matches[leftId];
    const isCorrect = rightId === correctRightId;

    // Update match
    if (userMatches[leftId] === rightId) {
      onMatchChange(leftId, null);
      setMatchFeedback({ ...matchFeedback, [leftId]: null });
    } else {
      onMatchChange(leftId, rightId);
      
      if (isCorrect) {
        // ✅ CORRECT MATCH - Duolingo style feedback
        soundService.playSound('correct');
        setMatchFeedback({ ...matchFeedback, [leftId]: 'correct' });
        
        // Scale up animation
        Animated.sequence([
          Animated.spring(animationRefs.current[leftId].scale, {
            toValue: 1.1,
            useNativeDriver: true,
            speed: 50,
          }),
          Animated.spring(animationRefs.current[leftId].scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
          }),
        ]).start();

        // Fade out after delay
        setTimeout(() => {
          setFadingMatches(prev => new Set(prev).add(leftId));
          
          Animated.parallel([
            Animated.timing(animationRefs.current[leftId].opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[rightId].opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Keep them faded after animation completes
          });
        }, 800);
      } else {
        // ❌ INCORRECT MATCH - Shake animation
        soundService.playSound('incorrect');
        setMatchFeedback({ ...matchFeedback, [leftId]: 'incorrect' });
        
        // Shake animation for both items
        const shakeAnimation = (itemId: string) => {
          return Animated.sequence([
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: -10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
          ]);
        };

        Animated.parallel([
          shakeAnimation(leftId),
          shakeAnimation(rightId),
        ]).start();

        // Clear incorrect feedback after delay
        setTimeout(() => {
          setMatchFeedback(prev => ({ ...prev, [leftId]: null }));
          onMatchChange(leftId, null);
        }, 1000);
      }
    }
    setSelectedLeft(null);
  };

  const isLeftMatched = (leftId: string) => !!userMatches[leftId];
  const isRightMatched = (rightId: string) => 
    Object.values(userMatches).includes(rightId);
  
  const getRightIdForLeft = (leftId: string) => userMatches[leftId];

  return (
    <View style={styles.container}>
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
            const feedback = matchFeedback[item.id];
            const isFading = fadingMatches.has(item.id);
            const isCorrect = showResults && 
              userMatches[item.id] === question.correct_matches[item.id];
            const isIncorrect = showResults && 
              matched && 
              userMatches[item.id] !== question.correct_matches[item.id];

            const animValues = animationRefs.current[item.id] || {
              opacity: new Animated.Value(1),
              shake: new Animated.Value(0),
              scale: new Animated.Value(1),
            };

            return (
              <Animated.View
                key={item.id}
                style={{
                  opacity: animValues.opacity,
                  transform: [
                    { translateX: animValues.shake },
                    { scale: animValues.scale },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.matchItem,
                    selected && styles.selectedItem,
                    matched && !showResults && !feedback && styles.matchedItem,
                    (feedback === 'correct' || (isCorrect && showResults)) && styles.correctItem,
                    (feedback === 'incorrect' || (isIncorrect && showResults)) && styles.incorrectItem,
                    isFading && styles.fadingItem,
                  ]}
                  onPress={() => handleLeftItemPress(item.id)}
                  disabled={disabled || isFading}
                >
                  <Text
                    style={[
                      styles.matchText,
                      (selected || matched) && styles.matchedText,
                    ]}
                  >
                    {item.text}
                  </Text>
                  {matched && !showResults && !feedback && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                  {feedback === 'correct' && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  )}
                  {feedback === 'incorrect' && (
                    <Ionicons name="close-circle" size={24} color={COLORS.warning} />
                  )}
                  {isCorrect && showResults && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  )}
                  {isIncorrect && showResults && (
                    <Ionicons name="close-circle" size={20} color={COLORS.warning} />
                  )}
                </TouchableOpacity>
              </Animated.View>
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
            const isFading = Array.from(fadingMatches).some(leftId => 
              userMatches[leftId] === item.id
            );
            const leftIdForThis = Object.entries(userMatches).find(
              ([_, rightId]) => rightId === item.id
            )?.[0];
            const feedback = leftIdForThis ? matchFeedback[leftIdForThis] : null;
            
            const isCorrect = showResults && 
              Object.entries(question.correct_matches).some(
                ([leftId, rightId]) => 
                  rightId === item.id && userMatches[leftId] === rightId
              );
            const isIncorrect = showResults &&
              matched &&
              Object.entries(userMatches).some(
                ([leftId, rightId]) =>
                  rightId === item.id && question.correct_matches[leftId] !== rightId
              );

            const animValues = animationRefs.current[item.id] || {
              opacity: new Animated.Value(1),
              shake: new Animated.Value(0),
              scale: new Animated.Value(1),
            };

            return (
              <Animated.View
                key={item.id}
                style={{
                  opacity: animValues.opacity,
                  transform: [
                    { translateX: animValues.shake },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.matchItem,
                    matched && !showResults && !feedback && styles.matchedItem,
                    (feedback === 'correct' || (isCorrect && showResults)) && styles.correctItem,
                    (feedback === 'incorrect' || (isIncorrect && showResults)) && styles.incorrectItem,
                    selectedLeft && !matched && !isFading && styles.highlightedItem,
                    isFading && styles.fadingItem,
                  ]}
                  onPress={() => handleRightItemPress(item.id)}
                  disabled={disabled || !selectedLeft || isFading}
                >
                  <Text
                    style={[
                      styles.matchText,
                      matched && styles.matchedText,
                    ]}
                  >
                    {item.text}
                  </Text>
                  {matched && !showResults && !feedback && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                  {feedback === 'correct' && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  )}
                  {feedback === 'incorrect' && (
                    <Ionicons name="close-circle" size={24} color={COLORS.warning} />
                  )}
                  {isCorrect && showResults && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  )}
                  {isIncorrect && showResults && (
                    <Ionicons name="close-circle" size={20} color={COLORS.warning} />
                  )}
                </TouchableOpacity>
              </Animated.View>
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
  questionWithAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
  fadingItem: {
    opacity: 0.3,
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
