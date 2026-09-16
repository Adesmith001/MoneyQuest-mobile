import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_ENABLED_KEY = 'soundEnabled';

class SoundService {
  private sounds: { [key: string]: AudioPlayer } = {};
  private isSoundEnabled: boolean = true;
  private isInitialized: boolean = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set audio mode - iOS specific settings to prevent crashes
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      // Load sound preference from storage
      const soundEnabled = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      this.isSoundEnabled = soundEnabled !== 'false'; // Default to true

      // Load sound files
      await this.loadSounds();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize sound service:', error);
      // Don't throw - allow app to continue without sound
    }
  }

  async loadSounds() {
    try {
      // You'll need to add these sound files to assets/sounds/
      const soundFiles = {
        correct: require('../../assets/sounds/correct.wav'),
        incorrect: require('../../assets/sounds/wrong.wav'),
        click: require('../../assets/sounds/click.wav'),
        levelComplete: require('../../assets/sounds/level-complete.wav'),
        buttonPress: require('../../assets/sounds/button-press.wav'),
      };

      for (const [key, file] of Object.entries(soundFiles)) {
        try {
          const sound = createAudioPlayer(file, {
            keepAudioSessionActive: true,
          });
          sound.volume = 1;
          this.sounds[key] = sound;
        } catch (error) {
          console.warn(`Failed to load sound ${key}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to load sounds:', error);
    }
  }

  async playSound(soundName: string) {
    if (!this.isSoundEnabled) return;

    // Auto-initialize if not yet done
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const sound = this.sounds[soundName];
      if (sound) {
        if (sound.isLoaded) {
          // Re-request audio focus before playing (Android can lose focus between plays)
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            interruptionMode: 'duckOthers',
            shouldRouteThroughEarpiece: false,
          });
          // replayAsync resets position and plays — reliable for short SFX
          await sound.seekTo(0);
          sound.play();
        }
      } else {
        console.warn(`Sound '${soundName}' not found. Available: ${Object.keys(this.sounds).join(', ')}`);
      }
    } catch (error: any) {
      // AudioFocusNotAcquiredException is non-fatal — OS denied audio focus temporarily
      // (e.g. another app holds focus). Silently skip the sound effect.
      if (error?.message?.includes('AudioFocusNotAcquiredException')) {
        return;
      }
      console.warn(`Failed to play sound '${soundName}':`, error);
    }
  }

  async setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    try {
      await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
    } catch (error) {
      console.error('Failed to save sound preference:', error);
    }
  }

  getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  async cleanup() {
    try {
      for (const sound of Object.values(this.sounds)) {
        sound.remove();
      }
      this.sounds = {};
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to cleanup sounds:', error);
    }
  }
}

export default new SoundService();
