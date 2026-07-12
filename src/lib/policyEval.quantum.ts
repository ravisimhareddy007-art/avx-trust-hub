// src/lib/policyEval.quantum.ts
//
// Quantum operand model. Replaces the single binary `quantum_vuln` with the
// orthogonal properties NIST IR 8547 / CNSA 2.0 / EO 14412 actually distinguish:
// axis (kem vs signature vs symmetric), posture (classical/hybrid/pqc),
// time-aware status (deprecated 2030 vs disallowed 2035), and governing deadline.
//
// All derived from fields the object already carries (algorithm, keyLength, type).
// No new discovery data required.

// ── Algorithm classification ────────────────────────────────────────────────

const PQC_KEM = ["ML-KEM", "KYBER"];

const PQC_SIG = ["ML-DSA", "SLH-DSA", "DILITHIUM", "SPHINCS", "FALCON", "FN-DSA", "XMSS", "LMS"];

const CLASSICAL_KEM = ["ECDH", "DH", "DHE", "ECDHE", "X25519", "X448"];

const CLASSICAL_SIG = ["ECDSA", "DSA", "ED25519", "ED448", "RSA-PSS", "RSASSA"];

// RSA is both: key transport (kem-like) and signatures. Resolved by object type below.

export type QuantumAxis = "kem" | "signature" | "both" | "symmetric" | "hash" | "none";

export type PqcPosture = "classical" | "hybrid" | "pqc";

export type QuantumStatus = "safe" | "vulnerable" | "deprecated" | "disallowed";

export type DeadlineClass =
  | "kem_2030" | "sig_2031" | "disallow_2035" | "cnsa_per_class" | "none";

function norm(algorithm?: string): string {
  return (algorithm || "").toUpperCase().trim();
}

function isPqc(algo: string): boolean {
  return [...PQC_KEM, ...PQC_SIG].some((p) => algo.includes(p));
}

/** True when a hybrid construction is present, e.g. "ECDHE + ML-KEM-768" or "X25519MLKEM768". */
function isHybrid(algo: string): boolean {
  const hasClassical = [...CLASSICAL_KEM, "RSA", "ECC"].some((c) => algo.includes(c));
  const hasPqc = isPqc(algo);
  if (hasClassical && hasPqc) return true;
  // common concatenated hybrid identifiers
  return /(?:X25519|SECP256R1|P256|P384).*(?:MLKEM|KYBER)/.test(algo.replace(/[-_\s]/g, ""));
}

// ── Axis: what the algorithm is FOR ─────────────────────────────────────────

// objectType lets RSA resolve correctly: an RSA *certificate* signs (signature),
// an RSA *KMS/HSM key* or RSA in a TLS key exchange establishes keys (kem).

export function quantumAxis(algorithm?: string, objectType?: string): QuantumAxis {
  const algo = norm(algorithm);
  if (!algo) return "none";

  if (algo.startsWith("AES") || algo.includes("CHACHA")) return "symmetric";
  if (algo.startsWith("SHA") || algo.startsWith("MD5")) return "hash";

  const t = (objectType || "").toLowerCase();
  const signContext = t.includes("cert") || t.includes("signing") || t.includes("signature");
  const keyContext = t.includes("kms") || t.includes("hsm") || t.includes("encryption") || t.includes("kem");

  if (algo.startsWith("RSA")) {
    if (signContext) return "signature";
    if (keyContext) return "kem";
    return "both"; // unknown context: RSA can do either, so flag both
  }

  if (CLASSICAL_SIG.some((s) => algo.includes(s)) || PQC_SIG.some((s) => algo.includes(s))) return "signature";
  if (CLASSICAL_KEM.some((k) => algo.includes(k)) || PQC_KEM.some((k) => algo.includes(k))) return "kem";
  if (algo.startsWith("ECC")) return signContext ? "signature" : "kem";

  return "none";
}

// ── Posture: classical / hybrid / pqc ───────────────────────────────────────

export function pqcPosture(algorithm?: string): PqcPosture {
  const algo = norm(algorithm);
  if (isHybrid(algo)) return "hybrid";
  if (isPqc(algo)) return "pqc";
  return "classical";
}

// ── Time-aware status per IR 8547 ───────────────────────────────────────────

// qDay is the assumed quantum-relevant date the user selected. The schedule is
// fixed: deprecated after 2030, disallowed after 2035. Symmetric AES-256 and
// SHA-2+ are NOT on the schedule (Grover only halves strength).

const CURRENT_YEAR = 2026;

export function quantumStatus(
  algorithm?: string,
  keyLengthBits?: number,
  qDay: number = 2035,
): QuantumStatus {
  const algo = norm(algorithm);
  const axis = quantumAxis(algorithm);
  const posture = pqcPosture(algorithm);

  if (posture === "pqc") return "safe";
  if (posture === "hybrid") return "safe"; // hybrid is safe unless both halves break

  // Symmetric: AES-256 safe; AES-128 acceptable under general NIST, finding only under CNSA 2.0
  if (axis === "symmetric") {
    if (algo.startsWith("AES")) return (keyLengthBits ?? 256) >= 256 ? "safe" : "vulnerable";
    return "vulnerable";
  }

  if (axis === "hash") {
    if (algo.includes("SHA-1") || algo.includes("SHA1") || algo.includes("MD5")) return "disallowed";
    return "safe"; // SHA-256+ not on the PQC schedule
  }

  // Public-key classical (RSA/ECC/ECDH/ECDSA/DSA/FFDH/Ed25519): the IR 8547 cliff.
  const horizon = Math.min(qDay, CURRENT_YEAR); // where we sit today vs the schedule
  if (horizon >= 2035) return "disallowed";
  if (horizon >= 2030) return "deprecated";
  return "vulnerable"; // pre-2030: quantum-vulnerable, not yet deprecated by date
}

// ── Governing deadline ──────────────────────────────────────────────────────

export function deadlineClass(algorithm?: string, objectType?: string): DeadlineClass {
  const axis = quantumAxis(algorithm, objectType);
  const posture = pqcPosture(algorithm);

  if (posture !== "classical") return "none";

  if (axis === "kem" || axis === "both") return "kem_2030";   // EO 14412 key establishment
  if (axis === "signature") return "sig_2031";                // EO 14412 signatures
  if (axis === "symmetric") return "cnsa_per_class";          // CNSA 2.0 AES-256 for NSS

  return "none";
}

// ── Derived binary, kept for backward compatibility ─────────────────────────

// Existing policies reading `quantum_vuln` keep working: it is now a view over
// the model, not the model itself.

export function quantumVulnDerived(algorithm?: string, keyLengthBits?: number, qDay?: number): string {
  const s = quantumStatus(algorithm, keyLengthBits, qDay);
  return s === "safe" ? "Quantum-Safe" : "Quantum-Vulnerable";
}

// ── Protocol cipher-suite operands (for Classical-Key-Establishment policy) ──

// ProtocolAsset carries cipherSuites[] with {kex, auth, enc, mac, strength}.

export function kexList(obj: any): string {
  return [
    ...(obj.cipherSuites?.map((c: any) => c.kex) ?? []),
    obj.kexStrength,
  ].filter(Boolean).join(", ").toLowerCase();
}

export function cipherEncList(obj: any): string {
  return (obj.cipherSuites?.map((c: any) => c.enc) ?? []).filter(Boolean).join(", ").toLowerCase();
}

export function cipherMacList(obj: any): string {
  return (obj.cipherSuites?.map((c: any) => c.mac) ?? []).filter(Boolean).join(", ").toLowerCase();
}
