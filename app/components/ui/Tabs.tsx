"use client";

import { useRef } from "react";

export type TabItem = { id: string; label: string; disabled?: boolean };
type Props = { label: string; items: readonly TabItem[]; value: string; onChange: (id: string) => void; className?: string };

export function Tabs({ label, items, value, onChange, className = "" }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function move(index: number, direction: number) {
    for (let offset = 1; offset <= items.length; offset++) {
      const next = items[(index + direction * offset + items.length * offset) % items.length];
      if (next && !next.disabled) { onChange(next.id); refs.current[next.id]?.focus(); return; }
    }
  }
  function edge(last: boolean) {
    const target = last ? [...items].reverse().find((item) => !item.disabled) : items.find((item) => !item.disabled);
    if (target) { onChange(target.id); refs.current[target.id]?.focus(); }
  }
  return <div role="tablist" aria-label={label} className={`ui-tabs ${className}`.trim()}>
    {items.map((item, index) => <button key={item.id} ref={(element) => { refs.current[item.id] = element; }} type="button" role="tab" className="ui-tab" aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} disabled={item.disabled} onClick={() => onChange(item.id)} onKeyDown={(event) => {
      if (event.key === "ArrowRight") { event.preventDefault(); move(index, 1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); move(index, -1); }
      if (event.key === "Home") { event.preventDefault(); edge(false); }
      if (event.key === "End") { event.preventDefault(); edge(true); }
    }}>{item.label}</button>)}
  </div>;
}
