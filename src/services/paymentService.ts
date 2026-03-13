import { Platform } from 'react-native';
import appleIAPService from './appleIAPService';
import googlePlayIAPService from './googlePlayIAPService';
import {
  PaymentStartRequest,
  PaymentStartResult,
} from '../types/subscription';

class PaymentService {
  async startCheckout(request: PaymentStartRequest): Promise<PaymentStartResult> {
    switch (request.provider) {
      case 'korapay':
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