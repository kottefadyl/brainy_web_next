// Spreadsheet mode (T46): pure helpers shared by the editable table. They apply the same
// rules as the entry editor, so a cell can never store what the full form would refuse.
import type { CollectionFormat, Entry, Field, FieldKind, Language, MessageKey } from "./brainy";
import { measureInput } from "./measure-entry";

export type CellEditor = "text" | "url" | "character" | "longText" | "number" | "duration" | "date" | "time" | "datetime" | "boolean" | "select" | "none";

/** Kinds a cell edits directly. The others (files, references, measures, codes, places, several choices) open the full entry. */
export function cellEditor(field: Field, format: CollectionFormat): CellEditor {
  if (format.workflow?.stateFieldId === field.id) return "none";
  switch (field.kind) {
    case "TITLE": case "TEXT": return "text";
    case "LINK": return "url";
    case "CHARACTER": return "character";
    case "LONG_TEXT": return "longText";
    case "NUMBER": return "number";
    case "DURATION": return "duration";
    case "DATE": return "date";
    case "TIME": return "time";
    case "DATETIME": return "datetime";
    case "BOOLEAN": return "boolean";
    case "SELECT": return "select";
    default: return "none";
  }
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Stored value → what the person edits (French decimal comma, local date and time). */
export function toEditable(field: Field, stored: string, language: Language): string {
  if (!stored) return "";
  if (field.kind === "NUMBER") return language === "fr" ? stored.replace(".", ",") : stored;
  if (field.kind === "DATETIME") {
    const date = new Date(stored);
    if (Number.isNaN(date.getTime())) return stored;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return stored;
}

export type StoredResult = { ok: true; value: string } | { ok: false; error: MessageKey };

/** What the person typed → stored value, with the entry editor's checks. "" clears the cell. */
export function toStored(field: Field, raw: string): StoredResult {
  const value = raw.trim();
  if (!value) return { ok: true, value: "" };
  if (value.length > (field.kind === "LONG_TEXT" ? 50000 : 10000)) return { ok: false, error: "tooLong" };
  switch (field.kind) {
    case "NUMBER": {
      const number = value.replace(/\s/g, "").replace(",", ".");
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(number) || !Number.isFinite(Number(number))) return { ok: false, error: "invalidNumber" };
      return { ok: true, value: number };
    }
    case "DATE": return /^\d{4}-\d{2}-\d{2}$/.test(value) ? { ok: true, value } : { ok: false, error: "invalidDate" };
    case "TIME": return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? { ok: true, value } : { ok: false, error: "invalidTime" };
    case "DATETIME": {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? { ok: false, error: "invalidDateTime" } : { ok: true, value: date.toISOString() };
    }
    case "DURATION": return /^\d{1,6}:[0-5]\d$/.test(value) ? { ok: true, value } : { ok: false, error: "invalidDuration" };
    case "CHARACTER": return [...value].length === 1 ? { ok: true, value } : { ok: false, error: "oneCharacter" };
    case "LINK":
      try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? { ok: true, value } : { ok: false, error: "invalidLink" }; }
      catch { return { ok: false, error: "invalidLink" }; }
    case "BOOLEAN": return { ok: true, value: value === "true" ? "true" : "false" };
    case "SELECT": return field.options?.includes(value) ? { ok: true, value } : { ok: false, error: "choicesRule" };
    default: return { ok: true, value };
  }
}

export type SavedValue = { fieldId: string; value: string; measureValue?: NonNullable<Entry["values"][number]["measureValue"]> };

/**
 * An update replaces every value of the entry, so the others are sent back unchanged
 * (attachments, references and measure details included) with only one cell changed.
 */
export function valuesWithCell(entry: Entry | undefined, fieldId: string, value: string): SavedValue[] {
  const kept: SavedValue[] = (entry?.values ?? []).filter((item) => item.fieldId !== fieldId).map((item) => {
    const details = measureInput(item.measureValue ?? undefined);
    return { fieldId: item.fieldId, value: item.value, ...(details ? { measureValue: details } : {}) };
  });
  return value ? [...kept, { fieldId, value }] : kept;
}

/** Kinds offered when a column is added from the table; the others stay in the data format editor. */
export const spreadsheetColumnKinds: FieldKind[] = ["TEXT", "NUMBER", "DATE", "TIME", "DATETIME", "DURATION", "BOOLEAN", "SELECT", "LONG_TEXT", "LINK", "CHARACTER", "TITLE"];

export type NewColumn = { name: string; kind: FieldKind; unit: string; options: string[] };

/** Existing fields keep every setting; the new column is appended last. */
export function fieldsWithColumn(format: CollectionFormat, column: NewColumn) {
  const existing = format.fields.map((field) => ({
    id: field.id, name: field.name, kind: field.kind,
    ...(field.unit ? { unit: field.unit } : {}),
    ...(field.options?.length ? { options: field.options } : {}),
    ...(field.codeListId ? { codeListId: field.codeListId } : {}),
    ...(field.kind === "OBJECT_REF" ? { targetObjectFormatId: field.targetObjectFormatId ?? undefined, multiple: field.multiple ?? false, variableName: field.variableName ?? undefined, referenceMode: field.referenceMode ?? "SNAPSHOT" } : {}),
  }));
  const added = { name: column.name.trim(), kind: column.kind, ...(column.kind === "NUMBER" && column.unit ? { unit: column.unit } : {}), ...(["SELECT", "MULTI_SELECT"].includes(column.kind) ? { options: column.options } : {}) };
  return [...existing, added];
}

/** The same checks as the data format editor, for one new column. */
export function columnProblem(format: CollectionFormat, column: NewColumn, unitChoice: string): MessageKey | "unitRequired" | "tooManyFields" | null {
  const name = column.name.trim();
  if (format.fields.length >= 30) return "tooManyFields";
  if (!name || name.length > 80) return "invalidCollection";
  if (format.fields.some((field) => field.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return "duplicateFields";
  if (column.kind === "NUMBER") {
    if (!unitChoice) return "unitRequired";
    if (unitChoice === "custom" && !column.unit) return "customUnitRequired";
    if (column.unit && !column.unit.startsWith("local:") && column.unit.length > 24) return "unitLimit";
  }
  if (column.kind === "SELECT" && (column.options.length < 2 || column.options.length > 30 || new Set(column.options.map((option) => option.toLocaleLowerCase())).size !== column.options.length)) return "choicesRule";
  return null;
}
