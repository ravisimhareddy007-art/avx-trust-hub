import React, { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { type CryptoAsset } from '@/data/mockData';
import { computeCRS, getCrsFactors } from '@/lib/risk/crs';

export interface TimelineEvent {
  id: string;
  targetNode: 'owner' | 'agent' | 'subagent-1' | 'subagent-2' | string;
  eventType: 'registered' | 'connected' | 'spawned' | 'action' | 'alert' | 'blocked' | 'remediated' | 'expired';
  label: string;
  description: string;
  time: string;
  severity: 'info' | 'warn' | 'alert';
}

type AccessGraphTimelineProps = {
  agent: CryptoAsset;
  events: TimelineEvent[];
  compact?: boolean;
};

const SENSITIVE_SERVICES = ['Active Directory', 'Firewall', 'PII', 'CrowdStrike', 'HSM', 'Splunk'];

const crsLabel = (score: number) => score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low';

const severityStroke = (severity: TimelineEvent['severity']) => severity === 'alert'
  ? 'hsl(var(--coral))'
  : severity === 'warn'
    ? 'hsl(var(--amber))'
    : 'hsl(var(--teal))';

const severityDot = (severity: TimelineEvent['severity']) => severity === 'alert'
  ? 'bg-coral'
  : severity === 'warn'
    ? 'bg-amber'
    : 'bg-teal';

const severityText = (severity: TimelineEvent['severity']) => severity === 'alert'
  ? 'text-coral'
  : severity === 'warn'
    ? 'text-amber'
    : 'text-teal';

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

const truncate = (value: string, len = 14) => value.length > len ? `${value.slice(0, len - 1)}…` : value;

const wrapText = (value: string, charsPerLine: number, maxLines = 3) => {
  const words = value.split(' ');
  const lines: string[] = [];
  let current = '';

  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
};

const offsetTime = (base: string, hours: number) => {
  const parsed = new Date(base);
  if (!Number.isNaN(parsed.getTime())) {
    parsed.setHours(parsed.getHours() + hours);
    return parsed.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  return hours === 0 ? base : `${base} · +${hours}h`;
};

const matchingPermissions = (agent: CryptoAsset, service: string) => {
  const permissions = agent.agentMeta?.permissions ?? [];
  const parts = service.toLowerCase().split(/\s+|-/).filter(Boolean);
  const matches = permissions.filter(permission => {
    const lower = permission.toLowerCase();
    return parts.some(part => part.length > 2 && lower.includes(part));
  });
  return (matches.length ? matches : permissions).slice(0, 2);
};

export function getAgentTimelineEvents(agent: CryptoAsset): TimelineEvent[] {
  const services = (agent.agentMeta?.servicesAccessed ?? []).slice(0, 5);
  const events: TimelineEvent[] = [];
  const issueTime = agent.issueDate;

  events.push({
    id: `${agent.id}-registered`,
    targetNode: 'agent',
    eventType: 'registered',
    severity: 'info',
    label: 'Registered',
    description: `Agent ${agent.name} registered. Framework: ${agent.agentMeta?.framework || 'Unknown'}. Owner: ${agent.owner}.`,
    time: issueTime,
  });

  events.push({
    id: `${agent.id}-owner`,
    targetNode: 'owner',
    eventType: 'connected',
    severity: 'info',
    label: 'Owner assigned',
    description: `Owner assigned — ${agent.owner} (${agent.team}).`,
    time: issueTime,
  });

  services.forEach((service, index) => {
    const permissions = matchingPermissions(agent, service);
    const sensitive = SENSITIVE_SERVICES.some(term => service.includes(term));
    events.push({
      id: `${agent.id}-service-${index}`,
      targetNode: service,
      eventType: 'connected',
      severity: sensitive ? 'alert' : 'info',
      label: 'Connected',
      description: `Service connected — ${service}. Permissions: ${permissions.join(', ') || 'No permissions recorded'}.`,
      time: offsetTime(issueTime, index + 1),
    });
  });

  let offset = services.length + 1;

  if (['Orchestrator', 'Autonomous Agent'].includes(agent.agentMeta?.agentType || '')) {
    events.push({
      id: `${agent.id}-subagent-1`,
      targetNode: 'subagent-1',
      eventType: 'spawned',
      severity: 'warn',
      label: 'Spawned',
      description: 'Subagent spawned — cleanup-agent. Inherited parent credential scope.',
      time: offsetTime(issueTime, offset++),
    });
    events.push({
      id: `${agent.id}-subagent-2`,
      targetNode: 'subagent-2',
      eventType: 'spawned',
      severity: 'warn',
      label: 'Spawned',
      description: 'Subagent spawned — analysis-agent. Sub-scope of parent permissions.',
      time: offsetTime(issueTime, offset++),
    });
  }

  if (agent.agentMeta?.permissionRisk === 'Over-privileged') {
    const writePerm = (agent.agentMeta?.permissions ?? []).find(permission => /write|put|create|modify|disable/i.test(permission)) || 'write scope';
    const targetService = services.find(service => /s3|storage|bucket|blob|bigquery|snowflake/i.test(service)) || services[0] || 'agent';
    events.push({
      id: `${agent.id}-over-privileged`,
      targetNode: targetService,
      eventType: 'alert',
      severity: 'alert',
      label: 'Over-privileged',
      description: `Write permission ${writePerm} unused in last 30 days. Scope exceeds agent intent.`,
      time: offsetTime(issueTime, offset++),
    });
  }

  if (agent.policyViolations > 0) {
    events.push({
      id: `${agent.id}-policy`,
      targetNode: 'agent',
      eventType: 'alert',
      severity: 'alert',
      label: 'Policy violation',
      description: `${agent.policyViolations} policy violation(s) detected. CRS impact: access factor elevated.`,
      time: offsetTime(issueTime, offset++),
    });
  }

  if (agent.status === 'Expired' || agent.status === 'Expiring') {
    events.push({
      id: `${agent.id}-expiry`,
      targetNode: 'agent',
      eventType: 'expired',
      severity: 'alert',
      label: agent.status === 'Expired' ? 'Token expired' : `Expires in ${agent.daysToExpiry}d`,
      description: agent.status === 'Expired'
        ? `Token expired ${Math.abs(agent.daysToExpiry)} days ago. Agent may retain cached credentials. CRS lifecycle factor: 100.`
        : `Token expiring in ${agent.daysToExpiry} days. No auto-renewal configured. Immediate rotation recommended.`,
      time: offsetTime(issueTime, offset++),
    });
  }

  const crs = computeCRS(agent).crs;
  const topFactor = [...getCrsFactors(agent)].sort((a, b) => b.raw - a.raw)[0];
  const finalSeverity = agent.policyViolations > 0 || agent.status === 'Expired' ? 'alert' : 'info';
  events.push({
    id: `${agent.id}-crs`,
    targetNode: 'agent',
    eventType: finalSeverity === 'alert' ? 'alert' : 'action',
    severity: finalSeverity,
    label: 'CRS computed',
    description: `Credential CRS: ${crs}/100 — ${crsLabel(crs)}. Top factor: ${topFactor.label} (${topFactor.raw}/100).`,
    time: 'now',
  });

  return events;
}

export default function AccessGraphTimeline({ agent, events, compact = false }: AccessGraphTimelineProps) {
  const [activeEventIndex, setActiveEventIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);

  useEffect(() => {
    setActiveEventIndex(-1);
    setPlaying(false);
  }, [agent.id, compact]);

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
  const centerX = 240;
  const centerY = compact ? 136 : 160;
  const serviceRadius = compact ? 122 : 145;
  const graphHeight = compact ? 280 : 320;
  const graphWidth = 520;

  const serviceNodes = services.map((service, index, arr) => {
    const angle = (-55 + (arr.length === 1 ? 55 : (110 / Math.max(arr.length - 1, 1)) * index)) * (Math.PI / 180);
    return {
      id: service,
      x: centerX + serviceRadius * Math.cos(angle),
      y: centerY + serviceRadius * Math.sin(angle),
      r: 18,
      sensitive: SENSITIVE_SERVICES.some(term => service.includes(term)),
      label: truncate(service),
    };
  });

  const nodes = [
    { id: 'owner', x: 70, y: centerY, r: 22, label: truncate(agent.owner, 18), kind: 'owner' as const },
    { id: 'agent', x: centerX, y: centerY, r: 36, label: agent.name, kind: 'agent' as const },
    ...(showSubAgents ? [
      { id: 'subagent-1', x: 190, y: compact ? 58 : 65, r: 15, label: 'sub-agent', kind: 'subagent' as const },
      { id: 'subagent-2', x: 290, y: compact ? 54 : 58, r: 15, label: 'sub-agent', kind: 'subagent' as const },
    ] : []),
    ...serviceNodes.map(node => ({ ...node, kind: 'service' as const })),
  ];

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

  const calloutNode = currentEvent ? nodes.find(node => node.id === currentEvent.targetNode) : null;
  const calloutLines = currentEvent ? wrapText(currentEvent.description, compact ? 24 : 28, compact ? 4 : 3) : [];
  const progress = events.length ? ((activeEventIndex + 1) / events.length) * 100 : 0;

  return (
    <div className={`flex ${compact ? 'flex-col' : 'items-start'} gap-4`}>
      <div className="flex-1 rounded-lg border border-border bg-secondary/20 p-3">
        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full rounded-lg">
          {renderEdge('owner-agent', 70, centerY, centerX, centerY)}
          {showSubAgents && (
            <>
              {renderEdge('agent-subagent-1', centerX, centerY, 190, compact ? 58 : 65)}
              {renderEdge('agent-subagent-2', centerX, centerY, 290, compact ? 54 : 58)}
            </>
          )}
          {serviceNodes.map(node => renderEdge(`agent-${node.id}`, centerX, centerY, node.x, node.y))}

          {nodes.map(node => {
            const state = activeEventIndex === -1 ? 'idle' : graphNodeState(node.id);
            const eventSeverity = currentEvent?.targetNode === node.id ? currentEvent.severity : 'info';
            const glow = severityStroke(eventSeverity);
            const baseOpacity = activeEventIndex === -1 ? 0.6 : state === 'idle' ? 0.5 : state === 'visited' ? 0.85 : 1;
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
                <text x={node.x} y={node.y + node.r + 12} textAnchor="middle" fill={node.kind === 'subagent' ? 'hsl(var(--purple))' : 'hsl(var(--muted-foreground))'} fontSize="7">{node.kind === 'owner' ? 'owner' : node.kind === 'subagent' ? 'sub-agent' : truncate(node.label, node.kind === 'agent' ? 18 : 14)}</text>
              </g>
            );
          })}

          {calloutNode && currentEvent && (
            <g opacity="1">
              <rect
                x={calloutNode.x > 340 ? calloutNode.x - 156 : calloutNode.x + calloutNode.r + 12}
                y={calloutNode.y - 28}
                width="144"
                height={46 + calloutLines.length * 10}
                rx="4"
                fill="hsl(220 20% 12%)"
                stroke={severityStroke(currentEvent.severity)}
                strokeWidth="1"
              />
              <text x={calloutNode.x > 340 ? calloutNode.x - 146 : calloutNode.x + calloutNode.r + 22} y={calloutNode.y - 14} fill={severityStroke(currentEvent.severity)} fontSize="10" fontWeight="700">
                {currentEvent.label}
              </text>
              <text x={calloutNode.x > 340 ? calloutNode.x - 146 : calloutNode.x + calloutNode.r + 22} y={calloutNode.y - 2} fill="hsl(var(--muted-foreground))" fontSize="8">
                {currentEvent.time}
              </text>
              {calloutLines.map((line, index) => (
                <text
                  key={`${currentEvent.id}-${index}`}
                  x={calloutNode.x > 340 ? calloutNode.x - 146 : calloutNode.x + calloutNode.r + 22}
                  y={calloutNode.y + 12 + index * 10}
                  fill="hsl(var(--foreground))"
                  fontSize="8"
                >
                  {line}
                </text>
              ))}
            </g>
          )}

          {activeEventIndex === -1 && (
            <g>
              <rect x="112" y={compact ? '104' : '122'} width="256" height="72" rx="8" fill="hsl(220 20% 12% / 0.92)" stroke="hsl(var(--border))" />
              <text x="240" y={compact ? '128' : '146'} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="16">🕒</text>
              <text x="240" y={compact ? '148' : '166'} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontWeight="700">Press Play to audit agent activity</text>
              <text x="240" y={compact ? '162' : '180'} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">Nodes highlight as events occur — visually trace what the agent did over time</text>
            </g>
          )}
        </svg>

        {activeEventIndex === -1 && (
          <div className="mt-3 flex items-center justify-center">
            <button onClick={play} className="inline-flex items-center gap-1 rounded-md border border-teal/20 bg-teal/10 px-3 py-1.5 text-[10px] font-medium text-teal hover:bg-teal/20">
              <Clock3 className="h-3 w-3" /> Play audit replay
            </button>
          </div>
        )}
      </div>

      <div className={`${compact ? 'w-full' : 'w-56'} flex max-h-full flex-col rounded-lg border border-border bg-card p-3`}>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (playing) setPlaying(false);
              else if (activeEventIndex >= events.length - 1) replay();
              else play();
            }}
            className="rounded-md border border-teal/20 bg-teal/10 px-2.5 py-1 text-[10px] font-medium text-teal hover:bg-teal/20"
          >
            {playing ? '⏸ Pause' : activeEventIndex >= events.length - 1 && events.length > 0 ? '↺ Replay' : activeEventIndex > -1 ? '▶ Resume' : '▶ Play'}
          </button>
          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map(value => (
              <button
                key={value}
                onClick={() => setSpeed(value as 0.5 | 1 | 2)}
                className={`rounded px-1.5 py-0.5 text-[9px] ${speed === value ? 'bg-teal/20 text-teal' : 'text-muted-foreground hover:bg-secondary'}`}
              >
                {value}×
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{Math.max(activeEventIndex + 1, 0)} / {events.length}</span>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-teal transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          {events.map((event, index) => {
            const active = index === activeEventIndex;
            const past = index < activeEventIndex;
            return (
              <button
                key={event.id}
                onClick={() => {
                  setPlaying(false);
                  setActiveEventIndex(index);
                }}
                className={`flex w-full gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-muted/20 ${active ? 'bg-muted/40' : ''}`}
                style={{ opacity: active ? 1 : past ? 0.6 : 0.3 }}
              >
                <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${severityDot(event.severity)} ${active ? 'animate-pulse' : ''}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[10px] font-medium ${active ? severityText(event.severity) : 'text-foreground'}`}>{event.label}</span>
                  <span className="block text-[9px] text-muted-foreground">{event.time}</span>
                  <span className={`mt-0.5 block text-[9px] text-muted-foreground ${active ? 'rounded bg-secondary/50 p-1.5 text-foreground' : ''}`}>
                    {active ? event.description : `${event.description.slice(0, 40)}${event.description.length > 40 ? '…' : ''}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}