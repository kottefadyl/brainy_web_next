"use client";

import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useDialogFocus } from "./use-dialog-focus";

export default function Modal({ title, closeLabel, onClose, children, size = "normal" }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode; size?: "normal" | "wide" }) {
  const modalRef = useRef<HTMLElement>(null);
  useDialogFocus(modalRef, onClose);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={modalRef} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}><X size={20} /></button></div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
