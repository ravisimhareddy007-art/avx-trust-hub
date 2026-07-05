import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// One posture tile, three distribution renderers (rows, donut, bars) plus an
// optional top-right view dropdown. Every value is a count that routes into
// filtered inventory. No footer action: the hero, bars, rows and slices are the
// click targets.

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
export interface Bar {
  label: string;
  count: number;
  color: string;
  onClick?: () => void;
}

export type Distribution =
  | { type: "rows"; rows: PostureRow[] }
  | { type: "donut"; centerValue: string; centerLabel: string; slices: DonutSlice[] }
  | { type: "bars"; bars: Bar[]; xLabel?: string; yLabel?: string };

export interface TileView {
  label: string;
  hero?: { value: number; caption: string; role: PostureRole };
  distribution: Distribution;
}

export interface PostureTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  total: number;
  caption?: string;
  hero: { value: number; caption: string; role: PostureRole };
  distribution?: Distribution;
  views?: TileView[];
  footerNote?: string;
  onOpen: () => void;
  emphasis?: boolean;
}

function ViewDropdown({
  views,
  active,
  setActive,
}: {
  views: TileView[];
  active: number;
  setActive: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border rounded-full pl-2.5 pr-1.5 py-0.5 hover:text-foreground hover:border-border/80 transition-colors"
      >
        {views[active].label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-card border border-border rounded-lg py-1 min-w-[92px] shadow-lg">
            {views.map((v, i) => (
              <button
                key={v.label}
                onClick={() => {
                  setActive(i);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1 text-[10.5px] hover:bg-secondary/60 transition-colors ${i === active ? "text-teal" : "text-muted-foreground"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
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
  const R = 15.915;
  let offset = 25;
  return (
    <div className="relative w-[88px] h-[88px] flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
        {slices.map((s, i) => {
          const pct = (s.count / total) * 100;
          const el = (
            <circle
              key={i}
              cx="18"
              cy="18"
              r={R}
              fill="none"
              stroke={s.stroke}
              strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
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

function BarsChart({ bars, xLabel, yLabel }: { bars: Bar[]; xLabel?: string; yLabel?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  const W = 256,
    H = 130,
    padL = 34,
    padT = 12,
    padB = 38;
  const plotH = H - padT - padB;
  const bw = (W - padL - 8) / bars.length;
  const barW = Math.min(30, bw * 0.6);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "130px" }}
      role="img"
      aria-label={`${yLabel || "count"} by ${xLabel || "bucket"}`}
    >
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      <line x1={padL} y1={padT + plotH} x2={W - 4} y2={padT + plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      <text x={padL - 4} y={padT + 4} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
        {max.toLocaleString()}
      </text>
      <text x={padL - 4} y={padT + plotH} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
        0
      </text>
      {yLabel && (
        <text
          x={10}
          y={padT + plotH / 2}
          textAnchor="middle"
          fontSize="8.5"
          fill="hsl(var(--muted-foreground))"
          transform={`rotate(-90 10 ${padT + plotH / 2})`}
        >
          {yLabel}
        </text>
      )}
      {bars.map((b, i) => {
        const h = (b.count / max) * plotH;
        const x = padL + i * bw + (bw - barW) / 2;
        const y = padT + plotH - h;
        return (
          <g key={b.label + i} className={b.onClick ? "cursor-pointer" : ""} onClick={b.onClick}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} fill={b.color} rx="1.5" />
            <text
              x={x + barW / 2}
              y={y - 3}
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              {b.count.toLocaleString()}
            </text>
            <text
              x={x + barW / 2}
              y={padT + plotH + 10}
              textAnchor="middle"
              fontSize="7.3"
              fill="hsl(var(--muted-foreground))"
            >
              {b.label}
            </text>
          </g>
        );
      })}
      {xLabel && (
        <text
          x={padL + (W - padL) / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize="8.5"
          fill="hsl(var(--muted-foreground))"
        >
          {xLabel}
        </text>
      )}
    </svg>
  );
}

function DistributionView({ d }: { d: Distribution }) {
  if (d.type === "rows") {
    return (
      <div className="flex flex-col gap-1 mt-1">
        {d.rows.map((r) => (
          <button
            key={r.label}
            onClick={r.onClick}
            className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-secondary/50 transition-colors text-left"
          >
            <span className={`w-[2px] h-3 flex-shrink-0 ${ROLE_TICK[r.role]}`} />
            <span className="text-[11px] text-muted-foreground flex-1 truncate">{r.label}</span>
            <span className="text-[11px] text-foreground font-medium tabular-nums flex-shrink-0">
              {r.count.toLocaleString()}
            </span>
          </button>
        ))}
      </div>
    );
  }
  if (d.type === "bars")
    return (
      <div className="mt-1">
        <BarsChart bars={d.bars} xLabel={d.xLabel} yLabel={d.yLabel} />
      </div>
    );
  return (
    <div className="flex items-center gap-3 mt-1.5">
      <Donut slices={d.slices} centerValue={d.centerValue} centerLabel={d.centerLabel} />
      <div className="flex-1 flex flex-col gap-1">
        {d.slices.map((s) => (
          <button key={s.label} onClick={s.onClick} className="w-full flex items-center gap-1.5 text-left">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.stroke }} />
            <span className="text-[10.5px] text-muted-foreground flex-1 truncate">{s.label}</span>
            <span className="text-[10.5px] text-foreground tabular-nums flex-shrink-0">{s.count.toLocaleString()}</span>
          </button>
        ))}
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
  views,
  footerNote,
  onOpen,
  emphasis,
}: PostureTileProps) {
  const [active, setActive] = useState(0);
  const view = views ? views[active] : null;
  const dist = view ? view.distribution : distribution!;
  const shownHero = view && view.hero ? view.hero : hero;
  const hasViews = !!(views && views.length > 1);
  return (
    <div
      className={`bg-card rounded-xl p-4 flex flex-col transition-all ${emphasis ? "border-2 border-coral" : "border border-border hover:border-border/80"}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-[12.5px] font-semibold text-foreground">{label}</span>
        {emphasis && <span className="text-[9px] text-coral bg-coral/15 px-1.5 py-0.5 rounded-full">act now</span>}
        <div className="ml-auto flex-shrink-0">
          {hasViews ? (
            <ViewDropdown views={views!} active={active} setActive={setActive} />
          ) : (
            <span className="text-[10.5px] text-muted-foreground tabular-nums">{total.toLocaleString()}</span>
          )}
        </div>
      </div>
      {caption && <div className="text-[10px] text-muted-foreground mb-1">{caption}</div>}

      <button onClick={onOpen} className="flex items-baseline gap-1.5 text-left mt-1">
        <span
          className={`text-[32px] font-semibold leading-none ${ROLE_TEXT[shownHero.role]}`}
          style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
        >
          {shownHero.value.toLocaleString()}
        </span>
        <span className="text-[11px] text-muted-foreground">{shownHero.caption}</span>
      </button>
      {hasViews && <div className="text-[10px] text-muted-foreground mt-1">{total.toLocaleString()} total</div>}

      <div className="mt-2">
        <DistributionView d={dist} />
      </div>

      {footerNote && (
        <div className="mt-auto pt-2.5 mt-3 border-t border-border/50 text-[10px] text-muted-foreground">
          {footerNote}
        </div>
      )}
    </div>
  );
}
