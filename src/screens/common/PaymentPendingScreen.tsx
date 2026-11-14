import React, { useEffect, useState } from 'react';
import ErrorNotice from '../../components/ErrorNotice';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { koraPayService } from '../../services/korapayService';
import { subscriptionService } from '../../services/subscriptionService';
import { PaymentProvider, PlanType } from '../../types/subscription';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

type PaymentPendingParams = {
  provider: PaymentProvider;
  reference?: string;
  planType: PlanType;
};

const PaymentPendingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: PaymentPendingParams }, 'params'>>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const { provider, reference } = route.params || {};
  const planType: PlanType = route.params?.planType ?? 'monthly';

  useEffect(() => {
    if (provider === 'korapay' && reference) {
      verifyPayment(reference);
    } else if (provider) {
      setIsVerifying(false);
      setPaymentStatus('failed');
      setErrorMessage('This payment flow does not use pending verification in the app.');
    }
  }, [provider, reference]);

  const verifyPayment = async (paymentReference: string) => {
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

        const status = await koraPayService.getPaymentStatus(paymentReference);

        if (status.status === 'success') {
          // Activate subscription with amount verification
          if (user) {
            // Extract the paid amount from payment data for verification
            const paidAmount = status.data?.amount;
            await subscriptionService.activateProviderSubscription(user.$id, {
              provider: 'korapay',
              planType,
              transactionReference: paymentReference,
              paidAmount,
              customerReference: status.data?.customer?.email,
              autoRenew: false,
            });
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
      navigation.navigate('Premium' as never);
    }
  };

  const renderContent = () => {
    if (isVerifying) {
      return (
        <>
          <View style={styles.iconWrapper}>
            <ActivityIndicator size="large" color="#4ECDC4" />
          </View>
          <Text style={styles.title}>Verifying Payment</Text>
          <Text style={styles.subtitle}>This will only take a moment</Text>
        </>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <>
          <View style={[styles.iconWrapper, styles.successWrapper]}>
            <Ionicons name="checkmark" size={40} color="#4ECDC4" />
          </View>
          <Text style={styles.title}>Payment Complete</Text>
          <Text style={styles.subtitle}>Your premium subscription is now active</Text>
          <TouchableOpacity style={styles.successButton} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#1A1A1A" style={styles.buttonIcon} />
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <View style={[styles.iconWrapper, styles.failedWrapper]}>
          <Ionicons name="close" size={40} color="#FF6B6B" />
        </View>
        <Text style={styles.title}>Payment Failed</Text>
        <ErrorNotice
          title="Payment failed"
          message={errorMessage || 'Unable to process payment'}
          desktopContent={<Text style={styles.subtitle}>{errorMessage || 'Unable to process payment'}</Text>}
        />
        <TouchableOpacity style={styles.retryButton} onPress={handleContinue}>
          <Text style={styles.buttonText}>Try Again</Text>
          <Ionicons name="refresh" size={18} color="#1A1A1A" style={styles.buttonIcon} />
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{renderContent()}</View>
      
      {/* Contact Us Section */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Need Help?</Text>
        <View style={styles.contactOptions}>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Linking.openURL('mailto:moneyquest25@gmail.com')}
          >
            <View style={[styles.contactIconWrapper, { backgroundColor: '#EA4335' }]}>
              <Ionicons name="mail" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.contactButtonText}>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Linking.openURL('https://www.instagram.com/nurture_haven/')}
          >
            <View style={[styles.contactIconWrapper, { backgroundColor: '#E4405F' }]}>
              <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.contactButtonText}>Instagram</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Linking.openURL('https://www.tiktok.com/@nurture_haven')}
          >
            <View style={[styles.contactIconWrapper, { backgroundColor: '#000000' }]}>
              <Ionicons name="logo-tiktok" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.contactButtonText}>TikTok</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  successWrapper: {
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
  },
  failedWrapper: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    maxWidth: 260,
  },
  successButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  contactSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  contactButton: {
    alignItems: 'center',
  },
  contactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactButtonText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});

export default PaymentPendingScreen;
