import React, { useState, useMemo, useEffect } from 'react';
import { mockITAssets, ITAsset, getAssetRiskDrivers, getAssetAINarrative, getAssetViolations, getBlastRadius } from '@/data/inventoryMockData';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';
import { useAgent } from '@/context/AgentContext';
import { useRisk } from '@/context/RiskContext';
import { useNav } from '@/context/NavigationContext';
import { arsFor } from '@/lib/risk/ars';
import { computeRPS } from '@/lib/risk/rps';
import { StatusBadge, EnvBadge, DaysToExpiry, SeverityBadge } from '@/components/shared/UIComponents';
import { Search, Server, Database, Globe, Shield, ShieldOff, ChevronDown, ChevronRight, MoreVertical, X, Ticket, RefreshCw, XCircle, RotateCcw, User, Plus, FileEdit, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import BlastRadiusTopology from './BlastRadiusTopology';
import BusinessImpactEditor from '@/components/risk/BusinessImpactEditor';
import ArsBadge from '@/components/risk/ArsBadge';
import AssetRiskDrawer from '@/components/risk/AssetRiskDrawer';
import CryptoObjectRiskDrawer from '@/components/risk/CryptoObjectRiskDrawer';

interface Props {
  onCreateTicket: (ctx: any) => void;
  onOpenPolicyDrawer: (groupId: string, groupName: string) => void;
}

const assetTypeIcons: Record<string, string> = {
  'Web Server': '🌐', 'Application Server': '📦', 'Database Server': '🗃️', 'Load Balancer': '⚖️',
  'API Gateway': '🔌', 'K8s Cluster': '☸️', 'CI/CD Pipeline': '🔧', 'Mail Server': '📧',
  'Bastion Host': '🏰', 'CDN': '🌍', 'HSM': '🔐', 'Vault Server': '🗝️',
};

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

// Row menu for identities inside asset detail
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
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-secondary transition-colors ${a === 'Revoke' ? 'text-coral' : 'text-foreground'}`}>
                {a}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type SortKey = 'rps' | 'ars' | 'name' | 'bi';

export default function ITAssetsTab({ onCreateTicket, onOpenPolicyDrawer }: Props) {
  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [biFilter, setBiFilter] = useState('');
  const [riskRange, setRiskRange] = useState<[number, number]>([0, 100]);
  const [sortKey, setSortKey] = useState<SortKey>('rps');
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);
  const [riskDrawerAsset, setRiskDrawerAsset] = useState<ITAsset | null>(null);
  const [riskDrawerObject, setRiskDrawerObject] = useState<CryptoAsset | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [assetStack, setAssetStack] = useState<ITAsset[]>([]);
  const { manualITAssets } = useInventoryRegistry();
  const { setSelectedEntity } = useAgent();
  const { biMap, setBI } = useRisk();
  const { filters: navFilters } = useNav();

  // Sync infrastructure asset selection to Agent context
  useEffect(() => {
    if (selectedAsset) setSelectedEntity({ kind: 'infrastructure', id: selectedAsset.id, name: selectedAsset.name });
    return () => { setSelectedEntity(null); };
  }, [selectedAsset, setSelectedEntity]);

  // Open risk drawer when navigated with assetId (e.g. from ERS dashboard).
  useEffect(() => {
    if (navFilters.assetId) {
      const target = mockITAssets.find(a => a.id === navFilters.assetId);
      if (target) setRiskDrawerAsset(target);
    }
  }, [navFilters.assetId]);

  // Manual assets first so they're immediately visible after add.
  const allAssets = useMemo(() => [...manualITAssets, ...mockITAssets], [manualITAssets]);

  // Compute ARS / BI / RPS once per asset for sorting + display.
  const enriched = useMemo(() => allAssets.map(a => {
    const ars = arsFor(a).ars;
    const bi = biMap[a.id] ?? 'Moderate';
    return { asset: a, ars, bi, rps: computeRPS(ars, bi) };
  }), [allAssets, biMap]);

  const filtered = useMemo(() => {
    let result = enriched;
    if (search) result = result.filter(x => x.asset.name.toLowerCase().includes(search.toLowerCase()));
    if (envFilter) result = result.filter(x => x.asset.environment === envFilter);
    if (typeFilter) result = result.filter(x => x.asset.type === typeFilter);
    if (teamFilter) result = result.filter(x => x.asset.ownerTeam === teamFilter);
    if (biFilter) result = result.filter(x => x.bi === biFilter);
    result = result.filter(x => x.ars >= riskRange[0] && x.ars <= riskRange[1]);

    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.asset.name.localeCompare(b.asset.name);
        case 'ars':  return b.ars - a.ars;
        case 'bi':   {
          const order: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
          return order[a.bi] - order[b.bi];
        }
        case 'rps':
        default:     return b.rps - a.rps;
      }
    });
    return sorted;
  }, [enriched, search, envFilter, typeFilter, teamFilter, biFilter, riskRange, sortKey]);

  const uniqueTeams = [...new Set(allAssets.map(a => a.ownerTeam))];
  const uniqueTypes = [...new Set(allAssets.map(a => a.type))];

  const isManual = (a: ITAsset) => manualITAssets.some(m => m.id === a.id);

  const openAssetDetail = (asset: ITAsset) => {
    if (selectedAsset) setAssetStack(prev => [...prev, selectedAsset]);
    setSelectedAsset(asset);
  };

  const goBack = () => {
    if (assetStack.length > 0) {
      setSelectedAsset(assetStack[assetStack.length - 1]);
      setAssetStack(prev => prev.slice(0, -1));
    } else {
      setSelectedAsset(null);
    }
  };

  // Get identities for an infrastructure asset
  const getIdentities = (asset: ITAsset): CryptoAsset[] => {
    return asset.cryptoObjectIds.map(id => mockAssets.find(a => a.id === id)).filter(Boolean) as CryptoAsset[];
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Main table */}
      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search infrastructure..."
              className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Envs</option>
            {['Production', 'Staging', 'Development'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Teams</option>
            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={biFilter} onChange={e => setBiFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All Business Impact</option>
            {['Critical', 'High', 'Moderate', 'Low'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={`${riskRange[0]}-${riskRange[1]}`} onChange={e => {
            const v = e.target.value;
            if (v === '0-100') setRiskRange([0, 100]);
            else if (v === '71-100') setRiskRange([71, 100]);
            else if (v === '40-70') setRiskRange([40, 70]);
            else setRiskRange([0, 39]);
          }} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="0-100">All ARS</option>
            <option value="71-100">Critical (&gt;70)</option>
            <option value="40-70">Moderate (40-70)</option>
            <option value="0-39">Low (&lt;40)</option>
          </select>
          {(envFilter || typeFilter || teamFilter || biFilter || riskRange[0] !== 0 || riskRange[1] !== 100) && (
            <button onClick={() => { setEnvFilter(''); setTypeFilter(''); setTeamFilter(''); setBiFilter(''); setRiskRange([0, 100]); }} className="text-[10px] text-coral hover:underline">Clear</button>
          )}
          <span className="text-[10px] text-muted-foreground">{filtered.length} assets · sorted by {sortKey.toUpperCase()}</span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    <button onClick={() => setSortKey('name')} className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey==='name'?'text-foreground':''}`}>
                      Asset Name <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Env</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Identities</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                    <button onClick={() => setSortKey('ars')} className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey==='ars'?'text-foreground':''}`}>
                      ARS <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                    <button onClick={() => setSortKey('bi')} className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey==='bi'?'text-foreground':''}`}>
                      Business Impact <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                    <button onClick={() => setSortKey('rps')} className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey==='rps'?'text-foreground':''}`} title="Remediation Priority Score = ARS × Business Impact">
                      RPS <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                  </th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Owner</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Policy</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ asset, ars, bi, rps }) => (
                  <tr key={asset.id} onClick={() => openAssetDetail(asset)}
                    className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span>{assetTypeIcons[asset.type] || '📋'}</span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">{asset.name}</span>
                        {isManual(asset) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal/15 text-teal text-[9px] font-semibold" title="Discovery Vector: Manual Entry">
                            <FileEdit className="w-2.5 h-2.5" /> Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.type}</td>
                    <td className="py-2 px-2"><EnvBadge env={asset.environment} /></td>
                    <td className="py-2 px-2 text-center text-foreground font-medium">{asset.cryptoObjectIds.length}</td>
                    <td className="py-2 px-2 text-center" onClick={e => { e.stopPropagation(); setRiskDrawerAsset(asset); }}>
                      <ArsBadge score={ars} />
                    </td>
                    <td className="py-2 px-2">
                      <BusinessImpactEditor
                        value={bi}
                        onChange={v => setBI(asset.id, v)}
                        onOpenJustification={() => setRiskDrawerAsset(asset)}
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-secondary text-foreground" title="Remediation Priority Score">{rps}</span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.ownerTeam}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${asset.policyCoverage}%` }} /></div>
                        <span className="text-[10px] text-muted-foreground">{asset.policyCoverage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No infrastructure assets match your filters.</div>}
        </div>
      </div>

      {/* Asset Detail Canvas — 80% width overlay */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-[20%] bg-foreground/10 backdrop-blur-sm" onClick={goBack} />
          <div className="w-[80%] bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-slide-in-right">
            {/* Breadcrumb */}
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-2 z-10">
              {assetStack.length > 0 && (
                <>
                  {assetStack.map((a, i) => (
                    <React.Fragment key={a.id}>
                      <button onClick={() => { setSelectedAsset(a); setAssetStack(prev => prev.slice(0, i)); }} className="text-[10px] text-teal hover:underline">{a.name}</button>
                      <span className="text-muted-foreground text-[10px]">›</span>
                    </React.Fragment>
                  ))}
                </>
              )}
              <span className="text-xs font-medium text-foreground truncate">{selectedAsset.name}</span>
              <button onClick={goBack} className="ml-auto p-1 hover:bg-secondary rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {/* Three column layout */}
            <div className="grid grid-cols-[280px_1fr_300px] gap-0 h-[calc(100vh-48px)]">
              {/* Column 1 — Summary + Risk */}
              <div className="border-r border-border p-4 space-y-4 overflow-y-auto scrollbar-thin">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{assetTypeIcons[selectedAsset.type]}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{selectedAsset.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{selectedAsset.type}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <EnvBadge env={selectedAsset.environment} />
                    <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">{selectedAsset.ownerTeam}</span>
                    <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">{selectedAsset.managedBy}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Last seen: {selectedAsset.lastSeen}</p>
                </div>

                {/* Risk gauge */}
                <div className="flex justify-center"><RiskGauge score={selectedAsset.riskScore} size={100} /></div>

                {/* Risk bars */}
                {(() => {
                  const drivers = getAssetRiskDrivers(selectedAsset);
                  return (
                    <div className="space-y-3">
                      <RiskBar label="Crypto Health" score={drivers.cryptoHealth.score} driver={drivers.cryptoHealth.driver} />
                      <RiskBar label="Expiry Exposure" score={drivers.expiryExposure.score} driver={drivers.expiryExposure.driver} />
                      <RiskBar label="Policy Coverage" score={drivers.policyCoverage.score} driver={drivers.policyCoverage.driver} />
                      <RiskBar label="Blast Radius" score={drivers.blastRadius.score} driver={drivers.blastRadius.driver} />
                    </div>
                  );
                })()}

                {/* AI narrative */}
                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-teal mb-1">✦ Infinity AI</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{getAssetAINarrative(selectedAsset)}</p>
                </div>

                {/* Violations */}
                {(() => {
                  const violations = getAssetViolations(selectedAsset);
                  if (violations.length === 0) return null;
                  return (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-foreground">Active Violations</p>
                      {violations.slice(0, 5).map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-border/50 last:border-0">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.severity === 'Critical' ? 'bg-coral' : v.severity === 'High' ? 'bg-amber' : 'bg-purple'}`} />
                          <span className="text-foreground truncate flex-1">{v.type}</span>
                          <button onClick={() => toast.success('Fix initiated')} className="text-teal hover:underline flex-shrink-0">Fix</button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Column 2 — Identities */}
              <div className="p-4 overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-foreground">Identities ({getIdentities(selectedAsset).length})</p>
                </div>
                <div className="space-y-0">
                  {/* Header */}
                  <div className="grid grid-cols-[24px_1fr_80px_60px_55px_50px_36px_36px_28px] gap-1 text-[10px] font-medium text-muted-foreground py-1.5 border-b border-border px-1">
                    <span></span><span>Common Name</span><span>Type</span><span>Algorithm</span><span>Expiry</span><span>Days</span><span>Policy</span><span>Viol.</span><span></span>
                  </div>
                  {getIdentities(selectedAsset).map(co => (
                    <React.Fragment key={co.id}>
                      <div className="grid grid-cols-[24px_1fr_80px_60px_55px_50px_36px_36px_28px] gap-1 items-center text-[10px] py-2 border-b border-border/50 hover:bg-secondary/30 px-1 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === co.id ? null : co.id)}>
                        <span className="text-muted-foreground">{expandedRow === co.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
                        <span className="font-medium text-foreground truncate">{co.name}</span>
                        <span className="text-muted-foreground truncate">{co.type.replace('Certificate', 'Cert')}</span>
                        <span className="text-muted-foreground">{co.algorithm}</span>
                        <span className="text-muted-foreground">{co.expiryDate === 'N/A' ? '—' : co.expiryDate.slice(5)}</span>
                        <DaysToExpiry days={co.daysToExpiry} />
                        {co.policyViolations === 0 ? <Shield className="w-3.5 h-3.5 text-teal" /> : <ShieldOff className="w-3.5 h-3.5 text-coral" />}
                        {co.policyViolations > 0 ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-coral/10 text-coral text-[9px] font-bold">{co.policyViolations}</span> : <span className="text-muted-foreground">—</span>}
                        <CryptoRowMenu asset={co} onAction={action => {
                          if (action === 'Create Ticket') {
                            onCreateTicket({ objectName: co.name, objectType: co.type, algorithm: co.algorithm, status: co.status, daysToExpiry: co.daysToExpiry, environment: co.environment });
                          } else {
                            toast.success(`${action} initiated for ${co.name}`);
                          }
                        }} />
                      </div>
                      {/* Expanded inline detail */}
                      {expandedRow === co.id && (
                        <div className="bg-secondary/30 border-b border-border px-3 py-3 grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-[10px] font-semibold text-foreground mb-1.5">Policies Applied</p>
                            {co.policyViolations > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-amber/10 text-amber">Warn</span>
                                  <span className="text-foreground">Weak Algorithm Detection</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-coral/10 text-coral">Enforce</span>
                                  <span className="text-foreground">Certificate Expiry Alert</span>
                                </div>
                              </div>
                            ) : <p className="text-[10px] text-teal">✓ Compliant — no violations</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-foreground mb-1.5">Active Violations</p>
                            {co.policyViolations > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-coral" /><span className="text-foreground">{co.algorithm} is quantum-vulnerable</span></div>
                                {co.daysToExpiry >= 0 && co.daysToExpiry <= 30 && <div className="flex items-center gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-amber" /><span className="text-foreground">Expires in {co.daysToExpiry}d</span></div>}
                              </div>
                            ) : <p className="text-[10px] text-muted-foreground">None</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-foreground mb-1.5">Quick Actions</p>
                            <div className="flex flex-wrap gap-1">
                              {['Renew', 'Revoke', 'Assign Owner', 'Create Ticket', 'Add to Group'].map(a => (
                                <button key={a} onClick={() => {
                                  if (a === 'Create Ticket') onCreateTicket({ objectName: co.name, objectType: co.type, algorithm: co.algorithm, status: co.status, daysToExpiry: co.daysToExpiry, environment: co.environment });
                                  else toast.success(`${a} initiated`);
                                }} className="px-1.5 py-0.5 rounded text-[9px] border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">{a}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Column 3 — Blast Radius */}
              <div className="border-l border-border p-4 overflow-y-auto scrollbar-thin">
                <p className="text-xs font-semibold text-foreground mb-3">Blast Radius</p>
                {(() => {
                  const br = getBlastRadius(selectedAsset.id, mockAssets);
                  return (
                    <BlastRadiusTopology
                      nodes={br.nodes}
                      summary={br.summary}
                      onNodeClick={node => {
                        if (node.type === 'asset' && node.ring >= 2) {
                          const target = mockITAssets.find(a => a.id === node.id);
                          if (target) openAssetDetail(target);
                        }
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
