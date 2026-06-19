import { FEATURES } from '@/config/features';
import React, { useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies as initialCustomPolicies } from '@/data/mockData';
import { mockGroups } from '@/data/inventoryMockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import ConditionBuilder, { ConditionGroup, emptyGroup } from '@/components/policies/ConditionBuilder';
import { POLICY_TYPES, describeCondition } from '@/components/policies/policyFields';
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
} from 'lucide-react';

interface ScopeConfig {
  environment: string[];
  businessUnit: string[];
  discoverySource: string[];
  cloudProvider: string[];
  assetGroupIds: string[];
}

interface NotifyConfig {
  via: 'Email' | 'Slack';
  recipient: string;
  onNewViolation: boolean;
}

interface TicketConfig {
  enabled: boolean;
  system: 'servicenow' | 'jira';
  snowAssignmentGroup: string;
  snowPriority: string;
  jiraProject: string;
  jiraIssueType: string;
  jiraPriority: string;
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
  notify?: NotifyConfig;
  ticket?: TicketConfig;
  tag?: string;
}

type PolicyType = 'ssh-key' | 'certificates' | 'secrets' | 'crypto-keys' | '';

const getPolicyTypeMeta = (type: PolicyType) => {
  switch (type) {
    case 'ssh-key':
      return { label: 'SSH Keys', icon: Key, cls: 'bg-amber/10 text-amber border-amber/20' };
    case 'certificates':
      return { label: 'Certificates', icon: Shield, cls: 'bg-teal/10 text-teal border-teal/20' };
    case 'secrets':
      return { label: 'Secrets & API Keys', icon: Lock, cls: 'bg-purple/10 text-purple border-purple/20' };
    case 'crypto-keys':
      return { label: 'Cryptographic Keys', icon: Key, cls: 'bg-teal/10 text-teal border-teal/20' };
    default:
      return null;
  }
};

const getPolicyTypeFromAssetType = (assetType?: string): PolicyType => {
  const value = (assetType || '').toLowerCase();
  if (value.includes('ssh key')) return 'ssh-key';
  if (value.includes('cryptographic key')) return 'crypto-keys';
  if (value.includes('secret') || value.includes('api key') || value.includes('oauth')) return 'secrets';
  if (value.includes('certificate') || value.includes('tls') || value.includes('code-signing') || value.includes('workload') || value.includes('client auth') || value.includes('s/mime')) return 'certificates';
  return '';
};

const getPolicyTypeBadgeFromAsset = (assetType?: string) => getPolicyTypeMeta(getPolicyTypeFromAssetType(assetType));

const ENV_OPTIONS = ['Production', 'Staging', 'Development'];
const DISCOVERY_OPTIONS = ['Network Probe', 'CA Scan', 'Cloud Crypto Posture Scan', 'Secrets & Key Store Discovery', 'CBOM Ingestion'];
const CLOUD_OPTIONS = ['AWS', 'Azure', 'GCP'];
const BU_SUGGESTIONS = ['Payments', 'Retail', 'Infra', 'Identity', 'Data Platform'];

const severityToSnowPriority = (s: string) =>
  s === 'Critical' ? '1-Critical' : s === 'High' ? '2-High' : s === 'Medium' ? '3-Moderate' : '4-Low';
const severityToJiraPriority = (s: string) =>
  s === 'Critical' ? 'Highest' : s === 'High' ? 'High' : s === 'Medium' ? 'Medium' : 'Low';

function emptyScope(): ScopeConfig {
  return { environment: [], businessUnit: [], discoverySource: [], cloudProvider: [], assetGroupIds: [] };
}

interface ChipMultiProps {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}
function ChipMulti({ label, options, values, onChange }: ChipMultiProps) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
  };
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${active ? 'bg-teal/15 text-teal border-teal/40' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TagInputProps {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}
function TagInput({ label, values, suggestions, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (!t || values.includes(t)) { setDraft(''); return; }
    onChange([...values, t]);
    setDraft('');
  };
  const remove = (v: string) => onChange(values.filter(x => x !== v));
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1.5">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-lg px-2 py-1.5 bg-card min-h-[34px]">
        {values.map(v => (
          <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/40 inline-flex items-center gap-1">
            {v}
            <button type="button" onClick={() => remove(v)} className="hover:text-coral"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); } }}
          onBlur={() => draft && add(draft)}
          placeholder={values.length ? '' : (placeholder || 'Type and press Enter')}
          className="flex-1 min-w-[120px] bg-transparent text-[11px] outline-none text-foreground"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {suggestions.filter(s => !values.includes(s)).map(s => (
            <button key={s} type="button" onClick={() => add(s)} className="text-[9px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-teal hover:bg-teal/10">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies.map(p => ({ ...p })));
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [formPolicyType, setFormPolicyType] = useState('Managed Certificate Policy');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTag, setFormTag] = useState('Default');
  const [formSeverity, setFormSeverity] = useState('High');

  // Scope (after Conditions)
  const [scope, setScope] = useState<ScopeConfig>(emptyScope());

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [formNotifyVia, setFormNotifyVia] = useState<'Email' | 'Slack'>('Email');
  const [formNotifyRecipient, setFormNotifyRecipient] = useState('');
  const [formNotifyOnNewViolation, setFormNotifyOnNewViolation] = useState(true);

  // Ticket
  const [showTicket, setShowTicket] = useState(false);
  const [formTicketEnabled, setFormTicketEnabled] = useState(false);
  const [formTicketSystem, setFormTicketSystem] = useState<'servicenow' | 'jira'>('servicenow');
  const [formSnowAssignmentGroup, setFormSnowAssignmentGroup] = useState('');
  const [formSnowPriority, setFormSnowPriority] = useState('2-High');
  const [formJiraProject, setFormJiraProject] = useState('');
  const [formJiraIssueType, setFormJiraIssueType] = useState('Task');
  const [formJiraPriority, setFormJiraPriority] = useState('High');

  const [aiLoading, setAiLoading] = useState(false);

  // Condition builder state
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND');

  const resetCreateForm = () => {
    setFormPolicyType('Managed Certificate Policy');
    setFormName('');
    setFormDescription('');
    setFormTag('Default');
    setFormSeverity('High');
    setScope(emptyScope());
    setShowNotifications(false);
    setFormNotifyVia('Email');
    setFormNotifyRecipient('');
    setFormNotifyOnNewViolation(true);
    setShowTicket(false);
    setFormTicketEnabled(false);
    setFormTicketSystem('servicenow');
    setFormSnowAssignmentGroup('');
    setFormSnowPriority('2-High');
    setFormJiraProject('');
    setFormJiraIssueType('Task');
    setFormJiraPriority('High');
    setConditionGroups([emptyGroup()]);
    setGroupLogic('AND');
    setEditingPolicy(null);
  };

  // Keep ticket priority defaults synced with severity unless user has edited
  React.useEffect(() => {
    setFormSnowPriority(severityToSnowPriority(formSeverity));
    setFormJiraPriority(severityToJiraPriority(formSeverity));
  }, [formSeverity]);

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  // Condition seeds for quick-start templates
  const seedGroups = (rows: { field: string; operator: string; value: string }[][]): ConditionGroup[] =>
    rows.map(group => ({
      id: `grp-${Math.random().toString(36).slice(2, 8)}`,
      innerLogic: 'AND',
      rows: group.map(r => ({ id: `row-${Math.random().toString(36).slice(2, 8)}`, ...r })),
    }));

  const openTemplate = (template: 'pci-ssh' | 'nist-ssh' | 'zero-trust-tls' | 'dora-cert' | 'secret-rotation') => {
    resetCreateForm();
    if (template === 'pci-ssh') {
      setFormPolicyType('SSH Key Policy');
      setFormTag('PCI-DSS');
      setFormName('PCI-DSS SSH Key Strength');
      setFormSeverity('Critical');
      setConditionGroups(seedGroups([
        [{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }],
      ]));
    } else if (template === 'nist-ssh') {
      setFormPolicyType('SSH Key Policy');
      setFormTag('NIST');
      setFormName('NIST SSH Baseline');
      setFormSeverity('High');
      setConditionGroups(seedGroups([
        [{ field: 'key_type', operator: 'eq', value: 'DSA' }],
        [{ field: 'mac_algo', operator: 'in', value: 'hmac-sha1,hmac-md5' }],
      ]));
      setGroupLogic('OR');
    } else if (template === 'zero-trust-tls') {
      setFormPolicyType('Managed Certificate Policy');
      setFormTag('Zero-Trust');
      setFormName('Zero-Trust TLS Validity');
      setFormSeverity('High');
      setConditionGroups(seedGroups([
        [{ field: 'validity_days', operator: 'gt', value: '90' }],
      ]));
    } else if (template === 'dora-cert') {
      setFormPolicyType('Managed Certificate Policy');
      setFormTag('DORA');
      setFormName('DORA Weak Algorithm');
      setFormSeverity('High');
      setConditionGroups(seedGroups([
        [{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }],
      ]));
    } else if (template === 'secret-rotation') {
      setFormPolicyType('Secrets & API Keys Policy');
      setFormName('Secret Rotation Baseline');
      setFormSeverity('High');
      setConditionGroups(seedGroups([
        [{ field: 'days_since_rotation', operator: 'gt', value: '90' }],
      ]));
    }
    setCreateOpen(true);
  };

  // AI assist
  const handleAIDraft = () => {
    if (!formDescription || formDescription.trim().length < 10) {
      toast.error('Enter a description first');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      const d = formDescription.toLowerCase();
      const dayMatch = d.match(/(\d+)\s*day/);
      const days = dayMatch ? dayMatch[1] : '';
      const seeds: { field: string; operator: string; value: string }[][] = [];

      if (formPolicyType === 'Managed Certificate Policy') {
        if (!formName) setFormName('Certificate Policy — Draft');
        if (d.includes('sha-1') || d.includes('sha1') || d.includes('md5') || d.includes('weak'))
          seeds.push([{ field: 'sig_algo', operator: 'in', value: 'SHA-1,MD5' }]);
        if (d.includes('self-sign') || d.includes('self sign'))
          seeds.push([{ field: 'is_self_signed', operator: 'is_true', value: '' }]);
        if (d.includes('wildcard'))
          seeds.push([{ field: 'is_wildcard', operator: 'is_true', value: '' }]);
        if (d.includes('expir') && days)
          seeds.push([{ field: 'expiry_days', operator: 'lt', value: days }]);
        if ((d.includes('rsa') || d.includes('key')) && d.match(/\d{3,4}\s*bit/)) {
          const b = d.match(/(\d{3,4})\s*bit/);
          seeds.push([{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: b ? b[1] : '2048' }]);
        }
        if (d.includes('tls 1.0') || d.includes('tls 1.1') || d.includes('deprecated tls'))
          seeds.push([{ field: 'tls_version', operator: 'in', value: 'TLS 1.0,TLS 1.1' }]);
      } else if (formPolicyType === 'SSH Key Policy') {
        if (!formName) setFormName('SSH Key Policy — Draft');
        if (d.includes('dsa')) seeds.push([{ field: 'key_type', operator: 'eq', value: 'DSA' }]);
        if (d.includes('rsa') && (d.includes('1024') || d.includes('weak') || d.includes('2048')))
          seeds.push([{ field: 'key_type', operator: 'eq', value: 'RSA' }, { field: 'key_bits', operator: 'lt', value: '2048' }]);
        if (d.includes('rotat') && days)
          seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
        if (d.includes('age') && days)
          seeds.push([{ field: 'key_age', operator: 'gt', value: days }]);
      } else if (formPolicyType === 'Secrets & API Keys Policy') {
        if (!formName) setFormName('Secret Policy — Draft');
        if (d.includes('no expiry') || d.includes('without expiry') || d.includes('expiry date'))
          seeds.push([{ field: 'has_expiry', operator: 'is_false', value: '' }]);
        if (d.includes('rotat') && days)
          seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: days }]);
        else if (d.includes('rotat'))
          seeds.push([{ field: 'days_since_rotation', operator: 'gt', value: '90' }]);
      } else if (formPolicyType === 'Cryptographic Key Policy') {
        if (!formName) setFormName('Cryptographic Key Policy — Draft');
        if (d.includes('rotation') && (d.includes('not enabled') || d.includes('disabled') || d.includes('no rotation')))
          seeds.push([{ field: 'rotation_enabled', operator: 'is_false', value: '' }]);
        if (d.includes('rsa') || d.includes('ecc') || d.includes('quantum') || d.includes('pqc'))
          seeds.push([{ field: 'key_algorithm', operator: 'in', value: 'RSA,ECC,DH' }]);
      }

      if (seeds.length) {
        setConditionGroups(seedGroups(seeds));
        setGroupLogic(seeds.length > 1 ? 'OR' : 'AND');
        if (d.includes('produc')) setScope(prev => ({ ...prev, environment: Array.from(new Set([...prev.environment, 'Production'])) }));
        if (d.includes('critical')) setFormSeverity('Critical');
        toast.success('Conditions drafted from your description — review before saving');
      } else {
        toast.message('Could not map that to conditions', {
          description: 'Try naming a field, e.g. "flag certificates using SHA-1" or "secrets not rotated in 90 days".',
        });
      }
      setAiLoading(false);
    }, 700);
  };

  const assetTypeFor = (policyType: string) =>
    policyType.includes('Cryptographic Key') ? 'Cryptographic Key'
      : policyType.includes('Certificate') ? 'TLS Certificate'
        : policyType.includes('SSH') ? 'SSH Key'
          : 'API Key / Secret';

  // Hash-based estimator so the number is stable per inputs.
  const hashStr = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
    return Math.abs(h);
  };
  const hasAnyCondition = conditionGroups.some(g => g.rows.some(r => r.field && r.operator));
  const affectedEstimate = useMemo(() => {
    if (!hasAnyCondition) return null;
    const at = assetTypeFor(formPolicyType);
    const base = at === 'TLS Certificate' ? 18420 : at === 'SSH Key' ? 9650 : at === 'Cryptographic Key' ? 3120 : 4780;
    const scopeFactor =
      (scope.environment.length === 0 ? 1 : scope.environment.length / 3) *
      (scope.cloudProvider.length === 0 ? 1 : 0.45 + scope.cloudProvider.length * 0.15) *
      (scope.businessUnit.length === 0 ? 1 : 0.35 + scope.businessUnit.length * 0.18) *
      (scope.discoverySource.length === 0 ? 1 : 0.5 + scope.discoverySource.length * 0.12) *
      (scope.assetGroupIds.length === 0 ? 1 : 0.4 + scope.assetGroupIds.length * 0.2);
    const seed = hashStr(JSON.stringify({ at, scope, conditionGroups, groupLogic })) % 1000;
    const evaluated = Math.max(12, Math.round(base * Math.min(1, scopeFactor) * (0.75 + (seed / 1000) * 0.4)));
    const nonCompliantPct = 0.06 + ((seed % 17) / 100);
    const nonCompliant = Math.max(1, Math.round(evaluated * nonCompliantPct));
    return { evaluated, nonCompliant };
  }, [formPolicyType, scope, conditionGroups, groupLogic, hasAnyCondition]);

  const handleSave = (draft: boolean) => {
    if (!formName.trim()) {
      toast.error('Policy name is required');
      return;
    }

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
      description: formDescription || `${formPolicyType}`,
      status: draft ? 'Draft' : 'Active',
      violations: 0,
      assetType: assetTypeFor(formPolicyType),
      severity: formSeverity,
      conditionGroups,
      groupLogic,
      conditionSummary: summary,
      scope: { ...scope },
      tag: formTag,
      notify: {
        via: formNotifyVia,
        recipient: formNotifyRecipient,
        onNewViolation: formNotifyOnNewViolation,
      },
      ticket: {
        enabled: formTicketEnabled,
        system: formTicketSystem,
        snowAssignmentGroup: formSnowAssignmentGroup,
        snowPriority: formSnowPriority,
        jiraProject: formJiraProject,
        jiraIssueType: formJiraIssueType,
        jiraPriority: formJiraPriority,
      },
    };

    if (editingPolicy) {
      setUserPolicies(prev => prev.map(policy => policy.id === editingPolicy ? newPolicy : policy));
    } else {
      setUserPolicies(prev => [...prev, newPolicy]);
    }

    setCreateOpen(false);
    resetCreateForm();
    toast.success(draft ? `"${formName}" saved as draft` : `"${formName}" is now active`);
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    resetCreateForm();
    setEditingPolicy(p.id);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormSeverity(p.severity || 'High');
    setFormTag(p.tag || 'Default');
    if ((p.assetType || '').includes('SSH')) setFormPolicyType('SSH Key Policy');
    else if ((p.assetType || '').includes('Cryptographic Key')) setFormPolicyType('Cryptographic Key Policy');
    else if ((p.assetType || '').includes('Secret') || (p.assetType || '').includes('API')) setFormPolicyType('Secrets & API Keys Policy');
    else setFormPolicyType('Managed Certificate Policy');
    setConditionGroups(p.conditionGroups && p.conditionGroups.length ? p.conditionGroups : [emptyGroup()]);
    setGroupLogic(p.groupLogic || 'AND');
    setScope(p.scope ? { ...emptyScope(), ...p.scope } : emptyScope());
    if (p.notify) {
      setFormNotifyVia(p.notify.via);
      setFormNotifyRecipient(p.notify.recipient);
      setFormNotifyOnNewViolation(p.notify.onNewViolation);
      setShowNotifications(true);
    }
    if (p.ticket) {
      setFormTicketEnabled(p.ticket.enabled);
      setFormTicketSystem(p.ticket.system);
      setFormSnowAssignmentGroup(p.ticket.snowAssignmentGroup);
      setFormSnowPriority(p.ticket.snowPriority);
      setFormJiraProject(p.ticket.jiraProject);
      setFormJiraIssueType(p.ticket.jiraIssueType);
      setFormJiraPriority(p.ticket.jiraPriority);
      if (p.ticket.enabled) setShowTicket(true);
    }
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
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const scopeSummary = (s?: ScopeConfig) => {
    if (!s) return 'All assets';
    const parts = [
      ...s.environment,
      ...s.businessUnit,
      ...s.cloudProvider,
      ...s.discoverySource,
      ...s.assetGroupIds.map(gid => mockGroups.find(g => g.id === gid)?.name || gid),
    ];
    return parts.length ? parts.join(' · ') : 'All assets';
  };

  const ticketBadge = (t?: TicketConfig) => {
    if (!t || !t.enabled) return 'No ticket';
    return t.system === 'servicenow' ? 'ServiceNow: Incident' : `Jira: ${t.jiraProject || t.jiraIssueType}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy Builder</h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'outofbox' as const, label: 'Out-of-Box Policies' },
          { id: 'custom' as const, label: 'Custom Policies' },
          { id: 'compliance' as const, label: 'Compliance Frameworks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
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
                          <div><span className="text-muted-foreground block mb-0.5">Ticketing</span><span className="font-medium">{ticketBadge(p.ticket)}</span></div>
                        </div>
                        {p.scope?.businessUnit && p.scope.businessUnit.length > 0 && (
                          <div className="text-[10px]"><span className="text-muted-foreground">Business Unit: </span><span className="font-medium">{p.scope.businessUnit.join(', ')}</span></div>
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

          <Modal open={createOpen} onClose={closeCreateModal} title="Create Policy" wide>
            <div className="w-full max-w-2xl space-y-4 text-foreground">
              {/* 1. Identity */}
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Policy Type*</label>
                    <select value={formPolicyType} onChange={e => { setFormPolicyType(e.target.value); setConditionGroups([emptyGroup()]); }} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {POLICY_TYPES.map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Tag</label>
                    <select value={formTag} onChange={e => setFormTag(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Default', 'PCI-DSS', 'DORA', 'NIS2', 'HIPAA', 'NIST', 'Zero-Trust', 'Internal'].map(option => <option key={option}>{option}</option>)}
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
                    <button
                      type="button"
                      onClick={handleAIDraft}
                      disabled={formDescription.trim().length < 10}
                      className="inline-flex items-center gap-1 text-[10px] text-teal font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles className={aiLoading ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
                      Generate from description
                    </button>
                  </div>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder={
                      formPolicyType === 'SSH Key Policy'
                        ? 'e.g. flag SSH keys using DSA, or RSA below 2048 bits'
                      : formPolicyType === 'Managed Certificate Policy'
                        ? 'e.g. flag certificates using SHA-1 or self-signed, or expiring in under 30 days'
                      : formPolicyType === 'Secrets & API Keys Policy'
                        ? 'e.g. flag secrets with no expiry date or not rotated in 90 days'
                      : formPolicyType === 'Cryptographic Key Policy'
                        ? 'e.g. flag KMS keys with rotation not enabled, or using RSA/ECC'
                      : 'Select a policy type above, then describe what you want in plain English'
                    }
                    className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                  />
                </div>
              </div>

              {/* 2. Conditions */}
              <div className="border-t border-border pt-4">
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Conditions</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Flag an asset as Non-Compliant when these conditions match.</p>
                </div>
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
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Scope</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Optional. Narrow where this policy applies. Leave empty to evaluate all assets of this type.</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">Multiple values in one dimension match ANY of them (OR). Different dimensions must ALL match (AND).</p>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <ChipMulti label="Environment" options={ENV_OPTIONS} values={scope.environment} onChange={v => setScope(s => ({ ...s, environment: v }))} />
                    <ChipMulti label="Cloud Provider" options={CLOUD_OPTIONS} values={scope.cloudProvider} onChange={v => setScope(s => ({ ...s, cloudProvider: v }))} />
                  </div>
                  <ChipMulti label="Discovery Source" options={DISCOVERY_OPTIONS} values={scope.discoverySource} onChange={v => setScope(s => ({ ...s, discoverySource: v }))} />
                  <TagInput label="Business Unit" values={scope.businessUnit} suggestions={BU_SUGGESTIONS} onChange={v => setScope(s => ({ ...s, businessUnit: v }))} placeholder="e.g. Payments" />
                  <div>
                    <label className="block text-[11px] font-medium mb-1.5">Asset Group</label>
                    <div className="flex flex-wrap gap-1.5">
                      {mockGroups.map(g => {
                        const active = scope.assetGroupIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setScope(s => ({ ...s, assetGroupIds: active ? s.assetGroupIds.filter(id => id !== g.id) : [...s.assetGroupIds, g.id] }))}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${active ? 'bg-teal/15 text-teal border-teal/40' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}
                          >
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Severity */}
              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Severity</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Critical', 'High', 'Medium', 'Low'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                  <p className="text-[10px] text-muted-foreground self-center">Severity sets risk weighting and ticket priority.</p>
                </div>
              </div>

              {/* 5. On Violation */}
              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">On Violation</p>
                <p className="text-[10px] text-muted-foreground mb-3">Matched assets are flagged Non-Compliant. Optionally notify and open a ticket.</p>

                {/* Notifications */}
                <div className="border border-border rounded-lg">
                  <button onClick={() => setShowNotifications(p => !p)} className="w-full flex items-center justify-between cursor-pointer px-3 py-2">
                    <span className="text-[11px] font-medium">Notifications</span>
                    {showNotifications ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {showNotifications && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Notify via</label>
                          <select value={formNotifyVia} onChange={e => setFormNotifyVia(e.target.value as 'Email' | 'Slack')} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                            {['Email', 'Slack'].map(option => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Recipient</label>
                          <input value={formNotifyRecipient} onChange={e => setFormNotifyRecipient(e.target.value)} placeholder={formNotifyVia === 'Email' ? 'security@acme.com' : '#security-alerts'} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-1 text-[11px]">
                        <span>On new violation</span>
                        <button onClick={() => setFormNotifyOnNewViolation(p => !p)} className={`w-10 h-5 rounded-full relative transition-colors ${formNotifyOnNewViolation ? 'bg-teal' : 'bg-muted'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formNotifyOnNewViolation ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticket */}
                <div className="border border-border rounded-lg mt-3">
                  <button onClick={() => setShowTicket(p => !p)} className="w-full flex items-center justify-between cursor-pointer px-3 py-2">
                    <span className="text-[11px] font-medium">Create a ticket</span>
                    {showTicket ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {showTicket && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="flex items-center justify-between py-1">
                        <p className="text-[11px] font-medium">Open a ticket when this policy is violated</p>
                        <button onClick={() => setFormTicketEnabled(p => !p)} className={`w-10 h-5 rounded-full relative transition-colors ${formTicketEnabled ? 'bg-teal' : 'bg-muted'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formTicketEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {formTicketEnabled && (
                        <>
                          <div>
                            <label className="block text-[11px] font-medium mb-1.5">Ticketing system</label>
                            <div className="flex gap-2">
                              {([
                                { id: 'servicenow' as const, label: 'ServiceNow' },
                                { id: 'jira' as const, label: 'Jira' },
                              ]).map(opt => {
                                const active = formTicketSystem === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setFormTicketSystem(opt.id)}
                                    className={`flex-1 px-3 py-2 rounded-lg border text-[11px] transition-colors ${active ? 'bg-teal/15 text-teal border-teal/40' : 'bg-card text-muted-foreground border-border hover:border-foreground/30'}`}
                                  >
                                    <div className="font-medium">{opt.label}</div>
                                    <div className="text-[9px] text-teal mt-0.5">Connected</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {formTicketSystem === 'servicenow' ? (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-medium mb-1">Record type</label>
                                <input value="Incident" disabled className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/40 text-muted-foreground" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium mb-1">Assignment group</label>
                                <input value={formSnowAssignmentGroup} onChange={e => setFormSnowAssignmentGroup(e.target.value)} placeholder="e.g. Crypto-Security" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium mb-1">Priority</label>
                                <select value={formSnowPriority} onChange={e => setFormSnowPriority(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                                  {['1-Critical', '2-High', '3-Moderate', '4-Low'].map(o => <option key={o}>{o}</option>)}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-medium mb-1">Project key</label>
                                <input value={formJiraProject} onChange={e => setFormJiraProject(e.target.value)} placeholder="e.g. SEC" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium mb-1">Issue type</label>
                                <select value={formJiraIssueType} onChange={e => setFormJiraIssueType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                                  {['Task', 'Bug'].map(o => <option key={o}>{o}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium mb-1">Priority</label>
                                <select value={formJiraPriority} onChange={e => setFormJiraPriority(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                                  {['Highest', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                          <p className="text-[9px] text-muted-foreground">Ticket summary is auto-generated from the policy name and the matched condition. One ticket per violated asset.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Affected assets preview */}
              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Affected assets</p>
                {!hasAnyCondition ? (
                  <p className="text-[11px] text-muted-foreground">Add a condition to preview impact.</p>
                ) : (
                  <div>
                    <p className="text-[11px]">
                      <span className="font-semibold text-foreground">Affected assets: {affectedEstimate!.evaluated.toLocaleString()}</span>
                      <span className="mx-2 text-muted-foreground">·</span>
                      <span className="text-coral font-medium">Non-compliant (estimated): {affectedEstimate!.nonCompliant.toLocaleString()}</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1">Estimated from current Inventory. Final verdicts are produced on the next evaluation cycle.</p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-4 py-3 flex justify-end gap-2">
                <button onClick={closeCreateModal} className="px-4 py-2 text-xs rounded-lg hover:bg-muted">Cancel</button>
                <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
                <button onClick={() => handleSave(false)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Save & Activate</button>
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
          <div>
            <label className="text-xs text-muted-foreground">Environment Scope</label>
            <div className="flex gap-2 mt-1">
              {['All', 'Production', 'Staging', 'Development'].map(e => (
                <label key={e} className="flex items-center gap-1 text-xs"><input type="checkbox" defaultChecked={e === 'All'} className="rounded" /> {e}</label>
              ))}
            </div>
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
