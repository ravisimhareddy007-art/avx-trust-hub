import React from 'react';
import { drivers } from '@/data/ecrsData';
import { useDashboard } from '@/context/DashboardContext';

// Top 3 contributors only — security admins can't act on 5 bands of millions of assets
const TOP = drivers.slice(0, 3);
const URGENCY_PHRASE: Record<string, string> = {
  'weak-algos': 'Fix this first',
  'expiring-certs': '6 days left',
  'non-rotated-secrets': '34% of prod',
  'non-hsm-keys': 'FIPS 140-3 gap',
  'overpriv-ai-tokens': '179K unsponsored',
};

export default function ImpactBars() {
  const { hoveredDriver, setHoveredDriver, driverImpactDelta } = useDashboard();
  const maxImpact = Math.max(...TOP.map(d => d.impact));

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Score composition · top 3 drivers
      </p>
      <div className="space-y-1.5">
        {TOP.map(d => {
          const delta = driverImpactDelta[d.id] ?? 0;
          const effective = Math.max(0, d.impact + delta); // delta is negative
          const widthPct = (effective / maxImpact) * 100;
          const isHovered = hoveredDriver === d.id;
          return (
            <div
              key={d.id}
              onMouseEnter={() => setHoveredDriver(d.id)}
              onMouseLeave={() => setHoveredDriver(null)}
              className={`grid grid-cols-12 items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                isHovered ? 'bg-secondary/60 ring-1 ring-coral/40' : 'hover:bg-secondary/30'
              }`}
            >
              <span className="col-span-4 text-[11px] text-foreground truncate font-medium">
                {d.name.replace(/\s*\(.*\)/, '')}
              </span>
              <div className="col-span-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${widthPct}%`,
                    background: isHovered
                      ? 'hsl(var(--coral))'
                      : 'linear-gradient(90deg, hsl(var(--coral)), hsl(15 72% 62%))',
                  }}
                />
              </div>
              <span className="col-span-2 text-[10.5px] font-bold text-coral tabular-nums">
                +{effective} pts
                {delta < 0 && (
                  <span className="ml-1 text-[9px] text-teal">({delta})</span>
                )}
              </span>
              <span className="col-span-2 text-[9.5px] text-muted-foreground text-right truncate">
                {URGENCY_PHRASE[d.id]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
