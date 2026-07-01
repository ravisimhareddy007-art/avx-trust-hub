import React, { useState } from 'react';
import {
  RefreshCw, AlertTriangle, CheckCircle2,
  Atom, ArrowUpRight, ShieldCheck, ShieldAlert, HelpCircle, MinusCircle, Info,
  Shield, Key, Lock, Boxes,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useNav } from '@/context/NavigationContext';
import { DashboardProvider } from '@/context/DashboardContext';
import { RiskProvider } from '@/context/RiskContext';
import { toast } from 'sonner';
import { ESTATE_SUMMARY } from '@/data/mockData';
import EnterpriseRiskScore from './ers/EnterpriseRiskScore';
import CriticalActionFeed from './CriticalActionFeed';
import IdentityHealthBands from './IdentityHealthBands';
import InfrastructurePostureStrip from './InfrastructurePostureStrip';

// Compact display: 1,654,567 -> 1.65M, 14,850 -> 14.9K, 186 -> 186.
const fmt = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1e6) return parseFloat((n / 1e6).toFixed(2)).toString() + 'M';
  if (abs >= 1e3) return parseFloat((n / 1e3).toFixed(1)).toString() + 'K';
  return String(n);
};
const fmtFull = (n: number) => n.toLocaleString();

/* ────────────────────────────────────────────────────────────────────────────
   Post-Quantum Readiness card
   Every bucket and the runway strip navigate to a real filtered destination.
   "Not applicable" (symmetric keys / secrets) is excluded from the percentage
   so the readiness number reflects quantum-relevant objects only.
──────────────────────────────────────────────────────────────────────────── */

const PQC_BUCKETS = {
  vulnerable:    12480,
  safe:           2690,
  notEvaluated:   3100,
  notApplicable: 18460,
};
const PQC_APPLICABLE = PQC_BUCKETS.vulnerable + PQC_BUCKETS.safe + PQC_BUCKETS.notEvaluated;
const PQC_SAFE_PCT = Math.round((PQC_BUCKETS.safe / PQC_APPLICABLE) * 1000) / 10;
const VULN_PAST_2030 = 3240;

function PqcReadinessCard() {
  const nav = useNav();
  const { setFilters, setCurrentPage } = nav;

  const rows = [
    {
      key: 'vulnerable', label: 'Vulnerable', count: PQC_BUCKETS.vulnerable,
      icon: ShieldAlert, dot: 'bg-coral', text: 'text-coral',
      onNav: () => { setFilters({ tab: 'identities', quantumVulnerable: 'true', navTotal: String(PQC_BUCKETS.vulnerable) }); setCurrentPage('inventory'); },
    },
    {
      key: 'safe', label: 'Quantum-safe', count: PQC_BUCKETS.safe,
      icon: ShieldCheck, dot: 'bg-teal', text: 'text-teal',
      onNav: () => { setFilters({ tab: 'identities', pqcRisk: 'Low', navTotal: String(PQC_BUCKETS.safe) }); setCurrentPage('inventory'); },
    },
    {
      key: 'notEvaluated', label: 'Not evaluated', count: PQC_BUCKETS.notEvaluated,
      icon: HelpCircle, dot: 'bg-amber', text: 'text-amber',
      onNav: () => { setCurrentPage('discovery'); },
    },
    {
      key: 'notApplicable', label: 'Not applicable', count: PQC_BUCKETS.notApplicable,
      icon: MinusCircle, dot: 'bg-muted-foreground/50', text: 'text-muted-foreground',
      onNav: () => { setFilters({ tab: 'identities', type: 'Encryption Key', navTotal: String(PQC_BUCKETS.notApplicable) }); setCurrentPage('inventory'); },
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Atom className="w-4 h-4 text-purple-light" />
          <h2 className="text-sm font-semibold text-foreground">Post-Quantum Readiness</h2>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">PQC</span>
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-72 bg-card border border-border rounded-lg shadow-lg px-3 py-2.5">
              <p className="text-[11px] text-foreground leading-relaxed">
                Share of quantum-relevant objects using post-quantum-safe cryptography. Symmetric keys and secrets are counted as Not applicable and excluded from the percentage. Not evaluated objects still need a discovery scan.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setCurrentPage('quantum')}
          className="text-[10px] text-muted-foreground hover:text-purple-light flex items-center gap-0.5"
        >
          Quantum Readiness <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-foreground tabular-nums">{PQC_SAFE_PCT}%</span>
          <span className="text-[10.5px] text-muted-foreground">quantum-safe</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted/40 mt-2">
          <div style={{ width: `${(PQC_BUCKETS.safe / PQC_APPLICABLE) * 100}%` }} className="bg-teal" />
          <div style={{ width: `${(PQC_BUCKETS.notEvaluated / PQC_APPLICABLE) * 100}%` }} className="bg-amber/70" />
          <div style={{ width: `${(PQC_BUCKETS.vulnerable / PQC_APPLICABLE) * 100}%` }} className="bg-coral" />
        </div>
        <p className="text-[9.5px] text-muted-foreground mt-1">
          {fmt(PQC_APPLICABLE)} quantum-relevant objects assessed
        </p>
      </div>

      <div className="space-y-0.5 flex-1">
        {rows.map(row => {
          const Icon = row.icon;
          return (
            <button
              key={row.key}
              onClick={row.onNav}
              className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-secondary/40 transition-colors text-left group"
            >
              <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${row.dot}`} />
              <Icon className={`w-3 h-3 flex-shrink-0 ${row.text}`} />
              <span className="text-[11px] text-muted-foreground flex-1 truncate">{row.label}</span>
              <span className="text-[11px] font-semibold text-foreground tabular-nums" title={fmtFull(row.count)}>{fmt(row.count)}</span>
              <ArrowUpRight className="w-2.5 h-2.5 text-purple-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setCurrentPage('quantum')}
        className="w-full mt-2 pt-2 border-t border-border/40 flex items-center gap-2 text-left group"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1">
            <span>Now</span>
            <span>2030 deprecate</span>
            <span>2035 disallow</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-teal/50" style={{ width: '52%' }} />
            <div className="absolute inset-y-0" style={{ left: '52%', width: '2px', background: 'hsl(38 78% 51%)' }} />
            <div className="absolute inset-y-0" style={{ left: '82%', width: '2px', background: 'hsl(16 72% 51%)' }} />
          </div>
          <p className="text-[10px] text-coral font-medium mt-1 group-hover:underline underline-offset-2">
            {fmt(VULN_PAST_2030)} vulnerable objects still valid past 2030
          </p>
        </div>
        <ArrowUpRight className="w-3 h-3 text-purple-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Crypto Estate Overview card
   Consolidates objects-by-type, certificate status, and keys-by-algorithm into
   one drill surface. Every row navigates to filtered inventory.
──────────────────────────────────────────────────────────────────────────── */

const TYPE_ROWS = [
  { label: 'Certificates',          count: ESTATE_SUMMARY.certificates,         type: 'TLS Certificate',  icon: Shield },
  { label: 'SSH & encryption keys', count: ESTATE_SUMMARY.sshAndEncryptionKeys, type: 'SSH Key',          icon: Key },
  { label: 'Secrets & API keys',    count: ESTATE_SUMMARY.secretsAndAPIKeys,    type: 'API Key / Secret', icon: Lock },
];
const TYPE_TOTAL = TYPE_ROWS.reduce((s, r) => s + r.count, 0);

const CERT_VALID = ESTATE_SUMMARY.certificates - ESTATE_SUMMARY.certsExpired - ESTATE_SUMMARY.certsExpiring7d;
const CERT_STATUS = [
  { label: 'Valid',    count: CERT_VALID,                     seg: 'bg-teal',  dot: 'bg-teal',                nav: { status: 'Active' } },
  { label: 'Expiring', count: ESTATE_SUMMARY.certsExpiring7d, seg: 'bg-amber', dot: 'bg-amber',               nav: { filterId: 'cert_expiring_7d' } },
  { label: 'Expired',  count: ESTATE_SUMMARY.certsExpired,    seg: 'bg-coral', dot: 'bg-coral',               nav: { status: 'Expired' } },
  { label: 'Revoked',  count: 0,                              seg: 'bg-muted', dot: 'bg-muted-foreground/50', nav: { status: 'Revoked' } },
];

const ALGO_ROWS = [
  { label: 'RSA-2048',  count: 9240, quantum: 'vuln' as const },
  { label: 'ECC P-256', count: 6180, quantum: 'vuln' as const },
  { label: 'Ed25519',   count: 3020, quantum: 'vuln' as const },
  { label: 'RSA-4096',  count: 1860, quantum: 'vuln' as const },
  { label: 'AES-256',   count: 4420, quantum: 'na'   as const },
];

function CryptoEstateOverview() {
  const { setFilters, setCurrentPage } = useNav();

  const navInventory = (f: Record<string, string>) => {
    setFilters({ tab: 'identities', ...f });
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-foreground">Crypto Estate</h2>
          <span className="text-[10px] text-muted-foreground tabular-nums" title={fmtFull(TYPE_TOTAL)}>{fmt(TYPE_TOTAL)} objects</span>
        </div>
        <button
          onClick={() => navInventory({})}
          className="text-[10px] text-muted-foreground hover:text-blue-400 flex items-center gap-0.5"
        >
          View inventory <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">

        {/* Objects by type */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-2">By type</p>
          <div className="space-y-0.5">
            {TYPE_ROWS.map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.label}
                  onClick={() => navInventory({ type: r.type, navTotal: String(r.count) })}
                  className="w-full text-left px-1.5 py-1.5 rounded hover:bg-secondary/40 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3 h-3 text-foreground flex-shrink-0" />
                    <span className="text-[11px] text-muted-foreground flex-1 truncate">{r.label}</span>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(r.count)}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-blue-400/60" style={{ width: `${(r.count / TYPE_TOTAL) * 100}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Certificate status */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Certificate status</p>
          <div className="flex h-2 rounded-full overflow-hidden mb-2 gap-px">
            {CERT_STATUS.filter(s => s.count > 0).map(s => (
              <div
                key={s.label}
                className={s.seg}
                style={{ width: `${(s.count / ESTATE_SUMMARY.certificates) * 100}%` }}
                title={`${s.label} · ${fmt(s.count)}`}
              />
            ))}
          </div>
          <div className="space-y-0.5">
            {CERT_STATUS.map(s => (
              <button
                key={s.label}
                onClick={() => navInventory({ type: 'TLS Certificate', ...s.nav, navTotal: String(s.count) })}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary/40 transition-colors text-left group"
              >
                <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${s.dot}`} />
                <span className="text-[11px] text-muted-foreground flex-1 truncate">{s.label}</span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(s.count)}</span>
                <ArrowUpRight className="w-2.5 h-2.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Keys by algorithm */}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-2">By algorithm</p>
          <div className="space-y-0.5">
            {ALGO_ROWS.map(r => (
              <button
                key={r.label}
                onClick={() => navInventory({ algorithm: r.label, navTotal: String(r.count) })}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary/40 transition-colors text-left group"
                title={r.quantum === 'vuln' ? 'Quantum-vulnerable algorithm' : 'Not quantum-vulnerable'}
              >
                <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${r.quantum === 'vuln' ? 'bg-coral' : 'bg-teal'}`} />
                <span className="text-[11px] text-muted-foreground flex-1 truncate font-mono">{r.label}</span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">{fmt(r.count)}</span>
                <ArrowUpRight className="w-2.5 h-2.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-sm bg-coral inline-block" /> quantum-vulnerable
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Security Admin dashboard
──────────────────────────────────────────────────────────────────────────── */

export default function SecurityAdminDashboard() {
  const { notifications, markRead } = useNotifications();
  const { setCurrentPage } = useNav();
  const [refreshedLabel, setRefreshedLabel] = useState('just now');
  const [spinning, setSpinning] = useState(false);
  const escalations = notifications.filter(n => n.toPersona === 'security-admin');

  return (
    <DashboardProvider>
      <RiskProvider>
        <div className="space-y-0">

        {/* Page header */}
        <div className="flex items-end justify-between pt-1 pb-3 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Trust Posture & Risk Intelligence
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Security Admin · Enterprise view
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Refreshed {refreshedLabel}</span>
            <button
              onClick={() => {
                setSpinning(true);
                setRefreshedLabel('just now');
                toast.success('Dashboard refreshed');
                setTimeout(() => setSpinning(false), 800);
              }}
              className="p-1 hover:text-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="pt-4">
          <div className="space-y-4 pr-1">

            {escalations.length > 0 && (
              <div className="space-y-2">
                {escalations.map(n => (
                  <div key={n.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 transition-colors ${!n.read ? 'border-coral/40 bg-coral/5' : 'border-border bg-muted/20 opacity-70'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? 'bg-coral/15' : 'bg-muted'}`}>
                      <AlertTriangle className={`w-4 h-4 ${!n.read ? 'text-coral' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">Compliance Escalation</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          n.violationSeverity === 'Critical' ? 'bg-coral/10 text-coral' :
                          n.violationSeverity === 'High' ? 'bg-amber/10 text-amber' : 'bg-purple/10 text-purple'
                        }`}>{n.violationSeverity}</span>
                        {n.ticketId && <span className="text-[10px] font-mono text-teal">{n.ticketId}</span>}
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />}
                        <span className="text-[10px] text-muted-foreground ml-auto">{n.timestamp}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{n.violationAsset}</p>
                      <p className="text-[10px] text-muted-foreground">{n.violationRule} · {n.violationFramework} · {n.violationBU}</p>
                      {n.comments && (
                        <p className="text-[10px] text-foreground/80 mt-1.5 italic bg-muted/40 rounded px-2 py-1">
                          💬 "{n.comments}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)}
                          className="text-[10px] px-2 py-1 bg-teal/10 text-teal rounded hover:bg-teal/20 font-medium whitespace-nowrap">
                          Acknowledge
                        </button>
                      )}
                      {n.read && <CheckCircle2 className="w-4 h-4 text-teal" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5 lg:h-[420px]">
                <EnterpriseRiskScore />
              </div>
              <div className="lg:col-span-7 lg:h-[420px] overflow-hidden">
                <CriticalActionFeed />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <PqcReadinessCard />
              </div>
              <div className="lg:col-span-8">
                <CryptoEstateOverview />
              </div>
            </div>

            <IdentityHealthBands />
            <InfrastructurePostureStrip />
          </div>
        </div>
      </div>
      </RiskProvider>
    </DashboardProvider>
  );
}