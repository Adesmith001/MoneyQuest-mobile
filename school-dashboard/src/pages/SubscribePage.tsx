import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadKoraPayScript } from '../lib/korapay';
import { config, INDIVIDUAL_PRICING } from '../config';

type PlanType = 'monthly' | 'annual';

function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 14);
  return `SUB_${timestamp}_${random}`;
}

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const userId = searchParams.get('userId') || '';
  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = userId && email;

  useEffect(() => {
    loadKoraPayScript().catch(() => {});
  }, []);

  const handlePayment = async () => {
    if (!isValid) {
      setError('Missing required information. Please go back to the app and try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loadKoraPayScript();

      if (!window.Korapay) {
        throw new Error('Service not available. Please refresh and try again.');
      }

      const plan = INDIVIDUAL_PRICING[selectedPlan];
      const reference = generateReference();

      window.Korapay.initialize({
        key: config.korapay.publicKey,
        reference,
        amount: plan.price,
        currency: 'NGN',
        customer: {
          name: name || email,
          email: email,
        },
        notification_url: `${window.location.origin}/api/webhooks/korapay`,
        metadata: {
          userId,
          planType: selectedPlan,
          source: 'web',
        },
        onClose: () => {
          setIsLoading(false);
        },
        onSuccess: () => {
          navigate(`/subscribe/success?plan=${selectedPlan}`);
        },
        onFailed: (data) => {
          setIsLoading(false);
          setError(data.message || 'Something went wrong. Please try again.');
        },
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#FF6B35] flex items-center justify-center p-4">
        <div className="bg-[#444444] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-white/70">
            This link is missing required information. Please go back to the MoneyQuest app and try again.
          </p>
        </div>
      </div>
    );
  }

  const monthly = INDIVIDUAL_PRICING.monthly;
  const annual = INDIVIDUAL_PRICING.annual;

  return (
    <div className="min-h-screen bg-[#FF6B35] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Get Premium</h1>
          <p className="text-white/80 text-base leading-relaxed">
            Unlock all the power of this mobile tool and enjoy digital experience like never before!
          </p>
        </div>

        {/* Fox Mascot */}
        <div className="flex justify-center mb-8">
          <img
            src="/assets/fox.png"
            alt="MoneyQuest Fox Mascot"
            width={200}
            height={200}
            className="animate-bounce"
          />
        </div>

        {/* Plan Cards */}
        <div className="space-y-3 mb-6">
          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-5 rounded-2xl text-left transition-all border-2 ${
              selectedPlan === 'monthly'
                ? 'border-[#4ECDC4] bg-[#444444]'
                : 'border-transparent bg-[#444444]/90 hover:bg-[#444444]'
            }`}
          >
            <div className="flex justify-between items-center">
              <span
                className={`font-bold text-2xl ${
                  selectedPlan === 'monthly' ? 'text-[#4ECDC4]' : 'text-white'
                }`}
              >
                {monthly.name}
              </span>
            </div>
            <p className={`text-white/80 text-sm mt-1 ${selectedPlan === 'monthly' ? 'text-white' : ''}`}>
              ₦{monthly.price.toLocaleString()}/{monthly.duration.toLowerCase()}
            </p>
          </button>

          {/* Annual */}
          <button
            onClick={() => setSelectedPlan('annual')}
            className={`w-full p-5 rounded-2xl text-left transition-all border-2 relative ${
              selectedPlan === 'annual'
                ? 'border-[#4ECDC4] bg-[#444444]'
                : 'border-transparent bg-[#444444]/90 hover:bg-[#444444]'
            }`}
          >
            <div className="flex justify-between items-center">
              <span
                className={`font-bold text-2xl ${
                  selectedPlan === 'annual' ? 'text-[#4ECDC4]' : 'text-white'
                }`}
              >
                {annual.name}
              </span>
              <span className="bg-[#4ECDC4] text-[#1A1A1A] text-xs font-bold px-3 py-1 rounded-full">
                Best Value
              </span>
            </div>
            <p className={`text-white/80 text-sm mt-1 ${selectedPlan === 'annual' ? 'text-white' : ''}`}>
              ₦{annual.price.toLocaleString()}/{annual.duration.toLowerCase()}
            </p>
          </button>
        </div>

        {/* Features */}
        <div className="bg-[#444444]/90 rounded-2xl p-5 mb-6">
          <div className="space-y-3">
            {[
              'Unlimited access to all lessons',
              'Progress tracking & analytics',
              'Gamified learning experience',
              'Exclusive content & early access',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="text-[#4ECDC4] text-lg">✓</span>
                <span className="text-white text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-white text-sm">
            {error}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-lg ${
            isLoading
              ? 'bg-white/60 text-[#FF6B35]/60 cursor-not-allowed'
              : 'bg-white text-[#FF6B35] hover:bg-white/90 active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            `Continue — ₦${INDIVIDUAL_PRICING[selectedPlan].price.toLocaleString()}`
          )}
        </button>

        {/* Legal */}
        <p className="text-center text-white/50 text-xs mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="https://www.nurtureehaven.com/termsandcondition" className="text-[#FFD93D] underline">
            Terms & Conditions
          </a>{' '}
          and{' '}
          <a href="https://www.nurtureehaven.com/privacy-policy" className="text-[#FFD93D] underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
