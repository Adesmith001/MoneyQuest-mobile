/**
 * Web-only KoraPay checkout (the Korapay collections modal).
 *
 * Ported from school-dashboard/src/lib/korapay.ts. Metro resolves this file
 * for web bundles; the native stub (korapayCheckout.ts) throws because
 * external checkout is blocked in the mobile app.
 *
 * Amounts MUST match the webhook's consumer plan prices
 * (school-dashboard/api/webhooks/korapay.js SUBSCRIPTION_PLANS) — the webhook
 * rejects any charge below the plan price.
 */

// KoraPay Checkout types
export interface KoraPayConfig {
  key: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
  };
  metadata?: Record<string, any>;
  notification_url?: string;
  onClose: () => void;
  onSuccess: (data: KoraPaySuccessData) => void;
  onFailed: (data: KoraPayFailedData) => void;
}

export interface KoraPaySuccessData {
  reference: string;
  status: 'success';
  amount: number;
  fee: number;
  currency: string;
  transaction_reference: string;
  payment_reference: string;
}

export interface KoraPayFailedData {
  reference: string;
  status: 'failed';
  message: string;
}

// Declare the global KoraPay object
declare global {
  interface Window {
    Korapay?: {
      initialize: (config: KoraPayConfig) => void;
    };
  }
}

// Webhook that activates the consumer subscription (deployed with the
// school dashboard). KoraPay needs a public URL to deliver webhooks.
export const KORAPAY_WEBHOOK_URL =
  'https://moneyquestschooldashboard.vercel.app/api/webhooks/korapay';

// Consumer plan prices charged on web. MUST match the webhook's
// SUBSCRIPTION_PLANS (school-dashboard/api/webhooks/korapay.js) — the webhook
// rejects any charge below these amounts.
export const KORAPAY_WEB_PLANS = {
  monthly: 3000,
  annual: 36000,
} as const;

// Load KoraPay script dynamically
export function loadKoraPayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Korapay) {
      resolve();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.getElementById('korapay-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.id = 'korapay-script';
    script.src = 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load KoraPay script'));
    };

    document.head.appendChild(script);
  });
}

export interface InitializeKoraPayCheckoutParams {
  publicKey: string;
  reference: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  userId: string;
  planType: string;
  notificationUrl?: string;
  onSuccess: (data: KoraPaySuccessData) => void;
  onFailed: (data: KoraPayFailedData) => void;
  onClose: () => void;
}

export async function initializeKoraPayCheckout(
  params: InitializeKoraPayCheckoutParams
): Promise<void> {
  await loadKoraPayScript();

  if (!window.Korapay) {
    throw new Error('KoraPay not available');
  }

  window.Korapay.initialize({
    key: params.publicKey,
    reference: params.reference,
    amount: params.amount,
    currency: params.currency || 'NGN',
    customer: {
      name: params.customerName,
      email: params.customerEmail,
    },
    metadata: {
      // NOTE: deliberately NOT 'school_subscription' — the webhook routes
      // everything else to the individual-subscription path using userId +
      // planType.
      userId: params.userId,
      planType: params.planType,
      reference: params.reference,
    },
    notification_url: params.notificationUrl || KORAPAY_WEBHOOK_URL,
    onClose: params.onClose,
    onSuccess: params.onSuccess,
    onFailed: params.onFailed,
  });
}
