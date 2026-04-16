import React, { useState, useMemo } from 'react';
import { CryptoAsset, mockAssets } from '@/data/mockData';
import { Sparkles, Plus, ChevronRight, Shield, AlertTriangle, Trash2, X, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GroupCondition {
  id: string;
  dimension: string;
  operator: string;
  value: string;
}

export interface ConditionSet {
  logic: 'AND' | 'OR';
  conditions: GroupCondition[];
}

export interface CryptoGroup {
  id: string;
  name: string;
  description: string;
  type: 'Dynamic' | 'Manual';
  conditions?: ConditionSet;
  manualAssetIds?: string[];
  ownerTeam?: string;
  policyIds: string[];
  riskScore: number;
  aiSuggested?: boolean;
  lastEvaluated: string;
  createdAt: string;
}

// ─── Condition evaluator ─────────────────────────────────────────────────────

export function evaluateConditions(conditions: ConditionSet, assets: CryptoAsset[]): CryptoAsset[] {
  return assets.filter(asset => {
    const results = conditions.conditions.map(c => evaluateSingle(c, asset));
    return conditions.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  });
}

function evaluateSingle(c: GroupCondition, a: CryptoAsset): boolean {
  switch (c.dimension) {
    case 'Algorithm family':
      return a.algorithm.toLowerCase().includes(c.value.toLowerCase());
    case 'Key size':
      if (c.operator === '<') return parseInt(a.keyLength) < parseInt(c.value);
      if (c.operator === '=') return a.keyLength === c.value;
      if (c.operator === '>') return parseInt(a.keyLength) > parseInt(c.value);
      return false;
    case 'Algorithm risk level':
      return a.pqcRisk === c.value;
    case 'Certificate type':
      return a.type === c.value;
    case 'Days to expiry':
      if (c.operator === '<') return a.daysToExpiry >= 0 && a.daysToExpiry < parseInt(c.value);
      if (c.operator === '=') return a.daysToExpiry === parseInt(c.value);
      if (c.operator === 'expired') return a.status === 'Expired';
      return false;
    case 'Last rotation':
      if (c.value === 'Never') return a.rotationFrequency === 'Never' || a.lastRotated === a.issueDate;
      return false;
    case 'Renewal method':
      if (c.value === 'manual') return !a.autoRenewal;
      if (c.value === 'auto') return a.autoRenewal;
      return false;
    case 'Owner team':
      return a.team.toLowerCase().includes(c.value.toLowerCase());
    case 'Has owner':
      return c.value === 'yes' ? a.owner !== 'Unassigned' : a.owner === 'Unassigned';
    case 'Environment':
      return a.environment === c.value;
    case 'PQC risk score':
      const riskMap: Record<string, number> = { Critical: 90, High: 70, Medium: 50, Low: 25, Safe: 5 };
      if (c.operator === '>') return (riskMap[a.pqcRisk] || 0) > parseInt(c.value);
      return false;
    case 'Active policy violations':
      return c.value === 'yes' ? a.policyViolations > 0 : a.policyViolations === 0;
    case 'Shadow certificate':
      return c.value === 'yes' ? a.discoverySource === 'CT Log Monitor' || a.discoverySource === 'Network Scan' : !(a.discoverySource === 'CT Log Monitor');
    case 'Discovery vector':
      return a.discoverySource.toLowerCase().includes(c.value.toLowerCase());
    case 'Hosting environment':
      return a.infrastructure.toLowerCase().includes(c.value.toLowerCase());
    case 'Issuing CA':
      return a.caIssuer.toLowerCase().includes(c.value.toLowerCase());
    case 'Status':
      return a.status === c.value;
    default:
      return false;
  }
}

// ─── Dimension configs ───────────────────────────────────────────────────────

export const dimensionOptions: { category: string; dimensions: { name: string; operators: string[]; valueType: 'select' | 'number' | 'text'; values?: string[] }[] }[] = [
  {
    category: 'Algorithm & Cryptography',
    dimensions: [
      { name: 'Algorithm family', operators: ['='], valueType: 'select', values: ['RSA', 'ECDSA', 'EdDSA', 'ML-KEM', 'ML-DSA', 'SLH-DSA', 'AES', 'ChaCha20', 'HMAC'] },
      { name: 'Key size', operators: ['<', '=', '>'], valueType: 'number' },
      { name: 'Algorithm risk level', operators: ['='], valueType: 'select', values: ['Critical', 'High', 'Medium', 'Low', 'Safe'] },
      { name: 'Certificate type', operators: ['='], valueType: 'select', values: ['TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token', 'API Key / Secret'] },
    ],
  },
  {
    category: 'Lifecycle & Expiry',
    dimensions: [
      { name: 'Days to expiry', operators: ['<', '=', 'expired'], valueType: 'number' },
      { name: 'Last rotation', operators: ['='], valueType: 'select', values: ['Never'] },
      { name: 'Renewal method', operators: ['='], valueType: 'select', values: ['manual', 'auto', 'unknown'] },
    ],
  },
  {
    category: 'Ownership & Governance',
    dimensions: [
      { name: 'Owner team', operators: ['='], valueType: 'text' },
      { name: 'Has owner', operators: ['='], valueType: 'select', values: ['yes', 'no'] },
      { name: 'Environment', operators: ['='], valueType: 'select', values: ['Production', 'Staging', 'Development'] },
    ],
  },
  {
    category: 'Risk & Compliance',
    dimensions: [
      { name: 'PQC risk score', operators: ['>'], valueType: 'number' },
      { name: 'Active policy violations', operators: ['='], valueType: 'select', values: ['yes', 'no'] },
      { name: 'Shadow certificate', operators: ['='], valueType: 'select', values: ['yes', 'no'] },
    ],
  },
  {
    category: 'Discovery & Infrastructure',
    dimensions: [
      { name: 'Discovery vector', operators: ['='], valueType: 'text' },
      { name: 'Hosting environment', operators: ['='], valueType: 'text' },
      { name: 'Issuing CA', operators: ['='], valueType: 'text' },
      { name: 'Status', operators: ['='], valueType: 'select', values: ['Active', 'Expiring', 'Expired', 'Revoked', 'Pending', 'Orphaned'] },
    ],
  },
];

function findDimension(name: string) {
  for (const cat of dimensionOptions) {
    const d = cat.dimensions.find(x => x.name === name);
    if (d) return d;
  }
  return null;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const seedGroups: CryptoGroup[] = [
  {
    id: 'grp-001', name: 'Weak RSA in Production', description: 'All RSA certs with key size < 2048 or RSA-2048 in production',
    type: 'Dynamic', conditions: { logic: 'AND', conditions: [
      { id: 'c1', dimension: 'Algorithm family', operator: '=', value: 'RSA' },
      { id: 'c2', dimension: 'Environment', operator: '=', value: 'Production' },
    ]},
    policyIds: [], riskScore: 82, lastEvaluated: '2 min ago', createdAt: '2026-04-10',
  },
  {
    id: 'grp-002', name: 'Expiring in 30 Days', description: 'All identities expiring within 30 days',
    type: 'Dynamic', conditions: { logic: 'AND', conditions: [
      { id: 'c3', dimension: 'Days to expiry', operator: '<', value: '30' },
    ]},
    policyIds: ['pol-001'], riskScore: 71, lastEvaluated: '5 min ago', createdAt: '2026-04-08',
  },
  {
    id: 'grp-003', name: 'Orphaned SSH Keys', description: 'SSH keys with no owner assigned',
    type: 'Dynamic', conditions: { logic: 'AND', conditions: [
      { id: 'c4', dimension: 'Certificate type', operator: '=', value: 'SSH Key' },
      { id: 'c5', dimension: 'Has owner', operator: '=', value: 'no' },
    ]},
    policyIds: [], riskScore: 88, lastEvaluated: '1 min ago', createdAt: '2026-04-12',
  },
  {
    id: 'grp-004', name: 'PCI-DSS Payment Certs', description: 'Manually curated payment team certificates for PCI audit',
    type: 'Manual', manualAssetIds: ['cert-001', 'cert-003', 'secret-001', 'enc-001'],
    policyIds: ['pol-002'], riskScore: 45, lastEvaluated: 'N/A', createdAt: '2026-04-05',
  },
];

const aiSuggestedGroups: { name: string; conditions: ConditionSet; reason: string }[] = [
  {
    name: 'RSA-2048 Expiring in 90 Days — Production',
    conditions: { logic: 'AND', conditions: [
      { id: 'ai-c1', dimension: 'Algorithm family', operator: '=', value: 'RSA' },
      { id: 'ai-c2', dimension: 'Days to expiry', operator: '<', value: '90' },
      { id: 'ai-c3', dimension: 'Environment', operator: '=', value: 'Production' },
    ]},
    reason: '47 certs in this segment have no policy and 12 expire within 30 days. This is your highest-risk uncovered segment.',
  },
  {
    name: 'AI Agent Tokens — Over-Privileged',
    conditions: { logic: 'AND', conditions: [
      { id: 'ai-c4', dimension: 'Certificate type', operator: '=', value: 'AI Agent Token' },
      { id: 'ai-c5', dimension: 'Active policy violations', operator: '=', value: 'yes' },
    ]},
    reason: '4 AI agent tokens have over-privileged permissions with no governance policy. 2 are expired.',
  },
];

// ─── Condition Builder Component ─────────────────────────────────────────────

export function ConditionBuilder({
  conditionSet, onChange, showPreview = true,
}: {
  conditionSet: ConditionSet;
  onChange: (cs: ConditionSet) => void;
  showPreview?: boolean;
}) {
  const matchCount = useMemo(() => evaluateConditions(conditionSet, mockAssets).length, [conditionSet]);
  const matchedAssets = useMemo(() => evaluateConditions(conditionSet, mockAssets).slice(0, 5), [conditionSet]);

  const addCondition = () => {
    onChange({
      ...conditionSet,
      conditions: [...conditionSet.conditions, { id: `c-${Date.now()}`, dimension: 'Algorithm family', operator: '=', value: 'RSA' }],
    });
  };

  const removeCondition = (id: string) => {
    onChange({ ...conditionSet, conditions: conditionSet.conditions.filter(c => c.id !== id) });
  };

  const updateCondition = (id: string, field: keyof GroupCondition, value: string) => {
    onChange({
      ...conditionSet,
      conditions: conditionSet.conditions.map(c => {
        if (c.id !== id) return c;
        if (field === 'dimension') {
          const dim = findDimension(value);
          return { ...c, dimension: value, operator: dim?.operators[0] || '=', value: dim?.values?.[0] || '' };
        }
        return { ...c, [field]: value };
      }),
    });
  };

  const summary = conditionSet.conditions.length > 0
    ? conditionSet.conditions.map(c => `${c.dimension} ${c.operator} ${c.value}`).join(conditionSet.logic === 'AND' ? ' AND ' : ' OR ')
    : 'No conditions defined';

  return (
    <div className="space-y-3">
      {/* Logic toggle */}
      {conditionSet.conditions.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Match:</span>
          {(['AND', 'OR'] as const).map(l => (
            <button key={l} onClick={() => onChange({ ...conditionSet, logic: l })}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${conditionSet.logic === l ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-muted text-muted-foreground border border-border'}`}>
              {l === 'AND' ? 'All conditions (AND)' : 'Any condition (OR)'}
            </button>
          ))}
        </div>
      )}

      {/* Conditions */}
      {conditionSet.conditions.map(cond => {
        const dim = findDimension(cond.dimension);
        return (
          <div key={cond.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
            <select value={cond.dimension} onChange={e => updateCondition(cond.id, 'dimension', e.target.value)}
              className="px-2 py-1.5 bg-muted border border-border rounded text-xs flex-1 min-w-[140px]">
              {dimensionOptions.map(cat => (
                <optgroup key={cat.category} label={cat.category}>
                  {cat.dimensions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </optgroup>
              ))}
            </select>
            <select value={cond.operator} onChange={e => updateCondition(cond.id, 'operator', e.target.value)}
              className="px-2 py-1.5 bg-muted border border-border rounded text-xs w-16">
              {(dim?.operators || ['=']).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {dim?.valueType === 'select' ? (
              <select value={cond.value} onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                className="px-2 py-1.5 bg-muted border border-border rounded text-xs flex-1">
                {dim.values?.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <input type={dim?.valueType === 'number' ? 'number' : 'text'} value={cond.value}
                onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                className="px-2 py-1.5 bg-muted border border-border rounded text-xs flex-1 min-w-[80px]" />
            )}
            <button onClick={() => removeCondition(cond.id)} className="p-1 text-muted-foreground hover:text-coral"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
      })}

      <button onClick={addCondition} className="text-xs text-teal hover:underline flex items-center gap-1">
        <Plus className="w-3 h-3" /> Add condition
      </button>

      {/* Summary */}
      {conditionSet.conditions.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">Summary:</span> {summary}
        </div>
      )}

      {/* Live preview */}
      {showPreview && conditionSet.conditions.length > 0 && (
        <div className="border border-teal/20 rounded-lg p-3">
          <p className="text-xs font-medium text-teal mb-2">{matchCount} identities match</p>
          {matchedAssets.length > 0 ? (
            <table className="w-full text-[10px]">
              <thead><tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-1 pr-2">Name</th><th className="text-left py-1 pr-2">Type</th><th className="text-left py-1 pr-2">Algorithm</th><th className="text-left py-1">Status</th>
              </tr></thead>
              <tbody>
                {matchedAssets.map(a => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="py-1 pr-2 font-medium text-foreground">{a.name}</td>
                    <td className="py-1 pr-2 text-muted-foreground">{a.type}</td>
                    <td className="py-1 pr-2 text-muted-foreground">{a.algorithm}</td>
                    <td className="py-1">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[10px] text-muted-foreground">No objects match current conditions.</p>}
          {matchCount > 5 && <p className="text-[10px] text-muted-foreground mt-1">...and {matchCount - 5} more</p>}
        </div>
      )}
    </div>
  );
}

// ─── Create Group Modal ──────────────────────────────────────────────────────

function CreateGroupFlow({ onClose, onCreate }: { onClose: () => void; onCreate: (g: CryptoGroup) => void }) {
  const [step, setStep] = useState(1);
  const [groupType, setGroupType] = useState<'Dynamic' | 'Manual'>('Dynamic');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerTeam, setOwnerTeam] = useState('');
  const [conditionSet, setConditionSet] = useState<ConditionSet>({ logic: 'AND', conditions: [] });
  const [manualIds, setManualIds] = useState<Set<string>>(new Set());
  const [nlInput, setNlInput] = useState('');
  const [nlMode, setNlMode] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [manualSearch, setManualSearch] = useState('');

  const matchCount = useMemo(() => groupType === 'Dynamic' ? evaluateConditions(conditionSet, mockAssets).length : manualIds.size, [groupType, conditionSet, manualIds]);

  const handleNLParse = () => {
    if (!nlInput.trim()) return;
    setAiParsing(true);
    setTimeout(() => {
      const lower = nlInput.toLowerCase();
      const newConditions: GroupCondition[] = [];
      if (lower.includes('rsa')) newConditions.push({ id: `nl-${Date.now()}-1`, dimension: 'Algorithm family', operator: '=', value: 'RSA' });
      if (lower.includes('production')) newConditions.push({ id: `nl-${Date.now()}-2`, dimension: 'Environment', operator: '=', value: 'Production' });
      if (lower.includes('weak')) newConditions.push({ id: `nl-${Date.now()}-3`, dimension: 'Algorithm risk level', operator: '=', value: 'Critical' });
      if (lower.includes('expir')) newConditions.push({ id: `nl-${Date.now()}-4`, dimension: 'Days to expiry', operator: '<', value: '60' });
      if (lower.includes('no owner') || lower.includes('unassigned')) newConditions.push({ id: `nl-${Date.now()}-5`, dimension: 'Has owner', operator: '=', value: 'no' });
      if (lower.includes('ssh')) newConditions.push({ id: `nl-${Date.now()}-6`, dimension: 'Certificate type', operator: '=', value: 'SSH Key' });
      if (lower.includes('tls') || lower.includes('cert')) newConditions.push({ id: `nl-${Date.now()}-7`, dimension: 'Certificate type', operator: '=', value: 'TLS Certificate' });
      if (newConditions.length === 0) newConditions.push({ id: `nl-${Date.now()}-8`, dimension: 'Algorithm family', operator: '=', value: 'RSA' });
      setConditionSet({ logic: 'AND', conditions: newConditions });
      if (!name) setName(nlInput.length > 50 ? nlInput.slice(0, 47) + '...' : nlInput);
      setNlMode(false);
      setAiParsing(false);
      toast.success('AI parsed your description — review conditions below');
    }, 800);
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Group name is required'); return; }
    const group: CryptoGroup = {
      id: `grp-${Date.now()}`, name, description, type: groupType,
      conditions: groupType === 'Dynamic' ? conditionSet : undefined,
      manualAssetIds: groupType === 'Manual' ? Array.from(manualIds) : undefined,
      ownerTeam: ownerTeam || undefined,
      policyIds: [], riskScore: Math.floor(Math.random() * 40) + 40,
      lastEvaluated: 'Just now', createdAt: new Date().toISOString().split('T')[0],
    };
    onCreate(group);
    toast.success(`Group "${name}" created with ${matchCount} objects`);
    onClose();
  };

  const filteredAssets = manualSearch
    ? mockAssets.filter(a => a.name.toLowerCase().includes(manualSearch.toLowerCase()) || a.type.toLowerCase().includes(manualSearch.toLowerCase()))
    : mockAssets;

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {['Type', 'Details', groupType === 'Dynamic' ? 'Conditions' : 'Select Objects', 'Review'].map((s, i) => (
          <React.Fragment key={s}>
            <span className={`px-2 py-0.5 rounded-full font-medium ${step === i + 1 ? 'bg-teal/10 text-teal' : ''}`}>{i + 1}. {s}</span>
            {i < 3 && <span>→</span>}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs font-medium">Choose group type</p>
          {[
            { type: 'Dynamic' as const, desc: 'Auto-maintained by attribute conditions. Objects are added/removed in real time.' },
            { type: 'Manual' as const, desc: 'Manually curated. You select exactly which objects belong.' },
          ].map(t => (
            <button key={t.type} onClick={() => setGroupType(t.type)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${groupType === t.type ? 'border-teal bg-teal/5' : 'border-border hover:border-foreground/30'}`}>
              <p className="text-xs font-semibold">{t.type} Group</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
            </button>
          ))}
          <div className="flex justify-end"><button onClick={() => setStep(2)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Next</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Group Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weak RSA in Production" className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description..." className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Owner Team</label>
            <select value={ownerTeam} onChange={e => setOwnerTeam(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
              <option value="">Select team...</option>
              {['Payments Engineering', 'Platform Engineering', 'Security Operations', 'DevOps', 'Infrastructure', 'AI Engineering', 'Database Operations'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Back</button>
            <button onClick={() => setStep(3)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Next</button>
          </div>
        </div>
      )}

      {step === 3 && groupType === 'Dynamic' && (
        <div className="space-y-3">
          {/* NL tab */}
          <div className="flex gap-1 border-b border-border mb-2">
            <button onClick={() => setNlMode(false)} className={`px-3 py-1.5 text-xs border-b-2 transition-colors ${!nlMode ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>Condition Builder</button>
            <button onClick={() => setNlMode(true)} className={`px-3 py-1.5 text-xs border-b-2 transition-colors flex items-center gap-1 ${nlMode ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}><Wand2 className="w-3 h-3" /> Describe It</button>
          </div>
          {nlMode ? (
            <div className="space-y-2">
              <textarea value={nlInput} onChange={e => setNlInput(e.target.value)} rows={3}
                placeholder='e.g. "All production TLS certs using weak algorithms that expire in the next 60 days"'
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none" />
              <button onClick={handleNLParse} disabled={aiParsing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal/10 text-teal text-xs hover:bg-teal/20 border border-teal/20 disabled:opacity-50 w-full justify-center">
                {aiParsing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing...</> : <><Sparkles className="w-3.5 h-3.5" /> Parse with AI</>}
              </button>
            </div>
          ) : (
            <ConditionBuilder conditionSet={conditionSet} onChange={setConditionSet} />
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Back</button>
            <button onClick={() => setStep(4)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Review</button>
          </div>
        </div>
      )}

      {step === 3 && groupType === 'Manual' && (
        <div className="space-y-3">
          <div className="relative">
            <input type="text" value={manualSearch} onChange={e => setManualSearch(e.target.value)} placeholder="Search assets..." className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs pl-8" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filteredAssets.map(a => (
              <label key={a.id} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${manualIds.has(a.id) ? 'bg-teal/5 border border-teal/20' : 'hover:bg-secondary/50'}`}>
                <input type="checkbox" checked={manualIds.has(a.id)} onChange={() => setManualIds(prev => { const n = new Set(prev); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n; })} className="rounded" />
                <span className="font-medium text-foreground">{a.name}</span>
                <span className="text-muted-foreground text-[10px]">{a.type}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{a.algorithm}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-teal font-medium">{manualIds.size} objects selected</p>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Back</button>
            <button onClick={() => setStep(4)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Review</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{groupType}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Objects</span><span className="font-medium text-teal">{matchCount}</span></div>
            {groupType === 'Dynamic' && conditionSet.conditions.length > 0 && (
              <div>
                <span className="text-muted-foreground block mb-1">Conditions</span>
                <div className="flex flex-wrap gap-1">
                  {conditionSet.conditions.map(c => (
                    <span key={c.id} className="px-2 py-0.5 rounded bg-teal/10 text-teal text-[10px] font-medium">{c.dimension} {c.operator} {c.value}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Back</button>
            <button onClick={handleCreate} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Create Group</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Groups Panel (left sidebar) ─────────────────────────────────────────────

interface GroupsPanelProps {
  onSelectGroup: (group: CryptoGroup) => void;
  selectedGroupId?: string;
  onOpenPolicyDrawer: (groupId: string, groupName: string, conditions?: ConditionSet) => void;
}

export default function GroupsPanel({ onSelectGroup, selectedGroupId, onOpenPolicyDrawer }: GroupsPanelProps) {
  const [groups, setGroups] = useState<CryptoGroup[]>(seedGroups);
  const [createOpen, setCreateOpen] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [dismissedAI, setDismissedAI] = useState<Set<number>>(new Set());

  const handleCreate = (g: CryptoGroup) => {
    setGroups(prev => [g, ...prev]);
  };

  const handleAcceptAI = (idx: number) => {
    const s = aiSuggestedGroups[idx];
    const matchCount = evaluateConditions(s.conditions, mockAssets).length;
    const newGroup: CryptoGroup = {
      id: `grp-ai-${Date.now()}`, name: s.name, description: s.reason,
      type: 'Dynamic', conditions: s.conditions,
      policyIds: [], riskScore: Math.floor(Math.random() * 30) + 60,
      aiSuggested: true, lastEvaluated: 'Just now', createdAt: new Date().toISOString().split('T')[0],
    };
    setGroups(prev => [newGroup, ...prev]);
    setDismissedAI(prev => new Set([...prev, idx]));
    toast.success(`Group "${s.name}" created with ${matchCount} objects`);
  };

  const getGroupCount = (g: CryptoGroup) => {
    if (g.type === 'Manual') return g.manualAssetIds?.length || 0;
    if (g.conditions) return evaluateConditions(g.conditions, mockAssets).length;
    return 0;
  };

  const riskColor = (score: number) => score > 70 ? 'bg-coral/10 text-coral' : score > 40 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal';

  const visibleAI = aiSuggestedGroups.filter((_, i) => !dismissedAI.has(i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">Groups</h3>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 text-[10px] text-teal hover:underline"><Plus className="w-3 h-3" /> Create</button>
      </div>

      {/* AI Suggested */}
      {visibleAI.length > 0 && (
        <div>
          <button onClick={() => setAiExpanded(!aiExpanded)} className="flex items-center gap-1.5 text-[10px] font-medium text-teal mb-1.5 w-full">
            <Sparkles className="w-3 h-3" /> AI-Suggested ({visibleAI.length})
            <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${aiExpanded ? 'rotate-90' : ''}`} />
          </button>
          {aiExpanded && visibleAI.map((s, realIdx) => {
            const idx = aiSuggestedGroups.indexOf(s);
            const count = evaluateConditions(s.conditions, mockAssets).length;
            return (
              <div key={idx} className="bg-teal/5 border border-teal/20 rounded-lg p-2.5 mb-2">
                <p className="text-[10px] font-semibold text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{count} objects · {s.reason}</p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => handleAcceptAI(idx)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 font-medium">Create This Group</button>
                  <button onClick={() => setDismissedAI(prev => new Set([...prev, idx]))} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground">Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Groups */}
      <div className="space-y-1.5">
        {groups.map(g => (
          <button key={g.id} onClick={() => onSelectGroup(g)}
            className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selectedGroupId === g.id ? 'border-teal bg-teal/5' : 'border-border hover:border-foreground/20'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground truncate flex-1">{g.name}</span>
              {g.aiSuggested && <Sparkles className="w-3 h-3 text-teal flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${g.type === 'Dynamic' ? 'bg-purple/10 text-purple' : 'bg-muted text-muted-foreground'}`}>{g.type}</span>
              <span className="text-[10px] text-muted-foreground">{getGroupCount(g)} objects</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-auto ${riskColor(g.riskScore)}`}>{g.riskScore}</span>
            </div>
            {g.policyIds.length > 0 ? (
              <p className="text-[10px] text-teal mt-1 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> {g.policyIds.length} policies</p>
            ) : (
              <p className="text-[10px] text-coral mt-1 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> No policy</p>
            )}
          </button>
        ))}
      </div>

      {/* Create Group Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-[640px] max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Group</h3>
              <button onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>
            <CreateGroupFlow onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
          </div>
        </div>
      )}
    </div>
  );
}
