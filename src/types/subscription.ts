export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled' | 'grace_period';

export type PlanType = 'monthly' | 'annual';

export type PaymentProvider = 'korapay' | 'google_play' | 'school' | 'none';

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
  trialStartDate: string;
  trialEndDate: string;
  subscriptionStartDate: string; // Required field in Appwrite
  subscriptionEndDate?: string;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  autoRenew: boolean;
  korapayTransactionReference?: string;
  korapayCustomerReference?: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
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
    price: 3500,
    duration: 'Month',
    features: [
      'Unlimited access to all lessons',
      'Progress tracking',
      'Gamified experience',
    ],
    trialDays: 30,
    currency: 'NGN',
    billingCycle: 'month',
  },
  annual: {
    id: 'annual',
    name: 'Annual',
    price: 42000,
    duration: 'Year',
    features: [
      'Everything in Monthly',
      'Priority support',
      'Early access to new features',
      'Exclusive content',
    ],
    trialDays: 30,
    currency: 'NGN',
    billingCycle: 'year',
    bestValue: true,
  },
};
