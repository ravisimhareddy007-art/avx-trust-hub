import React, { useState } from "react";
import { Sparkles, Info, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { useRisk } from "@/context/RiskContext";
import { severityHsl } from "@/lib/risk/types";
import TicketTriageModal from "@/components/dashboards/TicketTriageModal";

// Release 2 seam: each driver can gain a "remediate" action beside "review & ticket",
// and pts already models the projected ERS reduction. MVP stays monitoring + ticketing.
const REMEDIATION_ENABLED = false;

const SEV_ACCENT: Record<string, string> = {
  Critical: "bg-coral",
  High: "bg-amber",
  Medium: "bg-purple",
  Low: "bg-teal",
};
const SEV_TINT: Record<string, string> = {
  Critical: "bg-coral/10",
  High: "bg-amber/10",
  Medium: "bg-purple/10",
  Low: "bg-teal/10",
};

function ErsGauge({ score, hsl, label }: { score: number; hsl: string; label: string }) {
  const R = 52,
    cx = 80,
    cy = 70,
    startAngle = -220,
    totalDegrees = 260;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = { x: cx + R * Math.cos(toRad(start)), y: cy + R * Math.sin(toRad(start)) };
    const e = { x: cx + R * Math.cos(toRad(end)), y: cy + R * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const lowEnd = startAngle + 0.29 * totalDegrees;
  const medEnd = startAngle + 0.59 * totalDegrees;
  const highEnd = startAngle + 0.79 * totalDegrees;
  const arcEnd = startAngle + totalDegrees;
  const filled = startAngle + (score / 100) * totalDegrees;
  const TEAL = "hsl(162 72% 42%)",
    BLUE = "hsl(210 80% 56%)",
    AMBER = "hsl(38 82% 55%)",
    CORAL = "hsl(16 80% 56%)";
  return (
    <svg width="168" height="122" viewBox="0 0 160 120">
      <path d={arcPath(startAngle, lowEnd)} fill="none" stroke={TEAL} strokeWidth="9" opacity="0.22" />
      <path d={arcPath(lowEnd, medEnd)} fill="none" stroke={BLUE} strokeWidth="9" opacity="0.22" />
      <path d={arcPath(medEnd, highEnd)} fill="none" stroke={AMBER} strokeWidth="9" opacity="0.22" />
      <path d={arcPath(highEnd, arcEnd)} fill="none" stroke={CORAL} strokeWidth="9" opacity="0.22" />
      <path
        d={arcPath(startAngle, filled)}
        fill="none"
        stroke={hsl}
        strokeWidth="9"
        strokeLinecap="round"
        style={{ transition: "all 0.8s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 5px ${hsl})` }}
      />
      <circle
        cx={cx + (R - 3) * Math.cos(toRad(filled))}
        cy={cy + (R - 3) * Math.sin(toRad(filled))}
        r="5"
        fill={hsl}
        style={{ transition: "all 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x="8" y="110" textAnchor="middle" fontSize="7" fill={TEAL} opacity="0.7">
        LOW
      </text>
      <text x="34" y="16" textAnchor="middle" fontSize="7" fill={BLUE} opacity="0.7">
        MED
      </text>
      <text x="126" y="16" textAnchor="middle" fontSize="7" fill={AMBER} opacity="0.7">
        HIGH
      </text>
      <text x="152" y="110" textAnchor="middle" fontSize="7" fill={CORAL} opacity="0.7">
        CRIT
      </text>
      <text
        x={cx}
        y="66"
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill={hsl}
        style={{ transition: "fill 0.7s ease" }}
      >
        {score}
      </text>
      <text
        x={cx}
        y="82"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        letterSpacing="1.5"
        fill={hsl}
        fillOpacity="0.9"
      >
        {label.toUpperCase()}
      </text>
      <text x={cx} y="95" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.35">
        RISK / 100
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
  const top = drivers[0];
  const topPts = top?.pts ?? 0;
  const projected = Math.max(0, score - topPts);

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col overflow-hidden">
      {/* severity accent strip */}
      <div className={`h-1 w-full ${SEV_ACCENT[severity]}`} />

      <div className="p-5 flex-1 flex flex-col min-h-0">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
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
                  critical asset on fire cannot be averaged out. Higher is worse. Each factor below shows the real ERS
                  drop if you resolve it.
                </p>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">live</span>
        </div>

        <div className="flex flex-col items-center flex-shrink-0">
          <ErsGauge score={score} hsl={hsl} label={severity} />
        </div>

        {/* Recommended next step, the single clearest action */}
        {topPts > 0 ? (
          <button
            onClick={() => setTriage({ type: top.triageType, violationId: top.id })}
            className={`w-full ${SEV_TINT[top.severity]} border border-border rounded-lg px-3 py-2 mt-1 flex items-center gap-2.5 hover:brightness-110 transition-all group text-left`}
          >
            <Zap className="w-4 h-4 text-teal flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-foreground leading-tight">Top fix: {top.label}</div>
              <div className="text-[10px] text-muted-foreground">
                Resolve to drop ERS{" "}
                <span className="text-teal font-semibold">
                  {score} to {projected}
                </span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-teal opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        ) : (
          <div className="w-full bg-teal/10 border border-teal/20 rounded-lg px-3 py-2 mt-1 flex items-center gap-2 text-[11px] text-teal">
            <ShieldCheck className="w-4 h-4" /> No single factor is currently moving the score.
          </div>
        )}

        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-3.5 mb-2">
          What's driving ERS · click to review and raise tickets
        </p>

        <div className="space-y-1 flex-1 overflow-y-auto scrollbar-thin -mr-1 pr-1">
          {drivers.map((d) => (
            <button
              key={d.id}
              onClick={() => setTriage({ type: d.triageType, violationId: d.id })}
              className="w-full flex items-stretch gap-2.5 rounded-lg border border-border hover:border-teal/40 hover:bg-secondary/30 transition-all text-left overflow-hidden group"
            >
              <div className={`w-1 flex-shrink-0 ${SEV_ACCENT[d.severity]}`} />
              <div className="flex-1 min-w-0 py-1.5">
                <div className="text-[11px] text-foreground leading-tight truncate">{d.label}</div>
                <div className="text-[9.5px] text-muted-foreground mt-0.5">
                  {d.count.toLocaleString()} objects · {d.urgency}
                </div>
              </div>
              <div className="flex items-center gap-1.5 pr-2.5">
                {d.pts > 0 ? (
                  <span className="text-[10px] font-bold text-teal bg-teal/10 px-1.5 py-0.5 rounded tabular-nums whitespace-nowrap">
                    -{d.pts} ERS
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">holds steady</span>
                )}
                <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setTriage({ type: "All" })}
          className="w-full text-center text-[10px] text-teal hover:text-teal/80 transition-colors pt-2 pb-0.5 border-t border-border/30 mt-1.5"
        >
          Review all contributing factors →
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
