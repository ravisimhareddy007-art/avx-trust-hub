import React, { useState, useMemo, useRef } from "react";
import { Sparkles, Info, ChevronRight, ChevronLeft, TrendingDown, TrendingUp, Ticket } from "lucide-react";
import { useRisk } from "@/context/RiskContext";
import { severityHsl } from "@/lib/risk/types";
import { ticketForObject } from "@/lib/ticketStore";
import TicketTriageModal, { assetRemediationGroups } from "@/components/dashboards/TicketTriageModal";
import { useNav } from "@/context/NavigationContext";
import { mockAssets } from "@/data/mockData";
import { mockITAssets, type ITAsset } from "@/data/inventoryMockData";
import { arsFor } from "@/lib/risk/ars";
import { computeCRS } from "@/lib/risk/crs";

const PAGE = 5;
const ASSET_TOP = 5;

const SEV_DOT: Record<string, string> = {
  Critical: "bg-coral",
  High: "bg-coral",
  Medium: "bg-amber",
  Low: "bg-teal",
};
const SEV_TEXT: Record<string, string> = {
  Critical: "text-coral",
  High: "text-coral",
  Medium: "text-amber",
  Low: "text-teal",
};

const bandOf = (s: number) => (s >= 80 ? "Critical" : s >= 60 ? "High" : s >= 30 ? "Medium" : "Low");
const sing = (label: string) =>
  label.endsWith("ies") ? label.slice(0, -3) + "y" : label.endsWith("s") ? label.slice(0, -1) : label;
const grpLabel = (count: number, label: string) => `${count} ${count === 1 ? sing(label) : label}`;

// Projection: recompute ARS as if the high/critical objects were fixed (CRS floored
// to acceptable). Mirrors the ARS formula in the scoring spec so the number is real.
function percentileAsc(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}
function arsFromCRS(crsList: number[], biMult: number): number {
  if (crsList.length === 0) return 0;
  const asc = [...crsList].sort((a, b) => a - b);
  const max = Math.max(...crsList);
  const p90 = percentileAsc(asc, 90);
  const p75 = percentileAsc(asc, 75);
  const crit = crsList.filter((c) => c >= 80).length;
  const high = crsList.filter((c) => c >= 60 && c < 80).length;
  const tech = 0.55 * max + 0.45 * (0.6 * p90 + 0.4 * p75) + Math.log(1 + crit) * 4 + Math.log(1 + high) * 2;
  return Math.min(100, Math.round(tech * biMult));
}

function TrendChart({ points, hsl }: { points: { label: string; value: number }[]; hsl: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 300,
    H = 140,
    L = 22,
    R = 250,
    T = 18,
    B = 108;

  const y = (v: number) => T + (1 - v / 100) * (B - T);
  const x = (i: number) => L + (i / (points.length - 1)) * (R - L);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${R} ${B} L ${L} ${B} Z`;
  const last = points[points.length - 1];
  const peakIdx = points.reduce((best, p, i) => (i < points.length - 1 && p.value > points[best].value ? i : best), 0);
  const peak = points[peakIdx];
  const zones = [
    { top: 100, bot: 80, c: "hsl(14 90% 58%)", label: "Crit", op: 0.22 },
    { top: 80, bot: 60, c: "hsl(38 95% 56%)", label: "High", op: 0.2 },
    { top: 60, bot: 30, c: "hsl(210 92% 62%)", label: "Mod", op: 0.2 },
    { top: 30, bot: 0, c: "hsl(158 80% 46%)", label: "Low", op: 0.2 },
  ];
  const yTicks = [100, 80, 60, 30, 0];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(points.length - 1, Math.round(((mx - L) / (R - L)) * (points.length - 1))));
    setHover(idx);
  };

  const hp = hover !== null ? points[hover] : null;
  const tipX = hover !== null ? Math.min(Math.max(x(hover), 24), W - 26) : 0;

  return (
    <svg
      ref={ref}
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Risk trend, peaked at ${peak.value}, now ${last.value}`}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      style={{ cursor: "crosshair" }}
    >
      {zones.map((z) => (
        <g key={z.label}>
          <rect x={L} y={y(z.top)} width={R - L} height={y(z.bot) - y(z.top)} fill={z.c} opacity={z.op} />
          <text x={R + 4} y={(y(z.top) + y(z.bot)) / 2 + 3} fontSize="7.5" fill={z.c} opacity="0.9">
            {z.label}
          </text>
        </g>
      ))}
      {yTicks.map((v) => (
        <text key={v} x={L - 5} y={y(v) + 3} fontSize="7.5" fill="currentColor" opacity="0.55" textAnchor="end">
          {v}
        </text>
      ))}
      <path d={area} fill={hsl} fillOpacity="0.18" />
      <path
        d={line}
        fill="none"
        stroke={hsl}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="1"
      />

      {hp && (
        <g pointerEvents="none">
          <line
            x1={x(hover!)}
            y1={T}
            x2={x(hover!)}
            y2={B}
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="2 2"
            opacity="0.4"
          />
          <circle cx={x(hover!)} cy={y(hp.value)} r="3.5" fill={hsl} stroke="var(--card)" strokeWidth="1.5" />
          <rect
            x={tipX - 22}
            y={y(hp.value) - 24}
            width="44"
            height="16"
            rx="3"
            fill="hsl(222 22% 11%)"
            stroke="currentColor"
            strokeOpacity="0.2"
          />
          <text x={tipX} y={y(hp.value) - 13} fontSize="8" fontWeight="500" fill="currentColor" textAnchor="middle">
            {hp.label} · {hp.value}
          </text>
        </g>
      )}

      <circle cx={x(peakIdx)} cy={y(peak.value)} r="2.5" fill="none" stroke="hsl(16 72% 51%)" strokeWidth="1.5" />
      <text x={x(peakIdx)} y={y(peak.value) - 5} fontSize="7.5" fill="hsl(16 72% 51%)" textAnchor="middle">
        peak {peak.value}
      </text>
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" fill={hsl} />
      <text
        x={x(points.length - 1) - 5}
        y={y(last.value) - 5}
        fontSize="9"
        fontWeight="600"
        fill={hsl}
        textAnchor="end"
      >
        {last.value}
      </text>
      {points.map((p, i) => (
        <text
          key={`m${i}`}
          x={x(i)}
          y={H - 3}
          fontSize="7.5"
          fill="currentColor"
          opacity={hover === i ? 1 : 0.6}
          textAnchor="middle"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

type SortKey = "impact" | "urgency";

export default function EnterpriseRiskScore() {
  const { ers, qes } = useRisk();
  const { setCurrentPage, setFilters } = useNav();
  const [lens, setLens] = useState<"ers" | "qes">("ers");
  const [groupBy, setGroupBy] = useState<"violation" | "asset">("violation");
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [triage, setTriage] = useState<{
    type?: string;
    violationId?: string;
    assetId?: string;
    objectIds?: string[];
    scopeLabel?: string;
  } | null>(null);
  const [sort, setSort] = useState<SortKey>("impact");
  const [page, setPage] = useState(0);

  const active = lens === "qes" ? qes : ers;
  const score = lens === "qes" ? qes.qes : ers.ers;
  const severity = active.severity;
  const hsl = severityHsl(severity);
  const hist = active.history;
  const startVal = hist[0]?.value ?? score;
  const delta = score - startVal;
  const improving = delta < 0;

  const topThree = [...active.driverBuckets].sort((a, b) => b.pts - a.pts).slice(0, 3);
  const projected = Math.max(0, score - topThree.reduce((s, d) => s + d.pts, 0));
  const peak = Math.max(...hist.map((p) => p.value));

  const coverageFor = (ids: string[]) => ids.reduce((n, id) => n + (ticketForObject(id) ? 1 : 0), 0);

  const rows = useMemo(() => {
    const withCov = active.driverBuckets.map((d) => {
      const ticketed = coverageFor(d.objectIds);
      const fullyTicketed = d.objectIds.length > 0 && ticketed >= d.objectIds.length;
      return { ...d, ticketed, fullyTicketed };
    });
    const activeRows = withCov.filter((d) => !d.fullyTicketed);
    const done = withCov.filter((d) => d.fullyTicketed);
    const cmp =
      sort === "impact"
        ? (a: (typeof activeRows)[0], b: (typeof activeRows)[0]) => b.pts - a.pts
        : (a: (typeof activeRows)[0], b: (typeof activeRows)[0]) => b.urgencyScore - a.urgencyScore;
    return [...activeRows.sort(cmp), ...done];
  }, [active.driverBuckets, sort]);

  const pageCount = Math.ceil(rows.length / PAGE);
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);

  // IT-asset view: real ARS per asset (business-impact multiplier already applied),
  // critical + high only, sorted by ARS. Ties fall to techARS silently.
  const assetList = useMemo(() => {
    return mockITAssets
      .map((a) => {
        const r = arsFor(a);
        return { asset: a, ars: r.ars, tech: r.techARS };
      })
      .filter((x) => x.ars >= 60)
      .sort((a, b) => b.ars - a.ars || b.tech - a.tech);
  }, []);
  const topAssets = assetList.slice(0, ASSET_TOP);
  const moreCount = assetList.length - topAssets.length;

  // Remediation drill for one asset: its high/critical objects, grouped by the fix
  // they share, with a real projected ARS after the group is cleared.
  const drill = useMemo(() => {
    if (!selectedAsset) return null;
    const a = arsFor(selectedAsset);
    // Same pool the modal renders, grouped by category, ticketed objects excluded.
    // Lens-aware: ERS shows classical/operational groups, QES shows quantum.
    const groups = assetRemediationGroups(selectedAsset.id, lens);
    const allIds = groups.flatMap((g) => g.objectIds);
    const remediatedIds = new Set(allIds);
    const biMult = a.techARS > 0 ? a.ars / a.techARS : 1;
    // Projection: recompute ARS with the remediated objects floored to acceptable.
    const crsList = selectedAsset.cryptoObjectIds
      .map((id) => {
        const o = mockAssets.find((x) => x.id === id);
        if (!o) return null;
        return remediatedIds.has(id) ? 30 : computeCRS(o).crs;
      })
      .filter((v): v is number => v !== null);
    const projectedArs = arsFromCRS(crsList, biMult);
    const total = groups.reduce((s, g) => s + g.count, 0);
    return { a, groups, projectedArs, total, allIds };
  }, [selectedAsset, lens]);

  const goAssets = () => {
    setGroupBy("asset");
    setSelectedAsset(null);
    setPage(0);
  };
  const goViolations = () => {
    setGroupBy("violation");
    setSelectedAsset(null);
    setPage(0);
  };
  const switchLens = (l: "ers" | "qes") => {
    setLens(l);
    setSelectedAsset(null);
    setPage(0);
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border">
        <Sparkles className="w-4 h-4 text-teal" />
        <h2 className="text-sm font-semibold text-foreground">Enterprise Risk</h2>
        <div className="flex rounded-md border border-border overflow-hidden ml-1">
          <button
            onClick={() => switchLens("ers")}
            className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${lens === "ers" ? "bg-teal/15 text-teal" : "text-muted-foreground"}`}
          >
            ERS
          </button>
          <button
            onClick={() => switchLens("qes")}
            className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${lens === "qes" ? "bg-purple/15 text-purple-light" : "text-muted-foreground"}`}
          >
            QES
          </button>
        </div>
        <div className="relative group">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          <div className="absolute left-0 top-5 z-50 hidden group-hover:block w-80 bg-card border border-border rounded-lg shadow-lg px-3 py-2.5">
            <p className="text-[11px] text-foreground leading-relaxed">
              {lens === "qes" ? (
                <>
                  Quantum Exposure Score (QES) is a single executive-level measure of your organization's exposure to
                  quantum attack. It is anchored on the worst quantum-vulnerable objects (not a dilutable average), so a
                  few critical harvest-now-decrypt-later objects cannot be masked by many safe ones. It is scored
                  separately from operational risk (ERS).
                </>
              ) : (
                <>
                  Enterprise Risk Score (ERS) is a single executive-level risk score for your organization. It is
                  calculated as a business-impact-weighted average of every asset's risk, with a floor rule that
                  prevents a single critical production asset from being masked by a large number of healthy assets.
                </>
              )}
            </p>
          </div>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-teal">
          <span className="w-1.5 h-1.5 rounded-full bg-teal" /> live
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,36%)_1fr]">
        {/* Trend + score */}
        <div className="p-4 lg:border-r border-border flex flex-col">
          <div className="flex items-end gap-3 mb-1">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-semibold leading-none tabular-nums" style={{ color: hsl }}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <div className="flex flex-col gap-1 pb-0.5">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ color: hsl, background: `${hsl}1f` }}
              >
                {severity} risk
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${improving ? "text-teal" : "text-coral"}`}
              >
                {improving ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(delta)} pts / 12 weeks
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center mt-1">
            <TrendChart points={hist} hsl={hsl} />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2.5 border-t border-border/40">
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Peak</div>
              <div className="text-sm font-semibold text-coral tabular-nums">{peak}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Now</div>
              <div className="text-sm font-semibold tabular-nums" style={{ color: hsl }}>
                {score}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">After top 3</div>
              <div className="text-sm font-semibold text-teal tabular-nums">{projected}</div>
            </div>
          </div>
        </div>

        {/* Factors */}
        <div className="p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              What's driving your risk
            </span>
            <div className="inline-flex rounded-full border border-border-strong overflow-hidden">
              <button
                onClick={goViolations}
                className={`text-[10px] px-2.5 py-0.5 transition-colors ${groupBy === "violation" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                By violation
              </button>
              <button
                onClick={goAssets}
                className={`text-[10px] px-2.5 py-0.5 transition-colors ${groupBy === "asset" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                By asset
              </button>
            </div>
            {groupBy === "violation" && (
              <>
                <span className="text-[10px] text-muted-foreground ml-auto">Sort</span>
                <div className="inline-flex rounded-full border border-border-strong overflow-hidden">
                  <button
                    onClick={() => {
                      setSort("impact");
                      setPage(0);
                    }}
                    className={`text-[10px] px-2.5 py-0.5 transition-colors ${sort === "impact" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Score impact
                  </button>
                  <button
                    onClick={() => {
                      setSort("urgency");
                      setPage(0);
                    }}
                    className={`text-[10px] px-2.5 py-0.5 transition-colors ${sort === "urgency" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Most recent
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ---------------- BY VIOLATION ---------------- */}
          {groupBy === "violation" && (
            <>
              <div className="flex flex-col">
                {pageRows.map((d) => (
                  <button
                    key={d.id}
                    onClick={() =>
                      setTriage({
                        type: lens === "qes" ? "pqc" : (d as any).triageType,
                        violationId: d.id,
                      })
                    }
                    className={`group grid items-center gap-3 py-2.5 border-b border-border/40 text-left ${d.fullyTicketed ? "opacity-55" : ""} ${(d as any).blocker ? "bg-purple/5" : ""}`}
                    style={{ gridTemplateColumns: "84px minmax(0,1fr) 44px 16px" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[d.severity]}`} />
                      <span className={`text-[9px] font-semibold uppercase tracking-wide ${SEV_TEXT[d.severity]}`}>
                        {d.severity}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`text-[12px] truncate ${(d as any).blocker ? "text-purple-light font-medium" : "text-foreground"}`}
                      >
                        {d.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {d.count.toLocaleString()} objects · {(d as any).recencyLabel ?? "seen this scan"}
                      </div>
                    </div>
                    <div className="text-right">
                      {d.fullyTicketed ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-teal">
                          <Ticket className="w-2.5 h-2.5" /> done
                        </span>
                      ) : (
                        <>
                          <div
                            className={`text-[13px] font-semibold tabular-nums leading-none ${SEV_TEXT[d.severity]}`}
                          >
                            -{d.pts}
                          </div>
                          <div className="text-[8px] text-muted-foreground uppercase tracking-wide">
                            {lens === "qes" ? "QES" : "ERS"}
                          </div>
                        </>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-teal transition-colors" />
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground">
                  {rows.length === 0
                    ? "No active factors"
                    : `${page * PAGE + 1} to ${Math.min(rows.length, (page + 1) * PAGE)} of ${rows.length} factors`}
                </span>
                {pageCount > 1 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={page >= pageCount - 1}
                      className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- BY ASSET · list ---------------- */}
          {groupBy === "asset" && !selectedAsset && (
            <>
              <div className="flex flex-col">
                {topAssets.map(({ asset, ars }) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group grid items-center gap-3 py-2.5 border-b border-border/40 text-left"
                    style={{ gridTemplateColumns: "16px minmax(0,1fr) 44px 16px" }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[bandOf(ars)]}`} />
                    <div className="min-w-0">
                      <div className="text-[12px] truncate text-foreground">{asset.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {asset.ownerTeam} · {asset.assetClass} · {asset.environment}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[13px] font-semibold tabular-nums leading-none ${SEV_TEXT[bandOf(ars)]}`}>
                        {ars}
                      </div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-wide">ARS</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-teal transition-colors" />
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground">Critical &amp; high assets · sorted by ARS</span>
                {moreCount > 0 && (
                  <button
                    onClick={() => {
                      setFilters({ tab: "infrastructure" });
                      setCurrentPage("inventory");
                    }}
                    className="text-[10px] text-teal hover:underline"
                  >
                    + {moreCount} more
                  </button>
                )}
              </div>
            </>
          )}

          {/* ---------------- BY ASSET · remediation drill ---------------- */}
          {groupBy === "asset" && selectedAsset && drill && (
            <>
              <button
                onClick={() => setSelectedAsset(null)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-2 w-fit"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> back to assets
              </button>

              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[13px] font-medium text-foreground truncate">{selectedAsset.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEV_TEXT[bandOf(drill.a.ars)]} ${bandOf(drill.a.ars) === "Critical" || bandOf(drill.a.ars) === "High" ? "bg-coral/10" : "bg-amber/10"}`}
                >
                  ARS {drill.a.ars}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-2">
                {selectedAsset.ownerTeam} · {drill.total} objects to remediate, grouped by fix
              </div>

              {drill.groups.length === 0 ? (
                <div className="text-[11px] text-muted-foreground py-4">No open remediation items on this asset.</div>
              ) : (
                <div className="flex flex-col">
                  {drill.groups.map((g) => (
                    <div key={g.category} className="flex items-center gap-3 py-2.5 border-b border-border/40">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[bandOf(g.maxCrs)]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-foreground truncate">{grpLabel(g.count, g.label)}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {g.action} · {g.team}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setTriage({
                            objectIds: g.objectIds,
                            scopeLabel: `${selectedAsset.name} · ${grpLabel(g.count, g.label)}`,
                          })
                        }
                        className="text-[10px] px-2.5 py-1 rounded-md border border-border text-foreground hover:bg-muted transition-colors flex-shrink-0"
                      >
                        Raise ticket
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {drill.groups.length > 0 && (
                <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground flex-1">
                    Clear these {drill.groups.length} → ARS {drill.a.ars} → {drill.projectedArs}
                  </span>
                  <button
                    onClick={() =>
                      setTriage({
                        objectIds: drill.allIds,
                        scopeLabel: `${selectedAsset.name} · ${drill.total} objects`,
                      })
                    }
                    className="text-[10px] px-2.5 py-1 rounded-md border border-teal text-teal hover:bg-teal/10 transition-colors flex-shrink-0"
                  >
                    Raise all {drill.groups.length}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {triage && (
        <TicketTriageModal
          initialType={triage.type as never}
          initialViolationId={triage.violationId}
          initialAssetId={triage.assetId}
          initialObjectIds={triage.objectIds}
          initialScopeLabel={triage.scopeLabel}
          onClose={() => setTriage(null)}
        />
      )}
    </div>
  );
}
