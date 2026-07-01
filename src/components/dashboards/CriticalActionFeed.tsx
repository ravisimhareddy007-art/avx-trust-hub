import React, { useState, useMemo } from 'react';
import { Shield, Key, Lock, AlertTriangle, Clock, Check, ChevronDown, ChevronUp, Ticket, Atom, Boxes, Building2, Inbox, ArrowUpRight, Radar } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard, feedItemToDriver } from '@/context/DashboardContext';
import { useNav } from '@/context/NavigationContext';
import { VIOLATION_FILTERS } from '@/lib/filters/cryptoFilters';

const fmt = (n: number) => n.toLocaleString();

// One ticket is created per group row. Counts within a dimension sum to the item total.
interface TicketGroup {
  name: string;
  count: number;
  team: string;
}

type GroupDimension = 'objectType' | 'inventoryGroup' | 'ticketingTarget';

interface ActionItem {
  id: string;
  category: 'Certs' | 'SSH' | 'Secrets' | 'PQC';
  icon: React.ComponentType<{ className?: string }>;
  severity: 'P1' | 'P2' | 'P3';
  title: string;
  detail: string;
  filterId?: string;               // drill target in inventory
  ageMins: number;
  groups: Record<GroupDimension, TicketGroup[]>;
  isPqc?: boolean;
}

// MVP-discoverable violations only. No code-repo secret scanning, code signing, or K8s remediation.
const FEED: ActionItem[] = [
  {
    id: '1', category: 'Certs', icon: Shield, severity: 'P1',
    title: `${fmt(VIOLATION_FILTERS.cert_expiring_7d.enterpriseCount)} certificates expiring in 7 days`,
    detail: 'No auto-renewal configured · dependent services impacted',
    filterId: 'cert_expiring_7d',
    ageMins: 12,
    groups: {
      objectType: [
        { name: 'Wildcard TLS', count: 42, team: 'infra-ops' },
        { name: 'Leaf / edge TLS', count: 120, team: 'app-team' },
        { name: 'Internal mTLS', count: 24, team: 'platform-eng' },
      ],
      inventoryGroup: [
        { name: 'Payments Platform', count: 68, team: 'payments-eng' },
        { name: 'Public Web Estate', count: 90, team: 'app-team' },
        { name: 'Corp Internal', count: 28, team: 'infra-ops' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · Infra-Ops', count: 110, team: 'infra-ops' },
        { name: 'ServiceNow · AppSec', count: 76, team: 'appsec' },
      ],
    },
  },
  {
    id: 'expired', category: 'Certs', icon: Shield, severity: 'P1',
    title: `${fmt(VIOLATION_FILTERS.cert_expired.enterpriseCount)} certificates already expired`,
    detail: 'Live endpoints · immediate outage and trust-failure risk',
    filterId: 'cert_expired',
    ageMins: 40,
    groups: {
      objectType: [
        { name: 'Leaf / edge TLS', count: 40, team: 'app-team' },
        { name: 'Internal mTLS', count: 8, team: 'platform-eng' },
      ],
      inventoryGroup: [
        { name: 'Public Web Estate', count: 34, team: 'app-team' },
        { name: 'Corp Internal', count: 14, team: 'infra-ops' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · AppSec', count: 48, team: 'appsec' },
      ],
    },
  },
  {
    id: '6', category: 'Certs', icon: Shield, severity: 'P2',
    title: `${fmt(VIOLATION_FILTERS.cert_weak_algo.enterpriseCount)} certificates use weak algorithms`,
    detail: 'RSA-1024 / SHA-1 · re-issue on compliant algorithm required',
    filterId: 'cert_weak_algo',
    ageMins: 240,
    groups: {
      objectType: [
        { name: 'SHA-1 signed', count: 30, team: 'infra-platform' },
        { name: 'RSA-1024 keys', count: 22, team: 'infra-platform' },
      ],
      inventoryGroup: [
        { name: 'Corp PKI', count: 34, team: 'infra-platform' },
        { name: 'Dev Sandbox', count: 18, team: 'dev-platform' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · Infra-Platform', count: 52, team: 'infra-platform' },
      ],
    },
  },
  {
    id: '3', category: 'SSH', icon: Key, severity: 'P1',
    title: `${fmt(VIOLATION_FILTERS.ssh_suspicious.enterpriseCount)} suspicious SSH keys with shell access`,
    detail: 'Anomalous login patterns · production hosts',
    filterId: 'ssh_suspicious',
    ageMins: 95,
    groups: {
      objectType: [
        { name: 'User keys', count: 28, team: 'infra-ops' },
        { name: 'Host / service keys', count: 16, team: 'dev-platform' },
      ],
      inventoryGroup: [
        { name: 'Production Fleet', count: 30, team: 'infra-ops' },
        { name: 'Staging', count: 14, team: 'dev-platform' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · Infra-Ops', count: 44, team: 'infra-ops' },
      ],
    },
  },
  {
    id: '9', category: 'SSH', icon: Key, severity: 'P3',
    title: `${fmt(VIOLATION_FILTERS.ssh_rogue.enterpriseCount)} rogue SSH keys not provisioned by platform`,
    detail: 'Found in filesystem and vault keystores · move under managed SSH CA',
    filterId: 'ssh_rogue',
    ageMins: 720,
    groups: {
      objectType: [
        { name: 'Filesystem keys', count: 12, team: 'infra-ops' },
        { name: 'Vault-stored keys', count: 6, team: 'platform-eng' },
      ],
      inventoryGroup: [
        { name: 'Production Fleet', count: 11, team: 'infra-ops' },
        { name: 'Corp Internal', count: 7, team: 'platform-eng' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · Infra-Ops', count: 18, team: 'infra-ops' },
      ],
    },
  },
  {
    id: '8', category: 'Secrets', icon: Lock, severity: 'P2',
    title: `${fmt(VIOLATION_FILTERS.secret_unrotated_90d.enterpriseCount)} secrets not rotated in 90+ days`,
    detail: 'HashiCorp Vault, CyberArk Conjur, and HSM scope · production',
    filterId: 'secret_unrotated_90d',
    ageMins: 480,
    groups: {
      objectType: [
        { name: 'Vault-stored', count: 720, team: 'platform-eng' },
        { name: 'Conjur-stored', count: 330, team: 'cloud-eng' },
        { name: 'HSM-backed', count: 200, team: 'security-eng' },
      ],
      inventoryGroup: [
        { name: 'Platform Services', count: 620, team: 'platform-eng' },
        { name: 'Cloud Estate', count: 410, team: 'cloud-eng' },
        { name: 'Data Platform', count: 220, team: 'data-eng' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · Platform-Eng', count: 620, team: 'platform-eng' },
        { name: 'ServiceNow · Cloud-Eng', count: 630, team: 'cloud-eng' },
      ],
    },
  },
  {
    id: 'orphaned', category: 'Secrets', icon: Lock, severity: 'P3',
    title: `${fmt(VIOLATION_FILTERS.secret_orphaned.enterpriseCount)} orphaned secrets with no active owner`,
    detail: 'No active owner · rotation and revocation blocked until reassigned',
    filterId: 'secret_orphaned',
    ageMins: 1440,
    groups: {
      objectType: [
        { name: 'Vault-stored', count: 260, team: 'platform-eng' },
        { name: 'Conjur-stored', count: 185, team: 'cloud-eng' },
      ],
      inventoryGroup: [
        { name: 'Platform Services', count: 240, team: 'platform-eng' },
        { name: 'Cloud Estate', count: 205, team: 'cloud-eng' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · Platform-Eng', count: 445, team: 'platform-eng' },
      ],
    },
  },
  {
    id: 'pqc-1', category: 'PQC', icon: Atom, severity: 'P2',
    title: '847 production certs use RSA-2048 and expire after 2030',
    detail: 'Post-NIST-deadline exposure · deprecate by 2030, disallow by 2035',
    filterId: 'cert_weak_algo',
    ageMins: 60,
    isPqc: true,
    groups: {
      objectType: [
        { name: 'RSA-2048 TLS', count: 690, team: 'payments-eng' },
        { name: 'RSA-2048 signing', count: 157, team: 'security-eng' },
      ],
      inventoryGroup: [
        { name: 'Payments Platform', count: 520, team: 'payments-eng' },
        { name: 'Public Web Estate', count: 327, team: 'app-team' },
      ],
      ticketingTarget: [
        { name: 'ServiceNow · QTH Migration Queue', count: 847, team: 'crypto-eng' },
      ],
    },
  },
];

const SEV_STYLES: Record<ActionItem['severity'], string> = {
  P1: 'bg-coral/15 text-coral border-coral/30',
  P2: 'bg-amber/15 text-amber border-amber/30',
  P3: 'bg-purple/15 text-purple border-purple/30',
};

// Provenance: which MVP discovery method surfaced this class of finding.
const CATEGORY_SOURCE: Record<ActionItem['category'], string> = {
  Certs:   'CA Scan',
  SSH:     'Network Scan',
  Secrets: 'Key Store Discovery',
  PQC:     'CBOM Ingestion',
};

const SEV_TICKET_PRIORITY: Record<ActionItem['severity'], string> = {
  P1: 'P1 · Critical',
  P2: 'P2 · High',
  P3: 'P3 · Moderate',
};

const DIMENSIONS: { key: GroupDimension; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'objectType',     label: 'Crypto object type', icon: Boxes },
  { key: 'inventoryGroup', label: 'Inventory group',    icon: Building2 },
  { key: 'ticketingTarget',label: 'Ticketing target',   icon: Inbox },
];

function ageLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

type FilterKey = 'All' | 'Certificates' | 'Secrets' | 'SSH Keys' | 'Quantum';

const FILTER_MAP: Record<FilterKey, ActionItem['category'][] | null> = {
  'All': null,
  'Certificates': ['Certs'],
  'Secrets': ['Secrets'],
  'SSH Keys': ['SSH'],
  'Quantum': ['PQC'],
};

const FILTERS: FilterKey[] = ['All', 'Certificates', 'SSH Keys', 'Secrets', 'Quantum'];

export default function CriticalActionFeed() {
  const { hoveredDriver, resolvedFeedItems, resolveFeedItem } = useDashboard();
  const { setCurrentPage, setFilters } = useNav();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [groupBy, setGroupBy] = useState<GroupDimension>('objectType');

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { 'All': 0, 'Certificates': 0, 'Secrets': 0, 'SSH Keys': 0, 'Quantum': 0 };
    FEED.forEach(item => {
      c['All']++;
      (Object.keys(FILTER_MAP) as FilterKey[]).forEach(k => {
        const cats = FILTER_MAP[k];
        if (cats && cats.includes(item.category)) c[k]++;
      });
    });
    return c;
  }, []);

  const items = useMemo(() => {
    const cats = FILTER_MAP[filter];
    const filtered = cats ? FEED.filter(i => cats.includes(i.category)) : FEED;
    const decorated = filtered.map(item => ({
      ...item,
      highlighted: hoveredDriver != null && feedItemToDriver[item.id] === hoveredDriver,
      isQueued: resolvedFeedItems.has(item.id),
    }));
    return [
      ...decorated.filter(i => !i.isQueued),
      ...decorated.filter(i => i.isQueued),
    ];
  }, [hoveredDriver, resolvedFeedItems, filter]);

  const drillToInventory = (filterId?: string) => {
    setFilters({ tab: 'identities', filterId: filterId || '' });
    setCurrentPage('inventory');
  };

  const createTickets = (item: ActionItem) => {
    const groups = item.groups[groupBy];
    resolveFeedItem(item.id);
    setExpanded(null);
    toast.success(
      groups.length > 1
        ? `${groups.length} ServiceNow tickets created`
        : 'ServiceNow ticket created',
      {
        description: `Grouped by ${DIMENSIONS.find(d => d.key === groupBy)!.label.toLowerCase()} · view in Tickets`,
        action: { label: 'Open Tickets', onClick: () => setCurrentPage('tickets') },
      },
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      <div className="px-4 pt-4 pb-2.5 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <h2 className="text-sm font-semibold text-foreground">Critical Action Feed</h2>
            <span className="truncate text-[10px] text-muted-foreground">· ranked by impact × urgency · click a row to raise tickets</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {filter === 'All' ? `${FEED.length} items` : `${items.length} of ${FEED.length}`}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-teal text-primary-foreground border-teal shadow-[0_0_0_2px_hsl(var(--teal)/0.15)]'
                    : 'bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:border-teal/40'
                }`}
              >
                {f}
                <span className={`min-w-4 text-center text-[9px] px-1 rounded ${active ? 'bg-primary-foreground/20' : 'bg-background/60'}`}>
                  {counts[f]}
                </span>
              </button>
            );
          })}
          {filter !== 'All' && (
            <button
              onClick={() => setFilter('All')}
              className="text-[10px] text-muted-foreground hover:text-coral underline-offset-2 hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ul className="divide-y divide-border">
          {items.map(item => {
            const Icon = item.icon;
            const isExpanded = expanded === item.id;
            const isQueued = item.isQueued;
            const groups = item.groups[groupBy];
            const totalObjects = groups.reduce((s, g) => s + g.count, 0);

            return (
              <li
                key={item.id}
                className={`transition-all border-l-2 ${
                  isQueued
                    ? 'bg-secondary/20 border-l-teal/40 opacity-70'
                    : item.highlighted
                      ? 'bg-coral/[0.03] border-l-coral'
                      : 'border-l-transparent hover:bg-secondary/20'
                }`}
              >
                <button
                  onClick={() => !isQueued && setExpanded(isExpanded ? null : item.id)}
                  disabled={isQueued}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 disabled:cursor-default"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isQueued ? 'bg-teal/20' : 'bg-secondary/60'
                  }`}>
                    {isQueued ? <Check className="w-3 h-3 text-teal" /> : <Icon className="w-3 h-3 text-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}>{item.severity}</span>
                      <span className="text-[9.5px] text-muted-foreground">{item.category}</span>
                      <span className="text-[9.5px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {ageLabel(item.ageMins)} ago
                      </span>
                      <span className="text-[9.5px] text-muted-foreground/70 flex items-center gap-0.5" title="Discovery source">
                        <Radar className="w-2.5 h-2.5" /> {CATEGORY_SOURCE[item.category]}
                      </span>
                      {isQueued && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-teal/15 text-teal flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Tickets raised
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] font-medium text-foreground leading-snug">{item.title}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                  {!isQueued && (
                    isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </button>

                {isExpanded && !isQueued && (
                  <div className="px-5 pb-3 ml-10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="rounded-md bg-secondary/40 border border-teal/20 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] uppercase tracking-wider text-teal font-semibold flex items-center gap-1">
                          <Ticket className="w-2.5 h-2.5" /> Create remediation tickets
                        </p>
                        <button
                          onClick={() => drillToInventory(item.filterId)}
                          className="text-[10px] text-muted-foreground hover:text-teal flex items-center gap-0.5"
                        >
                          View in inventory <ArrowUpRight className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Grouping selector */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="text-[10px] text-muted-foreground">Group by</span>
                        <div className="inline-flex rounded-md border border-border overflow-hidden">
                          {DIMENSIONS.map(d => {
                            const DIcon = d.icon;
                            const active = groupBy === d.key;
                            return (
                              <button
                                key={d.key}
                                onClick={(e) => { e.stopPropagation(); setGroupBy(d.key); }}
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 transition-colors ${
                                  active
                                    ? 'bg-teal text-primary-foreground'
                                    : 'bg-card text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <DIcon className="w-2.5 h-2.5" /> {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* One ticket per group row */}
                      <div className="rounded border border-border overflow-hidden mb-2.5 bg-card">
                        <table className="w-full text-[10px]">
                          <thead className="bg-secondary/40">
                            <tr className="text-muted-foreground">
                              <th className="text-left px-2 py-1.5 font-medium">Ticket group</th>
                              <th className="text-right px-2 py-1.5 font-medium">Objects</th>
                              <th className="text-left px-2 py-1.5 font-medium">Assignee team</th>
                              <th className="text-left px-2 py-1.5 font-medium">Priority</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map((g, i) => (
                              <tr key={i} className="border-t border-border">
                                <td className="px-2 py-1.5 text-foreground font-medium">{g.name}</td>
                                <td className="px-2 py-1.5 text-foreground tabular-nums text-right">{g.count.toLocaleString()}</td>
                                <td className="px-2 py-1.5 text-muted-foreground font-mono">{g.team}</td>
                                <td className="px-2 py-1.5">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}>
                                    {SEV_TICKET_PRIORITY[item.severity]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p className="text-[10.5px] text-foreground leading-snug mb-2.5">
                        Creates <span className="font-semibold">{groups.length} ServiceNow {groups.length > 1 ? 'tickets' : 'ticket'}</span> covering <span className="font-semibold tabular-nums">{totalObjects.toLocaleString()}</span> objects. One ticket per group, assigned to the owning team.
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => createTickets(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"
                        >
                          <Ticket className="w-3 h-3" /> Create {groups.length} {groups.length > 1 ? 'tickets' : 'ticket'}
                        </button>
                        <button
                          onClick={() => setExpanded(null)}
                          className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isQueued && (
                  <p className="px-5 pb-2 ml-10 text-[10px] text-teal">
                    Tickets raised in ServiceNow · #TKT-{1000 + (Number(item.id) || item.id.length) * 37} · view in Tickets
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}