import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  AppState 
} from 'react-native';
import * as Clipboard from 'expo-clipboard'; 
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import AnimatedTextInput from '../../components/AnimatedTextInput';
import CustomButton from '../../components/CustomButton';
import authService from '../../services/auth';

interface Props {
  navigation: any;
  route?: any;
}

type Stage = 'email' | 'verification' | 'newPassword';

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [token, setToken] = useState<{ userId: string | null; secret: string | null }>({
    userId: null,
    secret: null,
  });

  // This effect handles the user coming back to the app
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      // Check if the app became active and we are waiting for verification
      if (nextAppState === 'active' && stage === 'verification') {
        const clipboardContent = await Clipboard.getStringAsync();
        // Appwrite secrets are long. A simple check for length is a good heuristic.
        if (clipboardContent && clipboardContent.length > 30) {
          // We have the secret from the clipboard!
          // This flow is a fallback and assumes the deep link didn't work as expected.
          // The userId should already be in the token state from the other useEffect.
          setToken(prev => ({ ...prev, secret: clipboardContent }));
          setStage('newPassword');
          // Clear the clipboard for security
          await Clipboard.setStringAsync('');
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
    };
  }, [stage, navigation]);


  // This effect handles the deep link parameters directly
  useEffect(() => {
    if (route?.params) {
      const { userId, secret } = route.params;

      // The ideal flow: both userId and secret are present.
      if (userId && secret) {
        setToken({ userId, secret });
        setStage('newPassword');
      } 
      // The fallback flow: only userId is present initially.
      // We store it and wait for the AppState change to get the secret.
      else if (userId) {
        setToken(prev => ({ ...prev, userId }));
      }
    }
  }, [route?.params]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSendEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendPasswordRecovery(email);
      setStage('verification');
      setResendTimer(120); // 2 minutes
      Alert.alert(
        'Email Sent',
        'A password reset link has been sent to your email. Please check your inbox and spam folder.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send recovery email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      await authService.sendPasswordRecovery(email);
      setResendTimer(120); // 2 minutes
      Alert.alert('Email Resent', 'A new password reset link has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    Alert.alert(
      'Check Your Email', 
      'Please click the reset link in your email to set a new password. The app will automatically open when you click the link.'
    );
  };

  const handleCreateNewPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    const { userId, secret } = token;
    if (!userId || !secret) {
      Alert.alert('Error', 'Could not find reset token. Please try returning to the app from your email link again.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.completePasswordRecovery(userId, secret, newPassword, confirmPassword);
      Alert.alert(
        'Password Reset Successfully',
        'Your password has been reset. You can now log in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStage = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter the email you used in creating the account, and we will email you
          a link to reset your password
        </Text>
      </View>

      <View style={styles.form}>
        <AnimatedTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <CustomButton
          title={isLoading ? 'Sending Email...' : 'Send Reset Link'}
          onPress={handleSendEmail}
          disabled={isLoading}
          style={styles.primaryButton}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerLink}>Signup</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderVerificationStage = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We've sent a password reset link to {email}. Please click the link in the email to proceed.
          {'\n\n'}
          The app will update automatically when you return.
        </Text>
      </View>
      {/* We can add a loading indicator here or just let the user switch apps */}
    </ScrollView>
  );

  const renderNewPasswordStage = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>
          Use a different password from the previous ones
        </Text>
      </View>

      <View style={styles.form}>
        <AnimatedTextInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          showPasswordToggle={true}
        />

        <AnimatedTextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          showPasswordToggle={true}
        />

        <CustomButton
          title={isLoading ? 'Creating New Password...' : 'Create New Password'}
          onPress={handleCreateNewPassword}
          disabled={isLoading}
          style={styles.primaryButton}
        />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {stage === 'email' && renderEmailStage()}
          {stage === 'verification' && renderVerificationStage()}
          {stage === 'newPassword' && renderNewPasswordStage()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    marginTop: SPACING.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  timerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  resendLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;