import { MONEYQUEST_API_BASE_URL } from '../../env';
import {
  BackendLevel,
  BackendSection,
  BackendLevelDetail,
  BackendQuestion,
  GeneratedQuestion,
  BackendQuestionResponse,
  BackendSubmitLevelResponse,
  BackendUserProgress,
  BackendTTSRequest,
  BackendTTSResponse,
  BackendTranscriptionRequest,
  BackendTranscriptionResponse,
  BackendTTSStreamRequest,
  BackendTTSJsonResponse,
  BackendSectionList,
} from '../types';

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
   * Get all available sections
   */
  async getSections(): Promise<BackendSection[]> {
    const response = await this.fetchApi<BackendSectionList>('/sections');
    return response.sections || [];
  }

  /**
   * Get all documents (uploaded files)
   */
  async getDocuments(): Promise<BackendSection[]> {
    const response = await this.fetchApi<{ documents: BackendSection[]; total: number }>(
      '/documents'
    );
    return response.documents || [];
  }

  /**
   * Get all levels within a specific section
   * @param sectionId - UUID of the section
   */
  async getSectionLevels(sectionId: string): Promise<BackendLevel[]> {
    const response = await this.fetchApi<{ section_id: string; levels: BackendLevel[] }>(
      `/sections/${sectionId}/levels`
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
   * Get level description and title only (lightweight)
   * @param levelId - UUID of the level
   */
  async getLevelDescription(levelId: string): Promise<{ level_id: string; title: string; description: string }> {
    return await this.fetchApi<{ level_id: string; title: string; description: string }>(
      `/levels/${levelId}/description`
    );
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
  async getLevelQuestions(levelId: string): Promise<BackendQuestionResponse> {
    return await this.fetchApi<BackendQuestionResponse>(
      `/levels/${levelId}/questions`
    );
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



  // ============================================
  // AUDIO SERVICE ENDPOINTS
  // ============================================

  /**
   * Transcribe audio from file bytes
   * @param audioFile - Audio file to transcribe
   * @param options - Transcription options
   */
  async transcribeAudio(
    audioFile: File | Blob,
    options: BackendTranscriptionRequest = {}
  ): Promise<BackendTranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', audioFile);
    
    if (options.language) formData.append('language', options.language);
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.temperature !== undefined) formData.append('temperature', options.temperature.toString());

    const response = await fetch(`${this.baseUrl}/api/audio/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Transcription Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Transcribe audio from server file path
   * @param filePath - Path to audio file on server
   * @param options - Transcription options
   */
  async transcribeAudioFile(
    filePath: string,
    options: BackendTranscriptionRequest = {}
  ): Promise<BackendTranscriptionResponse> {
    const formData = new URLSearchParams();
    formData.append('file_path', filePath);
    
    if (options.language) formData.append('language', options.language);
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.temperature !== undefined) formData.append('temperature', options.temperature.toString());

    return await this.fetchApi<BackendTranscriptionResponse>('/api/audio/transcribe-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  }

  /**
   * Generate speech with streaming audio response
   * @param request - TTS request parameters
   * @returns Audio blob
   */
  async generateTTSStream(request: BackendTTSStreamRequest): Promise<Blob> {
    const formData = new URLSearchParams();
    formData.append('text', request.text);
    if (request.voice) formData.append('voice', request.voice);
    if (request.output_format) formData.append('output_format', request.output_format);
    if (request.speed) formData.append('speed', request.speed.toString());

    const response = await fetch(`${this.baseUrl}/api/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `TTS Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.blob();
  }

  /**
   * Generate speech and return JSON with base64 encoded audio
   * @param request - TTS request parameters
   */
  async generateTTSJson(request: BackendTTSStreamRequest): Promise<BackendTTSJsonResponse> {
    const formData = new URLSearchParams();
    formData.append('text', request.text);
    if (request.voice) formData.append('voice', request.voice);
    if (request.output_format) formData.append('output_format', request.output_format);
    if (request.speed) formData.append('speed', request.speed.toString());

    return await this.fetchApi<BackendTTSJsonResponse>('/api/tts/generate-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  }

  /**
   * Play audio from base64 string
   * @param base64Audio - Base64 encoded audio
   * @param format - Audio format (mp3, wav, etc.)
   * @returns Audio element
   */
  playAudioFromBase64(base64Audio: string, format: string = 'mp3'): HTMLAudioElement {
    const audio = new Audio(`data:audio/${format};base64,${base64Audio}`);
    audio.play();
    return audio;
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
export default backendApi;
