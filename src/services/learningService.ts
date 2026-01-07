import { backendApi } from './backendApi';
import cachedBackendApi from './cachedBackendApi';
import {
  BackendSection,
  BackendLevel,
  BackendLevelDetail,
  BackendQuestionResponse,
} from '../types';

/**
 * Learning Service - Handles fetching sections, levels, and questions
 * Read-only service for consuming the MoneyQuest backend API
 */
class LearningService {
  // ============================================
  // SECTION METHODS
  // ============================================

  /**
   * Get all available sections
   * @returns Array of sections
   */
  async getAllSections(): Promise<BackendSection[]> {
    try {
      const sections = await cachedBackendApi.getSections();
      console.log('Fetched sections:', sections);
      return sections;
    } catch (error) {
      console.error('Error fetching sections:', error);
      throw new Error('Failed to fetch sections');
    }
  }

  /**
   * Get a specific section by ID (from documents endpoint)
   * @param sectionId - UUID of the section
   */
  async getSectionById(sectionId: string): Promise<BackendSection | null> {
    try {
      const documents = await backendApi.getDocuments();
      const section = documents.find(doc => doc.document_id === sectionId);
      return section || null;
    } catch (error) {
      console.error(`Error fetching section ${sectionId}:`, error);
      return null;
    }
  }

  // ============================================
  // LEVEL METHODS
  // ============================================

  /**
   * Get all levels for a specific section
   * @param sectionId - UUID of the section
   * @returns Array of levels in the section
   */
  async getLevelsForSection(sectionId: string): Promise<BackendLevel[]> {
    try {
      const levels = await cachedBackendApi.getLevels(sectionId);
      console.log(`Fetched ${levels.length} levels for section ${sectionId}`);
      return levels;
    } catch (error) {
      console.error(`Error fetching levels for section ${sectionId}:`, error);
      throw new Error('Failed to fetch levels');
    }
  }

  /**
   * Get detailed information about a specific level
   * @param levelId - UUID of the level
   * @returns Level details including section information
   */
  async getLevelDetails(levelId: string): Promise<BackendLevelDetail> {
    try {
      const levelDetail = await backendApi.getLevelDetails(levelId);
      console.log('Fetched level details:', levelDetail);
      return levelDetail;
    } catch (error) {
      console.error(`Error fetching level details ${levelId}:`, error);
      throw new Error('Failed to fetch level details');
    }
  }

  /**
   * Get level title and description only (lightweight)
   * @param levelId - UUID of the level
   * @returns Level title and description
   */
  async getLevelDescription(levelId: string): Promise<{
    level_id: string;
    title: string;
    description: string;
  }> {
    try {
      const description = await backendApi.getLevelDescription(levelId);
      console.log('Fetched level description:', description);
      return description;
    } catch (error) {
      console.error(`Error fetching level description ${levelId}:`, error);
      throw new Error('Failed to fetch level description');
    }
  }

  // ============================================
  // QUESTION METHODS
  // ============================================

  /**
   * Generate AI-powered questions for a level
   * @param levelId - UUID of the level
   * @param numQuestions - Number of questions to generate (default: 10, max: 20)
   * @param difficulty - Difficulty level: "easy", "medium", "hard", "mixed"
   * @returns Generated questions with metadata
   */
  async generateQuestionsForLevel(
    levelId: string,
    numQuestions: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'
  ): Promise<BackendQuestionResponse> {
    try {
      const response = await backendApi.generateQuestions(
        levelId,
        numQuestions,
        difficulty
      );
      console.log(
        `Generated ${response.total_generated} questions for level ${levelId}`
      );
      return response;
    } catch (error) {
      console.error(`Error generating questions for level ${levelId}:`, error);
      throw new Error('Failed to generate questions');
    }
  }

  /**
   * Get previously generated questions for a level
   * @param levelId - UUID of the level
   * @returns Question response with questions array
   */
  async getQuestionsForLevel(levelId: string): Promise<BackendQuestionResponse> {
    try {
      const response = await backendApi.getLevelQuestions(levelId);
      console.log(`Fetched ${response.questions.length} questions for level ${levelId}`);
      
      return response;
    } catch (error) {
      console.error(`Error fetching questions for level ${levelId}:`, error);
      throw new Error('Failed to fetch questions');
    }
  }

  // ============================================
  // COMBINED/UTILITY METHODS
  // ============================================

  /**
   * Get complete learning path: sections with their levels
   * @returns Array of sections with embedded levels
   */
  async getLearningPath(): Promise<
    Array<BackendSection & { levels: BackendLevel[] }>
  > {
    try {
      const sections = await this.getAllSections();
      const learningPath = await Promise.all(
        sections.map(async section => {
          try {
            const levels = await this.getLevelsForSection(section.document_id);
            return { ...section, levels };
          } catch (error) {
            console.error(
              `Error fetching levels for section ${section.document_id}:`,
              error
            );
            return { ...section, levels: [] };
          }
        })
      );
      console.log('Fetched complete learning path');
      return learningPath;
    } catch (error) {
      console.error('Error fetching learning path:', error);
      throw new Error('Failed to fetch learning path');
    }
  }

  /**
   * Get the next level in a section
   * @param sectionId - UUID of the section
   * @param currentLevelNumber - Current level number
   * @returns Next level or null if none exists
   */
  async getNextLevel(
    sectionId: string,
    currentLevelNumber: number
  ): Promise<BackendLevel | null> {
    try {
      const levels = await this.getLevelsForSection(sectionId);
      const sortedLevels = levels.sort(
        (a, b) => a.level_number - b.level_number
      );
      const nextLevel = sortedLevels.find(
        level => level.level_number === currentLevelNumber + 1
      );
      return nextLevel || null;
    } catch (error) {
      console.error('Error getting next level:', error);
      return null;
    }
  }

  /**
   * Check if a level has quiz/questions
   * @param levelId - UUID of the level
   * @returns True if level has quiz
   */
  async levelHasQuiz(levelId: string): Promise<boolean> {
    try {
      const levelDetail = await this.getLevelDetails(levelId);
      return levelDetail.level.has_quiz;
    } catch (error) {
      console.error('Error checking if level has quiz:', error);
      return false;
    }
  }

  /**
   * Get level progress requirements
   * @param levelId - UUID of the level
   * @returns Min score to pass and estimated time
   */
  async getLevelRequirements(levelId: string): Promise<{
    minScoreToPass: number;
    estimatedTimeMinutes: number;
  }> {
    try {
      const levelDetail = await this.getLevelDetails(levelId);
      return {
        minScoreToPass: levelDetail.level.min_score_to_pass,
        estimatedTimeMinutes: levelDetail.level.estimated_time_minutes,
      };
    } catch (error) {
      console.error('Error fetching level requirements:', error);
      return {
        minScoreToPass: 70,
        estimatedTimeMinutes: 5,
      };
    }
  }
}

// Export singleton instance
export const learningService = new LearningService();
export default learningService;
