import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_ENABLED_KEY = 'soundEnabled';

class SoundService {
  private sounds: { [key: string]: Audio.Sound } = {};
  private isSoundEnabled: boolean = true;
  private isInitialized: boolean = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set audio mode - iOS specific settings to prevent crashes
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
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
          const { sound } = await Audio.Sound.createAsync(file, {
            shouldPlay: false,
            volume: 1.0,
          });
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
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          // replayAsync resets position and plays — reliable for short SFX
          await sound.replayAsync();
        }
      } else {
        console.warn(`Sound '${soundName}' not found. Available: ${Object.keys(this.sounds).join(', ')}`);
      }
    } catch (error) {
      console.error(`Failed to play sound '${soundName}':`, error);
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
        await sound.unloadAsync();
      }
      this.sounds = {};
      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to cleanup sounds:', error);
    }
  }
}

export default new SoundService();