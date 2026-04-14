import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { KPICard, SeverityBadge, DaysToExpiry, AIInsightCard } from '@/components/shared/UIComponents';
import { violationData, assetTypeDistribution, criticalAlerts, upcomingExpirations } from '@/data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function SecurityAdminDashboard() {
  const { setCurrentPage, setFilters } = useNav();

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Total Crypto Assets" value={47382} color="teal" onClick={() => setCurrentPage('inventory')} />
        <KPICard label="Critical Violations" value={47} color="coral" onClick={() => { setFilters({ priority: 'P1' }); setCurrentPage('trustops'); }} />
        <KPICard label="Expiring in 7 Days" value={23} color="coral" onClick={() => { setFilters({ expiryRange: '7d' }); setCurrentPage('inventory'); }} />
        <KPICard label="Orphaned Identities" value={156} color="amber" onClick={() => { setFilters({ status: 'Orphaned' }); setCurrentPage('inventory'); }} />
        <KPICard label="PQC Critical Assets" value="12,847" color="amber" onClick={() => setCurrentPage('quantum')} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Violations Detected vs Remediated — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={violationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(220, 13%, 91%)' }} />
              <Line type="monotone" dataKey="detected" stroke="hsl(15, 72%, 52%)" strokeWidth={2} dot={{ r: 3 }} name="Detected" />
              <Line type="monotone" dataKey="remediated" stroke="hsl(160, 70%, 37%)" strokeWidth={2} dot={{ r: 3 }} name="Remediated" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Asset Type Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={assetTypeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                {assetTypeDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} cursor="pointer" onClick={() => { setFilters({ type: entry.name }); setCurrentPage('inventory'); }} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(value: number) => value.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {assetTypeDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts and Expirations */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Critical Alerts</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {criticalAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <SeverityBadge severity={alert.severity} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{alert.asset}</p>
                    <p className="text-[10px] text-muted-foreground">{alert.policy} · {alert.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFilters({ assetId: alert.assetId }); setCurrentPage('trustops'); }}
                  className="text-[10px] px-2 py-1 rounded bg-coral/10 text-coral font-medium hover:bg-coral/20 flex-shrink-0"
                >
                  Act now
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Upcoming Expirations</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {upcomingExpirations.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1" onClick={() => { setFilters({ assetId: item.assetId }); setCurrentPage('inventory'); }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{item.asset}</p>
                  <p className="text-[10px] text-muted-foreground">{item.type} · {item.owner}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground">{item.expiry}</p>
                  <DaysToExpiry days={item.days} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <AIInsightCard onClick={() => setCurrentPage('trustops')}>
        Infinity AI detected 3 unusual patterns this week: SSH key rotation gap in prod-db cluster (last rotated 187 days ago),
        12 wildcard certs in PCI-DSS zone, RSA-2048 spike in newly deployed K8s workloads.
      </AIInsightCard>
    </div>
  );
}
