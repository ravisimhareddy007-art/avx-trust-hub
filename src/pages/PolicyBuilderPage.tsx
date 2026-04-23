import React, { useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { policyRules, customPolicies as initialCustomPolicies } from '@/data/mockData';
import { mockGroups } from '@/data/inventoryMockData';
import { SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import {
  Plus,
  Download,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  CheckSquare,
  Key,
  Lock,
  Bot,
  CheckCircle2,
  X,
  Globe,
  Server,
  Layers,
  Users,
  ShieldCheck,
  Bell,
  Ticket,
  Clock,
} from 'lucide-react';

interface CustomPolicy {
  id: string;
  name: string;
  description: string;
  status: string;
  violations: number;
  assetType?: string;
  condition?: string;
  value?: string;
  severity?: string;
  environments?: string[];
  teams?: string;
  actions?: string[];
  groupIds?: string[];
}

type PolicyType = 'ssh-key' | 'certificates' | 'secrets' | 'ai-agents' | '';

type CertSubType = 'tls' | 'code-signing' | 'ssh-cert' | 'kubernetes' | 'smine' | 'client-auth';

const CERT_SUBTYPES: { id: CertSubType; label: string; desc: string; nextRelease?: boolean }[] = [
  { id: 'tls', label: 'TLS / SSL', desc: 'HTTPS, mTLS, API gateways, load balancers' },
  { id: 'code-signing', label: 'Code-Signing', desc: 'Software packages, scripts, containers' },
  { id: 'ssh-cert', label: 'SSH Certificates', desc: 'CA-signed SSH access with short TTL', nextRelease: true },
  { id: 'kubernetes', label: 'Kubernetes Workload', desc: 'Pod identity, service mesh, cert-manager' },
  { id: 'smine', label: 'S/MIME', desc: 'Email identity and signing' },
  { id: 'client-auth', label: 'Client Auth', desc: 'mTLS client-side certificates' },
];

const CA_OPTIONS = [
  'AppViewX CA',
  'DigiCert',
  'GlobalSign',
  'Entrust',
  "Let's Encrypt",
  'Microsoft CA',
  'Sectigo',
  'Internal MSCA',
  'HashiCorp Vault PKI',
];

const SECRET_TYPES = [
  'API Keys',
  'OAuth Tokens',
  'Database Credentials',
  'Service Account Keys',
  'HashiCorp Vault Secrets',
  'AWS Secrets Manager',
  'Azure Key Vault Secrets',
];

const VAULT_OPTIONS = [
  'HashiCorp Vault',
  'AWS Secrets Manager',
  'Azure Key Vault',
  'CyberArk Conjur',
  'GCP Secret Manager',
];

const POLICY_TEMPLATES = [
  {
    id: 'pci-ssh',
    label: 'PCI-DSS SSH Baseline',
    desc: 'Ed25519 only · 90-day rotation · auto-rotate · block weak algorithms',
    type: 'ssh-key' as PolicyType,
    badge: 'PCI-DSS',
    badgeColor: 'coral',
    prefill: {
      allowedAlgorithms: ['Ed25519', 'RSA-4096'],
      maxKeyAge: 90,
      autoRotate: true,
      rotationPeriod: 90,
      targetAlgorithm: 'Ed25519',
      violationActions: ['Alert only', 'Block issuance'],
      formSeverity: 'Critical',
    },
  },
  {
    id: 'nist-ssh',
    label: 'NIST 800-57 SSH Keys',
    desc: 'RSA-4096 minimum · annual rotation · flag orphaned keys',
    type: 'ssh-key' as PolicyType,
    badge: 'NIST',
    badgeColor: 'purple',
    prefill: {
      allowedAlgorithms: ['Ed25519', 'RSA-4096'],
      maxKeyAge: 365,
      autoRotate: false,
      violationActions: ['Alert only', 'Escalate to owner'],
      formSeverity: 'High',
    },
  },
  {
    id: 'zero-trust-tls',
    label: 'Zero-Trust TLS',
    desc: '90-day max validity · auto-renew at 30d · block self-signed',
    type: 'certificates' as PolicyType,
    badge: 'Zero-Trust',
    badgeColor: 'teal',
    prefill: {
      certSubTypes: ['tls' as CertSubType],
      certAction: 'renew',
      maxValidity: 90,
      autoRotate: true,
      rotateBeforeExpiry: 30,
      violationActions: ['Alert only', 'Auto-remediate'],
      formSeverity: 'High',
    },
  },
  {
    id: 'dora-cert',
    label: 'DORA Operational Resilience',
    desc: '90-day expiry alerts · ITSM change request · block self-signed',
    type: 'certificates' as PolicyType,
    badge: 'DORA',
    badgeColor: 'amber',
    prefill: {
      certSubTypes: ['tls' as CertSubType],
      certAction: 'alert',
      maxValidity: 365,
      violationActions: ['Alert only', 'Create ticket'],
      itsm: true,
      itsmPriority: '2-High',
      formSeverity: 'High',
    },
  },
  {
    id: 'secret-rotation',
    label: 'Secret Rotation Baseline',
    desc: '90-day max age · auto-rotate · vault-only storage required',
    type: 'secrets' as PolicyType,
    badge: 'Baseline',
    badgeColor: 'purple',
    prefill: {
      secretTypes: ['API Keys', 'OAuth Tokens'],
      secretMaxAge: 90,
      secretAutoRotate: true,
      secretRotationPeriod: 90,
      approvedVaults: ['HashiCorp Vault'],
      violationActions: ['Alert only', 'Auto-remediate'],
      formSeverity: 'High',
    },
  },
  {
    id: 'agent-jit',
    label: 'AI Agent JIT Credentials',
    desc: '24h max TTL · JIT required · block static long-lived tokens',
    type: 'ai-agents' as PolicyType,
    badge: 'Zero-Trust',
    badgeColor: 'teal',
    prefill: {
      agentMaxTTL: 1,
      agentTTLUnit: 'days',
      enforceJIT: true,
      allowedAlgorithms: ['HMAC-SHA256', 'Ed25519'],
      violationActions: ['Alert only', 'Block issuance'],
      formSeverity: 'Critical',
    },
  },
];

function buildPolicyPreview(p: {
  policyType: PolicyType;
  formName: string;
  certSubTypes: CertSubType[];
  certAction: string;
  caSelected: string;
  maxValidity: number;
  allowedAlgorithms: string[];
  maxKeyAge: number;
  autoRotate: boolean;
  rotationPeriod: number;
  rotateBeforeExpiry: number;
  targetAlgorithm: string;
  secretTypes: string[];
  secretMaxAge: number;
  secretAutoRotate: boolean;
  secretRotationPeriod: number;
  approvedVaults: string[];
  agentMaxTTL: number;
  agentTTLUnit: string;
  enforceJIT: boolean;
  violationActions: string[];
  formSeverity: string;
  scopeMode: string;
  scopeEnvironments: string[];
  requireApproval: boolean;
  approvalType: string;
  itsm: boolean;
  notifyOnFail: boolean;
}): string {
  if (!p.policyType) return 'Select a policy type to see a preview.';

  const lines: string[] = [];

  const scope = p.scopeMode === 'environment' && p.scopeEnvironments.length
    ? `${p.scopeEnvironments.join(', ')} environment`
    : 'all environments';

  if (p.policyType === 'ssh-key') {
    lines.push(`Governs SSH keys in ${scope}.`);
    if (p.allowedAlgorithms.length) lines.push(`✓ Allowed algorithms: ${p.allowedAlgorithms.join(', ')}.`);
    lines.push(`✓ Maximum key age: ${p.maxKeyAge} days.`);
    if (p.autoRotate) lines.push(`✓ Auto-rotates to ${p.targetAlgorithm} every ${p.rotationPeriod} days.`);
    else lines.push(`ℹ Rotation is manual — no auto-rotate.`);
  } else if (p.policyType === 'certificates') {
    const subtypes = p.certSubTypes.length
      ? p.certSubTypes.map(s => CERT_SUBTYPES.find(x => x.id === s)?.label || s).join(', ')
      : 'all certificate types';
    lines.push(`Governs ${subtypes} certificates in ${scope}.`);
    if (p.certAction !== 'alert') lines.push(`✓ Action: ${p.certAction} via ${p.caSelected || 'selected CA'}.`);
    lines.push(`✓ Maximum validity: ${p.maxValidity} days.`);
    if (p.autoRotate) lines.push(`✓ Auto-renews ${p.rotateBeforeExpiry} days before expiry.`);
    if (p.allowedAlgorithms.length) lines.push(`✓ Minimum key strength: ${p.allowedAlgorithms.join(', ')}.`);
  } else if (p.policyType === 'secrets') {
    const types = p.secretTypes.length ? p.secretTypes.join(', ') : 'all secret types';
    lines.push(`Governs ${types} in ${scope}.`);
    lines.push(`✓ Maximum age: ${p.secretMaxAge} days.`);
    if (p.secretAutoRotate) lines.push(`✓ Auto-rotates every ${p.secretRotationPeriod} days.`);
    if (p.approvedVaults.length) lines.push(`✓ Approved storage: ${p.approvedVaults.join(', ')}.`);
  } else if (p.policyType === 'ai-agents') {
    lines.push(`Governs AI agent tokens in ${scope}.`);
    lines.push(`✓ Max TTL: ${p.agentMaxTTL} ${p.agentTTLUnit}.`);
    if (p.enforceJIT) lines.push(`✓ JIT issuance required — no static credentials.`);
    if (p.allowedAlgorithms.length) lines.push(`✓ Allowed algorithms: ${p.allowedAlgorithms.join(', ')}.`);
  }

  lines.push('');
  lines.push(`On violation → ${p.violationActions.join(' + ')}.`);
  lines.push(`Severity: ${p.formSeverity}.`);
  if (p.requireApproval) lines.push(`Approval required from: ${p.approvalType}.`);
  if (p.itsm) lines.push('Creates a ServiceNow change request.');
  if (p.notifyOnFail) lines.push('Notifies on failure.');

  return lines.join('\n');
}

const mockViolations = [
  { id: 'v-001', policyName: 'Weak Algorithm Detection', objectName: '*.payments.acmecorp.com', objectType: 'TLS Certificate', severity: 'Critical' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-14 09:12', status: 'Open' },
  { id: 'v-002', policyName: 'Certificate Expiry Alert', objectName: 'vault.internal.acmecorp.com', objectType: 'TLS Certificate', severity: 'Critical' as const, environment: 'Production', group: 'Expiring < 30 Days', detectedAt: '2026-04-14 08:45', status: 'Open' },
  { id: 'v-003', policyName: 'Weak Algorithm Detection', objectName: 'prod-db-01-authorized-key', objectType: 'SSH Key', severity: 'High' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-13 22:00', status: 'Open' },
  { id: 'v-004', policyName: 'Orphaned SSH Key', objectName: 'gitlab-deploy-key', objectType: 'SSH Key', severity: 'High' as const, environment: 'Production', group: 'Orphaned & Unowned Keys', detectedAt: '2026-04-13 18:30', status: 'Open' },
  { id: 'v-005', policyName: 'Certificate Expiry Alert', objectName: 'mail.acmecorp.com', objectType: 'TLS Certificate', severity: 'High' as const, environment: 'Production', group: 'Expiring < 30 Days', detectedAt: '2026-04-13 14:20', status: 'Open' },
  { id: 'v-006', policyName: 'PCI-DSS Cardholder Zone', objectName: 'k8s-node-ssh-cert', objectType: 'SSH Certificate', severity: 'Critical' as const, environment: 'Production', group: 'Payments Team Assets', detectedAt: '2026-04-13 11:05', status: 'Acknowledged' },
  { id: 'v-007', policyName: 'Weak Algorithm Detection', objectName: 'auth-gateway.acmecorp.com', objectType: 'TLS Certificate', severity: 'High' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-12 16:42', status: 'Open' },
  { id: 'v-008', policyName: 'DORA Compliance', objectName: 'staging-api.acmecorp.com', objectType: 'TLS Certificate', severity: 'Medium' as const, environment: 'Staging', group: '', detectedAt: '2026-04-12 10:00', status: 'Open' },
  { id: 'v-009', policyName: 'Orphaned SSH Key', objectName: 'bastion-host-key-legacy', objectType: 'SSH Key', severity: 'High' as const, environment: 'Production', group: 'Orphaned & Unowned Keys', detectedAt: '2026-04-11 22:15', status: 'Open' },
  { id: 'v-010', policyName: 'Certificate Expiry Alert', objectName: 'cdn-edge-cert-03', objectType: 'TLS Certificate', severity: 'Medium' as const, environment: 'Production', group: 'Expiring < 30 Days', detectedAt: '2026-04-11 15:30', status: 'Remediated' },
  { id: 'v-011', policyName: 'Weak Algorithm Detection', objectName: 'legacy-erp-cert', objectType: 'TLS Certificate', severity: 'Critical' as const, environment: 'Production', group: 'RSA-2048 Production Certs', detectedAt: '2026-04-10 09:00', status: 'Open' },
  { id: 'v-012', policyName: 'AI Agent Over-Privilege', objectName: 'data-pipeline-agent', objectType: 'AI Agent Token', severity: 'High' as const, environment: 'Production', group: 'Over-Privileged AI Agents', detectedAt: '2026-04-10 08:15', status: 'Open' },
];

const badgeColorClasses: Record<string, string> = {
  coral: 'bg-coral/10 text-coral',
  amber: 'bg-amber/10 text-amber',
  teal: 'bg-teal/10 text-teal',
  purple: 'bg-purple/10 text-purple',
};

const getPolicyTypeMeta = (type: PolicyType) => {
  switch (type) {
    case 'ssh-key':
      return { label: 'SSH Keys', icon: Key, cls: 'bg-amber/10 text-amber border-amber/20' };
    case 'certificates':
      return { label: 'Certificates', icon: Shield, cls: 'bg-teal/10 text-teal border-teal/20' };
    case 'secrets':
      return { label: 'Secrets & API Keys', icon: Lock, cls: 'bg-purple/10 text-purple border-purple/20' };
    case 'ai-agents':
      return { label: 'AI Agents', icon: Bot, cls: 'bg-teal/10 text-teal border-teal/20' };
    default:
      return null;
  }
};

const getPolicyTypeFromAssetType = (assetType?: string): PolicyType => {
  const value = (assetType || '').toLowerCase();
  if (value.includes('ssh key')) return 'ssh-key';
  if (value.includes('agent')) return 'ai-agents';
  if (value.includes('secret') || value.includes('api key') || value.includes('oauth')) return 'secrets';
  if (value.includes('certificate') || value.includes('tls') || value.includes('code-signing') || value.includes('workload') || value.includes('client auth') || value.includes('s/mime')) return 'certificates';
  return '';
};

const getPolicyTypeBadgeFromAsset = (assetType?: string) => getPolicyTypeMeta(getPolicyTypeFromAssetType(assetType));

const getScopeEstimate = () => mockGroups.reduce((sum, group) => sum + group.objectCount, 0);

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'violations' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies.map(p => ({ ...p })));
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssetType, setFormAssetType] = useState('TLS Certificate');
  const [formCondition, setFormCondition] = useState('Expiry less than');
  const [formValue, setFormValue] = useState('30 days');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formEnvironments, setFormEnvironments] = useState<string[]>(['All']);
  const [formTeams, setFormTeams] = useState('');
  const [formActions, setFormActions] = useState<string[]>(['Alert only']);
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [policyType, setPolicyType] = useState<PolicyType>('');

  const [scopeMode, setScopeMode] = useState<'all' | 'group' | 'environment' | 'team'>('all');
  const [scopeGroupIds, setScopeGroupIds] = useState<string[]>([]);
  const [scopeEnvironments, setScopeEnvironments] = useState<string[]>(['Production']);
  const [scopeTeam, setScopeTeam] = useState('');

  const [certSubTypes, setCertSubTypes] = useState<CertSubType[]>(['tls']);
  const [certAction, setCertAction] = useState<'enroll' | 'renew' | 'reenroll' | 'alert'>('alert');
  const [caSelected, setCaSelected] = useState('');
  const [maxValidity, setMaxValidity] = useState(365);
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotateBeforeExpiry, setRotateBeforeExpiry] = useState(30);
  const [requireEV, setRequireEV] = useState(false);
  const [requireTimestamp, setRequireTimestamp] = useState(true);
  const [k8sIssuer, setK8sIssuer] = useState('cert-manager');
  const [k8sNamespace, setK8sNamespace] = useState('');
  const [sshCertMaxTTL, setSshCertMaxTTL] = useState(24);
  const [sshCertPrincipals, setSshCertPrincipals] = useState('');

  const [allowedAlgorithms, setAllowedAlgorithms] = useState<string[]>(['Ed25519', 'RSA-4096']);
  const [maxKeyAge, setMaxKeyAge] = useState(90);
  const [acceptedRisks, setAcceptedRisks] = useState<string[]>([]);
  const [rotationPeriod, setRotationPeriod] = useState(90);
  const [targetAlgorithm, setTargetAlgorithm] = useState('Ed25519');

  const [secretTypes, setSecretTypesState] = useState<string[]>(['API Keys']);
  const [secretMaxAge, setSecretMaxAge] = useState(90);
  const [secretAutoRotate, setSecretAutoRotate] = useState(false);
  const [secretRotationPeriod, setSecretRotationPeriod] = useState(90);
  const [approvedVaults, setApprovedVaults] = useState<string[]>(['HashiCorp Vault']);
  const [secretScanning, setSecretScanning] = useState(true);

  const [agentMaxTTL, setAgentMaxTTL] = useState(1);
  const [agentTTLUnit, setAgentTTLUnit] = useState<'hours' | 'days'>('days');
  const [enforceJIT, setEnforceJIT] = useState(false);
  const [enforceRightSize, setEnforceRightSize] = useState(false);
  const [requireHITL, setRequireHITL] = useState(false);

  const [violationActions, setViolationActions] = useState<string[]>(['Alert only']);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [requireApproval, setRequireApproval] = useState(false);
  const [approvalType, setApprovalType] = useState<'user-group' | 'user' | 'email' | 'ldap-manager'>('user-group');
  const [approvalTarget, setApprovalTarget] = useState('');
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [enableComments, setEnableComments] = useState(false);

  const [notifyVia, setNotifyVia] = useState<'email' | 'slack'>('email');
  const [notifyRecipient, setNotifyRecipient] = useState('');
  const [notifyOnStart, setNotifyOnStart] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnFail, setNotifyOnFail] = useState(true);

  const [itsm, setItsm] = useState(false);
  const [itsmPriority, setItsmPriority] = useState('2-High');
  const [itsmType, setItsmType] = useState('Normal');

  const [changeWindow, setChangeWindow] = useState(false);
  const [changeWindowSchedule, setChangeWindowSchedule] = useState('');

  const [attemptedNext, setAttemptedNext] = useState(false);

  const [violationSearch, setViolationSearch] = useState('');
  const [violationSeverity, setViolationSeverity] = useState('');
  const [violationStatus, setViolationStatus] = useState('');
  const [selectedViolations, setSelectedViolations] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const toggleEnv = (e: string) => setFormEnvironments(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  const toggleAction = (a: string) => setFormActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const toggleGroup = (gid: string) => setFormGroupIds(prev => prev.includes(gid) ? prev.filter(x => x !== gid) : [...prev, gid]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormAssetType('TLS Certificate');
    setFormCondition('Expiry less than');
    setFormValue('30 days');
    setFormSeverity('High');
    setFormEnvironments(['All']);
    setFormTeams('');
    setFormActions(['Alert only']);
    setFormGroupIds([]);
    setEditingPolicy(null);
  };

  const toggleAlgorithm = (a: string) => setAllowedAlgorithms(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const toggleCertSubType = (s: CertSubType) => setCertSubTypes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleViolationAction = (a: string) => setViolationActions(p => {
    if (a === 'Alert only') return ['Alert only'];
    const without = p.filter(x => x !== 'Alert only');
    return without.includes(a) ? without.filter(x => x !== a) : [...without, a];
  });
  const toggleSecretType = (t: string) => setSecretTypesState(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleVault = (v: string) => setApprovedVaults(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleAcceptedRisk = (r: string) => setAcceptedRisks(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const resetPanelState = () => {
    setPolicyType('');
    setWizardStep(1);
    setScopeMode('all');
    setScopeGroupIds([]);
    setScopeEnvironments(['Production']);
    setScopeTeam('');
    setCertSubTypes(['tls']);
    setCertAction('alert');
    setCaSelected('');
    setMaxValidity(365);
    setAutoRotate(false);
    setRotateBeforeExpiry(30);
    setRequireEV(false);
    setRequireTimestamp(true);
    setK8sIssuer('cert-manager');
    setK8sNamespace('');
    setSshCertMaxTTL(24);
    setSshCertPrincipals('');
    setAllowedAlgorithms(['Ed25519', 'RSA-4096']);
    setMaxKeyAge(90);
    setAcceptedRisks([]);
    setRotationPeriod(90);
    setTargetAlgorithm('Ed25519');
    setSecretTypesState(['API Keys']);
    setSecretMaxAge(90);
    setSecretAutoRotate(false);
    setSecretRotationPeriod(90);
    setApprovedVaults(['HashiCorp Vault']);
    setSecretScanning(true);
    setAgentMaxTTL(1);
    setAgentTTLUnit('days');
    setEnforceJIT(false);
    setEnforceRightSize(false);
    setRequireHITL(false);
    setViolationActions(['Alert only']);
    setShowAdvanced(false);
    setRequireApproval(false);
    setApprovalType('user-group');
    setApprovalTarget('');
    setAllowResubmission(false);
    setEnableComments(false);
    setNotifyVia('email');
    setNotifyRecipient('');
    setNotifyOnFail(true);
    setNotifyOnComplete(true);
    setNotifyOnStart(false);
    setItsm(false);
    setItsmPriority('2-High');
    setItsmType('Normal');
    setChangeWindow(false);
    setChangeWindowSchedule('');
    setAttemptedNext(false);
    resetForm();
  };

  const applyTemplate = (t: typeof POLICY_TEMPLATES[number]) => {
    setPolicyType(t.type);
    setWizardStep(2);
    const p = t.prefill as any;
    if (p.allowedAlgorithms) setAllowedAlgorithms(p.allowedAlgorithms);
    if (p.maxKeyAge) setMaxKeyAge(p.maxKeyAge);
    if (p.autoRotate !== undefined) setAutoRotate(p.autoRotate);
    if (p.rotationPeriod) setRotationPeriod(p.rotationPeriod);
    if (p.targetAlgorithm) setTargetAlgorithm(p.targetAlgorithm);
    if (p.certSubTypes) setCertSubTypes(p.certSubTypes);
    if (p.certAction) setCertAction(p.certAction);
    if (p.maxValidity) setMaxValidity(p.maxValidity);
    if (p.rotateBeforeExpiry) setRotateBeforeExpiry(p.rotateBeforeExpiry);
    if (p.secretTypes) setSecretTypesState(p.secretTypes);
    if (p.secretMaxAge) setSecretMaxAge(p.secretMaxAge);
    if (p.secretAutoRotate !== undefined) setSecretAutoRotate(p.secretAutoRotate);
    if (p.secretRotationPeriod) setSecretRotationPeriod(p.secretRotationPeriod);
    if (p.approvedVaults) setApprovedVaults(p.approvedVaults);
    if (p.agentMaxTTL) setAgentMaxTTL(p.agentMaxTTL);
    if (p.agentTTLUnit) setAgentTTLUnit(p.agentTTLUnit);
    if (p.enforceJIT !== undefined) setEnforceJIT(p.enforceJIT);
    if (p.violationActions) setViolationActions(p.violationActions);
    if (p.formSeverity) setFormSeverity(p.formSeverity);
    if (p.itsm !== undefined) setItsm(p.itsm);
    if (p.itsmPriority) setItsmPriority(p.itsmPriority);
    setFormName(t.label);
    setPanelOpen(true);
  };

  const aiTemplates: Record<string, { name: string; assetType: string; condition: string; value: string; severity: string; envs: string[]; actions: string[]; groups: string[]; type?: PolicyType }> = {
    expir: { name: '', assetType: 'TLS Certificate', condition: 'Expiry less than', value: '30 days', severity: 'High', envs: ['Production'], actions: ['Alert only', 'Create ticket'], groups: ['grp-002'], type: 'certificates' },
    rsa: { name: '', assetType: 'TLS Certificate', condition: 'Algorithm equals', value: 'RSA-2048', severity: 'Critical', envs: ['All'], actions: ['Alert only', 'Block issuance'], groups: ['grp-001'], type: 'certificates' },
    weak: { name: '', assetType: 'SSH Key', condition: 'Algorithm equals', value: 'RSA-1024', severity: 'Critical', envs: ['Production'], actions: ['Alert only', 'Block issuance'], groups: ['grp-003'], type: 'ssh-key' },
    block: { name: '', assetType: 'TLS Certificate', condition: 'CA not in list', value: 'Approved CAs only', severity: 'Critical', envs: ['Production'], actions: ['Block issuance', 'Escalate to owner'], groups: ['grp-001'], type: 'certificates' },
    rotat: { name: '', assetType: 'SSH Key', condition: 'No rotation in', value: '90 days', severity: 'High', envs: ['Production'], actions: ['Alert only', 'Auto-remediate'], groups: ['grp-003'], type: 'ssh-key' },
    vault: { name: '', assetType: 'API Key / Secret', condition: 'Storage location', value: 'Approved vaults only', severity: 'High', envs: ['All'], actions: ['Alert only', 'Auto-remediate'], groups: ['grp-004'], type: 'secrets' },
    secret: { name: '', assetType: 'API Key / Secret', condition: 'Age greater than', value: '90 days', severity: 'High', envs: ['All'], actions: ['Alert only', 'Auto-remediate'], groups: ['grp-004'], type: 'secrets' },
    oauth: { name: '', assetType: 'API Key / Secret', condition: 'Age greater than', value: '30 days', severity: 'Medium', envs: ['Production'], actions: ['Alert only', 'Escalate to owner'], groups: ['grp-004'], type: 'secrets' },
    agent: { name: '', assetType: 'AI Agent Token', condition: 'TTL greater than', value: '24 hours', severity: 'Critical', envs: ['Production'], actions: ['Alert only', 'Block issuance'], groups: ['grp-004'], type: 'ai-agents' },
    jit: { name: '', assetType: 'AI Agent Token', condition: 'Static credentials detected', value: 'Not allowed', severity: 'Critical', envs: ['Production'], actions: ['Alert only', 'Block issuance'], groups: ['grp-004'], type: 'ai-agents' },
    pci: { name: '', assetType: 'SSH Key', condition: 'Algorithm equals', value: 'Ed25519 only', severity: 'Critical', envs: ['Production'], actions: ['Alert only', 'Block issuance', 'Create ticket'], groups: ['grp-004'], type: 'ssh-key' },
    dora: { name: '', assetType: 'TLS Certificate', condition: 'Expiry less than', value: '90 days', severity: 'High', envs: ['Production'], actions: ['Alert only', 'Create ticket'], groups: [], type: 'certificates' },
    ssh: { name: '', assetType: 'SSH Key', condition: 'No rotation in', value: '60 days', severity: 'High', envs: ['All'], actions: ['Alert only', 'Auto-remediate'], groups: ['grp-003'], type: 'ssh-key' },
  };

  const handleAIDraft = () => {
    if (!formDescription || formDescription.length < 10) {
      toast.error('Enter a description first so AI can parse your intent');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      const desc = formDescription.toLowerCase();
      let matched = false;
      for (const [keyword, template] of Object.entries(aiTemplates)) {
        if (desc.includes(keyword)) {
          const draftName = formDescription.length > 60 ? `${formDescription.slice(0, 57)}...` : formDescription;
          setFormName(draftName);
          setFormAssetType(template.assetType);
          setFormCondition(template.condition);
          setFormValue(template.value);
          setFormSeverity(template.severity);
          setFormEnvironments(template.envs);
          setFormActions(template.actions);
          setFormGroupIds(template.groups);
          setScopeEnvironments(template.envs.includes('All') ? ['Production'] : template.envs);
          setScopeGroupIds(template.groups);
          setPolicyType(template.type || getPolicyTypeFromAssetType(template.assetType));
          setViolationActions(template.actions);
          matched = true;
          break;
        }
      }
      if (!matched) {
        setFormName(formDescription.length > 60 ? `${formDescription.slice(0, 57)}...` : formDescription);
      }
      setAiLoading(false);
      toast.success('AI parsed your policy — review and adjust fields below');
    }, 800);
  };

  const previewText = buildPolicyPreview({
    policyType,
    formName,
    certSubTypes,
    certAction,
    caSelected,
    maxValidity,
    allowedAlgorithms,
    maxKeyAge,
    autoRotate,
    rotationPeriod,
    rotateBeforeExpiry,
    targetAlgorithm,
    secretTypes,
    secretMaxAge,
    secretAutoRotate,
    secretRotationPeriod,
    approvedVaults,
    agentMaxTTL,
    agentTTLUnit,
    enforceJIT,
    violationActions,
    formSeverity,
    scopeMode,
    scopeEnvironments,
    requireApproval,
    approvalType,
    itsm,
    notifyOnFail,
  });

  const canProceed = (): boolean => {
    if (wizardStep === 1) return policyType !== '';
    if (wizardStep === 2 || wizardStep === 3) return formName.trim() !== '';
    return true;
  };

  const handleSave = (draft: boolean) => {
    const assetType = policyType === 'ssh-key'
      ? 'SSH Key'
      : policyType === 'certificates'
        ? 'TLS Certificate'
        : policyType === 'secrets'
          ? 'API Key / Secret'
          : 'AI Agent Token';

    const newPolicy: CustomPolicy = {
      id: editingPolicy || `cpol-${Date.now()}`,
      name: formName || 'Untitled Policy',
      description: formDescription || previewText.split('\n')[0],
      status: draft ? 'Draft' : 'Active',
      violations: 0,
      assetType,
      condition: previewText.split('\n')[1] || 'Custom rules',
      value: '',
      severity: formSeverity,
      environments: scopeMode === 'environment' ? scopeEnvironments : ['All'],
      teams: scopeTeam,
      actions: violationActions,
      groupIds: scopeGroupIds,
    };

    if (editingPolicy) {
      setUserPolicies(prev => prev.map(p => p.id === editingPolicy ? newPolicy : p));
    } else {
      setUserPolicies(prev => [...prev, newPolicy]);
    }

    setPanelOpen(false);
    resetPanelState();
    toast.success(
      draft
        ? `"${newPolicy.name}" saved as draft`
        : `"${newPolicy.name}" is now active — monitoring ${assetType} assets`
    );
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    const nextType = getPolicyTypeFromAssetType(p.assetType);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormAssetType(p.assetType || 'TLS Certificate');
    setFormCondition(p.condition || 'Expiry less than');
    setFormValue(p.value || '30 days');
    setFormSeverity(p.severity || 'High');
    setFormEnvironments(p.environments || ['All']);
    setFormTeams(p.teams || '');
    setFormActions(p.actions || ['Alert only']);
    setFormGroupIds(p.groupIds || []);
    setScopeGroupIds(p.groupIds || []);
    setScopeTeam(p.teams || '');
    setScopeEnvironments(p.environments && p.environments.length > 0 && p.environments[0] !== 'All' ? p.environments : ['Production']);
    setScopeMode((p.groupIds && p.groupIds.length > 0) ? 'group' : (p.teams ? 'team' : (p.environments && p.environments[0] !== 'All' ? 'environment' : 'all')));
    setViolationActions(p.actions || ['Alert only']);
    setPolicyType(nextType);
    setEditingPolicy(p.id);
    setWizardStep(2);
    setPanelOpen(true);
  };

  const deletePolicy = (id: string) => {
    setUserPolicies(prev => prev.filter(p => p.id !== id));
    toast.success('Policy deleted');
  };

  const togglePolicyStatus = (id: string) => {
    setUserPolicies(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'Active' ? 'Draft' : 'Active' } : p));
  };

  const filteredPolicies = policyRules.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredViolations = mockViolations.filter(v => {
    if (violationSearch && !v.objectName.toLowerCase().includes(violationSearch.toLowerCase()) && !v.policyName.toLowerCase().includes(violationSearch.toLowerCase())) return false;
    if (violationSeverity && v.severity !== violationSeverity) return false;
    if (violationStatus && v.status !== violationStatus) return false;
    return true;
  });

  const toggleViolationSelection = (id: string) => {
    setSelectedViolations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAllViolations = () => {
    if (selectedViolations.length === filteredViolations.length) setSelectedViolations([]);
    else setSelectedViolations(filteredViolations.map(v => v.id));
  };

  const openViolationCount = mockViolations.filter(v => v.status === 'Open').length;

  const relevantTemplates = useMemo(() => {
    if (!policyType) return POLICY_TEMPLATES;
    return POLICY_TEMPLATES.filter(template => template.type === policyType);
  }, [policyType]);

  const selectedTypeMeta = getPolicyTypeMeta(policyType);

  const stepDescriptions: Record<1 | 2 | 3 | 4, string> = {
    1: "Select what you're protecting",
    2: 'Name the policy and define its scope',
    3: 'Set the rules this policy enforces',
    4: 'Define what happens when a rule is broken',
  };

  const renderTypeIcon = (type: PolicyType, className = 'w-3.5 h-3.5 text-muted-foreground') => {
    const meta = getPolicyTypeMeta(type);
    if (!meta) return <Shield className={className} />;
    const Icon = meta.icon;
    return <Icon className={className} />;
  };

  const closePanel = () => {
    setPanelOpen(false);
    resetPanelState();
  };

  const estimatedAssets = getScopeEstimate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy Builder</h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'outofbox' as const, label: 'Out-of-Box Policies' },
          { id: 'custom' as const, label: 'Custom Policies' },
          { id: 'violations' as const, label: `Violations`, count: openViolationCount },
          { id: 'compliance' as const, label: 'Compliance Frameworks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
            {'count' in t && t.count! > 0 && (
              <span className={`min-w-[18px] px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === t.id ? 'bg-coral/10 text-coral' : 'bg-coral/10 text-coral'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'outofbox' && (
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search policies..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  {['Policy', 'Severity', 'Affected Assets', 'Last Triggered', 'Enabled', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map(policy => (
                  <tr key={policy.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-semibold">{policy.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{policy.description}</div>
                    </td>
                    <td className="py-2.5 px-3"><SeverityBadge severity={policy.severity} /></td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => { setFilters({ policy: policy.name }); setCurrentPage('inventory'); }} className="text-teal hover:underline">
                        {policy.affectedAssets.toLocaleString()}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{policy.lastTriggered}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => { setPolicyStates(prev => ({ ...prev, [policy.id]: !prev[policy.id] })); toast.success(`Policy ${policyStates[policy.id] ? 'disabled' : 'enabled'}`); }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${policyStates[policy.id] ? 'bg-teal' : 'bg-muted'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform ${policyStates[policy.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => setConfigModal(policy.id)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Configure</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2">Start from a template</p>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin">
              {POLICY_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="flex-shrink-0 w-52 border border-border rounded-xl p-3 cursor-pointer bg-card hover:border-teal/40 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${badgeColorClasses[template.badgeColor]}`}>
                      {template.badge}
                    </span>
                    <span className="ml-auto">{renderTypeIcon(template.type, 'w-3.5 h-3.5 text-muted-foreground')}</span>
                  </div>
                  <p className="text-[11px] font-semibold mt-1.5">{template.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed mt-1">{template.desc}</p>
                  <p className="text-[9px] text-teal mt-2">Use template →</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <button onClick={() => { resetPanelState(); setPanelOpen(true); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
              <Plus className="w-3 h-3" /> Create Policy
            </button>
          </div>

          {userPolicies.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No custom policies yet</p>
              <button onClick={() => { resetPanelState(); setPanelOpen(true); }} className="text-xs text-teal hover:underline">Create your first policy</button>
            </div>
          ) : (
            <div className="space-y-2">
              {userPolicies.map(p => {
                const typeBadge = getPolicyTypeBadgeFromAsset(p.assetType);
                return (
                  <div key={p.id} className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={() => setExpandedPolicy(expandedPolicy === p.id ? null : p.id)}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'Active' ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-xs font-semibold truncate">{p.name}</p>
                            {typeBadge && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${typeBadge.cls}`}>
                                <typeBadge.icon className="w-3 h-3" />
                                {typeBadge.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.groupIds && p.groupIds.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{p.groupIds.length} group{p.groupIds.length > 1 ? 's' : ''}</span>
                        )}
                        {p.violations > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/10 text-coral font-medium">{p.violations} violations</span>}
                        {p.severity && <span className="text-[10px] text-muted-foreground">{p.severity}</span>}
                        {expandedPolicy === p.id ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedPolicy === p.id && (
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                        <div className="grid grid-cols-5 gap-3 text-xs">
                          <div><span className="text-muted-foreground block mb-0.5">Asset Type</span><span className="font-medium">{p.assetType || 'All'}</span></div>
                          <div><span className="text-muted-foreground block mb-0.5">Condition</span><span className="font-medium">{p.condition || '—'} {p.value || ''}</span></div>
                          <div><span className="text-muted-foreground block mb-0.5">Environment</span><span className="font-medium">{p.environments?.join(', ') || 'All'}</span></div>
                          <div><span className="text-muted-foreground block mb-0.5">Teams</span><span className="font-medium">{p.teams || 'All'}</span></div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5">Groups</span>
                            <span className="font-medium">
                              {p.groupIds && p.groupIds.length > 0
                                ? p.groupIds.map(gid => mockGroups.find(g => g.id === gid)?.name || gid).join(', ')
                                : 'None'}
                            </span>
                          </div>
                        </div>
                        {p.actions && p.actions.length > 0 && (
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-1">Actions on Violation</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {p.actions.map(a => <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">{a}</span>)}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => loadPolicyForEdit(p)} className="text-[10px] px-3 py-1.5 rounded bg-muted text-foreground hover:bg-muted/80">Edit</button>
                          <button onClick={() => togglePolicyStatus(p.id)} className={`text-[10px] px-3 py-1.5 rounded ${p.status === 'Active' ? 'bg-amber/10 text-amber hover:bg-amber/20' : 'bg-teal/10 text-teal hover:bg-teal/20'}`}>
                            {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => deletePolicy(p.id)} className="text-[10px] px-3 py-1.5 rounded bg-coral/10 text-coral hover:bg-coral/20">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {panelOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div className="w-1/4 bg-background/20 backdrop-blur-sm" onClick={closePanel} />
              <div className="w-3/4 bg-card border-l border-border shadow-2xl h-full flex flex-col">
                <div className="flex-shrink-0 border-b border-border px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Policy Engine</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <h2 className="text-sm font-semibold">Create Policy</h2>
                      {selectedTypeMeta && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${selectedTypeMeta.cls}`}>
                          <selectedTypeMeta.icon className="w-3 h-3" />
                          {selectedTypeMeta.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={closePanel} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-shrink-0 px-5 py-3 border-b border-border">
                  <div className="flex items-center gap-0">
                    {[
                      { id: 1 as const, label: 'Type' },
                      { id: 2 as const, label: 'Scope & Info' },
                      { id: 3 as const, label: 'Rules' },
                      { id: 4 as const, label: 'Actions' },
                    ].map((step, index, arr) => (
                      <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center gap-1 min-w-[72px]">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${wizardStep >= step.id ? 'bg-teal text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
                            {wizardStep > step.id ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                          </div>
                          <span className="text-[9px] text-muted-foreground text-center">{step.label}</span>
                        </div>
                        {index < arr.length - 1 && <div className={`flex-1 h-px mx-1 ${wizardStep > step.id ? 'bg-teal' : 'bg-border'}`} />}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{stepDescriptions[wizardStep]}</p>
                </div>

                <div className="flex flex-row flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    {wizardStep === 1 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">What are you protecting?</h3>
                        <p className="text-[10px] text-muted-foreground mb-5">Choose the type of asset this policy governs. The form will adapt to show the right rules.</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            {
                              id: 'ssh-key' as PolicyType,
                              title: 'SSH Keys',
                              desc: 'Raw SSH key pairs — rotation schedules, algorithm standards, risk controls',
                              wrapCls: 'bg-amber/10',
                              iconCls: 'text-amber',
                              icon: Key,
                            },
                            {
                              id: 'certificates' as PolicyType,
                              title: 'Certificates',
                              desc: 'TLS/SSL, Code-Signing, K8s Workload, SSH Certs, S/MIME — all CA-signed credentials',
                              wrapCls: 'bg-teal/10',
                              iconCls: 'text-teal',
                              icon: Shield,
                            },
                            {
                              id: 'secrets' as PolicyType,
                              title: 'Secrets & API Keys',
                              desc: 'Vault secrets, API keys, OAuth tokens, database credentials, service account keys',
                              wrapCls: 'bg-purple/10',
                              iconCls: 'text-purple',
                              icon: Lock,
                            },
                            {
                              id: 'ai-agents' as PolicyType,
                              title: 'AI Agent Tokens',
                              desc: 'Credential TTL, JIT enforcement, permission scope governance for AI agents',
                              wrapCls: 'bg-teal/10',
                              iconCls: 'text-teal',
                              icon: Bot,
                            },
                          ].map(option => {
                            const Icon = option.icon;
                            return (
                              <button
                                key={option.id}
                                onClick={() => { setPolicyType(option.id); setCertSubTypes(['tls']); }}
                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md text-left ${policyType === option.id ? 'border-teal bg-teal/5' : 'border-border hover:border-muted-foreground'}`}
                              >
                                <div className={`w-10 h-10 rounded-lg ${option.wrapCls} flex items-center justify-center mb-3`}>
                                  <Icon className={`w-5 h-5 ${option.iconCls}`} />
                                </div>
                                <p className="text-sm font-semibold">{option.title}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">{option.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                        {policyType && (
                          <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-2.5 flex items-center gap-2 mt-4">
                            <CheckCircle2 className="w-4 h-4 text-teal" />
                            <p className="text-[10px] text-teal">You selected {getPolicyTypeMeta(policyType)?.label} — click Next to continue</p>
                          </div>
                        )}
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-sm font-semibold mb-3">Name this policy</h3>
                          <input
                            type="text"
                            placeholder="e.g. PCI-DSS SSH Rotation — Production"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            className={`w-full px-3 py-2 bg-muted border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal ${attemptedNext && !formName.trim() ? 'border-coral' : 'border-border'}`}
                          />
                          {attemptedNext && !formName.trim() && <p className="text-[10px] text-coral mt-1">Policy name is required</p>}
                        </div>

                        <div>
                          <textarea
                            value={formDescription}
                            onChange={e => setFormDescription(e.target.value)}
                            rows={2}
                            placeholder="Describe what this policy does and why"
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-teal"
                          />
                          <button onClick={handleAIDraft} disabled={aiLoading} className="mt-2 inline-flex items-center gap-1 text-[10px] text-teal disabled:opacity-60">
                            <Sparkles className="w-3.5 h-3.5" />
                            {aiLoading ? 'AI drafting…' : 'AI Assist'}
                          </button>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-5 mb-3">Who does this apply to?</p>
                          <div className="space-y-2">
                            <button onClick={() => setScopeMode('all')} className={`w-full text-left flex items-start gap-3 border rounded-lg px-4 py-3 ${scopeMode === 'all' ? 'bg-teal/5 border-teal' : 'border-border'}`}>
                              <div className="mt-0.5 w-4 h-4 rounded-full border border-border flex items-center justify-center">{scopeMode === 'all' && <div className="w-2 h-2 rounded-full bg-teal" />}</div>
                              <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-[11px] font-medium">All assets of this type</p>
                                <p className="text-[10px] text-muted-foreground">Every {selectedTypeMeta?.label || 'asset'} in inventory, across all environments and teams.</p>
                                <p className="text-[9px] text-muted-foreground mt-1">Estimated: {estimatedAssets} assets</p>
                              </div>
                            </button>

                            <div className={`border rounded-lg px-4 py-3 ${scopeMode === 'environment' ? 'bg-teal/5 border-teal' : 'border-border'}`}>
                              <button onClick={() => setScopeMode('environment')} className="w-full text-left flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 rounded-full border border-border flex items-center justify-center">{scopeMode === 'environment' && <div className="w-2 h-2 rounded-full bg-teal" />}</div>
                                <Server className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-medium">By environment</p>
                                  <p className="text-[10px] text-muted-foreground">Limit to specific deployment environments</p>
                                </div>
                              </button>
                              {scopeMode === 'environment' && (
                                <div className="flex gap-2 flex-wrap mt-3 pl-7">
                                  {['Production', 'Staging', 'Development'].map(env => (
                                    <button
                                      key={env}
                                      onClick={() => setScopeEnvironments(prev => prev.includes(env) ? prev.filter(x => x !== env) : [...prev, env])}
                                      className={`px-3 py-1 rounded-full border text-[10px] ${scopeEnvironments.includes(env) ? 'bg-teal/10 border-teal text-teal' : 'border-border text-muted-foreground'}`}
                                    >
                                      {env}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className={`border rounded-lg px-4 py-3 ${scopeMode === 'group' ? 'bg-teal/5 border-teal' : 'border-border'}`}>
                              <button onClick={() => setScopeMode('group')} className="w-full text-left flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 rounded-full border border-border flex items-center justify-center">{scopeMode === 'group' && <div className="w-2 h-2 rounded-full bg-teal" />}</div>
                                <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-medium">By compliance group</p>
                                  <p className="text-[10px] text-muted-foreground">Apply only to a specific compliance group</p>
                                </div>
                              </button>
                              {scopeMode === 'group' && (
                                <div className="max-h-40 overflow-y-auto mt-3 space-y-2 pl-7 pr-1">
                                  {mockGroups.slice(0, 5).map(group => (
                                    <label key={group.id} className="flex items-center gap-2 text-[10px] cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={scopeGroupIds.includes(group.id)}
                                        onChange={() => setScopeGroupIds(prev => prev.includes(group.id) ? prev.filter(x => x !== group.id) : [...prev, group.id])}
                                        className="rounded"
                                      />
                                      <span className="font-medium text-foreground">{group.name}</span>
                                      <span className="text-muted-foreground">{group.objectCount} assets</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className={`border rounded-lg px-4 py-3 ${scopeMode === 'team' ? 'bg-teal/5 border-teal' : 'border-border'}`}>
                              <button onClick={() => setScopeMode('team')} className="w-full text-left flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 rounded-full border border-border flex items-center justify-center">{scopeMode === 'team' && <div className="w-2 h-2 rounded-full bg-teal" />}</div>
                                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-medium">By team</p>
                                  <p className="text-[10px] text-muted-foreground">Apply only to assets owned by a specific team</p>
                                </div>
                              </button>
                              {scopeMode === 'team' && (
                                <div className="pl-7 mt-3">
                                  <input
                                    type="text"
                                    value={scopeTeam}
                                    onChange={e => setScopeTeam(e.target.value)}
                                    placeholder="e.g. Payments Engineering"
                                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-[10px]"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="space-y-5">
                        {policyType === 'ssh-key' && (
                          <>
                            <div>
                              <h3 className="text-sm font-semibold">Which algorithms are allowed?</h3>
                              <p className="text-[10px] text-muted-foreground mb-3">Keys using algorithms not in this list will trigger a violation.</p>
                              <div className="flex flex-wrap gap-2">
                                {['Ed25519', 'RSA-4096', 'RSA-2048', 'ECDSA-256', 'RSA-1024', 'DSA'].map(alg => {
                                  const dotCls = ['Ed25519', 'RSA-4096'].includes(alg)
                                    ? 'bg-teal'
                                    : ['RSA-2048', 'ECDSA-256'].includes(alg)
                                      ? 'bg-amber'
                                      : 'bg-coral';
                                  return (
                                    <button key={alg} onClick={() => toggleAlgorithm(alg)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-all ${allowedAlgorithms.includes(alg) ? 'bg-teal/10 border-teal text-teal' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                                      <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                                      {alg}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-muted-foreground mt-2">Not allowed = violation will be raised</p>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mt-4 mb-1">
                                <label className="text-[11px] font-medium">Maximum key age before flagging as stale?</label>
                                <span className="text-teal font-semibold text-sm">{maxKeyAge === 999 ? 'No limit' : `${maxKeyAge} days`}</span>
                              </div>
                              <input type="range" min={30} max={365} step={30} value={maxKeyAge} onChange={e => setMaxKeyAge(Number(e.target.value))} className="w-full" />
                              <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>30d</span><span>60d</span><span>90d</span><span>180d</span><span>365d</span></div>
                            </div>

                            <div className="flex items-center justify-between mt-4 border border-border rounded-lg px-4 py-3">
                              <div>
                                <p className="text-[11px] font-medium">Auto-rotate</p>
                                <p className="text-[9px] text-muted-foreground">Automatically rotate keys on a schedule</p>
                              </div>
                              <button onClick={() => setAutoRotate(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${autoRotate ? 'bg-teal' : 'bg-muted'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${autoRotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </button>
                            </div>

                            {autoRotate && (
                              <div className="ml-4 mt-2 space-y-3 border-l border-border pl-4">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-medium">How often?</label>
                                    <span className="text-teal font-semibold text-sm">{rotationPeriod} days</span>
                                  </div>
                                  <input type="range" min={30} max={365} step={30} value={rotationPeriod} onChange={e => setRotationPeriod(Number(e.target.value))} className="w-full" />
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium block mb-1">Rotate to which algorithm?</label>
                                  <select value={targetAlgorithm} onChange={e => setTargetAlgorithm(e.target.value)} className="text-[10px] border border-border rounded-lg px-3 py-2 bg-card">
                                    {['Ed25519 (recommended)', 'RSA-4096', 'ECDSA-256'].map(option => <option key={option}>{option}</option>)}
                                  </select>
                                </div>
                              </div>
                            )}

                            <div>
                              <h3 className="text-sm font-semibold">Which SSH risks are acceptable?</h3>
                              <p className="text-[10px] text-muted-foreground mb-2">Risks NOT accepted here will trigger violations.</p>
                              <div className="space-y-2">
                                {[
                                  { risk: 'Shared Keys', desc: 'Same key on multiple hosts', dot: 'bg-amber' },
                                  { risk: 'Weak Algorithms', desc: 'Deprecated or short key length', dot: 'bg-coral' },
                                  { risk: 'Rogue Keys', desc: 'Not provisioned through AppViewX', dot: 'bg-coral' },
                                  { risk: 'Misplaced Keys', desc: 'Found in unexpected file path', dot: 'bg-amber' },
                                  { risk: 'Suspicious Activity', desc: 'Anomalous access patterns', dot: 'bg-amber' },
                                ].map(item => {
                                  const checked = acceptedRisks.includes(item.risk) || item.risk === 'Suspicious Activity';
                                  const effectiveChecked = item.risk === 'Suspicious Activity' ? acceptedRisks.includes(item.risk) || acceptedRisks.length === 0 : checked;
                                  return (
                                    <div key={item.risk} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                                      <div>
                                        <p className="text-[11px] font-medium flex items-center gap-1.5">
                                          {!effectiveChecked && <span className={`w-2 h-2 rounded-full ${item.dot}`} />}
                                          {item.risk}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">{item.desc}</p>
                                      </div>
                                      <button onClick={() => toggleAcceptedRisk(item.risk)} className={`w-10 h-5 rounded-full relative transition-colors ${effectiveChecked ? 'bg-teal' : 'bg-muted'}`}>
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${effectiveChecked ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}

                        {policyType === 'certificates' && (
                          <>
                            <div>
                              <h3 className="text-sm font-semibold mb-1">Which types of certificates?</h3>
                              <p className="text-[10px] text-muted-foreground mb-3">Select all that apply — the form adapts to show relevant settings for each type.</p>
                              <div className="grid grid-cols-2 gap-2">
                                {CERT_SUBTYPES.map(subtype => (
                                  <button
                                    key={subtype.id}
                                    onClick={() => !subtype.nextRelease && toggleCertSubType(subtype.id)}
                                    className={`border rounded-lg px-3 py-2.5 cursor-pointer text-left transition-all ${subtype.nextRelease ? 'opacity-60 cursor-not-allowed border-border' : certSubTypes.includes(subtype.id) ? 'bg-teal/5 border-teal' : 'border-border hover:border-muted-foreground'}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[10px] font-semibold">{subtype.label}</p>
                                      {subtype.nextRelease && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber/10 text-amber">Next Release</span>}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">{subtype.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-sm font-semibold mb-1">What should this policy govern?</h3>
                              <p className="text-[10px] text-muted-foreground mb-2">Select all that apply — the form adapts to show relevant settings for each type.</p>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'alert', label: 'Alert Only', desc: 'Watch and report violations. No automated action.' },
                                  { id: 'enroll', label: 'Enroll / Issue', desc: 'Issue new certificates via a CA' },
                                  { id: 'renew', label: 'Auto-Renew', desc: 'Renew automatically before expiry' },
                                  { id: 'reenroll', label: 'Re-Enroll', desc: 'Re-issue with same identity' },
                                ].map(action => (
                                  <button key={action.id} onClick={() => setCertAction(action.id as typeof certAction)} className={`border rounded-lg px-3 py-2.5 text-left ${certAction === action.id ? 'bg-teal/5 border-teal' : 'border-border'}`}>
                                    <p className="text-[10px] font-semibold">{action.label}</p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">{action.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {certAction !== 'alert' && (
                              <div>
                                <h3 className="text-sm font-semibold mb-2">Which Certificate Authority?</h3>
                                <div className="flex flex-wrap gap-2">
                                  {CA_OPTIONS.map(ca => (
                                    <button key={ca} onClick={() => setCaSelected(ca)} className={`px-3 py-1.5 rounded-full border text-[10px] ${caSelected === ca ? 'bg-teal/10 border-teal text-teal' : 'border-border text-muted-foreground'}`}>{ca}</button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-medium">Maximum certificate validity?</label>
                                <span className="text-teal font-semibold text-sm">{maxValidity} days</span>
                              </div>
                              <input type="range" min={30} max={365} step={30} value={maxValidity} onChange={e => setMaxValidity(Number(e.target.value))} className="w-full" />
                              <p className="text-[9px] text-muted-foreground mt-1">Certs exceeding this will be flagged.</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-semibold mb-2">Minimum key strength?</h3>
                              <div className="flex flex-wrap gap-2">
                                {['RSA-4096', 'RSA-2048', 'ECDSA-256', 'Ed25519'].map(alg => {
                                  const dotCls = ['RSA-4096', 'Ed25519'].includes(alg) ? 'bg-teal' : 'bg-amber';
                                  return (
                                    <button key={alg} onClick={() => toggleAlgorithm(alg)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium ${allowedAlgorithms.includes(alg) ? 'bg-teal/10 border-teal text-teal' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                                      <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                                      {alg}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 border border-border rounded-lg px-4 py-3">
                              <div>
                                <p className="text-[11px] font-medium">Auto-renew</p>
                                <p className="text-[9px] text-muted-foreground">Automatically renew certificates before expiry</p>
                              </div>
                              <button onClick={() => setAutoRotate(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${autoRotate ? 'bg-teal' : 'bg-muted'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${autoRotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </button>
                            </div>

                            {autoRotate && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-medium">Renew how many days before expiry?</label>
                                  <span className="text-teal font-semibold text-sm">{rotateBeforeExpiry} days</span>
                                </div>
                                <input type="range" min={7} max={60} step={1} value={rotateBeforeExpiry} onChange={e => setRotateBeforeExpiry(Number(e.target.value))} className="w-full" />
                              </div>
                            )}

                            {certSubTypes.includes('code-signing') && (
                              <div className="space-y-3">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Code-Signing Settings</p>
                                <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                                  <div>
                                    <p className="text-[11px] font-medium">Require Extended Validation (EV)?</p>
                                  </div>
                                  <button onClick={() => setRequireEV(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${requireEV ? 'bg-teal' : 'bg-muted'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${requireEV ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                                  <div>
                                    <p className="text-[11px] font-medium">Require timestamp authority?</p>
                                    {requireTimestamp && <p className="text-[9px] text-muted-foreground">RFC 3161 timestamp prevents signature expiry after cert revocation.</p>}
                                  </div>
                                  <button onClick={() => setRequireTimestamp(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${requireTimestamp ? 'bg-teal' : 'bg-muted'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${requireTimestamp ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {certSubTypes.includes('kubernetes') && (
                              <div className="space-y-3">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Kubernetes Settings</p>
                                <div>
                                  <label className="text-[11px] font-medium block mb-1">Issuer</label>
                                  <select value={k8sIssuer} onChange={e => setK8sIssuer(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[10px] bg-card">
                                    {['cert-manager', 'Vault PKI', 'SPIFFE/SPIRE', 'ACME', 'Custom'].map(option => <option key={option}>{option}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium block mb-1">Namespace scope</label>
                                  <input value={k8sNamespace} onChange={e => setK8sNamespace(e.target.value)} placeholder="e.g. production-*, payments-ns" className="w-full px-3 py-2 border border-border rounded-lg text-[10px] bg-card" />
                                  <p className="text-[9px] text-muted-foreground mt-1">Kubernetes workload certs typically have very short TTLs (minutes to hours). Auto-rotation is always recommended.</p>
                                </div>
                              </div>
                            )}

                            {certSubTypes.includes('ssh-cert') && (
                              <div className="space-y-3">
                                <div className="bg-amber/5 border border-amber/20 rounded-lg p-3">
                                  <p className="text-[10px] font-medium text-amber">SSH Certificate policies are available in the next release.</p>
                                  <p className="text-[9px] text-muted-foreground mt-1">You can define the policy now and activate it when the feature ships.</p>
                                </div>
                                <div className="pointer-events-none opacity-50 space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-[11px] font-medium">Max TTL</label>
                                      <span className="text-muted-foreground text-sm">{sshCertMaxTTL}h</span>
                                    </div>
                                    <input type="range" min={1} max={48} step={1} value={sshCertMaxTTL} onChange={e => setSshCertMaxTTL(Number(e.target.value))} className="w-full" />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-medium block mb-1">Allowed principals</label>
                                    <input value={sshCertPrincipals} onChange={e => setSshCertPrincipals(e.target.value)} placeholder="e.g. ubuntu, deploy, svc-ci" className="w-full px-3 py-2 border border-border rounded-lg text-[10px] bg-card" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {policyType === 'secrets' && (
                          <>
                            <div>
                              <h3 className="text-sm font-semibold">Which types of secrets?</h3>
                              <p className="text-[10px] text-muted-foreground mb-2">Select the secret classes this policy covers.</p>
                              <div className="flex flex-wrap gap-2">
                                {SECRET_TYPES.map(type => (
                                  <button key={type} onClick={() => toggleSecretType(type)} className={`px-3 py-1.5 rounded-full border text-[10px] ${secretTypes.includes(type) ? 'bg-purple/10 border-purple text-purple' : 'border-border text-muted-foreground'}`}>
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-medium">Maximum secret age before rotation is required?</label>
                                <span className="text-purple font-semibold text-sm">{secretMaxAge} days</span>
                              </div>
                              <input type="range" min={30} max={365} step={30} value={secretMaxAge} onChange={e => setSecretMaxAge(Number(e.target.value))} className="w-full" />
                              <div className="flex justify-between text-[9px] text-muted-foreground mt-1"><span>30d</span><span>60d</span><span>90d</span><span>180d</span><span>365d</span></div>
                            </div>

                            <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                              <div>
                                <p className="text-[11px] font-medium">Auto-rotate</p>
                                <p className="text-[9px] text-muted-foreground">Rotate secrets automatically when they approach policy limits</p>
                              </div>
                              <button onClick={() => setSecretAutoRotate(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${secretAutoRotate ? 'bg-purple' : 'bg-muted'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${secretAutoRotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </button>
                            </div>

                            {secretAutoRotate && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-medium">How often?</label>
                                  <span className="text-purple font-semibold text-sm">{secretRotationPeriod} days</span>
                                </div>
                                <input type="range" min={30} max={365} step={30} value={secretRotationPeriod} onChange={e => setSecretRotationPeriod(Number(e.target.value))} className="w-full" />
                              </div>
                            )}

                            <div>
                              <h3 className="text-sm font-semibold">Approved storage locations</h3>
                              <p className="text-[10px] text-muted-foreground mb-2">Secrets found outside these approved vaults will be flagged.</p>
                              <div className="space-y-2">
                                {VAULT_OPTIONS.map(vault => (
                                  <label key={vault} className="flex items-center gap-2 text-[10px] cursor-pointer">
                                    <input type="checkbox" checked={approvedVaults.includes(vault)} onChange={() => toggleVault(vault)} className="rounded" />
                                    <span>{vault}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                              <div>
                                <p className="text-[11px] font-medium">Enable secret scanning?</p>
                                <p className="text-[9px] text-muted-foreground">Scan repositories and configs for hardcoded or leaked secrets</p>
                              </div>
                              <button onClick={() => setSecretScanning(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${secretScanning ? 'bg-purple' : 'bg-muted'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${secretScanning ? 'translate-x-5' : 'translate-x-0.5'}`} />
                              </button>
                            </div>
                          </>
                        )}

                        {policyType === 'ai-agents' && (
                          <>
                            <div>
                              <h3 className="text-sm font-semibold">Maximum credential TTL?</h3>
                              <p className="text-[10px] text-muted-foreground mb-2">Agent tokens exceeding this TTL will be flagged and rotation triggered.</p>
                              <div className="flex items-center gap-3 mt-1">
                                <input type="number" min={1} value={agentMaxTTL} onChange={e => setAgentMaxTTL(Number(e.target.value) || 1)} className="w-20 text-2xl font-bold text-center border border-border rounded-lg bg-card py-2" />
                                <div className="flex gap-2">
                                  {(['hours', 'days'] as const).map(unit => (
                                    <button key={unit} onClick={() => setAgentTTLUnit(unit)} className={`px-3 py-1.5 rounded-full border text-[10px] ${agentTTLUnit === unit ? 'bg-teal/10 text-teal border-teal' : 'border-border text-muted-foreground'}`}>{unit}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-4 mt-2 text-[9px] text-muted-foreground flex-wrap">
                                <span>1h = ultra-short (best practice)</span>
                                <span>24h = short-lived (recommended)</span>
                                <span>7d = acceptable</span>
                                <span>30d+ = review required</span>
                              </div>
                            </div>

                            {[
                              { label: 'Require just-in-time (JIT) issuance?', desc: 'Agents must request short-lived tokens at runtime. No static long-lived credentials permitted.', state: enforceJIT, setter: setEnforceJIT },
                              { label: 'Enforce least-privilege?', desc: 'Flag agents whose permission scope exceeds what they actually use.', state: enforceRightSize, setter: setEnforceRightSize },
                              { label: 'Require human-in-the-loop approval for high-risk actions?', desc: 'Agent actions touching sensitive resources (PII, AD, Firewall) will pause for approval.', state: requireHITL, setter: setRequireHITL },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                                <div>
                                  <p className="text-[11px] font-medium">{row.label}</p>
                                  <p className="text-[9px] text-muted-foreground">{row.desc}</p>
                                </div>
                                <button onClick={() => row.setter(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${row.state ? 'bg-teal' : 'bg-muted'}`}>
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${row.state ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                              </div>
                            ))}

                            <div>
                              <h3 className="text-sm font-semibold mb-2">Which algorithms are allowed?</h3>
                              <div className="flex flex-wrap gap-2">
                                {['HMAC-SHA256', 'JWT-RS256', 'Ed25519'].map(alg => (
                                  <button key={alg} onClick={() => toggleAlgorithm(alg)} className={`px-3 py-1.5 rounded-full border text-[10px] ${allowedAlgorithms.includes(alg) ? 'bg-teal/10 border-teal text-teal' : 'border-border text-muted-foreground'}`}>
                                    {alg}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {wizardStep === 4 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">When a violation is detected, what happens?</h3>
                        <p className="text-[10px] text-muted-foreground mb-4">Select one or more actions. 'Alert only' is always the default baseline.</p>
                        <div className="space-y-2">
                          {[
                            { label: 'Alert only', desc: 'Raise a violation. No automated action taken.' },
                            {
                              label: 'Block action',
                              desc: policyType === 'ssh-key'
                                ? 'Prevent rotation if policy is violated.'
                                : policyType === 'certificates'
                                  ? 'Block certificate issuance.'
                                  : policyType === 'secrets'
                                    ? 'Block secret access from unapproved vault.'
                                    : 'Block token issuance until resolved.',
                            },
                            {
                              label: 'Auto-remediate',
                              desc: policyType === 'ssh-key'
                                ? 'Auto-rotate to the approved algorithm.'
                                : policyType === 'certificates'
                                  ? 'Auto-renew via the configured CA.'
                                  : policyType === 'secrets'
                                    ? 'Trigger automated rotation workflow.'
                                    : 'Issue short-lived replacement token.',
                            },
                            { label: 'Create ticket', desc: 'Open a TrustOps ticket assigned to the owner.' },
                            { label: 'Escalate to owner', desc: 'Notify the assigned owner by email.' },
                          ].map(action => {
                            const checked = violationActions.includes(action.label);
                            return (
                              <button key={action.label} onClick={() => toggleViolationAction(action.label)} className={`w-full border rounded-lg px-4 py-3 cursor-pointer flex items-start gap-3 transition-all text-left ${checked ? 'bg-muted/20 border-teal/30' : 'border-border'}`}>
                                <input type="checkbox" checked={checked} readOnly className="w-4 h-4 mt-0.5 rounded" />
                                <div>
                                  <p className="text-[11px] font-medium">{action.label}</p>
                                  <p className="text-[9px] text-muted-foreground">{action.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-5">
                          <p className="text-[10px] font-medium mb-2">How severe should violations be rated?</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { label: 'Low', cls: 'bg-teal/10 border-teal text-teal' },
                              { label: 'Medium', cls: 'bg-purple/10 border-purple text-purple' },
                              { label: 'High', cls: 'bg-amber/10 border-amber text-amber' },
                              { label: 'Critical', cls: 'bg-coral/10 border-coral text-coral' },
                            ].map(level => (
                              <button key={level.label} onClick={() => setFormSeverity(level.label)} className={`px-4 py-2 rounded-full text-[11px] font-semibold cursor-pointer border transition-all ${formSeverity === level.label ? level.cls : 'border-border text-muted-foreground'}`}>
                                {level.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-border mt-5 pt-4">
                          <button onClick={() => setShowAdvanced(prev => !prev)} className="text-[10px] text-teal cursor-pointer">
                            {showAdvanced ? '⊖ Hide advanced options' : '⊕ Show advanced options (approval, notifications, ITSM)'}
                          </button>
                        </div>

                        {showAdvanced && (
                          <div className="space-y-3 mt-4">
                            <div className="border border-border rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-teal" /><span className="text-[11px] font-semibold">Approval</span></div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px]">Require approval before action?</p>
                                <button onClick={() => setRequireApproval(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${requireApproval ? 'bg-teal' : 'bg-muted'}`}>
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${requireApproval ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                              </div>
                              {requireApproval && (
                                <>
                                  <div>
                                    <p className="text-[10px] mb-2">Who approves?</p>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        ['user-group', 'User Group'],
                                        ['user', 'Specific User'],
                                        ['email', 'Email'],
                                        ['ldap-manager', 'LDAP Manager'],
                                      ].map(([id, label]) => (
                                        <button key={id} onClick={() => setApprovalType(id as typeof approvalType)} className={`px-3 py-1.5 rounded-full border text-[10px] ${approvalType === id ? 'bg-teal/10 text-teal border-teal' : 'border-border text-muted-foreground'}`}>{label}</button>
                                      ))}
                                    </div>
                                  </div>
                                  <input
                                    value={approvalTarget}
                                    onChange={e => setApprovalTarget(e.target.value)}
                                    placeholder={approvalType === 'user-group' ? 'e.g. Security Ops Group' : approvalType === 'user' ? 'e.g. john.doe@acme.com' : approvalType === 'email' ? 'e.g. security@acme.com' : 'Fetched from LDAP directory'}
                                    className="text-[10px] border border-border rounded-lg px-3 py-2 w-full bg-card"
                                  />
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px]">Allow resubmission?</p>
                                    <button onClick={() => setAllowResubmission(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${allowResubmission ? 'bg-teal' : 'bg-muted'}`}>
                                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${allowResubmission ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px]">Enable approver comments?</p>
                                    <button onClick={() => setEnableComments(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${enableComments ? 'bg-teal' : 'bg-muted'}`}>
                                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${enableComments ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="border border-border rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-teal" /><span className="text-[11px] font-semibold">Notifications</span></div>
                              <div className="flex gap-2">
                                {(['email', 'slack'] as const).map(channel => (
                                  <button key={channel} onClick={() => setNotifyVia(channel)} className={`px-3 py-1.5 rounded-full border text-[10px] ${notifyVia === channel ? 'bg-teal/10 text-teal border-teal' : 'border-border text-muted-foreground'}`}>{channel === 'email' ? 'Email' : 'Slack'}</button>
                                ))}
                              </div>
                              <input value={notifyRecipient} onChange={e => setNotifyRecipient(e.target.value)} placeholder={notifyVia === 'email' ? 'Recipient email address' : 'Slack channel e.g. #security-alerts'} className="text-[10px] border border-border rounded-lg px-3 py-2 w-full bg-card" />
                              {[
                                { label: 'When action starts', state: notifyOnStart, setter: setNotifyOnStart },
                                { label: 'When action completes', state: notifyOnComplete, setter: setNotifyOnComplete },
                                { label: 'When action fails', state: notifyOnFail, setter: setNotifyOnFail },
                              ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                  <p className="text-[10px]">{row.label}</p>
                                  <button onClick={() => row.setter(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${row.state ? 'bg-teal' : 'bg-muted'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${row.state ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="border border-border rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-2"><Ticket className="w-4 h-4 text-teal" /><span className="text-[11px] font-semibold">ITSM Integration</span></div>
                              <p className="text-[9px] text-muted-foreground">Requires ServiceNow connector (connected)</p>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px]">Create a ServiceNow change request before any action executes?</p>
                                <button onClick={() => setItsm(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${itsm ? 'bg-teal' : 'bg-muted'}`}>
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${itsm ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                              </div>
                              {itsm && (
                                <>
                                  <div className="grid grid-cols-2 gap-3 mt-2">
                                    <div>
                                      <label className="text-[10px] block mb-1">Request type</label>
                                      <select value={itsmType} onChange={e => setItsmType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[10px] bg-card">
                                        {['Normal', 'Standard', 'Emergency'].map(option => <option key={option}>{option}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] block mb-1">Priority</label>
                                      <select value={itsmPriority} onChange={e => setItsmPriority(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[10px] bg-card">
                                        {['1-Critical', '2-High', '3-Moderate', '4-Low'].map(option => <option key={option}>{option}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground">Short description auto-filled from policy name. Assignment group from asset owner.</p>
                                </>
                              )}
                            </div>

                            <div className="border border-border rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-teal" /><span className="text-[11px] font-semibold">Change Window</span></div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px]">Restrict actions to a maintenance window?</p>
                                <button onClick={() => setChangeWindow(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${changeWindow ? 'bg-teal' : 'bg-muted'}`}>
                                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${changeWindow ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                              </div>
                              {changeWindow && (
                                <>
                                  <input value={changeWindowSchedule} onChange={e => setChangeWindowSchedule(e.target.value)} placeholder="e.g. Sundays 02:00–04:00 UTC" className="text-[10px] border border-border rounded-lg px-3 py-2 w-full bg-card" />
                                  <p className="text-[9px] text-muted-foreground">Actions outside the window are queued until the next window opens.</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-56 flex-shrink-0 border-l border-border flex flex-col bg-muted/5">
                    <div className="flex-1 overflow-y-auto p-4">
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-3">What this policy enforces</p>
                      <div className="text-[10px] leading-relaxed whitespace-pre-wrap text-foreground font-mono bg-muted/30 rounded-lg p-3 min-h-[160px]">
                        {previewText}
                      </div>
                    </div>
                    <div className="border-t border-border p-4 flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">Relevant templates</p>
                      <div className="space-y-2">
                        {(!policyType ? POLICY_TEMPLATES : relevantTemplates).map(template => (
                          <button key={template.id} onClick={() => applyTemplate(template)} className="w-full border border-border rounded-lg px-2 py-2 hover:bg-muted/30 cursor-pointer text-left text-[9px] space-y-0.5">
                            <p className="text-[9px] font-medium">{template.label}</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${badgeColorClasses[template.badgeColor]}`}>{template.badge}</span>
                              <span className="text-muted-foreground truncate">{template.desc.slice(0, 50)}{template.desc.length > 50 ? '…' : ''}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 border-t border-border px-5 py-3 flex items-center">
                  {wizardStep > 1 && (
                    <button onClick={() => { setAttemptedNext(false); setWizardStep(s => (s - 1) as 1 | 2 | 3 | 4); }} className="border border-border text-xs rounded-lg px-3 py-2">
                      ← Back
                    </button>
                  )}
                  <div className="ml-auto flex gap-2">
                    {wizardStep < 4 && (
                      <button
                        onClick={() => {
                          setAttemptedNext(true);
                          if (!canProceed()) return;
                          setWizardStep(s => (s + 1) as 1 | 2 | 3 | 4);
                        }}
                        disabled={!canProceed() && wizardStep === 1}
                        className="bg-teal text-primary-foreground text-xs rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                      >
                        Next →
                      </button>
                    )}
                    {wizardStep === 4 && (
                      <>
                        <button onClick={() => handleSave(true)} className="border border-border text-xs rounded-lg px-3 py-2">Save as Draft</button>
                        <button onClick={() => handleSave(false)} className="bg-teal text-primary-foreground text-xs rounded-lg px-4 py-2 font-medium">Save & Activate</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'violations' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={violationSearch} onChange={e => setViolationSearch(e.target.value)} placeholder="Search violations..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal" />
            </div>
            <select value={violationSeverity} onChange={e => setViolationSeverity(e.target.value)} className="px-2 py-2 bg-card border border-border rounded-lg text-xs">
              <option value="">All Severity</option>
              {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={violationStatus} onChange={e => setViolationStatus(e.target.value)} className="px-2 py-2 bg-card border border-border rounded-lg text-xs">
              <option value="">All Status</option>
              {['Open', 'Acknowledged', 'Remediated'].map(s => <option key={s}>{s}</option>)}
            </select>
            {selectedViolations.length > 0 && (
              <button onClick={() => setBulkConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
                <CheckSquare className="w-3.5 h-3.5" /> Bulk Remediate ({selectedViolations.length})
              </button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{filteredViolations.length} violations</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Open', count: mockViolations.filter(v => v.status === 'Open').length, color: 'text-coral' },
              { label: 'Critical', count: mockViolations.filter(v => v.severity === 'Critical').length, color: 'text-coral' },
              { label: 'Acknowledged', count: mockViolations.filter(v => v.status === 'Acknowledged').length, color: 'text-amber' },
              { label: 'Remediated', count: mockViolations.filter(v => v.status === 'Remediated').length, color: 'text-teal' },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-lg border border-border p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 w-8"><input type="checkbox" checked={selectedViolations.length === filteredViolations.length && filteredViolations.length > 0} onChange={toggleAllViolations} className="rounded" /></th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Policy</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Object</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Env</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Group</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Detected</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map(v => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3"><input type="checkbox" checked={selectedViolations.includes(v.id)} onChange={() => toggleViolationSelection(v.id)} className="rounded" /></td>
                    <td className="py-2.5 px-3 font-medium">{v.policyName}</td>
                    <td className="py-2.5 px-2 text-foreground">{v.objectName}</td>
                    <td className="py-2.5 px-2 text-muted-foreground text-[10px]">{v.objectType}</td>
                    <td className="py-2.5 px-2"><SeverityBadge severity={v.severity} /></td>
                    <td className="py-2.5 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{v.environment}</span></td>
                    <td className="py-2.5 px-2 text-[10px] text-muted-foreground">{v.group || '—'}</td>
                    <td className="py-2.5 px-2 text-[10px] text-muted-foreground">{v.detectedAt}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.status === 'Open' ? 'bg-coral/10 text-coral' : v.status === 'Acknowledged' ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal'}`}>{v.status}</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex gap-1">
                        {v.status === 'Open' && (
                          <>
                            <button onClick={() => toast.success(`Remediation started for ${v.objectName}`)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Fix</button>
                            <button onClick={() => toast.info(`Acknowledged: ${v.objectName}`)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Ack</button>
                          </>
                        )}
                        <button onClick={() => { setFilters({ violation: v.objectName }); setCurrentPage('inventory'); }} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal open={bulkConfirm} onClose={() => setBulkConfirm(false)} title="Confirm Bulk Remediation">
            <div className="space-y-4">
              <div className="bg-amber/5 border border-amber/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  You are about to initiate remediation for <span className="font-bold text-foreground">{selectedViolations.length}</span> violations. This will create tickets and trigger automated workflows where available.
                </div>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedViolations.map(id => {
                  const v = mockViolations.find(x => x.id === id);
                  return v ? (
                    <div key={id} className="flex items-center gap-2 text-[10px] py-1">
                      <SeverityBadge severity={v.severity} />
                      <span className="text-foreground">{v.objectName}</span>
                      <span className="text-muted-foreground">— {v.policyName}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBulkConfirm(false)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
                <button onClick={() => { setBulkConfirm(false); setSelectedViolations([]); toast.success(`Remediation initiated for ${selectedViolations.length} violations`); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Confirm & Remediate</button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'compliance' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'DORA', policies: 12, score: 78, violations: 42, lastAssessed: '2 days ago' },
            { name: 'PCI-DSS v4.0', policies: 18, score: 85, violations: 31, lastAssessed: '1 day ago' },
            { name: 'HIPAA', policies: 8, score: 92, violations: 8, lastAssessed: '3 days ago' },
            { name: 'FIPS 140-2', policies: 15, score: 71, violations: 56, lastAssessed: '1 day ago' },
          ].map(fw => (
            <div key={fw.name} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{fw.name}</h3>
                <span className={`text-lg font-bold ${fw.score >= 90 ? 'text-teal' : fw.score >= 75 ? 'text-amber' : 'text-coral'}`}>{fw.score}%</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground mb-3">
                <p>Mapped policies: {fw.policies}</p>
                <p>Open violations: <span className="text-coral">{fw.violations}</span></p>
                <p>Last assessed: {fw.lastAssessed}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toast.info(`Viewing ${fw.name} details`)} className="text-[10px] px-3 py-1.5 rounded bg-muted text-foreground hover:bg-muted/80">View Details</button>
                <button onClick={() => toast.success(`Generating ${fw.name} report...`)} className="text-[10px] px-3 py-1.5 rounded bg-teal/10 text-teal hover:bg-teal/20 flex items-center gap-1"><Download className="w-3 h-3" /> Generate Report</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!configModal} onClose={() => setConfigModal(null)} title="Configure Policy">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Alert Threshold (days before expiry)</label>
            <div className="flex gap-2 mt-1">
              {[30, 14, 7].map(d => (
                <label key={d} className="flex items-center gap-1 text-xs"><input type="checkbox" defaultChecked className="rounded" /> {d}d</label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Severity</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs">
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Environment Scope</label>
            <div className="flex gap-2 mt-1">
              {['All', 'Production', 'Staging', 'Development'].map(e => (
                <label key={e} className="flex items-center gap-1 text-xs"><input type="checkbox" defaultChecked={e === 'All'} className="rounded" /> {e}</label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfigModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            <button onClick={() => { setConfigModal(null); toast.success('Policy configuration saved'); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
