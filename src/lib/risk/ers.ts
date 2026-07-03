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
  pts: number; // real ERS reduction if this population is resolved (marginal, through the engine)
  contribution: number; // severity-weighted risk mass this factor represents (drives the bar length)
  count: number; // affected crypto objects
  objectIds: string[]; // for ticket-coverage lookup
  severity: Severity;
  urgency: string; // grounded urgency signal (expiry clock, exposure, etc.)
  urgencyScore: number; // for the "urgency" sort lens
}

interface DriverDef {
  id: string;
  triageType: string;
  label: string;
  framework: string;
  urgencyWeight: number;
  predicate: (a: CryptoAsset) => boolean;
  urgency: (objs: CryptoAsset[]) => string;
}

const DRIVER_DEFS: DriverDef[] = [
  {
    id: "expired",
    triageType: "Certs",
    label: "Expired certificates on live endpoints",
    framework: "NIST SP 1800-16",
    urgencyWeight: 100,
    predicate: VIOLATION_FILTERS.cert_expired.predicate,
    urgency: (o) => `${o.length} expired now`,
  },
  {
    id: "1",
    triageType: "Certs",
    label: "Certificates expiring within 7 days",
    framework: "NIST SP 1800-16",
    urgencyWeight: 90,
    predicate: VIOLATION_FILTERS.cert_expiring_7d.predicate,
    urgency: (o) => {
      const d = Math.min(...o.map((x) => x.daysToExpiry).filter((n) => n >= 0));
      return isFinite(d) ? `soonest ${d}d` : "expiring soon";
    },
  },
  {
    id: "3",
    triageType: "SSH",
    label: "Suspicious SSH user keys with shell access",
    framework: "NIST SP 800-53 AC-17",
    urgencyWeight: 80,
    predicate: VIOLATION_FILTERS.ssh_suspicious.predicate,
    urgency: () => "active shell access",
  },
  {
    id: "6",
    triageType: "Certs",
    label: "RSA-1024 / SHA-1 certificates in use",
    framework: "NIST SP 800-131A",
    urgencyWeight: 50,
    predicate: VIOLATION_FILTERS.cert_weak_algo.predicate,
    urgency: () => "non-compliant algorithm",
  },
  {
    id: "9",
    triageType: "SSH",
    label: "Rogue SSH host keys off-platform",
    framework: "NIST SP 800-53 AC-17",
    urgencyWeight: 60,
    predicate: VIOLATION_FILTERS.ssh_rogue.predicate,
    urgency: () => "unmanaged provenance",
  },
  {
    id: "8",
    triageType: "Secrets",
    label: "Secrets not rotated in 90+ days",
    framework: "NIST SP 800-57",
    urgencyWeight: 40,
    predicate: VIOLATION_FILTERS.secret_unrotated_90d.predicate,
    urgency: () => "stale credentials",
  },
  {
    id: "orphaned",
    triageType: "Secrets",
    label: "Orphaned secrets with no owner",
    framework: "NIST SP 800-53 AC-2",
    urgencyWeight: 45,
    predicate: VIOLATION_FILTERS.secret_orphaned.predicate,
    urgency: () => "ownerless",
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
// SAMPLE history for the prototype: a deterministic 12-week series that ends at the
// live ERS. This is illustrative sample data, not stored telemetry. When real ERS
// snapshots are persisted, swap this for the stored series (same shape).
function ersHistory(current: number): { label: string; value: number }[] {
  const N = 12;
  const start = Math.min(100, current + 11);
  const pts: { label: string; value: number }[] = [];
  for (let i = 0; i < N; i++) {
    const base = start + (current - start) * (i / (N - 1));
    const wiggle = Math.sin(i * 1.7) * 2.4 + Math.cos(i * 0.9) * 1.3;
    const v = i === N - 1 ? current : Math.max(0, Math.min(100, Math.round(base + wiggle)));
    pts.push({ label: i === N - 1 ? "now" : `${N - 1 - i}w`, value: v });
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
  const baseline = ersScoreOver(mockAssets);
  const rows = DRIVER_DEFS.map((def) => {
    const objs = mockAssets.filter(def.predicate);
    if (objs.length === 0) return null;
    const resolvedIds = new Set(objs.map((o) => o.id));
    const modified = mockAssets.map((o) => (resolvedIds.has(o.id) ? resolveObject(o) : o));
    const ersAfter = ersScoreOver(modified);
    const pts = Math.max(0, baseline - ersAfter);
    let maxCrs = 0;
    let contribution = 0;
    objs.forEach((o) => {
      const crs = computeCRS(o).crs;
      if (crs > maxCrs) maxCrs = crs;
      const asset = OBJ_ASSET_BI[o.id];
      const bi = asset ? defaultBI(asset) : "Low";
      contribution += crs * BI_WEIGHT[bi];
    });
    return {
      id: def.id,
      triageType: def.triageType,
      label: def.label,
      framework: def.framework,
      count: objs.length,
      objectIds: objs.map((o) => o.id),
      pts,
      contribution,
      severity: severityFor(maxCrs),
      urgency: def.urgency(objs),
      urgencyScore: def.urgencyWeight + maxCrs,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return rows.sort((a, b) => b.contribution - a.contribution);
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
