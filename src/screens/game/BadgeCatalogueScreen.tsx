import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootState, AppDispatch } from "../../store";
import { fetchBadgeCatalogue } from "../../store/slices/gamificationSlice";
import { BadgeCatalogueEntry } from "../../types/gamification";
import { COLORS, SPACING } from "../../constants";
import {
  getBadgeUnlockHint,
  getBadgeUnlockProgressLabel,
} from "../../utils/gamificationPresentation";

interface Props {
  navigation: any;
}

const BadgeCatalogueScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const badgeCatalogue = useSelector(
    (state: RootState) => state.gamification.badgeCatalogue
  );
  const earnedCount = useSelector(
    (state: RootState) => state.gamification.earnedBadgeCount
  );
  const totalCount = useSelector(
    (state: RootState) => state.gamification.totalBadgeCount
  );
  const activeQuests = useSelector(
    (state: RootState) => state.gamification.activeQuests
  );

  useFocusEffect(
    useCallback(() => {
      if (user?.$id) {
        dispatch(fetchBadgeCatalogue(user.$id));
      }
    }, [dispatch, user?.$id])
  );

  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = Platform.OS === "web" ? Math.min(windowWidth, 480) : windowWidth;
  const badgeSize = (layoutWidth - 24 * 2 - 16 * 2) / 3; // 3 columns with gaps

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Badges & Achievements</Text>
        </View>

        {/* ── Achievements Section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="shield" size={20} color="#3B5998" />
            </View>
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>
          <Text style={styles.sectionCount}>
            {earnedCount}/{totalCount}
          </Text>
        </View>

        {/* ── Badge Grid ── */}
        <View style={styles.badgeGrid}>
          {badgeCatalogue.map((badge, index) => {
            const progressLabel = getBadgeUnlockProgressLabel(badge);
            const unlockHint = getBadgeUnlockHint(badge);
            const progress =
              badge.target_value > 0
                ? Math.min(badge.progress_value / badge.target_value, 1)
                : 0;

            return (
              <View key={badge.badge_definition_id || index} style={[styles.badgeItem, { width: badgeSize }]}>
                <View
                  style={[
                    styles.hexagonContainer,
                    { width: badgeSize - 10, height: badgeSize - 10 },
                    !badge.is_earned && styles.hexagonLocked,
                  ]}
                >
                  <View style={styles.hexagonInner}>
                    {badge.asset_reference ? (
                      <Image
                        source={{ uri: badge.asset_reference }}
                        style={[styles.badgeImage, !badge.is_earned && styles.badgeImageLocked]}
                        resizeMode="contain"
                      />
                    ) : badge.is_earned ? (
                      <Text style={styles.badgeEmoji}>🏅</Text>
                    ) : (
                      <View style={styles.lockedBadgeFill}>
                        <Ionicons name="lock-closed" size={24} color="#687085" />
                      </View>
                    )}
                  </View>
                </View>
                <Text
                  style={[styles.badgeName, !badge.is_earned && styles.badgeNameLocked]}
                  numberOfLines={1}
                >
                  {badge.name}
                </Text>
                {!badge.is_earned && (
                  <View style={styles.unlockPanel}>
                    <View style={styles.unlockProgressTrack}>
                      <View style={[styles.unlockProgressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <View style={styles.unlockChip}>
                      <Ionicons name="sparkles" size={10} color="#3B5998" />
                      <Text style={styles.unlockChipText} numberOfLines={1}>
                        {progressLabel}
                      </Text>
                    </View>
                    <Text style={styles.unlockHint} numberOfLines={2}>
                      {unlockHint}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Fill empty slots if fewer than 9 badges */}
          {badgeCatalogue.length < 9 &&
            Array.from({ length: 9 - badgeCatalogue.length }).map((_, i) => (
              <View key={`empty-${i}`} style={[styles.badgeItem, { width: badgeSize }]}>
                <View
                  style={[
                    styles.hexagonContainer,
                    { width: badgeSize - 10, height: badgeSize - 10 },
                    styles.hexagonLocked,
                  ]}
                >
                  <View style={styles.hexagonInner}>
                    <View style={styles.lockedBadgeFill} />
                  </View>
                </View>
                <Text style={[styles.badgeName, styles.badgeNameLocked]}></Text>
              </View>
            ))}
        </View>

        {/* ── Journey Summary Card ── */}
        <TouchableOpacity style={styles.summaryCard} activeOpacity={0.7}>
          <View style={[styles.summaryIcon, { backgroundColor: "#E8F5E9" }]}>
            <View style={[styles.summaryHexSmall, { backgroundColor: "#4CAF50" }]} />
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryTitle}>Journey</Text>
            <Text style={styles.summarySubtitle}>Track your learning and growth</Text>
            <Text style={styles.summaryCount}>{earnedCount}/{totalCount}</Text>
          </View>
          <View style={styles.summaryBadgesPreview}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.miniHex}>
                <View style={[styles.miniHexInner, i === 0 && { backgroundColor: "#4CAF50" }]} />
              </View>
            ))}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
        </TouchableOpacity>

        {/* ── Quests Summary Card ── */}
        <TouchableOpacity style={[styles.summaryCard, styles.summaryCardOrange]} activeOpacity={0.7}>
          <View style={[styles.summaryIcon, { backgroundColor: "#FFF3E0" }]}>
            <View style={[styles.summaryHexSmall, { backgroundColor: "#FF9800" }]} />
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryTitle}>Quests</Text>
            <Text style={styles.summarySubtitle}>Complete tasks and earn rewards</Text>
          </View>
          <View style={styles.summaryBadgesPreview}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.miniHex}>
                <View style={[styles.miniHexInner, i === 0 && { backgroundColor: "#FF9800" }]} />
              </View>
            ))}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
        </TouchableOpacity>

        <View style={{ height: 30 }} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Header ──────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A2E",
  },

  // ── Section Header ──────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E3EDF7",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  sectionCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B5998",
  },

  // ── Badge Grid ──────────────────────────
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  badgeItem: {
    alignItems: "center",
    marginBottom: 12,
  },
  hexagonContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EDF5",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#C5CEE0",
    marginBottom: 6,
  },
  hexagonLocked: {
    backgroundColor: "#E0E0E0",
    borderColor: "#BDBDBD",
  },
  hexagonInner: {
    width: "85%",
    height: "85%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeEmoji: {
    fontSize: 40,
  },
  badgeImage: {
    width: "100%",
    height: "100%",
  },
  badgeImageLocked: {
    opacity: 0.35,
  },
  lockedBadgeFill: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D8DDE8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A2E",
    textAlign: "center",
  },
  badgeNameLocked: {
    color: "#687085",
  },
  unlockPanel: {
    width: "100%",
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: "#F3F6FB",
    borderWidth: 1,
    borderColor: "#DDE5F2",
    padding: 6,
    marginTop: 4,
  },
  unlockProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#DDE5F2",
    overflow: "hidden",
    marginBottom: 5,
  },
  unlockProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#3B5998",
  },
  unlockChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: "#E3EDF7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  unlockChipText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#3B5998",
  },
  unlockHint: {
    fontSize: 9,
    lineHeight: 12,
    color: "#596173",
  },

  // ── Summary Cards ───────────────────────
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8F5E9",
    padding: 16,
    marginBottom: 12,
  },
  summaryCardOrange: {
    backgroundColor: "#FFF8F0",
    borderColor: "#FFE0CC",
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  summaryHexSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    transform: [{ rotate: "0deg" }],
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  summaryBadgesPreview: {
    flexDirection: "row",
    marginRight: 8,
  },
  miniHex: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  miniHexInner: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#9E9E9E",
  },
});

export default BadgeCatalogueScreen;
