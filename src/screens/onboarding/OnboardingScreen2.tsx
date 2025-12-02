import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import CustomButton from "../../components/CustomButton";

interface Props {
  onComplete: () => void;
}

const { width, height } = Dimensions.get("window");

const OnboardingScreen2: React.FC<Props> = ({ onComplete }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Money Quest</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Main Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require("../../../assets/onBoardingScreen.png")}
            style={styles.illustration}
          />
        </View>

        {/* Welcome Text */}
        <Text style={styles.welcomeText}>
          Welcome to our app where you learn how to work with financial tools
          and all that is there
        </Text>
      </View>

      {/* Next Button */}
      <CustomButton title="Next" onPress={() => onComplete()} style={styles.nextButton} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  illustration: {
    width: width * 0.8,
    resizeMode: "contain",
  },
  welcomeText: {
    fontSize: 20,
    color: "#000000",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 20,
    paddingHorizontal: 16,
    fontWeight: "600",
  },
  nextButton: {
    marginBottom: 32,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  progressContainer: {
    alignItems: "center",
    paddingBottom: 24,
  },
  progressBar: {
    width: width * 0.6,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
  },
});

export default OnboardingScreen2;
