// Mock data for onboarded deployment-target devices.
// These are operational entities (not generic connectors).

export type DeviceType = 'F5 BIG-IP' | 'Citrix ADC' | 'NGINX' | 'Apache HTTP Server' | 'Microsoft IIS' | 'HAProxy' | 'Kubernetes';
export type DeviceHealth = 'healthy' | 'drift' | 'connection-failed' | 'deployment-failed';
export type DeviceEnv = 'Production' | 'Staging' | 'Development';

export interface InstalledCert {
  name: string;
  binding: string;            // e.g. "VIP /Common/payments-vip" or "server_name api.example.com"
  expiresOn: string;
  daysToExpiry: number;
  managedByPlatform: boolean; // false = drift candidate
  drift?: 'platform-only' | 'device-only' | 'mismatch';
}

export interface OnboardedDevice {
  id: string;
  name: string;
  type: DeviceType;
  hostFqdn: string;
  apiPort: number;
  sshPort?: number;
  environment: DeviceEnv;
  modules: string[];          // e.g. ['LTM', 'DNS']
  health: DeviceHealth;
  lastSync: string;            // human time
  lastSyncRaw: string;         // ISO
  installedCerts: InstalledCert[];
  notes?: string;
}

export const mockDevices: OnboardedDevice[] = [
  {
    id: 'dev-f5-001',
    name: 'f5-prod-01',
    type: 'F5 BIG-IP',
    hostFqdn: 'f5-prod-01.dc1.acmecorp.com',
    apiPort: 443,
    sshPort: 22,
    environment: 'Production',
    modules: ['LTM', 'DNS'],
    health: 'drift',
    lastSync: '12 min ago',
    lastSyncRaw: '2026-04-17T10:18:00Z',
    installedCerts: [
      { name: '*.payments.acmecorp.com', binding: 'VIP /Common/payments-vip:443', expiresOn: '2026-04-20', daysToExpiry: 6, managedByPlatform: true },
      { name: 'api.internal.acmecorp.com', binding: 'VIP /Common/api-internal:443', expiresOn: '2026-07-10', daysToExpiry: 87, managedByPlatform: true },
      { name: 'legacy-vpn.acmecorp.com', binding: 'VIP /Common/vpn-vip:443', expiresOn: '2026-05-01', daysToExpiry: 17, managedByPlatform: false, drift: 'device-only' },
    ],
  },
  {
    id: 'dev-citrix-001',
    name: 'citrix-adc-prod',
    type: 'Citrix ADC',
    hostFqdn: '10.0.1.100',
    apiPort: 443,
    environment: 'Production',
    modules: ['SSL'],
    health: 'connection-failed',
    lastSync: '6 hours ago',
    lastSyncRaw: '2026-04-17T04:30:00Z',
    installedCerts: [],
    notes: 'NSIP unreachable — verify network path / firewall rules.',
  },
  {
    id: 'dev-nginx-001',
    name: 'nginx-edge-01',
    type: 'NGINX',
    hostFqdn: 'edge-01.acmecorp.com',
    apiPort: 443,
    sshPort: 22,
    environment: 'Production',
    modules: ['HTTPS', 'TLS termination'],
    health: 'healthy',
    lastSync: '3 min ago',
    lastSyncRaw: '2026-04-17T10:27:00Z',
    installedCerts: [
      { name: 'cdn.acmecorp.com', binding: 'server_name cdn.acmecorp.com', expiresOn: '2026-08-01', daysToExpiry: 109, managedByPlatform: true },
      { name: 'auth.acmecorp.com', binding: 'server_name auth.acmecorp.com', expiresOn: '2026-05-30', daysToExpiry: 46, managedByPlatform: true },
    ],
  },
  {
    id: 'dev-apache-001',
    name: 'apache-web-01',
    type: 'Apache HTTP Server',
    hostFqdn: 'web-01.acmecorp.com',
    apiPort: 443,
    sshPort: 22,
    environment: 'Production',
    modules: ['mod_ssl'],
    health: 'healthy',
    lastSync: '8 min ago',
    lastSyncRaw: '2026-04-17T10:22:00Z',
    installedCerts: [
      { name: 'www.acmecorp.com', binding: 'VirtualHost *:443', expiresOn: '2026-06-15', daysToExpiry: 62, managedByPlatform: true },
    ],
  },
  {
    id: 'dev-iis-001',
    name: 'iis-corp-01',
    type: 'Microsoft IIS',
    hostFqdn: 'iis-01.corp.acmecorp.com',
    apiPort: 5985,
    environment: 'Production',
    modules: ['HTTPS binding'],
    health: 'deployment-failed',
    lastSync: '1 hour ago',
    lastSyncRaw: '2026-04-17T09:30:00Z',
    installedCerts: [
      { name: 'portal.acmecorp.com', binding: 'Site: Default Web Site / Binding: 443', expiresOn: '2026-05-12', daysToExpiry: 28, managedByPlatform: true },
    ],
    notes: 'Last deploy failed: cert imported but binding update returned ERROR_INVALID_PARAMETER.',
  },
  {
    id: 'dev-haproxy-001',
    name: 'haproxy-lb-01',
    type: 'HAProxy',
    hostFqdn: 'lb-01.acmecorp.com',
    apiPort: 22,
    sshPort: 22,
    environment: 'Staging',
    modules: ['frontend SSL'],
    health: 'healthy',
    lastSync: '20 min ago',
    lastSyncRaw: '2026-04-17T10:10:00Z',
    installedCerts: [
      { name: 'staging-api.acmecorp.com', binding: 'frontend https-in', expiresOn: '2026-08-15', daysToExpiry: 123, managedByPlatform: true },
    ],
  },
  {
    id: 'dev-k8s-001',
    name: 'eks-payments-prod',
    type: 'Kubernetes',
    hostFqdn: 'eks-payments.us-east-1.eks.amazonaws.com',
    apiPort: 443,
    environment: 'Production',
    modules: ['TLS Secret', 'Ingress'],
    health: 'healthy',
    lastSync: '2 min ago',
    lastSyncRaw: '2026-04-17T10:28:00Z',
    installedCerts: [
      { name: 'payments-tls (ns: payments)', binding: 'Ingress: payments-ingress / Secret: payments-tls', expiresOn: '2026-04-14', daysToExpiry: 0, managedByPlatform: true },
      { name: 'api-tls (ns: api)', binding: 'Ingress: api-ingress / Secret: api-tls', expiresOn: '2026-04-14', daysToExpiry: 0, managedByPlatform: true },
    ],
  },
];
