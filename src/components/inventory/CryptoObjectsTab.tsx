import React, { useState, useMemo, useEffect } from 'react';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { mockITAssets } from '@/data/inventoryMockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';
import { useAgent } from '@/context/AgentContext';
import { useNav } from '@/context/NavigationContext';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry } from '@/components/shared/UIComponents';
import {
  Search, X, Info, Atom, FileEdit, ArrowRight,
  RefreshCw, UserPlus, Ticket, Lock, ChevronUp, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import AgentDetailPanel from '@/components/inventory/AgentDetailPanel';
import CryptoObjectRiskDrawer from '@/components/risk/CryptoObjectRiskDrawer';
import DeployToDeviceModal from '@/components/integrations/DeployToDeviceModal';
import TicketDraftModal, { TicketDraft } from '@/components/inventory/TicketDraftModal';

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
    { key: 'name',         label: 'Name',          cls: 'min-w-[180px] flex-1' },
    { key: 'type',         label: 'Type',          cls: 'w-36' },
    { key: 'status',       label: 'Status',        cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',           cls: 'w-20' },
    { key: 'owner',        label: 'Owner',         cls: 'w-32' },
    { key: 'environment',  label: 'Env',           cls: 'w-24' },
    { key: 'lastActivity', label: 'Last Activity', cls: 'w-28' },
    { key: 'violations',   label: 'Violations',    cls: 'w-20' },
  ],
  'TLS Certificate': [
    { key: 'name',         label: 'Common Name',  cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'CA / Issuer',  cls: 'w-36' },
    { key: 'algorithm',    label: 'Algorithm',    cls: 'w-24' },
    { key: 'issueDate',    label: 'Valid From',   cls: 'w-24' },
    { key: 'expiryDate',   label: 'Expiry',       cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',         cls: 'w-16' },
    { key: 'autoRenewal',  label: 'Auto',         cls: 'w-14' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',          cls: 'w-20' },
    { key: 'violations',   label: 'Violations',   cls: 'w-20' },
  ],
  'SSH Key': [
    { key: 'name',         label: 'Key Name',     cls: 'min-w-[180px] flex-1' },
    { key: 'algorithm',    label: 'Key Type',     cls: 'w-24' },
    { key: 'serial',       label: 'Fingerprint',  cls: 'w-40' },
    { key: 'owner',        label: 'Owner',        cls: 'w-28' },
    { key: 'sshLastUsed',  label: 'Last Used',    cls: 'w-28' },
    { key: 'lastRotated',  label: 'Last Rotated', cls: 'w-28' },
    { key: 'sshHosts',     label: 'Hosts',        cls: 'w-16' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',          cls: 'w-20' },
  ],
  'SSH Certificate': [
    { key: 'name',         label: 'Cert Name',    cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'CA',           cls: 'w-36' },
    { key: 'commonName',   label: 'Principals',   cls: 'w-36' },
    { key: 'expiryDate',   label: 'Expiry',       cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',         cls: 'w-16' },
    { key: 'autoRenewal',  label: 'Auto',         cls: 'w-14' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
  ],
  'Code-Signing Certificate': [
    { key: 'name',         label: 'Cert Name',    cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'CA',           cls: 'w-36' },
    { key: 'algorithm',    label: 'Algorithm',    cls: 'w-24' },
    { key: 'keyLength',    label: 'Key Size',     cls: 'w-20' },
    { key: 'expiryDate',   label: 'Expiry',       cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',         cls: 'w-16' },
    { key: 'infrastructure',label: 'HSM',         cls: 'w-28' },
    { key: 'status',       label: 'Status',       cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',          cls: 'w-20' },
  ],
  'K8s Workload Cert': [
    { key: 'name',              label: 'Workload',        cls: 'min-w-[180px] flex-1' },
    { key: 'application',       label: 'Namespace / App', cls: 'w-36' },
    { key: 'caIssuer',          label: 'CA',              cls: 'w-28' },
    { key: 'rotationFrequency', label: 'Rotation',        cls: 'w-24' },
    { key: 'expiryDate',        label: 'Expiry',          cls: 'w-24' },
    { key: 'daysToExpiry',      label: 'Days',            cls: 'w-16' },
    { key: 'autoRenewal',       label: 'Auto',            cls: 'w-14' },
    { key: 'status',            label: 'Status',          cls: 'w-24' },
  ],
  'Encryption Key': [
    { key: 'name',              label: 'Key Name',       cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',          label: 'Key Store',      cls: 'w-36' },
    { key: 'algorithm',         label: 'Algorithm',      cls: 'w-24' },
    { key: 'rotationFrequency', label: 'Rotation Policy',cls: 'w-28' },
    { key: 'lastRotated',       label: 'Last Rotated',   cls: 'w-28' },
    { key: 'autoRenewal',       label: 'Auto-Rotation',  cls: 'w-24' },
    { key: 'status',            label: 'State',          cls: 'w-24' },
  ],
  'AI Agent Token': [
    { key: 'name',         label: 'Token / Agent',   cls: 'min-w-[180px] flex-1' },
    { key: 'agentFw',      label: 'Framework',       cls: 'w-32' },
    { key: 'actionsDay',   label: 'Actions/Day',     cls: 'w-24' },
    { key: 'permRisk',     label: 'Permission Risk', cls: 'w-28' },
    { key: 'expiryDate',   label: 'Expiry',          cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',            cls: 'w-16' },
    { key: 'status',       label: 'Status',          cls: 'w-24' },
    { key: 'violations',   label: 'Violations',      cls: 'w-20' },
  ],
  'API Key / Secret': [
    { key: 'name',         label: 'Secret Name',   cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'Secret Store',  cls: 'w-32' },
    { key: 'secretType',   label: 'Type',          cls: 'w-28' },
    { key: 'owner',        label: 'Owner',         cls: 'w-28' },
    { key: 'lastRotated',  label: 'Last Rotated',  cls: 'w-28' },
    { key: 'exposedIn',    label: 'Exposed In',    cls: 'w-32' },
    { key: 'status',       label: 'Status',        cls: 'w-24' },
    { key: 'violations',   label: 'Violations',    cls: 'w-20' },
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
  const val = (co as Record<string, unknown>)[col.key];
  switch (col.key) {
    case 'name':         return <span className="font-medium text-foreground truncate">{co.name}</span>;
    case 'status':       return <StatusBadge status={co.status} />;
    case 'pqcRisk':      return <PQCBadge risk={co.pqcRisk} />;
    case 'environment':  return <EnvBadge env={co.environment} />;
    case 'daysToExpiry': return <DaysToExpiry days={co.daysToExpiry} />;
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
          <div className="absolute bottom-full right-0 mb-1 z-50 w-60 bg-card border border-border rounded-lg shadow-xl p-2.5 text-[9.5px] text-muted-foreground leading-relaxed">
            Algorithm risk ({alg}) × 30% + Expiry urgency ({exp}) × 20% + Exposure ({env}) × 20% + Dependents ({dep}) × 15% + Ownership ({own}) × 15%
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
  co, onClose, onTicket, assoc, onOpenRiskDrawer, onDeploy,
}: {
  co: CryptoAsset;
  onClose: () => void;
  onTicket: (a: string) => void;
  assoc: typeof mockITAssets;
  onOpenRiskDrawer: () => void;
  onDeploy: () => void;
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

          {/* Metadata */}
          <div className="px-4 py-3">
            <TypeMetadata co={co} assoc={assoc} />
          </div>

          {/* Linked infrastructure */}
          {assoc.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-foreground mb-1.5">
                Linked Infrastructure ({assoc.length})
                <span className="ml-1 text-[9px] text-amber font-normal">expiry or failure affects all</span>
              </p>
              <div className="space-y-1">
                {assoc.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-[10px]">
                    <span className="text-foreground font-medium flex-1 truncate">{a.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">{a.type}</span>
                    <EnvBadge env={a.environment} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational violations */}
          {((co.daysToExpiry >= 0 && co.daysToExpiry <= 30) || co.owner === 'Unassigned' || co.policyViolations > 0) && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-coral mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-coral inline-block" />
                Operational Violations
              </p>
              {co.daysToExpiry >= 0 && co.daysToExpiry <= 30 && (
                <div className="flex items-center gap-2 text-[10px] py-1 border-b border-border/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-coral flex-shrink-0" />
                  <span className="text-foreground flex-1">Expires in {co.daysToExpiry} days</span>
                  {!isSecret && <button onClick={() => onTicket('renew')} className="text-teal hover:underline text-[10px]">Renew</button>}
                </div>
              )}
              {co.owner === 'Unassigned' && (
                <div className="flex items-center gap-2 text-[10px] py-1 border-b border-border/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                  <span className="text-foreground flex-1">No owner assigned</span>
                  {!isSecret && <button onClick={() => onTicket('assign')} className="text-teal hover:underline text-[10px]">Assign</button>}
                </div>
              )}
              {co.policyViolations > 0 && (
                <div className="flex items-center gap-2 text-[10px] py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                  <span className="text-foreground flex-1">{co.policyViolations} policy violation{co.policyViolations !== 1 ? 's' : ''}</span>
                  {!isSecret && <button onClick={() => onTicket('fix')} className="text-teal hover:underline text-[10px]">Fix</button>}
                </div>
              )}
            </div>
          )}

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
                <button
                  onClick={() => onTicket('pqc')}
                  className="w-full mt-2 text-[10px] font-semibold px-2 py-1.5 rounded bg-purple/20 text-purple-light hover:bg-purple/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Ticket className="w-3 h-3" />
                  Create PQC Migration Ticket →
                </button>
              </div>
            </div>
          )}

          {/* AI narrative */}
          <div className="px-4 py-3">
            <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-teal mb-1">✦ Infinity AI</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {co.pqcRisk === 'Critical'
                  ? `${co.algorithm} is quantum-vulnerable. ${assoc.length} dependent asset${assoc.length !== 1 ? 's' : ''} — failure cascades. ${co.owner === 'Unassigned' ? 'Assign owner before migration.' : `Owned by ${co.owner}.`}`
                  : co.daysToExpiry >= 0 && co.daysToExpiry <= 30
                  ? `Expiring in ${co.daysToExpiry} days with ${assoc.length} dependent asset${assoc.length !== 1 ? 's' : ''}. ${co.autoRenewal ? 'Auto-renewal configured.' : 'Manual action required.'}`
                  : `${co.algorithm} meets current standards. ${assoc.length} asset${assoc.length !== 1 ? 's' : ''} depend on it. No immediate action needed.`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-3">
            <p className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>

            {isSecret && !SECRETS_LICENSED ? (
              <SecretsUpsell co={co} />
            ) : (
              <div className="space-y-3">
                {/* Remediation — teal, direct execution */}
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Remediation</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(co.type === 'TLS Certificate' || co.type === 'K8s Workload Cert' || co.type === 'SSH Certificate') && (
                      <button onClick={() => toast.success(`Renewal initiated for ${co.name}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold bg-teal text-primary-foreground hover:bg-teal/90 transition-colors">
                        <RefreshCw className="w-3 h-3" /> Renew
                      </button>
                    )}
                    {(co.type === 'SSH Key' || co.type === 'Encryption Key' || co.type === 'AI Agent Token') && (
                      <button onClick={() => toast.success(`Rotation initiated for ${co.name}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold bg-teal text-primary-foreground hover:bg-teal/90 transition-colors">
                        <RefreshCw className="w-3 h-3" /> Rotate
                      </button>
                    )}
                    <button onClick={() => toast.success(`Owner assignment opened`)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors">
                      <UserPlus className="w-3 h-3" /> Assign Owner
                    </button>
                    <button onClick={() => toast.error(`Revoke ${co.name}?`, { action: { label: 'Confirm', onClick: () => toast.success('Revoked') } })}
                      className="px-2.5 py-1.5 rounded text-[10px] font-semibold border border-coral/30 text-coral hover:bg-coral/10 transition-colors">
                      Revoke
                    </button>
                    {(co.type === 'TLS Certificate' || co.type === 'K8s Workload Cert') && (
                      <button onClick={onDeploy}
                        className="px-2.5 py-1.5 rounded text-[10px] font-semibold bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors">
                        Deploy
                      </button>
                    )}
                  </div>
                </div>

                {/* Ticket — outlined purple */}
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Create Ticket (AI-filled)</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => onTicket('fix')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors">
                      <Ticket className="w-3 h-3" /> Remediation Ticket
                    </button>
                    {isPqc && (
                      <button onClick={() => onTicket('pqc')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors">
                        <Atom className="w-3 h-3" /> PQC Ticket
                      </button>
                    )}
                  </div>
                </div>

                {/* Governance — ghost */}
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Governance</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={onOpenRiskDrawer}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Info className="w-3 h-3" /> Why this score?
                    </button>
                    <button onClick={() => toast.success('Added to group')}
                      className="px-2.5 py-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      Add to Group
                    </button>
                    <button onClick={() => toast.success('Added to QTH migration queue')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Atom className="w-3 h-3" /> Add to QTH Queue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CryptoObjectsTab({ onCreateTicket }: Props) {
  const [typeFilter, setTypeFilter]     = useState('All');
  const [search, setSearch]             = useState('');
  const [algFilter, setAlgFilter]       = useState('');
  const [envFilter, setEnvFilter]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pqcFilter, setPqcFilter]       = useState('');
  const [ownerFilter, setOwnerFilter]   = useState('');
  const [detailAsset, setDetailAsset]   = useState<CryptoAsset | null>(null);
  const [ticketAsset, setTicketAsset]   = useState<CryptoAsset | null>(null);
  const [ticketAction, setTicketAction] = useState('fix');
  const [riskDrawer, setRiskDrawer]     = useState<CryptoAsset | null>(null);
  const [deployAsset, setDeployAsset]   = useState<CryptoAsset | null>(null);
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');

  const { manualIdentities }    = useInventoryRegistry();
  const { setSelectedEntity }   = useAgent();
  const { filters: navFilters } = useNav();

  const { type: navType, status: navStatus, algorithm: navAlg, owner: navOwner, pqcRisk: navPqc } = navFilters;
  useEffect(() => {
    if (navType)   setTypeFilter(navType);
    if (navStatus) setStatusFilter(navStatus);
    if (navAlg)    setAlgFilter(navAlg);
    if (navOwner)  setOwnerFilter(navOwner);
    if (navPqc)    setPqcFilter(navPqc);
  }, [navType, navStatus, navAlg, navOwner, navPqc]);

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
    if (algFilter === 'weak') r = r.filter(a => /RSA-1024|RSA-2048|SHA-1/.test(a.algorithm));
    else if (algFilter) r = r.filter(a => a.algorithm === algFilter);
    if (envFilter)    r = r.filter(a => a.environment === envFilter);
    if (statusFilter) r = r.filter(a => a.status === statusFilter);
    if (pqcFilter)    r = r.filter(a => a.pqcRisk === pqcFilter);
    if (ownerFilter === 'Unassigned') r = r.filter(a => a.owner === 'Unassigned');
    return r;
  }, [allAssets, typeFilter, search, algFilter, envFilter, statusFilter, pqcFilter, ownerFilter]);

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
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, owner, application, algorithm..."
              className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          {[
            { val: algFilter,    set: setAlgFilter,    label: 'All Algorithms', opts: algorithms.map(a => ({ v: a, l: a })), extra: [{ v: 'weak', l: 'Weak (RSA/SHA-1)' }] },
            { val: envFilter,    set: setEnvFilter,    label: 'All Envs',       opts: ['Production','Staging','Development'].map(e => ({ v: e, l: e })) },
            { val: statusFilter, set: setStatusFilter, label: 'All Status',     opts: ['Active','Expiring','Expired','Orphaned','Revoked'].map(s => ({ v: s, l: s })) },
            { val: pqcFilter,    set: setPqcFilter,    label: 'All PQC Risk',   opts: ['Critical','High','Medium','Low','Safe'].map(r => ({ v: r, l: r })) },
            { val: ownerFilter,  set: setOwnerFilter,  label: 'All Owners',     opts: [{ v: 'Unassigned', l: 'Unassigned only' }] },
          ].map(({ val, set, label, opts, extra }) => (
            <select key={label} value={val} onChange={e => set(e.target.value)}
              className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="">{label}</option>
              {(extra ?? []).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          {(algFilter || envFilter || statusFilter || pqcFilter || ownerFilter) && (
            <button onClick={() => { setAlgFilter(''); setEnvFilter(''); setStatusFilter(''); setPqcFilter(''); setOwnerFilter(''); }}
              className="text-[10px] text-coral hover:underline">Clear</button>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} identities</span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs table-auto">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr className="border-b border-border">
                  {cols.map(col => (
                    <th key={col.key} className={`text-left py-2 px-2 font-medium text-muted-foreground ${col.cls}`}>
                      {col.key === 'daysToExpiry' ? (
                        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="inline-flex items-center gap-1 hover:text-foreground">
                          {col.label} {sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                  <th className="w-28 py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => {
                  const primary = getPrimaryAction(co);
                  const isManual = manualIdentities.some(m => m.id === co.id);
                  return (
                    <tr key={co.id} onClick={() => setDetailAsset(co)}
                      className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors group">
                      {cols.map(col => (
                        <td key={col.key} className={`py-2 px-2 ${col.cls}`}>
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
                      <td className="py-2 px-2 text-right" onClick={e => e.stopPropagation()}>
                        {primary ? (
                          <button
                            onClick={() => openTicket(co, primary.action)}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity text-[9.5px] font-semibold px-2 py-1 rounded whitespace-nowrap ${primary.btnCls}`}
                          >
                            {primary.label}
                          </button>
                        ) : (
                          <button onClick={() => setDetailAsset(co)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[9.5px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto">
                            Details <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
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
        />
      )}

      {/* Ticket draft modal */}
      {ticketAsset && (
        <TicketDraftModal
          asset={ticketAsset}
          action={ticketAction}
          onClose={() => setTicketAsset(null)}
          onConfirm={(draft: TicketDraft) => {
            onCreateTicket({
              objectName: ticketAsset.name,
              objectType: ticketAsset.type,
              algorithm: ticketAsset.algorithm,
              status: ticketAsset.status,
              daysToExpiry: ticketAsset.daysToExpiry,
              environment: ticketAsset.environment,
              draft,
            });
          }}
        />
      )}

      <CryptoObjectRiskDrawer object={riskDrawer} onClose={() => setRiskDrawer(null)} />
      <DeployToDeviceModal open={!!deployAsset} onClose={() => setDeployAsset(null)} cert={deployAsset} />
    </div>
  );
}
