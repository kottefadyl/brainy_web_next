import type { CollectionFormat, Field } from "./brainy";
import { findFunction, fold, formulaFunctions, type FormulaFunction } from "./formula-functions";
import type { FormulaContext } from "./formula-language";

export type CompletionIcon = "number" | "date" | "text" | "reference" | "duration" | "formula" | "function";
export type Completion = { id: string; label: string; detail: string; icon: CompletionIcon; insert: string };
export type CompletionResult = { from: number; to: number; items: Completion[] };

const iconByKind: Record<string, CompletionIcon | undefined> = { NUMBER: "number", DATE: "date", DATETIME: "date", DURATION: "duration", TEXT: "text", TITLE: "text", CODE: "text", LINK: "text", OBJECT_REF: "reference" };
const MAX_ITEMS = 40;
const escapeName = (name: string): string => name.replace(/[\\\]]/g, "\\$&");

function kindLabel(field: Field, context: FormulaContext): string {
  const fr = context.language === "fr";
  const unit = field.unit ? ` · ${context.collection.units.find((item) => item.id === field.unit)?.symbol ?? field.unit}` : "";
  const names: Record<string, [string, string]> = { NUMBER: ["Nombre", "Number"], DATE: ["Date", "Date"], DATETIME: ["Date et heure", "Date and time"], DURATION: ["Durée", "Duration"], TEXT: ["Texte", "Text"], TITLE: ["Titre", "Title"], CODE: ["Code", "Code"], LINK: ["Lien web", "Web link"], OBJECT_REF: ["Référence : tapez . ensuite", "Reference: type . next"] };
  return `${(names[field.kind] ?? ["", ""])[fr ? 0 : 1]}${unit}`;
}

function fieldItems(format: CollectionFormat, context: FormulaContext, partial: string, numberOrTextOnly: boolean): Completion[] {
  const wanted = fold(partial);
  return format.fields
    .filter((field) => iconByKind[field.kind] && fold(field.name).includes(wanted))
    // Dates and durations of a linked object are not readable by formulas.
    .filter((field) => !numberOrTextOnly || !["DATE", "DATETIME", "DURATION"].includes(field.kind))
    .map((field) => ({ id: `field:${field.id}`, label: field.name, detail: kindLabel(field, context), icon: iconByKind[field.kind]!, insert: `[${escapeName(field.name)}]` }));
}

function formulaItems(context: FormulaContext, partial: string): Completion[] {
  const wanted = fold(partial.replace(/^=/, ""));
  return context.collection.formulas
    .filter((item) => item.formatId === context.format.id && fold(item.name).includes(wanted))
    .map((item) => ({ id: `formula:${item.id}`, label: item.name, detail: context.language === "fr" ? "Formule enregistrée" : "Saved formula", icon: "formula" as const, insert: `[=${escapeName(item.name)}]` }));
}

/** Resolves [A].[B]. to the data format its last reference points to. */
function formatAfterPath(names: string[], context: FormulaContext): CollectionFormat | undefined {
  let format: CollectionFormat | undefined = context.format;
  for (const name of names) {
    const field: Field | undefined = format?.fields.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && item.kind === "OBJECT_REF");
    if (!field) return undefined;
    format = context.collection.formats.find((item) => item.id === field.targetObjectFormatId);
  }
  return format;
}

const PATH_BEFORE_DOT = /(?:\[(?:\\.|[^\]\\])*\]\.)+$/u;
const pathNames = (text: string): string[] => {
  const match = PATH_BEFORE_DOT.exec(text);
  if (!match) return [];
  return Array.from(match[0].matchAll(/\[((?:\\.|[^\]\\])*)\]/gu), (item) => item[1].replace(/\\(.)/g, "$1"));
};

type Scan = { state: "code" | "string" | "ref"; refStart: number; calls: string[] };

/** Reads the text before the caret, so that quotes and brackets decide what the caret is inside of. */
function scan(before: string): Scan {
  let state: Scan["state"] = "code";
  let refStart = -1;
  const calls: string[] = [];
  let word = "";
  for (let index = 0; index < before.length; index += 1) {
    const char = before[index];
    if (state !== "code") {
      if (char === "\\") index += 1;
      else if ((state === "string" && char === '"') || (state === "ref" && char === "]")) state = "code";
      continue;
    }
    if (char === '"') state = "string";
    else if (char === "[") { state = "ref"; refStart = index; }
    else if (char === "(") calls.push(word);
    else if (char === ")") calls.pop();
    word = /[\p{L}\p{N}_]/u.test(char) ? word + char : "";
  }
  return { state, refStart, calls };
}

export function completionsAt(text: string, caret: number, context: FormulaContext): CompletionResult | null {
  const before = text.slice(0, caret);
  const position = scan(before);
  if (position.state === "string") return null;
  if (position.state === "ref") {
    const partial = before.slice(position.refStart + 1);
    const path = pathNames(before.slice(0, position.refStart));
    if (path.length) {
      const target = formatAfterPath(path, context);
      return target ? { from: position.refStart, to: caret, items: fieldItems(target, context, partial, true).slice(0, MAX_ITEMS) } : null;
    }
    const inside = partial.startsWith("=") ? [] : fieldItems(context.format, context, partial, false);
    return { from: position.refStart, to: caret, items: [...inside, ...formulaItems(context, partial)].slice(0, MAX_ITEMS) };
  }
  if (before.endsWith("].")) {
    const target = formatAfterPath(pathNames(before), context);
    return target ? { from: caret, to: caret, items: fieldItems(target, context, "", true).slice(0, MAX_ITEMS) } : null;
  }
  const word = /[\p{L}_][\p{L}\p{N}_]*$/u.exec(before);
  // A word right after a number is a unit, as in 5 km.
  if (!word || /\d\s*$/.test(before.slice(0, word.index))) return null;
  const wanted = fold(word[0]);
  const items = formulaFunctions
    .filter((item) => item.fr.startsWith(wanted) || item.en.startsWith(wanted))
    .map((item): Completion => ({ id: `function:${item.id}`, label: item[context.language], detail: context.language === "fr" ? item.helpFr : item.helpEn, icon: "function", insert: `${item[context.language]}(` }));
  return items.length ? { from: word.index, to: caret, items: items.slice(0, MAX_ITEMS) } : null;
}

/** The innermost function the caret is inside of, to show its parameters while typing them. */
export function functionAt(text: string, caret: number): FormulaFunction | undefined {
  const { calls } = scan(text.slice(0, caret));
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const found = calls[index] ? findFunction(calls[index]) : undefined;
    if (found) return found;
  }
  return undefined;
}
