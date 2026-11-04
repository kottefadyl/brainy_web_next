"use client";

import { useState } from "react";
import { FolderHeart, Plus, Search, Settings2, SlidersHorizontal, Upload } from "lucide-react";
import { t, type Collection, type Language } from "../lib/brainy";

type Props = {
  collections: Collection[];
  selectedId: string | null;
  loading: boolean;
  language: Language;
  onSelect: (id: string) => void;
  onTemplate: () => void;
  onManual: () => void;
  onTransfer: () => void;
  onTools: () => void;
};

export default function CollectionSidebar({ collections, selectedId, loading, language, onSelect, onTemplate, onManual, onTransfer, onTools }: Props) {
  const [query, setQuery] = useState("");
  const visible = collections.filter((item) => item.name.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)));
  const fr = language === "fr";
  return <div className="collection-sidebar">
    <div className="sidebar-heading"><span>{t(language, "collections")}</span><span className="sidebar-total">{collections.length}</span></div>
    <label className="sidebar-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{fr ? "Rechercher une collection" : "Search collections"}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={fr ? "Rechercher…" : "Search…"} /></label>
    <nav className="collection-nav" aria-label={t(language, "collections")}>
      {visible.map((collection) => <button type="button" key={collection.id} className={`nav-item ${selectedId === collection.id ? "active" : ""}`} aria-current={selectedId === collection.id ? "page" : undefined} title={collection.name} onClick={() => onSelect(collection.id)}><FolderHeart size={18} /><span>{collection.name}</span><span className="nav-count">{collection.formats.length}</span></button>)}
      {!loading && collections.length === 0 && <p className="sidebar-empty">{t(language, "noCollectionsDetail")}</p>}
      {query && visible.length === 0 && collections.length > 0 && <p className="sidebar-empty">{fr ? "Aucune collection trouvée" : "No matching collections"}</p>}
    </nav>
    <div className="sidebar-actions">
      <button type="button" className="sidebar-new-collection" onClick={onTemplate}><Plus size={18} />{t(language, "newCollection")}</button>
      <details className="sidebar-more" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
        <summary><Settings2 size={17} />{fr ? "Autres actions" : "More actions"}</summary>
        <div className="sidebar-more-options">
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onManual(); }}><Plus size={16} />{fr ? "Créer manuellement" : "Create manually"}</button>
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onTransfer(); }}><Upload size={16} />{t(language, "importData")} / {t(language, "exportData")}</button>
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onTools(); }}><SlidersHorizontal size={16} />{fr ? "Outils de l’espace" : "Workspace tools"}</button>
        </div>
      </details>
    </div>
  </div>;
}
