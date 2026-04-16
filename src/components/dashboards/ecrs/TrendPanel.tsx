import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { trendData, trendDeltas } from '@/data/ecrsData';
import { useNav } from '@/context/NavigationContext';

const WINDOWS = ['7d', '30d', '90d'] as const;

interface Props { improving: boolean; }

export default function TrendPanel({ improving }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const [w, setW] = useState<typeof WINDOWS[number]>('7d');
  const [open, setOpen] = useState(false);
  const data = trendData[w];
  const deltas = trendDeltas[w];
  const net = deltas.reduce((s, d) => s + d.pts, 0);

  const nav = (p?: string, f?: Record<string, string>) => {
    if (!p) return;
    if (f) setFilters(f);
    setCurrentPage(p);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-muted-foreground font-medium">Trend</p>
        <div className="flex bg-secondary/40 rounded-md p-0.5">
          {WINDOWS.map(x => (
            <button key={x} onClick={() => setW(x)}
              className={`text-[9px] px-1.5 py-0.5 rounded ${w === x ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <RTooltip
              contentStyle={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
              formatter={(v: any) => [Math.round(v), 'Score']}
              labelFormatter={() => ''}
            />
            <Line type="monotone" dataKey="v" stroke={improving ? 'hsl(var(--teal))' : 'hsl(var(--coral))'} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground mt-1"
      >
        <span>What changed ({w}) · net <span className={`font-semibold ${net <= 0 ? 'text-teal' : 'text-coral'}`}>{net > 0 ? '+' : ''}{net} pts</span></span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {deltas.map((d, i) => (
            <button
              key={i}
              onClick={() => nav(d.page, d.filters)}
              className="w-full flex items-center justify-between text-left px-1.5 py-1 rounded hover:bg-secondary/40 group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[10px] font-bold tabular-nums w-8 flex-shrink-0 ${d.pts < 0 ? 'text-teal' : 'text-coral'}`}>
                  {d.pts > 0 ? '+' : ''}{d.pts}
                </span>
                <span className="text-[10px] text-foreground truncate">{d.reason}</span>
              </div>
              {d.page && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground group-hover:text-teal flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
