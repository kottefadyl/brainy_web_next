"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type ListboxOption = { id: string; label: string; swatch?: string };
export function AccessibleListbox({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: readonly ListboxOption[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const search = useRef("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(0, options.findIndex((option) => option.id === value));
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);
  const reveal = (index: number) => {
    if (!options.length) return;
    const next = (index + options.length) % options.length;
    setActive(next);
    requestAnimationFrame(() => optionRefs.current[next]?.focus());
  };
  const show = (index = selected) => {
    search.current = "";
    setOpen(true);
    reveal(index);
  };
  const choose = (index: number) => {
    onChange(options[index].id);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return <div ref={root} className="brainy-listbox" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`} className="brainy-listbox-label">{label}</span>
    <button ref={trigger} type="button" className="brainy-listbox-trigger" disabled={disabled || !options.length}
      aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(selected + (event.key === "ArrowDown" ? 1 : -1)); }
      }}>
      <span id={`${id}-value`} className="brainy-listbox-value">
        {options[selected]?.swatch && <span className="brainy-listbox-swatch" style={{ backgroundColor: options[selected].swatch }} aria-hidden="true" />}
        {options[selected]?.label ?? label}
      </span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-options`} className="brainy-listbox-options" role="listbox" aria-labelledby={`${id}-label`}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
        else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); reveal(active + (event.key === "ArrowDown" ? 1 : -1)); }
        else if (event.key === "Home" || event.key === "End") { event.preventDefault(); reveal(event.key === "Home" ? 0 : options.length - 1); }
        else if (/^[\p{L}\p{N}]$/u.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          search.current += event.key.toLocaleLowerCase();
          if (searchTimer.current) clearTimeout(searchTimer.current);
          searchTimer.current = setTimeout(() => { search.current = ""; }, 600);
          const match = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(search.current));
          if (match >= 0) reveal(match);
        }
      }}>
      {options.map((option, index) => <button key={option.id} ref={(element) => { optionRefs.current[index] = element; }}
        type="button" role="option" aria-selected={option.id === value} tabIndex={active === index ? 0 : -1}
        onFocus={() => setActive(index)} onClick={() => choose(index)}>
        {option.swatch && <span className="brainy-listbox-swatch" style={{ backgroundColor: option.swatch }} aria-hidden="true" />}
        <span>{option.label}</span>{option.id === value && <Check size={16} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
