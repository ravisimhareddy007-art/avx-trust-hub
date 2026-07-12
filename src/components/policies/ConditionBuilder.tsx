import { Plus, Trash2 } from "lucide-react";
import { fieldsFor, operatorsForField, OPERATORS, FieldDef } from "./policyFields";

export interface ConditionRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface ConditionGroup {
  id: string;
  innerLogic: "AND" | "OR";
  rows: ConditionRow[];
}

interface Props {
  policyType: string;
  groups: ConditionGroup[];
  groupLogic: "AND" | "OR";
  onChange: (groups: ConditionGroup[]) => void;
  onGroupLogicChange: (logic: "AND" | "OR") => void;
  fields?: FieldDef[];
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export function emptyRow(): ConditionRow {
  return { id: uid("row"), field: "", operator: "", value: "" };
}

export function emptyGroup(): ConditionGroup {
  return { id: uid("grp"), innerLogic: "AND", rows: [emptyRow()] };
}

const selectCls =
  "border border-border rounded-lg px-2.5 py-1.5 text-[11px] bg-card text-foreground [&>option]:bg-card [&>option]:text-foreground focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors";
const emptySelectCls =
  "border border-teal/30 rounded-lg px-2.5 py-1.5 text-[11px] bg-teal/5 text-foreground [&>option]:bg-card [&>option]:text-foreground hover:border-teal/60 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/40 transition-colors";

function LogicPill({ value, onChange }: { value: "AND" | "OR"; onChange: (v: "AND" | "OR") => void }) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-[10px] font-semibold">
      {(["AND", "OR"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2 py-0.5 transition-colors ${value === opt ? "bg-teal text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ValueInput({ field, row, onValue }: { field?: FieldDef; row: ConditionRow; onValue: (v: string) => void }) {
  const op = OPERATORS.find((o) => o.id === row.operator);
  if (!field || !op || !op.takesValue) return <div className="flex-1 min-w-0" />;

  const isEmpty = !String(row.value ?? "").trim();
  const errCls = isEmpty ? "border-coral ring-1 ring-coral/40" : "";

  if (op.id === "in" || op.id === "nin") {
    return (
      <input
        value={row.value}
        onChange={(e) => onValue(e.target.value)}
        placeholder="comma,separated,values"
        className={`${selectCls} ${errCls} flex-1 min-w-0`}
      />
    );
  }
  if (field.kind === "enum") {
    return (
      <select
        value={row.value}
        onChange={(e) => onValue(e.target.value)}
        className={`${selectCls} ${errCls} flex-1 min-w-0`}
      >
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.kind === "number") {
    return (
      <input
        type="number"
        value={row.value}
        onChange={(e) => onValue(e.target.value)}
        placeholder={field.unit || "value"}
        className={`${selectCls} ${errCls} flex-1 min-w-0`}
      />
    );
  }
  return (
    <input
      value={row.value}
      onChange={(e) => onValue(e.target.value)}
      placeholder={field.hint || "value"}
      className={`${selectCls} ${errCls} flex-1 min-w-0`}
    />
  );
}

export default function ConditionBuilder({ policyType, groups, groupLogic, onChange, onGroupLogicChange, fields: fieldsProp }: Props) {
  const fields = fieldsProp ?? fieldsFor(policyType);

  const update = (next: ConditionGroup[]) => onChange(next);

  const setRow = (gi: number, ri: number, patch: Partial<ConditionRow>) => {
    const next = groups.map((g, i) =>
      i !== gi ? g : { ...g, rows: g.rows.map((r, j) => (j !== ri ? r : { ...r, ...patch })) },
    );
    update(next);
  };

  const onFieldChange = (gi: number, ri: number, fieldId: string) => {
    const f = fields.find((x) => x.id === fieldId);
    const ops = operatorsForField(f);
    setRow(gi, ri, { field: fieldId, operator: ops[0]?.id || "", value: "" });
  };

  const addRow = (gi: number) => update(groups.map((g, i) => (i !== gi ? g : { ...g, rows: [...g.rows, emptyRow()] })));

  const removeRow = (gi: number, ri: number) => {
    const next = groups
      .map((g, i) => (i !== gi ? g : { ...g, rows: g.rows.filter((_, j) => j !== ri) }))
      .filter((g) => g.rows.length > 0);
    update(next.length ? next : [emptyGroup()]);
  };

  const setInnerLogic = (gi: number, logic: "AND" | "OR") =>
    update(groups.map((g, i) => (i !== gi ? g : { ...g, innerLogic: logic })));

  const addGroup = () => update([...groups, emptyGroup()]);
  const removeGroup = (gi: number) => {
    const next = groups.filter((_, i) => i !== gi);
    update(next.length ? next : [emptyGroup()]);
  };

  if (!fields.length) {
    return (
      <div className="border border-dashed border-border rounded-lg p-4 text-[11px] text-muted-foreground text-center">
        Select a policy type to configure conditions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && (
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <LogicPill value={groupLogic} onChange={onGroupLogicChange} />
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <div className="border border-border border-l-2 border-l-teal rounded-lg p-3 bg-muted/30 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-semibold px-2 py-0.5 rounded-md bg-teal/15 text-teal border border-teal/25">
                Group {gi + 1}
                {group.rows.length > 1 && (
                  <span className="text-teal/70 font-normal normal-case tracking-normal">· match</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {group.rows.length > 1 && <LogicPill value={group.innerLogic} onChange={(l) => setInnerLogic(gi, l)} />}
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    className="text-muted-foreground hover:text-coral transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {group.rows.map((row, ri) => {
              const f = fields.find((x) => x.id === row.field);
              const ops = operatorsForField(f);
              const fieldEmpty = !row.field;
              const opEmpty = !row.operator;
              return (
                <div key={row.id} className="flex items-center gap-2">
                  {ri > 0 ? (
                    <span className="inline-flex justify-center items-center text-[9px] font-bold tracking-wide text-teal bg-teal/10 border border-teal/20 rounded px-1.5 py-0.5 w-10 shrink-0">
                      {group.innerLogic}
                    </span>
                  ) : (
                    <span className="w-10 shrink-0" />
                  )}
                  <select
                    value={row.field}
                    onChange={(e) => onFieldChange(gi, ri, e.target.value)}
                    className={`${fieldEmpty ? emptySelectCls : selectCls} w-44 shrink-0`}
                  >
                    <option value="">Field…</option>
                    {fields.map((fl) => (
                      <option key={fl.id} value={fl.id}>
                        {fl.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.operator}
                    onChange={(e) => setRow(gi, ri, { operator: e.target.value, value: "" })}
                    disabled={!row.field}
                    className={`${row.field && opEmpty ? emptySelectCls : selectCls} w-40 shrink-0 disabled:opacity-40`}
                  >
                    {!row.field && <option value="">Operator…</option>}
                    {ops.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ValueInput field={f} row={row} onValue={(v) => setRow(gi, ri, { value: v })} />
                  <button
                    type="button"
                    onClick={() => removeRow(gi, ri)}
                    className="text-muted-foreground hover:text-coral shrink-0 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => addRow(gi)}
              className="inline-flex items-center gap-1 text-[10px] text-teal font-semibold px-2 py-1 -mx-1 rounded hover:bg-teal/10 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add condition
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="inline-flex items-center gap-1 text-[10px] text-teal font-semibold px-2 py-1.5 -mx-1 rounded-md border border-dashed border-teal/30 hover:bg-teal/10 hover:border-teal/60 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add condition group
      </button>
    </div>
  );
}
