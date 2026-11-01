import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNotification } from '../context/NotificationContext';
import { formatNaira } from '../lib/money';
import { generateQuotationPdf } from '../lib/pdfGenerator';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Quotation, QuotationStatus } from '../types';
import { Plus, Download, ArrowRightCircle, Check, X, Eye } from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface QuotationsViewProps {
  onNewQuotation: () => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onNewQuotation }) => {
  const { quotations, activeBusiness, convertQuotationToInvoice, updateQuotationStatus } = useBusiness();
  const { success, error } = useNotification();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const filteredQuotations = quotations.filter(q => {
    if (statusFilter === 'all') return true;
    return q.status === statusFilter;
  });

  const handleDownloadPdf = (quote: Quotation) => {
    if (!activeBusiness) return;
    try {
      generateQuotationPdf(quote, activeBusiness);
      success('PDF Generated', `${quote.quotationNumber}.pdf downloaded.`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConvert = async (quote: Quotation) => {
    try {
      setIsConverting(true);
      await convertQuotationToInvoice(quote.id);
      setSelectedQuote(null);
    } catch (err: any) {
      error('Conversion Blocked', err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const columns: Column<Quotation>[] = [
    {
      header: 'Quote #',
      accessorKey: 'quotationNumber',
      cell: q => (
        <div>
          <span className="font-bold text-slate-900">{q.quotationNumber}</span>
          <span className="block text-[11px] text-slate-400">Date: {q.issueDate}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: q => (
        <div>
          <span className="font-semibold text-slate-800">{q.customerName}</span>
          {q.customerPhone && <span className="block text-[11px] text-slate-400">{q.customerPhone}</span>}
        </div>
      ),
    },
    {
      header: 'Valid Until',
      accessorKey: 'validityDate',
      cell: q => {
        const isExpired = q.validityDate < new Date().toISOString().split('T')[0] && q.status !== 'converted';
        return (
          <span className={`text-xs ${isExpired ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
            {q.validityDate} {isExpired && '(Expired)'}
          </span>
        );
      },
    },
    {
      header: 'Estimated Total',
      accessorKey: 'totalMinor',
      className: 'text-right',
      cell: q => <span className="font-mono font-bold text-slate-900">{formatNaira(q.totalMinor)}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: q => <Badge status={q.status} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: q => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setSelectedQuote(q)}
            title="Preview Quote"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleDownloadPdf(q)}
            title="Download PDF"
            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
          >
            <Download className="w-4 h-4" />
          </button>

          {q.status !== 'converted' && (
            <button
              onClick={() => handleConvert(q)}
              title="Convert to Commercial Invoice"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 flex items-center gap-1 font-semibold text-xs text-emerald-600"
            >
              <ArrowRightCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Convert</span>
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
          <h1 className="text-xl font-bold text-slate-900">Commercial Quotations & Estimates</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue sales estimates and effortlessly convert accepted quotes directly into invoices.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onNewQuotation}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Quotation
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].map(st => (
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

      <Table
        data={filteredQuotations}
        columns={columns}
        keyExtractor={q => q.id}
        searchPlaceholder="Search quotation number or customer..."
        searchFilter={(q, query) =>
          q.quotationNumber.toLowerCase().includes(query) ||
          q.customerName.toLowerCase().includes(query)
        }
        onRowClick={q => setSelectedQuote(q)}
      />

      {/* Quote Preview Modal */}
      {selectedQuote && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedQuote(null)}
          title={`Quotation ${selectedQuote.quotationNumber}`}
          description={`Customer: ${selectedQuote.customerName} • Valid Until: ${selectedQuote.validityDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Quotation Status:</span>
                <div className="mt-1">
                  <Badge status={selectedQuote.status} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Total Estimate:</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {formatNaira(selectedQuote.totalMinor)}
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
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Disc</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedQuote.items.map(item => (
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

            {selectedQuote.status === 'converted' && (
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-purple-900">
                <p className="font-semibold">Converted to Invoice</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  This quotation has already been locked and converted into commercial invoice. Duplicate conversion is prevented.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                {selectedQuote.status === 'sent' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateQuotationStatus(selectedQuote.id, 'accepted');
                        setSelectedQuote(prev => prev ? { ...prev, status: 'accepted' } : null);
                      }}
                      leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                    >
                      Mark Accepted
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateQuotationStatus(selectedQuote.id, 'rejected');
                        setSelectedQuote(prev => prev ? { ...prev, status: 'rejected' } : null);
                      }}
                      leftIcon={<X className="w-3.5 h-3.5 text-rose-600" />}
                    >
                      Mark Rejected
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf(selectedQuote)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download PDF
                </Button>
                {selectedQuote.status !== 'converted' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleConvert(selectedQuote)}
                    isLoading={isConverting}
                    leftIcon={<ArrowRightCircle className="w-3.5 h-3.5" />}
                  >
                    Convert to Invoice
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
