import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { formatNaira } from '../lib/money';
import { Table, Column } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Customer } from '../types';
import { CustomerModal } from '../components/customers/CustomerModal';
import { Plus, Edit2, Trash2, Eye, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const CustomersView: React.FC = () => {
  const { customers, deleteCustomer, invoices, payments } = useBusiness();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [viewHistoryCustomer, setViewHistoryCustomer] = useState<Customer | null>(null);

  const handleEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setCustomerToEdit(null);
    setIsModalOpen(true);
  };

  const columns: Column<Customer>[] = [
    {
      header: 'Customer',
      accessorKey: 'name',
      cell: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{c.name}</span>
            {c.businessName && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                {c.businessName}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      cell: c => (
        <div className="text-xs space-y-0.5">
          {c.phone && (
            <div className="text-slate-600 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{c.phone}</span>
            </div>
          )}
          {c.email && (
            <div className="text-slate-500 flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{c.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      cell: c => (
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{c.state || 'Lagos'}</span>
        </span>
      ),
    },
    {
      header: 'Total Invoiced',
      accessorKey: 'totalInvoicedMinor',
      className: 'text-right',
      cell: c => <span className="font-mono text-slate-900 font-semibold">{formatNaira(c.totalInvoicedMinor)}</span>,
    },
    {
      header: 'Total Paid',
      accessorKey: 'totalPaidMinor',
      className: 'text-right',
      cell: c => <span className="font-mono text-emerald-600 font-semibold">{formatNaira(c.totalPaidMinor)}</span>,
    },
    {
      header: 'Outstanding Balance',
      accessorKey: 'outstandingBalanceMinor',
      className: 'text-right',
      cell: c => (
        <span className={`font-mono font-bold ${c.outstandingBalanceMinor > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
          {formatNaira(c.outstandingBalanceMinor)}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: c => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setViewHistoryCustomer(c)}
            title="Transaction History"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(c)}
            title="Edit Customer"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteCustomer(c.id)}
            title="Delete Customer"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Customer Transaction History Modal
  const customerInvoices = viewHistoryCustomer
    ? invoices.filter(i => i.customerId === viewHistoryCustomer.id)
    : [];
  const customerPayments = viewHistoryCustomer
    ? payments.filter(p => p.customerId === viewHistoryCustomer.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer CRM & Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage clients, Nigerian corporate billing details, and reconciled ledger balances.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleNew}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Customer
        </Button>
      </div>

      <Table
        data={customers}
        columns={columns}
        keyExtractor={c => c.id}
        searchPlaceholder="Search customer by name, business, phone, or email..."
        searchFilter={(c, query) =>
          c.name.toLowerCase().includes(query) ||
          (c.businessName && c.businessName.toLowerCase().includes(query)) ||
          c.phone.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.state.toLowerCase().includes(query)
        }
        onRowClick={c => setViewHistoryCustomer(c)}
      />

      {/* Edit/Create Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerToEdit={customerToEdit}
      />

      {/* Customer Detail & Transaction History Modal */}
      {viewHistoryCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setViewHistoryCustomer(null)}
          title={viewHistoryCustomer.name}
          description={viewHistoryCustomer.businessName || 'Customer Ledger & Transaction History'}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Balances Summary Banner */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Invoiced</span>
                <p className="font-mono text-sm font-bold text-slate-900 mt-1">
                  {formatNaira(viewHistoryCustomer.totalInvoicedMinor)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Total Paid</span>
                <p className="font-mono text-sm font-bold text-emerald-600 mt-1">
                  {formatNaira(viewHistoryCustomer.totalPaidMinor)}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Balance Due</span>
                <p className={`font-mono text-sm font-bold mt-1 ${viewHistoryCustomer.outstandingBalanceMinor > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatNaira(viewHistoryCustomer.outstandingBalanceMinor)}
                </p>
              </div>
            </div>

            {/* Invoices list */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                Invoices ({customerInvoices.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {customerInvoices.length === 0 ? (
                  <p className="p-3 text-center text-slate-400">No invoices issued to this customer.</p>
                ) : (
                  customerInvoices.map(inv => (
                    <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <span className="text-slate-400 ml-2">{inv.issueDate}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatNaira(inv.totalMinor)}</span>
                        <span className="text-[11px] block text-slate-500">Bal: {formatNaira(inv.balanceDueMinor)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payments list */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                Payments Received ({customerPayments.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {customerPayments.length === 0 ? (
                  <p className="p-3 text-center text-slate-400">No payments recorded from this customer.</p>
                ) : (
                  customerPayments.map(p => (
                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900">{p.paymentNumber}</span>
                        <span className="text-slate-500 ml-2 capitalize">({p.paymentMethod.replace('_', ' ')})</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Ref: {p.reference}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-600">+{formatNaira(p.amountMinor)}</span>
                        <span className="text-[11px] block text-slate-400">{p.paymentDate}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewHistoryCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
