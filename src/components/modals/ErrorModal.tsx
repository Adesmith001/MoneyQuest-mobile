import React from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING } from "../../constants";

interface Props {
  title: string;
  message: string;
  dismissLabel?: string;
  action?: { label: string; onPress: () => void };
  onDismiss: () => void;
}

export default function ErrorModal({ title, message, dismissLabel, action, onDismiss }: Props) {
  return (
    <Modal
      transparent
      animationType="fade"
      accessibilityLabel={title}
      onShow={Keyboard.dismiss}
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <ScrollView style={styles.messageContainer}>
            <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
          </ScrollView>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onDismiss} style={[styles.action, !action && styles.primaryAction]}>
              <Text style={action ? styles.dismissLabel : styles.primaryLabel}>{dismissLabel ?? "Dismiss"}</Text>
            </Pressable>
            {action && (
              <Pressable accessibilityRole="button" onPress={action.onPress} style={[styles.action, styles.primaryAction]}>
                <Text style={styles.primaryLabel}>{action.label}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "flex-end",
    padding: SPACING.md,
    backgroundColor: COLORS.overlayLight,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "100%",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.card,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  messageContainer: {
    flexGrow: 0,
    flexShrink: 1,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  action: {
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  primaryAction: {
    backgroundColor: COLORS.text,
  },
  dismissLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  primaryLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.card,
  },
});
