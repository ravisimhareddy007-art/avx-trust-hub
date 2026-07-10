// src/components/core/RbacSection.tsx
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Copy, Pencil, Trash2, Users as UsersIcon, Search, X, ChevronRight,
  AlertTriangle, Lock, Check, Minus, Eye, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import {
  TAXONOMY, ACTIONS, ACTION_LABEL, ALL_ATOMS, TOTAL_ATOMS, SYSTEM_ROLES,
  INITIAL_BINDINGS, TENANTS, BUSINESS_UNITS, APPLICATIONS, PRINCIPALS,
  expandImplied, isSensitive, describeScope, scopedObjectCount, effectivePermissions,
  type Role, type Binding, type Scope, type Action,
} from '@/data/rbac';

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */

const Chip = ({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'teal' | 'amber' }) => (
  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
    tone === 'teal' ? 'bg-teal/15 text-teal'
      : tone === 'amber' ? 'bg-amber-500/15 text-amber-400'
      : 'bg-muted text-muted-foreground'
  }`}>{children}</span>
);

const IconBtn = ({ icon: Icon, label, onClick, disabled, title }: {
  icon: React.ElementType; label: string; onClick?: () => void; disabled?: boolean; title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
      disabled
        ? 'border-border/50 text-muted-foreground/40 cursor-not-allowed'
        : 'border-border text-muted-foreground hover:text-foreground hover:border-teal'
    }`}
  >
    <Icon className="w-3 h-3" /> {label}
  </button>
);

const TriBox = ({ state, onClick, disabled }: {
  state: 'on' | 'off' | 'mixed'; onClick: () => void; disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
      disabled ? 'border-border/40 bg-muted/30 cursor-not-allowed'
        : state === 'on' ? 'bg-teal border-teal'
        : state === 'mixed' ? 'bg-teal/30 border-teal'
        : 'border-border hover:border-teal'
    }`}
  >
    {state === 'on' && <Check className="w-3 h-3 text-primary-foreground" />}
    {state === 'mixed' && <Minus className="w-3 h-3 text-teal" />}
  </button>
);

const Drawer = ({ title, subtitle, onClose, children, footer, wide }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
    <div
      onClick={e => e.stopPropagation()}
      className={`h-full bg-background border-l border-border flex flex-col ${wide ? 'w-[900px]' : 'w-[560px]'} max-w-full`}
    >
      <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="border-t border-border px-5 py-3 shrink-0">{footer}</div>}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Permission matrix editor                                            */
/* ------------------------------------------------------------------ */

function PermissionMatrix({ selected, onChange, actorPermissions, readOnly }: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  actorPermissions: Set<string>;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(['inventory', 'platform']));
  const [q, setQ] = useState('');

  const canGrant = (atom: string) => actorPermissions.has(atom);

  const toggleAtom = (atom: string) => {
    if (readOnly || !canGrant(atom)) return;
    const next = new Set(selected);
    const [lhs, action] = atom.split(':');
    if (next.has(atom)) {
      next.delete(atom);
      // Unticking `read` clears every other verb on the same resource.
      if (action === 'read') ALL_ATOMS.filter(a => a.startsWith(`${lhs}:`)).forEach(a => next.delete(a));
    } else {
      next.add(atom);
      expandImplied([atom]).forEach(a => canGrant(a) && next.add(a));
    }
    onChange(next);
  };

  const bulk = (atoms: string[], turnOn: boolean) => {
    if (readOnly) return;
    const next = new Set(selected);
    const grantable = atoms.filter(canGrant);
    if (turnOn) expandImplied(grantable).filter(canGrant).forEach(a => next.add(a));
    else grantable.forEach(a => next.delete(a));
    onChange(next);
  };

  const stateOf = (atoms: string[]): 'on' | 'off' | 'mixed' => {
    const grantable = atoms.filter(canGrant);
    if (!grantable.length) return 'off';
    const n = grantable.filter(a => selected.has(a)).length;
    return n === 0 ? 'off' : n === grantable.length ? 'on' : 'mixed';
  };

  const domains = useMemo(() => {
    if (!q.trim()) return TAXONOMY;
    const needle = q.toLowerCase();
    return TAXONOMY
      .map(d => ({ ...d, resources: d.resources.filter(r =>
        `${d.domain}.${r.resource}`.includes(needle) ||
        r.label.toLowerCase().includes(needle) ||
        d.label.toLowerCase().includes(needle)) }))
      .filter(d => d.resources.length);
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter permissions, e.g. private_key"
          className="w-full pl-8 pr-3 py-2 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
        />
      </div>

      <div className="border border-border rounded overflow-hidden">
        {domains.map(d => {
          const domainAtoms = d.resources.flatMap(r => r.actions.map(a => `${d.domain}.${r.resource}:${a}`));
          const isOpen = open.has(d.domain) || !!q.trim();
          const st = stateOf(domainAtoms);
          return (
            <div key={d.domain} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <TriBox state={st} disabled={readOnly} onClick={() => bulk(domainAtoms, st !== 'on')} />
                <button
                  onClick={() => setOpen(p => { const n = new Set(p); n.has(d.domain) ? n.delete(d.domain) : n.add(d.domain); return n; })}
                  className="flex items-center gap-1.5 flex-1 text-left"
                >
                  <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="text-xs font-medium">{d.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{d.domain}</span>
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {domainAtoms.filter(a => selected.has(a)).length}/{domainAtoms.length}
                </span>
              </div>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left px-3 py-1.5 text-[10px] font-medium text-muted-foreground w-[280px]">Resource</th>
                        {ACTIONS.map(a => (
                          <th key={a} className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground text-center w-[64px]">
                            {ACTION_LABEL[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.resources.map(r => {
                        const resourceAtoms = r.actions.map(a => `${d.domain}.${r.resource}:${a}`);
                        const rSt = stateOf(resourceAtoms);
                        return (
                          <tr key={r.resource} className="border-b border-border/30 last:border-b-0 hover:bg-muted/20">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <TriBox state={rSt} disabled={readOnly} onClick={() => bulk(resourceAtoms, rSt !== 'on')} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] truncate">{r.label}</span>
                                    {r.sensitive && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground font-mono truncate">
                                    {d.domain}.{r.resource}
                                  </div>
                                  {r.note && <div className="text-[9px] text-amber-400/70 mt-0.5">{r.note}</div>}
                                </div>
                              </div>
                            </td>
                            {ACTIONS.map(a => {
                              const legal = r.actions.includes(a);
                              const atom = `${d.domain}.${r.resource}:${a}`;
                              if (!legal) return <td key={a} className="text-center" />;
                              const blocked = !canGrant(atom);
                              const impliedLock = a === 'read'
                                && r.actions.some(x => x !== 'read' && selected.has(`${d.domain}.${r.resource}:${x}`));
                              return (
                                <td key={a} className="px-2 py-1.5 text-center">
                                  <div
                                    className="inline-flex"
                                    title={
                                      blocked ? 'You cannot grant a permission you do not hold'
                                        : impliedLock ? 'Required by another selected action on this resource'
                                        : isSensitive(atom) ? 'Sensitive permission' : atom
                                    }
                                  >
                                    <TriBox
                                      state={selected.has(atom) ? 'on' : 'off'}
                                      disabled={readOnly || blocked || impliedLock}
                                      onClick={() => toggleAtom(atom)}
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between px-3 py-2 rounded bg-muted/60 border border-border backdrop-blur">
        <span className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-medium">{selected.size}</span> of {TOTAL_ATOMS} permissions selected
        </span>
        {[...selected].some(isSensitive) && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {[...selected].filter(isSensitive).length} sensitive
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scope picker                                                        */
/* ------------------------------------------------------------------ */

function ScopePicker({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  const multi = (list: { id: string; name: string }[], current: string[], key: 'businessUnitIds' | 'applicationIds') => (
    <div className="flex flex-wrap gap-1.5">
      {list.map(x => {
        const on = current.includes(x.id);
        return (
          <button
            key={x.id}
            onClick={() => onChange({ ...scope, [key]: on ? current.filter(i => i !== x.id) : [...current, x.id] })}
            className={`px-2 py-1 rounded text-[11px] border transition-colors ${
              on ? 'bg-teal/15 border-teal text-teal' : 'border-border text-muted-foreground hover:border-teal/50'
            }`}
          >
            {x.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium block mb-1.5">
          Tenant <span className="text-amber-400">*</span>
        </label>
        <select
          value={scope.tenantId}
          onChange={e => onChange({ ...scope, tenantId: e.target.value })}
          className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
        >
          {TENANTS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[11px] font-medium block mb-1.5">
          Business units <span className="text-muted-foreground font-normal">(none selected = all)</span>
        </label>
        {multi(BUSINESS_UNITS, scope.businessUnitIds, 'businessUnitIds')}
      </div>

      <div>
        <label className="text-[11px] font-medium block mb-1.5">
          Applications <span className="text-muted-foreground font-normal">(none selected = all)</span>
        </label>
        {multi(APPLICATIONS, scope.applicationIds, 'applicationIds')}
      </div>

      <div className="px-3 py-2 rounded bg-teal/10 border border-teal/30">
        <p className="text-[11px] text-teal">
          This binding covers approximately{' '}
          <span className="font-semibold">{scopedObjectCount(scope).toLocaleString()}</span> crypto objects.
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{describeScope(scope)}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main surface                                                        */
/* ------------------------------------------------------------------ */

type Modal =
  | { kind: 'none' }
  | { kind: 'editor'; mode: 'create' | 'clone' | 'edit' | 'view'; role: Role }
  | { kind: 'members'; role: Role }
  | { kind: 'assign'; role: Role }
  | { kind: 'delete'; role: Role }
  | { kind: 'effective'; principalId: string };

export default function RbacSection() {
  const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
  const [bindings, setBindings] = useState<Binding[]>(INITIAL_BINDINGS);
  const [modal, setModal] = useState<Modal>({ kind: 'none' });
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [q, setQ] = useState('');

  // The signed-in actor. In production this comes from the token introspection payload.
  const ACTOR = 'usr_alice';
  const actorPermissions = useMemo(
    () => new Set(effectivePermissions(ACTOR, bindings, roles).keys()),
    [bindings, roles],
  );

  const memberCount = (roleId: string) => bindings.filter(b => b.roleId === roleId).length;

  const visible = roles.filter(r =>
    (filter === 'all' || (filter === 'system') === r.isSystem) &&
    (!q.trim() || r.name.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase())));

  const openEditor = (mode: 'create' | 'clone' | 'edit' | 'view', source?: Role) => {
    if (mode === 'create') {
      setModal({ kind: 'editor', mode, role: { id: '', name: '', description: '', isSystem: false, permissions: [] } });
    } else if (mode === 'clone' && source) {
      setModal({ kind: 'editor', mode, role: { ...source, id: '', name: `Copy of ${source.name}`, isSystem: false } });
    } else if (source) {
      setModal({ kind: 'editor', mode, role: { ...source } });
    }
  };

  const saveRole = (draft: Role, mode: string) => {
    if (!draft.name.trim()) return toast.error('Role name is required');
    if (roles.some(r => r.name.toLowerCase() === draft.name.trim().toLowerCase() && r.id !== draft.id))
      return toast.error('A role with that name already exists');
    if (!draft.permissions.length) return toast.error('Select at least one permission');

    if (mode === 'edit') {
      setRoles(rs => rs.map(r => (r.id === draft.id ? draft : r)));
      const affected = memberCount(draft.id);
      toast.success(`${draft.name} updated. ${affected} user${affected === 1 ? '' : 's'} affected on next token refresh.`);
    } else {
      const id = `rol_custom_${Date.now()}`;
      setRoles(rs => [...rs, { ...draft, id, isSystem: false }]);
      toast.success(`${draft.name} created with ${draft.permissions.length} permissions`);
    }
    setModal({ kind: 'none' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {roles.length} roles · {new Set(bindings.map(b => b.principalId)).size} assigned users ·{' '}
            {bindings.length} bindings · {TOTAL_ATOMS} permissions in taxonomy
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Scope is a property of the assignment, not of the role. Use Members to bind a role to a tenant, business unit or application.
          </p>
        </div>
        <button
          onClick={() => openEditor('create')}
          disabled={!actorPermissions.has('platform.role:create')}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40 shrink-0"
        >
          <Plus className="w-3 h-3" /> Create Role
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search roles"
            className="w-full pl-8 pr-3 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
          />
        </div>
        <div className="flex rounded border border-border overflow-hidden">
          {(['all', 'system', 'custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] capitalize ${filter === f ? 'bg-teal text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Roles table */}
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              {['Role', 'Type', 'Members', 'Permissions', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{r.name}</span>
                    {r.isSystem && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-md">{r.description}</p>
                </td>
                <td className="px-4 py-3">
                  <Chip tone={r.isSystem ? 'muted' : 'teal'}>{r.isSystem ? 'System' : 'Custom'}</Chip>
                </td>
                <td className="px-4 py-3 text-xs font-medium">{memberCount(r.id)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{r.permissions.length}</span>
                    <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-teal" style={{ width: `${(r.permissions.length / TOTAL_ATOMS) * 100}%` }} />
                    </div>
                    {r.permissions.some(isSensitive) && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <IconBtn icon={Eye} label="View" onClick={() => openEditor('view', r)} />
                    <IconBtn icon={UsersIcon} label="Members" onClick={() => setModal({ kind: 'members', role: r })} />
                    <IconBtn icon={Copy} label="Clone" onClick={() => openEditor('clone', r)} />
                    <IconBtn
                      icon={Pencil} label="Edit"
                      disabled={r.isSystem}
                      title={r.isSystem ? 'System roles cannot be edited. Clone this role to customise it.' : undefined}
                      onClick={() => openEditor('edit', r)}
                    />
                    <IconBtn
                      icon={Trash2} label="Delete"
                      disabled={r.isSystem || memberCount(r.id) > 0}
                      title={
                        r.isSystem ? 'System roles cannot be deleted.'
                          : memberCount(r.id) > 0 ? `Assigned to ${memberCount(r.id)} users. Revoke first.`
                          : undefined
                      }
                      onClick={() => setModal({ kind: 'delete', role: r })}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-xs text-muted-foreground">No custom roles yet.</p>
                  <button onClick={() => openEditor('clone', SYSTEM_ROLES[4])} className="mt-2 text-[11px] text-teal hover:underline">
                    Clone a system role to get started
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Effective permissions entry point */}
      <div className="flex items-center justify-between px-4 py-3 rounded border border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal" />
          <div>
            <p className="text-xs font-medium">Effective permissions</p>
            <p className="text-[10px] text-muted-foreground">Answer the only question that matters: what can this user actually do?</p>
          </div>
        </div>
        <select
          onChange={e => e.target.value && setModal({ kind: 'effective', principalId: e.target.value })}
          value=""
          className="px-2 py-1.5 rounded bg-muted/40 border border-border text-[11px] outline-none focus:border-teal"
        >
          <option value="">Select a user…</option>
          {PRINCIPALS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {modal.kind === 'editor' && (
        <RoleEditor
          mode={modal.mode}
          initial={modal.role}
          actorPermissions={actorPermissions}
          existing={roles.find(r => r.id === modal.role.id)}
          memberCount={memberCount(modal.role.id)}
          onClose={() => setModal({ kind: 'none' })}
          onSave={saveRole}
        />
      )}

      {modal.kind === 'members' && (
        <MembersDrawer
          role={modal.role}
          bindings={bindings.filter(b => b.roleId === modal.role.id)}
          onAssign={() => setModal({ kind: 'assign', role: modal.role })}
          onRevoke={(id) => {
            const b = bindings.find(x => x.id === id)!;
            const lastAdmin = modal.role.id === 'rol_platform_admin'
              && bindings.filter(x => x.roleId === 'rol_platform_admin' && x.scope.tenantId === b.scope.tenantId).length === 1;
            if (lastAdmin) return toast.error('Cannot revoke the last Platform Administrator in this tenant.');
            setBindings(bs => bs.filter(x => x.id !== id));
            toast.success('Binding revoked. Effective on next token refresh.');
          }}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}

      {modal.kind === 'assign' && (
        <AssignDrawer
          role={modal.role}
          onClose={() => setModal({ kind: 'members', role: modal.role })}
          onCreate={(principalIds, scope) => {
            const created = principalIds.map((pid, i) => ({
              id: `bnd_${Date.now()}_${i}`,
              principalId: pid,
              principalName: PRINCIPALS.find(p => p.id === pid)!.name,
              roleId: modal.role.id,
              scope,
              grantedBy: PRINCIPALS.find(p => p.id === ACTOR)!.name,
              grantedOn: new Date().toISOString().slice(0, 10),
            }));
            setBindings(bs => [...bs, ...created]);
            toast.success(`${created.length} binding${created.length === 1 ? '' : 's'} created for ${modal.role.name}`);
            setModal({ kind: 'members', role: modal.role });
          }}
        />
      )}

      {modal.kind === 'delete' && (
        <DeleteDialog
          role={modal.role}
          onClose={() => setModal({ kind: 'none' })}
          onConfirm={() => {
            setRoles(rs => rs.filter(r => r.id !== modal.role.id));
            toast.success(`${modal.role.name} deleted`);
            setModal({ kind: 'none' });
          }}
        />
      )}

      {modal.kind === 'effective' && (
        <EffectiveDrawer
          principalId={modal.principalId}
          bindings={bindings}
          roles={roles}
          onClose={() => setModal({ kind: 'none' })}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Role editor                                                         */
/* ------------------------------------------------------------------ */

function RoleEditor({ mode, initial, actorPermissions, existing, memberCount, onClose, onSave }: {
  mode: 'create' | 'clone' | 'edit' | 'view';
  initial: Role;
  actorPermissions: Set<string>;
  existing?: Role;
  memberCount: number;
  onClose: () => void;
  onSave: (r: Role, mode: string) => void;
}) {
  const [draft, setDraft] = useState<Role>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.permissions));
  const [confirming, setConfirming] = useState(false);
  const readOnly = mode === 'view';

  const added = existing ? [...selected].filter(a => !existing.permissions.includes(a)) : [];
  const removed = existing ? existing.permissions.filter(a => !selected.has(a)) : [];

  const title = { create: 'Create role', clone: 'Clone role', edit: 'Edit role', view: initial.name }[mode];

  return (
    <Drawer
      wide
      title={title}
      subtitle={readOnly ? `${initial.permissions.length} permissions · ${initial.isSystem ? 'System role, immutable' : 'Custom role'}` : 'Scope is assigned separately, under Members.'}
      onClose={onClose}
      footer={readOnly ? (
        <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">Close</button>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {mode === 'edit' && `${added.length} added, ${removed.length} removed, ${memberCount} user${memberCount === 1 ? '' : 's'} affected`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">Cancel</button>
            <button
              onClick={() => (mode === 'edit' && !confirming ? setConfirming(true) : onSave({ ...draft, permissions: [...selected] }, mode))}
              disabled={!selected.size}
              className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
            >
              {mode === 'edit' && confirming ? 'Confirm changes' : mode === 'edit' ? 'Review changes' : 'Create role'}
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        {!readOnly && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1">Name</label>
              <input
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1">Description</label>
              <input
                value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
              />
            </div>
          </div>
        )}

        {confirming && (
          <div className="px-3 py-2 rounded bg-amber-500/10 border border-amber-500/30 space-y-1">
            <p className="text-[11px] text-amber-400 font-medium">Confirm permission diff</p>
            {added.map(a => <p key={a} className="text-[10px] font-mono text-teal">+ {a}</p>)}
            {removed.map(a => <p key={a} className="text-[10px] font-mono text-red-400">- {a}</p>)}
            {!added.length && !removed.length && <p className="text-[10px] text-muted-foreground">No permission changes.</p>}
          </div>
        )}

        {readOnly && initial.isSystem && (
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-muted/40 border border-border">
            <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              System roles cannot be edited or deleted. Clone this role to customise it.
            </p>
          </div>
        )}

        <PermissionMatrix
          selected={selected}
          onChange={setSelected}
          actorPermissions={actorPermissions}
          readOnly={readOnly}
        />
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Members and assignment                                              */
/* ------------------------------------------------------------------ */

function MembersDrawer({ role, bindings, onAssign, onRevoke, onClose }: {
  role: Role; bindings: Binding[];
  onAssign: () => void; onRevoke: (id: string) => void; onClose: () => void;
}) {
  return (
    <Drawer
      title={`Members of ${role.name}`}
      subtitle={`${bindings.length} binding${bindings.length === 1 ? '' : 's'}. Each binding pairs one principal with one scope.`}
      onClose={onClose}
      footer={
        <button onClick={onAssign} className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light">
          <Plus className="w-3 h-3" /> Assign members
        </button>
      }
    >
      <div className="space-y-2">
        {bindings.map(b => (
          <div key={b.id} className="flex items-start justify-between gap-3 px-3 py-2.5 rounded border border-border hover:border-teal/40">
            <div className="min-w-0">
              <p className="text-xs font-medium">{b.principalName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{describeScope(b.scope)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Granted by {b.grantedBy} on {b.grantedOn} · ~{scopedObjectCount(b.scope).toLocaleString()} crypto objects
              </p>
            </div>
            <button onClick={() => onRevoke(b.id)} className="text-[11px] text-red-400/80 hover:text-red-400 shrink-0">
              Revoke
            </button>
          </div>
        ))}
        {!bindings.length && (
          <p className="text-[11px] text-muted-foreground text-center py-8">
            No members. This role grants nothing until it is bound to a principal and a scope.
          </p>
        )}
      </div>
    </Drawer>
  );
}

function AssignDrawer({ role, onClose, onCreate }: {
  role: Role; onClose: () => void; onCreate: (principalIds: string[], scope: Scope) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>({ tenantId: TENANTS[0].id, businessUnitIds: [], applicationIds: [] });

  return (
    <Drawer
      title={`Assign ${role.name}`}
      subtitle="Choose principals, then choose the scope this role applies within."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" /> Back to members
          </button>
          <button
            onClick={() => onCreate(picked, scope)}
            disabled={!picked.length}
            className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
          >
            Create {picked.length || ''} binding{picked.length === 1 ? '' : 's'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="text-[11px] font-medium block mb-1.5">Principals</label>
          <div className="space-y-1">
            {PRINCIPALS.map(p => (
              <button
                key={p.id}
                onClick={() => setPicked(x => x.includes(p.id) ? x.filter(i => i !== p.id) : [...x, p.id])}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/30 text-left"
              >
                <TriBox state={picked.includes(p.id) ? 'on' : 'off'} onClick={() => {}} />
                <span className="text-[11px]">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <ScopePicker scope={scope} onChange={setScope} />
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Delete dialog                                                       */
/* ------------------------------------------------------------------ */

function DeleteDialog({ role, onClose, onConfirm }: { role: Role; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-[420px] rounded border border-border bg-background p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold">Delete {role.name}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          This removes {role.permissions.length} permissions and cannot be undone. Type the role name to confirm.
        </p>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={role.name}
          className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={typed !== role.name}
            className="px-3 py-1.5 rounded bg-red-500/90 text-white text-xs hover:bg-red-500 disabled:opacity-40"
          >
            Delete role
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Effective permissions                                               */
/* ------------------------------------------------------------------ */

function EffectiveDrawer({ principalId, bindings, roles, onClose }: {
  principalId: string; bindings: Binding[]; roles: Role[]; onClose: () => void;
}) {
  const principal = PRINCIPALS.find(p => p.id === principalId)!;
  const mine = bindings.filter(b => b.principalId === principalId);
  const eff = effectivePermissions(principalId, bindings, roles);
  const [q, setQ] = useState('');

  const entries = [...eff.entries()]
    .filter(([atom]) => !q.trim() || atom.includes(q.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <Drawer
      wide
      title={`What can ${principal.name} do?`}
      subtitle={`${eff.size} of ${TOTAL_ATOMS} permissions, from ${mine.length} binding${mine.length === 1 ? '' : 's'}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          {mine.map(b => (
            <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded bg-muted/30 border border-border">
              <div>
                <p className="text-[11px] font-medium">{roles.find(r => r.id === b.roleId)?.name}</p>
                <p className="text-[10px] text-muted-foreground">{describeScope(b.scope)}</p>
              </div>
              <Chip tone="teal">{roles.find(r => r.id === b.roleId)?.permissions.length} perms</Chip>
            </div>
          ))}
          {!mine.length && <p className="text-[11px] text-muted-foreground py-4 text-center">No bindings. This user can do nothing.</p>}
        </div>

        {!!eff.size && (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Filter effective permissions"
                className="w-full pl-8 pr-3 py-2 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
              />
            </div>
            <div className="border border-border rounded divide-y divide-border/40 max-h-[420px] overflow-y-auto">
              {entries.map(([atom, sources]) => (
                <div key={atom} className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSensitive(atom) && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className="text-[10px] font-mono truncate">{atom}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-3" title="Granted by">
                    via {sources.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
