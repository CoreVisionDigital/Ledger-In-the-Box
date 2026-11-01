import React from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { getTrialDaysRemaining, checkInvoiceQuota, getEffectivePlan } from '../../lib/subscriptions';
import { Button } from '../common/Button';
import { Clock, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export const SubscriptionStatusBanner: React.FC = () => {
  const { activeBusiness, invoices, openUpgradeModal, resumeSubscription } = useBusiness();

  if (!activeBusiness) return null;

  const sub = activeBusiness.subscription;
  const isTrialing = sub?.status === 'trialing';
  const trialDays = getTrialDaysRemaining(sub);
  const isCancelled = sub?.cancelAtPeriodEnd;

  // Invoice quota calculation for free plan
  const now = new Date();
  const currentMonthInvoicesCount = invoices.filter(inv => {
    const invDate = new Date(inv.issueDate);
    return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
  }).length;

  const quota = checkInvoiceQuota(sub, currentMonthInvoicesCount);

  // 1. Trialing Banner
  if (isTrialing && trialDays > 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-4 py-2.5 rounded-2xl border border-emerald-500/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-white">Professional 14-Day Free Trial: </span>
            <span className="text-emerald-300 font-semibold">{trialDays} {trialDays === 1 ? 'day' : 'days'} remaining</span>
            <span className="text-slate-300 hidden md:inline"> • Full access to unlimited invoices, receipts, and reports</span>
          </div>
        </div>

        <Button
          variant="emerald"
          size="sm"
          onClick={() => openUpgradeModal('Lock in your 20% annual discount before the 14-day trial ends')}
          className="text-xs py-1 px-3 shrink-0"
        >
          Keep Pro (Save 20%)
        </Button>
      </div>
    );
  }

  // 2. Cancellation pending banner
  if (isCancelled && sub?.currentPeriodEnd) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Subscription cancellation scheduled. You retain full access until{' '}
            <strong>{new Date(sub.currentPeriodEnd).toLocaleDateString('en-NG')}</strong>.
          </span>
        </div>

        <button
          onClick={resumeSubscription}
          className="font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Resume Auto-Renewal</span>
        </button>
      </div>
    );
  }

  // 3. Free Plan Approaching Quota Prompt
  if (!quota.isUnlimited && quota.percentUsed >= 60) {
    return (
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span>
              Free Starter Plan: <strong>{currentMonthInvoicesCount} of {quota.max} invoices</strong> used this month ({quota.remaining} remaining).
            </span>
          </div>
        </div>

        <Button
          variant="emerald"
          size="sm"
          onClick={() => openUpgradeModal('You are approaching your 5-invoice monthly limit on the Free plan.')}
          className="text-xs py-1 px-3 shrink-0"
        >
          Start 14-Day Pro Trial
        </Button>
      </div>
    );
  }

  return null;
};
