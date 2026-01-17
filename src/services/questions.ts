import { databases, DB_ID, COLLECTIONS, Query } from './appwrite';
import { Question, BackendQuestion, GeneratedQuestion, UserProgress, AnyQuestion, ScenarioQuestion, MatchingQuestion, FillInGapQuestion } from '../types';
import { backendApi } from './backendApi';
import cachedBackendApi from './cachedBackendApi';
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
      console.log(`Fetching questions for level ${levelId}, type: ${questionType}`);
      
      // If requesting specific types, try specialized endpoints first
      if (questionType === 'scenario') {
        return await this.getScenarioQuestions(levelId, numQuestions, randomize);
      } else if (questionType === 'matching') {
        return await this.getMatchingQuestions(levelId, numQuestions, randomize);
      } else if (questionType === 'mixed') {
        return await this.getMixedQuestions(levelId, numQuestions, randomize);
      }
      
      // For MCQ or other types, use standard endpoint
      const response = await backendApi.getLevelQuestions(levelId, numQuestions, questionType, randomize);
      
      if (response && response.questions && response.questions.length > 0) {
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
   * Get scenario questions from specialized endpoint
   */
  private async getScenarioQuestions(levelId: string, limit: number, randomize: boolean): Promise<ScenarioQuestion[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (randomize) params.append('randomize', randomize.toString());
      
      const endpoint = `/levels/${levelId}/scenario-questions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await backendApi['fetchApi'](endpoint) as any;
      
      if (response && response.questions && response.questions.length > 0) {
        return response.questions.map((q: any) => ({
          question_type: 'scenario',
          scenario_context: q.scenario || '',
          question: q.question_text,
          options: {
            A: q.option_a,
            B: q.option_b,
            C: q.option_c,
            D: q.option_d,
          },
          correct_answer: q.correct_answer,
          explanations: {
            A: q.explanation_a || 'No explanation available.',
            B: q.explanation_b || 'No explanation available.',
            C: q.explanation_c || 'No explanation available.',
            D: q.explanation_d || 'No explanation available.',
          },
          difficulty: q.difficulty || 'medium',
        })) as ScenarioQuestion[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching scenario questions:', error);
      return [];
    }
  }

  /**
   * Get MCQ questions
   */
  private async getMCQQuestions(levelId: string, limit: number, randomize: boolean): Promise<GeneratedQuestion[]> {
    try {
      const response = await backendApi.getLevelQuestions(levelId, limit, 'mcq', randomize);
      
      if (response && response.questions && response.questions.length > 0) {
        return response.questions.map((q: any) => ({
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
        })) as GeneratedQuestion[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching MCQ questions:', error);
      return [];
    }
  }

  /**
   * Get fill-in-gap questions
   */
  private async getFillInGapQuestions(levelId: string, limit: number, randomize: boolean): Promise<FillInGapQuestion[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (randomize) params.append('randomize', randomize.toString());
      
      const endpoint = `/levels/${levelId}/fill-in-gap-questions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await backendApi['fetchApi'](endpoint) as any;
      
      if (response && response.questions && response.questions.length > 0) {
        return response.questions.map((q: any) => ({
          question_type: 'fill_in_gap',
          question: q.question_text || q.question,
          blanks: q.blanks || [],
          explanation: q.explanation || 'No explanation available.',
          difficulty: q.difficulty || 'medium',
        })) as FillInGapQuestion[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching fill-in-gap questions:', error);
      return [];
    }
  }

  /**
   * Get matching questions from specialized endpoint and aggregate pairs
   */
  private async getMatchingQuestions(levelId: string, limit: number, randomize: boolean): Promise<MatchingQuestion[]> {
    try {
      // Request more pairs than needed to ensure we have enough
      const pairsNeeded = Math.max(limit * 5, 10); // Get at least 10 pairs or 5x the limit
      const params = new URLSearchParams();
      params.append('limit', pairsNeeded.toString());
      if (randomize) params.append('randomize', randomize.toString());
      
      const endpoint = `/levels/${levelId}/matching-questions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await backendApi['fetchApi'](endpoint) as any;
      
      console.log('Matching questions response:', response);
      console.log('Number of pairs received:', response?.questions?.length);
      
      if (response && response.questions && response.questions.length > 0) {
        const allPairs = response.questions;
        const matchingQuestions: MatchingQuestion[] = [];
        
        console.log('Total pairs received:', allPairs.length);
        
        // Split pairs into chunks of maximum 5
        const MAX_PAIRS_PER_QUESTION = 5;
        const numQuestions = Math.ceil(allPairs.length / MAX_PAIRS_PER_QUESTION);
        
        for (let i = 0; i < numQuestions; i++) {
          const startIdx = i * MAX_PAIRS_PER_QUESTION;
          const endIdx = Math.min(startIdx + MAX_PAIRS_PER_QUESTION, allPairs.length);
          const pairs = allPairs.slice(startIdx, endIdx);
          
          console.log(`Creating matching question ${i + 1} with ${pairs.length} pairs`);
          
          // Create left items with sequential IDs
          const leftItems = pairs.map((p: any, idx: number) => ({
            id: `left_${p.pair_id || idx + 1}`,
            text: p.column_a
          }));
          
          // Create right items with their original pair IDs (before shuffling)
          const rightItemsWithPairIds = pairs.map((p: any, idx: number) => ({
            id: `right_${p.pair_id || idx + 1}`,
            text: p.column_b,
            originalPairId: p.pair_id || idx + 1 // Keep track of original pair
          }));
          
          // Shuffle right items for display (this randomizes the order)
          const shuffledRightItems = randomize ? this.shuffleArray(rightItemsWithPairIds) : rightItemsWithPairIds;
          
          // Create correct matches mapping based on pair_id
          const correctMatches: { [key: string]: string } = {};
          pairs.forEach((p: any, idx: number) => {
            const pairId = p.pair_id || idx + 1;
            correctMatches[`left_${pairId}`] = `right_${pairId}`;
          });
          
          // Remove the originalPairId from the final right items (not needed in UI)
          const finalRightItems = shuffledRightItems.map(({ id, text }: { id: string; text: string; originalPairId: number }) => ({ id, text }));
          
          matchingQuestions.push({
            question_type: 'matching',
            question: pairs.length > 1 
              ? 'Match the items in the left column with their correct descriptions in the right column'
              : 'Match the item with its correct description',
            left_items: leftItems,
            right_items: finalRightItems,
            correct_matches: correctMatches,
            explanation: 'Match each concept with its correct definition or example.',
            difficulty: 'medium',
          } as MatchingQuestion);
        }
        
        console.log(`Split into ${matchingQuestions.length} matching questions`);
        return matchingQuestions;
      }
      return [];
    } catch (error) {
      console.error('Error fetching matching questions:', error);
      return [];
    }
  }

  /**
   * Get mixed question types with balanced distribution
   * 3 MCQ, 3 Scenario, 2 Matching, 2 Fill-in-Gap = 10 questions
   */
  private async getMixedQuestions(levelId: string, numQuestions: number, randomize: boolean): Promise<AnyQuestion[]> {
    try {
      // Define the distribution for 10 questions
      const distribution = {
        mcq: 3,
        scenario: 3,
        matching: 2,
        fillInGap: 2
      };

      // Adjust distribution if numQuestions is different from 10
      if (numQuestions !== 10) {
        const ratio = numQuestions / 10;
        distribution.mcq = Math.round(3 * ratio);
        distribution.scenario = Math.round(3 * ratio);
        distribution.matching = Math.round(2 * ratio);
        distribution.fillInGap = numQuestions - (distribution.mcq + distribution.scenario + distribution.matching);
      }

      console.log('Fetching balanced questions with distribution:', distribution);

      // Fetch all question types in parallel
      const [mcqQuestions, scenarioQuestions, matchingQuestions, fillInGapQuestions] = await Promise.all([
        this.getMCQQuestions(levelId, distribution.mcq, randomize),
        this.getScenarioQuestions(levelId, distribution.scenario, randomize),
        this.getMatchingQuestions(levelId, distribution.matching, randomize),
        this.getFillInGapQuestions(levelId, distribution.fillInGap, randomize),
      ]);

      console.log('Questions fetched:', {
        mcq: mcqQuestions.length,
        scenario: scenarioQuestions.length,
        matching: matchingQuestions.length,
        fillInGap: fillInGapQuestions.length
      });

      // Combine all questions
      const allQuestions: AnyQuestion[] = [
        ...mcqQuestions,
        ...scenarioQuestions,
        ...matchingQuestions,
        ...fillInGapQuestions
      ];

      // Shuffle if requested to mix up the order of different types
      return randomize ? this.shuffleArray(allQuestions) : allQuestions;
    } catch (error) {
      console.error('Error fetching mixed questions:', error);
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

      // Handle Matching Questions (from /matching-questions endpoint)
      if (questionType === 'matching' || q.pair_id !== undefined) {
        // If it's raw matching pairs, we need to aggregate them
        if (q.pair_id !== undefined && q.column_a && q.column_b) {
          // This is a single pair - should be aggregated at a higher level
          // For now, return a placeholder that will be filtered out
          return null;
        }
        
        return {
          question_type: 'matching',
          question: q.question_text || q.question || 'Match the items correctly',
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

      // Handle Scenario Questions (has scenario field)
      if (questionType === 'scenario' || q.scenario || q.scenario_context) {
        return {
          question_type: 'scenario',
          scenario_context: q.scenario || q.scenario_context || '',
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
    }).filter(q => q !== null) as AnyQuestion[];
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

      // Update user stats - with error handling for missing user
      let user;
      try {
        user = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      } catch (error) {
        console.error('User document not found, returning default values');
        // Return safe defaults if user document doesn't exist
        return { livesRemaining: 5, canContinue: true, xpEarned };
      }
      
      const newTotalQuestions = (user.totalQuestionsAnswered || 0) + 1;
      const newCorrectAnswers = (user.correctAnswers || 0) + (isCorrect ? 1 : 0);
      const newXP = (user.xp || 0) + xpEarned;
      const newMonthlyXP = (user.monthlyXP || 0) + xpEarned;
      const newTotalXP = (user.totalXP || 0) + xpEarned;

      // NOTE: Lives deduction is handled in QuestionScreen.tsx after this function returns
      // Do NOT deduct lives here to avoid double deduction
      let livesRemaining = user.lives !== undefined && user.lives !== null ? user.lives : 5;
      let canContinue = livesRemaining > 0;

      // Update user document (without touching lives - that's handled separately in QuestionScreen)
      try {
        await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
          totalQuestionsAnswered: newTotalQuestions,
          correctAnswers: newCorrectAnswers,
          xp: newXP,
          monthlyXP: newMonthlyXP,
          totalXP: newTotalXP,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to update user document, continuing anyway');
      }

      return { livesRemaining, canContinue, xpEarned };
    } catch (error) {
      console.error('Record answer error:', error);
      // Return safe defaults instead of throwing
      return { livesRemaining: 5, canContinue: true, xpEarned: isCorrect ? 10 : 0 };
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
      return await cachedBackendApi.getLevels(sectionId);
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