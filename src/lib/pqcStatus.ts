// src/lib/pqcStatus.ts
//
// The PQC column value, DERIVED FROM POLICY. Returns the PQC STATUS WORD
// (Disallowed / Deprecated / Vulnerable / Safe), not a risk severity. PQC state
// is a compliance posture, not a fifth risk score, so it is shown as its own
// vocabulary, distinct from CRS/ARS/ERS severities.
//
// An object's status is the verdict of the most-advanced active PQC policy that
// fires against it, evaluated through the same engine as everywhere else. No
// static field, no standalone re-classification driving the display.

import type { CryptoAsset } from "@/data/mockData";
import { policyRules } from "@/data/mockData";
import { objectViolatesPolicy, type EvaluableObject } from "@/lib/policyEval";
import { quantumStatus, type QuantumStatus } from "@/lib/policyEval.quantum";

export type PqcStatusWord = "Disallowed" | "Deprecated" | "Vulnerable" | "Safe";

const LABEL: Record<QuantumStatus, PqcStatusWord> = {
  disallowed: "Disallowed",
  deprecated: "Deprecated",
  vulnerable: "Vulnerable",
  safe: "Safe",
};
const RANK: Record<PqcStatusWord, number> = { Disallowed: 3, Deprecated: 2, Vulnerable: 1, Safe: 0 };

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

function pqcPolicies() {
  return (policyRules as any[]).filter((p) => {
    if (p.enabled === false) return false;
    const t = String(p.type || "").toLowerCase();
    if (t.includes("post-quantum") || t.includes("pqc")) return true;
    const cg = JSON.stringify(p.conditionGroups || "");
    return /quantum_axis|pqc_posture|quantum_status|deadline_class/.test(cg);
  });
}

export interface PqcVerdict {
  status: PqcStatusWord;
  policyId?: string;
  policyName?: string;
}

/** Policy-derived PQC status word for one object. Safe when no PQC policy fires. */
export function pqcStatusFor(a: CryptoAsset): PqcVerdict {
  const policies = pqcPolicies();

  // No active PQC policy at all: fall back to the profile-aware classifier so
  // the column is never blank, but this is still the platform's own status,
  // not a hardcoded seed field.
  if (policies.length === 0) {
    const s = quantumStatus(a.algorithm, parseInt(String(a.keyLength), 10) || undefined, a.type);
    return { status: LABEL[s] };
  }

  let best: PqcVerdict = { status: "Safe" };
  for (const p of policies) {
    const obj = toEvaluable(a, p.profileId);
    const fired = objectViolatesPolicy(obj, p.conditionGroups || [], p.groupLogic || "AND");
    if (!fired) continue;
    // the status this policy asserts for the object, judged under its profile
    const s = quantumStatus(a.algorithm, parseInt(String(a.keyLength), 10) || undefined, a.type, p.profileId);
    const word = LABEL[s] === "Safe" ? "Vulnerable" : LABEL[s]; // a fired policy means not safe
    if (RANK[word] > RANK[best.status]) {
      best = { status: word, policyId: p.id, policyName: p.name };
    }
  }
  return best;
}
