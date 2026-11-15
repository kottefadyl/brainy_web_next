"use client";

import { useEffect, useId, useRef } from "react";
import { Bell, Copy, Eye, FileText, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { t, type Language } from "../lib/brainy";

type Props = {
  language: Language;
  appendOnly: boolean;
  onDetails: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinks?: () => void;
  onReminder?: () => void;
};

/**
 * Details, then a ⋯ menu for the other actions. The menu is a native top-layer popover, so neither the row
 * (cut to its own size on phones) nor the following rows can hide it.
 */
export default function EntryRowActions({ language, appendOnly, onDetails, onCopy, onEdit, onDelete, onLinks, onReminder }: Props) {
  const fr = language === "fr";
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const position = () => {
    if (!trigger.current || !panel.current?.matches(":popover-open")) return;
    const anchor = trigger.current.getBoundingClientRect();
    const rect = panel.current.getBoundingClientRect();
    const gap = 6;
    const below = anchor.bottom + gap;
    // Opens below the button, or above it when the screen ends first.
    const top = below + rect.height <= window.innerHeight - gap ? below : Math.max(gap, anchor.top - gap - rect.height);
    panel.current.style.left = `${Math.max(gap, Math.min(anchor.right - rect.width, window.innerWidth - rect.width - gap))}px`;
    panel.current.style.top = `${top}px`;
  };
  useEffect(() => {
    const reposition = () => position();
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, []);
  const runMenuAction = (action: () => void) => {
    panel.current?.hidePopover();
    trigger.current?.focus();
    action();
  };
  const label = fr ? "Actions de l’entrée" : "Entry actions";
  return (
    <div className="entry-actions">
      <button type="button" className="small-action entry-details-action" aria-label={fr ? "Détails" : "Details"} onClick={onDetails}><Eye size={16} /><span>{fr ? "Détails" : "Details"}</span></button>
      <div className="entry-more">
        <button ref={trigger} type="button" className="small-action entry-more-trigger" popoverTarget={id} title={label} aria-label={label}><MoreHorizontal size={18} aria-hidden="true" /></button>
        <div ref={panel} id={id} popover="auto" role="menu" aria-label={label} className="entry-action-menu"
          onToggle={(event) => { if (event.newState === "open") { position(); panel.current?.querySelector("button")?.focus({ preventScroll: true }); } }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); panel.current?.hidePopover(); trigger.current?.focus(); }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")].filter((item) => item.offsetParent !== null);
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
            }
          }}>
          <button type="button" role="menuitem" onClick={() => runMenuAction(onCopy)}><Copy size={16} /> {t(language, "copyEntry")}</button>
          <button type="button" role="menuitem" className="entry-write-action" onClick={() => runMenuAction(onEdit)}>{appendOnly ? <FileText size={16} /> : <Pencil size={16} />} {appendOnly ? fr ? "Ouvrir le registre" : "Open register" : t(language, "edit")}</button>
          {onLinks && <button type="button" role="menuitem" className="entry-write-action" onClick={() => runMenuAction(onLinks)}><Link2 size={16} /> {fr ? "Liens entre entrées" : "Entry links"}</button>}
          {onReminder && <button type="button" role="menuitem" className="entry-write-action" onClick={() => runMenuAction(onReminder)}><Bell size={16} /> {fr ? "Rappels" : "Reminders"}</button>}
          {!appendOnly && <button type="button" role="menuitem" className="entry-action-danger" onClick={() => runMenuAction(onDelete)}><Trash2 size={16} /> {t(language, "delete")}</button>}
        </div>
      </div>
    </div>
  );
}
