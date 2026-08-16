import { Platform } from 'react-native';
import appleIAPService from './appleIAPService';
import googlePlayIAPService from './googlePlayIAPService';
import { koraPayService } from './korapayService';
import {
  initializeKoraPayCheckout,
  KORAPAY_WEB_PLANS,
} from './korapayCheckout';
import { ENV } from '../config/environment';
import {
  PaymentStartRequest,
  PaymentStartResult,
} from '../types/subscription';

class PaymentService {
  /**
   * Open the KoraPay modal checkout for a consumer subscription (web only).
   * Resolves when the modal reports success (or fails/cancels). The deployed
   * webhook backs this up by also activating the subscription server-side.
   */
  private async startKorapayWebCheckout(
    request: PaymentStartRequest
  ): Promise<PaymentStartResult> {
    const publicKey = ENV.KORAPAY_PUBLIC_KEY;
    if (!publicKey) {
      return {
        provider: 'korapay',
        status: 'failed',
        planType: request.planType,
        message: 'KoraPay is not configured.',
      };
    }

    const reference = koraPayService.generateReference();

    try {
      const result = await new Promise<PaymentStartResult>((resolve) => {
        initializeKoraPayCheckout({
          publicKey,
          reference,
          amount: KORAPAY_WEB_PLANS[request.planType],
          customerName: request.userName || 'MoneyQuest User',
          customerEmail: request.userEmail || '',
          userId: request.userId,
          planType: request.planType,
          onSuccess: () => {
            resolve({
              provider: 'korapay',
              status: 'completed',
              planType: request.planType,
              reference,
            });
          },
          onFailed: (data) => {
            resolve({
              provider: 'korapay',
              status: 'failed',
              planType: request.planType,
              reference,
              message: data.message || 'Payment failed.',
            });
          },
          onClose: () => {
            resolve({
              provider: 'korapay',
              status: 'failed',
              planType: request.planType,
              reference,
              message: 'Checkout was cancelled.',
            });
          },
        }).catch((error: Error) => {
          resolve({
            provider: 'korapay',
            status: 'failed',
            planType: request.planType,
            reference,
            message: error.message || 'Failed to open checkout.',
          });
        });
      });

      return result;
    } catch (error: any) {
      return {
        provider: 'korapay',
        status: 'failed',
        planType: request.planType,
        reference,
        message: error?.message || 'Failed to start KoraPay checkout.',
      };
    }
  }

  async startCheckout(request: PaymentStartRequest): Promise<PaymentStartResult> {
    switch (request.provider) {
      case 'korapay':
        // External checkout is only enabled on web (mobile must use the store).
        if (Platform.OS === 'web') {
          return this.startKorapayWebCheckout(request);
        }
        return {
          provider: 'korapay',
          status: 'failed',
          planType: request.planType,
          message: 'External checkout is not available in the mobile app. Use in-app store purchase instead.',
        };
      case 'apple_iap':
        return appleIAPService.startSubscriptionPurchase(request.planType);
      case 'google_play':
        return googlePlayIAPService.startSubscriptionPurchase(request.planType);
      default:
        return {
          provider: request.provider,
          status: 'failed',
          planType: request.planType,
          message: 'This payment provider is not available in the mobile app yet.',
        };
    }
  }

  async restoreStorePurchases(): Promise<PaymentStartResult> {
    if (Platform.OS === 'ios') {
      return appleIAPService.restorePurchases();
    }
    return googlePlayIAPService.restorePurchases();
  }
}

export const paymentService = new PaymentService();
export default paymentService;