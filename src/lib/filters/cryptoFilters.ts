import type { CryptoAsset } from '@/data/mockData';

export interface DashboardFilter {
  id: string;
  label: string;
  countNoun: string;
  predicate: (a: CryptoAsset) => boolean;
  enterpriseCount: number;
}

export const DASHBOARD_FILTERS: Record<string, DashboardFilter> = {
  'weak-algos': {
    id: 'weak-algos',
    label: 'Weak algorithms (RSA-1024 / 2048, SHA-1)',
    countNoun: 'identities',
    predicate: (a) => /RSA-1024|RSA-2048|SHA-1/.test(a.algorithm),
    enterpriseCount: 8247,
  },
  'expiring': {
    id: 'expiring',
    label: 'Certificates expiring in ≤7 days',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.status === 'Expiring',
    enterpriseCount: 187,
  },
  'orphaned': {
    id: 'orphaned',
    label: 'Orphaned SSH keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && a.owner === 'Unassigned',
    enterpriseCount: 3218,
  },
  'over-privileged': {
    id: 'over-privileged',
    label: 'Over-privileged AI agent tokens',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && !!(a.agentMeta?.permissionRisk === 'Over-privileged'),
    enterpriseCount: 6840,
  },
};

export const COUNT_NOUNS: Record<string, string> = Object.fromEntries(
  Object.values(DASHBOARD_FILTERS).map(f => [f.id, f.countNoun])
);
