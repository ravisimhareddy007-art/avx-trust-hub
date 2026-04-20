// Level 2 — Asset Risk Score (ARS): per IT asset, derived from its CRS objects.
// Formula (per spec):
//   ARS = min(100, 0.55·max(CRS) + 0.45·(0.6·P90 + 0.4·P75)
//                 + log(1+critCount)·4 + log(1+highCount)·2)
// Falls back to 0 when an asset has no crypto objects.

import { mockAssets, type CryptoAsset } from '@/data/mockData';
import type { ITAsset } from '@/data/inventoryMockData';
import { computeCRS } from './crs';
import { severityFor } from './types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export interface ArsBreakdown {
  ars: number;
  max: number;
  p90: number;
  p75: number;
  count: number;
  critCount: number;
  highCount: number;
  topObjects: { id: string; name: string; crs: number; reason: string }[];
}

export function computeARS(asset: ITAsset, allObjects: CryptoAsset[] = mockAssets): ArsBreakdown {
  const objs = asset.cryptoObjectIds
    .map(id => allObjects.find(a => a.id === id))
    .filter(Boolean) as CryptoAsset[];

  if (objs.length === 0) {
    return { ars: 0, max: 0, p90: 0, p75: 0, count: 0, critCount: 0, highCount: 0, topObjects: [] };
  }

  const scored = objs.map(o => ({ o, crs: computeCRS(o) }));
  const sorted = [...scored.map(x => x.crs)].sort((a, b) => a - b); // ascending
  const max = Math.max(...sorted);
  const p90 = percentile(sorted, 90);
  const p75 = percentile(sorted, 75);
  const critCount = scored.filter(x => severityFor(x.crs) === 'Critical').length;
  const highCount = scored.filter(x => severityFor(x.crs) === 'High').length;

  const ars = Math.min(
    100,
    Math.round(
      0.55 * max +
      0.45 * (0.6 * p90 + 0.4 * p75) +
      Math.log(1 + critCount) * 4 +
      Math.log(1 + highCount) * 2
    )
  );

  const topObjects = [...scored]
    .sort((a, b) => b.crs - a.crs)
    .slice(0, 5)
    .map(x => ({
      id: x.o.id,
      name: x.o.name,
      crs: x.crs,
      reason:
        x.o.daysToExpiry >= 0 && x.o.daysToExpiry <= 7
          ? `Expires in ${x.o.daysToExpiry}d`
          : x.o.pqcRisk === 'Critical'
          ? `PQC-vulnerable · ${x.o.algorithm}`
          : x.o.owner === 'Unassigned'
          ? 'Orphaned · no owner'
          : `${x.o.policyViolations} policy violations`,
    }));

  return { ars, max, p90, p75, count: objs.length, critCount, highCount, topObjects };
}

// Memoised per-asset ARS — cheap enough to recompute, but cache so list sorts
// don't rerun on every render.
const cache = new Map<string, ArsBreakdown>();
export function arsFor(asset: ITAsset): ArsBreakdown {
  const key = asset.id + ':' + asset.cryptoObjectIds.join(',');
  if (!cache.has(key)) cache.set(key, computeARS(asset));
  return cache.get(key)!;
}

export function arsScore(asset: ITAsset): number {
  return arsFor(asset).ars;
}
