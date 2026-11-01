import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';

interface NewBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBusinessModal: React.FC<NewBusinessModalProps> = ({ isOpen, onClose }) => {
  const { createBusiness } = useBusiness();
  const { error } = useNotification();

  const [name, setName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [tin, setTin] = useState('');
  const [state, setState] = useState('Lagos');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Name Required', 'Please provide the enterprise legal name.');
      return;
    }

    try {
      setIsLoading(true);
      await createBusiness({
        name: name.trim(),
        rcNumber: rcNumber.trim(),
        taxIdentificationNumber: tin.trim(),
        state,
        phone: phone.trim(),
      });
      setName('');
      setRcNumber('');
      setTin('');
      onClose();
    } catch (err: any) {
      error('Registration Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Business Entity"
      description="Create a distinct business organization. All customers, invoices, and accounting records are isolated."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Enterprise / Company Name"
          required
          placeholder="e.g. Dangote Haulage Ltd"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="CAC RC / BN Number"
            placeholder="e.g. RC-1928472"
            value={rcNumber}
            onChange={e => setRcNumber(e.target.value)}
          />

          <Input
            label="FIRS TIN"
            placeholder="e.g. 10293848-0001"
            value={tin}
            onChange={e => setTin(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone"
            placeholder="+234 803 ..."
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          <Select
            label="State"
            value={state}
            onChange={e => setState(e.target.value)}
          >
            <option value="Lagos">Lagos</option>
            <option value="Abuja (FCT)">Abuja (FCT)</option>
            <option value="Rivers">Rivers</option>
            <option value="Kano">Kano</option>
            <option value="Oyo">Oyo</option>
            <option value="Ogun">Ogun</option>
          </Select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Business
          </Button>
        </div>
      </form>
    </Modal>
  );
};
