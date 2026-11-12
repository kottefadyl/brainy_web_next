"use client";

// T52: the owner chooses, collaborator by collaborator, who can see a collection and how.
import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { api } from "../lib/api";
import { translateError, type Collection, type CollectionRole, type Language } from "../lib/brainy";
import { collaboratorsApi, type Collaborator } from "../lib/collaborators";
import { Button } from "./components/ui/Button";
import Modal from "./components/ui/Modal";
import { CollaboratorSearch, filterCollaborators, MAX_SHOWN_COLLABORATORS } from "./collaborator-search";
import "./collaborators.css";

type Access = "NONE" | "READER" | "EDITOR";
type Props = { collection: Collection; language: Language; onClose: () => void; onChanged: (collection: Collection) => void; onOpenCollaborators: () => void };

export default function CollectionShareDialog({ collection, language, onClose, onChanged, onOpenCollaborators }: Props) {
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;
  const [people, setPeople] = useState<Collaborator[] | null>(null);
  const [current, setCurrent] = useState(collection);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [query, setQuery] = useState("");
  // People who already have access come first, in the order of the opening (rows never jump when access changes).
  const [firstMembers] = useState(() => new Set((collection.members ?? []).map((member) => member.userId)));

  useEffect(() => { collaboratorsApi.list().then((list) => setPeople([...list].sort((x, y) => Number(firstMembers.has(y.userId)) - Number(firstMembers.has(x.userId))))).catch((cause) => setError(translateError(cause, language))); }, [language, firstMembers]);

  const accessOf = (userId: string): Access => (current.members?.find((member) => member.userId === userId)?.role as Access | undefined) ?? "NONE";
  async function change(person: Collaborator, access: Access) {
    setSavingId(person.userId); setError(""); setSaved("");
    try {
      const member = current.members?.find((item) => item.userId === person.userId);
      const updated = access === "NONE"
        ? await api.removeCollectionMember(current.id, person.userId)
        : await api.shareWithCollaborator(current.id, person.userId, access as CollectionRole, member?.sharedFieldIds ?? undefined, member?.sensitiveFieldIds ?? undefined);
      setCurrent(updated); onChanged(updated);
      setSaved(person.userId);
    } catch (cause) { setError(translateError(cause, language)); } finally { setSavingId(""); }
  }

  const options: { value: Access; label: string }[] = [
    { value: "NONE", label: L("No access", "Aucun accès") },
    { value: "READER", label: L("Read only", "Lecture seule") },
    { value: "EDITOR", label: L("Read and write", "Lecture et écriture") },
  ];
  return <Modal title={L(`Share “${collection.name}”`, `Partager « ${collection.name} »`)} closeLabel={L("Close", "Fermer")} onClose={onClose}>
    <div className="collab-share">
      <p className="collab-help"><ShieldCheck size={16} aria-hidden="true" />{L("Read only: they see the entries. Read and write: they can also add, edit and delete entries. Data formats, the collection name and sharing stay yours.", "Lecture seule : la personne voit les entrées. Lecture et écriture : elle peut aussi ajouter, modifier et supprimer des entrées. Les formats de données, le nom de la collection et le partage restent à vous.")}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {people === null && !error && <p className="collab-help" role="status">{L("Loading…", "Chargement…")}</p>}
      {people?.length === 0 && <div className="collab-empty"><Users size={32} strokeWidth={1.5} aria-hidden="true" /><p>{L("You have no collaborator yet. Send your collaboration link to a colleague first.", "Vous n’avez pas encore de collaborateur. Envoyez d’abord votre lien de collaboration à un collègue.")}</p><Button variant="primary" onClick={onOpenCollaborators}>{L("Get my link", "Obtenir mon lien")}</Button></div>}
      {!!people?.length && <CollaboratorSearch value={query} onChange={setQuery} total={filterCollaborators(people, query).length} shown={Math.min(MAX_SHOWN_COLLABORATORS, filterCollaborators(people, query).length)} fr={language === "fr"} />}
      {!!people?.length && <ul className="collab-list">
        {filterCollaborators(people, query).slice(0, MAX_SHOWN_COLLABORATORS).map((person) => <li key={person.userId}>
          <span className="collab-avatar" aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>
          <div className="collab-person"><strong>{person.name}</strong><span>{person.email}</span>{saved === person.userId && <small role="status">{L("Saved", "Enregistré")}</small>}</div>
          <label className="collab-access"><span className="sr-only">{L(`Access for ${person.name}`, `Accès de ${person.name}`)}</span>
            <select value={accessOf(person.userId)} disabled={savingId === person.userId} onChange={(event) => change(person, event.target.value as Access)}>
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </li>)}
      </ul>}
      {!!people?.length && <button type="button" className="collab-text-button" onClick={onOpenCollaborators}><Users size={15} aria-hidden="true" />{L("Manage my collaborators", "Gérer mes collaborateurs")}</button>}
    </div>
  </Modal>;
}
