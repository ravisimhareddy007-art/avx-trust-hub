import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import {
  Atom, Download, ArrowRight, Clock, ChevronRight, CheckCircle2,
  AlertTriangle, Info, Shield, GitBranch,
} from 'lucide-react';

// ── Authoritative PQC numbers ─────────────────────────────────────────────────

const TOTAL_VULNERABLE = 12660;
const HNDL_ACTIVE      = 3842;
const TOTAL_OBJECTS    = 44698;
const PQC_SAFE         = 187;
const IN_FLIGHT_COUNT  = 847;

// ── Algorithm data with semantic fills ───────────────────────────────────────

const ALGO_DATA = [
  { algo: 'RSA-2048',  count: 8420, vulnerable: true,  fill: 'hsl(16, 72%, 51%)',  use: 'Key exchange, TLS, code signing',
    breakdown: [{ type: 'TLS Certificates', count: 3840 }, { type: 'SSH Keys', count: 2940 }, { type: 'Code Signing', count: 980 }, { type: 'API / Secrets', count: 660 }] },
  { algo: 'RSA-4096',  count: 2100, vulnerable: true,  fill: 'hsl(16, 72%, 51%)',  use: 'Key exchange, document signing',
    breakdown: [{ type: 'TLS Certificates', count: 1260 }, { type: 'Document Signing', count: 520 }, { type: 'SSH Keys', count: 320 }] },
  { algo: 'ECC P-256', count: 1800, vulnerable: true,  fill: 'hsl(38, 78%, 51%)',  use: 'TLS, JWT, API auth, SSH certs',
    breakdown: [{ type: 'TLS Certificates', count: 840 }, { type: 'SSH Certificates', count: 480 }, { type: 'AI Agent Tokens', count: 312 }, { type: 'JWT / API Auth', count: 168 }] },
  { algo: 'ECC P-384', count: 340,  vulnerable: true,  fill: 'hsl(38, 78%, 51%)',  use: 'K8s workload certs, high-sec APIs',
    breakdown: [{ type: 'K8s Workload Certs', count: 248 }, { type: 'TLS Certificates', count: 92 }] },
  { algo: 'AES-256',   count: 4200, vulnerable: false, fill: 'hsl(162, 72%, 37%)', use: 'Data at rest — quantum-resistant',
    breakdown: [{ type: 'Encryption Keys', count: 2840 }, { type: 'Secrets / API Keys', count: 960 }, { type: 'Vault Secrets', count: 400 }] },
  { algo: 'ML-KEM',    count: 187,  vulnerable: false, fill: 'hsl(162, 65%, 55%)', use: 'NIST FIPS 203 — PQC-safe',
    breakdown: [{ type: 'TLS Certificates', count: 124 }, { type: 'K8s Workload Certs', count: 63 }] },
];

// ── HNDL top-5 with dependencies and compensating controls ───────────────────

const HNDL_LIST = [
  { name: 'payments-api.acmecorp.com',    algo: 'RSA-2048',  risk: 'CRITICAL' as const, detail: 'Internet-facing · 47,000 financial tx/day', sensitivity: 'PCI-DSS · financial transactions', dependents: 7,  mig_time: '~3 months', compensating: 'Restrict to internal egress only until migrated' },
  { name: 'auth.acmecorp.com',            algo: 'ECC P-256', risk: 'CRITICAL' as const, detail: 'Internet-facing · SSO for 12,400 users',     sensitivity: 'PII · GDPR scope · auth tokens',   dependents: 14, mig_time: '~4 months', compensating: 'Enable MFA enforcement on all SSO sessions' },
  { name: 'prod-gateway-01.acmecorp.com', algo: 'RSA-2048',  risk: 'CRITICAL' as const, detail: 'Internet-facing · all inbound API traffic',   sensitivity: 'Mixed — routes PCI and PHI',        dependents: 22, mig_time: '~2 months', compensating: 'Rate-limit external traffic and add WAF inspection' },
  { name: 'vault.internal.acmecorp.com',  algo: 'RSA-2048',  risk: 'HIGH'     as const, detail: 'Internal · holds 68% of production secrets',  sensitivity: 'PHI + PCI + financial — crown jewel', dependents: 38, mig_time: '~5 months', compensating: 'Restrict Vault access to allowlisted IPs · weekly audit' },
  { name: 'eks-prod-cluster',             algo: 'ECC P-256', risk: 'HIGH'     as const, detail: 'Internal · 847 workload certs',               sensitivity: 'PCI workloads · service mesh',      dependents: 12, mig_time: '~3 months', compensating: 'Enable mutual TLS strict mode across all namespaces' },
];

// ── Heatmap ───────────────────────────────────────────────────────────────────

const HEATMAP_BUS   = ['Payments', 'Platform', 'Infrastructure', 'AI Eng', 'Security'];
const HEATMAP_TYPES = ['TLS', 'SSH', 'Secrets', 'K8s', 'AI Tokens'];
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

const HEATMAP: Record<string, RiskLevel> = {
  'Payments-TLS': 'critical',     'Payments-SSH': 'high',          'Payments-Secrets': 'critical',    'Payments-K8s': 'high',     'Payments-AI Tokens': 'medium',
  'Platform-TLS': 'high',         'Platform-SSH': 'high',           'Platform-Secrets': 'high',        'Platform-K8s': 'high',     'Platform-AI Tokens': 'medium',
  'Infrastructure-TLS': 'high',   'Infrastructure-SSH': 'critical',  'Infrastructure-Secrets': 'medium','Infrastructure-K8s': 'medium','Infrastructure-AI Tokens': 'low',
  'AI Eng-TLS': 'medium',         'AI Eng-SSH': 'medium',            'AI Eng-Secrets': 'high',         'AI Eng-K8s': 'medium',     'AI Eng-AI Tokens': 'critical',
  'Security-TLS': 'medium',       'Security-SSH': 'high',            'Security-Secrets': 'high',        'Security-K8s': 'low',      'Security-AI Tokens': 'low',
};

const CELL_BG: Record<RiskLevel, string> = {
  critical: 'bg-coral text-white',
  high:     'bg-amber/80 text-white',
  medium:   'bg-purple/60 text-white',
  low:      'bg-teal/30 text-foreground',
};

// ── Stage 2 asset data ────────────────────────────────────────────────────────

const ASSESS_READY = [
  { asset: 'payments-api.acmecorp.com',    from: 'RSA-2048',  to: 'ML-KEM', owner: 'Payments Eng',   deps: 7,  hndl: 'CRITICAL' as const, sensitivity: 'PCI-DSS · financial transactions' },
  { asset: 'prod-gateway-01.acmecorp.com', from: 'RSA-2048',  to: 'ML-KEM', owner: 'Infrastructure', deps: 22, hndl: 'CRITICAL' as const, sensitivity: 'Routes all inbound API traffic' },
  { asset: 'eks-prod-cluster',             from: 'ECC P-256', to: 'ML-DSA', owner: 'Platform Eng',   deps: 12, hndl: 'HIGH'     as const, sensitivity: 'Payments + Platform workloads' },
  { asset: 'mail.acmecorp.com',            from: 'RSA-2048',  to: 'ML-KEM', owner: 'IT Operations',  deps: 3,  hndl: 'MEDIUM'   as const, sensitivity: 'Internal communications' },
];

const ASSESS_BLOCKED = [
  { asset: 'auth.acmecorp.com',           from: 'ECC P-256', to: 'ML-DSA', owner: 'Security Ops', deps: 14, hndl: 'CRITICAL' as const, sensitivity: 'SSO for 12,400 users · PII in tokens',                blocker: 'HSM firmware upgrade required — Thales Luna 7.4 (procurement in progress)',           resolution: 'Raise procurement request for Thales Luna 7.4 firmware · Est. unblocked: July 2026', compensating: 'MFA enforcement active on all SSO sessions' },
  { asset: 'vault.internal.acmecorp.com', from: 'RSA-2048',  to: 'ML-KEM', owner: 'Security Eng', deps: 38, hndl: 'HIGH'     as const, sensitivity: 'PHI + PCI + financial — holds 68% of production secrets', blocker: 'Vault upgrade to 1.14 blocked by Q2 change freeze — unblocks July 2026',               resolution: 'Raise change request for post-freeze Vault 1.14 upgrade · Schedule July 2026 window',  compensating: 'Vault access restricted to allowlisted IPs · weekly access audit active' },
];

const ASSESS_GOVERNANCE = [
  { category: 'API Gateways',        count: 3, unowned: 3, nopolicy: 3, wave: 1, navType: 'API Gateway'        },
  { category: 'Application Servers', count: 3, unowned: 3, nopolicy: 4, wave: 2, navType: 'Application Server' },
  { category: 'K8s Clusters',        count: 3, unowned: 3, nopolicy: 3, wave: 2, navType: 'K8s Cluster'        },
  { category: 'Vault Servers',       count: 2, unowned: 2, nopolicy: 2, wave: 1, navType: 'Vault Server'       },
  { category: 'AI Platforms',        count: 3, unowned: 3, nopolicy: 3, wave: 2, navType: 'AI Platform'        },
];

// ── Migration waves ───────────────────────────────────────────────────────────

const WAVES = [
  { n: 1, label: 'Wave 1 — Critical HNDL',  period: 'Q2 2026',    objs: 847,  status: 'In Progress', mandate: 'NSA CNSA 2.0 (2025)',         desc: 'Internet-facing assets with active HNDL exposure and financial/PII data', moscaX: 'Data must stay private 10+ years',   moscaY: '~6 months migration time', tc: 'text-coral',        bc: 'bg-coral'   },
  { n: 2, label: 'Wave 2 — High Priority',  period: 'Q3–Q4 2026', objs: 3218, status: 'Planned',     mandate: 'NSA CNSA 2.0 (2027 systems)', desc: 'Production assets not HNDL-active but carrying sensitive data',           moscaX: 'Data must stay private 5-10 years', moscaY: '~12 months migration time', tc: 'text-amber',        bc: 'bg-amber'   },
  { n: 3, label: 'Wave 3 — Background',     period: '2027+',      objs: 8595, status: 'Not Started', mandate: 'NIST 2030 all systems',        desc: 'Remaining estate — non-production, low-sensitivity, internal only',        moscaX: 'Data sensitivity under 5 years',    moscaY: '~24 months migration time', tc: 'text-purple-light', bc: 'bg-purple'  },
];

const WAVE_NAV_RISK: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium' };

const WAVE_COMPLIANCE: Record<number, { mandate: string; detail: string }[]> = {
  1: [
    { mandate: 'NSA CNSA 2.0',          detail: 'Internet-facing systems with sensitive data — must begin migration now' },
    { mandate: 'CISA PQC Roadmap 2025', detail: 'Critical infrastructure — HNDL active exposure requires immediate action' },
  ],
  2: [
    { mandate: 'NSA CNSA 2.0 (2027)',   detail: 'New systems deployed from 2027 onwards must be PQC-native' },
    { mandate: 'NIST SP 800-131A r3',   detail: 'RSA and ECC deprecated for new deployments from 2027' },
  ],
  3: [
    { mandate: 'NIST FIPS 203/204/205', detail: 'Full estate migration deadline — all public-key crypto must be replaced' },
    { mandate: 'NSA CNSA 2.0 (2033)',   detail: 'RSA and ECC fully retired — no exceptions after this date' },
  ],
};

// ── In-flight migrations (Stage 4) ───────────────────────────────────────────

const IN_FLIGHT_TABLE = [
  { asset: 'payments-api.acmecorp.com',    from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'Payments Eng',   days: 14,   dependents: 7,  blocker: null, compensating: null },
  { asset: 'prod-gateway-01.acmecorp.com', from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'Infrastructure', days: 7,    dependents: 22, blocker: null, compensating: null },
  { asset: 'eks-prod-cluster',             from: 'ECC P-256', to: 'ML-DSA', status: 'In Progress', owner: 'Platform Eng',   days: 21,   dependents: 12, blocker: null, compensating: null },
  { asset: 'auth.acmecorp.com',            from: 'ECC P-256', to: 'ML-DSA', status: 'Blocked',     owner: 'Security Ops',  days: null, dependents: 14, blocker: 'HSM firmware upgrade required — Thales Luna 7.4 (procurement in progress)', compensating: 'MFA enforcement active on all SSO sessions as interim control' },
  { asset: 'vault.internal.acmecorp.com',  from: 'RSA-2048',  to: 'ML-KEM', status: 'Blocked',     owner: 'Security Eng',  days: null, dependents: 38, blocker: 'Vault upgrade to 1.14 blocked by Q2 change freeze — unblocks July 2026',   compensating: 'Vault access restricted to allowlisted IPs · weekly access audit active' },
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

// ── Shared micro-components ───────────────────────────────────────────────────

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

// ── AlgoChart — pure CSS bars, avoids Recharts Cell color issues ──────────────

function AlgoChart({ onBarClick }: { onBarClick: (algo: string) => void }) {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const W = 640, H = 160, BOTTOM = 24;
  const PAD_L = 8, PAD_R = 8, GAP = 10;
  const maxVal = Math.max(...ALGO_DATA.map(d => d.count));
  const barW = (W - PAD_L - PAD_R - GAP * (ALGO_DATA.length - 1)) / ALGO_DATA.length;
  return (
    <div className="w-full">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H + BOTTOM}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {ALGO_DATA.map((d, i) => {
          const barH = Math.max(6, (d.count / maxVal) * H);
          const x = PAD_L + i * (barW + GAP);
          const y = H - barH;
          const isHov = hovered === d.algo;
          const ttX = Math.min(Math.max(x - 20, 0), W - 180);
          const ttY = y - 10;
          return (
            <g
              key={d.algo}
              style={{ cursor: 'pointer' }}
              onClick={() => onBarClick(d.algo)}
              onMouseEnter={() => setHovered(d.algo)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={x} y={y}
                width={barW} height={barH}
                fill={d.fill}
                opacity={hovered && !isHov ? 0.35 : 1}
                rx={3}
              />
              <text
                x={x + barW / 2}
                y={H + BOTTOM - 4}
                textAnchor="middle"
                fontSize={9.5}
                fill="hsl(220, 15%, 50%)"
              >
                {d.algo}
              </text>
              {isHov && (
                <foreignObject x={ttX} y={Math.max(ttY - 100, 0)} width={190} height={130}>
                  <div
                    style={{
                      background: 'hsl(225, 30%, 12%)',
                      border: '1px solid hsl(225, 20%, 22%)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 10,
                      color: 'hsl(220, 20%, 85%)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6, color: d.fill }}>
                      {d.algo} — {d.count.toLocaleString()} objects
                    </div>
                    {d.breakdown.map(b => (
                      <div
                        key={b.type}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2, color: 'hsl(220, 15%, 58%)' }}
                      >
                        <span>{b.type}</span>
                        <span style={{ fontWeight: 600, color: 'hsl(220, 20%, 80%)' }}>{b.count.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid hsl(225, 20%, 22%)', fontSize: 9, color: 'hsl(220, 15%, 45%)' }}>
                      {d.use}
                    </div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-[9.5px] text-muted-foreground text-center mt-1">
        Hover for object breakdown · Click any bar to view in Inventory
      </p>
    </div>
  );
}

// ── Stage 1: Discover ─────────────────────────────────────────────────────────

function StageDiscover({ onNext, nav }: { onNext: () => void; nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">

      {/* CBOM KPI strip — all clickable */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Quantum-Vulnerable Objects', value: TOTAL_VULNERABLE.toLocaleString(), color: 'text-coral', sub: `${((TOTAL_VULNERABLE / TOTAL_OBJECTS) * 100).toFixed(1)}% of estate — RSA, ECC public-key only`, navFilter: { tab: 'identities', pqcRisk: 'Critical' } },
          { label: 'HNDL Active Exposure',       value: HNDL_ACTIVE.toLocaleString(),      color: 'text-coral', sub: 'Internet-facing + long-lived sensitive data at risk TODAY',                                        navFilter: { tab: 'identities', pqcRisk: 'Critical' } },
          { label: 'PQC-Safe Today',             value: PQC_SAFE.toLocaleString(),          color: 'text-teal',  sub: 'ML-KEM only · 1.5% of vulnerable estate migrated · AES-256 already safe',                        navFilter: { tab: 'identities', pqcRisk: 'Safe'     } },
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

      {/* NIST context */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-teal/5 border border-teal/20">
        <Info className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="text-teal font-semibold">NIST guidance:</span> Symmetric encryption (AES-256) and hashing (SHA-2/3) are quantum-resistant and require no migration.
          Focus is exclusively on public-key cryptography — RSA, ECC, DSA, and DH variants.
        </p>
      </div>

      {/* Algorithm Breakdown */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Algorithm Breakdown — Cryptographic Estate</h3>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'hsl(16, 72%, 51%)' }} />RSA — Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'hsl(38, 78%, 51%)' }} />ECC — High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'hsl(162, 72%, 37%)' }} />Quantum-safe</span>
          </div>
        </div>
        <div className="relative">
          <AlgoChart onBarClick={(algo) => nav({ tab: 'identities', algorithm: algo })} />
        </div>
      </div>

      {/* PQC Risk Heatmap */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">PQC Risk Heatmap — Business Unit × Asset Type</h3>
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

      {/* HNDL Top 5 */}
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
                  <div className="flex items-center gap-3 flex-wrap text-[10px]">
                    <span className="text-muted-foreground">{item.algo} · {item.detail}</span>
                    <span className="text-purple-light bg-purple/10 px-1.5 py-0.5 rounded text-[9px]">{item.sensitivity}</span>
                    <span className="text-muted-foreground flex items-center gap-0.5"><GitBranch className="w-2.5 h-2.5" />{item.dependents} downstream · {item.mig_time}</span>
                  </div>
                </div>
                <button onClick={() => nav({ tab: 'infrastructure', assetName: item.name })} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-teal flex items-center gap-1 flex-shrink-0">
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

      {/* Footer */}
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
  const [queued, setQueued] = React.useState<Record<string, boolean>>({});
  const [expandedBlocker, setExpandedBlocker] = React.useState<string | null>(null);

  const buildResolutionTicket = (r: typeof ASSESS_BLOCKED[0]) =>
`TITLE: PQC Migration Blocker — ${r.asset}
TYPE: Change Request / Procurement
PRIORITY: Critical
ASSIGNEE: ${r.owner}
DEADLINE: Must resolve before 30 June 2026 (Wave 1 cutoff)

BLOCKER:
${r.blocker}

RESOLUTION STEPS:
${r.resolution}

INTERIM CONTROL (active until resolved):
${r.compensating}

MIGRATION PENDING:
${r.from} → ${r.to} · ${r.deps} downstream systems affected
Data sensitivity: ${r.sensitivity}`;

  const hndlColor = (h: string) =>
    h === 'CRITICAL' ? 'bg-coral/15 text-coral border-coral/30' :
    h === 'HIGH'     ? 'bg-amber/15 text-amber border-amber/30' :
                       'bg-secondary text-muted-foreground border-border';

  return (
    <div className="space-y-4">

      {/* Assessment summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-teal/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ready to migrate</p>
          <p className="text-3xl font-bold text-teal tabular-nums">{ASSESS_READY.length}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">assets — no blockers · owner assigned</p>
        </div>
        <div className="bg-card rounded-xl border border-coral/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Blocked — resolve first</p>
          <p className="text-3xl font-bold text-coral tabular-nums">{ASSESS_BLOCKED.length}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{ASSESS_BLOCKED.reduce((s, r) => s + r.deps, 0)} combined dependents at risk</p>
        </div>
        <div className="bg-card rounded-xl border border-amber/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Governance gaps</p>
          <p className="text-3xl font-bold text-amber tabular-nums">{ASSESS_GOVERNANCE.reduce((s, g) => s + g.unowned, 0)}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">assets without owner — cannot migrate yet</p>
        </div>
      </div>

      {/* Panel 1: Ready to migrate */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Ready to Migrate — Queue for Wave 1</h3>
          <span className="text-[9.5px] text-muted-foreground">Owner assigned · No blockers · HNDL prioritised</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          These assets meet all pre-migration criteria. Queue them for Wave 1 to build the migration plan in Stage 3.
          <span className="ml-1 text-muted-foreground/60">· Representative sample — full Wave 1 contains {IN_FLIGHT_COUNT.toLocaleString()} objects</span>
        </p>
        <div className="space-y-2">
          {ASSESS_READY.map(r => (
            <div key={r.asset} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono text-[10.5px] font-semibold text-foreground">{r.asset}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${hndlColor(r.hndl)}`}>{r.hndl}</span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0"><GitBranch className="w-2.5 h-2.5" />{r.deps} deps</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono text-coral">{r.from}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-mono text-teal">{r.to}</span>
                  <span className="text-muted-foreground">· {r.owner} · {r.sensitivity}</span>
                </div>
              </div>
              {queued[r.asset] ? (
                <span className="flex-shrink-0 flex items-center gap-1 text-[9.5px] font-semibold text-teal px-2.5 py-1 rounded bg-teal/10 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3" /> Queued for Wave 1
                </span>
              ) : (
                <button
                  onClick={() => setQueued(prev => ({ ...prev, [r.asset]: true }))}
                  className="flex-shrink-0 text-[9.5px] font-semibold px-2.5 py-1 rounded bg-purple/10 text-purple-light hover:bg-purple/20 whitespace-nowrap transition-colors"
                >
                  + Queue for Wave 1
                </button>
              )}
            </div>
          ))}
        </div>
        {Object.values(queued).some(Boolean) && (
          <div className="mt-3 p-2.5 rounded-lg bg-purple/5 border border-purple/20 flex items-center justify-between">
            <p className="text-[10px] text-purple-light font-medium">
              {Object.values(queued).filter(Boolean).length} asset{Object.values(queued).filter(Boolean).length > 1 ? 's' : ''} queued — proceed to Stage 3 to build the migration plan
            </p>
            <button onClick={onNext} className="text-[9.5px] font-semibold px-2.5 py-1 rounded bg-purple/15 text-purple-light hover:bg-purple/25 whitespace-nowrap transition-colors flex items-center gap-1">
              Build plan <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Panel 2: Blocked */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Blocked — Resolve Before Migration</h3>
          <span className="text-[9.5px] text-coral font-semibold">Wave 1 deadline: 30 June 2026</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          These assets cannot migrate until their blocker is resolved. Each has an active interim control.
          Copy the resolution ticket and assign to the responsible team immediately.
        </p>
        <div className="space-y-2">
          {ASSESS_BLOCKED.map(r => (
            <div key={r.asset} className="border border-coral/20 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3 bg-coral/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[10.5px] font-semibold text-foreground">{r.asset}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${hndlColor(r.hndl)}`}>{r.hndl}</span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0"><GitBranch className="w-2.5 h-2.5" />{r.deps} deps</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono text-coral">{r.from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-teal">{r.to}</span>
                    <span className="text-muted-foreground">· {r.owner}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedBlocker(expandedBlocker === r.asset ? null : r.asset)}
                  className="flex-shrink-0 text-[9.5px] font-semibold px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20 whitespace-nowrap"
                >
                  {expandedBlocker === r.asset ? 'Hide ▲' : 'View resolution ticket ▼'}
                </button>
              </div>
              <div className="flex items-start gap-3 px-3 py-2 border-t border-coral/15">
                <div className="flex items-start gap-1.5 flex-1">
                  <AlertTriangle className="w-3 h-3 text-coral flex-shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-muted-foreground">{r.blocker}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Shield className="w-3 h-3 text-teal" />
                  <p className="text-[9.5px] text-teal font-medium">Interim: {r.compensating}</p>
                </div>
              </div>
              {expandedBlocker === r.asset && (
                <div className="border-t border-coral/15 bg-secondary/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-foreground">Resolution ticket — copy to your ITSM system</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(buildResolutionTicket(r));
                        toast.success('Copied to clipboard', { description: 'Paste into Jira, ServiceNow, or your change management system' });
                      }}
                      className="text-[9.5px] px-2.5 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 font-semibold whitespace-nowrap"
                    >
                      Copy to clipboard →
                    </button>
                  </div>
                  <pre className="text-[9px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono bg-card rounded-lg p-3 border border-border/50 max-h-44 overflow-y-auto">
                    {buildResolutionTicket(r)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panel 3: Governance gaps */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Governance Gaps — Assign Owner Before Migrating</h3>
          <span className="text-[9.5px] text-amber font-semibold">Cannot assign to any wave without owner</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          NIST: every asset must have an accountable owner before migration begins.
          Click any row to assign ownership in Inventory.
          <span className="ml-1 text-muted-foreground/60">· Showing representative records from platform inventory</span>
        </p>
        <div className="space-y-1.5">
          {ASSESS_GOVERNANCE.map(g => (
            <button
              key={g.category}
              onClick={() => nav({ tab: 'infrastructure', type: g.navType, coverageGap: 'unowned' })}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-amber/20 bg-amber/5 hover:bg-amber/10 transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-foreground">{g.category}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber/15 text-amber font-medium">Wave {g.wave}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="text-coral font-medium">{g.unowned} unowned</span>
                  <span>{g.nopolicy} without policy</span>
                  <span className="text-muted-foreground/50">of {g.count} sample records</span>
                </div>
              </div>
              <span className="flex-shrink-0 text-[9.5px] text-teal font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Assign in Inventory <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* HNDL Priority Matrix */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold">HNDL Priority Matrix — Which Assets to Migrate First</h3>
          <HndlBadge />
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Click any quadrant to see those objects in Inventory. Prioritise top-right first — Critical HNDL + high sensitivity assets are at risk TODAY.
          All counts sum to {TOTAL_VULNERABLE.toLocaleString()}.
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div />
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Low Data Sensitivity</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">High Data Sensitivity</div>
          <div className="text-[10px] font-semibold text-muted-foreground text-right pr-3 self-center leading-tight">Active Harvest<br />Risk</div>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'High' })} className="bg-amber/10 border border-amber/30 rounded-xl p-4 hover:bg-amber/20 transition-colors text-left group">
            <p className="text-2xl font-bold text-amber tabular-nums">2,000</p>
            <p className="text-[9px] text-muted-foreground mt-1">High — Wave 2 · Q3 2026</p>
            <p className="text-[9px] text-amber/60 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">View in Inventory →</p>
          </button>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Critical' })} className="bg-coral/10 border border-coral/30 rounded-xl p-4 hover:bg-coral/20 transition-colors text-left group">
            <p className="text-2xl font-bold text-coral tabular-nums">1,842</p>
            <p className="text-[9px] text-muted-foreground mt-1">Critical — Wave 1 · Migrate NOW</p>
            <div className="mt-2 pt-2 border-t border-coral/20">
              <span className="text-[9px] font-semibold text-coral">Highest priority · includes your queued assets above →</span>
            </div>
          </button>
          <div className="text-[10px] font-semibold text-muted-foreground text-right pr-3 self-center leading-tight">Passive<br />Risk</div>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Medium' })} className="bg-secondary rounded-xl p-4 hover:bg-secondary/80 transition-colors text-left group">
            <p className="text-2xl font-bold text-muted-foreground tabular-nums">5,618</p>
            <p className="text-[9px] text-muted-foreground mt-1">Medium — Wave 3 · 2027+</p>
            <p className="text-[9px] text-muted-foreground/50 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">View in Inventory →</p>
          </button>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'High' })} className="bg-amber/10 border border-amber/20 rounded-xl p-4 hover:bg-amber/20 transition-colors text-left group">
            <p className="text-2xl font-bold text-amber tabular-nums">3,200</p>
            <p className="text-[9px] text-muted-foreground mt-1">High — Wave 2 · Q4 2026</p>
            <p className="text-[9px] text-amber/60 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">View in Inventory →</p>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Critical' })} className="text-[11px] text-teal hover:text-teal/80 transition-colors flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" /> View all Critical objects in Inventory
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          Create Migration Plan <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 3: Plan ─────────────────────────────────────────────────────────────

function StagePlan({ onNext, nav }: { onNext: () => void; nav: (f: Record<string, string>) => void }) {
  const [selectedAlgos, setSelectedAlgos] = React.useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">

      {/* Timeline vs 2030 */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Migration Progress vs NIST 2030 Deadline</h3>
          <Countdown />
        </div>
        <div className="flex h-3 rounded-full overflow-hidden mb-2">
          <div style={{ width: `${((PQC_SAFE / TOTAL_VULNERABLE) * 100).toFixed(1)}%` }} className="bg-teal" />
          <div style={{ width: `${((IN_FLIGHT_COUNT / TOTAL_VULNERABLE) * 100).toFixed(1)}%` }} className="bg-purple" />
          <div className="flex-1 bg-coral/25" />
        </div>
        <div className="flex items-center gap-4 text-[10px] mb-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-teal" />{PQC_SAFE} migrated</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-purple" />{IN_FLIGHT_COUNT.toLocaleString()} in-flight (Wave 1)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-coral/40" />{(TOTAL_VULNERABLE - PQC_SAFE - IN_FLIGHT_COUNT).toLocaleString()} remaining</span>
        </div>
        <div className="p-3 rounded-lg bg-coral/10 border border-coral/20">
          <p className="text-[11px] font-semibold text-coral">Wave 1 is 67% behind required pace — completed 187 of 564 target by end of April.</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Wave 1 needs 330 migrations/month in May–June to finish on time. Wave 2 must start Q3 2026 without delay.</p>
        </div>
      </div>

      {/* Migration waves — clickable to inventory */}
      <div className="space-y-3">
        {WAVES.map(w => (
          <div key={w.n} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-5">
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
                <button
                  onClick={() => nav({ tab: 'identities', pqcRisk: WAVE_NAV_RISK[w.n] })}
                  className={`text-[9.5px] font-semibold flex items-center gap-1 ${w.tc} hover:opacity-80 transition-opacity`}
                >
                  View {w.objs.toLocaleString()} objects in Inventory <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="border-t border-border/50 px-5 py-3 bg-secondary/20">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Regulatory mandates satisfied</p>
              <div className="space-y-1">
                {WAVE_COMPLIANCE[w.n].map(c => (
                  <div key={c.mandate} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-teal flex-shrink-0 mt-0.5" />
                    <div><span className="text-[9.5px] font-semibold text-teal">{c.mandate}</span><span className="text-[9.5px] text-muted-foreground"> — {c.detail}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Target algorithm selection */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">Target Algorithm Selection — NIST FIPS Standards</h3>
        <p className="text-[10px] text-muted-foreground mb-3">NIST FIPS 203/204/205 finalized August 2024. Confirm target algorithms for your migration plan.</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { std: 'FIPS 203', algo: 'ML-KEM',  use: 'Key encapsulation',  replaces: 'RSA, DH',              basis: 'Lattice — Module Learning with Errors', note: 'Optimized for real-time TLS and key exchange. Recommended for Wave 1.' },
            { std: 'FIPS 204', algo: 'ML-DSA',  use: 'Digital signatures', replaces: 'ECDSA, RSA',            basis: 'Lattice — Module Learning with Errors', note: 'Replaces ECDSA for code signing, JWT, and certificate signatures.' },
            { std: 'FIPS 205', algo: 'SLH-DSA', use: 'Backup signatures',  replaces: 'ECDSA (conservative)', basis: 'Hash-based — SPHINCS+',                 note: 'Conservative fallback — relies only on hash function security.' },
          ].map(item => (
            <div key={item.algo} className={`border rounded-xl p-4 transition-all ${selectedAlgos[item.algo] ? 'bg-teal/10 border-teal/40' : 'bg-teal/5 border-teal/20'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-semibold text-teal uppercase tracking-wider">{item.std}</p>
                {selectedAlgos[item.algo] && <span className="text-[9px] font-semibold text-teal flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Selected</span>}
              </div>
              <p className="text-base font-bold text-foreground mb-0.5">{item.algo}</p>
              <p className="text-[10px] text-muted-foreground mb-1">{item.use} · replaces {item.replaces}</p>
              <p className="text-[9px] text-muted-foreground/60 border-t border-teal/10 pt-1.5 mb-2">{item.note}</p>
              <button
                onClick={() => setSelectedAlgos(prev => ({ ...prev, [item.algo]: !prev[item.algo] }))}
                className={`w-full text-[9.5px] font-semibold py-1 rounded transition-colors ${selectedAlgos[item.algo] ? 'bg-teal/20 text-teal hover:bg-teal/30' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
              >
                {selectedAlgos[item.algo] ? 'Remove from plan' : 'Add to migration plan'}
              </button>
            </div>
          ))}
        </div>
        {Object.values(selectedAlgos).some(Boolean) && (
          <div className="mt-3 p-2.5 rounded-lg bg-teal/5 border border-teal/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0" />
            <p className="text-[10px] text-teal font-medium">
              {Object.entries(selectedAlgos).filter(([, v]) => v).map(([k]) => k).join(', ')} confirmed as target algorithms for this migration programme.
            </p>
          </div>
        )}
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
  const [expandedTicket, setExpandedTicket] = React.useState<string | null>(null);

  const buildTicketText = (r: typeof IN_FLIGHT_TABLE[0]) =>
`TITLE: PQC Migration — ${r.asset} — ${r.from} → ${r.to}
TYPE: Change Request
PRIORITY: Critical
ASSIGNEE: ${r.owner}
WAVE: Wave 1 — Q2 2026
DEADLINE: 30 June 2026 (NSA CNSA 2.0 mandate)

DESCRIPTION:
Migrate ${r.asset} from ${r.from} to ${r.to} as part of the organisation's
Post-Quantum Cryptography programme (Wave 1 — Critical HNDL exposure).
Dependent systems: ${r.dependents} downstream services must be validated post-migration.

BLOCKER (must resolve before migration can begin):
${r.blocker}

INTERIM CONTROL (active until migration completes):
${r.compensating}

ACCEPTANCE CRITERIA:
1. ${r.from} replaced with ${r.to} on all endpoints
2. All ${r.dependents} dependent services validated post-migration
3. No TLS handshake failures within 24h of cutover
4. PQC validation scan passed in AVX Trust Platform
5. Migration recorded as Completed in Stage 4`;

  return (
    <div className="space-y-4">

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'In Progress',  value: IN_FLIGHT_TABLE.filter(m => m.status === 'In Progress').length, enterpriseCtx: 'of 660 Wave 1 remaining',   color: 'text-teal',            tip: null },
          { label: 'Blocked',      value: IN_FLIGHT_TABLE.filter(m => m.status === 'Blocked').length,     enterpriseCtx: 'require blocker resolution',  color: 'text-coral',           tip: null },
          { label: 'Completed',    value: IN_FLIGHT_TABLE.filter(m => m.status === 'Completed').length,   enterpriseCtx: `of ${PQC_SAFE} total migrated`, color: 'text-muted-foreground', tip: null },
          { label: 'Hybrid Mode',  value: 3,                                                               enterpriseCtx: 'classical + PQC parallel',    color: 'text-purple-light',    tip: 'Running classical and PQC algorithms simultaneously per ETSI TR 103 619 — zero downtime guaranteed during transition.' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className="relative group/tip">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                {s.label}{s.tip && <Info className="w-3 h-3 cursor-help" />}
              </p>
              {s.tip && (
                <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover/tip:block w-64 bg-card border border-border rounded-lg shadow-xl p-2.5">
                  <p className="text-[10px] text-foreground leading-relaxed">{s.tip}</p>
                </div>
              )}
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{s.enterpriseCtx}</p>
          </div>
        ))}
      </div>

      {/* Wave 1 velocity alert */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-coral/10 border border-coral/20">
        <AlertTriangle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-semibold text-coral">Wave 1 velocity critical — 67% behind April target</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            187 migrated of 564 required by end of April. Wave 1 deadline is 30 June 2026.
            Unblock the 2 blocked migrations immediately — combined they affect {IN_FLIGHT_TABLE.filter(r => r.status === 'Blocked').reduce((s, r) => s + r.dependents, 0)} downstream systems.
          </p>
        </div>
      </div>

      {/* In-flight table */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">In-Flight Migrations — Wave 1</h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
            Showing 8 representative records · {IN_FLIGHT_COUNT.toLocaleString()} total in Wave 1
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
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0"><GitBranch className="w-2.5 h-2.5" />{r.dependents} dependents</span>
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
                      onClick={() => setExpandedTicket(expandedTicket === r.asset ? null : r.asset)}
                      className="text-[9.5px] px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20 whitespace-nowrap"
                    >
                      {expandedTicket === r.asset ? 'Hide ticket ▲' : 'View ticket details ▼'}
                    </button>
                  )}
                  {r.status === 'Completed' && (
                    <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Safe' })} className="text-[9.5px] px-2 py-1 rounded bg-teal/5 text-teal/70 hover:text-teal whitespace-nowrap">
                      Verify PQC →
                    </button>
                  )}
                </div>
              </div>
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
              {r.status === 'Blocked' && expandedTicket === r.asset && (
                <div className="border-t border-border/30 bg-secondary/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-foreground">TrustOps Change Request — Ready to submit</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(buildTicketText(r));
                        toast.success('Ticket details copied', { description: 'Paste into Jira, ServiceNow, or your change management system' });
                      }}
                      className="text-[9.5px] px-2.5 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 font-semibold whitespace-nowrap"
                    >
                      Copy to clipboard →
                    </button>
                  </div>
                  <pre className="text-[9px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono bg-card rounded-lg p-3 border border-border/50 max-h-48 overflow-y-auto">
                    {buildTicketText(r)}
                  </pre>
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
  const currentVelocity  = Math.round(187 / 4);
  const requiredVelocity = 330;
  const pctOfAprilTarget = Math.round((187 / 564) * 100);
  const velocityGap      = requiredVelocity - currentVelocity;
  const completedCount   = IN_FLIGHT_TABLE.filter(m => m.status === 'Completed').length;

  return (
    <div className="space-y-4">

      {/* Velocity KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current velocity</p>
          <p className="text-2xl font-bold text-amber tabular-nums">{currentVelocity}</p>
          <p className="text-[9px] text-muted-foreground">objects/month (Apr avg)</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Required velocity</p>
          <p className="text-2xl font-bold text-coral tabular-nums">{requiredVelocity}</p>
          <p className="text-[9px] text-muted-foreground">objects/month to close Wave 1 by June</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">April target completion</p>
          <p className="text-2xl font-bold text-coral tabular-nums">{pctOfAprilTarget}%</p>
          <p className="text-[9px] text-muted-foreground">187 of 564 required — 67% behind pace</p>
        </div>
      </div>

      {/* Progress chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Wave 1 Progress — Actual vs Required Pace</h3>
          <Countdown />
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Wave 1 target: {IN_FLIGHT_COUNT.toLocaleString()} objects by 30 June 2026.
          Required: ~141 objects/month. Current: {currentVelocity} objects/month — needs {velocityGap} more/month to recover.
          Wave 1 acceleration started March 2026.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MONITOR_PROGRESS} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(225 30% 14%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} formatter={(v: number, n: string) => [`${v} objects`, n]} />
            <Bar dataKey="required" name="Required pace" fill="hsl(38 78% 51%)" opacity={0.35} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual"   name="Migrated"      fill="hsl(162 72% 37%)"              radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 text-[10px] mt-1 mb-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-teal" />Migrated</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber/40" />Required pace</span>
        </div>
        <div className="p-2.5 rounded-lg bg-coral/10 border border-coral/20">
          <p className="text-[10px] text-coral font-semibold">
            Wave 1 requires {requiredVelocity} objects/month in May–June — a {Math.round(requiredVelocity / currentVelocity)}x acceleration from current pace.
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Resolving the 2 blocked migrations (auth + vault) will unblock {IN_FLIGHT_TABLE.filter(r => r.status === 'Blocked').reduce((s, r) => s + r.dependents, 0)} dependent systems and is the highest-leverage action available.
          </p>
        </div>
      </div>

      {/* Validation status — consistent with IN_FLIGHT_TABLE completed rows */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">PQC Validation Status — Completed Migrations</h3>
          <button onClick={() => nav({ tab: 'identities', pqcRisk: 'Safe' })} className="text-[10px] text-teal hover:text-teal/80 flex items-center gap-1">
            View all {PQC_SAFE} PQC-safe objects <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">NIST: validate each migration with an implementation test. Dependency validation confirms all downstream systems function correctly post-migration.</p>
        <div className="space-y-2">
          {[
            { asset: 'cdn.acmecorp.com',          algo: 'ML-KEM', from: 'RSA-2048',  validated: true,  date: '2026-04-18', dependents: 8,  testsPassed: 12 },
            { asset: 'staging-api.acmecorp.com',  algo: 'ML-DSA', from: 'ECC P-256', validated: true,  date: '2026-04-22', dependents: 4,  testsPassed: 8  },
            { asset: 'payments-api.acmecorp.com', algo: 'ML-KEM', from: 'RSA-2048',  validated: false, date: 'Pending migration completion', dependents: 7, testsPassed: 0 },
          ].map(item => (
            <div key={item.asset} className="border border-border/50 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.validated ? 'text-teal' : 'text-muted-foreground/40'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10.5px] text-foreground font-semibold">{item.asset}</span>
                    {item.validated && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-teal/10 text-teal">{item.testsPassed} tests passed</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono text-coral">{item.from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-teal">{item.algo}</span>
                    <span className="text-muted-foreground flex items-center gap-0.5"><GitBranch className="w-2.5 h-2.5" />{item.dependents} dependents validated</span>
                  </div>
                </div>
                <span className={`text-[10px] flex-shrink-0 ${item.validated ? 'text-teal' : 'text-muted-foreground/50'}`}>{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regression monitoring */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">Regression Alerts — Algorithm Rollback Detection</h3>
          <span className="text-[9.5px] text-muted-foreground">Last scan: 2 hours ago · Next: in 4 hours</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">NIST: continuously scan migrated assets for reversion to quantum-vulnerable algorithms. Rollbacks can occur after certificate renewals, software deployments, or infrastructure changes.</p>
        <div className="p-4 rounded-xl bg-teal/5 border border-teal/20 flex items-center gap-3 mb-3">
          <CheckCircle2 className="w-6 h-6 text-teal flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-foreground">No regressions detected across {completedCount} validated assets</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">cdn.acmecorp.com and staging-api.acmecorp.com holding ML-KEM/ML-DSA · 0 rollbacks in last 30 days</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
          <p className="text-[9.5px] text-muted-foreground font-semibold mb-1">Monitored trigger events that could cause regression:</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['Certificate auto-renewal', 'Software/runtime upgrade', 'Load balancer config change', 'CDN cache purge and reissue', 'Kubernetes cert-manager restart', 'Vault seal/unseal cycle'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                <span className="text-[9px] text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
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
      {active === 2 && <StagePlan     onNext={() => setActive(3)} nav={nav} />}
      {active === 3 && <StageMigrate  onNext={() => setActive(4)} nav={nav} />}
      {active === 4 && <StageMonitor  nav={nav} />}

    </div>
  );
}
