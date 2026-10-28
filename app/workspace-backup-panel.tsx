"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { downloadTransfer } from "../lib/transfer";
import type { Language } from "../lib/brainy";

type Preview = { version: number; collections: number; entries: number; relations: number; stockMovements: number; conflicts: string[]; allowed: boolean; restored: boolean };
export default function WorkspaceBackupPanel({ language, onRestored }: { language: Language; onRestored: () => void }) {
  const fr = language === "fr";
  const [archive, setArchive] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } }
  return <details className="workspace-backup-panel"><summary>{fr ? "Sauvegarde de l’espace" : "Workspace backup"}</summary><div><p>{fr ? "Le fichier contient vos collections, entrées, liens, historiques et mouvements. Gardez-le dans un lieu privé." : "The file contains your collections, entries, links, history, and movements. Keep it private."}</p><button type="button" disabled={busy} onClick={() => run(async () => { const data = await api.workspaceBackup(); downloadTransfer(`brainy-workspace-${new Date().toISOString().slice(0, 10)}.json`, data, "application/json"); })}>{fr ? "Télécharger la sauvegarde" : "Download backup"}</button><label>{fr ? "Restaurer un fichier de cet espace" : "Restore a file from this workspace"}<input type="file" accept=".json,application/json" disabled={busy} onChange={(event) => run(async () => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 50_000_000) throw new Error(fr ? "Fichier trop volumineux (50 Mo maximum)" : "File is too large (50 MB maximum)"); const text = await file.text(); const result = await api.restoreWorkspaceBackup(text, true); setArchive(text); setPreview(result); })} /></label>{preview && <div role="status"><p>{preview.collections} {fr ? "collections" : "collections"} · {preview.entries} {fr ? "entrées" : "entries"} · {preview.relations} {fr ? "relations" : "relations"} · {preview.stockMovements} {fr ? "mouvements" : "movements"}</p>{preview.conflicts.length > 0 && <ul>{preview.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul>}{preview.allowed && <button type="button" disabled={busy} onClick={() => run(async () => { const result = await api.restoreWorkspaceBackup(archive, false); if (!result.restored) { setPreview(result); return; } setArchive(""); setPreview(null); onRestored(); })}>{fr ? "Confirmer la restauration" : "Confirm restore"}</button>}</div>}{error && <p className="form-error" role="alert">{error}</p>}</div></details>;
}
