// src/context/RiskContext.tsx
//
// Four additions to expose QES alongside ERS. Everything else unchanged.
// (A) imports, (B) context type, (C) provider compute, (D) provider value.

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { mockITAssets } from "@/data/inventoryMockData";
import { computeERS, defaultBI, type ErsBreakdown } from "@/lib/risk/ers";
import { type BusinessImpact } from "@/lib/risk/types";
// (A) NEW: QES + quantum inputs
import { computeQES, DEFAULT_PROFILE, DEFAULT_Q_DAY, type QesBreakdown, type DeadlineProfileId } from "@/lib/risk/qes";
import { mockAssets } from "@/data/mockData";
import { mockProtocols } from "@/data/cryptoStackMockData";
import { computePqcReadiness, type PqcReadiness } from "@/lib/pqcReadiness";

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
  // (B) NEW: quantum lens flows through the same context
  qes: QesBreakdown;
  readiness: PqcReadiness;
  profileId: DeadlineProfileId;
  setProfileId: (p: DeadlineProfileId) => void;
  qDay: number;
  setQDay: (y: number) => void;
  audit: BiAuditEntry[];
  auditFor: (assetId: string) => BiAuditEntry[];
}

const Ctx = createContext<RiskCtx | null>(null);

export function RiskProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => {
    const m: Record<string, BusinessImpact> = {};
    mockITAssets.forEach((a) => {
      m[a.id] = defaultBI(a);
    });
    return m;
  }, []);
  const [biMap, setBiMap] = useState<Record<string, BusinessImpact>>(initial);
  const [audit, setAudit] = useState<BiAuditEntry[]>([]);

  const setBI = useCallback((assetId: string, value: BusinessImpact, justification = "") => {
    setBiMap((prev) => {
      if (prev[assetId] === value) return prev;
      setAudit((a) => [
        {
          ts: new Date().toISOString(),
          assetId,
          from: prev[assetId],
          to: value,
          justification: justification || "(no justification provided)",
          actor: "you",
        },
        ...a,
      ]);
      return { ...prev, [assetId]: value };
    });
  }, []);

  const ers = useMemo(() => computeERS(mockITAssets, biMap), [biMap]);

  // (C) NEW: quantum state + score, computed once here, read everywhere via useRisk()
  const [profileId, setProfileId] = useState<DeadlineProfileId>(DEFAULT_PROFILE);
  const [qDay, setQDay] = useState<number>(DEFAULT_Q_DAY);
  const qes = useMemo(() => computeQES(mockAssets, mockProtocols, qDay), [qDay]);
  const readiness = useMemo(() => computePqcReadiness(mockAssets, qDay), [qDay]);

  const auditFor = useCallback((assetId: string) => audit.filter((a) => a.assetId === assetId), [audit]);

  return (
    // (D) NEW: qes, profileId, setProfileId, qDay, setQDay added to the value
    <Ctx.Provider
      value={{ biMap, setBI, ers, qes, readiness, profileId, setProfileId, qDay, setQDay, audit, auditFor }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useRisk() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRisk must be used inside RiskProvider");
  return c;
}
