import React, { useState, useMemo } from 'react';
import { mockGroups, aiSuggestedGroups, DynamicGroup, GroupCondition, conditionAttributes, mockITAssets } from '@/data/inventoryMockData';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, EnvBadge, DaysToExpiry, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { Search, Plus, Sparkles, Shield, ShieldOff, ChevronDown, ChevronRight, MoreVertical, X, RotateCcw, Ticket, PlayCircle, Pause, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onCreateTicket: (ctx: any) => void;
  onOpenPolicyDrawer: (groupId: string, groupName: string) => void;
}

function RiskGauge({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;
  const color = score > 70 ? 'hsl(15, 72%, 52%)' : score > 40 ? 'hsl(38, 78%, 41%)' : 'hsl(160, 70%, 37%)';
  return (
    <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(225, 20%, 18%)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={circ - progress} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size*0.26} fontWeight="bold">{score}</text>
    </svg>
  );
}

function PostureBar({ label, score }: { label: string; score: number }) {
  const color = score > 70 ? 'bg-teal' : score > 40 ? 'bg-amber' : 'bg-coral';
  return (
    <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} /></div>
      <span className="text-[10px] font-medium text-foreground w-6 text-right">{score}</span>
    </div>
  );
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

  // Preview count
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
              <option value="equals">equals</option>
              <option value="not_equals">not equals</option>
              <option value="contains">contains</option>
              <option value="less_than">less than</option>
              <option value="greater_than">greater than</option>
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
  const [aiExpanded, setAiExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [groups, setGroups] = useState(mockGroups);

  // Create group state
  const [newGroupType, setNewGroupType] = useState<'Dynamic' | 'Manual'>('Dynamic');
  const [newGroupName, setNewGroupName] = useState('');
  const [newConditions, setNewConditions] = useState<GroupCondition[]>([]);
  const [createStep, setCreateStep] = useState(1);
  const [nlInput, setNlInput] = useState('');
  const [nlTab, setNlTab] = useState<'builder' | 'describe'>('builder');

  const filteredGroups = useMemo(() => {
    if (!search) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, groups]);

  const getCryptoObjects = (group: DynamicGroup): CryptoAsset[] => {
    return group.objectIds.map(id => mockAssets.find(a => a.id === id)).filter(Boolean) as CryptoAsset[];
  };

  const handleCreateGroup = () => {
    const newGroup: DynamicGroup = {
      id: `grp-${Date.now()}`, name: newGroupName, type: newGroupType, objectCount: 0,
      objectIds: [], conditions: newConditions, conditionSummary: '', riskScore: 45,
      policyCount: 0, policyCoverage: 0, lastEvaluated: 'Just now',
      topAlgorithms: [], topEnvironments: [], topIssuers: [], typeBreakdown: [],
      posture: { ah: 50, ep: 50, pqr: 50, gc: 50, ait: 50 }, trendData: Array(30).fill(45),
      aiNarrative: 'New group — evaluating composition and risk factors.',
      policies: [], remediationTasks: [],
    };
    setGroups([...groups, newGroup]);
    setSelectedGroup(newGroup);
    setShowCreateModal(false);
    setCreateStep(1); setNewGroupName(''); setNewConditions([]);
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
    <div className="flex gap-0 h-full">
      {/* Groups list — 320px */}
      <div className="w-[320px] flex-shrink-0 border-r border-border overflow-y-auto scrollbar-thin">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">Groups</p>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-teal text-primary-foreground text-[10px] font-medium hover:opacity-90">
              <Plus className="w-3 h-3" /> Create Group
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups..."
              className="w-full pl-7 pr-3 py-1 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
        </div>

        {/* AI Suggested */}
        <div className="px-3 py-2">
          <button onClick={() => setAiExpanded(!aiExpanded)} className="flex items-center gap-1.5 text-[10px] font-semibold text-teal w-full">
            <Sparkles className="w-3 h-3" /> AI Suggested
            {aiExpanded ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
          {aiExpanded && (
            <div className="space-y-1.5 mt-2">
              {aiSuggestedGroups.map(sg => (
                <div key={sg.id} className="bg-teal/5 border border-teal/20 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-teal flex-shrink-0" />
                    <span className="text-[10px] font-medium text-foreground truncate">{sg.name}</span>
                  </div>
                  {sg.conditions && (
                    <div className="flex flex-wrap gap-1">
                      {sg.conditions.map(c => (
                        <span key={c.id} className="px-1.5 py-0.5 rounded bg-secondary text-[9px] text-muted-foreground">{c.attribute}: {c.value}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground">{sg.objectCount} objects · {sg.aiRationale}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAcceptAISuggestion(sg)} className="px-2 py-0.5 rounded text-[9px] font-medium bg-teal/10 text-teal hover:bg-teal/20">Create</button>
                    <button className="px-2 py-0.5 rounded text-[9px] text-muted-foreground hover:text-foreground">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Groups */}
        <div className="px-3 py-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">My Groups</p>
          <div className="space-y-1">
            {filteredGroups.map(g => {
              const coverageDot = g.policyCoverage > 80 ? 'bg-teal' : g.policyCoverage > 30 ? 'bg-amber' : 'bg-muted-foreground';
              return (
                <button key={g.id} onClick={() => setSelectedGroup(g)}
                  className={`w-full text-left rounded-lg p-2.5 transition-colors ${selectedGroup?.id === g.id ? 'bg-teal/10 border border-teal/30' : 'hover:bg-secondary/50 border border-transparent'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium text-foreground truncate">{g.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${g.type === 'Dynamic' ? 'bg-purple/10 text-purple' : 'bg-secondary text-muted-foreground'}`}>{g.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>{g.objectCount} objects</span>
                    <span>·</span>
                    <span>{g.topAlgorithms[0]?.name || '—'}</span>
                    <span>·</span>
                    <span>{g.topEnvironments[0]?.name || '—'}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${coverageDot} ml-auto`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Group detail canvas */}
      <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
        {selectedGroup ? (
          <div className="p-4 space-y-4">
            {/* Header band */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-foreground">{selectedGroup.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${selectedGroup.type === 'Dynamic' ? 'bg-purple/10 text-purple' : 'bg-secondary text-muted-foreground'}`}>{selectedGroup.type}</span>
                  <span className="text-[10px] text-muted-foreground">{selectedGroup.objectCount} objects</span>
                </div>
                {selectedGroup.conditionSummary && <p className="text-[10px] text-muted-foreground italic">{selectedGroup.conditionSummary}</p>}
                <p className="text-[10px] text-muted-foreground">Last evaluated: {selectedGroup.lastEvaluated}</p>
              </div>
              <button onClick={() => toast.success('Re-evaluating group conditions...')} className="px-2.5 py-1.5 rounded text-[10px] font-medium border border-border text-foreground hover:bg-secondary">
                <RefreshCw className="w-3 h-3 inline mr-1" />Evaluate Now
              </button>
            </div>

            {/* Top section — composition + posture */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left: composition */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold">Group Composition</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Top Algorithms</p>
                    {selectedGroup.topAlgorithms.slice(0, 3).map(a => (
                      <div key={a.name} className="flex justify-between text-[10px] py-0.5"><span className="text-foreground">{a.name}</span><span className="text-muted-foreground">{a.count}</span></div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Environments</p>
                    {selectedGroup.topEnvironments.slice(0, 3).map(e => (
                      <div key={e.name} className="flex justify-between text-[10px] py-0.5"><span className="text-foreground">{e.name}</span><span className="text-muted-foreground">{e.count}</span></div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Issuers</p>
                    {selectedGroup.topIssuers.slice(0, 3).map(i => (
                      <div key={i.name} className="flex justify-between text-[10px] py-0.5"><span className="text-foreground truncate">{i.name}</span><span className="text-muted-foreground">{i.count}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: posture */}
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <RiskGauge score={selectedGroup.riskScore} />
                  <div className="flex-1 space-y-1.5">
                    <PostureBar label="AH" score={selectedGroup.posture.ah} />
                    <PostureBar label="EP" score={selectedGroup.posture.ep} />
                    <PostureBar label="PQR" score={selectedGroup.posture.pqr} />
                    <PostureBar label="GC" score={selectedGroup.posture.gc} />
                    <PostureBar label="AIT" score={selectedGroup.posture.ait} />
                  </div>
                </div>
                {/* AI narrative */}
                <div className="bg-teal/5 border border-teal/20 rounded p-2">
                  <p className="text-[9px] font-semibold text-teal mb-0.5">✦ Infinity AI</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{selectedGroup.aiNarrative}</p>
                </div>
              </div>
            </div>

            {/* Objects table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold">Objects ({selectedGroup.objectIds.length})</p>
                <div className="flex gap-1">
                  {['Export', 'Assign Owner', 'Attach Policy'].map(a => (
                    <button key={a} onClick={() => {
                      if (a === 'Attach Policy') onOpenPolicyDrawer(selectedGroup.id, selectedGroup.name);
                      else toast.success(`${a} initiated`);
                    }} className="px-2 py-1 rounded text-[9px] border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">{a}</button>
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
                    {getCryptoObjects(selectedGroup).map(co => (
                      <React.Fragment key={co.id}>
                        <tr className="border-b border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setExpandedRow(expandedRow === co.id ? null : co.id)}>
                          <td className="py-1.5 px-1 text-muted-foreground">{expandedRow === co.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</td>
                          <td className="py-1.5 px-2 font-medium text-foreground truncate max-w-[160px]">{co.name}</td>
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
            </div>

            {/* Bottom: Policies + Remediation side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Policies */}
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Policies ({selectedGroup.policies.length})</p>
                  <button onClick={() => onOpenPolicyDrawer(selectedGroup.id, selectedGroup.name)} className="text-[10px] text-teal hover:underline">+ Attach Policy</button>
                </div>
                {/* Coverage bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${selectedGroup.policyCoverage}%` }} /></div>
                  <span className="text-[10px] text-muted-foreground">{selectedGroup.policyCoverage}%</span>
                </div>
                {selectedGroup.policies.length > 0 ? selectedGroup.policies.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-[10px] py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-foreground font-medium flex-1">{p.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${p.enforcementMode === 'Enforce' ? 'bg-coral/10 text-coral' : p.enforcementMode === 'Warn' ? 'bg-amber/10 text-amber' : 'bg-secondary text-muted-foreground'}`}>{p.enforcementMode}</span>
                    <span className="text-muted-foreground">{p.objectsCovered} obj</span>
                  </div>
                )) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] text-muted-foreground mb-2">No policies on this group.</p>
                    <button onClick={() => onOpenPolicyDrawer(selectedGroup.id, selectedGroup.name)} className="px-3 py-1.5 rounded text-[10px] font-medium bg-teal text-primary-foreground hover:opacity-90">Attach Policy</button>
                  </div>
                )}
              </div>

              {/* Remediation */}
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Remediation ({selectedGroup.remediationTasks.length})</p>
                  {selectedGroup.remediationTasks.some(t => t.severity === 'Critical') && (
                    <button onClick={() => toast.success('Auto-remediable tasks queued')} className="text-[10px] text-coral hover:underline">Execute Auto-Remediable</button>
                  )}
                </div>
                {selectedGroup.remediationTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-[10px] py-1.5 border-b border-border/50 last:border-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.severity === 'Critical' ? 'bg-coral' : t.severity === 'High' ? 'bg-amber' : 'bg-purple'}`} />
                    <span className="text-foreground truncate flex-1">{t.objectName}</span>
                    <span className="text-muted-foreground">{t.taskType}</span>
                    <StatusBadge status={t.status} />
                    <span className="text-muted-foreground">{t.assignee}</span>
                  </div>
                ))}
                {selectedGroup.remediationTasks.length === 0 && (
                  <p className="py-4 text-center text-[10px] text-muted-foreground">No open remediation tasks. 🎉</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a group or create a new one to get started
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <Modal open={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateStep(1); }} title="Create Group" wide>
        <div className="space-y-4">
          {createStep === 1 && (
            <>
              <p className="text-xs text-muted-foreground">Choose group type</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setNewGroupType('Dynamic'); setCreateStep(2); }}
                  className={`p-4 rounded-lg border text-left transition-colors ${newGroupType === 'Dynamic' ? 'border-teal bg-teal/5' : 'border-border hover:border-muted-foreground'}`}>
                  <p className="text-xs font-semibold text-foreground mb-1">Dynamic Group</p>
                  <p className="text-[10px] text-muted-foreground">Auto-maintained by conditions. Objects added/removed as attributes change.</p>
                </button>
                <button onClick={() => { setNewGroupType('Manual'); setCreateStep(2); }}
                  className={`p-4 rounded-lg border text-left transition-colors ${newGroupType === 'Manual' ? 'border-teal bg-teal/5' : 'border-border hover:border-muted-foreground'}`}>
                  <p className="text-xs font-semibold text-foreground mb-1">Manual Group</p>
                  <p className="text-[10px] text-muted-foreground">Hand-curated. Add/remove objects explicitly.</p>
                </button>
              </div>
            </>
          )}

          {createStep === 2 && (
            <>
              <p className="text-xs text-muted-foreground">Name your group</p>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name..."
                className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" autoFocus />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreateStep(1)} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary">Back</button>
                <button onClick={() => setCreateStep(3)} disabled={!newGroupName} className="px-3 py-1.5 text-xs rounded bg-teal text-primary-foreground hover:opacity-90 disabled:opacity-50">Next</button>
              </div>
            </>
          )}

          {createStep === 3 && newGroupType === 'Dynamic' && (
            <>
              <div className="flex gap-2 border-b border-border">
                <button onClick={() => setNlTab('builder')} className={`px-3 py-1.5 text-[10px] font-medium border-b-2 ${nlTab === 'builder' ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>Condition Builder</button>
                <button onClick={() => setNlTab('describe')} className={`px-3 py-1.5 text-[10px] font-medium border-b-2 ${nlTab === 'describe' ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>✦ Describe It</button>
              </div>
              {nlTab === 'builder' ? (
                <ConditionBuilder conditions={newConditions} onChange={setNewConditions} />
              ) : (
                <div className="space-y-2">
                  <textarea value={nlInput} onChange={e => setNlInput(e.target.value)} rows={3} placeholder="e.g. All production TLS certs using weak algorithms that expire in the next 60 days"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none" />
                  <button onClick={handleNLParse} disabled={!nlInput} className="px-3 py-1.5 text-[10px] rounded bg-teal text-primary-foreground hover:opacity-90 disabled:opacity-50">Parse with AI</button>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreateStep(2)} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary">Back</button>
                <button onClick={handleCreateGroup} className="px-3 py-1.5 text-xs rounded bg-teal text-primary-foreground hover:opacity-90">Create Group</button>
              </div>
            </>
          )}

          {createStep === 3 && newGroupType === 'Manual' && (
            <>
              <p className="text-xs text-muted-foreground">Select objects to add (manual selection — simplified for prototype)</p>
              <p className="text-[10px] text-muted-foreground">In production, a full object picker with search and multi-select would appear here.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCreateStep(2)} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary">Back</button>
                <button onClick={handleCreateGroup} className="px-3 py-1.5 text-xs rounded bg-teal text-primary-foreground hover:opacity-90">Create Group</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
