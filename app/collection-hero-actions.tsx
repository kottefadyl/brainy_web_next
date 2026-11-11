"use client";

import { useEffect, useRef } from "react";
import { ChartNoAxesCombined, Package, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { t, type Language } from "../lib/brainy";

type Props = {
  language: Language;
  onNewEntry: () => void;
  onInsights: () => void;
  onRename: () => void;
  onDelete: () => void;
  onPackages?: () => void;
  /** T52: only the owner shares, renames and deletes; false for a collection shared with me. */
  onShare?: () => void;
  owner?: boolean;
};

export default function CollectionHeroActions({ language, onNewEntry, onInsights, onRename, onDelete, onPackages, onShare, owner = true }: Props) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, []);

  const runMenuAction = (action: () => void) => {
    if (menuRef.current) {
      menuRef.current.open = false;
      menuRef.current.querySelector("summary")?.focus();
    }
    action();
  };

  return (
    <div className="collection-hero-actions">
      <button type="button" className="button button-primary hero-add-entry" onClick={onNewEntry}>
        <Plus size={18} /> {t(language, "newEntry")}
      </button>
      <button type="button" className="button button-secondary" onClick={onInsights}>
        <ChartNoAxesCombined size={16} /> {language === "fr" ? "Calculs" : "Insights"}
      </button>
      {owner && onShare && <button type="button" className="button button-secondary" onClick={onShare}>
        <UserPlus size={16} /> {language === "fr" ? "Partager" : "Share"}
      </button>}
      {owner && <details ref={menuRef} className="collection-hero-more" onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary className="button button-secondary"> {language === "fr" ? "Gérer" : "Manage"}</summary>
        <div className="collection-hero-menu">
          <button type="button" onClick={() => runMenuAction(onRename)}><Pencil size={16} /> {t(language, "rename")}</button>
          {onPackages && <button type="button" onClick={() => runMenuAction(onPackages)}><Package size={16} /> {language === "fr" ? "Paquets de domaine" : "Domain packages"}</button>}
          <button type="button" className="collection-hero-menu-danger" onClick={() => runMenuAction(onDelete)}><Trash2 size={16} /> {t(language, "delete")}</button>
        </div>
      </details>}
    </div>
  );
}
