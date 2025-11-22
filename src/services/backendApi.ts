import { MONEYQUEST_API_BASE_URL } from '../../env';
import {
  BackendLevel,
  BackendSection,
  BackendLevelDetail,
  BackendQuestion,
  BackendQuestionResponse,
  BackendSubmitLevelResponse,
  BackendUserProgress,
  BackendTTSRequest,
  BackendTTSResponse,
} from '../types';

/**
 * MoneyQuest Backend API Service
 * Handles all interactions with the MoneyQuest backend API
 */
class BackendApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = MONEYQUEST_API_BASE_URL;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`API Request: ${options?.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Get all available sections/documents
   */
  async getSections(): Promise<BackendSection[]> {
    const response = await this.fetchApi<{ documents: BackendSection[]; total: number }>(
      `/upload/list`
    );
    return response.documents || [];
  }

  /**
   * Get all levels within a specific section
   * @param sectionId - UUID of the section
   */
  async getSectionLevels(sectionId: string): Promise<BackendLevel[]> {
    const response = await this.fetchApi<{ total_levels: number; levels: BackendLevel[] }>(
      `/levels?section_id=${sectionId}`
    );
    return response.levels || [];
  }

  /**
   * Get detailed information about a specific level
   * @param levelId - UUID of the level
   */
  async getLevelDetails(levelId: string): Promise<BackendLevelDetail> {
    return await this.fetchApi<BackendLevelDetail>(`/levels/${levelId}`);
  }

  /**
   * Generate AI-powered questions for a level
   * @param levelId - UUID of the level
   * @param numQuestions - Number of questions to generate (default: 5, max: 20)
   * @param difficulty - Difficulty level: "easy", "medium", "hard", "mixed"
   */
  async generateQuestions(
    levelId: string,
    numQuestions: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'
  ): Promise<BackendQuestionResponse> {
    return await this.fetchApi<BackendQuestionResponse>('/generate-questions', {
      method: 'POST',
      body: JSON.stringify({
        level_id: levelId,
        num_questions: numQuestions,
        difficulty: difficulty,
      }),
    });
  }

  /**
   * Get previously generated questions for a level
   * @param levelId - UUID of the level
   */
  async getLevelQuestions(levelId: string): Promise<BackendQuestion[]> {
    const response = await this.fetchApi<{
      total_questions: number;
      questions: BackendQuestion[];
    }>(`/questions?level_id=${levelId}`);
    
    return response.questions || [];
  }

  /**
   * Submit quiz results for a level
   * @param userId - User identifier
   * @param levelId - UUID of the level
   * @param score - Quiz score as percentage (0-100)
   * @param timeSpentMinutes - Time spent on the level in minutes
   */
  async submitLevelResults(
    userId: string,
    levelId: string,
    score: number,
    timeSpentMinutes: number
  ): Promise<BackendSubmitLevelResponse> {
    return await this.fetchApi<BackendSubmitLevelResponse>('/submit-level', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        level_id: levelId,
        score: score,
        time_spent_minutes: timeSpentMinutes,
      }),
    });
  }

  /**
   * Get user's progress for a specific level
   * @param userId - User identifier
   * @param levelId - UUID of the level
   */
  async getUserLevelProgress(
    userId: string,
    levelId: string
  ): Promise<BackendUserProgress | null> {
    const response = await this.fetchApi<{
      progress: BackendUserProgress | null;
      message?: string;
    }>(`/users/${userId}/progress/${levelId}`);

    return response.progress;
  }

  /**
   * Generate text-to-speech audio
   * @param text - Text to convert to speech
   * @param voice - Voice selection (default: "alloy")
   * @param speed - Speech speed (0.25-4.0, default: 1.0)
   */
  async generateTTS(
    text: string,
    voice: string = 'alloy',
    speed: number = 1.0
  ): Promise<BackendTTSResponse> {
    return await this.fetchApi<BackendTTSResponse>('/tts/generate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        voice,
        speed,
      } as BackendTTSRequest),
    });
  }

  /**
   * Get full URL for audio file
   * @param audioPath - Audio file path from TTS response
   */
  getAudioUrl(audioPath: string): string {
    // Remove leading slash if present
    const path = audioPath.startsWith('/') ? audioPath.slice(1) : audioPath;
    return `${this.baseUrl}/${path}`;
  }

  /**
   * Health check - verify API is running
   */
  async healthCheck(): Promise<{ message: string }> {
    return await this.fetchApi<{ message: string }>('/');
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
export default backendApi;
