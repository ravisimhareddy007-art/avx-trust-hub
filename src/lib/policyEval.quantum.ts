// src/lib/policyEval.quantum.ts
//
// Quantum operand model. Property-based, not a verdict.
//
// KEY CHANGE: quantumStatus no longer hardcodes "RSA after 2035 = disallowed".
// The deprecated/disallowed ruling comes from the deadline PROFILE the policy
// carries (NIST IR 8547 / EO 14412 / CNSA 2.0 / EU), a declared, visible
// property of the policy. This function reports the algorithm's properties
// (axis, posture) and applies the profile's own dates. The compliance officer
// owns the ruling via the profile; it is not buried here.

import { DEADLINE_PROFILES, DEFAULT_PROFILE, type DeadlineProfileId } from "@/lib/risk/qes";

const PQC_KEM = ["ML-KEM", "KYBER"];
const PQC_SIG = ["ML-DSA", "SLH-DSA", "DILITHIUM", "SPHINCS", "FALCON", "FN-DSA", "XMSS", "LMS"];
const CLASSICAL_KEM = ["ECDH", "DH", "DHE", "ECDHE", "X25519", "X448"];
const CLASSICAL_SIG = ["ECDSA", "DSA", "ED25519", "ED448", "RSA-PSS", "RSASSA"];

export type QuantumAxis = "kem" | "signature" | "both" | "symmetric" | "hash" | "none";
export type PqcPosture = "classical" | "hybrid" | "pqc";
export type QuantumStatus = "safe" | "vulnerable" | "deprecated" | "disallowed";

function norm(algorithm?: string): string {
  return (algorithm || "").toUpperCase().trim();
}
function isPqc(algo: string): boolean {
  return [...PQC_KEM, ...PQC_SIG].some((p) => algo.includes(p));
}
function isHybrid(algo: string): boolean {
  const hasClassical = [...CLASSICAL_KEM, "RSA", "ECC"].some((c) => algo.includes(c));
  if (hasClassical && isPqc(algo)) return true;
  return /(?:X25519|SECP256R1|P256|P384).*(?:MLKEM|KYBER)/.test(algo.replace(/[-_\s]/g, ""));
}

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
    return "both";
  }
  if (CLASSICAL_SIG.some((s) => algo.includes(s)) || PQC_SIG.some((s) => algo.includes(s))) return "signature";
  if (CLASSICAL_KEM.some((k) => algo.includes(k)) || PQC_KEM.some((k) => algo.includes(k))) return "kem";
  if (algo.startsWith("ECC")) return signContext ? "signature" : "kem";
  return "none";
}

export function pqcPosture(algorithm?: string): PqcPosture {
  const algo = norm(algorithm);
  if (isHybrid(algo)) return "hybrid";
  if (isPqc(algo)) return "pqc";
  return "classical";
}

const CURRENT_YEAR = 2026;

export function quantumStatus(
  algorithm?: string,
  keyLengthBits?: number,
  objectType?: string,
  profileId: DeadlineProfileId = DEFAULT_PROFILE,
  asOfYear: number = CURRENT_YEAR,
): QuantumStatus {
  const algo = norm(algorithm);
  const axis = quantumAxis(algorithm, objectType);
  const posture = pqcPosture(algorithm);

  if (posture === "pqc" || posture === "hybrid") return "safe";

  if (axis === "symmetric") {
    if (algo.startsWith("AES")) return (keyLengthBits ?? 256) >= 256 ? "safe" : "vulnerable";
    return "vulnerable";
  }
  if (axis === "hash") {
    if (algo.includes("SHA-1") || algo.includes("SHA1") || algo.includes("MD5")) return "disallowed";
    return "safe";
  }

  const profile = DEADLINE_PROFILES[profileId];
  const obj = { type: objectType ?? "" } as { type: string };
  const dueYear = axis === "signature" ? profile.sigDueYear(obj as any) : profile.kemDueYear(obj as any);

  const deprecateFrom = dueYear - 5;
  if (asOfYear >= dueYear) return "disallowed";
  if (asOfYear >= deprecateFrom) return "deprecated";
  return "vulnerable";
}

export function quantumVulnDerived(
  algorithm?: string,
  keyLengthBits?: number,
  objectType?: string,
  profileId?: DeadlineProfileId,
  asOfYear?: number,
): string {
  const s = quantumStatus(algorithm, keyLengthBits, objectType, profileId, asOfYear);
  return s === "safe" ? "Quantum-Safe" : "Quantum-Vulnerable";
}

export type DeadlineClass = "kem_2030" | "sig_2031" | "disallow_2035" | "cnsa_per_class" | "none";

export function deadlineClassFor(algorithm?: string, objectType?: string): DeadlineClass {
  const axis = quantumAxis(algorithm, objectType);
  const posture = pqcPosture(algorithm);
  if (posture !== "classical") return "none";
  if (axis === "kem" || axis === "both") return "kem_2030";
  if (axis === "signature") return "sig_2031";
  if (axis === "symmetric") return "cnsa_per_class";
  return "none";
}

export function kexList(obj: any): string {
  return [...(obj.cipherSuites?.map((c: any) => c.kex) ?? []), obj.kexStrength]
    .filter(Boolean)
    .join(", ")
    .toLowerCase();
}
export function cipherEncList(obj: any): string {
  return (obj.cipherSuites?.map((c: any) => c.enc) ?? []).filter(Boolean).join(", ").toLowerCase();
}
export function cipherMacList(obj: any): string {
  return (obj.cipherSuites?.map((c: any) => c.mac) ?? []).filter(Boolean).join(", ").toLowerCase();
}
