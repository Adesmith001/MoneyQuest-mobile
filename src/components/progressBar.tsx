import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useSelector } from "react-redux";
import { SPACING } from "../constants";
import { Ionicons } from '@expo/vector-icons';
import { RootState } from "../store";
import { livesService } from "../services/lives";

interface ProgressBarProps {
  progress: number;
  onClose: () => void;
  onGoToArticle?: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  onClose,
  onGoToArticle,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const gameHealth = useSelector((state: RootState) => state.game.health);
  const [displayLives, setDisplayLives] = useState(5);

  // Update lives display from Redux state (responds to immediate deductions)
  useEffect(() => {
    if (user) {
      // Calculate current lives considering regeneration
      const { lives } = livesService.calculateCurrentLives(
        user.lives !== undefined && user.lives !== null ? user.lives : 5,
        user.lastLifeRegenTime || new Date().toISOString()
      );
      
      // Use the lower of calculated lives or gameHealth (for immediate UI updates)
      const currentLives = gameHealth !== undefined ? Math.min(lives, gameHealth) : lives;
      setDisplayLives(Math.max(0, Math.min(5, currentLives)));
      
      console.log(`❤️ ProgressBar - Lives display updated: ${currentLives}`);
    }
  }, [user?.lives, user?.lastLifeRegenTime, gameHealth]);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={30} color="black" />
        </TouchableOpacity>
        <View style={styles.progressWrapper}>
          <View style={styles.progressContainer}>
            <View style={[styles.progress, { width: `${progress}%` }]} />
          </View>
        </View>
        <View style={styles.livesContainer}>
          <Ionicons name="heart" size={20} color="#FF5722" />
          <Text style={styles.livesText}>{displayLives}</Text>
        </View>
      </View>
      {onGoToArticle && (
        <TouchableOpacity
          style={styles.articleButton}
          onPress={onGoToArticle}
        >
          <Ionicons name="book-outline" size={16} color="#666" />
          <Text style={styles.articleButtonText}>Go To Article</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "95%",
  },
  closeButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  progressWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  progressContainer: {
    flex: 1,
    height: 16,
    backgroundColor: "#FFB8A3",
    borderRadius: 25,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    backgroundColor: "#FF5722",
    borderRadius: 25,
  },
  livesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FFE8E3",
  },
  livesText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF5722",
    marginLeft: 4,
  },
  articleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 4,
  },
  articleButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
});

export default ProgressBar;
