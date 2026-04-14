import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies } from '@/data/mockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Plus, Download, Search, Sparkles } from 'lucide-react';

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Create policy form state — single page, all fields visible
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssetType, setFormAssetType] = useState('TLS Certificate');
  const [formCondition, setFormCondition] = useState('Expiry less than');
  const [formValue, setFormValue] = useState('30 days');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formEnvironments, setFormEnvironments] = useState<string[]>(['All']);
  const [formTeams, setFormTeams] = useState('');
  const [formActions, setFormActions] = useState<string[]>(['Alert only']);

  const toggleEnv = (e: string) => setFormEnvironments(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  const toggleAction = (a: string) => setFormActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormAssetType('TLS Certificate');
    setFormCondition('Expiry less than'); setFormValue('30 days'); setFormSeverity('High');
    setFormEnvironments(['All']); setFormTeams(''); setFormActions(['Alert only']);
  };

  const handleAIDraft = () => {
    if (!formDescription || formDescription.length < 10) {
      toast.error('Enter a description first so AI can parse your intent');
      return;
    }
    // Simulate AI parsing the description
    toast.success('AI parsed your policy description');
    setFormName(formDescription.slice(0, 60));
    setFormAssetType('TLS Certificate');
    setFormCondition('Expiry less than');
    setFormValue('30 days');
    setFormSeverity('High');
    setFormEnvironments(['Production']);
    setFormActions(['Alert only', 'Create TrustOps ticket']);
  };

  const handleSave = (activate: boolean) => {
    if (!formName) { toast.error('Policy name is required'); return; }
    toast.success(activate ? `Policy "${formName}" activated` : `Policy "${formName}" saved as draft`);
    setCreateOpen(false);
    resetForm();
  };

  const filteredPolicies = policyRules.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          { id: 'compliance' as const, label: 'Compliance Frameworks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
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
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setCreateOpen(true); resetForm(); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
              <Plus className="w-3 h-3" /> Create Policy
            </button>
          </div>

          {/* Existing custom policies */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  {['Policy', 'Status', 'Violations'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customPolicies.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => toast.info(`Editing ${p.name}`)}>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.description}</div>
                    </td>
                    <td className="py-2.5 px-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal">{p.status}</span></td>
                    <td className="py-2.5 px-3"><span className={`font-medium ${p.violations > 0 ? 'text-coral' : 'text-teal'}`}>{p.violations}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create policy — single-page form in a modal */}
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Custom Policy" wide>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Optional AI assist button */}
              <div className="flex justify-end">
                <button onClick={handleAIDraft} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal/10 text-teal text-[11px] hover:bg-teal/20 border border-teal/20">
                  <Sparkles className="w-3.5 h-3.5" /> AI Auto-fill from Description
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Policy Name</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. DORA Compliance — Production Certs" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>

              {/* Description (natural language) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description (plain English)</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} placeholder='e.g. "All certificates in the payments environment must be renewed at least 30 days before expiry and issued only by DigiCert or Entrust."' className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Asset Type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Asset Type</label>
                  <select value={formAssetType} onChange={e => setFormAssetType(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                    {['TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token', 'All'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Severity</label>
                  <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Condition</label>
                  <select value={formCondition} onChange={e => setFormCondition(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                    {['Expiry less than', 'Algorithm equals', 'CA not in list', 'Key length less than', 'No rotation in'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Value</label>
                  <input type="text" value={formValue} onChange={e => setFormValue(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
                </div>
              </div>

              {/* Environment */}
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

              {/* Teams */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Teams (optional)</label>
                <input type="text" value={formTeams} onChange={e => setFormTeams(e.target.value)} placeholder="All teams" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>

              {/* Actions on violation */}
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

              {/* Summary preview */}
              {formName && (
                <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
                  <p className="font-semibold">Policy Preview</p>
                  <p className="text-muted-foreground">
                    <strong>{formName}</strong> — {formCondition} {formValue} on {formAssetType} in {formEnvironments.join(', ')} environments. Severity: {formSeverity}. Actions: {formActions.join(', ')}.
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
                <button onClick={() => handleSave(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
                <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Activate</button>
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
