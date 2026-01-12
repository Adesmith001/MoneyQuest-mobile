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
  private pendingRequests: Map<string, Promise<any>> = new Map();

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
    const key = 'sections';
    
    // If request is already in flight, return the existing promise
    if (this.pendingRequests.has(key)) {
      console.log('⏳ Reusing pending sections request');
      return this.pendingRequests.get(key)!;
    }

    // Start new request
    const promise = this.fetchApi<BackendSectionList>('/sections')
      .then(response => response.sections || [])
      .finally(() => this.pendingRequests.delete(key));
    
    this.pendingRequests.set(key, promise);
    return promise;
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
    const key = `levels_${sectionId}`;
    
    // If request is already in flight, return the existing promise
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Reusing pending levels request for ${sectionId}`);
      return this.pendingRequests.get(key)!;
    }

    // Start new request
    const promise = this.fetchApi<{ section_id: string; levels: BackendLevel[] }>(
      `/sections/${sectionId}/levels`
    )
      .then(response => response.levels || [])
      .finally(() => this.pendingRequests.delete(key));
    
    this.pendingRequests.set(key, promise);
    return promise;
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
   * Get previously generated questions for a level
   * Fetches from all question type endpoints and combines results
   * @param levelId - UUID of the level
   * @param limit - Maximum number of questions to return per type
   * @param questionType - Filter by question type ('mixed' fetches all types)
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
    if (randomize !== undefined) params.append('randomize', randomize.toString());
    
    const queryString = params.toString();
    
    // If questionType is 'mixed' or undefined, fetch from all endpoints
    if (!questionType || questionType === 'mixed') {
      console.log(`🔄 Fetching all question types for level ${levelId}`);
      
      const allQuestions: any[] = [];
      let levelInfo = { level_id: levelId, level_title: '', section_title: '' };
      
      // Fetch MCQ/Quiz questions
      try {
        const mcqEndpoint = queryString 
          ? `/levels/${levelId}/questions?${queryString}`
          : `/levels/${levelId}/questions`;
        const mcqResponse = await this.fetchApi<any>(mcqEndpoint);
        if (mcqResponse.questions && mcqResponse.questions.length > 0) {
          // Normalize MCQ questions
          const mcqQuestions = mcqResponse.questions.map((q: any) => ({
            ...q,
            question_type: 'mcq',
            options: q.options || {
              A: q.option_a || '',
              B: q.option_b || '',
              C: q.option_c || '',
              D: q.option_d || '',
            },
            explanations: q.explanations || {
              A: q.explanation_a || '',
              B: q.explanation_b || '',
              C: q.explanation_c || '',
              D: q.explanation_d || '',
            },
          }));
          allQuestions.push(...mcqQuestions);
          console.log(`✅ Fetched ${mcqQuestions.length} MCQ questions`);
        }
      } catch (e) {
        console.log('ℹ️ No MCQ questions found for this level');
      }
      
      // Fetch Scenario questions
      try {
        const scenarioEndpoint = queryString 
          ? `/levels/${levelId}/scenario-questions?${queryString}`
          : `/levels/${levelId}/scenario-questions`;
        const scenarioResponse = await this.fetchApi<any>(scenarioEndpoint);
        if (scenarioResponse.questions && scenarioResponse.questions.length > 0) {
          // Normalize scenario questions
          const scenarioQuestions = scenarioResponse.questions.map((q: any) => ({
            ...q,
            question_type: 'scenario',
            scenario_context: q.scenario || q.scenario_context || '',
            options: q.options || {
              A: q.option_a || '',
              B: q.option_b || '',
              C: q.option_c || '',
              D: q.option_d || '',
            },
            explanations: q.explanations || {
              A: q.explanation_a || '',
              B: q.explanation_b || '',
              C: q.explanation_c || '',
              D: q.explanation_d || '',
            },
          }));
          allQuestions.push(...scenarioQuestions);
          console.log(`✅ Fetched ${scenarioQuestions.length} Scenario questions`);
        }
      } catch (e) {
        console.log('ℹ️ No Scenario questions found for this level');
      }
      
      // Fetch Matching questions and group them into sets of 5 pairs
      try {
        const matchingEndpoint = queryString 
          ? `/levels/${levelId}/matching-questions?${queryString}`
          : `/levels/${levelId}/matching-questions`;
        const matchingResponse = await this.fetchApi<any>(matchingEndpoint);
        if (matchingResponse.questions && matchingResponse.questions.length > 0) {
          const pairs = matchingResponse.questions;
          const PAIRS_PER_QUESTION = 5;
          
          // Fisher-Yates shuffle for proper randomization
          const shuffleArray = <T>(array: T[]): T[] => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
          };
          
          // Group pairs into sets of 5
          const groupedMatchingQuestions: any[] = [];
          for (let i = 0; i < pairs.length; i += PAIRS_PER_QUESTION) {
            const groupPairs = pairs.slice(i, i + PAIRS_PER_QUESTION);
            
            // Only create a question if we have at least 2 pairs
            if (groupPairs.length >= 2) {
              const leftItems: { id: string; text: string }[] = [];
              const rightItems: { id: string; text: string }[] = [];
              const correctMatches: { [key: string]: string } = {};
              const explanations: string[] = [];
              
              groupPairs.forEach((pair: any, index: number) => {
                const leftId = `left_${index + 1}`;
                const rightId = `right_${index + 1}`;
                
                leftItems.push({ id: leftId, text: pair.column_a || '' });
                rightItems.push({ id: rightId, text: pair.column_b || '' });
                correctMatches[leftId] = rightId;
                explanations.push(`${pair.column_a} matches with ${pair.column_b}`);
              });
              
              // Shuffle BOTH left and right items for maximum challenge
              // The correct_matches mapping uses IDs, so shuffling display order doesn't affect answers
              const shuffledLeftItems = shuffleArray(leftItems);
              const shuffledRightItems = shuffleArray(rightItems);
              
              groupedMatchingQuestions.push({
                question_type: 'matching',
                question: `Match the ${groupPairs.length} items below`,
                left_items: shuffledLeftItems,
                right_items: shuffledRightItems,
                correct_matches: correctMatches,
                explanation: explanations.join('\n'),
                difficulty: groupPairs[0]?.difficulty || 'medium',
              });
            }
          }
          
          allQuestions.push(...groupedMatchingQuestions);
          console.log(`✅ Grouped ${pairs.length} matching pairs into ${groupedMatchingQuestions.length} matching questions`);
        }
      } catch (e) {
        console.log('ℹ️ No Matching questions found for this level');
      }
      
      // Shuffle all questions together if randomize is true
      if (randomize && allQuestions.length > 0) {
        for (let i = allQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }
      }
      
      console.log(`📦 Total questions fetched: ${allQuestions.length} (MCQ + Scenario + Matching)`);
      
      return {
        level_id: levelId,
        level_title: levelInfo.level_title,
        section_title: levelInfo.section_title,
        questions: allQuestions,
        total_generated: allQuestions.length,
        sources_used: [],
      };
    }
    
    // For specific question types, use the original single endpoint
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
