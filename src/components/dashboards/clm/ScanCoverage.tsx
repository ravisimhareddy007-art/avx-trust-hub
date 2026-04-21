import React from 'react';
import { Search } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const certAssets = mockAssets.filter(a =>
  a.type === 'TLS Certificate' || a.type === 'Code-Signing Certificate' ||
  a.type === 'K8s Workload Cert' || a.type === 'SSH Certificate'
);

const SOURCES = [
  { key: 'managed', label: 'Managed Device', fallbackPct: 42 },
  { key: 'network-scan', label: 'Network Scan', fallbackPct: 28 },
  { key: 'ca-scan', label: 'CA Scan', fallbackPct: 15 },
  { key: 'cloud', label: 'Cloud Scan', fallbackPct: 8 },
  { key: 'ct-log', label: 'CT Log', fallbackPct: 5 },
  { key: 'k8s', label: 'K8s Scan', fallbackPct: 2 },
];

export default function ScanCoverage() {
  const total = certAssets.length || 1;

  // Try tag-based counts
  const tagCounts = SOURCES.map(s => ({
    ...s,
    count: certAssets.filter(a => a.tags?.includes(s.key)).length,
  }));

  const hasData = tagCounts.some(t => t.count > 0);

  const data = SOURCES.map(s => {
    const count = hasData
      ? tagCounts.find(t => t.key === s.key)!.count
      : Math.round((s.fallbackPct / 100) * total);
    return { name: s.label, count };
  });

  const networkPct = hasData
    ? Math.round((tagCounts.find(t => t.key === 'network-scan')!.count / total) * 100)
    : 28;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Discovery & Scan Coverage</h3>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--teal))">
            <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className={`text-xs mt-2 ${networkPct > 40 ? 'text-amber' : 'text-teal'}`}>
        {networkPct > 40
          ? '⚠ High network-discovered ratio suggests unmanaged cert sprawl'
          : '✓ Good managed device coverage'}
      </p>
    </div>
  );
}
