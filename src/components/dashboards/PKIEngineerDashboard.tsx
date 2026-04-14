import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { KPICard, StatusBadge, AIInsightCard } from '@/components/shared/UIComponents';
import { discoveryPerDay, renewalByCA } from '@/data/mockData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PKIEngineerDashboard() {
  const { setCurrentPage } = useNav();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Discovery Sources Active" value={48} color="teal" onClick={() => setCurrentPage('discovery-profiles')} />
        <KPICard label="Last Discovery Run" value="2h ago" color="teal" subtitle="142,800 assets found" onClick={() => setCurrentPage('discovery-runs')} />
        <KPICard label="Automation Workflows" value={34} color="teal" onClick={() => setCurrentPage('automation')} />
        <KPICard label="Failed Renewals (24h)" value={127} color="coral" onClick={() => setCurrentPage('trustops')} />
        <KPICard label="CA Capacity: DigiCert" value="84%" color="amber" subtitle="3.2M of 3.8M used" onClick={() => setCurrentPage('integrations')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Assets Discovered Per Day — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={discoveryPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="assets" fill="hsl(160, 70%, 37%)" fillOpacity={0.15} stroke="hsl(160, 70%, 37%)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Renewal Success Rate by CA</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={renewalByCA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="ca" tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="success" fill="hsl(160, 70%, 37%)" name="Success" />
              <Bar dataKey="failed" fill="hsl(15, 72%, 52%)" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Active Workflows</h3>
          <div className="space-y-2">
            {[
              { name: 'Cert Renewal — Production TLS', trigger: 'Expiry Alert', step: 'Submit to CA', status: 'Running', by: 'System' },
              { name: 'SSH Key Rotation — DB Cluster', trigger: 'Weekly Schedule', step: 'Await approval', status: 'Awaiting approval', by: 'Schedule' },
              { name: 'PQC Migration — Batch 1', trigger: 'Manual', step: 'Not started', status: 'Scheduled', by: 'James Wilson' },
              { name: 'New Microservice Onboarding', trigger: 'API Call', step: 'Complete', status: 'Complete', by: 'GitHub Actions' },
            ].map((wf, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1" onClick={() => setCurrentPage('automation')}>
                <div>
                  <p className="text-xs font-medium">{wf.name}</p>
                  <p className="text-[10px] text-muted-foreground">{wf.trigger} · Step: {wf.step} · By: {wf.by}</p>
                </div>
                <StatusBadge status={wf.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">CA Health</h3>
          <div className="space-y-2">
            {[
              { ca: 'DigiCert', status: 'Healthy', issued: 42, failRate: '0.3%', quota: '84%', color: 'amber' },
              { ca: 'Entrust', status: 'Healthy', issued: 18, failRate: '0.1%', quota: '52%', color: 'teal' },
              { ca: 'MSCA Enterprise', status: 'Warning', issued: 12, failRate: '2.1%', quota: '67%', color: 'amber' },
              { ca: "Let's Encrypt", status: 'Healthy', issued: 89, failRate: '0.2%', quota: 'N/A', color: 'teal' },
            ].map((ca, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1" onClick={() => setCurrentPage('integrations')}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ca.color === 'teal' ? 'bg-teal' : 'bg-amber'}`} />
                  <div>
                    <p className="text-xs font-medium">{ca.ca}</p>
                    <p className="text-[10px] text-muted-foreground">Issued today: {ca.issued} · Fail rate: {ca.failRate}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${ca.color === 'teal' ? 'text-teal' : 'text-amber'}`}>{ca.quota}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIInsightCard onClick={() => setCurrentPage('automation')}>
        Infinity AI predicts DigiCert quota exhaustion in 11 days at current issuance rate. Recommend increasing quota or
        shifting 340 renewals to Entrust. 3 automation workflows are failing due to ITSM ticket timeout — auto-retry scheduled.
        Suggested fix: increase timeout from 30s to 90s.
      </AIInsightCard>
    </div>
  );
}
