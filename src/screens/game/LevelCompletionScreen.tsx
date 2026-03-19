import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import CustomButton from "../../components/CustomButton";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analyticsService from '../../services/analytics';

const REVIEW_KEY_PREFIX = 'review_shown_section_';

const { width } = Dimensions.get("window");

interface Props {
  navigation: any;
  route: {
    params: {
      xpGained: number;
      accuracy: number;
      sectionId?: string;
      passed?: boolean;
      nextLevelId?: string;
    };
  };
}

const LessonCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { xpGained, accuracy, sectionId } = route.params;

  // Trigger native in-app review once per section
  useEffect(() => {
    if (!sectionId) return;

    const maybeRequestReview = async () => {
      try {
        const key = `${REVIEW_KEY_PREFIX}${sectionId}`;
        const alreadyShown = await AsyncStorage.getItem(key);

        if (!alreadyShown) {
          const isAvailable = await StoreReview.isAvailableAsync();
          // Mark as shown regardless so we don't re-attempt on error
          await AsyncStorage.setItem(key, 'true');
          if (isAvailable) {
            analyticsService.trackEvent('review_prompt_requested', {
              section_id: sectionId,
            }, {
              screenName: 'LevelCompletion',
              featureName: 'store_review',
            }).catch(() => {});
            // Small delay so the completion screen appears first
            setTimeout(() => {
              StoreReview.requestReview();
            }, 1500);
          }
        }
      } catch (_) {
        // Silently fail — review prompt is non-critical
      }
    };

    maybeRequestReview();
  }, [sectionId]);

  const handleContinue = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
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
