import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { mockITAssets } from '@/data/inventoryMockData';
import { computeERS, defaultBI, type ErsBreakdown } from '@/lib/risk/ers';
import type { BusinessImpact } from '@/lib/risk/types';

export interface BiAuditEntry {
  ts: string;
  assetId: string;
  from: BusinessImpact;
  to: BusinessImpact;
  justification: string;
  actor: string;
}

interface RiskCtx {
  biMap: Record<string, BusinessImpact>;
  setBI: (assetId: string, value: BusinessImpact, justification?: string) => void;
  ers: ErsBreakdown;
  audit: BiAuditEntry[];
  auditFor: (assetId: string) => BiAuditEntry[];
}

const Ctx = createContext<RiskCtx | null>(null);

export function RiskProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => {
    const m: Record<string, BusinessImpact> = {};
    mockITAssets.forEach(a => { m[a.id] = defaultBI(a); });
    return m;
  }, []);
  const [biMap, setBiMap] = useState<Record<string, BusinessImpact>>(initial);
  const [audit, setAudit] = useState<BiAuditEntry[]>([]);

  const setBI = useCallback((assetId: string, value: BusinessImpact, justification = '') => {
    setBiMap(prev => {
      if (prev[assetId] === value) return prev;
      setAudit(a => [
        {
          ts: new Date().toISOString(),
          assetId,
          from: prev[assetId],
          to: value,
          justification: justification || '(no justification provided)',
          actor: 'you',
        },
        ...a,
      ]);
      return { ...prev, [assetId]: value };
    });
  }, []);

  const ers = useMemo(() => computeERS(mockITAssets, biMap), [biMap]);

  const auditFor = useCallback(
    (assetId: string) => audit.filter(a => a.assetId === assetId),
    [audit]
  );

  return (
    <Ctx.Provider value={{ biMap, setBI, ers, audit, auditFor }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRisk() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useRisk must be used inside RiskProvider');
  return c;
}
