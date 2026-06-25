import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { useAgent } from '@/context/AgentContext';
import {
  Sparkles, Check, Lock, ChevronDown, ChevronUp, X, Plug, Radar, ShieldCheck, ArrowRight,
} from 'lucide-react';

// ============================================================================
// DAY-0 ONBOARDING (single file): context + strip.
//
// Philosophy: the strip is honest wayfinding, not a gate. Each stage button goes
// straight to the real page. AI is a small optional "help" that only deep-links;
// it never claims to pre-fill or do work it cannot do. A stage is marked seen
// when the user visits its page. No fake "mark done" buttons, no modal that
// blocks navigation. Session-only state.
// ============================================================================

export type StageId = 'connect' | 'discover' | 'govern';
export const STAGE_ORDER: StageId[] = ['connect', 'discover', 'govern'];
export type StageStatus = 'locked' | 'active' | 'done';

// Kept for backwards-compat with earlier imports.
export type EstateChoice = string;
export type ConcernChoice = string;

interface OnboardingValue {
  visible: boolean;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  dismiss: () => void;

  stageStatus: (id: StageId) => StageStatus;
  currentStage: StageId | null;
  markSeen: (id: StageId) => void;
  allComplete: boolean;

  reset: () => void;
}

const Ctx = createContext<OnboardingValue | null>(null);

const STAGE_TO_PAGE: Record<StageId, string> = {
  connect: 'integrations',
  discover: 'discovery',
  govern: 'policy-builder',
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { try { localStorage.removeItem('trust-onboarding-dismissed'); } catch {} }, []);

  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [seen, setSeen] = useState<Set<StageId>>(new Set());

  const done = seen;

  const currentStage = useMemo<StageId | null>(() => {
    for (const s of STAGE_ORDER) if (!done.has(s)) return s;
    return null;
  }, [done]);

  const stageStatus = (id: StageId): StageStatus => {
    if (done.has(id)) return 'done';
    if (id === currentStage) return 'active';
    return 'locked';
  };

  const markSeen = (id: StageId) =>
    setSeen(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  const allComplete = STAGE_ORDER.every(s => done.has(s));

  const dismiss = () => setVisible(false);
  const reset = () => { setVisible(true); setExpanded(true); setSeen(new Set()); };

  const value: OnboardingValue = {
    visible, expanded, setExpanded, dismiss,
    stageStatus, currentStage, markSeen, allComplete, reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useOnboarding must be used within OnboardingProvider');
  return c;
}

// ============================================================================
// The strip
// ============================================================================
const STAGE_META: Record<StageId, {
  n: number; title: string; icon: React.ComponentType<{ className?: string }>;
  todo: string; doneFmt: (n: number) => string; cta: string; aiHelp: string;
}> = {
  connect: {
    n: 1, title: 'Connect a source', icon: Plug,
    todo: 'Add your first integration', doneFmt: () => 'Visited Integrations',
    cta: 'Go to Integrations', aiHelp: 'Not sure which to pick? Ask AI',
  },
  discover: {
    n: 2, title: 'Discover assets', icon: Radar,
    todo: 'Scan a connection for certs and keys', doneFmt: () => 'Visited Discovery',
    cta: 'Go to Discovery', aiHelp: 'Let AI plan the scan',
  },
  govern: {
    n: 3, title: 'Add a policy', icon: ShieldCheck,
    todo: 'Flag weak crypto automatically', doneFmt: () => 'Visited Policies',
    cta: 'Go to Policies', aiHelp: 'Let AI draft a policy',
  },
};

export function OnboardingStrip() {
  const o = useOnboarding();
  const { setCurrentPage } = useNav();
  const { setDrawerOpen } = useAgent();

  if (!o.visible) return null;

  const goToStage = (id: StageId, withAI = false) => {
    setCurrentPage(STAGE_TO_PAGE[id]);
    o.markSeen(id);
    if (withAI) setDrawerOpen(true);
  };

  // ---- Complete ----
  if (o.allComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/60">
        <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-teal" />
        </div>
        <div className="text-[12px] text-foreground flex-1">
          <span className="font-medium">You are set up.</span>{' '}
          <span className="text-muted-foreground">Connected, scanned, and governed. Your dashboard now shows real numbers.</span>
        </div>
        <button
          onClick={() => setCurrentPage('dashboards')}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
        >
          View dashboard <ArrowRight className="w-3 h-3" />
        </button>
        <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Collapsed ----
  if (!o.expanded) {
    const doneCount = STAGE_ORDER.filter(s => o.stageStatus(s) === 'done').length;
    const cur = o.currentStage ? STAGE_META[o.currentStage] : null;
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/60">
        <Sparkles className="w-3.5 h-3.5 text-teal flex-shrink-0" />
        <div className="text-[12px] flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium text-foreground">Get started</span>
          <span className="text-muted-foreground">· {doneCount} of 3 done</span>
        </div>
        {cur && (
          <button
            onClick={() => goToStage(o.currentStage as StageId)}
            className="text-[11px] px-2.5 py-1 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
          >
            {cur.cta}
          </button>
        )}
        <button onClick={() => o.setExpanded(true)} className="text-muted-foreground hover:text-foreground" aria-label="Expand">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Expanded ----
  return (
    <div className="border-b border-border bg-card/60">
      <div className="px-4 py-3 flex items-start gap-4">
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <div className="w-7 h-7 rounded-md bg-teal/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-teal" />
          </div>
          <div>
            <div className="text-[12px] font-semibold text-foreground leading-tight">Get to your first risk view</div>
            <div className="text-[10.5px] text-muted-foreground leading-tight">Three steps. Each opens the right page.</div>
          </div>
        </div>

        <div className="flex items-stretch gap-2 flex-1 min-w-0">
          {STAGE_ORDER.map((id, idx) => {
            const meta = STAGE_META[id];
            const status = o.stageStatus(id);
            const Icon = meta.icon;
            const sub = status === 'done' ? meta.doneFmt(0) : meta.todo;
            const isActive = status === 'active';
            const isLocked = status === 'locked';
            return (
              <React.Fragment key={id}>
                <div
                  className={[
                    'flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    status === 'done' ? 'border-teal/30 bg-teal/5' :
                    isActive ? 'border-teal/40 bg-card' :
                    'border-border bg-card/40 opacity-60',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                      status === 'done' ? 'bg-teal/20 text-teal' :
                      isActive ? 'bg-teal/15 text-teal' :
                      'bg-muted text-muted-foreground',
                    ].join(' ')}
                  >
                    {status === 'done'
                      ? <Check className="w-3.5 h-3.5" />
                      : isLocked
                        ? <Lock className="w-3 h-3" />
                        : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-foreground truncate">
                      <span className="text-muted-foreground mr-1">{meta.n}.</span>{meta.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
                  </div>
                  {status !== 'done' && !isLocked && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => goToStage(id)}
                        className="text-[10px] px-2 py-1 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
                      >
                        {meta.cta}
                      </button>
                      <button
                        onClick={() => goToStage(id, true)}
                        title={meta.aiHelp}
                        className="flex items-center gap-1 text-[9.5px] px-1.5 py-1 rounded-md border border-teal/30 text-teal hover:bg-teal/10 whitespace-nowrap"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </button>
                    </div>
                  )}
                  {status === 'done' && (
                    <button
                      onClick={() => goToStage(id)}
                      className="text-[9.5px] px-1.5 py-1 rounded-md text-muted-foreground hover:text-foreground flex-shrink-0 ml-1 whitespace-nowrap"
                    >
                      Open
                    </button>
                  )}
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div className="flex items-center text-muted-foreground/40 flex-shrink-0">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 pt-1">
          <button onClick={() => o.setExpanded(false)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Collapse">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
