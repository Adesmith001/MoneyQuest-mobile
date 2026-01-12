import React, { useState, useEffect, useRef } from 'react';
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
  TextInput
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import AnimatedTextInput from '../../components/AnimatedTextInput';
import CustomButton from '../../components/CustomButton';
import authService from '../../services/auth';

interface Props {
  navigation: any;
  route?: any;
}

type Stage = 'email' | 'otp' | 'newPassword';

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Refs for OTP inputs
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

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

  const handleSendOTP = async () => {
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
      await authService.sendPasswordOTP(email);
      setStage('otp');
      setResendTimer(120); // 2 minutes
      Alert.alert(
        'OTP Sent',
        'A 6-digit code has been sent to your email. Please check your inbox and spam folder.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      await authService.sendPasswordOTP(email);
      setResendTimer(120); // 2 minutes
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs
      Alert.alert('OTP Resent', 'A new 6-digit code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    
    // Handle paste (multiple digits)
    if (value.length > 1) {
      const digits = value.slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      // Focus on the last filled input or the next empty one
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.verifyPasswordOTP(email, otpString);
      setResetToken(result.resetToken);
      setUserId(result.userId);
      setStage('newPassword');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
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

    if (!userId || !resetToken) {
      Alert.alert('Error', 'Session expired. Please start over.');
      setStage('email');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPasswordWithToken(userId, resetToken, newPassword);
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
          Enter the email you used in creating the account, and we will send you
          a 6-digit code to reset your password
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
          title={isLoading ? 'Sending Code...' : 'Send Code'}
          onPress={handleSendOTP}
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

  const renderOtpStage = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Enter Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to {email}. Enter it below to continue.
        </Text>
      </View>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (otpInputRefs.current[index] = ref)}
            style={[
              styles.otpInput,
              digit ? styles.otpInputFilled : null
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
          />
        ))}
      </View>

      <View style={styles.timerContainer}>
        {resendTimer > 0 ? (
          <Text style={styles.timerText}>
            Resend code in {formatTime(resendTimer)}
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
            <Text style={[styles.timerText, styles.resendLink]}>
              Didn't receive the code? Resend
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
        <CustomButton
          title={isLoading ? 'Verifying...' : 'Verify Code'}
          onPress={handleVerifyOTP}
          disabled={isLoading || otp.join('').length !== 6}
          style={styles.primaryButton}
        />
      </View>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          setStage('email');
          setOtp(['', '', '', '', '', '']);
        }}
      >
        <Text style={styles.backButtonText}>← Back to email</Text>
      </TouchableOpacity>
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
          {stage === 'otp' && renderOtpStage()}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.xl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border || '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
  },
  backButton: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;