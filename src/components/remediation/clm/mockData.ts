import { mockAssets, CryptoAsset } from '@/data/mockData';
import { ClmIssueRow, ClmIssueType, PolicyRequestRow } from './types';

const allCertificates = mockAssets.filter((asset): asset is CryptoAsset => asset.type === 'TLS Certificate');
const assetById = new Map(allCertificates.map((asset) => [asset.id, asset]));

const buildIssue = (
  id: string,
  assetId: string,
  issueType: ClmIssueType,
  issueText: string,
  recommended: string,
): ClmIssueRow => {
  const asset = assetById.get(assetId);

  if (!asset) {
    throw new Error(`Missing certificate asset for ${assetId}`);
  }

  if (issueType === 'Expiring / Expired') {
    return {
      id,
      assetId,
      asset,
      severity: asset.daysToExpiry <= 2 || asset.status === 'Expired' ? 'Critical' : 'High',
      issueType,
      issueCategory: 'expiring',
      issueText,
      recommended,
      owner: asset.owner,
      environment: asset.environment,
      primaryAction: 'Renew',
      menuActions: ['Regenerate', 'Reissue', 'Revoke', 'Revocation Check - OCSP'],
    };
  }

  if (issueType === 'PQC Migration') {
    return {
      id,
      assetId,
      asset,
      severity: asset.algorithm.includes('1024') || asset.algorithm.includes('2048') ? 'Critical' : 'High',
      issueType,
      issueCategory: 'pqc',
      issueText,
      recommended,
      owner: asset.owner,
      environment: asset.environment,
      primaryAction: 'Migrate',
      menuActions: ['CA Switch', 'Regenerate', 'Revoke'],
    };
  }

  if (issueType === 'Orphaned') {
    return {
      id,
      assetId,
      asset,
      severity: 'High',
      issueType,
      issueCategory: 'orphaned',
      issueText,
      recommended,
      owner: asset.owner,
      environment: asset.environment,
      primaryAction: 'Revoke',
      menuActions: ['Revocation Check - OCSP', 'Reissue'],
    };
  }

  return {
    id,
    assetId,
    asset,
    severity: 'Medium',
    issueType,
    issueCategory: 'policy',
    issueText,
    recommended,
    owner: asset.owner,
    environment: asset.environment,
    primaryAction: 'CA Switch',
    menuActions: ['Renew', 'Revoke', 'Revocation Check - OCSP'],
  };
};

const expiryRows: ClmIssueRow[] = [
  buildIssue('issue-exp-01', 'cert-001', 'Expiring / Expired', 'Wildcard leaf expires in 6 days', 'Renew from CA'),
  buildIssue('issue-exp-02', 'cert-003', 'Expiring / Expired', 'Edge gateway cert expires in 6 days', 'Renew from CA'),
  buildIssue('issue-exp-03', 'cert-008', 'Expiring / Expired', 'Vault listener cert expires in 3 days', 'Revoke & Reissue'),
  buildIssue('issue-exp-04', 'cert-009', 'Expiring / Expired', 'Mail transport cert expires in 7 days', 'Renew from CA'),
  buildIssue('issue-exp-05', 'cert-012', 'Expiring / Expired', 'Auth gateway cert enters renewal window', 'Renew from CA'),
  buildIssue('issue-exp-06', 'cert-013', 'Expiring / Expired', 'Vault cert already expired', 'Revoke & Reissue'),
  buildIssue('issue-exp-07', 'cert-015', 'Expiring / Expired', 'Mail relay cert expires in 12 days', 'Renew from CA'),
  buildIssue('issue-exp-08', 'cert-016', 'Expiring / Expired', 'CDN edge cert enters critical zone', 'Renew from CA'),
  buildIssue('issue-exp-09', 'cert-017', 'Expiring / Expired', 'API gateway cert already expired', 'Reissue from trusted CA'),
  buildIssue('issue-exp-10', 'cert-019', 'Expiring / Expired', 'DB primary cert already expired', 'Reissue from trusted CA'),
  buildIssue('issue-exp-11', 'cert-023', 'Expiring / Expired', 'LDAP cert expires in 4 days', 'Renew from CA'),
  buildIssue('issue-exp-12', 'cert-032', 'Expiring / Expired', 'Staging frontend cert expires today', 'Renew from CA'),
];

const pqcRows: ClmIssueRow[] = [
  buildIssue('issue-pqc-01', 'cert-001', 'PQC Migration', 'RSA-2048 wildcard remains quantum-vulnerable', 'Migrate to PQC'),
  buildIssue('issue-pqc-02', 'cert-003', 'PQC Migration', 'RSA-2048 edge cert lacks migration plan', 'Migrate to PQC'),
  buildIssue('issue-pqc-03', 'cert-004', 'PQC Migration', 'SSO service still pinned to RSA-2048', 'Migrate to PQC'),
  buildIssue('issue-pqc-04', 'cert-007', 'PQC Migration', 'Dev wildcard cert still uses RSA-2048', 'Migrate to PQC'),
  buildIssue('issue-pqc-05', 'cert-008', 'PQC Migration', 'Vault cert uses RSA-2048 in production', 'Migrate to PQC'),
  buildIssue('issue-pqc-06', 'cert-009', 'PQC Migration', 'Mail transport still tied to RSA-2048', 'Migrate to PQC'),
  buildIssue('issue-pqc-07', 'cert-010', 'PQC Migration', 'Legacy self-signed cert requires CA migration', 'CA Switch'),
  buildIssue('issue-pqc-08', 'cert-011', 'PQC Migration', 'Payments cert still depends on RSA-2048', 'Migrate to PQC'),
  buildIssue('issue-pqc-09', 'cert-012', 'PQC Migration', 'Auth gateway chain not PQ-ready', 'Migrate to PQC'),
  buildIssue('issue-pqc-10', 'cert-013', 'PQC Migration', 'RSA-1024 vault cert is below minimum strength', 'Revoke & Reissue'),
  buildIssue('issue-pqc-11', 'cert-015', 'PQC Migration', 'Mail relay cert needs PQC cutover', 'Migrate to PQC'),
  buildIssue('issue-pqc-12', 'cert-016', 'PQC Migration', 'ECC edge cert lacks hybrid roadmap', 'Migrate to PQC'),
  buildIssue('issue-pqc-13', 'cert-017', 'PQC Migration', 'RSA-1024 API gateway cert is non-compliant', 'Revoke & Reissue'),
  buildIssue('issue-pqc-14', 'cert-018', 'PQC Migration', 'Internal wildcard has no PQC migration owner', 'Migrate to PQC'),
  buildIssue('issue-pqc-15', 'cert-019', 'PQC Migration', 'Database cert still anchored to RSA-2048', 'Migrate to PQC'),
  buildIssue('issue-pqc-16', 'cert-020', 'PQC Migration', 'Monitoring cert needs PQC-ready issuance template', 'CA Switch'),
  buildIssue('issue-pqc-17', 'cert-023', 'PQC Migration', 'LDAP cert relies on RSA-1024', 'Revoke & Reissue'),
  buildIssue('issue-pqc-18', 'cert-024', 'PQC Migration', 'SSO platform cert lacks hybrid validation', 'Migrate to PQC'),
  buildIssue('issue-pqc-19', 'cert-026', 'PQC Migration', 'Logging cert is on legacy CA profile', 'CA Switch'),
  buildIssue('issue-pqc-20', 'cert-029', 'PQC Migration', 'Storage endpoint cert has no PQC roadmap', 'Migrate to PQC'),
  buildIssue('issue-pqc-21', 'cert-030', 'PQC Migration', 'Proxy cert is still RSA-2048', 'Migrate to PQC'),
  buildIssue('issue-pqc-22', 'cert-031', 'PQC Migration', 'Developer API cert misses PQC-ready enrollment', 'Migrate to PQC'),
  buildIssue('issue-pqc-23', 'cert-032', 'PQC Migration', 'Staging frontend cert remains RSA-1024', 'Revoke & Reissue'),
  buildIssue('issue-pqc-24', 'cert-033', 'PQC Migration', 'Test gateway cert lacks PQC-aligned template', 'CA Switch'),
  buildIssue('issue-pqc-25', 'cert-035', 'PQC Migration', 'DR site cert is not on hybrid crypto plan', 'Migrate to PQC'),
];

const orphanedRows: ClmIssueRow[] = [
  buildIssue('issue-orp-01', 'cert-018', 'Orphaned', 'Wildcard certificate has no accountable owner', 'Revoke & Reissue'),
  buildIssue('issue-orp-02', 'cert-029', 'Orphaned', 'Storage endpoint cert is unassigned', 'Revoke & Reissue'),
];

const policyRows: ClmIssueRow[] = [
  buildIssue('issue-pol-01', 'cert-013', 'Policy Violation', 'Vault cert violates minimum key length policy', 'CA Switch'),
];

export const clmCertificates = allCertificates;
export const clmIssues = [...expiryRows, ...pqcRows, ...orphanedRows, ...policyRows];

export const clmIssueFilters = [
  { id: 'all', label: 'All Issues', count: 43 },
  { id: 'expiring', label: 'Expiring / Expired', count: 12 },
  { id: 'pqc', label: 'PQC Migration' },
  { id: 'orphaned', label: 'Orphaned' },
  { id: 'policy', label: 'Policy Violations' },
  { id: 'codesigning', label: 'Code Signing', count: 3 },
] as const;

export const policyRequestsSeed: PolicyRequestRow[] = [
  {
    id: 'REQ-41028',
    action: 'Enroll',
    certificateTarget: 'api.example.com',
    requestedBy: 'Sarah Chen',
    created: '5 min ago',
    status: 'Pending',
    subject: 'api.example.com',
    targetCA: 'DigiCert Global G2',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 09:10', status: 'active', details: [{ label: 'Display Name', value: 'API Edge Enrollment' }, { label: 'Category', value: 'TLS' }] },
      { label: 'Request Creation', timestamp: 'Queued', status: 'pending', details: [{ label: 'Requested By', value: 'Sarah Chen' }] },
      { label: 'CA Submission', timestamp: 'Pending', status: 'pending', details: [{ label: 'Target CA', value: 'DigiCert Global G2' }] },
      { label: 'Certificate Issued', timestamp: 'Pending', status: 'pending', details: [{ label: 'Delivery', value: 'Policy queue' }] },
    ],
  },
  {
    id: 'REQ-41021',
    action: 'Push to Device',
    certificateTarget: 'payments.acmecorp.com -> nginx-prod-01',
    requestedBy: 'Mike Rodriguez',
    created: '18 min ago',
    status: 'In Progress',
    subject: 'payments.acmecorp.com',
    targetCA: 'DigiCert',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 08:57', status: 'done', details: [{ label: 'Certificate', value: 'payments.acmecorp.com' }, { label: 'Target', value: 'nginx-prod-01' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 08:59', status: 'done', details: [{ label: 'Device Type', value: 'Nginx' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 09:02', status: 'active', details: [{ label: 'Channel', value: 'Push workflow' }] },
      { label: 'Certificate Issued', timestamp: 'Waiting', status: 'pending', details: [{ label: 'Result', value: 'Awaiting confirmation' }] },
    ],
  },
  {
    id: 'REQ-41019',
    action: 'Generate CSR',
    certificateTarget: 'vault.internal.acmecorp.com',
    requestedBy: 'Lisa Park',
    created: '42 min ago',
    status: 'Completed',
    subject: 'vault.internal.acmecorp.com',
    targetCA: 'Entrust',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 08:31', status: 'done', details: [{ label: 'Key Type', value: 'RSA' }, { label: 'Key Size', value: '4096' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 08:34', status: 'done', details: [{ label: 'Org', value: 'AcmeCorp' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 08:36', status: 'done', details: [{ label: 'Hash', value: 'SHA-384' }] },
      { label: 'Certificate Issued', timestamp: '2026-04-22 08:39', status: 'done', details: [{ label: 'Output', value: 'CSR downloaded' }] },
    ],
  },
  {
    id: 'REQ-41014',
    action: 'SSL Check',
    certificateTarget: 'auth.acmecorp.com:443',
    requestedBy: 'James Wilson',
    created: '1 hour ago',
    status: 'Failed',
    subject: 'auth.acmecorp.com',
    targetCA: 'Let\'s Encrypt R3',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 08:05', status: 'done', details: [{ label: 'Hostname', value: 'auth.acmecorp.com' }, { label: 'Port', value: '443' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 08:06', status: 'done', details: [{ label: 'Mode', value: 'Remote chain analysis' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 08:07', status: 'failed', details: [{ label: 'Resolver', value: 'prod-dns-01' }], error: 'Handshake failed because the endpoint served an incomplete intermediate chain.' },
      { label: 'Certificate Issued', timestamp: 'Not reached', status: 'pending', details: [{ label: 'Result', value: 'Blocked by failed validation' }] },
    ],
  },
  {
    id: 'REQ-41010',
    action: 'Enroll',
    certificateTarget: 'cdn-edge-01.acmecorp.com',
    requestedBy: 'CDN Team',
    created: '2 hours ago',
    status: 'Completed',
    subject: 'cdn-edge-01.acmecorp.com',
    targetCA: 'Entrust',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 07:12', status: 'done', details: [{ label: 'Template', value: 'Edge TLS OV' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 07:14', status: 'done', details: [{ label: 'Approvals', value: 'Auto-approved' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 07:16', status: 'done', details: [{ label: 'CA Account', value: 'Entrust Enterprise' }] },
      { label: 'Certificate Issued', timestamp: '2026-04-22 07:19', status: 'done', details: [{ label: 'Result', value: 'Certificate stored' }] },
    ],
  },
  {
    id: 'REQ-41009',
    action: 'Push to Device',
    certificateTarget: 'mail.acmecorp.com -> iis-mail-01',
    requestedBy: 'IT Operations',
    created: '3 hours ago',
    status: 'Pending',
    subject: 'mail.acmecorp.com',
    targetCA: 'DigiCert',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 06:48', status: 'done', details: [{ label: 'Target', value: 'iis-mail-01' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 06:51', status: 'active', details: [{ label: 'Credential Mode', value: 'Username + Password' }] },
      { label: 'CA Submission', timestamp: 'Pending', status: 'pending', details: [{ label: 'Workflow', value: 'Push to Device' }] },
      { label: 'Certificate Issued', timestamp: 'Pending', status: 'pending', details: [{ label: 'Verification', value: 'Awaiting execution' }] },
    ],
  },
  {
    id: 'REQ-41007',
    action: 'Generate CSR',
    certificateTarget: 'proxy.acmecorp.com',
    requestedBy: 'Platform Engineering',
    created: '4 hours ago',
    status: 'Completed',
    subject: 'proxy.acmecorp.com',
    targetCA: 'DigiCert',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 05:44', status: 'done', details: [{ label: 'OU', value: 'Platform Engineering' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 05:47', status: 'done', details: [{ label: 'Country', value: 'US' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 05:49', status: 'done', details: [{ label: 'Hash', value: 'SHA-256' }] },
      { label: 'Certificate Issued', timestamp: '2026-04-22 05:52', status: 'done', details: [{ label: 'Result', value: 'CSR copied to clipboard' }] },
    ],
  },
  {
    id: 'REQ-41004',
    action: 'SSL Check',
    certificateTarget: 'api.internal.acmecorp.com:443',
    requestedBy: 'Security Team',
    created: '5 hours ago',
    status: 'In Progress',
    subject: 'api.internal.acmecorp.com',
    targetCA: 'Entrust L1K',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 04:58', status: 'done', details: [{ label: 'Hostname', value: 'api.internal.acmecorp.com' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 05:01', status: 'done', details: [{ label: 'Port', value: '443' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 05:03', status: 'active', details: [{ label: 'TLS Version', value: 'Evaluating endpoint' }] },
      { label: 'Certificate Issued', timestamp: 'Waiting', status: 'pending', details: [{ label: 'Result', value: 'Check in progress' }] },
    ],
  },
  {
    id: 'REQ-41002',
    action: 'Enroll',
    certificateTarget: 'sso.acmecorp.com',
    requestedBy: 'Identity & Access',
    created: '6 hours ago',
    status: 'Failed',
    subject: 'sso.acmecorp.com',
    targetCA: 'Let\'s Encrypt',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 03:51', status: 'done', details: [{ label: 'Display Name', value: 'SSO Renewal' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 03:53', status: 'done', details: [{ label: 'Approver', value: 'identity-ops@acme.com' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 03:56', status: 'failed', details: [{ label: 'Validation', value: 'DNS' }], error: 'DNS validation failed because the expected TXT record was not found.' },
      { label: 'Certificate Issued', timestamp: 'Not reached', status: 'pending', details: [{ label: 'Result', value: 'Awaiting retry' }] },
    ],
  },
  {
    id: 'REQ-40998',
    action: 'Push to Device',
    certificateTarget: 'monitoring.acmecorp.com -> tomcat-mon-02',
    requestedBy: 'SRE Team',
    created: '8 hours ago',
    status: 'Completed',
    subject: 'monitoring.acmecorp.com',
    targetCA: 'Let\'s Encrypt',
    stages: [
      { label: 'Enrollment Request', timestamp: '2026-04-22 01:32', status: 'done', details: [{ label: 'Target', value: 'tomcat-mon-02' }] },
      { label: 'Request Creation', timestamp: '2026-04-22 01:34', status: 'done', details: [{ label: 'Device Type', value: 'Tomcat' }] },
      { label: 'CA Submission', timestamp: '2026-04-22 01:36', status: 'done', details: [{ label: 'Credential Mode', value: 'SSH Key' }] },
      { label: 'Certificate Issued', timestamp: '2026-04-22 01:39', status: 'done', details: [{ label: 'Result', value: 'Deployment verified' }] },
    ],
  },
];

export const sslCheckMock = {
  hostname: 'api.example.com',
  port: 443,
  tlsVersion: 'TLS 1.3',
  crsScore: 86,
  algorithm: 'ECC P-256',
  keySize: '256',
  vulnerabilities: [
    { label: 'BEAST', vulnerable: false },
    { label: 'POODLE', vulnerable: false },
    { label: 'ROBOT', vulnerable: true },
  ],
  chain: [
    {
      role: 'Leaf',
      cn: 'api.example.com',
      issuer: 'DigiCert TLS RSA SHA256 2020 CA1',
      validFrom: '2026-01-12',
      validTo: '2026-05-12',
      daysRemaining: 20,
      serial: '4A:19:88:10:2C:7D:9B:41',
    },
    {
      role: 'Intermediate',
      cn: 'DigiCert TLS RSA SHA256 2020 CA1',
      issuer: 'DigiCert Global Root G2',
      validFrom: '2024-03-01',
      validTo: '2030-03-01',
      daysRemaining: 1410,
      serial: '1C:72:55:AB:91:33:4D:02',
    },
    {
      role: 'Root',
      cn: 'DigiCert Global Root G2',
      issuer: 'DigiCert Global Root G2',
      validFrom: '2013-08-01',
      validTo: '2038-01-15',
      daysRemaining: 4286,
      serial: '03:3A:F1:E6:A7:11:A9:A0',
    },
  ],
};
