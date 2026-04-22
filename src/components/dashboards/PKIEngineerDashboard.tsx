import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
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
import ScanCoverage from './clm/ScanCoverage';
import SLCDashboard from './clm/SLCDashboard';
import CertDrillModal from './clm/CertDrillModal';
import { ESTATE_SUMMARY, mockAssets, type CryptoAsset } from '@/data/mockData';
import { mockITAssets } from '@/data/inventoryMockData';
import { computeCRS } from '@/lib/risk/crs';
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

export default function PKIEngineerDashboard() {
  const [tab, setTab] = useState<CLMTab>('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCerts, setModalCerts] = useState<ScoredCert[]>([]);

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
      { name: 'Expired', value: expExpired.length, color: 'hsl(var(--coral))', certs: expExpired },
      { name: '1-10 days', value: exp1to10.length, color: 'hsl(0 65% 60%)', certs: exp1to10 },
      { name: '11-30 days', value: exp11to30.length, color: 'hsl(var(--amber))', certs: exp11to30 },
      { name: '31-90 days', value: exp31to90.length, color: 'hsl(48 80% 55%)', certs: exp31to90 },
    ],
    [exp1to10, exp11to30, exp31to90, expExpired]
  );

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

  const handleRefresh = () => toast.success('CLM overview refreshed');

  function openModal(title: string, certs: ScoredCert[]) {
    if (!certs || certs.length === 0) {
      toast.info('No certificates in this category');
      return;
    }
    setModalTitle(title);
    setModalCerts(certs);
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

  function guardAndOpenDrill(kind: 'severity' | 'ca' | 'scan', label: string, certs: ScoredCert[], count?: number) {
    if ((count ?? certs.length) === 0 || !certs || certs.length === 0) {
      toast.info('No certificates in this category');
      return;
    }
    openDrill(kind, label, certs);
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
                    {severityBuckets.map((bucket) => (
                      <button
                        key={bucket.name}
                        type="button"
                        onClick={() => bucket.certs.length > 0 ? openDrill(bucket.name, bucket.certs) : toast.info('No certificates in this category')}
                        className={`flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition ${bucket.certs.length > 0 ? 'hover:bg-secondary/30' : 'cursor-default'}`}
                      >
                        <span className="w-20 text-xs font-semibold text-foreground">{bucket.name}</span>
                        <div className="h-5 flex-1 overflow-hidden rounded bg-secondary/40">
                          <div className="h-full min-w-[2px] rounded" style={{ width: `${Math.max((bucket.certs.length / total) * 100, bucket.certs.length > 0 ? 2 : 0)}%`, backgroundColor: severityHsl[bucket.name] }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{bucket.certs.length} · {bucket.pct}%</span>
                      </button>
                    ))}
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
                      <Pie data={donutData} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={2} onClick={(_, index) => {
                        const entry = donutData[index];
                        if (!entry || entry.value === 0 || entry.certs.length === 0) {
                          toast.info('No certificates in this category');
                          return;
                        }
                        openDrill(entry.name, entry.certs);
                      }}>
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
                      <Bar dataKey="value" fill="hsl(230 60% 60%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data) => guardAndOpenDrill('scan', data.name, getScanTypeCerts(data.name), Number(Array.isArray(data.value) ? data.value[0] : data.value))}>
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
                        onClick={(data) => {
                          const directMatches = scored.filter((a) => a.caIssuer === data.name);
                          const certs = directMatches.length > 0 ? directMatches : scored.filter((a) => a.caIssuer.includes(data.name));
                          guardAndOpenDrill('ca', data.name, certs, Number(Array.isArray(data.value) ? data.value[0] : data.value));
                        }}
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
            <ScanCoverage />
          </div>
        )}

        {tab === 'slc' && <SLCDashboard openModal={openModal} />}
      </div>

      <CertDrillModal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} certs={modalCerts} />
    </div>
  );
}
