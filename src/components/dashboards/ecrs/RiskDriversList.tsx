import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Shield, Sparkles, Loader2, Check } from 'lucide-react';
import { drivers, urgencyMeta, RiskDriver } from '@/data/ecrsData';
import { useNav } from '@/context/NavigationContext';
import { useDashboard } from '@/context/DashboardContext';

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
  const { hoveredDriver, setHoveredDriver } = useDashboard();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiState, setAiState] = useState<Record<string, 'idle' | 'running' | 'done'>>({});

  const nav = (p: string, f?: Record<string, string>) => {
    if (f) setFilters(f);
    setCurrentPage(p);
  };

  const runAIBatch = (id: string) => {
    setAiState(s => ({ ...s, [id]: 'running' }));
    setTimeout(() => setAiState(s => ({ ...s, [id]: 'done' })), 2200);
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

                  {/* AI batch execute panel */}
                  {ai === 'idle' && (
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => runAIBatch(d.id)}
                        className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> AI: Fix top 10 now
                      </button>
                      <button
                        onClick={() => nav(d.page, d.filters)}
                        className="text-[10px] font-medium px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1"
                      >
                        View in Inventory <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  {ai === 'running' && (
                    <div className="pt-1">
                      <div className="text-[10px] text-foreground bg-teal/10 border border-teal/30 rounded px-2 py-1.5 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 text-teal animate-spin" />
                        <span>AI executing batch · 10 highest-impact assets · queuing remediation tickets…</span>
                      </div>
                    </div>
                  )}
                  {ai === 'done' && (
                    <div className="pt-1">
                      <div className="text-[10px] text-foreground bg-teal/15 border border-teal/40 rounded px-2 py-1.5 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-teal" />
                        <span>10 assets remediated · ticket #RMD-{Math.floor(Math.random() * 9000) + 1000} created</span>
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
