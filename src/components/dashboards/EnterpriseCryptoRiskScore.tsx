import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { TrendingDown, TrendingUp, ChevronDown, ChevronUp, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

// ─── Score model ───────────────────────────────────────────────────────────
const SCORE = 64; // 0-100, higher = riskier
const SCORE_DELTA = -6; // 7-day change (negative = improving)
const TREND_WINDOWS = ['7d', '30d', '90d'] as const;

const trendData: Record<string, { d: string; v: number }[]> = {
  '7d': [
    { d: 'Mon', v: 70 }, { d: 'Tue', v: 71 }, { d: 'Wed', v: 68 },
    { d: 'Thu', v: 67 }, { d: 'Fri', v: 66 }, { d: 'Sat', v: 65 }, { d: 'Sun', v: 64 },
  ],
  '30d': Array.from({ length: 30 }, (_, i) => ({ d: `${i + 1}`, v: 72 - i * 0.27 + Math.sin(i / 3) * 2 })),
  '90d': Array.from({ length: 90 }, (_, i) => ({ d: `${i + 1}`, v: 78 - i * 0.15 + Math.sin(i / 5) * 3 })),
};

function scoreBand(s: number) {
  if (s >= 80) return { label: 'Critical', color: 'coral', hsl: 'hsl(var(--coral))' };
  if (s >= 60) return { label: 'High', color: 'coral', hsl: 'hsl(var(--coral))' };
  if (s >= 40) return { label: 'Medium', color: 'amber', hsl: 'hsl(var(--amber))' };
  if (s >= 20) return { label: 'Low', color: 'teal', hsl: 'hsl(var(--teal))' };
  return { label: 'Compliant', color: 'teal', hsl: 'hsl(var(--teal))' };
}

const distribution = [
  { label: 'Critical', count: 184_320, pct: 3.5, contribPct: 42, color: 'hsl(var(--coral))' },
  { label: 'High',     count: 521_400, pct: 10.0, contribPct: 28, color: 'hsl(15 72% 62%)' },
  { label: 'Medium',   count: 942_180, pct: 18.1, contribPct: 18, color: 'hsl(var(--amber))' },
  { label: 'Low',      count: 1_412_000, pct: 27.2, contribPct: 9, color: 'hsl(var(--purple))' },
  { label: 'Compliant',count: 2_140_100, pct: 41.2, contribPct: 3, color: 'hsl(var(--teal))' },
];

const drivers = [
  { name: 'Weak algorithms (RSA-1024, SHA-1)', impact: 12, assets: 6_398, page: 'quantum', filters: {} },
  { name: 'Expired & expiring certificates',    impact: 9,  assets: 13_189, page: 'inventory', filters: { status: 'Expiring' } },
  { name: 'Non-rotated secrets (>90 days)',     impact: 7,  assets: 42_180, page: 'remediation', filters: { module: 'secrets', filter: 'rotation' } },
  { name: 'Non-HSM stored keys',                impact: 6,  assets: 14_720, page: 'inventory', filters: { storage: 'non-hsm' } },
  { name: 'Over-privileged AI agent tokens',    impact: 5,  assets: 179_000, page: 'remediation', filters: { module: 'ai-agents' } },
];

const breakdown = [
  { cat: 'Algorithm Risk',  pct: 31, color: 'hsl(var(--coral))' },
  { cat: 'Lifecycle Risk',  pct: 24, color: 'hsl(var(--amber))' },
  { cat: 'Exposure Risk',   pct: 19, color: 'hsl(var(--purple))' },
  { cat: 'Access Risk',     pct: 15, color: 'hsl(15 72% 62%)' },
  { cat: 'Compliance Risk', pct: 11, color: 'hsl(var(--teal))' },
];

const recommendedActions = [
  { title: 'Replace weak algorithms (RSA-1024, SHA-1)', reduction: 12, count: 6_398, cta: 'View Assets', page: 'quantum' },
  { title: 'Rotate 42K non-rotated secrets',            reduction: 8,  count: 42_180, cta: 'Fix Now',   page: 'remediation', filters: { module: 'secrets', filter: 'rotation' } },
  { title: 'Migrate 14,720 keys to HSM',                reduction: 6,  count: 14_720, cta: 'View Assets', page: 'inventory', filters: { storage: 'non-hsm' } },
];

interface Props { onScoreClick?: () => void; }

export default function EnterpriseCryptoRiskScore({ onScoreClick }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const [trendWindow, setTrendWindow] = useState<typeof TREND_WINDOWS[number]>('7d');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [hoverSeg, setHoverSeg] = useState<number | null>(null);

  const band = scoreBand(SCORE);
  const improving = SCORE_DELTA < 0;

  const nav = (page: string, filters?: Record<string, string>) => {
    if (filters) setFilters(filters);
    setCurrentPage(page);
  };

  // Build SVG ring segments
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
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs font-semibold ${improving ? 'text-teal' : 'text-coral'}`}>
            {improving ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {improving ? '↓' : '↑'} {Math.abs(SCORE_DELTA)} pts
          </div>
          <div className="flex bg-secondary/40 rounded-md p-0.5">
            {TREND_WINDOWS.map(w => (
              <button
                key={w}
                onClick={() => setTrendWindow(w)}
                className={`text-[10px] px-2 py-0.5 rounded ${trendWindow === w ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >{w}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Score + Ring + Sparkline */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Distribution ring with central score */}
        <div className="col-span-5 flex items-center justify-center">
          <button
            onClick={onScoreClick}
            className="relative group"
            title="Click for BU/App breakdown"
          >
            <svg width={C * 2} height={C * 2} className="-rotate-90">
              {/* base track */}
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
              <span className="text-4xl font-bold leading-none" style={{ color: band.hsl }}>{SCORE}</span>
              <span className="text-[10px] font-semibold mt-0.5" style={{ color: band.hsl }}>{band.label}</span>
            </div>
          </button>
        </div>

        {/* Distribution legend */}
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

        {/* Sparkline */}
        <div className="col-span-3 flex flex-col">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">Trend ({trendWindow})</p>
          <div className="flex-1 min-h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData[trendWindow]}>
                <RTooltip
                  contentStyle={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  formatter={(v: any) => [Math.round(v), 'Score']}
                  labelFormatter={() => ''}
                />
                <Line type="monotone" dataKey="v" stroke={improving ? 'hsl(var(--teal))' : 'hsl(var(--coral))'} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            Started at <span className="font-semibold text-foreground tabular-nums">{Math.round(trendData[trendWindow][0].v)}</span>
          </p>
        </div>
      </div>

      {/* Smart insight */}
      <div className="bg-coral/5 border border-coral/20 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-coral mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-foreground leading-snug">
          <span className="font-semibold text-coral">3.5% of assets contribute to 42% of total risk.</span>
          <span className="text-muted-foreground"> Focus remediation on Critical-band identities for fastest score reduction.</span>
        </p>
      </div>

      {/* Top Risk Drivers */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-foreground mb-2">Top Risk Drivers</p>
        <div className="space-y-1.5">
          {drivers.map(d => (
            <button
              key={d.name}
              onClick={() => nav(d.page, d.filters)}
              className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-coral tabular-nums w-10 flex-shrink-0">+{d.impact} pts</span>
                <span className="text-[11px] text-foreground truncate">{d.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground tabular-nums">{d.assets.toLocaleString()} assets</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-teal" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recommended actions */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-foreground mb-2">Recommended Actions</p>
        <div className="space-y-1.5">
          {recommendedActions.map(a => (
            <div key={a.title} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border border-teal/20 bg-teal/5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-foreground truncate">{a.title}</p>
                <p className="text-[9.5px] text-teal font-semibold mt-0.5">↓ Reduce risk by {a.reduction}%</p>
              </div>
              <button
                onClick={() => nav(a.page, (a as any).filters)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-teal text-primary-foreground hover:bg-teal-light transition-colors flex-shrink-0"
              >
                {a.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Why is the score X? — expandable breakdown */}
      <div className="mt-auto">
        <button
          onClick={() => setShowBreakdown(s => !s)}
          className="w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground py-1"
        >
          <span className="font-medium">Why is the score {SCORE}?</span>
          {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showBreakdown && (
          <div className="mt-2 space-y-2">
            {/* Stacked bar */}
            <div className="flex h-2 rounded-full overflow-hidden">
              {breakdown.map(b => (
                <div key={b.cat} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.cat}: ${b.pct}%`} />
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {breakdown.map(b => (
                <div key={b.cat} className="text-[9.5px]">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-sm" style={{ background: b.color }} />
                    <span className="text-muted-foreground truncate">{b.cat.replace(' Risk', '')}</span>
                  </div>
                  <p className="font-semibold text-foreground tabular-nums">{b.pct}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
