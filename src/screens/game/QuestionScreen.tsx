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
  Modal,
  TextInput,
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
import { fetchLeaderboard } from "../../store/slices/leaderboardSlice";
import CorrectAnswerModal from "../../components/modals/CorrectAnswerModal";
import IncorrectAnswerModal from "../../components/modals/IncorrectAnswerModal";
import FlagQuestionModal from "../../components/modals/FlagQuestionModal";
import { RootState } from "../../store";
import ProgressBar from "../../components/progressBar";
import CustomButton from "../../components/CustomButton";
import questionService from "../../services/questions";
import { backendApi } from "../../services/backendApi";
import cachedBackendApi from "../../services/cachedBackendApi";
import learningService from "../../services/learningService";
import { databases, DB_ID, COLLECTIONS, Query } from "../../services/appwrite";
import {
  AnyQuestion,
  GeneratedQuestion,
  ScenarioQuestion,
  MatchingQuestion,
  FillInGapQuestion,
} from "../../types";
import soundService from "../../services/soundService";
import livesService from "../../services/lives";
import ScenarioQuestionComponent from "../../components/questions/ScenarioQuestion";
import MatchingQuestionComponent from "../../components/questions/MatchingQuestion";
import FillInGapQuestionComponent from "../../components/questions/FillInGapQuestion";
import cacheService from "../../services/cacheService";
import { RenderContentWithTables } from "../../utils/tableParser";
import CoachMark from "../../components/tutorial/CoachMark";
import { QUESTION_COACH_STEPS } from "../../config/coachMarkSteps";
import { markQuestionGuideSeen } from "../../store/slices/tutorialSlice";

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
 * Mix and limit questions to exactly 10 with specified distribution:
 * 3 scenario, 3 MCQ, 2 fill in the gaps, 2 matching
 */
const mixAndLimitQuestions = (questions: AnyQuestion[]): AnyQuestion[] => {
  // Separate questions by type
  const scenario = questions.filter(q => q.question_type === 'scenario');
  const mcq = questions.filter(q => q.question_type === 'mcq');
  const fillGap = questions.filter(q => q.question_type === 'fill_in_gap');
  const matching = questions.filter(q => q.question_type === 'matching');

  // Target counts for each type
  const targetCounts = {
    scenario: 3,
    mcq: 3,
    fillGap: 2,
    matching: 2,
  };

  // Helper to shuffle and take N items
  const shuffleAndTake = (arr: AnyQuestion[], count: number) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  };

  const selectedMcq = shuffleAndTake(mcq, targetCounts.mcq);
  const selectedFillGap = shuffleAndTake(fillGap, targetCounts.fillGap);
  const selectedScenario = shuffleAndTake(scenario, targetCounts.scenario);
  const selectedMatching = shuffleAndTake(matching, targetCounts.matching);

  const selectedQuestions: AnyQuestion[] = [
    ...selectedMcq,
    ...selectedFillGap,
    ...selectedScenario,
    ...selectedMatching,
  ];

  const remainingNeeded = 10 - selectedQuestions.length;
  if (remainingNeeded > 0) {
    const usedIds = new Set(selectedQuestions.map(q => JSON.stringify(q)));
    const remaining = questions.filter(q => !usedIds.has(JSON.stringify(q)));
    selectedQuestions.push(...shuffleAndTake(remaining, remainingNeeded));
  }

  return selectedQuestions.slice(0, 10);
};

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
      pair_id: q.pair_id, // Preserve database ID
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
      gap_id: q.gap_id, // Preserve database ID
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
    question_id: q.question_id, // Preserve database ID
  };
  
  if (questionType === 'scenario') {
    return {
      ...baseQuestion,
      question_type: 'scenario',
      scenario_context: q.scenario_context || q.scenario || '',
      scenario_id: q.scenario_id || q.question_id, // Fallback to question_id (backend uses this field)
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

  const { hasSeenQuestionGuide } = useSelector((state: RootState) => state.tutorial);

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

  // Coach marks (must be after viewMode declaration)
  const [coachStep, setCoachStep] = useState(0);
  const showCoachMarks = !hasSeenQuestionGuide && !isLoading && viewMode === 'quiz' && questions.length > 0 && currentQuestionIndex === 0;

  const [isCorrectModalVisible, setCorrectModalVisible] = useState(false);
  const [isIncorrectModalVisible, setIncorrectModalVisible] = useState(false);

  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0); // Track all attempts (correct + incorrect)
  const [xpGained, setXpGained] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [matchingResults, setMatchingResults] = useState<{
    correct: string[];
    incorrect: string[];
  }>({ correct: [], incorrect: [] });

  // Section image URL (displayed in article view)
  const [sectionImageUrl, setSectionImageUrl] = useState<string | null>(null);

  // Track if this level was already completed (for retakes - no life deduction)
  const [isRetake, setIsRetake] = useState(false);
  
  // Track if level results are being submitted (final submission)
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false);
  // Track if waiting for next question (disables button after answer)
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);

  // Flag question state
  const [isFlagged, setIsFlagged] = useState(false);
  const [isFlagModalVisible, setIsFlagModalVisible] = useState(false);

  // Refresh lives from Appwrite when screen is focused
  // Also sync progress when screen loses focus (user navigates away)
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserLives = async () => {
        if (!user?.$id) return;
        
        try {
          // Add timeout to prevent hangs on iOS
          const livesPromise = livesService.refreshLives(
            user.$id,
            user.lives !== undefined && user.lives !== null ? user.lives : 5,
            user.lastLifeRegenTime || new Date().toISOString()
          );
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Lives refresh timeout')), 5000)
          );

          const { lives, lastLifeRegenTime } = await Promise.race([livesPromise, timeoutPromise]);
          
          // Update Redux store with new lives
          dispatch(setHealth(lives));
          dispatch(updateUser({ lives, lastLifeRegenTime }));
        } catch (error) {
          console.error('Failed to refresh lives (non-fatal):', error);
          // Continue with cached lives - don't block the game
        }
      };

      refreshUserLives();

      // Return cleanup function - runs when screen loses focus
      return () => {
        // Sync progress to Appwrite when leaving the screen
        if (user?.$id && viewMode === "quiz" && currentQuestionIndex > 0) {
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
          
          const mixedQuestions = mixAndLimitQuestions(allQuestions);
          setQuestions(mixedQuestions);
        } else {
          // Regular level - Check cache for level data first
          let cachedLevelData = await cacheService.getLevelData(levelId);
          
          if (cachedLevelData) {
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
          }

          // Fetch section image for article view
          if (sectionId) {
            try {
              const section = await learningService.getSectionById(sectionId);
              if (section?.image_url) {
                setSectionImageUrl(section.image_url);
              }
            } catch (imgErr) {
              console.warn('Could not load section image:', imgErr);
            }
          }

          // Get questions for this level with caching
          const levelQuestions = await cachedBackendApi.getQuestions(
            levelId,
            10,
            "mixed"
          );
          
          // Normalize all questions to ensure proper structure
          const normalizedQuestions = levelQuestions
            .map(q => normalizeQuestion(q))
            .filter((q): q is AnyQuestion => q !== null);
          
          // Mix and limit to exactly 10 questions with proper distribution
          const mixedQuestions = mixAndLimitQuestions(normalizedQuestions);
          setQuestions(mixedQuestions);
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
          section: 1, // Section number for tracking (not UUID)
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


  const handleSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !user) return;

    // Prevent multiple submissions
    if (isWaitingForNext) return;
    setIsWaitingForNext(true);

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
      }
    }

    // Always increment total attempts for accuracy calculation
    setTotalAttempts(totalAttempts + 1);

    // IMMEDIATE life deduction for incorrect answers - don't wait for API
    // BUT skip life deduction if this is a retake of an already completed level
    if (!isCorrect && !isRetake) {
      soundService.playSound("incorrect"); // Play incorrect sound immediately

      // Deduct life IMMEDIATELY using livesService and update Appwrite
      try {
        const { lives, lastLifeRegenTime, canContinue } =
          await livesService.deductLife(
            user.$id,
            user.lives !== undefined && user.lives !== null ? user.lives : 5,
            user.lastLifeRegenTime || new Date().toISOString()
          );

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
    }

    try {
      // Record answer and update XP (life already deducted above if not retake)
      // On retakes, give reduced XP (5 instead of 10)
      const result = await questionService.recordAnswer(
        user.$id,
        levelId,
        userAnswer,
        currentQuestion.question_type === "mcq" ||
          currentQuestion.question_type === "scenario"
          ? (currentQuestion as GeneratedQuestion).correct_answer
          : "correct",
        isCorrect,
        5, // Time spent in seconds (you can track this properly)
        isRetake // Pass retake status to get correct XP amount
      );

      if (isCorrect) {
        soundService.playSound("correct"); // Play correct sound
        // Give XP: 10 for first time, 5 for retakes
        dispatch(addXP(result.xpEarned));
        setXpGained(xpGained + result.xpEarned);
        setCorrectAnswersCount(correctAnswersCount + 1);
        setCorrectModalVisible(true);
      } else {
        // Life already deducted above, just show the modal
        setIncorrectModalVisible(true);
        // Allow user to retry - reset waiting state for incorrect answers
        setIsWaitingForNext(false);
      }

      // Refresh user data to update profile with latest XP and lives
      if (user?.$id) {
        try {
          dispatch(refreshUserData(user.$id) as any);
        } catch (error) {
          // Silently fail - not critical
        }
      }
    } catch (error) {
      console.error("Error recording answer:", error);
      // If incorrect, still show the modal (life was already deducted)
      if (!isCorrect) {
        setIncorrectModalVisible(true);
        // Allow user to retry on error too
        setIsWaitingForNext(false);
      }
    }
  };

  const handleContinue = async () => {
    setCorrectModalVisible(false);
    setIncorrectModalVisible(false);
    setSelectedAnswer("");
    setMatchingAnswers({});
    setFillInGapAnswers({});
    setIsFlagged(false); // Reset flag state for next question
    setIsFlagModalVisible(false); // Ensure flag modal is closed
    setIsWaitingForNext(false); // Re-enable the button for next question

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

      setIsSubmittingLevel(true); // Show loading screen

      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
      
      // Calculate accuracy based on total attempts (correct answers / total attempts)
      // This penalizes wrong answers: if you needed 15 attempts for 10 questions, accuracy = 67%
      const accuracy = totalAttempts > 0 
        ? Math.round((correctAnswersCount / totalAttempts) * 100)
        : 0;

      try {
        // Submit level completion to backend — pass xpGained so Appwrite gets the real per-question XP
        const result = await questionService.submitLevelQuiz(
          user.$id,
          levelId,
          correctAnswersCount,
          questions.length,
          timeSpentMinutes,
          xpGained            // <-- actual per-question XP accumulated this session
        );

        // Use the XP values that were actually committed to Appwrite (fresh DB read + xpGained)
        const { xp: newXP, monthlyXP: newMonthlyXP, totalXP: newTotalXP } = result.writtenXP;

        // Current month key — used to prevent ProfileScreen from re-triggering monthly reset
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

        // updateData only carries fields NOT already written by submitLevelProgress
        const updateData: any = {
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

        // Determine next level: check if this was the last level in the section
        let nextLevelToUnlock = result.next_level_id;
        let nextSectionId = sectionId;

        if (result.passed && !result.next_level_id) {
          // No next level returned means we're at the end of the current section
          try {
            // Get all sections with caching
            const allSections = await cachedBackendApi.getSections();
            const currentSectionIndex = allSections.findIndex(s => s.section_id === sectionId);
            
            if (currentSectionIndex !== -1 && currentSectionIndex < allSections.length - 1) {
              // There is a next section
              const nextSection = allSections[currentSectionIndex + 1];
              // Get the first level of the next section with caching
              if (nextSection.section_id) {
                const nextSectionLevels = await cachedBackendApi.getLevels(nextSection.section_id);
                
                if (nextSectionLevels.length > 0) {
                  nextLevelToUnlock = nextSectionLevels[0].level_id;
                  nextSectionId = nextSection.section_id;
                }
              }
            } else {
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

          // Update Redux store with new currentLevelId, lives AND earned XP
          dispatch(
            updateUser({
              currentLevelId: nextLevelToUnlock,
              currentSectionId: nextSectionId,
              lives: newLives,
              lastLifeRegenTime: newLastLifeRegenTime,
              xp: newXP,
              monthlyXP: newMonthlyXP,
              totalXP: newTotalXP,
              lastMonthlyReset: currentMonthKey,
            })
          );
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
              xp: newXP,
              monthlyXP: newMonthlyXP,
              totalXP: newTotalXP,
              lastMonthlyReset: currentMonthKey,
            })
          );
          
        } else {
          dispatch(
            updateUser({
              xp: newXP,
              monthlyXP: newMonthlyXP,
              totalXP: newTotalXP,
              lastMonthlyReset: currentMonthKey,
            })
          );
        }

        await databases.updateDocument(
          DB_ID,
          COLLECTIONS.USERS,
          user.$id,
          updateData
        );

        // Silently refresh leaderboard so the user's new rank is visible immediately
        dispatch(fetchLeaderboard({ silent: true }) as any);

        dispatch(nextLevel());
        navigation.replace("LevelCompletion", {
          xpGained: xpGained,
          accuracy,
          passed: result.passed,
          nextLevelId: nextLevelToUnlock,
          sectionId,
        });
      } catch (error) {
        console.error("Error submitting level:", error);
        // Still navigate to completion screen even if submission fails
        navigation.replace("LevelCompletion", {
          xpGained: xpGained,
          accuracy,
          sectionId,
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
          <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
            {levelTitle}
          </Text>
        </View>

         {/* Section image (if uploaded for this section) */}
          {sectionImageUrl ? (
            <View style={styles.sectionImageContainer}>
              <Image
                source={{ uri: sectionImageUrl }}
                style={styles.sectionImage}
                resizeMode="cover"
              />
            </View>
          ) : null}

        <ScrollView contentContainerStyle={styles.articleContainer}>

          {/* Display content or description */}
          <RenderContentWithTables 
            content={
              levelData.level_summary ||
              levelData.level?.description ||
              levelData.description ||
              "No content available for this level."
            }
            textStyle={styles.articleContent}
          />
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

  const handleFlagQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // If already flagged, toggle off
    if (isFlagged) {
      setIsFlagged(false);
      return;
    }

    // Open the flag modal so the user can choose a reason
    setIsFlagModalVisible(true);
  };

  const handleFlagSubmit = async (reason: string, flaggedBy: string) => {
    setIsFlagModalVisible(false);

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    try {
      // Determine question type and ID
      let questionType: 'quiz' | 'scenario' | 'matching' = 'quiz';
      let questionId = '';

      const questionData = currentQuestion as any;

      if (currentQuestion.question_type === 'scenario') {
        questionType = 'scenario';
        questionId = String(questionData.scenario_id);
      } else if (currentQuestion.question_type === 'matching') {
        questionType = 'matching';
        questionId = String(questionData.pair_id);
      } else if (currentQuestion.question_type === 'fill_in_gap') {
        questionType = 'quiz'; // Fill-in-gap treated as quiz type
        questionId = String(questionData.gap_id);
      } else {
        questionType = 'quiz';
        questionId = String(questionData.question_id);
      }

      // Validate that we have a proper numeric ID
      if (!questionId || questionId === 'undefined' || questionId === 'null') {
        console.warn('⚠️ Question ID not found, cannot flag question');
        return;
      }

      await backendApi.flagQuestion(
        questionId,
        questionType,
        reason,
        flaggedBy || user?.$id
      );

      setIsFlagged(true);
    } catch (error) {
      console.error("Error flagging question:", error);
      // Still mark as flagged even if API call fails
      setIsFlagged(true);
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
          onGoToArticle={handleBackToArticle}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.questionHeaderRow}>
          <TouchableOpacity
            style={styles.flagButton}
            onPress={handleFlagQuestion}
          >
            <Ionicons 
              name={isFlagged ? "flag" : "flag-outline"} 
              size={20} 
              color={isFlagged ? "#FF6B6B" : "#999"} 
            />
          </TouchableOpacity>
          
          <View style={styles.questionCounterContainer}>
            <Text style={styles.questionCounterText}>
              {currentQuestionIndex + 1}/{questions.length}
            </Text>
          </View>
        </View>

        {renderQuestion()}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          title={"Next"}
          onPress={handleSubmit}
          disabled={!canSubmit || isWaitingForNext}
        />
      </View>

      {/* Level completion loading screen */}
      {isSubmittingLevel && (
        <View style={styles.submittingOverlay}>
          <View style={styles.submittingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.submittingText}>Submitting answers...</Text>
            <Text style={styles.submittingSubtext}>Please wait</Text>
          </View>
        </View>
      )}

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

      <FlagQuestionModal
        visible={isFlagModalVisible}
        defaultFlaggedBy={user?.name || ''}
        onSubmit={handleFlagSubmit}
        onClose={() => setIsFlagModalVisible(false)}
      />

      {/* Coach marks for first-time question experience */}
      <CoachMark
        visible={showCoachMarks}
        steps={QUESTION_COACH_STEPS}
        currentStep={coachStep}
        onNext={() => setCoachStep((prev) => prev + 1)}
        onSkip={() => {
          dispatch(markQuestionGuideSeen());
          setCoachStep(0);
        }}
        onComplete={() => {
          dispatch(markQuestionGuideSeen());
          setCoachStep(0);
        }}
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
  questionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  flagButton: {
    padding: SPACING.xs,
  },
  questionCounterContainer: {
    alignItems: "flex-end",
  },
  questionCounterText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
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
    paddingBottom: SPACING.md + 16,
  },
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  submittingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  submittingText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  submittingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: '#666',
    marginTop: SPACING.xs,
    textAlign: 'center',
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
    fontSize: FONT_SIZES.lg + 1,
    lineHeight: 30,
    color: COLORS.text,
  },
  sectionImageContainer: {
    overflow: 'hidden',
    padding: SPACING.md,
  },
  sectionImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border || '#E0E0E0',
  },
});

export default QuestionScreen;
