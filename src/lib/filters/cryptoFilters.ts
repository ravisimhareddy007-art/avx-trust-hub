import type { CryptoAsset } from '@/data/mockData';
import { ESTATE_SUMMARY } from '@/data/mockData';

export interface DashboardFilter {
  id: string;
  label: string;
  countNoun: string;
  predicate: (a: CryptoAsset) => boolean;
  enterpriseCount: number;
  pts: number;
  filters: Record<string, string>;
}

export const VIOLATION_FILTERS: Record<string, DashboardFilter> = {

  // ── Certificates ──────────────────────────────────────────────────────────

  cert_expired: {
    id: 'cert_expired',
    label: 'Expired certificates',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.status === 'Expired',
    enterpriseCount: ESTATE_SUMMARY.certsExpired,
    pts: 12,
    filters: { type: 'TLS Certificate', status: 'Expired', tab: 'identities' },
  },

  cert_expiring_7d: {
    id: 'cert_expiring_7d',
    label: 'Expiring in 7 days — no auto-renewal',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.status === 'Expiring' && a.autoRenewal === false,
    enterpriseCount: ESTATE_SUMMARY.certsExpiring7d,
    pts: 14,
    filters: { type: 'TLS Certificate', status: 'Expiring', autoRenewal: 'false', tab: 'identities' },
  },

  cert_expiring_30d: {
    id: 'cert_expiring_30d',
    label: 'Expiring in 30 days',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.status === 'Expiring',
    enterpriseCount: ESTATE_SUMMARY.certsExpiring30d,
    pts: 8,
    filters: { type: 'TLS Certificate', status: 'Expiring', tab: 'identities' },
  },

  cert_weak_algo: {
    id: 'cert_weak_algo',
    label: 'Weak algorithm (SHA-1 / RSA-1024)',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && /RSA-1024|SHA-1/.test(a.algorithm),
    enterpriseCount: ESTATE_SUMMARY.certsWeakAlgo,
    pts: 6,
    filters: { type: 'TLS Certificate', algorithm: 'weak', tab: 'identities' },
  },

  cert_self_signed: {
    id: 'cert_self_signed',
    label: 'Self-signed in production',
    countNoun: 'certs',
    predicate: (a) => a.type === 'TLS Certificate' && a.environment === 'Production' && a.caIssuer === 'Self-Signed',
    enterpriseCount: ESTATE_SUMMARY.certsSelfSigned,
    pts: 4,
    filters: { type: 'TLS Certificate', caIssuer: 'Self-Signed', tab: 'identities' },
  },

  // ── SSH Keys ──────────────────────────────────────────────────────────────

  ssh_suspicious: {
    id: 'ssh_suspicious',
    label: 'Suspicious keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && !!a.tags?.includes('suspicious'),
    enterpriseCount: ESTATE_SUMMARY.sshSuspicious,
    pts: 10,
    filters: { type: 'SSH Key', suspicious: 'true', tab: 'identities' },
  },

  ssh_shared_user: {
    id: 'ssh_shared_user',
    label: 'Shared user keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && !!a.tags?.includes('shared-user'),
    enterpriseCount: ESTATE_SUMMARY.sshSharedUser,
    pts: 8,
    filters: { type: 'SSH Key', sharedUser: 'true', tab: 'identities' },
  },

  ssh_rogue: {
    id: 'ssh_rogue',
    label: 'Rogue keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && !!a.tags?.includes('rogue'),
    enterpriseCount: ESTATE_SUMMARY.sshRogue,
    pts: 8,
    filters: { type: 'SSH Key', rogue: 'true', tab: 'identities' },
  },

  ssh_weak_user: {
    id: 'ssh_weak_user',
    label: 'Weak user keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && /RSA-1024|DSA/.test(a.algorithm),
    enterpriseCount: ESTATE_SUMMARY.sshWeakUser,
    pts: 6,
    filters: { type: 'SSH Key', weakUser: 'true', tab: 'identities' },
  },

  ssh_weak_host: {
    id: 'ssh_weak_host',
    label: 'Weak host keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && !!a.tags?.includes('host-key') && /RSA-1024|DSA/.test(a.algorithm),
    enterpriseCount: ESTATE_SUMMARY.sshWeakHost,
    pts: 6,
    filters: { type: 'SSH Key', weakHost: 'true', tab: 'identities' },
  },

  ssh_misplaced: {
    id: 'ssh_misplaced',
    label: 'Misplaced keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && !!a.tags?.includes('misplaced'),
    enterpriseCount: ESTATE_SUMMARY.sshMisplaced,
    pts: 4,
    filters: { type: 'SSH Key', misplaced: 'true', tab: 'identities' },
  },

  ssh_shared_host: {
    id: 'ssh_shared_host',
    label: 'Shared host keys',
    countNoun: 'SSH keys',
    predicate: (a) => a.type === 'SSH Key' && !!a.tags?.includes('shared-host'),
    enterpriseCount: ESTATE_SUMMARY.sshSharedHost,
    pts: 4,
    filters: { type: 'SSH Key', sharedHost: 'true', tab: 'identities' },
  },

  // ── Secrets ───────────────────────────────────────────────────────────────

  secret_exposed_code: {
    id: 'secret_exposed_code',
    label: 'Exposed in code repositories',
    countNoun: 'secrets',
    predicate: (a) => a.type === 'API Key / Secret' && (a.tags?.includes('code-exposed') || a.tags?.includes('source-code')),
    enterpriseCount: ESTATE_SUMMARY.secretsExposedCode,
    pts: 14,
    filters: { type: 'API Key / Secret', exposure: 'code', tab: 'identities' },
  },

  secret_hardcoded_24h: {
    id: 'secret_hardcoded_24h',
    label: 'Hardcoded — detected in last 24h',
    countNoun: 'secrets',
    predicate: (a) => a.type === 'API Key / Secret' && !!a.tags?.includes('hardcoded'),
    enterpriseCount: ESTATE_SUMMARY.secretsHardcoded,
    pts: 14,
    filters: { type: 'API Key / Secret', exposure: 'code', tab: 'identities' },
  },

  secret_unrotated_90d: {
    id: 'secret_unrotated_90d',
    label: 'Not rotated in 90+ days',
    countNoun: 'secrets',
    predicate: (a) => a.type === 'API Key / Secret' && (a as any).rotation === 'overdue',
    enterpriseCount: ESTATE_SUMMARY.secretsUnrotated90d,
    pts: 8,
    filters: { type: 'API Key / Secret', rotation: 'overdue', tab: 'identities' },
  },

  secret_orphaned: {
    id: 'secret_orphaned',
    label: 'Orphaned — owner left org',
    countNoun: 'secrets',
    predicate: (a) => a.type === 'API Key / Secret' && a.owner === 'Unassigned',
    enterpriseCount: ESTATE_SUMMARY.secretsOrphaned,
    pts: 6,
    filters: { type: 'API Key / Secret', owner: 'Unassigned', tab: 'identities' },
  },

  // ── AI Agent Tokens ───────────────────────────────────────────────────────

  ai_admin_no_rotation: {
    id: 'ai_admin_no_rotation',
    label: 'Admin privilege — not rotated >30d',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && a.agentMeta?.permissionRisk === 'Over-privileged',
    enterpriseCount: ESTATE_SUMMARY.aiTokensAdminPriv,
    pts: 14,
    filters: { type: 'AI Agent Token', privilege: 'admin', tab: 'identities' },
  },

  ai_over_privileged: {
    id: 'ai_over_privileged',
    label: 'Over-privileged — unused scopes',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && a.agentMeta?.permissionRisk === 'Over-privileged',
    enterpriseCount: ESTATE_SUMMARY.aiTokensOverPriv,
    pts: 10,
    filters: { type: 'AI Agent Token', privilege: 'over', tab: 'identities' },
  },

  ai_no_sponsor: {
    id: 'ai_no_sponsor',
    label: 'No human sponsor assigned',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && (a.owner === 'Unassigned' || a.tags?.includes('no-sponsor')),
    enterpriseCount: ESTATE_SUMMARY.aiTokensNoSponsor,
    pts: 8,
    filters: { type: 'AI Agent Token', owner: 'Unassigned', tab: 'identities' },
  },

  ai_no_rotation_policy: {
    id: 'ai_no_rotation_policy',
    label: 'No rotation policy configured',
    countNoun: 'AI tokens',
    predicate: (a) => a.type === 'AI Agent Token' && (a.rotationFrequency === 'Never' || a.rotationFrequency === '365 days'),
    enterpriseCount: ESTATE_SUMMARY.aiTokensNoRotationPolicy,
    pts: 6,
    filters: { type: 'AI Agent Token', rotation: 'none', tab: 'identities' },
  },
};

// ERS drivers — subset of VIOLATION_FILTERS used on the ERS driver bar
export const DASHBOARD_FILTERS: Record<string, DashboardFilter> = {
  'cert-expiring':  VIOLATION_FILTERS.cert_expiring_7d,
  'ssh-suspicious': {
    ...VIOLATION_FILTERS.ssh_suspicious,
    id: 'ssh-suspicious',
    label: 'Suspicious & rogue SSH keys',
    enterpriseCount: ESTATE_SUMMARY.sshSuspicious + ESTATE_SUMMARY.sshRogue,
    pts: 10,
  },
  'ai-over-priv':   VIOLATION_FILTERS.ai_over_privileged,
  'weak-algos': {
    id: 'weak-algos',
    label: 'Weak algorithms (certs + SSH)',
    countNoun: 'assets',
    predicate: (a) => /RSA-1024|SHA-1|DSA/.test(a.algorithm),
    enterpriseCount: 1248,
    pts: 6,
    filters: { algorithm: 'weak', tab: 'identities' },
  },
};

export const COUNT_NOUNS: Record<string, string> = Object.fromEntries(
  Object.values(VIOLATION_FILTERS).map(f => [f.id, f.countNoun])
);
