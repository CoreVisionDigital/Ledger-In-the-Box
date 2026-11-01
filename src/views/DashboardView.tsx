import React from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatNaira, addMinor, subtractMinor } from '../lib/money';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle, 
  FileText, 
  Plus, 
  Sparkles,
  Info
} from 'lucide-react';
import { NavItemKey } from '../components/layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavItemKey) => void;
  onNewInvoice: () => void;
  onNewPayment: () => void;
  onNewExpense: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onNewInvoice,
  onNewPayment,
  onNewExpense,
}) => {
  const { activeBusiness, invoices, payments, expenses, customers, seedNigerianBusinessData } = useBusiness();

  // 1. Accrual Sales (Invoiced)
  const totalInvoicedSalesMinor = invoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((acc, inv) => addMinor(acc, inv.totalMinor), 0);

  // 2. Actual Cash Received (from verified payments)
  const actualCashReceivedMinor = payments.reduce((acc, p) => addMinor(acc, p.amountMinor), 0);

  // 3. Operating Expenses Incurred
  const totalExpensesMinor = expenses.reduce((acc, e) => addMinor(acc, e.amountMinor), 0);

  // 4. Estimated Operating Cash / Profit
  const estimatedProfitMinor = subtractMinor(actualCashReceivedMinor, totalExpensesMinor);

  // 5. Outstanding Receivables (uncollected balances)
  const outstandingReceivablesMinor = invoices
    .filter(inv => inv.status !== 'cancelled' && inv.status !== 'paid')
    .reduce((acc, inv) => addMinor(acc, inv.balanceDueMinor), 0);

  // 6. Overdue Invoices
  const today = new Date().toISOString().split('T')[0];
  const overdueInvoices = invoices.filter(
    inv => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate < today
  );
  const overdueAmountMinor = overdueInvoices.reduce((acc, inv) => addMinor(acc, inv.balanceDueMinor), 0);

  // Recent Invoices (up to 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Recent Expenses (up to 5)
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
              Active Organization
            </span>
            <span className="text-xs text-slate-300">
              {activeBusiness?.rcNumber ? `CAC ${activeBusiness.rcNumber}` : 'Sole Proprietorship'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
            {activeBusiness?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Nigerian Financial Management Overview • Currency: Nigerian Naira (NGN ₦)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoices.length === 0 && (
            <Button
              variant="emerald"
              size="sm"
              onClick={seedNigerianBusinessData}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Seed Sample Nigerian Data
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewInvoice}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-slate-900 bg-white"
          >
            New Invoice
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onNewPayment}
            leftIcon={<ArrowDownLeft className="w-3.5 h-3.5" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Invoiced Sales"
          value={formatNaira(totalInvoicedSalesMinor)}
          subtitle="Total billings issued"
          icon={FileText}
          accentColor="blue"
        />

        <StatCard
          title="Cash Received"
          value={formatNaira(actualCashReceivedMinor)}
          subtitle="Real bank deposits"
          icon={ArrowDownLeft}
          accentColor="emerald"
        />

        <StatCard
          title="Total Expenses"
          value={formatNaira(totalExpensesMinor)}
          subtitle="Operating disbursements"
          icon={ArrowUpRight}
          accentColor="rose"
        />

        <StatCard
          title="Operating Cash Flow"
          value={formatNaira(estimatedProfitMinor)}
          subtitle="Cash In minus Expenses"
          icon={TrendingUp}
          accentColor={estimatedProfitMinor >= 0 ? 'emerald' : 'rose'}
        />

        <StatCard
          title="Receivables"
          value={formatNaira(outstandingReceivablesMinor)}
          subtitle="Client balances pending"
          icon={AlertCircle}
          accentColor="amber"
        />

        <StatCard
          title="Overdue Invoices"
          value={formatNaira(overdueAmountMinor)}
          subtitle={`${overdueInvoices.length} invoices past due`}
          icon={AlertCircle}
          accentColor={overdueInvoices.length > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Accounting Methodology Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Financial Accounting Principle: </span>
          BizLedger strictly distinguishes invoiced commercial sales (accrual basis) from actual cash payments received in Nigerian bank accounts. Estimated profit is an operational management figure and does not replace statutory audited annual financial returns under Nigerian CAMA 2020.
        </div>
      </div>

      {/* Two Column Layout: Recent Invoices & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Commercial Invoices</h3>
              <p className="text-xs text-slate-500">Latest client billings and payment status</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              View All ({invoices.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentInvoices.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No invoices generated yet.</p>
            ) : (
              recentInvoices.map(inv => (
                <div key={inv.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 rounded-lg px-2">
                  <div>
                    <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                    <span className="text-slate-500 ml-2">{inv.customerName}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">Due: {inv.dueDate}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 block">{formatNaira(inv.totalMinor)}</span>
                    <Badge status={inv.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Operating Expenses</h3>
              <p className="text-xs text-slate-500">Diesel, rent, payroll, and logistics</p>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              View All ({expenses.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentExpenses.length === 0 ? (
              <p className="py-6 text-center text-slate-400">No operating expenses recorded yet.</p>
            ) : (
              recentExpenses.map(exp => (
                <div key={exp.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 rounded-lg px-2">
                  <div>
                    <span className="font-semibold text-slate-900">{exp.categoryName}</span>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{exp.description}</p>
                    <div className="text-[10px] text-slate-400 mt-0.5">{exp.expenseDate} • {exp.vendor}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-600 block">-{formatNaira(exp.amountMinor)}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {exp.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
