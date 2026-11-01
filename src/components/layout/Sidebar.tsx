import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  CreditCard, 
  DollarSign, 
  Users, 
  Package, 
  BarChart3, 
  History, 
  Settings, 
  ShieldCheck,
  Building2,
  ChevronDown,
  Zap,
  Crown
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { SUPER_ADMIN_EMAIL } from '../../types';

export type NavItemKey =
  | 'dashboard'
  | 'subscribers'
  | 'invoices'
  | 'quotations'
  | 'payments'
  | 'receipts'
  | 'expenses'
  | 'customers'
  | 'products'
  | 'reports'
  | 'audit_logs'
  | 'subscription'
  | 'settings'
  | 'tests';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenBusinessModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenBusinessModal,
}) => {
  const { activeBusiness, allBusinesses, switchBusiness, isSuperAdmin } = useBusiness();

  const sub = activeBusiness?.subscription;
  const isTrial = sub?.status === 'trialing';

  const navItems = [
    { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'subscribers' as NavItemKey, label: 'Subscribers Portal', icon: Crown, badge: 'Super Admin', isSuperAdminItem: true },
    { key: 'invoices' as NavItemKey, label: 'Invoices', icon: FileText },
    { key: 'quotations' as NavItemKey, label: 'Quotations & Quotes', icon: FileText },
    { key: 'payments' as NavItemKey, label: 'Payments', icon: CreditCard },
    { key: 'receipts' as NavItemKey, label: 'Receipts', icon: Receipt },
    { key: 'expenses' as NavItemKey, label: 'Expenses', icon: DollarSign },
    { key: 'customers' as NavItemKey, label: 'Customers', icon: Users },
    { key: 'products' as NavItemKey, label: 'Products & Services', icon: Package },
    { key: 'reports' as NavItemKey, label: 'Financial Reports', icon: BarChart3 },
    { key: 'subscription' as NavItemKey, label: 'Plans & Billing', icon: Zap, badge: isTrial ? '14d Trial' : (sub?.planId === 'pro' ? 'Pro' : (sub?.planId === 'enterprise' ? 'Enterprise' : 'Free')) },
    { key: 'audit_logs' as NavItemKey, label: 'Audit Trail', icon: History },
    { key: 'tests' as NavItemKey, label: 'Security & QA Tests', icon: ShieldCheck, badge: 'Automated' },
    { key: 'settings' as NavItemKey, label: 'Business Profile', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-68 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-xl lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md font-extrabold text-lg tracking-wider">
              BL
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                BizLedger
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  NGN
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Financial SaaS</p>
            </div>
          </div>
        </div>

        {/* Business Selector Pill */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-950/20">
          <div className="bg-slate-800/80 hover:bg-slate-800 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <select
                  value={activeBusiness?.id || ''}
                  onChange={e => switchBusiness(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white truncate w-full focus:outline-none cursor-pointer appearance-none"
                >
                  {allBusinesses.map(b => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <span>CAC: {activeBusiness?.rcNumber || 'Pending'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onOpenBusinessModal}
              title="Add or Manage Businesses"
              className="p-1 hover:text-white text-slate-400 rounded-md transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => {
            const isActive = currentTab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectTab(item.key);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/40 font-bold'
                    : item.isSuperAdminItem
                    ? 'text-amber-300 hover:text-white hover:bg-amber-950/40 bg-amber-950/20 border border-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isSuperAdminItem ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    item.isSuperAdminItem
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Account Owner & Compliance Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-2">
          {isSuperAdmin && (
            <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300">
              <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-amber-400">
                <Crown className="w-3 h-3 text-amber-400" />
                Account Owner
              </div>
              <div className="text-[10px] text-slate-300 font-mono truncate mt-0.5">
                {SUPER_ADMIN_EMAIL}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-300">Strict Minor Units</span>
            <span className="text-emerald-400 font-mono font-bold">100 Kobo = ₦1</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">FIRS 7.5% VAT & WHT compliant</p>
        </div>
      </aside>
    </>
  );
};
