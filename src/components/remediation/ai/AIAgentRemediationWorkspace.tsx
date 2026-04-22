import React, { useEffect, useMemo, useRef, useState } from 'react';
import { mockITAssets } from '@/data/inventoryMockData';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import { computeCRS, getCrsFactors } from '@/lib/risk/crs';
import { arsFor } from '@/lib/risk/ars';
import { toast } from 'sonner';
import AgentDetailPanel from '@/components/inventory/AgentDetailPanel';
import { AlertTriangle, CheckCircle2, Clock3, Search, Send, Server, ShieldCheck, X, Zap } from 'lucide-react';

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

type WTab = 'agents' | 'hitl' | 'mcp' | 'timeline';

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
] ;

const MCP_SERVERS: McpServer[] = [
  { id:'m1', name:'Aws-Mcp-Server-MCP', agent:'copilot-code-review-agent', status:'Unsanctioned', protected:false },
  { id:'m2', name:'Filemanager-Proxy-MCP', agent:'Github_Copilot-AVXLM184', status:'Unsanctioned', protected:false },
  { id:'m3', name:'Remote-Auth-OAuth', agent:'Github_Copilot-AVXLM184', status:'Approved', protected:true },
  { id:'m4', name:'BigQuery-MCP', agent:'data-analyst-mcp-server', status:'Approved', protected:true },
];

const TIMELINE_EVENTS = [
  { text:'Agent registered — security-soc-autonomous', time:'Apr 22, 01:12 AM', type:'info' },
  { text:'Agent updated — Github_Copilot-AVXLM184', time:'Apr 22, 01:20 AM', type:'info' },
  { text:'Subagent spawned — cleanup-agent', time:'Apr 22, 01:33 AM', type:'warn' },
  { text:'MCP server connected — Aws-Mcp-Server-MCP (unsanctioned)', time:'Apr 22, 02:00 AM', type:'warn' },
  { text:'Policy evaluation triggered — over-privilege detected', time:'Apr 22, 02:17 AM', type:'warn' },
  { text:'Subagent completed — cleanup-agent', time:'Apr 22, 02:20 AM', type:'info' },
  { text:'Supply chain attack blocked — jinja2 install (5 CVEs)', time:'Apr 22, 06:34 AM', type:'alert' },
  { text:'Sensitive file access denied — app/db_config.py', time:'Apr 22, 06:40 AM', type:'alert' },
  { text:'HITL approval sent to Slack — admin group membership', time:'Apr 22, 06:41 AM', type:'warn' },
  { text:'Token expired — security-soc-autonomous (cached access risk)', time:'Apr 22, 06:50 AM', type:'alert' },
] as const;

type TimelineItem = typeof TIMELINE_EVENTS[number];

function timelineDot(type: TimelineItem['type']) {
  return type === 'alert' ? 'bg-coral' : type === 'warn' ? 'bg-amber' : 'bg-teal';
}

function timelineText(type: TimelineItem['type']) {
  return type === 'alert' ? 'text-coral' : type === 'warn' ? 'text-amber' : 'text-foreground';
}

function serviceSensitive(service: string) {
  return /active directory|firewall|pii|crowdstrike|hsm|splunk/i.test(service);
}

function buildFindings(agent: CryptoAsset) {
  const findings: string[] = [];
  if (agent.status === 'Expired') findings.push(`- Token expired — cached access risk remains active. Expired ${Math.abs(agent.daysToExpiry)} day(s) ago.`);
  if (agent.daysToExpiry >= 0 && agent.daysToExpiry <= 7) findings.push(`- Token expires in ${agent.daysToExpiry} day(s) with no buffer for failure.`);
  if (agent.agentMeta?.permissionRisk === 'Over-privileged') findings.push('- Permission scope exceeds stated intent and should be right-sized.');
  if (agent.policyViolations >= 2) findings.push(`- ${agent.policyViolations} policy violations are active on this credential.`);
  else if (agent.policyViolations === 1) findings.push('- 1 policy violation is active.');
  if ((agent.agentMeta?.servicesAccessed || []).some(serviceSensitive)) findings.push('- Agent reaches high-sensitivity resources and needs explicit governance review.');
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

const AnimatedTimeline = ({ events }: { events: readonly TimelineItem[] }) => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep(prev => {
        if (prev >= events.length) {
          setPlaying(false);
          return prev;
        }
        const next = prev + 1;
        if (next >= events.length) setPlaying(false);
        return next;
      });
    }, 550 / speed);
    return () => window.clearInterval(timer);
  }, [events.length, playing, speed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [step]);

  const visible = events.slice(0, step);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => {
            if (step >= events.length) {
              setStep(0);
              setPlaying(false);
              window.setTimeout(() => setPlaying(true), 50);
            } else if (!playing && step === 0) setPlaying(true);
            else setPlaying(prev => !prev);
          }}
          className="rounded-md border border-border px-2.5 py-1 text-[10px] text-foreground hover:bg-secondary"
        >
          {step >= events.length ? '↺ Replay' : playing ? '⏸ Pause' : step > 0 ? '▶ Resume' : '▶ Play'}
        </button>
        <div className="flex items-center gap-1">
          {[0.5, 1, 2].map(v => (
            <button key={v} onClick={() => setSpeed(v)} className={`rounded px-1.5 py-0.5 text-[9px] ${speed === v ? 'bg-teal/20 text-teal' : 'text-muted-foreground hover:bg-secondary'}`}>{v}×</button>
          ))}
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-teal transition-all duration-300" style={{ width: `${events.length ? (step / events.length) * 100 : 0}%` }} />
      </div>
      {step === 0 && !playing ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Clock3 className="h-6 w-6 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Press Play to replay agent activity sequence</p>
        </div>
      ) : (
        <div className="mt-3 space-y-0">
          {visible.map((event, index) => {
            const latest = index === visible.length - 1;
            return (
              <div key={`${event.text}-${event.time}`} className="flex gap-2.5 text-[10px] transition-all duration-300" style={{ opacity: 1, transform: 'translateY(0)' }}>
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${timelineDot(event.type)} ${latest && playing ? 'animate-pulse' : ''}`} />
                  {index !== visible.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className={`pb-2.5 ${latest ? '-ml-1.5 rounded px-1.5 bg-muted/20' : ''}`}>
                  <p className={`font-medium ${timelineText(event.type)}`}>{event.text}</p>
                  <p className="text-[9px] text-muted-foreground">{event.time}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default function AIAgentRemediationWorkspace() {
  const { setCurrentPage, setFilters } = useNav();
  const [wsTab, setWsTab] = useState<WTab>('agents');
  const [selectedAgent, setSelectedAgent] = useState<CryptoAsset | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [search, setSearch] = useState('');
  const [hitlItems, setHitlItems] = useState<HitlItem[]>([...HITL_QUEUE]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([...MCP_SERVERS]);
  const [msgs, setMsgs] = useState<{ role:'guardian'|'user', text:string }[]>([]);
  const [input, setInput] = useState('');

  const filtered = AI_AGENTS.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.agentMeta?.framework || '').toLowerCase().includes(search.toLowerCase()));
  const pendingHITL = hitlItems.filter(h => h.status === 'Pending').length;
  const selectedCRS = selectedAgent ? computeCRS(selectedAgent).crs : null;
  const selectedItAsset = selectedAgent ? mockITAssets.find(a => a.cryptoObjectIds.includes(selectedAgent.id)) : null;
  const selectedARS = selectedItAsset ? arsFor(selectedItAsset).ars : null;

  useEffect(() => {
    if (!selectedAgent && filtered.length) setSelectedAgent(filtered[0]);
  }, [filtered, selectedAgent]);

  useEffect(() => {
    if (!selectedAgent) setMsgs([]);
    else setMsgs([{ role: 'guardian', text: buildInitialMsg(selectedAgent) }]);
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

  const credentials = selectedAgent ? [
    { credential: selectedAgent.serial || `${selectedAgent.name}-cred`, type: selectedAgent.algorithm.includes('HMAC') ? 'HMAC Token' : selectedAgent.algorithm.includes('JWT') ? 'JWT/OAuth' : 'API Key', algorithm: selectedAgent.algorithm, ttl: selectedAgent.rotationFrequency, crs: selectedCRS || 0 },
    ...((selectedAgent.agentMeta?.servicesAccessed || []).some(s => /Azure|Workday/i.test(s)) ? [{ credential: 'azure-ad-app-secret', type: 'Service Account', algorithm: 'RSA-2048', ttl: '365d', crs: 72 }] : []),
    ...((selectedAgent.agentMeta?.servicesAccessed || []).some(s => /Vault/i.test(s)) ? [{ credential: 'vault-approle-token', type: 'Dynamic Secret', algorithm: 'HMAC-SHA256', ttl: '24h', crs: 12 }] : []),
  ] : [];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-64 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span>🤖</span> AI Agents <span className="text-[10px] text-muted-foreground">{AI_AGENTS.length}</span></div>
        </div>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..." className="w-full rounded-md border border-border bg-muted pl-7 pr-3 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(agent => {
            const score = computeCRS(agent).crs;
            const selected = selectedAgent?.id === agent.id;
            return (
              <button key={agent.id} onClick={() => setSelectedAgent(agent)} className={`w-full border-b border-border px-3 py-2.5 text-left hover:bg-muted/30 ${selected ? 'bg-teal/5 border-l-2 border-l-teal' : ''}`}>
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
        <div className="flex border-b border-border bg-card px-4">
          {[
            { id: 'agents', label: 'Agents' },
            { id: 'hitl', label: 'HITL' },
            { id: 'mcp', label: 'MCP' },
            { id: 'timeline', label: 'Timeline' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setWsTab(tab.id as WTab)} className={`relative px-4 py-3 text-sm font-medium border-b-2 transition-colors ${wsTab === tab.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
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
              <div className="flex-1 overflow-y-auto p-4">
                {!selectedAgent ? (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Select an agent to inspect remediation posture.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🤖</span>
                            <h2 className="text-sm font-semibold text-foreground">{selectedAgent.name}</h2>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBadgeCls(selectedCRS || 0)}`}>CRS {selectedCRS}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">{selectedAgent.agentMeta?.agentType} · {selectedAgent.agentMeta?.framework} · owner {selectedAgent.owner}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">actions/day: {selectedAgent.agentMeta?.actionsPerDay?.toLocaleString() || '0'} · last active: {selectedAgent.agentMeta?.lastActivity || 'Unknown'}</p>
                        </div>
                        <button onClick={() => setShowDetailPanel(true)} className="rounded-md border border-teal/20 bg-teal/10 px-3 py-1.5 text-[10px] font-medium text-teal hover:bg-teal/20">Full Access Graph</button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Credential CRS — {selectedCRS}/100 <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${crsBadgeCls(selectedCRS || 0)}`}>{crsLabel(selectedCRS || 0)}</span></h3>
                        <p className="text-[10px] text-muted-foreground">Crypto Risk Score of the agent&apos;s credential — same scoring as certificates and SSH keys.</p>
                      </div>
                      <div className="space-y-3">
                        {getCrsFactors(selectedAgent).map(factor => (
                          <div key={factor.id}>
                            <div className="mb-1 flex items-center justify-between text-[10px]">
                              <span className="font-medium text-foreground">{factor.label}</span>
                              <span className="text-muted-foreground">{factor.raw}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className={`${(factor.raw >= 80 ? 'bg-coral' : factor.raw >= 60 ? 'bg-amber' : factor.raw >= 30 ? 'bg-purple-light' : 'bg-teal')} h-full rounded-full`} style={{ width: `${factor.raw}%` }} /></div>
                            <p className="mt-1 text-[9px] text-muted-foreground">{factor.why}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedItAsset && (
                      <div className="rounded-lg border border-border p-4">
                        <h3 className="text-sm font-semibold text-foreground">Agent ARS — {selectedARS}/100</h3>
                        <p className="text-[10px] text-muted-foreground">Asset Risk Score — rolls up from CRS of credentials on this agent.</p>
                        <p className="mt-2 text-[10px] text-muted-foreground">Host: {selectedItAsset.name}</p>
                        <button onClick={() => { setFilters({ tab: 'it-assets' }); setCurrentPage('inventory'); }} className="mt-2 text-[10px] text-teal hover:underline">View host asset →</button>
                      </div>
                    )}

                    <div className="rounded-lg border border-border p-4">
                      <h3 className="text-sm font-semibold text-foreground">Agent Credentials (crypto objects)</h3>
                      <div className="mt-3 overflow-hidden rounded-lg border border-border">
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
                            {credentials.map(row => (
                              <tr key={row.credential} className="border-t border-border">
                                <td className="px-3 py-2 font-mono text-foreground">{row.credential}</td>
                                <td className="px-3 py-2 text-foreground">{row.type}</td>
                                <td className="px-3 py-2 text-foreground">{row.algorithm}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.ttl}</td>
                                <td className={`px-3 py-2 font-semibold ${selectedCRS && row.crs >= 80 ? 'text-coral' : row.crs >= 60 ? 'text-amber' : row.crs >= 30 ? 'text-purple-light' : 'text-teal'}`}>{row.crs}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <h3 className="text-sm font-semibold text-foreground">Connected Services ({selectedAgent.agentMeta?.servicesAccessed?.length || 0})</h3>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(selectedAgent.agentMeta?.servicesAccessed || []).map(service => (
                          <div key={service} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[10px] text-foreground">
                            <span className={`h-2 w-2 rounded-full ${serviceSensitive(service) ? 'bg-coral' : 'bg-blue-400'}`} />
                            <span className="truncate">{service}</span>
                            {serviceSensitive(service) && <span>⚠</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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
            <div className="overflow-y-auto p-5">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-sm font-semibold text-foreground">Human-in-the-Loop Approval</h2>
                <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] text-amber">{pendingHITL} pending</span>
              </div>
              <p className="mb-4 text-[10px] text-muted-foreground">Risky agent actions are paused here for operator review.</p>
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
            <div className="overflow-y-auto p-5">
              <div className="mb-4 rounded-lg border border-teal/20 bg-teal/5 p-3 text-[10px] text-foreground">✦ Eos MCP Proxy enforces just-in-time credential issuance. Place unsanctioned MCP servers behind the gateway to eliminate static credentials.</div>
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

          {wsTab === 'timeline' && (
            <div className="overflow-y-auto p-5">
              <h2 className="text-sm font-semibold text-foreground">Activity Timeline</h2>
              <p className="mb-4 text-[10px] text-muted-foreground">Sequential log of all agent activities — press Play to replay</p>
              <AnimatedTimeline events={TIMELINE_EVENTS} />
            </div>
          )}
        </div>
      </div>

      {showDetailPanel && selectedAgent && (
        <AgentDetailPanel agent={selectedAgent} onClose={() => setShowDetailPanel(false)} onCreateTicket={() => toast.success('Ticket created')} licensed={true} />
      )}
    </div>
  );
}