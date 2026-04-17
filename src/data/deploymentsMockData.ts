// Mock data for certificate deployment workflows.
// Each deployment is created via the Deploy-to-Device flow and tracked
// in Remediation > Certificates > Deployments.

export type DeploymentStatus = 'pending' | 'in-progress' | 'success' | 'failed';

export interface DeploymentLogEntry {
  ts: string;        // human time
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface DeploymentTargetResult {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  status: DeploymentStatus;
  message?: string;
}

export interface CertDeployment {
  id: string;                       // e.g. DEP-2026-0421
  certName: string;
  certId: string;
  initiatedBy: string;
  initiatedAt: string;              // human time
  initiatedAtRaw: string;           // ISO
  status: DeploymentStatus;         // overall (worst-of)
  targets: DeploymentTargetResult[];
  config: {
    replaceExisting: boolean;
    restartService: boolean;
  };
  logs: DeploymentLogEntry[];
  source: 'inventory' | 'critical-action-feed' | 'device-detail' | 'bulk';
}

export const mockDeployments: CertDeployment[] = [
  {
    id: 'DEP-2026-0421',
    certName: '*.payments.acmecorp.com',
    certId: 'cert-001',
    initiatedBy: 'sarah.chen@acmecorp.com',
    initiatedAt: '4 min ago',
    initiatedAtRaw: '2026-04-17T10:26:00Z',
    status: 'in-progress',
    source: 'inventory',
    config: { replaceExisting: true, restartService: false },
    targets: [
      { deviceId: 'dev-f5-001', deviceName: 'f5-prod-01', deviceType: 'F5 BIG-IP', status: 'success', message: 'Bound to /Common/payments-vip:443' },
      { deviceId: 'dev-nginx-001', deviceName: 'nginx-edge-01', deviceType: 'NGINX', status: 'in-progress', message: 'Reloading service' },
    ],
    logs: [
      { ts: '10:26:01', level: 'info', message: 'Workflow created · 2 targets' },
      { ts: '10:26:02', level: 'info', message: 'Fetching cert + chain from CA' },
      { ts: '10:26:08', level: 'success', message: 'f5-prod-01 · cert installed and bound' },
      { ts: '10:26:14', level: 'info', message: 'nginx-edge-01 · cert pushed via SSH, reloading' },
    ],
  },
  {
    id: 'DEP-2026-0420',
    certName: 'api.internal.acmecorp.com',
    certId: 'cert-002',
    initiatedBy: 'mike.rodriguez@acmecorp.com',
    initiatedAt: '32 min ago',
    initiatedAtRaw: '2026-04-17T09:58:00Z',
    status: 'success',
    source: 'critical-action-feed',
    config: { replaceExisting: true, restartService: true },
    targets: [
      { deviceId: 'dev-f5-001', deviceName: 'f5-prod-01', deviceType: 'F5 BIG-IP', status: 'success', message: 'Bound + service restarted' },
    ],
    logs: [
      { ts: '09:58:01', level: 'info', message: 'Workflow created · 1 target' },
      { ts: '09:58:09', level: 'success', message: 'f5-prod-01 · install + restart OK' },
      { ts: '09:58:10', level: 'success', message: 'Deployment complete' },
    ],
  },
  {
    id: 'DEP-2026-0419',
    certName: 'portal.acmecorp.com',
    certId: 'cert-003',
    initiatedBy: 'lisa.park@acmecorp.com',
    initiatedAt: '1 hour ago',
    initiatedAtRaw: '2026-04-17T09:30:00Z',
    status: 'failed',
    source: 'device-detail',
    config: { replaceExisting: true, restartService: false },
    targets: [
      { deviceId: 'dev-iis-001', deviceName: 'iis-corp-01', deviceType: 'Microsoft IIS', status: 'failed', message: 'ERROR_INVALID_PARAMETER on binding update' },
    ],
    logs: [
      { ts: '09:30:01', level: 'info', message: 'Workflow created · 1 target' },
      { ts: '09:30:05', level: 'info', message: 'iis-corp-01 · cert imported into Windows store' },
      { ts: '09:30:07', level: 'error', message: 'Binding update failed: ERROR_INVALID_PARAMETER' },
      { ts: '09:30:07', level: 'error', message: 'Deployment failed — retry available' },
    ],
  },
  {
    id: 'DEP-2026-0418',
    certName: 'cdn.acmecorp.com',
    certId: 'cert-004',
    initiatedBy: 'sarah.chen@acmecorp.com',
    initiatedAt: '3 hours ago',
    initiatedAtRaw: '2026-04-17T07:30:00Z',
    status: 'success',
    source: 'inventory',
    config: { replaceExisting: false, restartService: false },
    targets: [
      { deviceId: 'dev-nginx-001', deviceName: 'nginx-edge-01', deviceType: 'NGINX', status: 'success' },
      { deviceId: 'dev-haproxy-001', deviceName: 'haproxy-lb-01', deviceType: 'HAProxy', status: 'success' },
    ],
    logs: [
      { ts: '07:30:01', level: 'info', message: 'Workflow created · 2 targets' },
      { ts: '07:30:18', level: 'success', message: 'All targets reconciled' },
    ],
  },
  {
    id: 'DEP-2026-0417',
    certName: 'payments-tls (k8s)',
    certId: 'cert-005',
    initiatedBy: 'auto-renew',
    initiatedAt: '6 hours ago',
    initiatedAtRaw: '2026-04-17T04:30:00Z',
    status: 'pending',
    source: 'bulk',
    config: { replaceExisting: true, restartService: false },
    targets: [
      { deviceId: 'dev-k8s-001', deviceName: 'eks-payments-prod', deviceType: 'Kubernetes', status: 'pending', message: 'Awaiting maintenance window' },
    ],
    logs: [
      { ts: '04:30:01', level: 'info', message: 'Workflow created · scheduled for next window' },
    ],
  },
];
