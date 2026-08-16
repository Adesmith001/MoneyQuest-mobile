import { ENV } from '../config/environment';
import { getRandomBytes } from 'expo-crypto';
import {
  databases,
  DB_ID,
  COLLECTIONS,
  Query,
} from './appwrite';
import {
  KoraPayInitializeResponse,
  PlanType,
  SUBSCRIPTION_PLANS,
} from '../types/subscription';

class KoraPayService {
  private publicKey: string;
  private hostedCheckoutBaseUrl: string;

  constructor() {
    this.publicKey = ENV.KORAPAY_PUBLIC_KEY;
    this.hostedCheckoutBaseUrl = 'https://moneyquestschooldashboard.vercel.app/subscribe';
  }

  /**
   * Generate a unique transaction reference using crypto-secure random
   */
  generateReference(): string {
    const timestamp = Date.now();
    // Use expo-crypto for secure random generation
    const bytes = getRandomBytes(8);
    const random = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 12);
    return `MQ_${timestamp}_${random}`;
  }

  /**
   * Initialize a payment with KoraPay
   */
  async initializePayment(
    userId: string,
    planType: PlanType,
    userEmail: string,
    userName: string
  ): Promise<KoraPayInitializeResponse> {
    try {
      const plan = SUBSCRIPTION_PLANS[planType];
      const reference = this.generateReference();

      if (!this.publicKey) {
        throw new Error('KoraPay public key is not configured.');
      }

      const query = new URLSearchParams({
        userId,
        email: userEmail,
        name: userName,
        plan: planType,
        reference,
      });

      return {
        status: true,
        message: 'Hosted checkout initialized',
        data: {
          reference,
          checkout_url: `${this.hostedCheckoutBaseUrl}?${query.toString()}`,
        },
      };
    } catch (error: any) {
      console.error('KoraPay initialization error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to initialize payment'
      );
    }
  }

  /**
   * Check whether a KoraPay transaction has been granted. The deployed webhook
   * (school-dashboard/api/webhooks/korapay.js) writes the granted subscription
   * to the `subscriptions` collection with korapayTransactionReference = the
   * payment reference, and also creates a `premium_codes` document. This polls
   * Appwrite so the app never needs KoraPay API credentials.
   */
  async getPaymentStatus(
    reference: string
  ): Promise<{
    status: 'pending' | 'success' | 'failed';
    data?: {
      amount?: number;
      customer?: { email?: string };
    };
  }> {
    try {
      // The webhook activates the subscription directly (primary path).
      const subs = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [
          Query.equal('korapayTransactionReference', reference),
          Query.limit(1),
        ]
      );

      const sub = subs.documents[0] as any;
      if (sub) {
        const status = String(sub.status || '').toLowerCase();
        if (status === 'active' || status === 'trial' || status === 'grace_period') {
          return {
            status: 'success',
            data: {
              amount: Number(sub.amount) || undefined,
              customer: { email: sub.userEmail },
            },
          };
        }
        if (status === 'expired' || status === 'cancelled') {
          return { status: 'failed' };
        }
      }

      // Fallback: the webhook also creates a premium code on success.
      const codes = await databases.listDocuments(
        DB_ID,
        'premium_codes',
        [
          Query.equal('paymentReference', reference),
          Query.limit(1),
        ]
      );
      if (codes.documents.length > 0) {
        return {
          status: 'success',
          data: {
            amount: Number((codes.documents[0] as any).amount) || undefined,
          },
        };
      }

      return { status: 'pending' };
    } catch (error) {
      console.error('KoraPay getPaymentStatus error:', error);
      return { status: 'pending' };
    }
  }

  /**
   * Validate webhook signature (for backend webhook verification)
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    // Implement KoraPay webhook signature validation
    // This typically involves creating an HMAC hash of the payload
    // and comparing it with the signature provided in the webhook header
    // For now, returning true - implement proper validation in production
    return true;
  }
}

export const koraPayService = new KoraPayService();
export default koraPayService;
