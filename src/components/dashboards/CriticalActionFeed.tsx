import React, { useState, useMemo } from "react";
import {
  Shield,
  Key,
  Lock,
  AlertTriangle,
  Clock,
  Check,
  ChevronRight,
  Ticket,
  Atom,
  Radar,
  X,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboard, feedItemToDriver } from "@/context/DashboardContext";
import { useNav } from "@/context/NavigationContext";
import { VIOLATION_FILTERS } from "@/lib/filters/cryptoFilters";

const fmt = (n: number) => n.toLocaleString();

interface GroupRow {
  name: string;
  count: number;
  team: string;
}

interface ActionItem {
  id: string;
  category: "Certs" | "SSH" | "Secrets" | "PQC";
  icon: React.ComponentType<{ className?: string }>;
  severity: "P1" | "P2" | "P3";
  title: string;
  detail: string;
  filterId?: string;
  ageMins: number;
  teams: string[]; // owning teams, used to route per-object tickets
  total: number; // number of affected crypto objects
  isPqc?: boolean;
}

// MVP-discoverable violations only. No code-repo secret scanning, code signing, or K8s remediation.
const FEED: ActionItem[] = [
  {
    id: "1",
    category: "Certs",
    icon: Shield,
    severity: "P1",
    title: `${fmt(VIOLATION_FILTERS.cert_expiring_7d.enterpriseCount)} certificates expiring in 7 days`,
    detail: "No auto-renewal configured · dependent services impacted",
    filterId: "cert_expiring_7d",
    ageMins: 12,
    teams: ["infra-ops", "app-team", "platform-eng"],
    total: 186,
  },
  {
    id: "expired",
    category: "Certs",
    icon: Shield,
    severity: "P1",
    title: `${fmt(VIOLATION_FILTERS.cert_expired.enterpriseCount)} certificates already expired`,
    detail: "Live endpoints · immediate outage and trust-failure risk",
    filterId: "cert_expired",
    ageMins: 40,
    teams: ["app-team", "infra-ops"],
    total: 48,
  },
  {
    id: "6",
    category: "Certs",
    icon: Shield,
    severity: "P2",
    title: `${fmt(VIOLATION_FILTERS.cert_weak_algo.enterpriseCount)} certificates use weak algorithms`,
    detail: "RSA-1024 / SHA-1 · re-issue on compliant algorithm required",
    filterId: "cert_weak_algo",
    ageMins: 240,
    teams: ["infra-platform", "dev-platform"],
    total: 52,
  },
  {
    id: "3",
    category: "SSH",
    icon: Key,
    severity: "P1",
    title: `${fmt(VIOLATION_FILTERS.ssh_suspicious.enterpriseCount)} suspicious SSH keys with shell access`,
    detail: "Anomalous login patterns · production hosts",
    filterId: "ssh_suspicious",
    ageMins: 95,
    teams: ["infra-ops", "dev-platform"],
    total: 44,
  },
  {
    id: "9",
    category: "SSH",
    icon: Key,
    severity: "P3",
    title: `${fmt(VIOLATION_FILTERS.ssh_rogue.enterpriseCount)} rogue SSH keys not provisioned by platform`,
    detail: "Found in filesystem and vault keystores · move under managed SSH CA",
    filterId: "ssh_rogue",
    ageMins: 720,
    teams: ["infra-ops", "platform-eng"],
    total: 18,
  },
  {
    id: "8",
    category: "Secrets",
    icon: Lock,
    severity: "P2",
    title: `${fmt(VIOLATION_FILTERS.secret_unrotated_90d.enterpriseCount)} secrets not rotated in 90+ days`,
    detail: "HashiCorp Vault, CyberArk Conjur, and HSM scope · production",
    filterId: "secret_unrotated_90d",
    ageMins: 480,
    teams: ["platform-eng", "cloud-eng", "data-eng"],
    total: 1250,
  },
  {
    id: "orphaned",
    category: "Secrets",
    icon: Lock,
    severity: "P3",
    title: `${fmt(VIOLATION_FILTERS.secret_orphaned.enterpriseCount)} orphaned secrets with no active owner`,
    detail: "No active owner · rotation and revocation blocked until reassigned",
    filterId: "secret_orphaned",
    ageMins: 1440,
    teams: ["platform-eng", "cloud-eng"],
    total: 445,
  },
  {
    id: "pqc-1",
    category: "PQC",
    icon: Atom,
    severity: "P2",
    title: "847 production certs use RSA-2048 and expire after 2030",
    detail: "Post-NIST-deadline exposure · deprecate by 2030, disallow by 2035",
    filterId: "cert_weak_algo",
    ageMins: 60,
    isPqc: true,
    teams: ["payments-eng", "security-eng"],
    total: 847,
  },
];

const SEV_STYLES: Record<ActionItem["severity"], string> = {
  P1: "bg-coral/15 text-coral border-coral/30",
  P2: "bg-amber/15 text-amber border-amber/30",
  P3: "bg-purple/15 text-purple border-purple/30",
};

const CATEGORY_SOURCE: Record<ActionItem["category"], string> = {
  Certs: "CA Scan",
  SSH: "Network Scan",
  Secrets: "Key Store Discovery",
  PQC: "CBOM Ingestion",
};

function ageLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

// CRS badge color band, consistent with the app severity palette.
function crsColor(score: number) {
  if (score >= 80) return "bg-coral/15 text-coral";
  if (score >= 60) return "bg-amber/15 text-amber";
  if (score >= 40) return "bg-purple/15 text-purple-light";
  return "bg-secondary text-muted-foreground";
}

// ── Per-object sample generation (prototype) ────────────────────────────────
interface ObjRow {
  id: string;
  name: string;
  crs: number;
  detail: string;
  assignee: string;
}

const CERT_HOSTS = [
  "payments",
  "api",
  "auth",
  "vault",
  "mail",
  "cdn",
  "gateway",
  "portal",
  "identity",
  "billing",
  "checkout",
  "edge",
  "internal",
  "sso",
];
const SSH_HOSTS = [
  "prod-db",
  "app-svr",
  "bastion",
  "ci-runner",
  "k8s-node",
  "vault-svr",
  "deploy",
  "jump",
  "build",
  "cache",
  "queue",
  "metrics",
  "log",
  "proxy",
];
const SECRET_NS = ["payments", "platform", "data", "cloud"];
const SECRET_KIND = ["api-key", "db-cred", "signing-key", "service-token"];

function objName(item: ActionItem, i: number): string {
  if (item.category === "SSH") return `${SSH_HOSTS[i % SSH_HOSTS.length]}-0${(i % 9) + 1}-key`;
  if (item.category === "Secrets") return `vault:secret/${SECRET_NS[i % 4]}/${SECRET_KIND[i % 4]}-${i + 1}`;
  const host = CERT_HOSTS[i % CERT_HOSTS.length];
  return i % 3 === 0 ? `*.${host}.acmecorp.com` : `${host}.acmecorp.com`;
}

function objDetail(item: ActionItem, i: number): string {
  switch (item.id) {
    case "1":
      return `expires in ${[2, 3, 4, 5, 6][i % 5]}d · RSA-2048`;
    case "expired":
      return `expired ${[2, 4, 6, 9][i % 4]}d ago · live endpoint`;
    case "6":
      return i % 2 === 0 ? "RSA-1024 key" : "SHA-1 signature";
    case "pqc-1":
      return "RSA-2048 · valid to 2032";
    case "3":
      return `anomalous login · ${["production", "staging"][i % 2]} host`;
    case "9":
      return "unmanaged · filesystem key";
    case "8":
      return `unrotated ${90 + i * 7}d`;
    case "orphaned":
      return "owner left org · rotation blocked";
    default:
      return "";
  }
}

function buildObjects(item: ActionItem): ObjRow[] {
  const show = Math.min(item.total, 14);
  const band = item.severity === "P1" ? 97 : item.severity === "P2" ? 74 : 52;
  const rows: ObjRow[] = [];
  for (let i = 0; i < show; i++) {
    const crs = Math.max(14, band - i * 4 - (i % 2));
    rows.push({
      id: `${item.id}-o${i}`,
      name: objName(item, i),
      crs,
      detail: objDetail(item, i),
      assignee: item.teams[i % item.teams.length],
    });
  }
  return rows;
}

// ── Ticket review modal ─────────────────────────────────────────────────────
function TicketReviewModal({
  item,
  onClose,
  onSubmit,
  onViewInventory,
}: {
  item: ActionItem;
  onClose: () => void;
  onSubmit: (count: number) => void;
  onViewInventory: () => void;
}) {
  const rows = useMemo(() => buildObjects(item), [item]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.map((r) => r.id)));
  const [allMatching, setAllMatching] = useState(false);

  const toggle = (id: string) => {
    setAllMatching(false);
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const allShownSelected = selected.size === rows.length;
  const toggleAllShown = () => {
    setAllMatching(false);
    setSelected(allShownSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const ticketCount = allMatching ? item.total : selected.size;
  const Icon = item.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[82vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}>
                {item.severity}
              </span>
              <span className="text-[10px] text-muted-foreground">{item.category}</span>
              <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                <Radar className="w-2.5 h-2.5" /> {CATEGORY_SOURCE[item.category]}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Review objects and select which to raise tickets for. One ticket per object, ranked by CRS score.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Select controls */}
        <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-secondary/20">
          <button onClick={toggleAllShown} className="flex items-center gap-2 text-[11px] text-foreground">
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${allShownSelected && !allMatching ? "bg-teal border-teal" : "border-border"}`}
            >
              {allShownSelected && !allMatching && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
            </span>
            Select all shown
          </button>
          <span className="text-[10px] text-muted-foreground">
            Showing top {rows.length} of {fmt(item.total)} by CRS score
          </span>
          {item.total > rows.length && (
            <button
              onClick={() => setAllMatching((v) => !v)}
              className={`text-[10px] ml-auto px-2 py-0.5 rounded border transition-colors ${allMatching ? "border-teal text-teal bg-teal/10" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {allMatching ? `All ${fmt(item.total)} matching selected` : `Select all ${fmt(item.total)} matching`}
            </button>
          )}
        </div>

        {/* Object rows */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr className="text-muted-foreground">
                <th className="w-8 px-3 py-2"></th>
                <th className="text-left px-2 py-2 font-medium">Crypto object</th>
                <th className="text-left px-2 py-2 font-medium w-16">CRS</th>
                <th className="text-left px-2 py-2 font-medium">Issue</th>
                <th className="text-left px-2 py-2 font-medium w-28">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isSel = allMatching || selected.has(r.id);
                return (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${isSel ? "bg-teal/[0.04]" : "hover:bg-secondary/30"}`}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSel ? "bg-teal border-teal" : "border-border"}`}
                      >
                        {isSel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-foreground font-mono truncate max-w-[200px]">{r.name}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${crsColor(r.crs)}`}
                      >
                        {r.crs}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{r.detail}</td>
                    <td className="px-2 py-2 text-muted-foreground font-mono">{r.assignee}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-border">
          <button
            onClick={onViewInventory}
            className="text-[11px] text-muted-foreground hover:text-teal flex items-center gap-0.5"
          >
            View all in inventory <ArrowUpRight className="w-2.5 h-2.5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(ticketCount)}
              disabled={ticketCount === 0}
              className="flex items-center gap-1.5 text-[11px] font-semibold py-1.5 px-4 rounded-md bg-teal text-primary-foreground hover:bg-teal-light disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ticket className="w-3 h-3" /> Create {fmt(ticketCount)} {ticketCount === 1 ? "ticket" : "tickets"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feed ────────────────────────────────────────────────────────────────────
type FilterKey = "All" | "Certificates" | "Secrets" | "SSH Keys" | "Quantum";

const FILTER_MAP: Record<FilterKey, ActionItem["category"][] | null> = {
  All: null,
  Certificates: ["Certs"],
  Secrets: ["Secrets"],
  "SSH Keys": ["SSH"],
  Quantum: ["PQC"],
};

const FILTERS: FilterKey[] = ["All", "Certificates", "SSH Keys", "Secrets", "Quantum"];

export default function CriticalActionFeed() {
  const { hoveredDriver, resolvedFeedItems, resolveFeedItem } = useDashboard();
  const { setCurrentPage, setFilters } = useNav();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [reviewItem, setReviewItem] = useState<ActionItem | null>(null);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { All: 0, Certificates: 0, Secrets: 0, "SSH Keys": 0, Quantum: 0 };
    FEED.forEach((item) => {
      c["All"]++;
      (Object.keys(FILTER_MAP) as FilterKey[]).forEach((k) => {
        const cats = FILTER_MAP[k];
        if (cats && cats.includes(item.category)) c[k]++;
      });
    });
    return c;
  }, []);

  const items = useMemo(() => {
    const cats = FILTER_MAP[filter];
    const filtered = cats ? FEED.filter((i) => cats.includes(i.category)) : FEED;
    const decorated = filtered.map((item) => ({
      ...item,
      highlighted: hoveredDriver != null && feedItemToDriver[item.id] === hoveredDriver,
      isQueued: resolvedFeedItems.has(item.id),
    }));
    return [...decorated.filter((i) => !i.isQueued), ...decorated.filter((i) => i.isQueued)];
  }, [hoveredDriver, resolvedFeedItems, filter]);

  const openInventory = (filterId?: string) => {
    setFilters({ tab: "identities", filterId: filterId || "" });
    setCurrentPage("inventory");
  };

  const handleSubmit = (item: ActionItem, count: number) => {
    resolveFeedItem(item.id);
    setReviewItem(null);
    toast.success(count > 1 ? `${fmt(count)} ServiceNow tickets created` : "ServiceNow ticket created", {
      description: "One ticket per crypto object · view in Tickets",
      action: { label: "Open Tickets", onClick: () => setCurrentPage("tickets") },
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      <div className="px-4 pt-4 pb-2.5 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <h2 className="text-sm font-semibold text-foreground">Critical Action Feed</h2>
            <span className="truncate text-[10px] text-muted-foreground">
              · ranked by impact × urgency · click a row to review and raise tickets
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {filter === "All" ? `${FEED.length} items` : `${items.length} of ${FEED.length}`}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? "bg-teal text-primary-foreground border-teal shadow-[0_0_0_2px_hsl(var(--teal)/0.15)]"
                    : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:border-teal/40"
                }`}
              >
                {f}
                <span
                  className={`min-w-4 text-center text-[9px] px-1 rounded ${active ? "bg-primary-foreground/20" : "bg-background/60"}`}
                >
                  {counts[f]}
                </span>
              </button>
            );
          })}
          {filter !== "All" && (
            <button
              onClick={() => setFilter("All")}
              className="text-[10px] text-muted-foreground hover:text-coral underline-offset-2 hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = item.icon;
            const isQueued = item.isQueued;
            return (
              <li
                key={item.id}
                className={`transition-all border-l-2 ${
                  isQueued
                    ? "bg-secondary/20 border-l-teal/40 opacity-70"
                    : item.highlighted
                      ? "bg-coral/[0.03] border-l-coral"
                      : "border-l-transparent hover:bg-secondary/20"
                }`}
              >
                <button
                  onClick={() => !isQueued && setReviewItem(item)}
                  disabled={isQueued}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 disabled:cursor-default"
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isQueued ? "bg-teal/20" : "bg-secondary/60"
                    }`}
                  >
                    {isQueued ? <Check className="w-3 h-3 text-teal" /> : <Icon className="w-3 h-3 text-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground">{item.category}</span>
                      <span className="text-[9.5px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {ageLabel(item.ageMins)} ago
                      </span>
                      <span
                        className="text-[9.5px] text-muted-foreground/70 flex items-center gap-0.5"
                        title="Discovery source"
                      >
                        <Radar className="w-2.5 h-2.5" /> {CATEGORY_SOURCE[item.category]}
                      </span>
                      {isQueued && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-teal/15 text-teal flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Tickets raised
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] font-medium text-foreground leading-snug">{item.title}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                  {!isQueued && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />}
                </button>

                {isQueued && (
                  <p className="px-5 pb-2 ml-10 text-[10px] text-teal">
                    Tickets raised in ServiceNow · one per object · view in Tickets
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {reviewItem && (
        <TicketReviewModal
          item={reviewItem}
          onClose={() => setReviewItem(null)}
          onSubmit={(count) => handleSubmit(reviewItem, count)}
          onViewInventory={() => {
            openInventory(reviewItem.filterId);
            setReviewItem(null);
          }}
        />
      )}
    </div>
  );
}
