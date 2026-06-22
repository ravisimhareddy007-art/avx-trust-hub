import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { useExceptions, PolicyException } from '@/lib/exceptions/ExceptionsContext';
import { ExtendExpiryModal } from '@/lib/exceptions/ExceptionComponents';
import { mockAssets } from '@/data/mockData';
import { X, ExternalLink } from 'lucide-react';

function StatusChip({ s }: { s: string }) {
  const cls = s === 'Active' ? 'bg-teal/10 text-teal' : s === 'Expired' ? 'bg-muted text-muted-foreground' : 'bg-coral/10 text-coral';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{s}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
      <div className="text-[12px] text-foreground">{children}</div>
    </div>
  );
}

function ExceptionDetailPanel({ exception, onClose }: { exception: PolicyException; onClose: () => void }) {
  const { statusOf, revokeException, extendExpiry } = useExceptions();
  const { setFilters, setCurrentPage } = useNav();
  const s = statusOf(exception);
  const obj = mockAssets.find(a => a.id === exception.objectId);

  const openInInventory = () => {
    setFilters({ tab: 'identities', search: exception.objectName });
    setCurrentPage('inventory');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[480px] max-w-[95vw] h-full bg-card border-l border-border shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Policy Exception</p>
            <button onClick={openInInventory} className="text-[14px] font-semibold text-teal hover:underline inline-flex items-center gap-1.5 mt-0.5">
              {exception.objectName}
              <ExternalLink className="w-3 h-3" />
            </button>
            <p className="text-[11px] text-muted-foreground mt-0.5">{exception.objectType}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <StatusChip s={s} />
            <span className="text-[11px] text-muted-foreground">Expires {exception.expiry}</span>
          </div>

          <Field label="Policy">{exception.policyName}</Field>
          <Field label="Justification">
            <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{exception.reason}</p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Parent Asset">{exception.parentAsset || '—'}</Field>
            {obj?.environment && <Field label="Environment">{obj.environment}</Field>}
            {obj?.owner && <Field label="Owner">{obj.owner}</Field>}
            {obj?.algorithm && <Field label="Algorithm">{obj.algorithm}</Field>}
            {obj?.keyLength && <Field label="Key Length">{obj.keyLength}</Field>}
            {obj?.caIssuer && <Field label="Issuing CA">{obj.caIssuer}</Field>}
            {obj?.status && <Field label="Object Status">{obj.status}</Field>}
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
            <Field label="Raised by">{exception.createdBy}</Field>
            <Field label="Raised on">{new Date(exception.createdAt).toLocaleDateString()}</Field>
          </div>

          {s === 'Revoked' && (
            <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
              <Field label="Revoked by">{exception.revokedBy || '—'}</Field>
              <Field label="Revoked on">{exception.revokedAt ? new Date(exception.revokedAt).toLocaleDateString() : '—'}</Field>
            </div>
          )}
          {s === 'Expired' && (
            <div className="border-t border-border pt-4">
              <p className="text-[11px] text-muted-foreground">Lapsed at expiry.</p>
            </div>
          )}

          {s === 'Active' && (
            <div className="border-t border-border pt-4 flex gap-2">
              <button
                onClick={() => { revokeException(exception.id); onClose(); }}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-coral/40 text-coral hover:bg-coral/10"
              >Revoke</button>
              <button
                onClick={() => {
                  const d = prompt('New expiry date (yyyy-mm-dd)', exception.expiry);
                  if (d) extendExpiry(exception.id, d);
                }}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-teal/40 text-teal hover:bg-teal/10"
              >Extend</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PolicyExceptionsPage() {
  const { exceptions, statusOf } = useExceptions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const active = exceptions.filter(e => statusOf(e) === 'Active');
  const expired = exceptions.filter(e => statusOf(e) === 'Expired');
  const revoked = exceptions.filter(e => statusOf(e) === 'Revoked');
  const selected = exceptions.find(e => e.id === selectedId) || null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Policy Exceptions</h1>

      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-lg border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Active</p>
          <p className="text-xl font-bold text-teal">{active.length}</p>
        </div>
        <div className="flex-1 bg-card rounded-lg border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Expired</p>
          <p className="text-xl font-bold text-muted-foreground">{expired.length}</p>
        </div>
        <div className="flex-1 bg-card rounded-lg border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Revoked</p>
          <p className="text-xl font-bold text-coral">{revoked.length}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-[11px] text-muted-foreground mb-4">
          Every crypto object that is exempted from a policy. An exception exempts one object from one policy with a justification and a mandatory expiry.
        </p>
        {exceptions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-6">No exceptions have been raised.</p>
        ) : (
          <table className="w-full text-xs table-fixed">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-[34%]">Object</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-[20%]">Type</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-[26%]">Policy</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-[12%]">Expiry</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-[8%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map(e => {
                const s = statusOf(e);
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-medium truncate">{e.objectName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground truncate">{e.objectType}</td>
                    <td className="py-2.5 px-3 text-muted-foreground truncate">{e.policyName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{e.expiry}</td>
                    <td className="py-2.5 px-3"><StatusChip s={s} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && <ExceptionDetailPanel exception={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
