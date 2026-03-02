import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { databases, ID, Query } from '../lib/appwrite';
import { config } from '../config';

const PLANS: Record<string, { price: number; billingCycle: 'month' | 'year' }> = {
  monthly: { price: 3500, billingCycle: 'month' },
  annual: { price: 42000, billingCycle: 'year' },
};

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MQP-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function SubscribeSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'monthly';
  const reference = searchParams.get('reference') || '';
  const userId = searchParams.get('userId') || '';

  const [premiumCode, setPremiumCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const planLabel = plan === 'annual' ? 'Annual' : 'Monthly';

  // Create premium code directly via Appwrite client SDK (same approach as school codes)
  useEffect(() => {
    if (!reference || !userId) {
      setError('Missing payment information. Please contact support.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const createCode = async () => {
      try {
        // Check if a code already exists for this payment reference
        const existing = await databases.listDocuments(
          config.appwrite.databaseId,
          'premium_codes',
          [Query.equal('paymentReference', reference), Query.limit(1)]
        );

        if (cancelled) return;

        if (existing.documents.length > 0) {
          setPremiumCode(existing.documents[0].code as string);
          setIsLoading(false);
          return;
        }

        // Generate and create the code
        const code = generateCode();
        const planInfo = PLANS[plan] || PLANS.monthly;
        const now = new Date();
        const expirationDate = new Date(now);
        if (planInfo.billingCycle === 'month') {
          expirationDate.setMonth(expirationDate.getMonth() + 1);
        } else {
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        }

        await databases.createDocument(
          config.appwrite.databaseId,
          'premium_codes',
          ID.unique(),
          {
            code,
            userId,
            planType: plan,
            status: 'unused',
            paymentReference: reference,
            amount: planInfo.price,
            currency: 'NGN',
            expirationDate: expirationDate.toISOString(),
            createdAt: now.toISOString(),
          }
        );

        if (!cancelled) {
          setPremiumCode(code);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error creating premium code:', err);
          setError(
            'Could not generate your code. Please contact support with your payment reference: ' +
              reference
          );
          setIsLoading(false);
        }
      }
    };

    createCode();

    return () => { cancelled = true; };
  }, [reference, userId, plan]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(premiumCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = premiumCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FF6B35] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="text-8xl mb-6">🎉</div>

        <h1 className="text-4xl font-bold text-white mb-3">
          Payment Successful!
        </h1>

        <p className="text-white/80 text-base mb-8 leading-relaxed">
          Your <span className="font-semibold text-white">{planLabel}</span> premium subscription
          has been purchased successfully.
        </p>

        {/* Premium Code Section */}
        {isLoading ? (
          <div className="bg-[#444444]/90 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[#4ECDC4]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-white/80 text-sm">Generating your activation code...</span>
            </div>
          </div>
        ) : premiumCode ? (
          <div className="bg-[#444444]/90 rounded-2xl p-6 mb-8">
            <p className="text-white/70 text-sm mb-3">Your Premium Activation Code</p>
            <div
              onClick={handleCopy}
              className="bg-[#1A1A1A] rounded-xl p-4 mb-3 cursor-pointer hover:bg-[#2A2A2A] transition-colors border-2 border-dashed border-[#4ECDC4]/50"
            >
              <p className="text-[#4ECDC4] text-3xl font-mono font-bold tracking-wider select-all">
                {premiumCode}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                copied
                  ? 'bg-[#4ECDC4] text-[#1A1A1A]'
                  : 'bg-[#4ECDC4]/20 text-[#4ECDC4] hover:bg-[#4ECDC4]/30'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Tap to Copy Code'}
            </button>
          </div>
        ) : (
          <div className="bg-[#444444]/90 rounded-2xl p-6 mb-8">
            <p className="text-red-300 text-sm">
              {error || 'Something went wrong. Please contact support.'}
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="bg-[#444444]/90 rounded-2xl p-6 mb-8 text-left">
          <p className="font-semibold text-white mb-4">What to do now:</p>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#4ECDC4] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              <span className="text-white/90 text-sm pt-1">
                <strong className="text-white">Copy the code</strong> above
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#4ECDC4] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              <span className="text-white/90 text-sm pt-1">
                Open the <strong className="text-white">MoneyQuest app</strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#4ECDC4] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>
              <span className="text-white/90 text-sm pt-1">
                Go to <strong className="text-white">Get Premium → Enter Premium Code</strong> and paste it
              </span>
            </li>
          </ol>
        </div>

        {/* Open App Button */}
        <a
          href="moneyquest://"
          className="block w-full py-5 bg-white text-[#FF6B35] rounded-2xl font-bold text-lg hover:bg-white/90 transition-all active:scale-[0.98] shadow-lg"
        >
          Open MoneyQuest App
        </a>

        <p className="text-white/40 text-xs mt-6">
          Keep this page open until you've copied your code.
        </p>
      </div>
    </div>
  );
}
