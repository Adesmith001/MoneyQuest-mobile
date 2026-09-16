import React, { useCallback } from "react";
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import BadgeHexagon from "../../components/gamification/BadgeHexagon";
import { FONT_FAMILY } from "../../constants";
import { AppDispatch, RootState } from "../../store";
import { fetchBadgeCatalogue } from "../../store/slices/gamificationSlice";
import { BadgeCategory } from "../../types/gamification";
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
  ACHIEVEMENT: { title: "Achievements", description: "Milestones that show your progress", icon: "trophy-outline", foreground: "#18559E", background: "#EEF4FB" },
  JOURNEY: { title: "Journey", description: "Track your learning and growth", icon: "map-outline", foreground: "#668A34", background: "#F2F6ED" },
  QUEST: { title: "Quests", description: "Complete tasks and earn rewards", icon: "ribbon-outline", foreground: "#FF9D36", background: "#FFF5EA" },
  SECTION: { title: "Sections", description: "Master every money topic", icon: "book-outline", foreground: "#3478B9", background: "#EEF5FC" },
  CONSISTENCY: { title: "Consistency", description: "Build strong learning habits", icon: "flame-outline", foreground: "#8C4DB1", background: "#F7F0FC" },
};

const FALLBACK_ORDER: BadgeCategory[] = ["ACHIEVEMENT", "JOURNEY", "QUEST", "SECTION", "CONSISTENCY"];

const BadgeCatalogueScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.auth.user?.$id);
  const catalogue = useSelector((state: RootState) => state.gamification.badgeCatalogue);
  const { width } = useWindowDimensions();
  const layoutWidth = Platform.OS === "web" ? Math.min(width, 480) : width;
  const badgeWidth = (layoutWidth - 56) / 3;

  useFocusEffect(
    useCallback(() => {
      if (userId) dispatch(fetchBadgeCatalogue(userId));
    }, [dispatch, userId])
  );

  const groups = groupBadgesByCategory(catalogue);
  const focusedCategory = route?.params?.category || "ACHIEVEMENT";
  const activeGroup = groups.find((group) => group.category === focusedCategory) || groups[0];
  const categoryGroups = FALLBACK_ORDER
    .filter((category) => category !== activeGroup.category)
    .map((category) => groups.find((group) => group.category === category)!)
    .filter(Boolean);
  const activeDetails = CATEGORY_DETAILS[activeGroup.category];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Badges & Achievements</Text>
        </View>

        <View style={styles.activeCategoryHeader}>
          <BadgeHexagon size={36} fill={activeDetails.foreground} borderColor={activeDetails.foreground} />
          <Text style={styles.activeCategoryTitle}>{activeDetails.title}</Text>
          <Text style={[styles.categoryCount, { color: activeDetails.foreground }]}>
            {activeGroup.earnedCount}/{activeGroup.totalCount}
          </Text>
        </View>

        <View style={styles.badgeGrid}>
          {activeGroup.items.map((badge) => (
            <View key={badge.badge_definition_id} style={[styles.badgeItem, { width: badgeWidth }]}>
              <BadgeHexagon
                size={badgeWidth}
                fill={badge.is_earned ? activeDetails.foreground : "#6E6E6E"}
                borderColor={badge.is_earned ? activeDetails.foreground : "#A7A7A7"}
              >
                {badge.asset_reference ? (
                  <Image
                    source={{ uri: badge.asset_reference }}
                    style={[styles.badgeImage, !badge.is_earned && styles.badgeImageLocked]}
                    resizeMode="contain"
                  />
                ) : badge.is_earned ? (
                  <Ionicons name="medal" size={badgeWidth * 0.34} color="#FFFFFF" />
                ) : null}
              </BadgeHexagon>
              <Text style={[styles.badgeName, !badge.is_earned && styles.badgeNameLocked]}>{badge.name}</Text>
            </View>
          ))}
        </View>

        {categoryGroups.map((group) => {
          const details = CATEGORY_DETAILS[group.category];
          return (
            <TouchableOpacity
              key={group.category}
              style={[styles.categoryCard, { backgroundColor: details.background }]}
              onPress={() => navigation.push("BadgeCatalogue", { category: group.category })}
            >
              <BadgeHexagon size={72} fill={details.foreground} borderColor={details.foreground}>
                <Ionicons name={details.icon} size={28} color="#FFFFFF" />
              </BadgeHexagon>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryTitle}>{details.title}</Text>
                <Text style={styles.categoryDescription}>{details.description}</Text>
                <Text style={[styles.categoryProgress, { color: details.foreground }]}>
                  {group.earnedCount}/{group.totalCount}
                </Text>
              </View>
              <View style={styles.previewRow}>
                {[0, 1, 2].map((index) => {
                  const badge = group.items[index];
                  return (
                    <BadgeHexagon
                      key={badge?.badge_definition_id || `${group.category}-${index}`}
                      size={32}
                      fill={badge?.is_earned ? details.foreground : "#687078"}
                      borderColor="#9AA3AE"
                    />
                  );
                })}
              </View>
              <Ionicons name="chevron-forward" size={22} color={details.foreground} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 26 },
  backButton: { padding: 8, marginLeft: -8, marginRight: 4 },
  headerTitle: { fontFamily: FONT_FAMILY, fontSize: 24, color: "#111111" },
  activeCategoryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  activeCategoryTitle: { flex: 1, marginLeft: 8, fontFamily: FONT_FAMILY, fontSize: 19, color: "#111111" },
  categoryCount: { fontFamily: FONT_FAMILY, fontSize: 15 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 16, marginBottom: 28 },
  badgeItem: { alignItems: "center" },
  badgeImage: { width: "84%", height: "84%" },
  badgeImageLocked: { opacity: 0.3 },
  badgeName: { minHeight: 34, marginTop: 5, paddingHorizontal: 2, fontFamily: FONT_FAMILY, fontSize: 13, lineHeight: 16, color: "#202020", textAlign: "center" },
  badgeNameLocked: { color: "#666666" },
  categoryCard: {
    minHeight: 112,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryCopy: { flex: 1, marginLeft: 12, paddingRight: 6 },
  categoryTitle: { fontFamily: FONT_FAMILY, fontSize: 17, color: "#111111" },
  categoryDescription: { marginTop: 3, fontSize: 13, lineHeight: 17, fontWeight: "600", color: "#1F1F1F" },
  categoryProgress: { marginTop: 4, fontFamily: FONT_FAMILY, fontSize: 13 },
  previewRow: { flexDirection: "row", gap: 2, marginRight: 3 },
});

export default BadgeCatalogueScreen;
