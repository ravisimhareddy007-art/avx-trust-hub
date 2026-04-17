import React, { useState } from 'react';
import { mockDevices, OnboardedDevice } from '@/data/deviceMockData';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { X, Search, CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  cert?: CryptoAsset | null;          // when launched from cert detail
  device?: OnboardedDevice | null;    // when launched from device detail
}

/**
 * Unified deploy modal.
 *  - From cert: pick devices.
 *  - From device: pick a cert.
 */
export default function DeployToDeviceModal({ open, onClose, cert, device }: Props) {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(device ? [device.id] : []);
  const [selectedCertId, setSelectedCertId] = useState<string>(cert?.id || '');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [restartService, setRestartService] = useState(false);
  const [search, setSearch] = useState('');

  if (!open) return null;

  const eligibleDevices = mockDevices.filter(d =>
    d.health !== 'connection-failed' &&
    (!search || d.name.toLowerCase().includes(search.toLowerCase()) || d.hostFqdn.toLowerCase().includes(search.toLowerCase()))
  );

  const eligibleCerts = mockAssets.filter(a =>
    a.type === 'TLS Certificate' &&
    (!search || a.name.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = () => {
    const certName = cert?.name || mockAssets.find(a => a.id === selectedCertId)?.name || 'certificate';
    const targetCount = selectedDeviceIds.length;
    if (!certName || targetCount === 0) {
      toast.error('Select a certificate and at least one target device');
      return;
    }
    const depId = `DEP-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    toast.success(`Deployment ${depId} started — ${certName} → ${targetCount} device${targetCount > 1 ? 's' : ''}`, {
      description: `Tracked in Remediation → Certificates → Deployments. ${replaceExisting ? 'Replacing binding' : 'New binding'}${restartService ? ' · restart enabled' : ''}.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-[640px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 border-b border-border px-5 py-3 flex items-center justify-between rounded-t-xl">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Deploy certificate to device</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Push & install — creates a Cert+ deployment workflow</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step: certificate */}
          <div>
            <p className="text-[10px] font-semibold text-foreground mb-1.5 uppercase tracking-wide">1 — Certificate</p>
            {cert ? (
              <div className="bg-muted/40 border border-border rounded p-2.5">
                <p className="text-xs font-medium text-foreground">{cert.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {cert.algorithm} · Issued by {cert.caIssuer} · Expires {cert.expiryDate}
                </p>
              </div>
            ) : (
              <select
                value={selectedCertId}
                onChange={e => setSelectedCertId(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
              >
                <option value="">Select a certificate...</option>
                {eligibleCerts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.algorithm}</option>
                ))}
              </select>
            )}
          </div>

          {/* Step: target devices */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-foreground uppercase tracking-wide">2 — Target devices</p>
              <span className="text-[10px] text-muted-foreground">{selectedDeviceIds.length} selected</span>
            </div>
            {!device && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filter devices..."
                  className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
            )}
            <div className="border border-border rounded max-h-48 overflow-y-auto scrollbar-thin">
              {eligibleDevices.map(d => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDeviceIds.includes(d.id)}
                    onChange={() => toggleDevice(d.id)}
                    className="w-3 h-3 accent-teal"
                  />
                  <Server className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{d.type} · {d.hostFqdn} · {d.environment}</p>
                  </div>
                  {d.health === 'healthy' ? (
                    <CheckCircle2 className="w-3 h-3 text-teal flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Step: deployment config */}
          <div>
            <p className="text-[10px] font-semibold text-foreground mb-1.5 uppercase tracking-wide">3 — Deployment config</p>
            <div className="space-y-2 bg-muted/30 border border-border rounded p-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="binding" checked={replaceExisting} onChange={() => setReplaceExisting(true)} className="w-3 h-3 accent-teal" />
                <span className="text-foreground">Replace existing certificate on matching binding</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="radio" name="binding" checked={!replaceExisting} onChange={() => setReplaceExisting(false)} className="w-3 h-3 accent-teal" />
                <span className="text-foreground">Create new binding</span>
              </label>
              <div className="border-t border-border pt-2 mt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={restartService} onChange={e => setRestartService(e.target.checked)} className="w-3 h-3 accent-teal" />
                  <span className="text-foreground">Restart service after install</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex items-center justify-end gap-2 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedDeviceIds.length === 0 || (!cert && !selectedCertId)}
            className="px-4 py-2 text-xs font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Deployment Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
