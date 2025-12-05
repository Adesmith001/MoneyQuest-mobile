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
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  onClose,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [displayLives, setDisplayLives] = useState(5);

  // Update lives display from user data (Appwrite)
  useEffect(() => {
    if (user) {
      const { lives } = livesService.calculateCurrentLives(
        user.lives || 5,
        user.lastLifeRegenTime || new Date().toISOString()
      );
      setDisplayLives(lives);
    }
  }, [user?.lives, user?.lastLifeRegenTime]);

  return (
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "83%",
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
});

export default ProgressBar;
