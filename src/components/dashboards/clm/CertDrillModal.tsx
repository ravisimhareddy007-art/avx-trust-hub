import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Layers,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Tag,
  Trash2,
  Unlink,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/UIComponents';
import { computeCRS } from '@/lib/risk/crs';
import { type CryptoAsset } from '@/data/mockData';

type ApprovalAction = 'renew' | 'revoke' | null;
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
  | 'regenerate'
  | 'reissue'
  | 'revoke'
  | 'ca-switch'
  | 'revocation-check'
  | 'archive'
  | null;

type CertTab = 'server' | 'client' | 'code-signing';
type ScoredCert = CryptoAsset & { crs: number };
type InputCert = CryptoAsset | ScoredCert;
type ColumnKey = (typeof COLUMN_OPTIONS)[number]['key'];

interface CertDrillModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  certs: InputCert[];
}

const COLUMN_OPTIONS = [
  { key: 'commonName', label: 'Common Name', required: true, defaultVisible: true },
  { key: 'serialNumber', label: 'Serial Number', defaultVisible: true },
  { key: 'group', label: 'Group', defaultVisible: true },
  { key: 'issuerCommonName', label: 'Issuer Common Name', defaultVisible: true },
  { key: 'validTo', label: 'Valid To (GMT)', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'certificateAuthority', label: 'Certificate Authority', defaultVisible: true },
  { key: 'kubeAttributes', label: 'Kube Attributes', defaultVisible: true },
  { key: 'quantumReadiness', label: 'Quantum Readiness', defaultVisible: true },
  { key: 'subjectOrganizationUnit', label: 'Subject Organization Unit' },
  { key: 'subjectLocality', label: 'Subject Locality' },
  { key: 'subjectState', label: 'Subject State' },
  { key: 'subjectCountry', label: 'Subject Country' },
  { key: 'issuerOrganization', label: 'Issuer Organization' },
  { key: 'issuerOrganizationUnit', label: 'Issuer Organization Unit' },
  { key: 'issuerLocality', label: 'Issuer Locality' },
  { key: 'issuerState', label: 'Issuer State' },
  { key: 'issuerCountry', label: 'Issuer Country' },
  { key: 'version', label: 'Version' },
  { key: 'validFrom', label: 'Valid From (GMT)' },
  { key: 'keyAlgorithmSize', label: 'Key Algorithm & Size' },
  { key: 'signatureAlgorithm', label: 'Signature Algorithm' },
  { key: 'keyUsages', label: 'Key Usage(s)' },
  { key: 'extendedKeyUsages', label: 'Extended Key Usage(s)' },
  { key: 'basicConstraints', label: 'Basic Constraints' },
  { key: 'associatedObject', label: 'Associated Object' },
  { key: 'applications', label: 'Application(s)' },
  { key: 'subjectAlternativeNames', label: 'Subject Alternative Names' },
  { key: 'compliant', label: 'Compliant' },
  { key: 'discoveredFileNames', label: 'Discovered File Name(s)' },
  { key: 'renewDate', label: 'Renew Date' },
  { key: 'validFor', label: 'Valid For' },
  { key: 'requestId', label: 'Request ID' },
  { key: 'subjectEmailAddress', label: 'Subject Email Address' },
  { key: 'comments', label: 'Comments' },
  { key: 'orderId', label: 'Order ID' },
  { key: 'countOfSubjectAltNames', label: 'Count Of Subject Altern Names' },
  { key: 'reenrollDate', label: 'Re-enroll Date' },
  { key: 'regenerateDate', label: 'Regenerate Date' },
  { key: 'thumbprint', label: 'Thumbprint' },
  { key: 'subjectKeyIdentifier', label: 'Subject Key Identifier' },
  { key: 'discoverySource', label: 'Discovery Source' },
  { key: 'subjectOrganization', label: 'Subject Organization' },
] as const;

const DEFAULT_VISIBLE_COLUMNS = COLUMN_OPTIONS.reduce<ColumnKey[]>((acc, column) => {
  if ((('defaultVisible' in column) && column.defaultVisible) || (('required' in column) && column.required)) {
    acc.push(column.key);
  }
  return acc;
}, []);

const GROUPS = ['Default', 'Private_CA_Certificates', 'Public_CA_Certificates', 'Certificate-Gateway'];
const CA_OPTIONS = [
  'Amazon', 'Amazon Private CA', 'AppViewX', 'AppViewX PKIaaS NDES', 'CSC Global', 'DigiCert', 'Ejbca', 'Entrust',
  'Entrust MPKI', 'GlobalSign', 'GlobalSign Atlas', 'GlobalSign MSSL', 'GoDaddy', 'Google', 'HashiCorp Vault',
  'HydrantID', "Let's Encrypt", 'Microsoft Enterprise', 'Nexus', 'OpenTrust', 'SwissSign', 'Trustwave', 'XCA Test Issuer', 'Sectigo', 'OTHERS',
] as const;
const REVOKE_REASONS = [
  { value: 'Affiliation Changed', hint: 'Subject no longer affiliated with issuer' },
  { value: 'Cessation of operation', hint: 'Certificate holder stopped relevant operations' },
  { value: 'Key compromise', hint: 'Private key is suspected compromised' },
  { value: 'Superseded', hint: 'Replaced by a newer certificate' },
  { value: 'CA Compromise', hint: 'The issuing CA has been compromised' },
  { value: 'Privilege Withdrawn', hint: 'Granted privileges have been withdrawn' },
  { value: 'Unspecified', hint: 'Reason does not fall into other categories' },
] as const;

function getStatusTone(status: CryptoAsset['status']) {
  if (status === 'Expired') return 'hsl(var(--coral))';
  if (status === 'Expiring') return 'hsl(var(--amber))';
  if (status === 'Orphaned') return 'hsl(var(--purple))';
  if (status === 'Pending') return 'hsl(210 80% 56%)';
  return 'hsl(var(--teal))';
}

function getSignatureAlgorithm(algorithm: string) {
  if (algorithm.includes('RSA')) return 'sha256WithRSAEncryption';
  if (algorithm.includes('ECC') || algorithm.includes('Ed25519')) return 'ecdsa-with-SHA384';
  if (algorithm.includes('AES')) return 'aes256-gcm';
  return 'sha256';
}

function getGroupLabel(cert: CryptoAsset) {
  return /MSCA|Enterprise|Internal|Istio/i.test(cert.caIssuer) ? 'Private_CA_Certificates' : 'Public_CA_Certificates';
}

function getDisplayStatus(status: CryptoAsset['status']) {
  if (status === 'Active') return 'Healthy';
  return status;
}

function getValidTo(cert: CryptoAsset) {
  if (cert.expiryDate && cert.expiryDate !== 'N/A') return cert.expiryDate;
  const base = new Date();
  base.setDate(base.getDate() + cert.daysToExpiry);
  return base.toISOString().slice(0, 10);
}

export default function CertDrillModal({ open, onClose, title, certs }: CertDrillModalProps) {
  const [certTab, setCertTab] = useState<CertTab>('server');
  const [selected, setSelected] = useState<string[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>(null);
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalDecisionOpen, setApprovalDecisionOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeComment, setRevokeComment] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xls'>('csv');
  const [downloadType, setDownloadType] = useState<'certs' | 'keys'>('certs');
  const [downloadTruststore, setDownloadTruststore] = useState(false);
  const [newStatus, setNewStatus] = useState('Managed');
  const [statusComment, setStatusComment] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('Default');
  const [groupSearch, setGroupSearch] = useState('');
  const [comments, setComments] = useState('');
  const [renewDays, setRenewDays] = useState(30);
  const [renewCa, setRenewCa] = useState('DigiCert');
  const [renewSchedule, setRenewSchedule] = useState<'Immediately' | 'Next maintenance window'>('Immediately');
  const [regenerateKeyType, setRegenerateKeyType] = useState('RSA-4096');
  const [reissueReason, setReissueReason] = useState('');
  const [switchCa, setSwitchCa] = useState('Entrust');
  const [bulkUpdateMode, setBulkUpdateMode] = useState<'File Upload' | 'By Group'>('File Upload');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [draftSelectedColumns, setDraftSelectedColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [previousSelectedColumns, setPreviousSelectedColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [revocationDone, setRevocationDone] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (open && certs.length === 0) {
      toast.info('No certificates match this filter');
      onClose();
    }
  }, [certs.length, onClose, open]);

  const scoredCerts = useMemo<ScoredCert[]>(() => certs.map((cert) => {
    const scored = cert as ScoredCert;
    return typeof scored.crs === 'number' ? scored : { ...(cert as CryptoAsset), crs: computeCRS(cert as CryptoAsset).crs };
  }), [certs]);

  const tabCerts = useMemo(
    () => scoredCerts.filter((a) =>
      certTab === 'server'
        ? a.type === 'TLS Certificate' || a.type === 'K8s Workload Cert'
        : certTab === 'client'
          ? a.type === 'SSH Certificate'
          : a.type === 'Code-Signing Certificate'
    ),
    [certTab, scoredCerts]
  );

  const filteredGroups = useMemo(
    () => GROUPS.filter((group) => group.toLowerCase().includes(groupSearch.toLowerCase())),
    [groupSearch]
  );

  const visibleColumns = useMemo(
    () => COLUMN_OPTIONS.filter((column) => selectedColumns.includes(column.key)),
    [selectedColumns]
  );

  const filteredColumnOptions = useMemo(
    () => COLUMN_OPTIONS.filter((column) => column.label.toLowerCase().includes(columnSearch.toLowerCase())),
    [columnSearch]
  );

  const selectedCerts = useMemo(
    () => tabCerts.filter((cert) => selected.includes(cert.id)),
    [selected, tabCerts]
  );

  const approvalRows = useMemo(() => {
    const term = approvalSearch.trim().toLowerCase();
    if (!term) return selectedCerts;
    return selectedCerts.filter((cert) =>
      [cert.commonName, cert.serial, cert.caIssuer, cert.name].some((value) => value.toLowerCase().includes(term))
    );
  }, [approvalSearch, selectedCerts]);

  useEffect(() => {
    if (!open) {
      setCertTab('server');
      setSelected([]);
      setActionsOpen(false);
      setActionModal(null);
      setApprovalAction(null);
      setApprovalSearch('');
      setApprovalDecisionOpen(false);
      setColumnsOpen(false);
      setColumnSearch('');
      setDraftSelectedColumns(selectedColumns);
      return;
    }
    setSelected([]);
    setCertTab('server');
    setActionsOpen(false);
    setActionModal(null);
    setApprovalAction(null);
  }, [open]);

  useEffect(() => {
    if (!actionsOpen) return;
    const rect = actionsButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        actionsButtonRef.current &&
        !actionsButtonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionsOpen]);

  useEffect(() => {
    if (actionModal !== 'revocation-check') {
      setRevocationDone(false);
      return;
    }
    const timer = window.setTimeout(() => setRevocationDone(true), 1500);
    return () => window.clearTimeout(timer);
  }, [actionModal]);

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleColumn(columnKey: ColumnKey) {
    const option = COLUMN_OPTIONS.find((column) => column.key === columnKey);
    if (!option) return;
    if ('required' in option && option.required) return;
    setDraftSelectedColumns((prev) => prev.includes(columnKey) ? prev.filter((key) => key !== columnKey) : [...prev, columnKey]);
  }

  function selectAll() {
    if (selected.length === tabCerts.length) {
      setSelected([]);
      return;
    }
    setSelected(tabCerts.map((a) => a.id));
  }

  function closeActionModal() {
    setActionModal(null);
    setRevokeReason('');
    setRevokeComment('');
  }

  function closeApprovalModal() {
    setApprovalAction(null);
    setApprovalSearch('');
    setApprovalDecisionOpen(false);
  }

  function handleSuccess(message: string, opts?: { clearSelection?: boolean; closeDrill?: boolean }) {
    toast.success(message);
    if (opts?.clearSelection !== false) setSelected([]);
    setActionModal(null);
    if (opts?.closeDrill) onClose();
  }

  const getOrderId = (cert: CryptoAsset) => `R${cert.id.replace(/\D/g, '').padStart(5, '0')}`;
  const getThumbprint = (cert: CryptoAsset) => cert.serial.replace(/:/g, '').padEnd(20, '0').slice(0, 20);
  const getValidFrom = (cert: CryptoAsset) => cert.issueDate || '2026-01-01';
  const getKubeAttributes = (cert: CryptoAsset) => cert.type === 'K8s Workload Cert' ? 'namespace=prod; workload=managed' : '—';
  const getQuantumReadiness = (cert: CryptoAsset) => cert.pqcRisk;

  const getColumnValue = (cert: ScoredCert, key: ColumnKey) => {
    const thumbprint = getThumbprint(cert);
    switch (key) {
      case 'commonName':
        return <span className="font-mono text-[10.5px] text-foreground">{cert.commonName || cert.name}</span>;
      case 'serialNumber':
        return <span className="font-mono text-[10px] text-muted-foreground">{cert.serial}</span>;
      case 'group':
        return <span className="text-[10px] text-muted-foreground">{getGroupLabel(cert)}</span>;
      case 'issuerCommonName':
      case 'certificateAuthority':
        return <span className="text-[10px] text-muted-foreground">{cert.caIssuer}</span>;
      case 'validTo':
        return <span className="tabular-nums text-[10px] text-muted-foreground">{getValidTo(cert)}</span>;
      case 'status': {
        const statusLabel = getDisplayStatus(cert.status);
        const statusColor = getStatusTone(cert.status);
        return <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>{statusLabel}</span>;
      }
      case 'kubeAttributes':
        return <span className="text-[10px] text-muted-foreground">{getKubeAttributes(cert)}</span>;
      case 'quantumReadiness':
        return <span className="text-[10px] text-muted-foreground">{getQuantumReadiness(cert)}</span>;
      case 'subjectOrganizationUnit':
        return <span className="text-[10px] text-muted-foreground">{cert.team}</span>;
      case 'subjectLocality':
        return <span className="text-[10px] text-muted-foreground">San Jose</span>;
      case 'subjectState':
        return <span className="text-[10px] text-muted-foreground">California</span>;
      case 'subjectCountry':
        return <span className="text-[10px] text-muted-foreground">US</span>;
      case 'issuerOrganization':
        return <span className="text-[10px] text-muted-foreground">{cert.caIssuer.split(' ')[0]}</span>;
      case 'issuerOrganizationUnit':
        return <span className="text-[10px] text-muted-foreground">PKI Services</span>;
      case 'issuerLocality':
        return <span className="text-[10px] text-muted-foreground">New York</span>;
      case 'issuerState':
        return <span className="text-[10px] text-muted-foreground">New York</span>;
      case 'issuerCountry':
        return <span className="text-[10px] text-muted-foreground">US</span>;
      case 'version':
        return <span className="text-[10px] text-muted-foreground">v3</span>;
      case 'validFrom':
        return <span className="tabular-nums text-[10px] text-muted-foreground">{getValidFrom(cert)}</span>;
      case 'keyAlgorithmSize':
        return <span className="text-[10px] text-muted-foreground">{`${cert.algorithm} / ${cert.keyLength}`}</span>;
      case 'signatureAlgorithm':
        return <span className="text-[10px] text-muted-foreground">{getSignatureAlgorithm(cert.algorithm)}</span>;
      case 'keyUsages':
        return <span className="text-[10px] text-muted-foreground">Digital Signature, Key Encipherment</span>;
      case 'extendedKeyUsages':
        return <span className="text-[10px] text-muted-foreground">Server Auth, Client Auth</span>;
      case 'basicConstraints':
        return <span className="text-[10px] text-muted-foreground">CA:FALSE</span>;
      case 'associatedObject':
        return <span className="text-[10px] text-muted-foreground">{cert.infrastructure}</span>;
      case 'applications':
        return <span className="text-[10px] text-muted-foreground">{cert.application}</span>;
      case 'subjectAlternativeNames':
        return <span className="text-[10px] text-muted-foreground">{cert.commonName}, api.{cert.application.toLowerCase().replace(/\s+/g, '-')}.acmecorp.com</span>;
      case 'compliant':
        return <span className="text-[10px] text-muted-foreground">{cert.crs < 30 ? 'Yes' : 'No'}</span>;
      case 'discoveredFileNames':
        return <span className="text-[10px] text-muted-foreground">{`${cert.name}.pem`}</span>;
      case 'renewDate':
        return <span className="tabular-nums text-[10px] text-muted-foreground">{getValidTo(cert)}</span>;
      case 'validFor':
        return <span className="text-[10px] text-muted-foreground">{Math.max(cert.daysToExpiry, 0)} days</span>;
      case 'requestId':
      case 'orderId':
        return <span className="text-[10px] text-muted-foreground">{getOrderId(cert)}</span>;
      case 'subjectEmailAddress':
        return <span className="text-[10px] text-muted-foreground">{`${cert.owner.toLowerCase().replace(/\s+/g, '.')}@acmecorp.com`}</span>;
      case 'comments':
        return <span className="text-[10px] text-muted-foreground">Managed by {cert.team}</span>;
      case 'countOfSubjectAltNames':
        return <span className="text-[10px] text-muted-foreground">2</span>;
      case 'reenrollDate':
      case 'regenerateDate':
        return <span className="tabular-nums text-[10px] text-muted-foreground">{getValidFrom(cert)}</span>;
      case 'thumbprint':
        return <span className="font-mono text-[10px] text-muted-foreground">{thumbprint}</span>;
      case 'subjectKeyIdentifier':
        return <span className="font-mono text-[10px] text-muted-foreground">{thumbprint.slice(0, 12)}</span>;
      case 'discoverySource':
        return <span className="text-[10px] text-muted-foreground">{cert.discoverySource}</span>;
      case 'subjectOrganization':
        return <span className="text-[10px] text-muted-foreground">AcmeCorp</span>;
      default:
        return <span className="text-[10px] text-muted-foreground">—</span>;
    }
  };

  const renderActionModal = () => {
    if (!actionModal) return null;
    const selectedCount = selected.length;
    const modalFooter = (primaryLabel: string, onPrimary: () => void, primaryStyle?: React.CSSProperties, secondaryLabel = 'Cancel') => (
      <div className="mt-5 flex items-center justify-end gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); closeActionModal(); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/40">{secondaryLabel}</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onPrimary(); }} className="rounded-md px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90" style={primaryStyle ?? { backgroundColor: 'hsl(var(--teal))' }}>{primaryLabel}</button>
      </div>
    );

    return (
      <div className="fixed inset-0 z-[70]" onClick={(e) => e.stopPropagation()}>
        {actionModal === 'export' && (
          <Modal open onClose={closeActionModal} title="Export Certificates">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <div>
                <p className="text-[11px] text-muted-foreground">Group</p>
                <p className="mt-1 rounded-md border border-border bg-secondary/20 px-3 py-2">all-certificate-groups</p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Columns</p>
                {['All Columns', 'Displayed Columns'].map((option) => (
                  <label key={option} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input type="radio" name="columns" defaultChecked={option === 'Displayed Columns'} onClick={(e) => e.stopPropagation()} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Format</p>
                {(['csv', 'xls'] as const).map((format) => (
                  <label key={format} className="flex items-center gap-2 uppercase" onClick={(e) => e.stopPropagation()}>
                    <input type="radio" name="format" checked={exportFormat === format} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setExportFormat(format); }} />
                    <span>{format}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Exporting all certificate columns may take time.</p>
              {modalFooter('Export', () => handleSuccess(`Exporting ${selectedCount || tabCerts.length} certificate(s) as ${exportFormat.toUpperCase()}`))}
            </div>
          </Modal>
        )}

        {actionModal === 'download' && (
          <Modal open onClose={closeActionModal} title="Download Certificate">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Choose Download Type</p>
                <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input type="radio" name="downloadType" checked={downloadType === 'certs'} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setDownloadType('certs'); }} />
                  <span>Certificates Only</span>
                </label>
                <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input type="radio" name="downloadType" checked={downloadType === 'keys'} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setDownloadType('keys'); }} />
                  <span>Certificates and Keys</span>
                </label>
              </div>
              <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={downloadTruststore} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setDownloadTruststore(e.target.checked); }} />
                <span>Download Truststore Certificates</span>
              </label>
              {modalFooter('Download', () => handleSuccess(`Downloading ${selectedCount || tabCerts.length} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'delete' && (
          <Modal open onClose={closeActionModal} title="Delete Certificate">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--coral) / 0.08)', borderColor: 'hsl(var(--coral) / 0.2)' }}>Delete {selectedCount} certificate(s)? This cannot be undone.</div>
              {modalFooter('Yes Delete', () => handleSuccess(`${selectedCount} deleted`, { closeDrill: true }), { backgroundColor: 'hsl(var(--coral))' }, 'No Cancel')}
            </div>
          </Modal>
        )}

        {actionModal === 'change-status' && (
          <Modal open onClose={closeActionModal} title="Change Status">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <p>Change Status to:</p>
                {['Managed', 'Monitored'].map((status) => (
                  <label key={status} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input type="radio" checked={newStatus === status} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setNewStatus(status); }} />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-3 text-[11px] text-muted-foreground">Changing status may impact existing workflows.</div>
              <textarea value={statusComment} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setStatusComment(e.target.value); }} rows={4} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" placeholder="Comments" />
              {modalFooter('Yes', () => handleSuccess(`Status updated to ${newStatus} for ${selectedCount} certificate(s)`), { backgroundColor: 'hsl(var(--teal))' }, 'No')}
            </div>
          </Modal>
        )}

        {actionModal === 'assign-group' && (
          <Modal open onClose={closeActionModal} title="Assign to Group">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={groupSearch} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setGroupSearch(e.target.value); }} placeholder="Search groups" className="w-full rounded-md border border-border bg-secondary/20 py-2 pl-9 pr-3 text-xs outline-none" />
              </div>
              <div className="rounded-md border border-border bg-secondary/20 px-3 py-2"><span className="text-muted-foreground">Selected:</span> <strong>{selectedGroup}</strong></div>
              <div className="space-y-2">
                {filteredGroups.map((group) => (
                  <label key={group} className="flex items-center justify-between rounded-md border border-border px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <input type="radio" checked={selectedGroup === group} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setSelectedGroup(group); }} />
                      <span>{group}</span>
                    </div>
                    {selectedGroup === group && <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--teal))' }} />}
                  </label>
                ))}
              </div>
              <textarea value={comments} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setComments(e.target.value); }} rows={4} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" placeholder="Comments" />
              {modalFooter('Assign', () => handleSuccess(`Assigned ${selectedCount} certificate(s) to ${selectedGroup}`))}
            </div>
          </Modal>
        )}

        {actionModal === 'unassign-group' && (
          <Modal open onClose={closeActionModal} title="Unassign Group">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p className="text-muted-foreground">Move to Default group?</p>
              {modalFooter('Unassign', () => handleSuccess(`Unassigned ${selectedCount} certificate(s)`), { backgroundColor: 'hsl(var(--amber))' })}
            </div>
          </Modal>
        )}

        {actionModal === 'add-comments' && (
          <Modal open onClose={closeActionModal} title="Add / Modify Comments">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <textarea value={comments} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setComments(e.target.value); }} rows={4} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" />
              {modalFooter('Save', () => handleSuccess(`Saved comments for ${selectedCount} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'cert-attributes' && (
          <Modal open onClose={closeActionModal} title="Certificate Attributes">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              {['Owner', 'Environment', 'Business Unit'].map((field) => (
                <div key={field} className="grid grid-cols-[120px,1fr] items-center gap-3 rounded-md border border-border px-3 py-2">
                  <span className="text-muted-foreground">{field}</span>
                  <input defaultValue={field === 'Owner' ? 'Sarah Chen' : field === 'Environment' ? 'Production' : 'Platform'} onClick={(e) => e.stopPropagation()} className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" />
                </div>
              ))}
              {modalFooter('Save', () => handleSuccess(`Updated attributes for ${selectedCount} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'bulk-update' && (
          <Modal open onClose={closeActionModal} title="Bulk Update Attributes Value">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--amber) / 0.08)', borderColor: 'hsl(var(--amber) / 0.2)' }}>Bulk updates affect multiple certificates and should be validated before import.</div>
              <div className="space-y-2">
                {(['File Upload', 'By Group'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input type="radio" checked={bulkUpdateMode === mode} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setBulkUpdateMode(mode); }} />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span>Download Template</span>
                <button type="button" onClick={(e) => e.stopPropagation()} className="rounded-md border border-border px-3 py-1 text-[11px]">Download</button>
              </div>
              <input type="file" onClick={(e) => e.stopPropagation()} className="w-full text-[11px] text-muted-foreground" />
              {modalFooter('Save', () => handleSuccess(`Bulk update queued for ${selectedCount} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'update-renew' && (
          <Modal open onClose={closeActionModal} title="Update Renew Validity">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <label className="space-y-2">
                <span>Renew X days before expiry</span>
                <input type="number" value={renewDays} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewDays(Number(e.target.value)); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" />
              </label>
              {modalFooter('Save', () => handleSuccess(`Updated renew validity for ${selectedCount} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'renew' && (
          <Modal open onClose={closeActionModal} title="Renew Certificate">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p>{selectedCount || tabCerts.length} certificate(s) selected.</p>
              <label className="space-y-2 block">
                <span>CA</span>
                <select value={renewCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">{CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
              </label>
              <div className="space-y-2">
                <span>Schedule</span>
                {(['Immediately', 'Next maintenance window'] as const).map((option) => (
                  <label key={option} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input type="radio" checked={renewSchedule === option} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewSchedule(option); }} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--teal) / 0.08)', borderColor: 'hsl(var(--teal) / 0.18)' }}>Same key pair and template will be used for renewal.</div>
              {modalFooter('Renew', () => { setActionModal(null); setApprovalAction('renew'); setApprovalSearch(''); setApprovalDecisionOpen(false); })}
            </div>
          </Modal>
        )}

        {actionModal === 'regenerate' && (
          <Modal open onClose={closeActionModal} title="Regenerate Certificate">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p>{selectedCount || tabCerts.length} certificate(s) selected.</p>
              <label className="space-y-2 block">
                <span>Key Type</span>
                <select value={regenerateKeyType} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRegenerateKeyType(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">{['RSA-4096', 'ECC P-384', 'Ed25519'].map((option) => <option key={option}>{option}</option>)}</select>
              </label>
              <label className="space-y-2 block">
                <span>CA</span>
                <select value={renewCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">{CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
              </label>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--teal) / 0.08)', borderColor: 'hsl(var(--teal) / 0.18)' }}>Regeneration creates a new key pair before issuing the replacement certificate.</div>
              {modalFooter('Regenerate', () => handleSuccess(`Regeneration initiated for ${selectedCount || tabCerts.length} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'reissue' && (
          <Modal open onClose={closeActionModal} title="Reissue Certificate">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p>{selectedCount || tabCerts.length} certificate(s) selected.</p>
              <label className="space-y-2 block">
                <span>CA</span>
                <select value={renewCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">{CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
              </label>
              <div className="space-y-2">
                <span>Schedule</span>
                {(['Immediately', 'Next maintenance window'] as const).map((option) => (
                  <label key={option} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input type="radio" checked={renewSchedule === option} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewSchedule(option); }} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <textarea value={reissueReason} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setReissueReason(e.target.value); }} rows={4} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" placeholder="Reason for reissue" />
              {modalFooter('Reissue', () => handleSuccess(`Reissue initiated for ${selectedCount || tabCerts.length} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'revoke' && (
          <Modal open onClose={closeActionModal} title="Certificate Revoke">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <label className="space-y-2 block">
                <span>* Reason:</span>
                <select value={revokeReason} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRevokeReason(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">
                  <option value="">Select a reason</option>
                  {REVOKE_REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.value}</option>)}
                </select>
              </label>
              {revokeReason && <p className="text-[11px] italic text-muted-foreground">{REVOKE_REASONS.find((reason) => reason.value === revokeReason)?.hint}</p>}
              <textarea value={revokeComment} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRevokeComment(e.target.value); }} rows={4} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" placeholder="Add comments about this revocation request" />
              <div className="rounded border border-border p-3 text-xs leading-relaxed text-muted-foreground">Please revoke the certificate individually if the reason for revocation is not listed. Already Revoked/expired certificates, certificates with status other than 'Managed' and certificates with existing active Requests cannot be revoked. Download the list to check if the selected certificates are eligible{' '}<button type="button" className="underline" style={{ color: 'hsl(var(--teal))' }} onClick={(e) => { e.stopPropagation(); toast.info('Downloading eligibility list...'); }}>here</button>.</div>
              {!revokeReason && <div className="rounded-lg border p-3 text-[11px]" style={{ backgroundColor: 'hsl(var(--coral) / 0.08)', borderColor: 'hsl(var(--coral) / 0.2)' }}>A revoke reason is required before submitting.</div>}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); closeActionModal(); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/40">Close</button>
                <button type="button" disabled={!revokeReason} onClick={(e) => { e.stopPropagation(); setActionModal(null); setApprovalAction('revoke'); setApprovalSearch(''); setApprovalDecisionOpen(false); }} className="rounded-md px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--teal))' }}>Submit</button>
              </div>
            </div>
          </Modal>
        )}

        {actionModal === 'ca-switch' && (
          <Modal open onClose={closeActionModal} title="CA Switch">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p className="text-muted-foreground">Current CA: {tabCerts[0]?.caIssuer ?? 'Unknown'}</p>
              <label className="space-y-2 block">
                <span>Switch to</span>
                <select value={switchCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setSwitchCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">{CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
              </label>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--amber) / 0.08)', borderColor: 'hsl(var(--amber) / 0.2)' }}>Switching the issuing CA may require updated certificate chains on dependent services.</div>
              {modalFooter('Switch', () => handleSuccess(`CA switched for ${selectedCount || tabCerts.length} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'revocation-check' && (
          <Modal open onClose={closeActionModal} title="Revocation Check">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              {!revocationDone ? (
                <div className="space-y-3">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary/40"><div className="h-full animate-pulse rounded-full" style={{ width: '70%', backgroundColor: 'hsl(var(--teal))' }} /></div>
                  <p className="text-muted-foreground">Running revocation status checks across selected certificates...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Valid', value: Math.max(1, Math.round((selectedCount || tabCerts.length) * 0.72)), color: 'hsl(var(--teal))' },
                    { label: 'Revoked', value: Math.round((selectedCount || tabCerts.length) * 0.18), color: 'hsl(var(--coral))' },
                    { label: 'Unknown', value: Math.max(0, (selectedCount || tabCerts.length) - Math.max(1, Math.round((selectedCount || tabCerts.length) * 0.72)) - Math.round((selectedCount || tabCerts.length) * 0.18)), color: 'hsl(var(--amber))' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                      <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                      <div className="text-[11px] text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 flex items-center justify-end"><button type="button" onClick={(e) => { e.stopPropagation(); closeActionModal(); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/40">Close</button></div>
            </div>
          </Modal>
        )}

        {actionModal === 'archive' && (
          <Modal open onClose={closeActionModal} title="Archive Certificates">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p>{selectedCount} certs will be archived.</p>
              <p className="text-muted-foreground">Archived certificates can be restored later.</p>
              {modalFooter('Archive', () => handleSuccess(`Archived ${selectedCount} certificate(s)`), { backgroundColor: 'hsl(var(--amber))' })}
            </div>
          </Modal>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="flex h-[85vh] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-card px-5 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('export'); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground">Export</button>
            <span className="text-[10px] text-muted-foreground">1 to {tabCerts.length} of {tabCerts.length}</span>
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex flex-shrink-0 border-b border-border px-5" onClick={(e) => e.stopPropagation()}>
          {[
            { id: 'server' as const, label: 'Server' },
            { id: 'client' as const, label: 'Client' },
            { id: 'code-signing' as const, label: 'Code Signing' },
          ].map((item) => (
            <button key={item.id} type="button" onClick={(e) => { e.stopPropagation(); setCertTab(item.id); setSelected([]); }} className={`border-b-2 px-4 py-2 text-xs font-medium ${certTab === item.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item.label}</button>
          ))}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-secondary/20 px-5 py-2.5" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected.length === tabCerts.length && tabCerts.length > 0} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); selectAll(); }} />
            <span>Select all</span>
          </label>
          {selected.length > 0 && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] text-teal">{selected.length} selected</span>}
          <div className="ml-auto">
            <button type="button" onClick={(e) => { e.stopPropagation(); setDraftSelectedColumns(selectedColumns); setColumnsOpen(true); }} className="mr-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition hover:bg-secondary/40"><Layers className="h-3.5 w-3.5" />Columns</button>
            <button ref={actionsButtonRef} type="button" disabled={selected.length === 0} onClick={(e) => { e.stopPropagation(); setActionsOpen((isOpen) => !isOpen); }} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-50"><MoreVertical className="h-3.5 w-3.5" />Actions<ChevronDown className={`h-3 w-3 transition-transform ${actionsOpen ? 'rotate-180' : ''}`} /></button>
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/50">
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 px-3 py-2 text-left"><input type="checkbox" checked={selected.length === tabCerts.length && tabCerts.length > 0} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); selectAll(); }} /></th>
                {visibleColumns.map((column) => <th key={column.key} className="px-3 py-2 text-left">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {tabCerts.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-xs text-muted-foreground">No certificates found for {title} in {certTab} category.</td>
                </tr>
              ) : (
                tabCerts.map((cert) => (
                  <tr key={cert.id} className={`cursor-pointer border-b border-border transition-colors hover:bg-secondary/30 ${selected.includes(cert.id) ? 'bg-teal/5' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(cert.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); toggleSelect(cert.id); }} />
                    </td>
                    {visibleColumns.map((column) => <td key={column.key} className="px-3 py-2 align-top">{getColumnValue(cert, column.key)}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {actionsOpen && ReactDOM.createPortal(
          <div ref={dropdownRef} style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 99999, minWidth: '220px' }} className="rounded-lg border border-border bg-card py-1 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('export'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Download className="h-3.5 w-3.5" />Export Certificates</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('download'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Download className="h-3.5 w-3.5" />Download Certificates</button>
            </div>
            <div className="my-1 h-px bg-border" />
            <div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('renew'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-teal hover:bg-secondary/40"><RefreshCw className="h-3.5 w-3.5" />Renew Certificate</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('revoke'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40" style={{ color: 'hsl(var(--coral))' }}><XCircle className="h-3.5 w-3.5" />Revoke Certificate</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('ca-switch'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><ArrowRightLeft className="h-3.5 w-3.5" />CA Switch</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('revocation-check'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><CheckCircle2 className="h-3.5 w-3.5" />Revocation Check</button>
            </div>
            <div className="my-1 h-px bg-border" />
            <div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('delete'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40" style={{ color: 'hsl(var(--coral))' }}><Trash2 className="h-3.5 w-3.5" />Delete</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('change-status'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Settings className="h-3.5 w-3.5" />Change Status</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('assign-group'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Tag className="h-3.5 w-3.5" />Assign Group</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('unassign-group'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Unlink className="h-3.5 w-3.5" />Unassign Group</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('add-comments'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><MessageSquare className="h-3.5 w-3.5" />Add/Modify Comments</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('cert-attributes'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Settings className="h-3.5 w-3.5" />Certificate Attributes</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('bulk-update'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Layers className="h-3.5 w-3.5" />Bulk Update Attributes V...</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('update-renew'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40"><Clock className="h-3.5 w-3.5" />Update Renew Validity</button>
            </div>
            <div className="my-1 h-px bg-border" />
            <div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setActionModal('archive'); setActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/40" style={{ color: 'hsl(var(--amber))' }}><Archive className="h-3.5 w-3.5" />Archive</button>
            </div>
          </div>,
          document.body
        )}

        {columnsOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40" onClick={(e) => { e.stopPropagation(); setColumnsOpen(false); }}>
            <div className="w-[980px] max-w-[95vw] rounded-xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Columns</div>
                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-secondary/40" onClick={(e) => { e.stopPropagation(); setColumnsOpen(false); }}><X className="h-4 w-4" /></button>
              </div>
              <div className="mb-4 flex items-center gap-3">
                <input value={columnSearch} onChange={(e) => setColumnSearch(e.target.value)} placeholder="Search..." className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none" />
                <span className="rounded-full px-2 py-1 text-[10px]" style={{ backgroundColor: 'hsl(var(--teal) / 0.12)', color: 'hsl(var(--teal))' }}>Selected columns: {draftSelectedColumns.length}</span>
                <label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={draftSelectedColumns.length === COLUMN_OPTIONS.length} onChange={() => setDraftSelectedColumns(draftSelectedColumns.length === COLUMN_OPTIONS.length ? DEFAULT_VISIBLE_COLUMNS : COLUMN_OPTIONS.map((c) => c.key))} />Select all</label>
                <button type="button" className="text-xs underline" style={{ color: 'hsl(var(--teal))' }} onClick={() => setDraftSelectedColumns(previousSelectedColumns)}>Reset to previous column selection</button>
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
                {filteredColumnOptions.map((column) => {
                  const required = 'required' in column && column.required;
                  return (
                    <label key={column.key} className="flex items-center gap-2 text-foreground">
                      <input type="checkbox" checked={draftSelectedColumns.includes(column.key)} disabled={required} onChange={() => toggleColumn(column.key)} />
                      <span>{column.label}{required ? ' *' : ''}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground" onClick={() => setColumnsOpen(false)}>Cancel</button>
                <button type="button" className="rounded-md px-3 py-1.5 text-xs text-primary-foreground" style={{ backgroundColor: 'hsl(var(--teal))' }} onClick={() => { setPreviousSelectedColumns(selectedColumns); setSelectedColumns(Array.from(new Set(['commonName', ...draftSelectedColumns])) as ColumnKey[]); setColumnsOpen(false); }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {approvalAction && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40" onClick={(e) => e.stopPropagation()}>
            <div className="w-[1100px] max-w-[96vw] rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="text-sm font-semibold text-foreground">{approvalAction === 'renew' ? 'Renew Certificate' : 'Revoke Certificate'}</div>
                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-secondary/40" onClick={() => closeApprovalModal()}><X className="h-4 w-4" /></button>
              </div>
              <div className="flex border-b border-border px-5">{['server', 'client'].map((item) => <button key={item} type="button" className={`border-b-2 px-4 py-2 text-xs font-medium ${certTab === item ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
              <div className="space-y-3 px-5 py-4">
                <input value={approvalSearch} onChange={(e) => setApprovalSearch(e.target.value)} placeholder="Search..." className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none" />
                <div className="flex items-center justify-between">
                  <button type="button" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground" onClick={(e) => { e.stopPropagation(); setActionsOpen((isOpen) => !isOpen); }}><MoreVertical className="h-3.5 w-3.5" />Actions<ChevronDown className="h-3 w-3" /></button>
                  <span className="text-[10px] text-muted-foreground">1 to 1 of 0</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="w-8 px-3 py-2"><input type="checkbox" checked={approvalRows.length > 0} readOnly /></th>
                        <th className="px-3 py-2">Common Name</th>
                        <th className="px-3 py-2">Serial Number</th>
                        <th className="px-3 py-2">Certificate Authority</th>
                        <th className="px-3 py-2">Expiry Date</th>
                        <th className="px-3 py-2">Thumbprint</th>
                        <th className="px-3 py-2">Order</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalRows.map((cert) => (
                        <tr key={`approval-${cert.id}`} className="border-t border-border">
                          <td className="px-3 py-2"><input type="checkbox" checked readOnly /></td>
                          <td className="px-3 py-2 font-mono text-[10.5px] text-foreground">{cert.commonName}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{cert.serial}</td>
                          <td className="px-3 py-2 text-muted-foreground">{cert.caIssuer}</td>
                          <td className="px-3 py-2 text-muted-foreground">{getValidTo(cert)}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{`${getThumbprint(cert).slice(0, 8)}...${getThumbprint(cert).slice(-4)}`}</td>
                          <td className="px-3 py-2"><button type="button" className="text-xs underline" style={{ color: 'hsl(var(--teal))' }}>{getOrderId(cert)}</button></td>
                          <td className="px-3 py-2 text-[10px] italic text-muted-foreground">({approvalAction === 'renew' ? 'Renewal Submission In Progress' : 'Revocation Submission In Progress'})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="relative flex justify-start">
                  <button type="button" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground" onClick={() => setApprovalDecisionOpen((isOpen) => !isOpen)}><MoreVertical className="h-3.5 w-3.5" />Actions<ChevronDown className="h-3 w-3" /></button>
                  {approvalDecisionOpen && (
                    <div className="absolute top-10 z-10 min-w-[220px] rounded-lg border border-border bg-card py-1 shadow-2xl">
                      <button type="button" className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-secondary/40" onClick={() => { toast.success(`Action submitted successfully for ${selected.length} certificate(s)`); setSelected([]); closeApprovalModal(); onClose(); }}>Proceed Further</button>
                      <button type="button" className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-secondary/40" onClick={() => { toast.info('Action rejected'); closeApprovalModal(); }}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {renderActionModal()}
    </div>
  );
}
