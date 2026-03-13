import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { subscriptionService } from '../services/subscriptionService';
import { schoolService } from '../services/schoolService';
import revenueCatService from '../services/revenueCatService';
import { Subscription } from '../types/subscription';
import { SchoolStudent } from '../types/school';
import { Ionicons } from '@expo/vector-icons';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  showTrialInfo?: boolean;
}

/**
 * SubscriptionGuard Component
 *
 * Offline-first subscription check:
 *  1. Reads locally cached subscription (AsyncStorage) → instant, no network
 *  2. Evaluates access via pure date-math → works fully offline
 *  3. Silently refreshes cache from Appwrite in the background when online
 *  4. Falls back to RevenueCat entitlement check for store subscribers whose
 *     Appwrite record hasn't been synced yet (e.g. fresh install, new device).
 *
 * The user never sees a loading screen; the cached expiry date is the
 * authoritative counter until the next online sync overwrites it.
 */
const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ 
  children, 
  showTrialInfo = true 
}) => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  // Default to true so content renders immediately; cache check resolves quickly
  const [hasAccess, setHasAccess] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [schoolEnrollment, setSchoolEnrollment] = useState<SchoolStudent | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [schoolDaysRemaining, setSchoolDaysRemaining] = useState(0);
  const [subscriptionType, setSubscriptionType] = useState<'individual' | 'school' | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) {
      setHasAccess(false);
      return;
    }

    // ── Step 1: school subscription (still needs network; gracefully skips if offline) ──
    try {
      const schoolResult = await schoolService.hasActiveSchoolSubscription(user.$id);
      if (schoolResult.hasAccess) {
        setHasAccess(true);
        setSchoolEnrollment(schoolResult.enrollment);
        setSchoolDaysRemaining(schoolResult.daysRemaining);
        setSubscriptionType('school');
        // Background-refresh individual cache too, fire-and-forget
        subscriptionService.refreshSubscriptionCache(user.$id);
        return;
      }
    } catch (_) {
      // Offline — skip school check, fall through to individual cache
    }

    // ── Step 2: individual subscription via local cache (offline-first) ──
    const { hasAccess: localAccess, subscription: localSub, trialDaysRemaining: localDays } =
      await subscriptionService.checkLocalSubscriptionAccess(user.$id);

    setHasAccess(localAccess);
    setSubscription(localSub);
    setSubscriptionType(localAccess ? 'individual' : null);
    setTrialDaysRemaining(localDays);
      // ── Step 3: RevenueCat entitlement check (store subscribers without Appwrite record) ──
      // Runs when the user has no local cache (e.g. fresh install, new device).
      // If RevenueCat says they have premium, grant access and trigger an async Appwrite sync.
      if (!localAccess && localSub === null && revenueCatService.isConfigured()) {
        try {
          const customerInfo = await revenueCatService.getCustomerInfo();
          if (revenueCatService.hasActiveEntitlement(customerInfo)) {
            setHasAccess(true);
            setSubscriptionType('individual');
            // Fire-and-forget: seed the Appwrite record so the local cache is populated
            subscriptionService.refreshSubscriptionCache(user.$id).catch(() => {});
            return;
          }
        } catch {
          // RC offline or not configured — continue with no-access flow
        }
      }
    if (!localAccess && localSub === null) {
      // No local cache at all — user may be new or just logged in on a new device.
      // Try a one-off network fetch to seed the cache, then re-evaluate.
      try {
        await subscriptionService.refreshSubscriptionCache(user.$id);
        const { hasAccess: fresh, subscription: freshSub, trialDaysRemaining: freshDays } =
          await subscriptionService.checkLocalSubscriptionAccess(user.$id);
        setHasAccess(fresh);
        setSubscription(freshSub);
        setSubscriptionType(fresh ? 'individual' : null);
        setTrialDaysRemaining(freshDays);
        if (!fresh) {
          setTimeout(() => navigation.navigate('Premium' as never), 500);
        }
      } catch (_) {
        // Still offline and no cache — grant a short grace window rather than blocking
        setHasAccess(true);
      }
      return;
    }

    if (!localAccess) {
      setTimeout(() => navigation.navigate('Premium' as never), 500);
    }

    // ── Step 3: background network refresh (fire-and-forget) ──
    // Keeps the local cache up-to-date for future offline sessions.
    subscriptionService.refreshSubscriptionCache(user.$id).then(async () => {
      // Re-read updated cache and silently update UI state
      const { hasAccess: updated, subscription: updatedSub, trialDaysRemaining: updatedDays } =
        await subscriptionService.checkLocalSubscriptionAccess(user.$id);
      setHasAccess(updated);
      setSubscription(updatedSub);
      setTrialDaysRemaining(updatedDays);
    }).catch(() => { /* offline — keep current state */ });
  };

  const handleUpgradePress = () => {
    navigation.navigate('Premium' as never);
  };

  if (!hasAccess) {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.lockIconWrapper}>
          <Ionicons name="lock-closed" size={32} color="#FF6B35" />
        </View>
        <Text style={styles.blockedTitle}>
          {subscription?.status === 'expired' ? 'Subscription Expired' : 'Premium Required'}
        </Text>
        <Text style={styles.blockedSubtitle}>
          {subscription?.status === 'expired' 
            ? 'Renew your subscription to continue your learning journey.'
            : 'Unlock unlimited access to all lessons and features.'}
        </Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
          <Text style={styles.upgradeButtonText}>View Plans</Text>
          <Ionicons name="arrow-forward" size={18} color="#1A1A1A" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    );
  }

  // Show trial info banner if in trial
  if (showTrialInfo && subscription?.status === 'trial' && trialDaysRemaining > 0 && showBanner) {
    return (
      <>
        {children}
        <TouchableOpacity 
          style={styles.minimalPill}
          onPress={handleUpgradePress}
          activeOpacity={0.9}
        >
          <View style={styles.pillContent}>
            <Text style={styles.pillText}>
              {trialDaysRemaining}d left
            </Text>
            <View style={styles.pillDivider} />
            <Text style={styles.pillUpgrade}>Upgrade</Text>
          </View>
        </TouchableOpacity>
      </>
    );
  }

  // Show school badge for school subscribers
  if (subscriptionType === 'school' && schoolEnrollment) {
    return (
      <>
        {children}
        <View style={styles.schoolBadge}>
          <Ionicons name="school" size={12} color="#FF6B35" />
          <Text style={styles.schoolText}>School</Text>
        </View>
      </>
    );
  }

  // Show premium badge for paid subscribers
  if (subscription?.status === 'active') {
    return (
      <>
        {children}
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond" size={12} color="#FF6B35" />
          <Text style={styles.premiumText}>Premium</Text>
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
    paddingHorizontal: 40,
  },
  lockIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  blockedSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
    maxWidth: 280,
  },
  upgradeButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  minimalPill: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
  },
  pillDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  pillUpgrade: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
    letterSpacing: 0.3,
  },
  premiumBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  schoolBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
  },
  schoolText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
    marginLeft: 5,
    letterSpacing: 0.5,
  },
});

export default SubscriptionGuard;
