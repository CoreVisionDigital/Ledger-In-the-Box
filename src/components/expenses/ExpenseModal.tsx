import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { nairaToKobo } from '../../lib/money';
import { ExpenseCategoryKey, PaymentMethod } from '../../types';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NIGERIAN_EXPENSE_CATEGORIES: { key: ExpenseCategoryKey; label: string }[] = [
  { key: 'utilities_diesel', label: 'Diesel & Generator Fuel (AGO)' },
  { key: 'salaries_wages', label: 'Staff Salaries, Wages & Allowances' },
  { key: 'rent_office', label: 'Office, Yard & Warehouse Rent' },
  { key: 'logistics_fuel', label: 'Vehicle Fuel, Tolls & Haulage' },
  { key: 'inventory_supplies', label: 'Raw Materials & Inventory Purchase' },
  { key: 'marketing_ads', label: 'Marketing, Branding & Promotions' },
  { key: 'maintenance', label: 'Repairs & Equipment Servicing' },
  { key: 'bank_charges_taxes', label: 'Bank Charges, Stamp Duty & Levies' },
  { key: 'professional_fees', label: 'Legal, Audit & NAFDAC Advisory' },
  { key: 'miscellaneous', label: 'General Office Miscellaneous' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { createExpense } = useBusiness();
  const { error } = useNotification();

  const [category, setCategory] = useState<ExpenseCategoryKey>('utilities_diesel');
  const [amountNaira, setAmountNaira] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pos');
  const [reference, setReference] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [docName, setDocName] = useState('');
  const [docDataUrl, setDocDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      error('File Too Large', 'Supporting document must be under 2MB.');
      return;
    }

    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountMinor = nairaToKobo(amountNaira);
    if (amountMinor <= 0) {
      error('Invalid Amount', 'Expense amount must be greater than zero.');
      return;
    }

    if (!description.trim()) {
      error('Description Required', 'Please describe the expense.');
      return;
    }

    const catObj = NIGERIAN_EXPENSE_CATEGORIES.find(c => c.key === category);

    try {
      setIsLoading(true);
      await createExpense({
        category,
        categoryName: catObj?.label || 'Operating Expense',
        amountMinor,
        expenseDate,
        description: description.trim(),
        vendor: vendor.trim() || 'General Vendor',
        paymentMethod,
        reference: reference.trim(),
        receiptNote: receiptNote.trim(),
        supportingDocName: docName,
        supportingDocDataUrl: docDataUrl,
      });

      onClose();
    } catch (err: any) {
      error('Expense Record Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Business Operating Expense"
      description="Categorize expenditure (Generator Diesel, Rent, Staff Wages) with supporting receipts."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Expense Category"
            required
            value={category}
            onChange={e => setCategory(e.target.value as ExpenseCategoryKey)}
          >
            {NIGERIAN_EXPENSE_CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>

          <Input
            label="Amount Incurred (₦)"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expense Date"
            type="date"
            required
            value={expenseDate}
            onChange={e => setExpenseDate(e.target.value)}
          />

          <Input
            label="Vendor / Payee Name"
            placeholder="e.g. TotalEnergies, PHCN/EKEDC, Landlord"
            required
            value={vendor}
            onChange={e => setVendor(e.target.value)}
          />
        </div>

        <Input
          label="Detailed Description"
          required
          placeholder="e.g. Purchase of 400L Diesel for warehouse standby generator"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Method Used"
            required
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="bank_transfer">Bank Transfer (NIP)</option>
            <option value="pos">Corporate POS Terminal</option>
            <option value="cash">Petty Cash</option>
            <option value="online">Online Payment</option>
          </Select>

          <Input
            label="Payment Reference / Slip #"
            placeholder="e.g. POS Ref #994821 or NIP session ID"
            value={reference}
            onChange={e => setReference(e.target.value)}
          />
        </div>

        {/* Document Attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Attach Supporting Receipt / Invoice (Optional)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
            <input
              type="file"
              id="expense-doc"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="expense-doc" className="cursor-pointer flex flex-col items-center">
              {docName ? (
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{docName} attached</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">Click to upload receipt photo or PDF</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Max size 2MB</span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Record Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
