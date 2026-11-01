import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Business, SubscriptionPlanId, BillingInterval } from '../../types';
import { SUBSCRIPTION_PLANS } from '../../lib/subscriptions';
import { Building2, Plus, Mail, Phone, MapPin } from 'lucide-react';

interface CreateSubscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Business>) => Promise<Business>;
}

export const CreateSubscriberModal: React.FC<CreateSubscriberModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234 ');
  const [rcNumber, setRcNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Lagos');
  const [planId, setPlanId] = useState<SubscriptionPlanId>('pro');
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (interval === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (interval === '6months') {
        periodEnd.setMonth(periodEnd.getMonth() + 6);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await onCreate({
        name: name.trim(),
        email: email.trim() || 'contact@tenant.ng',
        phone: phone.trim(),
        rcNumber: rcNumber.trim() || `RC-${Math.floor(1000000 + Math.random() * 9000000)}`,
        taxIdentificationNumber: taxId.trim() || `TIN-${Math.floor(10000000 + Math.random() * 90000000)}-0001`,
        address: address.trim() || 'Victoria Island Business District',
        state,
        currency: 'NGN',
        defaultVatPercent: 7.5,
        defaultWhtPercent: 5.0,
        bankDetails: {
          bankName: 'Guaranty Trust Bank (GTBank)',
          accountNumber: '0129384756',
          accountName: name.trim(),
        },
        subscription: {
          planId,
          status: 'active',
          billingInterval: interval,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
          autoRenew: true,
          assignedBySuperAdmin: true,
        },
      });

      onClose();
      // Reset form
      setName('');
      setEmail('');
      setPhone('+234 ');
      setRcNumber('');
      setTaxId('');
      setAddress('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Super Admin: Register New Business Subscriber"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Registered Business Name *"
          placeholder="e.g. Zenith Agrochemicals & Seeds Nig Ltd"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          leftAddon={<Building2 className="w-4 h-4 text-slate-400" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Owner / Contact Email *"
            type="email"
            placeholder="director@zenithseeds.ng"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftAddon={<Mail className="w-4 h-4 text-slate-400" />}
          />
          <Input
            label="Phone Number"
            placeholder="+234 803 123 4567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            leftAddon={<Phone className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="CAC RC / BN Number"
            placeholder="RC-2948102"
            value={rcNumber}
            onChange={e => setRcNumber(e.target.value)}
          />
          <Input
            label="FIRS TIN Number"
            placeholder="TIN-18492049-0001"
            value={taxId}
            onChange={e => setTaxId(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              State of Registration
            </label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Lagos">Lagos State</option>
              <option value="Abuja FCT">Abuja FCT</option>
              <option value="Rivers">Rivers (Port Harcourt)</option>
              <option value="Kano">Kano State</option>
              <option value="Oyo">Oyo (Ibadan)</option>
              <option value="Ogun">Ogun State</option>
              <option value="Enugu">Enugu State</option>
              <option value="Delta">Delta State</option>
              <option value="Kaduna">Kaduna State</option>
            </select>
          </div>

          <Input
            label="Office Address"
            placeholder="Plot 10, Industrial Estate"
            value={address}
            onChange={e => setAddress(e.target.value)}
            leftAddon={<MapPin className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Initial Assigned Subscription Tier
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SUBSCRIPTION_PLANS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={`p-2.5 rounded-lg text-xs font-bold text-center border-2 transition-all ${
                  planId === p.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {planId !== 'free' && (
            <div className="flex gap-2 pt-1">
              {(['monthly', '6months', 'annual'] as BillingInterval[]).map(cycle => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setInterval(cycle)}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg border uppercase tracking-wider ${
                    interval === cycle
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cycle === '6months' ? '6 Months' : cycle}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="emerald" isLoading={isSubmitting} leftIcon={<Plus className="w-4 h-4" />}>
            Provision Subscriber
          </Button>
        </div>
      </form>
    </Modal>
  );
};
