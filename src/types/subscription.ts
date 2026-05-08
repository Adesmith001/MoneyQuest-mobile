export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'grace_period';

export type PlanType = 'monthly' | 'annual';

export type PaymentProvider =
  | 'apple_iap'
  | 'korapay'
  | 'google_play'
  | 'school'
  | 'none';

export type PaymentSessionStatus = 'pending' | 'requires_action' | 'completed' | 'failed';

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: number;
  duration: string;
  features: string[];
  trialDays: number;
  currency: string;
  billingCycle: 'month' | 'year';
  bestValue?: boolean;
}

export interface Subscription {
  $id?: string;
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  paymentProvider?: PaymentProvider;
  trialStartDate: string;
  trialEndDate: string;
  subscriptionStartDate: string; // Required field in Appwrite
  subscriptionEndDate?: string;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  paymentReference?: string;
  externalTransactionId?: string;
  originalTransactionId?: string;
  providerProductId?: string;
  receiptReference?: string;
  korapayTransactionReference?: string;
  korapayCustomerReference?: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionActivationInput {
  planType: PlanType;
  provider: PaymentProvider;
  transactionReference: string;
  paidAmount?: number;
  externalTransactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  receiptReference?: string;
  customerReference?: string;
  autoRenew?: boolean;
  /** Actual subscription end date from the store (Apple/Google). When provided,
   * this takes priority over the locally-calculated end date. */
  subscriptionEndDate?: string;
}

export interface PaymentStartRequest {
  userId: string;
  planType: PlanType;
  provider: PaymentProvider;
  userEmail?: string;
  userName?: string;
}

export interface PaymentStartResult {
  provider: PaymentProvider;
  status: PaymentSessionStatus;
  planType: PlanType;
  reference?: string;
  checkoutUrl?: string;
  productId?: string;
  message?: string;
}

export interface PaymentIntent {
  amount: number;
  currency: string;
  reference: string;
  customer: {
    name: string;
    email: string;
  };
  metadata: {
    userId: string;
    planType: PlanType;
    description: string;
  };
}

export interface KoraPayInitializeResponse {
  status: boolean;
  message: string;
  data: {
    checkout_url: string;
    reference: string;
  };
}

export interface KoraPayWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      name: string;
      email: string;
    };
    metadata: any;
  };
}

export const SUBSCRIPTION_PLANS: Record<PlanType, SubscriptionPlan> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    price: 2000,
    duration: 'Month',
    features: [
      'Unlimited access to all lessons',
      'Progress tracking',
      'Gamified experience',
    ],
    trialDays: 14,
    currency: 'NGN',
    billingCycle: 'month',
  },
  annual: {
    id: 'annual',
    name: 'Annual',
    price: 24000,
    duration: 'Year',
    features: [
      'Everything in Monthly',
      'Priority support',
      'Early access to new features',
      'Exclusive content',
    ],
    trialDays: 14,
    currency: 'NGN',
    billingCycle: 'year',
    bestValue: true,
  },
};
