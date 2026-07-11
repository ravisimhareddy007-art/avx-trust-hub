// src/pages/QuantumPosturePage.tsx
//
// A projection over platform outputs. It computes nothing: QES comes from
// RiskContext, objects come from the inventory, QOE and the agility verdict
// come from the scoring lib. Every list is the real estate, ranked and
// paginated — not a hardcoded slice. Every row drills into inventory; every
// Raise uses the shared ticket flow.

import React, { useMemo, useState } from "react";
import { ArrowRight, Download, Ticket, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { useNav } from "@/context/NavigationContext";
import { useRisk } from "@/context/RiskContext";
import { mockAssets, type CryptoAsset } from "@/data/mockData";
import { mockProtocols, mockLibraries } from "@/data/cryptoStackMockData";
import {
  computeQOE,
  assessAgility,
  blockerGraph,
  buildEvidencePack,
  downloadEvidencePack,
  isQuantumVulnerable,
  DEADLINE_PROFILES,
  type DeadlineProfileId,
} from "@/lib/risk/qes";
import TicketDraftModal from "@/components/inventory/TicketDraftModal";

const PAGE = 15;

const sevChip = (q: number) =>
  q >= 80
    ? "bg-coral/15 text-coral"
    : q >= 60
      ? "bg-purple/15 text-purple-light"
      : q >= 30
        ? "bg-amber/15 text-amber"
        : "bg-teal/15 text-teal";

type SortKey = "qoe" | "name";

export default function QuantumPosturePage() {
  const { setCurrentPage, setFilters } = useNav();
  const { qes, ers, profileId, setProfileId, qDay, setQDay } = useRisk();

  const [modalAsset, setModalAsset] = useState<CryptoAsset | null>(null);
  const [lens, setLens] = useState<"qes" | "ers">("qes");
  const [sortKey, setSortKey] = useState<SortKey>("qoe");
  const [page, setPage] = useState(0);

  const profile = DEADLINE_PROFILES[profileId];

  // Drill helpers — route into the real inventory with keys it already reads.
  const goVulnerable = () => {
    setFilters({ tab: "identities", quantumVulnerable: "true" });
    setCurrentPage("inventory");
  };
  const goBlocked = () => {
    setFilters({ tab: "identities", filterId: "agility-blocked" });
    setCurrentPage("inventory");
  };
  const goObject = (name: string) => {
    setFilters({ tab: "identities", search: name });
    setCurrentPage("inventory");
  };
  const goLibraries = () => {
    setFilters({ tab: "crypto-assets" });
    setCurrentPage("inventory");
  };

  // The real vulnerable estate, ranked by QOE. Not a slice.
  const vulnerable = useMemo(() => {
    const rows = mockAssets
      .filter((a) => isQuantumVulnerable(a.algorithm))
      .map((a) => ({ asset: a, qoe: computeQOE(a, qDay).qoe, agility: assessAgility(a, mockLibraries) }));
    rows.sort((x, y) => (sortKey === "qoe" ? y.qoe - x.qoe : x.asset.name.localeCompare(y.asset.name)));
    return rows;
  }, [qDay, sortKey]);

  const pageCount = Math.max(1, Math.ceil(vulnerable.length / PAGE));
  const pageRows = vulnerable.slice(page * PAGE, page * PAGE + PAGE);

  const blockers = useMemo(() => blockerGraph(mockAssets, mockLibraries, mockProtocols), []);

  const active = lens === "qes" ? { score: qes.qes, sev: qes.severity } : { score: ers.ers, sev: ers.severity };
  const sevColor = (s: string) =>
    s === "Critical" ? "text-coral" : s === "High" ? "text-purple-light" : s === "Medium" ? "text-amber" : "text-teal";

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header + controls */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {vulnerable.length} quantum-vulnerable objects · ranked by exposure · priced against {profile.label}
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
              Deadline profile
            </label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value as DeadlineProfileId)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
            >
              {Object.values(DEADLINE_PROFILES).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
              Assumed Q-day
            </label>
            <select
              value={qDay}
              onChange={(e) => setQDay(Number(e.target.value))}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
            >
              {[2030, 2032, 2035, 2040].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* EXPOSURE — score with ERS/QES toggle + two real drills */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Exposure</h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Score card with toggle */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Enterprise score</p>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setLens("ers")}
                  className={`px-2 py-0.5 text-[10px] font-semibold ${lens === "ers" ? "bg-teal/15 text-teal" : "text-muted-foreground"}`}
                >
                  ERS
                </button>
                <button
                  onClick={() => setLens("qes")}
                  className={`px-2 py-0.5 text-[10px] font-semibold ${lens === "qes" ? "bg-purple/15 text-purple-light" : "text-muted-foreground"}`}
                >
                  QES
                </button>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-bold tabular-nums ${sevColor(active.sev)}`}>{active.score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className="text-[9.5px] text-muted-foreground mt-2 leading-tight">
              {lens === "qes"
                ? "Quantum exposure, scored apart from operational risk. Toggle to ERS to compare."
                : "Operational enterprise risk. Toggle to QES for the quantum lens."}
            </p>
          </div>

          {/* Drill: all vulnerable */}
          <button
            onClick={goVulnerable}
            className="bg-card rounded-xl border border-border p-5 text-left hover:border-teal/40 transition-all group"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Quantum-vulnerable</p>
            <p className="text-3xl font-bold tabular-nums text-coral">{vulnerable.length}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">objects violating the PQC policy</p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 ml-2 shrink-0" />
            </div>
          </button>

          {/* Drill: cannot migrate */}
          <button
            onClick={goBlocked}
            className="bg-card rounded-xl border border-border p-5 text-left hover:border-teal/40 transition-all group"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Cannot migrate today</p>
            <p className="text-3xl font-bold tabular-nums text-amber">
              {vulnerable.filter((v) => !v.agility.agile).length}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">blocked by a library or CA, not the cert</p>
              <ArrowRight className="w-3 h-3 text-teal opacity-0 group-hover:opacity-100 ml-2 shrink-0" />
            </div>
          </button>
        </div>
      </section>

      {/* PRIORITISED BACKLOG — the real estate, ranked, paginated */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Prioritised backlog
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <button onClick={() => setSortKey("qoe")} className={sortKey === "qoe" ? "text-teal font-semibold" : ""}>
              Sort: exposure
            </button>
            <button onClick={() => setSortKey("name")} className={sortKey === "name" ? "text-teal font-semibold" : ""}>
              Sort: name
            </button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 px-3 font-medium">Object</th>
                <th className="py-2 px-3 font-medium">Algorithm</th>
                <th className="py-2 px-3 font-medium text-right">QOE</th>
                <th className="py-2 px-3 font-medium">Agility</th>
                <th className="py-2 px-3 font-medium">Owner</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ asset, qoe, agility }) => (
                <tr key={asset.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                  <td className="py-2 px-3">
                    <button onClick={() => goObject(asset.name)} className="text-left hover:text-teal">
                      <span className="font-medium text-foreground">{asset.name}</span>
                    </button>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{asset.algorithm}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded ${sevChip(qoe)}`}>
                      {qoe}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {agility.agile ? (
                      <span className="text-[10px] text-teal">Agile</span>
                    ) : (
                      <span
                        title={agility.blockers.map((b) => `${b.detail} → ${b.fix}`).join("\n")}
                        className={`inline-flex items-center gap-1 text-[10px] ${agility.hardBlocked ? "text-coral" : "text-amber"}`}
                      >
                        <Lock className="w-3 h-3" />
                        {agility.hardBlocked ? "Hard-blocked" : `${agility.blockers.length} blocker(s)`}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{asset.owner}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => setModalAsset(asset)}
                      disabled={agility.hardBlocked}
                      title={
                        agility.hardBlocked
                          ? "Upgrade the blocking library first — a cert change cannot fix this object."
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
          {/* Pagination — honest about scale */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
            <span>
              {vulnerable.length === 0
                ? "No quantum-vulnerable objects"
                : `${page * PAGE + 1}–${Math.min((page + 1) * PAGE, vulnerable.length)} of ${vulnerable.length}`}
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <button
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEQUENCE — blockers derived from real libraries, drillable */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Unblock before you migrate
          </h2>
          <button onClick={goLibraries} className="text-[10px] text-teal hover:text-teal/80 flex items-center gap-1">
            All libraries <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 px-3 font-medium">Library</th>
                <th className="py-2 px-3 font-medium">Remediation</th>
                <th className="py-2 px-3 font-medium text-right">Objects unblocked</th>
                <th className="py-2 px-3 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {blockers.map((b) => (
                <tr key={b.library} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                  <td className="py-2 px-3">
                    <button onClick={goLibraries} className="text-left hover:text-teal font-medium text-foreground">
                      {b.library}
                    </button>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-teal">{b.fix}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-semibold">{b.objectsUnblocked}</td>
                  <td className={`py-2 px-3 text-[10px] ${b.severity === "hard" ? "text-coral" : "text-amber"}`}>
                    {b.severity === "hard" ? "Hard blocker" : "Soft blocker"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* EVIDENCE — one action, no essay */}
      <section className="flex items-center justify-between bg-card rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Evidence pack</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            CycloneDX CBOM: every object, its QOE, posture, deadline, blocker and change-request ID.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage("tickets")}
            className="inline-flex items-center gap-1 text-[11px] text-teal hover:text-teal/80 font-medium"
          >
            Tickets <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              downloadEvidencePack(buildEvidencePack(mockAssets, mockProtocols, mockLibraries, profileId, qDay))
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/30 text-[11px] font-semibold text-teal hover:bg-teal/15 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export evidence pack
          </button>
        </div>
      </section>

      {modalAsset && (
        <TicketDraftModal
          asset={modalAsset}
          action="pqc"
          destination="servicenow"
          defaultAssignmentGroup="PKI & Cryptography Team"
          onClose={() => setModalAsset(null)}
          onConfirm={() => {}}
        />
      )}
    </div>
  );
}
