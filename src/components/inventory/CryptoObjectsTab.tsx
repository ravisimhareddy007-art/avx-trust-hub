import { FEATURES } from '@/config/features';
import { algVuln } from '@/lib/risk/qes';
import { getCryptoViolations, cryptoViolationCount } from '@/lib/violations';
import React, { useState, useMemo, useEffect } from 'react';
import { mockAssets, CryptoAsset, violatedPoliciesForObject } from '@/data/mockData';
import { VIOLATION_FILTERS } from '@/lib/filters/cryptoFilters';
import { mockITAssets } from '@/data/inventoryMockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';
import { useAgent } from '@/context/AgentContext';
import { useNav } from '@/context/NavigationContext';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry } from '@/components/shared/UIComponents';
import {
  Search, X, Info, Atom, FileEdit, ArrowRight,
  Ticket, Lock, ChevronUp, ChevronDown,
  Filter as FilterIcon,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import AgentDetailPanel from '@/components/inventory/AgentDetailPanel';
import CryptoObjectRiskDrawer from '@/components/risk/CryptoObjectRiskDrawer';
import DeployToDeviceModal from '@/components/integrations/DeployToDeviceModal';
import TicketDraftModal, { TicketDraft } from '@/components/inventory/TicketDraftModal';
import { ticketForObject } from '@/lib/ticketStore';
import { computeCRS } from '@/lib/risk/crs';
import { useExceptions, effectiveViolations } from '@/lib/exceptions/ExceptionsContext';
import { RaiseExceptionModal } from '@/lib/exceptions/ExceptionComponents';

// Map a violation label → its built-in policy (id + name). Returns null for
// operational flags that don't correspond to a policy.
function violationToPolicy(label: string, co: CryptoAsset): { policyId: string; policyName: string } | null {
  const l = label.toLowerCase();
  if (l.includes('self-signed')) return { policyId: 'oob-003', policyName: 'Self-Signed Server Certificate' };
  if (l.includes('quantum-vulnerable') || l.includes('quantum vulnerable')) return { policyId: 'oob-pqc', policyName: 'Quantum-Vulnerable Algorithm in Use' };
  if (l.includes('sha-1') || l.includes('md5')) return { policyId: 'oob-001', policyName: 'Weak Signature Algorithm' };
  if (l.includes('revoked')) return { policyId: 'oob-004', policyName: 'Revoked Certificate Still Deployed' };
  if (((co as any).algorithm || '').match(/RSA-(512|1024)/i)) return { policyId: 'oob-002', policyName: 'Weak RSA Key Length' };
  return null;
}

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
    { key: 'name',         label: 'Name',             cls: 'min-w-[180px] flex-1' },
    { key: 'type',         label: 'Type',             cls: 'w-36' },
    { key: 'status',       label: 'Status',           cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',              cls: 'w-20' },
    { key: 'owner',        label: 'Owner',            cls: 'w-32' },
    { key: 'environment',  label: 'Env',              cls: 'w-24' },
    { key: 'lastActivity', label: 'Last Activity',    cls: 'w-28' },
    { key: 'violations',   label: 'Violations',       cls: 'w-20' },
    { key: 'riskScore',    label: 'Risk', cls: 'w-20' },
  ],
  'TLS Certificate': [
    { key: 'name',         label: 'Common Name',      cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'CA / Issuer',      cls: 'w-36' },
    { key: 'algorithm',    label: 'Algorithm',        cls: 'w-24' },
    { key: 'issueDate',    label: 'Valid From',       cls: 'w-24' },
    { key: 'expiryDate',   label: 'Expiry',           cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',             cls: 'w-16' },
    { key: 'autoRenewal',  label: 'Auto',             cls: 'w-14' },
    { key: 'status',       label: 'Status',           cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',              cls: 'w-20' },
    { key: 'violations',   label: 'Violations',       cls: 'w-20' },
    { key: 'riskScore',    label: 'Risk', cls: 'w-20' },
  ],
  'SSH Key': [
    { key: 'name',         label: 'Key Name',         cls: 'min-w-[180px] flex-1' },
    { key: 'algorithm',    label: 'Key Type',         cls: 'w-24' },
    { key: 'serial',       label: 'Fingerprint',      cls: 'w-40' },
    { key: 'owner',        label: 'Owner',            cls: 'w-28' },
    { key: 'sshLastUsed',  label: 'Last Used',        cls: 'w-28' },
    { key: 'lastRotated',  label: 'Last Rotated',     cls: 'w-28' },
    { key: 'sshHosts',     label: 'Hosts',            cls: 'w-16' },
    { key: 'status',       label: 'Status',           cls: 'w-24' },
    { key: 'pqcRisk',      label: 'PQC',              cls: 'w-20' },
    { key: 'riskScore',    label: 'Risk', cls: 'w-20' },
  ],
  'SSH Certificate': [
    { key: 'name',         label: 'Cert Name',        cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'CA',               cls: 'w-36' },
    { key: 'commonName',   label: 'Principals',       cls: 'w-36' },
    { key: 'expiryDate',   label: 'Expiry',           cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',             cls: 'w-16' },
    { key: 'autoRenewal',  label: 'Auto',             cls: 'w-14' },
    { key: 'status',       label: 'Status',           cls: 'w-24' },
    { key: 'riskScore',    label: 'Risk', cls: 'w-20' },
  ],
  'Code-Signing Certificate': [
    { key: 'name',          label: 'Cert Name',        cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',      label: 'CA',               cls: 'w-36' },
    { key: 'algorithm',     label: 'Algorithm',        cls: 'w-24' },
    { key: 'keyLength',     label: 'Key Size',         cls: 'w-20' },
    { key: 'expiryDate',    label: 'Expiry',           cls: 'w-24' },
    { key: 'daysToExpiry',  label: 'Days',             cls: 'w-16' },
    { key: 'infrastructure',label: 'HSM',              cls: 'w-28' },
    { key: 'status',        label: 'Status',           cls: 'w-24' },
    { key: 'pqcRisk',       label: 'PQC',              cls: 'w-20' },
    { key: 'riskScore',     label: 'Risk', cls: 'w-20' },
  ],
  'K8s Workload Cert': [
    { key: 'name',              label: 'Workload',         cls: 'min-w-[180px] flex-1' },
    { key: 'application',       label: 'Namespace / App',  cls: 'w-36' },
    { key: 'caIssuer',          label: 'CA',               cls: 'w-28' },
    { key: 'rotationFrequency', label: 'Rotation',         cls: 'w-24' },
    { key: 'expiryDate',        label: 'Expiry',           cls: 'w-24' },
    { key: 'daysToExpiry',      label: 'Days',             cls: 'w-16' },
    { key: 'autoRenewal',       label: 'Auto',             cls: 'w-14' },
    { key: 'status',            label: 'Status',           cls: 'w-24' },
    { key: 'riskScore',         label: 'Risk', cls: 'w-20' },
  ],
  'Encryption Key': [
    { key: 'name',              label: 'Key Name',         cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',          label: 'Key Store',        cls: 'w-36' },
    { key: 'algorithm',         label: 'Algorithm',        cls: 'w-24' },
    { key: 'rotationFrequency', label: 'Rotation Policy',  cls: 'w-28' },
    { key: 'lastRotated',       label: 'Last Rotated',     cls: 'w-28' },
    { key: 'autoRenewal',       label: 'Auto-Rotation',    cls: 'w-24' },
    { key: 'status',            label: 'State',            cls: 'w-24' },
    { key: 'riskScore',         label: 'Risk', cls: 'w-20' },
  ],
  'AI Agent Token': [
    { key: 'name',         label: 'Token / Agent',    cls: 'min-w-[180px] flex-1' },
    { key: 'agentFw',      label: 'Framework',        cls: 'w-32' },
    { key: 'actionsDay',   label: 'Actions/Day',      cls: 'w-24' },
    { key: 'permRisk',     label: 'Permission Risk',  cls: 'w-28' },
    { key: 'expiryDate',   label: 'Expiry',           cls: 'w-24' },
    { key: 'daysToExpiry', label: 'Days',             cls: 'w-16' },
    { key: 'status',       label: 'Status',           cls: 'w-24' },
    { key: 'violations',   label: 'Violations',       cls: 'w-20' },
    { key: 'riskScore',    label: 'Risk', cls: 'w-20' },
  ],
  'API Key / Secret': [
    { key: 'name',         label: 'Secret Name',      cls: 'min-w-[180px] flex-1' },
    { key: 'caIssuer',     label: 'Secret Store',     cls: 'w-32' },
    { key: 'secretType',   label: 'Type',             cls: 'w-28' },
    { key: 'owner',        label: 'Owner',            cls: 'w-28' },
    { key: 'lastRotated',  label: 'Last Rotated',     cls: 'w-28' },
    { key: 'exposedIn',    label: 'Exposed In',       cls: 'w-32' },
    { key: 'status',       label: 'Status',           cls: 'w-24' },
    { key: 'violations',   label: 'Violations',       cls: 'w-20' },
    { key: 'riskScore',    label: 'Risk', cls: 'w-20' },
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
  if (cryptoViolationCount(co) > 0)
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
    case 'name':         return <span className="font-medium text-foreground truncate">{co.name}</span>;
    case 'status':       return <StatusBadge status={co.status} />;
    case 'pqcRisk':      return <PQCBadge risk={co.pqcRisk} />;
    case 'environment':  return <EnvBadge env={co.environment} />;
    case 'daysToExpiry': return <DaysToExpiry days={co.daysToExpiry} />;
    case 'autoRenewal':
      return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${co.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{co.autoRenewal ? 'Yes' : 'No'}</span>;
    case 'violations':
      return cryptoViolationCount(co) > 0
        ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral/15 text-coral text-[10px] font-bold">{cryptoViolationCount(co)}</span>
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
    <div className="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-border/30 last:border-0 items-start">
      <span className="text-[11px] text-muted-foreground leading-tight pt-0.5">{label}</span>
      <span className="text-[11px] text-foreground font-medium break-words leading-tight">{value}</span>
    </div>
  );
}

// ── Risk score row ────────────────────────────────────────────────────────────


// ── Derive violations from real data ─────────────────────────────────────────

interface ViolationItem { label: string; severity: 'critical' | 'high' | 'medium'; action?: string; actionKey?: string; }

function deriveViolations(co: CryptoAsset): { policy: ViolationItem[]; operational: ViolationItem[]; quantum: ViolationItem[] } {
  const policy: ViolationItem[] = [];
  const operational: ViolationItem[] = [];
  const quantum: ViolationItem[] = [];

  // ── POLICY violations (real policy breaches; eligible for exceptions) ──
  if (co.environment === 'Production' && co.caIssuer === 'Self-Signed')
    policy.push({ label: 'Self-signed certificate in production', severity: 'high' });

  if (['RSA-512','RSA-1024','SHA-1','MD5'].includes(co.algorithm))
    policy.push({ label: `Weak algorithm (${co.algorithm})`, severity: 'critical' });

  // ── OPERATIONAL alerts (informational; no actions, no exceptions) ──
  if (co.status === 'Expired')
    operational.push({ label: `Expired ${co.daysToExpiry < 0 ? Math.abs(co.daysToExpiry) + 'd ago' : ''}`, severity: 'critical' });
  else if (co.status === 'Expiring' && co.daysToExpiry >= 0)
    operational.push({ label: `Expires in ${co.daysToExpiry}d`, severity: co.daysToExpiry <= 7 ? 'critical' : 'high' });

  if (!co.autoRenewal && co.daysToExpiry >= 0 && co.daysToExpiry <= 30 && co.type !== 'SSH Key' && co.type !== 'Encryption Key')
    operational.push({ label: 'Auto-renewal disabled — manual action required', severity: 'high' });

  if (co.owner === 'Unassigned' || co.status === 'Orphaned')
    operational.push({ label: 'No owner assigned', severity: 'high' });

  if (co.rotationFrequency === 'Never')
    operational.push({ label: 'No rotation policy configured', severity: 'medium' });

  if ((co.tags ?? []).includes('source-code') || (co.tags ?? []).includes('code-exposed') || (co.tags ?? []).includes('hardcoded'))
    operational.push({ label: 'Secret detected in source code', severity: 'critical' });

  if (co.agentMeta?.permissionRisk === 'Over-privileged')
    operational.push({ label: 'Token is over-privileged — unused scopes detected', severity: 'high' });

  // ── QUANTUM violations (policy violation; eligible for exceptions) ──
  const isPqc = ['RSA-1024','RSA-2048','RSA-4096','ECDSA-P256','ECDSA-P384','ECC P-256','ECC P-384','SHA-1','MD5','DH-1024','DH-2048'].includes(co.algorithm);
  if (isPqc) {
    const expYear = co.expiryDate && co.expiryDate !== 'N/A' ? new Date(co.expiryDate).getFullYear() : 0;
    const yearsPast = expYear > 0 ? Math.max(0, expYear - 2030) : 0;
    quantum.push({
      label: `${co.algorithm} is quantum-vulnerable (NIST deprecated)${expYear > 0 ? ` · Expires ${expYear}${yearsPast > 0 ? ` — ${yearsPast}yr past deadline` : ' — at NIST 2030 deadline'}` : ''}`,
      severity: co.pqcRisk === 'Critical' ? 'critical' : 'high',
    });
  }

  return { policy, operational, quantum };
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
      {label}
      {count !== undefined && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${count > 0 ? 'bg-coral/15 text-coral' : 'bg-secondary text-muted-foreground'}`}>{count}</span>}
    </p>
  );
}

// ── Type-specific metadata ────────────────────────────────────────────────────

function TypeMetadata({ co }: { co: CryptoAsset }) {
  if (co.type === 'TLS Certificate') {
    return (
      <>
        <MetaRow label="Subject DN" value={<span className="font-mono text-[10px]">CN={co.commonName}, O=Acme Corp, C=US</span>} />
        <MetaRow label="CA type" value={caTypeFor(co.caIssuer)} />
        <MetaRow label="Serial" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Signature algorithm" value={signatureAlgoFor(co.algorithm)} />
        <MetaRow label="Key size" value={`${co.keyLength} bits`} />
        <MetaRow label="Key usage" value={keyUsageFor(co.type)} />
        <MetaRow label="Extended key usage" value={extKeyUsageFor(co.type)} />
        <MetaRow label="Last renewed" value={co.lastRotated} />
        <MetaRow label="Auto-renewal" value={co.autoRenewal
          ? <span className="text-teal">Enabled — {co.rotationFrequency}</span>
          : <span className="text-coral">Disabled — manual required</span>} />
        <MetaRow label="Managed via" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === 'SSH Key') {
    return (
      <>
        <MetaRow label="Fingerprint" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Key size" value={`${co.keyLength} bits`} />
        <MetaRow label="Privilege level" value={
          <span className={privilegeLevelFor(co) === 'root' ? 'text-coral' : privilegeLevelFor(co) === 'admin' ? 'text-amber' : 'text-foreground'}>
            {privilegeLevelFor(co)}
          </span>
        } />
        <MetaRow label="Auth method" value="Public key authentication" />
        <MetaRow label="Rotation policy" value={<span className={co.rotationFrequency === 'Never' ? 'text-coral' : 'text-foreground'}>{co.rotationFrequency}</span>} />
        <MetaRow label="Last rotated" value={co.lastRotated} />
        {co.sshEndpoints && co.sshEndpoints.length > 0 && (
          <MetaRow label={`Authorized endpoints (${co.sshEndpoints.length})`} value={
            <div className="space-y-1">
              {co.sshEndpoints.slice(0, 5).map((ep, i) => (
                <div key={i} className="text-[10px]">
                  <span className="font-mono text-foreground">{ep.host}</span>
                  <span className="text-muted-foreground"> · {ep.ip} · {ep.role} · {ep.lastSeen.split(' ')[0]}</span>
                </div>
              ))}
              {co.sshEndpoints.length > 5 && <span className="text-[10px] text-muted-foreground">+{co.sshEndpoints.length - 5} more</span>}
            </div>
          } />
        )}
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === 'SSH Certificate') {
    return (
      <>
        <MetaRow label="KRL serial" value={<span className="font-mono text-[10px]">{co.serial}</span>} />
        <MetaRow label="Principals" value={co.commonName} />
        <MetaRow label="Key algorithm" value={co.algorithm} />
        <MetaRow label="Key size" value={`${co.keyLength} bits`} />
        <MetaRow label="Auto-renewal" value={co.autoRenewal
          ? <span className="text-teal">Enabled — {co.rotationFrequency}</span>
          : <span className="text-coral">Disabled</span>} />
        <MetaRow label="CA" value={co.caIssuer} />
        {co.sshEndpoints && co.sshEndpoints.length > 0 && (
          <MetaRow label={`Authorized hosts (${co.sshEndpoints.length})`} value={
            <div className="space-y-1">
              {co.sshEndpoints.map((ep, i) => (
                <div key={i} className="font-mono text-[10px] text-foreground">{ep.host} <span className="text-muted-foreground">· {ep.role}</span></div>
              ))}
            </div>
          } />
        )}
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === 'Code-Signing Certificate') {
    return (
      <>
        <MetaRow label="Serial" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Subject" value={co.commonName} />
        <MetaRow label="CA type" value={caTypeFor(co.caIssuer)} />
        <MetaRow label="Key size" value={`${co.keyLength} bits`} />
        <MetaRow label="Key usage" value="Digital Signature" />
        <MetaRow label="Code signing OID" value="1.3.6.1.5.5.7.3.3" />
        <MetaRow label="HSM / Store" value={co.infrastructure} />
        <MetaRow label="Auto-renewal" value={co.autoRenewal ? <span className="text-teal">Enabled</span> : <span className="text-coral">Disabled — {co.rotationFrequency}</span>} />
        <MetaRow label="Managed via" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === 'K8s Workload Cert') {
    return (
      <>
        <MetaRow label="SPIFFE ID" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Workload" value={co.commonName} />
        <MetaRow label="Key algorithm" value={co.algorithm} />
        <MetaRow label="Key size" value={`${co.keyLength} bits`} />
        <MetaRow label="Auto-rotation" value={co.autoRenewal
          ? <span className="text-teal">cert-manager — {co.rotationFrequency}</span>
          : <span className="text-coral">Manual — not automated</span>} />
        <MetaRow label="Namespace" value={co.application} />
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === 'Encryption Key') {
    return (
      <>
        <MetaRow label="Key ID / ARN" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Key store" value={co.caIssuer} />
        <MetaRow label="Key size" value={`${co.keyLength} bits`} />
        <MetaRow label="Key usage" value="ENCRYPT_DECRYPT" />
        <MetaRow label="Key state" value={<span className={co.status === 'Active' ? 'text-teal' : 'text-amber'}>{co.status === 'Active' ? 'Active / Enabled' : co.status}</span>} />
        <MetaRow label="Auto-rotation" value={co.autoRenewal
          ? <span className="text-teal">Enabled — {co.rotationFrequency}</span>
          : <span className="text-coral">Disabled</span>} />
        <MetaRow label="Created" value={co.issueDate} />
        <MetaRow label="Last rotated" value={co.lastRotated} />
        <MetaRow label="Managed via" value={co.discoverySource} />
      </>
    );
  }


  if (co.type === 'API Key / Secret') {
    const ei = exposedInFor(co);
    return (
      <>
        <MetaRow label="Secret path" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Secret store" value={co.caIssuer} />
        <MetaRow label="Secret type" value={secretTypeFor(co)} />
        <MetaRow label="Algorithm" value={co.algorithm} />
        <MetaRow label="Exposure" value={<span className={ei.color}>{ei.label}</span>} />
        <MetaRow label="Last rotated" value={co.lastRotated} />
        <MetaRow label="Rotation policy" value={<span className={co.rotationFrequency === 'Never' ? 'text-coral' : 'text-foreground'}>{co.rotationFrequency}</span>} />
        <MetaRow label="Auto-rotation" value={co.autoRenewal ? <span className="text-teal">Enabled</span> : <span className="text-coral">Disabled</span>} />
        <MetaRow label="Managed via" value={co.discoverySource} />
      </>
    );
  }

  return null;
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
  const isSecret = co.type === 'API Key / Secret';
  const [riskTip, setRiskTip] = useState(false);

  // Single source of truth: real CRS engine (spec factors 31/24/19/15/11).
  const crsResult = computeCRS(co);
  const riskScore = crsResult.crs;
  const crsFactors = crsResult.factors;
  const crsTotalW = crsFactors.reduce((sw, fac) => sw + fac.weight, 0);
  const riskCol = riskScore >= 60 ? 'text-coral' : riskScore >= 30 ? 'text-amber' : 'text-teal';

  const { policy, operational, quantum } = deriveViolations(co);
  const rawViolations = policy.length + quantum.length;
  const { activeForObject, isExcepted } = useExceptions();
  const exceptedCount = activeForObject(co.id).length;
  const totalViolations = effectiveViolations(rawViolations, exceptedCount);
  const shownPolicyViolations = effectiveViolations((co as any).policyViolations ?? 0, exceptedCount);
  const parentAsset = (co as any).host || co.application || co.infrastructure;
  const [exceptCtx, setExceptCtx] = useState<{ policyId: string; policyName: string } | null>(null);
  const objectTicket = ticketForObject(co.id);

  const expiryDisplay = co.daysToExpiry >= 0
    ? co.daysToExpiry === 0 ? 'Today' : `${co.daysToExpiry}d`
    : co.daysToExpiry === -1 ? 'No expiry' : `${Math.abs(co.daysToExpiry)}d ago`;
  const expiryCol = co.daysToExpiry >= 0 && co.daysToExpiry <= 7 ? 'text-coral' : co.daysToExpiry >= 0 && co.daysToExpiry <= 30 ? 'text-amber' : 'text-foreground';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[38%] bg-card border-l border-border shadow-2xl h-full flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-secondary/30">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-semibold text-foreground truncate">{co.name}</p>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded flex-shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">{co.type} · {co.environment} · {co.application}</p>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={co.status} />
            {isPqc && <PQCBadge risk={co.pqcRisk} />}
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-card rounded-lg px-3 py-2 border border-border/50">
              <div className="flex items-center gap-1">
                <span className={`text-[18px] font-bold tabular-nums ${riskCol}`}>{riskScore}</span>
                <div className="relative">
                  <button onMouseEnter={() => setRiskTip(true)} onMouseLeave={() => setRiskTip(false)} onClick={() => setRiskTip(v => !v)} className="flex items-center gap-0.5 mt-1 text-[8.5px] text-muted-foreground/60 hover:text-teal">
                    <Info className="w-3 h-3" /> Explain
                  </button>
                  {riskTip && (
                    <div className="absolute bottom-full left-0 mb-1 z-[9999] w-80 bg-card border border-border rounded-lg shadow-xl p-3 text-[10px] text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1.5">Crypto Risk Score: factors</p>
                      <div className="space-y-1.5">
                        {crsFactors.map(fac => (
                          <div key={fac.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-foreground font-medium capitalize">{fac.label}</span>
                              <span className="tabular-nums whitespace-nowrap">{fac.raw} × {Math.round((fac.weight / crsTotalW) * 100)}% = <span className="text-foreground font-medium">{Math.round(fac.raw * (fac.weight / crsTotalW))}</span></span>
                            </div>
                            <p className="text-[9px] text-muted-foreground/80 leading-snug">{fac.why}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Risk score</p>
            </div>
            <div className="bg-card rounded-lg px-3 py-2 border border-border/50">
              <p className={`text-[18px] font-bold tabular-nums ${expiryCol}`}>{expiryDisplay}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {co.daysToExpiry >= 0 ? 'Expires in' : co.daysToExpiry === -1 ? 'Validity' : 'Expired'}
              </p>
            </div>
            <div className="bg-card rounded-lg px-3 py-2 border border-border/50">
              <p className={`text-[18px] font-bold tabular-nums ${totalViolations > 0 ? 'text-coral' : rawViolations > 0 ? 'text-amber' : 'text-teal'}`}>{totalViolations}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Violations
                {rawViolations > 0 && totalViolations === 0 && <span className="ml-1 text-amber">· Excepted</span>}
                {exceptedCount > 0 && totalViolations > 0 && <span className="ml-1 text-amber">· {exceptedCount} excepted</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/40">

          {/* Actions */}
          {(() => {
            const showDownload = co.type === 'TLS Certificate' || co.type === 'Code-Signing Certificate';
            const hasOperational = operational.length > 0;
            const hasAnyAction = showDownload || hasOperational || isPqc || (!hasOperational && !isPqc);
            if (isSecret && !SECRETS_LICENSED) {
              return (
                <div className="px-4 py-3">
                  <SectionHeading label="Actions" />
                  <SecretsUpsell co={co} />
                </div>
              );
            }
            return (
              <div className="px-4 py-3">
                <SectionHeading label="Actions" />
                <div className="flex flex-wrap gap-1.5">
                  {showDownload && (
                    <button onClick={() => toast.success('Certificate downloaded')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-border text-foreground hover:bg-secondary/80 transition-colors">
                      ↓ Download
                    </button>
                  )}
                  {hasOperational && (
                    <button onClick={() => onTicket('fix')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors">
                      <Ticket className="w-3 h-3" /> Remediation ticket
                    </button>
                  )}
                  {isPqc && (
                    <button onClick={() => onTicket('pqc')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors">
                      <Atom className="w-3 h-3" /> PQC ticket
                    </button>
                  )}
                  {!hasOperational && !isPqc && (
                    <button onClick={() => onTicket('fix')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors">
                      <Ticket className="w-3 h-3" /> Create ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Type-specific details */}
          <div className="px-4 py-3">
            <SectionHeading label={
              co.type === 'TLS Certificate' ? 'Certificate details' :
              co.type === 'SSH Key' ? 'Key details' :
              co.type === 'SSH Certificate' ? 'Certificate details' :
              co.type === 'Code-Signing Certificate' ? 'Certificate details' :
              co.type === 'K8s Workload Cert' ? 'Workload details' :
              co.type === 'Encryption Key' ? 'Key details' :
              'Secret details'
            } />
            <TypeMetadata co={co} />
          </div>

          {/* Ownership and operations, compact and low-emphasis (fields, not headlines) */}
          <div className="px-4 py-2.5">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground/60 font-semibold mb-1.5">Ownership & operations</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px]">
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Owner</span><span className={`text-right truncate ${co.owner === 'Unassigned' ? 'text-coral' : 'text-foreground'}`}>{co.owner}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Team</span><span className="text-foreground text-right truncate">{co.team}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Application</span><span className="text-foreground text-right truncate">{co.application}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted-foreground">Environment</span><span className="text-foreground text-right">{co.environment}</span></div>
              <div className="flex justify-between gap-2 col-span-2"><span className="text-muted-foreground">Infrastructure</span><span className="text-foreground text-right truncate">{co.infrastructure}</span></div>
            </div>
            {(co.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(co.tags ?? []).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>)}
              </div>
            )}
          </div>

          {/* Violations, single unified list (policy + quantum + operational) */}
          {(policy.length + quantum.length + operational.length) > 0 && (
            <div className="px-4 py-3">
              <SectionHeading label="Violations & alerts" count={policy.length + quantum.length} />
              <div className="space-y-1.5">
                {/* Policy + quantum: traceable to a policy, eligible for ticket or exception */}
                {[...policy.map(v => ({ v, kind: 'policy' as const })), ...quantum.map(v => ({ v, kind: 'quantum' as const }))].map(({ v, kind }, i) => {
                  const mapped = violationToPolicy(v.label, co);
                  const policyId = mapped?.policyId;
                  const excepted = policyId ? isExcepted(co.id, policyId) : false;
                  const ticket = objectTicket && policyId ? objectTicket : undefined;
                  return (
                    <div key={`pv-${i}`} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${kind === 'quantum' ? 'bg-purple/60' : v.severity === 'critical' ? 'bg-coral' : v.severity === 'high' ? 'bg-amber' : 'bg-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-foreground">{v.label}</span>
                          {kind === 'quantum' && <span className="text-[8.5px] px-1 py-0.5 rounded bg-purple/15 text-purple-light font-medium">PQC</span>}
                        </div>
                        {policyId && <span className="text-[9.5px] font-mono text-muted-foreground/70">{policyId}</span>}
                      </div>
                      {/* Act-or-except: ticket state if raised, else a single exception control */}
                      {ticket ? (
                        <span className="flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded bg-teal/10 text-teal font-medium whitespace-nowrap">
                          <Ticket className="w-2.5 h-2.5" />
                          {ticket.externalSystem === 'ServiceNow' ? (ticket.externalId || ticket.id) : ticket.externalSystem === 'Jira' ? (ticket.externalId || ticket.id) : ticket.id}
                          <span className="text-teal/60">· {ticket.status}</span>
                        </span>
                      ) : excepted ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber/10 text-amber font-medium whitespace-nowrap">Excepted</span>
                      ) : policyId ? (
                        <button onClick={() => setExceptCtx({ policyId, policyName: mapped!.policyName })}
                          className="text-[10px] px-2 py-0.5 rounded border border-amber/30 text-amber hover:bg-amber/10 whitespace-nowrap">Add exception</button>
                      ) : null}
                    </div>
                  );
                })}
                {/* Operational alerts: informational, no policy id, no exception */}
                {operational.map((v, i) => (
                  <div key={`op-${i}`} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${v.severity === 'critical' ? 'bg-coral' : v.severity === 'high' ? 'bg-amber' : 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] text-foreground">{v.label}</span>
                      <span className="block text-[9px] text-muted-foreground/60">Operational alert</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {exceptCtx && (
            <RaiseExceptionModal
              open={!!exceptCtx}
              onClose={() => setExceptCtx(null)}
              objectId={co.id}
              objectName={co.name}
              objectType={co.type}
              parentAsset={parentAsset}
              policyId={exceptCtx.policyId}
              policyName={exceptCtx.policyName}
            />
          )}

          {/* Linked infrastructure */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <SectionHeading label={`Linked infrastructure (${assoc.length})`} />
              {assoc.length > 0 && <span className="text-[10px] text-amber ml-auto">failure affects all</span>}
            </div>
            {assoc.length > 0 ? (
              <div className="space-y-0.5">
                {assoc.map(a => (
                  <button key={a.id}
                    onClick={() => { setFilters({ tab: 'infrastructure', assetName: a.name }); setCurrentPage('inventory'); onClose(); }}
                    className="w-full flex items-center gap-2 text-[11px] rounded px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left group">
                    <span className="text-foreground font-medium flex-1 truncate group-hover:text-teal">{a.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 text-[10px]">{a.type}</span>
                    <EnvBadge env={a.environment} />
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-teal flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border/40 px-3 py-3 text-[11px] text-muted-foreground">
                Not deployed to any tracked infrastructure asset.
                <span className="block text-[10px] mt-0.5">Add this identity to an asset in the Infrastructure tab to track blast radius.</span>
              </div>
            )}
          </div>

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
  const [qvOnly, setQvOnly]             = useState(false);
  const [ownerFilter, setOwnerFilter]   = useState<string[]>([]);
  const [filterIdActive, setFilterIdActive] = useState<string>('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
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

  const { type: navType, status: navStatus, algorithm: navAlg, owner: navOwner, pqcRisk: navPqc, search: navSearch, quantumVulnerable: navQV } = navFilters;
  useEffect(() => {
    // Apply the incoming navigation filters authoritatively: set what is present
    // and clear what is absent, so each navigation lands on exactly the intended
    // view instead of stacking on top of a previous click's filters.
    setTypeFilter(navType ?? 'All');
    setStatusFilter(navStatus ? [navStatus] : []);
    setAlgFilter(navAlg ? [navAlg] : []);
    setOwnerFilter(navOwner ? [navOwner] : []);
    setPqcFilter(navPqc ? [navPqc] : []);
    setQvOnly(navQV === 'true');
    setSearch(navSearch ?? '');
    setFilterIdActive(navFilters.filterId ?? '');
  }, [navType, navStatus, navAlg, navOwner, navPqc, navSearch, navQV, navFilters.filterId]);

  useEffect(() => {
    if (detailAsset) setSelectedEntity({ kind: 'identity', id: detailAsset.id, name: detailAsset.name });
    return () => setSelectedEntity(null);
  }, [detailAsset, setSelectedEntity]);

  const allAssets  = useMemo(() => [...manualIdentities, ...mockAssets], [manualIdentities]);
  const algorithms = useMemo(() => [...new Set(allAssets.map(a => a.algorithm))].sort(), [allAssets]);

  const filtered = useMemo(() => {
    let r = [...allAssets];
    
    if (qvOnly) r = r.filter(a => algVuln(a.algorithm) >= 90); // canonical quantum-vulnerable, matches Quantum Readiness
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
  }, [allAssets, typeFilter, search, algFilter, envFilter, statusFilter, pqcFilter, ownerFilter, qvOnly, sortKey, sortDir, filterIdActive]);

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
          {TYPE_FILTERS.filter(t => FEATURES.AI_IDENTITY || t.key !== 'AI Agent Token').map(t => {
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
          const activeDashFilter = filterIdActive ? VIOLATION_FILTERS[filterIdActive] : null;
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
                <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} identities</span>
              </div>
              {totalActive > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {visible.map(c => (
                    <span key={c.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] text-foreground">
                      {c.label}
                      <button onClick={c.remove} className="text-muted-foreground hover:text-coral">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {overflow > 0 && (
                    <button onClick={() => setFilterPanelOpen(true)} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5">
                      +{overflow} more
                    </button>
                  )}
                  <button onClick={clearAll} className="text-[10px] text-coral hover:underline ml-1">Clear all</button>
                </div>
              )}
              {/* Representative data banner — shown when drilled in from dashboard */}
              {activeDashFilter && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal/5 border border-teal/20 text-[10.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filtered.length}</span> representative samples matching
                    {' '}<span className="font-semibold text-foreground">"{activeDashFilter.label}"</span>.
                    {' '}Enterprise total: <span className="font-semibold text-teal">{activeDashFilter.enterpriseCount.toLocaleString()} {activeDashFilter.countNoun}</span>.
                  </span>
                  <button onClick={() => setFilterIdActive('')} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex-shrink-0">
                    Clear ×
                  </button>
                </div>
              )}
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
                    <th key={col.key} className={`text-left py-2.5 px-3 font-medium text-muted-foreground whitespace-nowrap ${col.cls}`}>
                      {col.key === 'riskScore' ? (
                        <button
                          onClick={() => {
                            if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setSortKey('riskScore'); setSortDir('desc'); }
                          }}
                          className={`inline-flex items-center gap-1 hover:text-foreground w-full justify-end ${sortKey === col.key ? 'text-foreground' : ''}`}
                        >
                          {col.label} {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronDown className="w-3 h-3 opacity-30" />}
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
                    <tr key={co.id} onClick={() => setDetailAsset(co)}
                      className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer transition-colors">
                      {cols.map(col => (
                        <td key={col.key} className={`py-2.5 px-3 overflow-hidden ${col.cls}`}>
                          {col.key === 'name' ? (
                            <span className="font-medium text-foreground truncate flex items-center gap-1.5 max-w-full">
                              <span className="truncate">{co.name}</span>
                              {isManual && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-teal/10 text-teal text-[8px] flex-shrink-0">
                                  <FileEdit className="w-2 h-2" />
                                </span>
                              )}
                            </span>
                          ) : (
                            <div className={`flex items-center ${col.cls.includes('text-right') ? 'justify-end' : col.cls.includes('text-center') ? 'justify-center' : ''}`}>
                              <CellValue col={col} co={co} />
                            </div>
                          )}
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

      {/* Detail side panel */}
      {detailAsset && (
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