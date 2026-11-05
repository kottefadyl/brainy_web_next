import type { ReactNode } from "react";
import { Tabs } from "../ui/Tabs";
import { t, type Language } from "../../../lib/brainy";

export type CollectionTab = "entries" | "formats" | "tools";

export function CollectionTabs({ language, value, onChange }: { language: Language; value: CollectionTab; onChange: (tab: CollectionTab) => void }) {
  const items = [
    { id: "entries", label: t(language, "entries") },
    { id: "formats", label: t(language, "formats") },
    { id: "tools", label: language === "fr" ? "Outils" : "Tools" },
  ] as const;
  return <Tabs label={language === "fr" ? "Sections de la collection" : "Collection sections"} items={items} value={value} onChange={(id) => onChange(id as CollectionTab)} idPrefix="collection" className="collection-section-nav" />;
}

export function CollectionTabPanel({ tab, active, children }: { tab: CollectionTab; active: boolean; children: ReactNode }) {
  return <div id={`collection-${tab}`} role="tabpanel" aria-labelledby={`collection-tab-${tab}`} className="collection-tab-panel" tabIndex={0} hidden={!active}>{children}</div>;
}
