import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';

export type ConnectionStatus = 'connected' | 'tested-not-saved' | 'disconnected';

export interface SavedConnection {
  id: string;
  name: string;
  vaultType: string;
  vaultUrl: string;
  authMethod: string;
  namespace?: string;
  tlsConfig?: Record<string, unknown>;
  status: ConnectionStatus;
  lastVerified: number;
  createdAt: number;
  // credentials are intentionally opaque — never displayed
  credentials?: Record<string, unknown>;
}

interface Ctx {
  connections: SavedConnection[];
  saveConnection: (conn: Omit<SavedConnection, 'id' | 'createdAt' | 'lastVerified' | 'status'> & { id?: string; status?: ConnectionStatus }) => SavedConnection;
  removeConnection: (id: string) => void;
  byVaultType: (vaultType: string) => SavedConnection[];
  getById: (id: string) => SavedConnection | undefined;
}

const ConnectionsContext = createContext<Ctx | null>(null);

const seed: SavedConnection[] = [];

export function ConnectionsProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<SavedConnection[]>(seed);

  const saveConnection: Ctx['saveConnection'] = useCallback((conn) => {
    const now = Date.now();
    let saved!: SavedConnection;
    setConnections(prev => {
      const existingIdx = conn.id
        ? prev.findIndex(c => c.id === conn.id)
        : prev.findIndex(c => c.name === conn.name && c.vaultType === conn.vaultType);
      if (existingIdx >= 0) {
        saved = {
          ...prev[existingIdx],
          ...conn,
          id: prev[existingIdx].id,
          status: conn.status ?? 'connected',
          lastVerified: now,
        };
        const next = [...prev];
        next[existingIdx] = saved;
        return next;
      }
      saved = {
        id: `conn_${now}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        lastVerified: now,
        status: conn.status ?? 'connected',
        ...conn,
      } as SavedConnection;
      return [...prev, saved];
    });
    return saved;
  }, []);

  const removeConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const value = useMemo<Ctx>(() => ({
    connections,
    saveConnection,
    removeConnection,
    byVaultType: (vaultType: string) => connections.filter(c => c.vaultType === vaultType),
    getById: (id: string) => connections.find(c => c.id === id),
  }), [connections, saveConnection, removeConnection]);

  return <ConnectionsContext.Provider value={value}>{children}</ConnectionsContext.Provider>;
}

export function useConnections() {
  const c = useContext(ConnectionsContext);
  if (!c) throw new Error('useConnections must be used inside ConnectionsProvider');
  return c;
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
