// src/data/rbac.ts
// AVX Trust Platform - RBAC permission taxonomy, system roles, and bindings.
// Permission atom grammar:  <domain>.<resource>:<action>
//
// Two invariants that must never be broken:
//   1. Scope is a property of the BINDING, never of the ROLE.
//   2. A principal may not grant a permission they do not hold, nor bind a role
//      to a scope wider than their own. See canGrant().

export type Action = "read" | "create" | "update" | "delete" | "execute" | "approve" | "export" | "grant";

export const ACTIONS: Action[] = ["read", "create", "update", "delete", "execute", "approve", "export", "grant"];

export const ACTION_LABEL: Record<Action, string> = {
  read: "Read",
  create: "Create",
  update: "Update",
  delete: "Delete",
  execute: "Execute",
  approve: "Approve",
  export: "Export",
  grant: "Grant",
};

export interface ResourceDef {
  resource: string;
  label: string;
  actions: Action[];
  /** Sub-heading in the permission matrix. Mirrors the Inventory nav tabs. */
  section?: string;
  /** Atoms with material blast radius. Rendered with a warning affordance. */
  sensitive?: Action[];
  /**
   * Default true. When false, granting create/update/delete does NOT auto-grant read.
   * Used where `read` means "reveal the secret", not "see that it exists".
   */
  impliesRead?: boolean;
  note?: string;
}

export interface DomainDef {
  domain: string;
  label: string;
  resources: ResourceDef[];
}

export const TAXONOMY: DomainDef[] = [
  {
    domain: "discovery",
    label: "Discovery",
    resources: [
      { resource: "profile", label: "Discovery Profile", actions: ["read", "create", "update", "delete"] },
      { resource: "run", label: "Discovery Run", actions: ["read", "execute", "delete"] },
      { resource: "cbom_import", label: "CBOM Ingestion", actions: ["read", "create"] },
    ],
  },
  {
    domain: "inventory",
    label: "Central Inventory",
    resources: [
      // Infrastructure tab
      {
        section: "Infrastructure",
        resource: "asset",
        label: "IT Asset",
        actions: ["read", "create", "update", "export"],
        note: "ARS is computed by the scoring engine and rides on the asset. It is not separately grantable.",
      },

      // Identities tab. One resource per tab, because the tab is the grant boundary.
      {
        section: "Identities",
        resource: "tls_certificate",
        label: "TLS Certificate",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "ssh_key",
        label: "SSH Key",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "ssh_certificate",
        label: "SSH Certificate",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "code_signing_certificate",
        label: "Code Signing Certificate",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "k8s_certificate",
        label: "Kubernetes Certificate",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "kms_key",
        label: "Cloud KMS Key",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "hsm_key",
        label: "HSM Key",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "secret",
        label: "Secret",
        actions: ["read", "create", "update", "delete", "export"],
      },
      {
        section: "Identities",
        resource: "private_key_material",
        label: "Private Key Material",
        actions: ["read", "export"],
        sensitive: ["read", "export"],
        impliesRead: false,
        note: "Grants sight of the key material itself, not merely its existence. Cuts across every identity type.",
      },

      // Crypto Assets tab. Discovered posture facts. Immutable by construction.
      {
        section: "Crypto Assets",
        resource: "protocol",
        label: "Protocol / Cipher Suite",
        actions: ["read", "export"],
        note: "Discovered, not managed. CRS is computed, not granted. A weak protocol is remediated at the endpoint.",
      },
      {
        section: "Crypto Assets",
        resource: "library",
        label: "Crypto Library",
        actions: ["read", "export"],
        note: "Discovered, not managed.",
      },

      // Groups tab, plus saved searches
      {
        section: "Groups",
        resource: "group",
        label: "Inventory Group",
        actions: ["read", "create", "update", "delete"],
      },
      {
        section: "Groups",
        resource: "saved_view",
        label: "Saved View / Search",
        actions: ["read", "create", "update", "delete"],
      },
    ],
  },
  {
    domain: "policy",
    label: "Policy Engine",
    resources: [
      {
        resource: "definition",
        label: "Policy Definition",
        actions: ["read", "create", "update", "delete"],
        note: "Create covers both the custom builder and AI-assisted authoring.",
      },
      { resource: "pack", label: "Policy Pack", actions: ["read", "create", "update", "delete"] },
      {
        resource: "exception",
        label: "Policy Exception",
        actions: ["read", "create", "update", "delete", "approve"],
        sensitive: ["approve"],
        note: "Approve must never sit in the same role as Create. Requesting and approving your own waiver is self-approval.",
      },
      { resource: "evaluation", label: "Policy Evaluation", actions: ["read", "execute"] },
    ],
  },
  {
    domain: "remediation",
    label: "Remediation",
    resources: [
      {
        resource: "ticket",
        label: "Ticket",
        actions: ["read", "create", "update"],
        note: "MVP remediates nothing directly. It raises a ticket in the customer ITSM.",
      },
      {
        resource: "certificate",
        label: "Certificate Remediation",
        actions: ["read", "execute"],
        sensitive: ["execute"],
        note: "Execute covers renew, reissue and push on a certificate. Non-destructive: it never invalidates a trusted object.",
      },
      {
        resource: "revocation",
        label: "Certificate Revocation",
        actions: ["read", "execute", "approve"],
        sensitive: ["execute", "approve"],
        note: "Execute initiates a revocation. Approve authorises a pending one. Maker and checker of a destructive action; they must never share a role.",
      },
      {
        resource: "key",
        label: "Key Remediation",
        actions: ["read", "execute"],
        sensitive: ["execute"],
        note: "Execute covers rotate and push for cloud KMS, HSM and SSH keys.",
      },
      {
        resource: "secret",
        label: "Secret Remediation",
        actions: ["read", "execute"],
        sensitive: ["execute"],
        note: "Execute covers rotate for vaulted secrets.",
      },
    ],
  },
  {
    domain: "quantum",
    label: "Quantum Readiness",
    resources: [
      { resource: "assessment", label: "PQC Assessment", actions: ["read", "execute", "export"] },
      { resource: "migration_plan", label: "Migration Plan", actions: ["read", "create", "update"] },
    ],
  },
  {
    domain: "integration",
    label: "Integrations",
    resources: [
      { resource: "connector", label: "Connector", actions: ["read", "create", "update", "delete", "execute"] },
      {
        resource: "credential",
        label: "Integration Credential",
        actions: ["read", "create", "update", "delete"],
        sensitive: ["read"],
        impliesRead: false,
        note: "Read reveals the secret. Rotation does not require it.",
      },
    ],
  },
  {
    domain: "mcp",
    label: "MCP Runtime",
    resources: [
      { resource: "agent", label: "MCP Agent", actions: ["read", "create", "update", "delete"] },
      { resource: "tool_invocation", label: "Tool Invocation", actions: ["read", "execute"], sensitive: ["execute"] },
    ],
  },
  {
    domain: "platform",
    label: "Platform Core",
    resources: [
      { resource: "user", label: "User", actions: ["read", "create", "update", "delete"] },
      {
        resource: "role",
        label: "Role",
        actions: ["read", "create", "update", "delete", "grant"],
        sensitive: ["grant"],
        note: "Grant is separated from Update. Editing a role and handing it out are the two halves of an escalation.",
      },
      { resource: "tenant", label: "Tenant", actions: ["read", "create", "update", "delete"], sensitive: ["delete"] },
      {
        resource: "business_unit",
        label: "Business Unit",
        actions: ["read", "create", "update", "delete"],
        sensitive: ["create"],
        note: "Creating a business unit creates a scope. Granting this widens the administrative surface.",
      },
      {
        resource: "api_key",
        label: "API Key / Service Account",
        actions: ["read", "create", "delete"],
        sensitive: ["create"],
      },
      {
        resource: "auth_provider",
        label: "Auth Provider",
        actions: ["read", "create", "update", "delete"],
        sensitive: ["update"],
      },
      { resource: "session", label: "Active Session", actions: ["read", "delete"] },
      { resource: "audit_log", label: "Audit Log", actions: ["read", "export"] },
      { resource: "license", label: "License", actions: ["read", "update"] },
      { resource: "infrastructure", label: "Infrastructure", actions: ["read", "update"] },
      { resource: "telemetry", label: "Telemetry", actions: ["read", "export"] },
      {
        resource: "notification_config",
        label: "Notification Settings",
        actions: ["read", "update"],
        note: "MVP sends alerts to a single configured address. There is no alert-rule engine.",
      },
    ],
  },
  {
    domain: "report",
    label: "Reporting",
    resources: [
      { resource: "dashboard", label: "Dashboard", actions: ["read"] },
      { resource: "compliance", label: "Compliance Report", actions: ["read", "export"] },
    ],
  },
];

export const ALL_ATOMS: string[] = TAXONOMY.flatMap((d) =>
  d.resources.flatMap((r) => r.actions.map((a) => `${d.domain}.${r.resource}:${a}`)),
);

export const TOTAL_ATOMS = ALL_ATOMS.length;

const resourceDef = (atom: string): ResourceDef | undefined => {
  const [lhs] = atom.split(":");
  const [domain, resource] = lhs.split(".");
  return TAXONOMY.find((d) => d.domain === domain)?.resources.find((x) => x.resource === resource);
};

export const isSensitive = (atom: string): boolean => {
  const action = atom.split(":")[1] as Action;
  return !!resourceDef(atom)?.sensitive?.includes(action);
};

/** Expand implied permissions. Non-read verbs imply read, unless impliesRead === false. */
export const expandImplied = (atoms: string[]): string[] => {
  const out = new Set(atoms);
  atoms.forEach((a) => {
    const [lhs, action] = a.split(":");
    if (action === "read") return;
    const def = resourceDef(a);
    if (def && def.impliesRead !== false && def.actions.includes("read")) out.add(`${lhs}:read`);
  });
  return [...out];
};

/* ------------------------------------------------------------------ */
/* Separation of duties                                                */
/* ------------------------------------------------------------------ */

export interface ToxicPair {
  a: string;
  b: string;
  reason: string;
}

// Authoring a control and granting a documented waiver against it is normal GRC practice.
// RAISING a waiver and approving it yourself is not. These pairs encode the latter.
// Platform Administrator trips every pair by design. The warning exists for custom roles.
export const TOXIC_PAIRS: ToxicPair[] = [
  {
    a: "policy.exception:create",
    b: "policy.exception:approve",
    reason: "Raise a control waiver and approve it yourself",
  },
  { a: "platform.role:update", b: "platform.role:grant", reason: "Edit a role definition and hand it to yourself" },
  {
    a: "platform.api_key:create",
    b: "platform.role:grant",
    reason: "Mint a service account and grant it a role. Unattributable backdoor",
  },
  {
    a: "remediation.revocation:execute",
    b: "remediation.revocation:approve",
    reason: "Initiate a certificate revocation and approve it yourself",
  },
];

export const sodViolations = (atoms: Iterable<string>): ToxicPair[] => {
  const set = new Set(atoms);
  return TOXIC_PAIRS.filter((p) => set.has(p.a) && set.has(p.b));
};

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
}

const atomsFor = (domain: string, resource?: string): string[] =>
  ALL_ATOMS.filter((a) => a.startsWith(resource ? `${domain}.${resource}:` : `${domain}.`));

/** The eight Identities tabs. Every crypto object with an owner and a lifecycle. */
export const IDENTITY_RESOURCES = [
  "tls_certificate",
  "ssh_key",
  "ssh_certificate",
  "code_signing_certificate",
  "k8s_certificate",
  "kms_key",
  "hsm_key",
  "secret",
];

/** The AVX SSH product boundary spans two resources, not one. */
export const SSH_RESOURCES = ["ssh_key", "ssh_certificate"];

/** Discovered posture facts. Read and export only. */
export const CRYPTO_ASSET_RESOURCES = ["protocol", "library"];

/** Every :read atom in the given domains, excluding resources where read reveals a secret. */
const readsFor = (...domains: string[]): string[] =>
  ALL_ATOMS.filter(
    (a) =>
      domains.some((d) => a.startsWith(`${d}.`)) &&
      a.endsWith(":read") &&
      !a.startsWith("inventory.private_key_material") &&
      !a.startsWith("integration.credential"),
  );

export const SYSTEM_ROLES: Role[] = [
  {
    id: "rol_platform_admin",
    name: "Platform Administrator",
    description: "Owns the AVX deployment. Full control of every resource and every tenant. Bootstrap role.",
    isSystem: true,
    permissions: [...ALL_ATOMS],
  },
  {
    id: "rol_security_admin",
    name: "Security Administrator",
    description:
      "Operates the platform. Runs discovery, manages inventory, configures integrations, raises tickets and requests policy exceptions. Cannot author policy, and cannot approve its own exceptions.",
    isSystem: true,
    permissions: expandImplied([
      ...atomsFor("discovery"),

      ...IDENTITY_RESOURCES.flatMap((r) => atomsFor("inventory", r)),
      ...CRYPTO_ASSET_RESOURCES.flatMap((r) => atomsFor("inventory", r)),
      ...atomsFor("inventory", "asset"),
      ...atomsFor("inventory", "group"),
      ...atomsFor("inventory", "saved_view"),

      "policy.definition:read",
      "policy.pack:read",
      "policy.evaluation:read",
      "policy.exception:read",
      "policy.exception:create",

      ...atomsFor("remediation", "ticket"),

      "quantum.assessment:read",
      "quantum.assessment:execute",
      "quantum.assessment:export",
      "quantum.migration_plan:read",

      ...atomsFor("integration", "connector"),
      "integration.credential:create",
      "integration.credential:update",
      "integration.credential:delete",

      "mcp.agent:read",
      "mcp.tool_invocation:read",

      "platform.session:read",
      "platform.session:delete",
      "platform.telemetry:read",
      "report.dashboard:read",
    ]),
  },
  {
    id: "rol_compliance_officer",
    name: "Compliance Officer",
    description:
      "Owns the control plane. Authors and tunes policies and packs, adjudicates exceptions, owns compliance reporting. Cannot run discovery or mutate inventory.",
    isSystem: true,
    permissions: expandImplied([
      ...atomsFor("policy", "definition"),
      ...atomsFor("policy", "pack"),
      ...atomsFor("policy", "evaluation"),
      "policy.exception:read",
      "policy.exception:update",
      "policy.exception:delete",
      "policy.exception:approve",

      "quantum.migration_plan:read",
      "quantum.migration_plan:create",
      "quantum.migration_plan:update",
      "quantum.assessment:read",
      "quantum.assessment:export",

      "remediation.ticket:read",
      "remediation.ticket:create",

      ...readsFor("inventory", "discovery", "integration", "mcp"),
      ...IDENTITY_RESOURCES.map((r) => `inventory.${r}:export`),
      ...CRYPTO_ASSET_RESOURCES.map((r) => `inventory.${r}:export`),
      "inventory.saved_view:create",
      "inventory.saved_view:update",
      "inventory.saved_view:delete",

      "platform.audit_log:read",
      "platform.audit_log:export",
      ...atomsFor("report"),
    ]),
  },
  {
    id: "rol_auditor",
    name: "Auditor",
    description:
      "Read-only across every module, with export. Internal audit, external assessors. Cannot see key material or integration credentials.",
    isSystem: true,
    permissions: [
      ...readsFor(...TAXONOMY.map((d) => d.domain)),
      ...IDENTITY_RESOURCES.map((r) => `inventory.${r}:export`),
      ...CRYPTO_ASSET_RESOURCES.map((r) => `inventory.${r}:export`),
      "inventory.asset:export",
      "quantum.assessment:export",
      "platform.audit_log:export",
      "platform.telemetry:export",
      "report.compliance:export",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Scope, principals, bindings                                         */
/* ------------------------------------------------------------------ */

export type PrincipalType = "user" | "group" | "service_account";

export interface Principal {
  id: string;
  name: string;
  type: PrincipalType;
  source?: string;
}

export type Environment = "production" | "non_production";

export const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: "production", label: "Production" },
  { id: "non_production", label: "Non-production" },
];

export interface Scope {
  tenantId: string;
  businessUnitIds: string[]; // empty = every business unit in the tenant
  environments?: Environment[]; // empty/undefined = every environment
  assetGroupIds?: string[]; // empty/undefined = every asset in scope; else scoped to these inventory asset groups
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

/** A tenant-wide binding in the root tenant descends into every child tenant. */
export const ROOT_TENANT_ID = "tnt_acme";

export const TENANTS = [
  { id: "tnt_acme", name: "Acme Corp (root)" },
  { id: "tnt_northwind", name: "Northwind Trading" },
  { id: "tnt_globex", name: "Globex Industrial" },
];

export const BUSINESS_UNITS = [
  { id: "bu_emea", name: "EMEA" },
  { id: "bu_amer", name: "Americas" },
  { id: "bu_apac", name: "APAC" },
  { id: "bu_corp", name: "Corporate IT" },
];

export const CRYPTO_OBJECT_COUNTS: Record<string, number> = {
  bu_emea: 4182,
  bu_amer: 6907,
  bu_apac: 2340,
  bu_corp: 1188,
};

export const PRINCIPAL_TYPE_LABEL: Record<PrincipalType, string> = {
  user: "User",
  group: "Group",
  service_account: "Service account",
};

export const PRINCIPALS: Principal[] = [
  { id: "usr_alice", name: "alice@acme.com", type: "user", source: "local" },
  { id: "usr_bob", name: "bob@acme.com", type: "user", source: "Okta" },
  { id: "usr_carol", name: "carol@acme.com", type: "user", source: "Okta" },
  { id: "usr_erin", name: "erin@northwind.io", type: "user", source: "Entra ID" },
  { id: "usr_frank", name: "frank@globex.com", type: "user", source: "Entra ID" },
  { id: "grp_pki_ops", name: "ACME\\PKI-Operations", type: "group", source: "AD" },
  { id: "grp_grc", name: "ACME\\Governance-Risk-Compliance", type: "group", source: "AD" },
  { id: "grp_internal_audit", name: "ACME\\Internal-Audit", type: "group", source: "AD" },
  { id: "svc_mcp_agent", name: "svc-mcp-runtime", type: "service_account", source: "local" },
  { id: "svc_servicenow", name: "svc-servicenow-sync", type: "service_account", source: "local" },
];

const S = (tenantId: string, bu: string[] = []): Scope => ({ tenantId, businessUnitIds: bu });

export const INITIAL_BINDINGS: Binding[] = [
  {
    id: "bnd_1",
    principalId: "usr_alice",
    principalName: "alice@acme.com",
    roleId: "rol_platform_admin",
    scope: S("tnt_acme"),
    grantedBy: "system",
    grantedOn: "2026-04-02",
  },
  {
    id: "bnd_2",
    principalId: "grp_pki_ops",
    principalName: "ACME\\PKI-Operations",
    roleId: "rol_security_admin",
    scope: S("tnt_acme"),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-04-11",
  },
  {
    id: "bnd_3",
    principalId: "usr_carol",
    principalName: "carol@acme.com",
    roleId: "rol_security_admin",
    scope: S("tnt_acme", ["bu_emea", "bu_apac"]),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-04-15",
  },
  {
    id: "bnd_4",
    principalId: "grp_grc",
    principalName: "ACME\\Governance-Risk-Compliance",
    roleId: "rol_compliance_officer",
    scope: S("tnt_acme"),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-04-18",
  },
  {
    id: "bnd_5",
    principalId: "usr_bob",
    principalName: "bob@acme.com",
    roleId: "rol_compliance_officer",
    scope: S("tnt_acme", ["bu_amer"]),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-05-02",
  },
  {
    id: "bnd_6",
    principalId: "grp_internal_audit",
    principalName: "ACME\\Internal-Audit",
    roleId: "rol_auditor",
    scope: S("tnt_acme"),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-05-06",
  },
  {
    id: "bnd_7",
    principalId: "usr_erin",
    principalName: "erin@northwind.io",
    roleId: "rol_platform_admin",
    scope: S("tnt_northwind"),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-05-19",
  },
  {
    id: "bnd_8",
    principalId: "usr_frank",
    principalName: "frank@globex.com",
    roleId: "rol_auditor",
    scope: S("tnt_globex"),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-06-01",
  },
  {
    id: "bnd_9",
    principalId: "svc_mcp_agent",
    principalName: "svc-mcp-runtime",
    roleId: "rol_security_admin",
    scope: S("tnt_acme", ["bu_corp"]),
    grantedBy: "alice@acme.com",
    grantedOn: "2026-06-11",
  },
];

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

/** Flattened union of atoms a principal holds, mapped to the roles that granted each. */
export const effectivePermissions = (
  principalId: string,
  bindings: Binding[],
  roles: Role[],
): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  bindings
    .filter((b) => b.principalId === principalId)
    .forEach((b) => {
      const role = roles.find((r) => r.id === b.roleId);
      role?.permissions.forEach((atom) => map.set(atom, [...(map.get(atom) ?? []), role.name]));
    });
  return map;
};

/** Reverse lookup. The question an auditor actually asks: who can export private key material? */
export const principalsWithAtom = (
  atom: string,
  bindings: Binding[],
  roles: Role[],
): { principal: Principal; via: string; scope: Scope }[] =>
  bindings
    .filter((b) => roles.find((r) => r.id === b.roleId)?.permissions.includes(atom))
    .map((b) => ({
      principal: PRINCIPALS.find((p) => p.id === b.principalId)!,
      via: roles.find((r) => r.id === b.roleId)!.name,
      scope: b.scope,
    }));

/** The union of every scope the actor holds, per tenant. */
export const actorScopeReach = (actorId: string, bindings: Binding[]) => {
  const reach = new Map<string, { all: boolean; bus: Set<string> }>();
  const mine = bindings.filter((b) => b.principalId === actorId);
  mine.forEach((b) => {
    const cur = reach.get(b.scope.tenantId) ?? { all: false, bus: new Set<string>() };
    if (!b.scope.businessUnitIds.length) cur.all = true;
    else b.scope.businessUnitIds.forEach((id) => cur.bus.add(id));
    reach.set(b.scope.tenantId, cur);
  });
  // Root-tenant descent: a tenant-wide binding in the root tenant reaches every child tenant.
  if (reach.get(ROOT_TENANT_ID)?.all) {
    TENANTS.forEach((t) => reach.set(t.id, { all: true, bus: new Set<string>() }));
  }
  return reach;
};

/**
 * Two-axis escalation guard.
 *   Axis 1: you cannot grant a permission you do not hold.  (Keyfactor Permission Sets)
 *   Axis 2: you cannot grant a scope wider than your own.   (Azure AssignableScopes, Sectigo MRAO/RAO/DRAO)
 * Enforced server side in production. This copy exists so the UI can explain itself.
 */
export const canGrant = (
  actorId: string,
  role: Role,
  target: Scope,
  bindings: Binding[],
  roles: Role[],
): { ok: boolean; reason?: string } => {
  const held = new Set(effectivePermissions(actorId, bindings, roles).keys());
  const missing = role.permissions.filter((a) => !held.has(a));
  if (missing.length) {
    return {
      ok: false,
      reason: `You do not hold ${missing.length} of this role's permissions, including ${missing[0]}`,
    };
  }
  const reach = actorScopeReach(actorId, bindings).get(target.tenantId);
  if (!reach) return { ok: false, reason: "You hold no binding in the target tenant" };
  if (reach.all) return { ok: true };
  if (!target.businessUnitIds.length) {
    return {
      ok: false,
      reason: "You cannot grant tenant-wide scope. Your own bindings are limited to specific business units",
    };
  }
  const outside = target.businessUnitIds.filter((id) => !reach.bus.has(id));
  if (outside.length) {
    const names = outside.map((id) => BUSINESS_UNITS.find((b) => b.id === id)?.name ?? id).join(", ");
    return { ok: false, reason: `You cannot grant scope outside your own reach: ${names}` };
  }
  return { ok: true };
};

export const describeScope = (scope: Scope): string => {
  const t = TENANTS.find((x) => x.id === scope.tenantId)?.name ?? scope.tenantId;
  const bu = scope.businessUnitIds.length
    ? scope.businessUnitIds.map((id) => BUSINESS_UNITS.find((b) => b.id === id)?.name ?? id).join(", ")
    : "All business units";
  const parts = [`${t} / ${bu}`];
  if (scope.assetGroupIds?.length) {
    parts.push(scope.assetGroupIds.map((id) => ASSET_GROUPS.find((g) => g.id === id)?.name ?? id).join(", "));
  }
  if (scope.environments?.length && scope.environments.length < ENVIRONMENTS.length) {
    parts.push(scope.environments.map((e) => ENVIRONMENTS.find((x) => x.id === e)?.label ?? e).join(" + "));
  }
  return parts.join(" · ");
};

export const scopedObjectCount = (scope: Scope): number => {
  const ids = scope.businessUnitIds.length ? scope.businessUnitIds : Object.keys(CRYPTO_OBJECT_COUNTS);
  return ids.reduce((sum, id) => sum + (CRYPTO_OBJECT_COUNTS[id] ?? 0), 0);
};

/* ------------------------------------------------------------------ */
/* Inventory asset groups (Model B: dynamic groups over IT assets)     */
/* ------------------------------------------------------------------ */

/**
 * Groups are defined over IT ASSETS, with membership driven by object-level
 * conditions. Remediation is scoped to a group; the verbs then act on the
 * crypto objects associated with the assets in that group. Scope is asset-level,
 * action is object-level, authority flows asset -> object.
 */
export interface AssetGroup {
  id: string;
  name: string;
  /** Human-readable form of the object-level condition that defines membership. */
  condition: string;
  environment: Environment;
  businessUnitId: string;
  assetCount: number; // IT assets currently matching the condition
  objectCount: number; // crypto objects associated with those assets
  /** Of objectCount, the objects also associated with assets OUTSIDE this group (multi-homed). */
  sharedObjectCount: number;
}

export const ASSET_GROUPS: AssetGroup[] = [
  {
    id: "ag_pay_nonprod",
    name: "Payments · Non-production",
    condition: "app = payments AND env = non-prod",
    environment: "non_production",
    businessUnitId: "bu_amer",
    assetCount: 214,
    objectCount: 1863,
    sharedObjectCount: 41,
  },
  {
    id: "ag_pay_prod",
    name: "Payments · Production",
    condition: "app = payments AND env = prod",
    environment: "production",
    businessUnitId: "bu_amer",
    assetCount: 168,
    objectCount: 2410,
    sharedObjectCount: 137,
  },
  {
    id: "ag_edge_lb_prod",
    name: "Edge load balancers · Production",
    condition: "role = load-balancer AND env = prod",
    environment: "production",
    businessUnitId: "bu_emea",
    assetCount: 92,
    objectCount: 1547,
    sharedObjectCount: 268, // wildcard certs fronting many hosts
  },
  {
    id: "ag_k8s_dev",
    name: "Kubernetes clusters · Dev/Test",
    condition: "platform = kubernetes AND env = non-prod",
    environment: "non_production",
    businessUnitId: "bu_apac",
    assetCount: 340,
    objectCount: 2201,
    sharedObjectCount: 22,
  },
  {
    id: "ag_legacy_ca",
    name: "Assets on legacy CA · All environments",
    condition: "object.tls_certificate.issuer IN (legacy-root-g1, legacy-root-g2)",
    environment: "production",
    businessUnitId: "bu_corp",
    assetCount: 611,
    objectCount: 894,
    sharedObjectCount: 73,
  },
];

/** How a remediation verb resolves for an object that spans the scope boundary. */
export type MultiHomedPolicy = "permissive" | "strict" | "warn";
/** Non-prod-scoped authority must not silently reach into prod via a shared object. */
export const MULTI_HOMED_POLICY: MultiHomedPolicy = "warn";

/** Resolve a binding scope down to the crypto objects it actually covers. */
export const resolveScopeObjects = (
  scope: Scope,
): { assetCount: number; objectCount: number; sharedObjectCount: number } => {
  let groups = ASSET_GROUPS;
  if (scope.assetGroupIds?.length) groups = groups.filter((g) => scope.assetGroupIds!.includes(g.id));
  if (scope.businessUnitIds.length) groups = groups.filter((g) => scope.businessUnitIds.includes(g.businessUnitId));
  if (scope.environments?.length) groups = groups.filter((g) => scope.environments!.includes(g.environment));
  return groups.reduce(
    (acc, g) => ({
      assetCount: acc.assetCount + g.assetCount,
      objectCount: acc.objectCount + g.objectCount,
      sharedObjectCount: acc.sharedObjectCount + g.sharedObjectCount,
    }),
    { assetCount: 0, objectCount: 0, sharedObjectCount: 0 },
  );
};

/** Membership sizes, so a group binding can report how many people it actually moves. */
export const GROUP_MEMBERSHIP: Record<string, number> = {
  grp_pki_ops: 47,
  grp_grc: 12,
  grp_internal_audit: 6,
};

/** How many end users a binding to this principal actually affects. */
export const principalReach = (principalId: string): number => {
  const p = PRINCIPALS.find((x) => x.id === principalId);
  if (!p) return 0;
  if (p.type === "group") return GROUP_MEMBERSHIP[principalId] ?? 1;
  return 1;
};

/* ------------------------------------------------------------------ */
/* Intent-based access                                                 */
/* ------------------------------------------------------------------ */
/**
 * The admin states an outcome in one sentence:
 *   <group> can <capabilities> on <object types> in <asset group + environment>.
 * compileIntent() expands that to concrete atoms against the SAME taxonomy the
 * matrix uses, resolves the object set, and checks SoD. Intent compiles TO atoms;
 * it does not replace them. The matrix stays the ground truth for auditors.
 */

/** Object types that carry a remediation lifecycle. */
export const REMEDIABLE_CERTS = ["tls_certificate", "ssh_certificate", "code_signing_certificate", "k8s_certificate"];
export const REMEDIABLE_KEYS = ["ssh_key", "kms_key", "hsm_key"];
export const REMEDIABLE_SECRETS = ["secret"];
export const REMEDIABLE_RESOURCES = [...REMEDIABLE_CERTS, ...REMEDIABLE_KEYS, ...REMEDIABLE_SECRETS];

const remediationFamily = (resource: string): string | null => {
  if (REMEDIABLE_CERTS.includes(resource)) return "certificate";
  if (REMEDIABLE_KEYS.includes(resource)) return "key";
  if (REMEDIABLE_SECRETS.includes(resource)) return "secret";
  return null;
};

export interface Capability {
  id: string;
  label: string;
  /** Reads as a verb phrase inside the intent sentence. */
  phrase: string;
  hint: string;
  destructive?: boolean;
  /** True for the checker half of a maker-checker pair. */
  isApprover?: boolean;
  /** Atoms this capability grants for the chosen object types. */
  atoms: (resources: string[]) => string[];
}

const uniq = (xs: string[]) => [...new Set(xs)];

export const CAPABILITIES: Capability[] = [
  {
    id: "cap_view",
    label: "View",
    phrase: "view",
    hint: "See the objects and their posture. No mutation.",
    atoms: (rs) => rs.map((r) => `inventory.${r}:read`),
  },
  {
    id: "cap_remediate",
    label: "Remediate",
    phrase: "remediate",
    hint: "Renew, reissue, rotate and push. Non-destructive lifecycle repair.",
    atoms: (rs) =>
      uniq(
        rs
          .map(remediationFamily)
          .filter((f): f is string => !!f)
          .map((f) => `remediation.${f}:execute`),
      ),
  },
  {
    id: "cap_revoke",
    label: "Revoke (initiate)",
    phrase: "initiate revocation of",
    hint: "Destructive. Invalidates a trusted certificate. Requires a separate approver.",
    destructive: true,
    atoms: (rs) => (rs.some((r) => REMEDIABLE_CERTS.includes(r)) ? ["remediation.revocation:execute"] : []),
  },
  {
    id: "cap_approve_revoke",
    label: "Approve revocations",
    phrase: "approve revocations of",
    hint: "The checker. Authorises a pending revocation someone else initiated.",
    isApprover: true,
    atoms: () => ["remediation.revocation:approve"],
  },
  {
    id: "cap_manage_lifecycle",
    label: "Manage lifecycle",
    phrase: "manage the lifecycle of",
    hint: "Create, update and delete inventory records for these object types.",
    atoms: (rs) => uniq(rs.flatMap((r) => [`inventory.${r}:create`, `inventory.${r}:update`, `inventory.${r}:delete`])),
  },
  {
    id: "cap_request_ticket",
    label: "Request via ticket",
    phrase: "raise remediation tickets for",
    hint: "No direct action. Opens a change ticket in the customer ITSM.",
    atoms: () => ["remediation.ticket:read", "remediation.ticket:create"],
  },
];

export interface IntentDraft {
  principalId?: string;
  capabilityIds: string[];
  resourceTypes: string[]; // subset of REMEDIABLE_RESOURCES
  scope: Scope;
}

export interface CompiledIntent {
  atoms: string[];
  roleName: string;
  assetCount: number;
  objectCount: number;
  sharedObjectCount: number;
  usersAffected: number;
  sod: ToxicPair[];
  warnings: string[];
  ok: boolean;
}

/** Compile an intent sentence into atoms + a resolved, checked grant. */
export const compileIntent = (draft: IntentDraft): CompiledIntent => {
  const caps = CAPABILITIES.filter((c) => draft.capabilityIds.includes(c.id));
  const atoms = expandImplied(uniq(caps.flatMap((c) => c.atoms(draft.resourceTypes))));
  const { assetCount, objectCount, sharedObjectCount } = resolveScopeObjects(draft.scope);
  const usersAffected = draft.principalId ? principalReach(draft.principalId) : 0;
  const sod = sodViolations(atoms);

  const inProd = !draft.scope.environments?.length || draft.scope.environments.includes("production");
  const destructive = caps.some((c) => c.destructive);
  const hasApprover = caps.some((c) => c.isApprover);

  const warnings: string[] = [];
  if (destructive && inProd) {
    warnings.push(
      "Destructive remediation reaches Production. Scope to Non-production for execute-only, request-only in prod.",
    );
  }
  if (destructive && !hasApprover) {
    warnings.push(
      "Revocation is maker-only here. A separate group must hold Approve revocations, or every revocation stalls.",
    );
  }
  if (destructive && sharedObjectCount > 0 && MULTI_HOMED_POLICY !== "permissive") {
    warnings.push(
      `${sharedObjectCount} object${sharedObjectCount === 1 ? " is" : "s are"} multi-homed (shared with assets outside this group). Revoking them affects assets beyond the scope.`,
    );
  }
  sod.forEach((p) => warnings.push(`Separation of duties: ${p.reason}.`));

  const capLabel = caps.map((c) => c.label).join(" + ") || "Access";
  const groupName =
    draft.scope.assetGroupIds?.length === 1
      ? ASSET_GROUPS.find((g) => g.id === draft.scope.assetGroupIds![0])?.name
      : undefined;
  const roleName = `${capLabel}${groupName ? ` · ${groupName}` : ""}`;

  return {
    atoms,
    roleName,
    assetCount,
    objectCount,
    sharedObjectCount,
    usersAffected,
    sod,
    warnings,
    ok: !!draft.principalId && atoms.length > 0 && draft.resourceTypes.length > 0 && sod.length === 0,
  };
};
