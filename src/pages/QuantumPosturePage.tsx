import React, { useMemo, useState } from 'react';
import {
  Atom, ArrowRight, Clock, ChevronRight, Info, Lock, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { computeCRS, getRiskClass } from '@/lib/risk/crs';
import { severityFor } from '@/lib/risk/types';
import TicketDraftModal, { generateTicketDraft } from '@/components/inventory/TicketDraftModal';
import { addTicket, mockIncidentNumber } from '@/lib/ticketStore';
import MigrationReadinessStrip from '@/components/dashboards/quantum/MigrationReadinessStrip';
import MigrationPrepBacklog from '@/components/dashboards/quantum/MigrationPrepBacklog';

// ── Stages ────────────────────────────────────────────────────────────────────

type StageId = 'discover' | 'assess' | 'plan' | 'migrate' | 'monitor';

const STAGES: { id: StageId; label: string; locked: boolean }[] = [
  { id: 'discover', label: 'Discover', locked: false },
  { id: 'assess',   label: 'Assess',   locked: false },
  { id: 'plan',     label: 'Plan',     locked: true  },
  { id: 'migrate',  label: 'Migrate',  locked: true  },
  { id: 'monitor',  label: 'Monitor',  locked: true  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isHndlActive(a: CryptoAsset): boolean {
  // Production-exposed, sensitive scope, long exposure window.
  const sensitive = (a.tags ?? []).some(t => /pci|phi|gdpr|production|edge|wildcard|authentication/i.test(t));
  return a.environment === 'Production' && sensitive;
}

function priorityBadge(p: string) {
  return p === 'Critical' ? 'bg-coral/15 text-coral border-coral/30'
    : p === 'High'        ? 'bg-amber/15 text-amber border-amber/30'
    : p === 'Medium'      ? 'bg-purple/15 text-purple-light border-purple/30'
                          : 'bg-secondary text-muted-foreground border-border';
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

function StageDiscover({ assets, nav, onNext }: { assets: CryptoAsset[]; nav: (f: Record<string, string>) => void; onNext: () => void }) {
  const total = assets.length;
  const vulnerable = assets.filter(a => {
    const c = getRiskClass(a);
    return c === 'quantum' || c === 'both';
  });
  const hndlActive = vulnerable.filter(isHndlActive).length;
  const safe = assets.filter(a => a.pqcRisk === 'Safe' || a.pqcRisk === 'Low').length;

  // Algorithm breakdown (top algos)
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

  // Vulnerable by asset type
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
          Begin Assessment <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Stage 2: Assess ─────────────────────────────────────────────────────────

interface RankedRow {
  asset: CryptoAsset;
  crs: number;
  hndl: boolean;
}

function StageAssess({ assets, nav }: { assets: CryptoAsset[]; nav: (f: Record<string, string>) => void }) {
  const { setCurrentPage } = useNav();

  const ranked: RankedRow[] = useMemo(() => {
    return assets
      .filter(a => {
        const c = getRiskClass(a);
        return c === 'quantum' || c === 'both';
      })
      .map(a => ({ asset: a, crs: computeCRS(a).crs, hndl: isHndlActive(a) }))
      .sort((x, y) => {
        if (x.hndl !== y.hndl) return x.hndl ? -1 : 1;
        return y.crs - x.crs;
      });
  }, [assets]);

  const policyViolationCount = ranked.reduce((s, r) => s + r.asset.policyViolations, 0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalAsset, setModalAsset] = useState<CryptoAsset | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === ranked.length) setSelected(new Set());
    else setSelected(new Set(ranked.map(r => r.asset.id)));
  };

  const bulkCreate = () => {
    if (selected.size === 0) return;
    const targets = ranked.filter(r => selected.has(r.asset.id));
    const incidents: string[] = [];
    targets.forEach(r => {
      const draft = generateTicketDraft(r.asset, 'pqc');
      const inc = mockIncidentNumber();
      addTicket(draft, { destination: 'servicenow', externalId: inc, reporter: 'Quantum Readiness' });
      incidents.push(inc);
    });
    toast.success(`${incidents.length} ServiceNow incidents created`, {
      description: incidents.slice(0, 3).join(', ') + (incidents.length > 3 ? `, +${incidents.length - 3} more` : ''),
    });
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-coral/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Prioritized Queue</p>
          <p className="text-3xl font-bold text-coral tabular-nums">{ranked.length}</p>
          <p className="text-[9.5px] text-muted-foreground mt-0.5">quantum-vulnerable objects ranked by CRS + HNDL</p>
        </div>
        <div className="bg-card rounded-xl border border-amber/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">HNDL Active</p>
          <p className="text-3xl font-bold text-amber tabular-nums">{ranked.filter(r => r.hndl).length}</p>
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Prioritized Assessment Queue</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sorted by HNDL exposure, then Crypto Risk Score (CRS).</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{selected.size} selected</span>
            <button
              onClick={bulkCreate}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal text-primary-foreground text-[11px] font-semibold hover:bg-teal/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Create ServiceNow tickets
            </button>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-secondary/40">
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 px-3 w-8">
                <input type="checkbox" checked={selected.size === ranked.length && ranked.length > 0} onChange={toggleAll} />
              </th>
              <th className="text-left py-2 px-3 font-medium">Object</th>
              <th className="text-left py-2 px-3 font-medium">Algorithm</th>
              <th className="text-left py-2 px-3 font-medium">Env</th>
              <th className="text-left py-2 px-3 font-medium">Owner</th>
              <th className="text-right py-2 px-3 font-medium">CRS</th>
              <th className="text-left py-2 px-3 font-medium">HNDL</th>
              <th className="text-right py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(r => {
              const sev = severityFor(r.crs);
              return (
                <tr key={r.asset.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={selected.has(r.asset.id)} onChange={() => toggle(r.asset.id)} />
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => nav({ tab: 'identities', assetId: r.asset.id })}
                      className="font-mono text-[11px] text-foreground hover:text-teal text-left truncate max-w-[260px] block"
                      title={r.asset.name}
                    >
                      {r.asset.name}
                    </button>
                    <p className="text-[9.5px] text-muted-foreground">{r.asset.type}</p>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-coral">{r.asset.algorithm}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.asset.environment === 'Production' ? 'bg-coral/15 text-coral' : 'bg-secondary text-muted-foreground'}`}>
                      {r.asset.environment}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{r.asset.owner}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityBadge(sev)} tabular-nums`}>{r.crs}</span>
                  </td>
                  <td className="py-2 px-3">
                    {r.hndl
                      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber/15 text-amber border border-amber/30">Active</span>
                      : <span className="text-muted-foreground/60 text-[10px]">Passive</span>}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => setModalAsset(r.asset)}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-teal/15 text-teal hover:bg-teal/25 transition-colors inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> ServiceNow
                    </button>
                  </td>
                </tr>
              );
            })}
            {ranked.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No quantum-vulnerable objects found in current inventory.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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

// ── Locked roadmap stage ─────────────────────────────────────────────────────

function StageLocked({ label }: { label: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-10 text-center space-y-3">
      <Lock className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
      <div>
        <h3 className="text-sm font-semibold text-foreground">{label} · Post-MVP</h3>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-md mx-auto">
          Migration planning, execution tracking, and continuous validation are part of the post-MVP roadmap.
          MVP focuses on discovery and assessment with handoff to ServiceNow.
        </p>
      </div>
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
        Roadmap
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function QuantumPosturePage() {
  const [active, setActive] = useState<StageId>('discover');
  const { setCurrentPage, setFilters } = useNav();

  const nav = (f: Record<string, string>) => {
    setFilters(f);
    setCurrentPage('inventory');
  };

  const assets = mockAssets;
  const vulnerableCount = assets.filter(a => {
    const c = getRiskClass(a);
    return c === 'quantum' || c === 'both';
  }).length;

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
              onClick={() => { if (!s.locked) setActive(s.id); }}
              disabled={s.locked}
              className={`flex-1 py-3 border-r border-border last:border-0 transition-colors ${
                s.locked
                  ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                  : isActive ? 'bg-purple/15 text-purple-light' : 'text-muted-foreground hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                {s.locked && <Lock className="w-2.5 h-2.5" />}
                <span className="text-[11px] font-semibold">Stage {i + 1}: {s.label}</span>
              </div>
              <p className="text-[9.5px] text-muted-foreground">{s.locked ? 'Post-MVP' : isActive ? 'Active' : 'Available'}</p>
            </button>
          );
        })}
      </div>

      {active === 'discover' && <StageDiscover assets={assets} nav={nav} onNext={() => setActive('assess')} />}
      {active === 'assess'   && <StageAssess   assets={assets} nav={nav} />}
      {active === 'plan'     && <StageLocked label="Plan" />}
      {active === 'migrate'  && <StageLocked label="Migrate" />}
      {active === 'monitor'  && <StageLocked label="Monitor" />}
    </div>
  );
}
