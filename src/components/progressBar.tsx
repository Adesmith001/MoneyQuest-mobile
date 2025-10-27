import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SPACING } from "../constants";
import { Ionicons } from '@expo/vector-icons';

interface ProgressBarProps {
  progress: number;
  onClose: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  onClose,
}) => {
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
  healthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default ProgressBar;
