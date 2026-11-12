// T46/1: ranges, clipboard text, sorting and fill for the spreadsheet mode. Pure helpers, shared rules:
// every pasted or filled value still goes through toStored, like a typed cell.
import type { Entry, Field } from "./brainy";
import { measureInput } from "./measure-entry";
import type { SavedValue } from "./spreadsheet";

export type Cell = { row: number; col: number };
export type Range = { top: number; left: number; bottom: number; right: number };

export function rangeOf(anchor: Cell | null, active: Cell): Range {
  const from = anchor ?? active;
  return { top: Math.min(from.row, active.row), bottom: Math.max(from.row, active.row), left: Math.min(from.col, active.col), right: Math.max(from.col, active.col) };
}
export const inRange = (range: Range, row: number, col: number) => row >= range.top && row <= range.bottom && col >= range.left && col <= range.right;

/** Tab-separated text, as spreadsheets exchange it; quoted when a cell holds a tab, a line break or a quote. */
export function toClipboard(rows: string[][]): string {
  const cell = (value: string) => /[\t\n\r"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return rows.map((row) => row.map(cell).join("\t")).join("\n");
}

/** Reads tab-separated text from another spreadsheet (quoted cells may hold tabs and line breaks). */
export function parseClipboard(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  const source = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { value += '"'; index++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"' && value === "") quoted = true;
    else if (char === "\t") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  row.push(value);
  rows.push(row);
  return rows;
}

/** Several cells of one entry changed at once; the other values are sent back unchanged. */
export function valuesWithCells(entry: Entry | undefined, changes: { fieldId: string; value: string }[]): SavedValue[] {
  const changed = new Set(changes.map((item) => item.fieldId));
  const kept: SavedValue[] = (entry?.values ?? []).filter((item) => !changed.has(item.fieldId)).map((item) => {
    const details = measureInput(item.measureValue ?? undefined);
    return { fieldId: item.fieldId, value: item.value, ...(details ? { measureValue: details } : {}) };
  });
  return [...kept, ...changes.filter((item) => item.value)];
}

export type SortOrder = { fieldId: string; direction: "asc" | "desc" } | null;

/** Empty cells always come last; numbers compare as numbers, text naturally ("Item 2" before "Item 10"). */
export function compareCells(field: Field, a: string, b: string, language: string): number {
  if (!a || !b) return !a && !b ? 0 : !a ? 1 : -1;
  if (field.kind === "NUMBER" || field.kind === "MEASURE") return Number(a) - Number(b);
  return a.localeCompare(b, language, { numeric: true, sensitivity: "base" });
}

export function sortEntries(entries: Entry[], fields: Field[], order: SortOrder, language: string): Entry[] {
  const field = order && fields.find((item) => item.id === order.fieldId);
  if (!order || !field) return entries;
  const value = (entry: Entry) => entry.values.find((item) => item.fieldId === field.id)?.value ?? "";
  return [...entries].sort((x, y) => {
    const a = value(x), b = value(y);
    if (!a || !b) return compareCells(field, a, b, language);
    return (order.direction === "asc" ? 1 : -1) * compareCells(field, a, b, language);
  });
}

export const nextSort = (current: SortOrder, fieldId: string): SortOrder =>
  current?.fieldId !== fieldId ? { fieldId, direction: "asc" } : current.direction === "asc" ? { fieldId, direction: "desc" } : null;
