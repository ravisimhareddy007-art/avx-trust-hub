import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, X, Check, ChevronDown, ChevronRight,
  AlertTriangle, AlertCircle, Eye, EyeOff, Copy, RefreshCw,
  Trash2, Pause, Play, Shield, Zap, Activity, Globe,
  FileText, Settings, Lock, Cpu, CheckCircle2, Clock,
  ToggleLeft, ToggleRight, ExternalLink, Info,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'catalog' | 'accounts' | 'audit' | 'admin';
type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
type ToolStatus = 'published' | 'pending_review' | 'deprecated' | 'degraded';
type AccountStatus = 'active' | 'suspended' | 'deleted';
type AuditOutcome = 'success' | 'rejected' | 'pending_approval' | 'pending_confirmation' | 'abandoned' | 'failed';

// ── Mock Data ─────────────────────────────────────────────────────────────────
const TOOLS: {
  id: string; name: string; title: string; description: string; module: string;
  tier: Tier; status: ToolStatus; scope: string; version: string;
  readOnly: boolean; destructive: boolean; approvalRequired: boolean;
  registeredBy: string; registeredAt: string; invocations: number;
}[] = [
  { id: 't1', name: 'list_certificates', title: 'List Certificates', description: 'Returns a paginated list of certificates in the tenant inventory, filtered by status, expiry window, or CA.', module: 'CLM', tier: 'T1', status: 'published', scope: 'avx:read', version: 'v1.2', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-03-12', invocations: 4821 },
  { id: 't2', name: 'get_certificate_details', title: 'Get Certificate Details', description: 'Returns full metadata for a single certificate by ID including chain, SANs, algorithm, and compliance status.', module: 'CLM', tier: 'T1', status: 'published', scope: 'avx:read', version: 'v1.1', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-03-12', invocations: 3102 },
  { id: 't3', name: 'analyze_expiry_risk', title: 'Analyze Expiry Risk', description: 'Analyzes certificates expiring within a specified window and returns a prioritized risk report with HNDL exposure scoring.', module: 'CLM', tier: 'T2', status: 'published', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'ravi.r@appviewx.com', registeredAt: '2026-04-01', invocations: 1890 },
  { id: 't4', name: 'get_pqc_posture', title: 'Get PQC Posture', description: 'Returns quantum vulnerability assessment for the tenant inventory, including algorithm distribution and migration wave assignments.', module: 'CLM', tier: 'T2', status: 'published', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'ravi.r@appviewx.com', registeredAt: '2026-04-15', invocations: 742 },
  { id: 't5', name: 'create_renewal_request', title: 'Create Renewal Request', description: 'Creates a certificate renewal workflow request. Triggers in-session confirmation before creating the AppViewX workflow record.', module: 'CLM', tier: 'T3', status: 'published', scope: 'avx:workflow:create', version: 'v1.0', readOnly: false, destructive: false, approvalRequired: true, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-04-20', invocations: 312 },
  { id: 't6', name: 'create_ssh_key_request', title: 'Create SSH Key Request', description: 'Creates a new SSH key provisioning workflow request. Requires in-session confirmation.', module: 'SSH', tier: 'T3', status: 'pending_review', scope: 'avx:workflow:create', version: 'v1.0', readOnly: false, destructive: false, approvalRequired: true, registeredBy: 'sanjay.k@appviewx.com', registeredAt: '2026-05-10', invocations: 0 },
  { id: 't7', name: 'execute_certificate_renewal', title: 'Execute Certificate Renewal', description: 'Executes an approved certificate renewal workflow. Requires pre-approval via AppViewX workflow engine before execution.', module: 'CLM', tier: 'T4', status: 'published', scope: 'avx:workflow:execute', version: 'v1.0', readOnly: false, destructive: false, approvalRequired: true, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-04-20', invocations: 89 },
  { id: 't8', name: 'check_request_status', title: 'Check Request Status', description: 'Returns the current status of a pending T4 or T5 approval request by Correlation ID. Use for polling approval state.', module: 'CLM', tier: 'T1', status: 'published', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-04-20', invocations: 201 },
  { id: 't9', name: 'revoke_certificate', title: 'Revoke Certificate', description: 'Revokes a certificate via the issuing CA. Requires pre-approval AND post-execution approval. Rollback restores to previous state via CA API.', module: 'CLM', tier: 'T5', status: 'published', scope: 'avx:workflow:execute', version: 'v1.0', readOnly: false, destructive: true, approvalRequired: true, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-05-01', invocations: 4 },
  { id: 't10', name: 'list_ssh_keys', title: 'List SSH Keys', description: 'Returns a paginated list of SSH keys in the tenant inventory filtered by host, user, or risk status.', module: 'SSH', tier: 'T1', status: 'degraded', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'sanjay.k@appviewx.com', registeredAt: '2026-03-28', invocations: 620 },
];

const SERVICE_ACCOUNTS: {
  id: string; name: string; description: string; scopes: string[];
  status: AccountStatus; clientId: string; created: string; lastUsed: string;
  tokenExpiry: string; sessions: number;
}[] = [
  { id: 'sa1', name: 'copilot-prod', description: 'GitHub Copilot production integration', scopes: ['avx:read'], status: 'active', clientId: 'avx_c8f2a1b3d4e5', created: '2026-03-15', lastUsed: '2026-05-31 08:42', tokenExpiry: '1h', sessions: 3 },
  { id: 'sa2', name: 'claude-security-team', description: 'Claude integration for Security Admin team', scopes: ['avx:read', 'avx:workflow:create'], status: 'active', clientId: 'avx_a7e9c2d1f0b4', created: '2026-04-02', lastUsed: '2026-05-31 11:18', tokenExpiry: '4h', sessions: 1 },
  { id: 'sa3', name: 'chatgpt-ops', description: 'ChatGPT Enterprise connector for Ops team', scopes: ['avx:read', 'avx:workflow:create', 'avx:workflow:execute'], status: 'active', clientId: 'avx_f3b8d2a5c9e1', created: '2026-04-20', lastUsed: '2026-05-30 16:05', tokenExpiry: '1h', sessions: 0 },
  { id: 'sa4', name: 'cursor-devteam', description: 'Cursor integration for Development team — suspended pending review', scopes: ['avx:read'], status: 'suspended', clientId: 'avx_e1a4b7c0d3f2', created: '2026-05-01', lastUsed: '2026-05-20 09:30', tokenExpiry: '1h', sessions: 0 },
  { id: 'sa5', name: 'automation-pipeline', description: 'Internal CI/CD pipeline integration for automated renewal checks', scopes: ['avx:read', 'avx:workflow:create'], status: 'active', clientId: 'avx_b2c5d8e1f4a7', created: '2026-05-15', lastUsed: '2026-05-31 06:00', tokenExpiry: '24h', sessions: 2 },
];

const AUDIT_LOG: {
  id: string; correlationId: string; timestamp: string; tenant: string;
  client: string; tool: string; tier: Tier; outcome: AuditOutcome;
  approvalStatus: string; duration: string;
}[] = [
  { id: 'a1', correlationId: 'crr-8f2a1b3d-4e5c', timestamp: '2026-05-31 11:42:08', tenant: 'acmecorp', client: 'claude-security-team', tool: 'list_certificates', tier: 'T1', outcome: 'success', approvalStatus: 'n/a', duration: '142ms' },
  { id: 'a2', correlationId: 'crr-7e9c2d1f-0b4a', timestamp: '2026-05-31 11:38:21', tenant: 'acmecorp', client: 'claude-security-team', tool: 'analyze_expiry_risk', tier: 'T2', outcome: 'success', approvalStatus: 'n/a', duration: '318ms' },
  { id: 'a3', correlationId: 'crr-3b8d2a5c-9e1f', timestamp: '2026-05-31 11:30:05', tenant: 'acmecorp', client: 'chatgpt-ops', tool: 'create_renewal_request', tier: 'T3', outcome: 'success', approvalStatus: 'confirmed', duration: '204ms' },
  { id: 'a4', correlationId: 'crr-1a4b7c0d-3f2e', timestamp: '2026-05-31 11:28:44', tenant: 'acmecorp', client: 'chatgpt-ops', tool: 'execute_certificate_renewal', tier: 'T4', outcome: 'pending_approval', approvalStatus: 'awaiting_approver', duration: '489ms' },
  { id: 'a5', correlationId: 'crr-2c5d8e1f-4a7b', timestamp: '2026-05-31 11:15:00', tenant: 'acmecorp', client: 'copilot-prod', tool: 'get_certificate_details', tier: 'T1', outcome: 'success', approvalStatus: 'n/a', duration: '98ms' },
  { id: 'a6', correlationId: 'crr-5d6e9f2a-1b3c', timestamp: '2026-05-31 11:10:33', tenant: 'acmecorp', client: 'chatgpt-ops', tool: 'create_renewal_request', tier: 'T3', outcome: 'abandoned', approvalStatus: 'timeout', duration: '300001ms' },
  { id: 'a7', correlationId: 'crr-9f1a4b7c-2d5e', timestamp: '2026-05-31 10:58:12', tenant: 'acmecorp', client: 'copilot-prod', tool: 'list_certificates', tier: 'T1', outcome: 'rejected', approvalStatus: 'n/a', duration: '12ms' },
  { id: 'a8', correlationId: 'crr-4e5f8a2b-0c7d', timestamp: '2026-05-31 10:45:50', tenant: 'acmecorp', client: 'claude-security-team', tool: 'get_pqc_posture', tier: 'T2', outcome: 'success', approvalStatus: 'n/a', duration: '421ms' },
  { id: 'a9', correlationId: 'crr-6a7b1c4d-3e8f', timestamp: '2026-05-31 09:22:07', tenant: 'acmecorp', client: 'chatgpt-ops', tool: 'revoke_certificate', tier: 'T5', outcome: 'success', approvalStatus: 'pre+post approved', duration: '6240ms' },
  { id: 'a10', correlationId: 'crr-0b1c2d3e-5f9a', timestamp: '2026-05-31 08:10:44', tenant: 'acmecorp', client: 'automation-pipeline', tool: 'list_certificates', tier: 'T1', outcome: 'success', approvalStatus: 'n/a', duration: '110ms' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIER_META: Record<Tier, { label: string; color: string; bg: string; desc: string }> = {
  T1: { label: 'T1', color: 'text-gray-400', bg: 'bg-gray-400/10', desc: 'Read-only' },
  T2: { label: 'T2', color: 'text-blue-400', bg: 'bg-blue-400/10', desc: 'Analysis' },
  T3: { label: 'T3', color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'Workflow create' },
  T4: { label: 'T4', color: 'text-orange-400', bg: 'bg-orange-400/10', desc: 'Workflow execute' },
  T5: { label: 'T5', color: 'text-red-400', bg: 'bg-red-400/10', desc: 'Destructive' },
};

const OUTCOME_META: Record<AuditOutcome, { color: string; label: string }> = {
  success: { color: 'text-teal', label: 'Success' },
  rejected: { color: 'text-red-400', label: 'Rejected' },
  pending_approval: { color: 'text-amber-400', label: 'Pending Approval' },
  pending_confirmation: { color: 'text-blue-400', label: 'Pending Confirmation' },
  abandoned: { color: 'text-gray-400', label: 'Abandoned' },
  failed: { color: 'text-red-400', label: 'Failed' },
};

function TierBadge({ tier }: { tier: Tier }) {
  const m = TIER_META[tier];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color} ${m.bg}`}>
      {m.label} <span className="font-normal opacity-70">{m.desc}</span>
    </span>
  );
}

function StatusDot({ status }: { status: ToolStatus | AccountStatus }) {
  const map: Record<string, string> = {
    published: 'bg-teal', active: 'bg-teal',
    pending_review: 'bg-amber-400', suspended: 'bg-amber-400',
    deprecated: 'bg-gray-400', deleted: 'bg-gray-400',
    degraded: 'bg-red-400',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[status] || 'bg-gray-400'}`} />;
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    'avx:read': 'bg-teal/10 text-teal',
    'avx:workflow:create': 'bg-amber-400/10 text-amber-400',
    'avx:workflow:execute': 'bg-orange-400/10 text-orange-400',
    'avx:admin': 'bg-purple-400/10 text-purple-400',
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${colors[scope] || 'bg-muted text-muted-foreground'}`}>
      {scope}
    </span>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ runtimeEnabled, setRuntimeEnabled }: {
  runtimeEnabled: boolean;
  setRuntimeEnabled: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Runtime status banner */}
      <div className={`flex items-center justify-between rounded-xl p-4 border ${runtimeEnabled ? 'bg-teal/5 border-teal/20' : 'bg-red-400/5 border-red-400/20'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${runtimeEnabled ? 'bg-teal/20' : 'bg-red-400/20'}`}>
            <Globe className={`w-4 h-4 ${runtimeEnabled ? 'text-teal' : 'text-red-400'}`} />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">
              MCP Runtime — {runtimeEnabled ? 'Online' : 'Disabled'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {runtimeEnabled ? 'Streamable HTTP · MCP 2025-11-25 · 2 active instances' : 'All AI client connections are rejected'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setRuntimeEnabled(!runtimeEnabled);
            toast[runtimeEnabled ? 'error' : 'success'](runtimeEnabled ? 'Runtime disabled. All sessions terminated.' : 'Runtime enabled.');
          }}
          className={`text-[11px] px-4 py-1.5 rounded-lg font-medium transition-colors ${runtimeEnabled ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20' : 'bg-teal text-white hover:bg-teal/90'}`}
        >
          {runtimeEnabled ? 'Disable Runtime' : 'Enable Runtime'}
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Sessions', value: '6', sub: 'across 3 accounts', icon: Activity, color: 'text-teal' },
          { label: 'Invocations Today', value: '1,240', sub: 'p99 latency 312ms', icon: Zap, color: 'text-blue-400' },
          { label: 'Error Rate', value: '0.8%', sub: 'last 24 hours', icon: AlertCircle, color: 'text-amber-400' },
          { label: 'Rate Limit Events', value: '3', sub: 'last 24 hours', icon: Shield, color: 'text-gray-400' },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span>
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Degraded tool alert */}
      <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-foreground">Degraded tool detected</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <span className="font-mono text-red-400">list_ssh_keys</span> — Underlying API unreachable. Tool marked degraded. SSH module PM notified. Invocations return structured MCP error.
          </p>
        </div>
        <button className="text-[10px] text-teal hover:underline flex-shrink-0">View in Catalog →</button>
      </div>

      {/* Health checks */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[11px] font-semibold text-foreground">Endpoint Health</p>
        </div>
        <table className="w-full text-[11px]">
          <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">INSTANCE</th>
              <th className="px-4 py-2 text-left font-medium">STATUS</th>
              <th className="px-4 py-2 text-left font-medium">LATENCY P99</th>
              <th className="px-4 py-2 text-left font-medium">SESSIONS</th>
              <th className="px-4 py-2 text-left font-medium">LAST CHECK</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'mcp-runtime-1', status: 'healthy', p99: '289ms', sessions: 4, check: '18s ago' },
              { id: 'mcp-runtime-2', status: 'healthy', p99: '312ms', sessions: 2, check: '20s ago' },
            ].map(row => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-4 py-2.5 font-mono text-foreground">{row.id}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-teal">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" />Healthy
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.p99}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.sessions}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.check}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tool Catalog Tab ──────────────────────────────────────────────────────────
function CatalogTab() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | Tier>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ToolStatus>('all');
  const [selected, setSelected] = useState<typeof TOOLS[0] | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const filtered = TOOLS.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || t.tier === tierFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchTier && matchStatus;
  });

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..."
              className="w-full text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" />
          </div>
          <div className="flex gap-1 border border-border rounded-lg p-0.5">
            {(['all', 'T1', 'T2', 'T3', 'T4', 'T5'] as const).map(t => (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${tierFilter === t ? 'bg-teal text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="pending_review">Pending Review</option>
            <option value="degraded">Degraded</option>
            <option value="deprecated">Deprecated</option>
          </select>
          <button onClick={() => setShowRegister(true)}
            className="ml-auto flex items-center gap-1.5 bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium">
            <Plus className="w-3.5 h-3.5" />Register Tool
          </button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">TOOL NAME</th>
                <th className="px-4 py-2.5 text-left font-medium">MODULE</th>
                <th className="px-4 py-2.5 text-left font-medium">RISK TIER</th>
                <th className="px-4 py-2.5 text-left font-medium">SCOPE</th>
                <th className="px-4 py-2.5 text-left font-medium">STATUS</th>
                <th className="px-4 py-2.5 text-left font-medium">INVOCATIONS</th>
                <th className="px-4 py-2.5 text-left font-medium">VERSION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tool => (
                <tr key={tool.id} onClick={() => setSelected(selected?.id === tool.id ? null : tool)}
                  className={`border-b border-border last:border-0 cursor-pointer transition-colors ${selected?.id === tool.id ? 'bg-teal/5' : 'hover:bg-muted/10'}`}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-foreground">{tool.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-xs">{tool.title}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tool.module}</td>
                  <td className="px-4 py-3"><TierBadge tier={tool.tier} /></td>
                  <td className="px-4 py-3"><ScopeBadge scope={tool.scope} /></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <StatusDot status={tool.status} />
                      <span className="capitalize text-muted-foreground">{tool.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tool.invocations.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{tool.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border border-border rounded-xl bg-card overflow-y-auto p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[12px] font-bold text-foreground">{selected.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{selected.module} · {selected.version}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <TierBadge tier={selected.tier} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{selected.description}</p>
          <div className="space-y-2 text-[11px]">
            {[
              ['Scope', <ScopeBadge scope={selected.scope} />],
              ['Status', <span className="flex items-center gap-1"><StatusDot status={selected.status} /><span className="capitalize text-muted-foreground">{selected.status.replace('_', ' ')}</span></span>],
              ['Read-only', selected.readOnly ? <Check className="w-3 h-3 text-teal" /> : <X className="w-3 h-3 text-muted-foreground" />],
              ['Destructive', selected.destructive ? <Check className="w-3 h-3 text-red-400" /> : <X className="w-3 h-3 text-muted-foreground" />],
              ['Approval required', selected.approvalRequired ? <Check className="w-3 h-3 text-amber-400" /> : <X className="w-3 h-3 text-muted-foreground" />],
              ['Registered by', <span className="text-muted-foreground font-mono text-[10px]">{selected.registeredBy}</span>],
              ['Registered', <span className="text-muted-foreground">{selected.registeredAt}</span>],
              ['Total invocations', <span className="text-foreground font-medium">{selected.invocations.toLocaleString()}</span>],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
          {selected.status === 'degraded' && (
            <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 text-[10px] text-red-400">
              Mapped API unreachable. Health check failing for 14 minutes. Schema drift alert sent to PM.
            </div>
          )}
          {selected.status === 'pending_review' && (
            <div className="flex gap-2">
              <button onClick={() => { toast.success(`${selected.name} approved.`); setSelected(null); }}
                className="flex-1 bg-teal text-white text-[10px] py-1.5 rounded-lg hover:bg-teal/90">Approve</button>
              <button onClick={() => toast.error(`${selected.name} rejected.`)}
                className="flex-1 border border-border text-[10px] py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Reject</button>
            </div>
          )}
        </div>
      )}

      {/* Register modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Register New Tool</p>
              <button onClick={() => setShowRegister(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            {[
              ['Tool name (snake_case)', 'e.g. list_certificates'],
              ['Title (max 64 chars)', 'e.g. List Certificates'],
              ['Description (max 500 chars)', 'What this tool does for an AI model...'],
              ['Mapped AppViewX API', 'e.g. /api/v2/certificates'],
            ].map(([label, placeholder]) => (
              <div key={label}>
                <label className="text-[11px] font-medium text-foreground block mb-1">{label} <span className="text-coral">*</span></label>
                <input placeholder={placeholder as string}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1">Risk Tier <span className="text-coral">*</span></label>
                <select className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none">
                  {(['T1', 'T2', 'T3', 'T4', 'T5'] as Tier[]).map(t => (
                    <option key={t} value={t}>{t} — {TIER_META[t].desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-foreground block mb-1">Required Scope <span className="text-coral">*</span></label>
                <select className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none">
                  <option>avx:read</option>
                  <option>avx:workflow:create</option>
                  <option>avx:workflow:execute</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" /> readOnlyHint</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" /> destructiveHint</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" /> idempotentHint</label>
            </div>
            <p className="text-[10px] text-muted-foreground bg-muted/20 rounded-lg p-2">
              Submitted tools enter <span className="font-mono text-amber-400">pending_review</span> state. Platform team review required before publishing.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRegister(false)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Cancel</button>
              <button onClick={() => { toast.success('Tool submitted for platform team review.'); setShowRegister(false); }}
                className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Submit for Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Service Accounts Tab ──────────────────────────────────────────────────────
function AccountsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [accounts, setAccounts] = useState(SERVICE_ACCOUNTS);
  const [showSecret, setShowSecret] = useState(false);

  const toggle = (id: string, action: 'suspend' | 'activate') => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: action === 'suspend' ? 'suspended' : 'active' } as typeof a : a));
    toast[action === 'suspend' ? 'error' : 'success'](`Service account ${action === 'suspend' ? 'suspended' : 'reactivated'}.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{accounts.filter(a => a.status === 'active').length} active · {accounts.filter(a => a.status === 'suspended').length} suspended · max 10 per tenant</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium">
          <Plus className="w-3.5 h-3.5" />New Service Account
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">NAME</th>
              <th className="px-4 py-2.5 text-left font-medium">CLIENT ID</th>
              <th className="px-4 py-2.5 text-left font-medium">SCOPES</th>
              <th className="px-4 py-2.5 text-left font-medium">STATUS</th>
              <th className="px-4 py-2.5 text-left font-medium">LAST USED</th>
              <th className="px-4 py-2.5 text-left font-medium">SESSIONS</th>
              <th className="px-4 py-2.5 text-left font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acct => (
              <tr key={acct.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{acct.name}</p>
                  <p className="text-[10px] text-muted-foreground">{acct.description}</p>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{acct.clientId}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {acct.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <StatusDot status={acct.status} />
                    <span className="capitalize text-muted-foreground">{acct.status}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{acct.lastUsed}</td>
                <td className="px-4 py-3 text-muted-foreground">{acct.sessions}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button title="Rotate credentials" onClick={() => toast.success('New credentials generated. Overlap window: 1 hour.')}
                      className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
                    {acct.status === 'active'
                      ? <button title="Suspend" onClick={() => toggle(acct.id, 'suspend')}
                          className="p-1 rounded hover:bg-amber-400/10 text-muted-foreground hover:text-amber-400"><Pause className="w-3.5 h-3.5" /></button>
                      : <button title="Reactivate" onClick={() => toggle(acct.id, 'activate')}
                          className="p-1 rounded hover:bg-teal/10 text-muted-foreground hover:text-teal"><Play className="w-3.5 h-3.5" /></button>
                    }
                    <button title="Delete" onClick={() => { setAccounts(prev => prev.filter(a => a.id !== acct.id)); toast.error('Service account deleted permanently.'); }}
                      className="p-1 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">New Service Account</p>
              <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            {[
              ['Name', 'e.g. copilot-prod'],
              ['Description', 'What is this service account for?'],
            ].map(([label, placeholder]) => (
              <div key={label}>
                <label className="text-[11px] font-medium text-foreground block mb-1">{label} <span className="text-coral">*</span></label>
                <input placeholder={placeholder}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" />
              </div>
            ))}
            <div>
              <label className="text-[11px] font-medium text-foreground block mb-2">Allowed Scopes <span className="text-coral">*</span></label>
              <div className="space-y-1.5">
                {['avx:read', 'avx:workflow:create', 'avx:workflow:execute'].map(s => (
                  <label key={s} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <input type="checkbox" defaultChecked={s === 'avx:read'} className="accent-teal" />
                    <ScopeBadge scope={s} />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-foreground block mb-1">Token Expiry</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none">
                <option value="1h">1 hour (default)</option>
                <option value="4h">4 hours</option>
                <option value="8h">8 hours</option>
                <option value="24h">24 hours (maximum)</option>
              </select>
            </div>
            {/* Generated credentials preview */}
            <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Generated Credentials — displayed once</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Client ID</span>
                <span className="font-mono text-[10px] text-foreground">avx_d9e2f5a8b1c4</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">Client Secret</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-foreground">{showSecret ? 'avx_sk_7f3a9b2c1d8e4f6a0b5c9d2e' : '••••••••••••••••••••••'}</span>
                  <button onClick={() => setShowSecret(s => !s)} className="text-muted-foreground hover:text-foreground">
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button onClick={() => toast.success('Copied.')} className="text-muted-foreground hover:text-foreground">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-amber-400">Copy the client secret now. It will not be shown again.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Cancel</button>
              <button onClick={() => { toast.success('Service account created.'); setShowCreate(false); }}
                className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────
function AuditTab() {
  const [selected, setSelected] = useState<typeof AUDIT_LOG[0] | null>(null);
  const [search, setSearch] = useState('');

  const filtered = AUDIT_LOG.filter(e =>
    !search || e.correlationId.includes(search) || e.client.includes(search) || e.tool.includes(search)
  );

  return (
    <div className="flex gap-4 overflow-hidden h-full">
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by correlation ID, client, or tool..."
            className="w-full text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" />
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">CORRELATION ID</th>
                <th className="px-4 py-2.5 text-left font-medium">TIMESTAMP</th>
                <th className="px-4 py-2.5 text-left font-medium">CLIENT</th>
                <th className="px-4 py-2.5 text-left font-medium">TOOL</th>
                <th className="px-4 py-2.5 text-left font-medium">TIER</th>
                <th className="px-4 py-2.5 text-left font-medium">OUTCOME</th>
                <th className="px-4 py-2.5 text-left font-medium">DURATION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                  className={`border-b border-border last:border-0 cursor-pointer transition-colors ${selected?.id === entry.id ? 'bg-teal/5' : 'hover:bg-muted/10'}`}>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-teal">{entry.correlationId}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{entry.timestamp}</td>
                  <td className="px-4 py-2.5 text-foreground">{entry.client}</td>
                  <td className="px-4 py-2.5 font-mono text-foreground">{entry.tool}</td>
                  <td className="px-4 py-2.5"><TierBadge tier={entry.tier} /></td>
                  <td className="px-4 py-2.5">
                    <span className={`font-medium ${OUTCOME_META[entry.outcome].color}`}>
                      {OUTCOME_META[entry.outcome].label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono">{entry.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 border border-border rounded-xl bg-card overflow-y-auto p-4 space-y-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-foreground">Audit Entry</p>
            <button onClick={() => setSelected(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Correlation ID</p>
            <p className="font-mono text-[11px] text-teal">{selected.correlationId}</p>
          </div>
          <div className="space-y-2 text-[11px]">
            {[
              ['Timestamp', selected.timestamp],
              ['Tenant', selected.tenant],
              ['Client', selected.client],
              ['Tool', selected.tool],
              ['Version', 'v1.0'],
              ['Call type', 'tools/call'],
              ['Outcome', <span className={OUTCOME_META[selected.outcome].color}>{OUTCOME_META[selected.outcome].label}</span>],
              ['Risk tier', <TierBadge tier={selected.tier} />],
              ['Approval status', selected.approvalStatus],
              ['Duration', <span className="font-mono">{selected.duration}</span>],
              ['Input params', <span className="text-muted-foreground italic">Masked — see audit store</span>],
              ['Output metadata', <span className="text-muted-foreground italic">{selected.outcome === 'success' ? '200 OK · 3 records' : '—'}</span>],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex-shrink-0">{label}</span>
                <span className="text-right">{val}</span>
              </div>
            ))}
          </div>
          {(selected.tier === 'T4' || selected.tier === 'T5') && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Approval Chain</p>
              {[
                { label: 'MCP tool call', time: selected.timestamp, color: 'bg-teal' },
                { label: 'Approval request created', time: '+ 0.5s', color: 'bg-teal' },
                { label: 'SNOW ticket INC00284710', time: '+ 2.1s', color: 'bg-teal' },
                { label: selected.outcome === 'success' ? 'Approved — john.doe@acmecorp.com' : 'Awaiting approver', time: selected.outcome === 'success' ? '+ 4m 12s' : 'pending', color: selected.outcome === 'success' ? 'bg-teal' : 'bg-amber-400' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${step.color}`} />
                  <div>
                    <p className="text-[10px] text-foreground">{step.label}</p>
                    <p className="text-[9px] text-muted-foreground">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin Tab ─────────────────────────────────────────────────────────────────
function AdminTab({ runtimeEnabled, setRuntimeEnabled }: { runtimeEnabled: boolean; setRuntimeEnabled: (v: boolean) => void }) {
  const [allowlist, setAllowlist] = useState(['avx_c8f2a1b3d4e5', 'avx_a7e9c2d1f0b4', 'avx_f3b8d2a5c9e1', 'avx_b2c5d8e1f4a7']);
  const [newEntry, setNewEntry] = useState('');
  const [t4t5Enabled, setT4t5Enabled] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Runtime toggle */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-[12px] font-semibold text-foreground">Runtime Access</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-foreground">MCP Runtime — {runtimeEnabled ? 'Enabled' : 'Disabled'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Disabling terminates all active sessions within 60 seconds.</p>
          </div>
          <button onClick={() => {
            setRuntimeEnabled(!runtimeEnabled);
            toast[runtimeEnabled ? 'error' : 'success'](runtimeEnabled ? 'Runtime disabled for this tenant.' : 'Runtime enabled.');
          }} className="text-muted-foreground hover:text-foreground">
            {runtimeEnabled ? <ToggleRight className="w-8 h-8 text-teal" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
      </div>

      {/* T4/T5 controls */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-[12px] font-semibold text-foreground">High-Risk Tool Access</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-foreground">T4 / T5 Tool Execution</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">T4 and T5 tools are disabled by default. Enable only after reviewing the approval workflow configuration.</p>
          </div>
          <button onClick={() => {
            setT4t5Enabled(p => !p);
            toast[!t4t5Enabled ? 'success' : 'error'](!t4t5Enabled ? 'T4/T5 tools enabled for this tenant.' : 'T4/T5 tools disabled.');
          }} className="text-muted-foreground hover:text-foreground">
            {t4t5Enabled ? <ToggleRight className="w-8 h-8 text-amber-400" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
        {t4t5Enabled && (
          <div className="flex items-start gap-2 bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-400">T4/T5 tools require pre-approval via AppViewX workflow engine. T5 tools additionally require post-execution approval and a registered rollback action.</p>
          </div>
        )}
      </div>

      {/* Client allowlist */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-foreground">AI Client Allowlist</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Only listed client IDs can connect. Changes apply to new connections; existing sessions get a 15-minute grace period.</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{allowlist.length} / 50</span>
        </div>
        <div className="space-y-2">
          {allowlist.map(id => (
            <div key={id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
              <span className="font-mono text-[11px] text-foreground">{id}</span>
              <button onClick={() => { setAllowlist(prev => prev.filter(x => x !== id)); toast.success('Removed from allowlist.'); }}
                className="text-muted-foreground hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="avx_client_id..."
            className="flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 font-mono" />
          <button onClick={() => {
            if (newEntry.trim()) { setAllowlist(p => [...p, newEntry.trim()]); setNewEntry(''); toast.success('Added to allowlist.'); }
          }} className="bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90">Add</button>
        </div>
      </div>

      {/* Open decisions */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-[12px] font-semibold text-foreground">Open Decisions</p>
        {[
          { id: 'OD-1', title: 'On-prem deployment model', owner: 'CPO', status: 'Open' },
          { id: 'OD-2', title: 'OAuth 2.1 user delegation timeline', owner: 'PM + Platform Eng', status: 'Open' },
          { id: 'OD-3', title: 'Service account cap per tenant', owner: 'PM + Sales', status: 'Open' },
          { id: 'OD-4', title: 'T5 rollback requirement — hard block vs warning', owner: 'PM', status: 'Recommendation: Hard block' },
        ].map(od => (
          <div key={od.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
            <span className="text-[10px] font-bold text-amber-400 font-mono flex-shrink-0 mt-0.5">{od.id}</span>
            <div className="flex-1">
              <p className="text-[11px] text-foreground">{od.title}</p>
              <p className="text-[10px] text-muted-foreground">Owner: {od.owner}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${od.status === 'Open' ? 'bg-amber-400/10 text-amber-400' : 'bg-teal/10 text-teal'}`}>{od.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MCPRuntimePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [runtimeEnabled, setRuntimeEnabled] = useState(true);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'catalog', label: 'Tool Catalog', icon: FileText },
    { id: 'accounts', label: 'Service Accounts', icon: Lock },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'admin', label: 'Admin Controls', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <Cpu className="w-5 h-5 text-teal" />
            <h1 className="text-xl font-semibold text-foreground">MCP Runtime Service</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${runtimeEnabled ? 'bg-teal/10 text-teal' : 'bg-red-400/10 text-red-400'}`}>
              {runtimeEnabled ? '● Online' : '● Disabled'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Governed MCP gateway · Phase 1 — CLM · SaaS · MCP spec 2025-11-25
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono bg-muted/30 px-2 py-1 rounded">mcp.appviewx.com/v1</span>
          <button onClick={() => toast.success('Copied.')} className="hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'overview' && <div className="h-full overflow-y-auto"><OverviewTab runtimeEnabled={runtimeEnabled} setRuntimeEnabled={setRuntimeEnabled} /></div>}
        {tab === 'catalog' && <CatalogTab />}
        {tab === 'accounts' && <div className="h-full overflow-y-auto"><AccountsTab /></div>}
        {tab === 'audit' && <AuditTab />}
        {tab === 'admin' && <div className="h-full overflow-y-auto"><AdminTab runtimeEnabled={runtimeEnabled} setRuntimeEnabled={setRuntimeEnabled} /></div>}
      </div>
    </div>
  );
}

// Fix missing import
function ScrollText(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M15 8h-5" /><path d="M15 12h-5" />
    </svg>
  );
}

