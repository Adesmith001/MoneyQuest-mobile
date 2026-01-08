import { config } from '../config';
import { functions } from './appwrite';

// KoraPay Checkout types
interface KoraPayConfig {
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

interface KoraPaySuccessData {
  reference: string;
  status: 'success';
  amount: number;
  fee: number;
  currency: string;
  transaction_reference: string;
  payment_reference: string;
}

interface KoraPayFailedData {
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

// Generate unique reference
export function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 14);
  return `SCH_${timestamp}_${random}`;
}

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

// Initialize KoraPay checkout
export interface InitializePaymentParams {
  amount: number;
  schoolName: string;
  schoolEmail: string;
  schoolId: string;
  reference: string;
  seats: number;
  planType: string;
  codeName?: string;
  onSuccess: (data: KoraPaySuccessData) => void;
  onFailed: (data: KoraPayFailedData) => void;
  onClose: () => void;
}

export async function initializeKoraPayCheckout(params: InitializePaymentParams): Promise<void> {
  await loadKoraPayScript();

  if (!window.Korapay) {
    throw new Error('KoraPay not available');
  }

  window.Korapay.initialize({
    key: config.korapay.publicKey,
    reference: params.reference,
    amount: params.amount,
    currency: 'NGN',
    customer: {
      name: params.schoolName,
      email: params.schoolEmail,
    },
    metadata: {
      type: 'school_subscription',
      schoolId: params.schoolId,
      seats: params.seats,
      planType: params.planType,
      codeName: params.codeName || 'Code',
    },
    onClose: params.onClose,
    onSuccess: params.onSuccess,
    onFailed: params.onFailed,
  });
}

// Verify payment and create code via Appwrite function (secure backend)
export interface VerifyAndCreateCodeParams {
  reference: string;
  schoolId: string;
  codeName: string;
  seats: number;
  planType: string;
}

export interface VerifyAndCreateCodeResult {
  success: boolean;
  message: string;
  data?: {
    codeId: string;
    code: string;
    name: string;
    seats: number;
    expirationDate: string;
  };
}

export async function verifyPaymentAndCreateCode(
  params: VerifyAndCreateCodeParams
): Promise<VerifyAndCreateCodeResult> {
  try {
    const execution = await functions.createExecution(
      'verifySchoolPayment', // Function ID - update this after deploying
      JSON.stringify(params),
      false, // Not async - wait for response
      '/', // Path
      'POST' // Method
    );

    const response = JSON.parse(execution.responseBody);
    return response;
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify payment',
    };
  }
}
