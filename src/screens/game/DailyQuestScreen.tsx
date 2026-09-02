import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Platform,
  Animated,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS, SPACING } from "../../constants";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { QuestTabEntry } from "../../types/gamification";
import Svg, { Path } from "react-native-svg";

interface QuestDisplayItem {
  name: string;
  description?: string;
  currentValue: number;
  targetValue: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED" | "EXPIRED";
  icon?: string;
}

interface Props {
  navigation: any;
  route: {
    params: {
      /** Number of quest points earned (typically 1) */
      questPointEarned?: number;
      /** Title shown in the notification header */
      questTitle?: string;
      /** Reward line shown under the notification header */
      questRewardLabel?: string;
      /** Pre-built quest display items */
      quests?: QuestDisplayItem[];
    };
  };
}

const DailyQuestScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    questPointEarned = 1,
    questTitle = "Daily Quest",
    questRewardLabel,
    quests: passedQuests,
  } = route.params;

  // Pull live quest data from Redux if none passed
  const activeQuests = useSelector(
    (state: RootState) => state.gamification.activeQuests
  );

  // ── Entrance animation ───────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
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
    ]).start();
  }, []);

  const handleContinue = () => {
    navigation.popToTop();
  };

  // Build display items from props or Redux
  const displayQuests: QuestDisplayItem[] =
    passedQuests && passedQuests.length > 0
      ? passedQuests
      : activeQuests.map((q: QuestTabEntry) => ({
          name: q.name,
          description: q.description,
          currentValue: q.current_value,
          targetValue: q.target_value,
          status: q.status,
        }));

  const { height: windowHeight } = useWindowDimensions();
  const layoutWidth = Platform.OS === "web" ? Math.min(windowWidth, 480) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Orange Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{questTitle}</Text>
          <Text style={styles.questPointText}>
            {questRewardLabel || `+${questPointEarned} Quest Point${questPointEarned !== 1 ? "s" : ""}!`}
          </Text>
          <Text style={styles.headerSubtitle}>
            Keep completing to unlock your chest
          </Text>

          {/* Curved bottom edge */}
          <View style={styles.curveContainer}>
            <Svg width={layoutWidth || 480} height={40} viewBox={`0 0 ${layoutWidth || 480} 40`}>
              <Path
                d={`M 0 0 Q ${(layoutWidth || 480) / 2} 60 ${layoutWidth || 480} 0 L ${layoutWidth || 480} 40 L 0 40 Z`}
                fill="#FFFFFF"
              />
            </Svg>
          </View>
        </View>

        {/* ── Quest Cards ── */}
        <Animated.View
          style={[
            styles.questsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {displayQuests.map((quest, index) => {
            const progress = quest.targetValue > 0
              ? quest.currentValue / quest.targetValue
              : 0;
            const isComplete =
              quest.status === "COMPLETED" || quest.status === "CLAIMED";
            const progressColor = isComplete ? "#2ECC71" : COLORS.primary;

            return (
              <View
                key={`${quest.name}-${index}`}
                style={[
                  styles.questCard,
                  isComplete && styles.questCardComplete,
                ]}
              >
                <View style={styles.questCardHeader}>
                  <View style={styles.questInfo}>
                    <Text style={styles.questName}>{quest.name}</Text>
                    {quest.description ? (
                      <Text style={styles.questDescription}>
                        {quest.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.questProgressRight}>
                    <Text style={styles.questCount}>
                      <Text style={styles.questCountCurrent}>
                        {quest.currentValue}
                      </Text>
                      <Text style={styles.questCountSeparator}>/</Text>
                      <Text style={styles.questCountTarget}>
                        {quest.targetValue}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(progress * 100, 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}

          {displayQuests.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active quests right now.</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Continue Button ── */}
        <View style={styles.buttonContainer}>
          <CustomButton title="Continue" onPress={handleContinue} />
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
    paddingTop: Platform.OS === "web" ? 30 : 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    position: "relative",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  questPointText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  curveContainer: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
  },

  // ── Quest Cards ─────────────────────────
  questsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 14,
  },
  questCard: {
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
  },
  questCardComplete: {
    borderColor: "#FFD700",
    backgroundColor: "#FFFDE7",
  },
  questCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  questInfo: {
    flex: 1,
    marginRight: 12,
  },
  questName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  questDescription: {
    fontSize: 13,
    color: "#888888",
  },
  questProgressRight: {
    alignItems: "flex-end",
  },
  questCount: {
    fontSize: 16,
  },
  questCountCurrent: {
    fontWeight: "bold",
    color: COLORS.primary,
  },
  questCountSeparator: {
    color: "#CCCCCC",
    marginHorizontal: 1,
  },
  questCountTarget: {
    color: "#AAAAAA",
  },

  // ── Progress Bar ────────────────────────
  progressBarBg: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },

  // ── Empty ───────────────────────────────
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#AAAAAA",
  },

  // ── Button ──────────────────────────────
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    marginTop: 16,
  },
});

export default DailyQuestScreen;
