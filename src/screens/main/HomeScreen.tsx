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
import { databases, DB_ID, COLLECTIONS } from "../../services/appwrite";
import { BackendLevel } from "../../types";

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

  // Fetch sections and levels from backend
  useEffect(() => {
    async function fetchLearningPath() {
      try {
        setIsLoading(true);
        
        // Get all sections (documents) from backend
        const backendSections = await backendApi.getSections();
        console.log('Fetched sections:', backendSections);

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

            const levelNodes: LevelNode[] = levels.map((level) => {
              // Use the section_id from the level for progress tracking
              const levelSectionId = level.section_id || section.section_id!;
              const progress = calculateLevelProgress(levelSectionId, level.level_id);
              
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
  }, [user]);

  // Calculate level progress based on user's current position
  const calculateLevelProgress = (sectionId: string, levelId: string) => {
    const currentSectionId = user?.currentSectionId;
    const currentLevelId = user?.currentLevelId;

    // If no progress, start at first level
    if (!currentSectionId || !currentLevelId) {
      return { 
        isUnlocked: sections.length === 0 || (sectionId === sections[0]?.id && levelId === sections[0]?.levels[0]?.id),
        isCompleted: false, 
        isCurrent: sections.length === 0 || (sectionId === sections[0]?.id && levelId === sections[0]?.levels[0]?.id),
      };
    }

    const isCurrent = sectionId === currentSectionId && levelId === currentLevelId;
    
    // TODO: Implement proper completed level tracking with backend progress API
    // For now, we'll use simple logic
    const isCompleted = false; // Would need to check getUserLevelProgress
    const isUnlocked = isCurrent; // Only current level is unlocked for now

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
                  ? `M ${screenWidth * 0.25 + 10}, 45 C ${
                      screenWidth * 0.25 + 80
                    }, 100, ${screenWidth * 0.75 - 80}, 80, ${
                      screenWidth * 0.75 - 10
                    }, 145`
                  : `M ${screenWidth * 0.75 - 10}, 45 C ${
                      screenWidth * 0.75 - 80
                    }, 100, ${screenWidth * 0.25 + 80}, 80, ${
                      screenWidth * 0.25 + 10
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
            <Text
              style={[
                styles.levelTitle,
                node.isCurrent && styles.currentLevelTitle,
                !node.isUnlocked && !node.isCurrent && styles.lockedLevelTitle,
              ]}
              numberOfLines={2}
            >
              {node.levelTitle}
            </Text>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5C02" />
          <Text style={styles.loadingText}>Loading learning path...</Text>
        </View>
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
