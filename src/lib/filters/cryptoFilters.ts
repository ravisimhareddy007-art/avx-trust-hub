import type { CryptoAsset } from "@/data/mockData";
import { ESTATE_SUMMARY, mockAssets } from "@/data/mockData";
import { assessAgility } from "@/lib/risk/qes";

export interface DashboardFilter {
  id: string;
  label: string;
  description?: string;
  countNoun: string;
  predicate: (a: CryptoAsset) => boolean;
  enterpriseCount: number;
  pts: number;
  filters: Record<string, string>;
}

export const VIOLATION_FILTERS: Record<string, DashboardFilter> = {
  // ── Certificates ──────────────────────────────────────────────────────────

  cert_expired: {
    id: "cert_expired",
    label: "Expired certificates",
    countNoun: "certs",
    predicate: (a) => a.type === "TLS Certificate" && a.status === "Expired",
    enterpriseCount: ESTATE_SUMMARY.certsExpired,
    pts: 12,
    filters: { type: "TLS Certificate", status: "Expired", tab: "identities" },
  },

  cert_expiring_7d: {
    id: "cert_expiring_7d",
    label: "Expiring in 7 days — no auto-renewal",
    countNoun: "certs",
    predicate: (a) => a.type === "TLS Certificate" && a.status === "Expiring" && a.autoRenewal === false,
    enterpriseCount: ESTATE_SUMMARY.certsExpiring7d,
    pts: 14,
    filters: { type: "TLS Certificate", status: "Expiring", autoRenewal: "false", tab: "identities" },
  },

  cert_expiring_30d: {
    id: "cert_expiring_30d",
    label: "Expiring in 30 days",
    countNoun: "certs",
    predicate: (a) => a.type === "TLS Certificate" && a.status === "Expiring",
    enterpriseCount: ESTATE_SUMMARY.certsExpiring30d,
    pts: 8,
    filters: { type: "TLS Certificate", status: "Expiring", tab: "identities" },
  },

  cert_weak_algo: {
    id: "cert_weak_algo",
    label: "Weak algorithm (SHA-1 / RSA-1024)",
    countNoun: "certs",
    predicate: (a) => a.type === "TLS Certificate" && /RSA-1024|SHA-1/.test(a.algorithm),
    enterpriseCount: ESTATE_SUMMARY.certsWeakAlgo,
    pts: 6,
    filters: { type: "TLS Certificate", algorithm: "weak", tab: "identities" },
  },

  cert_self_signed: {
    id: "cert_self_signed",
    label: "Self-signed in production",
    countNoun: "certs",
    predicate: (a) => a.type === "TLS Certificate" && a.environment === "Production" && a.caIssuer === "Self-Signed",
    enterpriseCount: ESTATE_SUMMARY.certsSelfSigned,
    pts: 4,
    filters: { type: "TLS Certificate", caIssuer: "Self-Signed", tab: "identities" },
  },

  // ── SSH Keys ──────────────────────────────────────────────────────────────

  ssh_suspicious: {
    id: "ssh_suspicious",
    label: "Suspicious keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && !!a.tags?.includes("suspicious"),
    enterpriseCount: ESTATE_SUMMARY.sshSuspicious,
    pts: 10,
    filters: { type: "SSH Key", suspicious: "true", tab: "identities" },
  },

  ssh_shared_user: {
    id: "ssh_shared_user",
    label: "Shared user keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && !!a.tags?.includes("shared-user"),
    enterpriseCount: ESTATE_SUMMARY.sshSharedUser,
    pts: 8,
    filters: { type: "SSH Key", sharedUser: "true", tab: "identities" },
  },

  ssh_rogue: {
    id: "ssh_rogue",
    label: "Rogue keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && !!a.tags?.includes("rogue"),
    enterpriseCount: ESTATE_SUMMARY.sshRogue,
    pts: 8,
    filters: { type: "SSH Key", rogue: "true", tab: "identities" },
  },

  ssh_weak_user: {
    id: "ssh_weak_user",
    label: "Weak user keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && /RSA-1024|DSA/.test(a.algorithm),
    enterpriseCount: ESTATE_SUMMARY.sshWeakUser,
    pts: 6,
    filters: { type: "SSH Key", weakUser: "true", tab: "identities" },
  },

  ssh_weak_host: {
    id: "ssh_weak_host",
    label: "Weak host keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && !!a.tags?.includes("host-key") && /RSA-1024|DSA/.test(a.algorithm),
    enterpriseCount: ESTATE_SUMMARY.sshWeakHost,
    pts: 6,
    filters: { type: "SSH Key", weakHost: "true", tab: "identities" },
  },

  ssh_misplaced: {
    id: "ssh_misplaced",
    label: "Misplaced keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && !!a.tags?.includes("misplaced"),
    enterpriseCount: ESTATE_SUMMARY.sshMisplaced,
    pts: 4,
    filters: { type: "SSH Key", misplaced: "true", tab: "identities" },
  },

  ssh_shared_host: {
    id: "ssh_shared_host",
    label: "Shared host keys",
    countNoun: "SSH keys",
    predicate: (a) => a.type === "SSH Key" && !!a.tags?.includes("shared-host"),
    enterpriseCount: ESTATE_SUMMARY.sshSharedHost,
    pts: 4,
    filters: { type: "SSH Key", sharedHost: "true", tab: "identities" },
  },

  // ── Secrets ───────────────────────────────────────────────────────────────

  secret_exposed_code: {
    id: "secret_exposed_code",
    label: "Exposed in code repositories",
    countNoun: "secrets",
    predicate: (a) =>
      a.type === "API Key / Secret" && (a.tags?.includes("code-exposed") || a.tags?.includes("source-code")),
    enterpriseCount: ESTATE_SUMMARY.secretsExposedCode,
    pts: 14,
    filters: { type: "API Key / Secret", exposure: "code", tab: "identities" },
  },

  secret_hardcoded_24h: {
    id: "secret_hardcoded_24h",
    label: "Hardcoded — detected in last 24h",
    countNoun: "secrets",
    predicate: (a) => a.type === "API Key / Secret" && !!a.tags?.includes("hardcoded"),
    enterpriseCount: ESTATE_SUMMARY.secretsHardcoded,
    pts: 14,
    filters: { type: "API Key / Secret", exposure: "code", tab: "identities" },
  },

  secret_unrotated_90d: {
    id: "secret_unrotated_90d",
    label: "Not rotated in 90+ days",
    countNoun: "secrets",
    predicate: (a) => a.type === "API Key / Secret" && (a as any).rotation === "overdue",
    enterpriseCount: ESTATE_SUMMARY.secretsUnrotated90d,
    pts: 8,
    filters: { type: "API Key / Secret", rotation: "overdue", tab: "identities" },
  },

  secret_orphaned: {
    id: "secret_orphaned",
    label: "Orphaned — owner left org",
    countNoun: "secrets",
    predicate: (a) => a.type === "API Key / Secret" && a.owner === "Unassigned",
    enterpriseCount: ESTATE_SUMMARY.secretsOrphaned,
    pts: 6,
    filters: { type: "API Key / Secret", owner: "Unassigned", tab: "identities" },
  },
  cloud_rotation_disabled: {
    id: "cloud_rotation_disabled",
    label: "Cloud KMS keys: rotation disabled or overdue",
    countNoun: "keys",
    predicate: (a) =>
      a.type === "Cloud KMS Key" &&
      !!a.cloudKey &&
      (a.cloudKey.rotationEnabled === false || (a.cloudKey.daysSinceRotation ?? 0) > 365),
    enterpriseCount: 642,
    pts: 8,
    filters: { type: "Cloud KMS Key", filterId: "cloud_rotation_disabled", tab: "identities" },
  },
  cloud_overpermissive: {
    id: "cloud_overpermissive",
    label: "Cloud KMS keys: overly permissive access",
    countNoun: "keys",
    predicate: (a) =>
      a.type === "Cloud KMS Key" &&
      !!a.cloudKey &&
      (a.cloudKey.publicAccess === true || a.cloudKey.wildcardDecrypt === true),
    enterpriseCount: 214,
    pts: 8,
    filters: { type: "Cloud KMS Key", filterId: "cloud_overpermissive", tab: "identities" },
  },
  cloud_lifecycle: {
    id: "cloud_lifecycle",
    label: "Cloud KMS keys: unused or pending deletion",
    countNoun: "keys",
    predicate: (a) =>
      a.type === "Cloud KMS Key" &&
      (a.status === "Orphaned" ||
        (!!a.cloudKey && (a.cloudKey.keyState === "PendingDeletion" || a.cloudKey.keyState === "Disabled"))),
    enterpriseCount: 168,
    pts: 5,
    filters: { type: "Cloud KMS Key", filterId: "cloud_lifecycle", tab: "identities" },
  },
  cloud_prot_software: {
    id: "cloud_prot_software",
    label: "Cloud KMS keys: software-protected",
    countNoun: "keys",
    predicate: (a) => a.type === "Cloud KMS Key" && a.cloudKey?.protectionLevel === "Software",
    enterpriseCount: 724,
    pts: 3,
    filters: { type: "Cloud KMS Key", filterId: "cloud_prot_software", tab: "identities" },
  },
  cloud_prot_hsm: {
    id: "cloud_prot_hsm",
    label: "Cloud KMS keys: HSM-protected",
    countNoun: "keys",
    predicate: (a) => a.type === "Cloud KMS Key" && a.cloudKey?.protectionLevel === "HSM",
    enterpriseCount: 1680,
    pts: 3,
    filters: { type: "Cloud KMS Key", filterId: "cloud_prot_hsm", tab: "identities" },
  },
  cloud_prot_cloudhsm: {
    id: "cloud_prot_cloudhsm",
    label: "Cloud KMS keys: CloudHSM-protected",
    countNoun: "keys",
    predicate: (a) => a.type === "Cloud KMS Key" && a.cloudKey?.protectionLevel === "CloudHSM",
    enterpriseCount: 328,
    pts: 3,
    filters: { type: "Cloud KMS Key", filterId: "cloud_prot_cloudhsm", tab: "identities" },
  },
  cloud_prot_externalhsm: {
    id: "cloud_prot_externalhsm",
    label: "Cloud KMS keys: External HSM-protected",
    countNoun: "keys",
    predicate: (a) => a.type === "Cloud KMS Key" && a.cloudKey?.protectionLevel === "External HSM",
    enterpriseCount: 115,
    pts: 3,
    filters: { type: "Cloud KMS Key", filterId: "cloud_prot_externalhsm", tab: "identities" },
  },
  cloud_quantum: {
    id: "cloud_quantum",
    label: "Cloud KMS keys: quantum-vulnerable algorithm",
    countNoun: "keys",
    predicate: (a) =>
      a.type === "Cloud KMS Key" &&
      (a.pqcRisk === "High" || a.pqcRisk === "Critical" || /^(RSA|ECC|ECDSA|ECDH|DSA|DH)\b/.test(a.algorithm)),
    enterpriseCount: 388,
    pts: 5,
    filters: { type: "Cloud KMS Key", filterId: "cloud_quantum", tab: "identities" },
  },
  hsm_extractable: {
    id: "hsm_extractable",
    label: "HSM keys: extractable key material",
    countNoun: "keys",
    predicate: (a) => a.type === "HSM Key" && !!a.hsmKey && a.hsmKey.extractable === true,
    enterpriseCount: 27,
    pts: 8,
    filters: { type: "HSM Key", filterId: "hsm_extractable", tab: "identities" },
  },
  hsm_nonsensitive: {
    id: "hsm_nonsensitive",
    label: "HSM keys: non-sensitive (material readable)",
    countNoun: "keys",
    predicate: (a) => a.type === "HSM Key" && !!a.hsmKey && a.hsmKey.sensitive === false,
    enterpriseCount: 14,
    pts: 8,
    filters: { type: "HSM Key", filterId: "hsm_nonsensitive", tab: "identities" },
  },
  hsm_quantum: {
    id: "hsm_quantum",
    label: "HSM keys: quantum-vulnerable algorithm",
    countNoun: "keys",
    predicate: (a) => a.type === "HSM Key" && /^(RSA|ECC|ECDSA|ECDH|DSA|DH)\b/.test(a.algorithm),
    enterpriseCount: 96,
    pts: 5,
    filters: { type: "HSM Key", filterId: "hsm_quantum", tab: "identities" },
  },
  hsm_weak_algo: {
    id: "hsm_weak_algo",
    label: "HSM keys: weak or deprecated algorithm",
    countNoun: "keys",
    predicate: (a) =>
      a.type === "HSM Key" &&
      ((/^RSA/.test(a.algorithm) && parseInt(String(a.keyLength), 10) < 3072) ||
        /^(DSA|DH|MD5|SHA-1)/.test(a.algorithm)),
    enterpriseCount: 62,
    pts: 5,
    filters: { type: "HSM Key", filterId: "hsm_weak_algo", tab: "identities" },
  },
  hsm_classical: {
    id: "hsm_classical",
    label: "HSM keys: classical algorithm (RSA / ECC)",
    countNoun: "keys",
    predicate: (a) => a.type === "HSM Key" && /^(RSA|ECC|ECDSA|ECDH|DSA|DH)\b/.test(a.algorithm),
    enterpriseCount: 1026,
    pts: 3,
    filters: { type: "HSM Key", filterId: "hsm_classical", tab: "identities" },
  },
  hsm_pqc: {
    id: "hsm_pqc",
    label: "HSM keys: post-quantum algorithm",
    countNoun: "keys",
    predicate: (a) => a.type === "HSM Key" && /^(ML-KEM|ML-DSA|SLH-DSA|LMS|XMSS)/.test(a.algorithm),
    enterpriseCount: 214,
    pts: 3,
    filters: { type: "HSM Key", filterId: "hsm_pqc", tab: "identities" },
  },

  // ── Quantum agility ───────────────────────────────────────────────────────

  "agility-blocked": {
    id: "agility-blocked",
    label: "Cannot migrate today (agility-blocked)",
    description: "Quantum-vulnerable objects that cannot be made safe by changing the certificate, because a blocking library or CA has no PQC path.",
    countNoun: "objects",
    predicate: (a) => !assessAgility(a).agile,
    enterpriseCount: mockAssets.filter((a) => !assessAgility(a).agile).length,
    pts: 5,
    filters: { filterId: "agility-blocked", tab: "identities" },
  },
};

// ERS drivers — subset of VIOLATION_FILTERS used on the ERS driver bar
export const DASHBOARD_FILTERS: Record<string, DashboardFilter> = {
  "cert-expiring": VIOLATION_FILTERS.cert_expiring_7d,
  "ssh-suspicious": {
    ...VIOLATION_FILTERS.ssh_suspicious,
    id: "ssh-suspicious",
    label: "Suspicious & rogue SSH keys",
    enterpriseCount: ESTATE_SUMMARY.sshSuspicious + ESTATE_SUMMARY.sshRogue,
    pts: 10,
  },

  "weak-algos": {
    id: "weak-algos",
    label: "Weak algorithms (certs + SSH)",
    countNoun: "assets",
    predicate: (a) => /RSA-1024|SHA-1|DSA/.test(a.algorithm),
    enterpriseCount: 1248,
    pts: 6,
    filters: { algorithm: "weak", tab: "identities" },
  },
};

export const COUNT_NOUNS: Record<string, string> = Object.fromEntries(
  Object.values(VIOLATION_FILTERS).map((f) => [f.id, f.countNoun]),
);
