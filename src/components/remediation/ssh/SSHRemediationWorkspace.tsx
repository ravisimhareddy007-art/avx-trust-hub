import React, { useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { computeCRS } from '@/lib/risk/crs';
import { Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Atom,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  KeyRound,
  Lock,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

const SSH_KEYS = mockAssets.filter(a => a.type === 'SSH Key');
const SSH_CERTS = mockAssets.filter(a => a.type === 'SSH Certificate');
const ALL_SSH = [...SSH_KEYS, ...SSH_CERTS];

type SSHRisk = 'Shared' | 'Weak' | 'Rogue' | 'Misplaced' | 'Suspicious';
type KeyStatus = 'Managed' | 'Monitored';
type ComplianceStatus = 'Compliant' | 'Non-Compliant';
type WTab = 'remediation' | 'provisioning' | 'certificates' | 'migration';
type DetailTab = 'details' | 'map';
type SortCol = 'crs' | 'name' | 'age' | 'algorithm';

type AssociatedUser = { ip: string; username: string };
type FingerprintFormat = { format: string; value: string };

type SSHWorkspaceAsset = CryptoAsset & {
  crs?: number;
  fingerprint?: string;
  fingerprintFormats?: FingerprintFormat[];
  associatedUsers?: AssociatedUser[];
  filePaths?: string[];
  keyComplianceGroup?: string;
  keyStatus?: KeyStatus;
  sshRiskStatus?: SSHRisk[];
  complianceStatus?: ComplianceStatus;
  keyAge?: number;
};

const crsColor = (n: number) => (n >= 80 ? 'text-coral' : n >= 60 ? 'text-amber' : n >= 30 ? 'text-purple' : 'text-teal');
const crsBgCls = (n: number) => (n >= 80 ? 'bg-coral/10 text-coral' : n >= 60 ? 'bg-amber/10 text-amber' : n >= 30 ? 'bg-purple/10 text-purple' : 'bg-teal/10 text-teal');
const riskDotCls = (risk: SSHRisk) => ({ Rogue: 'bg-coral', Weak: 'bg-coral', Suspicious: 'bg-amber', Shared: 'bg-amber', Misplaced: 'bg-amber' }[risk]);

const sharedCount = (SSH_KEYS as SSHWorkspaceAsset[]).filter(k => k.sshRiskStatus?.includes('Shared')).length;
const weakCount = (ALL_SSH as SSHWorkspaceAsset[]).filter(k => k.sshRiskStatus?.includes('Weak')).length;
const rogueCount = (SSH_KEYS as SSHWorkspaceAsset[]).filter(k => k.sshRiskStatus?.includes('Rogue')).length;
const misplacedCount = (SSH_KEYS as SSHWorkspaceAsset[]).filter(k => k.sshRiskStatus?.includes('Misplaced')).length;
const suspiciousCount = (SSH_KEYS as SSHWorkspaceAsset[]).filter(k => k.sshRiskStatus?.includes('Suspicious')).length;

const rotationDueKeys = (SSH_KEYS as SSHWorkspaceAsset[]).filter(k => k.rotationFrequency !== 'Never' && !k.autoRenewal && (k.keyAge || 0) > parseInt(k.rotationFrequency || '0', 10));

const copyText = async (value: string, message: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error('Copy failed');
  }
};

const workOrderId = () => `WO-SSH-${Math.floor(1000 + Math.random() * 9000)}`;

const parseRotationDays = (value?: string) => {
  if (!value || value === 'Never') return 0;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const md5Fallbacks: Record<string, string> = {
  'ssh-001': 'MD5:a1:b2:c3:d4:e5:f6',
  'ssh-002': 'MD5:6b:77:09:de:11:29',
  'ssh-003': 'MD5:4f:91:7a:2c:88:10',
  'ssh-004': 'MD5:ac:18:52:0f:41:12',
  'ssh-005': 'MD5:da:71:02:7e:9a:63',
  'ssh-006': 'MD5:d4:e5:f6:10:20:30',
  'ssh-007': 'MD5:11:22:33:44:55:66',
  'ssh-008': 'MD5:aa:bb:cc:dd:ee:ff',
  'ssh-009': 'MD5:55:66:77:88:99:aa',
  'ssh-010': 'MD5:99:aa:bb:cc:dd:ee',
  'ssh-011': 'MD5:cc:dd:ee:11:22:33',
  'ssh-012': 'MD5:ff:00:11:22:33:44',
  'ssh-013': 'MD5:22:33:44:55:66:77',
  'sshcert-001': 'MD5:30:10:99:fe:88:12',
  'sshcert-002': 'MD5:8e:72:4c:15:30:ef',
};

const sshOverrides: Record<string, Partial<SSHWorkspaceAsset>> = {
  'ssh-001': {
    fingerprint: 'SHA256:nThbg6kXUp...',
    fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:nThbg6kXUp...' }, { format: 'MD5', value: md5Fallbacks['ssh-001'] }],
    associatedUsers: [{ ip: '10.2.14.55', username: 'admin' }, { ip: '10.2.14.55', username: 'dbuser' }],
    filePaths: ['10.2.14.55~~/home/admin/.ssh/authorized_keys', '10.2.14.55~~/home/dbuser/.ssh/authorized_keys'],
    keyComplianceGroup: 'Default_Key_Group',
    keyStatus: 'Monitored',
    sshRiskStatus: ['Suspicious'],
    complianceStatus: 'Non-Compliant',
    keyAge: 307,
  },
  'ssh-002': {
    fingerprint: 'SHA256:Xk2Lg8mPqR...',
    fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Xk2Lg8mPqR...' }, { format: 'MD5', value: md5Fallbacks['ssh-002'] }],
    associatedUsers: [{ ip: '10.1.5.100', username: 'jenkins' }],
    filePaths: ['10.1.5.100~~/home/jenkins/.ssh/id_ed25519'],
    keyComplianceGroup: 'CI_CD_Key_Group',
    keyStatus: 'Managed',
    sshRiskStatus: [],
    complianceStatus: 'Compliant',
    keyAge: 207,
  },
  'ssh-003': {
    fingerprint: 'SHA256:Rm7pQ2xWyZ...',
    fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Rm7pQ2xWyZ...' }, { format: 'MD5', value: md5Fallbacks['ssh-003'] }],
    associatedUsers: [{ ip: '10.4.0.5', username: 'k8s-admin' }, { ip: '10.4.1.10', username: 'ec2-user' }],
    filePaths: ['10.4.1.10~~/home/ec2-user/.ssh/authorized_keys', '10.4.1.11~~/home/ec2-user/.ssh/authorized_keys', '10.4.1.12~~/home/ec2-user/.ssh/authorized_keys'],
    keyComplianceGroup: 'Infra_Key_Group',
    keyStatus: 'Managed',
    sshRiskStatus: ['Weak'],
    complianceStatus: 'Non-Compliant',
    keyAge: 165,
  },
  'sshcert-001': {
    fingerprint: 'KRL-2026-0042',
    fingerprintFormats: [{ format: 'SHA256', value: 'KRL-2026-0042' }, { format: 'MD5', value: md5Fallbacks['sshcert-001'] }],
    associatedUsers: [{ ip: '10.1.5.100', username: 'jenkins' }],
    filePaths: ['10.1.5.100~~/home/jenkins/.ssh/id_ed25519-cert.pub'],
    keyComplianceGroup: 'CI_CD_Cert_Group',
    keyStatus: 'Managed',
    sshRiskStatus: [],
    complianceStatus: 'Compliant',
    keyAge: 52,
  },
  'sshcert-002': {
    fingerprint: 'KRL-2026-0087',
    fingerprintFormats: [{ format: 'SHA256', value: 'KRL-2026-0087' }, { format: 'MD5', value: md5Fallbacks['sshcert-002'] }],
    associatedUsers: [{ ip: '10.4.0.5', username: 'k8s-admin' }, { ip: '10.4.1.10', username: 'ec2-user' }, { ip: '10.4.1.11', username: 'ec2-user' }],
    filePaths: ['10.4.1.10~~/etc/ssh/ssh_host_ed25519_key-cert.pub', '10.4.1.11~~/etc/ssh/ssh_host_ed25519_key-cert.pub'],
    keyComplianceGroup: 'Infra_Cert_Group',
    keyStatus: 'Managed',
    sshRiskStatus: ['Weak'],
    complianceStatus: 'Non-Compliant',
    keyAge: 99,
  },
};

const extraSSHKeys: SSHWorkspaceAsset[] = [
  {
    id: 'ssh-004', name: 'bastion-admin-key', type: 'SSH Key', commonName: 'bastion-01.acmecorp.com', caIssuer: 'N/A', algorithm: 'Ed25519', keyLength: '256', serial: 'SHA256:Bt9mY7qLp2...', owner: 'Security Operations', team: 'Security Operations', application: 'Bastion Access', environment: 'Production', infrastructure: 'aws-us-east-1-prod', discoverySource: 'Endpoint Agent', issueDate: '2026-01-01', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2026-01-01', autoRenewal: false, rotationFrequency: '180 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 1, tags: ['bastion', 'admin-access'], sshEndpoints: [{ host: 'bastion-01.acmecorp.com', ip: '52.14.88.201', port: 22, role: 'host', lastSeen: '2026-04-21 09:22' }], fingerprint: 'SHA256:Bt9mY7qLp2...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Bt9mY7qLp2...' }, { format: 'MD5', value: md5Fallbacks['ssh-004'] }], associatedUsers: [{ ip: '52.14.88.201', username: 'ec2-user' }], filePaths: ['52.14.88.201~~/home/ec2-user/.ssh/authorized_keys'], keyComplianceGroup: 'Security_Key_Group', keyStatus: 'Managed', sshRiskStatus: [], complianceStatus: 'Compliant', keyAge: 112,
  },
  {
    id: 'ssh-005', name: 'gitlab-runner-orphaned-key', type: 'SSH Key', commonName: 'gitlab-runner.internal', caIssuer: 'N/A', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SHA256:Gi1bY8nQx4...', owner: 'Unassigned', team: 'DevOps', application: 'GitLab Runner', environment: 'Production', infrastructure: 'on-prem-dc1', discoverySource: 'SSH Host Scan', issueDate: '2025-03-15', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-03-15', autoRenewal: false, rotationFrequency: 'Never', status: 'Orphaned', pqcRisk: 'High', policyViolations: 2, dependencyCount: 2, tags: ['gitlab', 'orphaned'], sshEndpoints: [{ host: 'gitlab-runner-01.internal', ip: '10.1.5.200', port: 22, role: 'client', lastSeen: '2026-04-21 04:05' }, { host: 'gitlab-runner-02.internal', ip: '10.1.5.201', port: 22, role: 'client', lastSeen: '2026-04-21 04:05' }], fingerprint: 'SHA256:Gi1bY8nQx4...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Gi1bY8nQx4...' }, { format: 'MD5', value: md5Fallbacks['ssh-005'] }], associatedUsers: [], filePaths: ['10.1.5.200~~/home/gitlab-runner/.ssh/id_rsa', '10.1.5.201~~/home/gitlab-runner/.ssh/id_rsa'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Rogue', 'Suspicious'], complianceStatus: 'Non-Compliant', keyAge: 397,
  },
  {
    id: 'ssh-006', name: 'payments-auth-key', type: 'SSH Key', commonName: 'payments-auth.internal', caIssuer: 'N/A', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SHA256:Kp9mQ3rX...', owner: 'Payments Engineering', team: 'Payments Engineering', application: 'Payments Auth Service', environment: 'Production', infrastructure: 'aws-eks-prod', discoverySource: 'Endpoint Agent', issueDate: '2025-08-22', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-08-22', autoRenewal: false, rotationFrequency: 'Never', status: 'Active', pqcRisk: 'High', policyViolations: 1, dependencyCount: 3, tags: ['payments', 'shared-key'], sshEndpoints: [{ host: 'payments-auth-01.internal', ip: '10.2.1.10', port: 22, role: 'host', lastSeen: '2026-04-21 03:10' }, { host: 'payments-auth-02.internal', ip: '10.2.1.11', port: 22, role: 'host', lastSeen: '2026-04-21 03:09' }, { host: 'payments-auth-03.internal', ip: '10.2.1.12', port: 22, role: 'host', lastSeen: '2026-04-21 03:08' }], fingerprint: 'SHA256:Kp9mQ3rX...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Kp9mQ3rX...' }, { format: 'MD5', value: md5Fallbacks['ssh-006'] }], associatedUsers: [{ ip: '10.2.1.10', username: 'payments-svc' }, { ip: '10.2.1.11', username: 'payments-svc' }, { ip: '10.2.1.12', username: 'payments-svc' }], filePaths: ['10.2.1.10~~/home/payments-svc/.ssh/authorized_keys', '10.2.1.11~~/home/payments-svc/.ssh/authorized_keys', '10.2.1.12~~/home/payments-svc/.ssh/authorized_keys'], keyComplianceGroup: 'Payments_Key_Group', keyStatus: 'Managed', sshRiskStatus: ['Shared'], complianceStatus: 'Non-Compliant', keyAge: 245,
  },
  {
    id: 'ssh-007', name: 'legacy-api-rsa1024', type: 'SSH Key', commonName: 'legacy-api.internal', caIssuer: 'N/A', algorithm: 'RSA-1024', keyLength: '1024', serial: 'SHA256:Yz3nM8wK...', owner: 'IT Operations', team: 'IT Operations', application: 'Legacy API', environment: 'Production', infrastructure: 'on-prem-dc2', discoverySource: 'SSH Host Scan', issueDate: '2024-11-29', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2024-11-29', autoRenewal: false, rotationFrequency: 'Never', status: 'Active', pqcRisk: 'Critical', policyViolations: 3, dependencyCount: 1, tags: ['legacy', 'weak-key', 'rsa-1024'], sshEndpoints: [{ host: 'legacy-api.internal', ip: '10.5.2.30', port: 22, role: 'host', lastSeen: '2026-04-21 05:10' }], fingerprint: 'SHA256:Yz3nM8wK...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Yz3nM8wK...' }, { format: 'MD5', value: md5Fallbacks['ssh-007'] }], associatedUsers: [{ ip: '10.5.2.30', username: 'apiuser' }], filePaths: ['10.5.2.30~~/home/apiuser/.ssh/authorized_keys'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Weak', 'Suspicious'], complianceStatus: 'Non-Compliant', keyAge: 512,
  },
  {
    id: 'ssh-008', name: 'rogue-found-prod-db', type: 'SSH Key', commonName: 'prod-db-01.internal', caIssuer: 'N/A', algorithm: 'ECDSA', keyLength: '256', serial: 'SHA256:Rg6qL2mN...', owner: 'Unassigned', team: 'Unknown', application: 'Unknown Access Path', environment: 'Production', infrastructure: 'aws-us-east-1-prod', discoverySource: 'SSH Host Scan', issueDate: '2026-04-06', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2026-04-06', autoRenewal: false, rotationFrequency: 'Never', status: 'Active', pqcRisk: 'Medium', policyViolations: 2, dependencyCount: 1, tags: ['rogue', 'unauthorized'], sshEndpoints: [{ host: 'prod-db-01.internal', ip: '10.2.14.55', port: 22, role: 'host', lastSeen: '2026-04-21 02:14' }], fingerprint: 'SHA256:Rg6qL2mN...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Rg6qL2mN...' }, { format: 'MD5', value: md5Fallbacks['ssh-008'] }], associatedUsers: [{ ip: '10.2.14.55', username: 'unknown-user' }], filePaths: ['10.2.14.55~~/root/.ssh/authorized_keys'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Rogue'], complianceStatus: 'Non-Compliant', keyAge: 18,
  },
  {
    id: 'ssh-009', name: 'misplaced-hr-key', type: 'SSH Key', commonName: 'hr-systems.internal', caIssuer: 'N/A', algorithm: 'Ed25519', keyLength: '256', serial: 'SHA256:Tv5pK7nW...', owner: 'HR Systems', team: 'People Operations', application: 'HR Systems', environment: 'Production', infrastructure: 'azure-eastus-prod', discoverySource: 'Endpoint Agent', issueDate: '2026-01-24', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2026-01-24', autoRenewal: false, rotationFrequency: '365 days', status: 'Active', pqcRisk: 'Low', policyViolations: 1, dependencyCount: 2, tags: ['misplaced', 'hr'], sshEndpoints: [{ host: 'hr-app-01.internal', ip: '10.6.3.20', port: 22, role: 'client', lastSeen: '2026-04-21 06:44' }, { host: 'prod-db-01.internal', ip: '10.2.14.55', port: 22, role: 'host', lastSeen: '2026-04-21 06:20' }], fingerprint: 'SHA256:Tv5pK7nW...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Tv5pK7nW...' }, { format: 'MD5', value: md5Fallbacks['ssh-009'] }], associatedUsers: [{ ip: '10.6.3.20', username: 'hruser' }], filePaths: ['10.6.3.20~~/etc/ssh/authorized_keys', '10.2.14.55~~/home/hruser/.ssh/authorized_keys'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Misplaced'], complianceStatus: 'Non-Compliant', keyAge: 89,
  },
  {
    id: 'ssh-010', name: 'suspicious-root-key', type: 'SSH Key', commonName: 'dc1-root.internal', caIssuer: 'N/A', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SHA256:Xw8rJ4vB...', owner: 'Unassigned', team: 'Security Operations', application: 'Root Shell Access', environment: 'Production', infrastructure: 'on-prem-dc1', discoverySource: 'SSH Host Scan', issueDate: '2026-04-17', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2026-04-17', autoRenewal: false, rotationFrequency: 'Never', status: 'Active', pqcRisk: 'High', policyViolations: 3, dependencyCount: 1, tags: ['suspicious', 'root-access'], sshEndpoints: [{ host: 'dc1-admin.internal', ip: '10.1.1.5', port: 22, role: 'host', lastSeen: '2026-04-21 07:01' }], fingerprint: 'SHA256:Xw8rJ4vB...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Xw8rJ4vB...' }, { format: 'MD5', value: md5Fallbacks['ssh-010'] }], associatedUsers: [{ ip: '10.1.1.5', username: 'root' }], filePaths: ['10.1.1.5~~/root/.ssh/authorized_keys'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Suspicious', 'Rogue'], complianceStatus: 'Non-Compliant', keyAge: 7,
  },
  {
    id: 'ssh-011', name: 'shared-deploy-key-staging', type: 'SSH Key', commonName: 'staging-deploy.internal', caIssuer: 'N/A', algorithm: 'Ed25519', keyLength: '256', serial: 'SHA256:Mn2kP8qR...', owner: 'DevOps', team: 'DevOps', application: 'Staging Deploy', environment: 'Staging', infrastructure: 'aws-eks-staging', discoverySource: 'Endpoint Agent', issueDate: '2025-12-09', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-12-09', autoRenewal: false, rotationFrequency: '180 days', status: 'Active', pqcRisk: 'Low', policyViolations: 1, dependencyCount: 2, tags: ['shared-key', 'staging', 'ci-cd'], sshEndpoints: [{ host: 'staging-deploy-01.internal', ip: '10.3.1.10', port: 22, role: 'host', lastSeen: '2026-04-21 08:10' }, { host: 'staging-deploy-02.internal', ip: '10.3.1.11', port: 22, role: 'host', lastSeen: '2026-04-21 08:09' }], fingerprint: 'SHA256:Mn2kP8qR...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Mn2kP8qR...' }, { format: 'MD5', value: md5Fallbacks['ssh-011'] }], associatedUsers: [{ ip: '10.3.1.10', username: 'deploy-svc' }, { ip: '10.3.1.11', username: 'deploy-svc' }], filePaths: ['10.3.1.10~~/home/deploy-svc/.ssh/authorized_keys', '10.3.1.11~~/home/deploy-svc/.ssh/authorized_keys'], keyComplianceGroup: 'CI_CD_Key_Group', keyStatus: 'Managed', sshRiskStatus: ['Shared'], complianceStatus: 'Non-Compliant', keyAge: 134,
  },
  {
    id: 'ssh-012', name: 'data-pipeline-weak-key', type: 'SSH Key', commonName: 'data-pipeline.internal', caIssuer: 'N/A', algorithm: 'DSA', keyLength: '1024', serial: 'SHA256:Dq3wS9xY...', owner: 'Data Engineering', team: 'Data Engineering', application: 'Data Pipeline', environment: 'Production', infrastructure: 'gcp-us-central1', discoverySource: 'SSH Host Scan', issueDate: '2024-08-07', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2024-08-07', autoRenewal: false, rotationFrequency: 'Never', status: 'Active', pqcRisk: 'Critical', policyViolations: 2, dependencyCount: 1, tags: ['weak-key', 'dsa', 'legacy'], sshEndpoints: [{ host: 'data-pipeline.internal', ip: '10.7.4.15', port: 22, role: 'host', lastSeen: '2026-04-21 09:00' }], fingerprint: 'SHA256:Dq3wS9xY...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Dq3wS9xY...' }, { format: 'MD5', value: md5Fallbacks['ssh-012'] }], associatedUsers: [{ ip: '10.7.4.15', username: 'dataeng' }], filePaths: ['10.7.4.15~~/home/dataeng/.ssh/id_dsa'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Weak'], complianceStatus: 'Non-Compliant', keyAge: 623,
  },
  {
    id: 'ssh-013', name: 'dr-backup-orphaned-key', type: 'SSH Key', commonName: 'dr-backup.internal', caIssuer: 'N/A', algorithm: 'RSA-4096', keyLength: '4096', serial: 'SHA256:Lv7uH5nC...', owner: 'Unassigned', team: 'Infrastructure', application: 'Backup DR', environment: 'Production', infrastructure: 'on-prem-dc2', discoverySource: 'SSH Host Scan', issueDate: '2025-02-06', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-02-06', autoRenewal: false, rotationFrequency: 'Never', status: 'Orphaned', pqcRisk: 'High', policyViolations: 2, dependencyCount: 1, tags: ['orphaned', 'backup', 'suspicious'], sshEndpoints: [{ host: 'dr-backup.internal', ip: '10.9.1.5', port: 22, role: 'host', lastSeen: '2026-04-20 23:10' }], fingerprint: 'SHA256:Lv7uH5nC...', fingerprintFormats: [{ format: 'SHA256', value: 'SHA256:Lv7uH5nC...' }, { format: 'MD5', value: md5Fallbacks['ssh-013'] }], associatedUsers: [], filePaths: ['10.9.1.5~~/home/backup/.ssh/authorized_keys'], keyComplianceGroup: 'Default_Key_Group', keyStatus: 'Monitored', sshRiskStatus: ['Suspicious', 'Misplaced'], complianceStatus: 'Non-Compliant', keyAge: 412,
  },
];

function normalizeSSHAsset(asset: SSHWorkspaceAsset): SSHWorkspaceAsset {
  const override = sshOverrides[asset.id] || {};
  const merged = { ...asset, ...override };
  const fingerprint = merged.fingerprint || merged.serial;
  return {
    ...merged,
    fingerprint,
    fingerprintFormats: merged.fingerprintFormats || [
      { format: 'SHA256', value: fingerprint },
      { format: 'MD5', value: md5Fallbacks[merged.id] || 'MD5:00:11:22:33:44:55' },
    ],
    associatedUsers: merged.associatedUsers || [],
    filePaths: merged.filePaths || [],
    keyComplianceGroup: merged.keyComplianceGroup || 'Default_Key_Group',
    keyStatus: merged.keyStatus || 'Managed',
    sshRiskStatus: merged.sshRiskStatus || [],
    complianceStatus: merged.complianceStatus || (merged.policyViolations > 0 ? 'Non-Compliant' : 'Compliant'),
    keyAge: merged.keyAge || Math.max(0, Math.round((new Date('2026-04-22').getTime() - new Date(merged.issueDate).getTime()) / (1000 * 60 * 60 * 24))),
  };
}

function getRecommendedAlgorithm(algorithm: string) {
  if (algorithm === 'RSA-1024') return 'RSA-4096';
  if (algorithm === 'DSA') return 'Ed25519';
  if (algorithm === 'RSA-2048') return 'Ed25519 or RSA-4096';
  return 'Ed25519';
}

function getFindingItems(key: SSHWorkspaceAsset) {
  const findings: { severity: 'Critical' | 'High' | 'Medium'; text: string }[] = [];
  const risks = key.sshRiskStatus || [];
  if (risks.includes('Rogue')) findings.push({ severity: 'Critical', text: 'Unauthorized key — not provisioned through AppViewX' });
  if (risks.includes('Weak')) findings.push({ severity: 'High', text: `Weak algorithm (${key.algorithm}) — upgrade required` });
  if (risks.includes('Shared')) findings.push({ severity: 'High', text: `Shared key — same key used on ${key.filePaths?.length || 0} hosts` });
  if (risks.includes('Misplaced')) findings.push({ severity: 'Medium', text: 'Key found in unexpected file path' });
  if (risks.includes('Suspicious')) findings.push({ severity: 'High', text: 'Anomalous key activity detected' });
  if ((key.policyViolations || 0) > 0) {
    Array.from({ length: key.policyViolations }).forEach((_, index) => {
      findings.push({ severity: 'Medium', text: `Policy violation ${index + 1} requires remediation review` });
    });
  }
  if (key.owner === 'Unassigned') findings.push({ severity: 'Medium', text: 'No owner assigned' });
  if (key.rotationFrequency === 'Never') findings.push({ severity: 'Medium', text: `No rotation policy — key age: ${key.keyAge} days` });
  if (key.complianceStatus === 'Non-Compliant') findings.push({ severity: 'High', text: 'Non-compliant with key policy' });
  return findings.length ? findings : [{ severity: 'Medium', text: 'No immediate findings — continue monitoring' }];
}

function badgeTone(risk: SSHRisk) {
  return risk === 'Rogue' || risk === 'Weak' ? 'bg-coral/10 text-coral border-coral/20' : 'bg-amber/10 text-amber border-amber/20';
}

function keyStatusTone(status?: KeyStatus) {
  return status === 'Managed' ? 'bg-teal/10 text-teal border-teal/20' : 'bg-amber/10 text-amber border-amber/20';
}

function severityFill(score: number) {
  if (score >= 80) return 'hsl(var(--coral) / 0.16)';
  if (score >= 60) return 'hsl(var(--amber) / 0.16)';
  if (score >= 30) return 'hsl(var(--purple) / 0.16)';
  return 'hsl(var(--teal) / 0.16)';
}

function severityStroke(score: number) {
  if (score >= 80) return 'hsl(var(--coral))';
  if (score >= 60) return 'hsl(var(--amber))';
  if (score >= 30) return 'hsl(var(--purple))';
  return 'hsl(var(--teal))';
}

function tabBtn(active: boolean) {
  return `px-4 py-3 text-xs font-medium border-b-2 transition-colors ${active ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`;
}

function SSHKpiStrip({ counts, onFilter }: { counts: Record<SSHRisk, number>; onFilter: (risk: SSHRisk) => void }) {
  const tiles: { risk: SSHRisk; label: string; value: number; subtitle: string; border: string; valueCls: string; info?: string }[] = [
    { risk: 'Shared', label: 'SHARED KEYS', value: counts.Shared, subtitle: 'Same key on multiple hosts', border: 'border-l-amber', valueCls: 'text-amber' },
    { risk: 'Weak', label: 'WEAK KEYS', value: counts.Weak, subtitle: 'Deprecated algorithm or short key length', border: 'border-l-coral', valueCls: 'text-coral' },
    { risk: 'Rogue', label: 'ROGUE KEYS', value: counts.Rogue, subtitle: 'Found on host — not in approved inventory', border: 'border-l-coral', valueCls: 'text-coral', info: 'Rogue keys were discovered on hosts but were not provisioned through AppViewX. They represent unauthorized access.' },
    { risk: 'Misplaced', label: 'MISPLACED KEYS', value: counts.Misplaced, subtitle: 'Found in wrong path or wrong host', border: 'border-l-amber', valueCls: 'text-amber' },
    { risk: 'Suspicious', label: 'SUSPICIOUS KEYS', value: counts.Suspicious, subtitle: 'Anomalous pattern or unexpected access', border: 'border-l-amber', valueCls: 'text-amber' },
  ];

  return (
    <div className="flex gap-3">
      {tiles.map(tile => (
        <button
          key={tile.risk}
          onClick={() => onFilter(tile.risk)}
          className={`flex-1 rounded-lg border border-border border-l-4 bg-card p-3 text-left transition-all hover:shadow-md ${tile.border}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className={`text-2xl font-bold ${tile.valueCls}`}>{tile.value}</div>
              <div className="text-[10px] text-muted-foreground">{tile.label}</div>
            </div>
            {tile.info ? (
              <span title={tile.info} className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-muted-foreground">
                <Info className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-[9px] text-muted-foreground">{tile.subtitle}</div>
        </button>
      ))}
    </div>
  );
}

function SSHKeyDetailPanel({ asset, onClose, onAction }: { asset: SSHWorkspaceAsset; onClose: () => void; onAction: (action: string, key: SSHWorkspaceAsset) => void }) {
  const [tab, setTab] = useState<DetailTab>('details');
  const crs = computeCRS(asset).crs;
  const risks = asset.sshRiskStatus || [];
  const hostEndpoints = (asset.sshEndpoints || []).filter(endpoint => endpoint.role === 'host');
  const clientEndpoints = (asset.sshEndpoints || []).filter(endpoint => endpoint.role === 'client');
  const findings = getFindingItems(asset);
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (crs / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button className="w-1/5 bg-foreground/10 backdrop-blur-sm" onClick={onClose} aria-label="Close detail panel" />
      <div className="flex h-full w-4/5 flex-col border-l border-border bg-card animate-slide-in-right">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{asset.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBgCls(crs)}`}>CRS {crs}</span>
                {risks.map(risk => (
                  <span key={risk} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeTone(risk)}`}>{risk}</span>
                ))}
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground">{asset.algorithm}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${keyStatusTone(asset.keyStatus)}`}>{asset.keyStatus}</span>
              </div>
            </div>
            <button onClick={onClose} className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
            <button className={tabBtn(tab === 'details')} onClick={() => setTab('details')}>Key Details</button>
            <button className={tabBtn(tab === 'map')} onClick={() => setTab('map')}>Access Map</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'details' ? (
            <div className="grid h-full grid-cols-[260px_1fr] overflow-hidden">
              <div className="space-y-4 overflow-y-auto border-r border-border p-4">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                  {[
                    ['Key Name', asset.name],
                    ['Type', asset.type],
                    ['Algorithm', asset.algorithm],
                    ['Key Length', asset.keyLength],
                    ['Age', `${asset.keyAge} days`],
                    ['Compliance Group', asset.keyComplianceGroup || '—'],
                    ['Status', asset.keyStatus || '—'],
                    ['Compliance', asset.complianceStatus || '—'],
                    ['Owner', asset.owner],
                    ['Team', asset.team],
                    ['Environment', asset.environment],
                    ['Last Rotated', asset.lastRotated],
                    ['Rotation Frequency', asset.rotationFrequency],
                    ['Discovery Source', asset.discoverySource],
                    ['Policy Violations', String(asset.policyViolations)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-muted-foreground">{label}</div>
                      <div className={label === 'Compliance' && value === 'Non-Compliant' ? 'font-medium text-coral' : label === 'Policy Violations' && Number(value) > 0 ? 'font-medium text-amber' : 'font-medium text-foreground'}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="mb-2 text-xs font-semibold text-foreground">Fingerprint</div>
                  <div className="space-y-2">
                    {(asset.fingerprintFormats || []).map(item => (
                      <button key={`${item.format}-${item.value}`} onClick={() => copyText(item.value, 'Fingerprint copied')} className="flex w-full items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-left text-[10px] hover:bg-muted/50">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-foreground">{item.format}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{item.value}</span>
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 80 80" className="h-20 w-20">
                      <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                      <circle cx="40" cy="40" r="30" fill="none" stroke={severityStroke(crs)} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 40 40)" />
                      <text x="40" y="38" textAnchor="middle" className="fill-current text-xs font-semibold text-foreground">{crs}</text>
                      <text x="40" y="50" textAnchor="middle" className="fill-current text-[8px] text-muted-foreground">CRS</text>
                    </svg>
                    <div>
                      <div className="text-xs font-semibold text-foreground">Credential CRS</div>
                      <div className="text-[10px] text-muted-foreground">Crypto Risk Score</div>
                    </div>
                  </div>
                </div>

                {risks.length ? (
                  <div>
                    <div className="mb-2 text-xs font-semibold text-foreground">Risk Flags</div>
                    <div className="flex flex-wrap gap-2">
                      {risks.map(risk => (
                        <span key={risk} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeTone(risk)}`}>{risk}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="text-xs font-semibold text-foreground">Findings</div>
                  {findings.map((finding, index) => (
                    <div key={`${finding.text}-${index}`} className="rounded-md bg-muted/20 p-2 text-[10px]">
                      <div className={`font-medium ${finding.severity === 'Critical' ? 'text-coral' : finding.severity === 'High' ? 'text-amber' : 'text-purple'}`}>{finding.severity}</div>
                      <div className="mt-0.5 text-muted-foreground">{finding.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto p-4">
                <section>
                  <div className="text-xs font-semibold text-foreground">Associated Users ({asset.associatedUsers?.length || 0})</div>
                  <div className="mb-2 text-[9px] text-muted-foreground">IP~~username format — hosts where this key grants access</div>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-[10px]">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">IP Address</th>
                          <th className="px-3 py-2 text-left font-medium">Username</th>
                          <th className="px-3 py-2 text-left font-medium">Access Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(asset.associatedUsers || []).length ? (asset.associatedUsers || []).map(user => {
                          const isHost = (asset.sshEndpoints || []).some(endpoint => endpoint.role === 'host' && endpoint.ip === user.ip);
                          return (
                            <tr key={`${user.ip}-${user.username}`} className="border-t border-border">
                              <td className="px-3 py-2 font-mono text-foreground">{user.ip}</td>
                              <td className="px-3 py-2 text-foreground">{user.username}</td>
                              <td className="px-3 py-2 text-muted-foreground">{isHost ? 'Host Access' : 'Client'}</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No associated users found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <div className="text-xs font-semibold text-foreground">File Paths ({asset.filePaths?.length || 0})</div>
                  <div className="mb-2 text-[9px] text-muted-foreground">Locations where this key exists on hosts</div>
                  <div className="space-y-1">
                    {(asset.filePaths || []).map(path => {
                      const [host, file] = path.split('~~');
                      return (
                        <div key={path} className="rounded bg-muted/30 px-2 py-1 font-mono text-[9px]">
                          <span className="text-foreground">{host}</span>
                          <span className="text-muted-foreground">~~{file}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-2 text-xs font-semibold text-foreground">Endpoints</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <div className="mb-2 text-[10px] font-medium text-foreground">Host Endpoints</div>
                      <div className="space-y-1.5">
                        {hostEndpoints.length ? hostEndpoints.map(endpoint => (
                          <div key={`${endpoint.ip}-${endpoint.port}`} className="text-[10px] text-muted-foreground">{endpoint.ip}:{endpoint.port} — <span className="text-foreground">{endpoint.host}</span></div>
                        )) : <div className="text-[10px] text-muted-foreground">No host endpoints</div>}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <div className="mb-2 text-[10px] font-medium text-foreground">Client Endpoints</div>
                      <div className="space-y-1.5">
                        {clientEndpoints.length ? clientEndpoints.map(endpoint => (
                          <div key={`${endpoint.ip}-${endpoint.port}`} className="text-[10px] text-muted-foreground">{endpoint.ip}:{endpoint.port} — <span className="text-foreground">{endpoint.host}</span></div>
                        )) : <div className="text-[10px] text-muted-foreground">No client endpoints</div>}
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-2 text-xs font-semibold text-foreground">Quick Actions</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Rotate', action: 'Rotate' },
                      { label: 'Revoke', action: 'Revoke', tone: 'text-coral' },
                      { label: 'Download Public Key', action: 'Download Public Key' },
                      { label: 'Download Key Pair', action: 'Download Key Pair' },
                      { label: 'Modify (Key Group / Tags)', action: 'Modify' },
                      { label: 'Change Status', action: `Change Status to ${asset.keyStatus === 'Managed' ? 'Monitored' : 'Managed'}` },
                      { label: 'Delete from Endpoints', action: 'Delete from Endpoints', tone: 'text-coral' },
                      { label: 'Delete from Inventory', action: 'Delete from Inventory', tone: 'text-muted-foreground' },
                    ].map(item => (
                      <button key={item.label} onClick={() => onAction(item.action, asset)} className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] hover:bg-muted/30">
                        <span className={item.tone || 'text-foreground'}>{item.label}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto p-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Access Map</div>
                <div className="text-[10px] text-muted-foreground">Which users have access to which hosts via this key</div>
              </div>
              <svg viewBox="0 0 600 320" className="w-full rounded-lg border border-border bg-secondary/20">
                <circle cx="300" cy="160" r="28" fill={severityFill(crs)} stroke={severityStroke(crs)} strokeWidth="2" />
                <text x="300" y="166" textAnchor="middle" fontSize="18">🔑</text>
                <text x="300" y="205" textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">{asset.name.slice(0, 24)}</text>
                <text x="300" y="219" textAnchor="middle" fontSize="9" fill={severityStroke(crs)}>CRS {crs}</text>

                {(asset.associatedUsers || []).slice(0, 4).map((user, index) => {
                  const y = 70 + index * 60;
                  return (
                    <g key={`${user.ip}-${user.username}`}>
                      <line x1="104" y1={y} x2="272" y2="160" stroke="hsl(var(--amber))" strokeWidth="1.5" />
                      <circle cx="86" cy={y} r="18" fill="hsl(var(--amber) / 0.15)" stroke="hsl(var(--amber))" strokeWidth="1.5" />
                      <text x="86" y={y + 4} textAnchor="middle" fontSize="12">👤</text>
                      <text x="86" y={y + 28} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))">{user.username.slice(0, 12)}</text>
                    </g>
                  );
                })}

                {hostEndpoints.slice(0, 4).map((endpoint, index) => {
                  const y = 70 + index * 60;
                  const danger = risks.includes('Rogue') || risks.includes('Suspicious');
                  return (
                    <g key={`${endpoint.ip}-${endpoint.port}`}>
                      <line x1="328" y1="160" x2="496" y2={y} stroke={asset.complianceStatus === 'Non-Compliant' ? 'hsl(var(--coral))' : 'hsl(var(--teal))'} strokeWidth="1.5" strokeDasharray={asset.complianceStatus === 'Non-Compliant' ? '5 5' : undefined} />
                      <circle cx="514" cy={y} r="18" fill="hsl(var(--teal) / 0.15)" stroke={danger ? 'hsl(var(--coral))' : 'hsl(var(--teal))'} strokeWidth="1.5" />
                      <text x="514" y={y + 4} textAnchor="middle" fontSize="12">🖥</text>
                      {danger ? <text x="534" y={y - 10} fontSize="10" fill="hsl(var(--coral))">⚠</text> : null}
                      <text x="514" y={y + 28} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))">{endpoint.host.slice(0, 14)}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber" />User</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: severityStroke(crs) }} />Key</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal" />Host</span>
                <span className="inline-flex items-center gap-1"><span className="h-px w-4 border-t border-dashed border-coral" />Non-compliant connection</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProvisionKeyWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [keyType, setKeyType] = useState<'User Key' | 'Host Key'>('User Key');
  const [algorithm, setAlgorithm] = useState<'Ed25519' | 'RSA-4096' | 'ECDSA-256'>('Ed25519');
  const [keyName, setKeyName] = useState('');
  const [comment, setComment] = useState('');
  const [group, setGroup] = useState('Default_Key_Group');
  const [search, setSearch] = useState('');
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<'OpenSSH' | 'SSH2' | 'Both'>('OpenSSH');
  const [content, setContent] = useState<'Public key only' | 'Private key only' | 'Key pair'>('Public key only');
  const [vaultIntegration, setVaultIntegration] = useState(false);
  const [vaultPath, setVaultPath] = useState('');
  const [requireApproval, setRequireApproval] = useState(true);

  const hosts = [
    { ip: '10.2.14.55', host: 'prod-db-01.internal', env: 'Production' },
    { ip: '10.1.5.100', host: 'jenkins-ci.internal', env: 'Production' },
    { ip: '10.4.1.10', host: 'k8s-worker-01.eks', env: 'Production' },
    { ip: '10.4.1.11', host: 'k8s-worker-02.eks', env: 'Production' },
    { ip: '10.3.1.10', host: 'staging-deploy-01.internal', env: 'Staging' },
    { ip: '52.14.88.201', host: 'bastion-01.acmecorp.com', env: 'Production' },
  ].filter(item => !search || `${item.ip} ${item.host}`.toLowerCase().includes(search.toLowerCase()));

  const bitLength = algorithm === 'Ed25519' ? '256' : algorithm === 'RSA-4096' ? '4096' : '256';

  const toggleHost = (ip: string, env: string) => {
    setSelectedHosts(prev => {
      const next = prev.includes(ip) ? prev.filter(item => item !== ip) : [...prev, ip];
      if (env === 'Production' && !prev.includes(ip)) setRequireApproval(true);
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Provision SSH Key" wide>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(n => <div key={n} className={`h-1 rounded-full ${n <= step ? 'bg-teal' : 'bg-muted'}`} />)}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Key Details</span><span>Target Hosts</span><span>Options</span><span>Review &amp; Create</span>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium text-foreground">Key Type</div>
              <div className="flex gap-3 text-xs">
                {(['User Key', 'Host Key'] as const).map(value => (
                  <label key={value} className="flex items-center gap-2 text-muted-foreground"><input type="radio" checked={keyType === value} onChange={() => setKeyType(value)} /> {value}</label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Algorithm</label>
                <select value={algorithm} onChange={e => setAlgorithm(e.target.value as 'Ed25519' | 'RSA-4096' | 'ECDSA-256')} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground">
                  <option>Ed25519</option>
                  <option>RSA-4096</option>
                  <option>ECDSA-256</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Key Bit Length</label>
                <input readOnly value={bitLength} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Key Name</label>
                <input value={keyName} onChange={e => setKeyName(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Comment</label>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="jenkins deploy key" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Key Compliance Group</label>
              <select value={group} onChange={e => setGroup(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground">
                <option>Default_Key_Group</option>
                <option>CI_CD_Key_Group</option>
                <option>Infra_Key_Group</option>
                <option>Security_Key_Group</option>
                <option>Payments_Key_Group</option>
              </select>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="text-sm font-medium text-foreground">Select target hosts to provision this key to</div>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-lg border border-border bg-muted py-2 pl-7 pr-3 text-xs text-foreground" />
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {hosts.map(item => (
                <label key={item.ip} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedHosts.includes(item.ip)} onChange={() => toggleHost(item.ip, item.env)} />
                    <div>
                      <div className="font-medium text-foreground">{item.ip}</div>
                      <div className="text-muted-foreground">{item.host}</div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${item.env === 'Production' ? 'bg-coral/10 text-coral' : 'bg-amber/10 text-amber'}`}>{item.env}</span>
                </label>
              ))}
            </div>
            <div className="inline-flex rounded-full bg-muted px-3 py-1 text-[10px] text-foreground">{selectedHosts.length} host(s) selected</div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium text-foreground">Download Format</div>
              <div className="flex gap-3 text-xs">
                {(['OpenSSH', 'SSH2', 'Both'] as const).map(value => (
                  <label key={value} className="flex items-center gap-2 text-muted-foreground"><input type="radio" checked={downloadFormat === value} onChange={() => setDownloadFormat(value)} /> {value}</label>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-foreground">Key Content</div>
              <div className="flex gap-3 text-xs">
                {(['Public key only', 'Private key only', 'Key pair'] as const).map(value => (
                  <label key={value} className="flex items-center gap-2 text-muted-foreground"><input type="radio" checked={content === value} onChange={() => setContent(value)} /> {value}</label>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
              <span className="text-foreground">Vault Integration</span>
              <input type="checkbox" checked={vaultIntegration} onChange={e => setVaultIntegration(e.target.checked)} />
            </label>
            {vaultIntegration ? <input value={vaultPath} onChange={e => setVaultPath(e.target.value)} placeholder="Vault path" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground" /> : null}
            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
              <span className="text-foreground">Require approval</span>
              <input type="checkbox" checked={requireApproval} onChange={e => setRequireApproval(e.target.checked)} />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs">
              <div className="mb-2 font-medium text-foreground">Summary</div>
              <div className="space-y-1 text-muted-foreground">
                <div>Key: <span className="font-medium text-foreground">{keyName || 'Unnamed key'} ({algorithm}, {bitLength})</span></div>
                <div>Type: <span className="font-medium text-foreground">{keyType}</span></div>
                <div>Hosts: <span className="font-medium text-foreground">{selectedHosts.length} hosts listed</span></div>
                <div>Format: <span className="font-medium text-foreground">{downloadFormat}</span></div>
                <div>Content: <span className="font-medium text-foreground">{content}</span></div>
                <div>Vault: <span className="font-medium text-foreground">{vaultIntegration ? `enabled${vaultPath ? ` (${vaultPath})` : ''}` : 'disabled'}</span></div>
                <div>Approval: <span className="font-medium text-foreground">{requireApproval ? 'required' : 'not required'}</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-teal/20 bg-teal/5 p-4 text-xs text-muted-foreground">
              A work order <span className="font-medium text-foreground">{workOrderId()}</span> will be created and tracked in Work Order Status.
            </div>
          </div>
        ) : null}

        <div className="flex justify-between pt-2">
          <button onClick={() => (step === 1 ? onClose() : setStep(step - 1))} className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-muted/30">{step === 1 ? 'Cancel' : '← Back'}</button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Next →</button>
          ) : (
            <button onClick={() => { const id = workOrderId(); toast.success(`Work order ${id} created — track progress in Work Order Status`); onClose(); }} className="rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Create Work Order</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function SSHRemediationWorkspace() {
  const { setCurrentPage, setFilters } = useNav();
  const [wsTab, setWsTab] = useState<WTab>('remediation');
  const [selectedKey, setSelectedKey] = useState<SSHWorkspaceAsset | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>('crs');
  const [sortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmAction, setConfirmAction] = useState<{ key: SSHWorkspaceAsset; action: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [assessedKeys, setAssessedKeys] = useState<Record<string, string>>({});

  const workspaceSSHKeys = useMemo(() => [...(SSH_KEYS as SSHWorkspaceAsset[]).map(normalizeSSHAsset), ...extraSSHKeys], []);
  const workspaceSSHCerts = useMemo(() => (SSH_CERTS as SSHWorkspaceAsset[]).map(normalizeSSHAsset), []);
  const workspaceAllSSH = useMemo(() => [...workspaceSSHKeys, ...workspaceSSHCerts], [workspaceSSHCerts, workspaceSSHKeys]);

  const counts = useMemo(() => ({
    Shared: workspaceSSHKeys.filter(k => k.sshRiskStatus?.includes('Shared')).length,
    Weak: workspaceAllSSH.filter(k => k.sshRiskStatus?.includes('Weak')).length,
    Rogue: workspaceSSHKeys.filter(k => k.sshRiskStatus?.includes('Rogue')).length,
    Misplaced: workspaceSSHKeys.filter(k => k.sshRiskStatus?.includes('Misplaced')).length,
    Suspicious: workspaceSSHKeys.filter(k => k.sshRiskStatus?.includes('Suspicious')).length,
  }), [workspaceAllSSH, workspaceSSHKeys]);

  const filteredKeys = useMemo(() => {
    const rows = workspaceSSHKeys
      .filter(k => !search || k.name.toLowerCase().includes(search.toLowerCase()))
      .filter(k => !riskFilter || k.sshRiskStatus?.includes(riskFilter as SSHRisk))
      .map(k => ({ ...k, crs: computeCRS(k).crs }));

    return rows.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      if (sortCol === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortCol === 'age') return ((a.keyAge || 0) - (b.keyAge || 0)) * dir;
      if (sortCol === 'algorithm') return a.algorithm.localeCompare(b.algorithm) * dir;
      return ((a.crs || 0) - (b.crs || 0)) * dir;
    });
  }, [riskFilter, search, sortCol, sortDir, workspaceSSHKeys]);

  const rotationDue = useMemo(() => filteredKeys.filter(k => k.rotationFrequency !== 'Never' && !k.autoRenewal && (k.keyAge || 0) > parseRotationDays(k.rotationFrequency || '999')), [filteredKeys]);
  const rogueKeys = useMemo(() => workspaceSSHKeys.filter(k => k.sshRiskStatus?.includes('Rogue')), [workspaceSSHKeys]);
  const weakKeys = useMemo(() => workspaceAllSSH.filter(k => k.sshRiskStatus?.includes('Weak')).map(k => ({ ...k, crs: computeCRS(k).crs })), [workspaceAllSSH]);
  const sharedKeys = useMemo(() => workspaceSSHKeys.filter(k => k.sshRiskStatus?.includes('Shared')), [workspaceSSHKeys]);

  const toggleSelected = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openDetails = (key: SSHWorkspaceAsset) => {
    setSelectedKey(key);
    setPanelOpen(true);
    setOpenMenuId(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 border-b border-border bg-card px-6">
        {[
          { id: 'remediation', label: 'Key Remediation' },
          { id: 'provisioning', label: 'Provisioning' },
          { id: 'certificates', label: 'SSH Certificates', badge: 'Next Release', badgeCls: 'text-amber' },
          { id: 'migration', label: 'Key → Cert Migration', badge: 'Roadmap', badgeCls: 'text-purple' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setWsTab(tab.id as WTab)} className={tabBtn(wsTab === tab.id)}>
            <span>{tab.label}</span>
            {tab.badge ? <span className={`ml-2 text-[9px] ${tab.badgeCls}`}>{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {wsTab === 'remediation' ? (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-shrink-0 space-y-4 border-b border-border p-4">
              <SSHKpiStrip counts={counts} onFilter={risk => { setRiskFilter(prev => prev === risk ? '' : risk); setWsTab('remediation'); }} />

              {riskFilter ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[10px] text-foreground">
                  <span>Filtered: {riskFilter}</span>
                  <button onClick={() => setRiskFilter('')} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-lg border border-border bg-muted py-2 pl-7 pr-3 text-xs text-foreground" placeholder="Search keys..." />
                </div>
                <label className="text-xs text-muted-foreground">Sort by</label>
                <select value={sortCol} onChange={e => setSortCol(e.target.value as SortCol)} className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground">
                  <option value="crs">CRS</option>
                  <option value="name">Name</option>
                  <option value="age">Age</option>
                  <option value="algorithm">Algorithm</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                  {selectedRows.size > 0 ? (
                    <>
                      <button onClick={() => { toast.success(`Rotate ${selectedRows.size} selected — work orders created`); setSelectedRows(new Set()); }} className="rounded-lg bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Rotate {selectedRows.size} selected</button>
                      <button onClick={() => { toast.success(`Revoke ${selectedRows.size} selected — work orders created`); setSelectedRows(new Set()); }} className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-xs font-medium text-coral hover:bg-coral/20">Revoke {selectedRows.size} selected</button>
                    </>
                  ) : null}
                  <button onClick={() => setProvisionOpen(true)} className="rounded-lg bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Provision New Key +</button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <section className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-foreground">Rotation Queue</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${rotationDue.length > 0 ? 'bg-coral/10 text-coral' : 'bg-teal/10 text-teal'}`}>{rotationDue.length} keys overdue</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Keys past their rotation schedule — rotate to reduce credential age risk</div>
                  </div>
                  {rotationDue.length > 0 ? <button onClick={() => toast.success(`Rotating ${rotationDue.length} keys — work orders created`)} className="rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-xs font-medium text-coral hover:bg-coral/20">Rotate All Overdue</button> : null}
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <table className="w-full text-xs">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        <th className="w-10 px-3 py-2 text-left"><input type="checkbox" checked={rotationDue.length > 0 && rotationDue.every(item => selectedRows.has(item.id))} onChange={e => setSelectedRows(e.target.checked ? new Set(rotationDue.map(item => item.id)) : new Set())} /></th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Algorithm</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key Length</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Age</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Last Rotated</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Compliance Group</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hosts</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">CRS</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rotationDue.length ? rotationDue.map(key => (
                        <tr key={key.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-3 py-2"><input type="checkbox" checked={selectedRows.has(key.id)} onChange={() => toggleSelected(key.id)} /></td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{key.name}</div>
                                <div className="mt-1 flex flex-wrap gap-1">{(key.sshRiskStatus || []).map(risk => <span key={risk} className={`rounded-full border px-1.5 py-0.5 text-[9px] ${badgeTone(risk)}`}>{risk}</span>)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-foreground">{key.algorithm}</td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{key.keyLength}</td>
                          <td className={`px-3 py-2 text-[10px] ${Number(key.keyAge) > 365 ? 'text-coral' : Number(key.keyAge) > 180 ? 'text-amber' : 'text-teal'}`}>{key.keyAge}d</td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{key.lastRotated}</td>
                          <td className="px-3 py-2"><span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-foreground">{key.keyComplianceGroup}</span></td>
                          <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{key.filePaths?.length || 0}</span></td>
                          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBgCls(key.crs || 0)}`}>{key.crs}</span></td>
                          <td className="relative px-3 py-2">
                            <button onClick={() => setOpenMenuId(prev => prev === key.id ? null : key.id)} className="rounded p-1 hover:bg-muted"><MoreVertical className="h-3.5 w-3.5 text-muted-foreground" /></button>
                            {openMenuId === key.id ? (
                              <div className="absolute right-3 top-8 z-10 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
                                <button onClick={() => { toast.success(`Rotate initiated — work order ${workOrderId()} created`); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1.5 text-left text-[10px] hover:bg-muted/30">Rotate</button>
                                <button onClick={() => { toast.success('Skipped this cycle'); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1.5 text-left text-[10px] hover:bg-muted/30">Skip this cycle</button>
                                <button onClick={() => openDetails(key)} className="block w-full rounded px-2 py-1.5 text-left text-[10px] hover:bg-muted/30">View details</button>
                                <div className="my-1 border-t border-border" />
                                <button onClick={() => { toast.success('Key group updated'); setOpenMenuId(null); }} className="block w-full rounded px-2 py-1.5 text-left text-[10px] hover:bg-muted/30">Change Key Group</button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={10} className="px-3 py-6 text-center">
                            <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-teal" />All keys are within their rotation schedule</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-coral" />
                  <div>
                    <div className="flex items-center gap-2"><div className="text-sm font-semibold text-foreground">Rogue Keys</div><span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-medium text-coral">{rogueKeys.length}</span></div>
                    <div className="text-[10px] text-muted-foreground">Keys found on hosts that were not provisioned through AppViewX — potential unauthorized access</div>
                  </div>
                  <div className="ml-auto text-[9px] italic text-muted-foreground">Rogue keys are automatically backed up before any action</div>
                </div>
                {rogueKeys.length === 0 ? (
                  <div className="rounded-lg border border-teal/20 bg-teal/5 p-4 text-sm text-teal">No rogue keys detected</div>
                ) : (
                  <div className="space-y-3">
                    {rogueKeys.map(key => (
                      <div key={key.id} className="flex gap-4 rounded-lg border border-coral/30 bg-coral/5 p-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-coral/15 text-coral">🔑</div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{key.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1">{(key.sshRiskStatus || []).map(risk => <span key={risk} className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeTone(risk)}`}>{risk}</span>)}</div>
                          <div className="mt-2 flex gap-2 text-[10px]"><span className="rounded bg-muted px-2 py-0.5 font-mono text-foreground">{key.algorithm}</span><span className="rounded bg-muted px-2 py-0.5 text-foreground">{key.keyLength}</span></div>
                        </div>
                        <div className="grid flex-1 grid-cols-3 gap-3 px-4 text-[10px]">
                          <div>
                            <div className="font-medium text-foreground">Found on</div>
                            {(key.filePaths || []).slice(0, 2).map(path => {
                              const [host, file] = path.split('~~');
                              return <div key={path} className="mt-1 text-muted-foreground">{host}<div className="truncate font-mono text-[9px]">{file}</div></div>;
                            })}
                            {(key.filePaths?.length || 0) > 2 ? <div className="mt-1 text-muted-foreground">+{(key.filePaths?.length || 0) - 2} more</div> : null}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Associated User</div>
                            {(key.associatedUsers || []).length ? (key.associatedUsers || []).map(user => <div key={`${user.ip}-${user.username}`} className="mt-1 text-muted-foreground">{user.ip}~~{user.username}</div>) : <div className="mt-1 text-muted-foreground">No associated users</div>}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Discovery</div>
                            <div className="mt-1 text-muted-foreground">{key.discoverySource}</div>
                            <div className="text-muted-foreground">Discovered {key.keyAge} days ago</div>
                            <div className={`mt-1 font-medium ${crsColor(computeCRS(key).crs)}`}>CRS: {computeCRS(key).crs}</div>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-2">
                          <button onClick={() => setConfirmAction({ key, action: 'Revoke' })} className="rounded-lg border border-coral/20 bg-coral/10 px-3 py-1.5 text-[10px] font-medium text-coral hover:bg-coral/20">Revoke</button>
                          <button onClick={() => toast.success('Key added to Default_Key_Group — status set to Monitored')} className="rounded-lg border border-amber/20 bg-amber/10 px-3 py-1.5 text-[10px] font-medium text-amber hover:bg-amber/20">Add to Inventory</button>
                          <button onClick={() => openDetails(key)} className="text-[10px] text-teal hover:underline">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber" />
                    <div>
                      <div className="flex items-center gap-2"><div className="text-sm font-semibold text-foreground">Weak Keys</div><span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">{weakKeys.length}</span></div>
                      <div className="text-[10px] text-muted-foreground">Keys using deprecated algorithms or insufficient key lengths — upgrade to stronger algorithm</div>
                    </div>
                  </div>
                  <button onClick={() => toast.success(`Bulk upgrade initiated — ${weakKeys.length} work orders created`)} className="rounded-lg border border-amber/20 bg-amber/10 px-3 py-2 text-xs font-medium text-amber hover:bg-amber/20">Upgrade All Weak Keys</button>
                </div>
                {weakKeys.length === 0 ? (
                  <div className="rounded-lg border border-teal/20 bg-teal/5 p-4 text-sm text-teal">No weak keys detected</div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <table className="w-full text-xs">
                      <thead className="border-b border-border bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key Name</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Current Algorithm</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key Length</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recommended</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Compliance Group</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hosts</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">CRS</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weakKeys.map(key => {
                          const recommended = getRecommendedAlgorithm(key.algorithm);
                          return (
                            <tr key={key.id} className="border-t border-border hover:bg-muted/20">
                              <td className="px-3 py-2"><div className="font-medium text-foreground">{key.name}</div><div className="mt-1 flex flex-wrap gap-1">{(key.sshRiskStatus || []).map(risk => <span key={risk} className={`rounded-full border px-1.5 py-0.5 text-[9px] ${badgeTone(risk)}`}>{risk}</span>)}</div></td>
                              <td className="px-3 py-2 font-mono text-[10px] text-coral">{key.algorithm}</td>
                              <td className="px-3 py-2 text-[10px] text-coral">{key.keyLength}</td>
                              <td className={`px-3 py-2 text-[10px] ${recommended.includes('or') ? 'text-amber' : 'text-teal'}`}>{recommended}</td>
                              <td className="px-3 py-2"><span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-foreground">{key.keyComplianceGroup}</span></td>
                              <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{key.filePaths?.length || 0}</span></td>
                              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBgCls(key.crs || 0)}`}>{key.crs}</span></td>
                              <td className="px-3 py-2"><button onClick={() => setConfirmAction({ key, action: `Upgrade to ${recommended}` })} className="rounded-lg border border-amber/20 bg-amber/10 px-3 py-1 text-[10px] font-medium text-amber hover:bg-amber/20">Upgrade</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {wsTab === 'provisioning' ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="text-lg font-semibold text-foreground">Provision SSH Keys</div>
            <div className="mt-1 text-sm text-muted-foreground">Deploy SSH keys to target hosts. Keys are automatically backed up and tracked through work orders.</div>

            <div className="mt-4 grid grid-cols-2 gap-6">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">Provision New Key</div>
                <div className="mb-4 mt-1 text-[10px] text-muted-foreground">Generate a new SSH key and deploy it to one or more target hosts.</div>
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="mb-2 font-medium text-foreground">Key Type</div>
                    <div className="flex gap-3 text-muted-foreground"><label className="flex items-center gap-2"><input type="radio" checked readOnly /> User Key</label><label className="flex items-center gap-2"><input type="radio" readOnly /> Host Key</label></div>
                  </div>
                  <div>
                    <label className="mb-1 block text-muted-foreground">Algorithm</label>
                    <select className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground"><option>Ed25519 (Recommended)</option><option>RSA-4096</option><option>ECDSA-256</option><option>RSA-2048 (Legacy)</option></select>
                  </div>
                  <div>
                    <label className="mb-1 block text-muted-foreground">Key Compliance Group</label>
                    <select className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground"><option>Default_Key_Group</option><option>CI_CD_Key_Group</option><option>Infra_Key_Group</option><option>Security_Key_Group</option><option>Payments_Key_Group</option></select>
                  </div>
                  <div>
                    <label className="mb-1 block text-muted-foreground">Comment</label>
                    <input placeholder="Enter key purpose, e.g. 'Jenkins deploy key for prod'" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground" />
                  </div>
                  <button onClick={() => setProvisionOpen(true)} className="flex w-full items-center justify-center gap-1 rounded-lg bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Open Provision Wizard <ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">Key Inventory Summary</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {[
                    ['Total SSH Keys', workspaceSSHKeys.length, 'text-foreground'],
                    ['Total SSH Certs', workspaceSSHCerts.length, 'text-foreground'],
                    ['Managed', workspaceSSHKeys.filter(k => k.keyStatus === 'Managed').length, 'text-teal'],
                    ['Monitored', workspaceSSHKeys.filter(k => k.keyStatus === 'Monitored').length, 'text-amber'],
                    ['Compliant', workspaceSSHKeys.filter(k => k.complianceStatus === 'Compliant').length, 'text-teal'],
                    ['Non-Compliant', workspaceSSHKeys.filter(k => k.complianceStatus === 'Non-Compliant').length, 'text-coral'],
                  ].map(([label, value, cls]) => (
                    <div key={String(label)} className="rounded-lg border border-border p-3">
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                      <div className={`text-lg font-bold ${cls}`}>{value}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setFilters({ type: 'SSH Key' }); setCurrentPage('inventory'); }} className="mt-4 text-[10px] text-teal hover:underline">View full inventory →</button>
              </div>
            </div>

            <div className="mb-3 mt-6 text-sm font-semibold text-foreground">Recent Work Orders</div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                  <tr>
                    {['Work Order', 'Action', 'Key', 'Hosts', 'Status', 'Created'].map(label => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['WO-SSH-1042', 'Rotate', 'jenkins-deploy-key', '1', 'Completed', '2026-04-20'],
                    ['WO-SSH-1041', 'Provision', 'bastion-host-key', '1', 'Completed', '2026-04-18'],
                    ['WO-SSH-1038', 'Delete from Endpoints', 'gitlab-deploy-key', '2', 'In Progress', '2026-04-16'],
                  ].map(row => (
                    <tr key={row[0]} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{row[0]}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row[1]}</td>
                      <td className="px-3 py-2 text-foreground">{row[2]}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row[3]}</td>
                      <td className={`px-3 py-2 ${row[4] === 'Completed' ? 'text-teal' : row[4] === 'In Progress' ? 'text-amber' : 'text-coral'}`}>{row[4]}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setCurrentPage('work-order-status')} className="mt-3 text-[10px] text-teal hover:underline">View all →</button>
          </div>
        ) : null}

        {wsTab === 'certificates' ? (
          <div className="h-full space-y-6 overflow-y-auto p-6">
            <div>
              <div className="flex items-center gap-2"><div className="text-lg font-semibold text-foreground">SSH Certificates</div><span className="text-[10px] text-amber">Next Release</span></div>
              <div className="mt-1 text-sm text-muted-foreground">CA-signed SSH credentials with explicit validity periods and principal scope. More secure than raw SSH keys — they expire automatically and carry access scope.</div>
            </div>

            <section className="space-y-3">
              <div className="flex justify-end"><button onClick={() => toast('Certificate issuance wizard — available in next release. Notify me when available?')} className="rounded-lg bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Issue New Certificate</button></div>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      {['Cert Name', 'CA Issuer', 'Algorithm', 'Principals', 'Issued', 'Expires', 'Days', 'Status', 'Compliance', 'CRS', 'Actions'].map(label => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceSSHCerts.map(cert => {
                      const crs = computeCRS(cert).crs;
                      const principals = cert.associatedUsers?.map(user => user.username) || [];
                      return (
                        <tr key={cert.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-3 py-2 text-foreground">{cert.name}</td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{cert.caIssuer}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-foreground">{cert.algorithm}</td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{principals.length ? `${principals.slice(0, 2).join(', ')}${principals.length > 2 ? ` +${principals.length - 2}` : ''}` : 'All principals'}</td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{cert.issueDate}</td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">{cert.expiryDate}</td>
                          <td className={`px-3 py-2 text-[10px] ${cert.daysToExpiry <= 7 ? 'text-coral' : cert.daysToExpiry <= 30 ? 'text-amber' : 'text-teal'}`}>{cert.daysToExpiry}</td>
                          <td className="px-3 py-2 text-[10px] text-foreground">{cert.status}</td>
                          <td className={`px-3 py-2 text-[10px] ${cert.complianceStatus === 'Non-Compliant' ? 'text-coral' : 'text-teal'}`}>{cert.complianceStatus}</td>
                          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBgCls(crs)}`}>{crs}</span></td>
                          <td className="px-3 py-2"><button onClick={() => openDetails(cert)} className="text-[10px] text-teal hover:underline">View Details</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border-t border-border pt-6">
              <div className="mb-3 flex items-center gap-2"><div className="text-sm font-semibold text-foreground">Certificate Policies</div><span className="text-[10px] text-amber">Next Release</span></div>
              <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
                <Lock className="mx-auto mb-3 h-8 w-8 text-amber" />
                <div className="text-sm font-semibold text-foreground">Certificate Policies — Coming Next Release</div>
                <div className="mx-auto mt-2 max-w-2xl text-[10px] text-muted-foreground">Define max validity periods, allowed principals, required extensions, and CA trust requirements for SSH certificates. Policies will automatically enforce standards across all issued certificates.</div>
                <div className="pointer-events-none mt-4 grid grid-cols-3 gap-3 opacity-50">
                  <div className="rounded-lg border border-border p-3"><div className="text-xs font-medium text-foreground">Max Validity</div><div className="mt-1 text-[10px] text-muted-foreground">60 days</div></div>
                  <div className="rounded-lg border border-border p-3"><div className="text-xs font-medium text-foreground">Allowed Principals</div><div className="mt-1 text-[10px] text-muted-foreground">whitelist based</div></div>
                  <div className="rounded-lg border border-border p-3"><div className="text-xs font-medium text-foreground">Required Extensions</div><div className="mt-1 text-[10px] text-muted-foreground">permit-pty, permit-port-forwarding</div></div>
                </div>
                <button onClick={() => toast("We'll notify you when cert policies are available in your instance.")} className="mt-4 rounded-lg border border-amber/20 bg-amber/10 px-4 py-2 text-xs text-amber hover:bg-amber/20">Notify me when available</button>
              </div>
            </section>
          </div>
        ) : null}

        {wsTab === 'migration' ? (
          <div className="h-full space-y-6 overflow-y-auto p-6">
            <div>
              <div className="flex items-center gap-2"><div className="text-lg font-semibold text-foreground">SSH Key → Certificate Migration</div><span className="text-[10px] text-purple">Roadmap</span></div>
              <div className="mt-2 rounded-xl border border-purple/20 bg-purple/5 p-4">
                <div className="flex items-start gap-3"><Atom className="mt-0.5 h-4 w-4 text-purple" /><div><div className="text-sm font-semibold text-purple">Why migrate SSH Keys to SSH Certificates?</div><div className="mt-1 text-[10px] text-muted-foreground">SSH Certificates expire automatically — eliminating the need to manually manage authorized_keys files across hundreds of hosts. They carry explicit principal scope, a validity window, and are issued by a trusted SSH CA. Migration takes seconds per key once your SSH CA is configured.</div></div></div>
              </div>
              <div className="mt-3 flex gap-6 text-sm"><div><span className="font-semibold text-foreground">{workspaceSSHKeys.length}</span> SSH Keys</div><div><span className="font-semibold text-foreground">{workspaceSSHCerts.length}</span> SSH Certs</div><div><span className="font-semibold text-foreground">0</span> keys in migration queue</div></div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div><div className="text-sm font-semibold text-foreground">Migration Candidates</div><div className="text-[10px] text-muted-foreground">All managed SSH keys — assess readiness before migrating</div></div>
                <div className="flex gap-2">
                  <button onClick={() => toast.success('Readiness assessment complete — results shown below')} className="rounded-lg border border-purple/20 bg-purple/10 px-3 py-2 text-xs text-purple hover:bg-purple/20">Assess All Readiness</button>
                  <button title="Available in Platform Release — assessment complete, migration will be one-click when released" className="cursor-not-allowed rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground opacity-50">Migrate All Ready Keys</button>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      {['SSH Key', 'Algorithm', 'Associated Users', 'Hosts', 'Key Age', 'Migration Status', 'Assess', 'Migrate'].map(label => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceSSHKeys.map(key => {
                      const status = key.id === 'ssh-002' || key.id === 'ssh-004' ? 'Ready' : key.id === 'ssh-003' ? 'Needs SSH CA config' : 'Not assessed';
                      return (
                        <tr key={key.id} className="border-t border-border align-top hover:bg-muted/20">
                          <td className="px-3 py-2"><div className="font-medium text-foreground">{key.name}</div><div className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-foreground">{key.algorithm}</div>{assessedKeys[key.id] ? <div className="mt-1 text-[10px] text-muted-foreground">{assessedKeys[key.id]}</div> : null}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-foreground">{key.algorithm}</td>
                          <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{key.associatedUsers?.length || 0}</span></td>
                          <td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{key.filePaths?.length || 0}</span></td>
                          <td className={`px-3 py-2 text-[10px] ${Number(key.keyAge) > 365 ? 'text-coral' : Number(key.keyAge) > 180 ? 'text-amber' : 'text-teal'}`}>{key.keyAge}d</td>
                          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${status === 'Ready' ? 'bg-teal/10 text-teal' : status === 'Needs SSH CA config' ? 'bg-amber/10 text-amber' : 'bg-muted text-muted-foreground'}`}>{status}</span></td>
                          <td className="px-3 py-2"><button onClick={() => setAssessedKeys(prev => ({ ...prev, [key.id]: key.keyStatus === 'Managed' && key.algorithm.includes('Ed25519') ? '✓ Host supports cert auth · SSH CA required' : key.algorithm.includes('RSA') ? '⚠ Upgrade algorithm first, then migrate' : '✓ Ready for assessment' }))} className="rounded border border-purple/20 px-2 py-1 text-[10px] text-purple hover:bg-purple/5">Assess</button></td>
                          <td className="px-3 py-2"><button title="Available in Platform Release" className="cursor-not-allowed rounded border border-border px-2 py-1 text-[10px] text-muted-foreground opacity-50"><Lock className="mr-1 inline h-3 w-3" />Migrate</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border-t border-border pt-6">
              <div className="mb-4 text-sm font-semibold text-foreground">Migration Roadmap</div>
              <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-xl border border-border">
                <div className="border-r border-border bg-teal/5 p-4"><div className="text-sm font-semibold text-foreground">SSH Key Lifecycle Management</div><div className="mt-1 text-[10px] text-muted-foreground">Inventory, rotation, revocation, provisioning</div><div className="mt-3 inline-flex rounded-full bg-teal/10 px-2 py-0.5 text-[10px] text-teal">Current release</div></div>
                <div className="border-r border-border bg-amber/5 p-4"><div className="text-sm font-semibold text-foreground">SSH Certificate Management</div><div className="mt-1 text-[10px] text-muted-foreground">Issue, renew, revoke SSH certs. Certificate policies.</div><div className="mt-3 inline-flex rounded-full bg-amber/10 px-2 py-0.5 text-[10px] text-amber">Next release</div></div>
                <div className="bg-purple/5 p-4"><div className="text-sm font-semibold text-foreground">One-Click Key → Cert Migration</div><div className="mt-1 text-[10px] text-muted-foreground">Select any managed SSH key and migrate it to a certificate in one click. Authorized_keys managed automatically.</div><div className="mt-3 inline-flex rounded-full bg-purple/10 px-2 py-0.5 text-[10px] text-purple">Platform release</div></div>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {panelOpen && selectedKey ? (
        <SSHKeyDetailPanel
          key={selectedKey.id}
          asset={selectedKey}
          onClose={() => { setPanelOpen(false); setSelectedKey(null); }}
          onAction={(action, key) => {
            if (action === 'Revoke' || action === 'Delete from Endpoints' || action === 'Delete from Inventory') {
              setConfirmAction({ key, action });
              return;
            }
            toast.success(`${action} initiated for ${key.name} — work order ${workOrderId()} created`);
            setPanelOpen(false);
          }}
        />
      ) : null}

      {provisionOpen ? <ProvisionKeyWizard open={provisionOpen} onClose={() => setProvisionOpen(false)} /> : null}

      {confirmAction ? (
        <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={`Confirm: ${confirmAction.action}`}>
          <div className="space-y-4">
            <div className="text-sm text-foreground">Are you sure you want to <span className="font-semibold">{confirmAction.action.toLowerCase()}</span> <span className="font-semibold">{confirmAction.key.name}</span>?</div>
            <div className="text-xs text-muted-foreground">The key will be automatically backed up before this action is executed. You can view backup details in the audit log.</div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-lg border border-border py-2 text-xs text-muted-foreground hover:bg-muted/30">Cancel</button>
              <button onClick={() => { toast.success(`${confirmAction.action} initiated — work order ${workOrderId()} created`); setConfirmAction(null); }} className="flex-1 rounded-lg border border-coral/30 bg-coral/10 py-2 text-xs font-semibold text-coral hover:bg-coral/20">Confirm {confirmAction.action}</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}