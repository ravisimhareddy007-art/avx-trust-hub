import React, { useState, useMemo } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry, Drawer, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { Download, Search, Sparkles, Settings, RefreshCw, RotateCcw, XCircle, Shield, User, Workflow, Key, ExternalLink, Monitor, Server } from 'lucide-react';
import { toast } from 'sonner';

const typeFilters = ['All', 'TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token'];

function getQuickActions(asset: CryptoAsset) {
  const isSSH = asset.type === 'SSH Key' || asset.type === 'SSH Certificate';
  const isTLS = asset.type === 'TLS Certificate' || asset.type === 'Code-Signing Certificate';
  const isKey = asset.type === 'Encryption Key' || asset.type === 'AI Agent Token';
  if (isTLS) return [{ label: 'Renew', icon: RefreshCw }, { label: 'Revoke', icon: XCircle }];
  if (isSSH || isKey) return [{ label: 'Rotate', icon: RotateCcw }, { label: 'Revoke', icon: XCircle }];
  return [{ label: 'Renew', icon: RefreshCw }, { label: 'Revoke', icon: XCircle }];
}

export default function InventoryPage() {
  const { filters, setFilters } = useNav();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(filters.type || 'All');
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [actionModal, setActionModal] = useState<{ action: string; asset: CryptoAsset } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = [...mockAssets];
    if (typeFilter !== 'All') result = result.filter(a => a.type === typeFilter);
    if (filters.algorithm) result = result.filter(a => a.algorithm === filters.algorithm);
    if (filters.environment) result = result.filter(a => a.environment === filters.environment);
    if (filters.status) result = result.filter(a => a.status === filters.status);
    if (filters.pqcRisk) result = result.filter(a => a.pqcRisk === filters.pqcRisk);
    if (filters.team) result = result.filter(a => a.team.includes(filters.team));
    if (filters.expiryRange === '7d') result = result.filter(a => a.daysToExpiry >= 0 && a.daysToExpiry <= 7);
    if (filters.assetId) result = result.filter(a => a.id === filters.assetId);
    if (search) result = result.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.commonName.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [typeFilter, filters, search]);

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = (action: string, asset: CryptoAsset) => {
    setActionModal({ action, asset });
  };

  const confirmAction = () => {
    if (actionModal) {
      toast.success(`${actionModal.action} initiated for ${actionModal.asset.name}`);
      setActionModal(null);
    }
  };

  const isSSHType = (type: string) => type === 'SSH Key' || type === 'SSH Certificate';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Central Inventory</h1>
        <div className="flex items-center gap-2">
          {Object.keys(filters).length > 0 && (
            <button onClick={() => setFilters({})} className="text-xs text-coral hover:underline">Clear filters</button>
          )}
          <button onClick={() => toast.success('Exporting CSV...')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs text-foreground hover:bg-secondary/80">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets... (Tab for AI mode)" className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
      </div>

      {/* Type filter chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {typeFilters.map(t => (
          <button key={t} onClick={() => { setTypeFilter(t); if (t === 'All') setFilters({}); }} className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${typeFilter === t ? 'bg-teal text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
            {t === 'All' ? 'All' : t} {t !== 'All' && `(${mockAssets.filter(a => a.type === t).length})`}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedRows.size > 0 && (
        <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-teal">{selectedRows.size} selected</span>
            {['Bulk Renew', 'Bulk Rotate', 'Bulk Revoke', 'Assign Owner', 'Add to Workflow'].map(action => (
              <button key={action} onClick={() => {
                const actionWord = action.replace('Bulk ', '');
                toast.success(`${actionWord} initiated for ${selectedRows.size} assets`, { description: 'Workflow created — track progress in TrustOps.' });
                setSelectedRows(new Set());
              }} className={`text-[10px] px-2.5 py-1 rounded font-medium transition-colors ${action === 'Bulk Revoke' ? 'bg-coral/10 text-coral hover:bg-coral/20' : 'bg-teal/10 text-teal hover:bg-teal/20'}`}>{action}</button>
            ))}
          </div>
          <button onClick={() => setSelectedRows(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs min-w-[1500px]">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                <th className="w-8 py-2 px-2"><input type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(filtered.map(a => a.id)) : new Set())} className="rounded" /></th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Asset Name</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">CA / Issuer</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Algorithm</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Team</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Env</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Expiry</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Days</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">PQC Risk</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(asset => {
                const quickActions = getQuickActions(asset);
                return (
                  <tr key={asset.id} className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors" onClick={() => { setSelectedAsset(asset); setDrawerTab('overview'); }}>
                    <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedRows.has(asset.id)} onChange={() => toggleRow(asset.id)} className="rounded" />
                    </td>
                    <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">{asset.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.type}</td>
                    <td className="py-2 px-2 text-muted-foreground truncate max-w-[120px]">{asset.caIssuer}</td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.algorithm}</td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.owner}</td>
                    <td className="py-2 px-2 text-muted-foreground truncate max-w-[120px]">{asset.team}</td>
                    <td className="py-2 px-2"><EnvBadge env={asset.environment} /></td>
                    <td className="py-2 px-2 text-muted-foreground">{asset.expiryDate}</td>
                    <td className="py-2 px-2"><DaysToExpiry days={asset.daysToExpiry} /></td>
                    <td className="py-2 px-2"><StatusBadge status={asset.status} /></td>
                    <td className="py-2 px-2"><PQCBadge risk={asset.pqcRisk} /></td>
                    <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {quickActions.map(({ label, icon: Icon }) => (
                          <button key={label} onClick={() => handleAction(label, asset)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-teal/10 text-teal hover:bg-teal/20 transition-colors" title={label}>
                            <Icon className="w-3 h-3" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No assets found matching your filters.{' '}
            <button onClick={() => { setFilters({}); setTypeFilter('All'); setSearch(''); }} className="text-teal hover:underline">Clear all filters</button>
          </div>
        )}
      </div>

      {/* Asset Detail Drawer */}
      <Drawer open={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name || ''}>
        {selectedAsset && (
          <div>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border">
              {['overview', 'history', 'policy', 'actions', 'ai'].map(tab => (
                <button key={tab} onClick={() => setDrawerTab(tab)} className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${drawerTab === tab ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {tab === 'ai' ? 'AI' : tab}
                </button>
              ))}
            </div>

            {drawerTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ['Type', selectedAsset.type], ['Algorithm', selectedAsset.algorithm], ['Key Length', selectedAsset.keyLength],
                    ['CA / Issuer', selectedAsset.caIssuer], ['Serial', selectedAsset.serial], ['Owner', selectedAsset.owner],
                    ['Team', selectedAsset.team], ['Application', selectedAsset.application], ['Environment', selectedAsset.environment],
                    ['Infrastructure', selectedAsset.infrastructure], ['Discovery Source', selectedAsset.discoverySource],
                    ['Issue Date', selectedAsset.issueDate], ['Expiry Date', selectedAsset.expiryDate], ['Last Rotated', selectedAsset.lastRotated],
                    ['Auto-Renewal', selectedAsset.autoRenewal ? 'Yes' : 'No'], ['Rotation Frequency', selectedAsset.rotationFrequency],
                    ['Status', selectedAsset.status], ['PQC Risk', selectedAsset.pqcRisk],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {/* SSH Endpoints — only for SSH keys/certs */}
                {isSSHType(selectedAsset.type) && selectedAsset.sshEndpoints && selectedAsset.sshEndpoints.length > 0 && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-teal" /> SSH Endpoints
                    </h4>
                    <div className="space-y-1">
                      <div className="grid grid-cols-[80px_1fr_120px_50px_130px] gap-2 text-[10px] font-medium text-muted-foreground pb-1 border-b border-border">
                        <span>Role</span><span>Host</span><span>IP</span><span>Port</span><span>Last Seen</span>
                      </div>
                      {selectedAsset.sshEndpoints.map((ep, i) => (
                        <div key={i} className="grid grid-cols-[80px_1fr_120px_50px_130px] gap-2 text-[10px] py-1.5 border-b border-border/50">
                          <span className={`inline-flex items-center gap-1 font-medium ${ep.role === 'client' ? 'text-teal' : 'text-amber'}`}>
                            {ep.role === 'client' ? <Monitor className="w-3 h-3" /> : <Server className="w-3 h-3" />}
                            {ep.role === 'client' ? 'Client' : 'Host'}
                          </span>
                          <span className="text-foreground font-mono">{ep.host}</span>
                          <span className="text-muted-foreground font-mono">{ep.ip}</span>
                          <span className="text-muted-foreground">{ep.port}</span>
                          <span className="text-muted-foreground">{ep.lastSeen}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependency map */}
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h4 className="text-xs font-semibold mb-3">Dependency Map</h4>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-teal/10 border-2 border-teal flex items-center justify-center mb-1">
                        <Key className="w-6 h-6 text-teal" />
                      </div>
                      <p className="text-[10px] text-foreground font-medium truncate max-w-[80px]">{selectedAsset.name.split('.')[0]}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {Array.from({ length: Math.min(selectedAsset.dependencyCount, 4) }).map((_, i) => (
                        <div key={i} className="w-16 h-0.5 bg-border" />
                      ))}
                    </div>
                    <div className="space-y-2">
                      {['App Server', 'Load Balancer', 'CDN Edge'].slice(0, Math.min(3, selectedAsset.dependencyCount)).map((dep, i) => (
                        <div key={i} className="flex items-center gap-2 cursor-pointer hover:text-teal">
                          <div className="w-8 h-8 rounded bg-secondary border border-border flex items-center justify-center">
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-[10px]">{dep}</span>
                        </div>
                      ))}
                      {selectedAsset.dependencyCount > 3 && <p className="text-[10px] text-muted-foreground">+{selectedAsset.dependencyCount - 3} more</p>}
                    </div>
                  </div>
                </div>
                {selectedAsset.pqcRisk !== 'Safe' && selectedAsset.pqcRisk !== 'Low' && (
                  <div className="bg-amber/5 border border-amber/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber mb-1">PQC Risk: {selectedAsset.pqcRisk}</p>
                    <p className="text-[10px] text-muted-foreground">
                      This asset uses {selectedAsset.algorithm} which will be vulnerable to Shor's algorithm once a cryptographically relevant quantum computer exists.
                      NIST recommends migrating to ML-DSA by 2030.
                    </p>
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'history' && (
              <div className="space-y-3">
                {[
                  { event: 'Certificate issued', time: selectedAsset.issueDate, actor: 'DigiCert CertCentral' },
                  { event: 'Discovered by scan', time: selectedAsset.issueDate, actor: 'Production Full Scan' },
                  { event: 'Policy violation detected', time: '2026-04-10', actor: 'Policy Engine' },
                  { event: 'Owner assigned', time: '2026-03-15', actor: 'Mike Rodriguez' },
                  { event: 'PQC risk assessment', time: '2026-04-01', actor: 'Quantum Posture Engine' },
                ].map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-teal mt-1.5" />
                      {i < 4 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-medium">{e.event}</p>
                      <p className="text-[10px] text-muted-foreground">{e.time} · {e.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {drawerTab === 'policy' && (
              <div className="space-y-2">
                {selectedAsset.policyViolations > 0 ? (
                  [
                    { policy: 'Certificate Expiry Alert', severity: 'High', detail: `Certificate expires in ${selectedAsset.daysToExpiry} days`, action: 'Renew certificate' },
                    { policy: 'PQC-Vulnerable Asset', severity: 'Critical', detail: `Uses ${selectedAsset.algorithm} — quantum vulnerable`, action: 'Migrate to ML-DSA' },
                  ].slice(0, selectedAsset.policyViolations).map((v, i) => (
                    <div key={i} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={v.severity} />
                          <span className="text-xs font-medium">{v.policy}</span>
                        </div>
                        <button onClick={() => toast.success('Remediation created in TrustOps')} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Create remediation</button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{v.detail}</p>
                      <p className="text-[10px] text-teal mt-1">Recommended: {v.action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No policy violations for this asset.</p>
                )}
              </div>
            )}

            {drawerTab === 'actions' && (
              <div className="space-y-2">
                {[
                  { icon: RefreshCw, label: 'Renew', desc: 'Request renewal from CA', show: ['TLS Certificate', 'Code-Signing Certificate', 'K8s Workload Cert'].includes(selectedAsset.type) },
                  { icon: RotateCcw, label: 'Rotate', desc: 'Generate new key pair', show: ['SSH Key', 'SSH Certificate', 'Encryption Key', 'AI Agent Token'].includes(selectedAsset.type) },
                  { icon: XCircle, label: 'Revoke', desc: 'Revoke this credential', show: true },
                  { icon: Shield, label: 'Re-issue with PQC', desc: 'Migrate to ML-DSA algorithm', show: selectedAsset.pqcRisk === 'Critical' || selectedAsset.pqcRisk === 'High' },
                  { icon: User, label: 'Assign Owner', desc: 'Assign or change owner', show: true },
                  { icon: Workflow, label: 'Add to Workflow', desc: 'Include in automation workflow', show: true },
                ].filter(a => a.show).map((action, i) => (
                  <button key={i} onClick={() => handleAction(action.label, selectedAsset)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left">
                    <action.icon className="w-4 h-4 text-teal" />
                    <div>
                      <p className="text-xs font-medium">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {drawerTab === 'ai' && (
              <div className="space-y-3">
                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-teal mb-1">Infinity AI Analysis</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    This {selectedAsset.type.toLowerCase()} serves {selectedAsset.dependencyCount} downstream dependencies
                    and is currently using {selectedAsset.algorithm}. Based on usage patterns and criticality assessment,
                    this asset has a predicted time-to-failure of {selectedAsset.daysToExpiry > 0 ? `${selectedAsset.daysToExpiry} days` : 'immediate risk'}
                    if no action is taken.
                  </p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold mb-2">Similar Assets with Issues</p>
                  {mockAssets.filter(a => a.type === selectedAsset.type && a.id !== selectedAsset.id && a.policyViolations > 0).slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1.5 text-[10px]">
                      <span className="text-foreground">{a.name}</span>
                      <span className="text-coral">{a.policyViolations} violations</span>
                    </div>
                  ))}
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1">Recommended Action</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedAsset.pqcRisk === 'Critical' ? 'Prioritize migration to ML-DSA algorithm as part of PQC migration batch.' :
                     selectedAsset.status === 'Orphaned' ? 'Assign an owner and set up automated rotation policy.' :
                     'Continue monitoring. No immediate action required.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Action Confirmation Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={`Confirm: ${actionModal?.action}`}>
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Impact Preview</p>
              <p className="text-[10px] text-muted-foreground">
                This will affect {actionModal.asset.dependencyCount} applications and services.
                {actionModal.action === 'Renew' && ' Scheduled renewal will trigger at 02:00 AM.'}
                {actionModal.action === 'Rotate' && ' New key will be distributed to all dependent services.'}
                {actionModal.action === 'Revoke' && ' WARNING: All dependent services will immediately lose trust.'}
              </p>
            </div>
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">Asset:</span> {actionModal.asset.name}</p>
              <p><span className="text-muted-foreground">Type:</span> {actionModal.asset.type}</p>
              <p><span className="text-muted-foreground">Environment:</span> {actionModal.asset.environment}</p>
              <p><span className="text-muted-foreground">Dependencies:</span> {actionModal.asset.dependencyCount}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">Cancel</button>
              <button onClick={confirmAction} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Confirm {actionModal.action}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
