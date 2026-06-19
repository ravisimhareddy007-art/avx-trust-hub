import { FEATURES } from '@/config/features';
import React, { useState } from 'react';
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
} from 'lucide-react';

interface CustomPolicy {
  id: string;
  name: string;
  description: string;
  status: string;
  violations: number;
  assetType?: string;
  condition?: string;
  value?: string;
  severity?: string;
  environments?: string[];
  teams?: string;
  actions?: string[];
  groupIds?: string[];
  conditionGroups?: ConditionGroup[];
  groupLogic?: 'AND' | 'OR';
  conditionSummary?: string;
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
  const [formEnvironment, setFormEnvironment] = useState('All');
  const [formTeam, setFormTeam] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formAction, setFormAction] = useState('Alert only');
  const [formRequireApproval, setFormRequireApproval] = useState(false);
  const [formApprovalType, setFormApprovalType] = useState('User Group');
  const [formApprovalTarget, setFormApprovalTarget] = useState('');
  const [formNotifyVia, setFormNotifyVia] = useState('Email');
  const [formNotifyRecipient, setFormNotifyRecipient] = useState('');
  const [formNotifyOnStart, setFormNotifyOnStart] = useState(false);
  const [formNotifyOnFail, setFormNotifyOnFail] = useState(true);
  const [formNotifyOnComplete, setFormNotifyOnComplete] = useState(false);
  const [formITSM, setFormITSM] = useState(false);
  const [formItsmPriority, setFormItsmPriority] = useState('2-High');
  const [formItsmType, setFormItsmType] = useState('Normal');
  const [showApproval, setShowApproval] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showItsm, setShowItsm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Condition builder state
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([emptyGroup()]);
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>('AND');

  const resetCreateForm = () => {
    setFormPolicyType('Managed Certificate Policy');
    setFormName('');
    setFormDescription('');
    setFormTag('Default');
    setFormEnvironment('All');
    setFormTeam('');
    setFormGroup('');
    setFormSeverity('High');
    setFormAction('Alert only');
    setFormRequireApproval(false);
    setFormApprovalType('User Group');
    setFormApprovalTarget('');
    setFormNotifyVia('Email');
    setFormNotifyRecipient('');
    setFormNotifyOnStart(false);
    setFormNotifyOnFail(true);
    setFormNotifyOnComplete(false);
    setFormITSM(false);
    setFormItsmPriority('2-High');
    setFormItsmType('Normal');
    setShowApproval(false);
    setShowNotifications(false);
    setShowItsm(false);
    setConditionGroups([emptyGroup()]);
    setGroupLogic('AND');
    setEditingPolicy(null);
  };

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
      setFormAction('Create ticket');
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

  // AI assist: draft a starter condition set from a plain-English description.
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
        if (d.includes('produc')) setFormEnvironment('Production');
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
      description: formDescription || `${formPolicyType} — ${formEnvironment}`,
      status: draft ? 'Draft' : 'Active',
      violations: 0,
      assetType: formPolicyType.includes('Cryptographic Key')
        ? 'Cryptographic Key'
        : formPolicyType.includes('Certificate')
          ? 'TLS Certificate'
          : formPolicyType.includes('SSH')
            ? 'SSH Key'
            : 'API Key / Secret',
      condition: formAction,
      severity: formSeverity,
      environments: formEnvironment === 'All' ? ['All'] : [formEnvironment],
      teams: formTeam,
      actions: [formAction],
      groupIds: formGroup ? [formGroup] : [],
      conditionGroups,
      groupLogic,
      conditionSummary: summary,
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
    setFormEnvironment(p.environments?.[0] || 'All');
    setFormTeam(p.teams || '');
    setFormGroup(p.groupIds?.[0] || '');
    setFormAction(p.actions?.[0] || p.condition || 'Alert only');
    if ((p.assetType || '').includes('SSH')) setFormPolicyType('SSH Key Policy');
    else if ((p.assetType || '').includes('Cryptographic Key')) setFormPolicyType('Cryptographic Key Policy');
    else if ((p.assetType || '').includes('Secret') || (p.assetType || '').includes('API')) setFormPolicyType('Secrets & API Keys Policy');
    else setFormPolicyType('Managed Certificate Policy');
    setConditionGroups(p.conditionGroups && p.conditionGroups.length ? p.conditionGroups : [emptyGroup()]);
    setGroupLogic(p.groupLogic || 'AND');
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
                        {p.groupIds && p.groupIds.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{p.groupIds.length} group{p.groupIds.length > 1 ? 's' : ''}</span>
                        )}
                        {p.violations > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/10 text-coral font-medium">{p.violations} violations</span>}
                        {p.severity && <span className="text-[10px] text-muted-foreground">{p.severity}</span>}
                        {expandedPolicy === p.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedPolicy === p.id && (
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div><span className="text-muted-foreground block mb-0.5">Asset Type</span><span className="font-medium">{p.assetType || 'All'}</span></div>
                          <div><span className="text-muted-foreground block mb-0.5">Environment</span><span className="font-medium">{p.environments?.join(', ') || 'All'}</span></div>
                          <div><span className="text-muted-foreground block mb-0.5">Teams</span><span className="font-medium">{p.teams || 'All'}</span></div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5">Groups</span>
                            <span className="font-medium">
                              {p.groupIds && p.groupIds.length > 0
                                ? p.groupIds.map(gid => mockGroups.find(g => g.id === gid)?.name || gid).join(', ')
                                : 'None'}
                            </span>
                          </div>
                        </div>
                        {p.conditionSummary && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-1">Conditions</span>
                            <p className="text-[11px] font-mono bg-muted/40 border border-border rounded px-2 py-1.5">{p.conditionSummary}</p>
                          </div>
                        )}
                        {p.actions && p.actions.length > 0 && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-1">Actions on Violation</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {p.actions.map(a => <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">{a}</span>)}
                            </div>
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

              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Scope</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Environment</label>
                    <select value={formEnvironment} onChange={e => setFormEnvironment(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['All', 'Production', 'Staging', 'Development'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Team</label>
                    <input value={formTeam} onChange={e => setFormTeam(e.target.value)} placeholder="e.g. Payments Engineering" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Compliance Group</label>
                    <select value={formGroup} onChange={e => setFormGroup(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      <option>All</option>
                      {mockGroups.map(group => <option key={group.id}>{group.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

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

              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">On Violation</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Action</label>
                    <select value={formAction} onChange={e => setFormAction(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Alert only', 'Block action', 'Auto-remediate', 'Create ticket', 'Escalate to owner'].map(option => <option key={option}>{option}</option>)}
                    </select>
                    <p className="text-[9px] text-muted-foreground mt-1">Alert only is always applied in addition to other actions.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Severity</label>
                    <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Low', 'Medium', 'High', 'Critical'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <button onClick={() => setShowApproval(prev => !prev)} className="w-full flex items-center justify-between cursor-pointer py-2">
                  <span className="text-[11px] font-medium">Approval & Workflow</span>
                  {showApproval ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showApproval && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between py-2">
                      <p className="text-[11px] font-medium">Require approval before action?</p>
                      <button onClick={() => setFormRequireApproval(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formRequireApproval ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formRequireApproval ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {formRequireApproval && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Approval type</label>
                          <select value={formApprovalType} onChange={e => setFormApprovalType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                            {['User Group', 'Specific User', 'Email', 'LDAP Manager'].map(option => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Approver</label>
                          <input value={formApprovalTarget} onChange={e => setFormApprovalTarget(e.target.value)} placeholder={formApprovalType === 'User Group' ? 'e.g. Security-Ops-Group' : formApprovalType === 'Specific User' ? 'e.g. john@acme.com' : formApprovalType === 'Email' ? 'e.g. security@acme.com' : 'Fetched from LDAP directory'} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <button onClick={() => setShowNotifications(prev => !prev)} className="w-full flex items-center justify-between cursor-pointer py-2">
                  <span className="text-[11px] font-medium">Notifications</span>
                  {showNotifications ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showNotifications && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Notify via</label>
                        <select value={formNotifyVia} onChange={e => setFormNotifyVia(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Email', 'Slack'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Recipient</label>
                        <input value={formNotifyRecipient} onChange={e => setFormNotifyRecipient(e.target.value)} placeholder={formNotifyVia === 'Email' ? 'Recipient email address' : 'Slack channel e.g. #security-alerts'} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                      </div>
                    </div>
                    {[
                      ['On action start', formNotifyOnStart, setFormNotifyOnStart],
                      ['On completion', formNotifyOnComplete, setFormNotifyOnComplete],
                      ['On failure', formNotifyOnFail, setFormNotifyOnFail],
                    ].map(([label, value, setter]) => (
                      <div key={label as string} className="flex items-center justify-between py-2 text-[11px]">
                        <span>{label as string}</span>
                        <button onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${(value as boolean) ? 'bg-teal' : 'bg-muted'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${(value as boolean) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <button onClick={() => setShowItsm(prev => !prev)} className="w-full flex items-center justify-between cursor-pointer py-2">
                  <span className="text-[11px] font-medium">ITSM / ServiceNow <span className="text-[9px] text-teal">(ServiceNow connected)</span></span>
                  {showItsm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showItsm && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between py-2">
                      <p className="text-[11px] font-medium">Create a ServiceNow change request?</p>
                      <button onClick={() => setFormITSM(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formITSM ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formITSM ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {formITSM && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Request Type</label>
                            <select value={formItsmType} onChange={e => setFormItsmType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['Normal', 'Standard', 'Emergency'].map(option => <option key={option}>{option}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Priority</label>
                            <select value={formItsmPriority} onChange={e => setFormItsmPriority(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['1-Critical', '2-High', '3-Moderate', '4-Low'].map(option => <option key={option}>{option}</option>)}
                            </select>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground">Short description auto-populated from policy name. Assignment group from owner.</p>
                      </>
                    )}
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
