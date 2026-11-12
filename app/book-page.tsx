"use client";

// T47: printable book pages with in-place editing of titles and texts (light Markdown kept as plain text).
import { EntryAuthors } from "./entry-authors";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Check, Heading, Italic, Minus, Quote, X } from "lucide-react";
import { api } from "../lib/api";
import { inlineRuns, prefixParagraph, roleLabel, roman, textBlocks, textValues, wrapSelection, type BookNode, type BookOutline, type BookRole } from "../lib/book";
import type { Collection, Language } from "../lib/brainy";

export type EditTarget = { entryId: string; fieldId: string };
export type PageContext = {
  language: Language; collectionId: string; collection?: Collection; editing: EditTarget | null; saving: boolean; error: string;
  start: (node: BookNode, fieldId: string) => void; cancel: () => void; save: (node: BookNode, fieldId: string, value: string) => void;
};

export function Inline({ text }: { text: string }) {
  return <>{inlineRuns(text).map((run, index) => run.bold ? <strong key={index}>{run.text}</strong> : run.italic ? <em key={index}>{run.text}</em> : <Fragment key={index}>{run.text}</Fragment>)}</>;
}

export function RichText({ text }: { text: string }) {
  return <div className="book-text">{textBlocks(text).map((block, index) => {
    if (block.kind === "break") return <p key={index} className="book-scene-break" aria-hidden="true">⁂</p>;
    if (block.kind === "heading") return <h4 key={index} className="book-inline-heading"><Inline text={block.text} /></h4>;
    if (block.kind === "quote") return <blockquote key={index}>{block.text.split("\n").map((line, lineIndex) => <Fragment key={lineIndex}>{lineIndex > 0 && <br />}<Inline text={line} /></Fragment>)}</blockquote>;
    return <p key={index}>{block.text.split("\n").map((line, lineIndex) => <Fragment key={lineIndex}>{lineIndex > 0 && <br />}<Inline text={line} /></Fragment>)}</p>;
  })}</div>;
}

function Editor({ initial, multiline, ctx, label, onSave }: { initial: string; multiline: boolean; ctx: PageContext; label: string; onSave: (value: string) => void }) {
  const fr = ctx.language === "fr";
  const [value, setValue] = useState(initial);
  const area = useRef<HTMLTextAreaElement>(null);
  const line = useRef<HTMLInputElement>(null);
  const grow = () => { const element = area.current; if (element) { element.style.height = "auto"; element.style.height = `${element.scrollHeight + 2}px`; } };
  useEffect(() => { (multiline ? area.current : line.current)?.focus(); grow(); }, [multiline]);
  useEffect(grow, [value]);
  function wrap(marker: string) {
    const element = area.current; if (!element) return;
    const next = wrapSelection(value, element.selectionStart, element.selectionEnd, marker);
    setValue(next.value);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(next.start, next.end); });
  }
  function prefix(mark: string) {
    const element = area.current; if (!element) return;
    const next = prefixParagraph(value, element.selectionStart, mark);
    setValue(next.value);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(next.caret, next.caret); });
  }
  function sceneBreak() {
    const element = area.current; if (!element) return;
    const at = element.selectionStart;
    const next = `${value.slice(0, at).trimEnd()}\n\n***\n\n${value.slice(at).trimStart()}`;
    setValue(next);
  }
  const keys = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); ctx.cancel(); }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); onSave(value); }
    if (multiline && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") { event.preventDefault(); wrap("**"); }
    if (multiline && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") { event.preventDefault(); wrap("*"); }
    if (!multiline && event.key === "Enter") { event.preventDefault(); onSave(value); }
  };
  return <div className="book-editor" onKeyDown={keys}>
    <div className="book-editor-bar" role="toolbar" aria-label={fr ? "Mise en forme" : "Formatting"}>
      {multiline && <>
        <button type="button" onClick={() => wrap("**")} aria-label={fr ? "Gras (Ctrl+B)" : "Bold (Ctrl+B)"} title={fr ? "Gras" : "Bold"}><Bold size={16} /></button>
        <button type="button" onClick={() => wrap("*")} aria-label={fr ? "Italique (Ctrl+I)" : "Italic (Ctrl+I)"} title={fr ? "Italique" : "Italic"}><Italic size={16} /></button>
        <button type="button" onClick={() => prefix("# ")} aria-label={fr ? "Intertitre" : "Subheading"} title={fr ? "Intertitre" : "Subheading"}><Heading size={16} /></button>
        <button type="button" onClick={() => prefix("> ")} aria-label={fr ? "Citation" : "Quotation"} title={fr ? "Citation" : "Quotation"}><Quote size={16} /></button>
        <button type="button" onClick={sceneBreak} aria-label={fr ? "Séparateur de scène" : "Scene break"} title={fr ? "Séparateur" : "Scene break"}><Minus size={16} /></button>
      </>}
      <span className="book-editor-spacer" />
      <button type="button" className="book-editor-cancel" onClick={ctx.cancel} aria-label={fr ? "Annuler (Échap)" : "Cancel (Esc)"}><X size={16} /></button>
      <button type="button" className="book-editor-save" disabled={ctx.saving} onClick={() => onSave(value)}><Check size={16} />{ctx.saving ? fr ? "Enregistrement…" : "Saving…" : fr ? "Enregistrer" : "Save"}</button>
    </div>
    {multiline
      ? <textarea ref={area} aria-label={label} value={value} onChange={(event) => setValue(event.target.value)} spellCheck />
      : <input ref={line} aria-label={label} value={value} onChange={(event) => setValue(event.target.value)} spellCheck />}
    {multiline && <p className="book-editor-hint">{fr ? "Ligne vide : nouveau paragraphe · Ctrl+Entrée : enregistrer · Échap : annuler" : "Blank line: new paragraph · Ctrl+Enter: save · Esc: cancel"}</p>}
    {ctx.error && <p className="form-error" role="alert">{ctx.error}</p>}
  </div>;
}

/** A value of the entry that turns into an editor when activated. */
export function Editable({ ctx, node, kind, index = 0, className = "", placeholder, render }: { ctx: PageContext; node: BookNode; kind: "TITLE" | "TEXT" | "LONG_TEXT"; index?: number; className?: string; placeholder: string; render: (value: string) => ReactNode }) {
  const field = node.format.fields.filter((item) => item.kind === kind)[index];
  if (!field) return null;
  const value = node.entry.values.find((item) => item.fieldId === field.id)?.value ?? "";
  if (ctx.editing?.entryId === node.entry.id && ctx.editing.fieldId === field.id) return <Editor initial={value} multiline={kind === "LONG_TEXT"} ctx={ctx} label={field.name} onSave={(next) => ctx.save(node, field.id, next)} />;
  const fr = ctx.language === "fr";
  return <div role="button" tabIndex={0} className={`book-editable ${value ? "" : "is-empty"} ${className}`} aria-label={`${fr ? "Modifier" : "Edit"} ${field.name}`} onClick={() => ctx.start(node, field.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); ctx.start(node, field.id); } }}>
    {value ? render(value) : <span className="book-placeholder">{placeholder}</span>}
  </div>;
}

function CoverImage({ node, collectionId }: { node: BookNode; collectionId: string }) {
  const field = node.format.fields.find((item) => item.kind === "ATTACHMENT");
  const value = field ? node.entry.values.find((item) => item.fieldId === field.id) : undefined;
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    if (!field || !value || value.largeFileId || !(value.attachmentMimeType ?? "").startsWith("image/")) return;
    api.entryAttachment(node.entry.id, field.id).then((file) => { if (active) setSource(`data:${file.mimeType};base64,${file.base64}`); }).catch(() => undefined);
    return () => { active = false; };
  }, [field, value, node.entry.id, collectionId]);
  // eslint-disable-next-line @next/next/no-img-element -- data URL of a private attachment
  return source ? <img className="book-cover-image" src={source} alt="" /> : null;
}

const sheetId = (id: string) => `book-${id}`;

function Sheet({ id, className = "", children, label }: { id: string; className?: string; children: ReactNode; label: string }) {
  return <section id={sheetId(id)} className={`book-sheet ${className}`} aria-label={label}>{children}</section>;
}

export function scrollToSheet(id: string) {
  document.getElementById(sheetId(id))?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

/** T53/2: who wrote and last changed this part, in a shared collection only (never printed). */
function Authors({ ctx, node }: { ctx: PageContext; node: BookNode }) {
  return ctx.collection ? <div className="book-authors"><EntryAuthors entry={node.entry} collection={ctx.collection} language={ctx.language} /></div> : null;
}

function Chapter({ ctx, chapter }: { ctx: PageContext; chapter: BookNode }) {
  const fr = ctx.language === "fr";
  return <>
    <header className="book-chapter-head">
      <Authors ctx={ctx} node={chapter} />
      <p className="book-kicker">{roleLabel("CHAPTER", ctx.language)} {chapter.number}</p>
      <Editable ctx={ctx} node={chapter} kind="TITLE" placeholder={fr ? "Titre du chapitre" : "Chapter title"} render={(value) => <h2 className="book-heading"><Inline text={value} /></h2>} />
    </header>
    <Editable ctx={ctx} node={chapter} kind="LONG_TEXT" placeholder={fr ? "Écrivez le chapitre…" : "Write the chapter…"} render={(value) => <RichText text={value} />} />
    {chapter.children.map((section) => <div key={section.entry.id} id={sheetId(section.entry.id)} className="book-section">
      <Authors ctx={ctx} node={section} />
      <Editable ctx={ctx} node={section} kind="TITLE" placeholder={fr ? "Titre de la section" : "Section title"} render={(value) => <h3 className="book-heading"><span className="book-number">{chapter.number}.{section.number}</span> <Inline text={value} /></h3>} />
      <Editable ctx={ctx} node={section} kind="LONG_TEXT" placeholder={fr ? "Texte de la section…" : "Section text…"} render={(value) => <RichText text={value} />} />
      {section.children.map((sub) => <div key={sub.entry.id} id={sheetId(sub.entry.id)} className="book-subsection">
        <Authors ctx={ctx} node={sub} />
        <Editable ctx={ctx} node={sub} kind="TITLE" placeholder={fr ? "Titre de la sous-section" : "Subsection title"} render={(value) => <h4 className="book-heading"><span className="book-number">{chapter.number}.{section.number}.{sub.number}</span> <Inline text={value} /></h4>} />
        <Editable ctx={ctx} node={sub} kind="LONG_TEXT" placeholder={fr ? "Texte…" : "Text…"} render={(value) => <RichText text={value} />} />
      </div>)}
    </div>)}
  </>;
}

function Matter({ ctx, node }: { ctx: PageContext; node: BookNode }) {
  const fr = ctx.language === "fr";
  const role = node.role;
  if (role === "DEDICATION") return <Editable ctx={ctx} node={node} kind="LONG_TEXT" className="book-dedication" placeholder={fr ? "À…" : "To…"} render={(value) => <RichText text={value} />} />;
  if (role === "EPIGRAPH") return <div className="book-epigraph">
    <Editable ctx={ctx} node={node} kind="LONG_TEXT" placeholder={fr ? "Citation" : "Quotation"} render={(value) => <RichText text={value} />} />
    <Editable ctx={ctx} node={node} kind="TEXT" placeholder={fr ? "Auteur de la citation" : "Quoted author"} render={(value) => <p className="book-epigraph-author">— {value}</p>} />
  </div>;
  return <>
    <Authors ctx={ctx} node={node} />
    <Editable ctx={ctx} node={node} kind="TITLE" placeholder={roleLabel(role, ctx.language)} render={(value) => <h2 className="book-heading book-matter-title"><Inline text={value} /></h2>} />
    <Editable ctx={ctx} node={node} kind="LONG_TEXT" placeholder={fr ? "Écrivez ici…" : "Write here…"} render={(value) => <RichText text={value} />} />
    {role === "FOREWORD" && <Editable ctx={ctx} node={node} kind="TEXT" placeholder={fr ? "Signé par" : "Signed by"} render={(value) => <p className="book-signature">{value}</p>} />}
  </>;
}

export function BookPages({ ctx, outline, bookTitle }: { ctx: PageContext; outline: BookOutline; bookTitle: string }) {
  const fr = ctx.language === "fr";
  const cover = outline.front.find((item) => item.role === "COVER");
  const titlePage = outline.front.find((item) => item.role === "TITLE_PAGE");
  const beforeToc = outline.front.filter((item) => !["COVER", "TITLE_PAGE", "INTRODUCTION"].includes(item.role));
  const introduction = outline.front.find((item) => item.role === "INTRODUCTION");
  const chapters = [...outline.parts.flatMap((part) => part.children), ...outline.looseChapters];
  const cited = outline.sources.filter((item) => /cit/i.test(textValues(item, "SELECT")[0] ?? ""));
  const consulted = outline.sources.filter((item) => !cited.includes(item));
  const tocLine = (id: string, label: string, title: string, depth = 0) => <li key={id} className={`depth-${depth}`}><button type="button" onClick={() => scrollToSheet(id)}><span>{label}</span><span>{title}</span></button></li>;
  const hasBody = chapters.length > 0 || outline.parts.length > 0;
  const backCover = cover && textValues(cover, "LONG_TEXT").at(-1);
  const sourceLine = (item: BookNode) => { const [author, year, publisher] = textValues(item, "TEXT"); return <li key={item.entry.id}>{author && <>{author}{year ? ` (${year})` : ""}. </>}<em>{item.title}</em>{publisher ? `. ${publisher}` : ""}.</li>; };
  return <div className="book-pages">
    {cover && <Sheet id={cover.entry.id} className="book-cover" label={roleLabel("COVER", ctx.language)}>
      <CoverImage node={cover} collectionId={ctx.collectionId} />
      <div className="book-cover-text">
        <Editable ctx={ctx} node={cover} kind="TEXT" index={1} placeholder={fr ? "Auteur" : "Author"} render={(value) => <p className="book-cover-author">{value}</p>} />
        <Editable ctx={ctx} node={cover} kind="TITLE" placeholder={bookTitle} render={(value) => <h1 className="book-cover-title"><Inline text={value} /></h1>} />
        <Editable ctx={ctx} node={cover} kind="TEXT" placeholder={fr ? "Sous-titre" : "Subtitle"} render={(value) => <p className="book-cover-subtitle">{value}</p>} />
      </div>
    </Sheet>}
    {titlePage && <Sheet id={titlePage.entry.id} className="book-title-page" label={roleLabel("TITLE_PAGE", ctx.language)}>
      <Editable ctx={ctx} node={titlePage} kind="TITLE" placeholder={bookTitle} render={(value) => <h1 className="book-heading"><Inline text={value} /></h1>} />
      {cover && textValues(cover, "TEXT")[1] && <p className="book-title-author">{textValues(cover, "TEXT")[1]}</p>}
      <div className="book-imprint">
        <Editable ctx={ctx} node={titlePage} kind="TEXT" placeholder={fr ? "Éditeur" : "Publisher"} render={(value) => <p>{value}</p>} />
        <Editable ctx={ctx} node={titlePage} kind="TEXT" index={1} placeholder={fr ? "Lieu et année" : "Place and year"} render={(value) => <p>{value}</p>} />
        <Editable ctx={ctx} node={titlePage} kind="TEXT" index={2} placeholder="ISBN" render={(value) => <p>ISBN {value}</p>} />
        <Editable ctx={ctx} node={titlePage} kind="LONG_TEXT" placeholder={fr ? "Mentions légales" : "Copyright notice"} render={(value) => <RichText text={value} />} />
      </div>
    </Sheet>}
    {beforeToc.map((item) => <Sheet key={item.entry.id} id={item.entry.id} className={`book-matter role-${item.role.toLowerCase()}`} label={roleLabel(item.role, ctx.language)}><Matter ctx={ctx} node={item} /></Sheet>)}
    {(hasBody || outline.back.length > 0) && <Sheet id="toc" className="book-toc" label={fr ? "Table des matières" : "Contents"}>
      <h2 className="book-heading book-matter-title">{fr ? "Table des matières" : "Contents"}</h2>
      <ol>
        {introduction && tocLine(introduction.entry.id, "", introduction.title || roleLabel("INTRODUCTION", ctx.language))}
        {outline.parts.map((part) => <Fragment key={part.entry.id}>
          {tocLine(part.entry.id, `${roleLabel("PART", ctx.language)} ${roman(part.number)}`, part.title)}
          {part.children.map((chapter) => tocLine(chapter.entry.id, String(chapter.number), chapter.title, 1))}
        </Fragment>)}
        {outline.looseChapters.map((chapter) => tocLine(chapter.entry.id, String(chapter.number), chapter.title, outline.parts.length ? 0 : 0))}
        {outline.back.map((item) => tocLine(item.entry.id, "", item.title || roleLabel(item.role, ctx.language)))}
        {outline.appendices.map((item, index) => tocLine(item.entry.id, `${roleLabel("APPENDIX", ctx.language)} ${String.fromCharCode(65 + index)}`, item.title))}
        {outline.glossary.length > 0 && tocLine("glossary", "", fr ? "Glossaire" : "Glossary")}
        {outline.sources.length > 0 && tocLine("sources", "", fr ? "Bibliographie" : "Bibliography")}
        {outline.indexTerms.length > 0 && tocLine("index", "", "Index")}
      </ol>
    </Sheet>}
    {introduction && <Sheet id={introduction.entry.id} className="book-matter" label={roleLabel("INTRODUCTION", ctx.language)}><Matter ctx={ctx} node={introduction} /></Sheet>}
    {outline.parts.map((part) => <Fragment key={part.entry.id}>
      <Sheet id={part.entry.id} className="book-part" label={`${roleLabel("PART", ctx.language)} ${roman(part.number)}`}>
        <p className="book-kicker">{roleLabel("PART", ctx.language)} {roman(part.number)}</p>
        <Editable ctx={ctx} node={part} kind="TITLE" placeholder={fr ? "Titre de la partie" : "Part title"} render={(value) => <h2 className="book-heading"><Inline text={value} /></h2>} />
        <Editable ctx={ctx} node={part} kind="LONG_TEXT" placeholder={fr ? "Texte d’ouverture (facultatif)" : "Opening text (optional)"} render={(value) => <RichText text={value} />} />
      </Sheet>
      <ChapterSheets ctx={ctx} chapters={part.children} />
    </Fragment>)}
    <ChapterSheets ctx={ctx} chapters={outline.looseChapters} />
    {outline.back.map((item) => <Sheet key={item.entry.id} id={item.entry.id} className="book-matter" label={roleLabel(item.role, ctx.language)}><Matter ctx={ctx} node={item} /></Sheet>)}
    {outline.appendices.map((item, index) => <Sheet key={item.entry.id} id={item.entry.id} className="book-matter" label={roleLabel("APPENDIX", ctx.language)}>
      <p className="book-kicker">{roleLabel("APPENDIX", ctx.language)} {String.fromCharCode(65 + index)}</p>
      <Matter ctx={ctx} node={item} />
    </Sheet>)}
    {outline.glossary.length > 0 && <Sheet id="glossary" className="book-matter" label={fr ? "Glossaire" : "Glossary"}>
      <h2 className="book-heading book-matter-title">{fr ? "Glossaire" : "Glossary"}</h2>
      <dl className="book-glossary">{outline.glossary.map((term) => <Fragment key={term.entry.id}><dt>{term.title}</dt><dd><RichText text={term.text} /></dd></Fragment>)}</dl>
    </Sheet>}
    {outline.sources.length > 0 && <Sheet id="sources" className="book-matter" label={fr ? "Bibliographie" : "Bibliography"}>
      {consulted.length > 0 && <><h2 className="book-heading book-matter-title">{fr ? "Bibliographie" : "Bibliography"}</h2><ul className="book-sources">{consulted.map(sourceLine)}</ul></>}
      {cited.length > 0 && <><h2 className="book-heading book-matter-title">{fr ? "Références bibliographiques" : "References"}</h2><ul className="book-sources">{cited.map(sourceLine)}</ul></>}
    </Sheet>}
    {outline.indexTerms.length > 0 && <Sheet id="index" className="book-matter" label="Index">
      <h2 className="book-heading book-matter-title">Index</h2>
      <ul className="book-index">{outline.indexTerms.map((item) => <li key={item.term}><span>{item.term}</span><span>{item.chapters.length ? `${fr ? "chap." : "ch."} ${item.chapters.map((chapter) => chapter.label).join(", ")}` : "—"}</span></li>)}</ul>
    </Sheet>}
    {cover && backCover && <Sheet id="back-cover" className="book-back-cover" label={fr ? "Quatrième de couverture" : "Back cover"}><RichText text={backCover} /></Sheet>}
  </div>;
}

function ChapterSheets({ ctx, chapters }: { ctx: PageContext; chapters: BookNode[] }) {
  return <>{chapters.map((chapter) => <Sheet key={chapter.entry.id} id={chapter.entry.id} className="book-chapter" label={`${roleLabel("CHAPTER", ctx.language)} ${chapter.number}`}><Chapter ctx={ctx} chapter={chapter} /></Sheet>)}</>;
}

export const singleRoles: BookRole[] = ["COVER", "TITLE_PAGE", "DEDICATION", "EPIGRAPH", "FOREWORD", "PREFACE", "ACKNOWLEDGEMENTS", "INTRODUCTION", "CONCLUSION", "AFTERWORD"];
