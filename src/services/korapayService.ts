import { ENV } from '../config/environment';
import { getRandomBytes } from 'expo-crypto';
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
