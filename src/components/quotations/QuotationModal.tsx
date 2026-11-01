import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { formatNaira, nairaToKobo, calculateLineTotalMinor, addMinor, subtractMinor } from '../../lib/money';
import { Plus, Trash2 } from 'lucide-react';

interface QuotationModalProps {
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

export const QuotationModal: React.FC<QuotationModalProps> = ({ isOpen, onClose }) => {
  const { customers, products, createQuotation, activeBusiness } = useBusiness();
  const { error } = useNotification();

  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [vatPercent, setVatPercent] = useState<number>(7.5);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState<TempLineItem[]>([
    { description: '', quantity: 1, unitPriceNaira: '', discountPercent: 0 },
  ]);

  useEffect(() => {
    if (activeBusiness) {
      setVatPercent(activeBusiness.defaultVatPercent ?? 7.5);
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
  const computedTotalMinor = addMinor(subtotalAfterDiscountMinor, computedVatMinor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      error('Validation Error', 'Please select a customer for the quotation.');
      return;
    }

    const validItems = items.filter(
      it => it.description.trim() && Number(it.unitPriceNaira) > 0 && it.quantity > 0
    );

    if (validItems.length === 0) {
      error('Validation Error', 'Quotation must have at least one valid line item with description and price.');
      return;
    }

    try {
      setIsLoading(true);
      await createQuotation({
        customerId,
        issueDate,
        validityDate,
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
        notes,
      });

      onClose();
    } catch (err: any) {
      error('Failed to create quotation', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Sales Quotation / Estimate"
      description="Prepare commercial quote with line items, validity period, and Nigerian VAT."
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
            label="Quotation Date"
            type="date"
            required
            value={issueDate}
            onChange={e => setIssueDate(e.target.value)}
          />

          <Input
            label="Valid Until"
            type="date"
            required
            value={validityDate}
            onChange={e => setValidityDate(e.target.value)}
            helperText="Default is 30 days validity"
          />
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Estimate Items</h4>
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
                    placeholder="Description / Scope of Work"
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
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-900 text-white rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Quotation Terms & Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Price is inclusive of delivery within Lagos State. Validity is strictly 30 days."
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
                <span>Discount:</span>
                <span className="font-mono font-semibold">-{formatNaira(computedDiscountMinor)}</span>
              </div>
            )}
            {computedVatMinor > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-800 text-emerald-400">
                <span>VAT ({vatPercent}%):</span>
                <span className="font-mono font-semibold">+{formatNaira(computedVatMinor)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm font-bold text-white border-t border-slate-700">
              <span className="text-blue-400">Estimated Total:</span>
              <span className="font-mono text-base text-blue-400">{formatNaira(computedTotalMinor)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save & Issue Quotation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
