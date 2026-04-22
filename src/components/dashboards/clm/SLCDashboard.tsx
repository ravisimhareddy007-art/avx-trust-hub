import React, { useState, useRef, useEffect } from 'react';
import { ESTATE_SUMMARY, mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Clock, RefreshCw, Shield, AlertTriangle, RotateCcw,
  Send, Key, Ruler, SlidersHorizontal, ChevronDown, XCircle,
  ArrowRight, ExternalLink,
} from 'lucide-react';
import type { CertCounts } from './types';

const T = {
  teal:   'hsl(160 70% 37%)',
  amber:  'hsl(38 78% 41%)',
  coral:  'hsl(15 72% 52%)',
  purple: 'hsl(280 65% 55%)',
  blue:   'hsl(210 80% 56%)',
  muted:  'hsl(220 9% 46%)',
};

const GROUPS = ['Default', 'Certificate-Gateway', 'Private_CA_Certificates', 'Public_CA_Certificates'];

const shortLived = mockAssets.filter(
  a => (a.type || '').includes('Certificate') && a.daysToExpiry != null && a.daysToExpiry >= 0 && a.daysToExpiry <= 90,
);

const total = ESTATE_SUMMARY.certsExpiring30d;
const autoRenewalEnabled = 198;
const notCovered = total - autoRenewalEnabled;
const complianceScore = 70;

const ageBuckets = [
  { label: '0-48 hours', count: 12, pct: 0, color: T.coral, tw: 'bg-coral' },
  { label: '3-7 days',   count: 34, pct: 0, color: T.amber, tw: 'bg-amber' },
  { label: '8-30 days',  count: 67, pct: 0, color: T.purple, tw: 'bg-purple-light' },
  { label: '31-90 days', count: 171, pct: 0, color: T.teal, tw: 'bg-teal' },
];
ageBuckets.forEach(b => { b.pct = Math.round((b.count / total) * 100); });

const pushCards = [
  { title: 'Regenerated Certs', icon: RotateCcw, pushed: 312, notPushed: 89, note: '89 certs regenerated but not yet deployed to target systems', modalTitle: 'Regenerated – Not Pushed' },
  { title: 'Re-Enrolled Certs', icon: RefreshCw, pushed: 445, notPushed: 67, note: '67 certs pending push to endpoints', modalTitle: 'Re-Enrolled – Not Pushed' },
  { title: 'Renewed Certs',     icon: Send,      pushed: 521, notPushed: 113, note: '113 renewed certs awaiting deployment', modalTitle: 'Renewed – Not Pushed' },
];

const failureReasons = [
  { reason: 'CA timeout (>30s)',   count: 48, tw: 'bg-coral' },
  { reason: 'Auth token expired',  count: 31, tw: 'bg-coral' },
  { reason: 'ACME rate limit hit', count: 27, tw: 'bg-amber' },
  { reason: 'CA quota exceeded',   count: 19, tw: 'bg-amber' },
  { reason: 'Template mismatch',   count: 14, tw: 'bg-amber' },
  { reason: 'EST config drift',    count: 8,  tw: 'bg-muted-foreground' },
];

const keyAlgo = [
  { name: 'RSA-2048', value: 601, color: T.amber },
  { name: 'ECC P-256', value: 152, color: T.purple },
  { name: 'ECC P-384', value: 68,  color: T.blue },
  { name: 'Ed25519',   value: 26,  color: T.teal },
];
const keyLen = [
  { name: '2048', value: 381, color: T.amber },
  { name: '3072', value: 102, color: T.blue },
  { name: '4096', value: 322, color: T.teal },
  { name: 'Other', value: 42, color: T.muted },
];
const protocols = [
  { name: 'ACME',   value: 567, pct: 67, color: T.teal },
  { name: 'SCEP',   value: 152, pct: 18, color: T.purple },
  { name: 'EST',    value: 93,  pct: 11, color: T.blue },
  { name: 'Manual', value: 35,  pct: 4,  color: T.coral },
];

const forecast = (() => {
  const raw = [
    { expiring: 23, inPipeline: 20, atRisk: 3 },
    { expiring: 12, inPipeline: 12, atRisk: 0 },
    { expiring: 8,  inPipeline: 5,  atRisk: 3 },
    { expiring: 47, inPipeline: 31, atRisk: 16 },
    { expiring: 6,  inPipeline: 6,  atRisk: 0 },
    { expiring: 31, inPipeline: 18, atRisk: 13 },
    { expiring: 4,  inPipeline: 4,  atRisk: 0 },
  ];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();
  return raw.map((d, i) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[dt.getDay()];
    return { ...d, day: label, index: i };
  });
})();
const anyAtRisk = forecast.some(d => d.atRisk > 0);
const riskDays = forecast.filter(d => d.atRisk > 0);

const scoreTrend = [68,69,70,71,70,72,73,74,74,75,74,76,75,74].map((v, i) => {
  const d = new Date(); d.setDate(d.getDate() - 13 + i);
  return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), score: v };
});

function SLCGauge({ score }: { score: number }) {
  const R = 52, cx = 64, cy = 64;
  const startAngle = -220, totalDegrees = 260;
  const filled = (score / 100) * totalDegrees;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = { x: cx + R * Math.cos(toRad(start)), y: cy + R * Math.sin(toRad(start)) };
    const e = { x: cx + R * Math.cos(toRad(end)),   y: cy + R * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const hsl = score > 80 ? T.teal : score >= 60 ? T.amber : T.coral;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <path d={arcPath(startAngle, startAngle + totalDegrees)} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(startAngle, startAngle + filled)} fill="none" stroke={hsl} strokeWidth="10" strokeLinecap="round" style={{ transition: 'all .7s ease' }} />
      <text x="64" y="60" textAnchor="middle" fontSize="28" fontWeight="bold" fill={hsl}>{score}%</text>
      <text x="64" y="78" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">SLC Compliance</text>
    </svg>
  );
}

type SLCDashboardProps = {
  openModal?: (title: string, certs: any[]) => void;
  certCounts: CertCounts;
};

export default function SLCDashboard({ openModal }: SLCDashboardProps) {
  const { setCurrentPage, setFilters } = useNav();

  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([...GROUPS]);
  const [groupSearch, setGroupSearch] = useState('');
  const groupRef = useRef<HTMLDivElement>(null);
  const [serverType, setServerType] = useState('All Server Certificates');
  const [trendMode, setTrendMode] = useState<'Daily' | 'Weekly'>('Daily');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleGroup = (g: string) => setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const allSelected = selectedGroups.length === GROUPS.length;
  const toggleAll = () => setSelectedGroups(allSelected ? [] : [...GROUPS]);
  const filteredGroups = GROUPS.filter(g => g.toLowerCase().includes(groupSearch.toLowerCase()));

  const openInventory = (extra: Record<string, string> = {}) => {
    setFilters({ type: 'TLS Certificate', slc: 'true', ...extra });
    setCurrentPage('inventory');
  };

  const openSLCModal = (title: string, certs: any[]) => {
    openModal?.(title, certs.length > 0 ? certs : shortLived);
  };

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>{children}</div>
  );

  return (
    <div className="space-y-4 pr-1">
      <div className="flex items-center justify-end gap-2 border-b border-border pb-3 mb-4">
        <div className="relative" ref={groupRef}>
          <button onClick={() => setGroupOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
            <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
            {allSelected ? 'All Certificates' : `${selectedGroups.length} groups`}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {groupOpen && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 w-64 p-3 space-y-2">
              <input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Search group(s)..."
                className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-teal w-3.5 h-3.5" />
                <span className="font-medium text-foreground">Select All</span>
              </label>
              {filteredGroups.map(g => (
                <label key={g} className={`flex items-center gap-2 text-xs cursor-pointer ${g !== 'Default' ? 'pl-4' : ''}`}>
                  <input type="checkbox" checked={selectedGroups.includes(g)} onChange={() => toggleGroup(g)} className="accent-teal w-3.5 h-3.5" />
                  <span className={g === 'Default' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{g}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <select value={serverType} onChange={e => setServerType(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none cursor-pointer">
            <option>All Server Certificates</option>
            <option>Public Server Certificates</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-5">
          <div className="flex gap-4">
            <button onClick={() => openInventory()} className="w-[40%] flex flex-col items-center cursor-pointer hover:text-teal transition-colors">
              <SLCGauge score={complianceScore} />
              <p className="text-[10px] text-muted-foreground italic text-center mt-1">CA/Browser Forum: 90-day max TLS validity from 2025</p>
            </button>
            <div className="w-[60%] space-y-2.5">
              {ageBuckets.map(b => (
                <div key={b.label} className="space-y-0.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="text-foreground tabular-nums">{b.count} ({b.pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${b.tw}`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="col-span-7">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total SLC', value: total, color: 'text-teal', onClick: () => openInventory(), pattern: 'inventory' },
              { label: 'Expiring < 48h', value: 12, color: 'text-coral', sub: 'immediate risk', onClick: () => openSLCModal('SLC Expiring < 48h', shortLived.filter(a => a.daysToExpiry <= 2)), pattern: 'modal' },
              { label: 'Auto-renewal on', value: autoRenewalEnabled, color: 'text-teal', onClick: () => openInventory({ autoRenewal: 'true' }), pattern: 'inventory' },
              { label: 'No renewal plan', value: notCovered, color: 'text-amber', sub: 'manual intervention needed', onClick: () => openSLCModal('No Renewal Plan', shortLived.filter(a => !a.autoRenewal)), pattern: 'modal' },
            ].map(k => (
              <button key={k.label} onClick={k.onClick} className={`group rounded-lg bg-secondary/30 border border-border p-3 text-left ${k.pattern === 'modal' ? 'cursor-pointer hover:bg-secondary/40 transition-colors' : 'cursor-pointer hover:text-teal transition-colors'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-[11px] text-muted-foreground">{k.label}</p>
                    {k.sub && <p className="text-[9px] text-muted-foreground mt-0.5">{k.sub}</p>}
                  </div>
                  {k.pattern === 'modal' ? <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" /> : <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {pushCards.map(c => {
          const tot = c.pushed + c.notPushed;
          return (
            <Card key={c.title}>
              <div className="flex items-center gap-2 mb-3">
                <c.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{c.title}</span>
              </div>
              <div className="h-4 w-full rounded-full overflow-hidden flex">
                <div className="bg-teal h-full" style={{ width: `${(c.pushed / tot) * 100}%` }} />
                <div className="bg-coral h-full" style={{ width: `${(c.notPushed / tot) * 100}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-teal">Pushed: {c.pushed}</span>
                <button onClick={() => openSLCModal(c.modalTitle, shortLived.slice(0, c.notPushed))} className="group inline-flex items-center gap-1 text-coral transition-colors hover:text-foreground">
                  <span>Not Pushed: {c.notPushed}</span>
                  <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{c.note}</p>
              <div className="mt-2 flex justify-end">
                <button onClick={() => openSLCModal(c.modalTitle, shortLived.slice(0, c.notPushed))} className="inline-flex items-center gap-1 text-[10px] text-teal hover:underline">
                  Review & Fix
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-7">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Cert Lifecycle Distribution</span>
          </div>
          <div className="h-10 w-full rounded-full overflow-hidden flex">
            <button type="button" onClick={() => openSLCModal('SLC Critical Zone', shortLived.filter(a => a.daysToExpiry <= 2))} style={{ width: `${ageBuckets[0].pct}%`, backgroundColor: ageBuckets[0].color }} className="h-full cursor-pointer transition-opacity hover:opacity-80" />
            <button type="button" onClick={() => openSLCModal('SLC Renewal Window', shortLived.filter(a => a.daysToExpiry > 2 && a.daysToExpiry <= 30))} style={{ width: `${ageBuckets[1].pct + ageBuckets[2].pct}%`, background: `linear-gradient(90deg, ${ageBuckets[1].color}, ${ageBuckets[2].color})` }} className="h-full cursor-pointer transition-opacity hover:opacity-80" />
            <button type="button" onClick={() => openInventory({ lifecycle: 'healthy' })} style={{ width: `${ageBuckets[3].pct}%`, backgroundColor: ageBuckets[3].color }} className="h-full cursor-pointer transition-opacity hover:opacity-80" />
          </div>
          <div className="flex justify-between mt-2 text-[10px]">
            <span className="text-muted-foreground">Issued</span>
            <button onClick={() => openSLCModal('SLC Critical Zone', shortLived.filter(a => a.daysToExpiry <= 2))} className="group inline-flex items-center gap-1 text-coral transition-colors hover:text-foreground">
              <span>Critical zone (0-48h): {ageBuckets[0].count} certs</span>
              <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <button onClick={() => openSLCModal('SLC Renewal Window', shortLived.filter(a => a.daysToExpiry > 2 && a.daysToExpiry <= 30))} className="group inline-flex items-center gap-1 text-amber transition-colors hover:text-foreground">
              <span>Renewal window (3-30d): {ageBuckets[1].count + ageBuckets[2].count} certs</span>
              <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <button onClick={() => openInventory({ lifecycle: 'healthy' })} className="group inline-flex items-center gap-1 hover:text-teal transition-colors">
              <span className="text-teal">Healthy (31-90d): {ageBuckets[3].count} certs</span>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <span className="text-muted-foreground">Expiry</span>
          </div>
          <div className="mt-3 space-y-1">
            {ageBuckets[0].count > 0 && (
              <button onClick={() => openSLCModal('SLC Critical Zone', shortLived.filter(a => a.daysToExpiry <= 2))} className="group flex items-center gap-1 text-[10px] text-coral transition-colors hover:text-foreground">
                <AlertTriangle className="w-3 h-3" />
                <span>{ageBuckets[0].count} certs in critical renewal zone — auto-renewal must execute within 48 hours</span>
                <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
            <button onClick={() => openInventory({ lifecycle: 'healthy' })} className="group inline-flex items-center gap-1 text-[10px] text-teal hover:text-teal transition-colors">
              <span>{complianceScore}% of SLC estate in healthy lifecycle position</span>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>
        </Card>

        <Card className="col-span-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-coral" />
              <span className="text-xs font-medium text-foreground">Automation Failure Reasons</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Last 24h · 147 total failures</span>
          </div>
          <div className="space-y-2">
            {failureReasons.map(f => (
              <button key={f.reason} onClick={() => openSLCModal(`Failed: ${f.reason}`, shortLived.slice(0, f.count))} className="group flex w-full items-center gap-2 rounded px-1 py-1 text-left transition-colors hover:bg-secondary/30">
                <span className="text-[10px] text-muted-foreground w-32 shrink-0 truncate">{f.reason}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${f.tw}`} style={{ width: `${(f.count / 48) * 100}%` }} />
                </div>
                <span className="text-[10px] text-foreground tabular-nums w-6 text-right font-medium">{f.count}</span>
                <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button className="text-[10px] text-teal hover:underline" onClick={() => setCurrentPage('integrations')}>
              Check Integration
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Key Algorithm</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={keyAlgo}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  onClick={(_, index) => {
                    const item = keyAlgo[index];
                    if (!item) return;
                    if (item.name === 'Ed25519') {
                      openInventory({ algorithm: item.name });
                      return;
                    }
                    openSLCModal(`Quantum-Vulnerable SLC: ${item.name}`, shortLived.filter(a => a.algorithm === item.name));
                  }}
                >
                  {keyAlgo.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer" />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(225 30% 13%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="hsl(220 20% 90%)">
                  <tspan x="50%" dy="-6" fontSize="14" fontWeight="bold">847</tspan>
                  <tspan x="50%" dy="16" fontSize="9" fillOpacity="0.6">certs</tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px]">
            {keyAlgo.map(a => (
              <span key={a.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}: {a.value}
              </span>
            ))}
          </div>
          <div className="mt-2 bg-amber/10 border border-amber/30 rounded p-2 text-[10px] text-amber">
            ⚠ 97% use quantum-vulnerable algorithms (RSA/ECC). NIST FIPS 203/204 migration required before 2030.
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Key Length</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={keyLen}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  onClick={(_, index) => {
                    const item = keyLen[index];
                    if (!item) return;
                    if (item.name === '2048') {
                      openSLCModal('Weak Key Length: 2048-bit', shortLived.filter(a => a.algorithm.includes('2048') || a.keyLength === '2048'));
                      return;
                    }
                    openInventory({ keyLength: item.name });
                  }}
                >
                  {keyLen.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer" />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(225 30% 13%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="hsl(220 20% 90%)">
                  <tspan x="50%" dy="-6" fontSize="14" fontWeight="bold">847</tspan>
                  <tspan x="50%" dy="16" fontSize="9" fillOpacity="0.6">certs</tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px]">
            {keyLen.map(a => (
              <span key={a.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}: {a.value}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">RSA-2048 at 45% — migrate to RSA-4096 or ECC P-384 for stronger key security.</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Enrollment Protocol</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocols}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  onClick={(_, index) => {
                    const item = protocols[index];
                    if (!item) return;
                    if (item.name === 'Manual') {
                      openSLCModal('Manual Enrollment – Needs Automation', shortLived.slice(0, 35));
                      return;
                    }
                    openInventory({ protocol: item.name });
                  }}
                >
                  {protocols.map((e, i) => <Cell key={i} fill={e.color} className="cursor-pointer" />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(225 30% 13%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="hsl(220 20% 90%)">
                  <tspan x="50%" dy="-6" fontSize="14" fontWeight="bold">847</tspan>
                  <tspan x="50%" dy="16" fontSize="9" fillOpacity="0.6">certs</tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px]">
            {protocols.map(a => (
              <span key={a.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}: {a.value} ({a.pct}%)
              </span>
            ))}
          </div>
          <div className="mt-2 bg-coral/10 border border-coral/20 rounded p-2 text-[10px] text-coral">
            ⚠ 35 certs on manual enrollment — SLC certs must use ACME, SCEP, or EST to maintain rotation compliance.
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">7-Day SLC Outage Risk Forecast</span>
          {anyAtRisk && <AlertTriangle className="w-3.5 h-3.5 text-coral" />}
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Certificates expiring with no active renewal pipeline — each bar is a potential outage
        </p>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 20% 20%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
              <Tooltip contentStyle={{ background: 'hsl(225 30% 13%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="inPipeline" stackId="a" fill={T.teal} name="In renewal pipeline" cursor="pointer" onClick={(entry: any) => {
                const point = entry?.payload;
                if (!point?.atRisk) return;
                const certs = shortLived.filter(a => a.daysToExpiry === point.index);
                openSLCModal(`Expiring ${point.day} – No Renewal Plan`, certs.length ? certs : shortLived.slice(0, point.atRisk));
              }} />
              <Bar dataKey="atRisk" stackId="a" fill={T.coral} name="No renewal plan" radius={[3, 3, 0, 0]} cursor="pointer" onClick={(entry: any) => {
                const point = entry?.payload;
                if (!point?.atRisk) return;
                const certs = shortLived.filter(a => a.daysToExpiry === point.index && !a.autoRenewal);
                openSLCModal(`Expiring ${point.day} – No Renewal Plan`, certs.length ? certs : shortLived.slice(0, point.atRisk));
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {anyAtRisk ? (
          <div className="mt-3 bg-coral/10 border border-coral/20 rounded p-3 flex items-start justify-between">
            <p className="text-[10px] text-coral">
              {riskDays.map(d => `${d.day} (${d.atRisk} certs)`).join(' and ')} have unplanned expirations. Initiate renewal workflows now.
            </p>
            <button onClick={() => { setFilters({ module: 'clm', filter: 'expiry' }); setCurrentPage('remediation'); }}
              className="ml-3 shrink-0 px-3 py-1 bg-teal text-primary-foreground text-[10px] rounded hover:opacity-90">
              Open Remediation
            </button>
          </div>
        ) : (
          <div className="mt-3 bg-teal/10 border border-teal/20 rounded p-3 text-[10px] text-teal">
            All expiring certs this week have active renewal pipelines. No outage risk detected.
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-foreground">SLC Compliance Trend — Last 14 Days</span>
          <div className="bg-muted rounded-lg p-0.5 flex text-[10px]">
            {(['Daily', 'Weekly'] as const).map(m => (
              <button key={m} onClick={() => setTrendMode(m)}
                className={`px-3 py-1 rounded-md transition-colors ${trendMode === m ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[200px] relative cursor-pointer hover:text-teal transition-colors" onClick={() => openInventory()}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 20% 20%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} label={{ value: 'Compliance %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(220 15% 55%)' } }} />
              <Tooltip contentStyle={{ background: 'hsl(225 30% 13%)', border: '1px solid hsl(225 20% 20%)', borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine y={80} stroke={T.amber} strokeDasharray="6 3" label={{ value: 'Target (80%)', position: 'right', fill: T.amber, fontSize: 10 }} />
              <Line type="monotone" dataKey="score" stroke={T.teal} strokeWidth={2} dot={{ r: 3, fill: T.teal }} />
            </LineChart>
          </ResponsiveContainer>
          {scoreTrend[scoreTrend.length - 1].score < 80 && (
            <p className="absolute top-2 right-2 text-[10px] text-amber bg-card/80 px-2 py-1 rounded">
              Below target · auto-renewal coverage needs improvement
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
