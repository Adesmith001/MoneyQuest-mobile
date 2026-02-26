import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { updateStreakOnLogin } from "../../store/slices/streakSlice";
import CoachMark from "../../components/tutorial/CoachMark";
import { STREAK_COACH_STEPS } from "../../config/coachMarkSteps";
import { markStreakGuideSeen } from "../../store/slices/tutorialSlice";

const getPastSevenDays = () => {
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const result = [];

  // Get today's date
  const today = new Date();

  // Find how many days back to go to get to the most recent Sunday
  const daysSinceLastSunday = today.getDay(); // 0=Sunday, 1=Monday, etc.

  // Start from the most recent Sunday and go forward 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysSinceLastSunday + i);
    result.push({
      name: days[d.getDay()],
      date: d.toISOString().split("T")[0],
    });
  }
  return result;
};

const DailyStreakScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentStreak, loginHistory, isLoading, weeklyStreak } = useSelector(
    (state: RootState) => state.streak
  );
  const { hasSeenStreakGuide } = useSelector((state: RootState) => state.tutorial);

  // Coach marks
  const [coachStep, setCoachStep] = useState(0);
  const showCoachMarks = !hasSeenStreakGuide && !isLoading;

  useEffect(() => {
    if (user?.$id) {
      dispatch(updateStreakOnLogin(user.$id) as any);
    }
  }, [user?.$id, dispatch]);

  // Use the loginHistory array to create a Set for quick lookups.
  const activeDays = new Set(loginHistory || []);
  const week = getPastSevenDays();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        {isLoading ? (
          <Text style={styles.loadingText}>Loading streak data...</Text>
        ) : (
          <>
            <MaskedView
              style={styles.maskedView}
              maskElement={
                <View style={styles.maskedView}>
                  <Text style={styles.streakNumberText}>{weeklyStreak}</Text>
                </View>
              }
            >
              <LinearGradient
                colors={["#FFC107", "#FF6B35"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.maskedView}
              />
            </MaskedView>

            <Text style={styles.streakLabel}>day streak</Text>

            <View style={styles.calendarContainer}>
              {week.map((day, index) => {
                const isCompleted = activeDays.has(day.date);
                return (
                  <View key={index} style={styles.dayContainer}>
                    <Text
                      style={[
                        styles.dayLabel,
                        !isCompleted && styles.dayLabelIncomplete,
                      ]}
                    >
                      {day.name}
                    </Text>
                    {isCompleted ? (
                      <View style={styles.dayCircleCompleted}>
                        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.dayCircleIncomplete} />
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.footerText}>
              Practice each day so your streak won’t reset
            </Text>
          </>
        )}
        </View>
      </ScrollView>
      {/* Coach marks for first-time streak visitors */}
      <CoachMark
        visible={showCoachMarks}
        steps={STREAK_COACH_STEPS}
        currentStep={coachStep}
        onNext={() => setCoachStep((prev) => prev + 1)}
        onSkip={() => {
          dispatch(markStreakGuideSeen());
          setCoachStep(0);
        }}
        onComplete={() => {
          dispatch(markStreakGuideSeen());
          setCoachStep(0);
        }}
      />    
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  maskedView: {
    height: 200,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  streakNumberText: {
    fontSize: 180,
    fontWeight: "bold",
    textAlign: "center",
    color: "black",
  },
  streakLabel: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FF6B35",
    marginTop: 8,
    marginBottom: 60,
  },
  calendarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  dayContainer: {
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
    marginBottom: 12,
  },
  dayLabelIncomplete: {
    color: "#AFAFAF",
  },
  dayCircleCompleted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleIncomplete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E9ECEF",
  },
  footerText: {
    fontSize: 16,
    color: "#6C757D",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#6C757D",
    textAlign: "center",
  },
});

export default DailyStreakScreen;
