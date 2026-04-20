import React, { useMemo } from 'react';
import { X, AlertTriangle, ArrowRight, Shield, Atom } from 'lucide-react';
import type { ITAsset, AssetViolation } from '@/data/inventoryMockData';
import { getAssetViolations } from '@/data/inventoryMockData';
import { useNav } from '@/context/NavigationContext';

interface Props {
  asset: ITAsset | null;
  onClose: () => void;
}

// Map classic violation copy → Cert+ remediation filter category
function classicCategoryFor(type: string): 'expiry' | 'policy' | 'orphaned' {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'expiry';
  if (t.includes('owner') || t.includes('orphan') || t.includes('hsm')) return 'orphaned';
  return 'policy';
}

// Classic action mapping → realistic Cert+ workflow
function classicActionFor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'Renew';
  if (t.includes('rotat')) return 'Rotate';
  if (t.includes('owner')) return 'Assign Owner';
  if (t.includes('hsm')) return 'Migrate to HSM';
  return 'Create Ticket';
}

const sevHsl: Record<string, string> = {
  Critical: 'hsl(var(--coral))',
  High: 'hsl(15 72% 62%)',
  Medium: 'hsl(38 78% 51%)',
  Low: 'hsl(var(--teal))',
};

// PQC severity uses the purple palette to make quantum risk visually distinct
const pqcSevHsl: Record<string, string> = {
  Critical: 'hsl(280 65% 55%)',
  High: 'hsl(270 60% 60%)',
  Medium: 'hsl(260 55% 65%)',
  Low: 'hsl(250 45% 70%)',
};

export default function ViolationsDrawer({ asset, onClose }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const violations = useMemo(() => (asset ? getAssetViolations(asset) : []), [asset]);
  if (!asset) return null;

  const classicViolations = violations.filter(v => v.violationType === 'classic');
  const pqcViolations = violations.filter(v => v.violationType === 'pqc');

  const goRemediateClassic = (v: AssetViolation) => {
    setFilters({ assetId: asset.id, category: classicCategoryFor(v.type) });
    setCurrentPage('remediation');
    onClose();
  };

  const goAddToQTH = (v: AssetViolation) => {
    setFilters({ assetId: asset.id, algorithm: v.algorithm || '', tab: 'qth-queue' });
    setCurrentPage('quantum-posture');
    onClose();
  };

  const goRemediateAllClassic = () => {
    setFilters({ assetId: asset.id });
    setCurrentPage('remediation');
    onClose();
  };

  const goAllToQTH = () => {
    setFilters({ assetId: asset.id, tab: 'qth-queue' });
    setCurrentPage('quantum-posture');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-label="Violations detail">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[600px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground font-mono truncate">{asset.name}</h2>
              <p className="text-[10px] text-muted-foreground">
                {classicViolations.length} operational · {pqcViolations.length} quantum risk
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── Operational (Classic) Violations ─────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-coral" />
                <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold">
                  Operational Violations
                </h3>
                <span className="text-[10px] text-muted-foreground">· Cert+ workflows</span>
              </div>
              <span className="text-[10px] font-bold tabular-nums text-coral">{classicViolations.length}</span>
            </div>

            {classicViolations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center bg-secondary/20 rounded-md border border-border">
                No operational violations.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {classicViolations.map((v, i) => (
                  <li
                    key={`c-${i}`}
                    className="rounded-md border border-border bg-secondary/20 p-3 flex items-start gap-3"
                  >
                    <span
                      className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: sevHsl[v.severity] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ color: sevHsl[v.severity], background: `${sevHsl[v.severity]}1f` }}
                        >
                          {v.severity}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground">{v.type}</span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground font-mono mt-1 truncate">
                        on <span className="text-foreground">{v.objectName}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => goRemediateClassic(v)}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1.5 rounded bg-teal/15 text-teal hover:bg-teal hover:text-primary-foreground transition-colors"
                    >
                      {classicActionFor(v.type)} <ArrowRight className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {classicViolations.length > 1 && (
              <div className="mt-2 flex items-center justify-end">
                <button
                  onClick={goRemediateAllClassic}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light transition-colors"
                >
                  Remediate all in Cert+ <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>

          {/* ── Quantum Risk (PQC) Violations ────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-purple-light" />
                <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold">
                  Quantum Risk
                </h3>
                <span className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple/15 text-purple-light border border-purple/30">
                  NIST 2030
                </span>
              </div>
              <span className="text-[10px] font-bold tabular-nums text-purple-light">{pqcViolations.length}</span>
            </div>

            {pqcViolations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center bg-secondary/20 rounded-md border border-border">
                No quantum-risk credentials on this asset.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {pqcViolations.map((v, i) => {
                  const yearsPast = v.yearsPastDeadline ?? 0;
                  return (
                    <li
                      key={`p-${i}`}
                      className="rounded-md border border-purple/20 bg-purple/5 p-3 flex items-start gap-3"
                    >
                      <Atom
                        className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        style={{ color: pqcSevHsl[v.severity] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ color: pqcSevHsl[v.severity], background: `${pqcSevHsl[v.severity]}1f` }}
                          >
                            {v.severity}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground font-mono">{v.algorithm}</span>
                          {yearsPast > 0 && (
                            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-coral/15 text-coral">
                              +{yearsPast}y past deadline
                            </span>
                          )}
                          {v.harvestRisk === 'Active' && (
                            <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-amber/15 text-amber">
                              Harvest: Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mt-1 leading-snug">
                          <span className="font-mono text-foreground">{v.algorithm}</span> is quantum-vulnerable.
                          This credential expires in <span className="text-foreground font-semibold">{v.expiryYear}</span>
                          {yearsPast > 0
                            ? <> — <span className="text-coral font-semibold">{yearsPast} year{yearsPast === 1 ? '' : 's'} past</span> NIST migration deadline.</>
                            : <> — at the NIST migration deadline.</>}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 font-mono mt-1 truncate">
                          on <span className="text-foreground">{v.objectName}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => goAddToQTH(v)}
                        className="flex-shrink-0 inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1.5 rounded bg-purple/20 text-purple-light hover:bg-purple-light hover:text-primary-foreground transition-colors"
                      >
                        Add to QTH <ArrowRight className="w-3 h-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {pqcViolations.length > 1 && (
              <div className="mt-2 flex items-center justify-end">
                <button
                  onClick={goAllToQTH}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded bg-purple-light text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Add all to QTH queue <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
