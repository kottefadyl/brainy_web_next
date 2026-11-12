"use client";

// Search among collaborators as you type (name or e-mail, without regard to case or accents).
// With many collaborators, only the first matches are shown until the search is narrowed.
import { Search } from "lucide-react";
import type { Collaborator } from "../lib/collaborators";

export const MAX_SHOWN_COLLABORATORS = 100;
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();

export function filterCollaborators(people: Collaborator[], query: string): Collaborator[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return people;
  return people.filter((person) => { const text = fold(`${person.name} ${person.email}`); return words.every((word) => text.includes(word)); });
}

export function CollaboratorSearch({ value, onChange, total, shown, fr }: { value: string; onChange: (value: string) => void; total: number; shown: number; fr: boolean }) {
  return <div className="collab-search">
    <label className="collab-search-field">
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">{fr ? "Rechercher un collaborateur" : "Search for a collaborator"}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={fr ? "Rechercher par nom ou e-mail…" : "Search by name or e-mail…"} autoComplete="off" />
    </label>
    <p className="collab-search-status" role="status" aria-live="polite">
      {value.trim() && !shown ? (fr ? "Aucun collaborateur ne correspond." : "No collaborator matches.")
        : shown < total ? (fr ? `${shown} sur ${total} affichés : précisez la recherche.` : `${shown} of ${total} shown: narrow the search.`) : ""}
    </p>
  </div>;
}
