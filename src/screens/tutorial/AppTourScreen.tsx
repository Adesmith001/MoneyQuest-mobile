import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { completeAppTour } from '../../store/slices/tutorialSlice';
import { FONT_FAMILY } from '../../constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;
const isTablet = screenWidth >= 768;

interface TourSlide {
  icon: string;
  title: string;
  description: string;
  mascotMessage: string;
  backgroundColor: string;
  accentColor: string;
}

const TOUR_SLIDES: TourSlide[] = [
  {
    icon: '\u{1F5FA}\uFE0F',
    title: 'Your Learning Path',
    description:
      'Each section covers a financial topic. You can only move one level at a time, so finish the current glowing star before the next level unlocks. Swipe left and right to see more sections, and use refresh when new content is available.',
    mascotMessage: 'Let me show you around! This is where all the learning happens.',
    backgroundColor: '#D4E8F5',
    accentColor: '#FF5722',
  },
  {
    icon: '\u2B50',
    title: 'Earn XP & Climb',
    description:
      "Answer questions correctly to earn XP points. The leaderboard ranks learners by monthly XP and shows each learner's current streak.",
    mascotMessage: 'Points make it fun! Try to get as many right as you can.',
    backgroundColor: '#FFF8E1',
    accentColor: '#FF9800',
  },
  {
    icon: '\u2764\uFE0F',
    title: 'Lives System',
    description:
      'You start with 5 lives. Each wrong answer costs 1 life. Complete levels to earn lives back, up to 5 max.',
    mascotMessage: "Don't worry if you make mistakes - we all learn from them!",
    backgroundColor: '#FCE4EC',
    accentColor: '#F44336',
  },
  {
    icon: '\u{1F4AC}',
    title: 'Feedback & Flags',
    description:
      'After each answer, the app shows whether you were correct or incorrect with an explanation. If a question looks wrong or confusing, use the flag button.',
    mascotMessage: 'Good feedback helps you learn faster.',
    backgroundColor: '#FFF3E0',
    accentColor: '#FF6B35',
  },
  {
    icon: '\u{1F525}',
    title: 'Daily Streaks',
    description:
      'Complete a lesson each day to build your streak. The streak tab shows your current streak and the days you were active this week.',
    mascotMessage: 'Can you keep your streak going? I believe in you!',
    backgroundColor: '#FFF3E0',
    accentColor: '#FF6B35',
  },
  {
    icon: '\u{1F3AF}',
    title: "You're All Set!",
    description:
      'Start your first lesson now! Tap the glowing star on your learning path to begin.\n\nYou can always replay this guide from Profile > How to Play.',
    mascotMessage: "Go ahead and tap that first level - you've got this! \u{1F98A}",
    backgroundColor: '#E8F5E9',
    accentColor: '#4CAF50',
  },
];

interface Props {
  onComplete: () => void;
}

const AppTourScreen: React.FC<Props> = ({ onComplete }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  const slide = TOUR_SLIDES[currentSlide];
  const isLast = currentSlide === TOUR_SLIDES.length - 1;

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: -10,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [currentSlide, iconBounce]);

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentSlide(nextIndex);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (isLast) {
      dispatch(completeAppTour());
      onComplete();
      return;
    }

    animateTransition(currentSlide + 1);
  };

  const handleSkip = () => {
    dispatch(completeAppTour());
    onComplete();
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      animateTransition(currentSlide - 1);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: slide.backgroundColor }]}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipBtnText}>Skip Tour</Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.mascotRow}>
          <Image
            source={require('../../../assets/fox.png')}
            style={styles.foxImage}
            resizeMode="contain"
          />
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>{slide.mascotMessage}</Text>
            <View style={styles.speechTail} />
          </View>
        </View>

        <Animated.View style={{ transform: [{ translateY: iconBounce }] }}>
          <Text style={styles.bigIcon}>{slide.icon}</Text>
        </Animated.View>

        <Text style={[styles.title, { color: slide.accentColor }]}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>

      <View style={styles.bottomControls}>
        <View style={styles.dotsRow}>
          {TOUR_SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentSlide && [styles.activeDot, { backgroundColor: slide.accentColor }],
                idx < currentSlide && styles.completedDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonRow}>
          {currentSlide > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: slide.accentColor }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {isLast ? "Let's Go! \u{1F680}" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: isSmallDevice ? 50 : 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipBtnText: {
    fontSize: 15,
    color: '#999',
    fontFamily: FONT_FAMILY,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: isSmallDevice ? 60 : 40,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: isSmallDevice ? 20 : 32,
    width: '100%',
  },
  foxImage: {
    width: isSmallDevice ? 70 : isTablet ? 120 : 90,
    height: isSmallDevice ? 70 : isTablet ? 120 : 90,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: isSmallDevice ? 12 : 16,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speechText: {
    fontSize: isSmallDevice ? 13 : 15,
    color: '#5D4037',
    fontFamily: FONT_FAMILY,
    lineHeight: isSmallDevice ? 18 : 22,
  },
  speechTail: {
    position: 'absolute',
    top: '35%',
    left: -8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 10,
    borderBottomWidth: 6,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: '#FFFFFF',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  bigIcon: {
    fontSize: isSmallDevice ? 56 : isTablet ? 80 : 68,
    marginBottom: isSmallDevice ? 12 : 20,
  },
  title: {
    fontSize: isSmallDevice ? 24 : isTablet ? 32 : 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 12 : 16,
    fontFamily: FONT_FAMILY,
  },
  description: {
    fontSize: isSmallDevice ? 14 : isTablet ? 18 : 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: isSmallDevice ? 22 : 26,
    fontFamily: FONT_FAMILY,
    paddingHorizontal: 8,
  },
  bottomControls: {
    paddingBottom: isSmallDevice ? 24 : 40,
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  activeDot: {
    width: 28,
    height: 8,
    borderRadius: 4,
  },
  completedDot: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 80,
  },
  backText: {
    fontSize: 16,
    color: '#888',
    fontFamily: FONT_FAMILY,
  },
  nextButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 36,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY,
  },
});

export default AppTourScreen;
