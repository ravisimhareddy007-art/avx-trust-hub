import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { toast } from 'sonner';
import {
  Atom, Download, ArrowRight, Clock, ChevronRight, CheckCircle2,
} from 'lucide-react';

// ── Authoritative PQC numbers ─────────────────────────────────────────────────

const TOTAL_VULNERABLE = 12660;
const HNDL_ACTIVE      = 3842;
const TOTAL_OBJECTS    = 44698;
const PQC_SAFE         = 187;
const IN_FLIGHT_COUNT  = 847;

// ── Static data ───────────────────────────────────────────────────────────────

const ALGO_DATA = [
  { algo: 'RSA-2048',  count: 8420, vulnerable: true  },
  { algo: 'RSA-4096',  count: 2100, vulnerable: true  },
  { algo: 'ECC P-256', count: 1800, vulnerable: true  },
  { algo: 'ECC P-384', count: 340,  vulnerable: true  },
  { algo: 'AES-256',   count: 4200, vulnerable: false },
  { algo: 'ML-KEM',    count: 187,  vulnerable: false },
];

const HNDL_LIST = [
  { name: 'payments-api.acmecorp.com',    algo: 'RSA-2048',  detail: 'Internet-facing · 47,000 financial tx/day · PHI adjacent', risk: 'CRITICAL' as const },
  { name: 'auth.acmecorp.com',            algo: 'ECC P-256', detail: 'Internet-facing · SSO for 12,400 users · PII in tokens',   risk: 'CRITICAL' as const },
  { name: 'prod-gateway-01.acmecorp.com', algo: 'RSA-2048',  detail: 'Internet-facing · All API traffic · Edge Gateway',          risk: 'CRITICAL' as const },
  { name: 'vault.internal.acmecorp.com',  algo: 'RSA-2048',  detail: 'Internal · 68% of production secrets · PHI data',          risk: 'HIGH'     as const },
  { name: 'eks-prod-cluster',             algo: 'ECC P-256', detail: 'Internal · 847 workload certs · Payments + Platform BUs',  risk: 'HIGH'     as const },
];

const HEATMAP_BUS   = ['Payments', 'Platform', 'Infrastructure', 'AI Eng', 'Security'];
const HEATMAP_TYPES = ['TLS', 'SSH', 'Secrets', 'K8s', 'AI Tokens'];
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
const HEATMAP: Record<string, RiskLevel> = {
  'Payments-TLS': 'critical', 'Payments-SSH': 'high',   'Payments-Secrets': 'critical', 'Payments-K8s': 'high',   'Payments-AI Tokens': 'medium',
  'Platform-TLS': 'high',     'Platform-SSH': 'high',    'Platform-Secrets': 'high',     'Platform-K8s': 'high',   'Platform-AI Tokens': 'medium',
  'Infrastructure-TLS': 'high','Infrastructure-SSH': 'critical','Infrastructure-Secrets': 'medium','Infrastructure-K8s': 'medium','Infrastructure-AI Tokens': 'low',
  'AI Eng-TLS': 'medium',     'AI Eng-SSH': 'medium',    'AI Eng-Secrets': 'high',       'AI Eng-K8s': 'medium',   'AI Eng-AI Tokens': 'critical',
  'Security-TLS': 'medium',   'Security-SSH': 'high',    'Security-Secrets': 'high',     'Security-K8s': 'low',    'Security-AI Tokens': 'low',
};
const CELL_BG: Record<RiskLevel, string> = {
  critical: 'bg-coral text-white',
  high:     'bg-amber/80 text-white',
  medium:   'bg-purple/60 text-white',
  low:      'bg-teal/30 text-foreground',
};

const AGILITY = [
  { cat: 'API Gateways',  score: 34, note: 'Hardcoded cert configs — swap requires full redeploy' },
  { cat: 'App Servers',   score: 52, note: 'Mixed — modern servers agile, legacy batch servers are not' },
  { cat: 'K8s Clusters',  score: 78, note: 'cert-manager enables fast algorithm swap per namespace' },
  { cat: 'Vault Servers', score: 61, note: 'Vault 1.14+ supports PQC — upgrade path exists' },
  { cat: 'AI Platforms',  score: 29, note: 'Agent tokens hardcoded in model configs — highest swap cost' },
];

const COMPLEXITY = [
  { from: 'RSA-2048',  to: 'ML-KEM', objects: 8420, cx: 'High',   blocker: 'Legacy HSM firmware, third-party vendor support' },
  { from: 'ECC P-256', to: 'ML-DSA', objects: 1800, cx: 'High',   blocker: 'Code-signing chain dependencies, CA integration' },
  { from: 'RSA-4096',  to: 'ML-KEM', objects: 2100, cx: 'Medium', blocker: 'Fewer legacy integrations but key size change' },
  { from: 'ECC P-384', to: 'ML-DSA', objects: 340,  cx: 'Low',    blocker: 'Mostly K8s workloads — cert-manager handles swap' },
];

const WAVES = [
  { n: 1, label: 'Wave 1 — Critical HNDL',  period: 'Q2 2026',    objs: 847,  status: 'In Progress', mandate: 'NSA CNSA 2.0 (2025)',         desc: 'Internet-facing assets with active HNDL exposure and financial/PII data', tc: 'text-coral',        bc: 'bg-coral'   },
  { n: 2, label: 'Wave 2 — High Priority',  period: 'Q3–Q4 2026', objs: 3218, status: 'Planned',     mandate: 'NSA CNSA 2.0 (2027 systems)', desc: 'Production assets not HNDL-active but carrying sensitive data',           tc: 'text-amber',        bc: 'bg-amber'   },
  { n: 3, label: 'Wave 3 — Background',     period: '2027+',      objs: 8595, status: 'Not Started', mandate: 'NIST 2030 all systems',        desc: 'Remaining estate — non-production, low-sensitivity, internal only',        tc: 'text-purple-light', bc: 'bg-purple'  },
];

const IN_FLIGHT_TABLE = [
  { asset: 'payments-api.acmecorp.com',    from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'Payments Eng',   days: 14,   blocker: null },
  { asset: 'prod-gateway-01.acmecorp.com', from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'Infrastructure', days: 7,    blocker: null },
  { asset: 'eks-prod-cluster',             from: 'ECC P-256', to: 'ML-DSA', status: 'In Progress', owner: 'Platform Eng',   days: 21,   blocker: null },
  { asset: 'auth.acmecorp.com',            from: 'ECC P-256', to: 'ML-DSA', status: 'Blocked',     owner: 'Security Ops',  days: null, blocker: 'HSM firmware upgrade required — Thales Luna 7.4' },
  { asset: 'vault.internal.acmecorp.com',  from: 'RSA-2048',  to: 'ML-KEM', status: 'Blocked',     owner: 'Security Eng',  days: null, blocker: 'Vault upgrade to 1.14 blocked by Q2 change freeze' },
  { asset: 'mail.acmecorp.com',            from: 'RSA-2048',  to: 'ML-KEM', status: 'In Progress', owner: 'IT Operations',  days: 30,   blocker: null },
  { asset: 'staging-api.acmecorp.com',     from: 'ECC P-256', to: 'ML-DSA', status: 'Completed',   owner: 'Platform Eng',  days: null, blocker: null },
  { asset: 'cdn.acmecorp.com',             from: 'RSA-2048',  to: 'ML-KEM', status: 'Completed',   owner: 'Infrastructure', days: null, blocker: null },
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
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-coral/15 text-coral border border-coral/25 cursor-help">
        HNDL
      </span>
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block w-64 bg-card border border-border rounded-lg shadow-xl p-3">
        <p className="text-[10px] font-semibold text-foreground mb-1">Harvest Now Decrypt Later</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Adversaries are capturing your encrypted traffic TODAY and storing it. When quantum computers arrive they
          will decrypt it retroactively. Your sensitive data is at risk RIGHT NOW — not in 2030.
        </p>
      </div>
    </div>
  );
}

// ── Stage 1: Discover ─────────────────────────────────────────────────────────

function StageDiscover({ onNext, nav }: { onNext: () => void; nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">
      {/* CBOM KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Quantum-Vulnerable Objects', value: TOTAL_VULNERABLE.toLocaleString(), color: 'text-coral', sub: `${((TOTAL_VULNERABLE / TOTAL_OBJECTS) * 100).toFixed(1)}% of estate — RSA, ECC, DSA, DH` },
          { label: 'HNDL Active Exposure',       value: HNDL_ACTIVE.toLocaleString(),      color: 'text-coral', sub: 'Internet-facing + long-lived sensitive data' },
          { label: 'PQC-Safe Today',             value: PQC_SAFE.toLocaleString(),          color: 'text-teal',  sub: 'ML-KEM only · 1.5% of vulnerable estate migrated' },
        ].map(k => (
          <button
            key={k.label}
            onClick={() => {
              if (k.label === 'Quantum-Vulnerable Objects') nav({ tab: 'identities', pqcRisk: 'Critical' });
              else if (k.label === 'HNDL Active Exposure') nav({ tab: 'identities', pqcRisk: 'Critical' });
              else if (k.label === 'PQC-Safe Today') nav({ tab: 'identities', pqcRisk: 'Safe' });
            }}
            className="bg-card rounded-xl border border-border p-4 text-left hover:border-teal/40 hover:bg-card/80 transition-all group"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{k.sub}</p>
            <div className="flex justify-end mt-2">
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Algorithm Breakdown bar chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Algorithm Breakdown — Cryptographic Estate</h3>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-coral inline-block" />
              Quantum-vulnerable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal inline-block" />
              Quantum-safe
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ALGO_DATA} barCategoryGap="30%">
            <XAxis dataKey="algo" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(225 30% 14%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: 'hsl(220 20% 90%)' }}
            />
            <Bar
              dataKey="count"
              name="Objects"
              radius={[4, 4, 0, 0]}
              onClick={(data: any) => nav({ tab: 'identities', algorithm: data.algo })}
              style={{ cursor: 'pointer' }}
            >
              {ALGO_DATA.map((d, i) => (
                <Cell key={i} fill={d.vulnerable ? 'hsl(16 72% 51%)' : 'hsl(162 72% 37%)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[9.5px] text-muted-foreground mt-2 text-center">Click any bar to view those objects in Inventory</p>
      </div>

      {/* PQC Risk Heatmap */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">PQC Risk Heatmap — Business Unit × Asset Type</h3>
          <button
            onClick={() => nav({ tab: 'identities', pqcRisk: 'Critical' })}
            className="text-[10px] text-teal hover:text-teal/80 flex items-center gap-1"
          >
            View all Critical <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left pb-2 text-muted-foreground font-medium w-32" />
              {HEATMAP_TYPES.map(t => (
                <th key={t} className="pb-2 text-center text-muted-foreground font-medium px-1">{t}</th>
              ))}
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
                        onClick={() => nav({ tab: 'identities', pqcRisk: risk === 'critical' ? 'Critical' : risk === 'high' ? 'High' : 'Medium' })}
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
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold">Top HNDL Exposure — Highest Priority Assets</h3>
          <HndlBadge />
        </div>
        <div className="space-y-2">
          {HNDL_LIST.map((item, i) => (
            <div key={item.name} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group">
              <span className="text-[11px] font-bold text-muted-foreground w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold font-mono text-foreground truncate">{item.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 border ${item.risk === 'CRITICAL' ? 'bg-coral/15 text-coral border-coral/30' : 'bg-amber/15 text-amber border-amber/30'}`}>
                    {item.risk}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.algo} · {item.detail}</p>
              </div>
              <button
                onClick={() => nav({ tab: 'identities', pqcRisk: 'Critical' })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-teal flex items-center gap-1 flex-shrink-0"
              >
                View <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => toast.success('CBOM export queued', { description: 'cryptographic-bill-of-materials.json ready in ~30s' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CBOM
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors"
        >
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
      {/* Crypto Agility */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">Crypto Agility Score — By Infrastructure Category</h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          % of assets that can swap cryptographic algorithm without service disruption
        </p>
        <div className="space-y-4">
          {AGILITY.map(item => (
            <div key={item.cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-foreground">{item.cat}</span>
                <span className={`text-sm font-bold tabular-nums ${item.score < 40 ? 'text-coral' : item.score < 65 ? 'text-amber' : 'text-teal'}`}>
                  {item.score}% agile
                </span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full ${item.score < 40 ? 'bg-coral' : item.score < 65 ? 'bg-amber' : 'bg-teal'}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <p className="text-[9.5px] text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Migration complexity table */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">Algorithm Migration Complexity</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left pb-2 font-medium">Current Algorithm</th>
              <th className="text-left pb-2 font-medium">Target (NIST)</th>
              <th className="text-right pb-2 font-medium">Objects</th>
              <th className="text-center pb-2 font-medium">Complexity</th>
              <th className="text-left pb-2 font-medium pl-4">Primary Blocker</th>
            </tr>
          </thead>
          <tbody>
            {COMPLEXITY.map(r => (
              <tr
                key={r.from}
                className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer group"
                onClick={() => nav({ tab: 'identities', algorithm: r.from })}
              >
                <td className="py-2.5 font-mono text-coral">{r.from}</td>
                <td className="py-2.5 font-mono text-teal">{r.to}</td>
                <td className="py-2.5 text-right tabular-nums font-semibold">{r.objects.toLocaleString()}</td>
                <td className="py-2.5 text-center">
                  <span className={`text-[10px] font-bold ${CX_COLOR[r.cx]}`}>{r.cx}</span>
                </td>
                <td className="py-2.5 text-muted-foreground pl-4 text-[10.5px]">{r.blocker}</td>
                <td className="py-2.5 text-right pr-1">
                  <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HNDL Risk Matrix */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold">HNDL Risk Matrix</h3>
          <HndlBadge />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div />
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Low Data Sensitivity</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">High Data Sensitivity</div>
          <div className="text-[10px] font-semibold text-muted-foreground text-right pr-3 self-center">Active Harvest Risk</div>
          <div className="bg-amber/10 border border-amber/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber tabular-nums">2,000</p>
            <p className="text-[9px] text-muted-foreground mt-1">High — migrate Q3 2026</p>
          </div>
          <div className="bg-coral/10 border border-coral/30 rounded-xl p-4">
            <p className="text-2xl font-bold text-coral tabular-nums">1,842</p>
            <p className="text-[9px] text-muted-foreground mt-1">Critical — migrate NOW</p>
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground text-right pr-3 self-center">Passive Risk</div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-2xl font-bold text-muted-foreground tabular-nums">5,618</p>
            <p className="text-[9px] text-muted-foreground mt-1">Medium — Wave 3 (2027)</p>
          </div>
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber tabular-nums">3,200</p>
            <p className="text-[9px] text-muted-foreground mt-1">High — migrate 2027</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors"
        >
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
          <div style={{ width: `${((PQC_SAFE / TOTAL_VULNERABLE) * 100).toFixed(1)}%` }} className="bg-teal" />
          <div style={{ width: `${((IN_FLIGHT_COUNT / TOTAL_VULNERABLE) * 100).toFixed(1)}%` }} className="bg-purple" />
          <div className="flex-1 bg-coral/25" />
        </div>
        <div className="flex items-center gap-4 text-[10px] mb-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-teal" />187 migrated</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-purple" />847 in-flight</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-coral/40" />11,626 remaining</span>
        </div>
        <div className="p-3 rounded-lg bg-coral/10 border border-coral/20">
          <p className="text-[11px] font-semibold text-coral">
            At current pace — migration completes 2031, 1 year past the NIST deadline.
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Wave 2 must begin no later than Q3 2026 to meet the 2030 mandate.
          </p>
        </div>
      </div>

      {/* Migration waves */}
      <div className="space-y-3">
        {WAVES.map(w => (
          <div key={w.n} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${w.bc}/20`}>
                  <span className={`text-base font-bold ${w.tc}`}>{w.n}</span>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-foreground">{w.label}</h4>
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
                <span className="text-[10px] text-muted-foreground">
                  Period: <span className="text-foreground font-medium">{w.period}</span>
                </span>
                <span className={`text-[9.5px] px-1.5 py-0.5 rounded ${ST_STYLE[w.status]}`}>{w.status}</span>
              </div>
              <span className="text-[9.5px] text-muted-foreground">
                Satisfies: <span className="text-teal font-medium">{w.mandate}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Target algorithms */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-3">Target Algorithm Selection — NIST FIPS Standards</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { std: 'FIPS 203', algo: 'ML-KEM',  use: 'Key encapsulation',  note: 'Replaces RSA and DH for key exchange. Lattice-based, optimized for performance.' },
            { std: 'FIPS 204', algo: 'ML-DSA',  use: 'Digital signatures', note: 'Replaces ECDSA and RSA for signing. Efficient and scalable.' },
            { std: 'FIPS 205', algo: 'SLH-DSA', use: 'Backup signatures',  note: 'Hash-based alternative. Conservative security approach — slower but robust.' },
          ].map(item => (
            <div key={item.algo} className="bg-teal/5 border border-teal/20 rounded-xl p-4">
              <p className="text-[9px] font-semibold text-teal uppercase tracking-wider mb-1">{item.std}</p>
              <p className="text-base font-bold text-foreground mb-0.5">{item.algo}</p>
              <p className="text-[10px] text-muted-foreground">{item.use}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-1.5">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors"
        >
          View In-Flight Migrations <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 4: Migrate ──────────────────────────────────────────────────────────

function StageMigrate({ onNext, navTicket, nav }: { onNext: () => void; navTicket: (asset: string) => void; nav: (f: Record<string, string>) => void }) {
  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'In Progress',       value: IN_FLIGHT_TABLE.filter(m => m.status === 'In Progress').length, color: 'text-teal'           },
          { label: 'Blocked',           value: IN_FLIGHT_TABLE.filter(m => m.status === 'Blocked').length,     color: 'text-coral'          },
          { label: 'Completed',         value: IN_FLIGHT_TABLE.filter(m => m.status === 'Completed').length,   color: 'text-muted-foreground'},
          { label: 'Hybrid Mode Active',value: 3,                                                               color: 'text-purple-light'   },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className="relative group/tip">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 cursor-help underline decoration-dotted">{s.label}</p>
              {s.label === 'Hybrid Mode Active' && (
                <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover/tip:block w-56 bg-card border border-border rounded-lg shadow-xl p-2.5">
                  <p className="text-[10px] text-foreground leading-relaxed">Running classical + PQC algorithms simultaneously during transition — per ETSI TR 103 619. Ensures zero downtime during migration.</p>
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
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left pb-2 font-medium">Asset</th>
              <th className="text-left pb-2 font-medium">From</th>
              <th className="text-left pb-2 font-medium">To</th>
              <th className="text-center pb-2 font-medium">Status</th>
              <th className="text-left pb-2 font-medium">Owner</th>
              <th className="text-left pb-2 font-medium">Blocker / ETA</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {IN_FLIGHT_TABLE.map(r => (
              <tr key={r.asset} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 font-mono text-[10.5px] text-foreground max-w-[170px] truncate">{r.asset}</td>
                <td className="py-2.5 font-mono text-[10px] text-coral">{r.from}</td>
                <td className="py-2.5 font-mono text-[10px] text-teal">{r.to}</td>
                <td className="py-2.5 text-center">
                  <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${ST_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-2.5 text-[10px] text-muted-foreground">{r.owner}</td>
                <td className="py-2.5 text-[10px] max-w-[200px]">
                  {r.blocker ? (
                    <span className="text-coral">{r.blocker}</span>
                  ) : r.days ? (
                    <span className="text-muted-foreground">{r.days}d remaining</span>
                  ) : (
                    <span className="text-teal flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  {r.status === 'Blocked' && (
                    <button
                      onClick={() => toast.success('TrustOps ticket created', {
                        description: `PQC Migration — ${r.asset} — ${r.from} → ${r.to} · Priority: Critical · Assigned to ${r.owner}`,
                      })}
                      className="text-[9.5px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 whitespace-nowrap"
                    >
                      Create Ticket
                    </button>
                  )}
                  {r.status === 'In Progress' && (
                    <button
                      onClick={() => nav({ tab: 'identities', algorithm: r.from })}
                      className="text-[9.5px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 whitespace-nowrap"
                    >
                      View in Inventory →
                    </button>
                  )}
                  {r.status === 'Completed' && (
                    <button
                      onClick={() => nav({ tab: 'identities', pqcRisk: 'Safe' })}
                      className="text-[9.5px] px-2 py-1 rounded bg-teal/5 text-teal/60 hover:text-teal whitespace-nowrap"
                    >
                      Verify →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors"
        >
          View Migration Monitor <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 5: Monitor ──────────────────────────────────────────────────────────

function StageMonitor() {
  return (
    <div className="space-y-4">
      {/* Progress bar chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">Cumulative Migrations — Actual vs Required Pace</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Wave 1 started March 2026 — acceleration reflects first production migrations going live</p>
          </div>
          <Countdown />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MONITOR_PROGRESS} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'hsl(225 30% 14%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }}
            />
            <Bar dataKey="required" name="Required pace" fill="hsl(38 78% 51%)" opacity={0.35} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual"   name="Migrated"      fill="hsl(162 72% 37%)"              radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 text-[10px] mt-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-teal" />Migrated</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber/40" />Required pace</span>
        </div>
      </div>

      {/* Validation status */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-3">PQC Validation Status — Migrated Assets</h3>
        <div className="space-y-2">
          {[
            { asset: 'staging-api.acmecorp.com', algo: 'ML-KEM', validated: true,  date: '2026-04-22' },
            { asset: 'cdn.acmecorp.com',          algo: 'ML-KEM', validated: true,  date: '2026-04-18' },
            { asset: 'payments-api.acmecorp.com', algo: 'ML-KEM', validated: false, date: 'In Progress' },
          ].map(item => (
            <div key={item.asset} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.validated ? 'text-teal' : 'text-amber'}`} />
              <span className="font-mono text-[10.5px] text-foreground flex-1">{item.asset}</span>
              <span className="text-[10px] font-medium text-teal">{item.algo}</span>
              <span className={`text-[10px] ${item.validated ? 'text-teal' : 'text-amber'}`}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regression alerts */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-3">Regression Alerts — Algorithm Rollbacks</h3>
        <div className="p-5 rounded-xl bg-teal/5 border border-teal/20 text-center">
          <CheckCircle2 className="w-7 h-7 text-teal mx-auto mb-2" />
          <p className="text-[12px] font-semibold text-foreground">No regressions detected</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            All migrated assets holding PQC algorithms · Last scan: 2 hours ago
          </p>
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

  const nav       = (f: Record<string, string>) => { setFilters(f); setCurrentPage('inventory'); };
  const navTicket = (asset: string)             => { setFilters({ pqcMigration: asset }); setCurrentPage('tickets'); };

  return (
    <div className="space-y-4 pb-10">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-5 h-5 text-purple-light" />
            <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {TOTAL_VULNERABLE.toLocaleString()} quantum-vulnerable objects · {TOTAL_OBJECTS.toLocaleString()} total in estate · 2026 is the Year of Quantum Security
          </p>
        </div>
        <Countdown />
      </div>

      {/* Stage tabs */}
      <div className="flex border border-border rounded-xl overflow-hidden bg-card">
        {STAGES_CONFIG.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            className={`flex-1 py-3 border-r border-border last:border-0 transition-colors ${
              active === i ? 'bg-purple/15 text-purple-light' : 'text-muted-foreground hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${DOT_STYLE[s.status]}`} />
              <span className="text-[11px] font-semibold">Stage {i + 1}: {s.label}</span>
            </div>
            <p className="text-[9.5px] text-muted-foreground">{s.status}</p>
          </button>
        ))}
      </div>

      {/* Stage content */}
      {active === 0 && <StageDiscover onNext={() => setActive(1)} nav={nav} />}
      {active === 1 && <StageAssess   onNext={() => setActive(2)} nav={nav} />}
      {active === 2 && <StagePlan     onNext={() => setActive(3)} />}
      {active === 3 && <StageMigrate  onNext={() => setActive(4)} navTicket={navTicket} nav={nav} />}}
      {active === 4 && <StageMonitor />}

    </div>
  );
}
