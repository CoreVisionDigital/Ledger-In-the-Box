import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatNaira, nairaToKobo, koboToNaira } from '../../lib/money';
import { PaymentMethod } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedInvoiceId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedInvoiceId,
}) => {
  const { invoices, customers, recordPayment } = useBusiness();
  const { error } = useNotification();

  const [invoiceId, setInvoiceId] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Eligible unpaid or partially paid invoices
  const eligibleInvoices = invoices.filter(
    inv => inv.status !== 'cancelled' && inv.balanceDueMinor > 0
  );

  useEffect(() => {
    if (preselectedInvoiceId) {
      setInvoiceId(preselectedInvoiceId);
      const inv = invoices.find(i => i.id === preselectedInvoiceId);
      if (inv) {
        setAmountNaira(koboToNaira(inv.balanceDueMinor).toString());
      }
    } else if (eligibleInvoices.length > 0 && !invoiceId) {
      setInvoiceId(eligibleInvoices[0].id);
      setAmountNaira(koboToNaira(eligibleInvoices[0].balanceDueMinor).toString());
    }
  }, [preselectedInvoiceId, eligibleInvoices.length, isOpen]);

  const selectedInvoice = invoices.find(i => i.id === invoiceId);

  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setAmountNaira(koboToNaira(inv.balanceDueMinor).toString());
    }
  };

  const handlePayFull = () => {
    if (selectedInvoice) {
      setAmountNaira(koboToNaira(selectedInvoice.balanceDueMinor).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoice) {
      error('Selection Error', 'Please choose an invoice with an outstanding balance.');
      return;
    }

    const amountMinor = nairaToKobo(amountNaira);

    if (amountMinor <= 0) {
      error('Invalid Amount', 'Payment amount must be greater than ₦0.00.');
      return;
    }

    if (amountMinor > selectedInvoice.balanceDueMinor) {
      error(
        'Over-Allocation Blocked',
        `Payment (₦${Number(amountNaira).toLocaleString()}) cannot exceed the invoice balance due of ${formatNaira(selectedInvoice.balanceDueMinor)}.`
      );
      return;
    }

    if (!reference.trim()) {
      error('Reference Required', 'Please provide a payment reference (Bank NIP session ID, POS slip RRN, etc.).');
      return;
    }

    try {
      setIsLoading(true);
      await recordPayment({
        customerId: selectedInvoice.customerId,
        invoiceId: selectedInvoice.id,
        amountMinor,
        paymentDate,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim(),
        generateReceiptImmediately: true,
      });

      onClose();
    } catch (err: any) {
      error('Payment Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Inward Customer Payment"
      description="Record customer receipts with NIBSS/POS transaction references and strict over-allocation guard."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Select Invoice to Settle"
          required
          value={invoiceId}
          onChange={e => handleInvoiceChange(e.target.value)}
        >
          <option value="">-- Choose Invoice with Outstanding Balance --</option>
          {eligibleInvoices.map(inv => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber} - {inv.customerName} (Bal: {formatNaira(inv.balanceDueMinor)})
            </option>
          ))}
        </Select>

        {selectedInvoice && (
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{selectedInvoice.customerName}</p>
              <p className="text-[11px] text-slate-500">Total: {formatNaira(selectedInvoice.totalMinor)} | Paid: {formatNaira(selectedInvoice.amountPaidMinor)}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Balance Due:</span>
              <span className="font-mono text-sm font-bold text-rose-600">
                {formatNaira(selectedInvoice.balanceDueMinor)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Amount Received (₦) *
              </label>
              {selectedInvoice && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  Pay Full Balance
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
              value={amountNaira}
              onChange={e => setAmountNaira(e.target.value)}
              className="font-mono text-base font-semibold"
            />
          </div>

          <Input
            label="Payment Date"
            type="date"
            required
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Method"
            required
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="bank_transfer">Bank Transfer (NIP / NIBSS)</option>
            <option value="pos">Point of Sale (POS Terminal)</option>
            <option value="cash">Cash Settlement</option>
            <option value="ussd">USSD / Quickteller</option>
            <option value="online">Online Card Gateway</option>
          </Select>

          <Input
            label="Transaction Reference / Session ID"
            required
            placeholder="e.g. 0000132409211029102"
            value={reference}
            onChange={e => setReference(e.target.value)}
            helperText="Bank NIP session ID, POS RRN, or teller no."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Internal Note / Remarks
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Verified in GTBank corporate app by Accountant"
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-800">
          <p className="font-semibold">Automatic Official Receipt Generation</p>
          <p className="text-[11px] opacity-90 mt-0.5">An official payment receipt with unique numbering will be issued immediately upon recording.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Confirm Payment & Issue Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};
