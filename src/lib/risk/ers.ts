// Level 3 — Enterprise Risk Score (ERS): rollup across all assets,
// criticality-weighted, with a floor rule that prevents averaging-out
// of a single Critical-impact asset on fire.

import { mockITAssets, type ITAsset } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';
import { arsFor } from './ars';
import { BI_MULTIPLIER, severityFor, type BusinessImpact, type Severity } from './types';
import { DASHBOARD_FILTERS } from '@/lib/filters/cryptoFilters';

// Weights used in the criticality-weighted average.
const BI_WEIGHT: Record<BusinessImpact, number> = {
  Critical: 4,
  High:     3,
  Moderate: 2,
  Low:      1,
};

function quantumWeight(): number {
  const currentYear = new Date().getFullYear();
  const deadlineYear = 2030;
  const startYear = 2024;
  const progress = Math.min(1, Math.max(0, (currentYear - startYear) / (deadlineYear - startYear)));
  // Increases from 0.15 in 2024 to 0.35 in 2030
  return 0.15 + progress * 0.20;
}

export interface ErsBreakdown {
  ers: number;
  weightedAvg: number;     // pre-floor weighted average
  floorApplied: boolean;
  floorAsset?: { id: string; name: string; ars: number; bi: BusinessImpact };
  severity: Severity;
  quantumComponent: number;
  quantumWeight: number;
  topAssets: { id: string; name: string; ars: number; bi: BusinessImpact; rps: number; contribution: number }[];
  driverBuckets: { id: string; label: string; pts: number; count: number; filters: Record<string, string>; page: string }[];
}

interface ScoredAsset {
  asset: ITAsset;
  ars: number;
  bi: BusinessImpact;
}

function computeQuantumRiskComponent(scored: ScoredAsset[]): number {
  let quantumWeightedSum = 0;
  let totalW = 0;
  scored.forEach(x => {
    const objs = x.asset.cryptoObjectIds
      .map(id => mockAssets.find(a => a.id === id))
      .filter(Boolean);
    const quantumVulnCount = objs.filter(o =>
      o && /RSA|ECC|ECDSA|ECDH|DSA/.test(o.algorithm)
    ).length;
    const totalObjs = objs.length || 1;
    const quantumExposurePct = quantumVulnCount / totalObjs;
    const w = BI_WEIGHT[x.bi];
    quantumWeightedSum += quantumExposurePct * 100 * w;
    totalW += w;
  });
  return totalW > 0 ? Math.round(quantumWeightedSum / totalW) : 0;
}

function buildDriverBuckets(scored: ScoredAsset[], weightedAvg: number): ErsBreakdown['driverBuckets'] {
  const total = Object.values(DASHBOARD_FILTERS).reduce((s, f) => s + f.enterpriseCount, 0) || 1;
  const slice = (n: number) => Math.round((n / total) * weightedAvg * 0.45);

  return Object.values(DASHBOARD_FILTERS)
    .map(f => ({
      id: f.id,
      label: f.label,
      pts: slice(f.enterpriseCount),
      count: f.enterpriseCount,
      page: 'inventory',
      filters: { filterId: f.id },
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function computeERS(
  assets: ITAsset[],
  bi: Record<string, BusinessImpact>
): ErsBreakdown {
  const scored: ScoredAsset[] = assets.map(a => ({
    asset: a,
    ars: arsFor(a).ars,
    bi: bi[a.id] ?? defaultBI(a),
  }));

  // Criticality-weighted average.
  const totalW = scored.reduce((s, x) => s + BI_WEIGHT[x.bi], 0) || 1;
  const weightedAvg = Math.round(
    scored.reduce((s, x) => s + x.ars * BI_WEIGHT[x.bi], 0) / totalW
  );

  // Floor rule: ERS cannot fall below 40% of the highest ARS among Critical
  // production assets. Prevents a sea of low-impact green from masking one
  // burning Critical asset.
  const criticalProd = scored.filter(
    x => x.bi === 'Critical' && x.asset.environment === 'Production'
  );
  const topCritical = criticalProd.sort((a, b) => b.ars - a.ars)[0];
  const floor = topCritical ? Math.round(topCritical.ars * 0.85) : 0;
  const floorApplied = topCritical !== undefined && floor > weightedAvg;
  const qWeight = quantumWeight();
  const opsWeight = 1 - qWeight;
  const quantumComponent = computeQuantumRiskComponent(scored);
  const blended = Math.round(weightedAvg * opsWeight + quantumComponent * qWeight);
  const ers = Math.min(100, Math.max(blended, floor));

  // Top contributing assets ranked by ERS-point contribution.
  const topAssets = [...scored]
    .map(x => ({
      id: x.asset.id,
      name: x.asset.name,
      ars: x.ars,
      bi: x.bi,
      rps: Math.round(x.ars * BI_MULTIPLIER[x.bi]),
      contribution: Math.round((x.ars * BI_WEIGHT[x.bi]) / totalW),
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 6);

  return {
    ers,
    weightedAvg,
    floorApplied,
    floorAsset: topCritical
      ? { id: topCritical.asset.id, name: topCritical.asset.name, ars: topCritical.ars, bi: topCritical.bi }
      : undefined,
    severity: severityFor(ers),
    quantumComponent,
    quantumWeight: qWeight,
    topAssets,
    driverBuckets: buildDriverBuckets(scored, weightedAvg),
  };
}

// Default Business Impact heuristic: derived from environment + asset type until
// the user overrides it via the inline editor or drawer.
export function defaultBI(asset: ITAsset): BusinessImpact {
  if (asset.environment !== 'Production') return asset.environment === 'Staging' ? 'Moderate' : 'Low';
  // Production: use the existing risk + type signal as a starting point.
  if (/Vault|HSM|Database|API Gateway/.test(asset.type)) return 'Critical';
  if (asset.criticalViolations >= 2 || asset.riskScore >= 80) return 'Critical';
  if (asset.riskScore >= 60) return 'High';
  return 'Moderate';
}

export function ersDefault(): ErsBreakdown {
  const bi: Record<string, BusinessImpact> = {};
  mockITAssets.forEach(a => { bi[a.id] = defaultBI(a); });
  return computeERS(mockITAssets, bi);
}
