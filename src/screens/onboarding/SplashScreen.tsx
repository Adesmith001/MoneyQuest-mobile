import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
} from "react-native";

interface Props {
  onComplete: () => void;
}

const { width, height } = Dimensions.get("window");

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FF5722" barStyle="light-content" />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logo}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF5722",
    justifyContent: "space-between",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: "contain",
    justifyContent: "center",
  },
});

export default SplashScreen;
