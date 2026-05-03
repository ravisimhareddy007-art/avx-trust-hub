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
    <svg width="128" height="128" viewBox="0 0 128 128">
      <path d={arcPath(startAngle, startAngle + totalDegrees)} fill="none"
        stroke="currentColor" strokeOpacity="0.1" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(startAngle, startAngle + filled)} fill="none"
        stroke={hsl} strokeWidth="10" strokeLinecap="round"
        style={{ transition: 'all 0.7s ease' }} />
      <text x="64" y="62" textAnchor="middle" fontSize="20" fontWeight="bold"
        fill={hsl} style={{ transition: 'fill 0.7s ease' }}>{label.toUpperCase()}</text>
      <text x="64" y="82" textAnchor="middle" fontSize="13" fontWeight="600"
        fill="currentColor" fillOpacity="0.55">{score}</text>
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
                <span className="font-semibold">Enterprise Trust Score (ETS)</span> measures your organisation-wide cryptographic security posture. Higher scores mean greater risk. Scores are weighted by asset criticality and environment — production assets with Critical business impact carry 4× more weight. The score also incorporates a quantum vulnerability component that increases toward the NIST 2030 deadline.
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
          {SCORE_DELTA_7D === 0 ? (
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
