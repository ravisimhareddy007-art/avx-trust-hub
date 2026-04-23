import React, { useState } from 'react';
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

export default function PolicyBuilderPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<'outofbox' | 'custom' | 'compliance'>('outofbox');
  const [policyStates, setPolicyStates] = useState<Record<string, boolean>>(Object.fromEntries(policyRules.map(p => [p.id, p.enabled])));
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userPolicies, setUserPolicies] = useState<CustomPolicy[]>(initialCustomPolicies.map(p => ({ ...p })));
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [formPolicyType, setFormPolicyType] = useState('Managed Certificate Policy');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTag, setFormTag] = useState('Default');
  const [formEnvironment, setFormEnvironment] = useState('All');
  const [formTeam, setFormTeam] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formCertType, setFormCertType] = useState('TLS / SSL');
  const [formCertAction, setFormCertAction] = useState('Alert Only');
  const [formCA, setFormCA] = useState('Any');
  const [formMaxValidity, setFormMaxValidity] = useState('365 days');
  const [formMinKeyType, setFormMinKeyType] = useState('RSA-2048');
  const [formAutoRenew, setFormAutoRenew] = useState(false);
  const [formRenewBefore, setFormRenewBefore] = useState('30 days');
  const [formAllowedAlgorithms, setFormAllowedAlgorithms] = useState('Ed25519, RSA-4096');
  const [formMaxKeyAge, setFormMaxKeyAge] = useState('90 days');
  const [formRotationPeriod, setFormRotationPeriod] = useState('90 days');
  const [formAutoRotate, setFormAutoRotate] = useState(false);
  const [formTargetAlgorithm, setFormTargetAlgorithm] = useState('Ed25519');
  const [formSecretType, setFormSecretType] = useState('All');
  const [formSecretMaxAge, setFormSecretMaxAge] = useState('90 days');
  const [formSecretVault, setFormSecretVault] = useState('Any');
  const [formSecretAutoRotate, setFormSecretAutoRotate] = useState(false);
  const [formAgentMaxTTL, setFormAgentMaxTTL] = useState('24 hours');
  const [formEnforceJIT, setFormEnforceJIT] = useState(false);
  const [formEnforceRightSize, setFormEnforceRightSize] = useState(false);
  const [formDeviceAction, setFormDeviceAction] = useState('Onboard Device');
  const [formDeviceVendor, setFormDeviceVendor] = useState('Linux Server');
  const [formDeviceApproval, setFormDeviceApproval] = useState('Auto-approve');
  const [formK8sIssuer, setFormK8sIssuer] = useState('cert-manager');
  const [formK8sNamespace, setFormK8sNamespace] = useState('');
  const [formSeverity, setFormSeverity] = useState('High');
  const [formAction, setFormAction] = useState('Alert only');
  const [formRequireApproval, setFormRequireApproval] = useState(false);
  const [formApprovalType, setFormApprovalType] = useState('User Group');
  const [formApprovalTarget, setFormApprovalTarget] = useState('');
  const [formNotifyVia, setFormNotifyVia] = useState('Email');
  const [formNotifyRecipient, setFormNotifyRecipient] = useState('');
  const [formNotifyOnStart, setFormNotifyOnStart] = useState(false);
  const [formNotifyOnFail, setFormNotifyOnFail] = useState(true);
  const [formNotifyOnComplete, setFormNotifyOnComplete] = useState(false);
  const [formITSM, setFormITSM] = useState(false);
  const [formItsmPriority, setFormItsmPriority] = useState('2-High');
  const [formItsmType, setFormItsmType] = useState('Normal');
  const [showApproval, setShowApproval] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showItsm, setShowItsm] = useState(false);
  const [sshFlagShared, setSshFlagShared] = useState(true);
  const [sshFlagWeak, setSshFlagWeak] = useState(true);
  const [sshFlagRogue, setSshFlagRogue] = useState(true);
  const [sshFlagMisplaced, setSshFlagMisplaced] = useState(true);
  const [sshFlagOrphaned, setSshFlagOrphaned] = useState(true);
  const [formRequireHITL, setFormRequireHITL] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const resetCreateForm = () => {
    setFormPolicyType('Managed Certificate Policy');
    setFormName('');
    setFormDescription('');
    setFormTag('Default');
    setFormEnvironment('All');
    setFormTeam('');
    setFormGroup('');
    setFormCertType('TLS / SSL');
    setFormCertAction('Alert Only');
    setFormCA('Any');
    setFormMaxValidity('365 days');
    setFormMinKeyType('RSA-2048');
    setFormAutoRenew(false);
    setFormRenewBefore('30 days');
    setFormAllowedAlgorithms('Ed25519, RSA-4096');
    setFormMaxKeyAge('90 days');
    setFormRotationPeriod('90 days');
    setFormAutoRotate(false);
    setFormTargetAlgorithm('Ed25519');
    setFormSecretType('All');
    setFormSecretMaxAge('90 days');
    setFormSecretVault('Any');
    setFormSecretAutoRotate(false);
    setFormAgentMaxTTL('24 hours');
    setFormEnforceJIT(false);
    setFormEnforceRightSize(false);
    setFormDeviceAction('Onboard Device');
    setFormDeviceVendor('Linux Server');
    setFormDeviceApproval('Auto-approve');
    setFormK8sIssuer('cert-manager');
    setFormK8sNamespace('');
    setFormSeverity('High');
    setFormAction('Alert only');
    setFormRequireApproval(false);
    setFormApprovalType('User Group');
    setFormApprovalTarget('');
    setFormNotifyVia('Email');
    setFormNotifyRecipient('');
    setFormNotifyOnStart(false);
    setFormNotifyOnFail(true);
    setFormNotifyOnComplete(false);
    setFormITSM(false);
    setFormItsmPriority('2-High');
    setFormItsmType('Normal');
    setShowApproval(false);
    setShowNotifications(false);
    setShowItsm(false);
    setSshFlagShared(true);
    setSshFlagWeak(true);
    setSshFlagRogue(true);
    setSshFlagMisplaced(true);
    setSshFlagOrphaned(true);
    setFormRequireHITL(false);
    setEditingPolicy(null);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    resetCreateForm();
  };

  const setTemplatePolicyType = (type: PolicyType) => {
    if (type === 'ssh-key') setFormPolicyType('SSH Key Policy');
    else if (type === 'certificates') setFormPolicyType('Managed Certificate Policy');
    else if (type === 'secrets') setFormPolicyType('Secrets & API Keys Policy');
    else if (type === 'ai-agents') setFormPolicyType('AI Agent Token Policy');
  };

  const openTemplate = (template: 'pci-ssh' | 'nist-ssh' | 'zero-trust-tls' | 'dora-cert' | 'secret-rotation' | 'agent-jit') => {
    resetCreateForm();
    if (template === 'pci-ssh') {
      setFormPolicyType('SSH Key Policy');
      setFormTag('PCI-DSS');
      setFormName('PCI-DSS SSH Rotation');
      setFormAllowedAlgorithms('Ed25519, RSA-4096');
      setFormAutoRotate(true);
      setFormRotationPeriod('90 days');
      setFormSeverity('Critical');
      setFormAction('Block action');
    } else if (template === 'nist-ssh') {
      setFormPolicyType('SSH Key Policy');
      setFormTag('NIST');
      setFormName('NIST SSH Baseline');
      setFormAllowedAlgorithms('Ed25519, RSA-4096');
      setFormMaxKeyAge('365 days');
      setFormSeverity('High');
    } else if (template === 'zero-trust-tls') {
      setFormPolicyType('Managed Certificate Policy');
      setFormTag('Zero-Trust');
      setFormName('Zero-Trust TLS');
      setFormCertAction('Auto-Renew');
      setFormMaxValidity('90 days');
      setFormAutoRenew(true);
      setFormRenewBefore('30 days');
    } else if (template === 'dora-cert') {
      setFormPolicyType('Managed Certificate Policy');
      setFormTag('DORA');
      setFormName('DORA Certificate Controls');
      setFormAction('Create ticket');
      setFormITSM(true);
      setShowItsm(true);
    } else if (template === 'secret-rotation') {
      setFormPolicyType('Secrets & API Keys Policy');
      setFormName('Secret Rotation Baseline');
      setFormSecretType('API Keys');
      setFormSecretMaxAge('90 days');
      setFormSecretVault('HashiCorp Vault');
      setFormSecretAutoRotate(true);
      setFormAction('Auto-remediate');
    } else if (template === 'agent-jit') {
      setFormPolicyType('AI Agent Token Policy');
      setFormTag('Zero-Trust');
      setFormName('AI Agent JIT');
      setFormAgentMaxTTL('24 hours');
      setFormEnforceJIT(true);
      setFormAction('Block action');
      setFormSeverity('Critical');
    }
    setCreateOpen(true);
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

  const handleAIDraft = async () => {
    if (!formDescription || formDescription.trim().length < 10) {
      toast.error('Enter a description so AI can fill the policy');
      return;
    }

    setAiLoading(true);

    try {
      const systemPrompt = `You are a policy configuration assistant 
for AVX Trust Platform, a cryptographic identity governance platform.

The user will describe a policy in plain English. You must extract 
structured configuration from their description and return ONLY a 
valid JSON object — no markdown, no explanation, no backticks.

The user has selected policy type: "${formPolicyType}"

Return a JSON object with ONLY the fields relevant to that policy 
type. Use these exact field names and allowed values:

ALWAYS include:

- name: string (short descriptive policy name, max 60 chars)

- description: string (1-2 sentence plain English summary)

- tag: one of ["Default","PCI-DSS","DORA","NIS2","HIPAA","NIST","Zero-Trust","Internal"]

- environment: one of ["All","Production","Staging","Development"]

- severity: one of ["Low","Medium","High","Critical"]

- action: one of ["Alert only","Block action","Auto-remediate","Create ticket","Escalate to owner"]

- requireApproval: boolean

- notifyOnFail: boolean

- notifyOnComplete: boolean

- notifyVia: one of ["Email","Slack"]

- itsm: boolean

FOR "Managed Certificate Policy" add:

- certType: one of ["TLS / SSL","Code-Signing","S/MIME","Client Auth"]

- certAction: one of ["Alert Only","Enroll","Auto-Renew","Re-Enroll"]

- ca: one of ["Any","AppViewX CA","DigiCert","GlobalSign","Entrust","Let's Encrypt","Microsoft CA","Sectigo","HashiCorp Vault PKI"]

- maxValidity: one of ["30 days","60 days","90 days","180 days","365 days","2 years","3 years","No limit"]

- minKeyType: one of ["RSA-2048","RSA-4096","ECDSA-256","Ed25519"]

- autoRenew: boolean

- renewBefore: one of ["7 days","14 days","30 days","45 days","60 days"]

FOR "SSH Key Policy" add:

- allowedAlgorithms: string (comma-separated, e.g. "Ed25519, RSA-4096")

- maxKeyAge: one of ["30 days","60 days","90 days","180 days","365 days","No limit"]

- autoRotate: boolean

- rotationPeriod: one of ["30 days","60 days","90 days","180 days","365 days"]

- targetAlgorithm: one of ["Ed25519","RSA-4096","ECDSA-256"]

FOR "Secrets & API Keys Policy" add:

- secretType: one of ["All","API Keys","OAuth Tokens","Database Credentials","Service Account Keys","Vault Secrets"]

- secretMaxAge: one of ["30 days","60 days","90 days","180 days","365 days"]

- secretVault: one of ["Any","HashiCorp Vault","AWS Secrets Manager","Azure Key Vault","CyberArk Conjur","GCP Secret Manager"]

- secretAutoRotate: boolean

FOR "AI Agent Token Policy" add:

- agentMaxTTL: one of ["1 hour","6 hours","24 hours","7 days","30 days","90 days","No limit"]

- enforceJIT: boolean

- enforceRightSize: boolean

FOR "Kubernetes Certificate Policy" add:

- k8sIssuer: one of ["cert-manager","Vault PKI","SPIFFE/SPIRE","ACME","AWS PCA","Custom"]

- k8sNamespace: string (namespace pattern or empty string)

- maxValidity: one of ["1 hour","6 hours","24 hours","7 days","30 days","90 days","365 days"]

- minKeyType: one of ["RSA-2048","RSA-4096","ECDSA-256","Ed25519"]

FOR "Device Management Policy" add:

- deviceAction: one of ["Onboard Device","Re-Onboard","Update Config"]

- deviceVendor: one of ["Linux Server","Microsoft Server","IIS","Apache","Nginx","F5 (ADC)","MS SQL","Tomcat","Custom"]

- deviceApproval: one of ["Auto-approve","Require approval","Auto-approve with notification"]

Return ONLY the JSON object. No other text.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: formDescription }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      const data = await response.json();

      const rawText = data?.content
        ?.filter((b: any) => b.type === 'text')
        ?.map((b: any) => b.text)
        ?.join('') || '';

      if (!rawText) {
        throw new Error('Empty response from API');
      }

      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');

      if (start === -1 || end === -1 || end <= start) {
        throw new Error(`No JSON found in response: ${rawText.slice(0, 200)}`);
      }

      const jsonStr = rawText.slice(start, end + 1);
      const result = JSON.parse(jsonStr);

      if (result.name) setFormName(result.name);
      if (result.description) setFormDescription(result.description);
      if (result.tag) setFormTag(result.tag);
      if (result.environment) setFormEnvironment(result.environment);
      if (result.severity) setFormSeverity(result.severity);
      if (result.action) setFormAction(result.action);
      if (result.requireApproval !== undefined)
        setFormRequireApproval(result.requireApproval);
      if (result.notifyOnFail !== undefined)
        setFormNotifyOnFail(result.notifyOnFail);
      if (result.notifyOnComplete !== undefined)
        setFormNotifyOnComplete(result.notifyOnComplete);
      if (result.notifyVia) setFormNotifyVia(result.notifyVia);
      if (result.itsm !== undefined) setFormITSM(result.itsm);

      if (result.certType) setFormCertType(result.certType);
      if (result.certAction) setFormCertAction(result.certAction);
      if (result.ca) setFormCA(result.ca);
      if (result.maxValidity) setFormMaxValidity(result.maxValidity);
      if (result.minKeyType) setFormMinKeyType(result.minKeyType);
      if (result.autoRenew !== undefined) setFormAutoRenew(result.autoRenew);
      if (result.renewBefore) setFormRenewBefore(result.renewBefore);

      if (result.allowedAlgorithms)
        setFormAllowedAlgorithms(result.allowedAlgorithms);
      if (result.maxKeyAge) setFormMaxKeyAge(result.maxKeyAge);
      if (result.autoRotate !== undefined)
        setFormAutoRotate(result.autoRotate);
      if (result.rotationPeriod)
        setFormRotationPeriod(result.rotationPeriod);
      if (result.targetAlgorithm)
        setFormTargetAlgorithm(result.targetAlgorithm);

      if (result.secretType) setFormSecretType(result.secretType);
      if (result.secretMaxAge) setFormSecretMaxAge(result.secretMaxAge);
      if (result.secretVault) setFormSecretVault(result.secretVault);
      if (result.secretAutoRotate !== undefined)
        setFormSecretAutoRotate(result.secretAutoRotate);

      if (result.agentMaxTTL) setFormAgentMaxTTL(result.agentMaxTTL);
      if (result.enforceJIT !== undefined)
        setFormEnforceJIT(result.enforceJIT);
      if (result.enforceRightSize !== undefined)
        setFormEnforceRightSize(result.enforceRightSize);

      if (result.deviceAction) setFormDeviceAction(result.deviceAction);
      if (result.deviceVendor) setFormDeviceVendor(result.deviceVendor);
      if (result.deviceApproval)
        setFormDeviceApproval(result.deviceApproval);

      if (result.k8sIssuer) setFormK8sIssuer(result.k8sIssuer);
      if (result.k8sNamespace !== undefined)
        setFormK8sNamespace(result.k8sNamespace);

      toast.success('Policy generated — review and adjust if needed');
    } catch (err) {
      console.error('AI draft error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Policy generation failed: ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = (draft: boolean) => {
    if (!formName.trim()) {
      toast.error('Policy name is required');
      return;
    }

    const newPolicy: CustomPolicy = {
      id: editingPolicy || `cpol-${Date.now()}`,
      name: formName,
      description: formDescription || `${formPolicyType} — ${formEnvironment}`,
      status: draft ? 'Draft' : 'Active',
      violations: 0,
      assetType: formPolicyType.includes('Certificate')
        ? 'TLS Certificate'
        : formPolicyType.includes('SSH')
          ? 'SSH Key'
          : formPolicyType.includes('Secret')
            ? 'API Key / Secret'
            : formPolicyType.includes('AI')
              ? 'AI Agent Token'
              : 'Device',
      condition: formAction,
      severity: formSeverity,
      environments: formEnvironment === 'All' ? ['All'] : [formEnvironment],
      teams: formTeam,
      actions: [formAction],
      groupIds: formGroup ? [formGroup] : [],
    };

    if (editingPolicy) {
      setUserPolicies(prev => prev.map(policy => policy.id === editingPolicy ? newPolicy : policy));
    } else {
      setUserPolicies(prev => [...prev, newPolicy]);
    }

    setCreateOpen(false);
    resetCreateForm();
    toast.success(draft ? `"${formName}" saved as draft` : `"${formName}" is now active`);
  };

  const loadPolicyForEdit = (p: CustomPolicy) => {
    resetCreateForm();
    setEditingPolicy(p.id);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormSeverity(p.severity || 'High');
    setFormEnvironment(p.environments?.[0] || 'All');
    setFormTeam(p.teams || '');
    setFormGroup(p.groupIds?.[0] || '');
    setFormAction(p.actions?.[0] || p.condition || 'Alert only');
    if ((p.assetType || '').includes('SSH')) setFormPolicyType('SSH Key Policy');
    else if ((p.assetType || '').includes('Secret') || (p.assetType || '').includes('API')) setFormPolicyType('Secrets & API Keys Policy');
    else if ((p.assetType || '').includes('AI')) setFormPolicyType('AI Agent Token Policy');
    else if ((p.assetType || '').includes('Device')) setFormPolicyType('Device Management Policy');
    else setFormPolicyType('Managed Certificate Policy');
    setCreateOpen(true);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Policy Builder</h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'outofbox' as const, label: 'Out-of-Box Policies' },
          { id: 'custom' as const, label: 'Custom Policies' },
          { id: 'compliance' as const, label: 'Compliance Frameworks' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
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
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Quick start from a template:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              <button onClick={() => openTemplate('pci-ssh')} className="text-teal hover:underline">PCI-DSS SSH</button>
              <button onClick={() => openTemplate('nist-ssh')} className="text-teal hover:underline">NIST SSH</button>
              <button onClick={() => openTemplate('zero-trust-tls')} className="text-teal hover:underline">Zero-Trust TLS</button>
              <button onClick={() => openTemplate('dora-cert')} className="text-teal hover:underline">DORA Certs</button>
              <button onClick={() => openTemplate('secret-rotation')} className="text-teal hover:underline">Secret Rotation</button>
              <button onClick={() => openTemplate('agent-jit')} className="text-teal hover:underline">Agent JIT</button>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
              <Plus className="w-3 h-3" /> Create Policy
            </button>
          </div>

          {userPolicies.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No custom policies yet</p>
              <button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="text-xs text-teal hover:underline">Create your first policy</button>
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

          <Modal open={createOpen} onClose={closeCreateModal} title="Create Policy" wide>
            <div className="w-full max-w-2xl space-y-4 text-foreground">
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Policy Type*</label>
                    <select value={formPolicyType} onChange={e => setFormPolicyType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Managed Certificate Policy', 'Kubernetes Certificate Policy', 'SSH Key Policy', 'Secrets & API Keys Policy', 'AI Agent Token Policy', 'Device Management Policy'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Tag</label>
                    <select value={formTag} onChange={e => setFormTag(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Default', 'PCI-DSS', 'DORA', 'NIS2', 'HIPAA', 'NIST', 'Zero-Trust', 'Internal'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[11px] font-medium mb-1">Policy Name*</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. PCI-DSS SSH Rotation — Production" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium">Description</label>
                    <button
                      type="button"
                      onClick={handleAIDraft}
                      disabled={formDescription.trim().length < 10}
                      className="inline-flex items-center gap-1 text-[10px] text-teal font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles className={aiLoading ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
                      Generate from description
                    </button>
                  </div>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder="Describe what you want this policy to do — e.g. rotate all production SSH keys every 90 days and block RSA-1024"
                    className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Scope</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Environment</label>
                    <select value={formEnvironment} onChange={e => setFormEnvironment(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['All', 'Production', 'Staging', 'Development'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Team</label>
                    <input value={formTeam} onChange={e => setFormTeam(e.target.value)} placeholder="e.g. Payments Engineering" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Compliance Group</label>
                    <select value={formGroup} onChange={e => setFormGroup(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      <option>All</option>
                      {mockGroups.map(group => <option key={group.id}>{group.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Rules</p>

                {formPolicyType === 'Managed Certificate Policy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Certificate Type</label>
                        <select value={formCertType} onChange={e => setFormCertType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['TLS / SSL', 'Code-Signing', 'S/MIME', 'Client Auth', 'SSH Certificate (Next Release)'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Action</label>
                        <select value={formCertAction} onChange={e => setFormCertAction(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Alert Only', 'Enroll', 'Auto-Renew', 'Re-Enroll'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>

                    {formCertAction !== 'Alert Only' && (
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Certificate Authority</label>
                        <select value={formCA} onChange={e => setFormCA(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Any', 'AppViewX CA', 'DigiCert', 'GlobalSign', 'Entrust', "Let's Encrypt", 'Microsoft CA', 'Sectigo', 'HashiCorp Vault PKI'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Max Validity</label>
                        <select value={formMaxValidity} onChange={e => setFormMaxValidity(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['30 days', '60 days', '90 days', '180 days', '365 days', '2 years', '3 years', 'No limit'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Minimum Key Strength</label>
                        <select value={formMinKeyType} onChange={e => setFormMinKeyType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['RSA-2048', 'RSA-4096', 'ECDSA-256', 'Ed25519'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-[11px] font-medium">Auto-renew before expiry?</p>
                        <p className="text-[9px] text-muted-foreground">Automatically renew before expiry date</p>
                      </div>
                      <button onClick={() => setFormAutoRenew(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formAutoRenew ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formAutoRenew ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {formAutoRenew && (
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Renew before expiry</label>
                        <select value={formRenewBefore} onChange={e => setFormRenewBefore(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['7 days', '14 days', '30 days', '45 days', '60 days'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {formPolicyType === 'Kubernetes Certificate Policy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Issuer</label>
                        <select value={formK8sIssuer} onChange={e => setFormK8sIssuer(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['cert-manager', 'Vault PKI', 'SPIFFE/SPIRE', 'ACME', 'AWS PCA', 'Custom'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Certificate Authority</label>
                        <select value={formCA} onChange={e => setFormCA(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Any', 'AppViewX CA', 'DigiCert', 'GlobalSign', 'Entrust', "Let's Encrypt", 'Microsoft CA', 'Sectigo', 'HashiCorp Vault PKI'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1">Namespace scope</label>
                      <input value={formK8sNamespace} onChange={e => setFormK8sNamespace(e.target.value)} placeholder="e.g. production-*, payments-namespace (leave blank for all)" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Max Validity</label>
                        <select value={formMaxValidity} onChange={e => setFormMaxValidity(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['1 hour', '6 hours', '24 hours', '7 days', '30 days', '90 days', '365 days'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Min Key Strength</label>
                        <select value={formMinKeyType} onChange={e => setFormMinKeyType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['RSA-2048', 'RSA-4096', 'ECDSA-256', 'Ed25519'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {formPolicyType === 'SSH Key Policy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Allowed Algorithms</label>
                        <input value={formAllowedAlgorithms} onChange={e => setFormAllowedAlgorithms(e.target.value)} placeholder="e.g. Ed25519, RSA-4096" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                        <p className="text-[9px] text-muted-foreground mt-1">Comma-separated. Keys using other algorithms will violate this policy.</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Maximum Key Age</label>
                        <select value={formMaxKeyAge} onChange={e => setFormMaxKeyAge(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['30 days', '60 days', '90 days', '180 days', '365 days', 'No limit'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-[11px] font-medium">Auto-rotate?</p>
                        <p className="text-[9px] text-muted-foreground">Rotate keys automatically on a schedule</p>
                      </div>
                      <button onClick={() => setFormAutoRotate(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formAutoRotate ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formAutoRotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {formAutoRotate && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Rotation Period</label>
                          <select value={formRotationPeriod} onChange={e => setFormRotationPeriod(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                            {['30 days', '60 days', '90 days', '180 days', '365 days', 'No limit'].map(option => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Target Algorithm</label>
                          <select value={formTargetAlgorithm} onChange={e => setFormTargetAlgorithm(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                            {['Ed25519', 'RSA-4096', 'ECDSA-256'].map(option => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-medium mb-2">Flag as violation if key is:</label>
                      <div className="space-y-1">
                        {[
                          ['Shared keys', sshFlagShared, setSshFlagShared],
                          ['Weak algorithms', sshFlagWeak, setSshFlagWeak],
                          ['Rogue keys', sshFlagRogue, setSshFlagRogue],
                          ['Misplaced keys', sshFlagMisplaced, setSshFlagMisplaced],
                          ['Orphaned keys (no owner)', sshFlagOrphaned, setSshFlagOrphaned],
                        ].map(([label, value, setter]) => (
                          <div key={label as string} className="flex items-center justify-between py-1.5 text-[11px]">
                            <span>{label as string}</span>
                            <button onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${(value as boolean) ? 'bg-teal' : 'bg-muted'}`}>
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${(value as boolean) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {formPolicyType === 'Secrets & API Keys Policy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Secret Type</label>
                        <select value={formSecretType} onChange={e => setFormSecretType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['All', 'API Keys', 'OAuth Tokens', 'Database Credentials', 'Service Account Keys', 'Vault Secrets'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Maximum Age</label>
                        <select value={formSecretMaxAge} onChange={e => setFormSecretMaxAge(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['30 days', '60 days', '90 days', '180 days', '365 days'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1">Approved Storage</label>
                      <select value={formSecretVault} onChange={e => setFormSecretVault(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                        {['Any', 'HashiCorp Vault', 'AWS Secrets Manager', 'Azure Key Vault', 'CyberArk Conjur', 'GCP Secret Manager'].map(option => <option key={option}>{option}</option>)}
                      </select>
                      <p className="text-[9px] text-muted-foreground mt-1">Secrets outside approved storage will be flagged.</p>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-[11px] font-medium">Auto-rotate?</p>
                        <p className="text-[9px] text-muted-foreground">Trigger automated secret rotation</p>
                      </div>
                      <button onClick={() => setFormSecretAutoRotate(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formSecretAutoRotate ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formSecretAutoRotate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    {formSecretAutoRotate && (
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Rotation Period</label>
                        <select value={formRotationPeriod} onChange={e => setFormRotationPeriod(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['30 days', '60 days', '90 days', '180 days', '365 days'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {formPolicyType === 'AI Agent Token Policy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Maximum Token TTL</label>
                        <select value={formAgentMaxTTL} onChange={e => setFormAgentMaxTTL(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['1 hour', '6 hours', '24 hours', '7 days', '30 days', '90 days', 'No limit'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Allowed Algorithms</label>
                        <input value={formAllowedAlgorithms} onChange={e => setFormAllowedAlgorithms(e.target.value)} placeholder="e.g. HMAC-SHA256, Ed25519" className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                      </div>
                    </div>

                    {[
                      ['Require just-in-time (JIT) issuance?', 'No static long-lived credentials permitted.', formEnforceJIT, setFormEnforceJIT],
                      ['Enforce least-privilege?', 'Flag agents whose permissions exceed usage.', formEnforceRightSize, setFormEnforceRightSize],
                      ['Require HITL approval for high-risk actions?', 'Pause agent actions touching PII, AD, or Firewall resources.', formRequireHITL, setFormRequireHITL],
                    ].map(([label, desc, value, setter]) => (
                      <div key={label as string} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-[11px]">
                        <div>
                          <p className="font-medium">{label as string}</p>
                          <p className="text-[9px] text-muted-foreground">{desc as string}</p>
                        </div>
                        <button onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${(value as boolean) ? 'bg-teal' : 'bg-muted'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${(value as boolean) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formPolicyType === 'Device Management Policy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Action</label>
                        <select value={formDeviceAction} onChange={e => setFormDeviceAction(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Onboard Device', 'Re-Onboard', 'Update Config'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Vendor / Platform</label>
                        <select value={formDeviceVendor} onChange={e => setFormDeviceVendor(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Linux Server', 'Microsoft Server', 'IIS', 'Apache', 'Nginx', 'F5 (ADC)', 'MS SQL', 'Tomcat', 'Custom'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium mb-1">Approval for onboarding</label>
                      <select value={formDeviceApproval} onChange={e => setFormDeviceApproval(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                        {['Auto-approve', 'Require approval', 'Auto-approve with notification'].map(option => <option key={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-3">On Violation</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Action</label>
                    <select value={formAction} onChange={e => setFormAction(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Alert only', 'Block action', 'Auto-remediate', 'Create ticket', 'Escalate to owner'].map(option => <option key={option}>{option}</option>)}
                    </select>
                    <p className="text-[9px] text-muted-foreground mt-1">Alert only is always applied in addition to other actions.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1">Severity</label>
                    <select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                      {['Low', 'Medium', 'High', 'Critical'].map(option => <option key={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <button onClick={() => setShowApproval(prev => !prev)} className="w-full flex items-center justify-between cursor-pointer py-2">
                  <span className="text-[11px] font-medium">Approval & Workflow</span>
                  {showApproval ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showApproval && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between py-2">
                      <p className="text-[11px] font-medium">Require approval before action?</p>
                      <button onClick={() => setFormRequireApproval(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formRequireApproval ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formRequireApproval ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {formRequireApproval && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Approval type</label>
                          <select value={formApprovalType} onChange={e => setFormApprovalType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                            {['User Group', 'Specific User', 'Email', 'LDAP Manager'].map(option => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium mb-1">Approver</label>
                          <input value={formApprovalTarget} onChange={e => setFormApprovalTarget(e.target.value)} placeholder={formApprovalType === 'User Group' ? 'e.g. Security-Ops-Group' : formApprovalType === 'Specific User' ? 'e.g. john@acme.com' : formApprovalType === 'Email' ? 'e.g. security@acme.com' : 'Fetched from LDAP directory'} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <button onClick={() => setShowNotifications(prev => !prev)} className="w-full flex items-center justify-between cursor-pointer py-2">
                  <span className="text-[11px] font-medium">Notifications</span>
                  {showNotifications ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showNotifications && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Notify via</label>
                        <select value={formNotifyVia} onChange={e => setFormNotifyVia(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                          {['Email', 'Slack'].map(option => <option key={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">Recipient</label>
                        <input value={formNotifyRecipient} onChange={e => setFormNotifyRecipient(e.target.value)} placeholder={formNotifyVia === 'Email' ? 'Recipient email address' : 'Slack channel e.g. #security-alerts'} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground" />
                      </div>
                    </div>
                    {[
                      ['On action start', formNotifyOnStart, setFormNotifyOnStart],
                      ['On completion', formNotifyOnComplete, setFormNotifyOnComplete],
                      ['On failure', formNotifyOnFail, setFormNotifyOnFail],
                    ].map(([label, value, setter]) => (
                      <div key={label as string} className="flex items-center justify-between py-2 text-[11px]">
                        <span>{label as string}</span>
                        <button onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${(value as boolean) ? 'bg-teal' : 'bg-muted'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${(value as boolean) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <button onClick={() => setShowItsm(prev => !prev)} className="w-full flex items-center justify-between cursor-pointer py-2">
                  <span className="text-[11px] font-medium">ITSM / ServiceNow <span className="text-[9px] text-teal">(ServiceNow connected)</span></span>
                  {showItsm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showItsm && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between py-2">
                      <p className="text-[11px] font-medium">Create a ServiceNow change request?</p>
                      <button onClick={() => setFormITSM(prev => !prev)} className={`w-10 h-5 rounded-full relative transition-colors ${formITSM ? 'bg-teal' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${formITSM ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {formITSM && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Request Type</label>
                            <select value={formItsmType} onChange={e => setFormItsmType(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['Normal', 'Standard', 'Emergency'].map(option => <option key={option}>{option}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium mb-1">Priority</label>
                            <select value={formItsmPriority} onChange={e => setFormItsmPriority(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-card text-foreground">
                              {['1-Critical', '2-High', '3-Moderate', '4-Low'].map(option => <option key={option}>{option}</option>)}
                            </select>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground">Short description auto-populated from policy name. Assignment group from owner.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-4 py-3 flex justify-end gap-2">
                <button onClick={closeCreateModal} className="px-4 py-2 text-xs rounded-lg hover:bg-muted">Cancel</button>
                <button onClick={() => handleSave(true)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Save as Draft</button>
                <button onClick={() => handleSave(false)} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Save & Activate</button>
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
