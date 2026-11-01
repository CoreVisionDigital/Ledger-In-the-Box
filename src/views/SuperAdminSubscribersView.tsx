import React, { useState, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Business, SubscriptionPlanId, SubscriptionStatus, BillingInterval, SUPER_ADMIN_EMAIL } from '../types';
import { SUBSCRIPTION_PLANS, getPlanPriceMinor, getEffectiveMonthlyPriceMinor, getTrialDaysRemaining } from '../lib/subscriptions';
import { formatKoboToNaira } from '../lib/money';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ManageSubscriberModal } from '../components/admin/ManageSubscriberModal';
import { CreateSubscriberModal } from '../components/admin/CreateSubscriberModal';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  Calendar,
  Sparkles,
  CreditCard,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Crown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface SuperAdminSubscribersViewProps {
  onSwitchToDashboard?: () => void;
}

export const SuperAdminSubscribersView: React.FC<SuperAdminSubscribersViewProps> = ({
  onSwitchToDashboard,
}) => {
  const { user } = useAuth();
  const {
    allSubscribers,
    updateSubscriberSubscription,
    extendSubscriberTrial,
    createSubscriberBusiness,
    switchBusiness,
    refreshSubscribers,
    seedNigerianBusinessData,
  } = useBusiness();
  const { success, info } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedIntervalFilter, setSelectedIntervalFilter] = useState<string>('all');

  // Modals state
  const [selectedSubscriberToManage, setSelectedSubscriberToManage] = useState<Business | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Compute Platform MRR, ARR, and subscriber statistics
  const metrics = useMemo(() => {
    let totalSubscribers = allSubscribers.length;
    let activePaidCount = 0;
    let trialingCount = 0;
    let pastDueCount = 0;
    let totalMonthlyRevenueMinor = 0;

    allSubscribers.forEach(biz => {
      const sub = biz.subscription;
      if (!sub) return;

      if (sub.status === 'trialing') {
        trialingCount++;
      } else if (sub.status === 'past_due') {
        pastDueCount++;
      }

      if (sub.status === 'active' && sub.planId !== 'free') {
        activePaidCount++;
        const planConfig = SUBSCRIPTION_PLANS.find(p => p.id === sub.planId);
        if (planConfig) {
          totalMonthlyRevenueMinor += getEffectiveMonthlyPriceMinor(planConfig, sub.billingInterval);
        }
      }
    });

    const totalAnnualRevenueMinor = totalMonthlyRevenueMinor * 12;

    return {
      totalSubscribers,
      activePaidCount,
      trialingCount,
      pastDueCount,
      totalMonthlyRevenueMinor,
      totalAnnualRevenueMinor,
      paidConversionRate: totalSubscribers > 0 ? Math.round((activePaidCount / totalSubscribers) * 100) : 0,
    };
  }, [allSubscribers]);

  // Filtered subscribers list
  const filteredSubscribers = useMemo(() => {
    return allSubscribers.filter(biz => {
      const sub = biz.subscription;

      // Plan filter
      if (selectedPlanFilter !== 'all') {
        if (!sub || sub.planId !== selectedPlanFilter) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (!sub || sub.status !== selectedStatusFilter) return false;
      }

      // Interval filter
      if (selectedIntervalFilter !== 'all') {
        if (!sub || sub.billingInterval !== selectedIntervalFilter) return false;
      }

      // Search query (Business name, RC, Email, State)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = biz.name.toLowerCase().includes(query);
        const matchRc = (biz.rcNumber || '').toLowerCase().includes(query);
        const matchEmail = (biz.email || '').toLowerCase().includes(query);
        const matchState = (biz.state || '').toLowerCase().includes(query);
        if (!matchName && !matchRc && !matchEmail && !matchState) return false;
      }

      return true;
    });
  }, [allSubscribers, selectedPlanFilter, selectedStatusFilter, selectedIntervalFilter, searchQuery]);

  // CSV Export for Subscribers
  const handleExportCsv = () => {
    if (filteredSubscribers.length === 0) {
      info('No Subscribers', 'No subscribers match current filters to export.');
      return;
    }

    const headers = [
      'Business Name',
      'RC / CAC Number',
      'Account Owner Email',
      'State',
      'Subscription Plan',
      'Billing Interval',
      'Status',
      'Effective Monthly Price (NGN)',
      'Current Period End',
      'Payment Method',
      'Assigned by Super Admin',
      'Created At'
    ];

    const rows = filteredSubscribers.map(biz => {
      const sub = biz.subscription;
      const plan = sub ? SUBSCRIPTION_PLANS.find(p => p.id === sub.planId) : null;
      const mrrMinor = plan && sub ? getEffectiveMonthlyPriceMinor(plan, sub.billingInterval) : 0;
      return [
        `"${biz.name.replace(/"/g, '""')}"`,
        `"${biz.rcNumber || 'Pending'}"`,
        `"${biz.email}"`,
        `"${biz.state}"`,
        `"${sub?.planId.toUpperCase() || 'FREE'}"`,
        `"${sub?.billingInterval || 'monthly'}"`,
        `"${sub?.status || 'active'}"`,
        (mrrMinor / 100).toFixed(2),
        `"${sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-NG') : 'N/A'}"`,
        `"${sub?.paymentMethod || 'standard'}"`,
        `"${sub?.assignedBySuperAdmin ? 'YES' : 'NO'}"`,
        `"${new Date(biz.createdAt).toLocaleDateString('en-NG')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BizLedger_Subscribers_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    success('Export Completed', 'Subscribers list exported as CSV.');
  };

  const handleOpenManage = (subscriber: Business) => {
    setSelectedSubscriberToManage(subscriber);
    setIsManageModalOpen(true);
  };

  const handleSwitchAndInspect = (subscriber: Business) => {
    switchBusiness(subscriber.id);
    if (onSwitchToDashboard) {
      onSwitchToDashboard();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Account Owner Authority Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Super Admin & Account Owner
              </span>
              <span className="text-xs text-slate-300 font-mono bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                {SUPER_ADMIN_EMAIL}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Subscribers Management Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Full administrative governance over all registered tenant businesses, recurring billing cycles (Monthly, 6 Months with 10% discount, Annual with 20% discount), 14-day trial extensions, and quota overrides.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshSubscribers()}
              leftIcon={<RefreshCw className="w-4 h-4 text-emerald-400" />}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-800 text-xs font-semibold"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4 text-emerald-400" />}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-800 text-xs font-semibold"
            >
              Export CSV
            </Button>
            <Button
              variant="emerald"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="text-xs font-bold shadow-lg shadow-emerald-950/50"
            >
              Register Subscriber
            </Button>
          </div>
        </div>
      </div>

      {/* Platform Revenue & Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subscribers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tenants</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {metrics.totalSubscribers}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="font-semibold text-emerald-600">{metrics.activePaidCount} paid</span>
              <span>•</span>
              <span>{metrics.paidConversionRate}% conversion</span>
            </div>
          </div>
        </div>

        {/* Monthly Recurring Revenue (MRR) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Platform MRR</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800 tracking-tight">
              {formatKoboToNaira(metrics.totalMonthlyRevenueMinor)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Monthly Recurring in Naira
            </div>
          </div>
        </div>

        {/* Estimated Annual ARR */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Projected ARR</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatKoboToNaira(metrics.totalAnnualRevenueMinor)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Annualized run-rate (inc. 6m/yr plans)
            </div>
          </div>
        </div>

        {/* Active Trials & Attention */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Pro Trials</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900 tracking-tight">
              {metrics.trialingCount}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>{metrics.pastDueCount} past due</span>
              <span>•</span>
              <span className="text-amber-700 font-semibold">14-day pipeline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by business name, RC number, owner email, or state..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftAddon={<Search className="w-4 h-4 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Plan filter */}
            <select
              value={selectedPlanFilter}
              onChange={e => setSelectedPlanFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Plans</option>
              <option value="free">Starter (Free)</option>
              <option value="pro">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>

            {/* Status filter */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing (14-Day)</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Interval filter */}
            <select
              value={selectedIntervalFilter}
              onChange={e => setSelectedIntervalFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Intervals</option>
              <option value="monthly">Monthly</option>
              <option value="6months">6 Months (10% off)</option>
              <option value="annual">Annual (20% off)</option>
            </select>

            {(searchQuery || selectedPlanFilter !== 'all' || selectedStatusFilter !== 'all' || selectedIntervalFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPlanFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedIntervalFilter('all');
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-900">{filteredSubscribers.length}</strong> of{' '}
            <strong className="text-slate-900">{allSubscribers.length}</strong> registered Nigerian subscribers
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold">
            Super Admin Access: Unrestricted Cross-Tenant Management
          </span>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Business & CAC</th>
                <th className="py-3.5 px-4">Owner Email</th>
                <th className="py-3.5 px-4">Plan & Term</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Monthly Value</th>
                <th className="py-3.5 px-4">Next Renewal / Expiry</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No subscribers found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or register a new subscriber.</p>
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map(biz => {
                  const sub = biz.subscription;
                  const plan = sub ? SUBSCRIPTION_PLANS.find(p => p.id === sub.planId) : null;
                  const mrrMinor = plan && sub ? getEffectiveMonthlyPriceMinor(plan, sub.billingInterval) : 0;
                  const daysRemaining = getTrialDaysRemaining(sub);
                  const isOwnerAccount = biz.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

                  return (
                    <tr key={biz.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Business & CAC */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isOwnerAccount
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {isOwnerAccount ? <Crown className="w-4 h-4 text-amber-600" /> : <Building2 className="w-4 h-4 text-slate-500" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {biz.name}
                              {isOwnerAccount && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-black border border-amber-300">
                                  Owner Hub
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{biz.rcNumber || 'Pending RC'}</span>
                              <span>•</span>
                              <span>{biz.state}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Email */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-700 text-xs font-semibold">
                          {biz.email}
                        </span>
                        {biz.phone && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {biz.phone}
                          </span>
                        )}
                      </td>

                      {/* Plan & Term */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            sub?.planId === 'enterprise'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : sub?.planId === 'pro'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {sub?.planId.toUpperCase() || 'FREE'}
                          </span>
                          {sub?.planId !== 'free' && (
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">
                              {sub?.billingInterval === '6months' ? '6 Months' : sub?.billingInterval}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {sub?.status === 'trialing' ? (
                          <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 w-fit">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span className="font-bold text-[11px]">
                              Trial ({daysRemaining}d left)
                            </span>
                          </div>
                        ) : sub?.status === 'active' ? (
                          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold text-[11px]">Active</span>
                          </div>
                        ) : sub?.status === 'past_due' ? (
                          <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50 px-2 py-1 rounded-md border border-rose-200 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span className="font-bold text-[11px]">Past Due</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 w-fit">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-[11px]">Cancelled</span>
                          </div>
                        )}
                      </td>

                      {/* Monthly Value */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {mrrMinor > 0 ? formatKoboToNaira(mrrMinor) : '₦0.00'}
                        {sub?.billingInterval === 'annual' && (
                          <span className="block text-[10px] text-emerald-600 font-semibold font-sans">
                            -20% billed yearly
                          </span>
                        )}
                        {sub?.billingInterval === '6months' && (
                          <span className="block text-[10px] text-emerald-600 font-semibold font-sans">
                            -10% billed 6-monthly
                          </span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {sub?.currentPeriodEnd ? (
                          <div>
                            <span className="font-medium">
                              {new Date(sub.currentPeriodEnd).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {sub.autoRenew && (
                              <span className="block text-[10px] text-slate-400">
                                Auto-renew: Yes
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenManage(biz)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Modify plan, extend trial, or change billing"
                          >
                            Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchAndInspect(biz)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Switch into this tenant to inspect books"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ManageSubscriberModal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setSelectedSubscriberToManage(null);
        }}
        subscriber={selectedSubscriberToManage}
        onSave={updateSubscriberSubscription}
        onExtendTrial={extendSubscriberTrial}
      />

      <CreateSubscriberModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createSubscriberBusiness}
      />
    </div>
  );
};
