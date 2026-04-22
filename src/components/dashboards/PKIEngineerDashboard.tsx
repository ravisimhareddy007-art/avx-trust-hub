import React, { useMemo, useState } from 'react';
import {
  RefreshCw,
  LayoutDashboard,
  Wrench,
  ShieldCheck,
  ChevronDown,
  Clock,
  Info,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutGrid,
  Key,
  CheckCircle2,
} from 'lucide-react';
import CAHealthStrip from './clm/CAHealthStrip';
import ExpiryCalendar from './clm/ExpiryCalendar';
import RenewalPipeline from './clm/RenewalPipeline';
import CLMActionTrend from './clm/CLMActionTrend';
import FailedRenewals from './clm/FailedRenewals';
import NonStandardCerts from './clm/NonStandardCerts';
import AlgorithmStrength from './clm/AlgorithmStrength';
import SLCCompliance from './clm/SLCCompliance';
import ScanCoverage from './clm/ScanCoverage';
import SLCDashboard from './clm/SLCDashboard';
import CertActionCenter from './clm/CertActionCenter';
import { mockAssets } from '@/data/mockData';
import { mockITAssets } from '@/data/inventoryMockData';
import { computeCRS } from '@/lib/risk/crs';
import { useNav } from '@/context/NavigationContext';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type CLMTab = 'overview' | 'operations' | 'risk' | 'slc';

const CERT_TYPES = ['All Certificates', 'TLS / SSL', 'Code Signing', 'K8s Workload', 'SSH Certificate'];
const CA_FILTERS = ['All CAs', 'DigiCert', 'Entrust', "Let's Encrypt", 'MSCA Enterprise'];

const TABS: { id: CLMTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',      icon: LayoutDashboard },
  { id: 'operations', label: 'Operations',     icon: Wrench },
  { id: 'risk',       label: 'Risk & Crypto',  icon: ShieldCheck },
  { id: 'slc', label: 'Short-Lived Certs', icon: Clock },
];

export default function PKIEngineerDashboard() {
  const [tab, setTab]           = useState<CLMTab>('overview');
  const [certType, setCertType] = useState('All Certificates');
  const [caFilter, setCaFilter] = useState('All CAs');
  const [drillSeverity, setDrillSeverity] = useState('');
  const [drillOpen, setDrillOpen] = useState(false);
  const { setCurrentPage, setFilters } = useNav();

  const certAssets = useMemo(
    () => mockAssets.filter((asset) => asset.type.includes('Certificate')),
    []
  );

  const codeSigningCount = useMemo(
    () => mockAssets.filter((asset) => asset.type === 'Code-Signing Certificate').length,
    []
  );

  const certsWithScores = useMemo(
    () => certAssets.map((asset) => ({ ...asset, crs: computeCRS(asset).crs })),
    [certAssets]
  );

  const severityBuckets = useMemo(() => {
    const critical = certsWithScores.filter(({ crs }) => crs >= 80);
    const high = certsWithScores.filter(({ crs }) => crs >= 60 && crs < 80);
    const medium = certsWithScores.filter(({ crs }) => crs >= 30 && crs < 60);
    const low = certsWithScores.filter(({ crs }) => crs > 0 && crs < 30);
    const compliant = certsWithScores.filter(({ crs, policyViolations }) => crs === 0 || (policyViolations === 0 && crs < 20));

    return [
      { name: 'Critical', count: critical.length, color: 'hsl(0 72% 51%)' },
      { name: 'High', count: high.length, color: 'hsl(0 72% 62%)' },
      { name: 'Medium', count: medium.length, color: 'hsl(38 90% 55%)' },
      { name: 'Low', count: low.length, color: 'hsl(48 80% 55%)' },
      { name: 'Compliant', count: compliant.length, color: 'hsl(var(--teal))' },
    ];
  }, [certsWithScores]);

  const overallScore = useMemo(() => {
    const total = certsWithScores.length || 1;
    const critical = severityBuckets.find((bucket) => bucket.name === 'Critical')?.count ?? 0;
    const high = severityBuckets.find((bucket) => bucket.name === 'High')?.count ?? 0;
    const medium = severityBuckets.find((bucket) => bucket.name === 'Medium')?.count ?? 0;
    const low = severityBuckets.find((bucket) => bucket.name === 'Low')?.count ?? 0;

    return Math.max(0, 100 - Math.round(((critical * 4 + high * 3 + medium * 2 + low) / (total * 4)) * 100));
  }, [certsWithScores.length, severityBuckets]);

  const scoreLabel = overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : overallScore >= 20 ? 'Poor' : 'Bad';

  const expiryBuckets = useMemo(() => {
    const computed = {
      expired: certAssets.filter((asset) => asset.daysToExpiry < 0 || asset.status === 'Expired').length,
      oneTo10: certAssets.filter((asset) => asset.daysToExpiry >= 0 && asset.daysToExpiry <= 10).length,
      elevenTo30: certAssets.filter((asset) => asset.daysToExpiry >= 11 && asset.daysToExpiry <= 30).length,
      thirtyOneTo90: certAssets.filter((asset) => asset.daysToExpiry >= 31 && asset.daysToExpiry <= 90).length,
    };

    const total = Object.values(computed).reduce((sum, value) => sum + value, 0);
    return total > 0
      ? computed
      : { expired: 3, oneTo10: 7, elevenTo30: 12, thirtyOneTo90: 28 };
  }, [certAssets]);

  const scanTypeData = useMemo(() => {
    const scanDefs = [
      { name: 'Managed Device', pattern: /managed|agent|device/i },
      { name: 'Network Scan', pattern: /network/i },
      { name: 'CA Scan', pattern: /ca|certificate/i },
      { name: 'Cloud Scan', pattern: /cloud|aws|azure|gcp/i },
      { name: 'CT Log Scan', pattern: /ct|log/i },
      { name: 'K8s Scan', pattern: /k8s|kubernetes|istio|envoy/i },
    ];

    const derived = scanDefs.map((def) => ({
      name: def.name,
      value: certAssets.filter((asset) => asset.tags.some((tag) => def.pattern.test(tag))).length,
    }));

    const activeCategories = derived.filter((item) => item.value > 0).length;
    if (activeCategories >= 2) return derived;

    const total = certAssets.length;
    return [
      { name: 'Managed Device', value: Math.round(total * 0.42) },
      { name: 'Network Scan', value: Math.round(total * 0.28) },
      { name: 'CA Scan', value: Math.round(total * 0.15) },
      { name: 'Cloud Scan', value: Math.round(total * 0.08) },
      { name: 'CT Log Scan', value: Math.round(total * 0.05) },
      { name: 'K8s Scan', value: Math.round(total * 0.02) },
    ];
  }, [certAssets]);

  const issuingCaData = useMemo(() => {
    const grouped = certAssets.reduce<Record<string, number>>((acc, asset) => {
      const issuer = asset.caIssuer || 'Unknown';
      acc[issuer] = (acc[issuer] ?? 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      color: ['hsl(230 60% 60%)', 'hsl(280 50% 60%)', 'hsl(200 70% 55%)', 'hsl(250 55% 65%)'][index % 4],
    }));

    if (entries.length >= 4) return entries.slice(0, 4);

    const total = certAssets.length;
    return [
      { name: 'DigiCert', value: Math.round(total * 0.45), color: 'hsl(230 60% 60%)' },
      { name: 'Entrust', value: Math.round(total * 0.2), color: 'hsl(280 50% 60%)' },
      { name: "Let's Encrypt", value: Math.round(total * 0.25), color: 'hsl(200 70% 55%)' },
      { name: 'MSCA Enterprise', value: Math.round(total * 0.1), color: 'hsl(250 55% 65%)' },
    ];
  }, [certAssets]);

  const donutData = useMemo(
    () => [
      { name: 'Expired', value: expiryBuckets.expired, color: 'hsl(var(--coral))' },
      { name: '1 - 10 days', value: expiryBuckets.oneTo10, color: 'hsl(0 72% 62%)' },
      { name: '11 - 30 days', value: expiryBuckets.elevenTo30, color: 'hsl(var(--amber))' },
      { name: '31 - 90 days', value: expiryBuckets.thirtyOneTo90, color: 'hsl(48 80% 55%)' },
    ],
    [expiryBuckets]
  );

  const totalExpiryCerts = donutData.reduce((sum, item) => sum + item.value, 0);

  const gaugeSegments = useMemo(() => {
    const startAngle = -220;
    const endAngle = 40;
    const totalSweep = endAngle - startAngle;
    const radius = 52;
    const center = 64;
    const polarToCartesian = (angle: number) => {
      const radians = ((angle - 90) * Math.PI) / 180;
      return {
        x: center + radius * Math.cos(radians),
        y: center + radius * Math.sin(radians),
      };
    };

    const describeArc = (from: number, to: number) => {
      const start = polarToCartesian(to);
      const end = polarToCartesian(from);
      const largeArcFlag = to - from <= 180 ? '0' : '1';
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    const segments = [
      { label: 'BAD', from: 0, to: 20, color: 'hsl(var(--coral))' },
      { label: 'POOR', from: 20, to: 40, color: 'hsl(25 90% 55%)' },
      { label: 'FAIR', from: 40, to: 60, color: 'hsl(var(--amber))' },
      { label: 'GOOD', from: 60, to: 80, color: 'hsl(210 80% 56%)' },
      { label: 'EXCELLENT', from: 80, to: 100, color: 'hsl(var(--teal))' },
    ];

    return segments.map((segment) => {
      const fromAngle = startAngle + (segment.from / 100) * totalSweep;
      const toAngle = startAngle + (segment.to / 100) * totalSweep;
      const labelAngle = startAngle + (((segment.from + segment.to) / 2) / 100) * totalSweep;
      const labelRadius = 68;
      const labelRadians = ((labelAngle - 90) * Math.PI) / 180;

      return {
        ...segment,
        path: describeArc(fromAngle, toAngle),
        labelX: center + labelRadius * Math.cos(labelRadians),
        labelY: center + labelRadius * Math.sin(labelRadians),
      };
    });
  }, []);

  const filledGaugePath = useMemo(() => {
    const center = 64;
    const radius = 52;
    const startAngle = -220;
    const endAngle = startAngle + (Math.max(0, Math.min(100, overallScore)) / 100) * 260;
    const polarToCartesian = (angle: number) => {
      const radians = ((angle - 90) * Math.PI) / 180;
      return {
        x: center + radius * Math.cos(radians),
        y: center + radius * Math.sin(radians),
      };
    };
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }, [overallScore]);

  const handleRefresh = () => toast.success('CLM overview refreshed');
  const handleSeverityNavigate = (severityName: string) => {
    setDrillSeverity(severityName);
    setDrillOpen(true);
  };

  return (
    <div className="space-y-0 max-h-[calc(100vh-120px)] flex flex-col">

      {/* Header */}
      <div className="flex items-end justify-between pt-1 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Certificate Lifecycle Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Cert type filter */}
          <div className="relative">
            <select
              value={certType}
              onChange={e => setCertType(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
            >
              {CERT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* CA filter */}
          <div className="relative">
            <select
              value={caFilter}
              onChange={e => setCaFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
            >
              {CA_FILTERS.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <span className="text-xs text-muted-foreground">Refreshed 0m ago</span>
          <button className="p-1 hover:text-foreground text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-border flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-teal text-teal'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pt-4">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-4 pr-1 pb-2">
            <div className="grid gap-4">
              <section className="bg-card border border-border rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Inventory Snapshot</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>0m ago</span>
                    <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <Info className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: 'Total Certificates', value: certAssets.length },
                    { label: 'Cert Manager', value: 0, mutedSuffix: 'not configured' },
                    { label: 'Total Issuing CAs', value: 4 },
                    { label: 'Code Signing Certificates', value: codeSigningCount },
                    { label: 'Total Devices', value: mockITAssets.length },
                  ].map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-lg border border-border bg-card px-4 py-3"
                      style={{ borderLeftWidth: 4, borderLeftColor: 'hsl(var(--purple))' }}
                    >
                      <div className="text-2xl font-bold text-foreground">{tile.value}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tile.label}</div>
                      {tile.mutedSuffix ? <div className="mt-1 text-[10px] text-muted-foreground">{tile.mutedSuffix}</div> : null}
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-12">
                <section className="bg-card border border-border rounded-xl p-5 xl:col-span-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Crypto Score</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>0m ago</span>
                      <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <Info className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <div className="flex flex-col items-center gap-3">
                        <svg viewBox="0 0 128 128" className="h-32 w-32 overflow-visible">
                          {gaugeSegments.map((segment) => (
                            <path key={segment.label} d={segment.path} fill="none" stroke={segment.color} strokeWidth="10" strokeLinecap="round" opacity="0.3" />
                          ))}
                          <path d={filledGaugePath} fill="none" stroke="hsl(var(--teal))" strokeWidth="10" strokeLinecap="round" />
                          {gaugeSegments.map((segment) => (
                            <text
                              key={`${segment.label}-label`}
                              x={segment.labelX}
                              y={segment.labelY}
                              textAnchor="middle"
                              className="fill-muted-foreground text-[8px]"
                            >
                              {segment.label}
                            </text>
                          ))}
                          <text x="64" y="60" textAnchor="middle" className="fill-foreground text-[22px] font-bold">
                            {overallScore}
                          </text>
                          <text x="64" y="78" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                            Crypto Score
                          </text>
                        </svg>

                        <div className="flex w-full items-center gap-1 rounded border border-border bg-secondary/40 p-2 text-[10px] text-foreground" style={{ backgroundColor: 'hsl(var(--coral) / 0.1)', borderColor: 'hsl(var(--coral) / 0.2)' }}>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--coral))' }} />
                          <span>Crypto Score: {overallScore}/100 ({scoreLabel})</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 lg:col-span-3">
                      {severityBuckets.map((bucket) => {
                        const percentage = certAssets.length ? Math.round((bucket.count / certAssets.length) * 100) : 0;
                        return (
                          <button
                            key={bucket.name}
                            type="button"
                            onClick={() => handleSeverityNavigate(bucket.name)}
                            className="flex w-full items-center text-left"
                          >
                            <span className="w-20 text-xs font-semibold text-foreground">{bucket.name}</span>
                            <div className="mx-3 flex-1 rounded-full bg-secondary/50">
                              <div
                                className="h-5 min-w-[4px] rounded-full"
                                style={{ width: `${Math.max(percentage, bucket.count > 0 ? 4 : 0)}%`, backgroundColor: bucket.color }}
                              />
                            </div>
                            <span className="ml-2 text-xs tabular-nums text-muted-foreground">{bucket.count} · {percentage}%</span>
                          </button>
                        );
                      })}

                      <div className="flex gap-1 rounded border p-2 text-[10px]" style={{ backgroundColor: 'hsl(var(--amber) / 0.1)', borderColor: 'hsl(var(--amber) / 0.2)' }}>
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--amber))' }} />
                        <span><strong>Click any of the above Certificate Severity categories to remediate</strong></span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-card border border-border rounded-xl p-5 xl:col-span-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Certificate Expiry</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>0m ago</span>
                      <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <Info className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                            {donutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{totalExpiryCerts}</span>
                        <span className="text-xs text-muted-foreground">Certs</span>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-4 text-muted-foreground">
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4" />
                    </div>

                    <div className="w-full space-y-2">
                      {donutData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: item.color }} />
                          <span>{item.name} [{item.value}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-12">
                <section className="bg-card border border-border rounded-xl p-5 xl:col-span-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Certificates based on Scan Type</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>0m ago</span>
                      <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <Info className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scanTypeData} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: 'Certificate Counts', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 } }}
                        />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="value" fill="hsl(230 60% 60%)" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="bg-card border border-border rounded-xl p-5 xl:col-span-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">DNS Overview</h3>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: Globe, label: 'DNS Records', value: 0 },
                      { icon: LayoutGrid, label: 'Domains', value: 0 },
                      { icon: Key, label: 'Signing keys', value: 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
                        <div className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="bg-card border border-border rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Certificates by Issuing CAs</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>0m ago</span>
                    <button type="button" onClick={handleRefresh} className="transition-colors hover:text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <Info className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={issuingCaData} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: 'Certificate Counts', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 } }}
                      />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'hsl(var(--foreground))', fontSize: 10 }}>
                        {issuingCaData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <CLMActionTrend />
            </div>
          </div>
        )}

        {/* OPERATIONS */}
        {tab === 'operations' && (
          <div className="space-y-4 pr-1">
            <RenewalPipeline />
            <ExpiryCalendar />
            <FailedRenewals />
          </div>
        )}

        {/* RISK & CRYPTO */}
        {tab === 'risk' && (
          <div className="space-y-4 pr-1">
            <NonStandardCerts />
            <AlgorithmStrength />
            <SLCCompliance />
            <ScanCoverage />
          </div>
        )}
        
        {/* SHORT LIVED CERTS */}
        {tab === 'slc' && <SLCDashboard />}

      </div>

      <CertActionCenter
        open={drillOpen}
        severityFilter={drillSeverity}
        setOpen={setDrillOpen}
        setSeverityFilter={setDrillSeverity}
      />
    </div>
  );
}
