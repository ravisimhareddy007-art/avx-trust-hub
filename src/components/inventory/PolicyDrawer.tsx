import React, { useState } from 'react';
import { ConditionSet } from './GroupsPanel';
import { mockGroups } from '@/data/inventoryMockData';
import { Shield, Sparkles, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';

interface PolicyDrawerProps {
  open: boolean;
  onClose: () => void;
  groupId?: string;
  groupName?: string;
  preConditions?: ConditionSet;
}

export default function PolicyDrawer({ open, onClose, groupId, groupName, preConditions }: PolicyDrawerProps) {
  const { setCurrentPage, setFilters } = useNav();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assetType, setAssetType] = useState('All');
  const [condition, setCondition] = useState('Expiry less than');
  const [value, setValue] = useState('30 days');
  const [severity, setSeverity] = useState('High');
  const [mode, setMode] = useState<'Report' | 'Warn' | 'Enforce' | 'Quarantine'>('Warn');
  const [environments, setEnvironments] = useState<string[]>(['All']);
  const [actions, setActions] = useState<string[]>(['Alert only']);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(groupId ? [groupId] : []);
  const [aiLoading, setAiLoading] = useState(false);

  const toggleEnv = (e: string) => setEnvironments(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  const toggleAction = (a: string) => setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleGroup = (gid: string) => setSelectedGroups(prev => prev.includes(gid) ? prev.filter(x => x !== gid) : [...prev, gid]);

  const handleBlockWeakAlgorithms = () => {
    setName('Block Weak Algorithms');
    setDescription('Block RSA < 2048, ECDSA < P-256, SHA-1, TLS < 1.2');
    setCondition('Algorithm equals');
    setValue('RSA-2048');
    setSeverity('Critical');
    setMode('Warn');
    setActions(['Alert only', 'Escalate to owner']);
    // Pre-select RSA-2048 Production Certs group
    const rsaGroup = mockGroups.find(g => g.name.includes('RSA-2048'));
    if (rsaGroup && !selectedGroups.includes(rsaGroup.id)) {
      setSelectedGroups(prev => [...prev, rsaGroup.id]);
    }
    toast.info('Template loaded — review groups and save');
  };

  const handleAI = () => {
    if (!description || description.length < 10) { toast.error('Enter a description first'); return; }
    setAiLoading(true);
    setTimeout(() => {
      const lower = description.toLowerCase();
      if (lower.includes('weak') || lower.includes('block')) {
        setName(description.slice(0, 60));
        setCondition('Algorithm equals');
        setValue('RSA-2048');
        setSeverity('Critical');
        setActions(['Alert only', 'Block issuance']);
        const rsaGroup = mockGroups.find(g => g.name.includes('RSA-2048'));
        if (rsaGroup) setSelectedGroups([rsaGroup.id]);
      } else if (lower.includes('expir')) {
        setName(description.slice(0, 60));
        setCondition('Expiry less than');
        setValue('30 days');
        setSeverity('High');
        setActions(['Alert only', 'Create TrustOps ticket']);
        const expiryGroup = mockGroups.find(g => g.name.includes('Expiring'));
        if (expiryGroup) setSelectedGroups([expiryGroup.id]);
      } else {
        setName(description.slice(0, 60));
      }
      setAiLoading(false);
      toast.success('AI parsed your policy intent');
    }, 700);
  };

  const handleSave = (activate: boolean) => {
    if (!name.trim()) { toast.error('Policy name is required'); return; }
    if (selectedGroups.length === 0) { toast.error('Select at least one group'); return; }
    const groupNames = selectedGroups.map(gid => mockGroups.find(g => g.id === gid)?.name || gid).join(', ');
    toast.success(`Policy "${name}" applied to ${groupNames}${activate ? ' — active' : ' — draft'}`);
    onClose();
  };

  const handleOpenInPolicyBuilder = () => {
    setFilters({ prefillPolicy: name, prefillDescription: description });
    setCurrentPage('policy-builder');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[480px] bg-card border-l border-border shadow-xl h-full overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal" /> Policy Builder
            </h3>
            {groupName && (
              <p className="text-[10px] text-teal mt-0.5">Creating policy for: <span className="font-medium">{groupName}</span></p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick template */}
          <button onClick={handleBlockWeakAlgorithms}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-teal/30 bg-teal/5 text-xs text-teal hover:bg-teal/10 transition-colors">
            <Shield className="w-3.5 h-3.5" /> Quick: Block Weak Algorithms (RSA &lt; 2048, SHA-1, TLS &lt; 1.2)
          </button>

          {/* Description + AI */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Describe your policy</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder='e.g. "Block all RSA-2048 in production"'
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none" />
          </div>
          <button onClick={handleAI} disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal/10 text-teal text-xs hover:bg-teal/20 border border-teal/20 disabled:opacity-50 w-full justify-center">
            {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing...</> : <><Sparkles className="w-3.5 h-3.5" /> AI Auto-fill</>}
          </button>

          <div className="h-px bg-border" />

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Policy Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs" />
          </div>

          {/* Group selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Apply to Groups *</label>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {mockGroups.map(g => (
                <label key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${selectedGroups.includes(g.id) ? 'bg-teal/5 border-teal/30' : 'bg-muted border-border hover:border-foreground/20'}`}>
                  <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={() => toggleGroup(g.id)} className="rounded" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-foreground">{g.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-1">{g.objectCount} identities</span>
                  </div>
                </label>
              ))}
            </div>
            {selectedGroups.length === 0 && <p className="text-[9px] text-coral mt-1">Select at least one group</p>}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Asset Type</label>
              <select value={assetType} onChange={e => setAssetType(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                {['All', 'TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                {['Expiry less than', 'Algorithm equals', 'CA not in list', 'Key length less than', 'No rotation in'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Value</label>
              <input type="text" value={value} onChange={e => setValue(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs" />
            </div>
          </div>

          {/* Enforcement mode */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Enforcement Mode</label>
            <div className="flex gap-2">
              {(['Report', 'Warn', 'Enforce', 'Quarantine'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${mode === m ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Environment Scope</label>
            <div className="flex gap-2">
              {['All', 'Production', 'Staging', 'Development'].map(e => (
                <button key={e} onClick={() => toggleEnv(e)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${environments.includes(e) ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Actions on Violation</label>
            <div className="flex flex-wrap gap-2">
              {['Alert only', 'Auto-remediate', 'Escalate to owner', 'Block issuance', 'Create TrustOps ticket'].map(a => (
                <button key={a} onClick={() => toggleAction(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${actions.includes(a) ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {name && (
            <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold">Policy Preview</p>
              <p className="text-muted-foreground">
                <strong>{name}</strong> — {condition} {value}. Mode: {mode}. Severity: {severity}.
                Groups: {selectedGroups.length > 0 ? selectedGroups.map(gid => mockGroups.find(g => g.id === gid)?.name || gid).join(', ') : 'None'}.
                Env: {environments.join(', ')}. Actions: {actions.join(', ')}.
              </p>
            </div>
          )}

          {/* Save buttons */}
          <div className="flex justify-between pt-2 border-t border-border">
            <button onClick={handleOpenInPolicyBuilder} className="text-[10px] text-teal hover:underline">Open in full Policy Builder →</button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button onClick={() => handleSave(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
              <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Activate</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
