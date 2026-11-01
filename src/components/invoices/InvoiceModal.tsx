import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatNaira, nairaToKobo, calculateLineTotalMinor, addMinor, subtractMinor } from '../../lib/money';
import { Plus, Trash2 } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TempLineItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPriceNaira: string;
  discountPercent: number;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose }) => {
  const { customers, products, createInvoice, activeBusiness } = useBusiness();
  const { error } = useNotification();

  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [vatPercent, setVatPercent] = useState<number>(7.5);
  const [whtPercent, setWhtPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState<TempLineItem[]>([
    { description: '', quantity: 1, unitPriceNaira: '', discountPercent: 0 },
  ]);

  useEffect(() => {
    if (activeBusiness) {
      setVatPercent(activeBusiness.defaultVatPercent ?? 7.5);
      setWhtPercent(activeBusiness.defaultWhtPercent ?? 0);
      setPaymentTerms(activeBusiness.paymentTermsDefault || 'Net 15');
    }
  }, [activeBusiness, isOpen]);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.id,
        description: prod.name,
        unitPriceNaira: (prod.priceMinor / 100).toString(),
      };
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: '', quantity: 1, unitPriceNaira: '', discountPercent: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations in real-time
  let computedSubtotalMinor = 0;
  let computedDiscountMinor = 0;

  items.forEach(item => {
    const unitPriceMinor = nairaToKobo(item.unitPriceNaira || 0);
    const math = calculateLineTotalMinor(item.quantity, unitPriceMinor, item.discountPercent, 0);
    computedSubtotalMinor = addMinor(computedSubtotalMinor, math.grossMinor);
    computedDiscountMinor = addMinor(computedDiscountMinor, math.discountMinor);
  });

  const subtotalAfterDiscountMinor = Math.max(0, subtractMinor(computedSubtotalMinor, computedDiscountMinor));
  const computedVatMinor = Math.round((subtotalAfterDiscountMinor * vatPercent) / 100);
  const computedWhtMinor = Math.round((subtotalAfterDiscountMinor * whtPercent) / 100);
  const computedTotalMinor = addMinor(subtotalAfterDiscountMinor, computedVatMinor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      error('Validation Error', 'Please select or create a customer.');
      return;
    }

    const validItems = items.filter(
      it => it.description.trim() && Number(it.unitPriceNaira) > 0 && it.quantity > 0
    );

    if (validItems.length === 0) {
      error('Validation Error', 'Invoice must have at least one valid line item with description and price.');
      return;
    }

    try {
      setIsLoading(true);
      await createInvoice({
        customerId,
        issueDate,
        dueDate,
        paymentTerms,
        items: validItems.map(it => ({
          productId: it.productId,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPriceMinor: nairaToKobo(it.unitPriceNaira),
          discountPercent: Number(it.discountPercent) || 0,
          taxPercent: vatPercent,
        })),
        discountMinor: computedDiscountMinor,
        vatPercent,
        whtPercent,
        notes,
      });

      onClose();
    } catch (err: any) {
      error('Failed to create invoice', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Commercial Invoice"
      description="Issue a compliant Nigerian sales invoice with CAC registration, TIN, and 7.5% VAT calculation."
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Grid: Customer & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Customer"
            required
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
          >
            <option value="">-- Select Customer --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Issue Date"
            type="date"
            required
            value={issueDate}
            onChange={e => setIssueDate(e.target.value)}
          />

          <Input
            label="Due Date"
            type="date"
            required
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Payment Terms"
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
          >
            <option value="Due on Receipt">Due on Receipt</option>
            <option value="Net 7">Net 7 Days</option>
            <option value="Net 15">Net 15 Days</option>
            <option value="Net 30">Net 30 Days</option>
            <option value="Net 60">Net 60 Days</option>
          </Select>

          <Input
            label="VAT Rate (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={vatPercent}
            onChange={e => setVatPercent(parseFloat(e.target.value) || 0)}
            helperText="Standard Nigerian VAT is 7.5%"
          />

          <Input
            label="WHT Rate (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={whtPercent}
            onChange={e => setWhtPercent(parseFloat(e.target.value) || 0)}
            helperText="Optional Withholding Tax (typically 5% or 10%)"
          />
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Line Items</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2.5 items-start bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs"
              >
                {/* Product Quick-Select */}
                {products.length > 0 && (
                  <div className="col-span-12 sm:col-span-3">
                    <Select
                      value={item.productId || ''}
                      onChange={e => handleProductSelect(index, e.target.value)}
                      className="py-1.5 text-xs"
                    >
                      <option value="">Preset Product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatNaira(p.priceMinor)})
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className={`col-span-12 ${products.length > 0 ? 'sm:col-span-4' : 'sm:col-span-6'}`}>
                  <Input
                    placeholder="Description / Service provided"
                    required
                    value={item.description}
                    onChange={e => {
                      const val = e.target.value;
                      setItems(prev => {
                        const copy = [...prev];
                        copy[index].description = val;
                        return copy;
                      });
                    }}
                    className="py-1.5 text-xs"
                  />
                </div>

                <div className="col-span-4 sm:col-span-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    required
                    value={item.quantity}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 1;
                      setItems(prev => {
                        const copy = [...prev];
                        copy[index].quantity = val;
                        return copy;
                      });
                    }}
                    className="py-1.5 text-xs text-center"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price (₦)"
                    required
                    value={item.unitPriceNaira}
                    onChange={e => {
                      const val = e.target.value;
                      setItems(prev => {
                        const copy = [...prev];
                        copy[index].unitPriceNaira = val;
                        return copy;
                      });
                    }}
                    className="py-1.5 text-xs"
                  />
                </div>

                <div className="col-span-3 sm:col-span-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Disc %"
                    value={item.discountPercent || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setItems(prev => {
                        const copy = [...prev];
                        copy[index].discountPercent = val;
                        return copy;
                      });
                    }}
                    className="py-1.5 text-xs text-center"
                  />
                </div>

                <div className="col-span-1 flex justify-center pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary Box */}
        <div className="bg-slate-900 text-white rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Invoice Notes & Payment Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Kindly transfer to GTBank Account: 0129384756. Prompt payment is appreciated."
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2 text-xs text-slate-300 self-center">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span>Subtotal:</span>
              <span className="font-mono text-white font-semibold">{formatNaira(computedSubtotalMinor)}</span>
            </div>
            {computedDiscountMinor > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-800 text-rose-400">
                <span>Total Discount:</span>
                <span className="font-mono font-semibold">-{formatNaira(computedDiscountMinor)}</span>
              </div>
            )}
            {computedVatMinor > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-800 text-emerald-400">
                <span>VAT ({vatPercent}%):</span>
                <span className="font-mono font-semibold">+{formatNaira(computedVatMinor)}</span>
              </div>
            )}
            {computedWhtMinor > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-800 text-amber-400">
                <span>WHT Deducted ({whtPercent}%):</span>
                <span className="font-mono font-semibold">-{formatNaira(computedWhtMinor)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm font-bold text-white border-t border-slate-700">
              <span className="text-emerald-400">Total Invoiced:</span>
              <span className="font-mono text-base text-emerald-400">{formatNaira(computedTotalMinor)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Generate & Issue Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
};
