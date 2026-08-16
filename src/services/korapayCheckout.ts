/**
 * Native stub for the KoraPay modal checkout.
 *
 * External (non-store) checkout is blocked in the mobile app, so the modal
 * checkout only exists on web (see korapayCheckout.web.ts). These functions
 * throw so any accidental native usage fails loudly instead of silently.
 */

export type KoraPaySuccessData = {
  reference: string;
  status: 'success';
  amount: number;
  fee: number;
  currency: string;
  transaction_reference: string;
  payment_reference: string;
};

export type KoraPayFailedData = {
  reference: string;
  status: 'failed';
  message: string;
};

export const KORAPAY_WEBHOOK_URL = '';

export const KORAPAY_WEB_PLANS = {
  monthly: 2000,
  annual: 24000,
} as const;

export function loadKoraPayScript(): Promise<void> {
  return Promise.reject(
    new Error('KoraPay modal checkout is only available on web.')
  );
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

export function initializeKoraPayCheckout(
  _params: InitializeKoraPayCheckoutParams
): Promise<void> {
  return Promise.reject(
    new Error('KoraPay modal checkout is only available on web.')
  );
}
