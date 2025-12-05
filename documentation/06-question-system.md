# Question System

This document explains how questions are generated, fetched, rendered, and validated in MoneyQuest.

## Question Flow

```
Backend (Python) → Generate Questions (OpenAI)
    ↓
Store in Database (PostgreSQL)
    ↓
Frontend Fetches Questions (questionService)
    ↓
Render Question Component
    ↓
User Answers
    ↓
Validate & Show Feedback
    ↓
Update Progress & XP
```

## Question Types

### 1. Multiple Choice (MCQ)

Standard 4-option multiple choice questions.

```typescript
interface GeneratedQuestion {
  question_type: 'mcq';
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
}
```

**Example**:
```json
{
  "question_type": "mcq",
  "question": "What is compound interest?",
  "options": {
    "A": "Interest calculated on principal only",
    "B": "Interest calculated on principal plus accumulated interest",
    "C": "A type of bank account",
    "D": "A government bond"
  },
  "correct_answer": "B",
  "explanations": {
    "A": "This describes simple interest, not compound interest.",
    "B": "Correct! Compound interest earns interest on both principal and accumulated interest.",
    "C": "Compound interest is a calculation method, not an account type.",
    "D": "Compound interest is not related to bonds specifically."
  },
  "difficulty": "medium"
}
```

### 2. Scenario Questions

Context-based questions with a story or situation.

```typescript
interface ScenarioQuestion {
  question_type: 'scenario';
  scenario_context: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: { A: string; B: string; C: string; D: string };
  difficulty: string;
}
```

**Example**:
```json
{
  "question_type": "scenario",
  "scenario_context": "Sarah has $1,000 in savings and wants to buy a laptop that costs $800. She also needs to keep some money for emergencies.",
  "question": "What should Sarah do?",
  "options": {
    "A": "Buy the laptop immediately",
    "B": "Save more money first",
    "C": "Buy the laptop but keep $200 for emergencies",
    "D": "Use a credit card to buy the laptop"
  },
  "correct_answer": "C",
  "difficulty": "medium"
}
```

### 3. Matching Questions

Match items from left column to right column.

```typescript
interface MatchingQuestion {
  question_type: 'matching';
  question: string;
  left_items: { id: string; text: string }[];
  right_items: { id: string; text: string }[];
  correct_matches: { [leftId: string]: string };
  explanation: string;
  difficulty: string;
}
```

**Example**:
```json
{
  "question_type": "matching",
  "question": "Match each financial term with its definition",
  "left_items": [
    { "id": "left_1", "text": "Budget" },
    { "id": "left_2", "text": "Investment" },
    { "id": "left_3", "text": "Savings" }
  ],
  "right_items": [
    { "id": "right_1", "text": "Money set aside for future use" },
    { "id": "right_2", "text": "A plan for spending and saving money" },
    { "id": "right_3", "text": "Using money to potentially earn more" }
  ],
  "correct_matches": {
    "left_1": "right_2",
    "left_2": "right_3",
    "left_3": "right_1"
  },
  "difficulty": "easy"
}
```

### 4. Fill-in-the-Gap

Complete sentences with correct words/phrases.

```typescript
interface FillInGapQuestion {
  question_type: 'fill_in_gap';
  question: string; // Contains {blank1}, {blank2} placeholders
  blanks: {
    id: string;
    correct_answer: string;
    options?: string[];
  }[];
  explanation: string;
  difficulty: string;
}
```

**Example**:
```json
{
  "question_type": "fill_in_gap",
  "question": "A {blank1} is a plan for managing money, while {blank2} is money earned from investments.",
  "blanks": [
    {
      "id": "blank1",
      "correct_answer": "budget",
      "options": ["budget", "loan", "credit", "debt"]
    },
    {
      "id": "blank2",
      "correct_answer": "interest",
      "options": ["interest", "expense", "tax", "fee"]
    }
  ],
  "explanation": "A budget helps plan spending, and interest is earned on investments.",
  "difficulty": "easy"
}
```

## Fetching Questions

### Basic Fetch

```typescript
import questionService from '../services/questions';

const loadQuestions = async () => {
  const questions = await questionService.getQuestionsForLevel(
    levelId,      // Backend level UUID
    10,           // Number of questions
    'mixed',      // Difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
    'mixed',      // Type: 'mcq' | 'scenario' | 'matching' | 'fill_in_gap' | 'mixed'
    true          // Randomize
  );
  
  setQuestions(questions);
};
```

### Mixed Questions

The service automatically fetches a balanced mix:
- 3 MCQ questions
- 3 Scenario questions
- 2 Matching questions
- 2 Fill-in-Gap questions

```typescript
const questions = await questionService.getQuestionsForLevel(
  levelId,
  10,
  'mixed',
  'mixed',
  true
);
```

### Specific Type

```typescript
// Only scenario questions
const scenarios = await questionService.getQuestionsForLevel(
  levelId,
  5,
  'medium',
  'scenario',
  true
);
```

## Rendering Questions

### Question Screen Implementation

**Location**: `src/screens/game/QuestionScreen.tsx`

```typescript
const QuestionScreen = ({ route }) => {
  const { level, section, sectionTitle } = route.params;
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const currentQuestion = questions[currentIndex];

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.question_type) {
      case 'scenario':
        return (
          <ScenarioQuestion
            question={currentQuestion}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
          />
        );
      case 'matching':
        return (
          <MatchingQuestion
            question={currentQuestion}
            onAnswer={handleMatchingAnswer}
          />
        );
      case 'fill_in_gap':
        return (
          <FillInGapQuestion
            question={currentQuestion}
            onAnswer={handleFillAnswer}
          />
        );
      default: // MCQ
        return (
          <MCQQuestion
            question={currentQuestion}
            onAnswer={handleAnswer}
            selectedAnswer={selectedAnswer}
          />
        );
    }
  };

  return (
    <View>
      <ProgressBar progress={(currentIndex / questions.length) * 100} />
      {renderQuestion()}
    </View>
  );
};
```

### MCQ Rendering

```typescript
const MCQQuestion = ({ question, onAnswer, selectedAnswer }) => (
  <View>
    <Text style={styles.question}>{question.question}</Text>
    {Object.entries(question.options).map(([key, value]) => (
      <TouchableOpacity
        key={key}
        style={[
          styles.option,
          selectedAnswer === key && styles.selectedOption,
        ]}
        onPress={() => onAnswer(key)}
      >
        <Text>{key}. {value}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
```

### Scenario Rendering

```typescript
const ScenarioQuestion = ({ question, onAnswer, selectedAnswer }) => (
  <View>
    {/* Scenario Context */}
    <View style={styles.scenarioBox}>
      <Text style={styles.scenarioContext}>
        {question.scenario_context}
      </Text>
    </View>
    
    {/* Question */}
    <Text style={styles.question}>{question.question}</Text>
    
    {/* Options */}
    {Object.entries(question.options).map(([key, value]) => (
      <TouchableOpacity
        key={key}
        style={[
          styles.option,
          selectedAnswer === key && styles.selectedOption,
        ]}
        onPress={() => onAnswer(key)}
      >
        <Text>{key}. {value}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
```

## Answer Validation

### Submit Answer

```typescript
const handleAnswer = async (answer: string) => {
  const isCorrect = answer === currentQuestion.correct_answer;
  
  // Record answer in backend
  const result = await questionService.recordAnswer(
    userId,
    levelId,
    answer,
    currentQuestion.correct_answer,
    isCorrect,
    timeSpent
  );
  
  // Update local state
  setAnswers([...answers, { answer, isCorrect }]);
  
  // Show feedback modal
  if (isCorrect) {
    setShowCorrectModal(true);
  } else {
    setShowIncorrectModal(true);
    setLives(result.livesRemaining);
  }
  
  // Check if can continue
  if (!result.canContinue) {
    Alert.alert('Out of Lives', 'Wait for lives to regenerate');
    navigation.goBack();
  }
};
```

### Matching Validation

```typescript
const handleMatchingAnswer = (matches: { [key: string]: string }) => {
  // Check if all matches are correct
  const isCorrect = Object.keys(question.correct_matches).every(
    leftId => matches[leftId] === question.correct_matches[leftId]
  );
  
  // Partial credit: count correct matches
  const correctCount = Object.keys(question.correct_matches).filter(
    leftId => matches[leftId] === question.correct_matches[leftId]
  ).length;
  
  const totalMatches = Object.keys(question.correct_matches).length;
  const score = (correctCount / totalMatches) * 100;
  
  // Record answer
  await questionService.recordAnswer(
    userId,
    levelId,
    JSON.stringify(matches),
    JSON.stringify(question.correct_matches),
    isCorrect,
    timeSpent
  );
};
```

### Fill-in-Gap Validation

```typescript
const handleFillAnswer = (answers: { [blankId: string]: string }) => {
  // Check each blank
  const isCorrect = question.blanks.every(
    blank => answers[blank.id]?.toLowerCase() === blank.correct_answer.toLowerCase()
  );
  
  // Record answer
  await questionService.recordAnswer(
    userId,
    levelId,
    JSON.stringify(answers),
    JSON.stringify(question.blanks.map(b => b.correct_answer)),
    isCorrect,
    timeSpent
  );
};
```

## Feedback System

### Correct Answer Modal

```typescript
<CorrectAnswerModal
  visible={showCorrectModal}
  onContinue={() => {
    setShowCorrectModal(false);
    moveToNextQuestion();
  }}
  xpEarned={10}
  explanation={currentQuestion.explanations[selectedAnswer]}
/>
```

### Incorrect Answer Modal

```typescript
<IncorrectAnswerModal
  visible={showIncorrectModal}
  onContinue={() => {
    setShowIncorrectModal(false);
    moveToNextQuestion();
  }}
  correctAnswer={currentQuestion.correct_answer}
  explanation={currentQuestion.explanations[currentQuestion.correct_answer]}
  livesRemaining={lives}
/>
```

## Scoring & XP

### XP Calculation

```typescript
const calculateXP = (isCorrect: boolean, difficulty: string, timeSpent: number): number => {
  if (!isCorrect) return 0;
  
  // Base XP
  let xp = 10;
  
  // Difficulty multiplier
  const difficultyMultiplier = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
  };
  xp *= difficultyMultiplier[difficulty] || 1.0;
  
  // Time bonus (answered within 30 seconds)
  if (timeSpent < 30) {
    xp += 5;
  }
  
  return Math.round(xp);
};
```

### Level Completion

```typescript
const handleLevelComplete = async () => {
  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const totalQuestions = questions.length;
  const accuracy = (correctAnswers / totalQuestions) * 100;
  const totalXP = answers.reduce((sum, a) => sum + (a.xpEarned || 0), 0);
  
  // Submit to backend
  const result = await questionService.submitLevelQuiz(
    userId,
    levelId,
    correctAnswers,
    totalQuestions,
    totalTimeSpent / 60 // Convert to minutes
  );
  
  // Navigate to completion screen
  navigation.replace('LevelCompletion', {
    xpGained: totalXP,
    accuracy,
    passed: result.passed,
    nextLevelUnlocked: result.next_level_unlocked,
  });
};
```

## Audio Support

### Text-to-Speech

```typescript
import questionService from '../services/questions';

const playQuestionAudio = async (questionText: string) => {
  try {
    const audioUrl = await questionService.generateQuestionAudio(
      questionText,
      'alloy', // Voice
      1.0      // Speed
    );
    
    if (audioUrl) {
      await audioService.loadAudio(audioUrl);
      await audioService.playAudio();
    }
  } catch (error) {
    console.error('Failed to play audio:', error);
  }
};
```

## Best Practices

### 1. Randomization

Always randomize questions and options:

```typescript
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Randomize questions
const randomizedQuestions = shuffleArray(questions);
```

### 2. Timer Implementation

```typescript
const [timeSpent, setTimeSpent] = useState(0);

useEffect(() => {
  const timer = setInterval(() => {
    setTimeSpent(prev => prev + 1);
  }, 1000);
  
  return () => clearInterval(timer);
}, [currentIndex]);

// Reset timer on new question
useEffect(() => {
  setTimeSpent(0);
}, [currentIndex]);
```

### 3. Prevent Multiple Submissions

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return;
  
  setIsSubmitting(true);
  try {
    await submitAnswer();
  } finally {
    setIsSubmitting(false);
  }
};
```

### 4. Error Handling

```typescript
const loadQuestions = async () => {
  try {
    setIsLoading(true);
    const data = await questionService.getQuestionsForLevel(levelId, 10, 'mixed', 'mixed', true);
    
    if (data.length === 0) {
      Alert.alert('No Questions', 'No questions available for this level');
      navigation.goBack();
      return;
    }
    
    setQuestions(data);
  } catch (error) {
    console.error('Failed to load questions:', error);
    Alert.alert('Error', 'Failed to load questions. Please try again.');
    navigation.goBack();
  } finally {
    setIsLoading(false);
  }
};
```

---

**Previous**: [← Component Guide](./05-component-guide.md)  
**Next**: [User Progress & Lives →](./07-progress-lives.md)
