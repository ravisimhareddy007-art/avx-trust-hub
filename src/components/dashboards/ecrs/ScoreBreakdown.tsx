import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { breakdown } from '@/data/ecrsData';

interface Props { score: number; }

export default function ScoreBreakdown({ score }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground py-1"
      >
        <span className="font-medium flex items-center gap-1">
          <Info className="w-3 h-3" /> How is the score {score} calculated?
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[10px] text-muted-foreground leading-snug">
            CVSS-inspired weighted model: <span className="text-foreground">Base</span> (algorithm + exposure) · <span className="text-foreground">Temporal</span> (age, rotation delay) · <span className="text-foreground">Environmental</span> (criticality, data sensitivity). Aggregated via weighted average + max-risk influence.
          </p>
          <div className="flex h-2 rounded-full overflow-hidden">
            {breakdown.map(b => (
              <div key={b.cat} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.cat}: ${b.pct}%`} />
            ))}
          </div>
          <div className="space-y-1">
            {breakdown.map(b => (
              <div key={b.cat} className="flex items-center justify-between text-[10px] px-1.5 py-1 rounded hover:bg-secondary/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ background: b.color }} />
                  <span className="text-foreground">{b.cat}</span>
                  <span className="text-muted-foreground truncate">— {b.desc}</span>
                </div>
                <span className="font-semibold text-foreground tabular-nums flex-shrink-0">{b.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
