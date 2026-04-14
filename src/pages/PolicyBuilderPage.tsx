import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies, compliancePosture } from '@/data/mockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Plus, Download, Search } from 'lucide-react';

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [createWizard, setCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [nlInput, setNlInput] = useState('');

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
              <input type="text" placeholder="Search policies..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {policyRules.map(policy => (
              <div key={policy.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-semibold">{policy.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{policy.description}</p>
                  </div>
                  <SeverityBadge severity={policy.severity} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button onClick={() => { setFilters({ policy: policy.name }); setCurrentPage('inventory'); }} className="text-[10px] text-teal hover:underline">
                    {policy.affectedAssets.toLocaleString()} affected assets →
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setConfigModal(policy.id)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Configure</button>
                    <button onClick={() => { setPolicyStates(prev => ({ ...prev, [policy.id]: !prev[policy.id] })); toast.success(`Policy ${policyStates[policy.id] ? 'disabled' : 'enabled'}`); }}
                      className={`w-8 h-4 rounded-full transition-colors relative ${policyStates[policy.id] ? 'bg-teal' : 'bg-muted'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${policyStates[policy.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Last triggered: {policy.lastTriggered}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'custom' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setCreateWizard(true); setWizardStep(1); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
              <Plus className="w-3 h-3" /> Create Policy
            </button>
          </div>
          <div className="space-y-3">
            {customPolicies.map(p => (
              <div key={p.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold">{p.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{p.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-medium ${p.violations > 0 ? 'text-coral' : 'text-teal'}`}>{p.violations} violations</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
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

      {/* Create Policy Wizard */}
      <Modal open={createWizard} onClose={() => setCreateWizard(false)} title={`Create Custom Policy — Step ${wizardStep} of 5`} wide>
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex gap-1 mb-4">
            {['Define', 'Structure', 'Scope', 'Actions', 'Review'].map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded-full ${i + 1 <= wizardStep ? 'bg-teal' : 'bg-muted'}`} />
            ))}
          </div>

          {wizardStep === 1 && (
            <div>
              <label className="text-xs font-medium mb-2 block">Describe your policy in natural language</label>
              <textarea value={nlInput} onChange={e => setNlInput(e.target.value)} rows={4} placeholder='e.g. "All certificates in the payments environment must be renewed at least 30 days before expiry and issued only by DigiCert or Entrust."' className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
              {nlInput.length > 20 && (
                <div className="mt-3 bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-teal mb-1">✦ AI Parsed Rule Preview</p>
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p>Asset type: Certificates</p>
                    <p>Condition: Expiry threshold ≥ 30 days</p>
                    <p>Scope: Payments environment</p>
                    <p>Approved CAs: DigiCert, Entrust</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Asset Type</label><select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs"><option>TLS Certificate</option><option>SSH Key</option><option>All</option></select></div>
              <div><label className="text-xs text-muted-foreground">Condition</label><select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs"><option>Expiry less than</option><option>Algorithm equals</option><option>CA not in list</option></select></div>
              <div><label className="text-xs text-muted-foreground">Value</label><input type="text" defaultValue="30 days" className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs" /></div>
            </div>
          )}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Environment</label><div className="flex gap-2 mt-1">{['All', 'Production', 'Staging', 'Development'].map(e => <label key={e} className="flex items-center gap-1 text-xs"><input type="checkbox" className="rounded" /> {e}</label>)}</div></div>
              <div><label className="text-xs text-muted-foreground">Teams</label><input type="text" placeholder="All teams" className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs" /></div>
            </div>
          )}
          {wizardStep === 4 && (
            <div className="space-y-2">{['Alert only', 'Auto-remediate', 'Escalate to owner', 'Block issuance', 'Create TrustOps ticket'].map(a => <label key={a} className="flex items-center gap-2 text-xs p-2 rounded hover:bg-muted"><input type="checkbox" className="rounded" />{a}</label>)}</div>
          )}
          {wizardStep === 5 && (
            <div className="bg-muted rounded-lg p-4 text-xs space-y-2">
              <p className="font-semibold">Policy Summary</p>
              <p className="text-muted-foreground">Custom policy based on your configuration. Estimated affected assets: 47</p>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setCreateWizard(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">{wizardStep === 1 ? 'Cancel' : 'Back'}</button>
            <button onClick={() => { if (wizardStep < 5) setWizardStep(wizardStep + 1); else { setCreateWizard(false); toast.success('Custom policy created and activated'); } }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">{wizardStep === 5 ? 'Activate' : 'Next'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
