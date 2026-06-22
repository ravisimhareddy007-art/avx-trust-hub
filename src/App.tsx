import React, { useMemo, useState } from "react";
import {
  Radar, ShieldCheck, Cloud, KeyRound, FileInput, X, Check, AlertTriangle,
  Copy, Server, Play, Save, Loader2, Plus, ArrowLeft, Activity, Layers, ChevronRight
} from "lucide-react";

type MethodId = "network" | "ca" | "cloud" | "secrets" | "thirdparty";
type Tone = "bad" | "warn" | "ok" | "muted";

interface Method {
  id: MethodId; category: string; name: string; desc: string;
  objects: string[]; auth: boolean; icon: React.ReactNode;
}
interface Sig { label: string; tone: Tone; }
interface Finding { id: string; group: string; title: string; sub?: string; signals: Sig[]; locus: string; source: string; }
interface Run {
  id: string; name: string; methodId: MethodId; methodName: string;
  status: "Completed" | "Partial" | "Failed" | "Listening"; when: string;
  stats: { label: string; value: string; tone?: Tone }[];
  advisories: string[]; findings: Finding[]; note?: string;
}

const METHODS: Method[] = [
  { id: "network", category: "Active Scanning", name: "Network Scan",
    desc: "Agentless probing of IP and DNS targets. Discovers TLS, SSH, IPsec/VPN and Kubernetes endpoints across the configured ports.",
    objects: ["TLS Certificates", "Cipher Suites", "Protocol Versions", "SSH Host Keys", "IPsec/VPN"], auth: false, icon: <Radar size={18} /> },
  { id: "ca", category: "CA & PKI", name: "CA Scan",
    desc: "Pulls issued certificate inventory directly from the configured CA (GlobalSign Atlas).",
    objects: ["Issued Certificates", "Revocation Status", "Chain of Trust"], auth: true, icon: <ShieldCheck size={18} /> },
  { id: "cloud", category: "Cloud", name: "Cloud Crypto Posture Scan",
    desc: "Crypto posture across AWS and Azure: keys, certificates, transit and at-rest posture, credential hygiene.",
    objects: ["KMS Keys", "Cloud Certificates", "Transit / At-rest", "Credential Hygiene"], auth: true, icon: <Cloud size={18} /> },
  { id: "secrets", category: "Secrets & Key Stores", name: "Secrets & Key Store Discovery",
    desc: "Metadata-only enumeration of secrets, keys and certificates in vaults, HSMs and secret stores.",
    objects: ["Certificates", "Keys", "Secrets", "Credentials"], auth: true, icon: <KeyRound size={18} /> },
  { id: "thirdparty", category: "Third-Party & Imported", name: "Third-Party Findings Ingestion",
    desc: "Imports vulnerability scan reports (Qualys, Tenable) and CBOM (third-party CycloneDX 1.6 and QTH).",
    objects: ["Vulnerability Findings", "CBOM Components"], auth: true, icon: <FileInput size={18} /> },
];

const CA_INSTANCES = ["GlobalSign Atlas - Production", "GlobalSign Atlas - Staging"];
const CLOUD_ACCOUNTS: Record<string, string[]> = { AWS: ["prod-aws-001", "sandbox-aws-002"], Azure: ["corp-azure-sub-01"] };
const CLOUD_DOMAINS = ["Certificate Posture", "Key Management Posture", "Transit Encryption", "At-rest Encryption", "IAM Credential Hygiene"];
const SECRET_PROVIDERS = ["HashiCorp Vault - prod", "CyberArk Conjur", "Crypto4A HSM", "Utimaco HSM"];
const SECRET_TYPES = ["Certificates", "Encryption Keys", "API Keys", "SSH Keys", "Database Credentials", "Unclassified Secrets"];
const TP_SOURCES = ["Qualys", "Tenable", "Third-party CBOM (CycloneDX 1.6)", "QTH CBOM"];
const DEPTHS = ["Quick", "Deep", "Full"];
const DEFAULT_PORTS = ["443", "8443", "22", "636", "993", "995", "3389", "500", "4500", "6443"];

interface Cfg {
  targets: string; ports: string[]; depth: string; excludes: string;
  caInstances: string[]; caMode: string; caStatus: string;
  vendor: string; accounts: string[]; domains: string[]; region: string; tag: string; sequential: boolean;
  provider: string; secretTypes: string[]; path: string;
  source: string; ingestMode: "push" | "pull"; pushToken: string;
}

const initCfg: Cfg = {
  targets: "", ports: [...DEFAULT_PORTS], depth: "Deep", excludes: "",
  caInstances: [], caMode: "Optimized", caStatus: "Issued + Revoked",
  vendor: "AWS", accounts: [], domains: ["Certificate Posture", "Key Management Posture"], region: "", tag: "", sequential: false,
  provider: "", secretTypes: ["Certificates", "Encryption Keys"], path: "",
  source: "", ingestMode: "pull", pushToken: "",
};

const tw = {
  panel: "rounded-xl border border-slate-700/60 bg-slate-900/60",
  input: "w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500",
  label: "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400",
  primary: "inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed",
  ghost: "inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800",
};

const toneCls: Record<Tone, string> = {
  bad: "border-red-500/40 bg-red-500/10 text-red-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  muted: "border-slate-600 bg-slate-800/60 text-slate-400",
};

let _id = 0;
const uid = () => `f${++_id}`;
const lines = (s: string) => s.split(/[\n,]/).map(x => x.trim()).filter(Boolean);

function genNetwork(cfg: Cfg): Partial<Run> {
  const tg = lines(cfg.targets);
  const ipOnly = tg.length > 0 && !tg.some(t => /[a-zA-Z]/.test(t));
  const host = tg.find(t => /[a-zA-Z]/.test(t)) || "10.0.0.20";
  const f: Finding[] = [
    { id: uid(), group: "TLS endpoints", title: `${host}:443`, sub: "CN=app.corp.io, TLS 1.3, RSA-3072",
      signals: [{ label: "TLS 1.3", tone: "ok" }, { label: "Chain complete", tone: "ok" }, ...(cfg.depth === "Full" ? [{ label: "Revocation: Good (CRL)", tone: "ok" as Tone }] : [])],
      locus: `${host}:443`, source: "Network Scan" },
    { id: uid(), group: "TLS endpoints", title: "10.0.0.31:8443", sub: "CN=legacy.corp.io",
      signals: [{ label: "TLS 1.0/1.1 accepted", tone: "bad" }, { label: "3DES / no forward secrecy", tone: "bad" }],
      locus: "10.0.0.31:8443", source: "Network Scan" },
    { id: uid(), group: "TLS endpoints", title: "10.0.0.44:443", sub: "CN=internal-svc",
      signals: [{ label: "Served chain incomplete (AIA completed)", tone: "warn" }, ...(cfg.depth === "Full" ? [{ label: "Revocation Unverifiable", tone: "warn" as Tone }] : [])],
      locus: "10.0.0.44:443", source: "Network Scan" },
    { id: uid(), group: "TLS endpoints", title: "10.0.0.52:443", sub: "Mutual TLS",
      signals: [{ label: "Requires client certificate (mTLS)", tone: "muted" }], locus: "10.0.0.52:443", source: "Network Scan" },
    { id: uid(), group: "SSH endpoints", title: "10.0.0.20:22", sub: "Ed25519, ECDSA, RSA-4096 (multi-handshake)",
      signals: [{ label: "Host cert present", tone: "ok" }, { label: "Deprecated KEX offered", tone: "warn" }], locus: "10.0.0.20:22", source: "Network Scan" },
    { id: uid(), group: "SSH endpoints", title: "10.0.0.77:22", sub: "RSA-1024 host key",
      signals: [{ label: "RSA below 2048", tone: "bad" }], locus: "10.0.0.77:22", source: "Network Scan" },
    { id: uid(), group: "IPsec / VPN", title: "10.0.0.1:500", sub: "IKEv2",
      signals: [{ label: "Gateway cert not retrievable (IKE_AUTH)", tone: "muted" }], locus: "10.0.0.1:500/udp", source: "Network Scan" },
    { id: uid(), group: "Kubernetes API", title: "10.0.0.90:6443", sub: "API server certificate",
      signals: [{ label: "Self-signed", tone: "warn" }, { label: "SAN covers cluster DNS", tone: "ok" }], locus: "10.0.0.90:6443", source: "Network Scan" },
  ];
  const adv: string[] = [];
  if (ipOnly) adv.push("Reduced coverage: IP-only targeting may miss SNI-served certificates; not treated as confirmed absence.");
  if (cfg.depth === "Full" && cfg.ports.length > 6) adv.push("High cost: Full depth across a broad port list multiplied handshakes and revocation lookups.");
  const unreachable = 2, excluded = cfg.excludes.trim() ? 1 : 0;
  return {
    status: "Partial", findings: f, advisories: adv,
    stats: [
      { label: "Reached", value: String(8), tone: "ok" }, { label: "Unreachable", value: String(unreachable), tone: "warn" },
      { label: "Excluded", value: String(excluded), tone: "muted" }, { label: "Findings", value: String(f.length) },
    ],
    note: ipOnly ? "SNI under-count flagged on IP-only targets." : undefined,
  };
}

function genCA(cfg: Cfg): Partial<Run> {
  const inst = cfg.caInstances[0] || "GlobalSign Atlas - Production";
  const f: Finding[] = [
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: uid(), group: "Issued certificates", title: `CN=svc-${i + 1}.corp.io`, sub: `Serial 0x${(1000 + i).toString(16)} · valid`,
      signals: [{ label: "Issued", tone: "ok" as Tone }], locus: "CA inventory (no deployment locus)", source: inst,
    })),
    { id: uid(), group: "Issued certificates", title: "CN=old.corp.io", sub: "Serial 0x3e9 · revoked",
      signals: [{ label: "Revoked", tone: "bad" }], locus: "CA inventory (no deployment locus)", source: inst },
  ];
  return {
    status: "Completed", findings: f, advisories: [],
    stats: [{ label: "Issued", value: "6", tone: "ok" }, { label: "Revoked", value: "1", tone: "bad" }, { label: "Mode", value: cfg.caMode }],
    note: cfg.caMode === "Optimized" ? "Optimized delta: status changes captured where Atlas exposes a cursor; reconciliation by certificate fingerprint." : "Aggressive full pull; reconciliation by certificate fingerprint.",
  };
}

function genCloud(cfg: Cfg): Partial<Run> {
  const acct = cfg.accounts[0] || "prod-aws-001";
  const f: Finding[] = [];
  cfg.domains.forEach((d, i) => {
    const partial = i === 2;
    f.push({
      id: uid(), group: d, title: partial ? `${d}: limited` : `${d}`,
      sub: cfg.vendor === "AWS" ? `arn:aws:...:${acct}` : `azure:sub/${acct}`,
      signals: partial
        ? [{ label: cfg.vendor === "Azure" ? "Key Vault data-plane access missing (partial visibility)" : "Role lacks data-plane access (partial visibility)", tone: "warn" }]
        : [{ label: "Enumerated", tone: "ok" }],
      locus: cfg.vendor === "AWS" ? `arn:aws:${d.toLowerCase().slice(0, 3)}:${cfg.region || "us-east-1"}:${acct}` : `azure:${acct}/${d}`,
      source: `Cloud (${cfg.vendor})`,
    });
  });
  if (cfg.vendor === "AWS") f.push({ id: uid(), group: "Certificate Posture", title: "CloudFront edge cert", sub: "us-east-1 edge pass",
    signals: [{ label: "Edge cert (us-east-1)", tone: "ok" }], locus: `arn:aws:acm:us-east-1:${acct}`, source: "Cloud (AWS)" });
  const adv = cfg.domains.length >= 3 && !cfg.region ? ["Broad posture domains without a region filter enumerated every enabled region."] : [];
  return {
    status: "Partial", findings: f, advisories: adv,
    stats: [{ label: "Findings", value: String(f.length) }, { label: "Vendor", value: cfg.vendor }, { label: "Partial domains", value: "1", tone: "warn" }],
  };
}

function genSecrets(cfg: Cfg): Partial<Run> {
  const p = cfg.provider || "HashiCorp Vault - prod";
  const hsm = /HSM/.test(p);
  const f: Finding[] = [
    { id: uid(), group: "Secrets", title: "tls/app-cert", sub: "Certificate",
      signals: [{ label: "Enumerated", tone: "ok" }], locus: hsm ? `${p} / partition-1 / app-cert` : `${p} / secret/data/tls`, source: p },
    { id: uid(), group: "Secrets", title: "kv/db-password", sub: "Database Credential",
      signals: [{ label: "No expiry set", tone: "bad" }], locus: `${p} / secret/data/db`, source: p },
    { id: uid(), group: "Secrets", title: "kv/restricted/*", sub: "Listable, not readable",
      signals: [{ label: "Partial visibility (LIST without READ)", tone: "warn" }], locus: `${p} / secret/restricted`, source: p },
    ...(hsm ? [{ id: uid(), group: "Keys", title: "partition-2/signing-key", sub: "EC P-256 (PKCS#11)",
      signals: [{ label: "Enumerated", tone: "ok" as Tone }], locus: `${p} / partition-2`, source: p }] : []),
  ];
  return {
    status: "Partial", findings: f, advisories: [],
    stats: [{ label: "Enumerated", value: String(f.length) }, { label: "Partial paths", value: "1", tone: "warn" }, { label: "Provider", value: hsm ? "HSM" : "Vault" }],
    note: "Metadata only; secret values never extracted. Listable-but-unreadable paths reported as partial visibility.",
  };
}

function genThirdParty(cfg: Cfg): Partial<Run> {
  const push = cfg.ingestMode === "push";
  const src = cfg.source || "Qualys";
  const isVuln = /Qualys|Tenable/.test(src);
  const isQTH = /QTH/.test(src);
  let f: Finding[] = [];
  if (isVuln) {
    f = [
      { id: uid(), group: "Vulnerability findings", title: "TLS 1.0 enabled on host", sub: "Posture only, no crypto object",
        signals: [{ label: "Inferred", tone: "warn" }, { label: "Posture-only", tone: "muted" }], locus: "host 10.0.4.11", source: src.toLowerCase() },
      { id: uid(), group: "Vulnerability findings", title: "Weak cipher RC4 supported", sub: "Posture only",
        signals: [{ label: "Inferred", tone: "warn" }], locus: "host 10.0.4.18", source: src.toLowerCase() },
    ];
  } else if (isQTH) {
    f = [
      { id: uid(), group: "CBOM components (QTH)", title: "MD5 usage in payments-svc", sub: "code component",
        signals: [{ label: "CycloneDX 1.6", tone: "ok" }, { label: "Code-found", tone: "muted" }], locus: "repo: payments-svc / crypto/hash.go", source: "qth" },
      { id: uid(), group: "CBOM components (QTH)", title: "RSA-1024 keygen in auth-lib", sub: "code component",
        signals: [{ label: "CycloneDX 1.6", tone: "ok" }, { label: "Weak key size", tone: "bad" }], locus: "repo: auth-lib / keys.py", source: "qth" },
    ];
  } else {
    f = [
      { id: uid(), group: "CBOM components", title: "AES-256-GCM (cert-manager)", sub: "component",
        signals: [{ label: "CycloneDX 1.6", tone: "ok" }], locus: "component: cert-manager", source: "cbom" },
    ];
  }
  return {
    status: push ? "Listening" : "Completed", findings: f,
    advisories: [],
    stats: [
      { label: "Ingested", value: String(f.length) },
      { label: "Quarantined", value: isVuln ? "0" : "1", tone: isVuln ? "muted" : "warn" },
      { label: "Source", value: src.split(" ")[0] },
    ],
    note: push
      ? "Endpoint active and listening. Showing a received batch. Records deduplicated by source scan time."
      : isVuln
        ? "Vulnerability reports are inferred and sit below native scans and CBOM in source priority."
        : "Native CBOM read directly; one non-conformant record quarantined with reason.",
  };
}

const GEN: Record<MethodId, (c: Cfg) => Partial<Run>> = {
  network: genNetwork, ca: genCA, cloud: genCloud, secrets: genSecrets, thirdparty: genThirdParty,
};

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-emerald-400">{n}</span>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

function Multi({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const sel = value.includes(o);
        return (
          <button key={o} onClick={() => toggle(o)}
            className={`rounded-full border px-3 py-1 text-xs ${sel ? "border-emerald-500 bg-emerald-500/15 text-emerald-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
            {sel && <Check size={11} className="mr-1 inline" />}{o}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => set(!on)} className="flex items-center gap-2 text-sm text-slate-300">
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-emerald-500" : "bg-slate-700"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
      </span>{label}
    </button>
  );
}

const statusCls: Record<Run["status"], string> = {
  Completed: "text-emerald-400", Partial: "text-amber-400", Failed: "text-red-400", Listening: "text-sky-400",
};

export default function App() {
  const [view, setView] = useState<"discovery" | "runs">("discovery");
  const [runs, setRuns] = useState<Run[]>([]);
  const [detail, setDetail] = useState<Run | null>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [method, setMethod] = useState<MethodId | null>(null);
  const [name, setName] = useState("");
  const [runMode, setRunMode] = useState<"once" | "profile">("once");
  const [cfg, setCfg] = useState<Cfg>(initCfg);
  const [testState, setTestState] = useState<"idle" | "testing" | "done">("idle");
  const [testResult, setTestResult] = useState<Sig[]>([]);

  const set = (p: Partial<Cfg>) => setCfg(c => ({ ...c, ...p }));
  const selected = METHODS.find(m => m.id === method) || null;
  const isPush = method === "thirdparty" && cfg.ingestMode === "push";

  const reset = () => { setMethod(null); setName(""); setRunMode("once"); setCfg(initCfg); setTestState("idle"); setTestResult([]); };
  const close = () => { setOpen(false); reset(); };

  const advisories = useMemo(() => {
    const a: string[] = [];
    if (method === "network") {
      const ipOnly = cfg.targets.trim().length > 0 && !/[a-zA-Z]/.test(cfg.targets);
      if (ipOnly) a.push("Reduced coverage: IP-only targeting can miss SNI-served certificates. Add FQDN targets for complete TLS discovery.");
      if (cfg.depth === "Full" && cfg.ports.length > 6) a.push("High cost: Full depth with a broad port list multiplies handshakes and revocation lookups per endpoint.");
    }
    if (method === "ca" && cfg.caMode === "Aggressive" && runMode === "profile")
      a.push("Aggressive mode on a scheduled profile performs a full pull each run and is slower; Optimized is recommended for routine schedules.");
    if (method === "cloud" && cfg.domains.length >= 3 && !cfg.region)
      a.push("Broad posture domains without a region filter will enumerate every enabled region and can be slow.");
    return a;
  }, [method, cfg, runMode]);

  const runTest = () => {
    setTestState("testing");
    setTimeout(() => {
      if (method === "cloud") setTestResult(cfg.domains.map((d, i) => ({ label: d, tone: i % 3 === 2 ? "warn" : "ok" })));
      else if (method === "secrets") setTestResult(cfg.secretTypes.map((t, i) => ({ label: t, tone: i === 1 ? "warn" : "ok" })));
      else setTestResult([{ label: "Reachable and authenticated", tone: "ok" }]);
      setTestState("done");
    }, 800);
  };

  const needsTest = !!selected?.auth && !isPush;
  const instanceOk =
    method === "network" ? cfg.targets.trim().length > 0 :
    method === "ca" ? cfg.caInstances.length > 0 :
    method === "cloud" ? cfg.accounts.length > 0 :
    method === "secrets" ? !!cfg.provider :
    method === "thirdparty" ? (isPush ? !!cfg.pushToken : !!cfg.source) : false;

  const canSubmit = !!method && name.trim().length > 0 && instanceOk && (!needsTest || testState === "done");
  const submitLabel = isPush ? "Save & Activate Endpoint" : runMode === "once" ? "Start Scan" : "Save as Profile";

  const genToken = () => set({ pushToken: Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("") });

  const submit = () => {
    if (!canSubmit || !method || !selected) return;
    setRunning(true);
    setTimeout(() => {
      const g = GEN[method](cfg);
      const run: Run = {
        id: uid(), name: name.trim(), methodId: method, methodName: selected.name,
        status: (g.status as Run["status"]) || "Completed", when: "just now",
        stats: g.stats || [], advisories: [...advisories, ...(g.advisories || [])], findings: g.findings || [], note: g.note,
      };
      setRuns(r => [run, ...r]);
      setRunning(false); close(); setDetail(run); setView("runs");
    }, 1100);
  };

  const grouped = METHODS.reduce<Record<string, Method[]>>((acc, m) => { (acc[m.category] ||= []).push(m); return acc; }, {});
  const findingGroups = (r: Run) => r.findings.reduce<Record<string, Finding[]>>((a, f) => { (a[f.group] ||= []).push(f); return a; }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-emerald-400">AVX Trust Platform</div>
            <h1 className="mt-1 text-2xl font-semibold">Discovery</h1>
            <div className="mt-3 flex gap-1">
              {(["discovery", "runs"] as const).map(v => (
                <button key={v} onClick={() => { setView(v); setDetail(null); }}
                  className={`rounded-lg px-3 py-1.5 text-sm capitalize ${view === v ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}>
                  {v === "runs" ? `Runs${runs.length ? ` (${runs.length})` : ""}` : "Overview"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setOpen(true)} className={tw.primary}><Play size={16} /> Start Discovery</button>
        </div>

        {view === "discovery" && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[["Discovered objects", "12,660"], ["Runs", String(runs.length)], ["Methods", "5"], ["Profiles", "9"]].map(([k, v]) => (
                <div key={k} className={`${tw.panel} p-4`}><div className="text-2xl font-semibold">{v}</div><div className="text-xs text-slate-400">{k}</div></div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {METHODS.map(m => (
                <div key={m.id} className={`${tw.panel} p-4`}>
                  <div className="flex items-center gap-2 font-medium"><span className="text-emerald-400">{m.icon}</span>{m.name}
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">{m.category}</span></div>
                  <p className="mt-1.5 text-xs text-slate-400">{m.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "runs" && !detail && (
          <div className={`${tw.panel} mt-8`}>
            <div className="border-b border-slate-700/60 px-5 py-3 text-sm font-medium text-slate-300">Discovery runs</div>
            {runs.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">No runs yet. Start a discovery to see results here.</div>
            ) : runs.map(r => (
              <button key={r.id} onClick={() => setDetail(r)} className="flex w-full items-center gap-3 border-b border-slate-800 px-5 py-3 text-left text-sm hover:bg-slate-800/40">
                <Activity size={15} className="text-slate-500" />
                <span className="font-medium">{r.name}</span>
                <span className="text-slate-500">{r.methodName}</span>
                <span className={`ml-auto ${statusCls[r.status]}`}>{r.status}</span>
                <span className="text-slate-500">{r.findings.length} findings</span>
                <ChevronRight size={15} className="text-slate-600" />
              </button>
            ))}
          </div>
        )}

        {view === "runs" && detail && (
          <div className="mt-6">
            <button onClick={() => setDetail(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft size={15} /> All runs</button>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{detail.name}</h2>
              <span className={`text-sm ${statusCls[detail.status]}`}>{detail.status}</span>
              <span className="text-sm text-slate-500">{detail.methodName} · {detail.when}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {detail.stats.map(s => (
                <div key={s.label} className={`${tw.panel} px-4 py-2`}>
                  <div className={`text-lg font-semibold ${s.tone === "bad" ? "text-red-400" : s.tone === "warn" ? "text-amber-400" : s.tone === "ok" ? "text-emerald-400" : ""}`}>{s.value}</div>
                  <div className="text-[11px] text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>
            {detail.note && <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">{detail.note}</div>}
            {detail.advisories.map((a, i) => (
              <div key={i} className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{a}</div>
            ))}
            <div className="mt-5 space-y-5">
              {Object.entries(findingGroups(detail)).map(([g, fs]) => (
                <div key={g}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"><Layers size={14} className="text-slate-500" />{g}<span className="text-slate-600">({fs.length})</span></div>
                  <div className="space-y-2">
                    {fs.map(f => (
                      <div key={f.id} className={`${tw.panel} p-3`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-100">{f.title}</span>
                          {f.sub && <span className="text-xs text-slate-500">{f.sub}</span>}
                          <span className="ml-auto rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{f.source}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {f.signals.map((s, i) => <span key={i} className={`rounded border px-1.5 py-0.5 text-[10px] ${toneCls[s.tone]}`}>{s.label}</span>)}
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-500">locus: {f.locus}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
          <div className={`${tw.panel} w-full max-w-4xl bg-slate-900`}>
            <div className="flex items-center justify-between border-b border-slate-700/60 px-6 py-4">
              <div><h2 className="text-lg font-semibold">Start Discovery</h2>
                <p className="text-xs text-slate-400">Select a method, add the details, choose what to run against, and run.</p></div>
              <button onClick={close} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
            </div>
            <div className="space-y-6 px-6 py-5">
              <Section n="1" title="Select discovery method">
                <div className="space-y-4">
                  {Object.entries(grouped).map(([cat, ms]) => (
                    <div key={cat}>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{cat}</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ms.map(m => {
                          const sel = method === m.id;
                          return (
                            <button key={m.id} onClick={() => { setMethod(m.id); setTestState("idle"); setTestResult([]); }}
                              className={`rounded-xl border p-4 text-left transition ${sel ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-500"}`}>
                              <div className="flex items-center gap-2 font-medium"><span className={sel ? "text-emerald-400" : "text-slate-300"}>{m.icon}</span>{m.name}
                                {sel && <Check size={16} className="ml-auto text-emerald-400" />}</div>
                              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{m.desc}</p>
                              <div className="mt-2 flex flex-wrap gap-1">{m.objects.map(o => <span key={o} className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{o}</span>)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {method && (
                <>
                  <Section n="2" title="Scan details">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className={tw.label}>Scan name</label>
                        <input className={tw.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Quarterly corp network sweep" /></div>
                      <div><label className={tw.label}>Run mode</label>
                        <div className="flex gap-2">{(["once", "profile"] as const).map(rm => {
                          const disabled = rm === "once" && isPush;
                          return (<button key={rm} disabled={disabled} onClick={() => setRunMode(rm)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${runMode === rm && !disabled ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-300"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                            {rm === "once" ? "Run once now" : "Save as profile"}</button>);
                        })}</div>
                        {isPush && <p className="mt-1 text-[11px] text-slate-500">Push ingestion is a standing endpoint. Saving the profile activates it.</p>}</div>
                    </div>
                  </Section>

                  <Section n="3" title="Discovery details">
                    {method === "network" && (
                      <div className="space-y-4">
                        <div><label className={tw.label}>Targets (IP, CIDR, FQDN)</label>
                          <textarea className={`${tw.input} h-20`} value={cfg.targets} onChange={e => set({ targets: e.target.value })} placeholder={"10.0.0.0/16\napp.corp.io"} /></div>
                        <div><label className={tw.label}>Ports</label><Multi options={DEFAULT_PORTS} value={cfg.ports} onChange={v => set({ ports: v })} /></div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div><label className={tw.label}>Depth</label>
                            <div className="flex gap-2">{DEPTHS.map(d => <button key={d} onClick={() => set({ depth: d })}
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${cfg.depth === d ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-300"}`}>{d}</button>)}</div></div>
                          <div><label className={tw.label}>Excludes (optional)</label>
                            <input className={tw.input} value={cfg.excludes} onChange={e => set({ excludes: e.target.value })} placeholder="10.0.5.0/24" /></div>
                        </div>
                      </div>
                    )}
                    {method === "ca" && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className={tw.label}>Scan mode</label>
                          <div className="flex gap-2">{["Optimized", "Aggressive"].map(m => <button key={m} onClick={() => set({ caMode: m })}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${cfg.caMode === m ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-300"}`}>{m}</button>)}</div></div>
                        <div><label className={tw.label}>Status scope</label>
                          <select className={tw.input} value={cfg.caStatus} onChange={e => set({ caStatus: e.target.value })}>
                            <option>Issued + Revoked</option><option>Issued only</option><option>Revoked only</option></select></div>
                      </div>
                    )}
                    {method === "cloud" && (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div><label className={tw.label}>Vendor</label>
                            <div className="flex gap-2">{["AWS", "Azure"].map(v => <button key={v} onClick={() => set({ vendor: v, accounts: [] })}
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${cfg.vendor === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-300"}`}>{v}</button>)}</div></div>
                          <div><label className={tw.label}>Region filter (optional)</label>
                            <input className={tw.input} value={cfg.region} onChange={e => set({ region: e.target.value })} placeholder="us-east-1, eu-west-2" /></div>
                        </div>
                        <div><label className={tw.label}>Posture domains</label><Multi options={CLOUD_DOMAINS} value={cfg.domains} onChange={v => set({ domains: v })} /></div>
                        <div className="flex items-end justify-between gap-4">
                          <div className="w-1/2"><label className={tw.label}>Resource tag filter (optional)</label>
                            <input className={tw.input} value={cfg.tag} onChange={e => set({ tag: e.target.value })} placeholder="env=prod" /></div>
                          <Toggle on={cfg.sequential} set={v => set({ sequential: v })} label="Execute batches sequentially" />
                        </div>
                      </div>
                    )}
                    {method === "secrets" && (
                      <div className="space-y-4">
                        <div><label className={tw.label}>Secret types</label><Multi options={SECRET_TYPES} value={cfg.secretTypes} onChange={v => set({ secretTypes: v })} /></div>
                        <div><label className={tw.label}>Path scoping (optional)</label>
                          <input className={tw.input} value={cfg.path} onChange={e => set({ path: e.target.value })} placeholder="secret/data/prod/*" /></div>
                      </div>
                    )}
                    {method === "thirdparty" && (
                      <div><label className={tw.label}>Ingest mode</label>
                        <div className="flex gap-2">{(["pull", "push"] as const).map(m => <button key={m} onClick={() => { set({ ingestMode: m }); if (m === "push") setRunMode("profile"); }}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${cfg.ingestMode === m ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-300"}`}>{m}</button>)}</div>
                        <p className="mt-1 text-[11px] text-slate-500">Mode is locked after activation; changing it later requires cloning the profile.</p></div>
                    )}
                  </Section>

                  <Section n="4" title={method === "network" ? "Targets to run against" : "Select instance to run against"}>
                    {method === "network" && <p className="text-sm text-slate-400">Runs against the target set entered above. At least one target is required.</p>}
                    {method === "ca" && <Multi options={CA_INSTANCES} value={cfg.caInstances} onChange={v => set({ caInstances: v })} />}
                    {method === "cloud" && <Multi options={CLOUD_ACCOUNTS[cfg.vendor]} value={cfg.accounts} onChange={v => set({ accounts: v })} />}
                    {method === "secrets" && (
                      <select className={tw.input} value={cfg.provider} onChange={e => set({ provider: e.target.value })}>
                        <option value="">Select a configured connection...</option>{SECRET_PROVIDERS.map(p => <option key={p}>{p}</option>)}</select>
                    )}
                    {method === "thirdparty" && cfg.ingestMode === "pull" && (
                      <select className={tw.input} value={cfg.source} onChange={e => set({ source: e.target.value })}>
                        <option value="">Select a source connection...</option>{TP_SOURCES.map(t => <option key={t}>{t}</option>)}</select>
                    )}
                    {isPush && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-400">Push mode has no external instance. AVX generates an endpoint and a token, shown once. Copy it into your source now.</p>
                        <button onClick={genToken} className={tw.ghost}><Plus size={14} /> Generate endpoint & token</button>
                        {cfg.pushToken && (
                          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                            <div className="mb-1 flex items-center gap-1.5 text-amber-300"><AlertTriangle size={13} /> Shown once and not retained. Copy now.</div>
                            <div className="font-mono text-slate-300">https://ingest.avx.io/v1/{name.trim() ? name.trim().toLowerCase().replace(/\s+/g, "-") : "profile"}</div>
                            <div className="mt-1 flex items-center gap-2"><span className="font-mono text-emerald-300">{cfg.pushToken}</span><Copy size={13} className="cursor-pointer text-slate-400" /></div>
                          </div>
                        )}
                      </div>
                    )}
                  </Section>

                  {needsTest && (
                    <Section n="5" title="Test connection">
                      <button onClick={runTest} disabled={!instanceOk || testState === "testing"} className={tw.ghost}>
                        {testState === "testing" ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />} Test connection</button>
                      {testState === "done" && (
                        <div className="mt-3 space-y-1.5">
                          {(method === "cloud" || method === "secrets") && <p className="text-xs text-slate-400">{method === "cloud" ? "Reachable posture domains under this account's data-plane access:" : "Accessible secret types for this connection:"}</p>}
                          {testResult.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              {r.tone === "ok" ? <Check size={14} className="text-emerald-400" /> : <X size={14} className="text-amber-400" />}
                              <span className={r.tone === "ok" ? "text-slate-200" : "text-amber-300"}>{r.label}{r.tone !== "ok" && " — not accessible (partial visibility)"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  )}

                  {advisories.length > 0 && (
                    <div className="space-y-2">{advisories.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{a}</div>
                    ))}</div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-700/60 px-6 py-4">
              <button onClick={close} className={tw.ghost}>Cancel</button>
              <button onClick={submit} disabled={!canSubmit || running} className={tw.primary}>
                {running ? <Loader2 size={16} className="animate-spin" /> : isPush ? <Save size={16} /> : runMode === "once" ? <Play size={16} /> : <Save size={16} />} {running ? "Running..." : submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
