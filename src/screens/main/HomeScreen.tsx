import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { getAvatarById } from "../../utils/avatarUtils";
import {
  setCurrentLevel,
  setCurrentSection,
} from "../../store/slices/gameSlice";
import { backendApi } from "../../services/backendApi";
import { databases, DB_ID, COLLECTIONS, Query } from "../../services/appwrite";
import { BackendLevel } from "../../types";
import { useFocusEffect } from "@react-navigation/native";
import { updateUser } from "../../store/slices/authSlice";
import cacheService from "../../services/cacheService";
import LearningPathSkeleton from "../../components/skeletons/LearningPathSkeleton";

interface Props {
  navigation: any;
}

interface LevelNode {
  id: string; // Now UUID from backend
  sectionTitle: string;
  levelTitle: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  sectionId: string; // Now UUID
  levelId: string; // Now UUID
}

interface Section {
  id: string;
  title: string;
  levels: LevelNode[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedLevels, setCompletedLevels] = useState<Set<string>>(new Set());

  // Fetch sections and levels from backend when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      async function fetchLearningPath() {
        try {
          // 🚀 STEP 1: Load cached completed levels FIRST (instant!)
          const cachedCompletedLevels = await cacheService.getCompletedLevels();
          if (cachedCompletedLevels.length > 0) {
            console.log('📦 Loaded from cache:', cachedCompletedLevels);
            setCompletedLevels(new Set(cachedCompletedLevels));
            setIsLoading(false); // Show UI immediately!
          } else {
            setIsLoading(true);
          }

          // 🌐 STEP 2: Fetch fresh data from Appwrite in background
          if (user?.$id) {
            try {
              const progressDocs = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.USER_PROGRESS,
                [Query.equal('userId', user.$id), Query.equal('isCompleted', true)]
              );
              const completed = new Set(progressDocs.documents.map(doc => doc.level));
              setCompletedLevels(completed);
              console.log('🌐 Fetched from Appwrite:', Array.from(completed));

              // 💾 Save to cache for next time
              await cacheService.saveCompletedLevels(Array.from(completed));

              // If user has completed levels but no currentLevelId, update it
              if (completed.size > 0 && !user.currentLevelId) {
                const sortedCompletedLevels = Array.from(completed);
                const lastCompletedLevel = sortedCompletedLevels[sortedCompletedLevels.length - 1];

                await databases.updateDocument(
                  DB_ID,
                  COLLECTIONS.USERS,
                  user.$id,
                  {
                    currentLevelId: lastCompletedLevel,
                  }
                );

                dispatch(updateUser({ currentLevelId: lastCompletedLevel }));
              }
            } catch (error) {
              console.error('❌ Failed to fetch from Appwrite:', error);
              // If network fails, we still have cached data!
            }
          }

          // Get all sections (documents) from backend
          const backendSections = await backendApi.getSections();
          console.log('Fetched sections:', backendSections);

          // Find the first valid section ID for the "default unlock" logic
          const firstValidSectionId = backendSections.find(s => s.section_id)?.section_id;

          const sectionsData: Section[] = [];

          for (const section of backendSections) {
            try {
              // Skip sections without a valid section_id
              if (!section.section_id) {
                console.warn(`Section "${section.title}" has no section_id, skipping...`);
                continue;
              }

              // Fetch levels for this section using section_id
              const levels = await backendApi.getSectionLevels(section.section_id);
              console.log(`Levels for ${section.title}:`, levels);

              if (levels.length === 0) continue;

              const levelNodes: LevelNode[] = levels.map((level, levelIndex) => {
                // Use the section_id from the level for progress tracking
                const levelSectionId = level.section_id || section.section_id!;

                // Pass the firstValidSectionId to correctly identify the first level
                const progress = calculateLevelProgress(
                  levelSectionId,
                  level.level_id,
                  levelIndex,
                  levels,
                  firstValidSectionId
                );

                return {
                  id: level.level_id,
                  sectionTitle: section.title,
                  levelTitle: level.title,
                  sectionId: levelSectionId,
                  levelId: level.level_id,
                  ...progress,
                };
              });

              sectionsData.push({
                id: section.section_id,
                title: section.title,
                levels: levelNodes,
              });
            } catch (error) {
              console.error(`Failed to fetch levels for section ${section.title}:`, error);
            }
          }

          setSections(sectionsData);
        } catch (error) {
          console.error('Failed to fetch learning path:', error);
          Alert.alert(
            'Error',
            'Failed to load learning path. Please check your connection and try again.'
          );
        } finally {
          setIsLoading(false);
        }
      }

      fetchLearningPath();
    }, [user?.$id, user?.currentLevelId, user?.currentSectionId])
  );

  // Calculate level progress based on user's current position
  const calculateLevelProgress = (
    sectionId: string,
    levelId: string,
    levelIndex: number,
    sectionLevels: any[],
    firstSectionId?: string
  ) => {
    const currentSectionId = user?.currentSectionId;
    const currentLevelId = user?.currentLevelId;

    // Check if this level is completed
    const isCompleted = completedLevels.has(levelId);

    // If no progress, only unlock first level of first section
    if (!currentSectionId || !currentLevelId) {
      // Use the passed firstSectionId if available (during initial load), otherwise fallback to state
      const targetFirstSectionId = firstSectionId || sections[0]?.id;
      const isFirstLevel = levelIndex === 0 && sectionId === targetFirstSectionId;

      return {
        isUnlocked: isFirstLevel || isCompleted,
        isCompleted,
        isCurrent: isFirstLevel,
      };
    }

    const isCurrent = sectionId === currentSectionId && levelId === currentLevelId;

    // Check if previous level is completed to unlock this level
    let isUnlocked = isCurrent || isCompleted;
    if (levelIndex > 0) {
      const previousLevel = sectionLevels[levelIndex - 1];
      isUnlocked = isUnlocked || completedLevels.has(previousLevel.level_id);
    } else if (levelIndex === 0) {
      // First level of section is unlocked if:
      // 1. It's completed OR
      // 2. Previous section is fully completed OR
      // 3. It's the first section
      if (!isCompleted) {
        const currentSectionIndex = sections.findIndex(s => s.id === sectionId);
        if (currentSectionIndex > 0) {
          // Check if previous section is completed
          const previousSection = sections[currentSectionIndex - 1];
          const previousSectionCompleted = previousSection.levels.every(
            level => completedLevels.has(level.levelId)
          );
          isUnlocked = previousSectionCompleted;
        } else {
          // First section, first level is always unlocked
          isUnlocked = true;
        }
      }
    }

    return { isUnlocked, isCompleted, isCurrent };
  };

  const renderLevelNode = (
    node: LevelNode,
    index: number,
    isLast: boolean,
    sectionIndex: number
  ) => {
    const isLeftSide = index % 2 === 0;

    const handleNodePress = async () => {
      if (node.isUnlocked || node.isCurrent) {
        // Update user's current progress in Appwrite
        try {
          if (user?.$id) {
            await databases.updateDocument(
              DB_ID,
              COLLECTIONS.USERS,
              user.$id,
              {
                currentLevelId: node.levelId,
                currentSectionId: node.sectionId,
              }
            );
          }
        } catch (error) {
          console.error('Failed to update progress:', error);
        }

        navigation.navigate("Question", {
          levelId: node.levelId,
          sectionId: node.sectionId,
          levelTitle: node.levelTitle,
          sectionTitle: node.sectionTitle,
        });
      }
    };

    return (
      <View key={node.id} style={styles.levelContainer}>
        {/* Path Connector */}
        {!isLast && (
          <Svg style={styles.pathSvg}>
            <Path
              d={
                isLeftSide
                  ? `M ${screenWidth * 0.25 + 10}, 45 C ${screenWidth * 0.25 + 80
                  }, 100, ${screenWidth * 0.75 - 80}, 80, ${screenWidth * 0.75 - 10
                  }, 145`
                  : `M ${screenWidth * 0.75 - 10}, 45 C ${screenWidth * 0.75 - 80
                  }, 100, ${screenWidth * 0.25 + 80}, 80, ${screenWidth * 0.25 + 10
                  }, 145`
              }
              stroke="#FF5C02"
              strokeWidth="5"
              fill="none"
            />
          </Svg>
        )}

        <View style={[styles.levelRow, !isLeftSide && styles.levelRowReverse]}>
          {/* Level node */}
          <View style={styles.nodeWrapper}>
            <TouchableOpacity
              style={[
                styles.levelNode,
                node.isCurrent && styles.currentLevelNode,
                node.isCompleted && styles.completedLevelNode,
                !node.isUnlocked && !node.isCurrent && styles.lockedNode,
              ]}
              onPress={handleNodePress}
              disabled={!node.isUnlocked && !node.isCurrent}
            >
              {node.isCurrent ? (
                <Image
                  source={require("../../../assets/starIcon.png")}
                  style={styles.starIcon}
                />
              ) : node.isCompleted ? (
                <Text style={styles.completedNodeIcon}>✓</Text>
              ) : node.isUnlocked ? (
                <Text style={styles.nodeIcon}>🔓</Text>
              ) : (
                <Image
                  source={require("../../../assets/lockIcon.png")}
                  style={styles.starIcon}
                />
              )}
            </TouchableOpacity>
            {/* Removed level title display - users can see it when they click */}
          </View>
        </View>

        {/* Avatar next to current level */}
        {node.isCurrent && (
          <View
            style={[
              styles.avatarContainer,
              isLeftSide ? styles.avatarLeft : styles.avatarRight,
            ]}
          >
            <View style={styles.avatar}>
              <Image
                source={getAvatarById(user?.avatar)}
                style={styles.avatarImage}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (section: Section, sectionIndex: number) => {
    return (
      <View key={section.id} style={styles.pageContainer}>
        {/* Cloud decorations */}
        <View style={styles.cloudsContainer}>
          <Text style={[styles.cloud, { top: 20, left: 30 }]}>☁️</Text>
          <Text style={[styles.cloud, { top: 60, right: 40 }]}>☁️</Text>
          <Text style={[styles.cloud, { top: 100, left: screenWidth * 0.6 }]}>
            ☁️
          </Text>
          <Text style={[styles.cloud, { top: 200, right: 20, fontSize: 40 }]}>
            ☁️
          </Text>
          <Text style={[styles.cloud, { top: 350, left: 20, fontSize: 45 }]}>
            ☁️
          </Text>
          <Text style={[styles.cloud, { top: 500, right: 50, fontSize: 35 }]}>
            ☁️
          </Text>
        </View>

        <ScrollView
          style={styles.sectionScrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>
                  {section.title}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {section.levels.length} {section.levels.length === 1 ? 'Level' : 'Levels'}
                </Text>
              </View>
              <View style={styles.bookIcon}>
                <Image
                  source={require("../../../assets/bookIcon.png")}
                  style={styles.bookIconImage}
                />
              </View>
            </View>
          </View>

          <View style={styles.levelsContainer}>
            {section.levels
              .slice()
              .reverse()
              .map((node, reverseIndex) => {
                const originalIndex = section.levels.length - 1 - reverseIndex;
                return renderLevelNode(
                  node,
                  originalIndex,
                  originalIndex === 0, // First level is now at bottom
                  sectionIndex
                );
              })}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LearningPathSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {sections.map((section, index) => renderSection(section, index))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8F5", // Light blue sky background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: screenWidth,
    height: "100%",
  },
  sectionScrollView: {
    flex: 1,
  },
  cloudsContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  cloud: {
    position: "absolute",
    fontSize: 32,
    opacity: 0.4,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 24,
    marginTop: 40,
    marginBottom: 30,
  },
  sectionHeader: {
    backgroundColor: "#FF5722", // Orange
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 2,
  },
  bookIcon: {
    marginLeft: 12,
  },
  bookIconImage: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  starIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  levelsContainer: {
    paddingHorizontal: 0,
    marginTop: 20,
  },
  levelContainer: {
    height: 150,
    position: "relative",
  },
  pathSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    position: "absolute",
    top: 0,
  },
  levelRowReverse: {
    justifyContent: "flex-end",
  },
  nodeWrapper: {
    width: screenWidth / 2,
    alignItems: "center",
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    maxWidth: screenWidth / 2 - 40,
  },
  currentLevelTitle: {
    color: "#FF5722",
    fontWeight: "bold",
  },
  lockedLevelTitle: {
    color: "#999",
  },
  levelNode: {
    width: 50,
    height: 50,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FF9800", // Orange border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  currentLevelNode: {
    width: 50,
    height: 50,
    borderRadius: 45,
    backgroundColor: "#FF5722", // Orange for current level
    borderColor: "#FFC107",
    borderWidth: 5,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  completedLevelNode: {
    backgroundColor: "#4CAF50", // Green for completed levels
    borderColor: "#2E7D32",
    borderWidth: 4,
  },
  lockedNode: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E0E0E0",
    opacity: 0.8,
  },
  nodeIcon: {
    fontSize: 20,
    color: "#FF9800", // Orange for unlocked
  },
  completedNodeIcon: {
    fontSize: 20,
    color: "#FFFFFF", // White checkmark for completed
    fontWeight: "bold",
  },
  avatarContainer: {
    position: "absolute",
    zIndex: 10,
  },
  avatarLeft: {
    top: 30,
    left: screenWidth * 0.25 - 70,
  },
  avatarRight: {
    top: 30,
    right: screenWidth * 0.25 - 70,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
});

export default HomeScreen;