"use client";

import { useRef, useState } from "react";
import { MobileCollectionDrawer } from "../../../app/components/shell/MobileCollectionDrawer";
import { AppShell } from "../../../app/components/shell/AppShell";
import { CollectionHeader } from "../../../app/components/shell/CollectionHeader";
import { LanguagePicker } from "../../../app/components/shell/LanguagePicker";
import { Sidebar } from "../../../app/components/shell/Sidebar";
import CollectionFormatsSection from "../../../app/collection-formats-section";
import CollectionToolsHub from "../../../app/collection-tools-hub";
import EntryCard from "../../../app/entry-card";
import { EntriesEmptyState } from "../../../app/entries-list-states";
import { AccessibleListbox } from "../../../app/components/ui/AccessibleListbox";
import { AnalysisResultChart } from "../../../app/analysis-result-chart";
import Modal from "../../../app/components/ui/Modal";
import { CollectionTabs, type CollectionTab } from "../../../app/components/shell/CollectionTabs";
import { formatColors, type Collection, type Entry, type Language } from "../../../lib/brainy";

const formats: Collection["formats"] = formatColors.map((color, i) => ({
  id: `f${i}`, name: ["Observations", "Livres", "Notes"][i] ?? `Données personnelles ${i + 1}`, color,
  fields: [{ id: `title${i}`, name: "Titre", kind: "TITLE" }, { id: `text${i}`, name: "Description", kind: "TEXT" }, ...[0, 1, 2, 3].map((j) => ({ id: `extra${i}-${j}`, name: ["Équipement", "Instructions", "Durée", "Commentaires"][j], kind: "TEXT" as const }))],
}));
const collection: Collection = { id: "c", ownerId: "u", name: "Une très longue collection de démonstration",
  fields: [], formats, codeLists: [], units: [], exchangeRates: [], sharedObjects: [], savedViews: [], formulas: [] };
const entries: Entry[] = Array.from({ length: 24 }, (_, i) => ({
  id: `e${i}`, formatId: formats[i % 3].id, createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z",
  values: [{ fieldId: `title${i % 3}`, value: `Entrée numéro ${i + 1}` }, { fieldId: `text${i % 3}`, value: "Une description complète et lisible dans le détail de cette entrée." }],
}));
const noop = () => {};
export default function PhaseTwoBPreview() {
  const [view, setView] = useState("formats");
  const [lastAction, setLastAction] = useState("");
  const [language, setLanguage] = useState<Language>("fr");
  const [theme, setTheme] = useState("light");
  const [selected, setSelected] = useState("");
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const drawerTrigger = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState("");
  const [tab, setTab] = useState<CollectionTab>("entries");
  const rows = (view === "one" ? [{ group: "a", label: "Novembre", value: "305", count: 4 }] : [
    { group: "a", label: "Lundi", value: "120", count: 3 },
    { group: "b", label: "Mardi", value: "180", count: 5 },
    { group: "c", label: "Mercredi", value: "165", count: 4 },
  ]).map((row) => ({ ...row, sources: [], sourcesHasMore: false }));
  return <AppShell>
    <Sidebar brand={<strong>Brainy</strong>} collections={Array.from({ length: 45 }, (_, i) => ({ ...collection, id: String(i), name: `Collection très longue ${i + 1}` }))}
      selectedId={selected || "0"} loading={false} language={language} userName="Compte de test" userEmail="test@example.com"
      onSelect={setSelected} onTemplate={noop} onManual={noop} onTransfer={noop} onTools={noop} onEditProfile={noop} onSignOut={noop} />
    <main className="workspace"><header className="topbar"><span>Brainy</span><LanguagePicker language={language} onChange={setLanguage} /></header><div className="workspace-body">
      <div className="preview-controls">
        {["formats", "entries", "empty", "tools", "one", "many"].map((item) => <button key={item} type="button" onClick={() => setView(item)}>{item}</button>)}
        <button type="button" onClick={() => { const next = theme === "light" ? "dark" : "light"; setTheme(next); document.documentElement.dataset.theme = next; }}>Theme</button>
        <button type="button" onClick={() => setLanguage(language === "fr" ? "en" : "fr")}>Language</button>
        <button type="button" onClick={() => setModal(true)}>Modal</button>
        <button type="button" ref={drawerTrigger} onClick={() => setDrawer(true)}>Collections</button>
      </div>
      <output className="sr-only" data-last-action={lastAction}>{lastAction}</output>
      <CollectionHeader collection={collection} entryCount={entries.length} language={language} onNewEntry={noop} onInsights={noop} onRename={noop} onDelete={noop} />
      <CollectionTabs language={language} value={tab} onChange={setTab} />
      {view === "formats" && <CollectionFormatsSection collection={collection} language={language} entryCounts={{ f0: 8, f1: 8, f2: 8 }} onAdd={noop} onAddEntry={noop} onEdit={(id) => setLastAction(`edit:${id}`)} onColor={(id) => setLastAction(`color:${id}`)} onCopy={(id) => setLastAction(`copy:${id}`)} onLink={(id) => setLastAction(`link:${id}`)} onReviewUpdate={noop} />}
      {view === "entries" && <div className="entry-grid saved-view-list">{entries.map((entry) => <EntryCard key={entry.id} entry={entry} collection={collection} language={language} onDetails={noop} onEdit={noop} onDelete={noop} onCopy={noop} />)}</div>}
      {view === "empty" && <EntriesEmptyState language={language} filtered={false} onClear={noop} onWrite={noop} />}
      {view === "tools" && <CollectionToolsHub collection={collection} user={{ id: "u", name: "Test", email: "test@example.com", interests: [], hobbies: [], profileCompleted: true }} language={language} onOpenSection={noop} onOpenDialog={noop} />}
      {(view === "one" || view === "many") && <div className="analysis-page"><AnalysisResultChart rows={rows} unit="g" language={language} /></div>}
      <AccessibleListbox label={language === "fr" ? "Format de données" : "Data format"} value={value} options={[{ id: "", label: language === "fr" ? "Tous les formats de données" : "All data formats" }, ...formats.map((item) => ({ id: item.id, label: item.name, swatch: item.color }))]} onChange={setValue} />
    </div></main>
    {modal && <Modal title="Détail de l’entrée" closeLabel="Fermer" onClose={() => setModal(false)}><p>Contenu de démonstration</p><AccessibleListbox label="Format de données" value={value} options={formats.map((item) => ({ id: item.id, label: item.name, swatch: item.color }))} onChange={setValue} /></Modal>}
    {drawer && <MobileCollectionDrawer open={drawer} collections={[collection]} selectedId={collection.id} language={language} triggerRef={drawerTrigger} onClose={() => setDrawer(false)} onSelect={noop} onTemplate={noop} onManual={noop} onTools={noop} onEditProfile={noop} onSignOut={noop} />}
  </AppShell>;
}
