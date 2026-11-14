"use client";

import { useEffect, useState } from "react";
import { api, type BackgroundJob } from "../lib/api";
import type { Collection, Language } from "../lib/brainy";

export default function BackgroundJobsPanel({ collections, language }: { collections: Collection[]; language: Language }) {
  const fr = language === "fr";
  const [open, setOpen] = useState(false);
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [formatId, setFormatId] = useState("");
  const [limit, setLimit] = useState(5000);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const collection = collections.find((item) => item.id === collectionId) ?? collections[0];
  const chosenFormatId = collection?.formats.some((item) => item.id === formatId) ? formatId : collection?.formats[0]?.id ?? "";

  // Polls only while a job is queued or running, and not while the tab is hidden: an idle panel uses no data.
  const working = jobs.some((job) => job.state === "QUEUED" || job.state === "RUNNING");
  useEffect(() => {
    if (!open || !collection?.id) return;
    let active = true;
    const refresh = async () => {
      try { const result = await api.backgroundJobs(collection.id); if (active) { setJobs(result); setError(""); } }
      catch (cause) { if (active) setError(String(cause)); }
    };
    void refresh();
    if (!working) return () => { active = false; };
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 3000);
    return () => { active = false; window.clearInterval(interval); };
  }, [open, collection?.id, working]);

  async function run(action: () => Promise<BackgroundJob>) {
    setBusy(true); setError("");
    try { const job = await action(); setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]); }
    catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }

  async function importFile() {
    if (!file || !collection) return;
    await run(async () => {
      if (file.size > 2_000_000) throw new Error(fr ? "Fichier trop volumineux (2 Mo maximum)." : "File is too large (2 MB maximum).");
      const data: unknown = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || !("formatId" in data) || !("rows" in data)) throw new Error(fr ? "Le fichier doit contenir formatId et rows." : "The file must contain formatId and rows.");
      return api.startBackgroundJob(collection.id, "IMPORT", data);
    });
  }

  function downloadTemplate() {
    if (!collection || !chosenFormatId) return;
    const fieldId = collection.formats.find((item) => item.id === chosenFormatId)?.fields[0]?.id;
    if (!fieldId) return;
    const timestamp = new Date().toISOString();
    const payload = { formatId: chosenFormatId, rows: [{ sourceId: "row-1", createdAt: timestamp, updatedAt: timestamp, values: [{ fieldId, value: fr ? "Exemple" : "Example" }] }] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "brainy-import-template.json"; link.click(); URL.revokeObjectURL(url);
  }

  async function download(job: BackgroundJob) {
    setBusy(true); setError("");
    try {
    const detailed = await api.backgroundJob(job.id);
    if (!detailed.result) throw new Error(fr ? "Résultat indisponible." : "Result is unavailable.");
    const url = URL.createObjectURL(new Blob([detailed.result], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `brainy-${job.kind.toLowerCase()}-${job.id}.json`; link.click();
    URL.revokeObjectURL(url);
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }

  const states: Record<string, string> = fr
    ? { QUEUED: "En attente", RUNNING: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", FAILED: "Échec" }
    : { QUEUED: "Queued", RUNNING: "Running", COMPLETED: "Completed", CANCELLED: "Cancelled", FAILED: "Failed" };
  const kinds: Record<string, string> = fr
    ? { IMPORT: "Import", EXPORT: "Export", RECALCULATE: "Recalcul", CHART: "Graphique", FORECAST: "Prévision" }
    : { IMPORT: "Import", EXPORT: "Export", RECALCULATE: "Recalculation", CHART: "Chart", FORECAST: "Forecast" };

  return <details className="workspace-backup-panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>{fr ? "Traitements en arrière-plan" : "Background tasks"}</summary>
    <div>
      <p>{fr ? "Les imports continuent par lots. Vous pouvez fermer cette page puis revenir suivre leur progression." : "Imports continue in batches. You can close this page and return to check progress."}</p>
      <label>{fr ? "Collection" : "Collection"}<select value={collection?.id ?? ""} onChange={(event) => { setCollectionId(event.target.value); setFormatId(""); setJobs([]); }}>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {collection && <>
        <button type="button" disabled={!chosenFormatId} onClick={downloadTemplate}>{fr ? "Télécharger un modèle JSON" : "Download a JSON template"}</button>
        <label>{fr ? "Fichier de lots d’entrées (JSON, 2 Mo maximum)" : "Entry batch file (JSON, 2 MB maximum)"}<input type="file" accept=".json,application/json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <button type="button" disabled={busy || !file} onClick={() => void importFile()}>{fr ? "Lancer l’import" : "Start import"}</button>
        <label>{fr ? "Format de données à exporter" : "Data format to export"}<select value={chosenFormatId} onChange={(event) => setFormatId(event.target.value)}>{collection.formats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{fr ? "Entrées maximum" : "Maximum entries"}<input type="number" min="1" max="5000" value={limit} onChange={(event) => setLimit(Number(event.target.value))} /></label>
        <label><input type="checkbox" checked={includeSensitive} onChange={(event) => setIncludeSensitive(event.target.checked)} /> {fr ? "Inclure explicitement les champs personnels et sensibles" : "Explicitly include personal and sensitive fields"}</label>
        <button type="button" disabled={busy || !chosenFormatId || limit < 1 || limit > 5000} onClick={() => void run(() => api.startBackgroundJob(collection.id, "EXPORT", { formatId: chosenFormatId, limit, includeSensitive }))}>{fr ? "Préparer l’export" : "Prepare export"}</button>
      </>}
      {jobs.length === 0 && <p>{fr ? "Aucun traitement récent dans cette collection." : "No recent tasks in this collection."}</p>}
      <div aria-live="polite">{jobs.map((job) => <article key={job.id} className="workspace-backup-panel">
        <strong>{kinds[job.kind] ?? job.kind} · {states[job.state] ?? job.state}</strong>
        <span>{job.processed} / {job.total} · {new Date(job.createdAt).toLocaleString(language)}</span>
        <progress value={job.processed} max={Math.max(1, job.total)} />
        {job.kind === "IMPORT" && <span>{job.createdCount} {fr ? "créées" : "created"} · {job.skippedCount} {fr ? "déjà présentes" : "already present"} · {job.errorCount} {fr ? "erreurs" : "errors"}</span>}
        {job.failure && <p role="alert">{job.failure}</p>}
        {job.logs.length > 0 && <details><summary>{fr ? "Erreurs par ligne" : "Row errors"} ({job.logs.length})</summary><ul>{job.logs.map((log, index) => <li key={`${log.row}-${index}`}>{fr ? "Ligne" : "Row"} {log.row}: {log.message}</li>)}</ul></details>}
        {(job.state === "QUEUED" || job.state === "RUNNING") && <button type="button" onClick={() => void run(() => api.cancelBackgroundJob(job.id))}>{fr ? "Annuler" : "Cancel"}</button>}
        {(job.state === "CANCELLED" || job.state === "FAILED") && <button type="button" onClick={() => void run(() => api.resumeBackgroundJob(job.id))}>{fr ? "Reprendre" : "Resume"}</button>}
        {job.state === "COMPLETED" && <button type="button" disabled={busy} onClick={() => void download(job)}>{fr ? "Télécharger le résultat" : "Download result"}</button>}
      </article>)}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </details>;
}
