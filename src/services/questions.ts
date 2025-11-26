import { databases, DB_ID, COLLECTIONS, Query } from './appwrite';
import { Question, BackendQuestion, GeneratedQuestion, UserProgress, AnyQuestion, ScenarioQuestion, MatchingQuestion, FillInGapQuestion } from '../types';
import { backendApi } from './backendApi';
import { levelProgressService } from './levelProgress';
import { livesService } from './lives';

/**
 * Question Service
 * Handles fetching questions from the MoneyQuest backend API
 * and managing user answers/progress
 */
class QuestionService {
  /**
   * Get questions for a specific level from backend API
   * @param levelId - Backend level UUID
   * @param numQuestions - Number of questions to fetch (default: 10)
   * @param difficulty - Difficulty level
   * @param questionType - Type of questions to fetch
   * @param randomize - Whether to randomize questions
   * @returns Array of questions from the generated response
   */
  async getQuestionsForLevel(
    levelId: string,
    numQuestions: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
    questionType: 'mcq' | 'scenario' | 'matching' | 'fill_in_gap' | 'mixed' = 'mixed',
    randomize: boolean = true
  ): Promise<AnyQuestion[]> {
    try {
      // Try to get existing questions from the backend
      console.log(`Fetching questions for level ${levelId}`);
      const response = await backendApi.getLevelQuestions(levelId, numQuestions, questionType, randomize);
      
      if (response && response.questions && response.questions.length >= numQuestions) {
        // Transform and return existing questions
        const transformed = this.transformBackendQuestions(response.questions);
        return randomize ? this.shuffleArray(transformed).slice(0, numQuestions) : transformed.slice(0, numQuestions);
      }

      // Generate new questions if not enough exist
      console.log(`Generating ${numQuestions} new questions for level ${levelId}`);
      const generateResponse = await backendApi.generateQuestions(levelId, numQuestions, difficulty, questionType, randomize);
      
      return this.transformBackendQuestions(generateResponse.questions);
    } catch (error) {
      console.error('Get questions for level error:', error);
      throw error;
    }
  }

  /**
   * Transform backend question format to app format
   * Handles multiple question types: MCQ, Scenario, Matching, Fill-in-Gap
   */
  private transformBackendQuestions(backendQuestions: any[]): AnyQuestion[] {
    return backendQuestions.map((q: any) => {
      const questionType = q.question_type || 'mcq';

      // Handle Matching Questions
      if (questionType === 'matching') {
        return {
          question_type: 'matching',
          question: q.question_text || q.question,
          left_items: q.left_items || [],
          right_items: q.right_items || [],
          correct_matches: q.correct_matches || {},
          explanation: q.explanation || 'No explanation available.',
          difficulty: q.difficulty || 'medium',
        } as MatchingQuestion;
      }

      // Handle Fill-in-Gap Questions
      if (questionType === 'fill_in_gap') {
        return {
          question_type: 'fill_in_gap',
          question: q.question_text || q.question,
          blanks: q.blanks || [],
          explanation: q.explanation || 'No explanation available.',
          difficulty: q.difficulty || 'medium',
        } as FillInGapQuestion;
      }

      // Handle Scenario Questions (has scenario_context field)
      if (questionType === 'scenario' || q.scenario_context) {
        return {
          question_type: 'scenario',
          scenario_context: q.scenario_context || '',
          question: q.question_text || q.question,
          options: {
            A: q.option_a || q.options?.A,
            B: q.option_b || q.options?.B,
            C: q.option_c || q.options?.C,
            D: q.option_d || q.options?.D,
          },
          correct_answer: q.correct_answer,
          explanations: {
            A: q.explanation_a || q.explanations?.A || 'No explanation available.',
            B: q.explanation_b || q.explanations?.B || 'No explanation available.',
            C: q.explanation_c || q.explanations?.C || 'No explanation available.',
            D: q.explanation_d || q.explanations?.D || 'No explanation available.',
          },
          difficulty: q.difficulty || 'medium',
        } as ScenarioQuestion;
      }

      // Handle standard MCQ Questions (default)
      return {
        question_type: 'mcq',
        question: q.question_text || q.question,
        options: {
          A: q.option_a || q.options?.A,
          B: q.option_b || q.options?.B,
          C: q.option_c || q.options?.C,
          D: q.option_d || q.options?.D,
        },
        correct_answer: q.correct_answer,
        explanations: {
          A: q.explanation_a || q.explanations?.A || 'No explanation available.',
          B: q.explanation_b || q.explanations?.B || 'No explanation available.',
          C: q.explanation_c || q.explanations?.C || 'No explanation available.',
          D: q.explanation_d || q.explanations?.D || 'No explanation available.',
        },
        difficulty: q.difficulty || 'medium',
      } as GeneratedQuestion;
    });
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Record user's answer to a question
   * @param userId - User's Appwrite document ID
   * @param levelId - Backend level UUID
   * @param selectedAnswer - Answer selected by user ('A', 'B', 'C', or 'D')
   * @param correctAnswer - The correct answer
   * @param isCorrect - Whether the answer was correct
   * @param timeSpent - Time spent on the question in seconds
   */
  async recordAnswer(
    userId: string,
    levelId: string,
    selectedAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
    timeSpent: number
  ): Promise<{ livesRemaining: number; canContinue: boolean; xpEarned: number }> {
    try {
      // Calculate XP earned
      const xpEarned = isCorrect ? 10 : 0; // 10 XP per correct answer

      // Update user stats
      const user = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      
      const newTotalQuestions = (user.totalQuestionsAnswered || 0) + 1;
      const newCorrectAnswers = (user.correctAnswers || 0) + (isCorrect ? 1 : 0);
      const newXP = (user.xp || 0) + xpEarned;
      const newMonthlyXP = (user.monthlyXP || 0) + xpEarned;
      const newTotalXP = (user.totalXP || 0) + xpEarned;

      let livesRemaining = user.lives;
      let canContinue = true;

      // Deduct a life if answer is incorrect
      if (!isCorrect) {
        const livesResult = await livesService.deductLife(
          userId,
          user.lives,
          user.lastLifeRegenTime
        );
        livesRemaining = livesResult.lives;
        canContinue = livesResult.canContinue;
      }

      // Update user document
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        totalQuestionsAnswered: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        xp: newXP,
        monthlyXP: newMonthlyXP,
        totalXP: newTotalXP,
        lives: livesRemaining, // Add this to update lives in Appwrite
        updatedAt: new Date().toISOString(),
      });

      return { livesRemaining, canContinue, xpEarned };
    } catch (error) {
      console.error('Record answer error:', error);
      throw error;
    }
  }

  /**
   * Submit completed level quiz
   * @param userId - User's Appwrite document ID
   * @param levelId - Backend level UUID
   * @param questionsCorrect - Number of correct answers
   * @param totalQuestions - Total number of questions
   * @param timeSpentMinutes - Time spent on the level
   */
  async submitLevelQuiz(
    userId: string,
    levelId: string,
    questionsCorrect: number,
    totalQuestions: number,
    timeSpentMinutes: number
  ) {
    try {
      const score = Math.round((questionsCorrect / totalQuestions) * 100);
      
      // Submit to backend and update progress
      const result = await levelProgressService.submitLevelProgress(
        userId,
        levelId,
        score,
        timeSpentMinutes,
        questionsCorrect,
        totalQuestions
      );

      return result;
    } catch (error) {
      console.error('Submit level quiz error:', error);
      throw error;
    }
  }

  /**
   * Get level details from backend
   * @param levelId - Backend level UUID
   */
  async getLevelDetails(levelId: string) {
    try {
      return await backendApi.getLevelDetails(levelId);
    } catch (error) {
      console.error('Get level details error:', error);
      throw error;
    }
  }

  /**
   * Get all levels for a section
   * @param sectionId - Backend section UUID
   */
  async getSectionLevels(sectionId: string) {
    try {
      return await backendApi.getSectionLevels(sectionId);
    } catch (error) {
      console.error('Get section levels error:', error);
      throw error;
    }
  }

  /**
   * Generate TTS audio for question text
   * @param text - Text to convert to speech
   * @param voice - Voice to use
   * @param speed - Speech speed
   */
  async generateQuestionAudio(text: string, voice?: string, speed?: number) {
    try {
      const response = await backendApi.generateTTS(text, voice, speed);
      return backendApi.getAudioUrl(response.audio_url);
    } catch (error) {
      console.error('Generate question audio error:', error);
      return null;
    }
  }

  // ============================================
  // LEGACY METHODS (for backwards compatibility)
  // ============================================

  /**
   * @deprecated Use getQuestionsForLevel instead
   */
  async getQuestions(level: number, section: number): Promise<Question[]> {
    try {
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.QUESTIONS,
        [
          Query.equal('level', level),
          Query.equal('section', section),
          Query.orderAsc('$createdAt')
        ]
      );

      return response.documents.map((doc: any) => ({
        $id: doc.$id,
        level: doc.level,
        section: doc.section,
        questionText: doc.questionText,
        audioUrl: doc.audioUrl,
        options: doc.options,
        correctAnswer: doc.correctAnswer,
        xpReward: doc.xpReward,
        difficulty: doc.difficulty,
        topic: doc.topic,
        createdAt: doc.createdAt || doc.$createdAt,
      }));
    } catch (error) {
      console.error('Get questions error:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use getLevelDetails instead
   */
  async getQuestion(questionId: string): Promise<Question | null> {
    try {
      const doc = await databases.getDocument(DB_ID, COLLECTIONS.QUESTIONS, questionId);
      
      return {
        $id: doc.$id,
        level: doc.level,
        section: doc.section,
        questionText: doc.questionText,
        audioUrl: doc.audioUrl,
        options: doc.options,
        correctAnswer: doc.correctAnswer,
        xpReward: doc.xpReward,
        difficulty: doc.difficulty,
        topic: doc.topic,
        createdAt: doc.createdAt || doc.$createdAt,
      };
    } catch (error) {
      console.error('Get question error:', error);
      return null;
    }
  }

  /**
   * @deprecated Use backend progress tracking instead
   */
  async getUserProgress(userId: string, level: number, section: number): Promise<UserProgress | null> {
    try {
      const response = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.USER_PROGRESS,
        [
          Query.equal('userId', userId),
          Query.equal('level', level),
          Query.equal('section', section)
        ]
      );

      if (response.documents.length > 0) {
        const doc = response.documents[0];
        return {
          $id: doc.$id,
          userId: doc.userId,
          level: doc.level,
          section: doc.section,
          questionsAnswered: doc.questionsAnswered,
          questionsCorrect: doc.questionsCorrect,
          xpEarned: doc.xpEarned,
          completedAt: doc.completedAt,
          isCompleted: doc.isCompleted,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Get user progress error:', error);
      return null;
    }
  }
}

export default new QuestionService();