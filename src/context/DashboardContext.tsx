import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SCORE } from '@/data/ecrsData';

// Maps driver IDs <-> feed item IDs for the narrative thread
export const driverToFeedItems: Record<string, string[]> = {
  'weak-algos':         ['6'],            // RSA-1024 / SHA-1 cert migration
  'expiring-certs':     ['1', '5'],       // wildcard expiry, k8s renewals
  'non-rotated-secrets':['8', '4'],       // 90d rotation, hardcoded secrets
  'non-hsm-keys':       ['9'],            // keys outside HSM
  'overpriv-ai-tokens': ['2', '10'],      // gpt-orchestrator, unsponsored AI
};

export const feedItemToDriver: Record<string, string> = Object.entries(driverToFeedItems)
  .reduce((acc, [driver, items]) => {
    items.forEach(i => { acc[i] = driver; });
    return acc;
  }, {} as Record<string, string>);

// Driver impact when a feed item is resolved (pts the driver bar shrinks)
export const feedItemImpact: Record<string, number> = {
  '1': 3, '2': 2, '3': 2, '4': 3, '5': 2,
  '6': 4, '7': 1, '8': 3, '9': 2, '10': 2,
};

interface DashCtx {
  // hover wiring: driver row <-> ECRS bar + feed filter
  hoveredDriver: string | null;
  setHoveredDriver: (id: string | null) => void;

  // live state
  score: number;
  driverImpactDelta: Record<string, number>; // negative = shrink amount
  resolvedFeedItems: Set<string>;
  resolvingFeedItems: Set<string>;

  resolveFeedItem: (itemId: string) => void;
}

const Ctx = createContext<DashCtx | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null);
  const [score, setScore] = useState(SCORE);
  const [driverImpactDelta, setDriverImpactDelta] = useState<Record<string, number>>({});
  const [resolvedFeedItems, setResolved] = useState<Set<string>>(new Set());
  const [resolvingFeedItems, setResolving] = useState<Set<string>>(new Set());

  const resolveFeedItem = useCallback((itemId: string) => {
    if (resolvedFeedItems.has(itemId) || resolvingFeedItems.has(itemId)) return;
    setResolving(prev => new Set(prev).add(itemId));

    // Simulate AI execution (renew → deploy → close)
    setTimeout(() => {
      const driver = feedItemToDriver[itemId];
      const impact = feedItemImpact[itemId] ?? 1;

      // Animate score down (lower = better)
      setScore(prev => Math.max(0, prev - impact));

      if (driver) {
        setDriverImpactDelta(prev => ({
          ...prev,
          [driver]: (prev[driver] ?? 0) - impact,
        }));
      }

      setResolving(prev => {
        const n = new Set(prev); n.delete(itemId); return n;
      });
      setResolved(prev => new Set(prev).add(itemId));
    }, 1800);
  }, [resolvedFeedItems, resolvingFeedItems]);

  const value = useMemo(() => ({
    hoveredDriver, setHoveredDriver,
    score, driverImpactDelta,
    resolvedFeedItems, resolvingFeedItems,
    resolveFeedItem,
  }), [hoveredDriver, score, driverImpactDelta, resolvedFeedItems, resolvingFeedItems, resolveFeedItem]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDashboard must be used inside DashboardProvider');
  return c;
}
