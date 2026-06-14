import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ExplainerFactor {
  label: string;
  value: number;       // 0..100 contribution input
  weightPct: number;   // share of the score, for the bar width
  detail?: string;
}

interface ScoreExplainerProps {
  title: string;
  band: 'Critical' | 'High' | 'Medium' | 'Low';
  factors: ExplainerFactor[];
  why: string;
  formula?: string;
}

const BAND_COLOR: Record<ScoreExplainerProps['band'], string> = {
  Critical: 'text-coral', High: 'text-purple-light', Medium: 'text-amber', Low: 'text-teal',
};
const BAR_COLOR: Record<ScoreExplainerProps['band'], string> = {
  Critical: 'bg-coral', High: 'bg-purple-light', Medium: 'bg-amber', Low: 'bg-teal',
};

// A small, self-contained "why this score" popover. Not a side panel:
// it shows factor contributions as mini bars plus a one-line rationale.
export default function ScoreExplainer({ title, band, factors, why, formula }: ScoreExplainerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Explain score"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${BAND_COLOR[band]}`}>{band}</span>
        </div>

        <div className="space-y-2">
          {factors.map((f, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">
                  {f.label}{f.detail ? ` · ${f.detail}` : ''}
                </span>
                <span className="tabular-nums text-foreground font-semibold">{Math.round(f.value)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full ${BAR_COLOR[band]} rounded-full transition-all`}
                  style={{ width: `${Math.min(100, Math.max(0, f.value))}%`, opacity: 0.4 + 0.6 * (f.weightPct / 100) }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-foreground leading-relaxed border-t border-border pt-2">{why}</p>

        {formula && (
          <p className="text-[10px] font-mono text-muted-foreground bg-secondary/40 rounded px-2 py-1 leading-relaxed">
            {formula}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
