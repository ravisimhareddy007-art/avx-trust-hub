import React from 'react';
import { distribution, scoreBand } from '@/data/ecrsData';

interface Props {
  score: number;
  hoverSeg: number | null;
  setHoverSeg: (i: number | null) => void;
  onScoreClick?: () => void;
}

export default function ScoreRing({ score, hoverSeg, setHoverSeg, onScoreClick }: Props) {
  const band = scoreBand(score);
  const R = 78, C = 88, STROKE = 14;
  const circ = 2 * Math.PI * R;
  let cumulative = 0;
  const segments = distribution.map((seg, i) => {
    const len = (seg.pct / 100) * circ;
    const dash = `${len} ${circ - len}`;
    const offset = -cumulative;
    cumulative += len;
    return { ...seg, dash, offset, idx: i };
  });

  return (
    <button onClick={onScoreClick} className="relative group" title="Click for BU/App breakdown">
      <svg width={C * 2} height={C * 2} className="-rotate-90">
        <circle cx={C} cy={C} r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth={STROKE} />
        {segments.map(seg => (
          <circle
            key={seg.label}
            cx={C} cy={C} r={R} fill="none"
            stroke={seg.color}
            strokeWidth={hoverSeg === seg.idx ? STROKE + 4 : STROKE}
            strokeDasharray={seg.dash}
            strokeDashoffset={seg.offset}
            onMouseEnter={() => setHoverSeg(seg.idx)}
            onMouseLeave={() => setHoverSeg(null)}
            className="transition-all cursor-pointer"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">ECRS</span>
        <span className="text-4xl font-bold leading-none" style={{ color: band.hsl }}>{score}</span>
        <span className="text-[10px] font-semibold mt-0.5" style={{ color: band.hsl }}>{band.label}</span>
      </div>
    </button>
  );
}
