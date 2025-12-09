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
  onNext: () => void;
}

const { width, height } = Dimensions.get("window");

const OnboardingScreen1: React.FC<Props> = ({ onNext }) => {
  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Money Quest</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.welcomeText}>
            Learn. Play. Grow.
          </Text>

          {/* Next Button */}
          <CustomButton title="Next" onPress={() => onNext()} />
        </View>

        {/* Character Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require("../../../assets/welcomeScreen.png")}
            style={styles.illustration}
          />
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 60,
    paddingBottom: "35%",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 25,
    color: "#000000",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  illustrationContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    justifyContent: "flex-end",
  },
  illustration: {
    width: width,
    height: height * 0.4,
    resizeMode: "cover",
  },
});

export default OnboardingScreen1;
