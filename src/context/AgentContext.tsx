import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { mockITAssets, mockGroups, type ITAsset, type DynamicGroup } from '@/data/inventoryMockData';

// ─── Types ──────────────────────────────────────────────────────────────────
export type EntityKind = 'identity' | 'infrastructure' | 'group' | 'policy' | null;

export interface SelectedEntity {
  kind: EntityKind;
  id: string;
  name: string;
  meta?: Record<string, any>;
}

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  targetId: string;
  targetName: string;
  skill: 'trigger_remediation' | 'create_dynamic_group' | 'rotate_key' | 'renew_cert' | 'assign_owner' | 'apply_policy';
  connector?: string; // e.g. "DigiCert", "AWS ACM"
  modifiable?: boolean;
  status: 'pending' | 'running' | 'success' | 'failed';
  verification?: string; // post-execution attribute change summary
}

export interface DraftPlan {
  id: string;
  goal: string;
  rationale: string;
  steps: PlanStep[];
  ambiguity?: { question: string; options: { label: string; value: string }[] };
}

export interface UndoableAction {
  id: string;
  timestamp: number;
  summary: string;
  steps: PlanStep[];
  rolledBack?: boolean;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  plan?: DraftPlan;
  optionPicker?: { question: string; options: { label: string; value: string }[]; resolved?: string };
  citations?: { source: string; snippet: string }[];
  timestamp: number;
}

interface AgentCtx {
  // UI state
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;

  // Context awareness
  selectedEntity: SelectedEntity | null;
  setSelectedEntity: (e: SelectedEntity | null) => void;

  // Conversation
  messages: AgentMessage[];
  isThinking: boolean;
  sendUserMessage: (text: string) => void;

  // HITL
  pendingPlan: DraftPlan | null;
  approvePlan: () => void;
  cancelPlan: () => void;
  executionProgress: { current: number; total: number } | null;

  // Undo
  undoStack: UndoableAction[];
  rollback: (actionId: string) => void;

  // Skills (exposed for direct call from option picker)
  resolveOption: (messageId: string, value: string) => void;
}

const AgentContext = createContext<AgentCtx | null>(null);

// ─── Helpers / Skills ───────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getInventoryContext(selected: SelectedEntity | null) {
  if (!selected) return null;
  if (selected.kind === 'identity') {
    return mockAssets.find(a => a.id === selected.id) ?? null;
  }
  if (selected.kind === 'infrastructure') {
    return mockITAssets.find(a => a.id === selected.id) ?? null;
  }
  if (selected.kind === 'group') {
    return mockGroups.find(g => g.id === selected.id) ?? null;
  }
  return null;
}

// Stub knowledge base — returns plausible PQC/Trust Platform citations.
function searchKnowledgeBase(query: string): { source: string; snippet: string }[] {
  const q = query.toLowerCase();
  const all = [
    { source: 'NIST SP 800-208 — Stateful Hash-Based Sigs', snippet: 'Recommends ML-DSA-65 for general signatures and ML-KEM-768 for key encapsulation in hybrid mode during migration.' },
    { source: 'NIST PQC Migration Playbook (draft)', snippet: 'Prioritize harvest-now-decrypt-later exposure: customer auth, payment, long-lived data flows.' },
    { source: 'Internal: Trust Platform Architecture v2.1', snippet: 'Single shared inventory; modules are lenses (Cert+, SSH, QTH). Never duplicate per-module.' },
    { source: 'CA/B Forum Baseline 2.0', snippet: 'Public TLS validity capped at 397 days; auto-renewal recommended via ACME.' },
  ];
  return all.filter(d => q.split(/\s+/).some(w => w.length > 3 && (d.source + d.snippet).toLowerCase().includes(w))).slice(0, 2);
}

// ─── Plan generation ────────────────────────────────────────────────────────
function buildPlan(query: string, selected: SelectedEntity | null, connectors: string[]): DraftPlan | null {
  const q = query.toLowerCase();

  // 1) "Fix expired certs in Production" pattern
  if ((q.includes('expir') || q.includes('renew')) && (q.includes('production') || q.includes('prod'))) {
    const candidates = mockAssets
      .filter(a => a.environment === 'Production' && (a.status === 'Expired' || a.status === 'Expiring' || a.daysToExpiry < 30))
      .slice(0, 4);
    if (candidates.length === 0) return null;

    // Ambiguity: multiple "Production" groups exist
    const prodGroups = mockGroups.filter(g => g.name.toLowerCase().includes('production') || g.topEnvironments.some(t => t.name === 'Production'));
    const ambiguity = prodGroups.length > 1 ? {
      question: `I found ${prodGroups.length} groups matching "Production". Which one?`,
      options: prodGroups.slice(0, 4).map(g => ({ label: `${g.name} (${g.objectCount} objects)`, value: g.id })),
    } : undefined;

    return {
      id: uid(),
      goal: `Fix all expired/expiring certificates in Production`,
      rationale: `Scanned Production scope · found ${candidates.length} at-risk certs · checked ${connectors.length} CA connector(s).`,
      steps: candidates.map((c, i) => {
        const useDigicert = c.caIssuer.includes('DigiCert') && connectors.includes('DigiCert');
        const usePQC = c.pqcRisk === 'Critical' || c.pqcRisk === 'High';
        return {
          id: uid(),
          title: usePQC ? `Re-issue ${c.name} with PQC-safe algorithm` : `Renew ${c.name} via ${useDigicert ? 'DigiCert' : 'AWS ACM'}`,
          detail: usePQC
            ? `Current: ${c.algorithm} · Target: ML-DSA-65 (hybrid) · Connector: ${useDigicert ? 'DigiCert' : 'AWS ACM'}`
            : `Current expiry: ${c.expiryDate} (${c.daysToExpiry}d) · New validity: 397d · Auto-renewal: enable`,
          targetId: c.id,
          targetName: c.name,
          skill: usePQC ? 'renew_cert' : 'renew_cert',
          connector: useDigicert ? 'DigiCert' : 'AWS ACM',
          modifiable: true,
          status: 'pending',
        };
      }),
      ambiguity,
    };
  }

  // 2) "Group all weak RSA keys"
  if ((q.includes('group') || q.includes('cohort')) && (q.includes('rsa') || q.includes('weak'))) {
    return {
      id: uid(),
      goal: `Create dynamic group: Weak RSA Keys`,
      rationale: `Found 47 RSA-2048 objects across Production · proposing a dynamic group with auto-evaluation.`,
      steps: [{
        id: uid(),
        title: `Create dynamic group "Weak RSA Keys (RSA ≤ 2048)"`,
        detail: `Conditions: Algorithm in [RSA-2048, RSA-1024] AND Environment = Production · Auto-evaluate: every 15 min · Initial members: 47`,
        targetId: 'new-group',
        targetName: 'Weak RSA Keys',
        skill: 'create_dynamic_group',
        modifiable: true,
        status: 'pending',
      }],
    };
  }

  // 3) "Rotate orphaned SSH keys"
  if (q.includes('rotate') || q.includes('orphan') || q.includes('ssh')) {
    const orphans = mockAssets.filter(a => a.type === 'SSH Key' && (a.owner === 'Unassigned' || a.status === 'Orphaned')).slice(0, 3);
    if (orphans.length === 0) return null;
    return {
      id: uid(),
      goal: `Rotate orphaned SSH keys`,
      rationale: `Found ${orphans.length} orphaned SSH keys · proposing rotation + owner assignment.`,
      steps: orphans.map(o => ({
        id: uid(),
        title: `Rotate ${o.name} + assign owner`,
        detail: `Algorithm: ${o.algorithm} → Ed25519 · Endpoints: ${o.sshEndpoints?.length ?? 1} · Suggested owner: ${o.team}`,
        targetId: o.id,
        targetName: o.name,
        skill: 'rotate_key',
        modifiable: true,
        status: 'pending',
      })),
    };
  }

  // 4) Generic — selected entity action
  if (selected?.kind === 'identity') {
    const c = mockAssets.find(a => a.id === selected.id);
    if (c) {
      return {
        id: uid(),
        goal: `Remediate ${c.name}`,
        rationale: `Currently viewing ${c.name} · ${c.policyViolations} policy violation(s) · risk: ${c.pqcRisk}.`,
        steps: [{
          id: uid(),
          title: c.status === 'Expiring' || c.status === 'Expired' ? `Renew ${c.name}` : `Apply best-practice policy to ${c.name}`,
          detail: `Connector: ${connectors[0] ?? 'AWS ACM'} · Estimated change window: < 5 min`,
          targetId: c.id,
          targetName: c.name,
          skill: c.status === 'Expiring' || c.status === 'Expired' ? 'renew_cert' : 'apply_policy',
          modifiable: true,
          status: 'pending',
        }],
      };
    }
  }

  return null;
}

// Verification: simulate attribute change post-execution
function verifyStep(step: PlanStep): string {
  if (step.skill === 'renew_cert') {
    const original = mockAssets.find(a => a.id === step.targetId);
    const newExpiry = new Date(Date.now() + 397 * 86400000).toISOString().split('T')[0];
    return `Expiry moved: ${original?.expiryDate ?? 'unknown'} → ${newExpiry} · pqcRisk: ${original?.pqcRisk} → Safe`;
  }
  if (step.skill === 'rotate_key') {
    return `Algorithm rotated to Ed25519 · lastRotated: today · status: Active`;
  }
  if (step.skill === 'create_dynamic_group') {
    return `Group created · 47 objects auto-matched · evaluation cadence: 15 min`;
  }
  if (step.skill === 'apply_policy') {
    return `Policy attached · enforcement: Warn → Enforce queued · violations cleared`;
  }
  return `Verified`;
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function AgentProvider({ children, connectedConnectors }: { children: ReactNode; connectedConnectors: string[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<DraftPlan | null>(null);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number } | null>(null);
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);

  const sendUserMessage = useCallback((text: string) => {
    const userMsg: AgentMessage = { id: uid(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      const ctx = getInventoryContext(selectedEntity);
      const citations = searchKnowledgeBase(text);
      const plan = buildPlan(text, selectedEntity, connectedConnectors);

      const ctxNote = ctx
        ? `Context: viewing **${(ctx as any).name}** (${selectedEntity?.kind}). `
        : '';

      let agentMsg: AgentMessage;
      if (plan) {
        if (plan.ambiguity) {
          // Stop and ask
          agentMsg = {
            id: uid(),
            role: 'agent',
            content: `${ctxNote}Before I propose a plan, I need to clarify:`,
            optionPicker: plan.ambiguity,
            citations,
            timestamp: Date.now(),
          };
        } else {
          agentMsg = {
            id: uid(),
            role: 'agent',
            content: `${ctxNote}${plan.rationale}`,
            plan,
            citations,
            timestamp: Date.now(),
          };
          setPendingPlan(plan);
        }
      } else {
        agentMsg = {
          id: uid(),
          role: 'agent',
          content: `${ctxNote}I couldn't form a confident plan from that request. Try: "Fix expired certs in Production", "Group all weak RSA keys", or "Rotate orphaned SSH keys".`,
          citations,
          timestamp: Date.now(),
        };
      }
      setMessages(prev => [...prev, agentMsg]);
      setIsThinking(false);
    }, 900);
  }, [selectedEntity, connectedConnectors]);

  const approvePlan = useCallback(() => {
    if (!pendingPlan) return;
    const plan = pendingPlan;
    setPendingPlan(null);

    setExecutionProgress({ current: 0, total: plan.steps.length });

    // Execute steps sequentially with simulated delay
    plan.steps.forEach((step, idx) => {
      setTimeout(() => {
        // Mark as running
        setMessages(prev => prev.map(m => m.plan?.id === plan.id
          ? { ...m, plan: { ...m.plan!, steps: m.plan!.steps.map(s => s.id === step.id ? { ...s, status: 'running' } : s) } }
          : m));

        setTimeout(() => {
          // Mark success + verify
          const verification = verifyStep(step);
          setMessages(prev => prev.map(m => m.plan?.id === plan.id
            ? {
                ...m,
                plan: {
                  ...m.plan!,
                  steps: m.plan!.steps.map(s => s.id === step.id ? { ...s, status: 'success', verification } : s),
                },
              }
            : m));
          setExecutionProgress({ current: idx + 1, total: plan.steps.length });

          // After last step
          if (idx === plan.steps.length - 1) {
            setTimeout(() => {
              setExecutionProgress(null);
              const completedSteps = plan.steps.map(s => ({ ...s, status: 'success' as const, verification: verifyStep(s) }));
              setUndoStack(prev => [
                { id: uid(), timestamp: Date.now(), summary: plan.goal, steps: completedSteps },
                ...prev,
              ].slice(0, 20));
              setMessages(prev => [...prev, {
                id: uid(),
                role: 'agent',
                content: `✓ Completed **${plan.goal}** — ${plan.steps.length} step(s) verified. You can roll this back from the undo stack.`,
                timestamp: Date.now(),
              }]);
            }, 400);
          }
        }, 700);
      }, idx * 1400);
    });
  }, [pendingPlan]);

  const cancelPlan = useCallback(() => {
    setPendingPlan(null);
    setMessages(prev => [...prev, {
      id: uid(),
      role: 'agent',
      content: `Plan cancelled. No changes made.`,
      timestamp: Date.now(),
    }]);
  }, []);

  const rollback = useCallback((actionId: string) => {
    setUndoStack(prev => prev.map(a => a.id === actionId ? { ...a, rolledBack: true } : a));
    const action = undoStack.find(a => a.id === actionId);
    setMessages(prev => [...prev, {
      id: uid(),
      role: 'agent',
      content: `↶ Rolled back **${action?.summary ?? 'action'}** — ${action?.steps.length ?? 0} step(s) reverted to prior state.`,
      timestamp: Date.now(),
    }]);
  }, [undoStack]);

  const resolveOption = useCallback((messageId: string, value: string) => {
    setMessages(prev => prev.map(m => m.id === messageId && m.optionPicker
      ? { ...m, optionPicker: { ...m.optionPicker, resolved: value } }
      : m));
    // Re-issue the plan now that the ambiguity is resolved
    const original = messages.find(m => m.id === messageId);
    setTimeout(() => {
      const proceedPlan = buildPlan('renew expiring production', selectedEntity, connectedConnectors);
      if (proceedPlan) {
        proceedPlan.ambiguity = undefined;
        setPendingPlan(proceedPlan);
        setMessages(prev => [...prev, {
          id: uid(),
          role: 'agent',
          content: `Got it. Proceeding with the selected scope. Here's the proposed plan:`,
          plan: proceedPlan,
          timestamp: Date.now(),
        }]);
      }
    }, 400);
  }, [messages, selectedEntity, connectedConnectors]);

  const value = useMemo<AgentCtx>(() => ({
    drawerOpen, setDrawerOpen,
    selectedEntity, setSelectedEntity,
    messages, isThinking, sendUserMessage,
    pendingPlan, approvePlan, cancelPlan, executionProgress,
    undoStack, rollback,
    resolveOption,
  }), [drawerOpen, selectedEntity, messages, isThinking, sendUserMessage, pendingPlan, approvePlan, cancelPlan, executionProgress, undoStack, rollback, resolveOption]);

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const c = useContext(AgentContext);
  if (!c) throw new Error('useAgent must be used inside AgentProvider');
  return c;
}
