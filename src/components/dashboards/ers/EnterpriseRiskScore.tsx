import React, { useState, useMemo } from "react";
import { Sparkles, Info, ChevronRight, ChevronLeft, TrendingDown, TrendingUp, Ticket } from "lucide-react";
import { useRisk } from "@/context/RiskContext";
import { severityHsl } from "@/lib/risk/types";
import { ticketForObject } from "@/lib/ticketStore";
import TicketTriageModal from "@/components/dashboards/TicketTriageModal";

const REMEDIATION_ENABLED = false;
const PAGE = 5;

const SEV_STYLE: Record<string, string> = {
  Critical: "text-coral bg-coral/12",
  High: "text-coral bg-coral/12",
  Medium: "text-amber bg-amber/12",
  Low: "text-teal bg-teal/12",
};
const SEV_TEXT: Record<string, string> = {
  Critical: "text-coral",
  High: "text-coral",
  Medium: "text-amber",
  Low: "text-teal",
};

function TrendChart({
  points,
  hsl,
  target,
}: {
  points: { label: string; value: number }[];
  hsl: string;
  target: number;
}) {
  const W = 320,
    H = 188,
    L = 26,
    R = 264,
    T = 10,
    B = 150;
  const y = (v: number) => T + (1 - v / 100) * (B - T);
  const x = (i: number) => L + (i / (points.length - 1)) * (R - L);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${R} ${B} L ${L} ${B} Z`;
  const last = points[points.length - 1];
  const zones = [
    { top: 100, bot: 80, c: "hsl(16 72% 51%)", label: "Critical" },
    { top: 80, bot: 60, c: "hsl(38 78% 51%)", label: "High" },
    { top: 60, bot: 30, c: "hsl(210 80% 56%)", label: "Moderate" },
    { top: 30, bot: 0, c: "hsl(162 72% 42%)", label: "Low" },
  ];
  const yTicks = [100, 80, 60, 30, 0];
  const xLabels = [
    { i: 0, t: "12w" },
    { i: 3, t: "9w" },
    { i: 6, t: "6w" },
    { i: 9, t: "3w" },
    { i: points.length - 1, t: "now" },
  ];
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Twelve week risk trend, now ${last.value}, target ${target}`}
    >
      {zones.map((z) => (
        <g key={z.label}>
          <rect x={L} y={y(z.top)} width={R - L} height={y(z.bot) - y(z.top)} fill={z.c} opacity="0.09" />
          <text x={R + 4} y={(y(z.top) + y(z.bot)) / 2 + 3} fontSize="7.5" fill={z.c} opacity="0.85">
            {z.label}
          </text>
        </g>
      ))}
      {yTicks.map((v) => (
        <g key={v}>
          <text x={L - 5} y={y(v) + 3} fontSize="8" fill="currentColor" opacity="0.4" textAnchor="end">
            {v}
          </text>
          <line
            x1={L}
            y1={y(v)}
            x2={R}
            y2={y(v)}
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            opacity="0.1"
          />
        </g>
      ))}
      <line
        x1={L}
        y1={y(target)}
        x2={R}
        y2={y(target)}
        stroke="hsl(162 72% 42%)"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.7"
      />
      <text x={L + 2} y={y(target) - 3} fontSize="7.5" fill="hsl(162 72% 42%)">
        target {target}
      </text>
      <path d={area} fill={hsl} fillOpacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill={hsl} />
      <text
        x={x(points.length - 1) - 5}
        y={y(last.value) - 6}
        fontSize="10"
        fontWeight="600"
        fill={hsl}
        textAnchor="end"
      >
        {last.value}
      </text>
      {xLabels.map((l) => (
        <text key={l.t} x={x(l.i)} y={H - 4} fontSize="8" fill="currentColor" opacity="0.4" textAnchor="middle">
          {l.t}
        </text>
      ))}
    </svg>
  );
}

type SortKey = "impact" | "urgency";

export default function EnterpriseRiskScore() {
  const { ers } = useRisk();
  const [triage, setTriage] = useState<{ type: string; violationId?: string } | null>(null);
  const [sort, setSort] = useState<SortKey>("impact");
  const [page, setPage] = useState(0);

  const score = ers.ers;
  const severity = ers.severity;
  const hsl = severityHsl(severity);
  const hist = ers.history;
  const startVal = hist[0]?.value ?? score;
  const delta = score - startVal;
  const improving = delta < 0;

  const topThree = [...ers.driverBuckets].sort((a, b) => b.pts - a.pts).slice(0, 3);
  const projected = Math.max(0, score - topThree.reduce((s, d) => s + d.pts, 0));
  const target = Math.min(projected, 30);

  const coverageFor = (ids: string[]) => ids.reduce((n, id) => n + (ticketForObject(id) ? 1 : 0), 0);

  const rows = useMemo(() => {
    const withCov = ers.driverBuckets.map((d) => {
      const ticketed = coverageFor(d.objectIds);
      const fullyTicketed = d.objectIds.length > 0 && ticketed >= d.objectIds.length;
      return { ...d, ticketed, fullyTicketed };
    });
    const active = withCov.filter((d) => !d.fullyTicketed);
    const done = withCov.filter((d) => d.fullyTicketed);
    const cmp =
      sort === "impact"
        ? (a: (typeof active)[0], b: (typeof active)[0]) => b.pts - a.pts
        : (a: (typeof active)[0], b: (typeof active)[0]) => b.urgencyScore - a.urgencyScore;
    return [...active.sort(cmp), ...done];
  }, [ers.driverBuckets, sort]);

  const pageCount = Math.ceil(rows.length / PAGE);
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-teal" />
        <h2 className="text-sm font-semibold text-foreground">Enterprise Risk</h2>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
          ERS
        </span>
        <div className="relative group">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-80 bg-card border border-border rounded-lg shadow-lg px-3 py-2.5">
            <p className="text-[11px] text-foreground leading-relaxed">
              Every object's CRS rolls up through per-asset ARS, weighted by business impact. Higher is worse. Each
              factor shows the estimated ERS drop if you resolve it. Click a factor to review its objects and raise
              tickets.
            </p>
          </div>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-teal">
          <span className="w-1.5 h-1.5 rounded-full bg-teal" /> live
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,40%)_1fr]">
        {/* Trend + score */}
        <div className="p-5 lg:border-r border-border flex flex-col">
          <div className="flex items-end gap-3 mb-1">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-semibold leading-none tabular-nums" style={{ color: hsl }}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="flex flex-col gap-1 pb-1">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ color: hsl, background: `${hsl}1f` }}
              >
                {severity} risk
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${improving ? "text-teal" : "text-coral"}`}
              >
                {improving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(delta)} pts / 12 weeks
              </span>
            </div>
          </div>

          <div className="mt-2 flex-1">
            <TrendChart points={hist} hsl={hsl} target={target} />
          </div>

          <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border/40">
            <div className="flex-1">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                Projected after top 3 fixes
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-teal tabular-nums">{projected}</span>
                <span className="text-[10px] text-muted-foreground">from {score}</span>
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground text-right">
              12-week trend
              <br />
              sample history
            </div>
          </div>
        </div>

        {/* Factors */}
        <div className="p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium flex-1">
              What's driving your risk
            </span>
            <span className="text-[10px] text-muted-foreground">Sort</span>
            <div className="inline-flex rounded-full border border-border-strong overflow-hidden">
              <button
                onClick={() => {
                  setSort("impact");
                  setPage(0);
                }}
                className={`text-[10px] px-2.5 py-0.5 transition-colors ${sort === "impact" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Score impact
              </button>
              <button
                onClick={() => {
                  setSort("urgency");
                  setPage(0);
                }}
                className={`text-[10px] px-2.5 py-0.5 transition-colors ${sort === "urgency" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Urgency
              </button>
            </div>
          </div>

          <div className="flex flex-col flex-1">
            {pageRows.map((d) => (
              <button
                key={d.id}
                onClick={() => setTriage({ type: d.triageType, violationId: d.id })}
                className={`group flex items-center gap-3 py-2.5 border-b border-border/40 text-left ${d.fullyTicketed ? "opacity-55" : ""}`}
              >
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${SEV_STYLE[d.severity]}`}
                >
                  {d.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-foreground truncate">{d.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {d.count.toLocaleString()} objects · {d.urgency}
                  </div>
                </div>
                {d.fullyTicketed ? (
                  <span className="inline-flex items-center gap-1 text-[9px] text-teal bg-teal/10 px-1.5 py-0.5 rounded">
                    <Ticket className="w-2.5 h-2.5" /> ticketed
                  </span>
                ) : (
                  <div className="text-right">
                    <div className={`text-[13px] font-semibold tabular-nums ${SEV_TEXT[d.severity]}`}>-{d.pts}</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-wide">ERS</div>
                  </div>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-teal transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {rows.length === 0
                ? "No active factors"
                : `${page * PAGE + 1} to ${Math.min(rows.length, (page + 1) * PAGE)} of ${rows.length} factors`}
            </span>
            {pageCount > 1 && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {triage && (
        <TicketTriageModal
          initialType={triage.type as never}
          initialViolationId={triage.violationId}
          onClose={() => setTriage(null)}
        />
      )}
    </div>
  );
}
