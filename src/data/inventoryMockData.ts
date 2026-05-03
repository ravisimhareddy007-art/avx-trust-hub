// ─── IT Asset Model ──────────────────────────────────────────────────────────
export interface ITAsset {
  id: string;
  name: string;
  type: 'Web Server' | 'Application Server' | 'Database Server' | 'Load Balancer' | 'API Gateway' | 'K8s Cluster' | 'CI/CD Pipeline' | 'Mail Server' | 'Bastion Host' | 'CDN' | 'HSM' | 'Vault Server' | 'AI Platform';
  scanned: boolean;
  environment: 'Production' | 'Staging' | 'Development';
  ownerTeam: string;
  cryptoObjectIds: string[];
  riskScore: number;
  criticalViolations: number;
  policyCoverage: number;
  lastSeen: string;
  managedBy: string;
  infrastructure: string;
  application: string;
}

export const mockITAssets: ITAsset[] = [
  { id: 'it-001', name: 'prod-gateway-01.acmecorp.com', type: 'API Gateway', environment: 'Production', ownerTeam: 'Infrastructure', cryptoObjectIds: ['cert-001', 'cert-003', 'cert-006'], riskScore: 82, criticalViolations: 3, policyCoverage: 67, lastSeen: '2026-04-14 09:12', managedBy: 'Terraform', infrastructure: 'aws-us-east-1', application: 'Edge Gateway' },
  { id: 'it-002', name: 'payments-api.eks-prod', type: 'Application Server', environment: 'Production', ownerTeam: 'Payments Engineering', cryptoObjectIds: ['cert-001', 'k8s-001', 'enc-001', 'secret-001'], riskScore: 76, criticalViolations: 2, policyCoverage: 75, lastSeen: '2026-04-14 09:10', managedBy: 'Kubernetes', infrastructure: 'aws-eks-prod', application: 'Payment Gateway' },
  { id: 'it-003', name: 'prod-db-primary.internal', type: 'Database Server', environment: 'Production', ownerTeam: 'Database Operations', cryptoObjectIds: ['ssh-001', 'enc-001', 'enc-003'], riskScore: 71, criticalViolations: 2, policyCoverage: 33, lastSeen: '2026-04-14 08:55', managedBy: 'Ansible', infrastructure: 'aws-us-east-1', application: 'PostgreSQL Primary' },
  { id: 'it-004', name: 'vault.internal.acmecorp.com', type: 'Vault Server', environment: 'Production', ownerTeam: 'Security Operations', cryptoObjectIds: ['cert-008', 'secret-001', 'secret-002', 'enc-002'], riskScore: 88, criticalViolations: 3, policyCoverage: 50, lastSeen: '2026-04-14 09:05', managedBy: 'Terraform', infrastructure: 'on-prem-dc1', application: 'HashiCorp Vault' },
  { id: 'it-005', name: 'jenkins-ci.internal', type: 'CI/CD Pipeline', environment: 'Production', ownerTeam: 'DevOps', cryptoObjectIds: ['ssh-002', 'sshcert-001', 'secret-004', 'cs-001'], riskScore: 45, criticalViolations: 0, policyCoverage: 100, lastSeen: '2026-04-14 09:00', managedBy: 'Ansible', infrastructure: 'on-prem-dc1', application: 'Jenkins CI' },
  { id: 'it-006', name: 'cdn.acmecorp.com', type: 'CDN', environment: 'Production', ownerTeam: 'Infrastructure', cryptoObjectIds: ['cert-006', 'cert-003'], riskScore: 28, criticalViolations: 0, policyCoverage: 100, lastSeen: '2026-04-14 09:11', managedBy: 'Cloudflare', infrastructure: 'cloudflare-cdn', application: 'Content Delivery' },
  { id: 'it-007', name: 'eks-prod-cluster', type: 'K8s Cluster', environment: 'Production', ownerTeam: 'Platform Engineering', cryptoObjectIds: ['k8s-001', 'k8s-002', 'k8s-003', 'k8s-004', 'ssh-003', 'sshcert-002'], riskScore: 64, criticalViolations: 2, policyCoverage: 83, lastSeen: '2026-04-14 09:08', managedBy: 'Terraform', infrastructure: 'aws-eks-prod', application: 'EKS Production' },
  { id: 'it-008', name: 'auth.acmecorp.com', type: 'Web Server', environment: 'Production', ownerTeam: 'Identity & Access', cryptoObjectIds: ['cert-004'], riskScore: 35, criticalViolations: 0, policyCoverage: 100, lastSeen: '2026-04-14 09:07', managedBy: 'Kubernetes', infrastructure: 'gcp-us-central1', application: 'SSO Service' },
  { id: 'it-009', name: 'bastion-01.acmecorp.com', type: 'Bastion Host', environment: 'Production', ownerTeam: 'Security Operations', cryptoObjectIds: ['ssh-004', 'ssh-001'], riskScore: 52, criticalViolations: 1, policyCoverage: 50, lastSeen: '2026-04-14 08:50', managedBy: 'Ansible', infrastructure: 'aws-us-east-1', application: 'Bastion Host' },
  { id: 'it-010', name: 'mail.acmecorp.com', type: 'Mail Server', environment: 'Production', ownerTeam: 'IT Operations', cryptoObjectIds: ['cert-009'], riskScore: 73, criticalViolations: 1, policyCoverage: 0, lastSeen: '2026-04-14 08:30', managedBy: 'Manual', infrastructure: 'on-prem-dc1', application: 'Email Server' },
  { id: 'it-011', name: 'legacy-erp.internal', type: 'Application Server', environment: 'Production', ownerTeam: 'IT Operations', cryptoObjectIds: ['cert-010'], riskScore: 91, criticalViolations: 2, policyCoverage: 0, lastSeen: '2026-04-14 07:00', managedBy: 'Manual', infrastructure: 'on-prem-dc2', application: 'Legacy ERP' },
  { id: 'it-012', name: 'staging-api.acmecorp.com', type: 'API Gateway', environment: 'Staging', ownerTeam: 'Platform Engineering', cryptoObjectIds: ['cert-005', 'cert-007'], riskScore: 38, criticalViolations: 1, policyCoverage: 50, lastSeen: '2026-04-14 08:45', managedBy: 'Terraform', infrastructure: 'azure-eastus-stg', application: 'Staging API' },
  { id: 'it-013', name: 'hsm-signing-cluster', type: 'HSM', environment: 'Production', ownerTeam: 'Security Operations', cryptoObjectIds: ['cs-001', 'cs-002', 'enc-002'], riskScore: 42, criticalViolations: 1, policyCoverage: 67, lastSeen: '2026-04-14 09:02', managedBy: 'Manual', infrastructure: 'thales-luna-hsm', application: 'Code Signing HSM' },
  { id: 'it-014', name: 'gitlab-runner-01.internal', type: 'CI/CD Pipeline', environment: 'Production', ownerTeam: 'DevOps', cryptoObjectIds: ['ssh-005', 'secret-004'], riskScore: 68, criticalViolations: 2, policyCoverage: 25, lastSeen: '2026-04-14 08:20', managedBy: 'Manual', infrastructure: 'on-prem-dc2', application: 'GitLab CI' },
  { id: 'it-015', name: 'ai-platform.eks-prod', type: 'AI Platform', environment: 'Production', ownerTeam: 'AI Engineering', cryptoObjectIds: ['ai-001', 'ai-002', 'ai-003', 'ai-005'], riskScore: 55, criticalViolations: 1, policyCoverage: 50, lastSeen: '2026-04-14 09:09', managedBy: 'Kubernetes', infrastructure: 'aws-eks-ai-cluster', application: 'AI Platform' },
  { id: 'it-ai-01', name: 'mcp-server-platform.prod', type: 'AI Platform', environment: 'Production', ownerTeam: 'AI Engineering', cryptoObjectIds: ['ai-005', 'ai-006', 'ai-ns01'], riskScore: 72, criticalViolations: 2, policyCoverage: 40, lastSeen: '2026-04-14 09:10', managedBy: 'Kubernetes', infrastructure: 'gcp-cloud-run', application: 'MCP Server Platform' },
  { id: 'it-ai-02', name: 'llm-gateway.acmecorp.com', type: 'AI Platform', environment: 'Production', ownerTeam: 'AI Engineering', cryptoObjectIds: ['ai-007', 'ai-008', 'ai-adm01', 'ai-nr01'], riskScore: 68, criticalViolations: 2, policyCoverage: 60, lastSeen: '2026-04-14 09:08', managedBy: 'Terraform', infrastructure: 'aws-bedrock', application: 'LLM Gateway' },
];

// Risk driver data for each IT asset
export function getAssetRiskDrivers(asset: ITAsset) {
  const s = asset.riskScore;
  return {
    cryptoHealth: { score: Math.min(100, s + Math.floor(Math.random() * 15) - 7), driver: s > 70 ? `${Math.floor(Math.random() * 3) + 1} RSA-2048 certs with no migration plan` : 'All algorithms meet minimum standards' },
    expiryExposure: { score: Math.min(100, s + Math.floor(Math.random() * 20) - 10), driver: s > 60 ? `Nearest expiry in ${Math.floor(Math.random() * 14) + 1} days` : 'No urgent expirations' },
    policyCoverage: { score: 100 - asset.policyCoverage, driver: asset.policyCoverage < 80 ? `${100 - asset.policyCoverage}% of objects lack active policy` : 'All objects covered by policy' },
    blastRadius: { score: Math.min(100, asset.cryptoObjectIds.length * 15), driver: `${asset.cryptoObjectIds.length} identity dependencies shared across infrastructure` },
  };
}

// AI narrative per asset
export function getAssetAINarrative(asset: ITAsset): string {
  if (asset.riskScore > 80) return `${asset.name} is critically exposed. ${asset.criticalViolations} active violations are driving the risk score, with ${asset.cryptoObjectIds.length} identities — several using quantum-vulnerable algorithms. Immediate action: renew expiring certificates and assign owners to orphaned keys.`;
  if (asset.riskScore > 60) return `${asset.name} has moderate exposure primarily driven by ${asset.policyCoverage < 50 ? 'low policy coverage' : 'approaching certificate expirations'}. ${asset.cryptoObjectIds.length} identities are associated. Recommended: attach compliance policies to uncovered identities.`;
  return `${asset.name} is well-managed with ${asset.policyCoverage}% policy coverage across ${asset.cryptoObjectIds.length} identities. No urgent actions required — continue monitoring.`;
}

// Blast radius relationships
export interface BlastRadiusNode {
  id: string;
  name: string;
  type: 'asset' | 'crypto';
  ring: 0 | 1 | 2 | 3;
  riskScore?: number;
  daysToExpiry?: number;
  violations?: number;
  sharedObjectCount?: number;
  cryptoType?: string;
}

export function getBlastRadius(assetId: string, cryptoAssets: any[]): { nodes: BlastRadiusNode[]; summary: { directDeps: number; siblingAssets: number; cascadeAssets: number; sentence: string } } {
  const asset = mockITAssets.find(a => a.id === assetId);
  if (!asset) return { nodes: [], summary: { directDeps: 0, siblingAssets: 0, cascadeAssets: 0, sentence: '' } };

  const ring0: BlastRadiusNode = { id: asset.id, name: asset.name, type: 'asset', ring: 0, riskScore: asset.riskScore };

  // Ring 1: identities
  const ring1: BlastRadiusNode[] = asset.cryptoObjectIds.map((cid: string) => {
    const co = cryptoAssets.find((a: any) => a.id === cid);
    return { id: cid, name: co?.name || cid, type: 'crypto' as const, ring: 1 as const, daysToExpiry: co?.daysToExpiry, violations: co?.policyViolations, cryptoType: co?.type };
  });

  // Ring 2: sibling assets sharing identities
  const siblings = mockITAssets.filter(a => a.id !== assetId && a.cryptoObjectIds.some(c => asset.cryptoObjectIds.includes(c)));
  const ring2: BlastRadiusNode[] = siblings.map(s => ({
    id: s.id, name: s.name, type: 'asset' as const, ring: 2 as const, riskScore: s.riskScore,
    sharedObjectCount: s.cryptoObjectIds.filter(c => asset.cryptoObjectIds.includes(c)).length,
  }));

  // Ring 3: cascade (assets sharing crypto with ring 2 but not ring 0)
  const ring2Ids = new Set(siblings.map(s => s.id));
  const allSiblingCrypto = new Set(siblings.flatMap(s => s.cryptoObjectIds));
  const cascadeAssets = mockITAssets.filter(a => a.id !== assetId && !ring2Ids.has(a.id) && a.cryptoObjectIds.some(c => allSiblingCrypto.has(c)));
  const ring3: BlastRadiusNode[] = cascadeAssets.slice(0, 5).map(c => ({
    id: c.id, name: c.name, type: 'asset' as const, ring: 3 as const, riskScore: c.riskScore, sharedObjectCount: 1,
  }));

  const primaryCrypto = ring1[0]?.name || 'this asset';
  return {
    nodes: [ring0, ...ring1, ...ring2, ...ring3],
    summary: {
      directDeps: ring1.length,
      siblingAssets: ring2.length,
      cascadeAssets: ring3.length,
      sentence: `Failure of ${primaryCrypto} would directly impact ${ring2.length} assets and cascade to ${ring3.length} more.`,
    },
  };
}

// Violations for asset detail
// violationType is fundamental: 'classic' = operational (expiry, ownership, rotation, storage),
// 'pqc' = quantum-vulnerable algorithm flagged for NIST 2030 deadline.
// A single credential can have BOTH simultaneously and they're tracked independently.
export type ViolationType = 'classic' | 'pqc';

export interface AssetViolation {
  objectName: string;
  objectId?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  type: string;
  violationType: ViolationType;
  // PQC-only fields
  algorithm?: string;
  expiryYear?: number;
  yearsPastDeadline?: number;
  harvestRisk?: 'Active' | 'Passive' | 'Unknown';
}

// Quantum-vulnerable algorithms (broken vs vulnerable)
const QUANTUM_BROKEN = ['RSA-1024', 'SHA-1', 'MD5', 'DH-1024'];
const QUANTUM_VULNERABLE = [
  ...QUANTUM_BROKEN,
  'RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384',
  'ECC P-256', 'ECC P-384', 'DH-2048',
];

export function isQuantumVulnerable(algorithm: string): boolean {
  return QUANTUM_VULNERABLE.includes(algorithm);
}

// PQC severity inverts classic logic: long-lived quantum-vulnerable certs are MORE severe.
export function pqcSeverity(opts: {
  algorithm: string;
  expiryYear: number;
  isProduction: boolean;
  isDataEncryption?: boolean;
}): 'Critical' | 'High' | 'Medium' | 'Low' | 'none' {
  const { algorithm, expiryYear, isProduction, isDataEncryption } = opts;
  if (!isQuantumVulnerable(algorithm)) return 'none';
  if (expiryYear < 2027) return 'Low';
  if (QUANTUM_BROKEN.includes(algorithm) && expiryYear >= 2030) return 'Critical';
  if (QUANTUM_BROKEN.includes(algorithm)) return 'High';
  if (isDataEncryption && isProduction && expiryYear >= 2030) return 'Critical';
  if (expiryYear >= 2030 && isProduction) return 'High';
  if (expiryYear >= 2028 && isProduction) return 'Medium';
  return 'Low';
}

export function getAssetViolations(asset: ITAsset): AssetViolation[] {
  const violations: AssetViolation[] = [];

  // ── Classic / operational violations ─────────────────────────────────
  if (asset.riskScore > 70) {
    violations.push({
      objectName: asset.cryptoObjectIds[0],
      objectId: asset.cryptoObjectIds[0],
      severity: 'Critical',
      type: 'Certificate expiring in < 7 days',
      violationType: 'classic',
    });
  }
  if (asset.criticalViolations > 1) {
    violations.push({
      objectName: asset.cryptoObjectIds[1] || asset.cryptoObjectIds[0],
      objectId: asset.cryptoObjectIds[1] || asset.cryptoObjectIds[0],
      severity: 'High',
      type: 'Rotation overdue (>180 days)',
      violationType: 'classic',
    });
  }
  if (asset.policyCoverage < 50) {
    violations.push({
      objectName: asset.cryptoObjectIds[0],
      objectId: asset.cryptoObjectIds[0],
      severity: 'Medium',
      type: 'No assigned owner',
      violationType: 'classic',
    });
  }
  if (asset.criticalViolations > 2) {
    violations.push({
      objectName: asset.cryptoObjectIds[2] || asset.cryptoObjectIds[0],
      objectId: asset.cryptoObjectIds[2] || asset.cryptoObjectIds[0],
      severity: 'High',
      type: 'Key stored outside HSM',
      violationType: 'classic',
    });
  }

  // ── PQC / quantum-risk violations ────────────────────────────────────
  // Synthesised based on asset profile so demo data shows the duality.
  const isProd = asset.environment === 'Production';
  const seedAlgs = ['RSA-2048', 'ECC P-256', 'SHA-1'];
  const expiryYears = [2031, 2029, 2032];
  asset.cryptoObjectIds.slice(0, 2).forEach((cid, idx) => {
    const algorithm = seedAlgs[idx % seedAlgs.length];
    const expiryYear = expiryYears[idx % expiryYears.length];
    const sev = pqcSeverity({
      algorithm,
      expiryYear,
      isProduction: isProd,
      isDataEncryption: idx === 0,
    });
    if (sev !== 'none') {
      violations.push({
        objectName: cid,
        objectId: cid,
        severity: sev,
        type: `Quantum-vulnerable: ${algorithm} past NIST 2030`,
        violationType: 'pqc',
        algorithm,
        expiryYear,
        yearsPastDeadline: Math.max(0, expiryYear - 2030),
        harvestRisk: idx === 0 ? 'Active' : 'Passive',
      });
    }
  });

  return violations;
}

// Groups mock data
export interface DynamicGroup {
  id: string;
  name: string;
  type: 'Dynamic' | 'Manual';
  objectCount: number;
  objectIds: string[];
  conditions?: GroupCondition[];
  conditionSummary?: string;
  riskScore: number;
  policyCount: number;
  policyCoverage: number;
  lastEvaluated: string;
  aiSuggested?: boolean;
  aiRationale?: string;
  ownerTeam?: string;
  // Composition stats
  topAlgorithms: { name: string; count: number }[];
  topEnvironments: { name: string; count: number }[];
  topIssuers: { name: string; count: number }[];
  typeBreakdown: { name: string; value: number }[];
  // Posture
  posture: { ah: number; ep: number; pqr: number; gc: number; ait: number };
  trendData: number[];
  aiNarrative: string;
  // Policies
  policies: GroupPolicy[];
  // Remediation tasks
  remediationTasks: RemediationTask[];
}

export interface GroupCondition {
  id: string;
  attribute: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

export interface GroupPolicy {
  id: string;
  name: string;
  enforcementMode: 'Report' | 'Warn' | 'Enforce' | 'Quarantine';
  objectsCovered: number;
  violations: number;
  enabled: boolean;
}

export interface RemediationTask {
  id: string;
  objectName: string;
  taskType: string;
  severity: 'Critical' | 'High' | 'Medium';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignee: string;
}

export const mockGroups: DynamicGroup[] = [
  {
    id: 'grp-001', name: 'RSA-2048 Production Certs', type: 'Dynamic', objectCount: 47,
    objectIds: ['cert-001', 'cert-003', 'cert-004', 'cert-007', 'cert-008', 'cert-009', 'cert-010', 'ssh-001', 'ssh-005', 'sshcert-002', 'k8s-003', 'k8s-004'],
    conditions: [
      { id: 'c1', attribute: 'Algorithm', operator: 'equals', value: 'RSA-2048', logic: 'AND' },
      { id: 'c2', attribute: 'Environment', operator: 'equals', value: 'Production' },
    ],
    conditionSummary: 'All RSA-2048 objects in Production',
    riskScore: 78, policyCount: 2, policyCoverage: 62, lastEvaluated: '10 min ago',
    topAlgorithms: [{ name: 'RSA-2048', count: 47 }],
    topEnvironments: [{ name: 'Production', count: 47 }],
    topIssuers: [{ name: 'DigiCert', count: 18 }, { name: 'MSCA', count: 14 }, { name: 'Let\'s Encrypt', count: 15 }],
    typeBreakdown: [{ name: 'TLS Certificates', value: 32 }, { name: 'SSH Keys', value: 8 }, { name: 'K8s Certs', value: 7 }],
    posture: { ah: 28, ep: 45, pqr: 12, gc: 65, ait: 80 },
    trendData: [82, 80, 79, 81, 83, 82, 80, 78, 79, 80, 81, 79, 78, 77, 78, 79, 80, 78, 77, 76, 78, 79, 78, 77, 76, 78, 79, 78, 78, 78],
    aiNarrative: 'This group\'s risk is driven primarily by poor Algorithm Health — all 47 objects use RSA-2048, which is quantum-vulnerable with no active migration plan. 8 objects expire within 30 days. Recommended: activate the NIST SP 800-131A compliance pack and queue top-10 harvest-risk objects for PQC migration.',
    policies: [
      { id: 'gp-001', name: 'Weak Algorithm Detection', enforcementMode: 'Warn', objectsCovered: 47, violations: 47, enabled: true },
      { id: 'gp-002', name: 'Certificate Expiry Alert', enforcementMode: 'Enforce', objectsCovered: 32, violations: 8, enabled: true },
    ],
    remediationTasks: [
      { id: 'rt-001', objectName: '*.payments.acmecorp.com', taskType: 'PQC Migration', severity: 'Critical', status: 'Pending', assignee: 'Sarah Chen' },
      { id: 'rt-002', objectName: 'vault.internal.acmecorp.com', taskType: 'Renew + Rekey', severity: 'Critical', status: 'In Progress', assignee: 'Mike Rodriguez' },
      { id: 'rt-003', objectName: 'prod-db-01-authorized-key', taskType: 'Rotate', severity: 'High', status: 'Pending', assignee: 'Unassigned' },
      { id: 'rt-004', objectName: 'mail.acmecorp.com', taskType: 'Renew', severity: 'High', status: 'Pending', assignee: 'IT Operations' },
    ],
  },
  {
    id: 'grp-002', name: 'Expiring < 30 Days', type: 'Dynamic', objectCount: 12,
    objectIds: ['cert-001', 'cert-008', 'cert-009', 'sshcert-002', 'ai-001', 'ai-002', 'ai-003', 'k8s-001', 'k8s-002', 'ai-007'],
    conditions: [
      { id: 'c1', attribute: 'Days to Expiry', operator: 'less_than', value: '30' },
    ],
    conditionSummary: 'All objects expiring within 30 days',
    riskScore: 89, policyCount: 1, policyCoverage: 42, lastEvaluated: '5 min ago',
    topAlgorithms: [{ name: 'RSA-2048', count: 5 }, { name: 'ECC P-256', count: 3 }, { name: 'HMAC-SHA256', count: 4 }],
    topEnvironments: [{ name: 'Production', count: 12 }],
    topIssuers: [{ name: 'DigiCert', count: 4 }, { name: 'Internal Token Service', count: 4 }, { name: 'Istio Citadel', count: 2 }],
    typeBreakdown: [{ name: 'TLS Certificates', value: 3 }, { name: 'AI Tokens', value: 4 }, { name: 'K8s Certs', value: 2 }, { name: 'SSH Certs', value: 1 }, { name: 'Other', value: 2 }],
    posture: { ah: 55, ep: 8, pqr: 35, gc: 48, ait: 60 },
    trendData: [65, 68, 70, 72, 75, 74, 76, 78, 80, 82, 83, 84, 85, 86, 87, 86, 87, 88, 87, 88, 89, 88, 89, 89, 89, 89, 89, 89, 89, 89],
    aiNarrative: 'This group is critically exposed — 12 objects expire within 30 days with only 42% policy coverage. 3 TLS certificates serve production infrastructure with no auto-renewal configured. Immediate action: enable auto-renewal where possible and create tickets for manual renewals.',
    policies: [
      { id: 'gp-003', name: 'Certificate Expiry Alert', enforcementMode: 'Enforce', objectsCovered: 5, violations: 12, enabled: true },
    ],
    remediationTasks: [
      { id: 'rt-005', objectName: '*.payments.acmecorp.com', taskType: 'Renew', severity: 'Critical', status: 'Pending', assignee: 'Sarah Chen' },
      { id: 'rt-006', objectName: 'k8s-node-ssh-cert', taskType: 'Re-issue', severity: 'Critical', status: 'Pending', assignee: 'Platform Team' },
      { id: 'rt-007', objectName: 'vault.internal.acmecorp.com', taskType: 'Renew', severity: 'Critical', status: 'In Progress', assignee: 'Mike Rodriguez' },
    ],
  },
  {
    id: 'grp-003', name: 'Orphaned & Unowned Keys', type: 'Dynamic', objectCount: 6,
    objectIds: ['ssh-001', 'ssh-005', 'secret-002'],
    conditions: [
      { id: 'c1', attribute: 'Has Owner', operator: 'equals', value: 'No', logic: 'OR' },
      { id: 'c2', attribute: 'Status', operator: 'equals', value: 'Orphaned' },
    ],
    conditionSummary: 'All objects with no owner or Orphaned status',
    riskScore: 74, policyCount: 1, policyCoverage: 33, lastEvaluated: '15 min ago',
    topAlgorithms: [{ name: 'RSA-2048', count: 4 }, { name: 'HMAC-SHA256', count: 2 }],
    topEnvironments: [{ name: 'Production', count: 6 }],
    topIssuers: [{ name: 'N/A', count: 3 }, { name: 'AWS IAM', count: 1 }, { name: 'GitHub', count: 1 }],
    typeBreakdown: [{ name: 'SSH Keys', value: 3 }, { name: 'API Keys', value: 2 }, { name: 'Other', value: 1 }],
    posture: { ah: 40, ep: 60, pqr: 45, gc: 10, ait: 70 },
    trendData: [70, 71, 72, 72, 73, 74, 74, 74, 73, 74, 74, 73, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74],
    aiNarrative: 'Governance Cover is critically low at 10%. These 6 objects have no assigned owner, making incident response impossible. 3 SSH keys haven\'t been rotated in over 300 days. Assign ownership immediately and enforce rotation policies.',
    policies: [
      { id: 'gp-004', name: 'Orphaned SSH Key', enforcementMode: 'Warn', objectsCovered: 2, violations: 3, enabled: true },
    ],
    remediationTasks: [
      { id: 'rt-008', objectName: 'prod-db-01-authorized-key', taskType: 'Assign Owner', severity: 'High', status: 'Pending', assignee: 'Unassigned' },
      { id: 'rt-009', objectName: 'gitlab-deploy-key', taskType: 'Rotate + Assign', severity: 'High', status: 'Pending', assignee: 'Unassigned' },
    ],
  },
  {
    id: 'grp-004', name: 'Payments Team Assets', type: 'Manual', objectCount: 8,
    objectIds: ['cert-001', 'k8s-001', 'enc-001', 'secret-001'],
    riskScore: 62, policyCount: 3, policyCoverage: 88, lastEvaluated: '1 hour ago',
    topAlgorithms: [{ name: 'RSA-2048', count: 2 }, { name: 'ECC P-256', count: 3 }, { name: 'AES-256', count: 2 }],
    topEnvironments: [{ name: 'Production', count: 7 }, { name: 'Staging', count: 1 }],
    topIssuers: [{ name: 'DigiCert', count: 3 }, { name: 'Istio Citadel', count: 2 }, { name: 'AWS KMS', count: 1 }],
    typeBreakdown: [{ name: 'TLS Certificates', value: 3 }, { name: 'K8s Certs', value: 2 }, { name: 'Enc Keys', value: 2 }, { name: 'Secrets', value: 1 }],
    posture: { ah: 55, ep: 50, pqr: 40, gc: 85, ait: 75 },
    trendData: [68, 67, 66, 65, 64, 63, 63, 62, 62, 62, 63, 63, 62, 62, 61, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62],
    aiNarrative: 'The Payments team maintains good governance with 88% policy coverage. Primary concern is 2 RSA-2048 certificates in the PCI-DSS zone that need PQC migration planning. Expiry posture is moderate — one wildcard cert expires in 6 days.',
    policies: [
      { id: 'gp-005', name: 'PCI-DSS Cardholder Zone', enforcementMode: 'Enforce', objectsCovered: 6, violations: 0, enabled: true },
      { id: 'gp-006', name: 'Certificate Expiry Alert', enforcementMode: 'Enforce', objectsCovered: 5, violations: 1, enabled: true },
      { id: 'gp-007', name: 'Weak Algorithm Detection', enforcementMode: 'Warn', objectsCovered: 8, violations: 2, enabled: true },
    ],
    remediationTasks: [
      { id: 'rt-010', objectName: '*.payments.acmecorp.com', taskType: 'Renew', severity: 'Critical', status: 'In Progress', assignee: 'Sarah Chen' },
    ],
  },
];

export const aiSuggestedGroups: Partial<DynamicGroup>[] = [
  {
    id: 'ai-grp-001', name: 'DigiCert Certs — 90-Day Validity', aiSuggested: true, objectCount: 186, type: 'Dynamic',
    conditions: [{ id: 'ac1', attribute: 'Issuing CA', operator: 'equals', value: 'DigiCert Global G2', logic: 'AND' }, { id: 'ac2', attribute: 'Validity Period', operator: 'less_than', value: '91 days' }],
    conditionSummary: 'All DigiCert certs with validity period ≤ 90 days',
    aiRationale: '186 objects share this CA and validity period. 12 expire within 30 days with no auto-renewal — your highest-risk uncovered segment.',
    riskScore: 71,
  },
  {
    id: 'ai-grp-002', name: 'Production Self-Signed Certificates', aiSuggested: true, objectCount: 12, type: 'Dynamic',
    conditions: [{ id: 'ac3', attribute: 'Issuing CA', operator: 'equals', value: 'Self-Signed', logic: 'AND' }, { id: 'ac4', attribute: 'Environment', operator: 'equals', value: 'Production' }],
    conditionSummary: 'All self-signed certs in Production',
    aiRationale: '12 self-signed certificates in production with zero policy coverage. These bypass trust chain validation entirely.',
    riskScore: 88,
  },
  {
    id: 'ai-grp-003', name: 'Over-Privileged AI Agents', aiSuggested: true, objectCount: 4, type: 'Dynamic',
    conditions: [{ id: 'ac5', attribute: 'Object Type', operator: 'equals', value: 'AI Agent Token', logic: 'AND' }, { id: 'ac6', attribute: 'Permission Risk', operator: 'equals', value: 'Over-privileged' }],
    conditionSummary: 'AI Agent Tokens flagged as over-privileged',
    aiRationale: '4 AI agents have excessive permissions across 22 services. One expired agent still holds active firewall modification access.',
    riskScore: 79,
  },
];

// Condition builder attributes catalog
export const conditionAttributes = {
  identity: [
    { label: 'Object Type', values: ['TLS Certificate', 'SSH Key', 'SSH Certificate', 'Code-Signing Certificate', 'K8s Workload Cert', 'Encryption Key', 'AI Agent Token', 'API Key / Secret'] },
    { label: 'Algorithm', values: ['RSA-2048', 'RSA-4096', 'ECC P-256', 'ECC P-384', 'Ed25519', 'AES-256', 'HMAC-SHA256', 'ML-KEM', 'ML-DSA', 'SLH-DSA'] },
    { label: 'Key Size', values: ['256', '384', '2048', '4096'] },
    { label: 'Issuing CA', values: ['DigiCert Global G2', 'Entrust L1K', 'Let\'s Encrypt R3', 'MSCA Enterprise', 'Self-Signed', 'Internal SSH CA', 'Istio Citadel CA', 'AWS KMS', 'Azure Key Vault', 'HashiCorp Vault'] },
    { label: 'Self-Signed', values: ['Yes', 'No'] },
    { label: 'Wildcard', values: ['Yes', 'No'] },
    { label: 'CA Type', values: ['Public', 'Private', 'Self-Signed'] },
  ],
  lifecycle: [
    { label: 'Days to Expiry', values: ['< 7', '< 30', '< 90', 'Expired', 'No expiry'] },
    { label: 'Validity Period', values: ['< 90 days', '< 365 days', '> 365 days', '> 825 days'] },
    { label: 'Last Rotation', values: ['Never', '> 90 days', '> 180 days', '> 365 days'] },
    { label: 'Renewal Method', values: ['Manual', 'ACME', 'Auto-enrolled', 'Unknown'] },
  ],
  infrastructure: [
    { label: 'Environment', values: ['Production', 'Staging', 'Development'] },
    { label: 'Cloud Provider', values: ['AWS', 'Azure', 'GCP', 'On-prem'] },
    { label: 'K8s Namespace', values: ['payments', 'api', 'monitoring', 'default', 'security'] },
  ],
  discovery: [
    { label: 'Discovery Vector', values: ['CT Log', 'Network Scan', 'Endpoint Agent', 'Cloud API', 'Kubernetes API', 'Source Code Scan', 'SSH Host Scan', 'CA Connector', 'CMDB Import'] },
    { label: 'Shadow Certificate', values: ['Yes', 'No'] },
  ],
  ownership: [
    { label: 'Owner Team', values: ['Payments Engineering', 'Platform Engineering', 'Infrastructure', 'DevOps', 'Security Operations', 'AI Engineering', 'IT Operations', 'Database Operations', 'Identity & Access'] },
    { label: 'Has Owner', values: ['Yes', 'No'] },
    { label: 'Managed By', values: ['Terraform', 'Kubernetes', 'Ansible', 'Manual', 'Cloudflare', 'DigiCert CertCentral'] },
  ],
};
