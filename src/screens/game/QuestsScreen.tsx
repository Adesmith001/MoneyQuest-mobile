import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import CustomButton from "../../components/CustomButton";
import { COLORS, FONT_FAMILY } from "../../constants";
import { AppDispatch, RootState } from "../../store";
import {
  claimChest,
  fetchChests,
  fetchQuestTab,
} from "../../store/slices/gamificationSlice";
import { ChestStateItem, QuestTabEntry } from "../../types/gamification";
import { getQuestsScreenState } from "./questsScreenState";

interface Props {
  navigation: any;
}

const QuestsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [claimingChestId, setClaimingChestId] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.auth.user?.$id);
  const quests = useSelector((state: RootState) => state.gamification.activeQuests);
  const chests = useSelector((state: RootState) => state.gamification.chests);
  const { activeChallenges, hallOfFame, emptyMode } = getQuestsScreenState(quests);
  const rewardChest = chests.find((chest) => chest.status === "READY");

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        dispatch(fetchQuestTab(userId));
        dispatch(fetchChests(userId));
      }
    }, [dispatch, userId])
  );

  const claimReward = async (chest: ChestStateItem) => {
    if (!userId || !chest.chest_claim_id || claimingChestId) return;
    setClaimingChestId(chest.chest_claim_id);
    try {
      await dispatch(claimChest({ claimId: chest.chest_claim_id, userId })).unwrap();
      dispatch(fetchQuestTab(userId));
      dispatch(fetchChests(userId));
    } finally {
      setClaimingChestId(null);
    }
  };

  const renderQuestCard = (quest: QuestTabEntry, index: number, completed = false) => {
    const progress = quest.target_value > 0 ? Math.min(quest.current_value / quest.target_value, 1) : 0;
    const isMastery = /master|accuracy/i.test(`${quest.name} ${quest.description}`);

    return (
      <View key={quest.quest_definition_id || index} style={[styles.questCard, completed && styles.completedCard]}>
        {completed && <View style={styles.starWatermark}><Text style={styles.starWatermarkText}>★</Text></View>}
        <View style={styles.questTopRow}>
          <View style={[styles.questIcon, completed && styles.completedIcon]}>
            <Ionicons
              name={completed ? "medal-outline" : isMastery ? "ribbon-outline" : "book-outline"}
              size={26}
              color={completed ? "#FFFFFF" : "#A94400"}
            />
          </View>
          <View style={styles.questCopy}>
            <Text style={styles.questName}>{quest.name}</Text>
            <Text style={[styles.questDescription, completed && styles.completedCopy]}>
              {quest.description}
            </Text>
          </View>
          {completed ? (
            <View style={styles.completeCheck}><Ionicons name="checkmark" size={28} color="#FFFFFF" /></View>
          ) : (
            <Text style={styles.questCount}>
              <Text style={styles.questCountCurrent}>{quest.current_value}</Text>
              <Text style={styles.questCountDivider}> / </Text>
              {quest.target_value}
            </Text>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: completed ? "#087D2C" : "#FF6500" }]} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>QUESTS</Text>
          <Text style={styles.headerSubtitle}>Complete challenges and earn rewards</Text>
        </View>

        {emptyMode !== "none" && hallOfFame.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No quest available</Text>
            <Text style={styles.emptyDescription}>Check back later for new quests to complete.</Text>
          </View>
        ) : null}

        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash" size={24} color="#FF5700" />
              <Text style={styles.sectionTitle}>Active Challenges</Text>
            </View>
            {activeChallenges.map((quest, index) => renderQuestCard(quest, index))}
          </View>
        )}

        {(hallOfFame.length > 0 || rewardChest) && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="trophy" size={23} color="#087D2C" />
              <Text style={styles.sectionTitle}>Hall of Fame</Text>
            </View>
            {hallOfFame.map((quest, index) => renderQuestCard(quest, index + 100, true))}
            {rewardChest && (
              <TouchableOpacity
                style={[styles.questCard, styles.completedCard]}
                onPress={() => claimReward(rewardChest)}
                disabled={Boolean(claimingChestId)}
                accessibilityRole="button"
                accessibilityLabel={`Claim ${rewardChest.chest_name}`}
              >
                <View style={styles.questTopRow}>
                  <View style={styles.completedIcon}>
                    <Image source={require("../../../assets/chestIcon.png")} style={styles.chestImage} />
                  </View>
                  <View style={styles.questCopy}>
                    <Text style={styles.questName}>{rewardChest.chest_name}</Text>
                    <Text style={styles.completedCopy}>Ready to claim</Text>
                  </View>
                  {claimingChestId ? <ActivityIndicator color="#087D2C" /> : (
                    <View style={styles.completeCheck}><Ionicons name="gift" size={22} color="#FFFFFF" /></View>
                  )}
                </View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, styles.fullProgress]} /></View>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <CustomButton title="Complete More quest" onPress={() => navigation.navigate("Home")} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const shadow = Platform.select({
  web: { boxShadow: "0 8px 14px rgba(0,0,0,0.12)" } as any,
  default: { elevation: 5, shadowColor: "#000000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 24 },
  header: {
    minHeight: 154,
    paddingTop: Platform.OS === "web" ? 38 : 42,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "#F64B20",
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    marginBottom: 30,
    ...shadow,
  },
  headerTitle: { fontFamily: FONT_FAMILY, fontSize: 34, lineHeight: 42, color: "#FFFFFF" },
  headerSubtitle: { marginTop: 5, fontSize: 16, color: "#FFFFFF", fontWeight: "500" },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 16 },
  sectionTitle: { fontFamily: FONT_FAMILY, fontSize: 20, color: "#151515" },
  questCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: 126,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    backgroundColor: "#FFFFFF",
    ...shadow,
  },
  completedCard: { borderWidth: 2, borderColor: "#FFD000", backgroundColor: "#FFF8C9" },
  starWatermark: { position: "absolute", right: -12, top: -30 },
  starWatermarkText: { fontSize: 100, color: "rgba(255,255,255,0.42)" },
  questTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  questIcon: {
    width: 52, height: 52, marginRight: 16, borderRadius: 15, borderWidth: 1,
    borderColor: "#F8DDC7", backgroundColor: "#FFF9F3", alignItems: "center", justifyContent: "center",
  },
  completedIcon: {
    width: 50, height: 50, marginRight: 16, borderRadius: 15,
    backgroundColor: "#FFD000", alignItems: "center", justifyContent: "center",
  },
  chestImage: { width: 34, height: 34, resizeMode: "contain" },
  questCopy: { flex: 1, paddingRight: 8 },
  questName: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 24, color: "#111111" },
  questDescription: { marginTop: 2, fontSize: 13, lineHeight: 20, color: "#604B42" },
  completedCopy: { color: "#087D2C", fontWeight: "700" },
  questCount: { fontFamily: FONT_FAMILY, fontSize: 20, color: "#A94200" },
  questCountCurrent: { color: "#A94200" },
  questCountDivider: { color: "#C9C1BC" },
  completeCheck: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: "#FFFFFF",
    backgroundColor: "#087D2C", alignItems: "center", justifyContent: "center",
  },
  progressTrack: { height: 12, borderRadius: 8, overflow: "hidden", backgroundColor: "#EEEEEE" },
  progressFill: { height: "100%", borderRadius: 8 },
  fullProgress: { width: "100%", backgroundColor: "#087D2C" },
  emptyState: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 24 },
  emptyTitle: { fontFamily: FONT_FAMILY, fontSize: 21, color: "#151515" },
  emptyDescription: { marginTop: 8, color: "#777777", textAlign: "center" },
  buttonContainer: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8 },
});

export default QuestsScreen;
