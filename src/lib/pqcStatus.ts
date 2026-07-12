// src/lib/pqcStatus.ts
//
// The PQC column value, DERIVED FROM POLICY, not from the static pqcRisk field.
//
// It runs the object through the active (enabled) Post-Quantum policies using
// the same evaluation engine the platform uses everywhere, carrying each
// policy's declared deadline profile. The object's PQC state is the verdict of
// the policy that fires, so changing a policy or its profile changes the column.
// Nothing here re-classifies the algorithm on its own.

import type { CryptoAsset } from "@/data/mockData";
import { policyRules } from "@/data/mockData";
import { objectViolatesPolicy, type EvaluableObject } from "@/lib/policyEval";

// Map an object to the shape the engine evaluates, stamping the policy's frame
// (deadline profile) so quantum_status is judged against that policy.
function toEvaluable(a: CryptoAsset, profileId?: string): EvaluableObject {
  return {
    id: a.id,
    type: a.type,
    algorithm: a.algorithm,
    keyLength: a.keyLength,
    signatureAlgorithm: a.signatureAlgorithm,
    protocolVersion: a.protocolVersion,
    cipherSuite: a.cipherSuite,
    profileId,
  } as EvaluableObject;
}

// Severity scale PQCBadge/SeverityBadge already renders.
export type PqcColumnValue = "Critical" | "High" | "Medium" | "Low" | "Safe";

// Only enabled Post-Quantum policies participate. A policy is PQC if its type
// says so, or its conditions use the quantum operands.
function pqcPolicies() {
  return (policyRules as any[]).filter((p) => {
    if (p.enabled === false) return false;
    const t = String(p.type || "").toLowerCase();
    if (t.includes("post-quantum") || t.includes("pqc")) return true;
    const cg = JSON.stringify(p.conditionGroups || "");
    return /quantum_axis|pqc_posture|quantum_status|deadline_class/.test(cg);
  });
}

// Rank so the most severe firing policy wins the badge.
const RANK: Record<PqcColumnValue, number> = { Critical: 4, High: 3, Medium: 2, Low: 1, Safe: 0 };

function severityToValue(sev?: string): PqcColumnValue {
  const s = String(sev || "").toLowerCase();
  if (s.startsWith("crit")) return "Critical";
  if (s.startsWith("high")) return "High";
  if (s.startsWith("med")) return "Medium";
  if (s.startsWith("low")) return "Low";
  return "Safe";
}

export interface PqcVerdict {
  value: PqcColumnValue;
  policyId?: string;
  policyName?: string;
}

/** Policy-derived PQC state for one object. Safe when no PQC policy fires. */
export function pqcStatusFor(a: CryptoAsset): PqcVerdict {
  let best: PqcVerdict = { value: "Safe" };
  for (const p of pqcPolicies()) {
    const obj = toEvaluable(a, p.profileId);
    const fired = objectViolatesPolicy(obj, p.conditionGroups || [], p.groupLogic || "AND");
    if (!fired) continue;
    const v = severityToValue(p.severity);
    if (RANK[v] > RANK[best.value]) {
      best = { value: v, policyId: p.id, policyName: p.name };
    }
  }
  return best;
}
