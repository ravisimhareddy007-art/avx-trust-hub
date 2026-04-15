import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, Key, Users, UserCheck, Fingerprint,
  Lock, Server, HardDrive,
  FileText, Bell, AlertTriangle, Settings, Activity,
  Plus, Download, Search, ToggleLeft, Eye, EyeOff, RefreshCw, CheckCircle, XCircle,
  Monitor, Database, Cpu, BarChart3, Building2, Wrench, Heart,
  CloudCog, Archive, Globe, Plug, Box, Layers
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/UIComponents';
import { users, auditLog } from '@/data/mockData';

type PillarTab = 'license' | 'health' | 'multitenancy' | 'telemetry' | 'users' | 'infra-integrations' | 'infrastructure';

export default function CoreServicesPage() {
  const [pillar, setPillar] = useState<PillarTab>('license');

  const pillars: { id: PillarTab; label: string; icon: React.ElementType }[] = [
    { id: 'license', label: 'License Management', icon: FileText },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'multitenancy', label: 'Multi-Tenancy', icon: Building2 },
    { id: 'telemetry', label: 'Telemetry', icon: BarChart3 },
    { id: 'users', label: 'Users & RBAC', icon: Users },
    { id: 'infra-integrations', label: 'Integrations', icon: Plug },
    { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Platform Core</h1>
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {pillars.map(p => (
          <button key={p.id} onClick={() => setPillar(p.id)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${pillar === p.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <p.icon className="w-3.5 h-3.5" /> {p.label}
          </button>
        ))}
      </div>

      {pillar === 'license' && <LicenseManagement />}
      {pillar === 'health' && <HealthManagement />}
      {pillar === 'multitenancy' && <MultiTenancy />}
      {pillar === 'telemetry' && <TelemetryPanel />}
      {pillar === 'users' && <UserManagement />}
      {pillar === 'infra-integrations' && <InfraIntegrations />}
      {pillar === 'infrastructure' && <InfrastructureResources />}
    </div>
  );
}

/* ─── LICENSE MANAGEMENT ─── */
function LicenseManagement() {
  const [showUpload, setShowUpload] = useState(false);

  const modules = [
    { name: 'Certificate Lifecycle (CLM/PKI)', status: 'Active', seats: 'Unlimited', usage: 82, expiry: '2027-12-31' },
    { name: 'SSH Key Management', status: 'Active', seats: '500', usage: 67, expiry: '2027-12-31' },
    { name: 'Code Signing', status: 'Active', seats: '100', usage: 23, expiry: '2027-12-31' },
    { name: 'Kubernetes TLS', status: 'Active', seats: 'Unlimited', usage: 45, expiry: '2027-12-31' },
    { name: 'Quantum Trust Hub', status: 'Active', seats: 'Unlimited', usage: 12, expiry: '2027-12-31' },
    { name: 'Agentic AI Identity (Eos)', status: 'Trial', seats: '50', usage: 8, expiry: '2026-06-30' },
    { name: 'Secrets Management', status: 'Inactive', seats: '—', usage: 0, expiry: '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="License Tier" value="Enterprise" icon={FileText} />
        <MetricCard label="Modules Active" value="5 / 7" icon={Layers} />
        <MetricCard label="License Expiry" value="Dec 2027" icon={Activity} />
        <MetricCard label="Nodes Licensed" value="Unlimited" icon={Server} />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Module Entitlements</h3>
          <div className="flex gap-2">
            <button onClick={() => setShowUpload(true)} className="text-[10px] px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center gap-1"><Plus className="w-3 h-3" /> Upload License</button>
            <button onClick={() => toast.info('License renewal request submitted')} className="text-[10px] px-3 py-1.5 rounded bg-muted hover:bg-muted/80">Request Renewal</button>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Module', 'Status', 'Seats', 'Usage', 'Expiry', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {modules.map((m, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{m.name}</td>
                <td className="py-2 px-3"><StatusBadge status={m.status === 'Active' ? 'Active' : m.status === 'Trial' ? 'Warning' : 'Inactive'} /></td>
                <td className="py-2 px-3 text-muted-foreground">{m.seats}</td>
                <td className="py-2 px-3">
                  {m.usage > 0 ? (
                    <div className="flex items-center gap-2 w-24">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${m.usage}%` }} /></div>
                      <span className="text-[10px] text-muted-foreground">{m.usage}%</span>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{m.expiry}</td>
                <td className="py-2 px-3">
                  {m.status === 'Inactive' ? (
                    <button onClick={() => toast.info(`Activating ${m.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Activate</button>
                  ) : m.status === 'Trial' ? (
                    <button onClick={() => toast.info(`Converting ${m.name} to full license`)} className="text-[10px] px-2 py-1 rounded bg-amber/10 text-amber hover:bg-amber/20">Upgrade</button>
                  ) : (
                    <button onClick={() => toast.info(`Managing ${m.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Manage</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showUpload && (
        <div className="bg-card rounded-lg border border-teal/30 p-4">
          <h4 className="text-xs font-semibold mb-3">Upload License File</h4>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-xs text-muted-foreground mb-2">Drag & drop your .lic file or click to browse</p>
            <button onClick={() => { toast.success('License uploaded & validated'); setShowUpload(false); }} className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs">Select File</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-4">
        <h4 className="text-xs font-semibold mb-3">License Audit Trail</h4>
        <div className="space-y-2 text-xs">
          {[
            { action: 'License renewed', date: '2026-01-15', by: 'admin@acme.com' },
            { action: 'Eos module trial activated', date: '2026-03-01', by: 'admin@acme.com' },
            { action: 'SSH seats expanded to 500', date: '2026-02-10', by: 'ops@acme.com' },
          ].map((e, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-muted-foreground">{e.action}</span>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>{e.by}</span>
                <span className="font-mono">{e.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── HEALTH MANAGEMENT ─── */
function HealthManagement() {
  const services = [
    { name: 'AVX Trust API Gateway', status: 'Healthy', uptime: '99.99%', latency: '12ms', lastCheck: '30s ago', cpu: 24, mem: 61 },
    { name: 'Certificate Authority (CA)', status: 'Healthy', uptime: '99.99%', latency: '8ms', lastCheck: '30s ago', cpu: 18, mem: 45 },
    { name: 'Discovery Engine', status: 'Healthy', uptime: '99.97%', latency: '45ms', lastCheck: '30s ago', cpu: 52, mem: 72 },
    { name: 'Policy Engine', status: 'Healthy', uptime: '99.98%', latency: '15ms', lastCheck: '30s ago', cpu: 12, mem: 38 },
    { name: 'OCSP Responder', status: 'Degraded', uptime: '99.85%', latency: '220ms', lastCheck: '30s ago', cpu: 78, mem: 89 },
    { name: 'Key Management Service', status: 'Healthy', uptime: '99.99%', latency: '5ms', lastCheck: '30s ago', cpu: 8, mem: 32 },
    { name: 'Agent Token Broker', status: 'Healthy', uptime: '99.96%', latency: '18ms', lastCheck: '30s ago', cpu: 34, mem: 55 },
    { name: 'Notification Service', status: 'Healthy', uptime: '99.95%', latency: '25ms', lastCheck: '30s ago', cpu: 10, mem: 22 },
    { name: 'Database Cluster', status: 'Healthy', uptime: '99.99%', latency: '3ms', lastCheck: '30s ago', cpu: 42, mem: 68 },
    { name: 'Message Queue (Kafka)', status: 'Warning', uptime: '99.90%', latency: '85ms', lastCheck: '30s ago', cpu: 65, mem: 82 },
  ];

  const degraded = services.filter(s => s.status !== 'Healthy');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Services Monitored" value={String(services.length)} icon={Monitor} />
        <MetricCard label="Healthy" value={String(services.filter(s => s.status === 'Healthy').length)} icon={CheckCircle} />
        <MetricCard label="Degraded / Warning" value={String(degraded.length)} icon={AlertTriangle} accent />
        <MetricCard label="Avg Uptime" value="99.96%" icon={Activity} />
      </div>

      {degraded.length > 0 && (
        <div className="bg-amber/5 border border-amber/30 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-amber mb-2">⚠ Attention Required</h4>
          {degraded.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs">
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground ml-2">— Latency: {s.latency}, CPU: {s.cpu}%, Memory: {s.mem}%</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toast.info(`Restarting ${s.name}`)} className="text-[10px] px-2 py-1 rounded bg-amber/10 text-amber hover:bg-amber/20">Restart</button>
                <button onClick={() => toast.info(`Viewing ${s.name} logs`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Logs</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">All Services</h3>
          <button onClick={() => toast.info('Running health check on all services...')} className="text-[10px] px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Check All</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Service', 'Status', 'Uptime', 'Latency', 'CPU', 'Memory', 'Last Check', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{s.name}</td>
                <td className="py-2 px-3"><StatusBadge status={s.status === 'Healthy' ? 'Active' : s.status === 'Degraded' ? 'Critical' : 'Warning'} /></td>
                <td className="py-2 px-3 text-muted-foreground">{s.uptime}</td>
                <td className="py-2 px-3 text-muted-foreground">{s.latency}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1 w-16">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.cpu > 70 ? 'bg-coral' : s.cpu > 50 ? 'bg-amber' : 'bg-teal'}`} style={{ width: `${s.cpu}%` }} /></div>
                    <span className="text-[10px]">{s.cpu}%</span>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1 w-16">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.mem > 80 ? 'bg-coral' : s.mem > 60 ? 'bg-amber' : 'bg-teal'}`} style={{ width: `${s.mem}%` }} /></div>
                    <span className="text-[10px]">{s.mem}%</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-muted-foreground text-[10px]">{s.lastCheck}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Restarting ${s.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Restart</button>
                  <button onClick={() => toast.info(`Viewing ${s.name} details`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── MULTI-TENANCY ─── */
function MultiTenancy() {
  const [showCreateTenant, setShowCreateTenant] = useState(false);

  const tenants = [
    { name: 'ACME Corp (Primary)', id: 'tenant-001', users: 342, assets: '2.1M', plan: 'Enterprise', status: 'Active', region: 'US-East', isolation: 'Dedicated DB' },
    { name: 'ACME EMEA', id: 'tenant-002', users: 128, assets: '1.4M', plan: 'Enterprise', status: 'Active', region: 'EU-West', isolation: 'Dedicated DB' },
    { name: 'ACME APAC', id: 'tenant-003', users: 87, assets: '980K', plan: 'Enterprise', status: 'Active', region: 'AP-Southeast', isolation: 'Shared (Schema)' },
    { name: 'Partner: FinSecure', id: 'tenant-004', users: 24, assets: '320K', plan: 'Partner', status: 'Active', region: 'US-West', isolation: 'Dedicated DB' },
    { name: 'Sandbox / QA', id: 'tenant-005', users: 12, assets: '45K', plan: 'Dev', status: 'Active', region: 'US-East', isolation: 'Shared (Schema)' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Active Tenants" value={String(tenants.length)} icon={Building2} />
        <MetricCard label="Total Users" value={String(tenants.reduce((a, t) => a + t.users, 0))} icon={Users} />
        <MetricCard label="Regions" value="4" icon={Globe} />
        <MetricCard label="Data Isolation" value="Hybrid" icon={Lock} />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Tenant Management</h3>
          <button onClick={() => setShowCreateTenant(true)} className="text-[10px] px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center gap-1"><Plus className="w-3 h-3" /> Create Tenant</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Tenant', 'ID', 'Users', 'Assets', 'Plan', 'Region', 'Isolation', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {tenants.map((t, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{t.name}</td>
                <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{t.id}</td>
                <td className="py-2 px-3">{t.users}</td>
                <td className="py-2 px-3">{t.assets}</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-[10px]">{t.plan}</span></td>
                <td className="py-2 px-3 text-muted-foreground">{t.region}</td>
                <td className="py-2 px-3 text-[10px] text-muted-foreground">{t.isolation}</td>
                <td className="py-2 px-3"><StatusBadge status={t.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Managing ${t.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Settings</button>
                  <button onClick={() => toast.info(`Switching to ${t.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Switch</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateTenant && (
        <div className="bg-card rounded-lg border border-teal/30 p-4 space-y-3">
          <h4 className="text-xs font-semibold">Create New Tenant</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-muted-foreground">Tenant Name</label><input className="w-full mt-1 px-3 py-1.5 bg-muted border border-border rounded text-xs" placeholder="e.g. ACME LATAM" /></div>
            <div><label className="text-[10px] text-muted-foreground">Region</label>
              <select className="w-full mt-1 px-3 py-1.5 bg-muted border border-border rounded text-xs">
                <option>US-East</option><option>US-West</option><option>EU-West</option><option>AP-Southeast</option>
              </select>
            </div>
            <div><label className="text-[10px] text-muted-foreground">Isolation Mode</label>
              <select className="w-full mt-1 px-3 py-1.5 bg-muted border border-border rounded text-xs">
                <option>Dedicated Database</option><option>Shared (Schema Isolation)</option>
              </select>
            </div>
            <div><label className="text-[10px] text-muted-foreground">Plan</label>
              <select className="w-full mt-1 px-3 py-1.5 bg-muted border border-border rounded text-xs">
                <option>Enterprise</option><option>Partner</option><option>Dev/Sandbox</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { toast.success('Tenant created & provisioning started'); setShowCreateTenant(false); }} className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs">Create & Provision</button>
            <button onClick={() => setShowCreateTenant(false)} className="px-3 py-1.5 rounded bg-muted text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TELEMETRY ─── */
function TelemetryPanel() {
  const metrics = [
    { metric: 'API Requests / min', current: '14,280', trend: '+5%', status: 'Normal' },
    { metric: 'Certificate Issuances / hr', current: '842', trend: '+12%', status: 'Normal' },
    { metric: 'Discovery Scans Running', current: '3', trend: '—', status: 'Normal' },
    { metric: 'Policy Evaluations / min', current: '2,840', trend: '-2%', status: 'Normal' },
    { metric: 'OCSP Responses / min', current: '45,200', trend: '+8%', status: 'High' },
    { metric: 'Agent Token Validations / min', current: '8,120', trend: '+15%', status: 'Normal' },
    { metric: 'Webhook Deliveries (24h)', current: '12,420', trend: '+3%', status: 'Normal' },
    { metric: 'Failed Operations (24h)', current: '23', trend: '-8%', status: 'Normal' },
  ];

  const exportTargets = [
    { name: 'Splunk SIEM', status: 'Active', type: 'Syslog/HEC', lastExport: '2m ago' },
    { name: 'Datadog', status: 'Active', type: 'API', lastExport: '1m ago' },
    { name: 'Elastic/OpenSearch', status: 'Active', type: 'Filebeat', lastExport: '5m ago' },
    { name: 'AWS CloudWatch', status: 'Inactive', type: 'CloudWatch Agent', lastExport: '—' },
    { name: 'Prometheus/Grafana', status: 'Active', type: 'Metrics Endpoint', lastExport: 'Live' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="API Requests/min" value="14.3K" icon={Activity} />
        <MetricCard label="Events Processed (24h)" value="28.4M" icon={BarChart3} />
        <MetricCard label="Export Destinations" value="4" icon={Plug} />
        <MetricCard label="Data Retention" value="2 Years" icon={Archive} />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Real-Time Metrics</h3>
          <button onClick={() => toast.info('Refreshing metrics...')} className="text-[10px] px-3 py-1.5 rounded bg-muted hover:bg-muted/80 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Metric', 'Current', 'Trend', 'Status'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{m.metric}</td>
                <td className="py-2 px-3 font-mono">{m.current}</td>
                <td className="py-2 px-3"><span className={m.trend.startsWith('+') ? 'text-teal' : m.trend.startsWith('-') ? 'text-coral' : 'text-muted-foreground'}>{m.trend}</span></td>
                <td className="py-2 px-3"><StatusBadge status={m.status === 'Normal' ? 'Active' : 'Warning'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Export & SIEM Destinations</h3>
          <button onClick={() => toast.info('Adding export destination')} className="text-[10px] px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center gap-1"><Plus className="w-3 h-3" /> Add Destination</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Destination', 'Status', 'Protocol', 'Last Export', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {exportTargets.map((e, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{e.name}</td>
                <td className="py-2 px-3"><StatusBadge status={e.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                <td className="py-2 px-3 text-muted-foreground">{e.type}</td>
                <td className="py-2 px-3 text-muted-foreground">{e.lastExport}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.success(`Test event sent to ${e.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Test</button>
                  <button onClick={() => toast.info(`Configuring ${e.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <h4 className="text-xs font-semibold mb-3">Audit Log & Retention</h4>
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">Retention period: <span className="text-foreground font-medium">2 years</span></p>
            <p className="text-muted-foreground">Total events stored: <span className="text-foreground font-medium">1.2B</span></p>
            <p className="text-muted-foreground">Storage used: <span className="text-foreground font-medium">842 GB</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toast.info('Configuring retention policy')} className="text-[10px] px-3 py-1.5 rounded bg-muted hover:bg-muted/80">Configure Retention</button>
            <button onClick={() => toast.success('Exporting audit log archive')} className="text-[10px] px-3 py-1.5 rounded bg-muted hover:bg-muted/80 flex items-center gap-1"><Download className="w-3 h-3" /> Export Archive</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── USER MANAGEMENT / RBAC ─── */
function UserManagement() {
  const [subTab, setSubTab] = useState<'users' | 'roles' | 'sessions' | 'auth'>('users');

  const roles = [
    { name: 'Platform Admin', users: 3, permissions: 'Full access — all modules, settings, tenant management', scope: 'Global' },
    { name: 'Security Admin', users: 8, permissions: 'Policies, remediation, integrations, dashboards', scope: 'Global' },
    { name: 'PKI Engineer', users: 15, permissions: 'Certificates, discovery, inventory, key management', scope: 'Assigned BUs' },
    { name: 'Compliance Officer', users: 5, permissions: 'Read-only policies, reports, audit log, compliance dashboard', scope: 'Global' },
    { name: 'Application Owner', users: 42, permissions: 'Request certs, view own inventory, self-service portal', scope: 'Assigned Apps' },
    { name: 'Read-Only Auditor', users: 6, permissions: 'Read-only all modules, export capabilities', scope: 'Global' },
    { name: 'Tenant Admin', users: 4, permissions: 'Manage users, settings within assigned tenant', scope: 'Tenant' },
  ];

  const sessions = [
    { user: 'alice@acme.com', role: 'Platform Admin', ip: '10.0.1.42', started: '14:22 UTC', mfa: true, status: 'Active' },
    { user: 'bob@acme.com', role: 'Security Admin', ip: '10.0.2.18', started: '13:45 UTC', mfa: true, status: 'Active' },
    { user: 'carol@acme.com', role: 'PKI Engineer', ip: '172.16.5.100', started: '12:10 UTC', mfa: true, status: 'Active' },
    { user: 'dave@partner.com', role: 'Application Owner', ip: '192.168.1.50', started: '11:30 UTC', mfa: false, status: 'Active' },
  ];

  const authProviders = [
    { name: 'SAML / SSO (Okta)', status: 'Active', users: 342, mfa: 'Enforced' },
    { name: 'LDAP (Active Directory)', status: 'Active', users: 1205, mfa: 'Optional' },
    { name: 'Local Authentication', status: 'Active', users: 28, mfa: 'Enforced' },
    { name: 'API Key Auth', status: 'Active', users: 56, mfa: 'N/A' },
    { name: 'mTLS Client Certs', status: 'Inactive', users: 0, mfa: 'N/A' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'users' as const, label: 'Users', icon: Users },
          { id: 'roles' as const, label: 'Roles & Permissions', icon: Shield },
          { id: 'sessions' as const, label: 'Active Sessions', icon: Monitor },
          { id: 'auth' as const, label: 'Auth Providers', icon: Fingerprint },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${subTab === t.id ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'}`}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{users.length} users</p>
            <div className="flex gap-2">
              <button onClick={() => toast.info('Invite user modal opened')} className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Invite User</button>
              <button onClick={() => toast.info('Bulk import started')} className="flex items-center gap-1 px-3 py-1.5 rounded bg-muted text-xs hover:bg-muted/80"><Download className="w-3 h-3" /> Import CSV</button>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Name', 'Email', 'Role', 'Tenant', 'Last Login', 'MFA', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{user.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{user.email}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-[10px]">{user.role}</span></td>
                    <td className="py-2 px-3 text-muted-foreground text-[10px]">ACME Corp</td>
                    <td className="py-2 px-3 text-muted-foreground">{user.lastLogin}</td>
                    <td className="py-2 px-3"><span className="text-teal text-[10px]">✓ Enabled</span></td>
                    <td className="py-2 px-3"><StatusBadge status={user.status} /></td>
                    <td className="py-2 px-3 flex gap-1">
                      <button onClick={() => toast.info(`Editing ${user.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                      <button onClick={() => toast.info(`Disabling ${user.name}`)} className="text-[10px] px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20">Disable</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{roles.length} roles · {roles.reduce((a, r) => a + r.users, 0)} assigned users</p>
            <button onClick={() => toast.info('Creating custom role')} className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Create Role</button>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Role', 'Users', 'Permissions', 'Scope', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{r.name}</td>
                    <td className="py-2 px-3">{r.users}</td>
                    <td className="py-2 px-3 text-muted-foreground max-w-[250px] truncate">{r.permissions}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-[10px]">{r.scope}</span></td>
                    <td className="py-2 px-3 flex gap-1">
                      <button onClick={() => toast.info(`Editing ${r.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                      <button onClick={() => toast.info(`Viewing ${r.name} members`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Members</button>
                      <button onClick={() => toast.info(`Cloning ${r.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Clone</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{sessions.length} active sessions</p>
            <button onClick={() => toast.info('Terminating all sessions except yours')} className="flex items-center gap-1 px-3 py-1.5 rounded bg-coral/10 text-coral text-xs hover:bg-coral/20">Terminate All Others</button>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['User', 'Role', 'IP Address', 'Started', 'MFA', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{s.user}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.role}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{s.ip}</td>
                    <td className="py-2 px-3 text-muted-foreground">{s.started}</td>
                    <td className="py-2 px-3">{s.mfa ? <span className="text-teal">✓</span> : <span className="text-coral">✗</span>}</td>
                    <td className="py-2 px-3"><StatusBadge status="Active" /></td>
                    <td className="py-2 px-3">
                      <button onClick={() => toast.info(`Terminating session for ${s.user}`)} className="text-[10px] px-2 py-1 rounded bg-coral/10 text-coral hover:bg-coral/20">Terminate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'auth' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{authProviders.filter(a => a.status === 'Active').length} active providers</p>
            <button onClick={() => toast.info('Adding auth provider')} className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Add Provider</button>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Provider', 'Status', 'Users', 'MFA', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {authProviders.map((p, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{p.name}</td>
                    <td className="py-2 px-3"><StatusBadge status={p.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                    <td className="py-2 px-3">{p.users.toLocaleString()}</td>
                    <td className="py-2 px-3 text-muted-foreground">{p.mfa}</td>
                    <td className="py-2 px-3 flex gap-1">
                      <button onClick={() => toast.info(`Configuring ${p.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Configure</button>
                      <button onClick={() => toast.success(`Test auth for ${p.name} passed`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Test</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── INTEGRATIONS (OS, Apps, Core Infra) ─── */
function InfraIntegrations() {
  const integrations = [
    { name: 'Windows Server (AD CS)', category: 'OS', status: 'Active', instances: 12, lastSync: '5m ago', protocol: 'WinRM/DCOM' },
    { name: 'Linux (OpenSSL/certbot)', category: 'OS', status: 'Active', instances: 248, lastSync: '3m ago', protocol: 'SSH/Agent' },
    { name: 'macOS (Keychain)', category: 'OS', status: 'Active', instances: 85, lastSync: '10m ago', protocol: 'MDM/Agent' },
    { name: 'Apache/Nginx', category: 'Web Server', status: 'Active', instances: 142, lastSync: '2m ago', protocol: 'Agent' },
    { name: 'IIS', category: 'Web Server', status: 'Active', instances: 34, lastSync: '8m ago', protocol: 'WinRM' },
    { name: 'F5 BIG-IP', category: 'Load Balancer', status: 'Active', instances: 8, lastSync: '1m ago', protocol: 'REST API' },
    { name: 'Citrix ADC', category: 'Load Balancer', status: 'Active', instances: 4, lastSync: '6m ago', protocol: 'NITRO API' },
    { name: 'Palo Alto Networks', category: 'Firewall', status: 'Active', instances: 6, lastSync: '4m ago', protocol: 'XML API' },
    { name: 'Kubernetes (cert-manager)', category: 'Container', status: 'Active', instances: 14, lastSync: '30s ago', protocol: 'K8s API' },
    { name: 'Docker / Swarm', category: 'Container', status: 'Active', instances: 22, lastSync: '2m ago', protocol: 'Docker API' },
    { name: 'VMware vSphere', category: 'Virtualization', status: 'Active', instances: 3, lastSync: '15m ago', protocol: 'vSphere API' },
    { name: 'AWS (ACM, IAM, KMS)', category: 'Cloud', status: 'Active', instances: 5, lastSync: '1m ago', protocol: 'AWS SDK' },
    { name: 'Azure (Key Vault, App GW)', category: 'Cloud', status: 'Active', instances: 3, lastSync: '2m ago', protocol: 'Azure SDK' },
    { name: 'GCP (CAS, Secret Mgr)', category: 'Cloud', status: 'Inactive', instances: 0, lastSync: '—', protocol: 'gcloud SDK' },
  ];

  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Integrations" value={String(integrations.length)} icon={Plug} />
        <MetricCard label="Active" value={String(integrations.filter(i => i.status === 'Active').length)} icon={CheckCircle} />
        <MetricCard label="Managed Instances" value={integrations.reduce((a, i) => a + i.instances, 0).toLocaleString()} icon={Box} />
        <MetricCard label="Categories" value={String(categories.length)} icon={Layers} />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Platform Integrations — OS, Applications & Infrastructure</h3>
          <button onClick={() => toast.info('Integration marketplace opening...')} className="text-[10px] px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center gap-1"><Plus className="w-3 h-3" /> Add Integration</button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Integration', 'Category', 'Status', 'Instances', 'Protocol', 'Last Sync', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {integrations.map((ig, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{ig.name}</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">{ig.category}</span></td>
                <td className="py-2 px-3"><StatusBadge status={ig.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                <td className="py-2 px-3">{ig.instances}</td>
                <td className="py-2 px-3 text-muted-foreground text-[10px]">{ig.protocol}</td>
                <td className="py-2 px-3 text-muted-foreground text-[10px]">{ig.lastSync}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Syncing ${ig.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20"><RefreshCw className="w-3 h-3 inline" /> Sync</button>
                  <button onClick={() => toast.info(`Configuring ${ig.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── INFRASTRUCTURE RESOURCE MANAGEMENT ─── */
function InfrastructureResources() {
  const [subTab, setSubTab] = useState<'overview' | 'backup' | 'scaling' | 'ha'>('overview');

  const resources = [
    { name: 'Primary DB Cluster', type: 'PostgreSQL', region: 'US-East', cpu: '8 vCPU', memory: '32 GB', storage: '2 TB', utilization: 68, status: 'Healthy' },
    { name: 'Replica DB (DR)', type: 'PostgreSQL', region: 'EU-West', cpu: '8 vCPU', memory: '32 GB', storage: '2 TB', utilization: 12, status: 'Standby' },
    { name: 'App Server Pool', type: 'K8s Cluster', region: 'US-East', cpu: '64 vCPU', memory: '256 GB', storage: '500 GB', utilization: 52, status: 'Healthy' },
    { name: 'Cache Layer', type: 'Redis Cluster', region: 'US-East', cpu: '4 vCPU', memory: '64 GB', storage: '—', utilization: 41, status: 'Healthy' },
    { name: 'Message Queue', type: 'Kafka', region: 'US-East', cpu: '16 vCPU', memory: '64 GB', storage: '4 TB', utilization: 73, status: 'Warning' },
    { name: 'Object Storage', type: 'S3-compatible', region: 'Multi', cpu: '—', memory: '—', storage: '18 TB', utilization: 45, status: 'Healthy' },
  ];

  const backups = [
    { name: 'Full DB Backup', schedule: 'Daily 02:00 UTC', lastRun: '2026-04-15 02:00', size: '845 GB', duration: '42 min', status: 'Success', retention: '30 days' },
    { name: 'Incremental DB', schedule: 'Every 6h', lastRun: '2026-04-15 14:00', size: '12 GB', duration: '3 min', status: 'Success', retention: '7 days' },
    { name: 'Config Backup', schedule: 'Daily 03:00 UTC', lastRun: '2026-04-15 03:00', size: '2.1 GB', duration: '1 min', status: 'Success', retention: '90 days' },
    { name: 'Audit Log Archive', schedule: 'Weekly Sun 01:00', lastRun: '2026-04-13 01:00', size: '120 GB', duration: '18 min', status: 'Success', retention: '2 years' },
    { name: 'HSM Key Backup', schedule: 'Daily 04:00 UTC', lastRun: '2026-04-15 04:00', size: '450 MB', duration: '<1 min', status: 'Success', retention: '365 days' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview' as const, label: 'Resource Overview', icon: Cpu },
          { id: 'backup' as const, label: 'Backup & Restore', icon: Archive },
          { id: 'scaling' as const, label: 'Scaling & Allocation', icon: BarChart3 },
          { id: 'ha' as const, label: 'HA & DR', icon: Shield },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${subTab === t.id ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'}`}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Total Resources" value={String(resources.length)} icon={Server} />
            <MetricCard label="Avg Utilization" value={`${Math.round(resources.reduce((a, r) => a + r.utilization, 0) / resources.length)}%`} icon={Activity} />
            <MetricCard label="Storage Allocated" value="27 TB" icon={HardDrive} />
            <MetricCard label="Regions" value="3" icon={Globe} />
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Resource', 'Type', 'Region', 'CPU', 'Memory', 'Storage', 'Utilization', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {resources.map((r, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{r.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.type}</td>
                    <td className="py-2 px-3 text-muted-foreground text-[10px]">{r.region}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.cpu}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.memory}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.storage}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 w-16">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.utilization > 70 ? 'bg-amber' : 'bg-teal'}`} style={{ width: `${r.utilization}%` }} /></div>
                        <span className="text-[10px]">{r.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3"><StatusBadge status={r.status === 'Healthy' ? 'Active' : r.status === 'Standby' ? 'Scheduled' : 'Warning'} /></td>
                    <td className="py-2 px-3 flex gap-1">
                      <button onClick={() => toast.info(`Scaling ${r.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Scale</button>
                      <button onClick={() => toast.info(`Viewing ${r.name} metrics`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Metrics</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'backup' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Backup Jobs" value={String(backups.length)} icon={Archive} />
            <MetricCard label="Last Full Backup" value="6h ago" icon={CheckCircle} />
            <MetricCard label="Total Backup Size" value="980 GB" icon={HardDrive} />
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Backup Schedule</h3>
              <div className="flex gap-2">
                <button onClick={() => toast.info('Triggering immediate full backup...')} className="text-[10px] px-3 py-1.5 rounded bg-teal text-primary-foreground hover:bg-teal-light">Run Backup Now</button>
                <button onClick={() => toast.info('Opening restore wizard...')} className="text-[10px] px-3 py-1.5 rounded bg-amber/10 text-amber hover:bg-amber/20">Restore from Backup</button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Backup', 'Schedule', 'Last Run', 'Size', 'Duration', 'Retention', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {backups.map((b, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{b.name}</td>
                    <td className="py-2 px-3 text-muted-foreground text-[10px]">{b.schedule}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{b.lastRun}</td>
                    <td className="py-2 px-3">{b.size}</td>
                    <td className="py-2 px-3 text-muted-foreground">{b.duration}</td>
                    <td className="py-2 px-3 text-muted-foreground">{b.retention}</td>
                    <td className="py-2 px-3"><StatusBadge status="Active" /></td>
                    <td className="py-2 px-3 flex gap-1">
                      <button onClick={() => toast.info(`Running ${b.name} now...`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Run</button>
                      <button onClick={() => toast.info(`Restoring from ${b.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Restore</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'scaling' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-4">Auto-Scaling Rules</h3>
            <div className="space-y-3">
              {[
                { resource: 'App Server Pool', metric: 'CPU > 75%', action: 'Add 2 pods', cooldown: '5 min', status: 'Active' },
                { resource: 'App Server Pool', metric: 'CPU < 30%', action: 'Remove 1 pod (min 3)', cooldown: '10 min', status: 'Active' },
                { resource: 'Cache Layer', metric: 'Memory > 85%', action: 'Scale to next tier', cooldown: '15 min', status: 'Active' },
                { resource: 'Message Queue', metric: 'Lag > 10K msgs', action: 'Add partition + consumer', cooldown: '5 min', status: 'Active' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-xs">
                  <div className="flex-1">
                    <span className="font-medium">{rule.resource}</span>
                    <span className="text-muted-foreground ml-2">when {rule.metric} → {rule.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Cooldown: {rule.cooldown}</span>
                    <StatusBadge status="Active" />
                    <button onClick={() => toast.info(`Editing scaling rule for ${rule.resource}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => toast.info('Creating scaling rule')} className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Add Rule</button>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Resource Allocation</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'CPU Allocated', used: '96 vCPU', total: '128 vCPU', pct: 75 },
                { label: 'Memory Allocated', used: '384 GB', total: '512 GB', pct: 75 },
                { label: 'Storage Allocated', used: '27 TB', total: '40 TB', pct: 68 },
              ].map((r, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-medium">{r.label}</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${r.pct}%` }} /></div>
                  <p className="text-[10px] text-muted-foreground">{r.used} / {r.total} ({r.pct}%)</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'ha' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="RPO Target" value="< 5 min" icon={Activity} />
            <MetricCard label="RTO Target" value="< 15 min" icon={RefreshCw} />
            <MetricCard label="Last DR Test" value="2026-03-28" icon={Shield} />
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-4">High Availability Configuration</h3>
            <div className="space-y-3">
              {[
                { component: 'Database', primary: 'US-East (Active)', secondary: 'EU-West (Standby)', replication: 'Sync', lag: '< 1s', failover: 'Automatic' },
                { component: 'App Servers', primary: 'US-East (3 pods)', secondary: 'EU-West (2 pods)', replication: 'Active-Active', lag: 'N/A', failover: 'Load Balanced' },
                { component: 'Cache', primary: 'US-East (Cluster)', secondary: 'EU-West (Replica)', replication: 'Async', lag: '< 5s', failover: 'Automatic' },
                { component: 'Message Queue', primary: 'US-East (3 brokers)', secondary: 'EU-West (2 brokers)', replication: 'Mirror', lag: '< 2s', failover: 'Automatic' },
              ].map((ha, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 py-2 border-b border-border last:border-0 text-xs">
                  <span className="font-medium">{ha.component}</span>
                  <span className="text-muted-foreground text-[10px]">{ha.primary}</span>
                  <span className="text-muted-foreground text-[10px]">{ha.secondary}</span>
                  <span className="text-muted-foreground text-[10px]">{ha.replication}</span>
                  <span className="text-muted-foreground text-[10px]">{ha.lag}</span>
                  <span className="text-teal text-[10px]">{ha.failover}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => toast.info('Initiating DR failover test...')} className="px-3 py-1.5 rounded bg-amber/10 text-amber text-xs hover:bg-amber/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Test Failover</button>
            <button onClick={() => toast.info('Generating DR readiness report...')} className="px-3 py-1.5 rounded bg-muted text-xs hover:bg-muted/80 flex items-center gap-1"><Download className="w-3 h-3" /> DR Report</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SHARED ─── */
function MetricCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${accent ? 'text-amber' : 'text-teal'}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold ${accent ? 'text-amber' : ''}`}>{value}</p>
    </div>
  );
}
