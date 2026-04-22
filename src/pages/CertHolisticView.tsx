import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  HardDrive,
  History,
  Link2,
  MoreVertical,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Smartphone,
  Tag,
  TagOff,
  Workflow,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';
import {
  defaultConnectorValues,
  useCertificateWorkflow,
  type ConnectorFormValues,
  type ConnectorRecord,
  type DeviceTarget,
  type PushCategory,
} from '@/context/CertificateWorkflowContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const vendorsByCategory: Record<PushCategory, string[]> = {
  Server: ['Generic Linux', 'Apache Linux', 'Tomcat Linux', 'Nginx Linux', 'Windows Apache', 'Windows Tomcat', 'Microsoft SQL', 'Microsoft IIS', 'Windows IBMClient', 'ABAP', 'Web Dispatcher'],
  ADC: ['F5', 'A10', 'Citrix', 'Kemp'],
  Cloud: ['AWS', 'Azure', 'GCP'],
  Firewall: ['Palo Alto', 'Fortinet', 'CheckPoint', 'Cisco ASA'],
  WAF: ['Imperva', 'F5 ASM'],
  MDM: ['MobileIron'],
};

const certificateTypes = [
  'DER (*.der)',
  'DER (*.cer)',
  'PEM (*.crt)',
  'PEM (*.cer)',
  'PEM (*.pem)',
  'PKCS#7 (*.p7b)',
  'PKCS#7 (*.p7c)',
  'PKCS#12 (*.p12)',
  'PKCS#12 (*.pfx)',
];

const permissionOptions = ['Read (r)', 'Read-Write (rw)', 'Read-Write-Execute (rwx)'];
const serviceTypes = ['ACM', 'IAM', 'Cloudfront', 'ELB', 'SM'];
const availableDevicesSeed: DeviceTarget[] = [
  { id: 'dev-1', hostname: 'web-prod-01.acme.com', ip: '10.0.1.10', category: 'Server' },
  { id: 'dev-2', hostname: 'web-prod-02.acme.com', ip: '10.0.1.11', category: 'Server' },
  { id: 'dev-3', hostname: 'lb-f5-01.acme.com', ip: '10.0.2.5', category: 'ADC' },
  { id: 'dev-4', hostname: 'lb-f5-02.acme.com', ip: '10.0.2.6', category: 'ADC' },
  { id: 'dev-5', hostname: 'aws-acm-us-east-1', ip: 'cloud', category: 'Cloud' },
  { id: 'dev-6', hostname: 'mobileiron-mdm-01', ip: '10.0.3.20', category: 'MDM' },
];

function statusMeta(daysToExpiry: number, status: string) {
  if (status === 'Revoked') return { border: 'border-l-foreground', dot: 'bg-foreground', label: 'Revoked' };
  if (status === 'Expired') return { border: 'border-l-coral', dot: 'bg-coral', label: 'Expired' };
  if (daysToExpiry <= 10) return { border: 'border-l-warning-strong', dot: 'bg-warning-strong', label: 'Expires 10d' };
  if (daysToExpiry <= 30) return { border: 'border-l-amber', dot: 'bg-amber', label: 'Expires 30d' };
  if (daysToExpiry <= 90) return { border: 'border-l-info', dot: 'bg-info', label: 'Expires 90d' };
  return { border: 'border-l-teal', dot: 'bg-teal', label: 'Valid' };
}

function categoryIcon(category: PushCategory) {
  if (category === 'Cloud') return Cloud;
  if (category === 'MDM') return Smartphone;
  if (category === 'ADC' || category === 'WAF') return Workflow;
  return Server;
}

function FieldShell({ label, required, helpText, children }: { label: string; required?: boolean; helpText?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-teal">*</span>}
      </Label>
      {children}
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-background/20 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function InputWithSuffix({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) {
  return (
    <FieldShell label={label}>
      <div className="relative">
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="pr-16 font-mono" />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{suffix}</span>
      </div>
    </FieldShell>
  );
}

function PaginationControls({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
      <span>Total records: {totalPages * 3 >= 6 ? 6 : totalPages * 3}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} className="rounded border border-border px-2 py-1 hover:bg-secondary">Prev</button>
        <span>{page}/{totalPages}</span>
        <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} className="rounded border border-border px-2 py-1 hover:bg-secondary">Next</button>
      </div>
    </div>
  );
}

function AddConnectorModal({
  open,
  onClose,
  certificateId,
  certType,
  connector,
}: {
  open: boolean;
  onClose: () => void;
  certificateId: string;
  certType: 'Server' | 'Client' | 'Intermediate' | 'Root';
  connector?: ConnectorRecord | null;
}) {
  const { addConnector, updateConnector } = useCertificateWorkflow();
  const [values, setValues] = useState<ConnectorFormValues>(connector?.values || {
    ...defaultConnectorValues,
    connectorName: certType === 'Server' ? 'server-push-connector' : 'connector',
    certificateFileName: 'certificate',
    keyFileName: 'private-key',
  });
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [availablePage, setAvailablePage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);

  React.useEffect(() => {
    setValues(connector?.values || {
      ...defaultConnectorValues,
      connectorName: certType === 'Server' ? 'server-push-connector' : 'connector',
      certificateFileName: 'certificate',
      keyFileName: 'private-key',
    });
    setAvailableSearch('');
    setSelectedSearch('');
    setAvailablePage(1);
    setSelectedPage(1);
  }, [connector, certType, open]);

  if (!open) return null;

  const setField = <K extends keyof ConnectorFormValues>(field: K, value: ConnectorFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const extension = values.certificateType.match(/\*\.(\w+)/)?.[1] ? `.${values.certificateType.match(/\*\.(\w+)/)?.[1]}` : '.crt';
  const availableDevices = availableDevicesSeed.filter((device) => {
    if (values.selectedDevices.some((selected) => selected.id === device.id)) return false;
    const query = availableSearch.toLowerCase();
    return !query || device.hostname.toLowerCase().includes(query) || device.ip.toLowerCase().includes(query);
  });
  const visibleAvailable = availableDevices.slice((availablePage - 1) * 3, availablePage * 3);
  const filteredSelected = values.selectedDevices.filter((device) => {
    const query = selectedSearch.toLowerCase();
    return !query || device.hostname.toLowerCase().includes(query) || device.ip.toLowerCase().includes(query);
  });
  const visibleSelected = filteredSelected.slice((selectedPage - 1) * 3, selectedPage * 3);
  const totalAvailablePages = Math.max(1, Math.ceil(availableDevices.length / 3));
  const totalSelectedPages = Math.max(1, Math.ceil(filteredSelected.length / 3));
  const isPemType = values.certificateType.includes('PEM');
  const isPkcs12 = values.certificateType.includes('PKCS#12');
  const isAwsCloud = values.category === 'Cloud' && values.vendor === 'AWS';
  const isMdm = values.category === 'MDM' && values.vendor === 'MobileIron';
  const isIbmClient = values.category === 'Server' && values.vendor === 'Windows IBMClient';

  const save = () => {
    if (!values.connectorName.trim() || values.selectedDevices.length === 0) {
      toast.error('Complete the connector form before saving.');
      return;
    }

    if (connector) {
      updateConnector(connector.id, values);
      toast.success('Connector updated.');
    } else {
      addConnector(certificateId, certType, values);
      toast.success('Connector added to topology.');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close add connector" />
      <div className="relative z-10 flex h-[88vh] w-[760px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{connector ? 'Edit Connector' : 'Add Connector'}</h2>
            <button type="button" onClick={onClose} className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-5 py-4">
          <div className="space-y-4 pr-3">
            <Section title="General Information">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Category" required>
                  <Select value={values.category} onValueChange={(value) => setField('category', value as PushCategory)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(vendorsByCategory).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell label="Vendor" required>
                  <Select value={values.vendor} onValueChange={(value) => setField('vendor', value)}>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendorsByCategory[values.category].map((vendor) => <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldShell>
                {isAwsCloud && (
                  <FieldShell label="Service Types">
                    <Select value={values.serviceType} onValueChange={(value) => setField('serviceType', value)}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((service) => <SelectItem key={service} value={service}>{service}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldShell>
                )}
                <FieldShell label="Connector Name" required>
                  <Input value={values.connectorName} onChange={(event) => setField('connectorName', event.target.value)} />
                </FieldShell>
              </div>
              <FieldShell label="Description">
                <Textarea rows={3} value={values.description} onChange={(event) => setField('description', event.target.value)} />
              </FieldShell>
            </Section>

            <Section title="SSL Templates">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-background/30">
                  <div className="space-y-3 p-3">
                    <Label className="text-xs font-medium text-foreground">Available Devices</Label>
                    <Input value={availableSearch} onChange={(event) => setAvailableSearch(event.target.value)} placeholder="Filter by hostname or IP" />
                    <div className="space-y-2">
                      {visibleAvailable.map((device) => (
                        <div key={device.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                          <div>
                            <p className="font-mono text-xs text-foreground">{device.hostname}</p>
                            <p className="text-[11px] text-muted-foreground">{device.ip}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{device.category}</span>
                            <button type="button" onClick={() => setField('selectedDevices', [...values.selectedDevices, device])} className="rounded-md border border-border p-1 hover:bg-secondary">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <PaginationControls page={availablePage} totalPages={totalAvailablePages} onChange={setAvailablePage} />
                </div>

                <div className="rounded-lg border border-border bg-background/30">
                  <div className="space-y-3 p-3">
                    <Label className="text-xs font-medium text-foreground">Selected Devices</Label>
                    <Input value={selectedSearch} onChange={(event) => setSelectedSearch(event.target.value)} placeholder="Filter selected devices" />
                    <div className="space-y-2">
                      {visibleSelected.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">No devices selected</div>
                      ) : visibleSelected.map((device) => (
                        <div key={device.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                          <div>
                            <p className="font-mono text-xs text-foreground">{device.hostname}</p>
                            <p className="text-[11px] text-muted-foreground">{device.ip}</p>
                          </div>
                          <button type="button" onClick={() => setField('selectedDevices', values.selectedDevices.filter((item) => item.id !== device.id))} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <PaginationControls page={selectedPage} totalPages={totalSelectedPages} onChange={setSelectedPage} />
                </div>
              </div>
            </Section>

            <Section title="Certificate Details">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Certificate Type" required>
                  <Select value={values.certificateType} onValueChange={(value) => setField('certificateType', value)}>
                    <SelectTrigger><SelectValue placeholder="Select certificate type" /></SelectTrigger>
                    <SelectContent>
                      {certificateTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <InputWithSuffix label="Certificate File Name" value={values.certificateFileName} onChange={(value) => setField('certificateFileName', value)} suffix={extension} />
                <FieldShell label="Key File Name" required>
                  <Input value={values.keyFileName} onChange={(event) => setField('keyFileName', event.target.value)} className="font-mono" />
                </FieldShell>
                {isPkcs12 && (
                  <FieldShell label="PFX Password">
                    <Input type="password" value={values.pfxPassword} onChange={(event) => setField('pfxPassword', event.target.value)} />
                  </FieldShell>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                <Checkbox checked={values.pushRootIntermediate} onCheckedChange={(checked) => setField('pushRootIntermediate', Boolean(checked))} />
                <div>
                  <p className="text-xs font-medium text-foreground">Push Root and Intermediate Certificates</p>
                  <p className="text-[11px] text-muted-foreground">Pushes the full chain along with the end certificate</p>
                </div>
              </div>

              {isPemType && (
                <>
                  <div className="flex items-center justify-between rounded-md border border-border bg-background/30 px-3 py-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">Enable Truststore Update</p>
                      <p className="text-[11px] text-muted-foreground">Default off</p>
                    </div>
                    <Switch checked={values.enableTruststoreUpdate} onCheckedChange={(checked) => setField('enableTruststoreUpdate', checked)} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md border border-border bg-background/30 px-3 py-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Certificate Ownership &amp; Permission</p>
                        <p className="text-[11px] text-muted-foreground">Define ownership and permissions on the device</p>
                      </div>
                      <Switch checked={values.enableOwnership} onCheckedChange={(checked) => setField('enableOwnership', checked)} />
                    </div>
                    <div className={cn('grid transition-all duration-200', values.enableOwnership ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                      <div className="overflow-hidden">
                        <div className="space-y-4 border-l-2 border-teal/30 pl-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <FieldShell label="Owner"><Input value={values.permissionConfig.owner} onChange={(event) => setField('permissionConfig', { ...values.permissionConfig, owner: event.target.value })} /></FieldShell>
                            <FieldShell label="Owner Permission">
                              <Select value={values.permissionConfig.ownerPermission} onValueChange={(value) => setField('permissionConfig', { ...values.permissionConfig, ownerPermission: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{permissionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                              </Select>
                            </FieldShell>
                            <FieldShell label="User Group"><Input value={values.permissionConfig.userGroup} onChange={(event) => setField('permissionConfig', { ...values.permissionConfig, userGroup: event.target.value })} /></FieldShell>
                            <FieldShell label="User Group Permission">
                              <Select value={values.permissionConfig.userGroupPermission} onValueChange={(value) => setField('permissionConfig', { ...values.permissionConfig, userGroupPermission: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{permissionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                              </Select>
                            </FieldShell>
                            <FieldShell label="Other User Permission">
                              <Select value={values.permissionConfig.otherUserPermission} onValueChange={(value) => setField('permissionConfig', { ...values.permissionConfig, otherUserPermission: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{permissionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                              </Select>
                            </FieldShell>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isMdm && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Configuration Name" required><Input value={values.configurationName} onChange={(event) => setField('configurationName', event.target.value)} /></FieldShell>
                  <FieldShell label="Certificate Category" required><Input value={values.certificateCategoryName} onChange={(event) => setField('certificateCategoryName', event.target.value)} /></FieldShell>
                </div>
              )}

              {isIbmClient && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="KDB File Name" required><Input value={values.kdbFileName} onChange={(event) => setField('kdbFileName', event.target.value)} className="font-mono" /></FieldShell>
                  <FieldShell label="KDB Password" required><Input type="password" value={values.kdbPassword} onChange={(event) => setField('kdbPassword', event.target.value)} /></FieldShell>
                  <FieldShell label="Server Certificate Label"><Input value={values.serverCertificateLabel} onChange={(event) => setField('serverCertificateLabel', event.target.value)} /></FieldShell>
                  <div className="flex items-start gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                    <Checkbox checked disabled />
                    <div>
                      <p className="text-xs font-medium text-foreground">Push Root and Intermediate Certificates</p>
                      <p className="text-[11px] text-muted-foreground">Enabled by default for IBM Client</p>
                    </div>
                  </div>
                  <FieldShell label="Intermediate Certificate Label"><Input value={values.intermediateCertificateLabel} onChange={(event) => setField('intermediateCertificateLabel', event.target.value)} /></FieldShell>
                  <FieldShell label="Root Certificate Label"><Input value={values.rootCertificateLabel} onChange={(event) => setField('rootCertificateLabel', event.target.value)} /></FieldShell>
                  <div className="flex items-start gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                    <Checkbox checked={values.privateKeyInDevice} onCheckedChange={(checked) => setField('privateKeyInDevice', Boolean(checked))} />
                    <p className="text-xs font-medium text-foreground">Private Key in Device</p>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Push Details">
              <FieldShell label="Script Location" required>
                <RadioGroup value={values.scriptLocation} onValueChange={(value) => setField('scriptLocation', value as 'appviewx' | 'device')} className="flex gap-6">
                  <div className="flex items-center gap-2"><RadioGroupItem value="appviewx" id="script-appviewx" /><Label htmlFor="script-appviewx">In AppViewX</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="device" id="script-device" /><Label htmlFor="script-device">In Device</Label></div>
                </RadioGroup>
              </FieldShell>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Pre-Push Script File Name"><Input value={values.prePushScript} onChange={(event) => setField('prePushScript', event.target.value)} placeholder="e.g. filename.zip" className="font-mono" /></FieldShell>
                <FieldShell label="Post-Push Script File Name"><Input value={values.postPushScript} onChange={(event) => setField('postPushScript', event.target.value)} placeholder="e.g. filename.zip" className="font-mono" /></FieldShell>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                  <Checkbox checked={values.overwrite} onCheckedChange={(checked) => setField('overwrite', Boolean(checked))} />
                  <p className="text-xs font-medium text-foreground">Overwrite</p>
                </div>
                <div className="flex items-start gap-3 rounded-md border border-border bg-background/30 px-3 py-3">
                  <Checkbox checked={values.pushAutomatically} onCheckedChange={(checked) => setField('pushAutomatically', Boolean(checked))} />
                  <div>
                    <p className="text-xs font-medium text-foreground">Push automatically</p>
                    <p className="text-[11px] text-muted-foreground">Must be enabled at group level too.</p>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={save} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">{connector ? 'Update' : 'Save'}</button>
          <button type="button" onClick={onClose} className="rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CertificateDetailsModal({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  if (!open) return null;

  const rows = [
    ['Common name', title], ['Serial number', '7F:46:98:1A:11:09:AE'], ['Valid from (GMT)', '10/10/2022'], ['Valid to (GMT)', '10/05/2042'], ['Issuer', 'AppViewX CA'], ['Version', '3'], ['Signature alg', 'SHA256withRSA'], ['Sig hash alg', 'SHA256'], ['Public key alg', 'RSA 2048'], ['ECDSA Curve', 'Not applicable'],
    ['Thumbprint algorithm', 'SHA-1'], ['Thumbprint', '2C:96:81:AF:09:44'], ['Authority key id', 'Not applicable'], ['Certificate authority', 'AppViewX'], ['Subject country', 'US'], ['Subject locality', 'Seattle'], ['Subject organization', 'AppViewX Inc'], ['Subject org unit', 'Not applicable'], ['Subject state', 'Washington'], ['Issuer country', 'US'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close certificate details" />
      <div className="relative z-10 w-[700px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Certificate Details</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] gap-3 rounded-md border border-border bg-background/20 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn('text-foreground', /Common name|Serial|Thumbprint/.test(label) ? 'font-mono text-xs' : '')}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function badgeClass(status: string) {
  if (status === 'Completed') return 'bg-teal/10 text-teal';
  if (status === 'Approved') return 'bg-info/10 text-info';
  if (status === 'Push-Review In Progress') return 'bg-amber/10 text-amber';
  if (status === 'Push Failed') return 'bg-muted text-muted-foreground';
  return 'bg-purple/10 text-purple';
}

export default function CertHolisticView() {
  const { filters, setCurrentPage, setFilters } = useNav();
  const {
    selectedCertType,
    getCertificateById,
    getConnectorsForCertificate,
    getOperationByConnector,
    submitConnector,
    approveConnector,
    implementConnector,
    deleteConnector,
  } = useCertificateWorkflow();
  const certificate = getCertificateById(filters.certificateId);
  const connectors = getConnectorsForCertificate(filters.certificateId);
  const [showConnectorRow, setShowConnectorRow] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [connectorModalOpen, setConnectorModalOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<ConnectorRecord | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeConnectorMenu, setActiveConnectorMenu] = useState<string | null>(null);

  const primaryConnector = connectors[0] || null;
  const operation = primaryConnector ? getOperationByConnector(primaryConnector.id) : undefined;
  const certificateState = certificate ? statusMeta(certificate.daysToExpiry, certificate.status) : statusMeta(365, 'Active');

  const chainCards = useMemo(() => {
    const cn = certificate?.commonName || 'server.acme.com';
    return [
      { label: 'CA', title: certificate?.caIssuer || 'AppViewX CA', group: 'Certificate-Gateway', validFrom: '10/10/2022', validTo: '10/05/2042', border: 'border-l-teal' },
      { label: 'Chain', title: `${certificate?.caIssuer || 'Intermediate'} Intermediate`, group: 'Private_CA_Certificates', validFrom: '10/10/2022', validTo: '10/05/2032', border: 'border-l-info' },
      { label: selectedCertType, title: cn, group: 'Default', validFrom: certificate?.issueDate || '2026-02-01', validTo: certificate?.expiryDate || '2026-08-01', border: certificateState.border },
    ];
  }, [certificate, certificateState.border, selectedCertType]);

  if (!certificate) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Select a certificate to view topology.</div>;
  }

  const runConnectorAction = (action: 'Push to Device' | 'Submit' | 'Approve' | 'Implement' | 'View Work Order') => {
    if (!primaryConnector && action !== 'Push to Device') {
      toast.error('Add a connector first.');
      return;
    }

    if (action === 'Push to Device') {
      setEditingConnector(null);
      setConnectorModalOpen(true);
      return;
    }

    if (action === 'Submit' && primaryConnector) {
      submitConnector(primaryConnector.id);
      toast.success('Push request submitted.');
      return;
    }

    if (action === 'Approve' && primaryConnector) {
      approveConnector(primaryConnector.id);
      toast.success('Push request approved.');
      return;
    }

    if (action === 'Implement' && primaryConnector) {
      implementConnector(primaryConnector.id);
      toast.success('Certificate pushed to device successfully.');
      return;
    }

    if (action === 'View Work Order' && operation) {
      setFilters({ requestId: operation.requestId, certificateId: certificate.id, certType: selectedCertType });
      setCurrentPage('work-order-status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{selectedCertType} Certificate &gt; <span className="font-mono">{certificate.commonName}</span></div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Certificate Holistic View</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <Settings className="h-3.5 w-3.5" />
              Connector Actions
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-xl">
                {(['Push to Device', 'Submit', 'Approve', 'Implement', 'View Work Order'] as const).map((action) => (
                  <button key={action} type="button" onClick={() => { setMenuOpen(false); runConnectorAction(action); }} className="flex w-full items-center rounded-md px-3 py-2 text-left text-xs text-foreground hover:bg-secondary">
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"><History className="h-3.5 w-3.5" />History</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"><Tag className="h-3.5 w-3.5" />Assign Group</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"><TagOff className="h-3.5 w-3.5" />Unassign Group</button>
          <button type="button" onClick={() => toast.success('Certificate refreshed.')} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]">
        <div className="flex flex-col items-center gap-3">
          {chainCards.map((card, index) => (
            <React.Fragment key={card.label}>
              <button type="button" onClick={() => { setDetailsTitle(card.title); setDetailsOpen(true); }} className={cn('w-full max-w-[340px] rounded-lg border border-border border-l-4 bg-background/70 p-4 text-left shadow-sm', card.border)}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</span>
                  <span className={cn('h-2.5 w-2.5 rounded-full', index === 2 ? certificateState.dot : 'bg-teal')} />
                </div>
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <span>Valid From</span><span className="text-right font-mono text-foreground">{card.validFrom}</span>
                  <span>Valid To</span><span className="text-right font-mono text-foreground">{card.validTo}</span>
                  <span>Group</span><span className="text-right text-foreground">{card.group}</span>
                </div>
              </button>
              {index < chainCards.length - 1 && <Link2 className="h-4 w-4 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-8 border-t border-dashed border-border pt-4">
          <button type="button" onClick={() => setShowConnectorRow((value) => !value)} className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            {showConnectorRow ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Connector Topology
          </button>

          {showConnectorRow && (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="rounded-lg border border-border bg-background/70 px-4 py-3 text-sm font-semibold text-foreground">AppViewX</div>
              <span className="text-muted-foreground">↔</span>
              {primaryConnector ? (
                <div className="relative rounded-lg border border-dashed border-border bg-background/70 px-4 py-3 min-w-[220px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                        {React.createElement(categoryIcon(primaryConnector.category), { className: 'h-4 w-4' })}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{primaryConnector.connectorName}</p>
                        <p className="text-xs text-muted-foreground">{primaryConnector.vendor}</p>
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          <span className="font-mono text-foreground">{primaryConnector.workOrderRef}</span>
                          <span className={cn('rounded-full px-2 py-0.5 font-medium', badgeClass(operation?.status || primaryConnector.status))}>{operation?.status || primaryConnector.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button type="button" onClick={() => setActiveConnectorMenu((current) => current === primaryConnector.id ? null : primaryConnector.id)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {activeConnectorMenu === primaryConnector.id && (
                        <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-border bg-card p-1 shadow-xl">
                          <button type="button" onClick={() => { setEditingConnector(primaryConnector); setConnectorModalOpen(true); setActiveConnectorMenu(null); }} className="flex w-full rounded-md px-3 py-2 text-left text-xs hover:bg-secondary">Edit</button>
                          <button type="button" onClick={() => { deleteConnector(primaryConnector.id); setActiveConnectorMenu(null); }} className="flex w-full rounded-md px-3 py-2 text-left text-xs hover:bg-secondary">Delete</button>
                          <button type="button" onClick={() => { if (operation) { setFilters({ requestId: operation.requestId, certificateId: certificate.id, certType: selectedCertType }); setCurrentPage('work-order-status'); } setActiveConnectorMenu(null); }} className="flex w-full rounded-md px-3 py-2 text-left text-xs hover:bg-secondary">View</button>
                          <button type="button" onClick={() => { toast.success('Connector log opened.'); setActiveConnectorMenu(null); }} className="flex w-full rounded-md px-3 py-2 text-left text-xs hover:bg-secondary">View Log</button>
                          <button type="button" onClick={() => { toast.success('Automation details opened.'); setActiveConnectorMenu(null); }} className="flex w-full rounded-md px-3 py-2 text-left text-xs hover:bg-secondary">View Automation</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">No connector attached</div>
              )}
              <span className="text-muted-foreground">→ ⬡ →</span>
              <button type="button" onClick={() => { setEditingConnector(null); setConnectorModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-teal/30 bg-teal/5 px-4 py-3 text-sm font-medium text-teal hover:bg-teal/10">
                <Plus className="h-4 w-4" />
                Add connector
              </button>
            </div>
          )}

          {primaryConnector && (
            <div className="mt-4 text-center text-xs text-muted-foreground">
              {primaryConnector.values.selectedDevices.map((device) => device.hostname).join(', ')}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-teal" />Green: Valid</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-coral" />Red: Expired</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-info" />Blue: Expires 90d</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber" />Yellow: Expires 30d</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-warning-strong" />Orange: Expires 10d</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-foreground" />Black: Revoked</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />Gray: Push Failed</span>
          </div>
        </div>
      </div>

      <CertificateDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={detailsTitle} />
      <AddConnectorModal
        open={connectorModalOpen}
        onClose={() => { setConnectorModalOpen(false); setEditingConnector(null); }}
        certificateId={certificate.id}
        certType={selectedCertType}
        connector={editingConnector}
      />
    </div>
  );
}
