import React from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatNaira } from '../lib/money';
import { Table, Column } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Payment } from '../types';
import { Plus, CreditCard, ArrowDownLeft } from 'lucide-react';

interface PaymentsViewProps {
  onNewPayment: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onNewPayment }) => {
  const { payments } = useBusiness();

  const columns: Column<Payment>[] = [
    {
      header: 'Payment #',
      accessorKey: 'paymentNumber',
      cell: p => (
        <div>
          <span className="font-bold text-slate-900">{p.paymentNumber}</span>
          <span className="block text-[11px] text-slate-400">Date: {p.paymentDate}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: p => <span className="font-semibold text-slate-800">{p.customerName}</span>,
    },
    {
      header: 'Settled Invoice',
      accessorKey: 'invoiceNumber',
      cell: p => <span className="font-mono text-xs text-slate-600">{p.invoiceNumber}</span>,
    },
    {
      header: 'Method',
      accessorKey: 'paymentMethod',
      cell: p => (
        <span className="capitalize text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
          {p.paymentMethod.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Reference / NIP ID',
      accessorKey: 'reference',
      cell: p => (
        <span className="font-mono text-xs text-slate-500 truncate max-w-xs block">
          {p.reference}
        </span>
      ),
    },
    {
      header: 'Amount Received',
      accessorKey: 'amountMinor',
      className: 'text-right',
      cell: p => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          +{formatNaira(p.amountMinor)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inward Customer Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-logged payment settlements with atomic invoice allocations and strict balance reconciliation.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onNewPayment}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Record Payment
        </Button>
      </div>

      <Table
        data={payments}
        columns={columns}
        keyExtractor={p => p.id}
        searchPlaceholder="Search payments by reference, customer, or invoice..."
        searchFilter={(p, query) =>
          p.paymentNumber.toLowerCase().includes(query) ||
          p.customerName.toLowerCase().includes(query) ||
          p.reference.toLowerCase().includes(query) ||
          p.invoiceNumber.toLowerCase().includes(query)
        }
      />
    </div>
  );
};
