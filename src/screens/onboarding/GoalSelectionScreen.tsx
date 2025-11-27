import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import SelectionButton from "../../components/SelectionButton";
import CustomButton from "../../components/CustomButton";

interface Props {
  navigation: any;
  route: any;
}

const goalOptions = [
  { id: "grow-wealth", label: "Grow wealth" },
  { id: "passive-income", label: "Build passive income" },
  { id: "financial-independence", label: "Financial independence" },
  { id: "retire-wealthy", label: "Retire Wealthy" },
  { id: "learn-skills", label: "Learn useful skills" },
  { id: "travel-world", label: "Travel the world" },
];

const GoalSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedGoal, setSelectedGoal] = useState<string>("");

  const handleContinue = () => {
    if (!selectedGoal) return;

    navigation.navigate("ReferralSource", {
      registrationData: route.params.registrationData,
      age: route.params.age,
      learningLimit: route.params.learningLimit,
      mainGoal: selectedGoal,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Money Quest</Text>
        </View>

        {/* Main Title */}
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>What's your main goal?</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {goalOptions.map((option) => (
            <SelectionButton
              key={option.id}
              label={option.label}
              isSelected={selectedGoal === option.id}
              onPress={() => setSelectedGoal(option.id)}
            />
          ))}
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <CustomButton
          title={"Continue"}
          onPress={handleContinue}
          disabled={!selectedGoal}
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 50,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212121",
  },
  mainHeader: {
    alignItems: "center",
    marginBottom: 60,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212121",
    textAlign: "center",
  },
  optionsContainer: {
    marginBottom: 40,
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default GoalSelectionScreen;
