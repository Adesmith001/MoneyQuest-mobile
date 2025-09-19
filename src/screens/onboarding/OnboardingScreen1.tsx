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
            Welcome to our app where you learn how to work with financial tool
            and all that is there
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
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 80,
    paddingBottom: "40%",
    paddingHorizontal: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  welcomeText: {
    fontSize: 20,
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
