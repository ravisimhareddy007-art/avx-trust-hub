import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { SCORE_DELTA_7D, scoreBand } from '@/data/ecrsData';
import { useDashboard } from '@/context/DashboardContext';
import ImpactBars from './ecrs/ImpactBars';
import RiskDriversList from './ecrs/RiskDriversList';
import WhatIfSimulator from './ecrs/WhatIfSimulator';
import ScoreBreakdown from './ecrs/ScoreBreakdown';

interface Props { onScoreClick?: () => void; }

export default function EnterpriseCryptoRiskScore({ onScoreClick }: Props) {
  const { score } = useDashboard();
  const [simOpen, setSimOpen] = useState(false);
  const improving = SCORE_DELTA_7D < 0;
  const band = scoreBand(score);

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal" />
          <h2 className="text-sm font-semibold text-foreground">Enterprise Crypto Risk Score</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">CVSS-inspired · updated 2m ago</span>
      </div>

      {/* Score + verdict sentence */}
      <div className="flex items-start gap-4 mb-4">
        <button
          onClick={onScoreClick}
          className="flex flex-col items-center group"
          title="Click for BU/App breakdown"
        >
          <span
            className="text-[56px] font-bold leading-none tabular-nums transition-all"
            style={{ color: band.hsl }}
          >
            {score}
          </span>
          <span
            className="text-[11px] font-semibold mt-1 px-2 py-0.5 rounded"
            style={{ background: `${band.hsl}20`, color: band.hsl }}
          >
            {band.label}
          </span>
        </button>
        <div className="flex-1 pt-1">
          <div
            className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded mb-1.5 ${
              improving ? 'bg-teal/15 text-teal' : 'bg-coral/15 text-coral'
            }`}
          >
            {improving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {improving ? '↓' : '↑'} {Math.abs(SCORE_DELTA_7D)} pts (7d)
          </div>
          <p className="text-[12px] text-foreground leading-snug">
            Score dropped <span className="font-semibold text-teal">6 pts</span> in 7 days — driven by
            <span className="font-semibold text-coral"> weak algorithm exposure</span> in 3 production systems.
          </p>
        </div>
      </div>

      {/* Top 3 impact bars (replaces donut + 5 bands of millions) */}
      <div className="mb-3">
        <ImpactBars />
      </div>

      {/* Single CTA: opens simulator */}
      <button
        onClick={() => setSimOpen(o => !o)}
        className="w-full flex items-center justify-between text-[11px] font-semibold px-3 py-2 rounded-md bg-teal/10 hover:bg-teal/20 text-teal border border-teal/30 transition-colors mb-3"
      >
        <span>What fixes the score fastest?</span>
        <ArrowRight className={`w-3.5 h-3.5 transition-transform ${simOpen ? 'rotate-90' : ''}`} />
      </button>

      {simOpen && (
        <div className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <WhatIfSimulator score={score} />
        </div>
      )}

      {/* Risk drivers — context-rich, with AI batch CTAs */}
      <div className="mb-3 flex-1 overflow-y-auto scrollbar-thin">
        <RiskDriversList />
      </div>

      {/* Explainability */}
      <div className="mt-auto">
        <ScoreBreakdown score={score} />
      </div>
    </div>
  );
}
