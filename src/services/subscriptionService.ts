import { ID, Query, Permission, Role } from 'react-native-appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databases } from './appwrite';
import { ENV } from '../config/environment';

const APPWRITE_DATABASE_ID = ENV.APPWRITE_DATABASE_ID;
const APPWRITE_SUBSCRIPTIONS_COLLECTION_ID = ENV.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID;
import {
  Subscription,
  SubscriptionStatus,
  PlanType,
  SUBSCRIPTION_PLANS,
} from '../types/subscription';

class SubscriptionService {
  // ─── Offline-first local cache ─────────────────────────────────────────────
  private localCacheKey(userId: string) {
    return `subscription_cache_${userId}`;
  }

  /** Persist subscription to AsyncStorage so access checks work offline. */
  async saveSubscriptionLocally(sub: Subscription): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.localCacheKey(sub.userId),
        JSON.stringify(sub)
      );
    } catch (_) {}
  }

  /** Read the locally cached subscription (no network). Returns null if absent. */
  async getLocalSubscription(userId: string): Promise<Subscription | null> {
    try {
      const raw = await AsyncStorage.getItem(this.localCacheKey(userId));
      return raw ? (JSON.parse(raw) as Subscription) : null;
    } catch (_) {
      return null;
    }
  }

  /** Remove local cache (call on logout). */
  async clearLocalSubscription(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.localCacheKey(userId));
    } catch (_) {}
  }

  /**
   * Offline-first access check.
   * Reads from AsyncStorage, does pure date-math — no network required.
   * Call refreshSubscriptionCache() in the background to keep it fresh.
   */
  async checkLocalSubscriptionAccess(
    userId: string
  ): Promise<{ hasAccess: boolean; subscription: Subscription | null; trialDaysRemaining: number }> {
    const sub = await this.getLocalSubscription(userId);
    if (!sub) return { hasAccess: false, subscription: null, trialDaysRemaining: 0 };
    const hasAccess = this.hasActiveSubscription(sub);
    const trialDaysRemaining = sub.status === 'trial' ? this.getRemainingTrialDays(sub) : 0;
    return { hasAccess, subscription: sub, trialDaysRemaining };
  }

  /**
   * Silently fetch the latest subscription from Appwrite and update local cache.
   * Fire-and-forget — never await this in the UI path.
   */
  async refreshSubscriptionCache(userId: string): Promise<void> {
    try {
      const sub = await this.getUserSubscription(userId);
      if (sub) await this.saveSubscriptionLocally(sub);
    } catch (_) {} // Offline is fine — stale cache is still used
  }

  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Create a new trial subscription for a user
   */
  async createTrialSubscription(userId: string): Promise<Subscription> {
    try {
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const subscription: Omit<Subscription, '$id'> = {
        userId,
        planType: 'monthly', // Default to monthly
        status: 'trial',
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        subscriptionStartDate: now.toISOString(), // Required field for Appwrite schema
        autoRenew: false,
        amount: 0,
        currency: 'NGN',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const response = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
        ID.unique(),
        subscription,
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );

      const created = response as unknown as Subscription;
      // Persist locally so next check works offline
      await this.saveSubscriptionLocally(created);
      return created;
    } catch (error: any) {
      console.error('Error creating trial subscription:', error);
      throw new Error(error.message || 'Failed to create trial subscription');
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.orderDesc('createdAt'), Query.limit(1)]
      );

      if (response.documents.length > 0) {
        return response.documents[0] as unknown as Subscription;
      }

      return null;
    } catch (error: any) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  /**
   * Check if user's trial has expired
   */
  isTrialExpired(subscription: Subscription): boolean {
    if (subscription.status !== 'trial') {
      return false;
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);
    return now > trialEnd;
  }

  /**
   * Check if user has active subscription
   */
  hasActiveSubscription(subscription: Subscription | null): boolean {
    if (!subscription) {
      return false;
    }

    // If still in trial period
    if (subscription.status === 'trial' && !this.isTrialExpired(subscription)) {
      return true;
    }

    // If subscription is active
    if (subscription.status === 'active' && subscription.subscriptionEndDate) {
      const now = new Date();
      const endDate = new Date(subscription.subscriptionEndDate);
      return now < endDate;
    }

    return false;
  }

  /**
   * Get remaining trial days
   */
  getRemainingTrialDays(subscription: Subscription): number {
    if (subscription.status !== 'trial') {
      return 0;
    }

    const now = new Date();
    const trialEnd = new Date(subscription.trialEndDate);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Activate paid subscription after successful payment
   * NOTE: This should only be called from secure backend (Appwrite Function webhook)
   * For client-side, payment status verification happens through polling
   */
  async activateSubscription(
    userId: string,
    planType: PlanType,
    transactionReference: string,
    paidAmount?: number // Optional amount verification
  ): Promise<Subscription> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const now = new Date();
      const plan = SUBSCRIPTION_PLANS[planType];
      
      // Verify amount if provided (important for webhook verification)
      if (paidAmount !== undefined && paidAmount < plan.price) {
        throw new Error(
          `Payment amount mismatch. Expected ${plan.price}, received ${paidAmount}`
        );
      }

      const endDate = new Date(now);

      // Calculate subscription end date based on plan
      if (plan.billingCycle === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const nextBillingDate = new Date(endDate);

      const updatedData = {
        planType,
        status: 'active' as SubscriptionStatus,
        subscriptionStartDate: now.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        lastPaymentDate: now.toISOString(),
        nextBillingDate: nextBillingDate.toISOString(),
        korapayTransactionReference: transactionReference,
        amount: plan.price,
        updatedAt: now.toISOString(),
      };

      const response = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
        subscription.$id!,
        updatedData
      );

      const activated = response as unknown as Subscription;
      await this.saveSubscriptionLocally(activated);
      return activated;
    } catch (error: any) {
      console.error('Error activating subscription:', error);
      throw new Error(error.message || 'Failed to activate subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const updatedData = {
        status: 'cancelled' as SubscriptionStatus,
        autoRenew: false,
        updatedAt: new Date().toISOString(),
      };

      const response = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
        subscription.$id!,
        updatedData
      );

      const cancelled = response as unknown as Subscription;
      await this.saveSubscriptionLocally(cancelled);
      return cancelled;
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Toggle auto-renew for a user's subscription
   */
  async toggleAutoRenew(userId: string, autoRenew: boolean): Promise<Subscription> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const response = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
        subscription.$id!,
        {
          autoRenew,
          updatedAt: new Date().toISOString(),
        }
      );

      return response as unknown as Subscription;
    } catch (error: any) {
      console.error('Error toggling auto-renew:', error);
      throw new Error(error.message || 'Failed to update auto-renew');
    }
  }

  /**
   * Update subscription status when expired
   */
  async updateExpiredSubscription(subscriptionId: string): Promise<void> {
    try {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
        subscriptionId,
        {
          status: 'expired' as SubscriptionStatus,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      console.error('Error updating expired subscription:', error);
    }
  }

  /**
   * Check subscription access and update if needed
   */
  async checkAndUpdateSubscriptionAccess(
    userId: string
  ): Promise<{ hasAccess: boolean; subscription: Subscription | null }> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        return { hasAccess: false, subscription: null };
      }

      // Check if trial expired
      if (subscription.status === 'trial' && this.isTrialExpired(subscription)) {
        await this.updateExpiredSubscription(subscription.$id!);
        return { hasAccess: false, subscription };
      }

      // Check if paid subscription expired
      if (subscription.status === 'active' && subscription.subscriptionEndDate) {
        const now = new Date();
        const endDate = new Date(subscription.subscriptionEndDate);

        if (now > endDate) {
          await this.updateExpiredSubscription(subscription.$id!);
          return { hasAccess: false, subscription };
        }
      }

      const hasAccess = this.hasActiveSubscription(subscription);
      return { hasAccess, subscription };
    } catch (error: any) {
      console.error('Error checking subscription access:', error);
      return { hasAccess: false, subscription: null };
    }
  }

  /**
   * Redeem a premium activation code (e.g. MQP-XXXXXX) to activate subscription.
   * The code is created by the webhook after a successful KoraPay payment.
   */
  async redeemPremiumCode(
    userId: string,
    code: string
  ): Promise<{ success: boolean; message: string; subscription?: Subscription }> {
    try {
      const trimmedCode = code.trim().toUpperCase();

      // Look up the code in premium_codes collection
      const codesResult = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        'premium_codes',
        [Query.equal('code', trimmedCode), Query.limit(1)]
      );

      if (codesResult.documents.length === 0) {
        return { success: false, message: 'Invalid code. Please check and try again.' };
      }

      const premiumCode = codesResult.documents[0] as any;

      // Guard: if this payment reference was already used by another account, block reuse.
      // This protects against cases where status update failed previously.
      if (premiumCode.paymentReference) {
        const existingSubByPayment = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
          [
            Query.equal('korapayTransactionReference', premiumCode.paymentReference),
            Query.limit(1),
          ]
        );

        if (
          existingSubByPayment.documents.length > 0 &&
          existingSubByPayment.documents[0].userId !== userId
        ) {
          return {
            success: false,
            message: 'This code has already been used.',
          };
        }
      }

      // Check if the code has already been redeemed
      if (premiumCode.status === 'redeemed') {
        return { success: false, message: 'This code has already been used.' };
      }

      // Check if the code belongs to this user
      if (premiumCode.userId && premiumCode.userId !== userId) {
        return { success: false, message: 'This code is not associated with your account.' };
      }

      // Check if the code has expired
      if (premiumCode.expirationDate) {
        const expDate = new Date(premiumCode.expirationDate);
        if (new Date() > expDate) {
          return { success: false, message: 'This code has expired.' };
        }
      }

      const planType = premiumCode.planType as PlanType;
      const plan = SUBSCRIPTION_PLANS[planType];
      if (!plan) {
        return { success: false, message: 'Invalid plan type in code.' };
      }

      // Consume the code FIRST. If this write fails, do not activate subscription.
      // This prevents a successful activation while the code remains unused.
      const now = new Date();
      try {
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          'premium_codes',
          premiumCode.$id,
          {
            status: 'redeemed',
            redeemedAt: now.toISOString(),
            redeemedBy: userId,
          }
        );
      } catch (consumeError: any) {
        console.error('Failed to consume premium code:', consumeError);
        return {
          success: false,
          message: 'Could not use this code right now. Please try again.',
        };
      }

      // Calculate subscription dates
      const endDate = new Date(now);
      if (plan.billingCycle === 'month') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Get or create subscription
      let subscription = await this.getUserSubscription(userId);
      let activated: Subscription;

      if (subscription) {
        const response = await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
          subscription.$id!,
          {
            planType,
            status: 'active' as SubscriptionStatus,
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: endDate.toISOString(),
            lastPaymentDate: now.toISOString(),
            nextBillingDate: endDate.toISOString(),
            korapayTransactionReference: premiumCode.paymentReference || '',
            amount: premiumCode.amount || plan.price,
            updatedAt: now.toISOString(),
          }
        );
        activated = response as unknown as Subscription;
      } else {
        const response = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_SUBSCRIPTIONS_COLLECTION_ID,
          ID.unique(),
          {
            userId,
            planType,
            status: 'active' as SubscriptionStatus,
            trialStartDate: now.toISOString(),
            trialEndDate: now.toISOString(),
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: endDate.toISOString(),
            lastPaymentDate: now.toISOString(),
            nextBillingDate: endDate.toISOString(),
            autoRenew: false,
            korapayTransactionReference: premiumCode.paymentReference || '',
            amount: premiumCode.amount || plan.price,
            currency: 'NGN',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
          [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
          ]
        );
        activated = response as unknown as Subscription;
      }

      // Save locally for offline access
      await this.saveSubscriptionLocally(activated);

      return {
        success: true,
        message: 'Premium activated successfully!',
        subscription: activated,
      };
    } catch (error: any) {
      console.error('Error redeeming premium code:', error);
      return {
        success: false,
        message: error.message || 'Failed to redeem code. Please try again.',
      };
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
