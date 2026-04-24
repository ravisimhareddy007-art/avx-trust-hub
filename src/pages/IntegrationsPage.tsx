import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Eye,
  EyeOff,
  X,
  Shield,
  Cloud,
  Lock,
  Cpu,
  Ticket,
  Bell,
  GitBranch,
  Server,
  CheckCircle2,
} from 'lucide-react';

const INTEGRATIONS: {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
  fields: { label: string; placeholder: string; secret?: boolean }[];
}[] = [
  // ── Certificate Authorities ──
  {
    id: 'digicert',
    name: 'DigiCert',
    category: 'Certificate Authorities',
    description: 'Public CA for TLS, code-signing, and S/MIME certificates.',
    connected: true,
    fields: [
      { label: 'API Key', placeholder: 'dc-api-...', secret: true },
      { label: 'Account ID', placeholder: '123456' },
    ],
  },
  {
    id: 'entrust',
    name: 'Entrust',
    category: 'Certificate Authorities',
    description: 'Enterprise CA for TLS and identity certificates.',
    connected: true,
    fields: [
      { label: 'API Key', placeholder: 'ent-...', secret: true },
      { label: 'Organization ID', placeholder: 'org-...' },
    ],
  },
  {
    id: 'msca',
    name: 'Microsoft CA (ADCS)',
    category: 'Certificate Authorities',
    description: 'Internal Microsoft Certificate Authority via ADCS.',
    connected: true,
    fields: [
      { label: 'Server URL', placeholder: 'https://ca.corp.local/certsrv' },
      { label: 'Username', placeholder: 'DOMAIN\\admin' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'letsencrypt',
    name: "Let's Encrypt",
    category: 'Certificate Authorities',
    description: 'Free, automated TLS certificates via ACME.',
    connected: false,
    fields: [
      { label: 'ACME Directory URL', placeholder: 'https://acme-v02.api.letsencrypt.org/directory' },
      { label: 'Account Email', placeholder: 'admin@acmecorp.com' },
    ],
  },
  {
    id: 'globalsign',
    name: 'GlobalSign',
    category: 'Certificate Authorities',
    description: 'Global CA for enterprise TLS and document signing.',
    connected: false,
    fields: [
      { label: 'API Key', placeholder: 'gs-api-...', secret: true },
      { label: 'Account ID', placeholder: 'acct-...' },
    ],
  },
  {
    id: 'sectigo',
    name: 'Sectigo',
    category: 'Certificate Authorities',
    description: 'Enterprise CA supporting TLS, S/MIME, and code-signing.',
    connected: false,
    fields: [
      { label: 'Customer URI', placeholder: 'https://hard.cert-manager.com' },
      { label: 'Login', placeholder: 'admin@acmecorp.com' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'appviewx-ca',
    name: 'AppViewX CA',
    category: 'Certificate Authorities',
    description: 'Internal CA powered by AppViewX for private PKI issuance.',
    connected: false,
    fields: [
      { label: 'CA URL', placeholder: 'https://ca.appviewx.local' },
      { label: 'API Key', placeholder: 'avx-...', secret: true },
    ],
  },

  // ── Cloud Platforms ──
  {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'Cloud Platforms',
    description: 'ACM certificates, KMS keys, and Secrets Manager.',
    connected: true,
    fields: [
      { label: 'Access Key ID', placeholder: 'AKIA...', secret: true },
      { label: 'Secret Access Key', placeholder: '••••••••', secret: true },
      { label: 'Region', placeholder: 'us-east-1' },
    ],
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    category: 'Cloud Platforms',
    description: 'Key Vault, managed certificates, and Azure AD.',
    connected: true,
    fields: [
      { label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { label: 'Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { label: 'Client Secret', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    category: 'Cloud Platforms',
    description: 'Certificate Authority Service and Cloud KMS.',
    connected: false,
    fields: [
      { label: 'Service Account JSON', placeholder: '{ "type": "service_account", ... }', secret: true },
      { label: 'Project ID', placeholder: 'my-project-id' },
    ],
  },

  // ── Secrets & Vaults ──
  {
    id: 'hashicorp',
    name: 'HashiCorp Vault',
    category: 'Secrets & Vaults',
    description: 'Centralized secrets management and PKI engine.',
    connected: true,
    fields: [
      { label: 'Vault URL', placeholder: 'https://vault.corp.local:8200' },
      { label: 'Token', placeholder: 'hvs.CAESI...', secret: true },
      { label: 'Namespace', placeholder: 'admin (optional)' },
    ],
  },
  {
    id: 'cyberark',
    name: 'CyberArk Conjur',
    category: 'Secrets & Vaults',
    description: 'Privileged access and secrets management for DevOps.',
    connected: false,
    fields: [
      { label: 'Conjur URL', placeholder: 'https://conjur.corp.local' },
      { label: 'Account', placeholder: 'myorg' },
      { label: 'API Key', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'gcp-secrets',
    name: 'GCP Secret Manager',
    category: 'Secrets & Vaults',
    description: 'Managed secrets storage on Google Cloud.',
    connected: false,
    fields: [
      { label: 'Project ID', placeholder: 'my-project-id' },
      { label: 'Service Account JSON', placeholder: '{ "type": "service_account" }', secret: true },
    ],
  },

  // ── HSM ──
  {
    id: 'thales',
    name: 'Thales Luna HSM',
    category: 'HSM',
    description: 'FIPS 140-2 hardware security module for key custody.',
    connected: false,
    fields: [
      { label: 'HSM Address', placeholder: '10.0.5.100' },
      { label: 'Partition', placeholder: 'par-prod-01' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'entrust-hsm',
    name: 'Entrust nShield',
    category: 'HSM',
    description: 'Network-attached HSM for high-assurance cryptography.',
    connected: false,
    fields: [
      { label: 'nShield Host', placeholder: '10.0.5.200' },
      { label: 'OCS Password', placeholder: '••••••••', secret: true },
    ],
  },

  // ── ITSM & Ticketing ──
  {
    id: 'servicenow',
    name: 'ServiceNow',
    category: 'ITSM & Ticketing',
    description: 'Change requests, CMDB sync, and incident management.',
    connected: true,
    fields: [
      { label: 'Instance URL', placeholder: 'https://acmecorp.service-now.com' },
      { label: 'Username', placeholder: 'admin' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'ITSM & Ticketing',
    description: 'Issue tracking and project management.',
    connected: false,
    fields: [
      { label: 'Jira URL', placeholder: 'https://acmecorp.atlassian.net' },
      { label: 'Email', placeholder: 'admin@acmecorp.com' },
      { label: 'API Token', placeholder: 'ATATT3...', secret: true },
    ],
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    category: 'ITSM & Ticketing',
    description: 'Incident alerting and on-call management.',
    connected: false,
    fields: [{ label: 'Integration Key', placeholder: 'pd-int-...', secret: true }],
  },

  // ── Notifications ──
  {
    id: 'slack',
    name: 'Slack',
    category: 'Notifications',
    description: 'Send alerts and workflow notifications to Slack channels.',
    connected: true,
    fields: [
      { label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', secret: true },
      { label: 'Default Channel', placeholder: '#security-alerts' },
    ],
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'Notifications',
    description: 'Send alerts to Teams channels via webhook.',
    connected: false,
    fields: [{ label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', secret: true }],
  },
  {
    id: 'email',
    name: 'Email (SMTP)',
    category: 'Notifications',
    description: 'Send notifications via your SMTP mail server.',
    connected: false,
    fields: [
      { label: 'SMTP Host', placeholder: 'smtp.acmecorp.com' },
      { label: 'Port', placeholder: '587' },
      { label: 'Username', placeholder: 'noreply@acmecorp.com' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },

  // ── DevOps & CI/CD ──
  {
    id: 'github',
    name: 'GitHub',
    category: 'DevOps & CI/CD',
    description: 'Discover SSH keys and secrets in repositories and Actions.',
    connected: false,
    fields: [
      { label: 'Personal Access Token', placeholder: 'ghp_...', secret: true },
      { label: 'Organization', placeholder: 'acmecorp' },
    ],
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    category: 'DevOps & CI/CD',
    description: 'Discover credentials and certificates used in pipelines.',
    connected: false,
    fields: [
      { label: 'Jenkins URL', placeholder: 'https://jenkins.corp.local' },
      { label: 'Username', placeholder: 'admin' },
      { label: 'API Token', placeholder: '...', secret: true },
    ],
  },

  // ── Load Balancers & ADC ──
  {
    id: 'f5',
    name: 'F5 BIG-IP',
    category: 'Load Balancers & ADC',
    description: 'Discover and manage TLS certificates on F5 virtual servers.',
    connected: true,
    fields: [
      { label: 'Host / IP', placeholder: '10.0.1.50' },
      { label: 'Username', placeholder: 'admin' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'citrix',
    name: 'Citrix ADC',
    category: 'Load Balancers & ADC',
    description: 'Discover SSL certificates on Citrix NetScaler.',
    connected: false,
    fields: [
      { label: 'NSIP', placeholder: '10.0.1.100' },
      { label: 'Username', placeholder: 'nsroot' },
      { label: 'Password', placeholder: '••••••••', secret: true },
    ],
  },
];

const CATEGORIES = [
  'Certificate Authorities',
  'Cloud Platforms',
  'Secrets & Vaults',
  'HSM',
  'ITSM & Ticketing',
  'Notifications',
  'DevOps & CI/CD',
  'Load Balancers & ADC',
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Certificate Authorities': Shield,
  'Cloud Platforms': Cloud,
  'Secrets & Vaults': Lock,
  HSM: Cpu,
  'ITSM & Ticketing': Ticket,
  Notifications: Bell,
  'DevOps & CI/CD': GitBranch,
  'Load Balancers & ADC': Server,
};

const LAST_SYNC: Record<string, string> = {
  digicert: '15 min ago',
  entrust: '30 min ago',
  msca: '1 hour ago',
  aws: '5 min ago',
  azure: '12 min ago',
  hashicorp: '3 min ago',
  servicenow: '45 min ago',
  slack: '2 min ago',
  f5: '1 hour ago',
};

type ITab = 'ecosystem' | 'connected';

export default function IntegrationsPage() {
  const [itab, setItab] = useState<ITab>('ecosystem');
  const [search, setSearch] = useState('');
  const [configItem, setConfigItem] = useState<typeof INTEGRATIONS[0] | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [connections, setConnections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, i.connected])),
  );

  const filtered = INTEGRATIONS.filter(
    i =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()),
  );

  const ecosystemItems = filtered.filter(i => !connections[i.id]);
  const connectedItems = filtered.filter(i => connections[i.id]);
  const totalConnected = INTEGRATIONS.filter(i => connections[i.id]).length;

  const openConfig = (item: typeof INTEGRATIONS[0]) => {
    setConfigItem(item);
    setFieldValues({});
    setShowSecrets({});
  };

  const renderCategoryHeader = (cat: string, items: typeof INTEGRATIONS) => {
    const Icon = CATEGORY_ICONS[cat];
    const connectedCount = items.filter(i => connections[i.id]).length;
    return (
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {cat}
        </span>
        {connectedCount > 0 && (
          <span className="bg-teal/10 text-teal text-[9px] px-2 py-0.5 rounded-full">
            {connectedCount} connected
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-baseline">
          <span className="text-xl font-semibold text-foreground">Integrations</span>
          <span className="text-xs text-muted-foreground ml-2">
            {totalConnected} connected
          </span>
        </div>
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5 flex-shrink-0 gap-0">
        <button
          onClick={() => setItab('ecosystem')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            itab === 'ecosystem'
              ? 'border-teal text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Ecosystem
          <span className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded-full ml-2">
            {ecosystemItems.length} available
          </span>
        </button>
        <button
          onClick={() => setItab('connected')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            itab === 'connected'
              ? 'border-teal text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Connected
          <span className="bg-teal/10 text-teal text-[9px] px-1.5 py-0.5 rounded-full">
            {connectedItems.length}
          </span>
        </button>
      </div>

      {/* Ecosystem Tab */}
      {itab === 'ecosystem' && (
        <div className="overflow-y-auto flex-1 space-y-8">
          {ecosystemItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <CheckCircle2 className="text-teal w-8 h-8" />
              <div className="text-sm text-foreground">All integrations connected</div>
              <div className="text-xs text-muted-foreground text-center max-w-sm">
                Your environment is fully integrated. Manage connections in the Connected tab.
              </div>
            </div>
          ) : (
            CATEGORIES.map(cat => {
              const items = ecosystemItems.filter(i => i.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  {renderCategoryHeader(cat, items)}
                <div className="grid grid-cols-4 gap-3">
                  {items.map(i => {
                    const isConnected = connections[i.id];
                    return (
                      <div
                        key={i.id}
                        className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-teal/30 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-semibold text-foreground">{i.name}</span>
                          {isConnected ? (
                            <span className="text-[9px] text-teal flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                              Connected
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">Not connected</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                          {i.description}
                        </p>
                        <span className="text-[9px] bg-muted px-2 py-0.5 rounded text-muted-foreground self-start">
                          {i.category}
                        </span>
                        <div className="mt-auto pt-1">
                          {isConnected ? (
                            <button
                              onClick={() => openConfig(i)}
                              className="border border-border text-[10px] px-3 py-1.5 rounded-lg w-full hover:bg-muted/30 transition-colors text-foreground"
                            >
                              Configure →
                            </button>
                          ) : (
                            <button
                              onClick={() => openConfig(i)}
                              className="bg-teal text-white text-[10px] px-3 py-1.5 rounded-lg w-full hover:bg-teal/90 transition-colors font-medium"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
          )}
        </div>
      )}

      {/* Connected Tab */}
      {itab === 'connected' && (
        <div className="overflow-y-auto flex-1">
          {connectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-1">
              <div className="text-sm text-muted-foreground">No connections yet</div>
              <div className="text-xs text-muted-foreground">
                Connect your first integration from the Ecosystem tab.
              </div>
            </div>
          ) : (
            CATEGORIES.map(cat => {
              const items = connectedItems.filter(i => i.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-6">
                  {renderCategoryHeader(cat, items)}
                  <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/30 border-b border-border text-[10px] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Name</th>
                          <th className="px-4 py-2 text-left font-medium">Category</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                          <th className="px-4 py-2 text-left font-medium">Last Sync</th>
                          <th className="px-4 py-2 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(i => (
                          <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                            <td className="px-4 py-3 font-medium text-foreground">{i.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{i.category}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-teal text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                                Healthy
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {LAST_SYNC[i.id] || '1 day ago'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openConfig(i)}
                                  className="border border-border text-[10px] px-2 py-1 rounded hover:bg-muted/30 text-foreground"
                                >
                                  Configure
                                </button>
                                <button
                                  onClick={() => {
                                    setConnections(p => ({ ...p, [i.id]: false }));
                                    toast.success(`${i.name} disconnected`);
                                  }}
                                  className="text-[10px] text-coral/70 hover:text-coral px-2 py-1 rounded"
                                >
                                  Disconnect
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Configure Modal */}
      {configItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfigItem(null)}
          />
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md z-10 flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm font-semibold text-foreground">{configItem.name}</span>
                <span className="text-[9px] bg-muted px-2 py-0.5 rounded ml-2 text-muted-foreground">
                  {configItem.category}
                </span>
              </div>
              <button
                onClick={() => setConfigItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-[11px] text-muted-foreground mb-2">{configItem.description}</p>

              <div className="flex items-center gap-2 py-2 border-b border-border">
                {connections[configItem.id] ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                    <span className="text-[11px] text-teal">Currently connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Not connected</span>
                  </>
                )}
              </div>

              <div className="space-y-3">
                {configItem.fields.map(field => (
                  <div key={field.label}>
                    <div className="text-[11px] font-medium mb-1 text-foreground">{field.label}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type={field.secret && !showSecrets[field.label] ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        value={fieldValues[field.label] || ''}
                        onChange={e =>
                          setFieldValues(p => ({ ...p, [field.label]: e.target.value }))
                        }
                        className="flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecrets(p => ({ ...p, [field.label]: !p[field.label] }))
                          }
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          {showSecrets[field.label] ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-2 justify-end flex-shrink-0">
              {connections[configItem.id] && (
                <button
                  onClick={() => {
                    setConnections(p => ({ ...p, [configItem.id]: false }));
                    toast.success(`${configItem.name} disconnected`);
                    setConfigItem(null);
                  }}
                  className="text-[11px] text-coral/70 hover:text-coral px-3 py-1.5 rounded-lg mr-auto"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={() => setConfigItem(null)}
                className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground"
              >
                Cancel
              </button>
              {connections[configItem.id] ? (
                <button
                  onClick={() => {
                    toast.success(`${configItem.name} configuration saved`);
                    setConfigItem(null);
                  }}
                  className="bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium"
                >
                  Save Changes
                </button>
              ) : (
                <button
                  onClick={() => {
                    setConnections(p => ({ ...p, [configItem.id]: true }));
                    toast.success(`${configItem.name} connected successfully`);
                    setConfigItem(null);
                    setItab('connected');
                  }}
                  className="bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
