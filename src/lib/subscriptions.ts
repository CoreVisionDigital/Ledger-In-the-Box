import { BusinessSubscription, SubscriptionPlanId, BillingInterval } from '../types';

export interface PlanConfig {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  priceMonthlyMinor: number; // in Kobo
  price6MonthsMinor: number; // in Kobo (with ~10% discount)
  priceAnnualMinor: number;  // in Kobo (with ~20% discount)
  invoicesPerMonthLimit: number; // -1 = unlimited
  customersLimit: number;        // -1 = unlimited
  membersLimit: number;          // -1 = unlimited
  features: string[];
  ctaLabel: string;
}

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Starter',
    tagline: 'Ideal for sole proprietors and new Nigerian ventures testing the waters.',
    badge: 'Free Forever',
    priceMonthlyMinor: 0,
    price6MonthsMinor: 0,
    priceAnnualMinor: 0,
    invoicesPerMonthLimit: 5,
    customersLimit: 10,
    membersLimit: 1, // Owner only
    features: [
      'Up to 5 invoices per month',
      'Up to 10 customer records',
      '1 Team member (Owner)',
      'Standard Nigerian 7.5% VAT calculation',
      'Basic sales & expense tracking',
      'Sequential invoice numbering',
      'WhatsApp & Email invoice text sharing',
    ],
    ctaLabel: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Professional',
    tagline: 'Built for growing businesses requiring unlimited invoices, receipts, and team roles.',
    badge: '14-Day Free Trial',
    isPopular: true,
    priceMonthlyMinor: 1250000,  // ₦12,500/month
    price6MonthsMinor: 6750000,  // ₦67,500 every 6 months (₦11,250/mo effective, saving 10%)
    priceAnnualMinor: 12000000,  // ₦120,000/year (₦10,000/mo effective, saving 20%)
    invoicesPerMonthLimit: -1, // Unlimited
    customersLimit: -1,        // Unlimited
    membersLimit: 5,           // Up to 5 team members
    features: [
      'Unlimited commercial invoices & quotations',
      'Unlimited customers & product catalog',
      'Up to 5 team members (Accountant, Admin, Viewer)',
      'Convert quotations directly to invoices (duplicate lock)',
      'Official payment receipts with NIBSS/POS reference',
      'High-resolution PDF generation with CAC & TIN',
      'Operating expenses with generator diesel & payroll tags',
      'Financial statements (P&L, Cash Movement, CSV export)',
      'Priority phone & WhatsApp support (Lagos / Abuja hours)',
    ],
    ctaLabel: 'Start 14-Day Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Scale & Enterprise',
    tagline: 'For established corporations managing high transaction volumes and multiple branches.',
    badge: 'Full Compliance',
    priceMonthlyMinor: 3500000,  // ₦35,000/month
    price6MonthsMinor: 18900000, // ₦189,000 every 6 months (₦31,500/mo effective, saving 10%)
    priceAnnualMinor: 33600000,  // ₦336,000/year (₦28,000/mo effective, saving 20%)
    invoicesPerMonthLimit: -1, // Unlimited
    customersLimit: -1,        // Unlimited
    membersLimit: -1,          // Unlimited
    features: [
      'Everything in Professional',
      'Unlimited team members & custom role policies',
      'Multi-business organization management',
      'Full append-only audit trail export for external auditors',
      'Custom Withholding Tax (WHT) rates & exemptions',
      'Custom invoice prefixes & multi-branch numbering',
      'Dedicated Nigerian accountant onboarding session',
      '99.9% SLA & custom contract billing terms',
    ],
    ctaLabel: 'Upgrade to Enterprise',
  },
];

/**
 * Calculates discount percentage for annual billing (typically 20%)
 */
export function getAnnualDiscountPercent(plan: PlanConfig): number {
  if (plan.priceMonthlyMinor <= 0) return 0;
  const fullYearMonthlyCost = plan.priceMonthlyMinor * 12;
  const savings = fullYearMonthlyCost - plan.priceAnnualMinor;
  return Math.round((savings / fullYearMonthlyCost) * 100);
}

/**
 * Calculates discount percentage for 6-month billing (typically 10%)
 */
export function get6MonthsDiscountPercent(plan: PlanConfig): number {
  if (plan.priceMonthlyMinor <= 0) return 0;
  const halfYearMonthlyCost = plan.priceMonthlyMinor * 6;
  const savings = halfYearMonthlyCost - plan.price6MonthsMinor;
  return Math.round((savings / halfYearMonthlyCost) * 100);
}

/**
 * Calculates discount percentage based on billing interval
 */
export function getDiscountPercent(plan: PlanConfig, interval: BillingInterval): number {
  if (interval === 'annual') return getAnnualDiscountPercent(plan);
  if (interval === '6months') return get6MonthsDiscountPercent(plan);
  return 0;
}

/**
 * Resolves the minor price for a given plan and interval
 */
export function getPlanPriceMinor(plan: PlanConfig, interval: BillingInterval): number {
  if (interval === 'annual') return plan.priceAnnualMinor;
  if (interval === '6months') return plan.price6MonthsMinor;
  return plan.priceMonthlyMinor;
}

/**
 * Resolves the effective monthly minor price for display
 */
export function getEffectiveMonthlyPriceMinor(plan: PlanConfig, interval: BillingInterval): number {
  if (interval === 'annual') return plan.priceAnnualMinor > 0 ? Math.round(plan.priceAnnualMinor / 12) : 0;
  if (interval === '6months') return plan.price6MonthsMinor > 0 ? Math.round(plan.price6MonthsMinor / 6) : 0;
  return plan.priceMonthlyMinor;
}

/**
 * Checks remaining days on a 14-day trial
 */
export function getTrialDaysRemaining(subscription?: BusinessSubscription): number {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trialEndDate) {
    return 0;
  }
  const end = new Date(subscription.trialEndDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Returns effective plan configuration (accounting for active trial of Pro)
 */
export function getEffectivePlan(subscription?: BusinessSubscription): PlanConfig {
  if (!subscription) return SUBSCRIPTION_PLANS[0];

  if (subscription.status === 'trialing') {
    const daysLeft = getTrialDaysRemaining(subscription);
    if (daysLeft > 0) {
      return SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId) || SUBSCRIPTION_PLANS[1];
    }
    // Trial expired -> defaults back to Free
    return SUBSCRIPTION_PLANS[0];
  }

  if (subscription.status === 'active') {
    return SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId) || SUBSCRIPTION_PLANS[0];
  }

  return SUBSCRIPTION_PLANS[0];
}

/**
 * Check invoice quota
 */
export function checkInvoiceQuota(
  subscription: BusinessSubscription | undefined,
  invoicesThisMonthCount: number
): {
  allowed: boolean;
  remaining: number;
  max: number;
  isUnlimited: boolean;
  percentUsed: number;
} {
  const plan = getEffectivePlan(subscription);
  if (plan.invoicesPerMonthLimit === -1) {
    return { allowed: true, remaining: 999999, max: -1, isUnlimited: true, percentUsed: 0 };
  }

  const max = plan.invoicesPerMonthLimit;
  const remaining = Math.max(0, max - invoicesThisMonthCount);
  const percentUsed = Math.min(100, Math.round((invoicesThisMonthCount / max) * 100));

  return {
    allowed: remaining > 0,
    remaining,
    max,
    isUnlimited: false,
    percentUsed,
  };
}

/**
 * Check customer quota
 */
export function checkCustomerQuota(
  subscription: BusinessSubscription | undefined,
  currentCustomerCount: number
): {
  allowed: boolean;
  remaining: number;
  max: number;
  isUnlimited: boolean;
  percentUsed: number;
} {
  const plan = getEffectivePlan(subscription);
  if (plan.customersLimit === -1) {
    return { allowed: true, remaining: 999999, max: -1, isUnlimited: true, percentUsed: 0 };
  }

  const max = plan.customersLimit;
  const remaining = Math.max(0, max - currentCustomerCount);
  const percentUsed = Math.min(100, Math.round((currentCustomerCount / max) * 100));

  return {
    allowed: remaining > 0,
    remaining,
    max,
    isUnlimited: false,
    percentUsed,
  };
}

/**
 * Creates default initial free subscription with trial eligibility
 */
export function createDefaultSubscription(): BusinessSubscription {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    planId: 'free',
    status: 'active',
    billingInterval: 'monthly',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextMonth.toISOString(),
    cancelAtPeriodEnd: false,
    autoRenew: true,
  };
}

/**
 * Starts 14-day trial of Professional tier
 */
export function startProTrial(): BusinessSubscription {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    planId: 'pro',
    status: 'trialing',
    billingInterval: 'monthly',
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: trialEnd.toISOString(),
    cancelAtPeriodEnd: false,
    autoRenew: true,
    paymentMethod: 'card',
  };
}
