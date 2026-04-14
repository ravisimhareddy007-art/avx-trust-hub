import React, { useEffect, useState, useMemo } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { RefreshCw, RotateCcw, XCircle, Shield, Search, Download, ChevronDown, CheckCircle2 } from 'lucide-react';

const typeFilters = ['All', 'TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate'];
...
export default function RemediationPage() {
  const { filters, setFilters } = useNav();
  const [typeFilter, setTypeFilter] = useState(filters.type || 'All');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<RemediationItem | null>(null);
  const [bulkAction, setBulkAction] = useState(false);

  useEffect(() => {
    setTypeFilter(filters.type || 'All');
  }, [filters.type]);

  const items = useMemo(() => {
    let assets = [...mockAssets];
    if (typeFilter !== 'All') assets = assets.filter(a => a.type === typeFilter);
    if (search) assets = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    return getRemediationItems(assets);
  }, [typeFilter, search]);

  const toggleRow = (id: string) => {
    setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkRemediate = () => {
    if (selectedRows.size === 0) { toast.info('Select items first'); return; }
    toast.success(`Bulk remediation initiated for ${selectedRows.size} items`, { description: 'Workflows created — track in TrustOps.' });
    setSelectedRows(new Set());
  };

  const handleSingleRemediate = (item: RemediationItem) => {
    setActionModal(item);
  };

  const confirmAction = () => {
    if (actionModal) {
      toast.success(`${actionModal.actionType} initiated for ${actionModal.asset.name}`);
      setActionModal(null);
    }
  };

  const actionIcon = (type: string) => {
    switch (type) {
      case 'Renew': return RefreshCw;
      case 'Rotate': return RotateCcw;
      case 'Revoke': return XCircle;
      case 'Migrate': return Shield;
      default: return RefreshCw;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Remediation</h1>
        <span className="text-xs text-muted-foreground">{items.length} items need attention</span>
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-lg border border-border px-3 py-2 flex items-center gap-2 flex-wrap">
        <select
          value={typeFilter}
          onChange={e => {
            const nextType = e.target.value;
            setTypeFilter(nextType);
            setFilters(nextType === 'All' ? {} : { type: nextType });
          }}
          className="bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal min-w-[140px]"
        >
          {typeFilters.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
        </select>

        <div className="w-px h-6 bg-border" />

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-7 pr-3 py-1 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>

        <div className="w-px h-6 bg-border" />

        {selectedRows.size > 0 && (
          <button onClick={handleBulkRemediate}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-teal text-primary-foreground rounded hover:bg-teal-light transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" /> Remediate Selected ({selectedRows.size})
          </button>
        )}

        <button onClick={() => toast.success('Exporting remediation report...')}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground ml-auto">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                <th className="w-8 py-2 px-2">
                  <input type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(items.map((_, i) => `${i}`)) : new Set())} className="rounded" />
                </th>
                {['Asset Name', 'Type', 'Issue', 'Severity', 'Owner', 'Environment', 'Recommended Action', ''].map(h => (
                  <th key={h} className="text-left py-2.5 px-2 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const Icon = actionIcon(item.actionType);
                return (
                  <tr key={`${item.asset.id}-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="py-2 px-2">
                      <input type="checkbox" checked={selectedRows.has(`${i}`)} onChange={() => toggleRow(`${i}`)} className="rounded" />
                    </td>
                    <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">{item.asset.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{item.asset.type}</td>
                    <td className="py-2 px-2 text-muted-foreground max-w-[180px]">{item.issue}</td>
                    <td className="py-2 px-2"><SeverityBadge severity={item.severity} /></td>
                    <td className="py-2 px-2 text-muted-foreground">{item.asset.owner}</td>
                    <td className="py-2 px-2"><StatusBadge status={item.asset.environment} /></td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px] max-w-[160px]">{item.recommendedAction}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleSingleRemediate(item)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-teal/10 text-teal hover:bg-teal/20 transition-colors">
                        <Icon className="w-3 h-3" /> {item.actionType}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No remediation items found. All assets are healthy.
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={`Confirm: ${actionModal?.actionType}`}>
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Impact Preview</p>
              <p className="text-[10px] text-muted-foreground">
                This will affect {actionModal.asset.dependencyCount} dependent services.
                {actionModal.actionType === 'Migrate' && ' Algorithm will be changed to ML-DSA (post-quantum safe).'}
                {actionModal.actionType === 'Revoke' && ' WARNING: Dependent services will lose trust immediately.'}
              </p>
            </div>
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">Asset:</span> {actionModal.asset.name}</p>
              <p><span className="text-muted-foreground">Issue:</span> {actionModal.issue}</p>
              <p><span className="text-muted-foreground">Type:</span> {actionModal.asset.type}</p>
              <p><span className="text-muted-foreground">Environment:</span> {actionModal.asset.environment}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">Cancel</button>
              <button onClick={confirmAction} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Confirm {actionModal.actionType}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
