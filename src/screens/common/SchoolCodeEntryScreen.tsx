import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { schoolService } from '../../services/schoolService';
import { SchoolCode, School } from '../../types/school';

const SchoolCodeEntryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [validatedCode, setValidatedCode] = useState<SchoolCode | null>(null);
  const [validatedSchool, setValidatedSchool] = useState<School | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const showSuccess = () => {
    Animated.spring(successAnimation, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      shake();
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const result = await schoolService.validateCode(code);
      
      if (result.isValid && result.code && result.school) {
        setValidatedCode(result.code);
        setValidatedSchool(result.school);
        setShowConfirmation(true);
        showSuccess();
      } else {
        setError(result.errorMessage || 'Invalid code');
        shake();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate code');
      shake();
    } finally {
      setIsValidating(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || !validatedCode || !validatedSchool) return;

    setIsEnrolling(true);
    setError('');

    try {
      const result = await schoolService.enrollStudent(
        user.$id,
        validatedCode.$id!,
        validatedSchool.$id!,
        validatedCode.expirationDate
      );

      if (result.success) {
        // Navigate to success screen or main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' as never }],
        });
      } else {
        setError(result.errorMessage || 'Failed to enroll');
        shake();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to enroll');
      shake();
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleGoBack = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
      setValidatedCode(null);
      setValidatedSchool(null);
      successAnimation.setValue(0);
    } else {
      navigation.goBack();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSeatsInfo = () => {
    if (!validatedCode) return '';
    const available = validatedCode.seatsPurchased - validatedCode.seatsUsed;
    return `${available} of ${validatedCode.seatsPurchased} seats available`;
  };

  if (showConfirmation && validatedCode && validatedSchool) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.confirmationContainer}>
          <Animated.View
            style={[
              styles.successIconWrapper,
              {
                transform: [{ scale: successAnimation }],
              },
            ]}
          >
            <Ionicons name="school" size={48} color="#4ECDC4" />
          </Animated.View>

          <Text style={styles.confirmationTitle}>Confirm Enrollment</Text>
          <Text style={styles.confirmationSubtitle}>
            You're about to join with a school subscription
          </Text>

          <View style={styles.schoolCard}>
            <View style={styles.schoolCardHeader}>
              <View style={styles.schoolIcon}>
                <Ionicons name="business" size={24} color="#4ECDC4" />
              </View>
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{validatedSchool.name}</Text>
                <Text style={styles.schoolLocation}>
                  {validatedSchool.city && validatedSchool.state
                    ? `${validatedSchool.city}, ${validatedSchool.state}`
                    : validatedSchool.country}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.codeDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Code</Text>
                <Text style={styles.detailValue}>{validatedCode.code}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan</Text>
                <Text style={styles.detailValue}>
                  {validatedCode.planType === 'annual' ? 'Annual' : 'Monthly'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Valid Until</Text>
                <Text style={styles.detailValue}>
                  {formatDate(validatedCode.expirationDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Seats</Text>
                <Text style={styles.detailValue}>{getSeatsInfo()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>What you'll get:</Text>
            {[
              'Unlimited access to all lessons',
              'Personalized learning path',
              'Progress tracking & analytics',
              'Gamified experience',
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.enrollButton, isEnrolling && styles.buttonDisabled]}
            onPress={handleEnroll}
            disabled={isEnrolling}
          >
            {isEnrolling ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <>
                <Text style={styles.enrollButtonText}>Confirm & Enroll</Text>
                <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Ionicons name="school" size={40} color="#4ECDC4" />
            </View>
            <Text style={styles.title}>School Code</Text>
            <Text style={styles.subtitle}>
              Enter the code provided by your school to unlock premium access
            </Text>
          </View>

          <Animated.View
            style={[
              styles.inputContainer,
              { transform: [{ translateX: shakeAnimation }] },
            ]}
          >
            <TextInput
              style={[styles.codeInput, error ? styles.inputError : null]}
              placeholder="Enter code (e.g., MQ-ABC123)"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setError('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </Animated.View>

          <TouchableOpacity
            style={[styles.validateButton, isValidating && styles.buttonDisabled]}
            onPress={handleValidateCode}
            disabled={isValidating}
          >
            {isValidating ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <>
                <Text style={styles.validateButtonText}>Validate Code</Text>
                <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Don't have a code?</Text>
            <Text style={styles.helpText}>
              Ask your school administrator to provide you with an enrollment code.
              Schools can purchase bulk subscriptions for their students.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.individualLink}
            onPress={() => navigation.navigate('Premium' as never)}
          >
            <Text style={styles.individualLinkText}>
              Get individual subscription instead
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  inputContainer: {
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  validateButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  validateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helpSection: {
    marginTop: 48,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
  },
  individualLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  individualLinkText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
  },
  confirmationContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  confirmationSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  schoolCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  schoolCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  schoolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  schoolLocation: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  codeDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  benefitsSection: {
    width: '100%',
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  enrollButton: {
    width: '100%',
    backgroundColor: '#4ECDC4',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  enrollButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});

export default SchoolCodeEntryScreen;
