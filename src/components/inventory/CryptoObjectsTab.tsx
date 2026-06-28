import { FEATURES } from "@/config/features";
import { algVuln } from "@/lib/risk/qes";
import { getCryptoViolations, cryptoViolationCount } from "@/lib/violations";
import React, { useState, useMemo, useEffect } from "react";
import { mockAssets, CryptoAsset, violatedPoliciesForObject } from "@/data/mockData";
import { VIOLATION_FILTERS } from "@/lib/filters/cryptoFilters";
import { mockITAssets } from "@/data/inventoryMockData";
import { useInventoryRegistry } from "@/context/InventoryRegistryContext";
import { useAgent } from "@/context/AgentContext";
import { useNav } from "@/context/NavigationContext";
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry } from "@/components/shared/UIComponents";
import {
  Search,
  X,
  Info,
  Atom,
  FileEdit,
  ArrowRight,
  Ticket,
  Lock,
  ChevronUp,
  ChevronDown,
  Filter as FilterIcon,
  Download,
  Columns3,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import AgentDetailPanel from "@/components/inventory/AgentDetailPanel";
import CryptoObjectRiskDrawer from "@/components/risk/CryptoObjectRiskDrawer";
import DeployToDeviceModal from "@/components/integrations/DeployToDeviceModal";
import TicketDraftModal, { TicketDraft } from "@/components/inventory/TicketDraftModal";
import { ticketForObject } from "@/lib/ticketStore";
import { computeCRS } from "@/lib/risk/crs";
import { useExceptions, effectiveViolations } from "@/lib/exceptions/ExceptionsContext";
import { RaiseExceptionModal } from "@/lib/exceptions/ExceptionComponents";

// Map a violation label → its built-in policy (id + name). Returns null for
// Returns null for labels with no backing policy.
function violationToPolicy(label: string, co: CryptoAsset): { policyId: string; policyName: string } | null {
  const l = label.toLowerCase();
  if (l.includes("self-signed")) return { policyId: "oob-003", policyName: "Self-Signed Server Certificate" };
  if (l.includes("quantum-vulnerable") || l.includes("quantum vulnerable"))
    return { policyId: "oob-pqc", policyName: "Quantum-Vulnerable Algorithm in Use" };
  if (l.includes("sha-1") || l.includes("md5")) return { policyId: "oob-001", policyName: "Weak Signature Algorithm" };
  if (l.includes("revoked")) return { policyId: "oob-004", policyName: "Revoked Certificate Still Deployed" };
  if (((co as any).algorithm || "").match(/RSA-(512|1024)/i))
    return { policyId: "oob-002", policyName: "Weak RSA Key Length" };
  return null;
}

// CRS lookup memoised per render via module-level WeakMap
const _crsCache = new WeakMap<CryptoAsset, number>();
function crsScore(a: CryptoAsset): number {
  const cached = _crsCache.get(a);
  if (cached !== undefined) return cached;
  const v = computeCRS(a).crs;
  _crsCache.set(a, v);
  return v;
}

interface Props {
  onCreateTicket: (ctx: unknown) => void;
}

// ── Type filter tabs ──────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { key: "All", label: "All Identities" },
  { key: "TLS Certificate", label: "Certificates" },
  { key: "SSH Key", label: "SSH Keys" },
  { key: "SSH Certificate", label: "SSH Certs" },
  { key: "Code-Signing Certificate", label: "Code Signing" },
  { key: "K8s Workload Cert", label: "K8s Certs" },
  { key: "Encryption Key", label: "Enc Keys" },
  { key: "AI Agent Token", label: "AI Tokens" },
  { key: "API Key / Secret", label: "Secrets" },
];

// ── Column definitions per type ───────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  cls: string;
  defaultOn?: boolean;
}

const COLS: Record<string, ColDef[]> = {
  // Posture-relevant columns only. Most-important facts in the table; full
  // context lives in the side panel. Lifecycle-ops columns (auto-renewal) are
  // intentionally excluded; this is a posture product, not CLM.
  All: [
    { key: "name", label: "Name", cls: "min-w-[180px] flex-1" },
    { key: "type", label: "Type", cls: "w-36" },
    { key: "keyAttribute", label: "Key Attribute", cls: "w-32" },
    { key: "status", label: "Status", cls: "w-24" },
    { key: "pqcRisk", label: "PQC", cls: "w-20" },
    { key: "owner", label: "Owner", cls: "w-32" },
    { key: "environment", label: "Env", cls: "w-24" },
    { key: "violations", label: "Violations", cls: "w-20" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "TLS Certificate": [
    { key: "name", label: "Common Name", cls: "min-w-[180px] flex-1" },
    { key: "caIssuer", label: "CA / Issuer", cls: "w-32" },
    { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32" },
    { key: "expiryDate", label: "Valid To", cls: "w-24" },
    { key: "daysToExpiry", label: "Expires In", cls: "w-20" },
    { key: "status", label: "Status", cls: "w-24" },
    { key: "certEndpoints", label: "Endpoints", cls: "w-20" },
    { key: "certCompliance", label: "Compliance", cls: "w-28" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "SSH Key": [
    { key: "name", label: "Key Name", cls: "min-w-[170px] flex-1" },
    { key: "sshFingerprint", label: "Fingerprint", cls: "w-40" },
    { key: "sshUsers", label: "Users", cls: "w-16" },
    { key: "sshFiles", label: "File Paths", cls: "w-20" },
    { key: "sshGroup", label: "Compliance Group", cls: "w-32" },
    { key: "sshMgmt", label: "Status", cls: "w-24" },
    { key: "sshRisk", label: "Risk Status", cls: "w-24" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "SSH Certificate": [
    { key: "name", label: "Cert ID / Name", cls: "min-w-[170px] flex-1" },
    { key: "sshcAssocKey", label: "Associated Key", cls: "w-32" },
    { key: "sshcPrincipals", label: "Principals", cls: "w-24" },
    { key: "sshcSigningCA", label: "Signing CA", cls: "w-24" },
    { key: "sshcKeyType", label: "Key Type", cls: "w-20" },
    { key: "expiryDate", label: "Valid To", cls: "w-24" },
    { key: "daysToExpiry", label: "Expires In", cls: "w-20" },
    { key: "status", label: "Status", cls: "w-24" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "Code-Signing Certificate": [
    { key: "name", label: "Cert Name", cls: "min-w-[180px] flex-1" },
    { key: "caIssuer", label: "CA / Issuer", cls: "w-32" },
    { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32" },
    { key: "expiryDate", label: "Valid To", cls: "w-24" },
    { key: "daysToExpiry", label: "Expires In", cls: "w-20" },
    { key: "csStore", label: "Protection Store", cls: "w-32" },
    { key: "status", label: "Status", cls: "w-24" },
    { key: "certCompliance", label: "Compliance", cls: "w-28" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "K8s Workload Cert": [
    { key: "name", label: "Workload", cls: "min-w-[180px] flex-1" },
    { key: "application", label: "Namespace / App", cls: "w-36" },
    { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32" },
    { key: "expiryDate", label: "Valid To", cls: "w-24" },
    { key: "daysToExpiry", label: "Expires In", cls: "w-20" },
    { key: "status", label: "Status", cls: "w-24" },
    { key: "certCompliance", label: "Compliance", cls: "w-28" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "Encryption Key": [
    { key: "name", label: "Key Name", cls: "min-w-[180px] flex-1" },
    { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32" },
    { key: "encProtection", label: "Protection", cls: "w-24" },
    { key: "encStore", label: "Store", cls: "w-36" },
    { key: "encPurpose", label: "Purpose", cls: "w-24" },
    { key: "lastRotated", label: "Last Rotated", cls: "w-28" },
    { key: "pqcRisk", label: "PQC", cls: "w-20" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
  "API Key / Secret": [
    { key: "name", label: "Secret Name", cls: "min-w-[180px] flex-1" },
    { key: "secretType", label: "Type", cls: "w-28" },
    { key: "secStore", label: "Store / Vault", cls: "w-36" },
    { key: "secLastRotated", label: "Last Rotated", cls: "w-28" },
    { key: "secLastUsed", label: "Last Used", cls: "w-28" },
    { key: "secExposure", label: "Exposure", cls: "w-24" },
    { key: "status", label: "Status", cls: "w-24" },
    { key: "riskScore", label: "Risk", cls: "w-20" },
  ],
};

// ── Available columns superset per type ───────────────────────────────────────
// Everything a user can surface as a table column, including the richer
// attributes that otherwise live only in the side panel. The columns marked
// defaultOn are shown by default (they mirror the curated posture table); the
// rest are opt-in via the Columns chooser. Name and Risk are mandatory.

const CERT_AVAILABLE: ColDef[] = [
  { key: "name", label: "Common Name", cls: "min-w-[180px] flex-1", defaultOn: true },
  { key: "caIssuer", label: "CA / Issuer", cls: "w-32", defaultOn: true },
  { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32", defaultOn: true },
  { key: "expiryDate", label: "Valid To", cls: "w-24", defaultOn: true },
  { key: "daysToExpiry", label: "Expires In", cls: "w-20", defaultOn: true },
  { key: "status", label: "Status", cls: "w-24", defaultOn: true },
  { key: "certEndpoints", label: "Endpoints", cls: "w-20", defaultOn: true },
  { key: "certCompliance", label: "Compliance", cls: "w-28", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  // opt-in (from side panel)
  { key: "issueDate", label: "Valid From", cls: "w-24" },
  { key: "serial", label: "Serial Number", cls: "w-40" },
  { key: "certSigAlg", label: "Signature Algorithm", cls: "w-32" },
  { key: "certSubjectDN", label: "Subject DN", cls: "w-56" },
  { key: "certIssuerDN", label: "Issuer DN", cls: "w-56" },
  { key: "certSans", label: "Subject Alternative Names", cls: "w-56" },
  { key: "certKeyUsage", label: "Key Usage", cls: "w-40" },
  { key: "certEku", label: "Extended Key Usage", cls: "w-40" },
  { key: "certBasic", label: "Basic Constraints", cls: "w-28" },
  { key: "certSki", label: "Subject Key Identifier", cls: "w-40" },
  { key: "certAki", label: "Authority Key Identifier", cls: "w-40" },
  { key: "certThumb", label: "Thumbprint (SHA-256)", cls: "w-44" },
  { key: "pqcRisk", label: "PQC / Quantum Readiness", cls: "w-24" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "team", label: "Team", cls: "w-32" },
  { key: "environment", label: "Environment", cls: "w-24" },
  { key: "application", label: "Application", cls: "w-32" },
  { key: "infrastructure", label: "Infrastructure", cls: "w-32" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
  { key: "violations", label: "Violations", cls: "w-20" },
];

const K8S_AVAILABLE: ColDef[] = [
  { key: "name", label: "Workload", cls: "min-w-[180px] flex-1", defaultOn: true },
  { key: "application", label: "Namespace / App", cls: "w-36", defaultOn: true },
  { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32", defaultOn: true },
  { key: "expiryDate", label: "Valid To", cls: "w-24", defaultOn: true },
  { key: "daysToExpiry", label: "Expires In", cls: "w-20", defaultOn: true },
  { key: "status", label: "Status", cls: "w-24", defaultOn: true },
  { key: "certCompliance", label: "Compliance", cls: "w-28", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  { key: "caIssuer", label: "CA / Issuer", cls: "w-32" },
  { key: "serial", label: "Serial Number", cls: "w-40" },
  { key: "certSigAlg", label: "Signature Algorithm", cls: "w-32" },
  { key: "certSubjectDN", label: "Subject DN", cls: "w-56" },
  { key: "certIssuerDN", label: "Issuer DN", cls: "w-56" },
  { key: "certSans", label: "Subject Alternative Names", cls: "w-56" },
  { key: "certKeyUsage", label: "Key Usage", cls: "w-40" },
  { key: "certEku", label: "Extended Key Usage", cls: "w-40" },
  { key: "certThumb", label: "Thumbprint (SHA-256)", cls: "w-44" },
  { key: "pqcRisk", label: "PQC / Quantum Readiness", cls: "w-24" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "environment", label: "Environment", cls: "w-24" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const CS_AVAILABLE: ColDef[] = [
  { key: "name", label: "Cert Name", cls: "min-w-[180px] flex-1", defaultOn: true },
  { key: "caIssuer", label: "CA / Issuer", cls: "w-32", defaultOn: true },
  { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32", defaultOn: true },
  { key: "expiryDate", label: "Valid To", cls: "w-24", defaultOn: true },
  { key: "daysToExpiry", label: "Expires In", cls: "w-20", defaultOn: true },
  { key: "csStore", label: "Protection Store", cls: "w-32", defaultOn: true },
  { key: "status", label: "Status", cls: "w-24", defaultOn: true },
  { key: "certCompliance", label: "Compliance", cls: "w-28", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  { key: "serial", label: "Serial Number", cls: "w-40" },
  { key: "certSigAlg", label: "Signature Algorithm", cls: "w-32" },
  { key: "certIssuerDN", label: "Issuer DN", cls: "w-56" },
  { key: "certEku", label: "Extended Key Usage", cls: "w-40" },
  { key: "certThumb", label: "Thumbprint (SHA-256)", cls: "w-44" },
  { key: "pqcRisk", label: "PQC / Quantum Readiness", cls: "w-24" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const SSHKEY_AVAILABLE: ColDef[] = [
  { key: "name", label: "Key Name", cls: "min-w-[170px] flex-1", defaultOn: true },
  { key: "sshFingerprint", label: "Fingerprint", cls: "w-40", defaultOn: true },
  { key: "sshUsers", label: "Users", cls: "w-16", defaultOn: true },
  { key: "sshFiles", label: "File Paths", cls: "w-20", defaultOn: true },
  { key: "sshGroup", label: "Compliance Group", cls: "w-32", defaultOn: true },
  { key: "sshMgmt", label: "Status", cls: "w-24", defaultOn: true },
  { key: "sshRisk", label: "Risk Status", cls: "w-24", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  // opt-in
  { key: "algorithm", label: "Algorithm", cls: "w-24" },
  { key: "keyLength", label: "Bit Length", cls: "w-20" },
  { key: "sshAge", label: "Age", cls: "w-20" },
  { key: "sshClient", label: "Client Endpoints", cls: "w-44" },
  { key: "sshHost", label: "Host Endpoints", cls: "w-44" },
  { key: "lastRotated", label: "Last Rotated", cls: "w-28" },
  { key: "rotationFrequency", label: "Rotation Policy", cls: "w-28" },
  { key: "pqcRisk", label: "PQC", cls: "w-20" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "environment", label: "Environment", cls: "w-24" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const SSHCERT_AVAILABLE: ColDef[] = [
  { key: "name", label: "Cert ID / Name", cls: "min-w-[170px] flex-1", defaultOn: true },
  { key: "sshcAssocKey", label: "Associated Key", cls: "w-32", defaultOn: true },
  { key: "sshcPrincipals", label: "Principals", cls: "w-24", defaultOn: true },
  { key: "sshcSigningCA", label: "Signing CA", cls: "w-24", defaultOn: true },
  { key: "sshcKeyType", label: "Key Type", cls: "w-20", defaultOn: true },
  { key: "expiryDate", label: "Valid To", cls: "w-24", defaultOn: true },
  { key: "daysToExpiry", label: "Expires In", cls: "w-20", defaultOn: true },
  { key: "status", label: "Status", cls: "w-24", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  { key: "sshcKeyId", label: "Key ID", cls: "w-40" },
  { key: "algorithm", label: "Algorithm", cls: "w-24" },
  { key: "sshcExtensions", label: "Extensions", cls: "w-44" },
  { key: "sshcCritOpts", label: "Critical Options", cls: "w-40" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "environment", label: "Environment", cls: "w-24" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const ENC_AVAILABLE: ColDef[] = [
  { key: "name", label: "Key Name", cls: "min-w-[180px] flex-1", defaultOn: true },
  { key: "certAlgSize", label: "Algorithm / Size", cls: "w-32", defaultOn: true },
  { key: "encProtection", label: "Protection", cls: "w-24", defaultOn: true },
  { key: "encStore", label: "Store", cls: "w-36", defaultOn: true },
  { key: "encPurpose", label: "Purpose", cls: "w-24", defaultOn: true },
  { key: "lastRotated", label: "Last Rotated", cls: "w-28", defaultOn: true },
  { key: "pqcRisk", label: "PQC", cls: "w-20", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  { key: "encState", label: "Key State", cls: "w-24" },
  { key: "encExportable", label: "Exportable", cls: "w-24" },
  { key: "encCryptoperiod", label: "Cryptoperiod", cls: "w-28" },
  { key: "encWrappedBy", label: "Wrapped By", cls: "w-32" },
  { key: "rotationFrequency", label: "Rotation Policy", cls: "w-28" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "environment", label: "Environment", cls: "w-24" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const SEC_AVAILABLE: ColDef[] = [
  { key: "name", label: "Secret Name", cls: "min-w-[180px] flex-1", defaultOn: true },
  { key: "secretType", label: "Type", cls: "w-28", defaultOn: true },
  { key: "secStore", label: "Store / Vault", cls: "w-36", defaultOn: true },
  { key: "secLastRotated", label: "Last Rotated", cls: "w-28", defaultOn: true },
  { key: "secLastUsed", label: "Last Used", cls: "w-28", defaultOn: true },
  { key: "secExposure", label: "Exposure", cls: "w-24", defaultOn: true },
  { key: "status", label: "Status", cls: "w-24", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  { key: "secPath", label: "Secret Path", cls: "w-56" },
  { key: "secVersion", label: "Version", cls: "w-20" },
  { key: "secConsumers", label: "Consumers", cls: "w-40" },
  { key: "secNoExpiry", label: "Expiry", cls: "w-24" },
  { key: "rotationFrequency", label: "Rotation Policy", cls: "w-28" },
  { key: "owner", label: "Owner", cls: "w-32" },
  { key: "environment", label: "Environment", cls: "w-24" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const ALL_AVAILABLE: ColDef[] = [
  { key: "name", label: "Name", cls: "min-w-[180px] flex-1", defaultOn: true },
  { key: "type", label: "Type", cls: "w-36", defaultOn: true },
  { key: "keyAttribute", label: "Key Attribute", cls: "w-32", defaultOn: true },
  { key: "status", label: "Status", cls: "w-24", defaultOn: true },
  { key: "pqcRisk", label: "PQC", cls: "w-20", defaultOn: true },
  { key: "owner", label: "Owner", cls: "w-32", defaultOn: true },
  { key: "environment", label: "Env", cls: "w-24", defaultOn: true },
  { key: "violations", label: "Violations", cls: "w-20", defaultOn: true },
  { key: "riskScore", label: "Risk", cls: "w-20", defaultOn: true },
  { key: "algorithm", label: "Algorithm", cls: "w-24" },
  { key: "team", label: "Team", cls: "w-32" },
  { key: "application", label: "Application", cls: "w-32" },
  { key: "infrastructure", label: "Infrastructure", cls: "w-32" },
  { key: "discoverySource", label: "Discovery Source", cls: "w-32" },
];

const AVAILABLE_COLS: Record<string, ColDef[]> = {
  All: ALL_AVAILABLE,
  "TLS Certificate": CERT_AVAILABLE,
  "K8s Workload Cert": K8S_AVAILABLE,
  "Code-Signing Certificate": CS_AVAILABLE,
  "SSH Key": SSHKEY_AVAILABLE,
  "SSH Certificate": SSHCERT_AVAILABLE,
  "Encryption Key": ENC_AVAILABLE,
  "API Key / Secret": SEC_AVAILABLE,
};

// ── Derived field helpers ─────────────────────────────────────────────────────

function lastActivity(co: CryptoAsset): string {
  if (co.daysToExpiry >= 0 && co.daysToExpiry <= 90) return `Expires in ${co.daysToExpiry}d`;
  if (co.agentMeta?.lastActivity) return co.agentMeta.lastActivity;
  if (co.sshEndpoints?.[0]) return co.sshEndpoints[0].lastSeen.split(" ")[0];
  return co.lastRotated || "—";
}

function secretTypeFor(co: CryptoAsset): string {
  const n = co.name.toLowerCase();
  if (n.includes("stripe") || n.includes("payment")) return "Payment API Key";
  if (n.includes("github") || n.includes("pat")) return "Personal Access Token";
  if (n.includes("aws") || n.includes("iam")) return "Cloud IAM Key";
  if (n.includes("datadog") || n.includes("dd")) return "Monitoring API Key";
  return "API Key";
}

function exposedInFor(co: CryptoAsset): { label: string; color: string } {
  const tags = co.tags ?? [];
  if (tags.includes("source-code")) return { label: "Source Code", color: "text-coral" };
  if (tags.includes("orphaned")) return { label: "Orphaned", color: "text-amber" };
  return { label: "Not detected", color: "text-teal" };
}

function permRiskStyle(risk?: string): string {
  if (risk === "Over-privileged") return "text-coral";
  if (risk === "Right-sized") return "text-teal";
  return "text-muted-foreground";
}

function caTypeFor(caIssuer: string): string {
  if (/digicert|entrust|let.?s encrypt|sectigo|globalsign|comodo/i.test(caIssuer)) return "Public CA";
  if (/self.?sign/i.test(caIssuer)) return "Self-Signed";
  return "Private / Internal CA";
}

function signatureAlgoFor(algo: string): string {
  if (/rsa/i.test(algo)) return "SHA256withRSA";
  if (/ecc p-256|ecdsa/i.test(algo)) return "SHA256withECDSA";
  if (/ecc p-384/i.test(algo)) return "SHA384withECDSA";
  if (/ed25519/i.test(algo)) return "Ed25519";
  return algo;
}

function keyUsageFor(type: string): string {
  if (type === "TLS Certificate") return "Digital Signature, Key Encipherment";
  if (type === "Code-Signing Certificate") return "Digital Signature";
  if (type === "K8s Workload Cert") return "Digital Signature, Key Agreement";
  return "Digital Signature";
}

function extKeyUsageFor(type: string): string {
  if (type === "TLS Certificate") return "Server Authentication, Client Authentication";
  if (type === "Code-Signing Certificate") return "Code Signing (1.3.6.1.5.5.7.3.3)";
  return "—";
}

function privilegeLevelFor(co: CryptoAsset): string {
  const tags = co.tags ?? [];
  if (tags.includes("database") || tags.includes("bastion")) return "root";
  if (tags.includes("kubernetes")) return "admin";
  return "user";
}

// ── Inline primary action ─────────────────────────────────────────────────────

interface InlineAction {
  label: string;
  action: string;
  btnCls: string;
}

function getPrimaryAction(co: CryptoAsset): InlineAction | null {
  if (co.status === "Expired")
    return {
      label: "Renew",
      action: "renew",
      btnCls: "bg-coral/15 text-coral hover:bg-coral/25 border border-coral/25",
    };
  if (co.status === "Expiring")
    return { label: "Renew", action: "renew", btnCls: "bg-teal/15 text-teal hover:bg-teal/25 border border-teal/25" };
  if (co.status === "Orphaned" || co.owner === "Unassigned")
    return {
      label: "Assign",
      action: "assign",
      btnCls: "bg-amber/15 text-amber hover:bg-amber/25 border border-amber/25",
    };
  if (co.pqcRisk === "Critical")
    return {
      label: "PQC Ticket",
      action: "pqc",
      btnCls: "bg-purple/15 text-purple-light hover:bg-purple/25 border border-purple/25",
    };
  if (cryptoViolationCount(co) > 0)
    return { label: "Fix →", action: "fix", btnCls: "bg-amber/10 text-amber hover:bg-amber/20 border border-amber/20" };
  return null;
}

// ── Cell renderer ─────────────────────────────────────────────────────────────

function CellValue({ col, co }: { col: ColDef; co: CryptoAsset }) {
  const val = (co as unknown as Record<string, unknown>)[col.key];
  switch (col.key) {
    case "riskScore": {
      const s = crsScore(co);
      const c = s >= 80 ? "text-coral" : s >= 60 ? "text-amber" : s >= 30 ? "text-blue-400" : "text-teal";
      return <span className={`text-[11px] font-bold tabular-nums ${c}`}>{s}</span>;
    }
    case "name":
      return <span className="font-medium text-foreground truncate">{co.name}</span>;
    case "status":
      return <StatusBadge status={co.status} />;
    case "pqcRisk":
      return <PQCBadge risk={co.pqcRisk} />;
    case "environment":
      return <EnvBadge env={co.environment} />;
    case "daysToExpiry":
      return <DaysToExpiry days={co.daysToExpiry} />;
    case "autoRenewal":
      return (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${co.autoRenewal ? "bg-teal/10 text-teal" : "bg-muted text-muted-foreground"}`}
        >
          {co.autoRenewal ? "Yes" : "No"}
        </span>
      );
    case "violations":
      return cryptoViolationCount(co) > 0 ? (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral/15 text-coral text-[10px] font-bold">
          {cryptoViolationCount(co)}
        </span>
      ) : (
        <span className="text-muted-foreground/40 text-[10px]">—</span>
      );
    case "owner":
      return (
        <span className={co.owner === "Unassigned" ? "text-coral font-medium" : "text-muted-foreground"}>
          {co.owner}
        </span>
      );
    case "lastActivity":
      return <span className="text-muted-foreground">{lastActivity(co)}</span>;
    case "sshLastUsed":
      return <span className="text-muted-foreground">{co.sshEndpoints?.[0]?.lastSeen?.split(" ")[0] ?? "—"}</span>;
    case "sshHosts":
      return <span className="text-muted-foreground font-medium">{co.sshEndpoints?.length ?? 0}</span>;
    case "serial":
      return <span className="font-mono text-[10px] text-muted-foreground truncate">{co.serial}</span>;
    case "agentFw":
      return <span className="text-muted-foreground truncate">{co.agentMeta?.framework ?? "—"}</span>;
    case "actionsDay":
      return (
        <span className="text-muted-foreground tabular-nums">
          {co.agentMeta?.actionsPerDay?.toLocaleString() ?? "—"}
        </span>
      );
    case "permRisk":
      return (
        <span className={`text-[10px] font-medium ${permRiskStyle(co.agentMeta?.permissionRisk)}`}>
          {co.agentMeta?.permissionRisk ?? "—"}
        </span>
      );
    case "secretType":
      return <span className="text-muted-foreground">{secretTypeFor(co)}</span>;
    case "exposedIn": {
      const ei = exposedInFor(co);
      return <span className={`text-[10px] font-medium ${ei.color}`}>{ei.label}</span>;
    }
    // ── Shared cert cells ──
    case "certAlgSize":
      return (
        <span className="text-muted-foreground text-[11px]">
          {co.algorithm} / {co.keyLength}
        </span>
      );
    case "certEndpoints":
      return <span className="tabular-nums text-foreground font-medium">{co.cert?.endpoints?.length ?? 0}</span>;
    case "certCompliance": {
      const cc = co.cert?.complianceStatus;
      if (!cc) return <span className="text-muted-foreground text-[10px]">-</span>;
      return (
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cc === "Compliant" ? "text-teal bg-teal/10" : "text-coral bg-coral/10"}`}
        >
          {cc}
        </span>
      );
    }
    case "csStore":
      return <span className="text-[10px] text-muted-foreground truncate">{co.infrastructure}</span>;
    // ── SSH key cells ──
    case "sshFingerprint":
      return (
        <span className="font-mono text-[10px] text-muted-foreground truncate">
          {co.sshKey?.fingerprint ?? co.serial}
        </span>
      );
    case "sshUsers":
      return (
        <span className="tabular-nums text-foreground font-medium">{co.sshKey?.associatedUsers?.length ?? 0}</span>
      );
    case "sshFiles":
      return <span className="tabular-nums text-muted-foreground">{co.sshKey?.filePaths?.length ?? 0}</span>;
    case "sshGroup":
      return <span className="text-[10px] text-muted-foreground truncate">{co.sshKey?.complianceGroup ?? "-"}</span>;
    case "sshMgmt": {
      // Posture status only (monitoring-only product). Active, or Key Missing if
      // the key was seen before but absent in the latest scan.
      const st = co.status === "Orphaned" || co.status === "Revoked" ? "Key Missing" : "Active";
      return (
        <span className={`text-[10px] font-medium ${st === "Key Missing" ? "text-amber" : "text-teal"}`}>{st}</span>
      );
    }
    case "sshRisk": {
      const rs = co.sshKey?.riskStatus ?? "Clean";
      return (
        <span className={`text-[10px] font-medium ${rs === "Clean" ? "text-muted-foreground" : "text-coral"}`}>
          {rs}
        </span>
      );
    }
    // ── SSH cert cells ──
    case "sshcAssocKey":
      return <span className="font-mono text-[10px] text-teal truncate">{co.sshCert?.associatedKeyName ?? "-"}</span>;
    case "sshcPrincipals": {
      const ps = co.sshCert?.principals ?? [];
      return (
        <span className="text-[10px] text-foreground">
          {ps[0] ?? "-"}
          {ps.length > 1 && (
            <span className="ml-1 px-1 rounded bg-secondary text-muted-foreground">+{ps.length - 1}</span>
          )}
        </span>
      );
    }
    case "sshcSigningCA":
      return <span className="text-[10px] text-muted-foreground truncate">{co.sshCert?.signingCA ?? co.caIssuer}</span>;
    case "sshcKeyType":
      return <span className="text-[10px] text-foreground">{co.sshCert?.keyType ?? "User"}</span>;
    // ── Encryption key cells ──
    case "encProtection":
      return (
        <span
          className={`text-[10px] font-medium ${co.encKey?.protection === "Software" ? "text-coral" : co.encKey?.protection === "HSM" ? "text-teal" : "text-foreground"}`}
        >
          {co.encKey?.protection ?? "Software"}
        </span>
      );
    case "encStore":
      return <span className="text-[10px] text-muted-foreground truncate">{co.encKey?.store ?? co.caIssuer}</span>;
    case "encPurpose":
      return <span className="text-[10px] text-muted-foreground">{co.encKey?.purpose ?? "-"}</span>;
    // ── Secret cells ──
    case "secStore":
      return <span className="text-[10px] text-muted-foreground truncate">{co.secret?.store ?? co.caIssuer}</span>;
    case "secLastRotated":
      return <span className="text-muted-foreground">{co.lastRotated}</span>;
    case "secLastUsed":
      return <span className="text-muted-foreground">{co.secret?.lastUsed ?? "-"}</span>;
    case "secExposure": {
      const ex = co.secret?.exposure ?? "Not detected";
      return (
        <span className={`text-[10px] font-medium ${ex === "Not detected" ? "text-teal" : "text-coral"}`}>{ex}</span>
      );
    }
    // ── All Identities adaptive Key Attribute ──
    case "keyAttribute": {
      if (co.type === "API Key / Secret")
        return <span className="text-muted-foreground text-[10px]">Used {co.secret?.lastUsed ?? co.lastRotated}</span>;
      if (co.type === "SSH Key")
        return (
          <span className="text-muted-foreground text-[10px]">
            {co.sshKey?.ageDays != null ? co.sshKey.ageDays + "d old" : co.lastRotated}
          </span>
        );
      if (co.type === "Encryption Key")
        return <span className="text-muted-foreground text-[10px]">{co.encKey?.protection ?? "Software"}</span>;
      return <DaysToExpiry days={co.daysToExpiry} />;
    }
    // ── Cert opt-in (panel-derived) cells ──
    case "certSigAlg":
      return <span className="text-[10px] text-muted-foreground">{signatureAlgoFor(co.algorithm)}</span>;
    case "certSubjectDN":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">
          {co.cert
            ? `CN=${co.commonName}, O=${co.cert.subjectO ?? "AcmeCorp"}, C=${co.cert.subjectC ?? "US"}`
            : `CN=${co.commonName}`}
        </span>
      );
    case "certIssuerDN":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">
          {co.cert?.issuerDN ?? co.caIssuer}
        </span>
      );
    case "certSans":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">
          {co.cert?.sans?.join(", ") ?? "-"}
        </span>
      );
    case "certKeyUsage":
      return <span className="text-[10px] text-muted-foreground truncate">{co.cert?.keyUsage?.join(", ") ?? "-"}</span>;
    case "certEku":
      return (
        <span className="text-[10px] text-muted-foreground truncate">
          {co.cert?.extendedKeyUsage?.join(", ") ?? "-"}
        </span>
      );
    case "certBasic":
      return <span className="text-[10px] text-muted-foreground">{co.cert?.basicConstraints ?? "-"}</span>;
    case "certSki":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">{co.cert?.subjectKeyId ?? "-"}</span>
      );
    case "certAki":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">{co.cert?.authorityKeyId ?? "-"}</span>
      );
    case "certThumb":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">{co.cert?.thumbprint ?? "-"}</span>
      );
    // ── SSH key opt-in cells ──
    case "sshAge":
      return (
        <span className="text-[10px] text-muted-foreground">
          {co.sshKey?.ageDays != null ? `${co.sshKey.ageDays}d` : "-"}
        </span>
      );
    case "sshClient":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">
          {co.sshKey?.clientEndpoints?.join(", ") ?? "-"}
        </span>
      );
    case "sshHost":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">
          {co.sshKey?.hostEndpoints?.join(", ") ?? "-"}
        </span>
      );
    // ── SSH cert opt-in cells ──
    case "sshcKeyId":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">{co.sshCert?.keyId ?? co.serial}</span>
      );
    case "sshcExtensions":
      return (
        <span className="text-[10px] text-muted-foreground truncate">{co.sshCert?.extensions?.join(", ") ?? "-"}</span>
      );
    case "sshcCritOpts":
      return (
        <span className="text-[10px] text-muted-foreground truncate">
          {co.sshCert?.criticalOptions?.join(", ") || "none"}
        </span>
      );
    // ── Enc key opt-in cells ──
    case "encState":
      return (
        <span className={`text-[10px] font-medium ${co.encKey?.keyState === "Disabled" ? "text-amber" : "text-teal"}`}>
          {co.encKey?.keyState ?? "Enabled"}
        </span>
      );
    case "encExportable":
      return (
        <span className={`text-[10px] font-medium ${co.encKey?.exportable ? "text-coral" : "text-teal"}`}>
          {co.encKey?.exportable ? "Yes" : "No"}
        </span>
      );
    case "encCryptoperiod":
      return <span className="text-[10px] text-muted-foreground">{co.encKey?.cryptoperiod ?? "-"}</span>;
    case "encWrappedBy":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">{co.encKey?.wrappedBy ?? "-"}</span>
      );
    // ── Secret opt-in cells ──
    case "secPath":
      return (
        <span className="font-mono text-[9.5px] text-muted-foreground truncate">
          {co.secret?.secretPath ?? co.serial}
        </span>
      );
    case "secVersion":
      return <span className="text-[10px] text-muted-foreground">{co.secret?.version ?? "-"}</span>;
    case "secConsumers":
      return (
        <span className="text-[10px] text-muted-foreground truncate">{co.secret?.consumers?.join(", ") ?? "-"}</span>
      );
    case "secNoExpiry":
      return (
        <span className={`text-[10px] font-medium ${co.secret?.noExpiry ? "text-amber" : "text-foreground"}`}>
          {co.secret?.noExpiry ? "No expiry" : co.expiryDate}
        </span>
      );
    // ── Shared opt-in cells ──
    case "team":
      return <span className="text-[10px] text-muted-foreground truncate">{co.team}</span>;
    case "application":
      return <span className="text-[10px] text-muted-foreground truncate">{co.application}</span>;
    case "infrastructure":
      return <span className="text-[10px] text-muted-foreground truncate">{co.infrastructure}</span>;
    case "discoverySource":
      return <span className="text-[10px] text-muted-foreground truncate">{co.discoverySource}</span>;
    case "keyLength":
      return <span className="text-[10px] text-muted-foreground">{co.keyLength}</span>;
    case "algorithm":
      return <span className="text-[10px] text-muted-foreground">{co.algorithm}</span>;
    case "issueDate":
      return <span className="text-muted-foreground">{co.issueDate}</span>;
    case "lastRotated":
      return <span className="text-muted-foreground">{co.lastRotated}</span>;
    case "rotationFrequency":
      return (
        <span className={`text-[10px] ${co.rotationFrequency === "Never" ? "text-coral" : "text-muted-foreground"}`}>
          {co.rotationFrequency}
        </span>
      );
    case "caIssuer":
      return <span className="text-[10px] text-muted-foreground truncate">{co.caIssuer}</span>;
    default:
      return <span className="text-muted-foreground truncate">{val != null && val !== "" ? String(val) : "—"}</span>;
  }
}

// ── Metadata row ──────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-border/30 last:border-0 items-start">
      <span className="text-[11px] text-muted-foreground leading-tight pt-0.5">{label}</span>
      <span className="text-[11px] text-foreground font-medium break-words leading-tight">{value}</span>
    </div>
  );
}

// ── Risk score row ────────────────────────────────────────────────────────────

// ── Derive violations from real data ─────────────────────────────────────────

interface ViolationItem {
  label: string;
  severity: "critical" | "high" | "medium";
  action?: string;
  actionKey?: string;
}

function deriveViolations(co: CryptoAsset): { policy: ViolationItem[]; quantum: ViolationItem[] } {
  const policy: ViolationItem[] = [];
  const quantum: ViolationItem[] = [];

  // ── POLICY violations (real policy breaches; eligible for exceptions) ──
  if (co.environment === "Production" && co.caIssuer === "Self-Signed")
    policy.push({ label: "Self-signed certificate in production", severity: "high" });

  if (["RSA-512", "RSA-1024", "SHA-1", "MD5"].includes(co.algorithm))
    policy.push({ label: `Weak algorithm (${co.algorithm})`, severity: "critical" });

  // ── QUANTUM violations (policy violation; eligible for exceptions) ──
  const isPqc = [
    "RSA-1024",
    "RSA-2048",
    "RSA-4096",
    "ECDSA-P256",
    "ECDSA-P384",
    "ECC P-256",
    "ECC P-384",
    "SHA-1",
    "MD5",
    "DH-1024",
    "DH-2048",
  ].includes(co.algorithm);
  if (isPqc) {
    const expYear = co.expiryDate && co.expiryDate !== "N/A" ? new Date(co.expiryDate).getFullYear() : 0;
    const yearsPast = expYear > 0 ? Math.max(0, expYear - 2030) : 0;
    quantum.push({
      label: `${co.algorithm} is quantum-vulnerable (NIST deprecated)${expYear > 0 ? ` · Expires ${expYear}${yearsPast > 0 ? ` — ${yearsPast}yr past deadline` : " — at NIST 2030 deadline"}` : ""}`,
      severity: co.pqcRisk === "Critical" ? "critical" : "high",
    });
  }

  return { policy, quantum };
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
      {label}
      {count !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${count > 0 ? "bg-coral/15 text-coral" : "bg-secondary text-muted-foreground"}`}
        >
          {count}
        </span>
      )}
    </p>
  );
}

// ── Type-specific metadata ────────────────────────────────────────────────────

function TypeMetadata({ co }: { co: CryptoAsset }) {
  // Type-specific posture detail. Reads the real data model; falls back only
  // where a field is genuinely absent. Validity, quantum readiness, and
  // discovery provenance are first-class for every relevant type.
  const c = co.cert,
    sk = co.sshKey,
    sc = co.sshCert,
    ek = co.encKey,
    se = co.secret;
  const validity = `${co.issueDate}  ->  ${co.expiryDate}`;
  const expiresIn =
    co.daysToExpiry < 0 ? (
      <span className="text-coral">{Math.abs(co.daysToExpiry)} days ago</span>
    ) : (
      <span className={co.daysToExpiry <= 30 ? "text-amber" : "text-foreground"}>{co.daysToExpiry} days</span>
    );
  const quantum = (
    <span className={co.pqcRisk === "Safe" ? "text-teal" : co.pqcRisk === "Low" ? "text-foreground" : "text-coral"}>
      {co.pqcRisk === "Safe"
        ? "Quantum-safe"
        : co.pqcRisk === "Low"
          ? "Low exposure"
          : `Quantum-vulnerable (${co.pqcRisk})`}
    </span>
  );

  if (co.type === "TLS Certificate" || co.type === "K8s Workload Cert") {
    const subjectDN = c
      ? `CN=${co.commonName}, O=${c.subjectO ?? "AcmeCorp"}${c.subjectOU ? ", OU=" + c.subjectOU : ""}, C=${c.subjectC ?? "US"}`
      : `CN=${co.commonName}, O=AcmeCorp, C=US`;
    const selfSigned = c?.issuerDN ? c.issuerDN.includes(co.commonName) : false;
    return (
      <>
        <MetaRow label="Subject DN" value={<span className="font-mono text-[10px] break-all">{subjectDN}</span>} />
        <MetaRow
          label="Issuer DN"
          value={<span className="font-mono text-[10px] break-all">{c?.issuerDN ?? `CN=${co.caIssuer}`}</span>}
        />
        {selfSigned && <MetaRow label="Trust" value={<span className="text-coral">Self-signed (untrusted)</span>} />}
        <MetaRow label="Serial number" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Signature algorithm" value={signatureAlgoFor(co.algorithm)} />
        <MetaRow label="Key algorithm / size" value={`${co.algorithm} · ${co.keyLength} bits`} />
        <MetaRow label="Validity period" value={validity} />
        <MetaRow label="Expires in" value={expiresIn} />
        <MetaRow label="Quantum readiness" value={quantum} />
        {c?.sans && c.sans.length > 0 && (
          <MetaRow
            label="Subject Alternative Names"
            value={
              <div className="flex flex-wrap gap-1">
                {c.sans.map((s) => (
                  <span
                    key={s}
                    className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            }
          />
        )}
        {c?.keyUsage && <MetaRow label="Key usage" value={c.keyUsage.join(", ")} />}
        {c?.extendedKeyUsage && <MetaRow label="Extended key usage" value={c.extendedKeyUsage.join(", ")} />}
        {c?.basicConstraints && <MetaRow label="Basic constraints" value={c.basicConstraints} />}
        {c?.subjectKeyId && (
          <MetaRow
            label="Subject key identifier"
            value={<span className="font-mono text-[10px] break-all">{c.subjectKeyId}</span>}
          />
        )}
        {c?.authorityKeyId && (
          <MetaRow
            label="Authority key identifier"
            value={<span className="font-mono text-[10px] break-all">{c.authorityKeyId}</span>}
          />
        )}
        {c?.thumbprint && (
          <MetaRow
            label="Thumbprint (SHA-256)"
            value={<span className="font-mono text-[10px] break-all">{c.thumbprint}</span>}
          />
        )}
        {c?.complianceStatus && (
          <MetaRow
            label="Compliance"
            value={
              <span className={c.complianceStatus === "Compliant" ? "text-teal" : "text-coral"}>
                {c.complianceStatus}
              </span>
            }
          />
        )}
        {c?.endpoints && c.endpoints.length > 0 && (
          <MetaRow
            label={`Deployed endpoints (${c.endpoints.length})`}
            value={
              <div className="space-y-1">
                {c.endpoints.slice(0, 6).map((e, i) => (
                  <div key={i} className="text-[10px]">
                    <span className="font-mono text-foreground">{e.host}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {e.ip}:{e.port}
                    </span>
                  </div>
                ))}
              </div>
            }
          />
        )}
        <MetaRow label="Discovery source" value={co.discoverySource} />
        <MetaRow label="First seen / last seen" value={`${co.issueDate}  ·  ${co.lastRotated}`} />
      </>
    );
  }

  if (co.type === "Code-Signing Certificate") {
    return (
      <>
        <MetaRow label="Subject" value={co.commonName} />
        <MetaRow
          label="Issuer DN"
          value={<span className="font-mono text-[10px] break-all">{c?.issuerDN ?? `CN=${co.caIssuer}`}</span>}
        />
        <MetaRow label="Serial number" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow label="Signature algorithm" value={signatureAlgoFor(co.algorithm)} />
        <MetaRow label="Key algorithm / size" value={`${co.algorithm} · ${co.keyLength} bits`} />
        <MetaRow label="Extended key usage" value={c?.extendedKeyUsage?.join(", ") ?? "Code Signing"} />
        {c?.thumbprint && (
          <MetaRow
            label="Thumbprint (SHA-256)"
            value={<span className="font-mono text-[10px] break-all">{c.thumbprint}</span>}
          />
        )}
        <MetaRow label="Protection store" value={co.infrastructure} />
        <MetaRow label="Validity period" value={validity} />
        <MetaRow label="Expires in" value={expiresIn} />
        <MetaRow label="Quantum readiness" value={quantum} />
        {c?.complianceStatus && (
          <MetaRow
            label="Compliance"
            value={
              <span className={c.complianceStatus === "Compliant" ? "text-teal" : "text-coral"}>
                {c.complianceStatus}
              </span>
            }
          />
        )}
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === "SSH Key") {
    const posture = co.status === "Orphaned" || co.status === "Revoked" ? "Key Missing" : "Active";
    return (
      <>
        <MetaRow
          label="Fingerprint"
          value={<span className="font-mono text-[10px] break-all">{sk?.fingerprint ?? co.serial}</span>}
        />
        <MetaRow label="Algorithm / bit length" value={`${co.algorithm} · ${co.keyLength} bits`} />
        <MetaRow
          label="Status"
          value={<span className={posture === "Key Missing" ? "text-amber" : "text-teal"}>{posture}</span>}
        />
        {sk?.riskStatus && sk.riskStatus !== "Clean" && (
          <MetaRow label="Risk status" value={<span className="text-coral font-medium">{sk.riskStatus}</span>} />
        )}
        {sk?.ageDays != null && <MetaRow label="Age" value={`${sk.ageDays} days`} />}
        {sk?.complianceGroup && <MetaRow label="Compliance group" value={sk.complianceGroup} />}
        <MetaRow
          label="Rotation policy"
          value={
            <span className={co.rotationFrequency === "Never" ? "text-coral" : "text-foreground"}>
              {co.rotationFrequency}
            </span>
          }
        />
        {sk?.associatedUsers && sk.associatedUsers.length > 0 && (
          <MetaRow
            label={`Associated users (${sk.associatedUsers.length})`}
            value={
              <div className="space-y-0.5">
                {sk.associatedUsers.map((u, i) => (
                  <div key={i} className="font-mono text-[10px]">
                    <span className="text-foreground">{u.user}</span>
                    <span className="text-muted-foreground"> @ {u.ip}</span>
                  </div>
                ))}
              </div>
            }
          />
        )}
        {sk?.clientEndpoints && sk.clientEndpoints.length > 0 && (
          <MetaRow
            label="Client endpoints (private key)"
            value={
              <div className="space-y-0.5">
                {sk.clientEndpoints.map((h, i) => (
                  <div key={i} className="font-mono text-[10px] text-foreground">
                    {h}
                  </div>
                ))}
              </div>
            }
          />
        )}
        {sk?.hostEndpoints && sk.hostEndpoints.length > 0 && (
          <MetaRow
            label="Host endpoints (authorized)"
            value={
              <div className="space-y-0.5">
                {sk.hostEndpoints.map((h, i) => (
                  <div key={i} className="font-mono text-[10px] text-foreground">
                    {h}
                  </div>
                ))}
              </div>
            }
          />
        )}
        {sk?.filePaths && sk.filePaths.length > 0 && (
          <MetaRow
            label={`File paths (${sk.filePaths.length})`}
            value={
              <div className="space-y-0.5">
                {sk.filePaths.map((p, i) => (
                  <div key={i} className="font-mono text-[9.5px] text-muted-foreground break-all">
                    {p}
                  </div>
                ))}
              </div>
            }
          />
        )}
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === "SSH Certificate") {
    return (
      <>
        <MetaRow
          label="Key ID"
          value={<span className="font-mono text-[10px] break-all">{sc?.keyId ?? co.serial}</span>}
        />
        <MetaRow label="Key type" value={sc?.keyType ?? "User"} />
        <MetaRow label="Signing CA" value={sc?.signingCA ?? co.caIssuer} />
        <MetaRow label="Algorithm / size" value={`${co.algorithm} · ${co.keyLength} bits`} />
        {sc?.associatedKeyName && (
          <MetaRow
            label="Associated SSH key"
            value={<span className="font-mono text-[10px]">{sc.associatedKeyName}</span>}
          />
        )}
        {sc?.principals && sc.principals.length > 0 && (
          <MetaRow
            label={`Principals (${sc.principals.length})`}
            value={
              <div className="flex flex-wrap gap-1">
                {sc.principals.map((p) => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground">
                    {p}
                  </span>
                ))}
              </div>
            }
          />
        )}
        {sc?.extensions && sc.extensions.length > 0 && <MetaRow label="Extensions" value={sc.extensions.join(", ")} />}
        <MetaRow
          label="Critical options"
          value={sc?.criticalOptions && sc.criticalOptions.length > 0 ? sc.criticalOptions.join(", ") : "none"}
        />
        <MetaRow label="Validity period" value={validity} />
        <MetaRow label="Expires in" value={expiresIn} />
        <MetaRow label="Quantum readiness" value={quantum} />
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === "Encryption Key") {
    return (
      <>
        <MetaRow label="Key identifier" value={<span className="font-mono text-[10px] break-all">{co.serial}</span>} />
        <MetaRow
          label="Protection"
          value={
            <span className={ek?.protection === "Software" ? "text-coral" : "text-foreground"}>
              {ek?.protection ?? "Software"}
            </span>
          }
        />
        <MetaRow label="Key store" value={ek?.store ?? co.caIssuer} />
        <MetaRow label="Algorithm / size" value={`${co.algorithm} · ${co.keyLength} bits`} />
        {ek?.purpose && <MetaRow label="Purpose" value={ek.purpose} />}
        <MetaRow
          label="Key state"
          value={
            <span className={ek?.keyState === "Disabled" ? "text-amber" : "text-teal"}>
              {ek?.keyState ?? "Enabled"}
            </span>
          }
        />
        {ek?.exportable != null && (
          <MetaRow
            label="Exportable"
            value={
              <span className={ek.exportable ? "text-coral" : "text-teal"}>{ek.exportable ? "Yes (risk)" : "No"}</span>
            }
          />
        )}
        {ek?.cryptoperiod && <MetaRow label="Cryptoperiod" value={ek.cryptoperiod} />}
        {ek?.wrappedBy && (
          <MetaRow label="Wrapped by" value={<span className="font-mono text-[10px]">{ek.wrappedBy}</span>} />
        )}
        <MetaRow label="Quantum readiness" value={quantum} />
        <MetaRow
          label="Rotation policy"
          value={
            <span className={co.rotationFrequency === "Never" ? "text-coral" : "text-foreground"}>
              {co.rotationFrequency}
            </span>
          }
        />
        <MetaRow label="Created / last rotated" value={`${co.issueDate}  ·  ${co.lastRotated}`} />
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  if (co.type === "API Key / Secret") {
    const stale = co.rotationFrequency === "Never" || (se?.lastUsed != null && se.lastUsed < "2025-06-01");
    return (
      <>
        <MetaRow
          label="Secret path"
          value={<span className="font-mono text-[10px] break-all">{se?.secretPath ?? co.serial}</span>}
        />
        <MetaRow label="Secret store" value={se?.store ?? co.caIssuer} />
        <MetaRow label="Secret type" value={se?.secretType ?? secretTypeFor(co)} />
        {se?.version && <MetaRow label="Version" value={se.version} />}
        <MetaRow
          label="Exposure"
          value={
            <span className={se?.exposure && se.exposure !== "Not detected" ? "text-coral" : "text-teal"}>
              {se?.exposure ?? "Not detected"}
            </span>
          }
        />
        {se?.lastUsed && (
          <MetaRow
            label="Last used"
            value={<span className={stale ? "text-amber" : "text-foreground"}>{se.lastUsed}</span>}
          />
        )}
        <MetaRow
          label="Last rotated"
          value={<span className={stale ? "text-amber" : "text-foreground"}>{co.lastRotated}</span>}
        />
        <MetaRow
          label="Rotation policy"
          value={
            <span className={co.rotationFrequency === "Never" ? "text-coral" : "text-foreground"}>
              {co.rotationFrequency}
            </span>
          }
        />
        <MetaRow
          label="Expiry"
          value={se?.noExpiry ? <span className="text-amber">No expiry set (risk)</span> : co.expiryDate}
        />
        {se?.consumers && se.consumers.length > 0 && <MetaRow label="Consumers" value={se.consumers.join(", ")} />}
        <MetaRow label="Created / first seen" value={co.issueDate} />
        <MetaRow label="Discovery source" value={co.discoverySource} />
      </>
    );
  }

  return null;
}

// ── Secrets upsell ────────────────────────────────────────────────────────────

// ── Side panel (38%) ──────────────────────────────────────────────────────────

function DetailPanel({
  co,
  onClose,
  onTicket,
  assoc,
  onOpenRiskDrawer,
  onDeploy,
  setFilters,
  setCurrentPage,
}: {
  co: CryptoAsset;
  onClose: () => void;
  onTicket: (a: string) => void;
  assoc: typeof mockITAssets;
  onOpenRiskDrawer: () => void;
  onDeploy: () => void;
  setFilters: (f: Record<string, string>) => void;
  setCurrentPage: (p: string) => void;
}) {
  const isPqc = [
    "RSA-1024",
    "RSA-2048",
    "RSA-4096",
    "ECDSA-P256",
    "ECDSA-P384",
    "ECC P-256",
    "ECC P-384",
    "SHA-1",
    "MD5",
    "DH-1024",
    "DH-2048",
  ].includes(co.algorithm);
  const isSecret = co.type === "API Key / Secret";

  // Single source of truth: real CRS engine (spec factors 31/24/19/15/11).
  const crsResult = computeCRS(co);
  const riskScore = crsResult.crs;
  const crsFactors = crsResult.factors;
  const crsTotalW = crsFactors.reduce((sw, fac) => sw + fac.weight, 0);
  const riskCol = riskScore >= 60 ? "text-coral" : riskScore >= 30 ? "text-amber" : "text-teal";
  const [explainOpen, setExplainOpen] = useState(false);

  const { policy, quantum } = deriveViolations(co);
  const rawViolations = policy.length + quantum.length;
  const { activeForObject, isExcepted } = useExceptions();
  const exceptedCount = activeForObject(co.id).length;
  const totalViolations = effectiveViolations(rawViolations, exceptedCount);
  const shownPolicyViolations = effectiveViolations((co as any).policyViolations ?? 0, exceptedCount);
  const parentAsset = (co as any).host || co.application || co.infrastructure;
  const [exceptCtx, setExceptCtx] = useState<{ policyId: string; policyName: string } | null>(null);
  const objectTicket = ticketForObject(co.id);

  const expiryDisplay =
    co.daysToExpiry >= 0
      ? co.daysToExpiry === 0
        ? "Today"
        : `${co.daysToExpiry}d`
      : co.daysToExpiry === -1
        ? "No expiry"
        : `${Math.abs(co.daysToExpiry)}d ago`;
  const expiryCol =
    co.daysToExpiry >= 0 && co.daysToExpiry <= 7
      ? "text-coral"
      : co.daysToExpiry >= 0 && co.daysToExpiry <= 30
        ? "text-amber"
        : "text-foreground";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[38%] bg-card border-l border-border shadow-2xl h-full flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-secondary/30">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-semibold text-foreground truncate">{co.name}</p>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded flex-shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">
            {co.type} · {co.environment} · {co.application}
          </p>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={co.status} />
            {isPqc && <PQCBadge risk={co.pqcRisk} />}
          </div>

          {/* Risk-forward header: a real gauge + factor bars, not three flat tiles. */}
          <div className="mt-3 bg-card rounded-lg border border-border/50 p-3">
            <div className="flex items-center gap-3">
              {/* Semicircle gauge */}
              <div className="relative flex-shrink-0" style={{ width: 92, height: 56 }}>
                <svg viewBox="0 0 100 60" className="w-[92px] h-[56px]">
                  <path
                    d="M 8 54 A 42 42 0 0 1 92 54"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 8 54 A 42 42 0 0 1 92 54"
                    fill="none"
                    stroke={
                      riskScore >= 80
                        ? "hsl(var(--coral))"
                        : riskScore >= 60
                          ? "hsl(var(--coral))"
                          : riskScore >= 30
                            ? "hsl(var(--amber))"
                            : "hsl(var(--teal))"
                    }
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(riskScore / 100) * 132} 132`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
                  <span className={`text-[22px] font-bold tabular-nums leading-none ${riskCol}`}>{riskScore}</span>
                </div>
              </div>
              {/* Band + explain */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[12px] font-semibold ${riskCol}`}>
                    {riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 30 ? "Medium" : "Low"} risk
                  </span>
                  <span className="text-[10px] text-muted-foreground">CRS</span>
                  <button
                    onClick={() => setExplainOpen((v) => !v)}
                    className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-teal transition-colors"
                  >
                    <Info className="w-3 h-3" /> Explain
                    {explainOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                  {totalViolations > 0 ? (
                    <>
                      <span className="text-coral font-medium">
                        {totalViolations} active violation{totalViolations !== 1 ? "s" : ""}
                      </span>
                      {exceptedCount > 0 && <span className="text-amber"> · {exceptedCount} excepted</span>}
                    </>
                  ) : rawViolations > 0 ? (
                    <span className="text-amber">
                      {rawViolations} violation{rawViolations !== 1 ? "s" : ""} · all excepted
                    </span>
                  ) : (
                    <span className="text-teal">No policy violations</span>
                  )}
                </p>
              </div>
            </div>

            {/* Factor breakdown, collapsible; opens on Explain. */}
            {explainOpen && (
              <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2">
                {crsFactors.map((fac) => {
                  const contrib = Math.round(fac.raw * (fac.weight / crsTotalW));
                  const pct = Math.min(100, fac.raw);
                  return (
                    <div key={fac.id} className="flex items-center gap-2" title={fac.why}>
                      <span className="text-[9.5px] text-muted-foreground capitalize w-[88px] flex-shrink-0 truncate">
                        {fac.label}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              fac.raw >= 70
                                ? "hsl(var(--coral))"
                                : fac.raw >= 40
                                  ? "hsl(var(--amber))"
                                  : "hsl(var(--teal))",
                          }}
                        />
                      </div>
                      <span className="text-[9px] tabular-nums text-muted-foreground/70 w-[64px] text-right flex-shrink-0">
                        +{contrib} ({Math.round((fac.weight / crsTotalW) * 100)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/40">
          {/* Actions */}
          {(() => {
            const hasPolicyViol = policy.length > 0;

            return (
              <div className="px-4 py-3">
                <SectionHeading label="Actions" />
                <div className="flex flex-wrap gap-1.5">
                  {hasPolicyViol && (
                    <button
                      onClick={() => onTicket("fix")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors"
                    >
                      <Ticket className="w-3 h-3" /> Raise remediation ticket
                    </button>
                  )}
                  {isPqc && (
                    <button
                      onClick={() => onTicket("pqc")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors"
                    >
                      <Atom className="w-3 h-3" /> Raise PQC ticket
                    </button>
                  )}
                  {!hasPolicyViol && !isPqc && (
                    <span className="text-[10px] text-muted-foreground">No policy violations. No action required.</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Type-specific details */}
          <div className="px-4 py-3">
            <SectionHeading
              label={
                co.type === "TLS Certificate"
                  ? "Certificate details"
                  : co.type === "SSH Key"
                    ? "Key details"
                    : co.type === "SSH Certificate"
                      ? "Certificate details"
                      : co.type === "Code-Signing Certificate"
                        ? "Certificate details"
                        : co.type === "K8s Workload Cert"
                          ? "Workload details"
                          : co.type === "Encryption Key"
                            ? "Key details"
                            : "Secret details"
              }
            />
            <TypeMetadata co={co} />
          </div>

          {/* Owner: one inline field. Not a section. */}
          <div className="px-4 py-2 flex items-center gap-2 text-[10.5px]">
            <span className="text-muted-foreground">Owner</span>
            <span className={co.owner === "Unassigned" ? "text-coral" : "text-foreground"}>{co.owner}</span>
          </div>

          {/* Violations, single unified list (policy + quantum), all policy-driven */}
          {policy.length + quantum.length > 0 && (
            <div className="px-4 py-3">
              <SectionHeading label="Violations & alerts" count={policy.length + quantum.length} />
              <div className="space-y-1.5">
                {/* Policy + quantum: traceable to a policy, eligible for ticket or exception */}
                {[
                  ...policy.map((v) => ({ v, kind: "policy" as const })),
                  ...quantum.map((v) => ({ v, kind: "quantum" as const })),
                ].map(({ v, kind }, i) => {
                  const mapped = violationToPolicy(v.label, co);
                  const policyId = mapped?.policyId;
                  const excepted = policyId ? isExcepted(co.id, policyId) : false;
                  const ticket = objectTicket && policyId ? objectTicket : undefined;
                  return (
                    <div
                      key={`pv-${i}`}
                      className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${kind === "quantum" ? "bg-purple/60" : v.severity === "critical" ? "bg-coral" : v.severity === "high" ? "bg-amber" : "bg-muted-foreground"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-foreground">{v.label}</span>
                          {kind === "quantum" && (
                            <span className="text-[8.5px] px-1 py-0.5 rounded bg-purple/15 text-purple-light font-medium">
                              PQC
                            </span>
                          )}
                        </div>
                        {policyId && (
                          <span className="text-[9.5px] font-mono text-muted-foreground/70">{policyId}</span>
                        )}
                      </div>
                      {/* Act-or-except: ticket state if raised, else a single exception control */}
                      {ticket ? (
                        <span className="flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded bg-teal/10 text-teal font-medium whitespace-nowrap">
                          <Ticket className="w-2.5 h-2.5" />
                          {ticket.externalSystem === "ServiceNow"
                            ? ticket.externalId || ticket.id
                            : ticket.externalSystem === "Jira"
                              ? ticket.externalId || ticket.id
                              : ticket.id}
                          <span className="text-teal/60">· {ticket.status}</span>
                        </span>
                      ) : excepted ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber/10 text-amber font-medium whitespace-nowrap">
                          Excepted
                        </span>
                      ) : policyId ? (
                        <button
                          onClick={() => setExceptCtx({ policyId, policyName: mapped!.policyName })}
                          className="text-[10px] px-2 py-0.5 rounded border border-amber/30 text-amber hover:bg-amber/10 whitespace-nowrap"
                        >
                          Add exception
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {exceptCtx && (
            <RaiseExceptionModal
              open={!!exceptCtx}
              onClose={() => setExceptCtx(null)}
              objectId={co.id}
              objectName={co.name}
              objectType={co.type}
              parentAsset={parentAsset}
              policyId={exceptCtx.policyId}
              policyName={exceptCtx.policyName}
            />
          )}

          {/* Linked infrastructure */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <SectionHeading label={`Linked infrastructure (${assoc.length})`} />
              {assoc.length > 0 && <span className="text-[10px] text-amber ml-auto">failure affects all</span>}
            </div>
            {assoc.length > 0 ? (
              <div className="space-y-0.5">
                {assoc.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setFilters({ tab: "infrastructure", assetName: a.name });
                      setCurrentPage("inventory");
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 text-[11px] rounded px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left group"
                  >
                    <span className="text-foreground font-medium flex-1 truncate group-hover:text-teal">{a.name}</span>
                    <span className="text-muted-foreground flex-shrink-0 text-[10px]">{a.type}</span>
                    <EnvBadge env={a.environment} />
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-teal flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border/40 px-3 py-3 text-[11px] text-muted-foreground">
                Not deployed to any tracked infrastructure asset.
                <span className="block text-[10px] mt-0.5">
                  Add this identity to an asset in the Infrastructure tab to track blast radius.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter Panel (side sheet) ─────────────────────────────────────────────────

interface FilterPanelProps {
  typeFilter: string;
  open: boolean;
  onClose: () => void;
  algorithms: string[];
  owners: string[];
  algFilter: string[];
  setAlgFilter: React.Dispatch<React.SetStateAction<string[]>>;
  envFilter: string[];
  setEnvFilter: React.Dispatch<React.SetStateAction<string[]>>;
  statusFilter: string[];
  setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
  typeAttrFilter: string[];
  setTypeAttrFilter: React.Dispatch<React.SetStateAction<string[]>>;
  pqcFilter: string[];
  setPqcFilter: React.Dispatch<React.SetStateAction<string[]>>;
  ownerFilter: string[];
  setOwnerFilter: React.Dispatch<React.SetStateAction<string[]>>;
}

function FilterChips({
  options,
  selected,
  onToggle,
}: {
  options: { v: string; l: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.v);
        return (
          <button
            key={o.v}
            onClick={() => onToggle(o.v)}
            className={`px-2 py-1 rounded text-[10.5px] font-medium border transition-colors ${
              active
                ? "border-teal/40 bg-teal/15 text-teal"
                : "border-border bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function FilterSection({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {onReset && (
          <button onClick={onReset} className="text-[10px] text-muted-foreground hover:text-coral">
            Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Column chooser ────────────────────────────────────────────────────────────
// Lets the user pick which of the type's posture columns are shown. Name and
// Risk are mandatory. Selection resets when the active type changes.

interface ColumnsPanelProps {
  open: boolean;
  onClose: () => void;
  allCols: ColDef[];
  alwaysOn: string[];
  visibleColKeys: string[] | null;
  setVisibleColKeys: React.Dispatch<React.SetStateAction<string[] | null>>;
}

function ColumnsPanel({ open, onClose, allCols, alwaysOn, visibleColKeys, setVisibleColKeys }: ColumnsPanelProps) {
  // Default (null) = curated defaultOn columns. Otherwise the explicit selection.
  const defaults = allCols.filter((c) => c.defaultOn).map((c) => c.key);
  const effective = visibleColKeys ?? defaults;
  const isOn = (key: string) => alwaysOn.includes(key) || effective.includes(key);
  const toggle = (key: string) => {
    if (alwaysOn.includes(key)) return;
    const base = effective.filter((k) => !alwaysOn.includes(k));
    const next = base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
    setVisibleColKeys(next);
  };
  const selectAll = () => setVisibleColKeys(allCols.map((c) => c.key));
  const reset = () => setVisibleColKeys(null);
  const shownCount = allCols.filter((c) => isOn(c.key)).length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm">Columns</SheetTitle>
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-[11px] text-teal hover:underline">
              Select all
            </button>
            <button onClick={reset} className="text-[11px] text-muted-foreground hover:underline">
              Reset
            </button>
          </div>
        </SheetHeader>

        <div className="px-4 py-2 border-b border-border">
          <span className="text-[11px] text-muted-foreground">Selected columns </span>
          <span className="text-[11px] font-semibold text-foreground tabular-nums">{shownCount}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {allCols.map((col) => {
            const mandatory = alwaysOn.includes(col.key);
            return (
              <label
                key={col.key}
                className={`flex items-center gap-2.5 px-2 py-2 rounded text-xs cursor-pointer hover:bg-muted ${mandatory ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isOn(col.key)}
                  disabled={mandatory}
                  onChange={() => toggle(col.key)}
                  className="accent-teal w-3.5 h-3.5"
                />
                <span className="text-foreground">{col.label}</span>
                {mandatory && (
                  <span className="ml-auto text-[9px] text-muted-foreground uppercase tracking-wide">required</span>
                )}
              </label>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 rounded bg-teal text-primary-foreground hover:bg-teal-light text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Status options are type-correct. SSH keys and secrets use posture states, not
// lifecycle/CLM states. (Monitoring-only product: no Managed/Monitored.)
// Option values MUST equal the stored a.status values (the filter matches raw
// status). Display-friendly relabeling happens in the cells, not here.
function STATUS_OPTIONS_FOR(type: string): { v: string; l: string }[] {
  switch (type) {
    // SSH keys never expire; Orphaned renders as "Key Missing" in the table.
    case "SSH Key":
      return [
        { v: "Active", l: "Active" },
        { v: "Orphaned", l: "Key Missing" },
      ];
    case "API Key / Secret":
      return [
        { v: "Active", l: "Active" },
        { v: "Orphaned", l: "Orphaned" },
      ];
    case "Encryption Key":
      return [
        { v: "Active", l: "Active" },
        { v: "Revoked", l: "Disabled" },
      ];
    case "SSH Certificate":
    case "TLS Certificate":
    case "Code-Signing Certificate":
    case "K8s Workload Cert":
      return ["Active", "Healthy", "Expiring", "Expired", "Revoked"].map((v) => ({ v, l: v }));
    default:
      return ["Active", "Healthy", "Expiring", "Expired", "Revoked"].map((v) => ({ v, l: v }));
  }
}

// One extra posture filter that only makes sense for a given type.
function TYPE_ATTR_FOR(type: string): { title: string; label: string; options: string[] } | null {
  switch (type) {
    case "SSH Key":
      return {
        title: "SSH Risk",
        label: "Risk Status",
        options: ["Shared", "Weak", "Rogue", "Misplaced", "Suspicious", "Clean"],
      };
    case "API Key / Secret":
      return { title: "Exposure", label: "Exposure", options: ["Not detected", "Code repo", "CI/CD", "Log"] };
    case "Encryption Key":
      return { title: "Protection", label: "Protection", options: ["HSM", "Cloud KMS", "Software"] };
    case "TLS Certificate":
    case "Code-Signing Certificate":
    case "K8s Workload Cert":
      return { title: "Compliance", label: "Compliance", options: ["Compliant", "Non-Compliant"] };
    default:
      return null;
  }
}

function FilterPanel(props: FilterPanelProps) {
  const {
    open,
    onClose,
    typeFilter,
    algorithms,
    owners,
    algFilter,
    setAlgFilter,
    envFilter,
    setEnvFilter,
    statusFilter,
    setStatusFilter,
    typeAttrFilter,
    setTypeAttrFilter,
    pqcFilter,
    setPqcFilter,
    ownerFilter,
    setOwnerFilter,
  } = props;

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const clearAll = () => {
    setAlgFilter([]);
    setEnvFilter([]);
    setStatusFilter([]);
    setTypeAttrFilter([]);
    setPqcFilter([]);
    setOwnerFilter([]);
  };

  const algOptions = [{ v: "weak", l: "Weak (RSA/SHA-1)" }, ...algorithms.map((a) => ({ v: a, l: a }))];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm">Filters</SheetTitle>
          <button onClick={clearAll} className="text-[11px] text-coral hover:underline">
            Clear All
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-foreground">Crypto</h3>
            <FilterSection title="Algorithm" onReset={algFilter.length ? () => setAlgFilter([]) : undefined}>
              <FilterChips options={algOptions} selected={algFilter} onToggle={toggle(setAlgFilter)} />
            </FilterSection>
            <FilterSection title="PQC Risk" onReset={pqcFilter.length ? () => setPqcFilter([]) : undefined}>
              <FilterChips
                options={["Critical", "High", "Medium", "Low", "Safe"].map((v) => ({ v, l: v }))}
                selected={pqcFilter}
                onToggle={toggle(setPqcFilter)}
              />
            </FilterSection>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-foreground">Asset Context</h3>
            <FilterSection title="Environment" onReset={envFilter.length ? () => setEnvFilter([]) : undefined}>
              <FilterChips
                options={["Production", "Staging", "Development"].map((v) => ({ v, l: v }))}
                selected={envFilter}
                onToggle={toggle(setEnvFilter)}
              />
            </FilterSection>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-foreground">Status</h3>
            <FilterSection title="Status" onReset={statusFilter.length ? () => setStatusFilter([]) : undefined}>
              <FilterChips
                options={STATUS_OPTIONS_FOR(typeFilter)}
                selected={statusFilter}
                onToggle={toggle(setStatusFilter)}
              />
            </FilterSection>
          </div>

          {/* Type-specific posture filter (only on the relevant tab) */}
          {TYPE_ATTR_FOR(typeFilter) && (
            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold text-foreground">{TYPE_ATTR_FOR(typeFilter)!.title}</h3>
              <FilterSection
                title={TYPE_ATTR_FOR(typeFilter)!.label}
                onReset={typeAttrFilter.length ? () => setTypeAttrFilter([]) : undefined}
              >
                <FilterChips
                  options={TYPE_ATTR_FOR(typeFilter)!.options.map((v) => ({ v, l: v }))}
                  selected={typeAttrFilter}
                  onToggle={toggle(setTypeAttrFilter)}
                />
              </FilterSection>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 rounded bg-teal text-primary-foreground hover:bg-teal-light text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// Export the given crypto objects to a CSV download (current filtered/visible set).
function exportObjectsCsv(objs: CryptoAsset[], context: string) {
  const cols: { h: string; get: (o: CryptoAsset) => string }[] = [
    { h: "Name", get: (o) => o.name },
    { h: "Type", get: (o) => o.type },
    { h: "Algorithm", get: (o) => (o as any).algorithm || "" },
    { h: "Status", get: (o) => o.status },
    { h: "PQC Risk", get: (o) => o.pqcRisk },
    { h: "CRS", get: (o) => String(computeCRS(o).crs) },
    { h: "Owner", get: (o) => o.owner },
    { h: "Team", get: (o) => o.team },
    { h: "Application", get: (o) => o.application },
    { h: "Environment", get: (o) => o.environment },
    { h: "Infrastructure", get: (o) => o.infrastructure },
    { h: "Expiry", get: (o) => o.expiryDate || "" },
  ];
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.map((c) => c.h).join(","), ...objs.map((o) => cols.map((c) => esc(c.get(o))).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crypto-inventory-${context}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CryptoObjectsTab({ onCreateTicket }: Props) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [algFilter, setAlgFilter] = useState<string[]>([]);
  const [envFilter, setEnvFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeAttrFilter, setTypeAttrFilter] = useState<string[]>([]);
  const [pqcFilter, setPqcFilter] = useState<string[]>([]);
  const [qvOnly, setQvOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [filterIdActive, setFilterIdActive] = useState<string>("");
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [colPanelOpen, setColPanelOpen] = useState(false);
  // Column visibility per the active type. Name and Risk are always shown.
  const ALWAYS_ON = ["name", "riskScore"];
  const [visibleColKeys, setVisibleColKeys] = useState<string[] | null>(null);
  const [detailAsset, setDetailAsset] = useState<CryptoAsset | null>(null);
  const [ticketAsset, setTicketAsset] = useState<CryptoAsset | null>(null);
  const [ticketAction, setTicketAction] = useState("fix");
  const [riskDrawer, setRiskDrawer] = useState<CryptoAsset | null>(null);
  const [deployAsset, setDeployAsset] = useState<CryptoAsset | null>(null);
  const [sortKey, setSortKey] = useState<"riskScore" | "daysToExpiry">("riskScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { manualIdentities } = useInventoryRegistry();
  const { setSelectedEntity } = useAgent();
  const { filters: navFilters, setFilters, setCurrentPage } = useNav();

  const {
    type: navType,
    status: navStatus,
    algorithm: navAlg,
    owner: navOwner,
    pqcRisk: navPqc,
    search: navSearch,
    quantumVulnerable: navQV,
    objectIds: navObjectIds,
  } = navFilters;
  useEffect(() => {
    // Apply the incoming navigation filters authoritatively: set what is present
    // and clear what is absent, so each navigation lands on exactly the intended
    // view instead of stacking on top of a previous click's filters.
    setTypeFilter(navType ?? "All");
    setStatusFilter(navStatus ? [navStatus] : []);
    setAlgFilter(navAlg ? [navAlg] : []);
    setOwnerFilter(navOwner ? [navOwner] : []);
    setPqcFilter(navPqc ? [navPqc] : []);
    setQvOnly(navQV === "true");
    setSearch(navSearch ?? "");
    setScopeIds(navObjectIds ? navObjectIds.split(",").filter(Boolean) : []);
    setFilterIdActive(navFilters.filterId ?? "");
  }, [navType, navStatus, navAlg, navOwner, navPqc, navSearch, navQV, navObjectIds, navFilters.filterId]);

  useEffect(() => {
    if (detailAsset) setSelectedEntity({ kind: "identity", id: detailAsset.id, name: detailAsset.name });
    return () => setSelectedEntity(null);
  }, [detailAsset, setSelectedEntity]);

  const allAssets = useMemo(() => [...manualIdentities, ...mockAssets], [manualIdentities]);
  const algorithms = useMemo(() => {
    const pool = typeFilter === "All" ? allAssets : allAssets.filter((a) => a.type === typeFilter);
    return [...new Set(pool.map((a) => a.algorithm))].sort();
  }, [allAssets, typeFilter]);

  const filtered = useMemo(() => {
    let r = [...allAssets];
    if (scopeIds.length) r = r.filter((a) => scopeIds.includes(a.id));

    if (qvOnly) r = r.filter((a) => algVuln(a.algorithm) >= 90); // canonical quantum-vulnerable, matches Quantum Readiness
    if (typeFilter !== "All") r = r.filter((a) => a.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.commonName.toLowerCase().includes(q) ||
          a.owner.toLowerCase().includes(q) ||
          a.application.toLowerCase().includes(q) ||
          a.algorithm.toLowerCase().includes(q),
      );
    }
    if (algFilter.length) {
      r = r.filter((a) =>
        algFilter.some((v) => (v === "weak" ? /RSA-1024|RSA-2048|SHA-1/.test(a.algorithm) : a.algorithm === v)),
      );
    }
    if (envFilter.length) r = r.filter((a) => envFilter.includes(a.environment));
    if (statusFilter.length) r = r.filter((a) => statusFilter.includes(a.status));
    if (typeAttrFilter.length)
      r = r.filter((a) => {
        const vals = [a.sshKey?.riskStatus, a.secret?.exposure, a.cert?.complianceStatus, a.encKey?.protection].filter(
          Boolean,
        ) as string[];
        return typeAttrFilter.some((v) => vals.includes(v));
      });
    if (pqcFilter.length) r = r.filter((a) => pqcFilter.includes(a.pqcRisk));
    if (ownerFilter.length) r = r.filter((a) => (ownerFilter.includes("Unassigned") ? a.owner === "Unassigned" : true));
    // filterId — dashboard drill-down predicate (highest specificity, applied last)
    if (filterIdActive && VIOLATION_FILTERS[filterIdActive]) {
      r = r.filter(VIOLATION_FILTERS[filterIdActive].predicate);
    }

    // Sorting: default risk_score DESC, with expiry tie-breaker
    const dir = sortDir === "asc" ? 1 : -1;
    const expiryTs = (a: CryptoAsset) => {
      const t = a.expiryDate && a.expiryDate !== "N/A" ? Date.parse(a.expiryDate) : NaN;
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };
    if (sortKey === "riskScore") {
      r.sort((a, b) => {
        const sa = crsScore(a);
        const sb = crsScore(b);
        const va = Number.isFinite(sa) ? sa : -Infinity;
        const vb = Number.isFinite(sb) ? sb : -Infinity;
        if (va !== vb) return (vb - va) * (sortDir === "desc" ? 1 : -1);
        // tie-break: expiry ASC (earliest first)
        const ea = expiryTs(a),
          eb = expiryTs(b);
        if (ea !== eb) return ea - eb;
        return 0;
      });
    } else if (sortKey === "daysToExpiry") {
      r.sort((a, b) => (a.daysToExpiry - b.daysToExpiry) * dir);
    }
    return r;
  }, [
    allAssets,
    typeFilter,
    search,
    algFilter,
    envFilter,
    statusFilter,
    typeAttrFilter,
    pqcFilter,
    ownerFilter,
    qvOnly,
    scopeIds,
    sortKey,
    sortDir,
    filterIdActive,
  ]);

  const getAssoc = (co: CryptoAsset) => mockITAssets.filter((a) => a.cryptoObjectIds.includes(co.id));
  const allCols = AVAILABLE_COLS[typeFilter] ?? AVAILABLE_COLS["All"];
  React.useEffect(() => {
    setVisibleColKeys(null);
  }, [typeFilter]);
  // null means "use the curated defaults"; otherwise honor the user's selection.
  // Preserve the superset's order so columns stay in a sensible sequence.
  const selectedKeys = visibleColKeys ?? allCols.filter((c) => c.defaultOn).map((c) => c.key);
  const cols = allCols.filter((c) => ALWAYS_ON.includes(c.key) || selectedKeys.includes(c.key));
  React.useEffect(() => {
    setTypeAttrFilter([]);
  }, [typeFilter]);

  const openTicket = (co: CryptoAsset, action: string) => {
    setTicketAsset(co);
    setTicketAction(action);
    setDetailAsset(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Type tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-2 flex-shrink-0 overflow-x-auto">
          {TYPE_FILTERS.filter((t) => FEATURES.AI_IDENTITY || t.key !== "AI Agent Token").map((t) => {
            const cnt = t.key === "All" ? allAssets.length : allAssets.filter((a) => a.type === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTypeFilter(t.key);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  typeFilter === t.key
                    ? "bg-teal/15 text-teal border border-teal/30"
                    : "text-muted-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                {t.label}
                <span
                  className={`text-[9px] tabular-nums ${typeFilter === t.key ? "text-teal/70" : "text-muted-foreground/50"}`}
                >
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Filters trigger */}
        {(() => {
          const activeChips: { key: string; label: string; remove: () => void }[] = [
            ...envFilter.map((v) => ({
              key: `env:${v}`,
              label: v,
              remove: () => setEnvFilter(envFilter.filter((x) => x !== v)),
            })),
            ...pqcFilter.map((v) => ({
              key: `pqc:${v}`,
              label: `${v} PQC`,
              remove: () => setPqcFilter(pqcFilter.filter((x) => x !== v)),
            })),
            ...algFilter.map((v) => ({
              key: `alg:${v}`,
              label: v === "weak" ? "Weak algos" : v,
              remove: () => setAlgFilter(algFilter.filter((x) => x !== v)),
            })),
            ...statusFilter.map((v) => ({
              key: `st:${v}`,
              label: v,
              remove: () => setStatusFilter(statusFilter.filter((x) => x !== v)),
            })),
            ...ownerFilter.map((v) => ({
              key: `ow:${v}`,
              label: v,
              remove: () => setOwnerFilter(ownerFilter.filter((x) => x !== v)),
            })),
            ...(filterIdActive && VIOLATION_FILTERS[filterIdActive]
              ? [
                  {
                    key: `fid:${filterIdActive}`,
                    label: VIOLATION_FILTERS[filterIdActive].label,
                    remove: () => setFilterIdActive(""),
                  },
                ]
              : []),
          ];
          const visible = activeChips.slice(0, 4);
          const overflow = activeChips.length - visible.length;
          const totalActive = activeChips.length;
          const clearAll = () => {
            setAlgFilter([]);
            setEnvFilter([]);
            setStatusFilter([]);
            setPqcFilter([]);
            setOwnerFilter([]);
            setFilterIdActive("");
          };
          const activeDashFilter = filterIdActive ? VIOLATION_FILTERS[filterIdActive] : null;
          return (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, application, algorithm..."
                    className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                </div>
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors ${
                    totalActive > 0
                      ? "border-teal/40 text-teal bg-teal/10 hover:bg-teal/15"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <FilterIcon className="w-3.5 h-3.5" />
                  Filters
                  {totalActive > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal/20 text-teal text-[9px] font-bold tabular-nums">
                      {totalActive}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setColPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  Columns
                  {visibleColKeys != null && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold tabular-nums">
                      {cols.length}
                    </span>
                  )}
                </button>
                <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} identities</span>
                <button
                  onClick={() => {
                    exportObjectsCsv(filtered, totalActive > 0 ? "filtered" : "all");
                    toast.success(`Exported ${filtered.length} objects to CSV`);
                  }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3 h-3" /> Export{totalActive > 0 ? ` (${filtered.length})` : ""}
                </button>
              </div>
              {totalActive > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {visible.map((c) => (
                    <span
                      key={c.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] text-foreground"
                    >
                      {c.label}
                      <button onClick={c.remove} className="text-muted-foreground hover:text-coral">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {overflow > 0 && (
                    <button
                      onClick={() => setFilterPanelOpen(true)}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                    >
                      +{overflow} more
                    </button>
                  )}
                  <button onClick={clearAll} className="text-[10px] text-coral hover:underline ml-1">
                    Clear all
                  </button>
                </div>
              )}
              {/* Representative data banner — shown when drilled in from dashboard */}
              {activeDashFilter && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal/5 border border-teal/20 text-[10.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filtered.length}</span> representative
                    samples matching <span className="font-semibold text-foreground">"{activeDashFilter.label}"</span>.{" "}
                    Enterprise total:{" "}
                    <span className="font-semibold text-teal">
                      {activeDashFilter.enterpriseCount.toLocaleString()} {activeDashFilter.countNoun}
                    </span>
                    .
                  </span>
                  <button
                    onClick={() => setFilterIdActive("")}
                    className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    Clear ×
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
            <table className="w-full min-w-max text-xs table-auto">
              <thead className="bg-secondary/50 sticky top-0 z-10">
                <tr className="border-b border-border">
                  {cols.map((col) => (
                    <th
                      key={col.key}
                      className={`text-left py-2.5 px-3 font-medium text-muted-foreground whitespace-nowrap ${col.cls}`}
                    >
                      {col.key === "riskScore" ? (
                        <button
                          onClick={() => {
                            if (sortKey === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                            else {
                              setSortKey("riskScore");
                              setSortDir("desc");
                            }
                          }}
                          className={`inline-flex items-center gap-1 hover:text-foreground w-full justify-end ${sortKey === col.key ? "text-foreground" : ""}`}
                        >
                          {col.label}{" "}
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )
                          ) : (
                            <ChevronDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((co) => {
                  const isManual = manualIdentities.some((m) => m.id === co.id);
                  return (
                    <tr
                      key={co.id}
                      onClick={() => setDetailAsset(co)}
                      className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      {cols.map((col) => (
                        <td key={col.key} className={`py-2.5 px-3 overflow-hidden ${col.cls}`}>
                          {col.key === "name" ? (
                            <span className="font-medium text-foreground truncate flex items-center gap-1.5 max-w-full">
                              <span className="truncate">{co.name}</span>
                              {isManual && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-teal/10 text-teal text-[8px] flex-shrink-0">
                                  <FileEdit className="w-2 h-2" />
                                </span>
                              )}
                            </span>
                          ) : (
                            <div
                              className={`flex items-center ${col.cls.includes("text-right") ? "justify-end" : col.cls.includes("text-center") ? "justify-center" : ""}`}
                            >
                              <CellValue col={col} co={co} />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No identities match your filters.</div>
            )}
          </div>
        </div>
      </div>

      {/* Detail side panel */}
      {detailAsset && (
        <DetailPanel
          co={detailAsset}
          onClose={() => setDetailAsset(null)}
          onTicket={(action) => openTicket(detailAsset, action)}
          assoc={getAssoc(detailAsset)}
          onOpenRiskDrawer={() => setRiskDrawer(detailAsset)}
          onDeploy={() => setDeployAsset(detailAsset)}
          setFilters={setFilters}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* Ticket draft modal */}
      {ticketAsset && (
        <TicketDraftModal
          asset={ticketAsset}
          action={ticketAction}
          onClose={() => setTicketAsset(null)}
          onConfirm={() => {
            // TicketDraftModal handles toast confirmation internally.
            // Do not call onCreateTicket — that opens the legacy drawer.
          }}
        />
      )}

      <CryptoObjectRiskDrawer object={riskDrawer} onClose={() => setRiskDrawer(null)} />
      <DeployToDeviceModal open={!!deployAsset} onClose={() => setDeployAsset(null)} cert={deployAsset} />

      <ColumnsPanel
        open={colPanelOpen}
        onClose={() => setColPanelOpen(false)}
        allCols={allCols}
        alwaysOn={ALWAYS_ON}
        visibleColKeys={visibleColKeys}
        setVisibleColKeys={setVisibleColKeys}
      />

      <FilterPanel
        open={filterPanelOpen}
        typeFilter={typeFilter}
        onClose={() => setFilterPanelOpen(false)}
        algorithms={algorithms}
        owners={[...new Set(allAssets.map((a) => a.owner))].sort()}
        algFilter={algFilter}
        setAlgFilter={setAlgFilter}
        envFilter={envFilter}
        setEnvFilter={setEnvFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeAttrFilter={typeAttrFilter}
        setTypeAttrFilter={setTypeAttrFilter}
        pqcFilter={pqcFilter}
        setPqcFilter={setPqcFilter}
        ownerFilter={ownerFilter}
        setOwnerFilter={setOwnerFilter}
      />
    </div>
  );
}
