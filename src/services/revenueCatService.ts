import Purchases, {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PACKAGE_TYPE,
  CustomerInfoUpdateListener,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';
import { ENV } from '../config/environment';
import { PlanType } from '../types/subscription';

export const ENTITLEMENT_ID = 'premium';

const IOS_KEY = ENV.REVENUECAT_IOS_KEY;
const ANDROID_KEY = ENV.REVENUECAT_ANDROID_KEY;

export interface RevenueCatPackageState {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  hasCurrentOffering: boolean;
  availablePackageCount: number;
  errorMessage: string | null;
}

class RevenueCatService {
  private configured = false;

  private mapPackages(pkgs: PurchasesPackage[]): Pick<RevenueCatPackageState, 'monthly' | 'annual'> {
    return {
      monthly:
        pkgs.find(
          (p) =>
            p.packageType === PACKAGE_TYPE.MONTHLY ||
            p.product.identifier.toLowerCase().includes('month'),
        ) ?? null,
      annual:
        pkgs.find(
          (p) =>
            p.packageType === PACKAGE_TYPE.ANNUAL ||
            p.product.identifier.toLowerCase().includes('yearly') ||
            p.product.identifier.toLowerCase().includes('annual'),
        ) ?? null,
    };
  }

  private getStoreLabel(): string {
    return Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  }

  private getOfferingsErrorMessage(error?: unknown): string {
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';

    const normalized = rawMessage.toLowerCase();
    if (
      normalized.includes('issue with your configuration') ||
      normalized.includes('no app store products registered') ||
      normalized.includes('no play store products registered') ||
      normalized.includes('why-are-offerings-empty') ||
      normalized.includes('offerings-empty')
    ) {
      return `${this.getStoreLabel()} subscriptions are not configured in RevenueCat for this build yet. Add the store products to the current offering, then try again.`;
    }

    if (!rawMessage) {
      return `Unable to load ${this.getStoreLabel()} subscription products right now.`;
    }

    return rawMessage;
  }

  /** Whether RevenueCat was successfully configured and is usable. */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Call once at app startup (before user is known).
   * Safe to call multiple times — only configures once.
   */
  configure(userId?: string | null): void {
    if (this.configured) return;
    const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
    if (!apiKey) {
      console.warn('RevenueCat: API key not set. Purchases will not be available.');
      return;
    }
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    }
    Purchases.configure({ apiKey, appUserID: userId ?? null });
    this.configured = true;
  }

  /**
   * Call after a user signs in to link their Appwrite user ID with RevenueCat.
   */
  async identifyUser(userId: string): Promise<void> {
    try {
      if (!this.configured) this.configure(userId);
      await Purchases.logIn(userId);
    } catch (err) {
      console.warn('RevenueCat identifyUser failed:', err);
    }
  }

  /**
   * Call on sign-out so RevenueCat generates a new anonymous ID.
   */
  async logOut(): Promise<void> {
    try {
      if (this.configured) await Purchases.logOut();
    } catch (err) {
      console.warn('RevenueCat logOut failed:', err);
    }
  }

  /** Subscribe to real-time CustomerInfo updates (e.g. after a purchase). */
  addCustomerInfoListener(listener: CustomerInfoUpdateListener): void {
    if (!this.configured) return;
    Purchases.addCustomerInfoUpdateListener(listener);
  }

  /** Unsubscribe from CustomerInfo updates — call in useEffect cleanup. */
  removeCustomerInfoListener(listener: CustomerInfoUpdateListener): void {
    if (!this.configured) return;
    Purchases.removeCustomerInfoUpdateListener(listener);
  }

  async getOfferings(): Promise<PurchasesOfferings> {
    return Purchases.getOfferings();
  }

  async getPackageState(): Promise<RevenueCatPackageState> {
    if (!this.configured) {
      return {
        monthly: null,
        annual: null,
        hasCurrentOffering: false,
        availablePackageCount: 0,
        errorMessage: 'RevenueCat is not configured for this build.',
      };
    }

    try {
      const offerings = await this.getOfferings();
      const current = offerings.current;
      const pkgs = current?.availablePackages ?? [];
      const mappedPackages = this.mapPackages(pkgs);

      return {
        ...mappedPackages,
        hasCurrentOffering: Boolean(current),
        availablePackageCount: pkgs.length,
        errorMessage: current
          ? pkgs.length > 0
            ? null
            : `${this.getStoreLabel()} subscriptions are not configured in the current RevenueCat offering yet.`
          : 'RevenueCat does not have a current offering configured for this app yet.',
      };
    } catch (error) {
      return {
        monthly: null,
        annual: null,
        hasCurrentOffering: false,
        availablePackageCount: 0,
        errorMessage: this.getOfferingsErrorMessage(error),
      };
    }
  }

  /**
   * Resolve the monthly and yearly packages from the current offering.
   * Falls back to identifier substring matching so custom product IDs still work.
   */
  async getProducts(): Promise<{ monthly: PurchasesPackage | null; yearly: PurchasesPackage | null }> {
    try {
      const { monthly, annual } = await this.getPackageState();
      return {
        monthly,
        yearly: annual,
      };
    } catch {
      return { monthly: null, yearly: null };
    }
  }

  async getPackageForPlan(planType: PlanType): Promise<PurchasesPackage | null> {
    const packageState = await this.getPackageState();
    return packageState[planType];
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  async restorePurchases(): Promise<CustomerInfo> {
    return Purchases.restorePurchases();
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    return Purchases.getCustomerInfo();
  }

  /** Returns true when the user has an active "premium" entitlement. */
  hasActiveEntitlement(customerInfo: CustomerInfo): boolean {
    return ENTITLEMENT_ID in customerInfo.entitlements.active;
  }

  /**
   * Returns the original transaction ID from the active entitlement,
   * used as the Appwrite transactionReference when syncing.
   */
  getOriginalTransactionId(customerInfo: CustomerInfo): string {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    return (
      entitlement?.productIdentifier ??
      customerInfo.originalAppUserId ??
      `rc_${Date.now()}`
    );
  }

  /** Returns the expiration date of the active entitlement (ISO string or null). */
  getExpirationDate(customerInfo: CustomerInfo): string | null {
    return customerInfo.entitlements.active[ENTITLEMENT_ID]?.expirationDate ?? null;
  }

  // ─── RevenueCat UI ──────────────────────────────────────────────────────────

  /**
   * Present the RevenueCat Paywall for the current offering.
   * Returns true if the user successfully purchased or restored.
   */
  async presentPaywall(): Promise<boolean> {
    if (!this.configured) return false;
    try {
      const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          return true;
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
        default:
          return false;
      }
    } catch (err) {
      console.warn('RevenueCat presentPaywall failed:', err);
      return false;
    }
  }

  /**
   * Present the RevenueCat Paywall only when the user lacks the premium entitlement.
   * Returns true if the user now has access (pre-existing OR just purchased/restored).
   */
  async presentPaywallIfNeeded(): Promise<boolean> {
    if (!this.configured) return false;
    try {
      const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      switch (result) {
        case PAYWALL_RESULT.NOT_PRESENTED: // already has entitlement — grant access
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          return true;
        case PAYWALL_RESULT.ERROR:
        case PAYWALL_RESULT.CANCELLED:
        default:
          return false;
      }
    } catch (err) {
      console.warn('RevenueCat presentPaywallIfNeeded failed:', err);
      return false;
    }
  }

  /**
   * Present the RevenueCat Customer Center.
   * Lets users manage, cancel, or get support for their subscriptions without
   * leaving your app.
   */
  async presentCustomerCenter(): Promise<void> {
    if (!this.configured) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (err) {
      console.warn('RevenueCat presentCustomerCenter failed:', err);
    }
  }
}

export const revenueCatService = new RevenueCatService();
export default revenueCatService;
