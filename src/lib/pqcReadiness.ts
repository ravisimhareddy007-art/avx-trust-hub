// src/lib/pqcReadiness.ts
//
// PQC Migration Readiness: the compliance/progress number. An object counts as
// "ready" when it is NOT quantum-vulnerable — its algorithm is already PQC, or
// is quantum-resistant (AES-256, SHA-2/3, etc.). This is the same algorithm +
// key-length verdict the inventory PQC column and the QES engine use, so the
// number cannot drift from what the drill-through shows. (The earlier "no active
// PQC policy fires" definition read ~84%, but that was a policy-COVERAGE
// artifact: most vulnerable objects simply had no policy scoped to them yet, so
// they counted as ready. Algorithm truth is the honest denominator.)
//
// Two numbers:
//   rawPct      = quantum-safe objects / all objects   (the head count)
//   weightedPct = QOE-weighted: how much of the EXPOSURE is retired (the wedge)
//
// weightedPct is the exact complement of the QES exposure share: it is the
// fraction of total QOE sitting in already-safe objects, so 100 - weightedPct is
// the quantum exposure QES still reports as live. rawPct (a head count) is
// deliberately NOT that — count and risk are different questions, and the gap
// between them (many low-risk objects safe, a few high-risk ones not) is the
// point.

import type { CryptoAsset } from "@/data/mockData";
import { mockAssets } from "@/data/mockData";
import { pqcPosture, quantumStatus } from "@/lib/policyEval.quantum";
import { computeQOE, DEFAULT_Q_DAY } from "@/lib/risk/qes";

export interface PqcReadiness {
  rawPct: number;
  weightedPct: number;
  ready: number;
  total: number;
  atRisk: number;
}

// Same predicate the inventory filters and QES use: a classical algorithm the
// engine does not rate quantum-safe.
const isQuantumVulnerable = (a: CryptoAsset): boolean =>
  pqcPosture(a.algorithm) === "classical" &&
  quantumStatus(a.algorithm, parseInt(String(a.keyLength), 10) || undefined, a.type) !== "safe";

export function computePqcReadiness(objects: CryptoAsset[] = mockAssets, qDay: number = DEFAULT_Q_DAY): PqcReadiness {
  let ready = 0;
  let total = 0;
  let readyWeight = 0;
  let totalWeight = 0;

  for (const a of objects) {
    total++;
    const isReady = !isQuantumVulnerable(a);
    // weight by exposure so a migrated high-value object counts for more
    const weight = Math.max(computeQOE(a, qDay).qoe, 1);
    totalWeight += weight;
    if (isReady) {
      ready++;
      readyWeight += weight;
    }
  }

  return {
    rawPct: total === 0 ? 100 : Math.round((ready / total) * 100),
    weightedPct: totalWeight === 0 ? 100 : Math.round((readyWeight / totalWeight) * 100),
    ready,
    total,
    atRisk: total - ready,
  };
}
