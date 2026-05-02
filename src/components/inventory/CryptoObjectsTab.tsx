import React, { useState, useMemo, useRef, useEffect } from 'react';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { mockITAssets, mockGroups } from '@/data/inventoryMockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';
import { useAgent } from '@/context/AgentContext';
import { useNav } from '@/context/NavigationContext';
import { Modal } from '@/components/shared/UIComponents';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry, SeverityBadge } from '@/components/shared/UIComponents';
import { Search, ChevronDown, ChevronRight, MoreVertical, X, Shield, ShieldOff, ChevronsRight, FileEdit, Info, Upload } from 'lucide-react';
import { toast } from 'sonner';
import DeployToDeviceModal from '@/components/integrations/DeployToDeviceModal';
import AgentDetailPanel from '@/components/inventory/AgentDetailPanel';
import CryptoObjectRiskDrawer from '@/components/risk/CryptoObjectRiskDrawer';

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

function RowMenu({ asset, onAction }: { asset: CryptoAsset; onAction: (action: string) => void }) {
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

function RiskBar({ label, score, driver }: { label: string; score: number; driver: string }) {
  const color = score > 70 ? 'bg-coral' : score > 40 ? 'bg-amber' : 'bg-teal';
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-medium text-foreground">{score}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} /></div>
      <p className="text-[9px] text-muted-foreground/70 leading-tight">{driver}</p>
    </div>
  );
}

function RiskGauge({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score > 70 ? 'hsl(15, 72%, 52%)' : score > 40 ? 'hsl(38, 78%, 41%)' : 'hsl(160, 70%, 37%)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(225, 20%, 18%)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={size * 0.28} fontWeight="bold">{score}</text>
      <text x={size/2} y={size/2 + size * 0.18} textAnchor="middle" fill="hsl(220, 15%, 55%)" fontSize={size * 0.1}>RISK</text>
    </svg>
  );
}


export default function CryptoObjectsTab({ onCreateTicket }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<CryptoAsset | null>(null);
  const [riskDrawerObject, setRiskDrawerObject] = useState<CryptoAsset | null>(null);
  const [deployFromCert, setDeployFromCert] = useState<CryptoAsset | null>(null);
  const [algFilter, setAlgFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pqcFilter, setPqcFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const { manualIdentities } = useInventoryRegistry();
  const { setSelectedEntity } = useAgent();
  const { filters: navFilters } = useNav();
  const { type: navType, status: navStatus, algorithm: navAlgorithm, owner: navOwner } = navFilters;
  useEffect(() => {
    setTypeFilter(navType || 'All');
    setStatusFilter(navStatus || '');
    setAlgFilter(navAlgorithm || '');
    setOwnerFilter(navOwner || '');
  }, [navType, navStatus, navAlgorithm, navOwner]);

  // Push current identity selection to Agent so it sees what you're looking at
  useEffect(() => {
    if (detailAsset) setSelectedEntity({ kind: 'identity', id: detailAsset.id, name: detailAsset.name });
    return () => { setSelectedEntity(null); };
  }, [detailAsset, setSelectedEntity]);

  const allAssets = useMemo(() => [...manualIdentities, ...mockAssets], [manualIdentities]);
  const isManual = (a: CryptoAsset) => manualIdentities.some(m => m.id === a.id);

  const filtered = useMemo(() => {
    let result = [...allAssets];
    if (typeFilter !== 'All') result = result.filter(a => a.type === typeFilter);
    if (search) result = result.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.commonName.toLowerCase().includes(search.toLowerCase()));
    if (algFilter) result = result.filter(a => a.algorithm === algFilter);
    if (envFilter) result = result.filter(a => a.environment === envFilter);
    if (statusFilter) result = result.filter(a => a.status === statusFilter);
    if (pqcFilter) result = result.filter(a => a.pqcRisk === pqcFilter);
    if (ownerFilter === 'Unassigned') result = result.filter(a => a.owner === 'Unassigned');
    return result;
  }, [allAssets, search, typeFilter, algFilter, envFilter, statusFilter, pqcFilter, ownerFilter]);

  const algorithms = [...new Set(allAssets.map(a => a.algorithm))].sort();
  const getAssociatedAssets = (co: CryptoAsset) => mockITAssets.filter(a => a.cryptoObjectIds.includes(co.id));

  const [actionModal, setActionModal] = useState<{ action: string; asset: CryptoAsset } | null>(null);
  const [assignOwner, setAssignOwner] = useState('');
  const [addToGroup, setAddToGroup] = useState('');

  const handleAction = (action: string, co: CryptoAsset) => {
    if (action === 'Create Ticket') {
      onCreateTicket({ objectName: co.name, objectType: co.type, algorithm: co.algorithm, status: co.status, daysToExpiry: co.daysToExpiry, environment: co.environment });
    } else if (action === 'View Full Detail') {
      setDetailAsset(co);
    } else {
      setActionModal({ action, asset: co });
    }
  };

  const executeAction = () => {
    if (!actionModal) return;
    const { action, asset } = actionModal;
    if (action === 'Assign Owner' && assignOwner) {
      toast.success(`Owner "${assignOwner}" assigned to ${asset.name}`);
    } else if (action === 'Add to Group' && addToGroup) {
      toast.success(`${asset.name} added to group "${addToGroup}"`);
    } else {
      toast.success(`${action} initiated for ${asset.name}`);
    }
    setActionModal(null);
    setAssignOwner('');
    setAddToGroup('');
  };

  const getIdentityRisk = (co: CryptoAsset) => {
    const algScore = co.pqcRisk === 'Critical' ? 90 : co.pqcRisk === 'High' ? 65 : co.pqcRisk === 'Medium' ? 40 : 15;
    const expiryScore = co.daysToExpiry >= 0 && co.daysToExpiry <= 7 ? 95 : co.daysToExpiry <= 30 ? 60 : 15;
    const exposureScore = co.environment === 'Production' ? 70 : 30;
    const depScore = Math.min(100, getAssociatedAssets(co).length * 20);
    const ownerScore = co.owner === 'Unassigned' ? 90 : 5;
    return { algScore, expiryScore, exposureScore, depScore, ownerScore };
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Type filter — replaced horizontal scroll-tabs with a dropdown */}
        <div className="flex items-center gap-2 border-b border-border pb-2 flex-shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground">Identity type:</span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2 py-1 bg-muted border border-border rounded text-[11px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          >
            {typeFilters.map(t => {
              const count = t.key === 'All' ? allAssets.length : allAssets.filter(a => a.type === t.key).length;
              return <option key={t.key} value={t.key}>{t.label} ({count})</option>;
            })}
          </select>
        </div>

        {/* Search + filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
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

        {/* Table — flex-fills remaining height; single bottom horizontal scroll */}
        <div className="bg-card rounded-lg border border-border overflow-hidden relative flex-1 min-h-0 flex flex-col">
          <div
            ref={tableScrollRef}
            className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin"
          >
            <table className="w-full text-xs min-w-[1200px]">
              <thead className="bg-secondary/50 sticky top-0 z-10">
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
                      onClick={() => setDetailAsset(co)}>
                      <td className="py-2 px-1 text-muted-foreground" onClick={e => { e.stopPropagation(); setExpandedRow(expandedRow === co.id ? null : co.id); }}>
                        <button className="p-0.5 rounded hover:bg-secondary" title="Toggle quick preview">
                          {expandedRow === co.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-2 px-2 font-medium text-foreground max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{co.name}</span>
                          {isManual(co) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal/15 text-teal text-[9px] font-semibold flex-shrink-0" title="Discovery Vector: Manual Entry">
                              <FileEdit className="w-2.5 h-2.5" /> Manual
                            </span>
                          )}
                        </div>
                      </td>
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
                        <RowMenu asset={co} onAction={a => handleAction(a, co)} />
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
          {/* Scroll-right affordance — fixed at the right edge of the table */}
          <button
            onClick={() => tableScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-20"
            title="Scroll right"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No identities match your filters.</div>}
        </div>
      </div>

      {detailAsset && detailAsset.type === 'AI Agent Token' && (
        <AgentDetailPanel
          agent={detailAsset}
          onClose={() => setDetailAsset(null)}
          onCreateTicket={onCreateTicket}
          licensed={true}
        />
      )}

      {/* Identity Detail Panel — 80% width slide panel, same design as Infrastructure */}
      {detailAsset && detailAsset.type !== 'AI Agent Token' && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-[20%] bg-foreground/10 backdrop-blur-sm" onClick={() => setDetailAsset(null)} />
          <div className="w-[80%] bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-2 z-10">
              <span className="text-xs font-medium text-foreground truncate">{detailAsset.name}</span>
              <span className="text-[10px] text-muted-foreground">({detailAsset.type})</span>
              <div className="ml-auto flex items-center gap-2">
                {(detailAsset.type === 'TLS Certificate' || detailAsset.type === 'K8s Workload Cert') && (
                  <button
                    onClick={() => setDeployFromCert(detailAsset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal text-primary-foreground rounded-md text-xs font-medium hover:bg-teal/90 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Deploy to Device
                  </button>
                )}
                <button onClick={() => setDetailAsset(null)} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>

            {/* Three column layout — matching Infrastructure design */}
            <div className="grid grid-cols-[280px_1fr] gap-0 h-[calc(100vh-48px)]">
              {/* Column 1 — Identity Summary + Risk */}
              <div className="border-r border-border p-4 space-y-4 overflow-y-auto scrollbar-thin">
                {/* Key attributes */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{detailAsset.commonName || detailAsset.name}</h3>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <EnvBadge env={detailAsset.environment} />
                    <StatusBadge status={detailAsset.status} />
                    <PQCBadge risk={detailAsset.pqcRisk} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                  {[
                    ['Type', detailAsset.type], ['Algorithm', detailAsset.algorithm], ['Key Size', detailAsset.keyLength],
                    ['CA / Issuer', detailAsset.caIssuer], ['Serial', detailAsset.serial], ['Owner', detailAsset.owner],
                    ['Team', detailAsset.team], ['Application', detailAsset.application],
                    ['Infrastructure', detailAsset.infrastructure], ['Discovery', detailAsset.discoverySource],
                    ['Issued', detailAsset.issueDate], ['Expires', detailAsset.expiryDate],
                    ['Last Rotated', detailAsset.lastRotated], ['Auto-Renewal', detailAsset.autoRenewal ? 'Yes' : 'No'],
                    ['Rotation', detailAsset.rotationFrequency],
                  ].map(([l, v]) => (
                    <div key={l}><p className="text-muted-foreground text-[9px]">{l}</p><p className="font-medium text-foreground">{v}</p></div>
                  ))}
                </div>

                {/* Risk gauge — derived from weighted breakdown */}
                {(() => {
                  const risk = getIdentityRisk(detailAsset);
                  // Weighted aggregate: algorithm 30%, expiry 20%, exposure 20%, dependents 15%, ownership 15%
                  const weights = { alg: 0.30, expiry: 0.20, exposure: 0.20, dep: 0.15, owner: 0.15 };
                  const aggregate = Math.round(
                    risk.algScore * weights.alg +
                    risk.expiryScore * weights.expiry +
                    risk.exposureScore * weights.exposure +
                    risk.depScore * weights.dep +
                    risk.ownerScore * weights.owner
                  );
                  return (
                    <>
                      <div className="flex flex-col items-center gap-1.5">
                        <RiskGauge score={aggregate} size={100} />
                        <button
                          onClick={() => setRiskDrawerObject(detailAsset)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-teal/40 transition-colors"
                        >
                          <Info className="w-3 h-3 text-teal" />
                          Why this score?
                        </button>
                      </div>
                      <div className="space-y-3">
                        <RiskBar label="Algorithm vulnerability" score={risk.algScore} driver={risk.algScore > 60 ? `${detailAsset.algorithm} is quantum-vulnerable` : 'Algorithm meets minimum standards'} />
                        <RiskBar label="Expiry urgency" score={risk.expiryScore} driver={risk.expiryScore > 60 ? `Expires in ${detailAsset.daysToExpiry} days` : 'No urgent expiration'} />
                        <RiskBar label="Internet exposure" score={risk.exposureScore} driver={detailAsset.environment === 'Production' ? 'Production-facing asset' : 'Internal environment'} />
                        <RiskBar label="Dependent assets" score={risk.depScore} driver={`${getAssociatedAssets(detailAsset).length} infrastructure assets depend on this`} />
                        <RiskBar label="Ownership gap" score={risk.ownerScore} driver={detailAsset.owner === 'Unassigned' ? 'No owner assigned' : `Owned by ${detailAsset.owner}`} />
                      </div>
                    </>
                  );
                })()}

                {/* AI narrative */}
                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-teal mb-1">✦ Infinity AI</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {detailAsset.pqcRisk === 'Critical'
                      ? `This identity uses ${detailAsset.algorithm} which is quantum-vulnerable. It's shared across ${getAssociatedAssets(detailAsset).length} infrastructure assets — failure would cascade. Immediate action: plan PQC migration and assign an owner if missing.`
                      : detailAsset.daysToExpiry <= 30
                      ? `Expiring in ${detailAsset.daysToExpiry} days with ${getAssociatedAssets(detailAsset).length} dependent assets. ${detailAsset.autoRenewal ? 'Auto-renewal is configured.' : 'No auto-renewal — manual action required.'}`
                      : `This identity is well-managed. ${detailAsset.algorithm} meets current standards. ${getAssociatedAssets(detailAsset).length} assets depend on it.`}
                  </p>
                </div>
              </div>

              {/* Column 2 — Associated Infrastructure (table) */}
              <div className="p-4 overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-foreground">Associated Infrastructure ({getAssociatedAssets(detailAsset).length})</p>
                </div>
                {getAssociatedAssets(detailAsset).length > 0 ? (
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50">
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Asset Name</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Env</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Owner</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getAssociatedAssets(detailAsset).map(a => {
                          const riskColor = a.riskScore > 70 ? 'bg-coral/10 text-coral' : a.riskScore > 40 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal';
                          return (
                            <tr key={a.id} className="border-b border-border hover:bg-secondary/30">
                              <td className="py-2 px-3 font-medium text-foreground">{a.name}</td>
                              <td className="py-2 px-2 text-muted-foreground">{a.type}</td>
                              <td className="py-2 px-2"><EnvBadge env={a.environment} /></td>
                              <td className="py-2 px-2 text-muted-foreground">{a.ownerTeam}</td>
                              <td className="py-2 px-2 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${riskColor}`}>{a.riskScore}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[10px] text-muted-foreground">No associated infrastructure found.</div>
                )}

                {/* Impact banner */}
                {getAssociatedAssets(detailAsset).length > 0 && (
                  <div className="mt-3 bg-amber/5 border border-amber/20 rounded-lg p-3 text-[10px] text-muted-foreground">
                    This identity is shared across <span className="font-semibold text-foreground">{getAssociatedAssets(detailAsset).length}</span> assets. Expiry or failure impacts all of them.
                  </div>
                )}

                {/* Violations — split into Operational + Quantum Risk */}
                {(() => {
                  const isPqc = ['RSA-1024','RSA-2048','RSA-4096','ECDSA-P256','ECDSA-P384','ECC P-256','ECC P-384','SHA-1','MD5','DH-1024','DH-2048'].includes(detailAsset.algorithm);
                  const expYear = detailAsset.expiryDate && detailAsset.expiryDate !== 'N/A'
                    ? new Date(detailAsset.expiryDate).getFullYear() : 0;
                  const hasClassic = detailAsset.policyViolations > 0 || (detailAsset.daysToExpiry >= 0 && detailAsset.daysToExpiry <= 30) || detailAsset.owner === 'Unassigned';
                  const yearsPast = Math.max(0, expYear - 2030);
                  if (!hasClassic && !isPqc) return null;
                  return (
                    <div className="mt-4 space-y-3">
                      {hasClassic && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-coral flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-coral" />
                            Operational Violations
                          </p>
                          {detailAsset.daysToExpiry >= 0 && detailAsset.daysToExpiry <= 30 && (
                            <div className="flex items-center gap-2 text-[10px] py-1.5 border-b border-border/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-coral flex-shrink-0" />
                              <span className="text-foreground flex-1">Expires in {detailAsset.daysToExpiry} days</span>
                              <button onClick={() => toast.success('Renewal initiated via Cert+')} className="text-teal hover:underline flex-shrink-0">Renew</button>
                            </div>
                          )}
                          {detailAsset.owner === 'Unassigned' && (
                            <div className="flex items-center gap-2 text-[10px] py-1.5 border-b border-border/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                              <span className="text-foreground flex-1">No owner assigned</span>
                              <button onClick={() => toast.success('Owner assignment workflow opened')} className="text-teal hover:underline flex-shrink-0">Assign Owner</button>
                            </div>
                          )}
                          {detailAsset.policyViolations > 0 && detailAsset.lastRotated && (
                            <div className="flex items-center gap-2 text-[10px] py-1.5 border-b border-border/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                              <span className="text-foreground flex-1">Rotation policy violation</span>
                              <button onClick={() => toast.success('Rotation initiated')} className="text-teal hover:underline flex-shrink-0">Rotate</button>
                            </div>
                          )}
                        </div>
                      )}
                      {isPqc && (
                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold text-purple-light flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'hsl(280 65% 55%)' }} />
                            Quantum Risk
                            <span className="ml-1 text-[9px] font-semibold px-1 py-0.5 rounded bg-purple/15 text-purple-light">NIST 2030</span>
                          </p>
                          <div className="rounded-md bg-purple/5 border border-purple/20 p-2 text-[10px] leading-snug text-foreground">
                            <span className="font-mono font-semibold">{detailAsset.algorithm}</span> is quantum-vulnerable.
                            {expYear > 0 && (
                              <> This credential expires in <span className="font-semibold">{expYear}</span>
                                {yearsPast > 0
                                  ? <> — <span className="text-coral font-semibold">{yearsPast} year{yearsPast === 1 ? '' : 's'} past</span> NIST migration deadline.</>
                                  : <> at the NIST migration deadline.</>}
                              </>
                            )}
                            <div className="mt-2 flex items-center justify-end">
                              <button
                                onClick={() => toast.success(`${detailAsset.name} added to QTH migration queue`)}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-purple/20 text-purple-light hover:bg-purple-light hover:text-primary-foreground transition-colors"
                              >
                                Add to QTH Queue →
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Action confirmation modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={actionModal ? `${actionModal.action} — ${actionModal.asset.name}` : ''}>
        {actionModal && (
          <div className="space-y-4">
            {actionModal.action === 'Renew' && (
              <div className="text-xs text-muted-foreground">
                <p>This will initiate certificate renewal for <span className="font-semibold text-foreground">{actionModal.asset.name}</span>.</p>
                <p className="mt-1">Algorithm: {actionModal.asset.algorithm} · Issuer: {actionModal.asset.caIssuer}</p>
                <p>Current expiry: {actionModal.asset.expiryDate} ({actionModal.asset.daysToExpiry}d remaining)</p>
              </div>
            )}
            {actionModal.action === 'Revoke' && (
              <div className="bg-coral/5 border border-coral/20 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="text-coral font-semibold mb-1">⚠ Irreversible Action</p>
                <p>Revoking <span className="font-semibold text-foreground">{actionModal.asset.name}</span> will immediately invalidate it across all {getAssociatedAssets(actionModal.asset).length} associated infrastructure assets.</p>
              </div>
            )}
            {actionModal.action === 'Assign Owner' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Select Owner</label>
                <select value={assignOwner} onChange={e => setAssignOwner(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                  <option value="">Choose an owner...</option>
                  {['Sarah Chen', 'Mike Rodriguez', 'Lisa Park', 'James Wilson', 'Platform Engineering', 'Security Operations', 'DevOps'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}
            {actionModal.action === 'Add to Group' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Select Group</label>
                <select value={addToGroup} onChange={e => setAddToGroup(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs">
                  <option value="">Choose a group...</option>
                  {mockGroups.map(g => <option key={g.id} value={g.name}>{g.name} ({g.objectCount} identities)</option>)}
                </select>
              </div>
            )}
            {actionModal.action === 'Rotate' && (
              <div className="text-xs text-muted-foreground">
                <p>Initiate key rotation for <span className="font-semibold text-foreground">{actionModal.asset.name}</span>.</p>
                <p className="mt-1">Last rotated: {actionModal.asset.lastRotated} · Frequency: {actionModal.asset.rotationFrequency}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button onClick={executeAction} className={`px-4 py-2 text-xs rounded-lg text-primary-foreground ${actionModal.action === 'Revoke' ? 'bg-coral hover:bg-coral/90' : 'bg-teal hover:bg-teal-light'}`}>
                {actionModal.action === 'Assign Owner' ? 'Assign' : actionModal.action === 'Add to Group' ? 'Add' : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <DeployToDeviceModal
        open={!!deployFromCert}
        onClose={() => setDeployFromCert(null)}
        cert={deployFromCert}
      />

      <CryptoObjectRiskDrawer
        object={riskDrawerObject}
        onClose={() => setRiskDrawerObject(null)}
      />
    </div>
  );
}
