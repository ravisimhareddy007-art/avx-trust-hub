import { FEATURES } from '@/config/features';
import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies as initialCustomPolicies } from '@/data/mockData';
import { mockGroups } from '@/data/inventoryMockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import ConditionBuilder, { ConditionGroup, emptyGroup } from '@/components/policies/ConditionBuilder';
import { POLICY_TYPES, describeCondition, FIELDS_BY_POLICY_TYPE } from '@/components/policies/policyFields';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
  Lock,
  X,
  Info,
  FileBadge,
  KeyRound,
  Network,
  Code2,
  Atom,
  MoreHorizontal,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// Types

interface ScopeConfig {
  groupIds: string[];
  environments: string[];
  providers: string[];
}

type TicketSystem = 'servicenow' | 'jira';

interface TicketConfig {
  enabled: boolean;
  system: TicketSystem;
  // ServiceNow
  assignmentGroup?: string;
  snowPriority?: '1-Critical' | '2-High' | '3-Moderate' | '4-Low';
  // Jira
  projectKey?: string;
  issueType?: 'Task' | 'Bug';
  jiraPriority?: 'Highest' | 'High' | 'Medium' | 'Low';
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
  groupLogic?: 'AND' | 'OR';
  conditionSummary?: string;
  scope?: ScopeConfig;
  tags?: string[];
  notify?: NotifyConfig;
  ticket?: TicketConfig;
  effectiveFrom?: string | null;
}

type PolicyType = 'ssh-key' | 'ssh-cert' | 'certificates' | 'secrets' | 'encryption-keys' | 'protocol-cipher' | 'cbom' | '';

const getPolicyTypeMeta = (type: PolicyType) => {
  switch (type) {
    case 'ssh-key':         return { label: 'SSH Keys', icon: Key, cls: 'bg-amber/10 text-amber border-amber/20' };
    case 'ssh-cert':        return { label: 'SSH Certificates', icon: Shield, cls: 'bg-amber/10 text-amber border-amber/20' };
    case 'certificates':    return { label: 'Certificates', icon: Shield, cls: 'bg-teal/10 text-teal border-teal/20' };
    case 'secrets':         return { label: 'Secrets & Tokens', icon: Lock, cls: 'bg-purple/10 text-purple border-purple/20' };
    case 'encryption-keys': return { label: 'Encryption Keys', icon: Key, cls: 'bg-teal/10 text-teal border-teal/20' };
    case 'protocol-cipher': return { label: 'Protocol & Cipher', icon: Shield, cls: 'bg-purple/10 text-purple border-purple/20' };
    case 'cbom':            return { label: 'Code / CBOM', icon: Lock, cls: 'bg-purple/10 text-purple border-purple/20' };
    default: return null;
  }
};

const getPolicyTypeFromAssetType = (assetType?: string): PolicyType => {
  const v = (assetType || '').toLowerCase();
  if (v.includes('ssh certificate')) return 'ssh-cert';
  if (v.includes('ssh')) return 'ssh-key';
  if (v.includes('encryption key')) return 'encryption-keys';
  if (v.includes('protocol') || v.includes('cipher')) return 'protocol-cipher';
  if (v.includes('cbom') || v.includes('code')) return 'cbom';
  if (v.includes('secret') || v.includes('token') || v.includes('api')) return 'secrets';
  if (v.includes('certificate') || v.includes('tls')) return 'certificates';
  return '';
};
const getPolicyTypeBadgeFromAsset = (assetType?: string) => getPolicyTypeMeta(getPolicyTypeFromAssetType(assetType));


const ENV_OPTIONS = ['Production', 'Staging', 'Development'];
const CLOUD_OPTIONS = ['AWS', 'Azure', 'GCP'];

function emptyScope(): ScopeConfig {
  return { groupIds: [], environments: [], providers: [] };
}

function emptyNotify(): NotifyConfig {
  return { email: '', onNewViolation: true };
}

function emptyTicket(): TicketConfig {
  return { enabled: false, system: 'servicenow', assignmentGroup: '', snowPriority: '2-High', projectKey: '', issueType: 'Task', jiraPriority: 'High' };
}

function assetTypeFor(policyType: string) {
  if (policyType.includes('SSH Certificate')) return 'SSH Certificate';
  if (policyType.includes('Certificate')) return 'TLS Certificate';
  if (policyType.includes('SSH')) return 'SSH Key';
  if (policyType.includes('Encryption Keys')) return 'Encryption Key';
  if (policyType.includes('Protocol')) return 'Protocol / Cipher';
  if (policyType.includes('CBOM')) return 'Code / CBOM';
  return 'Secret / Token';
}

function severityToSnowPriority(sev: string): TicketConfig['snowPriority'] {
  return sev === 'Critical' ? '1-Critical' : sev === 'High' ? '2-High' : sev === 'Medium' ? '3-Moderate' : '4-Low';
}
function severityToJiraPriority(sev: string): TicketConfig['jiraPriority'] {
  return sev === 'Critical' ? 'Highest' : sev === 'High' ? 'High' : sev === 'Medium' ? 'Medium' : 'Low';
}

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
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

type SectionAccent = 'teal' | 'purple' | 'amber' | 'coral';
function SectionHeading({ label, info, accent = 'teal' }: { label: string; info: string; accent?: SectionAccent }) {
  const dotCls = ({ teal: 'bg-teal', purple: 'bg-purple', amber: 'bg-amber', coral: 'bg-coral' } as const)[accent];
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls} shadow-[0_0_0_3px_hsl(var(--card))]`} />
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">{label}</p>
      <InfoIcon text={info} />
    </div>
  );
}

const sectionCardCls = 'bg-card/60 border border-border/50 rounded-xl p-5 shadow-sm';

function ChipMulti({ label, options, values, onChange }: {
  label: string; options: string[]; values: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = values.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${active ? 'bg-teal/15 text-teal border-teal/40' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}>
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
      {values.map(v => (
        <span key={v.id} className="text-[10px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 inline-flex items-center gap-1">
          {v.label}
          <button type="button" onClick={() => onRemove(v.id)} className="hover:text-coral"><X className="w-2.5 h-2.5" /></button>
        </span>
      ))}
    </div>
  );
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (!t || values.includes(t)) { setDraft(''); return; }
    onChange([...values, t]); setDraft('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-lg px-2 py-1.5 bg-card min-h-[34px]">
      {values.map(v => (
        <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 inline-flex items-center gap-1">
          {v}
          <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-coral"><X className="w-2.5 h-2.5" /></button>
        </span>
      ))}
      <input value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); } }}
        onBlur={() => draft && add(draft)}
        placeholder={values.length ? '' : (placeholder || 'Type and press Enter')}
        className="flex-1 min-w-[120px] bg-transparent text-[11px] outline-none text-foreground" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AI assist — heuristic policy drafter (front-end only)

type Confidence = 'High' | 'Medium' | 'Low';
export type AIField = 'policyType' | 'conditions' | 'severity' | 'environments';

interface Fills {
  policyType?: string;
  severity?: string;
  environments?: string[];
  conditions?: {
    seeds: { field: string; operator: string; value: string }[][];
    groupLogic: 'AND' | 'OR';
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
  | { kind: 'ok'; interpretations: Interpretation[] }
  | { kind: 'unresolvable'; reason: string; suggestion: string }
  | { kind: 'unavailable' };

function detectPolicyType(d: string): string | undefined {
  if (/\bssh\s*cert/.test(d)) return 'SSH Certificate Policy';
  if (/\bssh\b/.test(d)) return 'SSH Key Policy';
  if (/\b(secret|token|api\s*key)\b/.test(d)) return 'Secrets & Tokens Policy';
  if (/(encryption\s*key|\bkms\b|hsm)/.test(d)) return 'Encryption Keys Policy';
  if (/(protocol|cipher|tls\s*1\.[01])/.test(d)) return 'Protocol & Cipher Policy';
  if (/(cbom|source\s*code|repo)/.test(d)) return 'Code / CBOM Policy';
  if (/(certificate|\bcert\b|\btls\b|x\.?509)/.test(d)) return 'Certificate Policy';
  return undefined;
}

function detectSeverity(d: string): string | undefined {
  if (/\b(critical|urgent|severe)\b/.test(d)) return 'Critical';
  if (/\bhigh\b/.test(d)) return 'High';
  if (/\bmedium\b/.test(d)) return 'Medium';
  if (/\blow\b/.test(d)) return 'Low';
  return undefined;
}

function detectEnvironments(d: string): string[] | undefined {
  const envs: string[] = [];
  if (/\b(prod|production)\b/.test(d)) envs.push('Production');
  if (/\bstag(ing)?\b/.test(d)) envs.push('Staging');
  if (/\b(dev|development)\b/.test(d)) envs.push('Development');
  return envs.length ? envs : undefined;
}

function buildConditionVariants(d: string, policyType: string): { seeds: { field: string; operator: string; value: string }[][]; groupLogic: 'AND' | 'OR'; label: string; confidence: Confidence; notes: string[] }[] {
  const fields = (FIELDS_BY_POLICY_TYPE as Record<string, { id: string }[]>)[policyType] || [];
  const hasField = (id: string) => fields.some(f => f.id === id);

  const dayMatch = d.match(/(\d+)\s*day/);
  const days = dayMatch ? dayMatch[1] : null;
  const bitsMatch = d.match(/\b(1024|2048|3072|4096)\b/);
  const bits = bitsMatch ? bitsMatch[1] : null;

  // Ambiguity: vague rotation
  const vagueTime = /(a while|recently|stale|\bold\b|long time)/.test(d);
  if (vagueTime && /rotat/.test(d) && !days && hasField('days_since_rotation')) {
    return [
      { seeds: [[{ field: 'days_since_rotation', operator: 'gt', value: '90' }]], groupLogic: 'AND', label: 'Not rotated in over 90 days', confidence: 'Medium', notes: ['Threshold inferred from vague time'] },
      { seeds: [[{ field: 'days_since_rotation', operator: 'gt', value: '180' }]], groupLogic: 'AND', label: 'Not rotated in over 180 days', confidence: 'Medium', notes: [] },
      { seeds: [[{ field: 'days_since_rotation', operator: 'gt', value: '365' }]], groupLogic: 'AND', label: 'Not rotated in over 365 days', confidence: 'Low', notes: ['Coarse guess'] },
    ];
  }

  // Ambiguity: "weak"
  if (/\bweak\b/.test(d) && !/sha|md5|rsa|dsa|bit|ecdsa|ed25519/.test(d)) {
    if (policyType === 'Certificate Policy') {
      return [
        { seeds: [[{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]], groupLogic: 'AND', label: 'Weak signature algorithm (SHA-1 or MD5)', confidence: 'Medium', notes: [] },
        { seeds: [[{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]], groupLogic: 'AND', label: 'RSA keys under 2048 bits', confidence: 'Medium', notes: [] },
        { seeds: [[{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]], groupLogic: 'AND', label: 'Quantum-vulnerable algorithms', confidence: 'Medium', notes: [] },
      ];
    }
    if (policyType === 'SSH Key Policy') {
      return [
        { seeds: [[{ field: 'key_type', operator: 'eq', value: 'DSA' }]], groupLogic: 'AND', label: 'DSA key type', confidence: 'Medium', notes: [] },
        { seeds: [[{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]], groupLogic: 'AND', label: 'RSA keys under 2048 bits', confidence: 'Medium', notes: [] },
        { seeds: [[{ field: 'mac_algo', operator: 'in', value: 'hmac-sha1,hmac-md5' }]], groupLogic: 'AND', label: 'Legacy MAC algorithms', confidence: 'Medium', notes: [] },
      ];
    }
  }

  // Direct mapping
  const seeds: { field: string; operator: string; value: string }[][] = [];
  const notes: string[] = [];

  if (policyType === 'Certificate Policy') {
    if (/sha-?1|md5/.test(d) && hasField('sig_algo')) seeds.push([{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]);
    if (/self.?sign/.test(d) && hasField('is_self_signed')) seeds.push([{ field: 'is_self_signed', operator: 'is_true', value: '' }]);
    if (/wildcard/.test(d) && hasField('is_wildcard')) seeds.push([{ field: 'is_wildcard', operator: 'is_true', value: '' }]);
    if (/expir/.test(d) && days && hasField('expiry_days')) seeds.push([{ field: 'expiry_days', operator: 'lt', value: days }]);
    if (/(untrusted|unapproved|approved ca|not approved)/.test(d) && hasField('issuing_ca')) seeds.push([{ field: 'issuing_ca', operator: 'nin', value: 'DigiCert,Sectigo,internal-Root-G2' }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe|pqc.?risk)/.test(d) && hasField('quantum_vuln')) seeds.push([{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]);
    if (/rsa/.test(d) && (bits || /\bweak\b/.test(d)) && hasField('key_bits'))
      seeds.push([{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: bits || '2048' }]);
  } else if (policyType === 'SSH Key Policy') {
    if (/dsa/.test(d) && hasField('key_type')) seeds.push([{ field: 'key_type', operator: 'eq', value: 'DSA' }]);
    if (/rsa/.test(d) && (bits || /\bweak\b/.test(d)) && hasField('key_bits'))
      seeds.push([{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: bits || '2048' }]);
    if (/rotat/.test(d) && days && hasField('days_since_rotation'))
      seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe)/.test(d) && hasField('quantum_vuln'))
      seeds.push([{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]);
  } else if (policyType === 'Secrets & Tokens Policy') {
    if (/(no expiry|without expiry|missing expiry)/.test(d) && hasField('has_expiry'))
      seeds.push([{ field: 'has_expiry', operator: 'is_false', value: '' }]);
    if (/rotat/.test(d) && days && hasField('days_since_rotation'))
      seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
  } else if (policyType === 'Encryption Keys Policy') {
    if (/(no rotation|rotation disabled)/.test(d) && hasField('rotation_enabled'))
      seeds.push([{ field: 'rotation_enabled', operator: 'is_false', value: '' }]);
    if (/rotat/.test(d) && days && hasField('days_since_rotation'))
      seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe)/.test(d) && hasField('quantum_vuln'))
      seeds.push([{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]);
  }

  if (!seeds.length) return [];

  const groupLogic: 'AND' | 'OR' = seeds.length > 1 ? 'OR' : 'AND';
  const label = seeds.length === 1
    ? seeds[0].map(r => describeCondition(policyType, r)).join(' AND ')
    : seeds.map(g => `(${g.map(r => describeCondition(policyType, r)).join(' AND ')})`).join(' OR ');
  const confidence: Confidence = /\bweak\b/.test(d) ? 'Medium' : 'High';
  return [{ seeds, groupLogic, label, confidence, notes }];
}

function draftFromDescription(input: string, currentPolicyType: string): DraftResult {
  if (/\boffline\b|@@unavailable/.test(input)) return { kind: 'unavailable' };

  const d = input.toLowerCase().trim();
  if (!d) return { kind: 'unresolvable', reason: 'Empty description.', suggestion: 'Describe what to flag, e.g. "flag SHA-1 certificates in production".' };

  const detectedType = detectPolicyType(d);
  const effectiveType = detectedType || currentPolicyType;
  const severity = detectSeverity(d);
  const environments = detectEnvironments(d);
  const variants = buildConditionVariants(d, effectiveType);

  // If nothing at all was inferred, unresolvable.
  if (!detectedType && !severity && !environments && !variants.length) {
    return {
      kind: 'unresolvable',
      reason: `Couldn't map your description to any policy field.`,
      suggestion: 'Try naming an asset type, a concrete field, or an environment — e.g. "flag SHA-1 certificates in production".',
    };
  }

  // Build interpretations. If condition variants are ambiguous (>1), branch per variant.
  const baseFills = (cond?: { seeds: { field: string; operator: string; value: string }[][]; groupLogic: 'AND' | 'OR' }): Fills => ({
    ...(detectedType ? { policyType: detectedType } : {}),
    ...(severity ? { severity } : {}),
    ...(environments ? { environments } : {}),
    ...(cond ? { conditions: cond } : {}),
  });

  if (variants.length > 1) {
    return {
      kind: 'ok',
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
  if (environments) partsLabel.push(`scope: ${environments.join(', ')}`);
  if (severity) partsLabel.push(`severity: ${severity}`);

  return {
    kind: 'ok',
    interpretations: [{
      id: 'main',
      label: partsLabel.join(' · ') || 'Suggested fill',
      fills: baseFills(single ? { seeds: single.seeds, groupLogic: single.groupLogic } : undefined),
      confidence: single ? single.confidence : 'Medium',
      notes: single ? single.notes : [],
    }],
  };
}

function ConfidenceChip({ level }: { level: Confidence }) {
  const cls = level === 'High' ? 'bg-teal/15 text-teal border-teal/40'
    : level === 'Medium' ? 'bg-amber/15 text-amber border-amber/40'
    : 'bg-coral/15 text-coral border-coral/40';
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${cls}`}>{level} confidence</span>;
}

function AIMarker({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span title="Filled by AI — review and edit before saving" className="inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 font-semibold">
      <Sparkles className="w-2 h-2" /> AI
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface OverflowItem { label: string; onClick: () => void; tone?: 'default' | 'danger' }
function OverflowMenu({ items }: { items: OverflowItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1 rounded hover:bg-navy-lighter text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Row actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {items.map((it, i) => (
            <button key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              className={`block w-full text-left text-[11px] px-3 py-1.5 hover:bg-muted transition-colors ${it.tone === 'danger' ? 'text-coral hover:bg-coral/10' : 'text-foreground'}`}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'policies' | 'templates'>('policies');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'Built-in' | 'Custom'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'Critical' | 'High' | 'Medium' | 'Low'>('all');
  const [filterPolicyType, setFilterPolicyType] = useState<string>('all');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  // Create-policy modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [formPolicyType, setFormPolicyType] = useState('Certificate Policy');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formSeverity, setFormSeverity] = useState('High');
  const [scope, setScope] = useState<ScopeConfig>(emptyScope());
  const [showRefine, setShowRefine] = useState(false);
  const [notify, setNotify] = useState<NotifyConfig>(emptyNotify());
  const [ticket, setTicket] = useState<TicketConfig>(emptyTicket());
  const [showNotify, setShowNotify] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND');
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // AI assist (lives at top of modal, drafts the whole form)
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<DraftResult | null>(null);
  const [aiTouched, setAiTouched] = useState<Set<AIField>>(new Set());
  const [manuallyEdited, setManuallyEdited] = useState<Set<AIField>>(new Set());

  const markUserEdit = (field: AIField) => {
    setManuallyEdited(prev => { const n = new Set(prev); n.add(field); return n; });
    setAiTouched(prev => { if (!prev.has(field)) return prev; const n = new Set(prev); n.delete(field); return n; });
  };

  const resetCreateForm = () => {
    setFormPolicyType('Certificate Policy');
    setFormName(''); setFormDescription(''); setFormTags([]); setFormSeverity('High');
    setScope(emptyScope()); setShowRefine(false);
    setNotify(emptyNotify()); setTicket(emptyTicket());
    setShowNotify(false); setShowTicket(false);
    setEffectiveFrom('');
    setConditionGroups([emptyGroup()]); setGroupLogic('AND');
    setPreview(null); setEditingPolicy(null);
    setAiInput(''); setAiResult(null); setAiLoading(false);
    setAiTouched(new Set()); setManuallyEdited(new Set());
  };

  const closeCreateModal = () => { setCreateOpen(false); resetCreateForm(); };

  // Seed helpers for templates / AI
  const seedGroups = (rows: { field: string; operator: string; value: string }[][]): ConditionGroup[] =>
    rows.map(group => ({
      id: `grp-${Math.random().toString(36).slice(2, 8)}`,
      innerLogic: 'AND',
      rows: group.map(r => ({ id: `row-${Math.random().toString(36).slice(2, 8)}`, ...r })),
    }));

  const openTemplate = (template: 'pci-ssh' | 'nist-ssh' | 'zero-trust-tls' | 'dora-cert' | 'secret-rotation' | 'untrusted-ca') => {
    resetCreateForm();
    if (template === 'pci-ssh') {
      setFormPolicyType('SSH Key Policy'); setFormTags(['framework:PCI-DSS']);
      setFormName('PCI-DSS SSH Key Strength'); setFormSeverity('Critical');
      setConditionGroups(seedGroups([[{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]]));
    } else if (template === 'nist-ssh') {
      setFormPolicyType('SSH Key Policy'); setFormTags(['framework:NIST']);
      setFormName('NIST SSH Baseline'); setFormSeverity('High');
      setConditionGroups(seedGroups([
        [{ field: 'key_type', operator: 'eq', value: 'DSA' }],
        [{ field: 'mac_algo', operator: 'in', value: 'hmac-sha1,hmac-md5' }],
      ]));
      setGroupLogic('OR');
    } else if (template === 'zero-trust-tls') {
      setFormPolicyType('Certificate Policy'); setFormTags(['framework:Zero-Trust']);
      setFormName('Zero-Trust TLS Validity'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'validity_days', operator: 'gt', value: '90' }]]));
    } else if (template === 'dora-cert') {
      setFormPolicyType('Certificate Policy'); setFormTags(['framework:DORA']);
      setFormName('DORA Weak Algorithm'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]]));
    } else if (template === 'secret-rotation') {
      setFormPolicyType('Secrets & Tokens Policy');
      setFormName('Secret Rotation Baseline'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'days_since_rotation', operator: 'gt', value: '90' }]]));
    } else if (template === 'untrusted-ca') {
      setFormPolicyType('Certificate Policy'); setFormTags(['scope:internal']);
      setFormName('Untrusted Issuing CA'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'issuing_ca', operator: 'nin', value: 'DigiCert,Sectigo,internal-Root-G2' }]]));
    }
    setCreateOpen(true);
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
        setAiResult({ kind: 'unavailable' });
      }
      setAiLoading(false);
    }, 450);
  };

  const applyInterpretation = (interp: Interpretation) => {
    const touched = new Set<AIField>(aiTouched);
    const f = interp.fills;
    if (f.policyType && !manuallyEdited.has('policyType')) {
      setFormPolicyType(f.policyType);
      touched.add('policyType');
    }
    if (f.conditions && !manuallyEdited.has('conditions')) {
      setConditionGroups(seedGroups(f.conditions.seeds));
      setGroupLogic(f.conditions.groupLogic);
      touched.add('conditions');
    }
    if (f.severity && !manuallyEdited.has('severity')) {
      setFormSeverity(f.severity);
      setTicket(t => ({ ...t, snowPriority: severityToSnowPriority(f.severity!), jiraPriority: severityToJiraPriority(f.severity!) }));
      touched.add('severity');
    }
    if (f.environments && !manuallyEdited.has('environments')) {
      setScope(s => ({ ...s, environments: f.environments! }));
      setShowRefine(true);
      touched.add('environments');
    }
    setAiTouched(touched);
    setAiResult(null);
    toast.success('Form drafted — review AI-filled fields before saving');
  };

  const hasAnyCondition = conditionGroups.some(g => g.rows.some(r => r.field && r.operator));

  const runPreview = () => {
    if (!hasAnyCondition) { toast.error('Add at least one condition first'); return; }
    const at = assetTypeFor(formPolicyType);
    const base = at === 'TLS Certificate' ? 18420 : at === 'SSH Key' ? 9650 : at === 'SSH Certificate' ? 2150 : at === 'Encryption Key' ? 3120 : at === 'Protocol / Cipher' ? 7800 : at === 'Code / CBOM' ? 5400 : 4780;
    const scopeFactor =
      (scope.groupIds.length === 0 ? 1 : 0.25 + scope.groupIds.length * 0.18) *
      (scope.environments.length === 0 ? 1 : scope.environments.length / 3) *
      (scope.providers.length === 0 ? 1 : 0.4 + scope.providers.length * 0.2);
    const seed = hashStr(JSON.stringify({ at, scope, conditionGroups, groupLogic, effectiveFrom })) % 1000;
    const inScope = Math.max(8, Math.round(base * Math.min(1, scopeFactor) * (0.7 + (seed / 1000) * 0.4)));
    const nonCompliantPct = 0.05 + ((seed % 19) / 100);
    const nonCompliant = Math.max(1, Math.round(inScope * nonCompliantPct));
    const excepted = Math.round(nonCompliant * 0.06);
    const compliant = Math.max(0, inScope - nonCompliant - excepted);
    const allRows = conditionGroups.flatMap(g => g.rows.filter(r => r.field && r.operator));
    const sampleNames = at === 'TLS Certificate'
      ? ['*.payments.acmecorp.com', 'vault.internal.acmecorp.com', 'api.acmecorp.com', 'mail.acmecorp.com', 'edge-lb-01.acmecorp.com']
      : at === 'SSH Key'
      ? ['prod-db-01-authorized-key', 'jumpbox-east-1', 'bastion-aws-prod', 'ci-runner-key-22', 'k8s-node-ssh-cert']
      : at === 'SSH Certificate'
      ? ['host-cert-prod-db-01', 'user-cert-deploy-bot', 'host-cert-bastion-eu', 'user-cert-sre-oncall', 'host-cert-k8s-ctrl-1']
      : at === 'Encryption Key'
      ? ['kms-payments-master', 'aws-kms-prod-rds', 'azkv-prod-signer', 'fortanix-hsm-root', 'gcp-kms-data-eu']
      : at === 'Protocol / Cipher'
      ? ['edge-lb-01:443', 'api-gw-eu:443', 'legacy-app-07:443', 'bastion-aws-prod:22', 'vpn-gw-1:500']
      : at === 'Code / CBOM'
      ? ['payments-svc/crypto/legacy.go:42', 'auth-lib/jwt.ts:118', 'data-pipe/encrypt.py:87', 'mobile-app/keystore.kt:55', 'firmware/boot/sig.c:201']
      : ['stripe-api-key', 'okta-svc-token', 'github-deploy-key', 'snowflake-readonly', 'pagerduty-int'];
    const sample = sampleNames.slice(0, Math.min(5, nonCompliant)).map((name, i) => ({
      name,
      failing: describeCondition(formPolicyType, allRows[i % allRows.length]) || 'condition match',
    }));
    setPreview({ inScope, compliant, nonCompliant, excepted, sample });
  };

  React.useEffect(() => { setPreview(null); }, [conditionGroups, groupLogic, scope, formPolicyType, effectiveFrom]);
  React.useEffect(() => { setAiResult(null); }, [formPolicyType]);

  const handleSave = (draft: boolean) => {
    if (!formName.trim()) { toast.error('Policy name is required'); return; }
    const summary = conditionGroups
      .map(g => g.rows
        .filter(r => r.field && r.operator)
        .map(r => describeCondition(formPolicyType, r))
        .filter(Boolean)
        .join(` ${g.innerLogic} `))
      .filter(Boolean)
      .map(s => `(${s})`)
      .join(` ${groupLogic} `);

    const newPolicy: CustomPolicy = {
      id: editingPolicy || `cpol-${Date.now()}`,
      name: formName,
      description: formDescription || formPolicyType,
      status: draft ? 'Draft' : 'Active',
      violations: 0,
      assetType: assetTypeFor(formPolicyType),
      severity: formSeverity,
      conditionGroups, groupLogic,
      conditionSummary: summary,
      scope: { ...scope },
      tags: [...formTags],
      notify: { ...notify },
      ticket: { ...ticket },
      effectiveFrom: effectiveFrom || null,
    };

    if (editingPolicy) setUserPolicies(prev => prev.map(p => p.id === editingPolicy ? newPolicy : p));
    else setUserPolicies(prev => [...prev, newPolicy]);

    setCreateOpen(false); resetCreateForm();
    toast.success(draft ? `"${formName}" saved as draft` : `"${formName}" activated`);
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    resetCreateForm();
    setEditingPolicy(p.id);
    setFormName(p.name); setFormDescription(p.description);
    setFormSeverity(p.severity || 'High'); setFormTags(p.tags || []);
    const at = (p.assetType || '');
    if (at.includes('SSH Certificate')) setFormPolicyType('SSH Certificate Policy');
    else if (at.includes('SSH')) setFormPolicyType('SSH Key Policy');
    else if (at.includes('Secret') || at.includes('Token') || at.includes('API')) setFormPolicyType('Secrets & Tokens Policy');
    else if (at.includes('Encryption Key')) setFormPolicyType('Encryption Keys Policy');
    else if (at.includes('Protocol') || at.includes('Cipher')) setFormPolicyType('Protocol & Cipher Policy');
    else if (at.includes('CBOM') || at.includes('Code')) setFormPolicyType('Code / CBOM Policy');
    else setFormPolicyType('Certificate Policy');
    setConditionGroups(p.conditionGroups?.length ? p.conditionGroups : [emptyGroup()]);
    setGroupLogic(p.groupLogic || 'AND');
    setScope(p.scope ? { ...emptyScope(), ...p.scope } : emptyScope());
    setNotify(p.notify ? { ...emptyNotify(), ...p.notify } : emptyNotify());
    setTicket(p.ticket ? { ...emptyTicket(), ...p.ticket } : emptyTicket());
    setShowNotify(!!(p.notify && p.notify.email));
    setShowTicket(!!(p.ticket && p.ticket.enabled));
    setEffectiveFrom(p.effectiveFrom || '');
    setCreateOpen(true);
  };

  const deletePolicy = (id: string) => {
    setUserPolicies(prev => prev.filter(p => p.id !== id));
    toast.success('Policy deleted');
  };
  const togglePolicyStatus = (id: string) => {
    setUserPolicies(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'Active' ? 'Draft' : 'Active' } : p));
  };

  const filteredPolicies = policyRules
    .filter(p => FEATURES.AI_IDENTITY || !/\bAI\b|agent/i.test(`${p.name} ${p.description}`))
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()));

  const scopeSummary = (s?: ScopeConfig) => {
    if (!s) return 'All assets';
    const parts = [
      ...s.groupIds.map(gid => mockGroups.find(g => g.id === gid)?.name || gid),
      ...s.environments,
      ...s.providers,
    ];
    return parts.length ? parts.join(' · ') : 'All assets';
  };

  const ticketBadge = (p: CustomPolicy): string => {
    if (!p.ticket || !p.ticket.enabled) return 'No ticket';
    if (p.ticket.system === 'servicenow') return 'ServiceNow: Incident';
    if (p.ticket.system === 'jira') return `Jira: ${p.ticket.projectKey || '—'}`;
    return 'No ticket';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Policies</h1>
        <button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
          <Plus className="w-3 h-3" /> Create Policy
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-border overflow-hidden bg-card">
        {([
          { id: 'policies', label: 'Policies' },
          { id: 'templates', label: 'Templates' },
        ] as const).map(s => (
          <button key={s.id} onClick={() => setTab(s.id)}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${tab === s.id ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {tab === 'policies' && (() => {
        const builtinRows = policyRules
          .filter(p => FEATURES.AI_IDENTITY || !/\bAI\b|agent/i.test(`${p.name} ${p.description}`))
          .map(p => ({
            source: 'Built-in' as const,
            id: p.id,
            name: p.name,
            description: p.description,
            policyType: (p as { policyType?: string }).policyType || 'Certificate',
            framework: (p as { framework?: string }).framework || '',
            severity: p.severity,
            status: policyStates[p.id] ? 'Enabled' : 'Disabled',
            violations: p.affectedAssets,
          }));
        const customRows = userPolicies.map(p => ({
          source: 'Custom' as const,
          id: p.id,
          name: p.name,
          description: p.description,
          policyType: p.assetType || 'Certificate',
          framework: '',
          severity: p.severity || 'High',
          status: p.status,
          violations: p.violations,
        }));
        const allTypes = ['Certificate', 'SSH Key', 'SSH Certificate', 'Secrets & Tokens', 'Encryption Keys', 'Protocol & Cipher', 'Code / CBOM', 'Post-Quantum'];
        const rows = [...builtinRows, ...customRows]
          .filter(r => filterSource === 'all' || r.source === filterSource)
          .filter(r => filterSeverity === 'all' || r.severity === filterSeverity)
          .filter(r => filterPolicyType === 'all' || r.policyType === filterPolicyType)
          .filter(r => {
            const s = searchTerm.toLowerCase();
            return !s || r.name.toLowerCase().includes(s) || r.description.toLowerCase().includes(s);
          });

        // ── visual helpers (severity color language + type icon/tint) ──
        const sevAccent: Record<string, { border: string; chip: string; text: string }> = {
          Critical: { border: 'border-l-coral', chip: 'bg-coral text-white', text: 'text-coral' },
          High:     { border: 'border-l-amber', chip: 'bg-amber text-white', text: 'text-amber' },
          Medium:   { border: 'border-l-purple', chip: 'bg-purple text-white', text: 'text-purple' },
          Low:      { border: 'border-l-teal',  chip: 'bg-teal text-white',  text: 'text-teal' },
        };
        const typeMeta: Record<string, { Icon: typeof Shield; tint: string }> = {
          'Certificate':       { Icon: FileBadge, tint: 'bg-teal/15 text-teal border-teal/30' },
          'SSH Key':           { Icon: KeyRound,  tint: 'bg-amber/15 text-amber border-amber/30' },
          'SSH Certificate':   { Icon: Shield,    tint: 'bg-amber/15 text-amber border-amber/30' },
          'Secrets & Tokens':  { Icon: Lock,      tint: 'bg-purple/15 text-purple border-purple/30' },
          'Encryption Keys':   { Icon: Key,       tint: 'bg-info/15 text-info border-info/30' },
          'Protocol & Cipher': { Icon: Network,   tint: 'bg-coral/15 text-coral border-coral/30' },
          'Code / CBOM':       { Icon: Code2,     tint: 'bg-success/15 text-success border-success/30' },
          'Post-Quantum':      { Icon: Atom,      tint: 'bg-purple/15 text-purple border-purple/30' },
        };

        const statusClass = (status: string) =>
          status === 'Active' || status === 'Enabled' ? 'bg-teal/20 text-teal border border-teal/30'
          : status === 'Disabled' || status === 'Inactive' ? 'bg-muted text-muted-foreground border border-border'
          : 'bg-amber/20 text-amber border border-amber/30';

        const cloneBuiltinToCustom = (b: { name: string; description: string; severity: string; policyType: string }) => {
          resetCreateForm();
          const pt = b.policyType === 'SSH Key' ? 'SSH Key Policy'
            : b.policyType === 'SSH Certificate' ? 'SSH Certificate Policy'
            : b.policyType === 'Secrets & Tokens' ? 'Secrets & Tokens Policy'
            : b.policyType === 'Encryption Keys' ? 'Encryption Keys Policy'
            : b.policyType === 'Protocol & Cipher' ? 'Protocol & Cipher Policy'
            : b.policyType === 'Code / CBOM' ? 'Code / CBOM Policy'
            : 'Certificate Policy';
          setFormPolicyType(pt);
          setFormName(`${b.name} (Custom)`);
          setFormDescription(b.description);
          setFormSeverity(b.severity);
          setCreateOpen(true);
        };

        const resetFilters = () => {
          setSearchTerm(''); setFilterSource('all'); setFilterSeverity('all'); setFilterPolicyType('all');
        };
        const hasActiveFilter = !!searchTerm || filterSource !== 'all' || filterSeverity !== 'all' || filterPolicyType !== 'all';

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search policies..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value as typeof filterSource)} className="border border-border rounded-lg px-2 py-2 text-xs bg-card">
                <option value="all">Source: All</option>
                <option value="Built-in">Built-in</option>
                <option value="Custom">Custom</option>
              </select>
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as typeof filterSeverity)} className="border border-border rounded-lg px-2 py-2 text-xs bg-card">
                <option value="all">Severity: All</option>
                {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterPolicyType} onChange={e => setFilterPolicyType(e.target.value)} className="border border-border rounded-lg px-2 py-2 text-xs bg-card">
                <option value="all">Policy Type: All</option>
                {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {hasActiveFilter && (
                <button onClick={resetFilters} className="text-[10px] px-2 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30">
                  Reset filters
                </button>
              )}
            </div>

            <div className="bg-card/40 rounded-xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-navy/60 border-b border-border">
                  <tr>
                    <th className="w-1" />
                    {['Source', 'Policy', 'Type', 'Severity', 'Status', 'Violations', 'Enabled', ''].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-semibold text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 px-3 text-center text-muted-foreground">
                        <div className="text-xs">No policies match the current filters.</div>
                        {hasActiveFilter && (
                          <button onClick={resetFilters} className="mt-2 text-[11px] text-teal hover:underline">Reset filters</button>
                        )}
                      </td>
                    </tr>
                  )}
                  {rows.map(r => {
                    const isCustom = r.source === 'Custom';
                    const customPol = isCustom ? userPolicies.find(p => p.id === r.id) : undefined;
                    const expanded = expandedPolicy === r.id;
                    const sev = sevAccent[r.severity] || sevAccent.Medium;
                    const tm = typeMeta[r.policyType] || typeMeta['Certificate'];
                    const TIcon = tm.Icon;
                    const enabled = isCustom ? (customPol?.status === 'Active') : policyStates[r.id];
                    const toggle = () => {
                      if (isCustom) togglePolicyStatus(r.id);
                      else { setPolicyStates(prev => ({ ...prev, [r.id]: !prev[r.id] })); toast.success(`Policy ${policyStates[r.id] ? 'disabled' : 'enabled'}`); }
                    };
                    return (
                      <React.Fragment key={`${r.source}-${r.id}`}>
                        <tr
                          onClick={() => setExpandedPolicy(expanded ? null : r.id)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedPolicy(expanded ? null : r.id); } }}
                          tabIndex={0}
                          className={`group border-b border-border/60 cursor-pointer transition-all bg-navy-light/40 hover:bg-navy-lighter/60 hover:shadow-[inset_2px_0_0_0_hsl(var(--teal))] border-l-[3px] ${sev.border} focus:outline-none focus:ring-1 focus:ring-teal/40`}
                        >
                          <td className="w-1 p-0" />
                          <td className="py-3 px-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${r.source === 'Built-in' ? 'bg-purple/15 text-purple border border-purple/30' : 'bg-teal/15 text-teal border border-teal/30'}`}>{r.source}</span>
                          </td>
                          <td className="py-3 px-3 max-w-md">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {r.name}
                              {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{r.description}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${tm.tint}`}>
                              <TIcon className="w-3 h-3" />
                              {r.policyType}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sev.chip}`}>{r.severity}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass(r.status)}`}>{r.status}</span>
                          </td>
                          <td className="py-3 px-3">
                            {r.violations > 0 ? (
                              <button onClick={(e) => { e.stopPropagation(); setFilters({ policy: r.name }); setCurrentPage('inventory'); }} className={`font-bold tabular-nums hover:underline ${sev.text}`}>
                                {r.violations.toLocaleString()}
                              </button>
                            ) : <span className="text-success/70 font-medium tabular-nums">0</span>}
                          </td>
                          <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                            <button onClick={toggle}
                              className={`w-8 h-4 rounded-full transition-colors relative ${enabled ? 'bg-teal' : 'bg-muted'}`} title={enabled ? 'Disable' : 'Enable'}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                          </td>
                          <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                            <OverflowMenu
                              items={isCustom && customPol ? [
                                { label: 'Edit',    onClick: () => loadPolicyForEdit(customPol) },
                                { label: 'Clone',   onClick: () => { resetCreateForm(); const c = { ...customPol, id: `cpol-${Date.now()}`, name: `${customPol.name} (Copy)`, status: 'Draft', violations: 0 }; loadPolicyForEdit(c); } },
                                { label: customPol.status === 'Active' ? 'Deactivate' : 'Activate', onClick: () => togglePolicyStatus(r.id) },
                                { label: 'Delete',  onClick: () => deletePolicy(r.id), tone: 'danger' as const },
                              ] : [
                                { label: 'Clone to customize', onClick: () => cloneBuiltinToCustom(r) },
                              ]}
                            />
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-border bg-navy/40">
                            <td colSpan={9} className="px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                              {!isCustom && (
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div><span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">Policy Type</span><span className="font-medium">{r.policyType}</span></div>
                                  <div className="col-span-2"><span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">Framework reference</span><span className="font-medium text-foreground">{r.framework || '—'}</span></div>
                                </div>
                              )}
                              {isCustom && customPol && (
                                <>
                                  <div className="grid grid-cols-4 gap-3 text-xs">
                                    <div><span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">Asset Type</span><span className="font-medium">{customPol.assetType || 'All'}</span></div>
                                    <div className="col-span-2"><span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">Scope</span><span className="font-medium">{scopeSummary(customPol.scope)}</span></div>
                                    <div><span className="text-muted-foreground block mb-0.5 text-[10px] uppercase tracking-wide">Ticket</span><span className="font-medium">{ticketBadge(customPol)}</span></div>
                                  </div>
                                  {customPol.tags && customPol.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {customPol.tags.map(t => (
                                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{t}</span>
                                      ))}
                                    </div>
                                  )}
                                  {customPol.effectiveFrom && (
                                    <div className="text-[10px]"><span className="text-muted-foreground">Effective from: </span><span className="font-medium">{customPol.effectiveFrom}</span></div>
                                  )}
                                  {customPol.conditionSummary && (
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-wide">Conditions</span>
                                      <p className="text-[11px] font-mono bg-navy/60 border border-border rounded px-2 py-1.5">{customPol.conditionSummary}</p>
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {tab === 'templates' && (
        <div className="space-y-2">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  {['Template', 'Type', 'Description', 'Saved By', 'Times Used', 'Action'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  { key: 'pci-ssh' as const, name: 'PCI-DSS SSH Key Strength', type: 'SSH Key', desc: 'RSA keys under 2048 bits flagged as non-compliant per PCI-DSS.', author: 'platform-sec', uses: 42 },
                  { key: 'nist-ssh' as const, name: 'NIST SSH Baseline', type: 'SSH Key', desc: 'Disallows DSA keys and legacy MAC algorithms (hmac-sha1, hmac-md5).', author: 'crypto-team', uses: 28 },
                  { key: 'zero-trust-tls' as const, name: 'Zero-Trust TLS Validity', type: 'Certificate', desc: 'Production certificates must have validity ≤ 90 days.', author: 'identity-eng', uses: 67 },
                  { key: 'secret-rotation' as const, name: 'Secret Rotation Baseline', type: 'Secrets & Tokens', desc: 'Flags any secret not rotated within the last 90 days.', author: 'platform-sec', uses: 31 },
                  { key: 'untrusted-ca' as const, name: 'Untrusted Issuing CA', type: 'Certificate', desc: 'Flags certificates issued by CAs outside the approved issuer list.', author: 'crypto-team', uses: 19 },
                ]).map(t => (
                  <tr key={t.key} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold">{t.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.type}</td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-md">{t.desc}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.author}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.uses}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => openTemplate(t.key)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Use template</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Policy modal */}
          <Modal open={createOpen} onClose={closeCreateModal} title={editingPolicy ? 'Edit Policy' : 'Create Policy'} wide>
            <div className="w-full max-w-2xl space-y-5 text-foreground">
              {/* 0. AI authoring (top, above everything) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <label className="block text-[11px] font-medium">Describe this policy in plain English</label>
                  <InfoIcon text="AI fills the form below from your description. Review and edit before saving. AI never activates a policy." />
                </div>
                <div className="flex items-center gap-2 border border-teal/30 rounded-lg p-2 bg-teal/5">
                  <Sparkles className="w-3.5 h-3.5 text-teal shrink-0" />
                  <input
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runAIDraft(); } }}
                    placeholder='e.g. "flag production RSA certificates under 2048 bits expiring in 30 days"'
                    className="flex-1 min-w-0 bg-transparent text-[11px] outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={runAIDraft}
                    disabled={!aiInput.trim() || aiLoading}
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-teal text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Sparkles className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                    {aiLoading ? 'Drafting…' : 'Generate'}
                  </button>
                </div>

                {aiResult?.kind === 'unavailable' && (
                  <div className="text-[10px] text-amber border border-amber/30 bg-amber/5 rounded px-2 py-1.5">
                    AI assist temporarily unavailable. You can still fill in the form manually below.
                  </div>
                )}
                {aiResult?.kind === 'unresolvable' && (
                  <div className="text-[10px] border border-coral/30 bg-coral/5 rounded px-2 py-1.5 space-y-1">
                    <div className="text-coral font-medium">{aiResult.reason}</div>
                    <div className="text-muted-foreground">Try: {aiResult.suggestion}</div>
                  </div>
                )}
                {aiResult?.kind === 'ok' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-muted-foreground">
                      {aiResult.interpretations.length > 1
                        ? 'Your description is ambiguous. Pick an interpretation to fill the form:'
                        : 'Suggested fill — click to apply to the form:'}
                    </div>
                    {aiResult.interpretations.map(interp => {
                      const f = interp.fills;
                      const fillSummary: string[] = [];
                      if (f.policyType) fillSummary.push(`Type: ${f.policyType}`);
                      if (f.conditions) fillSummary.push(`Conditions: ${f.conditions.seeds.map(g => `(${g.map(r => describeCondition(f.policyType || formPolicyType, r)).join(' AND ')})`).join(` ${f.conditions.groupLogic} `)}`);
                      if (f.environments) fillSummary.push(`Scope: ${f.environments.join(', ')}`);
                      if (f.severity) fillSummary.push(`Severity: ${f.severity}`);
                      return (
                        <button key={interp.id} type="button" onClick={() => applyInterpretation(interp)}
                          className="w-full text-left border border-border rounded-lg px-2.5 py-2 bg-card hover:border-teal/50 hover:bg-teal/5 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-medium text-foreground">{interp.label}</span>
                            <ConfidenceChip level={interp.confidence} />
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground break-words">
                            {fillSummary.join(' · ')}
                          </div>
                          {interp.notes.length > 0 && (
                            <div className="text-[9px] text-muted-foreground/80 mt-1 italic">{interp.notes.join(' · ')}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">or fill in the form manually below</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>

              {/* 1. Identity */}
              <div className={sectionCardCls}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_0_3px_hsl(var(--card))]" />
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Policy Identity</p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="block text-[11px] font-medium">Policy Type*</label>
                        <AIMarker show={aiTouched.has('policyType')} />
                      </div>
                      <select value={formPolicyType} onChange={e => { setFormPolicyType(e.target.value); setConditionGroups([emptyGroup()]); markUserEdit('policyType'); markUserEdit('conditions'); }} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors">
                        {POLICY_TYPES.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="block text-[11px] font-medium">Tags (optional)</label>
                        <InfoIcon text="Free-form key:value tags for categorization, e.g. framework:PCI-DSS, owner:platform-sec. Type and press Enter." />
                      </div>
                      <ChipInput values={formTags} onChange={setFormTags} placeholder="e.g. framework:PCI-DSS" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-1">Policy Name*</label>
                    <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. PCI-DSS SSH Key Strength — Production" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-1">Description (optional)</label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2}
                      placeholder="Short description shown on the policy card"
                      className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors" />
                  </div>
                </div>
              </div>

              {/* 2. Conditions */}
              <div className={sectionCardCls}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_0_3px_hsl(var(--card))]" />
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Conditions</p>
                  <InfoIcon text="Flag an asset as Non-Compliant when these conditions match. Combine rows inside a group with AND/OR, and combine groups with AND/OR." />
                  <AIMarker show={aiTouched.has('conditions')} />
                </div>

                <ConditionBuilder
                  policyType={formPolicyType}
                  groups={conditionGroups}
                  groupLogic={groupLogic}
                  onChange={(g) => { setConditionGroups(g); markUserEdit('conditions'); }}
                  onGroupLogicChange={(l) => { setGroupLogic(l); markUserEdit('conditions'); }}
                />
              </div>

              {/* 3. Scope */}
              <div className={sectionCardCls}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple shadow-[0_0_0_3px_hsl(var(--card))]" />
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Scope</p>
                  <InfoIcon text="Optional. Narrow where this policy applies. Empty = evaluate all assets of this type. Groups are OR; attribute refinement is AND across dimensions, OR within a dimension." />
                  <AIMarker show={aiTouched.has('environments')} />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5">Asset Groups</label>
                    <select
                      onChange={e => {
                        const v = e.target.value;
                        if (v && !scope.groupIds.includes(v)) setScope(s => ({ ...s, groupIds: [...s.groupIds, v] }));
                        e.target.value = '';
                      }}
                      className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors"
                    >
                      <option value="">Add an Asset Group…</option>
                      {mockGroups.filter(g => !scope.groupIds.includes(g.id)).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <TagChips
                      values={scope.groupIds.map(id => ({ id, label: mockGroups.find(g => g.id === id)?.name || id }))}
                      onRemove={id => setScope(s => ({ ...s, groupIds: s.groupIds.filter(x => x !== id) }))}
                    />
                  </div>

                  <button type="button" onClick={() => setShowRefine(v => !v)} className="inline-flex items-center gap-1 text-[10px] text-teal font-medium px-2 py-1 -mx-2 rounded hover:bg-teal/10 transition-colors">
                    {showRefine ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Refine by attribute
                  </button>
                  {showRefine && (
                    <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-purple/40">
                      <ChipMulti label="Environment" options={ENV_OPTIONS} values={scope.environments} onChange={v => { setScope(s => ({ ...s, environments: v })); markUserEdit('environments'); }} />
                      <ChipMulti label="Cloud Provider" options={CLOUD_OPTIONS} values={scope.providers} onChange={v => setScope(s => ({ ...s, providers: v }))} />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Severity */}
              <div className={sectionCardCls}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_0_3px_hsl(var(--card))]" />
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Severity</p>
                  <InfoIcon text="Sets risk weighting for this policy and, when a ticket is created, the default ticket priority." />
                  <AIMarker show={aiTouched.has('severity')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select value={formSeverity} onChange={e => {
                    const v = e.target.value;
                    setFormSeverity(v);
                    setTicket(t => ({ ...t, snowPriority: severityToSnowPriority(v), jiraPriority: severityToJiraPriority(v) }));
                    markUserEdit('severity');
                  }} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors">
                    {['Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                  </select>
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
                  <button type="button" onClick={() => setShowNotify(v => !v)} className="w-full flex items-center justify-between px-3 py-2 bg-card/40 hover:bg-muted/30">
                    <span className="text-[11px] font-medium">Notification (Email)</span>
                    {showNotify ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {showNotify && (
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Recipients</label>
                        <input value={notify.email} onChange={e => setNotify(n => ({ ...n, email: e.target.value }))}
                          placeholder="security@acme.com, crypto-team@acme.com"
                          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                      </div>
                      <label className="flex items-center gap-2 text-[11px]">
                        <input type="checkbox" checked={notify.onNewViolation} onChange={e => setNotify(n => ({ ...n, onNewViolation: e.target.checked }))} className="rounded" />
                        Notify on new violation
                      </label>
                    </div>
                  )}
                </div>

                {/* Ticket */}
                <div className="border border-border rounded-lg overflow-hidden mt-2">
                  <div className="w-full flex items-center justify-between px-3 py-2 bg-card/40">
                    <button type="button" onClick={() => setShowTicket(v => !v)} className="flex-1 flex items-center gap-2 text-left">
                      <span className="text-[11px] font-medium">Create a ticket</span>
                      <InfoIcon text="When enabled, each new violation opens a ticket. Priority defaults from policy Severity and can be overridden." />
                    </button>
                    <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{ticket.enabled ? 'On' : 'Off'}</span>
                      <button type="button" onClick={() => { setTicket(t => ({ ...t, enabled: !t.enabled })); if (!ticket.enabled) setShowTicket(true); }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${ticket.enabled ? 'bg-teal' : 'bg-muted'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${ticket.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      {showTicket ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </label>
                  </div>
                  {showTicket && ticket.enabled && (
                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium mb-1.5">Ticketing system</label>
                        <div className="inline-flex rounded-md border border-border overflow-hidden">
                          {(['servicenow', 'jira'] as TicketSystem[]).map(s => (
                            <button key={s} type="button" onClick={() => setTicket(t => ({ ...t, system: s }))}
                              className={`px-3 py-1 text-[11px] ${ticket.system === s ? 'bg-teal text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
                              {s === 'servicenow' ? 'ServiceNow' : 'Jira'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {ticket.system === 'servicenow' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Record type</label>
                            <input value="Incident" disabled className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted text-muted-foreground" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Assignment group</label>
                            <input value={ticket.assignmentGroup || ''} onChange={e => setTicket(t => ({ ...t, assignmentGroup: e.target.value }))}
                              placeholder="e.g. Crypto-Security"
                              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Priority</label>
                            <select value={ticket.snowPriority || '2-High'} onChange={e => setTicket(t => ({ ...t, snowPriority: e.target.value as TicketConfig['snowPriority'] }))}
                              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['1-Critical', '2-High', '3-Moderate', '4-Low'].map(o => <option key={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {ticket.system === 'jira' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Project key</label>
                            <input value={ticket.projectKey || ''} onChange={e => setTicket(t => ({ ...t, projectKey: e.target.value.toUpperCase() }))}
                              placeholder="e.g. SEC"
                              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Issue type</label>
                            <select value={ticket.issueType || 'Task'} onChange={e => setTicket(t => ({ ...t, issueType: e.target.value as 'Task' | 'Bug' }))}
                              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['Task', 'Bug'].map(o => <option key={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Priority</label>
                            <select value={ticket.jiraPriority || 'High'} onChange={e => setTicket(t => ({ ...t, jiraPriority: e.target.value as TicketConfig['jiraPriority'] }))}
                              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['Highest', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
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
                <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors" />
              </div>

              {/* 7. Preview */}
              <div className={sectionCardCls}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_0_3px_hsl(var(--card))]" />
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Impact Preview</p>
                    <InfoIcon text="Dry-run against Inventory. Writes nothing, sends nothing." />
                  </div>
                  <button type="button" onClick={runPreview} disabled={!hasAnyCondition}
                    className="text-[10px] px-3 py-1.5 rounded-md bg-teal/10 text-teal hover:bg-teal/20 border border-teal/20 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Run preview
                  </button>
                </div>
                {!preview && (
                  <p className="text-[11px] text-muted-foreground">Add a condition and run preview to see impact.</p>
                )}
                {preview && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      <div className="border border-border rounded-lg p-2 bg-card"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">In Scope</div><div className="font-semibold mt-0.5">{preview.inScope.toLocaleString()}</div></div>
                      <div className="border border-border rounded-lg p-2 bg-card"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">Compliant</div><div className="font-semibold mt-0.5 text-teal">{preview.compliant.toLocaleString()}</div></div>
                      <div className="border border-border rounded-lg p-2 bg-card"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">Non-Compliant</div><div className="font-semibold mt-0.5 text-coral">{preview.nonCompliant.toLocaleString()}</div></div>
                      <div className="border border-border rounded-lg p-2 bg-card"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">Excepted</div><div className="font-semibold mt-0.5 text-muted-foreground">{preview.excepted.toLocaleString()}</div></div>
                    </div>
                    {preview.sample.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Sample of assets that would be flagged:</p>
                        <ul className="text-[10px] font-mono bg-muted/40 border border-border rounded-lg px-2 py-1.5 space-y-0.5">
                          {preview.sample.map((s, i) => (
                            <li key={i}><span className="text-foreground">{s.name}</span> <span className="text-muted-foreground">— {s.failing}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-border bg-card/95 backdrop-blur px-4 py-3 flex justify-end gap-2">
                <button onClick={closeCreateModal} className="px-4 py-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30 transition-colors">Save as Draft</button>
                <button onClick={() => handleSave(false)} className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal text-primary-foreground hover:bg-teal-light shadow-[0_4px_14px_-4px_hsl(var(--teal)/0.5)] transition-colors">
                  Save &amp; Activate
                </button>
              </div>
            </div>
          </Modal>
      <Modal open={!!configModal} onClose={() => setConfigModal(null)} title="Configure Policy">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Alert Threshold (days before expiry)</label>
            <div className="flex gap-2 mt-1">
              {[30, 14, 7].map(d => (
                <label key={d} className="flex items-center gap-1 text-xs"><input type="checkbox" defaultChecked className="rounded" /> {d}d</label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Severity</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs">
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfigModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            <button onClick={() => { setConfigModal(null); toast.success('Policy configuration saved'); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
