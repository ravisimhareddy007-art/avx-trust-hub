import React, { useState, useEffect } from 'react';
import { connectors } from '@/data/mockData';
import { toast } from 'sonner';
import { Search, Eye, EyeOff, Wifi, Link, X, ChevronLeft, ChevronRight, Check, RefreshCw, Play } from 'lucide-react';

// Extended connector metadata with category info for 4-step lifecycle
const connectorMeta: Record<string, {
  category: string;
  discovers: string;
  modules: { name: string; required?: boolean }[];
  fields: { label: string; placeholder: string; secret?: boolean; required?: boolean }[];
  authTypes: string[];
  syncModes: string[];
  permissions: string[];
  systemFetches: string[];
  validationChecks: string[];
}> = {
  'DigiCert': { category: 'PKI / Certificate Authority', discovers: 'Certificates · 3 asset types', modules: [{ name: 'CLM', required: true }, { name: 'Code Signing' }], fields: [{ label: 'CA URL / Host', placeholder: 'https://api.digicert.com', required: true }, { label: 'API Key', placeholder: 'dc-api-...', secret: true, required: true }, { label: 'Account ID', placeholder: '123456', required: true }], authTypes: ['API key', 'OAuth / service account'], syncModes: ['Managed — full automation', 'Monitored — read-only', 'Ignored — skip sync'], permissions: ['Certificate request (enroll)', 'Profile / template read', 'Certificate list / export', 'Revocation access'], systemFetches: ['Issued certificates (historical)', 'Cert metadata per record', 'Profiles & templates'], validationChecks: ['CA endpoint reachability', 'Authentication validation', 'Profile / template access', 'Simulated cert request test'] },
  'Entrust': { category: 'PKI / Certificate Authority', discovers: 'Certificates · 2 asset types', modules: [{ name: 'CLM', required: true }], fields: [{ label: 'CA URL', placeholder: 'https://api.entrust.net', required: true }, { label: 'API Key', placeholder: 'ent-...', secret: true, required: true }, { label: 'Organization ID', placeholder: 'org-...', required: true }], authTypes: ['API key'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['Certificate request (enroll)', 'Certificate list / export'], systemFetches: ['Issued certificates', 'Certificate metadata'], validationChecks: ['CA endpoint reachability', 'Authentication validation', 'Certificate list access'] },
  'MSCA Enterprise': { category: 'PKI / Certificate Authority', discovers: 'Certificates · Internal PKI', modules: [{ name: 'CLM', required: true }], fields: [{ label: 'Server URL', placeholder: 'https://ca.corp.local/certsrv', required: true }, { label: 'LDAP Path (ADCS)', placeholder: 'CN=CA,DC=corp,DC=local' }, { label: 'Username', placeholder: 'DOMAIN\\admin', required: true }, { label: 'Password', placeholder: '••••••••', secret: true, required: true }], authTypes: ['Username + password', 'Certificate-based (mTLS)', 'OAuth / service account'], syncModes: ['Managed — full automation', 'Monitored — read-only', 'Ignored — skip sync'], permissions: ['Certificate request (enroll)', 'Profile / template read', 'Certificate list / export', 'Revocation access'], systemFetches: ['Issued certificates (historical)', 'Cert metadata per record', 'Templates & profiles'], validationChecks: ['CA endpoint reachability', 'Authentication validation', 'Profile / template access', 'Simulated cert request test'] },
  "Let's Encrypt": { category: 'PKI / Certificate Authority', discovers: 'Certificates · ACME managed', modules: [{ name: 'CLM', required: true }], fields: [{ label: 'ACME Directory URL', placeholder: 'https://acme-v02.api.letsencrypt.org/directory', required: true }, { label: 'Account Email', placeholder: 'admin@acmecorp.com', required: true }], authTypes: ['ACME account key'], syncModes: ['Managed — full automation'], permissions: ['Certificate issuance', 'Certificate revocation'], systemFetches: ['ACME-issued certificates', 'Domain validations'], validationChecks: ['ACME directory reachability', 'Account key validation', 'Domain authorization test'] },
  'F5 BIG-IP': { category: 'ADC / Load Balancer', discovers: 'Certificates · VIPs · SSL Profiles', modules: [{ name: 'LTM', required: true }, { name: 'DNS' }], fields: [{ label: 'Device Name', placeholder: 'f5-prod-01' }, { label: 'Host / IP / FQDN', placeholder: '10.0.1.50', required: true }, { label: 'API Port', placeholder: '443' }, { label: 'SSH Port', placeholder: '22' }, { label: 'Environment', placeholder: 'Prod / Dev / QA' }], authTypes: ['Username + password', 'Token-based auth', 'Certificate-based (mTLS)'], syncModes: ['Managed — full automation', 'Monitored — read-only', 'Ignored — skip sync'], permissions: ['LTM read', 'SSL certificate read', 'Profile access'], systemFetches: ['Virtual servers', 'SSL profiles', 'Certificates', 'Partitions'], validationChecks: ['API connectivity to F5', 'Authorization check', 'Authentication validation', 'Data access — cert + profiles'] },
  'Citrix ADC': { category: 'ADC / Load Balancer', discovers: 'Certificates · VIPs', modules: [{ name: 'SSL', required: true }], fields: [{ label: 'NSIP', placeholder: '10.0.1.100', required: true }, { label: 'Username', placeholder: 'nsroot', required: true }, { label: 'Password', placeholder: '••••••••', secret: true, required: true }], authTypes: ['Username + password'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['SSL certificate read', 'VServer access'], systemFetches: ['SSL certificates', 'Virtual servers', 'SSL profiles'], validationChecks: ['NSIP reachability', 'Authentication validation', 'SSL cert access'] },
  'AWS': { category: 'Cloud Platform', discovers: 'ACM Certs · KMS Keys · Secrets Manager', modules: [{ name: 'ACM', required: true }, { name: 'KMS' }, { name: 'Secrets Manager' }], fields: [{ label: 'Access Key ID', placeholder: 'AKIA...', secret: true, required: true }, { label: 'Secret Access Key', placeholder: '••••••••', secret: true, required: true }, { label: 'Region', placeholder: 'us-east-1', required: true }], authTypes: ['IAM access keys', 'IAM role (cross-account)'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['ACM:ListCertificates', 'KMS:ListKeys', 'SecretsManager:ListSecrets'], systemFetches: ['ACM certificates', 'KMS keys', 'Secrets'], validationChecks: ['AWS API connectivity', 'IAM authentication', 'Service-level permissions'] },
  'Azure': { category: 'Cloud Platform', discovers: 'Key Vault · Managed Certs · WAF Certs', modules: [{ name: 'Key Vault', required: true }, { name: 'App Service' }], fields: [{ label: 'Tenant ID', placeholder: '...', required: true }, { label: 'Client ID', placeholder: '...', required: true }, { label: 'Client Secret', placeholder: '••••••••', secret: true, required: true }], authTypes: ['Service principal', 'Managed identity'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['Key Vault Reader', 'Certificate Reader'], systemFetches: ['Key Vault certificates', 'Managed certificates', 'Keys & secrets'], validationChecks: ['Azure AD authentication', 'Subscription access', 'Key Vault permissions'] },
  'Google Cloud Platform': { category: 'Cloud Platform', discovers: 'CAS Certs · KMS Keys', modules: [{ name: 'CAS', required: true }, { name: 'KMS' }], fields: [{ label: 'Service Account JSON', placeholder: '{ "type": "service_account" }', secret: true, required: true }, { label: 'Project ID', placeholder: 'my-project', required: true }], authTypes: ['Service account key', 'Workload identity'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['CAS Certificate Reader', 'KMS Key Reader'], systemFetches: ['CAS certificates', 'KMS keys', 'IAM policies'], validationChecks: ['GCP API connectivity', 'Service account auth', 'Project permissions'] },
  'HashiCorp Vault': { category: 'PAM / Secrets', discovers: 'Certificates · Keys · Secrets', modules: [{ name: 'PKI engine' }, { name: 'KV secrets', required: true }], fields: [{ label: 'Vault URL', placeholder: 'https://vault.corp.local:8200', required: true }, { label: 'Token', placeholder: 'hvs.CAESI...', secret: true, required: true }, { label: 'Namespace', placeholder: 'admin' }], authTypes: ['Token', 'AppRole', 'LDAP'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['read', 'list', 'create (PKI only)'], systemFetches: ['PKI certificates', 'KV secrets', 'Transit keys'], validationChecks: ['Vault URL reachability', 'Token authentication', 'Policy permissions', 'Secret engine access'] },
  'Thales Luna': { category: 'HSM', discovers: 'Keys · Certificates', modules: [{ name: 'Key Management', required: true }], fields: [{ label: 'HSM Address', placeholder: '10.0.5.100', required: true }, { label: 'Partition', placeholder: 'par-prod-01', required: true }, { label: 'Password', placeholder: '••••••••', secret: true, required: true }], authTypes: ['Partition password', 'PED key'], syncModes: ['Monitored — read-only'], permissions: ['Key list', 'Certificate list', 'Partition info'], systemFetches: ['HSM keys', 'Stored certificates', 'Partition metadata'], validationChecks: ['HSM network reachability', 'Partition authentication', 'Key access verification'] },
  'ServiceNow': { category: 'ITSM / Ticketing', discovers: 'Ticket sync · CMDB', modules: [{ name: 'CMDB sync', required: true }, { name: 'Incident mgmt' }], fields: [{ label: 'Instance URL', placeholder: 'https://acmecorp.service-now.com', required: true }, { label: 'Username', placeholder: 'admin', required: true }, { label: 'Password', placeholder: '••••••••', secret: true, required: true }], authTypes: ['Username + password', 'OAuth'], syncModes: ['Managed — full automation', 'Monitored — read-only'], permissions: ['CMDB read/write', 'Incident create', 'Change request create'], systemFetches: ['CMDB CIs', 'Incident records', 'Change requests'], validationChecks: ['Instance reachability', 'Authentication validation', 'CMDB table access', 'Incident table access'] },
};

function getConnectorMeta(name: string) {
  return connectorMeta[name] || {
    category: 'General',
    discovers: 'Assets',
    modules: [{ name: 'Default', required: true }],
    fields: [{ label: 'API Key', placeholder: '••••••••', secret: true, required: true }, { label: 'Endpoint URL', placeholder: 'https://...', required: true }],
    authTypes: ['API key', 'Username + password'],
    syncModes: ['Managed — full automation', 'Monitored — read-only', 'Ignored — skip sync'],
    permissions: ['Read access', 'Write access'],
    systemFetches: ['Certificates', 'Keys', 'Configurations'],
    validationChecks: ['Endpoint reachability', 'Authentication validation', 'Data access verification'],
  };
}

interface ConnectorItem { name: string; status: string; lastSync: string; assets: number }

const STEPS = [
  { num: 1, label: 'Select', desc: 'Integration type' },
  { num: 2, label: 'Configure', desc: 'Connection setup' },
  { num: 3, label: 'Credentials', desc: 'Authentication' },
  { num: 4, label: 'Validate', desc: 'Test connection' },
];

function ConnectorConfigModal({ item, open, onClose }: { item: ConnectorItem | null; open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [selectedAuthType, setSelectedAuthType] = useState('');
  const [selectedSyncMode, setSelectedSyncMode] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [validationResults, setValidationResults] = useState<{ check: string; passed: boolean }[]>([]);
  const [integrationName, setIntegrationName] = useState('');

  useEffect(() => {
    if (item && open) {
      const meta = getConnectorMeta(item.name);
      setSelectedAuthType(meta.authTypes[0] || '');
      setSelectedSyncMode(meta.syncModes[0] || '');
      setSelectedModules(meta.modules.filter(m => m.required).map(m => m.name));
      setIntegrationName(item.name + '-prod');
      setValidationStatus('idle');
      setValidationResults([]);
      setFieldValues({});
      setStep(1);
    }
  }, [item, open]);

  if (!open || !item) return null;
  const meta = getConnectorMeta(item.name);
  const isConnected = item.status === 'connected';

  const runValidation = () => {
    setValidationStatus('running');
    setValidationResults([]);
    let i = 0;
    const checks = meta.validationChecks;
    const interval = setInterval(() => {
      if (i < checks.length) {
        setValidationResults(prev => [...prev, { check: checks[i], passed: Math.random() > 0.1 }]);
        i++;
      } else {
        clearInterval(interval);
        setValidationResults(prev => {
          const allPassed = prev.every(r => r.passed);
          setValidationStatus(allPassed ? 'success' : 'failed');
          if (allPassed) toast.success('All validation checks passed');
          else toast.error('Some validation checks failed');
          return prev;
        });
      }
    }, 600);
  };


  const handleFinish = () => {
    toast.success(`${item.name} integration activated successfully`);
    onClose();
  };

  const canAdvance = () => {
    if (step === 1) return integrationName.length > 0;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-[600px] max-h-[85vh] overflow-y-auto">
        {/* Header with step indicator */}
        <div className="sticky top-0 bg-card z-10 border-b border-border rounded-t-xl">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              {step > 1 && !isConnected && (
                <button onClick={() => setStep(s => s - 1)} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{meta.category}</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          {/* 6-step progress bar */}
          <div className="flex px-5 pb-3 gap-1">
            {STEPS.map(s => (
              <div key={s.num} className="flex-1 flex flex-col items-center gap-0.5">
                <div className={`w-full h-1 rounded-full transition-colors ${s.num < step ? 'bg-teal' : s.num === step ? 'bg-teal/60' : 'bg-muted'}`} />
                <span className={`text-[9px] ${s.num <= step ? 'text-teal' : 'text-muted-foreground'}`}>
                  {s.num}. {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: Select Integration */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Select integration <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal/10 text-teal ml-1">{item.name}</span></p>
                <p className="text-[10px] text-muted-foreground">Identify system type · load vendor schema · preselect modules</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">User Selects</label>
                  <div className="space-y-2 text-xs text-foreground">
                    <div>• Category: <span className="text-muted-foreground">{meta.category}</span></div>
                    <div>• Vendor: <span className="font-medium text-teal">{item.name}</span></div>
                    <div className="pt-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Integration name (user-defined)</label>
                      <input value={integrationName} onChange={e => setIntegrationName(e.target.value)}
                        className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">System Loads</label>
                  <div className="text-xs text-foreground mb-3">
                    • {item.name}-specific schema <span className="text-[9px] px-1 py-0.5 rounded bg-teal/10 text-teal">{item.name.substring(0, 4)}</span>
                  </div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">Modules</label>
                  <div className="space-y-1.5">
                    {meta.modules.map(m => (
                      <label key={m.name} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={selectedModules.includes(m.name)}
                          disabled={m.required}
                          onChange={e => setSelectedModules(prev => e.target.checked ? [...prev, m.name] : prev.filter(x => x !== m.name))}
                          className="w-3 h-3 rounded border-border accent-teal" />
                        <span>{m.name}</span>
                        {m.required && <span className="text-[9px] px-1 py-0.5 rounded bg-coral/10 text-coral">required</span>}
                        {!m.required && <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">optional</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 font-mono">
                Loads {item.name} schema + presets
              </div>
            </div>
          )}

          {/* Step 2: Configure Device / Connection Setup */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Connection setup <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber/10 text-amber ml-1">Network reachability</span></p>
                <p className="text-[10px] text-muted-foreground">Define how to reach the {item.name} endpoint</p>
              </div>
              <div className="space-y-3">
                {meta.fields.map(field => (
                  <div key={field.label}>
                    <label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-coral">*</span>}
                      {field.required && <span className="text-[9px] px-1 py-0.5 rounded bg-coral/10 text-coral">required</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={field.secret && !visibleSecrets[field.label] ? 'password' : 'text'}
                        value={fieldValues[field.label] || ''}
                        onChange={e => setFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal placeholder:text-muted-foreground/50"
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
              <div className="bg-muted/50 rounded p-2 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">System Validates</p>
                <div className="text-[10px] text-muted-foreground">• Inline IP / FQDN format · Required field completeness · Smart defaults applied</div>
              </div>
              <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 font-mono">
                connection.host · connection.port · connection.protocol
              </div>
            </div>
          )}

          {/* Step 3: Credentials & Access */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Credentials & access <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal/10 text-teal ml-1">Authentication</span></p>
                <p className="text-[10px] text-muted-foreground">Identity verification · secure credential storage</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">Auth Type</label>
                  <div className="space-y-1.5">
                    {meta.authTypes.map(t => (
                      <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="radio" name="authType" checked={selectedAuthType === t} onChange={() => setSelectedAuthType(t)}
                          className="w-3 h-3 accent-teal" />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">Sync Mode</label>
                  <div className="space-y-1.5">
                    {meta.syncModes.map(m => (
                      <label key={m} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="radio" name="syncMode" checked={selectedSyncMode === m} onChange={() => setSelectedSyncMode(m)}
                          className="w-3 h-3 accent-teal" />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">Required Permissions</label>
                <div className="grid grid-cols-2 gap-1">
                  {meta.permissions.map(p => (
                    <div key={p} className="text-xs text-foreground flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-teal" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 font-mono">
                auth.type · auth.credentials · behavior.syncMode
              </div>
            </div>
          )}

          {/* Step 4: Validate & Save */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Validate & save <span className="text-[9px] px-1.5 py-0.5 rounded bg-coral/10 text-coral ml-1">Most critical</span></p>
                <p className="text-[10px] text-muted-foreground">Multi-stage validation before activation · validation.status</p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1.5 block uppercase tracking-wide">System Checks (in sequence)</label>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {meta.validationChecks.map(c => (
                    <div key={c} className="text-xs text-foreground flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              {validationStatus === 'idle' && (
                <button onClick={runValidation} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal text-primary-foreground rounded-lg text-xs font-medium hover:bg-teal/90 transition-colors">
                  <Play className="w-3.5 h-3.5" /> Run Validation
                </button>
              )}

              {validationStatus === 'running' && (
                <div className="space-y-2">
                  {validationResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.passed ? <Check className="w-3.5 h-3.5 text-teal" /> : <X className="w-3.5 h-3.5 text-coral" />}
                      <span className={r.passed ? 'text-foreground' : 'text-coral'}>{r.check}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-amber">
                    <div className="w-3 h-3 border-2 border-amber border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </div>
                </div>
              )}

              {(validationStatus === 'success' || validationStatus === 'failed') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-teal/30 bg-teal/5 p-3">
                      <p className="text-xs font-medium text-teal mb-2">Success output</p>
                      {validationResults.filter(r => r.passed).map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] mb-1">
                          <Check className="w-3 h-3 text-teal" />
                          <span className="text-foreground">{r.check}</span>
                        </div>
                      ))}
                      {validationStatus === 'success' && (
                        <p className="text-[10px] text-teal mt-2 font-medium">→ Activate integration</p>
                      )}
                    </div>
                    <div className={`rounded-lg border p-3 ${validationResults.some(r => !r.passed) ? 'border-coral/30 bg-coral/5' : 'border-border bg-muted/30'}`}>
                      <p className="text-xs font-medium text-coral mb-2">Failure state</p>
                      {validationResults.filter(r => !r.passed).length > 0 ? (
                        <>
                          {validationResults.filter(r => !r.passed).map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] mb-1">
                              <X className="w-3 h-3 text-coral" />
                              <span className="text-coral">{r.check}</span>
                            </div>
                          ))}
                          <p className="text-[10px] text-coral mt-2">↑ Fix & retry — no reset</p>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">No failures detected</p>
                      )}
                    </div>
                  </div>
                  {validationStatus === 'failed' && (
                    <button onClick={() => { setValidationStatus('idle'); setValidationResults([]); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Validation
                    </button>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Navigation buttons */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
                className="flex items-center gap-1 px-4 py-2.5 text-xs font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : validationStatus === 'success' ? (
              <button onClick={handleFinish} className="flex items-center gap-1 px-4 py-2.5 text-xs font-medium bg-teal text-primary-foreground rounded-lg hover:bg-teal/90 transition-colors">
                <Check className="w-3.5 h-3.5" /> Activate Integration
              </button>
            ) : null}
          </div>
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
