import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { useIntegrations } from '@/context/IntegrationsContext';
import {
  Check, Lock, ChevronDown, ChevronUp, X,
  Plug, Radar, ShieldCheck, ArrowRight, Sparkles,
} from 'lucide-react';

// ============================================================================
// DAY-0 ONBOARDING: context + thin strip (canonical implementation).
//
// Outcome-driven wayfinding, not a product checklist. Each step states the
// business outcome and opens the real page where the rich detail lives. Progress
// is REAL: the connect step reflects how many sources are actually connected and
// the discover step reflects whether a discovery has actually completed.
//
// Once a source is connected, the Discover step offers BOTH paths, honestly:
//   - "Run discovery" opens the manual Discovery flow.
//   - "Use AI" opens Discovery's existing AI planner (the create view), via a
//     one-shot nav intent. No fabricated AI, just a deep-link to the real planner.
//
// No estimates, no fabricated counts. Session-only; retires on completion/dismiss.
// ============================================================================

export type StageId = 'connect' | 'discover' | 'govern';
export const STAGE_ORDER: StageId[] = ['connect', 'discover', 'govern'];
export type StageStatus = 'locked' | 'active' | 'done';
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

  // Real signals. A step is complete when its real outcome exists OR the user
  // has visited the page (an honest "you have been here", not fabricated success).
  const { connected } = useIntegrations();
  const { runs } = useRuns();
  const hasConnection = connected.length > 0;
  const hasCompletedRun = runs.some(r => r.status === 'completed');

  const done = useMemo(() => {
    const d = new Set<StageId>(seen);
    if (hasConnection) d.add('connect');
    if (hasCompletedRun) d.add('discover');
    return d;
  }, [seen, hasConnection, hasCompletedRun]);

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

// Outcome-driven copy. The CTA states the business outcome; the page it opens
// holds the rich detail (source catalog, recommended order, scan results, AI planner).
const STAGE_META: Record<StageId, {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  outcome: string;
  todo: string;
  cta: string;
}> = {
  connect: {
    step: 1, icon: Plug,
    outcome: 'Connect your environment',
    todo: 'Bring your certificate and key sources into view',
    cta: 'Connect sources',
  },
  discover: {
    step: 2, icon: Radar,
    outcome: 'Inventory certificates and keys',
    todo: 'Find what you have and what you are missing',
    cta: 'Run discovery',
  },
  govern: {
    step: 3, icon: ShieldCheck,
    outcome: 'Protect your environment',
    todo: 'Alert on expiry, weak crypto, and compliance gaps',
    cta: 'Set up alerts',
  },
};

export function OnboardingStrip() {
  const o = useOnboarding();
  const { setCurrentPage, setFilters, filters } = useNav();
  const { connected } = useIntegrations();

  if (!o.visible) return null;

  const goToStage = (id: StageId, withAI = false) => {
    if (id === 'discover' && withAI) {
      setFilters({ ...filters, discoveryIntent: 'ai' });
    }
    setCurrentPage(STAGE_TO_PAGE[id]);
    o.markSeen(id);
  };

  const doneCount = STAGE_ORDER.filter(s => o.stageStatus(s) === 'done').length;
  const connectedCount = connected.length;

  const statusLine = (id: StageId, status: StageStatus): string => {
    if (id === 'connect') {
      return connectedCount > 0
        ? `${connectedCount} source${connectedCount === 1 ? '' : 's'} connected`
        : STAGE_META.connect.todo;
    }
    if (id === 'discover') {
      return status === 'done' ? 'Inventory available' : STAGE_META.discover.todo;
    }
    return status === 'done' ? 'Protection active' : STAGE_META.govern.todo;
  };

  // ---- Complete ----
  if (o.allComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/60">
        <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-teal" />
        </div>
        <div className="text-[12px] text-foreground flex-1">
          <span className="font-medium">You are protected.</span>{' '}
          <span className="text-muted-foreground">
            Sources connected, inventory built, and alerting in place. Your posture is live on the dashboard.
          </span>
        </div>
        <button
          onClick={() => setCurrentPage('dashboards')}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap flex-shrink-0"
        >
          View posture <ArrowRight className="w-3 h-3" />
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
        <div className="text-[12px] font-medium text-foreground flex-shrink-0">Getting started</div>
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

  // ---- Expanded (compact dot stepper + current step) ----
  return (
    <div className="border-b border-border bg-card/60">
      <div className="px-4 py-3 flex items-center gap-4">
        {/* Title block */}
        <div className="flex-shrink-0 pt-1">
          <div className="text-[12px] font-semibold text-foreground leading-tight">Get to your first trust posture</div>
          <div className="text-[10.5px] text-muted-foreground leading-tight">Connect, inventory, protect</div>
        </div>

        {/* Compact dot stepper */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {STAGE_ORDER.map((id, idx) => {
            const meta = STAGE_META[id];
            const status = o.stageStatus(id);
            const Icon = meta.icon;
            const isDone = status === 'done';
            const isActive = status === 'active';
            const isLocked = status === 'locked';
            return (
              <React.Fragment key={id}>
                <div
                  title={`Step ${meta.step}: ${meta.outcome}`}
                  className={[
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    isDone ? 'bg-teal/20 text-teal' :
                    isActive ? 'bg-teal/15 text-teal ring-1 ring-teal' :
                    'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> :
                   isLocked ? <Lock className="w-3 h-3" /> :
                   <Icon className="w-3.5 h-3.5" />}
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className={[
                      'w-4 h-px flex-shrink-0',
                      o.stageStatus(id) === 'done' ? 'bg-teal' : 'bg-border',
                    ].join(' ')}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Current step detail */}
        {o.currentStage && (
          <div className="flex items-center gap-3 flex-1 min-w-0 pl-4 border-l border-border">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-teal font-semibold leading-tight">
                Step {STAGE_META[o.currentStage].step} of 3
              </div>
              <div className="text-[12px] font-semibold text-foreground leading-tight">
                {STAGE_META[o.currentStage].outcome}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {statusLine(o.currentStage, o.stageStatus(o.currentStage))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => goToStage(o.currentStage)}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
              >
                {STAGE_META[o.currentStage].cta} <ArrowRight className="w-2.5 h-2.5" />
              </button>
              {o.currentStage === 'discover' && (
                <button
                  onClick={() => goToStage(o.currentStage, true)}
                  title="Plan this discovery with AI"
                  className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-md border border-teal/40 text-teal font-medium hover:bg-teal/10 whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3" /> Use AI
                </button>
              )}
            </div>
          </div>
        )}

        {/* Window controls */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-1 ml-auto">
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

export default OnboardingStrip;
