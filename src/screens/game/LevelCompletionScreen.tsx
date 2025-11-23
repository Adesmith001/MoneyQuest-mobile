import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import FeedbackModal from '../../components/modals/FeedbackModal';
import { openFeedbackForm } from '../../utils/linking';

const { width } = Dimensions.get("window");

interface Props {
  navigation: any;
  route: {
    params: {
      xpGained: number;
      accuracy: number;
    };
  };
}

const LessonCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { xpGained, accuracy } = route.params;
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);

  // Show the feedback modal after a short delay
  useEffect(() => {
    // TODO: Add logic here to decide when to show the modal,
    // e.g., based on level number or user progress.
    const timer = setTimeout(() => {
      setFeedbackModalVisible(true);
    }, 1500); // 1.5-second delay

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigation.popToTop();
  };

  const handleRate = () => {
    openFeedbackForm();
    setFeedbackModalVisible(false);
    handleContinue();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require(`../../../assets/fox.png`)}
          style={styles.foxImage}
        />
        <Text style={styles.title}>Lesson Complete</Text>

        <View style={styles.statsContainer}>
          {/* Total XP Box */}
          <View style={styles.statBox}>
            <View style={styles.statLabelContainer}>
              <Text style={styles.statLabel}>TOTAL XP</Text>
            </View>
            <View style={styles.statValueContainer}>
              <View style={styles.statValueContent}>
                {/* Replace with your XP icon */}
                <Image
                  source={require("../../../assets/xp-icon.png")} 
                  style={styles.statIcon}
                />
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {xpGained}
                </Text>
              </View>
            </View>
          </View>

          {/* Accuracy Box */}
          <View style={styles.statBox}>
            <View
              style={[
                styles.statLabelContainer,
                { backgroundColor: "#211E54" },
              ]}
            >
              <Text style={styles.statLabel}>GOOD</Text>
            </View>
            <View
              style={[
                styles.statValueContainer,
                { borderColor: "#211E54" },
              ]}
            >
              <View style={styles.statValueContent}>
                {/* Replace with your accuracy icon */}
                <Image
                  source={require("../../../assets/accuracy-icon.png")} 
                  style={styles.statIcon}
                />
                <Text style={[styles.statValue, { color: "#211E54" }]}>
                  {accuracy}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <CustomButton title="Continue" onPress={handleContinue} />
        </View>
      </View>

      <FeedbackModal
        visible={isFeedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onRate={handleRate}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  foxImage: {
    width: 341,
    height: 342,
    left: 35
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5C02",
    marginBottom: SPACING.xxl,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: SPACING.xxl,
  },
  statBox: {
    width: "40%",
    elevation: 3,
  },
  statLabelContainer: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    alignItems: "center",
  },
  statValueContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    borderTopWidth: 0,
    height: width * 0.25,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    width: 35,
    height: 35,
    resizeMode: "contain",
    marginRight: SPACING.sm,
  },
  statLabel: {
    color: COLORS.card,
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 21,
    fontWeight: "bold",
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: SPACING.md,
  },
});

export default LessonCompleteScreen;
