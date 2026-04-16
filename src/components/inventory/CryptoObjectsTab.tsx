import React, { useState, useMemo } from 'react';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { mockITAssets } from '@/data/inventoryMockData';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry, SeverityBadge } from '@/components/shared/UIComponents';
import { Search, ChevronDown, ChevronRight, MoreVertical, X, Shield, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onCreateTicket: (ctx: any) => void;
}

const typeFilters = [
  { key: 'All', label: 'All' },
  { key: 'TLS Certificate', label: 'Certificates' },
  { key: 'SSH Key', label: 'SSH Keys' },
  { key: 'SSH Certificate', label: 'SSH Certs' },
  { key: 'Code-Signing Certificate', label: 'Code Signing' },
  { key: 'K8s Workload Cert', label: 'K8s Certs' },
  { key: 'Encryption Key', label: 'Enc Keys' },
  { key: 'AI Agent Token', label: 'AI Agents' },
  { key: 'API Key / Secret', label: 'Secrets' },
];

function CryptoRowMenu({ asset, onAction }: { asset: CryptoAsset; onAction: (action: string) => void }) {
  const [open, setOpen] = useState(false);
  const actions = ['Renew', 'Revoke', 'Assign Owner', 'Add to Group', 'Create Ticket', 'View Full Detail'];
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-1 rounded hover:bg-secondary"><MoreVertical className="w-3 h-3 text-muted-foreground" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[150px] py-1">
            {actions.map(a => (
              <button key={a} onClick={e => { e.stopPropagation(); setOpen(false); onAction(a); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-secondary transition-colors ${a === 'Revoke' ? 'text-coral' : 'text-foreground'}`}>{a}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RiskBar({ label, score }: { label: string; score: number }) {
  const color = score > 70 ? 'bg-coral' : score > 40 ? 'bg-amber' : 'bg-teal';
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">{label}</span><span className="text-[10px] font-medium">{score}</span></div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} /></div>
    </div>
  );
}

export default function CryptoObjectsTab({ onCreateTicket }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<CryptoAsset | null>(null);

  // Sidebar filters
  const [algFilter, setAlgFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pqcFilter, setPqcFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const filtered = useMemo(() => {
    let result = [...mockAssets];
    if (typeFilter !== 'All') result = result.filter(a => a.type === typeFilter);
    if (search) result = result.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.commonName.toLowerCase().includes(search.toLowerCase()));
    if (algFilter) result = result.filter(a => a.algorithm === algFilter);
    if (envFilter) result = result.filter(a => a.environment === envFilter);
    if (statusFilter) result = result.filter(a => a.status === statusFilter);
    if (pqcFilter) result = result.filter(a => a.pqcRisk === pqcFilter);
    if (ownerFilter === 'Unassigned') result = result.filter(a => a.owner === 'Unassigned');
    return result;
  }, [search, typeFilter, algFilter, envFilter, statusFilter, pqcFilter, ownerFilter]);

  const algorithms = [...new Set(mockAssets.map(a => a.algorithm))].sort();

  const getAssociatedAssets = (co: CryptoAsset) => mockITAssets.filter(a => a.cryptoObjectIds.includes(co.id));

  const handleAction = (action: string, co: CryptoAsset) => {
    if (action === 'Create Ticket') {
      onCreateTicket({ objectName: co.name, objectType: co.type, algorithm: co.algorithm, status: co.status, daysToExpiry: co.daysToExpiry, environment: co.environment });
    } else if (action === 'View Full Detail') {
      setDetailAsset(co);
    } else {
      toast.success(`${action} initiated for ${co.name}`);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Main content */}
      <div className="flex-1 min-w-0 p-3 space-y-3 overflow-y-auto">
        {/* Type tabs */}
        <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
          {typeFilters.map(t => {
            const count = t.key === 'All' ? mockAssets.length : mockAssets.filter(a => a.type === t.key).length;
            return (
              <button key={t.key} onClick={() => setTypeFilter(t.key)}
                className={`px-3 py-2 text-[10px] font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${typeFilter === t.key ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
                <span className={`min-w-[16px] px-1 py-0.5 rounded-full text-[9px] font-semibold ${typeFilter === t.key ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search identities..."
              className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <select value={algFilter} onChange={e => setAlgFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Algorithms</option>
            {algorithms.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Envs</option>
            {['Production', 'Staging', 'Development'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Status</option>
            {['Active', 'Expiring', 'Expired', 'Orphaned', 'Revoked'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={pqcFilter} onChange={e => setPqcFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All PQC Risk</option>
            {['Critical', 'High', 'Medium', 'Low'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Owners</option>
            <option value="Unassigned">Unassigned only</option>
          </select>
          {(algFilter || envFilter || statusFilter || pqcFilter || ownerFilter) && (
            <button onClick={() => { setAlgFilter(''); setEnvFilter(''); setStatusFilter(''); setPqcFilter(''); setOwnerFilter(''); }} className="text-[10px] text-coral hover:underline">Clear</button>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{filtered.length} identities</span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border">
                  <th className="w-6 py-2 px-1"></th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Common Name</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Algorithm</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Key Size</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Issuer</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Env</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Owner</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Expiry</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Days</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Auto</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">PQC</th>
                  <th className="w-7 py-2 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => (
                  <React.Fragment key={co.id}>
                    <tr className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === co.id ? null : co.id)}>
                      <td className="py-2 px-1 text-muted-foreground">{expandedRow === co.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</td>
                      <td className="py-2 px-2 font-medium text-foreground truncate max-w-[180px]">{co.name}</td>
                      <td className="py-2 px-2 text-muted-foreground text-[10px]">{co.type}</td>
                      <td className="py-2 px-2 text-muted-foreground">{co.algorithm}</td>
                      <td className="py-2 px-2 text-muted-foreground">{co.keyLength}</td>
                      <td className="py-2 px-2 text-muted-foreground truncate max-w-[100px]">{co.caIssuer}</td>
                      <td className="py-2 px-2"><EnvBadge env={co.environment} /></td>
                      <td className={`py-2 px-2 ${co.owner === 'Unassigned' ? 'text-coral' : 'text-muted-foreground'}`}>{co.owner}</td>
                      <td className="py-2 px-2 text-muted-foreground text-[10px]">{co.expiryDate}</td>
                      <td className="py-2 px-2"><DaysToExpiry days={co.daysToExpiry} /></td>
                      <td className="py-2 px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${co.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{co.autoRenewal ? 'Yes' : 'No'}</span></td>
                      <td className="py-2 px-2"><StatusBadge status={co.status} /></td>
                      <td className="py-2 px-2"><PQCBadge risk={co.pqcRisk} /></td>
                      <td className="py-2 px-1" onClick={e => e.stopPropagation()}>
                        <CryptoRowMenu asset={co} onAction={a => handleAction(a, co)} />
                      </td>
                    </tr>
                    {expandedRow === co.id && (
                      <tr><td colSpan={14} className="p-0">
                        <div className="bg-secondary/30 px-4 py-3 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold text-foreground mb-1.5">Associated Infrastructure</p>
                            {getAssociatedAssets(co).length > 0 ? getAssociatedAssets(co).map(a => (
                              <div key={a.id} className="flex items-center gap-2 text-[10px] py-1">
                                <span className="text-foreground">{a.name}</span>
                                <span className="text-muted-foreground">· {a.type}</span>
                                <EnvBadge env={a.environment} />
                              </div>
                            )) : <p className="text-[10px] text-muted-foreground">No associated assets</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-foreground mb-1.5">Policies + Violations</p>
                            {co.policyViolations > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-amber/10 text-amber text-[9px]">Warn</span>
                                  <span>Weak Algorithm</span>
                                  <span className="ml-auto text-coral font-medium">{co.policyViolations}</span>
                                </div>
                              </div>
                            ) : <p className="text-[10px] text-teal">✓ No violations</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-foreground mb-1.5">Quick Actions</p>
                            <div className="flex flex-wrap gap-1">
                              {['Renew', 'Revoke', 'Assign Owner', 'Create Ticket', 'Add to Group'].map(a => (
                                <button key={a} onClick={() => handleAction(a, co)}
                                  className="px-1.5 py-0.5 rounded text-[9px] border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">{a}</button>
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
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No identities match your filters.</div>}
        </div>
      </div>

      {/* Crypto Object Detail Panel — 60% width */}
      {detailAsset && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={() => setDetailAsset(null)} />
          <div className="w-[60%] bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-semibold text-foreground">{detailAsset.name}</h3>
              <button onClick={() => setDetailAsset(null)} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-0 h-[calc(100vh-48px)]">
              {/* Left: full attributes + risk */}
              <div className="border-r border-border p-4 space-y-4 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Type', detailAsset.type], ['Algorithm', detailAsset.algorithm], ['Key Length', detailAsset.keyLength],
                    ['CA / Issuer', detailAsset.caIssuer], ['Serial', detailAsset.serial], ['Owner', detailAsset.owner],
                    ['Team', detailAsset.team], ['Application', detailAsset.application], ['Environment', detailAsset.environment],
                    ['Infrastructure', detailAsset.infrastructure], ['Discovery', detailAsset.discoverySource],
                    ['Issued', detailAsset.issueDate], ['Expires', detailAsset.expiryDate], ['Last Rotated', detailAsset.lastRotated],
                    ['Auto-Renewal', detailAsset.autoRenewal ? 'Yes' : 'No'], ['Rotation', detailAsset.rotationFrequency],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-muted-foreground text-[10px]">{l}</p><p className="font-medium text-[11px]">{v}</p></div>
                  ))}
                </div>

                {/* Risk breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Risk Score Breakdown</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`text-2xl font-bold ${detailAsset.pqcRisk === 'Critical' ? 'text-coral' : detailAsset.pqcRisk === 'High' ? 'text-amber' : 'text-teal'}`}>
                      {detailAsset.pqcRisk === 'Critical' ? 85 : detailAsset.pqcRisk === 'High' ? 62 : 28}
                    </div>
                    <SeverityBadge severity={detailAsset.pqcRisk} size="md" />
                  </div>
                  <RiskBar label="Algorithm vulnerability" score={detailAsset.pqcRisk === 'Critical' ? 90 : detailAsset.pqcRisk === 'High' ? 65 : 20} />
                  <RiskBar label="Expiry urgency" score={detailAsset.daysToExpiry >= 0 && detailAsset.daysToExpiry <= 7 ? 95 : detailAsset.daysToExpiry <= 30 ? 60 : 15} />
                  <RiskBar label="Internet exposure" score={detailAsset.environment === 'Production' ? 70 : 30} />
                  <RiskBar label="Dependent assets" score={Math.min(100, getAssociatedAssets(detailAsset).length * 20)} />
                  <RiskBar label="Ownership gap" score={detailAsset.owner === 'Unassigned' ? 90 : 5} />
                </div>

                {/* Event history */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">Event History</p>
                  {[
                    { event: 'Discovered', time: detailAsset.issueDate, actor: detailAsset.discoverySource },
                    { event: 'Owner assigned', time: '2026-03-15', actor: detailAsset.owner },
                    { event: 'Policy evaluated', time: '2026-04-10', actor: 'Policy Engine' },
                    { event: 'PQC risk assessed', time: '2026-04-01', actor: 'Quantum Engine' },
                  ].map((e, i) => (
                    <div key={i} className="flex gap-2 text-[10px]">
                      <div className="flex flex-col items-center"><div className="w-1.5 h-1.5 rounded-full bg-teal mt-1" />{i < 3 && <div className="w-px flex-1 bg-border mt-0.5" />}</div>
                      <div className="pb-2"><p className="text-foreground">{e.event}</p><p className="text-muted-foreground">{e.time} · {e.actor}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: associated infrastructure + mini topology */}
              <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin">
                <div className="bg-amber/5 border border-amber/20 rounded-lg p-3 text-[10px] text-muted-foreground">
                  This object is shared across <span className="font-semibold text-foreground">{getAssociatedAssets(detailAsset).length}</span> assets. Expiry or failure impacts all of them.
                </div>

                <div>
                  <p className="text-xs font-semibold mb-2">Associated Infrastructure</p>
                  <div className="space-y-1">
                    {getAssociatedAssets(detailAsset).map(a => (
                      <div key={a.id} className="flex items-center gap-2 bg-secondary/50 rounded p-2 text-[10px]">
                        <span className="font-medium text-foreground">{a.name}</span>
                        <span className="text-muted-foreground">· {a.type}</span>
                        <EnvBadge env={a.environment} />
                        <span className="ml-auto text-muted-foreground">{a.ownerTeam}</span>
                      </div>
                    ))}
                    {getAssociatedAssets(detailAsset).length === 0 && <p className="text-[10px] text-muted-foreground">No associated infrastructure found.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
