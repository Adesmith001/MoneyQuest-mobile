import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store";
import {
  clearCelebrations,
} from "../../store/slices/gamificationSlice";
import { CelebrationPayload } from "../../types/gamification";
import { getChestHeroTitle, getQuestHeroTitle, getQuestRewardNotice } from "../../utils/gamificationPresentation";

import LessonCompleteScreen from "../../screens/game/LevelCompletionScreen";
import DailyQuestScreen from "../../screens/game/DailyQuestScreen";
import AchievementUnlockScreen from "../../screens/game/AchievementUnlockScreen";

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
    };
  };
}

/**
 * CelebrationFlow wraps the post-lesson experience.
 *
 * It renders screens in this order:
 * 1. Lesson Complete (always)
 * 2. For each pending celebration: DailyQuest or AchievementUnlock
 * 3. Pop back to Home when done
 *
 * The component consumes `pendingCelebrations` from the gamification Redux
 * slice, which was populated by `processEventResult` after the lesson
 * completion event.
 */
const CelebrationFlow: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const pendingCelebrations = useSelector(
    (state: RootState) => state.gamification.pendingCelebrations
  );
  const streak = useSelector(
    (state: RootState) => state.gamification.streak
  );
  const lastResultBundle = useSelector(
    (state: RootState) => state.gamification.lastResultBundle
  );

  const [step, setStep] = useState<"lesson_complete" | "celebration" | "done">(
    "lesson_complete"
  );
  const [celebrationIndex, setCelebrationIndex] = useState(0);

  const { xpGained, accuracy, sectionId, completedLevelsCount } = route.params;

  // When lesson complete is dismissed, move to celebrations if any exist
  const handleLessonCompleteContinue = useCallback(() => {
    if (pendingCelebrations.length > 0) {
      setStep("celebration");
      setCelebrationIndex(0);
    } else {
      navigation.popToTop();
    }
  }, [pendingCelebrations, navigation]);

  // When a celebration screen is dismissed, advance or finish
  const handleCelebrationContinue = useCallback(() => {
    const nextIndex = celebrationIndex + 1;
    if (nextIndex < pendingCelebrations.length) {
      setCelebrationIndex(nextIndex);
    } else {
      dispatch(clearCelebrations());
      navigation.popToTop();
    }
  }, [celebrationIndex, pendingCelebrations.length, dispatch, navigation]);

  // If no celebrations pending, show only lesson complete
  const currentCelebration: CelebrationPayload | null =
    step === "celebration" && celebrationIndex < pendingCelebrations.length
      ? pendingCelebrations[celebrationIndex]
      : null;

  // ── Render ──────────────────────────────────

  // Step 1: Lesson Complete
  if (step === "lesson_complete") {
    return (
      <LessonCompleteScreen
        navigation={{
          ...navigation,
          popToTop: handleLessonCompleteContinue,
        }}
        route={{
          ...route,
          params: {
            ...route.params,
            streakMessage: route.params?.streakMessage ?? null,
            currentStreak: streak?.current_streak,
          },
        }}
      />
    );
  }

  // Step 2: Celebrations
  if (currentCelebration) {
    const commonNav = {
      ...navigation,
      popToTop: handleCelebrationContinue,
    };

    // Badge unlock celebration
    if (
      currentCelebration.celebration_type === "BADGE_UNLOCK" ||
      currentCelebration.hero_element === "badge"
    ) {
      const badgeCode =
        currentCelebration.unlocked_badges[0] || "UNKNOWN";
      const badgeResult = lastResultBundle?.badges.find(
        (badge) => badge.badge_code === badgeCode && badge.was_awarded
      );
      return (
        <AchievementUnlockScreen
          navigation={commonNav}
          route={{
            params: {
              badgeCode,
              badgeName: badgeResult?.badge_name || formatBadgeCode(badgeCode),
              badgeAssetReference: badgeResult?.asset_reference || null,
              subtitle: "You took the first step by completing your first lesson",
              progressValue: badgeResult?.progress_value ?? 1,
              targetValue: badgeResult?.target_value ?? 1,
              progressLabel: "lessons to go",
            },
          }}
        />
      );
    }

    // Quest completion or chest claim → show daily quest view
    if (
      currentCelebration.celebration_type === "QUEST_COMPLETED" ||
      currentCelebration.celebration_type === "CHEST_CLAIMED" ||
      currentCelebration.hero_element === "quest" ||
      currentCelebration.hero_element === "chest"
    ) {
      const completedQuestCode = currentCelebration.completed_quests[0];
      const completedQuest = lastResultBundle?.quests.find(
        (quest) => quest.quest_code === completedQuestCode && quest.was_completed_now
      );
      const rewardNotice = getQuestRewardNotice(completedQuest);
      return (
        <DailyQuestScreen
          navigation={commonNav}
          route={{
            params: {
              questPointEarned: currentCelebration.xp_earned || 1,
              questRewardLabel: currentCelebration.xp_earned > 0
                ? `+${currentCelebration.xp_earned} XP`
                : undefined,
              questTitle: rewardNotice || getQuestHeroTitle(
                  currentCelebration.celebration_type === "QUEST_COMPLETED"
                    ? { was_completed_now: true }
                    : { was_completed_now: false },
                  currentCelebration.xp_earned
                ),
              quests: [], // Will be populated from Redux on mount
            },
          }}
        />
      );
    }

    // Streak milestone
    if (currentCelebration.hero_element === "streak") {
      return (
        <DailyQuestScreen
          navigation={commonNav}
          route={{
            params: {
              questPointEarned: 0,
              questTitle: getChestHeroTitle(null),
              quests: [],
            },
          }}
        />
      );
    }
  }

  // Fallback — shouldn't reach here
  return (
    <LessonCompleteScreen
      navigation={navigation}
      route={route}
    />
  );
};

/** Convert badge code like "1ST_STEP" to "1st Step" */
function formatBadgeCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});

export default CelebrationFlow;
