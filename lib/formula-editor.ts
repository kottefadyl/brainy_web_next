type Rounding = { roundDigits: string; roundMode: string };
export type FormulaDraft = Rounding & (
  | { kind: "arithmetic"; operator: string; left: string; right: string; constant: string }
  | { kind: "dateDifference"; fromFieldId: string; toFieldId: string; unit: string }
);
type StoredNode = Record<string, unknown> | null | undefined;

const isNode = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function operandId(node: StoredNode): string | null {
  if (node?.kind === "field" && typeof node.fieldId === "string") return node.fieldId;
  if (node?.kind === "formula" && typeof node.formulaId === "string") return `formula:${node.formulaId}`;
  return null;
}

/** Returns null for any stored formula the visual editor cannot show without losing part of it. */
export function readFormulaDraft(expression: string): FormulaDraft | null {
  let stored: unknown;
  try { stored = JSON.parse(expression); } catch { return null; }
  if (!isNode(stored)) return null;
  const wrapped = stored.kind === "round";
  const tree = wrapped ? stored.value : stored;
  if (!isNode(tree)) return null;
  // Older web formulas kept rounding in a `round` key beside a date difference.
  const rounding = wrapped ? stored : isNode(stored.round) ? stored.round : null;
  const roundParts: Rounding = {
    roundDigits: typeof rounding?.digits === "number" ? String(rounding.digits) : "",
    roundMode: typeof rounding?.mode === "string" ? rounding.mode : "HALF_UP",
  };
  if (tree.kind === "dateDifference") {
    if (typeof tree.fromFieldId !== "string" || typeof tree.toFieldId !== "string") return null;
    return { kind: "dateDifference", fromFieldId: tree.fromFieldId, toFieldId: tree.toFieldId, unit: typeof tree.unit === "string" ? tree.unit : "d", ...roundParts };
  }
  if (tree.kind !== "operation" || typeof tree.operator !== "string" || !Array.isArray(tree.args) || tree.args.length !== 2) return null;
  const [first, second] = tree.args as StoredNode[];
  const left = operandId(first);
  if (!left) return null;
  const arithmetic = { kind: "arithmetic" as const, operator: tree.operator, left, ...roundParts };
  // The editor's fixed number has no unit, so a constant with one must stay untouched.
  if (second?.kind === "number" && typeof second.value === "string" && !second.unit) return { ...arithmetic, right: "", constant: second.value };
  const right = operandId(second);
  return right ? { ...arithmetic, right, constant: "2" } : null;
}

function operand(id: string): Record<string, unknown> {
  return id.startsWith("formula:") ? { kind: "formula", formulaId: id.slice(8) } : { kind: "field", fieldId: id };
}

export function buildFormulaExpression(draft: FormulaDraft): Record<string, unknown> {
  const tree: Record<string, unknown> = draft.kind === "dateDifference"
    ? { kind: "dateDifference", fromFieldId: draft.fromFieldId, toFieldId: draft.toFieldId, unit: draft.unit }
    : { kind: "operation", operator: draft.operator, args: [operand(draft.left), draft.right ? operand(draft.right) : { kind: "number", value: draft.constant.trim().replace(",", ".") }] };
  return draft.roundDigits === "" ? tree : { kind: "round", digits: Number(draft.roundDigits), mode: draft.roundMode, value: tree };
}
