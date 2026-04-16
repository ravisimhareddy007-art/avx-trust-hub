import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { SeverityBadge, DaysToExpiry } from '@/components/shared/UIComponents';
import { violationData, criticalAlerts, upcomingExpirations } from '@/data/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, Shield, Bot, Key, Lock, AlertTriangle, ArrowRight, Clock, FileWarning, Users, Fingerprint, Globe, RotateCcw } from 'lucide-react';

export default function SecurityAdminDashboard() {
  const { setCurrentPage, setFilters } = useNav();

  const nav = (page: string, filters?: Record<string, string>) => {
    if (filters) setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin pr-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Machine identity posture overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Refreshed 0m ago</span>
          <button className="p-1 hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Posture Score + Top KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <button onClick={() => nav('inventory')} className="bg-card rounded-lg border border-border p-4 text-left hover:border-teal/30 transition-all" style={{ borderLeft: '3px solid hsl(var(--teal))' }}>
          <p className="text-2xl font-bold">5.2M</p>
          <p className="text-[10px] text-muted-foreground">Total Identities</p>
          <p className="text-[9px] text-muted-foreground/60">Certs, Keys, Tokens, Secrets</p>
        </button>
        <button onClick={() => nav('quantum')} className="bg-card rounded-lg border border-border p-4 text-left hover:border-coral/30 transition-all" style={{ borderLeft: '3px solid hsl(var(--coral))' }}>
          <p className="text-2xl font-bold text-coral">247K</p>
          <p className="text-[10px] text-muted-foreground">PQC-Vulnerable</p>
          <p className="text-[9px] text-muted-foreground/60">Requires algorithm migration</p>
        </button>
        <button onClick={() => nav('inventory', { status: 'Expiring' })} className="bg-card rounded-lg border border-border p-4 text-left hover:border-amber/30 transition-all" style={{ borderLeft: '3px solid hsl(var(--amber))' }}>
          <p className="text-2xl font-bold text-amber">12,847</p>
          <p className="text-[10px] text-muted-foreground">Expiring &lt;30d</p>
          <p className="text-[9px] text-muted-foreground/60">342 already expired</p>
        </button>
        <button onClick={() => nav('inventory', { type: 'AI Agent Token' })} className="bg-card rounded-lg border border-border p-4 text-left hover:border-purple/30 transition-all" style={{ borderLeft: '3px solid hsl(var(--purple))' }}>
          <p className="text-2xl font-bold">472K</p>
          <p className="text-[10px] text-muted-foreground">AI Agent Identities</p>
          <p className="text-[9px] text-muted-foreground/60">38% over-privileged</p>
        </button>
        <button onClick={() => nav('inventory', { type: 'API Key / Secret', status: 'Orphaned' })} className="bg-card rounded-lg border border-border p-4 text-left hover:border-amber/30 transition-all" style={{ borderLeft: '3px solid hsl(var(--amber))' }}>
          <p className="text-2xl font-bold text-amber">18,420</p>
          <p className="text-[10px] text-muted-foreground">Unmanaged Secrets</p>
          <p className="text-[9px] text-muted-foreground/60">In repos & endpoints</p>
        </button>
      </div>

      {/* Identity Breakdown Widgets — 2 per row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Certificates */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal" />
              <span className="text-sm font-semibold">Certificates</span>
              <span className="text-[10px] text-muted-foreground">1.8M total</span>
            </div>
            <button onClick={() => nav('inventory', { type: 'TLS Certificate' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Expiring <7d', value: '2,847', color: 'text-coral', page: 'remediation', filters: { module: 'clm', filter: 'expiry' } },
              { label: 'Expiring <30d', value: '12,847', color: 'text-amber', page: 'inventory', filters: { status: 'Expiring' } },
              { label: 'Expired', value: '342', color: 'text-coral', page: 'remediation', filters: { module: 'clm' } },
              { label: 'Self-Signed', value: '8,412', color: 'text-amber', page: 'inventory', filters: { type: 'TLS Certificate', selfSigned: 'true' } },
              { label: 'Weak Algorithm', value: '4,218', color: 'text-coral', page: 'quantum', filters: {} },
              { label: 'No Owner', value: '3,218', color: 'text-amber', page: 'inventory', filters: { hasOwner: 'false' } },
              { label: 'Auto-Renew On', value: '1.2M', color: 'text-teal', page: 'inventory', filters: { autoRenew: 'true' } },
              { label: 'Shadow Certs', value: '1,847', color: 'text-coral', page: 'inventory', filters: { shadow: 'true' } },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.page, item.filters)} className="text-left p-2 rounded hover:bg-secondary/40 transition-colors">
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* SSH & Encryption Keys */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple" />
              <span className="text-sm font-semibold">SSH & Encryption Keys</span>
              <span className="text-[10px] text-muted-foreground">1.4M total</span>
            </div>
            <button onClick={() => nav('inventory', { type: 'SSH Key' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'SSH Keys', value: '842K', color: 'text-foreground', page: 'inventory', filters: { type: 'SSH Key' } },
              { label: 'Encryption Keys', value: '558K', color: 'text-foreground', page: 'inventory', filters: { type: 'Encryption Key' } },
              { label: 'Orphaned', value: '3,218', color: 'text-coral', page: 'remediation', filters: { module: 'ssh', filter: 'orphaned' } },
              { label: 'Non-HSM Stored', value: '14,720', color: 'text-amber', page: 'inventory', filters: { storage: 'non-hsm' } },
              { label: 'RSA-2048', value: '24,180', color: 'text-amber', page: 'inventory', filters: { algorithm: 'RSA-2048' } },
              { label: 'Not Rotated >90d', value: '8,412', color: 'text-coral', page: 'remediation', filters: { module: 'ssh', filter: 'rotation' } },
              { label: 'Shared Keys', value: '2,847', color: 'text-amber', page: 'inventory', filters: { shared: 'true' } },
              { label: 'Compliant', value: '1.3M', color: 'text-teal', page: 'inventory', filters: { status: 'Compliant' } },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.page, item.filters)} className="text-left p-2 rounded hover:bg-secondary/40 transition-colors">
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* AI Agent Tokens */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber" />
              <span className="text-sm font-semibold">AI Agent Tokens</span>
              <span className="text-[10px] text-muted-foreground">472K total</span>
            </div>
            <button onClick={() => nav('inventory', { type: 'AI Agent Token' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Over-Privileged', value: '179K', color: 'text-coral', page: 'remediation', filters: { module: 'ai-agents' } },
              { label: 'No Audit Trail', value: '82K', color: 'text-amber', page: 'trustops', filters: {} },
              { label: 'No Sponsor', value: '44K', color: 'text-coral', page: 'inventory', filters: { type: 'AI Agent Token', hasOwner: 'false' } },
              { label: 'Anomalous', value: '312', color: 'text-coral', page: 'trustops', filters: {} },
              { label: 'Active Now', value: '284K', color: 'text-teal', page: 'inventory', filters: { type: 'AI Agent Token', status: 'Active' } },
              { label: 'Expired', value: '12,480', color: 'text-amber', page: 'inventory', filters: { type: 'AI Agent Token', status: 'Expired' } },
              { label: 'Service Tokens', value: '728K', color: 'text-foreground', page: 'inventory', filters: { type: 'Service Token' } },
              { label: 'Scoped Correctly', value: '148K', color: 'text-teal', page: 'inventory', filters: { type: 'AI Agent Token', scoped: 'true' } },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.page, item.filters)} className="text-left p-2 rounded hover:bg-secondary/40 transition-colors">
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Secrets & API Keys */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-coral" />
              <span className="text-sm font-semibold">Secrets & API Keys</span>
              <span className="text-[10px] text-muted-foreground">812K total</span>
            </div>
            <button onClick={() => nav('inventory', { type: 'API Key / Secret' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Exposed in Code', value: '18,420', color: 'text-coral', page: 'remediation', filters: { module: 'secrets' } },
              { label: 'Not Rotated >90d', value: '42,180', color: 'text-amber', page: 'remediation', filters: { module: 'secrets', filter: 'rotation' } },
              { label: 'Vault Secrets', value: '428K', color: 'text-foreground', page: 'inventory', filters: { type: 'Vault Secret' } },
              { label: 'API Keys', value: '384K', color: 'text-foreground', page: 'inventory', filters: { type: 'API Key' } },
              { label: 'Hardcoded', value: '4,218', color: 'text-coral', page: 'remediation', filters: { module: 'secrets', filter: 'hardcoded' } },
              { label: 'No Owner', value: '8,720', color: 'text-amber', page: 'inventory', filters: { type: 'API Key / Secret', hasOwner: 'false' } },
              { label: 'Shared Across Envs', value: '2,180', color: 'text-amber', page: 'inventory', filters: { sharedEnv: 'true' } },
              { label: 'Compliant', value: '742K', color: 'text-teal', page: 'inventory', filters: { type: 'API Key / Secret', status: 'Compliant' } },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.page, item.filters)} className="text-left p-2 rounded hover:bg-secondary/40 transition-colors">
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Code Signing */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-teal" />
              <span className="text-sm font-semibold">Code Signing</span>
              <span className="text-[10px] text-muted-foreground">48K total</span>
            </div>
            <button onClick={() => nav('inventory', { type: 'Code Signing' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Active Certs', value: '32K', color: 'text-teal', page: 'inventory', filters: { type: 'Code Signing', status: 'Active' } },
              { label: 'Expiring <30d', value: '847', color: 'text-amber', page: 'inventory', filters: { type: 'Code Signing', status: 'Expiring' } },
              { label: 'Weak Algorithm', value: '2,180', color: 'text-coral', page: 'inventory', filters: { type: 'Code Signing', algorithm: 'weak' } },
              { label: 'Unsigned Builds', value: '142', color: 'text-coral', page: 'remediation', filters: { module: 'codesign' } },
              { label: 'No Policy', value: '4,218', color: 'text-amber', page: 'inventory', filters: { type: 'Code Signing', policy: 'none' } },
              { label: 'Shared Keys', value: '312', color: 'text-amber', page: 'inventory', filters: { type: 'Code Signing', shared: 'true' } },
              { label: 'HSM-Backed', value: '28K', color: 'text-teal', page: 'inventory', filters: { type: 'Code Signing', storage: 'hsm' } },
              { label: 'PQC-Ready', value: '1,247', color: 'text-teal', page: 'inventory', filters: { type: 'Code Signing', pqc: 'ready' } },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.page, item.filters)} className="text-left p-2 rounded hover:bg-secondary/40 transition-colors">
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Kubernetes & Service Mesh */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple" />
              <span className="text-sm font-semibold">Kubernetes & Service Mesh</span>
              <span className="text-[10px] text-muted-foreground">342K total</span>
            </div>
            <button onClick={() => nav('inventory', { type: 'K8s Certificate' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'K8s TLS', value: '184K', color: 'text-foreground', page: 'inventory', filters: { type: 'K8s Certificate' } },
              { label: 'mTLS/SPIFFE', value: '128K', color: 'text-foreground', page: 'inventory', filters: { type: 'mTLS' } },
              { label: 'Short-Lived (<24h)', value: '342K', color: 'text-teal', page: 'inventory', filters: { shortLived: 'true' } },
              { label: 'Failed Renewals', value: '1,247', color: 'text-coral', page: 'trustops', filters: {} },
              { label: 'Cert-Manager', value: '212K', color: 'text-teal', page: 'inventory', filters: { managedBy: 'cert-manager' } },
              { label: 'Istio Certs', value: '86K', color: 'text-foreground', page: 'inventory', filters: { managedBy: 'istio' } },
              { label: 'No Mesh Policy', value: '4,180', color: 'text-amber', page: 'inventory', filters: { type: 'K8s Certificate', policy: 'none' } },
              { label: 'Cross-Namespace', value: '847', color: 'text-amber', page: 'inventory', filters: { crossNamespace: 'true' } },
            ].map(item => (
              <button key={item.label} onClick={() => nav(item.page, item.filters)} className="text-left p-2 rounded hover:bg-secondary/40 transition-colors">
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Overview */}
      <div className="grid grid-cols-3 gap-4">
        {/* Expiry Trend */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Expiry vs Remediation Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={violationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="detected" stroke="hsl(var(--coral))" strokeWidth={2} dot={{ r: 2 }} name="Expiring" />
              <Line type="monotone" dataKey="remediated" stroke="hsl(var(--teal))" strokeWidth={2} dot={{ r: 2 }} name="Remediated" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Critical Alerts */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Critical Alerts</h3>
            <button onClick={() => setCurrentPage('trustops')} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
            {criticalAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <SeverityBadge severity={alert.severity} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{alert.asset}</p>
                    <p className="text-[9px] text-muted-foreground">{alert.policy} · {alert.time}</p>
                  </div>
                </div>
                <button onClick={() => { setFilters({ assetId: alert.assetId }); setCurrentPage('remediation'); }} className="text-[9px] px-1.5 py-0.5 rounded bg-coral/10 text-coral font-medium hover:bg-coral/20 flex-shrink-0">Fix</button>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Expirations */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Upcoming Expirations</h3>
            <button onClick={() => nav('inventory', { status: 'Expiring' })} className="text-[10px] text-teal hover:underline">View all →</button>
          </div>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
            {upcomingExpirations.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/30 rounded px-1" onClick={() => { setFilters({ assetId: item.assetId }); setCurrentPage('inventory'); }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium truncate">{item.asset}</p>
                  <p className="text-[9px] text-muted-foreground">{item.type}</p>
                </div>
                <DaysToExpiry days={item.days} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operations KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { icon: RotateCcw, label: 'Auto-Renewed (24h)', value: '3,842', color: 'text-teal' },
          { icon: Clock, label: 'Pending Rotation', value: '1,247', color: 'text-amber' },
          { icon: FileWarning, label: 'Policy Violations', value: '842', color: 'text-coral' },
          { icon: Users, label: 'Orphaned Assets', value: '3,218', color: 'text-amber' },
          { icon: AlertTriangle, label: 'Failed Operations', value: '23', color: 'text-coral' },
          { icon: Shield, label: 'Policies Active', value: '148', color: 'text-teal' },
        ].map(item => (
          <div key={item.label} className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
