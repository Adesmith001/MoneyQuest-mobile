import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import SelectionButton from "../../components/SelectionButton";
import CustomButton from "../../components/CustomButton";
import analyticsService from "../../services/analytics";

interface Props {
  navigation: any;
  route: any;
}

const referralOptions = [
  { id: "facebook", label: "Facebook" },
  { id: "google", label: "Google" },
  { id: "friends", label: "Friends" },
  { id: "linkedin", label: "LinkedIn" },
  {
    id: "playstore-appstore",
    label: Platform.OS === "ios" ? "App Store" : "Play Store",
  },
  { id: "others", label: "Others" },
];

const ReferralSourceScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedSource, setSelectedSource] = useState<string>("");

  const handleContinue = () => {
    if (!selectedSource) return;

    analyticsService
      .trackOnboardingStep("referral_source_selection", {
        referral_source: selectedSource,
      })
      .catch(() => {});
    navigation.navigate("AvatarSelection", {
      registrationData: route.params.registrationData,
      age: route.params.age,
      learningLimit: route.params.learningLimit,
      mainGoal: route.params.mainGoal,
      referralSource: selectedSource,
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
            <Text style={styles.mainTitle}>Where did you hear about us?</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {referralOptions.map((option) => (
              <SelectionButton
                key={option.id}
                label={option.label}
                isSelected={selectedSource === option.id}
                onPress={() => setSelectedSource(option.id)}
              />
            ))}
          </View>

          <View style={styles.spacer} />

          {/* Continue Button */}
          <CustomButton
            title={"Continue"}
            onPress={handleContinue}
            disabled={!selectedSource}
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

export default ReferralSourceScreen;
