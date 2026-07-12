// src/lib/pqcReadiness.ts
//
// PQC Readiness: the compliance/progress number, DERIVED FROM THE SAME POLICY
// VERDICTS as the inventory PQC column. It does not re-classify algorithms and
// does not read the static pqcRisk field. An object counts as "ready" when no
// active PQC policy fires against it (pqcStatusFor === "Safe").
//
// Two numbers:
//   rawPct      = ready objects / evaluated objects  (the auditor's ratio)
//   weightedPct = QOE-weighted: how much of what MATTERS is ready (the wedge)
//
// Separate from QES (risk). Never merged: merging reintroduces the dilution QES
// is built to resist.

import type { CryptoAsset } from "@/data/mockData";
import { mockAssets } from "@/data/mockData";
import { pqcStatusFor } from "@/lib/pqcStatus";
import { computeQOE, DEFAULT_Q_DAY } from "@/lib/risk/qes";

export interface PqcReadiness {
  rawPct: number;
  weightedPct: number;
  ready: number;
  total: number;
  atRisk: number;
}

export function computePqcReadiness(
  objects: CryptoAsset[] = mockAssets,
  qDay: number = DEFAULT_Q_DAY,
): PqcReadiness {
  let ready = 0;
  let total = 0;
  let readyWeight = 0;
  let totalWeight = 0;

  for (const a of objects) {
    total++;
    const isReady = pqcStatusFor(a).status === "Safe";
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
