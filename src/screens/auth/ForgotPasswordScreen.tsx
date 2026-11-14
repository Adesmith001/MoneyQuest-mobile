import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import AnimatedTextInput from '../../components/AnimatedTextInput';
import CustomButton from '../../components/CustomButton';
import { authFailure, authFailureMessage, type AuthFailure } from '../../services/authFailure';
import { captureIncident } from '../../services/errorMonitor';
import authService from '../../services/auth';

interface Props {
  navigation: any;
  route?: { params?: { userId?: string; secret?: string } };
}

type Stage = 'email' | 'sent';

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [inlineMessage, setInlineMessage] = useState('');
  const [slow, setSlow] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const pending = useRef(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reset, setReset] = useState(false);
  const { userId, secret } = route?.params ?? {};
  const report = (event: AuthFailure) => {
    if (event.kind === 'validation' || event.kind === 'expired') return;
    void captureIncident(new Error(authFailureMessage(event)), {
      flow: 'account', stage: event.stage, action: 'request_failed', severity: 'warning',
      errorType: event.kind, statusCode: event.status,
    });
  };

  useEffect(() => {
    setSlow(false);
    if (!isLoading) return;
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);
  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil(((failure?.retryAt ?? 0) - Date.now()) / 1000)));
    update();
    if (!failure?.retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [failure?.retryAt]);

  const run = async (action: () => Promise<void>, authStage: string) => {
    if (pending.current || (failure?.retryAt ?? 0) > Date.now()) return;
    pending.current = true;
    setFailure(null);
    setInlineMessage('');
    setIsLoading(true);
    try {
      await action();
    } catch (error) {
      const event = authFailure(error, authStage);
      setFailure(event);
      report(event);
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  };

  const handleSendResetLink = () => run(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInlineMessage('Enter a valid email address.');
      return;
    }
    await authService.sendPasswordRecovery(email);
    setStage('sent');
    setInlineMessage('If an account uses that email, a reset link is on its way.');
  }, 'recovery_send');

  const feedback = (
    <>
      {slow && <Text accessibilityLiveRegion="polite">This is taking longer than expected.</Text>}
      {!!inlineMessage && <Text accessibilityLiveRegion="polite">{inlineMessage}</Text>}
      {failure && <Text accessibilityRole="alert" style={{ color: '#B3261E' }}>
        {authFailureMessage(failure)} {secondsLeft > 0 ? "Try again in " + secondsLeft + "s." : ''} Support code: {failure.supportCode}
      </Text>}
    </>
  );

  if (userId && secret) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>{reset ? 'Password updated' : 'Reset your password'}</Text>
          {!reset && <>
            <AnimatedTextInput label="New password" value={password} onChangeText={setPassword} secureTextEntry />
            <AnimatedTextInput label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry />
            <CustomButton
              title={isLoading ? 'Updating password…' : 'Update password'}
              disabled={isLoading || secondsLeft > 0}
              onPress={() => run(async () => {
                if (password.length < 8 || password !== confirmation) {
                  setInlineMessage('Use at least 8 characters and enter the same password twice.');
                  return;
                }
                await authService.completePasswordRecovery(userId, secret, password, confirmation);
                setPassword('');
                setConfirmation('');
                setReset(true);
              }, 'recovery_complete')}
            />
          </>}
          {feedback}
          <CustomButton title="Back to sign-in" onPress={() => navigation.replace('Login')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          disabled={isLoading || secondsLeft > 0}
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
          If your account uses this email, we’ll send a reset link to{'\n'}
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
          onPress={handleSendResetLink}
          disabled={isLoading || secondsLeft > 0}
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
          <View style={{ paddingHorizontal: 24 }}>{feedback}</View>
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