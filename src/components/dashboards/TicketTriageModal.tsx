import React, { useState, useMemo } from "react";
import {
  Shield,
  Key,
  Lock,
  Atom,
  Check,
  ChevronRight,
  ChevronLeft,
  Ticket,
  X,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { useNav } from "@/context/NavigationContext";
import { mockAssets, CryptoAsset } from "@/data/mockData";
import { VIOLATION_FILTERS } from "@/lib/filters/cryptoFilters";
import { computeCRS } from "@/lib/risk";
import { addTicket, ticketForObject, mockIncidentNumber } from "@/lib/ticketStore";
import type { TicketDraft } from "@/components/inventory/TicketDraftModal";

const fmt = (n: number) => n.toLocaleString();
type Category = "Certs" | "SSH" | "Secrets" | "PQC";

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
};

const CAT_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  Certs: Shield,
  SSH: Key,
  Secrets: Lock,
  PQC: Atom,
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
}

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
  const ci = o.asset.application || o.asset.infrastructure || o.name;
  if (system === "Jira") {
    return [
      { label: "Project key", value: cfg.jiraProjectKey },
      { label: "Issue type", value: cfg.jiraIssueType },
      { label: "Components", value: o.category },
      { label: "Labels", value: `${v.short.toLowerCase().replace(/\s+/g, "-")} crypto-posture` },
      { label: "Priority", value: jiraPriorityFor(v.severity) },
    ];
  }
  return [
    { label: "Assignment group", value: o.assignee },
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
  { key: "PQC", label: "Quantum" },
];

function AiField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
        {label}
        <Sparkles className="w-2.5 h-2.5 text-teal" />
      </label>
      {children}
    </div>
  );
}

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
  const expanded = !scoped;
  const [tab, setTab] = useState<TabKey>(initialType);
  const [stage, setStage] = useState<"select" | "review">("select");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveId] = useState<string>("");

  const sysCounts = useMemo(() => {
    const vals = Object.values(drafts);
    return {
      sn: vals.filter((d) => d.system === "ServiceNow").length,
      jira: vals.filter((d) => d.system === "Jira").length,
    };
  }, [drafts]);

  const setAllSystem = (s: string) =>
    setDrafts((prev) => {
      const n = { ...prev };
      Object.keys(n).forEach((id) => {
        const o = POOL.find((p) => p.id === id);
        n[id] = { ...n[id], system: s, fields: o ? systemFields(s, o, violationFor(o)) : n[id].fields };
      });
      return n;
    });

  const tabCounts = useMemo(() => {
    const c: Record<TabKey, number> = { All: POOL.length, Certs: 0, SSH: 0, Secrets: 0, PQC: 0 };
    POOL.forEach((o) => {
      c[o.category]++;
    });
    return c;
  }, []);

  // Effective violation for a given pooled object in the current context.
  const violationFor = (o: PoolObj) => (scoped ? initialViolationId! : o.violationId);

  const visible = useMemo(() => {
    if (scoped) return POOL.filter((o) => VIOLATION_CATALOG[initialViolationId!].match(o.asset));
    return tab === "All" ? POOL : POOL.filter((o) => o.category === tab);
  }, [tab, scoped, initialViolationId]);

  const selectedObjs = useMemo(() => POOL.filter((o) => selected.has(o.id)), [selected]);
  const isTicketed = (id: string) => !!ticketForObject(id);

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

  const enterReview = () => {
    const d: Record<string, Draft> = {};
    selectedObjs.forEach((o) => {
      d[o.id] = buildDraft(o, violationFor(o));
    });
    setDrafts(d);
    setActiveId(selectedObjs[0]?.id ?? "");
    setStage("review");
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
      const d = drafts[o.id];
      if (!d) return;
      const vid = violationFor(o);
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

  const active = drafts[activeId];
  const activeObj = selectedObjs.find((o) => o.id === activeId);
  const activeVid = activeObj ? violationFor(activeObj) : "";
  const count = selectedObjs.length;
  const scopedTotal = scoped ? VIOLATION_CATALOG[initialViolationId!].total : POOL.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[86vh] flex flex-col shadow-2xl"
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
              <span className="text-[10px] text-teal">
                {stage === "select" ? "Step 1 · Select objects" : "Step 2 · Review AI-drafted tickets"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stage === "select"
                ? "One ticket per crypto object, ranked by CRS. Build a batch, then review."
                : "AI has drafted each ticket. Review and edit any field, set the ticketing system per ticket, then create."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {stage === "select" && (
          <>
            <div className="flex items-center gap-1 px-5 pt-2.5 pb-2 border-b border-border flex-wrap">
              {expanded ? (
                TABS.map((t) => {
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
                })
              ) : (
                <>
                  <span className="text-[11px] font-medium text-foreground">
                    {VIOLATION_CATALOG[initialViolationId!].short}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · showing {visible.length} of {fmt(scopedTotal)}, ranked by CRS
                  </span>
                </>
              )}
              <button
                onClick={toggleAllVisible}
                className="ml-auto flex items-center gap-1.5 text-[10px] text-foreground"
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${allVisibleSelected ? "bg-teal border-teal" : "border-border"}`}
                >
                  {allVisibleSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </span>
                Select all shown
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {visible.length === 0 ? (
                <p className="px-5 py-8 text-center text-[11px] text-muted-foreground">
                  No matching objects in the current inventory sample.
                </p>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="text-left px-2 py-2 font-medium">Crypto object</th>
                      <th className="text-left px-2 py-2 font-medium w-14">CRS</th>
                      <th className="text-left px-2 py-2 font-medium w-24">Type</th>
                      <th className="text-left px-2 py-2 font-medium">Violation</th>
                      <th className="text-left px-2 py-2 font-medium w-28">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((o) => {
                      const Icon = CAT_ICON[o.category];
                      const ticketed = isTicketed(o.id);
                      const isSel = selected.has(o.id);
                      const vShort = VIOLATION_CATALOG[violationFor(o)].short;
                      return (
                        <tr
                          key={o.id}
                          onClick={() => toggle(o.id)}
                          className={`border-b border-border/50 transition-colors ${ticketed ? "opacity-50 cursor-default" : `cursor-pointer ${isSel ? "bg-teal/[0.04]" : "hover:bg-secondary/30"}`}`}
                        >
                          <td className="px-3 py-2">
                            {ticketed ? (
                              <Check className="w-3.5 h-3.5 text-teal" />
                            ) : (
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSel ? "bg-teal border-teal" : "border-border"}`}
                              >
                                {isSel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-foreground font-mono truncate max-w-[190px]">{o.name}</td>
                          <td className="px-2 py-2">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${crsColor(o.crs)}`}
                            >
                              {o.crs}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Icon className="w-3 h-3" />
                              {o.category}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">
                            {ticketed ? (
                              <span className="text-teal">Ticket raised</span>
                            ) : (
                              <>
                                {vShort} <span className="text-muted-foreground/60">· {o.issue}</span>
                              </>
                            )}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground font-mono">{o.assignee}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center gap-3 px-5 py-3 border-t border-border">
              <span className="flex items-center gap-1.5 text-[11px] text-foreground">
                <ShoppingCart className="w-3.5 h-3.5 text-teal" />
                <span className="font-semibold tabular-nums">{count}</span> selected
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={enterReview}
                  disabled={count === 0}
                  className="flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-4 rounded-md bg-teal text-primary-foreground hover:bg-teal-light disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review {fmt(count)} {count === 1 ? "ticket" : "tickets"} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}

        {stage === "review" && (
          <>
            <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-secondary/20">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Ticketing system
              </span>
              <span className="text-[10px] text-muted-foreground">defaults from each policy · override per ticket</span>
              <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="text-foreground">
                  {sysCounts.sn} ServiceNow · {sysCounts.jira} Jira
                </span>
                <span className="text-muted-foreground/50">set all:</span>
                {ITSM_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAllSystem(s)}
                    className="px-1.5 py-0.5 rounded border border-border hover:text-foreground hover:border-teal/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </span>
            </div>

            <div className="flex-1 overflow-hidden flex">
              <div className="w-56 flex-shrink-0 border-r border-border overflow-y-auto scrollbar-thin">
                {selectedObjs.map((o) => {
                  const Icon = CAT_ICON[o.category];
                  return (
                    <button
                      key={o.id}
                      onClick={() => setActiveId(o.id)}
                      className={`w-full text-left px-3 py-2 border-b border-border/50 transition-colors ${activeId === o.id ? "bg-teal/[0.06] border-l-2 border-l-teal" : "hover:bg-secondary/30 border-l-2 border-l-transparent"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-1 py-0.5 rounded text-[9px] font-semibold tabular-nums ${crsColor(o.crs)}`}
                        >
                          {o.crs}
                        </span>
                        <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-[10.5px] font-mono text-foreground truncate flex-1">{o.name}</span>
                        {drafts[o.id] && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">
                            {drafts[o.id].system === "ServiceNow" ? "SNOW" : "Jira"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
                {active && activeObj && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] text-muted-foreground">Ticket for</span>
                      <span className="text-[11px] font-mono text-foreground">{activeObj.name}</span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${crsColor(activeObj.crs)}`}
                      >
                        CRS {activeObj.crs}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-secondary/30 border border-border">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Raise in
                      </span>
                      <div className="inline-flex rounded-md border border-border overflow-hidden">
                        {ITSM_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => changeSystem(activeId, s)}
                            className={`text-[11px] font-medium px-3 py-1 transition-colors ${active.system === s ? "bg-teal text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        policy default: {VIOLATION_CATALOG[activeVid].system}
                      </span>
                    </div>
                    <AiField label="Name">
                      <input
                        value={active.summary}
                        onChange={(e) => patch(activeId, "summary", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    </AiField>
                    <AiField label="Description (root cause and remediation)">
                      <textarea
                        value={active.description}
                        onChange={(e) => patch(activeId, "description", e.target.value)}
                        rows={6}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    </AiField>
                    <div className="mb-3">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
                        {active.system} fields{" "}
                        <span className="text-muted-foreground/60 normal-case">· from policy configuration</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {active.fields.map((f, i) => (
                          <div key={f.label}>
                            <label className="text-[9.5px] text-muted-foreground mb-0.5 block">{f.label}</label>
                            <input
                              value={f.value}
                              onChange={(e) => patchField(activeId, i, e.target.value)}
                              className="w-full px-2 py-1 bg-muted border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
                        References
                      </label>
                      <p className="text-[10.5px] text-muted-foreground">
                        Policy: {VIOLATION_CATALOG[activeVid].policy} · {VIOLATION_CATALOG[activeVid].framework} ·
                        System: {active.system}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-3 border-t border-border">
              <button
                onClick={() => setStage("select")}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3 h-3" /> Back to selection
              </button>
              <span className="text-[10px] text-muted-foreground">
                AI-drafted fields marked <Sparkles className="inline w-2.5 h-2.5 text-teal" /> · {sysCounts.sn}{" "}
                ServiceNow, {sysCounts.jira} Jira
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
                  className="flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-4 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"
                >
                  <Ticket className="w-3 h-3" /> Create {fmt(count)} {count === 1 ? "ticket" : "tickets"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
