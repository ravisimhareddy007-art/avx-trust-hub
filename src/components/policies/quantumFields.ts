// src/components/policies/quantumFields.ts
//
// Shared quantum operand field definitions for the policy builder.
// Define once here, spread into each policy-type block in policyFields.ts,
// so the four new operands appear identically everywhere quantum_vuln does,
// without pasting the same block eight times.

import type { FieldDef } from "./policyFields";

// The four axis/status/posture/deadline operands (enum), plus the protocol
// cipher-component operands (text) for Protocol & Cipher policies.

export const QUANTUM_FIELDS: FieldDef[] = [
  {
    id: "quantum_axis",
    label: "Quantum Axis",
    kind: "enum",
    options: ["kem", "signature", "both", "symmetric", "hash", "none"],
    derived: true,
    hint: "What the algorithm is for. kem = key establishment (harvest-now-decrypt-later); signature = forgery risk only. Drives which deadline applies.",
  },
  {
    id: "pqc_posture",
    label: "PQC Posture",
    kind: "enum",
    options: ["classical", "hybrid", "pqc"],
    derived: true,
    hint: "Transition state. hybrid = classical + ML-KEM in one handshake (NIST-recommended interim). Counted by the readiness score.",
  },
  {
    id: "quantum_status",
    label: "Quantum Status",
    kind: "enum",
    options: ["safe", "vulnerable", "deprecated", "disallowed"],
    derived: true,
    hint: "Time-aware compliance state per NIST IR 8547. deprecated after 2030 (risk-accept with justification); disallowed after 2035 (no exceptions).",
  },
  {
    id: "deadline_class",
    label: "Governing Deadline",
    kind: "enum",
    options: ["kem_2030", "sig_2031", "disallow_2035", "cnsa_per_class", "none"],
    derived: true,
    hint: "Which mandate binds this object. EO 14412: key establishment 2030, signatures 2031. CNSA 2.0: AES-256 for NSS.",
  },
  {
    id: "quantum_vuln",
    label: "Quantum Vulnerability",
    kind: "enum",
    options: ["Quantum-Vulnerable", "Quantum-Safe"],
    derived: true,
    hint: "Derived view over the model (vulnerable = status in vulnerable/deprecated/disallowed). Kept for existing policies.",
  },
];

// Protocol & Cipher policies also get the negotiated cipher-component operands.
// text-kind so they work with contains / is-in-list against the joined suite set.
export const PROTOCOL_QUANTUM_FIELDS: FieldDef[] = [
  {
    id: "kex_list",
    label: "Key Exchange (negotiated)",
    kind: "text",
    derived: true,
    hint: "All key-exchange methods across negotiated cipher suites. Use 'contains' to flag classical KEM, e.g. contains ecdhe / dh / rsa.",
  },
  {
    id: "cipher_enc_list",
    label: "Ciphers (negotiated)",
    kind: "text",
    derived: true,
    hint: "All bulk ciphers across negotiated suites. e.g. contains 3des / rc4 / cbc.",
  },
  {
    id: "cipher_mac_list",
    label: "MACs (negotiated)",
    kind: "text",
    derived: true,
    hint: "All MACs across negotiated suites. e.g. contains sha1 / md5.",
  },
];
