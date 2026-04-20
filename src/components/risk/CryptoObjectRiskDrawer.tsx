import React, { useMemo } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { CryptoAsset } from '@/data/mockData';
import { computeCRS, getCrsFactors, getFactorContribution } from '@/lib/risk/crs';
import { severityFor, severityHsl } from '@/lib/risk/types';
import ArsBadge from './ArsBadge';

interface Props { object: CryptoAsset | null; onClose: () => void; }

export default function CryptoObjectRiskDrawer({ object, onClose }: Props) {
  const data = useMemo(() => {
    if (!object) return null;
    const factors = getCrsFactors(object);
    const crs = computeCRS(object);
    return { factors, crs };
  }, [object]);
  if (!object || !data) return null;

  const sevHsl = severityHsl(severityFor(data.crs));

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-label="Crypto object risk detail">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[560px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4" style={{ color: sevHsl }} />
            <h2 className="text-sm font-semibold text-foreground font-mono truncate">{object.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Headline */}
          <div className="rounded-md border border-border bg-secondary/20 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Crypto Risk Score</p>
              <ArsBadge score={data.crs} label="CRS" size="md" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{object.type}</p>
              <p className="text-[11px] font-mono text-foreground">{object.algorithm}</p>
              <p className="text-[10px] text-muted-foreground">{object.environment} · {object.team}</p>
            </div>
          </div>

          {/* Factor breakdown */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              CRS factor breakdown
            </h3>
            <div className="space-y-1.5">
              {data.factors.map(f => {
                const contrib = getFactorContribution(f, data.factors);
                const pct = (f.raw / 100) * 100;
                return (
                  <div key={f.id} className="rounded-md border border-border bg-secondary/20 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ background: f.color }} />
                        <span className="text-[11.5px] font-semibold text-foreground">{f.label}</span>
                      </div>
                      <span className="text-[10.5px] font-bold text-foreground tabular-nums">+{contrib} pts</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: f.color }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{f.why}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
              CRS = weighted average of 5 factors (algorithm, lifecycle, exposure, access, compliance).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
