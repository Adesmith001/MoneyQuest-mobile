import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signUp, signInWithGoogle } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';
import AnimatedTextInput from '../../components/AnimatedTextInput';

interface Props {
  navigation: any;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !username || !phoneNumber || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    // Instead of creating account immediately, navigate to onboarding
    // The account will be created after all onboarding data is collected
    navigation.navigate('AgeSelection', {
      registrationData: {
        firstName,
        lastName,
        username,
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
        Alert.alert('Google Signup Failed', errorMessage || 'Failed to signup with Google');
      }
    } catch (error) {
      Alert.alert('Error', 'Google signup failed');
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

              <AnimatedTextInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
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

              <TouchableOpacity
                style={[styles.signUpButton, isLoading && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={isLoading}
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