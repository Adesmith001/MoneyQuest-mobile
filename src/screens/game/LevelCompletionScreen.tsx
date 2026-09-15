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
  TouchableOpacity,
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
interface Props {
  navigation: any;
  onContinue?: () => void;
  onBackToHome?: () => void;
  nextPrompt?: string;
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

const LessonCompleteScreen: React.FC<Props> = ({
  navigation,
  route,
  onContinue,
  onBackToHome,
  nextPrompt = "Your next lesson is ready on Home.",
}) => {
  const {
    xpGained,
    accuracy,
    sectionId,
    completedLevelsCount = 0,
    streakMessage,
    currentStreak,
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

  const handleContinue = () => (onContinue ? onContinue() : navigation.popToTop());
  const handleBackToHome = () =>
    onBackToHome
      ? onBackToHome()
      : navigation.navigate("MainApp", { screen: "Home" });

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
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

          {streakMessage ? (
            <Animated.View
              style={[styles.streakCard, { transform: [{ translateX: streakSlide }] }]}
            >
              <Image
                source={require("../../../assets/streakIcon.png")}
                style={styles.streakIcon}
                resizeMode="contain"
              />
              <View style={styles.streakTextWrapper}>
                <Text style={styles.streakTitle}>{streakMessage}</Text>
                <Text style={styles.streakSubtitle}>
                  {currentStreak
                    ? `${currentStreak}-day streak — keep it going!`
                    : "Keep learning to grow your streak."}
                </Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.actionFooter}>
        <Text style={styles.nextPrompt}>{nextPrompt}</Text>
        <CustomButton
          title="Continue"
          onPress={handleContinue}
          fullWidth
          style={styles.button}
          textStyle={styles.buttonText}
        />
        <TouchableOpacity style={styles.homeAction} onPress={handleBackToHome}>
          <Text style={styles.homeActionText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const { width: windowWidth } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },

  // ── Header ──────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "web" ? 24 : 32,
    paddingBottom: 54,
    alignItems: "center",
    position: "relative",
  },
  medalContainer: {
    marginBottom: 12,
  },
  medalOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 85,
    borderWidth: 7,
    borderStyle: "dashed",
    borderColor: "rgba(255, 170, 150, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  medalInnerCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  medalImage: {
    width: 42,
    height: 42,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 40,
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
    marginTop: 18,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    maxWidth: 150,
    minHeight: 94,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
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
    marginBottom: 8,
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
    minHeight: 228,
    overflow: "visible",
  },
  foxWrapper: {
    width: 300,
    height: 225,
    marginLeft: -42,
    marginTop: 4,
  },
  foxImage: {
    width: 290,
    height: 220,
  },
  streakCard: {
    position: "absolute",
    right: 14,
    top: 38,
    width: 230,
    backgroundColor: "#FFFEFC",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#F3CA77",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  streakIcon: {
    width: 38,
    height: 38,
    marginRight: 10,
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

  actionFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === "web" ? 18 : 10,
  },
  nextPrompt: {
    color: "#666666",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    borderRadius: 18,
    paddingVertical: 15,
    backgroundColor: "#F64F1E",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  homeAction: {
    alignItems: "center",
    paddingVertical: 9,
  },
  homeActionText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
  },
});

export default LessonCompleteScreen;
