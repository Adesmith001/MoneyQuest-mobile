# Quick Reference - MoneyQuest API Services

## Import Services

```typescript
import { learningService } from './services/learningService';
import { audioService } from './services/audioService';
import { backendApi } from './services/backendApi';
```

## Common Tasks

### 1. Get All Learning Content
```typescript
const learningPath = await learningService.getLearningPath();
// Returns all sections with their levels embedded
```

### 2. Get Sections
```typescript
const sections = await learningService.getAllSections();
```

### 3. Get Levels for a Section
```typescript
const levels = await learningService.getLevelsForSection(sectionId);
```

### 4. Get Level Details
```typescript
const levelDetail = await learningService.getLevelDetails(levelId);
// Returns: { level: {...}, section: {...} }
```

### 5. Generate Questions
```typescript
const questions = await learningService.generateQuestionsForLevel(
  levelId,
  10,        // number of questions
  'mixed'    // difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
);
```

### 6. Get Existing Questions
```typescript
const questions = await learningService.getQuestionsForLevel(levelId);
```

### 7. Read Text Aloud
```typescript
await audioService.speakText('Hello, welcome!', 'alloy', 1.0);
```

### 8. Read Question Aloud
```typescript
await audioService.readQuestion(questionText);
```

### 9. Read Explanation Aloud
```typescript
await audioService.readExplanation(explanationText);
```

### 10. Submit Quiz Results
```typescript
const result = await backendApi.submitLevelResults(
  userId,
  levelId,
  85,    // score (0-100)
  10     // time spent in minutes
);
```

### 11. Get User Progress
```typescript
const progress = await backendApi.getUserLevelProgress(userId, levelId);
```

### 12. Control Audio Playback
```typescript
audioService.stopAudio();    // Stop playing
audioService.pauseAudio();   // Pause
audioService.resumeAudio();  // Resume
audioService.isPlaying();    // Check status
```

## Response Types

### Section
```typescript
{
  document_id: string;
  title: string;
  category?: string;
  description?: string;
}
```

### Level
```typescript
{
  level_id: string;
  level_number: number;
  title: string;
  description: string;
  has_quiz: boolean;
  min_score_to_pass: number;
  estimated_time_minutes: number;
}
```

### Generated Question
```typescript
{
  question: string;
  options: { A: string; B: string; C: string; D: string; };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanations: { A: string; B: string; C: string; D: string; };
  difficulty: string;
}
```

### Question Response
```typescript
{
  level_id: string;
  level_title: string;
  section_title: string;
  questions: GeneratedQuestion[];
  total_generated: number;
  sources_used: string[];
}
```

## Error Handling

Always wrap API calls in try-catch:

```typescript
try {
  const sections = await learningService.getAllSections();
} catch (error) {
  console.error('Failed to fetch sections:', error);
  // Handle error
}
```

## Available Voices

- `alloy` (default)
- `echo`
- `fable`
- `onyx`
- `nova`
- `shimmer`

## Complete Example

```typescript
async function loadAndPlayLesson() {
  try {
    // 1. Get sections
    const sections = await learningService.getAllSections();
    const section = sections[0];
    
    // 2. Get levels
    const levels = await learningService.getLevelsForSection(section.document_id);
    const level = levels[0];
    
    // 3. Get level details
    const details = await learningService.getLevelDetails(level.level_id);
    
    // 4. Read description
    await audioService.speakText(details.level.description);
    
    // 5. Generate questions
    const questions = await learningService.generateQuestionsForLevel(
      level.level_id,
      5,
      'easy'
    );
    
    // 6. Read first question
    if (questions.questions.length > 0) {
      await audioService.readQuestion(questions.questions[0].question);
    }
    
    return { section, level, details, questions };
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Notes

- All operations are **read-only** (except question generation and progress submission)
- All IDs are UUIDs
- API base URL: `https://moneyquestproject-demo-production.up.railway.app`
- Questions are generated using AI/RAG
- Audio uses browser's Audio API

---

For full documentation, see:
- `src/services/README.md`
- `src/services/examples.ts`
- `MoneyQuestProject-demo/documentation.md`
