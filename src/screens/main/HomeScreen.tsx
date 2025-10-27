import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { getAvatarById } from "../../utils/avatarUtils";
import {
  setCurrentLevel,
  setCurrentSection,
} from "../../store/slices/gameSlice";
import lessonsData from "../../data/lessons.json";

interface Props {
  navigation: any;
}

interface LevelNode {
  id: number;
  sectionTitle: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  sectionId: number;
  levelId: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentLevel, currentSection } = useSelector(
    (state: RootState) => state.game
  );
  const dispatch = useDispatch();

  // Save user progress when component mounts or changes
  useEffect(() => {
    // Redux store with redux-persist automatically saves state
    // This ensures user can return to their previous progress
  }, [currentLevel, currentSection]);

  // Calculate user progress dynamically
  const calculateUserProgress = (sectionId: number, levelId: number) => {
    if (
      sectionId < currentSection ||
      (sectionId === currentSection && levelId < currentLevel)
    ) {
      // Completed levels
      return { isUnlocked: true, isCompleted: true, isCurrent: false };
    } else if (sectionId === currentSection && levelId === currentLevel) {
      // Current level
      return { isUnlocked: true, isCompleted: false, isCurrent: true };
    } else {
      // Locked levels - only unlock the very next level
      const isNextLevel =
        (sectionId === currentSection && levelId === currentLevel + 1) ||
        (sectionId === currentSection + 1 &&
          levelId === 1 &&
          currentLevel ===
            lessonsData.find((s) => s.id === currentSection)?.levels.length);

      return {
        isUnlocked: isNextLevel,
        isCompleted: false,
        isCurrent: false,
      };
    }
  };

  // Define the learning path sections based on the lessons.json file
  const sections: LevelNode[][] = lessonsData.map((section) => {
    return section.levels.map((level) => {
      return {
        id: parseInt(`${section.id}${level.id}`), // Create a unique ID
        sectionTitle: section.title,
        sectionId: section.id,
        levelId: level.id,
        ...calculateUserProgress(section.id, level.id),
      };
    });
  });

  const renderLevelNode = (
    node: LevelNode,
    index: number,
    isLast: boolean,
    sectionIndex: number
  ) => {
    const isLeftSide = index % 2 === 0;

    const handleNodePress = () => {
      if (node.isUnlocked || node.isCurrent) {
        // Update Redux state to save progress
        dispatch(setCurrentLevel(node.levelId));
        dispatch(setCurrentSection(node.sectionId));

        navigation.navigate("Question", {
          level: node.levelId,
          section: node.sectionId,
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

  const renderSection = (section: LevelNode[], sectionIndex: number) => {
    return (
      <View key={sectionIndex} style={styles.pageContainer}>
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
                  Section {sectionIndex + 1}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {section[0].sectionTitle}
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
            {section
              .slice()
              .reverse()
              .map((node, reverseIndex) => {
                const originalIndex = section.length - 1 - reverseIndex;
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
