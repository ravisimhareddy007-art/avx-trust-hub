import React, { useMemo, useState } from 'react';
import { X, ShieldAlert, History, ArrowRight, Info, AlertTriangle, Atom } from 'lucide-react';
import type { ITAsset } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';
import { useRisk } from '@/context/RiskContext';
import { arsFor } from '@/lib/risk/ars';
import { computeRPS } from '@/lib/risk/rps';
import { severityFor, severityHsl, BI_MULTIPLIER, type BusinessImpact } from '@/lib/risk/types';
import BusinessImpactEditor from './BusinessImpactEditor';
import ArsBadge from './ArsBadge';

interface Props {
  asset: ITAsset | null;
  onClose: () => void;
  onOpenObject?: (objectId: string) => void;
}

export default function AssetRiskDrawer({ asset, onClose, onOpenObject }: Props) {
  const { biMap, setBI, auditFor } = useRisk();
  const [justification, setJustification] = useState('');
  const [pendingBI, setPendingBI] = useState<BusinessImpact | null>(null);

  const data = useMemo(() => (asset ? arsFor(asset) : null), [asset]);
  if (!asset || !data) return null;

  const bi = biMap[asset.id] ?? 'Moderate';
  const rps = computeRPS(data.ars, bi);
  const sevHsl = severityHsl(severityFor(data.ars));
  const sev = severityFor(data.ars);
  const audit = auditFor(asset.id);
  const proposed = pendingBI ?? bi;
  const proposedRps = computeRPS(data.ars, proposed);

  const apply = () => {
    if (pendingBI && pendingBI !== bi) {
      setBI(asset.id, pendingBI, justification);
    } else if (justification.trim()) {
      setBI(asset.id, bi, justification);
    }
    setJustification('');
    setPendingBI(null);
  };

  const distLabel = () => {
    if (data.critCount > 0 && data.highCount > 0)
      return `${data.critCount} Critical + ${data.highCount} High credential${
        data.highCount > 1 ? 's' : ''
      }`;
    if (data.critCount > 0)
      return `${data.critCount} Critical credential${data.critCount > 1 ? 's' : ''}`;
    if (data.highCount > 0)
      return `${data.highCount} High-severity credential${data.highCount > 1 ? 's' : ''}`;
    return `${data.count} credential${data.count !== 1 ? 's' : ''}, none Critical or High`;
  };

  const arsExplain = () => {
    if (data.critCount >= 3)
      return 'Multiple critical credentials on this asset indicate a systemic problem — not just one bad key.';
    if (data.critCount === 1)
      return 'One critical credential is anchoring this score. That single object represents the highest-priority fix.';
    if (data.highCount >= 3)
      return "Several high-severity credentials are elevating this asset's risk. Rotation or renewal is recommended.";
    if (data.count === 0) return 'No cryptographic objects linked to this asset yet.';
    return 'The worst credential on this asset drives the score. Fixing it will have the largest impact on ARS.';
  };

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-label="Asset risk detail">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[680px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: sevHsl }} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground font-mono truncate">
                {asset.name}
              </h2>
              <p className="text-[10px] text-muted-foreground truncate">
                {asset.type} · {asset.environment}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Score trio */}
          <section className="grid grid-cols-3 gap-3">
            {/* ARS */}
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Asset Risk Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums" style={{ color: sevHsl }}>
                  {data.ars}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: sevHsl }}>
                  {sev}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Aggregated from {data.count} credential{data.count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Business Impact */}
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Business Impact
              </p>
              <BusinessImpactEditor value={bi} onChange={(v) => setPendingBI(v)} size="md" />
              <p className="text-[10px] text-muted-foreground mt-1">
                ×{BI_MULTIPLIER[proposed]} weight in ERS
              </p>
            </div>

            {/* RPS */}
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Remediation Priority
              </p>
              <span className="text-2xl font-bold text-foreground tabular-nums">{proposedRps}</span>
              {pendingBI && pendingBI !== bi ? (
                <p className="text-[10px] text-amber mt-1">
                  was {rps} → {proposedRps}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">ARS × Business Impact</p>
              )}
            </div>
          </section>

          {/* What's driving the score */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              What's driving this score
            </h3>

            {/* Credential distribution */}
            <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Critical', value: data.critCount, color: 'text-coral', bg: 'bg-coral/10' },
                  { label: 'High', value: data.highCount, color: 'text-amber', bg: 'bg-amber/10' },
                  { label: 'Total', value: data.count, color: 'text-foreground', bg: 'bg-muted/50' },
                  {
                    label: 'Worst CRS',
                    value: data.max,
                    color:
                      data.max >= 80 ? 'text-coral' : data.max >= 60 ? 'text-amber' : 'text-foreground',
                    bg: 'bg-muted/50',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-md ${stat.bg} px-2 py-2 flex flex-col items-center`}
                  >
                    <span className={`text-lg font-bold tabular-nums ${stat.color}`}>
                      {stat.value}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-2">
                <p className="text-[11px] font-semibold text-foreground mb-1">{distLabel()}</p>
                <p className="text-[10.5px] text-muted-foreground leading-snug">{arsExplain()}</p>
              </div>
            </div>

            {/* Operational vs Quantum split */}
            {(data.operationalCount > 0 || data.quantumCount > 0) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg border border-border bg-secondary/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">
                      {data.operationalCount} operational
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Expired, weak, or violating policy
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 flex items-start gap-2">
                  <Atom className="w-4 h-4 text-purple flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">
                      {data.quantumCount} quantum-vulnerable
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      RSA/ECC broken by Shor's algorithm
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Top contributing objects */}
          {data.topObjects.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Top contributing credentials
              </h3>
              <div className="space-y-1.5">
                {data.topObjects.slice(0, 3).map((o, idx) => (
                  <button
                    key={o.id}
                    onClick={() => onOpenObject?.(o.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 text-left transition-colors border border-border"
                  >
                    <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-mono text-foreground truncate">{o.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{o.reason}</p>
                    </div>
                    <ArsBadge score={o.crs} label="CRS" />
                    <ArrowRight className="w-3 h-3 text-teal flex-shrink-0" />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Click any credential to see its full CRS breakdown
              </p>
            </section>
          )}

          {/* How ARS works */}
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3.5 h-3.5 text-teal" />
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                How ARS is calculated
              </h3>
            </div>
            <p className="text-[11px] text-foreground leading-relaxed mb-2">
              The worst credential anchors the score (55% weight) — a single critical object cannot
              be averaged away by clean ones. The remaining credentials modulate the score based on
              their distribution (45%). A concentration of critical objects adds a bonus, because
              multiple critical credentials indicate a systemic problem, not an isolated incident.
            </p>
            <p className="text-[10px] text-muted-foreground italic">
              Aligned with NIST SP 800-30 Rev 1 · Section 3.4 (single high-impact asset failure can
              threaten mission success)
            </p>
          </section>

          {/* Business Impact justification */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Business Impact justification
            </h3>
            <p className="text-[10.5px] text-muted-foreground leading-snug mb-2">
              Business Impact controls how much this asset influences the Enterprise Risk Score
              (ERS). A Critical-impact asset contributes up to 5× more than a Low-impact one.
              Changes require a justification for audit compliance.
            </p>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why is this asset's business impact set this way? (e.g. handles all PCI payment traffic, $50K/min revenue impact)"
              className="w-full h-16 px-3 py-2 bg-muted border border-border rounded-lg text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setPendingBI(null);
                  setJustification('');
                }}
                disabled={!pendingBI && !justification.trim()}
                className="text-[11px] px-3 py-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={!pendingBI && !justification.trim()}
                className="text-[11px] font-semibold px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal/90 disabled:opacity-30"
              >
                Save change
              </button>
            </div>

            {audit.length > 0 && (
              <div className="mt-3 border-t border-border/50 pt-3">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  <History className="w-3 h-3" /> Audit log
                </div>
                <ul className="space-y-1.5">
                  {audit.slice(0, 5).map((a, i) => (
                    <li
                      key={i}
                      className="text-[10.5px] text-foreground bg-secondary/20 rounded px-2 py-1.5"
                    >
                      <p>
                        <span className="text-muted-foreground">
                          {new Date(a.ts).toLocaleString()} · {a.actor}:
                        </span>{' '}
                        Business Impact <span className="font-semibold">{a.from}</span> →{' '}
                        <span className="font-semibold text-teal">{a.to}</span>
                      </p>
                      {a.justification && (
                        <p className="text-muted-foreground mt-0.5 italic">"{a.justification}"</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

void mockAssets;
