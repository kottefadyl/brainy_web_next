"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Language } from "../lib/brainy";
import { PAGE_SIZES, type PageSize } from "../lib/view-memory";
import { AccessibleListbox } from "./components/ui/AccessibleListbox";
import { LocalizedDateInput } from "./components/ui/LocalizedDateInput";
import "./entries-pager.css";

type Props = {
  language: Language;
  /** Position of the first entry shown (0-based). */
  offset: number;
  pageSize: PageSize;
  /** Entries matching in all pages; null while unknown. */
  total: number | null;
  /** Entries on this page. */
  shown: number;
  hasMore: boolean;
  busy: boolean;
  /** Date jump makes sense when entries follow their creation date (not a manual order). */
  dateJump: boolean;
  onGo: (offset: number) => void;
  onDate: (date: string) => void;
  onPageSize: (size: PageSize) => void;
  /** "top": above the list; on phones it keeps only the range and the page arrows. */
  placement?: "top" | "bottom";
};

/**
 * Navigation through long lists: the range shown, first / previous / next / last, a page number to type,
 * a date to jump to, and the page size. Thousands of entries stay a few steps away.
 */
export default function EntriesPager({ language, offset, pageSize, total, shown, hasMore, busy, dateJump, onGo, onDate, onPageSize, placement = "bottom" }: Props) {
  const fr = language === "fr";
  const number = new Intl.NumberFormat(language);
  const pages = total != null ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const current = Math.floor(offset / pageSize) + 1;
  const [pageText, setPageText] = useState("");
  const [date, setDate] = useState("");
  const atStart = offset === 0;
  const atEnd = pages != null ? current >= pages : !hasMore;
  const go = (page: number) => onGo((Math.min(Math.max(page, 1), pages ?? page) - 1) * pageSize);
  const submitPage = (event: FormEvent) => {
    event.preventDefault();
    const page = Number(pageText);
    if (Number.isInteger(page) && page >= 1) { go(page); setPageText(""); }
  };
  if (total === 0 || (atStart && atEnd && (total ?? shown) <= PAGE_SIZES[0])) return null;
  const from = shown ? offset + 1 : 0;
  const to = offset + shown;
  return (
    <nav className="entries-pager" data-placement={placement} aria-label={fr ? "Pages d’entrées" : "Entry pages"} aria-busy={busy || undefined}>
      <p className="entries-pager-range" aria-live="polite">
        {total != null
          ? <>{fr ? "Entrées" : "Entries"} <strong>{number.format(from)}–{number.format(to)}</strong> {fr ? "sur" : "of"} <strong>{number.format(total)}</strong></>
          : <>{fr ? "Entrées" : "Entries"} <strong>{number.format(from)}–{number.format(to)}</strong></>}
      </p>
      <div className="entries-pager-steps">
        <button type="button" className="pager-step pager-edge" onClick={() => go(1)} disabled={busy || atStart} aria-label={fr ? "Première page" : "First page"} title={fr ? "Première page" : "First page"}><ChevronsLeft size={18} aria-hidden="true" /></button>
        <button type="button" className="pager-step" onClick={() => go(current - 1)} disabled={busy || atStart} aria-label={fr ? "Page précédente" : "Previous page"} title={fr ? "Page précédente" : "Previous page"}><ChevronLeft size={18} aria-hidden="true" /></button>
        <form className="pager-page" onSubmit={submitPage}>
          <label>
            <span>{fr ? "Page" : "Page"}</span>
            <input type="number" inputMode="numeric" min={1} max={pages ?? undefined} value={pageText} placeholder={number.format(current)} onChange={(event) => setPageText(event.target.value)} aria-label={fr ? `Aller à la page (actuelle : ${current})` : `Go to page (current: ${current})`} disabled={busy} />
          </label>
          {pages != null && <span className="pager-of">{fr ? "sur" : "of"} {number.format(pages)}</span>}
          <button type="submit" className="pager-go" disabled={busy || !pageText.trim()}>{fr ? "Aller" : "Go"}</button>
        </form>
        <button type="button" className="pager-step" onClick={() => go(current + 1)} disabled={busy || atEnd} aria-label={fr ? "Page suivante" : "Next page"} title={fr ? "Page suivante" : "Next page"}><ChevronRight size={18} aria-hidden="true" /></button>
        {pages != null && <button type="button" className="pager-step pager-edge" onClick={() => go(pages)} disabled={busy || atEnd} aria-label={fr ? "Dernière page" : "Last page"} title={fr ? "Dernière page" : "Last page"}><ChevronsRight size={18} aria-hidden="true" /></button>}
      </div>
      <div className="entries-pager-options">
        {dateJump && (
          <label className="pager-date">
            <span>{fr ? "Aller à la date" : "Go to date"}</span>
            <LocalizedDateInput language={language} value={date} disabled={busy} onChange={(value) => { setDate(value); if (/^\d{4}-\d{2}-\d{2}$/.test(value)) onDate(value); }} />
          </label>
        )}
        <div className="pager-size">
          <AccessibleListbox label={fr ? "Par page" : "Per page"} value={String(pageSize)} options={PAGE_SIZES.map((size) => ({ id: String(size), label: number.format(size) }))} onChange={(value) => onPageSize(Number(value) as PageSize)} disabled={busy} />
        </div>
      </div>
    </nav>
  );
}
