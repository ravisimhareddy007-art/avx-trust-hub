import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  ECRSWeights,
  ECRSFactor,
  RemediationItem,
  DEFAULT_WEIGHTS,
  CURRENT_FACTOR_SCORES,
  REMEDIATION_ITEMS,
  computeECRS,
  computeProjectedScore,
  getFactorContribution,
  getNormalisedWeight,
} from '@/lib/ecrs';

// Maps driver IDs <-> feed item IDs for the narrative thread
export const driverToFeedItems: Record<string, string[]> = {
  'weak-algos':         ['6'],
  'expiring-certs':     ['1', '5'],
  'non-rotated-secrets':['8', '4'],
  'non-hsm-keys':       ['9'],
  'overpriv-ai-tokens': ['2', '10'],
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

  // ECRS — single source of truth
  weights: ECRSWeights;
  setWeights: (w: ECRSWeights) => void;
  factors: ECRSFactor[];
  score: number;                              // derived from weights + factors
  factorContribution: (id: keyof ECRSWeights) => number;
  normalisedWeight: (id: keyof ECRSWeights) => number;

  // Remediation simulator
  selectedRemediations: string[];
  toggleRemediation: (id: string) => void;
  remediationItems: RemediationItem[];
  projectedScore: number;

  // Feed-driven shrink (kept for existing UI)
  driverImpactDelta: Record<string, number>;
  resolvedFeedItems: Set<string>;
  resolvingFeedItems: Set<string>;
  resolveFeedItem: (itemId: string) => void;
}

const Ctx = createContext<DashCtx | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null);
  const [weights, setWeights] = useState<ECRSWeights>(DEFAULT_WEIGHTS);
  const [selectedRemediations, setSelectedRemediations] = useState<string[]>([]);
  const [driverImpactDelta, setDriverImpactDelta] = useState<Record<string, number>>({});
  const [resolvedFeedItems, setResolved] = useState<Set<string>>(new Set());
  const [resolvingFeedItems, setResolving] = useState<Set<string>>(new Set());

  const factors = CURRENT_FACTOR_SCORES;
  const score = useMemo(() => computeECRS(factors, weights), [factors, weights]);

  const projectedScore = useMemo(
    () => computeProjectedScore(
      score,
      REMEDIATION_ITEMS.filter(r => selectedRemediations.includes(r.id))
    ),
    [score, selectedRemediations]
  );

  const toggleRemediation = useCallback((id: string) => {
    setSelectedRemediations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const factorContribution = useCallback(
    (id: keyof ECRSWeights) => {
      const f = factors.find(x => x.id === id);
      return f ? getFactorContribution(f, weights) : 0;
    },
    [factors, weights]
  );

  const normalisedWeight = useCallback(
    (id: keyof ECRSWeights) => getNormalisedWeight(id, weights),
    [weights]
  );

  const resolveFeedItem = useCallback((itemId: string) => {
    if (resolvedFeedItems.has(itemId) || resolvingFeedItems.has(itemId)) return;
    setResolving(prev => new Set(prev).add(itemId));

    setTimeout(() => {
      const driver = feedItemToDriver[itemId];
      const impact = feedItemImpact[itemId] ?? 1;
      if (driver) {
        setDriverImpactDelta(prev => ({
          ...prev,
          [driver]: (prev[driver] ?? 0) - impact,
        }));
      }
      setResolving(prev => { const n = new Set(prev); n.delete(itemId); return n; });
      setResolved(prev => new Set(prev).add(itemId));
    }, 1800);
  }, [resolvedFeedItems, resolvingFeedItems]);

  const value = useMemo(() => ({
    hoveredDriver, setHoveredDriver,
    weights, setWeights,
    factors, score,
    factorContribution, normalisedWeight,
    selectedRemediations, toggleRemediation, remediationItems: REMEDIATION_ITEMS, projectedScore,
    driverImpactDelta,
    resolvedFeedItems, resolvingFeedItems,
    resolveFeedItem,
  }), [hoveredDriver, weights, factors, score, factorContribution, normalisedWeight,
       selectedRemediations, toggleRemediation, projectedScore,
       driverImpactDelta, resolvedFeedItems, resolvingFeedItems, resolveFeedItem]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDashboard must be used inside DashboardProvider');
  return c;
}
