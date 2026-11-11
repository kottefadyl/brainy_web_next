"use client";

import { BooleanCheckbox } from "./components/ui/BooleanCheckbox";
import { TemporalFieldInput } from "./components/ui/LocalizedDateInput";
import { useDialogFocus } from "./components/ui/use-dialog-focus";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Collection, Entry, Field, Language } from "../lib/brainy";

type Props = { collection: Collection; userId: string; language: Language; onClose: () => void; onFullEntry: (formatId: string) => void; onSaved: (entry: Entry) => void };
type Template = { values: Record<string, string>; hidden: string[]; today: string[] };
const supported = new Set(["TITLE", "TEXT", "LONG_TEXT", "NUMBER", "DATE", "DATETIME", "BOOLEAN", "SELECT"]);
const storageKey = (userId: string, formatId: string) => `brainy:quick-entry:${userId}:${formatId}`;
const today = () => { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 10); };
const read = (userId: string, formatId: string): Template => { try { return JSON.parse(localStorage.getItem(storageKey(userId, formatId)) ?? "null") ?? { values: {}, hidden: [], today: [] }; } catch { return { values: {}, hidden: [], today: [] }; } };

export default function QuickEntryDialog({ collection, userId, language, onClose, onFullEntry, onSaved }: Props) {
  const fr = language === "fr";
  const [formatId, setFormatId] = useState(collection.formats.find((item) => !item.objectModel)?.id ?? "");
  const format = collection.formats.find((item) => item.id === formatId);
  const fields = useMemo(() => format?.fields.filter((field) => supported.has(field.kind)) ?? [], [format]);
  const [template, setTemplate] = useState<Template>(() => read(userId, formatId));
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...read(userId, formatId).values }));
  const [recent, setRecent] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(dialogRef, onClose);
  useEffect(() => {
    let active = true;
    api.entriesPage(collection.id, { formatId }).then((page) => { if (active) setRecent(page.entries); }).catch(() => {});
    return () => { active = false; };
  }, [collection.id, formatId]);
  const changeFormat = (id: string) => { setFormatId(id); const next = read(userId, id); setTemplate(next); setValues({ ...next.values }); setRecent([]); setError(""); setNotice(""); };
  const valueFor = (field: Field) => template.today.includes(field.id) ? field.kind === "DATE" ? today() : `${today()}T${new Date().toTimeString().slice(0, 5)}` : values[field.id] ?? "";
  const setField = (id: string, value: string) => setValues((current) => ({ ...current, [id]: value }));
  const saveTemplate = () => { if (!format) return; const next = { ...template, values }; localStorage.setItem(storageKey(userId, format.id), JSON.stringify(next)); setTemplate(next); setNotice(fr ? "Valeurs mémorisées pour ce format de données." : "Values remembered for this data format."); };
  const duplicateLast = () => { const last = recent[0]; if (!last) return; setValues(Object.fromEntries(last.values.filter((item) => fields.some((field) => field.id === item.fieldId)).map((item) => [item.fieldId, item.value]))); };
  const save = async () => {
    if (!format) return;
    setBusy(true); setError("");
    try {
      const payload = fields.flatMap((field) => { const value = valueFor(field).trim(); return value ? [{ fieldId: field.id, value: field.kind === "NUMBER" ? value.replace(",", ".") : field.kind === "DATETIME" ? new Date(value).toISOString() : value }] : []; });
      if (!payload.length) throw new Error(fr ? "Renseignez au moins un champ." : "Fill in at least one field.");
      onSaved(await api.saveEntry(collection.id, payload, undefined, format.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const control = (field: Field) => {
    const common = { value: valueFor(field), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setField(field.id, event.target.value) };
    const suggestions = [...new Set(recent.map((entry) => entry.values.find((item) => item.fieldId === field.id)?.value).filter((value): value is string => !!value))].slice(0, 8);
    if (field.kind === "LONG_TEXT") return <textarea {...common} rows={3} />;
    if (field.kind === "SELECT") return <select {...common}><option value="">—</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    if (field.kind === "BOOLEAN") return <BooleanCheckbox value={common.value} yes={fr ? "Oui" : "Yes"} no={fr ? "Non" : "No"} onChange={(next) => setField(field.id, next)} />;
    if (field.kind === "DATE" || field.kind === "DATETIME") return <TemporalFieldInput kind={field.kind} language={language} value={common.value} disabled={template.today.includes(field.id)} onChange={(next) => setField(field.id, next)} />;
    return <><input {...common} disabled={template.today.includes(field.id)} type="text" inputMode={field.kind === "NUMBER" ? "decimal" : undefined} list={`quick-${field.id}`} /><datalist id={`quick-${field.id}`}>{suggestions.map((item) => <option key={item} value={item} />)}</datalist></>;
  };
  const renderField = (field: Field) => <div key={field.id} className="quick-entry-field"><label><span>{field.name}{field.unit ? ` · ${field.unit}` : ""}</span>{control(field)}</label>{["DATE", "DATETIME"].includes(field.kind) && <label className="quick-today-option"><input type="checkbox" checked={template.today.includes(field.id)} onChange={(event) => setTemplate((current) => ({ ...current, today: event.target.checked ? [...current.today, field.id] : current.today.filter((id) => id !== field.id) }))} />{fr ? "Date du jour" : "Today"}</label>}</div>;
  return <div className="quick-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="quick-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-entry-title">
    <header><div><h2 id="quick-entry-title">{fr ? "Saisie rapide" : "Quick entry"}</h2><p>{fr ? "Ajoutez une entrée en remplissant au moins un champ." : "Add an entry by filling in at least one field."}</p></div><button type="button" onClick={onClose} aria-label={fr ? "Fermer" : "Close"}>×</button></header>
    <label>{fr ? "Format de données" : "Data format"}<select value={formatId} onChange={(event) => changeFormat(event.target.value)}>{collection.formats.filter((item) => !item.objectModel).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {recent.length > 0 && <button type="button" className="quick-subtle" onClick={duplicateLast}>{fr ? "Reprendre la dernière entrée" : "Use last entry"}</button>}
    {format && fields.length === 0 && <div className="quick-entry-fallback"><p>{fr ? "Ce format de données utilise des champs avancés." : "This data format uses advanced fields."}</p><button type="button" onClick={() => onFullEntry(format.id)}>{fr ? "Ouvrir le formulaire complet" : "Open full entry form"}</button></div>}
    <div className="quick-entry-fields">{fields.filter((field) => !template.hidden.includes(field.id)).map(renderField)}</div>
    {fields.some((field) => template.hidden.includes(field.id)) && <details className="quick-optional-fields"><summary>{fr ? "Autres champs" : "More fields"} <span>{fields.filter((field) => template.hidden.includes(field.id)).length}</span></summary><div className="quick-entry-fields">{fields.filter((field) => template.hidden.includes(field.id)).map(renderField)}</div></details>}
    <details className="quick-entry-settings"><summary>{fr ? "Personnaliser la saisie" : "Customize entry form"}</summary><p>{fr ? "Choisissez les champs affichés directement la prochaine fois." : "Choose which fields appear directly next time."}</p><div>{fields.map((field) => <label key={field.id}><input type="checkbox" checked={!template.hidden.includes(field.id)} onChange={(event) => setTemplate((current) => ({ ...current, hidden: event.target.checked ? current.hidden.filter((id) => id !== field.id) : [...current.hidden, field.id] }))} />{field.name}</label>)}</div></details>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status" className="quick-entry-notice">{notice}</p>}
    <footer><button type="button" onClick={saveTemplate}>{fr ? "Mémoriser les valeurs" : "Remember values"}</button><button type="button" disabled={busy || !format} onClick={() => void save()}>{busy ? fr ? "Enregistrement…" : "Saving…" : fr ? "Enregistrer l’entrée" : "Save entry"}</button></footer>
  </section></div>;
}
