import React, { useMemo, useState } from 'react';
import { Atom, Clock, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { FEATURES } from '@/config/features';
import { algVuln, deriveQthStatus } from '@/lib/risk/qes';
import { listTickets } from '@/lib/ticketStore';
import TicketDraftModal from '@/components/inventory/TicketDraftModal';
import QuantumExposureGauge from '@/components/dashboards/quantum/QuantumExposureGauge';
import TopHNDLExposure from '@/components/dashboards/quantum/TopHNDLExposure';
import MigrationPrepBacklog from '@/components/dashboards/quantum/MigrationPrepBacklog';

// One canonical definition of "quantum-vulnerable", used for every count, list,
// and breakdown on this page. Shor-breakable public-key algorithms (RSA, ECC,
// ECDSA, ECDH, DSA, DH, Ed25519) score algVuln >= 90. Nothing on this page may
// compute vulnerability a second way.
function isQuantumVulnerable(a: CryptoAsset): boolean {
  return algVuln(a.algorithm) >= 90;
}

export default function QuantumPosturePage() {
  const { setCurrentPage, setFilters } = useNav();
  const [modalAsset, setModalAsset] = useState<CryptoAsset | null>(null);

  // The estate this lens looks at: the shared inventory, with AI-identity objects
  // excluded while that capability is out of scope. Every downstream figure and
  // list derives from this one array.
  const estate = useMemo<CryptoAsset[]>(() => mockAssets, []);

  const vulnerable = useMemo(() => estate.filter(isQuantumVulnerable), [estate]);

  const goInventory = (extra: Record<string, string> = {}) => {
    setFilters({ tab: 'identities', ...extra });
    setCurrentPage('inventory');
  };
  // Inventory has no object-id deep link; it filters by name via search. Land on
  // the single object by searching its exact name.
  const goObjectByName = (name: string) => {
    setFilters({ tab: 'identities', search: name });
    setCurrentPage('inventory');
  };

  // ── Section 1 figures (all from the canonical vulnerable set) ──
  const hndlCriticalCount = vulnerable.filter(a => a.pqcRisk === 'Critical' && a.environment === 'Production').length;

  const algoRows = useMemo(() => {
    const m = new Map<string, number>();
    vulnerable.forEach(a => m.set(a.algorithm, (m.get(a.algorithm) ?? 0) + 1));
    return Array.from(m.entries()).map(([algorithm, count]) => ({ algorithm, count })).sort((a, b) => b.count - a.count);
  }, [vulnerable]);

  const typeRows = useMemo(() => {
    const m = new Map<string, number>();
    vulnerable.forEach(a => m.set(a.type, (m.get(a.type) ?? 0) + 1));
    return Array.from(m.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [vulnerable]);

  // ── Section 3 funnel (over the vulnerable set only, from real signals) ──
  const funnel = useMemo(() => {
    let assessed = 0, prioritised = 0;
    vulnerable.forEach(a => {
      const st = deriveQthStatus(a);
      if (st !== 'Not assessed') assessed++;
      if (st === 'Migration planned' || st === 'In-flight') prioritised++;
    });
    const handedOff = listTickets().filter(t => /pqc|quantum/i.test(`${t.summary} ${t.module ?? ''}`)).length;
    return {
      discovered: vulnerable.length,
      assessed,
      prioritised,
      handedOff,
      remaining: Math.max(0, vulnerable.length - handedOff),
    };
  }, [vulnerable]);

  const kpis = [
    { label: 'Crypto objects in estate', value: estate.length, color: 'text-foreground', sub: 'Open in Inventory', onClick: () => goInventory() },
    { label: 'Quantum-vulnerable', value: vulnerable.length, color: 'text-coral', sub: `${estate.length ? ((vulnerable.length / estate.length) * 100).toFixed(1) : 0}% of estate`, onClick: () => goInventory({ quantumVulnerable: 'true' }) },
    { label: 'Harvest-now-decrypt-later critical', value: hndlCriticalCount, color: 'text-amber', sub: 'Production, sensitive, long-lived', onClick: () => goInventory({ quantumVulnerable: 'true', pqcRisk: 'Critical' }) },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-5 h-5 text-purple-light" />
            <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {vulnerable.length.toLocaleString()} quantum-vulnerable of {estate.length.toLocaleString()} crypto objects in the shared inventory · NIST FIPS 203/204/205 aligned
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral/10 border border-coral/25">
          <Clock className="w-3 h-3 text-coral" />
          <span className="text-[10px] font-semibold text-coral">NIST 2030 deadline</span>
        </div>
      </div>

      {/* ── Section 1: Exposure ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Exposure</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <QuantumExposureGauge objects={estate} vulnerableCount={vulnerable.length} totalCount={estate.length} />
          <div className="lg:col-span-2"><TopHNDLExposure objects={estate} onSelect={goObjectByName} /></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {kpis.map(k => (
            <button key={k.label} onClick={k.onClick} className="bg-card rounded-xl border border-border p-4 text-left hover:border-teal/40 transition-all group">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{k.label}</p>
              <p className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value.toLocaleString()}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-muted-foreground">{k.sub}</p>
                <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-3">By algorithm</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left pb-2 font-medium">Algorithm</th>
                  <th className="text-right pb-2 font-medium">Objects</th>
                  <th className="text-right pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {algoRows.map(r => (
                  <tr key={r.algorithm} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 cursor-pointer" onClick={() => goInventory({ algorithm: r.algorithm })}>
                    <td className="py-2 font-mono text-foreground">{r.algorithm}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{r.count}</td>
                    <td className="py-2 text-right text-teal text-[10px]">View →</td>
                  </tr>
                ))}
                {algoRows.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No vulnerable objects</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-3">By object type</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left pb-2 font-medium">Type</th>
                  <th className="text-right pb-2 font-medium">Objects</th>
                  <th className="text-right pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {typeRows.map(r => (
                  <tr key={r.type} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 cursor-pointer" onClick={() => goInventory({ type: r.type })}>
                    <td className="py-2 text-foreground">{r.type}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{r.count}</td>
                    <td className="py-2 text-right text-teal text-[10px]">View →</td>
                  </tr>
                ))}
                {typeRows.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No vulnerable objects</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 2: Priorities ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Priorities</h2>
        <MigrationPrepBacklog objects={estate} onRaiseTicket={setModalAsset} onSelect={goObjectByName} />
      </section>

      {/* ── Section 3: Readiness ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Readiness</h2>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Discovered', value: funnel.discovered, hint: 'quantum-vulnerable in inventory' },
              { label: 'Assessed', value: funnel.assessed, hint: 'reviewed for migration' },
              { label: 'Prioritised', value: funnel.prioritised, hint: 'planned or in flight' },
              { label: 'Handed off', value: funnel.handedOff, hint: 'routed to ServiceNow' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-secondary/20 p-3">
                <p className="text-[24px] font-bold text-foreground tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">{s.label}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{s.hint}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              <span className="text-coral font-semibold">{funnel.remaining}</span> vulnerable objects have no raised change request yet.
            </p>
            <button onClick={() => setCurrentPage('tickets')} className="inline-flex items-center gap-1 text-[11px] text-teal hover:text-teal/80 font-medium transition-colors">
              View migration tickets <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-secondary/20 border border-border">
          <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The platform discovers, scores, and prioritises quantum-vulnerable cryptography across the shared estate, then routes prepared work to your migration process through ServiceNow. Migration execution runs in that process today, with integration or in-platform execution available in future releases.
          </p>
        </div>
      </section>

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
