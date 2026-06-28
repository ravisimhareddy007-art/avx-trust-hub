// ─── IT Asset Model ──────────────────────────────────────────────────────────
export interface ITAsset {
  id: string;
  name: string;
  type:
    | "Web Server"
    | "Application Server"
    | "Database Server"
    | "API Gateway"
    | "K8s Cluster"
    | "Mail Server"
    | "Bastion Host"
    | "HSM"
    | "Vault Server";
  scanned: boolean;
  environment: "Production" | "Staging" | "Development";
  ownerTeam: string;
  cryptoObjectIds: string[];
  riskScore: number;
  criticalViolations: number;
  policyCoverage: number;
  lastSeen: string;
  managedBy: string;
  infrastructure: string;
  application: string;
}

export const mockITAssets: ITAsset[] = [
  {
    id: "it-pay-01",
    name: "payments-api.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Payments Engineering",
    cryptoObjectIds: [
      "cert-001",
      "secret-001",
      "cert-011",
      "cert-012",
      "ssh-s01",
      "ssh-su02",
      "ssh-r01",
      "ssh-m03",
      "sec-e01",
    ],
    riskScore: 91,
    criticalViolations: 3,
    policyCoverage: 60,
    lastSeen: "2026-04-14 09:15",
    managedBy: "Terraform",
    infrastructure: "aws-us-east-1-prod",
    application: "Payments API",
  },
  {
    id: "it-001",
    name: "prod-gateway-01.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["cert-001", "cert-003", "cert-006", "cert-025", "cert-029", "cert-035"],
    riskScore: 82,
    criticalViolations: 3,
    policyCoverage: 67,
    lastSeen: "2026-04-14 09:12",
    managedBy: "Terraform",
    infrastructure: "aws-us-east-1",
    application: "Edge Gateway",
  },
  {
    id: "it-002",
    name: "payments-api.eks-prod",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Payments Engineering",
    cryptoObjectIds: ["cert-001", "k8s-001", "enc-001", "secret-001", "sec-h01"],
    riskScore: 76,
    criticalViolations: 2,
    policyCoverage: 75,
    lastSeen: "2026-04-14 09:10",
    managedBy: "Kubernetes",
    infrastructure: "aws-eks-prod",
    application: "Payment Gateway",
  },
  {
    id: "it-003",
    name: "prod-db-primary.internal",
    type: "Database Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Database Operations",
    cryptoObjectIds: ["ssh-001", "enc-001", "enc-003", "cert-019"],
    riskScore: 71,
    criticalViolations: 2,
    policyCoverage: 33,
    lastSeen: "2026-04-14 08:55",
    managedBy: "Ansible",
    infrastructure: "aws-us-east-1",
    application: "PostgreSQL Primary",
  },
  {
    id: "it-004",
    name: "vault.internal.acmecorp.com",
    type: "Vault Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: [
      "cert-008",
      "secret-001",
      "secret-002",
      "enc-002",
      "cert-013",
      "cert-023",
      "ssh-su01",
      "ssh-wh01",
      "ssh-sh01",
    ],
    riskScore: 88,
    criticalViolations: 3,
    policyCoverage: 50,
    lastSeen: "2026-04-14 09:05",
    managedBy: "Terraform",
    infrastructure: "on-prem-dc1",
    application: "HashiCorp Vault",
  },
  {
    id: "it-005",
    name: "jenkins-ci.internal",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "DevOps",
    cryptoObjectIds: ["ssh-002", "sshcert-001", "secret-004", "cs-001", "cert-021", "cert-022", "sec-h02"],
    riskScore: 45,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-04-14 09:00",
    managedBy: "Ansible",
    infrastructure: "on-prem-dc1",
    application: "Jenkins CI Host",
  },
  {
    id: "it-006",
    name: "cdn.acmecorp.com",
    type: "Web Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["cert-006", "cert-003", "cert-016"],
    riskScore: 28,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-04-14 09:11",
    managedBy: "Cloudflare",
    infrastructure: "cloudflare-cdn",
    application: "Content Delivery",
  },
  {
    id: "it-007",
    name: "eks-prod-cluster",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: [
      "k8s-001",
      "k8s-002",
      "k8s-003",
      "k8s-004",
      "ssh-003",
      "sshcert-002",
      "cert-002",
      "cert-014",
      "cert-017",
      "cert-027",
      "cert-028",
      "cert-030",
      "sec-h03",
    ],
    riskScore: 64,
    criticalViolations: 2,
    policyCoverage: 83,
    lastSeen: "2026-04-14 09:08",
    managedBy: "Terraform",
    infrastructure: "aws-eks-prod",
    application: "EKS Production",
  },
  {
    id: "it-008",
    name: "auth.acmecorp.com",
    type: "Web Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Identity & Access",
    cryptoObjectIds: ["cert-004", "cert-020", "cert-024", "cert-026"],
    riskScore: 35,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-04-14 09:07",
    managedBy: "Kubernetes",
    infrastructure: "gcp-us-central1",
    application: "SSO Service",
  },
  {
    id: "it-009",
    name: "bastion-01.acmecorp.com",
    type: "Bastion Host",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["ssh-004", "ssh-001"],
    riskScore: 52,
    criticalViolations: 1,
    policyCoverage: 50,
    lastSeen: "2026-04-14 08:50",
    managedBy: "Ansible",
    infrastructure: "aws-us-east-1",
    application: "Bastion Host",
  },
  {
    id: "it-010",
    name: "mail.acmecorp.com",
    type: "Mail Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "IT Operations",
    cryptoObjectIds: ["cert-009", "cert-015", "ssh-wu01"],
    riskScore: 73,
    criticalViolations: 1,
    policyCoverage: 0,
    lastSeen: "2026-04-14 08:30",
    managedBy: "Manual",
    infrastructure: "on-prem-dc1",
    application: "Email Server",
  },
  {
    id: "it-011",
    name: "legacy-erp.internal",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "IT Operations",
    cryptoObjectIds: ["cert-010", "cert-018", "ssh-s02", "ssh-r02", "ssh-wu02", "ssh-wh02", "ssh-sh02"],
    riskScore: 91,
    criticalViolations: 2,
    policyCoverage: 0,
    lastSeen: "2026-04-14 07:00",
    managedBy: "Manual",
    infrastructure: "on-prem-dc2",
    application: "Legacy ERP",
  },
  {
    id: "it-012",
    name: "staging-api.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Staging",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: ["cert-005", "cert-007", "cert-031", "cert-032", "cert-033", "ssh-m01"],
    riskScore: 38,
    criticalViolations: 1,
    policyCoverage: 50,
    lastSeen: "2026-04-14 08:45",
    managedBy: "Terraform",
    infrastructure: "azure-eastus-stg",
    application: "Staging API",
  },
  {
    id: "it-013",
    name: "hsm-signing-cluster",
    type: "HSM",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["cs-001", "cs-002", "enc-002"],
    riskScore: 42,
    criticalViolations: 1,
    policyCoverage: 67,
    lastSeen: "2026-04-14 09:02",
    managedBy: "Manual",
    infrastructure: "thales-luna-hsm",
    application: "Code Signing HSM",
  },
  {
    id: "it-014",
    name: "gitlab-runner-01.internal",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "DevOps",
    cryptoObjectIds: ["ssh-005", "secret-004"],
    riskScore: 68,
    criticalViolations: 2,
    policyCoverage: 25,
    lastSeen: "2026-04-14 08:20",
    managedBy: "Manual",
    infrastructure: "on-prem-dc2",
    application: "GitLab CI Host",
  },

  // ── API Gateways - unscanned, unowned, zero coverage ─────────────────────
  {
    id: "it-gw-01",
    name: "legacy-api-gw-01.internal",
    type: "API Gateway",
    scanned: false,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: [],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Unknown",
    infrastructure: "on-prem-dc2",
    application: "Legacy API Gateway",
  },
  {
    id: "it-gw-02",
    name: "partner-api-gw.acmecorp.com",
    type: "API Gateway",
    scanned: false,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: [],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Unknown",
    infrastructure: "azure-westus",
    application: "Partner API Gateway",
  },
  {
    id: "it-gw-03",
    name: "internal-api-gw-02.prod",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: ["cert-005"],
    riskScore: 45,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "2026-04-14 06:00",
    managedBy: "Terraform",
    infrastructure: "aws-us-west-2",
    application: "Internal API v2",
  },

  // ── Application Servers ──────────────────────────────────────────────────
  {
    id: "it-app-01",
    name: "legacy-batch-server-01",
    type: "Application Server",
    scanned: false,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: [],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Manual",
    infrastructure: "on-prem-dc1",
    application: "Batch Processing",
  },
  {
    id: "it-app-02",
    name: "reporting-server-02.internal",
    type: "Application Server",
    scanned: false,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: [],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Manual",
    infrastructure: "on-prem-dc2",
    application: "Reporting Service",
  },
  {
    id: "it-app-03",
    name: "migration-tool-server",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: ["ssh-005"],
    riskScore: 62,
    criticalViolations: 1,
    policyCoverage: 0,
    lastSeen: "2026-04-13 12:00",
    managedBy: "Manual",
    infrastructure: "on-prem-dc2",
    application: "Data Migration Tool",
  },

  // ── Kubernetes Clusters ──────────────────────────────────────────────────
  {
    id: "it-k8s-01",
    name: "dev-cluster-01.internal",
    type: "K8s Cluster",
    scanned: false,
    environment: "Development",
    ownerTeam: "Unassigned",
    cryptoObjectIds: ["cert-034", "ssh-m02"],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Unknown",
    infrastructure: "gcp-dev",
    application: "Dev Cluster",
  },
  {
    id: "it-k8s-02",
    name: "staging-eks-cluster",
    type: "K8s Cluster",
    scanned: false,
    environment: "Staging",
    ownerTeam: "Unassigned",
    cryptoObjectIds: [],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Terraform",
    infrastructure: "aws-eks-stg",
    application: "Staging EKS",
  },
  {
    id: "it-k8s-03",
    name: "analytics-k8s-cluster",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: ["k8s-003"],
    riskScore: 58,
    criticalViolations: 1,
    policyCoverage: 0,
    lastSeen: "2026-04-14 07:30",
    managedBy: "Kubernetes",
    infrastructure: "azure-aks-prod",
    application: "Analytics Platform",
  },

  // ── Vault Servers ────────────────────────────────────────────────────────
  {
    id: "it-vlt-01",
    name: "vault-dr-standby.internal",
    type: "Vault Server",
    scanned: false,
    environment: "Production",
    ownerTeam: "Unassigned",
    cryptoObjectIds: [],
    riskScore: 0,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "Never",
    managedBy: "Manual",
    infrastructure: "on-prem-dc2",
    application: "Vault DR Standby",
  },
  {
    id: "it-vlt-02",
    name: "dev-vault.internal",
    type: "Vault Server",
    scanned: true,
    environment: "Development",
    ownerTeam: "Unassigned",
    cryptoObjectIds: ["secret-003"],
    riskScore: 44,
    criticalViolations: 0,
    policyCoverage: 0,
    lastSeen: "2026-04-13 15:00",
    managedBy: "Manual",
    infrastructure: "on-prem-dc1",
    application: "Dev Vault",
  },
  {
    id: "it-gen-001",
    name: "application-01.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: ["gcert-030", "gcs-025", "gcert-001", "gcs-041", "gsshc-033", "gcs-020", "gcert-015"],
    riskScore: 54,
    criticalViolations: 1,
    policyCoverage: 75,
    lastSeen: "2026-06-27 09:01",
    managedBy: "Ansible",
    infrastructure: "aws-rds-prod",
    application: "Vault Cluster",
  },
  {
    id: "it-gen-002",
    name: "application-02.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["gcs-003", "gsshk-035", "gsshc-044", "gsshk-009", "gsshk-003"],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:02",
    managedBy: "Cloudflare",
    infrastructure: "aws-rds-prod",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-003",
    name: "application-03.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: [
      "gsshc-030",
      "gcs-024",
      "gcert-032",
      "gsshk-016",
      "gcert-017",
      "gsshc-012",
      "gcs-021",
      "gcs-032",
      "gcs-031",
    ],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:03",
    managedBy: "Ansible",
    infrastructure: "aws-us-west-2-prod",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-004",
    name: "application-04.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["gcert-029", "gcs-035", "gcs-048", "gsshc-034", "gcs-027", "gcs-044", "gcert-002"],
    riskScore: 100,
    criticalViolations: 6,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:04",
    managedBy: "Manual",
    infrastructure: "aws-us-west-2-prod",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-005",
    name: "application-05.stg.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Staging",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gcs-019", "gcs-046", "gcs-037", "gcert-012"],
    riskScore: 69,
    criticalViolations: 2,
    policyCoverage: 55,
    lastSeen: "2026-06-27 09:05",
    managedBy: "Terraform",
    infrastructure: "aws-us-west-2-prod",
    application: "Backup System",
  },
  {
    id: "it-gen-006",
    name: "k8s-06.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "DevOps",
    cryptoObjectIds: ["gcs-039", "gk8s-010", "gsshk-025", "gk8s-021", "gk8s-040", "gk8s-045", "gk8s-046", "gsshc-045"],
    riskScore: 100,
    criticalViolations: 6,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:06",
    managedBy: "Terraform",
    infrastructure: "gcp-gke-prod",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-007",
    name: "k8s-07.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "IT Operations",
    cryptoObjectIds: [
      "gk8s-032",
      "gk8s-031",
      "gk8s-013",
      "gk8s-002",
      "gcs-033",
      "gsshk-038",
      "gcert-022",
      "gk8s-011",
      "gcs-029",
    ],
    riskScore: 100,
    criticalViolations: 6,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:07",
    managedBy: "Ansible",
    infrastructure: "gcp-gke-prod",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-008",
    name: "k8s-08.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: ["gsshk-004", "gcert-003", "gk8s-007", "gk8s-023", "gk8s-003", "gk8s-009", "gsshc-047"],
    riskScore: 100,
    criticalViolations: 4,
    policyCoverage: 5,
    lastSeen: "2026-06-27 09:08",
    managedBy: "Kubernetes",
    infrastructure: "gcp-gke-prod",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-009",
    name: "k8s-09.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gk8s-041", "gcs-023", "gsshk-021", "gk8s-030", "gk8s-012"],
    riskScore: 81,
    criticalViolations: 2,
    policyCoverage: 45,
    lastSeen: "2026-06-27 09:09",
    managedBy: "Kubernetes",
    infrastructure: "gcp-gke-prod",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-010",
    name: "k8s-10.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Database Operations",
    cryptoObjectIds: ["gk8s-005", "gk8s-035", "gsshc-042"],
    riskScore: 45,
    criticalViolations: 0,
    policyCoverage: 85,
    lastSeen: "2026-06-27 09:10",
    managedBy: "Terraform",
    infrastructure: "gcp-gke-prod",
    application: "Backup System",
  },
  {
    id: "it-gen-011",
    name: "k8s-11.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["gk8s-025", "gcs-026", "gk8s-017", "gk8s-014", "gcs-022"],
    riskScore: 87,
    criticalViolations: 4,
    policyCoverage: 25,
    lastSeen: "2026-06-27 09:11",
    managedBy: "Manual",
    infrastructure: "aws-eks-prod",
    application: "Database Primary",
  },
  {
    id: "it-gen-012",
    name: "k8s-12.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["gcert-011", "gsshk-010", "gk8s-018", "gk8s-042", "gk8s-008", "gcs-004", "gsshc-046", "gk8s-020"],
    riskScore: 100,
    criticalViolations: 6,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:12",
    managedBy: "Ansible",
    infrastructure: "aws-eks-prod",
    application: "Database Primary",
  },
  {
    id: "it-gen-013",
    name: "k8s-13.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gk8s-048", "gk8s-029", "gcert-004", "gsshk-037", "gk8s-006"],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:13",
    managedBy: "Kubernetes",
    infrastructure: "aws-eks-prod",
    application: "Backup System",
  },
  {
    id: "it-gen-014",
    name: "k8s-14.dev.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Development",
    ownerTeam: "Site Reliability",
    cryptoObjectIds: ["gcs-014", "gcs-006", "gk8s-024"],
    riskScore: 60,
    criticalViolations: 2,
    policyCoverage: 70,
    lastSeen: "2026-06-27 09:14",
    managedBy: "Kubernetes",
    infrastructure: "aws-eks-prod",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-015",
    name: "application-15.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Identity & Access",
    cryptoObjectIds: ["gcs-010", "gsshc-051", "gsshc-035", "gsshc-036", "gsshk-011"],
    riskScore: 99,
    criticalViolations: 3,
    policyCoverage: 10,
    lastSeen: "2026-06-27 09:15",
    managedBy: "Terraform",
    infrastructure: "on-prem-dc2",
    application: "Artifact Registry",
  },
  {
    id: "it-gen-016",
    name: "application-16.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Site Reliability",
    cryptoObjectIds: ["gcs-040", "gcs-038", "gcert-008", "gcert-007", "gsshc-052"],
    riskScore: 69,
    criticalViolations: 2,
    policyCoverage: 55,
    lastSeen: "2026-06-27 09:16",
    managedBy: "Ansible",
    infrastructure: "on-prem-dc2",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-017",
    name: "application-17.dev.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Development",
    ownerTeam: "Site Reliability",
    cryptoObjectIds: [
      "gcert-006",
      "gsshc-020",
      "gsshk-006",
      "gsshk-005",
      "gsshk-023",
      "gsshk-015",
      "gcs-016",
      "gcs-030",
      "gcert-005",
    ],
    riskScore: 99,
    criticalViolations: 5,
    policyCoverage: 20,
    lastSeen: "2026-06-27 09:17",
    managedBy: "Ansible",
    infrastructure: "on-prem-dc2",
    application: "Payment Gateway",
  },
  {
    id: "it-gen-018",
    name: "k8s-18.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Data Engineering",
    cryptoObjectIds: ["gcert-013", "gk8s-038", "gsshc-017", "gk8s-044", "gsshc-027"],
    riskScore: 87,
    criticalViolations: 4,
    policyCoverage: 25,
    lastSeen: "2026-06-27 09:18",
    managedBy: "Terraform",
    infrastructure: "dev-eks-cluster",
    application: "Vault Cluster",
  },
  {
    id: "it-gen-019",
    name: "k8s-19.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Identity & Access",
    cryptoObjectIds: [
      "gk8s-043",
      "gk8s-034",
      "gcs-028",
      "gk8s-026",
      "gk8s-004",
      "gk8s-016",
      "gsshk-028",
      "gcert-018",
      "gcert-027",
    ],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:19",
    managedBy: "Kubernetes",
    infrastructure: "dev-eks-cluster",
    application: "Analytics Cluster",
  },
  {
    id: "it-gen-020",
    name: "k8s-20.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: ["gsshc-021", "gk8s-033", "gk8s-001", "gk8s-015", "gk8s-039", "gcs-008"],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:20",
    managedBy: "Manual",
    infrastructure: "dev-eks-cluster",
    application: "Backup System",
  },
  {
    id: "it-gen-021",
    name: "k8s-21.prod.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gk8s-022", "gk8s-049", "gk8s-047", "gk8s-028", "gk8s-036", "gcert-028", "gk8s-027"],
    riskScore: 100,
    criticalViolations: 6,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:21",
    managedBy: "Manual",
    infrastructure: "dev-eks-cluster",
    application: "Email Server",
  },
  {
    id: "it-gen-022",
    name: "k8s-22.stg.acmecorp.com",
    type: "K8s Cluster",
    scanned: true,
    environment: "Staging",
    ownerTeam: "Site Reliability",
    cryptoObjectIds: ["gsshc-024", "gsshc-023", "gk8s-019", "gk8s-037", "gcert-009"],
    riskScore: 81,
    criticalViolations: 2,
    policyCoverage: 45,
    lastSeen: "2026-06-27 09:22",
    managedBy: "Manual",
    infrastructure: "dev-eks-cluster",
    application: "Analytics Cluster",
  },
  {
    id: "it-gen-023",
    name: "application-23.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsshc-022", "gsshc-049", "gcs-013", "gcert-010", "gcert-031", "gsshk-022"],
    riskScore: 90,
    criticalViolations: 3,
    policyCoverage: 25,
    lastSeen: "2026-06-27 09:23",
    managedBy: "Terraform",
    infrastructure: "azure-eastus-prod",
    application: "Edge Gateway",
  },
  {
    id: "it-gen-024",
    name: "application-24.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsshc-013", "gcert-016", "gcert-023", "gsshc-015", "gcs-007"],
    riskScore: 99,
    criticalViolations: 3,
    policyCoverage: 20,
    lastSeen: "2026-06-27 09:24",
    managedBy: "Kubernetes",
    infrastructure: "azure-eastus-prod",
    application: "Artifact Registry",
  },
  {
    id: "it-gen-025",
    name: "application-25.dev.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Development",
    ownerTeam: "Security Operations",
    cryptoObjectIds: [
      "gsshk-036",
      "gsshc-026",
      "gsshc-006",
      "gcs-036",
      "gcs-011",
      "gsshc-019",
      "gsshk-034",
      "gsshc-016",
      "gsshc-040",
    ],
    riskScore: 100,
    criticalViolations: 4,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:25",
    managedBy: "Terraform",
    infrastructure: "on-prem-dc1",
    application: "Analytics Cluster",
  },
  {
    id: "it-gen-026",
    name: "application-26.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsshk-019", "gsshk-002", "gcs-034", "gcs-015", "gcs-009"],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:26",
    managedBy: "Manual",
    infrastructure: "on-prem-dc1",
    application: "Artifact Registry",
  },
  {
    id: "it-gen-027",
    name: "application-27.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Data Engineering",
    cryptoObjectIds: ["gcert-014", "gcs-002", "gcs-043", "gsshc-014", "gsshc-007"],
    riskScore: 57,
    criticalViolations: 1,
    policyCoverage: 70,
    lastSeen: "2026-06-27 09:27",
    managedBy: "Kubernetes",
    infrastructure: "on-prem-dc1",
    application: "Vault Cluster",
  },
  {
    id: "it-gen-028",
    name: "application-28.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "DevOps",
    cryptoObjectIds: ["gsshc-025", "gsshk-017", "gsshc-002", "gsshk-027", "gsshk-012"],
    riskScore: 100,
    criticalViolations: 4,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:28",
    managedBy: "Manual",
    infrastructure: "azure-eastus-stg",
    application: "Artifact Registry",
  },
  {
    id: "it-gen-029",
    name: "application-29.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Site Reliability",
    cryptoObjectIds: ["gsshk-029", "gsshc-039", "gsshc-009", "gcert-020", "gsshc-029", "gsshc-041", "gcert-019"],
    riskScore: 87,
    criticalViolations: 2,
    policyCoverage: 35,
    lastSeen: "2026-06-27 09:29",
    managedBy: "Kubernetes",
    infrastructure: "azure-eastus-stg",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-030",
    name: "application-30.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Database Operations",
    cryptoObjectIds: [
      "gsshc-032",
      "gsshc-004",
      "gcs-047",
      "gsshc-003",
      "gsshc-048",
      "gcs-045",
      "gsshc-008",
      "gcs-005",
      "gsshc-018",
    ],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:30",
    managedBy: "Terraform",
    infrastructure: "crypto4a-hsm-prod",
    application: "Email Server",
  },
  {
    id: "it-gen-031",
    name: "application-31.dev.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Development",
    ownerTeam: "Identity & Access",
    cryptoObjectIds: ["gsshk-013", "gcs-012", "gcert-021", "gsshc-038"],
    riskScore: 96,
    criticalViolations: 4,
    policyCoverage: 10,
    lastSeen: "2026-06-27 09:31",
    managedBy: "Manual",
    infrastructure: "crypto4a-hsm-prod",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-032",
    name: "application-32.dev.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Development",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: ["gsshc-053", "gsshk-026", "gsshc-011", "gsshc-037", "gsshk-032", "gsshk-024", "gcs-017"],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:32",
    managedBy: "Cloudflare",
    infrastructure: "gcp-us-central1",
    application: "Payment Gateway",
  },
  {
    id: "it-gen-033",
    name: "application-33.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Identity & Access",
    cryptoObjectIds: ["gsshk-018", "gsshc-005", "gsshk-008", "gsshk-014", "gsshk-007"],
    riskScore: 90,
    criticalViolations: 3,
    policyCoverage: 15,
    lastSeen: "2026-06-27 09:33",
    managedBy: "Manual",
    infrastructure: "gcp-us-central1",
    application: "Database Primary",
  },
  {
    id: "it-gen-034",
    name: "application-34.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsshc-010", "gsshk-030", "gcert-025", "gsshc-028", "gcert-026"],
    riskScore: 100,
    criticalViolations: 3,
    policyCoverage: 5,
    lastSeen: "2026-06-27 09:34",
    managedBy: "Ansible",
    infrastructure: "gcp-us-central1",
    application: "Analytics Cluster",
  },
  {
    id: "it-gen-035",
    name: "application-35.dev.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Development",
    ownerTeam: "IT Operations",
    cryptoObjectIds: ["gcert-024", "gsshc-001"],
    riskScore: 42,
    criticalViolations: 0,
    policyCoverage: 90,
    lastSeen: "2026-06-27 09:35",
    managedBy: "Manual",
    infrastructure: "gcp-us-central1",
    application: "Email Server",
  },
  {
    id: "it-gen-036",
    name: "application-36.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: [
      "gsshk-001",
      "gsshk-033",
      "gsshc-043",
      "gcs-018",
      "gsshk-031",
      "gcs-042",
      "gcs-001",
      "gsshk-020",
      "gsshc-031",
    ],
    riskScore: 100,
    criticalViolations: 8,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:36",
    managedBy: "Ansible",
    infrastructure: "aws-us-east-1-prod",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-037",
    name: "application-37.prod.acmecorp.com",
    type: "Application Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsshc-050"],
    riskScore: 51,
    criticalViolations: 1,
    policyCoverage: 70,
    lastSeen: "2026-06-27 09:37",
    managedBy: "Manual",
    infrastructure: "aws-us-east-1-prod",
    application: "Vault Cluster",
  },
  {
    id: "it-gen-038",
    name: "hsm-38.prod.acmecorp.com",
    type: "HSM",
    scanned: true,
    environment: "Production",
    ownerTeam: "Identity & Access",
    cryptoObjectIds: ["genc-001", "genc-045", "genc-024", "genc-003", "genc-022", "genc-057"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:38",
    managedBy: "Ansible",
    infrastructure: "crypto4a-hsm",
    application: "Backup System",
  },
  {
    id: "it-gen-039",
    name: "hsm-39.dev.acmecorp.com",
    type: "HSM",
    scanned: true,
    environment: "Development",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["genc-056", "genc-036", "genc-023", "genc-046"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:39",
    managedBy: "Ansible",
    infrastructure: "crypto4a-hsm",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-040",
    name: "api-40.prod.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: [
      "genc-040",
      "genc-031",
      "genc-042",
      "genc-048",
      "genc-029",
      "genc-051",
      "genc-012",
      "genc-055",
      "genc-010",
    ],
    riskScore: 100,
    criticalViolations: 5,
    policyCoverage: 0,
    lastSeen: "2026-06-27 09:40",
    managedBy: "Manual",
    infrastructure: "software-keystore",
    application: "Vault Cluster",
  },
  {
    id: "it-gen-041",
    name: "api-41.dev.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Development",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: ["genc-049", "genc-005", "genc-035", "genc-002", "genc-017", "genc-027", "genc-050"],
    riskScore: 84,
    criticalViolations: 3,
    policyCoverage: 25,
    lastSeen: "2026-06-27 09:41",
    managedBy: "Cloudflare",
    infrastructure: "software-keystore",
    application: "Internal API",
  },
  {
    id: "it-gen-042",
    name: "mail-42.prod.acmecorp.com",
    type: "Mail Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["genc-015", "genc-021", "genc-032", "genc-053"],
    riskScore: 51,
    criticalViolations: 1,
    policyCoverage: 70,
    lastSeen: "2026-06-27 09:42",
    managedBy: "Kubernetes",
    infrastructure: "software-keystore",
    application: "Email Server",
  },
  {
    id: "it-gen-043",
    name: "hsm-43.stg.acmecorp.com",
    type: "HSM",
    scanned: true,
    environment: "Staging",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["genc-039", "genc-052", "genc-014", "genc-041", "genc-047", "genc-030", "genc-013"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:43",
    managedBy: "Cloudflare",
    infrastructure: "utimaco-hsm",
    application: "Database Primary",
  },
  {
    id: "it-gen-044",
    name: "hsm-44.dev.acmecorp.com",
    type: "HSM",
    scanned: true,
    environment: "Development",
    ownerTeam: "Data Engineering",
    cryptoObjectIds: ["genc-004", "genc-011"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:44",
    managedBy: "Ansible",
    infrastructure: "utimaco-hsm",
    application: "Backup System",
  },
  {
    id: "it-gen-045",
    name: "vault-45.prod.acmecorp.com",
    type: "Vault Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Site Reliability",
    cryptoObjectIds: ["gsec-001", "gsec-054", "gsec-052", "gsec-032", "gsec-046", "genc-026", "gsec-022"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:45",
    managedBy: "Cloudflare",
    infrastructure: "azure-key-vault",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-046",
    name: "vault-46.prod.acmecorp.com",
    type: "Vault Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Data Engineering",
    cryptoObjectIds: [
      "gsec-020",
      "gsec-049",
      "gsec-018",
      "gsec-034",
      "gsec-035",
      "gsec-009",
      "gsec-021",
      "gsec-003",
      "genc-016",
    ],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:46",
    managedBy: "Cloudflare",
    infrastructure: "azure-key-vault",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-047",
    name: "vault-47.prod.acmecorp.com",
    type: "Vault Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Security Operations",
    cryptoObjectIds: [
      "gsec-005",
      "gsec-026",
      "gsec-053",
      "genc-018",
      "gsec-028",
      "genc-008",
      "genc-020",
      "genc-043",
      "genc-044",
    ],
    riskScore: 57,
    criticalViolations: 0,
    policyCoverage: 85,
    lastSeen: "2026-06-27 09:47",
    managedBy: "Ansible",
    infrastructure: "azure-key-vault",
    application: "SSO Service",
  },
  {
    id: "it-gen-048",
    name: "api-48.prod.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsec-044", "genc-006", "genc-038", "gsec-012", "gsec-007"],
    riskScore: 36,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:48",
    managedBy: "Ansible",
    infrastructure: "azure-key-vault",
    application: "Payment Gateway",
  },
  {
    id: "it-gen-049",
    name: "mail-49.stg.acmecorp.com",
    type: "Mail Server",
    scanned: true,
    environment: "Staging",
    ownerTeam: "DevOps",
    cryptoObjectIds: ["genc-019", "genc-007", "genc-028", "genc-037", "genc-054"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:49",
    managedBy: "Manual",
    infrastructure: "aws-kms",
    application: "Ingress Controller",
  },
  {
    id: "it-gen-050",
    name: "api-50.prod.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Payments Engineering",
    cryptoObjectIds: ["genc-025", "genc-033", "genc-034", "genc-009"],
    riskScore: 54,
    criticalViolations: 0,
    policyCoverage: 90,
    lastSeen: "2026-06-27 09:50",
    managedBy: "Cloudflare",
    infrastructure: "aws-kms",
    application: "Backup System",
  },
  {
    id: "it-gen-051",
    name: "api-51.prod.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Platform Engineering",
    cryptoObjectIds: ["gsec-033", "gsec-040", "gsec-047", "gsec-002", "gsec-016", "gsec-030"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:51",
    managedBy: "Ansible",
    infrastructure: "cyberark-conjur",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-052",
    name: "api-52.stg.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Staging",
    ownerTeam: "Payments Engineering",
    cryptoObjectIds: ["gsec-031", "gsec-039"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:52",
    managedBy: "Terraform",
    infrastructure: "cyberark-conjur",
    application: "Edge Gateway",
  },
  {
    id: "it-gen-053",
    name: "api-53.prod.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsec-023", "gsec-043", "gsec-027", "gsec-050", "gsec-008"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:53",
    managedBy: "Ansible",
    infrastructure: "aws-secrets-manager",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-054",
    name: "vault-54.prod.acmecorp.com",
    type: "Vault Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsec-011", "gsec-042", "gsec-006", "gsec-045", "gsec-004"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:54",
    managedBy: "Manual",
    infrastructure: "aws-secrets-manager",
    application: "Analytics Cluster",
  },
  {
    id: "it-gen-055",
    name: "vault-55.prod.acmecorp.com",
    type: "Vault Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "DevOps",
    cryptoObjectIds: ["gsec-056", "gsec-017", "gsec-038", "gsec-013"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:55",
    managedBy: "Ansible",
    infrastructure: "aws-secrets-manager",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-056",
    name: "api-56.dev.acmecorp.com",
    type: "API Gateway",
    scanned: true,
    environment: "Development",
    ownerTeam: "Infrastructure",
    cryptoObjectIds: ["gsec-055", "gsec-010", "gsec-014", "gsec-019", "gsec-029", "gsec-051"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:56",
    managedBy: "Manual",
    infrastructure: "hashicorp-vault",
    application: "Monitoring Stack",
  },
  {
    id: "it-gen-057",
    name: "database-57.prod.acmecorp.com",
    type: "Database Server",
    scanned: true,
    environment: "Production",
    ownerTeam: "Data Engineering",
    cryptoObjectIds: ["gsec-024", "gsec-041", "gsec-036", "gsec-015", "gsec-048", "gsec-025", "gsec-037"],
    riskScore: 30,
    criticalViolations: 0,
    policyCoverage: 100,
    lastSeen: "2026-06-27 09:57",
    managedBy: "Cloudflare",
    infrastructure: "hashicorp-vault",
    application: "Ingress Controller",
  },
];

// Risk driver data for each IT asset
// Deterministic per-asset driver hash. Seeded by the asset id so the same asset
// always yields the same number; no Math.random, stable across renders.
function seededInt(seed: string, lo: number, hi: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const span = hi - lo + 1;
  return lo + (Math.abs(h) % span);
}

// Risk drivers are derived deterministically from the asset's own fields. The
// number of objects, the policy coverage gap, and a stable per-asset seed give
// repeatable, realistic drivers without any randomness.
export function getAssetRiskDrivers(asset: ITAsset) {
  const s = asset.riskScore;
  const objCount = asset.cryptoObjectIds.length;
  const weakCerts = s > 70 ? Math.max(1, seededInt(asset.id + "wc", 1, 3)) : 0;
  const nearestExpiry = s > 60 ? seededInt(asset.id + "ex", 1, 14) : 0;
  const coverageGap = 100 - asset.policyCoverage;
  return {
    cryptoHealth: {
      score: Math.min(100, s + seededInt(asset.id + "ch", 0, 14) - 7),
      driver:
        weakCerts > 0 ? `${weakCerts} RSA-2048 certs with no migration plan` : "All algorithms meet minimum standards",
    },
    expiryExposure: {
      score: Math.min(100, s + seededInt(asset.id + "ee", 0, 19) - 10),
      driver: nearestExpiry > 0 ? `Nearest expiry in ${nearestExpiry} days` : "No urgent expirations",
    },
    policyCoverage: {
      score: coverageGap,
      driver:
        asset.policyCoverage < 80 ? `${coverageGap}% of objects lack active policy` : "All objects covered by policy",
    },
    blastRadius: {
      score: Math.min(100, objCount * 15),
      driver: `${objCount} identity dependencies shared across infrastructure`,
    },
  };
}

// AI narrative per asset
export function getAssetAINarrative(asset: ITAsset): string {
  if (asset.riskScore > 80)
    return `${asset.name} is critically exposed. ${asset.criticalViolations} active violations are driving the risk score, with ${asset.cryptoObjectIds.length} identities - several using quantum-vulnerable algorithms. Immediate action: renew expiring certificates and assign owners to orphaned keys.`;
  if (asset.riskScore > 60)
    return `${asset.name} has moderate exposure primarily driven by ${asset.policyCoverage < 50 ? "low policy coverage" : "approaching certificate expirations"}. ${asset.cryptoObjectIds.length} identities are associated. Recommended: attach compliance policies to uncovered identities.`;
  return `${asset.name} is well-managed with ${asset.policyCoverage}% policy coverage across ${asset.cryptoObjectIds.length} identities. No urgent actions required - continue monitoring.`;
}

// Blast radius relationships
export interface BlastRadiusNode {
  id: string;
  name: string;
  type: "asset" | "crypto";
  ring: 0 | 1 | 2 | 3;
  riskScore?: number;
  daysToExpiry?: number;
  violations?: number;
  sharedObjectCount?: number;
  cryptoType?: string;
}

export function getBlastRadius(
  assetId: string,
  cryptoAssets: any[],
): {
  nodes: BlastRadiusNode[];
  summary: { directDeps: number; siblingAssets: number; cascadeAssets: number; sentence: string };
} {
  const asset = mockITAssets.find((a) => a.id === assetId);
  if (!asset) return { nodes: [], summary: { directDeps: 0, siblingAssets: 0, cascadeAssets: 0, sentence: "" } };

  const ring0: BlastRadiusNode = { id: asset.id, name: asset.name, type: "asset", ring: 0, riskScore: asset.riskScore };

  // Ring 1: identities
  const ring1: BlastRadiusNode[] = asset.cryptoObjectIds.map((cid: string) => {
    const co = cryptoAssets.find((a: any) => a.id === cid);
    return {
      id: cid,
      name: co?.name || cid,
      type: "crypto" as const,
      ring: 1 as const,
      daysToExpiry: co?.daysToExpiry,
      violations: co?.policyViolations,
      cryptoType: co?.type,
    };
  });

  // Ring 2: sibling assets sharing identities
  const siblings = mockITAssets.filter(
    (a) => a.id !== assetId && a.cryptoObjectIds.some((c) => asset.cryptoObjectIds.includes(c)),
  );
  const ring2: BlastRadiusNode[] = siblings.map((s) => ({
    id: s.id,
    name: s.name,
    type: "asset" as const,
    ring: 2 as const,
    riskScore: s.riskScore,
    sharedObjectCount: s.cryptoObjectIds.filter((c) => asset.cryptoObjectIds.includes(c)).length,
  }));

  // Ring 3: cascade (assets sharing crypto with ring 2 but not ring 0)
  const ring2Ids = new Set(siblings.map((s) => s.id));
  const allSiblingCrypto = new Set(siblings.flatMap((s) => s.cryptoObjectIds));
  const cascadeAssets = mockITAssets.filter(
    (a) => a.id !== assetId && !ring2Ids.has(a.id) && a.cryptoObjectIds.some((c) => allSiblingCrypto.has(c)),
  );
  const ring3: BlastRadiusNode[] = cascadeAssets.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    type: "asset" as const,
    ring: 3 as const,
    riskScore: c.riskScore,
    sharedObjectCount: 1,
  }));

  const primaryCrypto = ring1[0]?.name || "this asset";
  return {
    nodes: [ring0, ...ring1, ...ring2, ...ring3],
    summary: {
      directDeps: ring1.length,
      siblingAssets: ring2.length,
      cascadeAssets: ring3.length,
      sentence: `Failure of ${primaryCrypto} would directly impact ${ring2.length} assets and cascade to ${ring3.length} more.`,
    },
  };
}

// Violations for asset detail
// violationType is fundamental: 'classic' = operational (expiry, ownership, rotation, storage),
// 'pqc' = quantum-vulnerable algorithm flagged for NIST 2030 deadline.
// A single credential can have BOTH simultaneously and they're tracked independently.
export type ViolationType = "classic" | "pqc";

export interface AssetViolation {
  objectName: string;
  objectId?: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  type: string;
  violationType: ViolationType;
  // PQC-only fields
  algorithm?: string;
  expiryYear?: number;
  yearsPastDeadline?: number;
  harvestRisk?: "Active" | "Passive" | "Unknown";
}

// Quantum-vulnerable algorithms (broken vs vulnerable)
const QUANTUM_BROKEN = ["RSA-1024", "SHA-1", "MD5", "DH-1024"];
const QUANTUM_VULNERABLE = [
  ...QUANTUM_BROKEN,
  "RSA-2048",
  "RSA-4096",
  "ECDSA-P256",
  "ECDSA-P384",
  "ECC P-256",
  "ECC P-384",
  "DH-2048",
];

export function isQuantumVulnerable(algorithm: string): boolean {
  return QUANTUM_VULNERABLE.includes(algorithm);
}

// PQC severity inverts classic logic: long-lived quantum-vulnerable certs are MORE severe.
export function pqcSeverity(opts: {
  algorithm: string;
  expiryYear: number;
  isProduction: boolean;
  isDataEncryption?: boolean;
}): "Critical" | "High" | "Medium" | "Low" | "none" {
  const { algorithm, expiryYear, isProduction, isDataEncryption } = opts;
  if (!isQuantumVulnerable(algorithm)) return "none";
  if (expiryYear < 2027) return "Low";
  if (QUANTUM_BROKEN.includes(algorithm) && expiryYear >= 2030) return "Critical";
  if (QUANTUM_BROKEN.includes(algorithm)) return "High";
  if (isDataEncryption && isProduction && expiryYear >= 2030) return "Critical";
  if (expiryYear >= 2030 && isProduction) return "High";
  if (expiryYear >= 2028 && isProduction) return "Medium";
  return "Low";
}

export function getAssetViolations(
  asset: ITAsset,
  objects?: {
    id: string;
    name: string;
    type: string;
    algorithm: string;
    daysToExpiry: number;
    owner: string;
    status: string;
    pqcRisk: string;
    rotationFrequency: string;
    policyViolations: number;
  }[],
): AssetViolation[] {
  const violations: AssetViolation[] = [];

  // Faithful path: when the asset's real linked crypto objects are supplied,
  // derive every violation from each object's actual state (expiry, owner,
  // rotation, algorithm, PQC risk). No asset-level thresholds, no fake algos.
  if (objects && objects.length > 0) {
    for (const o of objects) {
      // ── Operational (classic) ──
      if (o.status === "Expired" || o.daysToExpiry < 0) {
        violations.push({
          objectName: o.name,
          objectId: o.id,
          severity: "Critical",
          type: "Certificate expired",
          violationType: "classic",
        });
      } else if (o.daysToExpiry >= 0 && o.daysToExpiry <= 7) {
        violations.push({
          objectName: o.name,
          objectId: o.id,
          severity: "Critical",
          type: `Expiring in ${o.daysToExpiry} day${o.daysToExpiry === 1 ? "" : "s"}`,
          violationType: "classic",
        });
      } else if (o.daysToExpiry > 7 && o.daysToExpiry <= 30) {
        violations.push({
          objectName: o.name,
          objectId: o.id,
          severity: "High",
          type: `Expiring in ${o.daysToExpiry} days`,
          violationType: "classic",
        });
      }
      if (
        o.rotationFrequency === "Never" &&
        (o.type === "SSH Key" || o.type === "API Key / Secret" || o.type === "Encryption Key")
      ) {
        violations.push({
          objectName: o.name,
          objectId: o.id,
          severity: "High",
          type: "Rotation policy not set",
          violationType: "classic",
        });
      }
      // ── PQC / quantum ──
      if (o.pqcRisk === "Critical" || o.pqcRisk === "High") {
        violations.push({
          objectName: o.name,
          objectId: o.id,
          severity: o.pqcRisk === "Critical" ? "Critical" : "High",
          type: `Quantum-vulnerable: ${o.algorithm}`,
          violationType: "pqc",
          algorithm: o.algorithm,
          expiryYear: o.daysToExpiry > 0 ? new Date(Date.now() + o.daysToExpiry * 86400000).getFullYear() : 2030,
          yearsPastDeadline: 0,
          harvestRisk: o.pqcRisk === "Critical" ? "Active" : "Passive",
        });
      }
    }
    return violations;
  }

  // Fallback (no objects supplied): keep a minimal asset-level summary so the
  // count badge still works, but this path is no longer used by the panel.
  if (asset.criticalViolations > 0) {
    violations.push({
      objectName: asset.cryptoObjectIds[0] ?? asset.name,
      objectId: asset.cryptoObjectIds[0],
      severity: "High",
      type: `${asset.criticalViolations} critical finding${asset.criticalViolations === 1 ? "" : "s"}`,
      violationType: "classic",
    });
  }
  return violations;
}

// Groups mock data
export interface DynamicGroup {
  id: string;
  name: string;
  type: "Dynamic" | "Manual";
  objectCount: number;
  objectIds: string[];
  conditions?: GroupCondition[];
  conditionSummary?: string;
  riskScore: number;
  policyCount: number;
  policyCoverage: number;
  lastEvaluated: string;
  aiSuggested?: boolean;
  aiRationale?: string;
  ownerTeam?: string;
  // Composition stats
  topAlgorithms: { name: string; count: number }[];
  topEnvironments: { name: string; count: number }[];
  topIssuers: { name: string; count: number }[];
  typeBreakdown: { name: string; value: number }[];
  // Posture
  posture: { ah: number; ep: number; pqr: number; gc: number; ait: number };
  trendData: number[];
  aiNarrative: string;
  // Policies
  policies: GroupPolicy[];
  // Remediation tasks
  remediationTasks: RemediationTask[];
}

export interface GroupCondition {
  id: string;
  attribute: string;
  operator: string;
  value: string;
  logic?: "AND" | "OR";
}

export interface GroupPolicy {
  id: string;
  name: string;
  enforcementMode: "Report" | "Warn" | "Enforce" | "Quarantine";
  objectsCovered: number;
  violations: number;
  enabled: boolean;
}

export interface RemediationTask {
  id: string;
  objectName: string;
  taskType: string;
  severity: "Critical" | "High" | "Medium";
  status: "Pending" | "In Progress" | "Completed";
  assignee: string;
}

export const mockGroups: DynamicGroup[] = [
  {
    id: "grp-001",
    name: "RSA-2048 Production Certs",
    type: "Dynamic",
    objectCount: 47,
    objectIds: [
      "cert-001",
      "cert-003",
      "cert-004",
      "cert-007",
      "cert-008",
      "cert-009",
      "cert-010",
      "ssh-001",
      "ssh-005",
      "sshcert-002",
      "k8s-003",
      "k8s-004",
    ],
    conditions: [
      { id: "c1", attribute: "Algorithm", operator: "equals", value: "RSA-2048", logic: "AND" },
      { id: "c2", attribute: "Environment", operator: "equals", value: "Production" },
    ],
    conditionSummary: "All RSA-2048 objects in Production",
    riskScore: 78,
    policyCount: 2,
    policyCoverage: 62,
    lastEvaluated: "10 min ago",
    topAlgorithms: [{ name: "RSA-2048", count: 47 }],
    topEnvironments: [{ name: "Production", count: 47 }],
    topIssuers: [{ name: "GlobalSign Atlas", count: 47 }],
    typeBreakdown: [
      { name: "TLS Certificates", value: 32 },
      { name: "SSH Keys", value: 8 },
      { name: "K8s Certs", value: 7 },
    ],
    posture: { ah: 28, ep: 45, pqr: 12, gc: 65, ait: 80 },
    trendData: [
      82, 80, 79, 81, 83, 82, 80, 78, 79, 80, 81, 79, 78, 77, 78, 79, 80, 78, 77, 76, 78, 79, 78, 77, 76, 78, 79, 78,
      78, 78,
    ],
    aiNarrative:
      "This group's risk is driven primarily by poor Algorithm Health - all 47 objects use RSA-2048, which is quantum-vulnerable with no active migration plan. 8 objects expire within 30 days. Recommended: activate the NIST SP 800-131A compliance pack and queue top-10 harvest-risk objects for PQC migration.",
    policies: [
      {
        id: "gp-001",
        name: "Weak Algorithm Detection",
        enforcementMode: "Warn",
        objectsCovered: 47,
        violations: 47,
        enabled: true,
      },
      {
        id: "gp-002",
        name: "Certificate Expiry Alert",
        enforcementMode: "Enforce",
        objectsCovered: 32,
        violations: 8,
        enabled: true,
      },
    ],
    remediationTasks: [
      {
        id: "rt-001",
        objectName: "*.payments.acmecorp.com",
        taskType: "PQC Migration",
        severity: "Critical",
        status: "Pending",
        assignee: "Sarah Chen",
      },
      {
        id: "rt-002",
        objectName: "vault.internal.acmecorp.com",
        taskType: "Renew + Rekey",
        severity: "Critical",
        status: "In Progress",
        assignee: "Mike Rodriguez",
      },
      {
        id: "rt-003",
        objectName: "prod-db-01-authorized-key",
        taskType: "Rotate",
        severity: "High",
        status: "Pending",
        assignee: "Unassigned",
      },
      {
        id: "rt-004",
        objectName: "mail.acmecorp.com",
        taskType: "Renew",
        severity: "High",
        status: "Pending",
        assignee: "IT Operations",
      },
    ],
  },
  {
    id: "grp-002",
    name: "Expiring < 30 Days",
    type: "Dynamic",
    objectCount: 12,
    objectIds: ["cert-001", "cert-008", "cert-009", "sshcert-002", "k8s-001", "k8s-002"],
    conditions: [{ id: "c1", attribute: "Days to Expiry", operator: "less_than", value: "30" }],
    conditionSummary: "All objects expiring within 30 days",
    riskScore: 89,
    policyCount: 1,
    policyCoverage: 42,
    lastEvaluated: "5 min ago",
    topAlgorithms: [
      { name: "RSA-2048", count: 5 },
      { name: "ECC P-256", count: 3 },
      { name: "HMAC-SHA256", count: 4 },
    ],
    topEnvironments: [{ name: "Production", count: 12 }],
    topIssuers: [
      { name: "GlobalSign Atlas", count: 6 },
      { name: "AVX SSH CA", count: 4 },
    ],
    typeBreakdown: [
      { name: "TLS Certificates", value: 3 },
      { name: "AI Tokens", value: 4 },
      { name: "K8s Certs", value: 2 },
      { name: "SSH Certs", value: 1 },
      { name: "Other", value: 2 },
    ],
    posture: { ah: 55, ep: 8, pqr: 35, gc: 48, ait: 60 },
    trendData: [
      65, 68, 70, 72, 75, 74, 76, 78, 80, 82, 83, 84, 85, 86, 87, 86, 87, 88, 87, 88, 89, 88, 89, 89, 89, 89, 89, 89,
      89, 89,
    ],
    aiNarrative:
      "This group is critically exposed - 12 objects expire within 30 days with only 42% policy coverage. 3 TLS certificates serve production infrastructure with no auto-renewal configured. Immediate action: enable auto-renewal where possible and create tickets for manual renewals.",
    policies: [
      {
        id: "gp-003",
        name: "Certificate Expiry Alert",
        enforcementMode: "Enforce",
        objectsCovered: 5,
        violations: 12,
        enabled: true,
      },
    ],
    remediationTasks: [
      {
        id: "rt-005",
        objectName: "*.payments.acmecorp.com",
        taskType: "Renew",
        severity: "Critical",
        status: "Pending",
        assignee: "Sarah Chen",
      },
      {
        id: "rt-006",
        objectName: "k8s-node-ssh-cert",
        taskType: "Re-issue",
        severity: "Critical",
        status: "Pending",
        assignee: "Platform Team",
      },
      {
        id: "rt-007",
        objectName: "vault.internal.acmecorp.com",
        taskType: "Renew",
        severity: "Critical",
        status: "In Progress",
        assignee: "Mike Rodriguez",
      },
    ],
  },
  {
    id: "grp-003",
    name: "Orphaned & Unowned Keys",
    type: "Dynamic",
    objectCount: 6,
    objectIds: ["ssh-001", "ssh-005", "secret-002"],
    conditions: [
      { id: "c1", attribute: "Has Owner", operator: "equals", value: "No", logic: "OR" },
      { id: "c2", attribute: "Status", operator: "equals", value: "Orphaned" },
    ],
    conditionSummary: "All objects with no owner or Orphaned status",
    riskScore: 74,
    policyCount: 1,
    policyCoverage: 33,
    lastEvaluated: "15 min ago",
    topAlgorithms: [
      { name: "RSA-2048", count: 4 },
      { name: "HMAC-SHA256", count: 2 },
    ],
    topEnvironments: [{ name: "Production", count: 6 }],
    topIssuers: [
      { name: "N/A", count: 3 },
      { name: "AWS IAM", count: 1 },
      { name: "GitHub", count: 1 },
    ],
    typeBreakdown: [
      { name: "SSH Keys", value: 3 },
      { name: "API Keys", value: 2 },
      { name: "Other", value: 1 },
    ],
    posture: { ah: 40, ep: 60, pqr: 45, gc: 10, ait: 70 },
    trendData: [
      70, 71, 72, 72, 73, 74, 74, 74, 73, 74, 74, 73, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74, 74,
      74, 74,
    ],
    aiNarrative:
      "Governance Cover is critically low at 10%. These 6 objects have no assigned owner, making incident response impossible. 3 SSH keys haven't been rotated in over 300 days. Assign ownership immediately and enforce rotation policies.",
    policies: [
      {
        id: "gp-004",
        name: "Orphaned SSH Key",
        enforcementMode: "Warn",
        objectsCovered: 2,
        violations: 3,
        enabled: true,
      },
    ],
    remediationTasks: [
      {
        id: "rt-008",
        objectName: "prod-db-01-authorized-key",
        taskType: "Assign Owner",
        severity: "High",
        status: "Pending",
        assignee: "Unassigned",
      },
      {
        id: "rt-009",
        objectName: "gitlab-deploy-key",
        taskType: "Rotate + Assign",
        severity: "High",
        status: "Pending",
        assignee: "Unassigned",
      },
    ],
  },
  {
    id: "grp-004",
    name: "Payments Team Assets",
    type: "Manual",
    objectCount: 8,
    objectIds: ["cert-001", "k8s-001", "enc-001", "secret-001"],
    riskScore: 62,
    policyCount: 3,
    policyCoverage: 88,
    lastEvaluated: "1 hour ago",
    topAlgorithms: [
      { name: "RSA-2048", count: 2 },
      { name: "ECC P-256", count: 3 },
      { name: "AES-256", count: 2 },
    ],
    topEnvironments: [
      { name: "Production", count: 7 },
      { name: "Staging", count: 1 },
    ],
    topIssuers: [
      { name: "GlobalSign Atlas", count: 3 },
      { name: "AWS KMS", count: 2 },
      { name: "Azure Key Vault", count: 1 },
    ],
    typeBreakdown: [
      { name: "TLS Certificates", value: 3 },
      { name: "K8s Certs", value: 2 },
      { name: "Enc Keys", value: 2 },
      { name: "Secrets", value: 1 },
    ],
    posture: { ah: 55, ep: 50, pqr: 40, gc: 85, ait: 75 },
    trendData: [
      68, 67, 66, 65, 64, 63, 63, 62, 62, 62, 63, 63, 62, 62, 61, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62,
      62, 62,
    ],
    aiNarrative:
      "The Payments team maintains good governance with 88% policy coverage. Primary concern is 2 RSA-2048 certificates in the PCI-DSS zone that need PQC migration planning. Expiry posture is moderate - one wildcard cert expires in 6 days.",
    policies: [
      {
        id: "gp-005",
        name: "PCI-DSS Cardholder Zone",
        enforcementMode: "Enforce",
        objectsCovered: 6,
        violations: 0,
        enabled: true,
      },
      {
        id: "gp-006",
        name: "Certificate Expiry Alert",
        enforcementMode: "Enforce",
        objectsCovered: 5,
        violations: 1,
        enabled: true,
      },
      {
        id: "gp-007",
        name: "Weak Algorithm Detection",
        enforcementMode: "Warn",
        objectsCovered: 8,
        violations: 2,
        enabled: true,
      },
    ],
    remediationTasks: [
      {
        id: "rt-010",
        objectName: "*.payments.acmecorp.com",
        taskType: "Renew",
        severity: "Critical",
        status: "In Progress",
        assignee: "Sarah Chen",
      },
    ],
  },
];

export const aiSuggestedGroups: Partial<DynamicGroup>[] = [
  {
    id: "ai-grp-001",
    name: "GlobalSign Certs - 90-Day Validity",
    aiSuggested: true,
    objectCount: 186,
    type: "Dynamic",
    conditions: [
      { id: "ac1", attribute: "Issuing CA", operator: "equals", value: "GlobalSign Atlas", logic: "AND" },
      { id: "ac2", attribute: "Validity Period", operator: "less_than", value: "91 days" },
    ],
    conditionSummary: "All GlobalSign Atlas certs with validity period ≤ 90 days",
    aiRationale:
      "186 objects share this CA and validity period. 12 expire within 30 days with no auto-renewal - your highest-risk uncovered segment.",
    riskScore: 71,
  },
  {
    id: "ai-grp-002",
    name: "Production Self-Signed Certificates",
    aiSuggested: true,
    objectCount: 12,
    type: "Dynamic",
    conditions: [
      { id: "ac3", attribute: "Issuing CA", operator: "equals", value: "Self-Signed", logic: "AND" },
      { id: "ac4", attribute: "Environment", operator: "equals", value: "Production" },
    ],
    conditionSummary: "All self-signed certs in Production",
    aiRationale:
      "12 self-signed certificates in production with zero policy coverage. These bypass trust chain validation entirely.",
    riskScore: 88,
  },
];

// Condition builder attributes catalog
export const conditionAttributes = {
  identity: [
    {
      label: "Object Type",
      values: [
        "TLS Certificate",
        "SSH Key",
        "SSH Certificate",
        "Code-Signing Certificate",
        "K8s Workload Cert",
        "Encryption Key",
        "API Key / Secret",
      ],
    },
    {
      label: "Algorithm",
      values: [
        "RSA-2048",
        "RSA-4096",
        "ECC P-256",
        "ECC P-384",
        "Ed25519",
        "AES-256",
        "HMAC-SHA256",
        "ML-KEM",
        "ML-DSA",
        "SLH-DSA",
      ],
    },
    { label: "Key Size", values: ["256", "384", "2048", "4096"] },
    {
      label: "Issuing CA",
      values: [
        "GlobalSign Atlas",
        "AVX SSH CA",
        "AWS KMS",
        "Azure Key Vault",
        "HashiCorp Vault",
        "CyberArk Conjur",
        "Crypto4A HSM",
        "Utimaco HSM",
      ],
    },
    { label: "Self-Signed", values: ["Yes", "No"] },
    { label: "Wildcard", values: ["Yes", "No"] },
    { label: "CA Type", values: ["Public", "Private", "Self-Signed"] },
  ],
  lifecycle: [
    { label: "Days to Expiry", values: ["< 7", "< 30", "< 90", "Expired", "No expiry"] },
    { label: "Validity Period", values: ["< 90 days", "< 365 days", "> 365 days", "> 825 days"] },
    { label: "Last Rotation", values: ["Never", "> 90 days", "> 180 days", "> 365 days"] },
    { label: "Renewal Method", values: ["Manual", "ACME", "Auto-enrolled", "Unknown"] },
  ],
  infrastructure: [
    { label: "Environment", values: ["Production", "Staging", "Development"] },
    { label: "Cloud Provider", values: ["AWS", "Azure", "GCP", "On-prem"] },
    { label: "K8s Namespace", values: ["payments", "api", "monitoring", "default", "security"] },
  ],
  discovery: [
    {
      label: "Discovery Vector",
      values: [
        "CT Log",
        "Network Scan",
        "Endpoint Agent",
        "Cloud API",
        "Kubernetes API",
        "Source Code Scan",
        "SSH Host Scan",
        "CA Connector",
        "CMDB Import",
      ],
    },
    { label: "Shadow Certificate", values: ["Yes", "No"] },
  ],
  ownership: [
    {
      label: "Owner Team",
      values: [
        "Payments Engineering",
        "Platform Engineering",
        "Infrastructure",
        "DevOps",
        "Security Operations",
        "AI Engineering",
        "IT Operations",
        "Database Operations",
        "Identity & Access",
      ],
    },
    { label: "Has Owner", values: ["Yes", "No"] },
    { label: "Managed By", values: ["Terraform", "Kubernetes", "Ansible", "Manual", "Cloudflare"] },
  ],
};
