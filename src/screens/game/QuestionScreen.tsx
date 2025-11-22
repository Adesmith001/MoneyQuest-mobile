import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import {
  nextQuestion,
  nextLevel,
  addHealth,
  addXP,
  removeHealth,
} from "../../store/slices/gameSlice";
import CorrectAnswerModal from "../../components/modals/CorrectAnswerModal";
import IncorrectAnswerModal from "../../components/modals/IncorrectAnswerModal";
import { RootState } from "../../store";
import ProgressBar from "../../components/progressBar";
import CustomButton from "../../components/CustomButton";
import questionService from "../../services/questions";
import { backendApi } from "../../services/backendApi";
import { databases, DB_ID, COLLECTIONS } from "../../services/appwrite";
import { BackendQuestion } from "../../types";
import { getNextLevel } from "../../config/learningPath";

interface Props {
  navigation: any;
  route: {
    params: {
      levelId: string;
      sectionId: string;
      levelTitle: string;
      sectionTitle: string;
    };
  };
}

const QuestionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { levelId, sectionId, levelTitle, sectionTitle } = route.params;
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { health } = useSelector((state: RootState) => state.game);

  const [questions, setQuestions] = useState<BackendQuestion[]>([]);
  const [levelData, setLevelData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [isCorrectModalVisible, setCorrectModalVisible] = useState(false);
  const [isIncorrectModalVisible, setIncorrectModalVisible] = useState(false);

  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Load level data and questions from backend
  useEffect(() => {
    async function loadLevelData() {
      try {
        setIsLoading(true);
        
        // Get level details
        const levelDetails = await backendApi.getLevelDetails(levelId);
        setLevelData(levelDetails);

        // Get questions for this level (10 questions, mixed difficulty)
        const levelQuestions = await questionService.getQuestionsForLevel(
          levelId,
          10,
          'mixed'
        );
        setQuestions(levelQuestions);
        
        setStartTime(Date.now());
      } catch (error) {
        console.error('Failed to load level:', error);
        Alert.alert(
          'Error',
          'Failed to load questions. Please try again.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadLevelData();
  }, [levelId]);

  const handleAnswerSelect = (answerKey: string) => {
    if (!isCorrectModalVisible && !isIncorrectModalVisible) {
      setSelectedAnswer(answerKey);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !user) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    try {
      // Record answer and update lives/XP
      const result = await questionService.recordAnswer(
        user.$id,
        levelId,
        selectedAnswer,
        currentQuestion.correct_answer,
        isCorrect,
        5 // Time spent in seconds (you can track this properly)
      );

      if (isCorrect) {
        dispatch(addXP(result.xpEarned));
        setXpGained(xpGained + result.xpEarned);
        setCorrectAnswersCount(correctAnswersCount + 1);
        setCorrectModalVisible(true);
      } else {
        dispatch(removeHealth(1));
        setIncorrectModalVisible(true);
      }
    } catch (error) {
      console.error('Error recording answer:', error);
      Alert.alert('Error', 'Failed to save your answer. Please try again.');
    }
  };

  const handleContinue = async () => {
    setCorrectModalVisible(false);
    setIncorrectModalVisible(false);
    setSelectedAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      dispatch(nextQuestion());
    } else {
      // Level completed - submit results
      if (!user) return;

      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
      const accuracy = Math.round((correctAnswersCount / questions.length) * 100);

      try {
        // Submit level completion to backend
        const result = await questionService.submitLevelQuiz(
          user.$id,
          levelId,
          correctAnswersCount,
          questions.length,
          timeSpentMinutes
        );

        // Update user's XP and progress in Appwrite
        const currentTotalXP = user.totalXP || 0;
        const currentMonthlyXP = user.monthlyXP || 0;
        const newTotalXP = currentTotalXP + xpGained;
        const newMonthlyXP = currentMonthlyXP + xpGained;

        const updateData: any = {
          totalXP: newTotalXP,
          monthlyXP: newMonthlyXP,
          updatedAt: new Date().toISOString(),
        };

        // Update current level if passed and there's a next level
        if (result.passed && result.next_level_id) {
          const nextLevelInfo = getNextLevel(levelId);
          if (nextLevelInfo) {
            updateData.currentLevelId = result.next_level_id;
            updateData.currentSectionId = nextLevelInfo.section.sectionId;
          }
        }

        await databases.updateDocument(DB_ID, COLLECTIONS.USERS, user.$id, updateData);

        dispatch(nextLevel());
        navigation.replace("LevelCompletion", {
          xpGained: xpGained,
          accuracy,
          passed: result.passed,
          nextLevelId: result.next_level_id,
        });
      } catch (error) {
        console.error('Error submitting level:', error);
        // Still navigate to completion screen even if submission fails
        navigation.replace("LevelCompletion", {
          xpGained: xpGained,
          accuracy,
        });
      }
    }
  };

  if (isLoading || questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const canSubmit = !!selectedAnswer;

  // Convert backend question format to options array for rendering
  const optionsArray = currentQuestion
    ? [
        { key: 'A', value: currentQuestion.option_a },
        { key: 'B', value: currentQuestion.option_b },
        { key: 'C', value: currentQuestion.option_c },
        { key: 'D', value: currentQuestion.option_d },
      ]
    : [];

  // Get explanation for the selected answer
  const getExplanation = (answerKey: string): string => {
    if (!currentQuestion) return 'No explanation available.';
    
    switch (answerKey) {
      case 'A':
        return currentQuestion.explanation_a;
      case 'B':
        return currentQuestion.explanation_b;
      case 'C':
        return currentQuestion.explanation_c;
      case 'D':
        return currentQuestion.explanation_d;
      default:
        return 'No explanation available.';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar progress={progress} onClose={() => navigation.popToTop()} />
        <View style={styles.healthContainer}>
          <Image
            source={require("../../../assets/heart.png")}
            style={styles.heartIcon}
          />
          <Text style={styles.healthText}>{health}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        <View style={styles.optionsContainer}>
          {optionsArray.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionButton,
                selectedAnswer === option.key && styles.selectedOption,
              ]}
              onPress={() => handleAnswerSelect(option.key)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{option.key}.</Text>
                <Text
                  style={[
                    styles.optionText,
                    selectedAnswer === option.key && styles.selectedOptionText,
                  ]}
                >
                  {option.value}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={"Next"}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </View>

      <CorrectAnswerModal
        visible={isCorrectModalVisible}
        onContinue={handleContinue}
      />
      <IncorrectAnswerModal
        visible={isIncorrectModalVisible}
        onContinue={() => {
          setIncorrectModalVisible(false);
          setSelectedAnswer("");
        }}
        chosenAnswer={selectedAnswer ? optionsArray.find(o => o.key === selectedAnswer)?.value || selectedAnswer : "No answer selected"}
        explanation={getExplanation(selectedAnswer)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  closeButton: {
    fontSize: 22,
    color: COLORS.background,
    marginRight: SPACING.md,
  },
  healthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SPACING.md,
  },
  heartIcon: {
    width: 24,
    height: 24,
    marginRight: SPACING.xs,
  },
  healthText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.warning,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.md,
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  questionText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: SPACING.xl,
    color: COLORS.text,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  optionButton: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 5,
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  optionLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    minWidth: 30,
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.card,
  },
  footer: {
    padding: SPACING.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: COLORS.background,
  },
  submitButtonText: {
    color: COLORS.card,
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
  },
  articleContainer: {
    padding: SPACING.lg,
  },
  articleTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    marginBottom: SPACING.md,
  },
  articleContent: {
    fontSize: FONT_SIZES.md,
    lineHeight: 26,
    color: "#000000",
  },
});

export default QuestionScreen;