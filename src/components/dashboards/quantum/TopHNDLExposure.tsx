import React from 'react';
import { computeQES } from '@/lib/risk/qes';
import type { CryptoAsset } from '@/data/mockData';
import ScoreExplainer from '@/components/risk/ScoreExplainer';

const sevColor = (q: number) => q >= 80 ? 'bg-coral/15 text-coral' : q >= 60 ? 'bg-purple/15 text-purple-light' : q >= 30 ? 'bg-amber/15 text-amber' : 'bg-teal/15 text-teal';

interface Props {
  objects?: CryptoAsset[];
  onSelect?: (name: string) => void;
}

export default function TopHNDLExposure({ objects, onSelect }: Props) {
  const q = React.useMemo(() => computeQES(objects), [objects]);
  const top = q.topObjects[0];
  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top harvest-now-decrypt-later exposure</p>
        {top && (
          <ScoreExplainer
            title={`QOE ${top.qoe} · ${top.name}`}
            band={top.qoe >= 80 ? 'Critical' : top.qoe >= 60 ? 'High' : top.qoe >= 30 ? 'Medium' : 'Low'}
            factors={[
              { label: 'Algorithm', value: top.algorithm.match(/ML-KEM|ML-DSA|SLH-DSA|AES-256/) ? 0 : top.algorithm.includes('Ed25519') ? 90 : top.algorithm.includes('AES-128') ? 30 : 100, weightPct: 35, detail: top.algorithm },
              { label: 'Harvest value', value: ({ Restricted: 100, Confidential: 75, Internal: 50, Public: 25 } as Record<string, number>)[top.sensitivity] * Math.min(1, top.lifespanYears / 10), weightPct: 35, detail: `${top.sensitivity}, ${top.lifespanYears}y` },
              { label: 'Exposure', value: 60, weightPct: 30 },
            ]}
            why="Rows rank by per-object QOE: quantum-vulnerable algorithm times the value and lifespan of the data it protects."
            formula="QOE = 0.35·AlgVuln + 0.35·HNDL + 0.30·Exposure"
          />
        )}
      </div>
      <div className="space-y-1.5">
        {q.topObjects.map(o => (
          <button
            key={o.id}
            onClick={() => onSelect?.(o.name)}
            className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0 text-left hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{o.name}</p>
              <p className="text-[9.5px] text-muted-foreground">{o.algorithm} · {o.sensitivity} · {o.lifespanYears}y lifespan</p>
            </div>
            <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded shrink-0 ${sevColor(o.qoe)}`}>QOE {o.qoe}</span>
          </button>
        ))}
        {q.topObjects.length === 0 && (
          <p className="text-[10px] text-muted-foreground py-4 text-center">No quantum-vulnerable objects in the current estate.</p>
        )}
      </div>
    </div>
  );
}
