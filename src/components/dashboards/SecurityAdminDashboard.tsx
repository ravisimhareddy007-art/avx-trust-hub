import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { KPICard, SeverityBadge, DaysToExpiry, AIInsightCard } from '@/components/shared/UIComponents';
import { violationData, assetTypeDistribution, criticalAlerts, upcomingExpirations } from '@/data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { RefreshCw, Info, Shield, Bot, Key, Lock, Sparkles, Ticket, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const cryptoPostureData = [
  { name: 'Critical', value: 12, color: 'hsl(15, 72%, 52%)' },
  { name: 'High', value: 18, color: 'hsl(38, 78%, 41%)' },
  { name: 'Medium', value: 25, color: 'hsl(38, 78%, 55%)' },
  { name: 'Low', value: 20, color: 'hsl(160, 60%, 45%)' },
  { name: 'Compliant', value: 25, color: 'hsl(142, 71%, 45%)' },
];

// ─── AI Command Center ──────────────────────────────────────────────────────

function AICommandCenter({ onNavigate }: { onNavigate: (page: string, filters?: Record<string, string>) => void }) {
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResults, setAiResults] = useState<{ action: string; count: number; status: string }[] | null>(null);

  const aiActions = [
    { id: 'bulk-renew', label: 'Auto-Renew Expiring Certs', desc: 'Renew all certificates expiring in <7 days', icon: RefreshCw, count: 342, severity: 'Critical' },
    { id: 'bulk-rotate', label: 'Rotate Stale SSH Keys', desc: 'Rotate SSH keys not rotated in >90 days', icon: Key, count: 1247, severity: 'High' },
    { id: 'pqc-migrate', label: 'PQC Migration Batch', desc: 'Create migration tickets for quantum-vulnerable assets', icon: Shield, count: 247000, severity: 'Critical' },
    { id: 'orphan-assign', label: 'Auto-Assign Orphaned Assets', desc: 'Use AI to suggest owners based on usage patterns', icon: Bot, count: 3218, severity: 'High' },
    { id: 'ticket-bulk', label: 'Create Bulk Remediation Tickets', desc: 'Generate tickets for all critical/high items', icon: Ticket, count: 8420, severity: 'Medium' },
    { id: 'secret-rotate', label: 'Rotate Exposed Secrets', desc: 'Auto-rotate secrets found in source code', icon: Lock, count: 18420, severity: 'Critical' },
  ];

  const handleAIAction = (actionId: string) => {
    setAiRunning(true);
    setTimeout(() => {
      setAiRunning(false);
      const action = aiActions.find(a => a.id === actionId);
      if (action) {
        if (actionId === 'ticket-bulk') {
          setAiResults([
            { action: 'Cert renewal tickets', count: 342, status: 'Created' },
            { action: 'SSH rotation tickets', count: 1247, status: 'Created' },
            { action: 'PQC migration tickets', count: 4820, status: 'Queued' },
            { action: 'Owner assignment tickets', count: 2011, status: 'Created' },
          ]);
          toast.success(`AI created ${action.count.toLocaleString()} remediation tickets`);
        } else {
          toast.success(`AI initiated: ${action.label} for ${action.count.toLocaleString()} assets`);
          onNavigate('remediation');
        }
      }
    }, 2000);
  };

  return (
    <div className="bg-card rounded-lg border border-teal/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Infinity AI — Bulk Remediation</h3>
            <p className="text-[10px] text-muted-foreground">AI-powered automated remediation across all crypto objects</p>
          </div>
        </div>
        {aiRunning && (
          <div className="flex items-center gap-1.5 text-[10px] text-teal">
            <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            Processing...
          </div>
        )}
      </div>

      {aiResults && (
        <div className="mb-3 bg-teal/5 border border-teal/20 rounded-lg p-3">
          <p className="text-xs font-semibold text-teal mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> AI Execution Results</p>
          <div className="space-y-1.5">
            {aiResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{r.action}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{r.count.toLocaleString()}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === 'Created' ? 'bg-teal/10 text-teal' : 'bg-amber/10 text-amber'}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setAiResults(null); onNavigate('tickets'); }} className="text-[10px] text-teal font-medium mt-2 hover:underline">View all tickets →</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {aiActions.map(action => (
          <button
            key={action.id}
            onClick={() => handleAIAction(action.id)}
            disabled={aiRunning}
            className="bg-secondary/50 hover:bg-secondary border border-border rounded-lg p-2.5 text-left transition-colors disabled:opacity-50 group"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <action.icon className="w-3.5 h-3.5 text-teal" />
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                action.severity === 'Critical' ? 'bg-coral/10 text-coral' : action.severity === 'High' ? 'bg-amber/10 text-amber' : 'bg-muted text-muted-foreground'
              }`}>{action.severity}</span>
            </div>
            <p className="text-[11px] font-medium text-foreground mb-0.5">{action.label}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{action.desc}</p>
            <p className="text-[10px] text-teal font-semibold mt-1">{action.count.toLocaleString()} assets</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SecurityAdminDashboard() {
  const { setCurrentPage, setFilters } = useNav();
  const [activeTab, setActiveTab] = useState<'summary' | 'operations' | 'risk' | 'shortlived'>('summary');

  const tabs = [
    { id: 'summary' as const, label: 'Summary' },
    { id: 'operations' as const, label: 'Operations' },
    { id: 'risk' as const, label: 'Risk & Crypto' },
    { id: 'shortlived' as const, label: 'Short Lived Certs' },
  ];

  return (
    <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin pr-1">
      {/* Page Header with Tabs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-[11px] text-muted-foreground">Machine identity posture overview</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Refreshed 0m ago</span>
            <button onClick={() => {}} className="p-1 hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal text-teal'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && (
        <>
          {/* Top-level KPIs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Crypto Posture Overview</h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>0m ago</span>
                <RefreshCw className="w-3 h-3" />
                <Info className="w-3 h-3" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Machine Identities', value: '5.2M', color: 'hsl(var(--teal))', page: 'inventory', subtitle: 'Certs, Keys, Tokens, Secrets' },
                { label: 'PQC-Vulnerable Assets', value: '247K', color: 'hsl(var(--coral))', page: 'inventory', subtitle: 'Requires algorithm migration' },
                { label: 'AI Agent Identities', value: '472K', color: 'hsl(var(--purple))', page: 'inventory', subtitle: '38% over-privileged' },
                { label: 'Unmanaged Secrets', value: '18,420', color: 'hsl(var(--amber))', page: 'inventory', subtitle: 'In repos & endpoints' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => setCurrentPage(item.page)}
                  className="bg-card rounded-lg border border-border p-3 text-left hover:bg-secondary/50 transition-colors"
                  style={{ borderLeft: `3px solid ${item.color}` }}
                >
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{item.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          {/* AI Command Center */}
          <AICommandCenter onNavigate={(page, filters) => {
            if (filters) setFilters(filters);
            setCurrentPage(page);
          }} />

          {/* Per Crypto Object Widgets */}
          <div>
            <h3 className="text-sm font-semibold mb-2">By Crypto Object Type</h3>
            <div className="grid grid-cols-4 gap-3">
              {/* Certificates */}
              <div className="bg-card rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-teal" />
                  <span className="text-xs font-semibold">Certificates</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">1.8M</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expiring &lt;30d</span><span className="font-medium text-coral">12,847</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expired</span><span className="font-medium text-coral">342</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Self-Signed</span><span className="font-medium text-amber">8,412</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Weak Algorithm</span><span className="font-medium text-amber">4,218</span></div>
                </div>
                <button onClick={() => { setFilters({ type: 'TLS Certificate' }); setCurrentPage('inventory'); }} className="text-[10px] text-teal mt-2 hover:underline">View all →</button>
              </div>

              {/* SSH & Encryption Keys */}
              <div className="bg-card rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-purple" />
                  <span className="text-xs font-semibold">Keys</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">1.4M</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SSH Keys</span><span className="font-medium">842K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Encryption Keys</span><span className="font-medium">558K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Orphaned</span><span className="font-medium text-coral">3,218</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Non-HSM Stored</span><span className="font-medium text-amber">14,720</span></div>
                </div>
                <button onClick={() => { setFilters({ type: 'SSH Key' }); setCurrentPage('inventory'); }} className="text-[10px] text-teal mt-2 hover:underline">View all →</button>
              </div>

              {/* Tokens & Agent Identities */}
              <div className="bg-card rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-amber" />
                  <span className="text-xs font-semibold">Tokens & Agents</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">1.2M</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">AI Agent Tokens</span><span className="font-medium">472K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Service Tokens</span><span className="font-medium">728K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Over-Privileged</span><span className="font-medium text-coral">179K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">No Audit Trail</span><span className="font-medium text-amber">82K</span></div>
                </div>
                <button onClick={() => { setFilters({ type: 'AI Agent Token' }); setCurrentPage('inventory'); }} className="text-[10px] text-teal mt-2 hover:underline">View all →</button>
              </div>

              {/* Secrets */}
              <div className="bg-card rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-coral" />
                  <span className="text-xs font-semibold">Secrets</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">812K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">API Keys</span><span className="font-medium">384K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Vault Secrets</span><span className="font-medium">428K</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Exposed in Code</span><span className="font-medium text-coral">18,420</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Not Rotated &gt;90d</span><span className="font-medium text-amber">42,180</span></div>
                </div>
                <button onClick={() => { setFilters({ type: 'API Key' }); setCurrentPage('inventory'); }} className="text-[10px] text-teal mt-2 hover:underline">View all →</button>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Crypto Posture Score</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>0m ago</span>
                  <RefreshCw className="w-3 h-3" />
                  <Info className="w-3 h-3" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={cryptoPostureData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={1} startAngle={90} endAngle={-270}>
                      {cryptoPostureData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {cryptoPostureData.map(item => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Credential Expiry Trend</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>0m ago</span>
                  <RefreshCw className="w-3 h-3" />
                  <Info className="w-3 h-3" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={violationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="detected" stroke="hsl(var(--coral))" strokeWidth={2} dot={{ r: 2 }} name="Expiring" />
                  <Line type="monotone" dataKey="remediated" stroke="hsl(var(--teal))" strokeWidth={2} dot={{ r: 2 }} name="Remediated" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts and Expirations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-3">Critical Alerts</h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin">
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
                      onClick={() => { setFilters({ assetId: alert.assetId }); setCurrentPage('remediation'); }}
                      className="text-[10px] px-2 py-1 rounded bg-coral/10 text-coral font-medium hover:bg-coral/20 flex-shrink-0"
                    >
                      Remediate
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold mb-3">Upcoming Expirations</h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin">
                {upcomingExpirations.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/30 rounded px-1" onClick={() => { setFilters({ assetId: item.assetId }); setCurrentPage('inventory'); }}>
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
          <AIInsightCard onClick={() => setCurrentPage('remediation')}>
            Infinity AI detected 3 converging risks: 247K PQC-vulnerable assets need algorithm migration,
            38% of AI agent tokens are over-privileged with access to production data, and 18K secrets discovered in source code repos.
            Recommend: prioritize PQC migration for BFSI assets, right-size agent permissions, and rotate exposed secrets.
          </AIInsightCard>
        </>
      )}

      {activeTab === 'operations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <KPICard label="Enrolled Today" value="4,218" color="teal" />
            <KPICard label="Renewed Today" value="3,842" color="teal" />
            <KPICard label="Revoked Today" value={187} color="coral" />
            <KPICard label="Failed Operations" value={23} color="coral" />
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Operations — Last 14 Days</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={violationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="detected" stroke="hsl(var(--coral))" strokeWidth={2} dot={{ r: 3 }} name="Detected" />
                <Line type="monotone" dataKey="remediated" stroke="hsl(var(--teal))" strokeWidth={2} dot={{ r: 3 }} name="Remediated" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <KPICard label="Critical PQC Risk" value="247K" color="coral" onClick={() => { setFilters({ pqcRisk: 'Critical' }); setCurrentPage('inventory'); }} />
            <KPICard label="High PQC Risk" value="812K" color="amber" onClick={() => { setFilters({ pqcRisk: 'High' }); setCurrentPage('inventory'); }} />
            <KPICard label="Medium Risk" value="1.4M" color="amber" />
            <KPICard label="Low Risk" value="1.1M" color="teal" />
            <KPICard label="Safe / Compliant" value="1.2M" color="teal" />
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
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {assetTypeDistribution.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shortlived' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <KPICard label="Short-Lived Certs (≤24h)" value="342K" color="teal" />
            <KPICard label="Auto-Renewed (24h)" value="339K" color="teal" />
            <KPICard label="Failed Renewals" value="1,247" color="coral" />
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Short-Lived Certificate Activity</h3>
            <p className="text-xs text-muted-foreground">Kubernetes workload certificates, Istio mTLS certs, SPIFFE/SVID identities, and other short-lived credentials managed by cert-manager and service mesh.</p>
          </div>
        </div>
      )}
    </div>
  );
}
