import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import type { CryptoAsset } from "@/data/mockData";
import type { ITAsset } from "@/data/inventoryMockData";
import {
  mockGroups,
  mockITAssets,
  matchAssetsByObjectConditions,
  type DynamicGroup,
  type GroupCondition,
} from "@/data/inventoryMockData";
import { mockAssets } from "@/data/mockData";

// Manually-added items extend the canonical types with a discoveryVector tag.
export type ManualIdentity = CryptoAsset & { discoveryVector: "Manual Entry" };
export type ManualITAsset = ITAsset & { discoveryVector: "Manual Entry" };

interface MatchedGroupHit {
  groupId: string;
  groupName: string;
}

interface RegistryCtx {
  manualIdentities: ManualIdentity[];
  manualITAssets: ManualITAsset[];
  addIdentity: (i: ManualIdentity) => MatchedGroupHit[];
  addITAsset: (a: ManualITAsset) => void;
  // Groups are owned here so every surface (Groups tab, asset table) shares one
  // source of truth and can create, delete, edit, and re-evaluate them.
  groups: DynamicGroup[];
  createGroup: (g: DynamicGroup) => void;
  deleteGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  addAssetsToGroup: (id: string, assetIds: string[]) => void;
  removeAssetFromGroup: (id: string, assetId: string) => void;
  reevaluateGroup: (id: string) => number; // returns new asset count
  reevaluateAllDynamic: () => void;
}

const InventoryRegistryContext = createContext<RegistryCtx | null>(null);

// Lightweight "dynamic group match" check — compares identity attributes against
// each group's structured conditions (or its conditionSummary fallback).
function matchesGroup(identity: ManualIdentity, group: DynamicGroup): boolean {
  if (group.type !== "Dynamic") return false;
  const conds = group.conditions ?? [];
  if (conds.length === 0) return false;

  const fieldOf = (attr: string): string | number | undefined => {
    switch (attr) {
      case "Algorithm":
        return identity.algorithm;
      case "Environment":
        return identity.environment;
      case "Status":
        return identity.status;
      case "Days to Expiry":
        return identity.daysToExpiry;
      case "Has Owner":
        return identity.owner === "Unassigned" ? "No" : "Yes";
      case "Type":
        return identity.type;
      case "PQC Risk":
        return identity.pqcRisk;
      default:
        return undefined;
    }
  };

  // AND-chain (default) with optional OR — simple eval: if any clause is OR, treat as OR.
  const hasOr = conds.some((c) => c.logic === "OR");
  const results = conds.map((c) => {
    const v = fieldOf(c.attribute);
    if (v === undefined) return false;
    if (c.operator === "equals") return String(v) === c.value;
    if (c.operator === "less_than") return Number(v) < Number(c.value);
    if (c.operator === "greater_than") return Number(v) > Number(c.value);
    return false;
  });
  return hasOr ? results.some(Boolean) : results.every(Boolean);
}

export function InventoryRegistryProvider({ children }: { children: ReactNode }) {
  const [manualIdentities, setManualIdentities] = useState<ManualIdentity[]>([]);
  const [manualITAssets, setManualITAssets] = useState<ManualITAsset[]>([]);
  const [groups, setGroups] = useState<DynamicGroup[]>(mockGroups);

  // Underlying crypto objects for a set of assets (manual membership derivation).
  const objectIdsForAssets = useCallback((assetIds: string[]): string[] => {
    const wanted = new Set(assetIds);
    return mockITAssets.filter((a) => wanted.has(a.id)).flatMap((a) => a.cryptoObjectIds);
  }, []);

  const createGroup = useCallback((g: DynamicGroup) => {
    setGroups((prev) => [...prev, g]);
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const renameGroup = useCallback((id: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  }, []);

  const addAssetsToGroup = useCallback(
    (id: string, assetIds: string[]) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;
          const mergedAssets = [...new Set([...g.assetIds, ...assetIds])];
          const mergedObjects = [...new Set([...g.objectIds, ...objectIdsForAssets(assetIds)])];
          return {
            ...g,
            assetIds: mergedAssets,
            assetCount: mergedAssets.length,
            objectIds: mergedObjects,
            objectCount: mergedObjects.length,
            lastEvaluated: "Just now",
          };
        }),
      );
    },
    [objectIdsForAssets],
  );

  const removeAssetFromGroup = useCallback(
    (id: string, assetId: string) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;
          const nextAssets = g.assetIds.filter((a) => a !== assetId);
          const nextObjects = objectIdsForAssets(nextAssets);
          return {
            ...g,
            assetIds: nextAssets,
            assetCount: nextAssets.length,
            objectIds: nextObjects,
            objectCount: nextObjects.length,
            lastEvaluated: "Just now",
          };
        }),
      );
    },
    [objectIdsForAssets],
  );

  // Recompute a dynamic group's membership against current inventory.
  const reevaluateGroup = useCallback((id: string): number => {
    let count = 0;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id || g.type !== "Dynamic") {
          if (g.id === id) count = g.assetCount;
          return g;
        }
        const m = matchAssetsByObjectConditions(g.conditions ?? [], mockAssets);
        count = m.assetIds.length;
        return {
          ...g,
          assetIds: m.assetIds,
          assetCount: m.assetIds.length,
          objectIds: m.objectIds,
          objectCount: m.objectIds.length,
          lastEvaluated: "Just now",
        };
      }),
    );
    return count;
  }, []);

  const reevaluateAllDynamic = useCallback(() => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.type !== "Dynamic") return g;
        const m = matchAssetsByObjectConditions(g.conditions ?? [], mockAssets);
        return {
          ...g,
          assetIds: m.assetIds,
          assetCount: m.assetIds.length,
          objectIds: m.objectIds,
          objectCount: m.objectIds.length,
          lastEvaluated: "Just now",
        };
      }),
    );
  }, []);

  const addIdentity = useCallback(
    (i: ManualIdentity) => {
      setManualIdentities((prev) => [i, ...prev]);
      // Live re-evaluation: a new identity can change dynamic group membership.
      reevaluateAllDynamic();
      return groups.filter((g) => matchesGroup(i, g)).map((g) => ({ groupId: g.id, groupName: g.name }));
    },
    [groups, reevaluateAllDynamic],
  );

  const addITAsset = useCallback((a: ManualITAsset) => {
    setManualITAssets((prev) => [a, ...prev]);
  }, []);

  const value = useMemo<RegistryCtx>(
    () => ({
      manualIdentities,
      manualITAssets,
      addIdentity,
      addITAsset,
      groups,
      createGroup,
      deleteGroup,
      renameGroup,
      addAssetsToGroup,
      removeAssetFromGroup,
      reevaluateGroup,
      reevaluateAllDynamic,
    }),
    [
      manualIdentities,
      manualITAssets,
      addIdentity,
      addITAsset,
      groups,
      createGroup,
      deleteGroup,
      renameGroup,
      addAssetsToGroup,
      removeAssetFromGroup,
      reevaluateGroup,
      reevaluateAllDynamic,
    ],
  );

  return <InventoryRegistryContext.Provider value={value}>{children}</InventoryRegistryContext.Provider>;
}

export function useInventoryRegistry() {
  const ctx = useContext(InventoryRegistryContext);
  if (!ctx) throw new Error("useInventoryRegistry must be used inside InventoryRegistryProvider");
  return ctx;
}
