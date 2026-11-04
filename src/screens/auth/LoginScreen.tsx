import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Image 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signIn, signInWithGoogle, reactivateAccount } from '../../store/slices/authSlice';
import AuthService from '../../services/auth';
import { RootState, AppDispatch } from '../../store';
import { Ionicons } from '@expo/vector-icons';
import { getSupportCode } from '../../utils/supportCode';

interface Props {
  navigation: any;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const [takingLong, setTakingLong] = useState(false);
  useEffect(() => {
    if (!isLoading) { setTakingLong(false); return; }
    const timer = setTimeout(() => setTakingLong(true), 12000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const result = await dispatch(signIn({ email, password }));
      if (signIn.fulfilled.match(result)) {
        // Login successful, navigation will be handled by AppNavigator
        Alert.alert('Success', 'Login successful!');
      } else {
        const errorMessage = result.payload as string;
        if (errorMessage?.startsWith('ACCOUNT_DISABLED:')) {
          const userId = errorMessage.split(':')[1];
          Alert.alert(
            'Account Disabled',
            'Your account is currently disabled. Would you like to reactivate it?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => AuthService.signOut(),
              },
              {
                text: 'Reactivate',
                onPress: async () => {
                  const reactivateResult = await dispatch(reactivateAccount({ userId }));
                  if (reactivateAccount.fulfilled.match(reactivateResult)) {
                    Alert.alert('Account Reactivated', 'Welcome back! Your account is now active.');
                  } else {
                    Alert.alert('Error', 'Failed to reactivate account. Please try again.');
                    AuthService.signOut();
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Login Failed', errorMessage || 'Invalid email or password');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'Google') {
      try {
        const result = await dispatch(signInWithGoogle());
        if (signInWithGoogle.fulfilled.match(result)) {
          Alert.alert('Success', 'Google login successful!');
        } else {
          const errorMessage = result.payload as string;
          Alert.alert('Google Login Failed', errorMessage || 'Failed to login with Google');
        }
      } catch (error) {
        Alert.alert('Error', 'Google login failed');
      }
    } else {
      // Other providers coming soon
      Alert.alert('Coming Soon', `${provider} login will be available soon!`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Money Quest</Text>
          </View>

          {/* Login Title */}
          <View style={styles.loginHeader}>
            <Text style={styles.loginTitle}>Log In</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Log in'}
              </Text>
            </TouchableOpacity>
            {takingLong && <Text style={{ color: '#555', textAlign: 'center', marginBottom: 12 }}>Login is taking longer than expected. Check your connection. If it does not finish, reload and try again. Support code: {getSupportCode()}</Text>}

            {/* <View style={styles.divider}>
              <Text style={styles.dividerText}>OR LOGIN WITH</Text>
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('Google')}
                disabled={isLoading}
              >
                <Ionicons name="logo-google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('Facebook')}
                disabled={isLoading}
              >
                <Ionicons name="logo-facebook" size={24} color="#4267B2" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin('Twitter')}
                disabled={isLoading}
              >
                <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
              </TouchableOpacity>
            </View> */}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Signup</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 30,
    minHeight: 600,
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
  loginHeader: {
    alignItems: "center",
    marginBottom: 60,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#212121",
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#212121",
  },
  passwordInput: {
    paddingRight: 55,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-start",
    marginBottom: 40,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: "#FF8A00",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 40,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    alignItems: "center",
    marginBottom: 30,
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
    marginBottom: 40,
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

export default LoginScreen;
