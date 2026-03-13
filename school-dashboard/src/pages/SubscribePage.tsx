import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadKoraPayScript } from '../lib/korapay';
import { account, databases, Query } from '../lib/appwrite';
import { config, INDIVIDUAL_PRICING } from '../config';

type PlanType = 'monthly' | 'annual';

type UserOption = {
  $id: string;
  username?: string;
  name?: string;
  email?: string;
};

function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 14);
  return `SUB_${timestamp}_${random}`;
}

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedUserId = searchParams.get('userId') || '';
  const requestedEmail = searchParams.get('email') || '';
  const requestedName = searchParams.get('name') || '';
  const requestedPlan = searchParams.get('plan');
  const requestedReference = searchParams.get('reference') || '';

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(
    requestedPlan === 'monthly' || requestedPlan === 'annual' ? requestedPlan : 'annual'
  );
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userLookupError, setUserLookupError] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(requestedUserId);
  const [manualUserId, setManualUserId] = useState(requestedUserId);
  const [manualEmail, setManualEmail] = useState(requestedEmail);
  const [manualName, setManualName] = useState(requestedName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.username, user.name].some((field) =>
        (field || '').toLowerCase().includes(query)
      )
    );
  }, [users, userQuery]);

  const selectedUser = useMemo(
    () => users.find((user) => user.$id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const effectiveUserId = selectedUser?.$id || manualUserId.trim();
  const effectiveEmail = (selectedUser?.email || manualEmail).trim();
  const effectiveName = (selectedUser?.name || selectedUser?.username || manualName).trim();

  const isValid = effectiveUserId && effectiveEmail;

  useEffect(() => {
    loadKoraPayScript().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setUserLookupError('');
      try {
        try {
          await account.get();
        } catch {
          await account.createAnonymousSession();
        }

        const response = await databases.listDocuments(
          config.appwrite.databaseId,
          config.collections.users,
          [Query.limit(250)]
        );

        if (cancelled) return;

        const normalized = response.documents.map((doc) => ({
          $id: doc.$id,
          username: (doc.username as string | undefined) || '',
          name: (doc.name as string | undefined) || '',
          email: (doc.email as string | undefined) || '',
        }));

        setUsers(normalized);

        if (requestedUserId && normalized.some((u) => u.$id === requestedUserId)) {
          setSelectedUserId(requestedUserId);
        }
      } catch (err) {
        if (!cancelled) {
          setUserLookupError(
            'Could not load usernames automatically. You can still enter your account details manually.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [requestedUserId]);

  useEffect(() => {
    if (!selectedUser) return;
    setManualUserId(selectedUser.$id);
    setManualEmail(selectedUser.email || '');
    setManualName(selectedUser.name || selectedUser.username || '');
  }, [selectedUser]);

  const handlePayment = async () => {
    if (!isValid) {
      setError('Please select your account (or enter your User ID and email) before continuing.');
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
      const reference = requestedReference || generateReference();

      window.Korapay.initialize({
        key: config.korapay.publicKey,
        reference,
        amount: plan.price,
        currency: 'NGN',
        customer: {
          name: effectiveName || effectiveEmail,
          email: effectiveEmail,
        },
        notification_url: `${window.location.origin}/api/webhooks/korapay`,
        metadata: {
          userId: effectiveUserId,
          planType: selectedPlan,
          source: 'web',
        },
        onClose: () => {
          setIsLoading(false);
        },
        onSuccess: () => {
          navigate(
            `/subscribe/success?plan=${selectedPlan}&reference=${encodeURIComponent(reference)}&userId=${encodeURIComponent(effectiveUserId)}`
          );
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

        {/* Account Selection */}
        <div className="bg-[#444444]/90 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold text-lg mb-2">Choose your MoneyQuest account</h2>
          <p className="text-white/70 text-sm mb-4">
            Your payment code will be tied to this account and can only be redeemed by this user.
          </p>

          {isLoadingUsers ? (
            <p className="text-white/70 text-sm">Loading accounts...</p>
          ) : (
            <>
              {userLookupError ? (
                <div className="mb-3 p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-100 text-xs">
                  {userLookupError}
                </div>
              ) : null}

              {users.length > 0 ? (
                <>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search by username or name"
                    className="w-full rounded-xl px-4 py-3 bg-[#1A1A1A] text-white placeholder:text-white/40 border border-white/10 mb-3 outline-none focus:border-[#4ECDC4]"
                  />

                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 bg-[#1A1A1A] text-white border border-white/10 outline-none focus:border-[#4ECDC4]"
                  >
                    <option value="">Select your account</option>
                    {filteredUsers.map((user) => (
                      <option key={user.$id} value={user.$id}>
                        {user.username || user.name || 'Unnamed user'}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              {(users.length === 0 || userLookupError) ? (
                <div className="space-y-3 mt-3">
                  <input
                    value={manualUserId}
                    onChange={(e) => setManualUserId(e.target.value)}
                    placeholder="User ID"
                    className="w-full rounded-xl px-4 py-3 bg-[#1A1A1A] text-white placeholder:text-white/40 border border-white/10 outline-none focus:border-[#4ECDC4]"
                  />
                  <input
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl px-4 py-3 bg-[#1A1A1A] text-white placeholder:text-white/40 border border-white/10 outline-none focus:border-[#4ECDC4]"
                  />
                  <input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Name (optional)"
                    className="w-full rounded-xl px-4 py-3 bg-[#1A1A1A] text-white placeholder:text-white/40 border border-white/10 outline-none focus:border-[#4ECDC4]"
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Fox Mascot */}
        <div className="flex justify-center mb-8">
          <img
            src="/fox.png"
            alt="MoneyQuest Fox Mascot"
            width={250}
            height={250}
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

        {/* Web purchase guide */}
        <div className="bg-[#444444]/90 rounded-2xl p-5 mb-6 text-left">
          <p className="text-white font-semibold mb-3">How it works</p>
          <ol className="space-y-2 text-white/90 text-sm">
            <li>1. Select your MoneyQuest account above.</li>
            <li>2. Choose a plan and complete payment on this website.</li>
            <li>3. Copy the premium code shown after successful payment.</li>
            <li>4. Open the app and redeem the code in Get Premium.</li>
          </ol>
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
