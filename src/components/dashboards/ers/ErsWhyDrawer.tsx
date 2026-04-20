import React from 'react';
import { X, ArrowRight, AlertTriangle, ShieldAlert, Wrench, ExternalLink } from 'lucide-react';
import { useRisk } from '@/context/RiskContext';
import { useNav } from '@/context/NavigationContext';
import { severityHsl } from '@/lib/risk/types';

interface Props { open: boolean; onClose: () => void; }

const BI_COLOR: Record<string, string> = {
  Critical: 'bg-coral/15 text-coral border-coral/30',
  High:     'bg-amber/15 text-amber border-amber/30',
  Moderate: 'bg-purple/15 text-purple-light border-purple/30',
  Low:      'bg-secondary text-muted-foreground border-border',
};

// Real-world remediation workflows. Each card deep-links to an existing
// operational screen with the right filter pre-applied — no fake one-click
// "fix 1000 things" buttons.
const WORKFLOWS = [
  {
    id: 'wf-renew-prod-expiring',
    title: 'Bulk-renew certs expiring on Critical assets',
    why: 'Highest leverage on ERS this week — concentrated in Production with auto-renewal disabled.',
    page: 'remediation',
    filters: { module: 'clm', filter: 'expiry', impact: 'critical' },
    actionLabel: 'Open Cert Deployments',
    effort: '5 day rollout · per-CA waves',
    mechanism: 'Triggers Cert+ renewal workflows grouped by issuing CA',
    deltaPct: 8,
  },
  {
    id: 'wf-rotate-secrets',
    title: 'Rotate non-rotated secrets on payments + data clusters',
    why: 'Largest footprint — 42K secrets, but rotation is policy-driven, not manual.',
    page: 'remediation',
    filters: { module: 'secrets', filter: 'rotation' },
    actionLabel: 'Open Secret Rotation',
    effort: '2 day rollout · 5 rotation waves',
    mechanism: 'Vault / AWS SM / Azure KV policies with team notifications',
    deltaPct: 6,
  },
  {
    id: 'wf-pqc-migration',
    title: 'Stage PQC migration for weak-algo certs',
    why: 'NIST SP 800-131A / PCI-DSS 4.2.1 — long lead time, must start now.',
    page: 'quantum-posture',
    filters: { algorithm: 'weak' },
    actionLabel: 'Open Quantum Posture',
    effort: 'Multi-quarter program',
    mechanism: 'AI-grouped migration plan for QTH review (not auto-executed)',
    deltaPct: 5,
  },
];

export default function ErsWhyDrawer({ open, onClose }: Props) {
  const { ers } = useRisk();
  const { setCurrentPage, setFilters } = useNav();

  if (!open) return null;

  const sevHsl = severityHsl(ers.severity);

  const nav = (page: string, filters: Record<string, string> = {}) => {
    setFilters(filters);
    setCurrentPage(page);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-label="Why is ERS high?">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[640px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: sevHsl }} />
            <h2 className="text-sm font-semibold text-foreground">Why is ERS {ers.ers}?</h2>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: `${sevHsl}22`, color: sevHsl }}
            >
              {ers.severity}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Verdict line */}
          <div className="text-[12.5px] leading-relaxed text-foreground bg-secondary/30 border border-border rounded-md p-3">
            <span className="font-semibold">Enterprise Risk Score is {ers.ers} ({ers.severity}).</span>{' '}
            Driven by{' '}
            <span className="font-semibold text-coral">
              {ers.driverBuckets[0]?.label.toLowerCase() ?? 'multiple weak postures'}
            </span>
            {' '}across{' '}
            <span className="font-semibold">
              {ers.topAssets.filter(a => a.bi === 'Critical').length} Critical-impact assets
            </span>
            {ers.floorApplied && ers.floorAsset && (
              <>
                {'. '}
                <span className="font-semibold text-coral">Floor rule active</span>{' '}
                — ERS held at {ers.ers} by{' '}
                <span className="font-mono text-[11.5px]">{ers.floorAsset.name}</span> (ARS {ers.floorAsset.ars}).
              </>
            )}
            {!ers.floorApplied && '.'}
          </div>

          {/* Floor rule explainer if active */}
          {ers.floorApplied && (
            <div className="flex items-start gap-2 text-[11px] bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-coral flex-shrink-0 mt-0.5" />
              <p className="text-foreground leading-snug">
                <span className="font-semibold">Floor rule:</span> ERS cannot fall below 85% of the highest
                ARS on any Critical-impact production asset. Fixing this asset is the only way to lower ERS.
              </p>
            </div>
          )}

          {/* Section 1: Top drivers */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Top risk drivers
            </h3>
            <div className="space-y-1.5">
              {ers.driverBuckets.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => nav(d.page, d.filters)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-coral/30 transition-all text-left"
                >
                  <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground truncate">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {d.count.toLocaleString()} affected · contributing +{d.pts} pts to ERS
                    </p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-teal flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>

          {/* Section 2: Critical assets impacted */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Business-critical assets driving ERS
              </h3>
              <span className="text-[10px] text-muted-foreground">Ranked by RPS</span>
            </div>
            <div className="space-y-1">
              {ers.topAssets
                .filter(a => a.bi === 'Critical' || a.bi === 'High')
                .slice(0, 5)
                .map(a => (
                  <button
                    key={a.id}
                    onClick={() => nav('inventory', { tab: 'infrastructure', assetId: a.id })}
                    className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-3 py-2 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <span className="text-[12px] font-mono text-foreground truncate">{a.name}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${BI_COLOR[a.bi]}`}>
                      {a.bi}
                    </span>
                    <span
                      className="text-[10.5px] font-bold tabular-nums"
                      style={{ color: severityHsl(a.ars >= 80 ? 'Critical' : a.ars >= 60 ? 'High' : a.ars >= 30 ? 'Medium' : 'Low') }}
                    >
                      ARS {a.ars}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">RPS {a.rps}</span>
                    <ArrowRight className="w-3 h-3 text-teal" />
                  </button>
                ))}
            </div>
          </section>

          {/* Section 3: What reduces risk fastest */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              What reduces ERS fastest
            </h3>
            <p className="text-[10.5px] text-muted-foreground mb-2 leading-snug">
              Real-world workflows. Each opens the operational screen with filters pre-applied —
              no fake one-click bulk fixes.
            </p>
            <div className="space-y-2">
              {WORKFLOWS.map(w => (
                <div key={w.id} className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Wrench className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-snug">{w.title}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{w.why}</p>
                    </div>
                    <span className="text-[10.5px] font-bold text-teal tabular-nums whitespace-nowrap">
                      ↓ ~{w.deltaPct} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pl-5">
                    <span>{w.effort} · {w.mechanism}</span>
                  </div>
                  <div className="pl-5">
                    <button
                      onClick={() => nav(w.page, w.filters)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-teal hover:text-teal-light"
                    >
                      {w.actionLabel} <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
