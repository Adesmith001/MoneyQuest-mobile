import { ID, Query, Permission, Role } from 'react-native-appwrite';
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

      return response as unknown as Subscription;
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

      return response as unknown as Subscription;
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

      return response as unknown as Subscription;
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
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
