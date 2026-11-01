import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useBusiness } from '../../context/BusinessContext';
import { 
  SUBSCRIPTION_PLANS, 
  getAnnualDiscountPercent,
  get6MonthsDiscountPercent,
  getDiscountPercent,
  getPlanPriceMinor,
  getEffectiveMonthlyPriceMinor,
  getTrialDaysRemaining
} from '../../lib/subscriptions';
import { formatNaira } from '../../lib/money';
import { SubscriptionPlanId, BillingInterval } from '../../types';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Zap, 
  ArrowRight,
  Clock
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const { 
    activeBusiness, 
    startProTrialSubscription, 
    updateSubscription 
  } = useBusiness();

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('pro');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('6months');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'bank_transfer' | 'card'>('paystack');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'checkout'>('select');

  const currentPlanId = activeBusiness?.subscription?.planId || 'free';
  const isTrialing = activeBusiness?.subscription?.status === 'trialing';
  const trialDaysLeft = getTrialDaysRemaining(activeBusiness?.subscription);

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];
  const discountPercent = getDiscountPercent(selectedPlan, billingInterval);

  const handleStartTrial = async () => {
    try {
      setIsProcessing(true);
      await startProTrialSubscription();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    try {
      setIsProcessing(true);
      await updateSubscription(selectedPlanId, billingInterval, paymentMethod);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Your BizLedger Plan"
      description="Unlock unlimited invoicing, receipt issuance, advanced reports, and team collaboration."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Usage Prompt Alert */}
        {reason && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Usage Limit Reached: </span>
              {reason}
            </div>
          </div>
        )}

        {/* 14-Day Free Trial Banner Experiment */}
        {currentPlanId === 'free' && !isTrialing && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-4.5 border border-emerald-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Special Experiment: 14-Day Professional Trial
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">
                Test All Professional Features Free
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Instant activation. No debit card required. Reverts to Free plan automatically if you don't upgrade.
              </p>
            </div>
            <Button
              variant="emerald"
              size="md"
              onClick={handleStartTrial}
              isLoading={isProcessing}
              leftIcon={<Clock className="w-4 h-4" />}
              className="shrink-0 font-bold"
            >
              Start 14-Day Free Trial
            </Button>
          </div>
        )}

        {/* Step 1: Select Plan & Interval */}
        {step === 'select' ? (
          <div className="space-y-4">
            {/* Interval Toggle */}
            <div className="flex items-center justify-center">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    billingInterval === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('6months')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    billingInterval === '6months'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>6 Months</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    billingInterval === '6months' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Save 10%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval('annual')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    billingInterval === 'annual'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Annual</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    billingInterval === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUBSCRIPTION_PLANS.filter(p => p.id !== 'free').map(plan => {
                const isSelected = selectedPlanId === plan.id;
                const priceMinor = getPlanPriceMinor(plan, billingInterval);
                const effectiveMonthly = getEffectiveMonthlyPriceMinor(plan, billingInterval);
                const discount = getDiscountPercent(plan, billingInterval);

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-2xl p-5 border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {plan.name}
                      </span>
                      {plan.isPopular && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-slate-900">
                        {formatNaira(priceMinor)}
                      </span>
                      <span className="text-xs text-slate-500">
                        /{billingInterval === 'annual' ? 'year' : billingInterval === '6months' ? '6 months' : 'month'}
                      </span>
                    </div>

                    {discount > 0 && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        ₦{formatNaira(effectiveMonthly, false)}/mo effective • {discount}% {billingInterval === '6months' ? 'semi-annual' : 'annual'} discount
                      </p>
                    )}

                    <p className="text-xs text-slate-500 mt-2 min-h-8">
                      {plan.tagline}
                    </p>

                    <ul className="mt-4 space-y-2 text-xs text-slate-700 border-t border-slate-100 pt-3">
                      {plan.features.slice(0, 5).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Cancel anytime. Unused time remains active until period end.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Keep Free Plan
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setStep('checkout')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Checkout Confirmation */
          <div className="space-y-5 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                <span>
                  {selectedPlan.name} Plan (
                  {billingInterval === 'annual' 
                    ? 'Annual' 
                    : billingInterval === '6months' 
                    ? '6 Months' 
                    : 'Monthly'}
                  )
                </span>
                <span className="font-mono text-emerald-600">
                  {formatNaira(getPlanPriceMinor(selectedPlan, billingInterval))}
                </span>
              </div>
              <p className="text-slate-500">
                Billing interval:{' '}
                {billingInterval === 'annual'
                  ? '12 Months (Renews annually)'
                  : billingInterval === '6months'
                  ? '6 Months (Renews semi-annually)'
                  : '1 Month (Renews monthly)'}.
              </p>
              {discountPercent > 0 && (
                <p className="text-emerald-700 font-semibold">
                  You saved {discountPercent}% compared to monthly billing!
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Nigerian Settlement Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  onClick={() => setPaymentMethod('paystack')}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                    paymentMethod === 'paystack'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>Paystack Gateway</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Card / USSD / Bank</span>
                </div>

                <div
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Building2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>NIBSS Direct NIP</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Instant Transfer</span>
                </div>

                <div
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                    paymentMethod === 'card'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>Debit Card</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Verve / Mastercard / Visa</span>
                </div>
              </div>
            </div>

            {/* Nigerian Tax & Cancellation Policy */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600 text-[11px]">
              <p className="font-semibold text-slate-800">Clear Cancellation & Renewal Terms:</p>
              <p>• Auto-renewal can be disabled at any time in organization settings with 1 click.</p>
              <p>• If cancelled, full access continues uninterrupted through the end of the current billing period.</p>
              <p>• Includes 7-day money-back satisfaction guarantee for Nigerian corporate subscriptions.</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                ← Back to Plans
              </button>
              <Button
                variant="primary"
                onClick={handleConfirmUpgrade}
                isLoading={isProcessing}
              >
                Confirm & Activate {selectedPlan.name}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
