import React, { createContext, useContext, useEffect, useState } from 'react';

type StepId = 'integrations' | 'discovery' | 'policy';
const ALL_STEPS: StepId[] = ['integrations', 'discovery', 'policy'];

interface OnboardingContextValue {
  dismissed: string[];
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  reset: () => void;
  showStrip: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  // Session-only state — survives navigation between pages, resets on refresh.
  // Clear any legacy persisted state from prior implementations.
  useEffect(() => {
    try { localStorage.removeItem('trust-onboarding-dismissed'); } catch {}
  }, []);

  const [dismissed, setDismissed] = useState<string[]>([...ALL_STEPS]);

  const dismiss = (id: string) =>
    setDismissed(prev => (prev.includes(id) ? prev : [...prev, id]));

  const dismissAll = () => setDismissed([...ALL_STEPS]);

  const reset = () => setDismissed([]);

  const isDismissed = (id: string) => dismissed.includes(id);

  const showStrip = !ALL_STEPS.every(id => dismissed.includes(id));

  return (
    <OnboardingContext.Provider value={{ dismissed, isDismissed, dismiss, dismissAll, reset, showStrip }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
