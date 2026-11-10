"use client";

// Scatter plot (T23/1): one point per entry with two numbers, the trend line and the
// correlation in plain words. Entries are read page by page, so protected values stay hidden.
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { api } from "../lib/api";
import { unitSymbol, type Collection, type CollectionFormat, type Entry, type Language } from "../lib/brainy";
import { formatChartValue } from "../lib/chart-math";
import { correlationWords, isScatterField, linearFit, pearson, scatterCsv, scatterPoints, type ScatterPoint } from "../lib/chart-scatter-radar";
import "./analysis-scatter-radar.css";

const MAX_PAGES = 10; // 10 pages of 100 entries
const HEIGHT = 320, PAD = { left: 64, right: 16, top: 16, bottom: 44 };

function niceStep(span: number): number {
  if (!(span > 0)) return 1;
  const raw = span / 4, power = 10 ** Math.floor(Math.log10(raw)), unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}
/** Axis bounds around the data, not forced to zero: a weight between 79 and 82 kg stays readable. */
export function tightScale(values: number[]): { low: number; high: number; ticks: number[] } {
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const step = niceStep(max - min);
  const low = Math.floor(min / step) * step, high = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 2; value += step) ticks.push(Number(value.toPrecision(12)));
  return { low, high, ticks };
}

/** Width of an element that may appear later (the plot shows only once points are loaded). */
function useWidth() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([item]) => setWidth(Math.max(260, Math.round(item.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width] as const;
}

export default function AnalysisScatterChart({ collection, format, language, onOpenEntry }: { collection: Collection; format: CollectionFormat; language: Language; onOpenEntry: (entryId: string) => void }) {
  const fr = language === "fr";
  const id = useId();
  const numeric = format.fields.filter(isScatterField);
  const [xId, setXId] = useState(numeric[0]?.id ?? "");
  const [yId, setYId] = useState(numeric[1]?.id ?? "");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const [wrapRef, width] = useWidth();
  const unitText = (unit?: string | null) => !unit ? "" : collection.units.find((item) => `local:${item.id}` === unit || item.id === unit)?.symbol ?? unitSymbol(unit);
  const axisName = (name?: string, unit?: string | null) => `${name ?? ""}${unitText(unit) ? ` · ${unitText(unit)}` : ""}`;
  const xField = format.fields.find((field) => field.id === xId), yField = format.fields.find((field) => field.id === yId);
  const titleField = format.fields.find((field) => field.kind === "TITLE");

  async function draw() {
    setBusy(true); setError(""); setActive(null);
    try {
      const loaded: Entry[] = [];
      let after: string | undefined, page = 0, hasMore = false;
      do {
        const result = await api.entriesPage(collection.id, { formatId: format.id, first: 100, after });
        loaded.push(...result.entries);
        after = result.nextCursor ?? undefined;
        page++;
        hasMore = !!after;
      } while (after && page < MAX_PAGES);
      setEntries(loaded); setMore(hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  }

  const { points, skipped } = useMemo(() => entries && xId && yId ? scatterPoints(entries, xId, yId, titleField?.id) : { points: [] as ScatterPoint[], skipped: 0 }, [entries, xId, yId, titleField?.id]);
  // Keyboard order follows the horizontal axis.
  const ordered = useMemo(() => [...points].sort((a, b) => a.x - b.x || a.y - b.y), [points]);
  const r = pearson(points), fit = linearFit(points);
  const xs = tightScale(points.length ? points.map((point) => point.x) : [0, 1]), ys = tightScale(points.length ? points.map((point) => point.y) : [0, 1]);
  const plotW = width - PAD.left - PAD.right, plotH = HEIGHT - PAD.top - PAD.bottom;
  const px = (value: number) => PAD.left + ((value - xs.low) / (xs.high - xs.low)) * plotW;
  const py = (value: number) => PAD.top + plotH - ((value - ys.low) / (ys.high - ys.low)) * plotH;
  const fmtX = (value: number) => formatChartValue(value, xField?.unit ?? undefined, language);
  const fmtY = (value: number) => formatChartValue(value, yField?.unit ?? undefined, language);
  const current = active === null ? undefined : ordered[active];
  const number = (value: number, digits = 3) => new Intl.NumberFormat(language, { maximumSignificantDigits: digits }).format(value);

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (!ordered.length) return;
    const last = ordered.length - 1;
    const moves: Record<string, () => number | null> = { ArrowRight: () => Math.min(last, (active ?? -1) + 1), ArrowDown: () => Math.min(last, (active ?? -1) + 1), ArrowLeft: () => Math.max(0, (active ?? 1) - 1), ArrowUp: () => Math.max(0, (active ?? 1) - 1), Home: () => 0, End: () => last, Escape: () => null };
    if (moves[event.key]) { event.preventDefault(); setActive(moves[event.key]()); return; }
    if (event.key === "Enter" && current) { event.preventDefault(); onOpenEntry(current.entryId); }
  }
  function downloadCsv() {
    const blob = new Blob(["﻿" + scatterCsv(ordered, xField?.name ?? "X", yField?.name ?? "Y", language)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `${format.name} - ${xField?.name} - ${yField?.name}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  if (numeric.length < 2) return <p className="scatter-note">{fr ? "Un nuage de points compare deux champs nombre d’un même format de données ; celui-ci n’en a pas deux." : "A scatter plot compares two number fields of one data format; this one does not have two."}</p>;

  return <div className="scatter">
    <div className="scatter-controls">
      <label>{fr ? "Axe horizontal (X)" : "Horizontal axis (X)"}<select value={xId} onChange={(event) => { setXId(event.target.value); setActive(null); }}>{numeric.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
      <label>{fr ? "Axe vertical (Y)" : "Vertical axis (Y)"}<select value={yId} onChange={(event) => { setYId(event.target.value); setActive(null); }}>{numeric.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
      <button type="button" className="btn primary" disabled={busy || !xId || !yId} onClick={() => void draw()}>{busy ? (fr ? "Chargement…" : "Loading…") : entries ? (fr ? "Actualiser" : "Refresh") : (fr ? "Tracer le nuage" : "Draw the scatter plot")}</button>
    </div>
    {xId === yId && <p className="scatter-note">{fr ? "Choisissez deux champs différents." : "Choose two different fields."}</p>}
    {error && <p className="scatter-error" role="alert">{fr ? "Les entrées n’ont pas pu être lues : " : "The entries could not be read: "}{error} <button type="button" onClick={() => void draw()}>{fr ? "Réessayer" : "Retry"}</button></p>}
    {entries && xId !== yId && (points.length ? <>
      <div ref={wrapRef} className="scatter-plot">
        <svg width={width} height={HEIGHT} role="group" tabIndex={0} aria-roledescription={fr ? "nuage de points" : "scatter plot"} aria-describedby={`${id}-summary`}
          aria-label={fr ? `${yField?.name} selon ${xField?.name}, ${points.length} points. Flèches pour parcourir, Entrée pour ouvrir l’entrée.` : `${yField?.name} by ${xField?.name}, ${points.length} points. Arrow keys to browse, Enter to open the entry.`}
          onKeyDown={onKey} onBlur={() => setActive(null)}>
          {ys.ticks.map((tick) => <g key={`y${tick}`}><line x1={PAD.left} x2={width - PAD.right} y1={py(tick)} y2={py(tick)} className="scatter-grid" /><text x={PAD.left - 8} y={py(tick)} className="scatter-tick" textAnchor="end" dominantBaseline="middle">{number(tick, 4)}</text></g>)}
          {xs.ticks.map((tick, index) => (width < 420 && index % 2) ? null : <text key={`x${tick}`} x={px(tick)} y={HEIGHT - PAD.bottom + 18} className="scatter-tick" textAnchor="middle">{number(tick, 4)}</text>)}
          <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} className="scatter-axis" />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} className="scatter-axis" />
          <text x={PAD.left + plotW / 2} y={HEIGHT - 6} className="scatter-axis-name" textAnchor="middle">{axisName(xField?.name, xField?.unit)}</text>
          <text transform={`translate(14 ${PAD.top + plotH / 2}) rotate(-90)`} className="scatter-axis-name" textAnchor="middle">{axisName(yField?.name, yField?.unit)}</text>
          {fit && <line x1={px(xs.low)} x2={px(xs.high)} y1={py(fit.slope * xs.low + fit.intercept)} y2={py(fit.slope * xs.high + fit.intercept)} className="scatter-trend" clipPath={`url(#${CSS.escape(id)}-clip)`} />}
          <clipPath id={`${id}-clip`}><rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} /></clipPath>
          {ordered.map((point, index) => <circle key={point.entryId} cx={px(point.x)} cy={py(point.y)} r={index === active ? 7 : 4.5} className={index === active ? "scatter-point is-active" : "scatter-point"}
            onMouseEnter={() => setActive(index)} onClick={() => onOpenEntry(point.entryId)} />)}
        </svg>
        {current && <div className="scatter-tooltip" role="status" style={{ left: Math.min(width - 190, Math.max(0, px(current.x) + 10)), top: Math.max(0, py(current.y) - 70) }}>
          <strong>{current.label || (fr ? "Entrée sans titre" : "Untitled entry")}</strong>
          <span>{xField?.name}{fr ? " : " : ": "}{fmtX(current.x)}</span><span>{yField?.name}{fr ? " : " : ": "}{fmtY(current.y)}</span>
          <small>{fr ? "Entrée ou clic : ouvrir" : "Enter or click: open"}</small>
        </div>}
      </div>
      <div id={`${id}-summary`} className="scatter-summary">
        <p><strong>{points.length}</strong> {fr ? "points" : "points"}{skipped ? ` · ${skipped} ${fr ? "entrées sans les deux valeurs, non tracées" : "entries without both values, not plotted"}` : ""}{more ? ` · ${fr ? "les 1 000 premières entrées seulement" : "first 1,000 entries only"}` : ""}</p>
        <p>{r === null ? correlationWords(null, language) : <>{fr ? "Corrélation" : "Correlation"} r = <strong>{number(r, 2)}</strong> · {correlationWords(r, language)}</>}</p>
        {fit && <p>{fr ? "Tendance (pointillé) : " : "Trend (dashed): "}{yField?.name} ≈ {number(fit.slope)} × {xField?.name} {fit.intercept < 0 ? "−" : "+"} {number(Math.abs(fit.intercept))}</p>}
        <p className="scatter-caution">{fr ? "Un lien entre deux valeurs ne prouve pas que l’une cause l’autre." : "A link between two values does not prove that one causes the other."}</p>
        <button type="button" className="btn" onClick={downloadCsv}>{fr ? "Télécharger les points (CSV)" : "Download the points (CSV)"}</button>
      </div>
      <details className="scatter-table"><summary>{fr ? "Voir les points" : "View the points"}</summary>
        <table><thead><tr><th>{fr ? "Entrée" : "Entry"}</th><th>{xField?.name}</th><th>{yField?.name}</th></tr></thead>
          <tbody>{ordered.slice(0, 200).map((point) => <tr key={point.entryId}><td><button type="button" onClick={() => onOpenEntry(point.entryId)}>{point.label || point.entryId}</button></td><td>{fmtX(point.x)}</td><td>{fmtY(point.y)}</td></tr>)}</tbody>
        </table>
        {ordered.length > 200 && <p className="scatter-note">{fr ? `200 points affichés sur ${ordered.length} ; le CSV les contient tous.` : `200 of ${ordered.length} points shown; the CSV holds them all.`}</p>}
      </details>
    </> : <p className="scatter-note">{fr ? "Aucune entrée n’a ces deux valeurs." : "No entry has both values."}</p>)}
  </div>;
}
