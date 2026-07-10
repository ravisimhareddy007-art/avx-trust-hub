// src/components/core/RbacSection.tsx
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Pencil,
  Trash2,
  Users as UsersIcon,
  Search,
  X,
  ChevronRight,
  AlertTriangle,
  Lock,
  Check,
  Minus,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  User,
  Users2,
  Bot,
  Ban,
} from "lucide-react";
import {
  TAXONOMY,
  ACTIONS,
  ACTION_LABEL,
  ALL_ATOMS,
  TOTAL_ATOMS,
  SYSTEM_ROLES,
  INITIAL_BINDINGS,
  TENANTS,
  BUSINESS_UNITS,
  PRINCIPALS,
  PRINCIPAL_TYPE_LABEL,
  IDENTITY_RESOURCES,
  SSH_RESOURCES,
  CRYPTO_ASSET_RESOURCES,
  expandImplied,
  isSensitive,
  describeScope,
  scopedObjectCount,
  effectivePermissions,
  principalsWithAtom,
  canGrant,
  sodViolations,
  type Role,
  type Binding,
  type Scope,
  type Action,
  type Principal,
  type PrincipalType,
} from "@/data/rbac";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const Chip = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "teal" | "amber" }) => (
  <span
    className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
      tone === "teal"
        ? "bg-teal/15 text-teal"
        : tone === "amber"
          ? "bg-amber-500/15 text-amber-400"
          : "bg-muted text-muted-foreground"
    }`}
  >
    {children}
  </span>
);

/** Icon-only row action. The label lives in the tooltip, not on screen. */
const ActionBtn = ({
  icon: Icon,
  title,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ElementType;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
      disabled
        ? "text-muted-foreground/25 cursor-not-allowed"
        : danger
          ? "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

const ToolBtn = ({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-teal transition-colors whitespace-nowrap"
  >
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

const TriBox = ({
  state,
  onClick,
  disabled,
}: {
  state: "on" | "off" | "mixed";
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
      disabled
        ? "border-border/40 bg-muted/30 cursor-not-allowed"
        : state === "on"
          ? "bg-teal border-teal"
          : state === "mixed"
            ? "bg-teal/30 border-teal"
            : "border-border hover:border-teal"
    }`}
  >
    {state === "on" && <Check className="w-3 h-3 text-primary-foreground" />}
    {state === "mixed" && <Minus className="w-3 h-3 text-teal" />}
  </button>
);

const PRINCIPAL_ICON: Record<PrincipalType, React.ElementType> = {
  user: User,
  group: Users2,
  service_account: Bot,
};

const PrincipalRow = ({ p }: { p: Principal }) => {
  const Icon = PRINCIPAL_ICON[p.type];
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] truncate">{p.name}</span>
      <Chip>{PRINCIPAL_TYPE_LABEL[p.type]}</Chip>
      {p.source && p.source !== "local" && <Chip>{p.source}</Chip>}
    </div>
  );
};

const Drawer = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
    <div
      onClick={(e) => e.stopPropagation()}
      className={`h-full bg-background border-l border-border flex flex-col ${wide ? "w-[960px]" : "w-[580px]"} max-w-full`}
    >
      <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="border-t border-border px-5 py-3 shrink-0">{footer}</div>}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Permission matrix                                                   */
/* ------------------------------------------------------------------ */

const PRESETS: { label: string; resources: string[] }[] = [
  { label: "All identities", resources: IDENTITY_RESOURCES },
  { label: "SSH only", resources: SSH_RESOURCES },
  { label: "Crypto assets", resources: CRYPTO_ASSET_RESOURCES },
];

function PermissionMatrix({
  selected,
  onChange,
  actorPermissions,
  readOnly,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  actorPermissions: Set<string>;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(["inventory"]));
  const [q, setQ] = useState("");

  const canHold = (atom: string) => actorPermissions.has(atom);

  const toggleAtom = (atom: string) => {
    if (readOnly || !canHold(atom)) return;
    const next = new Set(selected);
    const [lhs, action] = atom.split(":");
    if (next.has(atom)) {
      next.delete(atom);
      if (action === "read") ALL_ATOMS.filter((a) => a.startsWith(`${lhs}:`)).forEach((a) => next.delete(a));
    } else {
      next.add(atom);
      expandImplied([atom])
        .filter(canHold)
        .forEach((a) => next.add(a));
    }
    onChange(next);
  };

  const bulk = (atoms: string[], turnOn: boolean) => {
    if (readOnly) return;
    const next = new Set(selected);
    const grantable = atoms.filter(canHold);
    if (turnOn)
      expandImplied(grantable)
        .filter(canHold)
        .forEach((a) => next.add(a));
    else grantable.forEach((a) => next.delete(a));
    onChange(next);
  };

  const stateOf = (atoms: string[]): "on" | "off" | "mixed" => {
    const grantable = atoms.filter(canHold);
    if (!grantable.length) return "off";
    const n = grantable.filter((a) => selected.has(a)).length;
    return n === 0 ? "off" : n === grantable.length ? "on" : "mixed";
  };

  const domains = useMemo(() => {
    if (!q.trim()) return TAXONOMY;
    const needle = q.toLowerCase();
    return TAXONOMY.map((d) => ({
      ...d,
      resources: d.resources.filter(
        (r) =>
          `${d.domain}.${r.resource}`.includes(needle) ||
          r.label.toLowerCase().includes(needle) ||
          d.label.toLowerCase().includes(needle),
      ),
    })).filter((d) => d.resources.length);
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter permissions, e.g. ssh, private_key, policy"
          className="w-full pl-8 pr-3 py-2 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
        />
      </div>

      <div className="border border-border rounded overflow-hidden">
        {domains.map((d) => {
          const domainAtoms = d.resources.flatMap((r) => r.actions.map((a) => `${d.domain}.${r.resource}:${a}`));
          const isOpen = open.has(d.domain) || !!q.trim();
          const st = stateOf(domainAtoms);
          let lastSection: string | undefined;

          return (
            <div key={d.domain} className="border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <TriBox state={st} disabled={readOnly} onClick={() => bulk(domainAtoms, st !== "on")} />
                <button
                  onClick={() =>
                    setOpen((p) => {
                      const n = new Set(p);
                      n.has(d.domain) ? n.delete(d.domain) : n.add(d.domain);
                      return n;
                    })
                  }
                  className="flex items-center gap-1.5 flex-1 text-left min-w-0"
                >
                  <ChevronRight
                    className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                  <span className="text-xs font-medium">{d.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{d.domain}</span>
                </button>

                {d.domain === "inventory" && isOpen && !readOnly && (
                  <div className="flex gap-1">
                    {PRESETS.map((p) => {
                      const atoms = p.resources.flatMap((r) =>
                        ALL_ATOMS.filter((a) => a.startsWith(`inventory.${r}:`)),
                      );
                      const on = stateOf(atoms) === "on";
                      return (
                        <button
                          key={p.label}
                          onClick={() => bulk(atoms, !on)}
                          className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                            on
                              ? "bg-teal/15 border-teal text-teal"
                              : "border-border text-muted-foreground hover:border-teal/50"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {domainAtoms.filter((a) => selected.has(a)).length}/{domainAtoms.length}
                </span>
              </div>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left px-3 py-1.5 text-[10px] font-medium text-muted-foreground w-[300px]">
                          Resource
                        </th>
                        {ACTIONS.map((a) => (
                          <th
                            key={a}
                            className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground text-center w-[62px]"
                          >
                            {ACTION_LABEL[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.resources.map((r) => {
                        const resourceAtoms = r.actions.map((a) => `${d.domain}.${r.resource}:${a}`);
                        const rSt = stateOf(resourceAtoms);
                        const showSection = r.section && r.section !== lastSection;
                        lastSection = r.section;

                        return (
                          <React.Fragment key={r.resource}>
                            {showSection && (
                              <tr className="bg-muted/10">
                                <td colSpan={ACTIONS.length + 1} className="px-3 py-1">
                                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                                    {r.section}
                                  </span>
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-border/30 last:border-b-0 hover:bg-muted/20">
                              <td className="px-3 py-1.5">
                                <div className="flex items-start gap-2">
                                  <div className="pt-0.5">
                                    <TriBox
                                      state={rSt}
                                      disabled={readOnly}
                                      onClick={() => bulk(resourceAtoms, rSt !== "on")}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] truncate">{r.label}</span>
                                      {r.sensitive && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground font-mono truncate">
                                      {d.domain}.{r.resource}
                                    </div>
                                    {r.note && (
                                      <div className="text-[9px] text-muted-foreground/60 mt-0.5 max-w-[280px]">
                                        {r.note}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {ACTIONS.map((a) => {
                                const legal = r.actions.includes(a);
                                if (!legal) return <td key={a} />;
                                const atom = `${d.domain}.${r.resource}:${a}`;
                                const blocked = !canHold(atom);
                                const impliedLock =
                                  a === "read" &&
                                  r.impliesRead !== false &&
                                  r.actions.some((x) => x !== "read" && selected.has(`${d.domain}.${r.resource}:${x}`));
                                return (
                                  <td key={a} className="px-2 py-1.5 text-center">
                                    <div
                                      className="inline-flex"
                                      title={
                                        blocked
                                          ? "You cannot grant a permission you do not hold"
                                          : impliedLock
                                            ? "Required by another selected action on this resource"
                                            : isSensitive(atom)
                                              ? `Sensitive: ${atom}`
                                              : atom
                                      }
                                    >
                                      <TriBox
                                        state={selected.has(atom) ? "on" : "off"}
                                        disabled={readOnly || blocked || impliedLock}
                                        onClick={() => toggleAtom(atom)}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
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
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium block mb-1.5">
          Tenant <span className="text-amber-400">*</span>
        </label>
        <select
          value={scope.tenantId}
          onChange={(e) => onChange({ ...scope, tenantId: e.target.value })}
          className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
        >
          {TENANTS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-medium block mb-1.5">
          Business units <span className="text-muted-foreground font-normal">(none selected = all)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_UNITS.map((bu) => {
            const on = scope.businessUnitIds.includes(bu.id);
            return (
              <button
                key={bu.id}
                onClick={() =>
                  onChange({
                    ...scope,
                    businessUnitIds: on
                      ? scope.businessUnitIds.filter((i) => i !== bu.id)
                      : [...scope.businessUnitIds, bu.id],
                  })
                }
                className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                  on ? "bg-teal/15 border-teal text-teal" : "border-border text-muted-foreground hover:border-teal/50"
                }`}
              >
                {bu.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-3 py-2 rounded bg-teal/10 border border-teal/30">
        <p className="text-[11px] text-teal">
          This binding covers approximately{" "}
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
  | { kind: "none" }
  | { kind: "editor"; mode: "create" | "clone" | "edit" | "view"; role: Role }
  | { kind: "members"; role: Role }
  | { kind: "assign"; role: Role }
  | { kind: "delete"; role: Role }
  | { kind: "effective"; principalId?: string }
  | { kind: "reverse" };

/** The signed-in actor. In production this arrives in the token introspection payload. */
const ACTOR = "usr_alice";

export default function RbacSection() {
  const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
  const [bindings, setBindings] = useState<Binding[]>(INITIAL_BINDINGS);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [filter, setFilter] = useState<"all" | "system" | "custom">("all");
  const [q, setQ] = useState("");

  const actorPermissions = useMemo(
    () => new Set(effectivePermissions(ACTOR, bindings, roles).keys()),
    [bindings, roles],
  );

  const memberCount = (roleId: string) => bindings.filter((b) => b.roleId === roleId).length;

  const visible = roles.filter(
    (r) =>
      (filter === "all" || (filter === "system") === r.isSystem) &&
      (!q.trim() ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description.toLowerCase().includes(q.toLowerCase())),
  );

  const openEditor = (mode: "create" | "clone" | "edit" | "view", source?: Role) => {
    if (mode === "create")
      setModal({ kind: "editor", mode, role: { id: "", name: "", description: "", isSystem: false, permissions: [] } });
    else if (mode === "clone" && source)
      setModal({ kind: "editor", mode, role: { ...source, id: "", name: `Copy of ${source.name}`, isSystem: false } });
    else if (source) setModal({ kind: "editor", mode, role: { ...source } });
  };

  const saveRole = (draft: Role, mode: string) => {
    if (!draft.name.trim()) return toast.error("Role name is required");
    if (roles.some((r) => r.name.toLowerCase() === draft.name.trim().toLowerCase() && r.id !== draft.id))
      return toast.error("A role with that name already exists");
    if (!draft.permissions.length) return toast.error("Select at least one permission");

    if (mode === "edit") {
      setRoles((rs) => rs.map((r) => (r.id === draft.id ? draft : r)));
      const n = memberCount(draft.id);
      toast.success(`${draft.name} updated. ${n} principal${n === 1 ? "" : "s"} affected on next token refresh.`);
    } else {
      setRoles((rs) => [...rs, { ...draft, id: `rol_custom_${Date.now()}`, isSystem: false }]);
      toast.success(`${draft.name} created with ${draft.permissions.length} permissions`);
    }
    setModal({ kind: "none" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {roles.length} roles · {new Set(bindings.map((b) => b.principalId)).size} principals · {bindings.length}{" "}
            bindings
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            Scope is a property of the binding, not of the role. Assign a role to a tenant and business units under
            Members.
          </p>
        </div>
        <button
          onClick={() => openEditor("create")}
          disabled={!actorPermissions.has("platform.role:create")}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40 shrink-0"
        >
          <Plus className="w-3 h-3" /> Create Role
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roles"
            className="w-full pl-8 pr-3 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
          />
        </div>
        <div className="flex rounded border border-border overflow-hidden">
          {(["all", "system", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] capitalize ${filter === f ? "bg-teal text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <ToolBtn icon={ShieldCheck} label="Effective permissions" onClick={() => setModal({ kind: "effective" })} />
        <ToolBtn icon={Search} label="Who can…" onClick={() => setModal({ kind: "reverse" })} />
      </div>

      {/* Roles */}
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground">Role</th>
              <th className="text-right px-4 py-2 text-[11px] font-medium text-muted-foreground w-24">Members</th>
              <th className="text-right px-4 py-2 text-[11px] font-medium text-muted-foreground w-32">Permissions</th>
              <th className="w-40" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const sod = sodViolations(r.permissions);
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditor("view", r)}
                        className="text-xs font-medium hover:text-teal transition-colors"
                      >
                        {r.name}
                      </button>
                      {r.isSystem && <Lock className="w-3 h-3 text-muted-foreground/60" />}
                      <Chip tone={r.isSystem ? "muted" : "teal"}>{r.isSystem ? "System" : "Custom"}</Chip>
                      {!!sod.length && (
                        <span
                          title={sod.map((p) => p.reason).join(" · ")}
                          className="flex items-center gap-1 text-red-400"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span className="text-[10px]">SoD</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 max-w-2xl" title={r.description}>
                      {r.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">{memberCount(r.id)}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    {r.permissions.length}
                    <span className="text-muted-foreground/50"> / {TOTAL_ATOMS}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <ActionBtn icon={Eye} title="View permissions" onClick={() => openEditor("view", r)} />
                      <ActionBtn
                        icon={UsersIcon}
                        title="Manage members"
                        onClick={() => setModal({ kind: "members", role: r })}
                      />
                      <ActionBtn icon={Copy} title="Clone into a custom role" onClick={() => openEditor("clone", r)} />
                      <ActionBtn
                        icon={Pencil}
                        disabled={r.isSystem}
                        title={r.isSystem ? "System roles cannot be edited. Clone to customise." : "Edit role"}
                        onClick={() => openEditor("edit", r)}
                      />
                      <ActionBtn
                        icon={Trash2}
                        danger
                        disabled={r.isSystem || memberCount(r.id) > 0}
                        title={
                          r.isSystem
                            ? "System roles cannot be deleted."
                            : memberCount(r.id) > 0
                              ? `Bound to ${memberCount(r.id)} principals. Revoke first.`
                              : "Delete role"
                        }
                        onClick={() => setModal({ kind: "delete", role: r })}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="text-xs text-muted-foreground">No custom roles yet.</p>
                  <button
                    onClick={() => openEditor("clone", roles[roles.length - 1])}
                    className="mt-2 text-[11px] text-teal hover:underline"
                  >
                    Clone a system role to get started
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.kind === "editor" && (
        <RoleEditor
          mode={modal.mode}
          initial={modal.role}
          actorPermissions={actorPermissions}
          existing={roles.find((r) => r.id === modal.role.id)}
          memberCount={memberCount(modal.role.id)}
          onClose={() => setModal({ kind: "none" })}
          onSave={saveRole}
        />
      )}

      {modal.kind === "members" && (
        <MembersDrawer
          role={modal.role}
          bindings={bindings.filter((b) => b.roleId === modal.role.id)}
          onAssign={() => setModal({ kind: "assign", role: modal.role })}
          onRevoke={(id) => {
            const b = bindings.find((x) => x.id === id)!;
            const lastAdmin =
              modal.role.id === "rol_platform_admin" &&
              bindings.filter((x) => x.roleId === "rol_platform_admin" && x.scope.tenantId === b.scope.tenantId)
                .length === 1;
            if (lastAdmin) return toast.error("Cannot revoke the last Platform Administrator in this tenant.");
            setBindings((bs) => bs.filter((x) => x.id !== id));
            toast.success("Binding revoked. Terminate active sessions to make it immediate.");
          }}
          onClose={() => setModal({ kind: "none" })}
        />
      )}

      {modal.kind === "assign" && (
        <AssignDrawer
          role={modal.role}
          bindings={bindings}
          roles={roles}
          onClose={() => setModal({ kind: "members", role: modal.role })}
          onCreate={(principalIds, scope) => {
            const created = principalIds.map((pid, i) => ({
              id: `bnd_${Date.now()}_${i}`,
              principalId: pid,
              principalName: PRINCIPALS.find((p) => p.id === pid)!.name,
              roleId: modal.role.id,
              scope,
              grantedBy: PRINCIPALS.find((p) => p.id === ACTOR)!.name,
              grantedOn: new Date().toISOString().slice(0, 10),
            }));
            setBindings((bs) => [...bs, ...created]);
            toast.success(`${created.length} binding${created.length === 1 ? "" : "s"} created for ${modal.role.name}`);
            setModal({ kind: "members", role: modal.role });
          }}
        />
      )}

      {modal.kind === "delete" && (
        <DeleteDialog
          role={modal.role}
          onClose={() => setModal({ kind: "none" })}
          onConfirm={() => {
            setRoles((rs) => rs.filter((r) => r.id !== modal.role.id));
            toast.success(`${modal.role.name} deleted`);
            setModal({ kind: "none" });
          }}
        />
      )}

      {modal.kind === "effective" && (
        <EffectiveDrawer
          initialPrincipalId={modal.principalId}
          bindings={bindings}
          roles={roles}
          onClose={() => setModal({ kind: "none" })}
        />
      )}

      {modal.kind === "reverse" && (
        <ReverseDrawer bindings={bindings} roles={roles} onClose={() => setModal({ kind: "none" })} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Role editor                                                         */
/* ------------------------------------------------------------------ */

function RoleEditor({
  mode,
  initial,
  actorPermissions,
  existing,
  memberCount,
  onClose,
  onSave,
}: {
  mode: "create" | "clone" | "edit" | "view";
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
  const readOnly = mode === "view";

  const added = existing ? [...selected].filter((a) => !existing.permissions.includes(a)) : [];
  const removed = existing ? existing.permissions.filter((a) => !selected.has(a)) : [];
  const sod = sodViolations(selected);
  const title = { create: "Create role", clone: "Clone role", edit: "Edit role", view: initial.name }[mode];

  return (
    <Drawer
      wide
      title={title}
      subtitle={
        readOnly
          ? `${initial.permissions.length} permissions · ${initial.isSystem ? "System role, immutable" : "Custom role"}`
          : "Scope is assigned separately, under Members."
      }
      onClose={onClose}
      footer={
        readOnly ? (
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">
            Close
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {mode === "edit" &&
                `${added.length} added, ${removed.length} removed, ${memberCount} principal${memberCount === 1 ? "" : "s"} affected`}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">
                Cancel
              </button>
              <button
                onClick={() =>
                  mode === "edit" && !confirming
                    ? setConfirming(true)
                    : onSave({ ...draft, permissions: [...selected] }, mode)
                }
                disabled={!selected.size}
                className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
              >
                {mode === "edit" && confirming ? "Confirm changes" : mode === "edit" ? "Review changes" : "Create role"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {!readOnly && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1">Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1">Description</label>
              <input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
              />
            </div>
          </div>
        )}

        {!!sod.length && (
          <div className="px-3 py-2 rounded bg-red-500/10 border border-red-500/30 space-y-1">
            <p className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Separation of duties: {sod.length} conflict{sod.length === 1 ? "" : "s"}
            </p>
            {sod.map((p) => (
              <p key={p.a + p.b} className="text-[10px] text-muted-foreground">
                <span className="font-mono text-red-400/80">{p.a}</span> +{" "}
                <span className="font-mono text-red-400/80">{p.b}</span> — {p.reason}
              </p>
            ))}
            <p className="text-[10px] text-muted-foreground/70 pt-0.5">
              This role can be saved. The conflict is recorded in the audit log.
            </p>
          </div>
        )}

        {confirming && (
          <div className="px-3 py-2 rounded bg-amber-500/10 border border-amber-500/30 space-y-1 max-h-48 overflow-y-auto">
            <p className="text-[11px] text-amber-400 font-medium">Confirm permission diff</p>
            {added.map((a) => (
              <p key={a} className="text-[10px] font-mono text-teal">
                + {a}
              </p>
            ))}
            {removed.map((a) => (
              <p key={a} className="text-[10px] font-mono text-red-400">
                - {a}
              </p>
            ))}
            {!added.length && !removed.length && (
              <p className="text-[10px] text-muted-foreground">No permission changes.</p>
            )}
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

function MembersDrawer({
  role,
  bindings,
  onAssign,
  onRevoke,
  onClose,
}: {
  role: Role;
  bindings: Binding[];
  onAssign: () => void;
  onRevoke: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = bindings.filter((b) => !q.trim() || b.principalName.toLowerCase().includes(q.toLowerCase()));

  return (
    <Drawer
      title={`Members of ${role.name}`}
      subtitle={`${bindings.length} binding${bindings.length === 1 ? "" : "s"}. Each pairs one principal with one scope.`}
      onClose={onClose}
      footer={
        <button
          onClick={onAssign}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light"
        >
          <Plus className="w-3 h-3" /> Assign members
        </button>
      }
    >
      <div className="space-y-3">
        {bindings.length > 6 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter members"
              className="w-full pl-8 pr-3 py-2 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
            />
          </div>
        )}
        <div className="space-y-2">
          {shown.map((b) => {
            const p = PRINCIPALS.find((x) => x.id === b.principalId);
            return (
              <div
                key={b.id}
                className="flex items-start justify-between gap-3 px-3 py-2.5 rounded border border-border hover:border-teal/40"
              >
                <div className="min-w-0">
                  {p ? <PrincipalRow p={p} /> : <p className="text-xs">{b.principalName}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{describeScope(b.scope)}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Granted by {b.grantedBy} on {b.grantedOn} · ~{scopedObjectCount(b.scope).toLocaleString()} crypto
                    objects
                  </p>
                  {p?.type === "group" && (
                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                      Membership is held in {p.source}. AVX resolves it from group claims at sign-in.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onRevoke(b.id)}
                  className="text-[11px] text-red-400/80 hover:text-red-400 shrink-0"
                >
                  Revoke
                </button>
              </div>
            );
          })}
          {!bindings.length && (
            <p className="text-[11px] text-muted-foreground text-center py-8">
              No members. This role grants nothing until it is bound to a principal and a scope.
            </p>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function AssignDrawer({
  role,
  bindings,
  roles,
  onClose,
  onCreate,
}: {
  role: Role;
  bindings: Binding[];
  roles: Role[];
  onClose: () => void;
  onCreate: (principalIds: string[], scope: Scope) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>({ tenantId: TENANTS[0].id, businessUnitIds: [] });
  const guard = canGrant(ACTOR, role, scope, bindings, roles);

  return (
    <Drawer
      title={`Assign ${role.name}`}
      subtitle="Choose principals, then choose the scope this role applies within."
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {!guard.ok && (
            <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-red-500/10 border border-red-500/30">
              <Ban className="w-3.5 h-3.5 text-red-400 mt-px shrink-0" />
              <p className="text-[10px] text-red-400">{guard.reason}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3 h-3" /> Back to members
            </button>
            <button
              onClick={() => onCreate(picked, scope)}
              disabled={!picked.length || !guard.ok}
              className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
            >
              Create {picked.length || ""} binding{picked.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="text-[11px] font-medium block mb-1.5">Principals</label>
          <div className="space-y-0.5">
            {(["user", "group", "service_account"] as PrincipalType[]).map((t) => (
              <React.Fragment key={t}>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 pt-2 pb-1">
                  {PRINCIPAL_TYPE_LABEL[t]}s
                </p>
                {PRINCIPALS.filter((p) => p.type === t).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/30 text-left"
                  >
                    <TriBox state={picked.includes(p.id) ? "on" : "off"} onClick={() => {}} />
                    <PrincipalRow p={p} />
                  </button>
                ))}
              </React.Fragment>
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
/* Delete                                                              */
/* ------------------------------------------------------------------ */

function DeleteDialog({ role, onClose, onConfirm }: { role: Role; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] rounded border border-border bg-background p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold">Delete {role.name}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          This removes {role.permissions.length} permissions and cannot be undone. Type the role name to confirm.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={role.name}
          className="w-full px-2 py-1.5 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">
            Cancel
          </button>
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
/* Effective permissions (forward)                                     */
/* ------------------------------------------------------------------ */

function EffectiveDrawer({
  initialPrincipalId,
  bindings,
  roles,
  onClose,
}: {
  initialPrincipalId?: string;
  bindings: Binding[];
  roles: Role[];
  onClose: () => void;
}) {
  const [principalId, setPrincipalId] = useState<string | undefined>(initialPrincipalId);
  const [q, setQ] = useState("");

  if (!principalId) {
    return (
      <Drawer
        title="Effective permissions"
        subtitle="Pick a principal to see everything they can actually do."
        onClose={onClose}
      >
        <div className="space-y-0.5">
          {(["user", "group", "service_account"] as PrincipalType[]).map((t) => (
            <React.Fragment key={t}>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 pt-3 pb-1">
                {PRINCIPAL_TYPE_LABEL[t]}s
              </p>
              {PRINCIPALS.filter((p) => p.type === t).map((p) => {
                const n = bindings.filter((b) => b.principalId === p.id).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPrincipalId(p.id)}
                    className="flex items-center justify-between gap-3 w-full px-2 py-2 rounded hover:bg-muted/40 text-left"
                  >
                    <PrincipalRow p={p} />
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {n} binding{n === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </Drawer>
    );
  }

  const principal = PRINCIPALS.find((p) => p.id === principalId)!;
  const mine = bindings.filter((b) => b.principalId === principalId);
  const eff = effectivePermissions(principalId, bindings, roles);
  const entries = [...eff.entries()]
    .filter(([atom]) => !q.trim() || atom.includes(q.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <Drawer
      wide
      title={principal.name}
      subtitle={`${eff.size} of ${TOTAL_ATOMS} permissions, from ${mine.length} binding${mine.length === 1 ? "" : "s"}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {!initialPrincipalId && (
          <button
            onClick={() => setPrincipalId(undefined)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" /> All principals
          </button>
        )}

        {principal.type === "group" && (
          <p className="px-3 py-2 rounded bg-muted/30 border border-border text-[10px] text-muted-foreground">
            Group principal. AVX does not hold its membership. These permissions apply to whoever presents this group
            claim from {principal.source} at sign-in.
          </p>
        )}

        <div className="space-y-1.5">
          {mine.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-3 py-2 rounded bg-muted/30 border border-border"
            >
              <div>
                <p className="text-[11px] font-medium">{roles.find((r) => r.id === b.roleId)?.name}</p>
                <p className="text-[10px] text-muted-foreground">{describeScope(b.scope)}</p>
              </div>
              <Chip tone="teal">{roles.find((r) => r.id === b.roleId)?.permissions.length} perms</Chip>
            </div>
          ))}
          {!mine.length && (
            <p className="text-[11px] text-muted-foreground py-4 text-center">
              No bindings. This principal can do nothing.
            </p>
          )}
        </div>

        {!!eff.size && (
          <>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter effective permissions"
                className="w-full pl-8 pr-3 py-2 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
              />
            </div>
            <div className="border border-border rounded divide-y divide-border/40 max-h-[440px] overflow-y-auto">
              {entries.map(([atom, sources]) => (
                <div key={atom} className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSensitive(atom) && <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className="text-[10px] font-mono truncate">{atom}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-3">via {sources.join(", ")}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Reverse lookup                                                      */
/* ------------------------------------------------------------------ */

const SUGGESTED_ATOMS = [
  "inventory.private_key_material:export",
  "inventory.private_key_material:read",
  "integration.credential:read",
  "platform.role:grant",
  "policy.exception:approve",
  "platform.tenant:delete",
];

function ReverseDrawer({ bindings, roles, onClose }: { bindings: Binding[]; roles: Role[]; onClose: () => void }) {
  const [atom, setAtom] = useState(SUGGESTED_ATOMS[0]);
  const [q, setQ] = useState("");
  const matches = principalsWithAtom(atom, bindings, roles);
  const options = q.trim() ? ALL_ATOMS.filter((a) => a.includes(q.toLowerCase())).slice(0, 40) : [];

  return (
    <Drawer wide title="Who can do this?" subtitle="The question an auditor actually asks." onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_ATOMS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAtom(a);
                setQ("");
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                atom === a
                  ? "bg-teal/15 border-teal text-teal"
                  : "border-border text-muted-foreground hover:border-teal/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Or search any of the ${TOTAL_ATOMS} permissions`}
            className="w-full pl-8 pr-3 py-2 rounded bg-muted/40 border border-border text-xs outline-none focus:border-teal"
          />
          {!!options.length && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-border bg-background">
              {options.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAtom(a);
                    setQ("");
                  }}
                  className="block w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-muted/40"
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-2 rounded bg-muted/30 border border-border">
          <p className="text-[11px]">
            <span className="font-mono text-teal">{atom}</span> is held by{" "}
            <span className="font-semibold">{matches.length}</span> binding{matches.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="border border-border rounded divide-y divide-border/40">
          {matches.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
              <PrincipalRow p={m.principal} />
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground">via {m.via}</p>
                <p className="text-[10px] text-muted-foreground/60">{describeScope(m.scope)}</p>
              </div>
            </div>
          ))}
          {!matches.length && (
            <p className="text-[11px] text-muted-foreground text-center py-8">Nobody holds this permission.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
