import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { SCORE_DELTA_7D, scoreBand } from '@/data/ecrsData';
import { useDashboard } from '@/context/DashboardContext';
import ImpactBars from './ecrs/ImpactBars';
import RiskDriversList from './ecrs/RiskDriversList';
import WhatIfSimulator from './ecrs/WhatIfSimulator';
import ScoreBreakdown from './ecrs/ScoreBreakdown';

function ScoreGauge({ score, band }: { score: number; band: { hsl: string; label: string } }) {
  const R = 52;
  const cx = 64, cy = 64;
  const startAngle = -220;
  const totalDegrees = 260;
  const filled = (score / 100) * totalDegrees;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = { x: cx + R * Math.cos(toRad(start)), y: cy + R * Math.sin(toRad(start)) };
    const e = { x: cx + R * Math.cos(toRad(end)), y: cy + R * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <path d={arcPath(startAngle, startAngle + totalDegrees)} fill="none"
          stroke="currentColor" strokeOpacity="0.1" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath(startAngle, startAngle + filled)} fill="none"
          stroke={band.hsl} strokeWidth="10" strokeLinecap="round"
          style={{ transition: 'all 0.7s ease' }} />
        <text x="64" y="60" textAnchor="middle" fontSize="28" fontWeight="bold"
          fill={band.hsl} fontFamily="inherit"
          style={{ transition: 'fill 0.7s ease' }}>{score}</text>
        <text x="64" y="78" textAnchor="middle" fontSize="11" fill="currentColor"
          fillOpacity="0.6" fontFamily="inherit">{band.label}</text>
      </svg>
    </div>
  );
}

export default function EnterpriseCryptoRiskScore() {
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
        <span className="text-[10px] text-muted-foreground">updated 2m ago</span>
      </div>

      {/* Score gauge + verdict sentence */}
      <div className="flex items-start gap-4 mb-4">
        <ScoreGauge score={score} band={band} />
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

      {/* Top 3 impact bars */}
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
