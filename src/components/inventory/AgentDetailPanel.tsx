import React, { useMemo, useState } from 'react';
import { mockITAssets } from '@/data/inventoryMockData';
import { type CryptoAsset } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import { computeCRS, getCrsFactors } from '@/lib/risk/crs';
import { arsFor, computeARS } from '@/lib/risk/ars';
import { toast } from 'sonner';
import { ArrowRight, Lock, ShieldAlert, Ticket, X } from 'lucide-react';
import AccessGraphTimeline, { getAgentTimelineEvents } from '@/components/remediation/ai/AccessGraphTimeline';

interface Props {
  agent: CryptoAsset;
  onClose: () => void;
  onCreateTicket: (ctx: any) => void;
  licensed?: boolean;
}

function crsTone(score: number) {
  if (score >= 80) return 'coral';
  if (score >= 60) return 'amber';
  if (score >= 30) return 'purple';
  return 'teal';
}

function badgeClass(score: number) {
  if (score >= 80) return 'bg-coral/10 text-coral border border-coral/20';
  if (score >= 60) return 'bg-amber/10 text-amber border border-amber/20';
  if (score >= 30) return 'bg-purple/10 text-purple-light border border-purple/20';
  return 'bg-teal/10 text-teal border border-teal/20';
}

function scoreTextClass(score: number) {
  if (score >= 80) return 'text-coral';
  if (score >= 60) return 'text-amber';
  if (score >= 30) return 'text-purple-light';
  return 'text-teal';
}

function factorBarClass(score: number) {
  if (score >= 80) return 'bg-coral';
  if (score >= 60) return 'bg-amber';
  if (score >= 30) return 'bg-blue-400';
  return 'bg-teal';
}

function serviceEmoji(service: string) {
  const s = service.toLowerCase();
  if (/openai|bedrock|vertex|claude/.test(s)) return '⚡';
  if (/s3|storage|bigquery|snowflake/.test(s)) return '🗄';
  if (/github|gitlab/.test(s)) return '🔀';
  if (/slack|teams|pagerduty/.test(s)) return '💬';
  if (/active directory|workday/.test(s)) return '👥';
  if (/firewall|crowdstrike|splunk/.test(s)) return '🛡';
  if (/vault|secret/.test(s)) return '🔒';
  return '🔗';
}

function truncateLabel(label: string, len = 14) {
  return label.length > len ? `${label.slice(0, len - 1)}…` : label;
}

function RiskGauge({ score, size = 102 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const tone = crsTone(score);
  const stroke = tone === 'coral'
    ? 'hsl(var(--coral))'
    : tone === 'amber'
      ? 'hsl(var(--amber))'
      : tone === 'purple'
        ? 'hsl(var(--purple))'
        : 'hsl(var(--teal))';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize={size * 0.28} fontWeight="700">
        {score}
      </text>
    </svg>
  );
}


export default function AgentDetailPanel({ agent, onClose, onCreateTicket, licensed = true }: Props) {
  const { setCurrentPage, setFilters } = useNav();
  const [hoveredNode, setHoveredNode] = useState('Hover a node to inspect identity relationships');

  const crsBreakdown = useMemo(() => computeCRS(agent), [agent]);
  const factors = useMemo(() => getCrsFactors(agent), [agent]);
  const sortedFactors = useMemo(() => [...factors].sort((a, b) => b.raw - a.raw), [factors]);
  const lifecycleFactor = factors.find(f => f.id === 'lifecycle');
  const itAsset = mockITAssets.find(a => a.cryptoObjectIds.includes(agent.id));
  const arsBreakdown = itAsset ? computeARS(itAsset) : null;
  const cachedArs = itAsset ? arsFor(itAsset).ars : null;
  const services = agent.agentMeta?.servicesAccessed ?? [];
  const sensitiveTerms = ['Active Directory', 'Firewall', 'PII', 'CrowdStrike', 'HSM', 'Splunk'];

  const findings = useMemo(() => {
    const list: { severity: 'Critical' | 'High' | 'Medium' | 'Low'; title: string; detail: string }[] = [];
    const highSensitivity = services.some(service => /PII|Active Directory/i.test(service));
    if (agent.status === 'Expired') {
      list.push({
        severity: 'Critical',
        title: 'Token expired — agent may retain cached credentials',
        detail: `Expired ${Math.abs(agent.daysToExpiry)}d ago. Last active: ${agent.agentMeta?.lastActivity || 'Unknown'}.`,
      });
    }
    if (agent.daysToExpiry >= 0 && agent.daysToExpiry <= 7) {
      list.push({
        severity: 'High',
        title: `Token expires in ${agent.daysToExpiry} day(s)`,
        detail: 'No auto-renewal configured. Agent will fail on expiry.',
      });
    }
    if (agent.agentMeta?.permissionRisk === 'Over-privileged') {
      list.push({
        severity: 'High',
        title: 'Over-privileged — write permissions exceed intent',
        detail: "Review write/modify scope permissions against agent's stated purpose.",
      });
    }
    if (agent.policyViolations >= 2) {
      list.push({ severity: 'High', title: `${agent.policyViolations} policy violations detected`, detail: 'Policy exceptions are active on this credential.' });
    } else if (agent.policyViolations === 1) {
      list.push({ severity: 'Medium', title: '1 policy violation', detail: 'A non-blocking policy violation still needs review.' });
    }
    if (highSensitivity) {
      list.push({
        severity: 'High',
        title: 'Access to high-sensitivity resources',
        detail: 'Explicit data governance approval required per NIS2 Art. 21.',
      });
    }
    if (list.length === 0) {
      list.push({ severity: 'Low', title: 'No critical findings', detail: 'Credential CRS is within acceptable range.' });
    }
    return list;
  }, [agent, services]);

  const timelineEvents = useMemo(() => getAgentTimelineEvents(agent), [agent]);

  const narrative = useMemo(() => {
    const score = crsBreakdown.crs;
    if (score >= 80) return `Credential CRS is ${score} — CRITICAL. ${sortedFactors[0]?.why}. Immediate action required.`;
    if (score >= 60) return `Credential CRS is ${score} — HIGH. ${sortedFactors.slice(0, 2).map(f => f.why).join(' ')} Review and remediate.`;
    return `Credential CRS is ${score}. ${lifecycleFactor?.why || 'Lifecycle posture is stable.'} Continue monitoring.`;
  }, [crsBreakdown.crs, lifecycleFactor?.why, sortedFactors]);

  const primaryCredentialType = agent.algorithm.includes('HMAC') ? 'HMAC Token' : agent.algorithm.includes('JWT') ? 'JWT/OAuth' : 'API Key';
  const credentialRows = [
    {
      credential: agent.serial || `${agent.name}-cred`,
      type: primaryCredentialType,
      algorithm: agent.algorithm,
      ttl: agent.rotationFrequency,
      crs: crsBreakdown.crs,
    },
    ...(services.some(s => /Azure|Workday/i.test(s)) ? [{ credential: 'azure-ad-app-secret', type: 'Service Account', algorithm: 'RSA-2048', ttl: '365d', crs: 72 }] : []),
    ...(services.some(s => /Vault/i.test(s)) ? [{ credential: 'vault-approle-token', type: 'Dynamic Secret', algorithm: 'HMAC-SHA256', ttl: '24h', crs: 12 }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-[15%] bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[85%] border-l border-border bg-card shadow-2xl h-full flex flex-col animate-slide-in-right">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg">🤖</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-foreground">{agent.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass(crsBreakdown.crs)}`}>CRS {crsBreakdown.crs}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{agent.agentMeta?.agentType || 'AI Agent'}</span>
                <span>•</span>
                <span>{agent.agentMeta?.framework || 'Unknown framework'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!licensed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber/20 bg-amber/10 px-2 py-1 text-[10px] text-amber">
                <Lock className="h-3 w-3" /> Remediation requires AI Agents license
              </span>
            )}
            <button
              onClick={() => setCurrentPage('remediation-ai')}
              className="rounded-md border border-teal/20 bg-teal/10 px-3 py-1.5 text-[10px] font-medium text-teal hover:bg-teal/20"
            >
              Open in Eos
            </button>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 overflow-hidden grid-cols-[260px_1fr_280px]">
          <div className="overflow-y-auto p-4 space-y-4 border-r border-border">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
              {[
                ['Agent Type', agent.agentMeta?.agentType || 'Unknown'],
                ['Framework', agent.agentMeta?.framework || 'Unknown'],
                ['Owner', agent.owner],
                ['Team', agent.team],
                ['Platform', agent.infrastructure],
                ['Status', agent.status],
                ['Token Issued', agent.issueDate],
                ['Token Expires', agent.expiryDate],
                ['Last Activity', agent.agentMeta?.lastActivity || 'Unknown'],
                ['Actions/Day', agent.agentMeta?.actionsPerDay?.toLocaleString() || '0'],
                ['Auto-Renewal', agent.autoRenewal ? 'Yes' : 'No'],
                ['Rotation', agent.rotationFrequency],
                ['Policy Violations', String(agent.policyViolations)],
                ['Discovery Source', agent.discoverySource],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                  <p className={`font-medium ${label === 'Status' && agent.status === 'Expired' ? 'text-coral' : label === 'Status' && agent.status === 'Expiring' ? 'text-amber' : label === 'Policy Violations' && agent.policyViolations > 0 ? 'text-amber' : 'text-foreground'}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex flex-col items-center gap-1.5">
                <RiskGauge score={crsBreakdown.crs} />
                <p className="text-[10px] font-medium text-foreground">Credential CRS</p>
                <p className="text-center text-[9px] text-muted-foreground">Crypto Risk Score of the agent&apos;s credential</p>
              </div>
            </div>

            <div className="space-y-2">
              {factors.map(factor => (
                <div key={factor.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-foreground">{factor.label}</span>
                    <span className="text-muted-foreground">{factor.raw}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${factorBarClass(factor.raw)}`} style={{ width: `${factor.raw}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground">{factor.why}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3">
              {itAsset ? (
                <div className="space-y-2">
                  <p className={`text-sm font-semibold ${scoreTextClass(arsBreakdown?.ars ?? cachedArs ?? 0)}`}>Agent ARS: {arsBreakdown?.ars ?? cachedArs}</p>
                  <p className="text-[9px] text-muted-foreground">Asset Risk Score — rolls up from credential CRS</p>
                  <p className="text-[10px] text-muted-foreground">{itAsset.name}</p>
                  <button
                    onClick={() => {
                      setFilters({ tab: 'it-assets' });
                      setCurrentPage('inventory');
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-teal hover:underline"
                  >
                    View host asset <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">Host asset not in managed inventory</p>
                  <p className="text-[10px] text-foreground">{agent.infrastructure}</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-teal/20 bg-teal/5 p-3">
              <p className="text-[10px] font-semibold text-teal">✦ Eos Guardian</p>
              <p className="mt-1 text-[10px] leading-relaxed text-foreground">{narrative}</p>
            </div>
          </div>

          <div className="overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-foreground">Access Graph</h3>
              <p className="text-[9px] text-muted-foreground">Visual map of users, credentials, and connected services</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <svg viewBox="0 0 520 320" className="w-full rounded-lg">
                <line x1="70" y1="160" x2="240" y2="160" stroke="hsl(var(--amber))" strokeOpacity="0.7" strokeWidth="1.5" />
                {['Orchestrator', 'Autonomous Agent'].includes(agent.agentMeta?.agentType || '') && (
                  <>
                    <line x1="240" y1="160" x2="190" y2="65" stroke="hsl(var(--purple))" strokeDasharray="3 3" strokeOpacity="0.5" />
                    <line x1="240" y1="160" x2="290" y2="58" stroke="hsl(var(--purple))" strokeDasharray="3 3" strokeOpacity="0.5" />
                  </>
                )}
                {services.slice(0, 6).map((service, index, arr) => {
                  const angle = (-55 + (arr.length === 1 ? 55 : (110 / Math.max(arr.length - 1, 1)) * index)) * (Math.PI / 180);
                  const x = 240 + 145 * Math.cos(angle);
                  const y = 160 + 145 * Math.sin(angle);
                  const sensitive = sensitiveTerms.some(term => service.includes(term));
                  return (
                    <g
                      key={service}
                      onMouseEnter={() => setHoveredNode(`${service} · ${sensitive ? 'high-risk resource' : 'connected resource'}`)}
                      onMouseLeave={() => setHoveredNode('Hover a node to inspect identity relationships')}
                    >
                      <line x1="240" y1="160" x2={x} y2={y} stroke="hsl(220 13% 40%)" strokeDasharray="4 3" strokeOpacity="0.5" />
                      <circle cx={x} cy={y} r="18" className={sensitive ? 'fill-coral/15 stroke-coral' : 'fill-blue-500/15 stroke-blue-400'} strokeWidth="2" />
                      <text x={x} y={y + 1} textAnchor="middle" fontSize="11">{serviceEmoji(service)}</text>
                      {sensitive && <text x={x + 11} y={y - 10} fontSize="10">⚠</text>}
                      <text x={x} y={y + 30} textAnchor="middle" className="fill-muted-foreground" fontSize="7">{truncateLabel(service)}</text>
                    </g>
                  );
                })}

                <g onMouseEnter={() => setHoveredNode(`${agent.owner} · owner`)} onMouseLeave={() => setHoveredNode('Hover a node to inspect identity relationships')}>
                  <circle cx="70" cy="160" r="22" className="fill-amber/15 stroke-amber" strokeWidth="2" />
                  <text x="70" y="164" textAnchor="middle" fontSize="12">👤</text>
                  <text x="70" y="195" textAnchor="middle" className="fill-foreground" fontSize="8">{truncateLabel(agent.owner, 18)}</text>
                  <text x="70" y="206" textAnchor="middle" className="fill-muted-foreground" fontSize="7">owner</text>
                </g>

                {crsBreakdown.crs >= 80 && <circle cx="240" cy="160" r="42" fill="none" className="stroke-coral animate-pulse" strokeOpacity="0.3" strokeWidth="2" />}
                <g onMouseEnter={() => setHoveredNode(`${agent.name} · credential CRS ${crsBreakdown.crs}`)} onMouseLeave={() => setHoveredNode('Hover a node to inspect identity relationships')}>
                  <circle cx="240" cy="160" r="36" className={crsBreakdown.crs >= 80 ? 'fill-coral/15 stroke-coral' : crsBreakdown.crs >= 60 ? 'fill-amber/15 stroke-amber' : 'fill-teal/10 stroke-teal'} strokeWidth="3" />
                  <circle cx="240" cy="160" r="30" fill="hsl(220 20% 15%)" />
                  <text x="240" y="165" textAnchor="middle" fontSize="18">🤖</text>
                  <rect x="217" y="198" rx="6" ry="6" width="46" height="16" className={crsBreakdown.crs >= 80 ? 'fill-coral/20' : crsBreakdown.crs >= 60 ? 'fill-amber/20' : 'fill-teal/20'} />
                  <text x="240" y="209" textAnchor="middle" className="fill-foreground" fontSize="8">CRS {crsBreakdown.crs}</text>
                </g>

                {['Orchestrator', 'Autonomous Agent'].includes(agent.agentMeta?.agentType || '') && (
                  <>
                    {[
                      { x: 190, y: 65, key: 'Sub-agent A' },
                      { x: 290, y: 58, key: 'Sub-agent B' },
                    ].map(node => (
                      <g key={node.key} onMouseEnter={() => setHoveredNode(`${node.key} · delegated task runner`)} onMouseLeave={() => setHoveredNode('Hover a node to inspect identity relationships')}>
                        <circle cx={node.x} cy={node.y} r="15" className="fill-purple/15 stroke-purple-light" strokeWidth="2" />
                        <text x={node.x} y={node.y + 3} textAnchor="middle" fontSize="9">🤖</text>
                        <text x={node.x} y={node.y + 22} textAnchor="middle" className="fill-purple-light" fontSize="7">sub-agent</text>
                      </g>
                    ))}
                  </>
                )}

                <rect x="16" y="292" width="488" height="18" rx="6" fill="hsl(var(--muted))" fillOpacity="0.4" />
                <text x="24" y="304" className="fill-muted-foreground" fontSize="9">{hoveredNode}</text>
              </svg>

              <div className="mt-3 flex flex-wrap gap-4 text-[9px] text-muted-foreground">
                {[
                  ['Owner', 'bg-amber'],
                  ['Agent', 'bg-teal'],
                  ['Sub-agent', 'bg-purple-light'],
                  ['Resource', 'bg-blue-400'],
                  ['High-risk', 'bg-coral'],
                ].map(([label, cls]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cls}`} /> {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div>
                <h3 className="text-xs font-semibold text-foreground">Agent Credentials</h3>
                <p className="text-[9px] text-muted-foreground">Cryptographic objects held by this agent — CRS applies</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-[10px]">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Credential</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Algorithm</th>
                      <th className="px-3 py-2 text-left font-medium">TTL</th>
                      <th className="px-3 py-2 text-left font-medium">CRS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credentialRows.map(row => (
                      <tr key={row.credential} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-[10px] text-foreground">{truncateLabel(row.credential, 24)}</td>
                        <td className="px-3 py-2 text-foreground">{row.type}</td>
                        <td className="px-3 py-2 text-foreground">{row.algorithm}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.ttl}</td>
                        <td className={`px-3 py-2 font-semibold ${scoreTextClass(row.crs)}`}>{row.crs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto border-l border-border p-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Findings</h3>
              {findings.map((finding, index) => {
                const cls = finding.severity === 'Critical'
                  ? 'bg-coral/10 text-coral border-coral/20'
                  : finding.severity === 'High'
                    ? 'bg-amber/10 text-amber border-amber/20'
                    : finding.severity === 'Medium'
                      ? 'bg-purple/10 text-purple-light border-purple/20'
                      : 'bg-teal/10 text-teal border-teal/20';
                return (
                  <div key={`${finding.title}-${index}`} className="rounded-lg border border-border p-2.5">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${cls}`}>{finding.severity}</span>
                    </div>
                    <p className="text-[10px] font-medium text-foreground">{finding.title}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{finding.detail}</p>
                    {licensed ? (
                      <button onClick={() => toast.success(`Remediation initiated for ${agent.name}`)} className="mt-2 text-[10px] text-teal hover:underline">
                        Remediate →
                      </button>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" /> Requires AI Agents license
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Quick Actions</h3>
              {[
                { label: 'Rotate Token', action: () => licensed ? toast.success(`Rotate Token initiated for ${agent.name}`) : toast.error('AI Agents license required') },
                { label: 'Revoke Access', action: () => licensed ? toast.success(`Revoke Access initiated for ${agent.name}`) : toast.error('AI Agents license required'), danger: true },
                { label: 'Right-size Permissions', action: () => licensed ? toast.success(`Right-size Permissions initiated for ${agent.name}`) : toast.error('AI Agents license required') },
                { label: 'Place behind MCP Gateway', action: () => licensed ? toast.success(`Place behind MCP Gateway initiated for ${agent.name}`) : toast.error('AI Agents license required') },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] ${item.danger ? 'text-coral' : 'text-foreground'} hover:bg-secondary/50`}
                >
                  <span className="flex items-center gap-2">{!licensed && <Lock className="h-3 w-3" />}{item.label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
              <button
                onClick={() => {
                  onCreateTicket({ objectName: agent.name, objectType: agent.type, status: agent.status, environment: agent.environment });
                  toast.success(`Ticket created for ${agent.name}`);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] text-foreground hover:bg-secondary/50"
              >
                <span className="flex items-center gap-2"><Ticket className="h-3 w-3" /> Create Ticket</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => {
                  setFilters({ type: 'AI Agent Token' });
                  setCurrentPage('violations');
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[10px] text-foreground hover:bg-secondary/50"
              >
                <span>View in Violations</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Access Graph Timeline</h3>
              <AccessGraphTimeline agent={agent} events={timelineEvents} compact />
            </div>

            <div className="rounded-lg border border-teal/20 bg-gradient-to-br from-teal/10 to-purple/10 p-3">
              <p className="text-[10px] font-semibold text-foreground">Full Eos Experience</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Runtime policy enforcement, MCP Gateway, HITL approval, and Eos Guardian AI.</p>
              <button
                onClick={() => licensed ? setCurrentPage('remediation-ai') : toast.info('AI Agents license request noted')}
                className="mt-3 rounded-md border border-teal/20 bg-teal/10 px-3 py-1.5 text-[10px] font-medium text-teal hover:bg-teal/20"
              >
                {licensed ? 'Open AI Agents Module' : 'Request License'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}