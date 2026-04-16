import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Shield } from 'lucide-react';
import { drivers, urgencyMeta, RiskDriver } from '@/data/ecrsData';
import { useNav } from '@/context/NavigationContext';

function UrgencyChip({ u }: { u: RiskDriver['urgency'] }) {
  const m = urgencyMeta[u];
  return (
    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${m.hsl}20`, color: m.hsl }}>
      {m.label} · {m.window}
    </span>
  );
}

export default function RiskDriversList() {
  const { setCurrentPage, setFilters } = useNav();
  const [expanded, setExpanded] = useState<string | null>(null);

  const nav = (p: string, f?: Record<string, string>) => {
    if (f) setFilters(f);
    setCurrentPage(p);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-foreground">Top Risk Drivers</p>
        <span className="text-[9px] text-muted-foreground">Ranked by ERS impact × business density</span>
      </div>
      <div className="space-y-1">
        {drivers.map(d => {
          const isOpen = expanded === d.id;
          return (
            <div key={d.id} className="rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <button
                onClick={() => setExpanded(isOpen ? null : d.id)}
                className="w-full flex items-center gap-2 text-left px-2.5 py-1.5"
              >
                <span className="text-[10px] font-bold text-coral tabular-nums w-10 flex-shrink-0">+{d.impact} pts</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-foreground truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <UrgencyChip u={d.urgency} />
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {d.tier1Pct}% Tier-1 · {d.prodPct}% prod
                    </span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{d.assets.toLocaleString()} assets</span>
                  </div>
                </div>
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-2.5 pb-2 pt-0 space-y-1.5 border-t border-border/40">
                  <div className="pt-1.5">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Impacted systems</p>
                    <div className="flex flex-wrap gap-1">
                      {d.systems.map(s => (
                        <span key={s} className="text-[9.5px] px-1.5 py-0.5 rounded bg-card border border-border text-foreground font-mono">{s}</span>
                      ))}
                      {d.envs.map(e => (
                        <span key={e} className={`text-[9.5px] px-1.5 py-0.5 rounded ${e === 'Production' ? 'bg-coral/15 text-coral' : 'bg-purple/15 text-purple-light'}`}>
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Compliance violations
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {d.compliance.map(c => (
                        <span key={c} className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/20">{c}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => nav(d.page, d.filters)}
                    className="w-full text-[10px] font-semibold py-1 rounded bg-teal/15 text-teal hover:bg-teal/25 flex items-center justify-center gap-1 mt-1"
                  >
                    View {d.assets.toLocaleString()} affected assets <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
