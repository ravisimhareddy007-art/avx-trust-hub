import { FEATURES } from '@/config/features';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useConnections } from '@/context/ConnectionsContext';
import {
  Search, Eye, EyeOff, X, Shield, Cloud, Lock, Cpu, Ticket, Bell,
  GitBranch, Server, CheckCircle2, ChevronDown, ChevronRight, ChevronLeft, ChevronUp,
  AlertTriangle, Check, Loader2, Upload, Info, Plus, Package,
  Bot, Trash2, Pencil, AlertCircle,
} from 'lucide-react';
// ─── Integration source data (preserved) ────────────────────────────────────
const INTEGRATIONS: {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
  fields: { label: string; placeholder: string; secret?: boolean }[];
}[] = [
  { id: 'digicert', name: 'DigiCert', category: 'Certificate Authorities', description: 'Public CA for TLS, code-signing, and S/MIME certificates.', connected: true, fields: [{ label: 'API Key', placeholder: 'dc-api-...', secret: true }, { label: 'Account ID', placeholder: '123456' }] },
  { id: 'entrust', name: 'Entrust', category: 'Certificate Authorities', description: 'Enterprise CA for TLS and identity certificates.', connected: true, fields: [{ label: 'API Key', placeholder: 'ent-...', secret: true }, { label: 'Organization ID', placeholder: 'org-...' }] },
  { id: 'msca', name: 'Microsoft CA (ADCS)', category: 'Certificate Authorities', description: 'Internal Microsoft Certificate Authority via ADCS.', connected: true, fields: [{ label: 'Server URL', placeholder: 'https://ca.corp.local/certsrv' }, { label: 'Username', placeholder: 'DOMAIN\\admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'letsencrypt', name: "Let's Encrypt", category: 'Certificate Authorities', description: 'Free, automated TLS certificates via ACME.', connected: false, fields: [{ label: 'ACME Directory URL', placeholder: 'https://acme-v02.api.letsencrypt.org/directory' }, { label: 'Account Email', placeholder: 'admin@acmecorp.com' }] },
  { id: 'globalsign', name: 'GlobalSign', category: 'Certificate Authorities', description: 'Global CA for enterprise TLS and document signing.', connected: false, fields: [{ label: 'API Key', placeholder: 'gs-api-...', secret: true }, { label: 'Account ID', placeholder: 'acct-...' }] },
  { id: 'sectigo', name: 'Sectigo', category: 'Certificate Authorities', description: 'Enterprise CA supporting TLS, S/MIME, and code-signing.', connected: false, fields: [{ label: 'Customer URI', placeholder: 'https://hard.cert-manager.com' }, { label: 'Login', placeholder: 'admin@acmecorp.com' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'aws', name: 'Amazon Web Services', category: 'Cloud Platforms', description: 'ACM certificates, KMS keys, and Secrets Manager.', connected: true, fields: [{ label: 'Access Key ID', placeholder: 'AKIA...', secret: true }, { label: 'Secret Access Key', placeholder: '••••••••', secret: true }, { label: 'Region', placeholder: 'us-east-1' }] },
  { id: 'azure', name: 'Microsoft Azure', category: 'Cloud Platforms', description: 'Key Vault, managed certificates, and Azure AD.', connected: true, fields: [{ label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, { label: 'Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, { label: 'Client Secret', placeholder: '••••••••', secret: true }] },
  { id: 'gcp', name: 'Google Cloud', category: 'Cloud Platforms', description: 'Certificate Authority Service and Cloud KMS.', connected: false, fields: [{ label: 'Service Account JSON', placeholder: '{ "type": "service_account", ... }', secret: true }, { label: 'Project ID', placeholder: 'my-project-id' }] },
  { id: 'hashicorp', name: 'HashiCorp Vault', category: 'Secrets & Vaults', description: 'Centralized secrets management and PKI engine.', connected: true, fields: [{ label: 'Vault URL', placeholder: 'https://vault.corp.local:8200' }, { label: 'Token', placeholder: 'hvs.CAESI...', secret: true }, { label: 'Namespace', placeholder: 'admin (optional)' }] },
  { id: 'cyberark', name: 'CyberArk Conjur', category: 'Secrets & Vaults', description: 'Privileged access and secrets management for DevOps.', connected: false, fields: [{ label: 'Conjur URL', placeholder: 'https://conjur.corp.local' }, { label: 'Account', placeholder: 'myorg' }, { label: 'API Key', placeholder: '••••••••', secret: true }] },
  { id: 'gcp-secrets', name: 'GCP Secret Manager', category: 'Secrets & Vaults', description: 'Managed secrets storage on Google Cloud.', connected: false, fields: [{ label: 'Project ID', placeholder: 'my-project-id' }, { label: 'Service Account JSON', placeholder: '{ "type": "service_account" }', secret: true }] },
  { id: 'thales', name: 'Thales Luna HSM', category: 'HSM', description: 'FIPS 140-2 hardware security module for key custody.', connected: false, fields: [{ label: 'HSM Address', placeholder: '10.0.5.100' }, { label: 'Partition', placeholder: 'par-prod-01' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'entrust-hsm', name: 'Entrust nShield', category: 'HSM', description: 'Network-attached HSM for high-assurance cryptography.', connected: false, fields: [{ label: 'nShield Host', placeholder: '10.0.5.200' }, { label: 'OCS Password', placeholder: '••••••••', secret: true }] },
  { id: 'servicenow', name: 'ServiceNow', category: 'ITSM & Ticketing', description: 'Change requests, CMDB sync, and incident management.', connected: true, fields: [{ label: 'Instance URL', placeholder: 'https://acmecorp.service-now.com' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'jira', name: 'Jira', category: 'ITSM & Ticketing', description: 'Issue tracking and project management.', connected: false, fields: [{ label: 'Jira URL', placeholder: 'https://acmecorp.atlassian.net' }, { label: 'Email', placeholder: 'admin@acmecorp.com' }, { label: 'API Token', placeholder: 'ATATT3...', secret: true }] },
  { id: 'pagerduty', name: 'PagerDuty', category: 'ITSM & Ticketing', description: 'Incident alerting and on-call management.', connected: false, fields: [{ label: 'Integration Key', placeholder: 'pd-int-...', secret: true }] },
  { id: 'slack', name: 'Slack', category: 'Notifications', description: 'Send alerts and workflow notifications to Slack channels.', connected: true, fields: [{ label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', secret: true }, { label: 'Default Channel', placeholder: '#security-alerts' }] },
  { id: 'teams', name: 'Microsoft Teams', category: 'Notifications', description: 'Send alerts to Teams channels via webhook.', connected: false, fields: [{ label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', secret: true }] },
  { id: 'email', name: 'Email (SMTP)', category: 'Notifications', description: 'Send notifications via your SMTP mail server.', connected: false, fields: [{ label: 'SMTP Host', placeholder: 'smtp.acmecorp.com' }, { label: 'Port', placeholder: '587' }, { label: 'Username', placeholder: 'noreply@acmecorp.com' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'github', name: 'GitHub', category: 'DevOps & CI/CD', description: 'Discover SSH keys and secrets in repositories and Actions.', connected: false, fields: [{ label: 'Personal Access Token', placeholder: 'ghp_...', secret: true }, { label: 'Organization', placeholder: 'acmecorp' }] },
  { id: 'jenkins', name: 'Jenkins', category: 'DevOps & CI/CD', description: 'Discover credentials and certificates used in pipelines.', connected: false, fields: [{ label: 'Jenkins URL', placeholder: 'https://jenkins.corp.local' }, { label: 'Username', placeholder: 'admin' }, { label: 'API Token', placeholder: '...', secret: true }] },
  { id: 'f5', name: 'F5 BIG-IP', category: 'Load Balancers & ADC', description: 'Discover and manage TLS certificates on F5 virtual servers.', connected: true, fields: [{ label: 'Host / IP', placeholder: '10.0.1.50' }, { label: 'Username', placeholder: 'admin' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  { id: 'citrix', name: 'Citrix ADC', category: 'Load Balancers & ADC', description: 'Discover SSL certificates on Citrix NetScaler.', connected: false, fields: [{ label: 'NSIP', placeholder: '10.0.1.100' }, { label: 'Username', placeholder: 'nsroot' }, { label: 'Password', placeholder: '••••••••', secret: true }] },
  {
    id: 'aws-bedrock',
    name: 'AWS Bedrock',
    category: 'AI & Agentic',
    description: 'Discover AI agent identities, model API credentials, and IAM roles across Amazon Bedrock deployments.',
    connected: true,
    fields: [
      { label: 'AWS Account ID', placeholder: '123456789012' },
      { label: 'Access Key ID', placeholder: 'AKIA...', secret: true },
      { label: 'Secret Access Key', placeholder: '••••••••', secret: true },
      { label: 'Region', placeholder: 'us-east-1' },
    ],
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    category: 'AI & Agentic',
    description: 'Inventory API keys and managed identity bindings across Azure OpenAI service deployments.',
    connected: false,
    fields: [
      { label: 'Azure Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { label: 'Subscription ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { label: 'API Key', placeholder: '••••••••', secret: true },
      { label: 'Endpoint URL', placeholder: 'https://acmecorp.openai.azure.com/' },
    ],
  },
  {
    id: 'langchain',
    name: 'LangChain',
    category: 'AI & Agentic',
    description: 'Discover tool credentials, OAuth tokens, and API keys used by LangChain agent instances.',
    connected: false,
    fields: [
      { label: 'LangSmith API Key', placeholder: 'ls__...', secret: true },
      { label: 'Agent Endpoint', placeholder: 'https://agents.acmecorp.com' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI Assistants',
    category: 'Agentic Frameworks',
    description: 'Monitor API key usage, token issuance, and credential hygiene across OpenAI Assistants API deployments.',
    connected: true,
    fields: [
      { label: 'API Key', placeholder: 'sk-...', secret: true },
      { label: 'Organization ID', placeholder: 'org-...' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude API',
    category: 'Agentic Frameworks',
    description: 'Discover and govern API credentials used by Claude-powered agents and automation pipelines.',
    connected: false,
    fields: [
      { label: 'API Key', placeholder: 'sk-ant-...', secret: true },
      { label: 'Workspace ID', placeholder: 'ws-...' },
    ],
  },
];
const CATEGORIES = [
  'Certificate Authorities', 'Cloud Platforms', 'Secrets & Vaults', 'HSM',
  'ITSM & Ticketing', 'Notifications', 'DevOps & CI/CD', 'Load Balancers & ADC',
  'AI & Agentic', 'Agentic Frameworks',
];
const LAST_SYNC: Record<string, string> = {
  digicert: '15 min ago', entrust: '30 min ago', msca: '1 hour ago',
  aws: '5 min ago', azure: '12 min ago', hashicorp: '3 min ago',
  servicenow: '45 min ago', slack: '2 min ago', f5: '1 hour ago',
};
// ─── Sidebar structure ───────────────────────────────────────────────────────
const SIDEBAR_GROUPS = [
  {
    label: 'PKI & SECRETS',
    categories: [
      { label: 'Certificate Authorities', dataKey: 'Certificate Authorities' },
      { label: 'HSM', dataKey: 'HSM' },
      { label: 'Secrets & Vaults', dataKey: 'Secrets & Vaults' },
    ],
  },
  {
    label: 'INFRASTRUCTURE',
    categories: [
      { label: 'Cloud Providers', dataKey: 'Cloud Platforms' },
      { label: 'Network & ADC', dataKey: 'Load Balancers & ADC' },
    ],
  },
  {
    label: 'IDENTITY & DEVOPS',
    categories: [
      { label: 'DevOps', dataKey: 'DevOps & CI/CD' },
      { label: 'ITSM & Ticketing', dataKey: 'ITSM & Ticketing' },
    ],
  },
  {
    label: 'AI & AGENTIC',
    categories: [
      { label: 'AI/ML Platforms', dataKey: 'AI & Agentic' },
      { label: 'Agentic Frameworks', dataKey: 'Agentic Frameworks' },
    ],
  },
  {
    label: 'SECURITY OPERATIONS',
    categories: [
      { label: 'Notifications', dataKey: 'Notifications' },
    ],
  },
];
// ─── Mock instances ──────────────────────────────────────────────────────────
const MOCK_INSTANCES = [
  { id: 'inst-1', name: 'AWS Prod - Org Account', subtitle: 'sts.us-east-1.amazonaws.com', integration: 'Amazon Web Services', category: 'Cloud Providers', status: 'connected' as const, discoveredAssets: 0, lastSync: '4 min ago', error: null },
  { id: 'inst-2', name: 'AWS Prod Account - ACM', subtitle: 'acm.us-east-1.amazonaws.com', integration: 'AWS', category: 'Certificate Authorities', status: 'connected' as const, discoveredAssets: 179, lastSync: '3 min ago', error: null },
  { id: 'inst-3', name: 'Azure Prod - Tenant', subtitle: 'management.azure.com', integration: 'Microsoft Azure', category: 'Cloud Providers', status: 'connected' as const, discoveredAssets: 0, lastSync: '9 min ago', error: null },
  { id: 'inst-4', name: 'CrowdStrike Falcon - Prod CID', subtitle: 'api.crowdstrike.com', integration: 'CrowdStrike Falcon', category: 'EDR & Vulnerability', status: 'connected' as const, discoveredAssets: 0, lastSync: '2 min ago', error: null },
  { id: 'inst-5', name: 'CyberArk PAM - Vault', subtitle: 'cyberark.corp.local', integration: 'CyberArk PAM', category: 'Secrets & Vaults', status: 'connected' as const, discoveredAssets: 0, lastSync: '6 min ago', error: null },
  { id: 'inst-6', name: 'DigiCert - Prod', subtitle: 'certcentral.digicert.com', integration: 'DigiCert', category: 'Certificate Authorities', status: 'error' as const, discoveredAssets: 0, lastSync: '1 hour ago', error: 'Authentication failed: API key expired or revoked. Update credentials to restore sync.' },
  { id: 'inst-7', name: 'HashiCorp Vault - Prod', subtitle: 'vault.corp.local:8200', integration: 'HashiCorp Vault', category: 'Secrets & Vaults', status: 'connected' as const, discoveredAssets: 42, lastSync: '3 min ago', error: null },
];
// ─── Marketplace data ────────────────────────────────────────────────────────
const MARKETPLACE_ITEMS = [
  { id: 'mp-1', name: 'Venafi Trust Protection', category: 'Certificate Authorities', publisher: 'Venafi', installs: '18.2k', version: 'v22.4.0', verified: true, installed: false, description: 'Enterprise machine identity management with full certificate lifecycle automation.' },
  { id: 'mp-2', name: 'Microsoft Teams Notifications', category: 'ITSM & ChatOps', publisher: 'Microsoft', installs: '14.5k', version: 'v2.1.0', verified: true, installed: true, description: 'Send certificate expiry alerts, policy violations, and workflow approvals to Microsoft Teams.' },
  { id: 'mp-3', name: 'Splunk SIEM Exporter', category: 'Compliance & Audit', publisher: 'Splunk', installs: '12.1k', version: 'v3.5.0', verified: true, installed: true, description: 'Stream AppViewX audit events, certificate changes, and policy violations to Splunk.' },
  { id: 'mp-4', name: 'GCP Certificate Manager', category: 'Cloud Providers', publisher: 'Google', installs: '9.3k', version: 'v1.2.0', verified: true, installed: false, description: 'Discover and manage TLS certificates deployed across Google Cloud.' },
  { id: 'mp-5', name: 'Sectigo Certificate Manager', category: 'Certificate Authorities', publisher: 'Sectigo', installs: '8.7k', version: 'v4.1.0', verified: true, installed: false, description: 'Manage the full lifecycle of public and private certificates via Sectigo.' },
  { id: 'mp-6', name: 'Datadog Certificate Monitoring', category: 'Observability', publisher: 'Datadog', installs: '7.2k', version: 'v2.3.0', verified: false, installed: false, description: 'Send certificate expiry metrics and health alerts to Datadog dashboards.' },
];
// ─── InfoTooltip ─────────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-muted-foreground hover:text-teal transition-colors"
      >
        <Info className="w-3 h-3" />
      </button>
      {show && (
        <div className="absolute left-5 top-0 w-56 bg-card border border-border rounded-lg p-2.5 text-[10px] text-muted-foreground shadow-xl z-50 leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}
// ─── AdvancedSection ─────────────────────────────────────────────────────────
function AdvancedSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[11px] font-medium text-foreground hover:text-teal w-full"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Advanced
      </button>
      {open && (
        <div className="mt-3 pl-1 space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[11px] font-medium text-foreground">Timeout (seconds)</label>
              <InfoTooltip text="Maximum time to wait for a response from this integration before marking it as failed." />
            </div>
            <input
              placeholder="30"
              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[11px] font-medium text-foreground">Proxy URL</label>
              <InfoTooltip text="Optional HTTP proxy for routing requests from this connector. Leave blank to use the system default." />
            </div>
            <input
              placeholder="https://proxy.corp.local:8080"
              className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
// ─── AddInstancePanel ────────────────────────────────────────────────────────
function AddInstancePanel({
  item,
  fieldValues,
  setFieldValues,
  showSecrets,
  setShowSecrets,
  onClose,
  onConnect,
}: {
  item: typeof INTEGRATIONS[0];
  fieldValues: Record<string, string>;
  setFieldValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  showSecrets: Record<string, boolean>;
  setShowSecrets: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onClose: () => void;
  onConnect: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Connect {item.name}</span>
              <Check className="w-4 h-4 text-teal" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
              <span className="text-teal">{item.category}</span>
              <span>›</span>
              <span className="hover:underline cursor-pointer">Setup guide</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-foreground mb-4">Connection Details</p>
            <div className="space-y-4">
              {/* Instance name always first */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="text-[11px] font-medium text-foreground">Instance Name</label>
                  <span className="text-coral text-xs">*</span>
                </div>
                <input
                  placeholder={`${item.name.replace(/\s/g, '_')}_Prod`}
                  value={fieldValues['Instance Name'] || ''}
                  onChange={e => setFieldValues(p => ({ ...p, 'Instance Name': e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
                />
              </div>
              {/* Dynamic fields with info icons */}
              {item.fields.map(field => (
                <div key={field.label}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <label className="text-[11px] font-medium text-foreground">{field.label}</label>
                    <span className="text-coral text-xs">*</span>
                    {field.placeholder && field.placeholder.length > 15 && (
                      <InfoTooltip text={field.placeholder} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type={field.secret && !showSecrets[field.label] ? 'password' : 'text'}
                      placeholder={field.secret ? '••••••••' : field.placeholder.substring(0, 32)}
                      value={fieldValues[field.label] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.label]: e.target.value }))}
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(p => ({ ...p, [field.label]: !p[field.label] }))}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {showSecrets[field.label] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <AdvancedSection />
        </div>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-2 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConnect}
            className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect
          </button>
        </div>
      </div>
    </>
  );
}
// ─── SourcesTab ──────────────────────────────────────────────────────────────
type TypeFilter = 'all' | 'built-in' | 'external' | 'custom';
function SourcesTab({
  filtered,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  expandedCategories,
  toggleExpandCategory,
  effectiveConnections,
  onAddInstance,
}: {
  filtered: typeof INTEGRATIONS;
  search: string;
  setSearch: (s: string) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (f: TypeFilter) => void;
  expandedCategories: Set<string>;
  toggleExpandCategory: (c: string) => void;
  effectiveConnections: Record<string, boolean>;
  onAddInstance: (item: typeof INTEGRATIONS[0]) => void;
}) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const SHOW_COUNT = 3;
  const toggleSection = (cat: string) =>
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative max-w-xs flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
          />
        </div>
        <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-muted/10">
          {(['all', 'built-in', 'external', 'custom'] as TypeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                typeFilter === f
                  ? 'bg-teal text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? `All ${INTEGRATIONS.length}` : f === 'built-in' ? 'Built-in 97' : f === 'external' ? 'External 23' : 'Custom 0'}
            </button>
          ))}
        </div>
      </div>
      {/* Category sections */}
      <div className="space-y-6">
        {CATEGORIES.map(cat => {
          const items = filtered.filter(i => i.category === cat);
          if (items.length === 0) return null;
          const isCollapsed = collapsedSections.has(cat);
          const isExpanded = expandedCategories.has(cat);
          const visible = isExpanded ? items : items.slice(0, SHOW_COUNT);
          return (
            <div key={cat}>
              <button
                onClick={() => toggleSection(cat)}
                className="flex items-center gap-2 mb-3 w-full group"
              >
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
                <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{items.length}</span>
              </button>
              {!isCollapsed && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {visible.map(i => {
                      const isConnected = effectiveConnections[i.id];
                      return (
                        <div
                          key={i.id}
                          className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-teal/30 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-semibold text-foreground leading-snug">{i.name}</span>
                            {isConnected && (
                              <span className="text-[9px] text-teal flex items-center gap-1 flex-shrink-0 ml-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                                Connected
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                            {i.description}
                          </p>
                          <button
                            onClick={() => onAddInstance(i)}
                            className={`text-[10px] px-3 py-1.5 rounded-lg w-full font-medium transition-colors ${
                              isConnected
                                ? 'border border-border text-foreground hover:bg-muted/30'
                                : 'bg-teal text-white hover:bg-teal/90'
                            }`}
                          >
                            + Add Instance
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {items.length > SHOW_COUNT && (
                    <button
                      onClick={() => toggleExpandCategory(cat)}
                      className="mt-2 text-[10px] text-teal hover:text-teal/80 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>Show less <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Show {items.length - SHOW_COUNT} more <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ─── InstancesTab ─────────────────────────────────────────────────────────────
function InstancesTab({
  errorDetailId,
  setErrorDetailId,
}: {
  errorDetailId: string | null;
  setErrorDetailId: (id: string | null) => void;
}) {
  const [instSearch, setInstSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBanner, setShowBanner] = useState(true);
  const noDiscovery = MOCK_INSTANCES.filter(i => i.discoveredAssets === 0).length;
  const categories = [...new Set(MOCK_INSTANCES.map(i => i.category))];
  const filtered = MOCK_INSTANCES.filter(i => {
    const s = instSearch.toLowerCase();
    const matchSearch = !s || i.name.toLowerCase().includes(s) || i.integration.toLowerCase().includes(s);
    const matchCat = catFilter === 'all' || i.category === catFilter;
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });
  return (
    <div>
      {showBanner && noDiscovery > 0 && (
        <div className="flex items-center justify-between bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-foreground">{noDiscovery} instances have no discovery yet</p>
              <p className="text-[10px] text-muted-foreground">Schedule or run a discovery scan to populate asset and identity counts.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="bg-teal text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-teal/90">
              Go to Discovery →
            </button>
            <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={instSearch}
            onChange={e => setInstSearch(e.target.value)}
            placeholder="Search instances..."
            className="w-56 text-[11px] border border-border rounded-lg pl-8 pr-3 py-2 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-[11px] border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="connected">Connected</option>
          <option value="error">Error</option>
        </select>
      </div>
      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/30 border-b border-border text-[10px] text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">INSTANCE NAME</th>
              <th className="px-4 py-2.5 text-left font-medium">INTEGRATION</th>
              <th className="px-4 py-2.5 text-left font-medium">CATEGORY</th>
              <th className="px-4 py-2.5 text-left font-medium">STATUS</th>
              <th className="px-4 py-2.5 text-left font-medium">DISCOVERED ASSETS</th>
              <th className="px-4 py-2.5 text-left font-medium">LAST SYNC</th>
              <th className="px-4 py-2.5 text-left font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inst => (
              <React.Fragment key={inst.id}>
                <tr className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{inst.name}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{inst.subtitle}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.integration}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {inst.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inst.status === 'error' ? (
                      <button
                        onClick={() => setErrorDetailId(errorDetailId === inst.id ? null : inst.id)}
                        className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Error
                        <ChevronDown className={`w-3 h-3 transition-transform ${errorDetailId === inst.id ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-teal text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                        Connected
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.discoveredAssets}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inst.lastSync}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        title="Edit"
                        className="p-1.5 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {inst.status === 'error' && errorDetailId === inst.id && (
                  <tr className="bg-red-500/5 border-b border-border">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-medium text-red-400 mb-0.5">Connection Error</p>
                          <p className="text-[10px] text-muted-foreground">{inst.error}</p>
                          <button className="mt-2 text-[10px] text-teal hover:underline">
                            Update credentials →
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground">
          Showing 1 to {filtered.length} of {MOCK_INSTANCES.length} entries
        </div>
      </div>
    </div>
  );
}
// ─── AI Builder View ──────────────────────────────────────────────────────────
function AIBuilderView() {

  const [step, setStep] = useState<1|2|3|4|5>(1);

  const [description, setDescription] = useState('');

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isValidating, setIsValidating] = useState(false);

  const [isRefining, setIsRefining] = useState(false);

  const [draft, setDraft] = useState<{name:string;category:string;description:string;authMethods:string[];connectionFields:{label:string;type:string;required:boolean;helpText:string}[];capabilities:string[];discoveryScope:string}|null>(null);

  const [validationResults, setValidationResults] = useState<{passed:string[];warnings:string[];errors:string[]}|null>(null);

  const [refinementInput, setRefinementInput] = useState('');

  const [refinementHistory, setRefinementHistory] = useState<{role:'user'|'assistant';content:string}[]>([]);

  const MOCK_DRAFT = {

    name: 'Okta Identity Provider',

    category: 'AI & Agentic',

    description: 'Discover service account identities, machine-to-machine app tokens, and certificate bindings from Okta via OAuth2.',

    authMethods: ['OAuth2 Client Credentials', 'API Token'],

    connectionFields: [

      { label: 'Okta Domain', type: 'url', required: true, helpText: 'Your Okta org URL, e.g. https://acmecorp.okta.com' },

      { label: 'Client ID', type: 'text', required: true, helpText: 'OAuth2 client ID from your Okta app integration' },

      { label: 'Client Secret', type: 'password', required: true, helpText: 'OAuth2 client secret — stored encrypted at rest' },

      { label: 'API Token', type: 'password', required: false, helpText: 'Fallback API token for read-only discovery scans' },

    ],

    capabilities: ['discover_identities', 'discover_tokens', 'discover_certificates', 'flag_no_mfa', 'sync_service_accounts'],

    discoveryScope: 'Service accounts, M2M app tokens, certificate bindings, MFA status',

  };

  const MOCK_VALIDATION = {

    passed: [

      'IDM schema version is compatible (v2.4)',

      'All required connection fields declared',

      'Auth method conforms to OAuth2 capability spec',

      'Discovery scope is well-defined and bounded',

      'Capability identifiers follow naming convention',

    ],

    warnings: [

      'API Token auth is a fallback — recommend enforcing OAuth2 in production policies',

      'flag_no_mfa capability may require elevated Okta admin scope',

    ],

    errors: [],

  };

  const MOCK_REFINEMENTS: Record<string, string> = {

    default: 'Done — draft updated based on your input.',

  };

  const generate = async () => {

    if (!description.trim()) return;

    setIsGenerating(true);

    await new Promise(r => setTimeout(r, 1800));

    setDraft(MOCK_DRAFT);

    setIsGenerating(false);

    setStep(2);

  };

  const validate = async () => {

    setIsValidating(true);

    await new Promise(r => setTimeout(r, 1400));

    setValidationResults(MOCK_VALIDATION);

    setIsValidating(false);

    setStep(3);

  };

  const refine = async () => {

    if (!refinementInput.trim()) return;

    const msg = refinementInput.trim();

    setRefinementInput('');

    setRefinementHistory(h => [...h, { role: 'user', content: msg }]);

    setIsRefining(true);

    await new Promise(r => setTimeout(r, 1200));

    setRefinementHistory(h => [...h, { role: 'assistant', content: 'Done — draft updated.' }]);

    setIsRefining(false);

  };

  const STEPS = ['Describe', 'Generate', 'Validate', 'Refine', 'Publish'];

  return (

    <div className="flex-1 overflow-y-auto pb-6">

      {/* Step bar */}

      <div className="flex items-center mb-6">

        {STEPS.map((s, idx) => {

          const n = idx + 1;

          const done = step > n;

          const active = step === n;

          return (

            <React.Fragment key={s}>

              <div className="flex items-center gap-2">

                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${done||active ? 'bg-teal text-white' : 'bg-muted text-muted-foreground'}`}>

                  {done ? <Check className="w-3 h-3"/> : n}

                </div>

                <span className={`text-[11px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>

              </div>

              {idx < STEPS.length - 1 && <div className={`h-px w-8 mx-2 flex-shrink-0 ${done ? 'bg-teal' : 'bg-border'}`}/>}

            </React.Fragment>

          );

        })}

      </div>

      {/* Step 1: Describe */}

      {step === 1 && (

        <div className="max-w-2xl">

          <h2 className="text-lg font-semibold text-foreground mb-1">Describe your integration</h2>

          <p className="text-[11px] text-muted-foreground mb-4">Tell the builder what system you want to connect. Mention the vendor, auth method, and what you want to discover or manage.</p>

          <textarea

            value={description}

            onChange={e => setDescription(e.target.value)}

            placeholder="e.g. Connect to Okta using OAuth2 to discover service account identities and machine-to-machine app tokens. Track certificate bindings and flag accounts with no MFA."

            rows={5}

            className="w-full border border-border rounded-xl px-4 py-3 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50 resize-none mb-3"

          />

          <label className="flex items-center gap-2 border border-dashed border-border rounded-xl px-4 py-3 text-[11px] bg-muted/10 text-muted-foreground cursor-pointer hover:bg-muted/20 mb-4">

            <Upload className="w-3.5 h-3.5"/>

            <span>{uploadedFile ? uploadedFile.name : 'Upload API docs, OpenAPI spec, or SDK (optional)'}</span>

            <input type="file" className="hidden" accept=".json,.yaml,.yml,.pdf,.md" onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}/>

          </label>

          <button onClick={generate} disabled={!description.trim() || isGenerating} className="bg-teal text-white text-[11px] px-5 py-2 rounded-lg hover:bg-teal/90 font-medium flex items-center gap-2 disabled:opacity-50">

            {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin"/>Generating...</> : <><Bot className="w-4 h-4"/>Generate Integration</>}

          </button>

        </div>

      )}

      {/* Step 2: Generated draft */}

      {step === 2 && draft && (

        <div className="max-w-2xl">

          <h2 className="text-lg font-semibold text-foreground mb-1">Generated draft</h2>

          <p className="text-[11px] text-muted-foreground mb-4">Review the draft. Validate it against IDM standards or go back to adjust your description.</p>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4 mb-4">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[9px] text-teal font-medium mb-0.5">{draft.category}</p>

                <p className="text-base font-semibold text-foreground">{draft.name}</p>

                <p className="text-[11px] text-muted-foreground mt-1">{draft.description}</p>

              </div>

              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 flex-shrink-0">Draft</span>

            </div>

            <div className="border-t border-border pt-3">

              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Connection Fields</p>

              {draft.connectionFields.map((f, i) => (

                <div key={i} className="flex items-start gap-3 text-[11px] mb-1.5">

                  <span className="font-medium text-foreground w-32 flex-shrink-0">{f.label}</span>

                  <span className="text-muted-foreground flex-1">{f.helpText}</span>

                  {f.required && <span className="text-coral text-[9px] flex-shrink-0">Required</span>}

                </div>

              ))}

            </div>

            <div className="border-t border-border pt-3">

              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Auth Methods</p>

              <div className="flex flex-wrap gap-1.5">

                {draft.authMethods.map((m, i) => <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{m}</span>)}

              </div>

            </div>

            <div className="border-t border-border pt-3">

              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capabilities</p>

              <div className="flex flex-wrap gap-1.5">

                {draft.capabilities.map((c, i) => <span key={i} className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full">{c}</span>)}

              </div>

            </div>

          </div>

          <div className="flex gap-2">

            <button onClick={() => setStep(1)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Back</button>

            <button onClick={validate} disabled={isValidating} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium flex items-center gap-2 disabled:opacity-50">

              {isValidating ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Validating...</> : 'Validate →'}

            </button>

          </div>

        </div>

      )}

      {/* Step 3: Validation */}

      {step === 3 && validationResults && (

        <div className="max-w-2xl">

          <h2 className="text-lg font-semibold text-foreground mb-1">Validation results</h2>

          <p className="text-[11px] text-muted-foreground mb-4">IDM schema validation complete. Address any errors before publishing.</p>

          <div className="space-y-3 mb-4">

            {validationResults.passed.length > 0 && (

              <div className="bg-teal/5 border border-teal/20 rounded-xl p-4">

                <p className="text-[10px] font-semibold text-teal uppercase tracking-wider mb-2">Passed</p>

                {validationResults.passed.map((p, i) => (

                  <div key={i} className="flex items-center gap-2 text-[11px] text-foreground mb-1">

                    <Check className="w-3 h-3 text-teal flex-shrink-0"/>{p}

                  </div>

                ))}

              </div>

            )}

            {validationResults.warnings.length > 0 && (

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">

                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-2">Warnings</p>

                {validationResults.warnings.map((w, i) => (

                  <div key={i} className="flex items-center gap-2 text-[11px] text-foreground mb-1">

                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0"/>{w}

                  </div>

                ))}

              </div>

            )}

            {validationResults.errors.length > 0 && (

              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">

                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Errors</p>

                {validationResults.errors.map((e, i) => (

                  <div key={i} className="flex items-center gap-2 text-[11px] text-foreground mb-1">

                    <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0"/>{e}

                  </div>

                ))}

              </div>

            )}

          </div>

          <div className="flex gap-2">

            <button onClick={() => setStep(2)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Back</button>

            <button onClick={() => setStep(4)} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Refine →</button>

            <button onClick={() => setStep(5)} className="border border-teal text-teal text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/10 font-medium">Skip to Publish →</button>

          </div>

        </div>

      )}

      {/* Step 4: Refine */}

      {step === 4 && draft && (

        <div className="max-w-2xl">

          <h2 className="text-lg font-semibold text-foreground mb-1">Refine</h2>

          <p className="text-[11px] text-muted-foreground mb-4">Tell the builder what to change. Each message updates the draft.</p>

          <div className="bg-card border border-border rounded-xl p-4 mb-3 min-h-32 max-h-56 overflow-y-auto space-y-3">

            {refinementHistory.length === 0 && (

              <p className="text-[11px] text-muted-foreground">Describe what to adjust — auth methods, field names, capabilities, discovery scope.</p>

            )}

            {refinementHistory.map((msg, i) => (

              <div key={i} className="text-[11px]">

                <span className="text-[9px] text-muted-foreground mr-2 uppercase">{msg.role === 'user' ? 'You' : 'Builder'}</span>

                <span className={msg.role === 'user' ? 'text-foreground' : 'text-teal'}>{msg.content}</span>

              </div>

            ))}

            {isRefining && (

              <div className="text-[11px] text-teal flex items-center gap-1.5">

                <Loader2 className="w-3 h-3 animate-spin"/>Updating draft...

              </div>

            )}

          </div>

          <div className="flex gap-2 mb-4">

            <input

              value={refinementInput}

              onChange={e => setRefinementInput(e.target.value)}

              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && refine()}

              placeholder="e.g. Add SAML support, remove the API Token fallback field"

              className="flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"

            />

            <button onClick={refine} disabled={!refinementInput.trim() || isRefining} className="bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 disabled:opacity-50">Send</button>

          </div>

          <div className="flex gap-2">

            <button onClick={() => setStep(3)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Back</button>

            <button onClick={() => setStep(5)} className="bg-teal text-white text-[11px] px-4 py-1.5 rounded-lg hover:bg-teal/90 font-medium">Publish →</button>

          </div>

        </div>

      )}

      {/* Step 5: Publish */}

      {step === 5 && draft && (

        <div className="max-w-2xl">

          <h2 className="text-lg font-semibold text-foreground mb-1">Publish</h2>

          <p className="text-[11px] text-muted-foreground mb-4">Your integration enters the distribution pipeline — signing, validation, and install verification before it becomes available in the Exchange.</p>

          <div className="bg-card border border-teal/30 rounded-xl p-5 mb-4">

            <div className="flex items-center gap-2 mb-4">

              <CheckCircle2 className="w-5 h-5 text-teal"/>

              <p className="text-sm font-semibold text-foreground">{draft.name} is ready to publish</p>

            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">

              <div><p className="text-muted-foreground mb-0.5">Category</p><p className="text-foreground font-medium">{draft.category}</p></div>

              <div><p className="text-muted-foreground mb-0.5">Capabilities</p><p className="text-foreground font-medium">{draft.capabilities.length} defined</p></div>

              <div><p className="text-muted-foreground mb-0.5">Auth methods</p><p className="text-foreground font-medium">{draft.authMethods.join(', ')}</p></div>

              <div><p className="text-muted-foreground mb-0.5">Connection fields</p><p className="text-foreground font-medium">{draft.connectionFields.length} fields</p></div>

            </div>

          </div>

          <div className="flex gap-2">

            <button onClick={() => setStep(4)} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Back</button>

            <button

              onClick={() => {

                toast.success(`${draft.name} submitted to the distribution pipeline.`);

                setStep(1); setDraft(null); setValidationResults(null);

                setRefinementHistory([]); setDescription(''); setUploadedFile(null);

              }}

              className="bg-teal text-white text-[11px] px-5 py-1.5 rounded-lg hover:bg-teal/90 font-medium"

            >

              Publish to Exchange

            </button>

          </div>

        </div>

      )}

    </div>

  );

}
// ─── Integrations exchange ─────────────────────────────────────────────────────
function ExchangeView({ onBack }: { onBack: () => void }) {
  const [activeSection, setActiveSection] = useState<'marketplace' | 'builder'>('marketplace');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const mktCategories = [...new Set(MARKETPLACE_ITEMS.map(i => i.category))];
  const filtered = selectedCat
    ? MARKETPLACE_ITEMS.filter(i => i.category === selectedCat)
    : MARKETPLACE_ITEMS;
  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Integrations
          </button>
          <span className="text-muted-foreground text-xs">·</span>
          <h1 className="text-xl font-semibold text-foreground">Integrations exchange</h1>
        </div>
        <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-muted/10">
          {(['marketplace', 'builder'] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`text-[10px] px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeSection === s ? 'bg-teal text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'marketplace' ? <Package className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              {s === 'marketplace' ? 'Marketplace' : 'AI Builder'}
            </button>
          ))}
        </div>
      </div>
      {activeSection === 'marketplace' && (
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0 overflow-y-auto">
            <div className="bg-gradient-to-br from-violet-900/80 to-indigo-900/80 rounded-xl p-3 mb-4 text-white">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">{MARKETPLACE_ITEMS.length} Integrations Available</span>
              </div>
              <p className="text-[9px] text-white/70 leading-relaxed">
                Verified connectors from AppViewX partners and the community
              </p>
              <div className="flex items-center gap-2 mt-2 text-[9px] text-white/60">
                <span>{mktCategories.length} categories</span>
                <span>·</span>
                <span>111.9k installs</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">Categories</p>
            <button
              onClick={() => setSelectedCat(null)}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] mb-0.5 transition-colors ${
                !selectedCat ? 'bg-teal/10 text-teal' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span>All</span>
              <span className="text-[9px]">{MARKETPLACE_ITEMS.length}</span>
            </button>
            {mktCategories.map(cat => {
              const count = MARKETPLACE_ITEMS.filter(i => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(selectedCat === cat ? null : cat)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] mb-0.5 transition-colors ${
                    selectedCat === cat ? 'bg-teal/10 text-teal' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[9px]">{count}</span>
                </button>
              );
            })}
          </div>
          {/* Cards */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-teal/30 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] text-teal font-medium mb-0.5">{item.category}</p>
                      <p className="text-sm font-semibold text-foreground leading-snug">{item.name}</p>
                    </div>
                    {item.installed && (
                      <span className="text-[9px] text-teal flex items-center gap-1 bg-teal/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        <Check className="w-2.5 h-2.5" />
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>{item.publisher}</span>
                    {item.verified && <span className="text-teal">✓ Verified</span>}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {item.installs} installs · {item.version}
                  </div>
                  <button
                    className={`text-[10px] px-3 py-1.5 rounded-lg w-full font-medium transition-colors ${
                      item.installed
                        ? 'border border-teal/40 text-teal bg-teal/5 hover:bg-teal/10'
                        : 'bg-teal text-white hover:bg-teal/90'
                    }`}
                  >
                    {item.installed ? '✓ Installed' : '↓ Install Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeSection === 'builder' && <AIBuilderView />}
    </div>
  );
}
// ─── Main Page ────────────────────────────────────────────────────────────────
type ITab = 'sources' | 'instances';
export default function IntegrationsPage() {
  const [itab, setItab] = useState<ITab>('sources');
  const [showExchange, setShowExchange] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [configItem, setConfigItem] = useState<typeof INTEGRATIONS[0] | null>(null);
  const [addPanelItem, setAddPanelItem] = useState<typeof INTEGRATIONS[0] | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [errorDetailId, setErrorDetailId] = useState<string | null>(null);
  const { connections: savedConnections, saveConnection } = useConnections();
  const [connections, setConnections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, i.connected])),
  );
  const hasSavedHashicorp = savedConnections.some(c => c.vaultType === 'HashiCorp Vault');
  const effectiveConnections = { ...connections, hashicorp: connections.hashicorp || hasSavedHashicorp };
  const toggleGroup = (label: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  const toggleExpandCategory = (cat: string) =>
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  const filtered = INTEGRATIONS.filter(i => {
    // AI identity / Eos out of MVP scope: hide the agentic integration categories.
    if (!FEATURES.AI_IDENTITY && (i.category === 'AI & Agentic' || i.category === 'Agentic Frameworks')) return false;
    const matchSearch =
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || i.category === selectedCategory;
    return matchSearch && matchCat;
  });
  const openAddPanel = (item: typeof INTEGRATIONS[0]) => {
    if (item.id === 'hashicorp') {
      setConfigItem(item);
    } else {
      setAddPanelItem(item);
      setFieldValues({});
      setShowSecrets({});
    }
  };
  if (showExchange) {
    return <ExchangeView onBack={() => setShowExchange(false)} />;
  }
  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            120+ verified integration sources across categories -- Certificate Authorities, Cloud Providers, Network & ADC and more...
          </p>
        </div>
        <button
          onClick={() => setShowExchange(true)}
          className="flex items-center gap-2 border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          Integrations exchange
        </button>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-border mb-4 mt-3 flex-shrink-0">
        <button
          onClick={() => setItab('sources')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
            itab === 'sources'
              ? 'border-teal text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Sources
        </button>
        <button
          onClick={() => setItab('instances')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
            itab === 'instances'
              ? 'border-teal text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Instances
          <span className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded-full">
            {MOCK_INSTANCES.length}
          </span>
        </button>
      </div>
      {/* Body */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <div className="w-52 flex-shrink-0 overflow-y-auto border-r border-border pr-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                Categories
              </span>
              <button
                onClick={() => setSidebarVisible(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
            {SIDEBAR_GROUPS.filter(g => FEATURES.AI_IDENTITY || g.label !== 'AI & AGENTIC').map(group => {
              const isCollapsed = collapsedGroups.has(group.label);
              return (
                <div key={group.label} className="mb-3">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center gap-1.5 w-full mb-1"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="pl-2 space-y-0.5">
                      {group.categories.map(cat => {
                        const count = INTEGRATIONS.filter(i => i.category === cat.dataKey).length;
                        const isSelected = selectedCategory === cat.dataKey;
                        return (
                          <button
                            key={cat.label}
                            onClick={() => setSelectedCategory(isSelected ? null : cat.dataKey)}
                            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                              isSelected
                                ? 'bg-teal/10 text-teal'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-teal/20 text-teal'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Show sidebar toggle when hidden */}
        {!sidebarVisible && (
          <button
            onClick={() => setSidebarVisible(true)}
            className="flex-shrink-0 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-2 self-start"
            title="Show categories"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {itab === 'sources' && (
            <SourcesTab
              filtered={filtered}
              search={search}
              setSearch={setSearch}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              expandedCategories={expandedCategories}
              toggleExpandCategory={toggleExpandCategory}
              effectiveConnections={effectiveConnections}
              onAddInstance={openAddPanel}
            />
          )}
          {itab === 'instances' && (
            <InstancesTab
              errorDetailId={errorDetailId}
              setErrorDetailId={setErrorDetailId}
            />
          )}
        </div>
      </div>
      {/* Add Instance slide-in panel */}
      {addPanelItem && (
        <AddInstancePanel
          item={addPanelItem}
          fieldValues={fieldValues}
          setFieldValues={setFieldValues}
          showSecrets={showSecrets}
          setShowSecrets={setShowSecrets}
          onClose={() => setAddPanelItem(null)}
          onConnect={() => {
            setConnections(p => ({ ...p, [addPanelItem.id]: true }));
            toast.success(`${addPanelItem.name} connected successfully`);
            setAddPanelItem(null);
            setItab('instances');
          }}
        />
      )}
      {/* HashiCorp modal (preserved) */}
      {configItem && configItem.id === 'hashicorp' && (
        <HashiCorpVaultModal
          isConnected={effectiveConnections[configItem.id]}
          onClose={() => setConfigItem(null)}
          onDisconnect={() => {
            setConnections(p => ({ ...p, [configItem.id]: false }));
            toast.success(`${configItem.name} disconnected`);
            setConfigItem(null);
          }}
          onSaveConnection={data => {
            saveConnection({
              name: data.connectionName,
              vaultType: 'HashiCorp Vault',
              vaultUrl: data.vaultUrl,
              authMethod: data.authMethod,
              namespace: data.namespace,
              tlsConfig: data.tlsConfig,
              status: 'connected',
              credentials: data.credentials,
            });
            setConnections(p => ({ ...p, [configItem.id]: true }));
            toast.success('Connection saved. Available in Discovery and Policies.');
            setConfigItem(null);
          }}
        />
      )}
    </div>
  );
}
// ============================================================
// HashiCorp Vault Connect Modal (preserved exactly)
// ============================================================
type AuthMethod = 'token' | 'approle' | 'kubernetes' | 'aws-iam' | 'tls';
type TestStatus = 'idle' | 'testing' | 'success';
interface HashiCorpVaultModalProps {
  isConnected: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  onSaveConnection: (data: {
    connectionName: string;
    vaultUrl: string;
    authMethod: string;
    namespace?: string;
    tlsConfig?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }) => void;
}
function HashiCorpVaultModal({ isConnected, onClose, onDisconnect, onSaveConnection }: HashiCorpVaultModalProps) {
  const [connectionName, setConnectionName] = useState('');
  const [vaultUrl, setVaultUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('token');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [roleId, setRoleId] = useState('');
  const [secretId, setSecretId] = useState('');
  const [showSecretId, setShowSecretId] = useState(false);
  const [k8sRole, setK8sRole] = useState('');
  const [k8sJwtPath, setK8sJwtPath] = useState('/var/run/secrets/kubernetes.io/serviceaccount/token');
  const [awsRoleArn, setAwsRoleArn] = useState('');
  const [clientCert, setClientCert] = useState<File | null>(null);
  const [clientKey, setClientKey] = useState<File | null>(null);
  const [namespace, setNamespace] = useState('');
  const [tlsOpen, setTlsOpen] = useState(false);
  const [useCustomCa, setUseCustomCa] = useState(false);
  const [caBundle, setCaBundle] = useState<File | null>(null);
  const [skipTls, setSkipTls] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const requiredFilled = (): boolean => {
    if (!connectionName.trim() || !vaultUrl.trim()) return false;
    switch (authMethod) {
      case 'token': return !!token.trim();
      case 'approle': return !!roleId.trim() && !!secretId.trim();
      case 'kubernetes': return !!k8sRole.trim() && !!k8sJwtPath.trim();
      case 'aws-iam': return !!awsRoleArn.trim();
      case 'tls': return !!clientCert && !!clientKey;
    }
  };
  const handleTest = () => {
    if (!requiredFilled()) { toast.error('Please fill in all required fields before testing.'); return; }
    setTestStatus('testing');
    setTimeout(() => setTestStatus('success'), 1500);
  };
  const inputCls = 'flex-1 border border-border rounded-lg px-3 py-2 text-[11px] bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50';
  const labelCls = 'text-[11px] font-medium mb-1 text-foreground';
  const helperCls = 'text-[10px] text-muted-foreground mt-1';
  const renderSecretInput = (value: string, onChange: (v: string) => void, placeholder: string, show: boolean, toggle: () => void) => (
    <div className="flex items-center gap-2">
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      <button type="button" onClick={toggle} className="text-muted-foreground hover:text-foreground p-1">
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
  const renderFileInput = (file: File | null, onChange: (f: File | null) => void, label: string) => (
    <label className="flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 text-[11px] bg-muted/20 text-muted-foreground cursor-pointer hover:bg-muted/30">
      <Upload className="w-3.5 h-3.5" />
      <span className="flex-1 truncate">{file ? file.name : `Upload ${label}`}</span>
      <input type="file" className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
  const statusPill = () => {
    if (isConnected) return (<><span className="w-1.5 h-1.5 rounded-full bg-teal" /><span className="text-[11px] text-teal">● Connected</span></>);
    if (testStatus === 'success') return (<><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[11px] text-amber-400">● Tested, not saved</span></>);
    return (<><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /><span className="text-[11px] text-muted-foreground">● Not connected</span></>);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md z-10 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <span className="text-sm font-semibold text-foreground">HashiCorp Vault</span>
            <span className="text-[9px] bg-muted px-2 py-0.5 rounded ml-2 text-muted-foreground">Secrets & Vaults</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <p className="text-[11px] text-muted-foreground mb-2">Centralized secrets management and PKI engine.</p>
          <div className="flex items-center gap-2 py-2 border-b border-border">{statusPill()}</div>
          <div>
            <div className={labelCls}>Connection name <span className="text-coral">*</span></div>
            <input value={connectionName} onChange={e => setConnectionName(e.target.value)} placeholder="e.g. hashicorp-vault-prod" className={inputCls + ' w-full'} />
            <div className={helperCls}>A friendly name to identify this connection in discovery scans, policies, and workflows.</div>
          </div>
          <div>
            <div className={labelCls}>Vault URL <span className="text-coral">*</span></div>
            <input value={vaultUrl} onChange={e => setVaultUrl(e.target.value)} placeholder="https://vault.corp.local:8200" className={inputCls + ' w-full'} />
          </div>
          <div>
            <div className={labelCls}>Auth method <span className="text-coral">*</span></div>
            <select value={authMethod} onChange={e => { setAuthMethod(e.target.value as AuthMethod); setTestStatus('idle'); }} className={inputCls + ' w-full'}>
              <option value="token">Token</option>
              <option value="approle">AppRole</option>
              <option value="kubernetes">Kubernetes</option>
              <option value="aws-iam">AWS IAM</option>
              <option value="tls">TLS Certificate</option>
            </select>
          </div>
          {authMethod === 'token' && (<div><div className={labelCls}>Token <span className="text-coral">*</span></div>{renderSecretInput(token, setToken, 'hvs.CAESI...', showToken, () => setShowToken(s => !s))}</div>)}
          {authMethod === 'approle' && (<><div><div className={labelCls}>Role ID <span className="text-coral">*</span></div><input value={roleId} onChange={e => setRoleId(e.target.value)} className={inputCls + ' w-full'} /></div><div><div className={labelCls}>Secret ID <span className="text-coral">*</span></div>{renderSecretInput(secretId, setSecretId, '', showSecretId, () => setShowSecretId(s => !s))}</div></>)}
          {authMethod === 'kubernetes' && (<><div><div className={labelCls}>Kubernetes role <span className="text-coral">*</span></div><input value={k8sRole} onChange={e => setK8sRole(e.target.value)} placeholder="avx-reader" className={inputCls + ' w-full'} /></div><div><div className={labelCls}>Service account JWT path <span className="text-coral">*</span></div><input value={k8sJwtPath} onChange={e => setK8sJwtPath(e.target.value)} className={inputCls + ' w-full'} /><div className={helperCls}>Leave default unless using a custom mount.</div></div></>)}
          {authMethod === 'aws-iam' && (<div><div className={labelCls}>AWS IAM role ARN <span className="text-coral">*</span></div><input value={awsRoleArn} onChange={e => setAwsRoleArn(e.target.value)} placeholder="arn:aws:iam::123456789012:role/avx-vault-reader" className={inputCls + ' w-full'} /></div>)}
          {authMethod === 'tls' && (<><div><div className={labelCls}>Client certificate <span className="text-coral">*</span></div>{renderFileInput(clientCert, setClientCert, 'client certificate')}</div><div><div className={labelCls}>Client private key <span className="text-coral">*</span></div>{renderFileInput(clientKey, setClientKey, 'client private key')}</div></>)}
          <div>
            <div className={labelCls}>Namespace</div>
            <input value={namespace} onChange={e => setNamespace(e.target.value)} placeholder="e.g. admin/team-platform" className={inputCls + ' w-full'} />
            <div className={helperCls}>Optional. Required for Vault Enterprise multi-tenant deployments.</div>
          </div>
          <div className="border-t border-border pt-3">
            <button type="button" onClick={() => setTlsOpen(o => !o)} className="flex items-center gap-2 text-[11px] font-medium text-foreground hover:text-teal w-full">
              {tlsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              TLS configuration (advanced)
            </button>
            {tlsOpen && (
              <div className="mt-3 space-y-3 pl-1">
                <div>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-foreground">Use custom CA certificate</span>
                    <input type="checkbox" checked={useCustomCa} onChange={e => setUseCustomCa(e.target.checked)} className="accent-teal" />
                  </label>
                  {useCustomCa && (<div className="mt-2"><div className={labelCls}>CA certificate bundle (PEM)</div>{renderFileInput(caBundle, setCaBundle, 'CA bundle')}</div>)}
                </div>
                <div>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-foreground">Skip TLS verification</span>
                    <input type="checkbox" checked={skipTls} onChange={e => setSkipTls(e.target.checked)} className="accent-amber-400" />
                  </label>
                  {skipTls && (<div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /><span>Insecure. Use only for development or self-signed Vault instances.</span></div>)}
                </div>
              </div>
            )}
          </div>
          {testStatus === 'success' && (
            <div className="border border-teal/40 bg-teal/10 rounded-lg p-3 text-[11px] text-foreground space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-teal"><Check className="w-3.5 h-3.5" /> Connection successful</div>
              <div className="text-muted-foreground">Token TTL: 768h · Renewable: yes</div>
              <div className="text-muted-foreground">Policies: avx-reader, default</div>
              <div className="text-muted-foreground">Accessible mounts: secret/, pki/, transit/, ssh/</div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-2 justify-end flex-shrink-0">
          {isConnected && (<button onClick={onDisconnect} className="text-[11px] text-coral/70 hover:text-coral px-3 py-1.5 rounded-lg mr-auto">Disconnect</button>)}
          <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground">Cancel</button>
          <button onClick={handleTest} disabled={testStatus === 'testing'} className="border border-border text-[11px] px-3 py-1.5 rounded-lg hover:bg-muted/30 text-foreground flex items-center gap-1.5 disabled:opacity-60">
            {testStatus === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
            {testStatus === 'testing' ? 'Testing...' : 'Test connection'}
          </button>
          <button onClick={() => onSaveConnection({ connectionName: connectionName.trim(), vaultUrl: vaultUrl.trim(), authMethod, namespace: namespace.trim() || undefined, tlsConfig: { useCustomCa, skipTls, caBundle: caBundle?.name }, credentials: { authMethod, hasToken: !!token, hasSecretId: !!secretId } })} disabled={testStatus !== 'success'} className="bg-teal text-white text-[11px] px-3 py-1.5 rounded-lg hover:bg-teal/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Save connection
          </button>
        </div>
      </div>
    </div>
  );
}