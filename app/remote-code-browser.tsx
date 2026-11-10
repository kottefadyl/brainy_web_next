"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, CornerLeftUp, Search } from "lucide-react";
import type { Language } from "../lib/brainy";
import { referentialApi, type FoundCode } from "../lib/referentials";

/**
 * Search and level-by-level browsing of a large code list (T39/3): the
 * server returns at most 50 codes at a time, never the whole list. Same
 * look and keys as CodeBrowser; → opens a level, ← goes back up.
 */
export function RemoteCodeBrowser({ collectionId, listId, language, value = "", onSelect, emptyLabel, onEscape }: {
  collectionId: string; listId: string; language: Language; value?: string;
  onSelect?: (code: string, found: FoundCode) => void; emptyLabel?: string; onEscape?: () => void;
}) {
  const fr = language === "fr";
  const listboxId = useId();
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [trail, setTrail] = useState<FoundCode[]>([]);
  const [rows, setRows] = useState<FoundCode[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const parent = trail.at(-1);
  const searching = !!query.trim();

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      setState("loading");
      referentialApi.search(collectionId, listId, { query: query.trim(), parentCode: searching ? undefined : parent?.code, language })
        .then((found) => { if (current) { setRows(found); setActive(0); setState("ready"); } })
        .catch(() => { if (current) setState("error"); });
    }, searching ? 250 : 0);
    return () => { current = false; clearTimeout(timer); };
  }, [collectionId, listId, query, searching, parent?.code, language, retry]);

  useEffect(() => { list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" }); }, [active, rows]);

  const open = (row: FoundCode) => { setTrail([...trail, row]); setQuery(""); };
  const up = () => setTrail(trail.slice(0, -1));
  const choose = (row: FoundCode) => { if (onSelect && row.active) onSelect(row.code, row); else if (row.hasChildren) open(row); };
  const current = Math.min(active, Math.max(0, rows.length - 1));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const row = rows[current];
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(rows.length - 1, current + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(0, current - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); if (row) choose(row); }
    else if (event.key === "Escape" && onEscape) { event.preventDefault(); event.stopPropagation(); onEscape(); }
    else if (!searching && row?.hasChildren && event.key === "ArrowRight") { event.preventDefault(); open(row); }
    else if (!searching && trail.length && event.key === "ArrowLeft" && !query) { event.preventDefault(); up(); }
  };
  const rowId = (index: number) => `${listboxId}-${index}`;

  return <div className="code-browser">
    <div className="code-browser-search">
      <Search size={16} aria-hidden="true" />
      <input type="search" autoComplete="off" spellCheck={false} role="combobox" aria-expanded="true" aria-controls={listboxId} aria-activedescendant={rows.length ? rowId(current) : undefined}
        aria-label={fr ? "Rechercher par mot-clé ou par code" : "Search by keyword or code"} placeholder={fr ? "Mot-clé ou code" : "Keyword or code"}
        value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown} />
    </div>
    {!searching && !!trail.length && <div className="remote-code-trail">
      <button type="button" onClick={up}><CornerLeftUp size={15} aria-hidden="true" />{fr ? "Niveau précédent" : "Previous level"}</button>
      <small>{trail.map((item) => item.label).join(" › ")}</small>
    </div>}
    <div ref={list} id={listboxId} className="code-browser-list" role="listbox" aria-label={fr ? "Codes" : "Codes"} aria-busy={state === "loading"}>
      {rows.map((row, index) => <div key={row.code} id={rowId(index)} className="code-browser-row" role="option" aria-selected={row.code === value} aria-disabled={!row.active}
        data-active={index === current} data-selected={row.code === value} data-enabled={!onSelect || row.active} onMouseMove={() => setActive(index)} onClick={() => choose(row)}>
        <span className="code-browser-text">
          {(searching || !trail.length) && !!row.path.length && <small className="code-browser-path">{row.path.join(" › ")}</small>}
          <span className="code-browser-label">{row.label}</span>
        </span>
        <code className="code-browser-code">{row.code}</code>
        {!searching && row.hasChildren && <button type="button" className="remote-code-open" tabIndex={-1} aria-label={fr ? `Ouvrir ${row.label}` : `Open ${row.label}`} onClick={(event) => { event.stopPropagation(); open(row); }}><ChevronRight size={16} aria-hidden="true" /></button>}
      </div>)}
      {state === "ready" && !rows.length && <p className="code-browser-empty">{searching ? (fr ? "Aucun code ne correspond." : "No matching code.") : (fr ? "Aucun code." : "No codes.")}</p>}
      {state === "loading" && !rows.length && <p className="code-browser-empty">{fr ? "Chargement…" : "Loading…"}</p>}
      {state === "error" && <p className="code-browser-empty" role="alert">{fr ? "Recherche impossible." : "Search failed."} <button type="button" onClick={() => setRetry(retry + 1)}>{fr ? "Réessayer" : "Retry"}</button></p>}
    </div>
    {rows.length >= 50 && <p className="code-browser-note">{fr ? "50 premiers résultats. Précisez la recherche." : "First 50 results. Refine the search."}</p>}
    {onSelect && emptyLabel && <button type="button" className="code-browser-clear" onClick={() => onSelect("", { code: "", label: "", path: [], level: 0, active: true, hasChildren: false })}>{emptyLabel}</button>}
  </div>;
}
