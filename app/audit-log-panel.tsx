"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { auditActionLabel, auditActor, auditDetailText, PRIVACY_ACTIONS } from "../lib/audit-log-labels";
import { translateError, type AuditLog, type Collection, type Language } from "../lib/brainy";

/** The privacy journal (T43/3): the last sensitive reads, refusals and alerts of a collection, loaded on request. */
export default function AuditLogPanel({ collection, language }: { collection: Collection; language: Language }) {
  const fr = language === "fr";
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    setBusy(true); setError("");
    try { setLogs(await api.collectionAuditLogs(collection.id)); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  };
  const shown = (logs ?? []).filter((log) => all || PRIVACY_ACTIONS.has(log.action));
  const when = (iso: string) => new Date(iso).toLocaleString(fr ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return <details className="sensitivity-box audit-log" onToggle={(event) => { if (event.currentTarget.open && logs === null && !busy) void load(); }}>
    <summary>{fr ? "Journal des analyses sensibles" : "Sensitive analysis journal"}</summary>
    <p><small>{fr ? "Les 100 derniers événements. Le journal ne contient aucune valeur : seulement qui a demandé quoi, et les alertes sur des questions répétées. Ces alertes ne bloquent rien." : "The last 100 events. The journal holds no value: only who asked what, and alerts on repeated questions. These alerts block nothing."}</small></p>
    <div className="audit-log-actions">
      <button type="button" onClick={() => void load()} disabled={busy}>{busy ? (fr ? "Chargement…" : "Loading…") : (fr ? "Actualiser" : "Refresh")}</button>
      <label className="sensitivity-check"><input type="checkbox" checked={all} onChange={(event) => setAll(event.target.checked)} />{fr ? "Tout le journal" : "Whole journal"}</label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {logs !== null && !shown.length && !error && <p><small>{fr ? "Aucun événement." : "No events."}</small></p>}
    {shown.length > 0 && <ol className="audit-log-list">
      {shown.map((log) => <li key={log.id} className="audit-log-item" data-alert={log.action === "SENSITIVE_AGGREGATE_ALERT" ? "true" : undefined}>
        <div className="audit-log-head"><strong>{auditActionLabel(log.action, language)}</strong><time dateTime={log.occurredAt}>{when(log.occurredAt)}</time></div>
        <div className="audit-log-body"><span>{auditActor(log, collection.members, collection.ownerId, language)}</span>{auditDetailText(log, language) && <span> · {auditDetailText(log, language)}</span>}</div>
      </li>)}
    </ol>}
  </details>;
}
