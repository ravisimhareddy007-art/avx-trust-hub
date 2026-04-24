import React, { useState, useMemo, useEffect } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import {
  RefreshCw, RotateCcw, XCircle, Shield, Search, Download, CheckCircle2,
  Clock, AlertTriangle, MoreVertical, Eye, Key, Lock, FileCode, Bot, Server,
  ArrowRight, User, Workflow, CheckCircle, Plus, Ticket, LockKeyhole,
  Terminal, Code, Database, Cpu, Sparkles, AlertCircle, Send
} from 'lucide-react';
import CLMRemediationWorkspace from '@/components/remediation/clm/CLMRemediationWorkspace';
import AIAgentRemediationWorkspace from '@/components/remediation/ai/AIAgentRemediationWorkspace';
import SSHRemediationWorkspace from '@/components/remediation/ssh/SSHRemediationWorkspace';

// ─── Types ───────────────────────────────────────────────────────────────────

type ModuleId = 'all' | 'clm' | 'ssh' | 'code-signing' | 'k8s' | 'encryption' | 'ai-agents' | 'secrets';
type FilterId = 'all-issues' | 'expiry' | 'pqc' | 'orphaned' | 'policy';

interface ModuleDef {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  types: CryptoAsset['type'][];
  licensed: boolean;
  provisionLabel?: string;
}

const modules: ModuleDef[] = [
  { id: 'all', label: 'All Objects', icon: AlertTriangle, types: [], licensed: true },
  { id: 'clm', label: 'Certificates (CLM)', icon: Lock, types: ['TLS Certificate'], licensed: true, provisionLabel: 'Issue New Certificate' },
  { id: 'ssh', label: 'SSH Keys & Certs', icon: Terminal, types: ['SSH Key', 'SSH Certificate'], licensed: true, provisionLabel: 'Generate SSH Key' },
  { id: 'code-signing', label: 'Code Signing', icon: FileCode, types: ['Code-Signing Certificate'], licensed: false, provisionLabel: 'Request Signing Cert' },
  { id: 'k8s', label: 'K8s / Service Mesh', icon: Cpu, types: ['K8s Workload Cert'], licensed: true, provisionLabel: 'Issue Workload Cert' },
  { id: 'encryption', label: 'Encryption Keys', icon: LockKeyhole, types: ['Encryption Key'], licensed: false, provisionLabel: 'Create Encryption Key' },
  { id: 'ai-agents', label: 'AI Agent Tokens', icon: Bot, types: ['AI Agent Token'], licensed: true, provisionLabel: 'Provision Agent Token' },
  { id: 'secrets', label: 'API Keys & Secrets', icon: Key, types: ['API Key / Secret'], licensed: false, provisionLabel: 'Add Secret' },
];

const issueFilters: { id: FilterId; label: string }[] = [
  { id: 'all-issues', label: 'All Issues' },
  { id: 'expiry', label: 'Expiring / Expired' },
  { id: 'pqc', label: 'PQC Migration' },
  { id: 'orphaned', label: 'Orphaned' },
  { id: 'policy', label: 'Policy Violations' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface RemediationItem {
  asset: CryptoAsset;
  issue: string;
  severity: string;
  recommendedAction: string;
  actionType: 'Renew' | 'Rotate' | 'Revoke' | 'Migrate to PQC' | 'Assign Owner' | 'Re-sign';
  issueCategory: 'expiry' | 'pqc' | 'orphaned' | 'policy';
}

function getRemediationItems(assets: CryptoAsset[]): RemediationItem[] {
  const items: RemediationItem[] = [];
  assets.forEach(asset => {
    if (asset.status === 'Expired' || (asset.status === 'Expiring' && asset.daysToExpiry <= 7)) {
      const isCert = ['TLS Certificate', 'Code-Signing Certificate', 'SSH Certificate', 'K8s Workload Cert'].includes(asset.type);
      items.push({
        asset, issue: asset.status === 'Expired' ? 'Expired' : `Expires in ${asset.daysToExpiry}d`,
        severity: asset.daysToExpiry <= 3 ? 'Critical' : 'High',
        recommendedAction: isCert ? 'Renew from CA' : 'Rotate immediately',
        actionType: isCert ? 'Renew' : 'Rotate', issueCategory: 'expiry',
      });
    }
    if (asset.pqcRisk === 'Critical' && !['AES-256', 'HMAC-SHA256'].includes(asset.algorithm)) {
      items.push({
        asset, issue: `Quantum-vulnerable: ${asset.algorithm}`, severity: 'Critical',
        recommendedAction: 'Migrate to PQC algorithm', actionType: 'Migrate to PQC', issueCategory: 'pqc',
      });
    }
    if (asset.status === 'Orphaned') {
      items.push({
        asset, issue: 'No owner — orphaned', severity: 'High',
        recommendedAction: 'Assign owner or revoke', actionType: 'Assign Owner', issueCategory: 'orphaned',
      });
    }
    if (asset.policyViolations > 0 && asset.status !== 'Expired' && asset.pqcRisk !== 'Critical') {
      items.push({
        asset, issue: `${asset.policyViolations} policy violation(s)`, severity: asset.policyViolations >= 2 ? 'High' : 'Medium',
        recommendedAction: 'Fix compliance gaps', actionType: 'Renew', issueCategory: 'policy',
      });
    }
  });
  return items.sort((a, b) => {
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });
}

function getActionIcon(type: string) {
  switch (type) {
    case 'Renew': return RefreshCw;
    case 'Rotate': return RotateCcw;
    case 'Revoke': return XCircle;
    case 'Re-sign': return FileCode;
    case 'Migrate to PQC': return Shield;
    case 'Assign Owner': return User;
    default: return RefreshCw;
  }
}

// ─── Provision Modal ─────────────────────────────────────────────────────────

function ProvisionModal({ module, onClose }: { module: ModuleDef; onClose: () => void }) {
  const [step, setStep] = useState(1);

  const fieldsByModule: Record<string, { label: string; type: string; options?: string[]; placeholder?: string }[]> = {
    clm: [
      { label: 'Common Name (CN)', type: 'text', placeholder: 'e.g. app.acmecorp.com' },
      { label: 'Subject Alternative Names (SANs)', type: 'textarea', placeholder: 'One per line' },
      { label: 'Certificate Authority', type: 'select', options: ['DigiCert Global G2', 'Entrust L1K', "Let's Encrypt R3", 'MSCA Enterprise'] },
      { label: 'Key Algorithm', type: 'select', options: ['RSA-2048', 'RSA-4096', 'ECC P-256', 'ECC P-384', 'Ed25519'] },
      { label: 'Validity Period', type: 'select', options: ['90 days', '180 days', '365 days'] },
      { label: 'Auto-Renew', type: 'checkbox' },
    ],
    ssh: [
      { label: 'Key Name', type: 'text', placeholder: 'e.g. prod-bastion-key' },
      { label: 'Key Type', type: 'select', options: ['Ed25519', 'RSA-4096', 'RSA-2048', 'ECDSA P-256'] },
      { label: 'Target Hosts', type: 'textarea', placeholder: 'hostnames or IPs, one per line' },
      { label: 'Passphrase Protected', type: 'checkbox' },
      { label: 'Rotation Policy', type: 'select', options: ['30 days', '60 days', '90 days', '180 days'] },
    ],
    'code-signing': [
      { label: 'Certificate Name', type: 'text', placeholder: 'e.g. release-signing-2026' },
      { label: 'Issuer CA', type: 'select', options: ['DigiCert Code Signing CA', 'Entrust Code Signing CA'] },
      { label: 'Key Algorithm', type: 'select', options: ['RSA-4096', 'ECC P-384'] },
      { label: 'HSM Storage', type: 'select', options: ['Thales Luna HSM', 'Fortanix DSM', 'AWS CloudHSM'] },
    ],
    k8s: [
      { label: 'Service Identity', type: 'text', placeholder: 'e.g. my-service.namespace.svc' },
      { label: 'Mesh CA', type: 'select', options: ['Istio Citadel CA', 'cert-manager (Let\'s Encrypt)', 'Linkerd'] },
      { label: 'Cluster', type: 'select', options: ['aws-eks-prod', 'gcp-gke-prod', 'azure-aks-prod'] },
      { label: 'Auto-Rotate', type: 'checkbox' },
      { label: 'TTL', type: 'select', options: ['1 hour', '12 hours', '24 hours', '7 days'] },
    ],
    encryption: [
      { label: 'Key Name', type: 'text', placeholder: 'e.g. payments-data-key' },
      { label: 'KMS Provider', type: 'select', options: ['AWS KMS', 'Azure Key Vault', 'Google Cloud KMS', 'HashiCorp Vault'] },
      { label: 'Cipher', type: 'select', options: ['AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305'] },
      { label: 'Rotation Policy', type: 'select', options: ['90 days', '180 days', '365 days'] },
    ],
    'ai-agents': [
      { label: 'Token Name', type: 'text', placeholder: 'e.g. my-agent-token' },
      { label: 'Agent Type', type: 'select', options: ['Autonomous Agent', 'Copilot', 'Service Bot', 'MCP Server', 'Pipeline Agent'] },
      { label: 'Framework', type: 'select', options: ['LangChain', 'LlamaIndex', 'CrewAI', 'Semantic Kernel', 'Custom'] },
      { label: 'TTL', type: 'select', options: ['24 hours', '7 days', '30 days', '90 days'] },
      { label: 'Permission Scope', type: 'textarea', placeholder: 'List required permissions' },
    ],
    secrets: [
      { label: 'Secret Name', type: 'text', placeholder: 'e.g. stripe-api-key-prod' },
      { label: 'Vault / Source', type: 'select', options: ['HashiCorp Vault', 'AWS Secrets Manager', 'Azure Key Vault', 'Manual'] },
      { label: 'Encryption', type: 'select', options: ['AES-256-GCM', 'Transit Encryption'] },
      { label: 'Rotation Policy', type: 'select', options: ['30 days', '90 days', '180 days', '365 days', 'Never'] },
    ],
  };

  const fields = fieldsByModule[module.id] || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 mb-2">
        {['Details', 'Review & Create'].map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full ${i + 1 <= step ? 'bg-teal' : 'bg-muted'}`} />
        ))}
      </div>
      {step === 1 && (
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.label}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
              {f.type === 'text' && <input type="text" placeholder={f.placeholder} className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" />}
              {f.type === 'textarea' && <textarea placeholder={f.placeholder} rows={2} className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none" />}
              {f.type === 'select' && (
                <select className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                  {f.options?.map(o => <option key={o}>{o}</option>)}
                </select>
              )}
              {f.type === 'checkbox' && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" defaultChecked className="rounded" /> Enabled</label>
              )}
            </div>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-muted rounded-lg p-4 text-xs space-y-1">
            <p className="font-semibold mb-2">Review</p>
            <p className="text-muted-foreground">Module: <span className="text-foreground font-medium">{module.label}</span></p>
            <p className="text-muted-foreground">Action: <span className="text-foreground font-medium">{module.provisionLabel}</span></p>
            <p className="text-muted-foreground">Environment: <span className="text-foreground font-medium">Production</span></p>
          </div>
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">A workflow will be created to track provisioning. Approvals may be required based on policy.</p>
          </div>
        </div>
      )}
      <div className="flex justify-between pt-2">
        <button onClick={() => step > 1 ? setStep(1) : onClose()} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        <button onClick={() => {
          if (step < 2) setStep(2);
          else { toast.success(`${module.provisionLabel} — provisioning started`); onClose(); }
        }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
          {step === 2 ? 'Create' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Creation Modal ───────────────────────────────────────────────────

function CreateTicketModal({ module, onClose, onCreated }: { module: ModuleDef; onClose: () => void; onCreated: () => void }) {
  const [summary, setSummary] = useState(`Request ${module.label} add-on module license`);
  const [priority, setPriority] = useState('High');
  const [justification, setJustification] = useState('');

  return (
    <div className="space-y-4">
      <div className="bg-amber/5 border border-amber/20 rounded-lg p-3 text-xs">
        <p className="font-medium text-amber mb-1">⚠ Module Not Licensed</p>
        <p className="text-muted-foreground">{module.label} remediation features require an add-on license. Create a ticket to request activation.</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Summary</label>
          <input type="text" value={summary} onChange={e => setSummary(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Business Justification</label>
          <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Why do you need this module?" className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Assign To</label>
          <select className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
            <option>IT Procurement</option><option>Security Admin</option><option>Platform Admin</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">Cancel</button>
        <button onClick={() => { toast.success(`Ticket created: ${summary}`); onCreated(); onClose(); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
          <Ticket className="w-3 h-3 inline mr-1" /> Create Ticket
        </button>
      </div>
    </div>
  );
}

// ─── Remediation Wizard ──────────────────────────────────────────────────────

function RemediationWizard({ item, onClose }: { item: RemediationItem; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const totalSteps = item.actionType === 'Assign Owner' ? 2 : 3;
  const stepLabels = item.actionType === 'Assign Owner' ? ['Review', 'Assign'] : ['Review Impact', 'Configure', 'Confirm'];

  const handleComplete = () => {
    toast.success(`${item.actionType} completed for ${item.asset.name}`);
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {stepLabels.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full ${i + 1 <= step ? 'bg-teal' : 'bg-muted'}`} />
        ))}
      </div>
      {step === 1 && (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-muted-foreground mb-0.5">Asset</p><p className="font-medium">{item.asset.name}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Type</p><p className="font-medium">{item.asset.type}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Algorithm</p><p className="font-medium">{item.asset.algorithm}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Environment</p><p className="font-medium">{item.asset.environment}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Owner</p><p className="font-medium">{item.asset.owner}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Dependencies</p><p className="font-medium">{item.asset.dependencyCount} services</p></div>
          </div>
          <div className="bg-coral/5 border border-coral/20 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-coral flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Impact: {item.asset.dependencyCount} services affected</p>
          </div>
        </div>
      )}
      {step === 2 && item.actionType !== 'Assign Owner' && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-muted-foreground">Target Algorithm</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded text-foreground">
              <option>{item.asset.algorithm}</option>
              <option>RSA-4096</option><option>ECC P-384</option><option>Ed25519</option>
              {item.actionType === 'Migrate to PQC' && <option>ML-DSA-65 (FIPS 204)</option>}
              {item.actionType === 'Migrate to PQC' && <option>ML-KEM-768 (FIPS 203)</option>}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">Schedule</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded text-foreground">
              <option>Immediately</option><option>Next maintenance window</option><option>Custom schedule</option>
            </select>
          </div>
        </div>
      )}
      {step === 2 && item.actionType === 'Assign Owner' && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-muted-foreground">New Owner</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded text-foreground">
              <option>Select owner...</option>
              <option>Sarah Chen — Payments</option><option>Mike Rodriguez — Platform</option>
              <option>Lisa Park — Infrastructure</option><option>Security Team</option>
            </select>
          </div>
        </div>
      )}
      {step === totalSteps && item.actionType !== 'Assign Owner' && (
        <div className="bg-muted rounded-lg p-4 text-xs space-y-1">
          <p className="font-semibold mb-2">Execution Summary</p>
          <p className="text-muted-foreground">Action: <strong className="text-foreground">{item.actionType}</strong> — {item.asset.name}</p>
          <p className="text-muted-foreground">Environment: <strong className="text-foreground">{item.asset.environment}</strong></p>
          <p className="text-muted-foreground">Affected Services: <strong className="text-foreground">{item.asset.dependencyCount}</strong></p>
        </div>
      )}
      <div className="flex justify-between pt-2">
        <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        <button onClick={() => step < totalSteps ? setStep(step + 1) : handleComplete()} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
          {step === totalSteps ? `Confirm ${item.actionType}` : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ─── Row Menu ────────────────────────────────────────────────────────────────

function RowMenu({ item, onAction }: { item: RemediationItem; onAction: (item: RemediationItem) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }} className="p-1 rounded hover:bg-secondary"><MoreVertical className="w-3.5 h-3.5 text-muted-foreground" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] py-1">
            {[{ label: item.actionType, icon: getActionIcon(item.actionType), primary: true }, { label: 'View in Inventory', icon: Eye }, { label: 'Create Ticket', icon: Ticket }].map(a => (
              <button key={a.label} onClick={() => { setOpen(false); if (a.label === item.actionType) onAction(item); else toast.info(`${a.label} — coming soon`); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary ${a.primary ? 'text-teal font-medium' : 'text-foreground'}`}>
                <a.icon className="w-3.5 h-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Locked Module Overlay ───────────────────────────────────────────────────

function LockedModuleOverlay({ module, onRequestLicense }: { module: ModuleDef; onRequestLicense: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center">
          <Lock className="w-10 h-10 text-amber" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">{module.label}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unlock powerful remediation workflows for {module.label.toLowerCase()} — including automated rotation, 
            provisioning, policy enforcement, and AI-powered bulk actions.
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-foreground">What you'll get:</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal flex-shrink-0" /> Automated remediation & provisioning</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal flex-shrink-0" /> AI-assisted bulk operations</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal flex-shrink-0" /> Policy-driven workflow enforcement</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-teal flex-shrink-0" /> Full audit trail & compliance reporting</li>
          </ul>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={onRequestLicense} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal-light transition-colors">
            <Ticket className="w-4 h-4" /> Request License to Enable
          </button>
          <p className="text-[10px] text-muted-foreground">A ticket will be created and routed to your procurement team.</p>
        </div>
      </div>
    </div>
  );
}

function ModuleRemediationView({
  moduleId,
  filters,
}: {
  moduleId: ModuleId;
  filters: Record<string, string>;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all-issues');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [wizardItem, setWizardItem] = useState<RemediationItem | null>(null);
  const [provisionModule, setProvisionModule] = useState<ModuleDef | null>(null);
  const [ticketModule, setTicketModule] = useState<ModuleDef | null>(null);

  useEffect(() => {
    if (filters.category && ['expiry', 'pqc', 'orphaned', 'policy'].includes(filters.category)) {
      setActiveFilter(filters.category as FilterId);
    }
    if (filters.assetId) {
      setSearch(filters.assetId);
    }
  }, [filters.category, filters.assetId]);

  const currentModule = modules.find(m => m.id === moduleId)!;
  const isLocked = moduleId !== 'all' && !currentModule.licensed;
  const allItems = useMemo(() => getRemediationItems(mockAssets), []);

  const items = useMemo(() => {
    let result = allItems;
    if (moduleId !== 'all') {
      result = result.filter(i => currentModule.types.includes(i.asset.type));
    }
    if (activeFilter !== 'all-issues') result = result.filter(i => i.issueCategory === activeFilter);
    if (search) result = result.filter(i => i.asset.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [allItems, moduleId, currentModule.types, activeFilter, search]);

  const issueFilterCounts = useMemo(() => {
    const base = moduleId === 'all' ? allItems : allItems.filter(i => currentModule.types.includes(i.asset.type));
    return {
      'all-issues': base.length,
      expiry: base.filter(i => i.issueCategory === 'expiry').length,
      pqc: base.filter(i => i.issueCategory === 'pqc').length,
      orphaned: base.filter(i => i.issueCategory === 'orphaned').length,
      policy: base.filter(i => i.issueCategory === 'policy').length,
    };
  }, [allItems, moduleId, currentModule.types]);

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLocked) {
    return (
      <>
        <LockedModuleOverlay module={currentModule} onRequestLicense={() => setTicketModule(currentModule)} />
        <Modal open={!!ticketModule} onClose={() => setTicketModule(null)} title="Request Module License">
          {ticketModule && <CreateTicketModal module={ticketModule} onClose={() => setTicketModule(null)} onCreated={() => {}} />}
        </Modal>
      </>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <currentModule.icon className="w-5 h-5 text-teal" />
            {currentModule.label}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} items need attention</p>
        </div>
        <div className="flex items-center gap-2">
          {moduleId !== 'all' && currentModule.provisionLabel && (
            <button onClick={() => setProvisionModule(currentModule)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal-light">
              <Plus className="w-3.5 h-3.5" /> {currentModule.provisionLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {issueFilters.map(f => (
          <button
            key={f.id}
            onClick={() => {
              setActiveFilter(f.id);
              setSelectedRows(new Set());
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
              activeFilter === f.id ? 'bg-teal/10 text-teal border border-teal/30' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            {f.label} ({issueFilterCounts[f.id]})
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border px-3 py-2 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-3 py-1 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
        {selectedRows.size > 0 && (
          <button
            onClick={() => {
              toast.success(`Bulk remediation for ${selectedRows.size} items`);
              setSelectedRows(new Set());
            }}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-teal text-primary-foreground rounded hover:bg-teal-light"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Remediate ({selectedRows.size})
          </button>
        )}
        <button onClick={() => toast.success('Exporting...')} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground ml-auto">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                <th className="w-8 py-2 px-2"><input type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(items.map((_, i) => `${i}`)) : new Set())} className="rounded" /></th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Severity</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Asset</th>
                {moduleId === 'all' && <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Type</th>}
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Issue</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Env</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Recommended</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Action</th>
                <th className="w-10 py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const Icon = getActionIcon(item.actionType);
                return (
                  <tr key={`${item.asset.id}-${item.issueCategory}-${i}`} className="border-b border-border hover:bg-secondary/30">
                    <td className="py-2 px-2"><input type="checkbox" checked={selectedRows.has(`${i}`)} onChange={() => toggleRow(`${i}`)} className="rounded" /></td>
                    <td className="py-2 px-2"><SeverityBadge severity={item.severity} /></td>
                    <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">{item.asset.name}</td>
                    {moduleId === 'all' && <td className="py-2 px-2 text-muted-foreground">{item.asset.type}</td>}
                    <td className="py-2 px-2 text-muted-foreground">{item.issue}</td>
                    <td className="py-2 px-2 text-muted-foreground">{item.asset.owner}</td>
                    <td className="py-2 px-2"><StatusBadge status={item.asset.environment} /></td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px] max-w-[160px]">{item.recommendedAction}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => setWizardItem(item)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-teal/10 text-teal hover:bg-teal/20 whitespace-nowrap">
                        <Icon className="w-3 h-3" /> {item.actionType}
                      </button>
                    </td>
                    <td className="py-2 px-2"><RowMenu item={item} onAction={setWizardItem} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No remediation items match the current filters.</div>}
      </div>

      <Modal open={!!wizardItem} onClose={() => setWizardItem(null)} title={`${wizardItem?.actionType} — ${wizardItem?.asset.name || ''}`}>
        {wizardItem && <RemediationWizard item={wizardItem} onClose={() => setWizardItem(null)} />}
      </Modal>
      <Modal open={!!provisionModule} onClose={() => setProvisionModule(null)} title={provisionModule?.provisionLabel || ''}>
        {provisionModule && <ProvisionModal module={provisionModule} onClose={() => setProvisionModule(null)} />}
      </Modal>
      <Modal open={!!ticketModule} onClose={() => setTicketModule(null)} title="Request Module License">
        {ticketModule && <CreateTicketModal module={ticketModule} onClose={() => setTicketModule(null)} onCreated={() => {}} />}
      </Modal>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RemediationPage() {
  const { currentPage, filters } = useNav();

  return (
    <div className="flex-1 overflow-auto">
      {currentPage === 'remediation-objects' && <ModuleRemediationView moduleId="all" filters={filters} />}
      {currentPage === 'remediation-clm' && <CLMRemediationWorkspace />}
      {currentPage === 'remediation-ssh' && <SSHRemediationWorkspace />}
      {currentPage === 'remediation-ai' && <AIAgentRemediationWorkspace />}
      {currentPage === 'remediation-secrets' && <ModuleRemediationView moduleId="secrets" filters={filters} />}
    </div>
  );
}
