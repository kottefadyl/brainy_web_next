"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

type Action = { label: string; icon: ReactNode; onSelect: () => void };

/** Native top-layer popover: cards and scroll containers cannot clip actions. */
export function ActionPopover({ label, actions, triggerIcon }: { label: string; actions: Action[]; triggerIcon?: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const position = () => {
    if (!trigger.current || !panel.current?.matches(":popover-open")) return;
    const anchor = trigger.current.getBoundingClientRect();
    const rect = panel.current.getBoundingClientRect();
    const gap = 8;
    const below = anchor.bottom + gap;
    const top = below + rect.height <= window.innerHeight - gap
      ? below : Math.max(gap, anchor.top - gap - rect.height);
    panel.current.style.left = `${Math.max(gap, Math.min(anchor.right - rect.width, window.innerWidth - rect.width - gap))}px`;
    panel.current.style.top = `${top}px`;
  };
  useEffect(() => {
    const reposition = () => position();
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, []);
  const close = () => { panel.current?.hidePopover(); trigger.current?.focus(); };
  return <div className="format-card-more">
    <button ref={trigger} type="button" className="format-menu-trigger" popoverTarget={id} aria-label={label} title={label}>{triggerIcon ?? <MoreHorizontal size={20} aria-hidden="true" />}</button>
    <div ref={panel} id={id} popover="auto" className="format-card-menu" aria-label={label}
      onToggle={(event) => { if (event.newState === "open") { position(); panel.current?.querySelector("button")?.focus({ preventScroll: true }); } }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const items = [...event.currentTarget.querySelectorAll("button")];
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        }
      }}>
      {actions.map((action) => <button key={action.label} type="button" onClick={() => { close(); action.onSelect(); }}>{action.icon}{action.label}</button>)}
    </div>
  </div>;
}
