import React, { useState, useMemo } from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets, CryptoAsset } from '@/data/mockData';
import { StatusBadge, SeverityBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import {
  RefreshCw, RotateCcw, XCircle, Shield, Search, Download, CheckCircle2,
  ChevronRight, Clock, AlertTriangle, MoreVertical, ChevronDown, Eye,
  ArrowRight, User, Workflow, CheckCircle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RemediationItem {
  asset: CryptoAsset;
  issue: string;
  severity: string;
  recommendedAction: string;
  actionType: 'Renew' | 'Rotate' | 'Revoke' | 'Migrate to PQC' | 'Assign Owner';
  category: 'expiry' | 'pqc' | 'orphaned' | 'policy';
}

type TabId = 'all' | 'expiry' | 'pqc' | 'orphaned' | 'policy';

// ─── Logic ───────────────────────────────────────────────────────────────────

function getRemediationItems(assets: CryptoAsset[]): RemediationItem[] {
  const items: RemediationItem[] = [];

  assets.forEach(asset => {
    // Expiry issues
    if (asset.status === 'Expired' || (asset.status === 'Expiring' && asset.daysToExpiry <= 7)) {
      const isSSH = asset.type === 'SSH Key' || asset.type === 'SSH Certificate';
      const isAI = asset.type === 'AI Agent Token';
      items.push({
        asset,
        issue: asset.status === 'Expired' ? 'Certificate expired' : `Expires in ${asset.daysToExpiry} days`,
        severity: asset.daysToExpiry <= 3 ? 'Critical' : 'High',
        recommendedAction: isSSH || isAI ? 'Rotate key immediately' : 'Renew certificate from CA',
        actionType: isSSH || isAI ? 'Rotate' : 'Renew',
        category: 'expiry',
      });
    }

    // PQC vulnerability — only non-PQC-safe algorithms
    if (asset.pqcRisk === 'Critical' && !['AES-256', 'HMAC-SHA256'].includes(asset.algorithm)) {
      items.push({
        asset,
        issue: `Quantum-vulnerable: ${asset.algorithm}`,
        severity: 'Critical',
        recommendedAction: 'Migrate to post-quantum algorithm (ML-DSA / ML-KEM)',
        actionType: 'Migrate to PQC',
        category: 'pqc',
      });
    }

    // Orphaned credentials
    if (asset.status === 'Orphaned') {
      items.push({
        asset,
        issue: 'No owner assigned — orphaned credential',
        severity: 'High',
        recommendedAction: 'Assign owner or revoke credential',
        actionType: 'Assign Owner',
        category: 'orphaned',
      });
    }

    // Policy violations
    if (asset.policyViolations > 0 && asset.status !== 'Expired' && asset.pqcRisk !== 'Critical') {
      items.push({
        asset,
        issue: `${asset.policyViolations} policy violation(s)`,
        severity: asset.policyViolations >= 2 ? 'High' : 'Medium',
        recommendedAction: 'Review and fix policy violations',
        actionType: 'Renew',
        category: 'policy',
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
    case 'Migrate to PQC': return Shield;
    case 'Assign Owner': return User;
    default: return RefreshCw;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RemediationWizard({ item, onClose }: { item: RemediationItem; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const totalSteps = item.actionType === 'Assign Owner' ? 2 : 3;
  const stepLabels = item.actionType === 'Assign Owner'
    ? ['Review', 'Assign']
    : ['Review Impact', 'Configure', 'Confirm & Execute'];

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
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-muted-foreground mb-0.5">Asset</p><p className="font-medium">{item.asset.name}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Type</p><p className="font-medium">{item.asset.type}</p></div>
            <div><p className="text-muted-foreground mb-0.5">Algorithm</p><p className="font-medium">{item.asset.algorithm}</p></div>
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
              {item.actionType === 'Revoke' && ' WARNING: Dependent services will lose trust immediately.'}
              {item.actionType === 'Migrate to PQC' && ` Current algorithm ${item.asset.algorithm} will be replaced with ML-DSA (FIPS 204).`}
              {item.actionType === 'Rotate' && ' A new key pair will be generated and distributed to all endpoints.'}
              {item.actionType === 'Renew' && ' New certificate will be issued and deployed across all endpoints.'}
            </p>
          </div>

          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <p className="text-[10px] font-medium text-teal mb-1">✦ AI Recommendation</p>
            <p className="text-[10px] text-muted-foreground">
              {item.severity === 'Critical'
                ? `Immediate action recommended. This ${item.asset.type.toLowerCase()} is critical to ${item.asset.dependencyCount} services in ${item.asset.environment}.`
                : `Schedule during next maintenance window. Risk is manageable with ${item.asset.daysToExpiry > 0 ? `${item.asset.daysToExpiry} days` : 'immediate'} timeline.`}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && item.actionType !== 'Assign Owner' && (
        <div className="space-y-3 text-xs">
          {(item.actionType === 'Renew') && (
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
                  <option>90 days</option>
                  <option>180 days</option>
                  <option>365 days</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Schedule</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>Immediately</option>
                  <option>Next maintenance window (02:00 AM)</option>
                  <option>Custom schedule</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" defaultChecked className="rounded" />
                Enable auto-renewal for future cycles
              </label>
            </>
          )}

          {item.actionType === 'Rotate' && (
            <>
              <div>
                <label className="text-muted-foreground">New Algorithm</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>{item.asset.algorithm}</option>
                  <option>Ed25519</option>
                  <option>RSA-4096</option>
                  <option>ECC P-256</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Distribution Method</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>Automated (push to all endpoints)</option>
                  <option>Manual (download new key)</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Grace Period</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>None — immediate cutover</option>
                  <option>24 hours (old + new key valid)</option>
                  <option>72 hours</option>
                </select>
              </div>
            </>
          )}

          {item.actionType === 'Migrate to PQC' && (
            <>
              <div>
                <label className="text-muted-foreground">Target Algorithm</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>ML-DSA-65 (FIPS 204)</option>
                  <option>ML-DSA-87 (FIPS 204)</option>
                  <option>ML-KEM-768 (FIPS 203)</option>
                  <option>SLH-DSA-SHA2-128f</option>
                </select>
              </div>
              <div>
                <label className="text-muted-foreground">Migration Strategy</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground">
                  <option>Hybrid (classical + PQC) — recommended</option>
                  <option>Direct replacement</option>
                </select>
              </div>
              <div className="bg-amber/5 border border-amber/20 rounded-lg p-3">
                <p className="text-[10px] font-medium text-amber mb-1">⚠ Compatibility Note</p>
                <p className="text-[10px] text-muted-foreground">
                  Hybrid mode maintains backward compatibility with systems not yet PQC-ready.
                  {item.asset.dependencyCount} dependent services will be checked for PQC support.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2 for Assign Owner */}
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

      {/* Nav buttons */}
      <div className="flex justify-between pt-2">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        <button
          onClick={() => step < totalSteps ? setStep(step + 1) : handleComplete()}
          className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light"
        >
          {step === totalSteps ? `Confirm ${item.actionType}` : 'Next'}
        </button>
      </div>
    </div>
  );
}

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
            {actions.map((a, i) => (
              <button
                key={a.label}
                onClick={() => {
                  setOpen(false);
                  if (a.label === item.actionType) onAction(item);
                  else if (a.label === 'View in Inventory') toast.info('Opening in Inventory...');
                  else toast.info(`${a.label} — coming soon`);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors ${a.primary ? 'text-teal font-medium' : 'text-foreground'}`}
              >
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

const tabs: { id: TabId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'all', label: 'All Issues', icon: AlertTriangle, desc: 'Everything requiring attention' },
  { id: 'expiry', label: 'Expiring / Expired', icon: Clock, desc: 'Certificates and keys nearing or past expiry' },
  { id: 'pqc', label: 'PQC Migration', icon: Shield, desc: 'Quantum-vulnerable cryptographic assets' },
  { id: 'orphaned', label: 'Orphaned', icon: User, desc: 'Credentials without assigned owners' },
  { id: 'policy', label: 'Policy Violations', icon: AlertTriangle, desc: 'Assets violating organizational policies' },
];

export default function RemediationPage() {
  const { filters, setFilters } = useNav();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [wizardItem, setWizardItem] = useState<RemediationItem | null>(null);

  const allItems = useMemo(() => getRemediationItems(mockAssets), []);

  const items = useMemo(() => {
    let result = activeTab === 'all' ? allItems : allItems.filter(i => i.category === activeTab);
    if (search) result = result.filter(i => i.asset.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [allItems, activeTab, search]);

  const tabCounts = useMemo(() => ({
    all: allItems.length,
    expiry: allItems.filter(i => i.category === 'expiry').length,
    pqc: allItems.filter(i => i.category === 'pqc').length,
    orphaned: allItems.filter(i => i.category === 'orphaned').length,
    policy: allItems.filter(i => i.category === 'policy').length,
  }), [allItems]);

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
          <p className="text-xs text-muted-foreground mt-0.5">{allItems.length} items need attention across your crypto inventory</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedRows(new Set()); }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-teal text-teal'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              activeTab === tab.id ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'
            }`}>{tabCounts[tab.id]}</span>
          </button>
        ))}
      </div>

      {/* Active tab description */}
      <p className="text-[10px] text-muted-foreground">{tabs.find(t => t.id === activeTab)?.desc}</p>

      {/* Toolbar */}
      <div className="bg-card rounded-lg border border-border px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..."
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
                <th className="text-left py-2.5 px-2 font-medium text-muted-foreground">Type</th>
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
                return (
                  <tr key={`${item.asset.id}-${item.category}-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="py-2 px-2">
                      <input type="checkbox" checked={selectedRows.has(`${i}`)} onChange={() => toggleRow(`${i}`)} className="rounded" />
                    </td>
                    <td className="py-2 px-2"><SeverityBadge severity={item.severity} /></td>
                    <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">{item.asset.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{item.asset.type}</td>
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
            {activeTab === 'all' ? 'All assets are healthy. No remediation needed.' : `No ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} issues found.`}
          </div>
        )}
      </div>

      {/* Remediation Wizard Modal */}
      <Modal open={!!wizardItem} onClose={() => setWizardItem(null)} title={`${wizardItem?.actionType} — ${wizardItem?.asset.name || ''}`}>
        {wizardItem && <RemediationWizard item={wizardItem} onClose={() => setWizardItem(null)} />}
      </Modal>
    </div>
  );
}
