import React, { useMemo } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ITAsset } from '@/data/inventoryMockData';
import { getAssetViolations } from '@/data/inventoryMockData';
import { useNav } from '@/context/NavigationContext';

interface Props {
  asset: ITAsset | null;
  onClose: () => void;
}

// Map violation copy → remediation filter category
function categoryFor(type: string): 'expiry' | 'pqc' | 'policy' | 'orphaned' {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'expiry';
  if (t.includes('pqc') || t.includes('quantum') || t.includes('rsa') || t.includes('weak')) return 'pqc';
  if (t.includes('policy') || t.includes('coverage')) return 'policy';
  return 'orphaned';
}

const sevHsl: Record<string, string> = {
  Critical: 'hsl(var(--coral))',
  High: 'hsl(15 72% 62%)',
  Medium: 'hsl(38 78% 51%)',
};

export default function ViolationsDrawer({ asset, onClose }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const violations = useMemo(() => (asset ? getAssetViolations(asset) : []), [asset]);
  if (!asset) return null;

  const goRemediate = (category: string) => {
    setFilters({ assetId: asset.id, category });
    setCurrentPage('remediation');
    onClose();
  };

  const goRemediateAll = () => {
    setFilters({ assetId: asset.id });
    setCurrentPage('remediation');
    onClose();
  };

  const sevCount = violations.reduce(
    (acc, v) => ({ ...acc, [v.severity]: (acc[v.severity] || 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-label="Violations detail">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[560px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground font-mono truncate">{asset.name}</h2>
              <p className="text-[10px] text-muted-foreground">
                {violations.length} active violation{violations.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Severity summary */}
          <div className="grid grid-cols-3 gap-2">
            {(['Critical', 'High', 'Medium'] as const).map(sev => (
              <div key={sev} className="rounded-md border border-border bg-secondary/20 p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{sev}</p>
                <p className="text-[18px] font-bold tabular-nums" style={{ color: sevHsl[sev] }}>
                  {sevCount[sev] || 0}
                </p>
              </div>
            ))}
          </div>

          {/* Violations list */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Violation details
            </h3>
            {violations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No active violations.</p>
            ) : (
              <ul className="space-y-1.5">
                {violations.map((v, i) => {
                  const cat = categoryFor(v.type);
                  return (
                    <li
                      key={i}
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
                        onClick={() => goRemediate(cat)}
                        className="flex-shrink-0 inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1.5 rounded bg-teal/15 text-teal hover:bg-teal hover:text-primary-foreground transition-colors"
                      >
                        Remediate <ArrowRight className="w-3 h-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {violations.length > 1 && (
            <div className="border-t border-border/50 pt-3 flex items-center justify-end">
              <button
                onClick={goRemediateAll}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light transition-colors"
              >
                Remediate all in workflow <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
