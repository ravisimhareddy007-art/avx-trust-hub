import type { CryptoAsset } from '@/data/mockData';

export interface DashboardFilter {
  id: string;
  label: string;
  countNoun: string;
  predicate: (a: CryptoAsset) => boolean;
  enterpriseCount: number;
  pts: number;
}

export const DASHBOARD_FILTERS: Record<string, DashboardFilter> = {
  'expiring': {
    id: 'expiring',
    label: 'Certificates expiring in ≤7 days',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.status === 'Expiring',
    enterpriseCount: 187,
    pts: 14,
  },
  'orphaned': {
    id: 'orphaned',
    label: 'Orphaned SSH keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && a.owner === 'Unassigned',
    enterpriseCount: 3218,
    pts: 10,
  },
  'over-privileged': {
    id: 'over-privileged',
    label: 'Over-privileged AI agent tokens',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && !!(a.agentMeta?.permissionRisk === 'Over-privileged'),
    enterpriseCount: 6840,
    pts: 8,
  },
  'weak-algos': {
    id: 'weak-algos',
    label: 'Weak algorithms (RSA-1024 / 2048, SHA-1)',
    countNoun: 'certs & keys',
    predicate: (a) => /RSA-1024|RSA-2048|SHA-1/.test(a.algorithm),
    enterpriseCount: 8247,
    pts: 6,
  },
};

export const COUNT_NOUNS: Record<string, string> = Object.fromEntries(
  Object.values(DASHBOARD_FILTERS).map(f => [f.id, f.countNoun])
);
