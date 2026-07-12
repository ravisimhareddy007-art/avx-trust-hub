// Level 3, Enterprise Risk Score (ERS): rollup across all assets,
// criticality-weighted, with a floor rule that prevents averaging-out
// of a single Critical-impact asset on fire.

import { mockITAssets, type ITAsset } from "@/data/inventoryMockData";
import { mockAssets, type CryptoAsset } from "@/data/mockData";
import { arsFor, computeARS } from "./ars";
import { computeCRS } from "./crs";
import { severityFor, type BusinessImpact, type Severity } from "./types";
import { VIOLATION_FILTERS } from "@/lib/filters/cryptoFilters";

const BI_WEIGHT: Record<BusinessImpact, number> = {
  Critical: 4,
  High: 3,
  Moderate: 2,
  Low: 1,
};

function clampFloor(v: number): number {
  return Math.min(0.9, Math.max(0.1, v));
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
  driverBuckets: ErsDriver[];
  history: { label: string; value: number }[];
  historySample: boolean;
}

export interface ErsDriver {
  id: string; // triage violation id (deep-links into the scoped triage)
  triageType: string; // triage category tab key
  label: string; // precise, monitoring-safe condition
  framework: string; // NIST reference (evidence, shown demoted)
  pts: number; // estimated ERS reduction if resolved (proportional, always non-zero)
  contribution: number; // severity-weighted risk mass this factor represents
  count: number; // enterprise-scale affected count
  objectIds: string[]; // for ticket-coverage lookup (sample objects)
  severity: Severity;
  urgency: string; // grounded urgency signal (expiry clock, exposure, etc.)
  urgencyScore: number; // for the "urgency" sort lens
  filters: Record<string, string>; // inventory deep-link filters
}

interface DriverDef {
  id: string;
  triageType: string;
  label: string;
  framework: string;
  enterpriseCount: number;
  urgencyWeight: number;
  predicate: (a: CryptoAsset) => boolean;
  urgency: (objs: CryptoAsset[]) => string;
  filters: Record<string, string>;
}

const DRIVER_DEFS: DriverDef[] = [
  {
    id: "expired",
    triageType: "Certs",
    label: "Expired certificates on live endpoints",
    framework: "NIST SP 1800-16",
    enterpriseCount: 48,
    urgencyWeight: 100,
    predicate: VIOLATION_FILTERS.cert_expired.predicate,
    urgency: () => "expired, still serving live traffic",
  },
  {
    id: "1",
    triageType: "Certs",
    label: "Certificates expiring within 7 days",
    framework: "NIST SP 1800-16",
    enterpriseCount: 186,
    urgencyWeight: 90,
    predicate: VIOLATION_FILTERS.cert_expiring_7d.predicate,
    urgency: () => "expiring within 7 days",
  },
  {
    id: "3",
    triageType: "SSH",
    label: "Suspicious SSH user keys with shell access",
    framework: "NIST SP 800-53 AC-17",
    enterpriseCount: 44,
    urgencyWeight: 80,
    predicate: VIOLATION_FILTERS.ssh_suspicious.predicate,
    urgency: () => "anomalous access on production",
  },
  {
    id: "6",
    triageType: "Certs",
    label: "RSA-1024 / SHA-1 certificates in use",
    framework: "NIST SP 800-131A",
    enterpriseCount: 52,
    urgencyWeight: 50,
    predicate: VIOLATION_FILTERS.cert_weak_algo.predicate,
    urgency: () => "below approved key strength",
  },
  {
    id: "9",
    triageType: "SSH",
    label: "Rogue SSH host keys off-platform",
    framework: "NIST SP 800-53 AC-17",
    enterpriseCount: 18,
    urgencyWeight: 60,
    predicate: VIOLATION_FILTERS.ssh_rogue.predicate,
    urgency: () => "unmanaged host keys off-platform",
  },
  {
    id: "8",
    triageType: "Secrets",
    label: "Secrets not rotated in 90+ days",
    framework: "NIST SP 800-57",
    enterpriseCount: 1250,
    urgencyWeight: 40,
    predicate: VIOLATION_FILTERS.secret_unrotated_90d.predicate,
    urgency: () => "not rotated in 90+ days",
  },
  {
    id: "orphaned",
    triageType: "Secrets",
    label: "Orphaned secrets with no owner",
    framework: "NIST SP 800-53 AC-2",
    enterpriseCount: 445,
    urgencyWeight: 45,
    predicate: VIOLATION_FILTERS.secret_orphaned.predicate,
    urgency: () => "no assigned owner",
  },
];

// ERS computed over an arbitrary object set, mirroring computeERS (operational, weighted, floored).
function ersScoreOver(objects: CryptoAsset[]): number {
  const scored = mockITAssets.map((a) => ({ asset: a, ars: computeARS(a, objects).ars, bi: defaultBI(a) }));
  const totalW = scored.reduce((s, x) => s + BI_WEIGHT[x.bi], 0) || 1;
  const weightedAvg = Math.round(scored.reduce((s, x) => s + x.ars * BI_WEIGHT[x.bi], 0) / totalW);
  const criticalProd = scored.filter((x) => x.bi === "Critical" && x.asset.environment === "Production");
  const topCritical = criticalProd.sort((a, b) => b.ars - a.ars)[0];
  const floor = topCritical ? Math.round(topCritical.ars * clampFloor(0.4)) : 0;
  return Math.min(100, Math.max(weightedAvg, floor));
}

// Contribution = the real ERS reduction if this driver's objects were resolved.
// Computed through the same ARS -> ERS engine. Not additive across drivers, because
// ERS uses a max/floor rule, so each row answers "fix this, ERS drops by N" on its own.
// SAMPLE history for the prototype: a deterministic 12-week series that ends at the
// live ERS. This is illustrative sample data, not stored telemetry. When real ERS
// snapshots are persisted, swap this for the stored series (same shape).
function ersHistory(current: number): { label: string; value: number }[] {
  const N = 6;
  const start = Math.min(100, current + 16);
  const now = new Date();
  const pts: { label: string; value: number }[] = [];
  for (let i = 0; i < N; i++) {
    const base = start + (current - start) * (i / (N - 1));
    const wiggle = i === N - 1 ? 0 : Math.sin(i * 1.9) * 3.6 + Math.cos(i * 1.1) * 2.2;
    const v = Math.max(0, Math.min(100, Math.round(base + wiggle)));
    const d = new Date(now.getFullYear(), now.getMonth() - (N - 1 - i), 1);
    pts.push({ label: d.toLocaleString("en-US", { month: "short" }), value: v });
  }
  return pts;
}

// Object -> IT asset (for business-impact weighting of risk contribution).
const OBJ_ASSET_BI: Record<string, ITAsset> = (() => {
  const m: Record<string, ITAsset> = {};
  mockITAssets.forEach((a) =>
    a.cryptoObjectIds.forEach((id) => {
      if (!m[id]) m[id] = a;
    }),
  );
  return m;
})();

function buildDriverBuckets(): ErsDriver[] {
  const raw = DRIVER_DEFS.map((def) => {
    const objs = mockAssets.filter(def.predicate);
    if (objs.length === 0) return null;
    let maxCrs = 0;
    let contribution = 0;
    objs.forEach((o) => {
      const crs = computeCRS(o).crs;
      if (crs > maxCrs) maxCrs = crs;
      const asset = OBJ_ASSET_BI[o.id];
      const bi = asset ? defaultBI(asset) : "Low";
      contribution += crs * BI_WEIGHT[bi];
    });
    return { def, objs, maxCrs, contribution };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  // Estimated ERS reduction, distributed by risk-contribution share of the current score.
  // Always non-zero, and the shares sum to roughly the score (fixing everything -> near 0).
  const totalContribution = raw.reduce((s, r) => s + r.contribution, 0) || 1;
  const baseline = ersScoreOver(mockAssets);

  return raw
    .map(({ def, objs, maxCrs, contribution }) => ({
      id: def.id,
      triageType: def.triageType,
      label: def.label,
      framework: def.framework,
      count: def.enterpriseCount,
      objectIds: objs.map((o) => o.id),
      pts: Math.max(1, Math.round((contribution / totalContribution) * baseline)),
      contribution,
      severity: severityFor(maxCrs),
      urgency: def.urgency(objs),
      urgencyScore: def.urgencyWeight + maxCrs,
    }))
    .sort((a, b) => b.pts - a.pts);
}

interface ScoredAsset {
  asset: ITAsset;
  ars: number;
  bi: BusinessImpact;
}

function computeQuantumRiskComponent(scored: ScoredAsset[]): number {
  let quantumWeightedSum = 0;
  let totalW = 0;
  scored.forEach((x) => {
    const objs = x.asset.cryptoObjectIds.map((id) => mockAssets.find((a) => a.id === id)).filter(Boolean);
    const quantumVulnCount = objs.filter((o) => o && /RSA|ECC|ECDSA|ECDH|DSA/.test(o.algorithm)).length;
    const totalObjs = objs.length || 1;
    const quantumExposurePct = quantumVulnCount / totalObjs;
    const w = BI_WEIGHT[x.bi];
    quantumWeightedSum += quantumExposurePct * 100 * w;
    totalW += w;
  });
  return totalW > 0 ? Math.round(quantumWeightedSum / totalW) : 0;
}

export function computeERS(assets: ITAsset[], bi: Record<string, BusinessImpact>): ErsBreakdown {
  const scored: ScoredAsset[] = assets.map((a) => ({
    asset: a,
    ars: arsFor(a).ars,
    bi: bi[a.id] ?? defaultBI(a),
  }));

  const totalW = scored.reduce((s, x) => s + BI_WEIGHT[x.bi], 0) || 1;
  const weightedAvg = Math.round(scored.reduce((s, x) => s + x.ars * BI_WEIGHT[x.bi], 0) / totalW);

  const criticalProd = scored.filter((x) => x.bi === "Critical" && x.asset.environment === "Production");
  const topCritical = criticalProd.sort((a, b) => b.ars - a.ars)[0];
  // Floor coefficient is a POLICY value (impact tolerance), not a NIST constant.
  // Default 0.40; clamped to [0.10, 0.90] to prevent extreme dilution or over-weighting.
  const FLOOR_COEFFICIENT = clampFloor(0.4);
  const floor = topCritical ? Math.round(topCritical.ars * FLOOR_COEFFICIENT) : 0;
  const floorApplied = topCritical !== undefined && floor > weightedAvg;
  // ERS is operational-only. Quantum exposure is reported separately via QES
  // (see qes.ts); it is NOT blended here.
  const quantumComponent = computeQuantumRiskComponent(scored); // retained for display only
  const ers = Math.min(100, Math.max(weightedAvg, floor));

  const topAssets = [...scored]
    .map((x) => ({
      id: x.asset.id,
      name: x.asset.name,
      ars: x.ars,
      bi: x.bi,
      rps: x.ars,
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
    driverBuckets: buildDriverBuckets(),
    history: ersHistory(ers),
    historySample: true,
  };
}

export function defaultBI(asset: ITAsset): BusinessImpact {
  if (asset.environment !== "Production") return asset.environment === "Staging" ? "Moderate" : "Low";
  if (/Database|API Gateway/.test(asset.assetClass)) return "Critical";
  if (asset.criticalViolations >= 2) return "Critical";
  if (asset.criticalViolations >= 1) return "High";
  return "Moderate";
}

export function ersDefault(): ErsBreakdown {
  const bi: Record<string, BusinessImpact> = {};
  mockITAssets.forEach((a) => {
    bi[a.id] = defaultBI(a);
  });
  return computeERS(mockITAssets, bi);
}
