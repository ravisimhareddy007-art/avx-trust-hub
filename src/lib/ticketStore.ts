// Tiny client-side ticket store. Lets tickets created anywhere in the app
// (Inventory, Quantum Readiness, etc.) surface on the Ticket Management page.

import type { TicketDraft } from '@/components/inventory/TicketDraftModal';

export interface StoredTicket {
  id: string;
  summary: string;
  type: TicketDraft['type'];
  priority: TicketDraft['priority'];
  status: 'Open' | 'In Progress' | 'Pending Approval' | 'Resolved' | 'Closed';
  assignee: string;
  reporter: string;
  module: string;
  externalId?: string;
  externalSystem?: 'ServiceNow' | 'Jira' | 'PagerDuty';
  created: string;
  updated: string;
  linkedAssets: number;
  objectId?: string;
}

const KEY = 'trustplatform.tickets.v1';

function load(): StoredTicket[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(list: StoredTicket[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* noop */ }
}

let seq = 100;
function nextId() {
  const list = load();
  const max = list.reduce((m, t) => {
    const n = parseInt(t.id.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, seq);
  return `TKT-${String(max + 1).padStart(3, '0')}`;
}

export function mockIncidentNumber() {
  return `INC${String(1_000_000 + Math.floor(Math.random() * 8_999_999))}`;
}

export function addTicket(draft: TicketDraft, opts?: {
  destination?: 'default' | 'servicenow';
  externalId?: string;
  reporter?: string;
  linkedAssets?: number;
  objectId?: string;
}): StoredTicket {
  const today = new Date().toISOString().slice(0, 10);
  const ticket: StoredTicket = {
    id: nextId(),
    summary: draft.title,
    type: draft.type,
    priority: draft.priority,
    status: 'Open',
    assignee: draft.assignee,
    reporter: opts?.reporter ?? 'Quantum Readiness',
    module: draft.module,
    externalId: opts?.externalId,
    externalSystem: opts?.destination === 'servicenow' ? 'ServiceNow' : undefined,
    created: today,
    updated: today,
    linkedAssets: opts?.linkedAssets ?? 1,
    objectId: opts?.objectId,
  };
  const list = load();
  list.unshift(ticket);
  save(list);
  return ticket;
}

export function listTickets(): StoredTicket[] {
  return load();
}

// Most recent ticket raised for a given crypto object, if any.
export function ticketForObject(objectId: string): StoredTicket | undefined {
  return load().find(t => t.objectId === objectId);
}
