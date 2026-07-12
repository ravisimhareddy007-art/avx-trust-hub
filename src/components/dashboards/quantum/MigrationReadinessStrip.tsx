import React from "react";
import { useRisk } from "@/context/RiskContext";

// PQC Readiness strip. Compliance/progress lens, policy-derived (reads the same
// verdicts as the inventory PQC column via context). No migration-pipeline
// stages and no completion forecast: the platform governs and hands off, it
// does not execute the migration, so it does not predict a completion date.

export default function MigrationReadinessStrip() {
  const { readiness } = useRisk();
  const { rawPct, weightedPct, ready, total, atRisk } = readiness;

  const band = rawPct >= 80 ? "text-teal" : rawPct >= 50 ? "text-amber" : "text-coral";
  const barBand = rawPct >= 80 ? "bg-teal" : rawPct >= 50 ? "bg-amber" : "bg-coral";

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">PQC readiness</h3>
        <span className="text-[10px] text-muted-foreground">
          {ready} of {total} objects quantum-safe
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold tabular-nums ${band}`}>{rawPct}%</span>
        <span className="text-[11px] text-muted-foreground">
          ready · <span className="font-semibold text-foreground">{weightedPct}%</span> weighted by exposure
        </span>
      </div>

      <div className="h-2 w-full rounded-full overflow-hidden bg-secondary">
        <div className={barBand} style={{ width: `${rawPct}%`, height: "100%" }} />
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
        <span className="text-coral font-semibold">{atRisk}</span> objects still violate an active PQC policy. The
        exposure-weighted figure shows how much of what matters is done, not just object count.
      </p>
    </div>
  );
}
