import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, Clock, Download, Upload, FileText,
  LayoutDashboard, RefreshCw, Search, ShieldAlert,
  Ticket, X, ChevronRight, CalendarDays, TrendingDown, Package,
  BookOpen, Zap, Send, BarChart2, Circle, ClipboardCheck,
  Atom,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';
import { useNotifications } from '@/context/NotificationContext';
import { KPICard, SeverityBadge, Modal, Drawer, AIInsightCard } from '@/components/shared/UIComponents';

// ─── DATA ────────────────────────────────────────────────────────────────────

const FRAMEWORKS = ['DORA', 'PCI-DSS v4.0', 'NIS2', 'HIPAA', 'FIPS 140-2', 'FedRAMP'];

const FRAMEWORK_POSTURE = [
  { framework: 'DORA',        compliant: 71, atRisk: 18, violated: 11, controls: 47, openControls: 5,  nextAudit: '2026-06-30', daysToAudit: 69 },
  { framework: 'PCI-DSS v4.0', compliant: 85, atRisk: 10, violated: 5,  controls: 64, openControls: 3,  nextAudit: '2026-09-15', daysToAudit: 146 },
  { framework: 'NIS2',         compliant: 74, atRisk: 16, violated: 10, controls: 39, openControls: 4,  nextAudit: '2026-10-17', daysToAudit: 178 },
  { framework: 'HIPAA',        compliant: 92, atRisk: 6,  violated: 2,  controls: 28, openControls: 1,  nextAudit: '2026-12-31', daysToAudit: 253 },
  { framework: 'FIPS 140-2',   compliant: 68, atRisk: 19, violated: 13, controls: 33, openControls: 8,  nextAudit: '2026-07-01', daysToAudit: 70 },
  { framework: 'FedRAMP',      compliant: 79, atRisk: 14, violated: 7,  controls: 52, openControls: 4,  nextAudit: '2027-01-15', daysToAudit: 268 },
];

const BU_COMPLIANCE: Record<string, Record<string, 'green'|'amber'|'red'>> = {
  'Payments':        { 'DORA': 'red',   'PCI-DSS v4.0': 'red',   'NIS2': 'amber', 'HIPAA': 'green', 'FIPS 140-2': 'amber', 'FedRAMP': 'amber' },
  'Platform':        { 'DORA': 'green', 'PCI-DSS v4.0': 'green', 'NIS2': 'green', 'HIPAA': 'green', 'FIPS 140-2': 'amber', 'FedRAMP': 'green' },
  'Infrastructure':  { 'DORA': 'amber', 'PCI-DSS v4.0': 'green', 'NIS2': 'amber', 'HIPAA': 'green', 'FIPS 140-2': 'red',   'FedRAMP': 'amber' },
  'AI Engineering':  { 'DORA': 'amber', 'PCI-DSS v4.0': 'amber', 'NIS2': 'red',   'HIPAA': 'amber', 'FIPS 140-2': 'green', 'FedRAMP': 'red'   },
  'Security Ops':    { 'DORA': 'green', 'PCI-DSS v4.0': 'green', 'NIS2': 'green', 'HIPAA': 'green', 'FIPS 140-2': 'green', 'FedRAMP': 'green' },
  'Data & Analytics':{ 'DORA': 'amber', 'PCI-DSS v4.0': 'amber', 'NIS2': 'amber', 'HIPAA': 'red',   'FIPS 140-2': 'amber', 'FedRAMP': 'amber' },
};

const VIOLATION_TREND = [
  { month: 'Nov', DORA: 310, PCI: 180, NIS2: 220, HIPAA: 85, FIPS: 340 },
  { month: 'Dec', DORA: 290, PCI: 170, NIS2: 250, HIPAA: 78, FIPS: 355 },
  { month: 'Jan', DORA: 340, PCI: 185, NIS2: 290, HIPAA: 90, FIPS: 380 },
  { month: 'Feb', DORA: 380, PCI: 175, NIS2: 310, HIPAA: 82, FIPS: 410 },
  { month: 'Mar', DORA: 420, PCI: 165, NIS2: 350, HIPAA: 76, FIPS: 390 },
  { month: 'Apr', DORA: 395, PCI: 158, NIS2: 325, HIPAA: 71, FIPS: 372 },
];

const CONTROL_DOMAINS = [
  { domain: 'Key Lifecycle',      total: 24, compliant: 20, pct: 83 },
  { domain: 'Cert Validity',      total: 18, compliant: 12, pct: 67 },
  { domain: 'Algorithm Strength', total: 31, compliant: 18, pct: 58 },
  { domain: 'Access & AuthZ',     total: 22, compliant: 20, pct: 91 },
  { domain: 'Audit Logging',      total: 16, compliant: 15, pct: 94 },
  { domain: 'PQC Readiness',      total: 12, compliant: 1,  pct: 8  },
  { domain: 'CA Trust & CRL',     total: 19, compliant: 17, pct: 89 },
  { domain: 'Rotation & Revoc.',  total: 27, compliant: 22, pct: 81 },
];

type VStatus = 'Open' | 'In Remediation' | 'Pending Approval' | 'Closed';
interface Violation {
  id: string; framework: string; bu: string; asset: string; rule: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: VStatus; agedays: number; owner: string; control: string;
  description: string; remediation: string; evidenceItems: string[];
}

const VIOLATIONS: Violation[] = [
  { id: 'V-001', framework: 'PCI-DSS v4.0', bu: 'Payments',       asset: '*.payments.acmecorp.com',  rule: 'Req 4.2.1 — No wildcards in CHD scope',          severity: 'Critical', status: 'Open',             agedays: 14, owner: 'Priya K.',    control: 'TLS-04', description: 'Wildcard TLS certificate covers the cardholder data environment. PCI-DSS v4.0 Req 4.2.1 prohibits wildcards where CHD is in scope.', remediation: 'Replace wildcard with SAN certificate scoped to specific FQDN. Requires CA re-issuance and service restart on payments-api, billing-gw.', evidenceItems: ['Certificate scan report (Apr 2026)', 'Asset dependency map', 'CHD zone definition doc'] },
  { id: 'V-002', framework: 'DORA',          bu: 'Payments',       asset: 'prod-payments-cert',        rule: 'Art. 9 — Max 90-day cert lifetime',              severity: 'Critical', status: 'In Remediation',   agedays: 22, owner: 'Arjun S.',    control: 'TLS-01', description: 'Certificate issued with 365-day validity. DORA RTS Art. 9 mandates maximum 90-day TLS certificate lifetimes for critical financial services.', remediation: 'Renew via ACME auto-rotation. Policy enforcement rule added to prevent re-occurrence. ETA: 48h.', evidenceItems: ['DORA RTS Article 9 mapping', 'Renewal workflow log', 'Approval ticket #T-2841'] },
  { id: 'V-003', framework: 'DORA',          bu: 'Infrastructure', asset: 'api-gateway-cert',          rule: 'Art. 11 — Unapproved CA',                       severity: 'High',     status: 'Open',             agedays: 7,  owner: 'Unassigned',  control: 'CA-02', description: 'Certificate issued by non-approved CA (Let\'s Encrypt staging). DORA Art. 11 requires use of approved CAs on the enterprise trust list.', remediation: 'Revoke and re-issue via DigiCert or Microsoft Enterprise CA. Update CA trust policy.', evidenceItems: ['Approved CA list v3.1', 'Certificate issuance log'] },
  { id: 'V-004', framework: 'FIPS 140-2',    bu: 'Infrastructure', asset: 'vault-internal',            rule: 'FIPS 140-2 L2 — Non-compliant algorithm',       severity: 'Critical', status: 'Open',             agedays: 31, owner: 'Dev P.',      control: 'ALG-03', description: 'Vault internal encryption uses AES-128-CBC. FIPS 140-2 Level 2 requires AES-256 in approved modes (GCM/CCM) for data at rest.', remediation: 'Migrate Vault encryption config to AES-256-GCM. Requires key rotation and brief maintenance window.', evidenceItems: ['Vault configuration export', 'FIPS 140-2 algorithm table', 'Maintenance runbook'] },
  { id: 'V-005', framework: 'HIPAA',          bu: 'Data & Analytics', asset: 'patient-data-key',       rule: '§164.312(a)(2)(iv) — PHI key rotation overdue',  severity: 'High',     status: 'Pending Approval', agedays: 45, owner: 'Anjali M.',   control: 'KEY-07', description: 'PHI encryption key has not been rotated in 18 months. HIPAA Security Rule requires periodic rotation.', remediation: 'Rotate key via KMS workflow. Re-encrypt all PHI datasets. Requires CISO approval due to data scope.', evidenceItems: ['Key age report', 'PHI scope inventory', 'HIPAA mapping doc §164.312'] },
  { id: 'V-006', framework: 'DORA',          bu: 'AI Engineering', asset: 'k8s-ingress-cert',          rule: 'Art. 9 — Max 90-day cert lifetime',              severity: 'High',     status: 'Open',             agedays: 9,  owner: 'Ravi T.',     control: 'TLS-01', description: '112-day certificate on K8s ingress controller covering AI platform endpoints. Same DORA 90-day rule applies.', remediation: 'cert-manager annotation patch + force-renew. Automated via CI pipeline.', evidenceItems: ['K8s ingress scan', 'cert-manager policy config'] },
  { id: 'V-007', framework: 'NIS2',           bu: 'AI Engineering', asset: 'gpt-agent-tokens (179K)',  rule: 'Art. 21 — AI agent identity audit trail gap',   severity: 'Critical', status: 'Open',             agedays: 18, owner: 'Unassigned',  control: 'IAM-11', description: '38% of AI agent tokens (179,360 of 472,000) have no audit trail for actions taken. NIS2 Art. 21 mandates comprehensive logging for non-human identities.', remediation: 'Enable Eos Identity Control Plane audit logging. Retroactive replay logs unavailable — mitigate with prospective enforcement.', evidenceItems: ['AI agent inventory (Eos)', 'NIS2 Art. 21 mapping', 'Eos audit log sample'] },
  { id: 'V-008', framework: 'PCI-DSS v4.0', bu: 'Payments',       asset: 'payment-signing-key',       rule: 'Req 3.7.1 — Expired cryptoperiod',              severity: 'High',     status: 'In Remediation',   agedays: 6,  owner: 'Priya K.',    control: 'KEY-02', description: 'Payment transaction signing key cryptoperiod exceeded (>12 months active use). PCI-DSS Req 3.7.1 mandates key retirement on schedule.', remediation: 'Key ceremony scheduled for Apr 28. New key generated in HSM. HSM firmware update required first.', evidenceItems: ['HSM key ceremony record template', 'Key usage log', 'HSM firmware version report'] },
  { id: 'V-009', framework: 'FIPS 140-2',    bu: 'Infrastructure', asset: 'ssh-prod-keys-rsa1024 (847)', rule: 'FIPS 140-2 — Deprecated RSA-1024 key length', severity: 'Critical', status: 'Open',             agedays: 60, owner: 'Dev P.',      control: 'ALG-01', description: '847 SSH keys using RSA-1024 across prod infrastructure. FIPS 140-2 disallows key lengths below RSA-2048.', remediation: 'Bulk rotate to RSA-4096 or ECDSA-384. AVX SSH Lifecycle workflow can automate provisioning.', evidenceItems: ['SSH key inventory by algorithm', 'FIPS approved algorithm list', 'Rotation runbook'] },
  { id: 'V-010', framework: 'NIS2',           bu: 'Infrastructure', asset: 'corp-vpn-tls',              rule: 'Art. 21 — Deprecated cipher suite (RC4)',      severity: 'Medium',   status: 'Open',             agedays: 12, owner: 'Unassigned',  control: 'TLS-09', description: 'VPN TLS endpoint negotiates TLS_RSA_WITH_RC4_128_SHA. NIS2 Art. 21 mandates approved cipher suites; RC4 is deprecated.', remediation: 'Disable RC4 cipher in VPN config. Enforce TLS 1.3 minimum.', evidenceItems: ['TLS handshake scan', 'Approved cipher suite policy v2'] },
  { id: 'V-011', framework: 'FedRAMP',       bu: 'Platform',        asset: 'fed-api-cert',             rule: 'AC-17 — Non-FIPS TLS for federal APIs',         severity: 'High',     status: 'Open',             agedays: 3,  owner: 'Arjun S.',    control: 'FED-03', description: 'Federal API endpoint is not using FIPS-validated TLS implementation. FedRAMP AC-17 requires FIPS 140-2 validated modules.', remediation: 'Configure FIPS mode on API gateway. Use FIPS-validated OpenSSL build.', evidenceItems: ['FedRAMP control baseline AC-17', 'API TLS config export'] },
  { id: 'V-012', framework: 'HIPAA',          bu: 'Data & Analytics', asset: 'analytics-db-replication', rule: '§164.312(e)(1) — PHI in transit unencrypted', severity: 'Critical', status: 'Open',             agedays: 2,  owner: 'Anjali M.',   control: 'TLS-08', description: 'Analytics DB internal replication traffic traverses network without TLS. PHI dataset included in replication scope.', remediation: 'Enable TLS 1.3 on DB replication channel. Issue internal cert from Microsoft Enterprise CA.', evidenceItems: ['Network traffic scan', 'DB config export', 'PHI data flow diagram'] },
];

const AUDIT_CHECKLIST: Record<string, { section: string; items: { label: string; done: boolean }[] }[]> = {
  'DORA': [
    { section: 'ICT Risk Management (Art. 6-7)', items: [
      { label: 'ICT risk register updated', done: true },
      { label: 'Max 90-day cert policy deployed', done: false },
      { label: 'Unapproved CA inventory cleared', done: false },
      { label: 'Incident response plan tested (TLPT)', done: true },
      { label: 'Third-party ICT risk register complete', done: true },
    ]},
    { section: 'Digital Operational Resilience (Art. 9-11)', items: [
      { label: 'Encryption strength audit complete', done: true },
      { label: 'Key management procedures documented', done: true },
      { label: 'Network segmentation controls verified', done: false },
      { label: 'Crypto inventory current (<30d old)', done: false },
    ]},
    { section: 'Reporting & Evidence (Art. 19)', items: [
      { label: 'Incident log export prepared', done: true },
      { label: 'Evidence package generated', done: true },
      { label: 'Regulatory submission template filled', done: false },
    ]},
  ],
  'FIPS 140-2': [
    { section: 'Algorithm Compliance', items: [
      { label: 'AES-256 verified for all data-at-rest', done: false },
      { label: 'RSA-1024 keys retired', done: false },
      { label: 'SHA-1 certificates removed', done: true },
      { label: 'EC P-256 minimum enforced', done: true },
    ]},
    { section: 'HSM & Key Storage', items: [
      { label: 'HSM firmware version confirmed FIPS-validated', done: true },
      { label: 'Key ceremony logs archived', done: true },
      { label: 'Split knowledge / dual control procedures verified', done: false },
    ]},
    { section: 'Evidence Package', items: [
      { label: 'FIPS validation certificates attached', done: true },
      { label: 'Algorithm usage report exported', done: false },
      { label: 'Non-compliant exception list submitted', done: false },
    ]},
  ],
};

const EVIDENCE_PACKAGES = [
  { framework: 'DORA',       status: 'Ready',      size: '2.3 MB', items: 14, lastGen: '2026-04-18', auditor: 'DNB (Netherlands)' },
  { framework: 'PCI-DSS',    status: 'Ready',      size: '4.1 MB', items: 22, lastGen: '2026-04-20', auditor: 'QSA – Trustwave' },
  { framework: 'HIPAA',      status: 'Ready',      size: '1.8 MB', items: 11, lastGen: '2026-04-15', auditor: 'Internal Audit' },
  { framework: 'NIS2',       status: 'Generating', size: '—',      items: 0,  lastGen: '2026-03-30', auditor: 'BSI Germany' },
  { framework: 'FIPS 140-2', status: 'Incomplete', size: '0.9 MB', items: 6,  lastGen: '2026-04-10', auditor: 'NVLAP Lab' },
  { framework: 'FedRAMP',    status: 'Ready',      size: '5.7 MB', items: 31, lastGen: '2026-04-21', auditor: '3PAO – Coalfire' },
];

const REG_CHANGES = [
  { event: 'CA/Browser Forum SC-081v3 — 200-day max cert lifetime', date: '2026-03-15', impact: 'High',     status: 'Active',    action: 'Enforce 90-day policy now; 200-day limit already live' },
  { event: 'DORA RTS Article 9 enforcement deadline',               date: '2026-06-30', impact: 'Critical', status: 'Upcoming',  action: '5 violations open; 69 days remaining' },
  { event: 'FIPS 140-3 supersedes FIPS 140-2 for new procurements', date: '2026-09-22', impact: 'Medium',   status: 'Upcoming',  action: 'Evaluate HSM vendor roadmap by Q3 2026' },
  { event: 'NIS2 full operational compliance (national laws)',       date: '2026-10-17', impact: 'High',     status: 'Upcoming',  action: '10 open NIS2 violations; Art. 21 logging gaps critical' },
  { event: 'CA/Browser Forum SC-081v3 — 100-day max cert lifetime', date: '2027-03-15', impact: 'Critical', status: 'Future',    action: 'Auto-rotation must be deployed before this date' },
  { event: 'NIST PQC FIPS 203/204/205 mandatory adoption',          date: '2027-12-31', impact: 'Critical', status: 'Future',    action: '94% assets non-PQC-ready — begin migration planning now' },
];

const REPORT_TEMPLATES = [
  { id: 'exec',     icon: BarChart2,     title: 'Executive Compliance Summary',  desc: 'Board-ready 1-page posture across all frameworks. Includes risk score, open violations trend, and top 3 actions.',                             formats: ['PDF', 'PPTX'], lastRun: '2026-04-15' },
  { id: 'auditor',  icon: ClipboardCheck,title: 'Auditor Evidence Bundle',       desc: 'Full evidence package with asset exports, control mappings, scan logs, and remediation trail per framework.',                                    formats: ['ZIP', 'PDF'],  lastRun: '2026-04-20' },
  { id: 'regulator',icon: Send,          title: 'Regulator Submission Report',   desc: 'Formatted for DORA ESA submission or NIS2 national authority. Includes incident log and control self-assessment.',                               formats: ['PDF', 'DOCX'], lastRun: '2026-03-31' },
  { id: 'violation',icon: ShieldAlert,   title: 'Violation Aging & SLA Report',  desc: 'All open violations with age, owner, SLA breach risk, and remediation status. Filtered by BU or framework.',                                   formats: ['CSV', 'XLSX', 'PDF'], lastRun: '2026-04-21' },
  { id: 'crypto',   icon: Atom,          title: 'Cryptographic Inventory Report',desc: 'Full asset inventory by algorithm, key length, CA, and expiry. Includes PQC readiness and FIPS compliance columns.',                             formats: ['CSV', 'XLSX'], lastRun: '2026-04-19' },
  { id: 'delta',    icon: TrendingDown,  title: 'Delta / Change Report',         desc: 'What changed since last audit period: new violations, resolved issues, policy changes, and coverage improvements.',                              formats: ['PDF', 'DOCX'], lastRun: '2026-03-31' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const heatBg: Record<string, string> = {
  green: 'bg-teal/15 text-teal border-teal/20',
  amber: 'bg-amber/15 text-amber border-amber/20',
  red:   'bg-coral/15 text-coral border-coral/20',
};
const heatDot: Record<string, string> = { green: 'bg-teal', amber: 'bg-amber', red: 'bg-coral' };
const statusBg: Record<VStatus, string> = {
  'Open': 'bg-coral/10 text-coral',
  'In Remediation': 'bg-amber/10 text-amber',
  'Pending Approval': 'bg-purple/10 text-purple',
  'Closed': 'bg-teal/10 text-teal',
};
const impactColor: Record<string, string> = {
  Critical: 'text-coral', High: 'text-amber', Medium: 'text-purple', Low: 'text-teal',
};

type Tab = 'overview' | 'audit' | 'violations' | 'reports';
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',        icon: LayoutDashboard },
  { id: 'audit',      label: 'Audit Readiness', icon: CalendarDays },
  { id: 'violations', label: 'Violations',      icon: ShieldAlert },
  { id: 'reports',    label: 'Reports',         icon: FileText },
];

// ─── SMALL HELPERS ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: VStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBg[status]}`}>{status}</span>;
}

function ProgressBar({ pct, color = 'bg-teal' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CompletionRing({ pct, size = 40 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#2a9d6b' : pct >= 60 ? '#d97706' : '#e05a3a';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(220 13% 91%)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`, fontSize: 9, fontWeight: 700, fill: 'currentColor' }}>
        {pct}%
      </text>
    </svg>
  );
}

// ─── VIOLATION DRAWER ────────────────────────────────────────────────────────

function ViolationDrawer({ v, onClose, onEscalate, onTicket }: {
  v: Violation | null;
  onClose: () => void;
  onEscalate: (v: Violation) => void;
  onTicket: (v: Violation) => void;
}) {
  const [assigned, setAssigned] = React.useState(v?.owner || 'Unassigned');
  React.useEffect(() => { if (v) setAssigned(v.owner); }, [v]);
  if (!v) return null;
  return (
    <Drawer open={!!v} onClose={onClose} title={`Violation ${v.id} — ${v.framework}`}>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={v.severity} />
            <StatusPill status={v.status} />
            <span className="text-[10px] text-muted-foreground">{v.agedays}d old</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{v.rule}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{v.asset} · {v.bu}</p>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">What's wrong</p>
          <p className="text-xs text-foreground leading-relaxed">{v.description}</p>
        </div>

        <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
          <p className="text-[11px] font-medium text-teal mb-1">Recommended remediation</p>
          <p className="text-xs text-foreground leading-relaxed">{v.remediation}</p>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Control Reference</p>
          <span className="text-xs bg-purple/10 text-purple px-2 py-0.5 rounded font-mono">{v.control}</span>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Evidence Items</p>
          <div className="space-y-1.5">
            {v.evidenceItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">{item}</span>
                </div>
                <button onClick={() => toast.success(`Downloading: ${item}`)} className="text-[10px] text-teal hover:underline">Get</button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Assign Owner</p>
          <div className="flex gap-2">
            <select value={assigned} onChange={e => setAssigned(e.target.value)}
              className="flex-1 text-xs border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-teal">
              {['Unassigned', 'Priya K.', 'Arjun S.', 'Dev P.', 'Anjali M.', 'Ravi T.'].map(o => <option key={o}>{o}</option>)}
            </select>
            <button onClick={() => toast.success(`Owner updated to ${assigned}`)}
              className="text-xs px-3 py-1.5 bg-teal/10 text-teal rounded hover:bg-teal/20 font-medium">Save</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={() => { toast.success('Evidence package generated'); onClose(); }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-teal/30 bg-teal/5 text-teal text-xs font-medium hover:bg-teal/10">
            <Download className="w-3.5 h-3.5" /> Generate Evidence
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onTicket(v), 80); }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-amber/30 bg-amber/5 text-amber text-xs font-medium hover:bg-amber/10">
            <Ticket className="w-3.5 h-3.5" /> Create Ticket
          </button>
          <button onClick={() => { toast.success('Status updated to In Remediation'); onClose(); }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-muted/30 text-foreground text-xs font-medium hover:bg-muted/50">
            <RefreshCw className="w-3.5 h-3.5" /> Mark In Remediation
          </button>
          <button onClick={() => { onClose(); setTimeout(() => onEscalate(v), 80); }}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-coral/30 bg-coral/5 text-coral text-xs font-medium hover:bg-coral/10">
            <AlertTriangle className="w-3.5 h-3.5" /> Escalate to Sec Admin
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── ESCALATE TO SEC ADMIN MODAL ─────────────────────────────────────────────

function EscalateModal({ v, onClose, onConfirm }: {
  v: Violation | null;
  onClose: () => void;
  onConfirm: (v: Violation, comments: string) => void;
}) {
  const [comments, setComments] = React.useState('');
  if (!v) return null;
  return (
    <Modal open={!!v} onClose={onClose} title="Escalate to Security Admin">
      <div className="space-y-4">
        <div className="bg-coral/5 border border-coral/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={v.severity} />
            <span className="text-xs font-semibold">{v.asset}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{v.rule}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{v.framework} · {v.bu}</p>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-2">
            Comments for Security Admin
          </label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Explain why this needs Security Admin attention — context, deadline, business impact..."
            rows={4}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-teal resize-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          The Security Admin will receive a notification with this violation detail and your comments on their dashboard.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 border border-border text-xs rounded-lg hover:bg-muted/30 text-muted-foreground">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(v, comments); onClose(); }}
            disabled={!comments.trim()}
            className="flex-1 py-2 bg-coral/10 text-coral text-xs font-semibold rounded-lg hover:bg-coral/20 border border-coral/30 disabled:opacity-40 disabled:cursor-not-allowed">
            Send Escalation
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CREATE TICKET MODAL ─────────────────────────────────────────────────────

function CreateTicketModal({ v, onClose, onConfirm }: {
  v: Violation | null;
  onClose: () => void;
  onConfirm: (v: Violation, ticketData: { title: string; priority: string; assignee: string; description: string }) => void;
}) {
  const [form, setForm] = React.useState({
    title: v ? `[${v.framework}] ${v.rule} — ${v.asset}` : '',
    priority: v?.severity || 'High',
    assignee: v?.owner || 'Unassigned',
    description: v ? `Violation ${v.id}\n\n${v.description}\n\nRecommended action: ${v.remediation}` : '',
  });
  React.useEffect(() => {
    if (v) setForm({
      title: `[${v.framework}] ${v.rule} — ${v.asset}`,
      priority: v.severity,
      assignee: v.owner,
      description: `Violation ${v.id}\n\n${v.description}\n\nRecommended action: ${v.remediation}`,
    });
  }, [v?.id]);

  if (!v) return null;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={!!v} onClose={onClose} title="Create Remediation Ticket" wide>
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Title</label>
          <input value={form.title} onChange={set('title')}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Priority</label>
            <select value={form.priority} onChange={set('priority')}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-teal">
              {['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Assignee</label>
            <select value={form.assignee} onChange={set('assignee')}
              className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-teal">
              {['Unassigned','Priya K.','Arjun S.','Dev P.','Anjali M.','Ravi T.'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">Description</label>
          <textarea value={form.description} onChange={set('description')} rows={5}
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-teal resize-none font-mono" />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span>Linked to:</span>
          <span className="font-mono text-purple">{v.id}</span>
          <span>·</span><span>{v.framework}</span>
          <span>·</span><span>{v.bu}</span>
          <span>·</span><span className="font-mono text-teal">{v.control}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 border border-border text-xs rounded-lg hover:bg-muted/30 text-muted-foreground">
            Cancel
          </button>
          <button onClick={() => { onConfirm(v, form); onClose(); }}
            className="flex-1 py-2 bg-teal/10 text-teal text-xs font-semibold rounded-lg hover:bg-teal/20 border border-teal/30">
            Create Ticket
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── FRAMEWORK DRILL MODAL ────────────────────────────────────────────────────

function FrameworkDrillModal({ framework, onClose, onViolationClick }: {
  framework: string | null;
  onClose: () => void;
  onViolationClick: (v: Violation) => void;
}) {
  const violations = VIOLATIONS.filter(v => framework && v.framework.startsWith(framework.split(' ')[0]));
  const fd = FRAMEWORK_POSTURE.find(f => f.framework === framework);
  return (
    <Modal open={!!framework} onClose={onClose} title={`${framework} — Violations`} wide>
      <div className="space-y-3">
        {fd && (
          <div className="flex items-center gap-4 pb-3 border-b border-border">
            <div className="flex gap-4 text-xs">
              <span className="text-teal font-semibold">{fd.compliant}% compliant</span>
              <span className="text-amber">{fd.atRisk}% at risk</span>
              <span className="text-coral">{fd.violated}% violated</span>
            </div>
            <span className="text-[10px] text-muted-foreground ml-auto">Next audit: {fd.nextAudit} ({fd.daysToAudit}d)</span>
          </div>
        )}
        {violations.length === 0
          ? <p className="text-xs text-muted-foreground py-6 text-center">No violations for this framework.</p>
          : violations.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/20 cursor-pointer"
                onClick={() => { onClose(); setTimeout(() => onViolationClick(v), 80); }}>
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <SeverityBadge severity={v.severity} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{v.asset}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{v.rule}</p>
                    <p className="text-[10px] text-muted-foreground">{v.bu} · {v.agedays}d old · Owner: {v.owner}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusPill status={v.status} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
      </div>
    </Modal>
  );
}

// ─── AUDIT CHECKLIST MODAL ────────────────────────────────────────────────────

function AuditChecklistModal({ framework, onClose }: { framework: string | null; onClose: () => void }) {
  const [local, setLocal] = React.useState<Record<string, boolean>>({});
  const sections = AUDIT_CHECKLIST[framework || ''] || [];
  const fd = FRAMEWORK_POSTURE.find(f => f.framework === framework);
  const toggle = (k: string) => setLocal(s => ({ ...s, [k]: !s[k] }));
  return (
    <Modal open={!!framework} onClose={onClose} title={`${framework} Audit Checklist`} wide>
      {fd && (
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          <CompletionRing pct={fd.compliant} size={48} />
          <div>
            <p className="text-xs text-muted-foreground">Overall Compliance</p>
            <p className="text-sm font-semibold">{fd.compliant}% · {fd.openControls} open controls</p>
            <p className="text-xs text-muted-foreground">Next audit: {fd.nextAudit} ({fd.daysToAudit}d)</p>
          </div>
        </div>
      )}
      {sections.length === 0
        ? <p className="text-xs text-muted-foreground py-4 text-center">No checklist configured for this framework yet.</p>
        : <div className="space-y-5">
            {sections.map(sec => {
              const doneCount = sec.items.filter(i => local[sec.section + i.label] ?? i.done).length;
              return (
                <div key={sec.section}>
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-semibold">{sec.section}</p>
                    <span className="text-[10px] text-muted-foreground">{doneCount}/{sec.items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {sec.items.map(item => {
                      const k = sec.section + item.label;
                      const checked = local[k] ?? item.done;
                      return (
                        <div key={k} className={`flex items-start gap-2.5 p-2 rounded cursor-pointer hover:bg-muted/30 ${checked ? 'opacity-60' : ''}`} onClick={() => toggle(k)}>
                          {checked ? <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                          <span className={`text-xs ${checked ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <button onClick={() => { toast.success('Progress saved'); onClose(); }} className="flex-1 py-2 bg-teal/10 text-teal text-xs font-medium rounded-lg hover:bg-teal/20">Save Progress</button>
              <button onClick={() => toast.success('Checklist exported to PDF')} className="flex items-center gap-1.5 px-3 py-2 border border-border text-xs rounded-lg hover:bg-muted/30"><Upload className="w-3.5 h-3.5" /> Export</button>
            </div>
          </div>}
    </Modal>
  );
}

// ─── BU DRILL MODAL ───────────────────────────────────────────────────────────

function BUDrillModal({ bu, framework, onClose, onViolationClick }: {
  bu: string | null; framework: string | null; onClose: () => void;
  onViolationClick: (v: Violation) => void;
}) {
  const violations = VIOLATIONS.filter(v => v.bu === bu && (framework ? v.framework.startsWith(framework.split(' ')[0]) : true));
  const status = bu && framework ? BU_COMPLIANCE[bu]?.[framework] : null;
  return (
    <Modal open={!!(bu && framework)} onClose={onClose} title={`${bu} × ${framework}`} wide>
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          {status && <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${heatBg[status]}`}>
            {status === 'green' ? 'Compliant' : status === 'amber' ? 'At Risk' : 'Non-Compliant'}
          </span>}
          <span className="text-xs text-muted-foreground">{violations.length} violation{violations.length !== 1 ? 's' : ''} found</span>
        </div>
        {violations.length === 0
          ? <p className="text-xs text-muted-foreground py-6 text-center">No violations for this combination.</p>
          : violations.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/20 cursor-pointer"
                onClick={() => { onClose(); setTimeout(() => onViolationClick(v), 80); }}>
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <SeverityBadge severity={v.severity} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{v.asset}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{v.rule}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusPill status={v.status} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
      </div>
    </Modal>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ComplianceDashboard() {
  const { setCurrentPage, setFilters } = useNav();
  const { addEscalation } = useNotifications();
  const [tab, setTab] = React.useState<Tab>('overview');
  const [activeViolation, setActiveViolation] = React.useState<Violation | null>(null);
  const [escalateViolation, setEscalateViolation] = React.useState<Violation | null>(null);
  const [ticketViolation, setTicketViolation] = React.useState<Violation | null>(null);
  const [frameworkDrill, setFrameworkDrill] = React.useState<string | null>(null);
  const [auditFramework, setAuditFramework] = React.useState<string | null>(null);
  const [buDrill, setBuDrill] = React.useState<{ bu: string; fw: string } | null>(null);
  const [vFilter, setVFilter] = React.useState({ severity: '', framework: '', bu: '', status: '', search: '' });

  const handleEscalate = (v: Violation, comments: string) => {
    addEscalation({
      type: 'escalation',
      violationId: v.id,
      violationAsset: v.asset,
      violationRule: v.rule,
      violationFramework: v.framework,
      violationSeverity: v.severity,
      violationBU: v.bu,
      fromPersona: 'compliance-officer',
      toPersona: 'security-admin',
      comments,
    });
    toast.success('Escalation sent to Security Admin');
  };

  const handleCreateTicket = (v: Violation, data: { title: string; priority: string; assignee: string; description: string }) => {
    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    addEscalation({
      type: 'ticket',
      violationId: v.id,
      violationAsset: v.asset,
      violationRule: v.rule,
      violationFramework: v.framework,
      violationSeverity: data.priority as any,
      violationBU: v.bu,
      fromPersona: 'compliance-officer',
      toPersona: 'security-admin',
      comments: data.description,
      ticketId,
    });
    toast.success(`Ticket ${ticketId} created and assigned to ${data.assignee}`);
  };

  const filteredViolations = useMemo(() =>
    VIOLATIONS.filter(v =>
      (!vFilter.severity  || v.severity  === vFilter.severity)  &&
      (!vFilter.framework || v.framework.startsWith(vFilter.framework.split(' ')[0])) &&
      (!vFilter.bu        || v.bu        === vFilter.bu)        &&
      (!vFilter.status    || v.status    === vFilter.status)    &&
      (!vFilter.search    || v.asset.toLowerCase().includes(vFilter.search.toLowerCase()) ||
        v.rule.toLowerCase().includes(vFilter.search.toLowerCase()))
    ), [vFilter]);

  const openCount    = VIOLATIONS.filter(v => v.status === 'Open').length;
  const criticalCount= VIOLATIONS.filter(v => v.severity === 'Critical').length;
  const unownedCount = VIOLATIONS.filter(v => v.owner === 'Unassigned').length;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">

      {/* Header + Tab Bar — fixed, no scroll */}
      <div className="flex-shrink-0">
        <div className="flex items-end justify-between pt-1 pb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Compliance & Regulatory Posture</h1>
            <p className="text-xs text-muted-foreground mt-1">Compliance Officer · Crypto & Certificate governance</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Refreshed 4m ago</span>
            <button className="p-1 hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className="flex items-center border-b border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Single scroll container for all tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pt-4 pr-1">

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">

            {/* KPI Strip — lives inside Overview tab */}
            <div className="grid grid-cols-5 gap-3">
              <KPICard label="Active Frameworks" value="6" color="teal" subtitle="DORA · PCI-DSS · NIS2 · HIPAA · FIPS · FedRAMP" onClick={() => setCurrentPage('policy-builder')} />
              <KPICard label="Open Violations" value={openCount} color="coral" onClick={() => { setTab('violations'); setVFilter(f => ({ ...f, status: 'Open' })); }} />
              <KPICard label="Critical Violations" value={criticalCount} color="coral" subtitle="Require immediate action" onClick={() => { setTab('violations'); setVFilter(f => ({ ...f, severity: 'Critical' })); }} />
              <KPICard label="Next Audit" value="69d" color="amber" subtitle="DORA RTS — Jun 30, 2026" onClick={() => setTab('audit')} />
              <KPICard label="PQC Compliance Gap" value="94%" color="coral" subtitle="4.4M assets non-PQC-ready" onClick={() => setCurrentPage('quantum')} />
            </div>
            <div className="grid grid-cols-2 gap-4">

              {/* Framework Posture Bar */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-0.5">Compliance Posture by Framework</h3>
                <p className="text-[10px] text-muted-foreground mb-3">% of controls — Compliant / At Risk / Violated</p>
                <p className="text-[9px] text-teal mb-1 cursor-pointer">↑ Click any bar to drill into violations</p>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={FRAMEWORK_POSTURE} barSize={14} layout="vertical"
                    onClick={(d) => {
                      const activePayload = (d as { activePayload?: Array<{ payload?: { framework?: string } }> })?.activePayload;
                      const framework = activePayload?.[0]?.payload?.framework;
                      if (framework) setFrameworkDrill(framework);
                    }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(220 9% 46%)" domain={[0, 100]} unit="%" />
                    <YAxis dataKey="framework" type="category" tick={{ fontSize: 10 }} stroke="hsl(220 9% 46%)" width={76} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="compliant" stackId="a" fill="hsl(160 70% 37%)" name="Compliant" cursor="pointer" />
                    <Bar dataKey="atRisk"    stackId="a" fill="hsl(38 78% 41%)"  name="At Risk" cursor="pointer" />
                    <Bar dataKey="violated"  stackId="a" fill="hsl(15 72% 52%)"  name="Violated" radius={[0,3,3,0]} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* BU x Framework Heat Map */}
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">Business Unit × Framework</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Click any cell to drill into violations</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {['green','amber','red'].map(c => (
                      <span key={c} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${heatDot[c]}`} />{c === 'green' ? 'OK' : c === 'amber' ? 'Risk' : 'Fail'}</span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[440px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-muted-foreground font-medium pr-3">BU</th>
                        {FRAMEWORKS.map(f => (
                          <th key={f} className="text-center py-1.5 text-muted-foreground font-medium px-1 text-[9px]">{f.split(' ')[0]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(BU_COMPLIANCE).map(([bu, fws]) => (
                        <tr key={bu} className="border-b border-border last:border-0">
                          <td className="py-1.5 font-medium text-[10px] pr-3 whitespace-nowrap">{bu}</td>
                          {FRAMEWORKS.map(fw => {
                            const s = fws[fw] || 'green';
                            return (
                              <td key={fw} className="text-center py-1.5 px-1">
                                <button onClick={() => setBuDrill({ bu, fw })}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold ${heatBg[s]} hover:opacity-80 transition-opacity`}
                                  title={`${bu} × ${fw}`}>
                                  {s === 'green' ? '✓' : s === 'amber' ? '!' : '✕'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Violation Trend */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-0.5">Violation Trend (6 months)</h3>
                <p className="text-[10px] text-muted-foreground mb-1">Open violations by framework</p>
                <p className="text-[9px] text-teal mb-2 cursor-pointer">↑ Click any line to filter violations tab</p>
                <ResponsiveContainer width="100%" height={175}>
                  <AreaChart data={VIOLATION_TREND}
                    onClick={(d) => {
                      const activePayload = (d as { activePayload?: Array<{ name?: string }> })?.activePayload;
                      const fw = activePayload?.[0]?.name;
                      if (fw) {
                        setTab('violations');
                        setVFilter(f => ({ ...f, framework: fw === 'PCI' ? 'PCI-DSS' : fw === 'FIPS' ? 'FIPS' : fw }));
                      }
                    }}>
                    <defs>
                      {[['DORA','210 80% 56%'],['PCI','15 72% 52%'],['NIS2','38 78% 41%'],['HIPAA','160 70% 37%'],['FIPS','280 60% 55%']].map(([k,c]) => (
                        <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={`hsl(${c})`} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={`hsl(${c})`} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(220 9% 46%)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(220 9% 46%)" />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    {[['DORA','210 80% 56%'],['PCI','15 72% 52%'],['NIS2','38 78% 41%'],['HIPAA','160 70% 37%'],['FIPS','280 60% 55%']].map(([k,c]) => (
                      <Area key={k} type="monotone" dataKey={k} stroke={`hsl(${c})`} fill={`url(#g-${k})`} strokeWidth={1.5} dot={false} name={k} cursor="pointer" />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Control Domain Coverage */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-0.5">Control Coverage by Domain</h3>
                <p className="text-[10px] text-muted-foreground mb-3">% compliant across all active frameworks</p>
                <div className="space-y-2.5">
                  {CONTROL_DOMAINS.map(d => (
                    <div key={d.domain} className="cursor-pointer hover:opacity-80" onClick={() => { setTab('violations'); setVFilter(f => ({ ...f, search: d.domain.split(' ')[0] })); }}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium underline decoration-dotted">{d.domain}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{d.compliant}/{d.total}</span>
                          <span className={`text-[10px] font-semibold ${d.pct >= 80 ? 'text-teal' : d.pct >= 60 ? 'text-amber' : 'text-coral'}`}>{d.pct}%</span>
                        </div>
                      </div>
                      <ProgressBar pct={d.pct} color={d.pct >= 80 ? 'bg-teal' : d.pct >= 60 ? 'bg-amber' : 'bg-coral'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AIInsightCard>
              DORA RTS Art. 9 (90-day cert lifetime) is your most urgent gap — 5 violations open with 69 days to your audit.
              FIPS 140-2 shows weakest posture (68%) driven by 847 RSA-1024 SSH keys and AES-128 in Vault — both directly remediable via AVX SSH + CLM workflows.
              AI agent identity audit trail gap (38% of 472K tokens) creates a dual risk: NIS2 Art. 21 non-compliance plus a live Eos integration opportunity.
              PQC compliance gap of 94% is a forward regulatory risk — NIST FIPS 203/204/205 adoption mandated by 2027.
            </AIInsightCard>
          </div>
        )}

        {/* ── AUDIT READINESS ───────────────────────────────────────── */}
        {tab === 'audit' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">

              {/* Deadline Tracker */}
              <div className="col-span-2 bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-0.5">Audit Deadline Tracker</h3>
                <p className="text-[10px] text-muted-foreground mb-4">Click any row to open the full audit checklist</p>
                <div className="space-y-3">
                  {[...FRAMEWORK_POSTURE].sort((a, b) => a.daysToAudit - b.daysToAudit).map(f => {
                    const urgency = f.daysToAudit <= 90 ? 'coral' : f.daysToAudit <= 180 ? 'amber' : 'teal';
                    const evPkg = EVIDENCE_PACKAGES.find(e => f.framework.startsWith(e.framework.split(' ')[0]));
                    return (
                      <div key={f.framework} className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-muted/20 cursor-pointer" onClick={() => setAuditFramework(f.framework)}>
                        <CompletionRing pct={f.compliant} size={44} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">{f.framework}</span>
                            <div className="flex items-center gap-2">
                              {evPkg && <span className={`text-[10px] px-1.5 py-0.5 rounded ${evPkg.status === 'Ready' ? 'bg-teal/10 text-teal' : evPkg.status === 'Generating' ? 'bg-amber/10 text-amber' : 'bg-coral/10 text-coral'}`}>Pkg: {evPkg.status}</span>}
                              <span className={`text-[10px] font-semibold text-${urgency}`}>{f.daysToAudit}d</span>
                              <span className="text-[10px] text-muted-foreground">{f.nextAudit}</span>
                            </div>
                          </div>
                          <ProgressBar pct={f.compliant} color={f.compliant >= 80 ? 'bg-teal' : f.compliant >= 60 ? 'bg-amber' : 'bg-coral'} />
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-muted-foreground">{f.compliant}% compliant</span>
                            {f.openControls > 0 && <span className="text-[10px] text-coral">{f.openControls} open controls</span>}
                            <span className="text-[10px] text-teal flex items-center gap-0.5"><BookOpen className="w-3 h-3" /> View checklist</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regulatory Change Calendar */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold mb-0.5">Regulatory Change Calendar</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Upcoming deadlines & rule changes</p>
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                  {REG_CHANGES.map((rc, i) => (
                    <div key={i} className={`p-2.5 border rounded-lg ${rc.status === 'Active' ? 'border-teal/30 bg-teal/5' : rc.status === 'Upcoming' ? 'border-amber/30 bg-amber/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-[10px] font-semibold leading-tight">{rc.event}</p>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 bg-muted/50 ${impactColor[rc.impact]}`}>{rc.impact}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1">{rc.date}</p>
                      <p className="text-[10px] text-foreground/80 leading-relaxed">{rc.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Evidence Packages */}
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Evidence Packages</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Ready-to-submit audit evidence by framework</p>
                </div>
                <button onClick={() => toast.success('All evidence packages regenerated')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted/30">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate All
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {EVIDENCE_PACKAGES.map(ep => (
                  <div key={ep.framework} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">{ep.framework}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ep.status === 'Ready' ? 'bg-teal/10 text-teal' : ep.status === 'Generating' ? 'bg-amber/10 text-amber' : 'bg-coral/10 text-coral'}`}>{ep.status}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {[['Auditor', ep.auditor],['Items', ep.items > 0 ? String(ep.items) : '—'],['Size', ep.size],['Last gen', ep.lastGen]].map(([l,v]) => (
                        <div key={l} className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{l}</span><span className="text-foreground font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {ep.status === 'Ready'
                        ? <>
                            <button onClick={() => toast.success(`Downloading ${ep.framework} package (${ep.size})`)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] bg-teal/10 text-teal rounded hover:bg-teal/20 font-medium"><Download className="w-3 h-3" /> Download</button>
                            <button onClick={() => toast.success(`Sent to ${ep.auditor}`)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] border border-border rounded hover:bg-muted/30 font-medium"><Send className="w-3 h-3" /> Send</button>
                          </>
                        : ep.status === 'Generating'
                          ? <button disabled className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] bg-amber/5 text-amber rounded font-medium"><RefreshCw className="w-3 h-3 animate-spin" /> Generating…</button>
                          : <button onClick={() => toast.success(`Generating ${ep.framework} evidence package…`)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] bg-coral/10 text-coral rounded hover:bg-coral/20 font-medium"><Package className="w-3 h-3" /> Generate</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VIOLATIONS ────────────────────────────────────────────── */}
        {tab === 'violations' && (
          <div className="space-y-4">

            {/* Severity summary */}
            <div className="grid grid-cols-4 gap-3">
              {(['Critical','High','Medium','Low'] as const).map(sev => {
                const count = VIOLATIONS.filter(v => v.severity === sev).length;
                const openSev = VIOLATIONS.filter(v => v.severity === sev && v.status === 'Open').length;
                const col = sev === 'Critical' ? 'coral' : sev === 'High' ? 'amber' : sev === 'Medium' ? 'purple' : 'teal';
                return (
                  <button key={sev}
                    className={`bg-card border border-border border-l-4 border-l-${col} rounded-lg p-3 text-left hover:shadow-md transition-all`}
                    onClick={() => setVFilter(f => ({ ...f, severity: f.severity === sev ? '' : sev }))}>
                    <p className="text-xs text-muted-foreground mb-1">{sev}</p>
                    <p className={`text-xl font-bold text-${col}`}>{count}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{openSev} open</p>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={vFilter.search} onChange={e => setVFilter(f => ({ ...f, search: e.target.value }))}
                    placeholder="Search asset or rule…"
                    className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background w-full focus:outline-none focus:ring-1 focus:ring-teal" />
                </div>
                {[
                  { key: 'framework', label: 'Framework', opts: FRAMEWORKS },
                  { key: 'bu',        label: 'Business Unit', opts: Object.keys(BU_COMPLIANCE) },
                  { key: 'severity',  label: 'Severity', opts: ['Critical','High','Medium','Low'] },
                  { key: 'status',    label: 'Status', opts: ['Open','In Remediation','Pending Approval','Closed'] },
                ].map(({ key, label, opts }) => (
                  <select key={key} value={(vFilter as any)[key]} onChange={e => setVFilter(f => ({ ...f, [key]: e.target.value }))}
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-teal min-w-[120px]">
                    <option value="">{label}</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ))}
                {Object.values(vFilter).some(Boolean) && (
                  <button onClick={() => setVFilter({ severity: '', framework: '', bu: '', status: '', search: '' })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">{filteredViolations.length} result{filteredViolations.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="border-b border-border">
                  <tr className="bg-muted/30">
                    {['ID','Severity','Framework','BU','Asset / Rule','Status','Age','Owner',''].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-muted-foreground font-medium text-[10px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.map(v => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20 group cursor-pointer" onClick={() => setActiveViolation(v)}>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">{v.id}</td>
                      <td className="py-2.5 px-3"><SeverityBadge severity={v.severity} /></td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[10px]">{v.framework}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[10px]">{v.bu}</td>
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <p className="font-medium truncate text-[11px]">{v.asset}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{v.rule}</p>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap"><StatusPill status={v.status} /></td>
                      <td className="py-2.5 px-3"><span className={v.agedays > 30 ? 'text-coral' : v.agedays > 14 ? 'text-amber' : 'text-muted-foreground'}>{v.agedays}d</span></td>
                      <td className="py-2.5 px-3 whitespace-nowrap"><span className={v.owner === 'Unassigned' ? 'text-coral text-[10px]' : 'text-[10px]'}>{v.owner}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setActiveViolation(v)} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 font-medium">View</button>
                          <button onClick={() => toast.success('Evidence generated')} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80 font-medium">Evidence</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredViolations.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-xs text-muted-foreground">No violations match your filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────────────────── */}
        {tab === 'reports' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {REPORT_TEMPLATES.map(rt => (
                <div key={rt.id} className="bg-card border border-border rounded-lg p-4 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <rt.icon className="w-4 h-4 text-teal" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{rt.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Last run: {rt.lastRun}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed flex-1 mb-3">{rt.desc}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {rt.formats.map(fmt => <span key={fmt} className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">{fmt}</span>)}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => toast.success(`Generating ${rt.title}…`)} className="text-[10px] px-2.5 py-1 bg-teal/10 text-teal rounded hover:bg-teal/20 font-medium flex items-center gap-1"><Zap className="w-3 h-3" /> Generate</button>
                      <button onClick={() => toast.success(`Report scheduled`)} className="text-[10px] px-2 py-1 border border-border rounded hover:bg-muted/30 text-muted-foreground"><Clock className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Scheduled reports */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">Scheduled Reports</h3>
              <div className="space-y-2">
                {[
                  { name: 'Weekly Executive Summary',     schedule: 'Every Monday 07:00',         recipients: 'CISO, CPO, CEO',       fmt: 'PDF',  lastSent: '2026-04-21', active: true },
                  { name: 'Monthly Violation Aging Report',schedule: '1st of month 08:00',        recipients: 'Compliance Team',       fmt: 'XLSX', lastSent: '2026-04-01', active: true },
                  { name: 'DORA RTS Audit Tracker',       schedule: 'Every Friday 17:00',         recipients: 'Legal & Compliance',    fmt: 'PDF',  lastSent: '2026-04-18', active: true },
                  { name: 'Quarterly PQC Gap Report',     schedule: 'Quarterly, last business day',recipients: 'CTO, CISO, Board',     fmt: 'PPTX', lastSent: '2026-03-31', active: false },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.schedule} · To: {r.recipients}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">Last: {r.lastSent}</span>
                      <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{r.fmt}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.active ? 'bg-teal/10 text-teal' : 'bg-muted text-muted-foreground'}`}>{r.active ? 'Active' : 'Paused'}</span>
                      <button onClick={() => toast.success(`Running ${r.name} now`)} className="text-[10px] px-2 py-1 border border-border rounded hover:bg-muted/30">Run now</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modals & Drawers */}
      <ViolationDrawer
        v={activeViolation}
        onClose={() => setActiveViolation(null)}
        onEscalate={(v) => setEscalateViolation(v)}
        onTicket={(v) => setTicketViolation(v)}
      />
      <EscalateModal
        v={escalateViolation}
        onClose={() => setEscalateViolation(null)}
        onConfirm={handleEscalate}
      />
      <CreateTicketModal
        v={ticketViolation}
        onClose={() => setTicketViolation(null)}
        onConfirm={handleCreateTicket}
      />
      <FrameworkDrillModal
        framework={frameworkDrill}
        onClose={() => setFrameworkDrill(null)}
        onViolationClick={(v) => setActiveViolation(v)}
      />
      <AuditChecklistModal framework={auditFramework} onClose={() => setAuditFramework(null)} />
      {buDrill && (
        <BUDrillModal
          bu={buDrill.bu} framework={buDrill.fw}
          onClose={() => setBuDrill(null)}
          onViolationClick={v => setActiveViolation(v)}
        />
      )}
    </div>
  );
}
