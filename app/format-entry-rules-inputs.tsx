"use client";

import type { Language } from "../lib/brainy";
import "./format-entry-rules.css";

/** Most entries a data format accepts: empty = no limit, otherwise a whole number from 1. */
export function parseMaxEntries(text: string): number | null | "invalid" {
  const clean = text.trim();
  if (!clean) return null;
  if (!/^\d+$/.test(clean)) return "invalid";
  const value = Number(clean);
  return value >= 1 && value <= 1_000_000 ? value : "invalid";
}

export function maxEntriesError(language: Language): string {
  return language === "fr" ? "Le nombre d’entrées doit être un nombre entier à partir de 1, ou rester vide." : "The number of entries must be a whole number from 1, or stay empty.";
}

/** Data format setting: how many entries it may hold. Left empty, there is no limit. */
export function MaxEntriesInput({ language, value, onChange }: { language: Language; value: string; onChange: (value: string) => void }) {
  const fr = language === "fr";
  const parsed = parseMaxEntries(value);
  return (
    <label className="input-label max-entries-input">
      {fr ? "Nombre maximal d’entrées" : "Maximum number of entries"}
      <input type="number" inputMode="numeric" min={1} step={1} value={value} placeholder={fr ? "Sans limite" : "No limit"} onChange={(event) => onChange(event.target.value)} aria-invalid={parsed === "invalid" || undefined} aria-describedby="max-entries-help" />
      <small id="max-entries-help" className="field-help">{parsed === "invalid" ? maxEntriesError(language) : parsed === 1 ? (fr ? "Une seule entrée, par exemple une couverture ou une préface." : "A single entry, for example a cover or a preface.") : (fr ? "Laissez vide pour ne fixer aucune limite." : "Leave empty for no limit.")}</small>
    </label>
  );
}

/** Field setting: an entry must fill this field. Off unless chosen. */
export function FieldRequiredToggle({ language, checked, onChange }: { language: Language; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="field-required-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{language === "fr" ? "Obligatoire" : "Required"}</span>
    </label>
  );
}

/** The field as shown in an entry form: a required field's name carries " *". Ids and values are unchanged. */
export function withRequiredMark<T extends { name: string; required?: boolean | null }>(field: T): T {
  return field.required ? { ...field, name: `${field.name} *` } : field;
}

/** The message for required fields left empty, or "" when all are filled. */
export function missingRequiredMessage(fields: { id: string; name: string; required?: boolean | null }[], filledIds: Set<string>, language: Language): string {
  const missing = fields.filter((field) => field.required && !filledIds.has(field.id)).map((field) => field.name);
  if (!missing.length) return "";
  return language === "fr" ? `Champs obligatoires à remplir : ${missing.join(", ")}.` : `Fill in the required fields: ${missing.join(", ")}.`;
}

export function RequiredFieldsNote({ language }: { language: Language }) {
  return <p className="required-note">{language === "fr" ? "Les champs marqués * sont obligatoires." : "Fields marked * are required."}</p>;
}

/** Field setting: this field's value shows in the entry rows (3 at most per data format). */
export function FieldListToggle({ language, checked, disabled, onChange }: { language: Language; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  const fr = language === "fr";
  return (
    <label className="field-required-toggle" title={disabled ? (fr ? "Trois champs au plus s’affichent dans la liste." : "At most three fields show in the list.") : undefined}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{fr ? "Afficher dans la liste" : "Show in the list"}</span>
    </label>
  );
}

/** The fields an entry row shows: those chosen (3 at most), otherwise the first ones. */
export function listFields<T extends { id: string; showInList?: boolean | null }>(fields: T[]): T[] | null {
  const chosen = fields.filter((field) => field.showInList);
  return chosen.length ? chosen.slice(0, 3) : null;
}
