// src/components/policies/policyFrame.ts
//
// The Classical / Post-Quantum FRAME a policy is authored under. This is the
// upfront choice that (a) filters which operands the builder shows and
// (b) binds a PQC policy to a deadline profile, so the regulatory ruling
// (deprecated-vs-disallowed dates) is a declared, visible property of the
// policy rather than a hidden code assumption.

import type { DeadlineProfileId } from "@/lib/risk/qes";

export type PolicyFrame = "classical" | "pqc";

export const POLICY_FRAMES: { id: PolicyFrame; label: string; hint: string }[] = [
  {
    id: "classical",
    label: "Classical",
    hint: "Present-day cryptographic hygiene: weak algorithms, key sizes, expiry, protocol versions.",
  },
  {
    id: "pqc",
    label: "Post-Quantum",
    hint: "Quantum exposure against a regulatory deadline. Binds to a deadline profile that defines the deprecated/disallowed dates.",
  },
];

// Field ids that belong to the PQC frame. When frame === 'pqc', the builder
// shows these (plus the shared object properties like key_algorithm/key_bits);
// when 'classical', it hides them.
export const PQC_FIELD_IDS = new Set<string>([
  "quantum_axis",
  "pqc_posture",
  "quantum_status",
  "deadline_class",
  "kex_list",
  "cipher_enc_list",
  "cipher_mac_list",
]);

// Object-property fields shared by both frames (facts, not quantum rulings).
export const SHARED_FIELD_IDS = new Set<string>([
  "algorithm",
  "key_algorithm",
  "key_type",
  "key_bits",
  "sig_algo",
  "protocol_version",
  "cipher_suite",
]);

export const DEFAULT_PROFILE_FOR_FRAME: Record<PolicyFrame, DeadlineProfileId | undefined> = {
  classical: undefined,
  pqc: "NIST_IR_8547",
};

/** Filter a policy-type's field list to the chosen frame. */
export function fieldsForFrame<T extends { id: string }>(fields: T[], frame: PolicyFrame): T[] {
  if (frame === "pqc") {
    return fields.filter((f) => PQC_FIELD_IDS.has(f.id) || SHARED_FIELD_IDS.has(f.id));
  }
  // classical: everything EXCEPT the pqc-only operands
  return fields.filter((f) => !PQC_FIELD_IDS.has(f.id));
}
