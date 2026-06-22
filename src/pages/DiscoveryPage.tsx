import React, { useState, useMemo, useEffect } from 'react';
import { StatusBadge } from '@/components/shared/UIComponents';
import { useNav } from '@/context/NavigationContext';
import { useIntegrations } from '@/context/IntegrationsContext';
import { useConnections, formatRelativeTime } from '@/context/ConnectionsContext';
import {
  useProfiles, useRuns, formatRelative, formatRelativeFuture,
  formatDuration, formatSchedule, computeNextRun, DiscoveryProfile,
} from '@/context/DiscoveryContext';
import { toast } from 'sonner';
import {
  Search, RefreshCw, Plus, Play, Database, Radar, ShieldCheck, Cloud, Lock,
  Activity, Copy, Edit, Calendar, Filter, X, Check, AlertCircle, AlertTriangle, ArrowLeft,
} from 'lucide-react';

// ============================================================================
// FINALIZED DISCOVERY METHODS (Unified Discovery Framework, MVP scope)
// One scan method per category. Content matches the locked PLT requirements.
// ============================================================================
type ConfigKey = 'network' | 'sshauth' | 'ca' | 'cloud' | 'secrets' | 'thirdparty';

interface ScanType { value: string; description: string; config: ConfigKey; discovers: string[]; }
interface ScanCategory { category: string; icon: React.ComponentType<{ className?: string }>; description: string; types: ScanType[]; }

const scanCategories: ScanCategory[] = [
  {
    category: 'Active Scanning', icon: Radar,
    description: 'Network discovery via protocol handshakes and authenticated SSH scan',
    types: [{
      value: 'Network Scan', config: 'network',
      description: 'Agentless probing of IP and DNS targets. Discovers TLS, SSH, IPsec/VPN and Kubernetes endpoints across the configured ports.',
      discovers: ['TLS Certificates', 'Cipher Suites', 'Protocol Versions', 'SSH Host Keys', 'IPsec/VPN'],
    }, {
      value: 'SSH Keys & Certificate Scan', config: 'sshauth',
      description: 'Authenticated SSH scan. Logs into hosts to discover and onboard user and host keys and host certificates into inventory with compliance policy.',
      discovers: ['SSH User Keys', 'SSH Host Keys', 'Host Certificates', 'Compliance Mapping'],
    }],
  },
  {
    category: 'CA & PKI', icon: ShieldCheck,
    description: 'Pull issued certificate inventory directly from the configured CA',
    types: [{
      value: 'CA Scan', config: 'ca',
      description: 'Pulls issued certificate inventory from GlobalSign Atlas: issued and revoked status and chain of trust.',
      discovers: ['Issued Certificates', 'Revocation Status', 'Chain of Trust'],
    }],
  },
  {
    category: 'Cloud', icon: Cloud,
    description: 'Crypto posture across AWS and Azure accounts',
    types: [{
      value: 'Cloud Crypto Posture Scan', config: 'cloud',
      description: 'Crypto posture across AWS and Azure: keys, certificates, transit and at-rest posture, and credential hygiene.',
      discovers: ['KMS Keys', 'Cloud Certificates', 'Transit / At-rest', 'Credential Hygiene'],
    }],
  },
  {
    category: 'Secrets & Key Stores', icon: Lock,
    description: 'Metadata-only enumeration from vaults, HSMs and secret stores',
    types: [{
      value: 'Secrets & Key Store Discovery', config: 'secrets',
      description: 'Metadata-only enumeration of certificates, keys, secrets and credentials in vaults, HSMs and secret stores.',
      discovers: ['Certificates', 'Keys', 'Secrets', 'Credentials'],
    }],
  },
  {
    category: 'Third-Party & Imported', icon: Database,
    description: 'Import vulnerability scan reports and CBOM',
    types: [{
      value: 'Third-Party Findings Ingestion', config: 'thirdparty',
      description: 'Imports vulnerability scan reports (Qualys, Tenable) and CBOM (third-party CycloneDX 1.6 and QTH).',
      discovers: ['Vulnerability Findings', 'CBOM Components'],
    }],
  },
];

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function DiscoveryPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [tab, setTab] = useState<'profiles' | 'runs'>('profiles');
  const [editingProfile, setEditingProfile] = useState<DiscoveryProfile | null>(null);

  const openCreate = (p: DiscoveryProfile | null) => { setEditingProfile(p); setView('create'); };
  const backToList = () => { setView('list'); setEditingProfile(null); };
  const finishTo = (dest: 'profiles' | 'runs') => { setView('list'); setEditingProfile(null); setTab(dest); };

  // New Scan surface (in-page view swap, not an overlay)
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={backToList} aria-label="Back to Discovery"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{editingProfile ? 'Edit Discovery' : 'Start Discovery'}</h1>
            <p className="text-[11px] text-muted-foreground">
              {editingProfile
                ? <>Editing <span className="text-foreground">{editingProfile.name}</span> · changes apply on save</>
                : 'Select a method, add the details, choose what to run against, and run.'}
            </p>
          </div>
        </div>
        <NewScanTab existing={editingProfile} onDone={finishTo} onCancel={backToList} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Discovery</h1>
          <p className="text-[11px] text-muted-foreground">Profiles · Scans · Runs · Unified Discovery Framework</p>
        </div>
        <button onClick={() => openCreate(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light">
          <Play className="w-3.5 h-3.5" /> Start Discovery
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['profiles', 'Profiles'], ['runs', 'Discovery Runs']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <ProfilesTab onEdit={(p) => openCreate(p)} onNew={() => openCreate(null)} />}
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
  const { latestRunForProfile, addRun, updateRun } = useRuns();

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.includes.some(t => t.toLowerCase().includes(search.toLowerCase())),
  );

  const runProfileNow = (p: DiscoveryProfile) => {
    const run = addRun({
      profileId: p.id, profileName: p.name, connectionId: p.connectionId, connectionName: p.connectionName,
      vaultType: p.vaultType, category: p.category, includes: p.includes, triggeredBy: 'manual',
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
        <button onClick={onNew} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light">
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search profiles by name, category, scan type…"
            className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
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
                    <td className="px-3 py-2"><span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground whitespace-nowrap">{p.category}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {visibleIncludes.map(t => <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded bg-teal/10 text-teal border border-teal/20 whitespace-nowrap">{t}</span>)}
                        {moreCount > 0 && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground whitespace-nowrap">+{moreCount} more</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap"><span className="inline-flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatSchedule(p.schedule)}</span></td>
                    <td className="px-3 py-2 text-right text-foreground tabular-nums font-medium">{latest?.itemsDiscovered != null && latest.status === 'completed' ? latest.itemsDiscovered.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatRelative(latest?.startedAt ?? p.lastRunAt)}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatRelativeFuture(p.nextRunAt)}</td>
                    <td className="px-3 py-2"><StatusBadge status={statusLabel} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => runProfileNow(p)} className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded bg-teal text-primary-foreground hover:bg-teal-light"><Play className="w-2.5 h-2.5" /> Run</button>
                        <button onClick={() => onEdit(p)} className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"><Edit className="w-2.5 h-2.5" /> Edit</button>
                        <button onClick={() => toast.success(`Cloned "${p.name}"`)} className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"><Copy className="w-2.5 h-2.5" /> Clone</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No profiles match your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <button onClick={onNew} className="w-full border-t border-dashed border-border hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5 py-3 text-muted-foreground hover:text-teal">
          <Plus className="w-4 h-4" /><span className="text-xs font-medium">New Profile</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2 — NEW SCAN
// ============================================================================
function NewScanTab({ existing, onDone, onCancel }: { existing: DiscoveryProfile | null; onDone: (dest: 'profiles' | 'runs') => void; onCancel: () => void }) {
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

  // Lifted secrets state — used when category is "Secrets & Key Stores"
  const { byVaultType } = useConnections();
  const [vaultType, setVaultType] = useState(existing?.vaultType || 'HashiCorp Vault');
  const [vaultAccountId, setVaultAccountId] = useState(existing?.connectionId ?? '');
  const [authMethod, setAuthMethod] = useState('AppRole');
  const [secretTypes, setSecretTypes] = useState<string[]>(existing?.includes ?? ['Certificates', 'Encryption Keys']);

  const { addProfile, updateProfile } = useProfiles();
  const { addRun, updateRun } = useRuns();

  const currentCategory = scanCategories.find(c => c.category === activeCategory)!;
  const isEditing = existing != null;
  const isSecretsScan = selectedType.config === 'secrets';

  const resetForm = () => {
    setDiscoveryName(''); setDescription(''); setSaveAsProfile(false); setProfileName('');
    setRunType('on-demand'); setVaultAccountId(''); setSecretTypes(['Certificates', 'Encryption Keys']);
  };

  const buildScheduleObj = () =>
    runType === 'schedule'
      ? { freq: scheduleFreq, time: scheduleTime, ...(scheduleFreq === 'Weekly' ? { day: scheduleDay } : {}) }
      : null;

  const resolveConnection = () => {
    if (isSecretsScan) {
      const conn = byVaultType(vaultType).find(c => c.id === vaultAccountId);
      if (!conn) return null;
      return { connectionId: conn.id, connectionName: conn.name, resolvedVaultType: conn.vaultType, includes: secretTypes };
    }
    return { connectionId: `inline_${selectedType.config}`, connectionName: selectedType.value, resolvedVaultType: selectedType.value, includes: selectedType.discovers };
  };

  const handleStart = () => {
    if (!discoveryName.trim()) { toast.error('Discovery name is required'); return; }
    if (saveAsProfile && !profileName.trim()) { toast.error('Profile name is required'); return; }
    const resolved = resolveConnection();
    if (!resolved) { toast.error('Please select a connection before starting.'); return; }
    const { connectionId, connectionName, resolvedVaultType, includes } = resolved;
    const schedule = buildScheduleObj();
    let profileId: string | null = null;
    let savedProfileName: string | null = null;
    if (saveAsProfile) {
      const prof = addProfile({
        name: profileName.trim(), description, connectionId, connectionName, vaultType: resolvedVaultType,
        category: activeCategory, includes, scanScope: { scanType: selectedType.value, authMethod },
        schedule, nextRunAt: computeNextRun(schedule),
      });
      profileId = prof.id; savedProfileName = prof.name;
    }
    const run = addRun({ profileId, profileName: savedProfileName, connectionId, connectionName, vaultType: resolvedVaultType, category: activeCategory, includes, triggeredBy: 'manual' });
    setTimeout(() => {
      const items = 50 + Math.floor(Math.random() * 451);
      updateRun(run.id, { status: 'completed', completedAt: Date.now(), itemsDiscovered: items });
    }, 2000);
    toast.success('Discovery started. View progress in Discovery Runs.');
    resetForm(); onDone('runs');
  };

  const handleSaveOnly = () => {
    if (!profileName.trim()) { toast.error('Profile name is required'); return; }
    const resolved = resolveConnection();
    if (!resolved) { toast.error('Please select a connection before saving.'); return; }
    const { connectionId, connectionName, resolvedVaultType, includes } = resolved;
    const schedule = buildScheduleObj();
    addProfile({
      name: profileName.trim(), description, connectionId, connectionName, vaultType: resolvedVaultType,
      category: activeCategory, includes, scanScope: { scanType: selectedType.value, authMethod },
      schedule, nextRunAt: computeNextRun(schedule),
    });
    toast.success(`Profile "${profileName}" saved`);
    resetForm(); onDone('profiles');
  };

  const handleUpdate = () => {
    if (!existing) return;
    if (!discoveryName.trim()) { toast.error('Profile name is required'); return; }
    const schedule = buildScheduleObj();
    updateProfile(existing.id, {
      name: discoveryName.trim(), description, schedule, nextRunAt: computeNextRun(schedule),
      includes: isSecretsScan ? secretTypes : existing.includes,
    });
    toast.success(`Profile "${discoveryName}" updated`, { description: 'Changes saved successfully' });
    onDone('profiles');
  };

  return (
    <div className="space-y-4">
      {/* Method selector */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-secondary/30"><p className="text-[11px] font-semibold text-foreground">Select discovery method</p></div>
        <div className="grid grid-cols-12 min-h-[260px]">
          <div className="col-span-4 lg:col-span-3 border-r border-border bg-secondary/20">
            {scanCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.category;
              return (
                <button key={cat.category} onClick={() => { setActiveCategory(cat.category); setSelectedType(cat.types[0]); }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-l-2 transition-colors ${isActive ? 'border-l-teal bg-card' : 'border-l-transparent hover:bg-secondary/40'}`}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-teal' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className={`text-[11px] font-medium leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{cat.category}</p>
                    <p className="text-[9px] text-muted-foreground/70 leading-snug mt-0.5 line-clamp-2">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="col-span-8 lg:col-span-9 p-3 space-y-1.5 overflow-y-auto">
            {currentCategory.types.map(type => {
              const isSelected = selectedType.value === type.value;
              return (
                <button key={type.value} onClick={() => setSelectedType(type)}
                  className={`w-full text-left rounded-md px-3 py-2.5 border transition-all ${isSelected ? 'border-teal bg-teal/5 ring-1 ring-teal/30' : 'border-border bg-secondary/20 hover:bg-secondary/40'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[12px] font-semibold text-foreground">{type.value}</p>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-snug mb-1.5">{type.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {type.discovers.map(d => <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">{d}</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Config panel */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-teal">{selectedType.value} configuration</h2>
        <ConfigPanel configKey={selectedType.config}
          secretsProps={{ vaultType, setVaultType, vaultAccountId, setVaultAccountId, authMethod, setAuthMethod, secretTypes, setSecretTypes }} />
      </div>

      {/* Discovery details */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-teal">Discovery details</h2>
        <FormRow label="Discovery name" required>
          <input value={discoveryName} onChange={e => setDiscoveryName(e.target.value)} placeholder="e.g. Production network sweep — week 14"
            className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </FormRow>
        <FormRow label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional"
            className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
        </FormRow>
        <FormRow label="Run type">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={runType === 'on-demand'} onChange={() => setRunType('on-demand')} className="accent-teal" /> On-demand</label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={runType === 'schedule'} onChange={() => setRunType('schedule')} className="accent-teal" /> Scheduled</label>
          </div>
        </FormRow>
        {runType === 'schedule' && (
          <div className="ml-44 grid grid-cols-3 gap-2 max-w-md">
            <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)} className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground">
              {['Every 6 hours', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
            </select>
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground" />
            {scheduleFreq === 'Weekly' && (
              <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)} className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
              </select>
            )}
          </div>
        )}
        <FormRow label="Save as profile">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={saveAsProfile} onChange={e => setSaveAsProfile(e.target.checked)} className="accent-teal" /> Reuse this configuration in future runs</label>
        </FormRow>
        {saveAsProfile && (
          <FormRow label="Profile name" required>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. Production TLS Sweep"
              className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </FormRow>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 -mx-1 px-1 border-t border-border">
        {isEditing ? (
          <>
            <button onClick={handleUpdate} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light"><Check className="w-3.5 h-3.5" /> Save Changes</button>
            <button onClick={handleStart} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/10"><Play className="w-3.5 h-3.5" /> Save & Run Now</button>
          </>
        ) : (
          <>
            <button onClick={handleStart} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light"><Play className="w-3.5 h-3.5" /> Start Discovery</button>
            {saveAsProfile && <button onClick={handleSaveOnly} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/10">Save Profile Only</button>}
          </>
        )}
        <button onClick={resetForm} className="px-5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary">Reset</button>
        <button onClick={onCancel} className="ml-auto px-5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG PANELS — one per finalized method
// ============================================================================
interface SecretsProps {
  vaultType: string; setVaultType: (v: string) => void;
  vaultAccountId: string; setVaultAccountId: (v: string) => void;
  authMethod: string; setAuthMethod: (v: string) => void;
  secretTypes: string[]; setSecretTypes: (v: string[]) => void;
}

function ConfigPanel({ configKey, secretsProps }: { configKey: ConfigKey; secretsProps: SecretsProps }) {
  switch (configKey) {
    case 'network':    return <NetworkConfig />;
    case 'sshauth':    return <SSHAuthConfig />;
    case 'ca':         return <CAConfig />;
    case 'cloud':      return <CloudConfig />;
    case 'secrets':    return <SecretsConfig {...secretsProps} />;
    case 'thirdparty': return <ThirdPartyConfig />;
    default: return null;
  }
}

const inputCls = 'flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal';
const selectCls = inputCls;
const textareaCls = `${inputCls} font-mono resize-none`;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-teal" />{label}</label>;
}

function CheckGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={value.includes(opt)} onChange={e => onChange(e.target.checked ? [...value, opt] : value.filter(v => v !== opt))} className="accent-teal" />{opt}
        </label>
      ))}
    </div>
  );
}

function Advisory({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-[11px] text-amber leading-snug">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{children}</span>
    </div>
  );
}

const DEFAULT_PORTS = '443, 8443, 22, 636, 993, 995, 3389, 500, 4500, 6443';
const PORT_PRESETS = ['443', '8443', '22', '636', '993', '995', '3389', '500', '4500', '6443'];

function NetworkConfig() {
  const [targets, setTargets] = useState('');
  const [excludes, setExcludes] = useState('');
  const [ports, setPorts] = useState(DEFAULT_PORTS);
  const [depth, setDepth] = useState<'Quick' | 'Deep' | 'Full'>('Deep');

  const ipOnly = targets.trim().length > 0 && !/[a-zA-Z]/.test(targets);
  const broad = depth === 'Full' && ports.split(',').filter(Boolean).length > 6;

  return (
    <div className="space-y-3">
      <FormRow label="Targets (IP, CIDR, FQDN)" required>
        <textarea value={targets} onChange={e => setTargets(e.target.value)} rows={3} placeholder={'10.0.0.0/16\napp.corp.io\n192.168.1.10'} className={textareaCls} />
      </FormRow>
      <FormRow label="Exclude IPs">
        <input value={excludes} onChange={e => setExcludes(e.target.value)} placeholder="10.0.5.0/24" className={inputCls} />
      </FormRow>
      <FormRow label="Ports" required>
        <div className="flex-1 max-w-md space-y-1.5">
          <input value={ports} onChange={e => setPorts(e.target.value)} className={inputCls.replace('max-w-md', 'w-full')} />
          <div className="flex gap-1 flex-wrap">
            {PORT_PRESETS.map(p => (
              <button key={p} onClick={() => setPorts(prev => prev.includes(p) ? prev : prev ? `${prev}, ${p}` : p)}
                className="px-2 py-0.5 text-[10px] rounded bg-muted border border-border hover:bg-secondary text-muted-foreground">+{p}</button>
            ))}
          </div>
        </div>
      </FormRow>
      <FormRow label="Scan depth">
        <div className="flex gap-1.5">
          {(['Quick', 'Deep', 'Full'] as const).map(d => (
            <button key={d} onClick={() => setDepth(d)}
              className={`px-3 py-1.5 rounded text-xs border ${depth === d ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{d}</button>
          ))}
          <span className="self-center text-[10px] text-muted-foreground ml-1">
            {depth === 'Quick' ? 'Handshake only' : depth === 'Deep' ? 'Served chain + full cipher list' : 'Deep + revocation (CRL primary)'}
          </span>
        </div>
      </FormRow>
      <p className="text-[10px] text-muted-foreground ml-44">Discovers TLS, SSH, IPsec/VPN and Kubernetes endpoints. SSH enumerates all host key types; the IKEv2 gateway certificate is not retrievable unauthenticated.</p>
      {ipOnly && <div className="ml-44 max-w-md"><Advisory>IP-only targeting can miss SNI-served certificates. Add FQDN targets for complete TLS discovery; reduced coverage is not confirmed absence.</Advisory></div>}
      {broad && <div className="ml-44 max-w-md"><Advisory>Full depth across a broad port list multiplies handshakes and revocation lookups per endpoint and will take longer.</Advisory></div>}
    </div>
  );
}

function CAConfig() {
  const { byType } = useIntegrations();
  const { setCurrentPage } = useNav();
  const caIntegrations = byType('CA');
  const [caAccount, setCaAccount] = useState(caIntegrations[0]?.account ?? '');
  const [mode, setMode] = useState<'Optimized' | 'Aggressive'>('Optimized');
  const [status, setStatus] = useState('Issued + Revoked');

  return (
    <div className="space-y-3">
      <FormRow label="CA provider" required>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground px-3 py-2 bg-muted border border-border rounded">GlobalSign Atlas</span>
          <span className="text-[10px] text-muted-foreground">mTLS + API key/secret · the only CA in MVP scope</span>
        </div>
      </FormRow>
      <FormRow label="CA instance" required>
        {caIntegrations.length > 0 ? (
          <select value={caAccount} onChange={e => setCaAccount(e.target.value)} className={selectCls}>
            {caIntegrations.map(i => <option key={i.account} value={i.account}>{i.account} ({i.name})</option>)}
          </select>
        ) : (
          <button onClick={() => setCurrentPage('integrations')} className="flex items-center gap-1.5 text-xs text-amber hover:underline">
            <AlertCircle className="w-3.5 h-3.5" /> No GlobalSign connector configured — Go to Integrations →
          </button>
        )}
      </FormRow>
      <FormRow label="Scan mode">
        <div className="flex gap-1.5">
          {(['Optimized', 'Aggressive'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded text-xs border ${mode === m ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{m}</button>
          ))}
        </div>
      </FormRow>
      <FormRow label="Status scope">
        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
          {['Issued + Revoked', 'Issued only', 'Revoked only'].map(s => <option key={s}>{s}</option>)}
        </select>
      </FormRow>
      <p className="text-[10px] text-muted-foreground ml-44">Revoked and expired certificates are requested explicitly. Reconciliation with Network Scan is by certificate fingerprint; CA findings carry no deployment locus.</p>
      {mode === 'Aggressive' && <div className="ml-44 max-w-md"><Advisory>Aggressive performs a full pull each run and is slower. Optimized captures status changes via the Atlas cursor and is recommended for routine schedules.</Advisory></div>}
    </div>
  );
}

function CloudConfig() {
  const [vendor, setVendor] = useState<'AWS' | 'Azure'>('AWS');
  const [accounts, setAccounts] = useState<string[]>(['']);
  const [domains, setDomains] = useState<string[]>(['Certificate Posture', 'Key Management Posture']);
  const [region, setRegion] = useState('');
  const [tag, setTag] = useState('');
  const [sequential, setSequential] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ label: string; ok: boolean }[] | null>(null);

  const runTest = () => {
    setTesting(true); setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult(domains.map((d, i) => ({ label: d, ok: i % 3 !== 2 })));
    }, 1200);
  };

  const broad = domains.length >= 3 && !region.trim();

  return (
    <div className="space-y-3">
      <FormRow label="Vendor" required>
        <div className="flex gap-1.5">
          {(['AWS', 'Azure'] as const).map(v => (
            <button key={v} onClick={() => { setVendor(v); setTestResult(null); }} className={`px-3 py-1.5 rounded text-xs border ${vendor === v ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{v}</button>
          ))}
        </div>
      </FormRow>
      <FormRow label="Posture domains">
        <CheckGroup options={['Certificate Posture', 'Key Management Posture', 'Transit Encryption', 'At-rest Encryption', 'IAM Credential Hygiene']} value={domains} onChange={setDomains} />
      </FormRow>
      <FormRow label={vendor === 'AWS' ? 'Accounts' : 'Subscriptions'}>
        <div className="flex-1 max-w-md space-y-1.5">
          {accounts.map((a, i) => (
            <div key={i} className="flex gap-1">
              <input value={a} onChange={e => { const n = [...accounts]; n[i] = e.target.value; setAccounts(n); }}
                placeholder={vendor === 'AWS' ? '123456789012' : 'subscription-id'} className={inputCls.replace('max-w-md', 'w-full')} />
              {accounts.length > 1 && <button onClick={() => setAccounts(accounts.filter((_, j) => j !== i))} className="px-2 text-muted-foreground hover:text-coral"><X className="w-3.5 h-3.5" /></button>}
            </div>
          ))}
          <button onClick={() => setAccounts([...accounts, ''])} className="text-[11px] text-teal flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add {vendor === 'AWS' ? 'account' : 'subscription'}</button>
        </div>
      </FormRow>
      <FormRow label="Region filter">
        <input value={region} onChange={e => setRegion(e.target.value)} placeholder={vendor === 'AWS' ? 'us-east-1, eu-west-2 (optional)' : 'eastus, westeurope (optional)'} className={inputCls} />
      </FormRow>
      <FormRow label="Resource tag filter"><input value={tag} onChange={e => setTag(e.target.value)} placeholder="env=prod (optional)" className={inputCls} /></FormRow>
      <FormRow label="Execution"><Toggle checked={sequential} onChange={setSequential} label="Execute batches sequentially" /></FormRow>
      {vendor === 'AWS' && <p className="text-[10px] text-muted-foreground ml-44">AWS is enumerated per enabled region, with a us-east-1 pass for CloudFront and edge certificates.</p>}
      {vendor === 'Azure' && <p className="text-[10px] text-muted-foreground ml-44">Azure Key Vault and Managed HSM enumeration needs data-plane access, separate from an ARM Reader role.</p>}
      <FormRow label="">
        <button onClick={runTest} disabled={testing} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
          {testing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</> : <><Check className="w-3.5 h-3.5" /> Test connection</>}
        </button>
      </FormRow>
      {testResult && (
        <div className="ml-44 max-w-md space-y-1">
          <p className="text-[10.5px] text-muted-foreground">Reachable posture domains under this account's data-plane access:</p>
          {testResult.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-[11.5px]">
              {r.ok ? <Check className="w-3.5 h-3.5 text-teal" /> : <X className="w-3.5 h-3.5 text-amber" />}
              <span className={r.ok ? 'text-foreground' : 'text-amber'}>{r.label}{!r.ok && ' — not accessible (partial visibility)'}</span>
            </div>
          ))}
        </div>
      )}
      {broad && <div className="ml-44 max-w-md"><Advisory>Several posture domains without a region filter will enumerate every enabled region and can be slow.</Advisory></div>}
    </div>
  );
}

function SecretsConfig({ vaultType, setVaultType, vaultAccountId, setVaultAccountId, authMethod, setAuthMethod, secretTypes, setSecretTypes }: SecretsProps) {
  const { setCurrentPage } = useNav();
  const { connections, byVaultType } = useConnections();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ label: string; ok: boolean }[] | null>(null);

  const PROVIDERS = ['HashiCorp Vault', 'CyberArk Conjur', 'Crypto4A HSM', 'Utimaco HSM', 'AWS Secrets Manager', 'Azure Key Vault'];
  const PENDING = ['AWS Secrets Manager', 'Azure Key Vault'];
  const isPending = PENDING.includes(vaultType);
  const isHsm = /HSM/.test(vaultType);

  const filtered = useMemo(() => byVaultType(vaultType), [connections, vaultType, byVaultType]);
  const selected = filtered.find(c => c.id === vaultAccountId);

  const runTest = () => {
    if (!selected) { toast.error('Please select a connection before testing.'); return; }
    setTesting(true); setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult(secretTypes.map((t, i) => ({ label: t, ok: i !== 1 })));
    }, 1300);
  };

  return (
    <div className="space-y-3">
      <FormRow label="Provider" required>
        <select value={vaultType} onChange={e => { setVaultType(e.target.value); setVaultAccountId(''); setTestResult(null); }} className={selectCls}>
          {PROVIDERS.map(v => <option key={v}>{v}{PENDING.includes(v) ? ' (integration pending)' : ''}</option>)}
        </select>
      </FormRow>
      {isPending && (
        <div className="ml-44 max-w-md"><Advisory>Secret stores are in scope as a crypto object, but this integration is pending. Enumeration activates once the connector is added.</Advisory></div>
      )}
      {!isPending && (
        <FormRow label="Connection" required>
          {filtered.length > 0 ? (
            <select value={vaultAccountId} onChange={e => { setVaultAccountId(e.target.value); setTestResult(null); }} className={selectCls}>
              <option value="">Select a connection…</option>
              {filtered.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <span className="text-xs text-muted-foreground">No connections configured.{' '}
              <button type="button" onClick={() => setCurrentPage('integrations')} className="text-teal hover:underline">Set one up in Integrations →</button>
            </span>
          )}
        </FormRow>
      )}
      {selected && (
        <FormRow label="">
          <div className="flex-1 max-w-md bg-secondary/30 border border-border rounded-lg p-3 space-y-1">
            <div className="text-[13px] font-medium text-foreground">{selected.name}</div>
            <div className="text-[11px] text-muted-foreground">{selected.vaultType} · <span className="font-mono">{selected.vaultUrl || '—'}</span></div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">Status:{' '}{selected.status === 'connected' ? <span className="text-teal">● Connected</span> : <span className="text-coral">● Disconnected</span>}{' '}· Last verified: {formatRelativeTime(selected.lastVerified)}</div>
          </div>
        </FormRow>
      )}
      <FormRow label="Auth method" required>
        <select value={authMethod} onChange={e => setAuthMethod(e.target.value)} className={selectCls}>
          {(isHsm ? ['PKCS#11 session', 'Vendor API'] : vaultType === 'CyberArk Conjur' ? ['API Key', 'OAuth'] : ['AppRole', 'Token', 'AWS IAM Auth', 'Kubernetes Auth']).map(a => <option key={a}>{a}</option>)}
        </select>
      </FormRow>
      <FormRow label="Secret types">
        <CheckGroup options={['Certificates', 'Encryption Keys', 'API Keys', 'SSH Keys', 'Database Credentials', 'Unclassified Secrets']} value={secretTypes} onChange={setSecretTypes} />
      </FormRow>
      <FormRow label="Path scoping"><input placeholder={isHsm ? 'partition-1, partition-2 (optional)' : 'secret/data/prod/* (optional)'} className={inputCls} /></FormRow>
      <p className="text-[10px] text-muted-foreground ml-44">Metadata only; secret values are never extracted. A path that is listable but not readable is reported as partial visibility.{isHsm ? ' HSM keys are enumerated per authenticated partition via PKCS#11.' : ''}</p>
      {!isPending && (
        <FormRow label="">
          <button onClick={runTest} disabled={testing} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
            {testing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</> : <><Check className="w-3.5 h-3.5" /> Test connection</>}
          </button>
        </FormRow>
      )}
      {testResult && (
        <div className="ml-44 max-w-md space-y-1">
          <p className="text-[10.5px] text-muted-foreground">Accessible secret types for this connection:</p>
          {testResult.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-[11.5px]">
              {r.ok ? <Check className="w-3.5 h-3.5 text-teal" /> : <X className="w-3.5 h-3.5 text-amber" />}
              <span className={r.ok ? 'text-foreground' : 'text-amber'}>{r.label}{!r.ok && ' — not accessible (partial visibility)'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThirdPartyConfig() {
  const [source, setSource] = useState('Qualys');
  const [mode, setMode] = useState<'pull' | 'push'>('pull');
  const [token, setToken] = useState('');

  const isVuln = /Qualys|Tenable/.test(source);
  const isQTH = source === 'QTH CBOM';

  const genToken = () => setToken(Array.from({ length: 24 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''));

  return (
    <div className="space-y-3">
      <FormRow label="Source" required>
        <select value={source} onChange={e => { setSource(e.target.value); setToken(''); }} className={selectCls}>
          <optgroup label="Vulnerability scan reports (inferred)"><option>Qualys</option><option>Tenable</option></optgroup>
          <optgroup label="CBOM (read directly)"><option>Third-party CBOM (CycloneDX 1.6)</option><option>QTH CBOM</option></optgroup>
        </select>
      </FormRow>
      <p className="text-[10px] text-muted-foreground ml-44">
        {isVuln ? 'Vulnerability reports are inferred and sit below native scans and CBOM in source priority; findings may be posture-only.'
          : isQTH ? 'QTH (Quantum Trust Hub) generates a CBOM from code scan findings; asset context is a code component (repository, file, library).'
          : 'Native CycloneDX-CBOM is read directly. Minimum accepted version is 1.6; older or unversioned documents are rejected with a reason.'}
      </p>
      <FormRow label="Ingest mode">
        <div className="flex gap-1.5">
          {(['pull', 'push'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setToken(''); }} className={`px-3 py-1.5 rounded text-xs border capitalize ${mode === m ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{m}</button>
          ))}
        </div>
      </FormRow>
      <p className="text-[10px] text-muted-foreground ml-44">Mode is locked after activation; changing it later requires cloning the profile. Re-ingested records are deduplicated by source scan time.</p>
      {mode === 'pull' ? (
        <FormRow label="Source connection" required>
          <input className={`${inputCls} font-mono`} placeholder="https://api.source.example/v1" />
        </FormRow>
      ) : (
        <FormRow label="Push endpoint">
          <div className="flex-1 max-w-md space-y-2">
            <button onClick={genToken} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-foreground hover:bg-secondary"><Plus className="w-3 h-3" /> Generate endpoint & token</button>
            {token && (
              <div className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-amber"><AlertTriangle className="w-3.5 h-3.5" /> Shown once and not retained. Copy it into your source now.</div>
                <div className="font-mono text-muted-foreground break-all">https://ingest.avx.io/v1/third-party</div>
                <div className="font-mono text-teal break-all">{token}</div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">Push is a standing endpoint that listens for posted data. Save the profile to activate it.</p>
          </div>
        </FormRow>
      )}
    </div>
  );
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border/60 pb-1.5 mb-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{children}</p>
    </div>
  );
}

function Radios<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-4">
      {options.map(o => (
        <label key={o} className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-teal" /> {o}
        </label>
      ))}
    </div>
  );
}

function SSHAuthConfig() {
  const [startIp, setStartIp] = useState('');
  const [endIp, setEndIp] = useState('');
  const [port, setPort] = useState('22');
  const [batch, setBatch] = useState('128');
  const [discover, setDiscover] = useState<string[]>(['User Keys', 'Host Keys']);
  const [scanType, setScanType] = useState<'Default' | 'Full' | 'Directory'>('Default');
  const [recursive, setRecursive] = useState(false);
  const [intensive, setIntensive] = useState(false);
  const [accessType, setAccessType] = useState<'Key' | 'Certificate'>('Key');
  const [dataCenter, setDataCenter] = useState('');
  const [credentialType, setCredentialType] = useState('Manual Entry');
  const [loginType, setLoginType] = useState<'Password' | 'Identity Key'>('Password');
  const [username, setUsername] = useState('');
  const [infraGroup, setInfraGroup] = useState('');
  const [hostGroup, setHostGroup] = useState('Default_Host_Group');
  const [keyGroup, setKeyGroup] = useState('Default_Key_Group');
  const [inventoryAction, setInventoryAction] = useState<'Do Not Move' | 'Manage' | 'Monitor'>('Manage');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-md border border-teal/20 bg-teal/5 px-3 py-2 text-[11px] text-muted-foreground leading-snug">
        <AlertCircle className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
        <span>Authenticated SSH scan logs into hosts to discover user and host keys and onboard them into inventory with compliance policy. Lifecycle operations (rotation, remediation) arrive with the SSH remediation module.</span>
      </div>

      <div className="space-y-3">
        <GroupHeader>Scan target</GroupHeader>
        <FormRow label="Start IP" required><input value={startIp} onChange={e => setStartIp(e.target.value)} placeholder="192.168.1.1" className={inputCls} /></FormRow>
        <FormRow label="End IP" required><input value={endIp} onChange={e => setEndIp(e.target.value)} placeholder="192.168.1.254" className={inputCls} /></FormRow>
        <FormRow label="Port" required><input value={port} onChange={e => setPort(e.target.value)} className="w-24 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" /></FormRow>
        <FormRow label="IP(s) per batch"><select value={batch} onChange={e => setBatch(e.target.value)} className={selectCls}>{['64', '128', '256', '512'].map(b => <option key={b}>{b}</option>)}</select></FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader>Discovery scope</GroupHeader>
        <FormRow label="Discover" required><CheckGroup options={['User Keys', 'Host Keys']} value={discover} onChange={setDiscover} /></FormRow>
        <FormRow label="Scan type" required><Radios options={['Default', 'Full', 'Directory'] as const} value={scanType} onChange={v => setScanType(v)} /></FormRow>
        <FormRow label="Recursive scan"><Toggle checked={recursive} onChange={setRecursive} label="Traverse subdirectories for keys" /></FormRow>
        <FormRow label="Intensive scan"><Toggle checked={intensive} onChange={setIntensive} label="Deeper scan, slower but more thorough" /></FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader>Access and credentials</GroupHeader>
        <FormRow label="Access type" required><Radios options={['Key', 'Certificate'] as const} value={accessType} onChange={v => setAccessType(v)} /></FormRow>
        <FormRow label="DataCenter" required>
          <select value={dataCenter} onChange={e => setDataCenter(e.target.value)} className={selectCls}>
            <option value="">Select…</option>{['absecon', 'us-east-1', 'us-west-2', 'eu-central-1'].map(d => <option key={d}>{d}</option>)}
          </select>
        </FormRow>
        <FormRow label="Credential type" required>
          <select value={credentialType} onChange={e => setCredentialType(e.target.value)} className={selectCls}>{['Manual Entry', 'Stored Credential'].map(c => <option key={c}>{c}</option>)}</select>
        </FormRow>
        <FormRow label="Login type" required><Radios options={['Password', 'Identity Key'] as const} value={loginType} onChange={v => setLoginType(v)} /></FormRow>
        <FormRow label="Username" required><input value={username} onChange={e => setUsername(e.target.value)} placeholder="svc-discovery" className={inputCls} /></FormRow>
        <FormRow label={loginType === 'Password' ? 'Password' : 'Identity key'} required>
          {loginType === 'Password'
            ? <input type="password" placeholder="••••••••" className={inputCls} />
            : <textarea rows={2} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" className={textareaCls} />}
        </FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader>Onboarding and governance</GroupHeader>
        <FormRow label="Infra Access Group" required>
          <div className="flex-1 max-w-md space-y-1">
            <input value={infraGroup} onChange={e => setInfraGroup(e.target.value)} placeholder="Select or type to add…" className={inputCls.replace('max-w-md', 'w-full')} />
            <p className="text-[10px] text-muted-foreground">Maps the onboarded host to an Application Infra Access Group. Type a new name and press enter to add.</p>
          </div>
        </FormRow>
        <FormRow label="Host Compliance Group"><select value={hostGroup} onChange={e => setHostGroup(e.target.value)} className={selectCls}>{['Default_Host_Group', 'Prod_Host_Group', 'PCI_Host_Group'].map(g => <option key={g}>{g}</option>)}</select></FormRow>
        <FormRow label="Key Compliance Group"><select value={keyGroup} onChange={e => setKeyGroup(e.target.value)} className={selectCls}>{['Default_Key_Group', 'Prod_Key_Group', 'PCI_Key_Group'].map(g => <option key={g}>{g}</option>)}</select></FormRow>
        <FormRow label="Inventory action" required><Radios options={['Do Not Move', 'Manage', 'Monitor'] as const} value={inventoryAction} onChange={setInventoryAction} /></FormRow>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3 — RUNS
// ============================================================================
function RunsTab() {
  const { runs } = useRuns();
  const [statusFilter, setStatusFilter] = useState<'All' | 'in-progress' | 'completed' | 'failed'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [, force] = useState(0);

  useEffect(() => { const t = setInterval(() => force(n => n + 1), 1000); return () => clearInterval(t); }, []);

  const sorted = useMemo(() => [...runs].sort((a, b) => b.startedAt - a.startedAt), [runs]);
  const filtered = sorted.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'All categories' && r.category !== categoryFilter) return false;
    return true;
  });

  const statusPill = (status: string) => {
    if (status === 'in-progress') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber/15 text-amber border border-amber/30"><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" /> In progress</span>;
    if (status === 'completed') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">● Completed</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-coral/15 text-coral border border-coral/30">● Failed</span>;
  };

  if (runs.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-10 text-center space-y-2">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">No discovery runs yet</h3>
        <p className="text-xs text-muted-foreground">Start one from the New Scan tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          <option>All categories</option>
          {scanCategories.map(c => <option key={c.category}>{c.category}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          <option value="All">All statuses</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="failed">Failed</option>
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} of {runs.length} runs</span>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr className="border-b border-border">
              {['Run', 'Category', 'Started', 'Duration', 'Discovered', 'Status', 'Triggered by'].map(h => <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(run => (
              <tr key={run.id} className="border-b border-border hover:bg-secondary/30">
                <td className="py-2 px-3 font-mono text-[10px] text-foreground">{run.profileName ?? run.id.slice(-8)}</td>
                <td className="py-2 px-3"><span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{run.category}</span></td>
                <td className="py-2 px-3 text-muted-foreground">{formatRelative(run.startedAt)}</td>
                <td className="py-2 px-3 text-muted-foreground">{formatDuration(run.startedAt, run.completedAt)}</td>
                <td className="py-2 px-3 font-medium tabular-nums">{run.status === 'in-progress' ? '—' : run.itemsDiscovered.toLocaleString()}</td>
                <td className="py-2 px-3">{statusPill(run.status)}</td>
                <td className="py-2 px-3 text-muted-foreground capitalize">{run.triggeredBy}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No runs match your filter.</td></tr>}
          </tbody>
        </table>
      </div>
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