"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { ClassificationCode, Language } from "../lib/brainy";
import { buildCodeTree, reachableCodes, searchCodes, type CodeNode } from "../lib/code-tree";
import { useLabelText } from "./components/ui/LocalizedDateInput";
import { cycleTab } from "./components/ui/use-dialog-focus";

const MAX_ROWS = 300;
type Row = { node: CodeNode; indent: number };
type BrowserProps = {
  codes: ClassificationCode[]; language: Language; value?: string;
  /** Without it the tree can only be read, as in the list editor. */
  onSelect?: (code: string) => void;
  canSelect?: (node: CodeNode) => boolean;
  emptyLabel?: string;
  autoFocus?: boolean;
  onEscape?: () => void;
};

/** Search box and expandable tree. Focus stays in the box; arrows move the highlighted row. */
export function CodeBrowser({ codes, language, value = "", onSelect, canSelect, emptyLabel, autoFocus, onEscape }: BrowserProps) {
  const fr = language === "fr";
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  const tree = useMemo(() => buildCodeTree(codes, language), [codes, language]);
  const selectable = useMemo(() => canSelect ?? (() => true), [canSelect]);
  const reachable = useMemo(() => reachableCodes(tree, selectable), [tree, selectable]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const open = new Set<string>();
    let parent = tree.nodes.get(value)?.parent;
    while (parent && !open.has(parent)) { open.add(parent); parent = tree.nodes.get(parent)?.parent; }
    return open;
  });
  const searching = !!query.trim();
  const found = useMemo(() => searchCodes(tree, query, selectable), [tree, query, selectable]);
  const rows = useMemo<Row[]>(() => {
    if (searching) return found.results.map((node) => ({ node, indent: 0 }));
    const flat: Row[] = [];
    const visit = (codesAtLevel: string[], indent: number) => {
      for (const code of codesAtLevel) {
        if (flat.length >= MAX_ROWS) return;
        if (!reachable.has(code)) continue;
        const node = tree.nodes.get(code)!;
        flat.push({ node, indent });
        if (expanded.has(code)) visit(node.children, indent + 1);
      }
    };
    visit(tree.roots, 0);
    return flat;
  }, [searching, found, tree, reachable, expanded]);
  const current = Math.min(active, Math.max(0, rows.length - 1));

  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" }); }, [current, rows]);

  const hasVisibleChildren = (node: CodeNode) => node.children.some((code) => reachable.has(code));
  const toggle = (code: string, open?: boolean) => setExpanded((previous) => {
    const next = new Set(previous);
    if (open ?? !next.has(code)) next.add(code); else next.delete(code);
    return next;
  });
  const choose = (node: CodeNode) => {
    if (onSelect && selectable(node)) onSelect(node.code);
    else if (hasVisibleChildren(node)) toggle(node.code);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const row = rows[current];
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(rows.length - 1, current + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(0, current - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); if (row) choose(row.node); }
    else if (event.key === "Escape" && onEscape) { event.preventDefault(); event.stopPropagation(); onEscape(); }
    else if (!searching && row && event.key === "ArrowRight" && hasVisibleChildren(row.node)) {
      event.preventDefault();
      if (!expanded.has(row.node.code)) toggle(row.node.code, true); else setActive(current + 1);
    } else if (!searching && row && event.key === "ArrowLeft") {
      event.preventDefault();
      if (expanded.has(row.node.code)) toggle(row.node.code, false);
      else if (row.node.parent) setActive(Math.max(0, rows.findIndex((item) => item.node.code === row.node.parent)));
    }
  };
  const obsoleteText = fr ? "obsolète" : "obsolete";
  const rowId = (index: number) => `${listId}-${index}`;

  return <div className="code-browser">
    <div className="code-browser-search">
      <Search size={16} aria-hidden="true" />
      <input type="search" autoFocus={autoFocus} autoComplete="off" spellCheck={false} role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={rows.length ? rowId(current) : undefined}
        aria-label={fr ? "Rechercher par mot-clé ou par code" : "Search by keyword or code"} placeholder={fr ? "Mot-clé ou code" : "Keyword or code"}
        value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} />
    </div>
    <div ref={list} id={listId} className="code-browser-list" role={searching ? "listbox" : "tree"} aria-label={fr ? "Codes" : "Codes"}>
      {rows.map(({ node, indent }, index) => {
        const enabled = !onSelect || selectable(node);
        const open = expanded.has(node.code);
        const parent = hasVisibleChildren(node);
        return <div key={node.code} id={rowId(index)} className="code-browser-row" role={searching ? "option" : "treeitem"} aria-level={searching ? undefined : indent + 1} aria-expanded={!searching && parent ? open : undefined} aria-selected={node.code === value} aria-disabled={!enabled}
          data-active={index === current} data-selected={node.code === value} data-enabled={enabled} style={{ paddingInlineStart: 4 + indent * 16 }} onMouseMove={() => setActive(index)} onClick={() => choose(node)}>
          {!searching && <span className="code-browser-toggle-slot">{parent && <button type="button" className="code-browser-toggle" tabIndex={-1} aria-label={open ? (fr ? `Replier ${node.label}` : `Collapse ${node.label}`) : (fr ? `Déplier ${node.label}` : `Expand ${node.label}`)} onClick={(event: MouseEvent) => { event.stopPropagation(); toggle(node.code); }}>{open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}</button>}</span>}
          <span className="code-browser-text">
            {searching && !!node.path.length && <small className="code-browser-path">{node.path.join(" › ")}</small>}
            <span className="code-browser-label">{node.label}{!node.item.active && <em> · {obsoleteText}</em>}</span>
          </span>
          <code className="code-browser-code">{node.code}</code>
        </div>;
      })}
      {!rows.length && <p className="code-browser-empty">{searching ? (fr ? "Aucun code ne correspond." : "No matching code.") : (fr ? "Aucun code." : "No codes.")}</p>}
    </div>
    {searching && found.total > found.results.length && <p className="code-browser-note">{fr ? `${found.results.length} premiers résultats sur ${found.total}. Précisez la recherche.` : `First ${found.results.length} of ${found.total} results. Refine your search.`}</p>}
    {!searching && rows.length >= MAX_ROWS && <p className="code-browser-note">{fr ? "Liste abrégée. Utilisez la recherche." : "List shortened. Use the search."}</p>}
    {onSelect && emptyLabel && <button type="button" className="code-browser-clear" onClick={() => onSelect("")}>{emptyLabel}</button>}
  </div>;
}

/** A form control: a button showing the chosen code, opening the browser in the top layer. */
export function CodePicker({ codes, language, value, onChange, canSelect, emptyLabel, ariaLabel, disabled }: {
  codes: ClassificationCode[]; language: Language; value: string; onChange: (code: string) => void;
  canSelect?: BrowserProps["canSelect"]; emptyLabel?: string; ariaLabel?: string; disabled?: boolean;
}) {
  const fr = language === "fr";
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const tree = useMemo(() => buildCodeTree(codes, language), [codes, language]);
  const node = tree.nodes.get(value);
  const shown = node ? `${node.label} (${node.code})` : value || (fr ? "Aucun" : "None");
  useLabelText(trigger, ariaLabel, shown);
  const close = (restoreFocus: boolean) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); };

  useLayoutEffect(() => {
    const element = panel.current;
    if (!open || !element) return;
    const position = () => {
      const box = root.current?.getBoundingClientRect();
      if (!box) return;
      const rect = element.getBoundingClientRect();
      const below = box.bottom + 6;
      element.style.top = `${below + rect.height <= window.innerHeight - 8 ? below : Math.max(8, box.top - 6 - rect.height)}px`;
      element.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - rect.width - 8))}px`;
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!element.contains(target) && !root.current?.contains(target)) setOpen(false);
    };
    element.showPopover();
    position();
    element.querySelector("input")?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  return <span ref={root} className="code-picker">
    <button ref={trigger} type="button" className="code-picker-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel ? `${ariaLabel}: ${shown}` : undefined} onClick={() => setOpen(!open)}>
      <span className="code-picker-value">
        {node && !!node.path.length && <small>{node.path.join(" › ")}</small>}
        <span data-placeholder={!value}>{node ? <>{node.label} <code>{node.code}</code>{!node.item.active && <em> · {fr ? "obsolète" : "obsolete"}</em>}</> : value || (fr ? "Choisir un code" : "Choose a code")}</span>
      </span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <span ref={panel} className="code-picker-panel" popover="manual" role="dialog" aria-label={fr ? "Choisir un code" : "Choose a code"} tabIndex={-1}
      onClick={(event) => event.preventDefault() /* Inside a <label>, a click must not reopen the button. */}
      onKeyDown={(event) => { if (event.key === "Tab") { event.stopPropagation(); cycleTab(event, panel.current); } }}>
      <CodeBrowser codes={codes} language={language} value={value} canSelect={canSelect} emptyLabel={value ? emptyLabel : undefined} onEscape={() => close(true)} onSelect={(code) => { onChange(code); close(true); }} />
    </span>}
  </span>;
}
