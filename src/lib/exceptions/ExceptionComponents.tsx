import React, { useState } from 'react';
import { useExceptions } from '@/lib/exceptions/ExceptionsContext';

const todayISO = () => new Date().toISOString().slice(0, 10);

export function RaiseExceptionModal({
  open, onClose, objectId, objectName, objectType, parentAsset, policyId, policyName,
}: {
  open: boolean; onClose: () => void;
  objectId: string; objectName: string; objectType: string; parentAsset?: string;
  policyId: string; policyName: string;
}) {
  const { raiseException } = useExceptions();
  const [reason, setReason] = useState('');
  const [expiry, setExpiry] = useState('');
  const [error, setError] = useState('');
  if (!open) return null;

  const submit = () => {
    const res = raiseException({ objectId, objectName, objectType, parentAsset, policyId, policyName, reason, expiry });
    if (!res.ok) { setError(res.message); return; }
    setReason(''); setExpiry(''); setError(''); onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[440px] max-w-[92vw] bg-card border border-border rounded-xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-3">
          <p className="text-[13px] font-semibold text-foreground">Add policy exception</p>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          <span className="text-foreground font-medium">{objectName}</span>
          <span className="text-muted-foreground"> ({objectType}{parentAsset ? ` · ${parentAsset}` : ''})</span> will be exempt from
          <span className="text-foreground font-medium"> {policyName}</span> until the expiry date.
          The object stays visible as Excepted and is removed from this policy's non-compliant count and risk score while the exception is active.
        </p>
        <label className="block text-[11px] font-medium mb-1">Justification<span className="text-coral">*</span></label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="Why is this non-compliance accepted? e.g. legacy appliance, compensating control in place."
          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-background text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 mb-3" />
        <label className="block text-[11px] font-medium mb-1">Expiry date<span className="text-coral">*</span></label>
        <input type="date" value={expiry} min={todayISO()} onChange={e => setExpiry(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-background text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 mb-1" />
        <p className="text-[10px] text-muted-foreground mb-3">An exception cannot be open-ended. It will automatically lapse on this date and the object will return to Non-Compliant.</p>
        {error && <p className="text-[11px] text-coral mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={submit} className="text-[11px] px-3 py-1.5 rounded-lg bg-amber text-white font-medium hover:opacity-90">Add exception</button>
        </div>
      </div>
    </div>
  );
}

export function ExtendExpiryModal({
  open, onClose, currentExpiry, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  currentExpiry: string;
  onConfirm: (newExpiry: string) => void;
}) {
  const [expiry, setExpiry] = useState(currentExpiry);
  const [error, setError] = useState('');
  if (!open) return null;

  const submit = () => {
    if (!expiry) { setError('Pick a new expiry date.'); return; }
    const today = todayISO();
    if (expiry < today) { setError('Expiry must be in the future.'); return; }
    if (expiry === currentExpiry) { setError('Pick a date later than the current expiry.'); return; }
    if (expiry <= currentExpiry) { setError('New expiry must be after the current expiry.'); return; }
    onConfirm(expiry);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[400px] max-w-[92vw] bg-card border border-border rounded-xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-3">
          <p className="text-[13px] font-semibold text-foreground">Extend exception expiry</p>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Current expiry: <span className="text-foreground font-medium">{currentExpiry}</span>. Choose a later date. The exception remains active until the new date is reached.
        </p>
        <label className="block text-[11px] font-medium mb-1">New expiry date<span className="text-coral">*</span></label>
        <input
          type="date"
          value={expiry}
          min={todayISO()}
          onChange={e => { setExpiry(e.target.value); setError(''); }}
          className="w-full border border-border rounded-lg px-3 py-2 text-[11px] bg-background text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 mb-1"
        />
        {error && <p className="text-[11px] text-coral mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={submit} className="text-[11px] px-3 py-1.5 rounded-lg bg-teal text-white font-medium hover:opacity-90">Extend</button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ s }: { s: string }) {
  const cls = s === 'Active' ? 'bg-teal/10 text-teal' : s === 'Expired' ? 'bg-muted text-muted-foreground' : 'bg-coral/10 text-coral';
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{s}</span>;
}

export function ExceptionsList({ scope }: { scope: { kind: 'object'; id: string } | { kind: 'policy'; id: string } }) {
  const { exceptions, statusOf, revokeException, extendExpiry } = useExceptions();
  const [extendId, setExtendId] = useState<string | null>(null);
  const rows = exceptions.filter(e => scope.kind === 'object' ? e.objectId === scope.id : e.policyId === scope.id);
  if (rows.length === 0) return <p className="text-[11px] text-muted-foreground py-2">No exceptions.</p>;
  const extendRow = extendId ? exceptions.find(x => x.id === extendId) : null;
  return (
    <div className="space-y-2">
      {rows.map(e => {
        const s = statusOf(e);
        return (
          <div key={e.id} className="border border-border rounded-lg p-2.5 bg-background">
            <div className="flex items-center justify-between mb-1">
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-foreground">
                  {scope.kind === 'object' ? e.policyName : e.objectName}
                </span>
                {scope.kind === 'policy' && (
                  <span className="text-[10px] text-muted-foreground ml-1.5">
                    · {e.objectType}{e.parentAsset ? ` · ${e.parentAsset}` : ''}
                  </span>
                )}
              </div>
              <StatusChip s={s} />
            </div>
            <p className="text-[10px] text-muted-foreground mb-1">{e.reason}</p>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <span>Raised by {e.createdBy}</span>
              <span>Expires {e.expiry}</span>
              {e.revokedAt && <span className="text-coral">Revoked by {e.revokedBy}</span>}
            </div>
            {s === 'Active' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => revokeException(e.id)} className="text-[10px] px-2 py-0.5 rounded text-coral hover:bg-coral/10">Revoke</button>
                <button onClick={() => setExtendId(e.id)} className="text-[10px] px-2 py-0.5 rounded text-teal hover:bg-teal/10">Extend</button>
              </div>
            )}
          </div>
        );
      })}
      {extendRow && (
        <ExtendExpiryModal
          open={true}
          onClose={() => setExtendId(null)}
          currentExpiry={extendRow.expiry}
          onConfirm={(d) => extendExpiry(extendRow.id, d)}
        />
      )}
    </div>
  );
}
