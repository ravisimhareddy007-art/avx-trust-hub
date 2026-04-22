import React, { useMemo, useState } from 'react';
import { AlertTriangle, Atom, Shield, ArrowRight, Search } from 'lucide-react';
import { mockITAssets, getAssetViolations, type AssetViolation } from '@/data/inventoryMockData';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

type Tab = 'operational' | 'quantum';

interface ClassicRow extends AssetViolation {
  assetId: string;
  assetName: string;
  environment: string;
  ownerTeam: string;
  daysToFailure: number | null;
  primaryAction: string;
  description?: string;
}

interface PqcRow extends AssetViolation {
  assetId: string;
  assetName: string;
  environment: string;
  isProduction: boolean;
  qthStatus: 'Not assessed' | 'In assessment' | 'Migration planned' | 'In-flight' | 'Migrated';
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

function classicAction(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'Renew via DigiCert';
  if (t.includes('rotat')) return 'Rotate SSH Key';
  if (t.includes('owner')) return 'Assign Owner';
  if (t.includes('hsm')) return 'Migrate to HSM';
  return 'Create Ticket';
}

function classicCategory(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('expir')) return 'expiry';
  if (t.includes('owner') || t.includes('orphan') || t.includes('hsm')) return 'orphaned';
  return 'policy';
}

// Deterministic QTH status pseudo-distribution
function qthStatusFor(assetId: string, idx: number): PqcRow['qthStatus'] {
  const seed = (assetId.charCodeAt(assetId.length - 1) + idx) % 5;
  return (['Not assessed', 'In assessment', 'Migration planned', 'In-flight', 'Migrated'] as const)[seed];
}

export default function ViolationsPage() {
  const { setCurrentPage, setFilters } = useNav();
  const [tab, setTab] = useState<Tab>('operational');
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [algFilter, setAlgFilter] = useState('');
  const [qthFilter, setQthFilter] = useState('');

  // Aggregate every violation across every asset
  const { classic, pqc } = useMemo(() => {
    const classic: ClassicRow[] = [];
    const pqc: PqcRow[] = [];
    mockITAssets.forEach(asset => {
      const vs = getAssetViolations(asset);
      vs.forEach((v, idx) => {
        if (v.violationType === 'classic') {
          const co = mockAssets.find(a => a.id === v.objectId);
          classic.push({
            ...v,
            assetId: asset.id,
            assetName: asset.name,
            environment: asset.environment,
            ownerTeam: asset.ownerTeam,
            daysToFailure: co?.daysToExpiry ?? null,
            primaryAction: classicAction(v.type),
          });
        } else {
          pqc.push({
            ...v,
            assetId: asset.id,
            assetName: asset.name,
            environment: asset.environment,
            isProduction: asset.environment === 'Production',
            qthStatus: qthStatusFor(asset.id, idx),
          });
        }
      });
    });
    classic.push(
      { violationType:'classic', type:'expired-token', severity:'Critical', objectId:'ai-006', objectName:'security-soc-autonomous', description:'Token expired 2 days ago. Agent retains cached credentials with access to Splunk, CrowdStrike, Active Directory, and Firewall API.', assetId:'ai-006', assetName:'aws-eks-security', environment:'Production', ownerTeam:'Security Operations', daysToFailure:-2, primaryAction:'Revoke & Rotate' },
      { violationType:'classic', type:'over-privileged', severity:'High', objectId:'ai-001', objectName:'gpt-orchestrator-token', description:'s3:PutObject and pinecone:upsert unused in last 30 days. Agent runs 14,200 actions/day — write scope creep risk.', assetId:'ai-001', assetName:'aws-eks-ai-cluster', environment:'Production', ownerTeam:'AI Engineering', daysToFailure:5, primaryAction:'Right-size Permissions' },
      { violationType:'classic', type:'shared-credential', severity:'Critical', objectId:'ai-004', objectName:'customer-support-bot', description:'MCP API Credential shared with Github_Copilot-AVXLM186, AVXLM187, AVXLM188. Weakens accountability and makes rotation harder if exposed.', assetId:'ai-004', assetName:'aws-lambda', environment:'Production', ownerTeam:'Customer Experience', daysToFailure:17, primaryAction:'Issue Dedicated Credential' },
      { violationType:'classic', type:'pii-access', severity:'High', objectId:'ai-008', objectName:'hr-onboarding-copilot', description:'Agent accesses PII Vault and DocuSign without data governance approval. Workday write access not justified by HR onboarding intent.', assetId:'ai-008', assetName:'azure-openai', environment:'Production', ownerTeam:'People Operations', daysToFailure:276, primaryAction:'Review Access' },
      { violationType:'classic', type:'unsanctioned-mcp', severity:'High', objectId:'ai-003', objectName:'copilot-code-review-agent', description:'Connected to 2 unsanctioned MCP servers (Aws-Mcp-Server-MCP, Filemanager-Proxy-MCP) not in the approved MCP server registry.', assetId:'ai-003', assetName:'github-actions', environment:'Production', ownerTeam:'AI Engineering', daysToFailure:1, primaryAction:'Place behind MCP Gateway' }
    );
    return { classic, pqc };
  }, []);

  const filteredClassic = useMemo(() => {
    let r = classic;
    if (search) r = r.filter(v => v.assetName.toLowerCase().includes(search.toLowerCase()) || v.objectName.toLowerCase().includes(search.toLowerCase()));
    if (sevFilter) r = r.filter(v => v.severity === sevFilter);
    if (envFilter) r = r.filter(v => v.environment === envFilter);
    return [...r].sort((a, b) => {
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      const ad = a.daysToFailure ?? 9999;
      const bd = b.daysToFailure ?? 9999;
      return ad - bd;
    });
  }, [classic, search, sevFilter, envFilter]);

  const filteredPqc = useMemo(() => {
    let r = pqc;
    if (search) r = r.filter(v => v.assetName.toLowerCase().includes(search.toLowerCase()) || v.objectName.toLowerCase().includes(search.toLowerCase()));
    if (sevFilter) r = r.filter(v => v.severity === sevFilter);
    if (algFilter) r = r.filter(v => v.algorithm === algFilter);
    if (qthFilter) r = r.filter(v => v.qthStatus === qthFilter);
    return [...r].sort((a, b) => {
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      return (b.yearsPastDeadline ?? 0) - (a.yearsPastDeadline ?? 0);
    });
  }, [pqc, search, sevFilter, algFilter, qthFilter]);

  const goClassicRemediate = (row: ClassicRow) => {
    setFilters({ assetId: row.assetId, category: classicCategory(row.type) });
    setCurrentPage('remediation');
  };

  const goPqcAction = (row: PqcRow) => {
    setFilters({ assetId: row.assetId, algorithm: row.algorithm || '', tab: 'qth-queue' });
    setCurrentPage('quantum-posture');
  };

  const algorithms = useMemo(() => [...new Set(pqc.map(p => p.algorithm).filter(Boolean))] as string[], [pqc]);

  const clearFilters = () => { setSearch(''); setSevFilter(''); setEnvFilter(''); setAlgFilter(''); setQthFilter(''); };

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-5 pt-4 pb-3">
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-coral" /> Violations
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Two distinct workflows: operational issues remediated via Cert+, quantum-risk credentials migrated via QTH.
        </p>
      </div>

      {/* Quantum Risk summary banner — always visible */}
      <div className="mx-5 mb-3 rounded-lg border border-purple/30 bg-purple/5 px-4 py-2.5 flex items-center gap-3">
        <Atom className="w-4 h-4 text-purple-light flex-shrink-0" />
        <p className="text-[11px] text-foreground leading-snug">
          <span className="font-bold text-purple-light">247K</span> quantum-vulnerable identities
          <span className="text-muted-foreground"> · </span>
          <span className="font-bold text-coral">189K</span> expire after 2030
          <span className="text-muted-foreground"> · NIST deadline: </span>
          <span className="font-bold text-foreground">2030</span>
          <span className="text-muted-foreground"> · current pace: migration completes </span>
          <span className="font-bold text-amber">2031</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-5 flex items-center gap-0">
        <button
          onClick={() => { setTab('operational'); clearFilters(); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'operational' ? 'border-coral text-coral' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Operational Violations
          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-coral/15 text-coral">{classic.length}</span>
        </button>
        <button
          onClick={() => { setTab('quantum'); clearFilters(); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            tab === 'quantum' ? 'border-purple-light text-purple-light' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Quantum Risk
          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-purple/15 text-purple-light">{pqc.length}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search asset or credential..."
            className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
          <option value="">All severities</option>
          {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {tab === 'operational' && (
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
            <option value="">All envs</option>
            {['Production', 'Staging', 'Development'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
        {tab === 'quantum' && (
          <>
            <select value={algFilter} onChange={e => setAlgFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="">All algorithms</option>
              {algorithms.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={qthFilter} onChange={e => setQthFilter(e.target.value)} className="px-2 py-1.5 bg-muted border border-border rounded text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
              <option value="">All QTH status</option>
              {['Not assessed', 'In assessment', 'Migration planned', 'In-flight', 'Migrated'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
        {(search || sevFilter || envFilter || algFilter || qthFilter) && (
          <button onClick={clearFilters} className="text-[10px] text-coral hover:underline">Clear</button>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {tab === 'operational' ? `${filteredClassic.length} of ${classic.length}` : `${filteredPqc.length} of ${pqc.length}`}
        </span>
      </div>

      {/* Tables */}
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
                  <th className="text-center py-2 px-2 font-medium">Days to failure</th>
                  <th className="text-right py-2 px-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassic.map((v, i) => (
                  <tr key={`c-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors">
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
                    <td className="py-2 px-2 text-center text-foreground tabular-nums text-[10.5px]">
                      {v.daysToFailure == null || v.daysToFailure < 0 ? '—' : v.daysToFailure}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => goClassicRemediate(v)}
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded bg-teal/15 text-teal hover:bg-teal hover:text-primary-foreground transition-colors"
                      >
                        {v.primaryAction} <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredClassic.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No operational violations match.</td></tr>
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
                  <th className="text-left py-2 px-2 font-medium">QTH status</th>
                  <th className="text-right py-2 px-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPqc.map((v, i) => {
                  const yp = v.yearsPastDeadline ?? 0;
                  const ypColor = yp > 0 ? 'text-coral' : yp === 0 ? 'text-amber' : 'text-teal';
                  const isQueued = v.qthStatus !== 'Not assessed';
                  return (
                    <tr key={`p-${i}`} className="border-b border-border hover:bg-secondary/30 transition-colors">
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
                          v.harvestRisk === 'Active' ? 'bg-amber/15 text-amber' :
                          v.harvestRisk === 'Passive' ? 'bg-secondary text-muted-foreground' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {v.harvestRisk ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          v.qthStatus === 'Not assessed' ? 'bg-coral/10 text-coral' :
                          v.qthStatus === 'Migrated' ? 'bg-teal/15 text-teal' :
                          'bg-purple/15 text-purple-light'
                        }`}>
                          {v.qthStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => goPqcAction(v)}
                          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded bg-purple/20 text-purple-light hover:bg-purple-light hover:text-primary-foreground transition-colors"
                        >
                          {isQueued ? 'View in QTH' : 'Add to QTH'} <ArrowRight className="w-3 h-3" />
                        </button>
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
    </div>
  );
}
