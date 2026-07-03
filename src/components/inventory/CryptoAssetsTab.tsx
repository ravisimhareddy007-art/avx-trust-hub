import React, { useState, useMemo } from "react";
import {
  Network,
  Package,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Ticket,
  ArrowRight,
  ArrowUpRight,
  Info,
} from "lucide-react";
import {
  mockProtocols,
  mockLibraries,
  ProtocolAsset,
  LibraryAsset,
  StackSeverity,
  CipherSuite,
} from "@/data/cryptoStackMockData";
import { mockITAssets, ITAsset } from "@/data/inventoryMockData";
import { useExceptions } from "@/lib/exceptions/ExceptionsContext";
import { RaiseExceptionModal } from "@/lib/exceptions/ExceptionComponents";
import { EnvBadge } from "@/components/shared/UIComponents";
import { useNav } from "@/context/NavigationContext";
import TicketDraftModal, { TicketDraft } from "@/components/inventory/TicketDraftModal";

// ---- shared helpers ----------------------------------------------------------
const SEV_TEXT: Record<StackSeverity, string> = {
  Critical: "text-coral",
  High: "text-coral",
  Medium: "text-amber",
  Low: "text-teal",
};
const SEV_DOT: Record<StackSeverity, string> = {
  Critical: "bg-coral",
  High: "bg-coral",
  Medium: "bg-amber",
  Low: "bg-teal",
};
const crsChip = (n: number) =>
  n >= 60 ? "text-coral bg-coral/12" : n >= 30 ? "text-amber bg-amber/12" : "text-teal bg-teal/12";
const suiteColor: Record<CipherSuite["strength"], string> = {
  Strong: "text-teal",
  Weak: "text-amber",
  Insecure: "text-coral",
};
const assetByFqdn = (fqdn: string) => mockITAssets.find((a) => a.name === fqdn);

const POLICY_NAME: Record<string, string> = {
  "OOB-PROT-01": "Deprecated TLS Version Accepted",
  "OOB-PROT-02": "Weak or Prohibited Cipher Suite",
  "OOB-PROT-03": "Legacy SSL Protocol Accepted",
  "OOB-LIB-01": "End-of-Life Cryptographic Library",
  "OOB-LIB-02": "Known-CVE Vulnerable Library",
};

interface Factor {
  id: string;
  label: string;
  raw: number;
  weight: number;
  why: string;
}
const WEIGHTS = { algorithm: 31, lifecycle: 24, exposure: 19, access: 15, compliance: 11 };

function protocolFactors(p: ProtocolAsset): Factor[] {
  const worst = [...p.cipherSuites].sort(
    (a, b) => ({ Insecure: 0, Weak: 1, Strong: 2 })[a.strength] - { Insecure: 0, Weak: 1, Strong: 2 }[b.strength],
  )[0];
  const algoRaw = worst.strength === "Insecure" ? 95 : worst.strength === "Weak" ? 70 : 15;
  const verRaw = /SSLv2|SSLv3/.test(p.version)
    ? 100
    : /1\.0|1\.1/.test(p.version)
      ? 80
      : /1\.2/.test(p.version)
        ? 25
        : 10;
  const expRaw =
    p.exposure === "Internet-facing"
      ? p.environment === "Production"
        ? 80
        : 50
      : p.environment === "Production"
        ? 55
        : p.environment === "Staging"
          ? 30
          : 15;
  const accRaw =
    p.owner === "Unassigned" ? 80 : p.policyViolations.length >= 2 ? 60 : p.policyViolations.length === 1 ? 40 : 15;
  const compRaw = p.policyViolations.length ? 70 : 20;
  return [
    {
      id: "algorithm",
      label: "Algorithm",
      raw: algoRaw,
      weight: WEIGHTS.algorithm,
      why: `Weakest suite: ${worst.enc} (${worst.strength})`,
    },
    {
      id: "lifecycle",
      label: "Lifecycle",
      raw: verRaw,
      weight: WEIGHTS.lifecycle,
      why: `${p.version} deprecation status`,
    },
    {
      id: "exposure",
      label: "Exposure",
      raw: expRaw,
      weight: WEIGHTS.exposure,
      why: `${p.exposure} · ${p.environment}`,
    },
    {
      id: "access",
      label: "Access",
      raw: accRaw,
      weight: WEIGHTS.access,
      why: p.owner === "Unassigned" ? "No owner assigned" : `${p.policyViolations.length} policy violations`,
    },
    {
      id: "compliance",
      label: "Compliance",
      raw: compRaw,
      weight: WEIGHTS.compliance,
      why: p.policyViolations.length ? "Violates NIST SP 800-52 baseline" : "Meets current baseline",
    },
  ];
}

function libraryFactors(l: LibraryAsset): Factor[] {
  const impl = l.implementsList.join(" ");
  const algoRaw = /TLS 1\.0|TLS 1\.1|3DES|SHA-1|RC4/.test(impl) ? 85 : /RSA/.test(impl) ? 45 : 15;
  const lifeRaw = l.eolStatus === "End-of-Life" ? 100 : l.eolStatus === "Outdated" ? 55 : 15;
  const expRaw = l.inUse ? Math.min(85, 35 + l.assetsAffected.length * 10) : 20;
  const accRaw =
    l.owner === "Unassigned" ? 80 : l.policyViolations.length >= 2 ? 60 : l.policyViolations.length === 1 ? 40 : 15;
  const compRaw = l.maxCvss >= 7 ? 90 : l.maxCvss > 0 ? 55 : l.eolStatus === "End-of-Life" ? 60 : 20;
  return [
    {
      id: "algorithm",
      label: "Algorithm",
      raw: algoRaw,
      weight: WEIGHTS.algorithm,
      why: `Implements: ${l.implementsList.slice(0, 3).join(", ")}`,
    },
    {
      id: "lifecycle",
      label: "Lifecycle",
      raw: lifeRaw,
      weight: WEIGHTS.lifecycle,
      why: `${l.eolStatus}${l.eolDate !== "Active" ? ` since ${l.eolDate}` : ""}`,
    },
    {
      id: "exposure",
      label: "Exposure",
      raw: expRaw,
      weight: WEIGHTS.exposure,
      why: `${l.inUse ? "In use" : "Dormant"} · ${l.assetsAffected.length} assets`,
    },
    {
      id: "access",
      label: "Access",
      raw: accRaw,
      weight: WEIGHTS.access,
      why: l.owner === "Unassigned" ? "No owner assigned" : `${l.policyViolations.length} policy violations`,
    },
    {
      id: "compliance",
      label: "Compliance",
      raw: compRaw,
      weight: WEIGHTS.compliance,
      why: l.maxCvss > 0 ? `Max CVSS ${l.maxCvss}` : l.eolStatus === "End-of-Life" ? "Past vendor EOL" : "Compliant",
    },
  ];
}

const priorityForSeverity = (s: StackSeverity): TicketDraft["priority"] =>
  s === "Critical" ? "Critical" : s === "High" ? "High" : s === "Medium" ? "Medium" : "Low";
const slaFor = (p: TicketDraft["priority"]) =>
  p === "Critical"
    ? "Resolve within 24 hours, P1 SLA"
    : p === "High"
      ? "Resolve within 72 hours, P2 SLA"
      : "Resolve within 7 days, P3 SLA";

function protocolDraft(p: ProtocolAsset): TicketDraft {
  const priority = priorityForSeverity(p.severity);
  const weakest = [...p.cipherSuites].sort(
    (a, b) => ({ Insecure: 0, Weak: 1, Strong: 2 })[a.strength] - { Insecure: 0, Weak: 1, Strong: 2 }[b.strength],
  )[0];
  const viol = p.policyViolations.map((id) => POLICY_NAME[id] || id).join(", ");
  return {
    title: `Remediate ${p.version} on ${p.fqdn}:${p.port}`,
    type: "Remediation",
    priority,
    assignee: p.owner !== "Unassigned" ? p.owner : p.team,
    module: p.protocol === "SSH" ? "SSH" : "Protocol",
    description: `${p.protocol} endpoint ${p.fqdn}:${p.port} accepts ${p.version} with weakest ${p.protocol === "SSH" ? "algorithm" : "cipher suite"} ${weakest.enc} (${weakest.strength}). Exposure: ${p.exposure} in ${p.environment}. Violations: ${viol || "none"}.`,
    rootCause:
      `Endpoint configuration permits ${p.version}${weakest.strength !== "Strong" ? ` and ${weakest.strength.toLowerCase()} ${weakest.enc}` : ""}. ${p.bound ? "" : "Host is not in IT asset inventory (shadow host)."}`.trim(),
    remediationSteps: [
      `Disable ${p.version} on ${p.fqdn}:${p.port}; enforce TLS 1.2 minimum (NIST SP 800-52 Rev2)`,
      `Remove weak/insecure cipher suites (${weakest.enc}); allow AEAD suites only`,
      `Re-scan the endpoint via ${p.discoverySource} to confirm remediation`,
      `Validate handshake and downstream connectivity post-change`,
    ],
    affectedSystems: p.bound
      ? `Endpoint ${p.fqdn}:${p.port} · ${p.environment}`
      : `Unbound host ${p.fqdn}:${p.port} (not in inventory)`,
    complianceImpact: `NIST SP 800-52 Rev2; PCI DSS v4.0 Req 4.2.1${p.policyViolations.includes("OOB-PROT-02") ? "; SP 800-131A Rev2" : ""}`,
    sla: slaFor(priority),
  };
}

function libraryDraft(l: LibraryAsset): TicketDraft {
  const priority = priorityForSeverity(l.severity);
  const topCve = l.cves.slice().sort((a, b) => b.cvss - a.cvss)[0];
  const viol = l.policyViolations.map((id) => POLICY_NAME[id] || id).join(", ");
  return {
    title: `Upgrade ${l.name} ${l.version} across ${l.assetsAffected.length} host${l.assetsAffected.length === 1 ? "" : "s"}`,
    type: "Remediation",
    priority,
    assignee: l.owner !== "Unassigned" ? l.owner : l.team,
    module: "Library",
    description: `${l.name} ${l.version} (${l.provider}) is ${l.eolStatus.toLowerCase()}${l.eolDate !== "Active" ? ` since ${l.eolDate}` : ""} and ${l.inUse ? "reached in production" : "present but dormant"} on ${l.assetsAffected.length} host${l.assetsAffected.length === 1 ? "" : "s"}. ${l.cveCount ? `${l.cveCount} known CVE${l.cveCount === 1 ? "" : "s"}, max CVSS ${l.maxCvss}.` : ""} Violations: ${viol || "none"}.`,
    rootCause:
      l.eolStatus === "End-of-Life"
        ? `Version ${l.version} is past vendor end-of-life and no longer receives security fixes.`
        : topCve
          ? `Version ${l.version} carries ${topCve.id} (CVSS ${topCve.cvss}): ${topCve.title}.`
          : `Version ${l.version} is behind current stable (${l.latestSafe}).`,
    remediationSteps: [
      `Upgrade ${l.name} to ${l.latestSafe} on all ${l.assetsAffected.length} affected host${l.assetsAffected.length === 1 ? "" : "s"}`,
      ...(topCve ? [`Confirm the upgrade resolves ${topCve.id} (CVSS ${topCve.cvss})`] : []),
      `Rebuild and redeploy dependent services; verify reachability`,
      `Re-run CBOM ingestion to confirm the old version is retired`,
    ],
    affectedSystems: l.assetsAffected.join(", "),
    complianceImpact: `NIST SP 800-131A Rev2${l.cveCount ? "; SP 800-40 Rev4 (CVE remediation)" : ""}`,
    sla: slaFor(priority),
  };
}

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-semibold text-coral bg-coral/15 rounded-full w-4 h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
  );
}
function MetaRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-[11px]">
      <span className="text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <span className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function Gauge({ score, factors, violationCount }: { score: number; factors: Factor[]; violationCount: number }) {
  const [open, setOpen] = useState(false);
  const totalW = factors.reduce((s, f) => s + f.weight, 0);
  const col = score >= 60 ? "text-coral" : score >= 30 ? "text-amber" : "text-teal";
  const stroke = score >= 60 ? "hsl(var(--coral))" : score >= 30 ? "hsl(var(--amber))" : "hsl(var(--teal))";
  const band = score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";
  return (
    <div className="mt-3 bg-card rounded-lg border border-border/50 p-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0" style={{ width: 92, height: 56 }}>
          <svg viewBox="0 0 100 60" className="w-[92px] h-[56px]">
            <path
              d="M 8 54 A 42 42 0 0 1 92 54"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 8 54 A 42 42 0 0 1 92 54"
              fill="none"
              stroke={stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 132} 132`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
            <span className={`text-[22px] font-bold tabular-nums leading-none ${col}`}>{score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[12px] font-semibold ${col}`}>{band} risk</span>
            <span className="text-[10px] text-muted-foreground">CRS</span>
            <button
              onClick={() => setOpen((v) => !v)}
              className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 hover:text-teal transition-colors"
            >
              <Info className="w-3 h-3" /> Explain{" "}
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-[10px] leading-snug mt-0.5">
            {violationCount > 0 ? (
              <span className="text-coral font-medium">
                {violationCount} active violation{violationCount !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-teal">No policy violations</span>
            )}
          </p>
        </div>
      </div>
      {open && (
        <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2">
          {factors.map((f) => {
            const contrib = Math.round(f.raw * (f.weight / totalW));
            const pct = Math.min(100, f.raw);
            return (
              <div key={f.id} className="flex items-center gap-2" title={f.why}>
                <span className="text-[9.5px] text-muted-foreground w-[88px] flex-shrink-0 truncate">{f.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        f.raw >= 70 ? "hsl(var(--coral))" : f.raw >= 40 ? "hsl(var(--amber))" : "hsl(var(--teal))",
                    }}
                  />
                </div>
                <span className="text-[9px] tabular-nums text-muted-foreground/70 w-[64px] text-right flex-shrink-0">
                  +{contrib} ({Math.round((f.weight / totalW) * 100)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ViolationsSection({
  objectId,
  objectName,
  objectType,
  parentAsset,
  violations,
}: {
  objectId: string;
  objectName: string;
  objectType: string;
  parentAsset?: string;
  violations: { id: string; severity: StackSeverity }[];
}) {
  const { isExcepted } = useExceptions();
  const [ctx, setCtx] = useState<{ policyId: string; policyName: string } | null>(null);
  if (violations.length === 0) return null;
  return (
    <div className="px-4 py-3">
      <SectionHeading label="Violations & alerts" count={violations.length} />
      <div className="space-y-1.5">
        {violations.map((v, i) => {
          const name = POLICY_NAME[v.id] || v.id;
          const excepted = isExcepted(objectId, v.id);
          return (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${SEV_DOT[v.severity]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-foreground">{name}</div>
                <span className="text-[9.5px] font-mono text-muted-foreground/70">{v.id}</span>
              </div>
              {excepted ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber/10 text-amber font-medium whitespace-nowrap">
                  Excepted
                </span>
              ) : (
                <button
                  onClick={() => setCtx({ policyId: v.id, policyName: name })}
                  className="text-[10px] px-2 py-0.5 rounded border border-amber/30 text-amber hover:bg-amber/10 whitespace-nowrap"
                >
                  Add exception
                </button>
              )}
            </div>
          );
        })}
      </div>
      {ctx && (
        <RaiseExceptionModal
          open={!!ctx}
          onClose={() => setCtx(null)}
          objectId={objectId}
          objectName={objectName}
          objectType={objectType}
          parentAsset={parentAsset}
          policyId={ctx.policyId}
          policyName={ctx.policyName}
        />
      )}
    </div>
  );
}

function LinkedInfra({ assets, note, onNavigate }: { assets: ITAsset[]; note?: string; onNavigate: () => void }) {
  const { setFilters, setCurrentPage } = useNav();
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <SectionHeading label={`Linked infrastructure (${assets.length})`} />
        {assets.length > 0 && <span className="text-[10px] text-amber ml-auto">failure affects all</span>}
      </div>
      {assets.length > 0 ? (
        <div className="space-y-0.5">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setFilters({ tab: "infrastructure", assetName: a.name });
                setCurrentPage("inventory" as never);
                onNavigate();
              }}
              className="w-full flex items-center gap-2 text-[11px] rounded px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left group"
            >
              <span className="text-foreground font-medium flex-1 truncate group-hover:text-teal">{a.name}</span>
              <span className="text-muted-foreground flex-shrink-0 text-[10px]">{a.type}</span>
              <EnvBadge env={a.environment} />
              <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-teal flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border/40 px-3 py-3 text-[11px] text-amber">
          {note || "Not bound to any tracked infrastructure asset."}
        </div>
      )}
    </div>
  );
}

function PanelShell({
  title,
  subtitle,
  pills,
  crs,
  factors,
  violationCount,
  onClose,
  onTicket,
  ticketLabel,
  children,
}: {
  title: string;
  subtitle: string;
  pills: React.ReactNode;
  crs: number;
  factors: Factor[];
  violationCount: number;
  onClose: () => void;
  onTicket: () => void;
  ticketLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[38%] min-w-[420px] bg-card border-l border-border shadow-2xl h-full flex flex-col animate-slide-in-right">
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-secondary/30">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-semibold text-foreground truncate font-mono">{title}</p>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded flex-shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2.5">{subtitle}</p>
          <div className="flex items-center gap-1.5">{pills}</div>
          <Gauge score={crs} factors={factors} violationCount={violationCount} />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/40">
          <div className="px-4 py-3">
            <SectionHeading label="Actions" />
            <button
              onClick={onTicket}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-semibold border border-purple/30 text-purple-light hover:bg-purple/10 transition-colors"
            >
              <Ticket className="w-3 h-3" /> {ticketLabel}
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ProtocolPanel({
  p,
  onClose,
  onRaise,
}: {
  p: ProtocolAsset;
  onClose: () => void;
  onRaise: (d: TicketDraft) => void;
}) {
  const asset = assetByFqdn(p.fqdn);
  const factors = protocolFactors(p);
  const violations = p.policyViolations.map((id) => ({ id, severity: p.severity }));
  const suites = [...p.cipherSuites].sort(
    (a, b) => ({ Insecure: 0, Weak: 1, Strong: 2 })[a.strength] - { Insecure: 0, Weak: 1, Strong: 2 }[b.strength],
  );
  const isSSH = p.protocol === "SSH";
  return (
    <PanelShell
      title={`${p.fqdn}:${p.port}`}
      subtitle={`${p.protocol} ${p.version} · ${p.environment} · ${p.exposure}`}
      pills={
        <>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${crsChip(p.crs)}`}>{p.version}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[p.severity]}`} />
            <span className={`text-[10px] font-semibold uppercase ${SEV_TEXT[p.severity]}`}>{p.severity}</span>
          </span>
        </>
      }
      crs={p.crs}
      factors={factors}
      violationCount={p.policyViolations.length}
      onClose={onClose}
      onTicket={() => onRaise(protocolDraft(p))}
      ticketLabel="Raise remediation ticket"
    >
      <div className="px-4 py-3">
        <SectionHeading label={isSSH ? "Negotiated algorithms" : "Negotiated cipher suites"} />
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-1.5 bg-secondary/40 text-[9px] uppercase tracking-wide text-muted-foreground">
            <span>{isSSH ? "Cipher · KEX · MAC" : "Suite · KEX · Auth · Enc · MAC"}</span>
            <span>Strength</span>
          </div>
          {suites.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-2 border-t border-border/50">
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-foreground truncate">{c.name}</div>
                <div className="text-[9.5px] text-muted-foreground">
                  {isSSH ? `${c.enc} · ${c.kex} · ${c.mac}` : `${c.kex} · ${c.auth} · ${c.enc} · ${c.mac} · ${c.id}`}
                </div>
              </div>
              <span className={`text-[10px] font-semibold ${suiteColor[c.strength]}`}>{c.strength}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground mt-2">
          Key exchange: <span className="text-foreground">{p.kexStrength}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <MetaRow label="Deployed endpoint" value={`${p.fqdn}:${p.port}`} mono />
        <MetaRow label="Discovery source" value={p.discoverySource} />
        <MetaRow label="Last seen" value={p.lastSeen} />
      </div>
      <div className="px-4 py-2 flex items-center gap-2 text-[10.5px]">
        <span className="text-muted-foreground">Owner</span>
        <span className={p.owner === "Unassigned" ? "text-coral" : "text-foreground"}>{p.owner}</span>
        <span className="text-muted-foreground">· {p.team}</span>
      </div>

      <ViolationsSection
        objectId={p.id}
        objectName={`${p.fqdn}:${p.port}`}
        objectType={`${p.protocol} ${p.version}`}
        parentAsset={p.fqdn}
        violations={violations}
      />
      <LinkedInfra
        assets={p.bound && asset ? [asset] : []}
        note={
          !p.bound
            ? "Unbound: host not in IT asset inventory (shadow host). Add it in the Infrastructure tab to track blast radius."
            : undefined
        }
        onNavigate={onClose}
      />
    </PanelShell>
  );
}

function LibraryPanel({
  l,
  onClose,
  onRaise,
}: {
  l: LibraryAsset;
  onClose: () => void;
  onRaise: (d: TicketDraft) => void;
}) {
  const assets = l.assetsAffected.map(assetByFqdn).filter((a): a is ITAsset => !!a);
  const factors = libraryFactors(l);
  const violations = l.policyViolations.map((id) => ({ id, severity: l.severity }));
  return (
    <PanelShell
      title={`${l.name} ${l.version}`}
      subtitle={`${l.provider} · ${l.inUse ? "In use" : "Dormant"} · ${l.assetsAffected.length} assets`}
      pills={
        <>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${l.eolStatus === "End-of-Life" ? "text-coral bg-coral/12" : l.eolStatus === "Outdated" ? "text-amber bg-amber/12" : "text-teal bg-teal/12"}`}
          >
            {l.eolStatus}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[l.severity]}`} />
            <span className={`text-[10px] font-semibold uppercase ${SEV_TEXT[l.severity]}`}>{l.severity}</span>
          </span>
        </>
      }
      crs={l.crs}
      factors={factors}
      violationCount={l.policyViolations.length}
      onClose={onClose}
      onTicket={() => onRaise(libraryDraft(l))}
      ticketLabel="Raise upgrade ticket"
    >
      <div className="px-4 py-3">
        <SectionHeading label="Lifecycle" />
        <MetaRow
          label="Status"
          value={
            <span
              className={
                l.eolStatus === "End-of-Life" ? "text-coral" : l.eolStatus === "Outdated" ? "text-amber" : "text-teal"
              }
            >
              {l.eolStatus}
              {l.eolDate !== "Active" ? ` since ${l.eolDate}` : ""}
            </span>
          }
        />
        <MetaRow label="Recommended version" value={l.latestSafe} />
        <MetaRow label="Discovery source" value={l.discoverySource} />
      </div>

      {l.cves.length > 0 && (
        <div className="px-4 py-3">
          <SectionHeading label={`Known vulnerabilities (${l.cveCount})`} />
          <div className="space-y-1.5">
            {l.cves.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${c.cvss >= 7 ? "text-coral bg-coral/10" : "text-amber bg-amber/10"}`}
                >
                  {c.cvss.toFixed(1)}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-foreground">{c.id}</div>
                  <div className="text-[10px] text-muted-foreground">{c.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <SectionHeading label="Implements" />
        <div className="flex flex-wrap gap-1">
          {l.implementsList.map((i) => (
            <span key={i} className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
              {i}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 flex items-center gap-2 text-[10.5px]">
        <span className="text-muted-foreground">Owner</span>
        <span className={l.owner === "Unassigned" ? "text-coral" : "text-foreground"}>{l.owner}</span>
        <span className="text-muted-foreground">· {l.team}</span>
      </div>

      <ViolationsSection
        objectId={l.id}
        objectName={`${l.name} ${l.version}`}
        objectType="Cryptographic Library"
        parentAsset={l.assetsAffected[0]}
        violations={violations}
      />
      <LinkedInfra assets={assets} onNavigate={onClose} />
    </PanelShell>
  );
}

// ---- tab ---------------------------------------------------------------------
export default function CryptoAssetsTab({ onCreateTicket }: { onCreateTicket: (ctx: unknown) => void }) {
  void onCreateTicket; // crypto-stack tickets use the AI draft modal, matching crypto objects
  const [view, setView] = useState<"protocols" | "libraries">("protocols");
  const [openProto, setOpenProto] = useState<string | null>(null);
  const [openLib, setOpenLib] = useState<string | null>(null);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);

  const protocols = useMemo(() => [...mockProtocols].sort((a, b) => b.crs - a.crs), []);
  const libraries = useMemo(() => [...mockLibraries].sort((a, b) => b.crs - a.crs), []);
  const drawerProto = openProto ? protocols.find((p) => p.id === openProto) : null;
  const drawerLib = openLib ? libraries.find((l) => l.id === openLib) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => {
              setView("protocols");
              setOpenLib(null);
            }}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 transition-colors ${view === "protocols" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Network className="w-3.5 h-3.5" /> Protocols <span className="opacity-70">{protocols.length}</span>
          </button>
          <button
            onClick={() => {
              setView("libraries");
              setOpenProto(null);
            }}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 transition-colors ${view === "libraries" ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Package className="w-3.5 h-3.5" /> Libraries <span className="opacity-70">{libraries.length}</span>
          </button>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Discovered via Tenable, Qualys, and CBOM ingestion
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {view === "protocols" ? (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-card z-[1]">
              <tr className="text-[9.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 px-3 font-medium">Protocol / Version</th>
                <th className="py-2 px-3 font-medium">Endpoint</th>
                <th className="py-2 px-3 font-medium">Weakest cipher</th>
                <th className="py-2 px-3 font-medium">Key exchange</th>
                <th className="py-2 px-3 font-medium">Exposure</th>
                <th className="py-2 px-3 font-medium text-center">CRS</th>
                <th className="py-2 px-3 font-medium">Severity</th>
                <th className="py-2 px-3 font-medium">Violations</th>
                <th className="py-2 px-3 font-medium">Source</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => {
                const weakest = [...p.cipherSuites].sort(
                  (a, b) =>
                    ({ Insecure: 0, Weak: 1, Strong: 2 })[a.strength] - { Insecure: 0, Weak: 1, Strong: 2 }[b.strength],
                )[0];
                return (
                  <tr
                    key={p.id}
                    onClick={() => setOpenProto(p.id)}
                    className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <span className="text-[12px] text-foreground font-medium">
                        {p.protocol} {p.version.replace(p.protocol, "").trim() || p.version}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {p.fqdn}:{p.port}
                      </span>
                      {!p.bound && <span className="ml-1.5 text-[9px] text-amber">unbound</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] ${suiteColor[weakest.strength]}`}>{weakest.enc}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-muted-foreground">{p.kexStrength}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] ${p.exposure === "Internet-facing" ? "text-coral" : "text-muted-foreground"}`}
                      >
                        {p.exposure}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${crsChip(p.crs)}`}
                      >
                        {p.crs}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[p.severity]}`} />
                        <span className={`text-[10px] font-semibold uppercase ${SEV_TEXT[p.severity]}`}>
                          {p.severity}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-muted-foreground">{p.policyViolations.length || "0"}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] text-muted-foreground">{p.discoverySource}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-card z-[1]">
              <tr className="text-[9.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 px-3 font-medium">Library / Version</th>
                <th className="py-2 px-3 font-medium">Provider</th>
                <th className="py-2 px-3 font-medium">EOL</th>
                <th className="py-2 px-3 font-medium text-center">CVEs</th>
                <th className="py-2 px-3 font-medium text-center">Assets</th>
                <th className="py-2 px-3 font-medium">In use</th>
                <th className="py-2 px-3 font-medium text-center">CRS</th>
                <th className="py-2 px-3 font-medium">Severity</th>
                <th className="py-2 px-3 font-medium">Source</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {libraries.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpenLib(l.id)}
                  className="border-b border-border/40 hover:bg-secondary/30 cursor-pointer"
                >
                  <td className="py-2.5 px-3">
                    <span className="text-[12px] text-foreground font-medium font-mono">
                      {l.name} {l.version}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] text-muted-foreground">{l.provider}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[11px] ${l.eolStatus === "End-of-Life" ? "text-coral" : l.eolStatus === "Outdated" ? "text-amber" : "text-teal"}`}
                    >
                      {l.eolStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`text-[11px] ${l.maxCvss >= 7 ? "text-coral" : l.cveCount ? "text-amber" : "text-muted-foreground"}`}
                    >
                      {l.cveCount ? `${l.cveCount} · ${l.maxCvss.toFixed(1)}` : "0"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground">
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      {l.assetsAffected.length}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[11px] ${l.inUse ? "text-coral" : "text-muted-foreground"}`}>
                      {l.inUse ? "In use" : "Dormant"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${crsChip(l.crs)}`}>
                      {l.crs}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[l.severity]}`} />
                      <span className={`text-[10px] font-semibold uppercase ${SEV_TEXT[l.severity]}`}>
                        {l.severity}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] text-muted-foreground">{l.discoverySource}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drawerProto && <ProtocolPanel p={drawerProto} onClose={() => setOpenProto(null)} onRaise={setTicketDraft} />}
      {drawerLib && <LibraryPanel l={drawerLib} onClose={() => setOpenLib(null)} onRaise={setTicketDraft} />}

      {ticketDraft && (
        <TicketDraftModal
          asset={null}
          action="fix"
          initialDraft={ticketDraft}
          onClose={() => setTicketDraft(null)}
          onConfirm={() => setTicketDraft(null)}
        />
      )}
    </div>
  );
}
