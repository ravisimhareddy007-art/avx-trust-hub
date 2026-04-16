import React, { useState, useMemo } from 'react';
import { CryptoGroup, ConditionSet, evaluateConditions, ConditionBuilder } from './GroupsPanel';
import { CryptoAsset, mockAssets } from '@/data/mockData';
import { StatusBadge, EnvBadge, SeverityBadge, DaysToExpiry } from '@/components/shared/UIComponents';
import { RefreshCw, Shield, AlertTriangle, Sparkles, Edit2, ChevronDown, Check, Clock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupDetailProps {
  group: CryptoGroup;
  onBack: () => void;
  onOpenPolicyDrawer: (groupId: string, groupName: string, conditions?: ConditionSet) => void;
}

export default function GroupDetailView({ group, onBack, onOpenPolicyDrawer }: GroupDetailProps) {
  const [tab, setTab] = useState<'objects' | 'policies' | 'remediation' | 'risk'>('objects');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);

  const assets = useMemo(() => {
    if (group.type === 'Manual' && group.manualAssetIds) return mockAssets.filter(a => group.manualAssetIds!.includes(a.id));
    if (group.conditions) return evaluateConditions(group.conditions, mockAssets);
    return [];
  }, [group]);

  const riskColor = group.riskScore > 70 ? 'text-coral' : group.riskScore > 40 ? 'text-amber' : 'text-teal';
  const riskBg = group.riskScore > 70 ? 'stroke-coral' : group.riskScore > 40 ? 'stroke-amber' : 'stroke-teal';
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (group.riskScore / 100) * circumference;

  const violatingAssets = assets.filter(a => a.policyViolations > 0);
  const unprotectedCount = group.policyIds.length === 0 ? assets.length : Math.floor(assets.length * 0.3);

  // Posture dimensions
  const dimensions = [
    { label: 'Algorithm Health (AH)', score: 100 - Math.min(assets.filter(a => a.algorithm.includes('RSA-2048')).length / Math.max(assets.length, 1) * 100, 100), weight: 0.30 },
    { label: 'Expiry Posture (EP)', score: 100 - Math.min(assets.filter(a => a.daysToExpiry >= 0 && a.daysToExpiry < 30).length / Math.max(assets.length, 1) * 100, 100), weight: 0.25 },
    { label: 'PQC Readiness (PQR)', score: 100 - Math.min(assets.filter(a => a.pqcRisk === 'Critical' || a.pqcRisk === 'High').length / Math.max(assets.length, 1) * 100, 100), weight: 0.25 },
    { label: 'Governance Cover (GC)', score: group.policyIds.length > 0 ? 72 : 18, weight: 0.15 },
    { label: 'AI Identity Trust (AIT)', score: 85, weight: 0.05 },
  ];

  const trendData = Array.from({ length: 30 }, (_, i) => ({ day: i, score: Math.max(30, group.riskScore - 15 + Math.floor(Math.random() * 30) + Math.floor(i * 0.3)) }));

  // Remediation tasks
  const remTasks = violatingAssets.map(a => ({
    id: `rem-${a.id}`, asset: a, violation: a.pqcRisk === 'Critical' ? 'Quantum-vulnerable algorithm' : a.daysToExpiry < 30 && a.daysToExpiry >= 0 ? 'Certificate expiring' : 'Policy violation',
    action: a.pqcRisk === 'Critical' ? 'Migrate to ML-KEM' : a.daysToExpiry < 30 ? 'Auto-renew' : 'Assign owner',
    severity: a.pqcRisk === 'Critical' ? 'Critical' : a.daysToExpiry < 7 ? 'Critical' : 'High',
    status: Math.random() > 0.6 ? 'Pending' : Math.random() > 0.5 ? 'In Progress' : 'Completed',
  }));
  const completedPct = remTasks.length > 0 ? Math.round(remTasks.filter(t => t.status === 'Completed').length / remTasks.length * 100) : 100;

  // Mock policies
  const groupPolicies = group.policyIds.length > 0 ? [
    { id: 'pol-001', name: 'Expiry < 30 Days Alert', pack: 'NIST 800-131A', mode: 'Warn', violations: 4, lastEval: '5 min ago', enabled: true },
    { id: 'pol-002', name: 'Block Weak Algorithms', pack: 'PCI-DSS v4', mode: 'Enforce', violations: 2, lastEval: '3 min ago', enabled: true },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Groups</button>
        <div className="flex-1" />
      </div>

      <div className="flex items-start gap-4">
        {/* Risk gauge */}
        <div className="flex-shrink-0">
          <svg width="84" height="84" className="-rotate-90">
            <circle cx="42" cy="42" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle cx="42" cy="42" r="36" fill="none" className={riskBg} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <p className={`text-center text-lg font-bold ${riskColor} -mt-[56px]`}>{group.riskScore}</p>
          <p className="text-center text-[10px] text-muted-foreground mt-5">Risk Score</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input value={groupName} onChange={e => setGroupName(e.target.value)} onBlur={() => setEditingName(false)} autoFocus
                className="text-lg font-bold bg-transparent border-b border-teal outline-none text-foreground" />
            ) : (
              <h2 className="text-lg font-bold text-foreground cursor-pointer hover:text-teal" onClick={() => setEditingName(true)}>{groupName}</h2>
            )}
            <Edit2 className="w-3 h-3 text-muted-foreground cursor-pointer" onClick={() => setEditingName(true)} />
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${group.type === 'Dynamic' ? 'bg-purple/10 text-purple' : 'bg-muted text-muted-foreground'}`}>{group.type}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{assets.length} objects</span>
            {group.type === 'Dynamic' && <span>· Last evaluated: {group.lastEvaluated}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          {group.type === 'Dynamic' && (
            <button onClick={() => toast.success('Group conditions re-evaluated')} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">
              <RefreshCw className="w-3 h-3" /> Evaluate Now
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['objects', 'policies', 'remediation', 'risk'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t === 'risk' ? 'Risk & Insights' : t}
            {t === 'remediation' && remTasks.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-coral/10 text-coral">{remTasks.filter(r => r.status !== 'Completed').length}</span>}
          </button>
        ))}
      </div>

      {/* TAB: Objects */}
      {tab === 'objects' && (
        <div className="space-y-3">
          {selectedRows.size > 0 && (
            <div className="bg-teal/10 border border-teal/30 rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-teal">{selectedRows.size} selected</span>
              <div className="w-px h-5 bg-teal/30" />
              <button onClick={() => { onOpenPolicyDrawer(group.id, groupName, group.conditions); setSelectedRows(new Set()); }} className="px-2.5 py-1 text-[10px] font-medium rounded bg-teal/20 text-teal hover:bg-teal/30">Apply Policy</button>
              <button onClick={() => { toast.success(`Remediation queued for ${selectedRows.size} objects`); setSelectedRows(new Set()); }} className="px-2.5 py-1 text-[10px] font-medium rounded bg-teal/20 text-teal hover:bg-teal/30">Remediate Selected</button>
              <button onClick={() => toast.success('Exported to CSV')} className="px-2.5 py-1 text-[10px] font-medium rounded bg-muted text-muted-foreground hover:text-foreground">Export</button>
              <button onClick={() => setSelectedRows(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground ml-auto">Clear</button>
            </div>
          )}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border">
                  <th className="w-8 py-2 px-2"><input type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(assets.map(a => a.id)) : new Set())} className="rounded" /></th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Algorithm</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Key Size</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Expiry</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Owner</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Violations</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="py-2 px-2"><input type="checkbox" checked={selectedRows.has(a.id)} onChange={() => { const n = new Set(selectedRows); n.has(a.id) ? n.delete(a.id) : n.add(a.id); setSelectedRows(n); }} className="rounded" /></td>
                    <td className="py-2 px-2 font-medium text-foreground truncate max-w-[180px]">{a.name}</td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px]">{a.type}</td>
                    <td className="py-2 px-2 text-muted-foreground">{a.algorithm}</td>
                    <td className="py-2 px-2 text-muted-foreground">{a.keyLength}</td>
                    <td className="py-2 px-2"><DaysToExpiry days={a.daysToExpiry} /></td>
                    <td className="py-2 px-2 text-muted-foreground">{a.owner}</td>
                    <td className="py-2 px-2"><SeverityBadge severity={a.pqcRisk} /></td>
                    <td className="py-2 px-2"><StatusBadge status={a.status} /></td>
                    <td className="py-2 px-2">{a.policyViolations > 0 ? <span className="text-coral text-[10px] font-medium">{a.policyViolations}</span> : <span className="text-[10px] text-muted-foreground">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assets.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">No objects in this group.</div>}
          </div>
        </div>
      )}

      {/* TAB: Policies */}
      {tab === 'policies' && (
        <div className="space-y-3">
          {/* Policy coverage bar */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium">Policy Coverage</span>
              <span className={`font-bold ${unprotectedCount === 0 ? 'text-teal' : 'text-coral'}`}>
                {assets.length > 0 ? Math.round(((assets.length - unprotectedCount) / assets.length) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${assets.length > 0 ? ((assets.length - unprotectedCount) / assets.length) * 100 : 0}%` }} />
            </div>
            {unprotectedCount > 0 && (
              <p className="text-[10px] text-coral mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {unprotectedCount} objects have no active policy</p>
            )}
          </div>

          {groupPolicies.map(p => (
            <div key={p.id} className="bg-card rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.pack} · {p.mode} · Last: {p.lastEval}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.violations > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/10 text-coral">{p.violations} violations</span>}
                  <button className={`w-8 h-4 rounded-full transition-colors relative ${p.enabled ? 'bg-teal' : 'bg-muted'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${p.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => onOpenPolicyDrawer(group.id, groupName, group.conditions)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-teal/30 text-teal text-xs font-medium hover:bg-teal/5 transition-colors">
            <Shield className="w-4 h-4" /> Attach Policy
          </button>

          {groupPolicies.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <Shield className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">No policies on this group.</p>
              <p className="text-[10px] text-muted-foreground">Attach a policy to start governing these objects.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: Remediation */}
      {tab === 'remediation' && (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium">Remediation Progress</span>
              <span className={`font-bold ${completedPct === 100 ? 'text-teal' : 'text-amber'}`}>{completedPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-teal rounded-full" style={{ width: `${completedPct}%` }} />
            </div>
          </div>

          {remTasks.filter(t => t.status !== 'Completed').length > 0 && (
            <button onClick={() => toast.success(`${remTasks.filter(t => t.severity === 'Critical' && t.status === 'Pending').length} critical tasks queued for auto-execution`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-coral/10 text-coral text-xs font-medium hover:bg-coral/20 w-full justify-center">
              <AlertTriangle className="w-3.5 h-3.5" /> Remediate All Critical
            </button>
          )}

          <div className="space-y-2">
            {remTasks.map(t => (
              <div key={t.id} className="bg-card rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={t.severity} />
                    <span className="text-xs font-medium">{t.violation}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === 'Completed' ? 'bg-teal/10 text-teal' : t.status === 'In Progress' ? 'bg-amber/10 text-amber' : 'bg-muted text-muted-foreground'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{t.asset.name} · {t.action}</p>
                {t.status === 'Pending' && (
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => toast.success(`Executing: ${t.action} on ${t.asset.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Approve & Execute</button>
                    <button onClick={() => toast.success('Assigned to team lead')} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground">Assign</button>
                    <button onClick={() => toast.info('Accepted as known risk')} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground">Accept Risk</button>
                  </div>
                )}
              </div>
            ))}
            {remTasks.length === 0 && (
              <div className="text-center py-6">
                <Check className="w-8 h-8 text-teal mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">All clear! No open remediation tasks.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Risk & Insights */}
      {tab === 'risk' && (
        <div className="space-y-4">
          {/* 5-dimension breakdown */}
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <h4 className="text-xs font-semibold">Posture Dimensions</h4>
            {dimensions.map(d => (
              <div key={d.label} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium">{Math.round(d.score)}<span className="text-muted-foreground ml-1">×{d.weight}</span></span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.score > 70 ? 'bg-teal' : d.score > 40 ? 'bg-amber' : 'bg-coral'}`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Trend chart (simplified) */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold mb-3">Risk Score — Last 30 Days</h4>
            <div className="flex items-end gap-[2px] h-16">
              {trendData.map(d => (
                <div key={d.day} className={`flex-1 rounded-t ${d.score > 70 ? 'bg-coral/60' : d.score > 40 ? 'bg-amber/60' : 'bg-teal/60'}`}
                  style={{ height: `${d.score}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>30d ago</span><span>Today</span></div>
          </div>

          {/* Policy gap */}
          {unprotectedCount > 0 && (
            <div className="bg-coral/5 border border-coral/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-coral flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {unprotectedCount} objects unprotected</p>
              <p className="text-[10px] text-muted-foreground mt-1">These objects have no active policy covering them. Attach a policy to improve governance coverage.</p>
              <button onClick={() => onOpenPolicyDrawer(group.id, groupName, group.conditions)} className="text-[10px] text-teal font-medium mt-2 hover:underline">Attach policy →</button>
            </div>
          )}

          {/* AI Insights */}
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal" />
              <p className="text-xs font-semibold text-teal">Infinity AI Insights</p>
            </div>

            {/* Risk narrative */}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This group's risk score is <span className="text-foreground font-medium">{group.riskScore}</span>, driven primarily by{' '}
              {assets.filter(a => a.pqcRisk === 'Critical').length > 0 ? 'quantum-vulnerable algorithms' : 'upcoming certificate expirations'}.{' '}
              {assets.filter(a => a.daysToExpiry >= 0 && a.daysToExpiry < 30).length} objects expire within 30 days, and{' '}
              {assets.filter(a => a.algorithm.includes('RSA-2048')).length} still use RSA-2048.{' '}
              Recommended: activate a compliance pack on this group and queue high-risk objects for PQC migration.
            </p>

            {/* AI recommendations */}
            <div className="space-y-2">
              {group.policyIds.length === 0 && (
                <div className="flex items-start gap-2 p-2 bg-card rounded-lg border border-border">
                  <Shield className="w-3.5 h-3.5 text-teal mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground">This group has no policy covering algorithm strength.</p>
                    <p className="text-[10px] text-muted-foreground">Recommended: Block all RSA key sizes below 2048.</p>
                    <button onClick={() => onOpenPolicyDrawer(group.id, groupName, group.conditions)} className="text-[10px] text-teal font-medium mt-1 hover:underline">Create Policy →</button>
                  </div>
                </div>
              )}
              {assets.filter(a => a.pqcRisk === 'Critical').length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-card rounded-lg border border-border">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground">{assets.filter(a => a.pqcRisk === 'Critical').length} objects are quantum-vulnerable with no active PQC migration.</p>
                    <button onClick={() => toast.success('PQC migration queue started for this group')} className="text-[10px] text-teal font-medium mt-1 hover:underline">Start Migration →</button>
                  </div>
                </div>
              )}
              {assets.filter(a => a.owner === 'Unassigned').length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-card rounded-lg border border-border">
                  <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-foreground">{assets.filter(a => a.owner === 'Unassigned').length} objects have no owner assigned.</p>
                    <p className="text-[10px] text-muted-foreground">Assign ownership to improve Governance Cover score.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
