import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNotification } from '../context/NotificationContext';
import { formatNaira } from '../lib/money';
import { generateInvoicePdf } from '../lib/pdfGenerator';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Invoice, InvoiceStatus } from '../types';
import { Plus, Download, CreditCard, Share2, Eye, Ban } from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface InvoicesViewProps {
  onNewInvoice: () => void;
  onRecordPaymentForInvoice: (invoiceId: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onNewInvoice,
  onRecordPaymentForInvoice,
}) => {
  const { invoices, activeBusiness, updateInvoiceStatus } = useBusiness();
  const { success, info } = useNotification();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

  // Filter invoices by status
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  const handleDownloadPdf = (invoice: Invoice) => {
    if (!activeBusiness) return;
    try {
      generateInvoicePdf(invoice, activeBusiness);
      success('PDF Generated', `${invoice.invoiceNumber}.pdf downloaded.`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleShareSummary = (invoice: Invoice) => {
    const summary = `*INVOICE: ${invoice.invoiceNumber}*\nIssued by: ${activeBusiness?.name}\nBilled to: ${invoice.customerName}\nAmount Due: ${formatNaira(invoice.balanceDueMinor)}\nDue Date: ${invoice.dueDate}\nBank: ${activeBusiness?.bankDetails?.bankName} (Acct: ${activeBusiness?.bankDetails?.accountNumber})`;
    navigator.clipboard.writeText(summary);
    info('Copied to Clipboard', 'Invoice summary copied. You can paste it into WhatsApp or Email.');
  };

  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice #',
      accessorKey: 'invoiceNumber',
      cell: inv => (
        <div>
          <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
          <span className="block text-[11px] text-slate-400">Issued: {inv.issueDate}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: inv => (
        <div>
          <span className="font-semibold text-slate-800">{inv.customerName}</span>
          {inv.customerPhone && <span className="block text-[11px] text-slate-400">{inv.customerPhone}</span>}
        </div>
      ),
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: inv => {
        const isPastDue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate < new Date().toISOString().split('T')[0];
        return (
          <span className={`text-xs ${isPastDue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
            {inv.dueDate} {isPastDue && '(Overdue)'}
          </span>
        );
      },
    },
    {
      header: 'Total Invoiced',
      accessorKey: 'totalMinor',
      className: 'text-right',
      cell: inv => <span className="font-mono font-bold text-slate-900">{formatNaira(inv.totalMinor)}</span>,
    },
    {
      header: 'Amount Paid',
      accessorKey: 'amountPaidMinor',
      className: 'text-right',
      cell: inv => <span className="font-mono text-emerald-600 font-semibold">{formatNaira(inv.amountPaidMinor)}</span>,
    },
    {
      header: 'Balance Due',
      accessorKey: 'balanceDueMinor',
      className: 'text-right',
      cell: inv => (
        <span className={`font-mono font-bold ${inv.balanceDueMinor > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
          {formatNaira(inv.balanceDueMinor)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: inv => <Badge status={inv.status} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: inv => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setSelectedInvoiceForDetail(inv)}
            title="View Details"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleDownloadPdf(inv)}
            title="Download PDF Invoice"
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleShareSummary(inv)}
            title="Copy WhatsApp / Email Summary"
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {inv.balanceDueMinor > 0 && inv.status !== 'cancelled' && (
            <button
              onClick={() => onRecordPaymentForInvoice(inv.id)}
              title="Record Payment"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Commercial Sales Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track, and issue Nigerian VAT invoices with multi-line items and partial payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={onNewInvoice}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        {['all', 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl border transition-colors capitalize ${
              statusFilter === st
                ? 'bg-slate-900 text-white border-slate-900 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <Table
        data={filteredInvoices}
        columns={columns}
        keyExtractor={inv => inv.id}
        searchPlaceholder="Search invoices by number or customer name..."
        searchFilter={(inv, q) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q)
        }
        onRowClick={inv => setSelectedInvoiceForDetail(inv)}
      />

      {/* Invoice Detail Modal */}
      {selectedInvoiceForDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoiceForDetail(null)}
          title={`Invoice ${selectedInvoiceForDetail.invoiceNumber}`}
          description={`Issued to ${selectedInvoiceForDetail.customerName} on ${selectedInvoiceForDetail.issueDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <p className="font-semibold text-slate-900">Payment Status</p>
                <div className="mt-1">
                  <Badge status={selectedInvoiceForDetail.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Balance Due:</span>
                <span className="font-mono text-base font-bold text-rose-600">
                  {formatNaira(selectedInvoiceForDetail.balanceDueMinor)}
                </span>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Disc</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoiceForDetail.items.map(item => (
                    <tr key={item.id}>
                      <td className="p-2.5">{item.description}</td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">{formatNaira(item.unitPriceMinor)}</td>
                      <td className="p-2.5 text-right">{item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-semibold">{formatNaira(item.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations breakdown */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3 text-slate-600 font-mono">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatNaira(selectedInvoiceForDetail.subtotalMinor)}</span>
              </div>
              {selectedInvoiceForDetail.discountMinor > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-{formatNaira(selectedInvoiceForDetail.discountMinor)}</span>
                </div>
              )}
              {selectedInvoiceForDetail.taxVatMinor > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>VAT (7.5%):</span>
                  <span>+{formatNaira(selectedInvoiceForDetail.taxVatMinor)}</span>
                </div>
              )}
              {selectedInvoiceForDetail.taxWhtMinor > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>WHT Deducted:</span>
                  <span>-{formatNaira(selectedInvoiceForDetail.taxWhtMinor)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                <span>Total:</span>
                <span>{formatNaira(selectedInvoiceForDetail.totalMinor)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Amount Paid:</span>
                <span>{formatNaira(selectedInvoiceForDetail.amountPaidMinor)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedInvoiceForDetail.status !== 'cancelled' && selectedInvoiceForDetail.amountPaidMinor === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      updateInvoiceStatus(selectedInvoiceForDetail.id, 'cancelled');
                      setSelectedInvoiceForDetail(null);
                    }}
                    leftIcon={<Ban className="w-3.5 h-3.5" />}
                  >
                    Cancel Invoice
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf(selectedInvoiceForDetail)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download PDF
                </Button>
                {selectedInvoiceForDetail.balanceDueMinor > 0 && selectedInvoiceForDetail.status !== 'cancelled' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const id = selectedInvoiceForDetail.id;
                      setSelectedInvoiceForDetail(null);
                      onRecordPaymentForInvoice(id);
                    }}
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
