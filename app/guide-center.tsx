"use client";

// T51: "Guide and training" page. Content is generated from scripts/guide/content.mjs (lib/guide-content.ts).
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Boxes, ChartNoAxesCombined, Compass, Database, FolderOpen, GraduationCap, LayoutGrid, LayoutTemplate, PencilLine, Search, Shapes, ShieldCheck, Users, Warehouse, X, type LucideIcon } from "lucide-react";
import { guideChapters, type GuideChapter, type GuideText } from "../lib/guide-content";
import type { Language } from "../lib/brainy";
import "./guide-center.css";

const icons: Record<string, LucideIcon> = { compass: Compass, folder: FolderOpen, shapes: Shapes, pencil: PencilLine, layout: LayoutGrid, template: LayoutTemplate, chart: ChartNoAxesCombined, boxes: Boxes, warehouse: Warehouse, users: Users, shield: ShieldCheck, database: Database };

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>);
}

/** Renders the guide markup: blank line = paragraph, "- " = bullet, "1. " = numbered step, **bold**. */
export function GuideRichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{inline(item)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  for (const line of text.split("\n")) {
    const bullet = /^- (.*)$/.exec(line);
    const step = /^\d+\. (.*)$/.exec(line);
    if (bullet || step) {
      const ordered = Boolean(step);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? step)![1]);
    } else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="guide-rich">{blocks}</div>;
}

const plain = (value: string) => value.replace(/\*\*/g, "").toLocaleLowerCase();

export default function GuideCenter({ language, onClose }: { language: Language; onClose: () => void }) {
  const fr = language === "fr";
  const pick = (value: GuideText) => value[language];
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const reader = useRef<HTMLElement>(null);
  const chapter = guideChapters.find((item) => item.id === chapterId) ?? null;
  const index = chapter ? guideChapters.indexOf(chapter) : -1;

  const visible = useMemo(() => {
    const words = plain(query).split(/\s+/).filter(Boolean);
    if (!words.length) return guideChapters;
    return guideChapters.filter((item) => {
      const haystack = plain([item.title, item.summary, ...item.sections.flatMap((section) => [section.title, section.text])].map((text) => text[language]).join(" "));
      return words.every((word) => haystack.includes(word));
    });
  }, [query, language]);

  useEffect(() => {
    document.querySelector<HTMLElement>(".app-shell .workspace")?.scrollTo(0, 0);
    if (chapterId) reader.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [chapterId]);

  useEffect(() => {
    if (!zoom) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setZoom(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [zoom]);

  const open = (item: GuideChapter) => { setChapterId(item.id); };

  return <section className="guide-center" aria-label={fr ? "Guide et formation" : "Guide and training"}>
    <header className="guide-head">
      <button type="button" className="analysis-back" onClick={chapter ? () => setChapterId(null) : onClose}><ArrowLeft size={18} aria-hidden="true" />{chapter ? (fr ? "Tous les chapitres" : "All chapters") : (fr ? "Retour" : "Back")}</button>
      {!chapter && <div className="guide-hero">
        <span className="guide-hero-icon" aria-hidden="true"><GraduationCap size={28} /></span>
        <div>
          <h1>{fr ? "Guide et formation" : "Guide and training"}</h1>
          <p>{fr ? "Apprenez Brainy pas à pas : de la première collection aux analyses, aux objets et au partage. Chaque chapitre se lit en quelques minutes." : "Learn Brainy step by step: from your first collection to analysis, objects and sharing. Each chapter takes a few minutes to read."}</p>
        </div>
      </div>}
    </header>

    {!chapter && <>
      <label className="guide-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">{fr ? "Rechercher dans le guide" : "Search the guide"}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={fr ? "Rechercher dans le guide (ex. unité, stock, partage)" : "Search the guide (e.g. unit, stock, sharing)"} />
      </label>
      {visible.length ? <ol className="guide-chapters">
        {visible.map((item) => {
          const Icon = icons[item.icon] ?? Compass;
          const number = guideChapters.indexOf(item) + 1;
          return <li key={item.id}>
            <button type="button" className="guide-chapter-card" data-icon={item.icon} onClick={() => open(item)}>
              <span className="guide-chapter-icon" aria-hidden="true"><Icon size={22} /></span>
              <span className="guide-chapter-copy">
                <small>{fr ? `Chapitre ${number}` : `Chapter ${number}`}</small>
                <strong>{pick(item.title)}</strong>
                <span>{pick(item.summary)}</span>
              </span>
              <ArrowRight className="guide-chapter-arrow" size={18} aria-hidden="true" />
            </button>
          </li>;
        })}
      </ol> : <div className="guide-empty"><p>{fr ? "Aucun chapitre ne correspond à cette recherche." : "No chapter matches this search."}</p><button type="button" className="analysis-back" onClick={() => setQuery("")}>{fr ? "Effacer la recherche" : "Clear search"}</button></div>}
    </>}

    {chapter && <article className="guide-reader" ref={reader}>
      <header className="guide-reader-head">
        <span className="guide-chapter-icon" data-icon={chapter.icon} aria-hidden="true">{(() => { const Icon = icons[chapter.icon] ?? Compass; return <Icon size={24} />; })()}</span>
        <div>
          <small>{fr ? `Chapitre ${index + 1} sur ${guideChapters.length}` : `Chapter ${index + 1} of ${guideChapters.length}`}</small>
          <h1 tabIndex={-1}>{pick(chapter.title)}</h1>
          <p>{pick(chapter.summary)}</p>
        </div>
      </header>
      {chapter.sections.map((section, position) => <section key={position} className="guide-section">
        <h2>{pick(section.title)}</h2>
        <GuideRichText text={pick(section.text)} />
        {section.image && <figure className="guide-shot">
          <button type="button" onClick={() => setZoom({ src: `/guide/${language}/${section.image}.jpg`, alt: pick(section.title) })} aria-label={fr ? `Agrandir la capture : ${pick(section.title)}` : `Enlarge screenshot: ${pick(section.title)}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot shipped with the app */}
            <img src={`/guide/${language}/${section.image}.jpg`} alt={fr ? `Capture d’écran : ${pick(section.title)}` : `Screenshot: ${pick(section.title)}`} loading="lazy" decoding="async" />
          </button>
          <figcaption>{fr ? "Exemple avec des données de démonstration" : "Example with demo data"}</figcaption>
        </figure>}
      </section>)}
      <nav className="guide-pager" aria-label={fr ? "Chapitres voisins" : "Nearby chapters"}>
        {index > 0 ? <button type="button" onClick={() => setChapterId(guideChapters[index - 1].id)}><ArrowLeft size={18} aria-hidden="true" /><span><small>{fr ? "Précédent" : "Previous"}</small>{pick(guideChapters[index - 1].title)}</span></button> : <span />}
        {index < guideChapters.length - 1 ? <button type="button" className="next" onClick={() => setChapterId(guideChapters[index + 1].id)}><span><small>{fr ? "Suivant" : "Next"}</small>{pick(guideChapters[index + 1].title)}</span><ArrowRight size={18} aria-hidden="true" /></button> : <button type="button" className="next" onClick={() => setChapterId(null)}><span><small>{fr ? "Terminé" : "Done"}</small>{fr ? "Tous les chapitres" : "All chapters"}</span><ArrowRight size={18} aria-hidden="true" /></button>}
      </nav>
    </article>}

    {zoom && <div className="guide-zoom" role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}>
      <button type="button" className="guide-zoom-close" aria-label={fr ? "Fermer" : "Close"} onClick={() => setZoom(null)} autoFocus><X size={20} aria-hidden="true" /></button>
      {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot shipped with the app */}
      <img src={zoom.src} alt={zoom.alt} onClick={(event) => event.stopPropagation()} />
    </div>}
  </section>;
}
