// src/components/core/IntentAccessComposer.tsx
// Guided access provisioning. Jobs-to-be-done, not a repository.
//
// Step 1  Pick the JOB: a small, recommended shortlist of access patterns
//         (or start from an existing role). No 154-cell matrix, no capability
//         soup up front.
// Step 2  REVIEW what it grants in plain English, and set the per-grant scope
//         (which asset group, which environment). Granular capability and
//         object-type tuning is collapsed under Advanced. Most admins never open it.
// Step 3  APPLY to one or more IdP groups and grant.
//
// A persistent preview rail shows the compiled effect the whole way through,
// so the admin always sees who and how many objects a grant moves.

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Users2,
  Check,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  AlertTriangle,
  Layers,
  Boxes,
  Wrench,
  Eye,
  Stamp,
  Ticket,
  ShieldCheck,
  Copy,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  PRINCIPALS,
  CAPABILITIES,
  ACCESS_PATTERNS,
  REMEDIABLE_CERTS,
  REMEDIABLE_KEYS,
  REMEDIABLE_SECRETS,
  ASSET_GROUPS,
  ENVIRONMENTS,
  TENANTS,
  TAXONOMY,
  SYSTEM_ROLES,
  atomsForCapabilities,
  evaluateGrant,
  principalReach,
  type Scope,
  type Role,
  type Binding,
  type Environment,
  type AccessPattern,
} from "@/data/rbac";

const RESOURCE_LABEL: Record<string, string> = Object.fromEntries(
  TAXONOMY.find((d) => d.domain === "inventory")!.resources.map((r) => [r.resource, r.label]),
);
const RESOURCE_GROUPS = [
  { label: "Certificates", resources: REMEDIABLE_CERTS },
  { label: "Keys", resources: REMEDIABLE_KEYS },
  { label: "Secrets", resources: REMEDIABLE_SECRETS },
];
const PATTERN_ICON: Record<string, React.ElementType> = {
  pat_remediation_operator: Wrench,
  pat_revocation_approver: Stamp,
  pat_estate_viewer: Eye,
  pat_full_remediation: ShieldAlert,
  pat_ticket_requestor: Ticket,
};
const nf = new Intl.NumberFormat("en-US");
const groupPrincipals = PRINCIPALS.filter((p) => p.type === "group");

type Mode = "pattern" | "reference" | "custom";

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

const StepDot = ({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <span
      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
        done
          ? "bg-teal text-primary-foreground"
          : active
            ? "border border-teal text-teal"
            : "border border-border text-muted-foreground"
      }`}
    >
      {done ? <Check className="w-3 h-3" /> : n}
    </span>
    <span className={`text-[11px] ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

/* ------------------------------------------------------------------ */

export default function IntentAccessComposer({
  onClose,
  onGrant,
}: {
  onClose: () => void;
  onGrant: (role: Role, bindings: Binding[]) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode>("pattern");
  const [patternId, setPatternId] = useState<string | undefined>();
  const [referenceRoleId, setReferenceRoleId] = useState<string | undefined>();

  // Filled from the chosen pattern; editable only under Advanced.
  const [capabilityIds, setCapabilityIds] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>(["non_production"]);
  const [assetGroupIds, setAssetGroupIds] = useState<string[]>([]);
  const [advanced, setAdvanced] = useState(false);

  // Step 3
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const applyPattern = (p: AccessPattern) => {
    setMode("pattern");
    setPatternId(p.id);
    setReferenceRoleId(undefined);
    setCapabilityIds(p.capabilityIds);
    setResourceTypes(p.resourceTypes);
    setEnvironments(p.defaultEnvironment);
    setAdvanced(false);
    setStep(2);
  };
  const applyReference = (roleId: string) => {
    setMode("reference");
    setReferenceRoleId(roleId);
    setPatternId(undefined);
    setEnvironments(["non_production"]);
    setStep(2);
  };
  const applyCustom = () => {
    setMode("custom");
    setPatternId(undefined);
    setReferenceRoleId(undefined);
    setCapabilityIds(["cap_view"]);
    setResourceTypes([...REMEDIABLE_CERTS]);
    setEnvironments(["non_production"]);
    setAdvanced(true);
    setStep(2);
  };

  const referenceRole = SYSTEM_ROLES.find((r) => r.id === referenceRoleId);
  const pattern = ACCESS_PATTERNS.find((p) => p.id === patternId);

  const scope: Scope = { tenantId: TENANTS[0].id, businessUnitIds: [], environments, assetGroupIds };

  const atoms = useMemo(
    () =>
      mode === "reference" && referenceRole
        ? referenceRole.permissions
        : atomsForCapabilities(capabilityIds, resourceTypes),
    [mode, referenceRole, capabilityIds, resourceTypes],
  );

  const evalr = useMemo(
    () => evaluateGrant(atoms, scope, selectedGroupIds),
    [atoms, environments, assetGroupIds, selectedGroupIds],
  );

  // Plain-English description of the grant.
  const grantVerbs =
    mode === "reference"
      ? `mirror the ${referenceRole?.name} role`
      : CAPABILITIES.filter((c) => capabilityIds.includes(c.id))
          .map((c) => c.phrase)
          .join(", ");
  const objectSummary =
    mode === "reference"
      ? `${atoms.length} permissions`
      : resourceTypes.length <= 3
        ? resourceTypes.map((r) => RESOURCE_LABEL[r]).join(", ")
        : `${resourceTypes.length} object types`;

  const title = pattern?.name ?? referenceRole?.name ?? "Custom access";

  const grant = () => {
    const groups = groupPrincipals.filter((g) => selectedGroupIds.includes(g.id));
    if (!groups.length) return;
    const role: Role = {
      id: `rol_grant_${Date.now()}`,
      name: title,
      description: `${title}. Can ${grantVerbs} ${objectSummary}.`,
      isSystem: false,
      permissions: atoms,
    };
    const bindings: Binding[] = groups.map((g, i) => ({
      id: `bnd_grant_${Date.now()}_${i}`,
      principalId: g.id,
      principalName: g.name,
      roleId: role.id,
      scope,
      grantedBy: "you (access composer)",
      grantedOn: new Date().toISOString().slice(0, 10),
    }));
    onGrant(role, bindings);
    toast.success(
      `${title} granted to ${groups.length} group${groups.length === 1 ? "" : "s"} across ${nf.format(evalr.objectCount)} objects`,
    );
    onClose();
  };

  const canNext = step === 2 && atoms.length > 0 && assetGroupIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-[1000px] max-w-full bg-background border-l border-border flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold">Set up access</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Start from what the team needs to do. We recommend the pattern and compile the permissions.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border shrink-0">
          <StepDot n={1} active={step === 1} done={step > 1} label="Access pattern" />
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <StepDot n={2} active={step === 2} done={step > 2} label="Review & scope" />
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
          <StepDot n={3} active={step === 3} done={false} label="Apply to groups" />
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Main pane */}
          <div className="flex-1 overflow-y-auto px-5 py-5 border-r border-border">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal" /> Recommended
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCESS_PATTERNS.filter((p) => p.common).map((p) => {
                      const Icon = PATTERN_ICON[p.id] ?? ShieldCheck;
                      return (
                        <button
                          key={p.id}
                          onClick={() => applyPattern(p)}
                          className="text-left p-3 rounded-lg border border-border hover:border-teal/60 hover:bg-teal/5 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-teal shrink-0" />
                            <span className="text-xs font-medium">{p.name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{p.purpose}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1.5">For {p.recommendedFor}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    More patterns
                  </p>
                  <div className="space-y-1.5">
                    {ACCESS_PATTERNS.filter((p) => !p.common).map((p) => {
                      const Icon = PATTERN_ICON[p.id] ?? ShieldCheck;
                      return (
                        <button
                          key={p.id}
                          onClick={() => applyPattern(p)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-teal/60 hover:bg-teal/5 transition-colors text-left"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="min-w-0">
                            <span className="text-xs font-medium">{p.name}</span>
                            <span className="text-[11px] text-muted-foreground block leading-snug">{p.purpose}</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1 border-t border-border">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide my-2">
                    Or start from an existing role
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SYSTEM_ROLES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => applyReference(r.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border border-border text-muted-foreground hover:text-foreground hover:border-teal/40"
                      >
                        <Copy className="w-3 h-3" /> {r.name}
                      </button>
                    ))}
                    <button
                      onClick={applyCustom}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-teal/40"
                    >
                      <SlidersHorizontal className="w-3 h-3" /> Build custom
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Plain-English summary */}
                <div className="p-3 rounded-lg border border-teal/30 bg-teal/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">This grants</p>
                  <p className="text-[13px] leading-relaxed">
                    The ability to <span className="text-teal font-medium">{grantVerbs || "…"}</span>{" "}
                    <span className="text-foreground">{objectSummary}</span>
                    {evalr.destructive && <span className="text-red-300"> (includes destructive revocation)</span>}.
                  </p>
                </div>

                {/* Scope: the per-grant decision, front and center */}
                <section>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Which assets
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

                {/* Advanced: capabilities + object types, collapsed */}
                {mode !== "reference" && (
                  <section className="border border-border rounded-lg">
                    <button
                      onClick={() => setAdvanced((a) => !a)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                    >
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /> Advanced: fine-tune
                        capabilities and object types
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-muted-foreground transition-transform ${advanced ? "rotate-90" : ""}`}
                      />
                    </button>
                    {advanced && (
                      <div className="px-3 pb-3 space-y-4 border-t border-border pt-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                            Capabilities
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {CAPABILITIES.map((c) => (
                              <Pill
                                key={c.id}
                                active={capabilityIds.includes(c.id)}
                                danger={c.destructive}
                                onClick={() => toggle(capabilityIds, c.id, setCapabilityIds)}
                              >
                                {c.label}
                              </Pill>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                            Object types
                          </p>
                          <div className="space-y-1.5">
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
                                    <Pill
                                      key={r}
                                      active={resourceTypes.includes(r)}
                                      onClick={() => toggle(resourceTypes, r, setResourceTypes)}
                                    >
                                      {RESOURCE_LABEL[r]}
                                    </Pill>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {pattern?.pairsWith && evalr.destructive && !evalr.hasApprover && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded bg-amber/10 text-amber text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>
                      This pattern initiates revocation. Set up a Revocation Approver group too, or revocations will
                      stall waiting for a checker.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium mb-1">Apply this to which groups?</p>
                  <p className="text-[11px] text-muted-foreground">
                    Grant to IdP groups, not people. Membership flows in from the directory; you never re-grant per
                    user.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {groupPrincipals.map((g) => {
                    const active = selectedGroupIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggle(selectedGroupIds, g.id, setSelectedGroupIds)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded border text-left transition-colors ${
                          active ? "border-teal/50 bg-teal/5" : "border-border hover:border-teal/30"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${active ? "bg-teal" : "border border-border"}`}
                        >
                          {active && <Check className="w-3 h-3 text-primary-foreground" />}
                        </span>
                        <Users2 className="w-4 h-4 text-teal shrink-0" />
                        <span className="text-xs font-medium">{g.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {nf.format(principalReach(g.id))} users · {g.source}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Preview rail */}
          <div className="w-[340px] shrink-0 overflow-y-auto bg-muted/20 px-5 py-5 space-y-5">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Compiled grant</p>
              <p className="text-sm font-semibold mt-0.5 leading-snug">{title}</p>
            </div>

            {step >= 2 && (
              <>
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {selectedGroupIds.length ? (
                      <>
                        Moves <span className="text-teal font-semibold">{nf.format(evalr.usersAffected)} users</span>{" "}
                        across <span className="text-teal font-semibold">{nf.format(evalr.objectCount)} objects</span>{" "}
                        on {nf.format(evalr.assetCount)} assets.
                      </>
                    ) : (
                      <>
                        Covers <span className="text-teal font-semibold">{nf.format(evalr.objectCount)} objects</span>{" "}
                        on {nf.format(evalr.assetCount)} assets. Pick groups in step 3.
                      </>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Stat value={nf.format(evalr.atoms.length)} label="permissions" />
                  <Stat value={nf.format(evalr.usersAffected)} label="users affected" />
                  <Stat value={nf.format(evalr.assetCount)} label="assets in scope" />
                  <Stat value={nf.format(evalr.objectCount)} label="objects covered" />
                </div>

                {evalr.sharedObjectCount > 0 && (
                  <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                    <Layers className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>{nf.format(evalr.sharedObjectCount)} multi-homed (also on assets outside this group).</span>
                  </div>
                )}

                {evalr.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {evalr.warnings.map((w, i) => {
                      const isSod = evalr.sod.some((p) => w.includes(p.reason));
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

                <details className="text-[10px]">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5" /> {evalr.atoms.length} atoms this compiles to
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {evalr.atoms.map((a) => (
                      <code
                        key={a}
                        className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono text-[9px]"
                      >
                        {a}
                      </code>
                    ))}
                  </div>
                </details>
              </>
            )}
            {step === 1 && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pick a pattern on the left. We pre-fill the permissions and show the effect here before you grant
                anything.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Compiles to atoms in the same taxonomy the matrix uses. Auditable, not a shortcut.
          </p>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-border text-xs hover:border-teal"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!canNext}
                title={!assetGroupIds.length ? "Pick at least one asset group" : undefined}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={grant}
                disabled={!evalr.ok}
                title={
                  evalr.sod.length
                    ? "Resolve the separation-of-duties conflict first"
                    : !selectedGroupIds.length
                      ? "Select at least one group"
                      : undefined
                }
                className="px-3 py-1.5 rounded bg-teal text-primary-foreground text-xs hover:bg-teal-light disabled:opacity-40"
              >
                Grant to {selectedGroupIds.length || ""} group{selectedGroupIds.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
