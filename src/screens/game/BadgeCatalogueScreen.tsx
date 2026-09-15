import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootState, AppDispatch } from "../../store";
import { fetchBadgeCatalogue } from "../../store/slices/gamificationSlice";
import { BadgeCategory } from "../../types/gamification";
import { COLORS } from "../../constants";
import {
  getBadgeUnlockHint,
  getBadgeUnlockProgressLabel,
} from "../../utils/gamificationPresentation";
import { groupBadgesByCategory } from "../../utils/badgeCategories";

interface Props {
  navigation: any;
  route?: { params?: { category?: BadgeCategory } };
}

const CATEGORY_DETAILS: Record<BadgeCategory, {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  foreground: string;
  background: string;
}> = {
  JOURNEY: { title: "Journey Badges", description: "Progress across all lessons", icon: "map-outline", foreground: "#527A2B", background: "#F3F8ED" },
  SECTION: { title: "Section Badges", description: "Beginner, Builder and Pro in every topic", icon: "book-outline", foreground: "#3478B9", background: "#EEF5FC" },
  CONSISTENCY: { title: "Consistency Badges", description: "Rewards for building a lasting streak", icon: "flame-outline", foreground: "#D78612", background: "#FFF7EA" },
  ACHIEVEMENT: { title: "Achievement Badges", description: "Special learning milestones", icon: "trophy-outline", foreground: "#245AA6", background: "#EDF3FA" },
  QUEST: { title: "Quest Badges", description: "Rewards earned from quests", icon: "ribbon-outline", foreground: "#8C4DB1", background: "#F7F0FC" },
};

const BadgeCatalogueScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const badgeCatalogue = useSelector((state: RootState) => state.gamification.badgeCatalogue);
  const earnedCount = useSelector((state: RootState) => state.gamification.earnedBadgeCount);
  const totalCount = useSelector((state: RootState) => state.gamification.totalBadgeCount);
  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = Platform.OS === "web" ? Math.min(windowWidth, 480) : windowWidth;
  const badgeWidth = (layoutWidth - 40 - 16) / 3;

  useFocusEffect(
    useCallback(() => {
      if (user?.$id) dispatch(fetchBadgeCatalogue(user.$id));
    }, [dispatch, user?.$id])
  );

  const focusedCategory = route?.params?.category;
  const grouped = groupBadgesByCategory(badgeCatalogue);
  const categoryGroups = focusedCategory
    ? [...grouped.filter((group) => group.category === focusedCategory), ...grouped.filter((group) => group.category !== focusedCategory)]
    : grouped;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Badges & Achievements</Text>
            <Text style={styles.headerCount}>{earnedCount} of {totalCount} badges earned</Text>
          </View>
        </View>

        {categoryGroups.map((group) => {
          const details = CATEGORY_DETAILS[group.category];
          return (
            <View key={group.category} style={styles.categorySection}>
              <View style={[styles.categoryHeader, { backgroundColor: details.background }]}>
                <View style={[styles.categoryIcon, { backgroundColor: `${details.foreground}18` }]}>
                  <Ionicons name={details.icon} size={22} color={details.foreground} />
                </View>
                <View style={styles.categoryCopy}>
                  <Text style={styles.categoryTitle}>{details.title}</Text>
                  <Text style={styles.categoryDescription}>{details.description}</Text>
                </View>
                <Text style={[styles.categoryCount, { color: details.foreground }]}>
                  {group.earnedCount}/{group.totalCount}
                </Text>
              </View>

              <View style={styles.badgeGrid}>
                {group.items.map((badge) => {
                  const progress = badge.target_value > 0
                    ? Math.min(badge.progress_value / badge.target_value, 1)
                    : 0;
                  return (
                    <View key={badge.badge_definition_id} style={[styles.badgeItem, { width: badgeWidth }]}>
                      <View style={[styles.badgeArt, !badge.is_earned && styles.badgeArtLocked]}>
                        {badge.asset_reference ? (
                          <Image
                            source={{ uri: badge.asset_reference }}
                            style={[styles.badgeImage, !badge.is_earned && styles.badgeImageLocked]}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons
                            name={badge.is_earned ? "medal" : "lock-closed"}
                            size={30}
                            color={badge.is_earned ? details.foreground : "#727A8B"}
                          />
                        )}
                      </View>
                      <Text style={[styles.badgeName, !badge.is_earned && styles.badgeNameLocked]}>{badge.name}</Text>
                      <Text style={styles.badgeDescription}>{badge.description}</Text>
                      {!badge.is_earned && (
                        <View style={styles.unlockPanel}>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: details.foreground }]} />
                          </View>
                          <Text style={[styles.progressLabel, { color: details.foreground }]}>{getBadgeUnlockProgressLabel(badge)}</Text>
                          <Text style={styles.unlockHint}>{getBadgeUnlockHint(badge)}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
                {group.items.length === 0 && (
                  <Text style={styles.emptyCategoryText}>Badge designs coming soon.</Text>
                )}
              </View>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  backButton: { padding: 8, marginLeft: -8, marginRight: 4 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A2E" },
  headerCount: { marginTop: 3, fontSize: 13, fontWeight: "700", color: "#687085" },
  categorySection: { marginBottom: 26 },
  categoryHeader: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 13, marginBottom: 14 },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 11 },
  categoryCopy: { flex: 1, paddingRight: 8 },
  categoryTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A2E" },
  categoryDescription: { fontSize: 11, lineHeight: 15, color: "#687085", marginTop: 2 },
  categoryCount: { fontSize: 14, fontWeight: "900" },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "stretch" },
  badgeItem: { minHeight: 220, alignItems: "center", paddingBottom: 8 },
  badgeArt: { width: "100%", aspectRatio: 1, borderRadius: 16, borderWidth: 2, borderColor: "#C5CEE0", backgroundColor: "#E8EDF5", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  badgeArtLocked: { backgroundColor: "#E5E7EB", borderColor: "#C9CDD6" },
  badgeImage: { width: "88%", height: "88%" },
  badgeImageLocked: { opacity: 0.3 },
  badgeName: { minHeight: 32, marginTop: 7, paddingHorizontal: 2, fontSize: 12, lineHeight: 15, fontWeight: "800", color: "#1A1A2E", textAlign: "center" },
  badgeNameLocked: { color: "#687085" },
  badgeDescription: { minHeight: 42, marginTop: 3, paddingHorizontal: 2, fontSize: 9, lineHeight: 12, color: "#687085", textAlign: "center" },
  unlockPanel: { width: "100%", marginTop: 6, padding: 6, borderRadius: 9, backgroundColor: "#F3F6FB" },
  progressTrack: { height: 4, borderRadius: 999, backgroundColor: "#DDE5F2", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  progressLabel: { marginTop: 5, fontSize: 9, lineHeight: 12, fontWeight: "800", textAlign: "center" },
  unlockHint: { marginTop: 2, fontSize: 8, lineHeight: 11, color: "#687085", textAlign: "center" },
  emptyCategoryText: { width: "100%", paddingVertical: 18, color: "#8A91A1", fontSize: 12, fontWeight: "600", textAlign: "center" },
});

export default BadgeCatalogueScreen;
