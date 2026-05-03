import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Sparkles, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { useRisk } from '@/context/RiskContext';
import { useNav } from '@/context/NavigationContext';
import { severityHsl } from '@/lib/risk/types';
import { COUNT_NOUNS } from '@/lib/filters/cryptoFilters';


const SCORE_DELTA_7D = -4;

const BI_COLOR: Record<string, string> = {
  Critical: 'bg-coral/15 text-coral border-coral/30',
  High:     'bg-amber/15 text-amber border-amber/30',
  Moderate: 'bg-purple/15 text-purple-light border-purple/30',
  Low:      'bg-secondary text-muted-foreground border-border',
};

const ZONES = [
  { key: 'Low',      min: 0,  max: 29,  pct: 29, color: 'hsl(var(--teal))' },
  { key: 'Medium',   min: 30, max: 59,  pct: 30, color: 'hsl(210 80% 56%)' },
  { key: 'High',     min: 60, max: 79,  pct: 20, color: 'hsl(var(--amber))' },
  { key: 'Critical', min: 80, max: 100, pct: 21, color: 'hsl(var(--coral))' },
];

function zoneFor(score: number) {
  return ZONES.find(z => score >= z.min && score <= z.max) ?? ZONES[ZONES.length - 1];
}

function ErsGauge({ score, label }: { score: number; hsl: string; label: string }) {
  const R = 70;
  const CIRC = Math.PI * R; // semicircle length ≈ 219.9
  const zone = zoneFor(score);
  const fillLen = (Math.max(0, Math.min(100, score)) / 100) * CIRC;

  // Needle position at score along the arc
  const angleDeg = 180 + (score / 100) * 180; // 180 (left) → 360 (right)
  const a = (angleDeg * Math.PI) / 180;
  const cx = 90, cy = 95;
  const nx = cx + R * Math.cos(a);
  const ny = cy + R * Math.sin(a);

  // Build cumulative offsets for each segment
  let offset = 0;
  const segs = ZONES.map(z => {
    const len = (z.pct / 100) * CIRC;
    const seg = { ...z, len, dashOffset: -offset };
    offset += len;
    return seg;
  });

  return (
    <div className="flex flex-col items-start">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* Track segments — rotate so 0 starts on the left and sweeps clockwise */}
        <g transform={`rotate(180 ${cx} ${cy})`}>
          {segs.map(s => (
            <circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={s.color}
              strokeOpacity="0.25"
              strokeWidth="12"
              strokeDasharray={`${s.len} ${CIRC * 2}`}
              strokeDashoffset={s.dashOffset}
              strokeLinecap="butt"
            />
          ))}
          {/* Score fill arc */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={zone.color}
            strokeWidth="12"
            strokeDasharray={`${fillLen} ${CIRC * 2}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.7s ease, stroke 0.7s ease' }}
          />
        </g>
        {/* End-cap dot at score position */}
        <circle cx={nx} cy={ny} r="4.5" fill={zone.color} stroke="hsl(var(--card))" strokeWidth="1.5" />
        {/* Center text */}
        <text x={cx} y="78" textAnchor="middle" fontSize="18" fontWeight="bold" fill={zone.color}>
          {label.toUpperCase()}
        </text>
        <text x={cx} y="94" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--muted-foreground))">
          {score}
        </text>
        <text x={cx} y="105" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fillOpacity="0.5">
          / 100
        </text>
      </svg>

      {/* Zone legend */}
      <div className="flex items-center gap-2 mt-1 text-[9px] leading-none">
        {ZONES.map(z => (
          <span key={z.key} className="inline-flex items-center gap-1" style={{ color: z.color }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: z.color }} />
            {z.key} {z.min}–{z.max}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EnterpriseRiskScore() {
  const { ers } = useRisk();
  const { setCurrentPage, setFilters } = useNav();
  const sevHsl = severityHsl(ers.severity);
  const improving = SCORE_DELTA_7D < 0;

  const nav = (filters: Record<string, string>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AVX Drilldown]', { source: 'EnterpriseRiskScore', filters });
    }
    setFilters({ tab: 'identities', filterId: filters.filterId || '' });
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal" />
          <h2 className="text-sm font-semibold text-foreground">Enterprise Trust Score</h2>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">ETS</span>
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-72 bg-card border border-border rounded-lg shadow-lg px-3 py-2.5">
              <p className="text-[11px] text-foreground leading-relaxed">
                <span className="font-semibold">Enterprise Trust Score (ETS)</span> measures your organisation-wide cryptographic security posture. Higher scores indicate greater risk. Scores are weighted by asset criticality — production assets with Critical business impact carry 4× more weight. Incorporates a quantum vulnerability component that increases toward the NIST 2030 deadline.
              </p>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">updated 2m ago</span>
      </div>

      {/* Gauge + verdict */}
      <div className="flex items-start gap-4 mb-3">
        <ErsGauge score={ers.ers} hsl={sevHsl} label={ers.severity} />
        <div className="flex-1 pt-1">
          {(SCORE_DELTA_7D as number) === 0 ? (
            <div className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded mb-1.5 bg-secondary text-muted-foreground">
              No change this week
            </div>
          ) : (
            <div className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded mb-1.5 ${
              improving ? 'bg-teal/15 text-teal' : 'bg-coral/15 text-coral'
            }`}>
              {improving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {improving
                ? `↓ ${Math.abs(SCORE_DELTA_7D)} pts better this week`
                : `↑ +${Math.abs(SCORE_DELTA_7D)} pts worse this week`}
            </div>
          )}
          <p className="text-[12px] text-foreground leading-snug">
            {ers.topAssets.filter(a => a.bi === 'Critical').length} Critical-impact assets driving the score.
            {' '}Top driver:{' '}
            <span className="font-semibold text-coral">{ers.driverBuckets[0]?.label ?? '—'}</span>.
          </p>
          {ers.floorApplied && ers.floorAsset && (
            <div className="mt-1.5 flex items-start gap-1 text-[10px] text-coral leading-snug">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>
                <span className="font-semibold">Floor rule active</span> — held by{' '}
                <span className="font-mono">{ers.floorAsset.name}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Driver contribution bar */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          What's driving ERS
        </p>

        {/* Stacked horizontal bar — each segment proportional to pts */}
        <div className="flex h-4 rounded-md overflow-hidden gap-px mb-2.5">
          {ers.driverBuckets.map((d, i) => {
            const totalPts = ers.driverBuckets.reduce((s, b) => s + b.pts, 0) || 1;
            const pct = Math.max(6, (d.pts / totalPts) * 100);
            const segColors = ['bg-coral', 'bg-amber', 'bg-purple', 'bg-teal', 'bg-blue-400'];
            return (
              <button
                key={d.id}
                onClick={() => nav(d.filters)}
                className={`${segColors[i]} hover:opacity-75 transition-opacity flex-shrink-0`}
                style={{ width: `${pct}%` }}
                title={`${d.label} · ${d.count.toLocaleString()} affected · +${d.pts} pts to ERS`}
              />
            );
          })}
        </div>

        {/* Legend rows — each clickable to filtered inventory */}
        <div className="space-y-0.5">
          {ers.driverBuckets.map((d, i) => {
            const dotColors = ['bg-coral', 'bg-amber', 'bg-purple', 'bg-teal', 'bg-blue-400'];
            return (
              <button
                key={d.id}
                onClick={() => nav(d.filters)}
                className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary/40 transition-colors text-left group"
              >
                <div className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${dotColors[i]}`} />
                <span className="text-[10.5px] font-semibold text-foreground tabular-nums whitespace-nowrap">{d.count.toLocaleString()} {COUNT_NOUNS[d.id]}</span>
                <span className="text-[10.5px] text-muted-foreground flex-1 truncate">· {d.label}</span>
                <span className="text-[10.5px] font-semibold text-teal tabular-nums whitespace-nowrap">+{d.pts} pts</span>
                <ArrowRight className="w-2.5 h-2.5 text-teal opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
