"use client";

import { useEffect, useRef, type RefObject } from "react";

const candidates = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]';

/** Elements Tab can reach now: closed <details> and hidden blocks are skipped. */
export function focusableWithin(root: HTMLElement | null | undefined): HTMLElement[] {
  return Array.from(root?.querySelectorAll<HTMLElement>(candidates) ?? []).filter((element) =>
    element.tabIndex >= 0 && (element.checkVisibility?.() ?? element.getClientRects().length > 0));
}

/** Moves Tab around the ends of `root`; returns true when it took over. */
export function cycleTab(event: Pick<KeyboardEvent, "shiftKey" | "preventDefault">, root: HTMLElement | null | undefined) {
  const items = focusableWithin(root);
  if (!items.length) return false;
  const current = document.activeElement as HTMLElement | null;
  const inside = !!current && items.includes(current);
  const target = event.shiftKey
    ? (!inside || current === items[0] ? items.at(-1) : null)
    : (!inside || current === items.at(-1) ? items[0] : null);
  if (!target) return false;
  event.preventDefault();
  target.focus();
  return true;
}

/** The opener may have left with its menu: fall back to what controlled that menu. */
function restoreFocus(previous: HTMLElement | null) {
  if (!previous || previous === document.body) return;
  previous.focus();
  if (document.activeElement === previous) return;
  const summary = previous.closest("details")?.querySelector<HTMLElement>("summary");
  if (summary) { summary.focus(); return; }
  for (let node = previous.parentElement; node; node = node.parentElement) {
    if (!node.id) continue;
    const control = document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(node.id)}"]`);
    if (control) { control.focus(); return; }
  }
}

/** Shared dialog behaviour: first focus, Tab cycle, Escape and focus restored on close. */
export function useDialogFocus(containerRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!containerRef.current?.contains(document.activeElement)) focusableWithin(containerRef.current)[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      else if (event.key === "Tab") cycleTab(event, containerRef.current);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      restoreFocus(previous);
    };
  }, [containerRef]);
}
