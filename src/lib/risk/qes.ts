// src/lib/risk/qes.ts
//
// Level Q — Quantum Exposure. Separate from CRS/ARS/ERS by design: an RSA-2048
// certificate is CRS 30 (classically acceptable today) and QOE 100 (Shor-
// breakable). Blending them would push every RSA/ECC estate to the same
// elevated reading and destroy the score's ability to discriminate.
//
// Four ideas here that the market does not have:
//
//   1. DUAL AXIS. Key establishment and authentication are scored separately,
//      because they fail differently, are harvested differently, and carry
//      different deadlines (EO 14412: KEM 2030, signatures 2031). An endpoint
//      presenting an ML-DSA certificate over classical ECDHE is NOT quantum-
//      safe, and every single-flag tool reports that it is.
//
//   2. HARVEST WINDOW. Harvest-now-decrypt-later is only real if the data still
//      has value when the CRQC arrives. harvestWindow = (today + lifespan) -
//      qDay. Positive means harvestable. Q-day is a TENANT parameter, not a
//      vendor prediction, and it is stated as such.
//
//   3. BLOCKER GRAPH. Objects do not fail to migrate because of their
//      certificate. They fail because of the library on the host or the CA that
//      cannot sign lattice. Backlog ranks by objects UNBLOCKED, not by exposure.
//
//   4. DEADLINE PROFILES. Four regulatory regimes, priced into priority, not
//      printed as a countdown badge.
//
// Pure exposure. No programme maturity, no percent-migrated, no projected
// completion. The platform governs and hands off; it does not execute the
// migration and therefore cannot forecast its completion.

import type { CryptoAsset } from "@/data/mockData";
import type { ITAsset } from "@/data/inventoryMockData";
import { mockAssets } from "@/data/mockData";
import { mockProtocols, mockLibraries, type ProtocolAsset, type LibraryAsset } from "@/data/cryptoStackMockData";
import { ticketForObject } from "@/lib/ticketStore";

// ═══════════════════════════════════════════════════════════════════════════
// 0. Tenant parameters
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Q-day: the year a cryptographically relevant quantum computer is assumed to
 * exist. There is no correct value. Expert surveys (Mosca / Piani, Global Risk
 * Institute) put meaningful probability mass across 2030 to 2040. NSM-10 and
 * NIST IR 8547 both act on 2035.
 *
 * This is a tenant setting, surfaced as an assumption, never as a prediction.
 * A vendor asserting a Q-day is a vendor you should not trust.
 */
export const DEFAULT_Q_DAY = 2035;

export type DeadlineProfileId = "NIST_IR_8547" | "EO_14412" | "CNSA_2_0" | "EU_PQC";

export interface DeadlineProfile {
  id: DeadlineProfileId;
  label: string;
  authority: string;
  note: string;
  /** Deadline for key establishment (harvest risk). */
  kemDueYear: (o: CryptoAsset) => number;
  /** Deadline for digital signatures (forgery risk). */
  sigDueYear: (o: CryptoAsset) => number;
}

const NETWORK_CLASS = new Set<CryptoAsset["type"]>(["TLS Certificate", "SSH Key", "SSH Certificate"]);

export const DEADLINE_PROFILES: Record<DeadlineProfileId, DeadlineProfile> = {
  NIST_IR_8547: {
    id: "NIST_IR_8547",
    label: "NIST IR 8547",
    authority: "NIST IR 8547, Transition to Post-Quantum Cryptography Standards",
    note: "112-bit public key (RSA-2048, ECC P-256) deprecated after 2030, disallowed after 2035. Confirm draft or final status on csrc.nist.gov before external citation.",
    kemDueYear: () => 2035,
    sigDueYear: () => 2035,
  },
  EO_14412: {
    id: "EO_14412",
    label: "EO 14412 / OMB M-26-15",
    authority: "Executive Order 14412 (22 Jun 2026); OMB M-26-15 (24 Jun 2026)",
    note: "Federal HVAs and high-impact systems. Key establishment 31 Dec 2030, digital signatures 31 Dec 2031. Agency PQC migration plans due 120 days from 24 Jun 2026.",
    kemDueYear: () => 2030,
    sigDueYear: () => 2031,
  },
  CNSA_2_0: {
    id: "CNSA_2_0",
    label: "CNSA 2.0",
    authority: "NSA CNSA 2.0; CNSSP-15",
    note: "National security systems. New acquisitions CNSA 2.0 capable from 1 Jan 2027. ML-KEM-1024 and ML-DSA-87 only; SLH-DSA is not in the suite.",
    kemDueYear: (o) => (NETWORK_CLASS.has(o.type) ? 2030 : 2033),
    sigDueYear: (o) => (o.type === "Code-Signing Certificate" ? 2030 : 2033),
  },
  EU_PQC: {
    id: "EU_PQC",
    label: "EU coordinated roadmap",
    authority: "NIS Cooperation Group coordinated PQC roadmap (Jun 2025)",
    note: "National strategies and cryptographic inventories by end 2026; high-risk use cases protected by end 2030.",
    kemDueYear: () => 2030,
    sigDueYear: () => 2030,
  },
};

export const DEFAULT_PROFILE: DeadlineProfileId = "NIST_IR_8547";

// ═══════════════════════════════════════════════════════════════════════════
// 1. Algorithm classification: one table, two axes
// ═══════════════════════════════════════════════════════════════════════════

const PQ_KEM = /ML-?KEM|MLKEM|Kyber|X25519MLKEM|SecP256r1MLKEM/i;
const PQ_SIG = /ML-?DSA|MLDSA|Dilithium|SLH-?DSA|SPHINCS|FN-?DSA|Falcon|\bLMS\b|\bXMSS\b/i;
const SHOR = /RSA|ECC|ECDSA|ECDH|EdDSA|Ed25519|Ed448|\bDSA\b|\bDH\b|X25519|secp|nistp|JWT-RS/i;
const SYMM = /AES-256|SHA-256|SHA-384|SHA-512|ChaCha20|HMAC/i;

/**
 * Ed25519 is 100, not 90.
 *
 * A previous table scored it 90 to encode "Shor-breakable but classically
 * strong". Classical strength is what CS measures inside CRS (crs.ts already
 * scores Ed25519 at 15). Reading it a second time here is a category error, and
 * it is what caused the same word to print two different counts on one screen:
 * the page filtered vulnerable at >= 90 while computeQOE flagged it at >= 100.
 *
 * Against Shor, Ed25519 and ECDSA P-256 are the same object.
 */
export const VULNERABLE_THRESHOLD = 90;

export function algVuln(algorithm: string): number {
  if (!algorithm) return 0;
  if (PQ_KEM.test(algorithm) || PQ_SIG.test(algorithm)) return 0;
  if (SYMM.test(algorithm)) return 0;
  if (/AES-128/i.test(algorithm)) return 30; // Grover halves effective strength: a reduction, not a break
  if (SHOR.test(algorithm)) return 100;
  return 0;
}

export const isQuantumVulnerable = (algorithm: string) => algVuln(algorithm) >= VULNERABLE_THRESHOLD;

// ── The two axes ─────────────────────────────────────────────────────────────
// An object participates in key establishment, in authentication, or in both.
// Migration of one does not migrate the other. This is the distinction the
// whole module is built on.

export type Axis = "kem" | "signature" | "both" | "symmetric";
export type Posture = "PQC" | "Hybrid" | "Classical" | "n/a";

const AXIS_BY_TYPE: Record<string, Axis> = {
  "TLS Certificate": "both", // signs the handshake, its key seeds the exchange
  "SSH Key": "both",
  "SSH Certificate": "signature",
  "Code-Signing Certificate": "signature",
  "K8s Workload Cert": "both",
  "Encryption Key": "kem",
  "Cloud KMS Key": "kem",
  "HSM Key": "kem",
  "API Key / Secret": "symmetric",
};

export function axisOf(o: CryptoAsset): Axis {
  return AXIS_BY_TYPE[o.type] ?? "both";
}

export function kemPosture(algorithm: string): Posture {
  if (PQ_KEM.test(algorithm)) return /X25519|secp|hybrid/i.test(algorithm) ? "Hybrid" : "PQC";
  if (SHOR.test(algorithm)) return "Classical";
  return "n/a";
}

export function sigPosture(algorithm: string): Posture {
  if (PQ_SIG.test(algorithm)) return "PQC";
  if (SHOR.test(algorithm)) return "Classical";
  return "n/a";
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Harvest window (Mosca)
// ═══════════════════════════════════════════════════════════════════════════
//
// Harvest-now-decrypt-later is only real if the data still has value when the
// CRQC arrives. Data with a two-year shelf life recorded today is worthless in
// 2035. Data with a twelve-year shelf life is not.
//
// harvestWindow = (today + shelfLife) - qDay
//   > 0   the adversary can still profit from decrypting it. Harvestable.
//   <= 0  the data is stale before the machine exists. Not a harvest target,
//         even though the algorithm is Shor-breakable.
//
// Forgery risk (signatures) has NO harvest window: a signature is either
// verifiable at the moment of use or it is not. This is why signature exposure
// is scored without HNDL and why NIST/CNSA treat the two timelines differently.

export type DataSensitivity = "Restricted" | "Confidential" | "Internal" | "Public";
const SENS_W: Record<DataSensitivity, number> = { Restricted: 1.0, Confidential: 0.75, Internal: 0.5, Public: 0.25 };

export function deriveSensitivity(a: CryptoAsset): DataSensitivity {
  const t = (a.tags || []).join(" ").toLowerCase();
  if (/pci|phi|pii|secret|payment|financial|hsm/.test(t)) return "Restricted";
  if (a.environment === "Production") return "Confidential";
  if (a.environment === "Staging") return "Internal";
  return a.type === "Code-Signing Certificate" ? "Confidential" : "Internal";
}

export function deriveShelfLife(a: CryptoAsset): number {
  const t = (a.tags || []).join(" ").toLowerCase();
  if (/phi|health|pii/.test(t)) return 12;
  if (/financial|payment|pci/.test(t)) return 8;
  if (a.type === "Code-Signing Certificate") return 6;
  if (/Encryption Key|HSM Key|Cloud KMS Key/.test(a.type)) return 7;
  if (/SSH/.test(a.type)) return 3;
  if (a.type === "TLS Certificate") return 2;
  if (a.type === "API Key / Secret") return 0.5;
  return 1;
}

export function harvestWindow(
  shelfLife: number,
  qDay: number = DEFAULT_Q_DAY,
  year = new Date().getFullYear(),
): number {
  return year + shelfLife - qDay;
}

export function isHarvestable(a: CryptoAsset, qDay: number = DEFAULT_Q_DAY): boolean {
  return harvestWindow(deriveShelfLife(a), qDay) > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Exposure and QOE
// ═══════════════════════════════════════════════════════════════════════════

function exposureScore(a: CryptoAsset): number {
  const anchor =
    /\b(root|issuing|intermediate)\b/i.test(a.name) ||
    /\bCA\b/.test(a.name) ||
    (a.tags || []).some((t) => /root|trust-anchor|issuing-ca|intermediate/i.test(t));
  if (anchor) return 100; // compromise invalidates every certificate beneath it

  const ephemeral = a.type === "API Key / Secret" || /\b(7|24)\b/.test(a.rotationFrequency ?? "");
  const longLived = deriveShelfLife(a) >= 2;
  const facing = a.environment === "Production" && (a.tags || []).some((t) => /edge|wildcard|public|api|pci/i.test(t));

  if (facing && longLived) return 100;
  if (a.environment === "Production" && longLived) return 60;
  if (ephemeral) return 10;
  if (a.environment === "Production") return 40;
  if (a.environment === "Staging") return 30;
  return 20;
}

export interface QoeBreakdown {
  qoe: number;
  algVuln: number;
  hndl: number;
  exposure: number;
  sensitivity: DataSensitivity;
  shelfLife: number;
  harvestWindow: number;
  harvestable: boolean;
  axis: Axis;
  kem: Posture;
  sig: Posture;
  vulnerable: boolean;
}

export function computeQOE(a: CryptoAsset, qDay: number = DEFAULT_Q_DAY): QoeBreakdown {
  const av = algVuln(a.algorithm);
  const sensitivity = deriveSensitivity(a);
  const shelfLife = deriveShelfLife(a);
  const window = harvestWindow(shelfLife, qDay);
  const axis = axisOf(a);

  // HNDL applies to key establishment only. A signature cannot be harvested.
  const carriesKem = axis === "kem" || axis === "both";
  const rawHndl = SENS_W[sensitivity] * Math.min(1, shelfLife / 10) * 100;
  const hndl = carriesKem && window > 0 ? rawHndl : 0;

  const exposure = exposureScore(a);

  // Signature-only objects reweight: no harvest term, so vulnerability and
  // reachability carry the score. A code-signing key is a forgery risk, not a
  // harvest risk, and pretending otherwise inflates every estate identically.
  const qoe =
    av === 0
      ? 0
      : Math.min(100, Math.round(carriesKem ? 0.35 * av + 0.35 * hndl + 0.3 * exposure : 0.55 * av + 0.45 * exposure));

  return {
    qoe,
    algVuln: av,
    hndl: Math.round(hndl),
    exposure,
    sensitivity,
    shelfLife,
    harvestWindow: window,
    harvestable: window > 0,
    axis,
    kem: carriesKem ? kemPosture(a.algorithm) : "n/a",
    sig: axis === "signature" || axis === "both" ? sigPosture(a.algorithm) : "n/a",
    vulnerable: av >= VULNERABLE_THRESHOLD,
  };
}

/** Derived band. CryptoAsset.pqcRisk is a stored third source of truth: deprecate it. */
export function pqcBand(a: CryptoAsset): "Critical" | "High" | "Medium" | "Low" | "Safe" {
  const { qoe } = computeQOE(a);
  if (qoe === 0) return "Safe";
  if (qoe >= 80) return "Critical";
  if (qoe >= 60) return "High";
  if (qoe >= 30) return "Medium";
  return "Low";
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Protocol instances: the wire is the harvest surface
// ═══════════════════════════════════════════════════════════════════════════
//
// This is where the dual axis earns its keep. A protocol's posture is a
// property of what the endpoint OFFERS, read from kexStrength (key
// establishment) and the auth field of its cipher suites (authentication).
// pqcPosture as a stored string is not used: it drifts from the evidence.

export interface ProtocolPosture {
  kem: Posture;
  sig: Posture;
  quantumSafe: boolean; // BOTH axes migrated. The honest definition.
  harvestable: boolean; // classical KEM on a reachable endpoint
  qoe: number;
  shadow: boolean; // endpoint on an FQDN absent from IT inventory
}

export function protocolPosture(p: ProtocolAsset): ProtocolPosture {
  const kem = PQ_KEM.test(p.kexStrength)
    ? /X25519|secp|P-256|P-384/i.test(p.kexStrength)
      ? "Hybrid"
      : "PQC"
    : "Classical";

  const authAlgs = p.cipherSuites.map((c) => c.auth).join(" ");
  const sig: Posture = PQ_SIG.test(authAlgs) ? "PQC" : "Classical";

  const exposure = p.exposure === "Internet-facing" ? 100 : p.environment === "Production" ? 60 : 30;
  const av = kem === "Classical" ? 100 : kem === "Hybrid" ? 20 : 0;

  // A protocol carries traffic. Sensitivity is the owning application's, which
  // we do not have on ProtocolAsset, so exposure and vulnerability carry it and
  // the CRS already on the record supplies operational severity.
  const qoe = av === 0 ? 0 : Math.min(100, Math.round(0.5 * av + 0.5 * exposure));

  return {
    kem,
    sig,
    quantumSafe: kem !== "Classical" && sig === "PQC",
    harvestable: kem === "Classical",
    qoe,
    shadow: p.bound === false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Libraries: capability, and the blocker graph
// ═══════════════════════════════════════════════════════════════════════════
//
// A library protects no data of its own. It has no harvest value and therefore
// no QOE. What it has is a CAPABILITY: it implements FIPS 203/204/205, or it
// does not. A library that does not blocks every quantum-vulnerable object on
// every host it runs on.
//
// This inverts the backlog. The highest-value action in a PQC programme is
// almost never the highest-QOE certificate. It is the library nobody was
// looking at, whose upgrade unblocks forty objects at once.

export function libraryPqcCapable(l: LibraryAsset): boolean {
  return l.implementsList.some((a) => PQ_KEM.test(a) || PQ_SIG.test(a));
}

export function libraryBlockerSeverity(l: LibraryAsset): "hard" | "soft" | "none" {
  if (libraryPqcCapable(l)) return "none";
  return l.eolStatus === "End-of-Life" ? "hard" : "soft"; // EOL: no upgrade path in place
}

/** Objects a non-PQC library holds back, by host FQDN. */
export function objectsBlockedBy(l: LibraryAsset, objects: CryptoAsset[] = mockAssets): CryptoAsset[] {
  if (libraryPqcCapable(l)) return [];
  return objects.filter((o) => l.assetsAffected.includes(o.infrastructure) && isQuantumVulnerable(o.algorithm));
}

export interface BlockerNode {
  library: LibraryAsset;
  severity: "hard" | "soft";
  unblocks: number; // crypto objects freed by upgrading this one library
  hosts: number;
  protocols: number; // protocol endpoints on the same hosts
  hasKev: boolean; // CISA Known Exploited Vulnerability: fix regardless
  remediation: string; // "OpenSSL 1.0.2u -> 3.4.1"
}

/**
 * The blocker graph, ranked by objects unblocked. This is the sequence, and it
 * is the answer to "what do I do Monday". No competitor produces it, because it
 * requires the vulnerability scanner and the crypto inventory to share a host
 * key.
 */
export function blockerGraph(
  objects: CryptoAsset[] = mockAssets,
  libraries: LibraryAsset[] = mockLibraries,
  protocols: ProtocolAsset[] = mockProtocols,
): BlockerNode[] {
  return libraries
    .filter((l) => !libraryPqcCapable(l))
    .map((l) => ({
      library: l,
      severity: libraryBlockerSeverity(l) as "hard" | "soft",
      unblocks: objectsBlockedBy(l, objects).length,
      hosts: l.assetsAffected.length,
      protocols: protocols.filter((p) => l.assetsAffected.includes(p.fqdn)).length,
      hasKev: l.cves.some((c) => c.kev),
      remediation: `${l.name} ${l.version} → ${l.latestSafe}`,
    }))
    .sort((a, b) => b.unblocks - a.unblocks || Number(b.hasKev) - Number(a.hasKev));
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Crypto-agility: a computed verdict, not an assumption
// ═══════════════════════════════════════════════════════════════════════════
//
// Everyone in this market says "crypto-agility". Nobody computes it, because it
// requires three integrations landing on the same object:
//
//   1. Can the issuing CA sign lattice?          CA scan
//   2. Can every library on the host do PQC?     Qualys / Tenable / CBOM
//   3. Is there an automated change path?        CLM
//
// A TLS certificate cannot become ML-DSA if its issuer cannot sign ML-DSA,
// however agile the rest of the stack is.

export interface AgilityVerdict {
  agile: boolean;
  hardBlocked: boolean;
  blockers: { kind: "ca" | "library" | "process"; detail: string; fix: string }[];
}

const PQC_CAPABLE_ISSUERS = /DigiCert|EJBCA|Internal PQC|Entrust PQ/i;
export const issuerPqcCapable = (issuer: string) => PQC_CAPABLE_ISSUERS.test(issuer ?? "");

export function assessAgility(a: CryptoAsset, libraries: LibraryAsset[] = mockLibraries): AgilityVerdict {
  const blockers: AgilityVerdict["blockers"] = [];
  let hardBlocked = false;

  if (!issuerPqcCapable(a.caIssuer)) {
    blockers.push({
      kind: "ca",
      detail: `Issuing CA "${a.caIssuer}" cannot sign PQC`,
      fix: "Migrate issuance to a lattice-capable CA",
    });
  }

  libraries
    .filter((l) => l.assetsAffected.includes(a.infrastructure) && !libraryPqcCapable(l))
    .forEach((l) => {
      const sev = libraryBlockerSeverity(l);
      if (sev === "hard") hardBlocked = true;
      blockers.push({
        kind: "library",
        detail: `${l.name} ${l.version} on ${a.infrastructure} implements no PQC (${l.eolStatus})`,
        fix: `Upgrade to ${l.latestSafe}`,
      });
    });

  if (!a.autoRenewal) {
    blockers.push({ kind: "process", detail: "No automated change path", fix: "Onboard to CLM automation" });
  }

  return { agile: blockers.length === 0, hardBlocked, blockers };
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Migration status: observed, never invented
// ═══════════════════════════════════════════════════════════════════════════
//
// A previous implementation returned status from `id.charCodeAt(len-1) % 10`
// and reported five stages. The platform has evidence for three. "In
// assessment" and "Migration planned" live inside the customer's change
// process, which this platform does not observe.

export type MigrationStatus = "Not started" | "Handed off" | "Migrated";

export function deriveMigrationStatus(a: CryptoAsset): MigrationStatus {
  if (!isQuantumVulnerable(a.algorithm)) return "Migrated";
  const t = ticketForObject(a.id);
  if (!t) return "Not started";
  return /pqc|quantum/i.test(`${t.summary} ${t.module ?? ""}`) ? "Handed off" : "Not started";
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Priority, priced against a deadline profile
// ═══════════════════════════════════════════════════════════════════════════

const SENS_PRIORITY: Record<DataSensitivity, number> = { Restricted: 4, Confidential: 3, Internal: 2, Public: 1 };

export interface BacklogItem {
  asset: CryptoAsset;
  priority: number;
  qoe: number;
  sensitivity: DataSensitivity;
  shelfLife: number;
  harvestable: boolean;
  axis: Axis;
  kem: Posture;
  sig: Posture;
  dueYear: number;
  dueAxis: "kem" | "signature";
  agilityBlocked: boolean;
  hardBlocked: boolean;
  blockers: AgilityVerdict["blockers"];
  status: MigrationStatus;
  violations: number;
}

export function qmBacklog(
  objects: CryptoAsset[] = mockAssets,
  profileId: DeadlineProfileId = DEFAULT_PROFILE,
  qDay: number = DEFAULT_Q_DAY,
  year: number = new Date().getFullYear(),
): BacklogItem[] {
  const profile = DEADLINE_PROFILES[profileId];

  return objects
    .filter((o) => isQuantumVulnerable(o.algorithm))
    .map((o) => {
      const b = computeQOE(o, qDay);
      const agility = assessAgility(o);

      // Whichever axis falls due first governs the clock.
      const kemDue = profile.kemDueYear(o);
      const sigDue = profile.sigDueYear(o);
      const carriesKem = b.axis === "kem" || b.axis === "both";
      const carriesSig = b.axis === "signature" || b.axis === "both";
      const dueYear = Math.min(carriesKem ? kemDue : Infinity, carriesSig ? sigDue : Infinity);
      const dueAxis: "kem" | "signature" = carriesKem && kemDue <= sigDue ? "kem" : "signature";

      const sens = SENS_PRIORITY[b.sensitivity];
      const shelf = Math.min(1, b.shelfLife / 10);
      const vuln = b.algVuln >= VULNERABLE_THRESHOLD ? 1 : b.algVuln === 30 ? 0.3 : 0;
      const urgency = Math.max(0.25, Math.min(2, 6 / Math.max(1, dueYear - year)));

      // Data that is stale before Q-day is not a harvest target. Signature
      // objects keep full weight: forgery has no shelf life.
      const harvestFactor = carriesKem && !b.harvestable ? 0.35 : 1;

      return {
        asset: o,
        priority: Math.round(sens * shelf * vuln * urgency * harvestFactor * 100) / 100,
        qoe: b.qoe,
        sensitivity: b.sensitivity,
        shelfLife: b.shelfLife,
        harvestable: b.harvestable,
        axis: b.axis,
        kem: b.kem,
        sig: b.sig,
        dueYear,
        dueAxis,
        agilityBlocked: !agility.agile,
        hardBlocked: agility.hardBlocked,
        blockers: agility.blockers,
        status: deriveMigrationStatus(o),
        violations: o.policyViolations ?? 0,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. Aggregation: QES at object, asset, enterprise
// ═══════════════════════════════════════════════════════════════════════════
//
// Same shape as ARS: worst object anchors, distribution modulates, a
// concentration floor stops a large clean estate from diluting a real cluster.
//
// Deliberate omission: no business-impact multiplier. Data sensitivity is
// already inside HNDL. Multiplying by asset criticality counts it twice.

function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0;
  return sortedAsc[Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length))];
}

export interface QesBreakdown {
  qes: number;
  maxQoe: number;
  p90: number;
  p75: number;
  criticalCount: number;
  vulnerableCount: number;
  harvestableCount: number;
  totalScored: number;
  severity: "Critical" | "High" | "Medium" | "Low";
  topObjects: {
    id: string;
    name: string;
    qoe: number;
    algorithm: string;
    detail: string;
    kind: "object" | "protocol";
  }[];
}

export function qesSeverity(s: number): QesBreakdown["severity"] {
  if (s >= 80) return "Critical";
  if (s >= 60) return "High";
  if (s >= 30) return "Medium";
  return "Low";
}

type Row = QesBreakdown["topObjects"][number] & { vulnerable: boolean; harvestable: boolean };

function aggregate(rows: Row[]): QesBreakdown {
  const qoes = rows.map((r) => r.qoe);
  const asc = [...qoes].sort((a, b) => a - b);
  const maxQoe = qoes.length ? Math.max(...qoes) : 0;
  const p90 = percentile(asc, 90);
  const p75 = percentile(asc, 75);
  const criticalCount = rows.filter((r) => r.qoe >= 80).length;
  const anchor = 0.55 * maxQoe + 0.45 * (0.6 * p90 + 0.4 * p75);
  const floor = criticalCount > 0 ? Math.min(100, 52 + 4.8 * Math.log(criticalCount)) : 0;
  const qes = Math.min(100, Math.round(Math.max(anchor, floor)));

  return {
    qes,
    maxQoe,
    p90,
    p75,
    criticalCount,
    vulnerableCount: rows.filter((r) => r.vulnerable).length,
    harvestableCount: rows.filter((r) => r.harvestable).length,
    totalScored: rows.length,
    severity: qesSeverity(qes),
    topObjects: [...rows].sort((a, b) => b.qoe - a.qoe).slice(0, 8),
  };
}

/**
 * Enterprise QES over crypto objects AND protocol instances. A TLS 1.2 endpoint
 * offering no ML-KEM group is precisely the harvest surface this score exists to
 * measure. Libraries are excluded: they have no harvest value and appear in the
 * blocker graph instead.
 */
export function computeQES(
  objects: CryptoAsset[] = mockAssets,
  protocols: ProtocolAsset[] = mockProtocols,
  qDay: number = DEFAULT_Q_DAY,
): QesBreakdown {
  const objRows: Row[] = objects.map((o) => {
    const b = computeQOE(o, qDay);
    return {
      id: o.id,
      name: o.name,
      qoe: b.qoe,
      algorithm: o.algorithm,
      kind: "object",
      detail: `${b.sensitivity} · ${b.shelfLife}y shelf · KEM ${b.kem} / SIG ${b.sig}`,
      vulnerable: b.vulnerable,
      harvestable: b.harvestable && b.vulnerable,
    };
  });

  const protoRows: Row[] = protocols.map((p) => {
    const q = protocolPosture(p);
    return {
      id: p.id,
      name: `${p.service} ${p.port} · ${p.fqdn}`,
      qoe: q.qoe,
      algorithm: `${p.family} ${p.version}`,
      kind: "protocol",
      detail: `KEM ${q.kem} / SIG ${q.sig}${q.shadow ? " · shadow host" : ""}`,
      vulnerable: q.kem === "Classical",
      harvestable: q.harvestable,
    };
  });

  return aggregate([...objRows, ...protoRows]);
}

/** Asset-level quantum exposure. Same aggregation, scoped to one IT asset. */
export function qesFor(
  asset: ITAsset,
  objects: CryptoAsset[] = mockAssets,
  protocols: ProtocolAsset[] = mockProtocols,
): QesBreakdown {
  const objs = (asset.cryptoObjectIds ?? [])
    .map((id) => objects.find((o) => o.id === id))
    .filter(Boolean) as CryptoAsset[];
  return computeQES(
    objs,
    protocols.filter((p) => p.fqdn === asset.name),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Programme readiness — beside the score, never inside it
// ═══════════════════════════════════════════════════════════════════════════
//
// projectedCompletionYear and onTrack are gone. They forecast the completion of
// work the platform does not perform. "We do not forecast your completion date,
// because we do not execute your migration" is a more credible sentence in
// front of an auditor than any burndown chart.

export interface ReadinessRollup {
  vulnerable: number;
  harvestable: number;
  agilityBlocked: number;
  hardBlocked: number;
  handedOff: number;
  coveragePct: number;
  shadowEndpoints: number;
  kemMigrated: number;
  sigMigrated: number;
  bothMigrated: number;
}

export function computeReadiness(
  objects: CryptoAsset[] = mockAssets,
  protocols: ProtocolAsset[] = mockProtocols,
  qDay: number = DEFAULT_Q_DAY,
): ReadinessRollup {
  let vulnerable = 0,
    harvestable = 0,
    agilityBlocked = 0,
    hardBlocked = 0,
    handedOff = 0;

  objects.forEach((o) => {
    const b = computeQOE(o, qDay);
    if (!b.vulnerable) return;
    vulnerable++;
    if (b.harvestable) harvestable++;
    const v = assessAgility(o);
    if (!v.agile) agilityBlocked++;
    if (v.hardBlocked) hardBlocked++;
    if (deriveMigrationStatus(o) === "Handed off") handedOff++;
  });

  const postures = protocols.map(protocolPosture);
  return {
    vulnerable,
    harvestable,
    agilityBlocked,
    hardBlocked,
    handedOff,
    coveragePct: vulnerable === 0 ? 100 : Math.round((handedOff / vulnerable) * 100),
    shadowEndpoints: postures.filter((p) => p.shadow).length,
    kemMigrated: postures.filter((p) => p.kem !== "Classical").length,
    sigMigrated: postures.filter((p) => p.sig === "PQC").length,
    bothMigrated: postures.filter((p) => p.quantumSafe).length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. Explainers
// ═══════════════════════════════════════════════════════════════════════════

export function explainQES(b: QesBreakdown): string {
  if (b.qes === 0) return "No quantum-vulnerable objects: the estate is effectively quantum-safe.";
  const floor = b.criticalCount > 0 ? 52 + 4.8 * Math.log(b.criticalCount) : 0;
  const anchor = 0.55 * b.maxQoe + 0.45 * (0.6 * b.p90 + 0.4 * b.p75);
  return floor >= anchor
    ? `Driven by concentration: ${b.criticalCount} maximally-exposed object${b.criticalCount === 1 ? "" : "s"} hold the score up regardless of how many safe objects surround them.`
    : `Anchored on the worst object (QOE ${b.maxQoe}); ${b.vulnerableCount} of ${b.totalScored} scored objects are quantum-vulnerable.`;
}

export function explainQOE(b: QoeBreakdown): string {
  if (b.qoe === 0) return "Quantum-safe algorithm: no harvest and no forgery exposure.";
  if (b.axis === "signature")
    return `Forgery risk. A Shor-breakable signature key on a ${b.exposure >= 100 ? "reachable" : "restricted"} surface. Signatures cannot be harvested, so no HNDL term applies.`;
  if (!b.harvestable)
    return `Quantum-vulnerable, but its data has a ${b.shelfLife}-year shelf life and is stale before the assumed Q-day. Deprioritised, not dismissed.`;
  return `Harvest target: quantum-vulnerable key establishment protecting ${b.sensitivity.toLowerCase()} data with ${b.shelfLife} years of shelf life, still valuable ${b.harvestWindow} year${b.harvestWindow === 1 ? "" : "s"} past the assumed Q-day.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. Evidence pack
// ═══════════════════════════════════════════════════════════════════════════
//
// The platform does not remediate, so it does not sell a plan. It sells the
// artifact. OMB M-26-15 gives agencies 120 days from 24 Jun 2026 to file a PQC
// Migration Plan. EO 14412 Sec 5(d) directs CISA and NIST to publish CBOM
// minimum elements within 270 days, so no vendor can build to that schema yet.
// Until it lands, emit CycloneDX 1.6 (ECMA-424) cryptographic-asset components,
// which is what CBOM tooling already reads.

export interface EvidencePack {
  generatedAt: string;
  assumptions: { qDay: number; qDaySource: string; deadlineProfile: string; authority: string };
  qes: QesBreakdown;
  readiness: ReadinessRollup;
  blockerGraph: BlockerNode[];
  backlog: BacklogItem[];
  cbom: Record<string, unknown>;
}

export function buildEvidencePack(
  objects: CryptoAsset[] = mockAssets,
  protocols: ProtocolAsset[] = mockProtocols,
  libraries: LibraryAsset[] = mockLibraries,
  profileId: DeadlineProfileId = DEFAULT_PROFILE,
  qDay: number = DEFAULT_Q_DAY,
): EvidencePack {
  const profile = DEADLINE_PROFILES[profileId];

  const components = [
    ...objects.map((o) => {
      const b = computeQOE(o, qDay);
      const ag = assessAgility(o, libraries);
      return {
        type: "cryptographic-asset",
        "bom-ref": o.id,
        name: o.name,
        cryptoProperties: {
          assetType: /Key|Secret/.test(o.type) ? "related-crypto-material" : "certificate",
          algorithmProperties: { primitive: o.algorithm, parameterSetIdentifier: o.keyLength },
          certificateProperties: { issuerName: o.caIssuer, notValidAfter: o.expiryDate },
        },
        properties: [
          { name: "avx:qoe", value: String(b.qoe) },
          { name: "avx:kemPosture", value: b.kem },
          { name: "avx:sigPosture", value: b.sig },
          { name: "avx:harvestable", value: String(b.harvestable) },
          { name: "avx:shelfLifeYears", value: String(b.shelfLife) },
          { name: "avx:kemDueYear", value: String(profile.kemDueYear(o)) },
          { name: "avx:sigDueYear", value: String(profile.sigDueYear(o)) },
          { name: "avx:cryptoAgile", value: String(ag.agile) },
          { name: "avx:blockers", value: ag.blockers.map((x) => x.detail).join("; ") || "none" },
          { name: "avx:changeRequest", value: ticketForObject(o.id)?.id ?? "none" },
          { name: "avx:discoverySource", value: o.discoverySource },
        ],
      };
    }),
    ...protocols.map((p) => {
      const q = protocolPosture(p);
      return {
        type: "cryptographic-asset",
        "bom-ref": p.id,
        name: `${p.service} ${p.port} · ${p.fqdn}`,
        cryptoProperties: {
          assetType: "protocol",
          protocolProperties: {
            type: p.family.toLowerCase(),
            version: p.version,
            cipherSuites: p.cipherSuites.map((c) => ({ name: c.name, identifiers: [c.id] })),
          },
        },
        properties: [
          { name: "avx:kemPosture", value: q.kem },
          { name: "avx:sigPosture", value: q.sig },
          { name: "avx:quantumSafe", value: String(q.quantumSafe) },
          { name: "avx:shadowHost", value: String(q.shadow) },
          { name: "avx:discoverySource", value: p.discoverySource },
        ],
      };
    }),
    ...libraries.map((l) => ({
      type: "library",
      "bom-ref": l.id,
      name: l.name,
      version: l.version,
      publisher: l.provider,
      purl: l.packageId,
      properties: [
        { name: "avx:pqcCapable", value: String(libraryPqcCapable(l)) },
        { name: "avx:blockerSeverity", value: libraryBlockerSeverity(l) },
        { name: "avx:objectsBlocked", value: String(objectsBlockedBy(l, objects).length) },
        { name: "avx:eolStatus", value: l.eolStatus },
        { name: "avx:remediation", value: l.latestSafe },
        { name: "avx:discoverySource", value: l.discoverySource },
      ],
    })),
  ];

  return {
    generatedAt: new Date().toISOString(),
    assumptions: {
      qDay,
      qDaySource:
        "Tenant-configured. AppViewX makes no prediction about when a cryptographically relevant quantum computer will exist.",
      deadlineProfile: profile.label,
      authority: profile.authority,
    },
    qes: computeQES(objects, protocols, qDay),
    readiness: computeReadiness(objects, protocols, qDay),
    blockerGraph: blockerGraph(objects, libraries, protocols),
    backlog: qmBacklog(objects, profileId, qDay),
    cbom: {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      serialNumber: `urn:uuid:${globalThis.crypto?.randomUUID?.() ?? "unset"}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: "AppViewX", name: "AVX Trust Platform" }],
        properties: [{ name: "avx:deadlineProfile", value: profile.authority }],
      },
      components,
    },
  };
}

export function downloadEvidencePack(pack: EvidencePack = buildEvidencePack()): void {
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `avx-quantum-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
