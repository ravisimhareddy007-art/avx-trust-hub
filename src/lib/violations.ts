import type { CryptoAsset } from '@/data/mockData';
import { algVuln, computeQOE } from '@/lib/risk/qes';

// Canonical, single source of truth for the policy violations of a cryptographic
// object. Every surface (Inventory, Quantum Readiness, Violations page, drawers,
// remediation) must derive both the count and the named list from here, so the
// same object never shows a different number or a different set of violations in
// two places. Violations are derived deterministically from the object's real
// attributes, so the named items always match the object's actual algorithm,
// expiry, ownership, and quantum status.

export type ViolationKind = 'operational' | 'quantum';

export interface CryptoViolation {
  id: string;                 // stable per object+rule
  kind: ViolationKind;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;              // the named violation, e.g. "Quantum-vulnerable algorithm (RSA-2048)"
  policyMapping: string;      // the policy/standard it breaches
  recommendation: string;
}

const WEAK_KEYS = /^(RSA-1024|DSA|DSA-1024|RSA-1536)/i;

export function getCryptoViolations(asset: CryptoAsset): CryptoViolation[] {
  const v: CryptoViolation[] = [];
  const oid = asset.id;

  // ── Operational violations (from the object's real lifecycle facts) ──
  if (asset.status === 'Expired' || asset.daysToExpiry === 0) {
    v.push({
      id: `${oid}-op-expired`, kind: 'operational', severity: 'Critical',
      title: 'Certificate expired',
      policyMapping: 'CA/Browser Forum Baseline Requirements; internal renewal SLA',
      recommendation: 'Renew and replace immediately; investigate dependent services.',
    });
  } else if (asset.daysToExpiry > 0 && asset.daysToExpiry <= 7) {
    v.push({
      id: `${oid}-op-expiring`, kind: 'operational', severity: 'Critical',
      title: 'Certificate expiring in under 7 days',
      policyMapping: 'Internal renewal SLA',
      recommendation: 'Schedule renewal now to avoid an outage.',
    });
  }

  if (asset.rotationFrequency === 'Never' || asset.status === 'Orphaned') {
    v.push({
      id: `${oid}-op-rotation`, kind: 'operational', severity: 'High',
      title: 'Rotation overdue (no rotation policy)',
      policyMapping: 'NIST SP 800-57 key lifecycle',
      recommendation: 'Assign a rotation schedule and rotate the key.',
    });
  }

  if (asset.owner === 'Unassigned') {
    v.push({
      id: `${oid}-op-owner`, kind: 'operational', severity: 'Medium',
      title: 'No assigned owner',
      policyMapping: 'Internal ownership policy',
      recommendation: 'Assign an accountable owner and team.',
    });
  }

  if (WEAK_KEYS.test(asset.algorithm)) {
    v.push({
      id: `${oid}-op-weak`, kind: 'operational', severity: 'High',
      title: `Deprecated key strength (${asset.algorithm})`,
      policyMapping: 'NIST SP 800-131A Rev 2',
      recommendation: 'Replace with an acceptable key length or PQC-safe algorithm.',
    });
  }

  // ── Quantum violations (from the object's real algorithm + exposure) ──
  if (algVuln(asset.algorithm) >= 90) {
    const q = computeQOE(asset);
    const severity: CryptoViolation['severity'] = q.qoe >= 80 ? 'Critical' : q.qoe >= 60 ? 'High' : 'Medium';
    v.push({
      id: `${oid}-q-algo`, kind: 'quantum', severity,
      title: `Quantum-vulnerable algorithm (${asset.algorithm})`,
      policyMapping: 'NIST IR 8547; NSA CNSA 2.0 (deprecate by 2030)',
      recommendation: 'Plan migration to a FIPS 203/204 algorithm; prioritise by harvest-now-decrypt-later exposure.',
    });
  }

  return v;
}

export function cryptoViolationCount(asset: CryptoAsset): number {
  return getCryptoViolations(asset).length;
}

export function cryptoQuantumViolationCount(asset: CryptoAsset): number {
  return getCryptoViolations(asset).filter(x => x.kind === 'quantum').length;
}

export function cryptoOperationalViolationCount(asset: CryptoAsset): number {
  return getCryptoViolations(asset).filter(x => x.kind === 'operational').length;
}