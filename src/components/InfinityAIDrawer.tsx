import React, { useState, useRef, useEffect } from 'react';
import { useAgent, type PlanStep } from '@/context/AgentContext';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Sparkles, Send, Check, Loader2, X, ArrowRight, Undo2,
  AlertTriangle, BookOpen, Wrench, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';

function StatusDot({ status }: { status: PlanStep['status'] }) {
  if (status === 'success') return <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-success" /></div>;
  if (status === 'running') return <div className="w-4 h-4 rounded-full bg-teal/20 flex items-center justify-center"><Loader2 className="w-2.5 h-2.5 text-teal animate-spin" /></div>;
  if (status === 'failed') return <div className="w-4 h-4 rounded-full bg-coral/20 flex items-center justify-center"><X className="w-2.5 h-2.5 text-coral" /></div>;
  return <div className="w-4 h-4 rounded-full border border-border" />;
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

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col bg-card border-l border-teal/20">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-teal" />
              Infinity AI
              <span className="text-[9px] font-normal px-1.5 py-0.5 bg-teal/10 text-teal rounded">Agent</span>
            </SheetTitle>
            <button
              onClick={() => setShowUndo(!showUndo)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Undo2 className="w-3 h-3" /> Undo ({undoStack.filter(u => !u.rolledBack).length})
            </button>
          </div>
          {selectedEntity && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
              <Eye className="w-3 h-3 text-teal" />
              Context: <span className="text-foreground font-medium">{selectedEntity.name}</span>
              <span className="px-1 py-0.5 bg-secondary/50 rounded">{selectedEntity.kind}</span>
            </div>
          )}
        </SheetHeader>

        {/* Undo stack panel */}
        {showUndo && (
          <div className="border-b border-border bg-secondary/30 p-3 max-h-48 overflow-y-auto scrollbar-thin">
            <div className="text-[10px] font-semibold text-muted-foreground mb-2">Session Undo Stack</div>
            {undoStack.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">No agent actions yet.</div>
            ) : (
              <div className="space-y-1.5">
                {undoStack.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-card rounded p-2 border border-border">
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
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                I'm an agent — I propose plans, you approve, I execute and verify. I have access to:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { icon: Eye, label: 'Inventory context' },
                  { icon: BookOpen, label: 'Knowledge base' },
                  { icon: Wrench, label: 'Remediation engine' },
                  { icon: Sparkles, label: 'Group builder' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 bg-secondary/50 rounded text-[10px] text-muted-foreground">
                    <s.icon className="w-3 h-3 text-teal" /> {s.label}
                  </div>
                ))}
              </div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-3">Try:</div>
              <div className="space-y-1">
                {[
                  'Fix all expired certificates in the Production group',
                  'Group all my weak RSA keys',
                  'Rotate orphaned SSH keys',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => sendUserMessage(q)}
                    className="w-full text-left px-2.5 py-1.5 bg-secondary/30 border border-border rounded text-[10px] text-muted-foreground hover:text-foreground hover:border-teal/30"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[92%] rounded-lg p-2.5 text-[11px] leading-relaxed ${
                msg.role === 'user' ? 'bg-teal text-primary-foreground' : 'bg-secondary/50 text-foreground border border-border'
              }`}>
                <div className="whitespace-pre-line">{msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}</div>

                {/* Option Picker — Human Overrule */}
                {msg.optionPicker && !msg.optionPicker.resolved && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-start gap-1.5 mb-2">
                      <AlertTriangle className="w-3 h-3 text-amber flex-shrink-0 mt-0.5" />
                      <div className="text-[10px] text-amber font-medium">{msg.optionPicker.question}</div>
                    </div>
                    <div className="space-y-1">
                      {msg.optionPicker.options.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => resolveOption(msg.id, opt.value)}
                          className="w-full text-left px-2 py-1.5 bg-card border border-border rounded text-[10px] hover:border-teal/40 hover:bg-teal/5"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msg.optionPicker?.resolved && (
                  <div className="mt-1 text-[9px] text-success">✓ Selected</div>
                )}

                {/* Draft Plan */}
                {msg.plan && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-[10px] font-semibold text-foreground mb-1.5">📋 {msg.plan.goal}</div>
                    <div className="space-y-1.5">
                      {msg.plan.steps.map((step, idx) => (
                        <div key={step.id} className="bg-card rounded p-2 border border-border">
                          <div className="flex items-start gap-2">
                            <StatusDot status={step.status} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-medium text-foreground">{idx + 1}. {step.title}</div>
                              <div className="text-[9px] text-muted-foreground mt-0.5">{step.detail}</div>
                              {step.connector && (
                                <div className="text-[9px] text-teal mt-0.5">via {step.connector}</div>
                              )}
                              {step.verification && step.status === 'success' && (
                                <div className="text-[9px] text-success mt-1 flex items-start gap-1">
                                  <Check className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" /> {step.verification}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* HITL approval controls */}
                    {pendingPlan?.id === msg.plan.id && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={approvePlan}
                          className="flex-1 px-2 py-1.5 bg-teal text-primary-foreground rounded text-[10px] font-semibold hover:bg-teal-light flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve All
                        </button>
                        <button
                          onClick={cancelPlan}
                          className="px-2 py-1.5 bg-muted text-muted-foreground rounded text-[10px] hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                    {msg.citations.map((c, i) => (
                      <div key={i} className="flex items-start gap-1 text-[9px] text-muted-foreground">
                        <BookOpen className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-teal" />
                        <div><span className="font-medium text-foreground">{c.source}</span> — {c.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Execution progress bar */}
          {executionProgress && (
            <div className="bg-teal/5 border border-teal/30 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span className="text-teal font-semibold">Executing plan…</span>
                <span className="text-muted-foreground">{executionProgress.current} of {executionProgress.total}</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-teal transition-all duration-300" style={{ width: `${(executionProgress.current / executionProgress.total) * 100}%` }} />
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 border border-border rounded-lg p-2.5 flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-teal animate-spin" />
                <span className="text-[10px] text-muted-foreground">Observing context · checking connectors · drafting plan…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Tell me a goal — I'll propose a plan"
              className="flex-1 px-3 py-2 bg-muted rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-teal"
              disabled={isThinking}
            />
            <button
              onClick={submit}
              disabled={!input.trim() || isThinking}
              className="px-3 py-2 bg-teal text-primary-foreground rounded text-[10px] font-semibold hover:bg-teal-light disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[9px] text-muted-foreground mt-1.5 text-center">
            Propose → Approve → Execute → Verify · Human-in-the-loop
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
