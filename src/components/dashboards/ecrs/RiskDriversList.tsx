import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Shield, Sparkles, Loader2, Check, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { drivers, urgencyMeta, RiskDriver } from '@/data/ecrsData';
import { useNav } from '@/context/NavigationContext';
import { useDashboard } from '@/context/DashboardContext';
import { DRIVER_TO_FACTOR } from '@/lib/ecrs';

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
  const { hoveredDriver, setHoveredDriver, factorContribution } = useDashboard();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiState, setAiState] = useState<Record<string, 'idle' | 'submitted' | 'guide'>>({});

  // Live driver pts = ECRS contribution of mapped factor.
  const driverPts = (id: string) => {
    const f = DRIVER_TO_FACTOR[id];
    return f ? factorContribution(f) : 0;
  };

  const nav = (p: string, f?: Record<string, string>) => {
    if (f) setFilters(f);
    setCurrentPage(p);
  };

  const runAIAction = (d: RiskDriver) => {
    if (d.aiAction.isExecutable) {
      setAiState(s => ({ ...s, [d.id]: 'submitted' }));
      toast.success('Workflow request submitted', {
        description: `View in Tickets · routed to ${d.aiAction.route}`,
        action: { label: 'Open', onClick: () => nav('tickets') },
      });
    } else {
      setAiState(s => ({ ...s, [d.id]: 'guide' }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-foreground">All Risk Drivers</p>
        <span className="text-[9px] text-muted-foreground">Ranked by impact × density</span>
      </div>
      <div className="space-y-1">
        {drivers.map(d => {
          const isOpen = expanded === d.id;
          const isHovered = hoveredDriver === d.id;
          const ai = aiState[d.id] ?? 'idle';
          return (
            <div
              key={d.id}
              onMouseEnter={() => setHoveredDriver(d.id)}
              onMouseLeave={() => setHoveredDriver(null)}
              className={`rounded-md transition-all ${
                isHovered
                  ? 'bg-secondary/70 ring-1 ring-coral/40'
                  : 'bg-secondary/30 hover:bg-secondary/50'
              }`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : d.id)}
                className="w-full flex items-center gap-2 text-left px-2.5 py-1.5"
              >
                <span className="text-[10px] font-bold text-coral tabular-nums w-10 flex-shrink-0">+{driverPts(d.id)} pts</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-foreground truncate">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <UrgencyChip u={d.urgency} />
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {d.tier1Pct}% Tier-1 · {d.prodPct}% prod
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-2.5 pb-2 pt-0 space-y-1.5 border-t border-border/40">
                  <div className="pt-1.5">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Impacted systems</p>
                    <p className="text-[9px] text-muted-foreground mb-1 tabular-nums">
                      {d.systems.totalCount.toLocaleString()} production systems affected
                    </p>
                    <div className="flex flex-wrap gap-1 items-center">
                      {d.systems.named.map(s => (
                        <span key={s} className="text-[9.5px] px-1.5 py-0.5 rounded bg-card border border-border text-foreground font-mono">{s}</span>
                      ))}
                      {d.systems.totalCount > d.systems.named.length && (
                        <button
                          onClick={() => nav(d.systems.page, d.systems.filters)}
                          className="text-[9px] text-teal hover:underline"
                        >
                          +{(d.systems.totalCount - d.systems.named.length).toLocaleString()} more →
                        </button>
                      )}
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

                  {/* AI action panel */}
                  {ai === 'idle' && (
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => runAIAction(d)}
                        className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> AI: {d.aiAction.label}
                      </button>
                      <button
                        onClick={() => nav(d.page, d.filters)}
                        className="text-[10px] font-medium px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1"
                      >
                        View in Inventory <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  {ai === 'submitted' && (
                    <div className="pt-1">
                      <div className="text-[10px] text-foreground bg-teal/15 border border-teal/40 rounded px-2 py-1.5 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-teal" />
                        <span>Workflow submitted · routed to {d.aiAction.route} · ticket #RMD-{Math.floor(Math.random() * 9000) + 1000}</span>
                      </div>
                    </div>
                  )}
                  {ai === 'guide' && (
                    <div className="pt-1">
                      <div className="text-[10px] text-foreground bg-purple/10 border border-purple/30 rounded px-2.5 py-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] uppercase tracking-wider text-purple-light font-semibold flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> AI guidance
                          </p>
                          <button onClick={() => setAiState(s => ({ ...s, [d.id]: 'idle' }))} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10.5px] text-foreground leading-snug">{d.aiAction.description}</p>
                        <button
                          onClick={() => nav(d.aiAction.route)}
                          className="text-[10px] font-semibold text-teal hover:underline flex items-center gap-1"
                        >
                          Open {d.aiAction.route} <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
