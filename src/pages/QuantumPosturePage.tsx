import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import {
  Atom, Download, ArrowRight, Clock, ChevronRight, CheckCircle2,
  AlertTriangle, Info, Shield, GitBranch,
} from 'lucide-react';

// ── Authoritative PQC numbers (single source of truth) ───────────────────────

const TOTAL_VULNERABLE = 12660;
const HNDL_ACTIVE      = 3842;
const TOTAL_OBJECTS    = 44698;
const PQC_SAFE         = 187;
const IN_FLIGHT_COUNT  = 847;

// ── Algorithm data with explicit semantic colors ──────────────────────────────
// NIST: Symmetric (AES) and hash algorithms are quantum-resistant.
// Only public-key algorithms (RSA, ECC, DSA, DH) require migration.

const ALGO_DATA = [
  {
    algo: 'RSA-2048', count: 8420, vulnerable: true, fill: 'hsl(16, 72%, 51%)', use: 'Key exchange, TLS, code signing',
    breakdown: [
      { type: 'TLS Certificates',  count: 3840 },
      { type: 'SSH Keys',           count: 2940 },
      { type: 'Code Signing Certs', count: 980  },
      { type: 'API / Secrets',      count: 660  },
    ],
  },
  {
    algo: 'RSA-4096', count: 2100, vulnerable: true, fill: 'hsl(16, 72%, 51%)', use: 'Key exchange, document signing',
    breakdown: [
      { type: 'TLS Certificates',  count: 1260 },
      { type: 'Document Signing',   count: 520  },
      { type: 'SSH Keys',           count: 320  },
    ],
  },
  {
    algo: 'ECC P-256', count: 1800, vulnerable: true, fill: 'hsl(38, 78%, 51%)', use: 'TLS, JWT, API auth, SSH certs',
    breakdown: [
      { type: 'TLS Certificates',  count: 840  },
      { type: 'SSH Certificates',   count: 480  },
      { type: 'AI Agent Tokens',    count: 312  },
      { type: 'JWT / API Auth',     count: 168  },
    ],
  },
  {
    algo: 'ECC P-384', count: 340, vulnerable: true, fill: 'hsl(38, 78%, 51%)', use: 'K8s workload certs, high-sec APIs',
    breakdown: [
      { type: 'K8s Workload Certs', count: 248 },
      { type: 'TLS Certificates',   count: 92  },
    ],
  },
  {
    algo: 'AES-256', count: 4200, vulnerable: false, fill: 'hsl(162, 72%, 37%)', use: 'Data at rest — quantum-resistant',
    breakdown: [
      { type: 'Encryption Keys',    count: 2840 },
      { type: 'Secrets / API Keys', count: 960  },
      { type: 'Vault Secrets',      count: 400  },
    ],
  },
  {
    algo: 'ML-KEM', count: 187, vulnerable: false, fill: 'hsl(162, 65%, 55%)', use: 'NIST FIPS 203 — PQC-safe',
    breakdown: [
      { type: 'TLS Certificates',   count: 124 },
      { type: 'K8s Workload Certs', count: 63  },
    ],
  },
];

// ── HNDL top-5 with dependency counts and compensating controls ───────────────
// NIST Scenario 3: identify downstream systems dependent on each cryptographic asset.
// NIST: where no near-term replacement, identify compensating controls.

const HNDL_LIST = [
  {
    name: 'payments-api.acmecorp.com', assetType: 'API Gateway',
    algo: 'RSA-2048', risk: 'CRITICAL' as const,
    detail: 'Internet-facing · 47,000 financial tx/day',
    sensitivity: 'PCI-DSS · financial transaction data',
    dependents: 7,
    mig_time: '~3 months',
    compensating: 'Restrict to internal egress only until migrated — remove direct internet exposure',
  },
  {
    name: 'auth.acmecorp.com', assetType: 'Application Server',
    algo: 'ECC P-256', risk: 'CRITICAL' as const,
    detail: 'Internet-facing · SSO for 12,400 users',
    sensitivity: 'PII · GDPR scope · auth tokens',
    dependents: 14,
    mig_time: '~4 months',
    compensating: 'Enable MFA enforcement on all SSO sessions as interim control',
  },
  {
    name: 'prod-gateway-01.acmecorp.com', assetType: 'API Gateway',
    algo: 'RSA-2048', risk: 'CRITICAL' as const,
    detail: 'Internet-facing · all inbound API traffic',
    sensitivity: 'Mixed — routes PCI and PHI traffic',
    dependents: 22,
    mig_time: '~2 months',
    compensating: 'Rate-limit external traffic and add WAF inspection as interim',
  },
  {
    name: 'vault.internal.acmecorp.com', assetType: 'Vault Server',
    algo: 'RSA-2048', risk: 'HIGH' as const,
    detail: 'Internal · holds 68% of production secrets',
    sensitivity: 'PHI + PCI + financial — crown jewel',
    dependents: 38,
    mig_time: '~5 months',
    compensating: 'Restrict Vault access to allowlisted IPs only · weekly access audit active',
  },
  {
    name: 'eks-prod-cluster', assetType: 'K8s Cluster',
    algo: 'ECC P-256', risk: 'HIGH' as const,
    detail: 'Internal · 847 workload certs · Payments + Platform',
    sensitivity: 'PCI workloads · service mesh east-west traffic',
    dependents: 12,
    mig_time: '~3 months',
    compensating: 'Enable mutual TLS strict mode across all namespaces now',
  },
];

// ── PQC Risk Heatmap ──────────────────────────────────────────────────────────

const HEATMAP_BUS   = ['Payments', 'Platform', 'Infrastructure', 'AI Eng', 'Security'];
const HEATMAP_TYPES = ['TLS', 'SSH', 'Secrets', 'K8s', 'AI Tokens'];
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

const HEATMAP: Record<string, RiskLevel> = {
  'Payments-TLS': 'critical',       'Payments-SSH': 'high',          'Payments-Secrets': 'critical',
  'Payments-K8s': 'high',           'Payments-AI Tokens': 'medium',
  'Platform-TLS': 'high',           'Platform-SSH': 'high',           'Platform-Secrets': 'high',
  'Platform-K8s': 'high',           'Platform-AI Tokens': 'medium',
  'Infrastructure-TLS': 'high',     'Infrastructure-SSH': 'critical',  'Infrastructure-Secrets': 'medium',
  'Infrastructure-K8s': 'medium',   'Infrastructure-AI Tokens': 'low',
  'AI Eng-TLS': 'medium',           'AI Eng-SSH': 'medium',            'AI Eng-Secrets': 'high',
  'AI Eng-K8s': 'medium',           'AI Eng-AI Tokens': 'critical',
  'Security-TLS': 'medium',         'Security-SSH': 'high',            'Security-Secrets': 'high',
  'Security-K8s': 'low',            'Security-AI Tokens': 'low',
};

const CELL_BG: Record<RiskLevel, string> = {
  critical: 'bg-coral text-white',
  high:     'bg-amber/80 text-white',
  medium:   'bg-purple/60 text-white',
  low:      'bg-teal/30 text-foreground',
};

// ── Crypto Agility (NIST: key size limits, sw-updatable, latency) ─────────────

const AGILITY = [
  {
    cat: 'API Gateways',  score: 34,
    keyLimit: 'Max RSA-4096 today — PQC key sizes 3x larger, require config changes',
    swUpdatable: false,
    latency: 'TLS handshake +40-60ms estimated for ML-KEM vs RSA-2048',
    note: 'Hardcoded cert configs — swap requires full redeploy and load balancer reconfiguration',
  },
  {
    cat: 'App Servers',   score: 52,
    keyLimit: 'JDK 17+ supports ML-KEM; older runtimes require upgrade first',
    swUpdatable: true,
    latency: 'Minimal — server-side key operations, client handles handshake overhead',
    note: 'Modern app servers agile via library update; legacy batch servers require runtime upgrade',
  },
  {
    cat: 'K8s Clusters',  score: 78,
    keyLimit: 'cert-manager 1.14+ supports FIPS 203/204 — already deployed',
    swUpdatable: true,
    latency: 'Negligible — short-lived certs rotate frequently, per-cert overhead minimal',
    note: 'cert-manager enables algorithm swap per namespace with zero downtime',
  },
  {
    cat: 'Vault Servers', score: 61,
    keyLimit: 'Vault 1.14+ supports ML-KEM for key wrapping — upgrade path exists',
    swUpdatable: true,
    latency: 'Vault seal/unseal operations +15% slower with PQC — acceptable',
    note: 'Vault upgrade to 1.14 unblocks PQC; currently blocked by Q2 change freeze',
  },
  {
    cat: 'AI Platforms',  score: 29,
    keyLimit: 'Agent token signing hardcoded in model inference configs — no abstraction layer',
    swUpdatable: false,
    latency: 'Token issuance latency unknown — no profiling data available yet',
    note: 'Agent tokens hardcoded in model configs — highest swap cost; requires model redeployment',
  },
];

// ── Algorithm migration complexity ────────────────────────────────────────────

const COMPLEXITY = [
  {
    from: 'RSA-2048',  to: 'ML-KEM', objects: 8420, cx: 'High',
    keySize: '2048-bit → 1184-byte public key (3x larger)',
    blocker: 'Legacy HSM firmware (Thales Luna 5.x), third-party vendor support gaps',
    compensating: 'Restrict internet-facing RSA assets to allowlisted IPs until migrated',
  },
  {
    from: 'ECC P-256', to: 'ML-DSA', objects: 1800, cx: 'High',
    keySize: '256-bit → 1312-byte public key — significant size increase',
    blocker: 'Code-signing chain dependencies, CA/Browser Forum transition timeline',
    compensating: 'Enforce certificate pinning on all ECC P-256 consumer-facing endpoints',
  },
  {
    from: 'RSA-4096',  to: 'ML-KEM', objects: 2100, cx: 'Medium',
    keySize: '4096-bit → 1184-byte public key — smaller key, different format',
    blocker: 'Key size change breaks some legacy parsers; test suite updates required',
    compensating: 'Maintain RSA-4096 as hybrid alongside ML-KEM during transition period',
  },
  {
    from: 'ECC P-384', to: 'ML-DSA', objects: 340, cx: 'Low',
    keySize: '384-bit → 1952-byte public key for ML-DSA-65',
    blocker: 'Mostly K8s workloads — cert-manager handles swap with namespace annotation',
    compensating: 'No interim control needed — low HNDL exposure, internal traffic only',
  },
];

// ── Migration waves (NIST: risk-based phased approach using Mosca's Theorem) ──

const WAVES = [
  {
    n: 1, label: 'Wave 1 — Critical HNDL',  period: 'Q2 2026',    objs: 847,
    status: 'In Progress', mandate: 'NSA CNSA 2.0 (2025)',
    desc: 'Internet-facing assets with active HNDL exposure and financial/PII data',
    moscaX: 'Data must stay private 10+ years',
    moscaY: '~6 months migration time',
    tc: 'text-coral', bc: 'bg-coral',
  },
  {
    n: 2, label: 'Wave 2 — High Priority',  period: 'Q3–Q4 2026', objs: 3218,
    status: 'Planned',     mandate: 'NSA CNSA 2.0 (2027 new systems)',
    desc: 'Production assets not HNDL-active but carrying sensitive data',
    moscaX: 'Data must stay private 5-10 years',
    moscaY: '~12 months migration time',
    tc: 'text-amber', bc: 'bg-amber',
  },
  {
    n: 3, label: 'Wave 3 — Background',     period: '2027+',      objs: 8595,
    status: 'Not Started', mandate: 'NIST 2030 all systems',
    desc: 'Remaining estate — non-production, low-sensitivity, internal only',
    moscaX: 'Data sensitivity under 5 years',
    moscaY: '~24 months migration time',
    tc: 'text-purple-light', bc: 'bg-purple',
  },
];

// ── In-flight migrations ──────────────────────────────────────────────────────

const IN_FLIGHT_TABLE = [
  { asset: 'payments-api.acmecorp.com',    from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'Payments Eng',   days: 14,   dependents: 7,  blocker: null, compensating: null },
  { asset: 'prod-gateway-01.acmecorp.com', from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'Infrastructure', days: 7,    dependents: 22, blocker: null, compensating: null },
  { asset: 'eks-prod-cluster',             from: 'ECC P-256', to: 'ML-DSA', status: 'In Progress', owner: 'Platform Eng',   days: 21,   dependents: 12, blocker: null, compensating: null },
  { asset: 'auth.acmecorp.com',            from: 'ECC P-256', to: 'ML-DSA', status: 'Blocked',     owner: 'Security Ops',  days: null, dependents: 14, blocker: 'HSM firmware upgrade required — Thales Luna 7.4 (procurement in progress)', compensating: 'MFA enforcement active on all SSO sessions as interim control' },
  { asset: 'vault.internal.acmecorp.com',  from: 'RSA-2048',  to: 'ML-KEM', status: 'Blocked',     owner: 'Security Eng',  days: null, dependents: 38, blocker: 'Vault upgrade to 1.14 blocked by Q2 change freeze — unblocks July 2026', compensating: 'Vault access restricted to allowlisted IPs · weekly access audit active' },
  { asset: 'mail.acmecorp.com',            from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'IT Operations',  days: 30,   dependents: 3,  blocker: null, compensating: null },
  { asset: 'staging-api.acmecorp.com',     from: 'ECC P-256', to: 'ML-DSA', status: 'Completed',   owner: 'Platform Eng',  days: null, dependents: 4,  blocker: null, compensating: null },
  { asset: 'cdn.acmecorp.com',             from: 'RSA-2048',  to: 'ML-KEM', status: 'Completed',   owner: 'Infrastructure', days: null, dependents: 8,  blocker: null, compensating: null },
];

const MONITOR_PROGRESS = [
  { month: 'Jan', actual: 12,  required: 141 },
  { month: 'Feb', actual: 45,  required: 282 },
  { month: 'Mar', actual: 89,  required: 423 },
  { month: 'Apr', actual: 187, required: 564 },
];

// ── Style maps ────────────────────────────────────────────────────────────────

const CX_COLOR: Record<string, string> = { High: 'text-coral', Medium: 'text-amber', Low: 'text-teal' };
const ST_STYLE: Record<string, string> = {
  'In Progress': 'bg-teal/15 text-teal',
  'Blocked':     'bg-coral/15 text-coral',
  'Completed':   'bg-muted text-muted-foreground',
  'Planned':     'bg-purple/15 text-purple-light',
  'Not Started': 'bg-secondary text-muted-foreground',
};
const DOT_STYLE: Record<string, string> = {
  'Complete':    'bg-teal',
  'In Progress': 'bg-amber animate-pulse',
  'Not Started': 'bg-muted-foreground/40',
};

// ── Micro-components ──────────────────────────────────────────────────────────

function Countdown() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral/10 border border-coral/25">
      <Clock className="w-3 h-3 text-coral" />
      <span className="text-[10px] font-semibold text-coral">3.6 years to NIST 2030 deadline</span>
    </div>
  );
}

function HndlBadge() {
  return (
    <div className="relative group inline-flex">
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-coral/15 text-coral border border-coral/25 cursor-help">HNDL</span>
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block w-72 bg-card border border-border rounded-lg shadow-xl p-3">
        <p className="text-[10px] font-semibold text-foreground mb-1">Harvest Now Decrypt Later</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Adversaries are capturing your encrypted traffic TODAY and storing it. When quantum computers arrive they will decrypt it retroactively.
          Your sensitive data is at risk RIGHT NOW — not in 2030. Per Federal Reserve research 2025 and FBI/CISA advisories.
        </p>
      </div>
    </div>
  );
}

function MoscaBadge({ wave }: { wave: typeof WAVES[0] }) {
  return (
    <div className="relative group inline-flex">
      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
      <div className="absolute bottom-full right-0 mb-2 z-50 hidden group-hover:block w-72 bg-card border border-border rounded-lg shadow-xl p-3">
        <p className="text-[10px] font-semibold text-foreground mb-1.5">Mosca's Theorem — Why this wave priority</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">X</span> (data must stay private): {wave.moscaX}<br />
          <span className="text-foreground font-medium">Y</span> (migration time needed): {wave.moscaY}<br />
          <span className="text-foreground font-medium">Z</span> (quantum threat timeline): ~2030<br />
          <span className="text-coral font-semibold">X + Y {'>'} Z → migrate this wave now.</span>
        </p>
      </div>
    </div>
  );
}

// ── Stage 1: Discover ─────────────────────────────────────────────────────────

function AlgoChart({ nav }: { nav: (f: Record<string, string>) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let chart: { destroy: () => void } | null = null;
    const init = () => {
      const Chart = (window as { Chart?: new (...args: unknown[]) => unknown }).Chart;
      if (!Chart) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      chart = new (Chart as new (ctx: CanvasRenderingContext2D, config: unknown) => { destroy: () => void })(ctx, {
        type: 'bar',
        data: {
          labels: ALGO_DATA.map(d => d.algo),
          datasets: [{
            label: 'Objects',
            data: ALGO_DATA.map(d => d.count),
            backgroundColor: ALGO_DATA.map(d => d.fill),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (_: unknown, elements: { index: number }[]) => {
            if (elements.length > 0) {
              const idx = elements[0].index;
              nav({ tab: 'identities', algorithm: ALGO_DATA[idx].algo });
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items: { label: string }[]) => {
                  const d = ALGO_DATA.find(a => a.algo === items[0].label);
                  return `${items[0].label} — ${d?.vulnerable ? 'Quantum-vulnerable' : 'Quantum-safe'}`;
                },
                label: () => '',
                afterBody: (items: { dataIndex: number }[]) => {
                  const d = ALGO_DATA[items[0].dataIndex];
                  const lines: string[] = [
                    `Total: ${d.count.toLocaleString()} objects`,
                    '─────────────────',
                    ...d.breakdown.map(b => `  ${b.type}: ${b.count.toLocaleString()}`),
                    '',
                    `Use: ${d.use}`,
                  ];
                  return lines;
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: 'hsl(220, 15%, 55%)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'hsl(220, 15%, 55%)', font: { size: 10 } } },
          },
        },
      });
    };
    if ((window as { Chart?: unknown }).Chart) {
      init();
    } else {
      let script = document.querySelector<HTMLScriptElement>('script[data-chartjs]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        script.dataset.chartjs = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', init);
    }
    return () => { if (chart) chart.destroy(); };
  }, [nav]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Algorithm breakdown: RSA-2048 8420, RSA-4096 2100, ECC P-256 1800, ECC P-384 340, AES-256 4200, ML-KEM 187 objects"
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
}

function StageDiscover({ onNext, nav }: { onNext: () => void; nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">

      {/* CBOM KPI strip — all clickable */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Quantum-Vulnerable Objects', value: TOTAL_VULNERABLE.toLocaleString(), color: 'text-coral', sub: `${((TOTAL_VULNERABLE / TOTAL_OBJECTS) * 100).toFixed(1)}% of estate — RSA, ECC public-key only`, navFilter: { tab: 'identities', pqcRisk: 'Critical' } },
          { label: 'HNDL Active Exposure',       value: HNDL_ACTIVE.toLocaleString(),      color: 'text-coral', sub: 'Internet-facing + long-lived sensitive data at risk TODAY', navFilter: { tab: 'identities', pqcRisk: 'Critical' } },
          { label: 'PQC-Safe Today',             value: PQC_SAFE.toLocaleString(),          color: 'text-teal',  sub: 'ML-KEM only · 1.5% of vulnerable estate migrated · AES-256 already safe', navFilter: { tab: 'identities', pqcRisk: 'Safe' } },
        ].map(k => (
          <button key={k.label} onClick={() => nav(k.navFilter)} className="bg-card rounded-xl border border-border p-4 text-left hover:border-teal/40 transition-all group">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground flex-1">{k.sub}</p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* NIST context note */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-teal/5 border border-teal/20">
        <Info className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="text-teal font-semibold">NIST guidance (FIPS 203/204/205):</span> Symmetric encryption (AES-256) and hashing (SHA-2/3) are quantum-resistant and require no migration.
          Focus is exclusively on public-key cryptography — RSA, ECC, DSA, and DH variants are the migration targets.
        </p>
      </div>

      {/* Algorithm Breakdown — clickable bars */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Algorithm Breakdown — Cryptographic Estate</h3>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'hsl(16 72% 51%)' }} />RSA — Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'hsl(38 78% 51%)' }} />ECC — High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'hsl(162 72% 37%)' }} />Quantum-safe</span>
          </div>
        </div>
        <AlgoChart nav={nav} />
        <p className="text-[9.5px] text-muted-foreground text-center mt-2">Click any bar to view those objects in Inventory</p>
      </div>

      {/* PQC Risk Heatmap — every cell clickable */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">PQC Risk Heatmap — Business Unit x Asset Type</h3>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Critical' })} className="text-[10px] text-teal hover:text-teal/80 flex items-center gap-1">
            View all Critical <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left pb-2 text-muted-foreground font-medium w-32" />
              {HEATMAP_TYPES.map(t => <th key={t} className="pb-2 text-center text-muted-foreground font-medium px-1">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_BUS.map(bu => (
              <tr key={bu}>
                <td className="py-1 text-muted-foreground text-[11px] font-medium pr-2">{bu}</td>
                {HEATMAP_TYPES.map(type => {
                  const risk: RiskLevel = HEATMAP[`${bu}-${type}`] || 'low';
                  return (
                    <td key={type} className="py-1 px-1">
                      <button
                        onClick={() => nav({ tab: 'identities', pqcRisk: risk === 'critical' ? 'Critical' : risk === 'high' ? 'High' : risk === 'medium' ? 'Medium' : 'Low' })}
                        className={`w-full px-2 py-1.5 rounded text-[10px] font-semibold ${CELL_BG[risk]} hover:opacity-80 transition-opacity`}
                      >
                        {risk.charAt(0).toUpperCase() + risk.slice(1)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HNDL Top 5 — with dependency counts, sensitivity, compensating controls */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold">Top HNDL Exposure — Highest Priority Assets</h3>
          <HndlBadge />
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">Sorted by Mosca's Theorem priority. NIST: categorize by criticality, disclosure sensitivity, and downstream dependency count.</p>
        <div className="space-y-2">
          {HNDL_LIST.map((item, i) => (
            <div key={item.name} className="rounded-lg border border-border/50 overflow-hidden">
              <div className="flex items-start gap-3 p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors group">
                <span className="text-[11px] font-bold text-muted-foreground w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[11px] font-semibold font-mono text-foreground">{item.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 border ${item.risk === 'CRITICAL' ? 'bg-coral/15 text-coral border-coral/30' : 'bg-amber/15 text-amber border-amber/30'}`}>{item.risk}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-[10px] text-muted-foreground">{item.algo} · {item.detail}</p>
                    <span className="text-[9px] text-purple-light bg-purple/10 px-1.5 py-0.5 rounded">{item.sensitivity}</span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <GitBranch className="w-2.5 h-2.5" />{item.dependents} downstream systems
                    </span>
                    <span className="text-[9px] text-muted-foreground">Est. migration: {item.mig_time}</span>
                  </div>
                </div>
                <button onClick={() => nav({ tab: 'infrastructure', type: item.assetType, assetName: item.name })} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-teal flex items-center gap-1 flex-shrink-0">
                  View <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex items-start gap-1.5 px-3 py-2 bg-amber/5 border-t border-border/30">
                <Shield className="w-3 h-3 text-amber flex-shrink-0 mt-0.5" />
                <p className="text-[9.5px] text-muted-foreground"><span className="text-amber font-semibold">Interim control:</span> {item.compensating}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => toast.success('CBOM export queued', { description: 'cryptographic-bill-of-materials.json — NIST FIPS 203/204/205 aligned · ready in ~30s' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CBOM
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          Begin Assessment <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 2: Assess ───────────────────────────────────────────────────────────

function StageAssess({ onNext, nav }: { onNext: () => void; nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">

      {/* Crypto Agility — NIST detail per category */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">Crypto Agility Assessment — By Infrastructure Category</h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          NIST: document whether implementations support crypto agility, key size constraints, software-updatability, and latency/throughput thresholds before migration.
        </p>
        <div className="space-y-4">
          {AGILITY.map(item => (
            <div key={item.cat} className="border border-border/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] font-semibold text-foreground">{item.cat}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${item.swUpdatable ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'}`}>
                    {item.swUpdatable ? 'Software-updatable' : 'Hardware change required'}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${item.score < 40 ? 'text-coral' : item.score < 65 ? 'text-amber' : 'text-teal'}`}>{item.score}%</span>
                </div>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${item.score < 40 ? 'bg-coral' : item.score < 65 ? 'bg-amber' : 'bg-teal'}`} style={{ width: `${item.score}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-1.5">
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Key size impact</p>
                  <p className="text-[9.5px] text-muted-foreground">{item.keyLimit}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Latency impact</p>
                  <p className="text-[9.5px] text-muted-foreground">{item.latency}</p>
                </div>
              </div>
              <p className="text-[9.5px] text-muted-foreground/70 border-t border-border/30 pt-1.5">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm Migration Complexity — rows clickable to inventory */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">Algorithm Migration Complexity</h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          NIST: new algorithms are not drop-in replacements — key sizes, signature sizes, and protocol dependencies differ significantly. Each row shows blocker and compensating control.
        </p>
        <div className="space-y-2">
          {COMPLEXITY.map(r => (
            <div key={r.from} className="border border-border/50 rounded-lg overflow-hidden">
              <button onClick={() => nav({ tab: 'identities', algorithm: r.from })} className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[11px] text-coral font-semibold">{r.from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-[11px] text-teal font-semibold">{r.to}</span>
                    <span className="text-[9.5px] text-muted-foreground">· {r.objects.toLocaleString()} objects</span>
                  </div>
                  <p className="text-[9.5px] text-muted-foreground">{r.keySize}</p>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${CX_COLOR[r.cx]}`}>{r.cx}</span>
                <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              <div className="grid grid-cols-2 border-t border-border/30">
                <div className="flex items-start gap-1.5 px-3 py-2 border-r border-border/30">
                  <AlertTriangle className="w-3 h-3 text-amber flex-shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-muted-foreground">{r.blocker}</p>
                </div>
                <div className="flex items-start gap-1.5 px-3 py-2">
                  <Shield className="w-3 h-3 text-teal flex-shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-muted-foreground">{r.compensating}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HNDL Risk Matrix */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold">HNDL Risk Matrix — Prioritization Framework</h3>
          <HndlBadge />
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">NIST: categorize data with respect to criticality, disclosure sensitivity, and consequences of unauthorized modification. Counts sum to {TOTAL_VULNERABLE.toLocaleString()}.</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div />
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Low Data Sensitivity</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">High Data Sensitivity</div>
          <div className="text-[10px] font-semibold text-muted-foreground text-right pr-3 self-center leading-tight">Active Harvest<br />Risk</div>
          <div className="bg-amber/10 border border-amber/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber tabular-nums">2,000</p>
            <p className="text-[9px] text-muted-foreground mt-1">High — Wave 2 · Q3 2026</p>
          </div>
          <div className="bg-coral/10 border border-coral/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-coral tabular-nums">1,842</p>
            <p className="text-[9px] text-muted-foreground mt-1">Critical — Wave 1 · Migrate NOW</p>
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground text-right pr-3 self-center leading-tight">Passive<br />Risk</div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-muted-foreground tabular-nums">5,618</p>
            <p className="text-[9px] text-muted-foreground mt-1">Medium — Wave 3 · 2027+</p>
          </div>
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber tabular-nums">3,200</p>
            <p className="text-[9px] text-muted-foreground mt-1">High — Wave 2 · Q4 2026</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          Create Migration Plan <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 3: Plan ─────────────────────────────────────────────────────────────

function StagePlan({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">

      {/* Timeline vs 2030 */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Migration Progress vs NIST 2030 Deadline</h3>
          <Countdown />
        </div>
        <div className="flex h-3 rounded-full overflow-hidden mb-2">
          <div style={{ width: `${((PQC_SAFE / TOTAL_VULNERABLE) * 100).toFixed(1)}%` }} className="bg-teal" title="Migrated" />
          <div style={{ width: `${((IN_FLIGHT_COUNT / TOTAL_VULNERABLE) * 100).toFixed(1)}%` }} className="bg-purple" title="In-flight" />
          <div className="flex-1 bg-coral/25" title="Remaining" />
        </div>
        <div className="flex items-center gap-4 text-[10px] mb-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-teal" />187 migrated</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-purple" />847 in-flight (Wave 1)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-coral/40" />11,626 remaining</span>
        </div>
        <div className="p-3 rounded-lg bg-coral/10 border border-coral/20">
          <p className="text-[11px] font-semibold text-coral">At current pace — migration completes 2031, one year past the NIST deadline.</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Wave 2 must begin no later than Q3 2026 to meet the 2030 mandate. Mosca's Theorem confirms Wave 1 and 2 urgency.</p>
        </div>
      </div>

      {/* Migration waves with Mosca's Theorem tooltip */}
      <div className="space-y-3">
        {WAVES.map(w => (
          <div key={w.n} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${w.bc}/20`}>
                  <span className={`text-base font-bold ${w.tc}`}>{w.n}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[12px] font-semibold text-foreground">{w.label}</h4>
                    <MoscaBadge wave={w} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{w.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold tabular-nums ${w.tc}`}>{w.objs.toLocaleString()}</p>
                <p className="text-[9.5px] text-muted-foreground">objects</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">Period: <span className="text-foreground font-medium">{w.period}</span></span>
                <span className={`text-[9.5px] px-1.5 py-0.5 rounded ${ST_STYLE[w.status]}`}>{w.status}</span>
              </div>
              <span className="text-[9.5px] text-muted-foreground">Satisfies: <span className="text-teal font-medium">{w.mandate}</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Target algorithms — NIST FIPS */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">Target Algorithm Selection — NIST FIPS Standards</h3>
        <p className="text-[10px] text-muted-foreground mb-3">NIST FIPS 203/204/205 finalized August 2024. These are the mandated replacement algorithms for all public-key cryptography by 2030.</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { std: 'FIPS 203', algo: 'ML-KEM',  use: 'Key encapsulation',  replaces: 'RSA, DH', basis: 'Lattice — Module Learning with Errors', note: 'Optimized for performance — suitable for real-time TLS and key exchange.' },
            { std: 'FIPS 204', algo: 'ML-DSA',  use: 'Digital signatures', replaces: 'ECDSA, RSA', basis: 'Lattice — Module Learning with Errors', note: 'Replaces ECDSA for code signing, JWT, and certificate signatures.' },
            { std: 'FIPS 205', algo: 'SLH-DSA', use: 'Backup signatures',  replaces: 'ECDSA (conservative)', basis: 'Hash-based — SPHINCS+', note: 'Conservative approach. Slower but relies only on hash function security.' },
          ].map(item => (
            <div key={item.algo} className="bg-teal/5 border border-teal/20 rounded-xl p-4">
              <p className="text-[9px] font-semibold text-teal uppercase tracking-wider mb-1">{item.std}</p>
              <p className="text-base font-bold text-foreground mb-0.5">{item.algo}</p>
              <p className="text-[10px] text-muted-foreground mb-1">{item.use} · replaces {item.replaces}</p>
              <p className="text-[9px] text-muted-foreground/60 border-t border-teal/10 pt-1.5">{item.basis}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-1">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          View In-Flight Migrations <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 4: Migrate ──────────────────────────────────────────────────────────

function StageMigrate({ onNext, nav }: { onNext: () => void; nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'In Progress',        value: IN_FLIGHT_TABLE.filter(m => m.status === 'In Progress').length, color: 'text-teal',            tip: null },
          { label: 'Blocked',            value: IN_FLIGHT_TABLE.filter(m => m.status === 'Blocked').length,     color: 'text-coral',           tip: null },
          { label: 'Completed',          value: IN_FLIGHT_TABLE.filter(m => m.status === 'Completed').length,   color: 'text-muted-foreground', tip: null },
          { label: 'Hybrid Mode Active', value: 3, color: 'text-purple-light', tip: 'Running classical + PQC algorithms simultaneously — per ETSI TR 103 619. Ensures zero downtime for dependent systems during migration.' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className="relative group/tip">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                {s.label}
                {s.tip && <Info className="w-3 h-3 cursor-help" />}
              </p>
              {s.tip && (
                <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover/tip:block w-60 bg-card border border-border rounded-lg shadow-xl p-2.5">
                  <p className="text-[10px] text-foreground leading-relaxed">{s.tip}</p>
                </div>
              )}
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* In-flight table */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">In-Flight Migrations</h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
            Showing 8 representative migrations · 847 total in Wave 1
          </span>
        </div>
        <div className="space-y-2">
          {IN_FLIGHT_TABLE.map(r => (
            <div key={r.asset} className="border border-border/50 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-secondary/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[10.5px] text-foreground font-semibold truncate">{r.asset}</span>
                    <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${ST_STYLE[r.status]}`}>{r.status}</span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                      <GitBranch className="w-2.5 h-2.5" />{r.dependents} dependents
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono text-coral">{r.from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-teal">{r.to}</span>
                    <span className="text-muted-foreground">· {r.owner}</span>
                    {r.days && <span className="text-muted-foreground">{r.days}d remaining</span>}
                    {r.status === 'Completed' && <span className="text-teal flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.status === 'In Progress' && (
                    <button onClick={() => nav({ tab: 'identities', algorithm: r.from })} className="text-[9.5px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 whitespace-nowrap">
                      View in Inventory →
                    </button>
                  )}
                  {r.status === 'Blocked' && (
                    <button
                      onClick={() => toast.success('TrustOps ticket created', { description: `PQC Migration — ${r.asset} — ${r.from} → ${r.to} · Priority: Critical · Owner: ${r.owner} · Interim control active` })}
                      className="text-[9.5px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 whitespace-nowrap"
                    >
                      Create Ticket
                    </button>
                  )}
                  {r.status === 'Completed' && (
                    <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Safe' })} className="text-[9.5px] px-2 py-1 rounded bg-teal/5 text-teal/70 hover:text-teal whitespace-nowrap">
                      Verify →
                    </button>
                  )}
                </div>
              </div>
              {/* Blocker + compensating control for blocked items only */}
              {r.status === 'Blocked' && r.blocker && (
                <div className="grid grid-cols-2 border-t border-border/30">
                  <div className="flex items-start gap-1.5 px-3 py-2 border-r border-border/30">
                    <AlertTriangle className="w-3 h-3 text-coral flex-shrink-0 mt-0.5" />
                    <p className="text-[9.5px] text-muted-foreground">{r.blocker}</p>
                  </div>
                  <div className="flex items-start gap-1.5 px-3 py-2">
                    <Shield className="w-3 h-3 text-teal flex-shrink-0 mt-0.5" />
                    <p className="text-[9.5px] text-muted-foreground"><span className="text-teal font-semibold">Interim:</span> {r.compensating}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          View Migration Monitor <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 5: Monitor ──────────────────────────────────────────────────────────

function StageMonitor({ nav }: { nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Cumulative Migrations — Actual vs Required Pace</h3>
          <Countdown />
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Wave 1 started March 2026 — acceleration reflects first production migrations going live. Required pace assumes linear completion to 2030 deadline.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MONITOR_PROGRESS} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(225 30% 14%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="required" name="Required pace" fill="hsl(38 78% 51%)" opacity={0.35} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual"   name="Migrated"      fill="hsl(162 72% 37%)"              radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 text-[10px] mt-1 mb-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-teal" />Migrated</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber/40" />Required pace</span>
        </div>
        <div className="p-2.5 rounded-lg bg-coral/10 border border-coral/20">
          <p className="text-[10px] text-coral font-semibold">Tracking 33% behind required pace — Wave 2 must start Q3 2026 without delay to recover.</p>
        </div>
      </div>

      {/* Validation status — NIST: validate and test new implementations */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">PQC Validation Status — Migrated Assets</h3>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Safe' })} className="text-[10px] text-teal hover:text-teal/80 flex items-center gap-1">
            View all PQC-safe <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">NIST: develop implementation validation tools and test new processes after each migration. Dependency validation confirms downstream systems function correctly post-migration.</p>
        <div className="space-y-2">
          {[
            { asset: 'staging-api.acmecorp.com', algo: 'ML-DSA', validated: true,  date: '2026-04-22', dependents: 4 },
            { asset: 'cdn.acmecorp.com',          algo: 'ML-KEM', validated: true,  date: '2026-04-18', dependents: 8 },
            { asset: 'payments-api.acmecorp.com', algo: 'ML-KEM', validated: false, date: 'In Progress', dependents: 7 },
          ].map(item => (
            <div key={item.asset} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.validated ? 'text-teal' : 'text-amber'}`} />
              <span className="font-mono text-[10.5px] text-foreground flex-1">{item.asset}</span>
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <GitBranch className="w-2.5 h-2.5" />{item.dependents} dependents validated
              </span>
              <span className="text-[10px] font-medium text-teal">{item.algo}</span>
              <span className={`text-[10px] ${item.validated ? 'text-teal' : 'text-amber'}`}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regression alerts — NIST: continuously monitor for reversion */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">Regression Alerts — Algorithm Rollbacks Detected</h3>
        <p className="text-[10px] text-muted-foreground mb-3">NIST: continuously monitor migrated assets for unintended reversion to quantum-vulnerable algorithms. Any rollback must trigger immediate alert and re-migration.</p>
        <div className="p-5 rounded-xl bg-teal/5 border border-teal/20 text-center">
          <CheckCircle2 className="w-7 h-7 text-teal mx-auto mb-2" />
          <p className="text-[12px] font-semibold text-foreground">No regressions detected</p>
          <p className="text-[10px] text-muted-foreground mt-1">All migrated assets holding PQC algorithms · 2 assets validated · Last scan: 2 hours ago</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STAGES_CONFIG = [
  { label: 'Discover', status: 'Complete'    },
  { label: 'Assess',   status: 'In Progress' },
  { label: 'Plan',     status: 'Not Started' },
  { label: 'Migrate',  status: 'Not Started' },
  { label: 'Monitor',  status: 'Not Started' },
];

export default function QuantumPosturePage() {
  const [active, setActive] = useState(0);
  const { setCurrentPage, setFilters } = useNav();

  const nav = (f: Record<string, string>) => {
    setFilters(f);
    setCurrentPage('inventory');
  };

  return (
    <div className="space-y-4 pb-10">

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-5 h-5 text-purple-light" />
            <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {TOTAL_VULNERABLE.toLocaleString()} quantum-vulnerable objects across {TOTAL_OBJECTS.toLocaleString()} total ·
            NIST FIPS 203/204/205 aligned · 2026 is the Year of Quantum Security (FBI/CISA/NIST)
          </p>
        </div>
        <Countdown />
      </div>

      <div className="flex border border-border rounded-xl overflow-hidden bg-card">
        {STAGES_CONFIG.map((s, i) => (
          <button key={s.label} onClick={() => setActive(i)}
            className={`flex-1 py-3 border-r border-border last:border-0 transition-colors ${active === i ? 'bg-purple/15 text-purple-light' : 'text-muted-foreground hover:bg-secondary/30'}`}>
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${DOT_STYLE[s.status]}`} />
              <span className="text-[11px] font-semibold">Stage {i + 1}: {s.label}</span>
            </div>
            <p className="text-[9.5px] text-muted-foreground">{s.status}</p>
          </button>
        ))}
      </div>

      {active === 0 && <StageDiscover onNext={() => setActive(1)} nav={nav} />}
      {active === 1 && <StageAssess   onNext={() => setActive(2)} nav={nav} />}
      {active === 2 && <StagePlan     onNext={() => setActive(3)} />}
      {active === 3 && <StageMigrate  onNext={() => setActive(4)} nav={nav} />}
      {active === 4 && <StageMonitor  nav={nav} />}

    </div>
  );
}
