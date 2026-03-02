import { useSearchParams } from 'react-router-dom';

export default function SubscribeSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'monthly';

  const planLabel = plan === 'annual' ? 'Annual' : 'Monthly';

  return (
    <div className="min-h-screen bg-[#FF6B35] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="text-8xl mb-6">🎉</div>

        <h1 className="text-4xl font-bold text-white mb-3">
          You're all set!
        </h1>

        <p className="text-white/80 text-base mb-8 leading-relaxed">
          Your <span className="font-semibold text-white">{planLabel}</span> premium access
          is being activated. This usually takes just a few seconds.
        </p>

        {/* Steps */}
        <div className="bg-[#444444]/90 rounded-2xl p-6 mb-8 text-left">
          <p className="font-semibold text-white mb-4">What to do now:</p>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#4ECDC4] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              <span className="text-white/90 text-sm pt-1">
                Go back to the <strong className="text-white">MoneyQuest app</strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#4ECDC4] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              <span className="text-white/90 text-sm pt-1">
                Your premium access will be activated automatically
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#4ECDC4] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>
              <span className="text-white/90 text-sm pt-1">
                If not activated immediately, wait a minute and reopen the app
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
          You can safely close this page.
        </p>
      </div>
    </div>
  );
}
