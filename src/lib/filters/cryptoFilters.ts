import type { CryptoAsset } from '@/data/mockData';

export interface DashboardFilter {
  id: string;
  label: string;
  countNoun: string;
  predicate: (a: CryptoAsset) => boolean;
  navKey: string;
}

export const DASHBOARD_FILTERS: Record<string, DashboardFilter> = {
  'weak-algos': {
    id: 'weak-algos',
    label: 'Weak algorithms (RSA-1024 / 2048, SHA-1)',
    countNoun: 'identities',
    predicate: (a) => /RSA-1024|RSA-2048|SHA-1/.test(a.algorithm),
    navKey: 'weak-algos',
  },
  'expiring': {
    id: 'expiring',
    label: 'Certificates expiring in ≤7 days',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.status === 'Expiring',
    navKey: 'expiring',
  },
  'orphaned': {
    id: 'orphaned',
    label: 'Orphaned SSH keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && a.owner === 'Unassigned',
    navKey: 'orphaned',
  },
  'over-privileged': {
    id: 'over-privileged',
    label: 'Over-privileged AI agent tokens',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && !!(a.agentMeta?.permissionRisk === 'Over-privileged'),
    navKey: 'over-privileged',
  },
};

export const COUNT_NOUNS: Record<string, string> = Object.fromEntries(
  Object.values(DASHBOARD_FILTERS).map(f => [f.id, f.countNoun])
);
