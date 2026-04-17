import React, { useState, useMemo } from 'react';
import { mockDevices, OnboardedDevice, DeviceType } from '@/data/deviceMockData';
import { Search, Plus, Server, CheckCircle2, AlertTriangle, XCircle, Upload, RefreshCw } from 'lucide-react';
import DeviceDetailDrawer from './DeviceDetailDrawer';
import { toast } from 'sonner';

// Onboarding-target catalog: lists what device TYPES can be onboarded.
// Each tile leads to onboarding form (mocked as toast for now — Add Device flow).
const deviceTypeCatalog: { type: DeviceType; category: string; description: string; modules: { name: string; required?: boolean }[] }[] = [
  { type: 'F5 BIG-IP', category: 'ADC / Load Balancer', description: 'Push & install certificates on virtual servers, SSL profiles', modules: [{ name: 'LTM', required: true }, { name: 'DNS' }] },
  { type: 'Citrix ADC', category: 'ADC / Load Balancer', description: 'Push certs to NetScaler vServers and SSL profiles', modules: [{ name: 'SSL', required: true }] },
  { type: 'NGINX', category: 'Web Server', description: 'Deploy TLS certs to NGINX server blocks via SSH/agent', modules: [{ name: 'HTTPS', required: true }, { name: 'TLS termination' }] },
  { type: 'Apache HTTP Server', category: 'Web Server', description: 'Push certs to Apache VirtualHost configs', modules: [{ name: 'mod_ssl', required: true }] },
  { type: 'Microsoft IIS', category: 'Web Server', description: 'Install certs into Windows cert store + IIS bindings', modules: [{ name: 'HTTPS binding', required: true }] },
  { type: 'HAProxy', category: 'Load Balancer', description: 'Deploy combined PEM + reload HAProxy frontends', modules: [{ name: 'frontend SSL', required: true }] },
  { type: 'Kubernetes', category: 'Container Platform', description: 'Push as TLS Secret · bind to Ingress / Service', modules: [{ name: 'TLS Secret', required: true }, { name: 'Ingress' }, { name: 'Service' }] },
];

function HealthDot({ health }: { health: OnboardedDevice['health'] }) {
  if (health === 'healthy') return <CheckCircle2 className="w-3 h-3 text-teal" />;
  if (health === 'drift') return <AlertTriangle className="w-3 h-3 text-amber" />;
  return <XCircle className="w-3 h-3 text-coral" />;
}

function HealthLabel({ health }: { health: OnboardedDevice['health'] }) {
  const map: Record<OnboardedDevice['health'], string> = {
    'healthy': 'Healthy',
    'drift': 'Drift detected',
    'connection-failed': 'Connection failed',
    'deployment-failed': 'Deployment failed',
  };
  const color: Record<OnboardedDevice['health'], string> = {
    'healthy': 'text-teal',
    'drift': 'text-amber',
    'connection-failed': 'text-coral',
    'deployment-failed': 'text-coral',
  };
  return <span className={`text-[10px] ${color[health]}`}>{map[health]}</span>;
}

export default function DeploymentTargetsView() {
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<OnboardedDevice | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  const filteredDevices = useMemo(() => {
    if (!search) return mockDevices;
    const q = search.toLowerCase();
    return mockDevices.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      d.hostFqdn.toLowerCase().includes(q)
    );
  }, [search]);

  const stats = useMemo(() => ({
    total: mockDevices.length,
    healthy: mockDevices.filter(d => d.health === 'healthy').length,
    drift: mockDevices.filter(d => d.health === 'drift').length,
    failed: mockDevices.filter(d => d.health === 'connection-failed' || d.health === 'deployment-failed').length,
    certs: mockDevices.reduce((sum, d) => sum + d.installedCerts.length, 0),
  }), []);

  const handleOnboard = (type: DeviceType) => {
    toast.info(`Opening ${type} onboarding form...`, {
      description: 'Device fields (host, port, env, auth, modules) collected via the unified onboarding flow.',
    });
    setShowCatalog(false);
  };

  const handleSyncAll = () => {
    toast.info('Polling all onboarded devices...');
    setTimeout(() => toast.success(`Sync complete · ${stats.total} devices · ${stats.certs} certs reconciled`), 1200);
  };

  return (
    <div className="space-y-4">
      {/* Header strip — push semantics */}
      <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-teal/10 text-teal">
          <Upload className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Push · Deploy</span>
        </div>
        <div className="grid grid-cols-4 gap-4 flex-1">
          <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Onboarded</p><p className="text-sm font-bold text-foreground">{stats.total}</p></div>
          <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Healthy</p><p className="text-sm font-bold text-teal">{stats.healthy}</p></div>
          <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Drift / failed</p><p className="text-sm font-bold text-amber">{stats.drift + stats.failed}</p></div>
          <div><p className="text-[9px] text-muted-foreground uppercase tracking-wide">Certs deployed</p><p className="text-sm font-bold text-foreground">{stats.certs}</p></div>
        </div>
        <button onClick={handleSyncAll} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <RefreshCw className="w-3 h-3" /> Sync all
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search devices..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
        <button
          onClick={() => setShowCatalog(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal text-primary-foreground rounded text-xs font-medium hover:bg-teal/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Onboard Device
        </button>
      </div>

      {/* Onboarded device list */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2 border-b border-border pb-1.5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Onboarded Devices</h2>
          <span className="text-[10px] text-muted-foreground">{filteredDevices.length} of {mockDevices.length}</span>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Device</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Host / FQDN</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Env</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Certs</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Health</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(d => (
                <tr
                  key={d.id}
                  onClick={() => setSelectedDevice(d)}
                  className="border-b border-border last:border-b-0 hover:bg-secondary/30 cursor-pointer"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{d.type}</td>
                  <td className="py-2 px-2 text-muted-foreground text-[10px]">{d.hostFqdn}</td>
                  <td className="py-2 px-2 text-muted-foreground">{d.environment}</td>
                  <td className="py-2 px-2 text-center text-foreground">{d.installedCerts.length}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <HealthDot health={d.health} />
                      <HealthLabel health={d.health} />
                    </div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground text-[10px]">{d.lastSync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding catalog modal */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowCatalog(false)} />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-[640px] max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Onboard a deployment target</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pick a device type · operational entity, not a connector</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-2">
              {deviceTypeCatalog.map(t => (
                <button
                  key={t.type}
                  onClick={() => handleOnboard(t.type)}
                  className="text-left bg-card border border-border hover:border-teal/40 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-xs font-medium text-foreground">{t.type}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.category}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">{t.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.modules.map(m => (
                      <span key={m.name} className={`text-[9px] px-1 py-0.5 rounded ${m.required ? 'bg-coral/10 text-coral' : 'bg-muted text-muted-foreground'}`}>
                        {m.name}{m.required ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DeviceDetailDrawer
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        device={selectedDevice}
      />
    </div>
  );
}
