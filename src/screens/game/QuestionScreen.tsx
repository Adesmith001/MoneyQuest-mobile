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
import cachedBackendApi from "../../services/cachedBackendApi";
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
import { renderMarkdownContent } from "../../utils/markdownParser";

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

/**
 * Normalize a question to ensure it has all required properties
 * This handles cases where API returns questions in different formats
 */
const normalizeQuestion = (q: any): AnyQuestion | null => {
  if (!q) return null;

  const questionType = q.question_type || 'mcq';

  // Handle matching questions
  if (questionType === 'matching') {
    return {
      question_type: 'matching',
      question: q.question || '',
      left_items: q.left_items || [],
      right_items: q.right_items || [],
      correct_matches: q.correct_matches || {},
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
    } as MatchingQuestion;
  }

  // Handle fill in gap questions
  if (questionType === 'fill_in_gap') {
    return {
      question_type: 'fill_in_gap',
      question: q.question || '',
      blanks: q.blanks || [],
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
    } as FillInGapQuestion;
  }

  // Handle MCQ and Scenario questions
  // Ensure options object exists with all properties
  const options = {
    A: q.options?.A || q.option_a || '',
    B: q.options?.B || q.option_b || '',
    C: q.options?.C || q.option_c || '',
    D: q.options?.D || q.option_d || '',
  };

  const explanations = {
    A: q.explanations?.A || q.explanation_a || '',
    B: q.explanations?.B || q.explanation_b || '',
    C: q.explanations?.C || q.explanation_c || '',
    D: q.explanations?.D || q.explanation_d || '',
  };

  const baseQuestion = {
    question: q.question || q.question_text || '',
    options,
    correct_answer: q.correct_answer || 'A',
    explanations,
    difficulty: q.difficulty || 'medium',
    question_type: questionType as 'mcq' | 'scenario',
  };

  if (questionType === 'scenario') {
    return {
      ...baseQuestion,
      question_type: 'scenario',
      scenario_context: q.scenario_context || q.scenario || '',
    } as ScenarioQuestion;
  }

  return baseQuestion as GeneratedQuestion;
};

/**
 * Truncate text to fit within a certain length
 * Adds ellipsis if text is too long
 */
const truncateText = (text: string, maxLength: number = 40): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

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
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false); // Loading state for level submission

  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0); // Track all attempts (correct + incorrect)
  const [xpGained, setXpGained] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION
  // const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  // const [isPlayingExplanation, setIsPlayingExplanation] = useState(false);
  // const [isPlayingLevelInfo, setIsPlayingLevelInfo] = useState(false);
  // const [isPlayingArticle, setIsPlayingArticle] = useState(false);
  const [matchingResults, setMatchingResults] = useState<{
    correct: string[];
    incorrect: string[];
  }>({ correct: [], incorrect: [] });

  // Track which question indices were answered incorrectly first (for reduced XP on retry)
  const [questionsAnsweredIncorrectly, setQuestionsAnsweredIncorrectly] = useState<Set<number>>(new Set());

  // Track if this level was already completed (for retakes - no life deduction)
  const [isRetake, setIsRetake] = useState(false);

  // Refresh lives from Appwrite when screen is focused
  // Also sync progress when screen loses focus (user navigates away)
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

      // Return cleanup function - runs when screen loses focus
      return () => {
        // Sync progress to Appwrite when leaving the screen
        if (user?.$id && viewMode === "quiz" && currentQuestionIndex > 0) {
          console.log("☁️ Screen unfocused - syncing progress to Appwrite...");

          // Fire and forget - don't await
          databases.updateDocument(
            DB_ID,
            COLLECTIONS.USERS,
            user.$id,
            {
              currentLevelId: levelId,
              currentSectionId: sectionId,
              updatedAt: new Date().toISOString(),
            }
          ).then(() => {
            console.log("☁️ Background sync completed on screen exit");
          }).catch((error) => {
            console.error("☁️ Background sync failed on screen exit:", error);
          });
        }
      };
    }, [user?.$id, dispatch, viewMode, currentQuestionIndex, levelId, sectionId])
  );

  // Load level data and questions from backend
  useEffect(() => {
    async function loadLevelData() {
      try {
        setIsLoading(true);

        // Check if this is a recap level (format: recap_10_source_1)
        const isRecapLevel = levelId.startsWith('recap_');

        if (isRecapLevel) {
          // Extract recap section number from levelId (e.g., "recap_10_source_1" -> 10)
          const recapMatch = levelId.match(/^recap_(\d+)_source_(\d+)$/);
          if (!recapMatch) {
            throw new Error('Invalid recap level ID format');
          }

          const recapSectionNumber = parseInt(recapMatch[1], 10);
          const sourceSectionNumber = parseInt(recapMatch[2], 10);

          // Fetch the recap section data
          const recapData = await backendApi.getRecapSection(recapSectionNumber, 10, true);

          // Find the specific source section we're reviewing
          const sourceSection = recapData.source_sections.find(
            s => s.section_number === sourceSectionNumber
          );

          if (!sourceSection) {
            throw new Error(`Source section ${sourceSectionNumber} not found in recap data`);
          }

          // Set level data for recap
          setLevelData({
            level: {
              level_id: levelId,
              title: `Review: ${sourceSection.section_title}`,
              description: `Comprehensive review of ${sourceSection.section_title}. Test your knowledge across all question types.`,
              has_quiz: true,
              min_score_to_pass: 70,
            },
            section: {
              section_id: recapData.recap_section_id,
              title: recapData.recap_section_title,
            },
            level_summary: `This recap level reviews material from ${sourceSection.section_title}. You'll answer ${sourceSection.question_count} questions covering all the key concepts.`,
          });

          // Aggregate all questions from this source section
          const allQuestions: AnyQuestion[] = [];

          // Add quiz questions
          sourceSection.questions_by_type.quiz.forEach(q => {
            allQuestions.push({
              question: q.question_text || '',
              options: {
                A: q.option_a || '',
                B: q.option_b || '',
                C: q.option_c || '',
                D: q.option_d || '',
              },
              correct_answer: q.correct_answer || 'A',
              explanations: {
                A: q.explanation_a || '',
                B: q.explanation_b || '',
                C: q.explanation_c || '',
                D: q.explanation_d || '',
              },
              difficulty: q.difficulty || 'medium',
              question_type: 'mcq',
            });
          });

          // Add scenario questions
          sourceSection.questions_by_type.scenario.forEach(q => {
            allQuestions.push({
              question: q.question_text || '',
              options: {
                A: q.option_a || '',
                B: q.option_b || '',
                C: q.option_c || '',
                D: q.option_d || '',
              },
              correct_answer: q.correct_answer || 'A',
              explanations: {
                A: q.explanation_a || '',
                B: q.explanation_b || '',
                C: q.explanation_c || '',
                D: q.explanation_d || '',
              },
              difficulty: q.difficulty || 'medium',
              question_type: 'scenario',
              scenario_context: q.scenario || '',
            });
          });

          // Add matching questions
          sourceSection.questions_by_type.matching.forEach(q => {
            allQuestions.push({
              question_type: 'matching',
              question: `Match the following: ${q.column_a}`,
              left_items: [{ id: q.pair_id?.toString() || '1', text: q.column_a || '' }],
              right_items: [{ id: q.pair_id?.toString() || '1', text: q.column_b || '' }],
              correct_matches: { [q.pair_id?.toString() || '1']: q.pair_id?.toString() || '1' },
              explanation: `${q.column_a} matches with ${q.column_b}`,
              difficulty: 'medium',
            });
          });

          console.log(`✅ Loaded ${allQuestions.length} recap questions from ${sourceSection.section_title}`);
          setQuestions(allQuestions);
        } else {
          // Regular level - Check cache for level data first
          let cachedLevelData = await cacheService.getLevelData(levelId);

          if (cachedLevelData) {
            console.log(`✅ Using cached level data (article) for ${levelId}`);
            setLevelData(cachedLevelData);
          } else {
            // Fetch from API if not cached
            // Get level description (includes level_summary for article view)
            const levelDescription = await backendApi.getLevelDescription(levelId);

            // Get full level details
            const levelDetails = await backendApi.getLevelDetails(levelId);

            // Merge description data into levelDetails
            const mergedLevelData = {
              ...levelDetails,
              level_summary: levelDescription.level_summary || levelDescription.description,
            };

            setLevelData(mergedLevelData);

            // Cache the level data for future use
            await cacheService.saveLevelData(levelId, mergedLevelData);
            console.log(`💾 Cached level data (article) for ${levelId}`);
          }

          // Get questions for this level with caching
          const levelQuestions = await cachedBackendApi.getQuestions(
            levelId,
            50, // Fetch more to ensure we have enough of each type
            "mixed"
          );

          // Normalize all questions to ensure proper structure
          const allNormalizedQuestions = levelQuestions
            .map(q => normalizeQuestion(q))
            .filter((q): q is AnyQuestion => q !== null);

          // Filter and limit questions by type: 3 scenario, 5 MCQ, 2 fill_in_gap, 2 matching (max 12 total)
          const scenarioQuestions = allNormalizedQuestions.filter(q => q.question_type === 'scenario').slice(0, 3);
          const mcqQuestions = allNormalizedQuestions.filter(q => q.question_type === 'mcq').slice(0, 5);
          const fillInGapQuestions = allNormalizedQuestions.filter(q => q.question_type === 'fill_in_gap').slice(0, 2);
          const matchingQuestions = allNormalizedQuestions.filter(q => q.question_type === 'matching').slice(0, 2);

          // Combine all questions in a mixed order for variety
          const limitedQuestions = [
            ...scenarioQuestions,
            ...mcqQuestions,
            ...fillInGapQuestions,
            ...matchingQuestions,
          ];

          // Shuffle the questions for better variety
          const shuffledQuestions = limitedQuestions.sort(() => Math.random() - 0.5);

          console.log(`✅ Loaded ${shuffledQuestions.length} questions for level ${levelId} (${scenarioQuestions.length} scenario, ${mcqQuestions.length} MCQ, ${fillInGapQuestions.length} fill_in_gap, ${matchingQuestions.length} matching)`);
          setQuestions(shuffledQuestions);
        }

        // Check if user has saved progress for this level
        if (user?.$id) {
          try {
            // First check if this level was already completed (retake mode)
            const completedDocs = await databases.listDocuments(
              DB_ID,
              COLLECTIONS.USER_PROGRESS,
              [
                Query.equal("userId", user.$id),
                Query.equal("level", levelId),
                Query.equal("isCompleted", true),
              ]
            );

            if (completedDocs.documents.length > 0) {
              // This is a retake - user won't lose lives or gain XP
              setIsRetake(true);
              console.log("🔄 This is a retake of a completed level - no life deduction");
            }

            // Then check for in-progress saves
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

  /**
   * Background sync function to ensure user progress is saved to Appwrite
   * This allows users to continue on another device
   */
  const syncUserProgressToAppwrite = async () => {
    if (!user?.$id) return;

    try {
      // Update the user document with current progress
      await databases.updateDocument(
        DB_ID,
        COLLECTIONS.USERS,
        user.$id,
        {
          currentLevelId: levelId,
          currentSectionId: sectionId,
          updatedAt: new Date().toISOString(),
        }
      );
      console.log("☁️ Background sync: User progress saved to Appwrite");
    } catch (error) {
      console.error("☁️ Background sync failed:", error);
      // Don't throw - this is a background operation
    }
  };

  const handleStartQuiz = () => {
    setStartTime(Date.now());
    setViewMode("quiz");

    // Background sync when user starts the quiz
    syncUserProgressToAppwrite();
  };

  // Handle going back to article view from quiz
  const handleBackToArticle = () => {
    // Article data is already cached in levelData state, just switch view mode
    setViewMode("article");
  };

  const handleAnswerSelect = (answerKey: string) => {
    if (!isCorrectModalVisible && !isIncorrectModalVisible) {
      setSelectedAnswer(answerKey);
      soundService.playSound("click"); // Add sound effect
    }
  };

  // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION
  // const handlePlayAudio = async () => {
  //   if (!questions[currentQuestionIndex] || isPlayingAudio) return;

  //   try {
  //     setIsPlayingAudio(true);
  //     const currentQ = questions[currentQuestionIndex];

  //     // If it's a Scenario question, read context + question + options
  //     if (currentQ.question_type === "scenario" && "scenario_context" in currentQ) {
  //       const scenarioQ = currentQ as ScenarioQuestion;
  //       const fullText = `Scenario: ${scenarioQ.scenario_context}. Question: ${scenarioQ.question}`;
  //       await audioService.readQuestionWithOptions(fullText, scenarioQ.options);
  //     }
  //     // If it's an MCQ with options, read question + options
  //     else if (currentQ.question_type === "mcq" && "options" in currentQ) {
  //       const mcqQ = currentQ as GeneratedQuestion;
  //       await audioService.readQuestionWithOptions(mcqQ.question, mcqQ.options);
  //     } else {
  //       // For other question types, just read the question
  //       await audioService.readQuestion(currentQ.question);
  //     }

  //     setIsPlayingAudio(false);
  //   } catch (error) {
  //     console.error("Failed to play audio:", error);
  //     setIsPlayingAudio(false);
  //     Alert.alert("Audio Error", "Failed to play audio. Please try again.");
  //   }
  // };

  // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION
  // const handlePlayExplanation = async () => {
  //   if (isPlayingExplanation) return;

  //   try {
  //     setIsPlayingExplanation(true);
  //     const explanation = getExplanation();
  //     await audioService.readExplanation(explanation);
  //     setIsPlayingExplanation(false);
  //   } catch (error) {
  //     console.error("Failed to play explanation audio:", error);
  //     setIsPlayingExplanation(false);
  //     Alert.alert("Audio Error", "Failed to play explanation audio.");
  //   }
  // };

  // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION
  // const handlePlayLevelInfo = async () => {
  //   if (isPlayingLevelInfo) return;

  //   try {
  //     setIsPlayingLevelInfo(true);
  //     const levelInfoText = `${sectionTitle}. ${levelTitle}.`;
  //     await audioService.readQuestion(levelInfoText);
  //     setIsPlayingLevelInfo(false);
  //   } catch (error) {
  //     console.error("Failed to play level info audio:", error);
  //     setIsPlayingLevelInfo(false);
  //     Alert.alert("Audio Error", "Failed to play level info audio.");
  //   }
  // };

  // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION
  // const handlePlayArticle = async () => {
  //   if (isPlayingArticle || !levelData) return;

  //   try {
  //     setIsPlayingArticle(true);
  //     const articleText = levelData.level_summary || levelData.level?.description || levelData.description || '';
  //     await audioService.readQuestion(articleText);
  //     setIsPlayingArticle(false);
  //   } catch (error) {
  //     console.error('Failed to play article audio:', error);
  //     setIsPlayingArticle(false);
  //     Alert.alert('Audio Error', 'Failed to play article audio.');
  //   }
  // };

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
        // Add the incorrect answer option (with safety check)
        const options = mcqQ.options || { A: '', B: '', C: '', D: '' };
        const selectedOption = options[selectedAnswer as "A" | "B" | "C" | "D"] || '';
        incorrectAnswers.push(`Selected: ${selectedAnswer}. ${selectedOption}`);
        console.log("Incorrect MCQ Answer:", incorrectAnswers);
      }
    }

    console.log("Is Correct:", isCorrect);
    console.log("All Incorrect Answers:", incorrectAnswers);

    // Always increment total attempts for accuracy calculation
    setTotalAttempts(totalAttempts + 1);

    // Track incorrect answers for reduced XP on retry
    if (!isCorrect) {
      setQuestionsAnsweredIncorrectly(prev => new Set(prev).add(currentQuestionIndex));
    }

    // IMMEDIATE life deduction for incorrect answers - don't wait for API
    // BUT skip life deduction if this is a retake of an already completed level
    if (!isCorrect && !isRetake) {
      soundService.playSound("incorrect"); // Play incorrect sound immediately

      // Deduct life IMMEDIATELY using livesService and update Appwrite
      console.log(`❤️ Before deduction - User lives: ${user.lives}, lastLifeRegenTime: ${user.lastLifeRegenTime}`);

      try {
        const { lives, lastLifeRegenTime, canContinue } =
          await livesService.deductLife(
            user.$id,
            user.lives !== undefined && user.lives !== null ? user.lives : 5,
            user.lastLifeRegenTime || new Date().toISOString()
          );

        console.log(`💔 After deduction - Lives: ${lives}, canContinue: ${canContinue}`);

        // Update Redux with new lives immediately
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
      } catch (lifeError) {
        console.error("Failed to deduct life:", lifeError);
        // Continue anyway - don't block the user
      }
    } else if (!isCorrect && isRetake) {
      // Retake mode - just play sound, no life deduction
      soundService.playSound("incorrect");
      console.log("🔄 Retake mode - incorrect answer but no life deducted");
    }

    try {
      // Record answer and update XP (life already deducted above if not retake)
      // On retakes, we still record the answer but XP won't be given again
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
        // Only give XP on first completion, not retakes
        if (!isRetake) {
          // Check if this question was previously answered incorrectly
          const wasAnsweredIncorrectly = questionsAnsweredIncorrectly.has(currentQuestionIndex);
          const xpForThisQuestion = wasAnsweredIncorrectly ? 5 : 10; // 5 XP for retry, 10 XP for first correct

          dispatch(addXP(xpForThisQuestion));
          setXpGained(xpGained + xpForThisQuestion);

          console.log(`✨ XP awarded: ${xpForThisQuestion} (${wasAnsweredIncorrectly ? 'retry' : 'first try'})`);
        }
        setCorrectAnswersCount(correctAnswersCount + 1);
        setCorrectModalVisible(true);
      } else {
        // Life already deducted above, just show the modal
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
      // If incorrect, still show the modal (life was already deducted)
      if (!isCorrect) {
        setIncorrectModalVisible(true);
      }
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

      // Show loading state immediately
      setIsSubmittingLevel(true);

      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);

      // Calculate accuracy based on total attempts (correct answers / total attempts)
      // This penalizes wrong answers: if you needed 15 attempts for 10 questions, accuracy = 67%
      const accuracy = totalAttempts > 0
        ? Math.round((correctAnswersCount / totalAttempts) * 100)
        : 0;

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

        // Determine next level: check if this was the last level in the section
        let nextLevelToUnlock = result.next_level_id;
        let nextSectionId = sectionId;

        if (result.passed && !result.next_level_id) {
          // No next level returned means we're at the end of the current section
          console.log('🎉 Section completed! Finding next section...');

          try {
            // Get all sections with caching
            const allSections = await cachedBackendApi.getSections();
            const currentSectionIndex = allSections.findIndex(s => s.section_id === sectionId);

            if (currentSectionIndex !== -1 && currentSectionIndex < allSections.length - 1) {
              // There is a next section
              const nextSection = allSections[currentSectionIndex + 1];
              console.log('📚 Next section found:', nextSection.title);

              // Get the first level of the next section with caching
              if (nextSection.section_id) {
                const nextSectionLevels = await cachedBackendApi.getLevels(nextSection.section_id);

                if (nextSectionLevels.length > 0) {
                  nextLevelToUnlock = nextSectionLevels[0].level_id;
                  nextSectionId = nextSection.section_id;
                  console.log('🔓 Unlocking first level of next section:', nextSectionLevels[0].title);
                }
              }
            } else {
              console.log('🎓 All sections completed!');
            }
          } catch (error) {
            console.error('Failed to find next section:', error);
          }
        }

        // Update current level if passed and there's a next level
        if (result.passed && nextLevelToUnlock) {
          updateData.currentLevelId = nextLevelToUnlock;
          updateData.currentSectionId = nextSectionId;

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
              currentLevelId: nextLevelToUnlock,
              currentSectionId: nextSectionId,
              lives: newLives,
              lastLifeRegenTime: newLastLifeRegenTime,
            })
          );

          console.log(`✅ Level completed! Lives increased to ${newLives}/5`);
          console.log(`✅ Next level unlocked: ${nextLevelToUnlock} in section: ${nextSectionId}`);
        } else if (result.passed && !nextLevelToUnlock) {
          // Level completed but no next level (end of all sections/course)
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
          console.log('🎓 All content completed!');
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

        // Hide loading state before navigation
        setIsSubmittingLevel(false);

        navigation.replace("LevelCompletion", {
          xpGained: xpGained,
          accuracy,
          passed: result.passed,
          nextLevelId: nextLevelToUnlock,
        });
      } catch (error) {
        console.error("Error submitting level:", error);

        // Hide loading state
        setIsSubmittingLevel(false);

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

  // Loading screen while submitting level results
  if (isSubmittingLevel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.submittingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.submittingText}>Submitting your results...</Text>
          <Text style={styles.submittingSubtext}>Please wait</Text>
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
          <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
            {levelTitle}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.articleContainer}>
          {/* <TouchableOpacity
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
          </TouchableOpacity> */}

          {/* Display content or description with markdown table support */}
          {renderMarkdownContent(
            levelData.level_summary ||
            levelData.level?.description ||
            levelData.description ||
            "No content available for this level.",
            styles.articleContent
          )}
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
      const options = mcqQ.options || { A: '', B: '', C: '', D: '' };
      const optionsArray = [
        { key: "A", value: options.A || '' },
        { key: "B", value: options.B || '' },
        { key: "C", value: options.C || '' },
        { key: "D", value: options.D || '' },
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
        // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION 
        // onPlayAudio={handlePlayAudio}
        // isPlayingAudio={isPlayingAudio}
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
        // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION 
        // onPlayAudio={handlePlayAudio}
        // isPlayingAudio={isPlayingAudio}
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
        // 🔇 AUDIO FEATURE - COMMENTED OUT FOR COST REDUCTION 
        // onPlayAudio={handlePlayAudio}
        // isPlayingAudio={isPlayingAudio}
        />
      );
    } else {
      // Standard MCQ
      const mcqQ = currentQuestion as GeneratedQuestion;

      // Safety check: ensure options exist
      const options = mcqQ.options || { A: '', B: '', C: '', D: '' };
      const optionsArray = [
        { key: "A", value: options.A || '' },
        { key: "B", value: options.B || '' },
        { key: "C", value: options.C || '' },
        { key: "D", value: options.D || '' },
      ].filter(opt => opt.value !== ''); // Filter out empty options

      return (
        <>
          <View style={styles.questionWithAudioContainer}>
            <Text style={styles.questionText}>{mcqQ.question}</Text>
            {/* <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayAudio}
              disabled={isPlayingAudio}
            >
              <Ionicons
                name={isPlayingAudio ? "pause-circle" : "play-circle"}
                size={32}
                color={COLORS.primary}
              />
            </TouchableOpacity> */}
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
              style={styles.backToArticleButton}
              onPress={handleBackToArticle}
            >
              <Ionicons
                name="book-outline"
                size={20}
                color={COLORS.card}
              />
              <Text style={styles.backToArticleText}>Go To Article</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Question Counter */}
        <View style={styles.questionCounterContainer}>
          <Text style={styles.questionCounterText}>
            Question {currentQuestionIndex + 1}/{questions.length}
          </Text>
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
    paddingTop: 20,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginLeft: SPACING.sm,
    paddingTop: 10,
    flex: 1,
    flexShrink: 1,
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
  backToArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    gap: 4,
  },
  backToArticleText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.card,
  },
  questionCounterContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  questionCounterText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
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
  submittingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  submittingText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SPACING.lg,
    textAlign: "center",
  },
  submittingSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary || "#666",
    marginTop: SPACING.sm,
    textAlign: "center",
  },
});

export default QuestionScreen;
