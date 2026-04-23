import React, { useEffect, useMemo, useState } from 'react';
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
  const score = computeCRS(agent).crs;
  const itAsset = mockITAssets.find(asset => asset.cryptoObjectIds.includes(agent.id));
  const arsScore = itAsset ? arsFor(itAsset).ars : null;
  const findings = buildFindings(agent);
  const credentials = buildCredentials(agent);
  const services = agent.agentMeta?.servicesAccessed || [];

  useEffect(() => {
    setShowCrsPanel(false);
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

          <div className="scrollbar-thin overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-foreground">Access Graph</h3>
            <p className="mb-3 text-[10px] text-muted-foreground">Visual audit trail — press Play to replay activity on the graph</p>
            <WorkspaceAccessGraphTimeline agent={agent} compact />

            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-xs font-semibold text-foreground">Agent Credentials</h3>
              <p className="text-[9px] text-muted-foreground">Cryptographic objects — CRS applies</p>
              <div className="mt-2 space-y-2">
                {credentials.map(credential => (
                  <div key={credential.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm">🔐</span>
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

            <div className="mt-3">
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
        </div>
      </div>
    </div>
  );
}

export default function AIAgentRemediationWorkspace() {
  const [wsTab, setWsTab] = useState<WTab>('agents');
  const [selectedAgent, setSelectedAgent] = useState<CryptoAsset | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hitlItems, setHitlItems] = useState(HITL_QUEUE);
  const [mcpServers, setMcpServers] = useState(MCP_SERVERS);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'crs' | 'name' | 'status'>('crs');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedAgent(agent);
                              setPanelOpen(true);
                            }}
                            className="text-[10px] text-teal"
                          >
                            View →
                          </button>
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
