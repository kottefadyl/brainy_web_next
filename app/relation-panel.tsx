"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Collection, CollectionUnit, Entry, EntryRelation, Language } from "../lib/brainy";

function entryTitle(collection: Collection, entry: Entry): string {
  const field = collection.formats.find((format) => format.id === entry.formatId)?.fields.find((item) => item.kind === "TITLE");
  return entry.values.find((value) => value.fieldId === field?.id)?.value || entry.id.slice(-8);
}

export default function RelationPanel({ collection, entry, entries, language, onOpenEntry }: { collection: Collection; entry: Entry; entries: Entry[]; language: Language; onOpenEntry: (entry: Entry) => void }) {
  const fr = language === "fr";
  const [relations, setRelations] = useState<EntryRelation[]>([]);
  const [units, setUnits] = useState<CollectionUnit[]>([]);
  const [kind, setKind] = useState<EntryRelation["kind"]>("ASSOCIATION");
  const [target, setTarget] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("item");
  const [label, setLabel] = useState("");
  const [snapshotFieldId, setSnapshotFieldId] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [total, setTotal] = useState("");
  const [impact, setImpact] = useState<{ relations: EntryRelation[]; replacementAllowed: boolean } | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { let live = true; Promise.all([api.relations(collection.id, entry.id), api.availableUnits(collection.id)]).then(([items, catalog]) => { if (live) { setRelations(items); setUnits(catalog); } }).catch((cause) => { if (live) setError(String(cause)); }); return () => { live = false; }; }, [collection.id, entry.id]);
  const candidates = entries.filter((item) => item.id !== entry.id);
  const numericFields = [...new Set(collection.formats.flatMap((format) => format.fields.filter((field) => field.kind === "NUMBER" || field.kind === "MEASURE").map((field) => field.name)))];
  const targetEntry = entries.find((item) => item.id === target);
  const snapshotFields = collection.formats.find((format) => format.id === targetEntry?.formatId)?.fields.filter((field) => field.kind === "NUMBER" || field.kind === "MEASURE") ?? [];
  async function refresh() { setRelations(await api.relations(collection.id, entry.id)); }
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } }
  return <section className="relation-panel" aria-label={fr ? "Relations structurées" : "Structured relations"}>
    <h3>{fr ? "Relations structurées" : "Structured relations"}</h3>
    <p>{fr ? "Reliez des entrées, créez une hiérarchie ou ajoutez des composants avec quantité." : "Connect entries, build a hierarchy, or add components with a quantity."}</p>
    <label>{fr ? "Type de relation" : "Relation type"}<select value={kind} onChange={(event) => setKind(event.target.value as EntryRelation["kind"])}><option value="ASSOCIATION">{fr ? "Association" : "Association"}</option><option value="PARENT">{fr ? "Cette entrée a un parent" : "This entry has a parent"}</option><option value="COMPONENT">{fr ? "Cette entrée contient" : "This entry contains"}</option></select></label>
    <label>{fr ? "Entrée cible" : "Target entry"}<select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">—</option>{candidates.map((item) => <option key={item.id} value={item.id}>{entryTitle(collection, item)}</option>)}</select></label>
    {kind === "COMPONENT" && <div className="relation-quantity"><label>{fr ? "Quantité" : "Quantity"}<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>{fr ? "Unité" : "Unit"}<select value={unit} onChange={(event) => setUnit(event.target.value)}>{units.map((item) => <option key={item.id} value={collection.units.some((local) => local.id === item.id) ? `local:${item.id}` : item.id}>{item.name} ({item.symbol})</option>)}</select></label></div>}
    {kind === "COMPONENT" && <label>{fr ? "Figer la valeur d’un champ (facultatif)" : "Freeze a field value (optional)"}<select value={snapshotFieldId} onChange={(event) => setSnapshotFieldId(event.target.value)}><option value="">{fr ? "Valeur actuelle" : "Current value"}</option>{snapshotFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>}
    <label>{fr ? "Libellé facultatif" : "Optional label"}<input value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label>
    <button type="button" disabled={busy || !target} onClick={() => run(async () => { await api.createRelation(collection.id, entry.id, target, kind, label.trim(), kind === "COMPONENT" ? quantity.trim().replace(",", ".") : undefined, kind === "COMPONENT" ? unit : undefined, kind === "COMPONENT" ? snapshotFieldId || undefined : undefined); setTarget(""); setLabel(""); setSnapshotFieldId(""); await refresh(); })}>{fr ? "Ajouter la relation" : "Add relation"}</button>
    <ul>{relations.map((relation) => { const other = entries.find((item) => item.id === (relation.fromEntryId === entry.id ? relation.toEntryId : relation.fromEntryId)); return <li key={relation.id}><button type="button" onClick={() => { if (other) onOpenEntry(other); }}>{other ? entryTitle(collection, other) : "—"}</button><span>{relation.kind === "COMPONENT" ? `${relation.quantity} ${relation.unit}` : relation.kind === "PARENT" ? relation.fromEntryId === entry.id ? fr ? "Parent" : "Parent" : fr ? "Enfant" : "Child" : fr ? "Association" : "Association"}{relation.label ? ` · ${relation.label}` : ""}</span><button type="button" disabled={busy} onClick={() => run(async () => { await api.removeRelation(collection.id, relation.id); await refresh(); })}>{fr ? "Retirer" : "Remove"}</button></li>; })}</ul>
    <div className="relation-total"><label>{fr ? "Champ numérique à totaliser" : "Numeric field to total"}<select value={fieldName} onChange={(event) => setFieldName(event.target.value)}><option value="">—</option>{numericFields.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><button type="button" disabled={busy || !fieldName} onClick={() => run(async () => { const result = await api.relationTotal(collection.id, entry.id, kind === "PARENT" ? "PARENT" : "COMPONENT", fieldName); setTotal(`${result.value}${result.unit ? ` ${result.unit}` : ""} · ${result.nodes} ${fr ? "entrées" : "entries"}`); })}>{fr ? "Calculer le total" : "Calculate total"}</button>{total && <output>{total}</output>}</div>
    {relations.length > 0 && <div className="relation-impact"><h4>{fr ? "Avant de supprimer cette entrée" : "Before deleting this entry"}</h4><label>{fr ? "Remplacer par (facultatif)" : "Replace with (optional)"}<select value={replacementId} onChange={(event) => { setReplacementId(event.target.value); setImpact(null); }}><option value="">{fr ? "Détacher les relations" : "Detach relations"}</option>{candidates.map((item) => <option key={item.id} value={item.id}>{entryTitle(collection, item)}</option>)}</select></label><button type="button" disabled={busy} onClick={() => run(async () => setImpact(await api.relationImpact(collection.id, entry.id, replacementId || undefined)))}>{fr ? "Voir l’impact" : "Preview impact"}</button>{impact && <div role="status"><p>{impact.relations.length} {fr ? "relations touchées" : "affected relations"}</p>{replacementId && !impact.replacementAllowed ? <p>{fr ? "Ce remplacement n’est pas possible." : "This replacement is not possible."}</p> : <button type="button" disabled={busy} onClick={() => run(async () => { await api.detachRelations(collection.id, entry.id, replacementId || undefined); setImpact(null); await refresh(); })}>{fr ? "Confirmer le détachement" : "Confirm detachment"}</button>}</div>}</div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
