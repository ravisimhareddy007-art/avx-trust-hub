import React, { useEffect, useState, useMemo } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, EnvBadge, PQCBadge, DaysToExpiry, Drawer, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { Search, RefreshCw, RotateCcw, XCircle, Shield, User, Workflow, Key, ExternalLink, Monitor, Server, Bot, Lock, AlertTriangle, MoreVertical, Sparkles, GitBranch, Loader2, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import GroupsPanel, { CryptoGroup, ConditionSet } from '@/components/inventory/GroupsPanel';
import GroupDetailView from '@/components/inventory/GroupDetailView';
import PolicyDrawer from '@/components/inventory/PolicyDrawer';

const typeFilters = ['All', 'TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token', 'API Key / Secret'];

function getQuickActions(asset: CryptoAsset) {
  const isSSH = asset.type === 'SSH Key' || asset.type === 'SSH Certificate';
  const isTLS = asset.type === 'TLS Certificate' || asset.type === 'Code-Signing Certificate';
  const isAI = asset.type === 'AI Agent Token';
  const isSecret = asset.type === 'API Key / Secret';
  if (isTLS) return [{ label: 'Renew', icon: RefreshCw }, { label: 'Revoke', icon: XCircle }];
  if (isSSH || isAI || isSecret) return [{ label: 'Rotate', icon: RotateCcw }, { label: 'Revoke', icon: XCircle }];
  return [{ label: 'Renew', icon: RefreshCw }, { label: 'Revoke', icon: XCircle }];
}

function AssetRowMenu({ asset, onAction }: { asset: CryptoAsset; onAction: (action: string, asset: CryptoAsset) => void }) {
  const [open, setOpen] = useState(false);
  const actions = getQuickActions(asset);
  const allActions = [
    ...actions,
    { label: 'Assign Owner', icon: User },
    { label: 'Add to Workflow', icon: Workflow },
  ];

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-1 rounded hover:bg-secondary transition-colors">
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] py-1">
            {allActions.map((a) => (
              <button
                key={a.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAction(a.label, asset);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors ${
                  a.label === 'Revoke' ? 'text-coral' : 'text-foreground'
                }`}
              >
                <a.icon className="w-3.5 h-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── AI Dependency Mapper ────────────────────────────────────────────────────

function AIDependencyPanel({ asset, onClose }: { asset: CryptoAsset; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [deps, setDeps] = useState<{ name: string; type: string; risk: string; direction: string }[]>([]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const depMap: Record<string, { name: string; type: string; risk: string; direction: string }[]> = {
        'TLS Certificate': [
          { name: 'NGINX Reverse Proxy', type: 'Load Balancer', risk: 'High', direction: 'upstream' },
          { name: 'payments-api (K8s)', type: 'Application', risk: 'Critical', direction: 'downstream' },
          { name: 'CloudFront CDN', type: 'CDN', risk: 'Medium', direction: 'upstream' },
          { name: 'Stripe Webhook', type: 'External API', risk: 'High', direction: 'downstream' },
          { name: 'Internal mTLS Mesh', type: 'Service Mesh', risk: 'Low', direction: 'peer' },
        ],
        'SSH Key': [
          { name: 'prod-bastion-01', type: 'Jump Server', risk: 'Critical', direction: 'upstream' },
          { name: 'db-replica-set', type: 'Database Cluster', risk: 'High', direction: 'downstream' },
          { name: 'CI/CD Pipeline (Jenkins)', type: 'Build System', risk: 'High', direction: 'downstream' },
          { name: 'Ansible Tower', type: 'Config Mgmt', risk: 'Medium', direction: 'peer' },
        ],
        'AI Agent Token': [
          { name: 'LangChain RAG Pipeline', type: 'AI Pipeline', risk: 'High', direction: 'downstream' },
          { name: 'Vector DB (Pinecone)', type: 'Database', risk: 'Medium', direction: 'downstream' },
          { name: 'OpenAI API Gateway', type: 'External API', risk: 'Critical', direction: 'downstream' },
          { name: 'Slack Bot Integration', type: 'Messaging', risk: 'Low', direction: 'peer' },
        ],
      };
      const defaultDeps = [
        { name: 'App Server Cluster', type: 'Application', risk: 'High', direction: 'downstream' },
        { name: 'Load Balancer', type: 'Infrastructure', risk: 'Medium', direction: 'upstream' },
        { name: 'Monitoring (Datadog)', type: 'Observability', risk: 'Low', direction: 'peer' },
      ];
      setDeps(depMap[asset.type] || defaultDeps);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [asset]);

  const riskColor = (r: string) => r === 'Critical' ? 'text-coral' : r === 'High' ? 'text-amber' : r === 'Medium' ? 'text-foreground' : 'text-teal';

  return (
    <div className="space-y-3">
      <div className="bg-teal/5 border border-teal/20 rounded-lg p-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-teal" />
        <p className="text-xs text-teal font-medium">Infinity AI — Dependency Analysis</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-teal" /> Analyzing dependency graph...
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-2">
            Found <span className="text-foreground font-medium">{deps.length}</span> dependencies for <span className="text-foreground font-medium">{asset.name}</span>
          </div>
          <div className="space-y-1.5">
            {deps.map((d, i) => (
              <div key={i} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2.5 text-xs">
                <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">{d.type} · {d.direction}</p>
                </div>
                <span className={`text-[10px] font-medium ${riskColor(d.risk)}`}>{d.risk}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber/5 border border-amber/20 rounded-lg p-3 text-[10px] text-muted-foreground">
            <p className="font-medium text-amber mb-1">AI Recommendation</p>
            {asset.status === 'Expiring' || asset.status === 'Expired'
              ? `Schedule renewal during next maintenance window. ${deps.filter(d => d.risk === 'Critical').length} critical dependencies need coordinated rollover.`
              : `No immediate action needed. Monitor ${deps.filter(d => d.risk === 'High' || d.risk === 'Critical').length} high-risk dependencies.`
            }
          </div>
        </>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const { filters, setFilters } = useNav();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(filters.type || 'All');
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [actionModal, setActionModal] = useState<{ action: string; asset: CryptoAsset } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [depAsset, setDepAsset] = useState<CryptoAsset | null>(null);

  // Groups state
  const [sidebarView, setSidebarView] = useState<'filters' | 'groups'>('filters');
  const [selectedGroup, setSelectedGroup] = useState<CryptoGroup | null>(null);

  // Policy Drawer state
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);
  const [policyDrawerCtx, setPolicyDrawerCtx] = useState<{ groupId?: string; groupName?: string; conditions?: ConditionSet }>({});

  const openPolicyDrawer = (groupId: string, groupName: string, conditions?: ConditionSet) => {
    setPolicyDrawerCtx({ groupId, groupName, conditions });
    setPolicyDrawerOpen(true);
  };

  const closePolicyDrawer = () => {
    setPolicyDrawerOpen(false);
    setPolicyDrawerCtx({});
  };

  useEffect(() => {
    setTypeFilter(filters.type || 'All');
  }, [filters.type]);

  const filtered = useMemo(() => {
    let result = [...mockAssets];
    if (typeFilter !== 'All') result = result.filter(a => a.type === typeFilter);
    if (filters.algorithm) result = result.filter(a => a.algorithm === filters.algorithm);
    if (filters.environment) result = result.filter(a => a.environment === filters.environment);
    if (filters.status) result = result.filter(a => a.status === filters.status);
    if (filters.pqcRisk) result = result.filter(a => a.pqcRisk === filters.pqcRisk);
    if (filters.team) result = result.filter(a => a.team.includes(filters.team));
    if (filters.expiryRange === '7d') result = result.filter(a => a.daysToExpiry >= 0 && a.daysToExpiry <= 7);
    if (filters.assetId) result = result.filter(a => a.id === filters.assetId);
    if (search) result = result.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.commonName.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [typeFilter, filters, search]);

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = (action: string, asset: CryptoAsset) => {
    setActionModal({ action, asset });
  };

  const confirmAction = () => {
    if (actionModal) {
      toast.success(`${actionModal.action} initiated for ${actionModal.asset.name}`);
      setActionModal(null);
    }
  };

  const isSSHType = (type: string) => type === 'SSH Key' || type === 'SSH Certificate';

  // Type-specific column definitions
  type ColDef = { id: string; label: string; render: (a: CryptoAsset) => React.ReactNode };

  const colDefs: Record<string, ColDef[]> = {
    'All': [
      { id: 'name', label: 'Common Name', render: a => <span className="font-medium text-foreground truncate max-w-[200px] block">{a.name}</span> },
      { id: 'type', label: 'Type', render: a => <span className="text-muted-foreground">{a.type}</span> },
      { id: 'caIssuer', label: 'Issuer', render: a => <span className="text-muted-foreground truncate max-w-[140px] block">{a.caIssuer}</span> },
      { id: 'algorithm', label: 'Algorithm', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'owner', label: 'Owner', render: a => <span className="text-muted-foreground">{a.owner}</span> },
      { id: 'env', label: 'Env', render: a => <EnvBadge env={a.environment} /> },
      { id: 'expiry', label: 'Valid To', render: a => <span className="text-muted-foreground">{a.expiryDate}</span> },
      { id: 'days', label: 'Days', render: a => <DaysToExpiry days={a.daysToExpiry} /> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
    ],
    'TLS Certificate': [
      { id: 'name', label: 'Subject / CN', render: a => <span className="font-medium text-foreground truncate max-w-[200px] block">{a.name}</span> },
      { id: 'caIssuer', label: 'Issuer CA', render: a => <span className="text-muted-foreground truncate max-w-[140px] block">{a.caIssuer}</span> },
      { id: 'serial', label: 'Serial #', render: a => <span className="text-muted-foreground font-mono text-[10px] truncate max-w-[120px] block">{a.serial}</span> },
      { id: 'algorithm', label: 'Sig Algorithm', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'keyLength', label: 'Key Size', render: a => <span className="text-muted-foreground">{a.keyLength}-bit</span> },
      { id: 'owner', label: 'Owner', render: a => <span className="text-muted-foreground">{a.owner}</span> },
      { id: 'env', label: 'Env', render: a => <EnvBadge env={a.environment} /> },
      { id: 'expiry', label: 'Not After', render: a => <span className="text-muted-foreground">{a.expiryDate}</span> },
      { id: 'days', label: 'Days Left', render: a => <DaysToExpiry days={a.daysToExpiry} /> },
      { id: 'autoRenew', label: 'Auto-Renew', render: a => <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{a.autoRenewal ? 'Yes' : 'No'}</span> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
      { id: 'pqcRisk', label: 'PQC Risk', render: a => <PQCBadge risk={a.pqcRisk} /> },
    ],
    'SSH Key': [
      { id: 'name', label: 'Key Name', render: a => <span className="font-medium text-foreground truncate max-w-[180px] block">{a.name}</span> },
      { id: 'fingerprint', label: 'Fingerprint', render: a => <span className="text-muted-foreground font-mono text-[10px] truncate max-w-[130px] block">{a.serial}</span> },
      { id: 'algorithm', label: 'Key Type', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'keyLength', label: 'Bits', render: a => <span className="text-muted-foreground">{a.keyLength}</span> },
      { id: 'owner', label: 'Owner', render: a => <span className={`${a.owner === 'Unassigned' ? 'text-coral' : 'text-muted-foreground'}`}>{a.owner}</span> },
      { id: 'endpoints', label: 'Endpoints', render: a => <span className="text-muted-foreground">{a.sshEndpoints?.length || 0} hosts</span> },
      { id: 'env', label: 'Env', render: a => <EnvBadge env={a.environment} /> },
      { id: 'lastRotated', label: 'Last Rotated', render: a => <span className="text-muted-foreground">{a.lastRotated}</span> },
      { id: 'rotFreq', label: 'Rotation Policy', render: a => <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.rotationFrequency === 'Never' ? 'bg-coral/10 text-coral' : 'bg-muted text-muted-foreground'}`}>{a.rotationFrequency}</span> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
    ],
    'SSH Certificate': [
      { id: 'name', label: 'Cert Name', render: a => <span className="font-medium text-foreground truncate max-w-[180px] block">{a.name}</span> },
      { id: 'caIssuer', label: 'SSH CA', render: a => <span className="text-muted-foreground">{a.caIssuer}</span> },
      { id: 'serial', label: 'KRL Serial', render: a => <span className="text-muted-foreground font-mono text-[10px]">{a.serial}</span> },
      { id: 'algorithm', label: 'Key Type', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'owner', label: 'Principal', render: a => <span className="text-muted-foreground">{a.owner}</span> },
      { id: 'endpoints', label: 'Endpoints', render: a => <span className="text-muted-foreground">{a.sshEndpoints?.length || 0} hosts</span> },
      { id: 'env', label: 'Env', render: a => <EnvBadge env={a.environment} /> },
      { id: 'expiry', label: 'Valid Until', render: a => <span className="text-muted-foreground">{a.expiryDate}</span> },
      { id: 'days', label: 'TTL', render: a => <DaysToExpiry days={a.daysToExpiry} /> },
      { id: 'autoRenew', label: 'Auto-Renew', render: a => <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'}`}>{a.autoRenewal ? 'Yes' : 'No'}</span> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
    ],
    'Code-Signing Certificate': [
      { id: 'name', label: 'Certificate Name', render: a => <span className="font-medium text-foreground truncate max-w-[180px] block">{a.name}</span> },
      { id: 'caIssuer', label: 'Issuer CA', render: a => <span className="text-muted-foreground truncate max-w-[120px] block">{a.caIssuer}</span> },
      { id: 'algorithm', label: 'Sig Algorithm', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'keyLength', label: 'Key Size', render: a => <span className="text-muted-foreground">{a.keyLength}-bit</span> },
      { id: 'infra', label: 'HSM / Storage', render: a => <span className="text-muted-foreground text-[10px]">{a.infrastructure}</span> },
      { id: 'owner', label: 'Owner', render: a => <span className="text-muted-foreground">{a.owner}</span> },
      { id: 'expiry', label: 'Not After', render: a => <span className="text-muted-foreground">{a.expiryDate}</span> },
      { id: 'days', label: 'Days Left', render: a => <DaysToExpiry days={a.daysToExpiry} /> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
      { id: 'pqcRisk', label: 'PQC Risk', render: a => <PQCBadge risk={a.pqcRisk} /> },
    ],
    'K8s Workload Cert': [
      { id: 'name', label: 'Service Identity', render: a => <span className="font-medium text-foreground truncate max-w-[200px] block">{a.name}</span> },
      { id: 'caIssuer', label: 'Mesh CA', render: a => <span className="text-muted-foreground">{a.caIssuer}</span> },
      { id: 'spiffe', label: 'SPIFFE ID', render: a => <span className="text-muted-foreground font-mono text-[10px] truncate max-w-[180px] block">{a.serial}</span> },
      { id: 'algorithm', label: 'Algorithm', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'infra', label: 'Cluster', render: a => <span className="text-muted-foreground text-[10px]">{a.infrastructure}</span> },
      { id: 'rotFreq', label: 'Rotation', render: a => <span className="text-muted-foreground">{a.rotationFrequency}</span> },
      { id: 'autoRenew', label: 'Auto-Rotate', render: a => <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'}`}>{a.autoRenewal ? 'Yes' : 'No'}</span> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
      { id: 'pqcRisk', label: 'PQC Risk', render: a => <PQCBadge risk={a.pqcRisk} /> },
    ],
    'Encryption Key': [
      { id: 'name', label: 'Key Name', render: a => <span className="font-medium text-foreground truncate max-w-[180px] block">{a.name}</span> },
      { id: 'caIssuer', label: 'KMS Provider', render: a => <span className="text-muted-foreground">{a.caIssuer}</span> },
      { id: 'algorithm', label: 'Cipher', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'keyLength', label: 'Key Size', render: a => <span className="text-muted-foreground">{a.keyLength}-bit</span> },
      { id: 'owner', label: 'Owner', render: a => <span className="text-muted-foreground">{a.owner}</span> },
      { id: 'app', label: 'Application', render: a => <span className="text-muted-foreground text-[10px]">{a.application}</span> },
      { id: 'env', label: 'Env', render: a => <EnvBadge env={a.environment} /> },
      { id: 'lastRotated', label: 'Last Rotated', render: a => <span className="text-muted-foreground">{a.lastRotated}</span> },
      { id: 'rotFreq', label: 'Rotation Policy', render: a => <span className="text-muted-foreground">{a.rotationFrequency}</span> },
      { id: 'autoRotate', label: 'Auto-Rotate', render: a => <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.autoRenewal ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{a.autoRenewal ? 'Yes' : 'No'}</span> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
    ],
    'AI Agent Token': [
      { id: 'name', label: 'Token Name', render: a => <span className="font-medium text-foreground truncate max-w-[180px] block">{a.name}</span> },
      { id: 'agentType', label: 'Agent Type', render: a => <span className="inline-flex items-center gap-1 text-foreground"><Bot className="w-3 h-3 text-muted-foreground" />{a.agentMeta?.agentType || 'Unknown'}</span> },
      { id: 'framework', label: 'Framework', render: a => <span className="text-muted-foreground text-[10px]">{a.agentMeta?.framework || '—'}</span> },
      { id: 'owner', label: 'Owner', render: a => <span className="text-muted-foreground">{a.owner}</span> },
      { id: 'permRisk', label: 'Permission Risk', render: a => {
        const risk = a.agentMeta?.permissionRisk || '';
        const cls = risk === 'Over-privileged' ? 'bg-coral/10 text-coral' : risk === 'Right-sized' ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground';
        return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{risk || '—'}</span>;
      }},
      { id: 'services', label: 'Services', render: a => <span className="text-muted-foreground text-[10px]">{a.agentMeta?.servicesAccessed?.length || 0} services</span> },
      { id: 'actions', label: 'Actions/Day', render: a => <span className="text-muted-foreground">{a.agentMeta?.actionsPerDay?.toLocaleString() || '—'}</span> },
      { id: 'expiry', label: 'Expires', render: a => <span className="text-muted-foreground">{a.expiryDate}</span> },
      { id: 'days', label: 'TTL', render: a => <DaysToExpiry days={a.daysToExpiry} /> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
    ],
    'API Key / Secret': [
      { id: 'name', label: 'Secret Name', render: a => <span className="font-medium text-foreground truncate max-w-[180px] block">{a.name}</span> },
      { id: 'caIssuer', label: 'Vault / Source', render: a => <span className="text-muted-foreground">{a.caIssuer}</span> },
      { id: 'algorithm', label: 'Encryption', render: a => <span className="text-muted-foreground">{a.algorithm}</span> },
      { id: 'owner', label: 'Owner', render: a => <span className={`${a.owner === 'Unassigned' ? 'text-coral' : 'text-muted-foreground'}`}>{a.owner}</span> },
      { id: 'team', label: 'Team', render: a => <span className="text-muted-foreground">{a.team}</span> },
      { id: 'env', label: 'Env', render: a => <EnvBadge env={a.environment} /> },
      { id: 'lastRotated', label: 'Last Rotated', render: a => <span className="text-muted-foreground">{a.lastRotated}</span> },
      { id: 'rotFreq', label: 'Rotation Policy', render: a => <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.rotationFrequency === 'Never' ? 'bg-coral/10 text-coral' : 'bg-muted text-muted-foreground'}`}>{a.rotationFrequency}</span> },
      { id: 'status', label: 'Status', render: a => <StatusBadge status={a.status} /> },
    ],
  };

  const activeColumns = colDefs[typeFilter] || colDefs['All'];

  const handleBulkAction = (action: string) => {
    if (selectedRows.size === 0) {
      toast.info('Select assets first to perform bulk actions');
      return;
    }
    if (action === 'Create Policy') {
      setPolicyDrawerCtx({ groupName: `${selectedRows.size} selected assets` });
      setPolicyDrawerOpen(true);
      return;
    }
    toast.success(`${action} initiated for ${selectedRows.size} assets`, { description: 'Workflow created — track in TrustOps.' });
    setSelectedRows(new Set());
  };

  return (
    <div className="flex gap-4">
      {/* Left sidebar — Groups / Filters */}
      <div className="w-[220px] flex-shrink-0 space-y-3">
        <div className="flex gap-1 border-b border-border">
          <button onClick={() => { setSidebarView('filters'); setSelectedGroup(null); }}
            className={`px-3 py-1.5 text-[10px] font-medium border-b-2 transition-colors ${sidebarView === 'filters' ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>
            Filters
          </button>
          <button onClick={() => setSidebarView('groups')}
            className={`px-3 py-1.5 text-[10px] font-medium border-b-2 transition-colors flex items-center gap-1 ${sidebarView === 'groups' ? 'border-teal text-teal' : 'border-transparent text-muted-foreground'}`}>
            <LayoutGrid className="w-3 h-3" /> Groups
          </button>
        </div>

        {sidebarView === 'filters' && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Environment</p>
              <div className="space-y-1">
                {['Production', 'Staging', 'Development'].map(env => (
                  <button key={env} onClick={() => setFilters({ ...filters, environment: filters.environment === env ? '' : env })}
                    className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${filters.environment === env ? 'bg-teal/10 text-teal' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                    {env}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Status</p>
              <div className="space-y-1">
                {['Active', 'Expiring', 'Expired', 'Orphaned'].map(s => (
                  <button key={s} onClick={() => setFilters({ ...filters, status: filters.status === s ? '' : s })}
                    className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${filters.status === s ? 'bg-teal/10 text-teal' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium mb-1">PQC Risk</p>
              <div className="space-y-1">
                {['Critical', 'High', 'Medium', 'Low'].map(r => (
                  <button key={r} onClick={() => setFilters({ ...filters, pqcRisk: filters.pqcRisk === r ? '' : r })}
                    className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-colors ${filters.pqcRisk === r ? 'bg-teal/10 text-teal' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {Object.values(filters).some(v => v) && (
              <button onClick={() => setFilters({})} className="text-[10px] text-coral hover:underline">Clear all filters</button>
            )}
          </div>
        )}

        {sidebarView === 'groups' && (
          <GroupsPanel
            onSelectGroup={g => setSelectedGroup(g)}
            selectedGroupId={selectedGroup?.id}
            onOpenPolicyDrawer={openPolicyDrawer}
          />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Group Detail View replaces main content when a group is selected */}
        {selectedGroup ? (
          <GroupDetailView
            group={selectedGroup}
            onBack={() => setSelectedGroup(null)}
            onOpenPolicyDrawer={openPolicyDrawer}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">{filtered.length} of {mockAssets.length} assets</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {Object.keys(filters).length > 0 && (
                  <button onClick={() => setFilters({})} className="text-xs text-coral hover:underline">Clear filters</button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
              {typeFilters.map(t => {
                const count = t === 'All' ? mockAssets.length : mockAssets.filter(a => a.type === t).length;
                const shortLabel = t === 'All' ? 'All' : t === 'TLS Certificate' ? 'Certificates' : t === 'SSH Key' ? 'SSH Keys' : t === 'SSH Certificate' ? 'SSH Certs' : t === 'Code-Signing Certificate' ? 'Code Signing' : t === 'K8s Workload Cert' ? 'K8s Certs' : t === 'Encryption Key' ? 'Enc Keys' : t === 'AI Agent Token' ? 'AI Agents' : t === 'API Key / Secret' ? 'Secrets' : t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTypeFilter(t);
                      if (t === 'All') {
                        const { type, ...restFilters } = filters;
                        setFilters(restFilters);
                      } else {
                        setFilters({ ...filters, type: t });
                      }
                    }}
                    className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      typeFilter === t
                        ? 'border-teal text-teal'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {shortLabel}
                    <span className={`inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 rounded-full text-[10px] font-semibold ${
                      typeFilter === t ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Toolbar */}
            <div className="bg-card rounded-lg border border-border px-3 py-2 flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-3 py-1 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div className="w-px h-6 bg-border" />
              <span className="text-[10px] text-muted-foreground">{activeColumns.length} cols</span>
              <div className="w-px h-6 bg-border" />
              <span className="text-xs text-muted-foreground">{filtered.length} Entries</span>
              <div className="flex items-center gap-1 ml-auto">
                <button className="p-1 text-muted-foreground hover:text-foreground">‹</button>
                <button className="p-1 text-muted-foreground hover:text-foreground">›</button>
                <button onClick={() => {}} className="p-1 text-muted-foreground hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedRows.size > 0 && (
              <div className="bg-teal/10 border border-teal/30 rounded-lg px-4 py-2 flex items-center gap-3">
                <span className="text-xs font-semibold text-teal">{selectedRows.size} selected</span>
                <div className="w-px h-5 bg-teal/30" />
                {['Bulk Renew', 'Bulk Rotate', 'Bulk Revoke', 'Create Policy', 'Assign Owner', 'Export CSV'].map(action => (
                  <button
                    key={action}
                    onClick={() => handleBulkAction(action)}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
                      action === 'Bulk Revoke'
                        ? 'bg-coral/10 text-coral hover:bg-coral/20'
                        : action === 'Export CSV'
                        ? 'bg-muted text-muted-foreground hover:text-foreground hover:bg-secondary'
                        : action === 'Create Policy'
                        ? 'bg-purple/10 text-purple hover:bg-purple/20'
                        : 'bg-teal/20 text-teal hover:bg-teal/30'
                    }`}
                  >
                    {action}
                  </button>
                ))}
                <button onClick={() => setSelectedRows(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground ml-auto">Clear</button>
              </div>
            )}

            {/* Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50">
                    <tr className="border-b border-border">
                      <th className="w-8 py-2 px-2"><input type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(filtered.map(a => a.id)) : new Set())} className="rounded" /></th>
                      <th className="w-6 py-2 px-1"></th>
                      {activeColumns.map(col => (
                        <th key={col.id} className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">{col.label}</th>
                      ))}
                      <th className="w-10 py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(asset => (
                      <tr key={asset.id} className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors" onClick={() => { setSelectedAsset(asset); setDrawerTab('overview'); }}>
                        <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedRows.has(asset.id)} onChange={() => toggleRow(asset.id)} className="rounded" />
                        </td>
                        <td className="py-2 px-1 text-muted-foreground">▸</td>
                        {activeColumns.map(col => (
                          <td key={col.id} className="py-2 px-2">{col.render(asset)}</td>
                        ))}
                        <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                          <AssetRowMenu asset={asset} onAction={handleAction} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No assets found matching your filters.{' '}
                  <button onClick={() => { setFilters({}); setTypeFilter('All'); setSearch(''); }} className="text-teal hover:underline">Clear all filters</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Asset Detail Drawer */}
      <Drawer open={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name || ''}>
        {selectedAsset && (
          <div>
            <div className="flex gap-1 mb-4 border-b border-border">
              {['overview', 'history', 'policy', 'actions', 'dependencies', 'ai'].map(tab => (
                <button key={tab} onClick={() => setDrawerTab(tab)} className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${drawerTab === tab ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {tab === 'ai' ? 'AI' : tab === 'dependencies' ? '🔗 Deps' : tab}
                </button>
              ))}
            </div>

            {drawerTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ['Type', selectedAsset.type], ['Algorithm', selectedAsset.algorithm], ['Key Length', selectedAsset.keyLength],
                    ['CA / Issuer', selectedAsset.caIssuer], ['Serial', selectedAsset.serial], ['Owner', selectedAsset.owner],
                    ['Team', selectedAsset.team], ['Application', selectedAsset.application], ['Environment', selectedAsset.environment],
                    ['Infrastructure', selectedAsset.infrastructure], ['Discovery Source', selectedAsset.discoverySource],
                    ['Issue Date', selectedAsset.issueDate], ['Expiry Date', selectedAsset.expiryDate], ['Last Rotated', selectedAsset.lastRotated],
                    ['Auto-Renewal', selectedAsset.autoRenewal ? 'Yes' : 'No'], ['Rotation Frequency', selectedAsset.rotationFrequency],
                    ['Status', selectedAsset.status], ['PQC Risk', selectedAsset.pqcRisk],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {isSSHType(selectedAsset.type) && selectedAsset.sshEndpoints && selectedAsset.sshEndpoints.length > 0 && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-teal" /> SSH Endpoints
                    </h4>
                    <div className="space-y-1">
                      <div className="grid grid-cols-[80px_1fr_120px_50px_130px] gap-2 text-[10px] font-medium text-muted-foreground pb-1 border-b border-border">
                        <span>Role</span><span>Host</span><span>IP</span><span>Port</span><span>Last Seen</span>
                      </div>
                      {selectedAsset.sshEndpoints.map((ep, i) => (
                        <div key={i} className="grid grid-cols-[80px_1fr_120px_50px_130px] gap-2 text-[10px] py-1.5 border-b border-border/50">
                          <span className={`inline-flex items-center gap-1 font-medium ${ep.role === 'client' ? 'text-teal' : 'text-amber'}`}>
                            {ep.role === 'client' ? <Monitor className="w-3 h-3" /> : <Server className="w-3 h-3" />}
                            {ep.role === 'client' ? 'Client' : 'Host'}
                          </span>
                          <span className="text-foreground font-mono">{ep.host}</span>
                          <span className="text-muted-foreground font-mono">{ep.ip}</span>
                          <span className="text-muted-foreground">{ep.port}</span>
                          <span className="text-muted-foreground">{ep.lastSeen}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAsset.type === 'AI Agent Token' && selectedAsset.agentMeta && (
                  <>
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-teal" /> Agent Identity
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><p className="text-muted-foreground mb-0.5">Agent Type</p><p className="font-medium">{selectedAsset.agentMeta.agentType}</p></div>
                        <div><p className="text-muted-foreground mb-0.5">Framework</p><p className="font-medium">{selectedAsset.agentMeta.framework}</p></div>
                        <div><p className="text-muted-foreground mb-0.5">Last Activity</p><p className="font-medium">{selectedAsset.agentMeta.lastActivity}</p></div>
                        <div><p className="text-muted-foreground mb-0.5">Actions / Day</p><p className="font-medium">{selectedAsset.agentMeta.actionsPerDay.toLocaleString()}</p></div>
                      </div>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-teal" /> Permissions & Access
                        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          selectedAsset.agentMeta.permissionRisk === 'Over-privileged' ? 'bg-coral/10 text-coral' :
                          selectedAsset.agentMeta.permissionRisk === 'Right-sized' ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'
                        }`}>
                          {selectedAsset.agentMeta.permissionRisk === 'Over-privileged' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {selectedAsset.agentMeta.permissionRisk}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Services Accessed ({selectedAsset.agentMeta.servicesAccessed.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedAsset.agentMeta.servicesAccessed.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded bg-muted text-[10px] text-foreground">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Permissions ({selectedAsset.agentMeta.permissions.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedAsset.agentMeta.permissions.map(p => (
                              <span key={p} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground">{p}</span>
                            ))}
                          </div>
                        </div>
                        {selectedAsset.agentMeta.mcpTools && (
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">MCP Tools ({selectedAsset.agentMeta.mcpTools.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedAsset.agentMeta.mcpTools.map(t => (
                                <span key={t} className="px-2 py-0.5 rounded bg-teal/10 text-[10px] font-mono text-teal">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedAsset.agentMeta.permissionRisk === 'Over-privileged' && (
                      <div className="bg-coral/5 border border-coral/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-coral mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Over-Privileged Agent</p>
                        <p className="text-[10px] text-muted-foreground">
                          This agent has {selectedAsset.agentMeta.permissions.length} permissions across {selectedAsset.agentMeta.servicesAccessed.length} services.
                          Recommend right-sizing to least-privilege access based on observed behavior patterns.
                        </p>
                        <button onClick={() => toast.success('Right-size permissions workflow created')} className="text-[10px] text-teal font-medium mt-2 hover:underline">
                          Right-size permissions →
                        </button>
                      </div>
                    )}
                  </>
                )}

                {selectedAsset.pqcRisk !== 'Safe' && selectedAsset.pqcRisk !== 'Low' && (
                  <div className="bg-amber/5 border border-amber/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber mb-1">PQC Risk: {selectedAsset.pqcRisk}</p>
                    <p className="text-[10px] text-muted-foreground">
                      This asset uses {selectedAsset.algorithm} which will be vulnerable to Shor's algorithm once a cryptographically relevant quantum computer exists.
                      NIST recommends migrating to ML-DSA by 2030.
                    </p>
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'dependencies' && (
              <AIDependencyPanel asset={selectedAsset} onClose={() => setDrawerTab('overview')} />
            )}

            {drawerTab === 'history' && (
              <div className="space-y-3">
                {[
                  { event: 'Certificate issued', time: selectedAsset.issueDate, actor: 'DigiCert CertCentral' },
                  { event: 'Discovered by scan', time: selectedAsset.issueDate, actor: 'Production Full Scan' },
                  { event: 'Policy violation detected', time: '2026-04-10', actor: 'Policy Engine' },
                  { event: 'Owner assigned', time: '2026-03-15', actor: 'Mike Rodriguez' },
                  { event: 'PQC risk assessment', time: '2026-04-01', actor: 'Quantum Posture Engine' },
                ].map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-teal mt-1.5" />
                      {i < 4 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-medium">{e.event}</p>
                      <p className="text-[10px] text-muted-foreground">{e.time} · {e.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {drawerTab === 'policy' && (
              <div className="space-y-2">
                {selectedAsset.policyViolations > 0 ? (
                  [
                    { policy: 'Certificate Expiry Alert', severity: 'High', detail: `Certificate expires in ${selectedAsset.daysToExpiry} days`, action: 'Renew certificate' },
                    { policy: 'PQC-Vulnerable Asset', severity: 'Critical', detail: `Uses ${selectedAsset.algorithm} — quantum vulnerable`, action: 'Migrate to ML-DSA' },
                  ].slice(0, selectedAsset.policyViolations).map((v, i) => (
                    <div key={i} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={v.severity} />
                          <span className="text-xs font-medium">{v.policy}</span>
                        </div>
                        <button onClick={() => toast.success('Remediation created in TrustOps')} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Create remediation</button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{v.detail}</p>
                      <p className="text-[10px] text-teal mt-1">Recommended: {v.action}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No policy violations for this asset.</p>
                )}
                <button onClick={() => { setPolicyDrawerCtx({ groupName: selectedAsset.name }); setPolicyDrawerOpen(true); }}
                  className="w-full text-center py-2 text-xs text-teal hover:underline">+ Create policy for this asset</button>
              </div>
            )}

            {drawerTab === 'actions' && (
              <div className="space-y-2">
                {[
                  { icon: RefreshCw, label: 'Renew', desc: 'Request renewal from CA', show: ['TLS Certificate', 'Code-Signing Certificate', 'K8s Workload Cert'].includes(selectedAsset.type) },
                  { icon: RotateCcw, label: 'Rotate', desc: 'Generate new key pair', show: ['SSH Key', 'SSH Certificate', 'Encryption Key', 'AI Agent Token'].includes(selectedAsset.type) },
                  { icon: XCircle, label: 'Revoke', desc: 'Revoke this credential', show: true },
                  { icon: Shield, label: 'Re-issue with PQC', desc: 'Migrate to ML-DSA algorithm', show: selectedAsset.pqcRisk === 'Critical' || selectedAsset.pqcRisk === 'High' },
                  { icon: User, label: 'Assign Owner', desc: 'Assign or change owner', show: true },
                  { icon: Workflow, label: 'Add to Workflow', desc: 'Include in automation workflow', show: true },
                ].filter(a => a.show).map((action, i) => (
                  <button key={i} onClick={() => handleAction(action.label, selectedAsset)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left">
                    <action.icon className="w-4 h-4 text-teal" />
                    <div>
                      <p className="text-xs font-medium">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {drawerTab === 'ai' && (
              <div className="space-y-3">
                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-teal mb-1">Infinity AI Analysis</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    This {selectedAsset.type.toLowerCase()} serves {selectedAsset.dependencyCount} downstream dependencies
                    and is currently using {selectedAsset.algorithm}. Based on usage patterns and criticality assessment,
                    this asset has a predicted time-to-failure of {selectedAsset.daysToExpiry > 0 ? `${selectedAsset.daysToExpiry} days` : 'immediate risk'}
                    if no action is taken.
                  </p>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold mb-2">Similar Assets with Issues</p>
                  {mockAssets.filter(a => a.type === selectedAsset.type && a.id !== selectedAsset.id && a.policyViolations > 0).slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1.5 text-[10px]">
                      <span className="text-foreground">{a.name}</span>
                      <span className="text-coral">{a.policyViolations} violations</span>
                    </div>
                  ))}
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1">Recommended Action</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedAsset.pqcRisk === 'Critical' ? 'Prioritize migration to ML-DSA algorithm as part of PQC migration batch.' :
                     selectedAsset.status === 'Orphaned' ? 'Assign an owner and set up automated rotation policy.' :
                     'Continue monitoring. No immediate action required.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Action Confirmation Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={`Confirm: ${actionModal?.action}`}>
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Impact Preview</p>
              <p className="text-[10px] text-muted-foreground">
                This will affect {actionModal.asset.dependencyCount} applications and services.
                {actionModal.action === 'Renew' && ' Scheduled renewal will trigger at 02:00 AM.'}
                {actionModal.action === 'Rotate' && ' New key will be distributed to all dependent services.'}
                {actionModal.action === 'Revoke' && ' WARNING: All dependent services will immediately lose trust.'}
              </p>
            </div>
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">Asset:</span> {actionModal.asset.name}</p>
              <p><span className="text-muted-foreground">Type:</span> {actionModal.asset.type}</p>
              <p><span className="text-muted-foreground">Environment:</span> {actionModal.asset.environment}</p>
              <p><span className="text-muted-foreground">Dependencies:</span> {actionModal.asset.dependencyCount}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">Cancel</button>
              <button onClick={confirmAction} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Confirm {actionModal.action}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Dependency Modal */}
      <Modal open={!!depAsset} onClose={() => setDepAsset(null)} title={`Dependencies — ${depAsset?.name || ''}`}>
        {depAsset && <AIDependencyPanel asset={depAsset} onClose={() => setDepAsset(null)} />}
      </Modal>

      {/* Policy Builder Drawer */}
      <PolicyDrawer
        open={policyDrawerOpen}
        onClose={closePolicyDrawer}
        groupId={policyDrawerCtx.groupId}
        groupName={policyDrawerCtx.groupName}
        preConditions={policyDrawerCtx.conditions}
      />
    </div>
  );
}
