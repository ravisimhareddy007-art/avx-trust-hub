import React, { useState, useMemo } from "react";
import { Shield, Key, Lock, AlertTriangle, Clock, Check, ChevronRight, Atom } from "lucide-react";
import { useDashboard, feedItemToDriver } from "@/context/DashboardContext";
import { VIOLATION_FILTERS } from "@/lib/filters/cryptoFilters";
import TicketTriageModal from "./TicketTriageModal";

const fmt = (n: number) => n.toLocaleString();
type Category = "Certs" | "SSH" | "Secrets" | "PQC";

interface ActionItem {
  id: string;
  category: Category;
  icon: React.ComponentType<{ className?: string }>;
  severity: "P1" | "P2" | "P3";
  title: string;
  detail: string;
  ageMins: number;
}

const FEED: ActionItem[] = [
  {
    id: "1",
    category: "Certs",
    icon: Shield,
    severity: "P1",
    title: `${fmt(VIOLATION_FILTERS.cert_expiring_7d.enterpriseCount)} certificates expiring in 7 days`,
    detail: "No auto-renewal configured · dependent services impacted",
    ageMins: 12,
  },
  {
    id: "expired",
    category: "Certs",
    icon: Shield,
    severity: "P1",
    title: `${fmt(VIOLATION_FILTERS.cert_expired.enterpriseCount)} certificates already expired`,
    detail: "Live endpoints · immediate outage and trust-failure risk",
    ageMins: 40,
  },
  {
    id: "6",
    category: "Certs",
    icon: Shield,
    severity: "P2",
    title: `${fmt(VIOLATION_FILTERS.cert_weak_algo.enterpriseCount)} certificates use weak algorithms`,
    detail: "RSA-1024 / SHA-1 · re-issue on compliant algorithm required",
    ageMins: 240,
  },
  {
    id: "3",
    category: "SSH",
    icon: Key,
    severity: "P1",
    title: `${fmt(VIOLATION_FILTERS.ssh_suspicious.enterpriseCount)} suspicious SSH keys with shell access`,
    detail: "Anomalous login patterns · production hosts",
    ageMins: 95,
  },
  {
    id: "9",
    category: "SSH",
    icon: Key,
    severity: "P3",
    title: `${fmt(VIOLATION_FILTERS.ssh_rogue.enterpriseCount)} rogue SSH keys not provisioned by platform`,
    detail: "Found in filesystem and vault keystores · move under managed SSH CA",
    ageMins: 720,
  },
  {
    id: "8",
    category: "Secrets",
    icon: Lock,
    severity: "P2",
    title: `${fmt(VIOLATION_FILTERS.secret_unrotated_90d.enterpriseCount)} secrets not rotated in 90+ days`,
    detail: "HashiCorp Vault, CyberArk Conjur, and HSM scope · production",
    ageMins: 480,
  },
  {
    id: "orphaned",
    category: "Secrets",
    icon: Lock,
    severity: "P3",
    title: `${fmt(VIOLATION_FILTERS.secret_orphaned.enterpriseCount)} orphaned secrets with no active owner`,
    detail: "No active owner · rotation and revocation blocked until reassigned",
    ageMins: 1440,
  },
  {
    id: "pqc-1",
    category: "PQC",
    icon: Atom,
    severity: "P2",
    title: "847 production certs use RSA-2048 and expire after 2030",
    detail: "Post-NIST-deadline exposure · deprecate by 2030, disallow by 2035",
    ageMins: 60,
  },
];

const SEV_STYLES: Record<ActionItem["severity"], string> = {
  P1: "bg-coral/15 text-coral border-coral/30",
  P2: "bg-amber/15 text-amber border-amber/30",
  P3: "bg-purple/15 text-purple border-purple/30",
};

function ageLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

type FilterKey = "All" | "Certificates" | "Secrets" | "SSH Keys" | "Quantum";
const FILTER_MAP: Record<FilterKey, Category[] | null> = {
  All: null,
  Certificates: ["Certs"],
  Secrets: ["Secrets"],
  "SSH Keys": ["SSH"],
  Quantum: ["PQC"],
};
const FILTERS: FilterKey[] = ["All", "Certificates", "SSH Keys", "Secrets", "Quantum"];

export default function CriticalActionFeed() {
  const { hoveredDriver, resolvedFeedItems } = useDashboard();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [triage, setTriage] = useState<{ type: Category; violationId: string } | null>(null);

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
    return filtered.map((item) => ({
      ...item,
      highlighted: hoveredDriver != null && feedItemToDriver[item.id] === hoveredDriver,
      isQueued: resolvedFeedItems.has(item.id),
    }));
  }, [hoveredDriver, resolvedFeedItems, filter]);

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
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${active ? "bg-teal text-primary-foreground border-teal shadow-[0_0_0_2px_hsl(var(--teal)/0.15)]" : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground hover:border-teal/40"}`}
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
            return (
              <li
                key={item.id}
                className={`transition-all border-l-2 ${item.highlighted ? "bg-coral/[0.03] border-l-coral" : "border-l-transparent hover:bg-secondary/20"}`}
              >
                <button
                  onClick={() => setTriage({ type: item.category, violationId: item.id })}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-2.5"
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-secondary/60">
                    <Icon className="w-3 h-3 text-foreground" />
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
                    </div>
                    <p className="text-[11.5px] font-medium text-foreground leading-snug">{item.title}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {triage && (
        <TicketTriageModal
          initialType={triage.type}
          initialViolationId={triage.violationId}
          onClose={() => setTriage(null)}
        />
      )}
    </div>
  );
}
