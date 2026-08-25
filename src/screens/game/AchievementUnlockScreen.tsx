import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Platform,
  Animated,
  useWindowDimensions,
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS, SPACING } from "../../constants";

interface Props {
  navigation: any;
  route: {
    params: {
      /** Badge code (e.g., "1ST_STEP") */
      badgeCode: string;
      /** Display name (e.g., "1st Step") */
      badgeName: string;
      /** Subtitle / congratulations text */
      subtitle?: string;
      /** Progress toward next badge */
      progressValue?: number;
      targetValue?: number;
      progressLabel?: string;
    };
  };
}

const AchievementUnlockScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    badgeCode,
    badgeName,
    subtitle = "You completed your first lesson!",
    progressValue = 0,
    targetValue = 1,
    progressLabel = "Lessons to go",
  } = route.params;

  // ── Animations ────────────────────────────
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const progressSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.sequence([
      // Badge pops in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      // Text fades in
      Animated.timing(textFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(150),
      // Content slides up
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(progressSlide, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleContinue = () => {
    navigation.popToTop();
  };

  const { height: windowHeight } = useWindowDimensions();
  const progress = targetValue > 0 ? progressValue / targetValue : 0;
  const remaining = Math.max(targetValue - progressValue, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Hero Badge Area ── */}
      <View style={styles.heroArea}>
        {/* Decorative dots */}
        <View style={[styles.dot, styles.dotTopLeft]} />
        <View style={[styles.dot, styles.dotTopRight]} />
        <View style={[styles.dot, styles.dotBottomLeft]} />

        {/* Hexagonal badge container */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.hexagonOuter}>
            <View style={styles.hexagonInner}>
              <Text style={styles.badgeEmoji}>🏅</Text>
            </View>
          </View>
          {/* Badge name ribbon */}
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{badgeName}</Text>
          </View>
        </Animated.View>
      </View>

      {/* ── Text Content ── */}
      <Animated.View
        style={[
          styles.textContent,
          {
            opacity: textFade,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.congratsText}>CONGRATULATIONS!</Text>
        <Text style={styles.subtitleText}>{subtitle}</Text>
      </Animated.View>

      {/* ── Progress Card ── */}
      <Animated.View
        style={[
          styles.progressCard,
          { transform: [{ translateY: progressSlide }] },
        ]}
      >
        <View style={styles.progressLeft}>
          <View style={styles.progressBadgeIcon}>
            <Text style={styles.progressBadgeEmoji}>🏅</Text>
          </View>
          <View>
            <Text style={styles.progressBadgeName}>{badgeName}</Text>
            <Text style={styles.progressLabel}>
              {remaining} {progressLabel}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(progress * 100, 100)}%` },
            ]}
          />
        </View>
      </Animated.View>

      {/* ── Continue Button ── */}
      <View style={styles.buttonContainer}>
        <CustomButton title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Hero Area ────────────────────────────
  heroArea: {
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 30 : 50,
    paddingBottom: 20,
    position: "relative",
  },
  dot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B5998",
    opacity: 0.4,
  },
  dotTopLeft: { top: 60, left: 40 },
  dotTopRight: { top: 80, right: 50 },
  dotBottomLeft: { top: 320, left: 60 },

  // ── Badge ────────────────────────────────
  badgeContainer: {
    alignItems: "center",
  },
  hexagonOuter: {
    width: 200,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  hexagonInner: {
    width: 180,
    height: 200,
    backgroundColor: "#E8EDF5",
    borderRadius: 20,
    transform: [{ rotate: "0deg" }],
    alignItems: "center",
    justifyContent: "center",
    // Hexagonal clip via border
    borderWidth: 4,
    borderColor: "#C5CEE0",
  },
  badgeEmoji: {
    fontSize: 70,
  },
  ribbon: {
    backgroundColor: "#E8EDF5",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: -4,
    borderWidth: 1,
    borderColor: "#C5CEE0",
  },
  ribbonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B5998",
    letterSpacing: 1,
  },

  // ── Text ─────────────────────────────────
  textContent: {
    paddingHorizontal: 30,
    alignItems: "center",
    marginBottom: 30,
  },
  congratsText: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitleText: {
    fontSize: 17,
    color: COLORS.primary,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },

  // ── Progress Card ────────────────────────
  progressCard: {
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginBottom: 20,
  },
  progressLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FFF0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  progressBadgeEmoji: {
    fontSize: 26,
  },
  progressBadgeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 13,
    color: "#888888",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },

  // ── Button ──────────────────────────────
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    marginTop: "auto",
  },
});

export default AchievementUnlockScreen;
