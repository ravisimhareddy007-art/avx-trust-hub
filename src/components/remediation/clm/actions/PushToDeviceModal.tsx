import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';
import {
  useCertificateWorkflow,
  type PushCertType,
  type WorkOrderStatus,
} from '@/context/CertificateWorkflowContext';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  initialCertificateId?: string;
}

type ModalTab = PushCertType | 'Process Explorer';

const tabs: ModalTab[] = ['Server', 'Client', 'Intermediate', 'Root', 'Process Explorer'];

const serverCertificates = mockAssets.filter((asset): asset is CryptoAsset => asset.type === 'TLS Certificate');
const clientCertificates = serverCertificates.filter((asset) => asset.tags.includes('internal') || asset.tags.includes('authentication'));
const intermediateCertificates = serverCertificates.slice(0, 8);
const rootCertificates = serverCertificates.slice(2, 10);

function statusMeta(asset: CryptoAsset): { dot: string; badge: string; label: string } {
  if (asset.tags.includes('push-failed')) return { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground', label: 'Push Failed' };
  if (asset.status === 'Revoked') return { dot: 'bg-foreground', badge: 'bg-foreground/10 text-foreground', label: 'Revoked' };
  if (asset.status === 'Expired') return { dot: 'bg-coral', badge: 'bg-coral/10 text-coral', label: 'Expired' };
  if (asset.daysToExpiry <= 10) return { dot: 'bg-warning-strong', badge: 'bg-warning-strong/10 text-warning-strong', label: 'Expires 10d' };
  if (asset.daysToExpiry <= 30) return { dot: 'bg-amber', badge: 'bg-amber/10 text-amber', label: 'Expires 30d' };
  if (asset.daysToExpiry <= 90) return { dot: 'bg-info', badge: 'bg-info/10 text-info', label: 'Expires 90d' };
  return { dot: 'bg-teal', badge: 'bg-teal/10 text-teal', label: 'Valid' };
}

function statusBadgeClass(status: WorkOrderStatus) {
  if (status === 'Completed') return 'bg-teal/10 text-teal';
  if (status === 'Approved') return 'bg-info/10 text-info';
  if (status === 'Push Failed') return 'bg-muted text-muted-foreground';
  if (status === 'Push-Review In Progress') return 'bg-amber/10 text-amber';
  return 'bg-purple/10 text-purple';
}

export default function PushToDeviceModal({ open, onClose, initialCertificateId }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const { operations, setSelection } = useCertificateWorkflow();
  const [activeTab, setActiveTab] = useState<ModalTab>('Server');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isMultiSelect = activeTab === 'Intermediate' || activeTab === 'Root';

  const certificates = useMemo(() => {
    const source = activeTab === 'Server'
      ? serverCertificates
      : activeTab === 'Client'
        ? clientCertificates
        : activeTab === 'Intermediate'
          ? intermediateCertificates
          : activeTab === 'Root'
            ? rootCertificates
            : [];

    const query = search.toLowerCase();
    return source.filter((asset) => {
      if (!query) return true;
      return asset.commonName.toLowerCase().includes(query) || asset.caIssuer.toLowerCase().includes(query);
    });
  }, [activeTab, search]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('Server');
    setSearch('');
    if (initialCertificateId) {
      setSelectedIds([initialCertificateId]);
      return;
    }
    setSelectedIds(serverCertificates[0] ? [serverCertificates[0].id] : []);
  }, [open, initialCertificateId]);

  useEffect(() => {
    if (activeTab === 'Process Explorer') return;
    if (isMultiSelect) {
      setSelectedIds((current) => current.filter((id) => certificates.some((certificate) => certificate.id === id)));
      return;
    }
    setSelectedIds((current) => {
      const firstValid = current.find((id) => certificates.some((certificate) => certificate.id === id));
      return firstValid ? [firstValid] : certificates[0] ? [certificates[0].id] : [];
    });
  }, [activeTab, certificates, isMultiSelect]);

  if (!open) return null;

  const toggleSelect = (certificateId: string) => {
    if (!isMultiSelect) {
      setSelectedIds([certificateId]);
      return;
    }

    setSelectedIds((current) => current.includes(certificateId)
      ? current.filter((id) => id !== certificateId)
      : [...current, certificateId]);
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? certificates.map((certificate) => certificate.id) : []);
  };

  const goToCertificate = (certificateId: string, certType: PushCertType) => {
    setSelection(selectedIds.length > 0 ? selectedIds : [certificateId], certType);
    setFilters({
      certificateId,
      certificateIds: (selectedIds.length > 0 ? selectedIds : [certificateId]).join(','),
      certType,
    });
    setCurrentPage('cert-holistic-view');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close push to device" />
      <div className="relative z-10 flex h-[82vh] w-[720px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Push Certificate to Device</h2>
            <button type="button" onClick={onClose} className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-background/40 p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', activeTab === tab ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'Process Explorer' ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search request ID, CN, or connector" className="pl-8" />
            </div>
            <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-background/20">
              <ScrollArea className="h-full">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Request ID</th>
                      <th className="px-4 py-3">Common Name</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Connector</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations
                      .filter((row) => {
                        const query = search.toLowerCase();
                        return !query || [row.requestId, row.commonName, row.connectorName, row.action].some((value) => value.toLowerCase().includes(query));
                      })
                      .map((row) => (
                        <tr
                          key={row.requestId}
                          className="cursor-pointer border-b border-border last:border-b-0 hover:bg-background/30"
                          onClick={() => {
                            setFilters({ requestId: row.requestId, certificateId: row.certificateId, certType: row.certType });
                            setCurrentPage('work-order-status');
                            onClose();
                          }}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{row.requestId}</td>
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{row.commonName}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{row.action}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{row.connectorName}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', statusBadgeClass(row.status))}>{row.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{row.created}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{row.lastUpdated}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search certificates" className="pl-8" />
            </div>

            {isMultiSelect && (
              <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-background/30 px-3 py-2">
                <span className="text-xs font-medium text-foreground">Select All</span>
                <Checkbox
                  checked={certificates.length > 0 && selectedIds.length === certificates.length}
                  onCheckedChange={(value) => selectAll(Boolean(value))}
                />
              </div>
            )}

            <ScrollArea className="min-h-0 flex-1 pr-2">
              <div className="space-y-2">
                {certificates.map((certificate) => {
                  const meta = statusMeta(certificate);
                  const selected = selectedIds.includes(certificate.id);
                  return (
                    <button
                      key={certificate.id}
                      type="button"
                      onClick={() => toggleSelect(certificate.id)}
                      className={cn('w-full rounded-lg border px-3 py-3 text-left transition-colors', selected ? 'border-teal bg-teal/5' : 'border-border bg-background/20 hover:bg-background/30')}
                    >
                      <div className="flex items-start gap-3">
                        {isMultiSelect ? (
                          <Checkbox checked={selected} onCheckedChange={() => toggleSelect(certificate.id)} className="mt-0.5" />
                        ) : (
                          <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', meta.dot)} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate font-mono text-xs text-foreground">{certificate.commonName}</p>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', meta.badge)}>
                              {certificate.daysToExpiry >= 0 ? `${certificate.daysToExpiry}d` : meta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{certificate.caIssuer}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            disabled={activeTab === 'Process Explorer' || selectedIds.length === 0}
            onClick={() => goToCertificate(selectedIds[0], activeTab as PushCertType)}
            className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light disabled:pointer-events-none disabled:opacity-50"
          >
            Go to Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
