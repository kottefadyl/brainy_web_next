"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Collection, Entry, EntryLink, Language } from "../lib/brainy";

function title(collection: Collection, entry: Entry): string {
  const field = collection.formats.find((item) => item.id === entry.formatId)?.fields.find((item) => item.kind === "TITLE");
  return entry.values.find((item) => item.fieldId === field?.id)?.value || entry.id.slice(-8);
}

export default function EntryLinksDialog({ collection, entry, language, onClose, onOpenEntry }: { collection: Collection; entry: Entry; language: Language; onClose: () => void; onOpenEntry: (entry: Entry) => void }) {
  const fr = language === "fr";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [links, setLinks] = useState<EntryLink[]>([]);
  const [target, setTarget] = useState("");
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() { const [items, relations] = await Promise.all([api.entries(collection.id), api.entryLinks(collection.id, entry.id, true)]); setEntries(items); setLinks(relations); }
  useEffect(() => { let active = true; Promise.all([api.entries(collection.id), api.entryLinks(collection.id, entry.id, true)]).then(([items, relations]) => { if (active) { setEntries(items); setLinks(relations); } }).catch((cause) => { if (active) setError(String(cause)); }); return () => { active = false; }; }, [collection.id, entry.id]);
  const candidates = entries.filter((item) => item.id !== entry.id && title(collection, item).toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0, 80);
  return <div className="entry-links-dialog"><p>{fr ? "Reliez deux entrées ordinaires de cette collection. Un lien supprimé peut être restauré." : "Link two ordinary entries in this collection. A removed link can be restored."}</p><label>{fr ? "Rechercher une entrée" : "Find an entry"}<input value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>{fr ? "Entrée cible" : "Target entry"}<select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">—</option>{candidates.map((item) => <option key={item.id} value={item.id}>{title(collection, item)}</option>)}</select></label><label>{fr ? "Libellé facultatif" : "Optional label"}<input value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label><button type="button" disabled={!target || busy} onClick={async () => { setBusy(true); setError(""); try { await api.createEntryLink(collection.id, entry.id, target, label); setTarget(""); setLabel(""); await refresh(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } }}>{fr ? "Créer le lien" : "Create link"}</button>
    <h3>{fr ? "Liens de cette entrée" : "Entry links"}</h3><ul>{links.map((link) => { const other = entries.find((item) => item.id === (link.fromEntryId === entry.id ? link.toEntryId : link.fromEntryId)); return <li key={link.id}><button type="button" onClick={() => { if (other) onOpenEntry(other); }}>{other ? title(collection, other) : link.toEntryId.slice(-8)}</button>{link.label && <span> · {link.label}</span>}<button type="button" onClick={async () => { try { await api.setEntryLinkActive(collection.id, link.id, !!link.deletedAt); await refresh(); } catch (cause) { setError(String(cause)); } }}>{link.deletedAt ? fr ? "Restaurer" : "Restore" : fr ? "Retirer" : "Remove"}</button></li>; })}</ul>{error && <p className="form-error" role="alert">{error}</p>}<button type="button" onClick={onClose}>{fr ? "Fermer" : "Close"}</button></div>;
}
