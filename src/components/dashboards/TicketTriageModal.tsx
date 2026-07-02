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

const fmt = (n: number) => n.toLocaleString();

// ── Violation catalog (MVP-discoverable only) ───────────────────────────────
type Category = "Certs" | "SSH" | "Secrets" | "PQC";

interface Violation {
  id: string;
  category: Category;
  short: string;
  severity: "P1" | "P2" | "P3";
  total: number;
  teams: string[];
  policy: string;
  source: string;
  system: "ServiceNow" | "Jira"; // ITSM target configured on the policy
  framework: string;
}

export const VIOLATION_CATALOG: Record<string, Violation> = {
  "1": {
    id: "1",
    category: "Certs",
    short: "Expiring 7d",
    severity: "P1",
    total: 186,
    teams: ["infra-ops", "app-team", "platform-eng"],
    policy: "OOB: Certificate expiry threshold",
    source: "CA Scan",
    system: "ServiceNow",
    framework: "CA/Browser Forum · NIST SP 1800-16",
  },
  expired: {
    id: "expired",
    category: "Certs",
    short: "Expired",
    severity: "P1",
    total: 48,
    teams: ["app-team", "infra-ops"],
    policy: "OOB: No expired certificates in production",
    source: "CA Scan",
    system: "ServiceNow",
    framework: "CA/Browser Forum",
  },
  "6": {
    id: "6",
    category: "Certs",
    short: "Weak algorithm",
    severity: "P2",
    total: 52,
    teams: ["infra-platform", "dev-platform"],
    policy: "OOB: Approved algorithms and key sizes",
    source: "CA Scan",
    system: "ServiceNow",
    framework: "NIST SP 800-131A",
  },
  "3": {
    id: "3",
    category: "SSH",
    short: "Suspicious",
    severity: "P1",
    total: 44,
    teams: ["infra-ops", "dev-platform"],
    policy: "OOB: SSH key anomaly detection",
    source: "Network Scan",
    system: "Jira",
    framework: "NIST SP 800-53 AC-17",
  },
  "9": {
    id: "9",
    category: "SSH",
    short: "Rogue",
    severity: "P3",
    total: 18,
    teams: ["infra-ops", "platform-eng"],
    policy: "OOB: Managed SSH key provenance",
    source: "Network Scan",
    system: "Jira",
    framework: "NIST SP 800-53 AC-17",
  },
  "8": {
    id: "8",
    category: "Secrets",
    short: "Unrotated 90d+",
    severity: "P2",
    total: 1250,
    teams: ["platform-eng", "cloud-eng", "data-eng"],
    policy: "OOB: Secret rotation interval",
    source: "Key Store Discovery",
    system: "Jira",
    framework: "NIST SP 800-57",
  },
  orphaned: {
    id: "orphaned",
    category: "Secrets",
    short: "Orphaned",
    severity: "P3",
    total: 445,
    teams: ["platform-eng", "cloud-eng"],
    policy: "OOB: Owned crypto objects only",
    source: "Key Store Discovery",
    system: "Jira",
    framework: "NIST SP 800-53 AC-2",
  },
  "pqc-1": {
    id: "pqc-1",
    category: "PQC",
    short: "RSA-2048 post-2030",
    severity: "P2",
    total: 847,
    teams: ["payments-eng", "security-eng"],
    policy: "OOB: Quantum-vulnerable algorithm in use",
    source: "CBOM Ingestion",
    system: "ServiceNow",
    framework: "NIST IR 8547",
  },
};

const CAT_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  Certs: Shield,
  SSH: Key,
  Secrets: Lock,
  PQC: Atom,
};

// ── Object pool ─────────────────────────────────────────────────────────────
interface PoolObj {
  id: string;
  name: string;
  crs: number;
  category: Category;
  violationId: string;
  issue: string;
  assignee: string;
}

const CERT_HOSTS = ["payments", "api", "auth", "vault", "mail", "cdn", "gateway", "portal", "identity", "billing"];
const SSH_HOSTS = ["prod-db", "app-svr", "bastion", "ci-runner", "k8s-node", "vault-svr", "deploy", "jump"];
const SECRET_NS = ["payments", "platform", "data", "cloud"];
const SECRET_KIND = ["api-key", "db-cred", "signing-key", "service-token"];

function objName(cat: Category, i: number): string {
  if (cat === "SSH") return `${SSH_HOSTS[i % SSH_HOSTS.length]}-0${(i % 9) + 1}-key`;
  if (cat === "Secrets") return `vault:secret/${SECRET_NS[i % 4]}/${SECRET_KIND[i % 4]}-${i + 1}`;
  const host = CERT_HOSTS[i % CERT_HOSTS.length];
  return i % 3 === 0 ? `*.${host}.acmecorp.com` : `${host}.acmecorp.com`;
}

function objIssue(v: Violation, i: number): string {
  switch (v.id) {
    case "1":
      return `expires in ${[2, 3, 4, 5, 6][i % 5]}d`;
    case "expired":
      return `expired ${[2, 4, 6, 9][i % 4]}d ago`;
    case "6":
      return i % 2 === 0 ? "RSA-1024 key" : "SHA-1 signature";
    case "pqc-1":
      return "RSA-2048 · valid to 2032";
    case "3":
      return `anomalous login · ${["prod", "staging"][i % 2]}`;
    case "9":
      return "unmanaged · filesystem key";
    case "8":
      return `unrotated ${90 + i * 7}d`;
    case "orphaned":
      return "owner left org";
    default:
      return "";
  }
}

// Deterministic cross-type pool: up to 8 representative objects per violation.
const POOL: PoolObj[] = (() => {
  const out: PoolObj[] = [];
  Object.values(VIOLATION_CATALOG).forEach((v) => {
    const show = Math.min(v.total, 8);
    const band = v.severity === "P1" ? 97 : v.severity === "P2" ? 74 : 52;
    for (let i = 0; i < show; i++) {
      out.push({
        id: `${v.id}-o${i}`,
        name: objName(v.category, i),
        crs: Math.max(14, band - i * 5 - (i % 2)),
        category: v.category,
        violationId: v.id,
        issue: objIssue(v, i),
        assignee: v.teams[i % v.teams.length],
      });
    }
  });
  return out.sort((a, b) => b.crs - a.crs);
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

interface Draft {
  summary: string;
  priority: string;
  assignee: string;
  description: string;
  remediation: string;
}

function draftSummary(o: PoolObj): string {
  switch (o.violationId) {
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
function draftRemediation(id: string): string {
  switch (id) {
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
function buildDraft(o: PoolObj, system: string): Draft {
  const v = VIOLATION_CATALOG[o.violationId];
  return {
    summary: draftSummary(o),
    priority: crsPriority(o.crs),
    assignee: o.assignee,
    description: `Object: ${o.name} (${o.category}). Issue: ${o.issue}. CRS score: ${o.crs} (${crsPriority(o.crs)}). Owning team: ${o.assignee}. Discovered via ${v.source}. Violates policy "${v.policy}" (${v.framework}). Raise in ${system} per policy configuration.`,
    remediation: draftRemediation(o.violationId),
  };
}

const PRIORITY_OPTIONS = ["P1 · Critical", "P2 · High", "P3 · Moderate"];
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

// ── Triage modal ────────────────────────────────────────────────────────────
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
  const [system, setSystem] = useState<string>(() =>
    initialViolationId ? VIOLATION_CATALOG[initialViolationId].system : "ServiceNow",
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialViolationId ? POOL.filter((o) => o.violationId === initialViolationId).map((o) => o.id) : []),
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveId] = useState<string>("");

  const tabCounts = useMemo(() => {
    const c: Record<TabKey, number> = { All: POOL.length, Certs: 0, SSH: 0, Secrets: 0, PQC: 0 };
    POOL.forEach((o) => {
      c[o.category]++;
    });
    return c;
  }, []);

  const visible = useMemo(() => {
    if (scoped && !expanded) return POOL.filter((o) => o.violationId === initialViolationId);
    return tab === "All" ? POOL : POOL.filter((o) => o.category === tab);
  }, [tab, expanded, scoped, initialViolationId]);
  const selectedObjs = useMemo(() => POOL.filter((o) => selected.has(o.id)), [selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.id));
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) visible.forEach((o) => n.delete(o.id));
      else visible.forEach((o) => n.add(o.id));
      return n;
    });

  const enterReview = () => {
    const d: Record<string, Draft> = {};
    selectedObjs.forEach((o) => {
      d[o.id] = buildDraft(o, system);
    });
    setDrafts(d);
    setActiveId(selectedObjs[0]?.id ?? "");
    setStage("review");
  };

  // Keep the target-system line in descriptions in sync if the user flips ITSM.
  const changeSystem = (s: string) => {
    setSystem(s);
    setDrafts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        const o = POOL.find((p) => p.id === id);
        if (o)
          next[id] = {
            ...next[id],
            description: next[id].description.replace(
              /Raise in \w+ per policy configuration\./,
              `Raise in ${s} per policy configuration.`,
            ),
          };
      });
      return next;
    });
  };

  const patch = (id: string, field: keyof Draft, value: string) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const submit = () => {
    const count = selectedObjs.length;
    onClose();
    toast.success(count > 1 ? `${fmt(count)} ${system} tickets created` : `${system} ticket created`, {
      description: "One ticket per crypto object · view in Tickets",
      action: { label: "Open Tickets", onClick: () => setCurrentPage("tickets") },
    });
  };

  const active = drafts[activeId];
  const activeObj = selectedObjs.find((o) => o.id === activeId);
  const count = selectedObjs.length;

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
                ? "One ticket per crypto object, ranked by CRS across types. Build a batch, then review."
                : "AI has drafted each ticket. Review and edit any field, choose the ticketing system, then create."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {stage === "select" && (
          <>
            {/* Scope bar: tabs when cross-type, quiet header when opened from a single violation */}
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
                    {initialViolationId ? VIOLATION_CATALOG[initialViolationId].short : "Selected"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">· {visible.length} objects, ranked by CRS</span>
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

            {/* Object list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
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
                    const isSel = selected.has(o.id);
                    const v = VIOLATION_CATALOG[o.violationId];
                    return (
                      <tr
                        key={o.id}
                        onClick={() => toggle(o.id)}
                        className={`border-b border-border/50 cursor-pointer transition-colors ${isSel ? "bg-teal/[0.04]" : "hover:bg-secondary/30"}`}
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSel ? "bg-teal border-teal" : "border-border"}`}
                          >
                            {isSel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </span>
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
                          {v.short} <span className="text-muted-foreground/60">· {o.issue}</span>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground font-mono">{o.assignee}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer with cart */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-border">
              <span className="flex items-center gap-1.5 text-[11px] text-foreground">
                <ShoppingCart className="w-3.5 h-3.5 text-teal" />
                <span className="font-semibold tabular-nums">{count}</span> selected across all types
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
            {/* ITSM selector */}
            <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-secondary/20">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Ticketing system
              </span>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                {ITSM_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSystem(s)}
                    className={`text-[11px] font-medium px-3 py-1 transition-colors ${system === s ? "bg-teal text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {fmt(count)} tickets across {new Set(selectedObjs.map((o) => o.category)).size} types
              </span>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Left: cart */}
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
                        <span className="text-[10.5px] font-mono text-foreground truncate">{o.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: editable draft */}
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
                    <AiField label="Summary">
                      <input
                        value={active.summary}
                        onChange={(e) => patch(activeId, "summary", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    </AiField>
                    <div className="grid grid-cols-2 gap-3">
                      <AiField label="Priority">
                        <select
                          value={active.priority}
                          onChange={(e) => patch(activeId, "priority", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </AiField>
                      <AiField label="Assignee team">
                        <input
                          value={active.assignee}
                          onChange={(e) => patch(activeId, "assignee", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-teal"
                        />
                      </AiField>
                    </div>
                    <AiField label="Description">
                      <textarea
                        value={active.description}
                        onChange={(e) => patch(activeId, "description", e.target.value)}
                        rows={3}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    </AiField>
                    <AiField label="Suggested remediation">
                      <textarea
                        value={active.remediation}
                        onChange={(e) => patch(activeId, "remediation", e.target.value)}
                        rows={3}
                        className="w-full px-2.5 py-1.5 bg-muted border border-border rounded text-[11px] text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-teal"
                      />
                    </AiField>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
                        References
                      </label>
                      <p className="text-[10.5px] text-muted-foreground">
                        Policy: {VIOLATION_CATALOG[activeObj.violationId].policy} ·{" "}
                        {VIOLATION_CATALOG[activeObj.violationId].framework} · Source:{" "}
                        {VIOLATION_CATALOG[activeObj.violationId].source} · System: {system}
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
                AI-drafted fields marked <Sparkles className="inline w-2.5 h-2.5 text-teal" /> · edits apply per ticket
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
                  <Ticket className="w-3 h-3" /> Create {fmt(count)} {system} {count === 1 ? "ticket" : "tickets"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
