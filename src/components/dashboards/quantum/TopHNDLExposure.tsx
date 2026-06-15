import React from 'react';
import { computeQES } from '@/lib/risk/qes';
import type { CryptoAsset } from '@/data/mockData';
import ScoreExplainer from '@/components/risk/ScoreExplainer';

const sevColor = (q: number) =>
  q >= 80 ? 'bg-coral/15 text-coral'
  : q >= 60 ? 'bg-purple/15 text-purple-light'
  : q >= 30 ? 'bg-amber/15 text-amber'
  : 'bg-teal/15 text-teal';

const SENS_W: Record<string, number> = { Restricted: 100, Confidential: 75, Internal: 50, Public: 25 };

interface Props {
  objects?: CryptoAsset[];
  onSelect?: (id: string) => void;
}

export default function TopHNDLExposure({ objects, onSelect }: Props) {
  const q = React.useMemo(() => computeQES(objects), [objects]);
  const top = q.topObjects[0];

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Top harvest-now-decrypt-later exposure</h3>
        {top && (
          <ScoreExplainer
            title={`Top object QOE ${top.qoe}`}
            band={top.qoe >= 80 ? 'Critical' : top.qoe >= 60 ? 'High' : top.qoe >= 30 ? 'Medium' : 'Low'}
            factors={[
              {
                label: 'Algorithm',
                value: /ML-KEM|ML-DSA|SLH-DSA|AES-256/.test(top.algorithm) ? 0
                       : top.algorithm.includes('Ed25519') ? 90
                       : top.algorithm.includes('AES-128') ? 30 : 100,
                weightPct: 35,
                detail: top.algorithm,
              },
              {
                label: 'Harvest value',
                value: (SENS_W[top.sensitivity] ?? 50) * Math.min(1, top.lifespanYears / 10),
                weightPct: 35,
                detail: `${top.sensitivity}, ${top.lifespanYears}y`,
              },
              { label: 'Exposure', value: 60, weightPct: 30 },
            ]}
            why="Rows rank by per-object QOE: quantum-vulnerable algorithm times the value and lifespan of the data it protects."
            formula="QOE = 0.35·AlgVuln + 0.35·HNDL + 0.30·Exposure"
          />
        )}
      </div>

      <div className="space-y-1">
        {q.topObjects.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect?.(o.id)}
            className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0 text-left hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-foreground truncate">{o.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {o.algorithm} · {o.sensitivity} · {o.lifespanYears}y lifespan
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tabular-nums ${sevColor(o.qoe)}`}>QOE {o.qoe}</span>
          </button>
        ))}
        {q.topObjects.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-4 text-center">No quantum-vulnerable objects in the current estate.</p>
        )}
      </div>
    </div>
  );
}
