"use client";

// Radar (T23/1): one axis per category of a result, the compared period dashed.
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import type { AnalysisResult, Language } from "../lib/brainy";
import { formatChartValue, niceScale } from "../lib/chart-math";
import { radarPoint } from "../lib/chart-scatter-radar";
import "./analysis-scatter-radar.css";

type Row = AnalysisResult["rows"][number];

export default function AnalysisRadarChart({ rows, comparisonRows, unit, language, title }: { rows: Row[]; comparisonRows?: Row[]; unit?: string; language: Language; title?: string }) {
  const fr = language === "fr";
  const id = useId();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(420);
  const [active, setActive] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(true);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([item]) => setWidth(Math.round(item.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  const values = rows.map((row) => Math.max(0, Number(row.value) || 0));
  // The compared period is matched by category key, so a missing category reads as "no data".
  const compared = comparisonRows?.length ? rows.map((row) => comparisonRows.find((item) => item.group === row.group)) : undefined;
  const comparedValues = compared?.map((row) => (row ? Math.max(0, Number(row.value) || 0) : undefined));
  const scale = niceScale([...values, ...(comparedValues?.filter((value): value is number => value !== undefined) ?? [])]);
  const size = Math.max(260, Math.min(width, 460));
  const labelRoom = size < 340 ? 54 : 74;
  const radius = size / 2 - labelRoom, cx = size / 2, cy = size / 2;
  const ratio = (value: number) => (scale.high > 0 ? value / scale.high : 0);
  const polygon = (list: (number | undefined)[]) => list.map((value, index) => { const point = radarPoint(index, list.length, ratio(value ?? 0), cx, cy, radius); return `${point.x.toFixed(1)},${point.y.toFixed(1)}`; }).join(" ");
  const short = (label: string) => (label.length > (size < 340 ? 12 : 18) ? `${label.slice(0, size < 340 ? 11 : 17)}…` : label);
  const fmt = (value: number) => formatChartValue(value, unit, language);
  const current = active === null ? undefined : rows[active];
  const tip = active === null ? undefined : radarPoint(active, rows.length, ratio(values[active]), cx, cy, radius);

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    const last = rows.length - 1;
    const moves: Record<string, () => number | null> = { ArrowRight: () => ((active ?? -1) + 1) % rows.length, ArrowDown: () => ((active ?? -1) + 1) % rows.length, ArrowLeft: () => ((active ?? 1) - 1 + rows.length) % rows.length, ArrowUp: () => ((active ?? 1) - 1 + rows.length) % rows.length, Home: () => 0, End: () => last, Escape: () => null };
    if (moves[event.key]) { event.preventDefault(); setActive(moves[event.key]()); }
  }

  return <div className="radar">
    <div className="radar-legend">
      <span className="radar-key"><span className="radar-swatch" aria-hidden="true" />{title ?? (fr ? "Résultat" : "Result")}{unit ? ` · ${unit}` : ""}</span>
      {compared && <button type="button" className="radar-key" aria-pressed={showComparison} onClick={() => setShowComparison((value) => !value)}><span className="radar-swatch is-dashed" aria-hidden="true" />{fr ? "Période comparée" : "Compared period"}</button>}
    </div>
    <div ref={setElement} className="radar-plot">
      <div className="radar-canvas" style={{ width: size }}>
      <svg width={size} height={size} role="group" tabIndex={0} aria-roledescription={fr ? "graphique radar" : "radar chart"}
        aria-label={fr ? `${rows.length} catégories ; flèches pour les parcourir. Le tableau ci-dessous donne toutes les valeurs.` : `${rows.length} categories; arrow keys to browse them. The table below gives every value.`}
        onKeyDown={onKey} onBlur={() => setActive(null)}>
        {[0.25, 0.5, 0.75, 1].map((ring) => <polygon key={ring} points={polygon(rows.map(() => scale.high * ring))} className="radar-ring" />)}
        {rows.map((row, index) => { const end = radarPoint(index, rows.length, 1, cx, cy, radius); return <line key={row.group} x1={cx} y1={cy} x2={end.x} y2={end.y} className="radar-spoke" />; })}
        {/* Scale value inside the outer ring, clear of the top axis label. */}
        <text x={cx + 6} y={cy - radius + 14} className="radar-scale">{fmt(scale.high)}</text>
        {compared && showComparison && <polygon points={polygon(comparedValues ?? [])} className="radar-area is-comparison" />}
        <polygon points={polygon(values)} className="radar-area" />
        {rows.map((row, index) => {
          const point = radarPoint(index, rows.length, ratio(values[index]), cx, cy, radius);
          const label = radarPoint(index, rows.length, 1, cx, cy, radius + 14);
          const anchor = Math.abs(label.x - cx) < 6 ? "middle" : label.x > cx ? "start" : "end";
          return <g key={row.group} onMouseEnter={() => setActive(index)}>
            <circle cx={point.x} cy={point.y} r={index === active ? 6.5 : 4} className={index === active ? "radar-point is-active" : "radar-point"} />
            <text x={label.x} y={label.y} textAnchor={anchor} dominantBaseline="middle" className={index === active ? "radar-label is-active" : "radar-label"}><title>{row.label}</title>{short(row.label)}</text>
          </g>;
        })}
      </svg>
      {current && tip && <div className="radar-tooltip" role="status" id={`${id}-tip`} style={{ left: Math.min(size - 180, Math.max(0, tip.x + 10)), top: Math.max(0, tip.y - 60) }}>
        <strong>{current.label}</strong>
        <span>{fmt(values[active!])}</span>
        {compared && <span className="radar-tooltip-compared">{fr ? "Comparée : " : "Compared: "}{comparedValues?.[active!] === undefined ? (fr ? "aucune donnée" : "no data") : fmt(comparedValues[active!]!)}</span>}
      </div>}
      </div>
    </div>
  </div>;
}
