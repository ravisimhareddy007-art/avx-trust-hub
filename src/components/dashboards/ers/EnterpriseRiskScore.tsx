import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Sparkles, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { useRisk } from '@/context/RiskContext';
import { useNav } from '@/context/NavigationContext';
import { severityHsl } from '@/lib/risk/types';
import ErsWhyDrawer from './ErsWhyDrawer';

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
      <text x="64" y="60" textAnchor="middle" fontSize="28" fontWeight="bold"
        fill={hsl} style={{ transition: 'fill 0.7s ease' }}>{score}</text>
      <text x="64" y="78" textAnchor="middle" fontSize="11"
        fill="currentColor" fillOpacity="0.6">{label}</text>
    </svg>
  );
}

export default function EnterpriseRiskScore() {
  const { ers } = useRisk();
  const { setCurrentPage, setFilters } = useNav();
  const [whyOpen, setWhyOpen] = useState(false);
  const sevHsl = severityHsl(ers.severity);
  const improving = SCORE_DELTA_7D < 0;

  const navAsset = (assetId: string) => {
    setFilters({ tab: 'infrastructure', assetId });
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
        </div>
        <span className="text-[10px] text-muted-foreground">updated 2m ago</span>
      </div>

      {/* Gauge + verdict */}
      <div className="flex items-start gap-4 mb-3">
        <ErsGauge score={ers.ers} hsl={sevHsl} label={ers.severity} />
        <div className="flex-1 pt-1">
          <div className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded mb-1.5 ${
            improving ? 'bg-teal/15 text-teal' : 'bg-coral/15 text-coral'
          }`}>
            {improving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {improving ? '↓' : '↑'} {Math.abs(SCORE_DELTA_7D)} pts (7d)
          </div>
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

      {/* Top contributing assets — replaces old factor bars */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
          Top contributing assets
        </p>
        <div className="space-y-1">
          {ers.topAssets.slice(0, 4).map(a => {
            const arsHsl = severityHsl(a.ars >= 80 ? 'Critical' : a.ars >= 60 ? 'High' : a.ars >= 30 ? 'Medium' : 'Low');
            return (
              <button
                key={a.id}
                onClick={() => navAsset(a.id)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/40 text-left transition-colors"
              >
                <span className="text-[11px] font-mono text-foreground truncate">{a.name}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${BI_COLOR[a.bi]}`}>{a.bi}</span>
                <span className="text-[10.5px] font-bold tabular-nums" style={{ color: arsHsl }}>{a.ars}</span>
                <ArrowRight className="w-2.5 h-2.5 text-teal" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Single primary CTA: opens the Why drawer */}
      <button
        onClick={() => setWhyOpen(true)}
        className="w-full flex items-center justify-between text-[11px] font-semibold px-3 py-2 rounded-md bg-teal/10 hover:bg-teal/20 text-teal border border-teal/30 transition-colors mb-3"
      >
        <span>Why is ERS {ers.ers}? · See ranked drivers, assets & workflows</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Methodology footnote */}
      <div className="mt-auto pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>
            ERS = criticality-weighted average of asset risk score across {ers.topAssets.length}+ assets.
            {' '}Floor rule: ≥85% of highest Critical-prod ARS.
          </span>
        </div>
      </div>

      <ErsWhyDrawer open={whyOpen} onClose={() => setWhyOpen(false)} />
    </div>
  );
}
