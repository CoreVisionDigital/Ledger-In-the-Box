import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatNaira } from '../lib/money';
import { Table, Column } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Expense } from '../types';
import { Plus, Paperclip, Eye, DollarSign } from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface ExpensesViewProps {
  onNewExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onNewExpense }) => {
  const { expenses } = useBusiness();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewDocExpense, setViewDocExpense] = useState<Expense | null>(null);

  const filteredExpenses = expenses.filter(e => {
    if (categoryFilter === 'all') return true;
    return e.category === categoryFilter;
  });

  const totalFilteredKobo = filteredExpenses.reduce((sum, e) => sum + e.amountMinor, 0);

  const columns: Column<Expense>[] = [
    {
      header: 'Expense #',
      accessorKey: 'expenseNumber',
      cell: e => (
        <div>
          <span className="font-bold text-slate-900">{e.expenseNumber}</span>
          <span className="block text-[11px] text-slate-400">Date: {e.expenseDate}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'categoryName',
      cell: e => (
        <span className="font-semibold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-lg">
          {e.categoryName}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: e => (
        <div>
          <span className="text-slate-800">{e.description}</span>
          <span className="block text-[11px] text-slate-400">Vendor: {e.vendor}</span>
        </div>
      ),
    },
    {
      header: 'Method',
      accessorKey: 'paymentMethod',
      cell: e => (
        <span className="capitalize text-xs text-slate-600">
          {e.paymentMethod.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Receipt Document',
      cell: e => (
        e.supportingDocName || e.supportingDocDataUrl ? (
          <button
            onClick={() => setViewDocExpense(e)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>View Receipt</span>
          </button>
        ) : (
          <span className="text-slate-400 text-xs">No attachment</span>
        )
      ),
    },
    {
      header: 'Amount (₦)',
      accessorKey: 'amountMinor',
      className: 'text-right',
      cell: e => (
        <span className="font-mono font-bold text-rose-600 text-sm">
          -{formatNaira(e.amountMinor)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Operating Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log diesel fuel, payroll disbursements, office rent, logistics, and vendor payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Total Filtered:</span>
            <span className="font-mono font-bold text-slate-900">{formatNaira(totalFilteredKobo)}</span>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={onNewExpense}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 font-bold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          All Categories ({expenses.length})
        </button>
        <button
          onClick={() => setCategoryFilter('utilities_diesel')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            categoryFilter === 'utilities_diesel'
              ? 'bg-slate-900 text-white border-slate-900 font-bold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Diesel & Gen Fuel
        </button>
        <button
          onClick={() => setCategoryFilter('salaries_wages')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            categoryFilter === 'salaries_wages'
              ? 'bg-slate-900 text-white border-slate-900 font-bold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Salaries & Wages
        </button>
        <button
          onClick={() => setCategoryFilter('rent_office')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            categoryFilter === 'rent_office'
              ? 'bg-slate-900 text-white border-slate-900 font-bold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          Office & Warehouse Rent
        </button>
      </div>

      <Table
        data={filteredExpenses}
        columns={columns}
        keyExtractor={e => e.id}
        searchPlaceholder="Search expenses by vendor, description, or reference..."
        searchFilter={(e, query) =>
          e.expenseNumber.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.vendor.toLowerCase().includes(query) ||
          e.categoryName.toLowerCase().includes(query)
        }
      />

      {/* Document View Modal */}
      {viewDocExpense && (
        <Modal
          isOpen={true}
          onClose={() => setViewDocExpense(null)}
          title={`Supporting Document: ${viewDocExpense.expenseNumber}`}
          description={`Vendor: ${viewDocExpense.vendor} • Amount: ${formatNaira(viewDocExpense.amountMinor)}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {viewDocExpense.supportingDocDataUrl ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-2 min-h-64">
                <img
                  src={viewDocExpense.supportingDocDataUrl}
                  alt="Receipt Preview"
                  className="max-h-96 max-w-full object-contain rounded"
                />
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl border text-center text-xs text-slate-500">
                <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">{viewDocExpense.supportingDocName || 'Attached Document'}</p>
                <p className="mt-1">Verified on delivery file storage</p>
              </div>
            )}

            {viewDocExpense.receiptNote && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">Note / Delivery Remark:</span>
                <p className="text-slate-600 mt-0.5">{viewDocExpense.receiptNote}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewDocExpense(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
