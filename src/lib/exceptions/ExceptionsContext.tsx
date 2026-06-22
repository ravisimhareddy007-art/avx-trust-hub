// Policy Exceptions (prototype, client-side, self-contained).
// Object-level: an exception exempts ONE crypto object from ONE policy.
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ExceptionStatus = 'Active' | 'Expired' | 'Revoked';

export interface PolicyException {
  id: string;
  objectId: string;
  objectName: string;
  objectType: string;
  parentAsset?: string;
  policyId: string;
  policyName: string;
  reason: string;
  expiry: string;
  createdBy: string;
  createdAt: string;
  revokedBy?: string;
  revokedAt?: string;
  endedReason?: 'Revoked' | 'Expired';
}

interface ExceptionsContextValue {
  exceptions: PolicyException[];
  statusOf: (e: PolicyException) => ExceptionStatus;
  isExcepted: (objectId: string, policyId: string) => boolean;
  activeForObject: (objectId: string) => PolicyException[];
  activeForPolicy: (policyId: string) => PolicyException[];
  raiseException: (input: Omit<PolicyException, 'id' | 'createdBy' | 'createdAt'>) => { ok: boolean; message: string };
  revokeException: (id: string, by?: string) => void;
  extendExpiry: (id: string, newExpiry: string) => void;
  setActivePolicyIds: (ids: string[]) => void;
}

const ExceptionsContext = createContext<ExceptionsContextValue | null>(null);
const todayISO = () => new Date().toISOString().slice(0, 10);

function deriveStatus(e: PolicyException): ExceptionStatus {
  if (e.revokedAt) return 'Revoked';
  if (e.expiry && e.expiry < todayISO()) return 'Expired';
  return 'Active';
}

export function ExceptionsProvider({ children }: { children: React.ReactNode }) {
  const [exceptions, setExceptions] = useState<PolicyException[]>([
    {
      id: 'exc-seed-1',
      objectId: 'cert-014',
      objectName: 'legacy-appliance.internal',
      objectType: 'TLS Certificate',
      parentAsset: 'legacy-appliance-01',
      policyId: 'oob-003',
      policyName: 'Self-Signed Server Certificate',
      reason: 'Vendor appliance cannot present a CA-issued certificate; compensating network controls in place.',
      expiry: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      createdBy: 'compliance-officer',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ]);

  const [activePolicyIds, setActivePolicyIdsState] = useState<Set<string> | null>(null);
  const lastIdsRef = useRef<string>('');

  const setActivePolicyIds = useCallback((ids: string[]) => {
    const sorted = [...ids].sort();
    const key = sorted.join('|');
    if (key === lastIdsRef.current) return;
    lastIdsRef.current = key;
    setActivePolicyIdsState(new Set(sorted));
  }, []);

  const policyActive = useCallback((policyId: string) =>
    activePolicyIds === null ? true : activePolicyIds.has(policyId),
    [activePolicyIds]);

  const statusOf = useCallback((e: PolicyException) => deriveStatus(e), []);

  const isExcepted = useCallback((objectId: string, policyId: string) =>
    exceptions.some(e => e.objectId === objectId && e.policyId === policyId && deriveStatus(e) === 'Active' && policyActive(policyId)),
    [exceptions, policyActive]);

  const activeForObject = useCallback((objectId: string) =>
    exceptions.filter(e => e.objectId === objectId && deriveStatus(e) === 'Active' && policyActive(e.policyId)),
    [exceptions, policyActive]);

  const activeForPolicy = useCallback((policyId: string) =>
    policyActive(policyId)
      ? exceptions.filter(e => e.policyId === policyId && deriveStatus(e) === 'Active')
      : [],
    [exceptions, policyActive]);

  const raiseException = useCallback((input: Omit<PolicyException, 'id' | 'createdBy' | 'createdAt'>) => {
    if (!input.reason?.trim()) return { ok: false, message: 'A justification is required.' };
    if (!input.expiry?.trim()) return { ok: false, message: 'An expiry date is required.' };
    if (input.expiry < todayISO()) return { ok: false, message: 'Expiry must be in the future.' };
    const existing = exceptions.find(e => e.objectId === input.objectId && e.policyId === input.policyId && deriveStatus(e) === 'Active');
    if (existing) {
      setExceptions(prev => prev.map(e => e.id === existing.id ? { ...e, reason: input.reason, expiry: input.expiry } : e));
      return { ok: true, message: 'Existing exception updated.' };
    }
    const rec: PolicyException = { ...input, id: `exc-${Date.now()}`, createdBy: 'current-user', createdAt: new Date().toISOString() };
    setExceptions(prev => [rec, ...prev]);
    return { ok: true, message: 'Exception raised.' };
  }, [exceptions]);

  const revokeException = useCallback((id: string, by = 'current-user') => {
    setExceptions(prev => prev.map(e => e.id === id ? { ...e, revokedBy: by, revokedAt: new Date().toISOString(), endedReason: 'Revoked' } : e));
  }, []);

  const extendExpiry = useCallback((id: string, newExpiry: string) => {
    setExceptions(prev => prev.map(e => e.id === id ? { ...e, expiry: newExpiry } : e));
  }, []);

  return (
    <ExceptionsContext.Provider value={{ exceptions, statusOf, isExcepted, activeForObject, activeForPolicy, raiseException, revokeException, extendExpiry, setActivePolicyIds }}>
      {children}
    </ExceptionsContext.Provider>
  );
}

export function useExceptions() {
  const ctx = useContext(ExceptionsContext);
  if (!ctx) throw new Error('useExceptions must be used within ExceptionsProvider');
  return ctx;
}

export function effectiveViolations(rawCount: number, exceptedCount: number): number {
  return Math.max(0, rawCount - exceptedCount);
}
