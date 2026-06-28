import React, { useState, useMemo, useEffect } from "react";
import {
  mockITAssets,
  ITAsset,
  getAssetRiskDrivers,
  getAssetAINarrative,
  getAssetViolations,
  getBlastRadius,
} from "@/data/inventoryMockData";
import { mockAssets, CryptoAsset } from "@/data/mockData";
import { useInventoryRegistry } from "@/context/InventoryRegistryContext";
import { useAgent } from "@/context/AgentContext";
import { useRisk } from "@/context/RiskContext";
import { useNav } from "@/context/NavigationContext";
import { arsFor, arsScore } from "@/lib/risk/ars";
import { computeRPS } from "@/lib/risk/rps";
import { StatusBadge, EnvBadge, DaysToExpiry, SeverityBadge } from "@/components/shared/UIComponents";
import {
  Search,
  Server,
  Database,
  Globe,
  Shield,
  ShieldOff,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  X,
  Ticket,
  RefreshCw,
  XCircle,
  RotateCcw,
  User,
  Plus,
  FileEdit,
  ArrowUpDown,
  AlertTriangle,
  Maximize2,
  FileBadge,
  KeyRound,
  Lock,
  Bot,
  Info,
  Atom,
  ArrowRight,
  Filter as FilterIcon,
} from "lucide-react";

// Object type → icon + short label, for compact rendering in tables/lists
function objectTypeMeta(type: string): {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
} {
  if (
    type === "TLS Certificate" ||
    type === "Code-Signing Certificate" ||
    type === "K8s Workload Cert" ||
    type === "SSH Certificate"
  ) {
    return {
      Icon: FileBadge,
      label:
        type === "TLS Certificate"
          ? "TLS Cert"
          : type === "Code-Signing Certificate"
            ? "CS Cert"
            : type === "K8s Workload Cert"
              ? "K8s Cert"
              : "SSH Cert",
      color: "text-blue-400",
    };
  }
  if (type === "SSH Key") return { Icon: KeyRound, label: "SSH Key", color: "text-teal" };
  if (type === "AI Agent Token") return { Icon: Bot, label: "AI Agent", color: "text-purple-light" };
  if (type === "Encryption Key" || type === "API Key / Secret")
    return { Icon: Lock, label: type === "Encryption Key" ? "Enc Key" : "Secret", color: "text-amber" };
  return { Icon: Lock, label: type, color: "text-muted-foreground" };
}
import { toast } from "sonner";
import BlastRadiusTopology from "./BlastRadiusTopology";
import BusinessImpactEditor from "@/components/risk/BusinessImpactEditor";
import ArsBadge from "@/components/risk/ArsBadge";
import AssetRiskDrawer from "@/components/risk/AssetRiskDrawer";
import CryptoObjectRiskDrawer from "@/components/risk/CryptoObjectRiskDrawer";
import ViolationsDrawer from "@/components/risk/ViolationsDrawer";
import TicketDraftModal, { TicketDraft } from "@/components/inventory/TicketDraftModal";

interface Props {
  onCreateTicket: (ctx: any) => void;
  onOpenPolicyDrawer: (groupId: string, groupName: string) => void;
}

const assetTypeIcons: Record<string, string> = {
  "Web Server": "🌐",
  "Application Server": "📦",
  "Database Server": "🗃️",
  "API Gateway": "🔌",
  "K8s Cluster": "☸️",
  "Mail Server": "📧",
  "Bastion Host": "🏰",
  HSM: "🔐",
  "Vault Server": "🗝️",
  "AI Platform": "🤖",
};

function RiskGauge({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score > 70 ? "hsl(15, 72%, 52%)" : score > 40 ? "hsl(38, 78%, 41%)" : "hsl(160, 70%, 37%)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(225, 20%, 18%)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.28}
        fontWeight="bold"
      >
        {score}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" fill="hsl(220, 15%, 55%)" fontSize={size * 0.1}>
        RISK
      </text>
    </svg>
  );
}

function RiskBar({ label, score, driver }: { label: string; score: number; driver: string }) {
  const color = score > 70 ? "bg-coral" : score > 40 ? "bg-amber" : "bg-teal";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-medium text-foreground">{score}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground/70 leading-tight">{driver}</p>
    </div>
  );
}

// Row menu for identities inside asset detail
function CryptoRowMenu({ asset, onAction }: { asset: CryptoAsset; onAction: (action: string) => void }) {
  const [open, setOpen] = useState(false);
  const actions = ["Assign Owner", "Add to Group", "Create Ticket", "View Full Detail"];
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1 rounded hover:bg-secondary"
      >
        <MoreVertical className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[150px] py-1">
            {actions.map((a) => (
              <button
                key={a}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAction(a);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-secondary transition-colors text-foreground"
              >
                {a}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type SortKey = "rps" | "ars" | "name" | "bi";

// ── IT Asset Detail Panel ─────────────────────────────────────────────────────

interface DetailPanelProps {
  asset: ITAsset;
  identities: CryptoAsset[];
  violations: ReturnType<typeof getAssetViolations>;
  onClose: () => void;
  onBlastRadius: () => void;
  onRiskDrawer: () => void;
  onViolations: () => void;
  onPqcTicket: () => void;
  setFilters: (f: Record<string, string>) => void;
  setCurrentPage: (p: string) => void;
  setCurrentPanel: (a: ITAsset | null) => void;
}

function ITAssetDetailPanel({
  asset,
  identities,
  violations,
  onClose,
  onBlastRadius,
  onRiskDrawer,
  onViolations,
  onPqcTicket,
  setFilters,
  setCurrentPage,
}: DetailPanelProps) {
  const classic = violations.filter((v) => v.violationType === "classic");
  const pqc = violations.filter((v) => v.violationType === "pqc");
  const totalViolations = classic.length + pqc.length;
  const assetARS = arsScore(asset);
  const riskCol = assetARS > 70 ? "text-coral" : assetARS > 40 ? "text-amber" : "text-teal";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[38%] bg-card border-l border-border shadow-2xl h-full flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-secondary/30">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-semibold text-foreground truncate">{asset.name}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onBlastRadius}
                className="flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:border-teal/30 transition-colors"
              >
                <Maximize2 className="w-3 h-3" /> Blast Radius
              </button>
              <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">
            {asset.type} · {asset.environment} · {asset.application}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <EnvBadge env={asset.environment} />
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {asset.ownerTeam}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {asset.managedBy}
            </span>
            {!asset.scanned && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/20">
                Not scanned
              </span>
            )}
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded-lg px-3 py-2 border border-border/50">
              <div className="flex items-center gap-1">
                <span className={`text-[18px] font-bold tabular-nums ${riskCol}`}>{assetARS}</span>
                <button onClick={onRiskDrawer} className="p-0.5 mt-1">
                  <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Asset risk score</p>
            </div>
            <div className="bg-card rounded-lg px-3 py-2 border border-border/50">
              <p className="text-[18px] font-bold tabular-nums text-foreground">{identities.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Linked identities</p>
            </div>
            <div className="bg-card rounded-lg px-3 py-2 border border-border/50">
              <p className={`text-[18px] font-bold tabular-nums ${totalViolations > 0 ? "text-coral" : "text-teal"}`}>
                {totalViolations}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Violations</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/40">
          {/* Actions — PQC ticket only when relevant */}
          {pqc.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">Actions</p>
              <button
                onClick={onPqcTicket}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors"
              >
                <Atom className="w-3 h-3" /> PQC Migration Ticket
              </button>
            </div>
          )}

          {/* Asset details */}
          <div className="px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Asset details</p>
            {[
              { label: "Type", value: asset.type },
              { label: "Infrastructure", value: asset.infrastructure },
              { label: "Managed by", value: asset.managedBy },
              { label: "Application", value: asset.application },
              { label: "Last seen", value: asset.lastSeen },
              {
                label: "Policy coverage",
                value: (
                  <span
                    className={
                      asset.policyCoverage < 50 ? "text-coral" : asset.policyCoverage < 80 ? "text-amber" : "text-teal"
                    }
                  >
                    {asset.policyCoverage}%
                  </span>
                ),
              },
              {
                label: "Discovery scan",
                value: asset.scanned ? (
                  <span className="text-teal">Scanned</span>
                ) : (
                  <span className="text-amber">Not scanned</span>
                ),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="grid grid-cols-[130px_1fr] gap-2 py-1.5 border-b border-border/30 last:border-0 items-start"
              >
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="text-[11px] text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Associated crypto objects */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground">
                Associated crypto objects ({identities.length})
              </p>
              {identities.length > 0 && <span className="text-[10px] text-amber ml-auto">failure affects all</span>}
            </div>
            {identities.length > 0 ? (
              <div className="space-y-0.5">
                {identities.map((co) => {
                  const meta = objectTypeMeta(co.type);
                  const expCol =
                    co.daysToExpiry >= 0 && co.daysToExpiry <= 7
                      ? "text-coral"
                      : co.daysToExpiry >= 0 && co.daysToExpiry <= 30
                        ? "text-amber"
                        : "text-muted-foreground";
                  return (
                    <button
                      key={co.id}
                      onClick={() => {
                        setFilters({ tab: "identities", search: co.name });
                        setCurrentPage("inventory");
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 text-[11px] rounded px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left group"
                    >
                      <meta.Icon className={`w-3 h-3 flex-shrink-0 ${meta.color}`} />
                      <span className="text-foreground font-medium flex-1 truncate group-hover:text-teal">
                        {co.name}
                      </span>
                      <span className="text-muted-foreground text-[10px] flex-shrink-0">{co.algorithm}</span>
                      {co.daysToExpiry >= 0 && (
                        <span className={`text-[10px] flex-shrink-0 tabular-nums ${expCol}`}>{co.daysToExpiry}d</span>
                      )}
                      <StatusBadge status={co.status} />
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-teal flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-border/40 px-3 py-3 text-[11px] text-muted-foreground">
                No crypto objects linked to this asset.
                <span className="block text-[10px] mt-0.5">Discovered identities will appear here after a scan.</span>
              </div>
            )}
          </div>

          {/* Violations */}
          {totalViolations > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground">Violations</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-coral/15 text-coral font-medium">
                  {totalViolations}
                </span>
              </div>

              {classic.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Operational</p>
                  <div className="space-y-1.5">
                    {classic.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${v.severity === "Critical" ? "bg-coral" : v.severity === "High" ? "bg-amber" : "bg-muted-foreground"}`}
                        />
                        <span className="text-[11px] text-foreground flex-1">{v.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pqc.length > 0 && (
                <div>
                  <p className="text-[10px] text-purple-light mb-1.5 font-medium flex items-center gap-1">
                    <Atom className="w-3 h-3" /> Quantum / PQC
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-purple/15 text-purple-light">
                      NIST 2030
                    </span>
                  </p>
                  <div className="space-y-1.5">
                    {pqc.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-purple/60" />
                        <div className="flex-1">
                          <span className="text-[11px] font-mono text-foreground">{v.algorithm}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            · Expires {v.expiryYear} ·{" "}
                            {(v.yearsPastDeadline ?? 0) > 0 ? `+${v.yearsPastDeadline}yr past` : "at"} NIST deadline
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Single-select chip group used by the consolidated Infrastructure filter panel.
function FilterChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(active ? "" : opt)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${active ? "border-teal/40 bg-teal/10 text-teal" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ITAssetsTab({ onCreateTicket, onOpenPolicyDrawer }: Props) {
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [biFilter, setBiFilter] = useState("");
  const [riskRange, setRiskRange] = useState<[number, number]>([0, 100]);
  const [coverageFilter, setCoverageFilter] = useState<"unscanned" | "no-policy" | "unowned" | "">("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rps");
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [riskDrawerAsset, setRiskDrawerAsset] = useState<ITAsset | null>(null);
  const [riskDrawerObject, setRiskDrawerObject] = useState<CryptoAsset | null>(null);
  const [violationsAsset, setViolationsAsset] = useState<ITAsset | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [assetStack, setAssetStack] = useState<ITAsset[]>([]);
  const [blastModalOpen, setBlastModalOpen] = useState(false);
  const [itTicketAsset, setItTicketAsset] = useState<ITAsset | null>(null);
  const { manualITAssets } = useInventoryRegistry();
  const { setSelectedEntity } = useAgent();
  const { biMap, setBI } = useRisk();
  const { filters: navFilters, setFilters, setCurrentPage } = useNav();

  // Sync infrastructure asset selection to Agent context
  useEffect(() => {
    if (selectedAsset) setSelectedEntity({ kind: "infrastructure", id: selectedAsset.id, name: selectedAsset.name });
    return () => {
      setSelectedEntity(null);
    };
  }, [selectedAsset, setSelectedEntity]);

  // Open risk drawer when navigated with assetId (e.g. from ERS dashboard).
  useEffect(() => {
    if (navFilters.assetId) {
      const target = mockITAssets.find((a) => a.id === navFilters.assetId);
      if (target) setRiskDrawerAsset(target);
    }
  }, [navFilters.assetId]);

  useEffect(() => {
    if (navFilters.type) setTypeFilter(navFilters.type);
    if (navFilters.coverageGap === "unscanned") setCoverageFilter("unscanned");
    else if (navFilters.coverageGap === "no-policy") setCoverageFilter("no-policy");
    else if (navFilters.coverageGap === "unowned") setCoverageFilter("unowned");
    else setCoverageFilter("");
    if (navFilters.assetName) {
      setSearch(navFilters.assetName);
    }
  }, [navFilters.type, navFilters.coverageGap, navFilters.assetName]);

  // Manual assets first so they're immediately visible after add.
  const allAssets = useMemo(() => [...manualITAssets, ...mockITAssets], [manualITAssets]);

  // Compute Asset Risk Score / BI / RPS once per asset for sorting.
  const enriched = useMemo(
    () =>
      allAssets.map((a) => {
        const ars = arsFor(a).ars;
        const bi = biMap[a.id] ?? "Moderate";
        return { asset: a, ars, bi, rps: computeRPS(ars, bi) };
      }),
    [allAssets, biMap],
  );

  const filtered = useMemo(() => {
    let result = enriched;
    if (search) result = result.filter((x) => x.asset.name.toLowerCase().includes(search.toLowerCase()));
    if (envFilter) result = result.filter((x) => x.asset.environment === envFilter);
    if (typeFilter) result = result.filter((x) => x.asset.type === typeFilter);
    if (teamFilter) result = result.filter((x) => x.asset.ownerTeam === teamFilter);
    if (biFilter) result = result.filter((x) => x.bi === biFilter);
    result = result.filter((x) => x.ars >= riskRange[0] && x.ars <= riskRange[1]);
    if (coverageFilter === "unscanned") result = result.filter((x) => x.asset.scanned === false);
    if (coverageFilter === "no-policy") result = result.filter((x) => x.asset.policyCoverage === 0);
    if (coverageFilter === "unowned") result = result.filter((x) => x.asset.ownerTeam === "Unassigned");

    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.asset.name.localeCompare(b.asset.name);
        case "ars":
          return b.ars - a.ars;
        case "bi": {
          const order: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
          return order[a.bi] - order[b.bi];
        }
        case "rps":
        default:
          return b.rps - a.rps;
      }
    });
    return sorted;
  }, [enriched, search, envFilter, typeFilter, teamFilter, biFilter, riskRange, sortKey, coverageFilter]);

  const uniqueTeams = [...new Set(allAssets.map((a) => a.ownerTeam))];
  const uniqueTypes = [...new Set(allAssets.map((a) => a.type))];

  const isManual = (a: ITAsset) => manualITAssets.some((m) => m.id === a.id);

  const openAssetDetail = (asset: ITAsset) => {
    if (selectedAsset) setAssetStack((prev) => [...prev, selectedAsset]);
    setSelectedAsset(asset);
  };

  const goBack = () => {
    if (assetStack.length > 0) {
      setSelectedAsset(assetStack[assetStack.length - 1]);
      setAssetStack((prev) => prev.slice(0, -1));
    } else {
      setSelectedAsset(null);
    }
  };

  // Get identities for an infrastructure asset
  const getIdentities = (asset: ITAsset): CryptoAsset[] => {
    return asset.cryptoObjectIds.map((id) => mockAssets.find((a) => a.id === id)).filter(Boolean) as CryptoAsset[];
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Main table */}
      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search infrastructure..."
              className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors ${
              (typeFilter ? 1 : 0) +
                (envFilter ? 1 : 0) +
                (teamFilter ? 1 : 0) +
                (biFilter ? 1 : 0) +
                (riskRange[0] !== 0 || riskRange[1] !== 100 ? 1 : 0) >
              0
                ? "border-teal/40 text-teal bg-teal/10 hover:bg-teal/15"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" /> Filters
            {(typeFilter ? 1 : 0) +
              (envFilter ? 1 : 0) +
              (teamFilter ? 1 : 0) +
              (biFilter ? 1 : 0) +
              (riskRange[0] !== 0 || riskRange[1] !== 100 ? 1 : 0) >
              0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal/20 text-teal text-[9px] font-bold tabular-nums">
                {(typeFilter ? 1 : 0) +
                  (envFilter ? 1 : 0) +
                  (teamFilter ? 1 : 0) +
                  (biFilter ? 1 : 0) +
                  (riskRange[0] !== 0 || riskRange[1] !== 100 ? 1 : 0)}
              </span>
            )}
          </button>
          <span className="text-[10px] text-muted-foreground">
            {filtered.length} assets · sorted by{" "}
            {sortKey === "rps"
              ? "priority"
              : sortKey === "ars"
                ? "asset risk score"
                : sortKey === "bi"
                  ? "business impact"
                  : "name"}
          </span>
          {coverageFilter && navFilters.enterpriseCount && filtered.length < parseInt(navFilters.enterpriseCount) && (
            <span className="ml-3 text-[10px] text-muted-foreground flex items-center gap-1 inline-flex">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
              Showing {filtered.length} representative records · {parseInt(navFilters.enterpriseCount).toLocaleString()}{" "}
              total in estate
            </span>
          )}
        </div>

        {coverageFilter && (
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border border-border rounded-md text-[10.5px] text-foreground flex-shrink-0">
            <span className="text-muted-foreground">Filtered to:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal/15 text-teal font-semibold">
              {coverageFilter === "unscanned" && "Discovery Coverage Gap — Not scanned by platform"}
              {coverageFilter === "no-policy" && "Control Gap — No active policy coverage"}
              {coverageFilter === "unowned" && "Ownership Gap — No owner assigned"}
              <button onClick={() => setCoverageFilter("")} className="ml-1 hover:text-coral" aria-label="Clear filter">
                ×
              </button>
            </span>
            <span className="text-muted-foreground tabular-nums">{filtered.length} assets</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    <button
                      onClick={() => setSortKey("name")}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === "name" ? "text-foreground" : ""}`}
                    >
                      Asset Name <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Env</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Identities</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                    <button
                      onClick={() => setSortKey("ars")}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === "ars" ? "text-foreground" : ""}`}
                    >
                      Asset Risk Score <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                    <button
                      onClick={() => setSortKey("bi")}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === "bi" ? "text-foreground" : ""}`}
                    >
                      Business Impact <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Owner</th>
                  <th
                    className="text-center py-2 px-2 font-medium text-muted-foreground"
                    title="Active policy violations on this asset"
                  >
                    Violations
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ asset, ars, bi }) => (
                  <tr
                    key={asset.id}
                    onClick={() => openAssetDetail(asset)}
                    className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span>{assetTypeIcons[asset.type] || "📋"}</span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">{asset.name}</span>
                        {isManual(asset) && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal/15 text-teal text-[9px] font-semibold"
                            title="Discovery Vector: Manual Entry"
                          >
                            <FileEdit className="w-2.5 h-2.5" /> Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.type}</td>
                    <td className="py-2 px-2">
                      <EnvBadge env={asset.environment} />
                    </td>
                    <td className="py-2 px-2 text-center text-foreground font-medium">
                      {asset.cryptoObjectIds.length}
                    </td>
                    <td
                      className="py-2 px-2 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRiskDrawerAsset(asset);
                      }}
                    >
                      <ArsBadge score={ars} label="" />
                    </td>
                    <td className="py-2 px-2">
                      <BusinessImpactEditor
                        value={bi}
                        onChange={(v) => setBI(asset.id, v)}
                        onOpenJustification={() => setRiskDrawerAsset(asset)}
                      />
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.ownerTeam}</td>
                    <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const vs = getAssetViolations(asset);
                        const crit = vs.filter((v) => v.severity === "Critical").length;
                        if (vs.length === 0) {
                          return <span className="text-[10px] text-muted-foreground">—</span>;
                        }
                        return (
                          <button
                            onClick={() => setViolationsAsset(asset)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-coral/15 text-coral hover:bg-coral hover:text-primary-foreground transition-colors"
                            title={`${vs.length} violation${vs.length === 1 ? "" : "s"} — click to view & remediate`}
                          >
                            {vs.length}
                            {crit > 0 && <span className="text-[8.5px] font-bold opacity-80">·{crit} crit</span>}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No infrastructure assets match your filters.
            </div>
          )}
        </div>
      </div>

      {/* Asset Detail Panel — 38% right overlay */}
      {selectedAsset && (
        <ITAssetDetailPanel
          asset={selectedAsset}
          identities={getIdentities(selectedAsset)}
          violations={getAssetViolations(selectedAsset)}
          onClose={goBack}
          onBlastRadius={() => setBlastModalOpen(true)}
          onRiskDrawer={() => setRiskDrawerAsset(selectedAsset)}
          onViolations={() => setViolationsAsset(selectedAsset)}
          onPqcTicket={() => setItTicketAsset(selectedAsset)}
          setFilters={setFilters}
          setCurrentPage={setCurrentPage}
          setCurrentPanel={setSelectedAsset}
        />
      )}

      <AssetRiskDrawer
        asset={riskDrawerAsset}
        onClose={() => setRiskDrawerAsset(null)}
        onOpenObject={(id) => {
          const obj = mockAssets.find((a) => a.id === id);
          if (obj) setRiskDrawerObject(obj);
        }}
      />
      <CryptoObjectRiskDrawer object={riskDrawerObject} onClose={() => setRiskDrawerObject(null)} />
      <ViolationsDrawer asset={violationsAsset} onClose={() => setViolationsAsset(null)} />

      {/* Blast Radius Full-Screen Modal */}
      {blastModalOpen &&
        selectedAsset &&
        (() => {
          const br = getBlastRadius(selectedAsset.id, mockAssets);
          return (
            <>
              <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setBlastModalOpen(false)}
              />
              <div className="fixed inset-8 z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                  <div>
                    <h2 className="text-sm font-semibold">Blast Radius — {selectedAsset.name}</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Impact analysis if this asset or its cryptographic identities fail
                    </p>
                  </div>
                  <button onClick={() => setBlastModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body — graph left, details right */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Graph */}
                  <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-auto">
                    <BlastRadiusTopology
                      nodes={br.nodes}
                      summary={br.summary}
                      compact={false}
                      onNodeClick={(node) => {
                        if (node.type === "asset" && node.ring >= 2) {
                          const target = mockITAssets.find((a) => a.id === node.id);
                          if (target) {
                            setBlastModalOpen(false);
                            openAssetDetail(target);
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Right panel */}
                  <div className="w-72 border-l border-border p-5 overflow-y-auto flex-shrink-0 space-y-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-3">
                        Impact Summary
                      </p>
                      <div className="space-y-2">
                        {[
                          {
                            label: "Direct dependencies",
                            value: br.summary.directDeps,
                            desc: "Assets directly depending on this one",
                            color: "text-coral",
                          },
                          {
                            label: "Sibling assets",
                            value: br.summary.siblingAssets,
                            desc: "Assets sharing crypto objects",
                            color: "text-amber",
                          },
                          {
                            label: "Cascade impact",
                            value: br.summary.cascadeAssets,
                            desc: "Assets affected downstream",
                            color: "text-purple-400",
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="border border-border rounded-lg px-3 py-2.5 flex items-center gap-3"
                          >
                            <span className={`text-xl font-bold flex-shrink-0 ${stat.color}`}>{stat.value}</span>
                            <div>
                              <div className="text-[11px] font-medium">{stat.label}</div>
                              <div className="text-[9px] text-muted-foreground">{stat.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-coral/5 border border-coral/20 rounded-lg p-3">
                      <p className="text-[10px] text-coral/90 leading-relaxed italic">{br.summary.sentence}</p>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                        Legend
                      </p>
                      <div className="space-y-2">
                        {[
                          { color: "bg-teal", label: "Healthy", desc: "No active violations" },
                          { color: "bg-amber", label: "Warning", desc: "Expiring within 30 days" },
                          { color: "bg-coral", label: "Critical", desc: "Expired or high-risk violations" },
                          { color: "bg-purple-400 opacity-60", label: "Cascade", desc: "Downstream dependency impact" },
                        ].map((l) => (
                          <div key={l.label} className="flex items-start gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${l.color}`} />
                            <div>
                              <span className="text-[10px] font-medium">{l.label}</span>
                              <span className="text-[9px] text-muted-foreground ml-1.5">{l.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[9px] text-muted-foreground italic border-t border-border pt-3">
                      Click any node in the graph to drill into that asset's detail panel.
                    </p>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      {itTicketAsset && (
        <TicketDraftModal
          asset={null}
          action="fix"
          onClose={() => setItTicketAsset(null)}
          onConfirm={(draft: TicketDraft) => {
            onCreateTicket({
              objectName: itTicketAsset.name,
              objectType: itTicketAsset.type,
              environment: itTicketAsset.environment,
              draft,
            });
          }}
        />
      )}
      {/* Consolidated Filters panel (single entry point, replaces inline dropdowns) */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-foreground/10 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
          <div className="w-[360px] bg-card border-l border-border shadow-2xl h-full flex flex-col animate-slide-in-right">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">Filters</p>
              <button
                onClick={() => {
                  setEnvFilter("");
                  setTypeFilter("");
                  setTeamFilter("");
                  setBiFilter("");
                  setRiskRange([0, 100]);
                }}
                className="text-[11px] text-coral hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
              <FilterChipGroup label="Asset Type" options={uniqueTypes} value={typeFilter} onChange={setTypeFilter} />
              <FilterChipGroup
                label="Environment"
                options={["Production", "Staging", "Development"]}
                value={envFilter}
                onChange={setEnvFilter}
              />
              <FilterChipGroup label="Owner Team" options={uniqueTeams} value={teamFilter} onChange={setTeamFilter} />
              <FilterChipGroup
                label="Business Impact"
                options={["Critical", "High", "Moderate", "Low"]}
                value={biFilter}
                onChange={setBiFilter}
              />
              <div>
                <p className="text-[11px] font-semibold text-foreground mb-2">Asset Risk Score</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["All", [0, 100]],
                      ["Critical (>70)", [71, 100]],
                      ["Moderate (40-70)", [40, 70]],
                      ["Low (<40)", [0, 39]],
                    ] as [string, [number, number]][]
                  ).map(([lbl, rng]) => {
                    const active = riskRange[0] === rng[0] && riskRange[1] === rng[1];
                    return (
                      <button
                        key={lbl}
                        onClick={() => setRiskRange(rng)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${active ? "border-teal/40 bg-teal/10 text-teal" : "border-border text-muted-foreground hover:bg-muted"}`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex-shrink-0">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2 rounded bg-teal text-primary-foreground hover:bg-teal-light text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
