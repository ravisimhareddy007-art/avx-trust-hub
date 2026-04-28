import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, FilePlus, Info, Upload } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PolicyRequestRow } from '../types';

const sectionIds = ['general', 'ca-details', 'csr', 'attachments', 'attributes', 'generic', 'vendor'] as const;
const groupOptions = ['Default', 'Private_CA_Certificates', 'Public_CA_Certificates', 'Certificate-Gateway'] as const;
const certificateAuthorities = [
  'DigiCert', 'DigiCert One', 'Sectigo', 'Microsoft Enterprise', "Let's Encrypt", 'GlobalSign',
  'GlobalSign MSSL', 'GlobalSign Atlas', 'Google CA', 'Amazon Private CA', 'Entrust', 'GoDaddy', 'SwissSign', 'HydrantID',
  'HashiCorp Vault', 'Nexus', 'EJBCA', 'IDnomic', 'Futurex', 'CSC Global', 'Custom CA', 'XCA Test Issuer',
] as const;
const caAccounts = ['Account-01', 'Account-02', 'Account-03'] as const;
const certificateTypes = ['DV', 'OV', 'EV', 'Standard'] as const;
const certificateProfiles = ['Standard SSL', 'Wildcard SSL', 'Multi-Domain SSL'] as const;
const csrGenerationOptions = ['platform', 'upload', 'hsm', 'endpoint'] as const;
const categoryOptions = ['ADC', 'Cloud', 'Server', 'WAF', 'Firewall'] as const;
const sanTypes = ['DNS', 'IP Address', 'Email', 'URI'] as const;
const validityUnits = ['Days', 'Months', 'Years'] as const;
const hashFunctions = ['SHA-256', 'SHA-384', 'SHA-512'] as const;
const keyTypes = ['RSA', 'EC', 'Ed25519'] as const;
const vendorMap: Record<(typeof categoryOptions)[number], string[]> = {
  ADC: ['F5', 'Citrix ADC'],
  Cloud: ['Azure', 'AWS ACM', 'GCP Certificate Manager'],
  Server: ['Generic Linux', 'Apache Linux', 'Tomcat Linux', 'Nginx Linux', 'Windows Apache', 'Windows Tomcat', 'Microsoft Server', 'ABAP', 'Web Dispatcher'],
  WAF: ['Imperva', 'Fortinet', 'ABAP', 'Web Dispatcher'],
  Firewall: ['Palo Alto', 'Fortinet'],
};
const idnomicRaAccount = 'Account-02';

const enrollSchema = z.object({
  group: z.string().min(1),
  ca: z.string().min(1),
  caAccount: z.string().min(1),
  commonName: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/, 'Common Name format is invalid'),
  validityValue: z.number().min(1),
  country: z.string().trim().max(2),
  hashFunction: z.string().min(1),
  keyType: z.string().min(1),
  certificateId: z.string().trim().min(1),
});

type SubmissionPhase = 'idle' | 'submit' | 'approve' | 'implement';
type AttachmentRow = { id: string; name: string; comments: string; fileName: string };
type AttributeRow = { id: string; key: string; value: string };

const makeId = () => Math.random().toString(36).slice(2, 10);

function RequiredMark() {
  return <span className="text-teal">*</span>;
}

function FieldShell({ label, required, note, helpText, mono, children }: { label: string; required?: boolean; note?: string; helpText?: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-foreground">
        {label} {required && <RequiredMark />}
      </Label>
      <div className={mono ? 'font-mono' : undefined}>{children}</div>
      {note && <div className="rounded-md border border-teal/20 bg-teal/5 px-3 py-2 text-[11px] text-muted-foreground">{note}</div>}
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function AnimatedBlock({ show, children, className }: { show: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid transition-all duration-200 ease-out', show ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0', className)}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function TextField(props: React.ComponentProps<typeof Input> & { label: string; required?: boolean; note?: string; helpText?: string; mono?: boolean }) {
  const { label, required, note, helpText, mono, className, ...rest } = props;
  return (
    <FieldShell label={label} required={required} note={note} helpText={helpText} mono={mono}>
      <Input {...rest} className={cn(mono && 'font-mono', className)} />
    </FieldShell>
  );
}

function TextAreaField(props: React.ComponentProps<typeof Textarea> & { label: string; required?: boolean; note?: string; helpText?: string }) {
  const { label, required, note, helpText, ...rest } = props;
  return (
    <FieldShell label={label} required={required} note={note} helpText={helpText}>
      <Textarea {...rest} />
    </FieldShell>
  );
}

function NumberField({ label, value, onChange, min, max, required, helpText }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; required?: boolean; helpText?: string }) {
  return (
    <FieldShell label={label} required={required} helpText={helpText}>
      <Input type="number" value={String(value)} min={min} max={max} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </FieldShell>
  );
}

function SelectField({ label, value, onChange, options, placeholder, required, note, helpText, mono }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] | string[]; placeholder?: string; required?: boolean; note?: string; helpText?: string; mono?: boolean }) {
  return (
    <FieldShell label={label} required={required} note={note} helpText={helpText} mono={mono}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={mono ? 'font-mono' : undefined}>
          <SelectValue placeholder={placeholder || 'Select'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function ToggleField({ label, checked, onCheckedChange, note }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void; note?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/30 px-3 py-2">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {note && <div className="rounded-md border border-teal/20 bg-teal/5 px-3 py-2 text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

function FileUploadField({ label, helpText, accept, onFileNameChange }: { label: string; helpText?: string; accept?: string; onFileNameChange: (value: string) => void }) {
  return (
    <FieldShell label={label} helpText={helpText}>
      <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-border bg-background/30 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
        <span className="inline-flex items-center gap-2"><Upload className="h-3.5 w-3.5" /> Choose file</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileNameChange(event.target.files?.[0]?.name || '')}
        />
      </label>
    </FieldShell>
  );
}

export default function EnrollCertificateWizard({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (request: PolicyRequestRow) => void }) {
  const [group, setGroup] = useState<string>(groupOptions[0]);
  const [ca, setCa] = useState<string>('DigiCert');
  const [renewAutomatically, setRenewAutomatically] = useState(true);
  const [regenerateAutomatically, setRegenerateAutomatically] = useState(false);
  const [reenrollAutomatically, setReenrollAutomatically] = useState(false);
  const [renewDays, setRenewDays] = useState(30);
  const [regenerateDays, setRegenerateDays] = useState(15);
  const [reenrollDays, setReenrollDays] = useState(30);
  const [caAccount, setCaAccount] = useState<string>(caAccounts[0]);
  const [certificateType, setCertificateType] = useState<string>('OV');
  const [division, setDivision] = useState('Division A');
  const [certificateProfile, setCertificateProfile] = useState<string>(certificateProfiles[0]);
  const [raWorkflow, setRaWorkflow] = useState('RA-Workflow-01');
  const [issuerLocation, setIssuerLocation] = useState('us-central1');
  const [issuerName, setIssuerName] = useState('issuer-prod');
  const [templateName, setTemplateName] = useState('tls-standard-template');
  const [issuancePolicy, setIssuancePolicy] = useState('Policy-Standard');
  const [rootCa, setRootCa] = useState('Root-CA-01');
  const [signingCa, setSigningCa] = useState('Signing-CA-01');
  const [extensionProfile, setExtensionProfile] = useState('Profile-A');
  const [approvalGroupName, setApprovalGroupName] = useState('Group-Ops');
  const [connectorName, setConnectorName] = useState('payments-api-enrollment');
  const [description, setDescription] = useState('');
  const [csrGeneration, setCsrGeneration] = useState<(typeof csrGenerationOptions)[number]>('platform');
  const [uploadedCsrName, setUploadedCsrName] = useState('');
  const [uploadedCsrText, setUploadedCsrText] = useState('');
  const [deviceType, setDeviceType] = useState('HSM Devices');
  const [hsmVendor, setHsmVendor] = useState('Thales');
  const [moduleNumber, setModuleNumber] = useState(1);
  const [hsmDevice, setHsmDevice] = useState('HSM-Device-01');
  const [keyHandlerName, setKeyHandlerName] = useState('payments-hsm-key-handler');
  const [keyReferenceName, setKeyReferenceName] = useState('payments-adc-key-ref');
  const [endpointCategory, setEndpointCategory] = useState<(typeof categoryOptions)[number]>('Server');
  const [endpointVendor, setEndpointVendor] = useState(vendorMap.Server[0]);
  const [endpointDevice, setEndpointDevice] = useState('device-01.acme.com');
  const [endpointProfile, setEndpointProfile] = useState('Default');
  const [tenant, setTenant] = useState('tenant-001');
  const [serviceName, setServiceName] = useState('Service-A');
  const [csrLocation, setCsrLocation] = useState('/etc/pki/csr');
  const [templateForFirewall, setTemplateForFirewall] = useState('Template-A');
  const [partition, setPartition] = useState('Common');
  const [csrFileName, setCsrFileName] = useState('payments-api');
  const [keyFileName, setKeyFileName] = useState('payments-api-key');
  const [certificateFileName, setCertificateFileName] = useState('payments-api-cert');
  const [cloudService, setCloudService] = useState('Key Vault');
  const [keyVault, setKeyVault] = useState('payments-prod-kv');
  const [serverService, setServerService] = useState('IIS');
  const [exchangeServer, setExchangeServer] = useState('exchange-01.acme.com');
  const [replacePseFile, setReplacePseFile] = useState(false);
  const [commonName, setCommonName] = useState('api.example.com');
  const [sanType, setSanType] = useState<string>('DNS');
  const [sanInput, setSanInput] = useState('api.example.com,www.api.example.com');
  const [organization, setOrganization] = useState('AcmeCorp');
  const [organizationalUnit, setOrganizationalUnit] = useState('Platform');
  const [locality, setLocality] = useState('San Francisco');
  const [stateValue, setStateValue] = useState('CA');
  const [country, setCountry] = useState('US');
  const [emailAddress, setEmailAddress] = useState('pki@acme.com');
  const [validityValue, setValidityValue] = useState(13);
  const [validityUnit, setValidityUnit] = useState<(typeof validityUnits)[number]>('Months');
  const [challengePassword, setChallengePassword] = useState('ChangeMe!1');
  const [confirmPassword, setConfirmPassword] = useState('ChangeMe!1');
  const [hashFunction, setHashFunction] = useState<string>('SHA-256');
  const [keyType, setKeyType] = useState<(typeof keyTypes)[number]>('RSA');
  const [bitLength, setBitLength] = useState('2048');
  const [attachments, setAttachments] = useState<AttachmentRow[]>([{ id: makeId(), name: '', comments: '', fileName: '' }]);
  const [attributes, setAttributes] = useState<AttributeRow[]>([{ id: makeId(), key: 'Cost Center', value: '' }, { id: makeId(), key: 'Business Owner', value: '' }]);
  const [deviceName, setDeviceName] = useState('device-01.acme.com');
  const [applicationIpAddress, setApplicationIpAddress] = useState('10.0.4.18');
  const [trackingId, setTrackingId] = useState('TRACK-2048');
  const [certificateHolderEmail, setCertificateHolderEmail] = useState('owner@acme.com');
  const [idnomicFirstName, setIdnomicFirstName] = useState('Alex');
  const [idnomicLastName, setIdnomicLastName] = useState('Mason');
  const [idnomicOrganization, setIdnomicOrganization] = useState('AcmeCorp');
  const [idnomicComment, setIdnomicComment] = useState('RA-backed identity validation required');
  const [idnomicUuid, setIdnomicUuid] = useState('IDN-000128');
  const [certificateId, setCertificateId] = useState('api-example-com');
  const [cscServerType, setCscServerType] = useState('Apache');
  const [businessUnit, setBusinessUnit] = useState('Payments');
  const [organizationContact, setOrganizationContact] = useState('security@acme.com');
  const [phoneNumber, setPhoneNumber] = useState('+1-5550101');
  const [domainValidationType, setDomainValidationType] = useState('EMAIL');
  const [digicertServerType, setDigicertServerType] = useState('Apache');
  const [paymentMethod, setPaymentMethod] = useState('Bill To Account Balance');
  const [additionalEmail, setAdditionalEmail] = useState('secops@acme.com');
  const [renewalMessage, setRenewalMessage] = useState('Renew during scheduled maintenance window');
  const [vendorNotes, setVendorNotes] = useState('');
  const [seatId, setSeatId] = useState('SEAT-101');
  const [globalSignProfile, setGlobalSignProfile] = useState<string>('Profile-Standard');
  const [expiryEmails, setExpiryEmails] = useState('ops@acme.com,security@acme.com');
  const [procedures, setProcedures] = useState('Default Procedure');
  const [challengeType, setChallengeType] = useState('HTTP');
  const [challengeVerify, setChallengeVerify] = useState('Manual');
  const [dnsVendor, setDnsVendor] = useState('Cloudflare');
  const [dnsSettings, setDnsSettings] = useState('None');
  const [endEntityProfileName, setEndEntityProfileName] = useState('Profile-A');
  const [endEntityUserName, setEndEntityUserName] = useState('api-example-com');
  const [issuerCommonName, setIssuerCommonName] = useState('CA-Issuer-01');
  const [certificateProfileName, setCertificateProfileName] = useState('CertProfile-A');
  const [crlAndOcspRequired, setCrlAndOcspRequired] = useState(true);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>('idle');
  const [submitComments, setSubmitComments] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [implementationComments, setImplementationComments] = useState('');

  const isIdnomicRa = ca === 'IDnomic' && caAccount === idnomicRaAccount;
  const supportsCertificateProfile = !['Amazon Private CA', 'Google CA'].includes(ca);
  const showCsrGeneration = ca !== 'Amazon Private CA';
  const showHsmOption = !['Google CA', 'CSC Global', 'DigiCert One'].includes(ca);
  const showEndpointOption = !['Google CA', 'CSC Global'].includes(ca);
  const approvalRequired = true;
  const sanValues = useMemo(() => sanInput.split(',').map((value) => value.trim()).filter(Boolean), [sanInput]);
  const endpointVendors = vendorMap[endpointCategory];

  useEffect(() => {
    setEndpointVendor(vendorMap[endpointCategory][0]);
  }, [endpointCategory]);

  useEffect(() => {
    setCertificateId(commonName.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'certificate-id');
  }, [commonName]);

  useEffect(() => {
    if (keyType === 'RSA') setBitLength('2048');
    if (keyType === 'EC') setBitLength('P-256');
    if (keyType === 'Ed25519') setBitLength('');
  }, [keyType]);

  useEffect(() => {
    if (!open) {
      setSubmissionPhase('idle');
      setSubmitComments('');
      setApprovalComments('');
      setImplementationComments('');
    }
  }, [open]);

  const validateBeforeSubmit = () => {
    const result = enrollSchema.safeParse({
      group,
      ca,
      caAccount,
      commonName,
      validityValue,
      country,
      hashFunction,
      keyType,
      certificateId,
    });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Please complete the required fields.');
      return false;
    }
    if (challengePassword !== confirmPassword) {
      toast.error('Challenge Password and Confirm Password must match.');
      return false;
    }
    if (keyType !== 'Ed25519' && !bitLength) {
      toast.error('Bit Length is required.');
      return false;
    }
    return true;
  };

  const createRequest = (status: PolicyRequestRow['status']) : PolicyRequestRow => ({
    id: `REQ-${Math.floor(41030 + Math.random() * 100)}`,
    action: 'Enroll',
    certificateTarget: commonName,
    requestedBy: 'Current User',
    created: 'Just now',
    status,
    subject: commonName,
    targetCA: ca,
    stages: [
      { label: 'Enrollment Request', timestamp: 'Just now', status: 'done', details: [{ label: 'Assign Group', value: group }, { label: 'Certificate Authority', value: ca }] },
      { label: 'Request Creation', timestamp: 'Just now', status: 'done', details: [{ label: 'CSR Generation', value: csrGeneration }, { label: 'Certificate ID', value: certificateId }] },
      { label: 'CA Submission', timestamp: status === 'In Progress' ? 'Submitting' : 'Queued', status: status === 'In Progress' ? 'active' : 'pending', details: [{ label: 'CA Account', value: caAccount }, { label: 'Certificate Type', value: certificateType }] },
      { label: 'Certificate Issued', timestamp: 'Pending', status: 'pending', details: [{ label: 'Tracking ID', value: trackingId || 'Not provided' }, { label: 'Implementation', value: implementationComments || 'Ready' }] },
    ],
  });

  const addAttachmentRow = () => setAttachments((rows) => [...rows, { id: makeId(), name: '', comments: '', fileName: '' }]);
  const updateAttachment = (id: string, key: keyof AttachmentRow, value: string) => setAttachments((rows) => rows.map((row) => row.id === id ? { ...row, [key]: value } : row));
  const addAttributeRow = () => setAttributes((rows) => [...rows, { id: makeId(), key: '', value: '' }]);
  const updateAttribute = (id: string, key: keyof AttributeRow, value: string) => setAttributes((rows) => rows.map((row) => row.id === id ? { ...row, [key]: value } : row));

  const confirmSubmit = () => {
    if (!validateBeforeSubmit()) return;
    setSubmissionPhase('submit');
  };

  const proceedAfterSubmit = () => {
    if (approvalRequired) setSubmissionPhase('approve');
    else setSubmissionPhase('implement');
  };

  const approveRequest = () => setSubmissionPhase('implement');
  const rejectRequest = () => {
    setSubmissionPhase('idle');
    toast.error('Certificate enrollment request was rejected.');
  };

  const implementRequest = () => {
    onSubmit(createRequest('In Progress'));
    toast.success('Certificate enrollment request submitted to CA.');
    onClose();
  };

  const scheduleLater = () => {
    onSubmit(createRequest('Pending'));
    toast('Certificate enrollment request scheduled.');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[760px] gap-0 overflow-hidden border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground"><FilePlus className="h-4 w-4 text-teal" /> Enroll Certificate</DialogTitle>
          <DialogDescription>Request a certificate with the full Cert+ enrollment form.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[72vh]">
          <div className="px-6 py-5">
            <Accordion type="multiple" defaultValue={[...sectionIds]} className="space-y-3">
              <AccordionItem value="general" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  General Information
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-4">
                  <SelectField label="Assign Group" required value={group} onChange={setGroup} options={groupOptions} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ca-details" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  CA Details
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField label="Certificate Authority" required value={ca} onChange={setCa} options={certificateAuthorities} />
                    <SelectField label="CA Account" required value={caAccount} onChange={setCaAccount} options={caAccounts} />
                    <SelectField label="Certificate Type" value={certificateType} onChange={setCertificateType} options={certificateTypes} />
                    <SelectField label="Certificate Profile" value={certificateProfile} onChange={setCertificateProfile} options={certificateProfiles} note="Available for supported CAs." />
                  </div>

                  <ToggleField label="Renew Automatically" checked={renewAutomatically} onCheckedChange={setRenewAutomatically} />
                  <AnimatedBlock show={renewAutomatically}><div className="pt-3"><NumberField label="Start Renewing (days before expiry)" min={1} max={120} value={renewDays} onChange={setRenewDays} /></div></AnimatedBlock>

                  <ToggleField label="Regenerate Automatically" checked={regenerateAutomatically} onCheckedChange={setRegenerateAutomatically} />
                  <AnimatedBlock show={regenerateAutomatically}><div className="pt-3"><NumberField label="Start Regenerating (days before expiry)" min={1} max={120} value={regenerateDays} onChange={setRegenerateDays} /></div></AnimatedBlock>

                  <ToggleField label="Re-enroll Automatically" checked={reenrollAutomatically} onCheckedChange={setReenrollAutomatically} />
                  <AnimatedBlock show={reenrollAutomatically}><div className="pt-3"><NumberField label="Start Re-enrolling (days before expiry)" min={1} max={120} value={reenrollDays} onChange={setReenrollDays} /></div></AnimatedBlock>

                  <AnimatedBlock show={ca === 'DigiCert'}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="Division" value={division} onChange={setDivision} options={['Division A', 'Division B']} note="Applicable only for DigiCert CA" /></div></AnimatedBlock>
                  <AnimatedBlock show={supportsCertificateProfile}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="Certificate Profile" value={certificateProfile} onChange={setCertificateProfile} options={certificateProfiles} /></div></AnimatedBlock>
                  <AnimatedBlock show={isIdnomicRa}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="RA Workflow" value={raWorkflow} onChange={setRaWorkflow} options={['RA-Workflow-01', 'RA-Workflow-02']} /></div></AnimatedBlock>
                  <AnimatedBlock show={ca === 'Google CA'}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="Issuer Location" value={issuerLocation} onChange={setIssuerLocation} options={['us-central1', 'us-east1', 'europe-west1']} /></div></AnimatedBlock>
                  <AnimatedBlock show={ca === 'Google CA'}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="Issuer Name" value={issuerName} onChange={setIssuerName} options={['issuer-prod', 'issuer-staging']} /></div></AnimatedBlock>
                  <AnimatedBlock show={ca === 'Futurex'}>
                    <div className="grid gap-4 pt-3 md:grid-cols-2">
                      <SelectField label="Issuance Policy" value={issuancePolicy} onChange={setIssuancePolicy} options={['Policy-Standard', 'Policy-Extended']} />
                      <SelectField label="Root CA" value={rootCa} onChange={setRootCa} options={['Root-CA-01', 'Root-CA-02']} />
                      <SelectField label="Signing CA" value={signingCa} onChange={setSigningCa} options={['Signing-CA-01', 'Signing-CA-02']} />
                      <SelectField label="Extension Profiles" value={extensionProfile} onChange={setExtensionProfile} options={['Profile-A', 'Profile-B']} />
                      <SelectField label="Approval Group Name" value={approvalGroupName} onChange={setApprovalGroupName} options={['Group-Ops', 'Group-Security']} />
                    </div>
                  </AnimatedBlock>

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Connector Name" value={connectorName} onChange={(event) => setConnectorName(event.target.value)} helpText="This name appears in the cert holistic view" />
                    <TextAreaField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} className="min-h-[88px] md:col-span-2" />
                  </div>

                  <AnimatedBlock show={showCsrGeneration}>
                    <div className="space-y-4 pt-3">
                      <FieldShell label="CSR Generation" required note="Not applicable for Amazon CA">
                        <RadioGroup value={csrGeneration} onValueChange={(value) => setCsrGeneration(value as (typeof csrGenerationOptions)[number])} className="grid gap-3">
                          {[
                            { value: 'platform', label: 'Platform', description: 'Private key and CSR created in the platform', disabled: false },
                            { value: 'upload', label: 'Upload CSR', description: 'Upload an existing CSR file', disabled: false },
                            { value: 'hsm', label: 'HSM', description: 'Generate on HSM device', disabled: !showHsmOption },
                            { value: 'endpoint', label: 'End Point', description: 'Generate on endpoint device', disabled: !showEndpointOption },
                          ].map((option) => (
                            <label key={option.value} className={cn('flex cursor-pointer items-start gap-3 rounded-md border border-border p-3', csrGeneration === option.value && 'border-teal bg-teal/5', option.disabled && 'cursor-not-allowed opacity-50')}>
                              <RadioGroupItem value={option.value} id={`csr-${option.value}`} disabled={option.disabled} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{option.label}</p>
                                <p className="text-[11px] text-muted-foreground">{option.description}</p>
                              </div>
                            </label>
                          ))}
                        </RadioGroup>
                      </FieldShell>

                      <AnimatedBlock show={csrGeneration === 'upload'}>
                        <div className="grid gap-4 pt-3">
                          <FileUploadField label="Paste or upload your CSR" accept=".pem,.csr,.txt" helpText="CSR fields will be auto-populated on upload" onFileNameChange={setUploadedCsrName} />
                          {uploadedCsrName && <p className="text-[11px] text-muted-foreground">Selected file: <span className="font-mono text-foreground">{uploadedCsrName}</span></p>}
                          <TextAreaField label="CSR Content" value={uploadedCsrText} onChange={(event) => setUploadedCsrText(event.target.value)} className="min-h-[120px] font-mono text-xs" />
                        </div>
                      </AnimatedBlock>

                      <AnimatedBlock show={csrGeneration === 'hsm'}>
                        <div className="grid gap-4 pt-3 md:grid-cols-2">
                          <SelectField label="Device Type" required value={deviceType} onChange={setDeviceType} options={['HSM Devices', 'ADC Devices']} />
                          <AnimatedBlock show={deviceType === 'ADC Devices'} className="md:contents"><SelectField label="Vendors" required value={hsmVendor} onChange={setHsmVendor} options={['Thales', 'Fortanix', 'Safenet']} /></AnimatedBlock>
                          <AnimatedBlock show={deviceType === 'HSM Devices' && hsmVendor === 'Thales'} className="md:contents"><NumberField label="Module Number" value={moduleNumber} onChange={setModuleNumber} /></AnimatedBlock>
                          <AnimatedBlock show={deviceType === 'HSM Devices'} className="md:contents">
                            <>
                              <SelectField label="Devices" required value={hsmDevice} onChange={setHsmDevice} options={['HSM-Device-01', 'HSM-Device-02']} />
                              <TextField label="Key Handler Name" required value={keyHandlerName} onChange={(event) => setKeyHandlerName(event.target.value)} />
                            </>
                          </AnimatedBlock>
                          <AnimatedBlock show={deviceType === 'ADC Devices'} className="md:contents"><TextField label="Key Reference Name" required value={keyReferenceName} onChange={(event) => setKeyReferenceName(event.target.value)} /></AnimatedBlock>
                        </div>
                      </AnimatedBlock>

                      <AnimatedBlock show={csrGeneration === 'endpoint'}>
                        <div className="grid gap-4 pt-3 md:grid-cols-2">
                          <SelectField label="Category" value={endpointCategory} onChange={(value) => setEndpointCategory(value as (typeof categoryOptions)[number])} options={categoryOptions} />
                          <SelectField label="Vendor" value={endpointVendor} onChange={setEndpointVendor} options={endpointVendors} note="Options change based on Category" />
                          <SelectField label="Devices" required value={endpointDevice} onChange={setEndpointDevice} options={['device-01.acme.com', 'device-02.acme.com']} mono />
                          <AnimatedBlock show={endpointCategory === 'Server' || endpointCategory === 'WAF'} className="md:contents"><SelectField label="Profile" required value={endpointProfile} onChange={setEndpointProfile} options={['Default', 'Custom']} /></AnimatedBlock>
                          <AnimatedBlock show={endpointCategory === 'ADC'} className="md:contents">
                            <>
                              <TextField label="Tenant" required value={tenant} onChange={(event) => setTenant(event.target.value)} helpText="Enter the tenant ID" />
                              <SelectField label="Service Name" value={serviceName} onChange={setServiceName} options={['Service-A', 'Service-B']} />
                            </>
                          </AnimatedBlock>
                          <AnimatedBlock show={endpointCategory === 'Server'} className="md:contents"><TextField label="CSR Location" value={csrLocation} onChange={(event) => setCsrLocation(event.target.value)} mono /></AnimatedBlock>
                          <AnimatedBlock show={endpointCategory === 'Firewall'} className="md:contents">
                            <>
                              <SelectField label="Template Name" required value={templateForFirewall} onChange={setTemplateForFirewall} options={['Template-A', 'Template-B']} />
                              <TextField label="Partition" value={partition} onChange={(event) => setPartition(event.target.value)} mono />
                              <TextField label="CSR File Name" required value={csrFileName} onChange={(event) => setCsrFileName(event.target.value)} helpText="Enter without file extension" mono />
                              <TextField label="Key File Name" required value={keyFileName} onChange={(event) => setKeyFileName(event.target.value)} helpText="Enter without file extension" mono />
                            </>
                          </AnimatedBlock>
                          <AnimatedBlock show={endpointCategory === 'Cloud'} className="md:contents">
                            <>
                              <TextField label="Certificate File Name" required value={certificateFileName} onChange={(event) => setCertificateFileName(event.target.value)} mono />
                              <SelectField label="Service Name" value={cloudService} onChange={setCloudService} options={['Key Vault', 'App Service']} />
                            </>
                          </AnimatedBlock>
                          <AnimatedBlock show={endpointCategory === 'Cloud' && endpointVendor === 'Azure' && cloudService === 'Key Vault'} className="md:contents"><TextField label="Key Vault" required value={keyVault} onChange={(event) => setKeyVault(event.target.value)} mono /></AnimatedBlock>
                          <AnimatedBlock show={endpointCategory === 'Server' && endpointVendor === 'Microsoft Server'} className="md:contents">
                            <>
                              <SelectField label="Service" required value={serverService} onChange={setServerService} options={['IIS', 'Exchange']} />
                              <AnimatedBlock show={serverService === 'Exchange'} className="md:contents"><SelectField label="Exchange Server" required value={exchangeServer} onChange={setExchangeServer} options={['exchange-01.acme.com']} mono /></AnimatedBlock>
                            </>
                          </AnimatedBlock>
                        </div>
                      </AnimatedBlock>
                    </div>
                  </AnimatedBlock>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="csr" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  CSR Parameters
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-4">
                  <AnimatedBlock show={csrGeneration === 'endpoint' && (endpointCategory === 'Server' || endpointCategory === 'WAF') && ['ABAP', 'Web Dispatcher'].includes(endpointVendor)}><div className="pb-3"><div className="flex items-center gap-2"><Checkbox checked={replacePseFile} onCheckedChange={(value) => setReplacePseFile(Boolean(value))} /><Label className="text-xs text-foreground">Replace PSE File</Label></div></div></AnimatedBlock>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Common Name" required value={commonName} onChange={(event) => setCommonName(event.target.value)} maxLength={64} helpText="No special characters except underscore (_) and hyphen (-). Max 64 characters." />
                    <div className="grid gap-4">
                      <SelectField label="SAN Type" value={sanType} onChange={setSanType} options={sanTypes} />
                      <TextField label="SAN Values" value={sanInput} onChange={(event) => setSanInput(event.target.value)} helpText="Separate multiple values with comma" />
                      <div className="flex flex-wrap gap-2">{sanValues.map((value) => <span key={value} className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground">{value}</span>)}</div>
                    </div>
                    <TextField label="Organization" value={organization} onChange={(event) => setOrganization(event.target.value)} helpText="Auto-filled from group policy if configured" />
                    <TextField label="Organization Unit" value={organizationalUnit} onChange={(event) => setOrganizationalUnit(event.target.value)} />
                    <TextField label="Locality" value={locality} onChange={(event) => setLocality(event.target.value)} />
                    <TextField label="State" value={stateValue} onChange={(event) => setStateValue(event.target.value)} />
                    <TextField label="Country" value={country} onChange={(event) => setCountry(event.target.value.toUpperCase())} maxLength={2} helpText="2-letter code, e.g. US, IN, GB" />
                    <TextField label="Email Address" type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} />
                    <FieldShell label="Validity" required>
                      <div className="flex gap-2">
                        <Input type="number" min={1} value={String(validityValue)} onChange={(event) => setValidityValue(Number(event.target.value || 0))} />
                        <Select value={validityUnit} onValueChange={(value) => setValidityUnit(value as (typeof validityUnits)[number])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{validityUnits.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </FieldShell>
                    <TextField label="Challenge Password" type="password" value={challengePassword} onChange={(event) => setChallengePassword(event.target.value)} helpText="Must contain uppercase, lowercase, number, and special character" />
                    <TextField label="Confirm Password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                    <SelectField label="Hash Function" required value={hashFunction} onChange={setHashFunction} options={hashFunctions} helpText="Auto-filled from group policy if configured" />
                    <SelectField label="Key Type" required value={keyType} onChange={(value) => setKeyType(value as (typeof keyTypes)[number])} options={keyTypes} helpText="Auto-filled from group policy if configured" />
                    <AnimatedBlock show={keyType !== 'Ed25519'} className="md:contents"><SelectField label="Bit Length" required value={bitLength} onChange={setBitLength} options={keyType === 'RSA' ? ['2048', '3072', '4096', '7680', '8192'] : ['P-256', 'P-384', 'P-521']} /></AnimatedBlock>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="attachments" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  Attachments
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-4">
                  {attachments.map((row, index) => (
                    <div key={row.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField label="Name" value={row.name} onChange={(event) => updateAttachment(row.id, 'name', event.target.value)} />
                        <TextAreaField label="Comments" value={row.comments} onChange={(event) => updateAttachment(row.id, 'comments', event.target.value)} maxLength={2000} className="min-h-[88px]" />
                        <div className="md:col-span-2">
                          <FileUploadField label="Upload File" onFileNameChange={(fileName) => updateAttachment(row.id, 'fileName', fileName)} />
                          {row.fileName && <p className="mt-2 text-[11px] text-muted-foreground">Attached file: <span className="font-mono text-foreground">{row.fileName}</span></p>}
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">Attachment {index + 1}</p>
                    </div>
                  ))}
                  <button type="button" onClick={addAttachmentRow} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">+ Add Attachment</button>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Comments</th><th className="px-3 py-2">File</th></tr></thead>
                      <tbody>{attachments.map((row) => <tr key={`table-${row.id}`} className="border-t border-border"><td className="px-3 py-2 text-foreground">{row.name || 'Untitled'}</td><td className="px-3 py-2 text-muted-foreground">{row.comments || 'No comments'}</td><td className="px-3 py-2 font-mono text-foreground">{row.fileName || 'No file'}</td></tr>)}</tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="attributes" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  Certificate Attributes
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-4">
                  <div className="rounded-md border border-teal/20 bg-teal/5 px-3 py-2 text-[11px] text-muted-foreground">These values are stored in the platform's inventory and can be used for filtering. They are not part of the certificate itself.</div>
                  {attributes.map((row) => (
                    <div key={row.id} className="grid gap-4 md:grid-cols-2">
                      <TextField label="Attribute Key" value={row.key} onChange={(event) => updateAttribute(row.id, 'key', event.target.value)} />
                      <TextField label="Attribute Value" value={row.value} onChange={(event) => updateAttribute(row.id, 'value', event.target.value)} />
                    </div>
                  ))}
                  <button type="button" onClick={addAttributeRow} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">+ Add Attribute</button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="generic" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  Generic Fields
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField label="Device Name" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} mono />
                    <TextField label="Application IP Address" value={applicationIpAddress} onChange={(event) => setApplicationIpAddress(event.target.value)} helpText="IP address of the application" mono />
                    <TextField label="Tracking ID" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} helpText="Free-form alphanumeric ID for audit log correlation" mono />
                    <TextField label="Certificate Holder Email" type="email" value={certificateHolderEmail} onChange={(event) => setCertificateHolderEmail(event.target.value)} />
                  </div>
                  <AnimatedBlock show={isIdnomicRa}>
                    <div className="grid gap-4 pt-3 md:grid-cols-2">
                      <TextField label="First Name" value={idnomicFirstName} onChange={(event) => setIdnomicFirstName(event.target.value)} />
                      <TextField label="Last Name" value={idnomicLastName} onChange={(event) => setIdnomicLastName(event.target.value)} />
                      <TextField label="Organization" value={idnomicOrganization} onChange={(event) => setIdnomicOrganization(event.target.value)} />
                      <TextField label="UUID" value={idnomicUuid} onChange={(event) => setIdnomicUuid(event.target.value)} mono />
                      <TextAreaField label="Comment" value={idnomicComment} onChange={(event) => setIdnomicComment(event.target.value)} className="min-h-[88px] md:col-span-2" />
                    </div>
                  </AnimatedBlock>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vendor" className="overflow-hidden rounded-lg border border-border bg-background/30">
                <AccordionTrigger className="bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  Vendor-Specific Details
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pt-4">
                  <TextField label="Certificate ID" value={certificateId} onChange={(event) => setCertificateId(event.target.value)} helpText="Auto-populated from Common Name. Editable. Changes to CN will not update this field." mono />

                  <AnimatedBlock show={ca === 'CSC Global'}>
                    <div className="grid gap-4 pt-3 md:grid-cols-2">
                      <SelectField label="Server Type" required value={cscServerType} onChange={setCscServerType} options={['Apache', 'IIS', 'Nginx', 'Other']} />
                      <TextField label="Business Unit" required value={businessUnit} onChange={(event) => setBusinessUnit(event.target.value)} />
                      <TextField label="Organization Contact" required type="email" value={organizationContact} onChange={(event) => setOrganizationContact(event.target.value)} />
                      <TextField label="Phone Number" required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} helpText="Format: +<country code>-<phone number>" />
                      <SelectField label="Domain Control Validation Type" required value={domainValidationType} onChange={setDomainValidationType} options={['EMAIL', 'CNAME']} />
                    </div>
                  </AnimatedBlock>

                  <AnimatedBlock show={ca === 'DigiCert'}>
                    <div className="grid gap-4 pt-3 md:grid-cols-2">
                      <SelectField label="Server Type" required value={digicertServerType} onChange={setDigicertServerType} options={['Apache', 'IIS', 'Nginx', 'Other']} />
                      <SelectField label="Payment Method" required value={paymentMethod} onChange={setPaymentMethod} options={['Bill To Account Balance', 'Bill To Default Credit Card']} />
                      <TextField label="Additional Email" type="email" value={additionalEmail} onChange={(event) => setAdditionalEmail(event.target.value)} helpText="Comma-separated for multiple" />
                      <TextField label="Renewal Message" value={renewalMessage} onChange={(event) => setRenewalMessage(event.target.value)} />
                      <TextAreaField label="Notes" value={vendorNotes} onChange={(event) => setVendorNotes(event.target.value)} className="min-h-[88px] md:col-span-2" />
                    </div>
                  </AnimatedBlock>

                  <AnimatedBlock show={ca === 'DigiCert One'}><div className="grid gap-4 pt-3 md:grid-cols-2"><TextField label="Seat ID" value={seatId} onChange={(event) => setSeatId(event.target.value)} helpText="Shown only if Allow Seat ID during enrollment is enabled on the CA account" /></div></AnimatedBlock>
                  <AnimatedBlock show={ca === 'GlobalSign MSSL'}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="Profile Name" required value={globalSignProfile} onChange={setGlobalSignProfile} options={['Profile-Standard', 'Profile-Wildcard']} /></div></AnimatedBlock>
                  <AnimatedBlock show={ca === 'HydrantID'}><div className="grid gap-4 pt-3 md:grid-cols-2"><TextField label="Expiry Emails" value={expiryEmails} onChange={(event) => setExpiryEmails(event.target.value)} helpText="Comma-separated list. Cannot be updated during renewal." /></div></AnimatedBlock>
                  <AnimatedBlock show={ca === 'Nexus'}><div className="grid gap-4 pt-3 md:grid-cols-2"><SelectField label="Procedures" value={procedures} onChange={setProcedures} options={['Default Procedure', 'Custom Procedure']} /></div></AnimatedBlock>

                  <AnimatedBlock show={ca === "Let's Encrypt"}>
                    <div className="grid gap-4 pt-3 md:grid-cols-2">
                      <SelectField label="Challenge Type" required value={challengeType} onChange={setChallengeType} options={['HTTP', 'DNS']} />
                      <AnimatedBlock show={challengeType === 'DNS'} className="md:contents"><SelectField label="Challenge Verify" value={challengeVerify} onChange={setChallengeVerify} options={['Manual', 'Automatic']} /></AnimatedBlock>
                      <AnimatedBlock show={challengeType === 'DNS' && challengeVerify === 'Automatic'} className="md:contents">
                        <>
                          <SelectField label="Vendor" value={dnsVendor} onChange={setDnsVendor} options={['Cloudflare', 'Azure']} />
                          <SelectField label="Settings" value={dnsSettings} onChange={setDnsSettings} options={['None']} />
                        </>
                      </AnimatedBlock>
                    </div>
                  </AnimatedBlock>

                  <AnimatedBlock show={ca === 'EJBCA'}>
                    <div className="grid gap-4 pt-3 md:grid-cols-2">
                      <SelectField label="End Entity Profile Name" required value={endEntityProfileName} onChange={setEndEntityProfileName} options={['Profile-A', 'Profile-B']} />
                      <TextField label="End Entity User Name" value={endEntityUserName} onChange={(event) => setEndEntityUserName(event.target.value)} />
                      <SelectField label="Issuer Common Name" required value={issuerCommonName} onChange={setIssuerCommonName} options={['CA-Issuer-01', 'CA-Issuer-02']} />
                      <SelectField label="Certificate Profile Name" required value={certificateProfileName} onChange={setCertificateProfileName} options={['CertProfile-A', 'CertProfile-B']} />
                    </div>
                  </AnimatedBlock>

                  <AnimatedBlock show={ca === 'Custom CA'}><div className="pt-3"><ToggleField label="CRL and OCSP Required *" checked={crlAndOcspRequired} onCheckedChange={setCrlAndOcspRequired} /></div></AnimatedBlock>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card px-6 py-4">
          <DialogFooter className="flex items-center justify-between sm:flex-row sm:justify-between sm:space-x-0">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Cancel</button>
            <button type="button" onClick={confirmSubmit} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Submit Request</button>
          </DialogFooter>

          <AnimatedBlock show={submissionPhase !== 'idle'} className="mt-4">
            <div className="rounded-lg border border-border bg-background/40 p-4">
              {submissionPhase === 'submit' && (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-2 py-1 text-[11px] font-medium text-teal"><Info className="h-3 w-3" /> Submit</div>
                  <p className="text-sm text-foreground">Add any comments for this request (optional)</p>
                  <Textarea value={submitComments} onChange={(event) => setSubmitComments(event.target.value)} rows={1} className="min-h-[44px]" />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={proceedAfterSubmit} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Confirm Submit</button>
                    <button type="button" onClick={() => setSubmissionPhase('idle')} className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary">Cancel</button>
                  </div>
                </div>
              )}

              {submissionPhase === 'approve' && (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-2 py-1 text-[11px] font-medium text-teal"><ChevronRight className="h-3 w-3" /> Approve</div>
                  <p className="text-sm text-foreground">This request requires approval. Approve to proceed.</p>
                  <Textarea value={approvalComments} onChange={(event) => setApprovalComments(event.target.value)} rows={1} className="min-h-[44px]" placeholder="Approval comments (optional)" />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={approveRequest} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Approve</button>
                    <button type="button" onClick={rejectRequest} className="rounded-md border border-coral/30 px-4 py-2 text-xs font-medium text-coral hover:bg-coral/10">Reject</button>
                  </div>
                </div>
              )}

              {submissionPhase === 'implement' && (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-2 py-1 text-[11px] font-medium text-teal"><ChevronDown className="h-3 w-3" /> Implement</div>
                  <p className="text-sm text-foreground">Ready to implement. Click Implement to submit CSR to CA.</p>
                  <Textarea value={implementationComments} onChange={(event) => setImplementationComments(event.target.value)} rows={1} className="min-h-[44px]" placeholder="Implementation comments (optional)" />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={implementRequest} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">Implement</button>
                    <button type="button" onClick={scheduleLater} className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">Schedule Later</button>
                  </div>
                </div>
              )}
            </div>
          </AnimatedBlock>
        </div>
      </DialogContent>
    </Dialog>
  );
}