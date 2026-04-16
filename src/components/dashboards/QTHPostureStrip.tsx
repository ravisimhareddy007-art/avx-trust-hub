import React from 'react';
import { Atom, ArrowRight, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';
import { QTH_DATA } from '@/data/ecrsData';

export default function QTHPostureStrip() {
  const { setCurrentPage } = useNav();
  const total = QTH_DATA.totalVulnerable + QTH_DATA.migrated + QTH_DATA.inFlight;
  const migratedPct = (QTH_DATA.migrated / total) * 100;
  const inFlightPct = (QTH_DATA.inFlight / total) * 100;
  const vulnPct = 100 - migratedPct - inFlightPct;

  return (
    <div className="bg-card border border-border border-l-4 border-l-purple rounded-xl p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Column 1: PQR signal */}
        <div className="lg:col-span-3">
          <p className="text-[10px] uppercase tracking-wider text-teal font-semibold mb-1">Quantum Readiness</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[32px] font-bold text-purple-light leading-none tabular-nums">{QTH_DATA.pqrScore}</span>
            <span className="text-[10px] text-muted-foreground">/ 100 PQR</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            NIST deadline: <span className="text-foreground font-medium">{QTH_DATA.nistDeadline}</span> · 3y 8m
          </p>
          <p className="text-[10.5px] text-foreground mt-1 leading-snug">
            At current pace, full migration completes <span className="font-semibold">{QTH_DATA.estimatedCompletion}</span> — 1 year past deadline.
          </p>
          <span className="inline-block mt-1.5 text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-coral/15 text-coral">
            Behind schedule
          </span>
        </div>

        {/* Column 2: Migration progress bar */}
        <div className="lg:col-span-6">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Migration progress</p>
            <span className="text-[9.5px] text-muted-foreground tabular-nums">{total.toLocaleString()} identities</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
            <div style={{ width: `${migratedPct}%` }} className="bg-teal" title={`Migrated: ${QTH_DATA.migrated}`} />
            <div style={{ width: `${inFlightPct}%` }} className="bg-purple" title={`In migration: ${QTH_DATA.inFlight}`} />
            <div style={{ width: `${vulnPct}%` }} className="bg-coral" title={`Vulnerable: ${QTH_DATA.totalVulnerable}`} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm bg-teal" />
              <span className="text-foreground tabular-nums font-semibold">{QTH_DATA.migrated}</span>
              <span className="text-muted-foreground">PQC-safe</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm bg-purple" />
              <span className="text-foreground tabular-nums font-semibold">{QTH_DATA.inFlight}</span>
              <span className="text-muted-foreground">in-flight</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-sm bg-coral" />
              <span className="text-coral tabular-nums font-semibold">{QTH_DATA.totalVulnerable.toLocaleString()}</span>
              <span className="text-muted-foreground">vulnerable</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
            <span className="text-foreground font-medium tabular-nums">{QTH_DATA.totalVulnerable.toLocaleString()}</span> identities use RSA or ECDSA — quantum-vulnerable to Shor's algorithm.
          </p>
        </div>

        {/* Column 3: Actions */}
        <div className="lg:col-span-3 flex flex-col gap-1.5">
          <button
            onClick={() => setCurrentPage('quantum-posture')}
            className="text-[11px] font-semibold py-2 px-3 rounded-md bg-purple/15 text-purple-light hover:bg-purple/25 border border-purple/30 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5"><Atom className="w-3.5 h-3.5" /> Open QTH Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toast.success('CBOM export queued', { description: 'Ready in ~30s' })}
            className="text-[11px] font-medium py-2 px-3 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5" /> Generate CBOM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
