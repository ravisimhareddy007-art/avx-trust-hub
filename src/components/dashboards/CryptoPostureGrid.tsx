import React from "react";
import { useNav } from "@/context/NavigationContext";
import { FileBadge, Key, FileKey, Lock, Network, Package } from "lucide-react";
import { mockAssets } from "@/data/mockData";
import { mockProtocols, mockLibraries } from "@/data/cryptoStackMockData";
import PostureTile, { PostureRow, DonutSlice } from "./PostureTile";

const A = mockAssets as any[];
const ageDays = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

const CORAL = "hsl(var(--coral))",
  AMBER = "hsl(var(--amber))",
  TEAL = "hsl(var(--teal))",
  MUTED = "hsl(var(--muted-foreground))";

// Placeholder posture-history trend. Deterministic per tile so it is stable across
// renders. Replace with real daily snapshots once posture history is captured; the
// tile API (delta + spark) does not change when that lands.
function trendFor(seed: string, current: number, deltaHint: number): { delta: number; spark: number[] } {
  const prev = current - deltaHint;
  const pts: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const wob = ((seed.charCodeAt(i % seed.length) % 5) - 2) * 0.2;
    pts.push(Math.max(0, prev + (current - prev) * t + wob));
  }
  return { delta: deltaHint, spark: pts };
}

export default function CryptoPostureGrid() {
  const { setCurrentPage, setFilters } = useNav();
  const go = (f: Record<string, string>) => {
    setFilters(f);
    setCurrentPage("inventory");
  };

  const certs = A.filter((a) => a.type === "TLS Certificate" || a.type === "Certificate");
  const ssh = A.filter((a) => a.type === "SSH Key");
  const enc = A.filter((a) => a.type === "Encryption Key" || a.type === "Encryption Keys");
  const secrets = A.filter((a) => a.type === "API Key / Secret");

  // Certificates: expiry horizon
  const cExpired = certs.filter(
    (a) => a.status === "Expired" || (typeof a.daysToExpiry === "number" && a.daysToExpiry < 0),
  ).length;
  const c7 = certs.filter((a) => a.daysToExpiry >= 0 && a.daysToExpiry <= 7).length;
  const c30 = certs.filter((a) => a.daysToExpiry > 7 && a.daysToExpiry <= 30).length;
  const c90 = certs.filter((a) => a.daysToExpiry > 30 && a.daysToExpiry <= 90).length;

  // SSH keys: age report (age since last rotation)
  const sAges = ssh.map((a) => ageDays(a.lastRotated)).filter((d): d is number => d !== null);
  const sUnder1 = sAges.filter((d) => d < 365).length;
  const s12 = sAges.filter((d) => d >= 365 && d < 730).length;
  const s25 = sAges.filter((d) => d >= 730 && d < 1825).length;
  const s5 = sAges.filter((d) => d >= 1825).length;
  const sAged = s12 + s25 + s5;

  // Encryption keys: governance gaps (monitor only)
  const rotOverdue = (a: any) => {
    const f = String(a.rotationFrequency || "");
    const y = f.match(/(\d+)\s*year/);
    if (y) return +y[1] >= 2;
    const d = f.match(/(\d+)\s*day/);
    if (d) return +d[1] > 365;
    return !a.rotationFrequency;
  };
  const quantum = (a: any) =>
    a.pqcRisk === "High" || a.pqcRisk === "Critical" || /^(RSA|EC|ECDSA|ECDH|DSA|DH)\b/i.test(a.algorithm || "");
  const notHsm = (a: any) => a.environment === "Production" && !/HSM/i.test(a.protectionLevel || "");
  const unowned = (a: any) => !a.owner || a.owner === "Unassigned";
  const eRot = enc.filter(rotOverdue).length;
  const eQ = enc.filter(quantum).length;
  const eSw = enc.filter(notHsm).length;
  const eOwn = enc.filter(unowned).length;
  const eOOP = enc.filter((a) => rotOverdue(a) || quantum(a) || notHsm(a) || unowned(a)).length;

  // Secrets: staleness and ownership
  const secUnrot = secrets.filter((a) => {
    const d = ageDays(a.lastRotated);
    return d !== null && d > 90;
  }).length;
  const secOrphan = secrets.filter(unowned).length;
  const secStale = secrets.filter((a) => !a.rotationFrequency).length;
  const secAct = secrets.filter((a) => {
    const d = ageDays(a.lastRotated);
    return (d !== null && d > 90) || !a.owner || a.owner === "Unassigned";
  }).length;

  // Protocols donut by version
  const byVer = (fam: string, ver?: string) =>
    mockProtocols.filter((p) => p.family === fam && (ver ? p.version.startsWith(ver) : true)).length;
  const ssl = mockProtocols.filter((p) => p.family === "SSL").length;
  const t10 = byVer("TLS", "1.0"),
    t11 = byVer("TLS", "1.1"),
    t12 = byVer("TLS", "1.2"),
    t13 = byVer("TLS", "1.3");
  const sshP = mockProtocols.filter((p) => p.family === "SSH").length;
  const pLegacy = ssl + t10 + t11;

  // Libraries donut by lifecycle
  const lEol = mockLibraries.filter((l) => l.eolStatus === "End-of-Life").length;
  const lOut = mockLibraries.filter((l) => l.eolStatus === "Outdated").length;
  const lSup = mockLibraries.filter((l) => l.eolStatus === "Supported").length;

  const certRows: PostureRow[] = [
    {
      label: "Expiring in 7 days",
      count: c7 + cExpired,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "TLS Certificate", filterId: "cert_expiring_7d" }),
    },
    {
      label: "Expiring in 30 days",
      count: c30,
      role: "high",
      onClick: () => go({ tab: "identities", type: "TLS Certificate", filterId: "cert_expiring_30d" }),
    },
    {
      label: "Expiring in 90 days",
      count: c90,
      role: "medium",
      onClick: () => go({ tab: "identities", type: "TLS Certificate" }),
    },
  ];
  const sshRows: PostureRow[] = [
    {
      label: "Under 1 year",
      count: sUnder1,
      role: "neutral",
      onClick: () => go({ tab: "identities", type: "SSH Key" }),
    },
    { label: "1 to 2 years", count: s12, role: "high", onClick: () => go({ tab: "identities", type: "SSH Key" }) },
    { label: "2 to 5 years", count: s25, role: "critical", onClick: () => go({ tab: "identities", type: "SSH Key" }) },
    { label: "5+ years", count: s5, role: "critical", onClick: () => go({ tab: "identities", type: "SSH Key" }) },
  ];
  const encRows: PostureRow[] = [
    {
      label: "Rotation disabled / overdue",
      count: eRot,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "Encryption Key" }),
    },
    {
      label: "Quantum-vulnerable (RSA / ECC)",
      count: eQ,
      role: "high",
      onClick: () => go({ tab: "identities", type: "Encryption Key" }),
    },
    {
      label: "Software-protected (not HSM)",
      count: eSw,
      role: "medium",
      onClick: () => go({ tab: "identities", type: "Encryption Key" }),
    },
    {
      label: "Unowned / untagged",
      count: eOwn,
      role: "medium",
      onClick: () => go({ tab: "identities", type: "Encryption Key" }),
    },
  ];
  const secretRows: PostureRow[] = [
    {
      label: "Unrotated over 90 days",
      count: secUnrot,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "API Key / Secret" }),
    },
    {
      label: "Orphaned / no owner",
      count: secOrphan,
      role: "high",
      onClick: () => go({ tab: "identities", type: "API Key / Secret" }),
    },
    {
      label: "No rotation policy",
      count: secStale,
      role: "medium",
      onClick: () => go({ tab: "identities", type: "API Key / Secret" }),
    },
  ];
  const protoSlices: DonutSlice[] = [
    {
      label: "SSL 3.0",
      count: ssl,
      stroke: CORAL,
      text: "text-coral",
      onClick: () => go({ tab: "crypto-assets", view: "protocols", q: "SSL" }),
    },
    {
      label: "TLS 1.0",
      count: t10,
      stroke: "#d85a30",
      text: "text-coral",
      onClick: () => go({ tab: "crypto-assets", view: "protocols", q: "TLS 1.0" }),
    },
    {
      label: "TLS 1.1",
      count: t11,
      stroke: AMBER,
      text: "text-amber",
      onClick: () => go({ tab: "crypto-assets", view: "protocols", q: "TLS 1.1" }),
    },
    {
      label: "TLS 1.2",
      count: t12,
      stroke: MUTED,
      text: "text-muted-foreground",
      onClick: () => go({ tab: "crypto-assets", view: "protocols", q: "TLS 1.2" }),
    },
    {
      label: "TLS 1.3 / SSH",
      count: t13 + sshP,
      stroke: TEAL,
      text: "text-teal",
      onClick: () => go({ tab: "crypto-assets", view: "protocols", q: "TLS 1.3" }),
    },
  ];
  const libSlices: DonutSlice[] = [
    {
      label: "End-of-life",
      count: lEol,
      stroke: CORAL,
      text: "text-coral",
      onClick: () => go({ tab: "crypto-assets", view: "libraries", eol: "End-of-Life" }),
    },
    {
      label: "Outdated",
      count: lOut,
      stroke: AMBER,
      text: "text-amber",
      onClick: () => go({ tab: "crypto-assets", view: "libraries", eol: "Outdated" }),
    },
    {
      label: "Supported",
      count: lSup,
      stroke: TEAL,
      text: "text-teal",
      onClick: () => go({ tab: "crypto-assets", view: "libraries" }),
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cryptographic posture</h2>
          <p className="text-[10px] text-muted-foreground">
            Every number is a count. Click to drill into inventory with filters pre-applied.
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">6 categories</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <PostureTile
          icon={FileBadge}
          label="Certificates"
          total={certs.length}
          hero={{ value: c7 + cExpired, caption: "expiring \u2264 7d", role: "critical" }}
          distribution={{ type: "rows", rows: certRows }}
          trend={trendFor("cert", c7 + cExpired, 4)}
          target="target 0"
          emphasis
          onOpen={() => go({ tab: "identities", type: "TLS Certificate" })}
        />

        <PostureTile
          icon={FileKey}
          label="SSH keys"
          total={ssh.length}
          hero={{ value: sAged, caption: "aged over 1 year", role: "high" }}
          distribution={{ type: "rows", rows: sshRows }}
          trend={trendFor("ssh", sAged, 2)}
          target="target under 5"
          footerNote="Key age report"
          onOpen={() => go({ tab: "identities", type: "SSH Key" })}
        />

        <PostureTile
          icon={Key}
          label="Encryption keys"
          total={enc.length}
          caption="AWS \u00b7 Azure \u00b7 GCP \u00b7 central visibility"
          hero={{ value: eOOP, caption: "out of policy", role: "high" }}
          distribution={{ type: "rows", rows: encRows }}
          trend={trendFor("enc", eOOP, -6)}
          target="target under 10"
          footerNote="Monitor only \u00b7 ticket to act"
          onOpen={() => go({ tab: "identities", type: "Encryption Key" })}
        />

        <PostureTile
          icon={Lock}
          label="Secrets"
          total={secrets.length}
          hero={{ value: secAct, caption: "need action", role: "critical" }}
          distribution={{ type: "rows", rows: secretRows }}
          trend={trendFor("sec", secAct, 3)}
          target="target under 20"
          onOpen={() => go({ tab: "identities", type: "API Key / Secret" })}
        />

        <PostureTile
          icon={Network}
          label="Protocols"
          total={mockProtocols.length}
          hero={{ value: pLegacy, caption: "legacy versions", role: "critical" }}
          distribution={{ type: "donut", centerValue: String(pLegacy), centerLabel: "legacy", slices: protoSlices }}
          onOpen={() => go({ tab: "crypto-assets", view: "protocols" })}
        />

        <PostureTile
          icon={Package}
          label="Libraries"
          total={mockLibraries.length}
          hero={{ value: lEol, caption: "end-of-life", role: "critical" }}
          distribution={{ type: "donut", centerValue: String(lEol), centerLabel: "EOL", slices: libSlices }}
          onOpen={() => go({ tab: "crypto-assets", view: "libraries" })}
        />
      </div>
    </div>
  );
}
