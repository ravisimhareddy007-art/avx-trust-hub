import React, { useState } from "react";
import {
  Atom,
  Clock,
  AlertTriangle,
  ArrowRight,
  Info,
  Ticket,
  CheckCircle2,
  ShieldCheck,
  Server,
  Cpu,
  Boxes,
  Layers,
  GitBranch,
} from "lucide-react";
import { useNav } from "@/context/NavigationContext";

// ────────────────────────────────────────────────────────────────────────────
// Quantum Readiness — the full 5-stage vision (Discover → Assess → Plan →
// Migrate → Monitor). Self-contained: reads no external components, only the
// nav context for drill-through. Estate figures are illustrative, consistent
// with the rest of the dashboard's estate-scale numbers.
// ────────────────────────────────────────────────────────────────────────────

type StageId = "discover" | "assess" | "plan" | "migrate" | "monitor";

const STAGES: { id: StageId; num: number; label: string; status: string; state: "done" | "active" | "todo" }[] = [
  { id: "discover", num: 1, label: "Discover", status: "Complete", state: "done" },
  { id: "assess", num: 2, label: "Assess", status: "In Progress", state: "active" },
  { id: "plan", num: 3, label: "Plan", status: "Not Started", state: "todo" },
  { id: "migrate", num: 4, label: "Migrate", status: "Not Started", state: "todo" },
  { id: "monitor", num: 5, label: "Monitor", status: "Not Started", state: "todo" },
];

const SEV: Record<string, string> = {
  Critical: "bg-coral/15 text-coral",
  High: "bg-amber/15 text-amber",
  Medium: "bg-purple/15 text-purple-light",
  Low: "bg-teal/15 text-teal",
};

// Literal class maps — Tailwind only emits classes it can see as full strings,
// so color roles must resolve to complete literals here, never `bg-${role}`.
const BG: Record<string, string> = { coral: "bg-coral", amber: "bg-amber", teal: "bg-teal", purple: "bg-purple" };
const TX: Record<string, string> = {
  coral: "text-coral",
  amber: "text-amber",
  teal: "text-teal",
  "purple-light": "text-purple-light",
  foreground: "text-foreground",
  "muted-foreground": "text-muted-foreground",
};
const BADGE: Record<string, string> = {
  coral: "bg-coral/15 text-coral",
  teal: "bg-teal/15 text-teal",
  amber: "bg-amber/15 text-amber",
  "purple-light": "bg-purple/15 text-purple-light",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card rounded-xl border border-border p-5 ${className}`}>{children}</div>;
}

function Deadline() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-coral/10 text-coral border border-coral/20">
      <Clock className="w-3.5 h-3.5" /> 3.6 years to NIST 2030 deadline
    </span>
  );
}

// ── STAGE 1 — DISCOVER ──────────────────────────────────────────────────────
const ALGO_BARS = [
  { label: "RSA-2048", value: 8500, role: "coral" },
  { label: "RSA-4096", value: 2100, role: "coral" },
  { label: "ECC P-256", value: 1500, role: "amber" },
  { label: "ECC P-384", value: 560, role: "amber" },
  { label: "AES-256", value: 9200, role: "teal" },
  { label: "ML-KEM", value: 187, role: "teal" },
];
const HEAT_COLS = ["TLS", "SSH", "Secrets", "K8s", "AI Tokens"];
const HEAT_ROWS: { bu: string; cells: string[] }[] = [
  { bu: "Payments", cells: ["Critical", "High", "Critical", "High", "Medium"] },
  { bu: "Platform", cells: ["High", "High", "High", "High", "Medium"] },
  { bu: "Infrastructure", cells: ["High", "Critical", "Medium", "Medium", "Low"] },
  { bu: "AI Eng", cells: ["Medium", "Medium", "High", "Medium", "Critical"] },
  { bu: "Security", cells: ["Medium", "High", "High", "Low", "Low"] },
];
const HNDL = [
  {
    host: "payments-api.acmecorp.com",
    algo: "RSA-2048",
    face: "Internet-facing",
    vol: "47,000 financial tx/day",
    tags: ["PCI-DSS", "financial transaction data"],
    deps: 7,
    eta: "~3 months",
    interim: "Restrict to internal egress only until migrated — remove direct internet exposure",
  },
  {
    host: "auth.acmecorp.com",
    algo: "ECC P-256",
    face: "Internet-facing",
    vol: "SSO for 12,000 employees",
    tags: ["identity", "session tokens"],
    deps: 14,
    eta: "~4 months",
    interim: "Enforce MFA on all sessions as compensating control",
  },
  {
    host: "vault.internal.acmecorp.com",
    algo: "RSA-3072",
    face: "Internal",
    vol: "Secrets store — 6,240 secrets",
    tags: ["credentials", "key material"],
    deps: 38,
    eta: "~6 months",
    interim: "Rotate high-value secrets on 30-day cycle during migration",
  },
];

function Discover({ goInventory }: { goInventory: (f?: Record<string, string>) => void }) {
  const maxBar = Math.max(...ALGO_BARS.map((b) => b.value));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Quantum-vulnerable objects
          </div>
          <div className="text-4xl font-bold text-coral tabular-nums">12,660</div>
          <div className="text-xs text-muted-foreground mt-2">28.3% of estate — RSA, ECC public-key only</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            HNDL active exposure
          </div>
          <div className="text-4xl font-bold text-coral tabular-nums">3,842</div>
          <div className="text-xs text-muted-foreground mt-2">
            Internet-facing + long-lived sensitive data at risk TODAY
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            PQC-safe today
          </div>
          <div className="text-4xl font-bold text-teal tabular-nums">187</div>
          <div className="text-xs text-muted-foreground mt-2">
            ML-KEM only · 1.5% of vulnerable estate migrated · AES-256 already safe
          </div>
        </Card>
      </div>

      <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
        <p className="text-xs text-teal/90 leading-relaxed">
          <span className="font-semibold text-teal">NIST guidance (FIPS 203/204/205):</span> Symmetric encryption
          (AES-256) and hashing (SHA-2/3) are quantum-resistant and require no migration. Focus is exclusively on
          public-key cryptography — RSA, ECC, DSA, and DH variants are the migration targets.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground">Algorithm Breakdown — Cryptographic Estate</h3>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-coral" /> RSA — Critical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber" /> ECC — High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal" /> Quantum-safe
            </span>
          </div>
        </div>
        <div className="flex items-end justify-around gap-3 h-52">
          {ALGO_BARS.map((b) => (
            <button
              key={b.label}
              onClick={() => goInventory({ tab: "identities", search: b.label })}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <span className="text-[10px] text-muted-foreground tabular-nums">{b.value.toLocaleString()}</span>
              <div
                className={`w-full rounded-t transition-opacity group-hover:opacity-80 ${BG[b.role]}`}
                style={{ height: `${(b.value / maxBar) * 160}px`, minHeight: 4 }}
              />
              <span className="text-[10px] text-muted-foreground">{b.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Click any bar to view those objects in Inventory
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">PQC Risk Heatmap — Business Unit × Asset Type</h3>
          <button
            onClick={() => goInventory({ tab: "identities", quantumVulnerable: "true" })}
            className="text-[11px] text-teal hover:underline inline-flex items-center gap-1"
          >
            View all Critical <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "110px repeat(5, 1fr)" }}>
          <div />
          {HEAT_COLS.map((c) => (
            <div key={c} className="text-[11px] text-muted-foreground text-center font-medium pb-1">
              {c}
            </div>
          ))}
          {HEAT_ROWS.map((r) => (
            <React.Fragment key={r.bu}>
              <div className="text-[11px] text-muted-foreground flex items-center">{r.bu}</div>
              {r.cells.map((sev, i) => (
                <button
                  key={i}
                  onClick={() => goInventory({ tab: "identities", quantumVulnerable: "true" })}
                  className={`text-[11px] font-semibold text-center py-2.5 rounded ${SEV[sev]} hover:opacity-80 transition-opacity`}
                >
                  {sev}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-foreground">Top HNDL Exposure — Highest Priority Assets</h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-coral/15 text-coral">HNDL</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          Sorted by Mosca's Theorem priority. NIST: categorize by criticality, disclosure sensitivity, and downstream
          dependency count.
        </p>
        <div className="space-y-3">
          {HNDL.map((a, i) => (
            <div key={a.host} className="border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[13px] text-foreground">{a.host}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-coral/15 text-coral">
                      CRITICAL
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="font-mono">{a.algo}</span>
                    <span>· {a.face}</span>
                    <span>· {a.vol}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {a.tags.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-purple/15 text-purple-light">
                        {t}
                      </span>
                    ))}
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <GitBranch className="w-3 h-3" /> {a.deps} downstream systems
                    </span>
                    <span className="text-[10px] text-muted-foreground">Est. migration: {a.eta}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-amber font-medium">Interim control:</span> {a.interim}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── STAGE 2 — ASSESS ────────────────────────────────────────────────────────
const AGILITY = [
  {
    cat: "API Gateways",
    pct: 34,
    role: "coral",
    badge: "Hardware change required",
    badgeRole: "coral",
    keySize: "Max RSA-4096 today — PQC key sizes 3x larger, require config changes",
    latency: "TLS handshake +40-60ms estimated for ML-KEM vs RSA-2048",
    note: "Hardcoded cert configs — swap requires full redeploy and load balancer reconfiguration",
  },
  {
    cat: "App Servers",
    pct: 52,
    role: "amber",
    badge: "Software-updatable",
    badgeRole: "teal",
    keySize: "JDK 17+ supports ML-KEM; older runtimes require upgrade first",
    latency: "Minimal — server-side key operations, client handles handshake overhead",
    note: "Modern app servers agile via library update; legacy batch servers require runtime upgrade",
  },
  {
    cat: "K8s Clusters",
    pct: 78,
    role: "teal",
    badge: "Software-updatable",
    badgeRole: "teal",
    keySize: "cert-manager 1.14+ supports FIPS 203/204 — already deployed",
    latency: "Negligible — short-lived certs rotate frequently, per-cert overhead minimal",
    note: "cert-manager enables algorithm swap per namespace with zero downtime",
  },
  {
    cat: "HSM Appliances",
    pct: 22,
    role: "coral",
    badge: "Firmware upgrade required",
    badgeRole: "coral",
    keySize: "Thales Luna 7.4 firmware adds PQC; procurement + maintenance window needed",
    latency: "Hardware-accelerated once upgraded — no runtime penalty",
    note: "Vendor firmware dependency — longest lead time in the estate",
  },
];

function Assess() {
  return (
    <div className="space-y-5">
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Crypto Agility Assessment — By Infrastructure Category
        </h3>
        <p className="text-[11px] text-muted-foreground mb-5">
          NIST: document whether implementations support crypto agility, key size constraints, software-updatability,
          and latency/throughput thresholds before migration.
        </p>
        <div className="space-y-4">
          {AGILITY.map((a) => (
            <div key={a.cat} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{a.cat}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${BADGE[a.badgeRole]}`}>{a.badge}</span>
                  <span className={`text-lg font-bold ${TX[a.role]} tabular-nums`}>{a.pct}%</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-secondary mb-3">
                <div className={`h-full rounded-full ${BG[a.role]}`} style={{ width: `${a.pct}%` }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Key size impact
                  </div>
                  <p className="text-[11px] text-foreground/80">{a.keySize}</p>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Latency impact
                  </div>
                  <p className="text-[11px] text-foreground/80">{a.latency}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/60">{a.note}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── STAGE 3 — PLAN ──────────────────────────────────────────────────────────
const WAVES = [
  {
    num: 1,
    title: "Wave 1 — Critical HNDL",
    desc: "Internet-facing assets with active HNDL exposure and financial/PII data",
    count: 847,
    period: "Q2 2026",
    status: "In Progress",
    statusRole: "teal",
    satisfies: "NSA CNSA 2.0 (2025)",
    countRole: "coral",
  },
  {
    num: 2,
    title: "Wave 2 — High Priority",
    desc: "Production assets not HNDL-active but carrying sensitive data",
    count: 3218,
    period: "Q3–Q4 2026",
    status: "Planned",
    statusRole: "purple-light",
    satisfies: "NSA CNSA 2.0 (2027 new systems)",
    countRole: "amber",
  },
  {
    num: 3,
    title: "Wave 3 — Remaining Estate",
    desc: "Internal and lower-sensitivity assets, batch and legacy systems",
    count: 7595,
    period: "2027–2029",
    status: "Planned",
    statusRole: "purple-light",
    satisfies: "NSA CNSA 2.0 (2030 all systems)",
    countRole: "muted-foreground",
  },
];

function Plan() {
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Migration Progress vs NIST 2030 Deadline</h3>
          <Deadline />
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden bg-secondary flex">
          <div className="bg-teal h-full" style={{ width: "1.5%" }} />
          <div className="bg-purple h-full" style={{ width: "6.7%" }} />
        </div>
        <div className="flex items-center gap-5 mt-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal" /> 187 migrated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple" /> 847 in-flight (Wave 1)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-coral" /> 11,626 remaining
          </span>
        </div>
        <div className="bg-coral/5 border border-coral/20 rounded-lg p-3 mt-4">
          <p className="text-xs text-coral font-semibold">
            At current pace — migration completes 2031, one year past the NIST deadline.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Wave 2 must begin no later than Q3 2026 to meet the 2030 mandate. Mosca's Theorem confirms Wave 1 and 2
            urgency.
          </p>
        </div>
      </Card>

      {WAVES.map((w) => (
        <Card key={w.num}>
          <div className="flex items-start gap-4">
            <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
              {w.num}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{w.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{w.desc}</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${TX[w.countRole]} tabular-nums`}>{w.count.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">objects</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">
                Period: <span className="text-foreground font-medium">{w.period}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${BADGE[w.statusRole]}`}>{w.status}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Satisfies: <span className="text-teal">{w.satisfies}</span>
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── STAGE 4 — MIGRATE ───────────────────────────────────────────────────────
const FLIGHT = [
  {
    host: "payments-api.acmecorp.com",
    from: "RSA-2048",
    to: "ML-KEM",
    team: "Payments Eng",
    remaining: "14d remaining",
    deps: 7,
    status: "In Progress",
    blocked: false,
  },
  {
    host: "prod-gateway-01.acmecorp.com",
    from: "RSA-2048",
    to: "ML-KEM",
    team: "Infrastructure",
    remaining: "7d remaining",
    deps: 22,
    status: "In Progress",
    blocked: false,
  },
  {
    host: "eks-prod-cluster",
    from: "ECC P-256",
    to: "ML-DSA",
    team: "Platform Eng",
    remaining: "21d remaining",
    deps: 12,
    status: "In Progress",
    blocked: false,
  },
  {
    host: "auth.acmecorp.com",
    from: "ECC P-256",
    to: "ML-DSA",
    team: "Security Ops",
    remaining: "",
    deps: 14,
    status: "Blocked",
    blocked: true,
    block: "HSM firmware upgrade required — Thales Luna 7.4 (procurement in progress)",
    interim: "MFA enforcement active on all SSO sessions as interim control",
  },
];

function Migrate({
  goInventory,
  goTickets,
}: {
  goInventory: (f?: Record<string, string>) => void;
  goTickets: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "In Progress", value: 4, role: "teal" },
          { label: "Blocked", value: 2, role: "coral" },
          { label: "Completed", value: 2, role: "foreground" },
          { label: "Hybrid Mode Active", value: 3, role: "purple-light", info: true },
        ].map((c) => (
          <Card key={c.label}>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
              {c.label}
              {c.info && <Info className="w-3 h-3" />}
            </div>
            <div className={`text-4xl font-bold tabular-nums ${TX[c.role]}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">In-Flight Migrations</h3>
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" /> Showing {FLIGHT.length} representative migrations ·
            847 total in Wave 1
          </span>
        </div>
        <div className="space-y-3">
          {FLIGHT.map((m) => (
            <div key={m.host} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[13px] text-foreground">{m.host}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${m.blocked ? "bg-coral/15 text-coral" : "bg-teal/15 text-teal"}`}
                    >
                      {m.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <GitBranch className="w-3 h-3" /> {m.deps} dependents
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                    <span className="font-mono text-coral">{m.from}</span> <ArrowRight className="w-3 h-3" />{" "}
                    <span className="font-mono text-teal">{m.to}</span>
                    <span>· {m.team}</span>
                    {m.remaining && <span>· {m.remaining}</span>}
                  </div>
                </div>
                {m.blocked ? (
                  <button
                    onClick={goTickets}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-teal text-teal hover:bg-teal/10"
                  >
                    Create Ticket
                  </button>
                ) : (
                  <button
                    onClick={() => goInventory({ tab: "identities", search: m.host })}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    View in Inventory <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {m.blocked && (
                <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" /> {m.block}
                  </p>
                  <p className="text-[11px] text-muted-foreground inline-flex items-start gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />{" "}
                    <span>
                      <span className="text-teal font-medium">Interim:</span> {m.interim}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── STAGE 5 — MONITOR ───────────────────────────────────────────────────────
const PACE = [
  { m: "Jan", migrated: 40, required: 150 },
  { m: "Feb", migrated: 55, required: 260 },
  { m: "Mar", migrated: 90, required: 400 },
  { m: "Apr", migrated: 180, required: 560 },
];
const VALIDATED = [
  { host: "staging-api.acmecorp.com", deps: 4, algo: "ML-DSA", date: "2026-04-22", done: true },
  { host: "cdn.acmecorp.com", deps: 8, algo: "ML-KEM", date: "2026-04-18", done: true },
  { host: "payments-api.acmecorp.com", deps: 7, algo: "ML-KEM", date: "In Progress", done: false },
];

function Monitor({ goInventory }: { goInventory: (f?: Record<string, string>) => void }) {
  const maxP = Math.max(...PACE.flatMap((p) => [p.migrated, p.required]));
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">Cumulative Migrations — Actual vs Required Pace</h3>
          <Deadline />
        </div>
        <p className="text-[11px] text-muted-foreground mb-5">
          Wave 1 started March 2026 — acceleration reflects first production migrations going live. Required pace
          assumes linear completion to 2030 deadline.
        </p>
        <div className="flex items-end justify-around gap-6 h-52">
          {PACE.map((p) => (
            <div key={p.m} className="flex-1 flex flex-col items-center gap-2">
              <div className="flex items-end gap-1.5 h-40 w-full justify-center">
                <div
                  className="w-8 bg-teal rounded-t"
                  style={{ height: `${(p.migrated / maxP) * 160}px`, minHeight: 3 }}
                />
                <div
                  className="w-8 bg-amber rounded-t"
                  style={{ height: `${(p.required / maxP) * 160}px`, minHeight: 3, opacity: 0.65 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{p.m}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-5 mt-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal" /> Migrated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber" style={{ opacity: 0.65 }} /> Required pace
          </span>
        </div>
        <div className="bg-coral/5 border border-coral/20 rounded-lg p-3 mt-4">
          <p className="text-xs text-coral font-semibold">
            Tracking 33% behind required pace — Wave 2 must start Q3 2026 without delay to recover.
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">PQC Validation Status — Migrated Assets</h3>
          <button
            onClick={() => goInventory({ tab: "identities", navPqc: "safe" })}
            className="text-[11px] text-teal hover:underline inline-flex items-center gap-1"
          >
            View all PQC-safe <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          NIST: develop implementation validation tools and test new processes after each migration. Dependency
          validation confirms downstream systems function correctly post-migration.
        </p>
        <div className="space-y-1">
          {VALIDATED.map((v) => (
            <div key={v.host} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${v.done ? "text-teal" : "text-amber"}`} />
              <span className="font-mono text-[12px] text-foreground flex-1 truncate">{v.host}</span>
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> {v.deps} dependents validated
              </span>
              <span className="text-[11px] font-mono text-teal w-16 text-right">{v.algo}</span>
              <span className={`text-[11px] w-24 text-right ${v.done ? "text-muted-foreground" : "text-amber"}`}>
                {v.date}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-1">Regression Alerts — Algorithm Rollbacks Detected</h3>
        <p className="text-[11px] text-muted-foreground mb-4">
          NIST: continuously monitor migrated assets for unintended reversion to quantum-vulnerable algorithms. Any
          rollback must trigger immediate alert and re-migration.
        </p>
        <div className="border border-border rounded-lg py-10 flex flex-col items-center justify-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-teal" />
          <span className="text-sm font-semibold text-foreground">No regressions detected</span>
          <span className="text-[11px] text-muted-foreground">
            All migrated assets holding PQC algorithms · 2 assets validated · Last scan: 2 hours ago
          </span>
        </div>
      </Card>
    </div>
  );
}

// ── PAGE ────────────────────────────────────────────────────────────────────
export default function QuantumPosturePage() {
  const [stage, setStage] = useState<StageId>("discover");
  const { setCurrentPage, setFilters } = useNav();
  const goInventory = (f: Record<string, string> = {}) => {
    setFilters(f);
    setCurrentPage("inventory");
  };
  const goTickets = () => setCurrentPage("tickets");

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Atom className="w-5 h-5 text-purple-light" />
            <h1 className="text-xl font-bold text-foreground">Quantum Readiness</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            12,660 quantum-vulnerable objects across 44,698 total · NIST FIPS 203/204/205 aligned · 2026 is the Year of
            Quantum Security (FBI/CISA/NIST)
          </p>
        </div>
        <Deadline />
      </div>

      {/* Stage navigator */}
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map((s) => {
          const active = stage === s.id;
          const dot = s.state === "done" ? "bg-teal" : s.state === "active" ? "bg-amber" : "bg-muted-foreground/40";
          return (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${active ? "border-border-strong bg-purple/15" : "border-border bg-card hover:border-border-strong"}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className={`text-[12px] font-semibold ${active ? "text-purple-light" : "text-foreground"}`}>
                  Stage {s.num}: {s.label}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.status}</div>
            </button>
          );
        })}
      </div>

      {/* Stage content */}
      {stage === "discover" && <Discover goInventory={goInventory} />}
      {stage === "assess" && <Assess />}
      {stage === "plan" && <Plan />}
      {stage === "migrate" && <Migrate goInventory={goInventory} goTickets={goTickets} />}
      {stage === "monitor" && <Monitor goInventory={goInventory} />}
    </div>
  );
}
