import React, { useState, useMemo } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import {
  RefreshCw, RotateCcw, XCircle, Shield, Search, Download, CheckCircle2,
  Clock, AlertTriangle, MoreVertical, Eye, Key, Lock, FileCode, Bot, Server,
  ArrowRight, User, Workflow, CheckCircle
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type CryptoCategory = 'certificates' | 'keys' | 'tokens';

function getCryptoCategory(type: CryptoAsset['type']): CryptoCategory {
  if (['TLS Certificate', 'Code-Signing Certificate', 'SSH Certificate', 'K8s Workload Cert'].includes(type)) return 'certificates';
  if (['SSH Key', 'Encryption Key'].includes(type)) return 'keys';
  return 'tokens';
}

function getCryptoCategoryLabel(cat: CryptoCategory) {
  return { certificates: 'Certificates', keys: 'Keys', tokens: 'Tokens & Agents' }[cat];
}

function getCryptoCategoryIcon(cat: CryptoCategory) {
  return { certificates: Lock, keys: Key, tokens: Bot }[cat];
}

function getAssetNoun(type: CryptoAsset['type']): string {
  const map: Record<string, string> = {
    'TLS Certificate': 'certificate',
    'SSH Key': 'SSH key',
    'SSH Certificate': 'SSH certificate',
    'Code-Signing Certificate': 'code-signing certificate',
    'K8s Workload Cert': 'workload certificate',
    'Encryption Key': 'encryption key',
    'AI Agent Token': 'agent token',
  };
  return map[type] || 'credential';
}

function getAssetTypeIcon(type: CryptoAsset['type']) {
  const map: Record<string, React.ElementType> = {
    'TLS Certificate': Lock,
    'SSH Key': Key,
    'SSH Certificate': Key,
    'Code-Signing Certificate': FileCode,
    'K8s Workload Cert': Server,
    'Encryption Key': Key,
    'AI Agent Token': Bot,
  };
  return map[type] || Lock;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemediationItem {
  asset: CryptoAsset;
  issue: string;
  severity: string;
  recommendedAction: string;
  actionType: 'Renew' | 'Rotate' | 'Revoke' | 'Migrate to PQC' | 'Assign Owner' | 'Re-sign';
  issueCategory: 'expiry' | 'pqc' | 'orphaned' | 'policy';
  cryptoCategory: CryptoCategory;
}

type TabId = 'all' | 'certificates' | 'keys' | 'tokens';
type FilterId = 'all-issues' | 'expiry' | 'pqc' | 'orphaned' | 'policy';

// ─── Build remediation items ─────────────────────────────────────────────────

function getRemediationItems(assets: CryptoAsset[]): RemediationItem[] {
  const items: RemediationItem[] = [];

  assets.forEach(asset => {
    const noun = getAssetNoun(asset.type);
    const cryptoCat = getCryptoCategory(asset.type);

    // Expiry
    if (asset.status === 'Expired' || (asset.status === 'Expiring' && asset.daysToExpiry <= 7)) {
      const isCert = cryptoCat === 'certificates';
      const isKey = cryptoCat === 'keys';
      const isToken = cryptoCat === 'tokens';

      let action = '';
      let actionType: RemediationItem['actionType'] = 'Renew';

      if (isCert) {
        action = asset.status === 'Expired' ? `Renew ${noun} from CA` : `Renew ${noun} before expiry`;
        actionType = 'Renew';
      } else if (isKey) {
        action = `Rotate ${noun} immediately`;
        actionType = 'Rotate';
      } else {
        action = `Rotate ${noun} and update service bindings`;
        actionType = 'Rotate';
      }

      items.push({
        asset,
        issue: asset.status === 'Expired' ? `${noun.charAt(0).toUpperCase() + noun.slice(1)} expired` : `Expires in ${asset.daysToExpiry} days`,
        severity: asset.daysToExpiry <= 3 ? 'Critical' : 'High',
        recommendedAction: action,
        actionType,
        issueCategory: 'expiry',
        cryptoCategory: cryptoCat,
      });
    }

    // PQC vulnerability
    if (asset.pqcRisk === 'Critical' && !['AES-256', 'HMAC-SHA256'].includes(asset.algorithm)) {
      items.push({
        asset,
        issue: `Quantum-vulnerable: ${asset.algorithm}`,
        severity: 'Critical',
        recommendedAction: cryptoCat === 'keys'
          ? 'Migrate to quantum-safe key algorithm (ML-KEM)'
          : 'Migrate to post-quantum algorithm (ML-DSA / ML-KEM)',
        actionType: 'Migrate to PQC',
        issueCategory: 'pqc',
        cryptoCategory: cryptoCat,
      });
    }

    // Orphaned
    if (asset.status === 'Orphaned') {
      items.push({
        asset,
        issue: `No owner — orphaned ${noun}`,
        severity: 'High',
        recommendedAction: `Assign owner or revoke ${noun}`,
        actionType: 'Assign Owner',
        issueCategory: 'orphaned',
        cryptoCategory: cryptoCat,
      });
    }

    // Policy violations
    if (asset.policyViolations > 0 && asset.status !== 'Expired' && asset.pqcRisk !== 'Critical') {
      const isCert = cryptoCat === 'certificates';
      items.push({
        asset,
        issue: `${asset.policyViolations} policy violation(s)`,
        severity: asset.policyViolations >= 2 ? 'High' : 'Medium',
        recommendedAction: isCert ? 'Renew with compliant parameters' : `Rotate ${noun} with compliant config`,
        actionType: isCert ? 'Renew' : 'Rotate',
        issueCategory: 'policy',
        cryptoCategory: cryptoCat,
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

// ─── Remediation Wizard ──────────────────────────────────────────────────────

function RemediationWizard({ item, onClose }: { item: RemediationItem; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const totalSteps = item.actionType === 'Assign Owner' ? 2 : 3;
  const stepLabels = item.actionType === 'Assign Owner'
    ? ['Review', 'Assign']
    : ['Review Impact', 'Configure', 'Confirm & Execute'];
  const noun = getAssetNoun(item.asset.type);
  const TypeIcon = getAssetTypeIcon(item.asset.type);

  const handleComplete = () => {
    toast.success(`${item.actionType} completed for ${item.asset.name}`, {
      description: 'Workflow created and tracking has started.',
    });
    onClose();
  };

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex gap-1">
          {stepLabels.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${i + 1 <= step ? 'bg-teal' : 'bg-muted'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {stepLabels.map((s, i) => (
            <span key={s} className={i + 1 === step ? 'text-teal font-medium' : ''}>{s}</span>
          ))}
        </div>
      </div>

      {/* Step 1: Review */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs mb-2">
            <TypeIcon className="w-4 h-4 text-teal" />
            <span className="text-muted-foreground">Crypto Object:</span>
            <span className="font-medium">{item.asset.type}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-muted-foreground mb-0.5">Asset</p><p className="font-medium">{item.asset.name}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Algorithm</p><p className="font-medium">{item.asset.algorithm}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Key Length</p><p className="font-medium">{item.asset.keyLength}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Environment</p><p className="font-medium">{item.asset.environment}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Owner</p><p className="font-medium">{item.asset.owner}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Dependencies</p><p className="font-medium">{item.asset.dependencyCount} services</p></div>
          </div>

          <div className="bg-coral/5 border border-coral/20 rounded-lg p-3">
            <p className="text-xs font-semibold text-coral mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Impact Assessment
            </p>
            <p className="text-[10px] text-muted-foreground">
              This action will affect <strong>{item.asset.dependencyCount}</strong> dependent services.
              {item.actionType === 'Revoke' && ` WARNING: Dependent services will lose trust in this ${noun} immediately.`}
              {item.actionType === 'Migrate to PQC' && ` Current algorithm ${item.asset.algorithm} on this ${noun} will be replaced with a PQC-safe equivalent.`}
              {item.actionType === 'Rotate' && ` A new ${noun} will be generated and distributed to all bound endpoints.`}
              {item.actionType === 'Renew' && ` A new ${noun} will be issued and deployed across all endpoints.`}
              {item.actionType === 'Re-sign' && ` This ${noun} will be re-signed with updated parameters.`}
            </p>
          </div>

          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <p className="text-[10px] font-medium text-teal mb-1">✦ AI Recommendation</p>
            <p className="text-[10px] text-muted-foreground">
              {item.severity === 'Critical'
                ? `Immediate action recommended. This ${noun} is critical to ${item.asset.dependencyCount} services in ${item.asset.environment}.`
                : `Schedule during next maintenance window. Risk is manageable with ${item.asset.daysToExpiry > 0 ? `${item.asset.daysToExpiry} days` : 'immediate'} timeline.`}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Configure — Certificates */}
      {step === 2 && item.actionType !== 'Assign Owner' && item.cryptoCategory === 'certificates' && (
        <div className="space-y-3 text-xs">
          {item.actionType === 'Renew' && (
            <>
              <div>
                <label className="text-muted-foreground">Certificate Authority</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>{item.asset.caIssuer}</option>
                  <option>DigiCert Global G2</option>
                  <option>Entrust L1K</option>
                  <option>Let's Encrypt R3</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Validity Period</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>90 days</option><option>180 days</option><option>365 days</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Algorithm</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>{item.asset.algorithm}</option>
                  <option>RSA-4096</option><option>ECC P-384</option><option>Ed25519</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Schedule</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>Immediately</option><option>Next maintenance window (02:00 AM)</option><option>Custom schedule</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" defaultChecked className="rounded" /> Enable auto-renewal
              </label>
            </>
          )}
          {item.actionType === 'Migrate to PQC' && (
            <>
              <div>
                <label className="text-muted-foreground">Target Algorithm</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>ML-DSA-65 (FIPS 204)</option><option>ML-DSA-87 (FIPS 204)</option><option>SLH-DSA-SHA2-128f</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Migration Strategy</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>Hybrid (classical + PQC) — recommended</option><option>Direct replacement</option>
                </select>
              </div>
              <div className="bg-amber/5 border border-amber/20 rounded-lg p-3">
                <p className="text-[10px] font-medium text-amber mb-1">⚠ Compatibility Note</p>
                <p className="text-[10px] text-muted-foreground">
                  Hybrid mode maintains backward compatibility. {item.asset.dependencyCount} dependent services will be checked for PQC support.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Configure — Keys */}
      {step === 2 && item.actionType !== 'Assign Owner' && item.cryptoCategory === 'keys' && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-muted-foreground">New Algorithm</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>{item.asset.algorithm}</option>
              <option>Ed25519</option><option>RSA-4096</option><option>AES-256-GCM</option>
              {item.actionType === 'Migrate to PQC' && <option>ML-KEM-768 (FIPS 203)</option>}
              {item.actionType === 'Migrate to PQC' && <option>ML-KEM-1024 (FIPS 203)</option>}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">Key Storage</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>HSM (Thales Luna)</option><option>HSM (Fortanix DSM)</option><option>Software Keystore</option><option>Cloud KMS</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">Distribution Method</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>Automated (push to all endpoints)</option><option>Manual (download new key)</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">Grace Period</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>None — immediate cutover</option><option>24 hours (old + new key valid)</option><option>72 hours</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 2: Configure — Tokens */}
      {step === 2 && item.actionType !== 'Assign Owner' && item.cryptoCategory === 'tokens' && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-muted-foreground">Token Type</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>Service Account Token</option><option>API Key</option><option>mTLS Client Certificate</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">New Algorithm / Signing</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>{item.asset.algorithm}</option>
              <option>Ed25519</option><option>HMAC-SHA256</option>
              {item.actionType === 'Migrate to PQC' && <option>ML-DSA-65 (FIPS 204)</option>}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">Service Rebinding</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>Auto-rebind all {item.asset.dependencyCount} connected services</option>
              <option>Manual rebinding (notify owners)</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">TTL</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>24 hours</option><option>7 days</option><option>30 days</option><option>90 days</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" defaultChecked className="rounded" /> Revoke old token after rotation
          </label>
        </div>
      )}

      {/* Step 2: Assign Owner */}
      {step === 2 && item.actionType === 'Assign Owner' && (
        <div className="space-y-3 text-xs">
          <div>
            <label className="text-muted-foreground">New Owner</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>Select owner...</option>
              <option>Sarah Chen — Payments Engineering</option>
              <option>Mike Rodriguez — Platform Engineering</option>
              <option>Lisa Park — Infrastructure</option>
              <option>James Wilson — Identity & Access</option>
              <option>Security Team — Security Operations</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground">Action after assignment</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
              <option>Notify owner & set rotation schedule</option>
              <option>Notify owner only</option>
              <option>Revoke if no owner claims in 7 days</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === totalSteps && item.actionType !== 'Assign Owner' && (
        <div className="space-y-3">
          <div className="bg-muted rounded-lg p-4 text-xs space-y-2">
            <p className="font-semibold">Execution Summary</p>
            <div className="space-y-1 text-muted-foreground">
              <p>• <strong>Action:</strong> {item.actionType} — {item.asset.name}</p>
              <p>• <strong>Object Type:</strong> {item.asset.type}</p>
              <p>• <strong>Environment:</strong> {item.asset.environment}</p>
              <p>• <strong>Affected Services:</strong> {item.asset.dependencyCount}</p>
              <p>• <strong>Schedule:</strong> Immediately</p>
            </div>
          </div>
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">
              A workflow will be created to track this action. You'll receive notifications at each step.
            </p>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between pt-2">
        <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary">
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        <button onClick={() => step < totalSteps ? setStep(step + 1) : handleComplete()}
          className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
          {step === totalSteps ? `Confirm ${item.actionType}` : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ─── Row Menu ────────────────────────────────────────────────────────────────

function RowMenu({ item, onAction }: { item: RemediationItem; onAction: (item: RemediationItem) => void }) {
  const [open, setOpen] = useState(false);
  const actions = [
    { label: item.actionType, icon: getActionIcon(item.actionType), primary: true },
    { label: 'View in Inventory', icon: Eye, primary: false },
    { label: 'Assign Owner', icon: User, primary: false },
    { label: 'Add to Workflow', icon: Workflow, primary: false },
  ];

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-1 rounded hover:bg-secondary transition-colors">
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[180px] py-1">
            {actions.map(a => (
              <button key={a.label} onClick={() => {
                setOpen(false);
                if (a.label === item.actionType) onAction(item);
                else if (a.label === 'View in Inventory') toast.info('Opening in Inventory...');
                else toast.info(`${a.label} — coming soon`);
              }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors ${a.primary ? 'text-teal font-medium' : 'text-foreground'}`}>
                <a.icon className="w-3.5 h-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const typeTabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Objects', icon: AlertTriangle },
  { id: 'certificates', label: 'Certificates', icon: Lock },
  { id: 'keys', label: 'Keys', icon: Key },
  { id: 'tokens', label: 'Tokens & Agents', icon: Bot },
];

const issueFilters: { id: FilterId; label: string }[] = [
  { id: 'all-issues', label: 'All Issues' },
  { id: 'expiry', label: 'Expiring / Expired' },
  { id: 'pqc', label: 'PQC Migration' },
  { id: 'orphaned', label: 'Orphaned' },
  { id: 'policy', label: 'Policy Violations' },
];

export default function RemediationPage() {
  const { filters, setFilters } = useNav();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all-issues');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [wizardItem, setWizardItem] = useState<RemediationItem | null>(null);

  const allItems = useMemo(() => getRemediationItems(mockAssets), []);

  const items = useMemo(() => {
    let result = allItems;
    // Filter by crypto type tab
    if (activeTab !== 'all') result = result.filter(i => i.cryptoCategory === activeTab);
    // Filter by issue category
    if (activeFilter !== 'all-issues') result = result.filter(i => i.issueCategory === activeFilter);
    // Search
    if (search) result = result.filter(i =>
      i.asset.name.toLowerCase().includes(search.toLowerCase()) ||
      i.asset.type.toLowerCase().includes(search.toLowerCase())
    );
    return result;
  }, [allItems, activeTab, activeFilter, search]);

  const tabCounts = useMemo(() => ({
    all: allItems.length,
    certificates: allItems.filter(i => i.cryptoCategory === 'certificates').length,
    keys: allItems.filter(i => i.cryptoCategory === 'keys').length,
    tokens: allItems.filter(i => i.cryptoCategory === 'tokens').length,
  }), [allItems]);

  const issueFilterCounts = useMemo(() => {
    const base = activeTab === 'all' ? allItems : allItems.filter(i => i.cryptoCategory === activeTab);
    return {
      'all-issues': base.length,
      expiry: base.filter(i => i.issueCategory === 'expiry').length,
      pqc: base.filter(i => i.issueCategory === 'pqc').length,
      orphaned: base.filter(i => i.issueCategory === 'orphaned').length,
      policy: base.filter(i => i.issueCategory === 'policy').length,
    };
  }, [allItems, activeTab]);

  const toggleRow = (id: string) => {
    setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkRemediate = () => {
    if (selectedRows.size === 0) { toast.info('Select items first'); return; }
    toast.success(`Bulk remediation initiated for ${selectedRows.size} items`, { description: 'Workflows created for each item.' });
    setSelectedRows(new Set());
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Remediation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allItems.length} crypto objects need attention — certificates, keys, tokens & agents
          </p>
        </div>
      </div>

      {/* Primary tabs: by crypto object type */}
      <div className="flex items-center gap-0 border-b border-border">
        {typeTabs.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedRows(new Set()); }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              activeTab === tab.id ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'
            }`}>{tabCounts[tab.id]}</span>
          </button>
        ))}
      </div>

      {/* Secondary filter: by issue type */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {issueFilters.map(f => (
          <button key={f.id}
            onClick={() => { setActiveFilter(f.id); setSelectedRows(new Set()); }}
            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
              activeFilter === f.id
                ? 'bg-teal/10 text-teal border border-teal/30'
                : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
            }`}>
            {f.label} ({issueFilterCounts[f.id]})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-lg border border-border px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or type..."
            className="w-full pl-7 pr-3 py-1 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <div className="w-px h-6 bg-border" />
        {selectedRows.size > 0 && (
          <button onClick={handleBulkRemediate}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-teal text-primary-foreground rounded hover:bg-teal-light transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" /> Remediate Selected ({selectedRows.size})
          </button>
        )}
        <button onClick={() => toast.success('Exporting remediation report...')}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground ml-auto">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {/* Selection indicator */}
      {selectedRows.size > 0 && (
        <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-teal">{selectedRows.size} selected</span>
          <button onClick={() => setSelectedRows(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                <th className="w-8 py-2 px-2">
                  <input type="checkbox" onChange={e => setSelectedRows(e.target.checked ? new Set(items.map((_, i) => `${i}`)) : new Set())} className="rounded" />
                </th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Severity</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Asset Name</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Object Type</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Issue</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Owner</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Environment</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Recommended</th>
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Action</th>
                <th className="w-10 py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const Icon = getActionIcon(item.actionType);
                const TypeIcon = getAssetTypeIcon(item.asset.type);
                return (
                  <tr key={`${item.asset.id}-${item.issueCategory}-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="py-2 px-2">
                      <input type="checkbox" checked={selectedRows.has(`${i}`)} onChange={() => toggleRow(`${i}`)} className="rounded" />
                    </td>
                    <td className="py-2 px-2"><SeverityBadge severity={item.severity} /></td>
                    <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">{item.asset.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <TypeIcon className="w-3 h-3" /> {item.asset.type}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground max-w-[180px]">{item.issue}</td>
                    <td className="py-2 px-2 text-muted-foreground">{item.asset.owner}</td>
                    <td className="py-2 px-2"><StatusBadge status={item.asset.environment} /></td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px] max-w-[160px]">{item.recommendedAction}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => setWizardItem(item)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-teal/10 text-teal hover:bg-teal/20 transition-colors whitespace-nowrap">
                        <Icon className="w-3 h-3" /> {item.actionType}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <RowMenu item={item} onAction={setWizardItem} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No remediation items match the current filters.
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      <Modal open={!!wizardItem} onClose={() => setWizardItem(null)} title={`${wizardItem?.actionType} — ${wizardItem?.asset.name || ''}`}>
        {wizardItem && <RemediationWizard item={wizardItem} onClose={() => setWizardItem(null)} />}
      </Modal>
    </div>
  );
}
