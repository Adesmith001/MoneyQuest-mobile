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
import { avatars, getAvatarById } from '../../utils/avatarUtils'; // Import from the new utility file

interface Props {
  navigation: any;
  route: any;
}

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

  const getSelectedAvatarImage = () => {
    // Use the utility function
    return getAvatarById(selectedAvatar);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Money Quest</Text>
          </View>

          {/* Main Avatar Display */}
          <View style={styles.mainAvatarContainer}>
            {selectedAvatar ? (
              <Image source={getSelectedAvatarImage()} style={styles.mainAvatarImage} />
            ) : (
              <Image source={require('../../../assets/avatar1.png')} style={styles.mainAvatarImage} />
            )}
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
                <Image source={avatar.image} style={styles.avatarImage} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedAvatar || isLoading) && styles.disabledButton,
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
    paddingTop: 20, 
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  mainAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  defaultAvatar: {
    width: 120,
    height: 120,
    backgroundColor: '#E8E8E8',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainAvatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  defaultAvatarText: {
    fontSize: 60,
    color: '#BDBDBD',
  },
  mainHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around', 
    marginBottom: 40,
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F5F0E8', 
    borderRadius: 20, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#FF5722', // Orange border for selection
  },
  avatarImage: {
    width: '80%',
    height: '80%',
  },
  continueButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 18,
    borderRadius: 16, // Less rounded corners
    alignItems: 'center',
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