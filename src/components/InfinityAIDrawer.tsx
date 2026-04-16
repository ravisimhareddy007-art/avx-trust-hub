import React, { useState, useRef, useEffect } from 'react';
import { useAgent, type PlanStep } from '@/context/AgentContext';
import { useNav } from '@/context/NavigationContext';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Send, Check, Loader2, X, Undo2,
  AlertTriangle, BookOpen, Eye, Infinity as InfinityIcon, Plus, Edit3,
} from 'lucide-react';

const contextLabel: Record<string, string> = {
  inventory: 'Inventory Context',
  discovery: 'Discovery Context',
  'policy-builder': 'Policy Context',
  groups: 'Groups Context',
  remediation: 'Remediation Context',
  tickets: 'Ticketing Context',
  quantum: 'Quantum Posture Context',
  dashboards: 'Trust Posture Context',
};

function StepDot({ status }: { status: PlanStep['status'] }) {
  if (status === 'success') return <div className="w-5 h-5 rounded-full bg-success/15 ring-1 ring-success/40 flex items-center justify-center"><Check className="w-3 h-3 text-success" /></div>;
  if (status === 'running') return <div className="w-5 h-5 rounded-full bg-teal/15 ring-1 ring-teal/40 flex items-center justify-center"><Loader2 className="w-3 h-3 text-teal animate-spin" /></div>;
  if (status === 'failed') return <div className="w-5 h-5 rounded-full bg-coral/15 ring-1 ring-coral/40 flex items-center justify-center"><X className="w-3 h-3 text-coral" /></div>;
  return <div className="w-5 h-5 rounded-full ring-1 ring-border bg-card/40 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" /></div>;
}

export default function InfinityAIDrawer() {
  const {
    drawerOpen, setDrawerOpen,
    selectedEntity,
    messages, isThinking, sendUserMessage,
    pendingPlan, approvePlan, cancelPlan, executionProgress,
    undoStack, rollback,
    resolveOption,
  } = useAgent();
  const { currentPage } = useNav();

  const [input, setInput] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, executionProgress]);

  const submit = () => {
    if (!input.trim() || isThinking) return;
    sendUserMessage(input);
    setInput('');
  };

  const ctxChip = selectedEntity?.name
    ? `Analyzing ${selectedEntity.kind === 'identity' ? 'Identity' : selectedEntity.kind === 'infrastructure' ? 'Infrastructure' : 'Inventory'}: ${selectedEntity.name}`
    : (contextLabel[currentPage] ? `Analyzing ${contextLabel[currentPage]}` : null);

  const showQuickStart = currentPage === 'inventory' && messages.length === 0 && !selectedEntity;

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[460px] p-0 flex flex-col border-l border-teal/15
                   bg-navy/60 backdrop-blur-2xl backdrop-saturate-150
                   shadow-[0_0_60px_-15px_hsl(var(--teal)/0.25)]"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        {/* Header — name + close only */}
        <SheetHeader className="px-5 py-4 border-b border-border/50 flex-shrink-0 bg-card/30 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal/30 to-teal/5 ring-1 ring-teal/30 flex items-center justify-center">
                <InfinityIcon className="w-4 h-4 text-teal" strokeWidth={2.25} />
              </div>
              <span className="text-foreground">Infinity Intelligence</span>
            </SheetTitle>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowUndo(!showUndo)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title="Session undo stack"
              >
                <Undo2 className="w-3 h-3" /> {undoStack.filter(u => !u.rolledBack).length}
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Context chip */}
          {ctxChip && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] px-2 py-1 rounded-md bg-teal/10 border border-teal/20 text-teal w-fit">
              <Eye className="w-3 h-3" />
              {ctxChip}
            </div>
          )}
        </SheetHeader>

        {/* Undo stack panel */}
        {showUndo && (
          <div className="border-b border-border/50 bg-card/20 backdrop-blur-md p-3 max-h-48 overflow-y-auto scrollbar-thin">
            <div className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Session Undo Stack</div>
            {undoStack.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">No agent actions yet.</div>
            ) : (
              <div className="space-y-1.5">
                {undoStack.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-card/40 rounded-md p-2 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-medium truncate ${u.rolledBack ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{u.summary}</div>
                      <div className="text-[9px] text-muted-foreground">{u.steps.length} step(s) · {new Date(u.timestamp).toLocaleTimeString()}</div>
                    </div>
                    {!u.rolledBack && (
                      <button
                        onClick={() => rollback(u.id)}
                        className="ml-2 px-2 py-0.5 text-[9px] rounded bg-amber/10 text-amber hover:bg-amber/20"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-[12px] text-foreground/80 leading-relaxed">
                I'm an autonomous agent. Tell me a goal — I'll <span className="text-teal font-medium">propose a plan</span>, you approve, I execute and verify.
              </div>

              {showQuickStart && (
                <button
                  onClick={() => sendUserMessage('Help me register a new asset manually')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-teal/10 border border-teal/30 rounded-md text-[11px] text-teal hover:bg-teal/15 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="font-medium">Quick Start:</span>
                  <span>Help me register a new asset manually</span>
                </button>
              )}

              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Try</div>
                <div className="space-y-1.5">
                  {[
                    'Fix all expired certificates in the Production group',
                    'Group all my weak RSA keys',
                    'Rotate orphaned SSH keys',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => sendUserMessage(q)}
                      className="w-full text-left px-3 py-2 bg-card/30 border border-border/50 rounded-md text-[11px] text-foreground/80 hover:text-foreground hover:border-teal/30 hover:bg-card/50 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[94%] rounded-lg px-3 py-2.5 text-[12px] leading-relaxed ${
                  isUser
                    ? 'bg-teal/15 text-foreground border-l-2 border-teal'
                    : 'bg-card/40 text-foreground/90 backdrop-blur-sm'
                }`}>
                  <div className="whitespace-pre-line">{msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part)}</div>

                  {/* Option Picker — Human Overrule */}
                  {msg.optionPicker && !msg.optionPicker.resolved && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <div className="flex items-start gap-1.5 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber font-medium">{msg.optionPicker.question}</div>
                      </div>
                      <div className="space-y-1">
                        {msg.optionPicker.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => resolveOption(msg.id, opt.value)}
                            className="w-full text-left px-2.5 py-2 bg-card/60 border border-border/60 rounded-md text-[11px] hover:border-teal/40 hover:bg-teal/5 transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.optionPicker?.resolved && (
                    <div className="mt-1 text-[10px] text-success">✓ Selected</div>
                  )}

                  {/* Structured Action Card — Proposed Remediation */}
                  {msg.plan && (
                    <div className="mt-3 -mx-1">
                      <div className="rounded-lg border border-teal/25 bg-gradient-to-b from-teal/[0.06] to-transparent overflow-hidden">
                        <div className="px-3 py-2 bg-teal/10 border-b border-teal/20 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                            <span className="text-[10px] font-semibold text-teal uppercase tracking-wider">Proposed Remediation</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">{msg.plan.steps.length} step{msg.plan.steps.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="px-3 py-2.5">
                          <div className="text-[11px] font-semibold text-foreground mb-2">{msg.plan.goal}</div>

                          {/* Vertical stepper */}
                          <div className="space-y-2 relative">
                            {msg.plan.steps.length > 1 && (
                              <div className="absolute left-[9px] top-5 bottom-5 w-px bg-border/60" />
                            )}
                            {msg.plan.steps.map((step, idx) => (
                              <div key={step.id} className="flex items-start gap-2.5 relative">
                                <div className="relative z-10 mt-0.5"><StepDot status={step.status} /></div>
                                <div className="flex-1 min-w-0 pb-1">
                                  <div className="text-[11px] font-medium text-foreground leading-snug">{step.title}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</div>
                                  {step.connector && (
                                    <div className="text-[9px] text-teal mt-0.5">via {step.connector}</div>
                                  )}
                                  {step.verification && step.status === 'success' && (
                                    <div className="text-[10px] text-success mt-1 flex items-start gap-1">
                                      <Check className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" /> {step.verification}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* HITL approval controls */}
                          {pendingPlan?.id === msg.plan.id && (
                            <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-border/40">
                              <button
                                onClick={approvePlan}
                                className="flex-1 px-3 py-1.5 bg-teal text-primary-foreground rounded-md text-[11px] font-semibold hover:bg-teal-light flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Check className="w-3 h-3" /> Approve & Execute
                              </button>
                              <button
                                onClick={cancelPlan}
                                className="px-3 py-1.5 bg-card/60 border border-border text-foreground/80 rounded-md text-[11px] hover:text-foreground hover:bg-card flex items-center gap-1 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" /> Edit Plan
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/40 space-y-1">
                      {msg.citations.map((c, i) => (
                        <div key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <BookOpen className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-teal" />
                          <div><span className="font-medium text-foreground/80">{c.source}</span> — {c.snippet}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Execution progress */}
          {executionProgress && (
            <div className="bg-teal/5 border border-teal/25 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-teal font-semibold">Executing plan…</span>
                <span className="text-muted-foreground">{executionProgress.current} of {executionProgress.total}</span>
              </div>
              <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
                <div className="h-full bg-teal transition-all duration-300" style={{ width: `${(executionProgress.current / executionProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-card/40 backdrop-blur-sm rounded-lg px-3 py-2.5 flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-teal animate-spin" />
                <span className="text-[11px] text-muted-foreground">Observing context · checking connectors · drafting plan…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border/50 flex-shrink-0 bg-card/20 backdrop-blur-md">
          <div className="flex gap-2 items-center bg-card/60 border border-border rounded-lg px-3 py-1 focus-within:border-teal/40 transition-colors">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Instruct Infinity Intelligence..."
              className="flex-1 bg-transparent py-2 text-[12px] focus:outline-none placeholder:text-muted-foreground/60"
              disabled={isThinking}
            />
            <button
              onClick={submit}
              disabled={!input.trim() || isThinking}
              className="p-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light disabled:opacity-40 disabled:hover:bg-teal transition-colors"
              aria-label="Send"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[9px] text-muted-foreground/70 mt-1.5 text-center tracking-wide">
            Propose · Approve · Execute · Verify — Human-in-the-Loop
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
