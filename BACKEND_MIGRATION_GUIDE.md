# Backend Integration Guide

## How to Fetch Sections and Levels from Backend

The backend uses **section IDs** and **level IDs** (UUIDs) instead of the numeric IDs in lessons.json.

### Step 1: Get All Available Sections

First, you need to know which sections are available. Since the backend doesn't have an endpoint to list all sections, you'll need to either:

1. **Hardcode known section IDs** (from the documentation or backend database)
2. **Start with a known first section ID** and navigate from there

For now, let's assume you have a first section ID. You can get it from:
```typescript
// Example: Get all levels in a section
import { backendApi } from '../services/backendApi';

const sectionId = 'a4e06ac5-dac1-46eb-af25-ce02dbfbb614'; // Example from docs
const levels = await backendApi.getSectionLevels(sectionId);
```

### Step 2: Update HomeScreen

Replace the lessons.json usage with backend API calls. Here's how:

```typescript
// OLD WAY (lessons.json)
import lessonsData from "../../data/lessons.json";
const sections = lessonsData.map(section => ...);

// NEW WAY (Backend API)
import { backendApi } from "../../services/backendApi";
import { useState, useEffect } from "react";

const [sections, setSections] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadSections() {
    try {
      // You'll need to know your section IDs
      // Option 1: Hardcode known section IDs
      const knownSectionIds = [
        'a4e06ac5-dac1-46eb-af25-ce02dbfbb614',
        // Add more section IDs here
      ];

      // Load all levels for all sections
      const allSections = await Promise.all(
        knownSectionIds.map(async (sectionId) => {
          const levels = await backendApi.getSectionLevels(sectionId);
          return {
            sectionId,
            levels,
          };
        })
      );

      setSections(allSections);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  }

  loadSections();
}, []);
```

### Step 3: Update QuestionScreen

Replace lessons.json with backend API:

```typescript
// OLD WAY
import lessons from "../../data/lessons.json";
const currentSectionData = lessons.find((s) => s.id === section);
const currentLevelData = currentSectionData?.levels.find((l) => l.id === level);

// NEW WAY
import questionService from "../../services/questions";
import { backendApi } from "../../services/backendApi";

const [levelData, setLevelData] = useState(null);
const [questions, setQuestions] = useState([]);

useEffect(() => {
  async function loadLevel() {
    try {
      // Get level details
      const levelDetails = await backendApi.getLevelDetails(levelId);
      setLevelData(levelDetails);

      // Get questions for this level
      const levelQuestions = await questionService.getQuestionsForLevel(
        levelId,
        10, // Number of questions
        'mixed' // Difficulty
      );
      setQuestions(levelQuestions);
    } catch (error) {
      console.error('Failed to load level:', error);
    }
  }

  loadLevel();
}, [levelId]);
```

### Step 4: Navigation Changes

Update how you navigate to QuestionScreen:

```typescript
// OLD WAY
navigation.navigate("Question", {
  level: 1, // numeric
  section: 1, // numeric
  sectionTitle: "Needs & Wants",
});

// NEW WAY
navigation.navigate("Question", {
  levelId: '09ac90de-e37d-42da-b6af-d16608fc8bd6', // UUID
  sectionId: 'a4e06ac5-dac1-46eb-af25-ce02dbfbb614', // UUID
  levelTitle: "NEEDS AND WANTS",
});
```

### Step 5: Handling Question Format

Backend questions use a different format:

```typescript
// Backend Question Format
{
  question: "What is the difference?",
  options: {
    A: "Option A text",
    B: "Option B text",
    C: "Option C text",
    D: "Option D text"
  },
  correct_answer: "A",
  explanations: {
    A: "Explanation for A",
    B: "Explanation for B",
    C: "Explanation for C",
    D: "Explanation for D"
  },
  difficulty: "medium"
}

// Convert to array format for UI
const optionsArray = Object.entries(question.options).map(([key, value]) => ({
  key,
  text: value,
  isCorrect: key === question.correct_answer
}));
```

## Getting Section IDs from Backend

Since you need section IDs, here are ways to get them:

### Option 1: Query the Backend Directly

Use the backend documentation endpoints to get available sections:

```bash
# Get statistics (shows total sections)
curl https://moneyquestproject-demo-production.up.railway.app/stats

# Get all levels (includes section IDs)
curl https://moneyquestproject-demo-production.up.railway.app/debug/levels
```

### Option 2: Store Section Mapping

Create a configuration file with your sections:

```typescript
// src/config/sections.ts
export const SECTIONS = [
  {
    id: 'a4e06ac5-dac1-46eb-af25-ce02dbfbb614',
    title: 'Introduction to Banking',
    description: 'Learn the basics of banking',
    order: 1,
  },
  // Add more sections as you create them in the backend
];
```

### Option 3: Create a Section Management Screen

Add an admin/setup screen that:
1. Lists available section IDs from backend
2. Lets you map them to your app's structure
3. Saves the mapping in AsyncStorage or user preferences

## Recommended Approach

**For now**, I recommend:

1. **Use the debug endpoint** to get all available level/section IDs:
```typescript
const data = await backendApi.debugListAllLevels();
// This will show you all available sections and levels
```

2. **Create a configuration file** mapping sections to your app:
```typescript
// src/config/learningPath.ts
export const LEARNING_PATH = {
  sections: [
    {
      sectionId: 'a4e06ac5-dac1-46eb-af25-ce02dbfbb614',
      title: 'Financial Basics',
      levels: [
        {
          levelId: '09ac90de-e37d-42da-b6af-d16608fc8bd6',
          title: 'NEEDS AND WANTS',
          order: 1,
        },
        // Add more levels
      ],
    },
    // Add more sections
  ],
};
```

3. **Update screens gradually** - Start with QuestionScreen, then HomeScreen

Would you like me to:
1. Create a helper script to fetch and map your backend sections?
2. Update the HomeScreen to use the backend API?
3. Update the QuestionScreen to use the backend API?
4. Create the configuration file with your backend structure?

Let me know which approach you prefer!
