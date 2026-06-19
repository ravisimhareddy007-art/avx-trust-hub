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
  Download,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Key,
  Lock,
  X,
  Info,
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

type PolicyType = 'ssh-key' | 'certificates' | 'secrets' | 'crypto-keys' | '';

const getPolicyTypeMeta = (type: PolicyType) => {
  switch (type) {
    case 'ssh-key':      return { label: 'SSH Keys', icon: Key, cls: 'bg-amber/10 text-amber border-amber/20' };
    case 'certificates': return { label: 'Certificates', icon: Shield, cls: 'bg-teal/10 text-teal border-teal/20' };
    case 'secrets':      return { label: 'Secrets & API Keys', icon: Lock, cls: 'bg-purple/10 text-purple border-purple/20' };
    case 'crypto-keys':  return { label: 'Cryptographic Keys', icon: Key, cls: 'bg-teal/10 text-teal border-teal/20' };
    default: return null;
  }
};

const getPolicyTypeFromAssetType = (assetType?: string): PolicyType => {
  const v = (assetType || '').toLowerCase();
  if (v.includes('ssh key')) return 'ssh-key';
  if (v.includes('cryptographic key')) return 'crypto-keys';
  if (v.includes('secret') || v.includes('api key')) return 'secrets';
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
  return policyType.includes('Cryptographic Key') ? 'Cryptographic Key'
    : policyType.includes('Certificate') ? 'TLS Certificate'
    : policyType.includes('SSH') ? 'SSH Key'
    : 'API Key / Secret';
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

function SectionHeading({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <InfoIcon text={info} />
    </div>
  );
}

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

interface Interpretation {
  id: string;
  label: string;
  seeds: { field: string; operator: string; value: string }[][];
  groupLogic: 'AND' | 'OR';
  confidence: Confidence;
  notes: string[];
}

type DraftResult =
  | { kind: 'ok'; interpretations: Interpretation[] }
  | { kind: 'unresolvable'; reason: string; suggestion: string }
  | { kind: 'unavailable' };

function draftInterpretations(input: string, policyType: string): DraftResult {
  // Simulated unavailability hook for demo/testing.
  if (/\boffline\b|@@unavailable/.test(input)) return { kind: 'unavailable' };

  const fields = (FIELDS_BY_POLICY_TYPE as Record<string, { id: string }[]>)[policyType] || [];
  const hasField = (id: string) => fields.some(f => f.id === id);
  const d = input.toLowerCase();

  const dayMatch = d.match(/(\d+)\s*day/);
  const days = dayMatch ? dayMatch[1] : null;
  const bitsMatch = d.match(/\b(1024|2048|3072|4096)\b/);
  const bits = bitsMatch ? bitsMatch[1] : null;

  // ── Ambiguity: vague rotation threshold ─────────────────────────────────
  const vagueTime = /(a while|recently|soon|stale|old\b|long time)/.test(d);
  const rotationMention = /rotat/.test(d);
  if (vagueTime && rotationMention && !days && hasField('days_since_rotation')) {
    return {
      kind: 'ok',
      interpretations: [
        { id: 'r90', label: 'Not rotated in over 90 days',
          seeds: [[{ field: 'days_since_rotation', operator: 'gt', value: '90' }]],
          groupLogic: 'AND', confidence: 'Medium', notes: ['Threshold inferred from vague time'] },
        { id: 'r180', label: 'Not rotated in over 180 days',
          seeds: [[{ field: 'days_since_rotation', operator: 'gt', value: '180' }]],
          groupLogic: 'AND', confidence: 'Medium', notes: ['Threshold inferred from vague time'] },
        { id: 'r365', label: 'Not rotated in over 365 days',
          seeds: [[{ field: 'days_since_rotation', operator: 'gt', value: '365' }]],
          groupLogic: 'AND', confidence: 'Low', notes: ['Threshold is a coarse guess'] },
      ],
    };
  }

  // ── Ambiguity: "weak" without specifics ─────────────────────────────────
  const weakOnly = /\bweak\b/.test(d) && !/sha|md5|rsa|dsa|bit|ecdsa|ed25519/.test(d);
  if (weakOnly) {
    if (policyType === 'Managed Certificate Policy') {
      return {
        kind: 'ok',
        interpretations: [
          { id: 'algo', label: 'Weak signature algorithm (SHA-1 or MD5)',
            seeds: [[{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]],
            groupLogic: 'AND', confidence: 'Medium', notes: ['"Weak" mapped to signature algorithm'] },
          { id: 'bits', label: 'RSA keys under 2048 bits',
            seeds: [[{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]],
            groupLogic: 'AND', confidence: 'Medium', notes: ['"Weak" mapped to key length'] },
          { id: 'qv', label: 'Quantum-vulnerable algorithms',
            seeds: [[{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]],
            groupLogic: 'AND', confidence: 'Medium', notes: ['"Weak" mapped to quantum risk'] },
        ],
      };
    }
    if (policyType === 'SSH Key Policy') {
      return {
        kind: 'ok',
        interpretations: [
          { id: 'dsa', label: 'DSA key type',
            seeds: [[{ field: 'key_type', operator: 'eq', value: 'DSA' }]],
            groupLogic: 'AND', confidence: 'Medium', notes: ['"Weak" mapped to algorithm'] },
          { id: 'bits', label: 'RSA keys under 2048 bits',
            seeds: [[{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]],
            groupLogic: 'AND', confidence: 'Medium', notes: ['"Weak" mapped to key length'] },
          { id: 'mac', label: 'Legacy MAC algorithms (hmac-sha1, hmac-md5)',
            seeds: [[{ field: 'mac_algo', operator: 'in', value: 'hmac-sha1,hmac-md5' }]],
            groupLogic: 'AND', confidence: 'Medium', notes: ['"Weak" mapped to MAC algorithm'] },
        ],
      };
    }
  }

  // ── Direct mapping path ─────────────────────────────────────────────────
  const seeds: { field: string; operator: string; value: string }[][] = [];
  const assumptions: string[] = [];
  let confidence: Confidence = 'High';

  if (policyType === 'Managed Certificate Policy') {
    if (/sha-?1|md5/.test(d) && hasField('sig_algo')) seeds.push([{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]);
    if (/self.?sign/.test(d) && hasField('is_self_signed')) seeds.push([{ field: 'is_self_signed', operator: 'is_true', value: '' }]);
    if (/wildcard/.test(d) && hasField('is_wildcard')) seeds.push([{ field: 'is_wildcard', operator: 'is_true', value: '' }]);
    if (/expir/.test(d) && days && hasField('expiry_days')) seeds.push([{ field: 'expiry_days', operator: 'lt', value: days }]);
    if (/(untrusted|unapproved|approved ca|not approved)/.test(d) && hasField('issuing_ca'))
      seeds.push([{ field: 'issuing_ca', operator: 'nin', value: 'DigiCert,Sectigo,internal-Root-G2' }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe|pqc.?risk)/.test(d) && hasField('quantum_vuln'))
      seeds.push([{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]);
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
  } else if (policyType === 'Secrets & API Keys Policy') {
    if (/(no expiry|without expiry|missing expiry)/.test(d) && hasField('has_expiry'))
      seeds.push([{ field: 'has_expiry', operator: 'is_false', value: '' }]);
    if (/rotat/.test(d) && days && hasField('days_since_rotation'))
      seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
  } else if (policyType === 'Cryptographic Key Policy') {
    if (/(no rotation|rotation disabled)/.test(d) && hasField('rotation_enabled'))
      seeds.push([{ field: 'rotation_enabled', operator: 'is_false', value: '' }]);
    if (/rotat/.test(d) && days && hasField('days_since_rotation'))
      seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
    if (/(quantum.?vuln|quantum.?unsafe|not quantum.?safe)/.test(d) && hasField('quantum_vuln'))
      seeds.push([{ field: 'quantum_vuln', operator: 'eq', value: 'Quantum-Vulnerable' }]);
  }

  if (!seeds.length) {
    return {
      kind: 'unresolvable',
      reason: `Couldn't map your description to any field on "${policyType}".`,
      suggestion: 'Name a concrete field, e.g. "flag certificates using SHA-1", "secrets not rotated in 90 days", or "SSH RSA keys under 2048 bits".',
    };
  }

  if (/produc|staging|develop/.test(d)) { confidence = 'Medium'; assumptions.push('Environment qualifier inferred (not added to conditions; set Scope > Environment).'); }
  if (/\bweak\b/.test(d)) { confidence = confidence === 'High' ? 'Medium' : confidence; assumptions.push('"Weak" mapped to a default interpretation.'); }

  const groupLogic: 'AND' | 'OR' = seeds.length > 1 ? 'OR' : 'AND';
  const label = seeds.length === 1
    ? seeds[0].map(r => describeCondition(policyType, r)).join(' AND ')
    : seeds.map(g => `(${g.map(r => describeCondition(policyType, r)).join(' AND ')})`).join(' OR ');

  return { kind: 'ok', interpretations: [{ id: 'main', label, seeds, groupLogic, confidence, notes: assumptions }] };
}

function ConfidenceChip({ level }: { level: Confidence }) {
  const cls = level === 'High' ? 'bg-teal/15 text-teal border-teal/40'
    : level === 'Medium' ? 'bg-amber/15 text-amber border-amber/40'
    : 'bg-coral/15 text-coral border-coral/40';
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${cls}`}>{level} confidence</span>;
}

// ──────────────────────────────────────────────────────────────────────────────


export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  // Create-policy modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [formPolicyType, setFormPolicyType] = useState('Managed Certificate Policy');
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

  // AI assist (lives inside Conditions section)
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<DraftResult | null>(null);

  const resetCreateForm = () => {
    setFormPolicyType('Managed Certificate Policy');
    setFormName(''); setFormDescription(''); setFormTags([]); setFormSeverity('High');
    setScope(emptyScope()); setShowRefine(false);
    setNotify(emptyNotify()); setTicket(emptyTicket());
    setShowNotify(false); setShowTicket(false);
    setEffectiveFrom('');
    setConditionGroups([emptyGroup()]); setGroupLogic('AND');
    setPreview(null); setEditingPolicy(null);
    setAiInput(''); setAiResult(null); setAiLoading(false);
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
      setFormPolicyType('Managed Certificate Policy'); setFormTags(['framework:Zero-Trust']);
      setFormName('Zero-Trust TLS Validity'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'validity_days', operator: 'gt', value: '90' }]]));
    } else if (template === 'dora-cert') {
      setFormPolicyType('Managed Certificate Policy'); setFormTags(['framework:DORA']);
      setFormName('DORA Weak Algorithm'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]]));
    } else if (template === 'secret-rotation') {
      setFormPolicyType('Secrets & API Keys Policy');
      setFormName('Secret Rotation Baseline'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'days_since_rotation', operator: 'gt', value: '90' }]]));
    } else if (template === 'untrusted-ca') {
      setFormPolicyType('Managed Certificate Policy'); setFormTags(['scope:internal']);
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
        const result = draftInterpretations(text, formPolicyType);
        setAiResult(result);
      } catch {
        setAiResult({ kind: 'unavailable' });
      }
      setAiLoading(false);
    }, 450);
  };

  const applyInterpretation = (interp: Interpretation) => {
    setConditionGroups(seedGroups(interp.seeds));
    setGroupLogic(interp.groupLogic);
    setAiResult(null);
    toast.success('Conditions drafted — review and adjust before saving');
  };

  const hasAnyCondition = conditionGroups.some(g => g.rows.some(r => r.field && r.operator));

  const runPreview = () => {
    if (!hasAnyCondition) { toast.error('Add at least one condition first'); return; }
    const at = assetTypeFor(formPolicyType);
    const base = at === 'TLS Certificate' ? 18420 : at === 'SSH Key' ? 9650 : at === 'Cryptographic Key' ? 3120 : 4780;
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
      : at === 'Cryptographic Key'
      ? ['kms-payments-master', 'aws-kms-prod-rds', 'azkv-prod-signer', 'fortanix-hsm-root', 'gcp-kms-data-eu']
      : ['stripe-api-key', 'okta-svc-token', 'github-deploy-key', 'snowflake-readonly', 'pagerduty-int'];
    const sample = sampleNames.slice(0, Math.min(5, nonCompliant)).map((name, i) => ({
      name,
      failing: describeCondition(formPolicyType, allRows[i % allRows.length]) || 'condition match',
    }));
    setPreview({ inScope, compliant, nonCompliant, excepted, sample });
  };

  React.useEffect(() => { setPreview(null); }, [conditionGroups, groupLogic, scope, formPolicyType, effectiveFrom]);

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
    if ((p.assetType || '').includes('SSH')) setFormPolicyType('SSH Key Policy');
    else if ((p.assetType || '').includes('Cryptographic Key')) setFormPolicyType('Cryptographic Key Policy');
    else if ((p.assetType || '').includes('Secret') || (p.assetType || '').includes('API')) setFormPolicyType('Secrets & API Keys Policy');
    else setFormPolicyType('Managed Certificate Policy');
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy Builder</h1>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: 'outofbox' as const, label: 'Out-of-Box Policies' },
          { id: 'custom' as const, label: 'Custom Policies' },
          { id: 'compliance' as const, label: 'Compliance Frameworks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'outofbox' && (
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search policies..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  {['Policy', 'Severity', 'Affected Assets', 'Last Triggered', 'Enabled', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map(policy => (
                  <tr key={policy.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-semibold">{policy.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{policy.description}</div>
                    </td>
                    <td className="py-2.5 px-3"><SeverityBadge severity={policy.severity} /></td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => { setFilters({ policy: policy.name }); setCurrentPage('inventory'); }} className="text-teal hover:underline">
                        {policy.affectedAssets.toLocaleString()}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{policy.lastTriggered}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => { setPolicyStates(prev => ({ ...prev, [policy.id]: !prev[policy.id] })); toast.success(`Policy ${policyStates[policy.id] ? 'disabled' : 'enabled'}`); }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${policyStates[policy.id] ? 'bg-teal' : 'bg-muted'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${policyStates[policy.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => setConfigModal(policy.id)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Quick start from a template:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              <button onClick={() => openTemplate('pci-ssh')} className="text-teal hover:underline">PCI-DSS SSH</button>
              <button onClick={() => openTemplate('nist-ssh')} className="text-teal hover:underline">NIST SSH</button>
              <button onClick={() => openTemplate('zero-trust-tls')} className="text-teal hover:underline">Zero-Trust TLS</button>
              <button onClick={() => openTemplate('dora-cert')} className="text-teal hover:underline">DORA Certs</button>
              <button onClick={() => openTemplate('secret-rotation')} className="text-teal hover:underline">Secret Rotation</button>
              <button onClick={() => openTemplate('untrusted-ca')} className="text-teal hover:underline">Untrusted Issuing CA</button>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
              <Plus className="w-3 h-3" /> Create Policy
            </button>
          </div>

          {userPolicies.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No custom policies yet</p>
              <button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="text-xs text-teal hover:underline">Create your first policy</button>
            </div>
          ) : (
            <div className="space-y-2">
              {userPolicies.map(p => {
                const typeBadge = getPolicyTypeBadgeFromAsset(p.assetType);
                return (
                  <div key={p.id} className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedPolicy(expandedPolicy === p.id ? null : p.id)}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'Active' ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-xs font-semibold truncate">{p.name}</p>
                            {typeBadge && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${typeBadge.cls}`}>
                                <typeBadge.icon className="w-3 h-3" />
                                {typeBadge.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.violations > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/10 text-coral font-medium">{p.violations} violations</span>}
                        {p.severity && <span className="text-[10px] text-muted-foreground">{p.severity}</span>}
                        {expandedPolicy === p.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedPolicy === p.id && (
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div><span className="text-muted-foreground block mb-0.5">Asset Type</span><span className="font-medium">{p.assetType || 'All'}</span></div>
                          <div className="col-span-2"><span className="text-muted-foreground block mb-0.5">Scope</span><span className="font-medium">{scopeSummary(p.scope)}</span></div>
                          <div><span className="text-muted-foreground block mb-0.5">Ticket</span><span className="font-medium">{ticketBadge(p)}</span></div>
                        </div>
                        {p.tags && p.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {p.tags.map(t => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{t}</span>
                            ))}
                          </div>
                        )}
                        {p.effectiveFrom && (
                          <div className="text-[10px]"><span className="text-muted-foreground">Effective from: </span><span className="font-medium">{p.effectiveFrom}</span></div>
                        )}
                        {p.conditionSummary && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-1">Conditions</span>
                            <p className="text-[11px] font-mono bg-muted/40 border border-border rounded px-2 py-1.5">{p.conditionSummary}</p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => loadPolicyForEdit(p)} className="text-[10px] px-3 py-1.5 rounded bg-muted text-foreground hover:bg-muted/80">Edit</button>
                          <button onClick={() => togglePolicyStatus(p.id)} className={`text-[10px] px-3 py-1.5 rounded ${p.status === 'Active' ? 'bg-amber/10 text-amber hover:bg-amber/20' : 'bg-teal/10 text-teal hover:bg-teal/20'}`}>
                            {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => deletePolicy(p.id)} className="text-[10px] px-3 py-1.5 rounded bg-coral/10 text-coral hover:bg-coral/20">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Create / Edit Policy modal */}
          <Modal open={createOpen} onClose={closeCreateModal} title={editingPolicy ? 'Edit Policy' : 'Create Policy'} wide>
            <div className="w-full max-w-2xl space-y-5 text-foreground">
              {/* 1. Identity */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Policy Type*</label>
                    <select value={formPolicyType} onChange={e => { setFormPolicyType(e.target.value); setConditionGroups([emptyGroup()]); }} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
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
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. PCI-DSS SSH Key Strength — Production" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium">Description</label>
                    <button type="button" onClick={handleAIDraft} disabled={formDescription.trim().length < 10} className="inline-flex items-center gap-1 text-[10px] text-teal font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                      <Sparkles className={aiLoading ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
                      Generate from description
                    </button>
                  </div>
                  <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2}
                    placeholder="e.g. flag certs using SHA-1 or issued by an unapproved CA in Production"
                    className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>
              </div>

              {/* 2. Conditions */}
              <div className="border-t border-border pt-4">
                <SectionHeading
                  label="Conditions"
                  info="Flag an asset as Non-Compliant when these conditions match. Combine rows inside a group with AND/OR, and combine groups with AND/OR."
                />
                <ConditionBuilder
                  policyType={formPolicyType}
                  groups={conditionGroups}
                  groupLogic={groupLogic}
                  onChange={setConditionGroups}
                  onGroupLogicChange={setGroupLogic}
                />
              </div>

              {/* 3. Scope */}
              <div className="border-t border-border pt-4">
                <SectionHeading
                  label="Scope"
                  info="Optional. Narrow where this policy applies. Empty = evaluate all assets of this type. Groups are OR; attribute refinement is AND across dimensions, OR within a dimension."
                />
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5">Asset Groups</label>
                    <select
                      onChange={e => {
                        const v = e.target.value;
                        if (v && !scope.groupIds.includes(v)) setScope(s => ({ ...s, groupIds: [...s.groupIds, v] }));
                        e.target.value = '';
                      }}
                      className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
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

                  <button type="button" onClick={() => setShowRefine(v => !v)} className="inline-flex items-center gap-1 text-[10px] text-teal font-medium hover:underline">
                    {showRefine ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Refine by attribute
                  </button>
                  {showRefine && (
                    <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-border">
                      <ChipMulti label="Environment" options={ENV_OPTIONS} values={scope.environments} onChange={v => setScope(s => ({ ...s, environments: v }))} />
                      <ChipMulti label="Cloud Provider" options={CLOUD_OPTIONS} values={scope.providers} onChange={v => setScope(s => ({ ...s, providers: v }))} />
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Severity */}
              <div className="border-t border-border pt-4">
                <SectionHeading
                  label="Severity"
                  info="Sets risk weighting for this policy and, when a ticket is created, the default ticket priority."
                />
                <div className="grid grid-cols-2 gap-4">
                  <select value={formSeverity} onChange={e => {
                    const v = e.target.value;
                    setFormSeverity(v);
                    setTicket(t => ({ ...t, snowPriority: severityToSnowPriority(v), jiraPriority: severityToJiraPriority(v) }));
                  }} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                    {['Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* 5. On Violation */}
              <div className="border-t border-border pt-4">
                <SectionHeading
                  label="On Violation"
                  info="Matched assets are flagged Non-Compliant. Optionally notify by email and/or open a ticket. Custom policies never block or remediate."
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
              <div className="border-t border-border pt-4">
                <SectionHeading
                  label="Effective from"
                  info="Optional. Empty = evaluate all existing assets immediately (may flag many legacy assets). Set a date to only evaluate assets created or changed on or after that date."
                />
                <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
              </div>

              {/* 7. Preview */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Impact Preview</p>
                    <InfoIcon text="Dry-run against Inventory. Writes nothing, sends nothing." />
                  </div>
                  <button type="button" onClick={runPreview} disabled={!hasAnyCondition}
                    className="text-[10px] px-3 py-1.5 rounded bg-teal/10 text-teal hover:bg-teal/20 disabled:opacity-40 disabled:cursor-not-allowed">
                    Run preview
                  </button>
                </div>
                {!preview && (
                  <p className="text-[11px] text-muted-foreground">Add a condition and run preview to see impact.</p>
                )}
                {preview && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      <div className="border border-border rounded p-2"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">In Scope</div><div className="font-semibold mt-0.5">{preview.inScope.toLocaleString()}</div></div>
                      <div className="border border-border rounded p-2"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">Compliant</div><div className="font-semibold mt-0.5 text-teal">{preview.compliant.toLocaleString()}</div></div>
                      <div className="border border-border rounded p-2"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">Non-Compliant</div><div className="font-semibold mt-0.5 text-coral">{preview.nonCompliant.toLocaleString()}</div></div>
                      <div className="border border-border rounded p-2"><div className="text-muted-foreground text-[9px] uppercase tracking-wide">Excepted</div><div className="font-semibold mt-0.5 text-muted-foreground">{preview.excepted.toLocaleString()}</div></div>
                    </div>
                    {preview.sample.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Sample of assets that would be flagged:</p>
                        <ul className="text-[10px] font-mono bg-muted/40 border border-border rounded px-2 py-1.5 space-y-0.5">
                          {preview.sample.map((s, i) => (
                            <li key={i}><span className="text-foreground">{s.name}</span> <span className="text-muted-foreground">— {s.failing}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-4 py-3 flex justify-end gap-2">
                <button onClick={closeCreateModal} className="px-4 py-2 text-xs rounded-lg hover:bg-muted">Cancel</button>
                <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
                <button onClick={() => handleSave(false)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
                  Save &amp; Activate
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'compliance' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'DORA', policies: 12, score: 78, violations: 42, lastAssessed: '2 days ago' },
            { name: 'PCI-DSS v4.0', policies: 18, score: 85, violations: 31, lastAssessed: '1 day ago' },
            { name: 'HIPAA', policies: 8, score: 92, violations: 8, lastAssessed: '3 days ago' },
            { name: 'FIPS 140-2', policies: 15, score: 71, violations: 56, lastAssessed: '1 day ago' },
          ].map(fw => (
            <div key={fw.name} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{fw.name}</h3>
                <span className={`text-lg font-bold ${fw.score >= 90 ? 'text-teal' : fw.score >= 75 ? 'text-amber' : 'text-coral'}`}>{fw.score}%</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground mb-3">
                <p>Mapped policies: {fw.policies}</p>
                <p>Open violations: <span className="text-coral">{fw.violations}</span></p>
                <p>Last assessed: {fw.lastAssessed}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toast.info(`Viewing ${fw.name} details`)} className="text-[10px] px-3 py-1.5 rounded bg-muted text-foreground hover:bg-muted/80">View Details</button>
                <button onClick={() => toast.success(`Generating ${fw.name} report...`)} className="text-[10px] px-3 py-1.5 rounded bg-teal/10 text-teal hover:bg-teal/20 flex items-center gap-1"><Download className="w-3 h-3" /> Generate Report</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
