import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUp, signInWithGoogle } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import AnimatedTextInput from '../../components/AnimatedTextInput';
import authService from '../../services/auth';
import { getPasswordValidationError } from '../../utils/passwordValidation';
import ErrorNotice from '../../components/ErrorNotice';
import { showErrorAlert } from '../../services/errorAlerts';

interface Props {
  navigation: any;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [schoolName, setSchoolName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formError, setFormError] = useState('');
  const passwordError = getPasswordValidationError(password);
  const { width } = useWindowDimensions();
  const showInlineValidation = Platform.OS === 'web' && width >= 768;
  const signUpDisabled = isLoading || (showInlineValidation && Boolean(passwordError));

  // Debounced real-time username availability check
  useEffect(() => {
    if (!username.trim() || username.trim().length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const taken = await authService.isUsernameTaken(username.trim());
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch {
        setUsernameStatus('idle');
      }
    }, 600);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username]);

  const handleSignUp = async () => {
    setFormError("");
    if (!firstName || !lastName || !username || !email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    if (usernameStatus === 'taken') {
      setFormError('That username is already taken. Please choose another.');
      return;
    }

    if (usernameStatus === 'checking') {
      setFormError('Still checking username availability...');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Please enter a valid email address');
      return;
    }

    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    // Instead of creating account immediately, navigate to onboarding
    // The account will be created after all onboarding data is collected
    navigation.navigate('AgeSelection', {
      registrationData: {
        firstName,
        lastName,
        username,
        schoolName,
        email,
        phoneNumber,
        password,
      }
    });
  };

  const handleGoogleSignUp = async () => {
    try {
      // Start Google OAuth flow
      const result = await dispatch(signInWithGoogle());
      
      if (signInWithGoogle.fulfilled.match(result)) {
        // OAuth flow started successfully
        // The callback will be handled in AppNavigator
      } else {
        const errorMessage = result.payload as string;
        showErrorAlert('Google Signup Failed', errorMessage || 'Failed to signup with Google');
      }
    } catch (error) {
      showErrorAlert('Google Signup Failed', 'Google signup failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Money Quest</Text>
            </View>

            {/* Sign Up Title */}
            <View style={styles.signUpHeader}>
              <Text style={styles.signUpTitle}>Create Your Account</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <AnimatedTextInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />

              <AnimatedTextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />

              <AnimatedTextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameStatus === 'checking' && (
                <View style={styles.usernameStatus}>
                  <ActivityIndicator size="small" color="#888" />
                  <Text style={styles.usernameStatusText}>Checking availability...</Text>
                </View>
              )}
              {usernameStatus === 'available' && (
                <View style={styles.usernameStatus}>
                  <Text style={[styles.usernameStatusText, { color: '#4CAF50' }]}>✓ Username is available</Text>
                </View>
              )}
              {showInlineValidation && usernameStatus === 'taken' && (
                <View style={styles.usernameStatus}>
                  <Text style={[styles.usernameStatusText, { color: '#F44336' }]}>✗ Username is already taken</Text>
                </View>
              )}

              <AnimatedTextInput
                label="Phone Number (Optional)"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />

               <AnimatedTextInput
                label="School Name (Optional)"
                value={schoolName}
                onChangeText={setSchoolName}
                autoCapitalize="words"
              />

              <AnimatedTextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <AnimatedTextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                showPasswordToggle={true}
              />
              <ErrorNotice
                title="Signup problem"
                message={formError}
                onDismiss={() => setFormError('')}
              />
              {showInlineValidation && passwordError ? (
                <Text style={styles.passwordError}>{passwordError}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.signUpButton, signUpDisabled && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={signUpDisabled}
              >
                <Text style={styles.signUpButtonText}>
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </Text>
              </TouchableOpacity>

              {/* <View style={styles.divider}>
                <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
              </View> */}

              {/* <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleSignUp}
                  disabled={isLoading}
                >
                  <Text style={styles.googleIcon}>G</Text>
                </TouchableOpacity>
              </View> */}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212121",
  },
  signUpHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  signUpTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212121",
  },
  form: {
    marginBottom: 40,
  },
  usernameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  usernameStatusText: {
    fontSize: 13,
    color: '#888',
  },
  passwordError: {
    color: '#F44336',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  signUpButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  signUpButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    alignItems: "center",
    marginBottom: 5,
  },
  dividerText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DB4437',
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    color: "#666",
  },
  footerLink: {
    fontSize: 16,
    color: "#FF8A00",
    fontWeight: "600",
  },
});

export default RegisterScreen;
