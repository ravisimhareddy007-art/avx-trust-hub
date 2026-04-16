import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies as initialCustomPolicies } from '@/data/mockData';
import { mockGroups } from '@/data/inventoryMockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Plus, Download, Search, Sparkles, ChevronDown, ChevronUp, Shield, AlertTriangle, CheckSquare } from 'lucide-react';

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
}

// Mock violations data
const mockViolations = [
  { id: 'v-001', policyName: 'Weak Algorithm Detection', objectName: '*.payments.acmecorp.com', objectType: 'TLS Certificate', severity: 'Critical' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-14 09:12', status: 'Open' },
  { id: 'v-002', policyName: 'Certificate Expiry Alert', objectName: 'vault.internal.acmecorp.com', objectType: 'TLS Certificate', severity: 'Critical' as const, environment: 'Production', group: 'Expiring < 30 Days', detectedAt: '2026-04-14 08:45', status: 'Open' },
  { id: 'v-003', policyName: 'Weak Algorithm Detection', objectName: 'prod-db-01-authorized-key', objectType: 'SSH Key', severity: 'High' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-13 22:00', status: 'Open' },
  { id: 'v-004', policyName: 'Orphaned SSH Key', objectName: 'gitlab-deploy-key', objectType: 'SSH Key', severity: 'High' as const, environment: 'Production', group: 'Orphaned & Unowned Keys', detectedAt: '2026-04-13 18:30', status: 'Open' },
  { id: 'v-005', policyName: 'Certificate Expiry Alert', objectName: 'mail.acmecorp.com', objectType: 'TLS Certificate', severity: 'High' as const, environment: 'Production', group: 'Expiring < 30 Days', detectedAt: '2026-04-13 14:20', status: 'Open' },
  { id: 'v-006', policyName: 'PCI-DSS Cardholder Zone', objectName: 'k8s-node-ssh-cert', objectType: 'SSH Certificate', severity: 'Critical' as const, environment: 'Production', group: 'Payments Team Assets', detectedAt: '2026-04-13 11:05', status: 'Acknowledged' },
  { id: 'v-007', policyName: 'Weak Algorithm Detection', objectName: 'auth-gateway.acmecorp.com', objectType: 'TLS Certificate', severity: 'High' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-12 16:42', status: 'Open' },
  { id: 'v-008', policyName: 'DORA Compliance', objectName: 'staging-api.acmecorp.com', objectType: 'TLS Certificate', severity: 'Medium' as const, environment: 'Staging', group: '', detectedAt: '2026-04-12 10:00', status: 'Open' },
  { id: 'v-009', policyName: 'Orphaned SSH Key', objectName: 'bastion-host-key-legacy', objectType: 'SSH Key', severity: 'High' as const, environment: 'Production', group: 'Orphaned & Unowned Keys', detectedAt: '2026-04-11 22:15', status: 'Open' },
  { id: 'v-010', policyName: 'Certificate Expiry Alert', objectName: 'cdn-edge-cert-03', objectType: 'TLS Certificate', severity: 'Medium' as const, environment: 'Production', group: 'Expiring < 30 Days', detectedAt: '2026-04-11 15:30', status: 'Remediated' },
  { id: 'v-011', policyName: 'Weak Algorithm Detection', objectName: 'legacy-erp-cert', objectType: 'TLS Certificate', severity: 'Critical' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-10 09:00', status: 'Open' },
  { id: 'v-012', policyName: 'AI Agent Over-Privilege', objectName: 'data-pipeline-agent', objectType: 'AI Agent Token', severity: 'High' as const, environment: 'Production', group: 'Over-Privileged AI Agents', detectedAt: '2026-04-10 08:15', status: 'Open' },
];

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'violations' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies.map(p => ({ ...p })));
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  // Create policy form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssetType, setFormAssetType] = useState('TLS Certificate');
  const [formCondition, setFormCondition] = useState('Expiry less than');
  const [formValue, setFormValue] = useState('30 days');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formEnvironments, setFormEnvironments] = useState<string[]>(['All']);
  const [formTeams, setFormTeams] = useState('');
  const [formActions, setFormActions] = useState<string[]>(['Alert only']);
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Violations tab state
  const [violationSearch, setViolationSearch] = useState('');
  const [violationSeverity, setViolationSeverity] = useState('');
  const [violationStatus, setViolationStatus] = useState('');
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const toggleEnv = (e: string) => setFormEnvironments(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  const toggleAction = (a: string) => setFormActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleGroup = (gid: string) => setFormGroupIds(prev => prev.includes(gid) ? prev.filter(x => x !== gid) : [...prev, gid]);

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormAssetType('TLS Certificate');
    setFormCondition('Expiry less than'); setFormValue('30 days'); setFormSeverity('High');
    setFormEnvironments(['All']); setFormTeams(''); setFormActions(['Alert only']); setFormGroupIds([]);
    setEditingPolicy(null);
  };

  const aiTemplates: Record<string, { name: string; assetType: string; condition: string; value: string; severity: string; envs: string[]; actions: string[]; groups: string[] }> = {
    'expir': { name: '', assetType: 'TLS Certificate', condition: 'Expiry less than', value: '30 days', severity: 'High', envs: ['Production'], actions: ['Alert only', 'Create TrustOps ticket'], groups: ['grp-002'] },
    'rsa': { name: '', assetType: 'TLS Certificate', condition: 'Algorithm equals', value: 'RSA-2048', severity: 'Critical', envs: ['All'], actions: ['Alert only', 'Escalate to owner'], groups: ['grp-001'] },
    'weak': { name: '', assetType: 'TLS Certificate', condition: 'Algorithm equals', value: 'RSA-2048', severity: 'Critical', envs: ['All'], actions: ['Alert only', 'Block issuance'], groups: ['grp-001'] },
    'block': { name: '', assetType: 'TLS Certificate', condition: 'Algorithm equals', value: 'RSA-2048', severity: 'Critical', envs: ['Production'], actions: ['Block issuance', 'Escalate to owner'], groups: ['grp-001'] },
    'rotat': { name: '', assetType: 'SSH Key', condition: 'No rotation in', value: '90 days', severity: 'High', envs: ['Production'], actions: ['Alert only', 'Auto-remediate'], groups: ['grp-003'] },
    'ca': { name: '', assetType: 'TLS Certificate', condition: 'CA not in list', value: 'DigiCert, Entrust, GlobalSign', severity: 'Medium', envs: ['Production'], actions: ['Block issuance'], groups: [] },
    'key': { name: '', assetType: 'Encryption Key', condition: 'Key length less than', value: '256 bits', severity: 'Critical', envs: ['All'], actions: ['Alert only', 'Escalate to owner'], groups: [] },
    'pci': { name: '', assetType: 'TLS Certificate', condition: 'Algorithm equals', value: 'RSA-2048', severity: 'Critical', envs: ['Production'], actions: ['Alert only', 'Block issuance', 'Create TrustOps ticket'], groups: ['grp-004'] },
    'dora': { name: '', assetType: 'TLS Certificate', condition: 'Expiry less than', value: '90 days', severity: 'High', envs: ['Production'], actions: ['Alert only', 'Create TrustOps ticket'], groups: [] },
    'ssh': { name: '', assetType: 'SSH Key', condition: 'No rotation in', value: '60 days', severity: 'High', envs: ['All'], actions: ['Alert only', 'Auto-remediate'], groups: ['grp-003'] },
  };

  const handleAIDraft = () => {
    if (!formDescription || formDescription.length < 10) {
      toast.error('Enter a description first so AI can parse your intent');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      const desc = formDescription.toLowerCase();
      let matched = false;
      for (const [keyword, template] of Object.entries(aiTemplates)) {
        if (desc.includes(keyword)) {
          setFormName(formDescription.length > 60 ? formDescription.slice(0, 57) + '...' : formDescription);
          setFormAssetType(template.assetType);
          setFormCondition(template.condition);
          setFormValue(template.value);
          setFormSeverity(template.severity);
          setFormEnvironments(template.envs);
          setFormActions(template.actions);
          setFormGroupIds(template.groups);
          matched = true;
          break;
        }
      }
      if (!matched) {
        setFormName(formDescription.length > 60 ? formDescription.slice(0, 57) + '...' : formDescription);
      }
      setAiLoading(false);
      toast.success('AI parsed your policy — review and adjust fields below');
    }, 800);
  };

  const handleSave = (activate: boolean) => {
    if (!formName) { toast.error('Policy name is required'); return; }
    if (formGroupIds.length === 0) { toast.error('Select at least one group to apply this policy'); return; }
    const newPolicy: CustomPolicy = {
      id: editingPolicy || `cpol-${Date.now()}`,
      name: formName,
      description: formDescription || `${formCondition} ${formValue} on ${formAssetType}`,
      status: activate ? 'Active' : 'Draft',
      violations: 0,
      assetType: formAssetType,
      condition: formCondition,
      value: formValue,
      severity: formSeverity,
      environments: formEnvironments,
      teams: formTeams,
      actions: formActions,
      groupIds: formGroupIds,
    };
    if (editingPolicy) {
      setUserPolicies(prev => prev.map(p => p.id === editingPolicy ? newPolicy : p));
      toast.success(`Policy "${formName}" updated`);
    } else {
      setUserPolicies(prev => [newPolicy, ...prev]);
      toast.success(activate ? `Policy "${formName}" created & activated` : `Policy "${formName}" saved as draft`);
    }
    setCreateOpen(false);
    resetForm();
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    setFormName(p.name);
    setFormDescription(p.description);
    setFormAssetType(p.assetType || 'TLS Certificate');
    setFormCondition(p.condition || 'Expiry less than');
    setFormValue(p.value || '30 days');
    setFormSeverity(p.severity || 'High');
    setFormEnvironments(p.environments || ['All']);
    setFormTeams(p.teams || '');
    setFormActions(p.actions || ['Alert only']);
    setFormGroupIds(p.groupIds || []);
    setEditingPolicy(p.id);
    setCreateOpen(true);
  };

  const deletePolicy = (id: string) => {
    setUserPolicies(prev => prev.filter(p => p.id !== id));
    toast.success('Policy deleted');
  };

  const togglePolicyStatus = (id: string) => {
    setUserPolicies(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'Active' ? 'Draft' : 'Active' } : p));
  };

  const filteredPolicies = policyRules.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredViolations = mockViolations.filter(v => {
    if (violationSearch && !v.objectName.toLowerCase().includes(violationSearch.toLowerCase()) && !v.policyName.toLowerCase().includes(violationSearch.toLowerCase())) return false;
    if (violationSeverity && v.severity !== violationSeverity) return false;
    if (violationStatus && v.status !== violationStatus) return false;
    return true;
  });

  const toggleViolationSelection = (id: string) => {
    setSelectedViolations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAllViolations = () => {
    if (selectedViolations.length === filteredViolations.length) setSelectedViolations([]);
    else setSelectedViolations(filteredViolations.map(v => v.id));
  };

  const openViolationCount = mockViolations.filter(v => v.status === 'Open').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy Builder</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'outofbox' as const, label: 'Out-of-Box Policies' },
          { id: 'custom' as const, label: 'Custom Policies' },
          { id: 'violations' as const, label: `Violations`, count: openViolationCount },
          { id: 'compliance' as const, label: 'Compliance Frameworks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
            {'count' in t && t.count! > 0 && (
              <span className={`min-w-[18px] px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === t.id ? 'bg-coral/10 text-coral' : 'bg-coral/10 text-coral'}`}>{t.count}</span>
            )}
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
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setCreateOpen(true); resetForm(); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
              <Plus className="w-3 h-3" /> Create Policy
            </button>
          </div>

          {userPolicies.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No custom policies yet</p>
              <button onClick={() => { setCreateOpen(true); resetForm(); }} className="text-xs text-teal hover:underline">Create your first policy</button>
            </div>
          ) : (
            <div className="space-y-2">
              {userPolicies.map(p => (
                <div key={p.id} className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedPolicy(expandedPolicy === p.id ? null : p.id)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'Active' ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{p.name}</p>
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
                      <div className="grid grid-cols-5 gap-3 text-xs">
                        <div><span className="text-muted-foreground block mb-0.5">Asset Type</span><span className="font-medium">{p.assetType || 'All'}</span></div>
                        <div><span className="text-muted-foreground block mb-0.5">Condition</span><span className="font-medium">{p.condition || '—'} {p.value || ''}</span></div>
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
              ))}
            </div>
          )}

          {/* Create/Edit policy modal */}
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={editingPolicy ? 'Edit Policy' : 'Create Custom Policy'} wide>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Description first for AI */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Describe your policy (plain English)</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder='e.g. "Block all RSA-2048 in production" or "All certs in payments must renew 30d before expiry"' className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>

              {/* AI button */}
              <button onClick={handleAIDraft} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal/10 text-teal text-xs hover:bg-teal/20 border border-teal/20 disabled:opacity-50 w-full justify-center">
                <Sparkles className="w-3.5 h-3.5" /> {aiLoading ? 'Parsing...' : 'AI Auto-fill from Description'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2"><div className="flex-1 h-px bg-border" /><span className="text-[10px] text-muted-foreground">or fill manually</span><div className="flex-1 h-px bg-border" /></div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Policy Name *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. DORA Compliance — Production Certs" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Asset Type</label>
                  <select value={formAssetType} onChange={e => setFormAssetType(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                    {['TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token', 'All'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Severity</label>
                  <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Condition</label>
                  <select value={formCondition} onChange={e => setFormCondition(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                    {['Expiry less than', 'Algorithm equals', 'CA not in list', 'Key length less than', 'No rotation in'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Value</label>
                  <input type="text" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
                </div>
              </div>

              {/* Group mapping — REQUIRED */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Apply to Groups *</label>
                <div className="space-y-1.5">
                  {mockGroups.map(g => (
                    <label key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${formGroupIds.includes(g.id) ? 'bg-teal/5 border-teal/30' : 'bg-muted border-border hover:border-foreground/20'}`}>
                      <input type="checkbox" checked={formGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="rounded" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground">{g.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{g.objectCount} identities · {g.type}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.riskScore > 70 ? 'bg-coral/10 text-coral' : g.riskScore > 40 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal'}`}>Risk {g.riskScore}</span>
                    </label>
                  ))}
                </div>
                {formGroupIds.length === 0 && <p className="text-[10px] text-coral mt-1">At least one group must be selected</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Environment Scope</label>
                <div className="flex gap-2">
                  {['All', 'Production', 'Staging', 'Development'].map(e => (
                    <button key={e} onClick={() => toggleEnv(e)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${formEnvironments.includes(e) ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Teams (optional)</label>
                <input type="text" value={formTeams} onChange={e => setFormTeams(e.target.value)} placeholder="All teams" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Actions on Violation</label>
                <div className="flex flex-wrap gap-2">
                  {['Alert only', 'Auto-remediate', 'Escalate to owner', 'Block issuance', 'Create TrustOps ticket'].map(a => (
                    <button key={a} onClick={() => toggleAction(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${formActions.includes(a) ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {formName && (
                <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
                  <p className="font-semibold">Policy Preview</p>
                  <p className="text-muted-foreground">
                    <strong>{formName}</strong> — {formCondition} {formValue} on {formAssetType} in {formEnvironments.join(', ')} environments.
                    Severity: {formSeverity}. Groups: {formGroupIds.length > 0 ? formGroupIds.map(gid => mockGroups.find(g => g.id === gid)?.name || gid).join(', ') : 'None'}.
                    Actions: {formActions.join(', ')}.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
                <button onClick={() => handleSave(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
                <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">{editingPolicy ? 'Save' : 'Activate'}</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* VIOLATIONS TAB */}
      {tab === 'violations' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={violationSearch} onChange={e => setViolationSearch(e.target.value)} placeholder="Search violations..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
            <select value={violationSeverity} onChange={e => setViolationSeverity(e.target.value)} className="px-2 py-2 bg-card border border-border rounded-lg text-xs">
              <option value="">All Severity</option>
              {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={violationStatus} onChange={e => setViolationStatus(e.target.value)} className="px-2 py-2 bg-card border border-border rounded-lg text-xs">
              <option value="">All Status</option>
              {['Open', 'Acknowledged', 'Remediated'].map(s => <option key={s}>{s}</option>)}
            </select>
            {selectedViolations.length > 0 && (
              <button onClick={() => setBulkConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
                <CheckSquare className="w-3.5 h-3.5" /> Bulk Remediate ({selectedViolations.length})
              </button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{filteredViolations.length} violations</span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Open', count: mockViolations.filter(v => v.status === 'Open').length, color: 'text-coral' },
              { label: 'Critical', count: mockViolations.filter(v => v.severity === 'Critical').length, color: 'text-coral' },
              { label: 'Acknowledged', count: mockViolations.filter(v => v.status === 'Acknowledged').length, color: 'text-amber' },
              { label: 'Remediated', count: mockViolations.filter(v => v.status === 'Remediated').length, color: 'text-teal' },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-lg border border-border p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Violations table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 w-8"><input type="checkbox" checked={selectedViolations.length === filteredViolations.length && filteredViolations.length > 0} onChange={toggleAllViolations} className="rounded" /></th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Policy</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Object</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Env</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Group</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Detected</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map(v => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3"><input type="checkbox" checked={selectedViolations.includes(v.id)} onChange={() => toggleViolationSelection(v.id)} className="rounded" /></td>
                    <td className="py-2.5 px-3 font-medium">{v.policyName}</td>
                    <td className="py-2.5 px-2 text-foreground">{v.objectName}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-[10px]">{v.objectType}</td>
                    <td className="py-2.5 px-2"><SeverityBadge severity={v.severity} /></td>
                    <td className="py-2.5 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{v.environment}</span></td>
                    <td className="py-2.5 px-2 text-[10px] text-muted-foreground">{v.group || '—'}</td>
                    <td className="py-2.5 px-2 text-[10px] text-muted-foreground">{v.detectedAt}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.status === 'Open' ? 'bg-coral/10 text-coral' : v.status === 'Acknowledged' ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal'}`}>{v.status}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex gap-1">
                        {v.status === 'Open' && (
                          <>
                            <button onClick={() => toast.success(`Remediation started for ${v.objectName}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Fix</button>
                            <button onClick={() => toast.info(`Acknowledged: ${v.objectName}`)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Ack</button>
                          </>
                        )}
                        <button onClick={() => { setFilters({ violation: v.objectName }); setCurrentPage('inventory'); }} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bulk remediate confirmation */}
          <Modal open={bulkConfirm} onClose={() => setBulkConfirm(false)} title="Confirm Bulk Remediation">
            <div className="space-y-4">
              <div className="bg-amber/5 border border-amber/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  You are about to initiate remediation for <span className="font-bold text-foreground">{selectedViolations.length}</span> violations. This will create tickets and trigger automated workflows where available.
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedViolations.map(id => {
                  const v = mockViolations.find(x => x.id === id);
                  return v ? (
                    <div key={id} className="flex items-center gap-2 text-[10px] py-1">
                      <SeverityBadge severity={v.severity} />
                      <span className="text-foreground">{v.objectName}</span>
                      <span className="text-muted-foreground">— {v.policyName}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBulkConfirm(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
                <button onClick={() => { setBulkConfirm(false); setSelectedViolations([]); toast.success(`Remediation initiated for ${selectedViolations.length} violations`); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Confirm & Remediate</button>
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

      {/* Configure Modal */}
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
