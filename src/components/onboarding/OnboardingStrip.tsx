import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useNav } from '@/context/NavigationContext';
import {
  ArrowRight, Check, ChevronDown, ChevronUp, Loader2, Lock, Plug, Radar, ShieldCheck, Sparkles, X,
} from 'lucide-react';

// ============================================================================
// DAY-0 ONBOARDING — context + strip + conductor (single file).
// connect -> discover -> govern. Session-only state. Offline scripted assistant.
// ============================================================================

export type StageId = 'connect' | 'discover' | 'govern';
export const STAGE_ORDER: StageId[] = ['connect', 'discover', 'govern'];
export type StageStatus = 'locked' | 'active' | 'done';

export type EstateChoice = 'AWS' | 'Azure' | 'GlobalSign' | 'HashiCorp';
export type ConcernChoice = 'expiry' | 'quantum' | 'compliance' | null;

interface OnboardingValue {
  visible: boolean;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  dismiss: () => void;

  stageStatus: (id: StageId) => StageStatus;
  currentStage: StageId | null;
  completeStage: (id: StageId) => void;
  allComplete: boolean;

  results: { connections: number; assets: number; policies: number };
  setResult: (k: 'connections' | 'assets' | 'policies', v: number) => void;

  estate: EstateChoice | null;
  setEstate: (e: EstateChoice) => void;
  concern: ConcernChoice;
  setConcern: (c: ConcernChoice) => void;

  conductorOpen: boolean;
  openConductor: (atStage?: StageId) => void;
  closeConductor: () => void;
  conductorStage: StageId;

  reset: () => void;
}

const Ctx = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { try { localStorage.removeItem('trust-onboarding-dismissed'); } catch {} }, []);

  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [done, setDone] = useState<Set<StageId>>(new Set());
  const [results, setResults] = useState({ connections: 0, assets: 0, policies: 0 });
  const [estate, setEstate] = useState<EstateChoice | null>(null);
  const [concern, setConcern] = useState<ConcernChoice>(null);
  const [conductorOpen, setConductorOpen] = useState(false);
  const [conductorStage, setConductorStage] = useState<StageId>('connect');

  const currentStage = useMemo<StageId | null>(() => {
    for (const s of STAGE_ORDER) if (!done.has(s)) return s;
    return null;
  }, [done]);

  const stageStatus = (id: StageId): StageStatus => {
    if (done.has(id)) return 'done';
    if (id === currentStage) return 'active';
    return 'locked';
  };

  const completeStage = (id: StageId) => setDone(prev => new Set(prev).add(id));
  const allComplete = STAGE_ORDER.every(s => done.has(s));

  const setResult = (k: 'connections' | 'assets' | 'policies', v: number) =>
    setResults(prev => ({ ...prev, [k]: v }));

  const openConductor = (atStage?: StageId) => {
    setConductorStage(atStage ?? currentStage ?? 'connect');
    setConductorOpen(true);
    setExpanded(false);
  };
  const closeConductor = () => setConductorOpen(false);

  const dismiss = () => { setVisible(false); setConductorOpen(false); };

  const reset = () => {
    setVisible(true); setExpanded(true); setDone(new Set());
    setResults({ connections: 0, assets: 0, policies: 0 });
    setEstate(null); setConcern(null); setConductorOpen(false); setConductorStage('connect');
  };

  return (
    <Ctx.Provider value={{
      visible, expanded, setExpanded, dismiss,
      stageStatus, currentStage, completeStage, allComplete,
      results, setResult,
      estate, setEstate, concern, setConcern,
      conductorOpen, openConductor, closeConductor, conductorStage,
      reset,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOnboarding() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useOnboarding must be used within OnboardingProvider');
  return c;
}

const STAGE_META: Record<StageId, { n: number; title: string; icon: React.ComponentType<{ className?: string }>; lockedLabel: string }> = {
  connect: { n: 1, title: 'Connect', icon: Plug, lockedLabel: 'Connect your first source' },
  discover: { n: 2, title: 'Discover', icon: Radar, lockedLabel: 'Scan for assets' },
  govern: { n: 3, title: 'Govern', icon: ShieldCheck, lockedLabel: 'Add your first policy' },
};

export function OnboardingStrip() {
  const o = useOnboarding();
  const { setCurrentPage } = useNav();

  if (!o.visible) return null;

  // ---- Complete state ----
  if (o.allComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-teal/5">
        <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-teal" />
        </div>
        <div className="text-xs text-foreground flex-1 min-w-0">
          <span className="font-medium">You are set up.</span>{' '}
          <span className="text-muted-foreground">
            Your first risk view is ready: {o.results.connections} connected, {o.results.assets} assets discovered, {o.results.policies} policy active.
          </span>
        </div>
        <button
          onClick={() => setCurrentPage('dashboards')}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
        >
          View dashboard <ArrowRight className="w-3 h-3" />
        </button>
        <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Collapsed one-liner ----
  if (!o.expanded) {
    const doneCount = STAGE_ORDER.filter(s => o.stageStatus(s) === 'done').length;
    const cur = o.currentStage ? STAGE_META[o.currentStage] : null;
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card">
        <Sparkles className="w-3.5 h-3.5 text-teal flex-shrink-0" />
        <div className="text-xs flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium">Setup</span>
          <span className="text-muted-foreground">{doneCount} of 3 done</span>
          {cur && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Next: <span className="text-foreground">{cur.title}</span></span>
            </>
          )}
        </div>
        <button
          onClick={() => o.openConductor()}
          className="text-[11px] px-2.5 py-1 rounded-md bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
        >
          Resume
        </button>
        <button onClick={() => o.setExpanded(true)} className="text-muted-foreground hover:text-foreground" aria-label="Expand">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ---- Expanded ----
  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-start gap-4 px-4 py-3">
        {/* Lead */}
        <div className="flex items-start gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal/15 flex items-center justify-center mt-0.5">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">Get to your first risk view</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Connect, scan, govern. I will walk you through it.</p>
          </div>
        </div>

        {/* Stages */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
          {STAGE_ORDER.map((id, idx) => {
            const meta = STAGE_META[id];
            const status = o.stageStatus(id);
            const Icon = meta.icon;
            const liveLabel =
              id === 'connect' ? (status === 'done' ? `${o.results.connections} source connected` : meta.lockedLabel)
              : id === 'discover' ? (status === 'done' ? `${o.results.assets} assets discovered` : status === 'active' ? meta.lockedLabel : '0 assets discovered')
              : (status === 'done' ? `${o.results.policies} policy active` : status === 'active' ? meta.lockedLabel : '0 policies active');
            return (
              <React.Fragment key={id}>
                <button
                  onClick={() => status !== 'locked' && o.openConductor(id)}
                  disabled={status === 'locked'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    status === 'active' ? 'border-teal bg-teal/5 hover:bg-teal/10'
                    : status === 'done' ? 'border-teal/30 bg-teal/5'
                    : 'border-border bg-muted/20 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === 'done' ? 'bg-teal/20' : status === 'active' ? 'bg-teal/15' : 'bg-muted'
                  }`}>
                    {status === 'done' ? <Check className="w-3 h-3 text-teal" />
                      : status === 'locked' ? <Lock className="w-3 h-3 text-muted-foreground" />
                      : <Icon className="w-3 h-3 text-teal" />}
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-medium text-foreground leading-tight">{meta.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{liveLabel}</p>
                  </div>
                </button>
                {idx < STAGE_ORDER.length - 1 && (
                  <div className="w-4 h-px bg-border flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => o.openConductor()}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-teal text-white font-medium hover:bg-teal/90 whitespace-nowrap"
          >
            <Sparkles className="w-3 h-3" /> Start with Infinity AI
          </button>
          <button
            onClick={() => setCurrentPage('integrations')}
            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 whitespace-nowrap"
          >
            Set up manually
          </button>
          <button onClick={() => o.setExpanded(false)} className="text-muted-foreground hover:text-foreground" aria-label="Collapse">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={o.dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Onboarding conductor — scripted offline assistant.
// ============================================================================

type Turn =
  | { kind: 'ai'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'chips'; prompt?: string; options: { label: string; value: string; sub?: string }[]; onPick: (v: string) => void; optional?: boolean }
  | { kind: 'handoff'; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }>; onGo: () => void }
  | { kind: 'note'; text: string };

const ESTATE_CONNECTOR: Record<EstateChoice, string> = {
  AWS: 'Amazon Web Services',
  Azure: 'Microsoft Azure',
  GlobalSign: 'GlobalSign Atlas',
  HashiCorp: 'HashiCorp Vault',
};

const CONCERN_LABEL: Record<Exclude<ConcernChoice, null>, string> = {
  expiry: 'expiry outages',
  quantum: 'quantum readiness',
  compliance: 'compliance',
};

export function OnboardingConductor() {
  const o = useOnboarding();
  const { setCurrentPage } = useNav();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startedFor = useRef<string>('');

  useEffect(() => {
    if (!o.conductorOpen) return;
    const key = `${o.conductorStage}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    setTurns([]);
    seedStage(o.conductorStage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.conductorOpen, o.conductorStage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, thinking]);

  const aiSay = (text: string, delay = 550) =>
    new Promise<void>(resolve => {
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        setTurns(t => [...t, { kind: 'ai', text }]);
        resolve();
      }, delay);
    });
  const push = (turn: Turn) => setTurns(t => [...t, turn]);

  function seedStage(stage: StageId) {
    if (stage === 'connect') return seedConnect();
    if (stage === 'discover') return seedDiscover();
    return seedGovern();
  }

  // STAGE 1: CONNECT
  async function seedConnect() {
    await aiSay('You have nothing connected yet, so every view reads zero. The fastest path to seeing your crypto risk is to connect one source, scan it, and let me flag what is exposed.');
    await aiSay('Where does most of your certificate and key estate live right now?');
    push({
      kind: 'chips',
      options: [
        { label: 'AWS', value: 'AWS', sub: 'ACM, KMS, Secrets Manager' },
        { label: 'Azure', value: 'Azure', sub: 'Key Vault' },
        { label: 'GlobalSign', value: 'GlobalSign', sub: 'internal CA' },
        { label: 'HashiCorp', value: 'HashiCorp', sub: 'vault' },
      ],
      onPick: v => pickEstate(v as EstateChoice),
    });
  }

  async function pickEstate(e: EstateChoice) {
    o.setEstate(e);
    push({ kind: 'user', text: e });
    await aiSay(`Good. I will set up the ${ESTATE_CONNECTOR[e]} connection first. We can add the rest later.`);
    await aiSay('One optional thing, and you can skip it: what is most on your mind? It just helps me tailor what I flag after the scan.');
    push({
      kind: 'chips',
      optional: true,
      options: [
        { label: 'Expiry outages', value: 'expiry' },
        { label: 'Quantum readiness', value: 'quantum' },
        { label: 'Compliance', value: 'compliance' },
        { label: 'Skip', value: 'skip' },
      ],
      onPick: v => pickConcern(v),
    });
  }

  async function pickConcern(v: string) {
    const c = (v === 'skip' ? null : v) as ConcernChoice;
    o.setConcern(c);
    push({ kind: 'user', text: v === 'skip' ? 'Skip' : CONCERN_LABEL[c as Exclude<ConcernChoice, null>] });
    if (c) await aiSay(`Noted. I will keep ${CONCERN_LABEL[c]} front of mind when I suggest a policy later.`);
    const e = o.estate ?? 'AWS';
    await aiSay(`I have opened the ${ESTATE_CONNECTOR[e]} connector and pre-filled what I can. You just add credentials, then connect. Credentials are entered in the form, never here.`);
    push({
      kind: 'handoff',
      label: `Open ${ESTATE_CONNECTOR[e]} connector`,
      sublabel: 'Pre-filled. You add credentials and connect.',
      icon: Plug,
      onGo: () => { setCurrentPage('integrations'); },
    });
    await aiSay('Once it connects, come back here and I will scan it. Or just mark it done to continue the walkthrough.', 400);
    push({
      kind: 'handoff',
      label: 'Mark connection done',
      sublabel: 'Simulates a successful connect for the walkthrough.',
      icon: Check,
      onGo: () => completeConnect(),
    });
  }

  function completeConnect() {
    o.setResult('connections', 1);
    o.completeStage('connect');
    push({ kind: 'user', text: 'Connected' });
    startedFor.current = '';
    o.openConductor('discover');
  }

  // STAGE 2: DISCOVER
  async function seedDiscover() {
    const e = o.estate ?? 'AWS';
    await aiSay(`${ESTATE_CONNECTOR[e]} is connected. I can now scan it for certificates and keys so you can see what is actually out there, capturing key algorithm and size so we can judge weak-crypto and quantum risk.`);
    await aiSay('Targets and credentials come from the connection you just made. It runs read-only, under your existing permissions. Review and start when ready.');
    push({
      kind: 'handoff',
      label: 'Open the pre-filled discovery',
      sublabel: `Scoped to ${ESTATE_CONNECTOR[e]}. Certificates and keys.`,
      icon: Radar,
      onGo: () => { setCurrentPage('discovery'); },
    });
    push({
      kind: 'handoff',
      label: 'Run scan and see results',
      sublabel: 'Simulates a completed discovery for the walkthrough.',
      icon: Check,
      onGo: () => completeDiscover(),
    });
  }

  async function completeDiscover() {
    o.setResult('assets', 40);
    o.completeStage('discover');
    push({ kind: 'user', text: 'Scan complete' });
    startedFor.current = '';
    o.openConductor('govern');
  }

  // STAGE 3: GOVERN
  async function seedGovern() {
    const concern = o.concern;
    push({ kind: 'note', text: '40 certificates and keys discovered' });
    await aiSay('Your scan found 40 certificates and keys. Six certificates are still serving TLS 1.0, and three keys are RSA-2048 that will need attention for quantum readiness.');
    const policyLine =
      concern === 'quantum'
        ? 'Since quantum readiness is your priority, I have drafted a policy that flags RSA-2048 and weaker keys. Applied to your current inventory it would flag the three keys from your scan.'
        : concern === 'compliance'
        ? 'Since compliance is your priority, I have drafted a policy that flags weak TLS as an audit finding. Applied now it would flag the six TLS 1.0 certificates.'
        : 'I have drafted a policy: flag any certificate serving TLS 1.0 or 1.1 as a violation, monitoring only for now. Applied to your current inventory it would flag the six certificates from your scan.';
    await aiSay(policyLine);
    push({
      kind: 'handoff',
      label: 'Review the drafted policy',
      sublabel: concern === 'quantum' ? 'Flags RSA-2048 and weaker. 3 current matches.' : 'Flags weak TLS. 6 current matches.',
      icon: ShieldCheck,
      onGo: () => { setCurrentPage('policy-builder'); },
    });
    push({
      kind: 'handoff',
      label: 'Activate policy and finish',
      sublabel: 'Simulates activation and completes setup.',
      icon: Check,
      onGo: () => completeGovern(),
    });
  }

  async function completeGovern() {
    o.setResult('policies', 1);
    o.completeStage('govern');
    setTurns([]);
    await aiSay('Done. You now have a connection, a discovery, and an active policy. Your dashboard finally shows real numbers: enterprise risk, inventory, and posture.');
    push({
      kind: 'handoff',
      label: 'View your first risk view',
      sublabel: 'The dashboard, now populated.',
      icon: ArrowRight,
      onGo: () => { setCurrentPage('dashboards'); o.closeConductor(); },
    });
  }

  const stageIcon = o.conductorStage === 'connect' ? Plug : o.conductorStage === 'discover' ? Radar : ShieldCheck;
  const StageIcon = stageIcon;
  const stageTitle = o.conductorStage === 'connect' ? 'Connect a source' : o.conductorStage === 'discover' ? 'Discover assets' : 'Add a policy';

  return (
    <Sheet open={o.conductorOpen} onOpenChange={(v) => { if (!v) o.closeConductor(); }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 flex flex-col bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">Infinity AI · Setup</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <StageIcon className="w-3 h-3" /> {stageTitle}
            </p>
          </div>
          <button onClick={o.closeConductor} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {turns.map((turn, i) => <TurnView key={i} turn={turn} />)}
          {thinking && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Infinity AI is thinking...
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2.5 flex-shrink-0 bg-muted/20">
          <p className="text-[10px] text-muted-foreground leading-snug">
            Runs under your existing permissions. I only pre-fill fields you could set yourself; I never accept credentials here.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  if (turn.kind === 'ai') {
    return (
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-teal/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground leading-relaxed">{turn.text}</p>
        </div>
      </div>
    );
  }
  if (turn.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3 py-1.5 rounded-lg bg-teal/15 border border-teal/30">
          <p className="text-xs text-foreground">{turn.text}</p>
        </div>
      </div>
    );
  }
  if (turn.kind === 'note') {
    return (
      <div className="flex justify-center">
        <div className="text-[10px] text-muted-foreground px-2 py-1 rounded bg-muted/40 border border-border">
          {turn.text}
        </div>
      </div>
    );
  }
  if (turn.kind === 'chips') {
    return (
      <div className="flex flex-wrap gap-2 pl-8">
        {turn.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => turn.onPick(opt.value)}
            className="flex flex-col items-start text-left px-3 py-1.5 rounded-lg border border-border bg-card hover:border-teal/50 hover:bg-teal/5 transition-colors"
          >
            <span className="text-[11px] font-medium text-foreground">{opt.label}</span>
            {opt.sub && <span className="text-[10px] text-muted-foreground">{opt.sub}</span>}
          </button>
        ))}
      </div>
    );
  }
  // handoff
  const Icon = turn.icon;
  return (
    <button
      onClick={turn.onGo}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/20 hover:bg-teal/5 hover:border-teal/40 transition-colors text-left ml-8"
      style={{ width: 'calc(100% - 2rem)' }}
    >
      <div className="w-7 h-7 rounded-lg bg-teal/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-foreground leading-tight">{turn.label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{turn.sublabel}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
