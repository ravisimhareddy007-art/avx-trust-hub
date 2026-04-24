import React, { useMemo } from 'react';
import { X, ShieldAlert, Info } from 'lucide-react';
import type { CryptoAsset } from '@/data/mockData';
import { computeCRS, getFactorContribution } from '@/lib/risk/crs';
import { severityFor, severityHsl } from '@/lib/risk/types';

interface Props {
  object: CryptoAsset | null;
  onClose: () => void;
}

interface FactorExample {
  label: string;
  score: string;
  status: string;
}

interface FactorMeta {
  code: string;
  fullName: string;
  weight: string;
  standard: string;
  scoreInterpretation: string;
  examples: FactorExample[];
}

const FACTOR_META: Record<string, FactorMeta> = {
  algorithm: {
    code: 'CS',
    fullName: 'Algorithm Risk',
    weight: '31%',
    standard: 'NIST SP 800-131A Rev 2, Table 1',
    scoreInterpretation:
      "CS is a direct lookup from NIST SP 800-131A Rev 2 Table 1. NIST assigns a status to each algorithm — Disallowed, Acceptable (legacy), or Recommended. The score reflects that status, not vulnerability analysis.",
    examples: [
      { label: 'RSA-1024', score: '88–94', status: 'Disallowed post-2013' },
      { label: 'RSA-2048', score: '38–52', status: 'Acceptable (legacy, through 2030)' },
      { label: 'RSA-4096', score: '8–18', status: 'Recommended' },
      { label: 'Ed25519', score: '8–18', status: 'Recommended' },
      { label: 'ECC P-256', score: '12–22', status: 'Approved (FIPS 186-5)' },
      { label: 'AES-256', score: '1–4', status: 'Recommended, PQC-resistant' },
    ],
  },
  lifecycle: {
    code: 'LR',
    fullName: 'Lifecycle Risk',
    weight: '24%',
    standard: 'NIST SP 800-57 Pt 1 Rev 5 §5.3 · NIST IR 7966 §4.5 · CA/B Forum BR v2.0 §6.3.2',
    scoreInterpretation:
      'LR combines two signals: age of the credential relative to its rotation policy (AgeScore), and how close it is to expiry (ExpiryScore). The dominant signal is preserved — LR = max(AgeScore, ExpiryScore) + 0.3 × min(AgeScore, ExpiryScore).',
    examples: [
      { label: 'Expired', score: '90–100', status: 'Active outage or trust failure risk' },
      { label: '1–7 days to expiry', score: '75–90', status: 'Critical — P1 response required' },
      { label: '7–30 days to expiry', score: '50–70', status: 'High — urgent renewal required' },
      { label: '30–90 days to expiry', score: '20–40', status: 'Medium — plan renewal' },
      { label: 'SSH key, 180d age (90d policy)', score: '100', status: 'Policy threshold exceeded' },
      { label: 'Auto-renewal active', score: '10–20', status: 'Low — healthy lifecycle' },
    ],
  },
  exposure: {
    code: 'EX',
    fullName: 'Exposure Risk',
    weight: '19%',
    standard: 'CVSS v3.1 Attack Vector & Scope · NIST SP 800-53 SC-12 · CIS Controls v8 #12',
    scoreInterpretation:
      'EX scores network accessibility, storage location, and lateral movement potential. Reachability signals only — privilege level is NOT an EX input (that belongs in AR).',
    examples: [
      { label: 'Production, PCI/wildcard scope', score: '80', status: 'Internet-facing, regulated' },
      { label: 'Production environment', score: '55', status: 'Business-critical exposure' },
      { label: 'Staging environment', score: '30', status: 'Production-like, limited exposure' },
      { label: 'Internal / dev only', score: '15', status: 'Isolated, minimal reachability' },
    ],
  },
  access: {
    code: 'AR',
    fullName: 'Access Risk',
    weight: '15%',
    standard: 'NIST SP 800-53 AC-2 & AC-6 · NIST SP 800-30 Tables G-2/G-3 · FIPS 199',
    scoreInterpretation:
      'AR scores privilege level, ownership, scope breadth, and asset criticality. An unassigned (orphaned) credential is highest risk — no one is accountable for it.',
    examples: [
      { label: 'No owner assigned (orphaned)', score: '80', status: 'No accountability — highest AR' },
      { label: 'Over-privileged AI agent', score: '70', status: 'Exceeds least-privilege principle' },
      { label: '2+ policy violations', score: '60', status: 'Governance failure' },
      { label: '1 policy violation', score: '40', status: 'Partial compliance failure' },
      { label: 'Owner assigned, compliant', score: '15', status: 'Access controls in good standing' },
    ],
  },
  compliance: {
    code: 'CR',
    fullName: 'Compliance Risk',
    weight: '11%',
    standard: 'PCI DSS v4.0 §12.3.2 · HIPAA 45 CFR 164.308 · ISO/IEC 27005:2022 §8.3',
    scoreInterpretation:
      'CR = regulatory scope × violation severity. It does NOT re-score technical severity already captured by CS or LR. A credential in PCI scope with a confirmed violation scores higher than the same violation outside regulated scope.',
    examples: [
      { label: 'PCI DSS scope, major violation', score: '30', status: 'Highest regulatory exposure' },
      { label: 'HIPAA scope, moderate violation', score: '22', status: 'PHI regulatory risk' },
      { label: 'FedRAMP scope, minor violation', score: '15', status: 'Federal compliance flag' },
      { label: 'Internal policy only', score: '8–16', status: 'No external regulatory scope' },
    ],
  },
};

// Parse "8–18" or "55" or "75–90" → midpoint number, for nearest-example highlight
function exampleMidpoint(score: string): number {
  const parts = score.split(/[–-]/).map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return (parts[0] + parts[1]) / 2;
  }
  return isNaN(parts[0]) ? 0 : parts[0];
}

function nearestExampleIndex(examples: FactorExample[], raw: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  examples.forEach((ex, i) => {
    const diff = Math.abs(exampleMidpoint(ex.score) - raw);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export default function CryptoObjectRiskDrawer({ object, onClose }: Props) {
  const data = useMemo(() => {
    if (!object) return null;
    const { crs, factors } = computeCRS(object);
    return { factors, crs };
  }, [object]);

  if (!object || !data) return null;

  const sevHsl = severityHsl(severityFor(data.crs));
  const sev = severityFor(data.crs);

  const verdict =
    data.crs >= 80
      ? '🔴 This credential has critical risk characteristics and should be remediated immediately.'
      : data.crs >= 60
      ? '🟠 This credential has significant issues that should be addressed soon.'
      : data.crs >= 30
      ? '🟡 Some concerns with this credential — monitor and plan remediation.'
      : '🟢 This credential is in good standing.';

  return (
    <div className="fixed inset-0 z-[70] flex" role="dialog" aria-label="Crypto object risk detail">
      <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[680px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: sevHsl }} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground font-mono truncate">
                {object.name}
              </h2>
              <p className="text-[10px] text-muted-foreground truncate">
                {object.type} · {object.algorithm} · {object.environment}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* CRS score card */}
          <section className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Crypto Risk Score (CRS)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums" style={{ color: sevHsl }}>
                    {data.crs}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: sevHsl }}>
                    {sev}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Score: 0 = Safe · 100 = Critical</p>
                <p className="text-[10px] text-muted-foreground">Weighted sum of 5 factors</p>
              </div>
            </div>

            {/* Overall bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${data.crs}%`, background: sevHsl }}
              />
            </div>

            <p className="text-[11px] text-foreground leading-relaxed">{verdict}</p>
          </section>

          {/* Factor breakdown */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Score Breakdown — 5 Risk Factors
            </h3>
            <div className="space-y-3">
              {data.factors.map((f) => {
                const meta = FACTOR_META[f.id];
                const contrib = getFactorContribution(f, data.factors);
                const rawPct = f.raw;
                const severityLabel =
                  f.raw >= 80 ? 'Critical' : f.raw >= 60 ? 'High' : f.raw >= 30 ? 'Medium' : 'Low';
                const severityColor =
                  f.raw >= 80
                    ? 'text-coral'
                    : f.raw >= 60
                    ? 'text-amber'
                    : f.raw >= 30
                    ? 'text-blue-400'
                    : 'text-teal';
                const barColor =
                  f.raw >= 80
                    ? 'bg-coral'
                    : f.raw >= 60
                    ? 'bg-amber'
                    : f.raw >= 30
                    ? 'bg-blue-400'
                    : 'bg-teal';

                const isAlgorithm = f.id === 'algorithm';
                const highlightIdx = isAlgorithm
                  ? meta.examples.findIndex(
                      ex => ex.label.toLowerCase() === object.algorithm.toLowerCase()
                    )
                  : nearestExampleIndex(meta.examples, f.raw);

                return (
                  <div
                    key={f.id}
                    className="rounded-lg border border-border bg-secondary/20 p-3"
                  >
                    {/* Factor header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {meta.code}
                        </span>
                        <span className="text-[12px] font-semibold text-foreground">
                          {meta.fullName}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{meta.weight}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold ${severityColor}`}>
                          {severityLabel}
                        </span>
                        <span className="text-[10.5px] font-bold text-foreground tabular-nums">
                          +{contrib} pts
                        </span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${rawPct}%` }}
                      />
                    </div>

                    {/* Evidence (what was found on this object) */}
                    <p className="text-[10px] text-foreground mb-1.5">
                      <span className="text-muted-foreground">Found:</span> {f.why}
                    </p>

                    {/* Score interpretation */}
                    <p className="text-[9px] text-muted-foreground leading-relaxed mt-1">
                      {meta.scoreInterpretation}
                    </p>

                    {/* Lookup table (algorithm) or examples list (others) */}
                    {isAlgorithm ? (
                      <div className="mt-2 rounded border border-border/60 overflow-hidden">
                        <div className="grid grid-cols-[1fr_60px_1.4fr] text-[9px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 px-2 py-1">
                          <span>Algorithm</span>
                          <span className="text-right">Score</span>
                          <span className="pl-2">NIST Status</span>
                        </div>
                        {meta.examples.map((ex, i) => {
                          const highlight = i === highlightIdx;
                          return (
                            <div
                              key={ex.label}
                              className={`grid grid-cols-[1fr_60px_1.4fr] text-[9px] px-2 py-1 border-b border-border/40 last:border-0 ${
                                highlight ? 'bg-teal/10 text-foreground font-semibold' : 'text-muted-foreground'
                              }`}
                            >
                              <span className="font-mono truncate">{ex.label}</span>
                              <span className="text-right tabular-nums">{ex.score}</span>
                              <span className="pl-2 truncate">{ex.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 rounded border border-border/60 overflow-hidden">
                        {meta.examples.map((ex, i) => {
                          const highlight = i === highlightIdx;
                          return (
                            <div
                              key={ex.label}
                              className={`grid grid-cols-[1fr_70px] text-[9px] px-2 py-1 border-b border-border/40 last:border-0 ${
                                highlight ? 'bg-teal/10 text-foreground font-semibold' : 'text-muted-foreground'
                              }`}
                            >
                              <span className="truncate">{ex.label}</span>
                              <span className="text-right tabular-nums">{ex.score}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Standard reference */}
                    <p className="font-mono text-[9px] text-muted-foreground/60 mt-1.5">
                      {meta.standard}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* How CRS is calculated */}
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3.5 h-3.5 text-teal" />
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                How CRS is calculated
              </h3>
            </div>
            <p className="text-[11px] text-foreground leading-relaxed mb-2">
              CRS is a weighted sum of 5 independently justified components (CS · LR · EX · AR · CR).
              Algorithm Risk (CS) has the highest weight (31%) because a weak algorithm requires
              replacing the credential entirely. Each component is scored against a specific standard
              — there is no subjective judgment. The weights are auto-normalised and customer-adjustable.
            </p>
            <p className="text-[10px] text-muted-foreground italic">
              NIST SP 800-30 Rev 1 · CVSS v3.1 additive model · ISO/IEC 27005:2022 · Weights: CS 31% · LR 24% · EX 19% · AR 15% · CR 11%
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
