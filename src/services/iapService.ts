/**
 * In-App Purchase Service (Google Play + App Store)
 *
 * Handles subscriptions on BOTH platforms via react-native-iap:
 *   - Android → Google Play Billing
 *   - iOS     → App Store In-App Purchases
 *
 * KoraPay is NO LONGER used for individual subscriptions on either platform.
 * It is only kept for school bulk purchases via the school-dashboard.
 *
 * Product IDs must match what you create in:
 *   - Google Play Console → Monetize → Subscriptions
 *   - App Store Connect   → My Apps → Subscriptions
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  type Purchase,
  type PurchaseError,
  type Subscription as IAPSubscription,
} from 'react-native-iap';
import { PlanType } from '../types/subscription';
import { subscriptionService } from './subscriptionService';

// ─── Product IDs ────────────────────────────────────────────────────────────
// Use the SAME IDs on both platforms for simplicity.
// These MUST match what you create in Google Play Console AND App Store Connect.
export const IAP_PRODUCT_IDS = {
  monthly: 'moneyquest_monthly',
  annual: 'moneyquest_annual',
} as const;

const PRODUCT_ID_TO_PLAN: Record<string, PlanType> = {
  [IAP_PRODUCT_IDS.monthly]: 'monthly',
  [IAP_PRODUCT_IDS.annual]: 'annual',
};

const ALL_PRODUCT_IDS = Object.values(IAP_PRODUCT_IDS);

// ─── Service ────────────────────────────────────────────────────────────────

class IAPService {
  private connected = false;
  private purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
  private purchaseErrorSub: ReturnType<typeof purchaseErrorListener> | null = null;
  private onPurchaseSuccess: ((purchase: Purchase) => void) | null = null;
  private onPurchaseError: ((error: PurchaseError) => void) | null = null;

  /** IAP is available on both Android and iOS (but NOT in Expo Go). */
  get isAvailable(): boolean {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  get platformName(): string {
    return Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  /** Connect to the store. Call when PremiumScreen mounts. */
  async connect(): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const result = await initConnection();
      this.connected = !!result;

      // Android-only: flush stale pending purchases from previous crashes
      if (Platform.OS === 'android') {
        await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
      }

      // ── Purchase success listener ──
      this.purchaseUpdateSub = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          // CRITICAL: Acknowledge / finish the transaction.
          //   Android: Google auto-refunds after 3 days if not acknowledged
          //   iOS:     Transaction stays in queue and blocks future purchases
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (_) {
            // Already finished — safe to ignore
          }
          this.onPurchaseSuccess?.(purchase);
        }
      );

      // ── Purchase error listener ──
      this.purchaseErrorSub = purchaseErrorListener(
        (error: PurchaseError) => {
          this.onPurchaseError?.(error);
        }
      );

      return true;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }

  /** Disconnect from the store. Call when PremiumScreen unmounts. */
  async disconnect(): Promise<void> {
    this.purchaseUpdateSub?.remove();
    this.purchaseErrorSub?.remove();
    this.purchaseUpdateSub = null;
    this.purchaseErrorSub = null;
    this.onPurchaseSuccess = null;
    this.onPurchaseError = null;

    if (this.connected) {
      try { await endConnection(); } catch (_) {}
      this.connected = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Query products
  // ──────────────────────────────────────────────────────────────────────────

  /** Fetch subscription products from the store. */
  async getProducts(): Promise<IAPSubscription[]> {
    if (!this.connected) {
      throw new Error(`${this.platformName} billing not connected`);
    }

    const subscriptions = await getSubscriptions({ skus: ALL_PRODUCT_IDS });
    return subscriptions;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Purchase
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Launch the native purchase sheet (Google Play or App Store).
   * Returns a Promise that resolves on success or rejects on error/cancel.
   */
  async purchaseSubscription(
    planType: PlanType,
    userId: string
  ): Promise<Purchase> {
    if (!this.connected) {
      throw new Error(`${this.platformName} billing not connected. Please try again.`);
    }

    const productId = IAP_PRODUCT_IDS[planType];

    return new Promise<Purchase>(async (resolve, reject) => {
      // Wire up one-shot callbacks
      this.onPurchaseSuccess = (purchase: Purchase) => {
        this.onPurchaseSuccess = null;
        this.onPurchaseError = null;
        resolve(purchase);
      };

      this.onPurchaseError = (error: PurchaseError) => {
        this.onPurchaseSuccess = null;
        this.onPurchaseError = null;
        reject(error);
      };

      try {
        if (Platform.OS === 'android') {
          // Android needs an offerToken for Google Play Billing Library v5+
          const products = await getSubscriptions({ skus: [productId] });
          const product = products.find(p => p.productId === productId);

          if (!product) {
            reject(new Error(
              `Subscription "${productId}" not found on ${this.platformName}. ` +
              `Make sure it's created and activated in the console.`
            ));
            return;
          }

          const offerToken = product.subscriptionOfferDetails?.[0]?.offerToken;

          await requestSubscription({
            sku: productId,
            ...(offerToken && {
              subscriptionOffers: [{ sku: productId, offerToken }],
            }),
          });
        } else {
          // iOS — simpler: just request by SKU
          await requestSubscription({ sku: productId });
        }

        // Resolution happens in purchaseUpdatedListener above
      } catch (error: any) {
        this.onPurchaseSuccess = null;
        this.onPurchaseError = null;
        reject(error);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Activate in backend
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * After a successful store purchase, save the subscription in Appwrite
   * so the user gets premium access.
   */
  async activateSubscription(
    purchase: Purchase,
    userId: string,
    planType: PlanType
  ): Promise<void> {
    const prefix = Platform.OS === 'ios' ? 'apple' : 'gp';
    const transactionId = purchase.transactionId || purchase.purchaseToken || 'unknown';

    await subscriptionService.activateSubscription(
      userId,
      planType,
      `${prefix}_${transactionId}`,
      undefined // Amount validated by the store, not client-side
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Restore purchases
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Restore previously purchased subscriptions.
   * Required by Apple (App Store Review Guideline 3.1.2).
   * Also useful on Android when a user reinstalls or switches devices.
   */
  async restorePurchases(): Promise<Purchase[]> {
    if (!this.connected) {
      throw new Error(`${this.platformName} billing not connected`);
    }

    const purchases = await getAvailablePurchases();
    return purchases;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Map a store product ID back to a PlanType. */
  getPlanTypeFromProductId(productId: string): PlanType | null {
    return PRODUCT_ID_TO_PLAN[productId] ?? null;
  }
}

export const iapService = new IAPService();
export default iapService;
