import React from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Table, Column } from '../components/common/Table';
import { AuditLog } from '../types';
import { ShieldCheck, History, User } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useBusiness();

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: a => (
        <span className="font-mono text-xs text-slate-500">
          {new Date(a.timestamp).toLocaleString('en-NG')}
        </span>
      ),
    },
    {
      header: 'Entity',
      accessorKey: 'entityType',
      cell: a => (
        <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {a.entityType}
        </span>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: a => (
        <span className="capitalize font-semibold text-xs text-slate-800">
          {a.action.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: a => <span className="text-xs text-slate-700">{a.description}</span>,
    },
    {
      header: 'Actor / User',
      accessorKey: 'userName',
      cell: a => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>{a.userName}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Compliance Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Append-only immutable record of all financial mutations, status modifications, allocations, and user actions.
        </p>
      </div>

      <Table
        data={auditLogs}
        columns={columns}
        keyExtractor={a => a.id}
        searchPlaceholder="Search audit trail by description, user, or entity..."
        searchFilter={(a, query) =>
          a.description.toLowerCase().includes(query) ||
          a.userName.toLowerCase().includes(query) ||
          a.entityType.toLowerCase().includes(query) ||
          a.action.toLowerCase().includes(query)
        }
      />
    </div>
  );
};
