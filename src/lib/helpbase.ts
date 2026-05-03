// AVX Trust Platform — Complete Help Knowledge Base
// Covers all three persona dashboards, all pages, and all features as built.

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
  body: string;
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

  // ── GETTING STARTED ───────────────────────────────────────────────────────

  {
    id: 'gs-setup-guide',
    title: 'Getting Started — 5-step setup guide',
    category: 'Getting Started',
    summary: 'Follow these five steps to go from zero to full cryptographic posture visibility and control in your environment.',
    tags: ['setup', 'onboarding', 'getting started', 'guide', 'steps', 'first time'],
    sections: [
      {
        heading: 'Step 1 — Connect your environment',
        body: 'Go to Integrations and connect your certificate authorities (DigiCert, Entrust, Microsoft CA, Let\'s Encrypt), cloud platforms (AWS, Azure, GCP), secret managers (HashiCorp Vault, AWS Secrets Manager, CyberArk), HSMs (Thales, Entrust nShield), and ITSM tools (Jira, ServiceNow, PagerDuty).\n\nEach integration pulls your existing assets into the platform automatically. Without at least one source integration, inventory contains only manually added resources.\n\nNavigate: Sidebar → Integrations → connect any card.',
      },
      {
        heading: 'Step 2 — Run your first discovery scan',
        body: 'Once integrations are connected, run a discovery scan to find every cryptographic asset — TLS certificates, SSH keys, secrets, encryption keys, and AI agent tokens — across on-premises and cloud environments.\n\nDiscovery supports 17 scan types across 6 categories: Active Scanning, CA & PKI Systems, Cloud & Container, Endpoint & Agent, Source Code & IaC, and Vault & HSM.\n\nNavigate: Sidebar → Discovery → Run Scan or create a Discovery Profile for scheduled scanning.',
      },
      {
        heading: 'Step 3 — Set your first policy',
        body: 'Policies define what "good" looks like. The platform ships with out-of-box policies for the most critical controls: weak algorithm detection, certificate expiry alerts, orphaned SSH key detection, PCI-DSS enforcement, AI agent over-privilege, and DORA compliance.\n\nCreate a custom policy by describing it in plain English — AI Auto-fill drafts the policy fields. Assign it to a group before activating.\n\nNavigate: Sidebar → Policy Builder → Custom Policies → Create Policy.',
      },
      {
        heading: 'Step 4 — Review your Inventory',
        body: 'After discovery and policy activation, the Inventory is your universal control plane. Three tabs:\n\nInfrastructure: every server, application, and service with ARS score and business impact.\nIdentities: every cryptographic object with CRS score, algorithm, expiry, and owner.\nGroups: logical collections for policy scoping and bulk operations.\n\nEvery dashboard item navigates here with filters pre-applied. Fix Now, Create Ticket, and Assign all happen inside Inventory.\n\nNavigate: Sidebar → Inventory.',
      },
      {
        heading: 'Step 5 — Remediate your first issue',
        body: 'The Security Admin dashboard action queue shows the highest-priority findings. Click any item to go to a pre-filtered Inventory view. From there:\n\nFix Now: triggers automated remediation (renew, rotate, revoke, assign owner) if the module is licensed.\nCreate Ticket: creates a TrustOps ticket pre-populated with the finding, linked to Jira/ServiceNow/PagerDuty if configured.\nAssign: delegates to another owner.\n\nNavigate: Dashboard → action queue item → Inventory (pre-filtered) → Fix Now or Create Ticket.',
      },
    ],
    relatedIds: ['gs-overview', 'int-overview', 'disc-overview', 'pol-overview', 'inv-overview', 'rem-overview'],
  },

  {
    id: 'gs-overview',
    title: 'What is the AVX Trust Platform?',
    category: 'Getting Started',
    summary: 'The AVX Trust Platform is a unified cryptographic trust platform that discovers, scores, and remediates risk across SSH keys, TLS certificates, machine secrets, AI agent credentials, and encryption keys.',
    tags: ['overview', 'intro', 'what is', 'avx trust', 'platform'],
    sections: [
      {
        heading: 'Platform purpose',
        body: 'The AVX Trust Platform gives security teams complete visibility and control over every cryptographic object in the enterprise — SSH keys, TLS/SSL certificates, code-signing certificates, encryption keys, machine secrets, API keys, and AI agent tokens.\n\nMost security tools scan for software vulnerabilities (CVEs). AVX Trust scores cryptographic object risk: whether an algorithm is too weak, whether a credential has been rotated, whether a key has an owner, and whether long-lived data is protected by algorithms that will be broken by quantum computers.',
      },
      {
        heading: 'Three-level risk architecture',
        body: 'CRS (Crypto Risk Score): a 0–100 score for each individual cryptographic object based on algorithm strength, lifecycle hygiene, exposure, access governance, and compliance.\n\nARS (Asset Risk Score): a 0–100 score per server, application, or service — aggregated from CRS scores of all objects on that asset using a max-anchored formula that prevents a single critical object from being diluted.\n\nERS (Enterprise Risk Score): the organisation-wide posture — a criticality-weighted average of all ARS scores with a floor rule and a quantum weight component that grows as the NIST 2030 deadline approaches.',
      },
      {
        heading: 'Three personas',
        body: 'Security Admin: full platform access. Primary dashboard is Trust Posture & Risk Intelligence — ERS, action queue, policy health.\n\nCompliance Officer: audit evidence, compliance frameworks (DORA, PCI-DSS v4.0, NIS2, HIPAA, FIPS 140-2, FedRAMP), violations management, and report generation.\n\nPKI / CLM Engineer: certificate lifecycle management — expiry calendar, renewal pipeline, CA health, algorithm strength, cipher suites, and short-lived certificate governance.',
      },
      {
        heading: 'Inventory as universal control plane',
        body: 'Every actionable item on every dashboard navigates to a pre-filtered Inventory view. All actions — Fix Now, Create Ticket, Assign — happen inside Inventory. This is consistent across all three personas and all pages.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1', 'NIST SP 800-131A Rev 2', 'ISO/IEC 27005:2022'],
    relatedIds: ['gs-setup-guide', 'gs-personas', 'rs-crs', 'rs-ars', 'rs-ers'],
  },

  {
    id: 'gs-personas',
    title: 'Personas and role-based views',
    category: 'Getting Started',
    summary: 'Switch between Security Admin, Compliance Officer, and PKI/CLM Engineer using the persona selector in the top-left sidebar.',
    tags: ['persona', 'role', 'view', 'security admin', 'compliance', 'pki', 'clm', 'engineer'],
    sections: [
      {
        heading: 'Security Admin',
        body: 'Full access to all platform features. Dashboard: Trust Posture & Risk Intelligence.\n\nThree tabs: Posture (ERS, what\'s driving it, action queue, policy health), Operations (KPI strip, expiry forecast, triage queue), Readiness (crypto agility summary, algorithm concentration, PQC migration panel).\n\nResponsibilities: enterprise risk monitoring, policy enforcement, remediation orchestration, posture reporting.',
      },
      {
        heading: 'Compliance Officer',
        body: 'Focused on audit evidence and regulatory compliance. Dashboard: Compliance Posture.\n\nFour tabs: Overview (framework posture bar chart, business unit heat map, violation trend, control domain coverage), Audit Readiness (upcoming audit calendar, checklist per framework), Violations (full violations table with evidence collection and bulk remediation), Reports (Executive Summary, Auditor Evidence Bundle, Violation Aging, Delta/Change Report).\n\nSupported frameworks: DORA, PCI-DSS v4.0, NIS2, HIPAA, FIPS 140-2, FedRAMP.',
      },
      {
        heading: 'PKI / CLM Engineer',
        body: 'Focused on certificate lifecycle management. Dashboard: Certificate Lifecycle Management.\n\nFour tabs: Overview (CLM KPI strip, CA distribution pie, expiry calendar, renewal pipeline, action trend), Operations (operations status bands, scan coverage, failed renewals, non-standard certs, cert action center), Risk & Crypto (algorithm strength, signature/hash strength, cipher suite table), Short-Lived Certs (SLC governance dashboard).\n\nCertificate drill modal: click any certificate row to open a detailed modal showing risk score, algorithm, issuer, expiry, dependent assets, and remediation actions.',
      },
    ],
    relatedIds: ['gs-overview', 'dash-security-admin', 'dash-compliance', 'dash-pki'],
  },

  // ── DASHBOARD ─────────────────────────────────────────────────────────────

  {
    id: 'dash-security-admin',
    title: 'Security Admin Dashboard — Trust Posture & Risk Intelligence',
    category: 'Dashboard',
    subcategory: 'Security Admin',
    summary: 'Three-tab dashboard showing enterprise cryptographic risk posture, operations health, and crypto agility readiness. All items navigate to pre-filtered Inventory views.',
    tags: ['dashboard', 'ers', 'security admin', 'action queue', 'policy health', 'posture', 'operations', 'readiness', 'crypto agility'],
    sections: [
      {
        heading: 'Getting Started strip',
        body: 'A collapsible strip at the top of the dashboard (collapsed by default). Click the chevron bar to expand the 5-step onboarding guide: Connect, Discover, Policy, Inventory, Remediate. Each step has a direct navigation button. Dismiss individual steps with the X icon or click "Dismiss all" to hide the strip permanently for the session.',
      },
      {
        heading: 'Posture tab — ERS and driver bar',
        body: 'The ERS card shows the Enterprise Risk Score (0–100, higher is worse), 7-day delta, driver verdict sentence, and a "What\'s driving ERS" horizontal stacked bar.\n\nThe stacked bar: each colour segment represents one risk driver, proportional to its pts (points contribution) to ERS — not raw count. Below the bar, legend rows show: count of affected assets, driver label, and pts contribution (e.g. "187 certs · Certificates expiring in ≤7 days · +14 pts").\n\nClick any legend row or bar segment to go to the Inventory Identities tab pre-filtered to exactly the matching assets. The count on the dashboard matches the row count in Inventory.\n\nInfo icon (ⓘ) next to "Enterprise Risk Score": hover for the full formula definition including quantum weight and floor rule.',
      },
      {
        heading: 'Posture tab — Action queue',
        body: 'The action queue ranks the highest-priority issues across all asset types by urgency and impact. Each row shows:\n\n- Asset type badge (Cert, SSH, Secret, AI token)\n- Specific issue statement with count and condition\n- Impact context: which systems, which environment, what the consequence is\n- "Surfaced because" line: the explicit reason this item appears\n- Urgency bar: coral = act today (time-bound or actively exploitable), amber = act this week (structural, escalating)\n\nClick any row → Inventory pre-filtered to exact matching assets. Actions (Fix Now, Create Ticket, Assign) happen inside Inventory.',
      },
      {
        heading: 'Posture tab — Policy health',
        body: 'Four key controls with compliance % and 7-day trend:\n\nKey rotation: SSH keys and secrets rotated within policy.\nEncryption at rest: production assets with encryption enabled.\nCertificate validity: TLS certificates within validity policy.\nSecrets exposure: secrets not exposed in code repositories.\n\nEach row shows a proportional bar (red < 80%, amber 80–89%, teal 90%+), compliance %, and delta. Click any row → Inventory filtered to non-compliant assets for that policy.',
      },
      {
        heading: 'Operations tab',
        body: 'KPI strip: key operational metrics — total certs managed, expiring in 30/7 days, auto-renewal coverage, failed renewals in last 7 days.\n\nExpiry forecast: timeline showing certificate expiry distribution over the next 90 days, grouped by criticality.\n\nTriage queue: ranked list of operational issues requiring attention — expiring certs, failed renewals, orphaned objects. Each row links to Inventory.',
      },
      {
        heading: 'Readiness tab (Crypto Agility)',
        body: 'Crypto Readiness Summary: overall PQC migration status across the estate — how many objects are quantum-safe, in migration, or still vulnerable.\n\nAlgorithm Concentration: breakdown of algorithms in use across the estate, highlighting quantum-vulnerable concentrations.\n\nPQC Migration Panel: migration pipeline status by stage (Discover, Assess, Plan, Migrate, Monitor) with progress and projected completion date vs the NIST 2030 deadline.',
      },
      {
        heading: 'ERS floor rule',
        body: 'When "Floor rule active" appears, ERS is held at a minimum because a single Critical-impact production asset has a very high ARS (floor = maxProductionCriticalARS × 0.85). The only way to reduce ERS below the floor is to remediate the triggering asset.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 Section 2.3', 'NSA CNSA 2.0'],
    relatedIds: ['rs-ers', 'inv-overview', 'rs-crs', 'pol-overview', 'qp-overview'],
  },

  {
    id: 'dash-compliance',
    title: 'Compliance Officer Dashboard — Compliance Posture',
    category: 'Dashboard',
    subcategory: 'Compliance Officer',
    summary: 'Four-tab dashboard for compliance officers covering framework posture, audit readiness, violations management, and report generation across DORA, PCI-DSS v4.0, NIS2, HIPAA, FIPS 140-2, and FedRAMP.',
    tags: ['dashboard', 'compliance', 'dora', 'pci', 'nis2', 'hipaa', 'fips', 'fedramp', 'audit', 'violations', 'reports', 'compliance officer'],
    sections: [
      {
        heading: 'Overview tab',
        body: 'KPI strip: shows aggregate compliance metrics — overall compliance %, open critical violations, frameworks at risk, and next audit date.\n\nFramework posture bar chart: horizontal bar chart showing compliant / at-risk / violated split for each of the 6 frameworks. Click any bar to filter the Violations tab to that framework.\n\nBusiness unit heat map: grid of business units (Payments, Platform, Infrastructure, AI Engineering, Security Ops, Data & Analytics) × frameworks. Green/amber/red cells show compliance status per intersection. Click any cell to drill into violations for that BU + framework combination.\n\nViolation trend chart: 6-month area chart showing violation counts per framework. Use this to identify which frameworks are improving or worsening.\n\nControl domain coverage: bar chart showing compliance % across 8 control domains: Key Lifecycle, Cert Validity, Algorithm Strength, Access & AuthZ, Audit Logging, PQC Readiness, CA Trust & CRL, Rotation & Revocation.',
      },
      {
        heading: 'Audit Readiness tab',
        body: 'Shows upcoming audit dates for all 6 frameworks sorted by proximity. For each framework:\n\n- Days to next audit\n- Compliance % and open controls count\n- Pre-audit checklist with completion status\n- Direct link to generate the Auditor Evidence Bundle\n\nUse this tab in the weeks before an audit to track which checklist items are outstanding.',
      },
      {
        heading: 'Violations tab',
        body: 'Full violations table showing all active policy violations across the estate. Each row shows: violation ID, framework, business unit, asset, rule violated, severity, status, age in days, and owner.\n\nViolation statuses: Open, In Remediation, Pending Approval, Closed.\n\nExpand any row to see: full description, recommended remediation steps, and evidence items (scan reports, config exports, control mapping documents).\n\nFilters: framework, business unit, severity, status. All filter combinations work together.\n\nBulk actions: select multiple violations and bulk-assign or bulk-change status. Individual violations can be assigned to an owner, escalated, or linked to a TrustOps ticket.',
      },
      {
        heading: 'Reports tab',
        body: 'Four report types:\n\nExecutive Compliance Summary: board-ready 1-page posture across all frameworks. Includes risk score, open violations trend, and top 3 actions. Formats: PDF, PPTX.\n\nAuditor Evidence Bundle: full evidence package with asset exports, control mappings, scan logs, and remediation trail per framework. Formats: ZIP, PDF.\n\nCompliance Scorecard: per-framework detailed scorecard with control-by-control status. Formats: PDF, XLSX.\n\nViolation Aging & SLA Report: all open violations with age, owner, SLA breach risk, and remediation status. Filterable by BU or framework. Formats: CSV, XLSX, PDF.\n\nDelta / Change Report: what changed since last audit period — new violations, resolved issues, policy changes, and coverage improvements. Formats: PDF, DOCX.\n\nEach report shows when it was last generated. Click "Generate" to produce a fresh report with the current data snapshot.',
      },
    ],
    regulatoryRefs: ['EU DORA 2022/2554', 'PCI DSS v4.0', 'NIS2 Directive', 'HIPAA 45 CFR 164.312', 'NIST FIPS 140-2', 'FedRAMP Baseline Controls'],
    relatedIds: ['pol-compliance', 'pol-violations', 'viol-overview', 'gs-personas'],
  },

  {
    id: 'dash-pki',
    title: 'PKI / CLM Engineer Dashboard — Certificate Lifecycle Management',
    category: 'Dashboard',
    subcategory: 'PKI / CLM Engineer',
    summary: 'Four-tab dashboard for PKI and CLM engineers covering certificate overview, operations health, cryptographic risk analysis, and short-lived certificate governance.',
    tags: ['dashboard', 'pki', 'clm', 'certificates', 'expiry', 'renewal', 'algorithm', 'cipher suite', 'short-lived', 'ca', 'engineer'],
    sections: [
      {
        heading: 'Overview tab',
        body: 'CLM KPI strip: total certificates managed, expiring in 30/7 days, expired, auto-renewal coverage %, and certificates issued this month.\n\nCA distribution pie chart: shows certificate counts by issuing CA — DigiCert, Sectigo, Microsoft Enterprise CA, Let\'s Encrypt, Entrust, GlobalSign, and others. Click any CA slice to filter to certificates from that CA.\n\nExpiry calendar: monthly calendar view showing certificate expiry distribution. Days with expiring certs are highlighted — click any day to see the list of certs expiring that day.\n\nRenewal pipeline: shows certificates moving through the renewal workflow — Identified, In Progress, Renewed, Deployed.\n\nCLM action trend: line chart showing certificate renewals, revocations, and issuances over the past 30 days.',
      },
      {
        heading: 'Operations tab',
        body: 'Operations status bands: visual health bands showing certificate status distribution across environments (Production, Staging, Development).\n\nScan coverage: shows which infrastructure segments have been scanned and when, and which have gaps.\n\nFailed renewals: list of certificate renewal attempts that failed in the last 7 days, with error reason and recommended action.\n\nNon-standard certificates: certificates that do not conform to the standard certificate profile — wrong issuer, non-standard validity period, missing SANs, self-signed in production.\n\nCert action center: action queue for certificates requiring manual intervention — failed auto-renewals, certificates blocked by policy, approvals pending.',
      },
      {
        heading: 'Risk & Crypto tab',
        body: 'Algorithm strength: bar chart showing certificate counts by algorithm (RSA-1024, RSA-2048, RSA-4096, ECC P-256, ECC P-384, PQC-ready). Weak algorithms are highlighted in coral.\n\nSignature and hash strength: breakdown of signature algorithms and hash functions in use. SHA-1 and MD5 are flagged as deprecated.\n\nCipher suite table: list of TLS cipher suites detected across all scanned endpoints, showing count, protocol version, strength rating, and whether the suite is approved, deprecated, or prohibited.',
      },
      {
        heading: 'Short-Lived Certs tab',
        body: 'SLC governance dashboard: metrics specific to short-lived certificates (validity < 24 hours) used in service mesh, Kubernetes, and CI/CD environments.\n\nShows: total SLCs managed, issuance rate per day, average lifetime, and failure rate. Also shows SLC coverage — what percentage of workloads are using SLCs vs long-lived certificates.\n\nUse this tab to track progress toward the CA/Browser Forum\'s goal of reducing maximum certificate validity to 47 days by 2027.',
      },
      {
        heading: 'Certificate drill modal',
        body: 'Click any certificate row on any tab to open the certificate detail modal. Shows:\n\n- Asset Risk Score, Business Impact, and Remediation Priority Score\n- What\'s driving the score (critical/high severity credential counts, worst CRS)\n- Operational issues (expired, weak, violating policy) and quantum-vulnerable count\n- Top contributing credentials ranked by CRS with direct links to Inventory\n\nFrom the modal you can: renew, revoke, generate a CSR, push to a device, or create a ticket.',
      },
    ],
    regulatoryRefs: ['CA/Browser Forum BR v2.0', 'NIST SP 800-131A Rev 2', 'NIST IR 7966'],
    relatedIds: ['inv-crypto-objects', 'rem-overview', 'gs-personas'],
  },

  // ── DISCOVERY ─────────────────────────────────────────────────────────────

  {
    id: 'disc-overview',
    title: 'Discovery — finding cryptographic assets',
    category: 'Discovery',
    summary: 'Discovery scans your environment across 17 scan types in 6 categories to find all cryptographic objects. Uses Discovery Profiles for scheduled, repeatable scanning.',
    tags: ['discovery', 'scan', 'profile', 'schedule', 'network', 'agent', 'cloud', 'vault', 'source code', 'cbom'],
    sections: [
      {
        heading: 'Six scan categories',
        body: 'Active Scanning: network TLS scan (TCP/TLS handshake across IP ranges, discovers TLS certificates and cipher suites), SSH host scan (discovers SSH host keys and authorized_keys), port range scan (custom port TLS fingerprinting).\n\nCA & PKI Systems: CA connector scan (polls connected CAs for all issued certificates), OCSP/CRL monitoring (monitors revocation endpoints and detects revoked certs still in service).\n\nCloud & Container: cloud provider scan (AWS ACM, Azure Key Vault, GCP KMS), Kubernetes workload scan (service mesh certificates, cert-manager resources), container registry scan.\n\nEndpoint & Agent: endpoint agent (lightweight agent on hosts for SSH keys, local certs, process-bound credentials), eBPF scan (kernel-level certificate interception in containerised environments).\n\nSource Code & IaC: source code scan (secrets and certificate references hardcoded in GitHub, GitLab, Bitbucket), IaC scan (certificates and keys in Terraform, Helm, Kubernetes manifests).\n\nVault & HSM: vault secret scan (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault), HSM inventory (Thales, Entrust nShield), IAM scan (service accounts, AI agent tokens), CBOM generation (Cryptographic Bill of Materials).',
      },
      {
        heading: 'Discovery Profiles',
        body: 'A Discovery Profile is a saved, named scan configuration: which scan types to run, which targets (IP ranges, CIDRs, cloud accounts, vault paths), and a schedule (one-time, daily, weekly, on-trigger).\n\nCreate a profile for each major environment (production, staging, development) with appropriate scan types and schedules. Production profiles typically run daily; staging weekly.\n\nNavigate: Discovery → Profiles → Create Profile.',
      },
      {
        heading: 'Discovery Runs',
        body: 'Discovery Runs shows the history of all scan executions — status (Running, Complete, Failed), duration, objects found, and a breakdown by object type.\n\nClick any completed run to see the detailed results: new objects found, objects updated, and objects no longer detected (potential removals).\n\nNavigate: Discovery → Runs.',
      },
      {
        heading: 'Deduplication',
        body: 'Objects discovered via multiple vectors are deduplicated by fingerprint — SHA-256 of the certificate for TLS objects, key fingerprint for SSH keys. The canonical record shows all discovery vectors as metadata. No double-counting in inventory or risk scores.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-53 Rev 5 CM-8', 'CIS Controls v8 Control 1'],
    relatedIds: ['inv-overview', 'int-overview'],
  },

  // ── INVENTORY ─────────────────────────────────────────────────────────────

  {
    id: 'inv-overview',
    title: 'Inventory overview',
    category: 'Inventory',
    summary: 'The universal control plane. Every dashboard finding navigates here with filters pre-applied. All actions — Fix Now, Create Ticket, Assign — happen inside Inventory.',
    tags: ['inventory', 'overview', 'infrastructure', 'identities', 'groups', 'filter', 'action', 'control plane'],
    sections: [
      {
        heading: 'Three tabs',
        body: 'Infrastructure: every server, application, cluster, or service. Sorted by RPS (risk × business impact) by default. Shows ARS badge, business impact, RPS, owner team, violations count.\n\nIdentities: every individual cryptographic object (certificate, SSH key, secret, AI token). Sorted by CRS. Filters: Identity type, algorithm, status, environment, PQC risk, owner.\n\nGroups: logical collections of objects used for policy scoping and bulk operations.',
      },
      {
        heading: 'Navigating from the dashboard',
        body: 'Every item on any dashboard — action queue rows, ERS driver rows, policy health rows, compliance violations — navigates to a pre-filtered Inventory view.\n\nThe filter uses the same predicate that computed the dashboard count. The number you see on the dashboard equals the number of rows in Inventory. If they differ, check that no additional manual filters are applied and that the Identity type dropdown shows the expected value.',
      },
      {
        heading: 'Actions inside Inventory',
        body: 'From any row in the Identities tab:\n\nFix Now: triggers automated remediation workflow for that object type (requires the relevant module license).\nCreate Ticket: creates a TrustOps ticket pre-populated with the finding, object details, and recommended action — linked to Jira, ServiceNow, or PagerDuty if configured.\nAssign: delegates the finding to another team or individual.\nExpand row (chevron): see full object details — algorithm, key size, issuer, expiry, owner, policy violations, and dependent services.',
      },
      {
        heading: 'Add Resource',
        body: 'The "+ Add Resource" button in the top-right opens a modal to manually register an asset or object not discovered automatically. Use for systems behind firewalls, legacy systems, or new assets added between scan cycles.',
      },
    ],
    relatedIds: ['inv-it-assets', 'inv-crypto-objects', 'inv-groups', 'dash-security-admin'],
  },

  {
    id: 'inv-it-assets',
    title: 'Infrastructure tab — asset risk view',
    category: 'Inventory',
    subcategory: 'Infrastructure',
    summary: 'Shows all servers, applications, and services with ARS score, business impact, and RPS sort order. Click any asset for full detail including blast radius topology.',
    tags: ['infrastructure', 'assets', 'ars', 'rps', 'business impact', 'sort', 'blast radius'],
    sections: [
      {
        heading: 'ARS badge',
        body: 'Shows aggregated cryptographic risk 0–100. Badge colour: red (Critical 80+), amber (High 60–79), blue (Medium 30–59), teal (Low 0–29).\n\nClick the ARS badge to open the Asset Risk Drawer showing which objects are driving the score, their individual CRS scores, and primary risk reason for each.',
      },
      {
        heading: 'Business Impact and RPS',
        body: 'Business Impact (Critical/High/Moderate/Low): how important the asset is to business operations — independent of cryptographic posture. Override by clicking the badge; requires justification, logged in audit trail.\n\nRPS = ARS × business impact multiplier (Critical=1.5, High=1.25, Moderate=1.0, Low=0.75). Sort key only — never a standalone risk score.',
      },
      {
        heading: 'Asset detail panel',
        body: 'Click any asset row to open the three-column detail panel:\n\nLeft: asset summary, risk gauge, risk bars (crypto health, expiry exposure, policy coverage, blast radius), Infinity AI narrative.\n\nMiddle: all cryptographic objects on the asset with type, algorithm, expiry, policy status, violations. Expand any object row for details and actions.\n\nRight: Blast Radius topology showing which services and assets depend on cryptographic objects held by this asset.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 Tables G-2 and G-3', 'FIPS 199'],
    relatedIds: ['rs-ars', 'rs-rps', 'inv-crypto-objects'],
  },

  {
    id: 'inv-crypto-objects',
    title: 'Identities tab — cryptographic objects',
    category: 'Inventory',
    subcategory: 'Identities',
    summary: 'Shows every individual cryptographic object. Navigating from a dashboard link pre-filters this tab to the exact matching objects — same predicate, same count.',
    tags: ['identities', 'certificates', 'ssh keys', 'secrets', 'tokens', 'crs', 'algorithm', 'filter', 'pre-filtered'],
    sections: [
      {
        heading: 'Object types',
        body: 'TLS Certificate · SSH Key · SSH Certificate · Code-Signing Certificate · K8s Workload Certificate · Encryption Key · AI Agent Token · API Key / Secret',
      },
      {
        heading: 'Pre-applied filters from dashboard',
        body: 'When arriving from a dashboard link, filters are pre-applied — Identity type, Status, Algorithm, Owner, PQC Risk. The row count matches what the dashboard showed.\n\nDo not manually clear filters if you want to see the matching set. Use "Clear" to reset all filters and see the full estate.',
      },
      {
        heading: 'Status values',
        body: 'Healthy: valid, not expiring, has an owner, policy-compliant.\nExpiring: within the configured alert threshold.\nExpired: validity period passed — service disruption likely.\nOrphaned: no assigned owner.\nRevoked: revoked by issuing CA.',
      },
      {
        heading: 'Row expand',
        body: 'Click the chevron on any row to see full object detail: all metadata, applied policies and their status, active violations, and quick action buttons (Fix Now, Create Ticket, Assign Owner, View Blast Radius).',
      },
    ],
    regulatoryRefs: ['NIST SP 800-131A Rev 2', 'NIST IR 7966', 'CA/Browser Forum BR v2.0'],
    relatedIds: ['rs-crs', 'inv-it-assets', 'rem-overview'],
  },

  {
    id: 'inv-groups',
    title: 'Groups — logical collections',
    category: 'Inventory',
    subcategory: 'Groups',
    summary: 'Groups are named collections of cryptographic objects for policy scoping, bulk operations, and reporting.',
    tags: ['groups', 'policy', 'bulk', 'collections'],
    sections: [
      {
        heading: 'Purpose',
        body: 'Organise objects by business context, not technical type. Examples: "Payments Team Assets" (all certs and keys used by payments), "RSA-2048 Production Certs" (for PQC migration planning), "Expiring < 30 Days" (dynamic group).\n\nCustom policies must be assigned to at least one group before activation.',
      },
      {
        heading: 'Group risk score',
        body: 'Each group shows a Risk Score (0–100) representing the severity-weighted average CRS of objects within it. Critical objects carry more weight than a simple average would suggest.',
      },
    ],
    relatedIds: ['pol-custom', 'inv-crypto-objects'],
  },

  // ── POLICIES ──────────────────────────────────────────────────────────────

  {
    id: 'pol-overview',
    title: 'Policy Builder overview',
    category: 'Policies',
    summary: 'Four-tab interface: Out-of-Box Policies, Custom Policies, Violations, and Compliance Frameworks.',
    tags: ['policy', 'rules', 'violations', 'compliance', 'builder'],
    sections: [
      {
        heading: 'Four tabs',
        body: 'Out-of-Box Policies: pre-built, enabled by default, configurable but not deletable.\n\nCustom Policies: organisation-specific rules scoped to groups. AI Auto-fill from plain English description.\n\nViolations: all active policy violations — primary workspace for Compliance Officers. Security Admins use the dashboard action queue.\n\nCompliance Frameworks: policy-to-framework mapping with coverage scores for DORA, PCI-DSS v4.0, NIS2, HIPAA, FIPS 140-2, FedRAMP.',
      },
    ],
    relatedIds: ['pol-outofbox', 'pol-custom', 'pol-violations', 'pol-compliance'],
  },

  {
    id: 'pol-outofbox',
    title: 'Out-of-Box Policies',
    category: 'Policies',
    subcategory: 'Out-of-Box',
    summary: 'Pre-built policies aligned to NIST, CA/Browser Forum, PCI DSS, HIPAA, and EU DORA. Enabled by default.',
    tags: ['out of box', 'built-in', 'default', 'nist', 'pci', 'hipaa', 'dora', 'cis'],
    sections: [
      {
        heading: 'Included policies',
        body: 'Weak Algorithm Detection: RSA-1024, SHA-1, 3-key TDEA. Severity: Critical. Basis: NIST SP 800-131A Rev 2.\n\nCertificate Expiry Alert: Critical at 7 days, High at 14 days, Medium at 30 days. Basis: CA/Browser Forum BR v2.0.\n\nOrphaned SSH Key: no assigned owner. Severity: High. Basis: NIST IR 7966.\n\nPCI-DSS Cardholder Zone: violations on PCI-scope assets. Severity: Critical. Basis: PCI DSS v4.0 Req 4.2.1.\n\nAI Agent Over-Privilege: AI tokens with more permissions than demonstrated need. Severity: High. Basis: NIST SP 800-53 Rev 5 AC-6.\n\nDORA Compliance: expiry and algorithm violations on DORA-scope assets. Basis: EU DORA 2022/2554 Art. 9 & 11.',
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
    summary: 'Create organisation-specific rules scoped to groups. AI Auto-fill from a plain-English description.',
    tags: ['custom policy', 'create', 'rule', 'group', 'ai', 'auto-fill'],
    sections: [
      {
        heading: 'Creating a policy',
        body: 'Click "Create Policy". Describe in plain English and click "AI Auto-fill from Description" — AI parses the intent and pre-fills form fields. Review and adjust before saving.\n\nOr fill manually: name, asset type, condition, value, severity, environment scope, target groups, and actions on violation.\n\nPolicies must be assigned to at least one group before activation.',
      },
      {
        heading: 'Conditions available',
        body: 'Expiry less than [days] · Algorithm equals [value] · CA not in approved list · Key length less than [bits] · No rotation in [days] · Owner is unassigned · Environment is [Production/Staging/Development]',
      },
      {
        heading: 'Actions on violation',
        body: 'Alert only · Auto-remediate · Escalate to owner · Block issuance · Create TrustOps ticket (auto-linked to Jira/ServiceNow/PagerDuty if configured)',
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
    summary: 'All active policy violations. Primary workspace for Compliance Officers. Security Admins use the dashboard action queue instead.',
    tags: ['violations', 'open', 'acknowledged', 'remediated', 'bulk', 'compliance officer'],
    sections: [
      {
        heading: 'Violation status lifecycle',
        body: 'Open → In Remediation → Pending Approval → Closed.\n\nAcknowledged violations remain in compliance reporting as risk acceptances with justification. Closed violations record full audit evidence of who, when, and what action.',
      },
      {
        heading: 'Bulk actions',
        body: 'Select multiple violations and bulk-assign to an owner, bulk-change status, or bulk-create tickets. Each item gets its own workflow and audit entry — no single bulk action that bypasses individual tracking.',
      },
    ],
    relatedIds: ['pol-outofbox', 'pol-custom', 'rem-overview'],
  },

  {
    id: 'pol-compliance',
    title: 'Compliance Frameworks',
    category: 'Policies',
    subcategory: 'Compliance',
    summary: 'Maps policies to DORA, PCI-DSS v4.0, NIS2, HIPAA, FIPS 140-2, and FedRAMP. Shows coverage scores and generates audit reports.',
    tags: ['compliance', 'pci', 'hipaa', 'fips', 'dora', 'nis2', 'fedramp', 'framework', 'audit', 'report'],
    sections: [
      {
        heading: 'Supported frameworks',
        body: 'DORA (EU 2022/2554): ICT risk management for EU financial entities. Art. 9 (max cert lifetime), Art. 11 (approved CAs).\nPCI DSS v4.0: Req 4.2.1 (strong cryptography for cardholder data), Req 3.7.1 (key cryptoperiod), Req 12.3.2 (targeted risk analysis).\nNIS2 Directive: Art. 21 (non-human identity audit trails, approved cipher suites).\nHIPAA: §164.312 (ePHI encryption and key rotation).\nFIPS 140-2: approved algorithms and key storage for US federal and regulated systems.\nFedRAMP: AC-17 (FIPS-validated TLS for federal APIs).',
      },
      {
        heading: 'Audit reports',
        body: 'Available from the Compliance Officer dashboard Reports tab and from each framework card here. Reports include: assessment date, compliance score, compliant controls, open violations with remediation status, and risk acceptances. Suitable for auditor submission.',
      },
    ],
    regulatoryRefs: ['EU DORA 2022/2554', 'PCI DSS v4.0', 'NIS2 Directive', 'HIPAA 45 CFR 164.312', 'NIST FIPS 140-2', 'FedRAMP Baseline'],
    relatedIds: ['pol-outofbox', 'pol-violations', 'dash-compliance'],
  },

  // ── VIOLATIONS ────────────────────────────────────────────────────────────

  {
    id: 'viol-overview',
    title: 'Violations — operational versus quantum',
    category: 'Violations',
    summary: 'The Violations page splits findings into Operational Violations (fix now) and Quantum Risk (migration programme). Primary workspace for Compliance Officers.',
    tags: ['violations', 'operational', 'quantum', 'pqc', 'hndl', 'compliance officer'],
    sections: [
      {
        heading: 'Two tabs, two workflows',
        body: 'Operational Violations: exploitable today. Fix within 24 hours to 30 days depending on severity. Action buttons route directly to the relevant remediation workflow with the object pre-selected.\n\nQuantum Risk: algorithm broken by Shor\'s algorithm on a quantum computer. Multi-quarter migration programme. Action: Add to QTH migration queue.',
      },
      {
        heading: 'Operational tab columns',
        body: 'Severity · Credential name · Violation type · Rule · Owner team · Environment · Days to failure · Action button\n\nDays to failure: counts down to service disruption. Negative = already failed. "—" for algorithm violations (no hard deadline, ongoing risk).',
      },
      {
        heading: 'Quantum Risk tab columns',
        body: 'PQC severity · Credential name · Algorithm · Expiry year · Years past 2030 deadline · Production flag · Harvest risk (Active/Passive) · QTH status · Action button\n\nHarvest risk Active: internet-facing and protecting long-lived sensitive data — high-value HNDL target.',
      },
      {
        heading: 'For Security Admins',
        body: 'The Violations page is scoped primarily to the Compliance Officer persona. Security Admins have a dedicated action queue on the Trust Posture dashboard that surfaces the highest-priority findings in a decision-first format with direct Inventory navigation.',
      },
    ],
    regulatoryRefs: ['NIST IR 8547', 'NSA CNSA 2.0', 'NIST FIPS 203/204/205'],
    relatedIds: ['pol-violations', 'rem-overview', 'qp-overview'],
  },

  // ── REMEDIATION ───────────────────────────────────────────────────────────

  {
    id: 'rem-overview',
    title: 'Remediation — module-based workflows',
    category: 'Remediation',
    summary: 'Module-based workflows for fixing cryptographic violations. Navigate here via Fix Now from Inventory, or directly for bulk operations and provisioning.',
    tags: ['remediation', 'modules', 'renew', 'rotate', 'revoke', 'fix', 'clm', 'ssh', 'ai agents', 'secrets', 'provision'],
    sections: [
      {
        heading: 'How to reach Remediation',
        body: 'Recommended path: Dashboard action queue → Inventory (pre-filtered) → Fix Now.\n\nFix Now inside Inventory opens the remediation wizard for that specific object in the correct module. You do not need to navigate to Remediation directly.\n\nNavigate directly to Remediation for: bulk operations across many objects, provisioning new credentials, and monitoring in-flight workflows.',
      },
      {
        heading: 'Eight modules',
        body: 'All Objects: unified view across all modules.\n\nCertificates (CLM): TLS/SSL renewal, revocation, CSR generation, and deployment tracking. Licensed.\n\nSSH Keys & Certs: SSH key rotation, provisioning, certificate migration. Licensed.\n\nCode Signing: code-signing certificate management. Add-on license required.\n\nK8s / Service Mesh: Kubernetes workload certificate management. Licensed.\n\nEncryption Keys: rotation and HSM migration. Add-on license required.\n\nAI Agent Tokens: credential rotation and privilege right-sizing. Licensed.\n\nSecrets: secret rotation and vault migration. Add-on license required.\n\nUnlicensed modules show "Request License to Enable" — creates a ticket routed to IT Procurement.',
      },
      {
        heading: 'Issue filters',
        body: 'Within each module: All Issues · Expiring/Expired · PQC Migration · Orphaned · Policy Violations.\n\nCount next to each filter shows how many items match in that module.',
      },
      {
        heading: 'Remediation wizard',
        body: 'Step 1 — Review Impact: asset, algorithm, environment, owner, dependent services affected.\nStep 2 — Configure: target algorithm, replacement CA, new owner, or schedule (immediately or next maintenance window).\nStep 3 — Confirm: review execution summary. Outcome recorded in immutable audit trail.',
      },
      {
        heading: 'Provisioning new credentials',
        body: 'Each licensed module has a "Provision" button to create new credentials. The wizard collects required fields (Common Name and SANs for TLS; key type and target hosts for SSH) and submits to the appropriate backend (CA, KMS, vault).',
      },
      {
        heading: 'CLM Deployments view',
        body: 'Within the Certificates (CLM) module, the "Deployments" tab tracks certificate deployment workflows — which certs are being deployed to which systems, in which wave, and with what status. Distinct from the Issues view which shows what needs fixing.',
      },
    ],
    relatedIds: ['viol-overview', 'tick-overview', 'inv-crypto-objects'],
  },

  // ── TICKETS ───────────────────────────────────────────────────────────────

  {
    id: 'tick-overview',
    title: 'Tickets (TrustOps)',
    category: 'Tickets',
    summary: 'TrustOps tickets track remediation work items, license requests, provisioning, incidents, and change requests. Sync bidirectionally with Jira, ServiceNow, and PagerDuty.',
    tags: ['tickets', 'trustops', 'workflow', 'jira', 'servicenow', 'pagerduty', 'tracking', 'license', 'incident'],
    sections: [
      {
        heading: 'Five ticket types',
        body: 'Remediation: fixing a specific cryptographic violation.\nProvisioning: requesting a new certificate, SSH key, or credential.\nLicense Request: requesting an add-on module license (routed to IT Procurement).\nIncident: urgent security issue requiring immediate attention.\nChange Request: planned change requiring approval (e.g. PQC migration batch, key ceremony).',
      },
      {
        heading: 'Ticket creation',
        body: '1. Automatically: policy with "Create TrustOps ticket" action triggers.\n2. From Inventory: "Create Ticket" on any finding pre-populates object details, violation type, and recommended action.\n3. From Remediation module: "Create Ticket" on any remediation item.\n4. Manually: "New Ticket" on the Tickets page.',
      },
      {
        heading: 'SLA and priority',
        body: 'Critical: due in 24 hours. High: 7 days. Medium: 30 days. Low: no hard deadline.\n\nExternal IDs: tickets sync with Jira (issue key), ServiceNow (INC/CHG number), or PagerDuty (incident ID) when those integrations are connected. Status updates sync bidirectionally.',
      },
      {
        heading: 'Linked assets',
        body: 'Each ticket shows the count of linked cryptographic assets. Click the ticket to see all linked assets and navigate directly to any of them in Inventory.',
      },
    ],
    relatedIds: ['rem-overview', 'int-overview'],
  },

  // ── INTEGRATIONS ──────────────────────────────────────────────────────────

  {
    id: 'int-overview',
    title: 'Integrations — connecting your ecosystem',
    category: 'Integrations',
    summary: 'Connects the AVX Trust Platform to 9 categories of external systems: Certificate Authorities, Cloud Platforms, Secrets & Vaults, HSMs, ITSM & Ticketing, Notifications, DevOps & CI/CD, Load Balancers & ADC, and more.',
    tags: ['integrations', 'connectors', 'ca', 'cloud', 'vault', 'hsm', 'itsm', 'devops', 'load balancer', 'digicert', 'aws', 'azure', 'gcp', 'hashicorp', 'thales', 'jira', 'servicenow', 'pagerduty', 'jenkins', 'github'],
    sections: [
      {
        heading: 'Nine integration categories',
        body: 'Certificate Authorities: DigiCert (connected), Entrust (connected), Microsoft CA / ADCS (connected), Let\'s Encrypt, GlobalSign, Sectigo.\n\nCloud Platforms: Amazon Web Services (ACM, KMS, Secrets Manager — connected), Microsoft Azure (Key Vault, managed certs), Google Cloud Platform.\n\nSecrets & Vaults: HashiCorp Vault, CyberArk Conjur, AWS Secrets Manager.\n\nHSM: Thales Luna, Entrust nShield.\n\nITSM & Ticketing: Jira, ServiceNow, PagerDuty.\n\nNotifications: Slack, Microsoft Teams, email/SMTP.\n\nDevOps & CI/CD: Jenkins, GitHub Actions.\n\nLoad Balancers & ADC: F5 BIG-IP, Citrix ADC.\n\nCMDB & Asset Management: ServiceNow CMDB, custom API.',
      },
      {
        heading: 'Connecting an integration',
        body: 'Click "Connect" on any unconnected card. Enter the required credentials (API key, OAuth, service account, or LDAP depending on the system). The platform validates the connection and runs an initial discovery scan.\n\nConnected integrations show a green status badge, the connection date, and last sync time.',
      },
      {
        heading: 'Deployment Targets',
        body: 'The Deployment Targets view shows all managed devices and systems where certificates can be pushed during remediation workflows. Supported target types: web servers (Apache, Nginx, IIS), load balancers (F5, Citrix), API gateways, Kubernetes clusters, and cloud endpoints.\n\nFrom this view you can: view device details, initiate a certificate deployment, and monitor deployment status.\n\nNavigate: Integrations → Deployment Targets.',
      },
      {
        heading: 'Deploy to Device',
        body: 'During a certificate remediation or provisioning workflow, the "Push to Device" action opens the Deploy to Device modal. Select the target device from the connected inventory, confirm the certificate to deploy, and submit. The deployment is tracked in the CLM Deployments view.',
      },
    ],
    relatedIds: ['disc-overview', 'rem-overview', 'tick-overview'],
  },

  // ── QUANTUM POSTURE ───────────────────────────────────────────────────────

  {
    id: 'qp-overview',
    title: 'Quantum Posture and QTH (Quantum Transition Hub)',
    category: 'Quantum Posture',
    summary: 'Five-stage migration pipeline (Discover → Assess → Plan → Migrate → Monitor) for transitioning the estate to NIST FIPS 203/204/205 post-quantum algorithms.',
    tags: ['quantum', 'pqc', 'qth', 'migration', 'nist', 'cnsa', 'hndl', 'shor', 'cbom', 'fips 203', 'fips 204', 'fips 205'],
    sections: [
      {
        heading: 'Why quantum risk is active today',
        body: 'Nation-state adversaries are capturing encrypted network traffic today ("Harvest Now") and storing it for decryption when a Cryptographically Relevant Quantum Computer (CRQC) arrives ("Decrypt Later") — HNDL: Harvest-Now-Decrypt-Later.\n\nFor data confidential for 5+ years: HNDL risk is active today.\n\nAlgorithms broken by Shor\'s algorithm: RSA, ECC (P-256, P-384, ECDSA, ECDH), DSA, Diffie-Hellman. Every TLS handshake, SSH auth, and code-signing operation using these is a potential HNDL target.',
      },
      {
        heading: 'NIST standards and timeline',
        body: 'FIPS 203 (ML-KEM / CRYSTALS-Kyber): key encapsulation — replaces RSA/ECC for key exchange.\nFIPS 204 (ML-DSA / CRYSTALS-Dilithium): digital signatures — replaces RSA/ECDSA.\nFIPS 205 (SLH-DSA / SPHINCS+): alternative signature scheme.\n\nNSA CNSA 2.0 timeline: 2025 begin testing PQC · 2027 PQC required for new systems · 2030 PQC required for all systems · 2033 RSA and ECC fully retired.',
      },
      {
        heading: 'Five QTH pipeline stages',
        body: 'Stage 1 — Discover: identify all quantum-vulnerable objects in the estate. Generate CBOM (Cryptographic Bill of Materials).\n\nStage 2 — Assess: crypto agility assessment — can the algorithm be changed without service disruption? Map dependencies and interoperability requirements.\n\nStage 3 — Plan: select replacement algorithm (FIPS 203/204/205), assign migration wave, map dependencies, prepare test environment.\n\nStage 4 — Migrate: execute migration. May operate in hybrid mode (classical + PQC simultaneously) per ETSI TR 103 619.\n\nStage 5 — Monitor: object operating on PQC algorithm. Validated, tested, CBOM updated.',
      },
      {
        heading: 'Algorithm breakdown and heatmap',
        body: 'The Discover stage shows a bar chart of quantum-vulnerable algorithms in use: RSA-2048, RSA-4096, ECC P-256, ECC P-384, and PQC-Ready counts.\n\nA PQC Risk Heatmap shows business unit × asset type (TLS, SSH, Code-Sign, K8s, Keys) with red/amber/green cells indicating migration urgency.',
      },
      {
        heading: 'Migration prioritisation',
        body: 'Highest: objects protecting long-lived sensitive data (financial records 7+ years, PHI 10+ years) — highest HNDL exposure.\nHigh: CA certificates and code-signing certificates — migration of CA infrastructure is foundational.\nMedium: short-lived session credentials, API keys with 90-day rotation.\nLower: development and test credentials with no production data exposure.',
      },
    ],
    regulatoryRefs: ['NIST FIPS 203', 'NIST FIPS 204', 'NIST FIPS 205', 'NIST IR 8547', 'NSA CNSA 2.0', 'ETSI TR 103 619'],
    relatedIds: ['viol-overview', 'rs-crs', 'rem-overview'],
  },

  // ── RISK SCORING ──────────────────────────────────────────────────────────

  {
    id: 'rs-crs',
    title: 'CRS — Crypto Risk Score (object level)',
    category: 'Risk Scoring',
    summary: 'CRS is a 0–100 score for each cryptographic object from five weighted components: Algorithm Risk (31%), Lifecycle Risk (24%), Exposure Risk (19%), Access Risk (15%), Compliance Risk (11%).',
    tags: ['crs', 'crypto risk score', 'object', 'score', 'formula', 'algorithm', 'lifecycle'],
    sections: [
      {
        heading: 'Formula',
        body: 'CRS = min(100, round( (w1×CS + w2×LR + w3×EX + w4×AR + w5×CR) / sum(w) ))\n\nDefault weights: Algorithm Risk 31% · Lifecycle Risk 24% · Exposure Risk 19% · Access Risk 15% · Compliance Risk 11%.\n\nAll weights are customer-adjustable in Platform Core → Risk Weight Configuration. Basis: ISO/IEC 27005:2022 section 8.3.',
      },
      {
        heading: 'Algorithm Risk (31%)',
        body: 'Scores inherent weakness against NIST SP 800-131A Rev 2 Table 1.\n\nExample scores: RSA-1024 = 95 (disallowed) · SHA-1 = 95 (deprecated 2015) · RSA-2048 = 75 (legacy acceptable) · ECC P-256 = 50 (approved but quantum-vulnerable) · AES-256 = 5 (strong) · ML-KEM = 5 (PQC-safe).\n\nRSA/ECC/DSA scores riskClass = quantum. RSA-1024 scores riskClass = both (classically disallowed AND quantum-vulnerable).',
      },
      {
        heading: 'Lifecycle Risk (24%)',
        body: 'LR = min(100, max(AgeScore, ExpiryScore) + 0.30 × min(AgeScore, ExpiryScore))\n\nAgeScore = min(100, (actual_age_days / policy_max_age_days) × 100)\n\nDefault policy_max_age: SSH keys 90 days (NIST IR 7966) · TLS certificates 398 days (CA/Browser Forum BR v2.0) · Machine secrets 90 days · AI agent credentials 30 days.',
      },
      {
        heading: 'Exposure Risk (19%)',
        body: 'Internet-facing endpoint: +30–40 pts · Shared across hosts: +20–30 pts · Non-HSM storage: +10–20 pts · No network segmentation: +8–15 pts.\n\nBasis: CVSS v3.1 Attack Vector adapted for cryptographic objects. NIST SP 800-53 Rev 5 SC-12.',
      },
      {
        heading: 'Access Risk (15%)',
        body: 'Orphaned (no owner): +38–48 pts · Root access: +22–30 pts · Production tier: +20–25 pts · PII/PHI/financial data: +15–20 pts · Over-privileged AI agent: +20–28 pts.\n\nBasis: NIST SP 800-53 Rev 5 AC-2 and AC-6, NIST SP 800-30 Rev 1 Tables G-2 and G-3.',
      },
      {
        heading: 'Compliance Risk (11%)',
        body: 'Base score from regulatory scope × violation severity modifier. Does not re-score technical severity already captured by CS or LR.\n\nBasis: PCI DSS v4.0 section 12.3.2, HIPAA 45 CFR 164.308(a)(1), ISO/IEC 27005:2022 section 8.3.',
      },
      {
        heading: 'Severity thresholds',
        body: 'Critical: 80–100 · High: 60–79 · Medium: 30–59 · Low: 0–29',
      },
    ],
    regulatoryRefs: ['NIST SP 800-131A Rev 2', 'NIST SP 800-57 Pt 1 Rev 5', 'NIST IR 7966', 'CA/Browser Forum BR v2.0', 'NIST SP 800-53 Rev 5', 'ISO/IEC 27005:2022'],
    relatedIds: ['rs-ars', 'rs-ers', 'inv-crypto-objects'],
  },

  {
    id: 'rs-ars',
    title: 'ARS — Asset Risk Score (asset level)',
    category: 'Risk Scoring',
    summary: 'ARS aggregates CRS scores of all objects on an asset using a max-anchored formula that prevents a single critical object from being diluted by surrounding clean objects.',
    tags: ['ars', 'asset risk score', 'aggregation', 'max', 'percentile'],
    sections: [
      {
        heading: 'Formula',
        body: 'ARS = min(100, round( 0.55 × max(CRS) + 0.45 × (0.6 × P90 + 0.4 × P75) + log(1+critCount) × 4 + log(1+highCount) × 2 ))\n\nmax(CRS) anchors the score at 55% — one critical object cannot be averaged away by 499 clean objects.\n\nP90 and P75: distribution-aware. Multiple high-severity objects score higher than one.\n\nDistribution bonus: logarithmic — 5 Critical objects score more than 1, but 50 doesn\'t score proportionally more than 10 (correlated objects likely share a root cause).',
      },
      {
        heading: 'Why not average?',
        body: 'Simple averaging is the most common failure mode in hierarchical risk scoring. An asset with 500 SSH keys, one RSA-1024 with root access to a production database, would score ~12 when averaged. The ARS formula prevents this.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 section 3.4'],
    relatedIds: ['rs-crs', 'rs-ers', 'inv-it-assets'],
  },

  {
    id: 'rs-ers',
    title: 'ERS — Enterprise Risk Score (organisation level)',
    category: 'Risk Scoring',
    summary: 'ERS is the organisation-wide posture: a criticality-weighted average of all ARS scores with a floor rule, incorporating a time-weighted quantum component that grows as the NIST 2030 deadline approaches.',
    tags: ['ers', 'enterprise risk score', 'posture', 'floor', 'quantum weight', 'weighted average'],
    sections: [
      {
        heading: 'Formula',
        body: 'ERS = min(100, max( blend(weightedAvg, quantumComponent, qw), floor ))\n\nblend = weightedAvg × (1 - qw) + quantumComponent × qw\n\nweightedAvg: criticality-weighted average of ARS. Weights: Critical=4 · High=3 · Moderate=2 · Low=1. Regulated scope multiplier: 1.5× for PCI/HIPAA/FedRAMP assets.\n\nqw (quantum weight): 0.15 in 2024, increasing linearly to 0.35 by 2030.',
      },
      {
        heading: 'Floor rule',
        body: 'ERS = max(blend, maxProductionCriticalARS × 0.85)\n\nPrevents a sea of clean assets from burying one burning critical system. When active, the dashboard shows "Floor rule active — held by [asset name]". Only way to lower ERS below the floor: remediate the triggering asset.',
      },
      {
        heading: 'What\'s driving ERS on the dashboard',
        body: 'The horizontal bar on the Security Admin dashboard shows up to 4 risk drivers. Each driver\'s pts contribution is set by severity and urgency — not raw count. Expiring certs (time-bound, outage risk) contribute more pts than a larger count of chronic weak-algorithm assets.\n\nClick any driver → Inventory pre-filtered to matching assets. Count on dashboard = row count in Inventory.',
      },
      {
        heading: 'Why ERS worsens over time without PQC migration',
        body: 'qw increases linearly from 2024 to 2030. An organisation with perfect operational hygiene but no PQC migration progress will see ERS slowly worsen each year. This aligns ERS with NSA CNSA 2.0\'s 2030 deadline.',
      },
    ],
    regulatoryRefs: ['NIST SP 800-30 Rev 1 section 2.3', 'ISO/IEC 27005:2022 section 8.3', 'NSA CNSA 2.0', 'FIPS 199'],
    relatedIds: ['rs-ars', 'rs-crs', 'rs-rps', 'dash-security-admin'],
  },

  {
    id: 'rs-rps',
    title: 'RPS — Remediation Priority Score (sort key)',
    category: 'Risk Scoring',
    summary: 'RPS is a sort key used in the Infrastructure tab to surface the most important assets first. Combines ARS with business impact. Never displayed as a standalone risk score.',
    tags: ['rps', 'remediation priority', 'sort', 'priority', 'inventory'],
    sections: [
      {
        heading: 'Formula and purpose',
        body: 'RPS = ARS × BusinessImpactMultiplier (Critical=1.5 · High=1.25 · Moderate=1.0 · Low=0.75)\n\nSort key only in the Infrastructure tab. Never displayed as a risk number on any screen.\n\nAnswers: "which asset should I look at first?" while ARS answers "how bad is the cryptographic posture?" and Business Impact answers "how important is this asset?"',
      },
    ],
    relatedIds: ['rs-ars', 'inv-it-assets'],
  },

  // ── PLATFORM CORE ─────────────────────────────────────────────────────────

  {
    id: 'pc-overview',
    title: 'Platform Core — Settings and Administration',
    category: 'Platform Core',
    summary: 'User management, license management, audit log, risk weight configuration, and Infinity Intelligence AI assistant.',
    tags: ['settings', 'admin', 'audit', 'users', 'weights', 'configuration', 'licenses', 'rbac', 'infinity intelligence'],
    sections: [
      {
        heading: 'User Management & RBAC',
        body: 'Invite users, assign roles (Security Admin, Compliance Officer, PKI Engineer, Read Only), and manage RBAC permissions. Click any user row to view their profile, activity log, and assigned role.\n\nNavigate: Settings → User Management & RBAC.',
      },
      {
        heading: 'Licenses',
        body: 'Shows which modules are licensed and which require an add-on. Unlicensed modules (Code Signing, Encryption Keys, Secrets) show a "Request License" button that creates a TrustOps ticket routed to IT Procurement.\n\nNavigate: Settings → Licenses.',
      },
      {
        heading: 'Audit Log',
        body: 'Immutable, append-only log of all security-relevant actions: policy changes, business impact overrides, risk weight changes, violation acknowledgements, remediation actions, integration connections, and user login/privilege changes.\n\nExportable as timestamped JSON or CSV for auditor submission.\n\nBasis: PCI DSS v4.0 Requirement 10.2.1, ISO/IEC 27001:2022 Annex A 8.15.\n\nNavigate: Settings → Audit Log.',
      },
      {
        heading: 'Risk weight configuration',
        body: 'The CRS component weights are customer-adjustable. Changes affect CRS, ARS, and ERS across the entire estate. All configurations are named profiles (e.g. "PCI Audit Posture", "PQC Migration Focus") — switch between them for different assessment purposes.\n\nWeight changes are logged in the audit trail with actor identity, timestamp, and before/after values.\n\nBasis: ISO/IEC 27005:2022 section 8.3 requires risk evaluation criteria be set by the organisation, not the tool vendor.',
      },
      {
        heading: 'Infinity Intelligence',
        body: 'The AI assistant in the top-right (∞ icon) provides natural-language interaction with the full platform context. Examples: "which assets have the most expired certificates", "show me all RSA-1024 keys in production", "what is the fastest way to reduce ERS by 10 points".\n\nInfinity Intelligence has read access to the full platform context including the currently selected entity (asset or crypto object being viewed). It does not execute remediation actions — it surfaces information and links to the appropriate workflows.',
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
