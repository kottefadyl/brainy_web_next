"use client";

// T54: collaborator field. Chooses one or more people among the collection owner and the owner's collaborators.
import { useEffect, useState } from "react";
import { request } from "../lib/api";
import { fieldKindLabel, type Collection, type Entry, type Field, type Language, type PersonSummary } from "../lib/brainy";
import { Avatar } from "./entry-authors";
import "./person-field-input.css";

const peopleByCollection = new Map<string, Promise<PersonSummary[]>>();
function collectionPeople(collectionId: string): Promise<PersonSummary[]> {
  let found = peopleByCollection.get(collectionId);
  if (!found) {
    found = request<{ collectionPeople: PersonSummary[] }>("query($collectionId:ID!){collectionPeople(collectionId:$collectionId){userId name hasPhoto}}", { collectionId }).then((data) => data.collectionPeople);
    found.catch(() => peopleByCollection.delete(collectionId));
    peopleByCollection.set(collectionId, found);
  }
  return found;
}

/** Values of an entry as the editor edits them: collaborator fields hold the people's IDs. */
export function editableValuesByField(entry: Entry): Record<string, string> {
  return Object.fromEntries(entry.values.map((item) => [item.fieldId, item.personIds?.length ? JSON.stringify(item.personIds) : item.value]));
}

function parseIds(value: string): string[] {
  try { const ids = JSON.parse(value) as unknown; return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []; } catch { return []; }
}

export function PersonFieldInput({ collection, field, entry, language, value, onChange }: { collection: Collection; field: Field; entry?: Entry; language: Language; value: string; onChange: (value: string) => void }) {
  const [people, setPeople] = useState<PersonSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    collectionPeople(collection.id).then((list) => { if (alive) { setPeople(list); setFailed(false); } }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [collection.id, attempt]);
  const selected = parseIds(value);
  // People kept on this entry after their collaboration ended stay visible and can be removed.
  const stored = entry?.values.find((item) => item.fieldId === field.id);
  const former: PersonSummary[] = (stored?.personIds ?? []).flatMap((userId, index) => people?.some((person) => person.userId === userId) ? [] : [{ userId, name: stored?.personNames?.[index] ?? "?", hasPhoto: false }]);
  const choices = [...(people ?? []), ...former.filter((person) => selected.includes(person.userId))];
  const fr = language === "fr";
  function toggle(userId: string) {
    const next = selected.includes(userId) ? selected.filter((id) => id !== userId) : [...selected, userId];
    onChange(next.length ? JSON.stringify(next) : "");
  }
  return <fieldset className="input-label person-field">
    <legend className="entry-field-heading"><strong>{field.name}</strong><small>{fieldKindLabel(language, "COLLABORATOR")}</small></legend>
    {failed ? <span className="person-field-note" role="alert">{fr ? "Impossible de charger les collaborateurs." : "Could not load collaborators."} <button type="button" onClick={() => setAttempt((count) => count + 1)}>{fr ? "Réessayer" : "Retry"}</button></span>
      : !people ? <span className="person-field-note" aria-live="polite">{fr ? "Chargement…" : "Loading…"}</span>
      : <div className="person-field-choices">
        {choices.map((person) => {
          const on = selected.includes(person.userId);
          return <button type="button" key={person.userId} className={`person-chip${on ? " selected" : ""}`} aria-pressed={on} onClick={() => toggle(person.userId)}>
            <span className="entry-authors"><Avatar person={person} /></span>
            <span className="person-chip-name">{person.name}{person.userId === people?.[0]?.userId ? <small> · {fr ? "propriétaire" : "owner"}</small> : null}</span>
            {on ? <span aria-hidden="true" className="person-chip-check">✓</span> : null}
          </button>;
        })}
      </div>}
    {people && people.length < 2 && <span className="person-field-note">{fr ? "Invitez des collaborateurs depuis « Autres actions » pour pouvoir les choisir ici." : "Invite collaborators from “More actions” to choose them here."}</span>}
  </fieldset>;
}
