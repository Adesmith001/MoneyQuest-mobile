# Recap Sections Implementation

## Overview
This document describes the implementation of recap sections that appear after every 9 regular learning sections to provide comprehensive review of learned material.

## Backend API Endpoint
According to the backend documentation, recap sections are available at:
- **Endpoint**: `GET /sections/recap/{section_number}`
- **Recap positions**: 10, 20, 30, 40, etc. (every 10th section)
- **Coverage**: Each recap aggregates content from the previous 9 sections
  - Recap 10 covers sections 1-9
  - Recap 20 covers sections 11-19
  - Recap 30 covers sections 21-29

## Implementation Details

### 1. TypeScript Types (src/types/index.ts)

Added three new interfaces:

#### RecapQuestion
Represents questions from recap sections with support for all three question types (quiz, scenario, matching):
```typescript
export interface RecapQuestion {
  question_type: 'quiz' | 'scenario' | 'matching';
  source_level_id: string;
  source_level_title: string;
  
  // Quiz/Scenario fields
  question_id?: number;
  question_text?: string;
  scenario?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  explanation_a?: string;
  explanation_b?: string;
  explanation_c?: string;
  explanation_d?: string;
  difficulty?: string;
  
  // Matching fields
  pair_id?: number;
  level_id?: string;
  column_a?: string;
  column_b?: string;
}
```

#### RecapSourceSection
Represents one of the 9 source sections that feed into a recap:
```typescript
export interface RecapSourceSection {
  section_number: number;
  section_id: string;
  section_title: string;
  questions_by_type: {
    quiz: RecapQuestion[];
    scenario: RecapQuestion[];
    matching: RecapQuestion[];
  };
  question_count: number;
}
```

#### RecapSectionResponse
The complete response from the backend API:
```typescript
export interface RecapSectionResponse {
  recap_section_id: string;
  recap_section_number: number;
  recap_section_title: string;
  recap_section_description: string;
  source_sections: RecapSourceSection[];
  total_questions: number;
  randomized: boolean;
  limit_per_section: number;
  source_section_range: string;
}
```

### 2. Backend API Service (src/services/backendApi.ts)

Added `getRecapSection()` method:
```typescript
async getRecapSection(
  sectionNumber: number,
  limitPerSection: number = 10,
  randomize: boolean = true
): Promise<RecapSectionResponse>
```

**Parameters:**
- `sectionNumber`: Must be divisible by 10 (10, 20, 30, etc.)
- `limitPerSection`: Max questions per type per section (default: 10)
- `randomize`: Whether to randomize question order (default: true)

### 3. HomeScreen (src/screens/main/HomeScreen.tsx)

#### Key Changes:

**Recap Section Detection:**
After processing each regular section, the code checks if we've reached a milestone (10, 20, 30, etc.):

```typescript
const currentSectionCount = sectionsData.length;
if (currentSectionCount % 10 === 0) {
  // Fetch and insert recap section
  const recapData = await backendApi.getRecapSection(currentSectionCount, 10, true);
  
  // Create "levels" from source sections
  const recapLevelNodes: LevelNode[] = recapData.source_sections.map((sourceSection) => {
    const recapLevelId = `recap_${recapSectionNumber}_source_${sourceSection.section_number}`;
    return {
      id: recapLevelId,
      sectionTitle: recapData.recap_section_title,
      levelTitle: `Review: ${sourceSection.section_title}`,
      // ... progress tracking fields
    };
  });
}
```

**Level ID Format:**
Recap levels use a special ID format: `recap_{section_number}_source_{source_section}`
- Example: `recap_10_source_1` = Review of section 1 within recap 10

**Error Handling:**
If a recap section doesn't exist (e.g., only 3 sections uploaded but trying to fetch recap 10), the error is logged but doesn't break the UI.

### 4. QuestionScreen (src/screens/game/QuestionScreen.tsx)

#### Recap Level Detection:

```typescript
const isRecapLevel = levelId.startsWith('recap_');
```

#### Question Loading Logic:

For recap levels:
1. Parse the level ID to extract recap section number and source section number
2. Fetch the complete recap data using `backendApi.getRecapSection()`
3. Find the specific source section being reviewed
4. Aggregate all question types (quiz, scenario, matching) into a single array
5. Transform backend format to frontend format

```typescript
// Transform quiz questions
sourceSection.questions_by_type.quiz.forEach(q => {
  allQuestions.push({
    question: q.question_text || '',
    options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
    correct_answer: q.correct_answer,
    explanations: { A: q.explanation_a, B: q.explanation_b, ... },
    question_type: 'mcq',
  });
});

// Similar transformations for scenario and matching questions
```

## User Experience Flow

### Visual Flow
1. User completes sections 1-9 normally
2. After completing section 9, section 10 appears as a **Recap Section**
3. Recap Section 10 contains 9 "levels", each reviewing one of sections 1-9
4. Each recap level aggregates all question types from that source section
5. After completing the recap, user continues to sections 11-19
6. After section 19, Recap Section 20 appears (covering sections 11-19)

### Progress Tracking
- Recap sections follow the same unlock/completion logic as regular sections
- Users must complete all previous levels to unlock a recap level
- Completing a recap level counts toward overall progress

## Question Aggregation

Each recap level aggregates:
- **Quiz questions**: Standard multiple-choice questions
- **Scenario questions**: Context-based multiple-choice questions  
- **Matching questions**: Match pairs of related concepts

Questions are:
- Limited to 10 per type per section (configurable)
- Randomized by default
- Sourced from all levels within each reviewed section

## Benefits

1. **Spaced Repetition**: Reinforces learning at regular intervals
2. **Comprehensive Review**: Tests all question types in one session
3. **Progress Validation**: Ensures students retain knowledge from previous sections
4. **Adaptive Learning**: Identifies weak areas through performance tracking

## Configuration

To adjust recap behavior, modify parameters in HomeScreen:

```typescript
// Current settings
const recapData = await backendApi.getRecapSection(
  recapSectionNumber,
  10,      // ← Questions per type per section
  true     // ← Randomize questions
);
```

## Testing

To test recap sections:
1. Ensure at least 9 sections exist in the backend
2. Complete sections 1-9
3. Verify Recap Section 10 appears on HomeScreen
4. Open any level within Recap Section 10
5. Verify questions from the corresponding source section are displayed
6. Verify all three question types (quiz, scenario, matching) are included

## Limitations

- Recap sections only appear if the backend has sufficient source sections
  - For Recap 10: Requires sections 1-9
  - For Recap 20: Requires sections 11-19
- If insufficient sections exist, the recap is silently skipped (logged as warning)

## Future Enhancements

- Add visual indicators to distinguish recap sections from regular sections
- Show performance analytics comparing recap scores to original section scores
- Add "review weak areas" feature that focuses on incorrectly answered questions
- Implement recap completion rewards (bonus XP, achievements)
