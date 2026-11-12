import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs } from "../ui/Tabs";
import { t, type Language } from "../../../lib/brainy";

export type CollectionTab = "entries" | "formats" | "tools";

export function CollectionTabs({ language, value, onChange, showFormats = true }: { language: Language; value: CollectionTab; onChange: (tab: CollectionTab) => void; showFormats?: boolean }) {
  const all = [
    { id: "entries", label: t(language, "entries") },
    { id: "formats", label: t(language, "formats") },
    { id: "tools", label: language === "fr" ? "Outils" : "Tools" },
  ] as const;
  const items = all.filter((item) => showFormats || item.id !== "formats");
  return <Tabs label={language === "fr" ? "Sections de la collection" : "Collection sections"} items={items} value={value} onChange={(id) => onChange(id as CollectionTab)} idPrefix="collection" className="collection-section-nav" />;
}

export function CollectionTabPanel({ tab, active, children }: { tab: CollectionTab; active: boolean; children: ReactNode }) {
  const shown = useRef(false);
  const [firstReveal, setFirstReveal] = useState(false);
  useEffect(() => {
    if (!active) {
      const reset = window.setTimeout(() => setFirstReveal(false), 0);
      return () => window.clearTimeout(reset);
    }
    if (shown.current) return;
    shown.current = true;
    const start = window.setTimeout(() => setFirstReveal(true), 0);
    const end = window.setTimeout(() => setFirstReveal(false), 420);
    return () => { window.clearTimeout(start); window.clearTimeout(end); };
  }, [active]);
  return <div id={`collection-${tab}`} role="tabpanel" aria-labelledby={`collection-tab-${tab}`} className={`collection-tab-panel ${firstReveal ? "first-reveal" : ""}`} tabIndex={0} hidden={!active}>{children}</div>;
}
