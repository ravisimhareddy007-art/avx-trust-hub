import React, { useState, useRef, useEffect } from 'react';
import { useNav } from '@/context/NavigationContext';
import { Bell, Sparkles, User, AlertTriangle, X, Send, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; page: string; filters?: Record<string, string> }[];
}

const breadcrumbMap: Record<string, string> = {
  'dashboards': 'Insights',
  'discovery': 'Discovery > Add Discovery',
  'inventory': 'Inventory > All Assets',
  'policy-builder': 'Policies > Policy Builder',
  'trustops': 'Alerts & Logs > TrustOps Center',
  'quantum': 'Policies > Quantum Posture',
  'automation': 'Automation > Workflows',
  'integrations': 'Automation > Integrations',
  'reporting': 'Administration > Reports',
  'self-service': 'Administration > Self-Service Portal',
  'user-management': 'Administration > User Management',
  'licenses': 'Administration > Licenses',
  'audit-log': 'Alerts & Logs > Audit Log',
  'remediation': 'Remediation',
  'tickets': 'Tickets',
};

function getAIResponse(query: string): AIMessage {
  const q = query.toLowerCase();

  if (q.includes('expir') || q.includes('renew')) {
    return {
      role: 'assistant',
      content: `Found **342 certificates** expiring in the next 7 days with no owner assigned.\n\n**Top 3 by blast radius:**\n1. payments-api.acme.com — 847 downstream services\n2. auth-gateway.acme.com — 312 services\n3. k8s-ingress-prod — 204 services\n\nI can create remediation tickets for all 342, auto-assigning owners based on deployment patterns.`,
      actions: [
        { label: 'Create remediation tickets', page: 'tickets' },
        { label: 'View in Remediation', page: 'remediation', filters: { module: 'clm', filter: 'expiry' } },
        { label: 'View in Inventory', page: 'inventory', filters: { status: 'Expiring' } },
      ],
    };
  }
  if (q.includes('rotate') || q.includes('ssh') || q.includes('rsa')) {
    return {
      role: 'assistant',
      content: `Identified **1,247 RSA-2048 SSH keys** in payments namespace.\n\n**AI-recommended rotation plan:**\n• Batch 1: 412 bastion keys (zero-downtime swap)\n• Batch 2: 518 service keys (maintenance window)\n• Batch 3: 317 legacy keys (manual review)\n\nEstimated completion: 4 days.`,
      actions: [
        { label: 'Start rotation workflow', page: 'remediation', filters: { module: 'ssh' } },
        { label: 'Create change tickets', page: 'tickets' },
        { label: 'View SSH keys', page: 'inventory', filters: { type: 'SSH Key' } },
      ],
    };
  }
  if (q.includes('pqc') || q.includes('quantum') || q.includes('migrat')) {
    return {
      role: 'assistant',
      content: `**PQC Migration Priority Queue** (AI-ranked by harvest risk × criticality):\n\n1. **847 payment certs** — Harvest risk: HIGH, P0. Target: ML-DSA-65\n2. **312 auth gateway certs** — Harvest risk: HIGH, P1. Target: ML-KEM-768\n3. **1,247 internal mTLS** — Harvest risk: MEDIUM, P2\n\nTotal quantum-vulnerable: 247K assets. Current PQC readiness: 12%.`,
      actions: [
        { label: 'Open Quantum Posture', page: 'quantum' },
        { label: 'Start PQC migration', page: 'remediation', filters: { filter: 'pqc' } },
      ],
    };
  }
  if (q.includes('policy') || q.includes('rego') || q.includes('block') || q.includes('enforce')) {
    return {
      role: 'assistant',
      content: `I can generate an OPA/Rego policy from your description. For example:\n\n**"Block all RSA-2048 in production"** would create:\n\`\`\`rego\nviolation[msg] {\n  input.algorithm == "RSA-2048"\n  input.environment == "Production"\n  msg := "RSA-2048 not allowed in production"\n}\n\`\`\`\n\nThe policy will be unit-tested and ready to deploy.`,
      actions: [
        { label: 'Open Policy Builder', page: 'policy-builder' },
      ],
    };
  }
  if (q.includes('anomal') || q.includes('agent') || q.includes('suspicious')) {
    return {
      role: 'assistant',
      content: `**3 agents flagged for anomalous behavior:**\n\n1. **ci-deploy-bot-7** — 14× normal credential velocity\n2. **data-pipeline-agent** — accessing out-of-scope secrets\n3. **ml-trainer-9** — bulk token generation at 3AM\n\nRecommend: auto-suspend pending review.`,
      actions: [
        { label: 'View in TrustOps', page: 'trustops' },
        { label: 'View agent tokens', page: 'inventory', filters: { type: 'AI Agent Token' } },
      ],
    };
  }
  if (q.includes('report') || q.includes('ciso') || q.includes('posture') || q.includes('score')) {
    return {
      role: 'assistant',
      content: `**Executive Posture Summary:**\n\nCrypto posture score: **55/100** (↓3 from last month)\n\n• Algorithm Health: 64 — 4,218 weak algo certs\n• Expiry Posture: 78 — 342 expired, 12,847 expiring\n• PQC Readiness: 12 — 247K quantum-vulnerable\n• Governance: 71 — 3,218 orphaned assets\n• AI Identity Trust: 48 — 179K over-privileged\n\n**Top recommendation:** Accelerate PQC migration for payment certs (+4 points).`,
      actions: [
        { label: 'View Dashboard', page: 'dashboards' },
        { label: 'Start PQC migration', page: 'quantum' },
      ],
    };
  }

  return {
    role: 'assistant',
    content: `Analyzing: "${query}"\n\nBased on your current posture (score: 55), the highest-impact action is migrating 847 payment certificates to ML-DSA-65. This would improve PQR from 12→28 and composite score from 55→59.\n\nI can also help with: inventory queries, policy generation, ticket creation, rotation workflows, or anomaly investigation.`,
    actions: [
      { label: 'Open Inventory', page: 'inventory' },
      { label: 'Open Remediation', page: 'remediation' },
      { label: 'Create tickets', page: 'tickets' },
    ],
  };
}

export default function TopBar() {
  const { currentPage, setCurrentPage, setFilters } = useNav();
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleAISubmit = () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: AIMessage = { role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    setTimeout(() => {
      const response = getAIResponse(userMsg.content);
      setAiMessages(prev => [...prev, response]);
      setAiLoading(false);
    }, 1200);
  };

  const handleAction = (action: { label: string; page: string; filters?: Record<string, string> }) => {
    if (action.filters) setFilters(action.filters);
    setCurrentPage(action.page);
    setAiOpen(false);
    toast.success(`Navigating to ${action.label}`);
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      setAiOpen(true);
      setAiInput(searchValue);
      setSearchValue('');
      // Auto-submit
      const userMsg: AIMessage = { role: 'user', content: searchValue };
      setAiMessages(prev => [...prev, userMsg]);
      setAiLoading(true);
      setTimeout(() => {
        const response = getAIResponse(searchValue);
        setAiMessages(prev => [...prev, response]);
        setAiLoading(false);
      }, 1200);
    }
  };

  return (
    <>
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
        {/* Breadcrumb */}
        <div className="text-sm font-medium text-foreground min-w-[180px]">
          {breadcrumbMap[currentPage] || currentPage}
        </div>

        {/* Global Search → opens AI panel */}
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal" />
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => setAiOpen(true)}
              placeholder='Ask Infinity AI — "rotate all RSA keys in payments" or "generate CISO report"'
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* AI Button */}
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aiOpen ? 'bg-teal text-primary-foreground' : 'bg-teal/10 text-teal hover:bg-teal/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Infinity AI
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold">5</span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50 p-3">
                <h4 className="text-xs font-semibold mb-2">Notifications</h4>
                {[
                  { text: '*.payments.acmecorp.com expires in 6 days', page: 'remediation' },
                  { text: 'vault.internal cert expires in 3 days', page: 'remediation' },
                  { text: 'SSH cert k8s-node expired', page: 'remediation' },
                  { text: 'Discovery run completed — 8 new assets', page: 'discovery' },
                  { text: 'PQC risk assessment updated', page: 'quantum' },
                ].map((n, i) => (
                  <div key={i} onClick={() => { setCurrentPage(n.page); setShowNotifications(false); }} className="py-2 border-b border-border last:border-0 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    {n.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantum Risk Pill */}
          <button
            onClick={() => setCurrentPage('quantum-posture')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber/10 text-amber text-xs font-medium hover:bg-amber/20 transition-colors"
          >
            <AlertTriangle className="w-3 h-3" />
            12,847 PQC
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
            <User className="w-4 h-4 text-teal" />
          </div>
        </div>
      </div>

      {/* Global AI Panel — slides down */}
      {aiOpen && (
        <div className="bg-card border-b border-teal/30 shadow-lg z-40">
          <div className="max-w-3xl mx-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal" />
                <span className="text-sm font-semibold">Infinity AI</span>
                <span className="text-[10px] text-muted-foreground">Query inventory · Create tickets · Generate policies · Trigger remediation</span>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {/* Messages */}
            {aiMessages.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin space-y-3 mb-3 bg-secondary/30 rounded-lg p-3">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal text-primary-foreground'
                        : 'bg-card border border-border text-foreground'
                    }`}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                      {msg.actions && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                          {msg.actions.map((action, j) => (
                            <button
                              key={j}
                              onClick={() => handleAction(action)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-teal/10 text-teal text-[10px] font-medium hover:bg-teal/20 transition-colors"
                            >
                              {action.label} <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-teal animate-spin" />
                      <span className="text-[10px] text-muted-foreground">Correlating across all engines...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAISubmit()}
                placeholder="Ask anything — e.g. 'Which certs expire this week?' or 'Create a policy to block RSA-2048'"
                className="flex-1 px-3 py-2.5 bg-muted border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-teal"
                autoFocus
              />
              <button
                onClick={handleAISubmit}
                disabled={!aiInput.trim() || aiLoading}
                className="px-4 py-2.5 bg-teal text-primary-foreground rounded-lg text-xs font-medium hover:bg-teal-light disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Ask AI
              </button>
            </div>

            {/* Quick Actions */}
            {aiMessages.length === 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  'Show expiring certificates this week',
                  'Rotate all RSA-2048 SSH keys in payments',
                  'Generate CISO posture report',
                  'Create policy to block weak algorithms',
                  'Show anomalous agent behavior',
                  'PQC migration priority queue',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setAiInput(q); }}
                    className="px-2.5 py-1.5 bg-secondary/50 border border-border rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:border-teal/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
