import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

// One posture tile, three distribution renderers (rows, donut, bars) plus an
// optional view toggle. Every value is a count that routes into filtered inventory.

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
  | { type: "bars"; bars: Bar[] };

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
  distribution?: Distribution; // single-view tiles (protocols, libraries)
  views?: TileView[]; // multi-view tiles with a toggle (certificates, ssh)
  footerNote?: string;
  onOpen: () => void;
  emphasis?: boolean;
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

function BarsChart({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  const W = 248,
    H = 108,
    padL = 20,
    padT = 14,
    padB = 24;
  const plotH = H - padT - padB;
  const bw = (W - padL - 6) / bars.length;
  const barW = Math.min(34, bw * 0.62);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "108px" }}
      role="img"
      aria-label="Distribution by bucket"
    >
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      <line x1={padL} y1={padT + plotH} x2={W - 4} y2={padT + plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      <text x={padL - 3} y={padT + 4} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
        {max}
      </text>
      <text x={padL - 3} y={padT + plotH} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
        0
      </text>
      {bars.map((b, i) => {
        const h = (b.count / max) * plotH;
        const x = padL + i * bw + (bw - barW) / 2;
        const y = padT + plotH - h;
        return (
          <g key={b.label} className={b.onClick ? "cursor-pointer" : ""} onClick={b.onClick}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} fill={b.color} rx="1.5" />
            <text
              x={x + barW / 2}
              y={y - 3}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              {b.count}
            </text>
            <text
              x={x + barW / 2}
              y={padT + plotH + 11}
              textAnchor="middle"
              fontSize="7.8"
              fill="hsl(var(--muted-foreground))"
            >
              {b.label}
            </text>
          </g>
        );
      })}
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
    );
  }
  if (d.type === "bars")
    return (
      <div className="mt-1">
        <BarsChart bars={d.bars} />
      </div>
    );
  return (
    <div className="flex items-center gap-3 mt-1.5">
      <Donut slices={d.slices} centerValue={d.centerValue} centerLabel={d.centerLabel} />
      <div className="flex-1 flex flex-col gap-1">
        {d.slices.map((s) => (
          <button key={s.label} onClick={s.onClick} className="w-full flex items-center gap-1.5 text-left group/row">
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
          className={`text-[32px] font-semibold leading-none ${ROLE_TEXT[shownHero.role]}`}
          style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
        >
          {shownHero.value.toLocaleString()}
        </span>
        <span className="text-[11px] text-muted-foreground">{shownHero.caption}</span>
      </button>

      {views && views.length > 1 && (
        <div className="flex gap-1 mt-3 mb-0.5">
          {views.map((v, i) => (
            <button
              key={v.label}
              onClick={() => setActive(i)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${i === active ? "border-teal/50 text-teal bg-teal/10" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      <DistributionView d={dist} />

      <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-border/50 mt-3">
        {footerNote ? <span className="text-[10px] text-muted-foreground">{footerNote}</span> : <span />}
        <button onClick={onOpen} className="text-[10.5px] text-teal hover:underline">
          Open
        </button>
      </div>
    </div>
  );
}
