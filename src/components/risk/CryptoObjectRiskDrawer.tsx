import React, { useMemo } from 'react';
import { X, ShieldAlert, Info } from 'lucide-react';
import type { CryptoAsset } from '@/data/mockData';
import { computeCRS, getFactorContribution } from '@/lib/risk/crs';
import { severityFor, severityHsl } from '@/lib/risk/types';

interface Props {
  object: CryptoAsset | null;
  onClose: () => void;
}

interface FactorMeta {
  code: string;
  fullName: string;
  weight: string;
  standard: string;
  description: string;
  goodSign: string;
  badSign: string;
  barColor: string;
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

  const FACTOR_META: Record<string, FactorMeta> = {
    algorithm: {
      code: 'CS',
      fullName: 'Algorithm Risk',
      weight: '31%',
      standard: 'NIST SP 800-131A Rev 2',
      description:
        "How cryptographically strong is the algorithm? Weak or deprecated algorithms are breakable with today's tools.",
      goodSign: 'Ed25519, RSA-4096, AES-256',
      badSign: 'RSA-1024, SHA-1, DSA (disallowed)',
      barColor:
        sev === 'Critical' || sev === 'High'
          ? 'hsl(var(--coral))'
          : 'hsl(var(--teal))',
    },
    lifecycle: {
      code: 'LR',
      fullName: 'Lifecycle Risk',
      weight: '24%',
      standard: 'NIST IR 7966 · CA/B Forum BR v2.0',
      description:
        'How old is this credential relative to its rotation policy, and how close is it to expiry?',
      goodSign: 'Recently rotated, auto-renewal on, >90 days to expiry',
      badSign: 'Expired, orphaned, never rotated, or no auto-renewal',
      barColor: 'hsl(var(--amber))',
    },
    exposure: {
      code: 'EX',
      fullName: 'Exposure Risk',
      weight: '19%',
      standard: 'CVSS v3.1 Attack Vector · NIST SP 800-53 SC-12',
      description:
        'Where is this credential reachable from? Internet-facing credentials have higher blast radius if compromised.',
      goodSign: 'Internal, dev-only, isolated environment',
      badSign: 'Production-facing, wildcard, PCI or regulated scope',
      barColor: 'hsl(var(--purple))',
    },
    access: {
      code: 'AR',
      fullName: 'Access Risk',
      weight: '15%',
      standard: 'NIST SP 800-53 AC-2, AC-6 · FIPS 199',
      description:
        'Who owns this credential and what can it access? Unowned or over-privileged credentials are high risk.',
      goodSign: 'Assigned owner, minimal permissions, no violations',
      badSign: 'No owner, over-privileged, multiple policy violations',
      barColor: 'hsl(15 72% 62%)',
    },
    compliance: {
      code: 'CR',
      fullName: 'Compliance Risk',
      weight: '11%',
      standard: 'PCI DSS v4.0 · HIPAA 164.308 · NIST IR 8547',
      description:
        'Is this credential in scope for a regulatory framework, and does it have active violations against that framework?',
      goodSign: 'Compliant, PQC-ready, no regulatory violations',
      badSign: 'PCI/HIPAA/FedRAMP scope with confirmed violations',
      barColor: 'hsl(var(--teal))',
    },
  };

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
      <div className="w-[640px] max-w-[95vw] bg-card border-l border-border h-full overflow-y-auto scrollbar-thin animate-slide-in-right">
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

                return (
                  <div
                    key={f.id}
                    className="rounded-lg border border-border bg-secondary/20 p-3"
                  >
                    {/* Factor header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {meta.code}
                        </span>
                        <span className="text-[12px] font-semibold text-foreground">
                          {meta.fullName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{meta.weight}</span>
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
                        className="h-full rounded-full"
                        style={{ width: `${rawPct}%`, background: meta.barColor }}
                      />
                    </div>

                    {/* Evidence */}
                    <p className="text-[11px] text-foreground mb-1.5">{f.why}</p>

                    {/* What this means */}
                    <p className="text-[10.5px] text-muted-foreground leading-snug mb-1.5">
                      {meta.description}
                    </p>

                    {/* Standard */}
                    <p className="text-[10px] text-muted-foreground/80 italic">
                      Standard: {meta.standard}
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
              CRS is a weighted sum of the 5 factors above. Algorithm strength carries the most
              weight (31%) because a weak algorithm is the hardest risk to mitigate — it requires
              replacing the credential entirely. Lifecycle (24%) captures how stale or close to
              expiry the credential is. Exposure (19%) reflects where it's reachable. Access (15%)
              measures privilege and ownership. Compliance (11%) adds regulatory context.
            </p>
            <p className="text-[10px] text-muted-foreground italic">
              Aligned with NIST SP 800-30 Rev 1 · CVSS v3.1 additive model · ISO/IEC 27005:2022
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
