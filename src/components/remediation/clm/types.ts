import { CryptoAsset } from '@/data/mockData';

export type ClmTab = 'issues' | 'deployments' | 'actions';
export type ClmIssueFilter = 'all' | 'expiring' | 'pqc' | 'orphaned' | 'policy' | 'codesigning';
export type ClmIssueType = 'Expiring / Expired' | 'PQC Migration' | 'Orphaned' | 'Policy Violation';
export type ClmIssueAction =
  | 'Renew'
  | 'Regenerate'
  | 'Reissue'
  | 'Revoke'
  | 'CA Switch'
  | 'Revocation Check - OCSP'
  | 'Migrate';
export type PolicyActionType = 'Enroll' | 'Push to Device' | 'Generate CSR' | 'SSL Check';
export type PolicyRequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed';

export interface ClmIssueRow {
  id: string;
  assetId: string;
  asset: CryptoAsset;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  issueType: ClmIssueType;
  issueCategory: Exclude<ClmIssueFilter, 'all'>;
  issueText: string;
  recommended: string;
  owner: string;
  environment: CryptoAsset['environment'];
  primaryAction: ClmIssueAction;
  menuActions: ClmIssueAction[];
}

export interface PolicyStage {
  label: string;
  timestamp: string;
  status: 'done' | 'active' | 'failed' | 'pending';
  details: Array<{ label: string; value: string }>;
  error?: string;
}

export interface PolicyRequestRow {
  id: string;
  action: PolicyActionType;
  certificateTarget: string;
  requestedBy: string;
  created: string;
  status: PolicyRequestStatus;
  subject: string;
  targetCA: string;
  stages: PolicyStage[];
}
