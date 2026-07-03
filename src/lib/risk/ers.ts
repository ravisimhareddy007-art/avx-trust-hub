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
}

export interface ErsDriver {
  id: string; // triage violation id (deep-links into the scoped triage)
  triageType: string; // triage category tab key
  label: string; // precise, monitoring-safe condition
  pts: number; // real ERS reduction if this population is resolved (marginal, through the engine)
  count: number; // affected crypto objects
  severity: Severity;
  urgency: string; // grounded urgency signal (expiry clock, exposure, etc.)
}

interface DriverDef {
  id: string;
  triageType: string;
  label: string;
  predicate: (a: CryptoAsset) => boolean;
  urgency: (objs: CryptoAsset[]) => string;
}

const DRIVER_DEFS: DriverDef[] = [
  {
    id: "expired",
    triageType: "Certs",
    label: "Expired certificates on live endpoints",
    predicate: VIOLATION_FILTERS.cert_expired.predicate,
    urgency: (o) => `${o.length} expired now`,
  },
  {
    id: "1",
    triageType: "Certs",
    label: "Certificates expiring within 7 days",
    predicate: VIOLATION_FILTERS.cert_expiring_7d.predicate,
    urgency: (o) => {
      const d = Math.min(...o.map((x) => x.daysToExpiry).filter((n) => n >= 0));
      return isFinite(d) ? `soonest ${d}d` : "expiring soon";
    },
  },
  {
    id: "6",
    triageType: "Certs",
    label: "RSA-1024 / SHA-1 certificates in use",
    predicate: VIOLATION_FILTERS.cert_weak_algo.predicate,
    urgency: () => "non-compliant algorithm",
  },
  {
    id: "3",
    triageType: "SSH",
    label: "Suspicious SSH user keys with shell access",
    predicate: VIOLATION_FILTERS.ssh_suspicious.predicate,
    urgency: () => "active shell access",
  },
  {
    id: "9",
    triageType: "SSH",
    label: "Rogue SSH host keys off-platform",
    predicate: VIOLATION_FILTERS.ssh_rogue.predicate,
    urgency: () => "unmanaged provenance",
  },
  {
    id: "8",
    triageType: "Secrets",
    label: "Secrets not rotated in 90+ days",
    predicate: VIOLATION_FILTERS.secret_unrotated_90d.predicate,
    urgency: () => "stale credentials",
  },
  {
    id: "orphaned",
    triageType: "Secrets",
    label: "Orphaned secrets with no owner",
    predicate: VIOLATION_FILTERS.secret_orphaned.predicate,
    urgency: () => "ownerless",
  },
  {
    id: "pqc-1",
    triageType: "PQC",
    label: "Quantum-vulnerable algorithms (NIST 2030)",
    predicate: (a) => a.pqcRisk === "Critical" || a.pqcRisk === "High",
    urgency: () => "NIST 2030 deadline",
  },
];

// A fully-remediated version of an object: healthy lifecycle, owned, compliant.
// Used only to measure "what if this were fixed" for marginal attribution.
function resolveObject(o: CryptoAsset): CryptoAsset {
  return {
    ...o,
    status: "Active",
    daysToExpiry: 365,
    autoRenewal: true,
    policyViolations: 0,
    owner: o.owner === "Unassigned" ? "security-team" : o.owner,
    algorithm: /RSA-1024|SHA-1|DSA/.test(o.algorithm) ? "RSA-3072" : o.algorithm,
    signatureAlgorithm: o.signatureAlgorithm === "SHA-1" ? "SHA-256" : o.signatureAlgorithm,
    pqcRisk: "Low",
  } as CryptoAsset;
}

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
function buildDriverBuckets(): ErsDriver[] {
  const baseline = ersScoreOver(mockAssets);
  const rows = DRIVER_DEFS.map((def) => {
    const objs = mockAssets.filter(def.predicate);
    if (objs.length === 0) return null;
    const resolvedIds = new Set(objs.map((o) => o.id));
    const modified = mockAssets.map((o) => (resolvedIds.has(o.id) ? resolveObject(o) : o));
    const ersAfter = ersScoreOver(modified);
    const pts = Math.max(0, baseline - ersAfter);
    const maxCrs = Math.max(...objs.map((o) => computeCRS(o).crs));
    return {
      id: def.id,
      triageType: def.triageType,
      label: def.label,
      count: objs.length,
      pts,
      severity: severityFor(maxCrs),
      urgency: def.urgency(objs),
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return rows.sort((a, b) => b.pts - a.pts).slice(0, 5);
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
  };
}

export function defaultBI(asset: ITAsset): BusinessImpact {
  if (asset.environment !== "Production") return asset.environment === "Staging" ? "Moderate" : "Low";
  if (/Vault|HSM|Database|API Gateway/.test(asset.type)) return "Critical";
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
