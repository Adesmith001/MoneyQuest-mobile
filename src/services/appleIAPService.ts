import { Platform } from 'react-native';
import { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';
import { PaymentStartResult, PlanType } from '../types/subscription';
import revenueCatService from './revenueCatService';

// Maps our plan types to RevenueCat package types
const PLAN_TO_PACKAGE_TYPE: Record<PlanType, string> = {
  monthly: PACKAGE_TYPE.MONTHLY,
  annual: PACKAGE_TYPE.ANNUAL,
};

class AppleIAPService {
  isSupported(): boolean {
    return Platform.OS === 'ios';
  }

  private async findPackage(planType: PlanType): Promise<PurchasesPackage | null> {
    try {
      const offerings = await revenueCatService.getOfferings();
      const current = offerings.current;
      if (!current) return null;
      const targetType = PLAN_TO_PACKAGE_TYPE[planType];
      return (
        current.availablePackages.find(
          (p) =>
            p.packageType === targetType ||
            p.product.identifier.includes(
              planType === 'monthly' ? 'month' : planType,
            )
        ) ?? null
      );
    } catch {
      return null;
    }
  }

  async startSubscriptionPurchase(planType: PlanType): Promise<PaymentStartResult> {
    if (!this.isSupported()) {
      return {
        provider: 'apple_iap',
        status: 'failed',
        planType,
        message: 'Apple in-app purchases are only available on iOS.',
      };
    }

    try {
      const pkg = await this.findPackage(planType);
      if (!pkg) {
        return {
          provider: 'apple_iap',
          status: 'failed',
          planType,
          message:
            'Product not available. Please try again later or contact support.',
        };
      }

      const customerInfo = await revenueCatService.purchasePackage(pkg);

      if (revenueCatService.hasActiveEntitlement(customerInfo)) {
        return {
          provider: 'apple_iap',
          status: 'completed',
          planType,
          reference: revenueCatService.getOriginalTransactionId(customerInfo),
          message: 'Purchase successful!',
        };
      }

      return {
        provider: 'apple_iap',
        status: 'failed',
        planType,
        message:
          'Purchase completed but subscription not activated. Please restore purchases.',
      };
    } catch (err: any) {
      if (err.userCancelled) {
        return {
          provider: 'apple_iap',
          status: 'failed',
          planType,
          message: 'Purchase was cancelled.',
        };
      }
      return {
        provider: 'apple_iap',
        status: 'failed',
        planType,
        message: err.message || 'Purchase failed. Please try again.',
      };
    }
  }

  async restorePurchases(): Promise<PaymentStartResult> {
    try {
      const customerInfo = await revenueCatService.restorePurchases();

      if (revenueCatService.hasActiveEntitlement(customerInfo)) {
        const entitlement = customerInfo.entitlements.active['premium'];
        const isAnnual = entitlement?.productIdentifier?.includes('annual');
        return {
          provider: 'apple_iap',
          status: 'completed',
          planType: isAnnual ? 'annual' : 'monthly',
          reference: revenueCatService.getOriginalTransactionId(customerInfo),
          message: 'Purchases restored successfully!',
        };
      }

      return {
        provider: 'apple_iap',
        status: 'failed',
        planType: 'monthly',
        message: 'No active purchases found to restore.',
      };
    } catch (err: any) {
      return {
        provider: 'apple_iap',
        status: 'failed',
        planType: 'monthly',
        message: err.message || 'Failed to restore purchases.',
      };
    }
  }
}

export const appleIAPService = new AppleIAPService();
export default appleIAPService;