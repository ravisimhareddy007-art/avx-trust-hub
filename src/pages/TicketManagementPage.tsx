import React, { useState } from 'react';
import { StatusBadge, SeverityBadge } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import {
  Ticket, Search, Plus, ExternalLink, ArrowUpDown, Clock, CheckCircle,
  AlertTriangle, MoreVertical, RefreshCw, MessageSquare
} from 'lucide-react';

interface TicketItem {
  id: string;
  summary: string;
  type: 'License Request' | 'Remediation' | 'Provisioning' | 'Incident' | 'Change Request';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Pending Approval' | 'Resolved' | 'Closed';
  assignee: string;
  reporter: string;
  module: string;
  externalId?: string;
  externalSystem?: 'ServiceNow' | 'Jira' | 'PagerDuty';
  created: string;
  updated: string;
  linkedAssets: number;
}

const mockTickets: TicketItem[] = [
  { id: 'TKT-001', summary: 'Request Code Signing add-on license', type: 'License Request', priority: 'High', status: 'In Progress', assignee: 'IT Procurement', reporter: 'Sarah Chen', module: 'Code Signing', externalId: 'INC0012345', externalSystem: 'ServiceNow', created: '2026-04-12', updated: '2026-04-14', linkedAssets: 2 },
  { id: 'TKT-002', summary: 'Renew *.payments.acmecorp.com — expires in 6 days', type: 'Remediation', priority: 'Critical', status: 'Open', assignee: 'Sarah Chen', reporter: 'System', module: 'CLM', externalId: 'CERT-789', externalSystem: 'Jira', created: '2026-04-14', updated: '2026-04-14', linkedAssets: 1 },
  { id: 'TKT-003', summary: 'PQC migration — Batch 1 payment certs', type: 'Change Request', priority: 'High', status: 'Pending Approval', assignee: 'Security Team', reporter: 'James Wilson', module: 'CLM', created: '2026-04-10', updated: '2026-04-13', linkedAssets: 8 },
  { id: 'TKT-004', summary: 'Rotate orphaned SSH key prod-db-01', type: 'Remediation', priority: 'High', status: 'Open', assignee: 'Unassigned', reporter: 'System', module: 'SSH', externalId: 'PD-4567', externalSystem: 'PagerDuty', created: '2026-04-13', updated: '2026-04-14', linkedAssets: 1 },
  { id: 'TKT-005', summary: 'Request Encryption Keys module license', type: 'License Request', priority: 'Medium', status: 'Open', assignee: 'IT Procurement', reporter: 'Mike Rodriguez', module: 'Encryption Keys', created: '2026-04-11', updated: '2026-04-11', linkedAssets: 0 },
  { id: 'TKT-006', summary: 'Provision new SSH CA certificate for k8s nodes', type: 'Provisioning', priority: 'Medium', status: 'Resolved', assignee: 'Platform Team', reporter: 'Lisa Park', module: 'SSH', created: '2026-04-08', updated: '2026-04-12', linkedAssets: 24 },
  { id: 'TKT-007', summary: 'Expired SOC autonomous agent token', type: 'Incident', priority: 'Critical', status: 'In Progress', assignee: 'Security Operations', reporter: 'System', module: 'AI Agents', externalId: 'PD-4590', externalSystem: 'PagerDuty', created: '2026-04-13', updated: '2026-04-14', linkedAssets: 1 },
  { id: 'TKT-008', summary: 'Request API Keys & Secrets module license', type: 'License Request', priority: 'Medium', status: 'Closed', assignee: 'IT Procurement', reporter: 'DevOps', module: 'Secrets', created: '2026-04-05', updated: '2026-04-09', linkedAssets: 0 },
];

const statusColors: Record<string, string> = {
  'Open': 'bg-coral/10 text-coral',
  'In Progress': 'bg-teal/10 text-teal',
  'Pending Approval': 'bg-amber/10 text-amber',
  'Resolved': 'bg-teal/10 text-teal',
  'Closed': 'bg-muted text-muted-foreground',
};

export default function TicketManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const filtered = mockTickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (search && !t.summary.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    all: mockTickets.length,
    Open: mockTickets.filter(t => t.status === 'Open').length,
    'In Progress': mockTickets.filter(t => t.status === 'In Progress').length,
    'Pending Approval': mockTickets.filter(t => t.status === 'Pending Approval').length,
    Resolved: mockTickets.filter(t => t.status === 'Resolved').length,
    Closed: mockTickets.filter(t => t.status === 'Closed').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Ticket className="w-5 h-5 text-teal" /> Ticket Management</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Bi-directional ticket tracking across ServiceNow, Jira, and PagerDuty</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.info('Syncing with external systems...')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] border border-border rounded-lg hover:bg-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Now
          </button>
          <button onClick={() => toast.info('Create ticket form...')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal-light">
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Open', count: statusCounts.Open, color: 'text-coral' },
          { label: 'In Progress', count: statusCounts['In Progress'], color: 'text-teal' },
          { label: 'Pending Approval', count: statusCounts['Pending Approval'], color: 'text-amber' },
          { label: 'Resolved', count: statusCounts.Resolved, color: 'text-teal' },
          { label: 'Closed', count: statusCounts.Closed, color: 'text-muted-foreground' },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(statusFilter === s.label ? 'all' : s.label)}
            className={`bg-card rounded-lg border p-3 text-center hover:bg-secondary/30 transition-colors ${statusFilter === s.label ? 'border-teal' : 'border-border'}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..."
            className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground">
          <option value="all">All Types</option>
          <option>License Request</option><option>Remediation</option><option>Provisioning</option>
          <option>Incident</option><option>Change Request</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-secondary/50">
            <tr className="border-b border-border">
              {['Ticket ID', 'Summary', 'Type', 'Priority', 'Status', 'Module', 'Assignee', 'External', 'Assets', 'Updated'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(ticket => (
              <tr key={ticket.id} className="border-b border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                <td className="py-2.5 px-3 font-mono text-[10px] text-teal">{ticket.id}</td>
                <td className="py-2.5 px-3 font-medium text-foreground max-w-[250px] truncate">{ticket.summary}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{ticket.type}</td>
                <td className="py-2.5 px-3"><SeverityBadge severity={ticket.priority} /></td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[ticket.status]}`}>{ticket.status}</span>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground">{ticket.module}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{ticket.assignee}</td>
                <td className="py-2.5 px-3">
                  {ticket.externalId ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-teal">
                      <ExternalLink className="w-3 h-3" /> {ticket.externalSystem} #{ticket.externalId}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground">{ticket.linkedAssets}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{ticket.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail drawer (simple modal) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{selectedTicket.id} — {selectedTicket.summary}</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div><p className="text-[10px] text-muted-foreground">Type</p><p className="font-medium">{selectedTicket.type}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Priority</p><SeverityBadge severity={selectedTicket.priority} /></div>
              <div><p className="text-[10px] text-muted-foreground">Status</p><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[selectedTicket.status]}`}>{selectedTicket.status}</span></div>
              <div><p className="text-[10px] text-muted-foreground">Assignee</p><p className="font-medium">{selectedTicket.assignee}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Reporter</p><p className="font-medium">{selectedTicket.reporter}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Module</p><p className="font-medium">{selectedTicket.module}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Created</p><p className="font-medium">{selectedTicket.created}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Updated</p><p className="font-medium">{selectedTicket.updated}</p></div>
            </div>
            {selectedTicket.externalId && (
              <div className="bg-secondary/30 rounded-lg p-3 text-[11px]">
                <p className="font-medium mb-1 flex items-center gap-1"><ExternalLink className="w-3 h-3 text-teal" /> External Link</p>
                <p className="text-muted-foreground">{selectedTicket.externalSystem} — <span className="text-teal font-mono">{selectedTicket.externalId}</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">Bi-directional sync active. Status changes propagate automatically.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { toast.success('Status updated'); setSelectedTicket(null); }} className="px-3 py-1.5 text-[11px] bg-teal text-primary-foreground rounded-lg hover:bg-teal-light">Update Status</button>
              <button onClick={() => toast.info('Adding comment...')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] border border-border rounded-lg hover:bg-secondary">
                <MessageSquare className="w-3 h-3" /> Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
