// Field / operator catalog for the Custom Policy condition builder.
// Scope: supported cryptographic objects only (certificates, SSH keys,
// secrets / vault entries, cryptographic keys in KMS/HSM).

import type { ValueSet, ValueSetType } from '@/data/policyEngineData';

export type FieldKind = 'number' | 'enum' | 'boolean' | 'text';

export interface FieldDef {
  id: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  options?: string[];
  computed?: boolean;
  hint?: string;
  valueSetType?: ValueSetType;
}

export interface OperatorDef {
  id: string;
  label: string;
  appliesTo: FieldKind[];
  takesValue: boolean;
  kind?: 'normal' | 'set';
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

const SET_OPERATORS: OperatorDef[] = [
  { id: 'is_in_set', label: 'is in set', appliesTo: [], takesValue: true, kind: 'set' },
  { id: 'is_not_in_set', label: 'is not in set', appliesTo: [], takesValue: true, kind: 'set' },
];

export const FIELDS_BY_POLICY_TYPE: Record<string, FieldDef[]> = {
  'Managed Certificate Policy': [
    { id: 'expiry_days', label: 'Expiry Days Remaining', kind: 'number', unit: 'days', computed: true },
    { id: 'sig_algo', label: 'Signature Algorithm', kind: 'enum', options: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5'], valueSetType: 'algorithm' },
    { id: 'key_type', label: 'Key Type', kind: 'enum', options: ['RSA', 'ECDSA', 'Ed25519', 'DSA'] },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'issuing_ca', label: 'Issuing CA', kind: 'text', hint: 'e.g. DigiCert, Sectigo, internal CA', valueSetType: 'ca-list' },
    { id: 'is_self_signed', label: 'Is Self-Signed', kind: 'boolean' },
    { id: 'is_wildcard', label: 'Is Wildcard', kind: 'boolean' },
    { id: 'validity_days', label: 'Validity Period (days)', kind: 'number', unit: 'days' },
    { id: 'chain_complete', label: 'Chain Complete', kind: 'boolean' },
    { id: 'tls_version', label: 'TLS Version Accepted', kind: 'enum', options: ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'], valueSetType: 'tls-version' },
    { id: 'cipher_suite', label: 'Cipher Suite', kind: 'enum', options: ['RC4', '3DES', 'NULL', 'Export-grade', 'AES-GCM', 'ChaCha20'], valueSetType: 'cipher' },
    { id: 'revocation_status', label: 'Revocation Status', kind: 'enum', options: ['Valid', 'Revoked', 'Unknown'] },
    { id: 'deployment_scope', label: 'Deployment Scope', kind: 'enum', options: ['Production', 'Staging', 'Development'] },
  ],
  'SSH Key Policy': [
    { id: 'key_type', label: 'Key Type', kind: 'enum', options: ['RSA', 'ECDSA', 'Ed25519', 'DSA'] },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'mac_algo', label: 'MAC Algorithm', kind: 'enum', options: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1', 'hmac-md5'], valueSetType: 'algorithm' },
    { id: 'key_age', label: 'Key Age (days)', kind: 'number', unit: 'days', computed: true, hint: 'Requires managed SSH source' },
    { id: 'days_since_rotation', label: 'Days Since Last Rotation', kind: 'number', unit: 'days', computed: true, hint: 'Requires managed SSH source' },
  ],
  'Secrets & API Keys Policy': [
    { id: 'has_expiry', label: 'Has Expiry Date', kind: 'boolean' },
    { id: 'days_since_rotation', label: 'Days Since Last Rotation', kind: 'number', unit: 'days', computed: true },
    { id: 'secret_type', label: 'Secret Type', kind: 'enum', options: ['Certificate', 'Encryption Key', 'API Key', 'SSH Key', 'Database Credential'] },
    { id: 'vault_source', label: 'Vault Source', kind: 'enum', options: ['HashiCorp Vault', 'CyberArk Conjur', 'AWS Secrets Manager', 'Azure Key Vault', 'Thales CipherTrust'], valueSetType: 'key-source' },
  ],
  'Cryptographic Key Policy': [
    { id: 'rotation_enabled', label: 'Rotation Enabled', kind: 'boolean' },
    { id: 'days_since_rotation', label: 'Days Since Last Rotation', kind: 'number', unit: 'days', computed: true },
    { id: 'key_algorithm', label: 'Key Algorithm', kind: 'enum', options: ['RSA', 'ECC', 'AES', 'DH', 'ML-KEM', 'ML-DSA'], valueSetType: 'algorithm' },
    { id: 'key_bits', label: 'Key Length (bits)', kind: 'number', unit: 'bits' },
    { id: 'key_source', label: 'Key Source', kind: 'enum', options: ['AWS KMS', 'Azure Key Vault', 'GCP KMS', 'Fortanix', 'Crypto4A'], valueSetType: 'key-source' },
  ],
};

export const POLICY_TYPES = Object.keys(FIELDS_BY_POLICY_TYPE);

export function fieldsFor(policyType: string): FieldDef[] {
  return FIELDS_BY_POLICY_TYPE[policyType] || [];
}

export function operatorsForField(field?: FieldDef): OperatorDef[] {
  if (!field) return [];
  const base = OPERATORS.filter(o => o.appliesTo.includes(field.kind));
  return field.valueSetType ? [...base, ...SET_OPERATORS] : base;
}

export function isSetOperator(opId: string): boolean {
  return opId === 'is_in_set' || opId === 'is_not_in_set';
}

export function describeCondition(
  policyType: string,
  row: { field: string; operator: string; value: string },
  valueSets?: ValueSet[],
): string {
  const f = fieldsFor(policyType).find(x => x.id === row.field);
  const o = OPERATORS.concat(SET_OPERATORS).find(x => x.id === row.operator);
  if (!f || !o) return '';
  if (!o.takesValue) return `${f.label} ${o.label}`;
  if (isSetOperator(o.id)) {
    const vs = valueSets?.find(v => v.id === row.value);
    return `${f.label} ${o.label} ${vs?.name || row.value || '—'}`;
  }
  const unit = f.unit ? ` ${f.unit}` : '';
  return `${f.label} ${o.label} ${row.value}${unit}`;
}
