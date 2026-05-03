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

function ErsGauge({ score, hsl, label }: { score: number; hsl: string; label: string }) {
  const R = 70;
  const cx = 110;
  const cy = 105;
  const startAngle = -210;
  const totalDegrees = 240;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = { x: cx + R * Math.cos(toRad(start)), y: cy + R * Math.sin(toRad(start)) };
    const e = { x: cx + R * Math.cos(toRad(end)), y: cy + R * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const tickPath = (angle: number) => {
    const r1 = { x: cx + (R - 16) * Math.cos(toRad(angle)), y: cy + (R - 16) * Math.sin(toRad(angle)) };
    const r2 = { x: cx + (R + 2)  * Math.cos(toRad(angle)), y: cy + (R + 2)  * Math.sin(toRad(angle)) };
    return `M ${r1.x} ${r1.y} L ${r2.x} ${r2.y}`;
  };
  const lowEnd  = startAngle + 0.29 * totalDegrees;
  const medEnd  = startAngle + 0.59 * totalDegrees;
  const highEnd = startAngle + 0.79 * totalDegrees;
  const arcEnd  = startAngle + totalDegrees;
  const filled  = startAngle + (score / 100) * totalDegrees;
  const dotX = cx + (R - 6) * Math.cos(toRad(filled));
  const dotY = cy + (R - 6) * Math.sin(toRad(filled));
  const TEAL  = 'hsl(162 72% 37%)';
  const BLUE  = 'hsl(210 80% 56%)';
  const AMBER = 'hsl(38 78% 51%)';
  const CORAL = 'hsl(16 72% 51%)';
  return (
    <svg width="220" height="128" viewBox="0 0 220 128">
      <path d={arcPath(startAngle, lowEnd)}  fill="none" stroke={TEAL}  strokeWidth="12" strokeLinecap="butt" opacity="0.25" />
      <path d={arcPath(lowEnd,  medEnd)}     fill="none" stroke={BLUE}  strokeWidth="12" strokeLinecap="butt" opacity="0.25" />
      <path d={arcPath(medEnd,  highEnd)}    fill="none" stroke={AMBER} strokeWidth="12" strokeLinecap="butt" opacity="0.25" />
      <path d={arcPath(highEnd, arcEnd)}     fill="none" stroke={CORAL} strokeWidth="12" strokeLinecap="butt" opacity="0.25" />
      <path d={arcPath(startAngle, filled)}  fill="none" stroke={hsl}   strokeWidth="12" strokeLinecap="round" style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      <path d={tickPath(lowEnd)}  stroke="hsl(var(--background))" strokeWidth="2.5" strokeLinecap="round" />
      <path d={tickPath(medEnd)}  stroke="hsl(var(--background))" strokeWidth="2.5" strokeLinecap="round" />
      <path d={tickPath(highEnd)} stroke="hsl(var(--background))" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={dotX} cy={dotY} r="5" fill={hsl} style={{ transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x="14"  y="112" textAnchor="middle" fontSize="8" fill={TEAL}  opacity="0.8">LOW</text>
      <text x="50"  y="28"  textAnchor="middle" fontSize="8" fill={BLUE}  opacity="0.8">MED</text>
      <text x="170" y="28"  textAnchor="middle" fontSize="8" fill={AMBER} opacity="0.8">HIGH</text>
      <text x="206" y="112" textAnchor="middle" fontSize="8" fill={CORAL} opacity="0.8">CRIT</text>
      <text x={cx} y="90"  textAnchor="middle" fontSize="22" fontWeight="700" fill={hsl} style={{ transition: 'fill 0.7s ease' }}>{label.toUpperCase()}</text>
      <text x={cx} y="108" textAnchor="middle" fontSize="13" fontWeight="500" fill={hsl} fillOpacity="0.75">{score}</text>
      <text x={cx} y="120" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.35">/ 100</text>
    </svg>
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
          <h2 className="text-sm font-semibold text-foreground">Enterprise Risk Score</h2>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">ERS</span>
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
      <div className="flex flex-col items-center mb-3 flex-shrink-0">
        <ErsGauge score={ers.ers} hsl={sevHsl} label={ers.severity} />
        <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-full mt-1 ${improving ? 'bg-teal/15 text-teal' : 'bg-coral/15 text-coral'}`}>
          {improving
            ? <><TrendingDown className="w-3 h-3" /> {Math.abs(SCORE_DELTA_7D)} pts — risk reduced this week</>
            : <><TrendingUp className="w-3 h-3" /> {Math.abs(SCORE_DELTA_7D)} pts — risk increased this week</>
          }
        </div>
      </div>

      {/* Driver contribution bar */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          What's driving ETS
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
                <span className="text-[10.5px] text-muted-foreground flex-1 truncate">{d.label}</span>
                <span className="text-[10.5px] font-semibold text-foreground tabular-nums">{d.count.toLocaleString()}</span>
                <span className="text-[9.5px] text-teal tabular-nums whitespace-nowrap">+{d.pts} pts</span>
                <ArrowRight className="w-2.5 h-2.5 text-teal opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
