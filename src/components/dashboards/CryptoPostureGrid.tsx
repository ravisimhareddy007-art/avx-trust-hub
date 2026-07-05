import React from "react";
import { useNav } from "@/context/NavigationContext";
import { FileBadge, FileKey, Key, Server, Lock, Network, Package } from "lucide-react";
import { mockProtocols, mockLibraries } from "@/data/cryptoStackMockData";
import PostureTile, { PostureRow, DonutSlice, Bar } from "./PostureTile";

const CORAL = "hsl(var(--coral))",
  AMBER = "hsl(var(--amber))",
  TEAL = "hsl(var(--teal))",
  MUTED = "hsl(var(--muted-foreground))";
const REDDARK = "#b23524";

// Enterprise posture summary (presentation-layer, estate scale). The inventory
// holds the representative sample; the dashboard reports estate totals, the same
// pattern as ESTATE_SUMMARY. Replace with live aggregates when the backend lands.
const POSTURE = {
  certs: {
    total: 42860,
    expired: 486,
    day7: [412, 288, 355, 221, 470, 312, 393], // per day, next 7 days
    win30: [1880, 1420, 1650, 1210, 980, 840], // 5-day intervals to 30 days
    win90: [5120, 3880, 3050, 2610, 1980, 1760], // 15-day intervals to 90 days
  },
  ssh: {
    total: 9120,
    age: [1240, 1980, 2360, 3540], // 0-30, 30-60, 60-90, 90+
    risks: { suspicious: 1204, misplaced: 642, shared: 588, rogue: 496, weak: 312 },
  },
  cloud: { total: 2847, oop: 1148, rotation: 642, access: 118, quantum: 388 },
  hsm: { total: 1240, quantum: 96, extractable: 27, nonsensitive: 14, quantumSafe: 214 },
  secrets: { total: 6240, act: 3980, unrotated: 3210, orphaned: 512, noPolicy: 258 },
};

export default function CryptoPostureGrid() {
  const { setCurrentPage, setFilters } = useNav();
  const go = (f: Record<string, string>) => {
    setFilters(f);
    setCurrentPage("inventory");
  };

  const c = POSTURE.certs;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  const dateLabel = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getDate()} ${MON[d.getMonth()]}`;
  };
  const day7Bars: Bar[] = c.day7.map((n, i) => ({
    label: dateLabel(i + 1),
    count: n,
    color: CORAL,
    onClick: () => go({ tab: "identities", type: "TLS Certificate", filterId: "cert_expiring_7d" }),
  }));
  const win30Bars: Bar[] = c.win30.map((n, i) => ({
    label: dateLabel(i * 5),
    count: n,
    color: AMBER,
    onClick: () => go({ tab: "identities", type: "TLS Certificate", filterId: "cert_expiring_30d" }),
  }));
  const win90Bars: Bar[] = c.win90.map((n, i) => ({
    label: dateLabel(i * 15),
    count: n,
    color: MUTED,
    onClick: () => go({ tab: "identities", type: "TLS Certificate" }),
  }));

  const sshAgeBars: Bar[] = [
    {
      label: "0-30",
      count: POSTURE.ssh.age[0],
      color: TEAL,
      onClick: () => go({ tab: "identities", type: "SSH Key" }),
    },
    {
      label: "30-60",
      count: POSTURE.ssh.age[1],
      color: MUTED,
      onClick: () => go({ tab: "identities", type: "SSH Key" }),
    },
    {
      label: "60-90",
      count: POSTURE.ssh.age[2],
      color: AMBER,
      onClick: () => go({ tab: "identities", type: "SSH Key" }),
    },
    {
      label: "90+",
      count: POSTURE.ssh.age[3],
      color: REDDARK,
      onClick: () => go({ tab: "identities", type: "SSH Key" }),
    },
  ];
  const r = POSTURE.ssh.risks;
  const sshRiskRows: PostureRow[] = [
    {
      label: "Suspicious keys",
      count: r.suspicious,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "SSH Key", filterId: "ssh_suspicious" }),
    },
    {
      label: "Misplaced keys",
      count: r.misplaced,
      role: "high",
      onClick: () => go({ tab: "identities", type: "SSH Key", filterId: "ssh_misplaced" }),
    },
    {
      label: "Shared keys",
      count: r.shared,
      role: "high",
      onClick: () => go({ tab: "identities", type: "SSH Key", filterId: "ssh_shared_user" }),
    },
    {
      label: "Rogue keys",
      count: r.rogue,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "SSH Key", filterId: "ssh_rogue" }),
    },
    {
      label: "Weak keys",
      count: r.weak,
      role: "medium",
      onClick: () => go({ tab: "identities", type: "SSH Key", filterId: "ssh_weak_user" }),
    },
  ];

  const cloud = POSTURE.cloud;
  const cloudRows: PostureRow[] = [
    {
      label: "Rotation disabled / overdue",
      count: cloud.rotation,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key", filterId: "cloud_rotation_disabled" }),
    },
    {
      label: "Publicly accessible / permissive",
      count: cloud.access,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key", filterId: "cloud_public_access" }),
    },
    {
      label: "Quantum-vulnerable (RSA / ECC)",
      count: cloud.quantum,
      role: "high",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key", filterId: "cloud_quantum" }),
    },
  ];
  const hsm = POSTURE.hsm;
  const hsmRows: PostureRow[] = [
    {
      label: "Quantum-vulnerable (RSA / ECC)",
      count: hsm.quantum,
      role: "high",
      onClick: () => go({ tab: "identities", type: "HSM Key", filterId: "hsm_quantum" }),
    },
    {
      label: "Extractable keys",
      count: hsm.extractable,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "HSM Key", filterId: "hsm_extractable" }),
    },
    {
      label: "Non-sensitive keys",
      count: hsm.nonsensitive,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "HSM Key", filterId: "hsm_nonsensitive" }),
    },
  ];
  const s = POSTURE.secrets;
  const secretRows: PostureRow[] = [
    {
      label: "Unrotated over 90 days",
      count: s.unrotated,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "API Key / Secret" }),
    },
    {
      label: "Orphaned / no owner",
      count: s.orphaned,
      role: "high",
      onClick: () => go({ tab: "identities", type: "API Key / Secret" }),
    },
    {
      label: "No rotation policy",
      count: s.noPolicy,
      role: "medium",
      onClick: () => go({ tab: "identities", type: "API Key / Secret" }),
    },
  ];

  // Protocols + libraries: unchanged, computed live from the crypto-stack data.
  const ssl = mockProtocols.filter((p) => p.family === "SSL").length;
  const t10 = mockProtocols.filter((p) => p.family === "TLS" && p.version.startsWith("1.0")).length;
  const t11 = mockProtocols.filter((p) => p.family === "TLS" && p.version.startsWith("1.1")).length;
  const t12 = mockProtocols.filter((p) => p.family === "TLS" && p.version.startsWith("1.2")).length;
  const t13 = mockProtocols.filter((p) => p.family === "TLS" && p.version.startsWith("1.3")).length;
  const sshP = mockProtocols.filter((p) => p.family === "SSH").length;
  const pLegacy = ssl + t10 + t11;
  const lEol = mockLibraries.filter((l) => l.eolStatus === "End-of-Life").length;
  const lOut = mockLibraries.filter((l) => l.eolStatus === "Outdated").length;
  const lSup = mockLibraries.filter((l) => l.eolStatus === "Supported").length;

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
          total={c.total}
          hero={{ value: c.expired, caption: "expired", role: "critical" }}
          views={[
            {
              label: "7 days",
              distribution: { type: "bars", bars: day7Bars, xLabel: "Expiry date", yLabel: "Certificates" },
            },
            {
              label: "30 days",
              distribution: { type: "bars", bars: win30Bars, xLabel: "Expiry date", yLabel: "Certificates" },
            },
            {
              label: "90 days",
              distribution: { type: "bars", bars: win90Bars, xLabel: "Expiry date", yLabel: "Certificates" },
            },
          ]}
          onOpen={() => go({ tab: "identities", type: "TLS Certificate" })}
        />

        <PostureTile
          icon={FileKey}
          label="SSH keys"
          total={POSTURE.ssh.total}
          hero={{ value: POSTURE.ssh.age[3], caption: "not rotated 90d+", role: "high" }}
          views={[
            {
              label: "Key age",
              hero: { value: POSTURE.ssh.age[3], caption: "not rotated 90d+", role: "high" },
              distribution: { type: "bars", bars: sshAgeBars, xLabel: "Key age (days)", yLabel: "SSH keys" },
            },
            {
              label: "Risks",
              hero: { value: r.suspicious, caption: "suspicious keys", role: "critical" },
              distribution: { type: "rows", rows: sshRiskRows },
            },
          ]}
          footerNote="Key age report"
          onOpen={() => go({ tab: "identities", type: "SSH Key" })}
        />

        <PostureTile
          icon={Key}
          label="Cloud KMS Keys"
          total={cloud.total}
          caption={"AWS \u00b7 Azure \u00b7 central visibility"}
          hero={{ value: cloud.oop, caption: "out of policy", role: "high" }}
          distribution={{ type: "rows", rows: cloudRows }}
          footerNote={"Monitor only \u00b7 ticket to act"}
          onOpen={() => go({ tab: "identities", type: "Cloud KMS Key" })}
        />

        <PostureTile
          icon={Server}
          label="HSM Keys"
          total={hsm.total}
          caption={"Utimaco \u00b7 Crypto4A \u00b7 hardware root of trust"}
          hero={{ value: hsm.quantum, caption: "quantum-vulnerable", role: "high" }}
          distribution={{ type: "rows", rows: hsmRows }}
          footerNote={"Monitor only \u00b7 ticket to act"}
          onOpen={() => go({ tab: "identities", type: "HSM Key" })}
        />

        <PostureTile
          icon={Lock}
          label="Secrets"
          total={s.total}
          hero={{ value: s.act, caption: "need action", role: "critical" }}
          distribution={{ type: "rows", rows: secretRows }}
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
