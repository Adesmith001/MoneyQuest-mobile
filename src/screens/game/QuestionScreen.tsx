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
import { refreshUserData } from "../../store/slices/authSlice";
import CorrectAnswerModal from "../../components/modals/CorrectAnswerModal";
import IncorrectAnswerModal from "../../components/modals/IncorrectAnswerModal";
import { RootState } from "../../store";
import ProgressBar from "../../components/progressBar";
import CustomButton from "../../components/CustomButton";
import questionService from "../../services/questions";
import { backendApi } from "../../services/backendApi";
import { databases, DB_ID, COLLECTIONS, Query } from "../../services/appwrite";
import { GeneratedQuestion } from "../../types";
import { getNextLevel } from "../../config/learningPath";
import soundService from "../../services/soundService";

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

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [levelData, setLevelData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'article' | 'quiz'>('article');

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

        // Get questions for this level
        const levelQuestions = await questionService.getQuestionsForLevel(
          levelId,
          10,
          'mixed'
        );
        setQuestions(levelQuestions);

        // Check if user has saved progress for this level
        if (user?.$id) {
          try {
            const progressDocs = await databases.listDocuments(
              DB_ID,
              COLLECTIONS.USER_PROGRESS,
              [
                Query.equal('userId', user.$id),
                Query.equal('level', levelId),
                Query.equal('isCompleted', false) // Only get in-progress levels
              ]
            );

            if (progressDocs.documents.length > 0) {
              const progress = progressDocs.documents[0];
              
              // Resume from saved question index
              if (progress.currentQuestionIndex !== undefined) {
                setCurrentQuestionIndex(progress.currentQuestionIndex);
                setCorrectAnswersCount(progress.questionsCorrect || 0);
                setXpGained(progress.xpEarned || 0);
                
                // If there's saved progress, skip directly to quiz
                if (progress.currentQuestionIndex > 0) {
                  setViewMode('quiz');
                }
              }
            }
          } catch (error) {
            console.error('Failed to load saved progress:', error);
          }
        }
        
      } catch (error) {
        console.error('Failed to load level:', error);
        Alert.alert(
          'Error',
          'Failed to load content. Please try again.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadLevelData();
  }, [levelId, user?.$id]);

  // Save progress to Appwrite whenever question index changes
  useEffect(() => {
    async function saveProgress() {
      if (!user?.$id || viewMode !== 'quiz' || isLoading) return;

      try {
        const progressDocs = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.USER_PROGRESS,
          [
            Query.equal('userId', user.$id),
            Query.equal('level', levelId)
          ]
        );

        const progressData = {
          userId: user.$id,
          level: levelId,
          section: 1, // You may want to pass this as a parameter
          currentQuestionIndex,
          questionsAnswered: currentQuestionIndex + 1,
          questionsCorrect: correctAnswersCount,
          xpEarned: xpGained,
          isCompleted: false,
          updatedAt: new Date().toISOString(),
        };

        if (progressDocs.documents.length > 0) {
          // Update existing progress
          await databases.updateDocument(
            DB_ID,
            COLLECTIONS.USER_PROGRESS,
            progressDocs.documents[0].$id,
            progressData
          );
        } else {
          // Create new progress record
          await databases.createDocument(
            DB_ID,
            COLLECTIONS.USER_PROGRESS,
            'unique()',
            progressData,
            [
              `read("user:${user.$id}")`,    // Only this user can read
              `update("user:${user.$id}")`,  // Only this user can update
              `delete("user:${user.$id}")`,  // Only this user can delete
            ]
          );
        }
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }

    saveProgress();
  }, [currentQuestionIndex, correctAnswersCount, xpGained, viewMode]);

  const handleStartQuiz = () => {
    setStartTime(Date.now());
    setViewMode('quiz');
  };

  const handleAnswerSelect = (answerKey: string) => {
    if (!isCorrectModalVisible && !isIncorrectModalVisible) {
      setSelectedAnswer(answerKey);
      soundService.playSound('click'); // Add sound effect
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !user) return;

    const currentQuestion = questions[currentQuestionIndex];
    // Safety check
    if (!currentQuestion) return;

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
        soundService.playSound('correct'); // Play correct sound
        dispatch(addXP(result.xpEarned));
        setXpGained(xpGained + result.xpEarned);
        setCorrectAnswersCount(correctAnswersCount + 1);
        setCorrectModalVisible(true);
      } else {
        soundService.playSound('incorrect'); // Play incorrect sound
        dispatch(removeHealth(1));
        setIncorrectModalVisible(true);
      }
      
      // Refresh user data to update profile with latest XP and lives
      if (user?.$id) {
        dispatch(refreshUserData(user.$id) as any);
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

    // If health is 0, user cannot continue
    if (health <= 0) {
      Alert.alert(
        "Out of Lives",
        "You have run out of lives. Please wait for them to regenerate or watch an ad.",
        [{ text: "Go Back", onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      soundService.playSound('buttonPress'); // Button press sound
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

        // Mark level as completed in User Progress collection
        if (result.passed) {
          try {
            const existingProgress = await databases.listDocuments(
              DB_ID,
              COLLECTIONS.USER_PROGRESS,
              [Query.equal('userId', user.$id), Query.equal('level', levelId)]
            );

            if (existingProgress.documents.length > 0) {
              // Update existing progress
              await databases.updateDocument(
                DB_ID,
                COLLECTIONS.USER_PROGRESS,
                existingProgress.documents[0].$id,
                {
                  isCompleted: true,
                  completedAt: new Date().toISOString(),
                }
              );
            } else {
              // Create new progress record
              await databases.createDocument(
                DB_ID,
                COLLECTIONS.USER_PROGRESS,
                'unique()',
                {
                  userId: user.$id,
                  level: levelId,
                  section: 1,
                  questionsAnswered: questions.length,
                  questionsCorrect: correctAnswersCount,
                  xpEarned: xpGained,
                  isCompleted: true,
                  completedAt: new Date().toISOString(),
                }
              );
            }
          } catch (progressError) {
            console.error('Failed to update progress:', progressError);
          }
        }

        // Update current level if passed and there's a next level
        if (result.passed && result.next_level_id) {
          updateData.currentLevelId = result.next_level_id;
          updateData.currentSectionId = sectionId; // Keep same section or update if needed
          
          // Add 1 life on level completion
          const newLives = Math.min((user.lives || 5) + 1, 5); // Cap at 5 lives
          updateData.lives = newLives;
          dispatch(addHealth(1));
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

  if (isLoading || !levelData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // --- ARTICLE VIEW ---
  if (viewMode === 'article') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{levelData.title}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.articleContainer}>
          <Text style={styles.articleTitle}>{levelData.title}</Text>
          
          {/* Display content or description */}
          <Text style={styles.articleContent}>
            {levelData.content || levelData.description || "No content available for this level."}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <CustomButton
            title="Start Quiz"
            onPress={handleStartQuiz}
          />
        </View>
      </SafeAreaView>
    );
  }

  // --- QUIZ VIEW ---
  const currentQuestion = questions[currentQuestionIndex];
  
  // Safety check for empty questions array or undefined question
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.questionText}>No questions available for this level.</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const canSubmit = !!selectedAnswer;

  // Convert GeneratedQuestion format to options array for rendering
  // Added safety check for options existence
  const optionsArray = currentQuestion.options
    ? [
        { key: 'A', value: currentQuestion.options.A },
        { key: 'B', value: currentQuestion.options.B },
        { key: 'C', value: currentQuestion.options.C },
        { key: 'D', value: currentQuestion.options.D },
      ]
    : [];

  // Get explanation for the selected answer
  const getExplanation = (answerKey: string): string => {
    if (!currentQuestion || !currentQuestion.explanations) return 'No explanation available.';
    
    return currentQuestion.explanations[answerKey as 'A' | 'B' | 'C' | 'D'] || 'No explanation available.';
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
        <View style={styles.levelInfoContainer}>
          <Text style={styles.sectionTitleText}>{sectionTitle}</Text>
          <Text style={styles.levelTitleText}>{levelTitle}</Text>
        </View>
        
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

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
        explanation={getExplanation(selectedAnswer)}
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
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  closeButton: {
    fontSize: 22,
    color: COLORS.text,
    marginRight: SPACING.md,
    padding: SPACING.xs,
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
  levelInfoContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: "center",
  },
  sectionTitleText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.card,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  levelTitleText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.card,
    textAlign: "center",
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
    flexGrow: 1,
  },
  articleTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  articleContent: {
    fontSize: FONT_SIZES.md,
    lineHeight: 26,
    color: COLORS.text,
  },
});

export default QuestionScreen;