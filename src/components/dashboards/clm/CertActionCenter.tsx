import React, { useEffect, useMemo, useState } from 'react';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { computeCRS } from '@/lib/risk/crs';
import { severityHsl, severityFor } from '@/lib/risk/types';
import { useNav } from '@/context/NavigationContext';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/UIComponents';
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  RotateCcw,
  ArrowRightLeft,
  Tag,
  Unlink,
  MessageSquare,
  Settings,
  FileSpreadsheet,
  Layers,
  Clock,
  XCircle,
  Archive,
  ChevronDown,
  Search,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

type CertTab = 'server' | 'client' | 'code-signing';

type ActionModal =
  | 'export'
  | 'download'
  | 'delete'
  | 'change-status'
  | 'assign-group'
  | 'unassign-group'
  | 'add-comments'
  | 'cert-attributes'
  | 'bulk-update'
  | 'update-renew'
  | 'renew'
  | 'revoke'
  | 'ca-switch'
  | 'revocation-check'
  | 'archive'
  | 'regenerate'
  | 'reissue'
  | null;

type CertActionCenterProps = {
  open: boolean;
  severityFilter: string;
  setOpen: (open: boolean) => void;
  setSeverityFilter: (severity: string) => void;
};

type CertRecord = {
  asset: CryptoAsset;
  crs: number;
  severity: string;
  sans: string;
  group: string;
  certStatus: 'Managed' | 'Monitored' | 'Expired';
};

const GROUPS = ['Default', 'Private_CA_Certificates', 'Public_CA_Certificates', 'Certificate-Gateway'];

const REVOKE_REASONS = [
  { value: 'Affiliation Changed', hint: 'Subject is no longer affiliated with the CA issuer' },
  { value: 'Cessation of operation', hint: 'Certificate holder has stopped the relevant operations' },
  { value: 'Key compromise', hint: 'Private key has been or is suspected to be compromised' },
  { value: 'Superseded', hint: 'Certificate has been replaced by a newer certificate' },
  { value: 'CA Compromise', hint: 'The issuing CA has been compromised' },
  { value: 'Privilege Withdrawn', hint: 'Privileges granted to the subject have been withdrawn' },
  { value: 'Unspecified', hint: 'Reason does not fall into any of the above categories' },
];

const CA_OPTIONS = ['DigiCert', 'Entrust', "Let's Encrypt", 'MSCA Enterprise'];
const SCHEDULE_OPTIONS = ['Immediately', 'Next maintenance window', 'Custom'];

let externalOpenSeverityDrill: ((severity: string) => void) | null = null;

export function openSeverityDrill(severity: string) {
  externalOpenSeverityDrill?.(severity);
}

function getStatusBadgeClasses(status: CertRecord['certStatus']) {
  switch (status) {
    case 'Managed':
      return 'bg-teal/10 text-teal border border-teal/20';
    case 'Monitored':
      return 'bg-amber/10 text-amber border border-amber/20';
    case 'Expired':
      return 'bg-coral/10 text-coral border border-coral/20';
  }
}

function getCertStatus(asset: CryptoAsset): CertRecord['certStatus'] {
  if (asset.status === 'Expired') return 'Expired';
  return asset.autoRenewal ? 'Managed' : 'Monitored';
}

function SubModalLayer({ children, open }: { children: React.ReactNode; open: boolean }) {
  if (!open) return null;
  return <div className="relative z-[80]">{children}</div>;
}

function renderRadio(selected: boolean) {
  return (
    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${selected ? 'border-teal' : 'border-border'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-teal' : 'bg-transparent'}`} />
    </span>
  );
}

export function useCertActionCenter() {
  const [open, setOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('');

  const handleOpenSeverityDrill = (severity: string) => {
    setSeverityFilter(severity);
    setOpen(true);
  };

  const BoundCertActionCenter = () => (
    <CertActionCenter
      open={open}
      severityFilter={severityFilter}
      setOpen={setOpen}
      setSeverityFilter={setSeverityFilter}
    />
  );

  return { openSeverityDrill: handleOpenSeverityDrill, CertActionCenter: BoundCertActionCenter };
}

export default function CertActionCenter({ open, severityFilter, setOpen, setSeverityFilter }: CertActionCenterProps) {
  const { setCurrentPage, setFilters } = useNav();
  const [certTab, setCertTab] = useState<CertTab>('server');
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xls'>('csv');
  const [exportColumns, setExportColumns] = useState<'all' | 'displayed'>('all');
  const [downloadType, setDownloadType] = useState<'certs' | 'certs-keys'>('certs');
  const [downloadTruststore, setDownloadTruststore] = useState(false);
  const [newStatus, setNewStatus] = useState('Managed');
  const [statusComment, setStatusComment] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Default');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupComment, setGroupComment] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeComment, setRevokeComment] = useState('');
  const [certComment, setCertComment] = useState('');
  const [renewDays, setRenewDays] = useState(30);
  const [renewCA, setRenewCA] = useState(CA_OPTIONS[0]);
  const [renewSchedule, setRenewSchedule] = useState(SCHEDULE_OPTIONS[0]);
  const [switchCA, setSwitchCA] = useState('Entrust');
  const [revocationCheckComplete, setRevocationCheckComplete] = useState(false);

  const certData = useMemo<CertRecord[]>(() => {
    return mockAssets
      .filter((asset) => asset.type.includes('Certificate'))
      .map((asset) => {
        const { crs } = computeCRS(asset);
        return {
          asset,
          crs,
          severity: severityFor(crs),
          sans: asset.tags.slice(0, 3).join(', ') || asset.commonName,
          group: asset.caIssuer.includes('MSCA')
            ? 'Private_CA_Certificates'
            : asset.caIssuer.includes('DigiCert') || asset.caIssuer.includes('Entrust') || asset.caIssuer.includes("Let's Encrypt")
              ? 'Public_CA_Certificates'
              : 'Default',
          certStatus: getCertStatus(asset),
        };
      });
  }, []);

  const tabFilteredData = useMemo(() => {
    const byTab = certData.filter((record) => {
      if (certTab === 'server') return record.asset.type === 'TLS Certificate' || record.asset.type === 'K8s Workload Cert';
      if (certTab === 'client') return record.asset.type === 'SSH Certificate';
      return record.asset.type === 'Code-Signing Certificate';
    });

    if (!severityFilter) return byTab;

    return byTab.filter((record) => {
      if (severityFilter === 'Critical') return record.crs >= 80;
      if (severityFilter === 'High') return record.crs >= 60 && record.crs < 80;
      if (severityFilter === 'Medium') return record.crs >= 30 && record.crs < 60;
      if (severityFilter === 'Low') return record.crs > 0 && record.crs < 30;
      if (severityFilter === 'Compliant') return record.crs === 0 || (record.asset.policyViolations === 0 && record.crs < 20);
      return true;
    });
  }, [certData, certTab, severityFilter]);

  const filteredGroups = useMemo(
    () => GROUPS.filter((group) => group.toLowerCase().includes(groupSearch.toLowerCase())),
    [groupSearch],
  );

  const allSelected = tabFilteredData.length > 0 && selectedCerts.length === tabFilteredData.length;
  const selectedReasonHint = REVOKE_REASONS.find((reason) => reason.value === revokeReason)?.hint;

  useEffect(() => {
    externalOpenSeverityDrill = (severity: string) => {
      setSeverityFilter(severity);
      setOpen(true);
    };

    return () => {
      externalOpenSeverityDrill = null;
    };
  }, [setOpen, setSeverityFilter]);

  useEffect(() => {
    setSelectedCerts([]);
    setActionsOpen(false);
  }, [certTab, severityFilter]);

  useEffect(() => {
    if (actionModal !== 'revocation-check') {
      setRevocationCheckComplete(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setRevocationCheckComplete(true);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [actionModal]);

  const closeAll = () => {
    setOpen(false);
    setActionsOpen(false);
    setActionModal(null);
  };

  const closeSubModal = () => {
    setActionModal(null);
  };

  const toggleCert = (id: string) => {
    setSelectedCerts((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedCerts([]);
      return;
    }
    setSelectedCerts(tabFilteredData.map((record) => record.asset.id));
  };

  const dropdownItems = [
    [
      { key: 'export', label: 'Export Certificates', icon: FileSpreadsheet, tone: 'text-foreground' },
      { key: 'download', label: 'Download Certificates', icon: Download, tone: 'text-foreground' },
    ],
    [
      { key: 'renew', label: 'Renew Certificate', icon: RefreshCw, tone: 'text-teal' },
      { key: 'regenerate', label: 'Regenerate Certificate', icon: RotateCcw, tone: 'text-teal' },
      { key: 'reissue', label: 'Reissue Certificate', icon: ArrowRightLeft, tone: 'text-teal' },
      { key: 'revoke', label: 'Revoke Certificate', icon: XCircle, tone: 'text-coral' },
      { key: 'ca-switch', label: 'CA Switch', icon: ArrowRightLeft, tone: 'text-foreground' },
      { key: 'revocation-check', label: 'Revocation Check', icon: CheckCircle2, tone: 'text-foreground' },
    ],
    [
      { key: 'change-status', label: 'Change Status', icon: Settings, tone: 'text-foreground' },
      { key: 'assign-group', label: 'Assign Group', icon: Tag, tone: 'text-foreground' },
      { key: 'unassign-group', label: 'Unassign Group', icon: Unlink, tone: 'text-foreground' },
      { key: 'update-renew', label: 'Update Renew Validity', icon: Clock, tone: 'text-foreground' },
      { key: 'add-comments', label: 'Add/Modify Comments', icon: MessageSquare, tone: 'text-foreground' },
      { key: 'bulk-update', label: 'Bulk Update Attributes', icon: Layers, tone: 'text-foreground' },
      { key: 'cert-attributes', label: 'Certificate Attributes', icon: Settings, tone: 'text-foreground' },
    ],
    [{ key: 'archive', label: 'Archive', icon: Archive, tone: 'text-amber' }, { key: 'delete', label: 'Delete', icon: Trash2, tone: 'text-coral' }],
  ] as const;

  const renderFooterButtons = (primary: React.ReactNode, secondaryLabel = 'Cancel') => (
    <div className="flex justify-end gap-2 pt-4 border-t border-border">
      <button onClick={closeSubModal} className="rounded-lg border border-border px-4 py-2 text-xs text-foreground hover:bg-secondary">
        {secondaryLabel}
      </button>
      {primary}
    </div>
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={closeAll} />
        <div className="relative z-[61] flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Severity :: {severityFilter || 'All Certificates'}</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={() => {
                  setFilters({ module: 'clm', filter: 'expiry' });
                  setCurrentPage('remediation');
                  closeAll();
                }}
                className="rounded-lg bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                Remediate
              </button>
              <button onClick={() => toast.success('Exporting...')} className="rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary">
                Export
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <button className="text-muted-foreground hover:text-foreground">‹</button>
                <span>
                  1 to {tabFilteredData.length} of {tabFilteredData.length}
                </span>
                <button className="text-muted-foreground hover:text-foreground">›</button>
              </div>
              <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center border-b border-border px-6">
            {[
              { key: 'server' as const, label: 'Server' },
              { key: 'client' as const, label: 'Client' },
              { key: 'code-signing' as const, label: 'Code Signing' },
            ].map((tabItem) => (
              <button
                key={tabItem.key}
                onClick={() => setCertTab(tabItem.key)}
                className={`border-b-2 px-4 py-3 text-xs font-medium ${certTab === tabItem.key ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <div className="flex items-center gap-3 text-xs text-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="h-3.5 w-3.5 rounded border-border bg-muted text-teal" />
                <span>Select all</span>
              </label>
              {selectedCerts.length > 0 && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal">{selectedCerts.length} selected</span>}
            </div>

            <div className="relative">
              <button
                disabled={selectedCerts.length === 0}
                onClick={() => setActionsOpen((current) => !current)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${selectedCerts.length > 0 ? 'border-border text-foreground hover:bg-secondary' : 'border-border text-muted-foreground opacity-60 cursor-not-allowed'}`}
              >
                Actions
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {actionsOpen && selectedCerts.length > 0 && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
                  {dropdownItems.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      {group.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              setActionModal(item.key as ActionModal);
                              setActionsOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary ${item.tone}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </button>
                        );
                      })}
                      {groupIndex < dropdownItems.length - 1 && <div className="my-1 h-px bg-border" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto scrollbar-thin px-6 py-2">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-8 py-2">&nbsp;</th>
                  <th className="py-2">Common Name</th>
                  <th className="py-2">Subject Alternative Names</th>
                  <th className="py-2">Key Algorithm</th>
                  <th className="py-2">Signature Algorithm</th>
                  <th className="py-2">CRS score</th>
                  <th className="py-2">Quantum</th>
                  <th className="py-2">Group</th>
                  <th className="py-2">Valid To</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tabFilteredData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-xs text-muted-foreground">
                      No certificates match the current filter
                    </td>
                  </tr>
                )}

                {tabFilteredData.map((record) => {
                  const selected = selectedCerts.includes(record.asset.id);
                  const severityColor = severityHsl(record.severity as 'Low' | 'Medium' | 'High' | 'Critical');
                  return (
                    <tr
                      key={record.asset.id}
                      onClick={() => toggleCert(record.asset.id)}
                      className={`cursor-pointer border-b border-border hover:bg-secondary/30 ${selected ? 'bg-teal/5' : ''}`}
                    >
                      <td className="border-b border-border py-3 pr-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCert(record.asset.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-3.5 w-3.5 rounded border-border bg-muted text-teal"
                        />
                      </td>
                      <td className="max-w-[200px] border-b border-border py-3 pr-3 font-mono text-xs text-foreground truncate">{record.asset.commonName}</td>
                      <td className="border-b border-border py-3 pr-3 text-xs text-muted-foreground truncate">{record.sans}</td>
                      <td className="border-b border-border py-3 pr-3 text-xs text-foreground">{record.asset.algorithm}</td>
                      <td className="border-b border-border py-3 pr-3 text-xs text-muted-foreground">{record.asset.algorithm}</td>
                      <td className="border-b border-border py-3 pr-3">
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium"
                          style={{ color: severityColor, borderColor: severityColor, backgroundColor: `${severityColor}1A` }}
                        >
                          CRS {record.crs}
                        </span>
                      </td>
                      <td className="border-b border-border py-3 pr-3">
                        <span title={record.isQuantumVulnerable ? 'Quantum vulnerable' : 'PQC safer profile'}>
                          {record.isQuantumVulnerable ? (
                            <Atom className="h-4 w-4 text-purple-light" />
                          ) : (
                            <Shield className="h-4 w-4 text-teal" />
                          )}
                        </span>
                      </td>
                      <td className="border-b border-border py-3 pr-3 text-xs text-muted-foreground">{record.group}</td>
                      <td className="border-b border-border py-3 pr-3 text-xs tabular-nums text-muted-foreground">{record.asset.expiryDate}</td>
                      <td className="border-b border-border py-3 pr-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${getStatusBadgeClasses(record.certStatus)}`}>
                          {record.certStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-6 py-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-purple/30 bg-gradient-to-r from-purple/20 to-purple/5 p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-purple/15 p-2 text-purple-light">
                  <Atom className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Explore Your PQC Readiness</p>
                  <p className="text-xs text-muted-foreground">Post-quantum threats are real. Begin your certificate readiness checks now.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCurrentPage('quantum-posture');
                  closeAll();
                }}
                className="rounded-lg border border-purple/40 px-3 py-2 text-xs font-medium text-purple-light hover:bg-purple/10"
              >
                Go to Quantum Trust Hub
              </button>
            </div>
          </div>
        </div>
      </div>

      <SubModalLayer open={actionModal === 'export'}>
        <Modal open={actionModal === 'export'} onClose={closeSubModal} title="Export Certificates">
          <div className="space-y-4 text-xs text-foreground">
            <div>
              <p className="mb-1 text-muted-foreground">Group(s):</p>
              <p className="text-muted-foreground">all-certificate-groups</p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Options:</p>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setExportColumns('all')}>
                {renderRadio(exportColumns === 'all')} All Columns
              </label>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setExportColumns('displayed')}>
                {renderRadio(exportColumns === 'displayed')} Displayed Columns
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Format:</p>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setExportFormat('csv')}>
                {renderRadio(exportFormat === 'csv')} CSV
              </label>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setExportFormat('xls')}>
                {renderRadio(exportFormat === 'xls')} XLS
              </label>
            </div>
            <p className="italic text-muted-foreground">Exporting all certificates may take considerable time.</p>
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success('Exporting certificates as ' + exportFormat);
                  closeSubModal();
                }}
                className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                Export
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'download'}>
        <Modal open={actionModal === 'download'} onClose={closeSubModal} title="Download Certificate">
          <div className="space-y-4 text-xs text-foreground">
            <div className="space-y-2">
              <p className="text-muted-foreground">Choose Download Type:</p>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setDownloadType('certs')}>
                {renderRadio(downloadType === 'certs')} Certificates Only
              </label>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => setDownloadType('certs-keys')}>
                {renderRadio(downloadType === 'certs-keys')} Certificates and Keys
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
              <span>Download Truststore Certificates:</span>
              <button
                onClick={() => setDownloadTruststore((current) => !current)}
                className={`relative h-5 w-9 rounded-full transition-colors ${downloadTruststore ? 'bg-teal' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${downloadTruststore ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success('Downloading certificates');
                  closeSubModal();
                }}
                className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                Download
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'delete'}>
        <Modal open={actionModal === 'delete'} onClose={closeSubModal} title="Delete Certificate">
          <div className="space-y-4 text-xs text-foreground">
            <div className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-coral">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <p>Are you sure you want to delete the selected {selectedCerts.length} certificate(s)? This action cannot be undone.</p>
              </div>
            </div>
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success(selectedCerts.length + ' certificate(s) deleted');
                  setSelectedCerts([]);
                  closeSubModal();
                }}
                className="rounded-lg bg-coral px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Yes, Delete
              </button>,
              'No, Cancel',
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'change-status'}>
        <Modal open={actionModal === 'change-status'} onClose={closeSubModal} title="Change Status">
          <div className="space-y-4 text-xs text-foreground">
            <div>
              <label className="mb-1 block text-muted-foreground">Change Status to:</label>
              <select value={newStatus} onChange={(event) => setNewStatus(event.target.value)} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground">
                <option>Managed</option>
                <option>Monitored</option>
              </select>
            </div>
            <p className="text-muted-foreground">Changing status may impact existing workflows and automation rules.</p>
            <div>
              <label className="mb-1 block text-muted-foreground">Comments:</label>
              <textarea value={statusComment} onChange={(event) => setStatusComment(event.target.value)} rows={3} placeholder="Add a comment..." className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground" />
            </div>
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success('Status changed to ' + newStatus);
                  closeSubModal();
                }}
                className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                Yes
              </button>,
              'No',
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'assign-group'}>
        <Modal open={actionModal === 'assign-group'} onClose={closeSubModal} title="Assign to Group">
          <div className="space-y-4 text-xs text-foreground">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input value={groupSearch} onChange={(event) => setGroupSearch(event.target.value)} placeholder="Search..." className="w-full rounded border border-border bg-muted py-2 pl-8 pr-3 text-xs text-foreground" />
            </div>
            <p className="font-semibold text-foreground">Selected Group: {selectedGroup}</p>
            <div className="space-y-2 rounded-lg border border-border p-2">
              {filteredGroups.map((group) => (
                <button key={group} onClick={() => setSelectedGroup(group)} className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-secondary">
                  <span>{group}</span>
                  {selectedGroup === group ? <CheckCircle2 className="h-4 w-4 text-teal" /> : <span className="h-4 w-4 rounded-full border border-border" />}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground">Comments:</label>
              <textarea value={groupComment} onChange={(event) => setGroupComment(event.target.value)} rows={2} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground" />
            </div>
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success('Assigned to ' + selectedGroup);
                  closeSubModal();
                }}
                className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                Assign
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'unassign-group'}>
        <Modal open={actionModal === 'unassign-group'} onClose={closeSubModal} title="Unassign Group">
          <div className="space-y-4 text-xs text-foreground">
            <p className="text-muted-foreground">Remove certificate(s) from current group?</p>
            <p className="text-muted-foreground">This will move certificates to the Default group.</p>
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success('Certificates unassigned from group');
                  closeSubModal();
                }}
                className="rounded-lg bg-amber px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Unassign
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'add-comments'}>
        <Modal open={actionModal === 'add-comments'} onClose={closeSubModal} title="Add / Modify Comments">
          <div className="space-y-4 text-xs text-foreground">
            <textarea value={certComment} onChange={(event) => setCertComment(event.target.value)} rows={4} placeholder="Enter comments for selected certificate(s)..." className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground" />
            {renderFooterButtons(
              <button
                onClick={() => {
                  toast.success('Comments updated');
                  closeSubModal();
                }}
                className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                Save
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'cert-attributes'}>
        <Modal open={actionModal === 'cert-attributes'} onClose={closeSubModal} title="Certificate Attributes">
          <div className="space-y-4 text-xs text-foreground">
            <p className="text-muted-foreground">View and edit custom attributes for selected certificates.</p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <tbody>
                  {[
                    ['Owner', 'Security Team'],
                    ['Environment', 'Production'],
                    ['Business Unit', 'Payments'],
                  ].map(([key, value]) => (
                    <tr key={key} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{key}</td>
                      <td className="px-3 py-2 text-foreground">{value}</td>
                      <td className="px-3 py-2 text-right text-teal">edit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="text-xs font-medium text-teal hover:underline">+ Add Attribute</button>
            {renderFooterButtons(
              <button onClick={() => { toast.success('Attributes updated'); closeSubModal(); }} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                Save
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'bulk-update'}>
        <Modal open={actionModal === 'bulk-update'} onClose={closeSubModal} title="Bulk Update Attributes Value">
          <div className="space-y-4 text-xs text-foreground">
            <div className="rounded-lg border border-amber/30 bg-amber/10 p-3 text-xs text-foreground">
              Review the certificate attribute and expiry configuration mapping to prevent errors. Ensure no updates are made to certificate attributes involved in an expiry alert.
            </div>
            <button className="text-xs font-medium text-teal hover:underline">Download Failed Updates</button>
            <div className="space-y-2">
              <p className="text-muted-foreground">Update Method:</p>
              <label className="flex items-center gap-2 cursor-pointer">{renderRadio(true)} File Upload</label>
              <label className="flex items-center gap-2 cursor-pointer">{renderRadio(false)} Based on Certificate Group</label>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground">
              Update Certificate Attributes Value by downloading template as CSV, modifying and re-importing
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary">
                <Download className="h-3.5 w-3.5" /> Download Template
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-muted-foreground">Upload File:</label>
              <div className="flex items-center gap-2">
                <input type="file" className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-muted-foreground" />
                <button className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              </div>
            </div>
            {renderFooterButtons(
              <button onClick={() => { toast.success('Bulk attribute update saved'); closeSubModal(); }} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                Save
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'update-renew'}>
        <Modal open={actionModal === 'update-renew'} onClose={closeSubModal} title="Update Renew Validity">
          <div className="space-y-4 text-xs text-foreground">
            <div>
              <label className="mb-1 block text-muted-foreground">Renew X days before expiry:</label>
              <input type="number" value={renewDays} min={1} max={365} onChange={(event) => setRenewDays(Number(event.target.value))} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground" />
            </div>
            <p className="text-muted-foreground">Certificates will be automatically renewed this many days before their expiry date.</p>
            {renderFooterButtons(
              <button onClick={() => { toast.success('Renew validity updated'); closeSubModal(); }} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                Save
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'renew' || actionModal === 'regenerate' || actionModal === 'reissue'}>
        <Modal
          open={actionModal === 'renew' || actionModal === 'regenerate' || actionModal === 'reissue'}
          onClose={closeSubModal}
          title={actionModal === 'regenerate' ? 'Regenerate Certificate' : actionModal === 'reissue' ? 'Reissue Certificate' : 'Renew Certificate'}
        >
          <div className="space-y-4 text-xs text-foreground">
            <p className="font-semibold text-foreground">
              {actionModal === 'regenerate' ? 'Regenerate' : actionModal === 'reissue' ? 'Reissue' : 'Renew'} {selectedCerts.length} certificate(s)
            </p>
            <div>
              <label className="mb-1 block text-muted-foreground">Certificate Authority:</label>
              <select value={renewCA} onChange={(event) => setRenewCA(event.target.value)} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground">
                {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground">Schedule:</label>
              <select value={renewSchedule} onChange={(event) => setRenewSchedule(event.target.value)} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground">
                {SCHEDULE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-teal/30 bg-teal/10 p-3 text-teal">
              Renewal will use the same key pair and certificate template as the original.
            </div>
            {renderFooterButtons(
              <button
                onClick={() => {
                  const verb = actionModal === 'regenerate' ? 'Regeneration' : actionModal === 'reissue' ? 'Reissue' : 'Renewal';
                  toast.success(verb + ' initiated for ' + selectedCerts.length + ' certificate(s)');
                  closeSubModal();
                }}
                className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light"
              >
                {actionModal === 'regenerate' ? 'Regenerate' : actionModal === 'reissue' ? 'Reissue' : 'Renew'}
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'revoke'}>
        <Modal open={actionModal === 'revoke'} onClose={closeSubModal} title="Certificate Revoke">
          <div className="space-y-4 text-xs text-foreground">
            <div>
              <label className="mb-1 block text-muted-foreground">
                <span className="text-coral">*</span> Reason:
              </label>
              <select value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground">
                <option value="">--- Please select ---</option>
                {REVOKE_REASONS.map((reason) => <option key={reason.value}>{reason.value}</option>)}
              </select>
              {selectedReasonHint && <p className="mt-1 text-[10px] italic text-muted-foreground">{selectedReasonHint}</p>}
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground">Comments:</label>
              <textarea value={revokeComment} onChange={(event) => setRevokeComment(event.target.value)} rows={3} placeholder="Please revoke the certificate indicating the reason. Already Revoked/expired certificates and certificates with existing active workflows will be skipped." className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground" />
            </div>
            {!revokeReason && <p className="text-xs text-coral">Selected Certificate(s) may not be eligible for revocation. Please verify.</p>}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button onClick={closeSubModal} className="rounded-lg border border-border px-4 py-2 text-xs text-foreground hover:bg-secondary">Close</button>
              <button disabled={!revokeReason} onClick={() => { toast.success('Revocation submitted: ' + revokeReason); closeSubModal(); }} className={`rounded-lg px-4 py-2 text-xs font-medium text-primary-foreground ${revokeReason ? 'bg-teal hover:bg-teal-light' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                Submit
              </button>
            </div>
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'ca-switch'}>
        <Modal open={actionModal === 'ca-switch'} onClose={closeSubModal} title="CA Switch">
          <div className="space-y-4 text-xs text-foreground">
            <div>
              <p className="text-muted-foreground">Current CA:</p>
              <p className="mt-1 text-foreground">DigiCert</p>
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground">Switch to:</label>
              <select value={switchCA} onChange={(event) => setSwitchCA(event.target.value)} className="w-full rounded border border-border bg-muted px-3 py-2 text-xs text-foreground">
                {CA_OPTIONS.filter((option) => option !== 'DigiCert').map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <p className="text-muted-foreground">Switching CA will initiate a new certificate request with the selected CA. Existing certificate remains active until new one is issued.</p>
            {renderFooterButtons(
              <button onClick={() => { toast.success('CA switch initiated'); closeSubModal(); }} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                Switch CA
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'revocation-check'}>
        <Modal open={actionModal === 'revocation-check'} onClose={closeSubModal} title="Revocation Check">
          <div className="space-y-4 text-xs text-foreground">
            <p className="text-muted-foreground">Checking revocation status for {selectedCerts.length} certificate(s)...</p>
            {!revocationCheckComplete && <div className="h-2 w-full animate-pulse rounded bg-teal/20" />}
            {revocationCheckComplete && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-teal"><CheckCircle2 className="h-4 w-4" /> {selectedCerts.length} of {selectedCerts.length} certificates: Valid</div>
                <div className="text-muted-foreground">0 of {selectedCerts.length} certificates: Revoked</div>
                <div className="text-amber">0 of {selectedCerts.length} certificates: Unknown</div>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-border">
              <button onClick={closeSubModal} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Close</button>
            </div>
          </div>
        </Modal>
      </SubModalLayer>

      <SubModalLayer open={actionModal === 'archive'}>
        <Modal open={actionModal === 'archive'} onClose={closeSubModal} title="Archive Certificates">
          <div className="space-y-4 text-xs text-foreground">
            <p className="font-semibold text-foreground">Archive {selectedCerts.length} certificate(s)?</p>
            <p className="text-muted-foreground">Archived certificates will be moved out of active inventory. They can be restored later.</p>
            {renderFooterButtons(
              <button onClick={() => { toast.success(selectedCerts.length + ' certificate(s) archived'); closeSubModal(); }} className="rounded-lg bg-amber px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                Archive
              </button>,
            )}
          </div>
        </Modal>
      </SubModalLayer>
    </>
  );
}