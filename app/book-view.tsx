"use client";

// T47: book view of a collection created from the Book template. Entries stay ordinary entries;
// this view only arranges them (roles, parent relations, order field) and edits their values.
import { isSharedCollection } from "./entry-authors";
import { BookFormatRoles } from "./book-format-roles";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, ListTree, PenLine, Plus, Printer, SlidersHorizontal, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { bookApi, buildOutline, childRole, fieldOf, fontStacks, pageHeightMm, pageWidthMm, roleLabel, roman, type BookNode, type BookRole, type BookViewSettings } from "../lib/book";
import { translateError, type Collection, type Entry, type EntryRelation, type Language } from "../lib/brainy";
import { formatColorStyle } from "../lib/format-colors";
import { Button } from "./components/ui/Button";
import { BookPages, scrollToSheet, singleRoles, type EditTarget, type PageContext } from "./book-page";
import { BookRuler, BookSettingsPanel } from "./book-settings";
import "./book-view.css";

type Props = { collection: Collection; language: Language; changeSignal: unknown; onClose: () => void; onCollectionChanged: (collection: Collection) => void; onOpenEntry: (entry: Entry) => void };

export function BookViewLauncher({ collection, language, onOpen, onCollectionChanged }: { collection: Collection; language: Language; onOpen: () => void; onCollectionChanged: (collection: Collection) => void }) {
  const fr = language === "fr";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (collection.templateId !== "book" || !collection.bookView) return null;
  const enabled = collection.bookView.enabled;
  async function enable() {
    setBusy(true); setError("");
    try { const bookView = await bookApi.setBookView(collection.id, { ...collection.bookView!, enabled: true }); onCollectionChanged({ ...collection, bookView }); onOpen(); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  }
  return <div className="book-launcher">
    <span className="book-launcher-icon" aria-hidden="true"><BookOpen size={20} /></span>
    <div><strong>{fr ? "Vue livre" : "Book view"}</strong><p>{enabled ? fr ? "Lisez et mettez en page vos entrées comme un livre." : "Read and lay out your entries as a book." : fr ? "Désactivée. Vos entrées restent visibles dans la liste." : "Turned off. Your entries stay in the list."}</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
    <Button variant={enabled ? "primary" : "secondary"} disabled={busy} onClick={enabled ? onOpen : () => void enable()}>{enabled ? fr ? "Ouvrir le livre" : "Open the book" : busy ? "…" : fr ? "Activer la vue livre" : "Turn on book view"}</Button>
  </div>;
}

export default function BookView({ collection, language, changeSignal, onClose, onCollectionChanged, onOpenEntry }: Props) {
  const fr = language === "fr";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [relations, setRelations] = useState<EntryRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [settings, setSettings] = useState<BookViewSettings>(collection.bookView!);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [outlineOpen] = useState(() => typeof window === "undefined" || window.matchMedia("(min-width: 901px)").matches);
  const [confirmDelete, setConfirmDelete] = useState<BookNode | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const fetchBook = useCallback(() => Promise.all([api.entries(collection.id), bookApi.parentRelations(collection.id)]), [collection.id]);
  async function load() {
    try { const [nextEntries, nextRelations] = await fetchBook(); setEntries(nextEntries); setRelations(nextRelations); setLoadError(""); }
    catch (cause) { setLoadError(translateError(cause, language)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    fetchBook().then(([nextEntries, nextRelations]) => { if (active) { setEntries(nextEntries); setRelations(nextRelations); setLoadError(""); } })
      .catch((cause) => { if (active) setLoadError(translateError(cause, language)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchBook, changeSignal, language]);
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const outline = useMemo(() => buildOutline({ ...collection, bookView: settings }, entries, relations), [collection, settings, entries, relations]);

  function changeSettings(next: BookViewSettings) {
    setSettings(next);
    setSettingsStatus(fr ? "Enregistrement…" : "Saving…");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try { const bookView = await bookApi.setBookView(collection.id, next); onCollectionChanged({ ...collection, bookView }); setSettingsStatus(fr ? "Mise en page enregistrée." : "Layout saved."); }
      catch (cause) { setSettingsStatus(translateError(cause, language)); }
    }, 500);
  }

  async function turnOff() {
    try { const bookView = await bookApi.setBookView(collection.id, { ...settings, enabled: false }); onCollectionChanged({ ...collection, bookView }); onClose(); }
    catch (cause) { setActionError(translateError(cause, language)); }
  }

  const valuesWith = (entry: Entry, fieldId: string, value: string) => {
    const others = entry.values.filter((item) => item.fieldId !== fieldId).map((item) => ({ fieldId: item.fieldId, value: item.value, ...(item.largeFileId ? { largeFileId: item.largeFileId } : {}) }));
    return value.trim() ? [...others, { fieldId, value }] : others;
  };
  const replace = (saved: Entry) => setEntries((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);

  const ctx: PageContext = {
    language, collectionId: collection.id, collection: isSharedCollection(collection) ? collection : undefined, editing, saving, error: editError,
    start: (node, fieldId) => { setEditError(""); setEditing({ entryId: node.entry.id, fieldId }); },
    cancel: () => { setEditing(null); setEditError(""); },
    save: async (node, fieldId, value) => {
      const values = valuesWith(node.entry, fieldId, value);
      if (!values.length) { setEditError(fr ? "Gardez au moins une valeur ou supprimez cette partie depuis le plan." : "Keep at least one value, or delete this part from the outline."); return; }
      setSaving(true); setEditError("");
      try { replace(await api.saveEntry(collection.id, values, node.entry.id, node.entry.formatId ?? undefined, { expectedUpdatedAt: node.entry.updatedAt })); setEditing(null); }
      catch (cause) { setEditError(translateError(cause, language)); }
      finally { setSaving(false); }
    },
  };

  async function create(role: BookRole, parent?: BookNode, siblings: BookNode[] = []) {
    const format = outline.formatByRole[role];
    if (!format) { setActionError(fr ? `Le format de données « ${roleLabel(role, language)} » n’existe plus dans cette collection.` : `The ${roleLabel(role, language)} data format no longer exists in this collection.`); return; }
    setActionError(""); setBusyId(parent?.entry.id ?? role);
    try {
      const title = fieldOf(format, "TITLE");
      const firstText = title ?? fieldOf(format, "LONG_TEXT");
      const number = fieldOf(format, "NUMBER");
      const fresh: Partial<Record<BookRole, [string, string]>> = { PART: ["New part", "Nouvelle partie"], CHAPTER: ["New chapter", "Nouveau chapitre"], SECTION: ["New section", "Nouvelle section"], SUBSECTION: ["New subsection", "Nouvelle sous-section"], APPENDIX: ["New appendix", "Nouvelle annexe"], TERM: ["New term", "Nouveau terme"], SOURCE: ["New source", "Nouvelle source"], DEDICATION: ["To…", "À…"], EPIGRAPH: ["…", "…"] };
      const label = fresh[role]?.[fr ? 1 : 0] ?? roleLabel(role, language);
      const values = [{ fieldId: firstText!.id, value: label }];
      if (number) values.push({ fieldId: number.id, value: String(Math.max(0, ...siblings.map((item) => item.order ?? 0)) + 1) });
      if (role === "TERM") for (const field of format.fields.filter((item) => item.kind === "BOOLEAN")) values.push({ fieldId: field.id, value: "true" });
      const created = await api.saveEntry(collection.id, values, undefined, format.id);
      if (parent) {
        try { const relation = await api.createRelation(collection.id, created.id, parent.entry.id, "PARENT", ""); setRelations((current) => [...current, relation]); }
        catch (cause) { setActionError(translateError(cause, language)); }
      }
      replace(created);
      if (role === "TERM" || role === "SOURCE" || role === "COVER") onOpenEntry(created);
      else { setEditing({ entryId: created.id, fieldId: firstText!.id }); requestAnimationFrame(() => scrollToSheet(created.id)); }
    } catch (cause) { setActionError(translateError(cause, language)); }
    finally { setBusyId(""); }
  }

  async function move(node: BookNode, siblings: BookNode[], direction: -1 | 1) {
    const index = siblings.indexOf(node);
    const other = siblings[index + direction];
    const field = fieldOf(node.format, "NUMBER");
    if (!other || !field) return;
    setBusyId(node.entry.id); setActionError("");
    try {
      const reordered = [...siblings]; reordered[index] = other; reordered[index + direction] = node;
      for (const [position, item] of reordered.entries()) {
        const wanted = String(position + 1);
        const itemField = fieldOf(item.format, "NUMBER");
        if (!itemField || item.entry.values.find((value) => value.fieldId === itemField.id)?.value === wanted) continue;
        replace(await api.saveEntry(collection.id, valuesWith(item.entry, itemField.id, wanted), item.entry.id, item.entry.formatId ?? undefined, { expectedUpdatedAt: item.entry.updatedAt }));
      }
    } catch (cause) { setActionError(translateError(cause, language)); await load(); }
    finally { setBusyId(""); }
  }

  async function place(node: BookNode, parentId: string) {
    setBusyId(node.entry.id); setActionError("");
    try { const relation = await api.createRelation(collection.id, node.entry.id, parentId, "PARENT", ""); setRelations((current) => [...current, relation]); }
    catch (cause) { setActionError(translateError(cause, language)); }
    finally { setBusyId(""); }
  }

  async function remove(node: BookNode) {
    setBusyId(node.entry.id); setActionError("");
    try {
      for (const relation of relations.filter((item) => item.fromEntryId === node.entry.id || item.toEntryId === node.entry.id)) await api.removeRelation(collection.id, relation.id);
      await api.deleteEntry(node.entry.id);
      setConfirmDelete(null); await load();
    } catch (cause) { setActionError(translateError(cause, language)); }
    finally { setBusyId(""); }
  }

  const style = {
    "--book-page-width": `${pageWidthMm[settings.pageSize]}mm`, "--book-page-height": `${pageHeightMm[settings.pageSize]}mm`, "--book-margin": `${settings.marginMm}mm`,
    "--book-font": fontStacks[settings.bodyFont], "--book-heading-font": fontStacks[settings.headingFont], "--book-size": `${settings.fontSize}px`,
    "--book-line": String(settings.lineHeight), "--book-para": `${settings.paragraphSpacing}em`, "--book-indent": `${settings.firstLineIndent}em`, "--book-align": settings.textAlign === "JUSTIFY" ? "justify" : "left",
  } as CSSProperties;

  const row = (node: BookNode, label: string, siblings: BookNode[], depth: number) => {
    const child = childRole[node.role];
    const busy = busyId === node.entry.id;
    return <li key={node.entry.id} className={`book-outline-item depth-${depth}`}>
      <div className="book-outline-row">
        <span className="book-outline-swatch" style={formatColorStyle(node.format.color)} aria-hidden="true" />
        <button type="button" className="book-outline-link" onClick={() => scrollToSheet(node.entry.id)}><small>{label}</small><span>{node.title || roleLabel(node.role, language)}</span></button>
        <span className="book-outline-actions">
          {siblings.length > 1 && fieldOf(node.format, "NUMBER") && <>
            <button type="button" disabled={busy || siblings[0] === node} onClick={() => void move(node, siblings, -1)} aria-label={`${fr ? "Monter" : "Move up"} : ${node.title}`}><ArrowUp size={15} /></button>
            <button type="button" disabled={busy || siblings.at(-1) === node} onClick={() => void move(node, siblings, 1)} aria-label={`${fr ? "Descendre" : "Move down"} : ${node.title}`}><ArrowDown size={15} /></button>
          </>}
          <button type="button" onClick={() => onOpenEntry(node.entry)} aria-label={`${fr ? "Tous les champs" : "All fields"} : ${node.title || roleLabel(node.role, language)}`}><PenLine size={15} /></button>
          <button type="button" className="danger" disabled={busy} onClick={() => setConfirmDelete(node)} aria-label={`${fr ? "Supprimer" : "Delete"} : ${node.title || roleLabel(node.role, language)}`}><Trash2 size={15} /></button>
        </span>
      </div>
      {(node.children.length > 0 || child) && <ul>
        {node.children.map((item) => row(item, child === "CHAPTER" ? `${roleLabel("CHAPTER", language)} ${item.number}` : child === "SECTION" ? `${node.number}.${item.number}` : `${roleLabel("SUBSECTION", language)} ${item.number}`, node.children, depth + 1))}
        {child && <li className="book-outline-add"><button type="button" disabled={busyId === node.entry.id} onClick={() => void create(child, node, node.children)}><Plus size={14} />{roleLabel(child, language)}</button></li>}
      </ul>}
    </li>;
  };
  const chapterParents = outline.parts.flatMap((part) => part.children).concat(outline.looseChapters);
  const missingSingles = singleRoles.filter((role) => outline.formatByRole[role] && !outline.front.concat(outline.back).some((item) => item.role === role));
  const empty = !loading && [outline.front, outline.parts, outline.looseChapters, outline.unplaced, outline.back, outline.appendices, outline.glossary, outline.sources].every((list) => !list.length);

  return <section className="book-view" style={style}>
    <style>{`@page { size: ${pageWidthMm[settings.pageSize]}mm ${pageHeightMm[settings.pageSize]}mm; margin: 0; }`}</style>
    <header className="book-toolbar">
      <button type="button" className="analysis-back" onClick={onClose}><ArrowLeft size={18} />{fr ? "Collection" : "Collection"}</button>
      <h2><BookOpen size={20} aria-hidden="true" />{collection.name}</h2>
      <div className="book-toolbar-actions">
        <Button variant={settingsOpen ? "primary" : "secondary"} aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}><SlidersHorizontal size={16} />{fr ? "Mise en page" : "Layout"}</Button>
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />{fr ? "Imprimer ou PDF" : "Print or PDF"}</Button>
        <Button variant="subtle" onClick={() => void turnOff()}>{fr ? "Désactiver la vue livre" : "Turn off book view"}</Button>
      </div>
    </header>
    {settingsOpen && <BookSettingsPanel settings={settings} language={language} onChange={changeSettings} status={settingsStatus} />}
    {actionError && <p className="form-error book-action-error" role="alert">{actionError}</p>}
    <div className="book-layout">
      <nav className="book-outline" aria-label={fr ? "Plan du livre" : "Book outline"}>
        <details open={outlineOpen}>
          <summary><ListTree size={16} aria-hidden="true" />{fr ? "Plan du livre" : "Book outline"}</summary>
          <h3>{fr ? "Pages liminaires" : "Front matter"}</h3>
          <ul>{outline.front.map((item) => row(item, roleLabel(item.role, language), [], 0))}</ul>
          <h3>{fr ? "Corps de l’ouvrage" : "Body"}</h3>
          <ul>
            {outline.parts.map((part) => row(part, `${roleLabel("PART", language)} ${roman(part.number)}`, outline.parts, 0))}
            {outline.looseChapters.map((chapter) => row(chapter, `${roleLabel("CHAPTER", language)} ${chapter.number}`, outline.looseChapters, 0))}
            <li className="book-outline-add"><button type="button" disabled={busyId === "PART"} onClick={() => void create("PART", undefined, outline.parts)}><Plus size={14} />{roleLabel("PART", language)}</button></li>
            <li className="book-outline-add"><button type="button" disabled={busyId === "CHAPTER"} onClick={() => void create("CHAPTER", undefined, outline.looseChapters)}><Plus size={14} />{fr ? "Chapitre hors partie" : "Chapter outside a part"}</button></li>
          </ul>
          {outline.unplaced.length > 0 && <div className="book-unplaced">
            <h3>{fr ? "À placer" : "To place"}</h3>
            <p>{fr ? "Ces sections n’ont pas encore de parent ; elles n’apparaissent pas dans les pages." : "These sections have no parent yet, so they are not shown in the pages."}</p>
            <ul>{outline.unplaced.map((item) => {
              const candidates = item.role === "SECTION" ? chapterParents : chapterParents.flatMap((chapter) => chapter.children);
              return <li key={item.entry.id}><span>{roleLabel(item.role, language)} · {item.title || "—"}</span>
                <select aria-label={`${fr ? "Placer sous" : "Place under"} : ${item.title}`} value="" disabled={busyId === item.entry.id || !candidates.length} onChange={(event) => event.target.value && void place(item, event.target.value)}>
                  <option value="">{candidates.length ? fr ? "Placer sous…" : "Place under…" : fr ? "Aucun parent possible" : "No possible parent"}</option>
                  {candidates.map((candidate) => <option key={candidate.entry.id} value={candidate.entry.id}>{candidate.title || roleLabel(candidate.role, language)}</option>)}
                </select></li>;
            })}</ul>
          </div>}
          <h3>{fr ? "Parties finales" : "Back matter"}</h3>
          <ul>
            {outline.back.map((item) => row(item, roleLabel(item.role, language), [], 0))}
            {outline.appendices.map((item, index) => row(item, `${roleLabel("APPENDIX", language)} ${String.fromCharCode(65 + index)}`, outline.appendices, 0))}
            <li className="book-outline-add"><button type="button" onClick={() => void create("APPENDIX", undefined, outline.appendices)}><Plus size={14} />{roleLabel("APPENDIX", language)}</button></li>
            <li className="book-outline-add"><button type="button" onClick={() => void create("TERM")}><Plus size={14} />{fr ? "Terme (glossaire, index)" : "Term (glossary, index)"}</button></li>
            <li className="book-outline-add"><button type="button" onClick={() => void create("SOURCE")}><Plus size={14} />{fr ? "Source (bibliographie)" : "Source (bibliography)"}</button></li>
          </ul>
          {missingSingles.length > 0 && <>
            <h3>{fr ? "Ajouter une page" : "Add a page"}</h3>
            <p className="book-outline-note">{fr ? "Chacune de ces pages n’existe qu’une fois dans le livre." : "Each of these pages exists only once in the book."}</p>
            <div className="book-outline-chips">{missingSingles.map((role) => <button key={role} type="button" disabled={busyId === role} onClick={() => void create(role)}><Plus size={14} />{roleLabel(role, language)}</button>)}</div>
          </>}
          {!collection.sharedBy && <BookFormatRoles collection={collection} language={language} onCollectionChanged={onCollectionChanged} />}
          {outline.hiddenFormats.length > 0 && collection.sharedBy && <p className="book-outline-note">{fr ? `Non affichés dans le livre : ${outline.hiddenFormats.map((format) => format.name).join(", ")}.` : `Not shown in the book: ${outline.hiddenFormats.map((format) => format.name).join(", ")}.`}</p>}
        </details>
      </nav>
      <div className={`book-workspace ${settings.chapterOnNewPage ? "" : "flow"}`}>
        {settings.showRuler && <BookRuler settings={settings} language={language} onChange={changeSettings} />}
        {loading ? <div className="book-sheet book-skeleton" aria-busy="true"><span /><span /><span /></div>
          : loadError ? <div className="book-sheet book-state"><p role="alert">{loadError}</p><Button onClick={() => void load()}>{fr ? "Réessayer" : "Retry"}</Button></div>
          : empty ? <div className="book-sheet book-state"><BookOpen size={40} aria-hidden="true" /><h3>{fr ? "Votre livre commence ici" : "Your book starts here"}</h3><p>{fr ? "Ajoutez une couverture, une partie ou directement un premier chapitre. Chaque page reste une entrée de la collection." : "Add a cover, a part or straight away a first chapter. Every page stays an entry of the collection."}</p><div className="book-state-actions"><Button variant="primary" onClick={() => void create("CHAPTER", undefined, [])}><Plus size={16} />{fr ? "Premier chapitre" : "First chapter"}</Button>{outline.formatByRole.COVER && <Button onClick={() => void create("COVER")}>{roleLabel("COVER", language)}</Button>}</div></div>
          : <div className="book-print-root"><BookPages ctx={ctx} outline={outline} bookTitle={collection.name} /></div>}
      </div>
    </div>
    {confirmDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmDelete(null); }}>
      <section className="modal" role="alertdialog" aria-modal="true" aria-label={fr ? "Supprimer" : "Delete"}>
        <div className="modal-head"><h2>{fr ? "Supprimer cette partie du livre ?" : "Delete this part of the book?"}</h2></div>
        <p>{fr ? `« ${confirmDelete.title || roleLabel(confirmDelete.role, language)} » sera supprimée de la collection.` : `“${confirmDelete.title || roleLabel(confirmDelete.role, language)}” will be deleted from the collection.`}{confirmDelete.children.length > 0 && (fr ? ` Ses ${confirmDelete.children.length} sous-parties sont conservées et restent dans le plan.` : ` Its ${confirmDelete.children.length} sub-parts are kept and stay in the outline.`)}</p>
        <div className="modal-actions"><Button autoFocus onClick={() => setConfirmDelete(null)}>{fr ? "Annuler" : "Cancel"}</Button><Button variant="danger" disabled={busyId === confirmDelete.entry.id} onClick={() => void remove(confirmDelete)}>{fr ? "Supprimer" : "Delete"}</Button></div>
      </section>
    </div>}
  </section>;
}
