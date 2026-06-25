import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { Check, Lock, ChevronDown, ChevronUp, X, Plug, Radar, ShieldCheck, ArrowRight } from 'lucide-react';

// ============================================================================
// DAY-0 ONBOARDING: context + strip (single file).
//
// A clean, enterprise wayfinding guide. Three steps, each opening the real page.
// No assistant, no modal, no fabricated state. A step completes when its page
// has been visited. Session-only. Retires on completion or dismissal.
//
// This file is the canonical implementation. OnboardingContext.tsx re-exports
// the provider/hook/types from here; OnboardingConductor.tsx is a no-op.
// ============================================================================

export type StageId = 'connect' | 'discover' | 'govern';
export const STAGE_ORDER: StageId[] = ['connect', 'discover', 'govern'];
export type StageStatus = 'locked' | 'active' | 'done';
// Kept for backwards-compatible re-exports from OnboardingContext.tsx.
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

  const markSeen = (id: StageId) => setSeen(prev => prev.has(id) ? prev : new Set(prev).add(id));
  const allComplete = STAGE_ORDER.every(s => done.has(s));
  const dismiss = () => setVisible(false);
  const reset = () => { setVisible(true); setExpanded(true); setSeen(new Set()); };

  const value: OnboardingValue = {
    visible, expanded, setExpanded, dismiss,
    stageStatus, currentStage, markSeen, allComplete, reset,
  };

  return (
    <Ctx.Provider value={value}>{children}</Ctx.Provider>
  );
}

export function useOnboarding() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useOnboarding must be used within OnboardingProvider');
  return c;
}

// ============================================================================
// Strip
// ============================================================================
const STAGE_META: Record<StageId, {
  step: number; title: string; icon: React.ComponentType<{ className?: string }>;
  todo: string; done: string; cta: string;
}> = {
  connect: {
    step: 1, title: 'Connect a source', icon: Plug,
    todo: 'Establish your first integration', done: 'Integration configured',
    cta: 'Open Integrations',
  },
  discover: {
    step: 2, title: 'Run discovery', icon: Radar,
    todo: 'Inventory certificates and keys', done: 'Discovery configured',
    cta: 'Open Discovery',
  },
  govern: {
    step: 3, title: 'Define a policy', icon: ShieldCheck,
    todo: 'Set posture and compliance rules', done: 'Policy configured',
    cta: 'Open Policies',
  },
};

export function OnboardingStrip() {
  const o = useOnboarding();
  const { setCurrentPage } = useNav();

  if (!o.visible) return null;

  const goToStage = (id: StageId) => {
    setCurrentPage(STAGE_TO_PAGE[id]);
    o.markSeen(id);
  };

  const doneCount = STAGE_ORDER.filter(s => o.stageStatus(s) === 'done').length;

  // ---- Complete ----
  if (o.allComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/60">
        <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-teal" />
        </div>
        <div className="text-[12px] text-foreground flex-1">
          <span className="font-medium">Setup complete.</span>{' '}
          <span className="text-muted-foreground">Your trust posture is now populated across the dashboard.</span>
        </div>
        <button
          onClick={() => setCurrentPage('dashboards')}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap flex-shrink-0"
        >
          Go to dashboard <ArrowRight className="w-3 h-3" />
        </button>
        <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Collapsed ----
  if (!o.expanded) {
    const cur = o.currentStage ? STAGE_META[o.currentStage] : null;
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/60">
        <div className="text-[12px] font-medium text-foreground flex-shrink-0">Guided setup</div>
        <div className="text-[12px] text-muted-foreground flex-1">
          {doneCount} of 3 complete
        </div>
        {cur && (
          <button
            onClick={() => goToStage(o.currentStage as StageId)}
            className="text-[11px] px-3 py-1 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap flex-shrink-0"
          >
            {cur.cta}
          </button>
        )}
        <button onClick={() => o.setExpanded(true)} className="text-muted-foreground hover:text-foreground flex-shrink-0" aria-label="Expand">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Expanded ----
  // Layout is overflow-safe: the steps area scrolls horizontally if the viewport
  // is too narrow, and every fixed element is flex-shrink-0 so nothing clips.
  return (
    <div className="border-b border-border bg-card/60">
      <div className="px-4 py-3 flex items-start gap-4">
        {/* Title block */}
        <div className="flex-shrink-0 pt-1">
          <div className="text-[12px] font-semibold text-foreground leading-tight">Guided setup</div>
          <div className="text-[10.5px] text-muted-foreground leading-tight">Three steps to your first trust posture</div>
        </div>

        {/* Steps: horizontally scrollable safety net on narrow widths */}
        <div className="flex items-stretch gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
          {STAGE_ORDER.map((id, idx) => {
            const meta = STAGE_META[id];
            const status = o.stageStatus(id);
            const Icon = meta.icon;
            const isLocked = status === 'locked';
            const isDone = status === 'done';
            const isActive = status === 'active';
            return (
              <React.Fragment key={id}>
                <div
                  className={[
                    'flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    isDone ? 'border-teal/30 bg-teal/5' :
                    isActive ? 'border-teal/40 bg-card' :
                    'border-border bg-card/40 opacity-60',
                  ].join(' ')}
                >
                  {/* Status node */}
                  <div
                    className={[
                      'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                      isDone ? 'bg-teal/20 text-teal' :
                      isActive ? 'bg-teal/15 text-teal' :
                      'bg-muted text-muted-foreground',
                    ].join(' ')}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> :
                     isLocked ? <Lock className="w-3 h-3" /> :
                     <Icon className="w-3.5 h-3.5" />}
                  </div>

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-foreground truncate">
                      <span className="text-muted-foreground mr-1">Step {meta.step}.</span>{meta.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {isDone ? meta.done : meta.todo}
                    </div>
                  </div>

                  {/* Action */}
                  {isActive && (
                    <button
                      onClick={() => goToStage(id)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap flex-shrink-0 ml-1"
                    >
                      {meta.cta} <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {isDone && (
                    <button
                      onClick={() => goToStage(id)}
                      className="text-[10px] px-2 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 whitespace-nowrap flex-shrink-0 ml-1"
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

        {/* Window controls */}
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

// Default export too, so either import style works.
export default OnboardingStrip;
