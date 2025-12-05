# Component Guide

This document provides an overview of reusable components in MoneyQuest.

## Component Categories

### 1. Input Components

#### AnimatedTextInput

**Location**: `src/components/AnimatedTextInput.tsx`

Animated text input with floating label.

**Props**:
```typescript
interface Props {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}
```

**Usage**:
```typescript
<AnimatedTextInput
  placeholder="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  error={emailError}
/>
```

### 2. Button Components

#### CustomButton

**Location**: `src/components/CustomButton.tsx`

Styled button with loading state.

**Props**:
```typescript
interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}
```

**Usage**:
```typescript
<CustomButton
  title="Login"
  onPress={handleLogin}
  variant="primary"
  loading={isLoading}
  disabled={!isValid}
/>
```

#### SelectionButton

**Location**: `src/components/SelectionButton.tsx`

Button for selection screens (onboarding, avatars).

**Props**:
```typescript
interface Props {
  title: string;
  onPress: () => void;
  selected?: boolean;
  icon?: string;
  subtitle?: string;
}
```

**Usage**:
```typescript
<SelectionButton
  title="10-15 minutes"
  subtitle="Quick daily sessions"
  selected={selected === '10-15'}
  onPress={() => handleSelect('10-15')}
/>
```

### 3. Container Components

#### ResponsiveContainer

**Location**: `src/components/ResponsiveContainer.tsx`

Responsive wrapper that adapts to screen size.

**Props**:
```typescript
interface Props {
  children: React.ReactNode;
  padding?: number;
  backgroundColor?: string;
  centerContent?: boolean;
}
```

**Usage**:
```typescript
<ResponsiveContainer centerContent padding={20}>
  <Text>Content</Text>
</ResponsiveContainer>
```

### 4. Progress Components

#### ProgressBar

**Location**: `src/components/progressBar.tsx`

Animated progress indicator.

**Props**:
```typescript
interface Props {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
}
```

**Usage**:
```typescript
<ProgressBar
  progress={75}
  height={8}
  color="#FF6B35"
  showPercentage
/>
```

### 5. Modal Components

#### CorrectAnswerModal

**Location**: `src/components/modals/CorrectAnswerModal.tsx`

Shows feedback for correct answers.

**Props**:
```typescript
interface Props {
  visible: boolean;
  onContinue: () => void;
  xpEarned: number;
  explanation: string;
}
```

**Usage**:
```typescript
<CorrectAnswerModal
  visible={showModal}
  onContinue={handleContinue}
  xpEarned={10}
  explanation={currentQuestion.explanations[selectedAnswer]}
/>
```

#### IncorrectAnswerModal

**Location**: `src/components/modals/IncorrectAnswerModal.tsx`

Shows feedback for incorrect answers with lives deduction.

**Props**:
```typescript
interface Props {
  visible: boolean;
  onContinue: () => void;
  correctAnswer: string;
  explanation: string;
  livesRemaining: number;
}
```

**Usage**:
```typescript
<IncorrectAnswerModal
  visible={showModal}
  onContinue={handleContinue}
  correctAnswer="B"
  explanation={explanation}
  livesRemaining={lives}
/>
```

#### FeedbackModal

**Location**: `src/components/modals/FeedbackModal.tsx`

Generic feedback modal.

**Props**:
```typescript
interface Props {
  visible: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}
```

#### InviteFriendsModal

**Location**: `src/components/modals/InviteFriendsModal.tsx`

Modal for sharing invite links.

**Props**:
```typescript
interface Props {
  visible: boolean;
  onClose: () => void;
  inviteLink: string;
}
```

**Usage**:
```typescript
<InviteFriendsModal
  visible={showInviteModal}
  onClose={() => setShowInviteModal(false)}
  inviteLink="https://moneyquest.app/invite/ABC123"
/>
```

### 6. Question Components

#### ScenarioQuestion

**Location**: `src/components/questions/ScenarioQuestion.tsx`

Renders scenario-based questions with context.

**Props**:
```typescript
interface Props {
  question: ScenarioQuestion;
  onAnswer: (answer: string) => void;
  selectedAnswer?: string;
  showResult?: boolean;
}
```

**Usage**:
```typescript
<ScenarioQuestion
  question={currentQuestion}
  onAnswer={handleAnswer}
  selectedAnswer={selectedAnswer}
  showResult={hasAnswered}
/>
```

#### MatchingQuestion

**Location**: `src/components/questions/MatchingQuestion.tsx`

Interactive matching pairs question.

**Props**:
```typescript
interface Props {
  question: MatchingQuestion;
  onAnswer: (matches: { [key: string]: string }) => void;
  showResult?: boolean;
}
```

**Features**:
- Drag and drop matching
- Visual feedback for correct/incorrect matches
- Auto-validation

#### FillInGapQuestion

**Location**: `src/components/questions/FillInGapQuestion.tsx`

Fill-in-the-blank style questions.

**Props**:
```typescript
interface Props {
  question: FillInGapQuestion;
  onAnswer: (answers: { [blankId: string]: string }) => void;
  showResult?: boolean;
}
```

**Features**:
- Multiple blanks support
- Dropdown or text input options
- Real-time validation

### 7. Loading Components

#### LoadingScreen

**Location**: `src/components/LoadingScreen.tsx`

Full-screen loading indicator.

**Props**:
```typescript
interface Props {
  message?: string;
}
```

**Usage**:
```typescript
<LoadingScreen message="Loading your progress..." />
```

#### LearningPathSkeleton

**Location**: `src/components/skeletons/LearningPathSkeleton.tsx`

Skeleton loader for home screen.

**Usage**:
```typescript
{isLoading ? (
  <LearningPathSkeleton />
) : (
  <LearningPathContent />
)}
```

## Component Patterns

### 1. Responsive Sizing

Use `Dimensions` for responsive layouts:

```typescript
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: screenWidth * 0.9, // 90% of screen width
    height: screenHeight * 0.6, // 60% of screen height
  },
  text: {
    fontSize: Math.max(screenWidth * 0.04, 14), // Min 14px
  },
});
```

### 2. Conditional Rendering

```typescript
const Component = ({ loading, error, data }) => {
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;
  
  return <DataView data={data} />;
};
```

### 3. Composition

Build complex UIs from simple components:

```typescript
const QuestionCard = ({ question }) => (
  <ResponsiveContainer>
    <ProgressBar progress={progress} />
    {question.question_type === 'scenario' ? (
      <ScenarioQuestion question={question} onAnswer={handleAnswer} />
    ) : question.question_type === 'matching' ? (
      <MatchingQuestion question={question} onAnswer={handleAnswer} />
    ) : (
      <MCQQuestion question={question} onAnswer={handleAnswer} />
    )}
    <CustomButton title="Submit" onPress={handleSubmit} />
  </ResponsiveContainer>
);
```

### 4. Prop Types with TypeScript

Always define prop types:

```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  onAction: (value: string) => void;
  children?: React.ReactNode;
}

const Component: React.FC<ComponentProps> = ({
  required,
  optional = 0,
  onAction,
  children,
}) => {
  // Component implementation
};
```

### 5. Default Props

```typescript
const CustomButton: React.FC<Props> = ({
  variant = 'primary',
  disabled = false,
  loading = false,
  ...props
}) => {
  // Component implementation
};
```

## Styling Guidelines

### 1. StyleSheet

Use `StyleSheet.create` for performance:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    color: '#333333',
  },
});
```

### 2. Color Constants

Define colors in constants:

```typescript
// src/constants/index.ts
export const COLORS = {
  primary: '#FF6B35',
  secondary: '#6C757D',
  success: '#28A745',
  error: '#DC3545',
  background: '#FFFFFF',
  text: '#333333',
};
```

### 3. Responsive Spacing

Use responsive values:

```typescript
const styles = StyleSheet.create({
  container: {
    padding: Math.max(screenWidth * 0.05, 16), // 5% min 16px
    margin: Math.max(screenHeight * 0.02, 12), // 2% min 12px
  },
});
```

### 4. Platform-Specific Styles

```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  text: {
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
});
```

## Accessibility

### 1. Accessible Labels

```typescript
<TouchableOpacity
  accessible
  accessibilityLabel="Submit answer"
  accessibilityRole="button"
  onPress={handleSubmit}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### 2. Semantic Components

```typescript
<View accessibilityRole="header">
  <Text>Question 1 of 10</Text>
</View>
```

### 3. Screen Reader Support

```typescript
<TextInput
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email to sign in"
  placeholder="Email"
/>
```

## Animation

### 1. Layout Animation

```typescript
import { LayoutAnimation } from 'react-native';

const handleExpand = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpanded(!expanded);
};
```

### 2. Animated Values

```typescript
import { Animated } from 'react-native';

const Component = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text>Fading in!</Text>
    </Animated.View>
  );
};
```

## Testing Components

### Example Test

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import CustomButton from '../CustomButton';

test('button calls onPress when clicked', () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <CustomButton title="Click me" onPress={onPress} />
  );
  
  fireEvent.press(getByText('Click me'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

---

**Previous**: [← Services & API](./04-services-api.md)  
**Next**: [Question System →](./06-question-system.md)
