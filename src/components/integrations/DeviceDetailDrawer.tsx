import React, { useState } from 'react';
import { OnboardedDevice } from '@/data/deviceMockData';
import { X, RefreshCw, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';

interface Props {
  open: boolean;
  onClose: () => void;
  device: OnboardedDevice | null;
}

function HealthBadge({ health }: { health: OnboardedDevice['health'] }) {
  if (health === 'healthy') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal/10 text-teal"><CheckCircle2 className="w-3 h-3" /> Healthy</span>;
  if (health === 'drift') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber"><AlertTriangle className="w-3 h-3" /> Drift detected</span>;
  if (health === 'connection-failed') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-coral/10 text-coral"><XCircle className="w-3 h-3" /> Connection failed</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-coral/10 text-coral"><XCircle className="w-3 h-3" /> Deployment failed</span>;
}

export default function DeviceDetailDrawer({ open, onClose, device }: Props) {
  const [syncing, setSyncing] = useState(false);
  const { setCurrentPage, setFilters } = useNav();

  if (!open || !device) return null;

  const handleSync = () => {
    setSyncing(true);
    toast.info(`Pulling current state from ${device.name}...`);
    setTimeout(() => {
      setSyncing(false);
      toast.success(`${device.name} sync complete · ${device.installedCerts.length} certs found`);
    }, 1200);
  };

  const driftCount = device.installedCerts.filter(c => c.drift).length;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="w-[20%] bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[80%] bg-card border-l border-border shadow-2xl h-full overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-2 z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{device.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{device.type}</span>
              <HealthBadge health={device.health} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{device.hostFqdn} · {device.environment} · Last sync {device.lastSync}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-[280px_1fr] gap-0 h-[calc(100vh-56px)]">
          {/* Left — device summary + actions */}
          <div className="border-r border-border p-4 space-y-4 overflow-y-auto scrollbar-thin">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Connection</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                <div><p className="text-muted-foreground text-[9px]">Host / FQDN</p><p className="font-medium text-foreground truncate">{device.hostFqdn}</p></div>
                <div><p className="text-muted-foreground text-[9px]">API Port</p><p className="font-medium text-foreground">{device.apiPort}</p></div>
                {device.sshPort && <div><p className="text-muted-foreground text-[9px]">SSH Port</p><p className="font-medium text-foreground">{device.sshPort}</p></div>}
                <div><p className="text-muted-foreground text-[9px]">Environment</p><p className="font-medium text-foreground">{device.environment}</p></div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Modules</p>
              <div className="flex flex-wrap gap-1">
                {device.modules.map(m => (
                  <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground">{m}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">State</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]"><span className="text-muted-foreground">Installed certs</span><span className="font-medium text-foreground">{device.installedCerts.length}</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-muted-foreground">Drift items</span><span className={`font-medium ${driftCount > 0 ? 'text-amber' : 'text-foreground'}`}>{driftCount}</span></div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-muted-foreground">Expiring ≤ 30d</span><span className="font-medium text-foreground">{device.installedCerts.filter(c => c.daysToExpiry <= 30).length}</span></div>
              </div>
            </div>

            {device.notes && (
              <div className="bg-coral/5 border border-coral/20 rounded p-2">
                <p className="text-[10px] font-semibold text-coral mb-1">Last error</p>
                <p className="text-[10px] text-foreground leading-relaxed">{device.notes}</p>
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-border">
              <button
                onClick={() => {
                  setCurrentPage('remediation');
                  setFilters({ module: 'clm', view: 'deployments', deviceId: device.id });
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-muted transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> View Deployments
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync / Pull Current State
              </button>
              <p className="text-[9px] text-muted-foreground text-center pt-1">Deployments are executed from Remediation → Certificates</p>
            </div>
          </div>

          {/* Right — installed certs + drift */}
          <div className="p-4 overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal" /> Installed Certificates
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Live state from device · drift = installed cert not under platform management</p>
              </div>
            </div>

            {device.installedCerts.length === 0 ? (
              <div className="bg-muted/30 border border-border rounded p-4 text-center">
                <p className="text-xs text-muted-foreground">No certificates installed or device unreachable.</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Certificate</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Binding</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Expires</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {device.installedCerts.map((c, i) => (
                      <tr key={i} className="border-b border-border last:border-b-0 hover:bg-secondary/30">
                        <td className="py-2 px-3 text-foreground font-medium">{c.name}</td>
                        <td className="py-2 px-2 text-muted-foreground text-[10px]">{c.binding}</td>
                        <td className="py-2 px-2">
                          <div className="flex flex-col">
                            <span className="text-foreground text-[10px]">{c.expiresOn}</span>
                            <span className={`text-[9px] ${c.daysToExpiry <= 7 ? 'text-coral' : c.daysToExpiry <= 30 ? 'text-amber' : 'text-muted-foreground'}`}>
                              {c.daysToExpiry === 0 ? 'today' : `${c.daysToExpiry}d`}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          {c.drift ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber/10 text-amber">
                              <AlertTriangle className="w-3 h-3" /> {c.drift === 'device-only' ? 'Device-only' : c.drift === 'platform-only' ? 'Platform-only' : 'Mismatch'}
                            </span>
                          ) : c.managedByPlatform ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal/10 text-teal">
                              <CheckCircle2 className="w-3 h-3" /> Managed
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Discovered</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
