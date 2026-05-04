import React, { useState, useMemo, useEffect } from 'react';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { VIOLATION_FILTERS } from '@/lib/filters/cryptoFilters';
import { mockITAssets } from '@/data/inventoryMockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';
import { useAgent } from '@/context/AgentContext';
import { useNav } from '@/context/NavigationContext';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry } from '@/components/shared/UIComponents';
import {
  Search, X, Info, Atom, FileEdit, ArrowRight,
  RefreshCw, UserPlus, Ticket, Lock, ChevronUp, ChevronDown,
  Filter as FilterIcon, MoreVertical,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import AgentDetailPanel from '@/components/inventory/AgentDetailPanel';
import CryptoObjectRiskDrawer from '@/components/risk/CryptoObjectRiskDrawer';
import DeployToDeviceModal from '@/components/integrations/DeployToDeviceModal';
import TicketDraftModal, { TicketDraft } from '@/components/inventory/TicketDraftModal';
import { computeCRS } from '@/lib/risk/crs';

// CRS lookup memoised per render via module-level WeakMap
const _crsCache = new WeakMap<CryptoAsset, number>();
function crsScore(a: CryptoAsset): number {
  const cached = _crsCache.get(a);
  if (cached !== undefined) return cached;
  const v = computeCRS(a).crs;
  _crsCache.set(a, v);
  return v;
}

interface Props { onCreateTicket: (ctx: unknown) => void; }

// ── Type filter tabs ──────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: 'All',                      label: 'All Identities' },
  { key: 'TLS Certificate',          label: 'Certificates'   },
  { key: 'SSH Key',                  label: 'SSH Keys'        },
  { key: 'SSH Certificate',          label: 'SSH Certs'       },
  { key: 'Code-Signing Certificate', label: 'Code Signing'   },
  { key: 'K8s Workload Cert',        label: 'K8s Certs'      },
  { key: 'Encryption Key',           label: 'Enc Keys'        },
  { key: 'AI Agent Token',           label: 'AI Tokens'      },
  { key: 'API Key / Secret',         label: 'Secrets'        },
];

// ── Column definitions per type ───────────────────────────────────────────────

interface ColDef { key: string; label: string; cls: string; }

const COLS: Record<string, ColDef[]> = {
  All: [
    { key: 'name',         label: 'Name',         cls: 'w-auto min-w-[180px] max-w-0' },
    { key: 'type',         label: 'Type',         cls: 'w-28' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',          cls: 'w-20' },
    { key: 'owner',        label: 'Owner',        cls: 'w-32' },
    { key: 'environment',  label: 'Env',          cls: 'w-20' },
    { key: 'lastActivity', label: 'Last Activity',cls: 'w-32' },
    { key: 'violations',   label: 'Violations',   cls: 'w-24 text-center' },
    { key: 'riskScore',    label: 'Risk',         cls: 'w-20 text-right pr-4' },
  ],
  'TLS Certificate': [
    { key: 'name',         label: 'Common Name',  cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'caIssuer',     label: 'CA / Issuer',  cls: 'w-36' },
    { key: 'algorithm',    label: 'Algorithm',    cls: 'w-24' },
    { key: 'expiryDays',   label: 'Expiry',       cls: 'w-36' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',          cls: 'w-20' },
    { key: 'violations',   label: 'Violations',   cls: 'w-24 text-center' },
    { key: 'riskScore',    label: 'Risk',         cls: 'w-20 text-right pr-4' },
  ],
  'SSH Key': [
    { key: 'name',         label: 'Key Name',     cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'algorithm',    label: 'Key Type',     cls: 'w-24' },
    { key: 'owner',        label: 'Owner',        cls: 'w-28' },
    { key: 'sshLastUsed',  label: 'Last Used',    cls: 'w-28' },
    { key: 'lastRotated',  label: 'Last Rotated', cls: 'w-28' },
    { key: 'sshHosts',     label: 'Hosts',        cls: 'w-14 text-center' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',          cls: 'w-20' },
    { key: 'riskScore',    label: 'Risk',         cls: 'w-20 text-right pr-4' },
  ],
  'SSH Certificate': [
    { key: 'name',         label: 'Cert Name',    cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'caIssuer',     label: 'CA',           cls: 'w-36' },
    { key: 'commonName',   label: 'Principals',   cls: 'w-36' },
    { key: 'expiryDays',   label: 'Expiry',       cls: 'w-36' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'riskScore',    label: 'Risk',         cls: 'w-20 text-right pr-4' },
  ],
  'Code-Signing Certificate': [
    { key: 'name',          label: 'Cert Name',   cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'caIssuer',      label: 'CA',          cls: 'w-36' },
    { key: 'algorithm',     label: 'Algorithm',   cls: 'w-24' },
    { key: 'keyLength',     label: 'Key Size',    cls: 'w-20' },
    { key: 'expiryDays',    label: 'Expiry',      cls: 'w-36' },
    { key: 'status',        label: 'Status',      cls: 'w-24' },
    { key: 'pqcRisk',       label: 'PQC',         cls: 'w-20' },
    { key: 'riskScore',     label: 'Risk',        cls: 'w-20 text-right pr-4' },
  ],
  'K8s Workload Cert': [
    { key: 'name',              label: 'Workload',       cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'application',       label: 'Namespace / App',cls: 'w-36' },
    { key: 'caIssuer',          label: 'CA',             cls: 'w-28' },
    { key: 'expiryDays',        label: 'Expiry',         cls: 'w-36' },
    { key: 'status',            label: 'Status',         cls: 'w-24' },
    { key: 'riskScore',         label: 'Risk',           cls: 'w-20 text-right pr-4' },
  ],
  'Encryption Key': [
    { key: 'name',              label: 'Key Name',       cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'caIssuer',          label: 'Key Store',      cls: 'w-36' },
    { key: 'algorithm',         label: 'Algorithm',      cls: 'w-24' },
    { key: 'lastRotated',       label: 'Last Rotated',   cls: 'w-28' },
    { key: 'rotationFrequency', label: 'Rotation Policy',cls: 'w-28' },
    { key: 'status',            label: 'State',          cls: 'w-24' },
    { key: 'riskScore',         label: 'Risk',           cls: 'w-20 text-right pr-4' },
  ],
  'AI Agent Token': [
    { key: 'name',         label: 'Token / Agent',   cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'agentFw',      label: 'Framework',       cls: 'w-32' },
    { key: 'actionsDay',   label: 'Actions/Day',     cls: 'w-24' },
    { key: 'permRisk',     label: 'Permission Risk', cls: 'w-28' },
    { key: 'expiryDays',   label: 'Expiry',          cls: 'w-36' },
    { key: 'status',       label: 'Status',          cls: 'w-24' },
    { key: 'violations',   label: 'Violations',      cls: 'w-24 text-center' },
    { key: 'riskScore',    label: 'Risk',            cls: 'w-20 text-right pr-4' },
  ],
  'API Key / Secret': [
    { key: 'name',         label: 'Secret Name',  cls: 'w-auto min-w-[200px] max-w-0' },
    { key: 'caIssuer',     label: 'Secret Store', cls: 'w-32' },
    { key: 'secretType',   label: 'Type',         cls: 'w-28' },
    { key: 'owner',        label: 'Owner',        cls: 'w-28' },
    { key: 'lastRotated',  label: 'Last Rotated', cls: 'w-28' },
    { key: 'exposedIn',    label: 'Exposed In',   cls: 'w-28' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'violations',   label: 'Violations',   cls: 'w-24 text-center' },
    { key: 'riskScore',    label: 'Risk',         cls: 'w-20 text-right pr-4' },
  ],
};

// ── Derived field helpers ─────────────────────────────────────────────────────

function lastActivity(co: CryptoAsset): string {
  if (co.daysToExpiry >= 0 && co.daysToExpiry <= 90) return `Expires in ${co.daysToExpiry}d`;
  if (co.agentMeta?.lastActivity) return co.agentMeta.lastActivity;
  if (co.sshEndpoints?.[0]) return co.sshEndpoints[0].lastSeen.split(' ')[0];
  return co.lastRotated || '—';
}

function secretTypeFor(co: CryptoAsset): string {
  const n = co.name.toLowerCase();
  if (n.includes('stripe') || n.includes('payment')) return 'Payment API Key';
  if (n.includes('github') || n.includes('pat')) return 'Personal Access Token';
  if (n.includes('aws') || n.includes('iam')) return 'Cloud IAM Key';
  if (n.includes('datadog') || n.includes('dd')) return 'Monitoring API Key';
  return 'API Key';
}

function exposedInFor(co: CryptoAsset): { label: string; color: string } {
  const tags = co.tags ?? [];
  if (tags.includes('source-code')) return { label: 'Source Code', color: 'text-coral' };
  if (tags.includes('orphaned')) return { label: 'Orphaned', color: 'text-amber' };
  return { label: 'Not detected', color: 'text-teal' };
}

function permRiskStyle(risk?: string): string {
  if (risk === 'Over-privileged') return 'text-coral';
  if (risk === 'Right-sized') return 'text-teal';
  return 'text-muted-foreground';
}

function caTypeFor(caIssuer: string): string {
  if (/digicert|entrust|let.?s encrypt|sectigo|globalsign|comodo/i.test(caIssuer)) return 'Public CA';
  if (/self.?sign/i.test(caIssuer)) return 'Self-Signed';
  return 'Private / Internal CA';
}

function signatureAlgoFor(algo: string): string {
  if (/rsa/i.test(algo)) return 'SHA256withRSA';
  if (/ecc p-256|ecdsa/i.test(algo)) return 'SHA256withECDSA';
  if (/ecc p-384/i.test(algo)) return 'SHA384withECDSA';
  if (/ed25519/i.test(algo)) return 'Ed25519';
  return algo;
}

function keyUsageFor(type: string): string {
  if (type === 'TLS Certificate') return 'Digital Signature, Key Encipherment';
  if (type === 'Code-Signing Certificate') return 'Digital Signature';
  if (type === 'K8s Workload Cert') return 'Digital Signature, Key Agreement';
  return 'Digital Signature';
}

function extKeyUsageFor(type: string): string {
  if (type === 'TLS Certificate') return 'Server Authentication, Client Authentication';
  if (type === 'Code-Signing Certificate') return 'Code Signing (1.3.6.1.5.5.7.3.3)';
  return '—';
}

function privilegeLevelFor(co: CryptoAsset): string {
  const tags = co.tags ?? [];
  if (tags.includes('database') || tags.includes('bastion')) return 'root';
  if (tags.includes('kubernetes')) return 'admin';
  return 'user';
}

// ── Inline primary action ─────────────────────────────────────────────────────

interface InlineAction { label: string; action: string; btnCls: string; }

function getPrimaryAction(co: CryptoAsset): InlineAction | null {
  if (co.status === 'Expired')
    return { label: 'Renew', action: 'renew', btnCls: 'bg-coral/15 text-coral hover:bg-coral/25 border border-coral/25' };
  if (co.status === 'Expiring')
    return { label: 'Renew', action: 'renew', btnCls: 'bg-teal/15 text-teal hover:bg-teal/25 border border-teal/25' };
  if (co.status === 'Orphaned' || co.owner === 'Unassigned')
    return { label: 'Assign', action: 'assign', btnCls: 'bg-amber/15 text-amber hover:bg-amber/25 border border-amber/25' };
  if (co.pqcRisk === 'Critical')
    return { label: 'PQC Ticket', action: 'pqc', btnCls: 'bg-purple/15 text-purple-light hover:bg-purple/25 border border-purple/25' };
  if (co.policyViolations > 0)
    return { label: 'Fix →', action: 'fix', btnCls: 'bg-amber/10 text-amber hover:bg-amber/20 border border-amber/20' };
  return null;
}

// ── Cell renderer ─────────────────────────────────────────────────────────────

function CellValue({ col, co }: { col: ColDef; co: CryptoAsset }) {
  const val = (co as unknown as Record<string, unknown>)[col.key];
  switch (col.key) {
    case 'riskScore': {
      const s = crsScore(co);
      const c = s >= 80 ? 'text-coral' : s >= 60 ? 'text-amber' : s >= 30 ? 'text-blue-400' : 'text-teal';
      return <span className={`text-[11px] font-bold tabular-nums ${c}`}>{s}</span>;
    }
    case 'name':         return <span className="font-medium text-foreground truncate block">{co.name}</span>;
    case 'status':       return <StatusBadge status={co.status} />;
    case 'pqcRisk':      return <PQCBadge risk={co.pqcRisk} />;
    case 'environment':  return <EnvBadge env={co.environment} />;
    case 'daysToExpiry': return <DaysToExpiry days={co.daysToExpiry} />;
    case 'expiryDays':
      return (
        <span className="flex flex-col">
          <span className="text-muted-foreground">{co.expiryDate !== 'N/A' ? co.expiryDate : '—'}</span>
          {co.daysToExpiry >= 0 && <DaysToExpiry days={co.daysToExpiry} />}
        </span>
      );
    case 'autoRenewal':
      return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${co.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{co.autoRenewal ? 'Yes' : 'No'}</span>;
    case 'violations':
      return co.policyViolations > 0
        ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral/15 text-coral text-[10px] font-bold">{co.policyViolations}</span>
        : <span className="text-muted-foreground/40 text-[10px]">—</span>;
    case 'owner':
      return <span className={co.owner === 'Unassigned' ? 'text-coral font-medium' : 'text-muted-foreground'}>{co.owner}</span>;
    case 'lastActivity': return <span className="text-muted-foreground">{lastActivity(co)}</span>;
    case 'sshLastUsed':  return <span className="text-muted-foreground">{co.sshEndpoints?.[0]?.lastSeen?.split(' ')[0] ?? '—'}</span>;
    case 'sshHosts':     return <span className="text-muted-foreground font-medium">{co.sshEndpoints?.length ?? 0}</span>;
    case 'serial':       return <span className="font-mono text-[10px] text-muted-foreground truncate">{co.serial}</span>;
    case 'agentFw':      return <span className="text-muted-foreground truncate">{co.agentMeta?.framework ?? '—'}</span>;
    case 'actionsDay':   return <span className="text-muted-foreground tabular-nums">{co.agentMeta?.actionsPerDay?.toLocaleString() ?? '—'}</span>;
    case 'permRisk':     return <span className={`text-[10px] font-medium ${permRiskStyle(co.agentMeta?.permissionRisk)}`}>{co.agentMeta?.permissionRisk ?? '—'}</span>;
    case 'secretType':   return <span className="text-muted-foreground">{secretTypeFor(co)}</span>;
    case 'exposedIn': {
      const ei = exposedInFor(co);
      return <span className={`text-[10px] font-medium ${ei.color}`}>{ei.label}</span>;
    }
    default:
      return <span className="text-muted-foreground truncate">{val != null && val !== '' ? String(val) : '—'}</span>;
  }
}

// ── Metadata row ──────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-1 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider self-start pt-0.5 leading-tight">{label}</span>
      <span className="text-[10.5px] break-words">{value}</span>
    </div>
  );
}

// ── Risk score row ────────────────────────────────────────────────────────────

function RiskScoreAttr({ co, assocCount }: { co: CryptoAsset; assocCount: number }) {
  const [tip, setTip] = useState(false);
  const alg = co.pqcRisk === 'Critical' ? 90 : co.pqcRisk === 'High' ? 65 : co.pqcRisk === 'Medium' ? 40 : 15;
  const exp = co.daysToExpiry >= 0 && co.daysToExpiry <= 7 ? 95 : co.daysToExpiry >= 0 && co.daysToExpiry <= 30 ? 60 : 15;
  const env = co.environment === 'Production' ? 70 : 30;
  const dep = Math.min(100, assocCount * 20);
  const own = co.owner === 'Unassigned' ? 90 : 5;
  const score = Math.round(alg * 0.30 + exp * 0.20 + env * 0.20 + dep * 0.15 + own * 0.15);
  const col = score > 70 ? 'text-coral' : score > 40 ? 'text-amber' : 'text-teal';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`text-sm font-bold tabular-nums ${col}`}>{score}</span>
      <span className="text-[9px] text-muted-foreground">/100</span>
      <div className="relative">
        <button onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)} className="p-0.5">
          <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
        </button>
        {tip && (
          <div className="absolute bottom-full left-0 mb-1 z-[9999] w-72 bg-card border border-border rounded-lg shadow-xl p-3 text-[9.5px] text-muted-foreground leading-relaxed space-y-1">
            <p className="font-semibold text-foreground text-[10px] mb-1">Crypto Risk Score breakdown</p>
            <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5">
              <span>Algorithm vulnerability</span><span className="tabular-nums font-medium text-foreground">{alg} × 30%</span>
              <span>Expiry urgency</span><span className="tabular-nums font-medium text-foreground">{exp} × 20%</span>
              <span>Environment exposure</span><span className="tabular-nums font-medium text-foreground">{env} × 20%</span>
              <span>Dependent assets</span><span className="tabular-nums font-medium text-foreground">{dep} × 15%</span>
              <span>Ownership gap</span><span className="tabular-nums font-medium text-foreground">{own} × 15%</span>
            </div>
          </div>
        )}
      </div>
    </span>
  );
}

// ── Type-specific metadata ────────────────────────────────────────────────────

function TypeMetadata({ co, assoc }: { co: CryptoAsset; assoc: typeof mockITAssets }) {
  const tags = co.tags ?? [];

  const commonRows = (
    <>
      <MetaRow label="Owner" value={<span className={co.owner === 'Unassigned' ? 'text-coral font-semibold' : 'text-foreground'}>{co.owner}</span>} />
      <MetaRow label="Team" value={<span className="text-foreground">{co.team}</span>} />
      <MetaRow label="Application" value={<span className="text-foreground">{co.application}</span>} />
      <MetaRow label="Environment" value={<EnvBadge env={co.environment} />} />
      <MetaRow label="Infrastructure" value={<span className="text-foreground">{co.infrastructure}</span>} />
      <MetaRow label="Discovery" value={<span className="text-foreground">{co.discoverySource}</span>} />
      <MetaRow label="Risk Score" value={<RiskScoreAttr co={co} assocCount={assoc.length} />} />
      <MetaRow label="PQC Risk" value={<PQCBadge risk={co.pqcRisk} />} />
      <MetaRow label="Violations" value={co.policyViolations > 0
        ? <span className="text-coral font-semibold">{co.policyViolations} active</span>
        : <span className="text-teal text-[10px]">None</span>} />
      {tags.length > 0 && <MetaRow label="Tags" value={<div className="flex flex-wrap gap-1">{tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>)}</div>} />}
    </>
  );

  if (co.type === 'TLS Certificate' || co.type === 'Code-Signing Certificate' || co.type === 'SSH Certificate') {
    return (
      <>
        <MetaRow label="Common Name" value={<span className="text-foreground font-medium">{co.commonName}</span>} />
        {co.type === 'TLS Certificate' && <MetaRow label="Subject DN" value={<span className="text-foreground text-[10px]">CN={co.commonName}, O=Acme Corp, C=US</span>} />}
        <MetaRow label="CA / Issuer" value={<span className="text-foreground">{co.caIssuer}</span>} />
        <MetaRow label="CA Type" value={<span className="text-foreground">{caTypeFor(co.caIssuer)}</span>} />
        <MetaRow label="Serial" value={<span className="font-mono text-[9.5px] text-foreground break-all">{co.serial}</span>} />
        <MetaRow label="Signature Algo" value={<span className="text-foreground">{signatureAlgoFor(co.algorithm)}</span>} />
        <MetaRow label="Key Algorithm" value={<span className="text-foreground">{co.algorithm}</span>} />
        <MetaRow label="Key Size" value={<span className="text-foreground">{co.keyLength} bits</span>} />
        {co.type !== 'Code-Signing Certificate' && <>
          <MetaRow label="Key Usage" value={<span className="text-foreground">{keyUsageFor(co.type)}</span>} />
          <MetaRow label="Ext Key Usage" value={<span className="text-foreground text-[10px]">{extKeyUsageFor(co.type)}</span>} />
        </>}
        <MetaRow label="Valid From" value={<span className="text-foreground">{co.issueDate}</span>} />
        <MetaRow label="Valid To" value={<span className="text-foreground">{co.expiryDate}</span>} />
        <MetaRow label="Days Remaining" value={<DaysToExpiry days={co.daysToExpiry} />} />
        <MetaRow label="Auto-Renewal" value={co.autoRenewal
          ? <span className="text-teal font-medium">Enabled — {co.rotationFrequency}</span>
          : <span className="text-coral font-medium">Disabled — manual required</span>} />
        <MetaRow label="Last Renewed" value={<span className="text-foreground">{co.lastRotated}</span>} />
        {commonRows}
        <MetaRow label="Linked Assets" value={<span className="text-foreground">{assoc.length} infrastructure asset{assoc.length !== 1 ? 's' : ''}</span>} />
      </>
    );
  }

  if (co.type === 'SSH Key') {
    return (
      <>
        <MetaRow label="Key Type" value={<span className="text-foreground">{co.algorithm}</span>} />
        <MetaRow label="Key Size" value={<span className="text-foreground">{co.keyLength} bits</span>} />
        <MetaRow label="Fingerprint" value={<span className="font-mono text-[9px] text-foreground break-all">{co.serial}</span>} />
        <MetaRow label="Privilege Level" value={<span className={`font-semibold ${privilegeLevelFor(co) === 'root' ? 'text-coral' : privilegeLevelFor(co) === 'admin' ? 'text-amber' : 'text-muted-foreground'}`}>{privilegeLevelFor(co)}</span>} />
        <MetaRow label="Auth Method" value={<span className="text-foreground">Public Key Authentication</span>} />
        <MetaRow label="Last Used" value={<span className="text-foreground">{co.sshEndpoints?.[0]?.lastSeen ?? 'Unknown'}</span>} />
        <MetaRow label="Last Rotated" value={<span className="text-foreground">{co.lastRotated}</span>} />
        <MetaRow label="Rotation Policy" value={<span className={co.rotationFrequency === 'Never' ? 'text-coral font-medium' : 'text-foreground'}>{co.rotationFrequency}</span>} />
        <MetaRow label="Authorized Hosts" value={<span className="text-foreground">{co.sshEndpoints?.length ?? 0} endpoint{(co.sshEndpoints?.length ?? 0) !== 1 ? 's' : ''}</span>} />
        {co.sshEndpoints && co.sshEndpoints.length > 0 && (
          <MetaRow label="Endpoints" value={
            <div className="space-y-1">
              {co.sshEndpoints.slice(0, 4).map((ep, i) => (
                <div key={i} className="text-[9.5px]">
                  <span className="font-mono text-foreground">{ep.host}</span>
                  <span className="text-muted-foreground"> · {ep.role} · {ep.ip}</span>
                </div>
              ))}
              {co.sshEndpoints.length > 4 && <span className="text-[9px] text-muted-foreground">+{co.sshEndpoints.length - 4} more</span>}
            </div>
          } />
        )}
        {commonRows}
      </>
    );
  }

  if (co.type === 'K8s Workload Cert') {
    return (
      <>
        <MetaRow label="SPIFFE ID" value={<span className="font-mono text-[9.5px] text-foreground break-all">{co.serial}</span>} />
        <MetaRow label="Common Name" value={<span className="text-foreground">{co.commonName}</span>} />
        <MetaRow label="CA / Issuer" value={<span className="text-foreground">{co.caIssuer}</span>} />
        <MetaRow label="Algorithm" value={<span className="text-foreground">{co.algorithm}</span>} />
        <MetaRow label="Key Size" value={<span className="text-foreground">{co.keyLength} bits</span>} />
        <MetaRow label="Rotation Freq." value={<span className="text-foreground">{co.rotationFrequency}</span>} />
        <MetaRow label="Valid From" value={<span className="text-foreground">{co.issueDate}</span>} />
        <MetaRow label="Valid To" value={<span className="text-foreground">{co.expiryDate}</span>} />
        <MetaRow label="Days Remaining" value={<DaysToExpiry days={co.daysToExpiry} />} />
        <MetaRow label="Auto-Rotation" value={co.autoRenewal
          ? <span className="text-teal font-medium">cert-manager — {co.rotationFrequency}</span>
          : <span className="text-coral font-medium">Manual — not automated</span>} />
        {commonRows}
      </>
    );
  }

  if (co.type === 'Encryption Key') {
    return (
      <>
        <MetaRow label="Key Store" value={<span className="text-foreground">{co.caIssuer}</span>} />
        <MetaRow label="Key ID / ARN" value={<span className="font-mono text-[9px] text-foreground break-all">{co.serial}</span>} />
        <MetaRow label="Algorithm" value={<span className="text-foreground">{co.algorithm}</span>} />
        <MetaRow label="Key Size" value={<span className="text-foreground">{co.keyLength} bits</span>} />
        <MetaRow label="Key State" value={<span className={co.status === 'Active' ? 'text-teal font-medium' : 'text-amber font-medium'}>{co.status === 'Active' ? 'Active / Enabled' : co.status}</span>} />
        <MetaRow label="Key Usage" value={<span className="text-foreground">ENCRYPT_DECRYPT</span>} />
        <MetaRow label="Auto-Rotation" value={co.autoRenewal
          ? <span className="text-teal font-medium">Enabled — {co.rotationFrequency}</span>
          : <span className="text-coral font-medium">Disabled</span>} />
        <MetaRow label="Created" value={<span className="text-foreground">{co.issueDate}</span>} />
        <MetaRow label="Last Rotated" value={<span className="text-foreground">{co.lastRotated}</span>} />
        <MetaRow label="Rotation Policy" value={<span className="text-foreground">{co.rotationFrequency}</span>} />
        {commonRows}
      </>
    );
  }

  if (co.type === 'AI Agent Token') {
    const m = co.agentMeta;
    return (
      <>
        <MetaRow label="Agent Type" value={<span className="text-foreground">{m?.agentType ?? '—'}</span>} />
        <MetaRow label="Framework" value={<span className="text-foreground">{m?.framework ?? '—'}</span>} />
        <MetaRow label="Issuing Platform" value={<span className="text-foreground">{co.caIssuer}</span>} />
        <MetaRow label="Actions / Day" value={<span className="text-foreground tabular-nums">{m?.actionsPerDay?.toLocaleString() ?? '—'}</span>} />
        <MetaRow label="Permission Risk" value={<span className={`font-semibold ${permRiskStyle(m?.permissionRisk)}`}>{m?.permissionRisk ?? '—'}</span>} />
        <MetaRow label="Scopes" value={<span className="text-foreground">{m?.permissions?.length ?? 0} permission{(m?.permissions?.length ?? 0) !== 1 ? 's' : ''}</span>} />
        {m?.permissions && <MetaRow label="Permission List" value={<div className="space-y-0.5">{m.permissions.map((p, i) => <div key={i} className="text-[9px] font-mono text-muted-foreground">{p}</div>)}</div>} />}
        <MetaRow label="Services" value={<div className="space-y-0.5">{(m?.servicesAccessed ?? []).map((s, i) => <div key={i} className="text-[9.5px] text-foreground">{s}</div>)}</div>} />
        <MetaRow label="Last Activity" value={<span className="text-foreground">{m?.lastActivity ?? '—'}</span>} />
        <MetaRow label="Human Sponsor" value={<span className="text-amber font-medium">Unassigned</span>} />
        <MetaRow label="Valid To" value={<span className="text-foreground">{co.expiryDate}</span>} />
        <MetaRow label="Days Remaining" value={<DaysToExpiry days={co.daysToExpiry} />} />
        <MetaRow label="Rotation Policy" value={<span className="text-foreground">{co.rotationFrequency}</span>} />
        {commonRows}
      </>
    );
  }

  if (co.type === 'API Key / Secret') {
    const ei = exposedInFor(co);
    return (
      <>
        <MetaRow label="Secret Store" value={<span className="text-foreground">{co.caIssuer}</span>} />
        <MetaRow label="Secret Type" value={<span className="text-foreground">{secretTypeFor(co)}</span>} />
        <MetaRow label="Secret Path" value={<span className="font-mono text-[9px] text-foreground break-all">{co.serial}</span>} />
        <MetaRow label="Exposed In" value={<span className={`font-semibold ${ei.color}`}>{ei.label}</span>} />
        <MetaRow label="Last Rotated" value={<span className="text-foreground">{co.lastRotated}</span>} />
        <MetaRow label="Rotation Policy" value={<span className={co.rotationFrequency === 'Never' ? 'text-coral font-medium' : 'text-foreground'}>{co.rotationFrequency}</span>} />
        <MetaRow label="Auto-Rotation" value={co.autoRenewal
          ? <span className="text-teal font-medium">Enabled</span>
          : <span className="text-coral font-medium">Disabled</span>} />
        {commonRows}
      </>
    );
  }

  return <>{commonRows}</>;
}

// ── Secrets upsell ────────────────────────────────────────────────────────────

const SECRETS_LICENSED = false;

function SecretsUpsell({ co }: { co: CryptoAsset }) {
  const daysOld = Math.floor((Date.now() - new Date(co.lastRotated).getTime()) / 86_400_000);
  const inCode = (co.tags ?? []).includes('source-code');
  return (
    <div className="rounded-xl border border-amber/30 bg-amber/5 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-amber flex-shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-amber">Secrets Lifecycle Management — Not Licensed</p>
          <p className="text-[9.5px] text-muted-foreground">AVX Trust Platform — Secrets Module</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {inCode
          ? `This secret was detected in source code. Secrets Lifecycle Management would have detected this immediately, auto-rotated the key, and opened a remediation PR. Current exposure window: ${daysOld} days.`
          : `This secret has not been rotated in ${daysOld} days. Secrets Lifecycle Management provides auto-rotation, vault sync, exposure scanning across code repos and CI/CD pipelines, and policy enforcement.`}
      </p>
      <div className="flex gap-2 pt-1">
        <button onClick={() => toast.info('Redirecting to Secrets module...')} className="text-[10px] font-semibold px-3 py-1.5 rounded bg-amber/20 text-amber hover:bg-amber/30 transition-colors">
          Learn More →
        </button>
        <button onClick={() => toast.info('Opening sales contact form...')} className="text-[10px] px-3 py-1.5 rounded border border-amber/30 text-amber/80 hover:bg-amber/10 transition-colors">
          Talk to Sales
        </button>
      </div>
    </div>
  );
}

// ── Side panel (38%) ──────────────────────────────────────────────────────────

function DetailPanel({
  co, onClose, onTicket, assoc, onOpenRiskDrawer, onDeploy, setFilters, setCurrentPage,
}: {
  co: CryptoAsset;
  onClose: () => void;
  onTicket: (a: string) => void;
  assoc: typeof mockITAssets;
  onOpenRiskDrawer: () => void;
  onDeploy: () => void;
  setFilters: (f: Record<string, string>) => void;
  setCurrentPage: (p: string) => void;
}) {
  const isPqc = ['RSA-1024','RSA-2048','RSA-4096','ECDSA-P256','ECDSA-P384','ECC P-256','ECC P-384','SHA-1','MD5','DH-1024','DH-2048'].includes(co.algorithm);
  const expYear = co.expiryDate && co.expiryDate !== 'N/A' ? new Date(co.expiryDate).getFullYear() : 0;
  const yearsPast = expYear > 0 ? Math.max(0, expYear - 2030) : 0;
  const isSecret = co.type === 'API Key / Secret';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[38%] bg-card border-l border-border shadow-2xl h-full flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-start gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-semibold text-foreground truncate">{co.name}</p>
            <p className="text-[9.5px] text-muted-foreground">{co.type} · {co.environment} · {co.application}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge status={co.status} />
            <PQCBadge risk={co.pqcRisk} />
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded ml-1">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/50">

          {/* Actions */}
          <div className="px-4 py-3">
            <p className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Actions</p>

            {isSecret && !SECRETS_LICENSED ? (
              <SecretsUpsell co={co} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {/* Download Cert */}
                {(co.type === 'TLS Certificate' || co.type === 'Code-Signing Certificate') && (
                  <button onClick={() => toast.success(`Certificate downloaded`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-border text-foreground hover:bg-secondary/80 transition-colors">
                    ↓ Download Cert
                  </button>
                )}

                {/* Renew */}
                {(co.type === 'TLS Certificate' || co.type === 'K8s Workload Cert' || co.type === 'SSH Certificate') && (
                  <button
                    onClick={() => co.status === 'Active' ? undefined : toast.success(`Renewal initiated for ${co.name}`)}
                    disabled={co.status === 'Active'}
                    title={co.status === 'Active' ? 'Certificate is active — renew when nearing expiry' : undefined}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold transition-colors ${
                      co.status === 'Active'
                        ? 'opacity-40 cursor-not-allowed bg-teal/10 text-teal border border-teal/20'
                        : 'bg-teal text-primary-foreground hover:bg-teal/90'
                    }`}>
                    <RefreshCw className="w-3 h-3" /> Renew
                  </button>
                )}

                {/* Rotate */}
                {(co.type === 'SSH Key' || co.type === 'Encryption Key' || co.type === 'AI Agent Token') && (
                  <button onClick={() => toast.success(`Rotation initiated for ${co.name}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold bg-teal text-primary-foreground hover:bg-teal/90 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Rotate
                  </button>
                )}

                {/* Deploy — after renew */}
                {(co.type === 'TLS Certificate' || co.type === 'K8s Workload Cert') && (
                  <button
                    onClick={() => co.status === 'Active' ? undefined : onDeploy()}
                    disabled={co.status === 'Active'}
                    title={co.status === 'Active' ? 'Deploy is available after renewal' : undefined}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-semibold border transition-colors ${
                      co.status === 'Active'
                        ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground'
                        : 'border-border text-foreground hover:bg-secondary/80'
                    }`}>
                    Deploy
                  </button>
                )}

                {/* Assign Owner — only when unassigned */}
                {co.owner === 'Unassigned' && (
                  <button onClick={() => toast.success('Owner assignment opened')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-amber/30 text-amber hover:bg-amber/10 transition-colors">
                    <UserPlus className="w-3 h-3" /> Assign Owner
                  </button>
                )}

                {/* Revoke */}
                {!['AI Agent Token', 'API Key / Secret'].includes(co.type) && (
                  <button onClick={() => toast.error(`Revoke ${co.name}?`, { action: { label: 'Confirm', onClick: () => toast.success('Revoked') } })}
                    className="px-2.5 py-1.5 rounded text-[10px] font-semibold border border-coral/30 text-coral hover:bg-coral/10 transition-colors">
                    Revoke
                  </button>
                )}

                {/* PQC Migration Ticket — only when quantum-vulnerable */}
                {isPqc && (
                  <button onClick={() => onTicket('pqc')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors">
                    <Atom className="w-3 h-3" /> PQC Migration Ticket
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="px-4 py-3">
            <TypeMetadata co={co} assoc={assoc} />
          </div>

          {/* Linked infrastructure — clickable */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold text-foreground mb-1.5">
              Linked Infrastructure ({assoc.length})
              {assoc.length > 0 && <span className="ml-1 text-[9px] text-amber font-normal">expiry or failure affects all</span>}
            </p>
            {assoc.length > 0 ? (
              <div className="space-y-1">
                {assoc.map(a => (
                  <button key={a.id}
                    onClick={() => { setFilters({ tab: 'infrastructure', assetId: a.id }); setCurrentPage('inventory'); onClose(); }}
                    className="w-full flex items-center gap-2 text-[10px] rounded px-1.5 py-1 hover:bg-secondary/50 transition-colors text-left group">
                    <span className="text-foreground font-medium flex-1 truncate group-hover:text-teal transition-colors">{a.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">{a.type}</span>
                    <EnvBadge env={a.environment} />
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-teal transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">No linked infrastructure</p>
            )}
          </div>

          {/* Quantum Risk */}
          {isPqc && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-purple-light mb-1.5 flex items-center gap-1.5">
                <Atom className="w-3 h-3" />
                Quantum Risk
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-purple/15">NIST 2030</span>
              </p>
              <div className="rounded-lg bg-purple/5 border border-purple/20 p-3 text-[10px]">
                <span className="font-mono font-semibold text-foreground">{co.algorithm}</span>
                <span className="text-muted-foreground"> is quantum-vulnerable.</span>
                {expYear > 0 && <span className="text-muted-foreground"> Expires {expYear}{yearsPast > 0 ? <span className="text-coral font-semibold"> — {yearsPast}yr past NIST deadline</span> : ' — at NIST deadline'}.</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter Panel (side sheet) ─────────────────────────────────────────────────

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  algorithms: string[];
  owners: string[];
  algFilter: string[];   setAlgFilter:    React.Dispatch<React.SetStateAction<string[]>>;
  envFilter: string[];   setEnvFilter:    React.Dispatch<React.SetStateAction<string[]>>;
  statusFilter: string[];setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
  pqcFilter: string[];   setPqcFilter:    React.Dispatch<React.SetStateAction<string[]>>;
  ownerFilter: string[]; setOwnerFilter:  React.Dispatch<React.SetStateAction<string[]>>;
}

function FilterChips({
  options, selected, onToggle,
}: { options: { v: string; l: string }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = selected.includes(o.v);
        return (
          <button
            key={o.v}
            onClick={() => onToggle(o.v)}
            className={`px-2 py-1 rounded text-[10.5px] font-medium border transition-colors ${
              active
                ? 'border-teal/40 bg-teal/15 text-teal'
                : 'border-border bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function FilterSection({ title, onReset, children }: { title: string; onReset?: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {onReset && (
          <button onClick={onReset} className="text-[10px] text-muted-foreground hover:text-coral">Reset</button>
        )}
      </div>
      {children}
    </div>
  );
}

function FilterPanel(props: FilterPanelProps) {
  const {
    open, onClose, algorithms, owners,
    algFilter, setAlgFilter, envFilter, setEnvFilter,
    statusFilter, setStatusFilter, pqcFilter, setPqcFilter,
    ownerFilter, setOwnerFilter,
  } = props;

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const clearAll = () => {
    setAlgFilter([]); setEnvFilter([]); setStatusFilter([]); setPqcFilter([]); setOwnerFilter([]);
  };

  const algOptions = [{ v: 'weak', l: 'Weak (RSA/SHA-1)' }, ...algorithms.map(a => ({ v: a, l: a }))];
  const ownerOptions = owners.map(o => ({ v: o, l: o }));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm">Filters</SheetTitle>
          <button onClick={clearAll} className="text-[11px] text-coral hover:underline">Clear All</button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-foreground">Crypto</h3>
            <FilterSection title="Algorithm" onReset={algFilter.length ? () => setAlgFilter([]) : undefined}>
              <FilterChips options={algOptions} selected={algFilter} onToggle={toggle(setAlgFilter)} />
            </FilterSection>
            <FilterSection title="PQC Risk" onReset={pqcFilter.length ? () => setPqcFilter([]) : undefined}>
              <FilterChips
                options={['Critical','High','Medium','Low','Safe'].map(v => ({ v, l: v }))}
                selected={pqcFilter} onToggle={toggle(setPqcFilter)} />
            </FilterSection>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-foreground">Asset Context</h3>
            <FilterSection title="Environment" onReset={envFilter.length ? () => setEnvFilter([]) : undefined}>
              <FilterChips
                options={['Production','Staging','Development'].map(v => ({ v, l: v }))}
                selected={envFilter} onToggle={toggle(setEnvFilter)} />
            </FilterSection>
            <FilterSection title="Owner" onReset={ownerFilter.length ? () => setOwnerFilter([]) : undefined}>
              <FilterChips options={ownerOptions} selected={ownerFilter} onToggle={toggle(setOwnerFilter)} />
            </FilterSection>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-foreground">Status</h3>
            <FilterSection title="Status" onReset={statusFilter.length ? () => setStatusFilter([]) : undefined}>
              <FilterChips
                options={['Active','Expiring','Expired','Orphaned','Revoked'].map(v => ({ v, l: v }))}
                selected={statusFilter} onToggle={toggle(setStatusFilter)} />
            </FilterSection>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 rounded bg-teal text-primary-foreground hover:bg-teal-light text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CryptoObjectsTab({ onCreateTicket }: Props) {
  const [typeFilter, setTypeFilter]     = useState('All');
  const [search, setSearch]             = useState('');
  const [algFilter, setAlgFilter]       = useState<string[]>([]);
  const [envFilter, setEnvFilter]       = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [pqcFilter, setPqcFilter]       = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter]   = useState<string[]>([]);
  const [filterIdActive, setFilterIdActive] = useState<string>('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [detailAsset, setDetailAsset]   = useState<CryptoAsset | null>(null);
  const [ticketAsset, setTicketAsset]   = useState<CryptoAsset | null>(null);
  const [ticketAction, setTicketAction] = useState('fix');
  const [riskDrawer, setRiskDrawer]     = useState<CryptoAsset | null>(null);
  const [deployAsset, setDeployAsset]   = useState<CryptoAsset | null>(null);
  const [sortKey, setSortKey]           = useState<'riskScore' | 'daysToExpiry'>('riskScore');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');

  const { manualIdentities }    = useInventoryRegistry();
  const { setSelectedEntity }   = useAgent();
  const { filters: navFilters, setFilters, setCurrentPage } = useNav();

  const { type: navType, status: navStatus, algorithm: navAlg, owner: navOwner, pqcRisk: navPqc } = navFilters;
  useEffect(() => {
    if (navType)              setTypeFilter(navType);
    if (navStatus)            setStatusFilter([navStatus]);
    if (navAlg)               setAlgFilter([navAlg]);
    if (navOwner)             setOwnerFilter([navOwner]);
    if (navPqc)               setPqcFilter([navPqc]);
    if (navFilters.filterId)  setFilterIdActive(navFilters.filterId);
  }, [navType, navStatus, navAlg, navOwner, navPqc, navFilters.filterId]);

  useEffect(() => {
    if (detailAsset) setSelectedEntity({ kind: 'identity', id: detailAsset.id, name: detailAsset.name });
    return () => setSelectedEntity(null);
  }, [detailAsset, setSelectedEntity]);

  const allAssets  = useMemo(() => [...manualIdentities, ...mockAssets], [manualIdentities]);
  const algorithms = useMemo(() => [...new Set(allAssets.map(a => a.algorithm))].sort(), [allAssets]);

  const filtered = useMemo(() => {
    let r = [...allAssets];
    if (typeFilter !== 'All') r = r.filter(a => a.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.commonName.toLowerCase().includes(q) ||
        a.owner.toLowerCase().includes(q) ||
        a.application.toLowerCase().includes(q) ||
        a.algorithm.toLowerCase().includes(q)
      );
    }
    if (algFilter.length) {
      r = r.filter(a => algFilter.some(v => v === 'weak' ? /RSA-1024|RSA-2048|SHA-1/.test(a.algorithm) : a.algorithm === v));
    }
    if (envFilter.length)    r = r.filter(a => envFilter.includes(a.environment));
    if (statusFilter.length) r = r.filter(a => statusFilter.includes(a.status));
    if (pqcFilter.length)    r = r.filter(a => pqcFilter.includes(a.pqcRisk));
    if (ownerFilter.length)  r = r.filter(a => ownerFilter.includes('Unassigned') ? a.owner === 'Unassigned' : true);
    // filterId — dashboard drill-down predicate (highest specificity, applied last)
    if (filterIdActive && VIOLATION_FILTERS[filterIdActive]) {
      r = r.filter(VIOLATION_FILTERS[filterIdActive].predicate);
    }

    // Sorting — default risk_score DESC, with expiry tie-breaker
    const dir = sortDir === 'asc' ? 1 : -1;
    const expiryTs = (a: CryptoAsset) => {
      const t = a.expiryDate && a.expiryDate !== 'N/A' ? Date.parse(a.expiryDate) : NaN;
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };
    if (sortKey === 'riskScore') {
      r.sort((a, b) => {
        const sa = crsScore(a);
        const sb = crsScore(b);
        const va = Number.isFinite(sa) ? sa : -Infinity;
        const vb = Number.isFinite(sb) ? sb : -Infinity;
        if (va !== vb) return (vb - va) * (sortDir === 'desc' ? 1 : -1);
        // tie-break: expiry ASC (earliest first)
        const ea = expiryTs(a), eb = expiryTs(b);
        if (ea !== eb) return ea - eb;
        return 0;
      });
    } else if (sortKey === 'daysToExpiry') {
      r.sort((a, b) => (a.daysToExpiry - b.daysToExpiry) * dir);
    }
    return r;
  }, [allAssets, typeFilter, search, algFilter, envFilter, statusFilter, pqcFilter, ownerFilter, sortKey, sortDir, filterIdActive]);

  const getAssoc = (co: CryptoAsset) => mockITAssets.filter(a => a.cryptoObjectIds.includes(co.id));
  const cols = COLS[typeFilter] ?? COLS['All'];

  const openTicket = (co: CryptoAsset, action: string) => {
    setTicketAsset(co);
    setTicketAction(action);
    setDetailAsset(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-hidden">

        {/* Type tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-2 flex-shrink-0 overflow-x-auto">
          {TYPE_FILTERS.map(t => {
            const cnt = t.key === 'All' ? allAssets.length : allAssets.filter(a => a.type === t.key).length;
            return (
              <button key={t.key} onClick={() => { setTypeFilter(t.key); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  typeFilter === t.key ? 'bg-teal/15 text-teal border border-teal/30' : 'text-muted-foreground hover:bg-secondary border border-transparent'
                }`}>
                {t.label}
                <span className={`text-[9px] tabular-nums ${typeFilter === t.key ? 'text-teal/70' : 'text-muted-foreground/50'}`}>{cnt}</span>
              </button>
            );
          })}
          <button
            onClick={() => setPresetOpen(p => !p)}
            className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-[10.5px] font-medium border transition-colors ${
              presetOpen
                ? 'border-teal/40 text-teal bg-teal/10'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Preset views</span>
            {presetOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {presetOpen && (
          <div className="flex items-center gap-2 px-1 py-2 flex-wrap border-b border-border/40">
            {[
              { id: 'cert_expiring_7d',   label: 'Expiring soon' },
              { id: 'cert_expired',       label: 'Expired' },
              { id: 'ssh_suspicious',     label: 'Suspicious keys' },
              { id: 'cert_weak_algo',     label: 'Weak algorithms' },
              { id: 'cert_self_signed',   label: 'Self-signed in prod' },
              { id: 'secret_exposed_code',label: 'Exposed secrets' },
              { id: 'ai_over_privileged', label: 'Over-privileged tokens' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setFilterIdActive(p.id);
                  if (VIOLATION_FILTERS[p.id]?.filters?.type) {
                    setTypeFilter(VIOLATION_FILTERS[p.id].filters.type);
                  }
                  setPresetOpen(false);
                }}
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium border transition-colors ${
                  filterIdActive === p.id
                    ? 'bg-purple/15 border-purple/30 text-purple-light'
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Search + Filters trigger */}
        {(() => {
          const activeChips: { key: string; label: string; remove: () => void }[] = [
            ...envFilter.map(v => ({ key: `env:${v}`, label: v, remove: () => setEnvFilter(envFilter.filter(x => x !== v)) })),
            ...pqcFilter.map(v => ({ key: `pqc:${v}`, label: `${v} PQC`, remove: () => setPqcFilter(pqcFilter.filter(x => x !== v)) })),
            ...algFilter.map(v => ({ key: `alg:${v}`, label: v === 'weak' ? 'Weak algos' : v, remove: () => setAlgFilter(algFilter.filter(x => x !== v)) })),
            ...statusFilter.map(v => ({ key: `st:${v}`, label: v, remove: () => setStatusFilter(statusFilter.filter(x => x !== v)) })),
            ...ownerFilter.map(v => ({ key: `ow:${v}`, label: v, remove: () => setOwnerFilter(ownerFilter.filter(x => x !== v)) })),
            ...(filterIdActive && VIOLATION_FILTERS[filterIdActive] ? [{
              key: `fid:${filterIdActive}`,
              label: VIOLATION_FILTERS[filterIdActive].label,
              remove: () => setFilterIdActive(''),
            }] : []),
          ];
          const visible = activeChips.slice(0, 4);
          const overflow = activeChips.length - visible.length;
          const totalActive = activeChips.length;
          const clearAll = () => { setAlgFilter([]); setEnvFilter([]); setStatusFilter([]); setPqcFilter([]); setOwnerFilter([]); setFilterIdActive(''); };
          return (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, owner, application, algorithm..."
                    className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                </div>
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors ${
                    totalActive > 0
                      ? 'border-teal/40 text-teal bg-teal/10 hover:bg-teal/15'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <FilterIcon className="w-3.5 h-3.5" />
                  Filters
                  {totalActive > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal/20 text-teal text-[9px] font-bold tabular-nums">{totalActive}</span>
                  )}
                </button>
                {visible.map(c => (
                  <span key={c.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] text-foreground flex-shrink-0">
                    {c.label}
                    <button onClick={c.remove} className="text-muted-foreground hover:text-coral">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {overflow > 0 && (
                  <button onClick={() => setFilterPanelOpen(true)} className="text-[10px] text-muted-foreground hover:text-foreground px-1 flex-shrink-0">
                    +{overflow} more
                  </button>
                )}
                {totalActive > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-coral hover:underline flex-shrink-0">
                    Clear all
                  </button>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                  {filterIdActive && VIOLATION_FILTERS[filterIdActive]
                    ? `${filtered.length} of ${VIOLATION_FILTERS[filterIdActive].enterpriseCount.toLocaleString()} ${VIOLATION_FILTERS[filterIdActive].countNoun}`
                    : `${filtered.length} identities`}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs table-auto">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr className="border-b border-border">
                  {cols.map(col => (
                    <th key={col.key} className={`text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap ${col.cls}`}>
                      {col.key === 'riskScore' || col.key === 'daysToExpiry' ? (
                        <button
                          onClick={() => {
                            if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortKey(col.key as 'riskScore' | 'daysToExpiry'); setSortDir(col.key === 'riskScore' ? 'desc' : 'asc'); }
                          }}
                          className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === col.key ? 'text-foreground' : ''}`}
                        >
                          {col.label} {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => {
                  const isManual = manualIdentities.some(m => m.id === co.id);
                  return (
                    <tr key={co.id}
                      onClick={() => setDetailAsset(co)}
                      className={`relative border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer group ${isManual ? 'opacity-75' : ''}`}>
                      {cols.map(col => (
                        <td key={col.key} className={`py-2 px-3 whitespace-nowrap ${col.cls}`}>
                          {col.key === 'name' && isManual ? (
                            <span className="font-medium text-foreground truncate flex items-center gap-1.5">
                              <span className="truncate">{co.name}</span>
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-teal/10 text-teal text-[8px] flex-shrink-0">
                                <FileEdit className="w-2 h-2" />
                              </span>
                            </span>
                          ) : <CellValue col={col} co={co} />}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No identities match your filters.</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Agent panel */}
      {detailAsset?.type === 'AI Agent Token' && (
        <AgentDetailPanel agent={detailAsset} onClose={() => setDetailAsset(null)} onCreateTicket={onCreateTicket} licensed={true} />
      )}

      {/* Detail side panel */}
      {detailAsset && detailAsset.type !== 'AI Agent Token' && (
        <DetailPanel
          co={detailAsset}
          onClose={() => setDetailAsset(null)}
          onTicket={action => openTicket(detailAsset, action)}
          assoc={getAssoc(detailAsset)}
          onOpenRiskDrawer={() => setRiskDrawer(detailAsset)}
          onDeploy={() => setDeployAsset(detailAsset)}
          setFilters={setFilters}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* Ticket draft modal */}
      {ticketAsset && (
        <TicketDraftModal
          asset={ticketAsset}
          action={ticketAction}
          onClose={() => setTicketAsset(null)}
          onConfirm={() => {
            // TicketDraftModal handles toast confirmation internally.
            // Do not call onCreateTicket — that opens the legacy drawer.
          }}
        />
      )}

      <CryptoObjectRiskDrawer object={riskDrawer} onClose={() => setRiskDrawer(null)} />
      <DeployToDeviceModal open={!!deployAsset} onClose={() => setDeployAsset(null)} cert={deployAsset} />

      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        algorithms={algorithms}
        owners={[...new Set(allAssets.map(a => a.owner))].sort()}
        algFilter={algFilter} setAlgFilter={setAlgFilter}
        envFilter={envFilter} setEnvFilter={setEnvFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        pqcFilter={pqcFilter} setPqcFilter={setPqcFilter}
        ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter}
      />
    </div>
  );
}
