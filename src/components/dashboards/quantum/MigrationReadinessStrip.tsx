import React from 'react';
import { computeReadiness } from '@/lib/risk/qes';

export default function MigrationReadinessStrip() {
  const r = React.useMemo(() => computeReadiness(), []);
  const total = r.vulnerable || 1;
  const handedOffPct = Math.round((r.handedOff / total) * 100);
  const remaining = total - r.handedOff;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Migration readiness</h3>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.coveragePct >= 50 ? 'bg-teal/15 text-teal' : 'bg-amber/15 text-amber'}`}>
          {r.coveragePct}% coverage
        </span>
      </div>

      <div className="flex h-2 w-full rounded-full overflow-hidden bg-secondary">
        <div className="bg-teal" style={{ width: `${(r.handedOff / total) * 100}%` }} title={`Handed off: ${r.handedOff}`} />
        <div className="bg-amber" style={{ width: `${(remaining / total) * 100}%` }} title={`Not started: ${remaining}`} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums text-foreground">{r.vulnerable}</p>
          <p className="text-[9.5px] text-muted-foreground leading-tight">vulnerable objects</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums text-coral">{r.harvestable}</p>
          <p className="text-[9.5px] text-muted-foreground leading-tight">harvestable</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums text-purple-light">{r.handedOff}</p>
          <p className="text-[9.5px] text-muted-foreground leading-tight">handed off</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums text-teal">{handedOffPct}%</p>
          <p className="text-[9.5px] text-muted-foreground leading-tight">coverage</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
        <span className="text-coral font-semibold">{r.agilityBlocked}</span> quantum-vulnerable objects are agility-blocked
        ({r.hardBlocked} hard-blocked). <span className="text-foreground font-medium">{r.shadowEndpoints}</span> shadow endpoints
        discovered. Protocol migration: <span className="text-teal font-medium">{r.kemMigrated}</span> KEM,{" "}
        <span className="text-teal font-medium">{r.sigMigrated}</span> signature, <span className="text-teal font-medium">{r.bothMigrated}</span> fully quantum-safe.
      </p>
    </div>
  );
}
