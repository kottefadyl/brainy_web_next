"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ChartArea, ChartColumn, ChartLine, Download, FileCode2, FileImage, FileSpreadsheet } from "lucide-react";
import type { AnalysisResult, Language } from "../lib/brainy";
import { chartCsv, chooseAxisTicks, entryCount, formatChartValue, fullLabel, lttbIndices, MAX_CHART_POINTS, niceScale, stackedTops, type MultiSeries } from "../lib/chart-math";
import { todayLocalIso } from "../lib/date-input";
import { buildChartSvg, saveSvgAsPng, saveText, type ExportLegendItem } from "./analysis-chart-export";
import type { ChartView } from "./analysis-result-chart";
import { ActionPopover } from "./components/ui/ActionPopover";
import { ChartScrubber, ChartZoomButtons, useChartZoom, zoomKey } from "./chart-zoom-controls";
import { MIN_ZOOM_POINTS } from "../lib/chart-zoom";

type Props = {
  multi: MultiSeries; rows: AnalysisResult["rows"]; unit?: string; language: Language;
  title?: string; view?: ChartView; views?: ChartView[]; onViewChange?: (view: ChartView) => void;
};

// Colour, dash and marker together: no series depends on colour alone.
const STYLES = [
  { color: "var(--chart-1)", dash: undefined, marker: "circle" },
  { color: "var(--chart-2)", dash: "8 4", marker: "square" },
  { color: "var(--chart-3)", dash: "2 4", marker: "triangle" },
  { color: "var(--chart-4)", dash: "10 4 2 4", marker: "diamond" },
] as const;
type Marker = (typeof STYLES)[number]["marker"];
const HEIGHT = 210, TOP = 14, AXIS = 176, RIGHT = 14, EXPORT_WIDTH = 960, MAX_BAR = 18;
const compactNumber = (language: Language) => new Intl.NumberFormat(language, { notation: "compact", maximumSignificantDigits: 3 });

function markerPath(marker: Marker, x: number, y: number, r: number): string {
  if (marker === "square") return `M${x - r} ${y - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
  if (marker === "triangle") return `M${x} ${y - r * 1.2}L${x + r * 1.1} ${y + r * 0.9}H${x - r * 1.1}Z`;
  if (marker === "diamond") return `M${x} ${y - r * 1.25}L${x + r * 1.25} ${y}L${x} ${y + r * 1.25}L${x - r * 1.25} ${y}Z`;
  return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

function Swatch({ index }: { index: number }) {
  const style = STYLES[index];
  return <svg className="analysis-series-swatch" viewBox="0 0 22 10" aria-hidden="true">
    <line x1="1" x2="21" y1="5" y2="5" stroke={style.color} strokeWidth="2" strokeDasharray={style.dash} />
    <path d={markerPath(style.marker, 11, 5, 3)} fill={style.color} />
  </svg>;
}

export function AnalysisMultiSeriesChart({ multi, rows, unit, language, title, view: controlled, views = ["LINE", "BAR"], onViewChange }: Props) {
  const fr = language === "fr";
  const wrapper = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const targets = useRef<(SVGRectElement | null)[]>([]);
  const [measured, setMeasured] = useState(560);
  const [exportWidth, setExportWidth] = useState<number | null>(null);
  const [ownView, setOwnView] = useState<ChartView>("LINE");
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const [rove, setRove] = useState(0);
  const [exportError, setExportError] = useState("");
  const view = controlled ?? ownView;
  const line = view === "LINE";
  // Stacked areas (T23/1): each series sits on the previous ones; points are spread like a line chart.
  const stacked = view === "STACKED";
  const flowing = line || stacked;
  const width = exportWidth ?? measured;
  const visible = useMemo(() => multi.series.map((series, index) => ({ series, index })).filter(({ series }) => !hidden.has(series.key)), [multi, hidden]);

  const zoom = useChartZoom(multi.periods.length, svg);
  const { start, end } = zoom.window;
  // Thin long periods on the visible total, so that peaks of every series survive.
  const kept = useMemo(() => {
    const inWindow = Array.from({ length: end - start }, (_, offset) => start + offset);
    if (inWindow.length <= MAX_CHART_POINTS) return inWindow;
    const sums = inWindow.map((index) => visible.reduce((sum, { series }) => sum + Math.abs(series.points[index]?.value ?? 0), 0));
    return lttbIndices(sums, MAX_CHART_POINTS).map((offset) => start + offset);
  }, [visible, start, end]);
  const tops = useMemo(() => stackedTops(visible.map(({ series }) => series), kept), [visible, kept]);
  const scale = useMemo(() => niceScale(stacked ? [0, ...(tops.at(-1) ?? [])] : visible.flatMap(({ series }) => series.points.slice(start, end).flatMap((point) => (point ? [point.value] : [])))), [visible, start, end, stacked, tops]);
  const axisNumber = compactNumber(language);
  const left = Math.min(72, Math.max(36, Math.max(...scale.ticks.map((tick) => axisNumber.format(tick).length)) * 8 + 12));
  const plotWidth = Math.max(40, width - left - RIGHT);
  const band = plotWidth / kept.length;
  const positions = kept.map((_, order) => (flowing ? left + order * plotWidth / Math.max(1, kept.length - 1) : left + band * (order + 0.5)));
  const y = (value: number) => AXIS - (value - scale.low) / (scale.high - scale.low) * (AXIS - TOP);
  const baseline = y(0);
  const ticks = chooseAxisTicks(kept.map((index) => multi.periods[index]), positions, language);
  const showMarkers = band >= 14;
  const current = active !== null && active < kept.length ? kept[active] : null;
  const currentX = active !== null ? positions[active] : undefined;

  useEffect(() => { zoom.setFrame({ width, left, plotWidth }); });

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setMeasured(entry.contentRect.width); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active === null) return;
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setActive(null); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [active]);

  useLayoutEffect(() => {
    const [box, tip, plot] = [wrapper.current, tooltip.current, svg.current];
    if (!box || !tip || !plot || current === null || currentX === undefined) return;
    const highest = stacked ? (tops.at(-1)?.[active ?? 0] ?? scale.low) : Math.max(scale.low, ...visible.map(({ series }) => series.points[current]?.value ?? scale.low));
    const outer = box.getBoundingClientRect();
    const inner = plot.getBoundingClientRect();
    const anchorX = inner.left - outer.left + currentX;
    const anchorY = inner.top - outer.top + y(highest);
    const tipLeft = Math.max(0, Math.min(anchorX - tip.offsetWidth / 2, box.clientWidth - tip.offsetWidth));
    const above = anchorY - tip.offsetHeight - 12;
    tip.style.transform = `translate(${Math.round(tipLeft)}px, ${Math.round(above >= 0 ? above : anchorY + 14)}px)`;
  });

  const choose = (order: number, focus: boolean) => { setActive(order); setRove(order); if (focus) targets.current[order]?.focus(); };
  const onKey = (event: KeyboardEvent<SVGRectElement>, order: number) => {
    if (zoomKey(event, zoom, order / Math.max(1, kept.length - 1))) { event.preventDefault(); return; }
    const next = ({ ArrowRight: order + 1, ArrowLeft: order - 1, Home: 0, End: kept.length - 1 } as Record<string, number | undefined>)[event.key];
    // Past an edge of a zoomed, unsampled window, the window follows the point.
    if (next !== undefined && (next < 0 || next >= kept.length) && zoom.zoomed && kept.length === end - start) { event.preventDefault(); zoom.shift(next < 0 ? -1 : 1); return; }
    if (next !== undefined) { event.preventDefault(); choose(Math.max(0, Math.min(kept.length - 1, next)), true); }
    if (event.key === "Escape" && active !== null) { event.stopPropagation(); setActive(null); }
  };
  const toggle = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else if (multi.series.length - next.size > 1) next.add(key);
    setHidden(next);
  };
  const changeView = (next: ChartView) => { setOwnView(next); onViewChange?.(next); };
  const valueText = (value: number | undefined) => (value === undefined ? (fr ? "aucune donnée" : "no data") : formatChartValue(value, unit, language));
  const accessibleLabel = (index: number) => [fullLabel(multi.periods[index], language),
    ...visible.map(({ series }) => `${series.label} : ${valueText(series.points[index]?.value)}`),
    ...(stacked ? [`Total : ${valueText(tops.at(-1)?.[kept.indexOf(index)])}`] : [])].join(" · ");

  const legend: (ExportLegendItem & { key: string })[] = visible.map(({ series, index }) => ({ key: series.key, label: series.label, color: STYLES[index].color, dashed: !!STYLES[index].dash, dash: STYLES[index].dash }));
  const chartTitle = `${title ?? (fr ? "Résultat par catégorie" : "Result by category")}${unit ? ` · ${unit}` : ""}`;
  const reportSvg = () => {
    flushSync(() => { setActive(null); setExportWidth(EXPORT_WIDTH); });
    const built = buildChartSvg(svg.current!, chartTitle, legend);
    flushSync(() => setExportWidth(null));
    return built;
  };
  const baseName = `brainy-chart-${todayLocalIso()}`;
  const runExport = async (action: () => void | Promise<void>) => {
    setExportError("");
    try { await action(); } catch { setExportError(fr ? "Export impossible. Réessayez." : "Export failed. Please try again."); }
  };
  const runs = (points: MultiSeries["series"][number]["points"]) => {
    const result: { x: number; y: number }[][] = [[]];
    kept.forEach((index, order) => {
      const point = points[index];
      if (point) result.at(-1)!.push({ x: positions[order], y: y(point.value) });
      else if (result.at(-1)!.length) result.push([]);
    });
    return result.filter((run) => run.length);
  };
  const barWidth = Math.max(1, Math.min(MAX_BAR, (band - Math.min(6, band * 0.3) - (visible.length - 1) * 2) / Math.max(1, visible.length)));
  const iconButton = (id: ChartView, label: string, icon: ReactNode) => <button key={id} type="button" aria-pressed={view === id} aria-label={label} title={label} onClick={() => changeView(id)}>{icon}</button>;
  const anchorFor = (tick: { index: number; label: string }): "start" | "middle" | "end" => {
    const half = tick.label.length * 3.5;
    if (positions[tick.index] - half < 0) return "start";
    return positions[tick.index] + half > width ? "end" : "middle";
  };
  const total = multi.series.length + multi.hiddenSeries;

  return <div ref={wrapper} className="insights-chart analysis-line-chart analysis-multi-chart" onPointerLeave={(event) => { if (event.pointerType === "mouse") setActive(null); }}>
    <div className="analysis-chart-bar">
      <div className="analysis-chart-legend" role="group" aria-label={fr ? "Séries affichées" : "Shown series"}>
        {multi.series.map((series, index) => <button key={series.key} type="button" className="analysis-legend-item" aria-pressed={!hidden.has(series.key)}
          title={hidden.has(series.key) ? (fr ? "Afficher cette série" : "Show this series") : (fr ? "Masquer cette série" : "Hide this series")}
          data-muted={hidden.has(series.key)} onClick={() => toggle(series.key)}>
          <Swatch index={index} /><span className="analysis-legend-text">{series.label}</span>
        </button>)}
      </div>
      <div className="analysis-chart-tools">
        {multi.periods.length > MIN_ZOOM_POINTS && <ChartZoomButtons zoom={zoom} language={language} />}
        {views.length > 1 && <div className="analysis-view-switch" role="group" aria-label={fr ? "Type de graphique" : "Chart type"}>
          {views.includes("LINE") && iconButton("LINE", fr ? "Courbes" : "Lines", <ChartLine size={18} aria-hidden="true" />)}
          {views.includes("BAR") && iconButton("BAR", fr ? "Barres" : "Bars", <ChartColumn size={18} aria-hidden="true" />)}
          {views.includes("STACKED") && iconButton("STACKED", fr ? "Aires empilées" : "Stacked areas", <ChartArea size={18} aria-hidden="true" />)}
        </div>}
        <ActionPopover label={fr ? "Exporter le graphique" : "Export chart"} triggerIcon={<Download size={18} aria-hidden="true" />} actions={[
          { label: fr ? "Image vectorielle (SVG)" : "Vector image (SVG)", icon: <FileCode2 size={17} aria-hidden="true" />, onSelect: () => void runExport(() => saveText(`${baseName}.svg`, reportSvg().markup, "image/svg+xml")) },
          { label: fr ? "Image haute définition (PNG)" : "High-resolution image (PNG)", icon: <FileImage size={17} aria-hidden="true" />, onSelect: () => void runExport(() => saveSvgAsPng(`${baseName}.png`, reportSvg())) },
          { label: fr ? "Données (CSV)" : "Data (CSV)", icon: <FileSpreadsheet size={17} aria-hidden="true" />, onSelect: () => void runExport(() => saveText(`${baseName}.csv`, `﻿${chartCsv(rows, undefined, unit, language)}`, "text/csv;charset=utf-8")) },
        ]} />
      </div>
    </div>
    <svg ref={svg} className="analysis-chart-plot" viewBox={`0 0 ${width} ${HEIGHT}`} role="group" aria-label={chartTitle} {...zoom.plotHandlers}>
      {scale.ticks.map((tick) => <g key={tick}>
        <line x1={left} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth="1" />
        <text x={left - 6} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="13">{axisNumber.format(tick)}</text>
      </g>)}
      {current !== null && currentX !== undefined && (flowing
        ? <line data-export-skip="" x1={currentX} x2={currentX} y1={TOP} y2={AXIS} stroke="var(--muted)" strokeWidth="1" />
        : <rect data-export-skip="" className="analysis-chart-band" x={currentX - band / 2} width={band} y={TOP} height={AXIS - TOP} />)}
      {stacked && visible.map(({ series, index }, order) => {
        const upper = tops[order].map((top, at) => `${positions[at]},${y(top)}`);
        const lower = order === 0 ? [`${positions.at(-1)},${baseline}`, `${positions[0]},${baseline}`] : tops[order - 1].map((top, at) => `${positions[at]},${y(top)}`).reverse();
        return <polygon key={series.key} className="analysis-area-path" points={[...upper, ...lower].join(" ")} fill={STYLES[index].color} fillOpacity="0.55" stroke={STYLES[index].color} strokeWidth="1.5" strokeLinejoin="round" />;
      })}
      {line && visible.map(({ series, index }) => <g key={series.key}>
        {runs(series.points).map((run, part) => <polyline key={part} className="analysis-line-path" pathLength={1500} fill="none" stroke={STYLES[index].color} strokeWidth="2" strokeDasharray={STYLES[index].dash} strokeLinecap="round" strokeLinejoin="round" points={run.map((point) => `${point.x},${point.y}`).join(" ")} />)}
        {(showMarkers || runs(series.points).some((run) => run.length === 1)) && kept.map((pointIndex, order) => {
          const point = series.points[pointIndex];
          return point ? <path key={order} d={markerPath(STYLES[index].marker, positions[order], y(point.value), 3.5)} fill={STYLES[index].color} stroke="var(--surface)" strokeWidth="1.5" /> : null;
        })}
      </g>)}
      {!flowing && kept.map((pointIndex, order) => {
        let cursor = positions[order] - (barWidth * visible.length + (visible.length - 1) * 2) / 2;
        return <g key={pointIndex}>{visible.map(({ series, index }) => {
          const x = cursor;
          cursor += barWidth + 2;
          const point = series.points[pointIndex];
          if (!point || point.value === 0) return null;
          const top = Math.min(y(point.value), baseline);
          return <rect key={series.key} className="analysis-chart-rect" x={x} width={barWidth} y={top} height={Math.max(1, Math.abs(baseline - y(point.value)))} rx={Math.min(3, barWidth / 2)} fill={STYLES[index].color} />;
        })}</g>;
      })}
      <line x1={left} x2={width - RIGHT} y1={baseline} y2={baseline} stroke="var(--muted)" strokeWidth="1" />
      {ticks.map((tick) => <text key={tick.index} className="analysis-axis-label" x={positions[tick.index]} y="201" textAnchor={anchorFor(tick)} fill="var(--muted)" fontSize="13">{tick.label}</text>)}
      {current !== null && currentX !== undefined && flowing && <g data-export-skip="">
        {visible.map(({ series, index }, order) => {
          const point = series.points[current];
          return point ? <path key={series.key} d={markerPath(STYLES[index].marker, currentX, y(stacked ? tops[order][active ?? 0] : point.value), 5.5)} fill={STYLES[index].color} stroke="var(--surface)" strokeWidth="2" /> : null;
        })}
      </g>}
      {kept.map((pointIndex, order) => {
        const halfBefore = order === 0 ? (flowing ? 0 : band / 2) : (positions[order] - positions[order - 1]) / 2;
        const halfAfter = order === kept.length - 1 ? (flowing ? RIGHT : band / 2) : (positions[order + 1] - positions[order]) / 2;
        return <rect key={pointIndex} data-export-skip="" className="analysis-chart-target" ref={(element) => { targets.current[order] = element; }}
          x={positions[order] - halfBefore} width={halfBefore + halfAfter} y={0} height={AXIS + 6} fill="transparent" role="img" aria-label={accessibleLabel(pointIndex)} tabIndex={order === Math.min(rove, kept.length - 1) ? 0 : -1}
          onPointerEnter={() => choose(order, false)} onPointerDown={() => choose(order, false)} onFocus={() => choose(order, false)} onBlur={() => setActive(null)} onKeyDown={(event) => onKey(event, order)} />;
      })}
    </svg>
    <div ref={tooltip} className="analysis-tooltip" aria-hidden="true" data-open={current !== null}>
      {current !== null && <>
        <span className="analysis-tooltip-label">{fullLabel(multi.periods[current], language)}</span>
        {visible.map(({ series, index }) => {
          const point = series.points[current];
          return <span key={series.key} className="analysis-tooltip-series"><Swatch index={index} /><span>{series.label}</span><b>{valueText(point?.value)}</b>{point && <small>{entryCount(point.row.count, language)}</small>}</span>;
        })}
        {stacked && <span className="analysis-tooltip-series"><span>Total</span><b>{valueText(tops.at(-1)?.[active ?? 0])}</b></span>}
      </>}
    </div>
    <ChartScrubber zoom={zoom} total={multi.periods.length} language={language} label={`${fullLabel(multi.periods[start], language)} – ${fullLabel(multi.periods[end - 1], language)}`} />
    {zoom.zoomed && <p className="analysis-chart-note">{fr ? `Zoom : ${end - start} périodes sur ${multi.periods.length}.` : `Zoomed: ${end - start} of ${multi.periods.length} periods.`}</p>}
    {multi.hiddenSeries > 0 && <p className="analysis-chart-note">{fr ? `${multi.series.length} catégories sur ${total} tracées : celles dont le total est le plus grand. Le tableau et l’export CSV contiennent tout.` : `${multi.series.length} of ${total} categories drawn: those with the largest totals. The table and CSV export contain every value.`}</p>}
    {multi.skippedRows > 0 && <p className="analysis-chart-note">{multi.skippedRows === 1
      ? (fr ? "1 valeur sans date n’est pas tracée ; elle reste dans le tableau." : "1 value without a date is not drawn; it stays in the table.")
      : (fr ? `${multi.skippedRows} valeurs sans date ne sont pas tracées ; elles restent dans le tableau.` : `${multi.skippedRows} values without a date are not drawn; they stay in the table.`)}</p>}
    {end - start > MAX_CHART_POINTS && <p className="analysis-chart-note">{fr ? `Graphique simplifié : ${kept.length} périodes affichées sur ${end - start}.` : `Simplified chart: ${kept.length} of ${end - start} periods shown.`}</p>}
    {exportError && <p className="form-error" role="alert">{exportError}</p>}
  </div>;
}
