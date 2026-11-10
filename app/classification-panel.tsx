"use client";

import { useMemo, useState } from "react";
import { api } from "../lib/api";
import type { ClassificationCode, ClassificationList, Collection, Language } from "../lib/brainy";
import { buildCodeTree, descendantCodes, MAX_CODE_LEVELS, type CodeNode } from "../lib/code-tree";
import { CodeBrowser, CodePicker } from "./code-picker";
import { ReferentialImport } from "./referential-import";
import { RemoteCodeBrowser } from "./remote-code-browser";

const starter: ClassificationCode[] = [
  { code: "education", labelEn: "Education", labelFr: "Éducation", active: true },
  { code: "primary", labelEn: "Primary", labelFr: "Primaire", parentCode: "education", active: true },
  { code: "secondary", labelEn: "Secondary", labelFr: "Secondaire", parentCode: "education", active: true },
  { code: "tertiary", labelEn: "Tertiary", labelFr: "Supérieur", parentCode: "education", active: true },
];

export default function ClassificationPanel({ collection, targets, language, onChanged }: { collection: Collection; targets: Collection[]; language: Language; onChanged: (updated: Collection) => void }) {
  const fr = language === "fr";
  const [listId, setListId] = useState("");
  const selected = collection.codeLists?.find((item) => item.id === listId);
  const large = !!selected?.external;
  const [name, setName] = useState("");
  const [codes, setCodes] = useState<ClassificationCode[]>([]);
  const [csv, setCsv] = useState("");
  const [csvErrors, setCsvErrors] = useState<{ row: number; message: string }[]>([]);
  const [copyTarget, setCopyTarget] = useState("");
  const [copyPreview, setCopyPreview] = useState<Awaited<ReturnType<typeof api.classificationCopyPreview>> | null>(null);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeTo, setMergeTo] = useState("");
  const [mergePreview, setMergePreview] = useState<Awaited<ReturnType<typeof api.classificationMergePreview>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const choose = (list?: ClassificationList) => { setListId(list?.id ?? ""); setName(list?.name ?? ""); setCodes(list?.codes.map((item) => ({ ...item })) ?? []); setCopyPreview(null); setMergePreview(null); setError(""); };
  const update = (index: number, patch: Partial<ClassificationCode>) => setCodes((current) => current.map((item, at) => at === index ? { ...item, ...patch } : item));
  const tree = useMemo(() => buildCodeTree(codes, language), [codes, language]);
  const tooDeep = [...tree.nodes.values()].find((node) => node.level > MAX_CODE_LEVELS);
  const parentFilter = (code: string) => { const below = descendantCodes(tree, code); return (node: CodeNode) => node.code !== code && !below.has(node.code); };
  const act = async (work: () => Promise<Collection>, done: string) => { setBusy(true); setError(""); setNotice(""); try { const updated = await work(); onChanged(updated); setNotice(done); return updated; } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setBusy(false); } };

  return <section className="classification-panel" aria-label={fr ? "Classifications" : "Classifications"}>
    <h1>{fr ? "Listes de codes" : "Code lists"}</h1>
    <p>{fr ? "Créez une liste locale avant d’ajouter un champ « code » à un format de données. Les codes restent stables quand les libellés changent." : "Create a local list before adding a code field to a data format. Codes stay stable when labels change."}</p>
    <div className="classification-toolbar"><label>{fr ? "Liste" : "List"}<select value={listId} onChange={(event) => choose(collection.codeLists?.find((item) => item.id === event.target.value))}><option value="">{fr ? "Nouvelle liste" : "New list"}</option>{collection.codeLists?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={() => { choose(); setName(fr ? "Niveaux d’études" : "Education levels"); setCodes(starter.map((item) => ({ ...item }))); }}>{fr ? "Utiliser un modèle" : "Use a starter list"}</button></div>
    {!large && <>
    <label>{fr ? "Nom de la liste" : "List name"}<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
    <div className="classification-table-wrap"><table><thead><tr><th>{fr ? "Code stable" : "Stable code"}</th><th>English</th><th>Français</th><th>{fr ? "Parent" : "Parent"}</th><th>{fr ? "Actif" : "Active"}</th><th><span className="sr-only">{fr ? "Actions" : "Actions"}</span></th></tr></thead><tbody>{codes.map((item, index) => <tr key={`${index}:${item.code}`}><td><input aria-label={`${fr ? "Code" : "Code"} ${index + 1}`} value={item.code} disabled={!!selected?.codes.some((old) => old.code === item.code)} onChange={(event) => update(index, { code: event.target.value })} /></td><td><input aria-label={`English ${index + 1}`} value={item.labelEn} onChange={(event) => update(index, { labelEn: event.target.value })} /></td><td><input aria-label={`Français ${index + 1}`} value={item.labelFr} onChange={(event) => update(index, { labelFr: event.target.value })} /></td><td><CodePicker codes={codes} language={language} value={item.parentCode ?? ""} ariaLabel={`${fr ? "Parent" : "Parent"} ${index + 1}`} emptyLabel={fr ? "Aucun parent" : "No parent"} canSelect={parentFilter(item.code)} onChange={(next) => update(index, { parentCode: next || undefined })} /></td><td><input type="checkbox" aria-label={`${fr ? "Actif" : "Active"} ${index + 1}`} checked={item.active} onChange={(event) => update(index, { active: event.target.checked })} /></td><td>{!selected?.codes.some((old) => old.code === item.code) && <button type="button" className="code-remove" aria-label={`${fr ? "Retirer le code" : "Remove code"} ${item.code || index + 1}`} onClick={() => setCodes((current) => current.filter((_, at) => at !== index))}>×</button>}</td></tr>)}</tbody></table></div>
    <div className="classification-actions"><button type="button" onClick={() => setCodes((current) => [...current, { code: "", labelEn: "", labelFr: "", active: true }])}>{fr ? "Ajouter un code" : "Add code"}</button>{tooDeep && <p className="form-error" role="alert">{fr ? `La hiérarchie dépasse ${MAX_CODE_LEVELS} niveaux au code ${tooDeep.code}.` : `The hierarchy exceeds ${MAX_CODE_LEVELS} levels at code ${tooDeep.code}.`}</p>}{(!name.trim() || !codes.length) && <p className="action-help">{fr ? "Nommez la liste et ajoutez un code pour continuer." : "Name the list and add a code to continue."}</p>}<button type="button" disabled={busy || !name.trim() || !codes.length} onClick={async () => { const updated = await act(() => api.saveClassification(collection.id, name, codes, selected?.id, selected?.version), fr ? "Liste enregistrée" : "List saved"); if (updated && !selected) choose(updated.codeLists.find((item) => item.name === name)); }}>{fr ? "Enregistrer" : "Save"}</button></div>
    {!!codes.length && <details><summary>{fr ? "Parcourir l’arborescence" : "Browse the tree"}</summary><CodeBrowser codes={codes} language={language} /></details>}
    <details><summary>{fr ? "Importer un CSV" : "Import CSV"}</summary><p>code,label_en,label_fr,parent_code,active</p><textarea rows={5} value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="CSV" /><button type="button" disabled={!csv.trim() || busy} onClick={async () => { try { const preview = await api.previewClassificationCsv(csv); setCsvErrors(preview.errors); if (!preview.errors.length) { setCodes(preview.codes); setNotice(fr ? `${preview.codes.length} codes prêts. Vérifiez puis enregistrez.` : `${preview.codes.length} codes ready. Review and save.`); } } catch (cause) { setError(String(cause)); } }}>{fr ? "Voir l’aperçu" : "Preview"}</button>{csvErrors.map((item) => <p role="alert" key={`${item.row}:${item.message}`}>{fr ? "Ligne" : "Row"} {item.row}: {item.message}</p>)}</details>
    {selected && <details><summary>{fr ? "Copier vers une collection" : "Copy to a collection"}</summary><label>{fr ? "Collection cible" : "Target collection"}<select value={copyTarget} onChange={(event) => { setCopyTarget(event.target.value); setCopyPreview(null); }}><option value="">—</option>{targets.filter((item) => item.id !== collection.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" disabled={!copyTarget || busy} onClick={async () => { try { setCopyPreview(await api.classificationCopyPreview(collection.id, selected.id, copyTarget)); } catch (cause) { setError(String(cause)); } }}>{fr ? "Voir l’aperçu" : "Preview"}</button>{copyPreview && <p>{copyPreview.sourceName} → {copyPreview.targetName} · {copyPreview.codeCount} {fr ? "codes" : "codes"} {copyPreview.conflicts.join("; ")}</p>}<button type="button" disabled={!copyPreview?.allowed || busy} onClick={() => void act(() => api.copyClassification(collection.id, selected.id, copyTarget), fr ? "Liste copiée" : "List copied")}>{fr ? "Confirmer la copie" : "Confirm copy"}</button></details>}
    {selected && <details><summary>{fr ? "Fusionner deux codes" : "Merge two codes"}</summary><label>{fr ? "Code source" : "Source code"}<select value={mergeFrom} onChange={(event) => { setMergeFrom(event.target.value); setMergePreview(null); }}><option value="">—</option>{selected.codes.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label><label>{fr ? "Code cible" : "Target code"}<select value={mergeTo} onChange={(event) => { setMergeTo(event.target.value); setMergePreview(null); }}><option value="">—</option>{selected.codes.filter((item) => item.active).map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></label><button type="button" disabled={!mergeFrom || !mergeTo || busy} onClick={async () => { try { setMergePreview(await api.classificationMergePreview(collection.id, selected.id, mergeFrom, mergeTo)); } catch (cause) { setError(String(cause)); } }}>{fr ? "Voir l’impact" : "Preview impact"}</button>{mergePreview && <p>{mergePreview.affectedEntries} {fr ? "entrées seront mises à jour" : "entries will be updated"}</p>}<button type="button" disabled={!mergePreview?.allowed || busy} onClick={async () => { const updated = await act(() => api.mergeClassificationCodes(collection.id, selected.id, mergeFrom, mergeTo, selected.version), fr ? "Codes fusionnés" : "Codes merged"); if (updated) choose(updated.codeLists.find((item) => item.id === selected.id)); }}>{fr ? "Confirmer la fusion" : "Confirm merge"}</button></details>}
    </>}
    {large && selected && <div className="large-code-list" role="group" aria-label={selected.name}>
      <p><strong>{fr ? `${(selected.codeCount ?? 0).toLocaleString("fr")} codes sur ${selected.levels ?? 1} niveaux` : `${(selected.codeCount ?? 0).toLocaleString("en")} codes on ${selected.levels ?? 1} levels`}</strong> · {fr ? "grande liste, recherchée côté serveur" : "large list, searched on the server"}</p>
      <RemoteCodeBrowser collectionId={collection.id} listId={selected.id} language={language} />
    </div>}
    <details open={large}><summary>{selected ? (fr ? "Remplacer par un référentiel" : "Replace from a referential") : (fr ? "Importer un référentiel (CSV ou JSON)" : "Import a referential (CSV or JSON)")}</summary>
      <ReferentialImport key={`${selected?.id ?? "new"}-${selected?.version ?? 0}`} collection={collection} list={selected} language={language} onImported={(codeLists) => { onChanged({ ...collection, codeLists }); const next = selected ? codeLists.find((item) => item.id === selected.id) : codeLists.at(-1); choose(next); }} />
    </details>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
