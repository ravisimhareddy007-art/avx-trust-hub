import React, { useState, useMemo, useEffect } from 'react';
import { discoveryRuns } from '@/data/mockData';
import { StatusBadge, Modal } from '@/components/shared/UIComponents';
import { useNav } from '@/context/NavigationContext';
import { useIntegrations } from '@/context/IntegrationsContext';
import { useConnections, formatRelativeTime, SavedConnection } from '@/context/ConnectionsContext';
import {
  useProfiles, useRuns, formatRelative, formatRelativeFuture,
  formatDuration, formatSchedule, computeNextRun, DiscoveryProfile,
} from '@/context/DiscoveryContext';
import { toast } from 'sonner';
import {
  Search, RefreshCw, Info, Plus, Play, Upload, Database,
  Radar, ShieldCheck, Cloud, Activity, Monitor, Lock, Users, FileDown,
  Copy, Edit, Calendar, ArrowRight, Filter, X, ChevronRight, Check, AlertCircle,
} from 'lucide-react';

// ============================================================================
// SCAN CATEGORY DEFINITIONS
// ============================================================================
type ConfigKey = 'network' | 'ca' | 'ocsp' | 'cloud' | 'kubernetes' | 'registry'
  | 'ctlog' | 'ebpf' | 'endpoint' | 'sourcecode' | 'iac' | 'vault' | 'hsm'
  | 'iam' | 'aiagent' | 'cmdb' | 'cbom';

interface ScanType {
  value: string;
  description: string;
  config: ConfigKey;
  discovers: string[];
}

interface ScanCategory {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  types: ScanType[];
}

const scanCategories: ScanCategory[] = [
  {
    category: 'Active Scanning', icon: Radar,
    description: 'Direct network-level discovery via protocol handshakes',
    types: [
      { value: 'Network TLS Scan', description: 'TCP/TLS handshake across IP ranges. Discovers all TLS endpoints, extracts certificate chain, cipher suites, protocol versions.', config: 'network', discovers: ['TLS Certificates', 'Cipher Suites', 'Protocol Versions', 'Certificate Chains'] },
      { value: 'SSH Host Scan', description: 'SSH handshake across IP ranges. Discovers SSH host keys, authorized_keys (with agent), key algorithms.', config: 'network', discovers: ['SSH Host Keys', 'Host Certificates', 'Key Algorithms'] },
      { value: 'Port Range Scan', description: 'Custom port range TLS fingerprinting. For non-standard TLS ports beyond common presets.', config: 'network', discovers: ['TLS Certificates', 'Service Fingerprints'] },
    ]
  },
  {
    category: 'CA & PKI Systems', icon: ShieldCheck,
    description: 'Pull issued certificate inventory directly from CA connectors',
    types: [
      { value: 'CA Connector Scan', description: 'Poll connected CAs for all issued certificates. Uses existing Integrations connectors.', config: 'ca', discovers: ['TLS Certificates', 'Client Certificates', 'Code Signing Certs', 'CA Metadata'] },
      { value: 'OCSP / CRL Monitoring', description: 'Monitor revocation endpoints for CA health and CRL freshness. Detect revoked certs still in service.', config: 'ocsp', discovers: ['Revoked Certificates', 'CRL Health', 'OCSP Response Times'] },
    ]
  },
  {
    category: 'Cloud & Container', icon: Cloud,
    description: 'Enumerate crypto assets across cloud accounts and container platforms',
    types: [
      { value: 'Cloud Provider Scan', description: 'Multi-account, multi-region scan across AWS, Azure, GCP. Discovers certs, keys, secrets across cloud-native stores.', config: 'cloud', discovers: ['ACM Certificates', 'Key Vault Secrets', 'KMS Keys', 'IAM Service Accounts'] },
      { value: 'Kubernetes API Scan', description: 'Multi-cluster discovery including cert-manager, Istio Citadel, SPIFFE/SPIRE, K8s TLS secrets.', config: 'kubernetes', discovers: ['TLS Secrets', 'cert-manager Certificates', 'Istio mTLS', 'SPIFFE SVIDs'] },
      { value: 'Container Registry Scan', description: 'Scan Docker Hub, ECR, GCR, ACR image layers for embedded certificates, keys, hardcoded secrets.', config: 'registry', discovers: ['Embedded Certificates', 'Hardcoded Keys', 'Self-Signed Certs in Images'] },
    ]
  },
  {
    category: 'Passive & Behavioral', icon: Activity,
    description: 'Non-intrusive discovery via traffic observation and log monitoring',
    types: [
      { value: 'CT Log Monitor', description: 'Real-time Certificate Transparency log streaming for your domains. Detects shadow certs, misissued certs, and rogue CAs.', config: 'ctlog', discovers: ['All Issued Certs for Domains', 'Shadow Certificates', 'Wildcard Certs', 'Misissued Certs'] },
      { value: 'Passive eBPF Monitor', description: 'eBPF-based TLS handshake observation on host. No decryption. Observes active cipher suites and certificate exchanges in production traffic.', config: 'ebpf', discovers: ['Active TLS Sessions', 'In-use Cipher Suites', 'Certificate Usage Patterns'] },
    ]
  },
  {
    category: 'Endpoint & Source', icon: Monitor,
    description: 'Scan endpoints, source code, and infrastructure-as-code',
    types: [
      { value: 'Endpoint Agent Scan', description: 'Agent-based scan of OS certificate stores (Windows CertStore, Linux NSS, macOS Keychain), JKS/PKCS12, SSH authorized_keys.', config: 'endpoint', discovers: ['OS Certificate Stores', 'JKS Keystores', 'SSH Authorized Keys', 'PFX / P12 Files'] },
      { value: 'Source Code Scan', description: 'Org-level GitHub/GitLab scan for hardcoded certificates, private keys, API secrets, embedded credentials.', config: 'sourcecode', discovers: ['Hardcoded Certificates', 'Private Keys in Repos', 'API Secrets', 'SSH Keys in Configs'] },
      { value: 'IaC / SBOM Scan', description: 'Scan Terraform state, Helm charts, and Ansible playbooks for crypto references. Extract SBOMs from build artifacts.', config: 'iac', discovers: ['Terraform-managed Certs', 'Helm TLS Configs', 'Ansible Vault References', 'SBOM Crypto Components'] },
    ]
  },
  {
    category: 'Secrets & Key Stores', icon: Lock,
    description: 'Enumerate secrets, keys, and credentials from vault and HSM systems',
    types: [
      { value: 'Secrets Vault Scan', description: 'Enumerate and classify crypto objects from HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, CyberArk Conjur.', config: 'vault', discovers: ['Vault Secrets', 'API Keys', 'Encryption Keys', 'PKI Engine Certs', 'Dynamic Secrets'] },
      { value: 'HSM Inventory', description: 'Enumerate keys stored in HSMs via PKCS#11, KMIP 2.1. Supports Thales Luna, AWS CloudHSM, Fortanix DSM, AWS KMS.', config: 'hsm', discovers: ['HSM Key Objects', 'Key Attributes', 'Usage Policies', 'Partition Inventory'] },
    ]
  },
  {
    category: 'Identity & Access', icon: Users,
    description: 'Discover machine identities from IAM, directory, and AI governance systems',
    types: [
      { value: 'IAM Graph Import', description: 'Enumerate service accounts, OAuth apps, API tokens, and managed identities from Okta, Azure AD, SCIM 2.0.', config: 'iam', discovers: ['Service Accounts', 'OAuth Applications', 'API Tokens', 'Managed Identities'] },
      { value: 'AI Agent Token Discovery', description: 'Monitor OAuth2/OIDC token issuance for AI agent frameworks (LangChain, AutoGPT, OpenAI Assistants). Detect unsponsored / over-privileged tokens.', config: 'aiagent', discovers: ['AI Agent OAuth Tokens', 'LLM API Keys', 'Agent Credentials', 'MCP Server Tokens'] },
    ]
  },
  {
    category: 'Import & ETL', icon: Database,
    description: 'Import crypto inventory from vulnerability scanners, CMDBs, and CBOM sources',
    types: [
      { value: 'CMDB / ETL Import', description: 'Import asset and certificate data from vulnerability scanners and CMDBs. Extracts crypto findings into unified inventory.', config: 'cmdb', discovers: ['Scanner Cert Findings', 'CMDB Asset Records', 'Certificate Metadata'] },
      { value: 'CBOM Import', description: 'Import Cryptographic Bill of Materials from CycloneDX or SPDX. Compatible with Fortanix Key Insight, Anchore, Grype, Syft, and other SCA tools.', config: 'cbom', discovers: ['Cryptographic Components', 'Algorithm Inventory', 'Key Usages', 'PQC Readiness Data'] },
    ]
  },
];

// ============================================================================
// MOCK PROFILES
// ============================================================================
interface Profile {
  id: string; name: string; category: string; types: string[];
  schedule: string; lastRun: string; nextRun: string;
  status: 'Healthy' | 'Warning' | 'Failed'; discovered: number;
}

const mockProfiles: Profile[] = [
  { id: 'p1', name: 'Production TLS Sweep', category: 'Active Scanning', types: ['Network TLS Scan', 'CT Log Monitor'], schedule: 'Daily 02:00', lastRun: '2h ago', nextRun: 'in 22h', status: 'Healthy', discovered: 18420 },
  { id: 'p2', name: 'CA Inventory Full Pull', category: 'CA & PKI Systems', types: ['CA Connector Scan'], schedule: 'Every 6h', lastRun: '1h ago', nextRun: 'in 5h', status: 'Healthy', discovered: 1847203 },
  { id: 'p3', name: 'Cloud Multi-Account', category: 'Cloud & Container', types: ['Cloud Provider Scan'], schedule: 'Daily 03:00', lastRun: '3h ago', nextRun: 'in 21h', status: 'Warning', discovered: 247891 },
  { id: 'p4', name: 'K8s Cluster Sweep', category: 'Cloud & Container', types: ['Kubernetes API Scan', 'Container Registry Scan'], schedule: 'Every 6h', lastRun: '30m ago', nextRun: 'in 5.5h', status: 'Healthy', discovered: 12847 },
  { id: 'p5', name: 'Source + IaC Scan', category: 'Endpoint & Source', types: ['Source Code Scan', 'IaC / SBOM Scan'], schedule: 'Daily 01:00', lastRun: '5h ago', nextRun: 'in 19h', status: 'Healthy', discovered: 3218 },
  { id: 'p6', name: 'Vulnerability Import', category: 'Import & ETL', types: ['CMDB / ETL Import'], schedule: 'Weekly Sunday', lastRun: '3d ago', nextRun: 'in 4d', status: 'Healthy', discovered: 892341 },
  { id: 'p7', name: 'Internal TLS Network Scan', category: 'Active Scanning', types: ['Network TLS Scan'], schedule: 'Weekly Monday', lastRun: '6d ago', nextRun: 'in 1d', status: 'Warning', discovered: 42180 },
];

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function DiscoveryPage() {
  const [tab, setTab] = useState<'profiles' | 'new' | 'runs'>('profiles');
  const [editingProfile, setEditingProfile] = useState<DiscoveryProfile | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Discovery</h1>
          <p className="text-[11px] text-muted-foreground">Profiles · Scans · Runs · Unified across all credential types</p>
        </div>
        {tab === 'profiles' && (
          <button
            onClick={() => { setEditingProfile(null); setTab('new'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light"
          >
            <Plus className="w-3.5 h-3.5" /> New Profile
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {([
          ['profiles', 'Profiles'],
          ['new', 'New Scan'],
          ['runs', 'Discovery Runs'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <ProfilesTab onEdit={(p) => { setEditingProfile(p); setTab('new'); }} onNew={() => { setEditingProfile(null); setTab('new'); }} />}
      {tab === 'new' && <NewScanTab existing={editingProfile} onSaved={() => setTab('runs')} goToTab={setTab} />}
      {tab === 'runs' && <RunsTab />}
    </div>
  );
}

// ============================================================================
// TAB 1 — PROFILES
// ============================================================================
function ProfilesTab({ onEdit, onNew }: { onEdit: (p: DiscoveryProfile) => void; onNew: () => void }) {
  const [search, setSearch] = useState('');
  const { profiles } = useProfiles();
  const { runs, latestRunForProfile, addRun, updateRun } = useRuns();

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.includes.some(t => t.toLowerCase().includes(search.toLowerCase())),
  );

  const runProfileNow = (p: DiscoveryProfile) => {
    const run = addRun({
      profileId: p.id,
      profileName: p.name,
      connectionId: p.connectionId,
      connectionName: p.connectionName,
      vaultType: p.vaultType,
      category: p.category,
      includes: p.includes,
      triggeredBy: 'manual',
    });
    toast.success(`"${p.name}" started on-demand`, { description: 'View progress in Discovery Runs' });
    setTimeout(() => {
      const items = 50 + Math.floor(Math.random() * 451);
      updateRun(run.id, { status: 'completed', completedAt: Date.now(), itemsDiscovered: items });
    }, 2000);
  };

  if (profiles.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-10 text-center space-y-3">
        <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">No discovery profiles yet</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Profiles save scan configurations so you can re-run them on a schedule. Create one from New Scan with "Save as profile" checked.
        </p>
        <button onClick={onNew}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light">
          <Plus className="w-3.5 h-3.5" /> Go to New Scan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search profiles by name, category, scan type…"
            className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">{filtered.length} of {profiles.length} profiles</span>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Profile</th>
                <th className="text-left px-3 py-2 font-medium">Category</th>
                <th className="text-left px-3 py-2 font-medium">Includes</th>
                <th className="text-left px-3 py-2 font-medium">Schedule</th>
                <th className="text-right px-3 py-2 font-medium">Discovered</th>
                <th className="text-left px-3 py-2 font-medium">Last run</th>
                <th className="text-left px-3 py-2 font-medium">Next run</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const latest = latestRunForProfile(p.id);
                const visibleIncludes = p.includes.slice(0, 2);
                const moreCount = p.includes.length - visibleIncludes.length;
                const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/20">
                    <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{p.name}</td>
                    <td className="px-3 py-2">
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground whitespace-nowrap">{p.category}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {visibleIncludes.map(t => (
                          <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded bg-teal/10 text-teal border border-teal/20 whitespace-nowrap">{t}</span>
                        ))}
                        {moreCount > 0 && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground whitespace-nowrap">+{moreCount} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatSchedule(p.schedule)}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground tabular-nums font-medium">
                      {latest?.itemsDiscovered != null && latest.status === 'completed' ? latest.itemsDiscovered.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatRelative(latest?.startedAt ?? p.lastRunAt)}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatRelativeFuture(p.nextRunAt)}</td>
                    <td className="px-3 py-2"><StatusBadge status={statusLabel} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => runProfileNow(p)}
                          className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded bg-teal text-primary-foreground hover:bg-teal-light"
                        >
                          <Play className="w-2.5 h-2.5" /> Run
                        </button>
                        <button onClick={() => onEdit(p)}
                          className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
                          <Edit className="w-2.5 h-2.5" /> Edit
                        </button>
                        <button
                          onClick={() => toast.success(`Cloned "${p.name}"`)}
                          className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
                          <Copy className="w-2.5 h-2.5" /> Clone
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No profiles match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button onClick={onNew}
          className="w-full border-t border-dashed border-border hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5 py-3 text-muted-foreground hover:text-teal">
          <Plus className="w-4 h-4" />
          <span className="text-xs font-medium">New Profile</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2 — NEW SCAN (two-column scan-type selector + per-type config panel)
// ============================================================================
function NewScanTab({ existing, onSaved, goToTab }: { existing: DiscoveryProfile | null; onSaved: () => void; goToTab: (t: 'profiles' | 'new' | 'runs') => void }) {
  const initialCategory = existing
    ? scanCategories.find(c => c.category === existing.category) ?? scanCategories[0]
    : scanCategories[0];
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory.category);
  const [selectedType, setSelectedType] = useState<ScanType>(initialCategory.types[0]);
  const [discoveryName, setDiscoveryName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [profileName, setProfileName] = useState(existing?.name ?? '');
  const [runType, setRunType] = useState<'on-demand' | 'schedule'>(existing?.schedule ? 'schedule' : 'on-demand');
  const [scheduleFreq, setScheduleFreq] = useState(existing?.schedule?.freq ?? 'Daily');
  const [scheduleTime, setScheduleTime] = useState(existing?.schedule?.time ?? '02:00');
  const [scheduleDay, setScheduleDay] = useState(existing?.schedule?.day ?? 'Sunday');

  // Lifted vault state — used when category is "Secrets & Key Stores"
  const { byVaultType } = useConnections();
  const [vaultType, setVaultType] = useState(existing?.vaultType || 'HashiCorp Vault');
  const [vaultAccountId, setVaultAccountId] = useState(existing?.connectionId ?? '');
  const [authMethod, setAuthMethod] = useState('AppRole');
  const [secretTypes, setSecretTypes] = useState<string[]>(existing?.includes ?? ['Certificates', 'API Keys', 'Encryption Keys']);

  const { addProfile, updateProfile } = useProfiles();
  const { addRun, updateRun } = useRuns();

  const currentCategory = scanCategories.find(c => c.category === activeCategory)!;
  const isEditing = existing != null;
  const isVaultScan = selectedType.config === 'vault';

  const resetForm = () => {
    setDiscoveryName(''); setDescription('');
    setSaveAsProfile(false); setProfileName('');
    setRunType('on-demand');
    setVaultAccountId('');
    setSecretTypes(['Certificates', 'API Keys', 'Encryption Keys']);
  };

  const buildScheduleObj = () =>
    runType === 'schedule'
      ? { freq: scheduleFreq, time: scheduleTime, ...(scheduleFreq === 'Weekly' ? { day: scheduleDay } : {}) }
      : null;

  const handleStart = () => {
    if (!discoveryName.trim()) { toast.error('Discovery name is required'); return; }
    if (saveAsProfile && !profileName.trim()) { toast.error('Profile name is required'); return; }

    // Resolve connection details (vault scan uses selected connection; others use a synthetic placeholder)
    let connectionId = '';
    let connectionName = '';
    let resolvedVaultType = '';
    let includes: string[] = selectedType.discovers;

    if (isVaultScan) {
      const conn = byVaultType(vaultType).find(c => c.id === vaultAccountId);
      if (!conn) { toast.error('Please select a vault account before starting.'); return; }
      connectionId = conn.id;
      connectionName = conn.name;
      resolvedVaultType = conn.vaultType;
      includes = secretTypes;
    } else {
      connectionId = `inline_${selectedType.config}`;
      connectionName = selectedType.value;
      resolvedVaultType = selectedType.value;
    }

    const schedule = buildScheduleObj();
    let profileId: string | null = null;
    let savedProfileName: string | null = null;

    if (saveAsProfile) {
      const prof = addProfile({
        name: profileName.trim(),
        description,
        connectionId,
        connectionName,
        vaultType: resolvedVaultType,
        category: activeCategory,
        includes,
        scanScope: { scanType: selectedType.value, authMethod },
        schedule,
        nextRunAt: computeNextRun(schedule),
      });
      profileId = prof.id;
      savedProfileName = prof.name;
    }

    const run = addRun({
      profileId,
      profileName: savedProfileName,
      connectionId,
      connectionName,
      vaultType: resolvedVaultType,
      category: activeCategory,
      includes,
      triggeredBy: 'manual',
    });

    setTimeout(() => {
      const items = 50 + Math.floor(Math.random() * 451);
      updateRun(run.id, { status: 'completed', completedAt: Date.now(), itemsDiscovered: items });
    }, 2000);

    toast.success('Discovery started. View progress in Discovery Runs.', {
      action: { label: 'View Runs', onClick: () => goToTab('runs') },
    });
    resetForm();
    onSaved();
  };

  const handleSaveOnly = () => {
    if (!profileName.trim()) { toast.error('Profile name is required'); return; }
    let connectionId = '';
    let connectionName = '';
    let resolvedVaultType = '';
    let includes: string[] = selectedType.discovers;

    if (isVaultScan) {
      const conn = byVaultType(vaultType).find(c => c.id === vaultAccountId);
      if (!conn) { toast.error('Please select a vault account before saving.'); return; }
      connectionId = conn.id;
      connectionName = conn.name;
      resolvedVaultType = conn.vaultType;
      includes = secretTypes;
    } else {
      connectionId = `inline_${selectedType.config}`;
      connectionName = selectedType.value;
      resolvedVaultType = selectedType.value;
    }
    const schedule = buildScheduleObj();
    addProfile({
      name: profileName.trim(),
      description,
      connectionId, connectionName,
      vaultType: resolvedVaultType,
      category: activeCategory,
      includes,
      scanScope: { scanType: selectedType.value, authMethod },
      schedule,
      nextRunAt: computeNextRun(schedule),
    });
    toast.success(`Profile "${profileName}" saved`);
    resetForm();
    goToTab('profiles');
  };

  const handleUpdate = () => {
    if (!existing) return;
    if (!discoveryName.trim()) { toast.error('Profile name is required'); return; }
    const schedule = buildScheduleObj();
    updateProfile(existing.id, {
      name: discoveryName.trim(),
      description,
      schedule,
      nextRunAt: computeNextRun(schedule),
      includes: isVaultScan ? secretTypes : existing.includes,
    });
    toast.success(`Profile "${discoveryName}" updated`, { description: 'Changes saved successfully' });
    goToTab('profiles');
  };

  return (
    <div className="space-y-4">
      {isEditing && (
        <div className="bg-amber/10 border border-amber/30 rounded-lg px-3 py-2 flex items-center justify-between">
          <p className="text-[11.5px]">
            <span className="font-semibold text-amber">Editing profile:</span>{' '}
            <span className="text-foreground">{existing?.name}</span>
            <span className="text-muted-foreground"> · changes apply on save</span>
          </p>
          <button onClick={onSaved} className="text-[10.5px] text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}
      {/* Two-column scan type selector */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-secondary/30">
          <p className="text-[11px] font-semibold text-foreground">Select scan type</p>
        </div>
        <div className="grid grid-cols-12 min-h-[280px]">
          {/* Left column: categories */}
          <div className="col-span-4 lg:col-span-3 border-r border-border bg-secondary/20">
            {scanCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.category;
              return (
                <button
                  key={cat.category}
                  onClick={() => { setActiveCategory(cat.category); setSelectedType(cat.types[0]); }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-l-2 transition-colors ${
                    isActive ? 'border-l-teal bg-card' : 'border-l-transparent hover:bg-secondary/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-teal' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className={`text-[11px] font-medium leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{cat.category}</p>
                    <p className="text-[9px] text-muted-foreground/70 leading-snug mt-0.5 line-clamp-2">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right column: types within category */}
          <div className="col-span-8 lg:col-span-9 p-3 space-y-1.5 overflow-y-auto">
            {currentCategory.types.map(type => {
              const isSelected = selectedType.value === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type)}
                  className={`w-full text-left rounded-md px-3 py-2.5 border transition-all ${
                    isSelected ? 'border-teal bg-teal/5 ring-1 ring-teal/30' : 'border-border bg-secondary/20 hover:bg-secondary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[12px] font-semibold text-foreground">{type.value}</p>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-snug mb-1.5">{type.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {type.discovers.map(d => (
                      <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">{d}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Config panel for selected scan type */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-teal">{selectedType.value} configuration</h2>
        </div>
        <ConfigPanel configKey={selectedType.config} scanType={selectedType.value} />
      </div>

      {/* Common fields */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-teal">Discovery details</h2>
        <FormRow label="Discovery name" required>
          <input value={discoveryName} onChange={e => setDiscoveryName(e.target.value)} placeholder="e.g. Production TLS sweep — week 14"
            className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </FormRow>
        <FormRow label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional"
            className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
        </FormRow>
        <FormRow label="Run type">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={runType === 'on-demand'} onChange={() => setRunType('on-demand')} className="accent-teal" /> On-demand
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={runType === 'schedule'} onChange={() => setRunType('schedule')} className="accent-teal" /> Scheduled
            </label>
          </div>
        </FormRow>

        {runType === 'schedule' && (
          <div className="ml-44 grid grid-cols-3 gap-2 max-w-md">
            <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}
              className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground">
              {['Every 6 hours', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
            </select>
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
              className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground" />
            {scheduleFreq === 'Weekly' && (
              <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)}
                className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
              </select>
            )}
          </div>
        )}

        <FormRow label="Save as profile">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={saveAsProfile} onChange={e => setSaveAsProfile(e.target.checked)} className="accent-teal" />
            Reuse this configuration in future runs
          </label>
        </FormRow>
        {saveAsProfile && (
          <FormRow label="Profile name" required>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. Production TLS Sweep"
              className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </FormRow>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 -mx-1 px-1 border-t border-border">
        {isEditing ? (
          <>
            <button onClick={handleUpdate}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light">
              <Check className="w-3.5 h-3.5" /> Save Changes
            </button>
            <button onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/10">
              <Play className="w-3.5 h-3.5" /> Save & Run Now
            </button>
          </>
        ) : (
          <>
            <button onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light">
              <Play className="w-3.5 h-3.5" /> Start Discovery
            </button>
            {saveAsProfile && (
              <button onClick={handleSaveOnly}
                className="flex items-center gap-2 px-5 py-2 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/10">
                Save Profile Only
              </button>
            )}
          </>
        )}
        <button onClick={() => { setDiscoveryName(''); setDescription(''); setSaveAsProfile(false); setProfileName(''); }}
          className="px-5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary">
          Reset
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG PANELS — one per scan type config key
// ============================================================================
function ConfigPanel({ configKey, scanType }: { configKey: ConfigKey; scanType: string }) {
  switch (configKey) {
    case 'network':    return <NetworkConfig scanType={scanType} />;
    case 'ca':         return <CAConfig />;
    case 'ocsp':       return <OCSPConfig />;
    case 'cloud':      return <CloudConfig />;
    case 'kubernetes': return <KubernetesConfig />;
    case 'registry':   return <RegistryConfig />;
    case 'ctlog':      return <CTLogConfig />;
    case 'ebpf':       return <EBPFConfig />;
    case 'endpoint':   return <EndpointConfig />;
    case 'sourcecode': return <SourceCodeConfig />;
    case 'iac':        return <IaCConfig />;
    case 'vault':      return <VaultConfig />;
    case 'hsm':        return <HSMConfig />;
    case 'iam':        return <IAMConfig />;
    case 'aiagent':    return <AIAgentConfig />;
    case 'cmdb':       return <CMDBConfig />;
    case 'cbom':       return <CBOMConfig />;
    default: return null;
  }
}

// ----- Reusable inputs -----
const inputCls = 'flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal';
const selectCls = inputCls;
const textareaCls = `${inputCls} font-mono resize-none`;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-teal" />
      {label}
    </label>
  );
}

function CheckGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={value.includes(opt)}
            onChange={e => onChange(e.target.checked ? [...value, opt] : value.filter(v => v !== opt))}
            className="accent-teal" />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ----- Individual config panels -----
function NetworkConfig({ scanType }: { scanType: string }) {
  const [ipRanges, setIpRanges] = useState('');
  const [excludeIps, setExcludeIps] = useState('');
  const [ports, setPorts] = useState(scanType === 'SSH Host Scan' ? '22' : '443, 8443');
  const [tlsVersion, setTlsVersion] = useState('All');
  const [includeExpired, setIncludeExpired] = useState(true);
  const presets = scanType === 'SSH Host Scan' ? ['22', '2222'] : ['443', '8443', '636', '993', '995'];
  return (
    <div className="space-y-3">
      <FormRow label="IP ranges / subnets" required>
        <textarea value={ipRanges} onChange={e => setIpRanges(e.target.value)} rows={3} placeholder={'10.0.0.0/24\n192.168.1.0/24'} className={textareaCls} />
      </FormRow>
      <FormRow label="Exclude IPs">
        <input value={excludeIps} onChange={e => setExcludeIps(e.target.value)} placeholder="10.0.0.1, 10.0.0.254" className={inputCls} />
      </FormRow>
      <FormRow label="Ports" required>
        <div className="flex-1 max-w-md space-y-1.5">
          <input value={ports} onChange={e => setPorts(e.target.value)} className={inputCls.replace('max-w-md', 'w-full')} />
          <div className="flex gap-1 flex-wrap">
            {presets.map(p => (
              <button key={p} onClick={() => setPorts(prev => prev.includes(p) ? prev : prev ? `${prev}, ${p}` : p)}
                className="px-2 py-0.5 text-[10px] rounded bg-muted border border-border hover:bg-secondary text-muted-foreground">+{p}</button>
            ))}
          </div>
        </div>
      </FormRow>
      <FormRow label="TLS version filter">
        <select value={tlsVersion} onChange={e => setTlsVersion(e.target.value)} className={selectCls}>
          {['All', 'TLS 1.0+', 'TLS 1.2+', 'TLS 1.3 only'].map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="Include expired certs"><Toggle checked={includeExpired} onChange={setIncludeExpired} label="Capture even after expiry date" /></FormRow>
      <FormRow label="Timeout (sec)"><input type="number" defaultValue={30} className="w-24 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" /></FormRow>
      <FormRow label="Threads"><input type="number" defaultValue={10} className="w-24 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" /></FormRow>
    </div>
  );
}

function CAConfig() {
  const { byType } = useIntegrations();
  const { setCurrentPage } = useNav();
  const caIntegrations = byType('CA');
  const [caType, setCaType] = useState('DigiCert CertCentral');
  const [caAccount, setCaAccount] = useState(caIntegrations[0]?.account ?? '');
  const [profiles, setProfiles] = useState<string[]>(['Server']);
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);
  return (
    <div className="space-y-3">
      <FormRow label="CA type" required>
        <select value={caType} onChange={e => setCaType(e.target.value)} className={selectCls}>
          {['DigiCert CertCentral', 'Entrust', 'Microsoft ADCS', 'EJBCA', "Let's Encrypt", 'AWS Private CA', 'GCP Certificate Authority Service', 'HashiCorp Vault PKI', 'Sectigo', 'GlobalSign', 'Custom'].map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="CA account" required>
        {caIntegrations.length > 0 ? (
          <select value={caAccount} onChange={e => setCaAccount(e.target.value)} className={selectCls}>
            {caIntegrations.map(i => (
              <option key={i.account} value={i.account}>{i.account} ({i.name})</option>
            ))}
          </select>
        ) : (
          <button onClick={() => setCurrentPage('integrations')}
            className="flex items-center gap-1.5 text-xs text-amber hover:underline">
            <AlertCircle className="w-3.5 h-3.5" /> No CA connectors configured — Go to Integrations →
          </button>
        )}
      </FormRow>
      <FormRow label="Certificate profiles">
        <CheckGroup options={['Server', 'Client', 'Code Signing', 'Email', 'All']} value={profiles} onChange={setProfiles} />
      </FormRow>
      <FormRow label="Include revoked"><Toggle checked={includeRevoked} onChange={setIncludeRevoked} label="Include revoked certificates in inventory" /></FormRow>
      <FormRow label="Include expired"><Toggle checked={includeExpired} onChange={setIncludeExpired} label="Include expired certificates in inventory" /></FormRow>
    </div>
  );
}

function OCSPConfig() {
  const { byType } = useIntegrations();
  const cas = byType('CA');
  const [monitorOcsp, setMonitorOcsp] = useState(true);
  const [monitorCrl, setMonitorCrl] = useState(true);
  const [staleness, setStaleness] = useState('24');
  const [alertRevoked, setAlertRevoked] = useState(true);
  return (
    <div className="space-y-3">
      <FormRow label="CA connector" required>
        <select className={selectCls}>
          {cas.length === 0 ? <option>No CA connectors</option> : cas.map(i => <option key={i.account}>{i.account}</option>)}
        </select>
      </FormRow>
      <FormRow label="Monitoring"><div className="flex flex-col gap-1.5">
        <Toggle checked={monitorOcsp} onChange={setMonitorOcsp} label="Monitor OCSP responder health" />
        <Toggle checked={monitorCrl} onChange={setMonitorCrl} label="Monitor CRL freshness" />
      </div></FormRow>
      <FormRow label="CRL staleness threshold">
        <div className="flex items-center gap-2">
          <input type="number" value={staleness} onChange={e => setStaleness(e.target.value)} className="w-20 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" />
          <span className="text-xs text-muted-foreground">hours</span>
        </div>
      </FormRow>
      <FormRow label="Alerts"><Toggle checked={alertRevoked} onChange={setAlertRevoked} label="Alert on revoked certs still in service" /></FormRow>
    </div>
  );
}

function CloudConfig() {
  const [providers, setProviders] = useState<string[]>(['AWS']);
  const [awsServices, setAwsServices] = useState<string[]>(['ACM', 'Secrets Manager', 'KMS']);
  const [azureServices, setAzureServices] = useState<string[]>(['Key Vault']);
  const [gcpServices, setGcpServices] = useState<string[]>(['Certificate Manager']);
  const [accounts, setAccounts] = useState<string[]>(['']);
  return (
    <div className="space-y-3">
      <FormRow label="Cloud providers" required>
        <CheckGroup options={['AWS', 'Azure', 'GCP', 'Oracle Cloud']} value={providers} onChange={setProviders} />
      </FormRow>
      {providers.includes('AWS') && (
        <FormRow label="AWS services">
          <CheckGroup options={['ACM', 'Secrets Manager', 'KMS', 'IAM', 'S3 (public bucket certs)', 'EC2 Instance Connect']} value={awsServices} onChange={setAwsServices} />
        </FormRow>
      )}
      {providers.includes('Azure') && (
        <FormRow label="Azure services">
          <CheckGroup options={['Key Vault', 'Managed Identity', 'App Service Certs', 'ADCS']} value={azureServices} onChange={setAzureServices} />
        </FormRow>
      )}
      {providers.includes('GCP') && (
        <FormRow label="GCP services">
          <CheckGroup options={['Certificate Manager', 'Secret Manager', 'KMS', 'IAM Service Accounts']} value={gcpServices} onChange={setGcpServices} />
        </FormRow>
      )}
      <FormRow label="Accounts / subscriptions">
        <div className="flex-1 max-w-md space-y-1.5">
          {accounts.map((a, i) => (
            <div key={i} className="flex gap-1">
              <input value={a} onChange={e => { const n = [...accounts]; n[i] = e.target.value; setAccounts(n); }}
                placeholder="123456789012 / sub-xxx / project-id"
                className={inputCls.replace('max-w-md', 'w-full')} />
              {accounts.length > 1 && (
                <button onClick={() => setAccounts(accounts.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-coral">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setAccounts([...accounts, ''])}
            className="text-[11px] text-teal flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add account</button>
        </div>
      </FormRow>
      <FormRow label="Regions">
        <select className={selectCls}>
          <option>All regions</option>
          <option>us-east-1, us-west-2</option>
          <option>eu-west-1, eu-central-1</option>
          <option>Custom selection</option>
        </select>
      </FormRow>
    </div>
  );
}

function KubernetesConfig() {
  const [clusters, setClusters] = useState([{ name: '', url: '', auth: 'kubeconfig' }]);
  const [namespaces, setNamespaces] = useState<'all' | 'selected'>('all');
  const [components, setComponents] = useState<string[]>(['cert-manager CRDs', 'Kubernetes TLS Secrets']);
  return (
    <div className="space-y-3">
      <FormRow label="Clusters" required>
        <div className="flex-1 max-w-md space-y-2">
          {clusters.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 p-2 bg-muted/50 rounded border border-border">
              <input value={c.name} onChange={e => { const n = [...clusters]; n[i].name = e.target.value; setClusters(n); }}
                placeholder="Cluster name (e.g. eks-prod-us-east)" className={inputCls.replace('max-w-md', 'w-full')} />
              <input value={c.url} onChange={e => { const n = [...clusters]; n[i].url = e.target.value; setClusters(n); }}
                placeholder="API server URL" className={`${inputCls.replace('max-w-md', 'w-full')} font-mono`} />
              <select value={c.auth} onChange={e => { const n = [...clusters]; n[i].auth = e.target.value; setClusters(n); }} className={selectCls.replace('max-w-md', 'w-full')}>
                <option value="kubeconfig">Kubeconfig</option>
                <option value="service-account">Service account token</option>
                <option value="oidc">OIDC</option>
              </select>
            </div>
          ))}
          <button onClick={() => setClusters([...clusters, { name: '', url: '', auth: 'kubeconfig' }])}
            className="text-[11px] text-teal flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add cluster</button>
        </div>
      </FormRow>
      <FormRow label="Namespaces">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" checked={namespaces === 'all'} onChange={() => setNamespaces('all')} className="accent-teal" /> All
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" checked={namespaces === 'selected'} onChange={() => setNamespaces('selected')} className="accent-teal" /> Selected
          </label>
        </div>
      </FormRow>
      <FormRow label="Components">
        <CheckGroup options={['cert-manager CRDs', 'Kubernetes TLS Secrets', 'Istio Citadel', 'SPIFFE/SPIRE', 'Linkerd', 'Custom CRDs']} value={components} onChange={setComponents} />
      </FormRow>
      <FormRow label="Include expired"><Toggle checked={false} onChange={() => {}} label="Include expired secrets" /></FormRow>
    </div>
  );
}

function RegistryConfig() {
  return (
    <div className="space-y-3">
      <FormRow label="Registry type" required>
        <select className={selectCls}>{['Docker Hub', 'AWS ECR', 'GCP Artifact Registry', 'Azure ACR', 'Harbor', 'JFrog Artifactory'].map(v => <option key={v}>{v}</option>)}</select>
      </FormRow>
      <FormRow label="Registry URL" required><input className={inputCls} placeholder="https://index.docker.io" /></FormRow>
      <FormRow label="Auth credentials" required><input type="password" className={inputCls} placeholder="••••••••" /></FormRow>
      <FormRow label="Scan scope">
        <select className={selectCls}><option>All repositories</option><option>Selected repositories</option></select>
      </FormRow>
      <FormRow label="Layer depth">
        <select className={selectCls}><option>Surface layer only</option><option>Full layer scan</option></select>
      </FormRow>
      <FormRow label="Base images"><Toggle checked={true} onChange={() => {}} label="Include base images" /></FormRow>
    </div>
  );
}

function CTLogConfig() {
  const [domains, setDomains] = useState('');
  const [logs, setLogs] = useState<string[]>(['Google Argon', 'Cloudflare Nimbus']);
  const [alerts, setAlerts] = useState<string[]>(['Shadow certs', 'Wildcard certs', 'Certs from unknown CAs']);
  const [mode, setMode] = useState<'realtime' | 'batch'>('realtime');
  return (
    <div className="space-y-3">
      <FormRow label="Domains to monitor" required>
        <textarea value={domains} onChange={e => setDomains(e.target.value)} rows={3} placeholder={'acmecorp.com\n*.payments.acmecorp.com'} className={textareaCls} />
      </FormRow>
      <FormRow label="CT log sources">
        <CheckGroup options={['Google Argon', 'Google Xenon', 'Cloudflare Nimbus', 'DigiCert Log', "Let's Encrypt Oak", 'Apple', 'Custom']} value={logs} onChange={setLogs} />
      </FormRow>
      <FormRow label="Alert on">
        <CheckGroup options={['Shadow certs', 'Wildcard certs', 'Certs from unknown CAs', 'Short-lived certs (<7d)']} value={alerts} onChange={setAlerts} />
      </FormRow>
      <FormRow label="Mode">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={mode === 'realtime'} onChange={() => setMode('realtime')} className="accent-teal" /> Real-time streaming</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={mode === 'batch'} onChange={() => setMode('batch')} className="accent-teal" /> Batch (daily)</label>
        </div>
      </FormRow>
    </div>
  );
}

function EBPFConfig() {
  return (
    <div className="space-y-3">
      <FormRow label="Agent groups" required><select className={selectCls}><option>production-agents</option><option>staging-agents</option></select></FormRow>
      <FormRow label="Capture mode">
        <div className="flex items-start gap-2">
          <Toggle checked={true} onChange={() => {}} label="Capture TLS metadata only (no payload)" />
          <span title="Locked ON for compliance — eBPF observes handshake metadata without decrypting payload" className="text-muted-foreground"><Info className="w-3 h-3" /></span>
        </div>
      </FormRow>
      <FormRow label="Alert on">
        <CheckGroup options={['New cipher suites observed', 'Deprecated protocol detected', 'Certificate mismatch']} value={['New cipher suites observed', 'Deprecated protocol detected']} onChange={() => {}} />
      </FormRow>
    </div>
  );
}

function EndpointConfig() {
  const [targets, setTargets] = useState<string[]>(['OS Certificate Store', 'JKS/PKCS12 Keystores', 'SSH authorized_keys']);
  return (
    <div className="space-y-3">
      <FormRow label="Agent groups" required><select className={selectCls}><option>production-agents</option><option>laptops-corp</option></select></FormRow>
      <FormRow label="Scan targets">
        <CheckGroup options={['OS Certificate Store', 'JKS/PKCS12 Keystores', 'SSH authorized_keys', 'PFX/P12 files', 'NSS databases', 'Browser stores (Chrome, Firefox)']} value={targets} onChange={setTargets} />
      </FormRow>
      <FormRow label="Recursion"><Toggle checked={true} onChange={() => {}} label="Recurse into subdirectories" /></FormRow>
      <FormRow label="Max file size (MB)"><input type="number" defaultValue={50} className="w-24 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" /></FormRow>
    </div>
  );
}

function SourceCodeConfig() {
  const [scope, setScope] = useState<'single' | 'org'>('org');
  const [scanFor, setScanFor] = useState<string[]>(['Certificates', 'Private Keys', 'API Secrets']);
  return (
    <div className="space-y-3">
      <FormRow label="SCM type" required>
        <select className={selectCls}>{['GitHub', 'GitLab', 'Bitbucket', 'Azure DevOps'].map(v => <option key={v}>{v}</option>)}</select>
      </FormRow>
      <FormRow label="Scan scope">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={scope === 'single'} onChange={() => setScope('single')} className="accent-teal" /> Single repo</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={scope === 'org'} onChange={() => setScope('org')} className="accent-teal" /> Org-level</label>
        </div>
      </FormRow>
      <FormRow label={scope === 'single' ? 'Repo URL' : 'Organization'} required>
        <input className={inputCls} placeholder={scope === 'single' ? 'https://github.com/org/repo' : 'org-name'} />
      </FormRow>
      <FormRow label="Branch">
        <select className={selectCls}><option>main</option><option>All branches</option><option>Specific branch…</option></select>
      </FormRow>
      <FormRow label="Scan for">
        <CheckGroup options={['Certificates', 'Private Keys', 'API Secrets', 'SSH Keys', 'IaC crypto references']} value={scanFor} onChange={setScanFor} />
      </FormRow>
      <FormRow label="File types"><input className={inputCls} defaultValue=".pem, .crt, .key, .p12, .jks, .tf, .yaml, .json, .env" /></FormRow>
    </div>
  );
}

function IaCConfig() {
  const [tools, setTools] = useState<string[]>(['Terraform', 'Helm']);
  return (
    <div className="space-y-3">
      <FormRow label="IaC tool"><CheckGroup options={['Terraform', 'Helm', 'Ansible', 'Pulumi', 'CloudFormation']} value={tools} onChange={setTools} /></FormRow>
      <FormRow label="Terraform state"><Toggle checked={true} onChange={() => {}} label="Scan Terraform state files" /></FormRow>
      <FormRow label="SBOM extraction"><Toggle checked={true} onChange={() => {}} label="Extract SBOM from build artifacts" /></FormRow>
      <FormRow label="SBOM format">
        <select className={selectCls}><option>CycloneDX</option><option>SPDX</option></select>
      </FormRow>
    </div>
  );
}

function VaultConfig() {
  const { setCurrentPage } = useNav();
  const { connections: savedConnections, byVaultType } = useConnections();
  const [vaultType, setVaultType] = useState('HashiCorp Vault');
  const [vaultAccountId, setVaultAccountId] = useState('');
  const [authMethod, setAuthMethod] = useState('AppRole');
  const [secretTypes, setSecretTypes] = useState<string[]>(['Certificates', 'API Keys', 'Encryption Keys']);
  const [testing, setTesting] = useState(false);

  const filteredConnections = useMemo(
    () => byVaultType(vaultType),
    [savedConnections, vaultType, byVaultType]
  );
  const selected = filteredConnections.find(c => c.id === vaultAccountId);

  const handleTestConnection = () => {
    if (!selected) {
      toast.error('Please select a vault account before testing.');
      return;
    }
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast.success('Connected successfully. Found 3 accessible mount paths: secret/, pki/, transit/.', {
        icon: <Check className="w-4 h-4 text-teal" />,
      });
    }, 1500);
  };

  return (
    <div className="space-y-3">
      <FormRow label="Vault type" required>
        <select value={vaultType} onChange={e => { setVaultType(e.target.value); setVaultAccountId(''); }} className={selectCls}>
          {['HashiCorp Vault', 'AWS Secrets Manager', 'Azure Key Vault', 'CyberArk Conjur', 'GCP Secret Manager', 'Delinea Secret Server'].map(v => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="Vault account" required>
        {filteredConnections.length > 0 ? (
          <select value={vaultAccountId} onChange={e => setVaultAccountId(e.target.value)} className={selectCls}>
            <option value="">Select a connection…</option>
            {filteredConnections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">
            No connections configured.{' '}
            <button type="button" onClick={() => setCurrentPage('integrations')} className="text-teal hover:underline">
              Set one up in Integrations →
            </button>
          </span>
        )}
      </FormRow>

      {selected && (
        <FormRow label="">
          <div className="flex-1 max-w-md bg-secondary/30 border border-border rounded-lg p-3 space-y-1">
            <div className="text-[14px] font-medium text-foreground">{selected.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {selected.vaultType} · <span className="font-mono">{selected.vaultUrl || '—'}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Namespace: <span className="font-mono">{selected.namespace || '—'}</span> · Auth: {selected.authMethod}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              Status:{' '}
              {selected.status === 'connected' ? (
                <span className="text-teal">● Connected</span>
              ) : (
                <span className="text-coral">● Disconnected</span>
              )}
              {' '}· Last verified: {formatRelativeTime(selected.lastVerified)}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('integrations')}
              className="text-[11px] text-teal hover:underline"
            >
              Edit connection →
            </button>
          </div>
        </FormRow>
      )}

      <FormRow label="Auth method" required>
        <select value={authMethod} onChange={e => setAuthMethod(e.target.value)} className={selectCls}><option>AppRole</option><option>AWS IAM Role</option><option>Azure MSI</option><option>API Key</option></select>
      </FormRow>
      <FormRow label="Secret types"><CheckGroup options={['Certificates', 'API Keys', 'Database Credentials', 'Encryption Keys', 'SSH Keys', 'Unclassified Secrets']} value={secretTypes} onChange={setSecretTypes} /></FormRow>
      <FormRow label="">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60"
        >
          {testing
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</>
            : <><Check className="w-3.5 h-3.5" /> Test connection</>}
        </button>
      </FormRow>
    </div>
  );
}

function HSMConfig() {
  const [keyTypes, setKeyTypes] = useState<string[]>(['RSA', 'ECC', 'AES']);
  return (
    <div className="space-y-3">
      <FormRow label="HSM type" required>
        <select className={selectCls}>{['Thales Luna Network HSM', 'Thales CipherTrust', 'AWS CloudHSM', 'Fortanix DSM', 'AWS KMS', 'Azure Managed HSM', 'Google Cloud HSM'].map(v => <option key={v}>{v}</option>)}</select>
      </FormRow>
      <FormRow label="Protocol">
        <select className={selectCls}><option>PKCS#11</option><option>KMIP 2.1</option><option>Vendor API</option></select>
      </FormRow>
      <FormRow label="HSM endpoint"><input className={`${inputCls} font-mono`} placeholder="hsm-prod.corp:9000 / partition / slot" /></FormRow>
      <FormRow label="Key types"><CheckGroup options={['RSA', 'ECC', 'AES', 'DES', 'All']} value={keyTypes} onChange={setKeyTypes} /></FormRow>
      <FormRow label="Metadata"><Toggle checked={true} onChange={() => {}} label="Include algorithm, key size, creation date, usage flags" /></FormRow>
    </div>
  );
}

function IAMConfig() {
  const [objects, setObjects] = useState<string[]>(['Service Accounts', 'OAuth Applications', 'API Tokens']);
  return (
    <div className="space-y-3">
      <FormRow label="Identity provider" required>
        <select className={selectCls}>{['Okta', 'Azure Active Directory', 'Google Workspace', 'SCIM 2.0 Endpoint', 'Ping Identity', 'Auth0'].map(v => <option key={v}>{v}</option>)}</select>
      </FormRow>
      <FormRow label="API endpoint"><input className={`${inputCls} font-mono`} placeholder="https://acmecorp.okta.com/api/v1" /></FormRow>
      <FormRow label="Auth"><select className={selectCls}><option>API Key</option><option>OAuth2 Client Credentials</option></select></FormRow>
      <FormRow label="Object types"><CheckGroup options={['Service Accounts', 'OAuth Applications', 'API Tokens', 'Managed Identities', 'SCIM-provisioned machine accounts']} value={objects} onChange={setObjects} /></FormRow>
      <FormRow label="UCO classification"><Toggle checked={true} onChange={() => {}} label="Auto-classify as UCO types (AGENT, TOKEN, etc.)" /></FormRow>
    </div>
  );
}

function AIAgentConfig() {
  const [frameworks, setFrameworks] = useState<string[]>(['LangChain', 'OpenAI Assistants API']);
  const [sources, setSources] = useState<string[]>(['OAuth2 OIDC logs', 'API key issuance events']);
  const [alerts, setAlerts] = useState<string[]>(['Unsponsored tokens', 'Over-privileged scopes']);
  return (
    <div className="space-y-3">
      <FormRow label="Frameworks"><CheckGroup options={['LangChain', 'AutoGPT', 'OpenAI Assistants API', 'Anthropic Claude', 'AWS Bedrock Agents', 'Azure OpenAI', 'Custom (webhook)']} value={frameworks} onChange={setFrameworks} /></FormRow>
      <FormRow label="Token sources"><CheckGroup options={['OAuth2 OIDC logs', 'API key issuance events', 'Secret manager audit logs']} value={sources} onChange={setSources} /></FormRow>
      <FormRow label="Alert on"><CheckGroup options={['Unsponsored tokens', 'Over-privileged scopes', 'Tokens unused >30d', 'Anomalous request velocity']} value={alerts} onChange={setAlerts} /></FormRow>
    </div>
  );
}

function CMDBConfig() {
  const [source, setSource] = useState('nessus');
  const [mapping, setMapping] = useState<'auto' | 'manual'>('auto');
  const sources = [
    { value: 'nessus', label: 'Tenable Nessus', kind: 'file' },
    { value: 'tenable-io', label: 'Tenable.io', kind: 'api' },
    { value: 'qualys', label: 'Qualys VMDR', kind: 'file' },
    { value: 'servicenow-cmdb', label: 'ServiceNow CMDB', kind: 'api' },
    { value: 'rapid7', label: 'Rapid7 InsightVM', kind: 'file' },
    { value: 'crowdstrike', label: 'CrowdStrike Falcon', kind: 'file' },
    { value: 'defender', label: 'Microsoft Defender for Endpoint', kind: 'file' },
    { value: 'orca', label: 'Orca Security', kind: 'api' },
    { value: 'wiz', label: 'Wiz', kind: 'api' },
    { value: 'custom-csv', label: 'Custom CSV / JSON', kind: 'file' },
  ];
  const current = sources.find(s => s.value === source)!;
  return (
    <div className="space-y-3">
      <FormRow label="Data source" required>
        <select value={source} onChange={e => setSource(e.target.value)} className={selectCls}>
          {sources.map(s => <option key={s.value} value={s.value}>{s.label} ({s.kind === 'api' ? 'API' : 'File upload'})</option>)}
        </select>
      </FormRow>

      {current.kind === 'api' ? (
        <>
          <FormRow label="API endpoint" required><input className={`${inputCls} font-mono`} placeholder="https://api.vendor.com" /></FormRow>
          <FormRow label="Auth"><select className={selectCls}><option>API Key</option><option>OAuth 2.0</option><option>Basic Auth</option></select></FormRow>
          <FormRow label="">
            <button onClick={() => toast.success('Connection test passed', { description: 'API reachable, auth valid' })}
              className="px-3 py-1.5 rounded border border-teal/40 text-teal text-xs hover:bg-teal/10">Test connection</button>
          </FormRow>
        </>
      ) : (
        <FormRow label="Upload file" required>
          <div className="flex-1 max-w-md">
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-teal/50 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">Drop CSV, XML, JSON, or .nessus file</p>
              <input type="file" className="hidden" accept=".csv,.xml,.json,.nessus" />
            </div>
          </div>
        </FormRow>
      )}

      <FormRow label="Field mapping">
        <select value={mapping} onChange={e => setMapping(e.target.value as any)} className={selectCls}>
          <option value="auto">Auto-detect (recommended)</option>
          <option value="manual">Manual mapping</option>
        </select>
      </FormRow>

      {mapping === 'manual' && (
        <FormRow label="">
          <div className="flex-1 max-w-2xl bg-muted/40 rounded border border-border p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Column mapper · first 3 rows preview</p>
            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              {[
                ['cn', 'Common Name'],
                ['serial', 'Serial Number'],
                ['expiry', 'Expiry Date'],
                ['issuer', 'Issuer (CA)'],
              ].map(([src, uco]) => (
                <React.Fragment key={src}>
                  <input defaultValue={src} className="px-2 py-1 bg-card border border-border rounded text-foreground font-mono" />
                  <select defaultValue={uco} className="px-2 py-1 bg-card border border-border rounded text-foreground">
                    <option>{uco}</option>
                    <option>Algorithm</option>
                    <option>Key Length</option>
                    <option>Owner</option>
                  </select>
                </React.Fragment>
              ))}
            </div>
            <div className="text-[9.5px] text-muted-foreground font-mono pt-2 border-t border-border">
              <div>example.com, 0x1A2B, 2026-03-15, Let's Encrypt</div>
              <div>api.acme.com, 0xFFEE, 2026-01-30, DigiCert</div>
              <div>vault.corp, 0x7788, 2026-06-01, MSCA</div>
            </div>
          </div>
        </FormRow>
      )}

      <FormRow label="Asset dedup">
        <select className={selectCls}><option>Match by CN + Serial</option><option>Match by Fingerprint</option><option>Match by IP + Port</option><option>No deduplication</option></select>
      </FormRow>
      <FormRow label="Post-import">
        <select className={selectCls}>
          <option>Do nothing</option>
          <option>Trigger posture recalculation</option>
          <option>Alert on new quantum-vulnerable findings</option>
          <option>All of the above</option>
        </select>
      </FormRow>
    </div>
  );
}

function CBOMConfig() {
  const [postActions, setPostActions] = useState<string[]>(['Add to unified inventory', 'Trigger PQC posture recalculation', 'Flag new quantum-vulnerable components in QTH queue']);
  const [showMapping, setShowMapping] = useState(false);
  const [importMethod, setImportMethod] = useState<'file' | 'api'>('file');
  return (
    <div className="space-y-3">
      <div className="bg-purple/5 border border-purple/30 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-purple-light flex-shrink-0 mt-0.5" />
        <p className="text-[10.5px] text-foreground leading-snug">
          CBOM import maps cryptographic component inventories from software composition analysis tools into the Trust unified identity schema.
          Quantum-vulnerable components are automatically flagged in the QTH migration queue.
        </p>
      </div>

      <FormRow label="CBOM source system" required>
        <select className={selectCls}>{['IBM Guardium Cryptography Manager', 'Fortanix Key Insight', 'Anchore Enterprise', 'Grype', 'Syft', 'CycloneDX CLI', 'Manual upload'].map(v => <option key={v}>{v}</option>)}</select>
      </FormRow>
      <FormRow label="CBOM format" required>
        <select className={selectCls}>{['CycloneDX 1.4', 'CycloneDX 1.5', 'CycloneDX 1.6', 'SPDX 2.3'].map(v => <option key={v}>{v}</option>)}</select>
      </FormRow>
      <FormRow label="Import method">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={importMethod === 'file'} onChange={() => setImportMethod('file')} className="accent-teal" /> File upload</label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={importMethod === 'api'} onChange={() => setImportMethod('api')} className="accent-teal" /> API pull</label>
        </div>
      </FormRow>

      {importMethod === 'file' ? (
        <FormRow label="Upload CBOM" required>
          <div className="flex-1 max-w-md">
            <div className="border-2 border-dashed border-purple/30 rounded-lg p-4 text-center hover:border-purple/60 transition-colors cursor-pointer bg-purple/5">
              <Upload className="w-6 h-6 mx-auto text-purple-light mb-1.5" />
              <p className="text-xs text-foreground">Drop CycloneDX or SPDX file</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Accepts .json, .xml, .cdx, .spdx</p>
              <input type="file" className="hidden" accept=".json,.xml,.cdx,.spdx" />
            </div>
          </div>
        </FormRow>
      ) : (
        <>
          <FormRow label="API endpoint" required><input className={`${inputCls} font-mono`} placeholder="https://guardium.corp/api/cbom/v2" /></FormRow>
          <FormRow label="API key" required><input type="password" className={inputCls} placeholder="••••••••" /></FormRow>
        </>
      )}

      <FormRow label="Component mapping">
        <button onClick={() => setShowMapping(s => !s)} className="text-xs text-teal flex items-center gap-1 hover:underline">
          <ChevronRight className={`w-3 h-3 transition-transform ${showMapping ? 'rotate-90' : ''}`} />
          {showMapping ? 'Hide' : 'Show'} mapping table
        </button>
      </FormRow>
      {showMapping && (
        <div className="ml-44 max-w-2xl bg-muted/40 rounded border border-border p-3 space-y-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Component type → UCO credential type</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <input defaultValue="cryptographic-asset:certificate" className="px-2 py-1 bg-card border border-border rounded text-foreground font-mono" />
              <select className="px-2 py-1 bg-card border border-border rounded text-foreground"><option>TLS Certificate</option><option>Code-Signing Certificate</option></select>
              <input defaultValue="cryptographic-asset:key" className="px-2 py-1 bg-card border border-border rounded text-foreground font-mono" />
              <select className="px-2 py-1 bg-card border border-border rounded text-foreground"><option>Encryption Key</option><option>SSH Key</option></select>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Algorithm strings → UCO algorithm enum</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <input defaultValue="RSA" className="px-2 py-1 bg-card border border-border rounded text-foreground font-mono" />
              <select className="px-2 py-1 bg-card border border-border rounded text-foreground"><option>RSA-2048</option></select>
              <input defaultValue="EC" className="px-2 py-1 bg-card border border-border rounded text-foreground font-mono" />
              <select className="px-2 py-1 bg-card border border-border rounded text-foreground"><option>ECDSA P-256</option></select>
              <input defaultValue="ML-KEM" className="px-2 py-1 bg-card border border-border rounded text-foreground font-mono" />
              <select className="px-2 py-1 bg-card border border-border rounded text-foreground"><option>ML-KEM-768</option></select>
            </div>
          </div>
        </div>
      )}

      <FormRow label="Post-import actions">
        <CheckGroup
          options={['Add to unified inventory', 'Trigger PQC posture recalculation', 'Flag new quantum-vulnerable components in QTH queue', 'Generate import summary report']}
          value={postActions} onChange={setPostActions} />
      </FormRow>
    </div>
  );
}

// ============================================================================
// TAB 3 — RUNS
// ============================================================================
function RunsTab() {
  const [runDetailId, setRunDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('30d');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filtered = useMemo(() => {
    return discoveryRuns.filter(r => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      return true;
    });
  }, [statusFilter, dateFilter, categoryFilter]);

  const selectedRun = discoveryRuns.find(r => r.id === runDetailId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          <option>All categories</option>
          {scanCategories.map(c => <option key={c.category}>{c.category}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          {['All', 'Running', 'Complete', 'Failed', 'Warning'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="custom">Custom range</option>
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} runs</span>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr className="border-b border-border">
              {['Run ID', 'Profile / Type', 'Started By', 'Start Time', 'Duration', 'Discovered', 'Δ vs Previous', 'Credential Types', 'Errors', 'Status'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((run, i) => {
              // Mock delta — alternate green/amber/grey
              const delta = (i * 137) % 7 - 3;
              const deltaCls = delta > 0 ? 'text-teal' : delta < 0 ? 'text-amber' : 'text-muted-foreground';
              const deltaSign = delta > 0 ? '+' : '';
              return (
                <tr key={run.id} className="border-b border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setRunDetailId(run.id)}>
                  <td className="py-2 px-3 font-mono text-[10px]">{run.id}</td>
                  <td className="py-2 px-3">{run.profile}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.startedBy}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.startTime}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.duration}</td>
                  <td className="py-2 px-3 font-medium tabular-nums">{run.assetsDiscovered.toLocaleString()}</td>
                  <td className={`py-2 px-3 tabular-nums ${deltaCls}`}>{delta === 0 ? '—' : `${deltaSign}${delta * 23}`}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {['TLS', 'SSH', 'SEC', 'TKN'].slice(0, ((i % 4) + 1)).map(t => (
                        <span key={t} className="text-[8.5px] px-1 py-0.5 rounded bg-teal/10 text-teal">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3">{run.errors > 0 ? <span className="text-coral">{run.errors}</span> : '0'}</td>
                  <td className="py-2 px-3"><StatusBadge status={run.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!runDetailId} onClose={() => setRunDetailId(null)} title={`Run Detail — ${selectedRun?.id || ''}`} wide>
        {selectedRun && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Assets Discovered', value: selectedRun.assetsDiscovered.toLocaleString() },
                { label: 'New Assets', value: selectedRun.newAssets.toString() },
                { label: 'Changed', value: selectedRun.changedAssets.toString() },
                { label: 'Errors', value: selectedRun.errors.toString() },
              ].map(s => (
                <div key={s.label} className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Breakdown by credential type</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'TLS Certs', value: Math.floor(selectedRun.assetsDiscovered * 0.6).toLocaleString() },
                  { label: 'SSH Keys', value: Math.floor(selectedRun.assetsDiscovered * 0.18).toLocaleString() },
                  { label: 'Secrets', value: Math.floor(selectedRun.assetsDiscovered * 0.15).toLocaleString() },
                  { label: 'Tokens', value: Math.floor(selectedRun.assetsDiscovered * 0.07).toLocaleString() },
                ].map(c => (
                  <div key={c.label} className="bg-card border border-border rounded p-2 text-center">
                    <p className="text-xs font-semibold tabular-nums">{c.value}</p>
                    <p className="text-[9.5px] text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {selectedRun.errors > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Top errors</p>
                <div className="space-y-1">
                  {[
                    { target: '10.0.42.18:443', error: 'Connection timeout after 30s' },
                    { target: '10.0.42.21:443', error: 'TLS handshake failed' },
                    { target: 'api.partner.io', error: 'Hostname does not resolve' },
                  ].slice(0, Math.min(3, selectedRun.errors)).map((e, i) => (
                    <div key={i} className="text-[10.5px] bg-coral/5 border border-coral/20 rounded px-2 py-1 flex justify-between">
                      <span className="font-mono text-foreground">{e.target}</span>
                      <span className="text-coral">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button onClick={() => toast.success('Export queued — CSV ready in ~10s')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light">
                <FileDown className="w-3 h-3" /> Export Results as CSV
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================================
// SHARED
// ============================================================================
function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <label className="text-xs text-muted-foreground w-40 text-right pt-2 flex items-center justify-end gap-1 flex-shrink-0">
        {required && <span className="text-coral">*</span>} {label}
      </label>
      {children}
    </div>
  );
}
