import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Business, SubscriptionPlanId, SubscriptionStatus, BillingInterval, SUPER_ADMIN_EMAIL } from '../../types';
import { SUBSCRIPTION_PLANS, getPlanPriceMinor, getDiscountPercent } from '../../lib/subscriptions';
import { formatKoboToNaira } from '../../lib/money';
import { ShieldCheck, Calendar, Clock, AlertCircle, Building2, Check, Sparkles } from 'lucide-react';

interface ManageSubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Business | null;
  onSave: (
    businessId: string,
    planId: SubscriptionPlanId,
    interval: BillingInterval,
    status: SubscriptionStatus,
    trialEndDate?: string,
    reason?: string
  ) => Promise<void>;
  onExtendTrial: (businessId: string, days: number) => Promise<void>;
}

export const ManageSubscriberModal: React.FC<ManageSubscriberModalProps> = ({
  isOpen,
  onClose,
  subscriber,
  onSave,
  onExtendTrial,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('pro');
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>('active');
  const [customTrialDate, setCustomTrialDate] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (subscriber?.subscription) {
      setSelectedPlanId(subscriber.subscription.planId);
      setSelectedInterval(subscriber.subscription.billingInterval);
      setSelectedStatus(subscriber.subscription.status);
      if (subscriber.subscription.trialEndDate) {
        setCustomTrialDate(subscriber.subscription.trialEndDate.substring(0, 10));
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setCustomTrialDate(d.toISOString().substring(0, 10));
      }
      setOverrideReason('');
    }
  }, [subscriber]);

  if (!subscriber) return null;

  const currentPlanConfig = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[1];
  const priceMinor = getPlanPriceMinor(currentPlanConfig, selectedInterval);
  const discountPercent = getDiscountPercent(currentPlanConfig, selectedInterval);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const trialEndDateIso = selectedStatus === 'trialing' && customTrialDate
        ? new Date(customTrialDate).toISOString()
        : undefined;

      await onSave(
        subscriber.id,
        selectedPlanId,
        selectedInterval,
        selectedStatus,
        trialEndDateIso,
        overrideReason.trim() || `Super Admin (${SUPER_ADMIN_EMAIL}) manual subscription update`
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickTrialExtension = async (days: number) => {
    setIsSaving(true);
    try {
      await onExtendTrial(subscriber.id, days);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Super Admin: Manage Subscriber Account"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Summary Header */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                {subscriber.name}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {subscriber.rcNumber || 'RC-Pending'}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Owner Email: <span className="text-emerald-400 font-mono">{subscriber.email}</span> • State: {subscriber.state}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-400 block">Current Status</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {subscriber.subscription?.planId.toUpperCase()} • {subscriber.subscription?.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tier Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Subscription Tier Plan
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SUBSCRIPTION_PLANS.map(plan => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{plan.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {plan.tagline}
                  </p>
                  <div className="mt-2 text-xs font-bold text-slate-800">
                    {plan.priceMonthlyMinor === 0 ? 'Free' : `${formatKoboToNaira(plan.priceMonthlyMinor)}/mo`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing Interval & Discount Selector */}
        {selectedPlanId !== 'free' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Billing Interval & Term
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedInterval('monthly')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedInterval === 'monthly'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setSelectedInterval('6months')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  selectedInterval === '6months'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>6 Months</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-black">
                  -10%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInterval('annual')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  selectedInterval === 'annual'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-black">
                  -20%
                </span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Billed Amount:</span>
              <strong className="text-slate-900">{formatKoboToNaira(priceMinor)}</strong>
              {discountPercent > 0 && (
                <span className="text-emerald-700 font-semibold">({discountPercent}% Nigerian enterprise discount)</span>
              )}
            </p>
          </div>
        )}

        {/* Subscription Status & Trial Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Account Status
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as SubscriptionStatus)}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Active (Good Standing)</option>
              <option value="trialing">Trialing (14-Day Pro Experiment)</option>
              <option value="past_due">Past Due (Payment Failed / Overdue)</option>
              <option value="cancelled">Cancelled (Access Stopped)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Trial / Expiry End Date
            </label>
            <Input
              type="date"
              value={customTrialDate}
              onChange={e => setCustomTrialDate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Quick Trial Extension Shortcuts for Super Admin */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Quick Super Admin Trial Extensions:
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            Extend this subscriber's trial immediately without interrupting their team's access:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleQuickTrialExtension(7)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              +7 Days Trial
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleQuickTrialExtension(14)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
            >
              +14 Days (Full Cycle)
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleQuickTrialExtension(30)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              +30 Days Courtesy
            </button>
          </div>
        </div>

        {/* Reason / Administrative Note */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Audit Reason for Plan Modification (Account Owner Log)
          </label>
          <Input
            placeholder="e.g. Granted courtesy 6-months Pro upgrade after Lagos onboarding call"
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
            className="text-xs"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            This action will be permanently recorded in the BizLedger audit trail by <span className="font-semibold text-slate-700">{SUPER_ADMIN_EMAIL}</span>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="emerald"
            isLoading={isSaving}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Save Subscriber Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
