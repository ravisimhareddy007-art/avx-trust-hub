// Field / operator catalog for the Custom Policy condition builder.
// Scope: supported cryptographic objects only.
// A policy can only evaluate an attribute that Discovery writes to Inventory.

export type FieldKind = 'number' | 'enum' | 'boolean' | 'text';

export interface FieldDef {
  id: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  options?: string[];
  computed?: boolean; // re-evaluated on the daily clock-driven cycle
  derived?: boolean; // value computed from another attribute (e.g. quantum status from algorithm)
  hint?: string;
}

export interface OperatorDef {
  id: string;
  label: string;
  appliesTo: FieldKind[];
  takesValue: boolean;
}

export const OPERATORS: OperatorDef[] = [
  { id: 'eq', label: 'equals', appliesTo: ['number', 'enum', 'text'], takesValue: true },
  { id: 'neq', label: 'not equals', appliesTo: ['number', 'enum', 'text'], takesValue: true },
  { id: 'lt', label: 'less than', appliesTo: ['number'], takesValue: true },
  { id: 'gt', label: 'greater than', appliesTo: ['number'], takesValue: true },
  { id: 'lte', label: 'less than or equal', appliesTo: ['number'], takesValue: true },
  { id: 'gte', label: 'greater than or equal', appliesTo: ['number'], takesValue: true },
  { id: 'contains', label: 'contains', appliesTo: ['text'], takesValue: true },
  { id: 'ncontains', label: 'does not contain', appliesTo: ['text'], takesValue: true },
  { id: 'is_true', label: 'is true', appliesTo: ['boolean'], takesValue: false },
  { id: 'is_false', label: 'is false', appliesTo: ['boolean'], takesValue: false },
  { id: 'in', label: 'is in list', appliesTo: ['enum', 'text'], takesValue: true },
  { id: 'nin', label: 'is not in list', appliesTo: ['enum', 'text'], takesValue: true },
];

// Policy type label -> available fields. Labels match the create-policy selector.
export const FIELDS_BY_POLICY_TYPE: Record<string, FieldDef[]> = {
  'Certificate Policy': [
    { id: 'expiry_days', label: 'Expiry Days Remaining', kind: 'number', unit: 'days', computed: true },
    { id: 'sig_algo', label: 'Signature Algorithm', kind: 'enum', options: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5'] },
    { id: 'key_type', label: 'Key Type', kind: 'enum', options: ['RSA', 'ECDSA', 'Ed25519', 'DSA'] },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'issuing_ca', label: 'Issuing CA', kind: 'text', hint: 'e.g. DigiCert, Sectigo, internal CA' },
    { id: 'issuance_state', label: 'Issuance State', kind: 'enum', options: ['Deployed', 'Issued-Undeployed'], hint: 'From CA Scan (DigiCert CertCentral in MVP). Issued-Undeployed = issued by the CA but not found on any endpoint.' },
    { id: 'is_self_signed', label: 'Is Self-Signed', kind: 'boolean' },
    { id: 'is_wildcard', label: 'Is Wildcard', kind: 'boolean' },
    { id: 'validity_days', label: 'Validity Period (days)', kind: 'number', unit: 'days' },
    { id: 'chain_complete', label: 'Chain Complete', kind: 'boolean' },
    { id: 'tls_version', label: 'TLS Version Accepted', kind: 'enum', options: ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'] },
    { id: 'cipher_suite', label: 'Cipher Suite', kind: 'enum', options: ['RC4', '3DES', 'NULL', 'Export-grade', 'AES-GCM', 'ChaCha20'] },
    { id: 'revocation_status', label: 'Revocation Status', kind: 'enum', options: ['Valid', 'Revoked', 'Unknown'] },
    { id: 'quantum_vuln', label: 'Quantum Vulnerability', kind: 'enum', options: ['Quantum-Vulnerable', 'Quantum-Safe'], derived: true, hint: 'Derived from the algorithm. RSA/ECC/DH = Vulnerable; ML-KEM/ML-DSA/SLH-DSA = Safe.' },
    { id: 'deployment_scope', label: 'Deployment Scope', kind: 'enum', options: ['Production', 'Staging', 'Development'] },
  ],
  'SSH Key Policy': [
    { id: 'key_type', label: 'Key Type', kind: 'enum', options: ['RSA', 'ECDSA', 'Ed25519', 'DSA'] },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'mac_algo', label: 'MAC Algorithm', kind: 'enum', options: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-md5'] },
    { id: 'key_age', label: 'Key Age (days)', kind: 'number', unit: 'days', computed: true, hint: 'Requires managed SSH source' },
    { id: 'days_since_rotation', label: 'Days Since Last Rotation', kind: 'number', unit: 'days', computed: true, hint: 'Requires managed SSH source' },
    { id: 'quantum_vuln', label: 'Quantum Vulnerability', kind: 'enum', options: ['Quantum-Vulnerable', 'Quantum-Safe'], derived: true, hint: 'Derived from the algorithm. RSA/ECC/DH = Vulnerable; ML-KEM/ML-DSA/SLH-DSA = Safe.' },
  ],
  // SSH certificates are a distinct object from SSH keys: validity, signing CA,
  // principals, key ID, KRL revocation status (per AVX SSH Cert LCM).
  'SSH Certificate Policy': [
    { id: 'cert_expiry_days', label: 'Expiry Days Remaining', kind: 'number', unit: 'days', computed: true },
    { id: 'cert_validity_days', label: 'Validity Period (days)', kind: 'number', unit: 'days' },
    { id: 'signing_ca', label: 'Signing CA', kind: 'text', hint: 'The CA key that signed this SSH certificate.' },
    { id: 'cert_type', label: 'Certificate Type', kind: 'enum', options: ['Host', 'User'] },
    { id: 'principals', label: 'Principals', kind: 'text', hint: 'Authorized principals (usernames or hostnames) bound to the cert.' },
    { id: 'key_id', label: 'Key ID', kind: 'text', hint: 'The certificate key identifier.' },
    { id: 'revocation_status', label: 'Revocation Status', kind: 'enum', options: ['Valid', 'Revoked'], hint: 'Revoked = present on a Key Revocation List (KRL).' },
    { id: 'key_type', label: 'Key Type', kind: 'enum', options: ['RSA', 'ECDSA', 'Ed25519'] },
    { id: 'quantum_vuln', label: 'Quantum Vulnerability', kind: 'enum', options: ['Quantum-Vulnerable', 'Quantum-Safe'], derived: true, hint: 'Derived from the algorithm.' },
  ],
  'Secrets & Tokens Policy': [
    { id: 'secret_type', label: 'Secret Type', kind: 'enum', options: ['API Key', 'OAuth Token', 'Service Account Token', 'Database Credential', 'Encryption Key', 'Certificate', 'SSH Key', 'Generic Secret'] },
    { id: 'has_expiry', label: 'Has Expiry Date', kind: 'boolean' },
    { id: 'expiry_days', label: 'Expiry Days Remaining', kind: 'number', unit: 'days', computed: true, hint: 'For tokens/secrets that carry a TTL or expiry.' },
    { id: 'days_since_rotation', label: 'Days Since Last Rotation', kind: 'number', unit: 'days', computed: true },
    { id: 'days_since_used', label: 'Days Since Last Used', kind: 'number', unit: 'days', computed: true, hint: 'Stale tokens not used in N days (where the source reports usage).' },
    { id: 'is_privileged', label: 'Is Privileged', kind: 'boolean', hint: 'Grants administrative or high-privilege access.' },
    { id: 'vault_source', label: 'Vault / Store Source', kind: 'enum', options: ['HashiCorp Vault', 'CyberArk Conjur', 'AWS Secrets Manager', 'Azure Key Vault', 'Thales CipherTrust'] },
  ],
  // Symmetric/asymmetric keys in cloud KMS, vaults, and HSMs.
  // Industry-standard name is "Encryption Keys"; the defining attribute is
  // protection level (HSM vs software), policed across AWS/GCP/Azure/Oracle.
  'Encryption Keys Policy': [
    { id: 'protection_level', label: 'Protection Level', kind: 'enum', options: ['HSM-Protected', 'Software-Protected'], hint: 'HSM-protected keys never leave the hardware boundary; software-protected do not have that guarantee.' },
    { id: 'key_usage', label: 'Key Usage', kind: 'enum', options: ['Encrypt/Decrypt', 'Sign/Verify', 'Wrap/Unwrap'] },
    { id: 'key_algorithm', label: 'Key Algorithm', kind: 'enum', options: ['AES', 'RSA', 'ECC', 'DH', 'ML-KEM', 'ML-DSA'] },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'rotation_enabled', label: 'Rotation Enabled', kind: 'boolean' },
    { id: 'days_since_rotation', label: 'Days Since Last Rotation', kind: 'number', unit: 'days', computed: true },
    { id: 'is_cmk', label: 'Customer-Managed Key', kind: 'boolean', hint: 'True for customer-managed keys (CMK); false for provider/platform-managed.' },
    { id: 'key_source', label: 'Key Source', kind: 'enum', options: ['AWS KMS', 'Azure Key Vault', 'GCP KMS', 'Fortanix', 'Crypto4A'] },
    { id: 'quantum_vuln', label: 'Quantum Vulnerability', kind: 'enum', options: ['Quantum-Vulnerable', 'Quantum-Safe'], derived: true, hint: 'Derived from the algorithm. RSA/ECC/DH = Vulnerable; ML-KEM/ML-DSA/SLH-DSA = Safe.' },
  ],
  // Cipher and protocol posture from the Network Probe handshake.
  // Field model follows CycloneDX protocolProperties (type, version, cipherSuites).
  'Protocol & Cipher Policy': [
    { id: 'protocol_type', label: 'Protocol', kind: 'enum', options: ['TLS', 'SSH', 'IPSec'] },
    { id: 'protocol_version', label: 'Protocol Version Accepted', kind: 'enum', options: ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3', 'SSHv2', 'IKEv2'] },
    { id: 'cipher_suite', label: 'Cipher Suite', kind: 'enum', options: ['RC4', '3DES', 'NULL', 'Export-grade', 'AES-CBC', 'AES-GCM', 'ChaCha20'] },
    { id: 'mac_algo', label: 'MAC Algorithm', kind: 'enum', options: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-md5'] },
    { id: 'forward_secrecy', label: 'Forward Secrecy', kind: 'boolean', hint: 'True when the endpoint negotiates ECDHE or DHE.' },
    { id: 'quantum_vuln', label: 'Quantum Vulnerability', kind: 'enum', options: ['Quantum-Vulnerable', 'Quantum-Safe'], derived: true, hint: 'Derived from the negotiated key exchange and cipher.' },
  ],
  // Code-found crypto ingested as CBOM (OWASP CycloneDX cryptoProperties).
  // Distinct from other types via the occurrence/evidence model: file, line, confidence.
  'Code / CBOM Policy': [
    { id: 'cbom_asset_type', label: 'Crypto Asset Type', kind: 'enum', options: ['algorithm', 'certificate', 'protocol', 'related-crypto-material'], hint: 'CycloneDX cryptoProperties.assetType.' },
    { id: 'cbom_primitive', label: 'Algorithm Primitive', kind: 'enum', options: ['blockcipher', 'streamcipher', 'hash', 'signature', 'kem', 'key-agreement', 'drbg'], hint: 'CycloneDX algorithmProperties.primitive.' },
    { id: 'cbom_algorithm', label: 'Algorithm Name', kind: 'text', hint: 'e.g. RSA, ECDSA, MD5, AES, ML-KEM. Matches the CBOM algorithm name.' },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'cbom_component', label: 'Found In Component', kind: 'enum', options: ['application', 'library', 'framework', 'container', 'firmware', 'file'], hint: 'CycloneDX component.type the crypto was found in.' },
    { id: 'cbom_confidence', label: 'Detection Confidence', kind: 'enum', options: ['high', 'medium', 'low'], hint: 'CBOM occurrence confidence. Low-confidence findings may be false positives.' },
    { id: 'quantum_vuln', label: 'Quantum Vulnerability', kind: 'enum', options: ['Quantum-Vulnerable', 'Quantum-Safe'], derived: true, hint: 'Derived from the algorithm in the CBOM finding.' },
  ],
};

export const POLICY_TYPES = Object.keys(FIELDS_BY_POLICY_TYPE);

export function fieldsFor(policyType: string): FieldDef[] {
  return FIELDS_BY_POLICY_TYPE[policyType] || [];
}

export function operatorsForField(field?: FieldDef): OperatorDef[] {
  if (!field) return [];
  return OPERATORS.filter(o => o.appliesTo.includes(field.kind));
}

// Plain-English render of a single condition row.
export function describeCondition(policyType: string, row: { field: string; operator: string; value: string }): string {
  const f = fieldsFor(policyType).find(x => x.id === row.field);
  const o = OPERATORS.find(x => x.id === row.operator);
  if (!f || !o) return '';
  if (!o.takesValue) return `${f.label} ${o.label}`;
  const unit = f.unit ? ` ${f.unit}` : '';
  return `${f.label} ${o.label} ${row.value}${unit}`;
}
