import React, { useState } from 'react';
import { connectors } from '@/data/mockData';
import { toast } from 'sonner';
import { Search, Eye, EyeOff, Wifi, Link, X, ChevronLeft } from 'lucide-react';

// Connector metadata for config forms
const connectorMeta: Record<string, { discovers: string; fields: { label: string; placeholder: string; secret?: boolean }[] }> = {
  'DigiCert': { discovers: 'Certificates · 3 asset types', fields: [{ label: 'API Key', placeholder: 'dc-api-...', secret: true }, { label: 'Account ID', placeholder: '123456' }] },
  'Entrust': { discovers: 'Certificates · 2 asset types', fields: [{ label: 'API Key', placeholder: 'ent-...', secret: true }, { label: 'Organization ID', placeholder: 'org-...' }] },
  'MSCA Enterprise': { discovers: 'Certificates · Internal PKI', fields: [{ label: 'Server URL', placeholder: 'https://ca.corp.local/certsrv' }, { label: 'Username', placeholder: 'DOMAIN\\admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  "Let's Encrypt": { discovers: 'Certificates · ACME managed', fields: [{ label: 'ACME Directory URL', placeholder: 'https://acme-v02.api.letsencrypt.org/directory' }, { label: 'Account Email', placeholder: 'admin@acmecorp.com' }] },
  'GlobalSign': { discovers: 'Certificates', fields: [{ label: 'API Key', placeholder: 'gs-api-...', secret: true }, { label: 'API Secret', placeholder: '••••••••', secret: true }] },
  'Sectigo': { discovers: 'Certificates', fields: [{ label: 'API Login', placeholder: 'admin@org', secret: false }, { label: 'API Password', placeholder: '••••••••', secret: true }, { label: 'Customer URI', placeholder: 'acmecorp' }] },
  'GeoTrust': { discovers: 'Certificates', fields: [{ label: 'Partner Code', placeholder: '...', secret: true }] },
  'GoDaddy': { discovers: 'Certificates', fields: [{ label: 'API Key', placeholder: '...', secret: true }, { label: 'API Secret', placeholder: '••••••••', secret: true }] },
  'InCommon': { discovers: 'Certificates', fields: [{ label: 'Org Name', placeholder: 'University of...' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'Thawte': { discovers: 'Certificates', fields: [{ label: 'Partner Code', placeholder: '...', secret: true }] },
  'Trustwave': { discovers: 'Certificates', fields: [{ label: 'API Endpoint', placeholder: 'https://...' }, { label: 'API Token', placeholder: '...', secret: true }] },
  'QuoVadis': { discovers: 'Certificates', fields: [{ label: 'API Key', placeholder: '...', secret: true }, { label: 'Account ID', placeholder: '...' }] },
  'AppViewX CA': { discovers: 'Certificates · Internal CA', fields: [{ label: 'CA Server URL', placeholder: 'https://ca.avxtrust.com' }, { label: 'Admin Token', placeholder: '...', secret: true }] },
  'AWS': { discovers: 'ACM Certs · KMS Keys · Secrets Manager', fields: [{ label: 'Access Key ID', placeholder: 'AKIA...', secret: true }, { label: 'Secret Access Key', placeholder: '••••••••', secret: true }, { label: 'Region', placeholder: 'us-east-1' }] },
  'Azure': { discovers: 'Key Vault · Managed Certs · WAF Certs', fields: [{ label: 'Tenant ID', placeholder: '...' }, { label: 'Client ID', placeholder: '...' }, { label: 'Client Secret', placeholder: '••••••••', secret: true }] },
  'Google Cloud Platform': { discovers: 'CAS Certs · KMS Keys', fields: [{ label: 'Service Account JSON', placeholder: '{ "type": "service_account" }', secret: true }, { label: 'Project ID', placeholder: 'my-project' }] },
  'Thales Luna': { discovers: 'Keys · Certificates', fields: [{ label: 'HSM Address', placeholder: '10.0.5.100' }, { label: 'Partition', placeholder: 'par-prod-01' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Fortanix': { discovers: 'Keys · Secrets', fields: [{ label: 'API Endpoint', placeholder: 'https://sdkms.fortanix.com' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'nCipher': { discovers: 'Keys', fields: [{ label: 'HSM Address', placeholder: '10.0.5.200' }, { label: 'Operator Card Password', placeholder: '••••••••', secret: true }] },
  'Utimaco': { discovers: 'Keys', fields: [{ label: 'HSM Address', placeholder: '10.0.5.300' }, { label: 'Admin Password', placeholder: '••••••••', secret: true }] },
  'AWS CloudHSM': { discovers: 'Keys', fields: [{ label: 'Cluster ID', placeholder: 'cluster-...' }, { label: 'HSM User', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'CyberArk': { discovers: 'Privileged Accounts · Vaults', fields: [{ label: 'PVWA URL', placeholder: 'https://cyberark.corp.local' }, { label: 'App ID', placeholder: 'AVXTrust' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'BeyondTrust': { discovers: 'Privileged Sessions', fields: [{ label: 'Instance URL', placeholder: 'https://bt.corp.local' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'HashiCorp Vault': { discovers: 'Certificates · Keys · Secrets', fields: [{ label: 'Vault URL', placeholder: 'https://vault.corp.local:8200' }, { label: 'Token', placeholder: 'hvs.CAESI...', secret: true }, { label: 'Namespace', placeholder: 'admin' }] },
  'ServiceNow': { discovers: 'Ticket sync · CMDB', fields: [{ label: 'Instance URL', placeholder: 'https://acmecorp.service-now.com' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'BMC Remedy': { discovers: 'Ticket sync', fields: [{ label: 'Server URL', placeholder: 'https://remedy.corp.local' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'PagerDuty': { discovers: 'Alert routing', fields: [{ label: 'API Key', placeholder: 'u+...', secret: true }, { label: 'Service ID', placeholder: 'P...' }] },
  'Jira': { discovers: 'Ticket sync', fields: [{ label: 'Instance URL', placeholder: 'https://acmecorp.atlassian.net' }, { label: 'Email', placeholder: 'admin@acmecorp.com' }, { label: 'API Token', placeholder: '••••••••', secret: true }] },
  'Slack': { discovers: 'Notifications', fields: [{ label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', secret: true }, { label: 'Channel', placeholder: '#security-alerts' }] },
  'BIND': { discovers: 'DNS Zones · Records', fields: [{ label: 'Server IP', placeholder: '10.0.0.53' }, { label: 'TSIG Key', placeholder: '...', secret: true }] },
  'BlueCat': { discovers: 'DNS · DHCP · IPAM', fields: [{ label: 'API URL', placeholder: 'https://bluecat.corp.local/api' }, { label: 'API Token', placeholder: '...', secret: true }] },
  'Infoblox': { discovers: 'DNS · DHCP · IPAM', fields: [{ label: 'Grid Manager URL', placeholder: 'https://infoblox.corp.local' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'TCPWave': { discovers: 'DNS · IPAM', fields: [{ label: 'API URL', placeholder: 'https://tcpwave.corp.local' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'VitalQIP': { discovers: 'DNS · DHCP', fields: [{ label: 'Server URL', placeholder: 'https://vitalqip.corp.local' }, { label: 'Credentials', placeholder: '...', secret: true }] },
  'Apache': { discovers: 'Certificates · Endpoints', fields: [{ label: 'SSH Host', placeholder: 'web01.corp.local' }, { label: 'SSH Key', placeholder: '~/.ssh/id_rsa', secret: true }, { label: 'Config Path', placeholder: '/etc/apache2/sites-enabled/' }] },
  'IBM WebSphere': { discovers: 'Certificates · Keystores', fields: [{ label: 'Admin Console URL', placeholder: 'https://was.corp.local:9043' }, { label: 'Username', placeholder: 'wasadmin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Microsoft IIS': { discovers: 'Certificates · Bindings', fields: [{ label: 'Server Name', placeholder: 'iis01.corp.local' }, { label: 'WinRM Port', placeholder: '5985' }, { label: 'Credentials', placeholder: 'DOMAIN\\admin', secret: true }] },
  'Oracle WebLogic': { discovers: 'Certificates · Keystores', fields: [{ label: 'Admin URL', placeholder: 'https://wls.corp.local:7002' }, { label: 'Username', placeholder: 'weblogic' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Tomcat': { discovers: 'Certificates · Keystores', fields: [{ label: 'JMX Host', placeholder: 'tomcat.corp.local:9090' }, { label: 'Keystore Path', placeholder: '/opt/tomcat/conf/keystore.jks' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'F5 BIG-IP': { discovers: 'Certificates · VIPs · SSL Profiles', fields: [{ label: 'Management IP', placeholder: '10.0.1.50' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Citrix ADC': { discovers: 'Certificates · VIPs', fields: [{ label: 'NSIP', placeholder: '10.0.1.100' }, { label: 'Username', placeholder: 'nsroot' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'NGINX': { discovers: 'Certificates · Endpoints', fields: [{ label: 'API Endpoint', placeholder: 'https://nginx-controller.local/api' }, { label: 'API Key', placeholder: '••••••••', secret: true }] },
  'HAProxy': { discovers: 'Certificates · Frontends', fields: [{ label: 'Stats URL', placeholder: 'https://haproxy.corp.local:9000' }, { label: 'Admin Password', placeholder: '••••••••', secret: true }] },
  'Cisco': { discovers: 'Certificates · ACE/Modules', fields: [{ label: 'Device IP', placeholder: '10.0.1.1' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Check Point': { discovers: 'Firewall rules · VPN certs', fields: [{ label: 'Management Server', placeholder: '10.0.2.1' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'Cisco ASA': { discovers: 'VPN Certs · ACLs', fields: [{ label: 'Device IP', placeholder: '10.0.2.10' }, { label: 'Username', placeholder: 'admin' }, { label: 'Enable Password', placeholder: '••••••••', secret: true }] },
  'Fortinet': { discovers: 'VPN Certs · Policies', fields: [{ label: 'FortiGate IP', placeholder: '10.0.2.20' }, { label: 'API Token', placeholder: '...', secret: true }] },
  'Palo Alto': { discovers: 'Certs · Decryption policies', fields: [{ label: 'Panorama URL', placeholder: 'https://panorama.corp.local' }, { label: 'API Key', placeholder: '...', secret: true }] },
  'F5 WAF': { discovers: 'WAF policies · SSL profiles', fields: [{ label: 'Management IP', placeholder: '10.0.3.1' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Azure WAF': { discovers: 'WAF rules · Certs', fields: [{ label: 'Subscription ID', placeholder: '...' }, { label: 'Resource Group', placeholder: '...' }, { label: 'Client Secret', placeholder: '...', secret: true }] },
  'VMware NSX': { discovers: 'SDN certs · Load balancers', fields: [{ label: 'NSX Manager URL', placeholder: 'https://nsx-mgr.corp.local' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Ansible': { discovers: 'Playbook automation', fields: [{ label: 'Tower URL', placeholder: 'https://ansible-tower.corp.local' }, { label: 'API Token', placeholder: '...', secret: true }] },
  'Puppet': { discovers: 'Config management', fields: [{ label: 'Puppet Master URL', placeholder: 'https://puppet.corp.local:8140' }, { label: 'Auth Token', placeholder: '...', secret: true }] },
  'Terraform': { discovers: 'IaC state · Resources', fields: [{ label: 'Backend URL', placeholder: 'https://app.terraform.io' }, { label: 'API Token', placeholder: '...', secret: true }, { label: 'Organization', placeholder: 'acmecorp' }] },
  'Red Hat OpenShift': { discovers: 'Routes · Certs · Secrets', fields: [{ label: 'API Server URL', placeholder: 'https://api.ocp.corp.local:6443' }, { label: 'Service Account Token', placeholder: '...', secret: true }] },
  'OpenStack': { discovers: 'Instances · Certs', fields: [{ label: 'Keystone URL', placeholder: 'https://openstack.corp.local:5000' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  'Kubernetes API': { discovers: 'Certs · Secrets · ConfigMaps', fields: [{ label: 'API Server URL', placeholder: 'https://k8s-api.corp.local:6443' }, { label: 'Service Account Token', placeholder: 'eyJhbGci...', secret: true }, { label: 'Namespace', placeholder: 'default' }] },
};

function getConnectorMeta(name: string) {
  return connectorMeta[name] || { discovers: 'Assets', fields: [{ label: 'API Key', placeholder: '••••••••', secret: true }, { label: 'Endpoint URL', placeholder: 'https://...' }] };
}

interface ConnectorItem { name: string; status: string; lastSync: string; assets: number }

function ConnectorConfigModal({ item, open, onClose }: { item: ConnectorItem | null; open: boolean; onClose: () => void }) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(1);

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
    onClose(); setStep(1); setFieldValues({});
  };

  const handleDisconnect = () => { toast.info(`${item.name} disconnected`); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-[480px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(s => <div key={s} className={`w-5 h-1.5 rounded-full ${s <= step ? 'bg-teal' : 'bg-muted'}`} />)}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Link className="w-5 h-5 text-muted-foreground" /></div>
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{meta.discovers}</p>
            </div>
          </div>

          <div className="space-y-3">
            {meta.fields.map(field => (
              <div key={field.label}>
                <label className="text-xs text-muted-foreground mb-1 block">{field.label} <span className="text-coral">*</span></label>
                <div className="relative">
                  <input
                    type={field.secret && !visibleSecrets[field.label] ? 'password' : 'text'}
                    value={fieldValues[field.label] || (isConnected && field.secret ? '••••••••' : '')}
                    onChange={e => setFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal placeholder:text-muted-foreground/50"
                  />
                  {field.secret && (
                    <button onClick={() => setVisibleSecrets(prev => ({ ...prev, [field.label]: !prev[field.label] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {visibleSecrets[field.label] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {step === 2 && <div className="flex items-center gap-2 text-xs text-amber"><div className="w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />Testing connection...</div>}
          {step === 3 && <div className="flex items-center gap-2 text-xs text-teal"><div className="w-2 h-2 rounded-full bg-teal" />Connection verified successfully</div>}

          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleTest} disabled={step === 2} className="flex items-center gap-1.5 px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <Wifi className="w-3.5 h-3.5" /> Test
            </button>
            <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal-light transition-colors">
              <Link className="w-3.5 h-3.5" /> {isConnected ? 'Save Changes' : 'Save & Connect'}
            </button>
          </div>

          {isConnected && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-muted-foreground">Last sync: {item.lastSync}</p>
                  {item.assets > 0 && <p className="text-muted-foreground">{item.assets.toLocaleString()} assets discovered</p>}
                </div>
                <button onClick={handleDisconnect} className="text-coral hover:underline text-xs">Disconnect</button>
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

  const categories: Record<string, ConnectorItem[]> = {
    'Certificate Authorities': connectors.ca,
    'Cloud Platforms': connectors.cloud,
    'HSM': connectors.hsm,
    'PAM / Secrets Management': connectors.pam,
    'ITSM / Ticketing': connectors.itsm,
    'DDI (DNS / DHCP / IPAM)': connectors.ddi,
    'Web Servers': connectors.servers,
    'ADC / Load Balancers': connectors.adc,
    'Firewall': connectors.firewall,
    'WAF': connectors.waf,
    'SDN / NFV': connectors.sdn,
    'DevOps / Automation': connectors.devops,
  };

  const totalConnected = Object.values(connectors).flat().filter(c => c.status === 'connected').length;
  const totalAvailable = Object.values(connectors).flat().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Integrations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{totalConnected} connected · {totalAvailable} available</p>
        </div>
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
        const connectedCount = filtered.filter(i => i.status === 'connected').length;
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-2">{category} <span className="text-[10px] text-muted-foreground font-normal ml-1">{connectedCount}/{filtered.length} connected</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filtered.map(item => (
                <div key={item.name} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between hover:border-teal/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'connected' ? 'bg-teal' : 'bg-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.status === 'connected' ? `${item.lastSync}${item.assets > 0 ? ` · ${item.assets >= 1000000 ? (item.assets / 1000000).toFixed(1) + 'M' : item.assets >= 1000 ? Math.round(item.assets / 1000) + 'K' : item.assets} assets` : ''}` : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedConnector(item)}
                    className={`text-[10px] px-2 py-1 rounded flex-shrink-0 ml-2 ${item.status === 'connected' ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-teal text-primary-foreground hover:bg-teal-light'}`}>
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
