// Pure ECRS (Enterprise Crypto Risk Score) calculation module.
// Single source of truth — UI components must derive all displayed numbers
// (gauge score, factor %, driver pts, projected score) from these helpers.

export interface ECRSWeights {
  algorithmRisk: number;   // default 31
  lifecycleRisk: number;   // default 24
  exposureRisk: number;    // default 19
  accessRisk: number;      // default 15
  complianceRisk: number;  // default 11
}

export interface ECRSFactor {
  id: keyof ECRSWeights;
  label: string;
  rawScore: number;        // 0–100, this factor's measured severity
  color: string;           // dot/bar colour in the UI
  desc: string;            // short description for the breakdown panel
}

export const DEFAULT_WEIGHTS: ECRSWeights = {
  algorithmRisk: 31,
  lifecycleRisk: 24,
  exposureRisk: 19,
  accessRisk: 15,
  complianceRisk: 11,
};

// Raw severities for the current environment.
// Calibrated so computeECRS(CURRENT_FACTOR_SCORES, DEFAULT_WEIGHTS) === 64.
// In production these come from the backend telemetry pipeline.
export const CURRENT_FACTOR_SCORES: ECRSFactor[] = [
  { id: 'algorithmRisk',  label: 'Algorithm Risk',  rawScore: 82, color: 'hsl(var(--coral))',  desc: 'Deprecated ciphers, short keys, SHA-1' },
  { id: 'lifecycleRisk',  label: 'Lifecycle Risk',  rawScore: 74, color: 'hsl(var(--amber))',  desc: 'Expiry, missed rotations, stale keys' },
  { id: 'exposureRisk',   label: 'Exposure Risk',   rawScore: 62, color: 'hsl(var(--purple))', desc: 'Non-HSM storage, public surface' },
  { id: 'accessRisk',     label: 'Access Risk',     rawScore: 55, color: 'hsl(15 72% 62%)',    desc: 'Over-privileged tokens, weak scopes' },
  { id: 'complianceRisk', label: 'Compliance Risk', rawScore: 68, color: 'hsl(var(--teal))',   desc: 'Policy & standard violations' },
];

const ACM = 1.0; // Asset Criticality Multiplier — 1.05 for prod/PCI scope

export function computeECRS(factors: ECRSFactor[], weights: ECRSWeights): number {
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalW === 0) return 0;
  const raw = factors.reduce(
    (acc, f) => acc + f.rawScore * (weights[f.id] / totalW),
    0
  );
  return Math.min(100, Math.round(raw * ACM));
}

export function getFactorContribution(factor: ECRSFactor, weights: ECRSWeights): number {
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalW === 0) return 0;
  return Math.round(factor.rawScore * (weights[factor.id] / totalW));
}

export function getNormalisedWeight(id: keyof ECRSWeights, weights: ECRSWeights): number {
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  if (totalW === 0) return 0;
  return Math.round((weights[id] / totalW) * 100);
}

export function getSeverity(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

// ---------- Remediation simulator ----------

export interface RemediationItem {
  id: string;
  label: string;
  pointReduction: number; // ECRS points removed when applied
  effort: string;
  urgency: string;
}

export const REMEDIATION_ITEMS: RemediationItem[] = [
  { id: 'r1', label: 'Auto-renew 1,840 certs expiring <7d', pointReduction: 5, effort: '~1d',  urgency: 'Immediate' },
  { id: 'r2', label: 'Rotate 42K non-rotated secrets',      pointReduction: 8, effort: '~2d',  urgency: 'Near-term' },
  { id: 'r3', label: 'Migrate 14,720 keys to HSM',          pointReduction: 6, effort: '~10d', urgency: 'Aging' },
];

export function computeProjectedScore(
  currentScore: number,
  selectedRemediations: RemediationItem[]
): number {
  const totalReduction = selectedRemediations.reduce((acc, r) => acc + r.pointReduction, 0);
  return Math.max(0, currentScore - totalReduction);
}

// Maps existing dashboard driver IDs -> primary ECRS factor.
// Lets existing UI (drivers list, ImpactBars) source live point contributions
// from the same weighted formula that drives the gauge.
export const DRIVER_TO_FACTOR: Record<string, keyof ECRSWeights> = {
  'weak-algos':          'algorithmRisk',
  'expiring-certs':      'lifecycleRisk',
  'non-rotated-secrets': 'lifecycleRisk',
  'non-hsm-keys':        'exposureRisk',
  'overpriv-ai-tokens':  'accessRisk',
};
