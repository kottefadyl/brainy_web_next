"use client";

// T47: layout settings of the book view and a ruler whose markers move the margins and the first-line indent.
import type { PointerEvent as ReactPointerEvent } from "react";
import { pageWidthMm, type BookFont, type BookViewSettings } from "../lib/book";
import type { Language } from "../lib/brainy";

const fonts: { id: BookFont; en: string; fr: string }[] = [
  { id: "SERIF", en: "Classic serif", fr: "Classique à empattements" },
  { id: "GARAMOND", en: "Garamond", fr: "Garamond" },
  { id: "SANS", en: "Modern sans serif", fr: "Moderne sans empattements" },
  { id: "MONO", en: "Typewriter", fr: "Machine à écrire" },
];

export function BookSettingsPanel({ settings, language, onChange, status }: { settings: BookViewSettings; language: Language; onChange: (next: BookViewSettings) => void; status: string }) {
  const fr = language === "fr";
  const set = <K extends keyof BookViewSettings>(key: K, value: BookViewSettings[K]) => onChange({ ...settings, [key]: value });
  const range = (key: "fontSize" | "lineHeight" | "paragraphSpacing" | "firstLineIndent" | "marginMm", label: string, min: number, max: number, step: number, unit: string) => {
    const value = settings[key];
    return <label className="book-range">
      <span>{label}<output>{key === "lineHeight" ? value.toFixed(1) : value}{unit}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => set(key, Number(event.target.value))} />
    </label>;
  };
  return <div className="book-settings" aria-label={fr ? "Mise en page" : "Layout"}>
    <div className="book-settings-group">
      <label>{fr ? "Police du texte" : "Body font"}<select value={settings.bodyFont} onChange={(event) => set("bodyFont", event.target.value as BookFont)}>{fonts.map((font) => <option key={font.id} value={font.id}>{fr ? font.fr : font.en}</option>)}</select></label>
      <label>{fr ? "Police des titres" : "Heading font"}<select value={settings.headingFont} onChange={(event) => set("headingFont", event.target.value as BookFont)}>{fonts.map((font) => <option key={font.id} value={font.id}>{fr ? font.fr : font.en}</option>)}</select></label>
      <label>{fr ? "Format de page" : "Page size"}<select value={settings.pageSize} onChange={(event) => set("pageSize", event.target.value as BookViewSettings["pageSize"])}><option value="A5">A5 (148 × 210 mm)</option><option value="A4">A4 (210 × 297 mm)</option><option value="POCKET">{fr ? "Poche (110 × 178 mm)" : "Pocket (110 × 178 mm)"}</option></select></label>
    </div>
    <div className="book-settings-group">
      {range("fontSize", fr ? "Taille du texte" : "Text size", 12, 24, 1, " px")}
      {range("lineHeight", fr ? "Interligne" : "Line spacing", 1, 2.4, 0.1, "")}
      {range("paragraphSpacing", fr ? "Espace entre paragraphes" : "Paragraph spacing", 0, 2, 0.1, " em")}
      {range("firstLineIndent", fr ? "Retrait de première ligne" : "First-line indent", 0, 3, 0.25, " em")}
      {range("marginMm", fr ? "Marges" : "Margins", 10, 40, 1, " mm")}
    </div>
    <div className="book-settings-group">
      <fieldset className="book-segmented"><legend>{fr ? "Alignement" : "Alignment"}</legend>
        {(["LEFT", "JUSTIFY"] as const).map((value) => <label key={value}><input type="radio" name="book-align" checked={settings.textAlign === value} onChange={() => set("textAlign", value)} />{value === "LEFT" ? fr ? "À gauche" : "Left" : fr ? "Justifié" : "Justified"}</label>)}
      </fieldset>
      <label className="book-check"><input type="checkbox" checked={settings.showRuler} onChange={(event) => set("showRuler", event.target.checked)} />{fr ? "Afficher la règle" : "Show ruler"}</label>
      <label className="book-check"><input type="checkbox" checked={settings.chapterOnNewPage} onChange={(event) => set("chapterOnNewPage", event.target.checked)} />{fr ? "Chaque chapitre sur une nouvelle page" : "Each chapter on a new page"}</label>
      <p className="book-settings-status" role="status">{status}</p>
    </div>
  </div>;
}

/** Ruler in millimetres. Left marker = margins (mirrored on the right), upper marker = first-line indent. */
export function BookRuler({ settings, language, onChange }: { settings: BookViewSettings; language: Language; onChange: (next: BookViewSettings) => void }) {
  const fr = language === "fr";
  const width = pageWidthMm[settings.pageSize];
  const indentMm = Math.round(settings.firstLineIndent * settings.fontSize * 25.4 / 96 * 10) / 10;
  const clampMargin = (value: number) => Math.min(40, Math.max(10, Math.round(value)));
  const clampIndent = (value: number) => Math.min(3, Math.max(0, Math.round(value * 4) / 4));
  const drag = (kind: "margin" | "indent") => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const rect = target.parentElement!.getBoundingClientRect();
    const toMm = (clientX: number) => (clientX - rect.left) / rect.width * width;
    target.setPointerCapture(event.pointerId);
    let latest = settings;
    const move = (moveEvent: PointerEvent) => {
      const mm = toMm(moveEvent.clientX);
      latest = kind === "margin" ? { ...settings, marginMm: clampMargin(mm <= width / 2 ? mm : width - mm) } : { ...settings, firstLineIndent: clampIndent((mm - settings.marginMm) * 96 / 25.4 / settings.fontSize) };
      onChange(latest);
    };
    const up = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", up); };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };
  const keys = (kind: "margin" | "indent") => (event: React.KeyboardEvent) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    onChange(kind === "margin" ? { ...settings, marginMm: clampMargin(settings.marginMm + delta) } : { ...settings, firstLineIndent: clampIndent(settings.firstLineIndent + delta * 0.25) });
  };
  const ticks = Array.from({ length: width + 1 }, (_, mm) => mm);
  const percent = (mm: number) => `${mm / width * 100}%`;
  return <div className="book-ruler" aria-label={fr ? "Règle" : "Ruler"}>
    <div className="book-ruler-margin" style={{ left: 0, width: percent(settings.marginMm) }} />
    <div className="book-ruler-margin" style={{ right: 0, width: percent(settings.marginMm) }} />
    <svg viewBox={`0 0 ${width} 8`} preserveAspectRatio="none" aria-hidden="true">
      {ticks.map((mm) => <line key={mm} x1={mm} x2={mm} y1={mm % 10 === 0 ? 2 : mm % 5 === 0 ? 4.5 : 6} y2={8} vectorEffect="non-scaling-stroke" />)}
    </svg>
    <div className="book-ruler-labels" aria-hidden="true">{ticks.filter((mm) => mm % 10 === 0 && mm > 0 && mm < width).map((mm) => <span key={mm} style={{ left: percent(mm) }}>{mm / 10}</span>)}</div>
    <div role="slider" tabIndex={0} aria-label={fr ? "Marges" : "Margins"} aria-valuemin={10} aria-valuemax={40} aria-valuenow={settings.marginMm} aria-valuetext={`${settings.marginMm} mm`} className="book-ruler-handle margin" style={{ left: percent(settings.marginMm) }} onPointerDown={drag("margin")} onKeyDown={keys("margin")} />
    <div role="slider" tabIndex={0} aria-label={fr ? "Marge droite" : "Right margin"} aria-valuemin={10} aria-valuemax={40} aria-valuenow={settings.marginMm} aria-valuetext={`${settings.marginMm} mm`} className="book-ruler-handle margin right" style={{ left: percent(width - settings.marginMm) }} onPointerDown={drag("margin")} onKeyDown={(event) => keys("margin")({ ...event, key: event.key === "ArrowLeft" ? "ArrowRight" : event.key === "ArrowRight" ? "ArrowLeft" : event.key, preventDefault: () => event.preventDefault() } as React.KeyboardEvent)} />
    <div role="slider" tabIndex={0} aria-label={fr ? "Retrait de première ligne" : "First-line indent"} aria-valuemin={0} aria-valuemax={3} aria-valuenow={settings.firstLineIndent} aria-valuetext={`${settings.firstLineIndent} em`} className="book-ruler-handle indent" style={{ left: percent(settings.marginMm + indentMm) }} onPointerDown={drag("indent")} onKeyDown={keys("indent")} />
  </div>;
}
