import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Server,
  Shield,
  X,
} from 'lucide-react';
import { mockAssets, type CryptoAsset } from '@/data/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PolicyRequestRow } from '../types';

type CertTypeTab = 'Server' | 'Client' | 'Intermediate' | 'Root';
type Stage = 'config' | 'topology';
type ApprovalStep = 'submit' | 'approve' | 'implement';
type Category = 'ADC' | 'Cloud' | 'Firewall' | 'MDM' | 'Server' | 'WAF';
type WorkOrderStatus = 'Pending' | 'Push-Review In Progress' | 'Completed';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: PolicyRequestRow) => void;
}

interface DeviceRow {
  id: string;
  hostname: string;
  ip: string;
  category: Category;
}

const certTabs: CertTypeTab[] = ['Server', 'Client', 'Intermediate', 'Root'];
const categories: Category[] = ['ADC', 'Cloud', 'Firewall', 'MDM', 'Server', 'WAF'];
const vendorsByCategory: Record<Category, string[]> = {
  Server: ['Generic Linux', 'Apache Linux', 'Tomcat Linux', 'Nginx Linux', 'Windows Apache', 'Windows Tomcat', 'Microsoft SQL', 'Microsoft IIS', 'Windows IBMClient', 'ABAP', 'Web Dispatcher'],
  ADC: ['F5', 'Citrix', 'A10', 'Kemp'],
  Cloud: ['AWS', 'Azure', 'GCP'],
  Firewall: ['Palo Alto', 'Fortinet', 'CheckPoint', 'Cisco ASA'],
  WAF: ['Imperva', 'F5 ASM'],
  MDM: ['MobileIron'],
};
const serviceTypes = ['ACM', 'IAM', 'Cloudfront', 'ELB', 'SM'];
const certificateTypes = ['PEM (*.crt)', 'PEM (*.cer)', 'PEM (*.pem)', 'JKS (*.jks)', 'JKS (*.keystore)', 'PEM (Extensionless)', 'JKS (Extensionless)'];
const permissionOptions = ['Read (r)', 'Read-Write (rw)', 'Read-Write-Execute (rwx)'];
const scriptLocations = ['In AppViewX', 'On Device'];
const certificateLocations = ['AWS Certificate Manager (ACM)', 'AWS Identity and Access Management (IAM)'];
const availableDevicesSeed: DeviceRow[] = [
  { id: 'dev-1', hostname: 'web-prod-01.acme.com', ip: '10.0.1.10', category: 'Server' },
  { id: 'dev-2', hostname: 'web-prod-02.acme.com', ip: '10.0.1.11', category: 'Server' },
  { id: 'dev-3', hostname: 'lb-f5-01.acme.com', ip: '10.0.2.5', category: 'ADC' },
  { id: 'dev-4', hostname: 'lb-f5-02.acme.com', ip: '10.0.2.6', category: 'ADC' },
  { id: 'dev-5', hostname: 'aws-acm-us-east-1', ip: 'cloud', category: 'Cloud' },
  { id: 'dev-6', hostname: 'mobileiron-mdm-01', ip: '10.0.3.20', category: 'MDM' },
];

const serverCertificates = mockAssets.filter((asset): asset is CryptoAsset => asset.type === 'TLS Certificate');
const clientCertificates = mockAssets.filter((asset): asset is CryptoAsset => asset.type === 'TLS Certificate' && asset.tags.includes('internal'));
const chainCertificates = mockAssets.filter((asset): asset is CryptoAsset => asset.type === 'TLS Certificate').slice(0, 8);

const makeId = () => `REQ-${Math.floor(41050 + Math.random() * 100)}`;
const nowLabel = 'Just now';

function statusMeta(asset: CryptoAsset) {
  if (asset.status === 'Revoked') return { dot: 'bg-foreground', badge: 'bg-foreground/10 text-foreground', label: 'Revoked' };
  if (asset.status === 'Expired') return { dot: 'bg-coral', badge: 'bg-coral/10 text-coral', label: 'Expired' };
  if (asset.tags.includes('push-failed')) return { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground', label: 'Push Failed' };
  if (asset.daysToExpiry <= 10) return { dot: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-500', label: 'Expires 10d' };
  if (asset.daysToExpiry <= 30) return { dot: 'bg-amber', badge: 'bg-amber/10 text-amber', label: 'Expires 30d' };
  if (asset.daysToExpiry <= 90) return { dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-500', label: 'Expires 90d' };
  return { dot: 'bg-teal', badge: 'bg-teal/10 text-teal', label: 'Valid' };
}

function sectionHeader(open: boolean, title: string) {
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="h-4 w-4 text-teal" />
      <span>{title}</span>
    </div>
  );
}

function RequiredMark() {
  return <span className="text-teal">*</span>;
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between bg-[hsl(222_20%_15%)] px-4 py-3 text-left">
        {sectionHeader(open, title)}
      </button>
      <div className={cn('grid transition-all duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          <div className="space-y-4 p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FieldShell({ label, required, helpText, note, mono, children }: { label: string; required?: boolean; helpText?: string; note?: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-foreground">
        {label} {required && <RequiredMark />}
      </Label>
      <div className={mono ? 'font-mono' : undefined}>{children}</div>
      {note && <div className="rounded-md border border-teal/30 bg-teal/5 px-3 py-2 text-[11px] text-muted-foreground">{note}</div>}
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function TextField(props: React.ComponentProps<typeof Input> & { label: string; required?: boolean; helpText?: string; note?: string; mono?: boolean }) {
  const { label, required, helpText, note, mono, className, ...rest } = props;
  return (
    <FieldShell label={label} required={required} helpText={helpText} note={note} mono={mono}>
      <Input {...rest} className={cn(mono && 'font-mono', className)} />
    </FieldShell>
  );
}

function TextAreaField(props: React.ComponentProps<typeof Textarea> & { label: string; helpText?: string }) {
  const { label, helpText, ...rest } = props;
  return (
    <FieldShell label={label} helpText={helpText}>
      <Textarea {...rest} />
    </FieldShell>
  );
}

function SelectField({ label, value, onChange, options, required, helpText, note, mono }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean; helpText?: string; note?: string; mono?: boolean }) {
  return (
    <FieldShell label={label} required={required} helpText={helpText} note={note} mono={mono}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={mono ? 'font-mono' : undefined}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function ToggleField({ label, checked, onCheckedChange, helpText }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void; helpText?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-md border border-border bg-background/30 px-3 py-2">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function InlineStep({ label, state, children }: { label: string; state: 'done' | 'active' | 'pending'; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border px-4 py-3', state === 'active' ? 'border-teal/40 bg-teal/5' : 'border-border bg-background/30')}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-6 w-6 items-center justify-center rounded-full border', state === 'done' ? 'border-teal bg-teal/10 text-teal' : state === 'active' ? 'border-teal text-teal' : 'border-border text-muted-foreground')}>
          {state === 'done' ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </div>
        <p className={cn('text-sm font-medium', state === 'pending' ? 'text-muted-foreground' : 'text-foreground')}>{label}</p>
      </div>
      {state === 'active' && children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function PushToDeviceModal({ open, onClose, onSubmit }: Props) {
  const [stage, setStage] = useState<Stage>('config');
  const [activeTab, setActiveTab] = useState<CertTypeTab>('Server');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ general: true, devices: true, details: true, push: true });
  const [certificateSearch, setCertificateSearch] = useState('');
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);
  const [category, setCategory] = useState<Category>('Server');
  const [vendor, setVendor] = useState(vendorsByCategory.Server[0]);
  const [serviceType, setServiceType] = useState(serviceTypes[0]);
  const [connectorName, setConnectorName] = useState('payments-nginx-prod');
  const [description, setDescription] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<Category | 'All'>('All');
  const [selectedDevices, setSelectedDevices] = useState<DeviceRow[]>([]);
  const [certificateType, setCertificateType] = useState(certificateTypes[0]);
  const [truststoreLocation, setTruststoreLocation] = useState('/etc/ssl/certs/ca-bundle.pem');
  const [truststorePassword, setTruststorePassword] = useState('');
  const [enableTruststoreUpdate, setEnableTruststoreUpdate] = useState(false);
  const [enableOwnership, setEnableOwnership] = useState(false);
  const [owner, setOwner] = useState('www-data');
  const [ownerPermission, setOwnerPermission] = useState(permissionOptions[0]);
  const [userGroup, setUserGroup] = useState('ssl-certs');
  const [userGroupPermission, setUserGroupPermission] = useState(permissionOptions[0]);
  const [otherUserPermission, setOtherUserPermission] = useState(permissionOptions[0]);
  const [certificateLocation, setCertificateLocation] = useState(certificateLocations[0]);
  const [certificateArn, setCertificateArn] = useState('arn:aws:acm:us-east-1:123456789:certificate/abcd');
  const [certificateFileName, setCertificateFileName] = useState('payments-prod');
  const [configurationName, setConfigurationName] = useState('payments-mobile-profile');
  const [certificateCategoryName, setCertificateCategoryName] = useState('payments-mobile-certificates');
  const [pfxPassword, setPfxPassword] = useState('');
  const [pushFullChain, setPushFullChain] = useState(true);
  const [kdbFileName, setKdbFileName] = useState('payments-client.kdb');
  const [kdbPassword, setKdbPassword] = useState('');
  const [serverCertificateLabel, setServerCertificateLabel] = useState('payments-client');
  const [intermediateCertificateLabel, setIntermediateCertificateLabel] = useState('digicert-intermediate');
  const [rootCertificateLabel, setRootCertificateLabel] = useState('digicert-root');
  const [privateKeyInDevice, setPrivateKeyInDevice] = useState(false);
  const [processName, setProcessName] = useState('push-root-chain-01');
  const [scriptLocation, setScriptLocation] = useState(scriptLocations[0]);
  const [prePushScript, setPrePushScript] = useState('/opt/scripts/prepush.sh');
  const [postPushScript, setPostPushScript] = useState('/opt/scripts/postpush.sh');
  const [pushAutomatically, setPushAutomatically] = useState(false);
  const [approvalStep, setApprovalStep] = useState<ApprovalStep>('submit');
  const [submitComments, setSubmitComments] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [implementationComments, setImplementationComments] = useState('');
  const [manualApproval, setManualApproval] = useState(true);
  const [approvalSchedule, setApprovalSchedule] = useState('2026-04-23T10:30');
  const [manualImplementation, setManualImplementation] = useState(true);
  const [implementationSchedule, setImplementationSchedule] = useState('2026-04-23T12:00');
  const [workOrderStatus, setWorkOrderStatus] = useState<WorkOrderStatus>('Pending');
  const [workOrderRef] = useState(`R${Math.floor(14000 + Math.random() * 1000)}`);

  const isBulkTab = activeTab === 'Intermediate' || activeTab === 'Root';
  const availableCertificates = useMemo(() => {
    const pool = activeTab === 'Server' ? serverCertificates : activeTab === 'Client' ? clientCertificates : chainCertificates;
    return pool.filter((asset) => {
      const q = certificateSearch.toLowerCase();
      return !q || asset.commonName.toLowerCase().includes(q) || asset.caIssuer.toLowerCase().includes(q);
    });
  }, [activeTab, certificateSearch]);

  const selectedCertificates = useMemo(
    () => availableCertificates.filter((asset) => selectedCertIds.includes(asset.id)),
    [availableCertificates, selectedCertIds],
  );

  const filteredDevices = useMemo(() => {
    const selectedSet = new Set(selectedDevices.map((device) => device.id));
    return availableDevicesSeed.filter((device) => {
      if (selectedSet.has(device.id)) return false;
      if (deviceFilter !== 'All' && device.category !== deviceFilter) return false;
      const q = deviceSearch.toLowerCase();
      return !q || device.hostname.toLowerCase().includes(q) || device.ip.toLowerCase().includes(q);
    });
  }, [deviceFilter, deviceSearch, selectedDevices]);

  const primaryCertificate = selectedCertificates[0] ?? availableCertificates[0] ?? serverCertificates[0];
  const isAwsCloud = category === 'Cloud' && vendor === 'AWS';
  const isMdm = category === 'MDM' && vendor === 'MobileIron';
  const isIbmClient = category === 'Server' && vendor === 'Windows IBMClient';
  const isLinuxServerVendor = category === 'Server' && !['Windows Apache', 'Windows Tomcat', 'Microsoft SQL', 'Microsoft IIS', 'Windows IBMClient'].includes(vendor);
  const isJksType = certificateType.includes('JKS');
  const isPemType = certificateType.includes('PEM');
  const canAddConnector = selectedCertIds.length > 0 && selectedDevices.length > 0 && connectorName.trim().length > 0 && vendor.trim().length > 0;

  useEffect(() => {
    setVendor(vendorsByCategory[category][0]);
    setSelectedDevices([]);
  }, [category]);

  useEffect(() => {
    const pool = activeTab === 'Server' ? serverCertificates : activeTab === 'Client' ? clientCertificates : chainCertificates;
    if (isBulkTab) {
      setSelectedCertIds((current) => current.filter((id) => pool.some((item) => item.id === id)));
      return;
    }
    setSelectedCertIds((current) => {
      const kept = current.find((id) => pool.some((item) => item.id === id));
      return kept ? [kept] : pool[0] ? [pool[0].id] : [];
    });
  }, [activeTab, isBulkTab]);

  useEffect(() => {
    if (!open) {
      setStage('config');
      setActiveTab('Server');
      setApprovalStep('submit');
      setSubmitComments('');
      setApprovalComments('');
      setImplementationComments('');
      setWorkOrderStatus('Pending');
    }
  }, [open]);

  const toggleSection = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  const handleSelectCertificate = (id: string) => {
    if (isBulkTab) {
      setSelectedCertIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
      return;
    }
    setSelectedCertIds([id]);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedCertIds([]);
      return;
    }
    setSelectedCertIds(availableCertificates.map((asset) => asset.id));
  };

  const addDevice = (device: DeviceRow) => setSelectedDevices((current) => [...current, device]);
  const removeDevice = (deviceId: string) => setSelectedDevices((current) => current.filter((device) => device.id !== deviceId));

  const handleAddConnector = () => {
    if (!canAddConnector) {
      toast.error('Select a certificate, choose devices, and complete the connector details.');
      return;
    }
    setStage('topology');
    setApprovalStep('submit');
    setWorkOrderStatus('Pending');
  };

  const completePush = () => {
    const targets = selectedDevices.map((device) => device.hostname).join(', ');
    const certLabel = isBulkTab ? `${selectedCertIds.length} certificates` : (primaryCertificate?.commonName || 'certificate');
    const request: PolicyRequestRow = {
      id: makeId(),
      action: 'Push to Device',
      certificateTarget: `${certLabel} -> ${targets}`,
      requestedBy: 'Current User',
      created: nowLabel,
      status: 'Completed',
      subject: certLabel,
      targetCA: primaryCertificate?.caIssuer || vendor,
      stages: [
        { label: 'Enrollment Request', timestamp: nowLabel, status: 'done', details: [{ label: 'Certificate Scope', value: activeTab }, { label: 'Connector', value: connectorName }] },
        { label: 'Request Creation', timestamp: nowLabel, status: 'done', details: [{ label: 'Vendor', value: vendor }, { label: 'Targets', value: targets }] },
        { label: 'CA Submission', timestamp: nowLabel, status: 'done', details: [{ label: 'Approval', value: manualApproval ? 'Manual' : `Scheduled ${approvalSchedule}` }] },
        { label: 'Certificate Issued', timestamp: nowLabel, status: 'done', details: [{ label: 'Result', value: 'Certificate pushed successfully' }] },
      ],
    };
    onSubmit(request);
    setWorkOrderStatus('Completed');
    toast.success('Certificate pushed to device successfully.');
    window.setTimeout(() => onClose(), 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close push to device modal" />
      <div className="relative z-10 flex h-[88vh] w-[900px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Push Certificate to Device</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 inline-flex rounded-lg border border-border bg-background/40 p-1">
            {certTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', activeTab === tab ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {stage === 'config' ? (
          <div className="grid min-h-0 flex-1 grid-cols-[40%_60%]">
            <div className="border-r border-border bg-background/30 p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={certificateSearch} onChange={(event) => setCertificateSearch(event.target.value)} placeholder="Search certificates" className="pl-8" />
                </div>
                {isBulkTab && (
                  <div className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2">
                    <Label className="text-xs font-medium text-foreground">Select All</Label>
                    <Checkbox checked={selectedCertIds.length > 0 && selectedCertIds.length === availableCertificates.length} onCheckedChange={(value) => toggleSelectAll(Boolean(value))} />
                  </div>
                )}
                <ScrollArea className="h-[calc(88vh-15rem)] pr-3">
                  <div className="space-y-2">
                    {availableCertificates.map((asset) => {
                      const meta = statusMeta(asset);
                      const checked = selectedCertIds.includes(asset.id);
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelectCertificate(asset.id)}
                          className={cn('w-full rounded-lg border px-3 py-3 text-left transition-colors', checked ? 'border-teal bg-teal/5' : 'border-border bg-card hover:bg-background/40')}
                        >
                          <div className="flex items-start gap-3">
                            {isBulkTab ? (
                              <Checkbox checked={checked} className="mt-0.5" onCheckedChange={() => handleSelectCertificate(asset.id)} />
                            ) : (
                              <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', meta.dot)} />
                            )}
                            {!isBulkTab && <span className={cn('sr-only')}>{meta.label}</span>}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate font-mono text-xs text-foreground">{asset.commonName}</p>
                                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', meta.badge)}>{asset.daysToExpiry >= 0 ? `${asset.daysToExpiry}d` : meta.label}</span>
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">{asset.caIssuer}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="min-h-0 p-4">
              <ScrollArea className="h-[calc(88vh-14rem)] pr-3">
                <div className="space-y-4">
                  <Section title="General Information" open={openSections.general} onToggle={() => toggleSection('general')}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Category" required value={category} onChange={(value) => setCategory(value as Category)} options={categories} />
                      <SelectField label="Vendor" required value={vendor} onChange={setVendor} options={vendorsByCategory[category]} />
                      {isAwsCloud && <SelectField label="Service Type" value={serviceType} onChange={setServiceType} options={serviceTypes} />}
                      <TextField label="Connector Name" required value={connectorName} onChange={(event) => setConnectorName(event.target.value)} helpText="This name appears in the certificate topology view. Use a descriptive name." />
                    </div>
                    <TextAreaField label="Description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </Section>

                  <Section title="SSL Templates / Device Selection" open={openSections.devices} onToggle={() => toggleSection('devices')}>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3 rounded-lg border border-border bg-background/30 p-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-foreground">Available Devices</Label>
                          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                            <Input value={deviceSearch} onChange={(event) => setDeviceSearch(event.target.value)} placeholder="Filter by hostname or IP" />
                            <Select value={deviceFilter} onValueChange={(value) => setDeviceFilter(value as Category | 'All')}>
                              <SelectTrigger><SelectValue placeholder="Function" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="All">All</SelectItem>
                                {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {filteredDevices.map((device) => (
                            <div key={device.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                              <div>
                                <p className="font-mono text-xs text-foreground">{device.hostname}</p>
                                <p className="text-[11px] text-muted-foreground">{device.ip}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{device.category}</span>
                                <button type="button" onClick={() => addDevice(device)} className="rounded-md border border-border p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border border-border bg-background/30 p-3">
                        <Label className="text-xs font-medium text-foreground">Selected Devices</Label>
                        {selectedDevices.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No devices selected</div>
                        ) : (
                          <div className="space-y-2">
                            {selectedDevices.map((device) => (
                              <div key={device.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                                <div>
                                  <p className="font-mono text-xs text-foreground">{device.hostname}</p>
                                  <p className="text-[11px] text-muted-foreground">{device.ip}</p>
                                </div>
                                <button type="button" onClick={() => removeDevice(device.id)} className="rounded-md border border-border p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Section>

                  <Section title="Certificate Details" open={openSections.details} onToggle={() => toggleSection('details')}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Certificate Type" required value={certificateType} onChange={setCertificateType} options={certificateTypes} />
                      {isLinuxServerVendor && <TextField label="Truststore Location" value={truststoreLocation} onChange={(event) => setTruststoreLocation(event.target.value)} helpText="Path to truststore file on the target device" mono />}
                      {isJksType && <TextField label="Truststore Password" type="password" value={truststorePassword} onChange={(event) => setTruststorePassword(event.target.value)} helpText="Required for JKS certificate types" />}
                    </div>

                    {isPemType && <ToggleField label="Enable Truststore Update" checked={enableTruststoreUpdate} onCheckedChange={setEnableTruststoreUpdate} helpText="Updates the system trust store on the target device. Default: off." />}

                    {isLinuxServerVendor && (
                      <div className="space-y-3">
                        <ToggleField label="Certificate Ownership & Permission" checked={enableOwnership} onCheckedChange={setEnableOwnership} helpText="Define file ownership and permissions on the target device" />
                        <div className={cn('grid transition-all duration-200 ease-out', enableOwnership ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                          <div className="overflow-hidden">
                            <div className="space-y-4 border-l-2 border-teal/30 pl-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <TextField label="Owner" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="e.g. www-data" />
                                <SelectField label="Owner Permission" value={ownerPermission} onChange={setOwnerPermission} options={permissionOptions} />
                                <TextField label="User Group" value={userGroup} onChange={(event) => setUserGroup(event.target.value)} placeholder="e.g. ssl-certs" />
                                <SelectField label="User Group Permission" value={userGroupPermission} onChange={setUserGroupPermission} options={permissionOptions} />
                                <SelectField label="Other User Permission" value={otherUserPermission} onChange={setOtherUserPermission} options={permissionOptions} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isAwsCloud && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectField label="Certificate Location" value={certificateLocation} onChange={setCertificateLocation} options={certificateLocations} note="For Cloudfront: certificate can be stored in ACM or IAM" />
                        <TextField label="Certificate ARN" value={certificateArn} onChange={(event) => setCertificateArn(event.target.value)} helpText="Amazon Resource Name for ACM-managed cert" mono />
                        <TextField label="Certificate File Name" required value={certificateFileName} onChange={(event) => setCertificateFileName(event.target.value)} helpText="Extension auto-populated from Certificate Type" mono />
                      </div>
                    )}

                    {isMdm && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField label="Configuration Name" required value={configurationName} onChange={(event) => setConfigurationName(event.target.value)} helpText="Name of the configuration profile that includes this certificate" />
                        <TextField label="Certificate Category" required value={certificateCategoryName} onChange={(event) => setCertificateCategoryName(event.target.value)} helpText="Name of the certificate group this certificate belongs to" />
                        <TextField label="PFX Password" type="password" value={pfxPassword} onChange={(event) => setPfxPassword(event.target.value)} helpText="Required for PKCS#12 certificates (.pfx, .p12)" />
                        <div className="flex items-center gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                          <Checkbox checked={pushFullChain} onCheckedChange={(value) => setPushFullChain(Boolean(value))} />
                          <div>
                            <p className="text-xs font-medium text-foreground">Push Root and Intermediate Certificates</p>
                            <p className="text-[11px] text-muted-foreground">Pushes the full chain along with the end certificate</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isIbmClient && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField label="KDB File Name" required value={kdbFileName} onChange={(event) => setKdbFileName(event.target.value)} helpText="Name of the KDB certificate file" mono />
                        <TextField label="KDB Password" required type="password" value={kdbPassword} onChange={(event) => setKdbPassword(event.target.value)} helpText="Password to access the KDB file" />
                        <TextField label="Server Certificate Label" value={serverCertificateLabel} onChange={(event) => setServerCertificateLabel(event.target.value)} />
                        <div className="flex items-center gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                          <Checkbox checked disabled />
                          <div>
                            <p className="text-xs font-medium text-foreground">Push Root and Intermediate Certificates</p>
                            <p className="text-[11px] text-muted-foreground">Enabled by default for IBM Client and cannot be changed</p>
                          </div>
                        </div>
                        <TextField label="Intermediate Certificate Label" value={intermediateCertificateLabel} onChange={(event) => setIntermediateCertificateLabel(event.target.value)} helpText="Existing label in KDB file will be retained" />
                        <TextField label="Root Certificate Label" value={rootCertificateLabel} onChange={(event) => setRootCertificateLabel(event.target.value)} helpText="Existing label in KDB file will be retained" />
                        <div className="flex items-center gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                          <Checkbox checked={privateKeyInDevice} onCheckedChange={(value) => setPrivateKeyInDevice(Boolean(value))} />
                          <div>
                            <p className="text-xs font-medium text-foreground">Private Key in Device</p>
                            <p className="text-[11px] text-muted-foreground">Select if private key is stored on a hardware device</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isBulkTab && <TextField label="Process Name" required value={processName} onChange={(event) => setProcessName(event.target.value)} helpText="Alphanumeric + special chars except < > , ; and '" />}
                  </Section>

                  <Section title="Push Details" open={openSections.push} onToggle={() => toggleSection('push')}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField label="Script Location" value={scriptLocation} onChange={setScriptLocation} options={scriptLocations} />
                      <TextField label="Pre-Push Script" value={prePushScript} onChange={(event) => setPrePushScript(event.target.value)} mono />
                      <TextField label="Post-Push Script" value={postPushScript} onChange={(event) => setPostPushScript(event.target.value)} mono />
                    </div>
                    <ToggleField label="Push Automatically" checked={pushAutomatically} onCheckedChange={setPushAutomatically} helpText="Auto-push on renewal/regeneration. Must also be enabled at the group level." />
                    {pushAutomatically && (
                      <div className="rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-[11px] text-amber">
                        Auto-push works only when enabled at both the connector level and the certificate group level. To enable at group level, go to Policies and edit the certificate group settings.
                      </div>
                    )}
                  </Section>
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 p-5">
              <div className="flex h-[60%] min-h-[340px] flex-col rounded-xl border border-border bg-background/30 p-5">
                <div className="grid h-full grid-cols-[1fr_180px_1fr] items-center gap-4">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Root CA card</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{primaryCertificate?.caIssuer || 'Root CA'}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        <p>Valid From: 2024-03-01</p>
                        <p>Valid To: 2030-03-01</p>
                        <p>Group: Trust Chain</p>
                      </div>
                    </div>
                    <div className="flex justify-center text-muted-foreground">↕</div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Intermediate CA card</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{primaryCertificate?.caIssuer || 'Intermediate CA'}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        <p>Valid From: 2025-01-10</p>
                        <p>Valid To: 2029-01-10</p>
                        <p>Group: Trust Chain</p>
                      </div>
                    </div>
                    <div className="flex justify-center text-muted-foreground">↕</div>
                    <div className={cn('rounded-lg border bg-card p-3', primaryCertificate ? statusMeta(primaryCertificate).badge.replace('text-', 'border-').replace('bg-', 'border-') : 'border-border')}>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{activeTab} Cert card</p>
                      <p className="mt-2 font-mono text-sm text-foreground">{isBulkTab ? `${selectedCertIds.length} selected certificates` : primaryCertificate?.commonName}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        <p>Valid From: {primaryCertificate?.issueDate || '2026-01-10'}</p>
                        <p>Valid To: {primaryCertificate?.expiryDate || '2026-07-10'}</p>
                        <p>Group: {primaryCertificate?.team || 'Platform'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="text-muted-foreground">AppViewX</div>
                    <div className="text-teal">→→→</div>
                    <div className="rounded-xl border border-teal/30 bg-teal/5 p-4">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal">
                        <Shield className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">{connectorName}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{vendor} connector</p>
                      <span className={cn('mt-3 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', workOrderStatus === 'Completed' ? 'bg-teal/10 text-teal' : workOrderStatus === 'Push-Review In Progress' ? 'bg-amber/10 text-amber' : 'bg-muted text-muted-foreground')}>
                        {workOrderStatus}
                      </span>
                    </div>
                    <div className="text-teal">⬡</div>
                    <div className="text-teal">→</div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-background/40 text-foreground">
                        <Server className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">Target Device</p>
                      <p className="mt-1 max-w-[180px] text-[11px] text-muted-foreground">{selectedDevices.map((device) => device.hostname).join(', ')}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
                      Work order {workOrderRef} · {workOrderStatus}
                    </div>
                  </div>

                  <div className="flex h-full items-center justify-center">
                    <div className="w-full rounded-lg border border-border bg-card p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Legend</p>
                      <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-teal" /> Green: Valid</div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-coral" /> Red: Expired</div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Blue: Expires 90d</div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber" /> Yellow: Expires 30d</div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Orange: Expires 10d</div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-foreground" /> Black: Revoked</div>
                        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" /> Gray: Push Failed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-card px-5 py-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <InlineStep label="Submit" state={approvalStep === 'submit' ? 'active' : approvalStep === 'approve' || approvalStep === 'implement' ? 'done' : 'pending'}>
                  <p className="text-sm text-foreground">Submit this push request for approval.</p>
                  <div className="mt-3 space-y-3">
                    <TextAreaField label="Comments (optional)" rows={1} value={submitComments} onChange={(event) => setSubmitComments(event.target.value)} />
                    <button type="button" onClick={() => { setApprovalStep('approve'); setWorkOrderStatus('Push-Review In Progress'); }} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Submit</button>
                  </div>
                </InlineStep>

                <InlineStep label="Approve" state={approvalStep === 'approve' ? 'active' : approvalStep === 'implement' ? 'done' : approvalStep === 'submit' ? 'pending' : 'pending'}>
                  <p className="text-sm text-foreground">Approval required. Review the connector and target, then approve to proceed.</p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-foreground">Manual Implementation</span>
                        <Switch checked={manualApproval} onCheckedChange={setManualApproval} />
                      </div>
                      {!manualApproval && <Input type="datetime-local" value={approvalSchedule} onChange={(event) => setApprovalSchedule(event.target.value)} className="mt-3" />}
                    </div>
                    <TextAreaField label="Approval comments (optional)" rows={1} value={approvalComments} onChange={(event) => setApprovalComments(event.target.value)} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setApprovalStep('implement')} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Approve</button>
                      <button type="button" onClick={() => toast.error('Push request rejected.')} className="rounded-md border border-coral/40 px-4 py-2 text-xs font-medium text-coral hover:bg-coral/10">Reject</button>
                    </div>
                  </div>
                </InlineStep>

                <InlineStep label="Implement" state={approvalStep === 'implement' ? 'active' : 'pending'}>
                  <p className="text-sm text-foreground">Ready to implement. Click Implement to push the certificate to the target device.</p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-md border border-border bg-background/30 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-foreground">Manual Implementation</span>
                        <Switch checked={manualImplementation} onCheckedChange={setManualImplementation} />
                      </div>
                      {!manualImplementation && <Input type="datetime-local" value={implementationSchedule} onChange={(event) => setImplementationSchedule(event.target.value)} className="mt-3" />}
                    </div>
                    <TextAreaField label="Implementation comments (optional)" rows={1} value={implementationComments} onChange={(event) => setImplementationComments(event.target.value)} />
                    <div className="flex gap-2">
                      <button type="button" onClick={completePush} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Implement</button>
                      <button type="button" onClick={() => toast.info('Push scheduled for later.')} className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary">Schedule Later</button>
                    </div>
                  </div>
                </InlineStep>
              </div>
            </div>
          </div>
        )}

        {stage === 'config' && (
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
            <button type="button" onClick={handleAddConnector} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Add Connector</button>
          </div>
        )}
      </div>
    </div>
  );
}
