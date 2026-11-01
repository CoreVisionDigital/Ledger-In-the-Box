import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { Customer } from '../../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

const NIGERIAN_STATES = [
  'Lagos', 'Abuja (FCT)', 'Rivers', 'Kano', 'Oyo', 'Ogun', 'Kaduna', 'Delta',
  'Enugu', 'Anambra', 'Edo', 'Akwa Ibom', 'Ondo', 'Imo', 'Plateau', 'Kwara',
  'Cross River', 'Benue', 'Abia', 'Bauchi', 'Borno', 'Sokoto', 'Gombe', 'Other'
];

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
}) => {
  const { createCustomer, updateCustomer } = useBusiness();
  const { error } = useNotification();

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Lagos');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setBusinessName(customerToEdit.businessName || '');
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address || '');
      setState(customerToEdit.state || 'Lagos');
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setBusinessName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setState('Lagos');
      setNotes('');
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error('Name Required', 'Please enter the customer or contact person name.');
      return;
    }

    try {
      setIsLoading(true);
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, {
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          state,
          notes: notes.trim(),
        });
      } else {
        await createCustomer({
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          state,
          notes: notes.trim(),
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
      title={customerToEdit ? 'Edit Customer Profile' : 'Register New Customer'}
      description="Record Nigerian client contact details, state, and corporate billing parameters."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Contact Person Name"
          required
          placeholder="e.g. Alhaji Aliko Ibrahim"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <Input
          label="Company / Enterprise Name"
          placeholder="e.g. Ibrahim Haulage & Logistics Ltd"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          helperText="Leave blank if individual consumer"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            placeholder="e.g. +234 803 123 4567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="client@domain.ng"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="State / Region"
            value={state}
            onChange={e => setState(e.target.value)}
          >
            {NIGERIAN_STATES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          <Input
            label="Office / Delivery Address"
            placeholder="e.g. Plot 12, Marina, Lagos Island"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Internal Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Prefers billing in 15-day cycles"
            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {customerToEdit ? 'Save Changes' : 'Register Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
