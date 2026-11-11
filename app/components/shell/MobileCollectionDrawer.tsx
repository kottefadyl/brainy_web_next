"use client";

import { focusableWithin } from "../ui/use-dialog-focus";
import { useEffect, useRef, useState, type RefObject } from "react";
import { GraduationCap, LogOut, Pencil, Plus, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { t, type Collection, type Language } from "../../../lib/brainy";

type Props = {
  open: boolean;
  collections: Collection[];
  selectedId: string | null;
  language: Language;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSelect: (id: string) => void;
  onTemplate: () => void;
  onManual: () => void;
  onTools: () => void;
  onGuideCenter?: () => void;
  onCollaborators?: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
};

export function MobileCollectionDrawer({ open, collections, selectedId, language, triggerRef, onClose, onSelect, onTemplate, onManual, onTools, onGuideCenter, onCollaborators, onEditProfile, onSignOut }: Props) {
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const fr = language === "fr";
  const visible = collections.filter((item) => item.name.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)));
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => { document.body.style.overflow = previousOverflow; trigger?.focus(); };
  }, [open, triggerRef]);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open, onClose]);

  const focusable = () => focusableWithin(panelRef.current);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
  };
  const run = (action: () => void) => { action(); onClose(); };

  return <div className="mobile-drawer" id="mobile-collection-menu" data-open={open} aria-hidden={!open} inert={!open}>
    <button type="button" className="mobile-drawer-backdrop" onClick={onClose} tabIndex={-1} aria-label={fr ? "Fermer les collections" : "Close collections"} />
    <div ref={panelRef} className="mobile-drawer-panel" role="dialog" aria-modal="true" aria-label={t(language, "collections")} onKeyDown={onKeyDown}>
      <div className="mobile-drawer-head"><strong>{t(language, "collections")}</strong><button type="button" className="icon-button" onClick={onClose} aria-label={fr ? "Fermer les collections" : "Close collections"}><X size={20} aria-hidden="true" /></button></div>
      <label className="mobile-drawer-search"><Search size={18} aria-hidden="true" /><span className="sr-only">{fr ? "Rechercher une collection" : "Search collections"}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={fr ? "Rechercher…" : "Search…"} /></label>
      <nav className="mobile-drawer-list" aria-label={t(language, "collections")}>
        {visible.filter((item) => !item.sharedBy).map((item) => <button key={item.id} type="button" title={item.name} aria-label={item.name} aria-current={selectedId === item.id ? "page" : undefined} onClick={() => run(() => onSelect(item.id))}><span className="mobile-drawer-name">{item.name}</span><span className="mobile-drawer-count" aria-hidden="true">{item.formats.length}</span></button>)}
        {visible.some((item) => item.sharedBy) && <p className="sidebar-subheading"><Users size={14} aria-hidden="true" />{fr ? "Partagées avec moi" : "Shared with me"}</p>}
        {visible.filter((item) => item.sharedBy).map((item) => <button key={item.id} type="button" title={item.name} aria-label={`${item.name} · ${fr ? "partagée par" : "shared by"} ${item.sharedBy!.name}`} aria-current={selectedId === item.id ? "page" : undefined} onClick={() => run(() => onSelect(item.id))}><span className="mobile-drawer-name">{item.name}</span><span className="mobile-drawer-count" aria-hidden="true">{item.sharedBy!.name.split(" ")[0]}</span></button>)}
        {query && visible.length === 0 && <p>{fr ? "Aucune collection trouvée" : "No matching collections"}</p>}
      </nav>
      <div className="mobile-drawer-actions">
        <button type="button" className="mobile-drawer-create" onClick={() => run(onTemplate)}><Plus size={17} aria-hidden="true" />{t(language, "newCollection")}</button>
        <button type="button" onClick={() => run(onManual)}>{fr ? "Créer manuellement" : "Create manually"}</button>
        <button type="button" onClick={() => run(onTools)}><SlidersHorizontal size={17} aria-hidden="true" />{fr ? "Outils de l’espace" : "Workspace tools"}</button>
        {onCollaborators && <button type="button" onClick={() => run(onCollaborators)}><Users size={17} aria-hidden="true" />{fr ? "Collaborateurs" : "Collaborators"}</button>}
        {onGuideCenter && <button type="button" onClick={() => run(onGuideCenter)}><GraduationCap size={17} aria-hidden="true" />{fr ? "Guide et formation" : "Guide and training"}</button>}
        <button type="button" onClick={() => run(onEditProfile)}><Pencil size={17} aria-hidden="true" />{t(language, "editProfile")}</button>
        <button type="button" onClick={() => run(onSignOut)}><LogOut size={17} aria-hidden="true" />{t(language, "signOut")}</button>
      </div>
    </div>
  </div>;
}
