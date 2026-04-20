import React, { useMemo, useState } from 'react';
import { X, ShieldAlert, History, ArrowRight } from 'lucide-react';
import type { ITAsset } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';
import { useRisk } from '@/context/RiskContext';
import { arsFor } from '@/lib/risk/ars';
import { computeRPS } from '@/lib/risk/rps';
import { severityFor, severityHsl, BI_MULTIPLIER, type BusinessImpact } from '@/lib/risk/types';
import BusinessImpactEditor from './BusinessImpactEditor';
import ArsBadge from './ArsBadge';

interface Props { asset: ITAsset | null; onClose: () => void; onOpenObject?: (objectId: string) => void; }

export default function AssetRiskDrawer({ asset, onClose, onOpenObject }: Props) {
  const { biMap, setBI, auditFor } = useRisk();
  const [justification, setJustification] = useState('');
  const [pendingBI, setPendingBI] = useState<BusinessImpact | null>(null);

  const data = useMemo(() => (asset ? arsFor(asset) : null), [asset]);
  if (!asset || !data) return null;

  const bi = biMap[asset.id] ?? 'Moderate';
  const rps = computeRPS(data.ars, bi);
  const sevHsl = severityHsl(severityFor(data.ars));
  const audit = auditFor(asset.id);

  const apply = () => {
    if (pendingBI && pendingBI !== bi) {
      setBI(asset.id, pendingBI, justification);
    } else if (justification.trim()) {
      // user only added justification without changing BI
      setBI(asset.id, bi, justification);
    }
    setJustification('');
    setPendingBI(null);
  };

  const proposed = pendingBI ?? bi;
  const proposedRps = computeRPS(data.ars, proposed);

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-label="Asset risk detail">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[640px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4" style={{ color: sevHsl }} />
            <h2 className="text-sm font-semibold text-foreground font-mono truncate">{asset.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Headline scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Asset Risk</p>
              <ArsBadge score={data.ars} size="md" />
              <p className="text-[10px] text-muted-foreground mt-1">{severityFor(data.ars)}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Business Impact</p>
              <BusinessImpactEditor value={bi} onChange={v => setPendingBI(v)} size="md" />
              <p className="text-[10px] text-muted-foreground mt-1">×{BI_MULTIPLIER[proposed]}</p>
            </div>
            <div className="rounded-md border border-border bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Remediation Priority</p>
              <span className="text-[16px] font-bold text-foreground tabular-nums">RPS {proposedRps}</span>
              {pendingBI && pendingBI !== bi && (
                <p className="text-[10px] text-amber mt-1">was {rps} → will be {proposedRps}</p>
              )}
              {!(pendingBI && pendingBI !== bi) && (
                <p className="text-[10px] text-muted-foreground mt-1">ARS × BI</p>
              )}
            </div>
          </div>

          {/* ARS breakdown */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              ARS breakdown
            </h3>
            <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
              <div className="grid grid-cols-4 gap-3 text-[10.5px]">
                <Stat label="Max CRS" value={data.max} />
                <Stat label="P90 CRS" value={data.p90} />
                <Stat label="P75 CRS" value={data.p75} />
                <Stat label="Objects" value={data.count} />
              </div>
              <div className="border-t border-border/50 pt-2 grid grid-cols-2 gap-3 text-[10.5px]">
                <Stat label="Critical CRS" value={data.critCount} hsl="hsl(var(--coral))" />
                <Stat label="High CRS" value={data.highCount} hsl="hsl(15 72% 62%)" />
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug pt-2 border-t border-border/50">
                ARS = 0.55·max + 0.45·(0.6·P90 + 0.4·P75) + log(1+critCount)·4 + log(1+highCount)·2
              </p>
            </div>
          </section>

          {/* Top contributing crypto objects */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Top contributing objects
            </h3>
            <div className="space-y-1">
              {data.topObjects.map(o => (
                <button
                  key={o.id}
                  onClick={() => onOpenObject?.(o.id)}
                  className="w-full grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2 rounded-md bg-secondary/30 hover:bg-secondary/60 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-foreground truncate">{o.name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.reason}</p>
                  </div>
                  <ArsBadge score={o.crs} label="CRS" />
                  <ArrowRight className="w-3 h-3 text-teal" />
                </button>
              ))}
            </div>
          </section>

          {/* Business Impact justification + audit */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Business Impact justification
            </h3>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              placeholder="Why is this asset's business impact set this way? (e.g. handles all PCI traffic, has SLA with $X/min revenue impact)"
              className="w-full h-20 px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => { setPendingBI(null); setJustification(''); }}
                disabled={!pendingBI && !justification.trim()}
                className="text-[11px] px-3 py-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={!pendingBI && !justification.trim()}
                className="text-[11px] font-semibold px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light disabled:opacity-30"
              >
                Save change
              </button>
            </div>

            {audit.length > 0 && (
              <div className="mt-3 border-t border-border/50 pt-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  <History className="w-3 h-3" /> Audit log
                </div>
                <ul className="space-y-1.5">
                  {audit.slice(0, 5).map((a, i) => (
                    <li key={i} className="text-[10.5px] text-foreground bg-secondary/20 rounded px-2 py-1.5">
                      <p>
                        <span className="text-muted-foreground">{new Date(a.ts).toLocaleString()} · {a.actor}:</span>{' '}
                        Business Impact <span className="font-semibold">{a.from}</span> →{' '}
                        <span className="font-semibold text-teal">{a.to}</span>
                      </p>
                      {a.justification && <p className="text-muted-foreground mt-0.5 italic">"{a.justification}"</p>}
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

function Stat({ label, value, hsl }: { label: string; value: number; hsl?: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[14px] font-bold tabular-nums" style={hsl ? { color: hsl } : undefined}>{value}</p>
    </div>
  );
}

// Pull mockAssets reference so the bundler treats it as used.
void mockAssets;
