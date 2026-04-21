import React, { useState } from 'react';
import { Clock, RefreshCw, Shield, AlertTriangle, RotateCcw, Send, Key, Ruler } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

/* ── data ── */
const certs = mockAssets.filter(a => a.type?.includes('Certificate'));
const shortLived = certs.filter(a => a.daysToExpiry >= 0 && a.daysToExpiry <= 90);

const total = shortLived.length || 847;
const autoRenewalEnabled = shortLived.filter(a => a.autoRenewal === true).length || 634;
const complianceScore = total > 0 && shortLived.length > 0
  ? Math.round((autoRenewalEnabled / total) * 100)
  : 74;

const under48 = shortLived.filter(a => a.daysToExpiry < 2).length || 23;
const fortyEightTo100 = shortLived.filter(a => a.daysToExpiry >= 2 && a.daysToExpiry <= 4).length || 89;
const oneHundredTo200 = shortLived.filter(a => a.daysToExpiry > 4 && a.daysToExpiry <= 8).length || 142;
const twoHundredPlus = shortLived.filter(a => a.daysToExpiry > 8).length || 593;

const ageBuckets = [
  { label: '0-48 hours', value: under48, color: 'hsl(var(--coral))' },
  { label: '48-100 hours', value: fortyEightTo100, color: 'hsl(var(--amber))' },
  { label: '101-200 hours', value: oneHundredTo200, color: 'hsl(210 80% 56%)' },
  { label: '200+ hours', value: twoHundredPlus, color: 'hsl(var(--teal))' },
];

const pushStatus = [
  { title: 'Regenerated Certs', icon: RotateCcw, pushed: 312, notPushed: 89 },
  { title: 'Re-Enrolled Certs', icon: RefreshCw, pushed: 445, notPushed: 67 },
  { title: 'Renewed Certs', icon: Send, pushed: 521, notPushed: 113 },
];

const renewValidity = [
  { name: 'Overdue', value: 23 },
  { name: 'Due this week', value: 89 },
  { name: 'Due this month', value: 187 },
  { name: 'Due later', value: 548 },
];
const renewColors = ['hsl(var(--coral))', 'hsl(var(--amber))', 'hsl(var(--purple))', 'hsl(var(--teal))'];

const keyAlgoData = [
  { name: 'RSA', value: 601 },
  { name: 'ECC P-256', value: 152 },
  { name: 'ECC P-384', value: 68 },
  { name: 'Ed25519', value: 26 },
];
const keyAlgoColors = ['hsl(var(--amber))', 'hsl(var(--purple))', 'hsl(210 80% 56%)', 'hsl(var(--teal))'];

const keyLenData = [
  { name: '2048', value: 381, pct: 45 },
  { name: '3072', value: 102, pct: 12 },
  { name: '4096', value: 322, pct: 38 },
  { name: 'Other', value: 42, pct: 5 },
];
const keyLenColors = ['hsl(var(--amber))', 'hsl(210 80% 56%)', 'hsl(var(--teal))', 'hsl(var(--muted-foreground))'];

const trendValues = [68, 69, 70, 71, 70, 72, 73, 74, 74, 75, 74, 76, 75, 74];
const trendData = trendValues.map((v, i) => {
  const d = new Date(2025, 3, 8 + i);
  return { day: `Apr ${d.getDate()}`, score: v };
});

const pushAutoData = [
  { name: 'Auto-Renewal', enabled: 634, disabled: 213 },
  { name: 'Auto-Regenerate', enabled: 445, disabled: 402 },
];

/* ── gauge arc helper ── */
function SLCGauge({ score }: { score: number }) {
  const r = 52, cx = 60, cy = 60, sw = 10;
  const startAngle = -220, endAngle = 40;
  const range = endAngle - startAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number) => {
    const s = toRad(start), e = toRad(end);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const fillEnd = startAngle + (range * score) / 100;
  const color = score > 80 ? 'hsl(var(--teal))' : score >= 60 ? 'hsl(var(--amber))' : 'hsl(var(--coral))';

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 mx-auto">
      <path d={arcPath(startAngle, endAngle)} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} strokeLinecap="round" />
      <path d={arcPath(startAngle, fillEnd)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground text-xl font-bold">{score}%</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>SLC Compliance</text>
    </svg>
  );
}

/* ── donut center label ── */
function DonutCenter({ cx, cy, label, sub }: { cx: number; cy: number; label: string; sub: string }) {
  return (
    <>
      <text x={cx} y={cy - 2} textAnchor="middle" className="fill-foreground text-lg font-bold">{label}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>{sub}</text>
    </>
  );
}

/* ── main ── */
export default function SLCDashboard() {
  const { setCurrentPage } = useNav();
  const [trendMode, setTrendMode] = useState<'daily' | 'weekly'>('daily');
  const scoreColor = complianceScore > 80 ? 'text-teal' : complianceScore >= 60 ? 'text-amber' : 'text-coral';
  const notCovered = total - autoRenewalEnabled;
  const rsaPct = Math.round((601 / total) * 100);

  return (
    <div className="space-y-4 pr-1">

      {/* ROW 1 */}
      <div className="grid grid-cols-12 gap-4">
        {/* SLC Compliance Score */}
        <div className="col-span-5 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">SLC Compliance Score</h3>
          </div>
          <div className="flex gap-4">
            <div className="w-[40%] flex flex-col items-center">
              <SLCGauge score={complianceScore} />
              <p className="text-[9px] text-muted-foreground italic mt-2 text-center">
                CA/Browser Forum mandates 90-day max TLS validity from 2025
              </p>
            </div>
            <div className="w-[60%] space-y-2">
              {ageBuckets.map(b => {
                const pct = Math.round((b.value / total) * 100);
                return (
                  <div key={b.label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="text-foreground font-medium">{b.value} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inventory Snapshot */}
        <div className="col-span-7 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Inventory Snapshot</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total SLC', value: total, cls: 'text-teal' },
              { label: 'Expiring < 48h', value: under48, cls: 'text-coral' },
              { label: 'Auto-renewal enabled', value: autoRenewalEnabled, cls: 'text-teal' },
              { label: 'Not covered', value: notCovered, cls: 'text-amber' },
            ].map(k => (
              <div key={k.label} className="bg-secondary/40 rounded-lg p-3 border border-border">
                <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 2 — Push Status */}
      <div className="grid grid-cols-12 gap-4">
        {pushStatus.map(ps => {
          const t = ps.pushed + ps.notPushed;
          const pPct = Math.round((ps.pushed / t) * 100);
          return (
            <div key={ps.title} className="col-span-4 bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ps.icon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">{ps.title}</h3>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex">
                <div className="h-full bg-teal rounded-l-full" style={{ width: `${pPct}%` }} />
                <div className="h-full bg-coral rounded-r-full" style={{ width: `${100 - pPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-2">
                <span className="text-teal font-medium">Pushed: {ps.pushed}</span>
                <span className="text-coral font-medium">Not Pushed: {ps.notPushed}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ROW 3 — Donuts + Push Automation */}
      <div className="grid grid-cols-12 gap-4">
        {/* Age Validity */}
        <div className="col-span-4 bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-foreground mb-2">Age (Validity Period)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={ageBuckets.map(b => ({ name: b.label, value: b.value }))} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                {ageBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
            {ageBuckets.map(b => (
              <span key={b.label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: b.color }} />
                {b.label}: {b.value}
              </span>
            ))}
          </div>
        </div>

        {/* Next Renew Validity */}
        <div className="col-span-4 bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-foreground mb-2">Next Renew Validity</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={renewValidity} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                {renewValidity.map((_, i) => <Cell key={i} fill={renewColors[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
            {renewValidity.map((r, i) => (
              <span key={r.name} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: renewColors[i] }} />
                {r.name}: {r.value}
              </span>
            ))}
          </div>
        </div>

        {/* Push Automation Status */}
        <div className="col-span-4 bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-foreground mb-2">Push Automation Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pushAutoData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="enabled" name="Enabled" fill="hsl(var(--teal))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="disabled" name="Disabled" fill="hsl(var(--coral))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 4 — Key Algo + Key Length */}
      <div className="grid grid-cols-12 gap-4">
        {/* Key Algorithm */}
        <div className="col-span-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground">Key Algorithm</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={keyAlgoData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                {keyAlgoData.map((_, i) => <Cell key={i} fill={keyAlgoColors[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
            {keyAlgoData.map((k, i) => (
              <span key={k.name} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: keyAlgoColors[i] }} />
                {k.name}: {k.value}
              </span>
            ))}
          </div>
          {rsaPct > 50 && (
            <p className="text-[10px] text-amber mt-2">
              ⚠ {rsaPct}% of SLC certs use quantum-vulnerable algorithms (RSA/ECC). NIST FIPS 203/204 migration required before 2030.
            </p>
          )}
        </div>

        {/* Key Length */}
        <div className="col-span-6 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground">Key Length</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={keyLenData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                {keyLenData.map((_, i) => <Cell key={i} fill={keyLenColors[i]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
            {keyLenData.map((k, i) => (
              <span key={k.name} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: keyLenColors[i] }} />
                {k.name}: {k.value}
              </span>
            ))}
          </div>
          {keyLenData[0].pct > 30 && (
            <p className="text-[10px] text-amber mt-2">
              RSA-2048 key length is legacy. Migrate to RSA-4096 or ECC P-384.
            </p>
          )}
        </div>
      </div>

      {/* ROW 5 — Score Trend */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground">SLC Score Trend</h3>
            <div className="flex gap-1">
              {(['daily', 'weekly'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTrendMode(m)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    trendMode === m ? 'bg-teal/20 text-teal' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine y={80} stroke="hsl(var(--teal))" strokeDasharray="6 3" label={{ value: 'Target', position: 'right', fill: 'hsl(var(--teal))', fontSize: 9 }} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {complianceScore < 80 && (
            <p className="text-[10px] text-amber mt-2">
              Below target — auto-renewal coverage needs improvement
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
