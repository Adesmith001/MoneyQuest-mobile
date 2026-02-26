/**
 * Google Play Billing Service
 *
 * Handles Android in-app subscriptions via Google Play Billing.
 * On Android, Google Play policy requires all digital-content purchases
 * to go through their billing system. KoraPay is only used on iOS / web / school bulk purchases.
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type Purchase,
  type PurchaseError,
  type Subscription as IAPSubscription,
  flushFailedPurchasesCachedAsPendingAndroid,
} from 'react-native-iap';
import { PlanType } from '../types/subscription';
import { subscriptionService } from './subscriptionService';

// ─── Google Play product IDs ────────────────────────────────────────────────
// These MUST match the product IDs you create in Google Play Console → Monetize → Subscriptions
export const GOOGLE_PLAY_PRODUCT_IDS = {
  monthly: 'moneyquest_monthly',
  annual: 'moneyquest_annual',
} as const;

// Reverse look-up: product ID → PlanType
const PRODUCT_ID_TO_PLAN: Record<string, PlanType> = {
  [GOOGLE_PLAY_PRODUCT_IDS.monthly]: 'monthly',
  [GOOGLE_PLAY_PRODUCT_IDS.annual]: 'annual',
};

const ALL_PRODUCT_IDS = Object.values(GOOGLE_PLAY_PRODUCT_IDS);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GooglePlayProduct {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  price: string;
  currency: string;
  subscriptionOfferDetails?: Array<{
    offerToken: string;
    pricingPhases: {
      pricingPhaseList: Array<{
        formattedPrice: string;
        priceAmountMicros: string;
        priceCurrencyCode: string;
        billingPeriod: string;
        billingCycleCount: number;
        recurrenceMode: number;
      }>;
    };
  }>;
}

// ─── Service ────────────────────────────────────────────────────────────────

class GooglePlayBillingService {
  private connected = false;
  private purchaseUpdateSubscription: ReturnType<typeof purchaseUpdatedListener> | null = null;
  private purchaseErrorSubscription: ReturnType<typeof purchaseErrorListener> | null = null;
  private onPurchaseSuccess: ((purchase: Purchase) => void) | null = null;
  private onPurchaseError: ((error: PurchaseError) => void) | null = null;

  /** True only on Android */
  get isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  /** Call once when the app starts (or when payment screen mounts). */
  async connect(): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const result = await initConnection();
      this.connected = !!result;

      if (Platform.OS === 'android') {
        // Clear any stale pending purchases from previous crashes
        await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
      }

      // Set up global purchase listeners
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          // Acknowledge / finish the transaction so Google doesn't auto-refund
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (e) {
            // Already finished — safe to ignore
          }
          this.onPurchaseSuccess?.(purchase);
        }
      );

      this.purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          this.onPurchaseError?.(error);
        }
      );

      return true;
    } catch (error) {
      console.error('Google Play Billing connect error:', error);
      this.connected = false;
      return false;
    }
  }

  /** Call when the payment screen unmounts or the app goes to background. */
  async disconnect(): Promise<void> {
    this.purchaseUpdateSubscription?.remove();
    this.purchaseErrorSubscription?.remove();
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
    this.onPurchaseSuccess = null;
    this.onPurchaseError = null;

    if (this.connected) {
      try {
        await endConnection();
      } catch (_) {}
      this.connected = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Query products
  // ──────────────────────────────────────────────────────────────────────────

  /** Fetch subscription product details from Google Play. */
  async getProducts(): Promise<IAPSubscription[]> {
    if (!this.connected) {
      throw new Error('Google Play Billing not connected');
    }

    try {
      const subscriptions = await getSubscriptions({ skus: ALL_PRODUCT_IDS });
      return subscriptions;
    } catch (error) {
      console.error('Error fetching Google Play subscriptions:', error);
      throw new Error('Failed to load subscription plans from Google Play');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Purchase
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Launch the Google Play purchase flow for a subscription.
   * Returns a Promise that resolves when the purchase completes or rejects on error.
   */
  async purchaseSubscription(
    planType: PlanType,
    userId: string
  ): Promise<Purchase> {
    if (!this.connected) {
      throw new Error('Google Play Billing not connected');
    }

    const productId = GOOGLE_PLAY_PRODUCT_IDS[planType];

    return new Promise<Purchase>(async (resolve, reject) => {
      // Wire up one-shot listeners for this purchase attempt
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
        // Get the subscription products to find the offer token
        const products = await getSubscriptions({ skus: [productId] });
        const product = products.find(p => p.productId === productId);

        if (!product) {
          reject(new Error(`Subscription product "${productId}" not found on Google Play`));
          return;
        }

        // Get the offer token (required for Google Play Billing v5+)
        const offerToken = product.subscriptionOfferDetails?.[0]?.offerToken;

        await requestSubscription({
          sku: productId,
          ...(offerToken && {
            subscriptionOffers: [{ sku: productId, offerToken }],
          }),
        });

        // The actual resolution happens in purchaseUpdatedListener above
      } catch (error: any) {
        this.onPurchaseSuccess = null;
        this.onPurchaseError = null;
        reject(error);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Activate after purchase
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * After a successful Google Play purchase, activate the subscription
   * in our Appwrite backend so the user gets access.
   */
  async activateFromGooglePlay(
    purchase: Purchase,
    userId: string,
    planType: PlanType
  ): Promise<void> {
    const transactionId = purchase.transactionId || purchase.purchaseToken || 'gp_unknown';

    await subscriptionService.activateSubscription(
      userId,
      planType,
      `gp_${transactionId}`,
      undefined // skip client-side amount verification for Google Play — amount is validated by Google
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Map a Google Play product ID back to a PlanType. */
  getPlanTypeFromProductId(productId: string): PlanType | null {
    return PRODUCT_ID_TO_PLAN[productId] ?? null;
  }
}

export const googlePlayBillingService = new GooglePlayBillingService();
export default googlePlayBillingService;
