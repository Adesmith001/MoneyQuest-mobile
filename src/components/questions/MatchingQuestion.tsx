import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchingQuestion as MatchingQuestionType } from '../../types';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import soundService from '../../services/soundService';
import { getMatchingCardTone } from './matchingQuestionStyleState';

interface Props {
  question: MatchingQuestionType;
  userMatches: { [key: string]: string };
  onMatchChange: (leftId: string, rightId: string | null) => void;
  disabled?: boolean;
  showResults?: boolean;
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
  const [matchFeedback, setMatchFeedback] = useState<{
    [key: string]: 'correct' | 'incorrect' | null;
  }>({});
  const [fadingMatches, setFadingMatches] = useState<Set<string>>(new Set());

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
    const tone = getMatchingCardTone({
      selected,
      matched,
      feedback,
      showResults,
      result: isCorrect ? 'correct' : isIncorrect ? 'incorrect' : null,
    });

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
            styles[`${tone}Item`],
            isFading && styles.fadingItem,
          ]}
          onPress={() => handleLeftItemPress(item.id)}
          disabled={disabled || isFading}
        >
          <Text
            style={[
              styles.matchText,
              tone !== 'default' && styles.matchTextStrong,
              (tone === 'selected' || tone === 'matched' || tone === 'correct') &&
                styles.selectedMatchText,
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
    const tone = getMatchingCardTone({
      matched,
      highlighted: !!selectedLeft && !matched && !isFading,
      feedback,
      showResults,
      result: isCorrect ? 'correct' : isIncorrect ? 'incorrect' : null,
    });

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
            styles[`${tone}Item`],
            isFading && styles.fadingItem,
          ]}
          onPress={() => handleRightItemPress(item.id)}
          disabled={disabled || !selectedLeft || isFading}
        >
          <Text
            style={[
              styles.matchText,
              tone !== 'default' && styles.matchTextStrong,
              (tone === 'matched' || tone === 'correct') && styles.selectedMatchText,
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
    justifyContent: 'center',
  },
  questionWithAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 72,
    gap: SPACING.sm,
  },
  questionText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
    flex: 1,
    textAlign: 'center',
  },
  playButton: {
    padding: SPACING.xs,
  },
  matchingContainer: {
    gap: 24,
  },
  matchRow: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  matchItem: {
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  matchItemPlaceholder: {
    minHeight: 64,
  },
  defaultItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEEEE',
  },
  selectedItem: {
    borderColor: '#F04D23',
    backgroundColor: '#F04D23',
  },
  matchedItem: {
    backgroundColor: '#F04D23',
    borderColor: '#F04D23',
  },
  highlightedItem: {
    borderColor: '#F04D23',
    backgroundColor: '#FFFFFF',
  },
  correctItem: {
    backgroundColor: '#F04D23',
    borderColor: '#F04D23',
  },
  incorrectItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F04D23',
  },
  fadingItem: {
    opacity: 0.3,
  },
  matchText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    color: COLORS.text,
    fontWeight: '700',
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
