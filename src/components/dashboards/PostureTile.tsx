import React from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

// One posture tile, two distribution renderers (rows, donut), one drill contract.
// Every value is a count that routes into a pre-filtered inventory view.

export type PostureRole = "critical" | "high" | "medium" | "neutral";

const ROLE_TICK: Record<PostureRole, string> = {
  critical: "bg-coral",
  high: "bg-amber",
  medium: "bg-muted-foreground/50",
  neutral: "bg-teal",
};
const ROLE_TEXT: Record<PostureRole, string> = {
  critical: "text-coral",
  high: "text-amber",
  medium: "text-muted-foreground",
  neutral: "text-teal",
};
const ROLE_STROKE: Record<PostureRole, string> = {
  critical: "hsl(var(--coral))",
  high: "hsl(var(--amber))",
  medium: "hsl(var(--muted-foreground))",
  neutral: "hsl(var(--teal))",
};

export interface PostureRow {
  label: string;
  count: number;
  role: PostureRole;
  onClick?: () => void;
}
export interface DonutSlice {
  label: string;
  count: number;
  stroke: string;
  text: string;
  onClick?: () => void;
}

export type Distribution =
  | { type: "rows"; rows: PostureRow[] }
  | { type: "donut"; centerValue: string; centerLabel: string; slices: DonutSlice[] };

export interface TileTrend {
  delta: number;
  spark: number[];
} // lower is better for identity metrics
export interface PostureTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  total: number;
  caption?: string;
  hero: { value: number; caption: string; role: PostureRole };
  distribution: Distribution;
  footerNote?: string;
  onOpen: () => void;
  trend?: TileTrend; // optional; identity tiles only. Populated from posture history.
  target?: string; // optional target/SLA line
  emphasis?: boolean; // visual hierarchy: accent the most urgent tile
}

function Sparkline({ points, stroke }: { points: number[]; stroke: string }) {
  if (!points.length) return null;
  const max = Math.max(...points),
    min = Math.min(...points),
    span = max - min || 1;
  const step = 60 / (points.length - 1 || 1);
  const path = points.map((p, i) => `${(i * step).toFixed(1)},${(16 - ((p - min) / span) * 14).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 60 18" className="w-[56px] h-4">
      <polyline points={path} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

function Donut({
  slices,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = slices.reduce((s, x) => s + x.count, 0) || 1;
  const R = 15.915; // circumference ~= 100 for easy percentages
  let offset = 25; // start at top
  return (
    <div className="relative w-[88px] h-[88px] flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
        {slices.map((s, i) => {
          const pct = (s.count / total) * 100;
          const dash = `${pct} ${100 - pct}`;
          const el = (
            <circle
              key={i}
              cx="18"
              cy="18"
              r={R}
              fill="none"
              stroke={s.stroke}
              strokeWidth="4"
              strokeDasharray={dash}
              strokeDashoffset={offset}
              className={s.onClick ? "cursor-pointer" : ""}
              onClick={s.onClick}
            />
          );
          offset -= pct;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-coral text-[15px] font-semibold leading-none">{centerValue}</span>
        <span className="text-muted-foreground text-[9px] mt-0.5">{centerLabel}</span>
      </div>
    </div>
  );
}

export default function PostureTile({
  icon: Icon,
  label,
  total,
  caption,
  hero,
  distribution,
  footerNote,
  onOpen,
  trend,
  target,
  emphasis,
}: PostureTileProps) {
  const up = trend ? trend.delta > 0 : false;
  const flat = trend ? trend.delta === 0 : true;
  const trendColor = flat ? "text-muted-foreground" : up ? "text-coral" : "text-teal";
  const trendStroke = flat ? "hsl(var(--muted-foreground))" : up ? "hsl(var(--coral))" : "hsl(var(--teal))";
  const TrendIcon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <div
      className={`bg-card rounded-xl p-4 flex flex-col transition-all ${emphasis ? "border-2 border-coral" : "border border-border hover:border-border/80"}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-[12.5px] font-semibold text-foreground">{label}</span>
        {emphasis && <span className="text-[9px] text-coral bg-coral/15 px-1.5 py-0.5 rounded-full">act now</span>}
        <span className="text-[10.5px] text-muted-foreground ml-auto tabular-nums">{total.toLocaleString()}</span>
      </div>
      {caption && <div className="text-[10px] text-muted-foreground mb-2.5">{caption}</div>}

      <button onClick={onOpen} className="flex items-baseline gap-1.5 text-left mt-1 group">
        <span
          className={`text-[32px] font-semibold leading-none ${ROLE_TEXT[hero.role]}`}
          style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
        >
          {hero.value.toLocaleString()}
        </span>
        <span className="text-[11px] text-muted-foreground">{hero.caption}</span>
      </button>

      {(trend || target) && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            {trend && (
              <span className={`flex items-center gap-1 text-[10.5px] ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {trend.delta > 0 ? "+" : ""}
                {trend.delta} <span className="text-muted-foreground text-[9.5px]">vs 30d</span>
              </span>
            )}
            {target && <span className="text-[10px] text-muted-foreground">{target}</span>}
          </div>
          {trend && <Sparkline points={trend.spark} stroke={trendStroke} />}
        </div>
      )}

      {distribution.type === "rows" ? (
        <>
          <div className="text-[10px] text-muted-foreground mt-2 mb-1.5">Breakdown</div>
          <div className="flex flex-col gap-1">
            {distribution.rows.map((r) => (
              <button
                key={r.label}
                onClick={r.onClick}
                className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-secondary/50 transition-colors text-left group/row"
              >
                <span className={`w-[2px] h-3 flex-shrink-0 ${ROLE_TICK[r.role]}`} />
                <span className="text-[11px] text-muted-foreground flex-1 truncate">{r.label}</span>
                <span className="text-[11px] text-foreground font-medium tabular-nums flex-shrink-0">
                  {r.count.toLocaleString()}
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-teal opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 mt-1.5">
          <Donut
            slices={distribution.slices}
            centerValue={distribution.centerValue}
            centerLabel={distribution.centerLabel}
          />
          <div className="flex-1 flex flex-col gap-1">
            {distribution.slices.map((s) => (
              <button
                key={s.label}
                onClick={s.onClick}
                className="w-full flex items-center gap-1.5 text-left group/row"
              >
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.stroke }} />
                <span className="text-[10.5px] text-muted-foreground flex-1 truncate">{s.label}</span>
                <span className="text-[10.5px] text-foreground tabular-nums flex-shrink-0">
                  {s.count.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-border/50 mt-3">
        {footerNote ? <span className="text-[10px] text-muted-foreground">{footerNote}</span> : <span />}
        <button onClick={onOpen} className="text-[10.5px] text-teal hover:underline">
          Open
        </button>
      </div>
    </div>
  );
}
