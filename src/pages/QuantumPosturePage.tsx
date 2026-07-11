// src/pages/QuantumPosturePage.tsx
//
// Three surfaces. Not five stages.
//
//   EXPOSURE   what is vulnerable, on which axis, and is it actually harvestable
//   SEQUENCE   what to do Monday: unblock before you migrate
//   EVIDENCE   what you hand the auditor or the OMB migration lead
//
// The platform discovers and governs. It does not remediate. Plan, Migrate and
// Monitor are verbs it does not own, so they are not information architecture.

import React, { useMemo, useState } from "react";
import {
  Atom,
  ArrowRight,
  ArrowUpDown,
  ChevronRight,
  Download,
  Ticket,
  Lock,
  AlertTriangle,
  ShieldCheck,
  EyeOff,
  Unlock,
  Info,
} from "lucide-react";
import { useNav } from "@/context/NavigationContext";
import { mockAssets, type CryptoAsset } from "@/data/mockData";
import { mockProtocols, mockLibraries } from "@/data/cryptoStackMockData";
import {
  computeQES,
  computeQOE,
  computeReadiness,
  qmBacklog,
  blockerGraph,
  protocolPosture,
  buildEvidencePack,
  downloadEvidencePack,
  explainQES,
  isQuantumVulnerable,
  DEADLINE_PROFILES,
  DEFAULT_PROFILE,
  DEFAULT_Q_DAY,
  type DeadlineProfileId,
  type BacklogItem,
  type Posture,
} from "@/lib/risk/qes";
import TicketDraftModal from "@/components/inventory/TicketDraftModal";

// ── chrome ───────────────────────────────────────────────────────────────────
const sevChip = (q: number) =>
  q >= 80
    ? "bg-coral/15 text-coral"
    : q >= 60
      ? "bg-purple/15 text-purple-light"
      : q >= 30
        ? "bg-amber/15 text-amber"
        : "bg-teal/15 text-teal";

const POSTURE_CHIP: Record<Posture, string> = {
  PQC: "bg-teal/15 text-teal",
  Hybrid: "bg-amber/15 text-amber",
  Classical: "bg-coral/15 text-coral",
  "n/a": "bg-secondary/40 text-muted-foreground",
};

const STATUS_COLOR: Record<string, string> = {
  "Not started": "text-coral",
  "Handed off": "text-teal",
  Migrated: "text-muted-foreground",
};

const PostureChip = ({ label, value }: { label: string; value: Posture }) => (
  <span
    className={`inline-flex items-center gap-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${POSTURE_CHIP[value]}`}
  >
    <span className="opacity-60">{label}</span>
    {value}
  </span>
);

type SortKey = "priority" | "qoe" | "dueYear";

export default function QuantumPosturePage() {
  const { setCurrentPage, setFilters } = useNav();
  const [modalAsset, setModalAsset] = useState<CryptoAsset | null>(null);
  const [profileId, setProfileId] = useState<DeadlineProfileId>(DEFAULT_PROFILE);
  const [qDay, setQDay] = useState<number>(DEFAULT_Q_DAY);
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [hideStale, setHideStale] = useState(false);

  const profile = DEADLINE_PROFILES[profileId];
  const estate = mockAssets;

  const qes = useMemo(() => computeQES(estate, mockProtocols, qDay), [estate, qDay]);
  const readiness = useMemo(() => computeReadiness(estate, mockProtocols, qDay), [estate, qDay]);
  const graph = useMemo(() => blockerGraph(estate, mockLibraries, mockProtocols), [estate]);

  const backlog = useMemo<BacklogItem[]>(() => {
    let list = qmBacklog(estate, profileId, qDay);
    if (hideStale) list = list.filter((i) => i.harvestable || i.axis === "signature");
    if (sortKey === "qoe") return [...list].sort((a, b) => b.qoe - a.qoe);
    if (sortKey === "dueYear") return [...list].sort((a, b) => a.dueYear - b.dueYear);
    return list;
  }, [estate, profileId, qDay, sortKey, hideStale]);

  const vulnerable = useMemo(() => estate.filter((a) => isQuantumVulnerable(a.algorithm)), [estate]);
  const totalUnblockable = graph.reduce((n, g) => n + g.unblocks, 0);
  const shadow = mockProtocols.filter((p) => protocolPosture(p).shadow);

  const goInventory = (extra: Record<string, string> = {}) => {
    setFilters({ tab: "identities", ...extra });
    setCurrentPage("inventory");
  };
  const goObject = (name: string) => {
    setFilters({ tab: "identities", search: name });
    setCurrentPage("inventory");
  };

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="py-2 px-2 text-right font-medium">
      <button
        onClick={() => setSortKey(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === k ? "text-foreground" : ""}`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </button>
    </th>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header: the two assumptions, stated, not buried ──────────────── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Atom className="w-5 h-5 text-purple-light" />
            <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {vulnerable.length} quantum-vulnerable crypto objects · {readiness.harvestable} still harvestable at Q-day ·{" "}
            {mockProtocols.length - readiness.kemMigrated} of {mockProtocols.length} endpoints negotiate classical key
            exchange
          </p>
        </div>

        <div className="flex items-end gap-4 shrink-0">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              Deadline profile
            </label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value as DeadlineProfileId)}
              className="bg-card border border-border rounded-lg px-2.5 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:border-teal/50"
            >
              {Object.values(DEADLINE_PROFILES).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              Assumed Q-day
            </label>
            <select
              value={qDay}
              onChange={(e) => setQDay(Number(e.target.value))}
              className="bg-card border border-border rounded-lg px-2.5 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:border-teal/50"
            >
              {[2030, 2033, 2035, 2040].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-secondary/20 border border-border">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">{profile.authority}.</span> {profile.note} Q-day is your
          assumption, not our prediction: AppViewX makes no claim about when a cryptographically relevant quantum
          computer will exist. Every figure below re-prices when you change either control.
        </p>
      </div>

      {/* ── 1. EXPOSURE ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Exposure</h2>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Enterprise QES</p>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-5xl font-bold tabular-nums ${qes.severity === "Critical" ? "text-coral" : qes.severity === "High" ? "text-purple-light" : qes.severity === "Medium" ? "text-amber" : "text-teal"}`}
              >
                {qes.qes}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className="text-[9.5px] text-muted-foreground mt-2 leading-tight">{explainQES(qes)}</p>
          </div>

          <button
            onClick={() => goInventory({ quantumVulnerable: "true" })}
            className="bg-card rounded-xl border border-border p-5 text-left hover:border-teal/40 transition-all group"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Harvestable today</p>
            <p className="text-3xl font-bold tabular-nums text-coral">{readiness.harvestable}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">
                of {vulnerable.length} vulnerable · data outlives Q-day {qDay}
              </p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 ml-2 shrink-0" />
            </div>
          </button>

          <button
            onClick={() => goInventory({ filterId: "agility-blocked" })}
            className="bg-card rounded-xl border border-border p-5 text-left hover:border-teal/40 transition-all group"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Cannot migrate today</p>
            <p className="text-3xl font-bold tabular-nums text-amber">{readiness.agilityBlocked}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">{readiness.hardBlocked} hard-blocked, no upgrade path</p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 ml-2 shrink-0" />
            </div>
          </button>

          <button
            onClick={() => { setFilters({ tab: "crypto-assets", shadow: "true" }); setCurrentPage("inventory"); }}
            className="bg-card rounded-xl border border-border p-5 text-left hover:border-teal/40 transition-all group"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Shadow endpoints</p>
            <p className="text-3xl font-bold tabular-nums text-purple-light">{shadow.length}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">
                quantum-vulnerable services on hosts absent from IT inventory
              </p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 ml-2 shrink-0" />
            </div>
          </button>
        </div>

        {/* The dual axis. The single most important panel on the page. */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Migration is two problems, not one</h3>
              <p className="text-[10px] text-muted-foreground max-w-2xl leading-relaxed mt-0.5">
                Key establishment fails to <span className="text-coral">harvest-now-decrypt-later</span>: traffic
                recorded today, decrypted at Q-day. Authentication fails to <span className="text-amber">forgery</span>,
                which cannot be harvested and has no shelf life. They carry different deadlines. An endpoint presenting
                an ML-DSA certificate over classical ECDHE is not quantum-safe, and a single-flag tool will tell you it
                is.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {
                label: "Key establishment migrated",
                value: readiness.kemMigrated,
                of: mockProtocols.length,
                due: profile.kemDueYear(estate[0]),
                tone: "text-coral",
              },
              {
                label: "Authentication migrated",
                value: readiness.sigMigrated,
                of: mockProtocols.length,
                due: profile.sigDueYear(estate[0]),
                tone: "text-amber",
              },
              {
                label: "Both axes migrated",
                value: readiness.bothMigrated,
                of: mockProtocols.length,
                due: null,
                tone: "text-teal",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-secondary/20 p-3">
                <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
                  {s.value}
                  <span className="text-muted-foreground text-sm font-normal"> / {s.of}</span>
                </p>
                <p className={`text-[11px] font-semibold mt-1 ${s.tone}`}>{s.label}</p>
                {s.due && (
                  <p className="text-[9px] text-muted-foreground">
                    due {s.due} under {profile.label}
                  </p>
                )}
              </div>
            ))}
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2 font-medium">Endpoint</th>
                <th className="text-left py-2 px-2 font-medium">Key exchange</th>
                <th className="text-left py-2 px-2 font-medium">Authentication</th>
                <th className="text-left py-2 px-2 font-medium">Verdict</th>
                <th className="text-right py-2 px-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {mockProtocols.slice(0, 6).map((p) => {
                const q = protocolPosture(p);
                return (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                    <td className="py-2 px-2">
                      <p className="text-[11px] font-medium text-foreground">
                        {p.service} {p.port} · {p.fqdn}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground font-mono">
                        {p.family} {p.version} · {p.kexStrength}
                        {q.shadow && <span className="text-purple-light not-italic"> · shadow host</span>}
                      </p>
                    </td>
                    <td className="py-2 px-2">
                      <PostureChip label="KEM" value={q.kem} />
                    </td>
                    <td className="py-2 px-2">
                      <PostureChip label="SIG" value={q.sig} />
                    </td>
                    <td className="py-2 px-2">
                      {q.quantumSafe ? (
                        <span className="text-[10px] text-teal font-semibold">Quantum-safe</span>
                      ) : q.harvestable ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-coral font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Harvestable
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber font-semibold">Forgeable</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-[10px] text-muted-foreground">{p.discoverySource}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top exposure, spanning objects and the wire */}
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Top exposure across the estate
          </p>
          <div className="space-y-1.5">
            {qes.topObjects.map((o) => (
              <button
                key={o.id}
                onClick={() => o.kind === "object" && goObject(o.name)}
                className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0 text-left hover:bg-secondary/30 rounded px-1 -mx-1"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {o.name}
                    {o.kind === "protocol" && (
                      <span className="text-purple-light text-[9px] ml-2 uppercase tracking-wide">protocol</span>
                    )}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground">
                    {o.algorithm} · {o.detail}
                  </p>
                </div>
                <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded shrink-0 ${sevChip(o.qoe)}`}>
                  QOE {o.qoe}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. SEQUENCE ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sequence</h2>

        {/* The blocker graph. Nobody else in this market produces this view. */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Unlock className="w-4 h-4 text-teal" /> Unblock before you migrate
              </h3>
              <p className="text-[10px] text-muted-foreground max-w-2xl leading-relaxed mt-0.5">
                {totalUnblockable} crypto objects cannot be made quantum-safe by changing the certificate. Their hosts
                run libraries that implement no PQC. Upgrading {graph.length} librar{graph.length === 1 ? "y" : "ies"}{" "}
                releases all of them. Ranked by objects unblocked, not by exposure.
              </p>
            </div>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2 font-medium">Library</th>
                <th className="text-left py-2 px-2 font-medium">Remediation</th>
                <th className="text-right py-2 px-2 font-medium">Hosts</th>
                <th className="text-right py-2 px-2 font-medium">Endpoints</th>
                <th className="text-right py-2 px-2 font-medium">Objects unblocked</th>
                <th className="text-left py-2 px-2 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {graph.map((g) => (
                <tr key={g.library.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                  <td className="py-2 px-2">
                    <p className="text-[11px] font-medium text-foreground">
                      {g.library.name} {g.library.version}
                    </p>
                    <p className="text-[9.5px] text-muted-foreground">
                      {g.library.eolStatus}
                      {g.hasKev && <span className="text-coral"> · CISA KEV</span>}
                      {" · "}
                      {g.library.discoverySource}
                    </p>
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px] text-teal">{g.remediation}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-foreground">{g.hosts}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-foreground">{g.protocols}</td>
                  <td className="py-2 px-2 text-right">
                    <span className="text-[13px] font-bold tabular-nums text-teal">{g.unblocks}</span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`text-[10px] font-semibold ${g.severity === "hard" ? "text-coral" : "text-amber"}`}
                    >
                      {g.severity === "hard" ? "Hard blocker" : "Soft blocker"}
                    </span>
                  </td>
                </tr>
              ))}
              {graph.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground text-[11px]">
                    No library blockers. Every host can perform PQC.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Backlog */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Migration prep backlog</h3>
              <p className="text-[10px] text-muted-foreground">
                Priced against {profile.label}. Preparation and prioritisation. Migration executes in your change
                process.
              </p>
            </div>
            <button
              onClick={() => setHideStale((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-colors ${hideStale ? "bg-teal/10 border-teal/30 text-teal" : "bg-secondary/20 border-border text-muted-foreground"}`}
            >
              <EyeOff className="w-3 h-3" /> Hide data stale before Q-day
            </button>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2 font-medium">Object</th>
                <th className="text-left py-2 px-2 font-medium">Posture</th>
                <Th k="qoe" label="QOE" />
                <Th k="dueYear" label="Due" />
                <th className="text-left py-2 px-2 font-medium">Agility</th>
                <th className="text-left py-2 px-2 font-medium">Status</th>
                <Th k="priority" label="Priority" />
                <th />
              </tr>
            </thead>
            <tbody>
              {backlog.slice(0, 12).map((i) => (
                <tr key={i.asset.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                  <td className="py-2 px-2">
                    <button onClick={() => goObject(i.asset.name)} className="text-left">
                      <p className="text-[11px] font-medium text-foreground truncate max-w-[200px]">{i.asset.name}</p>
                      <p className="text-[9.5px] text-muted-foreground">
                        {i.asset.algorithm} · {i.sensitivity} · {i.shelfLife}y shelf
                        {!i.harvestable && i.axis !== "signature" && (
                          <span className="text-muted-foreground/70"> · stale before Q-day</span>
                        )}
                      </p>
                    </button>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      {i.kem !== "n/a" && <PostureChip label="K" value={i.kem} />}
                      {i.sig !== "n/a" && <PostureChip label="S" value={i.sig} />}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded ${sevChip(i.qoe)}`}>
                      {i.qoe}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="tabular-nums text-foreground">{i.dueYear}</span>
                    <span className="text-[9px] text-muted-foreground ml-1">{i.dueAxis === "kem" ? "KEM" : "SIG"}</span>
                  </td>
                  <td className="py-2 px-2">
                    {i.agilityBlocked ? (
                      <span
                        title={i.blockers.map((b) => `${b.detail} → ${b.fix}`).join("\n")}
                        className={`inline-flex items-center gap-1 text-[10px] ${i.hardBlocked ? "text-coral" : "text-amber"}`}
                      >
                        <Lock className="w-3 h-3" />
                        {i.hardBlocked
                          ? "Hard-blocked"
                          : `${i.blockers.length} blocker${i.blockers.length === 1 ? "" : "s"}`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-teal">Agile</span>
                    )}
                  </td>
                  <td className={`py-2 px-2 text-[10px] ${STATUS_COLOR[i.status]}`}>{i.status}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-foreground">{i.priority.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={() => setModalAsset(i.asset)}
                      disabled={i.hardBlocked}
                      title={
                        i.hardBlocked
                          ? "Upgrade the blocking library first. A certificate change cannot fix this object."
                          : "Raise a change request"
                      }
                      className="inline-flex items-center gap-1 text-[10px] text-teal hover:text-teal/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      <Ticket className="w-3 h-3" /> Raise
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 3. EVIDENCE ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Evidence</h2>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Discovered", value: readiness.vulnerable, hint: "quantum-vulnerable crypto objects" },
              { label: "Handed off", value: readiness.handedOff, hint: "change request raised, external ID recorded" },
              { label: "Blocked", value: readiness.agilityBlocked, hint: "named blocker, named fix" },
              { label: "Coverage", value: `${readiness.coveragePct}%`, hint: "vulnerable objects with a request" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-secondary/20 p-3">
                <p className="text-[24px] font-bold text-foreground tabular-nums leading-none">{s.value}</p>
                <p className="text-[11px] font-semibold text-foreground mt-1">{s.label}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border gap-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
              No completion forecast is shown. Migration executes in your change process, which the platform does not
              observe. We will not tell you when you will finish work we do not perform.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCurrentPage("tickets")}
                className="inline-flex items-center gap-1 text-[11px] text-teal hover:text-teal/80 font-medium"
              >
                Tickets <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  downloadEvidencePack(buildEvidencePack(estate, mockProtocols, mockLibraries, profileId, qDay))
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/30 text-[11px] font-semibold text-teal hover:bg-teal/15 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export evidence pack
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-secondary/20 border border-border">
          <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The pack is a CycloneDX 1.6 CBOM in which every component carries its QOE, its key-establishment and
            signature posture, its due year under a named authority, its agility verdict with the specific blocker and
            the specific fix, and its external change-request ID. Plus the blocker graph, the priced backlog, and the
            two assumptions this run was made under. Every figure traces to a discovery source. CISA and NIST publish
            CBOM minimum elements under EO 14412 Sec 5(d); the export re-emits against that schema when it lands.
          </p>
        </div>
      </section>

      {modalAsset && (
        <TicketDraftModal
          asset={modalAsset}
          action="pqc"
          destination="servicenow"
          defaultAssignmentGroup="PKI & Cryptography Team"
          onClose={() => setModalAsset(null)}
          onConfirm={() => {
            /* TicketDraftModal persists and toasts internally */
          }}
        />
      )}
    </div>
  );
}
