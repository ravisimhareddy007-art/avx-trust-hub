import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Info,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from 'recharts';
import ExpiryCalendar from './clm/ExpiryCalendar';
import RenewalPipeline from './clm/RenewalPipeline';
import CLMActionTrend from './clm/CLMActionTrend';
import FailedRenewals from './clm/FailedRenewals';
import NonStandardCerts from './clm/NonStandardCerts';
import AlgorithmStrength from './clm/AlgorithmStrength';
import SLCCompliance from './clm/SLCCompliance';
import ScanCoverage from './clm/ScanCoverage';
import SLCDashboard from './clm/SLCDashboard';
import CertDrillModal from './clm/CertDrillModal';
import { ESTATE_SUMMARY, mockAssets, type CryptoAsset } from '@/data/mockData';
import { mockITAssets } from '@/data/inventoryMockData';
import { computeCRS } from '@/lib/risk/crs';
import { useNav } from '@/context/NavigationContext';
import { toast } from 'sonner';

type CLMTab = 'overview' | 'operations' | 'risk' | 'slc';
type ScoredCert = CryptoAsset & { crs: number };


const TABS: { id: CLMTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: Wrench },
  { id: 'risk', label: 'Risk & Crypto', icon: ShieldCheck },
  { id: 'slc', label: 'Short-Lived Certs', icon: Clock },
];

const CA_DISTRIBUTION = [
  { name: 'AppViewX', value: 1081 },
  { name: 'DigiCert', value: 313 },
  { name: 'Sectigo', value: 199 },
  { name: 'Microsoft Enterprise', value: 171 },
  { name: "Let's Encrypt", value: 142 },
  { name: 'Entrust', value: 114 },
  { name: 'GlobalSign', value: 114 },
  { name: 'GoDaddy', value: 85 },
  { name: 'SwissSign', value: 85 },
  { name: 'HashiCorp Vault', value: 57 },
  { name: 'Amazon', value: 57 },
  { name: 'CSC Global', value: 28 },
  { name: 'HydrantID', value: 28 },
  { name: 'OpenTrust', value: 28 },
  { name: 'OTHERS', value: 345 },
] as const;

const scoreZoneColors = {
  bad: 'hsl(var(--coral))',
  poor: 'hsl(25 90% 55%)',
  fair: 'hsl(var(--amber))',
  good: 'hsl(210 80% 56%)',
  excellent: 'hsl(var(--teal))',
};

const severityHsl: Record<string, string> = {
  Critical: 'hsl(0 72% 51%)',
  High: 'hsl(0 65% 60%)',
  Medium: 'hsl(38 90% 55%)',
  Low: 'hsl(48 80% 55%)',
  Compliant: 'hsl(var(--teal))',
};

const issuerColors: Record<string, string> = {
  'DigiCert Global G2': 'hsl(230 60% 60%)',
  'Entrust L1K': 'hsl(280 50% 60%)',
  "Let's Encrypt R3": 'hsl(200 70% 55%)',
  'MSCA Enterprise': 'hsl(250 55% 65%)',
};

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function getScoreColor(overallScore: number) {
  if (overallScore >= 80) return scoreZoneColors.excellent;
  if (overallScore >= 60) return scoreZoneColors.good;
  if (overallScore >= 40) return scoreZoneColors.fair;
  if (overallScore >= 20) return scoreZoneColors.poor;
  return scoreZoneColors.bad;
}

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

function getCrsBadgeColor(crs: number) {
  if (crs >= 80) return 'hsl(var(--coral))';
  if (crs >= 60) return 'hsl(var(--amber))';
  if (crs >= 30) return 'hsl(210 80% 56%)';
  return 'hsl(var(--teal))';
}

export default function PKIEngineerDashboard() {
  const [tab, setTab] = useState<CLMTab>('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCerts, setModalCerts] = useState<ScoredCert[]>([]);
  const { setFilters } = useNav();

  const allCerts = useMemo(
    () => mockAssets.filter((a) => a.type.includes('Certificate')),
    []
  );

  const scored = useMemo<ScoredCert[]>(
    () => allCerts.map((a) => ({ ...a, crs: computeCRS(a).crs })),
    [allCerts]
  );

  const critical = useMemo(() => scored.filter((a) => a.crs >= 80), [scored]);
  const high = useMemo(() => scored.filter((a) => a.crs >= 60 && a.crs < 80), [scored]);
  const medium = useMemo(() => scored.filter((a) => a.crs >= 30 && a.crs < 60), [scored]);
  const low = useMemo(() => scored.filter((a) => a.crs > 0 && a.crs < 30), [scored]);
  const compliant = useMemo(() => scored.filter((a) => a.crs === 0), [scored]);
  const total = scored.length || 1;
  const actualTotal = scored.length;

  const rawPenalty = (critical.length * 4 + high.length * 3 + medium.length * 2 + low.length) / (total * 4);
  const overallScore = Math.round(Math.max(0, Math.min(100, (1 - rawPenalty) * 100)));
  const scoreLabel =
    overallScore >= 80 ? 'Excellent' :
    overallScore >= 60 ? 'Good' :
    overallScore >= 40 ? 'Fair' :
    overallScore >= 20 ? 'Poor' : 'Bad';
  const scoreColor = getScoreColor(overallScore);

  const expExpired = useMemo(() => scored.filter((a) => a.daysToExpiry < 0 || a.status === 'Expired'), [scored]);
  const exp1to10 = useMemo(() => scored.filter((a) => a.daysToExpiry >= 0 && a.daysToExpiry <= 10), [scored]);
  const exp11to30 = useMemo(() => scored.filter((a) => a.daysToExpiry > 10 && a.daysToExpiry <= 30), [scored]);
  const exp31to90 = useMemo(() => scored.filter((a) => a.daysToExpiry > 30 && a.daysToExpiry <= 90), [scored]);

  const caGroups = ['DigiCert Global G2', 'Entrust L1K', "Let's Encrypt R3", 'MSCA Enterprise'];
  const caData = useMemo(
    () => caGroups.map((ca) => ({
      name: ca,
      value: scored.filter((a) => a.caIssuer === ca).length ||
        (ca === 'DigiCert Global G2' ? Math.round(total * 0.4) :
         ca === 'Entrust L1K' ? Math.round(total * 0.22) :
         ca === "Let's Encrypt R3" ? Math.round(total * 0.25) :
         Math.round(total * 0.13)),
    })),
    [scored, total]
  );

  const scanData = useMemo(
    () => [
      { name: 'Managed Device', value: Math.round(total * 0.42) },
      { name: 'Network Scan', value: Math.round(total * 0.28) },
      { name: 'CA Scan', value: Math.round(total * 0.15) },
      { name: 'Cloud Scan', value: Math.round(total * 0.08) },
      { name: 'CT Log Scan', value: Math.round(total * 0.05) },
      { name: 'K8s Scan', value: Math.round(total * 0.02) },
    ],
    [total]
  );

  const codeSigningCount = useMemo(() => scored.filter((a) => a.type === 'Code-Signing Certificate').length, [scored]);

  const severityBuckets = useMemo(() => {
    const buckets = [
      { name: 'Critical', certs: critical },
      { name: 'High', certs: high },
      { name: 'Medium', certs: medium },
      { name: 'Low', certs: low },
      { name: 'Compliant', certs: compliant },
    ];
    const percentages = buckets.map((bucket) => Math.round((bucket.certs.length / total) * 100));
    const sum = percentages.reduce((acc, value) => acc + value, 0);
    const largestIndex = buckets.reduce((bestIndex, bucket, index, arr) => (
      bucket.certs.length > arr[bestIndex].certs.length ? index : bestIndex
    ), 0);
    percentages[largestIndex] += 100 - sum;

    return buckets.map((bucket, index) => ({
      ...bucket,
      pct: percentages[index],
    }));
  }, [compliant, critical, high, low, medium, total]);

  const donutData = useMemo(
    () => [
      { name: 'Expired', value: expExpired.length || 3, color: 'hsl(var(--coral))', certs: expExpired },
      { name: '1-10 days', value: exp1to10.length || 7, color: 'hsl(0 65% 60%)', certs: exp1to10 },
      { name: '11-30 days', value: exp11to30.length || 12, color: 'hsl(var(--amber))', certs: exp11to30 },
      { name: '31-90 days', value: exp31to90.length || 28, color: 'hsl(48 80% 55%)', certs: exp31to90 },
    ],
    [exp1to10, exp11to30, exp31to90, expExpired]
  );

  const tabCerts = useMemo(
    () => drillCerts.filter((a) =>
      certTab === 'server'
        ? a.type === 'TLS Certificate' || a.type === 'K8s Workload Cert'
        : certTab === 'client'
          ? a.type === 'SSH Certificate'
          : a.type === 'Code-Signing Certificate'
    ),
    [certTab, drillCerts]
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

  const handleRefresh = () => toast.success('CLM overview refreshed');

  function openModal(title: string, certs: ScoredCert[]) {
    setModalTitle(title);
    setModalCerts(certs.length > 0 ? certs : scored);
    setModalOpen(true);
  }

  function openDrill(kind: 'severity' | 'ca' | 'scan', label: string, certs: ScoredCert[]): void;
  function openDrill(severity: string, certs: ScoredCert[]): void;
  function openDrill(kindOrSeverity: 'severity' | 'ca' | 'scan' | string, labelOrCerts: string | ScoredCert[], maybeCerts?: ScoredCert[]) {
    const isExplicitKind = kindOrSeverity === 'severity' || kindOrSeverity === 'ca' || kindOrSeverity === 'scan';
    const nextKind = isExplicitKind ? kindOrSeverity : 'severity';
    const nextLabel = isExplicitKind ? String(labelOrCerts) : kindOrSeverity;
    const nextCerts = (isExplicitKind ? maybeCerts : labelOrCerts) as ScoredCert[];
    const prefix = nextKind === 'ca' ? 'CA' : nextKind === 'scan' ? 'Scan Type' : 'Severity';
    openModal(`${prefix} :: ${nextLabel}`, nextCerts);
  }

  function getScanTypeCerts(scanType: string) {
    let matches: ScoredCert[] = [];

    switch (scanType) {
      case 'Managed Device':
        matches = scored.filter((a) => a.tags.some((tag) => /managed/i.test(tag)));
        break;
      case 'Network Scan':
        matches = scored.filter((a) => /network/i.test(a.discoverySource) || a.tags.some((tag) => /network-scan/i.test(tag)));
        break;
      case 'CA Scan':
        matches = scored.filter((a) => /ca|certcentral|connector/i.test(a.discoverySource) || a.tags.some((tag) => /ca-scan/i.test(tag)));
        break;
      case 'Cloud Scan':
        matches = scored.filter((a) => /cloud|aws|azure|gcp/i.test(a.discoverySource) || a.tags.some((tag) => /cloud|aws|azure|gcp/i.test(tag)));
        break;
      case 'CT Log Scan':
        matches = scored.filter((a) => /ct log|ct log monitor/i.test(a.discoverySource) || a.tags.some((tag) => /ct|log/i.test(tag)));
        break;
      case 'K8s Scan':
        matches = scored.filter((a) => a.type === 'K8s Workload Cert' || /kubernetes/i.test(a.discoverySource) || a.tags.some((tag) => /k8s|kubernetes/i.test(tag)));
        break;
      default:
        matches = [];
    }

    return matches.length > 0 ? matches : scored;
  }

  const gaugeDots = [
    { pct: 0, color: scoreZoneColors.bad },
    { pct: 25, color: scoreZoneColors.poor },
    { pct: 50, color: scoreZoneColors.fair },
    { pct: 75, color: scoreZoneColors.good },
    { pct: 100, color: scoreZoneColors.excellent },
  ].map((dot) => {
    const point = polar(80, 80, 65, -220 + (dot.pct / 100) * 260);
    return { ...dot, ...point };
  });

  const zoneLabels = [
    { label: 'BAD', angle: -205 },
    { label: 'POOR', angle: -150 },
    { label: 'FAIR', angle: -90 },
    { label: 'GOOD', angle: -20 },
    { label: 'EXCELLENT', angle: 28 },
  ].map((item) => ({ ...item, ...polar(80, 80, 85, item.angle) }));

  const backgroundArc = describeArc(80, 80, 65, -220, 40);
  const filledArc = describeArc(80, 80, 65, -220, -220 + (Math.max(0, Math.min(100, overallScore)) / 100) * 260);
  const drillCount = selected.length || tabCerts.length;

  const renderActionModal = () => {
    if (!actionModal) return null;

    const modalFooter = (primaryLabel: string, onPrimary: () => void, primaryStyle?: React.CSSProperties, secondaryLabel = 'Cancel') => (
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeActionModal();
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/40"
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrimary();
          }}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          style={primaryStyle ?? { backgroundColor: 'hsl(var(--teal))' }}
        >
          {primaryLabel}
        </button>
      </div>
    );

    const selectedCount = selected.length;

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
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--coral) / 0.08)', borderColor: 'hsl(var(--coral) / 0.2)' }}>
                Delete {selectedCount} certificate(s)? This cannot be undone.
              </div>
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
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--amber) / 0.08)', borderColor: 'hsl(var(--amber) / 0.2)' }}>
                Bulk updates affect multiple certificates and should be validated before import.
              </div>
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
                <select value={renewCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">
                  {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
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
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--teal) / 0.08)', borderColor: 'hsl(var(--teal) / 0.18)' }}>
                Same key pair and template will be used for renewal.
              </div>
              {modalFooter('Renew', () => {
                setActionModal(null);
                setApprovalAction('renew');
                setApprovalSearch('');
                setApprovalDecisionOpen(false);
              })}
            </div>
          </Modal>
        )}

        {actionModal === 'regenerate' && (
          <Modal open onClose={closeActionModal} title="Regenerate Certificate">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              <p>{selectedCount || tabCerts.length} certificate(s) selected.</p>
              <label className="space-y-2 block">
                <span>Key Type</span>
                <select value={regenerateKeyType} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRegenerateKeyType(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">
                  {['RSA-4096', 'ECC P-384', 'Ed25519'].map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="space-y-2 block">
                <span>CA</span>
                <select value={renewCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">
                  {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--teal) / 0.08)', borderColor: 'hsl(var(--teal) / 0.18)' }}>
                Regeneration creates a new key pair before issuing the replacement certificate.
              </div>
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
                <select value={renewCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRenewCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">
                  {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
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
              {revokeReason && (
                <p className="text-[11px] italic text-muted-foreground">{REVOKE_REASONS.find((reason) => reason.value === revokeReason)?.hint}</p>
              )}
              <textarea value={revokeComment} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setRevokeComment(e.target.value); }} rows={4} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none" placeholder="Add comments about this revocation request" />
              <div className="rounded border border-border p-3 text-xs leading-relaxed text-muted-foreground">
                Please revoke the certificate individually if the reason for revocation is not listed. Already Revoked/expired certificates, certificates with status other than 'Managed' and certificates with existing active Requests cannot be revoked. Download the list to check if the selected certificates are eligible{' '}
                <button
                  type="button"
                  className="underline"
                  style={{ color: 'hsl(var(--teal))' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info('Downloading eligibility list...');
                  }}
                >
                  here
                </button>
                .
              </div>
              {!revokeReason && (
                <div className="rounded-lg border p-3 text-[11px]" style={{ backgroundColor: 'hsl(var(--coral) / 0.08)', borderColor: 'hsl(var(--coral) / 0.2)' }}>
                  A revoke reason is required before submitting.
                </div>
              )}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); closeActionModal(); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/40">Close</button>
                <button
                  type="button"
                  disabled={!revokeReason}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionModal(null);
                    setApprovalAction('revoke');
                    setApprovalSearch('');
                    setApprovalDecisionOpen(false);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--teal))' }}
                >
                  Submit
                </button>
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
                <select value={switchCa} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setSwitchCa(e.target.value); }} className="w-full rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs outline-none">
                  {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <div className="rounded-lg border p-3" style={{ backgroundColor: 'hsl(var(--amber) / 0.08)', borderColor: 'hsl(var(--amber) / 0.2)' }}>
                Switching the issuing CA may require updated certificate chains on dependent services.
              </div>
              {modalFooter('Switch', () => handleSuccess(`CA switched for ${selectedCount || tabCerts.length} certificate(s)`))}
            </div>
          </Modal>
        )}

        {actionModal === 'revocation-check' && (
          <Modal open onClose={closeActionModal} title="Revocation Check">
            <div className="space-y-4 text-xs text-foreground" onClick={(e) => e.stopPropagation()}>
              {!revocationDone ? (
                <div className="space-y-3">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary/40">
                    <div className="h-full animate-pulse rounded-full" style={{ width: '70%', backgroundColor: 'hsl(var(--teal))' }} />
                  </div>
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
              <div className="mt-5 flex items-center justify-end">
                <button type="button" onClick={(e) => { e.stopPropagation(); closeActionModal(); }} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/40">Close</button>
              </div>
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

  return (
    <div className="flex max-h-[calc(100vh-120px)] flex-col space-y-0">
      <div className="flex flex-shrink-0 items-end justify-between pb-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Certificate Lifecycle Management</h1>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-xs font-medium transition-colors ${
              tab === item.id
                ? 'border-teal text-teal'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto pt-4">
        {tab === 'overview' && (
          <div className="space-y-3 pb-2 pr-1">
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Inventory Snapshot</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>0m ago</span>
                  <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
                  <Info className="h-3 w-3" />
                </div>
              </div>
              <div className="flex divide-x divide-border">
                {[
                    { label: 'Total Certificates', value: ESTATE_SUMMARY.certificates.toLocaleString() },
                  { label: 'Cert Manager', value: 0, subtitle: 'not configured' },
                  { label: 'Total Issuing CAs', value: 4 },
                    { label: 'Code Signing Certs', value: ESTATE_SUMMARY.codeSigning.toLocaleString() },
                  { label: 'Total Devices', value: mockITAssets.length },
                ].map((tile) => (
                  <div key={tile.label} className="flex-1 px-4 py-2">
                    <div className="text-2xl font-bold text-foreground">{tile.value}</div>
                    <div className="text-[11px] text-muted-foreground">{tile.label}</div>
                    {tile.subtitle ? <div className="text-[10px] text-muted-foreground/60">{tile.subtitle}</div> : null}
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-12 gap-4">
              <section className="col-span-8 rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Crypto Score</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>0m ago</span>
                    <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
                    <Info className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-[180px] flex-shrink-0">
                    <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible">
                      <path d={backgroundArc} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="12" strokeLinecap="round" className="text-foreground" />
                      <path d={filledArc} fill="none" stroke={scoreColor} strokeWidth="12" strokeLinecap="round" />
                      {gaugeDots.map((dot) => (
                        <circle key={dot.pct} cx={dot.x} cy={dot.y} r="3.5" fill={dot.color} />
                      ))}
                      {zoneLabels.map((label) => (
                        <text key={label.label} x={label.x} y={label.y} textAnchor="middle" className="fill-muted-foreground text-[8px]">
                          {label.label}
                        </text>
                      ))}
                      <text x="80" y="78" textAnchor="middle" fontSize="32" fontWeight="700" fill={scoreColor}>{overallScore}</text>
                      <text x="80" y="96" textAnchor="middle" className="fill-muted-foreground text-[10px]">Crypto Score</text>
                    </svg>
                    <div className="mt-2 flex items-center gap-1.5 rounded bg-secondary/50 p-2 text-[10px]">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: `${scoreColor}22`, color: scoreColor }}>
                        {overallScore >= 60 ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                      <span style={{ color: scoreColor }}>Crypto Score: {overallScore}/100 ({scoreLabel})</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    {severityBuckets.map((bucket) => {
                      return (
                        <button
                          key={bucket.name}
                          type="button"
                          onClick={() => openDrill(bucket.name, bucket.certs)}
                          className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition hover:bg-secondary/30"
                        >
                          <span className="w-20 text-xs font-semibold text-foreground">{bucket.name}</span>
                          <div className="h-5 flex-1 overflow-hidden rounded bg-secondary/40">
                            <div className="h-full min-w-[2px] rounded" style={{ width: `${Math.max((bucket.certs.length / total) * 100, bucket.certs.length > 0 ? 2 : 0)}%`, backgroundColor: severityHsl[bucket.name] }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">{bucket.certs.length} · {bucket.pct}%</span>
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1.5 rounded border border-amber/20 bg-amber/5 p-2 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3 flex-shrink-0 text-amber" />
                      <span>Click any Certificate Severity category to drill down and take remediation actions</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="col-span-4 rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Certificate Expiry</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>0m ago</span>
                    <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
                    <Info className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="relative h-[160px] w-[160px]">
                    <PieChart width={160} height={160}>
                      <Pie data={donutData} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2} onClick={(_, index) => openDrill(donutData[index]?.name ?? 'Expiry', donutData[index]?.certs ?? [])}>
                        {donutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-foreground">{actualTotal}</span>
                      <span className="text-[10px] text-muted-foreground">Certs</span>
                    </div>
                  </div>
                  <div className="mb-3 mt-1 flex items-center gap-4 text-[10px] text-muted-foreground">
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div className="w-full space-y-2">
                    {[
                      { label: 'Expired', count: expExpired.length, color: 'hsl(var(--coral))' },
                      { label: '1 - 10 days', count: exp1to10.length, color: 'hsl(0 65% 60%)' },
                      { label: '11 - 30 days', count: exp11to30.length, color: 'hsl(var(--amber))' },
                      { label: '31 - 90 days', count: exp31to90.length, color: 'hsl(48 80% 55%)' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span>{item.label} [{item.count}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <section className="col-span-4 rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Certificates based on Scan Type</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>0m ago</span>
                    <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
                    <Info className="h-3 w-3" />
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scanData} margin={{ top: 16, right: 12, left: 4, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-15} textAnchor="end" height={50} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} label={{ value: 'Certificate Counts', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 } }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="value" fill="hsl(230 60% 60%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data) => openDrill('scan', data.name, getScanTypeCerts(data.name))}>
                        <LabelList dataKey="value" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="col-span-8 rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Certificates by Issuing CAs</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>0m ago</span>
                    <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
                    <Info className="h-3 w-3" />
                  </div>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CA_DISTRIBUTION} margin={{ top: 6, right: 12, left: 0, bottom: 72 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={70} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        fill="hsl(230 60% 60%)"
                        cursor="pointer"
                        onClick={(data) => openDrill('ca', data.name, scored.filter((a) => a.caIssuer === data.name).length > 0 ? scored.filter((a) => a.caIssuer === data.name) : scored)}
                      >
                        <LabelList dataKey="value" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            <CLMActionTrend />
          </div>
        )}
        {tab === 'operations' && (
          <div className="space-y-4 pr-1">
            <RenewalPipeline openModal={openModal} />
            <ExpiryCalendar openModal={openModal} />
            <FailedRenewals openModal={openModal} />
          </div>
        )}

        {tab === 'risk' && (
          <div className="space-y-4 pr-1">
            <NonStandardCerts openModal={openModal} />
            <AlgorithmStrength openModal={openModal} />
            <SLCCompliance openModal={openModal} />
            <ScanCoverage />
          </div>
        )}

        {tab === 'slc' && <SLCDashboard openModal={openModal} />}
      </div>

      <CertDrillModal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} certs={modalCerts} />
    </div>
  );
}
