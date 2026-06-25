import React, { useState, useMemo, useEffect } from 'react';
import { StatusBadge } from '@/components/shared/UIComponents';
import { useNav } from '@/context/NavigationContext';
import { useIntegrations } from '@/context/IntegrationsContext';
import { useConnections, formatRelativeTime } from '@/context/ConnectionsContext';
import {
  useProfiles, useRuns, formatRelative, formatRelativeFuture,
  formatDuration, formatSchedule, computeNextRun, DiscoveryProfile,
} from '@/context/DiscoveryContext';
import { toast } from 'sonner';
import {
  Search, RefreshCw, Plus, Play, Database, Radar, ShieldCheck, Cloud, Lock,
  Activity, Copy, Edit, Calendar, Filter, X, Check, AlertCircle, AlertTriangle, ArrowLeft, Info, Sparkles,
} from 'lucide-react';

// ============================================================================
// FINALIZED DISCOVERY METHODS (Unified Discovery Framework, MVP scope)
// One scan method per category. Content matches the locked PLT requirements.
// ============================================================================
type ConfigKey = 'network' | 'sshauth' | 'ca' | 'cloud' | 'secrets' | 'thirdparty';

interface ScanType { value: string; description: string; config: ConfigKey; discovers: string[]; }
interface ScanCategory { category: string; icon: React.ComponentType<{ className?: string }>; description: string; types: ScanType[]; }

const scanCategories: ScanCategory[] = [
  {
    category: 'Active Scanning', icon: Radar,
    description: 'Network discovery via protocol handshakes and authenticated SSH scan',
    types: [{
      value: 'Network Scan', config: 'network',
      description: 'Agentless probing of IP and DNS targets. Discovers TLS, SSH, IPsec/VPN and Kubernetes endpoints across the configured ports.',
      discovers: ['TLS Certificates', 'Cipher Suites', 'Protocol Versions', 'SSH Host Keys', 'IPsec/VPN'],
    }, {
      value: 'SSH Keys & Certificate Scan', config: 'sshauth',
      description: 'Authenticated SSH scan. Logs into hosts to discover and onboard user and host keys and host certificates into inventory with compliance policy.',
      discovers: ['SSH User Keys', 'SSH Host Keys', 'Host Certificates', 'Compliance Mapping'],
    }],
  },
  {
    category: 'Certificate Authority', icon: ShieldCheck,
    description: 'Pull issued certificate inventory directly from the configured CA',
    types: [{
      value: 'CA Discovery', config: 'ca',
      description: 'Pulls issued certificate inventory from GlobalSign Atlas: issued, revoked and expired status and chain of trust.',
      discovers: ['Issued Certificates', 'Revocation Status', 'Chain of Trust'],
    }],
  },
  {
    category: 'Cloud', icon: Cloud,
    description: 'Enumerate certificates, keys and secrets across AWS and Azure accounts',
    types: [{
      value: 'Cloud Discovery', config: 'cloud',
      description: 'Enumerates certificates, keys and secrets across AWS and Azure accounts using the configured cloud connection.',
      discovers: ['Certificates', 'Keys', 'Secrets handoff'],
    }],
  },
  {
    category: 'Secrets & Key Stores', icon: Lock,
    description: 'Metadata-only enumeration from vaults, HSMs and secret stores',
    types: [{
      value: 'Secrets & Key Store Discovery', config: 'secrets',
      description: 'Metadata-only enumeration of certificates, keys, secrets and credentials in vaults, HSMs and secret stores.',
      discovers: ['Certificates', 'Keys', 'Secrets', 'Credentials'],
    }],
  },
  {
    category: 'Third-Party & Imported', icon: Database,
    description: 'Import vulnerability scanner findings and CBOM inventory',
    types: [{
      value: 'Third-Party Data Ingestion', config: 'thirdparty',
      description: 'Imports vulnerability scanner findings (Qualys, Tenable) and CBOM inventory (CycloneDX 1.6, including QTH).',
      discovers: ['Vulnerability Findings', 'CBOM Components'],
    }],
  },
];

// ============================================================================
// AI-NATIVE DISCOVERY PLANNER (hybrid: live model call, deterministic fallback)
// ----------------------------------------------------------------------------
// The unit produced is a DISCOVERY PLAN: a sequenced set of methods, each with
// resolved fields and a one-line reason per non-obvious decision. This is what
// the manual form cannot do: it sees one method; the planner reasons across all
// of them to answer a single question ("find quantum-vulnerable certs before
// the AWS prod migration" -> Network + Cloud + CA, sequenced).
//
// Engine: planDiscovery() tries the in-artifact Anthropic API and validates the
// JSON against scope (known methods, known connections, no invented IPs/creds).
// On any failure (network, timeout, malformed, off-scope) it falls back to a
// deterministic planner. Both paths return the identical DiscoveryPlan shape,
// which is also the tool contract Infinity AI can call later to plan a scan.
//
// Boundary: this planner decides what to GO FIND (discovery verbs). Questions
// about what you already HAVE (inventory/posture queries) are Infinity AI's job
// and are detected here and redirected, never half-answered as a scan.
//
// Safety unchanged: prompt is untrusted, output is always an editable draft, the
// confirmation gate stays, RBAC is never widened, credentials never inline.
// ============================================================================

// Connections the planner may reference. Mirrors the config panels and
// Integrations. The planner never invents a connection.
const NL_CLOUD_CONNECTIONS: { provider: 'AWS' | 'Azure'; name: string; env: 'prod' | 'nonprod' }[] = [
  { provider: 'AWS', name: 'AWS - prod (123456789012)', env: 'prod' },
  { provider: 'AWS', name: 'AWS - sandbox (987654321098)', env: 'nonprod' },
  { provider: 'Azure', name: 'Azure - corp (corp-sub-01)', env: 'prod' },
  { provider: 'Azure', name: 'Azure - sandbox (sandbox-sub-02)', env: 'nonprod' },
];
const NL_SECRET_CONNECTIONS: { name: string; type: string; kind: 'vault' | 'hsm'; env: 'prod' | 'nonprod'; aliases: string[] }[] = [
  { name: 'HashiCorp Vault - prod', type: 'HashiCorp Vault', kind: 'vault', env: 'prod', aliases: ['hashicorp', 'vault'] },
  { name: 'HashiCorp Vault - dev', type: 'HashiCorp Vault', kind: 'vault', env: 'nonprod', aliases: ['hashicorp', 'vault'] },
  { name: 'CyberArk Conjur - prod', type: 'CyberArk Conjur', kind: 'vault', env: 'prod', aliases: ['cyberark', 'conjur'] },
  { name: 'Crypto4A HSM - dc1', type: 'Crypto4A HSM', kind: 'hsm', env: 'prod', aliases: ['crypto4a', 'hsm'] },
  { name: 'Utimaco HSM - dc1', type: 'Utimaco HSM', kind: 'hsm', env: 'prod', aliases: ['utimaco', 'hsm'] },
];

// Panel-specific pre-fill payloads, applied to the existing config panels on accept.
type PrefillNetwork = { kind: 'network'; tlsVersions?: string[]; objectsNote?: string };
type PrefillCA = { kind: 'ca'; status?: string };
type PrefillCloud = { kind: 'cloud'; provider?: 'AWS' | 'Azure'; connection?: string; objects?: string[] };
type PrefillSecrets = { kind: 'secrets'; connectionName?: string; vaultType?: string; enumerate?: string[] };
type PrefillThirdParty = { kind: 'thirdparty'; sourceType?: 'Vulnerability Scanner' | 'CBOM' };
type Prefill = PrefillNetwork | PrefillCA | PrefillCloud | PrefillSecrets | PrefillThirdParty | null;

// A single method within a plan.
interface PlanStep {
  config: ConfigKey;        // which method
  category: string;         // scanCategories[].category
  type: string;            // ScanType.value
  rationale: string;        // why this method is in the plan (one line)
  decisions: string[];      // non-obvious field choices, each with its reason
  unresolved: string[];     // fields the user must complete (e.g. missing target)
  prefill: Prefill;         // applied to the panel on "Configure"
}

type PlanKind = 'plan' | 'query-redirect' | 'refused' | 'empty';
interface DiscoveryPlan {
  kind: PlanKind;
  intentEcho: string;       // the goal restated, so the user sees what was understood
  steps: PlanStep[];        // ordered; sequence is meaningful
  sequenceNote: string;     // why this order (empty for single-step)
  notes: string[];          // scope drops, conflicts, advisories
  source: 'ai' | 'rules';   // which engine produced this (for the demo footer)
}

const LIFECYCLE_VERBS = /\b(rotate|rotat|renew|revoke|remediat|reissue|re-issue|deprovision|decommission)\b/i;
const OUT_OF_SCOPE = /\b(gcp|google cloud|oracle cloud|oci|ibm cloud|ot |ot device|scada|plc|firmware|iot device)\b/i;
// Retrospective / inventory questions belong to Infinity AI, not a scan.
const QUERY_INTENT = /\b(what|which|how many|show me|list my|do i have|find my|where are my|report on|expiring|expired already|am i exposed|posture of)\b/i;
const DISCOVERY_VERBS = /\b(discover|scan|find|probe|enumerate|sweep|import|ingest|onboard|crawl|look for|search for)\b/i;

// Method routing labels.
function configToLabel(key: ConfigKey): string {
  for (const cat of scanCategories) for (const ty of cat.types) if (ty.config === key) return ty.value;
  return key;
}
function categoryForConfig(key: ConfigKey): { category: string; type: string } {
  for (const cat of scanCategories) for (const ty of cat.types) if (ty.config === key) return { category: cat.category, type: ty.value };
  return { category: scanCategories[0].category, type: scanCategories[0].types[0].value };
}

// ---- Field resolvers (shared by AI validation and the deterministic planner) ----
function resolveCloud(t: string): PrefillCloud & { connName?: string } {
  const provider: 'AWS' | 'Azure' | undefined = /\baws\b/.test(t) ? 'AWS' : /\bazure\b/.test(t) ? 'Azure' : undefined;
  let objects: string[] = [];
  if (/\b(tls|ssl|cert)\b/.test(t)) objects.push('Certificates');
  if (/\b(key|kms)\b/.test(t)) objects.push('Keys');
  if (/\bsecret/.test(t)) objects.push('Secrets handoff');
  if (objects.length === 0) objects = ['Certificates', 'Keys'];
  const envPref = /\b(prod|production)\b/.test(t) ? 'prod' : /\b(dev|sandbox|staging|test|non-prod|nonprod)\b/.test(t) ? 'nonprod' : null;
  let connection: string | undefined;
  if (provider) {
    const pool = NL_CLOUD_CONNECTIONS.filter(c => c.provider === provider);
    const pick = envPref ? pool.find(c => c.env === envPref) : pool[0];
    connection = pick?.name;
  }
  return { kind: 'cloud', provider, connection, objects };
}
function resolveSecrets(t: string): PrefillSecrets {
  const envPref = /\b(prod|production)\b/.test(t) ? 'prod' : /\b(dev|sandbox|staging|test)\b/.test(t) ? 'nonprod' : null;
  const named = NL_SECRET_CONNECTIONS.find(c => c.aliases.some(a => t.includes(a)) && (envPref ? c.env === envPref : true))
    || NL_SECRET_CONNECTIONS.find(c => c.aliases.some(a => t.includes(a)));
  if (!named) return { kind: 'secrets' };
  const enumerate = named.kind === 'hsm' ? ['Keys']
    : /\bsecret/.test(t) && /\bkey/.test(t) ? ['Certificates', 'Keys', 'Secrets']
    : /\bsecret/.test(t) ? ['Secrets'] : /\bcert/.test(t) ? ['Certificates'] : ['Certificates', 'Keys'];
  return { kind: 'secrets', connectionName: named.name, vaultType: named.type, enumerate };
}
function caStatusFor(t: string): string {
  if (/\brevoked\b/.test(t) && !/\bexpired\b/.test(t) && !/\bissued\b/.test(t)) return 'Revoked only';
  if (/\bexpired\b/.test(t) && !/\brevoked\b/.test(t)) return 'Expired only';
  return 'Issued + Revoked + Expired';
}

// ---- Deterministic planner: the fallback, and the demo's safety net ----
// Unlike the old single-field parser, this one can emit a MULTI-METHOD plan when
// the goal implies it (quantum / migration / "everywhere" / audit intents).
function deterministicPlan(raw: string): DiscoveryPlan {
  const text = raw.trim();
  const t = text.toLowerCase();
  const base: DiscoveryPlan = { kind: 'plan', intentEcho: text, steps: [], sequenceNote: '', notes: [], source: 'rules' };

  if (text.length < 3 || !/[a-z0-9]/i.test(text)) return { ...base, kind: 'empty', notes: ['Describe what to discover, for example "TLS certificates in AWS production".'] };
  if (LIFECYCLE_VERBS.test(t)) return { ...base, kind: 'refused', notes: ['Discovery is monitor-only. Rotate, renew, revoke and remediate run from the remediation module, not from a scan.'] };

  // Inventory question, not a discovery -> hand to Infinity AI.
  if (QUERY_INTENT.test(t) && !DISCOVERY_VERBS.test(t)) {
    return { ...base, kind: 'query-redirect', notes: ['This reads like a question about what you already have. Inventory and posture questions are answered by Infinity AI; discovery finds assets you do not yet know about.'] };
  }

  const notes: string[] = [];
  if (OUT_OF_SCOPE.test(t)) notes.push('Part of this is outside MVP scope (only AWS/Azure clouds and the listed vaults, HSMs, CA and scanners). The unsupported part was left out.');

  const mk = (config: ConfigKey, rationale: string, decisions: string[], unresolved: string[], prefill: Prefill): PlanStep => {
    const { category, type } = categoryForConfig(config); return { config, category, type, rationale, decisions, unresolved, prefill };
  };

  // ---- Cross-cutting scenarios: the moment the form cannot reach. ----
  // Each named goal produces a DISTINCT sequenced multi-method plan, so different
  // prompts visibly differ. All deterministic, all offline.
  const provider: 'AWS' | 'Azure' | undefined = /\baws\b/.test(t) ? 'AWS' : /\bazure\b/.test(t) ? 'Azure' : undefined;
  const cloud = resolveCloud(t);
  const hasCloudHint = !!provider || /\b(cloud|kms|acm|key vault|keyvault|s3|ec2)\b/.test(t);
  const hasCbom = /\b(cbom|cyclonedx|bom|sbom)\b/.test(t);
  const hasVaultHint = /\b(vault|hsm|secret|hashicorp|conjur|cyberark|crypto4a|utimaco|key store|keystore)\b/.test(t);

  // Reusable step builders so scenarios compose consistent, expert-grade cards.
  const caStep = (status: string, why: string, extra: string[] = []) =>
    mk('ca', why, ['Status set to ' + status + ' so the issued set is complete', 'Incremental pull on the Atlas cursor keeps the first correlation fast', ...extra], [], { kind: 'ca', status });
  const networkStep = (why: string, decisions: string[]) =>
    mk('network', why, decisions, ['Add the IP, CIDR or FQDN target range; a range is never assumed'], { kind: 'network', tlsVersions: ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'] });
  const cloudStep = (why: string, objects: string[], extra: string[] = []) =>
    mk('cloud', why,
      [provider ? 'Provider ' + provider + ' from the request' : 'Pick AWS or Azure below', cloud.connection ? 'Connection ' + cloud.connection : 'Confirm the connection below', 'Discover ' + objects.join(', '), ...extra],
      provider && !cloud.connection ? ['No ' + provider + ' ' + (/\bprod/.test(t) ? 'production ' : '') + 'connection matched; choose one or add it in Integrations'] : (!provider ? ['Choose AWS or Azure below'] : []),
      { kind: 'cloud', provider: cloud.provider, connection: cloud.connection, objects });
  const secretsStep = (why: string) => {
    const s = resolveSecrets(t);
    return mk('secrets', why,
      s.connectionName ? ['Connection ' + s.connectionName, 'Enumerate ' + (s.enumerate ?? []).join(', '), 'Metadata only; secret values are never extracted'] : ['Select a vault or HSM connection below'],
      s.connectionName ? [] : ['No matching vault or HSM connection found; select one below'], s);
  };
  const cbomStep = () =>
    mk('thirdparty', 'A supplied CBOM declares cryptographic components the active scans would otherwise miss, including inside third-party software.',
      ['Source type CBOM (CycloneDX 1.6)'], [], { kind: 'thirdparty', sourceType: 'CBOM' });
  const scannerStep = () =>
    mk('thirdparty', 'Existing vulnerability-scanner findings are folded in so known weak-crypto findings are not rediscovered from scratch.',
      ['Source type Vulnerability Scanner', 'Findings sit below native scans and CBOM in source priority'], [], { kind: 'thirdparty', sourceType: 'Vulnerability Scanner' });

  // Scenario signals.
  const quantum = /\b(quantum|pqc|post-quantum|post quantum|crypto-?agility|crypto agility|rsa-?1024|rsa-?2048|weak (algorithm|crypto|key)|non-quantum-safe|harvest now|harvest-now)\b/.test(t);
  const migration = /\b(migration|migrat|cutover|re-?platform|decommission plan|before .* (move|migrat|cut))\b/.test(t);
  const fullEstate = /\b(everywhere|all our|across (the )?(estate|environment|org|organisation|organization|infrastructure)|full inventory|complete picture|whole estate|enterprise-?wide|company-?wide|baseline (our|the))\b/.test(t);
  const compliance = /\b(pci|hipaa|soc ?2|fips|nist|cmmc|compliance|audit-?ready|auditor|attestation|regulat)\b/.test(t);
  const expiryRisk = /\b(expir|expiry|expiration|renewal risk|about to expire|expiring soon|outage risk|lapse|lapsing)/.test(t);
  const incident = /\b(breach|incident|compromise|compromised|exposed key|leaked|rotate after|post-?incident|forensic|blast radius)\b/.test(t);
  const weakProto = /\b(weak (protocol|cipher|tls|ssl)|deprecated (protocol|tls|cipher)|tls ?1\.0|tls ?1\.1|sslv3|legacy protocol|insecure cipher)/.test(t);

  // 1) Post-quantum / crypto-agility readiness: the widest, needs material from
  // every surface to judge algorithms.
  if (quantum) {
    const steps: PlanStep[] = [
      caStep('Issued + Revoked + Expired', 'Establishes the issued-certificate ground truth and the signature algorithms the CA used, before anything deployed is compared.'),
      networkStep('Finds what is presented on the wire, where weak key exchange and signature algorithms are actually observable, not just what was issued.',
        ['Probe all four TLS versions, since that is what surfaces weak protocol and key-exchange support', 'SNI pairing on so shared-IP certificates are not missed', 'Full posture depth for an audit-grade pass (cipher list, chain, revocation)']),
    ];
    if (hasCloudHint) steps.push(cloudStep('Cloud KMS and Key Vault hold key material the network probe cannot reach, so key type and size must be read directly.', ['Certificates', 'Keys'], ['Captures key algorithm and size for the quantum-risk view']));
    if (hasVaultHint) steps.push(secretsStep('Vault and HSM stores hold long-lived keys whose algorithm and size feed the quantum-sensitivity score.'));
    steps.push(hasCbom ? cbomStep() : scannerStep());
    return { ...base, steps,
      sequenceNote: 'CA first for the issued algorithms, then the network probe for what is live on the wire, then key stores for material off the wire, and finally the imported source. Algorithm risk only makes sense once issued and deployed are both known.',
      notes };
  }

  // 2) Pre-migration audit: know the deployed and issued footprint before a move.
  if (migration && (provider || hasCloudHint || /\bcert/.test(t) || fullEstate)) {
    const steps: PlanStep[] = [
      caStep('Issued + Revoked + Expired', 'Maps every issued certificate in the footprint so nothing in the migration scope is missed at cutover.'),
      networkStep('Captures what is actually deployed and serving today, so the migration inventory reflects reality rather than just records.',
        ['Probe all four TLS versions to flag anything that must not be carried forward', 'SNI pairing on to catch shared-IP certificates', 'Deep posture depth for the served chain and cipher list']),
    ];
    if (hasCloudHint) steps.push(cloudStep('The target and source cloud accounts hold certificates and keys that move with the workload.', ['Certificates', 'Keys']));
    return { ...base, steps,
      sequenceNote: 'CA first for the full issued set, then the network probe to confirm what is actually live, then the cloud account being migrated. The deployed-versus-issued gap is exactly the migration risk list.',
      notes };
  }

  // 3) Full-estate baseline / audit: one of every relevant surface.
  if (fullEstate || (compliance && !expiryRisk && !weakProto)) {
    const steps: PlanStep[] = [
      caStep('Issued + Revoked + Expired', 'Anchors the baseline on the authoritative issued set from the CA.', compliance ? ['Revoked and expired included for audit completeness'] : []),
      networkStep('Discovers everything presented across the network, the largest source of unknown certificates and protocols.',
        ['Probe all four TLS versions for full protocol posture', 'SNI pairing on for shared-IP coverage', 'Full posture depth for an audit-grade record']),
    ];
    steps.push(cloudStep('Cloud accounts hold certificates, keys and secret stores outside the network path.', ['Certificates', 'Keys', 'Secrets handoff']));
    if (hasVaultHint || fullEstate) steps.push(secretsStep('Vault and HSM enumeration completes the key picture with stored material.'));
    steps.push(hasCbom ? cbomStep() : scannerStep());
    return { ...base, steps,
      sequenceNote: 'Issued set first, then the network for what is deployed, then cloud and vault stores for material off the wire, then the imported source. Together these are the complete crypto surface; each later step fills a gap the earlier ones cannot see.',
      notes: compliance ? [...notes, 'Scoped for an audit-grade baseline: revoked and expired states are included so the record is complete for an assessor.'] : notes };
  }

  // 4) Weak-protocol / cipher hunt: deployed surface plus issued cross-check.
  if (weakProto || (compliance && /\b(tls|ssl|cipher|protocol)\b/.test(t))) {
    const steps: PlanStep[] = [
      networkStep('Weak protocols and ciphers are only observable in the live handshake, so the network probe leads.',
        ['Probe all four TLS versions, since deselecting any hides the weak ones you are hunting', 'Full posture depth so the full accepted cipher list is recorded', 'SNI pairing on so no shared-IP endpoint is skipped']),
      caStep('Issued + Revoked + Expired', 'The issued set cross-references each weak endpoint back to its certificate and owner for follow-up.'),
    ];
    if (hasCloudHint) steps.push(cloudStep('Cloud-fronted endpoints (ACM, Key Vault, CDN) terminate TLS outside the internal network and must be checked too.', ['Certificates']));
    return { ...base, steps,
      sequenceNote: 'Network first because weak protocols live in the handshake, then the CA to attribute each finding to a certificate, then cloud-terminated endpoints the internal probe cannot see.',
      notes };
  }

  // 5) Expiry / outage-risk sweep: issued set is authoritative, deployed confirms.
  if (expiryRisk) {
    const steps: PlanStep[] = [
      caStep('Issued + Revoked + Expired', 'The CA holds authoritative validity dates, so expiry risk is read from the issued set first.', ['Expired included so already-lapsed but still-deployed certs surface']),
      networkStep('Confirms which expiring certificates are actually still deployed and serving, which is what turns an expiry date into an outage risk.',
        ['Deep posture depth to read the served certificate and its expiry as deployed', 'SNI pairing on so shared-IP endpoints are included']),
    ];
    if (hasCloudHint) steps.push(cloudStep('Cloud certificate stores carry their own expiry that the network probe may not reach.', ['Certificates']));
    return { ...base, steps,
      sequenceNote: 'CA first for authoritative validity dates, then the network to confirm what is still live. An expiring certificate only matters if it is actually deployed.',
      notes };
  }

  // 6) Post-incident / breach sweep: find exposure fast across keys and certs.
  if (incident) {
    const steps: PlanStep[] = [
      networkStep('Immediately maps what is exposed and serving, the fastest read on blast radius after an incident.',
        ['Probe all four TLS versions to catch anything weak that aided the exposure', 'Full posture depth for chain and revocation state', 'SNI pairing on for complete coverage']),
    ];
    if (hasVaultHint || /\bkey\b/.test(t)) steps.push(secretsStep('Vault and HSM enumeration shows which stored keys sit inside the blast radius, metadata only.'));
    steps.push(caStep('Issued + Revoked + Expired', 'The issued set identifies every certificate that may need to be treated as compromised and tracked for replacement.', ['Revoked included to confirm what has already been pulled']));
    if (hasCloudHint) steps.push(cloudStep('Cloud key and secret stores are a common exposure path and are read directly.', ['Certificates', 'Keys', 'Secrets handoff']));
    return { ...base, steps,
      sequenceNote: 'Network first for the fastest exposure picture, then key stores for affected material, then the CA to enumerate certificates to treat as compromised. Speed to blast radius drives the order. Replacement and rotation happen in the remediation module, not here.',
      notes: [...notes, 'Discovery maps exposure only. Rotating or revoking affected material is a remediation action, run from the remediation module.'] };
  }

  // Single-method intents (still carry expert defaults, just one card).
  const scores: Record<ConfigKey, number> = { network: 0, sshauth: 0, ca: 0, cloud: 0, secrets: 0, thirdparty: 0 };
  if (/\b(tls|ssl|certificate|cert|endpoint|https|cipher)/.test(t)) scores.network += 1;
  if (/\b(network|subnet|cidr|ip range|ip address|internal network|probe|on the wire)\b/.test(t)) scores.network += 2;
  if (/\b(ssh|host key|user key|authorized key)\b/.test(t)) scores.sshauth += 3;
  if (/\b(ca|issued|issuer|globalsign|atlas|chain of trust)\b/.test(t)) scores.ca += 2;
  if (/\brevoked\b/.test(t)) scores.ca += 2;
  if (/\b(aws|azure|cloud|kms|acm|key vault|keyvault|managed hsm|s3|ec2|account)\b/.test(t)) scores.cloud += 2;
  if (/\b(vault|hsm|secret|secrets|hashicorp|conjur|cyberark|crypto4a|utimaco|key store|keystore)\b/.test(t)) scores.secrets += 2;
  if (/\b(cbom|cyclonedx|qualys|tenable|vulnerability|scanner finding|bom)\b/.test(t)) scores.thirdparty += 3;
  if (/\b(hashicorp|conjur|cyberark|crypto4a|utimaco)\b/.test(t)) scores.cloud = Math.max(0, scores.cloud - 2);
  if (/\b(azure|key vault|keyvault)\b/.test(t) && !/\b(hashicorp|conjur|cyberark|crypto4a|utimaco)\b/.test(t)) scores.secrets = Math.max(0, scores.secrets - 1);

  const ranked = (Object.entries(scores) as [ConfigKey, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return { ...base, kind: 'empty', notes: ['Could not map that to a method. Pick one below to configure manually.'] };

  const [top, topScore] = ranked[0];
  if (ranked[1] && ranked[1][1] === topScore) notes.push(`Ambiguous between ${configToLabel(top)} and ${configToLabel(ranked[1][0])}. Started with ${configToLabel(top)}; switch below if needed.`);

  let step: PlanStep;
  switch (top) {
    case 'network':
      step = mk('network', 'Probes targets without credentials and records what each endpoint presents.',
        ['Probe all four TLS versions to surface weak protocol support', 'SNI pairing on so shared-IP certificates are not missed'],
        [/\b(\d{1,3}\.){3}\d{1,3}\b|\/\d{1,2}\b|[a-z0-9-]+\.[a-z]{2,}/.test(t) ? '' : 'Add an IP, CIDR or FQDN target'].filter(Boolean),
        { kind: 'network', tlsVersions: ['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'] }); break;
    case 'sshauth':
      step = mk('sshauth', 'Logs into hosts to discover and onboard user and host keys with compliance policy.',
        ['Both user and host keys enabled'], ['Add the IP range and select stored credentials (credentials come from Integrations, never this prompt)'], null); break;
    case 'ca': {
      const status = caStatusFor(t);
      step = mk('ca', 'Pulls issued-certificate inventory directly from the CA.',
        [`Certificate status: ${status}`, 'Found certificates auto-correlate with deployed certs from Network Discovery'],
        [], { kind: 'ca', status });
      if (/\brevoked\b/.test(t) && /\bactive\b/.test(t)) notes.push('Conflicting status (revoked and active) requested. Confirm the filter below; nothing was silently dropped.');
      break;
    }
    case 'cloud': {
      const c = resolveCloud(t);
      step = mk('cloud', 'Enumerates certificates, keys and secrets across the cloud account.',
        [c.provider ? `Provider ${c.provider}` : 'Pick AWS or Azure', c.connection ? `Connection ${c.connection}` : 'Confirm the connection', `Discover ${(c.objects ?? []).join(', ')}`],
        c.provider && !c.connection ? [`No matching ${c.provider} connection; choose one or add it in Integrations`] : (!c.provider ? ['Choose AWS or Azure below'] : []),
        { kind: 'cloud', provider: c.provider, connection: c.connection, objects: c.objects }); break;
    }
    case 'secrets': {
      const s = resolveSecrets(t);
      step = mk('secrets', 'Metadata-only enumeration from the vault or HSM; secret values are never extracted.',
        s.connectionName ? [`Connection ${s.connectionName}`, `Enumerate ${(s.enumerate ?? []).join(', ')}`] : ['Select a vault or HSM connection below'],
        s.connectionName ? [] : ['No matching vault or HSM connection found; select one below'],
        s); break;
    }
    case 'thirdparty':
      step = mk('thirdparty', 'Imports findings or a CBOM rather than scanning live.',
        [/\b(cbom|cyclonedx|bom)\b/.test(t) ? 'Source type CBOM (CycloneDX 1.6)' : 'Source type Vulnerability Scanner'], [],
        { kind: 'thirdparty', sourceType: /\b(cbom|cyclonedx|bom)\b/.test(t) ? 'CBOM' : 'Vulnerability Scanner' }); break;
    default:
      return { ...base, kind: 'empty', notes: ['Could not map that. Pick a method below.'] };
  }
  return { ...base, steps: [step], notes };
}

// ---- Demo engine: deterministic, offline, zero network. planDiscovery is a thin
// synchronous wrapper over the planner so the surface stays async-shaped (the
// v2 live-model swap drops straight back in here) but spends nothing today. ----
function planDiscovery(raw: string): DiscoveryPlan {
  return deterministicPlan(raw);
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function DiscoveryPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [tab, setTab] = useState<'profiles' | 'runs'>('profiles');
  const [editingProfile, setEditingProfile] = useState<DiscoveryProfile | null>(null);

  const openCreate = (p: DiscoveryProfile | null) => { setEditingProfile(p); setView('create'); };
  const backToList = () => { setView('list'); setEditingProfile(null); };
  const finishTo = (dest: 'profiles' | 'runs') => { setView('list'); setEditingProfile(null); setTab(dest); };

  // New Scan surface (in-page view swap, not an overlay)
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={backToList} aria-label="Back to Discovery"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{editingProfile ? 'Edit Discovery' : 'Start Discovery'}</h1>
            <p className="text-[11px] text-muted-foreground">
              {editingProfile
                ? <>Editing <span className="text-foreground">{editingProfile.name}</span> · changes apply on save</>
                : 'Select a method, add the details, choose what to run against, and run.'}
            </p>
          </div>
        </div>
        <NewScanTab existing={editingProfile} onDone={finishTo} onCancel={backToList} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Discovery</h1>
          <p className="text-[11px] text-muted-foreground">Profiles · Scans · Runs · Unified Discovery Framework</p>
        </div>
        <button onClick={() => openCreate(null)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light">
          <Play className="w-3.5 h-3.5" /> Start Discovery
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['profiles', 'Profiles'], ['runs', 'Discovery Runs']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <ProfilesTab onEdit={(p) => openCreate(p)} onNew={() => openCreate(null)} />}
      {tab === 'runs' && <RunsTab />}
    </div>
  );
}

// ============================================================================
// TAB 1 — PROFILES
// ============================================================================
function ProfilesTab({ onEdit, onNew }: { onEdit: (p: DiscoveryProfile) => void; onNew: () => void }) {
  const [search, setSearch] = useState('');
  const { profiles } = useProfiles();
  const { latestRunForProfile, addRun, updateRun } = useRuns();

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.includes.some(t => t.toLowerCase().includes(search.toLowerCase())),
  );

  const runProfileNow = (p: DiscoveryProfile) => {
    const run = addRun({
      profileId: p.id, profileName: p.name, connectionId: p.connectionId, connectionName: p.connectionName,
      vaultType: p.vaultType, category: p.category, includes: p.includes, triggeredBy: 'manual',
    });
    toast.success(`"${p.name}" started on-demand`, { description: 'View progress in Discovery Runs' });
    setTimeout(() => {
      const items = 50 + Math.floor(Math.random() * 451);
      updateRun(run.id, { status: 'completed', completedAt: Date.now(), itemsDiscovered: items });
    }, 2000);
  };

  if (profiles.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-10 text-center space-y-3">
        <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">No discovery profiles yet</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Profiles save scan configurations so you can re-run them on a schedule. Create one from New Scan with "Save as profile" checked.
        </p>
        <button onClick={onNew} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light">
          <Plus className="w-3.5 h-3.5" /> Go to New Scan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search profiles by name, category, scan type…"
            className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <span className="text-[11px] text-muted-foreground">{filtered.length} of {profiles.length} profiles</span>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Profile</th>
                <th className="text-left px-3 py-2 font-medium">Category</th>
                <th className="text-left px-3 py-2 font-medium">Includes</th>
                <th className="text-left px-3 py-2 font-medium">Schedule</th>
                <th className="text-right px-3 py-2 font-medium">Discovered</th>
                <th className="text-left px-3 py-2 font-medium">Last run</th>
                <th className="text-left px-3 py-2 font-medium">Next run</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const latest = latestRunForProfile(p.id);
                const visibleIncludes = p.includes.slice(0, 2);
                const moreCount = p.includes.length - visibleIncludes.length;
                const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/20">
                    <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{p.name}</td>
                    <td className="px-3 py-2"><span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground whitespace-nowrap">{p.category}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {visibleIncludes.map(t => <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded bg-teal/10 text-teal border border-teal/20 whitespace-nowrap">{t}</span>)}
                        {moreCount > 0 && <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground whitespace-nowrap">+{moreCount} more</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap"><span className="inline-flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatSchedule(p.schedule)}</span></td>
                    <td className="px-3 py-2 text-right text-foreground tabular-nums font-medium">{latest?.itemsDiscovered != null && latest.status === 'completed' ? latest.itemsDiscovered.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatRelative(latest?.startedAt ?? p.lastRunAt)}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatRelativeFuture(p.nextRunAt)}</td>
                    <td className="px-3 py-2"><StatusBadge status={statusLabel} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => runProfileNow(p)} className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded bg-teal text-primary-foreground hover:bg-teal-light"><Play className="w-2.5 h-2.5" /> Run</button>
                        <button onClick={() => onEdit(p)} className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"><Edit className="w-2.5 h-2.5" /> Edit</button>
                        <button onClick={() => toast.success(`Cloned "${p.name}"`)} className="flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"><Copy className="w-2.5 h-2.5" /> Clone</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No profiles match your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <button onClick={onNew} className="w-full border-t border-dashed border-border hover:bg-secondary/30 transition-colors flex items-center justify-center gap-1.5 py-3 text-muted-foreground hover:text-teal">
          <Plus className="w-4 h-4" /><span className="text-xs font-medium">New Profile</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2 — NEW SCAN
// ============================================================================
function NewScanTab({ existing, onDone, onCancel }: { existing: DiscoveryProfile | null; onDone: (dest: 'profiles' | 'runs') => void; onCancel: () => void }) {
  const initialCategory = existing
    ? scanCategories.find(c => c.category === existing.category) ?? scanCategories[0]
    : scanCategories[0];
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory.category);
  const [selectedType, setSelectedType] = useState<ScanType>(initialCategory.types[0]);
  const [discoveryName, setDiscoveryName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [profileName, setProfileName] = useState(existing?.name ?? '');
  const [runType, setRunType] = useState<'on-demand' | 'schedule'>(existing?.schedule ? 'schedule' : 'on-demand');
  const [scheduleFreq, setScheduleFreq] = useState(existing?.schedule?.freq ?? 'Daily');
  const [scheduleTime, setScheduleTime] = useState(existing?.schedule?.time ?? '02:00');
  const [scheduleDay, setScheduleDay] = useState(existing?.schedule?.day ?? 'Sunday');

  // Lifted secrets state — used when category is "Secrets & Key Stores"
  const { byVaultType } = useConnections();
  const [vaultType, setVaultType] = useState(existing?.vaultType || 'HashiCorp Vault');
  const [vaultAccountId, setVaultAccountId] = useState(existing?.connectionId ?? '');
  const [authMethod, setAuthMethod] = useState('AppRole');
  const [secretTypes, setSecretTypes] = useState<string[]>(existing?.includes ?? ['Certificates', 'Encryption Keys']);

  // AI planner: the produced plan, plus a nonce so config panels re-apply prefill
  const [nlText, setNlText] = useState('');
  const [plan, setPlan] = useState<DiscoveryPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [acceptedStep, setAcceptedStep] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<Prefill>(null);
  const [prefillNonce, setPrefillNonce] = useState(0);

  const { addProfile, updateProfile } = useProfiles();
  const { addRun, updateRun } = useRuns();

  const currentCategory = scanCategories.find(c => c.category === activeCategory)!;
  const isEditing = existing != null;
  const isSecretsScan = selectedType.config === 'secrets';

  const resetForm = () => {
    setDiscoveryName(''); setDescription(''); setSaveAsProfile(false); setProfileName('');
    setRunType('on-demand'); setVaultAccountId(''); setSecretTypes(['Certificates', 'Encryption Keys']);
  };

  const buildScheduleObj = () =>
    runType === 'schedule'
      ? { freq: scheduleFreq, time: scheduleTime, ...(scheduleFreq === 'Weekly' ? { day: scheduleDay } : {}) }
      : null;

  const resolveConnection = () => {
    if (isSecretsScan) {
      const conn = byVaultType(vaultType).find(c => c.id === vaultAccountId);
      if (conn) return { connectionId: conn.id, connectionName: conn.name, resolvedVaultType: conn.vaultType, includes: secretTypes };
      if (vaultAccountId) return { connectionId: vaultAccountId, connectionName: vaultAccountId, resolvedVaultType: vaultType, includes: secretTypes };
      return null;
    }
    return { connectionId: `inline_${selectedType.config}`, connectionName: selectedType.value, resolvedVaultType: selectedType.value, includes: selectedType.discovers };
  };

  const handleStart = () => {
    if (!discoveryName.trim()) { toast.error('Discovery name is required'); return; }
    if (saveAsProfile && !profileName.trim()) { toast.error('Profile name is required'); return; }
    const resolved = resolveConnection();
    if (!resolved) { toast.error('Please select a connection before starting.'); return; }
    const { connectionId, connectionName, resolvedVaultType, includes } = resolved;
    const schedule = buildScheduleObj();
    let profileId: string | null = null;
    let savedProfileName: string | null = null;
    if (saveAsProfile) {
      const prof = addProfile({
        name: profileName.trim(), description, connectionId, connectionName, vaultType: resolvedVaultType,
        category: activeCategory, includes, scanScope: { scanType: selectedType.value, authMethod },
        schedule, nextRunAt: computeNextRun(schedule),
      });
      profileId = prof.id; savedProfileName = prof.name;
    }
    const fromNl = plan?.kind === 'plan' && plan.steps.length > 0;
    const run = addRun({ profileId, profileName: savedProfileName, connectionId, connectionName, vaultType: resolvedVaultType, category: activeCategory, includes, triggeredBy: 'manual' });
    setTimeout(() => {
      const items = 50 + Math.floor(Math.random() * 451);
      updateRun(run.id, { status: 'completed', completedAt: Date.now(), itemsDiscovered: items });
    }, 2000);
    toast.success('Discovery started. View progress in Discovery Runs.', fromNl ? { description: 'Planned from a natural-language goal; resolved config shown above.' } : undefined);
    resetForm(); onDone('runs');
  };

  const handleSaveOnly = () => {
    if (!profileName.trim()) { toast.error('Profile name is required'); return; }
    const resolved = resolveConnection();
    if (!resolved) { toast.error('Please select a connection before saving.'); return; }
    const { connectionId, connectionName, resolvedVaultType, includes } = resolved;
    const schedule = buildScheduleObj();
    addProfile({
      name: profileName.trim(), description, connectionId, connectionName, vaultType: resolvedVaultType,
      category: activeCategory, includes, scanScope: { scanType: selectedType.value, authMethod },
      schedule, nextRunAt: computeNextRun(schedule),
    });
    toast.success(`Profile "${profileName}" saved`);
    resetForm(); onDone('profiles');
  };

  const runPlanner = (text: string) => {
    if (!text.trim() || planning) return;
    setPlanning(true); setAcceptedStep(null); setPlan(null);
    // Planner is deterministic and offline. A brief delay keeps the "Planning"
    // state visible so the reasoning reads as deliberate rather than instant.
    const result = planDiscovery(text);
    setTimeout(() => {
      setPlan(result);
      setPlanning(false);
      if (result.kind === 'plan' && result.steps.length > 0) {
        setTimeout(() => document.getElementById('discovery-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }
    }, 550);
  };

  // Accept one step of the plan: select its method and pre-fill the existing panel.
  const applyStep = (idx: number) => {
    const step = plan?.steps[idx];
    if (!step) return;
    const cat = scanCategories.find(c => c.category === step.category)!;
    const ty = cat.types.find(x => x.value === step.type) ?? cat.types[0];
    setActiveCategory(cat.category);
    setSelectedType(ty);
    setPrefill(step.prefill);
    setPrefillNonce(n => n + 1);
    setAcceptedStep(idx);
    if (step.prefill?.kind === 'secrets') {
      if (step.prefill.connectionName) { setVaultAccountId(step.prefill.connectionName); if (step.prefill.vaultType) setVaultType(step.prefill.vaultType); }
      if (step.prefill.enumerate) setSecretTypes(step.prefill.enumerate);
    }
    setTimeout(() => document.getElementById('discovery-config-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const dropStep = (idx: number) => {
    if (!plan) return;
    const steps = plan.steps.filter((_, i) => i !== idx);
    setPlan({ ...plan, steps, sequenceNote: steps.length < 2 ? '' : plan.sequenceNote });
    if (acceptedStep === idx) setAcceptedStep(null);
  };

  const clearPlan = () => { setPlan(null); setPrefill(null); setNlText(''); setAcceptedStep(null); };

  const handleUpdate = () => {
    if (!existing) return;
    if (!discoveryName.trim()) { toast.error('Profile name is required'); return; }
    const schedule = buildScheduleObj();
    updateProfile(existing.id, {
      name: discoveryName.trim(), description, schedule, nextRunAt: computeNextRun(schedule),
      includes: isSecretsScan ? secretTypes : existing.includes,
    });
    toast.success(`Profile "${discoveryName}" updated`, { description: 'Changes saved successfully' });
    onDone('profiles');
  };

  return (
    <div className="space-y-4">
      {/* AI planner: thin bar. Type a goal, get a sequenced, editable plan. */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal" />
          <input
            value={nlText}
            onChange={e => setNlText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runPlanner(nlText); }}
            placeholder='Describe a goal, e.g. "find quantum-vulnerable certificates before the AWS prod migration"'
            className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <button onClick={() => runPlanner(nlText)} disabled={!nlText.trim() || planning}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light disabled:opacity-50 whitespace-nowrap">
          {planning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Planning…</> : <><Sparkles className="w-3.5 h-3.5" /> Plan discovery</>}
        </button>
        <InfoTip text="Describe what you want to find. The planner reasons across all discovery methods, proposes a sequenced plan with the expert settings already chosen, and explains each non-obvious decision. It plans what to find; questions about what you already have are answered by Infinity AI. Nothing runs until you press Start Discovery." />
      </div>
      {!plan && !planning && (
        <div className="flex flex-wrap gap-1.5">
          {['Find quantum-vulnerable certificates before the AWS prod migration', 'Find revoked certs from GlobalSign', 'List secrets in HashiCorp prod vault'].map(ex => (
            <button key={ex} onClick={() => { setNlText(ex); runPlanner(ex); }}
              className="text-[10px] px-2 py-1 rounded-full border border-border bg-muted text-muted-foreground hover:border-teal/40 hover:text-teal">{ex}</button>
          ))}
        </div>
      )}

      {/* Planner output */}
      {plan && plan.kind === 'query-redirect' && (
        <div id="discovery-plan" className="rounded-lg border border-teal/40 bg-teal/5 p-3.5 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-teal">That is an inventory question, not a discovery</p>
            {plan.notes.map((n, i) => <p key={i} className="text-[11px] text-muted-foreground leading-snug">{n}</p>)}
            <p className="text-[11px] text-muted-foreground">Ask Infinity AI to answer it against your existing inventory. Discovery is for finding assets you do not yet have.</p>
          </div>
          <button onClick={clearPlan} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {plan && (plan.kind === 'refused' || plan.kind === 'empty') && (
        <div id="discovery-plan" className="rounded-lg border border-amber/40 bg-amber/10 p-3.5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            {plan.notes.map((n, i) => <p key={i} className="text-[11px] text-amber leading-snug">{n}</p>)}
          </div>
          <button onClick={clearPlan} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {plan && plan.kind === 'plan' && plan.steps.length > 0 && (
        <div id="discovery-plan" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal" />
              <p className="text-xs font-semibold text-teal">
                {plan.steps.length === 1 ? 'Proposed discovery' : `Proposed plan · ${plan.steps.length} scans`}
              </p>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-teal/30 bg-teal/10 text-teal">AI planned</span>
            </div>
            <button onClick={clearPlan} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          {plan.intentEcho && <p className="text-[11px] text-muted-foreground">Goal: {plan.intentEcho}</p>}

          {plan.steps.map((step, idx) => {
            const Icon = scanCategories.find(c => c.category === step.category)?.icon ?? Radar;
            const isAccepted = acceptedStep === idx;
            return (
              <div key={idx} className={`rounded-lg border p-3 space-y-2 ${isAccepted ? 'border-teal/50 bg-teal/5' : 'border-border bg-card'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {plan.steps.length > 1 && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal/15 text-teal text-[10px] font-bold flex-shrink-0 mt-0.5">{idx + 1}</span>}
                    <Icon className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{step.type}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{step.rationale}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => applyStep(idx)}
                      className={`flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded ${isAccepted ? 'bg-teal/20 text-teal border border-teal/40' : 'bg-teal text-primary-foreground hover:bg-teal-light'}`}>
                      {isAccepted ? <><Check className="w-3 h-3" /> Loaded</> : 'Configure'}
                    </button>
                    {plan.steps.length > 1 && (
                      <button onClick={() => dropStep(idx)} aria-label="Remove step"
                        className="flex items-center justify-center w-6 h-6 rounded border border-border text-muted-foreground hover:text-coral hover:border-coral/40"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                </div>
                {step.decisions.length > 0 && (
                  <ul className="space-y-0.5 ml-1">
                    {step.decisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10.5px] text-muted-foreground"><Check className="w-2.5 h-2.5 text-teal flex-shrink-0 mt-0.5" /><span>{d}</span></li>
                    ))}
                  </ul>
                )}
                {step.unresolved.map((u, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10.5px] text-amber ml-1"><AlertTriangle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" /><span>{u}</span></div>
                ))}
              </div>
            );
          })}

          {plan.sequenceNote && (
            <div className="flex items-start gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-[10.5px] text-muted-foreground leading-snug">
              <Activity className="w-3 h-3 text-teal flex-shrink-0 mt-0.5" /><span><span className="text-foreground font-medium">Why this order: </span>{plan.sequenceNote}</span>
            </div>
          )}
          {plan.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10.5px] text-amber"><AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /><span>{n}</span></div>
          ))}
          <p className="text-[10px] text-muted-foreground/80">Configure loads a scan into the form below to review and run. Runs under your existing permissions; the planner never widens access or accepts credentials. Multiple scans are started one at a time from the form.</p>
        </div>
      )}

      {/* Method selector */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-secondary/30"><p className="text-[11px] font-semibold text-foreground">Select discovery method</p></div>
        <div className="grid grid-cols-12 min-h-[260px]">
          <div className="col-span-4 lg:col-span-3 border-r border-border bg-secondary/20">
            {scanCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.category;
              return (
                <button key={cat.category} onClick={() => { setActiveCategory(cat.category); setSelectedType(cat.types[0]); }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-l-2 transition-colors ${isActive ? 'border-l-teal bg-card' : 'border-l-transparent hover:bg-secondary/40'}`}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-teal' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className={`text-[11px] font-medium leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{cat.category}</p>
                    <p className="text-[9px] text-muted-foreground/70 leading-snug mt-0.5 line-clamp-2">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="col-span-8 lg:col-span-9 p-3 space-y-1.5 overflow-y-auto">
            {currentCategory.types.map(type => {
              const isSelected = selectedType.value === type.value;
              return (
                <button key={type.value} onClick={() => setSelectedType(type)}
                  className={`w-full text-left rounded-md px-3 py-2.5 border transition-all ${isSelected ? 'border-teal bg-teal/5 ring-1 ring-teal/30' : 'border-border bg-secondary/20 hover:bg-secondary/40'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[12px] font-semibold text-foreground">{type.value}</p>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground leading-snug mb-1.5">{type.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {type.discovers.map(d => <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">{d}</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Config panel */}
      <div id="discovery-config-panel" className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-teal">{selectedType.value} configuration</h2>
        <ConfigPanel configKey={selectedType.config} prefill={prefill} prefillNonce={prefillNonce}
          secretsProps={{ vaultType, setVaultType, vaultAccountId, setVaultAccountId, authMethod, setAuthMethod, secretTypes, setSecretTypes }} />
      </div>

      {/* Discovery details */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-teal">Discovery details</h2>
        <FormRow label="Discovery name" required>
          <input value={discoveryName} onChange={e => setDiscoveryName(e.target.value)} placeholder="e.g. Production network sweep — week 14"
            className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </FormRow>
        <FormRow label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional"
            className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
        </FormRow>
        <FormRow label="Run type">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={runType === 'on-demand'} onChange={() => setRunType('on-demand')} className="accent-teal" /> On-demand</label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="radio" checked={runType === 'schedule'} onChange={() => setRunType('schedule')} className="accent-teal" /> Scheduled</label>
          </div>
        </FormRow>
        {runType === 'schedule' && (
          <div className="ml-44 grid grid-cols-3 gap-2 max-w-md">
            <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)} className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground">
              {['Every 6 hours', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
            </select>
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground" />
            {scheduleFreq === 'Weekly' && (
              <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)} className="px-2 py-2 bg-muted border border-border rounded text-xs text-foreground">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
              </select>
            )}
          </div>
        )}
        <FormRow label="Save as profile">
          <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={saveAsProfile} onChange={e => setSaveAsProfile(e.target.checked)} className="accent-teal" /> Reuse this configuration in future runs</label>
        </FormRow>
        {saveAsProfile && (
          <FormRow label="Profile name" required>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. Production TLS Sweep"
              className="flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </FormRow>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-2 -mx-1 px-1 border-t border-border">
        {isEditing ? (
          <>
            <button onClick={handleUpdate} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light"><Check className="w-3.5 h-3.5" /> Save Changes</button>
            <button onClick={handleStart} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/10"><Play className="w-3.5 h-3.5" /> Save & Run Now</button>
          </>
        ) : (
          <>
            <button onClick={handleStart} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light"><Play className="w-3.5 h-3.5" /> Start Discovery</button>
            {saveAsProfile && <button onClick={handleSaveOnly} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-teal/40 text-teal text-xs font-medium hover:bg-teal/10">Save Profile Only</button>}
          </>
        )}
        <button onClick={resetForm} className="px-5 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary">Reset</button>
        <button onClick={onCancel} className="ml-auto px-5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG PANELS — one per finalized method
// ============================================================================
interface SecretsProps {
  vaultType: string; setVaultType: (v: string) => void;
  vaultAccountId: string; setVaultAccountId: (v: string) => void;
  authMethod: string; setAuthMethod: (v: string) => void;
  secretTypes: string[]; setSecretTypes: (v: string[]) => void;
}

function ConfigPanel({ configKey, prefill, prefillNonce, secretsProps }: { configKey: ConfigKey; prefill: Prefill; prefillNonce: number; secretsProps: SecretsProps }) {
  switch (configKey) {
    case 'network':    return <NetworkConfig prefill={prefill?.kind === 'network' ? prefill : null} nonce={prefillNonce} />;
    case 'sshauth':    return <SSHAuthConfig />;
    case 'ca':         return <CAConfig prefill={prefill?.kind === 'ca' ? prefill : null} nonce={prefillNonce} />;
    case 'cloud':      return <CloudConfig prefill={prefill?.kind === 'cloud' ? prefill : null} nonce={prefillNonce} />;
    case 'secrets':    return <SecretsConfig {...secretsProps} />;
    case 'thirdparty': return <ThirdPartyConfig prefill={prefill?.kind === 'thirdparty' ? prefill : null} nonce={prefillNonce} />;
    default: return null;
  }
}

const inputCls = 'flex-1 max-w-md px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal';
const selectCls = inputCls;
const textareaCls = `${inputCls} font-mono resize-none`;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-teal" />{label}</label>;
}

function CheckGroup({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={value.includes(opt)} onChange={e => onChange(e.target.checked ? [...value, opt] : value.filter(v => v !== opt))} className="accent-teal" />{opt}
        </label>
      ))}
    </div>
  );
}

function Advisory({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-[11px] text-amber leading-snug">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{children}</span>
    </div>
  );
}

const DEFAULT_PORTS = '443, 8443, 22, 636, 993, 995, 3389, 500, 4500, 6443';
const PORT_PRESETS = ['443', '8443', '22', '636', '993', '995', '3389', '500', '4500', '6443'];

type ScanTuning = {
  activeIpScan: boolean; detectionMode: string; hostSpeed: string; hostConcurrency: string; hostTimeout: string; hostRetries: string;
  portIntensity: string; pps: string; portConcurrency: string; rtt: string; portRetries: string; probeDelay: string;
  osCheck: boolean; osIntensity: string; service: string; osScan: string; versionProbe: string; osProbeDelay: string;
  batch: string; sequential: boolean;
};
const SPEED_OPTS = ['Minimal', 'Low & Slow', 'Light', 'Balanced', 'Performance', 'Max'];
const DETECTION_OPTS = ['Default Ports', 'All Ports', 'ICMP Ping'];
const PPS_OPTS = ['10', '100', '250', '500', '1000', '2000', '4000', '8000'];
const CONC_OPTS = ['20', '40', '60', '80', '100'];
const RTT_OPTS = ['100', '500', '1000', '2000', '5000', '10000'];
const RETRY_OPTS = ['0', '1', '2', '3', '4', '5'];
const HOSTTO_OPTS = ['5', '10', '30', '60', '120'];
const DELAY_OPTS = ['0', '10', '50', '100', '200', '500', '1000'];
const VERSIONPROBE_OPTS = ['Light', 'Moderate', 'Balance', 'Aggressive', 'Extensive'];
const BATCH_OPTS = ['64', '128', '256', '512'];

const INTENSITY_PRESETS: Record<'Conservative' | 'Balanced' | 'Aggressive', ScanTuning> = {
  Conservative: { activeIpScan: true, detectionMode: 'Default Ports', hostSpeed: 'Low & Slow', hostConcurrency: '20', hostTimeout: '60', hostRetries: '2',
    portIntensity: 'Low & Slow', pps: '100', portConcurrency: '20', rtt: '2000', portRetries: '2', probeDelay: '100',
    osCheck: false, osIntensity: 'Low & Slow', service: 'Normal', osScan: 'Basic', versionProbe: 'Light', osProbeDelay: '100', batch: '128', sequential: true },
  Balanced: { activeIpScan: true, detectionMode: 'Default Ports', hostSpeed: 'Balanced', hostConcurrency: '40', hostTimeout: '10', hostRetries: '2',
    portIntensity: 'Balanced', pps: '250', portConcurrency: '40', rtt: '1000', portRetries: '2', probeDelay: '0',
    osCheck: false, osIntensity: 'Balanced', service: 'Normal', osScan: 'Basic', versionProbe: 'Balance', osProbeDelay: '0', batch: '256', sequential: false },
  Aggressive: { activeIpScan: true, detectionMode: 'Default Ports', hostSpeed: 'Performance', hostConcurrency: '80', hostTimeout: '5', hostRetries: '1',
    portIntensity: 'Performance', pps: '2000', portConcurrency: '80', rtt: '500', portRetries: '1', probeDelay: '0',
    osCheck: true, osIntensity: 'Performance', service: 'Deep', osScan: 'Aggressive', versionProbe: 'Aggressive', osProbeDelay: '0', batch: '512', sequential: false },
};

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">{footer}</div>}
      </div>
    </div>
  );
}

function MiniField({ label, value, onChange, options, unit }: { label: string; value: string; onChange: (v: string) => void; options: string[]; unit?: string }) {
  return (
    <div>
      <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
        {options.map(o => <option key={o} value={o}>{o}{unit ? ` ${unit}` : ''}</option>)}
      </select>
    </div>
  );
}

function NetworkConfig({ prefill, nonce }: { prefill: PrefillNetwork | null; nonce: number }) {
  const [targets, setTargets] = useState('');
  const [sni, setSni] = useState('');
  const [excludes, setExcludes] = useState('');
  const [ports, setPorts] = useState(DEFAULT_PORTS);
  const [tlsVersions, setTlsVersions] = useState<string[]>(['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3']);
  const [depth, setDepth] = useState<'Quick' | 'Deep' | 'Full'>('Deep');
  const [intensity, setIntensity] = useState<'Conservative' | 'Balanced' | 'Aggressive' | 'Custom'>('Balanced');
  const [tuning, setTuning] = useState<ScanTuning>(INTENSITY_PRESETS.Balanced);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.tlsVersions) setTlsVersions(prefill.tlsVersions);
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (name: 'Conservative' | 'Balanced' | 'Aggressive') => { setIntensity(name); setTuning(INTENSITY_PRESETS[name]); };
  const setField = (patch: Partial<ScanTuning>) => { setTuning(t => ({ ...t, ...patch })); setIntensity('Custom'); };

  const portList = ports.split(',').map(s => s.trim()).filter(Boolean);
  const togglePort = (p: string) => {
    setPorts((portList.includes(p) ? portList.filter(x => x !== p) : [...portList, p]).join(', '));
  };

  const ipOnly = targets.trim().length > 0 && !/[a-zA-Z]/.test(targets) && sni.trim().length === 0;
  const broad = depth === 'Full' && portList.length > 6;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <GroupHeader info="Network Scan probes targets without credentials and records what each endpoint presents. Findings land in inventory as monitored posture across TLS, SSH, IPsec/VPN and Kubernetes; no certificate is moved into a managed lifecycle by this scan.">Scan scope</GroupHeader>
        <FormRow label="Targets (IP, CIDR, FQDN)" required info="The address space to scan. Accepts individual IP addresses, CIDR ranges, and fully qualified domain names, one per line or comma separated.">
          <textarea value={targets} onChange={e => setTargets(e.target.value)} rows={3} placeholder={'10.0.0.0/16\napp.corp.io\n192.168.1.10'} className={textareaCls} />
        </FormRow>
        <FormRow label="SNI hostname(s)" info="Server Name Indication. The scan presents these hostnames during the TLS handshake so certificates served only for a specific name on a shared IP are discovered rather than missed.">
          <input value={sni} onChange={e => setSni(e.target.value)} placeholder="app.corp.io, api.corp.io" className={inputCls} />
        </FormRow>
        <FormRow label="Exclude IPs" info="IP addresses or ranges to skip. Exclusions always take precedence over the target set.">
          <input value={excludes} onChange={e => setExcludes(e.target.value)} placeholder="10.0.5.0/24" className={inputCls} />
        </FormRow>
        <FormRow label="Ports" required info="Ports probed on each reachable target. TLS version testing applies only to the TLS-capable ports in this list.">
          <div className="flex-1 max-w-md space-y-1.5">
            <input value={ports} onChange={e => setPorts(e.target.value)} className={inputCls.replace('max-w-md', 'w-full')} />
            <p className="text-[10px] text-muted-foreground">Common ports, tap to add or remove. Any port is accepted in the field above.</p>
            <div className="flex gap-1 flex-wrap">
              {PORT_PRESETS.map(p => {
                const on = portList.includes(p);
                return (
                  <button key={p} onClick={() => togglePort(p)}
                    className={`px-2 py-0.5 text-[10px] rounded border ${on ? 'border-teal bg-teal/10 text-teal' : 'border-border bg-muted text-muted-foreground hover:bg-secondary'}`}>{p}</button>
                );
              })}
            </div>
          </div>
        </FormRow>
        <FormRow label="TLS versions to probe" info="Versions the scan attempts on each TLS port to report which the endpoint accepts. Probing all versions is what surfaces weak protocol support; deselect a version only to narrow the test.">
          <div className="flex gap-1.5 flex-wrap">
            {['TLS 1.0', 'TLS 1.1', 'TLS 1.2', 'TLS 1.3'].map(v => {
              const on = tlsVersions.includes(v);
              return (
                <button key={v} onClick={() => setTlsVersions(on ? tlsVersions.filter(x => x !== v) : [...tlsVersions, v])}
                  className={`px-3 py-1.5 rounded text-xs border ${on ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{v}</button>
              );
            })}
          </div>
        </FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader info="How much detail is collected per endpoint. Quick: handshake and certificate only. Deep: adds the served chain and the full accepted cipher list. Full: adds revocation checking (CRL primary, OCSP fallback) and completes the chain via AIA when the served chain is incomplete.">Coverage</GroupHeader>
        <FormRow label="Posture depth">
          <div className="flex gap-1.5">
            {(['Quick', 'Deep', 'Full'] as const).map(d => (
              <button key={d} onClick={() => setDepth(d)}
                className={`px-3 py-1.5 rounded text-xs border ${depth === d ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{d}</button>
            ))}
          </div>
        </FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader info="Preset for how aggressively the probe runs against the network. Each preset maps to specific pacing, concurrency and timeout values, shown under Advanced settings, where they can be overridden per scan.">Execution</GroupHeader>
        <FormRow label="Scan intensity">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5">
              {(['Conservative', 'Balanced', 'Aggressive'] as const).map(i => (
                <button key={i} onClick={() => applyPreset(i)}
                  className={`px-3 py-1.5 rounded text-xs border ${intensity === i ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{i}</button>
              ))}
              {intensity === 'Custom' && <span className="px-3 py-1.5 rounded text-xs border border-teal bg-teal/10 text-teal">Custom</span>}
            </div>
            <button onClick={() => setShowSettings(true)} className="text-[11px] text-teal hover:underline ml-1">Advanced settings</button>
          </div>
        </FormRow>
      </div>

      {ipOnly && <div className="ml-44 max-w-md"><Advisory>IP-only targeting can miss SNI-served certificates. Add FQDN targets or SNI hostnames for complete TLS discovery; reduced coverage is not confirmed absence.</Advisory></div>}
      {broad && <div className="ml-44 max-w-md"><Advisory>Full depth across a broad port list multiplies handshakes and revocation lookups per endpoint and will take longer.</Advisory></div>}

      {showSettings && (
        <Modal title="Scan execution settings" onClose={() => setShowSettings(false)}
          footer={<button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-semibold hover:bg-teal-light">Done</button>}>
          <p className="text-[11px] text-muted-foreground mb-3">Presets set every value below. Adjusting any field switches intensity to Custom. These control the scan engine only and do not change what is discovered.</p>
          <div className="flex gap-1.5 mb-4">
            {(['Conservative', 'Balanced', 'Aggressive'] as const).map(i => (
              <button key={i} onClick={() => applyPreset(i)}
                className={`px-3 py-1.5 rounded text-xs border ${intensity === i ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{i}</button>
            ))}
            {intensity === 'Custom' && <span className="px-3 py-1.5 rounded text-xs border border-teal bg-teal/10 text-teal">Custom</span>}
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <GroupHeader info="Finds which hosts are alive before port scanning, so dead IPs are skipped.">Alive host detection</GroupHeader>
              <Toggle checked={tuning.activeIpScan} onChange={v => setField({ activeIpScan: v })} label="Active IP scan" />
              <div className="grid grid-cols-2 gap-3">
                <MiniField label="Detection mode" value={tuning.detectionMode} onChange={v => setField({ detectionMode: v })} options={DETECTION_OPTS} />
                <MiniField label="Scanning speed" value={tuning.hostSpeed} onChange={v => setField({ hostSpeed: v })} options={SPEED_OPTS} />
                <MiniField label="Concurrent probes" value={tuning.hostConcurrency} onChange={v => setField({ hostConcurrency: v })} options={CONC_OPTS} />
                <MiniField label="Host timeout" value={tuning.hostTimeout} onChange={v => setField({ hostTimeout: v })} options={HOSTTO_OPTS} unit="s" />
                <MiniField label="Maximum retry" value={tuning.hostRetries} onChange={v => setField({ hostRetries: v })} options={RETRY_OPTS} />
              </div>
            </div>

            <div className="space-y-3">
              <GroupHeader info="Controls how the open-port scan paces itself against each host.">Open port configuration</GroupHeader>
              <div className="grid grid-cols-2 gap-3">
                <MiniField label="Scanning intensity" value={tuning.portIntensity} onChange={v => setField({ portIntensity: v })} options={SPEED_OPTS} />
                <MiniField label="Packets per second" value={tuning.pps} onChange={v => setField({ pps: v })} options={PPS_OPTS} />
                <MiniField label="Concurrent parallel probes" value={tuning.portConcurrency} onChange={v => setField({ portConcurrency: v })} options={CONC_OPTS} />
                <MiniField label="RTT timeout" value={tuning.rtt} onChange={v => setField({ rtt: v })} options={RTT_OPTS} unit="ms" />
                <MiniField label="Max retries" value={tuning.portRetries} onChange={v => setField({ portRetries: v })} options={RETRY_OPTS} />
                <MiniField label="Probe delay" value={tuning.probeDelay} onChange={v => setField({ probeDelay: v })} options={DELAY_OPTS} unit="ms" />
              </div>
            </div>

            <div className="space-y-3">
              <GroupHeader info="Identifies the service and version on each open port. OS scan is included for parity; it is operating-system fingerprinting and not crypto posture.">OS and service check</GroupHeader>
              <Toggle checked={tuning.osCheck} onChange={v => setField({ osCheck: v })} label="OS / service check" />
              <div className="grid grid-cols-2 gap-3">
                <MiniField label="Scanning intensity" value={tuning.osIntensity} onChange={v => setField({ osIntensity: v })} options={SPEED_OPTS} />
                <MiniField label="Service detection" value={tuning.service} onChange={v => setField({ service: v })} options={['Normal', 'Deep']} />
                <MiniField label="OS scan" value={tuning.osScan} onChange={v => setField({ osScan: v })} options={['Basic', 'Aggressive']} />
                <MiniField label="Version probe intensity" value={tuning.versionProbe} onChange={v => setField({ versionProbe: v })} options={VERSIONPROBE_OPTS} />
                <MiniField label="Probe delay" value={tuning.osProbeDelay} onChange={v => setField({ osProbeDelay: v })} options={DELAY_OPTS} unit="ms" />
              </div>
            </div>

            <div className="space-y-3">
              <GroupHeader info="Batching of the overall discovery run.">Batching</GroupHeader>
              <div className="grid grid-cols-2 gap-3">
                <MiniField label="IPs per batch" value={tuning.batch} onChange={v => setField({ batch: v })} options={BATCH_OPTS} />
              </div>
              <Toggle checked={tuning.sequential} onChange={v => setField({ sequential: v })} label="Execute batches sequentially" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CAConfig({ prefill, nonce }: { prefill: PrefillCA | null; nonce: number }) {
  const GS_INSTANCES = ['GlobalSign Atlas - Production', 'GlobalSign Atlas - Staging'];
  const [instance, setInstance] = useState(GS_INSTANCES[0]);
  const [mode, setMode] = useState<'Incremental' | 'Full sync'>('Incremental');
  const [status, setStatus] = useState('Issued + Revoked + Expired');
  const [window, setWindow] = useState('Since last run');

  useEffect(() => {
    if (prefill?.status) setStatus(prefill.status);
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <FormRow label="CA provider">
        <span className="text-xs text-foreground pt-2">GlobalSign Atlas</span>
      </FormRow>
      <FormRow label="CA instance" required info="The configured GlobalSign Atlas connection the discovery pulls issued certificate inventory from. Connections are managed under Integrations.">
        <select value={instance} onChange={e => setInstance(e.target.value)} className={selectCls}>
          {GS_INSTANCES.map(i => <option key={i}>{i}</option>)}
        </select>
      </FormRow>
      <FormRow label="Pull mode" info="Incremental fetches only certificates changed since the last run using the Atlas cursor. Full sync re-reads the entire issued set and is slower; use it for a first run or a periodic reconcile.">
        <div className="flex gap-1.5">
          {(['Incremental', 'Full sync'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded text-xs border ${mode === m ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{m}</button>
          ))}
        </div>
      </FormRow>
      {mode === 'Incremental' && (
        <FormRow label="Issuance window" info="Bounds how far back incremental discovery reads. Since last run continues from the previous run; a fixed window is available for backfills.">
          <select value={window} onChange={e => setWindow(e.target.value)} className={selectCls}>
            {['Since last run', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days'].map(w => <option key={w}>{w}</option>)}
          </select>
        </FormRow>
      )}
      <FormRow label="Certificate status" info="Which certificate states are discovered. Certificates found at the CA are automatically correlated with deployed certificates found by Network Discovery.">
        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
          {['Issued only', 'Issued + Revoked', 'Issued + Revoked + Expired', 'Revoked only', 'Expired only'].map(s => <option key={s}>{s}</option>)}
        </select>
      </FormRow>
      {mode === 'Full sync' && (
        <div className="ml-44 max-w-md"><Advisory>Full sync re-reads every issued certificate and can be slow on a high-volume CA. Incremental is recommended for routine schedules.</Advisory></div>
      )}
    </div>
  );
}

function CloudConfig({ prefill, nonce }: { prefill: PrefillCloud | null; nonce: number }) {
  const CONN_BY_PROVIDER: Record<'AWS' | 'Azure', string[]> = {
    AWS: ['AWS - prod (123456789012)', 'AWS - sandbox (987654321098)'],
    Azure: ['Azure - corp (corp-sub-01)', 'Azure - sandbox (sandbox-sub-02)'],
  };
  const [provider, setProvider] = useState<'AWS' | 'Azure'>('AWS');
  const [connection, setConnection] = useState(CONN_BY_PROVIDER.AWS[0]);
  const [objects, setObjects] = useState<string[]>(['Certificates', 'Keys']);
  const [region, setRegion] = useState('');
  const [tag, setTag] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ label: string; ok: boolean }[] | null>(null);

  useEffect(() => {
    if (!prefill) return;
    const p = prefill.provider ?? 'AWS';
    setProvider(p);
    setConnection(prefill.connection && CONN_BY_PROVIDER[p].includes(prefill.connection) ? prefill.connection : CONN_BY_PROVIDER[p][0]);
    if (prefill.objects) setObjects(prefill.objects);
    setTestResult(null);
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeProvider = (p: 'AWS' | 'Azure') => { setProvider(p); setConnection(CONN_BY_PROVIDER[p][0]); setTestResult(null); };
  const runTest = () => {
    setTesting(true); setTestResult(null);
    setTimeout(() => { setTesting(false); setTestResult(objects.map((o, i) => ({ label: o, ok: i % 3 !== 2 }))); }, 1200);
  };
  const broad = !region.trim();
  const connInfo = provider === 'AWS'
    ? 'The configured AWS connection to enumerate. It carries the account, credentials and role. AWS is read per enabled region with a us-east-1 pass for CloudFront and edge certificates.'
    : 'The configured Azure connection to enumerate. It carries the subscription, credentials and role. Key Vault and Managed HSM enumeration needs data-plane access, separate from an ARM Reader role.';

  return (
    <div className="space-y-3">
      <FormRow label="Provider" required info="The cloud platform to discover from. The selected provider determines which connections are available below.">
        <select value={provider} onChange={e => changeProvider(e.target.value as 'AWS' | 'Azure')} className={selectCls}>
          {(['AWS', 'Azure'] as const).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </FormRow>
      <FormRow label="Connection" required info={connInfo}>
        <select value={connection} onChange={e => { setConnection(e.target.value); setTestResult(null); }} className={selectCls}>
          {CONN_BY_PROVIDER[provider].map(c => <option key={c}>{c}</option>)}
        </select>
      </FormRow>
      <FormRow label="Discover" info="Which crypto objects to enumerate. Certificates covers ACM and Key Vault certificates, Keys covers KMS and Key Vault keys, and Secrets handoff routes discovered secret stores to Secrets and Key Store Discovery.">
        <CheckGroup options={['Certificates', 'Keys', 'Secrets handoff']} value={objects} onChange={setObjects} />
      </FormRow>
      <FormRow label="Region filter" info="Optional. Limits enumeration to the listed regions. With no filter, every enabled region for the connection is enumerated.">
        <input value={region} onChange={e => setRegion(e.target.value)} placeholder={provider === 'AWS' ? 'us-east-1, eu-west-2 (optional)' : 'eastus, westeurope (optional)'} className={inputCls} />
      </FormRow>
      <FormRow label="Resource tag filter" info="Optional. Limits enumeration to resources carrying the given tag.">
        <input value={tag} onChange={e => setTag(e.target.value)} placeholder="env=prod (optional)" className={inputCls} />
      </FormRow>
      <FormRow label="">
        <button onClick={runTest} disabled={testing} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
          {testing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</> : <><Check className="w-3.5 h-3.5" /> Test connection</>}
        </button>
      </FormRow>
      {testResult && (
        <div className="ml-44 max-w-md space-y-1">
          <p className="text-[10.5px] text-muted-foreground">Reachable object types under the selected connection:</p>
          {testResult.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-[11.5px]">
              {r.ok ? <Check className="w-3.5 h-3.5 text-teal" /> : <X className="w-3.5 h-3.5 text-amber" />}
              <span className={r.ok ? 'text-foreground' : 'text-amber'}>{r.label}{!r.ok && ' — not accessible (partial visibility)'}</span>
            </div>
          ))}
        </div>
      )}
      {broad && <div className="ml-44 max-w-md"><Advisory>With no region filter, every enabled region for the selected connection is enumerated and can be slow.</Advisory></div>}
    </div>
  );
}

function SecretsConfig({ vaultType, setVaultType, vaultAccountId, setVaultAccountId, secretTypes, setSecretTypes }: SecretsProps) {
  const { setCurrentPage } = useNav();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ label: string; ok: boolean }[] | null>(null);

  const SECRET_CONNECTIONS = [
    { name: 'HashiCorp Vault - prod', type: 'HashiCorp Vault', kind: 'vault' as const },
    { name: 'HashiCorp Vault - dev', type: 'HashiCorp Vault', kind: 'vault' as const },
    { name: 'CyberArk Conjur - prod', type: 'CyberArk Conjur', kind: 'vault' as const },
    { name: 'Crypto4A HSM - dc1', type: 'Crypto4A HSM', kind: 'hsm' as const },
    { name: 'Utimaco HSM - dc1', type: 'Utimaco HSM', kind: 'hsm' as const },
  ];
  const vaults = SECRET_CONNECTIONS.filter(c => c.kind === 'vault');
  const hsms = SECRET_CONNECTIONS.filter(c => c.kind === 'hsm');
  const selected = SECRET_CONNECTIONS.find(c => c.name === vaultAccountId);
  const isHsm = selected?.kind === 'hsm';
  const enumOptions = isHsm ? ['Keys'] : ['Certificates', 'Keys', 'Secrets'];

  const selectConn = (name: string) => {
    const c = SECRET_CONNECTIONS.find(x => x.name === name);
    setVaultAccountId(name);
    if (c) { setVaultType(c.type); setSecretTypes(c.kind === 'hsm' ? ['Keys'] : ['Certificates', 'Keys']); }
    setTestResult(null);
  };

  const runTest = () => {
    if (!selected) { toast.error('Please select a connection before testing.'); return; }
    setTesting(true); setTestResult(null);
    setTimeout(() => { setTesting(false); setTestResult(secretTypes.map((t, i) => ({ label: t, ok: i !== 1 }))); }, 1300);
  };

  return (
    <div className="space-y-3">
      <FormRow label="Connection" required info="The configured vault or HSM connection to enumerate. Each connection carries its provider, endpoint, credentials and authentication. Manage connections under Integrations.">
        <div className="flex-1 max-w-md space-y-1">
          <select value={vaultAccountId} onChange={e => selectConn(e.target.value)} className={selectCls.replace('max-w-md', 'w-full')}>
            <option value="">Select a connection…</option>
            <optgroup label="Vaults">{vaults.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</optgroup>
            <optgroup label="HSMs">{hsms.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</optgroup>
          </select>
          <button type="button" onClick={() => setCurrentPage('integrations')} className="text-[10px] text-teal hover:underline">Manage connections in Integrations →</button>
        </div>
      </FormRow>
      {selected && (
        <FormRow label="Enumerate" info="Which object classes to enumerate. Metadata only; secret values are never extracted. A path that is listable but not readable is reported as partial visibility. SSH key material here is vault-stored, distinct from host keys found by Network Discovery.">
          <CheckGroup options={enumOptions} value={secretTypes.filter(t => enumOptions.includes(t))} onChange={setSecretTypes} />
        </FormRow>
      )}
      {selected && !isHsm && (
        <FormRow label="Path scoping" info="Optional. Restricts enumeration to the given Vault path prefix.">
          <input placeholder="secret/data/prod/* (optional)" className={inputCls} />
        </FormRow>
      )}
      {selected && isHsm && (
        <FormRow label="Partition scoping" info="Optional. Restricts enumeration to the given PKCS#11 partitions. HSM keys are enumerated per authenticated partition.">
          <input placeholder="partition-1, partition-2 (optional)" className={inputCls} />
        </FormRow>
      )}
      <FormRow label="">
        <button onClick={runTest} disabled={testing || !selected} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-60">
          {testing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing…</> : <><Check className="w-3.5 h-3.5" /> Test connection</>}
        </button>
      </FormRow>
      {testResult && (
        <div className="ml-44 max-w-md space-y-1">
          <p className="text-[10.5px] text-muted-foreground">Accessible object types for this connection:</p>
          {testResult.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-[11.5px]">
              {r.ok ? <Check className="w-3.5 h-3.5 text-teal" /> : <X className="w-3.5 h-3.5 text-amber" />}
              <span className={r.ok ? 'text-foreground' : 'text-amber'}>{r.label}{!r.ok && ' — not accessible (partial visibility)'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThirdPartyConfig({ prefill, nonce }: { prefill: PrefillThirdParty | null; nonce: number }) {
  const [sourceType, setSourceType] = useState<'Vulnerability Scanner' | 'CBOM'>('Vulnerability Scanner');
  const [scanner, setScanner] = useState('Qualys Production');
  const [cbomInput, setCbomInput] = useState<'Upload' | 'Push endpoint'>('Upload');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (prefill?.sourceType) { setSourceType(prefill.sourceType); setToken(''); }
  }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const genToken = () => setToken(Array.from({ length: 24 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''));
  const pickType = (t: 'Vulnerability Scanner' | 'CBOM') => { setSourceType(t); setToken(''); };

  return (
    <div className="space-y-3">
      <FormRow label="Source type" required info="Vulnerability scanners emit security findings that are inferred into posture. CBOM is an inventory document describing cryptographic assets and is read directly.">
        <div className="flex gap-1.5">
          {(['Vulnerability Scanner', 'CBOM'] as const).map(t => (
            <button key={t} onClick={() => pickType(t)} className={`px-3 py-1.5 rounded text-xs border ${sourceType === t ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{t}</button>
          ))}
        </div>
      </FormRow>

      {sourceType === 'Vulnerability Scanner' ? (
        <>
          <FormRow label="Connection" required info="The configured scanner connection to pull from. Endpoint and credentials are set in Integrations. Findings are inferred and sit below native scans and CBOM in source priority.">
            <select value={scanner} onChange={e => setScanner(e.target.value)} className={selectCls}>
              <optgroup label="Vulnerability Scanners"><option>Qualys Production</option><option>Tenable Production</option></optgroup>
            </select>
          </FormRow>
          <FormRow label="Mode" info="Vulnerability scanners are polled on a schedule. Re-ingested records are deduplicated by source scan time.">
            <span className="text-xs text-foreground pt-2">Pull</span>
          </FormRow>
        </>
      ) : (
        <>
          <FormRow label="Accepted format" info="Minimum accepted version is CycloneDX 1.6; older or unversioned documents are rejected with a reason. QTH is a known producer of CycloneDX CBOM.">
            <span className="text-xs text-foreground pt-2">CycloneDX 1.6</span>
          </FormRow>
          <FormRow label="Input" info="CBOM is provided as a file upload or posted to a standing push endpoint. Re-ingested records are deduplicated by source scan time.">
            <div className="flex gap-1.5">
              {(['Upload', 'Push endpoint'] as const).map(m => (
                <button key={m} onClick={() => { setCbomInput(m); setToken(''); }} className={`px-3 py-1.5 rounded text-xs border ${cbomInput === m ? 'border-teal bg-teal/10 text-teal' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{m}</button>
              ))}
            </div>
          </FormRow>
          {cbomInput === 'Upload' ? (
            <FormRow label="CBOM file">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-foreground hover:bg-secondary"><Plus className="w-3 h-3" /> Choose CBOM file</button>
            </FormRow>
          ) : (
            <FormRow label="Push endpoint">
              <div className="flex-1 max-w-md space-y-2">
                <button onClick={genToken} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-foreground hover:bg-secondary"><Plus className="w-3 h-3" /> Generate endpoint</button>
                {token && (
                  <div className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 text-amber"><AlertTriangle className="w-3.5 h-3.5" /> Shown once and not retained. Copy it into your source now.</div>
                    <div className="font-mono text-muted-foreground break-all">https://ingest.avx.io/v1/cbom</div>
                    <div className="font-mono text-teal break-all">{token}</div>
                  </div>
                )}
              </div>
            </FormRow>
          )}
        </>
      )}
    </div>
  );
}

function GroupHeader({ children, info }: { children: React.ReactNode; info?: string }) {
  return (
    <div className="border-b border-border/60 pb-1.5 mb-1 flex items-center gap-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{children}</p>
      {info && <InfoTip text={info} />}
    </div>
  );
}

function Radios<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-4">
      {options.map(o => (
        <label key={o} className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="radio" checked={value === o} onChange={() => onChange(o)} className="accent-teal" /> {o}
        </label>
      ))}
    </div>
  );
}

function SSHAuthConfig() {
  const [startIp, setStartIp] = useState('');
  const [endIp, setEndIp] = useState('');
  const [port, setPort] = useState('22');
  const [batch, setBatch] = useState('128');
  const [discover, setDiscover] = useState<string[]>(['User Keys', 'Host Keys']);
  const [scanType, setScanType] = useState<'Default' | 'Full' | 'Directory'>('Default');
  const [recursive, setRecursive] = useState(false);
  const [intensive, setIntensive] = useState(false);
  const [accessType, setAccessType] = useState<'Key' | 'Certificate'>('Key');
  const [dataCenter, setDataCenter] = useState('');
  const [credentialType, setCredentialType] = useState('Manual Entry');
  const [loginType, setLoginType] = useState<'Password' | 'Identity Key'>('Password');
  const [username, setUsername] = useState('');
  const [infraGroup, setInfraGroup] = useState('');
  const [hostGroup, setHostGroup] = useState('Default_Host_Group');
  const [keyGroup, setKeyGroup] = useState('Default_Key_Group');
  const [inventoryAction, setInventoryAction] = useState<'Do Not Move' | 'Manage' | 'Monitor'>('Manage');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-md border border-teal/20 bg-teal/5 px-3 py-2 text-[11px] text-muted-foreground leading-snug">
        <AlertCircle className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
        <span>Authenticated SSH scan logs into hosts to discover user and host keys and onboard them into inventory with compliance policy. Lifecycle operations (rotation, remediation) arrive with the SSH remediation module.</span>
      </div>

      <div className="space-y-3">
        <GroupHeader>Scan target</GroupHeader>
        <FormRow label="Start IP" required><input value={startIp} onChange={e => setStartIp(e.target.value)} placeholder="192.168.1.1" className={inputCls} /></FormRow>
        <FormRow label="End IP" required><input value={endIp} onChange={e => setEndIp(e.target.value)} placeholder="192.168.1.254" className={inputCls} /></FormRow>
        <FormRow label="Port" required><input value={port} onChange={e => setPort(e.target.value)} className="w-24 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" /></FormRow>
        <FormRow label="IP(s) per batch"><select value={batch} onChange={e => setBatch(e.target.value)} className={selectCls}>{['64', '128', '256', '512'].map(b => <option key={b}>{b}</option>)}</select></FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader>Discovery scope</GroupHeader>
        <FormRow label="Discover" required><CheckGroup options={['User Keys', 'Host Keys']} value={discover} onChange={setDiscover} /></FormRow>
        <FormRow label="Scan type" required><Radios options={['Default', 'Full', 'Directory'] as const} value={scanType} onChange={v => setScanType(v)} /></FormRow>
        <FormRow label="Recursive scan"><Toggle checked={recursive} onChange={setRecursive} label="Traverse subdirectories for keys" /></FormRow>
        <FormRow label="Intensive scan"><Toggle checked={intensive} onChange={setIntensive} label="Deeper scan, slower but more thorough" /></FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader>Access and credentials</GroupHeader>
        <FormRow label="Access type" required><Radios options={['Key', 'Certificate'] as const} value={accessType} onChange={v => setAccessType(v)} /></FormRow>
        <FormRow label="DataCenter" required>
          <select value={dataCenter} onChange={e => setDataCenter(e.target.value)} className={selectCls}>
            <option value="">Select…</option>{['absecon', 'us-east-1', 'us-west-2', 'eu-central-1'].map(d => <option key={d}>{d}</option>)}
          </select>
        </FormRow>
        <FormRow label="Credential type" required>
          <select value={credentialType} onChange={e => setCredentialType(e.target.value)} className={selectCls}>{['Manual Entry', 'Stored Credential'].map(c => <option key={c}>{c}</option>)}</select>
        </FormRow>
        <FormRow label="Login type" required><Radios options={['Password', 'Identity Key'] as const} value={loginType} onChange={v => setLoginType(v)} /></FormRow>
        <FormRow label="Username" required><input value={username} onChange={e => setUsername(e.target.value)} placeholder="svc-discovery" className={inputCls} /></FormRow>
        <FormRow label={loginType === 'Password' ? 'Password' : 'Identity key'} required>
          {loginType === 'Password'
            ? <input type="password" placeholder="••••••••" className={inputCls} />
            : <textarea rows={2} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" className={textareaCls} />}
        </FormRow>
      </div>

      <div className="space-y-3">
        <GroupHeader>Onboarding and governance</GroupHeader>
        <FormRow label="Infra Access Group" required>
          <div className="flex-1 max-w-md space-y-1">
            <input value={infraGroup} onChange={e => setInfraGroup(e.target.value)} placeholder="Select or type to add…" className={inputCls.replace('max-w-md', 'w-full')} />
            <p className="text-[10px] text-muted-foreground">Maps the onboarded host to an Application Infra Access Group. Type a new name and press enter to add.</p>
          </div>
        </FormRow>
        <FormRow label="Host Compliance Group"><select value={hostGroup} onChange={e => setHostGroup(e.target.value)} className={selectCls}>{['Default_Host_Group', 'Prod_Host_Group', 'PCI_Host_Group'].map(g => <option key={g}>{g}</option>)}</select></FormRow>
        <FormRow label="Key Compliance Group"><select value={keyGroup} onChange={e => setKeyGroup(e.target.value)} className={selectCls}>{['Default_Key_Group', 'Prod_Key_Group', 'PCI_Key_Group'].map(g => <option key={g}>{g}</option>)}</select></FormRow>
        <FormRow label="Inventory action" required><Radios options={['Do Not Move', 'Manage', 'Monitor'] as const} value={inventoryAction} onChange={v => setInventoryAction(v)} /></FormRow>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3 — RUNS
// ============================================================================
function RunsTab() {
  const { runs } = useRuns();
  const [statusFilter, setStatusFilter] = useState<'All' | 'in-progress' | 'completed' | 'failed'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [, force] = useState(0);

  useEffect(() => { const t = setInterval(() => force(n => n + 1), 1000); return () => clearInterval(t); }, []);

  const sorted = useMemo(() => [...runs].sort((a, b) => b.startedAt - a.startedAt), [runs]);
  const filtered = sorted.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'All categories' && r.category !== categoryFilter) return false;
    return true;
  });

  const statusPill = (status: string) => {
    if (status === 'in-progress') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber/15 text-amber border border-amber/30"><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" /> In progress</span>;
    if (status === 'completed') return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal/15 text-teal border border-teal/30">● Completed</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-coral/15 text-coral border border-coral/30">● Failed</span>;
  };

  if (runs.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-10 text-center space-y-2">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">No discovery runs yet</h3>
        <p className="text-xs text-muted-foreground">Start one from the New Scan tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          <option>All categories</option>
          {scanCategories.map(c => <option key={c.category}>{c.category}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="px-2 py-1.5 bg-muted border border-border rounded text-xs text-foreground">
          <option value="All">All statuses</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="failed">Failed</option>
        </select>
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} of {runs.length} runs</span>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr className="border-b border-border">
              {['Run', 'Category', 'Started', 'Duration', 'Discovered', 'Status', 'Triggered by'].map(h => <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(run => (
              <tr key={run.id} className="border-b border-border hover:bg-secondary/30">
                <td className="py-2 px-3 font-mono text-[10px] text-foreground">{run.profileName ?? run.id.slice(-8)}</td>
                <td className="py-2 px-3"><span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{run.category}</span></td>
                <td className="py-2 px-3 text-muted-foreground">{formatRelative(run.startedAt)}</td>
                <td className="py-2 px-3 text-muted-foreground">{formatDuration(run.startedAt, run.completedAt)}</td>
                <td className="py-2 px-3 font-medium tabular-nums">{run.status === 'in-progress' ? '—' : run.itemsDiscovered.toLocaleString()}</td>
                <td className="py-2 px-3">{statusPill(run.status)}</td>
                <td className="py-2 px-3 text-muted-foreground capitalize">{run.triggeredBy}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No runs match your filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED
// ============================================================================
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center align-middle ml-1">
      <Info className="w-3 h-3 text-muted-foreground/70 hover:text-teal cursor-help" />
      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-60 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[10.5px] leading-snug text-popover-foreground text-left normal-case font-normal tracking-normal opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

function FormRow({ label, required, info, children }: { label: string; required?: boolean; info?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <label className="text-xs text-muted-foreground w-40 text-right pt-2 flex items-center justify-end gap-1 flex-shrink-0">
        {required && <span className="text-coral">*</span>} {label}{info && <InfoTip text={info} />}
      </label>
      {children}
    </div>
  );
}