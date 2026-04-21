import React from 'react';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

export default function ExpiryCalendar() {
  const { setCurrentPage, setFilters } = useNav();

  const certAssets = mockAssets.filter(a =>
    a.type === 'TLS Certificate' ||
    a.type === 'Code-Signing Certificate' ||
    a.type === 'K8s Workload Cert' ||
    a.type === 'SSH Certificate'
  );

  const today = new Date();

  const days = Array.from({ length: 30 }, (_, i) => {
    const matching = certAssets.filter(a => a.daysToExpiry === i);
    const covered = matching.filter(a => a.autoRenewal === true).length;
    const atRisk = matching.filter(a => !a.autoRenewal).length;
    const total = matching.length;

    const d = new Date(today);
    d.setDate(d.getDate() + i);
    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return { day: i, label, total, covered, atRisk };
  });

  const totalCovered = days.reduce((s, d) => s + d.covered, 0);
  const totalAtRisk = days.reduce((s, d) => s + d.atRisk, 0);

  const getCellClasses = (total: number, atRisk: number) => {
    if (atRisk > 10) return 'bg-coral/10 border-coral/30';
    if (atRisk > 0) return 'bg-amber/10 border-amber/30';
    if (total > 0) return 'bg-teal/5 border-teal/20';
    return 'bg-secondary/30 border-border';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">30-Day Expiry Forecast</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal/10 text-teal">
            {totalCovered} covered by auto-renewal
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-coral/10 text-coral">
            {totalAtRisk} need action
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {days.map(d => (
          <div
            key={d.day}
            onClick={() => {
              setFilters({ daysToExpiry: d.day.toString(), type: 'TLS Certificate' });
              setCurrentPage('inventory');
            }}
            className={`rounded-lg border p-2 min-h-[64px] flex flex-col justify-between text-xs cursor-pointer hover:brightness-110 transition-all ${getCellClasses(d.total, d.atRisk)}`}
          >
            <span className="text-muted-foreground text-[10px]">{d.label}</span>
            <span className={`text-lg font-bold text-center ${d.total === 0 ? 'text-muted-foreground/40' : 'text-foreground'}`}>
              {d.total}
            </span>
            {d.total > 0 && (
              <div className="flex h-1 rounded-full overflow-hidden">
                {d.covered > 0 && (
                  <div className="bg-teal h-full" style={{ width: `${(d.covered / d.total) * 100}%` }} />
                )}
                {d.atRisk > 0 && (
                  <div className="bg-coral h-full" style={{ width: `${(d.atRisk / d.total) * 100}%` }} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {totalAtRisk > 0 && (
        <p
          onClick={() => setCurrentPage('remediation')}
          className="mt-3 text-xs text-coral cursor-pointer hover:underline"
        >
          ⚠ {totalAtRisk} certificates expiring in 30 days have no renewal plan
        </p>
      )}
    </div>
  );
}
