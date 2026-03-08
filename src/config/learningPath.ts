

export interface LearningPathLevel {
  levelId: string;
  levelNumber: number;
  title: string;
  description: string;
}

export interface LearningPathSection {
  sectionId: string;
  sectionNumber: number;
  title: string;
  description: string;
  levels: LearningPathLevel[];
}


export const LEARNING_PATH: LearningPathSection[] = [
  {
    sectionId: 'a4e06ac5-dac1-46eb-af25-ce02dbfbb614', // Replace with your section ID
    sectionNumber: 1,
    title: 'Financial Basics',
    description: 'Learn the fundamentals of personal finance',
    levels: [
      {
        levelId: '09ac90de-e37d-42da-b6af-d16608fc8bd6', // Replace with your level IDs
        levelNumber: 1,
        title: 'NEEDS AND WANTS',
        description: 'Understanding the difference between needs and wants',
      },
      // Add more levels as they appear in your backend
    ],
  },
  // Add more sections as needed
];

/**
 * Helper function to get section by ID
 */
export const getSectionById = (sectionId: string): LearningPathSection | undefined => {
  return LEARNING_PATH.find(section => section.sectionId === sectionId);
};

/**
 * Helper function to get level by ID
 */
export const getLevelById = (levelId: string): { section: LearningPathSection; level: LearningPathLevel } | undefined => {
  for (const section of LEARNING_PATH) {
    const level = section.levels.find(l => l.levelId === levelId);
    if (level) {
      return { section, level };
    }
  }
  return undefined;
};

/**
 * Get the next level in the learning path
 */
export const getNextLevel = (currentLevelId: string): { section: LearningPathSection; level: LearningPathLevel } | null => {
  for (const section of LEARNING_PATH) {
    const currentIndex = section.levels.findIndex(l => l.levelId === currentLevelId);
    
    if (currentIndex !== -1) {
      // Check if there's a next level in current section
      if (currentIndex < section.levels.length - 1) {
        return {
          section,
          level: section.levels[currentIndex + 1],
        };
      }
      
      // Check if there's a next section
      const sectionIndex = LEARNING_PATH.findIndex(s => s.sectionId === section.sectionId);
      if (sectionIndex < LEARNING_PATH.length - 1) {
        const nextSection = LEARNING_PATH[sectionIndex + 1];
        return {
          section: nextSection,
          level: nextSection.levels[0],
        };
      }
      
      // No more levels
      return null;
    }
  }
  return null;
};
