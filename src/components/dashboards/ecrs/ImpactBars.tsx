import React from 'react';
import { ArrowRight } from 'lucide-react';
import { drivers } from '@/data/ecrsData';
import { useDashboard } from '@/context/DashboardContext';
import { useNav } from '@/context/NavigationContext';
import { DRIVER_TO_FACTOR } from '@/lib/ecrs';

const TOP = drivers.slice(0, 3);
const URGENCY_PHRASE: Record<string, string> = {
  'weak-algos': 'Fix this first',
  'expiring-certs': '6 days left',
  'non-rotated-secrets': '34% of prod',
  'non-hsm-keys': 'FIPS 140-3 gap',
  'overpriv-ai-tokens': '179K unsponsored',
};

export default function ImpactBars() {
  const { hoveredDriver, setHoveredDriver, driverImpactDelta, factorContribution } = useDashboard();
  const { setCurrentPage, setFilters } = useNav();

  // Each driver's headline pts = the live ECRS contribution of its mapped
  // factor, so changing weights moves these in lock-step with the gauge.
  const driverPts = (id: string) => {
    const f = DRIVER_TO_FACTOR[id];
    return f ? factorContribution(f) : 0;
  };

  const maxImpact = Math.max(...TOP.map(d => driverPts(d.id))) || 1;

  const nav = (page: string, filters: Record<string, string>) => {
    setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Score composition · top 3 drivers
      </p>
      <div className="space-y-1.5">
        {TOP.map(d => {
          const base = driverPts(d.id);
          const delta = driverImpactDelta[d.id] ?? 0;
          const effective = Math.max(0, base + delta);
          const widthPct = (effective / maxImpact) * 100;
          const isHovered = hoveredDriver === d.id;
          return (
            <button
              key={d.id}
              onMouseEnter={() => setHoveredDriver(d.id)}
              onMouseLeave={() => setHoveredDriver(null)}
              onClick={() => nav(d.page, d.filters)}
              className={`w-full grid grid-cols-12 items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all text-left ${
                isHovered ? 'bg-secondary/60 ring-1 ring-coral/40' : 'hover:bg-secondary/30'
              }`}
              title={`View ${d.count.toLocaleString()} ${d.countLabel} in Inventory`}
            >
              <span className="col-span-3 text-[11px] text-foreground truncate font-medium">
                {d.name.replace(/\s*\(.*\)/, '')}
              </span>
              <div className="col-span-3 h-2 rounded-full bg-secondary overflow-hidden">
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
              <span className="col-span-2 text-[9.5px] text-muted-foreground truncate">
                {URGENCY_PHRASE[d.id]}
              </span>
              <span className="col-span-2 text-[9.5px] text-teal text-right truncate flex items-center justify-end gap-0.5 tabular-nums">
                {d.count.toLocaleString()} {d.countLabel}
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
