import React, { useState } from 'react';
import { connectors } from '@/data/mockData';
import { toast } from 'sonner';
import { Search, Eye, EyeOff, Wifi, Link, X, ChevronLeft } from 'lucide-react';
import { Modal } from '@/components/shared/UIComponents';

// Connector metadata for config forms
const connectorMeta: Record<string, { category: string; discovers: string; fields: { label: string; placeholder: string; secret?: boolean }[] }> = {
  'DigiCert': { category: 'PKI & Certificate Authorities', discovers: 'Certificates · 3 asset types', fields: [{ label: 'API Key', placeholder: 'dc-api-...', secret: true }, { label: 'Account ID', placeholder: '123456' }] },
  'Entrust': { category: 'PKI & Certificate Authorities', discovers: 'Certificates · 2 asset types', fields: [{ label: 'API Key', placeholder: 'ent-...', secret: true }, { label: 'Organization ID', placeholder: 'org-...' }] },
  'MSCA Enterprise': { category: 'Microsoft CA', discovers: 'Certificates · Internal PKI', fields: [{ label: 'Server URL', placeholder: 'https://ca.corp.local/certsrv' }, { label: 'Username', placeholder: 'DOMAIN\\admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  "Let's Encrypt": { category: 'ACME CA', discovers: 'Certificates · ACME managed', fields: [{ label: 'ACME Directory URL', placeholder: 'https://acme-v02.api.letsencrypt.org/directory' }, { label: 'Account Email', placeholder: 'admin@acmecorp.com' }] },
  'GlobalSign': { category: 'PKI & Certificate Authorities', discovers: 'Certificates · 2 asset types', fields: [{ label: 'API Key', placeholder: 'gs-api-...', secret: true }, { label: 'API Secret', placeholder: '••••••••', secret: true }] },
  'AWS ACM': { category: 'Cloud / KMS', discovers: 'Certificates · Keys · Secrets', fields: [{ label: 'Access Key ID', placeholder: 'AKIA...', secret: true }, { label: 'Secret Access Key', placeholder: '••••••••', secret: true }, { label: 'Region', placeholder: 'us-east-1' }] },
  'Azure Key Vault': { category: 'Cloud / KMS', discovers: 'Certificates · Keys · Secrets', fields: [{ label: 'Tenant ID', placeholder: '...' }, { label: 'Client ID', placeholder: '...' }, { label: 'Client Secret', placeholder: '••••••••', secret: true }, { label: 'Vault URL', placeholder: 'https://myvault.vault.azure.net' }] },
  'GCP CAS': { category: 'Cloud / KMS', discovers: 'Certificates · Keys', fields: [{ label: 'Service Account JSON', placeholder: '{ "type": "service_account", ... }', secret: true }, { label: 'Project ID', placeholder: 'my-project' }] },
  'HashiCorp Vault': { category: 'Secrets Management', discovers: 'Certificates · Keys · Secrets', fields: [{ label: 'Vault URL', placeholder: 'https://vault.corp.local:8200' }, { label: 'Token', placeholder: 'hvs.CAESI...', secret: true }, { label: 'Namespace', placeholder: 'admin' }] },
  'ServiceNow': { category: 'ITSM / Ticketing', discovers: 'Ticket sync', fields: [{ label: 'Instance URL', placeholder: 'https://acmecorp.service-now.com' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Jira': { category: 'ITSM / Ticketing', discovers: 'Ticket sync', fields: [{ label: 'Instance URL', placeholder: 'https://acmecorp.atlassian.net' }, { label: 'Email', placeholder: 'admin@acmecorp.com' }, { label: 'API Token', placeholder: '••••••••', secret: true }] },
  'PagerDuty': { category: 'ITSM / Ticketing', discovers: 'Alert routing', fields: [{ label: 'API Key', placeholder: 'u+...', secret: true }, { label: 'Service ID', placeholder: 'P...' }] },
  'Slack': { category: 'ITSM / Ticketing', discovers: 'Notifications', fields: [{ label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', secret: true }, { label: 'Channel', placeholder: '#security-alerts' }] },
  'F5 BIG-IP': { category: 'Infrastructure / ADC', discovers: 'Certificates · VIPs', fields: [{ label: 'Management IP', placeholder: '10.0.1.50' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'NGINX': { category: 'Infrastructure / ADC', discovers: 'Certificates · Endpoints', fields: [{ label: 'API Endpoint', placeholder: 'https://nginx-controller.local/api' }, { label: 'API Key', placeholder: '••••••••', secret: true }] },
  'Kubernetes API': { category: 'DevOps / CI-CD', discovers: 'Certificates · Secrets · ConfigMaps', fields: [{ label: 'API Server URL', placeholder: 'https://k8s-api.corp.local:6443' }, { label: 'Service Account Token', placeholder: 'eyJhbGci...', secret: true }, { label: 'Namespace', placeholder: 'default' }] },
  'Thales Luna': { category: 'HSM', discovers: 'Keys · Certificates', fields: [{ label: 'HSM Address', placeholder: '10.0.5.100' }, { label: 'Partition', placeholder: 'par-prod-01' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
};

// Fallback for connectors without specific metadata
function getConnectorMeta(name: string) {
  return connectorMeta[name] || { category: 'Integration', discovers: 'Assets', fields: [{ label: 'API Key', placeholder: '••••••••', secret: true }, { label: 'Endpoint URL', placeholder: 'https://...' }] };
}

interface ConnectorItem { name: string; status: string; lastSync: string; assets: number; color?: string }

function ConnectorConfigModal({ item, open, onClose }: { item: ConnectorItem | null; open: boolean; onClose: () => void }) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(1); // 1 = config, 2 = testing, 3 = done

  if (!open || !item) return null;

  const meta = getConnectorMeta(item.name);
  const isConnected = item.status === 'connected';

  const handleTest = () => {
    setStep(2);
    setTimeout(() => {
      setStep(3);
      toast.success(`Connection to ${item.name} verified successfully`);
    }, 1500);
  };

  const handleSave = () => {
    toast.success(`${item.name} ${isConnected ? 'configuration updated' : 'connected'} successfully`);
    onClose();
    setStep(1);
    setFieldValues({});
  };

  const handleDisconnect = () => {
    toast.info(`${item.name} disconnected`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-[480px] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-5 h-1.5 rounded-full ${s <= step ? 'bg-teal' : 'bg-muted'}`} />
            ))}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Connector info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Link className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{meta.category}</p>
            </div>
          </div>

          {/* Discovers section */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Discovers</p>
            <p className="text-xs text-foreground">{meta.discovers}</p>
          </div>

          {/* Config fields */}
          <div className="space-y-3">
            {meta.fields.map(field => (
              <div key={field.label}>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {field.label} <span className="text-coral">*</span>
                </label>
                <div className="relative">
                  <input
                    type={field.secret && !visibleSecrets[field.label] ? 'password' : 'text'}
                    value={fieldValues[field.label] || (isConnected && field.secret ? '••••••••' : '')}
                    onChange={e => setFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal placeholder:text-muted-foreground/50"
                  />
                  {field.secret && (
                    <button
                      onClick={() => setVisibleSecrets(prev => ({ ...prev, [field.label]: !prev[field.label] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {visibleSecrets[field.label] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status message */}
          {step === 2 && (
            <div className="flex items-center gap-2 text-xs text-amber">
              <div className="w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />
              Testing connection...
            </div>
          )}
          {step === 3 && (
            <div className="flex items-center gap-2 text-xs text-teal">
              <div className="w-2 h-2 rounded-full bg-teal" />
              Connection verified successfully
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleTest}
              disabled={step === 2}
              className="flex items-center gap-1.5 px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Wifi className="w-3.5 h-3.5" />
              Test
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal-light transition-colors"
            >
              <Link className="w-3.5 h-3.5" />
              {isConnected ? 'Save Changes' : 'Save & Connect'}
            </button>
          </div>

          {/* Disconnect for connected integrations */}
          {isConnected && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-muted-foreground">Last sync: {item.lastSync}</p>
                  {item.assets > 0 && <p className="text-muted-foreground">{item.assets.toLocaleString()} assets discovered</p>}
                </div>
                <button onClick={handleDisconnect} className="text-coral hover:underline text-xs">
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorItem | null>(null);

  const categories = {
    'Certificate Authorities': connectors.ca,
    'Cloud / KMS': connectors.cloud,
    'ITSM / Ticketing': connectors.itsm,
    'Infrastructure / ADC': connectors.infrastructure,
    'DevOps / CI-CD': connectors.devops,
    'HSM': connectors.hsm,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Integrations</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
      </div>

      {Object.entries(categories).map(([category, items]) => {
        const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;
        if (filtered.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-3">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(item => (
                <div key={item.name} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'connected' ? 'bg-teal' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">Last sync: {item.lastSync}{item.assets > 0 ? ` · ${item.assets.toLocaleString()} assets` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedConnector(item)}
                    className={`text-[10px] px-2 py-1 rounded ${item.status === 'connected' ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-teal text-primary-foreground hover:bg-teal-light'}`}>
                    {item.status === 'connected' ? 'Configure' : '+ Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <ConnectorConfigModal item={selectedConnector} open={!!selectedConnector} onClose={() => setSelectedConnector(null)} />
    </div>
  );
}
