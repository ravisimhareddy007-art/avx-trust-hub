import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, X, Check, Eye, EyeOff, Copy, RefreshCw,
  Trash2, Pause, Play, Shield, Zap, Activity, Globe,
  FileText, Settings, Lock, Cpu, CheckCircle2,
  ToggleLeft, ToggleRight, AlertTriangle, AlertCircle,
  Download, ChevronDown, ChevronRight, GitBranch,
} from 'lucide-react';

type Tab = 'overview' | 'catalog' | 'accounts' | 'audit' | 'admin' | 'sessions';
type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
type ToolStatus = 'published' | 'pending_review' | 'deprecated' | 'degraded';
type AccountStatus = 'active' | 'suspended';
type AuditOutcome = 'success' | 'rejected' | 'pending_approval' | 'pending_confirmation' | 'abandoned' | 'failed';

const TOOLS_DATA: {
  id: string; name: string; title: string; description: string; module: string;
  tier: Tier; status: ToolStatus; scope: string; version: string;
  readOnly: boolean; destructive: boolean; approvalRequired: boolean;
  registeredBy: string; registeredAt: string; invocations: number;
  approvalWorkflowRef: string; rollbackAction: string; maskingList: string[];
  versions: { version: string; date: string; note: string }[];
}[] = [
  { id: 't1', name: 'list_certificates', title: 'List Certificates', module: 'CLM', tier: 'T1', status: 'degraded', description: 'Returns a paginated list of certificates in the tenant inventory, filtered by status, expiry window, or CA.', scope: 'avx:read', version: 'v1.2', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-03-12', invocations: 4821, approvalWorkflowRef: '', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.2', date: '2026-04-10', note: 'Added expiry_window filter param' }, { version: 'v1.0', date: '2026-03-12', note: 'Initial release' }] },
  { id: 't2', name: 'get_certificate_details', title: 'Get Certificate Details', module: 'CLM', tier: 'T1', status: 'published', description: 'Returns full metadata for a single certificate by ID including chain, SANs, algorithm, and compliance status.', scope: 'avx:read', version: 'v1.1', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-03-12', invocations: 3102, approvalWorkflowRef: '', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.1', date: '2026-04-01', note: 'Added compliance_status field' }, { version: 'v1.0', date: '2026-03-12', note: 'Initial release' }] },
  { id: 't3', name: 'analyze_expiry_risk', title: 'Analyze Expiry Risk', module: 'CLM', tier: 'T2', status: 'published', description: 'Analyzes certificates expiring within a specified window and returns a prioritized risk report with HNDL exposure scoring.', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'ravi.r@appviewx.com', registeredAt: '2026-04-01', invocations: 1890, approvalWorkflowRef: '', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.0', date: '2026-04-01', note: 'Initial release' }] },
  { id: 't4', name: 'get_pqc_posture', title: 'Get PQC Posture', module: 'CLM', tier: 'T2', status: 'published', description: 'Returns quantum vulnerability assessment for the tenant inventory, including algorithm distribution and migration wave assignments.', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'ravi.r@appviewx.com', registeredAt: '2026-04-15', invocations: 742, approvalWorkflowRef: '', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.0', date: '2026-04-15', note: 'Initial release' }] },
  { id: 't5', name: 'create_renewal_request', title: 'Create Renewal Request', module: 'CLM', tier: 'T3', status: 'published', description: 'Creates a certificate renewal workflow request. Triggers in-session confirmation before creating the AppViewX workflow record.', scope: 'avx:workflow:create', version: 'v1.0', readOnly: false, destructive: false, approvalRequired: true, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-04-20', invocations: 312, approvalWorkflowRef: 'wf-clm-renewal-v2', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.0', date: '2026-04-20', note: 'Initial release' }] },
  { id: 't6', name: 'create_ssh_key_request', title: 'Create SSH Key Request', module: 'SSH', tier: 'T3', status: 'pending_review', description: 'Creates a new SSH key provisioning workflow request. Requires in-session confirmation.', scope: 'avx:workflow:create', version: 'v1.0', readOnly: false, destructive: false, approvalRequired: true, registeredBy: 'sanjay.k@appviewx.com', registeredAt: '2026-05-10', invocations: 0, approvalWorkflowRef: 'wf-ssh-provision-v1', rollbackAction: '', maskingList: [], versions: [] },
  { id: 't7', name: 'execute_certificate_renewal', title: 'Execute Certificate Renewal', module: 'CLM', tier: 'T4', status: 'published', description: 'Executes an approved certificate renewal workflow. Requires pre-approval via AppViewX workflow engine before execution.', scope: 'avx:workflow:execute', version: 'v1.0', readOnly: false, destructive: false, approvalRequired: true, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-04-20', invocations: 89, approvalWorkflowRef: 'wf-clm-renewal-execute-v1', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.0', date: '2026-04-20', note: 'Initial release' }] },
  { id: 't8', name: 'check_request_status', title: 'Check Request Status', module: 'CLM', tier: 'T1', status: 'published', description: 'Returns the current status of a pending T4 or T5 approval request by Correlation ID. Use for polling.', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-04-20', invocations: 201, approvalWorkflowRef: '', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.0', date: '2026-04-20', note: 'Initial release' }] },
  { id: 't9', name: 'revoke_certificate', title: 'Revoke Certificate', module: 'CLM', tier: 'T5', status: 'published', description: 'Revokes a certificate via the issuing CA. Requires pre-approval AND post-execution approval. Rollback restores previous state.', scope: 'avx:workflow:execute', version: 'v1.0', readOnly: false, destructive: true, approvalRequired: true, registeredBy: 'priya.m@appviewx.com', registeredAt: '2026-05-01', invocations: 4, approvalWorkflowRef: 'wf-clm-revoke-v1', rollbackAction: 'rollback_certificate_reinstate_v1', maskingList: ['private_key', 'revocation_reason'], versions: [{ version: 'v1.0', date: '2026-05-01', note: 'Initial release' }] },
  { id: 't10', name: 'list_ssh_keys', title: 'List SSH Keys', module: 'SSH', tier: 'T1', status: 'published', description: 'Returns a paginated list of SSH keys in the tenant inventory filtered by host, user, or risk status.', scope: 'avx:read', version: 'v1.0', readOnly: true, destructive: false, approvalRequired: false, registeredBy: 'sanjay.k@appviewx.com', registeredAt: '2026-03-28', invocations: 620, approvalWorkflowRef: '', rollbackAction: '', maskingList: [], versions: [{ version: 'v1.0', date: '2026-03-28', note: 'Initial release' }] },
];

const SA_DATA: { id: string; name: string; description: string; scopes: string[]; status: AccountStatus; clientId: string; created: string; lastUsed: string; tokenExpiry: string; sessions: number }[] = [
  { id: 'sa1', name: 'copilot-ravi', description: 'GitHub Copilot — Ravi Reddy', scopes: ['avx:read'], status: 'active', clientId: 'avx_c8f2a1b3d4e5', created: '2026-03-15', lastUsed: '2026-05-31 08:42', tokenExpiry: '1h', sessions: 3 },
  { id: 'sa2', name: 'claude-ravi', description: 'Claude — Ravi Reddy', scopes: ['avx:read', 'avx:workflow:create'], status: 'active', clientId: 'avx_a7e9c2d1f0b4', created: '2026-04-02', lastUsed: '2026-05-31 11:18', tokenExpiry: '4h', sessions: 1 },
  { id: 'sa3', name: 'chatgpt-induja', description: 'ChatGPT — Induja Krishnan', scopes: ['avx:read', 'avx:workflow:create', 'avx:workflow:execute'], status: 'active', clientId: 'avx_f3b8d2a5c9e1', created: '2026-04-20', lastUsed: '2026-05-30 16:05', tokenExpiry: '1h', sessions: 0 },
  { id: 'sa4', name: 'cursor-vijay', description: 'Cursor — Vijay Sharma — suspended pending review', scopes: ['avx:read'], status: 'suspended', clientId: 'avx_e1a4b7c0d3f2', created: '2026-05-01', lastUsed: '2026-05-20 09:30', tokenExpiry: '1h', sessions: 0 },
  { id: 'sa5', name: 'automation-pipeline', description: 'Internal CI/CD pipeline — shared automation account', scopes: ['avx:read', 'avx:workflow:create'], status: 'active', clientId: 'avx_b2c5d8e1f4a7', created: '2026-05-15', lastUsed: '2026-05-31 06:00', tokenExpiry: '24h', sessions: 2 },
];

const AUDIT_DATA: { id: string; correlationId: string; timestamp: string; tenant: string; client: string; tool: string; tier: Tier; outcome: AuditOutcome; approvalStatus: string; duration: string }[] = [
  { id: 'a1', correlationId: 'crr-8f2a1b3d-4e5c', timestamp: '2026-05-31 11:42', tenant: 'acmecorp', client: 'claude-ravi', tool: 'list_certificates', tier: 'T1', outcome: 'success', approvalStatus: 'n/a', duration: '142ms' },
  { id: 'a2', correlationId: 'crr-7e9c2d1f-0b4a', timestamp: '2026-05-31 11:38', tenant: 'acmecorp', client: 'claude-ravi', tool: 'analyze_expiry_risk', tier: 'T2', outcome: 'success', approvalStatus: 'n/a', duration: '318ms' },
  { id: 'a3', correlationId: 'crr-3b8d2a5c-9e1f', timestamp: '2026-05-31 11:30', tenant: 'acmecorp', client: 'chatgpt-induja', tool: 'create_renewal_request', tier: 'T3', outcome: 'success', approvalStatus: 'confirmed', duration: '204ms' },
  { id: 'a4', correlationId: 'crr-1a4b7c0d-3f2e', timestamp: '2026-05-31 11:28', tenant: 'acmecorp', client: 'chatgpt-induja', tool: 'execute_certificate_renewal', tier: 'T4', outcome: 'pending_approval', approvalStatus: 'awaiting_approver', duration: '489ms' },
  { id: 'a5', correlationId: 'crr-2c5d8e1f-4a7b', timestamp: '2026-05-31 11:15', tenant: 'acmecorp', client: 'copilot-ravi', tool: 'get_certificate_details', tier: 'T1', outcome: 'success', approvalStatus: 'n/a', duration: '98ms' },
  { id: 'a6', correlationId: 'crr-5d6e9f2a-1b3c', timestamp: '2026-05-31 11:10', tenant: 'acmecorp', client: 'chatgpt-induja', tool: 'create_renewal_request', tier: 'T3', outcome: 'abandoned', approvalStatus: 'timeout', duration: '300001ms' },
  { id: 'a7', correlationId: 'crr-9f1a4b7c-2d5e', timestamp: '2026-05-31 10:58', tenant: 'acmecorp', client: 'copilot-ravi', tool: 'list_certificates', tier: 'T1', outcome: 'rejected', approvalStatus: 'n/a', duration: '12ms' },
  { id: 'a8', correlationId: 'crr-4e5f8a2b-0c7d', timestamp: '2026-05-31 10:45', tenant: 'acmecorp', client: 'claude-ravi', tool: 'get_pqc_posture', tier: 'T2', outcome: 'success', approvalStatus: 'n/a', duration: '421ms' },
  { id: 'a9', correlationId: 'crr-6a7b1c4d-3e8f', timestamp: '2026-05-31 09:22', tenant: 'acmecorp', client: 'chatgpt-induja', tool: 'revoke_certificate', tier: 'T5', outcome: 'success', approvalStatus: 'pre+post approved', duration: '6240ms' },
  { id: 'a10', correlationId: 'crr-0b1c2d3e-5f9a', timestamp: '2026-05-31 08:10', tenant: 'acmecorp', client: 'automation-pipeline', tool: 'list_certificates', tier: 'T1', outcome: 'success', approvalStatus: 'n/a', duration: '110ms' },
];

const TIER_META: Record<Tier, { color: string; bg: string; desc: string }> = {
  T1: { color: 'text-gray-400', bg: 'bg-gray-400/10', desc: 'Read-only' },
  T2: { color: 'text-blue-400', bg: 'bg-blue-400/10', desc: 'Analysis' },
  T3: { color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'Workflow create' },
  T4: { color: 'text-orange-400', bg: 'bg-orange-400/10', desc: 'Workflow execute' },
  T5: { color: 'text-red-400', bg: 'bg-red-400/10', desc: 'Destructive' },
};

const OUTCOME_META: Record<AuditOutcome, { color: string; label: string }> = {
  success: { color: 'text-teal', label: 'Success' },
  rejected: { color: 'text-red-400', label: 'Rejected' },
  pending_approval: { color: 'text-amber-400', label: 'Pending Approval' },
  pending_confirmation: { color: 'text-blue-400', label: 'Pending Confirmation' },
  abandoned: { color: 'text-gray-400', label: 'Abandoned' },
  failed: { color: 'text-red-400', label: 'Failed' },
};

const SCOPES = ['avx:read', 'avx:workflow:create', 'avx:workflow:execute'];

function TierBadge({ tier }: { tier: Tier }) {
  const m = TIER_META[tier];
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color} ${m.bg}`}>{tier} <span className="font-normal opacity-70">{m.desc}</span></span>;
}

function ScopeBadge({ scope }: { scope: string }) {
  const c: Record<string, string> = { 'avx:read': 'bg-teal/10 text-teal', 'avx:workflow:create': 'bg-amber-400/10 text-amber-400', 'avx:workflow:execute': 'bg-orange-400/10 text-orange-400' };
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c[scope] || 'bg-muted text-muted-foreground'}`}>{scope}</span>;
}

function StatusDot({ status }: { status: string }) {
  const m: Record<string, string> = { published: 'bg-teal', active: 'bg-teal', pending_review: 'bg-amber-400', suspended: 'bg-amber-400', deprecated: 'bg-gray-400', degraded: 'bg-red-400' };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${m[status] || 'bg-gray-400'}`} />;
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ runtimeEnabled, setRuntimeEnabled }: { runtimeEnabled: boolean; setRuntimeEnabled: (v: boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className={`flex items-center justify-between rounded-xl p-4 border ${runtimeEnabled ? 'bg-teal/5 border-teal/20' : 'bg-red-400/5 border-red-400/20'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${runtimeEnabled ? 'bg-teal/20' : 'bg-red-400/20'}`}>
            <Globe className={`w-4 h-4 ${runtimeEnabled ? 'text-teal' : 'text-red-400'}`} />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">MCP Runtime — {runtimeEnabled ? 'Online' : 'Disabled'}</p>
            <p className="text-[10px] text-muted-foreground">{runtimeEnabled ? 'Streamable HTTP · MCP 2025-11-25 · 2 active instances' : 'All AI client connections rejected. Sessions terminated.'}</p>
          </div>
        </div>
        <button onClick={() => { setRuntimeEnabled(!runtimeEnabled); toast[runtimeEnabled ? 'error' : 'success'](runtimeEnabled ? 'Runtime disabled. Sessions terminated within 60s.' : 'Runtime enabled.'); }}
          className={`text-[11px] px-4 py-1.5 rounded-lg font-medium ${runtimeEnabled ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20' : 'bg-teal text-white hover:bg-teal/90'}`}>
          {runtimeEnabled ? 'Disable Runtime' : 'Enable Runtime'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Sessions', value: runtimeEnabled ? '6' : '0', sub: runtimeEnabled ? '3 accounts' : 'Runtime offline', icon: Activity, color: 'text-teal' },
          { label: 'Invocations Today', value: '1,240', sub: 'p99 latency 312ms', icon: Zap, color: 'text-blue-400' },
          { label: 'Error Rate', value: '0.8%', sub: 'last 24h', icon: AlertCircle, color: 'text-amber-400' },
          { label: 'Rate Limit Events', value: '3', sub: 'last 24h', icon: Shield, color: 'text-gray-400' },
        ].map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span><m.icon className={`w-3.5 h-3.5 ${m.color}`} /></div>
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-semibold text-foreground">Degraded tool — <span className="font-mono">list_certificates</span></p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Certificate inventory API unreachable for 14 minutes. Tenant admin notified per alert configuration. Invocations return structured MCP error.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border"><p className="text-[11px] font-semibold text-foreground">Instance Health</p></div>
        <table className="w-full text-[11px]">
          <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground">
            <tr>{['INSTANCE', 'STATUS', 'LATENCY P99', 'SESSIONS', 'LAST CHECK'].map(h => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {['mcp-runtime-1', 'mcp-runtime-2'].map((id, i) => (
              <tr key={id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-mono text-foreground">{id}</td>
                <td className="px-4 py-2.5">{runtimeEnabled ? <span className="flex items-center gap-1.5 text-teal"><span className="w-1.5 h-1.5 rounded-full bg-teal" />Healthy</span> : <span className="flex items-center gap-1.5 text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Offline</span>}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{runtimeEnabled ? (i === 0 ? '289ms' : '312ms') : '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{runtimeEnabled ? (i === 0 ? 4 : 2) : 0}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{runtimeEnabled ? (i === 0 ? '18s ago' : '20s ago') : 'n/a'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-[11px] font-semibold text-foreground mb-3">Catalog Health</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[{ label: 'Available Tools', v: TOOLS_DATA.filter(t => t.status === 'published').length, c: 'text-teal' }, { label: 'Degraded', v: TOOLS_DATA.filter(t => t.status === 'degraded').length, c: 'text-red-400' }, { label: 'Deprecated', v: 0, c: 'text-gray-400' }].map(s => (
            <div key={s.label} className="bg-muted/20 rounded-lg p-3"><p className={`text-xl font-bold ${s.c}`}>{s.v}</p><p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Catalog ───────────────────────────────────────────────────────────────────
function CatalogTab() {
  const [tools, setTools] = useState(TOOLS_DATA);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | Tier>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ToolStatus>('all');
  const [selected, setSelected] = useState<typeof TOOLS_DATA[0] | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regDesc, setRegDesc] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regTier, setRegTier] = useState<Tier>('T1');
  const [regWorkflowRef, setRegWorkflowRef] = useState('');
  const [regRollbackAction, setRegRollbackAction] = useState('');
  const [regMaskField, setRegMaskField] = useState('');
  const [regMaskList, setRegMaskList] = useState<string[]>([]);

  const filtered = tools.filter(t => {
    const s = search.toLowerCase();
    return (!s || t.name.includes(s) || t.title.toLowerCase().includes(s)) && (tierFilter === 'all' || t.tier === tierFilter) && (statusFilter === 'all' || t.status === statusFilter);
  });

  const needsApprovalRef = ['T3', 'T4', 'T5'].includes(regTier);
  const needsRollback = regTier === 'T5';

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative"><Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className="w-48 text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" /></div>
          <div className="flex gap-0.5 border border-border rounded-lg p-0.5">{(['all', 'T1', 'T2', 'T3', 'T4', 'T5'] as const).map(t => <button key={t} onClick={() => setTierFilter(t)} className={`text-[10px] px-2 py-1 rounded-md transition-colors ${tierFilter === t ? 'bg-teal text-white' : 'text-muted-foreground hover:text-foreground'}`}>{t === 'all' ? 'All' : t}</button>)}</div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none"><option value="all">All Statuses</option><option value="published">Published</option><option value="pending_review">Pending Review</option><option value="degraded">Degraded</option><option value="deprecated">Deprecated</option></select>
          <button onClick={() => setShowRegister(true)} className="ml-auto flex items-center gap-1.5 bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium"><Plus className="w-3.5 h-3.5" />Register Tool</button>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground"><tr>{['TOOL NAME', 'MODULE', 'RISK TIER', 'SCOPE', 'STATUS', 'VERSION', 'INVOCATIONS'].map(h => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(tool => (
                <tr key={tool.id} onClick={() => { setSelected(selected?.id === tool.id ? null : tool); setShowVersions(false); }} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${selected?.id === tool.id ? 'bg-teal/5' : 'hover:bg-muted/10'}`}>
                  <td className="px-4 py-3"><p className="font-mono font-medium text-foreground">{tool.name}</p><p className="text-[10px] text-muted-foreground">{tool.title}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{tool.module}</td>
                  <td className="px-4 py-3"><TierBadge tier={tool.tier} /></td>
                  <td className="px-4 py-3"><ScopeBadge scope={tool.scope} /></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5"><StatusDot status={tool.status} /><span className="capitalize text-muted-foreground">{tool.status.replace('_', ' ')}</span></span></td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{tool.version}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tool.invocations.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="w-80 flex-shrink-0 border border-border rounded-xl bg-card overflow-y-auto p-4 space-y-4">
          <div className="flex items-start justify-between"><div><p className="font-mono text-[12px] font-bold text-foreground">{selected.name}</p><p className="text-[10px] text-muted-foreground mt-0.5">{selected.module} · {selected.version}</p></div><button onClick={() => setSelected(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button></div>
          <TierBadge tier={selected.tier} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">{selected.description}</p>
          <div className="space-y-2 text-[11px]">
            {[['Scope', <ScopeBadge scope={selected.scope} />], ['Status', <span className="flex items-center gap-1"><StatusDot status={selected.status} /><span className="capitalize text-muted-foreground">{selected.status.replace('_', ' ')}</span></span>], ['Read-only', selected.readOnly ? <Check className="w-3 h-3 text-teal" /> : <X className="w-3 h-3 text-muted-foreground" />], ['Destructive', selected.destructive ? <Check className="w-3 h-3 text-red-400" /> : <X className="w-3 h-3 text-muted-foreground" />], ['Approval required', selected.approvalRequired ? <Check className="w-3 h-3 text-amber-400" /> : <X className="w-3 h-3 text-muted-foreground" />], ['Workflow ref', selected.approvalWorkflowRef ? <span className="font-mono text-[10px] text-muted-foreground">{selected.approvalWorkflowRef}</span> : <span className="text-gray-400">—</span>], ['Rollback action', selected.rollbackAction ? <span className="font-mono text-[10px] text-teal">{selected.rollbackAction}</span> : <span className="text-gray-400">—</span>], ['Invocations', <span className="font-medium text-foreground">{selected.invocations.toLocaleString()}</span>], ['Registered by', <span className="font-mono text-[10px] text-muted-foreground">{selected.registeredBy}</span>]].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between gap-2"><span className="text-muted-foreground flex-shrink-0">{label}</span><span>{val}</span></div>
            ))}
            {selected.maskingList.length > 0 && (
              <div className="flex items-start justify-between gap-2"><span className="text-muted-foreground flex-shrink-0">Masked fields</span><div className="flex flex-wrap gap-1 justify-end">{selected.maskingList.map(f => <span key={f} className="text-[9px] font-mono bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded">{f}</span>)}</div></div>
            )}
          </div>
          {selected.status === 'degraded' && <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 text-[10px] text-red-400">API unreachable for 14 minutes. Schema drift alert sent. Invocations return structured MCP error.</div>}
          {selected.status === 'pending_review' && (
            <div className="flex gap-2">
              <button onClick={() => { setTools(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'published' as ToolStatus } : t)); toast.success(`${selected.name} approved.`); setSelected(null); }} className="flex-1 bg-teal text-white text-[10px] py-1.5 rounded-lg hover:bg-teal/90">Approve</button>
              <button onClick={() => { setTools(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'deprecated' as ToolStatus } : t)); toast.error(`${selected.name} rejected.`); setSelected(null); }} className="flex-1 border border-border text-[10px] py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Reject</button>
            </div>
          )}
          {selected.status === 'published' && <button onClick={() => { setTools(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'deprecated' as ToolStatus } : t)); toast.success(`${selected.name} deprecated.`); setSelected(null); }} className="w-full border border-border text-[10px] py-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground">Deprecate this version</button>}
          {selected.versions.length > 0 && (
            <div className="border-t border-border pt-3">
              <button onClick={() => setShowVersions(v => !v)} className="flex items-center gap-2 text-[10px] font-medium text-foreground w-full">{showVersions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}Version History ({selected.versions.length})</button>
              {showVersions && <div className="mt-2 space-y-2">{selected.versions.map((v, i) => <div key={v.version} className={`flex items-start gap-2 text-[10px] py-1.5 border-b border-border/50 last:border-0 ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}><span className="font-mono font-bold w-10 flex-shrink-0">{v.version}</span><span className="flex-1">{v.note}</span><span className="flex-shrink-0">{v.date}</span></div>)}</div>}
            </div>
          )}
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">Register New Tool</p><button onClick={() => setShowRegister(false)}><X className="w-4 h-4 text-muted-foreground" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] font-medium text-foreground block mb-1">Tool name <span className="text-coral">*</span></label><input placeholder="list_certificates" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 font-mono" /></div>
              <div><label className="text-[11px] font-medium text-foreground block mb-1">Title (max 64) <span className="text-coral">*</span></label><input value={regTitle} onChange={e => setRegTitle(e.target.value.slice(0, 64))} placeholder="List Certificates" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" /><p className="text-[9px] text-muted-foreground mt-0.5">{regTitle.length}/64</p></div>
            </div>
            <div><label className="text-[11px] font-medium text-foreground block mb-1">Description (max 500) <span className="text-coral">*</span></label><textarea value={regDesc} onChange={e => setRegDesc(e.target.value.slice(0, 500))} rows={3} placeholder="What this tool does — no internal API names or jargon..." className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 resize-none" /><p className={`text-[9px] mt-0.5 ${regDesc.length > 450 ? 'text-amber-400' : 'text-muted-foreground'}`}>{regDesc.length}/500</p></div>
            <div><label className="text-[11px] font-medium text-foreground block mb-1">Mapped AppViewX API <span className="text-coral">*</span></label><input placeholder="/api/v2/certificates" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 font-mono" /><p className="text-[9px] text-muted-foreground mt-0.5">Not exposed to AI clients.</p></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[11px] font-medium text-foreground block mb-1">Module <span className="text-coral">*</span></label><select className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none">{['CLM', 'SSH', 'ADC', 'Kubernetes'].map(m => <option key={m}>{m}</option>)}</select></div>
              <div><label className="text-[11px] font-medium text-foreground block mb-1">Risk Tier <span className="text-coral">*</span></label><select value={regTier} onChange={e => setRegTier(e.target.value as Tier)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none">{(['T1', 'T2', 'T3', 'T4', 'T5'] as Tier[]).map(t => <option key={t} value={t}>{t} — {TIER_META[t].desc}</option>)}</select></div>
              <div><label className="text-[11px] font-medium text-foreground block mb-1">Scope <span className="text-coral">*</span></label><select className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none">{SCOPES.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" />readOnlyHint</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" />destructiveHint</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-teal" />idempotentHint</label>
            </div>
            {needsApprovalRef && (
              <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 space-y-3">
                <p className="text-[10px] font-semibold text-amber-400">Required for {regTier} tools</p>
                <div><label className="text-[11px] font-medium text-foreground block mb-1">Approval Workflow Reference <span className="text-coral">*</span></label><input value={regWorkflowRef} onChange={e => setRegWorkflowRef(e.target.value)} placeholder="wf-clm-renewal-v1" className="w-full border border-amber-400/30 rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50 font-mono" /></div>
                {needsRollback && <div><label className="text-[11px] font-medium text-foreground block mb-1">Rollback Action Reference <span className="text-coral">*</span></label><input value={regRollbackAction} onChange={e => setRegRollbackAction(e.target.value)} placeholder="rollback_certificate_reinstate_v1" className="w-full border border-red-400/30 rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-400/50 font-mono" /><p className="text-[9px] text-red-400 mt-0.5">T5 tools without a rollback action are blocked from registration.</p></div>}
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-foreground block mb-1">Sensitive Input Fields (Masking List)</label>
              <div className="flex gap-2 mb-2"><input value={regMaskField} onChange={e => setRegMaskField(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && regMaskField.trim()) { setRegMaskList(p => [...p, regMaskField.trim()]); setRegMaskField(''); }}} placeholder="e.g. private_key, token..." className="flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 font-mono" /><button onClick={() => { if (regMaskField.trim()) { setRegMaskList(p => [...p, regMaskField.trim()]); setRegMaskField(''); }}} className="bg-muted text-foreground text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/80">Add</button></div>
              <div className="flex flex-wrap gap-1">{regMaskList.map(f => <span key={f} className="flex items-center gap-1 text-[10px] font-mono bg-red-400/10 text-red-400 px-2 py-0.5 rounded">{f}<button onClick={() => setRegMaskList(p => p.filter(x => x !== f))}><X className="w-2.5 h-2.5" /></button></span>)}</div>
              <p className="text-[9px] text-muted-foreground mt-1">Declared fields are masked to [REDACTED] in all audit logs before storage.</p>
            </div>
            <p className="text-[10px] text-muted-foreground bg-muted/20 rounded-lg p-2">Submitted tools enter <span className="font-mono text-amber-400">pending_review</span>. Platform team review required before any AI client can discover this tool.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRegister(false)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Cancel</button>
              <button onClick={() => {
                if (needsApprovalRef && !regWorkflowRef) { toast.error('T3/T4/T5 tools require an approval workflow reference.'); return; }
                if (needsRollback && !regRollbackAction) { toast.error('T5 tools require a rollback action reference. Registration blocked.'); return; }
                toast.success('Tool submitted for platform team review.'); setShowRegister(false);
              }} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Submit for Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Service Accounts ──────────────────────────────────────────────────────────
function AccountsTab() {
  const [accounts, setAccounts] = useState(SA_DATA);
  const [showCreate, setShowCreate] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const MAX = 10;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-muted-foreground">{accounts.filter(a => a.status === 'active').length} active · {accounts.filter(a => a.status === 'suspended').length} suspended</p>
          <div className="flex items-center gap-1.5"><div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${(accounts.length / MAX) * 100}%` }} /></div><span className="text-[10px] text-muted-foreground">{accounts.length}/{MAX}</span></div>
        </div>
        <button onClick={() => { if (accounts.length >= MAX) { toast.error('Account cap reached (10).'); return; } setShowCreate(true); }} className="flex items-center gap-1.5 bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium"><Plus className="w-3.5 h-3.5" />New Service Account</button>
      </div>
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground"><span className="font-medium text-foreground">Recommended:</span> One service account per named user per AI client — not one shared account per team. This ensures per-user auditability until OAuth 2.1 user delegation ships in Phase 2.</p>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground"><tr>{['NAME / DESCRIPTION', 'CLIENT ID', 'SCOPES', 'STATUS', 'LAST USED', 'SESSIONS', 'ACTIONS'].map(h => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {accounts.map(acct => (
              <tr key={acct.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-4 py-3"><p className="font-medium text-foreground">{acct.name}</p><p className="text-[10px] text-muted-foreground">{acct.description}</p></td>
                <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{acct.clientId}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{acct.scopes.map(s => <ScopeBadge key={s} scope={s} />)}</div></td>
                <td className="px-4 py-3"><span className="flex items-center gap-1.5"><StatusDot status={acct.status} /><span className="capitalize text-muted-foreground">{acct.status}</span></span></td>
                <td className="px-4 py-3 text-muted-foreground">{acct.lastUsed}</td>
                <td className="px-4 py-3 text-muted-foreground">{acct.sessions}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button title="Rotate" onClick={() => toast.success('New credentials generated. Prior secret valid for 1-hour overlap window.')} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
                    {acct.status === 'active' ? <button title="Suspend" onClick={() => { setAccounts(prev => prev.map(a => a.id === acct.id ? { ...a, status: 'suspended' as AccountStatus } : a)); toast.error('Suspended. Sessions terminated within 60s.'); }} className="p-1 rounded hover:bg-amber-400/10 text-muted-foreground hover:text-amber-400"><Pause className="w-3.5 h-3.5" /></button> : <button title="Reactivate" onClick={() => { setAccounts(prev => prev.map(a => a.id === acct.id ? { ...a, status: 'active' as AccountStatus } : a)); toast.success('Reactivated.'); }} className="p-1 rounded hover:bg-teal/10 text-muted-foreground hover:text-teal"><Play className="w-3.5 h-3.5" /></button>}
                    <button title="Delete" onClick={() => { setAccounts(prev => prev.filter(a => a.id !== acct.id)); toast.error('Deleted. Record retained in audit history.'); }} className="p-1 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">New Service Account</p><button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button></div>
            {[['Name', 'copilot-ravi'], ['Description', 'GitHub Copilot — Ravi Reddy']].map(([l, p]) => <div key={l}><label className="text-[11px] font-medium text-foreground block mb-1">{l} <span className="text-coral">*</span></label><input placeholder={p} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" /></div>)}
            <div>
              <label className="text-[11px] font-medium text-foreground block mb-2">Allowed Scopes <span className="text-coral">*</span></label>
              <div className="space-y-1.5">{SCOPES.map(s => <label key={s} className="flex items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" defaultChecked={s === 'avx:read'} className="accent-teal" /><ScopeBadge scope={s} /></label>)}</div>
              <p className="text-[9px] text-muted-foreground mt-2">avx:admin is not available via MCP. Admin operations are performed through the platform UI only.</p>
            </div>
            <div><label className="text-[11px] font-medium text-foreground block mb-1">Token Expiry</label><select className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground focus:outline-none"><option>1 hour (default)</option><option>4 hours</option><option>8 hours</option><option>24 hours (maximum)</option></select></div>
            <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Generated Credentials — displayed once</p>
              <div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Client ID</span><span className="font-mono text-foreground">avx_d9e2f5a8b1c4</span></div>
              <div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-muted-foreground flex-shrink-0">Client Secret</span><div className="flex items-center gap-1.5"><span className="font-mono text-foreground">{showSecret ? 'avx_sk_7f3a9b2c1d8e4f6a' : '••••••••••••••••••'}</span><button onClick={() => setShowSecret(s => !s)}>{showSecret ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}</button><button onClick={() => toast.success('Copied.')}><Copy className="w-3 h-3 text-muted-foreground" /></button></div></div>
            </div>
            <p className="text-[10px] text-amber-400">Copy the client secret now. It cannot be retrieved after this dialog closes.</p>
            <div className="flex gap-2 justify-end"><button onClick={() => setShowCreate(false)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Cancel</button><button onClick={() => { toast.success('Service account created.'); setShowCreate(false); }} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Create Account</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
function AuditTab() {
  const [entries, setEntries] = useState(AUDIT_DATA);
  const [selected, setSelected] = useState<typeof AUDIT_DATA[0] | null>(null);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | AuditOutcome>('all');
  const [tierFilter, setTierFilter] = useState<'all' | Tier>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = entries.filter(e => {
    const s = search.toLowerCase();
    return (!s || e.correlationId.includes(s) || e.client.includes(s) || e.tool.includes(s)) && (outcomeFilter === 'all' || e.outcome === outcomeFilter) && (tierFilter === 'all' || e.tier === tierFilter);
  });

  const approveEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, outcome: 'success' as AuditOutcome, approvalStatus: 'approved — john.doe@acmecorp.com' } : e));
    setSelected(prev => prev?.id === id ? { ...prev, outcome: 'success', approvalStatus: 'approved — john.doe@acmecorp.com' } : prev);
    toast.success('Approved. Execution triggered.');
  };

  const rejectEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, outcome: 'rejected' as AuditOutcome, approvalStatus: 'rejected — john.doe@acmecorp.com' } : e));
    setSelected(prev => prev?.id === id ? { ...prev, outcome: 'rejected', approvalStatus: 'rejected — john.doe@acmecorp.com' } : prev);
    toast.error('Rejected. AI client notified via check_request_status.');
  };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative"><Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Correlation ID, client, tool..." className="w-52 text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50" /></div>
          <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value as any)} className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none"><option value="all">All Outcomes</option><option value="success">Success</option><option value="pending_approval">Pending Approval</option><option value="rejected">Rejected</option><option value="abandoned">Abandoned</option><option value="failed">Failed</option></select>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value as any)} className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none"><option value="all">All Tiers</option>{(['T1','T2','T3','T4','T5'] as Tier[]).map(t => <option key={t} value={t}>{t}</option>)}</select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none" />
          <span className="text-[10px] text-muted-foreground">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none" />
          <button onClick={() => toast.success('Exporting JSON... SHA-256 checksum will accompany the file.')} className="ml-auto flex items-center gap-1.5 border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground"><Download className="w-3.5 h-3.5" />JSON</button>
          <button onClick={() => toast.success('Exporting CSV... SHA-256 checksum will accompany the file.')} className="flex items-center gap-1.5 border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground"><Download className="w-3.5 h-3.5" />CSV</button>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/20 border-b border-border text-[10px] text-muted-foreground"><tr>{['CORRELATION ID', 'TIMESTAMP', 'CLIENT', 'TOOL', 'TIER', 'OUTCOME', 'DURATION'].map(h => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} onClick={() => setSelected(selected?.id === entry.id ? null : entry)} className={`border-b border-border last:border-0 cursor-pointer transition-colors ${selected?.id === entry.id ? 'bg-teal/5' : 'hover:bg-muted/10'}`}>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-teal">{entry.correlationId}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{entry.timestamp}</td>
                  <td className="px-4 py-2.5 text-foreground">{entry.client}</td>
                  <td className="px-4 py-2.5 font-mono text-foreground">{entry.tool}</td>
                  <td className="px-4 py-2.5"><TierBadge tier={entry.tier} /></td>
                  <td className="px-4 py-2.5"><span className={`font-medium ${OUTCOME_META[entry.outcome].color}`}>{OUTCOME_META[entry.outcome].label}</span></td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{entry.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Showing {filtered.length} of {entries.length} entries · source:mcp</span>
            <div className="flex gap-1"><button className="px-2 py-1 border border-border rounded hover:bg-muted/30">Prev</button><button className="px-2 py-1 border border-border rounded hover:bg-muted/30">Next</button></div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="w-80 flex-shrink-0 border border-border rounded-xl bg-card overflow-y-auto p-4 space-y-4">
          <div className="flex items-start justify-between"><p className="text-[11px] font-semibold text-foreground">Audit Entry</p><button onClick={() => setSelected(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button></div>
          <div className="bg-muted/20 rounded-lg p-3"><p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Correlation ID</p><div className="flex items-center gap-2"><p className="font-mono text-[11px] text-teal flex-1">{selected.correlationId}</p><button onClick={() => toast.success('Copied.')}><Copy className="w-3 h-3 text-muted-foreground" /></button></div></div>
          <div className="space-y-2 text-[11px]">
            {[['Timestamp', selected.timestamp], ['Tenant', selected.tenant], ['Client', selected.client], ['Tool', selected.tool], ['Call type', 'tools/call'], ['Risk tier', <TierBadge tier={selected.tier} />], ['Outcome', <span className={OUTCOME_META[selected.outcome].color}>{OUTCOME_META[selected.outcome].label}</span>], ['Approval status', selected.approvalStatus], ['Duration', <span className="font-mono">{selected.duration}</span>], ['Input params', <span className="text-muted-foreground italic text-[10px]">[REDACTED]</span>], ['Output', <span className="text-muted-foreground text-[10px]">{selected.outcome === 'success' ? '200 OK' : '—'}</span>]].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between gap-2"><span className="text-muted-foreground flex-shrink-0">{label}</span><span className="text-right">{val}</span></div>
            ))}
          </div>
          {selected.tier === 'T4' && selected.outcome === 'pending_approval' && (
            <div className="border border-amber-400/20 bg-amber-400/5 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-amber-400">Pending Pre-Approval</p>
              <p className="text-[10px] text-muted-foreground">SNOW ticket INC00284820 raised. Awaiting approver action.</p>
              <div className="flex gap-2"><button onClick={() => approveEntry(selected.id)} className="flex-1 bg-teal text-white text-[10px] py-1.5 rounded-lg hover:bg-teal/90">Approve</button><button onClick={() => rejectEntry(selected.id)} className="flex-1 border border-border text-[10px] py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Reject</button></div>
            </div>
          )}
          {(selected.tier === 'T4' || selected.tier === 'T5') && (
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Approval Chain</p>
              {[
                { label: 'MCP tool call received', done: true },
                { label: 'Approval request created', done: true },
                { label: selected.tier === 'T5' ? 'SNOW INC00284710' : 'SNOW INC00284820', done: true },
                { label: selected.outcome === 'success' ? 'Approved — john.doe@acmecorp.com' : selected.outcome === 'rejected' ? 'Rejected — john.doe@acmecorp.com' : 'Awaiting approver', done: selected.outcome === 'success' || selected.outcome === 'rejected' },
                ...(selected.tier === 'T5' ? [{ label: selected.outcome === 'success' ? 'Post-execution approved' : 'Post-execution pending', done: selected.outcome === 'success' }] : []),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2"><div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${step.done ? 'bg-teal' : 'bg-amber-400'}`} /><p className={`text-[10px] ${step.done ? 'text-foreground' : 'text-amber-400'}`}>{step.label}</p></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────
function AdminTab({ runtimeEnabled, setRuntimeEnabled }: { runtimeEnabled: boolean; setRuntimeEnabled: (v: boolean) => void }) {
  const [t4t5Enabled, setT4t5Enabled] = useState(false);
  const [allowlist, setAllowlist] = useState(['avx_c8f2a1b3d4e5', 'avx_a7e9c2d1f0b4', 'avx_f3b8d2a5c9e1', 'avx_b2c5d8e1f4a7']);
  const [newEntry, setNewEntry] = useState('');
  const [toolVisibility, setToolVisibility] = useState<Record<string, boolean>>(Object.fromEntries(TOOLS_DATA.filter(t => t.status === 'published' || t.status === 'degraded').map(t => [t.id, true])));
  const [rateLimits, setRateLimits] = useState({ tenant: 1000, account: 200, tool: 60 });
  const [alertThresholds, setAlertThresholds] = useState({ errorRate: 5, latencyP99: 500, notifyEmail: 'security-ops@acmecorp.com' });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Runtime */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-[12px] font-semibold text-foreground">Runtime Access</p>
        <div className="flex items-center justify-between">
          <div><p className="text-[11px] text-foreground">MCP Runtime — {runtimeEnabled ? 'Enabled' : 'Disabled'}</p><p className="text-[10px] text-muted-foreground mt-0.5">Disabling terminates all active sessions within 60 seconds.</p></div>
          <button onClick={() => { setRuntimeEnabled(!runtimeEnabled); toast[runtimeEnabled ? 'error' : 'success'](runtimeEnabled ? 'Runtime disabled.' : 'Runtime enabled.'); }}>{runtimeEnabled ? <ToggleRight className="w-8 h-8 text-teal" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}</button>
        </div>
      </div>

      {/* T4/T5 */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-[12px] font-semibold text-foreground">High-Risk Tool Access (T4 / T5)</p>
        <div className="flex items-center justify-between">
          <div><p className="text-[11px] text-foreground">Enable T4 and T5 tool execution</p><p className="text-[10px] text-muted-foreground mt-0.5">Disabled by default. T4 requires pre-approval. T5 requires pre + post-approval + rollback action.</p></div>
          <button onClick={() => { setT4t5Enabled(p => !p); toast[!t4t5Enabled ? 'success' : 'error'](!t4t5Enabled ? 'T4/T5 enabled.' : 'T4/T5 disabled.'); }}>{t4t5Enabled ? <ToggleRight className="w-8 h-8 text-amber-400" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}</button>
        </div>
        {t4t5Enabled && <div className="flex items-start gap-2 bg-amber-400/5 border border-amber-400/20 rounded-lg p-3"><AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" /><p className="text-[10px] text-amber-400">Verify AppViewX workflow policies are configured. T5 tools limited to 1 active approval request per service account.</p></div>}
      </div>

      {/* Tool visibility */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div><p className="text-[12px] font-semibold text-foreground">Tool Visibility</p><p className="text-[10px] text-muted-foreground mt-0.5">Enable or disable specific catalog tools for this tenant. Disabled tools are hidden from all AI client discovery. Propagates within 60 seconds.</p></div>
        <div className="space-y-1">
          {TOOLS_DATA.filter(t => t.status === 'published' || t.status === 'degraded').map(tool => (
            <div key={tool.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2"><TierBadge tier={tool.tier} /><span className="font-mono text-[11px] text-foreground">{tool.name}</span>{tool.status === 'degraded' && <span className="text-[9px] text-red-400">● degraded</span>}</div>
              <button onClick={() => { setToolVisibility(prev => ({ ...prev, [tool.id]: !prev[tool.id] })); toast.success(`${tool.name} ${toolVisibility[tool.id] ? 'disabled' : 'enabled'} for this tenant.`); }}>{toolVisibility[tool.id] ? <ToggleRight className="w-6 h-6 text-teal" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Rate limits */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div><p className="text-[12px] font-semibold text-foreground">Rate Limits</p><p className="text-[10px] text-muted-foreground mt-0.5">Requests per minute. Changes take effect within 60 seconds.</p></div>
        {[{ label: 'Per tenant (all accounts)', key: 'tenant' as const, max: 5000, def: 1000 }, { label: 'Per service account', key: 'account' as const, max: 1000, def: 200 }, { label: 'Per tool', key: 'tool' as const, max: 500, def: 60 }].map(item => (
          <div key={item.key}>
            <div className="flex items-center justify-between mb-1"><label className="text-[11px] text-foreground">{item.label}</label><span className="text-[11px] font-mono font-medium text-teal">{rateLimits[item.key]} req/min</span></div>
            <input type="range" min={10} max={item.max} value={rateLimits[item.key]} onChange={e => setRateLimits(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))} className="w-full accent-teal" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>10</span><span>Default: {item.def}</span><span>{item.max}</span></div>
          </div>
        ))}
        <button onClick={() => toast.success('Rate limits saved. Effective within 60 seconds.')} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Save Rate Limits</button>
      </div>

      {/* Alert thresholds */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div><p className="text-[12px] font-semibold text-foreground">Alert Thresholds</p><p className="text-[10px] text-muted-foreground mt-0.5">Alerts fire within 2 minutes of threshold breach.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-medium text-foreground block mb-1">Error rate (%)</label><input type="number" value={alertThresholds.errorRate} min={1} max={100} onChange={e => setAlertThresholds(p => ({ ...p, errorRate: parseInt(e.target.value) }))} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground focus:outline-none focus:border-teal/50" /></div>
          <div><label className="text-[11px] font-medium text-foreground block mb-1">P99 latency (ms)</label><input type="number" value={alertThresholds.latencyP99} min={100} max={5000} onChange={e => setAlertThresholds(p => ({ ...p, latencyP99: parseInt(e.target.value) }))} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground focus:outline-none focus:border-teal/50" /></div>
        </div>
        <div><label className="text-[11px] font-medium text-foreground block mb-1">Notify email</label><input value={alertThresholds.notifyEmail} onChange={e => setAlertThresholds(p => ({ ...p, notifyEmail: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground focus:outline-none focus:border-teal/50" /></div>
        <button onClick={() => toast.success('Alert thresholds saved.')} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Save Alert Config</button>
      </div>

      {/* Allowlist */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between"><div><p className="text-[12px] font-semibold text-foreground">AI Client Allowlist</p><p className="text-[10px] text-muted-foreground mt-0.5">Only listed client IDs can connect. 15-minute grace period for existing sessions on change.</p></div><span className="text-[10px] text-muted-foreground">{allowlist.length}/50</span></div>
        <div className="space-y-1.5">{allowlist.map(id => <div key={id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2"><span className="font-mono text-[11px] text-foreground">{id}</span><button onClick={() => { setAllowlist(prev => prev.filter(x => x !== id)); toast.success('Removed.'); }} className="text-muted-foreground hover:text-red-400"><X className="w-3.5 h-3.5" /></button></div>)}</div>
        <div className="flex gap-2"><input value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="avx_client_id..." className="flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 font-mono" /><button onClick={() => { if (newEntry.trim()) { setAllowlist(p => [...p, newEntry.trim()]); setNewEntry(''); toast.success('Added.'); }}} className="bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90">Add</button></div>
      </div>

    </div>
  );
}

// Main
// ── Session Data ──────────────────────────────────────────────────────────────
const SESSION_DATA: {
  id: string;
  sessionId: string;
  serviceAccount: string;
  clientType: string;
  startTime: string;
  lastActivity: string;
  duration: string;
  status: 'active' | 'completed' | 'expired';
  calls: {
    seq: number;
    tool: string;
    tier: Tier;
    outcome: AuditOutcome;
    correlationId: string;
    timestamp: string;
    duration: string;
  }[];
  anomalies: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    detail: string;
  }[];
}[] = [
  {
    id: 's1',
    sessionId: 'mcp-sess-8f2a1b3d',
    serviceAccount: 'claude-ravi',
    clientType: 'Claude',
    startTime: '2026-05-31 11:28',
    lastActivity: '2026-05-31 11:42',
    duration: '14m 08s',
    status: 'active',
    calls: [
      { seq: 1, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-8f2a1b3d-4e5c', timestamp: '11:28:04', duration: '142ms' },
      { seq: 2, tool: 'get_certificate_details', tier: 'T1', outcome: 'success', correlationId: 'crr-8f2a1b3d-4f1a', timestamp: '11:29:12', duration: '98ms' },
      { seq: 3, tool: 'analyze_expiry_risk', tier: 'T2', outcome: 'success', correlationId: 'crr-7e9c2d1f-0b4a', timestamp: '11:38:21', duration: '318ms' },
      { seq: 4, tool: 'create_renewal_request', tier: 'T3', outcome: 'pending_confirmation', correlationId: 'crr-3b8d2a5c-9e1f', timestamp: '11:42:08', duration: '204ms' },
    ],
    anomalies: [],
  },
  {
    id: 's2',
    sessionId: 'mcp-sess-3b8d2a5c',
    serviceAccount: 'chatgpt-induja',
    clientType: 'ChatGPT',
    startTime: '2026-05-31 11:10',
    lastActivity: '2026-05-31 11:30',
    duration: '20m 22s',
    status: 'completed',
    calls: [
      { seq: 1, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-5d6e9f2a-1111', timestamp: '11:10:01', duration: '130ms' },
      { seq: 2, tool: 'analyze_expiry_risk', tier: 'T2', outcome: 'success', correlationId: 'crr-5d6e9f2a-2222', timestamp: '11:14:30', duration: '290ms' },
      { seq: 3, tool: 'create_renewal_request', tier: 'T3', outcome: 'abandoned', correlationId: 'crr-5d6e9f2a-1b3c', timestamp: '11:20:33', duration: '300001ms' },
      { seq: 4, tool: 'create_renewal_request', tier: 'T3', outcome: 'success', correlationId: 'crr-3b8d2a5c-9e1f', timestamp: '11:26:05', duration: '204ms' },
      { seq: 5, tool: 'execute_certificate_renewal', tier: 'T4', outcome: 'pending_approval', correlationId: 'crr-1a4b7c0d-3f2e', timestamp: '11:28:44', duration: '489ms' },
    ],
    anomalies: [],
  },
  {
    id: 's3',
    sessionId: 'mcp-sess-9f1a4b7c',
    serviceAccount: 'automation-pipeline',
    clientType: 'Custom',
    startTime: '2026-05-31 08:00',
    lastActivity: '2026-05-31 08:10',
    duration: '10m 44s',
    status: 'completed',
    calls: [
      { seq: 1, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5f9a', timestamp: '08:00:01', duration: '110ms' },
      { seq: 2, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5f9b', timestamp: '08:01:02', duration: '108ms' },
      { seq: 3, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5f9c', timestamp: '08:02:04', duration: '112ms' },
      { seq: 4, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5f9d', timestamp: '08:03:05', duration: '109ms' },
      { seq: 5, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5f9e', timestamp: '08:04:06', duration: '115ms' },
      { seq: 6, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5f9f', timestamp: '08:05:07', duration: '111ms' },
      { seq: 7, tool: 'analyze_expiry_risk', tier: 'T2', outcome: 'success', correlationId: 'crr-0b1c2d3e-5fa0', timestamp: '08:06:10', duration: '410ms' },
      { seq: 8, tool: 'get_pqc_posture', tier: 'T2', outcome: 'success', correlationId: 'crr-0b1c2d3e-5fa1', timestamp: '08:08:22', duration: '398ms' },
      { seq: 9, tool: 'check_request_status', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5fa2', timestamp: '08:09:30', duration: '88ms' },
      { seq: 10, tool: 'check_request_status', tier: 'T1', outcome: 'success', correlationId: 'crr-0b1c2d3e-5fa3', timestamp: '08:10:44', duration: '91ms' },
    ],
    anomalies: [
      { type: 'High invocation velocity', severity: 'medium', detail: '10 tool calls in a single session — 6 repeated list_certificates calls. Review for polling behaviour or automation misconfiguration.' },
    ],
  },
  {
    id: 's4',
    sessionId: 'mcp-sess-e1a4b7c0',
    serviceAccount: 'chatgpt-induja',
    clientType: 'ChatGPT',
    startTime: '2026-05-30 16:00',
    lastActivity: '2026-05-30 16:05',
    duration: '5m 12s',
    status: 'expired',
    calls: [
      { seq: 1, tool: 'execute_certificate_renewal', tier: 'T4', outcome: 'rejected', correlationId: 'crr-e1a4b7c0-0001', timestamp: '16:00:04', duration: '489ms' },
    ],
    anomalies: [
      { type: 'High-risk action without prior analysis', severity: 'high', detail: 'T4 tool invoked as the first and only call in this session — no preceding T1 or T2 analysis calls. Approval was rejected by the workflow approver.' },
    ],
  },
  {
    id: 's5',
    sessionId: 'mcp-sess-6a7b1c4d',
    serviceAccount: 'chatgpt-induja',
    clientType: 'ChatGPT',
    startTime: '2026-05-31 09:00',
    lastActivity: '2026-05-31 09:22',
    duration: '22m 07s',
    status: 'completed',
    calls: [
      { seq: 1, tool: 'list_certificates', tier: 'T1', outcome: 'success', correlationId: 'crr-6a7b1c4d-0001', timestamp: '09:00:10', duration: '135ms' },
      { seq: 2, tool: 'get_certificate_details', tier: 'T1', outcome: 'success', correlationId: 'crr-6a7b1c4d-0002', timestamp: '09:02:45', duration: '102ms' },
      { seq: 3, tool: 'analyze_expiry_risk', tier: 'T2', outcome: 'success', correlationId: 'crr-6a7b1c4d-0003', timestamp: '09:08:14', duration: '344ms' },
      { seq: 4, tool: 'create_renewal_request', tier: 'T3', outcome: 'success', correlationId: 'crr-6a7b1c4d-0004', timestamp: '09:14:22', duration: '198ms' },
      { seq: 5, tool: 'execute_certificate_renewal', tier: 'T4', outcome: 'success', correlationId: 'crr-6a7b1c4d-0005', timestamp: '09:18:50', duration: '502ms' },
      { seq: 6, tool: 'revoke_certificate', tier: 'T5', outcome: 'success', correlationId: 'crr-6a7b1c4d-3e8f', timestamp: '09:22:07', duration: '6240ms' },
    ],
    anomalies: [],
  },
];

function deriveIntent(calls: typeof SESSION_DATA[0]['calls']): string {
  const tools = calls.map(c => c.tool);
  const readCount = calls.filter(c => c.tier === 'T1' || c.tier === 'T2').length;
  if (tools.includes('revoke_certificate')) {
    return `Agent traversed a full analysis-to-revocation workflow: scanned inventory, assessed risk, created a renewal request, executed renewal, and submitted a certificate revocation requiring pre- and post-execution approval.`;
  }
  if (tools.includes('execute_certificate_renewal') && tools.includes('analyze_expiry_risk')) {
    return `Agent analyzed certificate expiry risk across ${readCount} read operations, confirmed the renewal workflow, and submitted an execution request pending pre-approval.`;
  }
  if (tools.includes('execute_certificate_renewal')) {
    return `Agent submitted a certificate renewal execution request. No prior analysis calls detected in this session.`;
  }
  if (tools.includes('create_renewal_request') && tools.includes('analyze_expiry_risk')) {
    return `Agent scanned the certificate inventory, analyzed expiry risk, and initiated a renewal request with in-session confirmation.`;
  }
  if (tools.includes('create_renewal_request')) {
    return `Agent initiated a certificate renewal request after reviewing inventory data.`;
  }
  if (tools.includes('get_pqc_posture')) {
    return `Agent performed a read-only compliance session — queried certificate inventory and assessed post-quantum cryptography posture.`;
  }
  if (tools.every(t => ['list_certificates', 'get_certificate_details', 'analyze_expiry_risk', 'check_request_status', 'get_pqc_posture'].includes(t))) {
    return `Agent completed a read-only analysis session across ${tools.length} operations — no workflow actions taken.`;
  }
  return `Agent completed ${calls.length} tool invocations across ${new Set(tools).size} distinct operations.`;
}

function detectAnomalies(calls: typeof SESSION_DATA[0]['calls']): typeof SESSION_DATA[0]['anomalies'] {
  const anomalies: typeof SESSION_DATA[0]['anomalies'] = [];
  const tiers = calls.map(c => c.tier);
  const hasHighRisk = tiers.some(t => t === 'T4' || t === 'T5');
  const hasAnalysis = tiers.some(t => t === 'T1' || t === 'T2');
  const t4Count = tiers.filter(t => t === 'T4').length;
  const t5Count = tiers.filter(t => t === 'T5').length;
  const toolCounts: Record<string, number> = {};
  calls.forEach(c => { toolCounts[c.tool] = (toolCounts[c.tool] || 0) + 1; });
  const repeatedTools = Object.entries(toolCounts).filter(([, n]) => n > 3);
  if (hasHighRisk && !hasAnalysis) {
    anomalies.push({ type: 'High-risk action without prior analysis', severity: 'high', detail: 'T4 or T5 tool invoked with no preceding T1/T2 read or analysis calls in this session.' });
  }
  if (calls.length >= 10) {
    anomalies.push({ type: 'High invocation velocity', severity: 'medium', detail: `${calls.length} tool calls in a single session. Review for polling behaviour or automation misconfiguration.` });
  }
  if (t4Count > 1) {
    anomalies.push({ type: 'Repeated T4 invocation', severity: 'high', detail: `T4 tool invoked ${t4Count} times in one session.` });
  }
  if (t5Count > 1) {
    anomalies.push({ type: 'Repeated T5 invocation', severity: 'high', detail: `T5 destructive tool invoked ${t5Count} times in one session. Maximum 1 active T5 per service account.` });
  }
  repeatedTools.forEach(([tool, count]) => {
    anomalies.push({ type: 'Repeated tool invocation', severity: 'low', detail: `${tool} called ${count} times in this session. May indicate polling or retry logic.` });
  });
  return anomalies;
}

function SessionsTab() {
  const sessions = SESSION_DATA.map(s => ({
    ...s,
    anomalies: s.anomalies.length > 0 ? s.anomalies : detectAnomalies(s.calls),
  }));
  const [selected, setSelected] = useState<typeof sessions[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const filtered = sessions.filter(s => statusFilter === 'all' || s.status === statusFilter);

  const STATUS_META: Record<string, { color: string; dot: string; label: string }> = {
    active: { color: 'text-teal', dot: 'bg-teal', label: 'Active' },
    completed: { color: 'text-muted-foreground', dot: 'bg-gray-400', label: 'Completed' },
    expired: { color: 'text-muted-foreground', dot: 'bg-gray-600', label: 'Expired' },
  };
  const SEVERITY_META: Record<string, string> = {
    high: 'text-red-400 bg-red-400/10 border-red-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    low: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  };
  const OUTCOME_COLOR: Record<string, string> = {
    success: 'text-teal',
    rejected: 'text-red-400',
    pending_approval: 'text-amber-400',
    pending_confirmation: 'text-blue-400',
    abandoned: 'text-gray-400',
    failed: 'text-red-400',
  };
  const CLIENT_BADGE: Record<string, string> = {
    Claude: 'bg-purple-400/10 text-purple-400',
    ChatGPT: 'bg-green-400/10 text-green-400',
    'GitHub Copilot': 'bg-blue-400/10 text-blue-400',
    Cursor: 'bg-orange-400/10 text-orange-400',
    Custom: 'bg-gray-400/10 text-gray-400',
  };

  const totalActive = sessions.filter(s => s.status === 'active').length;
  const totalFlagged = sessions.filter(s => s.anomalies.length > 0).length;

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Sessions', value: totalActive, color: 'text-teal' },
            { label: 'Completed Today', value: sessions.filter(s => s.status === 'completed').length, color: 'text-muted-foreground' },
            { label: 'Anomaly Flags', value: totalFlagged, color: totalFlagged > 0 ? 'text-red-400' : 'text-muted-foreground' },
          ].map(m => (
            <div key={m.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{m.label}</span>
              <span className={`text-xl font-bold ${m.color}`}>{m.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border border-border rounded-lg p-0.5 self-start w-fit">
          {(['all', 'active', 'completed', 'expired'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-[10px] px-3 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? 'bg-teal text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(session => {
            const sm = STATUS_META[session.status];
            const hasAnomalies = session.anomalies.length > 0;
            const highRisk = session.anomalies.some(a => a.severity === 'high');
            return (
              <div key={session.id} onClick={() => setSelected(selected?.id === session.id ? null : session)}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${selected?.id === session.id ? 'border-teal/40 bg-teal/5' : hasAnomalies ? (highRisk ? 'border-red-400/30 hover:border-red-400/50' : 'border-amber-400/30 hover:border-amber-400/50') : 'border-border hover:border-border/80'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot} ${session.status === 'active' ? 'animate-pulse' : ''}`} />
                    <span className="text-[12px] font-semibold text-foreground">{session.serviceAccount}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CLIENT_BADGE[session.clientType] || CLIENT_BADGE['Custom']}`}>{session.clientType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAnomalies && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${highRisk ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                        {session.anomalies.length} flag{session.anomalies.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{session.duration}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {session.calls.map((call, i) => (
                    <React.Fragment key={call.seq}>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${TIER_META[call.tier].bg} ${TIER_META[call.tier].color}`}>{call.tier}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{call.tool}</span>
                        <span className={`text-[9px] ${OUTCOME_COLOR[call.outcome]}`}>
                          {call.outcome === 'success' ? '✓' : call.outcome === 'rejected' ? '✗' : call.outcome === 'pending_approval' ? '⏳' : call.outcome === 'pending_confirmation' ? '?' : call.outcome === 'abandoned' ? '—' : '!'}
                        </span>
                      </div>
                      {i < session.calls.length - 1 && <span className="text-muted-foreground text-[10px]">→</span>}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[9px] text-muted-foreground">{session.sessionId}</span>
                  <span className="text-[10px] text-muted-foreground">{session.startTime} — {session.lastActivity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="w-96 flex-shrink-0 border border-border rounded-xl bg-card overflow-y-auto p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold text-foreground">{selected.serviceAccount}</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{selected.sessionId}</p>
            </div>
            <button onClick={() => setSelected(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {([
              ['Client', selected.clientType],
              ['Status', <span className={`capitalize ${STATUS_META[selected.status].color}`}>{selected.status}</span>],
              ['Started', selected.startTime],
              ['Duration', selected.duration],
              ['Total calls', selected.calls.length],
              ['Last activity', selected.lastActivity],
            ] as [string, React.ReactNode][]).map(([label, val]) => (
              <div key={label} className="bg-muted/20 rounded-lg px-3 py-2">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-medium text-foreground">{val}</p>
              </div>
            ))}
          </div>

          <div className="bg-teal/5 border border-teal/20 rounded-xl p-3">
            <p className="text-[9px] font-semibold text-teal uppercase tracking-wider mb-1.5">Session Intent</p>
            <p className="text-[11px] text-foreground leading-relaxed">{deriveIntent(selected.calls)}</p>
            <p className="text-[9px] text-muted-foreground mt-2">Derived from call sequence · not AI-generated</p>
          </div>

          {selected.anomalies.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Anomaly Flags</p>
              {selected.anomalies.map((a, i) => (
                <div key={i} className={`border rounded-lg p-3 ${SEVERITY_META[a.severity]}`}>
                  <p className="text-[11px] font-semibold mb-0.5">{a.type}</p>
                  <p className="text-[10px] opacity-80 leading-relaxed">{a.detail}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Call Chain</p>
            <div className="space-y-2">
              {selected.calls.map(call => (
                <div key={call.seq} className={`rounded-lg border p-3 ${call.tier === 'T4' || call.tier === 'T5' ? 'border-orange-400/20 bg-orange-400/5' : 'border-border bg-muted/10'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground font-mono">#{call.seq}</span>
                      <TierBadge tier={call.tier} />
                      <span className="font-mono text-[11px] text-foreground">{call.tool}</span>
                    </div>
                    <span className={`text-[10px] font-medium ${OUTCOME_COLOR[call.outcome]}`}>
                      {call.outcome === 'success' ? '✓ Success'
                        : call.outcome === 'pending_approval' ? '⏳ Pending Approval'
                        : call.outcome === 'pending_confirmation' ? '? Pending Confirmation'
                        : call.outcome === 'abandoned' ? '— Abandoned'
                        : call.outcome === 'rejected' ? '✗ Rejected'
                        : call.outcome}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="font-mono">{call.correlationId}</span>
                    <span>{call.timestamp} · {call.duration}</span>
                  </div>
                  {(call.tier === 'T3' || call.tier === 'T4' || call.tier === 'T5') && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-[9px] text-muted-foreground">
                      <p className="font-semibold text-foreground mb-0.5">Approval context sent to approver:</p>
                      <p className="italic leading-relaxed">{deriveIntent(selected.calls.slice(0, call.seq))}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MCPRuntimePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [runtimeEnabled, setRuntimeEnabled] = useState(true);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'catalog', label: 'Tool Catalog', icon: FileText },
    { id: 'accounts', label: 'Service Accounts', icon: Lock },
    { id: 'audit', label: 'Audit Log', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: GitBranch },
    { id: 'admin', label: 'Admin Controls', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <Cpu className="w-5 h-5 text-teal" />
            <h1 className="text-xl font-semibold text-foreground">MCP Runtime Service</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${runtimeEnabled ? 'bg-teal/10 text-teal' : 'bg-red-400/10 text-red-400'}`}>{runtimeEnabled ? '● Online' : '● Disabled'}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Governed MCP gateway · Phase 1 — CLM · SaaS · MCP spec 2025-11-25</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono bg-muted/30 px-2 py-1 rounded">mcp.appviewx.com/v1</span>
          <button onClick={() => toast.success('Endpoint URL copied.')} className="hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex border-b border-border mb-5 flex-shrink-0">
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><t.icon className="w-3.5 h-3.5" />{t.label}</button>)}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'overview'  && <div className="h-full overflow-y-auto"><OverviewTab runtimeEnabled={runtimeEnabled} setRuntimeEnabled={setRuntimeEnabled} /></div>}
        {tab === 'catalog'   && <CatalogTab />}
        {tab === 'accounts'  && <div className="h-full overflow-y-auto"><AccountsTab /></div>}
        {tab === 'audit'     && <AuditTab />}
        {tab === 'sessions'  && <div className="h-full overflow-y-auto"><SessionsTab /></div>}
        {tab === 'admin'     && <div className="h-full overflow-y-auto"><AdminTab runtimeEnabled={runtimeEnabled} setRuntimeEnabled={setRuntimeEnabled} /></div>}
      </div>
    </div>
  );
}

