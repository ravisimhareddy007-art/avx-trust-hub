// src/components/core/IntentAccessComposer.tsx
// Intent-based access provisioning.
//
// The admin states an outcome in one sentence -- WHO can do WHAT on WHICH objects,
// in WHICH asset group and environment -- and compileIntent() turns it into concrete
// atoms against the same taxonomy the matrix uses. Nobody hand-picks 154 checkboxes,
// and nobody enumerates objects: the scope resolves through the dynamic asset groups
// to a live object set. This is the path that scales to hundreds of users and
// millions of records. The raw matrix stays as the advanced fallback.

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Users2, User, Bot, ShieldAlert, AlertTriangle, Check, Layers, Boxes, Info } from "lucide-react";
import {
  PRINCIPALS,
  CAPABILITIES,
  REMEDIABLE_CERTS,
  REMEDIABLE_KEYS,
  REMEDIABLE_SECRETS,
  ASSET_GROUPS,
  ENVIRONMENTS,
  TENANTS,
  TAXONOMY,
  compileIntent,
  principalReach,
  type IntentDraft,
  type Scope,
  type Role,
  type Binding,
  type Environment,
  type Capability,
} from "@/data/rbac";

const RESOURCE_LABEL: Record<string, string> = Object.fromEntries(
  TAXONOMY.find((d) => d.domain === "inventory")!.resources.map((r) => [r.resource, r.label]),
);

const RESOURCE_GROUPS: { label: string; resources: string[] }[] = [
  { label: "Certificates", resources: REMEDIABLE_CERTS },
  { label: "Keys", resources: REMEDIABLE_KEYS },
  { label: "Secrets", resources: REMEDIABLE_SECRETS },
];

const principalIcon = (type: string) => (type === "group" ? Users2 : type === "service_account" ? Bot : User);

const nf = new Intl.NumberFormat("en-US");

/* ------------------------------------------------------------------ */

const Pill = ({
  active,
  danger,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors whitespace-nowrap ${
      active
        ? danger
          ? "bg-red-500/15 border-red-500/40 text-red-300"
          : "bg-teal/15 border-teal/50 text-teal"
        : "border-border text-muted-foreground hover:text-foreground hover:border-teal/40"
    }`}
  >
    {children}
  </button>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
  </div>
);

/* ------------------------------------------------------------------ */

export default function IntentAccessComposer({
  onClose,
  onGrant,
}: {
  onClose: () => void;
  onGrant: (role: Role, binding: Binding) => void;
}) {
  const groupPrincipals = useMemo(() => PRINCIPALS.filter((p) => p.type === "group"), []);

  const [principalId, setPrincipalId] = useState<string | undefined>(groupPrincipals[0]?.id);
  const [capabilityIds, setCapabilityIds] = useState<string[]>(["cap_view", "cap_remediate"]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([...REMEDIABLE_CERTS]);
  const [assetGroupIds, setAssetGroupIds] = useState<string[]>(["ag_pay_nonprod"]);
  const [environments, setEnvironments] = useState<Environment[]>(["non_production"]);

  const scope: Scope = {
    tenantId: TENANTS[0].id,
    businessUnitIds: [],
    environments,
    assetGroupIds,
  };
  const draft: IntentDraft = { principalId, capabilityIds, resourceTypes, scope };
  const compiled = useMemo(() => compileIntent(draft), [principalId, capabilityIds, resourceTypes, assetGroupIds, environments]);

  const principal = PRINCIPALS.find((p) => p.id === principalId);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const toggleCap = (c: Capability) => {
    // Selecting an object type set that has no cert removes revoke, which is cert-only.
    toggle(capabilityIds, c.id, setCapabilityIds);
  };

  const grant = () => {
    if (!principal) return;
    const role: Role = {
      id: `rol_intent_${Date.now()}`,
      name: compiled.roleName,
      description: `Compiled from intent: ${principal.name} can ${CAPABILITIES.filter((c) => capabilityIds.includes(c.id))
        .map((c) => c.phrase)
        .join(", ")} ${resourceTypes.map((r) => RESOURCE_LABEL[r]).join(", ")}.`,
      isSystem: false,
      permissions: compiled.atoms,
    };
    const binding: Binding = {
      id: `bnd_intent_${Date.now()}`,
      principalId: principal.id,
      principalName: principal.name,
      roleId: role.id,
      scope,
      grantedBy: "you (intent composer)",
      grantedOn: new Date().toISOString().slice(0, 10),
    };
    onGrant(role, binding);
    toast.success(`Access granted to ${principal.name} across ${nf.format(compiled.objectCount)} objects`);
    onClose();
  };

  const PrincipalIcon = principalIcon(principal?.type ?? "group");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-[980px] max-w-full bg-background border-l border-border flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold">Grant access by intent</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Describe the outcome. It compiles to permissions on the live object set. No matrix, no object lists.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left: the sentence */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 border-r border-border">
            {/* Sentence line */}
            <div className="text-[13px] leading-7 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 text-foreground">
                <PrincipalIcon className="w-3.5 h-3.5 text-teal" />
                {principal?.name ?? "Select a group"}
              </span>{" "}
              can{" "}
              <span className="text-teal font-medium">
                {CAPABILITIES.filter((c) => capabilityIds.includes(c.id))
                  .map((c) => c.phrase)
                  .join(", ") || "…"}
              </span>{" "}
              <span className="text-foreground">
                {resourceTypes.length === 0
                  ? "…"
                  : resourceTypes.length <= 2
                    ? resourceTypes.map((r) => RESOURCE_LABEL[r]).join(" and ")
                    : `${resourceTypes.length} object types`}
              </span>{" "}
              in{" "}
              <span className="text-foreground">
                {assetGroupIds.length === 1
                  ? ASSET_GROUPS.find((g) => g.id === assetGroupIds[0])?.name
                  : assetGroupIds.length === 0
                    ? "any asset group"
                    : `${assetGroupIds.length} asset groups`}
              </span>{" "}
              (
              <span className="text-foreground">
                {environments.length === ENVIRONMENTS.length || environments.length === 0
                  ? "all environments"
                  : environments.map((e) => ENVIRONMENTS.find((x) => x.id === e)?.label).join(" + ")}
              </span>
              ).
            </div>

            {/* Who */}
            <section>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Who</p>
              <div className="flex flex-wrap gap-1.5">
                {groupPrincipals.map((p) => (
                  <Pill key={p.id} active={principalId === p.id} onClick={() => setPrincipalId(p.id)}>
                    {p.name}{" "}
                    <span className="opacity-60">· {principalReach(p.id)} users</span>
                  </Pill>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                Groups sync from the IdP. Membership changes flow in automatically; you never re-grant per person.
              </p>
            </section>

            {/* What */}
            <section>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Can do</p>
              <div className="space-y-1.5">
                {CAPABILITIES.map((c) => {
                  const active = capabilityIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCap(c)}
                      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded border text-left transition-colors ${
                        active
                          ? c.destructive
                            ? "border-red-500/40 bg-red-500/5"
                            : "border-teal/50 bg-teal/5"
                          : "border-border hover:border-teal/30"
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          active ? (c.destructive ? "bg-red-500/80" : "bg-teal") : "border border-border"
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-primary-foreground" />}
                      </span>
                      <span className="min-w-0">
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          {c.label}
                          {c.destructive && (
                            <span className="text-[9px] px-1 py-px rounded bg-red-500/15 text-red-300">destructive</span>
                          )}
                          {c.isApprover && (
                            <span className="text-[9px] px-1 py-px rounded bg-amber/15 text-amber">checker</span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground block leading-snug">{c.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* On which objects */}
            <section>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">On object types</p>
              <div className="space-y-2">
                {RESOURCE_GROUPS.map((g) => {
                  const allOn = g.resources.every((r) => resourceTypes.includes(r));
                  return (
                    <div key={g.label} className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() =>
                          setResourceTypes(
                            allOn
                              ? resourceTypes.filter((r) => !g.resources.includes(r))
                              : [...new Set([...resourceTypes, ...g.resources])],
                          )
                        }
                        className={`text-[10px] w-20 text-left ${allOn ? "text-teal" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {g.label}
                      </button>
                      {g.resources.map((r) => (
                        <Pill key={r} active={resourceTypes.includes(r)} onClick={() => toggle(resourceTypes, r, setResourceTypes)}>
                          {RESOURCE_LABEL[r]}
                        </Pill>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Where: asset groups */}
            <section>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                In asset group(s)
              </p>
              <div className="space-y-1.5">
                {ASSET_GROUPS.map((g) => {
                  const active = assetGroupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggle(assetGroupIds, g.id, setAssetGroupIds)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded border text-left transition-colors ${
                        active ? "border-teal/50 bg-teal/5" : "border-border hover:border-teal/30"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          {g.name}
                          <span
                            className={`text-[9px] px-1 py-px rounded ${
                              g.environment === "production" ? "bg-amber/15 text-amber" : "bg-teal/15 text-teal"
                            }`}
                          >
                            {ENVIRONMENTS.find((e) => e.id === g.environment)?.label}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-mono">{g.condition}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground text-right shrink-0 tabular-nums">
                        {nf.format(g.assetCount)} assets
                        <br />
                        {nf.format(g.objectCount)} objects
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="text-[10px] text-muted-foreground mr-1">Environment</span>
                {ENVIRONMENTS.map((e) => (
                  <Pill
                    key={e.id}
                    active={environments.includes(e.id)}
                    danger={e.id === "production"}
                    onClick={() => toggle(environments, e.id, setEnvironments)}
                  >
                    {e.label}
                  </Pill>
                ))}
              </div>
            </section>
          </div>

          {/* Right: live preview */}
          <div className="w-[340px] shrink-0 overflow-y-auto bg-muted/20 px-5 py-5 space-y-5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Compiled grant</p>
              <p className="text-sm font-semibold mt-0.5 leading-snug">{compiled.roleName}</p>
            </div>

            {/* Scale line: the whole point */}
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                One intent moves{" "}
                <span className="text-teal font-semibold">{nf.format(compiled.usersAffected)} users</span> across{" "}
                <span className="text-teal font-semibold">{nf.format(compiled.objectCount)} objects</span> on{" "}
                {nf.format(compiled.assetCount)} assets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Stat value={nf.format(compiled.atoms.length)} label="permissions" />
              <Stat value={nf.format(compiled.usersAffected)} label="users affected" />
              <Stat value={nf.format(compiled.assetCount)} label="assets in scope" />
              <Stat value={nf.format(compiled.objectCount)} label="objects covered" />
            </div>

            {compiled.sharedObjectCount > 0 && (
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <Layers className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>
                  {nf.format(compiled.sharedObjectCount)} of these are multi-homed (also on assets outside this group).
                </span>
              </div>
            )}

            {/* Warnings and SoD */}
            {compiled.warnings.length > 0 && (
              <div className="space-y-1.5">
                {compiled.warnings.map((w, i) => {
                  const isSod = compiled.sod.some((p) => w.includes(p.reason));
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 px-2.5 py-2 rounded text-[10px] leading-snug ${
                        isSod ? "bg-red-500/10 text-red-300" : "bg-amber/10 text-amber"
                      }`}
                    >
                      {isSod ? (
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                      )}
                      <span>{w}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Atoms preview */}
            <details className="text-[10px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> {compiled.atoms.length} atoms this compiles to
              </summary>
              <div className="mt-2 flex flex-wrap gap-1">
                {compiled.atoms.map((a) => (
                  <code key={a} className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono text-[9px]">
                    {a}
                  </code>
                ))}
              </div>
            </details>

            {!compiled.ok && compiled.sod.length === 0 && (
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>Pick a group, at least one capability, and at least one object type to grant.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Compiles to atoms in the same taxonomy the matrix uses. Auditable, not a shortcut.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded border border-border text-xs hover:border-teal">
              Cancel
            </button>
            <button
              onClick={grant}
              disabled={!compiled.ok}
              title={compiled.sod.length ? "Resolve the separation-of-duties conflict first" : undefined}
              className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
            >
              Grant access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
