import React from 'react';
import { computeReadiness } from '@/lib/risk/qes';

const STAGES = ['Not assessed', 'In assessment', 'Migration planned', 'In-flight', 'Migrated'] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<Stage, string> = {
  'Not assessed': 'bg-coral',
  'In assessment': 'bg-amber',
  'Migration planned': 'bg-purple',
  'In-flight': 'bg-purple-light',
  'Migrated': 'bg-teal',
};

export default function MigrationReadinessStrip() {
  const r = React.useMemo(() => computeReadiness(), []);
  const total = Object.values(r.pipeline).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Migration readiness</h3>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.onTrack ? 'bg-teal/15 text-teal' : 'bg-coral/15 text-coral'}`}>
          {r.onTrack ? 'On track for 2030' : `Behind · projected ${r.projectedCompletionYear}`}
        </span>
      </div>

      <div className="flex h-2 w-full rounded-full overflow-hidden bg-secondary">
        {STAGES.map(s => (
          <div
            key={s}
            className={STAGE_COLORS[s]}
            style={{ width: `${(r.pipeline[s] / total) * 100}%` }}
            title={`${s}: ${r.pipeline[s]}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STAGES.map(s => (
          <div key={s} className="text-center">
            <p className="text-lg font-bold tabular-nums text-foreground">{r.pipeline[s]}</p>
            <p className="text-[9.5px] text-muted-foreground leading-tight">{s}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
        <span className="text-coral font-semibold">{r.agilityBlocked}</span> quantum-vulnerable objects are agility-blocked (cannot be swapped without re-architecting).
      </p>
    </div>
  );
}
