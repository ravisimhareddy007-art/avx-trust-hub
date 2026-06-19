import { FEATURES } from '@/config/features';
import React, { useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies as initialCustomPolicies } from '@/data/mockData';
import { mockGroups } from '@/data/inventoryMockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import ConditionBuilder, { ConditionGroup, emptyGroup } from '@/components/policies/ConditionBuilder';
import { POLICY_TYPES, describeCondition, fieldsFor } from '@/components/policies/policyFields';
import {
  INITIAL_VALUE_SETS,
  INITIAL_RESPONSE_PROFILES,
  VALUE_SET_TYPE_LABEL,
  profileChannelSummary,
  ValueSet,
  ValueSetType,
  ResponseProfile,
} from '@/data/policyEngineData';
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
  Trash2,
  Star,
} from 'lucide-react';

interface ScopeConfig {
  groupIds: string[];
  environments: string[];
  providers: string[];
}

type Mode = 'Monitor' | 'Enforce';

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
  tag?: string;
  subCategory?: 'Classical' | 'PQC';
  responseProfileId?: string | null;
  mode?: Mode;
  effectiveFrom?: string | null;
  valueSetRefs?: string[];
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

function assetTypeFor(policyType: string) {
  return policyType.includes('Cryptographic Key') ? 'Cryptographic Key'
    : policyType.includes('Certificate') ? 'TLS Certificate'
    : policyType.includes('SSH') ? 'SSH Key'
    : 'API Key / Secret';
}

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
};

// ──────────────────────────────────────────────────────────────────────────────
// Small reusable bits

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

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'valuesets' | 'profiles' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies.map(p => ({ ...p, mode: 'Monitor' as Mode })));
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  // Org-level surfaces
  const [valueSets, setValueSets] = useState<ValueSet[]>(INITIAL_VALUE_SETS);
  const [profiles, setProfiles] = useState<ResponseProfile[]>(INITIAL_RESPONSE_PROFILES);
  const defaultProfileId = profiles.find(p => p.isDefault)?.id || profiles[0]?.id || null;

  // Create-policy modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [formPolicyType, setFormPolicyType] = useState('Managed Certificate Policy');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTag, setFormTag] = useState('Default');
  const [formSubCategory, setFormSubCategory] = useState<'Classical' | 'PQC'>('Classical');
  const [formSeverity, setFormSeverity] = useState('High');
  const [scope, setScope] = useState<ScopeConfig>(emptyScope());
  const [showRefine, setShowRefine] = useState(false);
  const [responseProfileId, setResponseProfileId] = useState<string | null>(defaultProfileId);
  const [mode, setMode] = useState<Mode>('Monitor');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const resetCreateForm = () => {
    setFormPolicyType('Managed Certificate Policy');
    setFormName(''); setFormDescription(''); setFormTag('Default'); setFormSeverity('High'); setFormSubCategory('Classical');
    setScope(emptyScope()); setShowRefine(false);
    setResponseProfileId(defaultProfileId); setMode('Monitor'); setEffectiveFrom('');
    setConditionGroups([emptyGroup()]); setGroupLogic('AND');
    setPreview(null); setEditingPolicy(null);
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
      setFormPolicyType('SSH Key Policy'); setFormTag('PCI-DSS');
      setFormName('PCI-DSS SSH Key Strength'); setFormSeverity('Critical');
      setConditionGroups(seedGroups([[{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]]));
    } else if (template === 'nist-ssh') {
      setFormPolicyType('SSH Key Policy'); setFormTag('NIST');
      setFormName('NIST SSH Baseline'); setFormSeverity('High');
      setConditionGroups(seedGroups([
        [{ field: 'key_type', operator: 'eq', value: 'DSA' }],
        [{ field: 'mac_algo', operator: 'in', value: 'hmac-sha1,hmac-md5' }],
      ]));
      setGroupLogic('OR');
    } else if (template === 'zero-trust-tls') {
      setFormPolicyType('Managed Certificate Policy'); setFormTag('Zero-Trust');
      setFormName('Zero-Trust TLS Validity'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'validity_days', operator: 'gt', value: '90' }]]));
    } else if (template === 'dora-cert') {
      setFormPolicyType('Managed Certificate Policy'); setFormTag('DORA');
      setFormName('DORA Weak Algorithm'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]]));
    } else if (template === 'secret-rotation') {
      setFormPolicyType('Secrets & API Keys Policy');
      setFormName('Secret Rotation Baseline'); setFormSeverity('High');
      setConditionGroups(seedGroups([[{ field: 'days_since_rotation', operator: 'gt', value: '90' }]]));
    } else if (template === 'untrusted-ca') {
      setFormPolicyType('Managed Certificate Policy'); setFormTag('Internal');
      setFormName('Untrusted Issuing CA'); setFormSeverity('High');
      const cas = valueSets.find(v => v.type === 'ca-list');
      setConditionGroups(seedGroups([[{ field: 'issuing_ca', operator: 'is_not_in_set', value: cas?.id || '' }]]));
    }
    setCreateOpen(true);
  };

  const handleAIDraft = () => {
    if (!formDescription || formDescription.trim().length < 10) { toast.error('Enter a description first'); return; }
    setAiLoading(true);
    setTimeout(() => {
      const d = formDescription.toLowerCase();
      const dayMatch = d.match(/(\d+)\s*day/);
      const days = dayMatch ? dayMatch[1] : '';
      const seeds: { field: string; operator: string; value: string }[][] = [];
      if (formPolicyType === 'Managed Certificate Policy') {
        if (!formName) setFormName('Certificate Policy — Draft');
        if (d.includes('sha-1') || d.includes('sha1') || d.includes('md5') || d.includes('weak')) seeds.push([{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]);
        if (d.includes('self-sign') || d.includes('self sign')) seeds.push([{ field: 'is_self_signed', operator: 'is_true', value: '' }]);
        if (d.includes('wildcard')) seeds.push([{ field: 'is_wildcard', operator: 'is_true', value: '' }]);
        if (d.includes('expir') && days) seeds.push([{ field: 'expiry_days', operator: 'lt', value: days }]);
        if (d.includes('untrusted') || d.includes('approved ca')) {
          const cas = valueSets.find(v => v.type === 'ca-list');
          if (cas) seeds.push([{ field: 'issuing_ca', operator: 'is_not_in_set', value: cas.id }]);
        }
      } else if (formPolicyType === 'SSH Key Policy') {
        if (!formName) setFormName('SSH Key Policy — Draft');
        if (d.includes('dsa')) seeds.push([{ field: 'key_type', operator: 'eq', value: 'DSA' }]);
        if (d.includes('rsa') && (d.includes('1024') || d.includes('weak') || d.includes('2048')))
          seeds.push([{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]);
        if (d.includes('rotat') && days) seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
      } else if (formPolicyType === 'Secrets & API Keys Policy') {
        if (!formName) setFormName('Secret Policy — Draft');
        if (d.includes('no expiry') || d.includes('without expiry')) seeds.push([{ field: 'has_expiry', operator: 'is_false', value: '' }]);
        if (d.includes('rotat')) seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days || '90' }]);
      } else if (formPolicyType === 'Cryptographic Key Policy') {
        if (!formName) setFormName('Cryptographic Key Policy — Draft');
        if (d.includes('no rotation') || d.includes('rotation disabled')) seeds.push([{ field: 'rotation_enabled', operator: 'is_false', value: '' }]);
      }
      if (seeds.length) {
        setConditionGroups(seedGroups(seeds));
        setGroupLogic(seeds.length > 1 ? 'OR' : 'AND');
        if (d.includes('produc')) setScope(prev => ({ ...prev, environments: Array.from(new Set([...prev.environments, 'Production'])) }));
        if (d.includes('critical')) setFormSeverity('Critical');
        toast.success('Conditions drafted from your description — review before saving');
      } else {
        toast.message('Could not map that to conditions', {
          description: 'Try naming a field, e.g. "flag certificates using SHA-1" or "secrets not rotated in 90 days".',
        });
      }
      setAiLoading(false);
    }, 600);
  };

  const hasAnyCondition = conditionGroups.some(g => g.rows.some(r => r.field && r.operator));

  // Dry-run preview against mock inventory. Deterministic per inputs.
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
      failing: describeCondition(formPolicyType, allRows[i % allRows.length], valueSets) || 'condition match',
    }));
    setPreview({ inScope, compliant, nonCompliant, excepted, sample });
  };

  React.useEffect(() => { setPreview(null); }, [conditionGroups, groupLogic, scope, formPolicyType, effectiveFrom]);

  const handleSave = (draft: boolean, asEnforce: boolean) => {
    if (!formName.trim()) { toast.error('Policy name is required'); return; }
    const summary = conditionGroups
      .map(g => g.rows
        .filter(r => r.field && r.operator)
        .map(r => describeCondition(formPolicyType, r, valueSets))
        .filter(Boolean)
        .join(` ${g.innerLogic} `))
      .filter(Boolean)
      .map(s => `(${s})`)
      .join(` ${groupLogic} `);

    const valueSetRefs = Array.from(new Set(
      conditionGroups.flatMap(g => g.rows
        .filter(r => r.operator === 'is_in_set' || r.operator === 'is_not_in_set')
        .map(r => r.value)
        .filter(Boolean))
    ));

    const finalMode: Mode = draft ? 'Monitor' : (asEnforce ? 'Enforce' : 'Monitor');

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
      tag: formTag,
      subCategory: formSubCategory,
      responseProfileId: finalMode === 'Enforce' ? responseProfileId : null,
      mode: finalMode,
      effectiveFrom: effectiveFrom || null,
      valueSetRefs,
    };

    if (editingPolicy) setUserPolicies(prev => prev.map(p => p.id === editingPolicy ? newPolicy : p));
    else setUserPolicies(prev => [...prev, newPolicy]);

    setCreateOpen(false); resetCreateForm();
    toast.success(draft ? `"${formName}" saved as draft` : `"${formName}" activated in ${finalMode} mode`);
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    resetCreateForm();
    setEditingPolicy(p.id);
    setFormName(p.name); setFormDescription(p.description);
    setFormSeverity(p.severity || 'High'); setFormTag(p.tag || 'Default'); setFormSubCategory(p.subCategory || 'Classical');
    if ((p.assetType || '').includes('SSH')) setFormPolicyType('SSH Key Policy');
    else if ((p.assetType || '').includes('Cryptographic Key')) setFormPolicyType('Cryptographic Key Policy');
    else if ((p.assetType || '').includes('Secret') || (p.assetType || '').includes('API')) setFormPolicyType('Secrets & API Keys Policy');
    else setFormPolicyType('Managed Certificate Policy');
    setConditionGroups(p.conditionGroups?.length ? p.conditionGroups : [emptyGroup()]);
    setGroupLogic(p.groupLogic || 'AND');
    setScope(p.scope ? { ...emptyScope(), ...p.scope } : emptyScope());
    setMode(p.mode || 'Monitor');
    setResponseProfileId(p.responseProfileId ?? defaultProfileId);
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

  const responseSummary = (p: CustomPolicy) => {
    if (p.mode === 'Monitor' || !p.responseProfileId) return 'Monitor only';
    const prof = profiles.find(x => x.id === p.responseProfileId);
    return prof ? prof.name : 'Profile removed';
  };

  // Usage counters for org-level surfaces
  const valueSetUsage = useMemo(() => {
    const m: Record<string, number> = {};
    userPolicies.forEach(p => (p.valueSetRefs || []).forEach(id => { m[id] = (m[id] || 0) + 1; }));
    return m;
  }, [userPolicies]);
  const profileUsage = useMemo(() => {
    const m: Record<string, number> = {};
    userPolicies.forEach(p => { if (p.responseProfileId) m[p.responseProfileId] = (m[p.responseProfileId] || 0) + 1; });
    return m;
  }, [userPolicies]);

  const currentProfile = profiles.find(p => p.id === responseProfileId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy Builder</h1>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: 'outofbox' as const, label: 'Out-of-Box Policies' },
          { id: 'custom' as const, label: 'Custom Policies' },
          { id: 'valuesets' as const, label: 'Value Sets' },
          { id: 'profiles' as const, label: 'Response Profiles' },
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
                const pMode = p.mode || 'Monitor';
                return (
                  <div key={p.id} className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedPolicy(expandedPolicy === p.id ? null : p.id)}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'Active' ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pMode === 'Enforce' ? 'bg-coral/10 text-coral' : 'bg-amber/10 text-amber'}`}>{pMode}</span>
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
                          <div><span className="text-muted-foreground block mb-0.5">Response</span><span className="font-medium">{responseSummary(p)}</span></div>
                        </div>
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
            <div className="w-full max-w-2xl space-y-4 text-foreground">
              {/* 1. Identity */}
              <div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Policy Type*</label>
                    <select value={formPolicyType} onChange={e => { setFormPolicyType(e.target.value); setConditionGroups([emptyGroup()]); }} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {POLICY_TYPES.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Sub-category</label>
                    <select value={formSubCategory} onChange={e => setFormSubCategory(e.target.value as 'Classical' | 'PQC')} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      <option value="Classical">Classical</option>
                      <option value="PQC">PQC (Post-Quantum)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Tag</label>
                    <select value={formTag} onChange={e => setFormTag(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Default', 'PCI-DSS', 'DORA', 'NIS2', 'HIPAA', 'NIST', 'Zero-Trust', 'Internal'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[11px] font-medium mb-1">Policy Name*</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. PCI-DSS SSH Key Strength — Production" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium">Description</label>
                    <button type="button" onClick={handleAIDraft} disabled={formDescription.trim().length < 10} className="inline-flex items-center gap-1 text-[10px] text-teal font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                      <Sparkles className={aiLoading ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
                      Generate from description
                    </button>
                  </div>
                  <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2}
                    placeholder="Plain-English summary, e.g. 'flag certs using SHA-1 or issued by an unapproved CA in Production'"
                    className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>
              </div>

              {/* 2. Conditions */}
              <div className="border-t border-border pt-4">
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Conditions</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Flag an asset as Non-Compliant when these conditions match. Use "is in / is not in set" to reference a reusable Value Set.</p>
                </div>
                <ConditionBuilder
                  policyType={formPolicyType}
                  groups={conditionGroups}
                  groupLogic={groupLogic}
                  valueSets={valueSets}
                  onChange={setConditionGroups}
                  onGroupLogicChange={setGroupLogic}
                />
              </div>

              {/* 3. Scope */}
              <div className="border-t border-border pt-4">
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Scope</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Optional. Target saved Asset Groups, then optionally refine by attribute. Leave empty to evaluate ALL assets of this type.</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">Assets must be in ANY selected group (OR) AND match the attribute refinement (AND). Attribute values within one dimension are OR.</p>
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
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Severity</p>
                <div className="grid grid-cols-2 gap-4">
                  <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                    {['Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                  </select>
                  <p className="text-[10px] text-muted-foreground self-center">Sets risk weighting and, when the Response Profile creates a ticket, the ticket priority.</p>
                </div>
              </div>

              {/* 5. Response */}
              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Response</p>
                <p className="text-[10px] text-muted-foreground mb-3">Reference an org-level Response Profile. Configure channels once; reuse across policies.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Response Profile</label>
                    <select
                      value={responseProfileId || ''}
                      onChange={e => setResponseProfileId(e.target.value || null)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                    >
                      <option value="">None (monitor only)</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (default)' : ''}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {responseProfileId && currentProfile ? profileChannelSummary(currentProfile) : 'No notification or ticket on violation.'}
                    </p>
                    <button type="button" onClick={() => { setCreateOpen(false); setTab('profiles'); }} className="text-[10px] text-teal mt-1 hover:underline">Manage Response Profiles</button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium mb-1">Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Monitor', 'Enforce'] as Mode[]).map(m => (
                        <button key={m} type="button" onClick={() => setMode(m)}
                          className={`px-3 py-2 rounded-lg border text-[11px] transition-colors ${mode === m ? 'bg-teal/15 text-teal border-teal/40' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}>
                          <div className="font-medium">{m}</div>
                          <div className="text-[9px] mt-0.5">{m === 'Monitor' ? 'Flag only' : 'Flag + run profile'}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Start in Monitor to observe impact, switch to Enforce when ready.</p>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-medium mb-1">Effective from (optional)</label>
                  <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                  <p className="text-[10px] text-amber mt-1">
                    {effectiveFrom
                      ? `Will only evaluate assets created/changed on or after ${effectiveFrom}.`
                      : 'Empty effective date will flag all matching legacy assets immediately.'}
                  </p>
                </div>
              </div>

              {/* 6. Preview */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Preview / Impact</p>
                  <button type="button" onClick={runPreview} disabled={!hasAnyCondition}
                    className="text-[10px] px-3 py-1.5 rounded bg-teal/10 text-teal hover:bg-teal/20 disabled:opacity-40 disabled:cursor-not-allowed">
                    Run preview
                  </button>
                </div>
                {!hasAnyCondition && (
                  <p className="text-[11px] text-muted-foreground">Add a condition and run preview to see impact before activating.</p>
                )}
                {hasAnyCondition && !preview && (
                  <p className="text-[11px] text-muted-foreground">Click "Run preview" to dry-run against current Inventory. No notifications or tickets are sent.</p>
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
                    <p className="text-[9px] text-muted-foreground">Dry-run only. Writes nothing, notifies nothing.</p>
                  </div>
                )}
              </div>

              {mode === 'Enforce' && !preview && hasAnyCondition && (
                <p className="text-[10px] text-amber border border-amber/30 bg-amber/5 rounded px-2 py-1.5">
                  Activating in Enforce mode without a preview.
                </p>
              )}

              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-4 py-3 flex justify-end gap-2">
                <button onClick={closeCreateModal} className="px-4 py-2 text-xs rounded-lg hover:bg-muted">Cancel</button>
                <button onClick={() => handleSave(true, false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
                <button onClick={() => handleSave(false, mode === 'Enforce')} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
                  Save & Activate ({mode})
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'valuesets' && (
        <ValueSetsTab valueSets={valueSets} setValueSets={setValueSets} usage={valueSetUsage} />
      )}

      {tab === 'profiles' && (
        <ResponseProfilesTab profiles={profiles} setProfiles={setProfiles} usage={profileUsage} />
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

// ──────────────────────────────────────────────────────────────────────────────
// Value Sets surface

function ValueSetsTab({ valueSets, setValueSets, usage }: {
  valueSets: ValueSet[]; setValueSets: React.Dispatch<React.SetStateAction<ValueSet[]>>; usage: Record<string, number>;
}) {
  const [editing, setEditing] = useState<ValueSet | null>(null);
  const [open, setOpen] = useState(false);

  const startCreate = () => { setEditing({ id: '', name: '', type: 'ca-list', entries: [] }); setOpen(true); };
  const startEdit = (vs: ValueSet) => { setEditing({ ...vs }); setOpen(true); };
  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Name is required'); return; }
    if (editing.id) {
      setValueSets(prev => prev.map(v => v.id === editing.id ? editing : v));
      toast.success('Value Set updated');
    } else {
      setValueSets(prev => [...prev, { ...editing, id: `vs-${Date.now()}` }]);
      toast.success('Value Set created');
    }
    setOpen(false); setEditing(null);
  };
  const remove = (id: string) => {
    if ((usage[id] || 0) > 0) { toast.error('In use by one or more policies'); return; }
    setValueSets(prev => prev.filter(v => v.id !== id));
    toast.success('Value Set deleted');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Reusable, typed lists referenced from policy conditions (e.g. Approved CAs, Allowed Signature Algorithms).</p>
        <button onClick={startCreate} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
          <Plus className="w-3 h-3" /> New Value Set
        </button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              {['Name', 'Type', 'Entries', 'Used by', 'Actions'].map(h => <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {valueSets.map(v => (
              <tr key={v.id} className="border-b border-border hover:bg-muted/30">
                <td className="py-2.5 px-3 font-semibold">{v.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{VALUE_SET_TYPE_LABEL[v.type]}</td>
                <td className="py-2.5 px-3">
                  <div className="text-muted-foreground">{v.entries.length}</div>
                  <div className="text-[10px] text-muted-foreground/80 truncate max-w-xs">{v.entries.join(', ')}</div>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground">{usage[v.id] || 0} policies</td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(v)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                    <button onClick={() => remove(v.id)} className="text-[10px] px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing?.id ? 'Edit Value Set' : 'New Value Set'}>
        {editing && (
          <div className="space-y-3 text-foreground">
            <div>
              <label className="block text-[11px] font-medium mb-1">Name*</label>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Type</label>
              <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as ValueSetType })}
                className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                {(Object.keys(VALUE_SET_TYPE_LABEL) as ValueSetType[]).map(t => <option key={t} value={t}>{VALUE_SET_TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Entries</label>
              <ChipInput values={editing.entries} onChange={v => setEditing({ ...editing, entries: v })} placeholder="Type and press Enter" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setOpen(false); setEditing(null); }} className="px-4 py-2 text-xs rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Response Profiles surface

function ResponseProfilesTab({ profiles, setProfiles, usage }: {
  profiles: ResponseProfile[]; setProfiles: React.Dispatch<React.SetStateAction<ResponseProfile[]>>; usage: Record<string, number>;
}) {
  const [editing, setEditing] = useState<ResponseProfile | null>(null);
  const [open, setOpen] = useState(false);

  const blank = (): ResponseProfile => ({
    id: '', name: '',
    notify: { onNewViolation: true, onResolution: false },
    ticket: { system: 'none' },
  });

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Name is required'); return; }
    if (editing.id) {
      setProfiles(prev => prev.map(p => p.id === editing.id ? editing : (editing.isDefault ? { ...p, isDefault: false } : p)));
      toast.success('Profile updated');
    } else {
      const newId = `rp-${Date.now()}`;
      setProfiles(prev => [
        ...(editing.isDefault ? prev.map(p => ({ ...p, isDefault: false })) : prev),
        { ...editing, id: newId },
      ]);
      toast.success('Profile created');
    }
    setOpen(false); setEditing(null);
  };

  const makeDefault = (id: string) =>
    setProfiles(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));

  const remove = (id: string) => {
    if ((usage[id] || 0) > 0) { toast.error('In use by one or more policies'); return; }
    setProfiles(prev => prev.filter(p => p.id !== id));
    toast.success('Profile deleted');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">Reusable response routing. Policies reference a profile instead of re-entering Slack channels or ticket project keys.</p>
        <button onClick={() => { setEditing(blank()); setOpen(true); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
          <Plus className="w-3 h-3" /> New Profile
        </button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              {['Name', 'Channels', 'Used by', 'Default', 'Actions'].map(h => <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                <td className="py-2.5 px-3 font-semibold">{p.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{profileChannelSummary(p)}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{usage[p.id] || 0} policies</td>
                <td className="py-2.5 px-3">
                  {p.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal"><Star className="w-3 h-3" /> Default</span>
                  ) : (
                    <button onClick={() => makeDefault(p.id)} className="text-[10px] text-teal hover:underline">Make default</button>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing({ ...p }); setOpen(true); }} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                    <button onClick={() => remove(p.id)} className="text-[10px] px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing?.id ? 'Edit Response Profile' : 'New Response Profile'} wide>
        {editing && (
          <div className="w-full max-w-xl space-y-4 text-foreground">
            <div>
              <label className="block text-[11px] font-medium mb-1">Name*</label>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Notifications</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium mb-1">Email recipients</label>
                  <input value={editing.notify.emailRecipients || ''} onChange={e => setEditing({ ...editing, notify: { ...editing.notify, emailRecipients: e.target.value } })}
                    placeholder="security@acme.com" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Slack channel</label>
                  <input value={editing.notify.slackChannel || ''} onChange={e => setEditing({ ...editing, notify: { ...editing.notify, slackChannel: e.target.value } })}
                    placeholder="#crypto-alerts" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Notify on new violation</span>
                <button onClick={() => setEditing({ ...editing, notify: { ...editing.notify, onNewViolation: !editing.notify.onNewViolation } })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${editing.notify.onNewViolation ? 'bg-teal' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${editing.notify.onNewViolation ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Notify on resolution</span>
                <button onClick={() => setEditing({ ...editing, notify: { ...editing.notify, onResolution: !editing.notify.onResolution } })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${editing.notify.onResolution ? 'bg-teal' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${editing.notify.onResolution ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Ticketing</p>
              <div className="flex gap-2">
                {(['none', 'servicenow', 'jira'] as const).map(sys => {
                  const active = editing.ticket.system === sys;
                  return (
                    <button key={sys} type="button"
                      onClick={() => {
                        if (sys === 'none') setEditing({ ...editing, ticket: { system: 'none' } });
                        else if (sys === 'servicenow') setEditing({ ...editing, ticket: { system: 'servicenow', assignmentGroup: '' } });
                        else setEditing({ ...editing, ticket: { system: 'jira', projectKey: '', issueType: 'Task' } });
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border text-[11px] capitalize transition-colors ${active ? 'bg-teal/15 text-teal border-teal/40' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}>
                      {sys === 'none' ? 'No ticket' : sys === 'servicenow' ? 'ServiceNow' : 'Jira'}
                    </button>
                  );
                })}
              </div>
              {editing.ticket.system === 'servicenow' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Record type</label>
                    <input value="Incident" disabled className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/40 text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Assignment group</label>
                    <input value={editing.ticket.assignmentGroup}
                      onChange={e => setEditing({ ...editing, ticket: { system: 'servicenow', assignmentGroup: e.target.value } })}
                      placeholder="e.g. Crypto-Security" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                  </div>
                </div>
              )}
              {editing.ticket.system === 'jira' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Project key</label>
                    <input value={editing.ticket.projectKey}
                      onChange={e => setEditing({ ...editing, ticket: { system: 'jira', projectKey: e.target.value, issueType: (editing.ticket as { issueType: 'Task' | 'Bug' }).issueType } })}
                      placeholder="e.g. SEC" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Issue type</label>
                    <select value={editing.ticket.issueType}
                      onChange={e => setEditing({ ...editing, ticket: { system: 'jira', projectKey: (editing.ticket as { projectKey: string }).projectKey, issueType: e.target.value as 'Task' | 'Bug' } })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Task', 'Bug'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {editing.ticket.system !== 'none' && (
                <p className="text-[10px] text-muted-foreground">Priority is derived from policy severity. One ticket per violated asset per policy. Re-violation reopens the existing ticket.</p>
              )}
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between text-[11px]">
              <span>Make org default</span>
              <button onClick={() => setEditing({ ...editing, isDefault: !editing.isDefault })}
                className={`w-10 h-5 rounded-full relative transition-colors ${editing.isDefault ? 'bg-teal' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${editing.isDefault ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setOpen(false); setEditing(null); }} className="px-4 py-2 text-xs rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Keep fieldsFor referenced so tree-shaking doesn't drop the import (used implicitly by ConditionBuilder).
void fieldsFor;
