import React, { useState, useMemo } from 'react';
import { mockGroups, aiSuggestedGroups, DynamicGroup, GroupCondition, conditionAttributes } from '@/data/inventoryMockData';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, EnvBadge, DaysToExpiry, Modal } from '@/components/shared/UIComponents';
import { Search, Plus, Sparkles, Shield, ShieldOff, ChevronDown, ChevronRight, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onCreateTicket: (ctx: any) => void;
  onOpenPolicyDrawer: (groupId: string, groupName: string) => void;
}

function ConditionBuilder({ conditions, onChange }: { conditions: GroupCondition[]; onChange: (c: GroupCondition[]) => void }) {
  const allAttrs = Object.values(conditionAttributes).flatMap(cat => cat.map(a => a.label));
  const getValues = (attr: string) => Object.values(conditionAttributes).flatMap(cat => cat).find(a => a.label === attr)?.values || [];

  const addCondition = () => {
    onChange([...conditions, { id: `c-${Date.now()}`, attribute: allAttrs[0], operator: 'equals', value: '', logic: 'AND' }]);
  };
  const removeCondition = (id: string) => onChange(conditions.filter(c => c.id !== id));
  const updateCondition = (id: string, field: keyof GroupCondition, value: string) => {
    onChange(conditions.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const matchCount = useMemo(() => {
    let result = [...mockAssets];
    conditions.forEach(c => {
      if (c.attribute === 'Algorithm' && c.value) result = result.filter(a => a.algorithm === c.value);
      if (c.attribute === 'Environment' && c.value) result = result.filter(a => a.environment === c.value);
      if (c.attribute === 'Object Type' && c.value) result = result.filter(a => a.type === c.value);
      if (c.attribute === 'Has Owner' && c.value === 'No') result = result.filter(a => a.owner === 'Unassigned');
      if (c.attribute === 'Status' && c.value) result = result.filter(a => a.status === c.value);
      if (c.attribute === 'Issuing CA' && c.value) result = result.filter(a => a.caIssuer === c.value);
    });
    return result.length;
  }, [conditions]);

  const summary = conditions.filter(c => c.value).map(c => `${c.attribute} ${c.operator === 'equals' ? '=' : c.operator} "${c.value}"`).join(conditions.some(c => c.logic === 'OR') ? ' OR ' : ' AND ');

  return (
    <div className="space-y-3">
      {conditions.map((c, i) => (
        <div key={c.id}>
          {i > 0 && (
            <button onClick={() => updateCondition(c.id, 'logic', c.logic === 'AND' ? 'OR' : 'AND')}
              className="text-[10px] font-semibold text-teal px-2 py-0.5 rounded bg-teal/10 mb-1">{c.logic || 'AND'}</button>
          )}
          <div className="flex items-center gap-1.5">
            <select value={c.attribute} onChange={e => updateCondition(c.id, 'attribute', e.target.value)}
              className="flex-1 px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground">
              {allAttrs.map(a => <option key={a}>{a}</option>)}
            </select>
            <select value={c.operator} onChange={e => updateCondition(c.id, 'operator', e.target.value)}
              className="w-20 px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground">
              <option value="equals">equals</option><option value="not_equals">≠</option><option value="less_than">&lt;</option><option value="greater_than">&gt;</option>
            </select>
            <select value={c.value} onChange={e => updateCondition(c.id, 'value', e.target.value)}
              className="flex-1 px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground">
              <option value="">Select...</option>
              {getValues(c.attribute).map(v => <option key={v}>{v}</option>)}
            </select>
            <button onClick={() => removeCondition(c.id)} className="p-1 text-muted-foreground hover:text-coral"><X className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
      <button onClick={addCondition} className="text-[10px] text-teal hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add condition</button>
      {conditions.length > 0 && conditions.some(c => c.value) && (
        <div className="bg-secondary/50 rounded p-2">
          <p className="text-[10px] text-muted-foreground italic mb-1">{summary || 'Build conditions above'}</p>
          <p className="text-[10px] font-medium text-teal">{matchCount} identities match</p>
        </div>
      )}
    </div>
  );
}

export default function GroupsTab({ onCreateTicket, onOpenPolicyDrawer }: Props) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<DynamicGroup | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [groups, setGroups] = useState(mockGroups);

  // Create group state
  const [newGroupType, setNewGroupType] = useState<'Dynamic' | 'Manual'>('Dynamic');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupOwner, setNewGroupOwner] = useState('');
  const [newConditions, setNewConditions] = useState<GroupCondition[]>([]);
  const [nlInput, setNlInput] = useState('');
  const [nlTab, setNlTab] = useState<'builder' | 'describe'>('builder');

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, groups]);

  const getIdentities = (group: DynamicGroup): CryptoAsset[] => {
    return group.objectIds.map(id => mockAssets.find(a => a.id === id)).filter(Boolean) as CryptoAsset[];
  };

  const handleCreateGroup = () => {
    if (!newGroupName) return;
    const newGroup: DynamicGroup = {
      id: `grp-${Date.now()}`, name: newGroupName, type: newGroupType, objectCount: 0,
      objectIds: [], conditions: newConditions, conditionSummary: newGroupDesc, riskScore: 45,
      policyCount: 0, policyCoverage: 0, lastEvaluated: 'Just now', ownerTeam: newGroupOwner,
      topAlgorithms: [], topEnvironments: [], topIssuers: [], typeBreakdown: [],
      posture: { ah: 50, ep: 50, pqr: 50, gc: 50, ait: 50 }, trendData: Array(30).fill(45),
      aiNarrative: '', policies: [], remediationTasks: [],
    };
    setGroups([...groups, newGroup]);
    setSelectedGroup(newGroup);
    setShowCreateModal(false);
    setNewGroupName(''); setNewGroupDesc(''); setNewGroupOwner(''); setNewConditions([]);
    toast.success(`Group "${newGroupName}" created`);
  };

  const handleAcceptAISuggestion = (sg: Partial<DynamicGroup>) => {
    const newGroup: DynamicGroup = {
      ...sg as DynamicGroup,
      policyCount: 0, policyCoverage: 0, lastEvaluated: 'Just now',
      topAlgorithms: [], topEnvironments: [], topIssuers: [], typeBreakdown: [],
      posture: { ah: 50, ep: 50, pqr: 50, gc: 50, ait: 50 }, trendData: Array(30).fill(sg.riskScore || 50),
      aiNarrative: sg.aiRationale || '', policies: [], remediationTasks: [], objectIds: [],
    };
    setGroups([...groups, newGroup]);
    setShowAISuggestions(false);
    toast.success(`Group "${sg.name}" created from AI suggestion`);
  };

  const handleNLParse = () => {
    const parsed: GroupCondition[] = [];
    const lower = nlInput.toLowerCase();
    if (lower.includes('production')) parsed.push({ id: 'nl-1', attribute: 'Environment', operator: 'equals', value: 'Production', logic: 'AND' });
    if (lower.includes('tls') || lower.includes('certificate')) parsed.push({ id: 'nl-2', attribute: 'Object Type', operator: 'equals', value: 'TLS Certificate', logic: 'AND' });
    if (lower.includes('weak') || lower.includes('rsa-2048')) parsed.push({ id: 'nl-3', attribute: 'Algorithm', operator: 'equals', value: 'RSA-2048', logic: 'AND' });
    if (lower.includes('ssh')) parsed.push({ id: 'nl-4', attribute: 'Object Type', operator: 'equals', value: 'SSH Key', logic: 'AND' });
    if (lower.includes('no owner') || lower.includes('unassigned')) parsed.push({ id: 'nl-5', attribute: 'Has Owner', operator: 'equals', value: 'No', logic: 'AND' });
    if (parsed.length === 0) parsed.push({ id: 'nl-0', attribute: 'Environment', operator: 'equals', value: 'Production', logic: 'AND' });
    setNewConditions(parsed);
    setNlTab('builder');
    toast.success('AI parsed your description into conditions — review and confirm');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..."
            className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <span className="text-[10px] text-muted-foreground">{filteredGroups.length} groups</span>
        <div className="ml-auto flex items-center gap-2">
          {/* AI Suggestions button with count */}
          <button onClick={() => setShowAISuggestions(!showAISuggestions)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-medium border transition-colors ${showAISuggestions ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            <Sparkles className="w-3 h-3" />
            AI Suggestions
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-teal text-primary-foreground">{aiSuggestedGroups.length}</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-teal text-primary-foreground text-[10px] font-medium hover:opacity-90">
            <Plus className="w-3 h-3" /> Create Group
          </button>
        </div>
      </div>

      {/* Groups table */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* AI Suggestions panel — shown when button is active */}
        {showAISuggestions && (
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-teal flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI-Suggested Groups</p>
              <button onClick={() => setShowAISuggestions(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-teal/20">
                  <th className="text-left py-1.5 px-2 font-medium text-teal">Suggested Group</th>
                  <th className="text-left py-1.5 px-2 font-medium text-teal">Conditions</th>
                  <th className="text-center py-1.5 px-2 font-medium text-teal">Objects</th>
                  <th className="text-left py-1.5 px-2 font-medium text-teal">Rationale</th>
                  <th className="w-24 py-1.5 px-2"></th>
                </tr></thead>
                <tbody>
                  {aiSuggestedGroups.map(sg => (
                    <tr key={sg.id} className="border-b border-teal/10">
                      <td className="py-2 px-2 font-medium text-foreground">{sg.name}</td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1">
                          {sg.conditions?.map(c => <span key={c.id} className="px-1.5 py-0.5 rounded bg-secondary text-[9px] text-muted-foreground">{c.attribute}: {c.value}</span>)}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center text-foreground font-medium">{sg.objectCount}</td>
                      <td className="py-2 px-2 text-[10px] text-muted-foreground max-w-[300px]">{sg.aiRationale}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <button onClick={() => handleAcceptAISuggestion(sg)} className="px-2 py-1 rounded text-[9px] font-medium bg-teal/10 text-teal hover:bg-teal/20">Create</button>
                          <button className="px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-foreground hover:bg-secondary">Dismiss</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Group Name</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Objects</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Risk</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Policies</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Coverage</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Conditions</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Last Evaluated</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(g => {
                  const riskColor = g.riskScore > 70 ? 'bg-coral/10 text-coral' : g.riskScore > 40 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal';
                  return (
                    <tr key={g.id} onClick={() => setSelectedGroup(g)}
                      className={`border-b border-border cursor-pointer transition-colors ${selectedGroup?.id === g.id ? 'bg-teal/5' : 'hover:bg-secondary/30'}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{g.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${g.type === 'Dynamic' ? 'bg-purple/10 text-purple' : 'bg-secondary text-muted-foreground'}`}>{g.type}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-foreground font-medium">{g.objectCount}</td>
                      <td className="py-2.5 px-2 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${riskColor}`}>{g.riskScore}</span></td>
                      <td className="py-2.5 px-2 text-center text-muted-foreground">{g.policyCount}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${g.policyCoverage}%` }} /></div>
                          <span className="text-[10px] text-muted-foreground">{g.policyCoverage}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[10px] text-muted-foreground italic truncate max-w-[200px]">{g.conditionSummary || '—'}</td>
                      <td className="py-2.5 px-2 text-[10px] text-muted-foreground">{g.lastEvaluated}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredGroups.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No groups match your search.</div>}
        </div>
      </div>

      {/* Group Detail — 80% slide panel (same as Infrastructure) */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-[20%] bg-foreground/10 backdrop-blur-sm" onClick={() => setSelectedGroup(null)} />
          <div className="w-[80%] bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-3 z-10">
              <h3 className="text-sm font-semibold text-foreground">{selectedGroup.name}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${selectedGroup.type === 'Dynamic' ? 'bg-purple/10 text-purple' : 'bg-secondary text-muted-foreground'}`}>{selectedGroup.type}</span>
              <span className="text-[10px] text-muted-foreground">{selectedGroup.objectCount} objects</span>
              <span className="text-[10px] text-muted-foreground">· Last evaluated: {selectedGroup.lastEvaluated}</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => toast.success('Re-evaluating...')} className="px-2 py-1 rounded text-[10px] font-medium border border-border text-foreground hover:bg-secondary">
                  <RefreshCw className="w-3 h-3 inline mr-1" />Evaluate Now
                </button>
                <button onClick={() => onOpenPolicyDrawer(selectedGroup.id, selectedGroup.name)} className="px-2 py-1 rounded text-[10px] font-medium bg-teal text-primary-foreground hover:opacity-90">Attach Policy</button>
                <button onClick={() => setSelectedGroup(null)} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Condition summary */}
              {selectedGroup.conditionSummary && (
                <div className="bg-secondary/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground italic">{selectedGroup.conditionSummary}</p>
                </div>
              )}

              {/* Quick stats row */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Risk Score', value: selectedGroup.riskScore, color: selectedGroup.riskScore > 70 ? 'text-coral' : selectedGroup.riskScore > 40 ? 'text-amber' : 'text-teal' },
                  { label: 'Identities', value: selectedGroup.objectCount, color: 'text-foreground' },
                  { label: 'Policies', value: selectedGroup.policyCount, color: 'text-foreground' },
                  { label: 'Coverage', value: `${selectedGroup.policyCoverage}%`, color: selectedGroup.policyCoverage > 80 ? 'text-teal' : 'text-amber' },
                  { label: 'Open Tasks', value: selectedGroup.remediationTasks.length, color: selectedGroup.remediationTasks.length > 0 ? 'text-coral' : 'text-teal' },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Identities table */}
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Identities ({getIdentities(selectedGroup).length})</p>
                  <div className="flex gap-1">
                    {['Export', 'Assign Owner'].map(a => (
                      <button key={a} onClick={() => toast.success(`${a} initiated`)} className="px-2 py-1 rounded text-[9px] border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">{a}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50">
                      <tr className="border-b border-border">
                        <th className="w-6 py-1.5 px-1"></th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Common Name</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Algorithm</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Expiry</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Days</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Policy</th>
                        <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Viol.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getIdentities(selectedGroup).map(co => (
                        <React.Fragment key={co.id}>
                          <tr className="border-b border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setExpandedRow(expandedRow === co.id ? null : co.id)}>
                            <td className="py-1.5 px-1 text-muted-foreground">{expandedRow === co.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</td>
                            <td className="py-1.5 px-2 font-medium text-foreground truncate max-w-[200px]">{co.name}</td>
                            <td className="py-1.5 px-2 text-muted-foreground text-[10px]">{co.type}</td>
                            <td className="py-1.5 px-2 text-muted-foreground">{co.algorithm}</td>
                            <td className="py-1.5 px-2 text-muted-foreground text-[10px]">{co.expiryDate}</td>
                            <td className="py-1.5 px-2"><DaysToExpiry days={co.daysToExpiry} /></td>
                            <td className="py-1.5 px-2"><StatusBadge status={co.status} /></td>
                            <td className="py-1.5 px-2 text-center">{co.policyViolations === 0 ? <Shield className="w-3.5 h-3.5 text-teal inline" /> : <ShieldOff className="w-3.5 h-3.5 text-coral inline" />}</td>
                            <td className="py-1.5 px-2 text-center">{co.policyViolations > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-coral/10 text-coral text-[9px] font-bold">{co.policyViolations}</span>}</td>
                          </tr>
                          {expandedRow === co.id && (
                            <tr><td colSpan={9} className="p-0">
                              <div className="bg-secondary/30 px-4 py-2 grid grid-cols-3 gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold mb-1">Policies</p>
                                  {co.policyViolations > 0 ? <div className="flex items-center gap-1 text-[10px]"><span className="px-1 py-0.5 rounded bg-amber/10 text-amber text-[9px]">Warn</span><span>Weak Algorithm</span></div>
                                    : <p className="text-[10px] text-teal">✓ Compliant</p>}
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold mb-1">Violations</p>
                                  {co.policyViolations > 0 ? <p className="text-[10px] text-coral">{co.policyViolations} active violations</p> : <p className="text-[10px] text-muted-foreground">None</p>}
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold mb-1">Actions</p>
                                  <div className="flex flex-wrap gap-1">
                                    {['Renew', 'Create Ticket'].map(a => (
                                      <button key={a} onClick={() => {
                                        if (a === 'Create Ticket') onCreateTicket({ objectName: co.name, objectType: co.type, algorithm: co.algorithm, status: co.status, daysToExpiry: co.daysToExpiry, environment: co.environment });
                                        else toast.success(`${a} initiated`);
                                      }} className="px-1.5 py-0.5 rounded text-[9px] border border-border text-muted-foreground hover:text-foreground">{a}</button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                {getIdentities(selectedGroup).length === 0 && <div className="py-8 text-center text-[10px] text-muted-foreground">No identities in this group yet.</div>}
              </div>

              {/* Policies + Remediation side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Policies */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold">Policies ({selectedGroup.policies.length})</p>
                    <button onClick={() => onOpenPolicyDrawer(selectedGroup.id, selectedGroup.name)} className="text-[10px] text-teal hover:underline">+ Attach</button>
                  </div>
                  {selectedGroup.policies.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50"><tr className="border-b border-border">
                        <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Policy</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Mode</th>
                        <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Covered</th>
                        <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Violations</th>
                      </tr></thead>
                      <tbody>
                        {selectedGroup.policies.map(p => (
                          <tr key={p.id} className="border-b border-border">
                            <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                            <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${p.enforcementMode === 'Enforce' ? 'bg-coral/10 text-coral' : 'bg-amber/10 text-amber'}`}>{p.enforcementMode}</span></td>
                            <td className="py-2 px-2 text-center text-muted-foreground">{p.objectsCovered}</td>
                            <td className="py-2 px-2 text-center">{p.violations > 0 ? <span className="text-coral font-medium">{p.violations}</span> : <span className="text-teal">0</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-[10px] text-muted-foreground mb-2">No policies attached.</p>
                      <button onClick={() => onOpenPolicyDrawer(selectedGroup.id, selectedGroup.name)} className="px-3 py-1.5 rounded text-[10px] font-medium bg-teal text-primary-foreground hover:opacity-90">Attach Policy</button>
                    </div>
                  )}
                </div>

                {/* Remediation */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                    <p className="text-xs font-semibold">Remediation ({selectedGroup.remediationTasks.length})</p>
                    {selectedGroup.remediationTasks.some(t => t.severity === 'Critical') && (
                      <button onClick={() => toast.success('Auto-remediable tasks queued')} className="text-[10px] text-coral hover:underline">Execute Auto-Remediable</button>
                    )}
                  </div>
                  {selectedGroup.remediationTasks.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50"><tr className="border-b border-border">
                        <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Object</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Task</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Severity</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Assignee</th>
                      </tr></thead>
                      <tbody>
                        {selectedGroup.remediationTasks.map(t => (
                          <tr key={t.id} className="border-b border-border">
                            <td className="py-2 px-3 font-medium text-foreground truncate max-w-[150px]">{t.objectName}</td>
                            <td className="py-2 px-2 text-muted-foreground">{t.taskType}</td>
                            <td className="py-2 px-2"><span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${t.severity === 'Critical' ? 'bg-coral' : t.severity === 'High' ? 'bg-amber' : 'bg-purple'}`} /><span className="text-[10px]">{t.severity}</span></td>
                            <td className="py-2 px-2"><StatusBadge status={t.status} /></td>
                            <td className="py-2 px-2 text-muted-foreground">{t.assignee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center text-[10px] text-muted-foreground">No open remediation tasks. 🎉</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal — single vertical scroll page */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Group" wide>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Type selection */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Group Type</p>
            <div className="flex gap-2">
              {(['Dynamic', 'Manual'] as const).map(t => (
                <button key={t} onClick={() => setNewGroupType(t)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${newGroupType === t ? 'border-teal bg-teal/5' : 'border-border hover:border-muted-foreground'}`}>
                  <p className="text-xs font-semibold text-foreground">{t}</p>
                  <p className="text-[9px] text-muted-foreground">{t === 'Dynamic' ? 'Auto-maintained by conditions' : 'Hand-curated selection'}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Name + Description + Owner */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Group Name *</p>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. RSA-2048 Production Certs"
              className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Description</p>
            <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} rows={2} placeholder="Optional description..."
              className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Owner Team</p>
            <select value={newGroupOwner} onChange={e => setNewGroupOwner(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="">Select team (optional)</option>
              {['Payments Engineering', 'Platform Engineering', 'Infrastructure', 'DevOps', 'Security Operations', 'AI Engineering', 'IT Operations'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Conditions (Dynamic) or note (Manual) */}
          {newGroupType === 'Dynamic' ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Conditions</p>
                <div className="flex gap-1 ml-auto">
                  <button onClick={() => setNlTab('builder')} className={`px-2 py-0.5 text-[9px] rounded ${nlTab === 'builder' ? 'bg-teal/10 text-teal font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Builder</button>
                  <button onClick={() => setNlTab('describe')} className={`px-2 py-0.5 text-[9px] rounded ${nlTab === 'describe' ? 'bg-teal/10 text-teal font-medium' : 'text-muted-foreground hover:text-foreground'}`}>✦ Describe It</button>
                </div>
              </div>
              {nlTab === 'builder' ? (
                <ConditionBuilder conditions={newConditions} onChange={setNewConditions} />
              ) : (
                <div className="space-y-2">
                  <textarea value={nlInput} onChange={e => setNlInput(e.target.value)} rows={2} placeholder="e.g. All production TLS certs using weak algorithms"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none" />
                  <button onClick={handleNLParse} disabled={!nlInput} className="px-3 py-1.5 text-[10px] rounded bg-teal text-primary-foreground hover:opacity-90 disabled:opacity-50">Parse with AI</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-secondary/50 rounded p-3">
              <p className="text-[10px] text-muted-foreground">After creating, you can add identities from the Inventory table using "Add to Group" action.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs border border-border rounded hover:bg-secondary">Cancel</button>
            <button onClick={handleCreateGroup} disabled={!newGroupName} className="px-4 py-2 text-xs rounded bg-teal text-primary-foreground hover:opacity-90 disabled:opacity-50">Create Group</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
