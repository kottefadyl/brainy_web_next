"use client";

// T47/2: on-screen pages for the book view. After layout, each sheet is cut into pages of the chosen
// paper size: a block that would cross a page edge moves to the next page and every page gets its
// number. The contents and the index hold placeholders (data-page-for, data-index-pages) that receive
// the page numbers; with the paged view off they keep their chapter labels.
// Printing ignores this (the browser paginates; see the print rules of book-view.css).
import { useEffect, useLayoutEffect, type RefObject } from "react";

const PX_PER_MM = 96 / 25.4;
const GAP = 24;
const BLOCKS = "p, h1, h2, h3, h4, blockquote, li, img, .book-kicker, .book-authors, .book-placeholder";

/** Restores the sheet as written: no pushed blocks, no page numbers. */
function reset(sheet: HTMLElement) {
  sheet.querySelectorAll<HTMLElement>("[data-paged-push]").forEach((element) => { element.style.marginTop = element.dataset.pagedPush ?? ""; delete element.dataset.pagedPush; });
  sheet.querySelectorAll(".book-page-number").forEach((element) => element.remove());
  sheet.classList.remove("is-paged");
  sheet.style.removeProperty("min-height");
  sheet.style.removeProperty("--book-page-px");
  sheet.style.removeProperty("--book-stride");
}

/** Cuts one sheet into pages; returns how many pages it takes. */
function paginate(sheet: HTMLElement, pageWidthMm: number, pageHeightMm: number, firstPage: number): number {
  const scale = sheet.clientWidth / (pageWidthMm * PX_PER_MM);
  const pageHeight = pageHeightMm * PX_PER_MM * scale;
  const margin = parseFloat(getComputedStyle(sheet).paddingTop) || 0;
  const stride = pageHeight + GAP;
  const usable = pageHeight - 2 * margin;
  // Outer blocks only: a paragraph inside a list item moves with it.
  const blocks = [...sheet.querySelectorAll<HTMLElement>(BLOCKS)].filter((element) => !element.parentElement?.closest(BLOCKS));
  for (const block of blocks) {
    const box = block.getBoundingClientRect();
    if (!box.height) continue;
    const top = box.top - sheet.getBoundingClientRect().top;
    const page = Math.floor(top / stride);
    const start = page * stride + margin, end = page * stride + pageHeight - margin;
    let push = 0;
    if (top < start) push = start - top; // in the top margin of a page
    else if (top + box.height > end && box.height <= usable) push = (page + 1) * stride + margin - top; // would cross the bottom edge
    if (push > 0.5) {
      block.dataset.pagedPush = block.style.marginTop;
      block.style.marginTop = `${(parseFloat(getComputedStyle(block).marginTop) || 0) + push}px`;
    }
  }
  const pages = Math.max(1, Math.ceil((sheet.scrollHeight - margin + GAP) / stride));
  sheet.classList.add("is-paged");
  sheet.style.minHeight = `${pages * stride - GAP}px`;
  sheet.style.setProperty("--book-page-px", `${pageHeight}px`);
  sheet.style.setProperty("--book-stride", `${stride}px`);
  for (let index = 0; index < pages; index++) {
    const number = document.createElement("span");
    number.className = "book-page-number";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(firstPage + index);
    number.style.top = `${index * stride + pageHeight - margin / 2}px`;
    sheet.appendChild(number);
  }
  return pages;
}

/** Lays out the pages of every sheet under root, then fills the page numbers of the contents and the index. */
export function paginateBook(root: HTMLElement, enabled: boolean, pageWidthMm: number, pageHeightMm: number, language: string) {
  const sheets = [...root.querySelectorAll<HTMLElement>(".book-sheet")];
  sheets.forEach(reset);
  const pageOf = new Map<string, number>();
  if (enabled) {
    let page = 1;
    for (const sheet of sheets) { pageOf.set(sheet.id, page); page += paginate(sheet, pageWidthMm, pageHeightMm, page); }
  }
  root.querySelectorAll<HTMLElement>("[data-page-for]").forEach((element) => { element.textContent = enabled ? String(pageOf.get(`book-${element.dataset.pageFor}`) ?? "") : ""; });
  root.querySelectorAll<HTMLElement>("[data-index-pages]").forEach((element) => {
    const pages = [...new Set((element.dataset.indexPages ?? "").split(",").filter(Boolean).map((id) => pageOf.get(`book-${id}`)).filter((value): value is number => value !== undefined))];
    element.textContent = enabled && pages.length ? `p. ${pages.join(", ")}` : element.dataset.chapterLabel ?? "";
  });
  void language;
}

/** Re-runs the page layout after a change of the book, of the cell being edited, of the layout settings or of the width. */
export function useBookPagination(root: RefObject<HTMLElement | null>, enabled: boolean, pageWidthMm: number, pageHeightMm: number, language: string, content: unknown, editing: unknown, layout: unknown) {
  useLayoutEffect(() => {
    if (root.current) paginateBook(root.current, enabled, pageWidthMm, pageHeightMm, language);
  }, [root, enabled, pageWidthMm, pageHeightMm, language, content, editing, layout]);
  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    let frame = 0;
    let width = element.clientWidth;
    const again = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => paginateBook(element, enabled, pageWidthMm, pageHeightMm, language)); };
    // A new width (window, zoom) changes every page; edits re-run through the signal.
    const observer = new ResizeObserver(() => { if (element.clientWidth !== width) { width = element.clientWidth; again(); } });
    observer.observe(element);
    void document.fonts?.ready.then(again);
    // The printed book paginates by itself: screen pages and their numbers step aside while printing.
    const beforePrint = () => paginateBook(element, false, pageWidthMm, pageHeightMm, language);
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", again);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("beforeprint", beforePrint); window.removeEventListener("afterprint", again); };
  }, [root, enabled, pageWidthMm, pageHeightMm, language]);
}
