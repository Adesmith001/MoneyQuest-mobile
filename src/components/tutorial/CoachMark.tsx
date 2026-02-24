import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { FONT_FAMILY } from '../../constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;
const isTablet = screenWidth >= 768;

export interface CoachMarkStep {
  /** Title text shown in the coach mark */
  title: string;
  /** Description text explaining the feature */
  description: string;
  /** Position of the highlight area (where the feature is on screen) */
  highlightPosition?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** Where to place the tooltip relative to the highlight */
  tooltipPosition?: 'top' | 'bottom' | 'center';
  /** Optional mascot message (spoken by the fox) */
  mascotMessage?: string;
  /** Optional icon emoji */
  icon?: string;
}

interface CoachMarkProps {
  /** Whether the coach mark is visible */
  visible: boolean;
  /** Array of steps for multi-step guides */
  steps: CoachMarkStep[];
  /** Current step index */
  currentStep?: number;
  /** Called when user taps "Got it!" or "Next" */
  onNext: () => void;
  /** Called when user taps "Skip" */
  onSkip: () => void;
  /** Called when last step is completed */
  onComplete: () => void;
  /** Whether to show the fox mascot */
  showMascot?: boolean;
}

const CoachMark: React.FC<CoachMarkProps> = ({
  visible,
  steps,
  currentStep = 0,
  onNext,
  onSkip,
  onComplete,
  showMascot = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const totalSteps = steps.length;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for highlight
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [visible, currentStep]);

  if (!visible || !step) return null;

  const handleAction = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onSkip}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Touchable overlay to allow skipping */}
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={() => {}}
        />

        {/* Tooltip Card */}
        <Animated.View
          style={[
            styles.tooltipContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: pulseAnim },
              ],
              opacity: fadeAnim,
            },
            step.tooltipPosition === 'top' && styles.tooltipTop,
            step.tooltipPosition === 'bottom' && styles.tooltipBottom,
            (!step.tooltipPosition || step.tooltipPosition === 'center') && styles.tooltipCenter,
          ]}
        >
          <View style={styles.tooltipCard}>
            {/* Fox Mascot */}
            {showMascot && (
              <View style={styles.mascotContainer}>
                <Image
                  source={require('../../../assets/fox.png')}
                  style={styles.foxImage}
                  resizeMode="contain"
                />
                {step.mascotMessage && (
                  <View style={styles.speechBubble}>
                    <Text style={styles.speechText}>{step.mascotMessage}</Text>
                    <View style={styles.speechTail} />
                  </View>
                )}
              </View>
            )}

            {/* Icon */}
            {step.icon && (
              <Text style={styles.stepIcon}>{step.icon}</Text>
            )}

            {/* Title */}
            <Text style={styles.title}>{step.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{step.description}</Text>

            {/* Step indicator dots */}
            {totalSteps > 1 && (
              <View style={styles.dotsContainer}>
                {steps.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === currentStep && styles.activeDot,
                      idx < currentStep && styles.completedDot,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextButton} onPress={handleAction}>
                <Text style={styles.nextText}>
                  {isLastStep ? 'Got it!' : `Next (${currentStep + 1}/${totalSteps})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltipContainer: {
    position: 'absolute',
    width: screenWidth - 40,
    maxWidth: isTablet ? 500 : 400,
    alignSelf: 'center',
  },
  tooltipTop: {
    top: isSmallDevice ? 80 : 120,
  },
  tooltipBottom: {
    bottom: isSmallDevice ? 80 : 120,
  },
  tooltipCenter: {
    top: screenHeight * 0.2,
  },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: isSmallDevice ? 20 : 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  mascotContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    width: '100%',
  },
  foxImage: {
    width: isSmallDevice ? 60 : isTablet ? 100 : 80,
    height: isSmallDevice ? 60 : isTablet ? 100 : 80,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    marginLeft: 10,
    position: 'relative',
  },
  speechText: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#5D4037',
    fontFamily: FONT_FAMILY,
    lineHeight: 20,
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
    borderRightColor: '#FFF3E0',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  stepIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: isSmallDevice ? 18 : isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: FONT_FAMILY,
  },
  description: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: isSmallDevice ? 20 : 24,
    marginBottom: 20,
    paddingHorizontal: 8,
    fontFamily: FONT_FAMILY,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  activeDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
  },
  completedDot: {
    backgroundColor: '#FF8A65',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 15,
    color: '#999',
    fontFamily: FONT_FAMILY,
  },
  nextButton: {
    backgroundColor: '#FF5722',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 140,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY,
  },
});

export default CoachMark;
