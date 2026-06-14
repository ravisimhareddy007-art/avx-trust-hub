import React, { useMemo, useState } from 'react';
import {
  Atom, ArrowRight, Clock, ChevronRight, Info, ExternalLink, Ticket, GitBranch,
} from 'lucide-react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { getRiskClass } from '@/lib/risk/crs';
import { listTickets } from '@/lib/ticketStore';
import TicketDraftModal from '@/components/inventory/TicketDraftModal';
import QuantumExposureGauge from '@/components/dashboards/quantum/QuantumExposureGauge';
import TopHNDLExposure from '@/components/dashboards/quantum/TopHNDLExposure';
import MigrationReadinessStrip from '@/components/dashboards/quantum/MigrationReadinessStrip';
import MigrationPrepBacklog from '@/components/dashboards/quantum/MigrationPrepBacklog';

// ── Stages ────────────────────────────────────────────────────────────────────
// Three coherent stages that match what the platform actually does:
// Discover (know your exposure) → Assess (prioritise the work) → Hand off
// (route prepared work to a migration program). Migration execution is not
// performed in-platform in the MVP — the backlog routes outward.

type StageId = 'discover' | 'assess' | 'handoff';

const STAGES: { id: StageId; label: string; caption: string }[] = [
  { id: 'discover', label: 'Discover', caption: 'Know your exposure' },
  { id: 'assess',   label: 'Assess',   caption: 'Prioritise the work' },
  { id: 'handoff',  label: 'Hand off', caption: 'Route to migration' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isHndlActive(a: CryptoAsset): boolean {
  const sensitive = (a.tags ?? []).some(t => /pci|phi|gdpr|production|edge|wildcard|authentication/i.test(t));
  return a.environment === 'Production' && sensitive;
}

function isVulnerable(a: CryptoAsset): boolean {
  const c = getRiskClass(a);
  return c === 'quantum' || c === 'both';
}

function Countdown() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral/10 border border-coral/25">
      <Clock className="w-3 h-3 text-coral" />
      <span className="text-[10px] font-semibold text-coral">3.6 years to NIST 2030 deadline</span>
    </div>
  );
}

// ── Stage 1: Discover ────────────────────────────────────────────────────────

function StageDiscover({
  assets, nav, onNext,
}: { assets: CryptoAsset[]; nav: (f: Record<string, string>) => void; onNext: () => void }) {
  const total = assets.length;
  const vulnerable = assets.filter(isVulnerable);
  const hndlActive = vulnerable.filter(isHndlActive).length;
  const safe = assets.filter(a => a.pqcRisk === 'Safe' || a.pqcRisk === 'Low').length;

  const algoMap = new Map<string, { count: number; vulnerable: boolean }>();
  assets.forEach(a => {
    const isVuln = /^(RSA|ECC|ECDSA|ECDH|DSA|DH|Ed25519)/i.test(a.algorithm);
    const entry = algoMap.get(a.algorithm) ?? { count: 0, vulnerable: isVuln };
    entry.count++;
    algoMap.set(a.algorithm, entry);
  });
  const algoRows = Array.from(algoMap.entries())
    .map(([algo, v]) => ({ algo, ...v }))
    .sort((a, b) => b.count - a.count);

  const typeMap = new Map<string, number>();
  vulnerable.forEach(a => typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1));
  const typeRows = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const kpis = [
    { label: 'Crypto Objects in Estate', value: total, color: 'text-foreground', sub: 'Sourced from shared Inventory', nav: { tab: 'identities' } },
    { label: 'Quantum-Vulnerable', value: vulnerable.length, color: 'text-coral', sub: `${total ? ((vulnerable.length / total) * 100).toFixed(1) : 0}% of estate · RSA, ECC, DSA, DH`, nav: { tab: 'identities', pqcRisk: 'Critical' } },
    { label: 'HNDL Active Exposure', value: hndlActive, color: 'text-amber', sub: 'Production-facing with sensitive scope', nav: { tab: 'identities', pqcRisk: 'Critical' } },
    { label: 'PQC-Safe Today', value: safe, color: 'text-teal', sub: 'AES, SHA-2/3, ML-KEM, ML-DSA', nav: { tab: 'identities', pqcRisk: 'Safe' } },
  ];

  return (
    <div className="space-y-4">
      {/* Enterprise quantum exposure reading */}
      <div className="grid grid-cols-2 gap-3">
        <QuantumExposureGauge />
        <TopHNDLExposure />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {kpis.map(k => (
          <button key={k.label} onClick={() => nav(k.nav)} className="bg-card rounded-xl border border-border p-4 text-left hover:border-teal/40 transition-all group">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{k.label}</p>
            <p className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value.toLocaleString()}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground flex-1">{k.sub}</p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-teal/5 border border-teal/20">
        <Info className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="text-teal font-semibold">NIST guidance:</span> Symmetric encryption (AES-256) and hashing (SHA-2/3) are quantum-resistant.
          Posture focuses on public-key cryptography — RSA, ECC, DSA, and DH variants.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-3">Algorithm Breakdown</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2 font-medium">Algorithm</th>
                <th className="text-right pb-2 font-medium">Objects</th>
                <th className="text-right pb-2 font-medium">PQC Status</th>
              </tr>
            </thead>
            <tbody>
              {algoRows.map(r => (
                <tr key={r.algo} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => nav({ tab: 'identities', algorithm: r.algo })}>
                  <td className="py-2 font-mono text-foreground">{r.algo}</td>
                  <td className="py-2 text-right tabular-nums text-foreground">{r.count}</td>
                  <td className="py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.vulnerable ? 'bg-coral/15 text-coral' : 'bg-teal/15 text-teal'}`}>
                      {r.vulnerable ? 'Vulnerable' : 'Safe'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-3">Vulnerable by Asset Type</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2 font-medium">Type</th>
                <th className="text-right pb-2 font-medium">Vulnerable Objects</th>
                <th className="text-right pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map(r => (
                <tr key={r.type} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => nav({ tab: 'identities', type: r.type })}>
                  <td className="py-2 text-foreground">{r.type}</td>
                  <td className="py-2 text-right tabular-nums text-foreground">{r.count}</td>
                  <td className="py-2 text-right text-teal text-[10px]">View →</td>
                </tr>
              ))}
              {typeRows.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No vulnerable objects in current inventory</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          Prioritise the work <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 2: Assess & Prioritise ─────────────────────────────────────────────

function StageAssess({
  assets, onNext, onRaiseTicket,
}: {
  assets: CryptoAsset[];
  onNext: () => void;
  onRaiseTicket: (asset: CryptoAsset) => void;
}) {
  const { setCurrentPage } = useNav();
  const vulnerable = useMemo(() => assets.filter(isVulnerable), [assets]);
  const hndlActive = vulnerable.filter(isHndlActive).length;
  const policyViolationCount = vulnerable.reduce((s, r) => s + r.policyViolations, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-coral/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Quantum-Vulnerable</p>
          <p className="text-3xl font-bold text-coral tabular-nums">{vulnerable.length}</p>
          <p className="text-[9.5px] text-muted-foreground mt-0.5">objects requiring migration preparation</p>
        </div>
        <div className="bg-card rounded-xl border border-amber/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">HNDL Active</p>
          <p className="text-3xl font-bold text-amber tabular-nums">{hndlActive}</p>
          <p className="text-[9.5px] text-muted-foreground mt-0.5">production assets at harvest risk today</p>
        </div>
        <button
          onClick={() => setCurrentPage('policy-builder')}
          className="bg-card rounded-xl border border-purple/20 p-4 text-left hover:border-purple-light/40 transition-colors group"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Quantum-Safe Policy Violations</p>
          <p className="text-3xl font-bold text-purple-light tabular-nums">{policyViolationCount}</p>
          <p className="text-[9.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
            View policy in Policy Builder <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
      </div>

      {/* Programme context: where the vulnerable estate sits in the pipeline */}
      <MigrationReadinessStrip />

      {/* Canonical prioritisation + handoff surface */}
      <MigrationPrepBacklog onRaiseTicket={onRaiseTicket} />

      <div className="flex items-center justify-end">
        <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple/15 text-purple-light border border-purple/30 hover:bg-purple/25 text-sm font-semibold transition-colors">
          Hand off to migration <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 3: Hand off ────────────────────────────────────────────────────────

function StageHandoff({ assets, onBack }: { assets: CryptoAsset[]; onBack: () => void }) {
  const { setCurrentPage } = useNav();
  const vulnerable = assets.filter(isVulnerable).length;
  const pqcTickets = listTickets().filter(t => /pqc|quantum/i.test(`${t.summary} ${t.module ?? ''}`)).length;

  const routes = [
    { icon: Ticket,    title: 'ServiceNow (available now)',           body: 'Prepared objects are raised as scoped change requests in ServiceNow, where your migration program owns scheduling and execution.', active: true  },
    { icon: GitBranch, title: 'Migration-tool integration (roadmap)', body: 'Hand the prioritised backlog to a dedicated PQC migration tool through an integration, keeping the platform as the system of record for inventory and risk.', active: false },
    { icon: Atom,      title: 'In-platform migration (future option)', body: 'A future release may execute migration in-platform. The backlog and risk model are built to feed that path without rework.', active: false },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Prepared for migration</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{vulnerable.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">quantum-vulnerable objects, prioritised in the backlog</p>
        </div>
        <button
          onClick={() => setCurrentPage('tickets')}
          className="bg-card rounded-xl border border-border p-5 text-left hover:border-teal/40 transition-colors group"
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Handed off to ServiceNow</p>
          <p className="text-3xl font-bold text-teal tabular-nums">{pqcTickets}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            View in Tickets <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">How migration is handled</h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The platform discovers, scores, and prioritises quantum-vulnerable cryptography, then hands prepared work to a migration process.
          Migration execution is not performed in-platform in the MVP. The backlog routes outward so the migration path stays open.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {routes.map(r => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className={`rounded-lg border p-4 space-y-2 ${r.active ? 'border-teal/30 bg-teal/5' : 'border-border bg-secondary/20 opacity-80'}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${r.active ? 'text-teal' : 'text-muted-foreground'}`} />
                  <span className="text-[11px] font-semibold text-foreground">{r.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{r.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to prioritisation
        </button>
        <button
          onClick={() => setCurrentPage('tickets')}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground hover:bg-teal/90 text-sm font-semibold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open migration tickets
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function QuantumPosturePage() {
  const [active, setActive] = useState<StageId>('discover');
  const [modalAsset, setModalAsset] = useState<CryptoAsset | null>(null);
  const { setCurrentPage, setFilters } = useNav();

  const nav = (f: Record<string, string>) => {
    setFilters(f);
    setCurrentPage('inventory');
  };

  const assets = mockAssets;
  const vulnerableCount = assets.filter(isVulnerable).length;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-5 h-5 text-purple-light" />
            <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {vulnerableCount.toLocaleString()} quantum-vulnerable objects across {assets.length.toLocaleString()} crypto objects ·
            Sourced from shared Inventory · NIST FIPS 203/204/205 aligned
          </p>
        </div>
        <Countdown />
      </div>

      <div className="flex border border-border rounded-xl overflow-hidden bg-card">
        {STAGES.map((s, i) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex-1 py-3 border-r border-border last:border-0 transition-colors ${
                isActive ? 'bg-purple/15 text-purple-light' : 'text-muted-foreground hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-semibold">Stage {i + 1}: {s.label}</span>
              </div>
              <p className="text-[9.5px] text-muted-foreground">{s.caption}</p>
            </button>
          );
        })}
      </div>

      {active === 'discover' && <StageDiscover assets={assets} nav={nav} onNext={() => setActive('assess')} />}
      {active === 'assess'   && <StageAssess   assets={assets} onNext={() => setActive('handoff')} onRaiseTicket={setModalAsset} />}
      {active === 'handoff'  && <StageHandoff  assets={assets} onBack={() => setActive('assess')} />}

      {modalAsset && (
        <TicketDraftModal
          asset={modalAsset}
          action="pqc"
          destination="servicenow"
          defaultAssignmentGroup="PKI & Cryptography Team"
          onClose={() => setModalAsset(null)}
          onConfirm={() => { /* TicketDraftModal persists and toasts internally */ }}
        />
      )}
    </div>
  );
}
