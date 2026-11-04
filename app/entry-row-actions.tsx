"use client";

import { useEffect, useRef } from "react";
import { Bell, Copy, FileText, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { t, type Language } from "../lib/brainy";

type Props = {
  language: Language;
  appendOnly: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinks?: () => void;
  onReminder?: () => void;
};

export default function EntryRowActions({ language, appendOnly, onCopy, onEdit, onDelete, onLinks, onReminder }: Props) {
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
    <div className="entry-actions">
      <button type="button" className="small-action copy-action" onClick={onCopy} title={t(language, "copyEntry")} aria-label={t(language, "copyEntry")}><Copy size={16} /><span>{t(language, "copyEntry")}</span></button>
      <button type="button" className="small-action" onClick={onEdit} title={appendOnly ? language === "fr" ? "Ouvrir le registre" : "Open register" : t(language, "edit")} aria-label={appendOnly ? language === "fr" ? "Ouvrir le registre" : "Open register" : t(language, "edit")}>{appendOnly ? <FileText size={16} /> : <Pencil size={16} />}</button>
      {(onLinks || onReminder || !appendOnly) && <details ref={menuRef} className="entry-more" onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary className="small-action" title={language === "fr" ? "Actions de l’entrée" : "Entry actions"} aria-label={language === "fr" ? "Actions de l’entrée" : "Entry actions"}><MoreHorizontal size={18} /></summary>
        <div className="entry-action-menu">
          {onLinks && <button type="button" onClick={() => runMenuAction(onLinks)}><Link2 size={16} /> {language === "fr" ? "Liens entre entrées" : "Entry links"}</button>}
          {onReminder && <button type="button" onClick={() => runMenuAction(onReminder)}><Bell size={16} /> {language === "fr" ? "Rappels" : "Reminders"}</button>}
          {!appendOnly && <button type="button" className="entry-action-danger" onClick={() => runMenuAction(onDelete)}><Trash2 size={16} /> {t(language, "delete")}</button>}
        </div>
      </details>}
    </div>
  );
}
