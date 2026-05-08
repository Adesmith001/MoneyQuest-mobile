import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchingQuestion as MatchingQuestionType } from '../../types';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import soundService from '../../services/soundService';

interface Props {
  question: MatchingQuestionType;
  userMatches: { [key: string]: string };
  onMatchChange: (leftId: string, rightId: string | null) => void;
  onAutoAdvance?: () => void;
  disabled?: boolean;
  showResults?: boolean;
  onPlayAudio?: () => void;
  isPlayingAudio?: boolean;
}

const MatchingQuestion: React.FC<Props> = ({
  question,
  userMatches,
  onMatchChange,
  onAutoAdvance,
  disabled = false,
  showResults = false,
  onPlayAudio,
  isPlayingAudio = false,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchFeedback, setMatchFeedback] = useState<{
    [key: string]: 'correct' | 'incorrect' | null;
  }>({});
  const [fadingMatches, setFadingMatches] = useState<Set<string>>(new Set());
  const autoAdvanceTriggeredRef = useRef(false);

  const animationRefs = useRef<{
    [key: string]: {
      opacity: Animated.Value;
      shake: Animated.Value;
      scale: Animated.Value;
    };
  }>({});

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

  useEffect(() => {
    autoAdvanceTriggeredRef.current = false;
    setSelectedLeft(null);
    setMatchFeedback({});
    setFadingMatches(new Set());

    [...question.left_items, ...question.right_items].forEach(item => {
      const anim = animationRefs.current[item.id];
      if (anim) {
        anim.opacity.setValue(1);
        anim.shake.setValue(0);
        anim.scale.setValue(1);
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

    if (userMatches[leftId] === rightId) {
      onMatchChange(leftId, null);
      setMatchFeedback({ ...matchFeedback, [leftId]: null });
    } else {
      const nextMatches = { ...userMatches, [leftId]: rightId };
      onMatchChange(leftId, rightId);

      if (isCorrect) {
        soundService.playSound('correct');
        setMatchFeedback({ ...matchFeedback, [leftId]: 'correct' });

        Animated.sequence([
          Animated.spring(animationRefs.current[leftId].scale, {
            toValue: 1.08,
            useNativeDriver: true,
            speed: 50,
          }),
          Animated.spring(animationRefs.current[leftId].scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
          }),
        ]).start();

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
          ]).start();
        }, 800);

        const allMatchesCompleteAndCorrect = Object.keys(question.correct_matches).every(
          matchLeftId => nextMatches[matchLeftId] === question.correct_matches[matchLeftId]
        );

        if (
          allMatchesCompleteAndCorrect &&
          !autoAdvanceTriggeredRef.current &&
          onAutoAdvance
        ) {
          autoAdvanceTriggeredRef.current = true;
          setTimeout(() => {
            onAutoAdvance();
          }, 900);
        }
      } else {
        soundService.playSound('incorrect');
        setMatchFeedback({ ...matchFeedback, [leftId]: 'incorrect' });

        const shakeAnimation = (itemId: string) =>
          Animated.sequence([
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: 8,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: -8,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: 8,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animationRefs.current[itemId].shake, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
          ]);

        Animated.parallel([
          shakeAnimation(leftId),
          shakeAnimation(rightId),
        ]).start();

        setTimeout(() => {
          setMatchFeedback(prev => ({ ...prev, [leftId]: null }));
          onMatchChange(leftId, null);
        }, 1000);
      }
    }

    setSelectedLeft(null);
  };

  const isLeftMatched = (leftId: string) => !!userMatches[leftId];
  const isRightMatched = (rightId: string) => Object.values(userMatches).includes(rightId);
  const totalRows = Math.max(question.left_items.length, question.right_items.length);
  const rows = Array.from({ length: totalRows }, (_, index) => ({
    leftItem: question.left_items[index],
    rightItem: question.right_items[index],
  }));

  const renderLeftCard = (item?: MatchingQuestionType['left_items'][number]) => {
    if (!item) {
      return <View style={styles.matchItemPlaceholder} />;
    }

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
              (selected || matched) && styles.matchTextStrong,
              selected && styles.selectedMatchText,
            ]}
            numberOfLines={2}
          >
            {item.text}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightCard = (item?: MatchingQuestionType['right_items'][number]) => {
    if (!item) {
      return <View style={styles.matchItemPlaceholder} />;
    }

    const matched = isRightMatched(item.id);
    const isFading = Array.from(fadingMatches).some(leftId => userMatches[leftId] === item.id);
    const leftIdForThis = Object.entries(userMatches).find(
      ([_, rightId]) => rightId === item.id
    )?.[0];
    const feedback = leftIdForThis ? matchFeedback[leftIdForThis] : null;

    const isCorrect = showResults &&
      Object.entries(question.correct_matches).some(
        ([leftId, rightId]) => rightId === item.id && userMatches[leftId] === rightId
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
        style={{
          opacity: animValues.opacity,
          transform: [{ translateX: animValues.shake }],
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
              matched && styles.matchTextStrong,
            ]}
            numberOfLines={2}
          >
            {item.text}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.instructionText}>Tap a word, then choose its match.</Text>

      <View style={styles.matchingContainer}>
        {rows.map((row, index) => (
          <View key={`match-row-${index}`} style={styles.matchRow}>
            <View style={styles.column}>{renderLeftCard(row.leftItem)}</View>
            <View style={styles.column}>{renderRightCard(row.rightItem)}</View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  questionWithAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: SPACING.sm,
  },
  questionText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 28,
    flex: 1,
    textAlign: 'center',
  },
  playButton: {
    padding: SPACING.xs,
  },
  instructionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 18,
    textAlign: 'center',
  },
  matchingContainer: {
    gap: 12,
  },
  matchRow: {
    flexDirection: 'row',
    gap: 14,
  },
  column: {
    flex: 1,
  },
  matchItem: {
    minHeight: 60,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  matchItemPlaceholder: {
    minHeight: 60,
  },
  selectedItem: {
    borderColor: '#F04D23',
    backgroundColor: '#F04D23',
  },
  matchedItem: {
    backgroundColor: '#FFF1EC',
    borderColor: '#F6B49C',
  },
  highlightedItem: {
    borderColor: '#FFD6C7',
    backgroundColor: '#FFF8F5',
  },
  correctItem: {
    backgroundColor: COLORS.success + '18',
    borderColor: COLORS.success,
  },
  incorrectItem: {
    backgroundColor: '#FFF1EC',
    borderColor: '#F04D23',
  },
  fadingItem: {
    opacity: 0.3,
  },
  matchText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchTextStrong: {
    fontWeight: '700',
  },
  selectedMatchText: {
    color: '#FFFFFF',
  },
});

export default MatchingQuestion;
