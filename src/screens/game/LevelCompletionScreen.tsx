import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  useWindowDimensions,
  StyleProp,
  ViewStyle,
  Animated,
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS } from "../../constants";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import analyticsService from "../../services/analytics";
import { shouldPromptForReview, getReviewMilestone } from "../../utils/reviewPrompt";
import Svg, { Path } from "react-native-svg";

const REVIEW_MILESTONE_KEY = "review_last_prompted_milestone";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_STREAK_TITLE = "Streak extended!";
const DEFAULT_STREAK_SUBTITLE = "You crushed it. Keep the\nstreak going!";

interface Props {
  navigation: any;
  route: {
    params: {
      xpGained: number;
      accuracy: number;
      sectionId?: string;
      passed?: boolean;
      nextLevelId?: string;
      completedLevelsCount?: number;
      streakMessage?: string | null;
      currentStreak?: number;
    };
  };
}

const LessonCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    xpGained,
    accuracy,
    sectionId,
    completedLevelsCount = 0,
  } = route.params;

  // ── Entrance animations ──────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statSlide = useRef(new Animated.Value(40)).current;
  const foxSlide = useRef(new Animated.Value(-60)).current;
  const streakSlide = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(150),
      Animated.timing(statSlide, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(foxSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(streakSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // ── Review prompt ────────────────────────────
  useEffect(() => {
    const maybeRequestReview = async () => {
      try {
        const lastPromptedMilestone = Number(
          (await AsyncStorage.getItem(REVIEW_MILESTONE_KEY)) || "0"
        );
        if (shouldPromptForReview({ completedLevelsCount, lastPromptedMilestone })) {
          const milestone = getReviewMilestone(completedLevelsCount);
          const isAvailable = await StoreReview.isAvailableAsync();
          await AsyncStorage.setItem(REVIEW_MILESTONE_KEY, milestone.toString());
          if (isAvailable) {
            analyticsService
              .trackEvent(
                "review_prompt_requested",
                { section_id: sectionId, completed_levels_count: completedLevelsCount, milestone },
                { screenName: "LevelCompletion", featureName: "store_review" }
              )
              .catch(() => {});
            setTimeout(() => StoreReview.requestReview(), 1500);
          }
        }
      } catch (_) {}
    };
    maybeRequestReview();
  }, [completedLevelsCount, sectionId]);

  const handleContinue = () => navigation.popToTop();

  const { height: windowHeight } = useWindowDimensions();
  const layoutWidth = Platform.OS === "web" ? Math.min(windowWidth, 480) : SCREEN_WIDTH;

  const screenContainerStyle: StyleProp<ViewStyle> = [
    styles.container,
    Platform.OS === "web"
      ? { height: windowHeight, flexGrow: 0, flexShrink: 0, flexBasis: "auto" }
      : null,
  ];

  return (
    <SafeAreaView style={screenContainerStyle}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Orange Header with Medal ── */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.medalContainer}>
            <View style={styles.medalOuterRing}>
              <View style={styles.medalInnerCircle}>
                <Image
                  source={require("../../../assets/medal.png")}
                  style={styles.medalImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
          <Text style={styles.title}>Lesson Complete!</Text>
          <View style={styles.curveContainer}>
            <Svg width={layoutWidth} height={54} viewBox={`0 0 ${layoutWidth} 54`}>
              <Path
                d={`M 0 54 Q ${layoutWidth / 2} -18 ${layoutWidth} 54 L ${layoutWidth} 54 L 0 54 Z`}
                fill="#FFFFFF"
              />
            </Svg>
          </View>
        </Animated.View>

        {/* ── Stats Cards ── */}
        <Animated.View style={[styles.statsContainer, { transform: [{ translateY: statSlide }] }]}>
          <View style={[styles.statCard, styles.xpCard]}>
            <Text style={[styles.statLabelText, styles.xpLabelText]}>Total XP</Text>
            <View style={styles.statValueRow}>
              <Image
                source={require("../../../assets/xp-icon.png")}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={[styles.statValueText, styles.xpValueText]}>{xpGained}</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.accuracyCard]}>
            <Text style={[styles.statLabelText, styles.accuracyLabelText]}>Accuracy</Text>
            <View style={styles.statValueRow}>
              <Image
                source={require("../../../assets/accuracy-icon.png")}
                style={styles.statIcon}
                resizeMode="contain"
              />
              <Text style={[styles.statValueText, styles.accuracyValueText]}>{accuracy}%</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Fox + Streak Callout ── */}
        <View style={styles.foxStreakSection}>
          <Animated.View
            style={[styles.foxWrapper, { transform: [{ translateX: foxSlide }] }]}
          >
            <Image
              source={require("../../../assets/fox-lesson-completed.png")}
              style={styles.foxImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[styles.streakCard, { transform: [{ translateX: streakSlide }] }]}
          >
            <Image
              source={require("../../../assets/streakIcon.png")}
              style={styles.streakIcon}
              resizeMode="contain"
            />
            <View style={styles.streakTextWrapper}>
              <Text style={styles.streakTitle}>{DEFAULT_STREAK_TITLE}</Text>
              <Text style={styles.streakSubtitle}>{DEFAULT_STREAK_SUBTITLE}</Text>
            </View>
          </Animated.View>
        </View>

        {/* ── Continue Button ── */}
        <View style={styles.buttonContainer}>
          <View style={styles.buttonShadow} />
          <CustomButton
            title="Continue"
            onPress={handleContinue}
            fullWidth
            style={styles.button}
            textStyle={styles.buttonText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width: windowWidth } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Header ──────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "web" ? 38 : 58,
    paddingBottom: 76,
    alignItems: "center",
    position: "relative",
  },
  medalContainer: {
    marginBottom: 24,
  },
  medalOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 85,
    borderWidth: 7,
    borderStyle: "dashed",
    borderColor: "rgba(255, 170, 150, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  medalInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  medalImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 52,
  },
  curveContainer: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 16,
    marginTop: 26,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    maxWidth: 150,
    minHeight: 110,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  xpCard: {
    backgroundColor: "#FFF5F1",
    borderColor: "#F7C5BA",
  },
  accuracyCard: {
    borderColor: "#C7C8D9",
  },
  statLabelText: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  xpLabelText: {
    color: "#F04D23",
  },
  accuracyLabelText: {
    color: "#27286F",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statIcon: {
    width: 34,
    height: 34,
  },
  statValueText: {
    fontSize: 30,
    fontWeight: "bold",
    lineHeight: 44,
  },
  xpValueText: {
    color: COLORS.primary,
  },
  accuracyValueText: {
    color: "#27286F",
  },

  // ── Fox + Streak ────────────────────────
  foxStreakSection: {
    position: "relative",
    marginBottom: 48,
    minHeight: 350,
    overflow: "visible",
  },
  foxWrapper: {
    width: 405,
    height: 340,
    marginLeft: -58,
    marginTop: 28,
  },
  foxImage: {
    width: 380,
    height: 300,
  },
  streakCard: {
    position: "absolute",
    right: 20,
    top: 50,
    width: 260,
    backgroundColor: "#FFFEFC",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#F3CA77",
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  streakIcon: {
    width: 48,
    height: 48,
    marginRight: 14,
    marginTop: 2,
  },
  streakTextWrapper: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#D19616",
    marginBottom: 8,
  },
  streakSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D9A126",
    lineHeight: 20,
  },

  // ── Button ──────────────────────────────
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    marginTop: "auto",
    position: "relative",
  },
  buttonShadow: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 21,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#B74109",
  },
  button: {
    borderRadius: 22,
    paddingVertical: 22,
    backgroundColor: "#F64F1E",
  },
  buttonText: {
    fontSize: 22,
    fontWeight: "700",
  },
});

export default LessonCompleteScreen;
