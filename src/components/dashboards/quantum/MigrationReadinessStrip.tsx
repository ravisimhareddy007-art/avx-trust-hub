import React from "react";
import { ArrowRight } from "lucide-react";
import { useRisk } from "@/context/RiskContext";
import { useNav } from "@/context/NavigationContext";
import { useLicensing } from "@/context/LicensingContext";

// PQC Readiness strip. Compliance/progress lens, policy-derived. When the
// Quantum Readiness module is licensed, the card becomes a clickable entry
// point to the full 5-stage Quantum Readiness screen; unlicensed, it stays a
// plain read-out.

export default function MigrationReadinessStrip() {
  const { readiness } = useRisk();
  const { setCurrentPage } = useNav();
  const { licensed } = useLicensing();
  const { rawPct, ready, total, atRisk } = readiness;

  const canOpen = licensed.quantum;
  const open = () => canOpen && setCurrentPage("quantum-posture");

  const band = rawPct >= 80 ? "text-teal" : rawPct >= 50 ? "text-amber" : "text-coral";
  const barBand = rawPct >= 80 ? "bg-teal" : rawPct >= 50 ? "bg-amber" : "bg-coral";

  return (
    <div
      onClick={canOpen ? open : undefined}
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onKeyDown={
        canOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") open();
            }
          : undefined
      }
      className={`bg-card rounded-xl border border-border p-5 space-y-3 group ${canOpen ? "cursor-pointer transition-colors hover:border-teal/40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">PQC migration readiness</h3>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-teal transition-colors">
          {ready} of {total} objects quantum-safe
          {canOpen && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold tabular-nums ${band}`}>{rawPct}%</span>
        <span className="text-[11px] text-muted-foreground">ready</span>
      </div>

      <div className="h-2 w-full rounded-full overflow-hidden bg-secondary">
        <div className={barBand} style={{ width: `${rawPct}%`, height: "100%" }} />
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
        <span className="text-coral font-semibold">{atRisk}</span> objects still run a quantum-vulnerable algorithm.
        {canOpen && <span className="text-teal group-hover:underline"> View migration plan &rarr;</span>}
      </p>
    </div>
  );
}
