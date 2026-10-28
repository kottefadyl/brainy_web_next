"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { discardEntry, pendingEntries, syncPending, type PendingEntry } from "../lib/offline-queue";
import type { Collection, Language } from "../lib/brainy";

export default function OfflineSyncPanel({ userId, collections, language, onSynced }: { userId: string; collections: Collection[]; language: Language; onSynced: () => void }) {
  const fr = language === "fr";
  const [rows, setRows] = useState<PendingEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [serverValues, setServerValues] = useState<Record<string, string>>( {} );
  const fieldText = (row: PendingEntry, values: { fieldId: string; value: string }[]) => values.map((value) => `${collections.find((collection) => collection.id === row.collectionId)?.formats.find((format) => format.id === row.formatId)?.fields.find((field) => field.id === value.fieldId)?.name ?? value.fieldId}: ${value.value}`).join(" · ");
  const onSyncedRef = useRef(onSynced);
  useEffect(() => { onSyncedRef.current = onSynced; }, [onSynced]);
  const refresh = useCallback(() => setRows(pendingEntries(userId)), [userId]);
  const sync = useCallback(async () => {
    setBusy(true); setMessage("");
    try { const result = await syncPending(userId); refresh(); if (result.synced) onSyncedRef.current(); if (result.stopped) setMessage(result.stopped); }
    finally { setBusy(false); }
  }, [userId, refresh]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; refresh(); if (navigator.onLine) void sync(); }); const onChange = () => refresh(); const onOnline = () => { void sync(); }; window.addEventListener("brainy-offline-change", onChange); window.addEventListener("online", onOnline); return () => { active = false; window.removeEventListener("brainy-offline-change", onChange); window.removeEventListener("online", onOnline); }; }, [refresh, sync]);
  if (!rows.length && !message) return null;
  return <section className="offline-sync-panel" aria-live="polite"><h3>{fr ? "Modifications en attente" : "Pending changes"} · {rows.length}</h3><p>{fr ? "Elles restent sur cet appareil jusqu’à la synchronisation." : "They stay on this device until synced."}</p><button type="button" disabled={busy || !rows.length} onClick={() => void sync()}>{busy ? fr ? "Synchronisation…" : "Syncing…" : fr ? "Synchroniser" : "Sync now"}</button>
    <ul>{rows.map((row) => <li key={row.id}><span>{collections.find((item) => item.id === row.collectionId)?.name ?? row.collectionId} · {row.entryId ? fr ? "Modification" : "Edit" : fr ? "Nouvelle entrée" : "New entry"} · {new Date(row.createdAt).toLocaleString(language)}</span>{row.status === "conflict" && <div><p role="alert">{fr ? "Conflit : " : "Conflict: "}{row.error}</p><details onToggle={async (event) => { if (!event.currentTarget.open || !row.entryId) return; try { const server = await api.entry(row.collectionId, row.entryId); setServerValues((current) => ({ ...current, [row.id]: fieldText(row, server.values) })); } catch { /* entry may have been deleted */ } }}><summary>{fr ? "Comparer les valeurs" : "Compare values"}</summary><p>{fr ? "Sur cet appareil : " : "On this device: "}{fieldText(row, row.values)}</p><p>{fr ? "Sur le serveur : " : "On server: "}{serverValues[row.id] ?? "—"}</p></details><button type="button" disabled={busy} onClick={() => { discardEntry(userId, row.id); refresh(); }}>{fr ? "Garder le serveur" : "Keep server"}</button><button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await api.saveEntry(row.collectionId, row.values, undefined, row.formatId, { clientMutationId: `${row.id}-copy` }); discardEntry(userId, row.id); refresh(); onSynced(); } catch (cause) { setMessage(String(cause)); } finally { setBusy(false); } }}>{fr ? "Créer une nouvelle entrée" : "Create a new entry"}</button></div>}</li>)}</ul>{message && <p role="status">{message}</p>}</section>;
}
