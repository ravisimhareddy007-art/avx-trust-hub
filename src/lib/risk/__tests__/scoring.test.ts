import { describe, it, expect } from 'vitest';
import { computeQOE, computeQES, algVuln } from '../qes';
import type { CryptoAsset } from '@/data/mockData';

function obj(over: Partial<CryptoAsset> & { algorithm: string }): CryptoAsset {
  return {
    id: Math.random().toString(36).slice(2), name: 'test', type: 'TLS Certificate',
    commonName: 'test', caIssuer: 'CA', keyLength: '2048', serial: 'x', owner: 'o', team: 't',
    application: 'a', environment: 'Production', infrastructure: 'i', discoverySource: 'Nmap',
    issueDate: '2025-01-01', expiryDate: '2027-01-01', daysToExpiry: 365, lastRotated: '2025-01-01',
    autoRenewal: true, rotationFrequency: '365', status: 'Active', pqcRisk: 'High',
    policyViolations: 0, dependencyCount: 1, tags: [], ...over,
  } as CryptoAsset;
}
function rep(o: CryptoAsset, n: number): CryptoAsset[] { return Array.from({ length: n }, () => ({ ...o, id: Math.random().toString(36).slice(2) })); }
const band = (v: number) => v >= 80 ? 'Critical' : v >= 60 ? 'High' : v >= 30 ? 'Medium' : 'Low';

const restrictedLongInternet = (alg: string) => obj({ algorithm: alg, type: 'TLS Certificate', tags: ['pci', 'edge'], environment: 'Production' });
const internalShort = (alg: string) => obj({ algorithm: alg, type: 'TLS Certificate', tags: [], environment: 'Development' });

describe('QES enterprise scenarios (calibration suite)', () => {
  const cases: [string, CryptoAsset[], string][] = [
    ['1 RSA-2048 restricted long internet-facing', [restrictedLongInternet('RSA-2048')], 'Critical'],
    ['1000 HNDL-critical among 20000 ML-DSA', [...rep(restrictedLongInternet('RSA-2048'), 1000), ...rep(internalShort('ML-DSA-65'), 20000)], 'Critical'],
    ['All ML-KEM quantum-safe', rep(internalShort('ML-KEM-768'), 200), 'Low'],
    ['Mixed 50 critical among 5000', [...rep(restrictedLongInternet('RSA-2048'), 50), ...rep(internalShort('ML-DSA-65'), 4950)], 'High'],
    ['AES-128 on sensitive long-lived data', rep(obj({ algorithm: 'AES-128', type: 'Code-Signing Certificate', environment: 'Production' }), 100), 'Medium'],
  ];
  it.each(cases)('%s -> %s', (_name, objs, want) => {
    const q = computeQES(objs);
    expect(band(q.qes)).toBe(want);
  });
});

describe('QES invariants (provable properties)', () => {
  it('bounded 0..100', () => {
    expect(computeQES(rep(restrictedLongInternet('RSA-2048'), 50)).qes).toBeLessThanOrEqual(100);
    expect(computeQES([]).qes).toBeGreaterThanOrEqual(0);
  });
  it('quantum-safe estate never scores High or Critical', () => {
    const q = computeQES(rep(internalShort('ML-KEM-768'), 500));
    expect(q.qes).toBeLessThan(60);
  });
  it('concentration is never diluted by volume', () => {
    const buried = computeQES([...rep(restrictedLongInternet('RSA-2048'), 10), ...rep(internalShort('ML-KEM-768'), 100000)]);
    expect(buried.qes).toBeGreaterThanOrEqual(60);
  });
  it('adding an HNDL-critical object never lowers QES', () => {
    const base = rep(internalShort('ML-KEM-768'), 50);
    const before = computeQES(base).qes;
    const after = computeQES([...base, restrictedLongInternet('RSA-2048')]).qes;
    expect(after).toBeGreaterThanOrEqual(before);
  });
  it('Ed25519 ranks below RSA at object level (differentiation)', () => {
    expect(algVuln('Ed25519')).toBe(90);
    expect(algVuln('RSA-2048')).toBe(100);
    const ed = computeQOE(internalShort('Ed25519')).qoe;
    const rsa = computeQOE(internalShort('RSA-2048')).qoe;
    expect(ed).toBeLessThan(rsa);
  });
  it('quantum-safe object scores QOE 0', () => {
    expect(computeQOE(internalShort('ML-DSA-65')).qoe).toBe(0);
  });
});
