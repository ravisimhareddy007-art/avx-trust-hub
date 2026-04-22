// Level 1 — Crypto Risk Score (CRS): per cryptographic object.
// Computed from the 5 ECRS factors, applied at the OBJECT level.
// Existing CryptoObjectsTab already has its own per-object math; we keep this
// file focused on a thin, deterministic mapping from a CryptoAsset to a CRS
// number so ARS rollups stay reproducible.

import type { CryptoAsset } from '@/data/mockData';

export interface CrsFactor {
  id: 'algorithm' | 'lifecycle' | 'exposure' | 'access' | 'compliance';
  label: string;
  raw: number;          // 0–100 severity for this object
  weight: number;       // raw weight (will be normalised)
  why: string;          // human-readable evidence
  color: string;
}

const ALG_RAW: Record<string, number> = {
  'RSA-1024': 95, 'SHA-1': 95,
  'RSA-2048': 75, 'RSA-3072': 35, 'RSA-4096': 25,
  'ECC P-256': 50, 'ECC P-384': 30, 'Ed25519': 15,
  'AES-256': 5, 'HMAC-SHA256': 20, 'JWT-RS256': 55,
  'ML-KEM-768': 5, 'ML-DSA-65': 5,
};

function lifecycleRaw(a: CryptoAsset): { v: number; why: string } {
  if (a.status === 'Expired')  return { v: 100, why: 'Already expired' };
  if (a.status === 'Orphaned') return { v: 90,  why: 'Orphaned · no owner' };
  if (a.daysToExpiry >= 0 && a.daysToExpiry <= 7)  return { v: 90, why: `Expires in ${a.daysToExpiry}d (≤7)` };
  if (a.daysToExpiry > 7 && a.daysToExpiry <= 30)  return { v: 70, why: `Expires in ${a.daysToExpiry}d (≤30)` };
  if (a.daysToExpiry > 30 && a.daysToExpiry <= 90) return { v: 45, why: `Expires in ${a.daysToExpiry}d (≤90)` };
  if (!a.autoRenewal && a.daysToExpiry > 0)        return { v: 30, why: 'No auto-renewal' };
  if (a.type === 'AI Agent Token') {
    if (!a.autoRenewal && a.rotationFrequency?.includes('365')) return { v: 90, why: 'Static long-lived credential — never auto-rotated, high exposure window' };
    if (!a.autoRenewal && a.rotationFrequency?.includes('90'))  return { v: 70, why: 'Long rotation cycle (90d) without auto-renewal — manual rotation risk' };
    if (!a.autoRenewal && a.rotationFrequency?.includes('30'))  return { v: 50, why: '30-day rotation without auto-renewal — moderate staleness risk' };
    if (a.autoRenewal  && a.rotationFrequency?.includes('7'))   return { v: 20, why: 'Weekly auto-rotation — good credential hygiene' };
    if (a.autoRenewal  && a.rotationFrequency?.includes('24'))  return { v: 8,  why: 'JIT / 24-hour auto-rotation — best practice credential lifecycle' };
  }
  return { v: 15, why: 'Healthy lifecycle' };
}

function exposureRaw(a: CryptoAsset): { v: number; why: string } {
  if (a.environment === 'Production' && a.tags.some(t => /pci|production|edge|wildcard/i.test(t)))
    return { v: 80, why: 'Prod-facing / wildcard / regulated scope' };
  if (a.environment === 'Production') return { v: 55, why: 'Production exposure' };
  if (a.environment === 'Staging')    return { v: 30, why: 'Staging exposure' };
  if (a.type === 'AI Agent Token') {
    const sensitiveServices = ['Active Directory', 'Firewall', 'PII', 'CrowdStrike', 'HSM', 'Splunk'];
    const matched = sensitiveServices.filter(s => a.agentMeta?.servicesAccessed?.some(svc => svc.includes(s)));
    const hasSensitive = matched.length > 0;
    const serviceCount = a.agentMeta?.servicesAccessed?.length || 0;
    if (hasSensitive && a.environment === 'Production') return { v: 85, why: `Accesses high-sensitivity resources (${matched.join(', ')}) in production` };
    if (hasSensitive) return { v: 65, why: 'Accesses high-sensitivity resources' };
    if (serviceCount > 6 && a.environment === 'Production') return { v: 60, why: `Wide service access (${serviceCount} services) in production` };
    if (a.environment === 'Production') return { v: 50, why: 'Production AI agent' };
  }
  return { v: 15, why: 'Internal / dev only' };
}

function accessRaw(a: CryptoAsset): { v: number; why: string } {
  if (a.owner === 'Unassigned') return { v: 80, why: 'No owner assigned' };
  if (a.agentMeta?.permissionRisk === 'Over-privileged')
    return { v: 70, why: 'Over-privileged AI agent token' };
  if (a.policyViolations >= 2) return { v: 60, why: `${a.policyViolations} policy violations` };
  if (a.policyViolations === 1) return { v: 40, why: '1 policy violation' };
  return { v: 15, why: 'Access controls in good standing' };
}

function complianceRaw(a: CryptoAsset): { v: number; why: string } {
  // Use pqcRisk as a proxy for compliance posture vs PQC mandates.
  switch (a.pqcRisk) {
    case 'Critical': return { v: 90, why: 'PQC-vulnerable · NIST 2030 deadline' };
    case 'High':     return { v: 65, why: 'PQC-at-risk · migration window open' };
    case 'Medium':   return { v: 40, why: 'PQC-watch · monitor for downgrade' };
    case 'Low':      return { v: 20, why: 'Compliant with current standards' };
    case 'Safe':     return { v: 5,  why: 'PQC-safe algorithm' };
  }
  if (a.type === 'AI Agent Token') {
    const noActivity = !a.agentMeta?.lastActivity || a.agentMeta.lastActivity.includes('days ago');
    const highVolume = (a.agentMeta?.actionsPerDay || 0) > 10000;
    const expired = a.status === 'Expired';
    if (expired && noActivity) return { v: 88, why: 'Expired token with no recent activity trace — audit gap, NIS2 Art. 21 non-compliant' };
    if (highVolume && a.policyViolations > 0) return { v: 70, why: `High-volume agent (${a.agentMeta?.actionsPerDay?.toLocaleString()} actions/day) with policy violations — incomplete audit coverage` };
    if (noActivity) return { v: 55, why: 'No recent activity recorded — audit trail incomplete' };
    if (a.autoRenewal && (a.agentMeta?.actionsPerDay || 0) > 0) return { v: 15, why: 'Active agent with auto-rotation — audit trail traceable' };
    return { v: 35, why: 'Partial audit trail — activity logged but rotation is manual' };
  }
}

export function getCrsFactors(a: CryptoAsset): CrsFactor[] {
  const algRaw = ALG_RAW[a.algorithm] ?? 50;
  const lc = lifecycleRaw(a);
  const ex = exposureRaw(a);
  const ac = accessRaw(a);
  const co = complianceRaw(a);
  return [
    { id: 'algorithm',  label: 'Algorithm',  raw: algRaw, weight: 31, why: a.algorithm, color: 'hsl(var(--coral))' },
    { id: 'lifecycle',  label: 'Lifecycle',  raw: lc.v,   weight: 24, why: lc.why,      color: 'hsl(var(--amber))' },
    { id: 'exposure',   label: 'Exposure',   raw: ex.v,   weight: 19, why: ex.why,      color: 'hsl(var(--purple))' },
    { id: 'access',     label: 'Access',     raw: ac.v,   weight: 15, why: ac.why,      color: 'hsl(15 72% 62%)' },
    { id: 'compliance', label: 'Compliance', raw: co.v,   weight: 11, why: co.why,      color: 'hsl(var(--teal))' },
  ];
}

export type RiskClass = 'operational' | 'quantum' | 'both';

export interface CrsBreakdown {
  crs: number;
  factors: CrsFactor[];
  riskClass: RiskClass;
}

export function getRiskClass(a: CryptoAsset): RiskClass {
  const QUANTUM_VULNERABLE = ['RSA-1024', 'RSA-2048', 'RSA-3072', 'RSA-4096', 'ECC P-256', 'ECC P-384', 'ECDSA', 'ECDH', 'DSA', 'DH', 'Ed25519'];
  const isQuantum = QUANTUM_VULNERABLE.some(alg =>
    a.algorithm.includes(alg.split('-')[0]) || a.algorithm === alg
  );
  const isOperational = (
    a.status === 'Expired' ||
    a.status === 'Orphaned' ||
    (a.daysToExpiry >= 0 && a.daysToExpiry <= 30) ||
    a.policyViolations > 0 ||
    a.owner === 'Unassigned' ||
    ALG_RAW[a.algorithm] >= 85
  );
  if (isOperational && isQuantum) return 'both';
  if (isQuantum) return 'quantum';
  return 'operational';
}

export function computeCRS(a: CryptoAsset): CrsBreakdown {
  const factors = getCrsFactors(a);
  const totalW = factors.reduce((s, f) => s + f.weight, 0);
  const raw = factors.reduce((s, f) => s + f.raw * (f.weight / totalW), 0);
  const crs = Math.min(100, Math.round(raw));
  return { crs, factors, riskClass: getRiskClass(a) };
}

export function getFactorContribution(f: CrsFactor, factors: CrsFactor[]): number {
  const totalW = factors.reduce((s, x) => s + x.weight, 0);
  return Math.round(f.raw * (f.weight / totalW));
}
