import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUpWithOnboarding } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';

interface Props {
  navigation: any;
  route: any;
}

// Placeholder avatar data - you can replace these with your actual avatar images
const avatars = [
  { id: 'avatar1', emoji: '👨🏾‍🦱' },
  { id: 'avatar2', emoji: '👩🏾‍🦱' },
  { id: 'avatar3', emoji: '👩🏾‍💼' },
  { id: 'avatar4', emoji: '👩🏾‍🎤' },
  { id: 'avatar5', emoji: '👦🏾' },
  { id: 'avatar6', emoji: '👨🏾‍🎓' },
  { id: 'avatar7', emoji: '👨🏾‍💼' },
  { id: 'avatar8', emoji: '👨🏾‍🎤' },
  { id: 'avatar9', emoji: '👦🏽' },
  { id: 'avatar10', emoji: '👨🏾‍🦲' },
];

const AvatarSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const handleContinue = async () => {
    if (!selectedAvatar) return;
    
    const { registrationData, age, learningLimit, mainGoal, referralSource } = route.params;
    
    try {
      // Create account with all registration and onboarding data
      const result = await dispatch(signUpWithOnboarding({
        registrationData,
        onboardingData: {
          age,
          learningLimit,
          mainGoal,
          referralSource,
          avatar: selectedAvatar,
        },
      }));
      
      if (signUpWithOnboarding.fulfilled.match(result)) {
        // Success! The auth state will show the welcome screen automatically
        // No need to navigate manually
      } else {
        // Handle error
        const errorMessage = result.payload as string;
        Alert.alert('Sign Up Failed', errorMessage || 'Failed to create account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create your account. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Money Quest</Text>
          </View>

          {/* Default Avatar */}
          <View style={styles.defaultAvatarContainer}>
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>👤</Text>
            </View>
          </View>

          {/* Main Title */}
          <View style={styles.mainHeader}>
            <Text style={styles.mainTitle}>Select an avatar</Text>
          </View>

          {/* Avatar Grid */}
          <View style={styles.avatarGrid}>
            {avatars.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar.id && styles.selectedAvatar,
                ]}
                onPress={() => setSelectedAvatar(avatar.id)}
              >
                <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity 
            style={[
              styles.continueButton, 
              (!selectedAvatar || isLoading) && styles.disabledButton
            ]} 
            onPress={handleContinue}
            disabled={!selectedAvatar || isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Creating Account...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  defaultAvatarContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  defaultAvatar: {
    width: 120,
    height: 120,
    backgroundColor: '#E0E0E0',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 60,
    color: '#999',
  },
  mainHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 60,
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#FF5722',
    backgroundColor: '#FFF3F0',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  continueButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AvatarSelectionScreen;