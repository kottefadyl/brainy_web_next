"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AlertCircle, Calendar, CheckCircle2, Clock, Hash, Link2, Loader2, Sigma, SquareFunction, Type } from "lucide-react";
import { api, type FormulaPreview, type FormulaStaticType } from "../lib/api";
import { formatNumber, type Collection, type CollectionFormat, type Formula, type Language } from "../lib/brainy";
import { completionsAt, functionAt, type Completion, type CompletionIcon } from "../lib/formula-completion";
import { formulaErrorMessage } from "../lib/formula-errors";
import { formulaFunctions, type FormulaFunction, type FunctionCategory } from "../lib/formula-functions";
import { FormulaSyntaxError, parseFormula, printFormula, type FormulaContext } from "../lib/formula-language";
import "./formula-editor.css";

type Props = { collection: Collection; format: CollectionFormat; language: Language; onCollectionChanged: (collection: Collection) => void };
type Remote = { json: string; inferred?: FormulaStaticType; error?: string; preview?: FormulaPreview | null; previewError?: string };

const DEBOUNCE_MS = 300;
const icons: Record<CompletionIcon, typeof Hash> = { number: Hash, date: Calendar, text: Type, reference: Link2, duration: Clock, formula: Sigma, function: SquareFunction };
const categories: { id: FunctionCategory; fr: string; en: string }[] = [
  { id: "logic", fr: "Conditions", en: "Conditions" },
  { id: "number", fr: "Nombres", en: "Numbers" },
  { id: "date", fr: "Dates et durées", en: "Dates and durations" },
  { id: "text", fr: "Textes", en: "Text" },
  { id: "relation", fr: "Objets liés", en: "Linked objects" },
];

const signature = (item: FormulaFunction, language: Language): string => `${item[language]}(${language === "fr" ? item.paramsFr : item.paramsEn})`;

/** Built-in units are shown by their code (EUR); local ones by symbol, as their identifier means nothing. */
function unitName(unit: string, collection: Collection): string {
  return collection.units.find((item) => item.id === unit)?.symbol ?? unit;
}

function resultLabel(inferred: FormulaStaticType, collection: Collection, language: Language): string {
  const fr = language === "fr";
  if (inferred.type === "TEXT") return fr ? "texte" : "text";
  if (inferred.type === "DATE") return "date";
  if (inferred.type === "DATETIME") return fr ? "date et heure" : "date and time";
  if (inferred.unitOpen) return fr ? "nombre, unité connue au calcul" : "number, unit known when calculating";
  return inferred.unit ? inferred.unit.replaceAll(/[^·²/]+/g, (part) => unitName(part, collection)) : fr ? "nombre" : "number";
}

function previewText(preview: FormulaPreview, collection: Collection, language: Language): string {
  const value = preview.value ?? "";
  if (preview.dimension === "TEXT") return value || (language === "fr" ? "(texte vide)" : "(empty text)");
  if (preview.dimension === "DATE") {
    const hasTime = value.includes("T");
    return new Intl.DateTimeFormat(language, { dateStyle: "medium", ...(hasTime ? { timeStyle: "short" as const } : { timeZone: "UTC" }) }).format(new Date(hasTime ? value : `${value}T00:00:00Z`));
  }
  const local = collection.units.find((item) => item.id === preview.unit);
  return local ? `${formatNumber(value, null, language)} ${local.symbol}` : formatNumber(value, preview.unit, language);
}

export function FormulaEditorPanel({ collection, format, language, onCollectionChanged }: Props) {
  const fr = language === "fr";
  const context = useMemo<FormulaContext>(() => ({ collection, format, language }), [collection, format, language]);
  const formulas = useMemo(() => collection.formulas.filter((item) => item.formatId === format.id), [collection.formulas, format.id]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const listId = useId();

  const [editing, setEditing] = useState<Formula | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [remote, setRemote] = useState<Remote | null>(null);
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = useMemo((): { json?: string; error?: string } => {
    if (!text.trim()) return {};
    try {
      return { json: JSON.stringify(parseFormula(text, context)) };
    } catch (cause) {
      if (cause instanceof FormulaSyntaxError) return { error: cause.message };
      throw cause;
    }
  }, [text, context]);
  const json = parsed.json;

  useEffect(() => {
    if (!json) return;
    let stale = false;
    const handle = setTimeout(async () => {
      let result: Remote;
      try {
        const inferred = await api.inferFormula(collection.id, format.id, json);
        result = { json, inferred };
        try {
          result.preview = await api.previewFormula(collection.id, format.id, json);
        } catch (cause) {
          result.previewError = formulaErrorMessage(cause, collection, language);
        }
      } catch (cause) {
        result = { json, error: formulaErrorMessage(cause, collection, language) };
      }
      if (!stale) setRemote(result);
    }, DEBOUNCE_MS);
    return () => { stale = true; clearTimeout(handle); };
  }, [json, collection, format.id, language]);

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !textareaRef.current) return;
    textareaRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    setCaret(pendingCaret.current);
    pendingCaret.current = null;
  }, [text]);

  const current = json && remote?.json === json ? remote : null;
  const completion = useMemo(() => (focused && !dismissed ? completionsAt(text, caret, context) : null), [focused, dismissed, text, caret, context]);
  const items = completion?.items ?? [];
  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
  const hint = useMemo(() => functionAt(text, caret), [text, caret]);
  const canSave = !!name.trim() && !!current?.inferred && !busy;
  const optionId = (index: number): string => `${listId}-${index}`;

  function changeText(value: string, position: number) {
    setText(value);
    setCaret(position);
    setActiveIndex(0);
    setDismissed(false);
    setSaveError("");
  }

  function replaceRange(from: number, to: number, insert: string) {
    const value = text.slice(0, from) + insert + text.slice(to);
    pendingCaret.current = from + insert.length;
    setText(value);
    setActiveIndex(0);
    setDismissed(false);
    setSaveError("");
    textareaRef.current?.focus();
  }

  const accept = (item: Completion) => { if (completion) replaceRange(completion.from, completion.to, item.insert); };

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!items.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((safeIndex + 1) % items.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((safeIndex - 1 + items.length) % items.length); }
    else if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); accept(items[safeIndex]); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setDismissed(true); }
  }

  function reset() {
    setEditing(null);
    setName("");
    setText("");
    setCaret(0);
    setSaveError("");
  }

  function edit(formula: Formula) {
    const printed = printFormula(formula.expression, context);
    if (printed === null) return;
    setEditing(formula);
    setName(formula.name);
    pendingCaret.current = printed.length;
    setText(printed);
    setSaveError("");
    textareaRef.current?.focus();
  }

  async function save() {
    if (!json) return;
    setBusy(true);
    setSaveError("");
    try {
      onCollectionChanged(await api.saveFormula(collection.id, { name, formatId: format.id, expression: json, expectedVersion: editing?.version }, editing?.id));
      reset();
    } catch (cause) {
      setSaveError(formulaErrorMessage(cause, collection, language));
    } finally {
      setBusy(false);
    }
  }

  async function remove(formula: Formula) {
    setSaveError("");
    try {
      onCollectionChanged(await api.deleteFormula(collection.id, formula.id));
      if (editing?.id === formula.id) reset();
    } catch (cause) {
      setSaveError(formulaErrorMessage(cause, collection, language));
    }
  }

  // While a suggestion is being chosen the text is unfinished by nature: an error then would only be noise.
  const status = !text.trim() || (parsed.error && items.length > 0) ? null : parsed.error ? { tone: "error", message: parsed.error } : current?.error ? { tone: "error", message: current.error } : current?.inferred ? { tone: "valid", message: `${fr ? "Formule valide" : "Valid formula"} (${fr ? "Résultat : " : "Result: "}${resultLabel(current.inferred, collection, language)})` } : { tone: "checking", message: fr ? "Vérification…" : "Checking…" };
  const saveHelp = !name.trim() ? (fr ? "Nommez la formule pour continuer." : "Name the formula to continue.") : !text.trim() ? (fr ? "Écrivez la formule pour continuer." : "Write the formula to continue.") : status?.tone === "error" ? (fr ? "Corrigez la formule pour l'enregistrer." : "Fix the formula to save it.") : "";

  return <div className="formula-editor">
    <label className="formula-editor-name">{fr ? "Nom" : "Name"}<input value={name} onChange={(event) => setName(event.target.value)} /></label>

    <div className="formula-editor-field">
      <label htmlFor={`${listId}-input`}>{fr ? "Formule" : "Formula"}</label>
      <p id={`${listId}-help`} className="formula-editor-help">{fr ? "Tapez [ pour choisir un champ, un point après une référence pour ses propriétés, ou le début d'une fonction. Exemple : [Prix] * 0.8" : "Type [ to pick a field, a dot after a reference for its properties, or the start of a function. Example: [Price] * 0.8"}</p>
      <textarea
        id={`${listId}-input`}
        ref={textareaRef}
        rows={3}
        value={text}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-describedby={`${listId}-help ${listId}-status`}
        aria-autocomplete="list"
        aria-controls={items.length ? listId : undefined}
        aria-activedescendant={items.length ? optionId(safeIndex) : undefined}
        aria-invalid={status?.tone === "error"}
        onChange={(event) => changeText(event.target.value, event.target.selectionStart)}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {items.length > 0 && <ul id={listId} role="listbox" aria-label={fr ? "Suggestions" : "Suggestions"} className="formula-suggestions">
        {items.map((item, index) => { const Icon = icons[item.icon]; return <li key={item.id} id={optionId(index)} role="option" aria-selected={index === safeIndex} className={index === safeIndex ? "active" : ""} onMouseDown={(event) => { event.preventDefault(); accept(item); }}>
          <span className="formula-suggestion-icon" aria-hidden="true"><Icon size={16} /></span><strong>{item.label}</strong><small>{item.detail}</small>
        </li>; })}
      </ul>}
      <p className="sr-only" role="status">{items.length ? (fr ? `${items.length} suggestions` : `${items.length} suggestions`) : ""}</p>
      {hint && <p className="formula-signature"><code>{signature(hint, language)}</code><span>{fr ? hint.helpFr : hint.helpEn}</span></p>}
    </div>

    <div id={`${listId}-status`} className="formula-feedback" aria-live="polite">
      {status && <p className={`formula-status ${status.tone}`}>
        {status.tone === "valid" ? <CheckCircle2 size={16} aria-hidden="true" /> : status.tone === "error" ? <AlertCircle size={16} aria-hidden="true" /> : <Loader2 size={16} aria-hidden="true" className="formula-spinner" />}
        <span>{status.message}</span>
      </p>}
      {current?.inferred && <p className="formula-preview">
        {current.previewError ? <>{fr ? "Aperçu impossible : " : "Preview unavailable: "}{current.previewError}</>
          : !current.preview ? (fr ? "Ajoutez une entrée à ce format de données pour voir un aperçu." : "Add an entry to this data format to see a preview.")
          : <>
            <span>{fr ? "Aperçu" : "Preview"}{current.preview.entryLabel ? ` · ${current.preview.entryLabel}` : ""}</span>
            {current.preview.missing ? <em>{fr ? "Valeur absente pour cette entrée" : "No value for this entry"}</em> : <strong>{previewText(current.preview, collection, language)}</strong>}
          </>}
      </p>}
    </div>

    {saveHelp && <p className="action-help">{saveHelp}</p>}
    {saveError && <p role="alert" className="formula-status error"><AlertCircle size={16} aria-hidden="true" /><span>{saveError}</span></p>}
    <div className="formula-editor-actions">
      <button type="button" disabled={!canSave} onClick={save}>{editing ? (fr ? "Mettre à jour" : "Update") : (fr ? "Enregistrer la formule" : "Save formula")}</button>
      {editing && <button type="button" onClick={reset}>{fr ? "Annuler" : "Cancel"}</button>}
    </div>

    <details className="formula-catalog">
      <summary>{fr ? "Toutes les fonctions" : "All functions"}</summary>
      {categories.map((category) => <section key={category.id}>
        <h4>{category[language]}</h4>
        <ul>{formulaFunctions.filter((item) => item.category === category.id).map((item) => <li key={item.id}>
          <button type="button" title={fr ? item.helpFr : item.helpEn} onClick={() => replaceRange(caret, caret, `${item[language]}(`)}><code>{signature(item, language)}</code><span>{fr ? item.helpFr : item.helpEn}</span></button>
        </li>)}</ul>
      </section>)}
    </details>

    <ul className="formula-list">
      {formulas.map((formula) => { const printed = printFormula(formula.expression, context); return <li key={formula.id}>
        <div><strong>{formula.name}</strong>{printed !== null ? <code>{printed}</code> : <em className="formula-advanced-badge">{fr ? "Formule avancée (lecture seule)" : "Advanced formula (read-only)"}</em>}</div>
        {printed !== null && <button type="button" onClick={() => edit(formula)}>{fr ? "Modifier" : "Edit"}</button>}
        <button type="button" onClick={() => remove(formula)}>{fr ? "Supprimer" : "Delete"}</button>
      </li>; })}
    </ul>
  </div>;
}
