"use client";

// T32 — create or edit a data source: which file columns fill which fields of one data format.
import { useState, type FormEvent } from "react";
import { AccessibleListbox } from "./components/ui/AccessibleListbox";
import { Button } from "./components/ui/Button";
import type { Collection, Language } from "../lib/brainy";
import { formatDisplayName } from "../lib/brainy";
import { dataSourceKinds, type DataSource, type DataSourceInput } from "../lib/data-sources";

const tr = (language: Language, en: string, fr: string) => (language === "fr" ? fr : en);

export default function DataSourceForm({ collection, language, source, busy, onSubmit, onCancel }: {
  collection: Collection; language: Language; source?: DataSource; busy: boolean;
  onSubmit: (input: DataSourceInput) => void; onCancel: () => void;
}) {
  const formats = collection.formats.filter((format) => !format.appendOnly && !format.workflow);
  const [formatId, setFormatId] = useState(source?.formatId ?? formats[0]?.id ?? "");
  const format = collection.formats.find((item) => item.id === formatId);
  const fields = format?.fields.filter((field) => dataSourceKinds.has(field.kind)) ?? [];
  const initialColumns = (id: string) => Object.fromEntries((collection.formats.find((item) => item.id === id)?.fields ?? []).filter((field) => dataSourceKinds.has(field.kind)).map((field) => [field.id, field.name]));
  const [name, setName] = useState(source?.name ?? "");
  const [recordIdColumn, setRecordIdColumn] = useState(source?.recordIdColumn ?? "id");
  const [columns, setColumns] = useState<Record<string, string>>(() => source ? Object.fromEntries(source.mappings.map((item) => [item.fieldId, item.column])) : initialColumns(formatId));
  const [unitColumns, setUnitColumns] = useState<Record<string, string>>(() => Object.fromEntries((source?.mappings ?? []).filter((item) => item.unitColumn).map((item) => [item.fieldId, item.unitColumn!])));
  const [observedAtColumn, setObservedAtColumn] = useState(source?.observedAtColumn ?? "");
  const [qualityColumn, setQualityColumn] = useState(source?.qualityColumn ?? "");
  const [statusColumn, setStatusColumn] = useState(source?.statusColumn ?? "");
  const [decimalSeparator, setDecimalSeparator] = useState<"DOT" | "COMMA">(source?.decimalSeparator ?? (language === "fr" ? "COMMA" : "DOT"));
  const [delimiter, setDelimiter] = useState(source?.delimiter ?? (language === "fr" ? ";" : ","));
  const [updatePolicy, setUpdatePolicy] = useState<"UPDATE" | "KEEP_FIRST">(source?.updatePolicy ?? "UPDATE");
  const mapped = fields.filter((field) => columns[field.id]?.trim());
  const hasMeasure = mapped.some((field) => field.kind === "MEASURE");
  const titleField = format?.objectModel ? format.fields.find((field) => field.kind === "TITLE") : undefined;
  const missingTitle = !!format?.objectModel && (!titleField || !columns[titleField.id]?.trim());
  const blocked = !formatId ? tr(language, "Add an ordinary data format to this collection first.", "Ajoutez d’abord un format de données ordinaire à cette collection.")
    : !name.trim() ? tr(language, "Name the data source to continue.", "Nommez la source de données pour continuer.")
    : !recordIdColumn.trim() ? tr(language, "Choose the column that identifies each record.", "Choisissez la colonne qui identifie chaque enregistrement.")
    : !mapped.length ? tr(language, "Give at least one field a column name.", "Indiquez une colonne pour au moins un champ.")
    : missingTitle ? tr(language, "Objects need a column for their name.", "Les objets ont besoin d’une colonne pour leur nom.") : "";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    onSubmit({
      name: name.trim(), formatId, recordIdColumn: recordIdColumn.trim(), observedAtColumn: observedAtColumn.trim() || null, qualityColumn: qualityColumn.trim() || null, statusColumn: statusColumn.trim() || null,
      decimalSeparator, delimiter, updatePolicy,
      mappings: mapped.map((field) => ({ column: columns[field.id].trim(), fieldId: field.id, unitColumn: unitColumns[field.id]?.trim() || null })),
    });
  };
  const kindLabel = (kind: string) => kind === "MEASURE" ? tr(language, "measure", "mesure") : kind === "NUMBER" ? tr(language, "number", "nombre") : kind.toLowerCase().replace("_", " ");

  return <form className="data-source-form" onSubmit={submit}>
    <h2>{source ? tr(language, "Edit data source", "Modifier la source de données") : tr(language, "New data source", "Nouvelle source de données")}</h2>
    <div className="data-source-grid">
      <label>{tr(language, "Name", "Nom")}<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder={tr(language, "North station", "Station nord")} /></label>
      <div className="data-source-listbox">
        <AccessibleListbox label={tr(language, "Data format to fill", "Format de données à remplir")} value={formatId} disabled={!!source || !formats.length}
          options={formats.map((item) => ({ id: item.id, label: formatDisplayName(item, language), swatch: item.color }))}
          onChange={(value) => { setFormatId(value); setColumns(initialColumns(value)); setUnitColumns({}); }} />
        {source && <small>{tr(language, "The data format of a source cannot change.", "Le format de données d’une source ne change pas.")}</small>}
      </div>
    </div>
    <label>{tr(language, "Record ID column", "Colonne d’identifiant")}<input required maxLength={100} value={recordIdColumn} onChange={(event) => setRecordIdColumn(event.target.value)} aria-describedby="ds-record-help" />
      <small id="ds-record-help">{tr(language, "A stable ID from the source. Sending the same ID again updates the same entry instead of adding a copy.", "Un identifiant stable fourni par la source. Renvoyer le même identifiant met à jour la même entrée au lieu d’en ajouter une copie.")}</small></label>
    <fieldset className="data-source-mapping">
      <legend>{tr(language, "Columns to read", "Colonnes à lire")}</legend>
      <p>{tr(language, "Write the column name used in the file for each field. Leave it empty to ignore the field.", "Indiquez le nom de colonne du fichier pour chaque champ. Laissez vide pour ignorer le champ.")}</p>
      {fields.length ? fields.map((field) => <div key={field.id} className="data-source-map-row">
        <label>{field.name} <span className="data-source-kind">{kindLabel(field.kind)}{field.unit ? ` · ${field.unit}` : ""}</span>
          <input maxLength={100} value={columns[field.id] ?? ""} onChange={(event) => setColumns((current) => ({ ...current, [field.id]: event.target.value }))} aria-label={tr(language, `Column for ${field.name}`, `Colonne pour ${field.name}`)} /></label>
        {(field.kind === "NUMBER" || field.kind === "MEASURE") && columns[field.id]?.trim() && <label className="data-source-unit">{tr(language, "Unit column (optional)", "Colonne d’unité (facultatif)")}
          <input maxLength={100} value={unitColumns[field.id] ?? ""} onChange={(event) => setUnitColumns((current) => ({ ...current, [field.id]: event.target.value }))} /></label>}
      </div>) : <p className="action-help">{tr(language, "This data format has no field a file can fill.", "Ce format de données n’a aucun champ qu’un fichier peut remplir.")}</p>}
    </fieldset>
    <details className="data-source-advanced">
      <summary>{tr(language, "Dates, quality and file settings", "Dates, qualité et réglages du fichier")}</summary>
      <div className="data-source-grid">
        <label>{tr(language, "Fact date column", "Colonne de date du fait")}<input maxLength={100} value={observedAtColumn} onChange={(event) => setObservedAtColumn(event.target.value)} /><small>{tr(language, "When it happened, kept apart from when Brainy received it. An older version never overwrites a newer one.", "Quand le fait a eu lieu, distinct de sa réception. Une version plus ancienne n’écrase jamais une plus récente.")}</small></label>
        {hasMeasure && <label>{tr(language, "Quality column", "Colonne de qualité")}<input maxLength={100} value={qualityColumn} onChange={(event) => setQualityColumn(event.target.value)} /></label>}
        {hasMeasure && <label>{tr(language, "Measure status column", "Colonne de statut de mesure")}<input maxLength={100} value={statusColumn} onChange={(event) => setStatusColumn(event.target.value)} /><small>MEASURED, ESTIMATED, CALCULATED, ABSENT</small></label>}
        <div className="data-source-listbox"><AccessibleListbox label={tr(language, "Decimal separator", "Séparateur décimal")} value={decimalSeparator} onChange={(value) => setDecimalSeparator(value as "DOT" | "COMMA")} options={[{ id: "DOT", label: tr(language, "Point (12.5)", "Point (12.5)") }, { id: "COMMA", label: tr(language, "Comma (12,5)", "Virgule (12,5)") }]} /></div>
        <div className="data-source-listbox"><AccessibleListbox label={tr(language, "CSV column separator", "Séparateur de colonnes CSV")} value={delimiter} onChange={setDelimiter} options={[{ id: ",", label: tr(language, "Comma", "Virgule") }, { id: ";", label: tr(language, "Semicolon", "Point-virgule") }, { id: "\t", label: tr(language, "Tab", "Tabulation") }]} /></div>
        <div className="data-source-listbox"><AccessibleListbox label={tr(language, "When a record comes back", "Quand un enregistrement revient")} value={updatePolicy} onChange={(value) => setUpdatePolicy(value as "UPDATE" | "KEEP_FIRST")} options={[{ id: "UPDATE", label: tr(language, "Update the entry and keep its history", "Mettre à jour l’entrée et garder l’historique") }, { id: "KEEP_FIRST", label: tr(language, "Keep the first version", "Garder la première version") }]} /></div>
      </div>
    </details>
    {blocked && <p className="action-help">{blocked}</p>}
    <div className="data-source-actions">
      <Button type="submit" variant="primary" disabled={busy || !!blocked}>{source ? tr(language, "Save changes", "Enregistrer") : tr(language, "Create data source", "Créer la source")}</Button>
      <Button onClick={onCancel} disabled={busy}>{tr(language, "Cancel", "Annuler")}</Button>
    </div>
  </form>;
}
