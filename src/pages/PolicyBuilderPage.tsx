import { FEATURES } from "@/config/features";
import React, { useState, useEffect } from "react";
import { useNav } from "@/context/NavigationContext";
import { policyRules, customPolicies as initialCustomPolicies, recomputePolicyViolations } from "@/data/mockData";
import { POLICY_PACKS, packTypeToAssetType, type PolicyPack } from "@/data/policyPacks";
import { mockGroups } from "@/data/inventoryMockData";
import { SeverityBadge, Modal } from "@/components/shared/UIComponents";
import ConditionBuilder, { ConditionGroup, emptyGroup } from "@/components/policies/ConditionBuilder";
import { POLICY_TYPES, describeCondition, FIELDS_BY_POLICY_TYPE } from "@/components/policies/policyFields";
import {
  POLICY_FRAMES, DEFAULT_PROFILE_FOR_FRAME, fieldsForFrame,
  type PolicyFrame,
} from "@/components/policies/policyFrame";
import { DEADLINE_PROFILES, type DeadlineProfileId } from "@/lib/risk/qes";
import { toast } from "sonner";
import { useExceptions } from "@/lib/exceptions/ExceptionsContext";
import { ExceptionsList } from "@/lib/exceptions/ExceptionComponents";
import {
  Plus,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
  Server,
  Lock,
  X,
  Info,
  FileBadge,
  KeyRound,
  Network,
  Code2,
  Atom,
  MoreHorizontal,
  ChevronLeft,
  CheckCircle2,
  Package,
  Link2,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Types

interface ScopeConfig {
  groupIds: string[];
  environments: string[];
  providers: string[];
}

type TicketSystem = "servicenow" | "jira";

interface TicketConfig {
  enabled: boolean;
  system: TicketSystem;
  // ServiceNow
  assignmentGroup?: string;
  snowPriority?: "1-Critical" | "2-High" | "3-Moderate" | "4-Low";
  // Jira
  projectKey?: string;
  issueType?: "Task" | "Bug";
  jiraPriority?: "Highest" | "High" | "Medium" | "Low";
}

interface NotifyConfig {
  email: string;
  onNewViolation: boolean;
}

interface PreviewResult {
  inScope: number;
  compliant: number;
  nonCompliant: number;
  excepted: number;
  sample: { name: string; failing: string }[];
}

interface CustomPolicy {
  id: string;
  name: string;
  description: string;
  status: string;
  violations: number;
  assetType?: string;
  severity?: string;
  conditionGroups?: ConditionGroup[];
  groupLogic?: "AND" | "OR";
  conditionSummary?: string;
  scope?: ScopeConfig;
  tags?: string[];
  notify?: NotifyConfig;
  ticket?: TicketConfig;
  effectiveFrom?: string | null;
  // Pack provenance (when a policy was created via a Policy Pack import)
  source?: string; // e.g. "Pack: PCI DSS v4.0"; falls back to 'Custom'
  packId?: string;
  advisory?: boolean;
  clauseMapping?: string;
  reusesBuiltin?: string;
}

type PolicyType =
  | "ssh-key"
  | "ssh-cert"
  | "certificates"
  | "secrets"
  | "encryption-keys"
  | "cloud-kms-key"
  | "hsm-key"
  | "protocol-cipher"
  | "cbom"
  | "";

const getPolicyTypeMeta = (type: PolicyType) => {
  switch (type) {
    case "ssh-key":
      return { label: "SSH Keys", icon: Key, cls: "bg-amber/10 text-amber border-amber/20" };
    case "ssh-cert":
      return { label: "SSH Certificates", icon: Shield, cls: "bg-amber/10 text-amber border-amber/20" };
    case "certificates":
      return { label: "Certificates", icon: Shield, cls: "bg-teal/10 text-teal border-teal/20" };
    case "secrets":
      return { label: "Secrets & Tokens", icon: Lock, cls: "bg-purple/10 text-purple border-purple/20" };
    case "encryption-keys":
      return { label: "Encryption Keys", icon: Key, cls: "bg-teal/10 text-teal border-teal/20" };
    case "cloud-kms-key":
      return { label: "Cloud KMS Keys", icon: Key, cls: "bg-teal/10 text-teal border-teal/20" };
    case "hsm-key":
      return { label: "HSM Keys", icon: Server, cls: "bg-amber/10 text-amber border-amber/20" };
    case "protocol-cipher":
      return { label: "Protocol & Cipher", icon: Shield, cls: "bg-purple/10 text-purple border-purple/20" };
    case "cbom":
      return { label: "Code / CBOM", icon: Lock, cls: "bg-purple/10 text-purple border-purple/20" };
    default:
      return null;
  }
};

const getPolicyTypeFromAssetType = (assetType?: string): PolicyType => {
  const v = (assetType || "").toLowerCase();
  if (v.includes("ssh certificate")) return "ssh-cert";
  if (v.includes("ssh")) return "ssh-key";
  if (v.includes("encryption key")) return "encryption-keys";
  if (v.includes("protocol") || v.includes("cipher")) return "protocol-cipher";
  if (v.includes("cbom") || v.includes("code")) return "cbom";
  if (v.includes("secret") || v.includes("token") || v.includes("api")) return "secrets";
  if (v.includes("certificate") || v.includes("tls")) return "certificates";
  return "";
};
const getPolicyTypeBadgeFromAsset = (assetType?: string) => getPolicyTypeMeta(getPolicyTypeFromAssetType(assetType));

const ENV_OPTIONS = ["Production", "Staging", "Development"];
const CLOUD_OPTIONS = ["AWS", "Azure", "GCP"];

function emptyScope(): ScopeConfig {
  return { groupIds: [], environments: [], providers: [] };
}

function emptyNotify(): NotifyConfig {
  return { email: "", onNewViolation: true };
}

function emptyTicket(): TicketConfig {
  return {
    enabled: false,
    system: "servicenow",
    assignmentGroup: "",
    snowPriority: "2-High",
    projectKey: "",
    issueType: "Task",
    jiraPriority: "High",
  };
}

function assetTypeFor(policyType: string) {
  if (policyType.includes("Cloud KMS Key")) return "Cloud KMS Key";
  if (policyType.includes("HSM Key")) return "HSM Key";
  if (policyType.includes("SSH Certificate")) return "SSH Certificate";
  if (policyType.includes("Certificate")) return "TLS Certificate";
  if (policyType.includes("SSH")) return "SSH Key";
  if (policyType.includes("Encryption Keys")) return "Encryption Key";
  if (policyType.includes("Protocol")) return "Protocol / Cipher";
  if (policyType.includes("CBOM")) return "Code / CBOM";
  return "Secret / Token";
}

function severityToSnowPriority(sev: string): TicketConfig["snowPriority"] {
  return sev === "Critical" ? "1-Critical" : sev === "High" ? "2-High" : sev === "Medium" ? "3-Moderate" : "4-Low";
}
function severityToJiraPriority(sev: string): TicketConfig["jiraPriority"] {
  return sev === "Critical" ? "Highest" : sev === "High" ? "High" : sev === "Medium" ? "Medium" : "Low";
}

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
};

// ──────────────────────────────────────────────────────────────────────────────
// Small reusable bits

function InfoIcon({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex items-center text-muted-foreground hover:text-foreground cursor-help">
      <Info className="w-3 h-3" />
    </span>
  );
}

type SectionAccent = "teal" | "purple" | "amber" | "coral";
function SectionHeading({ label, info, accent = "teal" }: { label: string; info: string; accent?: SectionAccent }) {
  const dotCls = ({ teal: "bg-teal", purple: "bg-purple", amber: "bg-amber", coral: "bg-coral" } as const)[accent];
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls} shadow-[0_0_0_3px_hsl(var(--card))]`} />
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</p>
      <InfoIcon text={info} />
    </div>
  );
}

const sectionCardCls = "bg-card/60 border border-border/50 rounded-xl p-5 shadow-sm";

function ChipMulti({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${active ? "bg-teal/15 text-teal border-teal/40" : "bg-card text-muted-foreground border-border hover:border-foreground/30"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagChips({ values, onRemove }: { values: { id: string; label: string }[]; onRemove: (id: string) => void }) {
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {values.map((v) => (
        <span
          key={v.id}
          className="text-[10px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 inline-flex items-center gap-1"
        >
          {v.label}
          <button type="button" onClick={() => onRemove(v.id)} className="hover:text-coral">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (!t || values.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...values, t]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-lg px-2 py-1.5 bg-card min-h-[34px]">
      {values.map((v) => (
        <span
          key={v}
          className="text-[10px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 inline-flex items-center gap-1"
        >
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-coral">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={values.length ? "" : placeholder || "Type and press Enter"}
        className="flex-1 min-w-[120px] bg-transparent text-[11px] outline-none text-foreground"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AI assist — heuristic policy drafter (front-end only)

type Confidence = "High" | "Medium" | "Low";
export type AIField = "policyType" | "conditions" | "severity" | "environments";

interface Fills {
  policyType?: string;
  severity?: string;
  environments?: string[];
  conditions?: {
    seeds: { field: string; operator: string; value: string }[][];
    groupLogic: "AND" | "OR";
  };
}

interface Interpretation {
  id: string;
  label: string;
  fills: Fills;
  confidence: Confidence;
  notes: string[];
}

type DraftResult =
  | { kind: "ok"; interpretations: Interpretation[] }
  | { kind: "unresolvable"; reason: string; suggestion: string }
  | { kind: "unavailable" };

function detectPolicyType(d: string): string | undefined {
  if (/\bssh\s*cert/.test(d)) return "SSH Certificate Policy";
  if (/\bssh\b/.test(d)) return "SSH Key Policy";
  if (/\b(secret|token|api\s*key)\b/.test(d)) return "Secrets & Tokens Policy";
  if (/(encryption\s*key|\bkms\b|hsm)/.test(d)) return "Encryption Keys Policy";
  if (/(protocol|cipher|tls\s*1\.[01])/.test(d)) return "Protocol & Cipher Policy";
  if (/(cbom|source\s*code|repo)/.test(d)) return "Code / CBOM Policy";
  if (/(certificate|\bcert\b|\btls\b|x\.?509)/.test(d)) return "Certificate Policy";
  return undefined;
}

function detectSeverity(d: string): string | undefined {
  if (/\b(critical|urgent|severe)\b/.test(d)) return "Critical";
  if (/\bhigh\b/.test(d)) return "High";
  if (/\bmedium\b/.test(d)) return "Medium";
  if (/\blow\b/.test(d)) return "Low";
  return undefined;
}

function detectEnvironments(d: string): string[] | undefined {
  const envs: string[] = [];
  if (/\b(prod|production)\b/.test(d)) envs.push("Production");
  if (/\bstag(ing)?\b/.test(d)) envs.push("Staging");
  if (/\b(dev|development)\b/.test(d)) envs.push("Development");
  return envs.length ? envs : undefined;
}

function buildConditionVariants(
  d: string,
  policyType: string,
): {
  seeds: { field: string; operator: string; value: string }[][];
  groupLogic: "AND" | "OR";
  label: string;
  confidence: Confidence;
  notes: string[];
}[] {
  const fields = (FIELDS_BY_POLICY_TYPE as Record<string, { id: string }[]>)[policyType] || [];
  const hasField = (id: string) => fields.some((f) => f.id === id);

  const dayMatch = d.match(/(\d+)\s*day/);
  const days = dayMatch ? dayMatch[1] : null;
  const bitsMatch = d.match(/\b(1024|2048|3072|4096)\b/);
  const bits = bitsMatch ? bitsMatch[1] : null;

  // Ambiguity: vague rotation
  const vagueTime = /(a while|recently|stale|\bold\b|long time)/.test(d);
  if (vagueTime && /rotat/.test(d) && !days && hasField("days_since_rotation")) {
    return [
      {
        seeds: [[{ field: "days_since_rotation", operator: "gt", value: "90" }]],
        groupLogic: "AND",
        label: "Not rotated in over 90 days",
        confidence: "Medium",
        notes: ["Threshold inferred from vague time"],
      },
      {
        seeds: [[{ field: "days_since_rotation", operator: "gt", value: "180" }]],
        groupLogic: "AND",
        label: "Not rotated in over 180 days",
        confidence: "Medium",
        notes: [],
      },
      {
        seeds: [[{ field: "days_since_rotation", operator: "gt", value: "365" }]],
        groupLogic: "AND",
        label: "Not rotated in over 365 days",
        confidence: "Low",
        notes: ["Coarse guess"],
      },
    ];
  }

  // Ambiguity: "weak"
  if (/\bweak\b/.test(d) && !/sha|md5|rsa|dsa|bit|ecdsa|ed25519/.test(d)) {
    if (policyType === "Certificate Policy") {
      return [
        {
          seeds: [[{ field: "sig_algo", operator: "in", value: "SHA-1,MD5" }]],
          groupLogic: "AND",
          label: "Weak signature algorithm (SHA-1 or MD5)",
          confidence: "Medium",
          notes: [],
        },
        {
          seeds: [
            [
              { field: "key_type", operator: "eq", value: "RSA" },
              { field: "key_bits", operator: "lt", value: "2048" },
            ],
          ],
          groupLogic: "AND",
          label: "RSA keys under 2048 bits",
          confidence: "Medium",
          notes: [],
        },
        {
          seeds: [[{ field: "quantum_vuln", operator: "eq", value: "Quantum-Vulnerable" }]],
          groupLogic: "AND",
          label: "Quantum-vulnerable algorithms",
          confidence: "Medium",
          notes: [],
        },
      ];
    }
    if (policyType === "SSH Key Policy") {
      return [
        {
          seeds: [[{ field: "key_type", operator: "eq", value: "DSA" }]],
          groupLogic: "AND",
          label: "DSA key type",
          confidence: "Medium",
          notes: [],
        },
        {
          seeds: [
            [
              { field: "key_type", operator: "eq", value: "RSA" },
              { field: "key_bits", operator: "lt", value: "2048" },
            ],
          ],
          groupLogic: "AND",
          label: "RSA keys under 2048 bits",
          confidence: "Medium",
          notes: [],
        },
        {
          seeds: [[{ field: "mac_algo", operator: "in", value: "hmac-sha1,hmac-md5" }]],
          groupLogic: "AND",
          label: "Legacy MAC algorithms",
          confidence: "Medium",
          notes: [],
        },
      ];
    }
  }

  // Direct mapping
  const seeds: { field: string; operator: string; value: string }[][] = [];
  const notes: string[] = [];

  if (policyType === "Certificate Policy") {
    if (/sha-?1|md5/.test(d) && hasField("sig_algo"))
      seeds.push([{ field: "sig_algo", operator: "in", value: "SHA-1,MD5" }]);
    if (/self.?sign/.test(d) && hasField("is_self_signed"))
      seeds.push([{ field: "is_self_signed", operator: "is_true", value: "" }]);
    if (/wildcard/.test(d) && hasField("is_wildcard"))
      seeds.push([{ field: "is_wildcard", operator: "is_true", value: "" }]);
    if (/expir/.test(d) && days && hasField("expiry_days"))
      seeds.push([{ field: "expiry_days", operator: "lt", value: days }]);
    if (/(untrusted|unapproved|approved ca|not approved)/.test(d) && hasField("issuing_ca"))
      seeds.push([{ field: "issuing_ca", operator: "nin", value: "DigiCert,Sectigo,internal-Root-G2" }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe|pqc.?risk)/.test(d) && hasField("quantum_vuln"))
      seeds.push([{ field: "quantum_vuln", operator: "eq", value: "Quantum-Vulnerable" }]);
    if (/rsa/.test(d) && (bits || /\bweak\b/.test(d)) && hasField("key_bits"))
      seeds.push([
        { field: "key_type", operator: "eq", value: "RSA" },
        { field: "key_bits", operator: "lt", value: bits || "2048" },
      ]);
  } else if (policyType === "SSH Key Policy") {
    if (/dsa/.test(d) && hasField("key_type")) seeds.push([{ field: "key_type", operator: "eq", value: "DSA" }]);
    if (/rsa/.test(d) && (bits || /\bweak\b/.test(d)) && hasField("key_bits"))
      seeds.push([
        { field: "key_type", operator: "eq", value: "RSA" },
        { field: "key_bits", operator: "lt", value: bits || "2048" },
      ]);
    if (/rotat/.test(d) && days && hasField("days_since_rotation"))
      seeds.push([{ field: "days_since_rotation", operator: "gt", value: days }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe)/.test(d) && hasField("quantum_vuln"))
      seeds.push([{ field: "quantum_vuln", operator: "eq", value: "Quantum-Vulnerable" }]);
  } else if (policyType === "Secrets & Tokens Policy") {
    if (/(no expiry|without expiry|missing expiry)/.test(d) && hasField("has_expiry"))
      seeds.push([{ field: "has_expiry", operator: "is_false", value: "" }]);
    if (/rotat/.test(d) && days && hasField("days_since_rotation"))
      seeds.push([{ field: "days_since_rotation", operator: "gt", value: days }]);
  } else if (policyType === "Encryption Keys Policy") {
    if (/(no rotation|rotation disabled)/.test(d) && hasField("rotation_enabled"))
      seeds.push([{ field: "rotation_enabled", operator: "is_false", value: "" }]);
    if (/rotat/.test(d) && days && hasField("days_since_rotation"))
      seeds.push([{ field: "days_since_rotation", operator: "gt", value: days }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe)/.test(d) && hasField("quantum_vuln"))
      seeds.push([{ field: "quantum_vuln", operator: "eq", value: "Quantum-Vulnerable" }]);
  }

  if (!seeds.length) return [];

  const groupLogic: "AND" | "OR" = seeds.length > 1 ? "OR" : "AND";
  const label =
    seeds.length === 1
      ? seeds[0].map((r) => describeCondition(policyType, r)).join(" AND ")
      : seeds.map((g) => `(${g.map((r) => describeCondition(policyType, r)).join(" AND ")})`).join(" OR ");
  const confidence: Confidence = /\bweak\b/.test(d) ? "Medium" : "High";
  return [{ seeds, groupLogic, label, confidence, notes }];
}

function draftFromDescription(input: string, currentPolicyType: string): DraftResult {
  if (/\boffline\b|@@unavailable/.test(input)) return { kind: "unavailable" };

  const d = input.toLowerCase().trim();
  if (!d)
    return {
      kind: "unresolvable",
      reason: "Empty description.",
      suggestion: 'Describe what to flag, e.g. "flag SHA-1 certificates in production".',
    };

  const detectedType = detectPolicyType(d);
  const effectiveType = detectedType || currentPolicyType;
  const severity = detectSeverity(d);
  const environments = detectEnvironments(d);
  const variants = buildConditionVariants(d, effectiveType);

  // If nothing at all was inferred, unresolvable.
  if (!detectedType && !severity && !environments && !variants.length) {
    return {
      kind: "unresolvable",
      reason: `Couldn't map your description to any policy field.`,
      suggestion:
        'Try naming an asset type, a concrete field, or an environment — e.g. "flag SHA-1 certificates in production".',
    };
  }

  // Build interpretations. If condition variants are ambiguous (>1), branch per variant.
  const baseFills = (cond?: {
    seeds: { field: string; operator: string; value: string }[][];
    groupLogic: "AND" | "OR";
  }): Fills => ({
    ...(detectedType ? { policyType: detectedType } : {}),
    ...(severity ? { severity } : {}),
    ...(environments ? { environments } : {}),
    ...(cond ? { conditions: cond } : {}),
  });

  if (variants.length > 1) {
    return {
      kind: "ok",
      interpretations: variants.map((v, i) => ({
        id: `v${i}`,
        label: v.label,
        fills: baseFills({ seeds: v.seeds, groupLogic: v.groupLogic }),
        confidence: v.confidence,
        notes: v.notes,
      })),
    };
  }

  const single = variants[0];
  const partsLabel: string[] = [];
  if (detectedType) partsLabel.push(detectedType);
  if (single) partsLabel.push(single.label);
  if (environments) partsLabel.push(`scope: ${environments.join(", ")}`);
  if (severity) partsLabel.push(`severity: ${severity}`);

  return {
    kind: "ok",
    interpretations: [
      {
        id: "main",
        label: partsLabel.join(" · ") || "Suggested fill",
        fills: baseFills(single ? { seeds: single.seeds, groupLogic: single.groupLogic } : undefined),
        confidence: single ? single.confidence : "Medium",
        notes: single ? single.notes : [],
      },
    ],
  };
}

function ConfidenceChip({ level }: { level: Confidence }) {
  const cls =
    level === "High"
      ? "bg-teal/15 text-teal border-teal/40"
      : level === "Medium"
        ? "bg-amber/15 text-amber border-amber/40"
        : "bg-coral/15 text-coral border-coral/40";
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${cls}`}>{level} confidence</span>;
}

function AIMarker({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      title="Filled by AI — review and edit before saving"
      className="inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 font-semibold"
    >
      <Sparkles className="w-2 h-2" /> AI
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface OverflowItem {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}
function OverflowMenu({ items }: { items: OverflowItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1 rounded hover:bg-navy-lighter text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Row actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              className={`block w-full text-left text-[11px] px-3 py-1.5 hover:bg-muted transition-colors ${it.tone === "danger" ? "text-coral hover:bg-coral/10" : "text-foreground"}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  assetType: string;
  severity: string;
  conditionGroups: ConditionGroup[];
  groupLogic: "AND" | "OR";
  scope: ScopeConfig;
  tags: string[];
  author: string;
  uses: number;
}

const deepCloneGroups = (groups: ConditionGroup[]): ConditionGroup[] =>
  groups.map((g) => ({
    id: `grp-${Math.random().toString(36).slice(2, 8)}`,
    innerLogic: g.innerLogic,
    rows: g.rows.map((r) => ({
      id: `row-${Math.random().toString(36).slice(2, 8)}`,
      field: r.field,
      operator: r.operator,
      value: r.value,
    })),
  }));

function seedTemplates(): PolicyTemplate[] {
  const mk = (
    rows: { field: string; operator: string; value: string }[][],
    logic: "AND" | "OR" = "AND",
  ): ConditionGroup[] =>
    rows.map((g, gi) => ({
      id: `tpl-g-${gi}-${Math.random().toString(36).slice(2, 6)}`,
      innerLogic: logic === "AND" ? "AND" : "AND",
      rows: g.map((r, ri) => ({ id: `tpl-r-${gi}-${ri}-${Math.random().toString(36).slice(2, 6)}`, ...r })),
    }));
  return [
    {
      id: "tpl-pci-ssh",
      name: "PCI-DSS SSH Key Strength",
      description: "RSA keys under 2048 bits flagged as non-compliant per PCI-DSS.",
      type: "SSH Key Policy",
      assetType: "SSH Key",
      severity: "Critical",
      groupLogic: "AND",
      conditionGroups: mk([
        [
          { field: "key_type", operator: "eq", value: "RSA" },
          { field: "key_bits", operator: "lt", value: "2048" },
        ],
      ]),
      scope: { groupIds: [], environments: [], providers: [] },
      tags: ["framework:PCI-DSS"],
      author: "platform-sec",
      uses: 42,
    },
    {
      id: "tpl-nist-ssh",
      name: "NIST SSH Baseline",
      description: "Disallows DSA keys and legacy MAC algorithms (hmac-sha1, hmac-md5).",
      type: "SSH Key Policy",
      assetType: "SSH Key",
      severity: "High",
      groupLogic: "OR",
      conditionGroups: mk([
        [{ field: "key_type", operator: "eq", value: "DSA" }],
        [{ field: "mac_algo", operator: "in", value: "hmac-sha1,hmac-md5" }],
      ]),
      scope: { groupIds: [], environments: [], providers: [] },
      tags: ["framework:NIST"],
      author: "crypto-team",
      uses: 28,
    },
    {
      id: "tpl-zero-trust-tls",
      name: "Zero-Trust TLS Validity",
      description: "Production certificates must have validity ≤ 90 days.",
      type: "Certificate Policy",
      assetType: "TLS Certificate",
      severity: "High",
      groupLogic: "AND",
      conditionGroups: mk([[{ field: "validity_days", operator: "gt", value: "90" }]]),
      scope: { groupIds: [], environments: ["Production"], providers: [] },
      tags: ["framework:Zero-Trust"],
      author: "identity-eng",
      uses: 67,
    },
    {
      id: "tpl-secret-rotation",
      name: "Secret Rotation Baseline",
      description: "Flags any secret not rotated within the last 90 days.",
      type: "Secrets & Tokens Policy",
      assetType: "Secret / Token",
      severity: "High",
      groupLogic: "AND",
      conditionGroups: mk([[{ field: "days_since_rotation", operator: "gt", value: "90" }]]),
      scope: { groupIds: [], environments: [], providers: [] },
      tags: [],
      author: "platform-sec",
      uses: 31,
    },
    {
      id: "tpl-untrusted-ca",
      name: "Untrusted Issuing CA",
      description: "Flags certificates issued by CAs outside the approved issuer list.",
      type: "Certificate Policy",
      assetType: "TLS Certificate",
      severity: "High",
      groupLogic: "AND",
      conditionGroups: mk([[{ field: "issuing_ca", operator: "nin", value: "DigiCert,Sectigo,internal-Root-G2" }]]),
      scope: { groupIds: [], environments: [], providers: [] },
      tags: ["scope:internal"],
      author: "crypto-team",
      uses: 19,
    },
  ];
}

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const { activeForPolicy, setActivePolicyIds } = useExceptions();
  const [tab, setTab] = useState<"policies" | "templates" | "packs">("policies");
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(
    Object.fromEntries(policyRules.map((p) => [p.id, p.enabled])),
  );
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "Critical" | "High" | "Medium" | "Low">("all");
  const [filterPolicyType, setFilterPolicyType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "Active" | "Draft" | "Disabled">("all");
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies);
  const [detailPolicyId, setDetailPolicyId] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [importedPackIds, setImportedPackIds] = useState<Set<string>>(new Set());
  const [openPackId, setOpenPackId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PolicyTemplate[]>(() => seedTemplates());
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateDescInput, setTemplateDescInput] = useState("");

  // Create-policy modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [formPolicyType, setFormPolicyType] = useState("Certificate Policy");
  const [formFrame, setFormFrame] = useState<PolicyFrame>("classical");
  const [formProfileId, setFormProfileId] = useState<DeadlineProfileId>("NIST_IR_8547");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formSeverity, setFormSeverity] = useState("High");
  const [scope, setScope] = useState<ScopeConfig>(emptyScope());
  const [showRefine, setShowRefine] = useState(false);
  const [notify, setNotify] = useState<NotifyConfig>(emptyNotify());
  const [ticket, setTicket] = useState<TicketConfig>(emptyTicket());
  const [showNotify, setShowNotify] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState<string>("");
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState<"AND" | "OR">("AND");
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // AI assist (lives at top of modal, drafts the whole form)
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<DraftResult | null>(null);
  const [aiTouched, setAiTouched] = useState<Set<AIField>>(new Set());
  const [manuallyEdited, setManuallyEdited] = useState<Set<AIField>>(new Set());

  // Re-derive policy verdicts across the estate whenever the active set changes.
  useEffect(() => {
    const extras = userPolicies.map((p) => ({
      id: p.id,
      name: p.name,
      assetType: p.assetType,
      severity: p.severity,
      conditionGroups: p.conditionGroups as unknown as never,
      groupLogic: p.groupLogic,
      scope: p.scope,
      status: p.status,
      ticket: p.ticket,
    }));
    recomputePolicyViolations(extras as never[], policyStates);
  }, [userPolicies, policyStates]);

  // Register currently-active policy ids with the exceptions context so that
  // exceptions for deactivated policies have no effect.
  useEffect(() => {
    const activeIds = [
      ...policyRules.filter((p) => policyStates[p.id]).map((p) => p.id),
      ...userPolicies.filter((p) => (p.status || "").toLowerCase() === "active").map((p) => p.id),
    ];
    setActivePolicyIds(activeIds);
  }, [userPolicies, policyStates, setActivePolicyIds]);

  const markUserEdit = (field: AIField) => {
    setManuallyEdited((prev) => {
      const n = new Set(prev);
      n.add(field);
      return n;
    });
    setAiTouched((prev) => {
      if (!prev.has(field)) return prev;
      const n = new Set(prev);
      n.delete(field);
      return n;
    });
  };

  const resetCreateForm = () => {
    setFormPolicyType("Certificate Policy");
    setFormName("");
    setFormDescription("");
    setFormTags([]);
    setFormSeverity("High");
    setScope(emptyScope());
    setShowRefine(false);
    setNotify(emptyNotify());
    setTicket(emptyTicket());
    setShowNotify(false);
    setShowTicket(false);
    setEffectiveFrom("");
    setConditionGroups([emptyGroup()]);
    setGroupLogic("AND");
    setPreview(null);
    setEditingPolicy(null);
    setAiInput("");
    setAiResult(null);
    setAiLoading(false);
    setAiTouched(new Set());
    setManuallyEdited(new Set());
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  // Seed helpers for templates / AI
  const seedGroups = (rows: { field: string; operator: string; value: string }[][]): ConditionGroup[] =>
    rows.map((group) => ({
      id: `grp-${Math.random().toString(36).slice(2, 8)}`,
      innerLogic: "AND",
      rows: group.map((r) => ({ id: `row-${Math.random().toString(36).slice(2, 8)}`, ...r })),
    }));

  const useTemplate = (tpl: PolicyTemplate) => {
    resetCreateForm();
    setFormPolicyType(tpl.type);
    setFormName(tpl.name);
    setFormDescription(tpl.description);
    setFormSeverity(tpl.severity);
    setFormTags([...tpl.tags]);
    setConditionGroups(deepCloneGroups(tpl.conditionGroups));
    setGroupLogic(tpl.groupLogic);
    setScope({
      ...tpl.scope,
      groupIds: [...tpl.scope.groupIds],
      environments: [...tpl.scope.environments],
      providers: [...tpl.scope.providers],
    });
    setCreateOpen(true);
    setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, uses: t.uses + 1 } : t)));
  };

  const runAIDraft = () => {
    const text = aiInput.trim();
    if (!text) return;
    setAiLoading(true);
    setAiResult(null);
    setTimeout(() => {
      try {
        const result = draftFromDescription(text, formPolicyType);
        setAiResult(result);
      } catch {
        setAiResult({ kind: "unavailable" });
      }
      setAiLoading(false);
    }, 450);
  };

  const applyInterpretation = (interp: Interpretation) => {
    const touched = new Set<AIField>(aiTouched);
    const f = interp.fills;
    if (f.policyType && !manuallyEdited.has("policyType")) {
      setFormPolicyType(f.policyType);
      touched.add("policyType");
    }
    if (f.conditions && !manuallyEdited.has("conditions")) {
      setConditionGroups(seedGroups(f.conditions.seeds));
      setGroupLogic(f.conditions.groupLogic);
      touched.add("conditions");
    }
    if (f.severity && !manuallyEdited.has("severity")) {
      setFormSeverity(f.severity);
      setTicket((t) => ({
        ...t,
        snowPriority: severityToSnowPriority(f.severity!),
        jiraPriority: severityToJiraPriority(f.severity!),
      }));
      touched.add("severity");
    }
    if (f.environments && !manuallyEdited.has("environments")) {
      setScope((s) => ({ ...s, environments: f.environments! }));
      setShowRefine(true);
      touched.add("environments");
    }
    setAiTouched(touched);
    setAiResult(null);
    toast.success("Form drafted — review AI-filled fields before saving");
  };

  const hasAnyCondition = conditionGroups.some((g) => g.rows.some((r) => r.field && r.operator));

  const runPreview = () => {
    if (!hasAnyCondition) {
      toast.error("Add at least one condition first");
      return;
    }
    const at = assetTypeFor(formPolicyType);
    const base =
      at === "TLS Certificate"
        ? 18420
        : at === "SSH Key"
          ? 9650
          : at === "SSH Certificate"
            ? 2150
            : at === "Encryption Key"
              ? 3120
              : at === "Protocol / Cipher"
                ? 7800
                : at === "Code / CBOM"
                  ? 5400
                  : 4780;
    const scopeFactor =
      (scope.groupIds.length === 0 ? 1 : 0.25 + scope.groupIds.length * 0.18) *
      (scope.environments.length === 0 ? 1 : scope.environments.length / 3) *
      (scope.providers.length === 0 ? 1 : 0.4 + scope.providers.length * 0.2);
    const seed = hashStr(JSON.stringify({ at, scope, conditionGroups, groupLogic, effectiveFrom })) % 1000;
    const inScope = Math.max(8, Math.round(base * Math.min(1, scopeFactor) * (0.7 + (seed / 1000) * 0.4)));
    const nonCompliantPct = 0.05 + (seed % 19) / 100;
    const nonCompliant = Math.max(1, Math.round(inScope * nonCompliantPct));
    const excepted = Math.round(nonCompliant * 0.06);
    const compliant = Math.max(0, inScope - nonCompliant - excepted);
    const allRows = conditionGroups.flatMap((g) => g.rows.filter((r) => r.field && r.operator));
    const sampleNames =
      at === "TLS Certificate"
        ? [
            "*.payments.acmecorp.com",
            "vault.internal.acmecorp.com",
            "api.acmecorp.com",
            "mail.acmecorp.com",
            "edge-lb-01.acmecorp.com",
          ]
        : at === "SSH Key"
          ? ["prod-db-01-authorized-key", "jumpbox-east-1", "bastion-aws-prod", "ci-runner-key-22", "k8s-node-ssh-cert"]
          : at === "SSH Certificate"
            ? [
                "host-cert-prod-db-01",
                "user-cert-deploy-bot",
                "host-cert-bastion-eu",
                "user-cert-sre-oncall",
                "host-cert-k8s-ctrl-1",
              ]
            : at === "Encryption Key"
              ? ["kms-payments-master", "aws-kms-prod-rds", "azkv-prod-signer", "fortanix-hsm-root", "gcp-kms-data-eu"]
              : at === "Protocol / Cipher"
                ? ["edge-lb-01:443", "api-gw-eu:443", "legacy-app-07:443", "bastion-aws-prod:22", "vpn-gw-1:500"]
                : at === "Code / CBOM"
                  ? [
                      "payments-svc/crypto/legacy.go:42",
                      "auth-lib/jwt.ts:118",
                      "data-pipe/encrypt.py:87",
                      "mobile-app/keystore.kt:55",
                      "firmware/boot/sig.c:201",
                    ]
                  : ["stripe-api-key", "okta-svc-token", "github-deploy-key", "snowflake-readonly", "pagerduty-int"];
    const sample = sampleNames.slice(0, Math.min(5, nonCompliant)).map((name, i) => ({
      name,
      failing: describeCondition(formPolicyType, allRows[i % allRows.length]) || "condition match",
    }));
    setPreview({ inScope, compliant, nonCompliant, excepted, sample });
  };

  React.useEffect(() => {
    setPreview(null);
  }, [conditionGroups, groupLogic, scope, formPolicyType, effectiveFrom]);
  React.useEffect(() => {
    setAiResult(null);
  }, [formPolicyType]);

  const handleSave = (draft: boolean) => {
    if (!formName.trim()) {
      toast.error("Policy name is required");
      return;
    }
    const nameLc = formName.trim().toLowerCase();
    const clash =
      userPolicies.some((p) => p.id !== editingPolicy && (p.name || "").trim().toLowerCase() === nameLc) ||
      policyRules.some((p) => (p.name || "").trim().toLowerCase() === nameLc);
    if (clash) {
      toast.error("A policy with this name already exists");
      return;
    }
    if (!draft && !hasAnyCondition) {
      toast.error("Add at least one condition before activating");
      return;
    }
    if (hasAnyCondition) {
      const NO_VALUE_OPS = ["is_true", "is_false"];
      const invalidRow = conditionGroups
        .flatMap((g) => g.rows)
        .find((r) => r.field && r.operator && !NO_VALUE_OPS.includes(r.operator) && !String(r.value ?? "").trim());
      if (invalidRow) {
        toast.error("Every condition needs a value. Complete or remove the empty condition.");
        return;
      }
    }
    const summary = conditionGroups
      .map((g) =>
        g.rows
          .filter((r) => r.field && r.operator)
          .map((r) => describeCondition(formPolicyType, r))
          .filter(Boolean)
          .join(` ${g.innerLogic} `),
      )
      .filter(Boolean)
      .map((s) => `(${s})`)
      .join(` ${groupLogic} `);

    const newPolicy: CustomPolicy = {
      id: editingPolicy || `cpol-${Date.now()}`,
      name: formName,
      description: formDescription || formPolicyType,
      status: draft ? "Draft" : "Active",
      violations: 0,
      assetType: assetTypeFor(formPolicyType),
      severity: formSeverity,
      conditionGroups,
      groupLogic,
      conditionSummary: summary,
      scope: { ...scope },
      tags: [...formTags],
      notify: { ...notify },
      ticket: { ...ticket },
      effectiveFrom: effectiveFrom || null,
    };

    if (editingPolicy) setUserPolicies((prev) => prev.map((p) => (p.id === editingPolicy ? newPolicy : p)));
    else setUserPolicies((prev) => [...prev, newPolicy]);

    setCreateOpen(false);
    resetCreateForm();
    toast.success(draft ? `"${formName}" saved as draft` : `"${formName}" activated`);
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    resetCreateForm();
    setEditingPolicy(p.id);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormSeverity(p.severity || "High");
    setFormTags(p.tags || []);
    const at = p.assetType || "";
    if (at.includes("SSH Certificate")) setFormPolicyType("SSH Certificate Policy");
    else if (at.includes("SSH")) setFormPolicyType("SSH Key Policy");
    else if (at.includes("Secret") || at.includes("Token") || at.includes("API"))
      setFormPolicyType("Secrets & Tokens Policy");
    else if (at.includes("Encryption Key")) setFormPolicyType("Encryption Keys Policy");
    else if (at.includes("Protocol") || at.includes("Cipher")) setFormPolicyType("Protocol & Cipher Policy");
    else if (at.includes("CBOM") || at.includes("Code")) setFormPolicyType("Code / CBOM Policy");
    else setFormPolicyType("Certificate Policy");
    setConditionGroups(p.conditionGroups?.length ? p.conditionGroups : [emptyGroup()]);
    setGroupLogic(p.groupLogic || "AND");
    setScope(p.scope ? { ...emptyScope(), ...p.scope } : emptyScope());
    setNotify(p.notify ? { ...emptyNotify(), ...p.notify } : emptyNotify());
    setTicket(p.ticket ? { ...emptyTicket(), ...p.ticket } : emptyTicket());
    setShowNotify(!!(p.notify && p.notify.email));
    setShowTicket(!!(p.ticket && p.ticket.enabled));
    setEffectiveFrom(p.effectiveFrom || "");
    setCreateOpen(true);
  };

  const deletePolicy = (id: string) => {
    setUserPolicies((prev) => prev.filter((p) => p.id !== id));
    toast.success("Policy deleted");
  };
  const togglePolicyStatus = (id: string) => {
    setUserPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === "Active" ? "Draft" : "Active" } : p)),
    );
  };

  const filteredPolicies = policyRules
    .filter((p) => FEATURES.AI_IDENTITY || !/\bAI\b|agent/i.test(`${p.name} ${p.description}`))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  const scopeSummary = (s?: ScopeConfig) => {
    if (!s) return "All assets";
    const parts = [
      ...s.groupIds.map((gid) => mockGroups.find((g) => g.id === gid)?.name || gid),
      ...s.environments,
      ...s.providers,
    ];
    return parts.length ? parts.join(" · ") : "All assets";
  };

  const ticketBadge = (p: CustomPolicy): string => {
    if (!p.ticket || !p.ticket.enabled) return "No ticket";
    if (p.ticket.system === "servicenow") return "ServiceNow: Incident";
    if (p.ticket.system === "jira") return `Jira: ${p.ticket.projectKey || "—"}`;
    return "No ticket";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Policies</h1>
        <button
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"
        >
          <Plus className="w-3 h-3" /> Create Policy
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-border overflow-hidden bg-card">
        {(
          [
            { id: "policies", label: "Policies" },
            { id: "packs", label: "Policy Packs" },
            { id: "templates", label: "Templates" },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setTab(s.id);
              setOpenPackId(null);
            }}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${tab === s.id ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tab === "policies" &&
        (() => {
          const builtinRows = policyRules
            .filter((p) => FEATURES.AI_IDENTITY || !/\bAI\b|agent/i.test(`${p.name} ${p.description}`))
            .map((p) => ({
              source: "Built-in" as const,
              id: p.id,
              name: p.name,
              description: p.description,
              policyType: (p as { type?: string }).type || "Certificate",
              framework: (p as { framework?: string }).framework || "",
              conditionText: (p as { conditionText?: string }).conditionText || "",
              conditionGroups: (p as { conditionGroups?: ConditionGroup[] }).conditionGroups,
              groupLogic: ((p as { groupLogic?: "AND" | "OR" }).groupLogic || "AND") as "AND" | "OR",
              severity: p.severity,
              status: policyStates[p.id] ? "Enabled" : "Disabled",
              violations: p.affectedAssets,
            }));
          const customRows = userPolicies.map((p) => ({
            source: p.source || ("Custom" as const),
            id: p.id,
            name: p.name,
            description: p.description,
            policyType: p.assetType || "Certificate",
            framework: p.clauseMapping || "",
            conditionText: p.conditionSummary || "",
            conditionGroups: p.conditionGroups,
            groupLogic: (p.groupLogic || "AND") as "AND" | "OR",
            severity: p.severity || "High",
            status: p.status,
            violations: p.violations,
          }));
          const allTypes = [
            "Certificate",
            "SSH Key",
            "SSH Certificate",
            "Secrets & Tokens",
            "Encryption Keys",
            "Protocol & Cipher",
            "Library",
            "Code / CBOM",
            "Post-Quantum",
          ];
          const statusOf = (r: { source: string; status: string }) => {
            if (r.source === "Built-in") return r.status === "Enabled" ? "Active" : "Disabled";
            return r.status; // Custom: Active / Draft / Disabled
          };
          const rows = [...builtinRows, ...customRows]
            .filter((r) => filterSource === "all" || r.source === filterSource)
            .filter((r) => filterSeverity === "all" || r.severity === filterSeverity)
            .filter((r) => filterPolicyType === "all" || r.policyType === filterPolicyType)
            .filter((r) => filterStatus === "all" || statusOf(r) === filterStatus)
            .filter((r) => {
              const s = searchTerm.toLowerCase();
              return !s || r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s);
            });

          // ── visual helpers (severity color language + type icon/tint) ──
          const sevAccent: Record<string, { border: string; chip: string; text: string }> = {
            Critical: { border: "border-l-coral", chip: "bg-coral text-white", text: "text-coral" },
            High: { border: "border-l-amber", chip: "bg-amber text-white", text: "text-amber" },
            Medium: { border: "border-l-purple", chip: "bg-purple text-white", text: "text-purple" },
            Low: { border: "border-l-teal", chip: "bg-teal text-white", text: "text-teal" },
          };
          const typeMeta: Record<string, { Icon: typeof Shield; tint: string }> = {
            Certificate: { Icon: FileBadge, tint: "bg-teal/15 text-teal border-teal/30" },
            "SSH Key": { Icon: KeyRound, tint: "bg-amber/15 text-amber border-amber/30" },
            "SSH Certificate": { Icon: Shield, tint: "bg-amber/15 text-amber border-amber/30" },
            "Secrets & Tokens": { Icon: Lock, tint: "bg-purple/15 text-purple border-purple/30" },
            "Encryption Keys": { Icon: Key, tint: "bg-info/15 text-info border-info/30" },
            "Protocol & Cipher": { Icon: Network, tint: "bg-coral/15 text-coral border-coral/30" },
            "Code / CBOM": { Icon: Code2, tint: "bg-success/15 text-success border-success/30" },
            "Post-Quantum": { Icon: Atom, tint: "bg-purple/15 text-purple border-purple/30" },
          };

          const statusClass = (status: string) =>
            status === "Active" || status === "Enabled"
              ? "bg-teal/20 text-teal border border-teal/30"
              : status === "Disabled" || status === "Inactive"
                ? "bg-muted text-muted-foreground border border-border"
                : "bg-amber/20 text-amber border border-amber/30";

          const cloneBuiltinToCustom = (b: {
            name: string;
            description: string;
            severity: string;
            policyType: string;
            conditionGroups?: ConditionGroup[];
            groupLogic?: "AND" | "OR";
          }) => {
            resetCreateForm();
            const pt =
              b.policyType === "SSH Key"
                ? "SSH Key Policy"
                : b.policyType === "SSH Certificate"
                  ? "SSH Certificate Policy"
                  : b.policyType === "Secrets & Tokens"
                    ? "Secrets & Tokens Policy"
                    : b.policyType === "Encryption Keys"
                      ? "Encryption Keys Policy"
                      : b.policyType === "Protocol & Cipher"
                        ? "Protocol & Cipher Policy"
                        : b.policyType === "Code / CBOM"
                          ? "Code / CBOM Policy"
                          : "Certificate Policy";
            setFormPolicyType(pt);
            setFormName(`${b.name} (Custom)`);
            setFormDescription(b.description);
            setFormSeverity(b.severity);
            setConditionGroups(b.conditionGroups?.length ? deepCloneGroups(b.conditionGroups) : [emptyGroup()]);
            setGroupLogic(b.groupLogic || "AND");
            setCreateOpen(true);
          };

          const cloneCustom = (src: CustomPolicy) => {
            resetCreateForm();
            const at = src.assetType || "";
            const pt = at.includes("SSH Certificate")
              ? "SSH Certificate Policy"
              : at.includes("SSH")
                ? "SSH Key Policy"
                : at.includes("Encryption Key")
                  ? "Encryption Keys Policy"
                  : at.includes("Protocol") || at.includes("Cipher")
                    ? "Protocol & Cipher Policy"
                    : at.includes("CBOM") || at.includes("Code")
                      ? "Code / CBOM Policy"
                      : at.includes("Secret") || at.includes("Token") || at.includes("API")
                        ? "Secrets & Tokens Policy"
                        : "Certificate Policy";
            setFormPolicyType(pt);
            setFormName(`${src.name} (Copy)`);
            setFormDescription(src.description);
            setFormSeverity(src.severity || "High");
            setFormTags([...(src.tags || [])]);
            setConditionGroups(src.conditionGroups?.length ? deepCloneGroups(src.conditionGroups) : [emptyGroup()]);
            setGroupLogic(src.groupLogic || "AND");
            setScope(
              src.scope
                ? {
                    groupIds: [...src.scope.groupIds],
                    environments: [...src.scope.environments],
                    providers: [...src.scope.providers],
                  }
                : emptyScope(),
            );
            setNotify(src.notify ? { ...src.notify } : emptyNotify());
            setTicket(src.ticket ? { ...src.ticket } : emptyTicket());
            setShowNotify(!!(src.notify && src.notify.email));
            setShowTicket(!!(src.ticket && src.ticket.enabled));
            setCreateOpen(true);
          };

          const saveCustomAsTemplate = (src: CustomPolicy) => {
            const at = src.assetType || "Certificate";
            const pt = at.includes("SSH Certificate")
              ? "SSH Certificate Policy"
              : at.includes("SSH")
                ? "SSH Key Policy"
                : at.includes("Encryption Key")
                  ? "Encryption Keys Policy"
                  : at.includes("Protocol") || at.includes("Cipher")
                    ? "Protocol & Cipher Policy"
                    : at.includes("CBOM") || at.includes("Code")
                      ? "Code / CBOM Policy"
                      : at.includes("Secret") || at.includes("Token") || at.includes("API")
                        ? "Secrets & Tokens Policy"
                        : "Certificate Policy";
            const tpl: PolicyTemplate = {
              id: `tpl-${Date.now()}`,
              name: src.name,
              description: src.description || "",
              type: pt,
              assetType: at,
              severity: src.severity || "High",
              conditionGroups: src.conditionGroups?.length ? deepCloneGroups(src.conditionGroups) : [emptyGroup()],
              groupLogic: src.groupLogic || "AND",
              scope: src.scope
                ? {
                    groupIds: [...src.scope.groupIds],
                    environments: [...src.scope.environments],
                    providers: [...src.scope.providers],
                  }
                : emptyScope(),
              tags: [...(src.tags || [])],
              author: "you",
              uses: 0,
            };
            setTemplates((prev) => [tpl, ...prev]);
            toast.success(`"${src.name}" saved as template`);
          };

          const resetFilters = () => {
            setSearchTerm("");
            setFilterSource("all");
            setFilterSeverity("all");
            setFilterPolicyType("all");
            setFilterStatus("all");
          };
          const hasActiveFilter =
            !!searchTerm ||
            filterSource !== "all" ||
            filterSeverity !== "all" ||
            filterPolicyType !== "all" ||
            filterStatus !== "all";

          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search policies..."
                    className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                </div>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="border border-border rounded-lg px-2 py-2 text-xs bg-card"
                >
                  <option value="all">Source: All</option>
                  <option value="Built-in">Built-in</option>
                  <option value="Custom">Custom</option>
                  {POLICY_PACKS.filter((pk) => importedPackIds.has(pk.id)).map((pk) => (
                    <option key={pk.id} value={`Pack: ${pk.name}`}>{`Pack: ${pk.name}`}</option>
                  ))}
                </select>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
                  className="border border-border rounded-lg px-2 py-2 text-xs bg-card"
                >
                  <option value="all">Severity: All</option>
                  {["Critical", "High", "Medium", "Low"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPolicyType}
                  onChange={(e) => setFilterPolicyType(e.target.value)}
                  className="border border-border rounded-lg px-2 py-2 text-xs bg-card"
                >
                  <option value="all">Policy Type: All</option>
                  {allTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="border border-border rounded-lg px-2 py-2 text-xs bg-card"
                >
                  <option value="all">Status: All</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Disabled">Disabled</option>
                </select>
                {hasActiveFilter && (
                  <button
                    onClick={resetFilters}
                    className="text-[10px] px-2 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="bg-card/40 rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-navy/60 border-b border-border">
                    <tr>
                      <th className="w-1" />
                      {["Source", "Policy", "Type", "Severity", "Status", "Violations", "Enabled", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 font-semibold text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 px-3 text-center text-muted-foreground">
                          <div className="text-xs">No policies match the current filters.</div>
                          {hasActiveFilter && (
                            <button onClick={resetFilters} className="mt-2 text-[11px] text-teal hover:underline">
                              Reset filters
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => {
                      const isCustom = r.source === "Custom";
                      const customPol = isCustom ? userPolicies.find((p) => p.id === r.id) : undefined;
                      const sev = sevAccent[r.severity] || sevAccent.Medium;
                      const tm = typeMeta[r.policyType] || typeMeta["Certificate"];
                      const TIcon = tm.Icon;
                      const enabled = isCustom ? customPol?.status === "Active" : policyStates[r.id];
                      const toggle = () => {
                        if (isCustom) togglePolicyStatus(r.id);
                        else {
                          setPolicyStates((prev) => ({ ...prev, [r.id]: !prev[r.id] }));
                          toast.success(`Policy ${policyStates[r.id] ? "disabled" : "enabled"}`);
                        }
                      };
                      return (
                        <tr
                          key={`${r.source}-${r.id}`}
                          onClick={() => setDetailPolicyId(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDetailPolicyId(r.id);
                            }
                          }}
                          tabIndex={0}
                          className={`group border-b border-border/60 cursor-pointer transition-all bg-navy-light/40 hover:bg-navy-lighter/60 hover:shadow-[inset_2px_0_0_0_hsl(var(--teal))] border-l-[3px] ${sev.border} focus:outline-none focus:ring-1 focus:ring-teal/40`}
                        >
                          <td className="w-1 p-0" />
                          <td className="py-3 px-3">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${r.source === "Built-in" ? "bg-purple/15 text-purple border border-purple/30" : "bg-teal/15 text-teal border border-teal/30"}`}
                            >
                              {r.source}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-md">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {r.name}
                              <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{r.description}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${tm.tint}`}
                            >
                              <TIcon className="w-3 h-3" />
                              {r.policyType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sev.chip}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass(r.status)}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {r.violations > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilters({ policy: r.name });
                                  setCurrentPage("inventory");
                                }}
                                className={`font-bold tabular-nums hover:underline ${sev.text}`}
                              >
                                {r.violations.toLocaleString()}
                              </button>
                            ) : (
                              <span className="text-success/70 font-medium tabular-nums">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={toggle}
                              className={`w-8 h-4 rounded-full transition-colors relative ${enabled ? "bg-teal" : "bg-muted"}`}
                              title={enabled ? "Disable" : "Enable"}
                            >
                              <div
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
                              />
                            </button>
                          </td>
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <OverflowMenu
                              items={
                                isCustom && customPol
                                  ? [
                                      { label: "Edit", onClick: () => loadPolicyForEdit(customPol) },
                                      { label: "Clone", onClick: () => cloneCustom(customPol) },
                                      { label: "Save as template", onClick: () => saveCustomAsTemplate(customPol) },
                                      {
                                        label: customPol.status === "Active" ? "Deactivate" : "Activate",
                                        onClick: () => togglePolicyStatus(r.id),
                                      },
                                      { label: "Delete", onClick: () => deletePolicy(r.id), tone: "danger" as const },
                                    ]
                                  : [{ label: "Clone to customize", onClick: () => cloneBuiltinToCustom(r) }]
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Detail popup */}
              {(() => {
                if (!detailPolicyId) return null;
                const row = rows.find((r) => r.id === detailPolicyId);
                if (!row) return null;
                const isCustom = row.source === "Custom";
                const customPol = isCustom ? userPolicies.find((p) => p.id === row.id) : undefined;
                const sev = sevAccent[row.severity] || sevAccent.Medium;
                return (
                  <Modal open={!!detailPolicyId} onClose={() => setDetailPolicyId(null)} title={row.name} wide>
                    <div className="w-full max-w-2xl space-y-4 text-foreground">
                      <div className={sectionCardCls + ` border-l-[3px] ${sev.border}`}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${row.source === "Built-in" ? "bg-purple/15 text-purple border border-purple/30" : "bg-teal/15 text-teal border border-teal/30"}`}
                          >
                            {row.source}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sev.chip}`}>
                            {row.severity}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass(row.status)}`}
                          >
                            {row.status}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md border bg-card text-muted-foreground border-border">
                            {row.policyType}
                          </span>
                        </div>
                        {row.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{row.description}</p>
                        )}
                      </div>

                      <div className={sectionCardCls}>
                        <SectionHeading
                          label="Condition (read-only)"
                          info="The rule evaluated against discovered assets."
                          accent="teal"
                        />
                        <code className="text-xs font-mono text-foreground break-words block bg-navy/60 border border-border rounded px-2 py-1.5">
                          {row.conditionText || customPol?.conditionSummary || "—"}
                        </code>
                      </div>

                      {!isCustom && (
                        <div className={sectionCardCls}>
                          <SectionHeading
                            label="Framework reference"
                            info="Standard or regulation this policy implements."
                            accent="purple"
                          />
                          <div className="text-xs font-medium text-foreground">{row.framework || "—"}</div>
                          <div className="text-[10px] text-muted-foreground italic mt-2">
                            Built-in policies are read-only. Use "Clone to customize" to author a variation.
                          </div>
                        </div>
                      )}

                      {isCustom && customPol && (
                        <div className={sectionCardCls}>
                          <SectionHeading
                            label="Scope & delivery"
                            info="Where this policy applies and how violations are routed."
                            accent="purple"
                          />
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">
                                Asset Type
                              </span>
                              <span className="font-medium">{customPol.assetType || "All"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">
                                Scope
                              </span>
                              <span className="font-medium">{scopeSummary(customPol.scope)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">
                                Ticket
                              </span>
                              <span className="font-medium">{ticketBadge(customPol)}</span>
                            </div>
                            {customPol.effectiveFrom && (
                              <div>
                                <span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">
                                  Effective from
                                </span>
                                <span className="font-medium">{customPol.effectiveFrom}</span>
                              </div>
                            )}
                          </div>
                          {customPol.tags && customPol.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {customPol.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={sectionCardCls}>
                        <SectionHeading
                          label={`Exceptions (${activeForPolicy(row.id).length} excepted objects)`}
                          info="Crypto objects exempt from this policy with a justification and expiry."
                          accent="amber"
                        />
                        <ExceptionsList scope={{ kind: "policy", id: row.id }} />
                      </div>

                      <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-border bg-card/95 backdrop-blur px-4 py-3 flex justify-end gap-2">
                        <button
                          onClick={() => setDetailPolicyId(null)}
                          className="px-4 py-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Close
                        </button>
                        {!isCustom && (
                          <button
                            onClick={() => {
                              cloneBuiltinToCustom(row);
                              setDetailPolicyId(null);
                            }}
                            className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal text-primary-foreground hover:bg-teal-light shadow-[0_4px_14px_-4px_hsl(var(--teal)/0.5)] transition-colors"
                          >
                            Clone to customize
                          </button>
                        )}
                        {isCustom && customPol && (
                          <>
                            <button
                              onClick={() => {
                                saveCustomAsTemplate(customPol);
                              }}
                              className="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30"
                            >
                              Save as template
                            </button>
                            <button
                              onClick={() => {
                                cloneCustom(customPol);
                                setDetailPolicyId(null);
                              }}
                              className="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30"
                            >
                              Clone
                            </button>
                            <button
                              onClick={() => togglePolicyStatus(customPol.id)}
                              className="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30"
                            >
                              {customPol.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                deletePolicy(customPol.id);
                                setDetailPolicyId(null);
                              }}
                              className="px-4 py-2 text-xs rounded-lg border border-coral/40 text-coral hover:bg-coral/10"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                loadPolicyForEdit(customPol);
                                setDetailPolicyId(null);
                              }}
                              className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal text-primary-foreground hover:bg-teal-light shadow-[0_4px_14px_-4px_hsl(var(--teal)/0.5)]"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Modal>
                );
              })()}
            </div>
          );
        })()}

      {tab === "packs" &&
        (() => {
          const sevChip: Record<string, string> = {
            Critical: "bg-coral text-white",
            High: "bg-amber text-white",
            Medium: "bg-purple text-white",
            Low: "bg-teal text-white",
          };
          const typeTint: Record<string, string> = {
            Certificate: "bg-teal/15 text-teal border-teal/30",
            "SSH Key": "bg-amber/15 text-amber border-amber/30",
            "SSH Certificate": "bg-amber/15 text-amber border-amber/30",
            "Secrets & Tokens": "bg-purple/15 text-purple border-purple/30",
            "Encryption Keys": "bg-info/15 text-info border-info/30",
            "Protocol & Cipher": "bg-coral/15 text-coral border-coral/30",
            "Post-Quantum": "bg-purple/15 text-purple border-purple/30",
          };

          const importPack = (pack: PolicyPack) => {
            if (importedPackIds.has(pack.id)) return;
            const sourceTag = `Pack: ${pack.name}`;
            const stamp = Date.now();
            const newPolicies: CustomPolicy[] = pack.policies.map((pp, i) => ({
              id: `pack-${pack.id}-${pp.key}-${stamp}-${i}`,
              name: pp.name,
              description: pp.clause,
              // Pack policies import disabled; admin activates after review.
              // Advisory policies stay Draft (off); mandatory policies are also Draft
              // until the admin activates the pack, then they become Active.
              status: "Draft",
              violations: 0,
              assetType: packTypeToAssetType(pp.type),
              severity: pp.severity,
              conditionSummary: pp.condition,
              tags: [
                `pack:${pack.name}`,
                ...(pp.advisory ? ["advisory"] : []),
                ...(pp.reusesBuiltin ? [`reuses:${pp.reusesBuiltin}`] : []),
              ],
              source: sourceTag,
              packId: pack.id,
              advisory: !!pp.advisory,
              clauseMapping: pp.clause,
              reusesBuiltin: pp.reusesBuiltin,
            }));
            setUserPolicies((prev) => [...prev, ...newPolicies]);
            setImportedPackIds((prev) => {
              const n = new Set(prev);
              n.add(pack.id);
              return n;
            });
            const mandatory = pack.policies.filter((p) => !p.advisory).length;
            const advisory = pack.policies.length - mandatory;
            const reused = pack.policies.filter((p) => p.reusesBuiltin).length;
            toast.success(
              `Imported "${pack.name}" — ${pack.policies.length} policies created as Draft (${mandatory} mandatory, ${advisory} advisory${reused ? `, ${reused} reuse built-in conditions` : ""}). Activate from the Policies tab.`,
            );
          };

          const activatePack = (pack: PolicyPack) => {
            setUserPolicies((prev) =>
              prev.map((p) => {
                if (p.packId !== pack.id) return p;
                // Mandatory policies → Active; advisory stay Draft (admin opts in per spec).
                if (p.advisory) return p;
                return { ...p, status: "Active" };
              }),
            );
            toast.success(
              `Activated mandatory policies in "${pack.name}". Advisory policies remain Draft — enable individually.`,
            );
          };

          const removePack = (pack: PolicyPack) => {
            setUserPolicies((prev) => prev.filter((p) => p.packId !== pack.id));
            setImportedPackIds((prev) => {
              const n = new Set(prev);
              n.delete(pack.id);
              return n;
            });
            toast.success(`Removed "${pack.name}" — ${pack.policies.length} pack policies deleted.`);
          };

          // ── Pack detail view ──
          if (openPackId) {
            const pack = POLICY_PACKS.find((p) => p.id === openPackId);
            if (!pack) {
              setOpenPackId(null);
              return null;
            }
            const imported = importedPackIds.has(pack.id);
            return (
              <div className="space-y-4">
                <button
                  onClick={() => setOpenPackId(null)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-3 h-3" /> Back to packs
                </button>
                <div className="rounded-xl border border-border bg-gradient-to-br from-card via-card to-navy/40 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-teal/15 border border-teal/30 flex items-center justify-center text-teal font-bold text-sm tracking-wide shrink-0">
                      {pack.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-foreground">{pack.name}</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple/15 text-purple border border-purple/30">
                          {pack.region}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/30">
                          {pack.industry}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {pack.policies.length} policies
                        </span>
                        {imported && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Imported
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{pack.description}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-2">
                        <span className="font-semibold text-foreground/80">Basis:</span> {pack.basis}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {!imported ? (
                        <button
                          onClick={() => importPack(pack)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light"
                        >
                          <Plus className="w-3 h-3" /> Import pack
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => activatePack(pack)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Activate mandatory
                          </button>
                          <button
                            onClick={() => {
                              setTab("policies");
                              setFilterSource(`Pack: ${pack.name}`);
                              setOpenPackId(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:border-foreground/30"
                          >
                            Manage in Policies
                          </button>
                          <button
                            onClick={() => removePack(pack)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-coral/40 text-coral text-xs font-medium hover:bg-coral/10"
                          >
                            Remove pack
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-card/40 rounded-xl border border-border overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-navy/60 border-b border-border">
                      <tr>
                        {["#", "Policy", "Type", "Severity", "Source", "Regulation clause"].map((h) => (
                          <th
                            key={h}
                            className="text-left py-2.5 px-3 font-semibold text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pack.policies.map((pp) => (
                        <tr key={pp.key} className="border-b border-border/60 hover:bg-navy-lighter/40">
                          <td className="py-3 px-3 text-muted-foreground tabular-nums">{pp.key}</td>
                          <td className="py-3 px-3 max-w-md">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {pp.name}
                              {pp.advisory && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30 font-semibold uppercase tracking-wide">
                                  Advisory
                                </span>
                              )}
                            </div>
                            <code className="text-[10px] font-mono text-muted-foreground break-words mt-0.5 block">
                              {pp.condition}
                            </code>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md border ${typeTint[pp.type] || "bg-muted text-muted-foreground border-border"}`}
                            >
                              {pp.type}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sevChip[pp.severity]}`}>
                              {pp.severity}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {pp.reusesBuiltin ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-teal"
                                title={`Reuses built-in policy ${pp.reusesBuiltin}`}
                              >
                                <Link2 className="w-3 h-3" /> Reuses built-in
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Pack-specific</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[10px] text-muted-foreground leading-snug">{pp.clause}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-muted-foreground italic">
                  <span className="font-semibold text-foreground/80">
                    Out of pack scope (not evaluable from discovery):
                  </span>{" "}
                  {pack.outOfScope}
                </div>
              </div>
            );
          }

          // ── Pack grid ──
          return (
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground">
                Regulation-aligned bundles you can import as a managed compliance program. Importing creates the pack's
                policies as Draft — admin reviews then activates.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POLICY_PACKS.map((pack) => {
                  const imported = importedPackIds.has(pack.id);
                  const mandatory = pack.policies.filter((p) => !p.advisory).length;
                  const advisory = pack.policies.length - mandatory;
                  return (
                    <div
                      key={pack.id}
                      className="rounded-xl border border-border bg-card/60 hover:border-teal/40 hover:shadow-[0_0_24px_-12px_hsl(var(--teal)/0.5)] transition-all p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal/15 border border-teal/30 flex items-center justify-center text-teal font-bold text-sm tracking-wide shrink-0">
                          {pack.initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground">{pack.name}</h3>
                            {imported && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Imported
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {pack.description}
                          </p>
                        </div>
                        <Package className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-purple/15 text-purple border border-purple/30">
                          {pack.region}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/30">
                          {pack.industry}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {pack.policies.length} policies · {mandatory} mandatory
                          {advisory ? ` · ${advisory} advisory` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 mt-auto">
                        <button
                          onClick={() => setOpenPackId(pack.id)}
                          className="flex-1 text-[11px] px-3 py-1.5 rounded border border-border hover:border-foreground/30 text-foreground"
                        >
                          View policies
                        </button>
                        {imported ? (
                          <button
                            onClick={() => {
                              setTab("policies");
                              setFilterSource(`Pack: ${pack.name}`);
                            }}
                            className="flex-1 text-[11px] px-3 py-1.5 rounded bg-card border border-teal/40 text-teal hover:bg-teal/10"
                          >
                            Manage
                          </button>
                        ) : (
                          <button
                            onClick={() => importPack(pack)}
                            className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-3 py-1.5 rounded bg-teal text-primary-foreground font-medium hover:bg-teal-light"
                          >
                            <Plus className="w-3 h-3" /> Import pack
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {tab === "templates" && (
        <div className="space-y-2">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  {["Template", "Type", "Description", "Saved By", "Times Used", "Action"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-3 text-center text-muted-foreground text-xs">
                      No templates yet. Use "Save as Template" from Create Policy to add one.
                    </td>
                  </tr>
                )}
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold">{t.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.assetType}</td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-md">{t.description}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.author}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.uses}</td>
                    <td className="py-2.5 px-3 flex gap-1">
                      <button
                        onClick={() => useTemplate(t)}
                        className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20"
                      >
                        Use template
                      </button>
                      <button
                        onClick={() => {
                          setTemplates((prev) => prev.filter((x) => x.id !== t.id));
                          toast.success("Template deleted");
                        }}
                        className="text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-coral hover:bg-coral/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Policy modal */}
      <Modal open={createOpen} onClose={closeCreateModal} title={editingPolicy ? "Edit Policy" : "Create Policy"} wide>
        <div className="w-full max-w-2xl space-y-5 text-foreground">
          {/* 0. AI authoring (top, above everything) */}
          <div className="space-y-2 rounded-xl border border-teal/40 bg-gradient-to-br from-teal/10 via-purple/5 to-transparent p-4 shadow-[0_0_24px_-12px_hsl(var(--teal)/0.4)]">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal" />
              <label className="block text-[11px] font-semibold text-foreground tracking-wide uppercase">
                AI policy author
              </label>
              <InfoIcon text="AI fills the form below from your description. Review and edit before saving. AI never activates a policy." />
            </div>
            <div className="flex items-center gap-2 border border-teal/40 rounded-lg p-2 bg-card/80 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-teal shrink-0" />
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runAIDraft();
                  }
                }}
                placeholder='Describe in plain English — e.g. "flag production RSA certs under 2048 bits"'
                className="flex-1 min-w-0 bg-transparent text-[11px] outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={runAIDraft}
                disabled={!aiInput.trim() || aiLoading}
                className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-teal text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Sparkles className={`w-3 h-3 ${aiLoading ? "animate-spin" : ""}`} />
                {aiLoading ? "Drafting…" : "Generate"}
              </button>
            </div>

            {aiResult?.kind === "unavailable" && (
              <div className="text-[10px] text-amber border border-amber/30 bg-amber/5 rounded px-2 py-1.5">
                AI assist temporarily unavailable. You can still fill in the form manually below.
              </div>
            )}
            {aiResult?.kind === "unresolvable" && (
              <div className="text-[10px] border border-coral/30 bg-coral/5 rounded px-2 py-1.5 space-y-1">
                <div className="text-coral font-medium">{aiResult.reason}</div>
                <div className="text-muted-foreground">Try: {aiResult.suggestion}</div>
              </div>
            )}
            {aiResult?.kind === "ok" && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground">
                  {aiResult.interpretations.length > 1
                    ? "Your description is ambiguous. Pick an interpretation to fill the form:"
                    : "Suggested fill — click to apply to the form:"}
                </div>
                {aiResult.interpretations.map((interp) => {
                  const f = interp.fills;
                  const fillSummary: string[] = [];
                  if (f.policyType) fillSummary.push(`Type: ${f.policyType}`);
                  if (f.conditions)
                    fillSummary.push(
                      `Conditions: ${f.conditions.seeds.map((g) => `(${g.map((r) => describeCondition(f.policyType || formPolicyType, r)).join(" AND ")})`).join(` ${f.conditions.groupLogic} `)}`,
                    );
                  if (f.environments) fillSummary.push(`Scope: ${f.environments.join(", ")}`);
                  if (f.severity) fillSummary.push(`Severity: ${f.severity}`);
                  return (
                    <button
                      key={interp.id}
                      type="button"
                      onClick={() => applyInterpretation(interp)}
                      className="w-full text-left border border-border rounded-lg px-2.5 py-2 bg-card hover:border-teal/50 hover:bg-teal/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-medium text-foreground">{interp.label}</span>
                        <ConfidenceChip level={interp.confidence} />
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground break-words">
                        {fillSummary.join(" · ")}
                      </div>
                      {interp.notes.length > 0 && (
                        <div className="text-[9px] text-muted-foreground/80 mt-1 italic">
                          {interp.notes.join(" · ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                or fill in the form manually below
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>

          {/* 1. Identity */}
          <div className={sectionCardCls}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_0_3px_hsl(var(--card))]" />
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                Policy Identity
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-[11px] font-medium">Policy Type*</label>
                    <AIMarker show={aiTouched.has("policyType")} />
                  </div>
                  <select
                    value={formPolicyType}
                    onChange={(e) => {
                      setFormPolicyType(e.target.value);
                      setConditionGroups([emptyGroup()]);
                      markUserEdit("policyType");
                      markUserEdit("conditions");
                    }}
                    className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
                  >
                    {POLICY_TYPES.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="block text-[11px] font-medium">Severity*</label>
                    <InfoIcon text="Sets risk weighting for this policy and, when a ticket is created, the default ticket priority." />
                    <AIMarker show={aiTouched.has("severity")} />
                  </div>
                  <select
                    value={formSeverity}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormSeverity(v);
                      setTicket((t) => ({
                        ...t,
                        snowPriority: severityToSnowPriority(v),
                        jiraPriority: severityToJiraPriority(v),
                      }));
                      markUserEdit("severity");
                    }}
                    className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
                  >
                    {["Critical", "High", "Medium", "Low"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-[11px] font-medium">Tags (optional)</label>
                  <InfoIcon text="Free-form key:value tags for categorization, e.g. framework:PCI-DSS, owner:platform-sec. Type and press Enter." />
                </div>
                <ChipInput values={formTags} onChange={setFormTags} placeholder="e.g. framework:PCI-DSS" />
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">Policy Name*</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. PCI-DSS SSH Key Strength — Production"
                  className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium mb-1">Description (optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Short description shown on the policy card"
                  className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 2. Conditions */}
          <div className={sectionCardCls}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_0_3px_hsl(var(--card))]" />
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Conditions</p>
              <InfoIcon text="Flag an asset as Non-Compliant when these conditions match. Combine rows inside a group with AND/OR, and combine groups with AND/OR." />
              <AIMarker show={aiTouched.has("conditions")} />
            </div>

            <ConditionBuilder
              policyType={formPolicyType}
              groups={conditionGroups}
              groupLogic={groupLogic}
              onChange={(g) => {
                setConditionGroups(g);
                markUserEdit("conditions");
              }}
              onGroupLogicChange={(l) => {
                setGroupLogic(l);
                markUserEdit("conditions");
              }}
            />
          </div>

          {/* 3. Scope */}
          <div className={sectionCardCls}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-purple shadow-[0_0_0_3px_hsl(var(--card))]" />
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Scope</p>
              <InfoIcon text="Optional. Narrow where this policy applies. Empty = evaluate all assets of this type. Groups are OR; attribute refinement is AND across dimensions, OR within a dimension." />
              <AIMarker show={aiTouched.has("environments")} />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium mb-1.5">Asset Groups</label>
                <select
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && !scope.groupIds.includes(v)) setScope((s) => ({ ...s, groupIds: [...s.groupIds, v] }));
                    e.target.value = "";
                  }}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
                >
                  <option value="">Add an Asset Group…</option>
                  {mockGroups
                    .filter((g) => !scope.groupIds.includes(g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
                <TagChips
                  values={scope.groupIds.map((id) => ({ id, label: mockGroups.find((g) => g.id === id)?.name || id }))}
                  onRemove={(id) => setScope((s) => ({ ...s, groupIds: s.groupIds.filter((x) => x !== id) }))}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowRefine((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-teal font-medium px-2 py-1 -mx-2 rounded hover:bg-teal/10 transition-colors"
              >
                {showRefine ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Refine by attribute
              </button>
              {showRefine && (
                <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-purple/40">
                  <ChipMulti
                    label="Environment"
                    options={ENV_OPTIONS}
                    values={scope.environments}
                    onChange={(v) => {
                      setScope((s) => ({ ...s, environments: v }));
                      markUserEdit("environments");
                    }}
                  />
                  <ChipMulti
                    label="Cloud Provider"
                    options={CLOUD_OPTIONS}
                    values={scope.providers}
                    onChange={(v) => setScope((s) => ({ ...s, providers: v }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 5. On Violation */}
          <div className={sectionCardCls}>
            <SectionHeading
              label="On Violation"
              info="Matched assets are flagged Non-Compliant. Optionally notify by email and/or open a ticket. Custom policies never block or remediate."
              accent="coral"
            />

            {/* Notification */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowNotify((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-card/40 hover:bg-muted/30"
              >
                <span className="text-[11px] font-medium">Notification (Email)</span>
                {showNotify ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
              {showNotify && (
                <div className="p-3 space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Recipients</label>
                    <input
                      value={notify.email}
                      onChange={(e) => setNotify((n) => ({ ...n, email: e.target.value }))}
                      placeholder="security@acme.com, crypto-team@acme.com"
                      className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={notify.onNewViolation}
                      onChange={(e) => setNotify((n) => ({ ...n, onNewViolation: e.target.checked }))}
                      className="rounded"
                    />
                    Notify on new violation
                  </label>
                </div>
              )}
            </div>

            {/* Ticket */}
            <div className="border border-border rounded-lg overflow-hidden mt-2">
              <div className="w-full flex items-center justify-between px-3 py-2 bg-card/40">
                <button
                  type="button"
                  onClick={() => setShowTicket((v) => !v)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <span className="text-[11px] font-medium">Create a ticket</span>
                  <InfoIcon text="When enabled, each new violation opens a ticket. Priority defaults from policy Severity and can be overridden." />
                </button>
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{ticket.enabled ? "On" : "Off"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTicket((t) => ({ ...t, enabled: !t.enabled }));
                      if (!ticket.enabled) setShowTicket(true);
                    }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${ticket.enabled ? "bg-teal" : "bg-muted"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${ticket.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </button>
                  {showTicket ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </label>
              </div>
              {showTicket && ticket.enabled && (
                <div className="p-3 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5">Ticketing system</label>
                    <div className="inline-flex rounded-md border border-border overflow-hidden">
                      {(["servicenow", "jira"] as TicketSystem[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTicket((t) => ({ ...t, system: s }))}
                          className={`px-3 py-1 text-[11px] ${ticket.system === s ? "bg-teal text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                        >
                          {s === "servicenow" ? "ServiceNow" : "Jira"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ticket.system === "servicenow" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Record type</label>
                        <input
                          value="Incident"
                          disabled
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted text-muted-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Assignment group</label>
                        <input
                          value={ticket.assignmentGroup || ""}
                          onChange={(e) => setTicket((t) => ({ ...t, assignmentGroup: e.target.value }))}
                          placeholder="e.g. Crypto-Security"
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Priority</label>
                        <select
                          value={ticket.snowPriority || "2-High"}
                          onChange={(e) =>
                            setTicket((t) => ({ ...t, snowPriority: e.target.value as TicketConfig["snowPriority"] }))
                          }
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                        >
                          {["1-Critical", "2-High", "3-Moderate", "4-Low"].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {ticket.system === "jira" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Project key</label>
                        <input
                          value={ticket.projectKey || ""}
                          onChange={(e) => setTicket((t) => ({ ...t, projectKey: e.target.value.toUpperCase() }))}
                          placeholder="e.g. SEC"
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Issue type</label>
                        <select
                          value={ticket.issueType || "Task"}
                          onChange={(e) => setTicket((t) => ({ ...t, issueType: e.target.value as "Task" | "Bug" }))}
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                        >
                          {["Task", "Bug"].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Priority</label>
                        <select
                          value={ticket.jiraPriority || "High"}
                          onChange={(e) =>
                            setTicket((t) => ({ ...t, jiraPriority: e.target.value as TicketConfig["jiraPriority"] }))
                          }
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                        >
                          {["Highest", "High", "Medium", "Low"].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. Effective from */}
          <div className={sectionCardCls}>
            <SectionHeading
              label="Effective from"
              info="Optional. Empty = evaluate all existing assets immediately (may flag many legacy assets). Set a date to only evaluate assets created or changed on or after that date."
              accent="purple"
            />
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
            />
          </div>

          {/* 7. Preview */}
          <div className={sectionCardCls}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_0_3px_hsl(var(--card))]" />
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                  Impact Preview
                </p>
                <InfoIcon text="Dry-run against Inventory. Writes nothing, sends nothing." />
              </div>
              <button
                type="button"
                onClick={runPreview}
                disabled={!hasAnyCondition}
                className="text-[10px] px-3 py-1.5 rounded-md bg-teal/10 text-teal hover:bg-teal/20 border border-teal/20 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Run preview
              </button>
            </div>
            {!preview && (
              <p className="text-[11px] text-muted-foreground">Add a condition and run preview to see impact.</p>
            )}
            {preview && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  <div className="border border-border rounded-lg p-2 bg-card">
                    <div className="text-muted-foreground text-[9px] uppercase tracking-wide">In Scope</div>
                    <div className="font-semibold mt-0.5">{preview.inScope.toLocaleString()}</div>
                  </div>
                  <div className="border border-border rounded-lg p-2 bg-card">
                    <div className="text-muted-foreground text-[9px] uppercase tracking-wide">Compliant</div>
                    <div className="font-semibold mt-0.5 text-teal">{preview.compliant.toLocaleString()}</div>
                  </div>
                  <div className="border border-border rounded-lg p-2 bg-card">
                    <div className="text-muted-foreground text-[9px] uppercase tracking-wide">Non-Compliant</div>
                    <div className="font-semibold mt-0.5 text-coral">{preview.nonCompliant.toLocaleString()}</div>
                  </div>
                  <div className="border border-border rounded-lg p-2 bg-card">
                    <div className="text-muted-foreground text-[9px] uppercase tracking-wide">Excepted</div>
                    <div className="font-semibold mt-0.5 text-muted-foreground">
                      {preview.excepted.toLocaleString()}
                    </div>
                  </div>
                </div>
                {preview.sample.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Sample of assets that would be flagged:</p>
                    <ul className="text-[10px] font-mono bg-muted/40 border border-border rounded-lg px-2 py-1.5 space-y-0.5">
                      {preview.sample.map((s, i) => (
                        <li key={i}>
                          <span className="text-foreground">{s.name}</span>{" "}
                          <span className="text-muted-foreground">— {s.failing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-border bg-card/95 backdrop-blur px-4 py-3 flex justify-end gap-2">
            <button
              onClick={closeCreateModal}
              className="px-4 py-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!hasAnyCondition) {
                  toast.error("Add at least one condition before saving as template");
                  return;
                }
                setTemplateNameInput(formName || "Untitled template");
                setTemplateDescInput(formDescription || "");
                setSaveTemplateOpen(true);
              }}
              className="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30 transition-colors"
            >
              Save as Template
            </button>
            <button
              onClick={() => handleSave(true)}
              className="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30 transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave(false)}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal text-primary-foreground hover:bg-teal-light shadow-[0_4px_14px_-4px_hsl(var(--teal)/0.5)] transition-colors"
            >
              Save &amp; Activate
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} title="Save as Template">
        <div className="w-full max-w-md space-y-3 text-foreground">
          <p className="text-[11px] text-muted-foreground">
            Saves the current policy's structure (type, conditions, severity, scope, tags) as a reusable template. It
            does not create a policy and does not evaluate anything.
          </p>
          <div>
            <label className="block text-[11px] font-medium mb-1">Template name</label>
            <input
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1">Description (optional)</label>
            <textarea
              value={templateDescInput}
              onChange={(e) => setTemplateDescInput(e.target.value)}
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setSaveTemplateOpen(false)}
              className="px-4 py-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const name = templateNameInput.trim() || "Untitled template";
                const tpl: PolicyTemplate = {
                  id: `tpl-${Date.now()}`,
                  name,
                  description: templateDescInput.trim(),
                  type: formPolicyType,
                  assetType: assetTypeFor(formPolicyType),
                  severity: formSeverity,
                  conditionGroups: deepCloneGroups(conditionGroups),
                  groupLogic,
                  scope: {
                    groupIds: [...scope.groupIds],
                    environments: [...scope.environments],
                    providers: [...scope.providers],
                  },
                  tags: [...formTags],
                  author: "you",
                  uses: 0,
                };
                setTemplates((prev) => [tpl, ...prev]);
                setSaveTemplateOpen(false);
                toast.success("Saved as template");
              }}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal text-primary-foreground hover:bg-teal-light"
            >
              Save template
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!configModal} onClose={() => setConfigModal(null)} title="Configure Policy">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Alert Threshold (days before expiry)</label>
            <div className="flex gap-2 mt-1">
              {[30, 14, 7].map((d) => (
                <label key={d} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" defaultChecked className="rounded" /> {d}d
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Severity</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs">
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfigModal(null)}
              className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfigModal(null);
                toast.success("Policy configuration saved");
              }}
              className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
