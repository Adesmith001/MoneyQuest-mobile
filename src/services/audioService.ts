import { backendApi } from './backendApi';
import {
  BackendTranscriptionRequest,
  BackendTranscriptionResponse,
  BackendTTSStreamRequest,
  BackendTTSJsonResponse,
} from '../types';

/**
 * Audio Service - Handles TTS and Speech-to-Text operations
 * Wraps the backend audio API endpoints
 */
class AudioService {
  private currentAudio: HTMLAudioElement | null = null;

  // ============================================
  // TEXT-TO-SPEECH (TTS) METHODS
  // ============================================

  /**
   * Generate speech from text and play it (using /tts/generate endpoint)
   * @param text - Text to convert to speech
   * @param voice - Voice selection (default: 'alloy')
   * @param speed - Speech speed (0.25 - 4.0, default: 1.0)
   * @param format - Audio format
   */
  async speakText(
    text: string,
    voice: string = 'alloy',
    speed: number = 1.0,
    format: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' = 'mp3'
  ): Promise<HTMLAudioElement> {
    try {
      // Stop any currently playing audio
      this.stopAudio();

      // Generate audio blob using the /tts/generate endpoint
      const audioBlob = await backendApi.generateTTSStream({
        text,
        voice,
        speed,
        output_format: format,
      });

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
      // Clean up blob URL when audio finishes
      this.currentAudio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });

      await this.currentAudio.play();
      return this.currentAudio;
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  }

  /**
   * Generate speech and get base64 audio data
   * @param text - Text to convert to speech
   * @param voice - Voice selection
   * @param speed - Speech speed
   * @param format - Audio format
   */
  async generateSpeechBase64(
    text: string,
    voice?: string,
    speed: number = 1.0,
    format: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' = 'mp3'
  ): Promise<BackendTTSJsonResponse> {
    try {
      return await backendApi.generateTTSJson({
        text,
        voice,
        speed,
        output_format: format,
      });
    } catch (error) {
      console.error('TTS Base64 Error:', error);
      throw error;
    }
  }

  /**
   * Read question text aloud
   * @param questionText - Question to read
   * @param options - Optional TTS options
   */
  async readQuestion(
    questionText: string,
    options: { voice?: string; speed?: number } = {}
  ): Promise<HTMLAudioElement> {
    return await this.speakText(
      questionText,
      options.voice || 'alloy',
      options.speed || 1.0
    );
  }

  /**
   * Read explanation text aloud
   * @param explanationText - Explanation to read
   * @param options - Optional TTS options
   */
  async readExplanation(
    explanationText: string,
    options: { voice?: string; speed?: number } = {}
  ): Promise<HTMLAudioElement> {
    return await this.speakText(
      explanationText,
      options.voice || 'alloy',
      options.speed || 0.9
    );
  }

  /**
   * Stop currently playing audio
   */
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Pause currently playing audio
   */
  pauseAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  /**
   * Resume paused audio
   */
  resumeAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    }
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  /**
   * Get current audio element
   */
  getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  // ============================================
  // SPEECH-TO-TEXT (Transcription) METHODS
  // ============================================

  /**
   * Transcribe audio from a file
   * @param audioFile - Audio file to transcribe
   * @param options - Transcription options
   */
  async transcribeAudioFile(
    audioFile: File | Blob,
    options: BackendTranscriptionRequest = {}
  ): Promise<BackendTranscriptionResponse> {
    try {
      const result = await backendApi.transcribeAudio(audioFile, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      return result;
    } catch (error) {
      console.error('Transcription Error:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio from server file path
   * @param filePath - Path to audio file on server
   * @param options - Transcription options
   */
  async transcribeServerFile(
    filePath: string,
    options: BackendTranscriptionRequest = {}
  ): Promise<BackendTranscriptionResponse> {
    try {
      const result = await backendApi.transcribeAudioFile(filePath, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      return result;
    } catch (error) {
      console.error('Server File Transcription Error:', error);
      throw error;
    }
  }

  /**
   * Record audio from microphone and transcribe
   * @param durationMs - Recording duration in milliseconds (default: 5000ms)
   * @param options - Transcription options
   */
  async recordAndTranscribe(
    durationMs: number = 5000,
    options: BackendTranscriptionRequest = {}
  ): Promise<BackendTranscriptionResponse> {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());

          // Create audio blob
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

          // Transcribe
          try {
            const result = await this.transcribeAudioFile(audioBlob, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        mediaRecorder.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop());
          reject(error);
        };

        // Start recording
        mediaRecorder.start();

        // Stop after duration
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, durationMs);
      });
    } catch (error) {
      console.error('Record and Transcribe Error:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if browser supports audio recording
   */
  isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Check if browser supports audio playback
   */
  isPlaybackSupported(): boolean {
    return typeof Audio !== 'undefined';
  }

  /**
   * Available TTS voices (from documentation)
   */
  getAvailableVoices(): string[] {
    return [
      'alloy',    // Default voice
      'echo',
      'fable',
      'onyx',
      'nova',
      'shimmer',
    ];
  }

  /**
   * Cleanup all audio resources
   */
  cleanup(): void {
    this.stopAudio();
  }
}

// Export singleton instance
export const audioService = new AudioService();
export default audioService;
