// AVX Trust Hub -- Complete Help Knowledge Base
// Used by HelpDrawer component. Each article maps to a screen or feature.

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  summary: string;
  sections: HelpSection[];
  regulatoryRefs?: string[];
  relatedIds?: string[];
  tags: string[];
}

export interface HelpSection {
  heading: string;
  body: string; // plain text, newline = paragraph break
}

export const HELP_CATEGORIES = [
  'Getting Started',
  'Dashboard',
  'Discovery',
  'Inventory',
  'Policies',
  'Violations',
  'Remediation',
  'Tickets',
  'Integrations',
  'Quantum Posture',
  'Risk Scoring',
  'Platform Core',
] as const;

export const HELP_ARTICLES: HelpArticle[] = [

  // ── GETTING STARTED ────────────────────────────────────────────────────────

  {
    id: 'gs-overview',
    title: 'What is AVX Trust Hub?',
    category: 'Getting Started',
    summary: 'AVX Trust Hub is a cryptographic identity governance platform that discovers, scores, and remediates risk across SSH keys, TLS certificates, machine secrets, and AI agent credentials.',
    tags: ['overview', 'intro', 'what is'],
    sections: [
      {
        heading: 'Platform purpose',
        body: 'AVX Trust Hub gives security teams complete visibility and control over every cryptographic object in the enterprise -- SSH keys, TLS/SSL certificates, code-signing certificates, encryption keys, machine secrets, API keys, and AI agent tokens.\n\nMost security tools scan for software vulnerabilities (CVEs). AVX Trust Hub scores cryptographic object risk: whether an algorithm is too weak, whether a credential has been rotated, whether a key has an owner, and whether long-lived data is protected by algorithms that will be broken by quantum computers.',
      },
      {
        heading: 'Three-level risk architecture',
        body: 'The platform operates at three levels:\n\n1. CRS (Crypto Risk Score): a 0–100 score for each individual cryptographic object, based on algorithm strength, lifecycle hygiene, exposure, access governance, and compliance.\n\n2. ARS (Asset Risk Score): a 0–100 score per server, application, or service, aggregated from the CRS scores of all objects on that asset.\n\n3. ERS (Enterprise Risk Score): the organisation-wide posture, a criticality-weighted average of all ARS scores with a floor rule that prevents a single critical production asset from being statistically buried.',
      },
      {
        heading: 'Two risk classes',
        body: 'Every cryptographic object carries a risk class tag:\n\nOperational (coral/amber): exploitable today. Examples: expired certificates, weak algorithms in active use (RSA-1024, SHA-1), orphaned keys, over-privileged tokens.\n\nQuantum (purple): Harvest-Now-Decrypt-Later risk. Nation-states are capturing encrypted traffic today and will decrypt it when a Cryptographically Relevant Quantum Computer (CRQC) arrives. Any object using RSA, ECC, DSA, or Diffie-Hellman is in this category.\n\nBoth: an object that is classically weak AND quantum-vulnerable. RSA-1024 is the canonical example.',
      },
      {
        heading: 'Personas',
        body: 'The platform supports three personas selectable in the top-left dropdown:\n\nSecurity Admin: full platform access, risk scoring, remediation, policy enforcement.\n\nCompliance Officer: focused on policy violations, audit evidence, compliance framework coverage, and reporting.\n\nPKI Engineer: focused on certificate lifecycle, CA management, key provisioning, and technical remediation workflows.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1', 'NIST SP 800-131A Rev 2', 'ISO/IEC 27005:2022'],
    relatedIds: ['rs-crs', 'rs-ars', 'rs-ers'],
  },

  {
    id: 'gs-personas',
    title: 'Personas and role-based views',
    category: 'Getting Started',
    summary: 'Switch between Security Admin, Compliance Officer, and PKI Engineer views using the persona selector in the top-left of the sidebar.',
    tags: ['persona', 'role', 'view', 'security admin', 'compliance', 'pki'],
    sections: [
      {
        heading: 'Security Admin',
        body: 'Default persona. Full access to all platform features. Primary dashboard shows Trust Posture and Risk Intelligence: ERS gauge, Critical Action Feed, Identity Health Bands, and Quantum Readiness strip.\n\nResponsibilities: risk monitoring, policy enforcement, remediation orchestration, and enterprise posture reporting.',
      },
      {
        heading: 'Compliance Officer',
        body: 'Focused on audit evidence, compliance framework coverage (PCI DSS, HIPAA, FIPS 140-2, DORA), and policy violation reporting. Dashboard surfaces compliance scores, open violations by framework, and audit-ready evidence exports.',
      },
      {
        heading: 'PKI Engineer',
        body: 'Focused on the technical lifecycle of certificates and keys: CA management, certificate issuance and renewal, SSH key provisioning, HSM integration, and rotation automation. Dashboard surfaces expiry calendars, CA trust chain health, and provisioning queues.',
      },
    ],
    relatedIds: ['gs-overview', 'dash-security-admin'],
  },

  // ── DASHBOARD ──────────────────────────────────────────────────────────────

  {
    id: 'dash-security-admin',
    title: 'Security Admin Dashboard',
    category: 'Dashboard',
    summary: 'The Security Admin dashboard shows enterprise-wide cryptographic risk posture: ERS gauge, Critical Action Feed, Identity Health Bands, and Quantum Readiness strip.',
    tags: ['dashboard', 'ers', 'security admin', 'critical action feed', 'risk'],
    sections: [
      {
        heading: 'Enterprise Risk Score (ERS) gauge',
        body: 'The large gauge in the top-left shows the Enterprise Risk Score (0–100). Higher is worse. Severity bands: Critical 80–100, High 60–79, Medium 30–59, Low 0–29.\n\nThe gauge incorporates both operational posture (85% weight in 2026, decreasing to 65% by 2030) and quantum exposure (15% in 2026, increasing to 35% by 2030).\n\nClick "Why is ERS X?" to open the explanation drawer showing ranked risk drivers, contributing assets sorted by RPS, and remediation workflow links.',
      },
      {
        heading: 'Score delta indicator',
        body: 'The arrow and point change (e.g. "↓ 6 pts (7d)") shows how much the ERS has moved in the last 7 days. A downward arrow means the posture is improving. An upward arrow means it is worsening.\n\nNote: a large drop in ERS caused by certificate renewals (not actual remediation) is flagged with a calendar event annotation so score improvements from hygiene are distinguished from genuine risk reduction.',
      },
      {
        heading: 'Top contributing assets',
        body: 'The list below the gauge shows the assets contributing most to ERS, sorted by RPS (Remediation Priority Score = ARS × business impact multiplier). Each row shows the asset name, business impact badge, ARS score, and a link to the inventory detail.\n\nClick any asset row to open its full risk detail in the Inventory.',
      },
      {
        heading: 'Critical Action Feed',
        body: 'The right panel shows the most urgent findings across the entire estate, ranked by impact × urgency. Each item shows severity, object type, time since detection, and a one-line description.\n\nItems are grouped by type: Certificates, Secrets, SSH Keys, AI Tokens, Infrastructure. Use the filter tabs to isolate by type.\n\nClicking a row expands it to show the full finding detail and links to the relevant remediation workflow.',
      },
      {
        heading: 'Floor rule indicator',
        body: 'When the ERS gauge shows "Floor rule active", it means ERS is being held at a minimum value because a single Critical-impact production asset has a very high ARS. The floor is set at 85% of that asset\'s ARS score.\n\nThis prevents a sea of clean low-risk assets from mathematically masking one burning critical system. The only way to lower ERS when the floor rule is active is to remediate the asset triggering the floor.',
      },
      {
        heading: 'QTH Posture Strip',
        body: 'The Quantum Transition Hub strip below the main gauges shows the PQC migration status of the estate: how many objects are quantum-safe, how many are in-flight migration, how many remain vulnerable, and the projected completion date versus the NIST 2030 deadline.\n\nIf the projected completion date is past 2030, it is shown in coral as a risk indicator. See the Quantum Posture section for the full migration workflow.',
      },
      {
        heading: 'Identity Health Bands',
        body: 'A set of horizontal bars showing the health distribution of the credential estate by type: TLS certificates, SSH keys, secrets, AI agent tokens. Each bar shows the proportion of objects in each status (healthy, expiring, expired, orphaned, policy-violation).',
      },
      {
        heading: 'Infrastructure Posture Strip',
        body: 'A summary of the most-critical infrastructure assets by ARS, showing which systems are driving the most risk. Click any asset to navigate to its inventory detail.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 Section 2.3', 'NSA CNSA 2.0'],
    relatedIds: ['rs-ers', 'inv-it-assets', 'qp-overview'],
  },

  // ── DISCOVERY ──────────────────────────────────────────────────────────────

  {
    id: 'disc-overview',
    title: 'Discovery -- finding cryptographic assets',
    category: 'Discovery',
    summary: 'Discovery scans your environment to find all cryptographic objects: certificates, SSH keys, secrets, encryption keys, and AI agent tokens across on-premises and cloud infrastructure.',
    tags: ['discovery', 'scan', 'find', 'detect', 'assets'],
    sections: [
      {
        heading: 'What Discovery finds',
        body: 'Discovery identifies:\n- TLS/SSL certificates on servers, load balancers, CDN edges, and API gateways\n- SSH keys (authorized_keys, known_hosts, host keys) on Linux and Windows systems\n- Code-signing certificates in CI/CD pipelines\n- Kubernetes workload certificates and service mesh identities\n- Encryption keys in AWS KMS, Azure Key Vault, Google Cloud KMS, and HashiCorp Vault\n- AI agent tokens and service account credentials\n- API keys and secrets in code repositories, secret managers, and configuration files',
      },
      {
        heading: 'Discovery vectors',
        body: 'Objects can be discovered through multiple vectors:\n\nNetwork scan: active scanning of TCP port 443 and common TLS ports to extract certificate details.\n\nAgent-based: lightweight agents on hosts that report SSH keys, local certificates, and process-bound credentials.\n\nAPI integration: direct query of cloud provider APIs (AWS, Azure, GCP), secret managers (Vault, AWS Secrets Manager), and CA systems (DigiCert, Entrust, Let\'s Encrypt) via the Integrations connectors.\n\nManual entry: add a resource manually using the "Add Resource" button in Inventory when a system is not reachable by other methods.',
      },
      {
        heading: 'Discovery frequency',
        body: 'Discovery runs on a configurable schedule. Default is every 24 hours for network-discovered objects and every 4 hours for API-integrated sources. Certificate expiry events trigger an immediate re-scan of affected systems.\n\nThe "Refreshed 0m ago" indicator on the dashboard shows when data was last updated.',
      },
      {
        heading: 'Deduplication',
        body: 'The same certificate or key may be found via multiple discovery vectors (network scan AND CA API). AVX Trust Hub deduplicates by certificate fingerprint (SHA-256 of the certificate) for TLS objects and by key fingerprint for SSH keys. The canonical record shows all discovery vectors as metadata.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-53 Rev 5 CM-8 (Information System Component Inventory)', 'CIS Controls v8 Control 1 (Inventory of Enterprise Assets)'],
    relatedIds: ['inv-crypto-objects', 'int-sources'],
  },

  // ── INVENTORY ──────────────────────────────────────────────────────────────

  {
    id: 'inv-overview',
    title: 'Inventory overview',
    category: 'Inventory',
    summary: 'The Inventory has three tabs: Infrastructure (servers and applications), Identities (individual cryptographic objects), and Groups (logical collections for policy application).',
    tags: ['inventory', 'overview', 'infrastructure', 'identities', 'groups'],
    sections: [
      {
        heading: 'Three views',
        body: 'Infrastructure tab: shows every server, application, cluster, or service in scope. Each row shows the ARS score, business impact, RPS (sort key), owner team, and violation count. Default sort is by RPS descending -- the most dangerous assets considering both cryptographic posture and business importance appear first.\n\nIdentities tab: shows every individual cryptographic object (certificate, key, secret, token). Each row shows the CRS score, algorithm, expiry, status, owner, and policy violations.\n\nGroups tab: shows logical collections of objects used for policy application, bulk operations, and reporting.',
      },
      {
        heading: 'Search and filtering',
        body: 'All three tabs support search by name. Infrastructure additionally filters by: type (Web Server, Database, K8s Cluster, etc.), environment (Production, Staging, Development), team, business impact, and ARS range.\n\nIdentities filters by: type (TLS Certificate, SSH Key, AI Agent Token, etc.), algorithm, status (Healthy, Expiring, Expired, Orphaned), environment, and owner.\n\nThe "All Business Impact" filter on Infrastructure lets you quickly isolate Critical or High impact assets for priority review.',
      },
      {
        heading: 'Add Resource',
        body: 'The "+ Add Resource" button in the top-right of the Inventory page opens a modal to manually register an asset or cryptographic object not discovered automatically.\n\nUse this for: systems behind firewalls that cannot be scanned, legacy systems not covered by API integrations, or new systems added between scan cycles.',
      },
    ],
    relatedIds: ['inv-it-assets', 'inv-crypto-objects', 'inv-groups'],
  },

  {
    id: 'inv-it-assets',
    title: 'Infrastructure tab -- asset risk view',
    category: 'Inventory',
    subcategory: 'Infrastructure',
    summary: 'The Infrastructure tab shows all servers, applications, and services with their ARS score, business impact, and RPS sort order. Default sort surfaces the highest-risk assets first.',
    tags: ['infrastructure', 'assets', 'ars', 'rps', 'business impact', 'sort'],
    sections: [
      {
        heading: 'ARS (Asset Risk Score)',
        body: 'The ARS badge on each row shows the aggregated cryptographic risk of all objects on that asset, scored 0–100. The badge colour maps to severity: red (Critical 80+), amber (High 60–79), blue (Medium 30–59), teal (Low 0–29).\n\nClick the ARS badge to open the Asset Risk Drawer -- a detailed breakdown showing which objects are driving the score, with their individual CRS scores and the primary risk reason for each.',
      },
      {
        heading: 'Business Impact',
        body: 'The Business Impact column shows a four-value badge: Critical, High, Moderate, or Low. This reflects how important the asset is to business operations -- independent of its cryptographic posture.\n\nThe default value is derived from the CMDB tier (Production, Staging, Development) and asset type. You can override it by clicking the badge and selecting a new value. Overrides require a justification and are logged in the audit trail.\n\nBusiness Impact feeds the RPS calculation and the ERS asset weight. A Critical-impact asset with moderate ARS will rank higher in the inventory than a Low-impact asset with high ARS, because the business consequence of compromise is greater.',
      },
      {
        heading: 'RPS (Remediation Priority Score)',
        body: 'The RPS column shows the sort key: ARS × business impact multiplier (Critical=1.5, High=1.25, Moderate=1.0, Low=0.75). RPS is never a standalone risk score -- it is purely a sort key to help security teams work the most impactful issues first.\n\nExample: a server with ARS 84 and Critical business impact scores RPS = 84 × 1.5 = 126. A development server with ARS 90 and Low business impact scores RPS = 90 × 0.75 = 68. The production server sorts first despite having a lower ARS -- because the business impact of compromise is higher.',
      },
      {
        heading: 'Asset detail panel',
        body: 'Click any asset row to open the three-column detail panel:\n\nLeft column: asset summary, risk gauge, risk bars (crypto health, expiry exposure, policy coverage, blast radius), and the Infinity AI narrative explaining the top risk.\n\nMiddle column: all cryptographic identities on the asset with their type, algorithm, expiry date, policy status, and violation count. Click the chevron on any identity row to expand it and see policies applied, active violations, and quick actions.\n\nRight column: Blast Radius topology showing which services and assets depend on the cryptographic objects held by this asset.',
      },
      {
        heading: 'Violations count',
        body: 'The Violations column shows the number of active policy violations on the asset. The badge is clickable and opens the Violations Drawer, which lists all violations for that asset split into Operational and Quantum Risk tabs, with direct links to remediation workflows.',
      },
      {
        heading: 'Sorting options',
        body: 'Click the column headers with the sort icon to re-sort by: Asset Name (alphabetical), ARS (cryptographic severity only, ignores business impact), Business Impact (Critical first), or RPS (default: combines both dimensions).\n\nRPS is the recommended default for day-to-day triage. ARS-only sort is useful when you want to find objects with the most severe cryptographic posture regardless of their business importance.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 Tables G-2 and G-3', 'FIPS 199'],
    relatedIds: ['rs-ars', 'rs-rps', 'inv-crypto-objects'],
  },

  {
    id: 'inv-crypto-objects',
    title: 'Identities tab -- cryptographic objects',
    category: 'Inventory',
    subcategory: 'Identities',
    summary: 'The Identities tab shows every individual cryptographic object: TLS certificates, SSH keys, code-signing certificates, encryption keys, AI agent tokens, and secrets.',
    tags: ['identities', 'certificates', 'ssh keys', 'secrets', 'tokens', 'crs', 'algorithm'],
    sections: [
      {
        heading: 'Object types',
        body: 'TLS Certificate: server or client certificate used to authenticate and encrypt network connections. Governed by CA/Browser Forum Baseline Requirements.\n\nSSH Key: public/private key pair used for SSH authentication. Includes user keys, host keys, and authorized_keys entries. Governed by NIST IR 7966.\n\nSSH Certificate: CA-signed SSH credential with explicit validity period and principal scope. More secure than raw SSH keys because they expire and carry access scope.\n\nCode-Signing Certificate: used to sign software packages, scripts, or container images. Tampering with signed code is detectable.\n\nK8s Workload Certificate: short-lived certificate used by Kubernetes services for mutual TLS within a service mesh.\n\nEncryption Key: symmetric or asymmetric key used to encrypt data at rest or in transit. May be stored in an HSM, cloud KMS, or software keystore.\n\nAI Agent Token: credential issued to an autonomous AI agent or copilot. Carries permission scope that governs what the agent can access.\n\nAPI Key / Secret: non-certificate credential used to authenticate to an API or service.',
      },
      {
        heading: 'CRS score',
        body: 'Each object has a CRS (Crypto Risk Score) 0–100 computed from five components:\n\nAlgorithm Risk (31% weight): how weak is the algorithm? RSA-1024 = 95/100. AES-256 = 5/100. Scored against NIST SP 800-131A Rev 2 Table 1.\n\nLifecycle Risk (24% weight): how old is the object relative to policy? Is it near expiry? AgeScore = min(100, (actual_age / policy_max_age) × 100).\n\nExposure Risk (19% weight): is it internet-facing? Shared across hosts? Stored outside an HSM?\n\nAccess Risk (15% weight): does it have an owner? Is it over-privileged? Does it grant root or admin access?\n\nCompliance Risk (11% weight): is it in a regulated scope (PCI, HIPAA, FedRAMP) with an active violation?',
      },
      {
        heading: 'Risk class',
        body: 'Every object carries a risk class that determines its colour and workflow:\n\nOperational (coral/amber icons): exploitable today. The object needs immediate remediation within days to weeks.\n\nQuantum (purple icons): the algorithm is broken by Shor\'s algorithm on a quantum computer. The object needs migration to a NIST FIPS 203/204/205 algorithm as part of the PQC migration programme.\n\nBoth: the object is both classically weak and quantum-vulnerable. Example: RSA-1024. Requires immediate rotation (operational) AND migration planning (quantum).',
      },
      {
        heading: 'Status values',
        body: 'Healthy: valid, not expiring, has an owner, policy-compliant.\n\nExpiring: within the configured alert threshold (default: 30 days for TLS, 14 days for SSH certificates).\n\nExpired: validity period has passed. Service disruption likely.\n\nOrphaned: no assigned owner. High access risk because there is no accountable person to rotate or revoke it.\n\nRevoked: certificate has been revoked by the issuing CA.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-131A Rev 2', 'NIST IR 7966', 'CA/Browser Forum BR v2.0 section 6.3.2'],
    relatedIds: ['rs-crs', 'inv-it-assets', 'rem-overview'],
  },

  {
    id: 'inv-groups',
    title: 'Groups -- logical collections for policy and operations',
    category: 'Inventory',
    subcategory: 'Groups',
    summary: 'Groups are named collections of cryptographic objects used to apply policies, run bulk operations, and generate targeted reports.',
    tags: ['groups', 'policy', 'bulk', 'collections', 'organisation'],
    sections: [
      {
        heading: 'Purpose of groups',
        body: 'Groups let you organise cryptographic objects by business context rather than technical type. Example groups:\n\n"Payments Team Assets": all certificates and keys used by the payments processing service -- regardless of whether they are TLS certificates, SSH keys, or encryption keys.\n\n"RSA-2048 Production Certs": all production TLS certificates using RSA-2048, assembled for policy enforcement and PQC migration planning.\n\n"Expiring < 30 Days": dynamic group of all objects with fewer than 30 days to expiry.',
      },
      {
        heading: 'Using groups for policy',
        body: 'When creating a custom policy in Policy Builder, you must assign the policy to at least one group. The policy applies only to objects within that group. This prevents broad policies from accidentally affecting the entire estate.\n\nExample: a policy requiring RSA-4096 minimum key length can be scoped to "Payments Team Assets" without applying to development systems that use RSA-2048 for testing.',
      },
      {
        heading: 'Group risk scores',
        body: 'Each group displays a Risk Score (0–100) representing the average CRS of objects within it, weighted by object severity. A group with mostly healthy objects but a few Critical violations will show a higher score than a simple average would suggest, because the Critical objects are weighted more heavily.',
      },
    ],
    relatedIds: ['pol-custom', 'inv-crypto-objects'],
  },

  // ── POLICIES ───────────────────────────────────────────────────────────────

  {
    id: 'pol-overview',
    title: 'Policy Builder overview',
    category: 'Policies',
    summary: 'The Policy Builder defines the rules that determine what constitutes a violation in your environment. It has four tabs: Out-of-Box Policies, Custom Policies, Violations, and Compliance Frameworks.',
    tags: ['policy', 'rules', 'violations', 'compliance', 'builder'],
    sections: [
      {
        heading: 'Four tabs',
        body: 'Out-of-Box Policies: pre-built policies aligned to industry standards. Enabled by default. Configurable but not deletable.\n\nCustom Policies: organisation-specific rules you create. Scoped to groups. Can block issuance, alert, auto-remediate, or create tickets.\n\nViolations: all active policy violations across the estate with status tracking (Open, Acknowledged, Remediated).\n\nCompliance Frameworks: maps policies to regulatory frameworks (DORA, PCI-DSS v4.0, HIPAA, FIPS 140-2) and shows coverage scores.',
      },
    ],
    relatedIds: ['pol-outofbox', 'pol-custom', 'pol-violations', 'pol-compliance'],
  },

  {
    id: 'pol-outofbox',
    title: 'Out-of-Box Policies',
    category: 'Policies',
    subcategory: 'Out-of-Box',
    summary: 'Pre-built policies aligned to NIST, CIS, PCI DSS, and HIPAA. Enabled by default. Configure thresholds and environments without changing the underlying rule logic.',
    tags: ['out of box', 'built-in', 'default', 'nist', 'pci', 'hipaa', 'cis'],
    sections: [
      {
        heading: 'Included policies',
        body: 'Weak Algorithm Detection: flags objects using RSA-1024, SHA-1, 3-key TDEA, or other NIST SP 800-131A deprecated algorithms. Severity: Critical. Regulatory basis: NIST SP 800-131A Rev 2 Table 1.\n\nCertificate Expiry Alert: flags certificates within configurable thresholds of expiry (default: Critical at 7 days, High at 14 days, Medium at 30 days). Regulatory basis: CA/Browser Forum BR v2.0.\n\nOrphaned SSH Key: flags SSH keys with no assigned owner. Severity: High. Regulatory basis: NIST IR 7966 section 4.6, NIST SP 800-53 Rev 5 AC-2(3).\n\nPCI-DSS Cardholder Zone: flags policy violations on assets tagged as in-scope for PCI DSS. Severity: Critical. Regulatory basis: PCI DSS v4.0 Requirement 4.2.1.\n\nAI Agent Over-Privilege: flags AI agent tokens with more permissions than demonstrated need. Severity: High. Regulatory basis: NIST SP 800-53 Rev 5 AC-6 (Least Privilege).\n\nDORA Compliance: flags certificate expiry and algorithm violations on assets in DORA scope. Severity: High. Regulatory basis: EU DORA Regulation 2022/2554 Article 6.',
      },
      {
        heading: 'Configuring a policy',
        body: 'Click "Configure" on any out-of-box policy to adjust:\n\nAlert thresholds: for expiry policies, set the day thresholds at which each severity level triggers.\n\nSeverity: change the severity of findings from this policy (e.g. demote Medium to Low for a specific environment).\n\nEnvironment scope: limit the policy to Production only, or extend it to Staging and Development.\n\nEnabled toggle: disable a policy if it generates too many false positives in your environment. Disabling a built-in policy is logged in the audit trail.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-131A Rev 2', 'CA/Browser Forum BR v2.0', 'PCI DSS v4.0', 'NIST IR 7966', 'EU DORA 2022/2554'],
    relatedIds: ['pol-custom', 'pol-violations'],
  },

  {
    id: 'pol-custom',
    title: 'Custom Policies',
    category: 'Policies',
    subcategory: 'Custom',
    summary: 'Create organisation-specific policy rules scoped to groups. Use AI auto-fill to draft a policy from a plain-English description, or fill in the form manually.',
    tags: ['custom policy', 'create', 'rule', 'group', 'ai', 'auto-fill'],
    sections: [
      {
        heading: 'Creating a policy',
        body: 'Click "Create Policy" in the Custom Policies tab. You can either:\n\n1. Describe the policy in plain English and click "AI Auto-fill from Description". The AI will parse your intent and pre-fill the form fields. Review and adjust before saving.\n\n2. Fill in the form manually: name, asset type, condition (e.g. "Expiry less than", "Algorithm equals", "No rotation in"), value, severity, environment scope, target groups, and actions on violation.\n\nPolicies must be assigned to at least one group before activation.',
      },
      {
        heading: 'Policy conditions',
        body: 'Available conditions:\n\nExpiry less than [value]: triggers when a certificate or key has fewer than [value] days remaining. Example: "Expiry less than 30 days" on TLS certificates in Production.\n\nAlgorithm equals [value]: triggers when an object uses a specific algorithm. Example: "Algorithm equals RSA-2048" to flag legacy key length before migrating.\n\nCA not in list [value]: triggers when a certificate was not issued by an approved CA. Example: "CA not in list DigiCert, Entrust, GlobalSign" to enforce an approved CA list.\n\nKey length less than [value]: triggers when a key is shorter than the specified length.\n\nNo rotation in [value]: triggers when a key or secret has not been rotated within the specified period.',
      },
      {
        heading: 'Actions on violation',
        body: 'Alert only: creates a finding in the Violations tab. No automated action.\n\nAuto-remediate: triggers the appropriate automated workflow (renew, rotate, assign owner) without manual approval. Use with caution in production.\n\nEscalate to owner: sends a notification to the registered object owner.\n\nBlock issuance: prevents new objects that would violate this policy from being issued via the platform. Does not affect objects already in inventory.\n\nCreate TrustOps ticket: automatically creates a ticket in the Tickets module with the finding details pre-populated.',
      },
      {
        heading: 'Policy lifecycle',
        body: 'Policies can be saved as Draft (not yet enforced) or Activated (enforcing immediately). Draft policies are shown in the list but do not create violations.\n\nActivating, deactivating, editing, and deleting policies are all logged in the immutable audit trail with actor identity and timestamp.',
      },
    ],
    regulatoryRefs: ['ISO/IEC 27005:2022 section 8.3', 'PCI DSS v4.0 Requirement 12.3.2'],
    relatedIds: ['pol-outofbox', 'inv-groups', 'pol-violations'],
  },

  {
    id: 'pol-violations',
    title: 'Violations tab',
    category: 'Policies',
    subcategory: 'Violations',
    summary: 'All active policy violations across the estate. Track status (Open, Acknowledged, Remediated), bulk-remediate selected items, and link directly to remediation workflows.',
    tags: ['violations', 'open', 'acknowledged', 'remediated', 'bulk', 'fix'],
    sections: [
      {
        heading: 'Violation status lifecycle',
        body: 'Open: violation detected and not yet actioned. Requires remediation or acknowledgement.\n\nAcknowledged: a team member has reviewed the violation and accepted the risk (with justification). Acknowledged violations remain visible and are included in compliance reporting as risk acceptances.\n\nRemediated: the underlying issue has been resolved. The violation is closed. Audit evidence of the remediation (who, when, what action) is recorded.',
      },
      {
        heading: 'Bulk remediation',
        body: 'Select multiple violations using the checkboxes and click "Bulk Remediate". A confirmation modal shows the full list of selected items and a warning about the number of services affected.\n\nBulk remediation creates individual tickets or triggers individual workflows for each selected violation. It does not execute a single bulk action -- each object is remediated through its own workflow to preserve the audit trail.',
      },
      {
        heading: 'Linking to inventory',
        body: 'Click "View" on any violation row to navigate to the object in the Inventory with all filters pre-applied, showing exactly which object triggered the violation.',
      },
    ],
    relatedIds: ['pol-outofbox', 'pol-custom', 'rem-overview'],
  },

  {
    id: 'pol-compliance',
    title: 'Compliance Frameworks',
    category: 'Policies',
    subcategory: 'Compliance',
    summary: 'Maps enabled policies to regulatory frameworks and shows compliance scores, open violations by framework, and audit report generation.',
    tags: ['compliance', 'pci', 'hipaa', 'fips', 'dora', 'framework', 'audit', 'report'],
    sections: [
      {
        heading: 'Supported frameworks',
        body: 'DORA (EU 2022/2554): ICT risk management requirements for financial entities operating in the EU. DORA requires cryptographic controls as part of operational resilience. Assessment covers certificate hygiene, key rotation, and algorithm strength.\n\nPCI DSS v4.0: Payment Card Industry Data Security Standard. Requirement 4.2.1 mandates strong cryptography for cardholder data transmission. Requirement 12.3.2 requires targeted risk analysis. Score reflects compliance of in-scope assets.\n\nHIPAA: Health Insurance Portability and Accountability Act Security Rule. 45 CFR 164.312 requires encryption of electronic protected health information (ePHI). Score reflects compliance of PHI-handling assets.\n\nFIPS 140-2: Federal Information Processing Standard for cryptographic module validation. Required for US federal systems and some regulated industries. Score reflects use of FIPS-approved algorithms and key storage.',
      },
      {
        heading: 'Compliance score',
        body: 'Each framework shows a percentage score representing the proportion of in-scope objects and policies that are compliant. A score of 100% means no open violations against that framework\'s requirements.\n\nScores are computed nightly and after any policy change or violation status update.',
      },
      {
        heading: 'Generating audit reports',
        body: 'Click "Generate Report" on any framework card to produce a timestamped compliance evidence report. The report includes: assessment date, score, list of compliant controls, list of open violations with remediation status, and a list of risk acceptances (acknowledged violations).\n\nReports are suitable for submission to auditors and regulators as evidence of ongoing compliance management.',
      },
    ],
    regulatoryRefs: ['PCI DSS v4.0', 'HIPAA 45 CFR 164.312', 'EU DORA 2022/2554', 'NIST FIPS 140-2'],
    relatedIds: ['pol-outofbox', 'pol-violations'],
  },

  // ── VIOLATIONS ─────────────────────────────────────────────────────────────

  {
    id: 'viol-overview',
    title: 'Violations -- operational versus quantum',
    category: 'Violations',
    summary: 'The Violations page shows all cryptographic risk findings split into two tabs: Operational Violations (fix now) and Quantum Risk (migration programme). Each tab routes to a different remediation workflow.',
    tags: ['violations', 'operational', 'quantum', 'pqc', 'hndl', 'remediation'],
    sections: [
      {
        heading: 'Two distinct workflows',
        body: 'The Violations page deliberately separates two types of risk into two tabs because they require fundamentally different responses:\n\nOperational Violations: exploitable today. The response is immediate: rotate the key, renew the certificate, revoke the token, assign an owner. Remediation timeline: 24 hours to 30 days depending on severity.\n\nQuantum Risk: the algorithm will be broken by a quantum computer. The response is a multi-quarter migration programme. Remediation timeline: 6 months to 3 years. Action: Add to the QTH (Quantum Transition Hub) migration queue.',
      },
      {
        heading: 'Operational Violations tab',
        body: 'Sorted by severity (Critical first) then by days to failure (imminent first). Columns: severity, credential name, violation type, reason, owner team, environment, days to failure, action button.\n\nDays to failure: the number of days until service disruption if the violation is not remediated. For expired certificates, this is shown as negative (already failed). For expiring certificates, it counts down. For algorithm violations, this field shows "—" because there is no hard deadline, just ongoing risk.\n\nAction button: routes directly to the relevant remediation workflow (Renew via DigiCert, Rotate SSH Key, Assign Owner, Migrate to HSM) with the specific object pre-selected.',
      },
      {
        heading: 'Quantum Risk tab',
        body: 'Shows all objects using quantum-vulnerable algorithms (RSA, ECC, DSA, DH). Sorted by HNDL severity then by years past the NIST 2030 deadline.\n\nColumns: PQC severity, credential name, algorithm, expiry year, years past 2030 deadline, production flag, harvest risk, QTH status, action button.\n\nHarvest risk: Active means the object is internet-facing and protecting long-lived sensitive data -- a high-value HNDL target. Passive means lower exposure.\n\nQTH status: the migration pipeline state (Not assessed, In assessment, Migration planned, In-flight, Migrated).\n\nAction: "Add to QTH" (if not yet in the queue) or "View in QTH" (if migration is already planned or in progress).',
      },
      {
        heading: 'Quantum Risk banner',
        body: 'The purple banner at the top of the Violations page always shows the overall quantum exposure: total quantum-vulnerable identities, how many expire after the 2030 deadline (compounding HNDL risk), and the current migration completion projection.',
      },
    ],
    regulatoryRefs: ['NIST IR 8547', 'NSA CNSA 2.0', 'CISA/NSA/NIST Quantum-Readiness Advisory (2022)', 'NIST FIPS 203/204/205'],
    relatedIds: ['pol-violations', 'rem-overview', 'qp-overview'],
  },

  // ── REMEDIATION ────────────────────────────────────────────────────────────

  {
    id: 'rem-overview',
    title: 'Remediation -- module-based workflows',
    category: 'Remediation',
    summary: 'The Remediation page provides module-based workflows for fixing cryptographic violations. Modules cover CLM (certificates), SSH, code signing, Kubernetes, encryption keys, AI agent tokens, and secrets.',
    tags: ['remediation', 'modules', 'renew', 'rotate', 'revoke', 'fix'],
    sections: [
      {
        heading: 'Left sidebar navigation',
        body: 'The left panel lists all remediation modules. Each module shows the count of objects needing attention. The lock icon indicates modules requiring an add-on license.\n\nAll Objects: shows all remediation items across all modules in a unified view.\n\nCertificates (CLM): TLS/SSL certificate renewal, revocation, and deployment tracking.\n\nSSH Keys and Certs: SSH key rotation, provisioning, and certificate migration.\n\nCode Signing: code-signing certificate management (requires add-on license).\n\nK8s / Service Mesh: Kubernetes workload certificate management.\n\nEncryption Keys: encryption key rotation and HSM migration (requires add-on license).\n\nAI Agent Tokens: AI agent credential rotation and privilege management.\n\nAPI Keys and Secrets: secret rotation and vault migration (requires add-on license).',
      },
      {
        heading: 'Issue filters',
        body: 'Within each module, filter by issue type: All Issues, Expiring/Expired, PQC Migration, Orphaned, or Policy Violations. The count next to each filter shows how many items match.',
      },
      {
        heading: 'Remediation wizard',
        body: 'Click the action button on any item to open the Remediation Wizard. The wizard guides you through:\n\nStep 1 - Review Impact: shows the asset, algorithm, environment, owner, and number of dependent services affected.\n\nStep 2 - Configure: select the target algorithm for rotation, the replacement CA for renewal, or the new owner for an orphaned credential. Set the schedule (immediately or next maintenance window).\n\nStep 3 - Confirm: review the execution summary and confirm. The wizard creates a workflow that executes the action and records the outcome in the audit trail.',
      },
      {
        heading: 'Provisioning new credentials',
        body: 'Each licensed module has a "Provision" button to create new credentials. The provisioning wizard collects the required fields for that object type (e.g. Common Name and SANs for TLS certificates, key type and target hosts for SSH keys) and submits the request to the appropriate backend system (CA, KMS, vault, etc.).',
      },
      {
        heading: 'Unlicensed modules',
        body: 'Clicking an unlicensed module shows a feature description and a "Request License to Enable" button. This creates a ticket in the Tickets module routed to your IT Procurement or Platform Admin team.',
      },
      {
        heading: 'CLM Deployments view',
        body: 'Within the Certificates (CLM) module, the "Deployments" tab tracks certificate deployment workflows -- the execution layer showing which certificates are being deployed to which systems, in which wave, and with what status. This is distinct from the Issues view which shows what needs to be fixed.',
      },
    ],
    relatedIds: ['viol-overview', 'tick-overview', 'inv-crypto-objects'],
  },

  // ── TICKETS ────────────────────────────────────────────────────────────────

  {
    id: 'tick-overview',
    title: 'Tickets (TrustOps)',
    category: 'Tickets',
    summary: 'TrustOps tickets track remediation work items, license requests, and escalations. Tickets are created automatically by policy actions or manually from any object in the platform.',
    tags: ['tickets', 'trustops', 'workflow', 'jira', 'servicenow', 'tracking'],
    sections: [
      {
        heading: 'Ticket creation',
        body: 'Tickets are created in three ways:\n\n1. Automatically: when a policy with "Create TrustOps ticket" action triggers a violation.\n\n2. From remediation: the "Create Ticket" option in the row menu of any remediation item creates a pre-populated ticket with the object details, violation type, and recommended action.\n\n3. Manually: click "New Ticket" in the Tickets page to create a ticket for any purpose.',
      },
      {
        heading: 'Ticket fields',
        body: 'Summary: short description of the issue.\nPriority: Critical, High, Medium, or Low.\nAssigned to: team or individual responsible for resolution.\nObject: the cryptographic object the ticket relates to (pre-populated when created from a finding).\nViolation: the policy violation that triggered the ticket.\nDue date: calculated from severity (Critical = 24h, High = 7d, Medium = 30d).\nStatus: Open, In Progress, Resolved, or Closed.',
      },
      {
        heading: 'Integration with external systems',
        body: 'Tickets can be synchronised with external systems via the Integrations module. Supported targets include Jira, ServiceNow, and PagerDuty. When an integration is active, creating a TrustOps ticket also creates a corresponding ticket in the external system, and status updates are synchronised bidirectionally.',
      },
    ],
    relatedIds: ['rem-overview', 'int-targets'],
  },

  // ── INTEGRATIONS ───────────────────────────────────────────────────────────

  {
    id: 'int-overview',
    title: 'Integrations overview',
    category: 'Integrations',
    summary: 'Integrations connect the AVX Trust Hub to certificate authorities, cloud platforms, secret managers, HSMs, and IT service management tools.',
    tags: ['integrations', 'connectors', 'ca', 'cloud', 'vault', 'itsm'],
    sections: [
      {
        heading: 'Two integration types',
        body: 'Sources: systems that AVX Trust Hub reads from to discover and monitor cryptographic objects. Examples: AWS KMS, Azure Key Vault, DigiCert, HashiCorp Vault.\n\nTargets: systems that AVX Trust Hub writes to during remediation workflows. Examples: Jira (ticket creation), ServiceNow (incident management), PagerDuty (alerting).',
      },
      {
        heading: 'Source integrations',
        body: 'CA integrations (DigiCert, Entrust, Let\'s Encrypt, MSCA): enable certificate discovery from the CA, certificate issuance and renewal via the Remediation module, and real-time expiry monitoring.\n\nCloud KMS integrations (AWS KMS, Azure Key Vault, Google Cloud KMS): enable encryption key discovery, key rotation, and key usage monitoring.\n\nVault integrations (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault): enable secret discovery, rotation, and policy enforcement.\n\nInfrastructure integrations (AWS EC2, Azure VMs, GCP Compute): enable server inventory discovery and SSH key association with infrastructure.',
      },
      {
        heading: 'Connecting an integration',
        body: 'Click "Connect" on any unconnected integration card. Enter the required credentials (API key, service account, OAuth flow depending on the integration). The platform validates the connection and runs an initial discovery scan.\n\nConnected integrations show a green status badge and the date of the last successful sync.',
      },
    ],
    relatedIds: ['int-sources', 'int-targets', 'disc-overview'],
  },

  // ── QUANTUM POSTURE ────────────────────────────────────────────────────────

  {
    id: 'qp-overview',
    title: 'Quantum Posture and QTH (Quantum Transition Hub)',
    category: 'Quantum Posture',
    summary: 'The Quantum Posture page shows the organisation\'s readiness for the post-quantum cryptography transition mandated by NIST and NSA CNSA 2.0, and manages the migration pipeline via the QTH.',
    tags: ['quantum', 'pqc', 'qth', 'migration', 'nist', 'cnsa', 'hndl', 'shor'],
    sections: [
      {
        heading: 'Why quantum risk matters now',
        body: 'The most common misconception about quantum risk is that it is a future problem. It is not. Nation-state adversaries are capturing encrypted network traffic today ("Harvest Now") and storing it for decryption when a Cryptographically Relevant Quantum Computer (CRQC) arrives ("Decrypt Later"). This is known as HNDL (Harvest-Now-Decrypt-Later).\n\nFor any data that needs to remain confidential for more than 5–7 years -- financial records, health data, classified information, long-lived credentials -- the HNDL risk is active today, regardless of when a CRQC is publicly demonstrated.\n\nThe algorithms currently broken by quantum computers (specifically Shor\'s algorithm) are: RSA, ECC (P-256, P-384, ECDSA, ECDH), DSA, and Diffie-Hellman. Every TLS handshake, SSH authentication, code-signing operation, and PKI certificate using these algorithms is a potential HNDL target.',
      },
      {
        heading: 'NIST and NSA mandates',
        body: 'NIST published three post-quantum cryptography standards in August 2024:\n- FIPS 203 (ML-KEM, formerly CRYSTALS-Kyber): key encapsulation -- replaces RSA and ECC for key exchange\n- FIPS 204 (ML-DSA, formerly CRYSTALS-Dilithium): digital signatures -- replaces RSA and ECDSA for signing\n- FIPS 205 (SLH-DSA, formerly SPHINCS+): alternative signature scheme with different security assumptions\n\nNSA CNSA 2.0 (September 2022) sets the migration timeline for national security systems:\n- 2025: begin testing PQC for new systems\n- 2027: PQC required for all new systems\n- 2030: PQC required for all systems\n- 2033: RSA and ECC fully retired\n\nOrganisations outside the national security sector should use CNSA 2.0 as the most conservative (and therefore safest) migration schedule.',
      },
      {
        heading: 'QTH pipeline stages',
        body: 'Every quantum-vulnerable object moves through five stages in the QTH:\n\nNot assessed: identified as quantum-vulnerable but migration planning has not started.\n\nIn assessment: determining whether the algorithm can be changed without service disruption (crypto agility assessment). Identifying dependencies and interoperability requirements.\n\nMigration planned: replacement algorithm selected (FIPS 203/204/205), migration wave assigned, dependencies mapped, test environment prepared.\n\nIn-flight: migration executing. During this phase the system may operate in hybrid mode (both classical and PQC algorithms active simultaneously) per ETSI TR 103 619 hybrid transition strategy.\n\nMigrated: object is operating on a NIST-approved PQC algorithm. Validated and tested. CBOM updated.',
      },
      {
        heading: 'CBOM (Cryptographic Bill of Materials)',
        body: 'The CBOM is a complete inventory of all cryptographic algorithms, key lengths, and protocols in use across the organisation. It is the foundation of PQC migration planning.\n\nClick "Generate CBOM" to produce a CBOM export in standard format. The CBOM identifies every RSA, ECC, and other quantum-vulnerable algorithm in use, maps it to the objects and systems that use it, and provides a starting point for migration wave planning.\n\nCBOM generation is recommended as the first action in a PQC migration programme.',
      },
      {
        heading: 'Migration prioritisation',
        body: 'Not all quantum-vulnerable objects need to be migrated first. Priority is determined by HNDL exposure:\n\nHighest priority: objects protecting long-lived sensitive data (financial records retained 7+ years, PHI retained 10+ years, classified data). These represent the highest HNDL risk because an adversary who captured the traffic today gains access to this data when CRQCs arrive.\n\nHigh priority: CA certificates and code-signing certificates. Migration of CA infrastructure is foundational -- all certificates issued by a CA inherit its quantum vulnerability.\n\nMedium priority: short-lived session credentials, API keys with 90-day rotation, internal service mesh certificates.\n\nLower priority: development and test credentials with no production data exposure.',
      },
    ],
    regulatoryRefs: ['NIST FIPS 203', 'NIST FIPS 204', 'NIST FIPS 205', 'NIST IR 8547', 'NSA CNSA 2.0', 'CISA/NSA/NIST Quantum-Readiness Advisory (2022)', 'ETSI TR 103 619'],
    relatedIds: ['viol-overview', 'rs-crs', 'rem-overview'],
  },

  // ── RISK SCORING ───────────────────────────────────────────────────────────

  {
    id: 'rs-crs',
    title: 'CRS -- Crypto Risk Score (object level)',
    category: 'Risk Scoring',
    summary: 'CRS is a 0–100 score for each individual cryptographic object, computed from five weighted components: Algorithm Risk, Lifecycle Risk, Exposure Risk, Access Risk, and Compliance Risk.',
    tags: ['crs', 'crypto risk score', 'object', 'score', 'formula', 'algorithm', 'lifecycle'],
    sections: [
      {
        heading: 'Formula',
        body: 'CRS = min(100, round( (w1×CS + w2×LR + w3×EX + w4×AR + w5×CR) / sum(w) ))\n\nDefault weights: Algorithm Risk 31%, Lifecycle Risk 24%, Exposure Risk 19%, Access Risk 15%, Compliance Risk 11%.\n\nAll weights are customer-adjustable per ISO/IEC 27005:2022 section 8.3, which requires organisations to set their own risk evaluation criteria. Weight changes are logged in the audit trail.',
      },
      {
        heading: 'CS -- Algorithm Risk (31%)',
        body: 'Scores the inherent weakness of the cryptographic algorithm and key length, against NIST SP 800-131A Rev 2 Table 1.\n\nExample scores: RSA-1024 = 95 (disallowed), SHA-1 = 95 (deprecated 2015), RSA-2048 = 75 (legacy but acceptable), ECC P-256 = 50 (approved but quantum-vulnerable), AES-256 = 5 (strong), ML-KEM = 5 (PQC-safe).\n\nThe algorithm score drives the riskClass tag: RSA/ECC/DSA scores quantum as the risk class because Shor\'s algorithm breaks them. RSA-1024 scores both because it is also classically disallowed.',
      },
      {
        heading: 'LR -- Lifecycle Risk (24%)',
        body: 'Scores the temporal hygiene of the object: how old it is relative to the rotation policy, and how close it is to expiry.\n\nFormula: LR = min(100, max(AgeScore, ExpiryScore) + 0.30 × min(AgeScore, ExpiryScore))\n\nAgeScore = min(100, (actual_age_days / policy_max_age_days) × 100)\n\nDefault policy_max_age: SSH keys 90 days (NIST IR 7966), TLS certificates 398 days (CA/Browser Forum BR v2.0), machine secrets 90 days, AI agent credentials 30 days. All customer-overridable.',
      },
      {
        heading: 'EX -- Exposure Risk (19%)',
        body: 'Scores the attack surface: is the object internet-facing? Shared across multiple hosts (enabling lateral movement)? Stored outside an HSM?\n\nKey factors: internet-facing endpoint (+30–40 pts), shared across hosts (+20–30 pts), non-HSM storage (+10–20 pts), no network segmentation (+8–15 pts).\n\nBasis: CVSS v3.1 Attack Vector and Scope sub-metrics, adapted for cryptographic objects. NIST SP 800-53 Rev 5 SC-12, CIS Controls v8 Control 12.',
      },
      {
        heading: 'AR -- Access Risk (15%)',
        body: 'Scores access governance: does the object have an owner? Is it over-privileged? Does it grant root or admin access? Includes asset criticality (production tier, data sensitivity).\n\nKey factors: orphaned (no owner) +38–48 pts, root access +22–30 pts, production tier +20–25 pts, PII/PHI/financial data sensitivity +15–20 pts, over-privileged AI agent +20–28 pts.\n\nBasis: NIST SP 800-53 Rev 5 AC-2 and AC-6, NIST SP 800-30 Rev 1 Tables G-2 and G-3, FIPS 199.',
      },
      {
        heading: 'CR -- Compliance Risk (11%)',
        body: 'Scores regulatory consequence: is this object in a regulated scope (PCI, HIPAA, FedRAMP) with a confirmed policy violation?\n\nCR is a graduated matrix: base score from regulatory scope × violation severity modifier. It does not re-score the technical severity already captured by CS or LR.\n\nKey regulatory bases: PCI DSS v4.0 section 12.3.2, HIPAA 45 CFR 164.308(a)(1), ISO/IEC 27005:2022 section 8.3.',
      },
      {
        heading: 'Severity thresholds',
        body: 'Critical: 80–100. Immediate action required. Analogous to CVSS Critical (9.0–10.0).\nHigh: 60–79. Remediate within 7 days. Analogous to CVSS High (7.0–8.9).\nMedium: 30–59. Planned remediation within 30 days. Analogous to CVSS Medium (4.0–6.9).\nLow: 0–29. Monitor. No active policy violation.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-131A Rev 2', 'NIST SP 800-57 Pt 1 Rev 5', 'NIST IR 7966', 'CVSS v3.1 (FIRST)', 'CA/Browser Forum BR v2.0', 'NIST SP 800-53 Rev 5', 'ISO/IEC 27005:2022'],
    relatedIds: ['rs-ars', 'rs-ers', 'inv-crypto-objects'],
  },

  {
    id: 'rs-ars',
    title: 'ARS -- Asset Risk Score (asset level)',
    category: 'Risk Scoring',
    summary: 'ARS aggregates the CRS scores of all objects on an asset into a single 0–100 score using a max-anchored formula that prevents a single critical object from being diluted by surrounding clean objects.',
    tags: ['ars', 'asset risk score', 'aggregation', 'max', 'percentile'],
    sections: [
      {
        heading: 'Formula',
        body: 'ARS = min(100, round( 0.55 × max(CRS) + 0.45 × (0.6 × P90 + 0.4 × P75) + log(1+critCount) × 4 + log(1+highCount) × 2 ))\n\nmax(CRS): the worst single object score. Weighted at 55% so one critical object cannot be averaged away.\n\nP90 and P75: 90th and 75th percentile of all CRS scores. Represents the distribution of risk, not just the worst case.\n\nDistribution bonus: logarithmic concentration bonus for multiple high-severity objects. 5 Critical objects score higher than 1 Critical object, but 50 Critical objects do not score proportionally more than 10 -- because correlated objects likely share a root cause.',
      },
      {
        heading: 'Why not average?',
        body: 'Simple averaging is the most common failure mode in hierarchical risk scoring. An asset with 500 SSH keys, one of which is RSA-1024 with root access to a production database, would score ~12 when averaged (499 clean keys dilute the one critical one). The ARS formula prevents this: the most dangerous object anchors the score at 55% weight.',
      },
      {
        heading: 'Sub-indicators',
        body: 'In the asset detail view, two sub-indicators appear below the ARS badge:\n\nOperational: count of objects with riskClass = operational or both. These need immediate remediation.\n\nQuantum: count of objects with riskClass = quantum or both. These need migration planning.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 section 3.4'],
    relatedIds: ['rs-crs', 'rs-ers', 'inv-it-assets'],
  },

  {
    id: 'rs-ers',
    title: 'ERS -- Enterprise Risk Score (organisation level)',
    category: 'Risk Scoring',
    summary: 'ERS is the organisation-wide posture score: a criticality-weighted average of all ARS scores with a floor rule, incorporating a time-weighted quantum component that grows as the NIST 2030 deadline approaches.',
    tags: ['ers', 'enterprise risk score', 'organisation', 'posture', 'floor', 'quantum weight'],
    sections: [
      {
        heading: 'Formula',
        body: 'ERS = min(100, max( blend(weightedAvg, quantumComponent, qw), floor ))\n\nblend = weightedAvg × (1 - qw) + quantumComponent × qw\n\nweightedAvg: criticality-weighted average of all ARS scores, where weights come from Business Impact (Critical=4, High=3, Moderate=2, Low=1) × regulated scope multiplier (1.5× if PCI/HIPAA/FedRAMP).\n\nquantumComponent: proportion of quantum-vulnerable objects across the estate, weighted by asset criticality.\n\nqw (quantum weight): starts at 0.15 in 2024 and increases to 0.35 by 2030, then holds at 0.35. An organisation that ignores PQC migration will see ERS worsen each year even with stable operational hygiene.',
      },
      {
        heading: 'Floor rule',
        body: 'ERS = max(blend, maxProductionCriticalARS × 0.85)\n\nThe floor rule prevents a sea of clean low-impact assets from mathematically burying one burning critical production system. If the highest ARS on any Critical-impact production asset is 90, ERS cannot fall below 76 (0.85 × 90) regardless of how clean the rest of the estate is.\n\nWhen the floor rule is active, the dashboard shows "Floor rule active -- held by [asset name]". The only way to reduce ERS below the floor is to remediate the triggering asset.',
      },
      {
        heading: 'Business impact and asset weights',
        body: 'Assets with higher business impact carry more weight in ERS:\n\nCritical (user-set or auto-derived from Vault/HSM/Database/API Gateway type): base weight 4\nHigh: base weight 3\nModerate: base weight 2\nLow: base weight 1\n\nProduction assets in a regulated scope (PCI, HIPAA, FedRAMP) receive a 1.5× multiplier.\n\nBusiness impact can be overridden in the Inventory Infrastructure tab. All overrides require a justification and are logged in the audit trail.',
      },
      {
        heading: 'Why ERS worsens over time without PQC migration',
        body: 'The quantum weight (qw) increases linearly from 2024 to 2030. An organisation with perfect operational hygiene but no PQC migration progress will see its ERS slowly worsen each year as the quantum component contributes more to the score.\n\nThis is intentional. It aligns with the NSA CNSA 2.0 2030 deadline and ensures that ERS reflects increasing urgency as the migration window narrows.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 section 2.3', 'ISO/IEC 27005:2022 section 8.3', 'NSA CNSA 2.0', 'FIPS 199'],
    relatedIds: ['rs-ars', 'rs-crs', 'rs-rps', 'dash-security-admin'],
  },

  {
    id: 'rs-rps',
    title: 'RPS -- Remediation Priority Score (sort key)',
    category: 'Risk Scoring',
    summary: 'RPS is a sort key used in the Inventory Infrastructure tab to surface the most important assets first. It combines ARS with business impact but is never displayed as a risk score.',
    tags: ['rps', 'remediation priority', 'sort', 'priority', 'inventory'],
    sections: [
      {
        heading: 'Formula and purpose',
        body: 'RPS = ARS × BusinessImpactMultiplier\n\nMultipliers: Critical=1.5, High=1.25, Moderate=1.0, Low=0.75\n\nRPS is used only as a sort key in the Inventory Infrastructure tab (default sort: RPS descending). It is never displayed as a standalone risk number on any screen.\n\nRPS answers the question: which assets should I look at first? ARS answers: how bad is the cryptographic posture? Business Impact answers: how important is this asset to the business? RPS combines both.',
      },
      {
        heading: 'Why RPS is not a risk score',
        body: 'Combining business impact into ARS would make ARS uninterpretable. A score of 78 should mean "the cryptographic objects on this asset are in bad shape" -- not "the objects are somewhat bad AND the asset is important". Keeping ARS pure and using RPS only for sorting preserves the integrity of both dimensions.\n\nThis is the same pattern used by Tenable\'s Asset Exposure Score (AES) combined with Asset Criticality Rating (ACR) for prioritised inventory views.',
      },
    ],
    relatedIds: ['rs-ars', 'inv-it-assets'],
  },

  // ── PLATFORM CORE ──────────────────────────────────────────────────────────

  {
    id: 'pc-overview',
    title: 'Platform Core -- settings and administration',
    category: 'Platform Core',
    summary: 'Platform Core covers system settings, user management, audit logs, risk weight configuration, and platform health monitoring.',
    tags: ['settings', 'admin', 'audit', 'users', 'weights', 'configuration'],
    sections: [
      {
        heading: 'Risk weight configuration',
        body: 'The CRS component weights (Algorithm Risk, Lifecycle Risk, Exposure Risk, Access Risk, Compliance Risk) are customer-configurable in Platform Core.\n\nChanging weights affects how CRS, ARS, and ERS are calculated across the entire estate. Weight changes are logged with the actor identity, timestamp, and before/after values. All weight configurations are named profiles (e.g. "PCI Audit Posture", "PQC Migration Focus") so you can switch between configurations for different assessment purposes.\n\nRegulatory basis: ISO/IEC 27005:2022 section 8.3 explicitly requires that risk evaluation criteria be set by the organisation, not the tool vendor.',
      },
      {
        heading: 'Audit trail',
        body: 'All security-relevant actions are logged in the immutable audit trail:\n\n- Policy creation, modification, activation, and deactivation\n- Business impact overrides\n- Risk weight configuration changes\n- Violation acknowledgements and risk acceptances\n- Remediation actions (who initiated, what action, on which object, when)\n- Integration connection and disconnection\n- User login and privilege changes\n\nThe audit trail is append-only and cannot be modified or deleted by any user including administrators. It is exportable as a timestamped JSON or CSV file for submission to auditors.\n\nRegulatory basis: PCI DSS v4.0 Requirement 10.2.1, ISO/IEC 27001:2022 Annex A 8.15.',
      },
      {
        heading: 'Infinity Intelligence',
        body: 'The "Infinity Intelligence" AI assistant (accessible via the icon in the top-right) provides natural-language interaction with the platform. Ask questions like "which assets have the most expired certificates", "show me all RSA-1024 keys in production", or "what is the fastest way to reduce ERS by 10 points".\n\nInfinity Intelligence has read access to the full platform context including the current agent\'s selected entity (the infrastructure asset or crypto object being viewed). It does not have write access and cannot execute remediation actions directly -- it surfaces information and links to the appropriate workflows.',
      },
    ],
    regulatoryRefs: ['ISO/IEC 27005:2022 section 8.3', 'PCI DSS v4.0 Requirement 10.2.1', 'ISO/IEC 27001:2022 Annex A 8.15'],
    relatedIds: ['gs-overview', 'rs-crs'],
  },
];

export function searchHelp(query: string): HelpArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q) ||
    a.tags.some(t => t.includes(q)) ||
    a.sections.some(s =>
      s.heading.toLowerCase().includes(q) ||
      s.body.toLowerCase().includes(q)
    )
  );
}

export function getArticle(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find(a => a.id === id);
}

export function getByCategory(category: string): HelpArticle[] {
  return HELP_ARTICLES.filter(a => a.category === category);
}
