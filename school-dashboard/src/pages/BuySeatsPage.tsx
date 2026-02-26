import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { codesApi, paymentsApi } from '../api';
import { SCHOOL_PRICING, SchoolPlanType } from '../config';
import { calculatePrice, formatCurrency } from '../lib/utils';
import { generateReference, initializeKoraPayCheckout } from '../lib/korapay';
import { Card, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import { ShoppingCart, Users, Calendar, Tag, Check, ArrowRight } from 'lucide-react';

export default function BuySeatsPage() {
  const navigate = useNavigate();
  const { school } = useAuthStore();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [planType, setPlanType] = useState<SchoolPlanType>('annual');
  const [seats, setSeats] = useState(10);
  const [codeName, setCodeName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track payment reference for the current transaction
  const paymentRef = useRef<string | null>(null);
  const isCreatingCode = useRef(false);

  const plan = SCHOOL_PRICING[planType];
  // Use fixed seats for fixed plans, otherwise use state
  const effectiveSeats = plan.isFixed ? plan.fixedSeats! : seats;
  const pricing = calculatePrice(planType, effectiveSeats);

  const handleSeatsChange = (value: string) => {
    const num = parseInt(value) || 0;
    setSeats(Math.max(plan.minSeats, Math.min(10000, num)));
  };

  const handlePayment = async () => {
    if (!school || !codeName) {
      toast.error('Please enter a code name');
      return;
    }

    setIsProcessing(true);

    try {
      // Generate a unique reference
      const reference = generateReference();
      paymentRef.current = reference;

      // Create pending payment record in database with codeName
      await paymentsApi.createPending(school.$id, effectiveSeats, planType, reference, codeName);

      // Initialize KoraPay checkout
      await initializeKoraPayCheckout({
        amount: pricing.totalPrice,
        schoolName: school.name,
        schoolEmail: school.email,
        schoolId: school.$id,
        reference,
        seats: effectiveSeats,
        planType,
        codeName,
        onSuccess: async (data) => {
          // Prevent duplicate code creation if already processing
          if (isCreatingCode.current) {
            return;
          }

          isCreatingCode.current = true;

          try {
            // Payment successful - create code directly (has duplicate prevention built-in)
            toast.loading('Creating your enrollment code...', { id: 'create-code' });
            
            const code = await codesApi.create(
              school.$id,
              codeName,
              effectiveSeats,
              planType,
              reference
            );

            // Update payment status
            await paymentsApi.updateStatus(reference, 'success', data.payment_reference);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['codes'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

            toast.success(`Code created: ${code.code}`, { id: 'create-code' });
            navigate('/codes');
          } catch (error: any) {
            console.error('Error creating code:', error);
            toast.error('Payment received but code creation failed. Contact support.', { id: 'create-code' });
          } finally {
            setIsProcessing(false);
            isCreatingCode.current = false;
          }
        },
        onFailed: async (data) => {
          console.error('Payment failed:', data);
          toast.error(data.message || 'Payment failed. Please try again.');
          
          // Update payment status to failed
          try {
            await paymentsApi.updateStatus(reference, 'failed');
          } catch (e) {
            console.error('Failed to update payment status:', e);
          }
          
          setIsProcessing(false);
        },
        onClose: () => {
          // User closed the payment modal
          if (isProcessing) {
            toast('Payment cancelled');
            setIsProcessing(false);
            isCreatingCode.current = false;
          }
        },
      });
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'Failed to initialize payment');
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Buy Seats</h1>
        <p className="text-white/50 mt-1">
          Purchase seats and generate enrollment codes for your students
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s <= step
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-0.5 mx-2 ${
                  s < step ? 'bg-primary-500' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        ))}
        <div className="flex-1" />
        <p className="text-sm text-white/50">
          Step {step} of 3: {step === 1 ? 'Select Plan' : step === 2 ? 'Configure' : 'Checkout'}
        </p>
      </div>

      {/* Step 1: Select Plan */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['monthly', 'annual', 'school_monthly_100', 'school_annual_100'] as SchoolPlanType[]).map((type) => {
            const p = SCHOOL_PRICING[type];
            const selected = planType === type;

            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all ${
                  selected
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'hover:border-white/20'
                }`}
                onClick={() => setPlanType(type)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{p.name}</h3>
                    <p className="text-white/50">{p.duration} subscription</p>
                  </div>
                  {(type === 'annual' || type === 'school_annual_100') && (
                    <span className="bg-accent-500/20 text-accent-500 text-xs font-medium px-2 py-1 rounded-full">
                      Best Value
                    </span>
                  )}
                </div>

                {p.isFixed ? (
                  <div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {formatCurrency(p.fixedPrice!)}
                    </p>
                    <p className="text-sm text-white/50">for {p.fixedSeats} seats (fixed)</p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-white mb-1">
                    {formatCurrency(p.pricePerSeat)}
                    <span className="text-lg text-white/50 font-normal">/seat</span>
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-accent-500" />
                    {p.isFixed ? `${p.fixedSeats} seats included` : 'Flexible seat quantity'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-accent-500" />
                    Full premium access for students
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-accent-500" />
                    Instant code generation
                  </div>
                </div>

                <div
                  className={`mt-4 pt-4 border-t ${
                    selected ? 'border-primary-500/30' : 'border-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mx-auto ${
                      selected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-white/30'
                    }`}
                  >
                    {selected && <Check className="w-full h-full text-white p-0.5" />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <Card>
          <CardHeader
            title="Configure Your Purchase"
            description="Set the number of seats and name your code"
          />

          <div className="space-y-6">
            {plan.isFixed ? (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Number of Seats (Fixed)
                </label>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-center gap-4">
                    <Users className="w-6 h-6 text-primary-500" />
                    <p className="text-3xl font-bold text-white">{plan.fixedSeats}</p>
                    <p className="text-sm text-white/50">seats included</p>
                  </div>
                </div>
                <p className="text-sm text-white/50 mt-2">
                  This plan comes with a fixed {plan.fixedSeats} seats
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Number of Seats
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSeats(Math.max(plan.minSeats, seats - 10))}
                    className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-xl hover:bg-white/20"
                  >
                    -
                  </button>
                  <Input
                    type="number"
                    value={seats}
                    onChange={(e) => handleSeatsChange(e.target.value)}
                    className="w-32 text-center text-lg"
                    min={plan.minSeats}
                    max={10000}
                  />
                  <button
                    onClick={() => setSeats(Math.min(10000, seats + 10))}
                    className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-xl hover:bg-white/20"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-white/50 mt-2">
                  Minimum: {plan.minSeats} seats
                </p>
              </div>
            )}

            <Input
              label="Code Name"
              placeholder="e.g., Class 2025 Batch A"
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              icon={<Tag className="w-5 h-5" />}
            />

            {/* Price Preview */}
            <div className="bg-dark-300 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-white/50">Total Price</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(pricing.totalPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/50">{effectiveSeats} seats × {formatCurrency(pricing.pricePerSeat)}</p>
                  <p className="text-sm text-white/70">{SCHOOL_PRICING[planType].duration}ly plan</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Checkout */}
      {step === 3 && (
        <Card>
          <CardHeader
            title="Order Summary"
            description="Review your purchase before payment"
          />

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-white/40" />
                <span className="text-white/70">Plan</span>
              </div>
              <span className="text-white font-medium">
                {SCHOOL_PRICING[planType].name} ({SCHOOL_PRICING[planType].duration})
              </span>
            </div>

            <div className="flex justify-between py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-white/40" />
                <span className="text-white/70">Seats</span>
              </div>
              <span className="text-white font-medium">{effectiveSeats} seats</span>
            </div>

            <div className="flex justify-between py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-white/40" />
                <span className="text-white/70">Code Name</span>
              </div>
              <span className="text-white font-medium">{codeName}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-white/10">
              <span className="text-white/70">Price per seat</span>
              <span className="text-white font-medium">
                {formatCurrency(pricing.pricePerSeat)}
              </span>
            </div>

            {pricing.discountPercent > 0 && (
              <div className="flex justify-between py-3 border-b border-white/10">
                <span className="text-accent-500">Discount ({pricing.discountPercent}%)</span>
                <span className="text-accent-500 font-medium">
                  -{formatCurrency(pricing.savings)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-4 bg-white/5 rounded-xl px-4 -mx-4">
              <span className="text-lg font-medium text-white">Total</span>
              <span className="text-2xl font-bold text-white">
                {formatCurrency(pricing.totalPrice)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            onClick={() => {
              if (step === 2 && !codeName) {
                toast.error('Please enter a code name');
                return;
              }
              setStep(step + 1);
            }}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handlePayment}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            <ShoppingCart className="w-4 h-4" />
            Pay {formatCurrency(pricing.totalPrice)}
          </Button>
        )}
      </div>
    </div>
  );
}
