import React from "react";
import { useNav } from "@/context/NavigationContext";
import { FileBadge, FileKey, Key, Server, Lock, Network, Package, BadgeCheck } from "lucide-react";
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
  cloud: {
    total: 2847,
    aws: 1720,
    azure: 1127,
    publicAccess: 214,
    lifecycle: 168,
    sensitiveSoftware: 7,
  },
  hsm: { total: 1240, extractable: 27, nonSensitive: 14, weakAlgo: 62, utimaco: 604, crypto4a: 412, fortanix: 224 },
  sshCerts: { total: 4120, longLived: 690, unmanagedCA: 148, broadForward: 512 },
  secrets: { total: 6240, act: 3980, unrotated: 3210, orphaned: 512, noPolicy: 258 },
  // Estate-scale protocol and library figures. The crypto-stack inventory holds
  // the discovered sample; the dashboard reports estate totals. Drill-through
  // still routes to the live crypto-stack views.
  protocols: { total: 18600, ssl: 240, t10: 890, t11: 1340, t12: 9200, t13ssh: 6930 },
  libraries: { total: 14200, eol: 1180, outdated: 3400, supported: 9620 },
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
      label: "Publicly accessible key",
      count: cloud.publicAccess,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key", filterId: "cloud_overpermissive" }),
    },
    {
      label: "Unused key pending deletion",
      count: cloud.lifecycle,
      role: "high",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key", filterId: "cloud_lifecycle" }),
    },
    {
      label: "Sensitive key not HSM-backed",
      count: cloud.sensitiveSoftware,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key", filterId: "cloud_prot_software" }),
    },
  ];
  // Provider distribution (inventory lens): where the keys live, AWS vs Azure.
  const AWS_ORANGE = "#e8912a";
  const AZURE_BLUE = "#3b82f6";
  const cloudProviderSlices: DonutSlice[] = [
    {
      label: "AWS",
      count: cloud.aws,
      stroke: AWS_ORANGE,
      text: "text-amber",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key" }),
    },
    {
      label: "Azure",
      count: cloud.azure,
      stroke: AZURE_BLUE,
      text: "text-muted-foreground",
      onClick: () => go({ tab: "identities", type: "Cloud KMS Key" }),
    },
  ];

  const hsm = POSTURE.hsm;
  const hsmRows: PostureRow[] = [
    {
      label: "Exportable key material",
      count: hsm.extractable,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "HSM Key", filterId: "hsm_extractable" }),
    },
    {
      label: "Key material readable (not sensitive)",
      count: hsm.nonSensitive,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "HSM Key", filterId: "hsm_nonsensitive" }),
    },
    {
      label: "Weak algorithm (RSA-1024 / SHA-1)",
      count: hsm.weakAlgo,
      role: "high",
      onClick: () => go({ tab: "identities", type: "HSM Key", filterId: "hsm_weak_algo" }),
    },
  ];
  // Distribution by HSM (inventory lens): which appliance holds the keys.
  const UTIMACO_BLUE = "#5b8def";
  const CRYPTO4A_TEAL = "#2fb3a0";
  const FORTANIX_VIOLET = "#8b7bd8";
  const hsmVendorSlices: DonutSlice[] = [
    {
      label: "Utimaco",
      count: hsm.utimaco,
      stroke: UTIMACO_BLUE,
      text: "text-muted-foreground",
      onClick: () => go({ tab: "identities", type: "HSM Key" }),
    },
    {
      label: "Crypto4A",
      count: hsm.crypto4a,
      stroke: CRYPTO4A_TEAL,
      text: "text-teal",
      onClick: () => go({ tab: "identities", type: "HSM Key" }),
    },
    {
      label: "Fortanix",
      count: hsm.fortanix,
      stroke: FORTANIX_VIOLET,
      text: "text-muted-foreground",
      onClick: () => go({ tab: "identities", type: "HSM Key" }),
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

  // SSH certificates: CA-signed, meant to be short-lived and tightly scoped.
  const sc = POSTURE.sshCerts;
  const sshCertRows: PostureRow[] = [
    {
      label: "Signed by an unmanaged CA",
      count: sc.unmanagedCA,
      role: "critical",
      onClick: () => go({ tab: "identities", type: "SSH Certificate" }),
    },
    {
      label: "Long-lived (validity over 24h)",
      count: sc.longLived,
      role: "high",
      onClick: () => go({ tab: "identities", type: "SSH Certificate" }),
    },
    {
      label: "Broad forwarding / agent permitted",
      count: sc.broadForward,
      role: "high",
      onClick: () => go({ tab: "identities", type: "SSH Certificate" }),
    },
  ];

  // Protocols + libraries: estate-scale figures for the dashboard; drill-through
  // routes to the live crypto-stack views (which show the discovered sample).
  const pp = POSTURE.protocols;
  const ll = POSTURE.libraries;
  const ssl = pp.ssl,
    t10 = pp.t10,
    t11 = pp.t11,
    t12 = pp.t12;
  const t13 = pp.t13ssh,
    sshP = 0;
  const pLegacy = ssl + t10 + t11;
  const lEol = ll.eol,
    lOut = ll.outdated,
    lSup = ll.supported;

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
        <span className="text-[10px] text-muted-foreground">8 categories</span>
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
          icon={BadgeCheck}
          label="SSH Certificates"
          total={sc.total}
          caption={"CA-signed \u00b7 short-lived host & user certs"}
          hero={{ value: sc.longLived, caption: "long-lived (>24h)", role: "high" }}
          distribution={{ type: "rows", rows: sshCertRows }}
          onOpen={() => go({ tab: "identities", type: "SSH Certificate" })}
        />

        <PostureTile
          icon={Key}
          label="Cloud KMS Keys"
          total={cloud.total}
          caption={"AWS \u00b7 Azure \u00b7 central visibility"}
          hero={{ value: cloud.publicAccess, caption: "publicly accessible", role: "high" }}
          views={[
            { label: "Posture", distribution: { type: "rows", rows: cloudRows } },
            {
              label: "Distribution",
              distribution: {
                type: "donut",
                centerValue: cloud.total.toLocaleString(),
                centerLabel: "keys",
                centerClass: "text-foreground",
                slices: cloudProviderSlices,
              },
            },
          ]}
          onOpen={() => go({ tab: "identities", type: "Cloud KMS Key" })}
        />

        <PostureTile
          icon={Server}
          label="HSM Keys"
          total={hsm.total}
          caption={"Utimaco \u00b7 Crypto4A \u00b7 Fortanix \u00b7 hardware root of trust"}
          hero={{ value: hsm.extractable, caption: "exportable", role: "critical" }}
          views={[
            { label: "Posture", distribution: { type: "rows", rows: hsmRows } },
            {
              label: "Distribution",
              distribution: {
                type: "donut",
                centerValue: hsm.total.toLocaleString(),
                centerLabel: "keys",
                centerClass: "text-foreground",
                slices: hsmVendorSlices,
              },
            },
          ]}
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
          total={pp.total}
          hero={{ value: pLegacy, caption: "legacy versions", role: "critical" }}
          distribution={{ type: "donut", centerValue: String(pLegacy), centerLabel: "legacy", slices: protoSlices }}
          onOpen={() => go({ tab: "crypto-assets", view: "protocols" })}
        />

        <PostureTile
          icon={Package}
          label="Libraries"
          total={ll.total}
          hero={{ value: lEol, caption: "end-of-life", role: "critical" }}
          distribution={{ type: "donut", centerValue: String(lEol), centerLabel: "EOL", slices: libSlices }}
          onOpen={() => go({ tab: "crypto-assets", view: "libraries" })}
        />
      </div>
    </div>
  );
}
