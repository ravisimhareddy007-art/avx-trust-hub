// Policy evaluation engine (prototype, client-side).
// Evaluates a policy's condition tree against a crypto object, and resolves
// which active policies apply to an object via group membership.
//
// Field values are DERIVED from the object's existing attributes where possible
// (e.g. signature algorithm and quantum status from `algorithm`), so the mock
// objects do not all need new fields. A few genuinely new flags (self-signed,
// protocol version, revocation status) are read from optional enrichment fields.

import { OPERATORS } from '@/components/policies/policyFields';
import {
  quantumAxis, pqcPosture, quantumStatus, deadlineClass,
  quantumVulnDerived, kexList, cipherEncList, cipherMacList,
} from "./policyEval.quantum";

export interface EvalCondition { id: string; field: string; operator: string; value: string; }
export interface EvalGroup { id: string; innerLogic: 'AND' | 'OR'; rows: EvalCondition[]; }

// Minimal shape we read off a crypto object (mockData entry).
export interface EvaluableObject {
  id: string;
  type?: string;
  algorithm?: string;        // e.g. "RSA-2048", "ECC P-256", "AES-256-GCM", "SHA1withRSA"
  keyLength?: string | number;
  environment?: string;
  caIssuer?: string;
  daysToExpiry?: number;
  rotationFrequency?: string; // e.g. "90 days", "Never"
  lastRotated?: string;
  // optional enrichment flags (added to mock data where relevant):
  signatureAlgorithm?: string;   // e.g. "SHA-1", "SHA-256", "MD5"
  isSelfSigned?: boolean;
  revocationStatus?: string;     // "Valid" | "Revoked"
  protocolVersion?: string;      // "TLS 1.0".."TLS 1.3"
  cipherSuite?: string;
  hasExpiry?: boolean;
  protectionLevel?: string;      // "HSM-Protected" | "Software-Protected"
}

// --- field derivation: map a policy field id to a comparable value on the object
function deriveFieldValue(obj: EvaluableObject, field: string): string | number | boolean | undefined {
  const algo = (obj.algorithm || '').toUpperCase();
  const keyBits = typeof obj.keyLength === 'string' ? parseInt(obj.keyLength, 10) : obj.keyLength;
  switch (field) {
    case 'sig_algo':
      if (obj.signatureAlgorithm) return obj.signatureAlgorithm;
      if (algo.includes('SHA1') || algo.includes('SHA-1')) return 'SHA-1';
      if (algo.includes('MD5')) return 'MD5';
      return 'SHA-256';
    case 'key_type':
    case 'key_algorithm':
      if (algo.startsWith('RSA')) return 'RSA';
      if (algo.startsWith('ECC') || algo.startsWith('ECDSA')) return 'ECDSA';
      if (algo.startsWith('ED25519')) return 'Ed25519';
      if (algo.startsWith('DSA')) return 'DSA';
      if (algo.startsWith('AES')) return 'AES';
      if (algo.startsWith('DH')) return 'DH';
      if (algo.startsWith('ML-KEM')) return 'ML-KEM';
      if (algo.startsWith('ML-DSA')) return 'ML-DSA';
      return algo.split('-')[0] || algo;
    case 'key_bits': return keyBits;
    case 'issuing_ca':
    case 'signing_ca': return obj.caIssuer;
    case 'expiry_days':
    case 'cert_expiry_days': return obj.daysToExpiry;
    case 'is_self_signed': return !!obj.isSelfSigned;
    case 'revocation_status': return obj.revocationStatus || 'Valid';
    case 'protocol_version': return obj.protocolVersion;
    case 'cipher_suite': return obj.cipherSuite;
    case 'protection_level': return obj.protectionLevel;
    case 'has_expiry': return obj.hasExpiry !== undefined ? obj.hasExpiry : (obj.daysToExpiry !== undefined && obj.daysToExpiry >= 0);
    case 'rotation_enabled': return (obj.rotationFrequency || '').toLowerCase() !== 'never';
    case 'days_since_rotation': {
      if (!obj.lastRotated) return undefined;
      const d = (Date.now() - new Date(obj.lastRotated).getTime()) / 86400000;
      return Math.max(0, Math.round(d));
    }
    case 'quantum_axis':
      return quantumAxis(obj.algorithm, (obj as any).type);
    case 'pqc_posture':
      return pqcPosture(obj.algorithm);
    case 'quantum_status':
      return quantumStatus(obj.algorithm, keyBits, (obj as any).qDay);
    case 'deadline_class':
      return deadlineClass(obj.algorithm, (obj as any).type);
    case 'quantum_vuln': // kept: now a derived VIEW over the model, not the model
      return quantumVulnDerived(obj.algorithm, keyBits, (obj as any).qDay);
    case 'kex_list':
      return kexList(obj);
    case 'cipher_enc_list':
      return cipherEncList(obj);
    case 'cipher_mac_list':
      return cipherMacList(obj);
    default: return undefined;
  }
}

function compare(actual: string | number | boolean | undefined, operator: string, raw: string): boolean {
  if (operator === 'is_true') return actual === true;
  if (operator === 'is_false') return actual === false;
  if (actual === undefined || actual === null) return false;
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const aStr = String(actual).toLowerCase();
  const aNum = typeof actual === 'number' ? actual : parseFloat(String(actual));
  const vNum = parseFloat(raw);
  switch (operator) {
    case 'eq': return aStr === raw.trim().toLowerCase();
    case 'neq': return aStr !== raw.trim().toLowerCase();
    case 'lt': return !isNaN(aNum) && !isNaN(vNum) && aNum < vNum;
    case 'gt': return !isNaN(aNum) && !isNaN(vNum) && aNum > vNum;
    case 'lte': return !isNaN(aNum) && !isNaN(vNum) && aNum <= vNum;
    case 'gte': return !isNaN(aNum) && !isNaN(vNum) && aNum >= vNum;
    case 'contains': return aStr.includes(raw.trim().toLowerCase());
    case 'ncontains': return !aStr.includes(raw.trim().toLowerCase());
    case 'in': return list.includes(aStr);
    case 'nin': return !list.includes(aStr);
    default: return false;
  }
}

function evalRow(obj: EvaluableObject, row: EvalCondition): boolean {
  if (!row.field || !row.operator) return false;
  // OPERATORS reference kept to ensure operator validity surface stays consistent.
  void OPERATORS;
  const actual = deriveFieldValue(obj, row.field);
  return compare(actual, row.operator, row.value);
}

function evalGroup(obj: EvaluableObject, group: EvalGroup): boolean {
  const rows = group.rows.filter(r => r.field && r.operator);
  if (!rows.length) return false;
  return group.innerLogic === 'OR'
    ? rows.some(r => evalRow(obj, r))
    : rows.every(r => evalRow(obj, r));
}

/** True if the object VIOLATES the policy (its conditions match). */
export function objectViolatesPolicy(
  obj: EvaluableObject,
  groups: EvalGroup[],
  groupLogic: 'AND' | 'OR'
): boolean {
  const active = groups.filter(g => g.rows.some(r => r.field && r.operator));
  if (!active.length) return false;
  return groupLogic === 'OR'
    ? active.some(g => evalGroup(obj, g))
    : active.every(g => evalGroup(obj, g));
}

/** Per-condition breakdown for a single object (for preview/debugging). */
export function explainObject(obj: EvaluableObject, groups: EvalGroup[]): Array<{ field: string; operator: string; value: string; pass: boolean; actual: string }>{
  return groups.flatMap(g => g.rows.filter(r => r.field && r.operator).map(r => ({
    field: r.field, operator: r.operator, value: r.value,
    pass: evalRow(obj, r),
    actual: String(deriveFieldValue(obj, r.field) ?? '—'),
  })));
}
