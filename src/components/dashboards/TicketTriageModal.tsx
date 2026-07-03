import React, { useState, useMemo } from "react";
import {
  Shield,
  Key,
  Lock,
  Atom,
  Check,
  ChevronRight,
  ChevronDown,
  Ticket,
  X,
  Sparkles,
  ShoppingCart,
  Package,
  Hash,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNav } from "@/context/NavigationContext";
import { mockAssets, CryptoAsset } from "@/data/mockData";
import { mockITAssets, ITAsset } from "@/data/inventoryMockData";
import { routingForTeam } from "@/lib/routing/teamRouting";
import { VIOLATION_FILTERS } from "@/lib/filters/cryptoFilters";
import { computeCRS } from "@/lib/risk";
import { addTicket, ticketForObject, mockIncidentNumber } from "@/lib/ticketStore";
import type { TicketDraft } from "@/components/inventory/TicketDraftModal";

const fmt = (n: number) => n.toLocaleString();
type Category = "Certs" | "SSH" | "Secrets" | "PQC" | "Library" | "Cipher" | "Protocol";

interface Violation {
  id: string;
  category: Category;
  short: string;
  severity: "P1" | "P2" | "P3";
  total: number; // enterprise total shown on the dashboard
  policy: string;
  source: string;
  system: "ServiceNow" | "Jira"; // ITSM target configured on the policy
  framework: string;
  match: (a: CryptoAsset) => boolean;
}

export const VIOLATION_CATALOG: Record<string, Violation> = {
  "1": {
    id: "1",
    category: "Certs",
    short: "Expiring 7d",
    severity: "P1",
    total: VIOLATION_FILTERS.cert_expiring_7d.enterpriseCount,
    policy: "OOB: Certificate expiry threshold",
    source: "CA Scan",
    system: "ServiceNow",
    framework: "CA/Browser Forum · NIST SP 1800-16",
    match: VIOLATION_FILTERS.cert_expiring_7d.predicate,
  },
  expired: {
    id: "expired",
    category: "Certs",
    short: "Expired",
    severity: "P1",
    total: VIOLATION_FILTERS.cert_expired.enterpriseCount,
    policy: "OOB: No expired certificates in production",
    source: "CA Scan",
    system: "ServiceNow",
    framework: "CA/Browser Forum",
    match: VIOLATION_FILTERS.cert_expired.predicate,
  },
  "6": {
    id: "6",
    category: "Certs",
    short: "Weak algorithm",
    severity: "P2",
    total: VIOLATION_FILTERS.cert_weak_algo.enterpriseCount,
    policy: "OOB: Approved algorithms and key sizes",
    source: "CA Scan",
    system: "ServiceNow",
    framework: "NIST SP 800-131A",
    match: VIOLATION_FILTERS.cert_weak_algo.predicate,
  },
  "3": {
    id: "3",
    category: "SSH",
    short: "Suspicious",
    severity: "P1",
    total: VIOLATION_FILTERS.ssh_suspicious.enterpriseCount,
    policy: "OOB: SSH key anomaly detection",
    source: "Network Scan",
    system: "Jira",
    framework: "NIST SP 800-53 AC-17",
    match: VIOLATION_FILTERS.ssh_suspicious.predicate,
  },
  "9": {
    id: "9",
    category: "SSH",
    short: "Rogue",
    severity: "P3",
    total: VIOLATION_FILTERS.ssh_rogue.enterpriseCount,
    policy: "OOB: Managed SSH key provenance",
    source: "Network Scan",
    system: "Jira",
    framework: "NIST SP 800-53 AC-17",
    match: VIOLATION_FILTERS.ssh_rogue.predicate,
  },
  "8": {
    id: "8",
    category: "Secrets",
    short: "Unrotated 90d+",
    severity: "P2",
    total: VIOLATION_FILTERS.secret_unrotated_90d.enterpriseCount,
    policy: "OOB: Secret rotation interval",
    source: "Key Store Discovery",
    system: "Jira",
    framework: "NIST SP 800-57",
    match: VIOLATION_FILTERS.secret_unrotated_90d.predicate,
  },
  orphaned: {
    id: "orphaned",
    category: "Secrets",
    short: "Orphaned",
    severity: "P3",
    total: VIOLATION_FILTERS.secret_orphaned.enterpriseCount,
    policy: "OOB: Owned crypto objects only",
    source: "Key Store Discovery",
    system: "Jira",
    framework: "NIST SP 800-53 AC-2",
    match: VIOLATION_FILTERS.secret_orphaned.predicate,
  },
  "pqc-1": {
    id: "pqc-1",
    category: "PQC",
    short: "RSA-2048 post-2030",
    severity: "P2",
    total: 847,
    policy: "OOB: Quantum-vulnerable algorithm in use",
    source: "CBOM Ingestion",
    system: "ServiceNow",
    framework: "NIST IR 8547",
    match: (a) => a.pqcRisk === "Critical" || a.pqcRisk === "High",
  },
  "lib-outdated": {
    id: "lib-outdated",
    category: "Library",
    short: "Outdated library",
    severity: "P2",
    total: 74,
    policy: "OOB: No end-of-life crypto libraries",
    source: "Tenable / Qualys / CBOM",
    system: "ServiceNow",
    framework: "NIST SP 800-131A",
    match: (a) => a.type === "TLS Certificate" && a.environment === "Production",
  },
  "cipher-weak": {
    id: "cipher-weak",
    category: "Cipher",
    short: "Weak cipher",
    severity: "P2",
    total: 12,
    policy: "OOB: Approved cipher suites only",
    source: "Qualys / CBOM",
    system: "ServiceNow",
    framework: "NIST SP 800-52",
    match: (a) => a.signatureAlgorithm === "SHA-1",
  },
  "proto-deprecated": {
    id: "proto-deprecated",
    category: "Protocol",
    short: "Deprecated protocol",
    severity: "P2",
    total: 52,
    policy: "OOB: No deprecated TLS versions",
    source: "Tenable / Qualys",
    system: "ServiceNow",
    framework: "NIST SP 800-52",
    match: (a) => a.type === "TLS Certificate" && a.environment === "Staging",
  },
};

const CAT_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  Certs: Shield,
  SSH: Key,
  Secrets: Lock,
  PQC: Atom,
  Library: Package,
  Cipher: Hash,
  Protocol: ArrowLeftRight,
};

// ── Real object pool (mockAssets, filtered by each violation predicate) ─────
interface PoolObj {
  id: string;
  name: string;
  crs: number;
  category: Category;
  violationId: string;
  issue: string;
  assignee: string;
  asset: CryptoAsset;
  itAsset?: ITAsset;
}

// Reverse link: crypto object id -> the IT asset it sits on (real FQDN + MVP-scoped type).
const OBJECT_TO_ITASSET: Record<string, ITAsset> = (() => {
  const m: Record<string, ITAsset> = {};
  mockITAssets.forEach((a) =>
    a.cryptoObjectIds.forEach((oid) => {
      if (!m[oid]) m[oid] = a;
    }),
  );
  return m;
})();

function issueFor(a: CryptoAsset, vid: string): string {
  switch (vid) {
    case "1":
      return `expires in ${a.daysToExpiry}d`;
    case "expired":
      return `expired ${Math.abs(a.daysToExpiry)}d ago`;
    case "6":
      return a.signatureAlgorithm === "SHA-1" ? "SHA-1 signature" : a.algorithm;
    case "pqc-1":
      return `${a.algorithm} · quantum-vulnerable`;
    case "3":
      return a.sshKey?.riskStatus ? `${a.sshKey.riskStatus.toLowerCase()} key` : "anomalous login";
    case "9":
      return "unmanaged key";
    case "8":
      return "not rotated 90d+";
    case "orphaned":
      return "owner left org";
    case "lib-outdated":
      return "OpenSSL 1.0.2 (EOL)";
    case "cipher-weak":
      return "RC4 / 3DES negotiated";
    case "proto-deprecated":
      return "TLS 1.0 / 1.1 enabled";
    default:
      return a.status;
  }
}

function toPoolObj(a: CryptoAsset, vid: string): PoolObj {
  const v = VIOLATION_CATALOG[vid];
  return {
    id: a.id,
    name: a.name,
    crs: Math.round(computeCRS(a).crs),
    category: v.category,
    violationId: vid,
    issue: issueFor(a, vid),
    assignee: a.team,
    asset: a,
    itAsset: OBJECT_TO_ITASSET[a.id],
  };
}

// Deduped cross-type pool: each asset once, tagged with its first matching violation.
const POOL: PoolObj[] = (() => {
  const seen = new Set<string>();
  const out: PoolObj[] = [];
  Object.values(VIOLATION_CATALOG).forEach((v) => {
    mockAssets.filter(v.match).forEach((a) => {
      if (seen.has(a.id)) return;
      seen.add(a.id);
      out.push(toPoolObj(a, v.id));
    });
  });
  return out.sort((x, y) => y.crs - x.crs);
})();

// ── Helpers ─────────────────────────────────────────────────────────────────
function crsColor(score: number) {
  if (score >= 80) return "bg-coral/15 text-coral";
  if (score >= 60) return "bg-amber/15 text-amber";
  if (score >= 40) return "bg-purple/15 text-purple-light";
  return "bg-secondary text-muted-foreground";
}
function crsPriority(crs: number) {
  if (crs >= 80) return "P1 · Critical";
  if (crs >= 60) return "P2 · High";
  return "P3 · Moderate";
}
function draftPriority(label: string): TicketDraft["priority"] {
  if (label.startsWith("P1")) return "Critical";
  if (label.startsWith("P2")) return "High";
  return "Medium";
}
function ticketType(category: Category): TicketDraft["type"] {
  return category === "PQC" ? "PQC Migration" : "Remediation";
}
function moduleFor(category: Category): string {
  if (category === "PQC") return "PQC / Quantum Readiness";
  if (category === "Secrets") return "Secrets Management";
  if (category === "Library" || category === "Cipher" || category === "Protocol") return "Crypto Posture";
  return "CLM";
}

interface SysField {
  label: string;
  value: string;
}
interface Draft {
  summary: string;
  description: string;
  system: string;
  fields: SysField[];
}

// Per-category policy configuration for the ITSM field defaults.
const SYS_CONFIG: Record<Category, { snowCategory: string; jiraProjectKey: string; jiraIssueType: string }> = {
  Certs: { snowCategory: "Certificate Management", jiraProjectKey: "CLM", jiraIssueType: "Task" },
  SSH: { snowCategory: "SSH Key Management", jiraProjectKey: "SEC", jiraIssueType: "Task" },
  Secrets: { snowCategory: "Secrets Management", jiraProjectKey: "SEC", jiraIssueType: "Task" },
  PQC: { snowCategory: "PQC Migration", jiraProjectKey: "PQC", jiraIssueType: "Story" },
  Library: { snowCategory: "Vulnerability Management", jiraProjectKey: "SEC", jiraIssueType: "Task" },
  Cipher: { snowCategory: "Cryptography", jiraProjectKey: "SEC", jiraIssueType: "Task" },
  Protocol: { snowCategory: "Cryptography", jiraProjectKey: "SEC", jiraIssueType: "Task" },
};

function urgencyFor(crs: number) {
  return crs >= 80 ? "High" : crs >= 60 ? "Medium" : "Low";
}
function jiraPriorityFor(sev: string) {
  return sev === "P1" ? "Highest" : sev === "P2" ? "High" : "Medium";
}

function draftSummary(o: PoolObj, vid: string): string {
  switch (vid) {
    case "1":
      return `Renew expiring certificate ${o.name}`;
    case "expired":
      return `Replace expired certificate ${o.name}`;
    case "6":
      return `Re-issue weak-algorithm certificate ${o.name}`;
    case "pqc-1":
      return `Plan PQC migration for ${o.name}`;
    case "lib-outdated":
      return `Upgrade outdated crypto library on ${o.name}`;
    case "cipher-weak":
      return `Disable weak cipher on ${o.name}`;
    case "proto-deprecated":
      return `Disable deprecated TLS on ${o.name}`;
    case "3":
      return `Investigate suspicious SSH key ${o.name}`;
    case "9":
      return `Bring rogue SSH key under management: ${o.name}`;
    case "8":
      return `Rotate stale secret ${o.name}`;
    case "orphaned":
      return `Reassign and rotate orphaned secret ${o.name}`;
    default:
      return `Remediate ${o.name}`;
  }
}
function rootCause(o: PoolObj, vid: string): string {
  switch (vid) {
    case "1":
      return `has a certificate ${o.issue} and no auto-renewal configured, risking an outage for dependent services`;
    case "expired":
      return `has an expired certificate still deployed to a live endpoint, causing trust failures`;
    case "6":
      return `uses a weak signature or key (${o.issue})`;
    case "pqc-1":
      return `uses a quantum-vulnerable algorithm (${o.issue}) that becomes unsafe past the NIST deadline`;
    case "lib-outdated":
      return `runs an end-of-life crypto library (${o.issue}) with known CVEs`;
    case "cipher-weak":
      return `negotiates a weak cipher (${o.issue}) vulnerable to downgrade`;
    case "proto-deprecated":
      return `accepts a deprecated protocol version (${o.issue})`;
    case "3":
      return `is a suspicious SSH key showing anomalous login patterns on production hosts`;
    case "9":
      return `is a rogue SSH key not provisioned through the platform`;
    case "8":
      return `is a secret not rotated in over 90 days`;
    case "orphaned":
      return `is an orphaned secret whose owner has left the org, blocking rotation`;
    default:
      return `requires review`;
  }
}
function remediation(vid: string): string {
  switch (vid) {
    case "1":
      return "Re-issue on an approved CA with 90-day validity, enable auto-renewal, then deploy to dependent endpoints and verify the TLS handshake.";
    case "expired":
      return "Issue a replacement immediately, deploy to the live endpoint, confirm restoration, and enable auto-renewal.";
    case "6":
      return "Re-issue with RSA-3072 or ECDSA P-256 and a SHA-256 signature. Retire the weak key once deployed.";
    case "pqc-1":
      return "Add to the QTH migration queue for ML-KEM hybrid re-issue in a staged wave.";
    case "lib-outdated":
      return "Upgrade to a supported OpenSSL 3.x build, redeploy the service, and rescan to confirm the library version.";
    case "cipher-weak":
      return "Remove RC4 and 3DES from the endpoint cipher suite and restrict to AES-GCM. Redeploy and re-scan.";
    case "proto-deprecated":
      return "Disable TLS 1.0 and 1.1 on the endpoint and require TLS 1.2 or higher. Verify no client breakage first.";
    case "3":
      return "Quarantine the key, confirm last-known access, then rotate under the managed SSH CA and remove the anomalous authorization.";
    case "9":
      return "Verify the owner, remove the unmanaged key, and re-provision access through the SSH CA under policy.";
    case "8":
      return "Rotate the secret in its source key store and enforce a 90-day rotation policy. Notify consuming services before cutover.";
    case "orphaned":
      return "Reassign ownership to an active team, then rotate and re-scope access to current consumers.";
    default:
      return "Review and remediate per policy.";
  }
}

// ITSM field set, prefilled from policy config + the object. Swaps with the system choice.
function systemFields(system: string, o: PoolObj, vid: string): SysField[] {
  const v = VIOLATION_CATALOG[vid];
  const cfg = SYS_CONFIG[o.category];
  const route = routingForTeam(o.asset.team);
  const ci = o.itAsset?.name || o.asset.infrastructure || o.name;
  if (system === "Jira") {
    return [
      { label: "Project key", value: route.projectKey },
      { label: "Issue type", value: cfg.jiraIssueType },
      { label: "Components", value: o.category },
      { label: "Labels", value: `${v.short.toLowerCase().replace(/\s+/g, "-")} crypto-posture` },
      { label: "Priority", value: jiraPriorityFor(v.severity) },
    ];
  }
  return [
    { label: "Assignment group", value: route.assignmentGroup },
    { label: "Category", value: cfg.snowCategory },
    { label: "Configuration item", value: ci },
    { label: "Urgency", value: urgencyFor(o.crs) },
    { label: "Impact", value: o.asset.environment === "Production" ? "High" : "Medium" },
  ];
}

function buildDraft(o: PoolObj, vid: string): Draft {
  const v = VIOLATION_CATALOG[vid];
  return {
    summary: draftSummary(o, vid),
    description: `Root cause: ${o.name} (${o.category}) ${rootCause(o, vid)}. It violates policy "${v.policy}" (${v.framework}); CRS ${o.crs} (${crsPriority(o.crs)}); owning team ${o.assignee}.\n\nSuggested remediation: ${remediation(vid)}`,
    system: v.system,
    fields: systemFields(v.system, o, vid),
  };
}

const ITSM_OPTIONS = ["ServiceNow", "Jira"] as const;

type TabKey = "All" | Category;
const TABS: { key: TabKey; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Certs", label: "Certificates" },
  { key: "SSH", label: "SSH keys" },
  { key: "Secrets", label: "Secrets" },
  { key: "Library", label: "Libraries" },
  { key: "Cipher", label: "Ciphers" },
  { key: "Protocol", label: "Protocols" },
  { key: "PQC", label: "Quantum" },
];

export default function TicketTriageModal({
  onClose,
  initialType = "All",
  initialViolationId,
}: {
  onClose: () => void;
  initialType?: TabKey;
  initialViolationId?: string;
}) {
  const { setCurrentPage } = useNav();
  const scoped = !!initialViolationId;
  const [tab, setTab] = useState<TabKey>(initialType);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selected, setSelected] = useState<Set<string>>(() =>
    initialViolationId
      ? new Set(
          POOL.filter((o) => VIOLATION_CATALOG[initialViolationId].match(o.asset) && !ticketForObject(o.id)).map(
            (o) => o.id,
          ),
        )
      : new Set(),
  );

  const violationFor = (o: PoolObj) => (scoped ? initialViolationId! : o.violationId);
  const withIssue = (o: PoolObj) => (scoped ? { ...o, issue: issueFor(o.asset, initialViolationId!) } : o);

  const tabCounts = useMemo(() => {
    const c: Record<TabKey, number> = {
      All: POOL.length,
      Certs: 0,
      SSH: 0,
      Secrets: 0,
      PQC: 0,
      Library: 0,
      Cipher: 0,
      Protocol: 0,
    };
    POOL.forEach((o) => {
      c[o.category]++;
    });
    return c;
  }, []);

  const baseVisible = useMemo(() => {
    if (scoped) return POOL.filter((o) => VIOLATION_CATALOG[initialViolationId!].match(o.asset));
    return tab === "All" ? POOL : POOL.filter((o) => o.category === tab);
  }, [tab, scoped, initialViolationId]);

  const teamsPresent = useMemo(() => {
    const s = new Set<string>();
    baseVisible.forEach((o) => s.add(o.asset.team || "Unassigned"));
    return Array.from(s).sort();
  }, [baseVisible]);

  const visible = useMemo(
    () =>
      teamFilter === "all" ? baseVisible : baseVisible.filter((o) => (o.asset.team || "Unassigned") === teamFilter),
    [baseVisible, teamFilter],
  );

  const isTicketed = (id: string) => !!ticketForObject(id);
  const selectedObjs = useMemo(() => POOL.filter((o) => selected.has(o.id)), [selected]);
  const drawerObj = expandedId
    ? (visible.find((o) => o.id === expandedId) ?? POOL.find((o) => o.id === expandedId) ?? null)
    : null;
  const dd = expandedId ? drafts[expandedId] : null;

  const sysFor = (o: PoolObj) => drafts[o.id]?.system ?? VIOLATION_CATALOG[violationFor(o)].system;
  const sysCounts = useMemo(() => {
    const sn = selectedObjs.filter((o) => sysFor(o) === "ServiceNow").length;
    return { sn, jira: selectedObjs.length - sn };
  }, [selectedObjs, drafts]);

  const toggle = (id: string) => {
    if (isTicketed(id)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const selectableVisible = visible.filter((o) => !isTicketed(o.id));
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((o) => selected.has(o.id));
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) selectableVisible.forEach((o) => n.delete(o.id));
      else selectableVisible.forEach((o) => n.add(o.id));
      return n;
    });

  const expand = (o: PoolObj) => {
    if (isTicketed(o.id)) return;
    setExpandedId((prev) => (prev === o.id ? null : o.id));
    setDrafts((prev) => (prev[o.id] ? prev : { ...prev, [o.id]: buildDraft(withIssue(o), violationFor(o)) }));
  };

  const patch = (id: string, field: keyof Draft, value: string) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const changeSystem = (id: string, s: string) =>
    setDrafts((prev) => {
      const o = POOL.find((p) => p.id === id);
      return {
        ...prev,
        [id]: { ...prev[id], system: s, fields: o ? systemFields(s, o, violationFor(o)) : prev[id].fields },
      };
    });
  const patchField = (id: string, index: number, value: string) =>
    setDrafts((prev) => {
      const f = prev[id].fields.map((x, i) => (i === index ? { ...x, value } : x));
      return { ...prev, [id]: { ...prev[id], fields: f } };
    });

  const submit = () => {
    const count = selectedObjs.length;
    let sn = 0,
      jira = 0;
    selectedObjs.forEach((o) => {
      const d = drafts[o.id] ?? buildDraft(withIssue(o), violationFor(o));
      if (d.system === "ServiceNow") sn++;
      else jira++;
      addTicket(
        {
          title: d.summary,
          type: ticketType(o.category),
          priority: draftPriority(crsPriority(o.crs)),
          assignee: o.assignee,
          module: moduleFor(o.category),
        },
        {
          objectId: o.id,
          system: d.system as "ServiceNow" | "Jira",
          destination: d.system === "ServiceNow" ? "servicenow" : "default",
          externalId: mockIncidentNumber(),
          reporter: "Security Admin",
          linkedAssets: 1,
        },
      );
    });
    onClose();
    toast.success(count > 1 ? `${fmt(count)} tickets created` : "Ticket created", {
      description: `${sn} in ServiceNow, ${jira} in Jira · one per crypto object`,
      action: { label: "Open Tickets", onClick: () => setCurrentPage("tickets") },
    });
  };

  const scopedTotal = scoped ? VIOLATION_CATALOG[initialViolationId!].total : POOL.length;
  const count = selectedObjs.length;
  const COLS = "30px minmax(0,2.4fr) 46px 1.5fr 58px 1.8fr 24px";

  const envColor = (env: string) =>
    env === "Production" ? "text-coral" : env === "Staging" ? "text-amber" : "text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Ticket className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Remediation triage</h2>
              <span className="text-[11px] text-muted-foreground">
                {scoped
                  ? `${VIOLATION_CATALOG[initialViolationId!].short} · showing ${visible.length} of ${fmt(scopedTotal)}, ranked by CRS`
                  : "One ticket per crypto object, ranked by CRS. Select, review inline, then create."}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cross-type tabs (inventory entry only) */}
        {!scoped && (
          <div className="flex items-center gap-1 px-5 pt-2.5 pb-2 border-b border-border flex-wrap">
            {TABS.map((t) => {
              const activeTab = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${activeTab ? "bg-teal text-primary-foreground border-teal" : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:border-teal/40"}`}
                >
                  {t.label}
                  <span
                    className={`min-w-4 text-center text-[9px] px-1 rounded ${activeTab ? "bg-primary-foreground/20" : "bg-background/60"}`}
                  >
                    {tabCounts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Column header */}
        <div
          className="grid items-center px-4 py-2 border-b border-border text-[10px] text-muted-foreground sticky top-0 bg-card z-10"
          style={{ gridTemplateColumns: COLS }}
        >
          <button
            onClick={toggleAllVisible}
            title="Select all shown"
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${allVisibleSelected ? "bg-teal border-teal" : "border-border hover:border-teal/60"}`}
          >
            {allVisibleSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          </button>
          <span>Crypto object</span>
          <span>CRS</span>
          <span>IT asset</span>
          <span>Env</span>
          <span>Violation</span>
          <span></span>
        </div>

        {/* Group-by / filter */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60">
          <span className="text-[10px] text-muted-foreground">Group by</span>
          <select
            value={teamFilter}
            onChange={(e) => {
              setTeamFilter(e.target.value);
              setExpandedId(null);
            }}
            className="text-[10px] bg-secondary/50 border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          >
            <option value="all">Show all tickets</option>
            {teamsPresent.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {teamFilter !== "all" && (
            <span className="text-[9px] text-muted-foreground">
              routes to <span className="text-foreground">{routingForTeam(teamFilter).assignmentGroup}</span> ·{" "}
              <span className="text-foreground">{routingForTeam(teamFilter).projectKey}</span>
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">
            {visible.length} object{visible.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Rows + drawer */}
        <div className="flex flex-1 min-h-0">
          <div className={`flex-1 overflow-y-auto scrollbar-thin transition-opacity ${drawerObj ? "opacity-45" : ""}`}>
            {visible.length === 0 && (
              <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                No matching objects in the current inventory sample.
              </p>
            )}
            {visible.map((o) => {
              const Icon = CAT_ICON[o.category];
              const ticketed = isTicketed(o.id);
              const isSel = selected.has(o.id);
              const isOpen = expandedId === o.id;
              const d = drafts[o.id];
              const vShort = VIOLATION_CATALOG[violationFor(o)].short;
              const ita = o.itAsset;
              const env = ita?.environment || o.asset.environment;
              return (
                <div key={o.id} className={`border-b border-border/60 ${isOpen ? "bg-secondary/10" : ""}`}>
                  <div
                    onClick={() => expand(o)}
                    className={`grid items-center px-4 py-2 text-[11px] transition-colors ${ticketed ? "opacity-50" : "cursor-pointer hover:bg-secondary/20"} ${isOpen ? "border-l-2 border-l-teal" : "border-l-2 border-l-transparent"}`}
                    style={{ gridTemplateColumns: COLS }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(o.id);
                      }}
                      disabled={ticketed}
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${ticketed ? "bg-teal/30 border-teal/40" : isSel ? "bg-teal border-teal" : "border-border hover:border-teal/60"}`}
                    >
                      {(isSel || ticketed) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </button>
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono text-foreground truncate">{o.name}</span>
                    </span>
                    <span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${crsColor(o.crs)}`}
                      >
                        {o.crs}
                      </span>
                    </span>
                    <span className="min-w-0">
                      {ita ? (
                        <span className="flex flex-col leading-tight min-w-0">
                          <span className="text-foreground truncate">{ita.name}</span>
                          <span className="text-[9px] text-muted-foreground/70 truncate">{ita.type}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">unbound</span>
                      )}
                    </span>
                    <span className={envColor(env)}>
                      {env === "Production" ? "Prod" : env === "Staging" ? "Stg" : "Dev"}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {ticketed ? (
                        <span className="text-teal">Ticket raised</span>
                      ) : (
                        <>
                          {vShort}{" "}
                          <span className="text-muted-foreground/60">
                            · {scoped ? issueFor(o.asset, initialViolationId!) : o.issue}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="flex justify-end">
                      {!ticketed && (
                        <ChevronRight className={`w-3.5 h-3.5 ${isOpen ? "text-teal" : "text-muted-foreground"}`} />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {drawerObj &&
            dd &&
            (() => {
              const accent =
                drawerObj.crs >= 80 ? "hsl(16 72% 51%)" : drawerObj.crs >= 60 ? "hsl(38 78% 51%)" : "hsl(162 72% 42%)";
              const dita = drawerObj.itAsset;
              const denv = dita?.environment || drawerObj.asset.environment;
              return (
                <div
                  className="w-[380px] flex-shrink-0 bg-card flex flex-col animate-in slide-in-from-right-2 duration-150"
                  style={{ borderLeft: `3px solid ${accent}` }}
                >
                  <div className="flex items-start gap-2 px-4 py-3 border-b border-border">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-mono text-foreground truncate">{drawerObj.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${crsColor(drawerObj.crs)}`}
                        >
                          CRS {drawerObj.crs}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {dita ? `${dita.name} · ` : ""}
                          {denv === "Production" ? "Prod" : denv === "Staging" ? "Stg" : "Dev"}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Raise in
                        </span>
                        <div className="inline-flex rounded-md border border-border-strong overflow-hidden">
                          {ITSM_OPTIONS.map((s) => (
                            <button
                              key={s}
                              onClick={() => changeSystem(drawerObj.id, s)}
                              className={`text-[11px] font-medium px-3 py-1 transition-colors ${dd.system === s ? "bg-teal text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {dd.fields.map((f, i) => (
                          <div key={f.label}>
                            <label className="text-[9.5px] text-muted-foreground mb-0.5 block truncate">
                              {f.label}
                            </label>
                            <input
                              value={f.value}
                              onChange={(e) => patchField(drawerObj.id, i, e.target.value)}
                              className="w-full px-2 py-1 bg-muted border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Ticket details
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-teal">
                          <Sparkles className="w-2.5 h-2.5" /> AI drafted
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Summary</label>
                      <input
                        value={dd.summary}
                        onChange={(e) => patch(drawerObj.id, "summary", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground mb-3 focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Description · root cause and remediation
                      </label>
                      <textarea
                        value={dd.description}
                        onChange={(e) => patch(drawerObj.id, "description", e.target.value)}
                        rows={5}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
                    <span className="text-[10px] text-muted-foreground flex-1">Saved to this object's ticket</span>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="text-[11px] font-medium px-3 py-1 rounded-md border border-border text-foreground hover:bg-secondary"
                    >
                      Done
                    </button>
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-border">
          <span className="flex items-center gap-1.5 text-[11px] text-foreground">
            <ShoppingCart className="w-3.5 h-3.5 text-teal" />
            <span className="font-semibold tabular-nums">{count}</span> selected
            {count > 0 && (
              <span className="text-muted-foreground">
                · {sysCounts.sn} ServiceNow, {sysCounts.jira} Jira
              </span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={count === 0}
              className="flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-4 rounded-md bg-teal text-primary-foreground hover:bg-teal-light disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ticket className="w-3 h-3" /> Create {fmt(count)} {count === 1 ? "ticket" : "tickets"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
