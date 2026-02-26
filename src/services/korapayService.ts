import axios from 'axios';
import { ENV } from '../config/environment';
import { getRandomBytes } from 'expo-crypto';
import {
  PaymentIntent,
  KoraPayInitializeResponse,
  PlanType,
  SUBSCRIPTION_PLANS,
} from '../types/subscription';

class KoraPayService {
  private secretKey: string;
  private apiUrl: string;

  constructor() {
    this.secretKey = ENV.KORAPAY_SECRET_KEY;
    this.apiUrl = ENV.KORAPAY_API_URL;
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

      const payload = {
        amount: plan.price,
        currency: plan.currency,
        reference,
        customer: {
          name: userName,
          email: userEmail,
        },
        metadata: {
          userId,
          planType,
          description: `MoneyQuest ${plan.name} Subscription`,
        },
      };

      const url = `${this.apiUrl}/charges/initialize`;
      
      const response = await axios.post<KoraPayInitializeResponse>(
        url,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Payment initialization failed');
      }
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
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/charges/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('KoraPay verification error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to verify payment'
      );
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(reference: string): Promise<{
    status: 'success' | 'pending' | 'failed';
    data: any;
  }> {
    try {
      const verification = await this.verifyPayment(reference);

      if (verification.status) {
        const paymentStatus = verification.data.status;

        if (paymentStatus === 'success' || paymentStatus === 'completed') {
          return { status: 'success', data: verification.data };
        } else if (paymentStatus === 'pending' || paymentStatus === 'processing') {
          return { status: 'pending', data: verification.data };
        } else {
          return { status: 'failed', data: verification.data };
        }
      } else {
        return { status: 'failed', data: verification };
      }
    } catch (error: any) {
      console.error('Error getting payment status:', error);
      return { status: 'failed', data: null };
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
