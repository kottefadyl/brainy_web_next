"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import type { ClassificationList, Collection, Language } from "../lib/brainy";
import { formatOf, MAX_REFERENTIAL_BYTES, referentialApi, type ReferentialFormat, type ReferentialPreview } from "../lib/referentials";

/**
 * Import of a standard referential (T39/1): CSV or JSON, previewed before
 * saving. Up to 5,000 codes the list stays editable as before; beyond, up
 * to 50,000, it is stored apart and searched on the server (T39/3).
 */
export function ReferentialImport({ collection, list, language, onImported }: {
  collection: Collection; list?: ClassificationList; language: Language; onImported: (codeLists: Collection["codeLists"]) => void;
}) {
  const fr = language === "fr";
  const [name, setName] = useState(list?.name ?? "");
  const [file, setFile] = useState<{ name: string; format: ReferentialFormat; content: string } | null>(null);
  const [preview, setPreview] = useState<ReferentialPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const read = async (chosen: File | undefined) => {
    setError(""); setNotice(""); setPreview(null); setFile(null);
    if (!chosen) return;
    if (chosen.size > MAX_REFERENTIAL_BYTES) { setError(fr ? "Fichier trop lourd : 4 Mo au plus." : "File too large: 4 MB at most."); return; }
    const content = await chosen.text();
    const format = formatOf(chosen.name, content);
    setFile({ name: chosen.name, format, content });
    if (!name.trim()) setName(chosen.name.replace(/\.[^.]+$/, "").slice(0, 80));
    setBusy(true);
    try { setPreview(await referentialApi.preview(format, content)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!file || !preview || preview.errors.length) return;
    setBusy(true); setError("");
    try {
      const updated = await referentialApi.import(collection.id, name.trim(), file.format, file.content, list?.id, list?.version);
      onImported(updated.codeLists);
      setNotice(fr ? `${preview.codeCount.toLocaleString("fr")} codes importés.` : `${preview.codeCount.toLocaleString("en")} codes imported.`);
      setFile(null); setPreview(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };

  return <div className="referential-import">
    <p>{fr
      ? "CSV (virgules ou points-virgules) avec les colonnes code et label, ou label_en et label_fr, et parent_code facultatif ; ou JSON, plat ou imbriqué avec children. Jusqu’à 50 000 codes sur 8 niveaux."
      : "CSV (commas or semicolons) with code and label, or label_en and label_fr, columns and an optional parent_code; or JSON, flat or nested with children. Up to 50,000 codes on 8 levels."}</p>
    {list && <p className="referential-import-note">{fr ? "Le fichier remplace la liste : chaque code existant doit y rester (marquez-le inactif plutôt que de le retirer)." : "The file replaces the list: every existing code must stay in it (mark it inactive instead of removing it)."}</p>}
    <label>{fr ? "Nom de la liste" : "List name"}<input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>
    <label className="referential-file">{fr ? "Fichier du référentiel" : "Referential file"}<input type="file" accept=".csv,.json,.txt,text/csv,application/json" onChange={(event) => void read(event.target.files?.[0])} /></label>
    {busy && <p role="status">{fr ? "Lecture du fichier…" : "Reading the file…"}</p>}
    {preview && <div className="referential-preview" role="status">
      <strong>{fr ? `${preview.codeCount.toLocaleString("fr")} codes sur ${preview.levels} niveaux` : `${preview.codeCount.toLocaleString("en")} codes on ${preview.levels} levels`}</strong>
      {preview.large && <span>{fr ? "Grande liste : recherche côté serveur, modifiable seulement par un nouvel import." : "Large list: searched on the server, changed only by a new import."}</span>}
      {!!preview.errors.length && <ul className="form-error">{preview.errors.slice(0, 10).map((item, index) => <li key={index}>{item.row ? (fr ? `Ligne ${item.row} : ` : `Row ${item.row}: `) : ""}{item.message}</li>)}</ul>}
      {!preview.errors.length && <ul className="referential-sample">{preview.sample.slice(0, 5).map((item) => <li key={item.code}><code>{item.code}</code> {fr ? item.labelFr : item.labelEn}</li>)}</ul>}
    </div>}
    <button type="button" className="btn primary" disabled={busy || !file || !preview || !!preview.errors.length || !name.trim()} onClick={() => void save()}><FileUp size={17} aria-hidden="true" />{list ? (fr ? "Remplacer la liste" : "Replace the list") : (fr ? "Importer la liste" : "Import the list")}</button>
    {(!file || !name.trim()) && <p className="action-help">{fr ? "Choisissez un fichier et un nom pour continuer." : "Choose a file and a name to continue."}</p>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
