// Crypto-stack objects discovered by Tenable / Qualys network scans and CBOM ingestion.
// Modeled on CycloneDX CBOM (ECMA-424): protocol is a first-class crypto-asset with
// nested cipher suites; library is a component with a one-to-many "implements / used-by"
// relationship. Protocols bind to an IT asset by FQDN (port is an attribute, not the key);
// libraries bind to many assets by FQDN.

export type StackSeverity = "Critical" | "High" | "Medium" | "Low";

export interface CipherSuite {
  id: string; // IANA identifier, e.g. 0xC030
  name: string; // TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
  kex: string; // ECDHE
  auth: string; // RSA
  enc: string; // AES-256-GCM
  mac: string; // SHA384 / AEAD
  strength: "Strong" | "Weak" | "Insecure";
}

export interface ProtocolAsset {
  id: string;
  fqdn: string; // binds to ITAsset.name
  port: number; // attribute, shown as fqdn:port
  family: "SSL" | "TLS" | "SSH" | "IPsec"; // protocol family (SSL and TLS are distinct)
  service: string; // listening service, e.g. HTTPS, SMTPS, PostgreSQL, SSH
  application: string; // owning application on the host
  version: string; // clean version only: '1.0', '3.0', '2' (family carries SSL/TLS/SSH)
  cipherSuites: CipherSuite[];
  kexStrength: string; // 'ECDHE P-256', 'DH 1024 (weak)'
  exposure: "Internet-facing" | "Internal";
  environment: "Production" | "Staging" | "Development";
  owner: string;
  team: string;
  discoverySource: "Tenable" | "Qualys";
  lastSeen: string;
  crs: number;
  severity: StackSeverity;
  policyViolations: string[]; // OOB ids, e.g. ['OOB-PROT-01']
  pqcPosture: string; // 'Classical only' | 'Hybrid-capable'
  bound: boolean; // false = FQDN not in IT asset inventory (shadow host)
}

export interface LibraryAsset {
  id: string;
  name: string; // OpenSSL
  version: string; // 1.0.2u
  provider: string; // OpenSSL Project
  eolStatus: "End-of-Life" | "Outdated" | "Supported";
  eolDate: string; // '2019-12-31' or 'Active'
  latestSafe: string; // recommended version
  cveCount: number;
  maxCvss: number;
  cves: { id: string; cvss: number; title: string }[];
  assetsAffected: string[]; // FQDNs (one-to-many spread)
  implementsList: string[]; // algorithms / protocols provided
  inUse: boolean; // reachability: reached in production vs dormant
  owner: string;
  team: string;
  discoverySource: "CBOM Ingestion" | "Tenable" | "Qualys";
  crs: number;
  severity: StackSeverity;
  policyViolations: string[];
}

const WEAK_SUITE = (id: string, name: string, kex: string, auth: string, enc: string, mac: string): CipherSuite => ({
  id,
  name,
  kex,
  auth,
  enc,
  mac,
  strength: /RC4|3DES|NULL|EXPORT|DES/i.test(enc) ? "Insecure" : "Weak",
});
const STRONG_SUITE = (id: string, name: string, kex: string, auth: string, enc: string, mac: string): CipherSuite => ({
  id,
  name,
  kex,
  auth,
  enc,
  mac,
  strength: "Strong",
});

export const mockProtocols: ProtocolAsset[] = [
  {
    id: "proto-001",
    fqdn: "legacy-erp.internal",
    port: 443,
    family: "TLS",
    service: "HTTPS",
    application: "Legacy ERP",
    version: "1.0",
    cipherSuites: [
      WEAK_SUITE("0x000A", "TLS_RSA_WITH_3DES_EDE_CBC_SHA", "RSA", "RSA", "3DES-CBC", "SHA"),
      WEAK_SUITE("0x0005", "TLS_RSA_WITH_RC4_128_SHA", "RSA", "RSA", "RC4-128", "SHA"),
    ],
    kexStrength: "RSA",
    exposure: "Internal",
    environment: "Production",
    owner: "Priya Nair",
    team: "IT Operations",
    discoverySource: "Tenable",
    lastSeen: "2026-07-03 08:10",
    crs: 88,
    severity: "Critical",
    policyViolations: ["OOB-PROT-01", "OOB-PROT-02"],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-002",
    fqdn: "partner-api-gw.acmecorp.com",
    port: 8443,
    family: "TLS",
    service: "HTTPS",
    application: "Partner API Gateway",
    version: "1.1",
    cipherSuites: [WEAK_SUITE("0xC013", "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA", "ECDHE", "RSA", "AES-128-CBC", "SHA")],
    kexStrength: "ECDHE P-256",
    exposure: "Internet-facing",
    environment: "Production",
    owner: "Sarah Chen",
    team: "Payments Engineering",
    discoverySource: "Qualys",
    lastSeen: "2026-07-03 07:55",
    crs: 78,
    severity: "High",
    policyViolations: ["OOB-PROT-01"],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-003",
    fqdn: "mail.acmecorp.com",
    port: 465,
    family: "SSL",
    service: "SMTPS",
    application: "Mail Submission",
    version: "3.0",
    cipherSuites: [
      WEAK_SUITE("0x0005", "TLS_RSA_WITH_RC4_128_SHA", "RSA", "RSA", "RC4-128", "SHA"),
      WEAK_SUITE("0x0004", "TLS_RSA_WITH_RC4_128_MD5", "RSA", "RSA", "RC4-128", "MD5"),
    ],
    kexStrength: "RSA",
    exposure: "Internet-facing",
    environment: "Production",
    owner: "Unassigned",
    team: "IT Operations",
    discoverySource: "Tenable",
    lastSeen: "2026-07-03 06:40",
    crs: 94,
    severity: "Critical",
    policyViolations: ["OOB-PROT-03", "OOB-PROT-02"],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-004",
    fqdn: "legacy-api-gw-01.internal",
    port: 443,
    family: "TLS",
    service: "HTTPS",
    application: "Legacy API Gateway",
    version: "1.0",
    cipherSuites: [WEAK_SUITE("0x002F", "TLS_RSA_WITH_AES_128_CBC_SHA", "RSA", "RSA", "AES-128-CBC", "SHA")],
    kexStrength: "RSA",
    exposure: "Internal",
    environment: "Production",
    owner: "Marcus Reid",
    team: "Infrastructure",
    discoverySource: "Qualys",
    lastSeen: "2026-07-03 05:20",
    crs: 79,
    severity: "High",
    policyViolations: ["OOB-PROT-01"],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-005",
    fqdn: "prod-db-primary.internal",
    port: 5432,
    family: "TLS",
    service: "PostgreSQL",
    application: "Primary Database",
    version: "1.0",
    cipherSuites: [WEAK_SUITE("0x000A", "TLS_RSA_WITH_3DES_EDE_CBC_SHA", "RSA", "RSA", "3DES-CBC", "SHA")],
    kexStrength: "RSA",
    exposure: "Internal",
    environment: "Production",
    owner: "David Kim",
    team: "Database Operations",
    discoverySource: "Tenable",
    lastSeen: "2026-07-03 08:00",
    crs: 84,
    severity: "Critical",
    policyViolations: ["OOB-PROT-01", "OOB-PROT-02"],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-006",
    fqdn: "bastion-01.acmecorp.com",
    port: 22,
    family: "SSH",
    service: "SSH",
    application: "Bastion Host",
    version: "2",
    cipherSuites: [WEAK_SUITE("cbc", "aes128-cbc", "ecdh", "host-key", "AES-128-CBC", "hmac-sha1")],
    kexStrength: "ecdh-sha2-nistp256",
    exposure: "Internet-facing",
    environment: "Production",
    owner: "James Wilson",
    team: "Identity & Access",
    discoverySource: "Tenable",
    lastSeen: "2026-07-03 07:10",
    crs: 61,
    severity: "High",
    policyViolations: ["OOB-PROT-02"],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-007",
    fqdn: "staging-api.acmecorp.com",
    port: 443,
    family: "TLS",
    service: "HTTPS",
    application: "Staging API",
    version: "1.1",
    cipherSuites: [WEAK_SUITE("0xC013", "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA", "ECDHE", "RSA", "AES-128-CBC", "SHA")],
    kexStrength: "ECDHE P-256",
    exposure: "Internal",
    environment: "Staging",
    owner: "Lisa Park",
    team: "Platform Engineering",
    discoverySource: "Qualys",
    lastSeen: "2026-07-02 22:15",
    crs: 55,
    severity: "Medium",
    policyViolations: ["OOB-PROT-01"],
    pqcPosture: "Classical only",
    bound: true,
  },

  // Unbound: FQDN discovered on the network but not present in IT asset inventory (shadow host).
  {
    id: "proto-008",
    fqdn: "vpn-gw-old.dmz.acmecorp.com",
    port: 443,
    family: "SSL",
    service: "HTTPS",
    application: "Legacy VPN Gateway",
    version: "3.0",
    cipherSuites: [WEAK_SUITE("0x0005", "TLS_RSA_WITH_RC4_128_SHA", "RSA", "RSA", "RC4-128", "SHA")],
    kexStrength: "RSA",
    exposure: "Internet-facing",
    environment: "Production",
    owner: "Unassigned",
    team: "Unassigned",
    discoverySource: "Qualys",
    lastSeen: "2026-07-03 04:05",
    crs: 91,
    severity: "Critical",
    policyViolations: ["OOB-PROT-03", "OOB-PROT-02"],
    pqcPosture: "Classical only",
    bound: false,
  },

  // Healthy examples (compliant, low CRS) so the list is not all-red.
  {
    id: "proto-009",
    fqdn: "payments-api.acmecorp.com",
    port: 443,
    family: "TLS",
    service: "HTTPS",
    application: "Payments API",
    version: "1.3",
    cipherSuites: [STRONG_SUITE("0x1302", "TLS_AES_256_GCM_SHA384", "ECDHE X25519", "(cert)", "AES-256-GCM", "AEAD")],
    kexStrength: "ECDHE X25519",
    exposure: "Internet-facing",
    environment: "Production",
    owner: "Sarah Chen",
    team: "Payments Engineering",
    discoverySource: "Qualys",
    lastSeen: "2026-07-03 08:20",
    crs: 12,
    severity: "Low",
    policyViolations: [],
    pqcPosture: "Classical only",
    bound: true,
  },

  {
    id: "proto-010",
    fqdn: "auth.acmecorp.com",
    port: 443,
    family: "TLS",
    service: "HTTPS",
    application: "Auth Service",
    version: "1.2",
    cipherSuites: [
      STRONG_SUITE("0xC030", "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", "ECDHE", "RSA", "AES-256-GCM", "SHA384"),
    ],
    kexStrength: "ECDHE P-384",
    exposure: "Internet-facing",
    environment: "Production",
    owner: "James Wilson",
    team: "Identity & Access",
    discoverySource: "Tenable",
    lastSeen: "2026-07-03 08:18",
    crs: 18,
    severity: "Low",
    policyViolations: [],
    pqcPosture: "Classical only",
    bound: true,
  },
];

export const mockLibraries: LibraryAsset[] = [
  {
    id: "lib-001",
    name: "OpenSSL",
    version: "1.0.2u",
    provider: "OpenSSL Project",
    eolStatus: "End-of-Life",
    eolDate: "2019-12-31",
    latestSafe: "3.4.x",
    cveCount: 6,
    maxCvss: 9.8,
    cves: [
      { id: "CVE-2021-3711", cvss: 9.8, title: "SM2 decryption buffer overflow" },
      { id: "CVE-2014-0160", cvss: 7.5, title: "Heartbleed information disclosure" },
      { id: "CVE-2016-6304", cvss: 7.5, title: "OCSP status request memory exhaustion" },
      { id: "CVE-2022-0778", cvss: 7.5, title: "BN_mod_sqrt infinite loop (DoS)" },
      { id: "CVE-2019-1543", cvss: 7.4, title: "ChaCha20-Poly1305 nonce reuse" },
      { id: "CVE-2016-2107", cvss: 5.9, title: "Padding oracle in AES-NI CBC" },
    ],
    assetsAffected: [
      "legacy-erp.internal",
      "legacy-api-gw-01.internal",
      "prod-db-primary.internal",
      "mail.acmecorp.com",
    ],
    implementsList: ["TLS 1.0", "TLS 1.1", "RSA", "SHA-1", "3DES"],
    inUse: true,
    owner: "Marcus Reid",
    team: "Infrastructure",
    discoverySource: "CBOM Ingestion",
    crs: 90,
    severity: "Critical",
    policyViolations: ["OOB-LIB-01", "OOB-LIB-02"],
  },

  {
    id: "lib-002",
    name: "OpenSSL",
    version: "1.1.1w",
    provider: "OpenSSL Project",
    eolStatus: "End-of-Life",
    eolDate: "2023-09-11",
    latestSafe: "3.4.x",
    cveCount: 2,
    maxCvss: 7.5,
    cves: [
      { id: "CVE-2022-3602", cvss: 7.5, title: "X.509 punycode buffer overflow" },
      { id: "CVE-2023-5678", cvss: 5.3, title: "DH key generation excessive time" },
    ],
    assetsAffected: ["partner-api-gw.acmecorp.com", "staging-api.acmecorp.com", "auth.acmecorp.com"],
    implementsList: ["TLS 1.2", "TLS 1.3", "RSA", "ECDSA", "SHA-256"],
    inUse: true,
    owner: "Lisa Park",
    team: "Platform Engineering",
    discoverySource: "CBOM Ingestion",
    crs: 68,
    severity: "High",
    policyViolations: ["OOB-LIB-01"],
  },

  {
    id: "lib-003",
    name: "Bouncy Castle",
    version: "1.68",
    provider: "Legion of the Bouncy Castle",
    eolStatus: "Outdated",
    eolDate: "Active",
    latestSafe: "1.78",
    cveCount: 1,
    maxCvss: 5.3,
    cves: [{ id: "CVE-2023-33201", cvss: 5.3, title: "LDAP CertStore blind LDAP injection" }],
    assetsAffected: ["jenkins-ci.internal", "gitlab-runner-01.internal"],
    implementsList: ["RSA", "ECDSA", "AES-GCM", "SHA-256"],
    inUse: false,
    owner: "CI/CD Team",
    team: "DevOps",
    discoverySource: "CBOM Ingestion",
    crs: 44,
    severity: "Medium",
    policyViolations: ["OOB-LIB-02"],
  },

  {
    id: "lib-004",
    name: "wolfSSL",
    version: "4.7.0",
    provider: "wolfSSL Inc.",
    eolStatus: "End-of-Life",
    eolDate: "2021-06-30",
    latestSafe: "5.7.x",
    cveCount: 3,
    maxCvss: 8.1,
    cves: [
      { id: "CVE-2022-42905", cvss: 8.1, title: "TLS 1.3 out-of-bounds read (DoS)" },
      { id: "CVE-2022-25640", cvss: 7.5, title: "TLS 1.3 client authentication bypass" },
      { id: "CVE-2021-3336", cvss: 7.4, title: "TLS 1.3 MITM via crafted certificate" },
    ],
    assetsAffected: ["bastion-01.acmecorp.com"],
    implementsList: ["TLS 1.2", "TLS 1.3", "ECDSA", "AES-GCM"],
    inUse: true,
    owner: "James Wilson",
    team: "Identity & Access",
    discoverySource: "CBOM Ingestion",
    crs: 72,
    severity: "High",
    policyViolations: ["OOB-LIB-01", "OOB-LIB-02"],
  },

  {
    id: "lib-005",
    name: "OpenSSL",
    version: "3.4.1",
    provider: "OpenSSL Project",
    eolStatus: "Supported",
    eolDate: "Active",
    latestSafe: "3.4.x",
    cveCount: 0,
    maxCvss: 0,
    cves: [],
    assetsAffected: ["payments-api.acmecorp.com", "cdn.acmecorp.com"],
    implementsList: ["TLS 1.3", "ECDHE", "AES-256-GCM", "ML-KEM"],
    inUse: true,
    owner: "Sarah Chen",
    team: "Payments Engineering",
    discoverySource: "CBOM Ingestion",
    crs: 10,
    severity: "Low",
    policyViolations: [],
  },
];
