import React from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNotification } from '../context/NotificationContext';
import { formatNaira } from '../lib/money';
import { generateReceiptPdf } from '../lib/pdfGenerator';
import { Table, Column } from '../components/common/Table';
import { Receipt } from '../types';
import { Download, Receipt as ReceiptIcon, CheckCircle2 } from 'lucide-react';

export const ReceiptsView: React.FC = () => {
  const { receipts, activeBusiness } = useBusiness();
  const { success } = useNotification();

  const handleDownload = (receipt: Receipt) => {
    if (!activeBusiness) return;
    try {
      generateReceiptPdf(receipt, activeBusiness);
      success('Receipt Downloaded', `${receipt.receiptNumber}.pdf downloaded.`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const columns: Column<Receipt>[] = [
    {
      header: 'Receipt #',
      accessorKey: 'receiptNumber',
      cell: r => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ReceiptIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">{r.receiptNumber}</span>
            <span className="block text-[11px] text-slate-400">Date: {r.paymentDate}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: r => <span className="font-semibold text-slate-800">{r.customerName}</span>,
    },
    {
      header: 'Invoice Referenced',
      accessorKey: 'invoiceNumber',
      cell: r => <span className="font-mono text-xs text-slate-600">{r.invoiceNumber || 'General Credit'}</span>,
    },
    {
      header: 'Payment Method',
      accessorKey: 'paymentMethod',
      cell: r => (
        <span className="capitalize text-xs text-slate-600">
          {r.paymentMethod.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Transaction Ref',
      accessorKey: 'paymentReference',
      cell: r => (
        <span className="font-mono text-xs text-slate-500 truncate max-w-xs block">
          {r.paymentReference}
        </span>
      ),
    },
    {
      header: 'Amount Paid',
      accessorKey: 'amountMinor',
      className: 'text-right',
      cell: r => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          {formatNaira(r.amountMinor)}
        </span>
      ),
    },
    {
      header: 'Action',
      className: 'text-right',
      cell: r => (
        <button
          onClick={() => handleDownload(r)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 inline-flex items-center gap-1 font-semibold text-xs"
        >
          <Download className="w-4 h-4" />
          <span>PDF</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Official Payment Receipts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Receipts generated strictly from verified payment records with NIBSS/POS transaction references.
        </p>
      </div>

      <Table
        data={receipts}
        columns={columns}
        keyExtractor={r => r.id}
        searchPlaceholder="Search by receipt number, customer, or transaction reference..."
        searchFilter={(r, query) =>
          r.receiptNumber.toLowerCase().includes(query) ||
          r.customerName.toLowerCase().includes(query) ||
          r.paymentReference.toLowerCase().includes(query) ||
          r.invoiceNumber.toLowerCase().includes(query)
        }
      />
    </div>
  );
};
