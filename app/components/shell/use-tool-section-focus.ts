"use client";

import { useEffect, useRef, useState } from "react";
import { focusableWithin } from "../ui/use-dialog-focus";

/**
 * Tool sections replace the collection view, which removes the focused control.
 * Move focus into the section, then back to the tool that opened it.
 */
export function useToolSectionFocus(activeSection: string) {
  const [returnTool, setReturnTool] = useState<string | null>(null);
  const previous = useRef(activeSection);
  useEffect(() => {
    if (previous.current === activeSection) return;
    previous.current = activeSection;
    const items = focusableWithin(document.querySelector<HTMLElement>(".workspace-body"));
    if (activeSection !== "collection") { items[0]?.focus(); return; }
    (items.find((item) => item.dataset.tool === returnTool) ?? items.find((item) => item.closest(".collection-hero-actions")))?.focus();
  }, [activeSection, returnTool]);
  return { returnTool, rememberTool: setReturnTool };
}
