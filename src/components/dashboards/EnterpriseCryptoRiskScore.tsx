import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react';
import { SCORE, SCORE_DELTA_7D, distribution } from '@/data/ecrsData';
import ScoreRing from './ecrs/ScoreRing';
import TrendPanel from './ecrs/TrendPanel';
import RiskDriversList from './ecrs/RiskDriversList';
import WhatIfSimulator from './ecrs/WhatIfSimulator';
import ScoreBreakdown from './ecrs/ScoreBreakdown';

interface Props { onScoreClick?: () => void; }

export default function EnterpriseCryptoRiskScore({ onScoreClick }: Props) {
  const [hoverSeg, setHoverSeg] = useState<number | null>(null);
  const improving = SCORE_DELTA_7D < 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal" />
            <h2 className="text-sm font-semibold text-foreground">Enterprise Crypto Risk Score</h2>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">CVSS-inspired weighted model · updated 2m ago</p>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${improving ? 'text-teal' : 'text-coral'}`}>
          {improving ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          {improving ? '↓' : '↑'} {Math.abs(SCORE_DELTA_7D)} pts (7d)
        </div>
      </div>

      {/* Score + distribution + trend */}
      <div className="grid grid-cols-12 gap-4 mb-3">
        <div className="col-span-5 flex items-center justify-center">
          <ScoreRing score={SCORE} hoverSeg={hoverSeg} setHoverSeg={setHoverSeg} onScoreClick={onScoreClick} />
        </div>
        <div className="col-span-4">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Asset Distribution</p>
          <div className="space-y-1">
            {distribution.map((seg, i) => (
              <div
                key={seg.label}
                onMouseEnter={() => setHoverSeg(i)}
                onMouseLeave={() => setHoverSeg(null)}
                className={`flex items-center justify-between text-[10px] px-1.5 py-1 rounded cursor-pointer transition-colors ${hoverSeg === i ? 'bg-secondary/50' : 'hover:bg-secondary/30'}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: seg.color }} />
                  <span className="text-foreground">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="tabular-nums">{seg.count.toLocaleString()}</span>
                  <span className="tabular-nums w-10 text-right">{hoverSeg === i ? `+${seg.contribPct}%` : `${seg.pct}%`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-3">
          <TrendPanel improving={improving} />
        </div>
      </div>

      {/* Smart insight */}
      <div className="bg-coral/5 border border-coral/20 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-coral mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-foreground leading-snug">
          <span className="font-semibold text-coral">3.5% of assets contribute to 42% of total risk.</span>
          <span className="text-muted-foreground"> 1 root key creates systemic exposure across 120 dependent assets in payments. Focus Critical-band identities first.</span>
        </p>
      </div>

      {/* Risk drivers w/ business context, urgency, compliance */}
      <div className="mb-3">
        <RiskDriversList />
      </div>

      {/* What-if simulator (replaces static recommended actions) */}
      <div className="mb-3">
        <WhatIfSimulator score={SCORE} />
      </div>

      {/* Explainability */}
      <div className="mt-auto">
        <ScoreBreakdown score={SCORE} />
      </div>
    </div>
  );
}
