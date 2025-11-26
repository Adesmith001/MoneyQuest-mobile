import { Audio } from 'expo-av';
import { backendApi } from './backendApi';
import {
  BackendTTSStreamRequest,
  BackendTTSJsonResponse,
} from '../types';

/**
 * Audio Service - Handles TTS operations for React Native
 * Uses expo-av for audio playback
 */
class AudioService {
  private currentSound: Audio.Sound | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize audio service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.isInitialized = true;
      console.log('✅ Audio service initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  // ============================================
  // TEXT-TO-SPEECH (TTS) METHODS
  // ============================================

  /**
   * Generate speech from text and play it
   * @param text - Text to convert to speech
   * @param voice - Voice selection (default: 'Arista')
   * @param speed - Speech speed (0.25 - 4.0, default: 1.0)
   * @param format - Audio format
   */
  async speakText(
    text: string,
    voice: string = 'Arista',
    speed: number = 1.0,
    format: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' = 'mp3'
  ): Promise<Audio.Sound> {
    try {
      // Initialize if needed
      await this.initialize();

      // Stop any currently playing audio
      await this.stopAudio();

      // Call the JSON endpoint to get base64 audio
      console.log('🎵 Generating TTS audio...');
      console.log('Text:', text.substring(0, 50) + '...');
      console.log('Voice:', voice);
      
      const response = await backendApi.generateTTSJson({
        text,
        voice,
        speed,
        output_format: format,
      });

      console.log('✅ TTS Response received');
      console.log('Success:', response.success);
      console.log('Voice used:', response.voice);
      console.log('Format:', response.output_format);

      if (!response.success || !response.audio_base64) {
        throw new Error('Failed to generate audio - no base64 data received');
      }

      // Convert base64 to data URI for React Native
      // expo-av can play audio directly from data URI
      const audioUri = `data:audio/${response.output_format};base64,${response.audio_base64}`;
      
      console.log('🔊 Creating audio player...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      this.currentSound = sound;
      console.log('▶️ Audio playing...');

      // Clean up when audio finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            console.log('✅ Audio finished playing');
            this.cleanup();
          }
        } else if (status.error) {
          console.error('Audio playback error:', status.error);
        }
      });

      return sound;
    } catch (error) {
      console.error('❌ TTS Error:', error);
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
  ): Promise<Audio.Sound> {
    return await this.speakText(
      questionText,
      options.voice || 'Arista',
      options.speed || 1.0
    );
  }

  /**
   * Read question with options aloud
   * @param questionText - Question to read
   * @param optionsObj - Object containing options (A, B, C, D)
   * @param options - Optional TTS options
   */
  async readQuestionWithOptions(
    questionText: string,
    optionsObj: { A: string; B: string; C: string; D: string },
    options: { voice?: string; speed?: number } = {}
  ): Promise<Audio.Sound> {
    // Build text with question and options
    const fullText = `${questionText}. Option A: ${optionsObj.A}. Option B: ${optionsObj.B}. Option C: ${optionsObj.C}. Option D: ${optionsObj.D}.`;
    
    return await this.speakText(
      fullText,
      options.voice || 'Arista',
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
  ): Promise<Audio.Sound> {
    return await this.speakText(
      explanationText,
      options.voice || 'Arista',
      options.speed || 0.9
    );
  }

  /**
   * Stop currently playing audio
   */
  async stopAudio(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
      this.currentSound = null;
    }
  }

  /**
   * Pause currently playing audio
   */
  async pauseAudio(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.pauseAsync();
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  }

  /**
   * Resume paused audio
   */
  async resumeAudio(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.playAsync();
      } catch (error) {
        console.error('Error resuming audio:', error);
      }
    }
  }

  /**
   * Check if audio is currently playing
   */
  async isPlaying(): Promise<boolean> {
    if (!this.currentSound) return false;
    try {
      const status = await this.currentSound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current sound object
   */
  getCurrentSound(): Audio.Sound | null {
    return this.currentSound;
  }

  /**
   * Cleanup current sound
   */
  private async cleanup(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.unloadAsync();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
      this.currentSound = null;
    }
  }

  /**
   * Available TTS voices (PlayAI)
   */
  getAvailableVoices(): string[] {
    return [
      'Arista',    // Default voice
      'Aaliyah',
      'Adelaide',
      'Angelo',
      'Atlas',
      'Basil',
      'Briggs',
      'Calum',
      'Celeste',
      'Cheyenne',
      'Chip',
      'Cillian',
      'Deedee',
      'Eleanor',
      'Fritz',
      'Gail',
      'Indigo',
      'Jennifer',
      'Judy',
      'Mamaw',
      'Mason',
      'Mikail',
      'Mitch',
      'Nia',
      'Quinn',
      'Ruby',
      'Thunder',
    ];
  }
}

// Export singleton instance
export const audioService = new AudioService();
export default audioService;
