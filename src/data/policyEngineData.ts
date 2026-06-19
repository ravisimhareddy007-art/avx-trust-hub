// Reusable Value Sets and Response Profiles for the Policy Engine.
// These are org-level objects referenced from custom policies, so the same
// "Approved CAs" list or "Critical Crypto Response" routing is defined once
// and reused across many policies (Wiz/Atlassian pattern).

export type ValueSetType = 'ca-list' | 'algorithm' | 'tls-version' | 'cipher' | 'key-source';

export interface ValueSet {
  id: string;
  name: string;
  type: ValueSetType;
  entries: string[];
}

export const VALUE_SET_TYPE_LABEL: Record<ValueSetType, string> = {
  'ca-list': 'CA list',
  'algorithm': 'Algorithm',
  'tls-version': 'TLS version',
  'cipher': 'Cipher',
  'key-source': 'Key source',
};

export const INITIAL_VALUE_SETS: ValueSet[] = [
  { id: 'vs-cas', name: 'Approved CAs', type: 'ca-list', entries: ['DigiCert', 'Sectigo', 'internal-Root-G2'] },
  { id: 'vs-algos', name: 'Allowed Signature Algorithms', type: 'algorithm', entries: ['SHA-256', 'SHA-384', 'SHA-512'] },
  { id: 'vs-tls', name: 'Permitted TLS Versions', type: 'tls-version', entries: ['TLS 1.2', 'TLS 1.3'] },
];

// -----------------------------------------------------------------------------

export type TicketSystem = 'none' | 'servicenow' | 'jira';

export interface ResponseProfile {
  id: string;
  name: string;
  isDefault?: boolean;
  notify: {
    emailRecipients?: string;
    slackChannel?: string;
    onNewViolation: boolean;
    onResolution: boolean;
  };
  ticket:
    | { system: 'none' }
    | { system: 'servicenow'; assignmentGroup: string }
    | { system: 'jira'; projectKey: string; issueType: 'Task' | 'Bug' };
}

export const INITIAL_RESPONSE_PROFILES: ResponseProfile[] = [
  {
    id: 'rp-crit',
    name: 'Critical Crypto Response',
    isDefault: true,
    notify: { slackChannel: '#crypto-alerts', onNewViolation: true, onResolution: false },
    ticket: { system: 'servicenow', assignmentGroup: 'Crypto-Security' },
  },
  {
    id: 'rp-std',
    name: 'Standard Notify',
    notify: { emailRecipients: 'security@acme.com', onNewViolation: true, onResolution: false },
    ticket: { system: 'none' },
  },
];

export function profileChannelSummary(p: ResponseProfile): string {
  const parts: string[] = [];
  if (p.notify.slackChannel) parts.push(`Slack ${p.notify.slackChannel}`);
  if (p.notify.emailRecipients) parts.push('Email');
  if (p.ticket.system === 'servicenow') parts.push('ServiceNow Incident');
  else if (p.ticket.system === 'jira') parts.push(`Jira ${p.ticket.projectKey || ''}`.trim());
  if (p.ticket.system !== 'none') parts.push('priority from severity');
  return parts.join(' · ') || 'No actions';
}
