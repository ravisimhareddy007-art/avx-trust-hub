import React, { useState, useMemo } from 'react';
import { mockDeployments, CertDeployment, DeploymentStatus } from '@/data/deploymentsMockData';
import { Search, CheckCircle2, AlertTriangle, Clock, Loader2, RefreshCw, X, FileText, ArrowUpRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

function StatusPill({ status }: { status: DeploymentStatus }) {
  const map: Record<DeploymentStatus, { label: string; cls: string; Icon: React.ElementType }> = {
    pending: { label: 'Pending', cls: 'bg-muted text-muted-foreground', Icon: Clock },
    'in-progress': { label: 'In progress', cls: 'bg-amber/10 text-amber', Icon: Loader2 },
    success: { label: 'Success', cls: 'bg-teal/10 text-teal', Icon: CheckCircle2 },
    failed: { label: 'Failed', cls: 'bg-coral/10 text-coral', Icon: AlertTriangle },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${cls}`}>
      <Icon className={`w-3 h-3 ${status === 'in-progress' ? 'animate-spin' : ''}`} /> {label}
    </span>
  );
}

const filterOptions: { id: 'all' | DeploymentStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
];

export default function CertDeploymentsView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | DeploymentStatus>('all');
  const [selected, setSelected] = useState<CertDeployment | null>(null);

  const items = useMemo(() => {
    let r = mockDeployments;
    if (filter !== 'all') r = r.filter(d => d.status === filter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(d =>
        d.id.toLowerCase().includes(q) ||
        d.certName.toLowerCase().includes(q) ||
        d.targets.some(t => t.deviceName.toLowerCase().includes(q))
      );
    }
    return r;
  }, [filter, search]);

  const counts = useMemo(() => ({
    all: mockDeployments.length,
    pending: mockDeployments.filter(d => d.status === 'pending').length,
    'in-progress': mockDeployments.filter(d => d.status === 'in-progress').length,
    success: mockDeployments.filter(d => d.status === 'success').length,
    failed: mockDeployments.filter(d => d.status === 'failed').length,
  }), []);

  const handleRetry = (d: CertDeployment) => {
    toast.success(`Deployment ${d.id} re-queued`, { description: `Targets: ${d.targets.map(t => t.deviceName).join(', ')}` });
  };

  return (
    <div className="space-y-3">
      {/* Stat strip */}
      <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-5 gap-4">
        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</p><p className="text-sm font-bold text-foreground">{counts.all}</p></div>
        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending</p><p className="text-sm font-bold text-foreground">{counts.pending}</p></div>
        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">In progress</p><p className="text-sm font-bold text-amber">{counts['in-progress']}</p></div>
        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Success</p><p className="text-sm font-bold text-teal">{counts.success}</p></div>
        <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Failed</p><p className="text-sm font-bold text-coral">{counts.failed}</p></div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterOptions.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
              filter === f.id ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-lg border border-border px-3 py-2 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, cert, or device..."
            className="w-full pl-7 pr-3 py-1 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">{items.length} of {mockDeployments.length}</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Deployment ID</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Certificate</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Targets</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Initiated</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">By</th>
              <th className="w-32 py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id} className="border-b border-border last:border-b-0 hover:bg-secondary/30">
                <td className="py-2 px-3 font-mono text-[10px] text-foreground">{d.id}</td>
                <td className="py-2 px-2 text-foreground font-medium">{d.certName}</td>
                <td className="py-2 px-2 text-muted-foreground text-[10px]">
                  {d.targets.length === 1 ? d.targets[0].deviceName : `${d.targets.length} devices`}
                </td>
                <td className="py-2 px-2"><StatusPill status={d.status} /></td>
                <td className="py-2 px-2 text-muted-foreground text-[10px]">{d.initiatedAt}</td>
                <td className="py-2 px-2 text-muted-foreground text-[10px] truncate max-w-[140px]">{d.initiatedBy}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setSelected(d)} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                      <FileText className="w-3 h-3" /> Logs
                    </button>
                    {d.status === 'failed' && (
                      <button onClick={() => handleRetry(d)} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20">
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No deployments match the current filter.</div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="w-[30%] bg-foreground/10 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-[70%] bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-2 z-10">
              <span className="font-mono text-xs text-foreground">{selected.id}</span>
              <span className="text-xs text-muted-foreground truncate">· {selected.certName}</span>
              <StatusPill status={selected.status} />
              <button onClick={() => setSelected(null)} className="ml-auto p-1 hover:bg-secondary rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-4 gap-3 text-[10px]">
                <div><p className="text-muted-foreground text-[9px] uppercase tracking-wide">Initiated</p><p className="font-medium text-foreground">{selected.initiatedAt}</p></div>
                <div><p className="text-muted-foreground text-[9px] uppercase tracking-wide">By</p><p className="font-medium text-foreground truncate">{selected.initiatedBy}</p></div>
                <div><p className="text-muted-foreground text-[9px] uppercase tracking-wide">Source</p><p className="font-medium text-foreground capitalize">{selected.source.replace('-', ' ')}</p></div>
                <div><p className="text-muted-foreground text-[9px] uppercase tracking-wide">Config</p><p className="font-medium text-foreground">{selected.config.replaceExisting ? 'Replace' : 'New binding'}{selected.config.restartService ? ' · restart' : ''}</p></div>
              </div>

              {/* Targets */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Targets ({selected.targets.length})</p>
                <div className="bg-card rounded border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50">
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground text-[10px]">Device</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground text-[10px]">Type</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground text-[10px]">Status</th>
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground text-[10px]">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.targets.map(t => (
                        <tr key={t.deviceId} className="border-b border-border last:border-b-0">
                          <td className="py-1.5 px-2 text-foreground">{t.deviceName}</td>
                          <td className="py-1.5 px-2 text-muted-foreground text-[10px]">{t.deviceType}</td>
                          <td className="py-1.5 px-2"><StatusPill status={t.status} /></td>
                          <td className="py-1.5 px-2 text-muted-foreground text-[10px]">{t.message || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logs */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Logs</p>
                <div className="bg-muted/30 rounded border border-border p-3 font-mono text-[10px] space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
                  {selected.logs.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-muted-foreground flex-shrink-0">{l.ts}</span>
                      <span className={
                        l.level === 'error' ? 'text-coral' :
                        l.level === 'warn' ? 'text-amber' :
                        l.level === 'success' ? 'text-teal' :
                        'text-foreground'
                      }>{l.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                {selected.status === 'failed' && (
                  <button onClick={() => handleRetry(selected)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-coral/10 text-coral hover:bg-coral/20 rounded text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> Retry deployment
                  </button>
                )}
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
