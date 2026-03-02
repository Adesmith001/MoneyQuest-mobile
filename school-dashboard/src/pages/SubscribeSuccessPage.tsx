import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { databases, Query } from '../lib/appwrite';
import { config } from '../config';

export default function SubscribeSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'monthly';
  const reference = searchParams.get('reference') || '';

  const [premiumCode, setPremiumCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const planLabel = plan === 'annual' ? 'Annual' : 'Monthly';

  // Poll for the premium code (webhook may take a few seconds)
  useEffect(() => {
    if (!reference) {
      setIsLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      try {
        const result = await databases.listDocuments(
          config.appwrite.databaseId,
          'premium_codes',
          [
            Query.equal('paymentReference', reference),
            Query.limit(1),
          ]
        );

        if (result.documents.length > 0) {
          setPremiumCode(result.documents[0].code);
          setIsLoading(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsLoading(false);
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsLoading(false);
        }
      }
    };

    poll();
  }, [reference]);

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
            <p className="text-white/70 text-sm">
              Your premium access is being activated automatically.
              If it doesn't activate within a few minutes, please contact support.
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
