// src/data/rbac.ts
// AVX Trust Platform - RBAC permission taxonomy, system roles, and bindings.
// Permission atom grammar:  <domain>.<resource>:<action>
// Scope is NEVER a property of a role. Scope lives on the binding.

export type Action =
  | 'read' | 'create' | 'update' | 'delete'
  | 'execute' | 'approve' | 'export' | 'grant';

export const ACTIONS: Action[] = [
  'read', 'create', 'update', 'delete', 'execute', 'approve', 'export', 'grant',
];

export const ACTION_LABEL: Record<Action, string> = {
  read: 'Read',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  execute: 'Execute',
  approve: 'Approve',
  export: 'Export',
  grant: 'Grant',
};

export interface ResourceDef {
  resource: string;
  label: string;
  actions: Action[];
  /** Atoms that carry material blast radius. Rendered with a warning affordance. */
  sensitive?: Action[];
  note?: string;
}

export interface DomainDef {
  domain: string;
  label: string;
  resources: ResourceDef[];
}

export const TAXONOMY: DomainDef[] = [
  {
    domain: 'discovery', label: 'Discovery', resources: [
      { resource: 'profile', label: 'Discovery Profile', actions: ['read', 'create', 'update', 'delete'] },
      { resource: 'run', label: 'Discovery Run', actions: ['read', 'execute', 'delete'] },
      { resource: 'cbom_import', label: 'CBOM Ingestion', actions: ['read', 'create'] },
    ],
  },
  {
    domain: 'inventory', label: 'Central Inventory', resources: [
      { resource: 'crypto_object', label: 'Crypto Object', actions: ['read', 'update', 'delete', 'export'] },
      { resource: 'asset', label: 'IT Asset', actions: ['read', 'update', 'export'] },
      { resource: 'group', label: 'Inventory Group', actions: ['read', 'create', 'update', 'delete'] },
      {
        resource: 'private_key_material', label: 'Private Key Material',
        actions: ['read', 'export'], sensitive: ['read', 'export'],
        note: 'Grants sight of key material itself, not merely its existence.',
      },
    ],
  },
  {
    domain: 'policy', label: 'Policy Engine', resources: [
      { resource: 'definition', label: 'Policy Definition', actions: ['read', 'create', 'update', 'delete'] },
      { resource: 'pack', label: 'Policy Pack', actions: ['read', 'create', 'update', 'delete'] },
      { resource: 'ai_authoring', label: 'AI Policy Authoring', actions: ['execute'] },
      { resource: 'exception', label: 'Policy Exception', actions: ['read', 'create', 'update', 'delete', 'approve'], sensitive: ['approve'] },
      { resource: 'evaluation', label: 'Policy Evaluation', actions: ['read', 'execute'] },
    ],
  },
  {
    domain: 'risk', label: 'Risk Scoring', resources: [
      { resource: 'score', label: 'Risk Score (CRS / ARS / ERS)', actions: ['read', 'export'] },
      { resource: 'scoring_config', label: 'Scoring Configuration', actions: ['read', 'update'], sensitive: ['update'] },
    ],
  },
  {
    domain: 'remediation', label: 'Remediation', resources: [
      { resource: 'work_order', label: 'Work Order', actions: ['read', 'create', 'execute', 'approve'], sensitive: ['execute'] },
      { resource: 'ticket', label: 'Ticket', actions: ['read', 'create', 'update'] },
    ],
  },
  {
    domain: 'quantum', label: 'Quantum Readiness', resources: [
      { resource: 'assessment', label: 'PQC Assessment', actions: ['read', 'execute', 'export'] },
      { resource: 'migration_plan', label: 'Migration Plan', actions: ['read', 'create', 'update'] },
    ],
  },
  {
    domain: 'integration', label: 'Integrations', resources: [
      { resource: 'connector', label: 'Connector', actions: ['read', 'create', 'update', 'delete', 'execute'] },
      { resource: 'credential', label: 'Integration Credential', actions: ['read', 'create', 'update', 'delete'], sensitive: ['read'] },
    ],
  },
  {
    domain: 'mcp', label: 'MCP Runtime', resources: [
      { resource: 'agent', label: 'MCP Agent', actions: ['read', 'create', 'update', 'delete'] },
      { resource: 'tool_invocation', label: 'Tool Invocation', actions: ['read', 'execute'], sensitive: ['execute'] },
    ],
  },
  {
    domain: 'platform', label: 'Platform Core', resources: [
      { resource: 'user', label: 'User', actions: ['read', 'create', 'update', 'delete'] },
      {
        resource: 'role', label: 'Role',
        actions: ['read', 'create', 'update', 'delete', 'grant'], sensitive: ['grant'],
        note: 'Grant is separated from Update. Editing a role and handing it to a person are the two halves of a privilege escalation.',
      },
      { resource: 'tenant', label: 'Tenant', actions: ['read', 'create', 'update', 'delete'], sensitive: ['delete'] },
      { resource: 'license', label: 'License', actions: ['read', 'update'] },
      { resource: 'audit_log', label: 'Audit Log', actions: ['read', 'export'] },
      { resource: 'session', label: 'Active Session', actions: ['read', 'delete'] },
      { resource: 'auth_provider', label: 'Auth Provider', actions: ['read', 'create', 'update', 'delete'], sensitive: ['update'] },
      { resource: 'infrastructure', label: 'Infrastructure', actions: ['read', 'update'] },
      { resource: 'telemetry', label: 'Telemetry', actions: ['read', 'export'] },
    ],
  },
  {
    domain: 'report', label: 'Reporting', resources: [
      { resource: 'dashboard', label: 'Dashboard', actions: ['read'] },
      { resource: 'compliance', label: 'Compliance Report', actions: ['read', 'export'] },
    ],
  },
];

/** Fully expanded list of every legal permission atom. */
export const ALL_ATOMS: string[] = TAXONOMY.flatMap(d =>
  d.resources.flatMap(r => r.actions.map(a => `${d.domain}.${r.resource}:${a}`)),
);

export const TOTAL_ATOMS = ALL_ATOMS.length;

export const isSensitive = (atom: string): boolean => {
  const [lhs, action] = atom.split(':');
  const [domain, resource] = lhs.split('.');
  const r = TAXONOMY.find(d => d.domain === domain)?.resources.find(x => x.resource === resource);
  return !!r?.sensitive?.includes(action as Action);
};

/** Expand implied permissions. Every verb other than `read` implies `read` on the same resource. */
export const expandImplied = (atoms: string[]): string[] => {
  const out = new Set(atoms);
  atoms.forEach(a => {
    const [lhs, action] = a.split(':');
    if (action !== 'read') {
      const [domain, resource] = lhs.split('.');
      const def = TAXONOMY.find(d => d.domain === domain)?.resources.find(x => x.resource === resource);
      if (def?.actions.includes('read')) out.add(`${lhs}:read`);
    }
  });
  return [...out];
};

const atomsFor = (domain: string, resource?: string): string[] =>
  ALL_ATOMS.filter(a => a.startsWith(resource ? `${domain}.${resource}:` : `${domain}.`));

const readsFor = (...domains: string[]): string[] =>
  ALL_ATOMS.filter(a => domains.some(d => a.startsWith(`${d}.`)) && a.endsWith(':read'));

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

export const SYSTEM_ROLES: Role[] = [
  {
    id: 'rol_platform_admin',
    name: 'Platform Administrator',
    description: 'Owns the AVX deployment. Full control of every resource and every tenant.',
    isSystem: true,
    permissions: [...ALL_ATOMS],
  },
  {
    id: 'rol_security_admin',
    name: 'Security Administrator',
    description: 'Owns policy, risk configuration, remediation approval and integrations. Cannot administer the platform itself.',
    isSystem: true,
    permissions: expandImplied([
      ...atomsFor('policy'),
      ...atomsFor('risk'),
      ...atomsFor('remediation'),
      ...atomsFor('quantum'),
      ...atomsFor('integration').filter(a => a !== 'integration.credential:read'),
      ...atomsFor('report'),
      ...readsFor('inventory', 'discovery'),
      'inventory.crypto_object:export',
      'platform.audit_log:read',
      'platform.audit_log:export',
    ]),
  },
  {
    id: 'rol_crypto_operator',
    name: 'Crypto Operator',
    description: 'Hands-on operator across certificates, SSH keys, secrets and HSMs. Runs discovery, executes remediation, manages inventory. Cannot author policy.',
    isSystem: true,
    permissions: expandImplied([
      ...atomsFor('discovery'),
      ...atomsFor('inventory').filter(a => !a.startsWith('inventory.private_key_material')),
      'policy.definition:read',
      'policy.evaluation:read',
      'policy.exception:read',
      'policy.exception:create',
      'remediation.work_order:read',
      'remediation.work_order:create',
      'remediation.work_order:execute',
      'remediation.ticket:read',
      'remediation.ticket:create',
      'remediation.ticket:update',
      'quantum.assessment:read',
      'quantum.assessment:execute',
      'integration.connector:read',
      'integration.connector:execute',
      'risk.score:read',
      'report.dashboard:read',
    ]),
  },
  {
    id: 'rol_application_owner',
    name: 'Application Owner',
    description: 'Owns the crypto objects attached to their applications. Self-service request, view and renew. Highest headcount role.',
    isSystem: true,
    permissions: expandImplied([
      'inventory.crypto_object:read',
      'inventory.asset:read',
      'inventory.group:read',
      'discovery.run:read',
      'policy.definition:read',
      'policy.exception:read',
      'policy.exception:create',
      'remediation.work_order:read',
      'remediation.work_order:create',
      'remediation.ticket:read',
      'remediation.ticket:create',
      'risk.score:read',
      'report.dashboard:read',
    ]),
  },
  {
    id: 'rol_auditor',
    name: 'Auditor',
    description: 'Read-only across every module, with export. Internal audit, external assessors, compliance.',
    isSystem: true,
    permissions: [
      ...ALL_ATOMS.filter(a => a.endsWith(':read') && !a.startsWith('inventory.private_key_material')),
      'inventory.crypto_object:export',
      'inventory.asset:export',
      'risk.score:export',
      'quantum.assessment:export',
      'platform.audit_log:export',
      'platform.telemetry:export',
      'report.compliance:export',
    ],
  },
];

// ---------------------------------------------------------------------------
// Scope and bindings
// ---------------------------------------------------------------------------

export interface Scope {
  tenantId: string;
  businessUnitIds: string[];   // empty = all business units in tenant
  applicationIds: string[];    // empty = all applications in tenant
}

export interface Binding {
  id: string;
  principalId: string;
  principalName: string;
  roleId: string;
  scope: Scope;
  grantedBy: string;
  grantedOn: string;
}

export const TENANTS = [
  { id: 'tnt_acme', name: 'Acme Corp (root)' },
  { id: 'tnt_northwind', name: 'Northwind Trading' },
  { id: 'tnt_globex', name: 'Globex Industrial' },
];

export const BUSINESS_UNITS = [
  { id: 'bu_emea', name: 'EMEA' },
  { id: 'bu_amer', name: 'Americas' },
  { id: 'bu_apac', name: 'APAC' },
  { id: 'bu_corp', name: 'Corporate IT' },
];

export const APPLICATIONS = [
  { id: 'app_payments', name: 'Payments Gateway' },
  { id: 'app_ecom', name: 'E-Commerce Web' },
  { id: 'app_hrms', name: 'HRMS' },
  { id: 'app_datalake', name: 'Data Lake' },
];

/** Approximate crypto-object counts, used for the live scope-preview line. */
export const CRYPTO_OBJECT_COUNTS: Record<string, number> = {
  bu_emea: 4182, bu_amer: 6907, bu_apac: 2340, bu_corp: 1188,
  app_payments: 812, app_ecom: 1467, app_hrms: 233, app_datalake: 589,
};

export const PRINCIPALS = [
  { id: 'usr_alice', name: 'alice@acme.com' },
  { id: 'usr_bob', name: 'bob@acme.com' },
  { id: 'usr_carol', name: 'carol@acme.com' },
  { id: 'usr_dan', name: 'dan@acme.com' },
  { id: 'usr_erin', name: 'erin@northwind.io' },
  { id: 'usr_frank', name: 'frank@globex.com' },
  { id: 'usr_grace', name: 'grace@acme.com' },
];

const S = (tenantId: string, bu: string[] = [], app: string[] = []): Scope =>
  ({ tenantId, businessUnitIds: bu, applicationIds: app });

export const INITIAL_BINDINGS: Binding[] = [
  { id: 'bnd_1', principalId: 'usr_alice', principalName: 'alice@acme.com', roleId: 'rol_platform_admin', scope: S('tnt_acme'), grantedBy: 'system', grantedOn: '2026-04-02' },
  { id: 'bnd_2', principalId: 'usr_bob', principalName: 'bob@acme.com', roleId: 'rol_security_admin', scope: S('tnt_acme'), grantedBy: 'alice@acme.com', grantedOn: '2026-04-11' },
  { id: 'bnd_3', principalId: 'usr_carol', principalName: 'carol@acme.com', roleId: 'rol_crypto_operator', scope: S('tnt_acme', ['bu_emea']), grantedBy: 'alice@acme.com', grantedOn: '2026-04-15' },
  { id: 'bnd_4', principalId: 'usr_carol', principalName: 'carol@acme.com', roleId: 'rol_crypto_operator', scope: S('tnt_acme', ['bu_apac']), grantedBy: 'bob@acme.com', grantedOn: '2026-05-20' },
  { id: 'bnd_5', principalId: 'usr_dan', principalName: 'dan@acme.com', roleId: 'rol_application_owner', scope: S('tnt_acme', [], ['app_payments']), grantedBy: 'bob@acme.com', grantedOn: '2026-05-02' },
  { id: 'bnd_6', principalId: 'usr_grace', principalName: 'grace@acme.com', roleId: 'rol_application_owner', scope: S('tnt_acme', [], ['app_ecom', 'app_hrms']), grantedBy: 'bob@acme.com', grantedOn: '2026-05-06' },
  { id: 'bnd_7', principalId: 'usr_erin', principalName: 'erin@northwind.io', roleId: 'rol_platform_admin', scope: S('tnt_northwind'), grantedBy: 'alice@acme.com', grantedOn: '2026-05-19' },
  { id: 'bnd_8', principalId: 'usr_frank', principalName: 'frank@globex.com', roleId: 'rol_auditor', scope: S('tnt_globex'), grantedBy: 'alice@acme.com', grantedOn: '2026-06-01' },
];

/** Flattened union of atoms a principal holds, with provenance. */
export const effectivePermissions = (
  principalId: string,
  bindings: Binding[],
  roles: Role[],
): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  bindings
    .filter(b => b.principalId === principalId)
    .forEach(b => {
      const role = roles.find(r => r.id === b.roleId);
      role?.permissions.forEach(atom => {
        map.set(atom, [...(map.get(atom) ?? []), role.name]);
      });
    });
  return map;
};

export const describeScope = (scope: Scope): string => {
  const t = TENANTS.find(x => x.id === scope.tenantId)?.name ?? scope.tenantId;
  const parts: string[] = [t];
  parts.push(scope.businessUnitIds.length
    ? scope.businessUnitIds.map(id => BUSINESS_UNITS.find(b => b.id === id)?.name ?? id).join(', ')
    : 'All business units');
  if (scope.applicationIds.length) {
    parts.push(scope.applicationIds.map(id => APPLICATIONS.find(a => a.id === id)?.name ?? id).join(', '));
  }
  return parts.join(' / ');
};

export const scopedObjectCount = (scope: Scope): number => {
  const ids = scope.applicationIds.length
    ? scope.applicationIds
    : (scope.businessUnitIds.length ? scope.businessUnitIds : Object.keys(CRYPTO_OBJECT_COUNTS).filter(k => k.startsWith('bu_')));
  return ids.reduce((sum, id) => sum + (CRYPTO_OBJECT_COUNTS[id] ?? 0), 0);
};
