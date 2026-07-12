// Regulation-aligned Policy Packs. Each policy maps to a verifiable regulation
// requirement and is evaluable against a discovered crypto object. Clause numbers
// are grounded in current regulation text but should be confirmed by compliance
// review before customer release.

export type PackPolicyType =
  | "Certificate"
  | "SSH Key"
  | "SSH Certificate"
  | "Secrets & Tokens"
  | "Encryption Keys"
  | "Protocol & Cipher"
  | "Post-Quantum";

export type PackSeverity = "Critical" | "High" | "Medium" | "Low";

export interface PackPolicy {
  key: string; // stable within pack
  name: string;
  type: PackPolicyType;
  severity: PackSeverity;
  condition: string; // plain-English condition (what AVX evaluates)
  clause: string; // regulation clause mapping
  advisory?: boolean; // [advisory] defaults to OFF on import
  reusesBuiltin?: string; // id of an existing OOB policy this duplicates
}

export interface PolicyPack {
  id: string;
  name: string;
  initial: string; // logo placeholder
  region: string;
  industry: string;
  description: string;
  basis: string;
  outOfScope: string;
  policies: PackPolicy[];
}

export const POLICY_PACKS: PolicyPack[] = [
  {
    id: "pack-pci-dss-v4",
    name: "PCI DSS v4.0",
    initial: "PCI",
    region: "Global",
    industry: "Payments",
    description:
      "Payment Card Industry Data Security Standard — cryptographic controls for stored cardholder data and data in transit.",
    basis:
      "Req 3 (stored data), Req 4 (data in transit). TLS 1.2+ mandatory; SSL and TLS 1.0/1.1 prohibited; AEAD/strong ciphers only; ≥ 112-bit strength; certs not expired/revoked; no self-signed in production.",
    outOfScope: "Documented key-management procedures, cryptographic architecture documentation, annual cipher review.",
    policies: [
      {
        key: "P1",
        name: "Deprecated TLS Version Accepted",
        type: "Protocol & Cipher",
        severity: "Critical",
        condition: "Protocol Version Accepted is in [TLS 1.0, TLS 1.1]",
        clause: "PCI DSS v4.0 Req 4.2.1 (TLS 1.2 minimum; SSL/early TLS prohibited)",
        reusesBuiltin: "oob-008",
      },
      {
        key: "P2",
        name: "Weak or Prohibited Cipher Suite",
        type: "Protocol & Cipher",
        severity: "Critical",
        condition: "Cipher Suite is in [RC4, 3DES, NULL, Export-grade]",
        clause: "PCI DSS v4.0 Req 4.2.1 (strong cryptography / AEAD)",
        reusesBuiltin: "oob-009",
      },
      {
        key: "P3",
        name: "Weak Signature Algorithm",
        type: "Certificate",
        severity: "Critical",
        condition: "Signature Algorithm is in [SHA-1, MD5]",
        clause: "PCI DSS v4.0 Req 4.2.1 (strong cryptography)",
        reusesBuiltin: "oob-001",
      },
      {
        key: "P4",
        name: "Weak RSA Key Length",
        type: "Certificate",
        severity: "Critical",
        condition: "Key Type = RSA AND Key Length Bits < 2048",
        clause: "PCI DSS v4.0 Req 4.2.1 (≥ 112-bit effective strength)",
        reusesBuiltin: "oob-002",
      },
      {
        key: "P5",
        name: "Self-Signed Server Certificate",
        type: "Certificate",
        severity: "High",
        condition: "Is Self-Signed = true",
        clause: "PCI DSS v4.0 Req 4.2.1 (CA-issued certs; no self-signed in production)",
        reusesBuiltin: "oob-003",
      },
      {
        key: "P6",
        name: "Revoked Certificate Still Deployed",
        type: "Certificate",
        severity: "Critical",
        condition: "Revocation Status = Revoked",
        clause: "PCI DSS v4.0 Req 4.2.1 (certs must be valid, not expired/revoked)",
        reusesBuiltin: "oob-004",
      },
    ],
  },
  {
    id: "pack-hipaa-2025",
    name: "HIPAA Security Rule",
    initial: "HIP",
    region: "US",
    industry: "Healthcare",
    description:
      "HIPAA Security Rule (2025 update) — encryption of ePHI at rest and in transit. Stricter than PCI: requires TLS 1.3+ and AES-256.",
    basis:
      "2025 update mandates encryption of all ePHI. Expected: AES-256 at rest, TLS 1.3+ in transit, RSA-2048 minimum, HSM key management.",
    outOfScope: "FIPS 140-2/3 module certification status, access controls, audit logging.",
    policies: [
      {
        key: "H1",
        name: "Unencrypted Transmission (Weak TLS)",
        type: "Protocol & Cipher",
        severity: "Critical",
        condition: "Protocol Version Accepted is in [TLS 1.0, TLS 1.1, TLS 1.2]",
        clause: "HIPAA Security Rule 164.312(e) (2025: TLS 1.3+ for ePHI in transit)",
      },
      {
        key: "H2",
        name: "Weak Symmetric Key for ePHI at Rest",
        type: "Encryption Keys",
        severity: "High",
        condition: "Key Algorithm = AES AND Key Length Bits < 256",
        clause: "HIPAA Security Rule 164.312(a)(2)(iv) (2025: AES-256 at rest)",
      },
      {
        key: "H3",
        name: "Weak RSA Key Length",
        type: "Certificate",
        severity: "Critical",
        condition: "Key Type = RSA AND Key Length Bits < 2048",
        clause: "HIPAA Security Rule 164.312(e) (RSA-2048 minimum)",
        reusesBuiltin: "oob-002",
      },
      {
        key: "H4",
        name: "Software-Protected Key for ePHI",
        type: "Encryption Keys",
        severity: "High",
        advisory: true,
        condition: "Protection Level = Software-Protected",
        clause: "HIPAA Security Rule 164.312 (2025: HSM key management expected)",
      },
      {
        key: "H5",
        name: "Weak Signature Algorithm",
        type: "Certificate",
        severity: "Critical",
        condition: "Signature Algorithm is in [SHA-1, MD5]",
        clause: "HIPAA Security Rule 164.312(e) (strong cryptography)",
        reusesBuiltin: "oob-001",
      },
    ],
  },
  {
    id: "pack-gdpr-art32",
    name: "GDPR Article 32",
    initial: "GDP",
    region: "EU",
    industry: "All",
    description:
      'GDPR Art. 32 — "state of the art" technical measures for personal data protection. Aligned with ICO 2025 guidance.',
    basis:
      'Art 32 "state of the art" + ICO 2025: modern protocols, avoid deprecated algorithms, TLS in transit, keys ≥ 112-bit; quantum readiness increasingly read into "state of the art".',
    outOfScope: "Pseudonymisation, DPIA process, breach notification, data classification.",
    policies: [
      {
        key: "G1",
        name: "Deprecated TLS Version Accepted",
        type: "Protocol & Cipher",
        severity: "High",
        condition: "Protocol Version Accepted is in [TLS 1.0, TLS 1.1]",
        clause: "GDPR Art 32(1)(a) (state of the art; ICO advises against SSL/early TLS)",
        reusesBuiltin: "oob-008",
      },
      {
        key: "G2",
        name: "Weak Signature Algorithm",
        type: "Certificate",
        severity: "High",
        condition: "Signature Algorithm is in [SHA-1, MD5]",
        clause: "GDPR Art 32(1)(a) (avoid deprecated algorithms)",
        reusesBuiltin: "oob-001",
      },
      {
        key: "G3",
        name: "Weak RSA Key Length",
        type: "Certificate",
        severity: "High",
        condition: "Key Type = RSA AND Key Length Bits < 2048",
        clause: "GDPR Art 32(1)(a) (keys below 112-bit strength should not be used)",
        reusesBuiltin: "oob-002",
      },
      {
        key: "G4",
        name: "Quantum-Vulnerable Algorithm in Use",
        type: "Post-Quantum",
        severity: "Medium",
        advisory: true,
        condition: "PQC Posture = classical AND Quantum Axis in (kem, both)",
        clause: "GDPR Art 32 (state of the art; harvest-now-decrypt-later for long-life data)",
      },
    ],
  },
  {
    id: "pack-dora",
    name: "DORA",
    initial: "DOR",
    region: "EU",
    industry: "Financial",
    description:
      "Digital Operational Resilience Act — ICT risk management for the EU financial sector. Encryption + key lifecycle.",
    basis:
      "RTS Art 6 (encryption policy), Art 7 (key lifecycle + certificate register, prompt renewal), FIPS 140-2 L3 key protection, crypto-agility / PQC readiness.",
    outOfScope:
      "Certificate register completeness, documented key-lifecycle procedures, resilience testing, third-party ICT risk.",
    policies: [
      {
        key: "D1",
        name: "Deprecated TLS Version Accepted",
        type: "Protocol & Cipher",
        severity: "High",
        condition: "Protocol Version Accepted is in [TLS 1.0, TLS 1.1]",
        clause: "DORA RTS Art 6 (encryption of data in transit; approved controls)",
        reusesBuiltin: "oob-008",
      },
      {
        key: "D2",
        name: "Weak RSA Key Length",
        type: "Certificate",
        severity: "Critical",
        condition: "Key Type = RSA AND Key Length Bits < 2048",
        clause: "DORA RTS Art 6 (strong cryptographic controls)",
        reusesBuiltin: "oob-002",
      },
      {
        key: "D3",
        name: "Weak Signature Algorithm",
        type: "Certificate",
        severity: "Critical",
        condition: "Signature Algorithm is in [SHA-1, MD5]",
        clause: "DORA RTS Art 6 (approved algorithms)",
        reusesBuiltin: "oob-001",
      },
      {
        key: "D4",
        name: "Software-Protected Cryptographic Key",
        type: "Encryption Keys",
        severity: "High",
        advisory: true,
        condition: "Protection Level = Software-Protected",
        clause: "DORA Art 9.4(d) (key protection in FIPS 140-2 Level 3 environment)",
      },
      {
        key: "D5",
        name: "Quantum-Vulnerable Algorithm in Use",
        type: "Post-Quantum",
        severity: "Medium",
        advisory: true,
        condition: "PQC Posture = classical AND Quantum Axis in (kem, both)",
        clause: "DORA (crypto-agility / PQC readiness for ICT resilience)",
      },
    ],
  },
];

// Map pack policy type → CustomPolicy.assetType expected by the unified list.
// Keeps the table's Type column rendering aligned with custom/built-in rows.
export function packTypeToAssetType(t: PackPolicyType): string {
  switch (t) {
    case "Certificate":
      return "Certificate";
    case "SSH Key":
      return "SSH Key";
    case "SSH Certificate":
      return "SSH Certificate";
    case "Secrets & Tokens":
      return "Secrets & Tokens";
    case "Encryption Keys":
      return "Encryption Keys";
    case "Protocol & Cipher":
      return "Protocol & Cipher";
    case "Post-Quantum":
      return "Post-Quantum";
  }
}
