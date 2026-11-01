import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { nairaToKobo, koboToNaira } from '../../lib/money';
import { ProductService } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: ProductService | null;
}

const COMMON_UNITS = [
  'units', 'pcs', 'bags', 'kg', 'tonnes', 'trips', 'hours', 'days', 'month', 'service', 'license', 'consultation'
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { createProduct, updateProduct } = useBusiness();
  const { error } = useNotification();

  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [unit, setUnit] = useState('units');
  const [priceNaira, setPriceNaira] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setType(productToEdit.type || 'product');
      setUnit(productToEdit.unit || 'units');
      setPriceNaira(koboToNaira(productToEdit.priceMinor).toString());
      setDescription(productToEdit.description || '');
    } else {
      setName('');
      setType('product');
      setUnit('units');
      setPriceNaira('');
      setDescription('');
    }
  }, [productToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error('Name Required', 'Please enter product or service name.');
      return;
    }

    const priceMinor = nairaToKobo(priceNaira);
    if (priceMinor <= 0) {
      error('Price Required', 'Please enter a valid price in Naira.');
      return;
    }

    try {
      setIsLoading(true);
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: name.trim(),
          type,
          unit,
          priceMinor,
          description: description.trim(),
        });
      } else {
        await createProduct({
          name: name.trim(),
          type,
          unit,
          priceMinor,
          currency: 'NGN',
          description: description.trim(),
        });
      }
      onClose();
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product / Service' : 'Add Product or Service'}
      description="Add item to your pricing catalog with price stored in exact integer minor units."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Item Name"
          required
          placeholder="e.g. 100kg Grade A Maize Bag or Legal Retainer"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Type"
            value={type}
            onChange={e => setType(e.target.value as 'product' | 'service')}
          >
            <option value="product">Physical Product / Inventory</option>
            <option value="service">Professional Service / Retainer</option>
          </Select>

          <Select
            label="Pricing Unit"
            value={unit}
            onChange={e => setUnit(e.target.value)}
          >
            {COMMON_UNITS.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Unit Selling Price (₦)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          value={priceNaira}
          onChange={e => setPriceNaira(e.target.value)}
          className="font-mono text-base font-semibold"
          helperText="Stored precisely in whole integer Kobo."
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Description / Specifications
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Specifications, scope, or delivery conditions"
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {productToEdit ? 'Save Changes' : 'Add to Catalog'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
