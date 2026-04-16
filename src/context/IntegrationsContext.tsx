import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { connectors } from '@/data/mockData';

export type IntegrationType = 'CA' | 'Cloud' | 'Vault' | 'CMDB' | 'IAM' | 'SIEM' | 'Ticketing' | 'HSM' | 'ADC' | 'Server' | 'Firewall' | 'WAF' | 'SDN' | 'DevOps' | 'PAM' | 'DDI';

export interface ConnectedIntegration {
  name: string;
  integrationType: IntegrationType;
  status: 'connected' | 'disconnected';
  lastSync: string;
  assets: number;
  account?: string; // user-defined integration name (e.g. "digicert-payments-prod")
}

const groupToType: Record<string, IntegrationType> = {
  ca: 'CA',
  cloud: 'Cloud',
  hsm: 'HSM',
  pam: 'Vault',
  itsm: 'Ticketing',
  ddi: 'DDI',
  servers: 'Server',
  adc: 'ADC',
  firewall: 'Firewall',
  waf: 'WAF',
  sdn: 'SDN',
  devops: 'DevOps',
};

interface Ctx {
  all: ConnectedIntegration[];
  connected: ConnectedIntegration[];
  byType: (t: IntegrationType) => ConnectedIntegration[];
}

const IntegrationsContext = createContext<Ctx | null>(null);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const all: ConnectedIntegration[] = [];
    Object.entries(connectors as Record<string, any[]>).forEach(([group, items]) => {
      const type = groupToType[group];
      if (!type) return;
      items.forEach((item: any) => {
        all.push({
          name: item.name,
          integrationType: type,
          status: item.status,
          lastSync: item.lastSync,
          assets: item.assets,
          account: item.status === 'connected' ? `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-prod` : undefined,
        });
      });
    });
    const connected = all.filter(i => i.status === 'connected');
    return {
      all,
      connected,
      byType: (t: IntegrationType) => connected.filter(i => i.integrationType === t),
    };
  }, []);

  return <IntegrationsContext.Provider value={value}>{children}</IntegrationsContext.Provider>;
}

export function useIntegrations() {
  const c = useContext(IntegrationsContext);
  if (!c) throw new Error('useIntegrations must be used inside IntegrationsProvider');
  return c;
}
