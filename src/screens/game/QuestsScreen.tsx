import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { RootState, AppDispatch } from "../../store";
import { claimChest, fetchChests, fetchQuestTab } from "../../store/slices/gamificationSlice";
import { ChestStateItem, QuestTabEntry } from "../../types/gamification";
import { COLORS, SPACING } from "../../constants";
import CustomButton from "../../components/CustomButton";
import { getQuestsScreenState } from "./questsScreenState";

interface Props {
  navigation: any;
}

const QuestsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [claimingChestId, setClaimingChestId] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const activeQuests = useSelector(
    (state: RootState) => state.gamification.activeQuests
  );
  const chests = useSelector(
    (state: RootState) => state.gamification.chests
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.$id) {
        dispatch(fetchQuestTab(user.$id));
        dispatch(fetchChests(user.$id));
      }
    }, [dispatch, user?.$id])
  );

  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = Platform.OS === "web" ? Math.min(windowWidth, 480) : windowWidth;

  const { activeChallenges, hallOfFame, emptyMode } =
    getQuestsScreenState(activeQuests);
  const visibleChests = chests.filter((chest) =>
    ["LOCKED", "IN_PROGRESS", "READY", "CLAIMED"].includes(chest.status)
  );

  const handleClaimChest = async (chest: ChestStateItem) => {
    if (!user?.$id || !chest.chest_claim_id || claimingChestId) return;

    setClaimingChestId(chest.chest_claim_id);
    try {
      await dispatch(claimChest({ claimId: chest.chest_claim_id, userId: user.$id })).unwrap();
      dispatch(fetchQuestTab(user.$id));
      dispatch(fetchChests(user.$id));
    } finally {
      setClaimingChestId(null);
    }
  };

  const renderQuestCard = (quest: QuestTabEntry, index: number) => {
    const progress = quest.target_value > 0 ? quest.current_value / quest.target_value : 0;
    const isComplete = quest.status === "COMPLETED" || quest.status === "CLAIMED";

    return (
      <View key={quest.quest_definition_id || index} style={styles.questCard}>
        <View style={styles.questCardRow}>
          <View style={styles.questIconWrapper}>
            <Ionicons name="book" size={22} color="#D35400" />
          </View>
          <View style={styles.questInfo}>
            <Text style={styles.questName}>{quest.name}</Text>
            {quest.description ? (
              <Text style={styles.questDescription}>{quest.description}</Text>
            ) : null}
          </View>
          <View style={styles.questCountWrapper}>
            <Text style={styles.questCountCurrent}>{quest.current_value}</Text>
            <Text style={styles.questCountSep}> / </Text>
            <Text style={styles.questCountTarget}>{quest.target_value}</Text>
          </View>
          {isComplete && (
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: isComplete ? "#2ECC71" : COLORS.primary,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderChestCard = (chest: ChestStateItem) => {
    const isReady = chest.status === "READY";
    const isClaimed = chest.status === "CLAIMED";
    const isLocked = chest.status === "LOCKED" || chest.status === "IN_PROGRESS";
    const isClaiming = claimingChestId === chest.chest_claim_id;
    const rewardAmount = chest.reward?.amount ?? chest.reward_payload?.amount;
    const iconName = isReady ? "cube" : isClaimed ? "checkmark-circle" : "lock-closed";
    const iconColor = isReady ? COLORS.primary : isClaimed ? "#2ECC71" : "#687085";

    return (
      <View
        key={chest.chest_claim_id || chest.chest_definition_id}
        style={[
          styles.chestCard,
          isReady && styles.chestCardReady,
          isLocked && styles.chestCardLocked,
        ]}
      >
        <View style={[styles.chestIconWrapper, isLocked && styles.chestIconWrapperLocked]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.chestInfo}>
          <Text style={styles.chestName}>{chest.chest_name || "Reward Chest"}</Text>
          {chest.description ? (
            <Text style={styles.chestDescription}>{chest.description}</Text>
          ) : null}
          {rewardAmount ? (
            <Text style={styles.chestReward}>+{rewardAmount} XP</Text>
          ) : null}
        </View>
        {isReady ? (
          <TouchableOpacity
            style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
            onPress={() => handleClaimChest(chest)}
            disabled={isClaiming}
          >
            <Text style={styles.claimButtonText}>{isClaiming ? "Claiming" : "Claim"}</Text>
          </TouchableOpacity>
        ) : isClaimed ? (
          <View style={styles.claimedPill}>
            <Text style={styles.claimedPillText}>Claimed</Text>
          </View>
        ) : (
          <View style={styles.lockedPill}>
            <Text style={styles.lockedPillText}>Locked</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Orange Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>QUESTS</Text>
          <Text style={styles.headerSubtitle}>
            Unlock the Mythic Chest of Prosperity
          </Text>

          {/* Curved bottom edge */}
          <View style={styles.curveContainer}>
            <Svg width={layoutWidth} height={40} viewBox={`0 0 ${layoutWidth} 40`}>
              <Path
                d={`M 0 0 Q ${layoutWidth / 2} 60 ${layoutWidth} 0 L ${layoutWidth} 40 L 0 40 Z`}
                fill="#FFFFFF"
              />
            </Svg>
          </View>
        </View>

        {emptyMode === "no-quests" && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No quest available</Text>
            <Text style={styles.emptyDescription}>
              Check back later for new quests to complete.
            </Text>
          </View>
        )}

        {emptyMode === "all-completed" && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>All quests completed</Text>
            <Text style={styles.emptyDescription}>
              You have finished every available quest. Here are all the quests you completed.
            </Text>
          </View>
        )}

        {visibleChests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🎁</Text>
              <Text style={styles.sectionTitle}>Chests</Text>
            </View>
            {visibleChests.map(renderChestCard)}
          </View>
        )}

        {/* ── Active Challenges ── */}
        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>⚡</Text>
              <Text style={styles.sectionTitle}>Active Challenges</Text>
            </View>
            {activeChallenges.map((quest, i) => renderQuestCard(quest, i))}
          </View>
        )}

        {/* ── Hall of Fame ── */}
        {hallOfFame.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🏆</Text>
              <Text style={styles.sectionTitle}>Hall of Fame</Text>
            </View>
            {hallOfFame.map((quest, i) => renderQuestCard(quest, i + 100))}
          </View>
        )}

        {/* ── Complete More Button ── */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title={activeChallenges.length > 0 ? "Complete More quest" : "Go to Home"}
            onPress={() => navigation.navigate("Home")}
          />
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
    paddingBottom: 30,
  },

  // ── Header ──────────────────────────────
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "web" ? 30 : 50,
    paddingBottom: 40,
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  curveContainer: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
  },

  // ── Sections ────────────────────────────
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A2E",
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#777777",
    textAlign: "center",
    maxWidth: 320,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
  },

  // ── Quest Card ──────────────────────────
  questCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  questCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  questIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
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
  questCountWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  questCountCurrent: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  questCountSep: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  questCountTarget: {
    fontSize: 14,
    color: "#AAAAAA",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2ECC71",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
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

  // ── Chest Card ──────────────────────────
  chestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  chestCardReady: {
    borderColor: "#FFD08A",
    backgroundColor: "#FFF9F0",
  },
  chestCardLocked: {
    backgroundColor: "#F6F8FC",
    borderColor: "#DDE5F2",
  },
  chestIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chestIconWrapperLocked: {
    backgroundColor: "#E8EDF5",
  },
  chestInfo: {
    flex: 1,
    marginRight: 10,
  },
  chestName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  chestDescription: {
    fontSize: 13,
    color: "#777777",
    marginBottom: 2,
  },
  chestReward: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  claimButton: {
    minWidth: 78,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  claimedPill: {
    borderRadius: 999,
    backgroundColor: "#E8F8EF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  claimedPillText: {
    color: "#2ECC71",
    fontSize: 12,
    fontWeight: "bold",
  },
  lockedPill: {
    borderRadius: 999,
    backgroundColor: "#E8EDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lockedPillText: {
    color: "#687085",
    fontSize: 12,
    fontWeight: "bold",
  },

  // ── Button ──────────────────────────────
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
});

export default QuestsScreen;
