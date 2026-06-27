// Level Q — Quantum Exposure Score (QES). Separate from CRS/ARS/ERS.
// Higher = worse, same direction and bands as the operational scores.
// Concentration-anchored (mirrors ARS); never count-based / averaged.
// Pure exposure: NO crypto-agility, NO programme-maturity, NO percent-migrated.

import type { CryptoAsset } from '@/data/mockData';
import type { ITAsset } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';
import { mockITAssets } from '@/data/inventoryMockData';

// Canonical quantum-vulnerable set — single source of truth.
const QUANTUM_VULNERABLE = ['RSA', 'ECC', 'ECDSA', 'ECDH', 'DSA', 'DH', 'Ed25519', 'JWT-RS'];
function isQuantumVulnerable(algorithm: string): boolean {
  if (/AES-256|SHA-256|SHA-384|ML-KEM|ML-DSA|SLH-DSA/.test(algorithm)) return false;
  return QUANTUM_VULNERABLE.some(q => algorithm.includes(q));
}
export function algVuln(algorithm: string): number {
  if (/ML-KEM|ML-DSA|SLH-DSA|AES-256|SHA-256|SHA-384/.test(algorithm)) return 0;
  if (/AES-128/.test(algorithm)) return 30;            // Grover-weakened (platform calibration)
  if (/Ed25519/.test(algorithm)) return 90;            // Shor-breakable but classically strong: ranks below RSA/ECC
  if (isQuantumVulnerable(algorithm)) return 100;
  return 0;
}

// --- Derived HNDL / exposure inputs (deterministic from existing fields) ---
export type DataSensitivity = 'Restricted' | 'Confidential' | 'Internal' | 'Public';

export function deriveSensitivity(a: CryptoAsset): DataSensitivity {
  const t = (a.tags || []).join(' ').toLowerCase();
  if (/pci|phi|pii|secret|payment|financial|hsm/.test(t)) return 'Restricted';
  if (a.environment === 'Production' && /wildcard|edge|api/i.test(t)) return 'Confidential';
  if (a.environment === 'Production') return 'Confidential';
  if (a.environment === 'Staging') return 'Internal';
  return a.type === 'Code-Signing Certificate' ? 'Confidential' : 'Internal';
}
const SENS_W: Record<DataSensitivity, number> = { Restricted: 1.0, Confidential: 0.75, Internal: 0.5, Public: 0.25 };

export function deriveLifespanYears(a: CryptoAsset): number {
  const t = (a.tags || []).join(' ').toLowerCase();
  if (/financial|payment|pci/.test(t)) return 8;
  if (/phi|health|pii/.test(t)) return 12;
  if (a.type === 'Code-Signing Certificate') return 6;
  if (a.type === 'SSH Key' || a.type === 'SSH Certificate') return 3;
  if (a.type === 'API Key / Secret') return 0.5;
  if (a.type === 'Encryption Key') return 7;
  if (a.type === 'TLS Certificate') return 2;
  return 1;
}

function exposureScore(a: CryptoAsset): number {
  // Root / trust anchors carry maximum exposure regardless of network reachability:
  // their compromise breaks every certificate beneath them.
  const isTrustAnchor = /\b(root|issuing|intermediate)\b/i.test(a.name)
    || /\bCA\b/.test(a.name)
    || (a.tags || []).some(t => /root|trust-anchor|issuing-ca|intermediate/i.test(t));
  if (isTrustAnchor) return 100;
  const ephemeral = a.type === 'API Key / Secret'
    || (a.rotationFrequency?.includes('7') ?? false) || (a.rotationFrequency?.includes('24') ?? false);
  const longLived = deriveLifespanYears(a) >= 2;
  const facing = a.environment === 'Production'
    && (a.tags || []).some(t => /edge|wildcard|public|api|pci/i.test(t));
  if (facing && longLived) return 100;                 // internet-facing + long-lived
  if (a.environment === 'Production' && longLived) return 60;   // internal production
  if (ephemeral) return 10;                            // ephemeral
  if (a.environment === 'Production') return 40;       // internal restricted
  if (a.environment === 'Staging') return 30;
  return 20;
}

export interface QoeBreakdown {
  qoe: number; algVuln: number; hndl: number; exposure: number;
  sensitivity: DataSensitivity; lifespanYears: number; vulnerable: boolean;
}

export function computeQOE(a: CryptoAsset): QoeBreakdown {
  const av = algVuln(a.algorithm);
  const sensitivity = deriveSensitivity(a);
  const lifespanYears = deriveLifespanYears(a);
  const hndl = SENS_W[sensitivity] * Math.min(1, lifespanYears / 10) * 100;
  const exposure = exposureScore(a);
  const qoe = av === 0 ? 0 : Math.min(100, Math.round(0.35 * av + 0.35 * hndl + 0.30 * exposure));
  return { qoe, algVuln: av, hndl: Math.round(hndl), exposure, sensitivity, lifespanYears, vulnerable: av >= 100 };
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

export interface QesBreakdown {
  qes: number; maxQoe: number; p90: number; p75: number;
  criticalHNDLCount: number; vulnerableCount: number; totalObjects: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  topObjects: { id: string; name: string; qoe: number; algorithm: string; sensitivity: string; lifespanYears: number }[];
}

export function qesSeverity(score: number): QesBreakdown['severity'] {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

export function computeQES(objects: CryptoAsset[] = mockAssets): QesBreakdown {
  const scored = objects.map(o => ({ o, b: computeQOE(o) }));
  const qoes = scored.map(x => x.b.qoe);
  const sortedAsc = [...qoes].sort((a, b) => a - b);
  const maxQoe = qoes.length ? Math.max(...qoes) : 0;
  const p90 = percentile(sortedAsc, 90);
  const p75 = percentile(sortedAsc, 75);
  const criticalHNDLCount = scored.filter(x => x.b.qoe >= 80).length;
  const vulnerableCount = scored.filter(x => x.b.vulnerable).length;
  const severityAnchor = 0.55 * maxQoe + 0.45 * (0.6 * p90 + 0.4 * p75);
  const criticalFloor = criticalHNDLCount > 0
    ? Math.min(100, 52 + 4.8 * Math.log(criticalHNDLCount))
    : 0;
  const qes = Math.min(100, Math.round(Math.max(severityAnchor, criticalFloor)));
  const topObjects = [...scored].sort((a, b) => b.b.qoe - a.b.qoe).slice(0, 8).map(x => ({
    id: x.o.id, name: x.o.name, qoe: x.b.qoe, algorithm: x.o.algorithm,
    sensitivity: x.b.sensitivity, lifespanYears: x.b.lifespanYears,
  }));
  return { qes, maxQoe, p90, p75, criticalHNDLCount, vulnerableCount, totalObjects: objects.length, severity: qesSeverity(qes), topObjects };
}

// Migration readiness (separate from QES — program signals, not exposure).
export interface ReadinessRollup {
  pipeline: Record<string, number>;
  agilityBlocked: number;
  vulnerable: number;
  migrated: number;
  projectedCompletionYear: number;
  onTrack: boolean;
}
export function deriveQthStatus(a: CryptoAsset): 'Not assessed' | 'In assessment' | 'Migration planned' | 'In-flight' | 'Migrated' {
  if (algVuln(a.algorithm) === 0) return 'Migrated';
  const seed = a.id.charCodeAt(a.id.length - 1) % 10;
  if (seed < 6) return 'Not assessed';
  if (seed < 8) return 'In assessment';
  if (seed < 9) return 'Migration planned';
  return 'In-flight';
}
export function cryptoAgile(a: CryptoAsset): boolean {
  if (a.type === 'API Key / Secret' || a.type === 'Code-Signing Certificate') return false;
  return a.autoRenewal === true;
}
export function computeReadiness(objects: CryptoAsset[] = mockAssets): ReadinessRollup {
  const pipeline: Record<string, number> = { 'Not assessed': 0, 'In assessment': 0, 'Migration planned': 0, 'In-flight': 0, 'Migrated': 0 };
  let agilityBlocked = 0, vulnerable = 0, migrated = 0;
  objects.forEach(o => {
    const st = deriveQthStatus(o); pipeline[st]++;
    const vuln = algVuln(o.algorithm) >= 100;
    if (vuln) { vulnerable++; if (!cryptoAgile(o)) agilityBlocked++; }
    if (st === 'Migrated') migrated++;
  });
  const total = objects.length || 1;
  const migratedPct = migrated / total;
  const paceYears = migratedPct > 0 ? Math.ceil((1 - migratedPct) / Math.max(migratedPct, 0.01)) : 99;
  const projectedCompletionYear = new Date().getFullYear() + Math.min(paceYears, 12);
  return { pipeline, agilityBlocked, vulnerable, migrated, projectedCompletionYear, onTrack: projectedCompletionYear <= 2030 };
}

export function explainQES(b: QesBreakdown): string {
  if (b.qes === 0) return 'No quantum-vulnerable objects: the estate is effectively quantum-safe.';
  const floorDriven = b.criticalHNDLCount > 0
    && (52 + 4.8 * Math.log(b.criticalHNDLCount)) >= (0.55 * b.maxQoe + 0.45 * (0.6 * b.p90 + 0.4 * b.p75));
  if (floorDriven) {
    return `Driven by concentration: ${b.criticalHNDLCount} maximally-exposed object${b.criticalHNDLCount === 1 ? '' : 's'} hold the score up regardless of how many safe objects surround them.`;
  }
  return `Anchored on the worst object (QOE ${b.maxQoe}); ${b.vulnerableCount} of ${b.totalObjects} objects are quantum-vulnerable.`;
}

export function explainQOE(b: QoeBreakdown): string {
  if (b.qoe === 0) return 'Quantum-safe algorithm: no harvest-now-decrypt-later exposure.';
  const driver = b.hndl >= b.exposure ? `long-lived ${b.sensitivity.toLowerCase()} data (${b.lifespanYears}y)` : 'high reachability';
  return `Quantum-vulnerable algorithm protecting ${driver}: a harvest-now-decrypt-later target.`;
}

export interface BacklogItem {
  asset: CryptoAsset;
  priority: number;
  qoe: number;
  sensitivity: DataSensitivity;
  lifespanYears: number;
  agilityBlocked: boolean;
  qthStatus: ReturnType<typeof deriveQthStatus>;
}

export function qmBacklog(objects: CryptoAsset[] = mockAssets, year: number = new Date().getFullYear()): BacklogItem[] {
  return objects
    .filter(o => algVuln(o.algorithm) >= 90)
    .map(o => {
      const b = computeQOE(o);
      return {
        asset: o,
        priority: qmPriority(o, year),
        qoe: b.qoe,
        sensitivity: b.sensitivity,
        lifespanYears: b.lifespanYears,
        agilityBlocked: !cryptoAgile(o),
        qthStatus: deriveQthStatus(o),
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function qesFor(asset: ITAsset): QesBreakdown {
  const objs = asset.cryptoObjectIds.map(id => mockAssets.find(a => a.id === id)).filter(Boolean) as CryptoAsset[];
  return computeQES(objs);
}

const SENS_PRIORITY: Record<DataSensitivity, number> = { Restricted: 4, Confidential: 3, Internal: 2, Public: 1 };
export function qmPriority(a: CryptoAsset, year: number = new Date().getFullYear()): number {
  const sens = SENS_PRIORITY[deriveSensitivity(a)];
  const lifespan = Math.min(1, deriveLifespanYears(a) / 10);
  const vuln = algVuln(a.algorithm) >= 90 ? 1 : algVuln(a.algorithm) === 30 ? 0.3 : 0;
  const urgency = Math.max(0.25, (2030 - year) / 6);
  return Math.round(sens * lifespan * vuln * urgency * 100) / 100;
}
