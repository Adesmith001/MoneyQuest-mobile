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
  RecapSectionResponse,
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
    const response = await this.fetchApi<BackendLevelDetail | { level: BackendLevel }>(`/levels/${levelId}`);
    // Handle both response formats: { level: {...}, section: {...} } or { level: {...} }
    if ('level' in response && 'section' in response) {
      return response as BackendLevelDetail;
    } else if ('level' in response) {
      // If only level is present, wrap it with a minimal section
      return {
        level: response.level,
        section: {
          section_id: response.level.section_id || '',
          title: ''
        }
      };
    } else {
      // If response is just the level object, wrap it
      const level = response as any as BackendLevel;
      return {
        level: level,
        section: {
          section_id: level.section_id || '',
          title: ''
        }
      };
    }
  }

  /**
   * Get level description and title only (lightweight)
   * @param levelId - UUID of the level
   */
  async getLevelDescription(levelId: string): Promise<{ level_id: string; title: string; description: string; level_summary?: string }> {
    return await this.fetchApi<{ level_id: string; title: string; description: string; level_summary?: string }>(
      `/levels/${levelId}/description`
    );
  }

  /**
   * Generate AI-powered questions for a level
   * @param levelId - UUID of the level
   * @param numQuestions - Number of questions to generate (default: 5, max: 20)
   * @param difficulty - Difficulty level: "easy", "medium", "hard", "mixed"
   * @param questionType - Type of questions: "mcq", "scenario", "matching", "fill_in_gap", "mixed"
   * @param randomize - Whether to randomize the questions (default: true)
   */
  async generateQuestions(
    levelId: string,
    numQuestions: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed',
    questionType: 'mcq' | 'scenario' | 'matching' | 'fill_in_gap' | 'mixed' = 'mixed',
    randomize: boolean = true
  ): Promise<BackendQuestionResponse> {
    return await this.fetchApi<BackendQuestionResponse>('/generate-questions', {
      method: 'POST',
      body: JSON.stringify({
        level_id: levelId,
        num_questions: numQuestions,
        difficulty: difficulty,
        question_type: questionType,
        randomize: randomize,
      }),
    });
  }

  /**
   * Get previously generated questions for a level
   * @param levelId - UUID of the level
   * @param limit - Maximum number of questions to return
   * @param questionType - Filter by question type
   * @param randomize - Whether to randomize the returned questions
   */
  async getLevelQuestions(
    levelId: string,
    limit?: number,
    questionType?: 'mcq' | 'scenario' | 'matching' | 'fill_in_gap' | 'mixed',
    randomize: boolean = true
  ): Promise<BackendQuestionResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (questionType) params.append('question_type', questionType);
    if (randomize !== undefined) params.append('randomize', randomize.toString());
    
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/levels/${levelId}/questions?${queryString}`
      : `/levels/${levelId}/questions`;
    
    return await this.fetchApi<BackendQuestionResponse>(endpoint);
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
   * @returns Audio URL that can be played
   */
  async generateTTSStream(request: BackendTTSStreamRequest): Promise<string> {
    try {
      const formData = new URLSearchParams();
      formData.append('text', request.text);
      if (request.voice) formData.append('voice', request.voice);
      if (request.output_format) formData.append('output_format', request.output_format);
      if (request.speed) formData.append('speed', request.speed.toString());

      const url = `${this.baseUrl}/api/tts/generate`;
      console.log('TTS Stream Request URL:', url);
      console.log('TTS Stream Request Body:', formData.toString());

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      console.log('TTS Stream Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS Stream Error Response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`TTS Error: ${response.status} - ${errorText}`);
        }
        
        throw new Error(
          errorData.detail || errorData.message || `TTS Error: ${response.status} ${response.statusText}`
        );
      }

      // Get the blob and convert to base64
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      return base64;
    } catch (error) {
      console.error('TTS Stream Generation Error:', error);
      throw error;
    }
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate speech and return JSON with base64 encoded audio
   * @param request - TTS request parameters
   */
  async generateTTSJson(request: BackendTTSStreamRequest): Promise<BackendTTSJsonResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('text', request.text);
      if (request.voice) formData.append('voice', request.voice);
      if (request.output_format) formData.append('output_format', request.output_format);
      if (request.speed) formData.append('speed', request.speed.toString());

      const url = `${this.baseUrl}/api/tts/generate-json`;
      console.log('TTS Request URL:', url);
      console.log('TTS Request Body:', formData.toString());

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      console.log('TTS Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS Error Response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`TTS Error: ${response.status} - ${errorText}`);
        }
        
        throw new Error(
          errorData.detail || errorData.message || `TTS Error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('TTS Response Success:', data.success);
      return data as BackendTTSJsonResponse;
    } catch (error) {
      console.error('TTS JSON Generation Error:', error);
      throw error;
    }
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

  /**
   * Get or create recap section (every 10th section: 10, 20, 30, etc.)
   * Aggregates questions from previous 9 sections
   * @param sectionNumber - The recap section number (must be divisible by 10)
   * @param limitPerSection - Maximum number of questions per question type per section (default: 10)
   * @param randomize - Whether to randomize question order (default: true)
   */
  async getRecapSection(
    sectionNumber: number,
    limitPerSection: number = 10,
    randomize: boolean = true
  ): Promise<RecapSectionResponse> {
    const params = new URLSearchParams();
    params.append('limit_per_section', limitPerSection.toString());
    params.append('randomize', randomize.toString());

    return await this.fetchApi<RecapSectionResponse>(
      `/sections/recap/${sectionNumber}?${params.toString()}`
    );
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();
export default backendApi;
