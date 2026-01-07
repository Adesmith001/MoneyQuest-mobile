import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { subscriptionService } from '../services/subscriptionService';
import { Subscription } from '../types/subscription';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  showTrialInfo?: boolean;
}

/**
 * SubscriptionGuard Component
 * 
 * Checks if user has active subscription (trial or paid)
 * Blocks access if subscription expired
 * Redirects to Premium screen when access denied
 */
const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  showTrialInfo = true 
}) => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) {
      setIsChecking(false);
      setHasAccess(false);
      return;
    }

    try {
      const result = await subscriptionService.checkAndUpdateSubscriptionAccess(user.$id);
      
      setHasAccess(result.hasAccess);
      setSubscription(result.subscription);

      if (result.subscription?.status === 'trial') {
        const remaining = subscriptionService.getRemainingTrialDays(result.subscription);
        setTrialDaysRemaining(remaining);
      }

      // If no access, redirect to premium screen
      if (!result.hasAccess) {
        setTimeout(() => {
          navigation.navigate('Premium' as never);
        }, 500);
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      setHasAccess(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpgradePress = () => {
    navigation.navigate('Premium' as never);
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Checking subscription...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedEmoji}>🔒</Text>
        <Text style={styles.blockedTitle}>Subscription Required</Text>
        <Text style={styles.blockedSubtitle}>
          {subscription?.status === 'expired' 
            ? 'Your subscription has expired. Please renew to continue.'
            : 'Please subscribe to access this content.'}
        </Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
          <Text style={styles.upgradeButtonText}>View Plans</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show trial info banner if in trial
  if (showTrialInfo && subscription?.status === 'trial' && trialDaysRemaining > 0) {
    return (
      <>
        {children}
        <View style={styles.floatingBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.trialText}>
              ⏰ {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left in trial
            </Text>
            <TouchableOpacity 
              onPress={handleUpgradePress} 
              style={styles.upgradeButtonFloating}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#B0B0B0',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 30,
  },
  blockedEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  blockedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  blockedSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  floatingBanner: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bannerContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  trialText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  upgradeButtonFloating: {
    backgroundColor: '#FFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default SubscriptionGuard;
