import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useBusiness } from '../../context/BusinessContext';
import { useNotification } from '../../context/NotificationContext';
import { BusinessRole } from '../../types';
import { Shield, UserPlus, Trash2, Building } from 'lucide-react';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NIGERIAN_BANKS = [
  'Access Bank', 'Guaranty Trust Bank (GTBank)', 'Zenith Bank', 'First Bank of Nigeria',
  'United Bank for Africa (UBA)', 'Fidelity Bank', 'Stanbic IBTC Bank', 'Sterling Bank',
  'Wema Bank / ALAT', 'Union Bank', 'Polaris Bank', 'Keystone Bank', 'Kuda Bank', 'Moniepoint MFB', 'OPay'
];

export const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({ isOpen, onClose }) => {
  const { activeBusiness, updateBusiness, members, inviteMember, removeMember } = useBusiness();
  const { error } = useNotification();

  // Profile fields
  const [name, setName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [tin, setTin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Lagos');
  const [bankName, setBankName] = useState('Access Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [defaultVat, setDefaultVat] = useState(7.5);
  const [defaultWht, setDefaultWht] = useState(5.0);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [quotationPrefix, setQuotationPrefix] = useState('QT');

  // Member invite fields
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<BusinessRole>('accountant');
  const [isInviting, setIsInviting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      setName(activeBusiness.name || '');
      setRcNumber(activeBusiness.rcNumber || '');
      setTin(activeBusiness.taxIdentificationNumber || '');
      setEmail(activeBusiness.email || '');
      setPhone(activeBusiness.phone || '');
      setAddress(activeBusiness.address || '');
      setState(activeBusiness.state || 'Lagos');
      setBankName(activeBusiness.bankDetails?.bankName || 'Access Bank');
      setAccountNumber(activeBusiness.bankDetails?.accountNumber || '');
      setAccountName(activeBusiness.bankDetails?.accountName || '');
      setDefaultVat(activeBusiness.defaultVatPercent ?? 7.5);
      setDefaultWht(activeBusiness.defaultWhtPercent ?? 5.0);
      setInvoicePrefix(activeBusiness.invoicePrefix || 'INV');
      setQuotationPrefix(activeBusiness.quotationPrefix || 'QT');
    }
  }, [activeBusiness, isOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    if (!name.trim()) {
      error('Name Required', 'Business name is required.');
      return;
    }

    try {
      setIsSaving(true);
      await updateBusiness(activeBusiness.id, {
        name: name.trim(),
        rcNumber: rcNumber.trim(),
        taxIdentificationNumber: tin.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        state,
        defaultVatPercent: defaultVat,
        defaultWhtPercent: defaultWht,
        invoicePrefix: invoicePrefix.trim() || 'INV',
        quotationPrefix: quotationPrefix.trim() || 'QT',
        bankDetails: {
          bankName,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        },
      });
      onClose();
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) {
      error('Missing Fields', 'Please provide email and name for the team member.');
      return;
    }

    try {
      setIsInviting(true);
      await inviteMember(inviteEmail.trim(), inviteName.trim(), inviteRole);
      setInviteEmail('');
      setInviteName('');
    } catch (err: any) {
      error('Invite Failed', err.message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Business Profile & Compliance Settings"
      description="Configure CAC registration, FIRS Tax Identification Number (TIN), NIBSS settlement bank, and team access."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Settings Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Registered Business Name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <Input
              label="CAC Registration / RC Number"
              placeholder="e.g. RC-1849204 or BN-394820"
              value={rcNumber}
              onChange={e => setRcNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="FIRS Tax Identification (TIN)"
              placeholder="e.g. 29481029-0001"
              value={tin}
              onChange={e => setTin(e.target.value)}
            />

            <Input
              label="Official Contact Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />

            <Input
              label="State / Region"
              value={state}
              onChange={e => setState(e.target.value)}
            />

            <Input
              label="Business Address"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Nigerian Bank Settlement Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              Official Nigerian Bank Settlement Account (Appears on Invoices)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Bank Name"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
              >
                {NIGERIAN_BANKS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>

              <Input
                label="NUBAN Account Number"
                placeholder="10-digit account no."
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                maxLength={10}
              />

              <Input
                label="Account Beneficiary Name"
                placeholder="Exact name on bank record"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
              />
            </div>
          </div>

          {/* Tax & Sequence Prefixes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Default VAT (%)"
              type="number"
              step="0.1"
              value={defaultVat}
              onChange={e => setDefaultVat(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Default WHT (%)"
              type="number"
              step="0.1"
              value={defaultWht}
              onChange={e => setDefaultWht(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Invoice Prefix"
              value={invoicePrefix}
              onChange={e => setInvoicePrefix(e.target.value)}
            />
            <Input
              label="Quote Prefix"
              value={quotationPrefix}
              onChange={e => setQuotationPrefix(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" isLoading={isSaving}>
              Save Business Profile
            </Button>
          </div>
        </form>

        {/* Team Membership & Access Policies Section */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                Team Members & Access Control (RBAC)
              </h4>
              <p className="text-[11px] text-slate-500">
                Grant scoped roles: Owner, Admin, Accountant, or Viewer. Access is strictly isolated to this business.
              </p>
            </div>
          </div>

          {/* Invite form */}
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="sm:col-span-4">
              <Input
                placeholder="Colleague Name"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="py-1.5 text-xs"
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                placeholder="colleague@domain.ng"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="py-1.5 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as BusinessRole)}
                className="py-1.5 text-xs"
              >
                <option value="accountant">Accountant</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                isLoading={isInviting}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Invite
              </Button>
            </div>
          </form>

          {/* Members list */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {members.length === 0 ? (
              <div className="p-3 text-center text-slate-500">
                Currently 1 active member (Business Owner).
              </div>
            ) : (
              members.map(member => (
                <div key={member.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900">{member.userName}</span>
                    <span className="text-slate-500 ml-2">({member.userEmail})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
