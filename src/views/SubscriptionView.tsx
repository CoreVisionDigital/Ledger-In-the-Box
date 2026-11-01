import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { 
  SUBSCRIPTION_PLANS, 
  getEffectivePlan, 
  getTrialDaysRemaining,
  checkInvoiceQuota,
  checkCustomerQuota,
  getAnnualDiscountPercent,
  getDiscountPercent,
  getPlanPriceMinor,
  getEffectiveMonthlyPriceMinor
} from '../../src/lib/subscriptions';
import { formatNaira } from '../lib/money';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { BillingInterval, SubscriptionPlanId } from '../types';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  Zap, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  XCircle,
  HelpCircle,
  Building2
} from 'lucide-react';

export const SubscriptionView: React.FC = () => {
  const { 
    activeBusiness, 
    invoices, 
    customers, 
    members,
    startProTrialSubscription,
    updateSubscription,
    cancelSubscription,
    resumeSubscription,
    openUpgradeModal
  } = useBusiness();

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Pricing / Budget constraints');
  const [isProcessing, setIsProcessing] = useState(false);

  const sub = activeBusiness?.subscription;
  const effectivePlan = getEffectivePlan(sub);
  const isTrialing = sub?.status === 'trialing';
  const trialDaysRemaining = getTrialDaysRemaining(sub);
  const isCancelled = sub?.cancelAtPeriodEnd;

  // Usage stats
  const now = new Date();
  const currentMonthInvoicesCount = invoices.filter(inv => {
    const invDate = new Date(inv.issueDate);
    return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
  }).length;

  const invoiceQuota = checkInvoiceQuota(sub, currentMonthInvoicesCount);
  const customerQuota = checkCustomerQuota(sub, customers.length);

  const handleExecuteCancel = async () => {
    try {
      setIsProcessing(true);
      await cancelSubscription(cancelReason);
      setIsCancelModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* View Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Subscription & Billing Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Transparent plans for Nigerian businesses. 14-day free trials, usage meters, and zero-lockin cancellation policies.
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-950/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {effectivePlan.name} Plan
                </h2>
                {isTrialing ? (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    14-Day Free Trial ({trialDaysRemaining} days left)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                )}
                {isCancelled && (
                  <span className="text-[11px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Cancels at end of cycle
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {sub?.billingInterval === 'annual' 
                  ? 'Billed annually (20% discount applied)' 
                  : sub?.billingInterval === '6months'
                  ? 'Billed every 6 months (10% discount applied)'
                  : 'Billed monthly'}
                {sub?.currentPeriodEnd && ` • Cycle ends ${new Date(sub.currentPeriodEnd).toLocaleDateString('en-NG')}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {effectivePlan.id === 'free' && (
              <Button
                variant="emerald"
                size="md"
                onClick={() => openUpgradeModal('Upgrade for unlimited commercial invoices and team collaboration')}
                leftIcon={<Sparkles className="w-4 h-4 text-emerald-600" />}
                className="font-bold shadow-xs"
              >
                Start 14-Day Pro Trial
              </Button>
            )}

            {isCancelled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={resumeSubscription}
                leftIcon={<RefreshCw className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Resume Auto-Renewal
              </Button>
            ) : effectivePlan.id !== 'free' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs"
              >
                Manage Cancellation
              </Button>
            ) : null}
          </div>
        </div>

        {/* Real-time Usage Meters */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Current Billing Period Usage Meters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Invoices meter */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Monthly Invoices</span>
                <span className="font-mono text-slate-900 font-bold">
                  {currentMonthInvoicesCount} {invoiceQuota.isUnlimited ? '(Unlimited)' : `/ ${invoiceQuota.max}`}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    invoiceQuota.isUnlimited
                      ? 'bg-emerald-500 w-1/4'
                      : invoiceQuota.percentUsed > 80
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: invoiceQuota.isUnlimited ? '100%' : `${invoiceQuota.percentUsed}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {invoiceQuota.isUnlimited ? 'Unlimited on Professional tier' : `${invoiceQuota.remaining} invoices left before quota`}
              </p>
            </div>

            {/* Customers meter */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Customer Records</span>
                <span className="font-mono text-slate-900 font-bold">
                  {customers.length} {customerQuota.isUnlimited ? '(Unlimited)' : `/ ${customerQuota.max}`}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: customerQuota.isUnlimited ? '100%' : `${customerQuota.percentUsed}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {customerQuota.isUnlimited ? 'Unlimited customer CRM records' : `${customerQuota.remaining} customer slots remaining`}
              </p>
            </div>

            {/* Team Members */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Team Members</span>
                <span className="font-mono text-slate-900 font-bold">
                  {members.length + 1} {effectivePlan.membersLimit === -1 ? '(Unlimited)' : `/ ${effectivePlan.membersLimit}`}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: effectivePlan.membersLimit === -1 ? '100%' : `${((members.length + 1) / effectivePlan.membersLimit) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {effectivePlan.id === 'free' ? 'Single user. Upgrade for Accountant role' : 'Multi-role RBAC enabled'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison & Pricing Strategy */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Available Subscription Plans</h2>
            <p className="text-xs text-slate-500">Pick a plan tailored to your business scale. Switch or cancel anytime.</p>
          </div>

          {/* Monthly / 6-Month / Annual Toggle with clear Nigerian B2B discounts */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
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
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
              className={`px-3 sm:px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map(plan => {
            const isCurrent = effectivePlan.id === plan.id;
            const priceMinor = getPlanPriceMinor(plan, billingInterval);
            const effectiveMonthly = getEffectiveMonthlyPriceMinor(plan, billingInterval);
            const discountPercent = getDiscountPercent(plan, billingInterval);

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 border-2 flex flex-col justify-between transition-all bg-white ${
                  plan.isPopular
                    ? 'border-emerald-600 shadow-lg shadow-emerald-950/5 relative ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        plan.isPopular 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight">
                      {formatNaira(priceMinor)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      /{billingInterval === 'annual' ? 'year' : billingInterval === '6months' ? '6 months' : 'month'}
                    </span>
                  </div>

                  {discountPercent > 0 && plan.priceMonthlyMinor > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      ₦{formatNaira(effectiveMonthly, false)}/month effective ({discountPercent}% {billingInterval === '6months' ? 'semi-annual' : 'annual'} discount)
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                    {plan.tagline}
                  </p>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-4">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full text-slate-500 cursor-default" disabled>
                      Current Plan
                    </Button>
                  ) : plan.id === 'pro' && !isTrialing && effectivePlan.id === 'free' ? (
                    <Button
                      variant="primary"
                      className="w-full font-bold shadow-xs"
                      onClick={startProTrialSubscription}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      Start 14-Day Free Trial
                    </Button>
                  ) : (
                    <Button
                      variant={plan.isPopular ? 'primary' : 'outline'}
                      className="w-full font-bold"
                      onClick={() => openUpgradeModal(`Upgrade to ${plan.name} (${billingInterval})`)}
                    >
                      {plan.ctaLabel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear Cancellation & Renewal Policies Notice */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Clear Cancellation & Subscription Renewal Policies
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <h4 className="font-bold text-white mb-1">1. Cancellation with Access Retained</h4>
            <p className="leading-relaxed">
              When you cancel, your account remains active with full access to all features until the end of your prepaid period. No sudden lockouts.
            </p>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <h4 className="font-bold text-white mb-1">2. Transparent Auto-Renewal</h4>
            <p className="leading-relaxed">
              Subscriptions renew automatically on the billing date. You receive an email reminder 3 days prior. Auto-renewal can be toggled off at any moment.
            </p>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <h4 className="font-bold text-white mb-1">3. 7-Day Money-Back Guarantee</h4>
            <p className="leading-relaxed">
              If BizLedger does not suit your business workflow within 7 days of your first payment, contact support for a prompt refund.
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Survey & Confirmation Modal */}
      {isCancelModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel Subscription Auto-Renewal"
          description="We're sorry to see you consider leaving. Please confirm your decision below."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
              <strong>Your access will remain active:</strong> You can continue using your Professional plan features until{' '}
              <strong>{sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-NG') : 'the end of your cycle'}</strong>.
              After that date, your account will smoothly revert to the Free Starter plan.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Please tell us the primary reason for cancelling:
              </label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800"
              >
                <option value="Pricing / Budget constraints">Pricing / Budget constraints</option>
                <option value="Too many features / Don't need all tools">Too many features / Don't need all tools</option>
                <option value="Temporary pause in business operations">Temporary pause in business operations</option>
                <option value="Switching to another accounting package">Switching to another accounting package</option>
                <option value="Other feedback">Other feedback</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Keep Subscription
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleExecuteCancel}
                isLoading={isProcessing}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
