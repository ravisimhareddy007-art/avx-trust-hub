import React, { useEffect, useMemo, useRef, useState } from 'react';
import { arsFor } from '@/lib/risk/ars';
import { computeCRS, getCrsFactors } from '@/lib/risk/crs';
import { mockITAssets } from '@/data/inventoryMockData';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import AccessGraphTimeline, { getAgentTimelineEvents } from '@/components/remediation/ai/AccessGraphTimeline';
import { toast } from 'sonner';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Minus,
  MoreVertical,
  Search,
  Send,
  Server,
  X,
  Zap,
} from 'lucide-react';

type WTab = 'agents' | 'hitl' | 'mcp';

type ChatMessage = {
  role: 'guardian' | 'user';
  text: string;
};

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

type Finding = {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  detail: string;
  action: string;
};

const AI_AGENTS = mockAssets
  .filter(a => a.type === 'AI Agent Token')
  .map(a => ({ ...a, crs: computeCRS(a).crs }))
  .sort((a, b) => b.crs - a.crs);

const HITL_QUEUE: HitlItem[] = [
  {
    id: 'H1',
    agent: 'customer-support-bot',
    action: 'pip install jinja2',
    severity: 'High',
    reason: 'Supply chain risk: 5 CVEs detected (GHSA-462w-v97r-4m45, GHSA-8r7q-cvjq-x353, GHSA-cpwx-vrp4-4pq7, GHSA-fqh9-2qgg-h84h, GHSA-g3rq-g295-4j3m). Package flagged as vulnerable.',
    time: '6:34 AM',
    status: 'Pending',
  },
  {
    id: 'H2',
    agent: 'gpt-orchestrator-token',
    action: 'Read file: app/db_config.py',
    severity: 'High',
    reason: 'Action deviates from stated agent intent (database-check task). Sensitive config access blocked per policy.',
    time: '6:40 AM',
    status: 'Denied',
  },
  {
    id: 'H3',
    agent: 'hr-onboarding-copilot',
    action: 'ad:groups.addMember — Admins',
    severity: 'Critical',
    reason: 'Admin group membership outside scope of HR onboarding intent. Requires CISO approval.',
    time: '6:41 AM',
    status: 'Pending',
  },
];

const MCP_SERVERS: McpServer[] = [
  { id: 'm1', name: 'Aws-Mcp-Server-MCP', agent: 'copilot-code-review-agent', status: 'Unsanctioned', protected: false },
  { id: 'm2', name: 'Filemanager-Proxy-MCP', agent: 'Github_Copilot-AVXLM184', status: 'Unsanctioned', protected: false },
  { id: 'm3', name: 'Remote-Auth-OAuth', agent: 'Github_Copilot-AVXLM184', status: 'Approved', protected: true },
  { id: 'm4', name: 'BigQuery-MCP', agent: 'data-analyst-mcp-server', status: 'Approved', protected: true },
];

const SENSITIVE_SERVICES = ['Active Directory', 'Firewall', 'PII', 'CrowdStrike', 'HSM', 'Splunk'];

const crsLabel = (n: number) => (n >= 80 ? 'Critical' : n >= 60 ? 'High' : n >= 30 ? 'Medium' : 'Low');
const crsCls = (n: number) => (n >= 80 ? 'text-coral' : n >= 60 ? 'text-amber' : n >= 30 ? 'text-purple' : 'text-teal');
const crsBgCls = (n: number) => (n >= 80 ? 'bg-coral/10 text-coral' : n >= 60 ? 'bg-amber/10 text-amber' : n >= 30 ? 'bg-purple/10 text-purple' : 'bg-teal/10 text-teal');

function statusCls(status: CryptoAsset['status']) {
  if (status === 'Expired') return 'text-coral';
  if (status === 'Expiring') return 'text-amber';
  return 'text-teal';
}

function factorBarCls(raw: number) {
  if (raw >= 80) return 'bg-coral';
  if (raw >= 60) return 'bg-amber';
  if (raw >= 30) return 'bg-purple';
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
    default:
      return id;
  }
}

function crsSummary(score: number) {
  if (score >= 80) return 'This credential is critically at risk and needs immediate action.';
  if (score >= 60) return 'Significant issues that should be addressed soon.';
  if (score >= 30) return 'Some concerns — monitor and plan remediation.';
  return 'This credential is in good shape.';
}

function ringTone(score: number) {
  if (score >= 80) return 'hsl(var(--coral))';
  if (score >= 60) return 'hsl(var(--amber))';
  if (score >= 30) return 'hsl(var(--purple))';
  return 'hsl(var(--teal))';
}

function truncate(value: string, len = 28) {
  return value.length > len ? `${value.slice(0, len - 1)}…` : value;
}

function credentialType(asset: CryptoAsset) {
  if (asset.algorithm.includes('HMAC')) return 'HMAC Token';
  if (asset.algorithm.includes('JWT')) return 'JWT/OAuth';
  return 'API Key';
}

function buildCredentials(agent: CryptoAsset) {
  const rows = [
    {
      id: `${agent.id}-primary`,
      name: agent.serial || `${agent.name}-cred`,
      algorithm: agent.algorithm,
      crs: computeCRS(agent).crs,
      type: credentialType(agent),
    },
  ];

  const services = agent.agentMeta?.servicesAccessed || [];
  if (services.some(service => /azure|workday/i.test(service))) {
    rows.push({
      id: `${agent.id}-azure-ad`,
      name: 'azure-ad-app-secret',
      algorithm: 'RSA-2048',
      crs: 72,
      type: 'Service Account',
    });
  }
  if (services.some(service => /vault/i.test(service))) {
    rows.push({
      id: `${agent.id}-vault`,
      name: 'vault-approle-token',
      algorithm: 'HMAC-SHA256',
      crs: 12,
      type: 'Dynamic Secret',
    });
  }

  return rows;
}

function buildFindings(agent: CryptoAsset): Finding[] {
  const findings: Finding[] = [];
  const services = agent.agentMeta?.servicesAccessed || [];

  if (agent.status === 'Expired') {
    findings.push({
      severity: 'Critical',
      title: 'Token expired — agent may retain cached credentials',
      detail: `Expired ${Math.abs(agent.daysToExpiry)}d ago. Last active: ${agent.agentMeta?.lastActivity || 'unknown'}.`,
      action: 'Revoke & Rotate',
    });
  }

  if (agent.daysToExpiry >= 0 && agent.daysToExpiry <= 7) {
    findings.push({
      severity: 'High',
      title: `Token expires in ${agent.daysToExpiry} day(s)`,
      detail: 'No auto-renewal configured. Agent will fail on expiry.',
      action: 'Rotate Token',
    });
  }

  if (agent.agentMeta?.permissionRisk === 'Over-privileged') {
    findings.push({
      severity: 'High',
      title: 'Over-privileged — write permissions exceed intent',
      detail: "Review write/modify scope permissions against agent's stated purpose.",
      action: 'Right-size Permissions',
    });
  }

  if (agent.policyViolations >= 2) {
    findings.push({
      severity: 'High',
      title: `${agent.policyViolations} policy violations detected`,
      detail: 'Multiple controls are currently failing for this credential.',
      action: 'Review Violations',
    });
  } else if (agent.policyViolations === 1) {
    findings.push({
      severity: 'Medium',
      title: '1 policy violation',
      detail: 'One control is currently failing and should be reviewed.',
      action: 'Review Violation',
    });
  }

  if (services.some(service => /PII|Active Directory/i.test(service))) {
    findings.push({
      severity: 'High',
      title: 'Access to high-sensitivity resources',
      detail: 'Explicit data governance approval required per NIS2 Art. 21.',
      action: 'Review Access',
    });
  }

  if (!findings.length) {
    findings.push({
      severity: 'Low',
      title: 'No critical findings',
      detail: 'Credential CRS is within acceptable range.',
      action: 'Continue Monitoring',
    });
  }

  return findings;
}

function severityBadgeCls(severity: Finding['severity'] | HitlItem['severity']) {
  if (severity === 'Critical') return 'bg-coral/10 text-coral';
  if (severity === 'High') return 'bg-amber/10 text-amber';
  if (severity === 'Medium') return 'bg-purple/10 text-purple';
  return 'bg-teal/10 text-teal';
}

function buildAgentInitialMsg(agent: CryptoAsset) {
  const crs = computeCRS(agent).crs;
  const topFactor = [...getCrsFactors(agent)].sort((a, b) => b.raw - a.raw)[0];
  if (crs >= 80) {
    return `I've analysed ${agent.name}. Credential CRS is ${crs}/100 — CRITICAL.\n\nTop risk: ${topFactor.label} — ${topFactor.why}.\n\n${agent.agentMeta?.permissionRisk === 'Over-privileged' ? 'Agent is over-privileged. ' : ''}${agent.status === 'Expired' ? 'Token is expired — cached access risk. ' : ''}Should I create a remediation ticket?`;
  }
  if (crs >= 60) {
    return `I've analysed ${agent.name}. Credential CRS is ${crs}/100 — HIGH.\n\n${topFactor.label}: ${topFactor.why}.\n\nRecommend reviewing rotation frequency and permission scope.`;
  }
  return `${agent.name} posture is acceptable. CRS: ${crs}/100. Monitor for scope creep as usage scales.`;
}

function buildGuardianInitialMsg(wsTab: WTab, selectedAgent: CryptoAsset | null, pendingHITL: number, unsanctionedMCP: number) {
  if (wsTab === 'agents') {
    return selectedAgent
      ? buildAgentInitialMsg(selectedAgent)
      : 'Select an agent and I’ll explain its CRS, connected services, and the most urgent remediation path.';
  }
  if (wsTab === 'hitl') {
    return pendingHITL > 0
      ? `${pendingHITL} high-risk action${pendingHITL === 1 ? '' : 's'} currently require human approval. I can summarise the queue or highlight the most critical requests first.`
      : 'The HITL queue is clear. I can still summarise recent denied and approved requests if you want an audit recap.';
  }
  return unsanctionedMCP > 0
    ? `${unsanctionedMCP} MCP server${unsanctionedMCP === 1 ? '' : 's'} remain outside the Eos MCP Proxy. I can point out the highest-risk servers to protect first.`
    : 'All visible MCP servers are protected behind the gateway. I can explain what controls the proxy is enforcing.';
}

function guardianChips(wsTab: WTab, selectedAgent: CryptoAsset | null) {
  if (wsTab === 'agents') {
    return selectedAgent
      ? ['show findings', 'create ticket', 'rotate credential', 'right-size']
      : ['how to use this', 'what is crs', 'show critical agents'];
  }
  if (wsTab === 'hitl') return ['show pending', 'summarize critical', 'approve safe', 'slack approvers'];
  return ['show unsanctioned', 'protect all', 'explain gateway', 'reduce blast radius'];
}

function RiskGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const stroke = ringTone(score);

  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-card px-3 py-4">
      <svg width="112" height="112" viewBox="0 0 112 112" className="overflow-visible">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          transform="rotate(-90 56 56)"
        />
        <text x="56" y="52" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="24" fontWeight="700">
          {score}
        </text>
        <text x="56" y="68" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
          CRS
        </text>
      </svg>
      <p className="mt-2 text-xs font-semibold text-foreground">Credential CRS</p>
      <p className="text-[10px] text-muted-foreground">Crypto Risk Score</p>
    </div>
  );
}

function CsrExplanationPanel({ asset }: { asset: CryptoAsset }) {
  const score = computeCRS(asset).crs;
  const factors = getCrsFactors(asset);

  return (
    <div className="animate-in slide-in-from-top-2 border-b border-border bg-card px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold text-foreground">Why CRS {score}?</h3>
        <p className="text-[10px] text-muted-foreground">{crsSummary(score)}</p>
      </div>
      <div className="mt-2 space-y-2">
        {factors.map(factor => (
          <div key={factor.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
              <span className="font-medium text-foreground">{factorLabel(factor.id)}</span>
              <span className="text-muted-foreground">{factor.raw}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`${factorBarCls(factor.raw)} h-full rounded-full`} style={{ width: `${factor.raw}%` }} />
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">{factor.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceAccessGraphTimeline({ agent, compact = false }: { agent: CryptoAsset; compact?: boolean }) {
  return (
    <div
      className="workspace-access-graph"
      style={{
        ['--ws-graph-idle-opacity' as string]: 1,
      }}
    >
      <style>{`
        .workspace-access-graph svg g[opacity="0.6"] {
          opacity: var(--ws-graph-idle-opacity) !important;
        }

        .workspace-access-graph svg rect[x="112"][width="256"][height="72"] {
          display: none;
        }

        .workspace-access-graph svg rect[x="112"][width="256"][height="72"] ~ text {
          display: none;
        }
      `}</style>
      <AccessGraphTimeline agent={agent} events={getAgentTimelineEvents(agent)} compact={compact} />
    </div>
  );
}

function SidePanelAccessGraphTab({ agent }: { agent: CryptoAsset }) {
  const events = useMemo(() => getAgentTimelineEvents(agent), [agent]);
  const [activeEventIndex, setActiveEventIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const activeEventRef = useRef<HTMLButtonElement | null>(null);

  const severityDot = (severity: 'info' | 'warn' | 'alert') => {
    if (severity === 'alert') return 'bg-coral';
    if (severity === 'warn') return 'bg-amber';
    return 'bg-teal';
  };

  const severityText = (severity: 'info' | 'warn' | 'alert', active: boolean) => {
    if (!active) return 'text-foreground';
    if (severity === 'alert') return 'text-coral';
    if (severity === 'warn') return 'text-amber';
    return 'text-teal';
  };

  const severityStroke = (severity: 'info' | 'warn' | 'alert') => {
    if (severity === 'alert') return 'hsl(var(--coral))';
    if (severity === 'warn') return 'hsl(var(--amber))';
    return 'hsl(var(--teal))';
  };

  const serviceEmoji = (service: string) => {
    const s = service.toLowerCase();
    if (/openai|bedrock|vertex|claude/.test(s)) return '⚡';
    if (/s3|storage|bigquery|snowflake/.test(s)) return '🗄';
    if (/github|gitlab/.test(s)) return '🔀';
    if (/slack|teams|pagerduty/.test(s)) return '💬';
    if (/active directory|workday/.test(s)) return '👥';
    if (/firewall|crowdstrike|splunk/.test(s)) return '🛡';
    if (/vault|secret/.test(s)) return '🔒';
    return '🔗';
  };

  useEffect(() => {
    setActiveEventIndex(-1);
    setPlaying(false);
  }, [agent.id]);

  useEffect(() => {
    if (!playing || events.length === 0) return;
    const interval = window.setInterval(() => {
      setActiveEventIndex(prev => {
        if (prev + 1 >= events.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800 / speed);
    return () => window.clearInterval(interval);
  }, [events.length, playing, speed]);

  useEffect(() => {
    activeEventRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeEventIndex]);

  const progress = events.length ? ((activeEventIndex + 1) / events.length) * 100 : 0;
  const currentEvent = activeEventIndex >= 0 ? events[activeEventIndex] : null;
  const visitedNodes = useMemo(() => new Set(events.slice(0, Math.max(activeEventIndex, 0)).map(event => event.targetNode)), [activeEventIndex, events]);
  const visitedEdges = useMemo(() => new Set(events.slice(0, Math.max(activeEventIndex, 0)).map(event => {
    if (event.targetNode === 'owner') return 'owner-agent';
    if (event.targetNode === 'subagent-1') return 'agent-subagent-1';
    if (event.targetNode === 'subagent-2') return 'agent-subagent-2';
    if (event.targetNode !== 'agent') return `agent-${event.targetNode}`;
    return '';
  }).filter(Boolean)), [activeEventIndex, events]);

  const activeEdge = useMemo(() => {
    if (!currentEvent) return null;
    if (currentEvent.targetNode === 'owner') return 'owner-agent';
    if (currentEvent.targetNode === 'subagent-1') return 'agent-subagent-1';
    if (currentEvent.targetNode === 'subagent-2') return 'agent-subagent-2';
    if (currentEvent.targetNode !== 'agent') return `agent-${currentEvent.targetNode}`;
    return null;
  }, [currentEvent]);

  const crs = computeCRS(agent).crs;
  const services = (agent.agentMeta?.servicesAccessed ?? []).slice(0, 5);
  const showSubAgents = ['Orchestrator', 'Autonomous Agent'].includes(agent.agentMeta?.agentType || '');
  const centerX = 250;
  const centerY = 170;
  const serviceRadius = 150;
  const graphHeight = 340;
  const graphWidth = 560;

  const serviceNodes = services.map((service, index, arr) => {
    const angle = (-55 + (arr.length === 1 ? 55 : (110 / Math.max(arr.length - 1, 1)) * index)) * (Math.PI / 180);
    return {
      id: service,
      x: centerX + serviceRadius * Math.cos(angle),
      y: centerY + serviceRadius * Math.sin(angle),
      r: 18,
      sensitive: SENSITIVE_SERVICES.some(term => service.includes(term)),
      label: truncate(service, 14),
    };
  });

  const nodes = [
    { id: 'owner', x: 76, y: centerY, r: 22, label: truncate(agent.owner, 18), kind: 'owner' as const },
    { id: 'agent', x: centerX, y: centerY, r: 36, label: agent.name, kind: 'agent' as const },
    ...(showSubAgents ? [
      { id: 'subagent-1', x: 200, y: 70, r: 15, label: 'sub-agent', kind: 'subagent' as const },
      { id: 'subagent-2', x: 300, y: 66, r: 15, label: 'sub-agent', kind: 'subagent' as const },
    ] : []),
    ...serviceNodes.map(node => ({ ...node, kind: 'service' as const })),
  ];

  const graphNodeState = (nodeId: string) => {
    if (currentEvent?.targetNode === nodeId) return 'active';
    if (visitedNodes.has(nodeId)) return 'visited';
    return 'idle';
  };

  const renderEdge = (id: string, x1: number, y1: number, x2: number, y2: number) => {
    const active = activeEdge === id;
    const visited = visitedEdges.has(id);
    const stroke = active && currentEvent ? severityStroke(currentEvent.severity) : visited ? 'hsl(var(--muted-foreground))' : 'hsl(var(--border))';
    return (
      <line
        key={id}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={active ? 2 : visited ? 1 : 1}
        strokeOpacity={active ? 0.95 : visited ? 0.45 : 0.3}
        strokeDasharray={active ? '6 3' : visited ? '4 3' : '3 0'}
      >
        {active && <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />}
      </line>
    );
  };

  const play = () => {
    if (activeEventIndex === -1 || activeEventIndex >= events.length - 1) {
      setActiveEventIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying(true);
  };

  const replay = () => {
    setActiveEventIndex(-1);
    setPlaying(false);
    window.setTimeout(() => {
      setActiveEventIndex(0);
      setPlaying(true);
    }, 100);
  };

  return (
    <div className="flex h-full min-h-0 flex-row overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-secondary/20 p-3">
          <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="h-full w-full rounded-lg">
            {renderEdge('owner-agent', 76, centerY, centerX, centerY)}
            {showSubAgents && (
              <>
                {renderEdge('agent-subagent-1', centerX, centerY, 200, 70)}
                {renderEdge('agent-subagent-2', centerX, centerY, 300, 66)}
              </>
            )}
            {serviceNodes.map(node => renderEdge(`agent-${node.id}`, centerX, centerY, node.x, node.y))}

            {nodes.map(node => {
              const state = activeEventIndex === -1 ? 'idle' : graphNodeState(node.id);
              const eventSeverity = currentEvent?.targetNode === node.id ? currentEvent.severity : 'info';
              const glow = severityStroke(eventSeverity);
              const baseOpacity = state === 'idle' ? 1 : state === 'visited' ? 0.85 : 1;
              const strokeWidth = state === 'active' ? 4 : node.kind === 'agent' ? 3 : 2;
              const sensitive = node.kind === 'service' && 'sensitive' in node && node.sensitive;
              const fill = node.kind === 'owner'
                ? 'hsl(var(--amber) / 0.15)'
                : node.kind === 'agent'
                  ? crs >= 80
                    ? 'hsl(var(--coral) / 0.15)'
                    : crs >= 60
                      ? 'hsl(var(--amber) / 0.15)'
                      : 'hsl(var(--teal) / 0.10)'
                  : node.kind === 'subagent'
                    ? 'hsl(var(--purple) / 0.15)'
                    : sensitive
                      ? 'hsl(var(--coral) / 0.15)'
                      : 'hsl(var(--primary) / 0.12)';
              const stroke = state === 'active'
                ? glow
                : node.kind === 'owner'
                  ? 'hsl(var(--amber))'
                  : node.kind === 'agent'
                    ? crs >= 80
                      ? 'hsl(var(--coral))'
                      : crs >= 60
                        ? 'hsl(var(--amber))'
                        : 'hsl(var(--teal))'
                    : node.kind === 'subagent'
                      ? 'hsl(var(--purple))'
                      : sensitive
                        ? 'hsl(var(--coral))'
                        : 'hsl(var(--primary))';

              return (
                <g key={node.id} opacity={baseOpacity} style={state === 'active' ? { filter: `drop-shadow(0 0 10px ${glow})` } : undefined}>
                  {state === 'active' && (
                    <circle cx={node.x} cy={node.y} r={node.r + 8} fill="none" stroke={glow} strokeWidth="2" className="animate-ping" opacity="0.7" />
                  )}
                  <circle cx={node.x} cy={node.y} r={node.r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                  {node.kind === 'agent' && <circle cx={node.x} cy={node.y} r={30} fill="hsl(220 20% 15%)" />}
                  <text x={node.x} y={node.y + (node.kind === 'agent' ? 5 : 3)} textAnchor="middle" fontSize={node.kind === 'agent' ? 18 : node.kind === 'service' ? 11 : 12}>
                    {node.kind === 'owner' ? '👤' : node.kind === 'service' ? serviceEmoji(node.id) : '🤖'}
                  </text>
                  {node.kind === 'agent' && (
                    <>
                      <rect x={node.x - 23} y={node.y + 38} rx="6" ry="6" width="46" height="16" fill={crs >= 80 ? 'hsl(var(--coral) / 0.2)' : crs >= 60 ? 'hsl(var(--amber) / 0.2)' : 'hsl(var(--teal) / 0.2)'} />
                      <text x={node.x} y={node.y + 49} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8">CRS {crs}</text>
                    </>
                  )}
                  {node.kind === 'service' && sensitive && <text x={node.x + 11} y={node.y - 10} fontSize="10">⚠</text>}
                  {state === 'visited' && <circle cx={node.x + node.r - 2} cy={node.y - node.r + 4} r="3.5" fill={stroke} />}
                  <text x={node.x} y={node.y + node.r + 12} textAnchor="middle" fill={node.kind === 'subagent' ? 'hsl(var(--purple))' : 'hsl(var(--muted-foreground))'} fontSize="7">
                    {node.kind === 'owner' ? 'owner' : node.kind === 'subagent' ? 'sub-agent' : truncate(node.label, node.kind === 'agent' ? 18 : 14)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex justify-center pt-3">
          <button
            type="button"
            onClick={play}
            className="rounded-md border border-teal/20 bg-teal/10 px-3 py-1.5 text-[10px] font-medium text-teal hover:bg-teal/20"
          >
            Play audit replay
          </button>
        </div>
      </div>

      <div className="flex w-64 flex-shrink-0 flex-col border-l border-border">
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (playing) setPlaying(false);
                else if (activeEventIndex >= events.length - 1) replay();
                else play();
              }}
              className="rounded-md border border-teal/20 bg-teal/10 px-2 py-1 text-[10px] font-medium text-teal hover:bg-teal/20"
            >
              {playing ? '⏸ Pause' : activeEventIndex >= events.length - 1 && events.length > 0 ? '↺ Replay' : activeEventIndex > -1 ? '▶ Resume' : '▶ Play'}
            </button>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {[0.5, 1, 2].map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setSpeed(value as 0.5 | 1 | 2)}
                className={`${speed === value ? 'text-teal' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {value}×
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] text-muted-foreground">{Math.max(activeEventIndex + 1, 0)} / {events.length}</span>
        </div>
        <div className="h-1 flex-shrink-0 overflow-hidden bg-muted">
          <div className="h-full bg-teal transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {events.map((event, index) => {
            const active = index === activeEventIndex;
            const past = index < activeEventIndex;
            const future = index > activeEventIndex;
            return (
              <button
                key={event.id}
                ref={active ? activeEventRef : null}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setActiveEventIndex(index);
                }}
                className={`-mx-1.5 block w-[calc(100%+0.75rem)] rounded px-1.5 py-1.5 text-left ${active ? 'bg-muted/30' : ''} ${past ? 'opacity-60' : future ? 'opacity-25' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severityDot(event.severity)}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium ${severityText(event.severity, active)}`}>{event.label}</span>
                      <span className="text-[9px] text-muted-foreground">{event.time}</span>
                    </div>
                    <p className="truncate text-[9px] text-muted-foreground">{event.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EosGuardianFloat({
  wsTab,
  selectedAgent,
  pendingHITL,
  unsanctionedMCP,
}: {
  wsTab: WTab;
  selectedAgent: CryptoAsset | null;
  pendingHITL: number;
  unsanctionedMCP: number;
}) {
  const [minimised, setMinimised] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(window.innerWidth - 360, 24) : 24,
    y: typeof window !== 'undefined' ? Math.max(window.innerHeight - 500, 24) : 24,
  }));
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    setMsgs([{ role: 'guardian', text: buildGuardianInitialMsg(wsTab, selectedAgent, pendingHITL, unsanctionedMCP) }]);
    setInput('');
  }, [wsTab, selectedAgent, pendingHITL, unsanctionedMCP]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };

    const onUp = () => setDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, dragOffset]);

  const urgencyDotCls = wsTab === 'agents'
    ? selectedAgent
      ? computeCRS(selectedAgent).crs >= 80
        ? 'bg-coral'
        : computeCRS(selectedAgent).crs >= 60
          ? 'bg-amber'
          : 'bg-teal'
      : 'bg-muted-foreground'
    : wsTab === 'hitl'
      ? pendingHITL > 0
        ? 'bg-amber'
        : 'bg-teal'
      : unsanctionedMCP > 0
        ? 'bg-coral'
        : 'bg-teal';

  const contextLabel = wsTab === 'agents'
    ? selectedAgent
      ? truncate(selectedAgent.name, 22)
      : 'No agent selected'
    : wsTab === 'hitl'
      ? 'HITL Queue'
      : 'MCP Gateway';

  const send = (rawInput?: string) => {
    const raw = (rawInput ?? input).trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    let reply = 'I can help summarise posture, highlight risk, or suggest the next remediation step.';

    if (wsTab === 'agents') {
      if (!selectedAgent) {
        if (lower === 'show critical agents') {
          reply = `Top critical agents: ${AI_AGENTS.slice(0, 3).map(agent => `${agent.name} (CRS ${agent.crs})`).join(', ')}.`;
        } else if (lower === 'what is crs') {
          reply = 'CRS is the Crypto Risk Score for the credential itself. It weighs encryption strength, lifecycle, exposure, access, and audit readiness.';
        } else {
          reply = 'Select an agent first and I’ll explain its credential risk, findings, and remediation path.';
        }
      } else {
        const score = computeCRS(selectedAgent).crs;
        const topFactor = [...getCrsFactors(selectedAgent)].sort((a, b) => b.raw - a.raw)[0];
        const writePerms = (selectedAgent.agentMeta?.permissions || []).filter(p => /write|put|create|modify|disable/i.test(p));
        if (lower === 'create ticket') {
          reply = `Creating ticket for ${selectedAgent.name}... Ticket TKT-${Math.floor(1000 + Math.random() * 9000)} created and assigned to ${selectedAgent.owner}.`;
        } else if (lower === 'rotate credential') {
          reply = `Rotating credential for ${selectedAgent.name}. New short-lived token issued with ${selectedAgent.rotationFrequency} TTL. Hot-swap complete — no service interruption.`;
        } else if (lower === 'right-size') {
          reply = selectedAgent.agentMeta?.permissionRisk === 'Over-privileged'
            ? `Analysing permissions for ${selectedAgent.name}... Found ${writePerms.length} write-scope permissions that may be unused. Recommend removing: ${writePerms.slice(0, 2).join(', ') || 'excess write scopes'}.`
            : `Permissions appear right-sized for ${selectedAgent.name}.`;
        } else if (lower === 'show findings') {
          reply = buildFindings(selectedAgent).map(finding => `• ${finding.title} — ${finding.detail}`).join('\n');
        } else {
          reply = `Analysing ${selectedAgent.name}... Based on CRS ${score}/100, I recommend addressing ${topFactor.label} first. Should I create a ticket?`;
        }
      }
    } else if (wsTab === 'hitl') {
      if (lower === 'show pending') {
        const pending = HITL_QUEUE.filter(item => item.status === 'Pending').map(item => `${item.agent}: ${item.action}`).join('; ');
        reply = pending ? `Pending approvals: ${pending}.` : 'No pending HITL requests right now.';
      } else if (lower === 'summarize critical') {
        const critical = HITL_QUEUE.filter(item => item.severity === 'Critical' || item.severity === 'High')
          .map(item => `${item.agent} — ${item.reason}`)
          .join('\n');
        reply = critical || 'No critical HITL items are currently open.';
      } else if (lower === 'approve safe') {
        reply = 'I would auto-approve only low-risk requests that match declared agent intent. The visible queue still needs human review because each request crosses a privilege, code, or identity boundary.';
      } else if (lower === 'slack approvers') {
        reply = 'Approver notifications can be pushed to Slack with ticket context, agent intent, requested action, and the policy reason for the hold.';
      } else {
        reply = pendingHITL > 0
          ? `${pendingHITL} approval request${pendingHITL === 1 ? '' : 's'} still need human review. I can prioritise them by blast radius or business impact.`
          : 'The queue is clear. I can summarise recently denied and approved requests if useful.';
      }
    } else {
      if (lower === 'show unsanctioned') {
        const list = MCP_SERVERS.filter(server => !server.protected).map(server => `${server.name} (${server.agent})`).join(', ');
        reply = list ? `Unsanctioned MCP servers: ${list}.` : 'All listed MCP servers are already behind the gateway.';
      } else if (lower === 'protect all') {
        reply = unsanctionedMCP > 0
          ? `Priority order: protect the unsanctioned file and cloud access servers first, then standardise auth through the Eos MCP Proxy for all remaining endpoints.`
          : 'Everything visible is already protected behind the gateway.';
      } else if (lower === 'explain gateway') {
        reply = 'The Eos MCP Proxy issues short-lived scoped credentials at runtime, centralises policy enforcement, and removes long-lived static secrets from MCP servers.';
      } else if (lower === 'reduce blast radius') {
        reply = 'Reduce blast radius by proxying unsanctioned servers first, scoping credentials per tool invocation, and revoking broad reusable tokens.';
      } else {
        reply = unsanctionedMCP > 0
          ? `${unsanctionedMCP} MCP server${unsanctionedMCP === 1 ? '' : 's'} still need gateway protection. I’d start with the ones exposing file access or cloud data paths.`
          : 'Gateway coverage looks good. I can still explain how just-in-time credentials are being enforced.';
      }
    }

    setMsgs(prev => [...prev, { role: 'user', text: raw }, { role: 'guardian', text: reply }]);
    setInput('');
  };

  if (minimised) {
    return (
      <button
        type="button"
        onClick={() => setMinimised(false)}
        className="fixed z-[60] flex h-9 w-44 items-center gap-2 rounded-full border border-teal/30 bg-card px-3 shadow-lg"
        style={{ left: pos.x, top: pos.y, position: 'fixed' }}
      >
        <Zap className="h-3.5 w-3.5 text-teal" />
        <span className="text-xs font-medium text-foreground">Eos Guardian</span>
        <span className={`ml-auto h-2 w-2 rounded-full ${urgencyDotCls}`} />
      </button>
    );
  }

  return (
    <div
      className="fixed z-[60] flex w-80 flex-col rounded-xl border border-border bg-card shadow-2xl"
      style={{ left: pos.x, top: pos.y, position: 'fixed' }}
    >
      <div
        className="flex cursor-move select-none items-center gap-2 border-b border-border px-3 py-2.5"
        onMouseDown={e => {
          setDragging(true);
          setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
        }}
      >
        <Zap className="h-4 w-4 text-teal" />
        <span className="text-xs font-semibold text-foreground">Eos Guardian</span>
        <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-[9px] text-teal">AI</span>
        <span className="ml-auto max-w-[108px] truncate text-[9px] text-muted-foreground">{contextLabel}</span>
        <button
          type="button"
          aria-label="Minimise"
          onClick={e => {
            e.stopPropagation();
            setMinimised(true);
          }}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      <div className="h-56 space-y-2.5 overflow-y-auto p-3">
        {msgs.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={msg.role === 'guardian'
              ? 'rounded-lg border border-teal/20 bg-teal/10 px-3 py-2 text-[10px] whitespace-pre-wrap text-foreground'
              : 'ml-auto max-w-[90%] rounded-lg bg-teal px-3 py-2 text-[10px] text-primary-foreground'}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-t border-border/50 px-3 py-1.5">
        {guardianChips(wsTab, selectedAgent).map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => send(chip)}
            className="rounded-full border border-teal/20 bg-teal/10 px-2 py-0.5 text-[9px] text-teal"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-3 pb-3 pt-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          placeholder="Ask Eos Guardian..."
        />
        <button type="button" onClick={() => send()} className="rounded-lg bg-teal p-1.5 text-primary-foreground">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AgentSidePanel({ agent, onClose }: { agent: CryptoAsset; onClose: () => void }) {
  const { setCurrentPage, setFilters } = useNav();
  const [showCrsPanel, setShowCrsPanel] = useState(false);
  const [rightTab, setRightTab] = useState<'graph' | 'credentials'>('graph');
  const score = computeCRS(agent).crs;
  const itAsset = mockITAssets.find(asset => asset.cryptoObjectIds.includes(agent.id));
  const arsScore = itAsset ? arsFor(itAsset).ars : null;
  const findings = buildFindings(agent);
  const credentials = buildCredentials(agent);
  const services = agent.agentMeta?.servicesAccessed || [];

  useEffect(() => {
    setShowCrsPanel(false);
    setRightTab('graph');
  }, [agent.id]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-1/5 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex h-full w-4/5 flex-col border-l border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="flex items-start gap-3 px-5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-base">🤖</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">{agent.name}</h2>
                <button
                  type="button"
                  onClick={() => setShowCrsPanel(prev => !prev)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${crsBgCls(score)}`}
                >
                  CRS {score}
                  {showCrsPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                <span>{agent.agentMeta?.framework || 'Unknown framework'}</span>
                <span>·</span>
                <span>{agent.agentMeta?.agentType || 'Unknown type'}</span>
                <span>·</span>
                <span>{agent.owner}</span>
                <span>·</span>
                <span>{agent.agentMeta?.actionsPerDay?.toLocaleString() || '0'} actions/day</span>
                <span>·</span>
                <span className={statusCls(agent.status)}>{agent.status}</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {showCrsPanel && <CsrExplanationPanel asset={agent} />}
        </div>

        <div className="grid flex-1 grid-cols-[40%_60%] overflow-hidden">
          <div className="scrollbar-thin space-y-4 overflow-y-auto border-r border-border p-4">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
              <span className="text-muted-foreground">Agent Type</span><span className="text-foreground">{agent.agentMeta?.agentType || '—'}</span>
              <span className="text-muted-foreground">Framework</span><span className="text-foreground">{agent.agentMeta?.framework || '—'}</span>
              <span className="text-muted-foreground">Owner</span><span className="text-foreground">{agent.owner}</span>
              <span className="text-muted-foreground">Team</span><span className="text-foreground">{agent.team}</span>
              <span className="text-muted-foreground">Platform</span><span className="text-foreground">{agent.infrastructure}</span>
              <span className="text-muted-foreground">Status</span><span className={statusCls(agent.status)}>{agent.status}</span>
              <span className="text-muted-foreground">Token Issued</span><span className="text-foreground">{agent.issueDate}</span>
              <span className="text-muted-foreground">Token Expires</span><span className="text-foreground">{agent.expiryDate}</span>
              <span className="text-muted-foreground">Last Activity</span><span className="text-foreground">{agent.agentMeta?.lastActivity || '—'}</span>
              <span className="text-muted-foreground">Actions/Day</span><span className="text-foreground">{agent.agentMeta?.actionsPerDay?.toLocaleString() || '0'}</span>
              <span className="text-muted-foreground">Auto-Renewal</span><span className="text-foreground">{agent.autoRenewal ? 'Enabled' : 'Disabled'}</span>
              <span className="text-muted-foreground">Rotation</span><span className="text-foreground">{agent.rotationFrequency}</span>
              <span className="text-muted-foreground">Policy Violations</span><span className={agent.policyViolations > 0 ? 'text-amber' : 'text-foreground'}>{agent.policyViolations}</span>
              <span className="text-muted-foreground">Discovery</span><span className="text-foreground">{agent.discoverySource}</span>
            </div>

            <RiskGauge score={score} />

            <div className="border-t border-border pt-3">
              {itAsset && arsScore !== null ? (
                <>
                  <div className={`text-sm font-semibold ${crsCls(arsScore)}`}>Agent ARS: {arsScore}</div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Asset Risk Score — rolls up from credential CRS</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">{itAsset.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ tab: 'it-assets' });
                      setCurrentPage('inventory');
                    }}
                    className="mt-1 text-[10px] text-teal"
                  >
                    View host →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground">Host not in managed inventory</p>
                  <p className="mt-1 text-[10px] text-foreground">{agent.infrastructure}</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Findings</h3>
              {findings.map((finding, index) => (
                <div key={`${finding.title}-${index}`} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${severityBadgeCls(finding.severity)}`}>{finding.severity}</span>
                    <span className="text-[10px] font-medium text-foreground">{finding.title}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{finding.detail}</p>
                  <button type="button" onClick={() => toast.success(`${finding.action} initiated for ${agent.name}`)} className="mt-2 text-[10px] text-teal">
                    {finding.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex border-b border-border">
              {[
                { id: 'graph', label: 'Access Graph' },
                { id: 'credentials', label: 'Credentials & Services' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRightTab(tab.id as 'graph' | 'credentials')}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${rightTab === tab.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {rightTab === 'graph' ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <SidePanelAccessGraphTab agent={agent} />
              </div>
            ) : (
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-foreground">Agent Credentials</h3>
                  <p className="text-[9px] text-muted-foreground">Cryptographic objects — CRS applies</p>
                  <div className="mt-2 space-y-2">
                    {credentials.map(credential => (
                      <div key={credential.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-[10px] text-foreground">{credential.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-foreground">{credential.algorithm}</span>
                              <span className="text-[9px] text-muted-foreground">{credential.type}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${crsBgCls(credential.crs)}`}>CRS {credential.crs}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-foreground">Connected Services ({services.length})</h3>
                  <div className="mt-2 space-y-1.5">
                    {services.map(service => {
                      const sensitive = SENSITIVE_SERVICES.some(term => service.includes(term));
                      return (
                        <div key={service} className="flex items-center gap-2 text-[10px]">
                          <span className={`h-2 w-2 rounded-full ${sensitive ? 'bg-coral' : 'bg-primary'}`} />
                          <span className="text-foreground">{service}</span>
                          {sensitive && <span className="text-coral">⚠</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIAgentRemediationWorkspace() {
  const { setCurrentPage, setFilters } = useNav();
  const [wsTab, setWsTab] = useState<WTab>('agents');
  const [selectedAgent, setSelectedAgent] = useState<CryptoAsset | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hitlItems, setHitlItems] = useState(HITL_QUEUE);
  const [mcpServers, setMcpServers] = useState(MCP_SERVERS);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'crs' | 'name' | 'status'>('crs');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const pendingHITL = hitlItems.filter(h => h.status === 'Pending').length;
  const unsanctionedMCP = mcpServers.filter(m => !m.protected).length;

  const filteredAgents = useMemo(() => (
    AI_AGENTS
      .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.agentMeta?.framework || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortCol === 'crs') return sortDir === 'desc' ? b.crs - a.crs : a.crs - b.crs;
        if (sortCol === 'name') return sortDir === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
        if (sortCol === 'status') return sortDir === 'desc' ? b.status.localeCompare(a.status) : a.status.localeCompare(b.status);
        return 0;
      })
  ), [search, sortCol, sortDir]);

  const toggleSort = (col: 'crs' | 'name' | 'status') => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortCol(col);
    setSortDir(col === 'crs' ? 'desc' : 'asc');
  };

  const sortIndicator = (col: 'crs' | 'name' | 'status') => {
    if (sortCol !== col) return <span className="text-muted-foreground">↕</span>;
    return <span className="text-teal">{sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  const handleRowAction = (agent: CryptoAsset & { crs: number }, action: string) => {
    setOpenActionMenuId(null);
    if (action === 'Create Ticket') {
      const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      toast.success(`Ticket ${ticketId} created`);
      return;
    }
    if (action === 'View in Violations') {
      setFilters({ type: 'AI Agent Token', search: agent.name });
      setCurrentPage('violations');
      return;
    }
    toast.success(`${action} initiated for ${agent.name}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center border-b border-border bg-card px-6">
        {[
          { id: 'agents', label: 'AI Agents' },
          { id: 'hitl', label: 'HITL Approval' },
          { id: 'mcp', label: 'MCP Gateway' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setWsTab(tab.id as WTab)}
            className={`relative border-b-2 px-4 py-3 text-sm font-medium transition-colors ${wsTab === tab.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              {tab.id === 'hitl' && pendingHITL > 0 && (
                <span className="rounded-full bg-amber/10 px-1.5 py-0.5 text-[9px] text-amber">{pendingHITL}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {wsTab === 'agents' && (
          <div className="flex h-full flex-col">
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-6 py-3">
              <h2 className="text-sm font-semibold text-foreground">AI Agents</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{AI_AGENTS.length} agents</span>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full rounded-md border border-border bg-muted/50 py-1.5 pl-7 pr-3 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                <button type="button" onClick={() => toggleSort('name')} className="rounded-md border border-border px-2 py-1 hover:bg-muted/30">Name {sortIndicator('name')}</button>
                <button type="button" onClick={() => toggleSort('crs')} className="rounded-md border border-border px-2 py-1 hover:bg-muted/30">CRS {sortIndicator('crs')}</button>
                <button type="button" onClick={() => toggleSort('status')} className="rounded-md border border-border px-2 py-1 hover:bg-muted/30">Status {sortIndicator('status')}</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="mx-6 my-4 overflow-hidden rounded-lg border border-border bg-card">
                {openActionMenuId && <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenActionMenuId(null)} />}
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agent</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Framework</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">CRS ↓</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions/Day</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Active</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map(agent => (
                      <tr
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgent(agent);
                          setPanelOpen(true);
                        }}
                        className="cursor-pointer border-b border-border hover:bg-muted/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🤖</span>
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-medium text-foreground">{agent.name}</p>
                              <p className="text-[10px] text-muted-foreground">{agent.agentMeta?.agentType || 'Unknown type'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-foreground">{agent.agentMeta?.framework || '—'}</td>
                        <td className="px-4 py-3 text-[10px] text-foreground">{agent.owner}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${crsBgCls(agent.crs)}`}>CRS {agent.crs}</span>
                        </td>
                        <td className={`px-4 py-3 text-center text-[10px] ${statusCls(agent.status)}`}>{agent.status}</td>
                        <td className="px-4 py-3 text-right text-[10px] text-foreground">{agent.agentMeta?.actionsPerDay?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 text-[10px] text-foreground">{agent.agentMeta?.lastActivity || '—'}</td>
                        <td className="relative z-20 px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setOpenActionMenuId(prev => prev === agent.id ? null : agent.id);
                            }}
                            className="rounded p-1.5 hover:bg-muted/50"
                            aria-label="Open actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          {openActionMenuId === agent.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-xl">
                              {[
                                'Rotate Token',
                                'Right-size Permissions',
                                'Place behind MCP Gateway',
                                'Create Ticket',
                                'View in Violations',
                              ].map(action => (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleRowAction(agent, action);
                                  }}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-foreground hover:bg-muted/30"
                                >
                                  <span>{action}</span>
                                </button>
                              ))}
                              <div className="my-1 border-t border-border" />
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRowAction(agent, 'Revoke Access');
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-coral hover:bg-muted/30"
                              >
                                <span>Revoke Access</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredAgents.length === 0 && (
                  <div className="flex items-center justify-center px-6 py-10 text-sm text-muted-foreground">
                    No AI agents match your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {wsTab === 'hitl' && (
          <div className="h-full overflow-y-auto p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Human-in-the-Loop Approval</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">High-risk AI agent actions requiring human approval before execution. Requests come from any agent in your environment.</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pendingHITL > 0 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal'}`}>
                {pendingHITL > 0 ? `${pendingHITL} pending` : 'All clear'}
              </span>
            </div>

            <div className="space-y-3">
              {hitlItems.map(item => {
                const stateCls = item.status === 'Pending' ? 'border-amber/30 bg-amber/5' : item.status === 'Denied' ? 'border-coral/20 bg-coral/5 opacity-60' : 'border-teal/20 bg-teal/5 opacity-60';
                return (
                  <div key={item.id} className={`rounded-lg border p-4 ${stateCls}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${severityBadgeCls(item.severity)}`}>{item.severity}</span>
                          <span className="text-[10px] font-medium text-foreground">{item.agent}</span>
                          <span className="text-[9px] text-muted-foreground">{item.time}</span>
                        </div>
                        <div className="mt-2 inline-flex rounded bg-muted/40 px-2 py-1 font-mono text-[10px] text-foreground">{item.action}</div>
                        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{item.reason}</p>
                      </div>
                      {item.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHitlItems(prev => prev.map(hitl => hitl.id === item.id ? { ...hitl, status: 'Approved' } : hitl));
                              toast.success(`Approved ${item.agent}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-teal px-2.5 py-1.5 text-[10px] text-primary-foreground"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHitlItems(prev => prev.map(hitl => hitl.id === item.id ? { ...hitl, status: 'Denied' } : hitl));
                              toast.error(`Denied ${item.agent}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-coral px-2.5 py-1.5 text-[10px] text-primary-foreground"
                          >
                            <X className="h-3 w-3" /> Deny
                          </button>
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1 text-[10px] ${item.status === 'Approved' ? 'text-teal' : 'text-coral'}`}>
                          <CheckCircle2 className="h-3 w-3" /> {item.status}
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
          <div className="h-full overflow-y-auto p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">MCP Gateway</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">All MCP servers across your environment. Place unsanctioned servers behind the Eos MCP Proxy to enforce just-in-time credential issuance.</p>
              <div className="mt-3 rounded-lg border border-teal/20 bg-teal/5 px-4 py-2.5 text-sm text-foreground">✦ The Eos MCP Proxy issues short-lived, scoped credentials at runtime — eliminating static API keys and reducing blast radius if a server is compromised.</div>
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
                      <button
                        type="button"
                        onClick={() => {
                          setMcpServers(prev => prev.map(item => item.id === server.id ? { ...item, protected: true, status: 'Approved' } : item));
                          toast.success('MCP server placed behind Eos Gateway — JIT credential issuance active');
                        }}
                        className="rounded-md bg-teal px-3 py-1.5 text-[10px] text-primary-foreground"
                      >
                        Protect
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-[10px] text-teal">
                        <CheckCircle2 className="h-3 w-3" /> Behind Gateway
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {panelOpen && selectedAgent && (
        <AgentSidePanel
          agent={selectedAgent}
          onClose={() => {
            setPanelOpen(false);
            setSelectedAgent(null);
          }}
        />
      )}

      <EosGuardianFloat
        wsTab={wsTab}
        selectedAgent={selectedAgent}
        pendingHITL={pendingHITL}
        unsanctionedMCP={unsanctionedMCP}
      />
    </div>
  );
}
