import React, { useMemo } from 'react';
import { Atom } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

type QthStatus = 'Not assessed' | 'In assessment' | 'Migration planned' | 'In-flight' | 'Migrated';

const STAGES: { label: QthStatus; color: string; bg: string; fill: string }[] = [
  { label: 'Not assessed', color: 'text-coral', bg: 'bg-coral/15', fill: 'border-coral' },
  { label: 'In assessment', color: 'text-amber', bg: 'bg-amber/15', fill: 'border-amber' },
  { label: 'Migration planned', color: 'text-purple-light', bg: 'bg-purple/15', fill: 'border-purple-light' },
  { label: 'In-flight', color: 'text-teal', bg: 'bg-teal/15', fill: 'border-teal' },
  { label: 'Migrated', color: 'text-teal', bg: 'bg-teal', fill: 'border-teal' },
];

function qthStatusFor(assetId: string, idx: number): QthStatus {
  const seed = (assetId.charCodeAt(assetId.length - 1) + idx) % 5;
  return (['Not assessed', 'In assessment', 'Migration planned', 'In-flight', 'Migrated'] as const)[seed];
}

const TIMELINE = [
  { year: 2024, label: 'Inventory', color: 'bg-muted-foreground' },
  { year: 2025, label: 'PQC testing begins (NSA CNSA 2.0)', color: 'bg-amber' },
  { year: 2027, label: 'New systems must use PQC', color: 'bg-purple' },
  { year: 2030, label: 'All systems PQC required', color: 'bg-coral' },
  { year: 2033, label: 'RSA/ECC retired', color: 'bg-coral' },
];

const CURRENT_YEAR = 2026;

export default function PQCMigrationPanel() {
  const { setCurrentPage } = useNav();

  const { stageCounts, totalCritical, withPlan, topHndl } = useMemo(() => {
    const critical = mockAssets.filter(a => a.pqcRisk === 'Critical');
    let idx = 0;
    const statusMap: Record<QthStatus, number> = {
      'Not assessed': 0, 'In assessment': 0, 'Migration planned': 0, 'In-flight': 0, 'Migrated': 0,
    };
    critical.forEach(a => { statusMap[qthStatusFor(a.id, idx++)]; statusMap[qthStatusFor(a.id, idx - 1)]++; });

    const stageCounts = STAGES.map(s => ({ ...s, count: statusMap[s.label] }));
    const withPlan = statusMap['Migration planned'] + statusMap['In-flight'] + statusMap['Migrated'];

    const topHndl = [...critical]
      .sort((a, b) => b.policyViolations - a.policyViolations || a.daysToExpiry - b.daysToExpiry)
      .slice(0, 5);

    return { stageCounts, totalCritical: critical.length, withPlan, topHndl };
  }, []);

  // Find furthest active stage index
  const furthestActive = useMemo(() => {
    let last = 0;
    stageCounts.forEach((s, i) => { if (s.count > 0) last = i; });
    return last;
  }, [stageCounts]);

  const timelineMin = 2024;
  const timelineMax = 2033;
  const timelineRange = timelineMax - timelineMin;
  const pct = (year: number) => ((year - timelineMin) / timelineRange) * 100;

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Atom className="w-4 h-4 text-purple-light" />
        <h3 className="text-sm font-semibold text-foreground">PQC Migration & Quantum Readiness</h3>
      </div>

      {/* SECTION 1: Migration Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          {stageCounts.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center flex-1 relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                i === 4 && s.count > 0 ? 'bg-teal border-teal text-background' :
                s.count > 0 ? `${s.bg} ${s.fill} ${s.color}` :
                'bg-secondary border-border text-muted-foreground'
              }`}>
                {s.count}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight w-20">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {/* Progress line */}
        <div className="relative h-1 mx-auto mt-[-38px] mb-8" style={{ width: 'calc(100% - 80px)', marginLeft: 40, marginRight: 40 }}>
          <div className="absolute inset-0 bg-border rounded-full" />
          <div className="absolute left-0 top-0 h-full bg-teal rounded-full transition-all"
            style={{ width: `${(furthestActive / 4) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-teal font-semibold">{withPlan}</span> of{' '}
          <span className="font-semibold text-foreground">{totalCritical}</span>{' '}
          quantum-vulnerable objects have a migration plan
        </p>
      </div>

      {/* SECTION 2: NIST Deadline Tracker */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-3">NIST Post-Quantum Timeline</h4>
        <div className="relative h-16">
          {/* Base line */}
          <div className="absolute top-4 left-0 right-0 h-[3px] bg-border rounded-full" />

          {/* YOU ARE HERE marker */}
          <div className="absolute" style={{ left: `${pct(CURRENT_YEAR)}%`, transform: 'translateX(-50%)' }}>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-teal uppercase tracking-wider mb-0.5">You are here</span>
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-teal" />
              <div className="w-3 h-3 rounded-full bg-teal mt-[-2px]" />
            </div>
          </div>

          {/* Timeline markers */}
          {TIMELINE.map(m => (
            <div key={m.year} className="absolute" style={{ left: `${pct(m.year)}%`, transform: 'translateX(-50%)', top: m.year === CURRENT_YEAR ? 0 : 12 }}>
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
                <span className="text-[9px] text-muted-foreground mt-1 text-center whitespace-nowrap leading-tight max-w-[80px]">
                  {m.year}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Labels below */}
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-1">
          {TIMELINE.map(m => (
            <span key={m.year} className={`text-center max-w-[90px] leading-tight ${m.year === 2030 ? 'text-coral font-semibold' : ''}`}>
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* SECTION 3: Top 5 HNDL Risk */}
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-0.5">Highest HNDL Risk</h4>
        <p className="text-[10px] text-muted-foreground mb-3">
          Harvest-Now-Decrypt-Later exposure · prioritised by data sensitivity and production exposure
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left pb-2 font-medium">Object</th>
              <th className="text-left pb-2 font-medium">Algorithm</th>
              <th className="text-left pb-2 font-medium">Env</th>
              <th className="text-left pb-2 font-medium">Expiry</th>
              <th className="text-left pb-2 font-medium">Harvest Risk</th>
              <th className="text-right pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {topHndl.map(a => (
              <tr key={a.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 font-mono text-foreground text-[11px] truncate max-w-[180px]">{a.name}</td>
                <td className="py-2.5 text-foreground">{a.algorithm}</td>
                <td className="py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    a.environment === 'Production' ? 'bg-coral/15 text-coral' : 'bg-secondary text-muted-foreground'
                  }`}>{a.environment}</span>
                </td>
                <td className="py-2.5 text-muted-foreground">{a.expiryDate}</td>
                <td className="py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    a.environment === 'Production' ? 'bg-amber/15 text-amber' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {a.environment === 'Production' ? 'Active' : 'Passive'}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => setCurrentPage('quantum-posture')}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-teal/15 text-teal hover:bg-teal/25 transition-colors"
                  >
                    QTH
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
