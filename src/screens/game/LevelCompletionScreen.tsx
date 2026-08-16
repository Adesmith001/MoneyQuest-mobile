import React, { useEffect } from "react";
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
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analyticsService from '../../services/analytics';
import { shouldPromptForReview, getReviewMilestone } from '../../utils/reviewPrompt';

const REVIEW_MILESTONE_KEY = 'review_last_prompted_milestone';

const { width } = Dimensions.get("window");

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
    };
  };
}

const LessonCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { xpGained, accuracy, sectionId, completedLevelsCount = 0 } = route.params;

  // Trigger native in-app review every 10 first-time completed levels
  useEffect(() => {
    const maybeRequestReview = async () => {
      try {
        const lastPromptedMilestone = Number(
          (await AsyncStorage.getItem(REVIEW_MILESTONE_KEY)) || '0'
        );

        if (shouldPromptForReview({ completedLevelsCount, lastPromptedMilestone })) {
          const milestone = getReviewMilestone(completedLevelsCount);
          const isAvailable = await StoreReview.isAvailableAsync();
          await AsyncStorage.setItem(REVIEW_MILESTONE_KEY, milestone.toString());
          if (isAvailable) {
            analyticsService.trackEvent('review_prompt_requested', {
              section_id: sectionId,
              completed_levels_count: completedLevelsCount,
              milestone,
            }, {
              screenName: 'LevelCompletion',
              featureName: 'store_review',
            }).catch(() => {});
            // Small delay so the completion screen appears first
            setTimeout(() => {
              StoreReview.requestReview();
            }, 1500);
          }
        }
      } catch (_) {
        // Silently fail — review prompt is non-critical
      }
    };

    maybeRequestReview();
  }, [completedLevelsCount, sectionId]);

  const handleContinue = () => {
    navigation.popToTop();
  };

  // On web, react-navigation's stack card (CardContent) uses `min-height: 100%`
  // without flex-shrink, so it grows to content height and the internal
  // ScrollView never becomes scrollable. Constrain to the viewport on web.
  const { height: windowHeight } = useWindowDimensions();
  const screenContainerStyle: StyleProp<ViewStyle> = [
    styles.container,
    Platform.OS === 'web'
      ? {
          height: windowHeight,
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: 'auto',
        }
      : null,
  ];

  return (
    <SafeAreaView style={screenContainerStyle}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        <Image
          source={require(`../../../assets/fox.png`)}
          style={styles.foxImage}
        />
        <Text style={styles.title}>Lesson Complete</Text>

        <View style={styles.statsContainer}>
          {/* Total XP Box */}
          <View style={styles.statBox}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>TOTAL XP</Text>
            </View>
            <View style={styles.statValueContainer}>
              <View style={styles.statValueContent}>
                {/* Replace with your XP icon */}
                <Image
                  source={require("../../../assets/xp-icon.png")} 
                  style={styles.statIcon}
                />
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {xpGained}
                </Text>
              </View>
            </View>
          </View>

          {/* Accuracy Box */}
          <View style={styles.statBox}>
            <View
              style={[
                styles.statLabelContainer,
                { backgroundColor: "#211E54" },
              ]}
            >
              <Text style={styles.statLabel}>GOOD</Text>
            </View>
            <View
              style={[
                styles.statValueContainer,
                { borderColor: "#211E54" },
              ]}
            >
              <View style={styles.statValueContent}>
                {/* Replace with your accuracy icon */}
                <Image
                  source={require("../../../assets/accuracy-icon.png")} 
                  style={styles.statIcon}
                />
                <Text style={[styles.statValue, { color: "#211E54" }]}>
                  {accuracy}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton title="Continue" onPress={handleContinue} />
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
    // The web frame is shorter than a phone viewport; tighten spacing so the
    // whole screen (including the Continue button) fits without scrolling.
    ...(Platform.OS === 'web' ? { paddingVertical: 14 } : {}),
  },
  foxImage: {
    // Phone layout tuned the offset to compensate for the asset's internal
    // padding; on the centered web frame it pushed the fox off-center, and the
    // frame is shorter than a phone viewport, so scale the fox down on web to
    // fit the whole screen without scrolling.
    ...(Platform.OS === 'web'
      ? { width: 300, height: 301, left: 0 }
      : { width: 341, height: 342, left: 35 }),
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5C02",
    marginBottom: SPACING.xxl,
    ...(Platform.OS === 'web' ? { marginBottom: SPACING.lg } : {}),
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: SPACING.xxl,
    ...(Platform.OS === 'web' ? { marginBottom: SPACING.lg } : {}),
  },
  statBox: {
    width: "40%",
    elevation: 3,
  },
  statLabelContainer: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    alignItems: "center",
  },
  statValueContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    borderTopWidth: 0,
    // Cap against the app frame (480) so the cards don't balloon on desktop
    // browsers where `width` is the full window, not the phone frame.
    height: Math.min(width, 480) * 0.25,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    width: 35,
    height: 35,
    resizeMode: "contain",
    marginRight: SPACING.sm,
  },
  statLabel: {
    color: COLORS.card,
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 21,
    fontWeight: "bold",
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: SPACING.md,
  },
});

export default LessonCompleteScreen;
