import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Atom,
  ClipboardCheck,
  Eye,
  FileText,
  Search,
  Send,
  Shield,
  Ticket,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockITAssets, getAssetViolations, type AssetViolation } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';

type Tab = 'operational' | 'quantum';
type GovernanceStatus = 'Open' | 'In Remediation' | 'Closed';

interface ViolationBase extends AssetViolation {
  violationId: string;
  assetId: string;
  assetName: string;
  environment: string;
  description?: string;
  framework: string;
  status: GovernanceStatus;
  ageDays: number;
  policyMapping: string;
  recommendedRemediation: string;
  evidenceItems: string[];
}

interface ClassicRow extends ViolationBase {
  ownerTeam: string;
  daysToFailure: number | null;
}

interface PqcRow extends ViolationBase {
  isProduction: boolean;
}

const sevOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const classicSevHsl: Record<string, string> = {
  Critical: 'hsl(var(--coral))',
  High: 'hsl(15 72% 62%)',
  Medium: 'hsl(38 78% 51%)',
  Low: 'hsl(var(--teal))',
};

const pqcSevHsl: Record<string, string> = {
  Critical: 'hsl(280 65% 55%)',
  High: 'hsl(270 60% 60%)',
  Medium: 'hsl(260 55% 65%)',
  Low: 'hsl(250 45% 70%)',
};

const statusPillClass: Record<GovernanceStatus, string> = {
  Open: 'bg-coral/10 text-coral border border-coral/20',
  'In Remediation': 'bg-amber/10 text-amber border border-amber/20',
  Closed: 'bg-teal/10 text-teal border border-teal/20',
};

function governanceStatusFor(assetId: string, idx: number): GovernanceStatus {
  const seed = (assetId.charCodeAt(assetId.length - 1) + idx) % 3;
  return (['Open', 'In Remediation', 'Closed'] as const)[seed];
}

function ageDaysFor(assetId: string, idx: number): number {
  return ((assetId.charCodeAt(0) + idx * 11) % 45) + 1;
}

function operationalFrameworkFor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('expir') || t.includes('cryptoperiod')) return 'DORA';
  if (t.includes('hsm') || t.includes('algorithm') || t.includes('rsa')) return 'FIPS 140-2';
  if (t.includes('pii') || t.includes('phi')) return 'HIPAA';
  if (t.includes('mcp') || t.includes('audit')) return 'NIS2';
  return 'PCI-DSS v4.0';
}

function operationalPolicyMapping(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'TLS-01 · Certificate lifetime governance';
  if (t.includes('owner') || t.includes('orphan')) return 'IAM-04 · Ownership accountability';
  if (t.includes('rotat')) return 'KEY-07 · Rotation interval enforcement';
  if (t.includes('hsm')) return 'KEY-12 · HSM-backed key storage';
  return 'POL-09 · Cryptographic policy enforcement';
}

function operationalRemediationText(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'Renew the credential through the approved certificate lifecycle workflow and confirm issuance policy alignment.';
  if (t.includes('rotat')) return 'Rotate the key through the approved lifecycle workflow and validate downstream dependencies before cutover.';
  if (t.includes('owner') || t.includes('orphan')) return 'Assign accountable ownership, validate system dependency, and route the asset into the appropriate remediation queue.';
  if (t.includes('hsm')) return 'Move the credential to an approved HSM-backed storage path and validate policy compliance after migration.';
  return 'Review the violation against policy controls and route it to the owning remediation workflow for execution.';
}

function pqcPolicyMapping(algorithm?: string): string {
  return `QTH-01 · Quantum readiness governance${algorithm ? ` · ${algorithm}` : ''}`;
}

function pqcRemediationText(row: AssetViolation): string {
  const algorithm = row.algorithm || 'Current algorithm';
  const suffix = row.yearsPastDeadline && row.yearsPastDeadline > 0
    ? ` The credential is already ${row.yearsPastDeadline} year${row.yearsPastDeadline === 1 ? '' : 's'} beyond the migration target.`
    : ' The credential should be scheduled before the NIST migration deadline.';
  return `${algorithm} should be assessed in the QTH migration workflow, prioritized by exposure and expiry horizon.${suffix}`;
}

function isClassicRow(row: ClassicRow | PqcRow): row is ClassicRow {
  return row.violationType === 'classic';
}

function StatusPill({ status }: { status: GovernanceStatus }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusPillClass[status]}`}>{status}</span>;
}

export default function ViolationsPage() {
  const [tab, setTab] = useState<Tab>('operational');
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, GovernanceStatus>>({});
  const [activeViolation, setActiveViolation] = useState<ClassicRow | PqcRow | null>(null);

  const { classic, pqc } = useMemo(() => {
    const classic: ClassicRow[] = [];
    const pqc: PqcRow[] = [];

    mockITAssets.forEach(asset => {
      const vs = getAssetViolations(asset);
      vs.forEach((v, idx) => {
        const violationId = `${v.violationType === 'classic' ? 'OP' : 'QTH'}-${asset.id.slice(-3).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`;
        const common = {
          ...v,
          violationId,
          assetId: asset.id,
          assetName: asset.name,
          environment: asset.environment,
          status: governanceStatusFor(asset.id, idx),
          ageDays: ageDaysFor(asset.id, idx),
        };

        if (v.violationType === 'classic') {
          const co = mockAssets.find(a => a.id === v.objectId);
          classic.push({
            ...common,
            framework: operationalFrameworkFor(v.type),
            ownerTeam: asset.ownerTeam,
            daysToFailure: co?.daysToExpiry ?? null,
            policyMapping: operationalPolicyMapping(v.type),
            recommendedRemediation: operationalRemediationText(v.type),
            evidenceItems: [
              `${asset.environment} asset scan snapshot`,
              `${v.objectName} policy evaluation log`,
              `${operationalFrameworkFor(v.type)} control evidence package`,
            ],
          });
        } else {
          pqc.push({
            ...common,
            framework: 'NIST 2030',
            isProduction: asset.environment === 'Production',
            policyMapping: pqcPolicyMapping(v.algorithm),
            recommendedRemediation: pqcRemediationText(v),
            evidenceItems: [
              `${v.algorithm || 'Algorithm'} inventory export`,
              `${asset.environment} exposure and dependency graph`,
              'QTH readiness assessment log',
            ],
          });
        }
      });
    });

    classic.push(
      {
        violationType: 'classic',
        type: 'expired-token',
        severity: 'Critical',
        objectId: 'ai-006',
        objectName: 'security-soc-autonomous',
        description: 'Token expired 2 days ago. Agent retains cached credentials with access to Splunk, CrowdStrike, Active Directory, and Firewall API.',
        violationId: 'OP-AI6-01',
        assetId: 'ai-006',
        assetName: 'aws-eks-security',
        environment: 'Production',
        ownerTeam: 'Security Operations',
        daysToFailure: -2,
        framework: 'NIS2',
        status: 'Open',
        ageDays: 12,
        policyMapping: 'IAM-11 · Non-human identity control logging',
        recommendedRemediation: 'Invalidate the expired token in the relevant remediation workflow, re-issue scoped credentials, and verify audit trail coverage.',
        evidenceItems: ['Expired token report', 'Access scope snapshot', 'AI agent governance log'],
      },
      {
        violationType: 'classic',
        type: 'over-privileged',
        severity: 'High',
        objectId: 'ai-001',
        objectName: 'gpt-orchestrator-token',
        description: 's3:PutObject and pinecone:upsert unused in last 30 days. Agent runs 14,200 actions/day — write scope creep risk.',
        violationId: 'OP-AI1-02',
        assetId: 'ai-001',
        assetName: 'aws-eks-ai-cluster',
        environment: 'Production',
        ownerTeam: 'AI Engineering',
        daysToFailure: 5,
        framework: 'NIS2',
        status: 'In Remediation',
        ageDays: 18,
        policyMapping: 'IAM-06 · Least privilege enforcement',
        recommendedRemediation: 'Reduce access scope in the owning remediation workflow, validate current usage, and re-baseline the policy exception if needed.',
        evidenceItems: ['Permission diff report', 'Last-30-day action log', 'Agent scope review notes'],
      },
      {
        violationType: 'classic',
        type: 'shared-credential',
        severity: 'Critical',
        objectId: 'ai-004',
        objectName: 'customer-support-bot',
        description: 'MCP API Credential shared with Github_Copilot-AVXLM186, AVXLM187, AVXLM188. Weakens accountability and makes rotation harder if exposed.',
        violationId: 'OP-AI4-03',
        assetId: 'ai-004',
        assetName: 'aws-lambda',
        environment: 'Production',
        ownerTeam: 'Customer Experience',
        daysToFailure: 17,
        framework: 'PCI-DSS v4.0',
        status: 'Open',
        ageDays: 24,
        policyMapping: 'IAM-04 · Shared credential prohibition',
        recommendedRemediation: 'Issue unique credentials per agent identity in the appropriate remediation workflow and update owner/accountability mapping.',
        evidenceItems: ['Credential usage map', 'Shared secret detection log', 'Identity ownership registry'],
      },
      {
        violationType: 'classic',
        type: 'pii-access',
        severity: 'High',
        objectId: 'ai-008',
        objectName: 'hr-onboarding-copilot',
        description: 'Agent accesses PII Vault and DocuSign without data governance approval. Workday write access not justified by HR onboarding intent.',
        violationId: 'OP-AI8-04',
        assetId: 'ai-008',
        assetName: 'azure-openai',
        environment: 'Production',
        ownerTeam: 'People Operations',
        daysToFailure: 276,
        framework: 'HIPAA',
        status: 'Closed',
        ageDays: 7,
        policyMapping: 'DATA-08 · Sensitive data access review',
        recommendedRemediation: 'Re-scope access to approved systems only, capture governance approval, and re-run evidence collection after enforcement changes.',
        evidenceItems: ['PII access review', 'System entitlement export', 'Governance approval record'],
      },
      {
        violationType: 'classic',
        type: 'unsanctioned-mcp',
        severity: 'High',
        objectId: 'ai-003',
        objectName: 'copilot-code-review-agent',
        description: 'Connected to 2 unsanctioned MCP servers (Aws-Mcp-Server-MCP, Filemanager-Proxy-MCP) not in the approved MCP server registry.',
        violationId: 'OP-AI3-05',
        assetId: 'ai-003',
        assetName: 'github-actions',
        environment: 'Production',
        ownerTeam: 'AI Engineering',
        daysToFailure: 1,
        framework: 'NIS2',
        status: 'Open',
        ageDays: 15,
        policyMapping: 'INT-03 · Approved connector registry',
        recommendedRemediation: 'Route the identity through the approved MCP governance and remediation workflow before allowing continued use.',
        evidenceItems: ['MCP registry diff', 'Connector configuration export', 'Approval policy snapshot'],
      }
    );

    return { classic, pqc };
  }, []);

  const getStatus = (row: ClassicRow | PqcRow) => statusOverrides[row.violationId] ?? row.status;

  const filteredClassic = useMemo(() => {
    let r = classic;
    if (search) {
      const query = search.toLowerCase();
      r = r.filter(v =>
        v.assetName.toLowerCase().includes(query) ||
        v.objectName.toLowerCase().includes(query) ||
        v.violationId.toLowerCase().includes(query)
      );
    }
    if (sevFilter) r = r.filter(v => v.severity === sevFilter);
    if (envFilter) r = r.filter(v => v.environment === envFilter);
    return [...r].sort((a, b) => {
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      return b.ageDays - a.ageDays;
    });
  }, [classic, search, sevFilter, envFilter]);

  const filteredPqc = useMemo(() => {
    let r = pqc;
    if (search) {
      const query = search.toLowerCase();
      r = r.filter(v =>
        v.assetName.toLowerCase().includes(query) ||
        v.objectName.toLowerCase().includes(query) ||
        v.violationId.toLowerCase().includes(query)
      );
    }
    if (sevFilter) r = r.filter(v => v.severity === sevFilter);
    if (envFilter) r = r.filter(v => v.environment === envFilter);
    return [...r].sort((a, b) => {
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      return b.ageDays - a.ageDays;
    });
  }, [pqc, search, sevFilter, envFilter]);

  const clearFilters = () => {
    setSearch('');
    setSevFilter('');
    setEnvFilter('');
  };

  const openViolation = (row: ClassicRow | PqcRow) => setActiveViolation(row);

  const createTicket = (row: ClassicRow | PqcRow) => {
    toast.success(`Ticket created for ${row.violationId}`);
  };

  const escalateViolation = (row: ClassicRow | PqcRow) => {
    toast.success(`Escalation sent for ${row.violationId}`);
  };

  const assignOwner = (row: ClassicRow | PqcRow) => {
    toast.success(`Owner assignment started for ${row.violationId}`);
  };

  const generateEvidence = (row: ClassicRow | PqcRow) => {
    toast.success(`Evidence package generated for ${row.violationId}`);
  };

  const markInRemediation = (row: ClassicRow | PqcRow) => {
    setStatusOverrides(prev => ({ ...prev, [row.violationId]: 'In Remediation' }));
    toast.success(`${row.violationId} marked In Remediation`);
  };

  const activeStatus = activeViolation ? getStatus(activeViolation) : null;

  return (
    <div className="h-full flex flex-col relative">
      <div className="px-5 pt-4 pb-3">
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-coral" /> Violations
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Governance and tracking across operational violations and quantum-risk identities.
        </p>
      </div>

      <div className="mx-5 mb-3 rounded-lg border border-border bg-secondary/30 px-4 py-2.5 flex items-start gap-3">
        <Shield className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground leading-snug">
          Operational violations are tracked here and remediated via Remediation module. Quantum-risk identities are managed via QTH workflows.
        </p>
      </div>

      <div className="border-b border-border px-5 flex items-center gap-0">
        <button
          onClick={() => setTab('operational')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'operational' ? 'border-coral text-coral' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Operational Violations
          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-coral/15 text-coral">{classic.length}</span>
        </button>
        <button
          onClick={() => setTab('quantum')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'quantum' ? 'border-purple-light text-purple-light' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Quantum Risk
          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-purple/15 text-purple-light">{pqc.length}</span>
        </button>
      </div>

      <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search asset, credential, or violation ID..."
            className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
          <option value="">All severities</option>
          {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
          <option value="">All envs</option>
          {['Production', 'Staging', 'Development'].map(env => <option key={env} value={env}>{env}</option>)}
        </select>
        {(search || sevFilter || envFilter) && (
          <button onClick={clearFilters} className="text-[10px] text-coral hover:underline">Clear</button>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {tab === 'operational' ? `${filteredClassic.length} of ${classic.length}` : `${filteredPqc.length} of ${pqc.length}`}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-5 pb-5 scrollbar-thin">
        {tab === 'operational' ? (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">Sev</th>
                  <th className="text-left py-2 px-2 font-medium">Credential</th>
                  <th className="text-left py-2 px-2 font-medium">Type</th>
                  <th className="text-left py-2 px-2 font-medium">Reason</th>
                  <th className="text-left py-2 px-2 font-medium">Owner</th>
                  <th className="text-left py-2 px-2 font-medium">Env</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-center py-2 px-2 font-medium">Days to failure</th>
                  <th className="text-right py-2 px-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassic.map((v, i) => (
                  <tr key={`c-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => openViolation(v)}>
                    <td className="py-2 px-3">
                      <span
                        className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ color: classicSevHsl[v.severity], background: `${classicSevHsl[v.severity]}1f` }}
                      >
                        {v.severity}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[10.5px] text-foreground truncate max-w-[200px]">{v.objectName}</td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px]">Operational</td>
                    <td className="py-2 px-2 text-foreground text-[10.5px]">{v.type}</td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px]">{v.ownerTeam}</td>
                    <td className="py-2 px-2 text-muted-foreground text-[10px]">{v.environment}</td>
                    <td className="py-2 px-2 text-[10px]"><StatusPill status={getStatus(v)} /></td>
                    <td className="py-2 px-2 text-center text-foreground tabular-nums text-[10.5px]">
                      {v.daysToFailure == null || v.daysToFailure < 0 ? '—' : v.daysToFailure}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openViolation(v)} className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded bg-secondary text-foreground hover:bg-muted transition-colors">
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button onClick={() => createTicket(v)} className="text-[10px] font-medium text-teal hover:underline">
                          Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClassic.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">No operational violations match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 px-3 font-medium">PQC Sev</th>
                  <th className="text-left py-2 px-2 font-medium">Credential</th>
                  <th className="text-left py-2 px-2 font-medium">Algorithm</th>
                  <th className="text-left py-2 px-2 font-medium">Expiry</th>
                  <th className="text-center py-2 px-2 font-medium">Years past 2030</th>
                  <th className="text-left py-2 px-2 font-medium">Prod</th>
                  <th className="text-left py-2 px-2 font-medium">Harvest</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-right py-2 px-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPqc.map((v, i) => {
                  const yp = v.yearsPastDeadline ?? 0;
                  const ypColor = yp > 0 ? 'text-coral' : yp === 0 ? 'text-amber' : 'text-teal';
                  return (
                    <tr key={`p-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => openViolation(v)}>
                      <td className="py-2 px-3">
                        <span
                          className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ color: pqcSevHsl[v.severity], background: `${pqcSevHsl[v.severity]}1f` }}
                        >
                          <Atom className="w-2.5 h-2.5" /> {v.severity}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-[10.5px] text-foreground truncate max-w-[200px]">{v.objectName}</td>
                      <td className="py-2 px-2 font-mono text-[10.5px] text-foreground">{v.algorithm}</td>
                      <td className="py-2 px-2 text-muted-foreground tabular-nums text-[10.5px]">{v.expiryYear}</td>
                      <td className={`py-2 px-2 text-center font-bold tabular-nums text-[10.5px] ${ypColor}`}>
                        {yp > 0 ? `+${yp}` : yp === 0 ? '0' : yp}
                      </td>
                      <td className="py-2 px-2 text-[10px]">
                        {v.isProduction
                          ? <span className="text-coral font-semibold">Prod</span>
                          : <span className="text-muted-foreground">Non-prod</span>}
                      </td>
                      <td className="py-2 px-2 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${
                          v.harvestRisk === 'Active' ? 'bg-amber/15 text-amber' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {v.harvestRisk ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[10px]"><StatusPill status={getStatus(v)} /></td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openViolation(v)} className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded bg-secondary text-foreground hover:bg-muted transition-colors">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={() => createTicket(v)} className="text-[10px] font-medium text-teal hover:underline">
                            Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPqc.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">No quantum-risk violations match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeViolation && activeStatus && (
        <div className="fixed inset-0 z-[70] flex" role="dialog" aria-label="Violation details">
          <div className="flex-1 bg-foreground/40 backdrop-blur-sm" onClick={() => setActiveViolation(null)} />
          <div className="w-[560px] max-w-[94vw] h-full bg-card border-l border-border overflow-y-auto scrollbar-thin animate-slide-in-right">
            <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{activeViolation.violationId}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{activeViolation.framework}</span>
                  <span
                    className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color: activeViolation.violationType === 'classic' ? classicSevHsl[activeViolation.severity] : pqcSevHsl[activeViolation.severity],
                      background: `${activeViolation.violationType === 'classic' ? classicSevHsl[activeViolation.severity] : pqcSevHsl[activeViolation.severity]}1f`,
                    }}
                  >
                    {activeViolation.severity}
                  </span>
                  <StatusPill status={activeStatus} />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Age {activeViolation.ageDays}d</span>
                </div>
                <h2 className="text-sm font-semibold text-foreground font-mono truncate">{activeViolation.objectName}</h2>
                <p className="text-[10.5px] text-muted-foreground mt-1">{activeViolation.assetName} · {activeViolation.environment}</p>
              </div>
              <button onClick={() => setActiveViolation(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <section>
                <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold mb-2">What’s wrong</h3>
                <div className="rounded-md border border-border bg-secondary/20 p-3">
                  <p className="text-[11px] text-foreground leading-relaxed">{activeViolation.description || activeViolation.type}</p>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold mb-2">Recommended remediation</h3>
                <div className="rounded-md border border-border bg-secondary/20 p-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{activeViolation.recommendedRemediation}</p>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold mb-2">Evidence</h3>
                <div className="space-y-3">
                  <div className="rounded-md border border-border bg-secondary/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Policy mapping</p>
                    <div className="flex items-start gap-2 text-[11px] text-foreground">
                      <ClipboardCheck className="w-3.5 h-3.5 mt-0.5 text-teal flex-shrink-0" />
                      <span>{activeViolation.policyMapping}</span>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-secondary/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Logs / artifacts</p>
                    <ul className="space-y-1.5">
                      {activeViolation.evidenceItems.map(item => (
                        <li key={item} className="flex items-start gap-2 text-[11px] text-foreground">
                          <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold mb-2">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => assignOwner(activeViolation)} className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded bg-secondary text-foreground hover:bg-muted transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> Assign Owner
                  </button>
                  <button onClick={() => generateEvidence(activeViolation)} className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded bg-secondary text-foreground hover:bg-muted transition-colors">
                    <FileText className="w-3.5 h-3.5" /> Generate Evidence
                  </button>
                  <button onClick={() => createTicket(activeViolation)} className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded bg-secondary text-foreground hover:bg-muted transition-colors">
                    <Ticket className="w-3.5 h-3.5" /> Create Ticket
                  </button>
                  <button onClick={() => markInRemediation(activeViolation)} className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded bg-amber/15 text-amber hover:bg-amber/20 transition-colors">
                    <Shield className="w-3.5 h-3.5" /> Mark In Remediation
                  </button>
                  <button onClick={() => escalateViolation(activeViolation)} className="col-span-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded bg-coral/10 text-coral hover:bg-coral/15 transition-colors">
                    <Send className="w-3.5 h-3.5" /> Escalate
                  </button>
                </div>
              </section>

              {isClassicRow(activeViolation) ? (
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold mb-2">Operational context</h3>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Owner team</p>
                      <p className="text-foreground">{activeViolation.ownerTeam}</p>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Days to failure</p>
                      <p className="text-foreground">{activeViolation.daysToFailure == null || activeViolation.daysToFailure < 0 ? '—' : activeViolation.daysToFailure}</p>
                    </div>
                  </div>
                </section>
              ) : (
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-foreground font-semibold mb-2">Quantum context</h3>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Algorithm</p>
                      <p className="text-foreground font-mono">{activeViolation.algorithm}</p>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Years past 2030</p>
                      <p className="text-foreground">{activeViolation.yearsPastDeadline ?? 0}</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
