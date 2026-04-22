import type { CryptoAsset } from '@/data/mockData';

export type ScoredCert = CryptoAsset & { crs: number };

export interface CertCounts {
  total: number;
  sampleSize: number;
  scaleFactor: number;
  all: ScoredCert[];
  critical: ScoredCert[];
  high: ScoredCert[];
  medium: ScoredCert[];
  low: ScoredCert[];
  compliant: ScoredCert[];
  expired: ScoredCert[];
  expiring7d: ScoredCert[];
  expiring30d: ScoredCert[];
  healthy: ScoredCert[];
  noAutoRenewal: ScoredCert[];
  quantumVulnerable: ScoredCert[];
  weakAlgorithm: ScoredCert[];
  legacyAlgorithm: ScoredCert[];
  orphaned: ScoredCert[];
}