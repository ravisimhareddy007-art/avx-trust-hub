import React, { useState } from 'react';
import { X, Key, Server, Shield, Cpu, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryRegistry, type ManualIdentity, type ManualITAsset } from '@/context/InventoryRegistryContext';
import type { CryptoAsset } from '@/data/mockData';
import type { ITAsset } from '@/data/inventoryMockData';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select the form when opened from a context-specific button. */
  initialKind?: 'identity' | 'infrastructure';
}

type Kind = 'identity' | 'infrastructure' | null;

const OWNER_TEAMS = [
  'Payments Engineering', 'Platform Engineering', 'Infrastructure', 'Security Operations',
  'DevOps', 'Database Operations', 'Identity & Access', 'AI Engineering', 'IT Operations',
  'Site Reliability', 'Unassigned',
];

const ALGORITHMS_BY_TYPE: Record<string, { algorithm: string; sizes: string[] }[]> = {
  'TLS Certificate': [
    { algorithm: 'RSA', sizes: ['2048', '3072', '4096'] },
    { algorithm: 'ECDSA', sizes: ['P-256', 'P-384', 'P-521'] },
    { algorithm: 'Ed25519', sizes: ['256'] },
    { algorithm: 'ML-KEM', sizes: ['512', '768', '1024'] },
  ],
  'SSH Key': [
    { algorithm: 'RSA', sizes: ['2048', '4096'] },
    { algorithm: 'ECDSA', sizes: ['P-256', 'P-384'] },
    { algorithm: 'Ed25519', sizes: ['256'] },
  ],
  'API Token': [
    { algorithm: 'HMAC-SHA256', sizes: ['256'] },
    { algorithm: 'HMAC-SHA512', sizes: ['512'] },
    { algorithm: 'JWT-RS256', sizes: ['2048'] },
  ],
  'AI Agent Identity': [
    { algorithm: 'HMAC-SHA256', sizes: ['256'] },
    { algorithm: 'OAuth2-Bearer', sizes: ['n/a'] },
  ],
};

// Maps the modal's Object Type to the canonical CryptoAsset.type.
const IDENTITY_TYPE_MAP: Record<string, CryptoAsset['type']> = {
  'TLS Certificate': 'TLS Certificate',
  'SSH Key': 'SSH Key',
  'API Token': 'API Key / Secret',
  'AI Agent Identity': 'AI Agent Token',
};

const ASSET_TYPE_MAP: Record<string, ITAsset['type']> = {
  'Linux Host': 'Application Server',
  'Windows Server': 'Application Server',
  'K8s Cluster': 'K8s Cluster',
  'AWS Account': 'API Gateway', // closest semantic match in existing enum
};

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-medium text-muted-foreground mb-1">
        {label} {required && <span className="text-coral">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full px-2.5 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal placeholder:text-muted-foreground/60';

export default function AddResourceModal({ open, onClose, initialKind }: Props) {
  const [kind, setKind] = useState<Kind>(initialKind ?? null);
  const { addIdentity, addITAsset } = useInventoryRegistry();

  // Identity form state
  const [iType, setIType] = useState<keyof typeof ALGORITHMS_BY_TYPE>('TLS Certificate');
  const [iName, setIName] = useState('');
  const [iAlg, setIAlg] = useState('RSA');
  const [iKeySize, setIKeySize] = useState('2048');
  const [iLocation, setILocation] = useState('');
  const [iOwner, setIOwner] = useState('Unassigned');

  // Infrastructure form state
  const [aType, setAType] = useState<keyof typeof ASSET_TYPE_MAP>('Linux Host');
  const [aAddress, setAAddress] = useState('');
  const [aEnv, setAEnv] = useState<'Production' | 'Staging' | 'Development'>('Production');
  const [aLocation, setALocation] = useState('');

  const reset = () => {
    setKind(initialKind ?? null);
    setIName(''); setILocation(''); setIOwner('Unassigned'); setIType('TLS Certificate'); setIAlg('RSA'); setIKeySize('2048');
    setAAddress(''); setALocation(''); setAType('Linux Host'); setAEnv('Production');
  };

  if (!open) return null;

  const close = () => { reset(); onClose(); };

  const submitIdentity = () => {
    if (!iName.trim()) { toast.error('Common Name is required'); return; }
    if (!iAlg || !iKeySize) { toast.error('Algorithm and key size are required'); return; }

    const canonicalType = IDENTITY_TYPE_MAP[iType];
    const id = `manual-id-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const identity: ManualIdentity = {
      id,
      name: iName.trim(),
      type: canonicalType,
      commonName: iName.trim(),
      caIssuer: 'Manual Entry',
      algorithm: iAlg === 'RSA' || iAlg === 'ECDSA' ? `${iAlg}-${iKeySize}` : iAlg,
      keyLength: iKeySize,
      serial: `MANUAL-${id.slice(-8).toUpperCase()}`,
      owner: iOwner,
      team: iOwner === 'Unassigned' ? 'Unassigned' : iOwner,
      application: 'Manually registered',
      environment: 'Production',
      infrastructure: iLocation.trim() || 'unknown',
      discoverySource: 'Manual Entry',
      issueDate: today,
      expiryDate: 'N/A',
      daysToExpiry: 365,
      lastRotated: today,
      autoRenewal: false,
      rotationFrequency: 'Manual',
      status: 'Active',
      pqcRisk: iAlg === 'RSA' || iAlg === 'ECDSA' ? 'High' : 'Low',
      policyViolations: 0,
      dependencyCount: 0,
      tags: ['manual-entry'],
      discoveryVector: 'Manual Entry',
    };

    const matched = addIdentity(identity);

    toast.success(`Resource "${identity.name}" successfully registered in Inventory`, {
      description: matched.length
        ? `Auto-added to ${matched.length} dynamic group${matched.length > 1 ? 's' : ''}: ${matched.map(m => m.groupName).join(', ')}`
        : 'Discovery Vector: Manual Entry',
    });
    close();
  };

  const submitInfra = () => {
    if (!aAddress.trim()) { toast.error('Address (FQDN/IP) is required'); return; }

    const canonicalType = ASSET_TYPE_MAP[aType];
    const id = `manual-it-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const asset: ManualITAsset = {
      id,
      name: aAddress.trim(),
      type: canonicalType,
      environment: aEnv,
      ownerTeam: 'Unassigned',
      cryptoObjectIds: [],
      riskScore: 0,
      criticalViolations: 0,
      policyCoverage: 0,
      lastSeen: today,
      managedBy: 'Manual',
      infrastructure: aLocation.trim() || 'unknown',
      application: aType,
      discoveryVector: 'Manual Entry',
    };

    addITAsset(asset);
    toast.success(`Resource "${asset.name}" successfully registered in Inventory`, {
      description: 'Discovery Vector: Manual Entry · awaiting identity association',
    });
    close();
  };

  // Step 1 — chooser
  if (kind === null) {
    return (
      <ModalShell onClose={close} title="What are you adding?" subtitle="Manually register a resource that discovery hasn't picked up yet.">
        <div className="grid grid-cols-2 gap-3 p-5">
          <ChooserCard
            icon={<Key className="w-5 h-5 text-teal" />}
            title="Identity Object"
            description="Certificates, SSH keys, API tokens, AI agent identities."
            onClick={() => setKind('identity')}
          />
          <ChooserCard
            icon={<Server className="w-5 h-5 text-purple-light" />}
            title="Infrastructure Asset"
            description="Servers, K8s clusters, cloud accounts, gateways."
            onClick={() => setKind('infrastructure')}
          />
        </div>
        <div className="px-5 pb-4 text-[10px] text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-teal" />
          Items added here are tagged <span className="font-mono text-foreground">Discovery Vector: Manual Entry</span> so future scans can merge — not duplicate.
        </div>
      </ModalShell>
    );
  }

  // Step 2a — identity form
  if (kind === 'identity') {
    const algGroups = ALGORITHMS_BY_TYPE[iType];
    const sizes = algGroups.find(a => a.algorithm === iAlg)?.sizes ?? [];

    return (
      <ModalShell onClose={close} title="Add Identity Object" subtitle="Common attributes for cryptographic objects." onBack={!initialKind ? () => setKind(null) : undefined}>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Object Type" required>
              <select value={iType} onChange={e => {
                const next = e.target.value as keyof typeof ALGORITHMS_BY_TYPE;
                setIType(next);
                const first = ALGORITHMS_BY_TYPE[next][0];
                setIAlg(first.algorithm);
                setIKeySize(first.sizes[0]);
              }} className={inputCls}>
                {Object.keys(ALGORITHMS_BY_TYPE).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Common Name / Identifier" required>
              <input value={iName} onChange={e => setIName(e.target.value)} placeholder="*.app.acmecorp.com" className={inputCls} />
            </FormRow>
            <FormRow label="Algorithm" required>
              <select value={iAlg} onChange={e => {
                setIAlg(e.target.value);
                const next = algGroups.find(a => a.algorithm === e.target.value);
                if (next) setIKeySize(next.sizes[0]);
              }} className={inputCls}>
                {algGroups.map(a => <option key={a.algorithm} value={a.algorithm}>{a.algorithm}</option>)}
              </select>
            </FormRow>
            <FormRow label="Key Size / Curve" required>
              <select value={iKeySize} onChange={e => setIKeySize(e.target.value)} className={inputCls}>
                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>
            <FormRow label="Source / Location">
              <input value={iLocation} onChange={e => setILocation(e.target.value)} placeholder="/etc/ssl/certs/app.pem or vault://kv/app" className={inputCls} />
            </FormRow>
            <FormRow label="Ownership">
              <select value={iOwner} onChange={e => setIOwner(e.target.value)} className={inputCls}>
                {OWNER_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
          </div>

          <SourceFactCard />
        </div>
        <Footer onCancel={close} onSubmit={submitIdentity} submitLabel="Save Identity" />
      </ModalShell>
    );
  }

  // Step 2b — infrastructure form
  return (
    <ModalShell onClose={close} title="Add Infrastructure Asset" subtitle="Register a host, cluster, or cloud account." onBack={!initialKind ? () => setKind(null) : undefined}>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Asset Type" required>
            <select value={aType} onChange={e => setAType(e.target.value as keyof typeof ASSET_TYPE_MAP)} className={inputCls}>
              {Object.keys(ASSET_TYPE_MAP).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="Address (FQDN or IP)" required>
            <input value={aAddress} onChange={e => setAAddress(e.target.value)} placeholder="prod-app-07.internal" className={inputCls} />
          </FormRow>
          <FormRow label="Environment" required>
            <select value={aEnv} onChange={e => setAEnv(e.target.value as 'Production' | 'Staging' | 'Development')} className={inputCls}>
              {['Production', 'Staging', 'Development'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </FormRow>
          <FormRow label="Location / Region">
            <input value={aLocation} onChange={e => setALocation(e.target.value)} placeholder="us-east-1 / on-prem-dc1" className={inputCls} />
          </FormRow>
        </div>

        <SourceFactCard />
      </div>
      <Footer onCancel={close} onSubmit={submitInfra} submitLabel="Save Asset" />
    </ModalShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function ModalShell({
  onClose, onBack, title, subtitle, children,
}: { onClose: () => void; onBack?: () => void; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start gap-2">
            {onBack && (
              <button onClick={onBack} className="mt-0.5 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChooserCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-4 rounded-lg border border-border hover:border-teal/60 hover:bg-secondary/40 transition-all group">
      <div className="w-9 h-9 rounded-md bg-secondary/60 flex items-center justify-center mb-3 group-hover:bg-secondary">{icon}</div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
    </button>
  );
}

function SourceFactCard() {
  return (
    <div className="rounded-md border border-teal/20 bg-teal/5 px-3 py-2 flex items-start gap-2 mt-2">
      <Cpu className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
      <p className="text-[10.5px] text-muted-foreground leading-snug">
        <span className="text-foreground font-medium">Discovery Vector: Manual Entry</span> · If discovery later finds the same resource (eBPF, API, CT log) it will be merged with this record — no duplicates.
      </p>
    </div>
  );
}

function Footer({ onCancel, onSubmit, submitLabel }: { onCancel: () => void; onSubmit: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-secondary/20">
      <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">Cancel</button>
      <button onClick={onSubmit} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-teal text-primary-foreground hover:bg-teal-light">{submitLabel}</button>
    </div>
  );
}
