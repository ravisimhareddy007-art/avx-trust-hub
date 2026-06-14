import React from 'react';
import { Atom } from 'lucide-react';
import { computeQES, qesSeverity, explainQES } from '@/lib/risk/qes';
import ScoreExplainer from '@/components/risk/ScoreExplainer';

const SEV_COLOR: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: 'text-coral', High: 'text-purple-light', Medium: 'text-amber', Low: 'text-teal',
};

export default function QuantumExposureGauge() {
  const q = React.useMemo(() => computeQES(), []);
  const sev = qesSeverity(q.qes);
  const distribution = 0.6 * q.p90 + 0.4 * q.p75;
  const severityAnchor = 0.55 * q.maxQoe + 0.45 * distribution;
  const criticalFloor = q.criticalHNDLCount > 0 ? Math.min(100, 52 + 4.8 * Math.log(q.criticalHNDLCount)) : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Atom className="w-4 h-4 text-purple-light" />
          <h3 className="text-sm font-semibold text-foreground">Quantum Exposure</h3>
        </div>
        <ScoreExplainer
          title={`Quantum Exposure  QES ${q.qes}`}
          band={sev}
          factors={[
            { label: 'Worst object (max QOE)', value: q.maxQoe, weightPct: 55 },
            { label: 'Distribution (P90/P75)', value: distribution, weightPct: 45 },
            { label: 'Critical concentration floor', value: criticalFloor, weightPct: 100, detail: `${q.criticalHNDLCount} critical` },
          ]}
          why={explainQES(q)}
          formula="max( 0.55·max(QOE) + 0.45·dist , 52 + 4.8·ln(criticalCount) )"
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-5xl font-bold tabular-nums ${SEV_COLOR[sev]}`}>{q.qes}</span>
        <span className="text-xs text-muted-foreground">/ 100 QES</span>
      </div>
      <p className={`text-xs font-semibold ${SEV_COLOR[sev]}`}>{sev} exposure</p>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
        <div>
          <p className="text-2xl font-bold tabular-nums text-coral">{q.criticalHNDLCount}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">HNDL-critical objects</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-amber">{q.vulnerableCount}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">quantum-vulnerable</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{q.totalObjects}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">total objects</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Higher is worse, consistent with ERS. Concentration-anchored: a large clean estate cannot dilute a dangerous harvest-now-decrypt-later concentration.
      </p>
    </div>
  );
}
