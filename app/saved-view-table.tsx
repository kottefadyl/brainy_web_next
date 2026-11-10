"use client";

// Table layout of a saved view, with an optional spreadsheet mode (T46): cells edit in place,
// rows are added at the bottom and columns are added to the data format, with an explicit unit.
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Plus, Sheet, SquareArrowOutUpRight } from "lucide-react";
import { api } from "../lib/api";
import { fieldKindLabel, formatFieldValue, numberUnits, t, unitCategories, unitLabel, unitSymbol, type Collection, type CollectionFormat, type Entry, type Field, type FieldKind, type Language, type SavedView } from "../lib/brainy";
import { cellEditor, columnProblem, fieldsWithColumn, spreadsheetColumnKinds, toEditable, toStored, valuesWithCell, type CellEditor } from "../lib/spreadsheet";
import { TemporalFieldInput } from "./components/ui/LocalizedDateInput";
import { Button } from "./components/ui/Button";
import Modal from "./components/ui/Modal";
import "./spreadsheet.css";

type Props = {
  collection: Collection;
  view: SavedView;
  entries: Entry[];
  language: Language;
  errorText: (cause: unknown) => string;
  onOpenEntry: (entry: Entry) => void;
  onOpenLedger: () => void;
  onEntrySaved: (entry: Entry) => void;
  onCollectionChanged: (collection: Collection) => void;
  onEditFormat: (formatId: string) => void;
};

const storageKey = (viewId: string) => `brainy.spreadsheet.${viewId}`;
function readMode(viewId: string): boolean { try { return typeof window !== "undefined" && window.localStorage.getItem(storageKey(viewId)) === "on"; } catch { return false; } }
function writeMode(viewId: string, on: boolean) { try { window.localStorage.setItem(storageKey(viewId), on ? "on" : "off"); } catch { /* the choice simply is not remembered */ } }
const dateTimeText = (value: string, language: Language) => new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function SavedViewTable(props: Props) {
  const { view, language } = props;
  const fr = language === "fr";
  // The parent remounts this component per view (key), so the remembered choice is read once.
  const [spreadsheet, setSpreadsheet] = useState(() => readMode(view.id));
  const toggle = () => setSpreadsheet((current) => { writeMode(view.id, !current); return !current; });

  return <>
    <div className="spreadsheet-switch-row">
      <button type="button" role="switch" aria-checked={spreadsheet} className="spreadsheet-switch" onClick={toggle}>
        <span className="spreadsheet-switch-track" aria-hidden="true"><span /></span>
        <Sheet size={16} aria-hidden="true" />
        {fr ? "Mode tableur" : "Spreadsheet mode"}
      </button>
      <span className="spreadsheet-switch-hint">{spreadsheet
        ? fr ? "Modifiez les cellules directement. Entrée valide, Échap annule, les flèches déplacent la sélection." : "Edit cells in place. Enter saves, Escape cancels, arrow keys move the selection."
        : fr ? "Activez-le pour saisir et modifier les données comme dans un tableur." : "Turn it on to enter and change data as in a spreadsheet."}</span>
    </div>
    {spreadsheet ? <SpreadsheetGrid {...props} /> : <ReadOnlyTable {...props} />}
  </>;
}

function ReadOnlyTable({ collection, view, entries, language, onOpenEntry, onOpenLedger }: Props) {
  const fr = language === "fr";
  const allFields = collection.formats.flatMap((format) => format.fields);
  return <div className="saved-view-table-wrap"><table className="saved-view-table"><thead><tr><th>{fr ? "Format de données" : "Data format"}</th><th>{fr ? "Créée" : "Created"}</th>{view.columnFieldIds.map((fieldId) => <th key={fieldId}>{allFields.find((field) => field.id === fieldId)?.name ?? fieldId}</th>)}<th>{fr ? "Action" : "Action"}</th></tr></thead>
    <tbody>{entries.map((entry) => <tr key={entry.id}><td>{collection.formats.find((format) => format.id === entry.formatId)?.name}</td><td>{dateTimeText(entry.createdAt, language)}</td>{view.columnFieldIds.map((fieldId) => {
      const field = collection.formats.find((item) => item.id === entry.formatId)?.fields.find((item) => item.id === fieldId);
      const value = entry.values.find((item) => item.fieldId === fieldId);
      return <td key={fieldId}>{field && value ? formatFieldValue(field, value.value, language, value.unitSnapshot, collection) : "—"}</td>;
    })}<td><button type="button" onClick={() => entry.ledgerHash ? onOpenLedger() : onOpenEntry(entry)}>{entry.ledgerHash ? fr ? "Ouvrir le registre" : "Open register" : t(language, "edit")}</button></td></tr>)}</tbody></table></div>;
}

type Cell = { row: number; col: number };
type Editing = Cell & { draft: string };

function SpreadsheetGrid({ collection, view, entries, language, errorText, onOpenEntry, onOpenLedger, onEntrySaved, onCollectionChanged, onEditFormat }: Props) {
  const fr = language === "fr";
  // A spreadsheet holds one data format: its rows share the same columns.
  const viewFormats = collection.formats.filter((format) => !view.formatIds.length || view.formatIds.includes(format.id));
  const [formatId, setFormatId] = useState(() => viewFormats.find((format) => entries.some((entry) => entry.formatId === format.id))?.id ?? viewFormats[0]?.id ?? "");
  const format = collection.formats.find((item) => item.id === formatId) ?? viewFormats[0];
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const rows = useMemo(() => {
    const own = entries.filter((entry) => entry.formatId === format?.id);
    return [...own.filter((entry) => !createdIds.includes(entry.id)), ...createdIds.flatMap((id) => own.filter((entry) => entry.id === id))];
  }, [entries, format?.id, createdIds]);
  const [active, setActive] = useState<Cell>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [draftRow, setDraftRow] = useState(false);
  const [saving, setSaving] = useState<string>("");
  const [problem, setProblem] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const gridRef = useRef<HTMLTableElement>(null);
  const cancelled = useRef(false);
  const inFlight = useRef(false);

  const fields = format?.fields ?? [];
  const rowCount = rows.length + (draftRow ? 1 : 0);
  // The selected cell keeps the keyboard focus, except while its editor has it.
  const isEditing = editing !== null;
  useEffect(() => { if (!isEditing) gridRef.current?.querySelector<HTMLElement>(`[data-cell="${active.row}:${active.col}"]`)?.focus(); }, [active, isEditing]);

  if (!format) return <p className="spreadsheet-empty">{fr ? "Cette vue ne contient aucun format de données." : "This view has no data format."}</p>;

  const entryAt = (row: number): Entry | undefined => rows[row];
  const locked = (entry: Entry | undefined) => !!entry && (!!entry.ledgerHash || !!entry.offlinePending || !!format.appendOnly);
  const editorFor = (field: Field, entry: Entry | undefined): CellEditor => locked(entry) ? "none" : cellEditor(field, format);
  const storedValue = (entry: Entry | undefined, field: Field) => entry?.values.find((item) => item.fieldId === field.id)?.value ?? "";

  const move = (row: number, col: number) => setActive({ row: Math.max(0, Math.min(rowCount - 1, row)), col: Math.max(0, Math.min(fields.length - 1, col)) });
  const openFull = (entry: Entry | undefined) => { if (entry) { if (entry.ledgerHash) onOpenLedger(); else onOpenEntry(entry); } };

  function startEditing(cell: Cell, initial?: string) {
    const entry = entryAt(cell.row), field = fields[cell.col];
    if (!field) return;
    const kind = editorFor(field, entry);
    if (kind === "none") { if (entry) openFull(entry); else setProblem(fr ? "Ce type de champ se remplit dans le formulaire complet : enregistrez d’abord une autre cellule de la ligne." : "This kind of field is filled in the full form: save another cell of the row first."); return; }
    if (kind === "boolean") { void commit(cell, storedValue(entry, field) === "true" ? "false" : "true"); return; }
    setProblem("");
    cancelled.current = false;
    setEditing({ ...cell, draft: initial ?? toEditable(field, storedValue(entry, field), language) });
  }

  /** Saves one cell; on failure the typed text stays in the cell with the reason. */
  async function commit(cell: Cell, raw: string, then?: Cell) {
    const entry = entryAt(cell.row), field = fields[cell.col];
    // Enter saves and moves; the blur that follows must not send the same change twice.
    if (!field || inFlight.current) return;
    const result = toStored(field, raw);
    if (!result.ok) { setProblem(`${field.name} : ${t(language, result.error)}`); return; }
    if (result.value === storedValue(entry, field)) { setEditing(null); if (then) move(then.row, then.col); return; }
    const values = valuesWithCell(entry, field.id, result.value);
    if (!values.length) {
      if (!entry) { setEditing(null); return; }
      setProblem(t(language, "emptyEntry"));
      return;
    }
    const key = `${cell.row}:${cell.col}`;
    setSaving(key);
    inFlight.current = true;
    try {
      const saved = await api.saveEntry(collection.id, values, entry?.id, format.id, { clientMutationId: crypto.randomUUID(), expectedUpdatedAt: entry?.updatedAt });
      if (!entry) { setCreatedIds((current) => [...current, saved.id]); setDraftRow(false); }
      onEntrySaved(saved);
      setEditing(null);
      setProblem("");
      if (then) move(then.row, then.col);
    } catch (cause) {
      setProblem(`${field.name} : ${errorText(cause)}`);
    } finally { inFlight.current = false; setSaving(""); }
  }

  function onGridKey(event: KeyboardEvent<HTMLTableElement>) {
    if (editing || addingColumn) return;
    const { row, col } = active;
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(row + 1, col), ArrowUp: () => move(row - 1, col), ArrowRight: () => move(row, col + 1), ArrowLeft: () => move(row, col - 1),
      Home: () => move(row, 0), End: () => move(row, fields.length - 1),
      Enter: () => startEditing(active), F2: () => startEditing(active), " ": () => { if (fields[col]?.kind === "BOOLEAN") startEditing(active); },
      Delete: () => clearCell(), Backspace: () => clearCell(),
    };
    if (keys[event.key]) { event.preventDefault(); keys[event.key](); return; }
    const field = fields[col];
    // Typing replaces the cell, as in a spreadsheet.
    if (field && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && ["text", "url", "character", "longText", "number", "duration"].includes(editorFor(field, entryAt(row)))) {
      event.preventDefault();
      startEditing(active, event.key);
    }
  }
  function clearCell() {
    const entry = entryAt(active.row), field = fields[active.col];
    if (!entry || !field || editorFor(field, entry) === "none" || !storedValue(entry, field)) return;
    void commit(active, "");
  }
  function finishKey(event: KeyboardEvent, multiline: boolean) {
    if (!editing) return;
    if (event.key === "Escape") { event.preventDefault(); cancelled.current = true; setEditing(null); setProblem(""); return; }
    if (event.key === "Enter" && !(multiline && (event.shiftKey || event.altKey))) { event.preventDefault(); void commit(editing, editing.draft, { row: editing.row + (event.shiftKey ? -1 : 1), col: editing.col }); return; }
    if (event.key === "Tab") { event.preventDefault(); void commit(editing, editing.draft, { row: editing.row, col: editing.col + (event.shiftKey ? -1 : 1) }); }
  }
  const blurCommit = () => { if (editing && !cancelled.current) void commit(editing, editing.draft); };

  function editor(field: Field, kind: CellEditor) {
    if (!editing) return null;
    const draft = editing.draft;
    const set = (value: string) => setEditing((current) => current && { ...current, draft: value });
    const label = field.name;
    if (kind === "select") return <select autoFocus aria-label={label} value={draft} onChange={(event) => void commit(editing, event.target.value)} onKeyDown={(event) => finishKey(event, false)} onBlur={() => { if (!cancelled.current) setEditing(null); }}><option value="">—</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    if (kind === "date" || kind === "time" || kind === "datetime") {
      const temporal = kind === "date" ? "DATE" : kind === "time" ? "TIME" : "DATETIME";
      // An unfinished date reads as "", so leaving the cell keeps the saved value; Delete clears it.
      return <span className="spreadsheet-temporal" onKeyDown={(event) => finishKey(event, false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !cancelled.current) { if (draft) void commit(editing, draft); else setEditing(null); } }}>
        <TemporalFieldInput kind={temporal} language={language} value={draft} onChange={set} autoFocus aria-label={label} />
      </span>;
    }
    if (kind === "longText") return <textarea autoFocus aria-label={label} rows={3} value={draft} onChange={(event) => set(event.target.value)} onKeyDown={(event) => finishKey(event, true)} onBlur={blurCommit} />;
    const unit = kind === "number" && field.unit ? <span className="spreadsheet-unit">{collection.units.find((item) => `local:${item.id}` === field.unit || item.id === field.unit)?.symbol ?? unitSymbol(field.unit)}</span> : null;
    return <span className="spreadsheet-text-editor"><input autoFocus aria-label={label} value={draft} inputMode={kind === "number" ? "decimal" : kind === "url" ? "url" : undefined} placeholder={kind === "duration" ? "1:30" : kind === "url" ? "https://" : undefined} maxLength={kind === "character" ? 2 : undefined} onChange={(event) => set(event.target.value)} onKeyDown={(event) => finishKey(event, false)} onBlur={blurCommit} onFocus={(event) => { const end = event.target.value.length; event.target.setSelectionRange(end, end); }} />{unit}</span>;
  }

  function display(entry: Entry | undefined, field: Field) {
    const value = entry?.values.find((item) => item.fieldId === field.id);
    if (field.kind === "BOOLEAN") return <span className={`spreadsheet-check ${value?.value === "true" ? "is-on" : ""}`} aria-hidden="true">{value?.value === "true" ? "✓" : ""}</span>;
    if (!value?.value) return <span className="spreadsheet-blank" aria-hidden="true" />;
    return formatFieldValue(field, value.value, language, value.unitSnapshot, collection);
  }

  const addRow = () => { setDraftRow(true); setActive({ row: rows.length, col: 0 }); setTimeout(() => startEditingAt(rows.length), 0); };
  const startEditingAt = (row: number) => { const col = Math.max(0, fields.findIndex((field) => cellEditor(field, format) !== "none")); setActive({ row, col }); setEditing({ row, col, draft: "" }); };
  const canAddColumn = !format.linkedSource && fields.length < 30;

  return <div className="spreadsheet">
    {viewFormats.length > 1 && <label className="spreadsheet-format">{fr ? "Format de données de la feuille" : "Data format of the sheet"}<select value={format.id} onChange={(event) => { setFormatId(event.target.value); setActive({ row: 0, col: 0 }); setEditing(null); setDraftRow(false); }}>{viewFormats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {problem && <p className="spreadsheet-problem" role="alert">{problem}</p>}
    <div className="spreadsheet-scroll" style={{ ["--format-tint" as string]: format.color }}>
      <table ref={gridRef} role="grid" aria-label={fr ? `Feuille ${format.name}` : `${format.name} sheet`} aria-rowcount={rowCount + 1} aria-colcount={fields.length + 2} className="spreadsheet-grid" onKeyDown={onGridKey}>
        <thead><tr>
          <th scope="col" className="spreadsheet-rownum" aria-label={fr ? "Ligne" : "Row"}>#</th>
          {fields.map((field) => <th key={field.id} scope="col"><span className="spreadsheet-col-name">{field.name}</span><span className="spreadsheet-col-kind">{fieldKindLabel(language, field.kind)}{field.kind === "NUMBER" && field.unit ? ` · ${collection.units.find((item) => `local:${item.id}` === field.unit)?.symbol ?? unitSymbol(field.unit)}` : ""}</span></th>)}
          <th scope="col" className="spreadsheet-add-col">
            <button type="button" disabled={!canAddColumn} aria-describedby={canAddColumn ? undefined : "spreadsheet-add-col-why"} onClick={() => setAddingColumn(true)}><Plus size={16} aria-hidden="true" />{fr ? "Colonne" : "Column"}</button>
            {!canAddColumn && <span id="spreadsheet-add-col-why" className="spreadsheet-why">{format.linkedSource ? fr ? "Format lié : modifiez la source." : "Linked format: change the source." : fr ? "30 champs au maximum." : "30 fields at most."}</span>}
          </th>
        </tr></thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, row) => {
            const entry = entryAt(row);
            return <tr key={entry?.id ?? "draft"} aria-rowindex={row + 2} className={locked(entry) ? "is-locked" : undefined}>
              <th scope="row" className="spreadsheet-rownum">{entry ? row + 1 : "*"}</th>
              {fields.map((field, col) => {
                const isActive = active.row === row && active.col === col;
                const isEditing = editing?.row === row && editing.col === col;
                const kind = editorFor(field, entry);
                return <td key={field.id} role="gridcell" data-cell={`${row}:${col}`} tabIndex={isActive && !isEditing ? 0 : -1} aria-selected={isActive}
                  aria-readonly={kind === "none"} aria-busy={saving === `${row}:${col}`}
                  className={`${isActive ? "is-active" : ""} ${isEditing ? "is-editing" : ""} ${kind === "none" ? "is-readonly" : ""} ${field.kind === "NUMBER" ? "is-number" : ""}`}
                  onClick={() => { if (!isEditing) { setActive({ row, col }); if (field.kind === "BOOLEAN" && isActive) startEditing({ row, col }); } }}
                  onDoubleClick={() => startEditing({ row, col })}>
                  {isEditing ? editor(field, kind) : display(entry, field)}
                </td>;
              })}
              <td className="spreadsheet-open">{entry && <button type="button" aria-label={fr ? `Ouvrir la ligne ${row + 1}` : `Open row ${row + 1}`} onClick={() => openFull(entry)}><SquareArrowOutUpRight size={16} aria-hidden="true" /></button>}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className="spreadsheet-actions">
      <Button variant="secondary" onClick={addRow} disabled={draftRow}><Plus size={16} aria-hidden="true" />{fr ? "Ajouter une ligne" : "Add a row"}</Button>
      {saving && <span className="spreadsheet-saving" role="status">{fr ? "Enregistrement…" : "Saving…"}</span>}
    </div>
    {addingColumn && <AddColumnDialog collection={collection} format={format} language={language} errorText={errorText} onClose={() => setAddingColumn(false)} onMoreKinds={() => { setAddingColumn(false); onEditFormat(format.id); }} onSaved={(updated) => { onCollectionChanged(updated); setAddingColumn(false); setActive({ row: 0, col: fields.length }); }} />}
  </div>;
}

function AddColumnDialog({ collection, format, language, errorText, onClose, onSaved, onMoreKinds }: { collection: Collection; format: CollectionFormat; language: Language; errorText: (cause: unknown) => string; onClose: () => void; onSaved: (collection: Collection) => void; onMoreKinds: () => void }) {
  const fr = language === "fr";
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FieldKind>("TEXT");
  // No unit is preselected: a number column needs an explicit choice, "no unit" included.
  const [unitChoice, setUnitChoice] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const unit = unitChoice === "custom" ? customUnit.trim() : unitChoice === "none" ? "" : unitChoice;
  const options = optionsText.split("\n").map((value) => value.trim()).filter(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const column = { name, kind, unit, options };
    const problem = columnProblem(format, column, unitChoice);
    if (problem === "unitRequired") return setError(fr ? "Choisissez une unité, ou « Sans unité »." : "Choose a unit, or “No unit”.");
    if (problem === "tooManyFields") return setError(fr ? "Un format de données compte 30 champs au maximum." : "A data format has 30 fields at most.");
    if (problem) return setError(t(language, problem));
    setBusy(true);
    try { onSaved(await api.updateFormat(collection.id, format.id, format.name, format.version ?? 1, fieldsWithColumn(format, column))); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return <Modal title={fr ? `Nouvelle colonne · ${format.name}` : `New column · ${format.name}`} closeLabel={t(language, "close")} onClose={onClose}>
    <form className="spreadsheet-column-form" onSubmit={(event) => void submit(event)} noValidate>
      <p className="spreadsheet-column-intro">{fr ? "La colonne devient un champ du format de données : elle apparaît aussi dans le formulaire des entrées." : "The column becomes a field of the data format: it also appears in the entry form."}</p>
      <label className="input-label">{fr ? "Nom de la colonne" : "Column name"}<input autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="input-label">{fr ? "Type de champ" : "Field type"}<select value={kind} onChange={(event) => { setKind(event.target.value as FieldKind); setError(""); }}>{spreadsheetColumnKinds.map((item) => <option key={item} value={item}>{fieldKindLabel(language, item)}</option>)}</select></label>
      {kind === "NUMBER" && <label className="input-label">{t(language, "unit")}
        <select value={unitChoice} onChange={(event) => setUnitChoice(event.target.value)} required aria-invalid={error !== "" && !unitChoice}>
          <option value="" disabled>{fr ? "Choisir une unité…" : "Choose a unit…"}</option>
          <option value="none">{t(language, "noUnit")}</option>
          {unitCategories.map((category) => <optgroup key={category} label={t(language, category)}>{numberUnits.filter((item) => item.category === category).map((item) => <option key={item.code} value={item.code}>{unitLabel(item, language)}</option>)}</optgroup>)}
          {collection.units.length ? <optgroup label={t(language, "localUnits")}>{collection.units.map((item) => <option key={item.id} value={`local:${item.id}`}>{item.name} ({item.symbol})</option>)}</optgroup> : null}
          <option value="custom">{t(language, "customUnit")}</option>
        </select>
        {unitChoice === "custom" && <input className="custom-unit-input" value={customUnit} onChange={(event) => setCustomUnit(event.target.value)} placeholder={t(language, "customUnitHint")} maxLength={24} required aria-label={t(language, "customUnit")} />}
        <small>{fr ? "L’unité ne pourra plus changer une fois des valeurs saisies." : "The unit cannot change once values are entered."}</small>
      </label>}
      {kind === "SELECT" && <label className="input-label">{t(language, "options")}<textarea rows={4} value={optionsText} onChange={(event) => setOptionsText(event.target.value)} placeholder={fr ? "Un choix par ligne" : "One choice per line"} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="spreadsheet-column-buttons">
        <button type="button" className="spreadsheet-more-kinds" onClick={onMoreKinds}>{fr ? "Autres types (pièce jointe, référence, mesure, code, lieu…)" : "Other types (attachment, reference, measure, code, place…)"}</button>
        <Button variant="secondary" onClick={onClose}>{fr ? "Annuler" : "Cancel"}</Button>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? fr ? "Ajout…" : "Adding…" : fr ? "Ajouter la colonne" : "Add the column"}</Button>
      </div>
    </form>
  </Modal>;
}
