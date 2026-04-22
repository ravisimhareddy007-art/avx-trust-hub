import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Paperclip, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PolicyRequestRow } from '../types';

const groupOptions = ['Default', 'Private_CA_Certificates', 'Public_CA_Certificates', 'Certificate-Gateway', 'JKCert'] as const;
const csrSelectionOptions = ['appviewx', 'hsm'] as const;
const deviceTypeOptions = ['HSM Devices', 'ADC Devices'] as const;
const hsmDeviceOptions = ['HSM-Device-01', 'HSM-Device-02'] as const;
const adcDeviceOptions = ['ADC-F5-01'] as const;
const sanTypeOptions = ['DNS', 'IP Address', 'Email', 'URI'] as const;
const validityOptions = ['Days', 'Months', 'Years'] as const;
const hashFunctionOptions = ['SHA-256', 'SHA-384', 'SHA-512'] as const;
const keyTypeOptions = ['RSA', 'EC', 'Ed25519'] as const;
const rsaBitLengths = ['2048', '3072', '4096', '7680', '8192'] as const;
const ecBitLengths = ['P-256', 'P-384', 'P-521'] as const;

type CsrSelection = (typeof csrSelectionOptions)[number];
type DeviceType = (typeof deviceTypeOptions)[number];
type ValidityUnit = (typeof validityOptions)[number];
type KeyType = (typeof keyTypeOptions)[number];
type AttachmentRow = { id: string; name: string; comments: string; fileName: string };

const csrSchema = z.object({
  group: z.string().min(1, 'Assign Group is required'),
  csrSelection: z.enum(csrSelectionOptions),
  deviceType: z.enum(deviceTypeOptions).optional(),
  device: z.string().optional(),
  keyHandlerName: z.string().optional(),
  keyReferenceName: z.string().optional(),
  commonName: z.string().trim().min(1, 'Common Name is required').regex(/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/, 'Only letters, numbers, underscore, hyphen, and dots are allowed'),
  organization: z.string().trim().min(1, 'Organization is required').max(255),
  organizationUnit: z.string().trim().max(255).optional(),
  locality: z.string().trim().max(255).optional(),
  state: z.string().trim().max(255).optional(),
  country: z.string().trim().length(2, 'Use a 2-letter country code').regex(/^[A-Za-z]{2}$/, 'Use letters only'),
  emailAddress: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  validityValue: z.number().min(1, 'Validity must be at least 1'),
  validityUnit: z.enum(validityOptions),
  challengePassword: z.string().refine(
    (value) => value === '' || /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value),
    'Password must include uppercase, lowercase, number, and special character',
  ),
  confirmPassword: z.string(),
  hashFunction: z.enum(hashFunctionOptions),
  keyType: z.enum(keyTypeOptions),
  bitLength: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.csrSelection === 'hsm') {
    if (!data.deviceType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deviceType'], message: 'Device Type is required' });
    if (!data.device) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['device'], message: 'Device is required' });
    if (data.deviceType === 'HSM Devices' && !data.keyHandlerName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['keyHandlerName'], message: 'Key Handler Name is required' });
    }
    if (data.deviceType === 'ADC Devices' && !data.keyReferenceName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['keyReferenceName'], message: 'Key Reference Name is required' });
    }
  }
  if (data.challengePassword !== data.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' });
  }
  if (data.keyType !== 'Ed25519' && !data.bitLength) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bitLength'], message: 'Bit Length is required' });
  }
});

const makeId = () => Math.random().toString(36).slice(2, 10);

function RequiredMark() {
  return <span className="text-teal">*</span>;
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-background/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, helpText, error, mono, children }: { label: string; required?: boolean; helpText?: string; error?: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-foreground">
        {label} {required && <RequiredMark />}
      </Label>
      <div className={mono ? 'font-mono' : undefined}>{children}</div>
      {helpText && <p className="text-[11px] text-muted-foreground">{helpText}</p>}
      {error && <p className="text-[11px] text-coral">{error}</p>}
    </div>
  );
}

function FileUpload({ label, fileName, onFileChange }: { label: string; fileName: string; onFileChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-border bg-background/30 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
        <span className="inline-flex items-center gap-2"><Paperclip className="h-3.5 w-3.5" /> Upload file</span>
        <span className="max-w-[220px] truncate font-mono text-foreground">{fileName || 'No file selected'}</span>
        <input
          type="file"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0]?.name || '')}
        />
      </label>
    </Field>
  );
}

function ChipInput({ values, onAdd, onRemove, placeholder }: { values: string[]; onAdd: (values: string[]) => void; onRemove: (value: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const next = draft
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!next.length) return;
    onAdd(next);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1 font-mono text-[11px] text-foreground">
            {value}
            <button type="button" onClick={() => onRemove(value)} className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function GenerateCSRModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (request: PolicyRequestRow) => void }) {
  const [group, setGroup] = useState<string>(groupOptions[0]);
  const [csrSelection, setCsrSelection] = useState<CsrSelection>('appviewx');
  const [deviceType, setDeviceType] = useState<DeviceType>('HSM Devices');
  const [device, setDevice] = useState<string>(hsmDeviceOptions[0]);
  const [keyHandlerName, setKeyHandlerName] = useState('payments-hsm-key-handler');
  const [keyReferenceName, setKeyReferenceName] = useState('f5-key-ref-prod');
  const [commonName, setCommonName] = useState('api.acme.com');
  const [sanType, setSanType] = useState<string>(sanTypeOptions[0]);
  const [sanValues, setSanValues] = useState<string[]>(['api.acme.com', '10.0.1.5']);
  const [organization, setOrganization] = useState('AcmeCorp');
  const [organizationUnit, setOrganizationUnit] = useState('Platform');
  const [locality, setLocality] = useState('Seattle');
  const [stateValue, setStateValue] = useState('Washington');
  const [country, setCountry] = useState('US');
  const [emailAddress, setEmailAddress] = useState('pki@acme.com');
  const [validityValue, setValidityValue] = useState(12);
  const [validityUnit, setValidityUnit] = useState<ValidityUnit>('Months');
  const [challengePassword, setChallengePassword] = useState('ChangeMe!1');
  const [confirmPassword, setConfirmPassword] = useState('ChangeMe!1');
  const [hashFunction, setHashFunction] = useState<string>(hashFunctionOptions[0]);
  const [keyType, setKeyType] = useState<KeyType>('RSA');
  const [bitLength, setBitLength] = useState<string>(rsaBitLengths[0]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([{ id: makeId(), name: '', comments: '', fileName: '' }]);
  const [attachmentSearch, setAttachmentSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deviceOptions = useMemo(() => (deviceType === 'HSM Devices' ? [...hsmDeviceOptions] : [...adcDeviceOptions]), [deviceType]);
  const bitLengthOptions = useMemo<string[]>(() => {
    if (keyType === 'RSA') return [...rsaBitLengths];
    if (keyType === 'EC') return [...ecBitLengths];
    return [];
  }, [keyType]);

  const filteredAttachments = useMemo(() => {
    const query = attachmentSearch.toLowerCase();
    if (!query) return attachments;
    return attachments.filter((attachment) => [attachment.name, attachment.comments, attachment.fileName].some((value) => value.toLowerCase().includes(query)));
  }, [attachmentSearch, attachments]);

  useEffect(() => {
    if (keyType === 'Ed25519') {
      setBitLength('');
      return;
    }
    if (!bitLengthOptions.includes(bitLength)) {
      setBitLength(bitLengthOptions[0]);
    }
  }, [bitLength, bitLengthOptions, keyType]);

  useEffect(() => {
    setDevice(deviceOptions[0]);
  }, [deviceOptions]);

  useEffect(() => {
    if (!open) {
      setErrors({});
    }
  }, [open]);

  const updateAttachment = (id: string, patch: Partial<AttachmentRow>) => {
    setAttachments((current) => current.map((attachment) => (attachment.id === id ? { ...attachment, ...patch } : attachment)));
  };

  const addAttachment = () => {
    setAttachments((current) => [...current, { id: makeId(), name: '', comments: '', fileName: '' }]);
  };

  const addSanValues = (entries: string[]) => {
    setSanValues((current) => Array.from(new Set([...current, ...entries])));
  };

  const removeSanValue = (value: string) => {
    setSanValues((current) => current.filter((item) => item !== value));
  };

  const resetAndClose = () => {
    setErrors({});
    onClose();
  };

  const handleSubmit = () => {
    const result = csrSchema.safeParse({
      group,
      csrSelection,
      deviceType: csrSelection === 'hsm' ? deviceType : undefined,
      device: csrSelection === 'hsm' ? device : undefined,
      keyHandlerName,
      keyReferenceName,
      commonName,
      organization,
      organizationUnit,
      locality,
      state: stateValue,
      country: country.toUpperCase(),
      emailAddress,
      validityValue,
      validityUnit,
      challengePassword,
      confirmPassword,
      hashFunction,
      keyType,
      bitLength: keyType === 'Ed25519' ? undefined : bitLength,
    });

    if (!result.success) {
      const nextErrors = result.error.issues.reduce<Record<string, string>>((acc, issue) => {
        const path = issue.path[0];
        if (typeof path === 'string' && !acc[path]) acc[path] = issue.message;
        return acc;
      }, {});
      setErrors(nextErrors);
      toast.error('Please complete the required CSR fields.');
      return;
    }

    onSubmit({
      id: `REQ-${Math.floor(10000 + Math.random() * 90000)}`,
      action: 'Generate CSR',
      certificateTarget: commonName,
      requestedBy: 'You',
      created: 'just now',
      status: 'Completed',
      subject: commonName,
      targetCA: group,
      stages: [
        { label: 'Enrollment Request', timestamp: 'just now', status: 'done', details: [{ label: 'CSR Selection', value: csrSelection === 'appviewx' ? 'AppViewX' : 'HSM' }, { label: 'Group', value: group }] },
        { label: 'Request Creation', timestamp: 'just now', status: 'done', details: [{ label: 'SAN Type', value: sanType }, { label: 'SAN Count', value: String(sanValues.length) }] },
        { label: 'CA Submission', timestamp: 'just now', status: 'done', details: [{ label: 'Hash Function', value: hashFunction }, { label: 'Key Type', value: keyType }] },
        { label: 'Certificate Issued', timestamp: 'just now', status: 'done', details: [{ label: 'Result', value: 'CSR generated and added to group' }] },
      ],
    });
    resetAndClose();
    toast.success('CSR generated and added to group successfully.');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="w-full max-w-[720px] gap-0 overflow-hidden border-border bg-card p-0 sm:rounded-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-lg font-semibold text-foreground">Generate CSR : Server</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100vh-11rem)] px-6 py-5">
          <div className="space-y-5 pb-6">
            <Section title="Group Details">
              <Field label="Assign Group" required error={errors.group}>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Section title="CSR Details">
              <div className="space-y-5">
                <Field label="CSR Selection" required error={errors.csrSelection}>
                  <RadioGroup value={csrSelection} onValueChange={(value) => setCsrSelection(value as CsrSelection)} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="appviewx" id="csr-selection-appviewx" />
                      <Label htmlFor="csr-selection-appviewx">AppViewX</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="hsm" id="csr-selection-hsm" />
                      <Label htmlFor="csr-selection-hsm">HSM</Label>
                    </div>
                  </RadioGroup>
                </Field>

                <div className={cn('grid gap-4 transition-all duration-200', csrSelection === 'hsm' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                  <div className="overflow-hidden">
                    {csrSelection === 'hsm' && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Device Type" required error={errors.deviceType}>
                          <Select value={deviceType} onValueChange={(value) => setDeviceType(value as DeviceType)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                            <SelectContent>
                              {deviceTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Device" required helpText="Options populated based on Device Type selected" error={errors.device}>
                          <Select value={device} onValueChange={setDevice}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select device" />
                            </SelectTrigger>
                            <SelectContent>
                              {deviceOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                        {deviceType === 'HSM Devices' ? (
                          <Field label="Key Handler Name" required error={errors.keyHandlerName}>
                            <Input value={keyHandlerName} onChange={(event) => setKeyHandlerName(event.target.value)} />
                          </Field>
                        ) : (
                          <Field label="Key Reference Name" required error={errors.keyReferenceName}>
                            <Input value={keyReferenceName} onChange={(event) => setKeyReferenceName(event.target.value)} />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Common Name" required helpText="No special characters allowed except underscore (_) and hyphen (-)" error={errors.commonName}>
                    <Input value={commonName} onChange={(event) => setCommonName(event.target.value)} />
                  </Field>

                  <Field label="Subject Alternative Name" helpText="Separate multiple values with a comma. Count shown in holistic view.">
                    <div className="space-y-2">
                      <Select value={sanType} onValueChange={setSanType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select SAN type" />
                        </SelectTrigger>
                        <SelectContent>
                          {sanTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <ChipInput values={sanValues} onAdd={addSanValues} onRemove={removeSanValue} placeholder="e.g. api.acme.com, 10.0.1.5" />
                    </div>
                  </Field>

                  <Field label="Organization" required helpText="Auto-filled from group policy if configured. Editable." error={errors.organization}>
                    <Input value={organization} onChange={(event) => setOrganization(event.target.value)} />
                  </Field>
                  <Field label="Organization Unit" helpText="Auto-filled from group policy if configured. Editable." error={errors.organizationUnit}>
                    <Input value={organizationUnit} onChange={(event) => setOrganizationUnit(event.target.value)} />
                  </Field>

                  <Field label="Locality" helpText="Auto-filled from group policy if configured. Editable." error={errors.locality}>
                    <Input value={locality} onChange={(event) => setLocality(event.target.value)} />
                  </Field>
                  <Field label="State" helpText="Auto-filled from group policy if configured. Editable." error={errors.state}>
                    <Input value={stateValue} onChange={(event) => setStateValue(event.target.value)} />
                  </Field>

                  <Field label="Country" required helpText="2-letter country code. e.g. US, IN, GB. Auto-filled if configured." error={errors.country}>
                    <Input value={country} maxLength={2} onChange={(event) => setCountry(event.target.value.toUpperCase())} />
                  </Field>
                  <Field label="Email Address" helpText="Contact email of the person responsible for this certificate" error={errors.emailAddress}>
                    <Input type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} />
                  </Field>

                  <div className="flex gap-3 md:col-span-2 md:items-end">
                    <Field label="Validity" required error={errors.validityValue}>
                      <Input className="w-32" type="number" min={1} value={String(validityValue)} onChange={(event) => setValidityValue(Number(event.target.value || 0))} />
                    </Field>
                    <Field label=" ">
                      <Select value={validityUnit} onValueChange={(value) => setValidityUnit(value as ValidityUnit)}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {validityOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Challenge Password" helpText="Must contain uppercase, lowercase, number, and special character" error={errors.challengePassword}>
                    <Input type="password" value={challengePassword} onChange={(event) => setChallengePassword(event.target.value)} />
                  </Field>
                  <Field label="Confirm Password" error={errors.confirmPassword}>
                    <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </Field>

                  <Field label="Hash Function" required helpText="Auto-filled from group policy. For Microsoft Enterprise CA, the CA decides this at issuance." error={errors.hashFunction}>
                    <Select value={hashFunction} onValueChange={setHashFunction}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hash" />
                      </SelectTrigger>
                      <SelectContent>
                        {hashFunctionOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Key Type" required helpText="Auto-filled from group policy if configured." error={errors.keyType}>
                    <Select value={keyType} onValueChange={(value) => setKeyType(value as KeyType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key type" />
                      </SelectTrigger>
                      <SelectContent>
                        {keyTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>

                  {keyType !== 'Ed25519' && (
                    <Field label="Bit Length" required helpText="Auto-filled from group policy if configured." error={errors.bitLength}>
                      <Select value={bitLength} onValueChange={setBitLength}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bit length" />
                        </SelectTrigger>
                        <SelectContent>
                          {bitLengthOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Attachments" note="Documents uploaded here are stored in AppViewX only and will not be submitted to the CA.">
              <div className="space-y-4">
                {filteredAttachments.map((attachment, index) => (
                  <div key={attachment.id} className="grid gap-4 rounded-lg border border-border bg-background/30 p-4 md:grid-cols-2">
                    <Field label="Name">
                      <Input value={attachment.name} placeholder="Alternate name for the document" onChange={(event) => updateAttachment(attachment.id, { name: event.target.value })} />
                    </Field>
                    <FileUpload label="Upload File" fileName={attachment.fileName} onFileChange={(value) => updateAttachment(attachment.id, { fileName: value })} />
                    <div className="md:col-span-2">
                      <Field label="Comments">
                        <Textarea
                          maxLength={2000}
                          placeholder="Enter comments"
                          value={attachment.comments}
                          onChange={(event) => updateAttachment(attachment.id, { comments: event.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Attachment {index + 1}</span>
                      <span>{attachment.comments.length}/2000</span>
                    </div>
                  </div>
                ))}

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <Field label="Search attachments">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={attachmentSearch} onChange={(event) => setAttachmentSearch(event.target.value)} placeholder="Search attachments..." className="pl-8" />
                    </div>
                  </Field>
                  <button type="button" onClick={addAttachment} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary">
                    <Plus className="h-3.5 w-3.5" />
                    Add Attachment
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </ScrollArea>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-card px-6 py-4 sm:justify-between">
          <button type="button" onClick={resetAndClose} className="rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
            Add
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}