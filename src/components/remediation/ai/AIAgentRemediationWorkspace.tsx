import React, { useEffect, useState } from 'react';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { computeCRS, getCrsFactors } from '@/lib/risk/crs';
import { toast } from 'sonner';
import AccessGraphTimeline, { getAgentTimelineEvents } from '@/components/remediation/ai/AccessGraphTimeline';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Search, Send, Server, X, Zap } from 'lucide-react';

const AI_AGENTS = mockAssets.filter(a => a.type === 'AI Agent Token');

const crsLabel = (score: number) => score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low';
const crsColor = (score: number) => score >= 80 ? 'coral' : score >= 60 ? 'amber' : score >= 30 ? 'purple' : 'teal';
const crsBadgeCls = (score: number) => {
  const tone = crsColor(score);
  return tone === 'coral'
    ? 'bg-coral/10 text-coral'
    : tone === 'amber'
      ? 'bg-amber/10 text-amber'
      : tone === 'purple'
        ? 'bg-purple/10 text-purple-light'
        : 'bg-teal/10 text-teal';
};

type WTab = 'agents' | 'hitl' | 'mcp';

type HitlItem = {
  id: string;
  agent: string;
  action: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  reason: string;
  time: string;
  status: 'Pending' | 'Denied' | 'Approved';
};

type McpServer = {
  id: string;
  name: string;
  agent: string;
  status: 'Unsanctioned' | 'Approved';
  protected: boolean;
};

const HITL_QUEUE: HitlItem[] = [
  { id:'H1', agent:'customer-support-bot', action:'pip install jinja2', severity:'High', reason:'Supply chain risk: 5 CVEs detected (GHSA-462w-v97r-4m45, GHSA-8r7q-cvjq-x353, GHSA-cpwx-vrp4-4pq7, GHSA-fqh9-2qgg-h84h, GHSA-g3rq-g295-4j3m). Package flagged as vulnerable.', time:'6:34 AM', status:'Pending' },
  { id:'H2', agent:'gpt-orchestrator-token', action:'Read file: app/db_config.py', severity:'High', reason:'Action deviates from stated agent intent (database-check task). Sensitive config access blocked per policy.', time:'6:40 AM', status:'Denied' },
  { id:'H3', agent:'hr-onboarding-copilot', action:'ad:groups.addMember — Admins', severity:'Critical', reason:'Admin group membership outside scope of HR onboarding intent. Requires CISO approval.', time:'6:41 AM', status:'Pending' },
];

const MCP_SERVERS: McpServer[] = [
  { id:'m1', name:'Aws-Mcp-Server-MCP', agent:'copilot-code-review-agent', status:'Unsanctioned', protected:false },
  { id:'m2', name:'Filemanager-Proxy-MCP', agent:'Github_Copilot-AVXLM184', status:'Unsanctioned', protected:false },
  { id:'m3', name:'Remote-Auth-OAuth', agent:'Github_Copilot-AVXLM184', status:'Approved', protected:true },
  { id:'m4', name:'BigQuery-MCP', agent:'data-analyst-mcp-server', status:'Approved', protected:true },
];

function buildFindings(agent: CryptoAsset) {
  const findings: string[] = [];
  if (agent.status === 'Expired') findings.push(`- Token expired — cached access risk remains active. Expired ${Math.abs(agent.daysToExpiry)} day(s) ago.`);
  if (agent.daysToExpiry >= 0 && agent.daysToExpiry <= 7) findings.push(`- Token expires in ${agent.daysToExpiry} day(s) with no buffer for failure.`);
  if (agent.agentMeta?.permissionRisk === 'Over-privileged') findings.push('- Permission scope exceeds stated intent and should be right-sized.');
  if (agent.policyViolations >= 2) findings.push(`- ${agent.policyViolations} policy violations are active on this credential.`);
  else if (agent.policyViolations === 1) findings.push('- 1 policy violation is active.');
  if ((agent.agentMeta?.servicesAccessed || []).some(service => /active directory|firewall|pii|crowdstrike|hsm|splunk/i.test(service))) findings.push('- Agent reaches high-sensitivity resources and needs explicit governance review.');
  return findings.length ? findings.join('\n') : '- No critical findings.';
}

function buildInitialMsg(agent: CryptoAsset) {
  const crs = computeCRS(agent).crs;
  const topFactor = getCrsFactors(agent).sort((a, b) => b.raw - a.raw)[0];
  if (crs >= 80) {
    return `I've analysed ${agent.name}. Credential CRS is ${crs}/100 — CRITICAL.\n\nTop risk: ${topFactor.label} — ${topFactor.why}.\n\n${agent.agentMeta?.permissionRisk === 'Over-privileged' ? 'Agent is over-privileged. ' : ''}${agent.status === 'Expired' ? 'Token is expired — cached access risk. ' : ''}Should I create a remediation ticket?`;
  }
  if (crs >= 60) {
    return `I've analysed ${agent.name}. Credential CRS is ${crs}/100 — HIGH.\n\n${topFactor.label}: ${topFactor.why}.\n\nRecommend reviewing rotation frequency and permission scope.`;
  }
  return `${agent.name} posture is acceptable. CRS: ${crs}/100. Monitor for scope creep as usage scales.`;
}

function factorTone(raw: number) {
  if (raw >= 80) return 'bg-coral';
  if (raw >= 60) return 'bg-amber';
  if (raw >= 30) return 'bg-purple-light';
  return 'bg-teal';
}

function factorLabel(id: ReturnType<typeof getCrsFactors>[number]['id']) {
  switch (id) {
    case 'algorithm':
      return 'Encryption strength';
    case 'lifecycle':
      return 'How fresh is this credential?';
    case 'exposure':
      return 'How much can it reach?';
    case 'access':
      return 'Does it have more access than it needs?';
    case 'compliance':
      return 'Is it audit-ready?';
  }
}

function crsSummary(score: number) {
  if (score >= 80) return 'This credential is critically at risk and needs immediate action.';
  if (score >= 60) return 'Significant issues that should be addressed soon.';
  if (score >= 30) return 'Some concerns — monitor and plan remediation.';
  return 'This credential is in good shape.';
}

export default function AIAgentRemediationWorkspace() {
  const [wsTab, setWsTab] = useState<WTab>('agents');
  const [selectedAgent, setSelectedAgent] = useState<CryptoAsset | null>(null);
  const [search, setSearch] = useState('');
  const [hitlItems, setHitlItems] = useState<HitlItem[]>([...HITL_QUEUE]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([...MCP_SERVERS]);
  const [msgs, setMsgs] = useState<{ role:'guardian'|'user', text:string }[]>([]);
  const [input, setInput] = useState('');
  const [showCrsPanel, setShowCrsPanel] = useState(false);

  const filtered = AI_AGENTS.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.agentMeta?.framework || '').toLowerCase().includes(search.toLowerCase()));
  const pendingHITL = hitlItems.filter(h => h.status === 'Pending').length;
  const selectedCRS = selectedAgent ? computeCRS(selectedAgent).crs : null;
  const selectedFactors = selectedAgent ? getCrsFactors(selectedAgent) : [];

  useEffect(() => {
    if (!selectedAgent && filtered.length) setSelectedAgent(filtered[0]);
  }, [filtered, selectedAgent]);

  useEffect(() => {
    if (!selectedAgent) setMsgs([]);
    else setMsgs([{ role: 'guardian', text: buildInitialMsg(selectedAgent) }]);
  }, [selectedAgent]);

  useEffect(() => {
    setShowCrsPanel(false);
  }, [selectedAgent]);

  const send = (text?: string) => {
    if (!selectedAgent) return;
    const raw = (text ?? input).trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    const topFactor = getCrsFactors(selectedAgent).sort((a, b) => b.raw - a.raw)[0];
    const writePerms = (selectedAgent.agentMeta?.permissions || []).filter(p => /write|put|create|modify|disable/i.test(p));
    let reply = `Analysing ${selectedAgent.name}... Based on CRS ${selectedCRS}/100, I recommend addressing ${topFactor.label} first. Should I create a ticket?`;

    if (lower === 'create ticket') {
      reply = `Creating ticket for ${selectedAgent.name}... Ticket TKT-${Math.floor(1000 + Math.random() * 9000)} created and assigned to ${selectedAgent.owner}.`;
    } else if (lower === 'rotate credential') {
      reply = `Rotating credential for ${selectedAgent.name}. New short-lived token issued with ${selectedAgent.rotationFrequency} TTL. Hot-swap complete — no service interruption.`;
    } else if (lower === 'right-size') {
      reply = selectedAgent.agentMeta?.permissionRisk === 'Over-privileged'
        ? `Analysing permissions for ${selectedAgent.name}... Found ${writePerms.length} write-scope permissions that may be unused. Recommend removing: ${writePerms.slice(0, 2).join(', ') || 'excess write scopes'}.`
        : `Permissions appear right-sized for ${selectedAgent.name}.`;
    } else if (lower === 'show findings') {
      reply = buildFindings(selectedAgent);
    }

    setMsgs(prev => [...prev, { role: 'user', text: raw }, { role: 'guardian', text: reply }]);
    setInput('');
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex border-b border-border bg-card px-4">
          {[
            { id: 'agents', label: 'AI Agents' },
            { id: 'hitl', label: 'HITL Approval' },
            { id: 'mcp', label: 'MCP Gateway' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setWsTab(tab.id as WTab)} className={`relative border-b-2 px-4 py-3 text-sm font-medium transition-colors ${wsTab === tab.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <span className="inline-flex items-center gap-2">
                {tab.label}
                {tab.id === 'hitl' && pendingHITL > 0 && <span className="rounded-full bg-amber/10 px-1.5 py-0.5 text-[9px] text-amber">{pendingHITL}</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {wsTab === 'agents' && (
            <div className="flex h-full">
              <div className="flex w-64 flex-col border-r border-border bg-card">
                <div className="border-b border-border p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span>🤖</span> AI Agents <span className="text-[10px] text-muted-foreground">{AI_AGENTS.length}</span></div>
                </div>
                <div className="border-b border-border p-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..." className="w-full rounded-md border border-border bg-muted py-1.5 pl-7 pr-3 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filtered.map(agent => {
                    const score = computeCRS(agent).crs;
                    const selected = selectedAgent?.id === agent.id;
                    return (
                      <button key={agent.id} onClick={() => setSelectedAgent(agent)} className={`w-full border-b border-border px-3 py-2.5 text-left hover:bg-muted/30 ${selected ? 'border-l-2 border-l-teal bg-teal/5' : ''}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">🤖</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-[10px] font-medium text-foreground">{agent.name}</p>
                              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-medium ${crsBadgeCls(score)}`}>CRS {score}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-[9px]">
                              <span className="truncate text-muted-foreground">{agent.agentMeta?.framework || 'Unknown'}</span>
                              <span className={agent.status === 'Expired' ? 'text-coral' : agent.status === 'Expiring' ? 'text-amber' : 'text-muted-foreground'}>{agent.status}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                {!selectedAgent ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <span className="text-2xl">🤖</span>
                    <p className="text-sm font-medium text-foreground">Select an agent to view its access graph</p>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-border px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">🤖</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-foreground">{selectedAgent.name}</h2>
                            <button onClick={() => setShowCrsPanel(prev => !prev)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBadgeCls(selectedCRS || 0)}`}>
                              CRS {selectedCRS}
                              {showCrsPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            <span>{selectedAgent.agentMeta?.framework || 'Unknown framework'}</span>
                            <span>·</span>
                            <span>{selectedAgent.agentMeta?.agentType || 'Unknown type'}</span>
                            <span>·</span>
                            <span>{selectedAgent.owner}</span>
                            <span>·</span>
                            <span>{selectedAgent.agentMeta?.actionsPerDay?.toLocaleString() || '0'} actions/day</span>
                            <span>·</span>
                            <span className={selectedAgent.status === 'Expired' ? 'text-coral' : selectedAgent.status === 'Expiring' ? 'text-amber' : 'text-muted-foreground'}>{selectedAgent.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {showCrsPanel && (
                      <div className="animate-in slide-in-from-top-2 border-b border-border bg-card px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-semibold text-foreground">Why CRS {selectedCRS}?</h3>
                          <p className="text-[10px] text-muted-foreground">{crsSummary(selectedCRS || 0)}</p>
                        </div>
                        <div className="mt-2 space-y-2">
                          {selectedFactors.map(factor => (
                            <div key={factor.id}>
                              <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
                                <span className="font-medium text-foreground">{factorLabel(factor.id)}</span>
                                <span className="text-muted-foreground">{factor.raw}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                <div className={`${factorTone(factor.raw)} h-full rounded-full`} style={{ width: `${factor.raw}%` }} />
                              </div>
                              <p className="mt-1 text-[9px] text-muted-foreground">{factor.why}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setShowCrsPanel(false)} className="mt-2 text-[10px] text-teal">Hide ↑</button>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4">
                      <AccessGraphTimeline agent={selectedAgent} events={getAgentTimelineEvents(selectedAgent)} />
                    </div>
                  </>
                )}
              </div>

              <div className="flex w-72 flex-shrink-0 flex-col border-l border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <Zap className="h-4 w-4 text-teal" />
                  <span className="text-xs font-semibold text-foreground">Eos Guardian</span>
                  <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-[9px] text-teal">AI</span>
                  <span className="ml-auto truncate text-[9px] text-muted-foreground">{selectedAgent?.name || 'No agent selected'}</span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {msgs.map((msg, index) => (
                    <div key={`${msg.role}-${index}`} className={msg.role === 'guardian' ? 'rounded-lg border border-teal/20 bg-teal/10 px-3 py-2 text-[10px] whitespace-pre-wrap text-foreground' : 'ml-auto max-w-[90%] rounded-lg bg-teal px-3 py-2 text-[10px] text-primary-foreground'}>
                      {msg.text}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 border-t border-border/50 px-3 py-1.5">
                  {['show findings', 'create ticket', 'rotate credential', 'right-size'].map(chip => (
                    <button key={chip} onClick={() => send(chip)} className="rounded-full border border-teal/20 bg-teal/10 px-2 py-0.5 text-[9px] text-teal">{chip}</button>
                  ))}
                </div>
                <div className="flex gap-2 px-3 pb-3 pt-1.5">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal" placeholder="Ask Eos Guardian..." />
                  <button onClick={() => send()} className="rounded-lg bg-teal p-1.5 text-primary-foreground"><Send className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          )}

          {wsTab === 'hitl' && (
            <div className="overflow-y-auto p-6">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Human-in-the-Loop Approval</h2>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">High-risk AI agent actions that require human approval before execution. These requests come from any agent in your environment.</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pendingHITL > 0 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal'}`}>{pendingHITL > 0 ? `${pendingHITL} pending` : 'All clear'}</span>
              </div>
              <div className="space-y-3">
                {hitlItems.map(item => {
                  const stateCls = item.status === 'Pending' ? 'border-amber/30 bg-amber/5' : item.status === 'Denied' ? 'border-coral/20 bg-coral/5 opacity-60' : 'border-teal/20 bg-teal/5 opacity-60';
                  return (
                    <div key={item.id} className={`rounded-lg border p-4 ${stateCls}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${item.severity === 'Critical' ? 'bg-coral/10 text-coral' : 'bg-amber/10 text-amber'}`}>{item.severity}</span>
                            <span className="text-[10px] font-medium text-foreground">{item.agent}</span>
                            <span className="text-[9px] text-muted-foreground">{item.time}</span>
                          </div>
                          <div className="mt-2 inline-flex rounded bg-muted/40 px-2 py-1 font-mono text-[10px] text-foreground">{item.action}</div>
                          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{item.reason}</p>
                        </div>
                        {item.status === 'Pending' ? (
                          <div className="flex gap-2">
                            <button onClick={() => { setHitlItems(prev => prev.map(h => h.id === item.id ? { ...h, status: 'Approved' } : h)); toast.success(`Approved ${item.agent}`); }} className="inline-flex items-center gap-1 rounded-md bg-teal px-2.5 py-1.5 text-[10px] text-primary-foreground"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                            <button onClick={() => { setHitlItems(prev => prev.map(h => h.id === item.id ? { ...h, status: 'Denied' } : h)); toast.error(`Denied ${item.agent}`); }} className="inline-flex items-center gap-1 rounded-md bg-coral px-2.5 py-1.5 text-[10px] text-primary-foreground"><X className="h-3 w-3" /> Deny</button>
                          </div>
                        ) : (
                          <div className={`inline-flex items-center gap-1 text-[10px] ${item.status === 'Approved' ? 'text-teal' : 'text-coral'}`}>
                            {item.status === 'Approved' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {item.status}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {wsTab === 'mcp' && (
            <div className="overflow-y-auto p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-foreground">MCP Gateway</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">All MCP servers across your environment. Place unsanctioned servers behind the Eos MCP Proxy to enforce just-in-time credential issuance and centralise access control.</p>
                <div className="mt-3 rounded-lg border border-teal/20 bg-teal/5 px-4 py-2.5 text-sm text-foreground">✦ Eos MCP Proxy issues short-lived, scoped credentials at runtime — eliminating static API keys and reducing blast radius if a server is compromised.</div>
              </div>
              <div className="space-y-3">
                {mcpServers.map(server => (
                  <div key={server.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Server className={`mt-0.5 h-4 w-4 ${server.status === 'Unsanctioned' ? 'text-coral' : 'text-teal'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-medium text-foreground">{server.name}</p>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${server.status === 'Unsanctioned' ? 'bg-coral/10 text-coral' : 'bg-teal/10 text-teal'}`}>{server.status}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">{server.agent}</p>
                        </div>
                      </div>
                      {!server.protected ? (
                        <button onClick={() => { setMcpServers(prev => prev.map(s => s.id === server.id ? { ...s, protected: true, status: 'Approved' } : s)); toast.success('MCP server placed behind Eos Gateway — JIT credential issuance active'); }} className="rounded-md bg-teal px-3 py-1.5 text-[10px] text-primary-foreground">Protect</button>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[10px] text-teal"><CheckCircle2 className="h-3 w-3" /> Behind Gateway</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
