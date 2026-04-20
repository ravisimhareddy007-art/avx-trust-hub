import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wand2, ArrowRight } from 'lucide-react';
import { actionOptions, urgencyMeta, scoreBand } from '@/data/ecrsData';
import { useNav } from '@/context/NavigationContext';
import { computeProjectedScore } from '@/lib/ecrs';

interface Props { score: number; }

export default function WhatIfSimulator({ score }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const selected = actionOptions
    .filter(a => picked.has(a.id))
    .map(a => ({ id: a.id, label: a.title, pointReduction: a.reduction, effort: a.effort, urgency: a.urgency }));
  const reduction = selected.reduce((s, r) => s + r.pointReduction, 0);
  const projected = computeProjectedScore(score, selected);
  const projBand = scoreBand(projected);
  const totalDays = Math.max(0, ...actionOptions.filter(a => picked.has(a.id)).map(a => a.durationDays));

  const ranked = [...actionOptions].sort((a, b) =>
    (b.reduction / b.durationDays) - (a.reduction / a.durationDays)
  );

  const nav = (p: string, f?: Record<string, string>) => {
    if (f) setFilters(f);
    setCurrentPage(p);
  };

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between mb-2 group">
        <div className="flex items-center gap-1.5">
          <Wand2 className="w-3 h-3 text-teal" />
          <p className="text-[11px] font-semibold text-foreground">What should I fix first? · Simulator</p>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <div className="space-y-1">
        {ranked.slice(0, open ? ranked.length : 3).map((a, i) => {
          const checked = picked.has(a.id);
          const u = urgencyMeta[a.urgency];
          return (
            <div key={a.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${checked ? 'border-teal bg-teal/10' : 'border-border bg-secondary/20'}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(a.id)}
                className="w-3 h-3 accent-teal flex-shrink-0"
              />
              <span className="text-[9px] font-bold text-muted-foreground tabular-nums w-4">#{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-foreground truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-teal font-semibold">↓ {a.reduction} pts</span>
                  <span className="text-[9px] text-muted-foreground">{a.effort} · {a.durationDays}d</span>
                  <span className="text-[9px]" style={{ color: u.hsl }}>{u.label}</span>
                </div>
              </div>
              <button
                onClick={() => nav(a.page, a.filters)}
                className="text-[9.5px] font-semibold px-2 py-1 rounded bg-teal text-primary-foreground hover:bg-teal-light flex-shrink-0 flex items-center gap-1"
              >
                Fix <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Projection bar */}
      <div className="mt-2 px-2 py-1.5 rounded-md bg-card border border-border">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">If I fix selected ({picked.size}):</span>
          <span className="text-muted-foreground tabular-nums">~{totalDays}d effort</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg font-bold tabular-nums text-muted-foreground">{score}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-lg font-bold tabular-nums" style={{ color: projBand.hsl }}>{projected}</span>
          <span className="text-[10px] font-semibold" style={{ color: projBand.hsl }}>{projBand.label}</span>
          <span className="ml-auto text-[10px] text-teal font-semibold">↓ {reduction} pts</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary mt-1.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal to-teal-light transition-all" style={{ width: `${Math.min(100, (reduction / score) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
