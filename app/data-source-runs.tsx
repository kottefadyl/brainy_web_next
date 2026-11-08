"use client";

// T32 — deliveries of one data source: progress, measured results, explained rejections and repair.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/Button";
import type { Language } from "../lib/brainy";
import { dataSourceApi, dataSourceError, failureText, originLabel, rejectionLabel, runStateLabel, type DataSourceRun } from "../lib/data-sources";

const tr = (language: Language, en: string, fr: string) => (language === "fr" ? fr : en);
const active = (run: DataSourceRun) => run.state === "QUEUED" || run.state === "RUNNING";

function lagText(seconds: number, language: Language) {
  const format = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  if (seconds < 120) return `${format.format(seconds)} s`;
  if (seconds < 7200) return `${format.format(seconds / 60)} min`;
  if (seconds < 172800) return `${format.format(seconds / 3600)} h`;
  return `${format.format(seconds / 86400)} ${tr(language, "days", "jours")}`;
}

export default function DataSourceRuns({ sourceId, language, refreshKey, onEntriesChanged }: { sourceId: string; language: Language; refreshKey: number; onEntriesChanged: () => void }) {
  const [runs, setRuns] = useState<DataSourceRun[] | null>(null);
  const [details, setDetails] = useState<Record<string, DataSourceRun>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const number = new Intl.NumberFormat(language);
  const date = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" });

  const load = useCallback(async () => {
    try { setRuns(await dataSourceApi.runs(sourceId)); setError(""); }
    catch (cause) { setError(dataSourceError(cause, language)); }
  }, [sourceId, language]);
  useEffect(() => {
    dataSourceApi.runs(sourceId).then((next) => { setRuns(next); setError(""); }).catch((cause) => setError(dataSourceError(cause, language)));
  }, [sourceId, language, refreshKey]);
  const running = runs?.some(active) ?? false;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { void load(); }, 2000);
    return () => clearInterval(timer);
  }, [running, load]);
  // Entries changed when a delivery finishes: refresh the collection once.
  const wasRunning = useRef(false);
  useEffect(() => { if (wasRunning.current && !running) onEntriesChanged(); wasRunning.current = running; }, [running, onEntriesChanged]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (cause) { setError(dataSourceError(cause, language)); } finally { setBusy(false); }
  };
  const toggle = (run: DataSourceRun) => {
    if (details[run.id]) { setDetails((current) => { const next = { ...current }; delete next[run.id]; return next; }); return; }
    void act(async () => { const detail = await dataSourceApi.run(run.id); setDetails((current) => ({ ...current, [run.id]: detail })); });
  };
  const download = (run: DataSourceRun) => void act(async () => {
    const csv = await dataSourceApi.rejectionsCsv(run.id);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `brainy-rejected-rows-${run.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  });

  if (runs === null && !error) return <div className="data-source-skeleton" aria-busy="true" aria-label={tr(language, "Loading deliveries", "Chargement des livraisons")} />;
  return <section className="data-source-runs" aria-label={tr(language, "Deliveries", "Livraisons")}>
    {error && <p role="alert" className="data-source-error">{error} <Button variant="subtle" onClick={() => void load()}>{tr(language, "Retry", "Réessayer")}</Button></p>}
    {runs && !runs.length && <p className="data-source-muted">{tr(language, "No delivery yet. Send a file to start.", "Aucune livraison pour le moment. Envoyez un fichier pour commencer.")}</p>}
    {runs && runs.length > 0 && <ol className="data-source-run-list">{runs.map((run) => {
      const detail = details[run.id];
      const percent = run.total ? Math.round((run.processed / run.total) * 100) : 0;
      return <li key={run.id} className={`data-source-run state-${run.state.toLowerCase()}`}>
        <div className="data-source-run-head">
          <span className="data-source-state">{runStateLabel(run.state, language)}</span>
          <span>{originLabel(run.origin, language)}</span>
          <time dateTime={run.receivedAt}>{tr(language, "Received", "Reçue")} {date.format(new Date(run.receivedAt))}</time>
        </div>
        {active(run) && <div className="data-source-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={tr(language, "Delivery progress", "Progression de la livraison")}><span style={{ width: `${percent}%` }} /></div>}
        <dl className="data-source-counts">
          <div><dt>{tr(language, "Rows", "Lignes")}</dt><dd>{number.format(run.processed)} / {number.format(run.total)}</dd></div>
          <div><dt>{tr(language, "Created", "Créées")}</dt><dd>{number.format(run.createdCount)}</dd></div>
          <div><dt>{tr(language, "Updated", "Mises à jour")}</dt><dd>{number.format(run.updatedCount)}</dd></div>
          <div><dt>{tr(language, "Unchanged", "Inchangées")}</dt><dd>{number.format(run.unchangedCount)}</dd></div>
          {run.olderCount > 0 && <div><dt>{tr(language, "Older, ignored", "Plus anciennes, ignorées")}</dt><dd>{number.format(run.olderCount)}</dd></div>}
          <div className={run.rejectedCount ? "is-rejected" : ""}><dt>{tr(language, "Rejected", "Rejetées")}</dt><dd>{number.format(run.rejectedCount)}</dd></div>
        </dl>
        <p className="data-source-muted">
          {run.rowsPerSecond ? `${number.format(run.rowsPerSecond)} ${tr(language, "rows/s", "lignes/s")}` : ""}
          {run.durationMs ? ` · ${number.format(Math.round(run.durationMs / 100) / 10)} s` : ""}
          {run.maxLagSeconds ? ` · ${tr(language, "longest delay between fact and reception", "écart maximal entre fait et réception")} ${lagText(run.maxLagSeconds, language)}` : ""}
        </p>
        {run.ignoredColumns.length > 0 && <p className="data-source-muted">{tr(language, "Columns not read:", "Colonnes non lues :")} {run.ignoredColumns.join(", ")}</p>}
        {run.failure && <p className="data-source-error">{failureText(run.failure, language)}</p>}
        <div className="data-source-actions">
          {active(run) && <Button disabled={busy} onClick={() => void act(() => dataSourceApi.cancel(run.id))}>{tr(language, "Cancel", "Annuler")}</Button>}
          {(run.state === "FAILED" || run.state === "CANCELLED") && <Button disabled={busy} onClick={() => void act(() => dataSourceApi.resume(run.id))}>{tr(language, "Resume", "Reprendre")}</Button>}
          {run.rejectedCount > 0 && !active(run) && <>
            <Button disabled={busy} aria-expanded={!!detail} onClick={() => toggle(run)}>{detail ? tr(language, "Hide rejected rows", "Masquer les lignes rejetées") : tr(language, "Why rows were rejected", "Pourquoi des lignes sont rejetées")}</Button>
            <Button disabled={busy} onClick={() => void act(() => dataSourceApi.retry(run.id))}>{tr(language, "Retry rejected rows", "Relancer les lignes rejetées")}</Button>
            <Button variant="subtle" disabled={busy} onClick={() => download(run)}>{tr(language, "Download rejected rows", "Télécharger les lignes rejetées")}</Button>
          </>}
        </div>
        {detail?.rejections && <div className="data-source-table-wrap"><table className="data-source-table">
          <caption>{run.rejectedCount > detail.rejections.length ? tr(language, `First ${detail.rejections.length} of ${run.rejectedCount} rejected rows`, `${detail.rejections.length} premières lignes rejetées sur ${run.rejectedCount}`) : tr(language, "Rejected rows", "Lignes rejetées")}</caption>
          <thead><tr><th scope="col">{tr(language, "Row", "Ligne")}</th><th scope="col">{tr(language, "Record ID", "Identifiant")}</th><th scope="col">{tr(language, "Reason", "Motif")}</th><th scope="col">{tr(language, "Detail", "Détail")}</th></tr></thead>
          <tbody>{detail.rejections.map((item) => <tr key={`${item.row}-${item.code}`}><td>{number.format(item.row)}</td><td>{item.recordId ?? "—"}</td><td>{rejectionLabel(item.code, language)}</td><td>{item.message}</td></tr>)}</tbody>
        </table></div>}
      </li>;
    })}</ol>}
  </section>;
}
