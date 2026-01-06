import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { koraPayService } from '../../services/korapayService';
import { subscriptionService } from '../../services/subscriptionService';
import { PlanType } from '../../types/subscription';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

type PaymentPendingParams = {
  reference: string;
  planType: PlanType;
};

const PaymentPendingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: PaymentPendingParams }, 'params'>>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const { reference, planType } = route.params || {};

  useEffect(() => {
    if (reference) {
      verifyPayment();
    }
  }, [reference]);

  const verifyPayment = async () => {
    try {
      setIsVerifying(true);

      // Poll payment status (retry every 3 seconds for up to 30 seconds)
      let attempts = 0;
      const maxAttempts = 10;

      const pollPayment = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          setPaymentStatus('failed');
          setErrorMessage('Payment verification timeout. Please check your email for confirmation.');
          setIsVerifying(false);
          return;
        }

        const status = await koraPayService.getPaymentStatus(reference);

        if (status.status === 'success') {
          // Activate subscription
          if (user) {
            await subscriptionService.activateSubscription(user.$id, planType, reference);
          }
          setPaymentStatus('success');
          setIsVerifying(false);
        } else if (status.status === 'failed') {
          setPaymentStatus('failed');
          setErrorMessage('Payment failed. Please try again.');
          setIsVerifying(false);
        } else {
          // Still pending, retry
          attempts++;
          setTimeout(() => pollPayment(), 3000);
        }
      };

      await pollPayment();
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Failed to verify payment');
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    if (paymentStatus === 'success') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    } else {
      navigation.goBack();
    }
  };

  const renderContent = () => {
    if (isVerifying) {
      return (
        <>
          <ActivityIndicator size="large" color="#4ECDC4" style={styles.loader} />
          <Text style={styles.title}>Verifying Payment...</Text>
          <Text style={styles.subtitle}>Please wait while we confirm your payment</Text>
        </>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={100} color="#4ECDC4" />
          </View>
          <Text style={styles.title}>Payment Successful! 🎉</Text>
          <Text style={styles.subtitle}>
            Your premium subscription has been activated. Enjoy unlimited access!
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue to App</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={100} color="#FF6B6B" />
        </View>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>{errorMessage || 'Something went wrong with your payment.'}</Text>
        <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={handleContinue}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loader: {
    marginBottom: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#FF6B35',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
});

export default PaymentPendingScreen;
