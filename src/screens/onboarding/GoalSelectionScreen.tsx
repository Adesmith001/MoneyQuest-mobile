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
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = () => {
    if (selectedGoals.length === 0) return;

    navigation.navigate("ReferralSource", {
      registrationData: route.params.registrationData,
      age: route.params.age,
      learningLimit: route.params.learningLimit,
      mainGoal: selectedGoals.join(", "),
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
          <Text style={styles.mainTitle}>What are your main goals?</Text>
          <Text style={styles.subtitle}>Select one or more</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {goalOptions.map((option) => (
            <SelectionButton
              key={option.id}
              label={option.label}
              isSelected={selectedGoals.includes(option.id)}
              onPress={() => toggleGoal(option.id)}
            />
          ))}
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <CustomButton
          title={"Continue"}
          onPress={handleContinue}
          disabled={selectedGoals.length === 0}
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
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
  subtitle: {
    fontSize: 14,
    color: "#757575",
    marginTop: 8,
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
