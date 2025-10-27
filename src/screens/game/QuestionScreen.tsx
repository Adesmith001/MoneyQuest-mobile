import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Audio } from "expo-av";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import lessons from "../../data/lessons.json";
import {
  nextQuestion,
  nextLevel,
  addHealth,
  addXP,
  removeHealth,
  setCurrentSection,
  setCurrentLevel,
} from "../../store/slices/gameSlice";
import CorrectAnswerModal from "../../components/modals/CorrectAnswerModal";
import IncorrectAnswerModal from "../../components/modals/IncorrectAnswerModal";
import { RootState } from "../../store";
import ProgressBar from "../../components/progressBar";
import CustomButton from "../../components/CustomButton";

interface Props {
  navigation: any;
  route: {
    params: {
      level: number;
      section: number;
      sectionTitle: string;
    };
  };
}

interface Question {
  id: number;
  type: "selection" | "fill-in-the-blank" | "audio" | "matching";
  text: string;
  audioUrl?: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  pairs?: { left: string; right: string }[]; // For matching questions
}

interface Article {
  title: string;
  content: string;
}

const QuestionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { level, section, sectionTitle } = route.params;
  const dispatch = useDispatch();
  const { health } = useSelector((state: RootState) => state.game);

  const [lessonData, setLessonData] = useState<{
    article: Article;
    questions: Question[];
  } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showArticle, setShowArticle] = useState(true);

  const [isCorrectModalVisible, setCorrectModalVisible] = useState(false);
  const [isIncorrectModalVisible, setIncorrectModalVisible] = useState(false);

  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // For matching questions
  const [matchingPairs, setMatchingPairs] = useState<{ [key: string]: string }>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  async function playSound(url: string) {
    if (sound) {
      await sound.replayAsync();
      setIsPlaying(true);
      return;
    }
    try {
      const { sound: soundObject } = await Audio.Sound.createAsync({
        uri: url,
      });
      soundObject.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      setSound(soundObject);
      await soundObject.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to load sound", error);
    }
  }

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    const currentSectionData = lessons.find((s) => s.id === section);
    const currentLevelData = currentSectionData?.levels.find(
      (l) => l.id === level
    );
    if (currentLevelData) {
      setLessonData(currentLevelData as any);
    }
    setIsLoading(false);
  }, [level, section]);

  const handleAnswerSelect = (answer: string) => {
    if (!isCorrectModalVisible && !isIncorrectModalVisible) {
      setSelectedAnswer(answer);
    }
  };

  const handleMatchingSelect = (item: string, side: 'left' | 'right') => {
    if (side === 'left') {
      setSelectedLeft(item);
    } else if (selectedLeft) {
      // Create or update the pair
      setMatchingPairs(prev => ({
        ...prev,
        [selectedLeft]: item
      }));
      setSelectedLeft(null);
    }
  };

  const checkMatchingAnswer = () => {
    const currentQuestion = lessonData?.questions[currentQuestionIndex];
    if (!currentQuestion || !currentQuestion.pairs) return false;

    // Check if all pairs are matched correctly
    const correctPairs = currentQuestion.pairs;
    const userMatchedAll = correctPairs.every(pair => 
      matchingPairs[pair.left] === pair.right
    );

    return userMatchedAll && Object.keys(matchingPairs).length === correctPairs.length;
  };

  const handleSubmit = () => {
    const currentQuestion = lessonData?.questions[currentQuestionIndex];
    
    let isCorrect = false;

    if (currentQuestion?.type === "matching") {
      isCorrect = checkMatchingAnswer();
    } else {
      if (!selectedAnswer) return;
      isCorrect = selectedAnswer === currentQuestion?.correctAnswer;
    }

    if (isCorrect) {
      dispatch(addXP(10));
      dispatch(addHealth(1));
      setXpGained(xpGained + 10);
      setCorrectAnswersCount(correctAnswersCount + 1);
      setCorrectModalVisible(true);
    } else {
      dispatch(removeHealth(1));
      setIncorrectModalVisible(true);
    }
  };

  const handleContinue = () => {
    setCorrectModalVisible(false);
    setIncorrectModalVisible(false);
    setSelectedAnswer("");
    setMatchingPairs({});
    setSelectedLeft(null);

    if (currentQuestionIndex < (lessonData?.questions.length ?? 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      dispatch(nextQuestion());
    } else {
      const currentSectionData = lessons.find((s) => s.id === section);
      
      // FIXED: Check if this is the last level in the section
      const isLastLevelInSection = level >= (currentSectionData?.levels.length ?? 0);

      if (isLastLevelInSection) {
        // Check if there's a next section
        const nextSectionExists = lessons.find((s) => s.id === section + 1);
        
        if (nextSectionExists) {
          // Move to the next section
          dispatch(setCurrentSection(section + 1));
          dispatch(setCurrentLevel(1));
        } else {
          // User has completed all sections
          dispatch(nextLevel());
        }
      } else {
        // Move to the next level in the same section
        dispatch(nextLevel());
      }

      const accuracy = Math.round(
        (correctAnswersCount / (lessonData?.questions.length ?? 1)) * 100
      );
      navigation.replace("LevelCompletion", {
        xpGained: xpGained,
        accuracy,
      });
    }
  };

  if (isLoading || !lessonData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (showArticle) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.articleContainer}>
          <Text style={styles.articleTitle}>{lessonData.article.title}</Text>
          <Text style={styles.articleContent}>
            {lessonData.article.content}
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <CustomButton
            title="Start Questions"
            onPress={() => setShowArticle(false)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = lessonData.questions[currentQuestionIndex];
  const progress =
    ((currentQuestionIndex + 1) / lessonData.questions.length) * 100;

  const canSubmit = currentQuestion.type === "matching" 
    ? Object.keys(matchingPairs).length === (currentQuestion.pairs?.length ?? 0)
    : !!selectedAnswer;

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
        {currentQuestion.type === "audio" && currentQuestion.audioUrl && (
          <View style={styles.audioPlayerContainer}>
            <Image
              source={require("../../../assets/sound-waves.png")}
              style={styles.soundWaveIcon}
            />
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playSound(currentQuestion.audioUrl!)}
            >
              <Image
                source={
                  isPlaying
                    ? require("../../../assets/pause.png")
                    : require("../../../assets/play.png")
                }
                style={styles.playIcon}
              />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.questionText}>{currentQuestion.text}</Text>

        {/* Matching Question Type */}
        {currentQuestion.type === "matching" && currentQuestion.pairs && (
          <View style={styles.matchingContainer}>
            <View style={styles.matchingColumn}>
              <Text style={styles.matchingColumnTitle}>Match these:</Text>
              {currentQuestion.pairs.map((pair, idx) => (
                <TouchableOpacity
                  key={`${pair.left}-${idx}`}
                  style={[
                    styles.matchingItem,
                    selectedLeft === pair.left && styles.selectedMatchingItem,
                    matchingPairs[pair.left] && styles.matchedItem,
                  ]}
                  onPress={() => handleMatchingSelect(pair.left, 'left')}
                >
                  <Text style={styles.matchingItemText}>{pair.left}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.matchingColumn}>
              <Text style={styles.matchingColumnTitle}>With these:</Text>
              {currentQuestion.pairs.map((pair, idx) => (
                <TouchableOpacity
                  key={`${pair.right}-${idx}`}
                  style={[
                    styles.matchingItem,
                    Object.values(matchingPairs).includes(pair.right) && styles.matchedItem,
                  ]}
                  onPress={() => handleMatchingSelect(pair.right, 'right')}
                  disabled={!selectedLeft}
                >
                  <Text style={styles.matchingItemText}>{pair.right}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Regular Options (for selection, fill-in-the-blank, and audio) */}
        {currentQuestion.type !== "matching" && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  selectedAnswer === option && styles.selectedOption,
                ]}
                onPress={() => handleAnswerSelect(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAnswer === option && styles.selectedOptionText,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
          setMatchingPairs({});
          setSelectedLeft(null);
        }}
        chosenAnswer={selectedAnswer || "No answer selected"}
        explanation={currentQuestion.explanation || "No explanation available."}
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
  optionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
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
  audioPlayerContainer: {
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  soundWaveIcon: {
    width: 150,
    height: 50,
    resizeMode: "contain",
    marginBottom: SPACING.md,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    width: 30,
    height: 30,
    resizeMode: "contain",
    tintColor: COLORS.card,
  },
  // Matching question styles
  matchingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  matchingColumn: {
    flex: 1,
  },
  matchingColumnTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
    textAlign: "center",
    color: COLORS.text,
  },
  matchingItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: "transparent",
    minHeight: 50,
    justifyContent: "center",
  },
  selectedMatchingItem: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "20",
  },
  matchedItem: {
    backgroundColor: "#4CAF50" + "20",
    borderColor: "#4CAF50",
  },
  matchingItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: "center",
  },
  matchingArrow: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    textAlign: "center",
    fontWeight: "600",
  },
});

export default QuestionScreen;