import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import type { CryptoAsset } from '@/data/mockData';
import type { ITAsset } from '@/data/inventoryMockData';
import { mockGroups, type DynamicGroup } from '@/data/inventoryMockData';

// Manually-added items extend the canonical types with a discoveryVector tag.
export type ManualIdentity = CryptoAsset & { discoveryVector: 'Manual Entry' };
export type ManualITAsset = ITAsset & { discoveryVector: 'Manual Entry' };

interface MatchedGroupHit {
  groupId: string;
  groupName: string;
}

interface RegistryCtx {
  manualIdentities: ManualIdentity[];
  manualITAssets: ManualITAsset[];
  addIdentity: (i: ManualIdentity) => MatchedGroupHit[];
  addITAsset: (a: ManualITAsset) => void;
}

const InventoryRegistryContext = createContext<RegistryCtx | null>(null);

// Lightweight "dynamic group match" check — compares identity attributes against
// each group's structured conditions (or its conditionSummary fallback).
function matchesGroup(identity: ManualIdentity, group: DynamicGroup): boolean {
  if (group.type !== 'Dynamic') return false;
  const conds = group.conditions ?? [];
  if (conds.length === 0) return false;

  const fieldOf = (attr: string): string | number | undefined => {
    switch (attr) {
      case 'Algorithm': return identity.algorithm;
      case 'Environment': return identity.environment;
      case 'Status': return identity.status;
      case 'Days to Expiry': return identity.daysToExpiry;
      case 'Has Owner': return identity.owner === 'Unassigned' ? 'No' : 'Yes';
      case 'Type': return identity.type;
      case 'PQC Risk': return identity.pqcRisk;
      default: return undefined;
    }
  };

  // AND-chain (default) with optional OR — simple eval: if any clause is OR, treat as OR.
  const hasOr = conds.some(c => c.logic === 'OR');
  const results = conds.map(c => {
    const v = fieldOf(c.attribute);
    if (v === undefined) return false;
    if (c.operator === 'equals') return String(v) === c.value;
    if (c.operator === 'less_than') return Number(v) < Number(c.value);
    if (c.operator === 'greater_than') return Number(v) > Number(c.value);
    return false;
  });
  return hasOr ? results.some(Boolean) : results.every(Boolean);
}

export function InventoryRegistryProvider({ children }: { children: ReactNode }) {
  const [manualIdentities, setManualIdentities] = useState<ManualIdentity[]>([]);
  const [manualITAssets, setManualITAssets] = useState<ManualITAsset[]>([]);

  const addIdentity = useCallback((i: ManualIdentity) => {
    setManualIdentities(prev => [i, ...prev]);
    // Return any dynamic groups that the new identity now satisfies.
    return mockGroups
      .filter(g => matchesGroup(i, g))
      .map(g => ({ groupId: g.id, groupName: g.name }));
  }, []);

  const addITAsset = useCallback((a: ManualITAsset) => {
    setManualITAssets(prev => [a, ...prev]);
  }, []);

  const value = useMemo<RegistryCtx>(() => ({
    manualIdentities,
    manualITAssets,
    addIdentity,
    addITAsset,
  }), [manualIdentities, manualITAssets, addIdentity, addITAsset]);

  return (
    <InventoryRegistryContext.Provider value={value}>
      {children}
    </InventoryRegistryContext.Provider>
  );
}

export function useInventoryRegistry() {
  const ctx = useContext(InventoryRegistryContext);
  if (!ctx) throw new Error('useInventoryRegistry must be used inside InventoryRegistryProvider');
  return ctx;
}
