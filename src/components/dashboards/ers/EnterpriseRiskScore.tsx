import React, { useState } from "react";
import { Sparkles, Info, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useRisk } from "@/context/RiskContext";
import { severityHsl } from "@/lib/risk/types";
import TicketTriageModal from "@/components/dashboards/TicketTriageModal";

const REMEDIATION_ENABLED = false;

const SEV_BAR: Record<string, string> = {
  Critical: "bg-coral",
  High: "bg-coral",
  Medium: "bg-amber",
  Low: "bg-teal",
};
const SEV_TEXT: Record<string, string> = {
  Critical: "text-coral",
  High: "text-coral",
  Medium: "text-amber",
  Low: "text-teal",
};

function TrendChart({ points, hsl }: { points: { label: string; value: number }[]; hsl: string }) {
  const W = 320,
    H = 146,
    L = 8,
    R = 286,
    T = 8,
    B = 118;
  const y = (v: number) => T + (1 - v / 100) * (B - T);
  const x = (i: number) => L + (i / (points.length - 1)) * (R - L);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${R} ${B} L ${L} ${B} Z`;
  const last = points[points.length - 1];
  const zones = [
    { y: y(100), h: y(80) - y(100), c: "hsl(16 72% 51%)", label: "Crit", ly: y(90) },
    { y: y(80), h: y(60) - y(80), c: "hsl(38 78% 51%)", label: "High", ly: y(70) },
    { y: y(60), h: y(30) - y(60), c: "hsl(210 80% 56%)", label: "Mod", ly: y(45) },
    { y: y(30), h: B - y(30), c: "hsl(162 72% 42%)", label: "Low", ly: y(15) },
  ];
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Twelve week risk trend, now ${last.value}`}
    >
      {zones.map((z) => (
        <g key={z.label}>
          <rect x={L} y={z.y} width={R - L} height={z.h} fill={z.c} opacity="0.10" />
          <text x={R + 4} y={z.ly + 3} fontSize="7.5" fill={z.c} opacity="0.9">
            {z.label}
          </text>
        </g>
      ))}
      {[80, 60, 30].map((v) => (
        <line
          key={v}
          x1={L}
          y1={y(v)}
          x2={R}
          y2={y(v)}
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2 3"
          opacity="0.15"
        />
      ))}
      <path d={area} fill={hsl} fillOpacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill={hsl} />
      <text
        x={x(points.length - 1) - 4}
        y={y(last.value) - 6}
        fontSize="9"
        fontWeight="600"
        fill={hsl}
        textAnchor="end"
      >
        {last.value}
      </text>
      <text x={L} y={H - 4} fontSize="7.5" fill="currentColor" opacity="0.4">
        12w ago
      </text>
      <text x={R} y={H - 4} fontSize="7.5" fill="currentColor" opacity="0.4" textAnchor="end">
        now
      </text>
    </svg>
  );
}

export default function EnterpriseRiskScore() {
  const { ers } = useRisk();
  const [triage, setTriage] = useState<{ type: string; violationId?: string } | null>(null);

  const score = ers.ers;
  const severity = ers.severity;
  const hsl = severityHsl(severity);
  const drivers = ers.driverBuckets;
  const maxPts = Math.max(1, ...drivers.map((d) => d.pts));
  const hist = ers.history;
  const startVal = hist[0]?.value ?? score;
  const delta = score - startVal;
  const improving = delta < 0;

  return (
    <div className="bg-card rounded-2xl border border-border h-full flex flex-col overflow-hidden">
      <div className="p-5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-teal" />
          <h2 className="text-sm font-semibold text-foreground">Enterprise Risk Score</h2>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            ERS
          </span>
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-72 bg-card border border-border rounded-lg shadow-lg px-3 py-2.5">
              <p className="text-[11px] text-foreground leading-relaxed">
                Every object's CRS rolls up through per-asset ARS, weighted by business impact, with a floor so one
                critical asset on fire cannot be averaged out. Each factor below shows the real ERS drop if you resolve
                it.
              </p>
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-teal">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" /> live
          </span>
        </div>

        {/* Trend hero */}
        <div className="flex items-end gap-4 mb-1">
          <div className="flex-shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-semibold leading-none tabular-nums" style={{ color: hsl }}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: hsl, background: `${hsl}1f` }}
              >
                {severity} risk
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${improving ? "text-teal" : "text-coral"}`}
              >
                {improving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(delta)} / 12w
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <TrendChart points={hist} hsl={hsl} />
          </div>
        </div>
        <div className="text-[9px] text-muted-foreground mb-3">12-week trend · sample history</div>

        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2.5 pt-1 border-t border-border/40">
          What's driving your risk · bar length = ERS impact
        </div>

        <div className="flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-thin -mr-1 pr-1">
          {drivers.map((d) => (
            <button
              key={d.id}
              onClick={() => setTriage({ type: d.triageType, violationId: d.id })}
              className="group text-left"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11.5px] text-foreground flex-1 min-w-0 truncate">{d.label}</span>
                {d.pts > 0 ? (
                  <span className={`text-[11.5px] font-semibold tabular-nums ${SEV_TEXT[d.severity]}`}>-{d.pts}</span>
                ) : (
                  <span className="text-[9px] text-muted-foreground">holds steady</span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-teal transition-colors" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${SEV_BAR[d.severity]}`}
                    style={{ width: `${Math.max(4, (d.pts / maxPts) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  {d.count.toLocaleString()} · {d.urgency}
                </span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setTriage({ type: "All" })}
          className="w-full text-center text-[10px] text-teal hover:text-teal/80 transition-colors pt-2.5 pb-0.5 border-t border-border/30 mt-2"
        >
          All contributing factors →
        </button>
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
