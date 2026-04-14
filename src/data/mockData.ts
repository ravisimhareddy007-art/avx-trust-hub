export interface SSHEndpoint {
  host: string;
  ip: string;
  port: number;
  role: 'client' | 'host';
  lastSeen: string;
}

export interface AgentMeta {
  agentType: 'Autonomous Agent' | 'Copilot' | 'Service Bot' | 'MCP Server' | 'Orchestrator' | 'Pipeline Agent';
  framework: string;
  servicesAccessed: string[];
  permissions: string[];
  permissionRisk: 'Over-privileged' | 'Right-sized' | 'Minimal';
  lastActivity: string;
  actionsPerDay: number;
  mcpTools?: string[];
}

export interface CryptoAsset {
  id: string;
  name: string;
  type: 'TLS Certificate' | 'SSH Key' | 'SSH Certificate' | 'Code-Signing Certificate' | 'K8s Workload Cert' | 'Encryption Key' | 'AI Agent Token';
  commonName: string;
  caIssuer: string;
  algorithm: string;
  keyLength: string;
  serial: string;
  owner: string;
  team: string;
  application: string;
  environment: 'Production' | 'Staging' | 'Development';
  infrastructure: string;
  discoverySource: string;
  issueDate: string;
  expiryDate: string;
  daysToExpiry: number;
  lastRotated: string;
  autoRenewal: boolean;
  rotationFrequency: string;
  status: 'Active' | 'Expiring' | 'Expired' | 'Revoked' | 'Pending' | 'Orphaned';
  pqcRisk: 'Critical' | 'High' | 'Medium' | 'Low' | 'Safe';
  policyViolations: number;
  dependencyCount: number;
  tags: string[];
  sshEndpoints?: SSHEndpoint[];
  agentMeta?: AgentMeta;
}

export const mockAssets: CryptoAsset[] = [
  { id: 'cert-001', name: '*.payments.acmecorp.com', type: 'TLS Certificate', commonName: '*.payments.acmecorp.com', caIssuer: 'DigiCert Global G2', algorithm: 'RSA-2048', keyLength: '2048', serial: '0A:3B:45:67:89:CD:EF:12', owner: 'Sarah Chen', team: 'Payments Engineering', application: 'Payment Gateway', environment: 'Production', infrastructure: 'aws-us-east-1-prod', discoverySource: 'DigiCert CertCentral', issueDate: '2025-11-15', expiryDate: '2026-04-20', daysToExpiry: 6, lastRotated: '2025-11-15', autoRenewal: false, rotationFrequency: '90 days', status: 'Expiring', pqcRisk: 'Critical', policyViolations: 3, dependencyCount: 7, tags: ['pci-dss', 'production', 'wildcard'] },
  { id: 'cert-002', name: 'api.internal.acmecorp.com', type: 'TLS Certificate', commonName: 'api.internal.acmecorp.com', caIssuer: 'Entrust L1K', algorithm: 'ECC P-256', keyLength: '256', serial: '1B:2C:3D:4E:5F:60:71:82', owner: 'Mike Rodriguez', team: 'Platform Engineering', application: 'Internal API Gateway', environment: 'Production', infrastructure: 'aws-us-west-2-prod', discoverySource: 'Network Scan', issueDate: '2026-01-10', expiryDate: '2026-07-10', daysToExpiry: 87, lastRotated: '2026-01-10', autoRenewal: true, rotationFrequency: '180 days', status: 'Active', pqcRisk: 'High', policyViolations: 0, dependencyCount: 12, tags: ['internal', 'production'] },
  { id: 'cert-003', name: 'prod-gateway.acmecorp.com', type: 'TLS Certificate', commonName: 'prod-gateway.acmecorp.com', caIssuer: 'DigiCert Global G2', algorithm: 'RSA-2048', keyLength: '2048', serial: '2C:3D:4E:5F:60:71:82:93', owner: 'Lisa Park', team: 'Infrastructure', application: 'Edge Gateway', environment: 'Production', infrastructure: 'cloudflare-edge', discoverySource: 'DigiCert CertCentral', issueDate: '2025-12-01', expiryDate: '2026-05-30', daysToExpiry: 46, lastRotated: '2025-12-01', autoRenewal: true, rotationFrequency: '180 days', status: 'Active', pqcRisk: 'Critical', policyViolations: 1, dependencyCount: 15, tags: ['production', 'edge'] },
  { id: 'cert-004', name: 'auth.acmecorp.com', type: 'TLS Certificate', commonName: 'auth.acmecorp.com', caIssuer: 'Let\'s Encrypt R3', algorithm: 'RSA-2048', keyLength: '2048', serial: '03:A1:B2:C3:D4:E5:F6:07', owner: 'James Wilson', team: 'Identity & Access', application: 'SSO Service', environment: 'Production', infrastructure: 'gcp-us-central1', discoverySource: 'CT Log Monitor', issueDate: '2026-03-01', expiryDate: '2026-05-30', daysToExpiry: 46, lastRotated: '2026-03-01', autoRenewal: true, rotationFrequency: '90 days', status: 'Active', pqcRisk: 'Critical', policyViolations: 0, dependencyCount: 8, tags: ['production', 'authentication'] },
  { id: 'cert-005', name: 'staging-api.acmecorp.com', type: 'TLS Certificate', commonName: 'staging-api.acmecorp.com', caIssuer: 'MSCA Enterprise', algorithm: 'RSA-4096', keyLength: '4096', serial: '5F:6A:7B:8C:9D:AE:BF:C0', owner: 'Dev Team', team: 'Platform Engineering', application: 'Staging API', environment: 'Staging', infrastructure: 'azure-eastus-stg', discoverySource: 'MSCA Connector', issueDate: '2026-02-15', expiryDate: '2026-08-15', daysToExpiry: 123, lastRotated: '2026-02-15', autoRenewal: false, rotationFrequency: '365 days', status: 'Active', pqcRisk: 'High', policyViolations: 1, dependencyCount: 3, tags: ['staging'] },
  { id: 'ssh-001', name: 'prod-db-01-authorized-key', type: 'SSH Key', commonName: 'prod-db-01.internal', caIssuer: 'N/A', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SHA256:nThbg6kXUp...', owner: 'Unassigned', team: 'Database Operations', application: 'PostgreSQL Primary', environment: 'Production', infrastructure: 'aws-us-east-1-prod', discoverySource: 'SSH Host Scan', issueDate: '2025-06-10', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-06-10', autoRenewal: false, rotationFrequency: 'Never', status: 'Orphaned', pqcRisk: 'Critical', policyViolations: 2, dependencyCount: 1, tags: ['database', 'orphaned'], sshEndpoints: [{ host: 'prod-db-01.internal', ip: '10.2.14.55', port: 5432, role: 'host', lastSeen: '2026-04-14 08:12' }, { host: 'app-server-03.internal', ip: '10.2.14.20', port: 22, role: 'client', lastSeen: '2026-04-14 08:10' }, { host: 'bastion-01.acmecorp.com', ip: '52.14.88.201', port: 22, role: 'client', lastSeen: '2026-04-13 22:45' }] },
  { id: 'ssh-002', name: 'jenkins-deploy-key', type: 'SSH Key', commonName: 'jenkins-ci.internal', caIssuer: 'N/A', algorithm: 'Ed25519', keyLength: '256', serial: 'SHA256:Xk2Lg8mPqR...', owner: 'CI/CD Team', team: 'DevOps', application: 'Jenkins CI', environment: 'Production', infrastructure: 'on-prem-dc1', discoverySource: 'Endpoint Agent', issueDate: '2025-09-20', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-09-20', autoRenewal: false, rotationFrequency: '90 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 4, tags: ['ci-cd', 'devops'], sshEndpoints: [{ host: 'jenkins-ci.internal', ip: '10.1.5.100', port: 22, role: 'client', lastSeen: '2026-04-14 09:00' }, { host: 'git-server.internal', ip: '10.1.5.50', port: 22, role: 'host', lastSeen: '2026-04-14 09:00' }, { host: 'prod-deploy-01.internal', ip: '10.2.14.80', port: 22, role: 'host', lastSeen: '2026-04-14 08:55' }, { host: 'staging-deploy-01.internal', ip: '10.3.8.40', port: 22, role: 'host', lastSeen: '2026-04-14 08:30' }] },
  { id: 'ssh-003', name: 'k8s-node-ssh-key', type: 'SSH Key', commonName: 'k8s-worker-pool', caIssuer: 'N/A', algorithm: 'RSA-4096', keyLength: '4096', serial: 'SHA256:Rm7pQ2xWyZ...', owner: 'Platform Team', team: 'Infrastructure', application: 'Kubernetes Cluster', environment: 'Production', infrastructure: 'aws-eks-prod', discoverySource: 'SSH Host Scan', issueDate: '2025-11-01', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-11-01', autoRenewal: false, rotationFrequency: '180 days', status: 'Active', pqcRisk: 'High', policyViolations: 1, dependencyCount: 24, tags: ['kubernetes', 'infrastructure'], sshEndpoints: [{ host: 'k8s-worker-01.eks', ip: '10.4.1.10', port: 22, role: 'host', lastSeen: '2026-04-14 09:05' }, { host: 'k8s-worker-02.eks', ip: '10.4.1.11', port: 22, role: 'host', lastSeen: '2026-04-14 09:05' }, { host: 'k8s-master-01.eks', ip: '10.4.0.5', port: 22, role: 'client', lastSeen: '2026-04-14 09:04' }] },
  { id: 'sshcert-001', name: 'jenkins-deploy-ssh-cert', type: 'SSH Certificate', commonName: 'jenkins-deploy', caIssuer: 'Internal SSH CA', algorithm: 'Ed25519', keyLength: '256', serial: 'KRL-2026-0042', owner: 'CI/CD Team', team: 'DevOps', application: 'Jenkins CI', environment: 'Production', infrastructure: 'on-prem-dc1', discoverySource: 'SSH CA Connector', issueDate: '2026-03-01', expiryDate: '2026-04-30', daysToExpiry: 16, lastRotated: '2026-03-01', autoRenewal: true, rotationFrequency: '60 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 4, tags: ['ssh-cert', 'ci-cd'], sshEndpoints: [{ host: 'jenkins-ci.internal', ip: '10.1.5.100', port: 22, role: 'client', lastSeen: '2026-04-14 09:00' }, { host: 'prod-deploy-01.internal', ip: '10.2.14.80', port: 22, role: 'host', lastSeen: '2026-04-14 08:55' }] },
  { id: 'sshcert-002', name: 'k8s-node-ssh-cert', type: 'SSH Certificate', commonName: 'k8s-node-pool', caIssuer: 'Internal SSH CA', algorithm: 'RSA-2048', keyLength: '2048', serial: 'KRL-2026-0087', owner: 'Platform Team', team: 'Infrastructure', application: 'Kubernetes Nodes', environment: 'Production', infrastructure: 'aws-eks-prod', discoverySource: 'SSH CA Connector', issueDate: '2026-01-15', expiryDate: '2026-04-15', daysToExpiry: 1, lastRotated: '2026-01-15', autoRenewal: false, rotationFrequency: '90 days', status: 'Expiring', pqcRisk: 'Critical', policyViolations: 2, dependencyCount: 24, tags: ['ssh-cert', 'kubernetes'], sshEndpoints: [{ host: 'k8s-worker-01.eks', ip: '10.4.1.10', port: 22, role: 'host', lastSeen: '2026-04-14 09:05' }, { host: 'k8s-worker-02.eks', ip: '10.4.1.11', port: 22, role: 'host', lastSeen: '2026-04-14 09:05' }, { host: 'k8s-worker-03.eks', ip: '10.4.1.12', port: 22, role: 'host', lastSeen: '2026-04-14 09:04' }, { host: 'k8s-master-01.eks', ip: '10.4.0.5', port: 22, role: 'client', lastSeen: '2026-04-14 09:04' }] },
  { id: 'cs-001', name: 'pipeline-signing-2024', type: 'Code-Signing Certificate', commonName: 'AcmeCorp Code Signing', caIssuer: 'DigiCert Code Signing CA', algorithm: 'RSA-4096', keyLength: '4096', serial: '0D:EF:12:34:56:78:9A:BC', owner: 'Release Engineering', team: 'DevOps', application: 'CI/CD Pipeline', environment: 'Production', infrastructure: 'hsm-signing-cluster', discoverySource: 'DigiCert CertCentral', issueDate: '2024-06-01', expiryDate: '2027-06-01', daysToExpiry: 413, lastRotated: '2024-06-01', autoRenewal: false, rotationFrequency: '3 years', status: 'Active', pqcRisk: 'High', policyViolations: 0, dependencyCount: 18, tags: ['code-signing', 'hsm'] },
  { id: 'cs-002', name: 'codesign-prod-hsm', type: 'Code-Signing Certificate', commonName: 'AcmeCorp Production HSM', caIssuer: 'Entrust Code Signing CA', algorithm: 'RSA-2048', keyLength: '2048', serial: 'EN:TR:US:T0:01:23:45:67', owner: 'Security Team', team: 'Security Operations', application: 'Production Releases', environment: 'Production', infrastructure: 'thales-luna-hsm', discoverySource: 'HSM Connector', issueDate: '2025-01-15', expiryDate: '2026-07-15', daysToExpiry: 92, lastRotated: '2025-01-15', autoRenewal: false, rotationFrequency: '18 months', status: 'Active', pqcRisk: 'Critical', policyViolations: 1, dependencyCount: 6, tags: ['code-signing', 'hsm', 'production'] },
  { id: 'k8s-001', name: 'istio-ingress.payments.svc', type: 'K8s Workload Cert', commonName: 'istio-ingress.payments.svc.cluster.local', caIssuer: 'Istio Citadel CA', algorithm: 'ECC P-256', keyLength: '256', serial: 'SPIFFE://cluster.local/ns/payments', owner: 'Payments Team', team: 'Payments Engineering', application: 'Istio Service Mesh', environment: 'Production', infrastructure: 'aws-eks-prod', discoverySource: 'Kubernetes API', issueDate: '2026-04-13', expiryDate: '2026-04-14', daysToExpiry: 0, lastRotated: '2026-04-13', autoRenewal: true, rotationFrequency: '24 hours', status: 'Expiring', pqcRisk: 'High', policyViolations: 0, dependencyCount: 5, tags: ['kubernetes', 'istio', 'payments'] },
  { id: 'k8s-002', name: 'envoy-sidecar.api.svc', type: 'K8s Workload Cert', commonName: 'envoy-sidecar.api.svc.cluster.local', caIssuer: 'Istio Citadel CA', algorithm: 'ECC P-256', keyLength: '256', serial: 'SPIFFE://cluster.local/ns/api', owner: 'Platform Team', team: 'Platform Engineering', application: 'API Service Mesh', environment: 'Production', infrastructure: 'aws-eks-prod', discoverySource: 'Kubernetes API', issueDate: '2026-04-13', expiryDate: '2026-04-14', daysToExpiry: 0, lastRotated: '2026-04-13', autoRenewal: true, rotationFrequency: '24 hours', status: 'Active', pqcRisk: 'High', policyViolations: 0, dependencyCount: 8, tags: ['kubernetes', 'envoy'] },
  { id: 'k8s-003', name: 'cert-manager.monitoring.svc', type: 'K8s Workload Cert', commonName: 'monitoring.svc.cluster.local', caIssuer: 'Let\'s Encrypt R3', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SPIFFE://cluster.local/ns/monitoring', owner: 'SRE Team', team: 'Site Reliability', application: 'Monitoring Stack', environment: 'Production', infrastructure: 'gcp-gke-prod', discoverySource: 'Kubernetes API', issueDate: '2026-03-10', expiryDate: '2026-06-10', daysToExpiry: 57, lastRotated: '2026-03-10', autoRenewal: true, rotationFrequency: '90 days', status: 'Active', pqcRisk: 'Critical', policyViolations: 1, dependencyCount: 3, tags: ['kubernetes', 'monitoring'] },
  { id: 'enc-001', name: 'payments-data-key-AES256', type: 'Encryption Key', commonName: 'payments-data-encryption', caIssuer: 'AWS KMS', algorithm: 'AES-256', keyLength: '256', serial: 'arn:aws:kms:us-east-1:123456:key/abc-def', owner: 'Sarah Chen', team: 'Payments Engineering', application: 'Payment Processing', environment: 'Production', infrastructure: 'aws-kms-us-east-1', discoverySource: 'AWS KMS Connector', issueDate: '2025-03-15', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2026-03-15', autoRenewal: true, rotationFrequency: '365 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 4, tags: ['pci-dss', 'encryption', 'kms'] },
  { id: 'enc-002', name: 'backup-encryption-RSA4096', type: 'Encryption Key', commonName: 'backup-encryption', caIssuer: 'Azure Key Vault', algorithm: 'RSA-4096', keyLength: '4096', serial: 'https://vault.azure.net/keys/backup-enc/v1', owner: 'Infrastructure', team: 'Infrastructure', application: 'Backup System', environment: 'Production', infrastructure: 'azure-keyvault-prod', discoverySource: 'Azure Key Vault Connector', issueDate: '2025-06-01', expiryDate: '2027-06-01', daysToExpiry: 413, lastRotated: '2025-06-01', autoRenewal: false, rotationFrequency: '2 years', status: 'Active', pqcRisk: 'High', policyViolations: 0, dependencyCount: 2, tags: ['backup', 'encryption'] },
  { id: 'ai-001', name: 'gpt-orchestrator-token', type: 'AI Agent Token', commonName: 'gpt-orchestrator-v3', caIssuer: 'Internal Token Service', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'TOK-2026-04-12-001', owner: 'AI Platform Team', team: 'AI Engineering', application: 'GPT Orchestrator', environment: 'Production', infrastructure: 'aws-eks-ai-cluster', discoverySource: 'Endpoint Agent', issueDate: '2026-04-12', expiryDate: '2026-04-19', daysToExpiry: 5, lastRotated: '2026-04-12', autoRenewal: false, rotationFrequency: '7 days', status: 'Active', pqcRisk: 'Medium', policyViolations: 0, dependencyCount: 6, tags: ['ai-agent', 'production'], agentMeta: { agentType: 'Orchestrator', framework: 'LangChain', servicesAccessed: ['OpenAI API', 'Pinecone', 'S3 Data Lake', 'Internal Knowledge Base', 'Slack API'], permissions: ['openai:chat.completions', 's3:GetObject', 's3:PutObject', 'pinecone:query', 'pinecone:upsert', 'slack:chat.postMessage'], permissionRisk: 'Over-privileged', lastActivity: '2 min ago', actionsPerDay: 14200 } },
  { id: 'ai-002', name: 'rag-pipeline-service-account', type: 'AI Agent Token', commonName: 'rag-pipeline-sa', caIssuer: 'Internal Token Service', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'TOK-2026-04-10-003', owner: 'AI Platform Team', team: 'AI Engineering', application: 'RAG Pipeline', environment: 'Production', infrastructure: 'gcp-vertex-ai', discoverySource: 'Endpoint Agent', issueDate: '2026-04-10', expiryDate: '2026-04-17', daysToExpiry: 3, lastRotated: '2026-04-10', autoRenewal: false, rotationFrequency: '7 days', status: 'Expiring', pqcRisk: 'Medium', policyViolations: 1, dependencyCount: 3, tags: ['ai-agent', 'rag'], agentMeta: { agentType: 'Pipeline Agent', framework: 'LlamaIndex', servicesAccessed: ['Vertex AI', 'BigQuery', 'Cloud Storage', 'Weaviate'], permissions: ['vertexai:predict', 'bigquery:jobs.create', 'bigquery:tables.getData', 'storage:objects.get'], permissionRisk: 'Right-sized', lastActivity: '15 min ago', actionsPerDay: 8400 } },
  { id: 'cert-006', name: 'cdn.acmecorp.com', type: 'TLS Certificate', commonName: 'cdn.acmecorp.com', caIssuer: 'DigiCert Global G2', algorithm: 'ECC P-384', keyLength: '384', serial: '6A:7B:8C:9D:AE:BF:C0:D1', owner: 'CDN Team', team: 'Infrastructure', application: 'Content Delivery', environment: 'Production', infrastructure: 'cloudflare-cdn', discoverySource: 'CT Log Monitor', issueDate: '2026-02-01', expiryDate: '2026-08-01', daysToExpiry: 109, lastRotated: '2026-02-01', autoRenewal: true, rotationFrequency: '180 days', status: 'Active', pqcRisk: 'High', policyViolations: 0, dependencyCount: 20, tags: ['cdn', 'production'] },
  { id: 'cert-007', name: '*.dev.acmecorp.com', type: 'TLS Certificate', commonName: '*.dev.acmecorp.com', caIssuer: 'MSCA Enterprise', algorithm: 'RSA-2048', keyLength: '2048', serial: '7B:8C:9D:AE:BF:C0:D1:E2', owner: 'Dev Team', team: 'Platform Engineering', application: 'Dev Environment', environment: 'Development', infrastructure: 'azure-dev', discoverySource: 'MSCA Connector', issueDate: '2026-01-01', expiryDate: '2027-01-01', daysToExpiry: 262, lastRotated: '2026-01-01', autoRenewal: false, rotationFrequency: '365 days', status: 'Active', pqcRisk: 'Critical', policyViolations: 2, dependencyCount: 5, tags: ['development', 'wildcard'] },
  { id: 'cert-008', name: 'vault.internal.acmecorp.com', type: 'TLS Certificate', commonName: 'vault.internal.acmecorp.com', caIssuer: 'MSCA Enterprise', algorithm: 'RSA-2048', keyLength: '2048', serial: '8C:9D:AE:BF:C0:D1:E2:F3', owner: 'Security Team', team: 'Security Operations', application: 'HashiCorp Vault', environment: 'Production', infrastructure: 'on-prem-dc1', discoverySource: 'Network Scan', issueDate: '2025-10-01', expiryDate: '2026-04-17', daysToExpiry: 3, lastRotated: '2025-10-01', autoRenewal: false, rotationFrequency: '180 days', status: 'Expiring', pqcRisk: 'Critical', policyViolations: 2, dependencyCount: 14, tags: ['vault', 'critical-infra'] },
  { id: 'ssh-004', name: 'bastion-host-key', type: 'SSH Key', commonName: 'bastion-01.acmecorp.com', caIssuer: 'N/A', algorithm: 'Ed25519', keyLength: '256', serial: 'SHA256:Qp8mN3xRtZ...', owner: 'Security Team', team: 'Security Operations', application: 'Bastion Host', environment: 'Production', infrastructure: 'aws-us-east-1-prod', discoverySource: 'SSH Host Scan', issueDate: '2026-01-01', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2026-01-01', autoRenewal: false, rotationFrequency: '90 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 1, tags: ['bastion', 'security'] },
  { id: 'ssh-005', name: 'gitlab-deploy-key', type: 'SSH Key', commonName: 'gitlab-runner-01', caIssuer: 'N/A', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SHA256:Wz4kL9pMnO...', owner: 'Unassigned', team: 'DevOps', application: 'GitLab CI', environment: 'Production', infrastructure: 'on-prem-dc2', discoverySource: 'Endpoint Agent', issueDate: '2025-03-15', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-03-15', autoRenewal: false, rotationFrequency: 'Never', status: 'Orphaned', pqcRisk: 'Critical', policyViolations: 3, dependencyCount: 2, tags: ['orphaned', 'ci-cd'] },
  { id: 'cert-009', name: 'mail.acmecorp.com', type: 'TLS Certificate', commonName: 'mail.acmecorp.com', caIssuer: 'DigiCert Global G2', algorithm: 'RSA-2048', keyLength: '2048', serial: '9D:AE:BF:C0:D1:E2:F3:04', owner: 'IT Operations', team: 'IT Operations', application: 'Email Server', environment: 'Production', infrastructure: 'on-prem-dc1', discoverySource: 'Network Scan', issueDate: '2025-08-01', expiryDate: '2026-04-21', daysToExpiry: 7, lastRotated: '2025-08-01', autoRenewal: false, rotationFrequency: '365 days', status: 'Expiring', pqcRisk: 'Critical', policyViolations: 1, dependencyCount: 3, tags: ['email', 'production'] },
  { id: 'ai-003', name: 'copilot-code-review-agent', type: 'AI Agent Token', commonName: 'copilot-cr-agent', caIssuer: 'Internal Token Service', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'TOK-2026-04-08-007', owner: 'AI Platform Team', team: 'AI Engineering', application: 'Code Review Agent', environment: 'Production', infrastructure: 'github-actions', discoverySource: 'Endpoint Agent', issueDate: '2026-04-08', expiryDate: '2026-04-15', daysToExpiry: 1, lastRotated: '2026-04-08', autoRenewal: false, rotationFrequency: '7 days', status: 'Expiring', pqcRisk: 'Medium', policyViolations: 1, dependencyCount: 2, tags: ['ai-agent', 'code-review'], agentMeta: { agentType: 'Copilot', framework: 'Custom (GitHub App)', servicesAccessed: ['GitHub API', 'OpenAI API', 'Jira API', 'SonarQube'], permissions: ['github:pull_requests.write', 'github:contents.read', 'github:checks.write', 'openai:chat.completions', 'jira:issue.create'], permissionRisk: 'Over-privileged', lastActivity: '5 min ago', actionsPerDay: 3200 } },
  { id: 'ai-004', name: 'customer-support-bot', type: 'AI Agent Token', commonName: 'cs-bot-prod', caIssuer: 'Internal Token Service', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'TOK-2026-04-01-012', owner: 'CX Engineering', team: 'Customer Experience', application: 'Support Bot', environment: 'Production', infrastructure: 'aws-lambda', discoverySource: 'API Gateway Scan', issueDate: '2026-04-01', expiryDate: '2026-05-01', daysToExpiry: 17, lastRotated: '2026-04-01', autoRenewal: true, rotationFrequency: '30 days', status: 'Active', pqcRisk: 'Medium', policyViolations: 0, dependencyCount: 5, tags: ['ai-agent', 'customer-facing'], agentMeta: { agentType: 'Service Bot', framework: 'Amazon Bedrock', servicesAccessed: ['Bedrock Claude', 'Zendesk API', 'Salesforce API', 'Internal KB', 'PII Vault'], permissions: ['bedrock:InvokeModel', 'zendesk:tickets.create', 'zendesk:tickets.read', 'salesforce:Case.read', 'pii-vault:decrypt'], permissionRisk: 'Over-privileged', lastActivity: '1 min ago', actionsPerDay: 48000 } },
  { id: 'ai-005', name: 'data-analyst-mcp-server', type: 'AI Agent Token', commonName: 'mcp-data-analyst', caIssuer: 'Internal Token Service', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'TOK-2026-03-20-018', owner: 'Data Platform', team: 'Data Engineering', application: 'MCP Data Analyst', environment: 'Production', infrastructure: 'gcp-cloud-run', discoverySource: 'MCP Registry', issueDate: '2026-03-20', expiryDate: '2026-06-20', daysToExpiry: 67, lastRotated: '2026-03-20', autoRenewal: false, rotationFrequency: '90 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 8, tags: ['ai-agent', 'mcp-server'], agentMeta: { agentType: 'MCP Server', framework: 'MCP Protocol v1.2', servicesAccessed: ['BigQuery', 'Looker', 'Snowflake', 'S3 Data Lake'], permissions: ['bigquery:jobs.create', 'bigquery:tables.getData', 'looker:looks.read', 'snowflake:SELECT'], permissionRisk: 'Right-sized', lastActivity: '30 min ago', actionsPerDay: 1200, mcpTools: ['query_database', 'create_chart', 'export_csv', 'summarize_dataset'] } },
  { id: 'ai-006', name: 'security-soc-autonomous', type: 'AI Agent Token', commonName: 'soc-agent-v2', caIssuer: 'Internal Token Service', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'TOK-2026-04-05-021', owner: 'Security Operations', team: 'Security Operations', application: 'SOC Autonomous Agent', environment: 'Production', infrastructure: 'aws-eks-security', discoverySource: 'Endpoint Agent', issueDate: '2026-04-05', expiryDate: '2026-04-12', daysToExpiry: -2, lastRotated: '2026-04-05', autoRenewal: false, rotationFrequency: '7 days', status: 'Expired', pqcRisk: 'High', policyViolations: 3, dependencyCount: 12, tags: ['ai-agent', 'soc', 'expired'], agentMeta: { agentType: 'Autonomous Agent', framework: 'CrewAI', servicesAccessed: ['Splunk SIEM', 'CrowdStrike API', 'PagerDuty', 'Jira', 'Active Directory', 'Firewall API'], permissions: ['splunk:search', 'crowdstrike:detections.read', 'crowdstrike:hosts.contain', 'pagerduty:incidents.create', 'ad:users.disable', 'firewall:rules.modify'], permissionRisk: 'Over-privileged', lastActivity: '2 days ago', actionsPerDay: 0 } },
  { id: 'ai-007', name: 'devops-deploy-agent', type: 'AI Agent Token', commonName: 'deploy-agent-prod', caIssuer: 'HashiCorp Vault', algorithm: 'HMAC-SHA256', keyLength: '256', serial: 'vault:secret/deploy-agent/prod', owner: 'DevOps', team: 'DevOps', application: 'Deploy Automation Agent', environment: 'Production', infrastructure: 'github-actions', discoverySource: 'Vault Connector', issueDate: '2026-04-13', expiryDate: '2026-04-14', daysToExpiry: 0, lastRotated: '2026-04-13', autoRenewal: true, rotationFrequency: '24 hours', status: 'Expiring', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 15, tags: ['ai-agent', 'deploy', 'short-lived'], agentMeta: { agentType: 'Autonomous Agent', framework: 'Custom (GitHub Actions)', servicesAccessed: ['GitHub API', 'AWS ECS', 'AWS ECR', 'Datadog', 'Slack'], permissions: ['ecs:UpdateService', 'ecr:GetAuthorizationToken', 'github:deployments.create', 'datadog:events.create', 'slack:chat.postMessage'], permissionRisk: 'Right-sized', lastActivity: '45 min ago', actionsPerDay: 87 } },
  { id: 'ai-008', name: 'hr-onboarding-copilot', type: 'AI Agent Token', commonName: 'hr-copilot', caIssuer: 'Azure AD', algorithm: 'JWT-RS256', keyLength: '2048', serial: 'AAD-APP-2026-0042', owner: 'HR Systems', team: 'People Operations', application: 'HR Onboarding Copilot', environment: 'Production', infrastructure: 'azure-openai', discoverySource: 'Azure AD Connector', issueDate: '2026-01-15', expiryDate: '2027-01-15', daysToExpiry: 276, lastRotated: '2026-01-15', autoRenewal: false, rotationFrequency: '365 days', status: 'Active', pqcRisk: 'Medium', policyViolations: 2, dependencyCount: 4, tags: ['ai-agent', 'hr', 'pii-access'], agentMeta: { agentType: 'Copilot', framework: 'Azure OpenAI + Semantic Kernel', servicesAccessed: ['Azure OpenAI', 'Workday API', 'Active Directory', 'SharePoint', 'DocuSign'], permissions: ['openai:chat.completions', 'workday:workers.read', 'workday:workers.create', 'ad:users.create', 'ad:groups.addMember', 'sharepoint:sites.readwrite', 'docusign:envelopes.create'], permissionRisk: 'Over-privileged', lastActivity: '2 hours ago', actionsPerDay: 340 } },
  { id: 'cert-010', name: 'self-signed-legacy-app', type: 'TLS Certificate', commonName: 'legacy-erp.internal', caIssuer: 'Self-Signed', algorithm: 'RSA-2048', keyLength: '2048', serial: 'AE:BF:C0:D1:E2:F3:04:15', owner: 'IT Operations', team: 'IT Operations', application: 'Legacy ERP', environment: 'Production', infrastructure: 'on-prem-dc2', discoverySource: 'Network Scan', issueDate: '2024-01-01', expiryDate: '2026-12-31', daysToExpiry: 261, lastRotated: '2024-01-01', autoRenewal: false, rotationFrequency: 'Never', status: 'Active', pqcRisk: 'Critical', policyViolations: 2, dependencyCount: 1, tags: ['self-signed', 'legacy'] },
  { id: 'enc-003', name: 'tde-master-key-sqlserver', type: 'Encryption Key', commonName: 'sql-tde-master', caIssuer: 'Azure Key Vault', algorithm: 'AES-256', keyLength: '256', serial: 'https://vault.azure.net/keys/tde-master/v2', owner: 'Database Operations', team: 'Database Operations', application: 'SQL Server TDE', environment: 'Production', infrastructure: 'azure-sql-prod', discoverySource: 'Azure Key Vault Connector', issueDate: '2025-09-01', expiryDate: 'N/A', daysToExpiry: -1, lastRotated: '2025-09-01', autoRenewal: true, rotationFrequency: '365 days', status: 'Active', pqcRisk: 'Low', policyViolations: 0, dependencyCount: 3, tags: ['database', 'encryption', 'tde'] },
  { id: 'k8s-004', name: 'ingress-controller.default.svc', type: 'K8s Workload Cert', commonName: 'ingress.default.svc.cluster.local', caIssuer: 'cert-manager (Let\'s Encrypt)', algorithm: 'RSA-2048', keyLength: '2048', serial: 'SPIFFE://cluster.local/ns/default/ing', owner: 'Platform Team', team: 'Platform Engineering', application: 'NGINX Ingress', environment: 'Production', infrastructure: 'aws-eks-prod', discoverySource: 'Kubernetes API', issueDate: '2026-03-01', expiryDate: '2026-05-30', daysToExpiry: 46, lastRotated: '2026-03-01', autoRenewal: true, rotationFrequency: '90 days', status: 'Active', pqcRisk: 'Critical', policyViolations: 0, dependencyCount: 30, tags: ['kubernetes', 'ingress'] },
];

export const violationData = [
  { day: 'Apr 1', detected: 12, remediated: 8 },
  { day: 'Apr 2', detected: 15, remediated: 10 },
  { day: 'Apr 3', detected: 8, remediated: 14 },
  { day: 'Apr 4', detected: 22, remediated: 12 },
  { day: 'Apr 5', detected: 18, remediated: 16 },
  { day: 'Apr 6', detected: 10, remediated: 15 },
  { day: 'Apr 7', detected: 25, remediated: 11 },
  { day: 'Apr 8', detected: 14, remediated: 20 },
  { day: 'Apr 9', detected: 19, remediated: 18 },
  { day: 'Apr 10', detected: 11, remediated: 17 },
  { day: 'Apr 11', detected: 16, remediated: 13 },
  { day: 'Apr 12', detected: 20, remediated: 22 },
  { day: 'Apr 13', detected: 9, remediated: 15 },
  { day: 'Apr 14', detected: 13, remediated: 11 },
];

export const assetTypeDistribution = [
  { name: 'TLS Certificates', value: 1842000, color: 'hsl(160, 70%, 37%)' },
  { name: 'SSH Keys', value: 1235000, color: 'hsl(225, 40%, 50%)' },
  { name: 'SSH Certificates', value: 320000, color: 'hsl(245, 38%, 50%)' },
  { name: 'Code-Signing', value: 18420, color: 'hsl(15, 72%, 52%)' },
  { name: 'K8s Workload Certs', value: 810000, color: 'hsl(38, 78%, 41%)' },
  { name: 'AI Agent Tokens', value: 472000, color: 'hsl(200, 70%, 50%)' },
];

export const compliancePosture = [
  { framework: 'DORA', compliant: 78, atRisk: 15, violated: 7 },
  { framework: 'PCI-DSS', compliant: 85, atRisk: 10, violated: 5 },
  { framework: 'HIPAA', compliant: 92, atRisk: 6, violated: 2 },
  { framework: 'FIPS 140-2', compliant: 71, atRisk: 18, violated: 11 },
];

export const discoveryPerDay = [
  { day: 'Apr 1', assets: 245 }, { day: 'Apr 2', assets: 312 }, { day: 'Apr 3', assets: 189 },
  { day: 'Apr 4', assets: 456 }, { day: 'Apr 5', assets: 278 }, { day: 'Apr 6', assets: 167 },
  { day: 'Apr 7', assets: 398 }, { day: 'Apr 8', assets: 334 }, { day: 'Apr 9', assets: 421 },
  { day: 'Apr 10', assets: 287 }, { day: 'Apr 11', assets: 356 }, { day: 'Apr 12', assets: 445 },
  { day: 'Apr 13', assets: 312 }, { day: 'Apr 14', assets: 298 },
];

export const renewalByCA = [
  { ca: 'DigiCert', success: 342, failed: 3 },
  { ca: 'Entrust', success: 189, failed: 1 },
  { ca: 'MSCA', success: 156, failed: 5 },
  { ca: 'Let\'s Encrypt', success: 892, failed: 2 },
];

export const criticalAlerts = [
  { id: 1, severity: 'Critical', asset: '*.payments.acmecorp.com', policy: 'Cert expiry < 7 days', time: '2 hours ago', assetId: 'cert-001' },
  { id: 2, severity: 'Critical', asset: 'vault.internal.acmecorp.com', policy: 'Cert expiry < 7 days', time: '3 hours ago', assetId: 'cert-008' },
  { id: 3, severity: 'Critical', asset: 'k8s-node-ssh-cert', policy: 'SSH cert expired', time: '4 hours ago', assetId: 'sshcert-002' },
  { id: 4, severity: 'High', asset: 'prod-db-01-authorized-key', policy: 'Orphaned SSH key > 90d', time: '5 hours ago', assetId: 'ssh-001' },
  { id: 5, severity: 'High', asset: 'gitlab-deploy-key', policy: 'Orphaned SSH key > 90d', time: '5 hours ago', assetId: 'ssh-005' },
  { id: 6, severity: 'Critical', asset: 'mail.acmecorp.com', policy: 'Cert expiry < 7 days', time: '6 hours ago', assetId: 'cert-009' },
  { id: 7, severity: 'High', asset: 'codesign-prod-hsm', policy: 'Weak algorithm in prod', time: '8 hours ago', assetId: 'cs-002' },
  { id: 8, severity: 'Medium', asset: 'copilot-code-review-agent', policy: 'AI token > 7 days', time: '10 hours ago', assetId: 'ai-003' },
];

export const upcomingExpirations = [
  { asset: 'istio-ingress.payments.svc', type: 'K8s Workload Cert', expiry: '2026-04-14', owner: 'Payments Team', days: 0, assetId: 'k8s-001' },
  { asset: 'k8s-node-ssh-cert', type: 'SSH Certificate', expiry: '2026-04-15', owner: 'Platform Team', days: 1, assetId: 'sshcert-002' },
  { asset: 'copilot-code-review-agent', type: 'AI Agent Token', expiry: '2026-04-15', owner: 'AI Platform Team', days: 1, assetId: 'ai-003' },
  { asset: 'vault.internal.acmecorp.com', type: 'TLS Certificate', expiry: '2026-04-17', owner: 'Security Team', days: 3, assetId: 'cert-008' },
  { asset: 'rag-pipeline-service-account', type: 'AI Agent Token', expiry: '2026-04-17', owner: 'AI Platform Team', days: 3, assetId: 'ai-002' },
  { asset: 'gpt-orchestrator-token', type: 'AI Agent Token', expiry: '2026-04-19', owner: 'AI Platform Team', days: 5, assetId: 'ai-001' },
  { asset: '*.payments.acmecorp.com', type: 'TLS Certificate', expiry: '2026-04-20', owner: 'Sarah Chen', days: 6, assetId: 'cert-001' },
  { asset: 'mail.acmecorp.com', type: 'TLS Certificate', expiry: '2026-04-21', owner: 'IT Operations', days: 7, assetId: 'cert-009' },
];

export const trustOpsActions = [
  { id: 'action-001', priority: 'P1', asset: '*.payments.acmecorp.com', assetId: 'cert-001', type: 'TLS Certificate', action: 'Renew', reason: 'Cert expiry < 7 days', assignee: 'Sarah Chen', assigneeAvatar: 'SC', dueDate: '2026-04-18', module: 'CLM', aiRisk: 'Critical — 3 production apps will fail if not renewed in 48 hours' },
  { id: 'action-002', priority: 'P1', asset: 'vault.internal.acmecorp.com', assetId: 'cert-008', type: 'TLS Certificate', action: 'Renew', reason: 'Cert expiry < 7 days + weak algorithm', assignee: 'Mike Rodriguez', assigneeAvatar: 'MR', dueDate: '2026-04-15', module: 'CLM', aiRisk: 'Critical — HashiCorp Vault serves 14 dependent services' },
  { id: 'action-003', priority: 'P1', asset: 'k8s-node-ssh-cert', assetId: 'sshcert-002', type: 'SSH Certificate', action: 'Re-issue', reason: 'SSH cert expiring in 1 day', assignee: 'Platform Team', assigneeAvatar: 'PT', dueDate: '2026-04-14', module: 'SSH', aiRisk: 'Critical — 24 Kubernetes nodes will lose SSH access' },
  { id: 'action-004', priority: 'P2', asset: 'prod-db-01-authorized-key', assetId: 'ssh-001', type: 'SSH Key', action: 'Rotate', reason: 'Orphaned key — no rotation in 308 days', assignee: 'Unassigned', assigneeAvatar: 'UA', dueDate: '2026-04-21', module: 'SSH', aiRisk: 'High — unattended SSH key to production database' },
  { id: 'action-005', priority: 'P2', asset: 'gitlab-deploy-key', assetId: 'ssh-005', type: 'SSH Key', action: 'Rotate', reason: 'Orphaned key — no rotation in 395 days', assignee: 'Unassigned', assigneeAvatar: 'UA', dueDate: '2026-04-21', module: 'SSH', aiRisk: 'High — stale CI/CD deploy key in production' },
  { id: 'action-006', priority: 'P2', asset: 'codesign-prod-hsm', assetId: 'cs-002', type: 'Code-Signing', action: 'Re-issue', reason: 'Weak algorithm (RSA-2048) for code signing', assignee: 'Security Team', assigneeAvatar: 'ST', dueDate: '2026-04-30', module: 'Sign', aiRisk: 'High — production release pipeline uses this cert' },
  { id: 'action-007', priority: 'P3', asset: 'copilot-code-review-agent', assetId: 'ai-003', type: 'AI Agent Token', action: 'Rotate', reason: 'AI token approaching expiry', assignee: 'AI Platform Team', assigneeAvatar: 'AI', dueDate: '2026-04-15', module: 'CLM', aiRisk: 'Medium — code review agent will stop functioning' },
  { id: 'action-008', priority: 'P3', asset: 'self-signed-legacy-app', assetId: 'cert-010', type: 'TLS Certificate', action: 'Escalate', reason: 'Self-signed cert in production', assignee: 'IT Operations', assigneeAvatar: 'IO', dueDate: '2026-05-01', module: 'CLM', aiRisk: 'Medium — legacy app with no auto-renewal' },
];

export const workflows = [
  { id: 'wf-001', name: 'Cert Renewal — Production TLS', type: 'Certificate Renewal', triggeredBy: 'Expiry Alert', status: 'Running', progress: 60, steps: ['Detect expiring cert', 'Validate policy', 'Generate CSR', 'Submit to CA', 'Install cert', 'Verify'] },
  { id: 'wf-002', name: 'SSH Key Rotation — Database Cluster', type: 'SSH Key Rotation', triggeredBy: 'Schedule (Weekly)', status: 'Awaiting approval', progress: 40, steps: ['Identify keys', 'Generate new keys', 'Await approval', 'Deploy keys', 'Revoke old keys', 'Verify access'] },
  { id: 'wf-003', name: 'PQC Migration — Batch 1 Payments', type: 'PQC Migration', triggeredBy: 'Manual', status: 'Scheduled', progress: 0, steps: ['Select assets', 'Choose algorithm (ML-DSA)', 'Generate certs', 'Deploy hybrid certs', 'Monitor', 'Remove classical'] },
  { id: 'wf-004', name: 'Onboarding — New Microservice', type: 'Application Onboarding', triggeredBy: 'API Call', status: 'Complete', progress: 100, steps: ['Register service', 'Create cert policy', 'Issue workload cert', 'Configure auto-renewal', 'Verify mTLS'] },
];

export const discoveryProfiles = [
  { id: 'dp-001', name: 'Production Full Scan', description: 'Comprehensive scan of all production infrastructure including CAs, networks, and cloud providers', sources: ['CA', 'Network', 'Cloud', 'SSH'], schedule: 'Daily at 02:00 AM', lastRun: '2 hours ago', assetsFound: 312, status: 'Active' },
  { id: 'dp-002', name: 'AWS Multi-Region', description: 'Scan all AWS regions for ACM certificates, KMS keys, and IAM credentials', sources: ['Cloud', 'SSH'], schedule: 'Every 6 hours', lastRun: '4 hours ago', assetsFound: 1847, status: 'Active' },
  { id: 'dp-003', name: 'SSH Infrastructure Sweep', description: 'Discover SSH keys and certificates across all bastion hosts and compute instances', sources: ['SSH'], schedule: 'Weekly on Sunday', lastRun: '3 days ago', assetsFound: 4521, status: 'Active' },
  { id: 'dp-004', name: 'CT Log Monitor', description: 'Monitor Certificate Transparency logs for all acmecorp.com domains', sources: ['CA'], schedule: 'Continuous', lastRun: '15 min ago', assetsFound: 89, status: 'Active' },
  { id: 'dp-005', name: 'Source Code Scan', description: 'Scan repositories for embedded certificates, keys, and secrets', sources: ['Source code'], schedule: 'On-demand', lastRun: '7 days ago', assetsFound: 156, status: 'Paused' },
  { id: 'dp-006', name: 'Azure Environment', description: 'Azure Key Vault, App Service certs, and AKS cluster certificates', sources: ['Cloud', 'CA'], schedule: 'Daily at 04:00 AM', lastRun: '22 hours ago', assetsFound: 623, status: 'Active' },
];

export const discoveryRuns = [
  { id: 'DR-2026-0414-001', profile: 'Production Full Scan', startedBy: 'Scheduled', startTime: '2026-04-14 02:00:00', duration: '18 min', sources: 4, assetsDiscovered: 312, newAssets: 8, changedAssets: 24, errors: 0, status: 'Complete' },
  { id: 'DR-2026-0414-002', profile: 'AWS Multi-Region', startedBy: 'Scheduled', startTime: '2026-04-14 00:00:00', duration: '42 min', sources: 2, assetsDiscovered: 1847, newAssets: 15, changedAssets: 67, errors: 2, status: 'Complete' },
  { id: 'DR-2026-0413-001', profile: 'Production Full Scan', startedBy: 'Scheduled', startTime: '2026-04-13 02:00:00', duration: '17 min', sources: 4, assetsDiscovered: 304, newAssets: 3, changedAssets: 18, errors: 0, status: 'Complete' },
  { id: 'DR-2026-0413-002', profile: 'CT Log Monitor', startedBy: 'Continuous', startTime: '2026-04-13 14:30:00', duration: '2 min', sources: 1, assetsDiscovered: 89, newAssets: 2, changedAssets: 0, errors: 0, status: 'Complete' },
  { id: 'DR-2026-0412-001', profile: 'Azure Environment', startedBy: 'Scheduled', startTime: '2026-04-12 04:00:00', duration: '28 min', sources: 2, assetsDiscovered: 623, newAssets: 5, changedAssets: 31, errors: 1, status: 'Complete' },
  { id: 'DR-2026-0411-001', profile: 'SSH Infrastructure Sweep', startedBy: 'Scheduled', startTime: '2026-04-11 00:00:00', duration: '1h 12min', sources: 1, assetsDiscovered: 4521, newAssets: 34, changedAssets: 89, errors: 3, status: 'Complete' },
];

export const policyRules = [
  { id: 'pol-001', name: 'Certificate Expiry Alert', description: 'Alert when certificates are approaching expiry (30d/14d/7d thresholds)', severity: 'High', affectedAssets: 284, enabled: true, lastTriggered: '1 hour ago' },
  { id: 'pol-002', name: 'Weak Algorithm Detection', description: 'Flag assets using RSA < 2048, MD5, or SHA-1 algorithms', severity: 'Critical', affectedAssets: 47, enabled: true, lastTriggered: '3 hours ago' },
  { id: 'pol-003', name: 'Wildcard in Production', description: 'Detect wildcard certificates deployed in production environments', severity: 'Medium', affectedAssets: 23, enabled: true, lastTriggered: '12 hours ago' },
  { id: 'pol-004', name: 'Self-Signed in Production', description: 'Flag self-signed certificates in production infrastructure', severity: 'High', affectedAssets: 12, enabled: true, lastTriggered: '2 days ago' },
  { id: 'pol-005', name: 'PQC-Vulnerable Asset', description: 'Identify assets using algorithms vulnerable to quantum computing attacks', severity: 'Critical', affectedAssets: 12847, enabled: true, lastTriggered: '30 min ago' },
  { id: 'pol-006', name: 'Orphaned SSH Key', description: 'Detect SSH keys with no rotation in 90+ days and no assigned owner', severity: 'High', affectedAssets: 156, enabled: true, lastTriggered: '6 hours ago' },
  { id: 'pol-007', name: 'Missing Auto-Renewal', description: 'Flag certificates and keys without automated renewal configured', severity: 'Medium', affectedAssets: 89, enabled: true, lastTriggered: '1 day ago' },
  { id: 'pol-008', name: 'Unapproved CA', description: 'Detect certificates issued by CAs not in the approved issuer list', severity: 'High', affectedAssets: 8, enabled: true, lastTriggered: '4 days ago' },
  { id: 'pol-009', name: 'AI Agent Token Age', description: 'Alert on AI agent tokens older than 24 hours', severity: 'Medium', affectedAssets: 34, enabled: true, lastTriggered: '2 hours ago' },
  { id: 'pol-010', name: 'SSH Certificate Expired', description: 'Critical alert for expired SSH certificates still in use', severity: 'Critical', affectedAssets: 3, enabled: true, lastTriggered: '4 hours ago' },
  { id: 'pol-011', name: 'K8s Cert Approaching Expiry', description: 'Alert on Kubernetes workload certificates within 24h of expiry', severity: 'High', affectedAssets: 17, enabled: true, lastTriggered: '1 hour ago' },
];

export const customPolicies = [
  { id: 'cpol-001', name: 'DORA Compliance — Production Certs', description: 'Production certificates must have maximum 90-day lifetime and be issued only by DigiCert or Entrust', status: 'Active', violations: 3 },
  { id: 'cpol-002', name: 'PCI-DSS Cardholder Zone', description: 'No RSA-2048 certificates permitted in cardholder data environment', status: 'Active', violations: 0 },
  { id: 'cpol-003', name: 'PQC Migration Mandate', description: 'All financial services assets must migrate to ML-DSA before Q4 2026', status: 'Active', violations: 847 },
];

export const connectors = {
  ca: [
    { name: 'DigiCert', status: 'connected', lastSync: '15 min ago', assets: 842000, color: 'hsl(160, 70%, 37%)' },
    { name: 'Entrust', status: 'connected', lastSync: '30 min ago', assets: 320000, color: 'hsl(160, 70%, 37%)' },
    { name: 'MSCA Enterprise', status: 'connected', lastSync: '1 hour ago', assets: 210000, color: 'hsl(160, 70%, 37%)' },
    { name: "Let's Encrypt", status: 'connected', lastSync: '5 min ago', assets: 1240000, color: 'hsl(160, 70%, 37%)' },
    { name: 'GlobalSign', status: 'disconnected', lastSync: 'Never', assets: 0, color: 'hsl(220, 9%, 46%)' },
  ],
  cloud: [
    { name: 'AWS ACM', status: 'connected', lastSync: '10 min ago', assets: 420000 },
    { name: 'Azure Key Vault', status: 'connected', lastSync: '20 min ago', assets: 280000 },
    { name: 'GCP CAS', status: 'connected', lastSync: '45 min ago', assets: 150000 },
    { name: 'HashiCorp Vault', status: 'connected', lastSync: '5 min ago', assets: 89000 },
    { name: 'AWS CloudHSM', status: 'connected', lastSync: '1 hour ago', assets: 34000 },
    { name: 'Thales CipherTrust', status: 'disconnected', lastSync: 'Never', assets: 0 },
  ],
  itsm: [
    { name: 'ServiceNow', status: 'connected', lastSync: '5 min ago', assets: 0 },
    { name: 'Jira', status: 'connected', lastSync: '10 min ago', assets: 0 },
    { name: 'PagerDuty', status: 'connected', lastSync: '15 min ago', assets: 0 },
    { name: 'Slack', status: 'connected', lastSync: '1 min ago', assets: 0 },
  ],
  infrastructure: [
    { name: 'F5 BIG-IP', status: 'connected', lastSync: '30 min ago', assets: 120000 },
    { name: 'NGINX', status: 'connected', lastSync: '15 min ago', assets: 89000 },
    { name: 'Citrix ADC', status: 'disconnected', lastSync: 'Never', assets: 0 },
    { name: 'DNS/DDI', status: 'connected', lastSync: '1 hour ago', assets: 0 },
    { name: 'WAF', status: 'connected', lastSync: '20 min ago', assets: 0 },
  ],
  devops: [
    { name: 'Jenkins', status: 'connected', lastSync: '10 min ago', assets: 0 },
    { name: 'GitHub Actions', status: 'connected', lastSync: '5 min ago', assets: 0 },
    { name: 'GitLab', status: 'disconnected', lastSync: 'Never', assets: 0 },
    { name: 'Kubernetes API', status: 'connected', lastSync: '1 min ago', assets: 810000 },
  ],
  hsm: [
    { name: 'Thales Luna', status: 'connected', lastSync: '2 hours ago', assets: 22000 },
    { name: 'AWS CloudHSM', status: 'connected', lastSync: '1 hour ago', assets: 34000 },
  ],
};

export const auditLog = [
  { timestamp: '2026-04-14 10:23:45', user: 'Sarah Chen', action: 'Certificate renewed', asset: '*.payments.acmecorp.com', ip: '10.0.1.42', result: 'Success' },
  { timestamp: '2026-04-14 09:15:22', user: 'System', action: 'Discovery scan completed', asset: 'Production Full Scan', ip: 'N/A', result: 'Success' },
  { timestamp: '2026-04-14 08:45:00', user: 'Mike Rodriguez', action: 'Policy violation acknowledged', asset: 'vault.internal.acmecorp.com', ip: '10.0.2.18', result: 'Success' },
  { timestamp: '2026-04-14 07:30:11', user: 'System', action: 'Auto-renewal triggered', asset: 'envoy-sidecar.api.svc', ip: 'N/A', result: 'Success' },
  { timestamp: '2026-04-13 22:00:00', user: 'Automation Engine', action: 'SSH key rotation', asset: 'bastion-host-key', ip: 'N/A', result: 'Success' },
  { timestamp: '2026-04-13 18:42:33', user: 'Lisa Park', action: 'Owner reassigned', asset: 'prod-gateway.acmecorp.com', ip: '10.0.3.55', result: 'Success' },
  { timestamp: '2026-04-13 14:20:00', user: 'System', action: 'PQC risk assessment updated', asset: 'Global', ip: 'N/A', result: 'Success' },
  { timestamp: '2026-04-13 11:05:17', user: 'James Wilson', action: 'Workflow created', asset: 'PQC Migration Batch 1', ip: '10.0.1.90', result: 'Success' },
];

export const users = [
  { name: 'Sarah Chen', email: 'sarah.chen@acmecorp.com', role: 'Security Admin', lastLogin: '10 min ago', status: 'Active' },
  { name: 'Mike Rodriguez', email: 'mike.rodriguez@acmecorp.com', role: 'Platform Admin', lastLogin: '1 hour ago', status: 'Active' },
  { name: 'Lisa Park', email: 'lisa.park@acmecorp.com', role: 'PKI Engineer', lastLogin: '30 min ago', status: 'Active' },
  { name: 'James Wilson', email: 'james.wilson@acmecorp.com', role: 'Compliance Officer', lastLogin: '2 hours ago', status: 'Active' },
  { name: 'Emily Davis', email: 'emily.davis@acmecorp.com', role: 'Read Only', lastLogin: '1 day ago', status: 'Active' },
  { name: 'Robert Kim', email: 'robert.kim@acmecorp.com', role: 'Security Admin', lastLogin: '3 days ago', status: 'Inactive' },
];
