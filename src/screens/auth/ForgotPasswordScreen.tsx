import React, { useState } from 'react';
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
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import AnimatedTextInput from '../../components/AnimatedTextInput';
import CustomButton from '../../components/CustomButton';
import authService from '../../services/auth';

interface Props {
  navigation: any;
}

type Stage = 'email' | 'sent';

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendResetLink = async () => {
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
      setStage('sent');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = async () => {
    setIsLoading(true);
    try {
      await authService.sendPasswordRecovery(email);
      Alert.alert('Email Sent', 'A new password reset link has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend link');
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
          title={isLoading ? 'Sending...' : 'Send Reset Link'}
          onPress={handleSendResetLink}
          disabled={isLoading}
          style={styles.primaryButton}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Remember your password? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSentStage = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.successIcon}>✉️</Text>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a password reset link to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
          {'\n\n'}
          Click the link in the email to reset your password, then come back here to login.
        </Text>
      </View>

      <View style={styles.form}>
        <CustomButton
          title="Back to Login"
          onPress={() => navigation.navigate('Login')}
          style={styles.primaryButton}
        />

        <TouchableOpacity 
          style={styles.resendButton} 
          onPress={handleResendLink}
          disabled={isLoading}
        >
          <Text style={styles.resendText}>
            {isLoading ? 'Sending...' : "Didn't receive the email? Resend"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.changeEmailButton} 
        onPress={() => setStage('email')}
      >
        <Text style={styles.changeEmailText}>Use a different email</Text>
      </TouchableOpacity>
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
          {stage === 'sent' && renderSentStage()}
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
  successIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
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
  emailText: {
    fontWeight: 'bold',
    color: COLORS.text,
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
  resendButton: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.sm,
  },
  resendText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  changeEmailButton: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  changeEmailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;