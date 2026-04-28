import React, { createContext, useContext, useMemo, useState } from 'react';
import { mockAssets, type CryptoAsset } from '@/data/mockData';

export type PushCertType = 'Server' | 'Client' | 'Intermediate' | 'Root';
export type PushCategory = 'ADC' | 'Cloud' | 'Firewall' | 'MDM' | 'Server' | 'WAF';
export type WorkOrderStatus = 'Pending' | 'Push-Review In Progress' | 'Approved' | 'Completed' | 'Push Failed';

export interface DeviceTarget {
  id: string;
  hostname: string;
  ip: string;
  category: PushCategory;
}

export interface PermissionConfig {
  owner: string;
  ownerPermission: string;
  userGroup: string;
  userGroupPermission: string;
  otherUserPermission: string;
}

export interface ConnectorFormValues {
  category: PushCategory;
  vendor: string;
  serviceType: string;
  connectorName: string;
  description: string;
  selectedDevices: DeviceTarget[];
  certificateType: string;
  certificateFileName: string;
  keyFileName: string;
  pfxPassword: string;
  pushRootIntermediate: boolean;
  enableTruststoreUpdate: boolean;
  enableOwnership: boolean;
  permissionConfig: PermissionConfig;
  configurationName: string;
  certificateCategoryName: string;
  kdbFileName: string;
  kdbPassword: string;
  serverCertificateLabel: string;
  intermediateCertificateLabel: string;
  rootCertificateLabel: string;
  privateKeyInDevice: boolean;
  scriptLocation: 'platform' | 'device';
  prePushScript: string;
  postPushScript: string;
  overwrite: boolean;
  pushAutomatically: boolean;
}

export interface AuditRow {
  id: string;
  timestamp: string;
  actor: string;
  status: string;
  action: string;
}

export interface PushOperation {
  requestId: string;
  certificateId: string;
  commonName: string;
  action: 'Push to Device';
  connectorId: string;
  connectorName: string;
  status: WorkOrderStatus;
  created: string;
  lastUpdated: string;
  certType: PushCertType;
  category: PushCategory;
  vendor: string;
  targetDevices: string[];
  workflow: {
    submit: boolean;
    approve: boolean;
    implement: boolean;
  };
  details: ConnectorFormValues;
  auditTrail: AuditRow[];
}

export interface ConnectorRecord {
  id: string;
  certificateId: string;
  certType: PushCertType;
  connectorName: string;
  category: PushCategory;
  vendor: string;
  status: WorkOrderStatus;
  workOrderRef: string;
  values: ConnectorFormValues;
}

interface CertificateWorkflowContextType {
  selectedCertificateIds: string[];
  selectedCertType: PushCertType;
  setSelection: (certificateIds: string[], certType: PushCertType) => void;
  getCertificateById: (certificateId?: string) => CryptoAsset | undefined;
  connectors: ConnectorRecord[];
  operations: PushOperation[];
  addConnector: (certificateId: string, certType: PushCertType, values: ConnectorFormValues) => ConnectorRecord;
  updateConnector: (connectorId: string, values: ConnectorFormValues) => void;
  deleteConnector: (connectorId: string) => void;
  submitConnector: (connectorId: string) => void;
  approveConnector: (connectorId: string) => void;
  implementConnector: (connectorId: string) => void;
  getConnectorsForCertificate: (certificateId?: string) => ConnectorRecord[];
  getOperationByConnector: (connectorId: string) => PushOperation | undefined;
  getOperationByRequestId: (requestId?: string) => PushOperation | undefined;
}

const tlsCertificates = mockAssets.filter((asset): asset is CryptoAsset => asset.type === 'TLS Certificate');

const defaultPermissionConfig: PermissionConfig = {
  owner: 'www-data',
  ownerPermission: 'Read (r)',
  userGroup: 'ssl-certs',
  userGroupPermission: 'Read (r)',
  otherUserPermission: 'Read (r)',
};

export const defaultConnectorValues: ConnectorFormValues = {
  category: 'Server',
  vendor: 'Generic Linux',
  serviceType: 'ACM',
  connectorName: '',
  description: '',
  selectedDevices: [],
  certificateType: 'PEM (*.crt)',
  certificateFileName: 'certificate',
  keyFileName: 'private-key',
  pfxPassword: '',
  pushRootIntermediate: true,
  enableTruststoreUpdate: false,
  enableOwnership: false,
  permissionConfig: defaultPermissionConfig,
  configurationName: '',
  certificateCategoryName: '',
  kdbFileName: '',
  kdbPassword: '',
  serverCertificateLabel: '',
  intermediateCertificateLabel: '',
  rootCertificateLabel: '',
  privateKeyInDevice: false,
  scriptLocation: 'platform',
  prePushScript: '',
  postPushScript: '',
  overwrite: true,
  pushAutomatically: false,
};

const now = () => new Date().toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const makeRequestId = () => `R${Math.floor(10000 + Math.random() * 90000)}`;
const makeKey = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const initialCertificate = tlsCertificates[0];
const initialRequestId = 'R14202';
const seededConnectorValues: ConnectorFormValues = {
  ...defaultConnectorValues,
  category: 'Server',
  vendor: 'Nginx Linux',
  connectorName: 'payments-nginx-prod',
  description: 'Primary payment edge deployment',
  selectedDevices: [
    { id: 'seed-device-1', hostname: 'web-prod-01.acme.com', ip: '10.0.1.10', category: 'Server' },
    { id: 'seed-device-2', hostname: 'web-prod-02.acme.com', ip: '10.0.1.11', category: 'Server' },
  ],
  certificateFileName: 'payments-prod',
  keyFileName: 'payments-prod-key',
  prePushScript: 'pre-push.zip',
  postPushScript: 'post-push.zip',
};

const seedConnectors: ConnectorRecord[] = initialCertificate ? [{
  id: 'connector-seed-1',
  certificateId: initialCertificate.id,
  certType: 'Server',
  connectorName: seededConnectorValues.connectorName,
  category: seededConnectorValues.category,
  vendor: seededConnectorValues.vendor,
  status: 'Completed',
  workOrderRef: initialRequestId,
  values: seededConnectorValues,
}] : [];

const seedOperations: PushOperation[] = initialCertificate ? [{
  requestId: initialRequestId,
  certificateId: initialCertificate.id,
  commonName: initialCertificate.commonName,
  action: 'Push to Device',
  connectorId: 'connector-seed-1',
  connectorName: seededConnectorValues.connectorName,
  status: 'Completed',
  created: 'Apr 22, 8:21 AM',
  lastUpdated: 'Apr 22, 8:39 AM',
  certType: 'Server',
  category: seededConnectorValues.category,
  vendor: seededConnectorValues.vendor,
  targetDevices: seededConnectorValues.selectedDevices.map((device) => device.hostname),
  workflow: { submit: true, approve: true, implement: true },
  details: seededConnectorValues,
  auditTrail: [
    { id: 'audit-1', timestamp: 'Apr 22, 8:21 AM', actor: 'Sarah Chen', status: 'Pending', action: 'Connector saved' },
    { id: 'audit-2', timestamp: 'Apr 22, 8:29 AM', actor: 'Security Admin', status: 'Push-Review In Progress', action: 'Submitted for review' },
    { id: 'audit-3', timestamp: 'Apr 22, 8:33 AM', actor: 'Security Admin', status: 'Approved', action: 'Approved for implementation' },
    { id: 'audit-4', timestamp: 'Apr 22, 8:39 AM', actor: 'PKI Engineer', status: 'Completed', action: 'Certificate pushed to device' },
  ],
}] : [];

const CertificateWorkflowContext = createContext<CertificateWorkflowContextType | undefined>(undefined);

export function CertificateWorkflowProvider({ children }: { children: React.ReactNode }) {
  const [selectedCertificateIds, setSelectedCertificateIds] = useState<string[]>(initialCertificate ? [initialCertificate.id] : []);
  const [selectedCertType, setSelectedCertType] = useState<PushCertType>('Server');
  const [connectors, setConnectors] = useState<ConnectorRecord[]>(seedConnectors);
  const [operations, setOperations] = useState<PushOperation[]>(seedOperations);

  const certificateMap = useMemo(() => new Map(tlsCertificates.map((certificate) => [certificate.id, certificate])), []);

  const logAction = (operation: PushOperation, status: WorkOrderStatus, action: string): PushOperation => ({
    ...operation,
    status,
    lastUpdated: now(),
    auditTrail: [
      { id: makeKey('audit'), timestamp: now(), actor: 'Current User', status, action },
      ...operation.auditTrail,
    ],
  });

  const setSelection = (certificateIds: string[], certType: PushCertType) => {
    setSelectedCertificateIds(certificateIds);
    setSelectedCertType(certType);
  };

  const getCertificateById = (certificateId?: string) => {
    const resolvedId = certificateId || selectedCertificateIds[0];
    return resolvedId ? certificateMap.get(resolvedId) : undefined;
  };

  const addConnector = (certificateId: string, certType: PushCertType, values: ConnectorFormValues) => {
    const requestId = makeRequestId();
    const connector: ConnectorRecord = {
      id: makeKey('connector'),
      certificateId,
      certType,
      connectorName: values.connectorName,
      category: values.category,
      vendor: values.vendor,
      status: 'Pending',
      workOrderRef: requestId,
      values,
    };

    const certificate = certificateMap.get(certificateId);
    const operation: PushOperation = {
      requestId,
      certificateId,
      commonName: certificate?.commonName || 'Unknown certificate',
      action: 'Push to Device',
      connectorId: connector.id,
      connectorName: values.connectorName,
      status: 'Pending',
      created: now(),
      lastUpdated: now(),
      certType,
      category: values.category,
      vendor: values.vendor,
      targetDevices: values.selectedDevices.map((device) => device.hostname),
      workflow: { submit: false, approve: false, implement: false },
      details: values,
      auditTrail: [
        { id: makeKey('audit'), timestamp: now(), actor: 'Current User', status: 'Pending', action: 'Connector saved' },
      ],
    };

    setConnectors((current) => [connector, ...current.filter((item) => item.id !== connector.id)]);
    setOperations((current) => [operation, ...current]);
    return connector;
  };

  const updateConnector = (connectorId: string, values: ConnectorFormValues) => {
    setConnectors((current) => current.map((connector) => connector.id === connectorId ? {
      ...connector,
      connectorName: values.connectorName,
      category: values.category,
      vendor: values.vendor,
      values,
    } : connector));

    setOperations((current) => current.map((operation) => operation.connectorId === connectorId ? {
      ...operation,
      connectorName: values.connectorName,
      category: values.category,
      vendor: values.vendor,
      targetDevices: values.selectedDevices.map((device) => device.hostname),
      details: values,
      lastUpdated: now(),
    } : operation));
  };

  const deleteConnector = (connectorId: string) => {
    setConnectors((current) => current.filter((connector) => connector.id != connectorId));
    setOperations((current) => current.filter((operation) => operation.connectorId != connectorId));
  };

  const updateWorkflow = (connectorId: string, kind: 'submit' | 'approve' | 'implement', status: WorkOrderStatus, action: string) => {
    setConnectors((current) => current.map((connector) => connector.id === connectorId ? { ...connector, status } : connector));
    setOperations((current) => current.map((operation) => {
      if (operation.connectorId !== connectorId) return operation;
      const next = logAction({
        ...operation,
        workflow: {
          ...operation.workflow,
          [kind]: true,
        },
      }, status, action);
      return next;
    }));
  };

  const submitConnector = (connectorId: string) => updateWorkflow(connectorId, 'submit', 'Push-Review In Progress', 'Submitted for review');
  const approveConnector = (connectorId: string) => updateWorkflow(connectorId, 'approve', 'Approved', 'Approved for implementation');
  const implementConnector = (connectorId: string) => updateWorkflow(connectorId, 'implement', 'Completed', 'Certificate pushed to device');

  const getConnectorsForCertificate = (certificateId?: string) => {
    const resolvedId = certificateId || selectedCertificateIds[0];
    return connectors.filter((connector) => connector.certificateId === resolvedId);
  };

  const getOperationByConnector = (connectorId: string) => operations.find((operation) => operation.connectorId === connectorId);
  const getOperationByRequestId = (requestId?: string) => operations.find((operation) => operation.requestId === requestId);

  return (
    <CertificateWorkflowContext.Provider value={{
      selectedCertificateIds,
      selectedCertType,
      setSelection,
      getCertificateById,
      connectors,
      operations,
      addConnector,
      updateConnector,
      deleteConnector,
      submitConnector,
      approveConnector,
      implementConnector,
      getConnectorsForCertificate,
      getOperationByConnector,
      getOperationByRequestId,
    }}>
      {children}
    </CertificateWorkflowContext.Provider>
  );
}

export function useCertificateWorkflow() {
  const context = useContext(CertificateWorkflowContext);
  if (!context) {
    throw new Error('useCertificateWorkflow must be used within CertificateWorkflowProvider');
  }
  return context;
}
