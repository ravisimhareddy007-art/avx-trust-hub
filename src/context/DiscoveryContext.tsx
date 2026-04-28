import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

// ============================================================================
// PROFILES
// ============================================================================
export interface DiscoveryProfile {
  id: string;
  name: string;
  description: string;
  connectionId: string;
  connectionName: string;
  vaultType: string;
  category: string;
  includes: string[];
  scanScope: Record<string, unknown>;
  schedule: { freq: string; time: string; day?: string } | null;
  lastRunId: string | null;
  lastRunAt: number | null;
  nextRunAt: number | null;
  status: 'active' | 'paused' | 'error';
  createdAt: number;
}

interface ProfilesCtx {
  profiles: DiscoveryProfile[];
  addProfile: (p: Omit<DiscoveryProfile, 'id' | 'createdAt' | 'lastRunId' | 'lastRunAt' | 'status'> & Partial<Pick<DiscoveryProfile, 'status'>>) => DiscoveryProfile;
  updateProfile: (id: string, patch: Partial<DiscoveryProfile>) => void;
  getProfile: (id: string) => DiscoveryProfile | undefined;
}

const ProfilesContext = createContext<ProfilesCtx | null>(null);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const SEED_PROFILES: DiscoveryProfile[] = [
  {
    id: 'prof_seed_weekly_prod',
    name: 'weekly-prod-vault-sweep',
    description: 'Full weekly sweep of production HashiCorp Vault for KV secrets and PKI material.',
    connectionId: 'conn_seed_hashicorp_prod',
    connectionName: 'hashicorp-vault-prod',
    vaultType: 'HashiCorp Vault',
    category: 'Secrets',
    includes: ['API keys', 'Tokens', 'Database credentials', 'Certificates'],
    scanScope: { mounts: ['secret/', 'pki/'] },
    schedule: { freq: 'Weekly', day: 'Sun', time: '02:00' },
    lastRunId: 'run_seed_weekly_1',
    lastRunAt: Date.now() - 6 * HOUR,
    nextRunAt: Date.now() + 6 * DAY,
    status: 'active',
    createdAt: Date.now() - 21 * DAY,
  },
  {
    id: 'prof_seed_daily_aws',
    name: 'daily-aws-secrets-scan',
    description: 'Daily scan of AWS Secrets Manager across us-east-1 and us-west-2.',
    connectionId: 'conn_seed_aws_prod',
    connectionName: 'aws-secrets-prod',
    vaultType: 'AWS Secrets Manager',
    category: 'Secrets',
    includes: ['API keys', 'Database credentials', 'Service credentials'],
    scanScope: { regions: ['us-east-1', 'us-west-2'] },
    schedule: { freq: 'Daily', time: '04:00' },
    lastRunId: 'run_seed_aws_1',
    lastRunAt: Date.now() - 3 * HOUR,
    nextRunAt: Date.now() + 21 * HOUR,
    status: 'active',
    createdAt: Date.now() - 14 * DAY,
  },
  {
    id: 'prof_seed_cyberark',
    name: 'cyberark-conjur-hourly',
    description: 'High-frequency scan of CyberArk Conjur for privileged service accounts.',
    connectionId: 'conn_seed_cyberark',
    connectionName: 'cyberark-conjur-prod',
    vaultType: 'CyberArk Conjur',
    category: 'Secrets',
    includes: ['Service credentials', 'Tokens'],
    scanScope: { policies: ['root', 'apps'] },
    schedule: { freq: 'Every 6 hours', time: '00:00' },
    lastRunId: 'run_seed_cyberark_1',
    lastRunAt: Date.now() - 45 * 60 * 1000,
    nextRunAt: Date.now() + 5 * HOUR,
    status: 'active',
    createdAt: Date.now() - 9 * DAY,
  },
  {
    id: 'prof_seed_azure',
    name: 'azure-keyvault-monthly',
    description: 'Monthly compliance sweep across all Azure Key Vault instances.',
    connectionId: 'conn_seed_azure',
    connectionName: 'azure-keyvault-corp',
    vaultType: 'Azure Key Vault',
    category: 'Secrets',
    includes: ['Certificates', 'Keys', 'Secrets'],
    scanScope: { subscriptions: ['corp-prod', 'corp-dr'] },
    schedule: { freq: 'Monthly', time: '01:00' },
    lastRunId: 'run_seed_azure_1',
    lastRunAt: Date.now() - 2 * DAY,
    nextRunAt: Date.now() + 28 * DAY,
    status: 'paused',
    createdAt: Date.now() - 60 * DAY,
  },
  {
    id: 'prof_seed_gcp',
    name: 'gcp-secret-manager-daily',
    description: 'Daily GCP Secret Manager discovery for the platform org.',
    connectionId: 'conn_seed_gcp',
    connectionName: 'gcp-secret-manager-platform',
    vaultType: 'GCP Secret Manager',
    category: 'Secrets',
    includes: ['API keys', 'Tokens'],
    scanScope: { projects: ['platform-prod', 'platform-stg'] },
    schedule: { freq: 'Daily', time: '03:30' },
    lastRunId: 'run_seed_gcp_1',
    lastRunAt: Date.now() - 9 * HOUR,
    nextRunAt: Date.now() + 15 * HOUR,
    status: 'error',
    createdAt: Date.now() - 5 * DAY,
  },
];

const SEED_RUNS: DiscoveryRun[] = [
  {
    id: 'run_seed_weekly_1',
    profileId: 'prof_seed_weekly_prod',
    profileName: 'weekly-prod-vault-sweep',
    connectionId: 'conn_seed_hashicorp_prod',
    connectionName: 'hashicorp-vault-prod',
    vaultType: 'HashiCorp Vault',
    category: 'Secrets',
    includes: ['API keys', 'Tokens', 'Database credentials', 'Certificates'],
    startedAt: Date.now() - 6 * HOUR,
    completedAt: Date.now() - 6 * HOUR + 4 * 60 * 1000 + 12 * 1000,
    status: 'completed',
    itemsDiscovered: 412,
    triggeredBy: 'scheduled',
  },
  {
    id: 'run_seed_aws_1',
    profileId: 'prof_seed_daily_aws',
    profileName: 'daily-aws-secrets-scan',
    connectionId: 'conn_seed_aws_prod',
    connectionName: 'aws-secrets-prod',
    vaultType: 'AWS Secrets Manager',
    category: 'Secrets',
    includes: ['API keys', 'Database credentials', 'Service credentials'],
    startedAt: Date.now() - 3 * HOUR,
    completedAt: Date.now() - 3 * HOUR + 95 * 1000,
    status: 'completed',
    itemsDiscovered: 187,
    triggeredBy: 'scheduled',
  },
  {
    id: 'run_seed_cyberark_1',
    profileId: 'prof_seed_cyberark',
    profileName: 'cyberark-conjur-hourly',
    connectionId: 'conn_seed_cyberark',
    connectionName: 'cyberark-conjur-prod',
    vaultType: 'CyberArk Conjur',
    category: 'Secrets',
    includes: ['Service credentials', 'Tokens'],
    startedAt: Date.now() - 45 * 60 * 1000,
    completedAt: Date.now() - 45 * 60 * 1000 + 38 * 1000,
    status: 'completed',
    itemsDiscovered: 76,
    triggeredBy: 'scheduled',
  },
  {
    id: 'run_seed_azure_1',
    profileId: 'prof_seed_azure',
    profileName: 'azure-keyvault-monthly',
    connectionId: 'conn_seed_azure',
    connectionName: 'azure-keyvault-corp',
    vaultType: 'Azure Key Vault',
    category: 'Secrets',
    includes: ['Certificates', 'Keys', 'Secrets'],
    startedAt: Date.now() - 2 * DAY,
    completedAt: Date.now() - 2 * DAY + 8 * 60 * 1000,
    status: 'completed',
    itemsDiscovered: 1024,
    triggeredBy: 'manual',
  },
  {
    id: 'run_seed_gcp_1',
    profileId: 'prof_seed_gcp',
    profileName: 'gcp-secret-manager-daily',
    connectionId: 'conn_seed_gcp',
    connectionName: 'gcp-secret-manager-platform',
    vaultType: 'GCP Secret Manager',
    category: 'Secrets',
    includes: ['API keys', 'Tokens'],
    startedAt: Date.now() - 9 * HOUR,
    completedAt: Date.now() - 9 * HOUR + 22 * 1000,
    status: 'failed',
    itemsDiscovered: 0,
    triggeredBy: 'scheduled',
  },
  {
    id: 'run_seed_adhoc_1',
    profileId: null,
    profileName: null,
    connectionId: 'conn_seed_hashicorp_prod',
    connectionName: 'hashicorp-vault-prod',
    vaultType: 'HashiCorp Vault',
    category: 'Secrets',
    includes: ['API keys'],
    startedAt: Date.now() - 30 * 60 * 1000,
    completedAt: null,
    status: 'in-progress',
    itemsDiscovered: 0,
    triggeredBy: 'manual',
  },
];

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>(SEED_PROFILES);

  const addProfile: ProfilesCtx['addProfile'] = useCallback((p) => {
    const now = Date.now();
    const profile: DiscoveryProfile = {
      id: `prof_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      lastRunId: null,
      lastRunAt: null,
      status: p.status ?? 'active',
      ...p,
    } as DiscoveryProfile;
    setProfiles(prev => [profile, ...prev]);
    return profile;
  }, []);

  const updateProfile = useCallback((id: string, patch: Partial<DiscoveryProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const value = useMemo<ProfilesCtx>(() => ({
    profiles,
    addProfile,
    updateProfile,
    getProfile: (id) => profiles.find(p => p.id === id),
  }), [profiles, addProfile, updateProfile]);

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles() {
  const c = useContext(ProfilesContext);
  if (!c) throw new Error('useProfiles must be used inside ProfilesProvider');
  return c;
}

// ============================================================================
// RUNS
// ============================================================================
export interface DiscoveryRun {
  id: string;
  profileId: string | null;
  profileName: string | null;
  connectionId: string;
  connectionName: string;
  vaultType: string;
  category: string;
  includes: string[];
  startedAt: number;
  completedAt: number | null;
  status: 'in-progress' | 'completed' | 'failed';
  itemsDiscovered: number;
  triggeredBy: 'manual' | 'scheduled';
}

interface RunsCtx {
  runs: DiscoveryRun[];
  addRun: (r: Omit<DiscoveryRun, 'id' | 'startedAt' | 'completedAt' | 'status' | 'itemsDiscovered'> & Partial<Pick<DiscoveryRun, 'status' | 'itemsDiscovered' | 'startedAt'>>) => DiscoveryRun;
  updateRun: (id: string, patch: Partial<DiscoveryRun>) => void;
  latestRunForProfile: (profileId: string) => DiscoveryRun | undefined;
}

const RunsContext = createContext<RunsCtx | null>(null);

export function RunsProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<DiscoveryRun[]>(SEED_RUNS);

  const addRun: RunsCtx['addRun'] = useCallback((r) => {
    const now = Date.now();
    const run: DiscoveryRun = {
      id: `run_${now}_${Math.random().toString(36).slice(2, 6)}`,
      startedAt: r.startedAt ?? now,
      completedAt: null,
      status: r.status ?? 'in-progress',
      itemsDiscovered: r.itemsDiscovered ?? 0,
      ...r,
    } as DiscoveryRun;
    setRuns(prev => [run, ...prev]);
    return run;
  }, []);

  const updateRun = useCallback((id: string, patch: Partial<DiscoveryRun>) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const value = useMemo<RunsCtx>(() => ({
    runs,
    addRun,
    updateRun,
    latestRunForProfile: (profileId) =>
      runs.filter(r => r.profileId === profileId).sort((a, b) => b.startedAt - a.startedAt)[0],
  }), [runs, addRun, updateRun]);

  return <RunsContext.Provider value={value}>{children}</RunsContext.Provider>;
}

export function useRuns() {
  const c = useContext(RunsContext);
  if (!c) throw new Error('useRuns must be used inside RunsProvider');
  return c;
}

// ============================================================================
// HELPERS
// ============================================================================
export function formatRelative(ts: number | null): string {
  if (ts == null) return 'Never';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function formatRelativeFuture(ts: number | null): string {
  if (ts == null) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'due now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `in ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.floor(h / 24);
  return `in ${d}d`;
}

export function formatDuration(startedAt: number, completedAt: number | null): string {
  if (completedAt == null) return 'Running...';
  const ms = completedAt - startedAt;
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export function formatSchedule(s: DiscoveryProfile['schedule']): string {
  if (!s) return 'On-demand';
  if (s.freq === 'Weekly' && s.day) return `Weekly ${s.day} ${s.time} UTC`;
  return `${s.freq} ${s.time} UTC`;
}

export function computeNextRun(s: DiscoveryProfile['schedule']): number | null {
  if (!s) return null;
  // simple mock: next run = +1 day from now
  const map: Record<string, number> = {
    'Every 6 hours': 6 * 60 * 60 * 1000,
    'Daily': 24 * 60 * 60 * 1000,
    'Weekly': 7 * 24 * 60 * 60 * 1000,
    'Monthly': 30 * 24 * 60 * 60 * 1000,
  };
  return Date.now() + (map[s.freq] ?? 24 * 60 * 60 * 1000);
}
