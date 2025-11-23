import React from "react";
import { Modal, View, Text, StyleSheet, Image } from "react-native";
import CustomButton from "../CustomButton";

interface CorrectAnswerModalProps {
  visible: boolean;
  onContinue: () => void;
  explanation?: string;
}

const CorrectAnswerModal: React.FC<CorrectAnswerModalProps> = ({
  visible,
  onContinue,
  explanation,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onContinue}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.handle} />
          <Image
            source={require("../../../assets/medal.png")}
            style={styles.medalEmoji}
          />
          <Text style={styles.modalTitle}>Correct</Text>
          <Text style={styles.modalSubtitle}>Keep going! 🚀</Text>
          {explanation && (
            <View style={styles.explanationContainer}>
              <Text style={styles.explanationText}>{explanation}</Text>
            </View>
          )}
          <CustomButton title="Continue" onPress={onContinue} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalView: {
    width: "100%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 2.5,
    position: "absolute",
    top: 10,
  },
  medalEmoji: {
    width: 95,
    height: 120,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  explanationContainer: {
    marginBottom: 20,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  explanationText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default CorrectAnswerModal;
