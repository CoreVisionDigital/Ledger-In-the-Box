import React from 'react';
import { 
  Menu, 
  Plus, 
  LogOut, 
  Sparkles,
  Database,
  Building2,
  FileText,
  DollarSign,
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { Button } from '../common/Button';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNewInvoice: () => void;
  onNewPayment: () => void;
  onNewExpense: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNewInvoice,
  onNewPayment,
  onNewExpense,
}) => {
  const { user, logout } = useAuth();
  const { activeBusiness, seedNigerianBusinessData, openUpgradeModal, isSuperAdmin } = useBusiness();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              {activeBusiness?.name || 'BizLedger'}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Database className="w-3 h-3" /> Firestore Multi-Tenant
              </span>
              <span>•</span>
              <span>NGN (₦)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subscription Plan Quick Status */}
        {activeBusiness?.subscription?.status === 'trialing' ? (
          <button
            onClick={() => openUpgradeModal('Review Pro Annual discount before trial expires')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>14d Trial Active</span>
          </button>
        ) : (!activeBusiness?.subscription || activeBusiness?.subscription?.planId === 'free') ? (
          <button
            onClick={() => openUpgradeModal('Start your 14-day free trial of Professional tier')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Try Pro Free (14 Days)</span>
          </button>
        ) : null}

        {/* Seed Nigerian Data Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => seedNigerianBusinessData()}
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          className="hidden md:inline-flex text-xs font-semibold"
          title="Seed realistic Nigerian customers, invoices, diesel & payroll expenses"
        >
          Load Nigerian Sample
        </Button>

        {/* Quick Actions Dropdown / Direct Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="emerald"
            size="sm"
            onClick={onNewInvoice}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs font-semibold"
          >
            Invoice
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onNewExpense}
            leftIcon={<DollarSign className="w-3.5 h-3.5 text-rose-500" />}
            className="hidden sm:inline-flex text-xs font-semibold"
          >
            Expense
          </Button>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Super Admin (Owner)</span>
            </div>
          )}

          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-slate-900 leading-none flex items-center justify-end gap-1">
              {isSuperAdmin && <Crown className="w-3 h-3 text-amber-500 inline" />}
              {user?.displayName || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 leading-none mt-1 truncate max-w-[150px] font-mono">
              {user?.email}
            </p>
          </div>

          <button
            onClick={logout}
            title="Sign out of BizLedger"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
