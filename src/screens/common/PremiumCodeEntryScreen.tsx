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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../../store';
import { subscriptionService } from '../../services/subscriptionService';

const PremiumCodeEntryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);

  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const handleRedeemCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter your premium code');
      shake();
      return;
    }

    if (!user) {
      setError('Please log in first');
      shake();
      return;
    }

    setIsRedeeming(true);
    setError('');

    try {
      const result = await subscriptionService.redeemPremiumCode(user.$id, trimmed);

      if (result.success) {
        setSuccess(true);
        showSuccess();
        // Navigate to main app after a brief moment
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' as never }],
          });
        }, 2000);
      } else {
        setError(result.message);
        shake();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to redeem code');
      shake();
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Format code input: auto-uppercase and add dash after MQP
  const handleCodeChange = (text: string) => {
    const upper = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(upper);
    if (error) setError('');
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.successContainer}>
          <Animated.View
            style={[
              styles.successIconWrapper,
              { transform: [{ scale: successAnimation }] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={64} color="#4ECDC4" />
          </Animated.View>

          <Text style={styles.successTitle}>Premium Activated! 🎉</Text>
          <Text style={styles.successSubtitle}>
            Enjoy unlimited access to all lessons and features.
          </Text>

          <View style={styles.successBenefits}>
            {[
              'Unlimited access to all lessons',
              'Progress tracking & analytics',
              'Gamified learning experience',
              'Exclusive content & early access',
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <ActivityIndicator
            size="small"
            color="#4ECDC4"
            style={{ marginTop: 24 }}
          />
          <Text style={styles.redirectText}>Taking you to the app...</Text>
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.iconContainer}>
            <View style={styles.premiumIcon}>
              <Ionicons name="key" size={48} color="#FFD93D" />
            </View>
          </View>

          <Text style={styles.title}>Enter Premium Code</Text>
          <Text style={styles.subtitle}>
            Paste the activation code you received after payment to unlock
            premium access.
          </Text>

          {/* Code Input */}
          <Animated.View
            style={[
              styles.inputContainer,
              { transform: [{ translateX: shakeAnimation }] },
              error ? styles.inputError : null,
            ]}
          >
            <Ionicons
              name="key-outline"
              size={22}
              color={error ? '#FF6B6B' : '#888'}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="MQP-XXXXXX"
              placeholderTextColor="#666"
              value={code}
              onChangeText={handleCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRedeemCode}
              maxLength={10}
            />
            {code.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setCode('');
                  setError('');
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Redeem Button */}
          <TouchableOpacity
            style={[
              styles.redeemButton,
              (!code.trim() || isRedeeming) && styles.buttonDisabled,
            ]}
            onPress={handleRedeemCode}
            disabled={!code.trim() || isRedeeming}
          >
            {isRedeeming ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <>
                <Text style={styles.redeemButtonText}>Activate Premium</Text>
                <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
              </>
            )}
          </TouchableOpacity>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How it works</Text>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.infoText}>
                Complete payment on the MoneyQuest website
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.infoText}>
                Copy the premium code shown after payment
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.infoText}>
                Paste it here to activate your premium subscription
              </Text>
            </View>
          </View>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* School Code Link */}
          <TouchableOpacity
            style={styles.schoolCodeLink}
            onPress={() => {
              navigation.goBack();
              // Small delay to let the modal close first
              setTimeout(() => {
                (navigation as any).navigate('SchoolCodeEntry');
              }, 100);
            }}
          >
            <Ionicons name="school-outline" size={20} color="#FFF" />
            <Text style={styles.schoolCodeLinkText}>
              Have a school code instead?
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    padding: 16,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  premiumIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    paddingVertical: 18,
    letterSpacing: 2,
  },
  clearButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 6,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    flex: 1,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  redeemButtonText: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 32,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#AAA',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  separatorText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  schoolCodeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  schoolCodeLinkText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  // Success styles
  successContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  successIconWrapper: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#AAA',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  successBenefits: {
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  redirectText: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
  },
});

export default PremiumCodeEntryScreen;
