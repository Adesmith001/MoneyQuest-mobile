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
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import {
  nextQuestion,
  nextLevel,
  addXP,
  setHealth,
} from "../../store/slices/gameSlice";
import { refreshUserData, updateUser } from "../../store/slices/authSlice";
import CorrectAnswerModal from "../../components/modals/CorrectAnswerModal";
import IncorrectAnswerModal from "../../components/modals/IncorrectAnswerModal";
import { RootState } from "../../store";
import ProgressBar from "../../components/progressBar";
import CustomButton from "../../components/CustomButton";
import questionService from "../../services/questions";
import { backendApi } from "../../services/backendApi";
import { databases, DB_ID, COLLECTIONS, Query } from "../../services/appwrite";
import {
  AnyQuestion,
  GeneratedQuestion,
  ScenarioQuestion,
  MatchingQuestion,
  FillInGapQuestion,
} from "../../types";
import { getNextLevel } from "../../config/learningPath";
import soundService from "../../services/soundService";
import livesService from "../../services/lives";
import audioService from "../../services/audioService";
import ScenarioQuestionComponent from "../../components/questions/ScenarioQuestion";
import MatchingQuestionComponent from "../../components/questions/MatchingQuestion";
import FillInGapQuestionComponent from "../../components/questions/FillInGapQuestion";
import cacheService from "../../services/cacheService";

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

  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [levelData, setLevelData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // State for matching questions
  const [matchingAnswers, setMatchingAnswers] = useState<{
    [key: string]: string;
  }>({});

  // State for fill-in-gap questions
  const [fillInGapAnswers, setFillInGapAnswers] = useState<{
    [key: string]: string;
  }>({});

  const [viewMode, setViewMode] = useState<"article" | "quiz">("article");

  const [isCorrectModalVisible, setCorrectModalVisible] = useState(false);
  const [isIncorrectModalVisible, setIncorrectModalVisible] = useState(false);

  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingExplanation, setIsPlayingExplanation] = useState(false);
  const [isPlayingLevelInfo, setIsPlayingLevelInfo] = useState(false);
  const [isPlayingArticle, setIsPlayingArticle] = useState(false);
  const [matchingResults, setMatchingResults] = useState<{
    correct: string[];
    incorrect: string[];
  }>({ correct: [], incorrect: [] });

  // Refresh lives from Appwrite when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserLives = async () => {
        if (!user?.$id) return;
        
        try {
          const { lives, lastLifeRegenTime } = await livesService.refreshLives(
            user.$id,
            user.lives !== undefined && user.lives !== null ? user.lives : 5,
            user.lastLifeRegenTime || new Date().toISOString()
          );
          
          // Update Redux store with new lives
          dispatch(setHealth(lives));
          dispatch(updateUser({ lives, lastLifeRegenTime }));
          
          console.log(`✅ Lives refreshed from Appwrite: ${lives}/5`);
        } catch (error) {
          console.error('Failed to refresh lives:', error);
        }
      };

      refreshUserLives();
    }, [user?.$id, dispatch])
  );

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
          "mixed"
        );
        setQuestions(levelQuestions);

        // Check if user has saved progress for this level
        if (user?.$id) {
          try {
            const progressDocs = await databases.listDocuments(
              DB_ID,
              COLLECTIONS.USER_PROGRESS,
              [
                Query.equal("userId", user.$id),
                Query.equal("level", levelId),
                Query.equal("isCompleted", false), // Only get in-progress levels
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
                  setViewMode("quiz");
                }
              }
            }
          } catch (error) {
            console.error("Failed to load saved progress:", error);
          }
        }
      } catch (error) {
        console.error("Failed to load level:", error);
        Alert.alert("Error", "Failed to load content. Please try again.", [
          { text: "Go Back", onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadLevelData();
  }, [levelId, user?.$id]);

  // Save progress to Appwrite whenever question index changes
  useEffect(() => {
    async function saveProgress() {
      if (!user?.$id || viewMode !== "quiz" || isLoading) return;

      try {
        const progressDocs = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.USER_PROGRESS,
          [Query.equal("userId", user.$id), Query.equal("level", levelId)]
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
            "unique()",
            progressData
          );
        }
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    }

    saveProgress();
  }, [currentQuestionIndex, correctAnswersCount, xpGained, viewMode]);

  const handleStartQuiz = () => {
    setStartTime(Date.now());
    setViewMode("quiz");
  };

  const handleAnswerSelect = (answerKey: string) => {
    if (!isCorrectModalVisible && !isIncorrectModalVisible) {
      setSelectedAnswer(answerKey);
      soundService.playSound("click"); // Add sound effect
    }
  };

  const handlePlayAudio = async () => {
    if (!questions[currentQuestionIndex] || isPlayingAudio) return;

    try {
      setIsPlayingAudio(true);
      const currentQ = questions[currentQuestionIndex];

      // If it's a Scenario question, read context + question + options
      if (currentQ.question_type === "scenario" && "scenario_context" in currentQ) {
        const scenarioQ = currentQ as ScenarioQuestion;
        const fullText = `Scenario: ${scenarioQ.scenario_context}. Question: ${scenarioQ.question}`;
        await audioService.readQuestionWithOptions(fullText, scenarioQ.options);
      }
      // If it's an MCQ with options, read question + options
      else if (currentQ.question_type === "mcq" && "options" in currentQ) {
        const mcqQ = currentQ as GeneratedQuestion;
        await audioService.readQuestionWithOptions(mcqQ.question, mcqQ.options);
      } else {
        // For other question types, just read the question
        await audioService.readQuestion(currentQ.question);
      }

      setIsPlayingAudio(false);
    } catch (error) {
      console.error("Failed to play audio:", error);
      setIsPlayingAudio(false);
      Alert.alert("Audio Error", "Failed to play audio. Please try again.");
    }
  };

  const handlePlayExplanation = async () => {
    if (isPlayingExplanation) return;

    try {
      setIsPlayingExplanation(true);
      const explanation = getExplanation();
      await audioService.readExplanation(explanation);
      setIsPlayingExplanation(false);
    } catch (error) {
      console.error("Failed to play explanation audio:", error);
      setIsPlayingExplanation(false);
      Alert.alert("Audio Error", "Failed to play explanation audio.");
    }
  };

  const handlePlayLevelInfo = async () => {
    if (isPlayingLevelInfo) return;

    try {
      setIsPlayingLevelInfo(true);
      const levelInfoText = `${sectionTitle}. ${levelTitle}.`;
      await audioService.readQuestion(levelInfoText);
      setIsPlayingLevelInfo(false);
    } catch (error) {
      console.error("Failed to play level info audio:", error);
      setIsPlayingLevelInfo(false);
      Alert.alert("Audio Error", "Failed to play level info audio.");
    }
  };

  const handlePlayArticle = async () => {
    if (isPlayingArticle || !levelData) return;

    try {
      setIsPlayingArticle(true);
      const articleText = levelData.content || levelData.description || '';
      await audioService.readQuestion(articleText);
      setIsPlayingArticle(false);
    } catch (error) {
      console.error('Failed to play article audio:', error);
      setIsPlayingArticle(false);
      Alert.alert('Audio Error', 'Failed to play article audio.');
    }
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !user) return;

    let isCorrect = false;
    let userAnswer: any = selectedAnswer;

    const incorrectAnswers: string[] = [];
    const correctAnswers: string[] = [];

    // Determine correctness based on question type
    if (currentQuestion.question_type === "matching") {
      const matchingQ = currentQuestion as MatchingQuestion;

      // Check each match and collect correct and incorrect ones
      Object.keys(matchingQ.correct_matches).forEach((leftId) => {
        const userRightId = matchingAnswers[leftId];
        const correctRightId = matchingQ.correct_matches[leftId];

        // Find the left and right item texts
        const leftItem = matchingQ.left_items.find(item => item.id === leftId);

        if (userRightId === correctRightId) {
          // Correct match
          const rightItem = matchingQ.right_items.find(item => item.id === correctRightId);
          if (leftItem && rightItem) {
            correctAnswers.push(`${leftItem.text} → ${rightItem.text}`);
          }
        } else {
          // Incorrect match
          const userRightItem = matchingQ.right_items.find(item => item.id === userRightId);
          const correctRightItem = matchingQ.right_items.find(item => item.id === correctRightId);

          if (leftItem && userRightItem && correctRightItem) {
            incorrectAnswers.push(
              `${leftItem.text} → ${userRightItem.text} (correct: ${correctRightItem.text})`
            );
          }
        }
      });

      // Store results for showing in modal
      setMatchingResults({ correct: correctAnswers, incorrect: incorrectAnswers });

      // All matches must be correct
      isCorrect = incorrectAnswers.length === 0 &&
        Object.keys(matchingQ.correct_matches).length === Object.keys(matchingAnswers).length;

      userAnswer = JSON.stringify(matchingAnswers);
      console.log("User Matching Answers:", matchingAnswers);
      console.log("MatchingQ:", matchingQ);
      console.log("Correct Matches:", correctAnswers);
      console.log("Incorrect Matches:", incorrectAnswers);

    } else if (currentQuestion.question_type === "fill_in_gap") {
      const fillGapQ = currentQuestion as FillInGapQuestion;

      // Check each blank and collect incorrect ones
      fillGapQ.blanks.forEach((blank) => {
        const userBlankAnswer = fillInGapAnswers[blank.id]?.toLowerCase().trim();
        const correctAnswer = blank.correct_answer.toLowerCase().trim();

        if (userBlankAnswer !== correctAnswer) {
          incorrectAnswers.push(`Blank ${blank.id}: "${fillInGapAnswers[blank.id] || '(empty)'}" (correct: "${blank.correct_answer}")`);
        }
      });

      isCorrect = incorrectAnswers.length === 0;
      userAnswer = JSON.stringify(fillInGapAnswers);
      console.log("Fill in Gap Answers:", fillInGapAnswers);
      console.log("Incorrect Blanks:", incorrectAnswers);

    } else {
      // MCQ or Scenario questions
      const mcqQ = currentQuestion as GeneratedQuestion | ScenarioQuestion;
      if (!selectedAnswer) return;

      isCorrect = selectedAnswer === mcqQ.correct_answer;
      userAnswer = selectedAnswer;

      if (!isCorrect) {
        // Add the incorrect answer option
        const selectedOption = mcqQ.options[selectedAnswer as "A" | "B" | "C" | "D"];
        incorrectAnswers.push(`Selected: ${selectedAnswer}. ${selectedOption}`);
        console.log("Incorrect MCQ Answer:", incorrectAnswers);
      }
    }

    console.log("Is Correct:", isCorrect);
    console.log("All Incorrect Answers:", incorrectAnswers);

    try {
      // Record answer and update lives/XP
      const result = await questionService.recordAnswer(
        user.$id,
        levelId,
        userAnswer,
        currentQuestion.question_type === "mcq" ||
          currentQuestion.question_type === "scenario"
          ? (currentQuestion as GeneratedQuestion).correct_answer
          : "correct",
        isCorrect,
        5 // Time spent in seconds (you can track this properly)
      );

      if (isCorrect) {
        soundService.playSound("correct"); // Play correct sound
        dispatch(addXP(result.xpEarned));
        setXpGained(xpGained + result.xpEarned);
        setCorrectAnswersCount(correctAnswersCount + 1);
        setCorrectModalVisible(true);
      } else {
        soundService.playSound("incorrect"); // Play incorrect sound

        // Deduct life using livesService and update Appwrite
        const { lives, lastLifeRegenTime, canContinue } =
          await livesService.deductLife(
            user.$id,
            user.lives !== undefined && user.lives !== null ? user.lives : 5,
            user.lastLifeRegenTime || new Date().toISOString()
          );

        // Update Redux with new lives
        dispatch(setHealth(lives));
        dispatch(updateUser({ lives, lastLifeRegenTime }));

        // Check if lives reached zero
        if (lives === 0) {
          // Calculate time until next life
          const timeUntilNextLife = livesService.getTimeUntilNextLife(
            lives,
            lastLifeRegenTime
          );
          const timeFormatted = livesService.formatTimeRemaining(timeUntilNextLife);

          Alert.alert(
            "Out of Lives! ❤️",
            `You've run out of lives. Your next life will regenerate in ${timeFormatted}.`,
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.navigate("MainTabs", { screen: "Home" });
                },
              },
            ],
            { cancelable: false }
          );
          return;
        }

        setIncorrectModalVisible(true);
      }

      // Refresh user data to update profile with latest XP and lives
      if (user?.$id) {
        try {
          dispatch(refreshUserData(user.$id) as any);
        } catch (error) {
          // Silently fail - not critical
          console.log('Failed to refresh user data');
        }
      }
    } catch (error) {
      console.error("Error recording answer:", error);
      // Don't show alert - the app can continue working
      // The recordAnswer function now returns safe defaults on error
    }
  };

  const handleContinue = async () => {
    setCorrectModalVisible(false);
    setIncorrectModalVisible(false);
    setSelectedAnswer("");
    setMatchingAnswers({});
    console.log("this is the matching questions", matchingAnswers);
    setFillInGapAnswers({});

    // Get current lives from user (Appwrite source of truth)
    const currentLives = user?.lives || 0;
    
    // If lives is 0, user cannot continue
    if (currentLives <= 0) {
      const timeUntilNextLife = livesService.getTimeUntilNextLife(
        currentLives,
        user?.lastLifeRegenTime || new Date().toISOString()
      );
      const timeFormatted = livesService.formatTimeRemaining(timeUntilNextLife);

      Alert.alert(
        "Out of Lives! ❤️",
        `You've run out of lives. Your next life will regenerate in ${timeFormatted}.`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("MainTabs", { screen: "Home" });
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      soundService.playSound("buttonPress"); // Button press sound
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      dispatch(nextQuestion());
    } else {
      // Level completed - submit results
      if (!user) return;

      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
      const accuracy = Math.round(
        (correctAnswersCount / questions.length) * 100
      );

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
              [Query.equal("userId", user.$id), Query.equal("level", levelId)]
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
                "unique()",
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
            console.error("Failed to update progress:", progressError);
          }
        }
        await cacheService.addCompletedLevel(levelId);
        console.log('✅ Saved to cache:', levelId);

        // Update current level if passed and there's a next level
        if (result.passed && result.next_level_id) {
          updateData.currentLevelId = result.next_level_id;
          updateData.currentSectionId = sectionId; // Keep same section or update if needed

          // Add 1 life on level completion (cap at 5)
          const currentLivesValue = user.lives !== undefined && user.lives !== null ? user.lives : 5;
          const newLives = Math.min(currentLivesValue + 1, 5);
          const newLastLifeRegenTime = new Date().toISOString(); // Reset regeneration time
          
          updateData.lives = newLives;
          updateData.lastLifeRegenTime = newLastLifeRegenTime;
          
          dispatch(setHealth(newLives));

          // Update Redux store with new currentLevelId and lives
          dispatch(
            updateUser({
              currentLevelId: result.next_level_id,
              currentSectionId: sectionId,
              lives: newLives,
              lastLifeRegenTime: newLastLifeRegenTime,
            })
          );
          
          console.log(`✅ Level completed! Lives increased to ${newLives}/5`);
        } else if (result.passed && !result.next_level_id) {
          // Level completed but no next level (end of section/course)
          // Keep current level ID so progress is maintained
          updateData.currentLevelId = levelId;
          updateData.currentSectionId = sectionId;

          // Add 1 life on level completion (cap at 5)
          const currentLivesValue = user.lives !== undefined && user.lives !== null ? user.lives : 5;
          const newLives = Math.min(currentLivesValue + 1, 5);
          const newLastLifeRegenTime = new Date().toISOString();
          
          updateData.lives = newLives;
          updateData.lastLifeRegenTime = newLastLifeRegenTime;
          
          dispatch(setHealth(newLives));

          dispatch(
            updateUser({
              currentLevelId: levelId,
              currentSectionId: sectionId,
              lives: newLives,
              lastLifeRegenTime: newLastLifeRegenTime,
            })
          );
          
          console.log(`✅ Level completed! Lives increased to ${newLives}/5`);
        }

        await databases.updateDocument(
          DB_ID,
          COLLECTIONS.USERS,
          user.$id,
          updateData
        );

        // Refresh user data to ensure everything is in sync
        dispatch(refreshUserData(user.$id) as any);

        dispatch(nextLevel());
        navigation.replace("LevelCompletion", {
          xpGained: xpGained,
          accuracy,
          passed: result.passed,
          nextLevelId: result.next_level_id,
        });
      } catch (error) {
        console.error("Error submitting level:", error);
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // --- ARTICLE VIEW ---
  if (viewMode === "article") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{sectionTitle}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.articleContainer}>
          {/* <Text style={styles.articleTitle}>{levelData.title}</Text> */}

          {/* Audio Button */}
          <TouchableOpacity
            style={styles.articleAudioButton}
            onPress={handlePlayArticle}
            disabled={isPlayingArticle}
          >
            <Ionicons
              name={isPlayingArticle ? "pause-circle" : "volume-high"}
              size={32}
              color={COLORS.primary}
            />
            <Text style={styles.articleAudioText}>
              {isPlayingArticle ? "Playing..." : "Listen to article"}
            </Text>
          </TouchableOpacity>

          {/* Display content or description */}
          <Text style={styles.articleContent}>
            {levelData.content ||
              levelData.description ||
              "No content available for this level."}
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <CustomButton title="Start Quiz" onPress={handleStartQuiz} />
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
          <Text style={styles.questionText}>
            No questions available for this level.
          </Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Determine if user can submit based on question type
  let canSubmit = false;
  if (currentQuestion.question_type === "matching") {
    const matchingQ = currentQuestion as MatchingQuestion;
    canSubmit =
      Object.keys(matchingQ.correct_matches).length ===
      Object.keys(matchingAnswers).length;
  } else if (currentQuestion.question_type === "fill_in_gap") {
    const fillGapQ = currentQuestion as FillInGapQuestion;
    canSubmit = fillGapQ.blanks.every((blank) => fillInGapAnswers[blank.id]);
  } else {
    canSubmit = !!selectedAnswer;
  }

  // Get explanation based on question type
  const getExplanation = (): string => {
    if (currentQuestion.question_type === "matching") {
      return (
        (currentQuestion as MatchingQuestion).explanation ||
        "No explanation available."
      );
    } else if (currentQuestion.question_type === "fill_in_gap") {
      return (
        (currentQuestion as FillInGapQuestion).explanation ||
        "No explanation available."
      );
    } else {
      const mcqQ = currentQuestion as GeneratedQuestion | ScenarioQuestion;
      if (!mcqQ.explanations || !selectedAnswer)
        return "No explanation available.";
      return (
        mcqQ.explanations[selectedAnswer as "A" | "B" | "C" | "D"] ||
        "No explanation available."
      );
    }
  };

  // Get user's chosen answer text for incorrect modal
  const getChosenAnswerText = (): string => {
    if (currentQuestion.question_type === "matching") {
      return "Your matches were incorrect";
    } else if (currentQuestion.question_type === "fill_in_gap") {
      return "Some of your answers were incorrect";
    } else {
      const mcqQ = currentQuestion as GeneratedQuestion | ScenarioQuestion;
      const optionsArray = [
        { key: "A", value: mcqQ.options.A },
        { key: "B", value: mcqQ.options.B },
        { key: "C", value: mcqQ.options.C },
        { key: "D", value: mcqQ.options.D },
      ];
      return selectedAnswer
        ? optionsArray.find((o) => o.key === selectedAnswer)?.value ||
        selectedAnswer
        : "No answer selected";
    }
  };

  // Render question based on type
  const renderQuestion = () => {
    if (currentQuestion.question_type === "scenario") {
      return (
        <ScenarioQuestionComponent
          question={currentQuestion as ScenarioQuestion}
          selectedAnswer={selectedAnswer}
          onAnswerSelect={handleAnswerSelect}
          disabled={isCorrectModalVisible || isIncorrectModalVisible}
          onPlayAudio={handlePlayAudio}
          isPlayingAudio={isPlayingAudio}
        />
      );
    } else if (currentQuestion.question_type === "matching") {
      return (
        <MatchingQuestionComponent
          question={currentQuestion as MatchingQuestion}
          userMatches={matchingAnswers}
          onMatchChange={(leftId, rightId) => {
            if (rightId === null) {
              const newMatches = { ...matchingAnswers };
              delete newMatches[leftId];
              setMatchingAnswers(newMatches);
            } else {
              setMatchingAnswers({ ...matchingAnswers, [leftId]: rightId });
            }
          }}
          disabled={isCorrectModalVisible || isIncorrectModalVisible}
          showResults={isCorrectModalVisible || isIncorrectModalVisible}
          onPlayAudio={handlePlayAudio}
          isPlayingAudio={isPlayingAudio}
        />
      );
    } else if (currentQuestion.question_type === "fill_in_gap") {
      return (
        <FillInGapQuestionComponent
          question={currentQuestion as FillInGapQuestion}
          userAnswers={fillInGapAnswers}
          onAnswerChange={(blankId, answer) => {
            setFillInGapAnswers({ ...fillInGapAnswers, [blankId]: answer });
          }}
          disabled={isCorrectModalVisible || isIncorrectModalVisible}
          onPlayAudio={handlePlayAudio}
          isPlayingAudio={isPlayingAudio}
        />
      );
    } else {
      // Standard MCQ
      const mcqQ = currentQuestion as GeneratedQuestion;
      const optionsArray = [
        { key: "A", value: mcqQ.options.A },
        { key: "B", value: mcqQ.options.B },
        { key: "C", value: mcqQ.options.C },
        { key: "D", value: mcqQ.options.D },
      ];

      return (
        <>
          <View style={styles.questionWithAudioContainer}>
            <Text style={styles.questionText}>{mcqQ.question}</Text>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayAudio}
              disabled={isPlayingAudio}
            >
              <Ionicons
                name={isPlayingAudio ? "pause-circle" : "play-circle"}
                size={32}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.optionsContainer}>
            {optionsArray.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.optionButton,
                  selectedAnswer === option.key && styles.selectedOption,
                ]}
                onPress={() => handleAnswerSelect(option.key)}
                disabled={isCorrectModalVisible || isIncorrectModalVisible}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{option.key}.</Text>
                  <Text
                    style={[
                      styles.optionText,
                      selectedAnswer === option.key &&
                      styles.selectedOptionText,
                    ]}
                  >
                    {option.value}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar
          progress={progress}
          onClose={() => navigation.popToTop()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.levelInfoContainer}>
          <View style={styles.levelInfoContent}>
            <View style={styles.levelInfoTextContainer}>
              <Text style={styles.sectionTitleText}>{sectionTitle}</Text>
              <Text style={styles.levelTitleText}>{levelTitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.levelInfoAudioButton}
              onPress={handlePlayLevelInfo}
              disabled={isPlayingLevelInfo}
            >
              <Ionicons
                name={isPlayingLevelInfo ? "pause-circle" : "volume-high"}
                size={24}
                color={COLORS.card}
              />
            </TouchableOpacity>
          </View>
        </View>

        {renderQuestion()}
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
        explanation={getExplanation()}
        correctMatches={
          currentQuestion.question_type === "matching"
            ? matchingResults.correct
            : undefined
        }
      />
      <IncorrectAnswerModal
        visible={isIncorrectModalVisible}
        onContinue={() => {
          setIncorrectModalVisible(false);
          setSelectedAnswer("");
          setMatchingAnswers({});
          setFillInGapAnswers({});
          setMatchingResults({ correct: [], incorrect: [] });
        }}
        chosenAnswer={getChosenAnswerText()}
        explanation={getExplanation()}
        incorrectMatches={
          currentQuestion.question_type === "matching"
            ? matchingResults.incorrect
            : undefined
        }
        correctMatches={
          currentQuestion.question_type === "matching"
            ? matchingResults.correct
            : undefined
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  levelInfoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  levelInfoTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  levelInfoAudioButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
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
  questionWithAudioContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  questionContainer: {
    marginBottom: SPACING.xl,
  },
  questionText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
    color: COLORS.text,
  },
  playButton: {
    padding: SPACING.xs,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionButton: {
    width: "100%",
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
    flexGrow: 1,
    padding: SPACING.lg,
  },
  articleTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  articleAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  articleAudioText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  articleContent: {
    fontSize: FONT_SIZES.md,
    lineHeight: 26,
    color: COLORS.text,
  },
});

export default QuestionScreen;
