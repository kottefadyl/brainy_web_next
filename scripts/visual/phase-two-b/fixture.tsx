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
import OsmMap from "../../../app/osm-map";
import { CodeFieldPicker } from "../../../app/code-field-picker";
import { useToolSectionFocus } from "../../../app/components/shell/use-tool-section-focus";
import WorkspaceToolsDialog from "../../../app/workspace-tools-dialog";
import { LocalizedDateInput, LocalizedDateTimeInput, LocalizedTimeInput } from "../../../app/components/ui/LocalizedDateInput";
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
const sampleCode = (code: string, labelFr: string, labelEn: string, parentCode?: string, active = true) => ({ code, labelFr, labelEn, parentCode, active });
const sampleCodes = [
  sampleCode("G", "Commerce", "Trade"), sampleCode("47", "Vente de détail", "Retail", "G"), sampleCode("47.1", "Magasins non spécialisés", "Non-specialised stores", "47"),
  sampleCode("47.11", "À prédominance alimentaire", "Mostly food", "47.1"), sampleCode("47.11B", "Commerce d'alimentation générale", "General food stores", "47.11"),
  sampleCode("47.2", "Épicerie fine", "Delicatessen", "47"), sampleCode("OLD", "Ancien code alimentation", "Former food code", "47", false),
  sampleCode("A", "Agriculture", "Farming"), sampleCode("01", "Alimentation animale", "Food for animals", "A"),
  sampleCode("H", "Longue branche", "Long branch"), ...Array.from({ length: 60 }, (_, index) => sampleCode(`H${index}`, `Élément ${index}`, `Item ${index}`, "H")),
];
const noop = () => {};
export default function PhaseTwoBPreview() {
  const [view, setView] = useState("formats");
  const [lastAction, setLastAction] = useState("");
  const [language, setLanguage] = useState<Language>("fr");
  const [theme, setTheme] = useState("light");
  const [selected, setSelected] = useState("");
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tools, setTools] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [codeValue, setCodeValue] = useState("");
  const [section, setSection] = useState("collection");
  const { returnTool, rememberTool } = useToolSectionFocus(section);
  const [dates, setDates] = useState(false);
  const [date, setDate] = useState("");
  const [limited, setLimited] = useState("2026-11-20");
  const [dateTime, setDateTime] = useState("");
  const [time, setTime] = useState("");
  const drawerTrigger = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState("");
  const [tab, setTab] = useState<CollectionTab>("entries");
  const months = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
  const chartRow = (group: string, value: number, count: number) => ({ group, label: group, value: String(value), count, sources: [], sourcesHasMore: false });
  const compareRows = months.map((month, i) => chartRow(month, [12450, 13800, 11200, 15600, 0, 9000, 14200, 16100, 15000, 17300, 12000, 18250][i], 42 + i));
  const previousRows = months.map((month, i) => chartRow(month.replace("2026", "2025"), [9000, 12000, 10500, 11800, 12600, 9400, 13100, 12000, 13900, 14500, 11000, 15000][i], 30 + i));
  const denseRows = Array.from({ length: 500 }, (_, i) => chartRow(new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10), i === 250 ? 900 : 100 + Math.round(40 * Math.sin(i / 9)), 1));
  const rows = (view === "one" ? [{ group: "a", label: "Novembre", value: "305", count: 4 }] : [
    { group: "a", label: "Lundi", value: "120", count: 3 },
    { group: "b", label: "Mardi", value: "180", count: 5 },
    { group: "c", label: "Mercredi", value: "165", count: 4 },
  ]).map((row) => ({ ...row, sources: [], sourcesHasMore: false }));
  return <AppShell>
    <Sidebar brand={<strong>Brainy</strong>} collections={Array.from({ length: 45 }, (_, i) => ({ ...collection, id: String(i), name: `Collection très longue ${i + 1}` }))}
      selectedId={selected || "0"} loading={false} language={language} userName="Compte de test" userEmail="test@example.com"
      onSelect={setSelected} onTemplate={noop} onManual={noop} onTransfer={noop} onTools={() => setTools(true)} onEditProfile={noop} onSignOut={noop} />
    <main className="workspace"><header className="topbar"><span>Brainy</span><LanguagePicker language={language} onChange={setLanguage} /></header><div className="workspace-body">{section !== "collection" ? <button type="button" id="preview-back" className="analysis-back" onClick={() => setSection("collection")}>Back</button> : <>
      <div className="preview-controls">
        {["formats", "entries", "empty", "tools", "one", "many", "compare", "dense", "map"].map((item) => <button key={item} type="button" onClick={() => setView(item)}>{item}</button>)}
        <button type="button" onClick={() => { const next = theme === "light" ? "dark" : "light"; setTheme(next); document.documentElement.dataset.theme = next; }}>Theme</button>
        <button type="button" onClick={() => setLanguage(language === "fr" ? "en" : "fr")}>Language</button>
        <button type="button" onClick={() => setModal(true)}>Modal</button>
        <button type="button" id="preview-dates" onClick={() => setDates(true)}>Dates</button>
        <button type="button" id="preview-codes" onClick={() => setCodesOpen(true)}>Codes</button>
        <button type="button" id="preview-tools" onClick={() => setTools(true)}>Tools</button>
        <button type="button" ref={drawerTrigger} onClick={() => setDrawer(true)}>Collections</button>
      </div>
      <output className="sr-only" data-last-action={lastAction}>{lastAction}</output>
      <CollectionHeader collection={collection} entryCount={entries.length} language={language} onNewEntry={noop} onInsights={noop} onRename={noop} onDelete={noop} />
      <CollectionTabs language={language} value={tab} onChange={setTab} />
      {view === "formats" && <CollectionFormatsSection collection={collection} language={language} entryCounts={{ f0: 8, f1: 8, f2: 8 }} onAdd={noop} onAddEntry={noop} onEdit={(id) => setLastAction(`edit:${id}`)} onColor={(id) => setLastAction(`color:${id}`)} onCopy={(id) => setLastAction(`copy:${id}`)} onLink={(id) => setLastAction(`link:${id}`)} onReviewUpdate={noop} />}
      {view === "entries" && <div className="entry-grid saved-view-list">{entries.map((entry) => <EntryCard key={entry.id} entry={entry} collection={collection} language={language} onDetails={noop} onEdit={noop} onDelete={noop} onCopy={noop} />)}</div>}
      {view === "empty" && <EntriesEmptyState language={language} filtered={false} onClear={noop} onWrite={noop} />}
      {view === "tools" && <CollectionToolsHub collection={collection} user={{ id: "u", name: "Test", email: "test@example.com", interests: [], hobbies: [], profileCompleted: true }} language={language} defaultOpen={returnTool !== null} onOpenSection={(next) => { setLastAction(`section:${next}`); rememberTool(next); setSection(next); }} onOpenDialog={(kind) => setLastAction(`dialog:${kind}`)} />}
      {view === "map" && <div className="geo-map-view"><OsmMap points={[{ entryId: "p0", name: "Chantier Nord", latitude: 50.63, longitude: 3.06 }, { entryId: "p1", name: "Tournée Paris", latitude: 48.8566, longitude: 2.3522, accuracy: 12 }, { entryId: "p2", name: "Enquête Lyon", latitude: 45.764, longitude: 4.8357 }, { entryId: "p3", name: "Dépôt Marseille", latitude: 43.2965, longitude: 5.3698 }]} formatColor={formats[1].color} language={language} selected={["p3"]} onOpenEntry={(id) => setLastAction(`open:${id}`)} /></div>}
      {view === "compare" && <div className="analysis-page"><AnalysisResultChart rows={compareRows} comparisonRows={previousRows} unit="EUR" language={language} title="Sum" /></div>}
      {view === "dense" && <div className="analysis-page"><AnalysisResultChart rows={denseRows} unit="g" language={language} title="Dense" /></div>}
      {(view === "one" || view === "many") && <div className="analysis-page"><AnalysisResultChart rows={rows} unit="g" language={language} /></div>}
      <AccessibleListbox label={language === "fr" ? "Format de données" : "Data format"} value={value} options={[{ id: "", label: language === "fr" ? "Tous les formats de données" : "All data formats" }, ...formats.map((item) => ({ id: item.id, label: item.name, swatch: item.color }))]} onChange={setValue} />
    </>}</div></main>
    {modal && <Modal title="Détail de l’entrée" closeLabel="Fermer" onClose={() => setModal(false)}><p>Contenu de démonstration</p><AccessibleListbox label="Format de données" value={value} options={formats.map((item) => ({ id: item.id, label: item.name, swatch: item.color }))} onChange={setValue} /></Modal>}
    {codesOpen && <Modal title="Codes" closeLabel="Fermer" onClose={() => setCodesOpen(false)}><label className="input-label">{language === "fr" ? "Activité" : "Activity"}<CodeFieldPicker codes={sampleCodes} language={language} value={codeValue} onChange={setCodeValue} /></label><output data-code-value={codeValue} /></Modal>}
    {tools && <WorkspaceToolsDialog collections={[collection]} language={language} onClose={() => setTools(false)} onRestored={noop} />}
    {dates && <Modal title="Dates" closeLabel="Fermer" onClose={() => setDates(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setLastAction("submitted"); }}>
      <label className="input-label">{language === "fr" ? "Date simple" : "Plain date"}<LocalizedDateInput language={language} value={date} onChange={setDate} /></label>
      <label className="input-label">{language === "fr" ? "Date limitée" : "Limited date"}<LocalizedDateInput language={language} value={limited} min="2026-11-10" max="2026-11-30" onChange={setLimited} /></label>
      <label className="input-label">{language === "fr" ? "Date et heure" : "Date and time"}<LocalizedDateTimeInput language={language} value={dateTime} onChange={setDateTime} /></label>
      <label className="input-label">{language === "fr" ? "Heure" : "Time"}<LocalizedTimeInput language={language} value={time} onChange={setTime} /></label>
      <output data-values={JSON.stringify({ date, limited, dateTime, time })} />
      <button type="submit" id="preview-submit" className="button button-primary">OK</button>
    </form></Modal>}
    {drawer && <MobileCollectionDrawer open={drawer} collections={[collection]} selectedId={collection.id} language={language} triggerRef={drawerTrigger} onClose={() => setDrawer(false)} onSelect={noop} onTemplate={noop} onManual={noop} onTools={() => setTools(true)} onEditProfile={noop} onSignOut={noop} />}
  </AppShell>;
}
