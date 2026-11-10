"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { t, type Language } from "../lib/brainy";
import type { Suggestion } from "../lib/profile-suggestions";

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase().trim();

/** Ranks suggestions matching the query in either language; labels are shown in the interface language. */
export function searchSuggestions(suggestions: readonly Suggestion[], query: string, language: Language, exclude: readonly string[] = [], limit = 8): string[] {
  const needle = fold(query);
  const excluded = new Set(exclude.map(fold));
  const ranked: { label: string; rank: number }[] = [];
  for (const pair of suggestions) {
    const label = language === "fr" ? pair[1] : pair[0];
    if (excluded.has(fold(label))) continue;
    let rank = needle ? Infinity : 2;
    for (const text of pair.map(fold)) {
      if (!needle) break;
      if (text.startsWith(needle)) rank = Math.min(rank, 0);
      else if (text.split(/[\s/’'-]+/).some((word) => word.startsWith(needle))) rank = Math.min(rank, 1);
      else if (text.includes(needle)) rank = Math.min(rank, 2);
    }
    if (rank !== Infinity) ranked.push({ label, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, language)).slice(0, limit).map((item) => item.label);
}

type Option = { value: string; text: string; typed?: boolean };

function useCombobox(options: Option[], onPick: (option: Option) => void, closeOnPick: boolean) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  function pick(option: Option) { onPick(option); setActive(-1); if (closeOnPick) setOpen(false); }
  const listId = useId();
  const visible = open && options.length > 0;
  const current = visible && active >= 0 && active < options.length ? active : -1;
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): boolean {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); setActive(event.key === "ArrowDown" ? 0 : options.length - 1); return true; }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((value) => (Math.max(-1, value) + step + options.length) % Math.max(1, options.length));
      return true;
    }
    if (event.key === "Escape" && visible) { event.preventDefault(); setOpen(false); return true; }
    if (event.key === "Enter" && current >= 0) { event.preventDefault(); pick(options[current]); return true; }
    return false;
  }
  const inputProps = {
    role: "combobox" as const, "aria-autocomplete": "list" as const, "aria-expanded": visible, "aria-controls": listId,
    "aria-activedescendant": current >= 0 ? `${listId}-${current}` : undefined,
  };
  const list = (label: string) => visible ? <ul className="suggest-list" id={listId} role="listbox" aria-label={label}>
    {options.map((option, index) => <li key={`${option.typed ? "typed" : "item"}-${option.value}`} id={`${listId}-${index}`} role="option" aria-selected={index === current}
      className={`suggest-option${index === current ? " active" : ""}${option.typed ? " typed" : ""}`}
      onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => pick(option)}>{option.text}</li>)}
  </ul> : null;
  return { open, setOpen, setActive, onKeyDown, inputProps, list };
}

type CommonProps = { id?: string; label: ReactNode; hint?: string; language: Language; suggestions: readonly Suggestion[]; maxLength: number };

/** Single free-text value with a suggestion list (profession, current job). */
export function SuggestField({ label, hint, language, suggestions, maxLength, value, onChange }: CommonProps & { value: string; onChange: (value: string) => void }) {
  const inputId = useId();
  const hintId = useId();
  const options = useMemo(() => {
    const matches = searchSuggestions(suggestions, value, language, [], 8);
    return matches.filter((item) => fold(item) !== fold(value)).map((item) => ({ value: item, text: item }));
  }, [suggestions, value, language]);
  const combo = useCombobox(options, (option) => onChange(option.value), true);
  return <div className="input-label suggest-field">
    <label htmlFor={inputId}>{label}</label>
    <div className="suggest-anchor">
      <input id={inputId} {...combo.inputProps} aria-describedby={hintId} autoComplete="off" value={value} maxLength={maxLength}
        onChange={(event) => { onChange(event.target.value); combo.setOpen(true); combo.setActive(-1); }}
        onFocus={() => combo.setOpen(true)} onBlur={() => combo.setOpen(false)} onKeyDown={combo.onKeyDown} />
      {combo.list(t(language, "suggestionsLabel"))}
    </div>
    <small id={hintId} className="suggest-hint">{hint ?? t(language, "suggestHint")}</small>
  </div>;
}

/** Several free-text values shown as removable chips, with a suggestion list (interests, hobbies). */
export function SuggestTagsField({ label, hint, language, suggestions, maxLength, values, onChange, maxItems = 12 }: CommonProps & { values: string[]; onChange: (values: string[]) => void; maxItems?: number }) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const full = values.length >= maxItems;
  const options = useMemo<Option[]>(() => {
    if (full) return [];
    const typed = query.trim();
    const matches = searchSuggestions(suggestions, typed, language, values, typed ? 8 : 10).map((item) => ({ value: item, text: item }));
    const exact = matches.some((item) => fold(item.value) === fold(typed)) || values.some((item) => fold(item) === fold(typed));
    return typed && !exact ? [...matches, { value: typed.slice(0, maxLength), text: t(language, "addTyped").replace("{value}", typed.slice(0, maxLength)), typed: true }] : matches;
  }, [full, query, suggestions, language, values, maxLength]);
  function add(...raw: string[]) {
    setQuery("");
    const next = [...values];
    for (const text of raw) {
      const item = text.trim().slice(0, maxLength);
      if (item && next.length < maxItems && !next.some((value) => fold(value) === fold(item))) next.push(item);
    }
    if (next.length !== values.length) onChange(next);
  }
  function type(text: string) {
    const parts = text.split(/[,;\n]/);
    if (parts.length > 1) {
      add(...parts.slice(0, -1));
      setQuery(parts[parts.length - 1]);
    } else setQuery(text);
    combo.setOpen(true);
    combo.setActive(parts[parts.length - 1].trim() ? 0 : -1);
  }
  const combo = useCombobox(options, (option) => add(option.value), false);
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !query && values.length) { onChange(values.slice(0, -1)); return; }
    if (combo.onKeyDown(event)) return;
    if (event.key === "Enter") { event.preventDefault(); add(query); }
  }
  return <div className="input-label suggest-field">
    <label htmlFor={inputId}>{label}</label>
    <div className="suggest-anchor">
      <div className="tag-box" onClick={() => inputRef.current?.focus()}>
        {values.map((item) => <span className="tag-chip" key={item}>
          <span className="tag-chip-text" title={item}>{item}</span>
          <button type="button" className="tag-chip-remove" aria-label={t(language, "removeItem").replace("{item}", item)}
            onClick={(event) => { event.stopPropagation(); onChange(values.filter((value) => value !== item)); inputRef.current?.focus(); }}><X size={14} aria-hidden="true" /></button>
        </span>)}
        <input ref={inputRef} id={inputId} {...combo.inputProps} aria-describedby={hintId} autoComplete="off" value={query} maxLength={maxLength}
          disabled={full} placeholder={values.length ? "" : t(language, "choosePlaceholder")}
          onChange={(event) => type(event.target.value)}
          onFocus={() => { combo.setOpen(true); combo.setActive(query.trim() ? 0 : -1); }} onBlur={() => { combo.setOpen(false); if (query.trim()) add(query); }} onKeyDown={onKeyDown} />
      </div>
      {combo.list(t(language, "suggestionsLabel"))}
    </div>
    <small id={hintId} className="suggest-hint">{full ? t(language, "profileLimit") : hint ?? t(language, "tagsHint")}</small>
  </div>;
}
