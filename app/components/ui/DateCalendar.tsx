"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Language } from "../../../lib/brainy";
import { addDays, addMonths, clampIso, fullDateLabel, monthTitle, monthWeeks, todayLocalIso, weekBounds, weekdayLabels } from "../../../lib/date-input";
import { cycleTab } from "./use-dialog-focus";

const GAP = 8;

/** Calendar in the top layer: dialogs and scrolling panels cannot clip it. */
export function DateCalendar({ language, value, min, max, anchor, onSelect, onClose }: {
  language: Language; value: string; min?: string; max?: string;
  anchor: RefObject<HTMLElement | null>;
  onSelect: (iso: string) => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const fr = language === "fr";
  const titleId = useId();
  const panel = useRef<HTMLSpanElement>(null);
  const focusCursor = useRef(false);
  const onCloseRef = useRef(onClose);
  const [today] = useState(() => todayLocalIso());
  const [cursor, setCursor] = useState(() => clampIso(value || today, min, max));
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const position = () => {
      const box = anchor.current?.getBoundingClientRect();
      if (!box) return;
      const rect = element.getBoundingClientRect();
      const below = box.bottom + GAP;
      element.style.top = `${below + rect.height <= window.innerHeight - GAP ? below : Math.max(GAP, box.top - GAP - rect.height)}px`;
      element.style.left = `${Math.max(GAP, Math.min(box.left, window.innerWidth - rect.width - GAP))}px`;
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!element.contains(target) && !anchor.current?.contains(target)) onCloseRef.current(false);
    };
    element.showPopover();
    position();
    element.querySelector<HTMLElement>('[data-active="true"]')?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [anchor]);

  useEffect(() => {
    if (!focusCursor.current) return;
    focusCursor.current = false;
    panel.current?.querySelector<HTMLElement>('[data-active="true"]')?.focus();
  }, [cursor]);

  const browse = (next: string) => setCursor(clampIso(next, min, max));
  const moveFocus = (next: string) => { focusCursor.current = true; browse(next); };
  const onGridKey = (event: KeyboardEvent) => {
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      Home: () => weekBounds(cursor, language)[0],
      End: () => weekBounds(cursor, language)[1],
      PageUp: () => addMonths(cursor, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(cursor, event.shiftKey ? 12 : 1),
    };
    const key = keys[event.key];
    if (!key) return;
    event.preventDefault();
    moveFocus(key());
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(true); }
    if (event.key === "Tab") { event.stopPropagation(); cycleTab(event, panel.current); }
  };
  const nav = (months: number, label: string, icon: React.ReactNode) => <button type="button" aria-label={label} title={label} onClick={() => browse(addMonths(cursor, months))}>{icon}</button>;
  const outOfRange = (iso: string) => !!((min && iso < min) || (max && iso > max));

  return <span ref={panel} className="brainy-calendar" popover="manual" role="dialog" aria-modal="true" aria-label={fr ? "Choisir une date" : "Choose a date"} tabIndex={-1}
    onClick={(event) => event.preventDefault() /* Inside a <label>, a click must not move focus back to the text field. */}
    onKeyDown={onKey}>
    <span className="brainy-calendar-head">
      <span>
        {nav(-12, fr ? "Année précédente" : "Previous year", <ChevronsLeft size={18} aria-hidden="true" />)}
        {nav(-1, fr ? "Mois précédent" : "Previous month", <ChevronLeft size={18} aria-hidden="true" />)}
      </span>
      <strong id={titleId} aria-live="polite">{monthTitle(cursor, language)}</strong>
      <span>
        {nav(1, fr ? "Mois suivant" : "Next month", <ChevronRight size={18} aria-hidden="true" />)}
        {nav(12, fr ? "Année suivante" : "Next year", <ChevronsRight size={18} aria-hidden="true" />)}
      </span>
    </span>
    <span className="brainy-calendar-grid" role="grid" aria-labelledby={titleId} onKeyDown={onGridKey}>
      <span className="brainy-calendar-row" role="row">
        {weekdayLabels(language).map((day) => <span key={day.long} className="brainy-calendar-weekday" role="columnheader" aria-label={day.long}>{day.short}</span>)}
      </span>
      {monthWeeks(cursor, language).map((week) => <span key={week[0]} className="brainy-calendar-row" role="row">
        {week.map((iso) => <span key={iso} role="gridcell" aria-selected={iso === value}>
          <button type="button" tabIndex={iso === cursor ? 0 : -1} disabled={outOfRange(iso)} aria-label={fullDateLabel(iso, language)} aria-current={iso === today ? "date" : undefined}
            data-active={iso === cursor} data-selected={iso === value} data-today={iso === today} data-outside={iso.slice(0, 7) !== cursor.slice(0, 7)}
            onFocus={() => { if (iso !== cursor) setCursor(iso); }} onClick={() => onSelect(iso)}>{Number(iso.slice(8))}</button>
        </span>)}
      </span>)}
    </span>
    <span className="brainy-calendar-foot">
      <button type="button" disabled={outOfRange(today)} onClick={() => onSelect(today)}>{fr ? "Aujourd’hui" : "Today"}</button>
    </span>
  </span>;
}
