"use client";

import { useRef, type KeyboardEvent } from "react";
import { FolderHeart, Users } from "lucide-react";
import type { Language } from "../../../lib/brainy";
import "./collection-scope.css";

export type CollectionScope = "mine" | "shared";

/**
 * Switch between my collections and the collections shared with me (T52). Each list then gets the
 * whole height of the sidebar or drawer instead of sharing it. Shown only when something is shared.
 */
export function CollectionScopeTabs({ language, value, mineCount, sharedCount, listId, onChange }: {
  language: Language;
  value: CollectionScope;
  mineCount: number;
  sharedCount: number;
  /** id of the list these tabs control. */
  listId: string;
  onChange: (scope: CollectionScope) => void;
}) {
  const fr = language === "fr";
  const refs = useRef<Record<CollectionScope, HTMLButtonElement | null>>({ mine: null, shared: null });
  const items: { id: CollectionScope; label: string; full: string; count: number; icon: typeof Users }[] = [
    { id: "mine", label: fr ? "À moi" : "Mine", full: fr ? "Mes collections" : "My collections", count: mineCount, icon: FolderHeart },
    { id: "shared", label: fr ? "Partagées" : "Shared", full: fr ? "Partagées avec moi" : "Shared with me", count: sharedCount, icon: Users },
  ];
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next: CollectionScope = event.key === "Home" ? "mine" : event.key === "End" ? "shared" : value === "mine" ? "shared" : "mine";
    onChange(next);
    refs.current[next]?.focus();
  };
  return <div className="collection-scope" role="tablist" aria-label={fr ? "Quelles collections afficher" : "Which collections to show"} onKeyDown={onKeyDown}>
    {items.map(({ id, label, full, count, icon: Icon }) => {
      const selected = value === id;
      return <button key={id} ref={(node) => { refs.current[id] = node; }} type="button" role="tab" id={`${listId}-tab-${id}`} aria-selected={selected} aria-controls={listId} tabIndex={selected ? 0 : -1} className="collection-scope-tab" title={full} aria-label={`${full}, ${count}`} onClick={() => onChange(id)}>
        <Icon size={15} aria-hidden="true" />
        <span className="collection-scope-label">{label}</span>
        <span className="collection-scope-count" aria-hidden="true">{count}</span>
      </button>;
    })}
  </div>;
}

/** The tab to show: the reader's choice, or the side of the collection that is open. */
export function scopeFor(choice: CollectionScope | null, selectedIsShared: boolean, sharedCount: number): CollectionScope {
  if (!sharedCount) return "mine";
  return choice ?? (selectedIsShared ? "shared" : "mine");
}
