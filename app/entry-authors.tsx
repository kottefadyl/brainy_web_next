"use client";

// T53: creator and last editor of an entry (and of a data format), shown only in shared collections.
import { useEffect, useState } from "react";
import { request } from "../lib/api";
import type { Collection, Entry, Language, PersonSummary } from "../lib/brainy";
import "./entry-authors.css";

/** A collection is shared once it has a member, or when it is shared with me. */
export function isSharedCollection(collection: Collection): boolean {
  return !!collection.sharedBy || (collection.members?.length ?? 0) > 0;
}

const photos = new Map<string, Promise<string | null>>();
function photoOf(userId: string): Promise<string | null> {
  let found = photos.get(userId);
  if (!found) {
    found = request<{ personPhoto: string | null }>("query($userId:String!){personPhoto(userId:$userId)}", { userId }).then((data) => data.personPhoto).catch(() => null);
    photos.set(userId, found);
  }
  return found;
}

export function Avatar({ person }: { person: PersonSummary }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!person.hasPhoto) return;
    let alive = true;
    void photoOf(person.userId).then((value) => { if (alive) setPhoto(value); });
    return () => { alive = false; };
  }, [person.userId, person.hasPhoto]);
  return <span className="author-avatar" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the API */}
    {photo ? <img src={photo} alt="" /> : person.name.charAt(0).toUpperCase()}
  </span>;
}

function People({ creator, editor, language, compact, label }: { creator: PersonSummary; editor?: PersonSummary | null; language: Language; compact?: boolean; label: { created: string; edited: string } }) {
  const changed = editor && editor.userId !== creator.userId ? editor : null;
  const description = changed ? `${label.created} ${creator.name} · ${label.edited} ${changed.name}` : `${label.created} ${creator.name}`;
  return <span className={`entry-authors${compact ? " compact" : ""}`} role="img" aria-label={description} title={description}>
    <Avatar person={creator} />
    <span className="author-name" aria-hidden="true">{creator.name}</span>
    {changed && <>
      <span className="author-edited" aria-hidden="true">· {language === "fr" ? "modifié par" : "edited by"}</span>
      <Avatar person={changed} />
      <span className="author-name" aria-hidden="true">{changed.name}</span>
    </>}
  </span>;
}

/** Creator then last editor of an entry; nothing outside shared collections or for entries kept offline. */
export function EntryAuthors({ entry, collection, language, compact }: { entry: Entry; collection: Collection; language: Language; compact?: boolean }) {
  if (!isSharedCollection(collection) || !entry.createdBy) return null;
  const fr = language === "fr";
  return <People creator={entry.createdBy} editor={entry.updatedBy} language={language} compact={compact} label={{ created: fr ? "Créée par" : "Created by", edited: fr ? "modifiée par" : "edited by" }} />;
}

/** Only the owner creates and changes data formats, so the owner is both the creator and the last editor. */
export function FormatAuthors({ collection, language }: { collection: Collection; language: Language }) {
  if (!isSharedCollection(collection) || !collection.ownerId) return null;
  const fr = language === "fr";
  const owner: PersonSummary = { userId: collection.ownerId, name: collection.sharedBy?.name ?? (fr ? "Vous" : "You"), hasPhoto: true };
  return <People creator={owner} language={language} label={{ created: fr ? "Créé et modifié par" : "Created and edited by", edited: "" }} />;
}
