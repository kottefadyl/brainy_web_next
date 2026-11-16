"use client";

// "People with access": who the owner shared a collection with. Searched and paged on the server,
// so a collection shared with thousands of people stays fast.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UserMinus, Users } from "lucide-react";
import { api } from "../lib/api";
import { translateError, type Collection, type CollectionRole, type Language } from "../lib/brainy";
import { collaboratorsApi, type CollectionMembersPage, type CollectionMemberSummary } from "../lib/collaborators";
import { Avatar } from "./entry-authors";

const PAGE_SIZE = 50;

type Props = { collection: Collection; language: Language; onChanged: (collection: Collection) => void; onAddPeople: () => void };

export default function CollectionMembersPanel({ collection, language, onChanged, onAddPeople }: Props) {
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<CollectionMembersPage | null>(null);
  const [reload, setReload] = useState(0);
  const [savingId, setSavingId] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [error, setError] = useState("");

  // The search waits for a short pause in typing before asking the server.
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query.trim()); setOffset(0); }, 250); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    let alive = true;
    collaboratorsApi.members(collection.id, search, offset, PAGE_SIZE)
      .then((result) => { if (alive) { setPage(result); setError(""); } })
      .catch((cause) => { if (alive) setError(translateError(cause, language)); });
    return () => { alive = false; };
  }, [collection.id, search, offset, reload, language]);

  async function setRole(person: CollectionMemberSummary, role: CollectionRole) {
    setSavingId(person.userId); setError("");
    try {
      const member = collection.members?.find((item) => item.userId === person.userId);
      onChanged(await api.shareWithCollaborator(collection.id, person.userId, role, member?.sharedFieldIds ?? undefined, member?.sensitiveFieldIds ?? undefined));
      setPage((current) => current && { ...current, items: current.items.map((item) => item.userId === person.userId ? { ...item, role: role as CollectionMemberSummary["role"] } : item) });
    } catch (cause) { setError(translateError(cause, language)); } finally { setSavingId(""); }
  }

  async function remove(person: CollectionMemberSummary) {
    setSavingId(person.userId); setError("");
    try {
      onChanged(await api.removeCollectionMember(collection.id, person.userId));
      setConfirmId("");
      // Stay on a page that still has people after the last one of a page is removed.
      if (page && page.items.length === 1 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE)); else setReload((value) => value + 1);
    } catch (cause) { setError(translateError(cause, language)); } finally { setSavingId(""); }
  }

  const total = page?.total ?? 0;
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + PAGE_SIZE, total);
  const unfiltered = !search && total === 0;

  return <div className="collab-members">
    {error && <p className="form-error" role="alert">{error}</p>}
    {page === null && !error && <p className="collab-help" role="status">{L("Loading…", "Chargement…")}</p>}
    {page && unfiltered && <div className="collab-empty"><Users size={32} strokeWidth={1.5} aria-hidden="true" /><p>{L("This collection is not shared yet.", "Cette collection n’est pas encore partagée.")}</p><button type="button" className="button button-primary" onClick={onAddPeople}>{L("Add people", "Ajouter des personnes")}</button></div>}
    {page && !unfiltered && <>
      <div className="collab-search">
        <label className="collab-search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{L("Search people with access", "Rechercher parmi les personnes ayant accès")}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={L("Search by name or e-mail…", "Rechercher par nom ou e-mail…")} autoComplete="off" />
        </label>
        <p className="collab-search-status" role="status" aria-live="polite">
          {search && !total ? L("Nobody matches.", "Personne ne correspond.") : total ? L(`${from}–${to} of ${total}`, `${from}–${to} sur ${total}`) : ""}
        </p>
      </div>
      <ul className="collab-list">
        {page.items.map((person) => <li key={person.userId}>
          <span className="collab-avatar-wrap"><Avatar person={person} /></span>
          <div className="collab-person"><strong>{person.name}</strong><span>{person.email}</span></div>
          <div className="collab-member-actions">
            <label className="collab-access"><span className="sr-only">{L(`Access for ${person.name}`, `Accès de ${person.name}`)}</span>
              <select value={person.role} disabled={savingId === person.userId} onChange={(event) => setRole(person, event.target.value as CollectionRole)}>
                <option value="READER">{L("Read only", "Lecture seule")}</option>
                <option value="EDITOR">{L("Read and write", "Lecture et écriture")}</option>
              </select>
            </label>
            <button type="button" className="collab-remove" disabled={savingId === person.userId} onClick={() => setConfirmId(person.userId)} aria-label={L(`Remove access for ${person.name}`, `Retirer l’accès de ${person.name}`)} title={L("Remove access", "Retirer l’accès")}><UserMinus size={17} aria-hidden="true" /></button>
          </div>
          {confirmId === person.userId && <div className="collab-confirm inline" role="alertdialog" aria-label={L("Remove access", "Retirer l’accès")}>
            <p>{L(`${person.name} will no longer see this collection. Their entries stay in it.`, `${person.name} ne verra plus cette collection. Ses entrées y restent.`)}</p>
            <div><button type="button" className="button button-secondary" onClick={() => setConfirmId("")}>{L("Cancel", "Annuler")}</button><button type="button" className="button button-danger" disabled={savingId === person.userId} onClick={() => remove(person)}>{L("Remove access", "Retirer l’accès")}</button></div>
          </div>}
        </li>)}
      </ul>
      {total > PAGE_SIZE && <nav className="collab-pager" aria-label={L("Pages of people", "Pages de personnes")}>
        <button type="button" className="button button-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={16} aria-hidden="true" />{L("Previous", "Précédent")}</button>
        <span>{L(`Page ${Math.floor(offset / PAGE_SIZE) + 1} of ${Math.ceil(total / PAGE_SIZE)}`, `Page ${Math.floor(offset / PAGE_SIZE) + 1} sur ${Math.ceil(total / PAGE_SIZE)}`)}</span>
        <button type="button" className="button button-secondary" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>{L("Next", "Suivant")}<ChevronRight size={16} aria-hidden="true" /></button>
      </nav>}
    </>}
  </div>;
}
