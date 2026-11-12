"use client";

import { useState, type CSSProperties } from "react";
import { FolderHeart, Plus, Search, Settings2, SlidersHorizontal, Compass, GraduationCap, Upload, Users, FolderInput } from "lucide-react";
import { t, type Collection, type Language } from "../lib/brainy";
import "./collaborators.css";
import { CollectionScopeTabs, scopeFor, type CollectionScope } from "./components/shell/CollectionScopeTabs";

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
  onGuide?: () => void;
  onGuideCenter?: () => void;
  onCollaborators?: () => void;
};

export default function CollectionSidebar({ collections, selectedId, loading, language, onSelect, onTemplate, onManual, onTransfer, onTools, onGuide, onGuideCenter, onCollaborators }: Props) {
  const [query, setQuery] = useState("");
  const matching = collections.filter((item) => item.name.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)));
  const [scopeChoice, setScopeChoice] = useState<CollectionScope | null>(null);
  const mine = matching.filter((item) => !item.sharedBy);
  const shared = matching.filter((item) => item.sharedBy);
  const sharedTotal = collections.filter((item) => item.sharedBy).length;
  const scope = scopeFor(scopeChoice, !!collections.find((item) => item.id === selectedId)?.sharedBy, sharedTotal);
  const visible = scope === "shared" ? shared : mine;
  const activeIndex = visible.findIndex((item) => item.id === selectedId);
  const fr = language === "fr";
  return <div className="collection-sidebar">
    <div className="sidebar-heading"><span>{t(language, "collections")}</span><span className="sidebar-total">{collections.length}</span></div>
    <label className="sidebar-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{fr ? "Rechercher une collection" : "Search collections"}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={fr ? "Rechercher…" : "Search…"} /></label>
    {sharedTotal > 0 && <CollectionScopeTabs language={language} value={scope} mineCount={mine.length} sharedCount={shared.length} listId="sidebar-collections" onChange={setScopeChoice} />}
    <nav id="sidebar-collections" className="collection-nav" {...(sharedTotal > 0 ? { role: "tabpanel", "aria-labelledby": `sidebar-collections-tab-${scope}` } : { "aria-label": t(language, "collections") })} data-active-visible={activeIndex >= 0} style={{ "--active-index": activeIndex } as CSSProperties}>
      {visible.map((collection) => collection.sharedBy
        ? <button type="button" key={collection.id} className={`nav-item ${selectedId === collection.id ? "active" : ""}`} aria-current={selectedId === collection.id ? "page" : undefined} aria-label={`${collection.name} · ${fr ? "partagée par" : "shared by"} ${collection.sharedBy.name}`} title={`${collection.name} · ${collection.sharedBy.name}`} onClick={() => onSelect(collection.id)}><FolderInput size={18} aria-hidden="true" /><span>{collection.name}</span><span className="nav-owner" aria-hidden="true">{collection.sharedBy.name.split(" ")[0]}</span></button>
        : <button type="button" key={collection.id} className={`nav-item ${selectedId === collection.id ? "active" : ""}`} aria-current={selectedId === collection.id ? "page" : undefined} aria-label={collection.name} title={collection.name} onClick={() => onSelect(collection.id)}><FolderHeart size={18} aria-hidden="true" /><span>{collection.name}</span><span className="nav-count" aria-hidden="true">{collection.formats.length}</span></button>)}
      {!loading && collections.length === 0 && <p className="sidebar-empty">{t(language, "noCollectionsDetail")}</p>}
      {query && visible.length === 0 && collections.length > 0 && <p className="sidebar-empty">{fr ? "Aucune collection trouvée ici" : "No matching collections here"}{matching.length > 0 && <button type="button" className="sidebar-empty-switch" onClick={() => setScopeChoice(scope === "shared" ? "mine" : "shared")}>{scope === "shared" ? fr ? `Voir ${mine.length} dans Mes collections` : `See ${mine.length} in My collections` : fr ? `Voir ${shared.length} dans Partagées avec moi` : `See ${shared.length} in Shared with me`}</button>}</p>}
    </nav>
    <div className="sidebar-actions">
      <button type="button" className="sidebar-new-collection" onClick={onTemplate}><Plus size={18} />{t(language, "newCollection")}</button>
      <details className="sidebar-more" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
        <summary><Settings2 size={17} />{fr ? "Autres actions" : "More actions"}</summary>
        <div className="sidebar-more-options">
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onManual(); }}><Plus size={16} />{fr ? "Créer manuellement" : "Create manually"}</button>
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onTransfer(); }}><Upload size={16} />{t(language, "importData")} / {t(language, "exportData")}</button>
          <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onTools(); }}><SlidersHorizontal size={16} />{fr ? "Outils de l’espace" : "Workspace tools"}</button>
          {onGuide && <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onGuide(); }}><Compass size={16} />{fr ? "Guide de démarrage" : "Getting started guide"}</button>}
          {onCollaborators && <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onCollaborators(); }}><Users size={16} />{fr ? "Collaborateurs" : "Collaborators"}</button>}
          {onGuideCenter && <button type="button" onClick={(event) => { event.currentTarget.closest("details")!.open = false; onGuideCenter(); }}><GraduationCap size={16} />{fr ? "Guide et formation" : "Guide and training"}</button>}
        </div>
      </details>
    </div>
  </div>;
}
