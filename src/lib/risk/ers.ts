// Level 3 — Enterprise Risk Score (ERS): rollup across all assets,
// criticality-weighted, with a floor rule that prevents averaging-out
// of a single Critical-impact asset on fire.

import { mockITAssets, type ITAsset } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';
import { arsFor } from './ars';
import { BI_MULTIPLIER, severityFor, type BusinessImpact, type Severity } from './types';
import { DASHBOARD_FILTERS } from '@/lib/filters/cryptoFilters';

const BI_WEIGHT: Record<BusinessImpact, number> = {
  Critical: 4,
  High:     3,
  Moderate: 2,
  Low:      1,
};

function clampFloor(v: number): number {
  return Math.min(0.90, Math.max(0.10, v));
}

export interface ErsBreakdown {
  ers: number;
  weightedAvg: number;
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

function buildDriverBuckets(_scored: ScoredAsset[], _weightedAvg: number): ErsBreakdown['driverBuckets'] {
  return Object.values(DASHBOARD_FILTERS)
    .map(f => ({
      id: f.id,
      label: f.label,
      pts: f.pts,
      count: f.enterpriseCount,
      page: 'inventory',
      filters: { filterId: f.id },
    }))
    .sort((a, b) => b.pts - a.pts)
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

  const totalW = scored.reduce((s, x) => s + BI_WEIGHT[x.bi], 0) || 1;
  const weightedAvg = Math.round(
    scored.reduce((s, x) => s + x.ars * BI_WEIGHT[x.bi], 0) / totalW
  );

  const criticalProd = scored.filter(
    x => x.bi === 'Critical' && x.asset.environment === 'Production'
  );
  const topCritical = criticalProd.sort((a, b) => b.ars - a.ars)[0];
  // Floor coefficient is a POLICY value (impact tolerance), not a NIST constant.
  // Default 0.40; clamped to [0.10, 0.90] to prevent extreme dilution or over-weighting.
  const FLOOR_COEFFICIENT = clampFloor(0.40);
  const floor = topCritical ? Math.round(topCritical.ars * FLOOR_COEFFICIENT) : 0;
  const floorApplied = topCritical !== undefined && floor > weightedAvg;
  // ERS is operational-only. Quantum exposure is reported separately via QES
  // (see qes.ts); it is NOT blended here.
  const quantumComponent = computeQuantumRiskComponent(scored); // retained for display only
  const ers = Math.min(100, Math.max(weightedAvg, floor));

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
    quantumWeight: 0,
    topAssets,
    driverBuckets: buildDriverBuckets(scored, weightedAvg),
  };
}

export function defaultBI(asset: ITAsset): BusinessImpact {
  if (asset.environment !== 'Production') return asset.environment === 'Staging' ? 'Moderate' : 'Low';
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
