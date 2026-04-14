import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, Key, Users, UserCheck, Fingerprint,
  Lock, Server, HardDrive,
  FileText, Bell, AlertTriangle, Settings, Activity,
  Plus, Download, Search, ToggleLeft, Eye, EyeOff, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/UIComponents';
import { users, auditLog } from '@/data/mockData';

type PillarTab = 'identity' | 'security-infra' | 'platform-services';
type IdentitySubTab = 'authentication' | 'rbac' | 'delegation';
type SecuritySubTab = 'hsm' | 'pam';
type PlatformSubTab = 'licensing' | 'logging' | 'alerts' | 'notifications' | 'settings';

export default function CoreServicesPage() {
  const [pillar, setPillar] = useState<PillarTab>('identity');
  const [identitySub, setIdentitySub] = useState<IdentitySubTab>('authentication');
  const [securitySub, setSecuritySub] = useState<SecuritySubTab>('hsm');
  const [platformSub, setPlatformSub] = useState<PlatformSubTab>('licensing');

  const pillars = [
    { id: 'identity' as const, label: 'Identity & Access', icon: Shield },
    { id: 'security-infra' as const, label: 'Security Infrastructure', icon: Lock },
    { id: 'platform-services' as const, label: 'Platform Services', icon: Server },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Platform Core</h1>

      {/* Pillar tabs */}
      <div className="flex gap-1 border-b border-border">
        {pillars.map(p => (
          <button key={p.id} onClick={() => setPillar(p.id)} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${pillar === p.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <p.icon className="w-3.5 h-3.5" /> {p.label}
          </button>
        ))}
      </div>

      {pillar === 'identity' && <IdentityAccess sub={identitySub} setSub={setIdentitySub} />}
      {pillar === 'security-infra' && <SecurityInfrastructure sub={securitySub} setSub={setSecuritySub} />}
      {pillar === 'platform-services' && <PlatformServices sub={platformSub} setSub={setPlatformSub} />}
    </div>
  );
}

/* ─── IDENTITY & ACCESS ─── */
function IdentityAccess({ sub, setSub }: { sub: IdentitySubTab; setSub: (s: IdentitySubTab) => void }) {
  const tabs = [
    { id: 'authentication' as const, label: 'Authentication', icon: Fingerprint },
    { id: 'rbac' as const, label: 'RBAC', icon: Users },
    { id: 'delegation' as const, label: 'Delegation', icon: UserCheck },
  ];

  return (
    <div className="space-y-4">
      <SubTabs tabs={tabs} active={sub} setActive={setSub} />
      {sub === 'authentication' && <AuthenticationPanel />}
      {sub === 'rbac' && <RBACPanel />}
      {sub === 'delegation' && <DelegationPanel />}
    </div>
  );
}

function AuthenticationPanel() {
  const providers = [
    { name: 'SAML / SSO', status: 'Active', provider: 'Okta', users: 342 },
    { name: 'LDAP', status: 'Active', provider: 'Active Directory', users: 1205 },
    { name: 'Local Auth', status: 'Active', provider: 'Built-in', users: 28 },
    { name: 'API Keys', status: 'Active', provider: 'Platform', users: 56 },
    { name: 'mTLS Client Certs', status: 'Inactive', provider: '—', users: 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Active Sessions" value="1,847" icon={Activity} />
        <MetricCard label="Auth Providers" value="4 / 5" icon={Key} />
        <MetricCard label="Failed Logins (24h)" value="12" icon={AlertTriangle} accent />
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Provider', 'Status', 'Connected To', 'Users', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{p.name}</td>
                <td className="py-2 px-3"><StatusBadge status={p.status} /></td>
                <td className="py-2 px-3 text-muted-foreground">{p.provider}</td>
                <td className="py-2 px-3">{p.users.toLocaleString()}</td>
                <td className="py-2 px-3">
                  <button onClick={() => toast.info(`Configuring ${p.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Configure</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button onClick={() => toast.info('Adding new auth provider')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Add Provider</button>
        <button onClick={() => toast.info('Opening session manager')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80"><Eye className="w-3 h-3" /> View Sessions</button>
      </div>
    </div>
  );
}

function RBACPanel() {
  const roles = [
    { name: 'Platform Admin', users: 3, permissions: 'Full access', scope: 'Global' },
    { name: 'Security Admin', users: 8, permissions: 'Manage policies, remediation, integrations', scope: 'Global' },
    { name: 'PKI Engineer', users: 15, permissions: 'Manage certificates, discovery, inventory', scope: 'Module: Cert+' },
    { name: 'Compliance Officer', users: 5, permissions: 'Read-only policies, reports, audit log', scope: 'Global' },
    { name: 'Application Owner', users: 42, permissions: 'Request certs, view own inventory', scope: 'Assigned apps' },
    { name: 'Read-Only Auditor', users: 6, permissions: 'Read-only all modules', scope: 'Global' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{roles.length} roles configured · {roles.reduce((a, r) => a + r.users, 0)} total users</p>
        <button onClick={() => toast.info('Creating custom role')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Create Role</button>
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
                <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{r.permissions}</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-[10px]">{r.scope}</span></td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Editing ${r.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                  <button onClick={() => toast.info(`Viewing ${r.name} members`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Members</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DelegationPanel() {
  const delegations = [
    { from: 'Alice Chen', to: 'Bob Martinez', scope: 'Certificate Approvals', expires: '2026-05-01', status: 'Active' },
    { from: 'Sarah Johnson', to: 'David Kim', scope: 'SSH Key Rotation', expires: '2026-04-20', status: 'Active' },
    { from: 'Tom Wilson', to: 'Emily Davis', scope: 'Policy Changes', expires: '2026-04-30', status: 'Pending' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{delegations.length} active delegations</p>
        <button onClick={() => toast.info('Creating new delegation')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> New Delegation</button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Delegator', 'Delegate', 'Scope', 'Expires', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {delegations.map((d, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{d.from}</td>
                <td className="py-2 px-3">{d.to}</td>
                <td className="py-2 px-3 text-muted-foreground">{d.scope}</td>
                <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{d.expires}</td>
                <td className="py-2 px-3"><StatusBadge status={d.status} /></td>
                <td className="py-2 px-3">
                  <button onClick={() => toast.info(`Revoking delegation from ${d.from}`)} className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── SECURITY INFRASTRUCTURE ─── */
function SecurityInfrastructure({ sub, setSub }: { sub: SecuritySubTab; setSub: (s: SecuritySubTab) => void }) {
  const tabs = [
    { id: 'hsm' as const, label: 'HSM Integrations', icon: HardDrive },
    { id: 'pam' as const, label: 'PAM Integrations', icon: Key },
  ];

  return (
    <div className="space-y-4">
      <SubTabs tabs={tabs} active={sub} setActive={setSub} />
      {sub === 'hsm' && <HSMPanel />}
      {sub === 'pam' && <PAMPanel />}
    </div>
  );
}

function HSMPanel() {
  const hsms = [
    { name: 'Thales Luna 7', type: 'Network HSM', status: 'Connected', keys: 12450, partition: 'avx-prod-01', firmware: 'v7.8.2' },
    { name: 'AWS CloudHSM', type: 'Cloud HSM', status: 'Connected', keys: 8320, partition: 'us-east-1-cluster', firmware: 'v3.4.1' },
    { name: 'Azure Managed HSM', type: 'Cloud HSM', status: 'Connected', keys: 5100, partition: 'avx-keyvault-prod', firmware: 'v2.1.0' },
    { name: 'Entrust nShield', type: 'Network HSM', status: 'Degraded', keys: 3200, partition: 'avx-dr-01', firmware: 'v12.80' },
    { name: 'Google Cloud HSM', type: 'Cloud HSM', status: 'Not Connected', keys: 0, partition: '—', firmware: '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total HSMs" value="5" icon={HardDrive} />
        <MetricCard label="Keys Managed" value="29.1K" icon={Key} />
        <MetricCard label="Degraded" value="1" icon={AlertTriangle} accent />
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['HSM', 'Type', 'Status', 'Keys', 'Partition', 'Firmware', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {hsms.map((h, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{h.name}</td>
                <td className="py-2 px-3 text-muted-foreground">{h.type}</td>
                <td className="py-2 px-3"><StatusBadge status={h.status === 'Connected' ? 'Active' : h.status === 'Degraded' ? 'Warning' : 'Inactive'} /></td>
                <td className="py-2 px-3">{h.keys.toLocaleString()}</td>
                <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{h.partition}</td>
                <td className="py-2 px-3 text-muted-foreground">{h.firmware}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Testing ${h.name} connectivity`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Test</button>
                  <button onClick={() => toast.info(`Configuring ${h.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => toast.info('HSM enrollment wizard opened')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Enroll HSM</button>
    </div>
  );
}

function PAMPanel() {
  const pams = [
    { name: 'CyberArk Vault', status: 'Connected', accounts: 856, lastSync: '2 min ago', type: 'Privileged Access' },
    { name: 'HashiCorp Vault', status: 'Connected', accounts: 1240, lastSync: '5 min ago', type: 'Secrets Management' },
    { name: 'BeyondTrust', status: 'Connected', accounts: 430, lastSync: '12 min ago', type: 'Privileged Access' },
    { name: 'Delinea Secret Server', status: 'Not Connected', accounts: 0, lastSync: '—', type: 'Secrets Management' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="PAM Systems" value="4" icon={Key} />
        <MetricCard label="Managed Accounts" value="2,526" icon={Users} />
        <MetricCard label="Last Sync" value="2m ago" icon={RefreshCw} />
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['System', 'Type', 'Status', 'Accounts', 'Last Sync', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {pams.map((p, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{p.name}</td>
                <td className="py-2 px-3 text-muted-foreground">{p.type}</td>
                <td className="py-2 px-3"><StatusBadge status={p.status === 'Connected' ? 'Active' : 'Inactive'} /></td>
                <td className="py-2 px-3">{p.accounts.toLocaleString()}</td>
                <td className="py-2 px-3 text-muted-foreground">{p.lastSync}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Syncing ${p.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20"><RefreshCw className="w-3 h-3 inline" /> Sync</button>
                  <button onClick={() => toast.info(`Configuring ${p.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => toast.info('PAM integration wizard opened')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Connect PAM</button>
    </div>
  );
}

/* ─── PLATFORM SERVICES ─── */
function PlatformServices({ sub, setSub }: { sub: PlatformSubTab; setSub: (s: PlatformSubTab) => void }) {
  const tabs = [
    { id: 'licensing' as const, label: 'Licensing', icon: FileText },
    { id: 'logging' as const, label: 'Logging', icon: Activity },
    { id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-4">
      <SubTabs tabs={tabs} active={sub} setActive={setSub} />
      {sub === 'licensing' && <LicensingPanel />}
      {sub === 'logging' && <LoggingPanel />}
      {sub === 'alerts' && <AlertsPanel />}
      {sub === 'notifications' && <NotificationsPanel />}
      {sub === 'settings' && <SettingsPanel />}
    </div>
  );
}

function LicensingPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">License: AVX Trust Enterprise</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div><p className="text-muted-foreground">Tier</p><p className="font-medium">Enterprise</p></div>
          <div><p className="text-muted-foreground">Expiry</p><p className="font-medium">December 31, 2027</p></div>
          <div><p className="text-muted-foreground">Nodes Licensed</p><p className="font-medium">Unlimited</p></div>
        </div>
        <h4 className="text-xs font-semibold mt-6 mb-3">Modules</h4>
        <div className="space-y-2">
          {[
            { name: 'CLM / PKI (Cert+)', status: 'Active', usage: 82 },
            { name: 'SSH Key Manager', status: 'Active', usage: 67 },
            { name: 'Kubernetes TLS', status: 'Active', usage: 45 },
            { name: 'Code Signing', status: 'Active', usage: 23 },
            { name: 'QTH (Quantum Trust Hub)', status: 'In Development', usage: 0 },
            { name: 'Eos (AI Identity)', status: 'Planned — Dec 2026', usage: 0 },
          ].map(m => (
            <div key={m.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{m.name}</span>
                <StatusBadge status={m.status === 'Active' ? 'Active' : m.status.includes('Development') ? 'In progress' : 'Scheduled'} />
              </div>
              {m.usage > 0 && (
                <div className="flex items-center gap-2 w-32">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${m.usage}%` }} /></div>
                  <span className="text-[10px] text-muted-foreground">{m.usage}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => toast.info('Expansion request submitted')} className="mt-4 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80">Request Expansion</button>
      </div>
    </div>
  );
}

function LoggingPanel() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" placeholder="Search audit log..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-teal" /></div>
        <button onClick={() => toast.success('Audit log exported')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80"><Download className="w-3 h-3" /> Export CSV</button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Timestamp', 'User', 'Action', 'Asset', 'IP Address', 'Result'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {auditLog.map((entry, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{entry.timestamp}</td>
                <td className="py-2 px-3">{entry.user}</td>
                <td className="py-2 px-3">{entry.action}</td>
                <td className="py-2 px-3 text-muted-foreground">{entry.asset}</td>
                <td className="py-2 px-3 text-muted-foreground font-mono">{entry.ip}</td>
                <td className="py-2 px-3"><span className="text-teal">{entry.result}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsPanel() {
  const alerts = [
    { rule: 'Certificate expiry < 30 days', severity: 'Critical', channel: 'Email + Slack', triggered: 23, status: 'Active' },
    { rule: 'Weak key algorithm detected', severity: 'High', channel: 'Email', triggered: 8, status: 'Active' },
    { rule: 'HSM connectivity lost', severity: 'Critical', channel: 'PagerDuty + Email', triggered: 1, status: 'Active' },
    { rule: 'Policy violation on issuance', severity: 'Medium', channel: 'Slack', triggered: 45, status: 'Active' },
    { rule: 'Orphaned certificate found', severity: 'Low', channel: 'Email', triggered: 12, status: 'Muted' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{alerts.filter(a => a.status === 'Active').length} active rules · {alerts.reduce((a, r) => a + r.triggered, 0)} triggered this week</p>
        <button onClick={() => toast.info('Creating alert rule')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> New Rule</button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Rule', 'Severity', 'Channel', 'Triggered', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {alerts.map((a, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{a.rule}</td>
                <td className="py-2 px-3"><StatusBadge status={a.severity === 'Critical' ? 'Critical' : a.severity === 'High' ? 'Warning' : 'Active'} /></td>
                <td className="py-2 px-3 text-muted-foreground">{a.channel}</td>
                <td className="py-2 px-3">{a.triggered}</td>
                <td className="py-2 px-3"><StatusBadge status={a.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.info(`Editing rule`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
                  <button onClick={() => toast.info(`${a.status === 'Active' ? 'Muting' : 'Enabling'} rule`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">{a.status === 'Active' ? 'Mute' : 'Enable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const channels = [
    { name: 'Email (SMTP)', status: 'Active', endpoint: 'smtp.avxtrust.com', icon: '📧' },
    { name: 'Slack', status: 'Active', endpoint: '#security-alerts', icon: '💬' },
    { name: 'PagerDuty', status: 'Active', endpoint: 'AVX Trust Service', icon: '🔔' },
    { name: 'Microsoft Teams', status: 'Inactive', endpoint: '—', icon: '👥' },
    { name: 'Webhook', status: 'Active', endpoint: 'https://hooks.avxtrust.com/notify', icon: '🔗' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{channels.filter(c => c.status === 'Active').length} channels active</p>
        <button onClick={() => toast.info('Adding notification channel')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Add Channel</button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Channel', 'Status', 'Endpoint', 'Actions'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {channels.map((c, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">{c.icon} {c.name}</td>
                <td className="py-2 px-3"><StatusBadge status={c.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{c.endpoint}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => toast.success(`Test notification sent to ${c.name}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Test</button>
                  <button onClick={() => toast.info(`Configuring ${c.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Config</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const settings = [
    { label: 'Auto-discovery scan interval', value: 'Every 6 hours', type: 'select' },
    { label: 'Default certificate validity', value: '365 days', type: 'select' },
    { label: 'Enforce MFA for all users', value: 'Enabled', type: 'toggle' },
    { label: 'API rate limit', value: '1000 req/min', type: 'input' },
    { label: 'Session timeout', value: '30 minutes', type: 'select' },
    { label: 'Audit log retention', value: '2 years', type: 'select' },
    { label: 'PQC migration mode', value: 'Hybrid (dual-algorithm)', type: 'select' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border divide-y divide-border">
        {settings.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-3 px-4">
            <span className="text-xs font-medium">{s.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{s.value}</span>
              <button onClick={() => toast.info(`Editing: ${s.label}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">Edit</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => toast.success('Settings saved')} className="px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">Save Changes</button>
        <button onClick={() => toast.info('Settings reset to defaults')} className="px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80">Reset Defaults</button>
      </div>
    </div>
  );
}

/* ─── SHARED COMPONENTS ─── */
function SubTabs<T extends string>({ tabs, active, setActive }: { tabs: { id: T; label: string; icon: React.ElementType }[]; active: T; setActive: (id: T) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${active === t.id ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'}`}>
          <t.icon className="w-3 h-3" /> {t.label}
        </button>
      ))}
    </div>
  );
}

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
