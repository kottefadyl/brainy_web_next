"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ChartColumn, ChartLine, Download, FileCode2, FileSpreadsheet, FileImage } from "lucide-react";
import type { AnalysisResult, Language } from "../lib/brainy";
import { alignSeries, chartCsv, chooseAxisTicks, entryCount, formatChartValue, formatDelta, fullLabel, MAX_CHART_POINTS, niceScale, sampleSlots, type ChartSlot, type SeriesPoint } from "../lib/chart-math";
import { todayLocalIso } from "../lib/date-input";
import { buildChartSvg, saveSvgAsPng, saveText, type ExportLegendItem } from "./analysis-chart-export";
import { ActionPopover } from "./components/ui/ActionPopover";

export type ChartView = "LINE" | "BAR";
type SeriesId = "main" | "comparison";
type Props = {
  rows: AnalysisResult["rows"]; comparisonRows?: AnalysisResult["rows"]; unit?: string; language: Language;
  title?: string; view?: ChartView; views?: ChartView[]; onViewChange?: (view: ChartView) => void;
};

const COLORS: Record<SeriesId, string> = { main: "var(--series-main)", comparison: "var(--series-comparison)" };
const HEIGHT = 210, TOP = 14, AXIS = 176, RIGHT = 14, EXPORT_WIDTH = 960, MAX_BAR = 24;
const compactNumber = (language: Language) => new Intl.NumberFormat(language, { notation: "compact", maximumSignificantDigits: 3 });

function barPath(x: number, width: number, top: number, base: number): string {
  const up = top <= base;
  const radius = Math.min(4, width / 2, Math.abs(base - top));
  const edge = up ? top + radius : top - radius;
  return `M${x} ${base}V${edge}Q${x} ${top} ${x + radius} ${top}H${x + width - radius}Q${x + width} ${top} ${x + width} ${edge}V${base}Z`;
}

export function AnalysisResultChart(props: Props) {
  const { rows, unit, language } = props;
  const fr = language === "fr";
  if (rows.length === 1) {
    const row = rows[0];
    return <div className="analysis-key-figure">
      <span className="section-overline">{fr ? "Chiffre clé" : "Key figure"}</span>
      <strong>{row.value}<small>{unit}</small></strong>
      <span>{row.label} · {row.count} {fr ? row.count === 1 ? "entrée" : "entrées" : row.count === 1 ? "entry" : "entries"}</span>
    </div>;
  }
  return rows.length < 2 ? null : <SeriesChart {...props} />;
}

function SeriesChart({ rows, comparisonRows, unit, language, title, view: controlled, views = ["LINE", "BAR"], onViewChange }: Props) {
  const fr = language === "fr";
  const gradientId = `chart-area-${useId().replaceAll(":", "")}`;
  const wrapper = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const targets = useRef<(SVGRectElement | null)[]>([]);
  const [measured, setMeasured] = useState(560);
  const [exportWidth, setExportWidth] = useState<number | null>(null);
  const [ownView, setOwnView] = useState<ChartView>("LINE");
  const [isolated, setIsolated] = useState<SeriesId | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [rove, setRove] = useState(0);
  const [exportError, setExportError] = useState("");
  const view = controlled ?? ownView;
  const width = exportWidth ?? measured;
  const compared = !!comparisonRows?.length;
  const showMain = isolated !== "comparison";
  const showComparison = compared && isolated !== "main";

  const allSlots = useMemo(() => alignSeries(rows, comparisonRows), [rows, comparisonRows]);
  const slots = useMemo(() => sampleSlots(allSlots), [allSlots]);
  const scale = useMemo(() => niceScale(allSlots.flatMap((slot) => [...(showMain && slot.main ? [slot.main.value] : []), ...(showComparison && slot.comparison ? [slot.comparison.value] : [])])), [allSlots, showMain, showComparison]);
  const axisNumber = compactNumber(language);
  const left = Math.min(72, Math.max(36, Math.max(...scale.ticks.map((tick) => axisNumber.format(tick).length)) * 8 + 12));
  const plotWidth = Math.max(40, width - left - RIGHT);
  const band = plotWidth / slots.length;
  const line = view === "LINE";
  const positions = slots.map((_, index) => (line ? left + index * plotWidth / Math.max(1, slots.length - 1) : left + band * (index + 0.5)));
  const y = (value: number) => AXIS - (value - scale.low) / (scale.high - scale.low) * (AXIS - TOP);
  const baseline = y(0);
  const ticks = chooseAxisTicks(slots.map((slot) => slot.label), positions, language);
  const showDots = plotWidth / slots.length >= 14;
  const current = active !== null && active < slots.length ? slots[active] : null;
  const currentX = active !== null ? positions[active] : undefined;

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setMeasured(entry.contentRect.width); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A touch has no pointer leaving the chart: tapping elsewhere closes the tooltip.
  useEffect(() => {
    if (active === null) return;
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setActive(null); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [active]);

  useLayoutEffect(() => {
    const [box, tip, plot] = [wrapper.current, tooltip.current, svg.current];
    if (!box || !tip || !plot || !current || currentX === undefined) return;
    const anchorValue = Math.max(showMain ? current.main?.value ?? scale.low : scale.low, showComparison ? current.comparison?.value ?? scale.low : scale.low);
    const outer = box.getBoundingClientRect();
    const inner = plot.getBoundingClientRect();
    const anchorX = inner.left - outer.left + currentX;
    const anchorY = inner.top - outer.top + y(anchorValue);
    const tipLeft = Math.max(0, Math.min(anchorX - tip.offsetWidth / 2, box.clientWidth - tip.offsetWidth));
    const above = anchorY - tip.offsetHeight - 12;
    tip.style.transform = `translate(${Math.round(tipLeft)}px, ${Math.round(above >= 0 ? above : anchorY + 14)}px)`;
  });

  const choose = (index: number, focus: boolean) => { setActive(index); setRove(index); if (focus) targets.current[index]?.focus(); };
  const onKey = (event: KeyboardEvent<SVGRectElement>, index: number) => {
    const next = ({ ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: slots.length - 1 } as Record<string, number | undefined>)[event.key];
    if (next !== undefined) { event.preventDefault(); choose(Math.max(0, Math.min(slots.length - 1, next)), true); }
    if (event.key === "Escape" && active !== null) { event.stopPropagation(); setActive(null); }
  };
  const changeView = (next: ChartView) => { setOwnView(next); onViewChange?.(next); };
  const mainName = fr ? "Résultat par groupe" : "Result by group";
  const comparisonName = fr ? "Période comparée" : "Comparison period";
  const accessibleLabel = (slot: ChartSlot) => [fullLabel(slot.label, language),
    slot.main ? `${formatChartValue(slot.main.value, unit, language)}, ${entryCount(slot.main.row.count, language)}` : "",
    slot.delta !== null ? formatDelta(slot.delta, language) : "",
    slot.comparison ? `${comparisonName} ${fullLabel(slot.comparison.row.label, language)}: ${formatChartValue(slot.comparison.value, unit, language)}` : ""].filter(Boolean).join(" · ");

  const legendItems: (ExportLegendItem & { id: SeriesId })[] = [
    { id: "main", label: `${mainName}${unit ? ` · ${unit}` : ""}`, color: COLORS.main, dashed: false },
    ...(compared ? [{ id: "comparison" as const, label: comparisonName, color: COLORS.comparison, dashed: true }] : []),
  ];
  const visibleLegend = legendItems.filter((item) => (item.id === "main" ? showMain : showComparison));

  /** Renders once at report width, without painting, and restores the on-screen size. */
  const reportSvg = () => {
    flushSync(() => { setActive(null); setExportWidth(EXPORT_WIDTH); });
    const built = buildChartSvg(svg.current!, title ?? mainName, visibleLegend);
    flushSync(() => setExportWidth(null));
    return built;
  };
  const baseName = `brainy-chart-${todayLocalIso()}`;
  const runExport = async (action: () => void | Promise<void>) => {
    setExportError("");
    try { await action(); } catch { setExportError(fr ? "Export impossible. Réessayez." : "Export failed. Please try again."); }
  };

  const seriesRuns = (pick: (slot: ChartSlot) => SeriesPoint | undefined) => {
    const runs: { x: number; y: number }[][] = [[]];
    slots.forEach((slot, index) => {
      const point = pick(slot);
      if (point) runs.at(-1)!.push({ x: positions[index], y: y(point.value) });
      else if (runs.at(-1)!.length) runs.push([]);
    });
    return runs.filter((run) => run.length);
  };
  const pointsOf = (run: { x: number; y: number }[]) => run.map((point) => `${point.x},${point.y}`).join(" ");
  const areaOf = (run: { x: number; y: number }[]) => `M${run[0].x} ${baseline}L${run.map((point) => `${point.x} ${point.y}`).join("L")}L${run.at(-1)!.x} ${baseline}Z`;
  const drawnBars = (showMain ? 1 : 0) + (showComparison ? 1 : 0);
  const barWidth = Math.max(1, Math.min(MAX_BAR, (band - Math.min(4, band * 0.3) - (drawnBars > 1 ? 2 : 0)) / Math.max(1, drawnBars)));
  const iconButton = (id: ChartView, label: string, icon: ReactNode) => <button key={id} type="button" aria-pressed={view === id} aria-label={label} title={label} onClick={() => changeView(id)}>{icon}</button>;
  const anchorFor = (tick: { index: number; label: string }): "start" | "middle" | "end" => {
    const half = tick.label.length * 3.5;
    if (positions[tick.index] - half < 0) return "start";
    return positions[tick.index] + half > width ? "end" : "middle";
  };

  return <div ref={wrapper} className="insights-chart analysis-line-chart" onPointerLeave={(event) => { if (event.pointerType === "mouse") setActive(null); }}>
    <div className="analysis-chart-bar">
      <div className="analysis-chart-legend">
        {compared ? legendItems.map((item) => <button key={item.id} type="button" className="analysis-legend-item" aria-pressed={isolated === item.id}
          title={isolated === item.id ? (fr ? "Afficher toutes les séries" : "Show all series") : (fr ? "Isoler cette série" : "Show only this series")}
          data-muted={item.id === "main" ? !showMain : !showComparison} onClick={() => setIsolated(isolated === item.id ? null : item.id)}>
          <span className="analysis-chart-key" data-series={item.id} aria-hidden="true" />{item.label}
        </button>) : <><span className="analysis-chart-key" data-series="main" aria-hidden="true" />{legendItems[0].label}</>}
      </div>
      <div className="analysis-chart-tools">
        {views.length > 1 && <div className="analysis-view-switch" role="group" aria-label={fr ? "Type de graphique" : "Chart type"}>
          {views.includes("LINE") && iconButton("LINE", fr ? "Courbe" : "Line", <ChartLine size={18} aria-hidden="true" />)}
          {views.includes("BAR") && iconButton("BAR", fr ? "Barres" : "Bars", <ChartColumn size={18} aria-hidden="true" />)}
        </div>}
        <ActionPopover label={fr ? "Exporter le graphique" : "Export chart"} triggerIcon={<Download size={18} aria-hidden="true" />} actions={[
          { label: fr ? "Image vectorielle (SVG)" : "Vector image (SVG)", icon: <FileCode2 size={17} aria-hidden="true" />, onSelect: () => void runExport(() => saveText(`${baseName}.svg`, reportSvg().markup, "image/svg+xml")) },
          { label: fr ? "Image haute définition (PNG)" : "High-resolution image (PNG)", icon: <FileImage size={17} aria-hidden="true" />, onSelect: () => void runExport(() => saveSvgAsPng(`${baseName}.png`, reportSvg())) },
          { label: fr ? "Données (CSV)" : "Data (CSV)", icon: <FileSpreadsheet size={17} aria-hidden="true" />, onSelect: () => void runExport(() => saveText(`${baseName}.csv`, `\uFEFF${chartCsv(rows, comparisonRows, unit, language)}`, "text/csv;charset=utf-8")) },
        ]} />
      </div>
    </div>
    <svg ref={svg} className="analysis-chart-plot" viewBox={`0 0 ${width} ${HEIGHT}`} role="group" aria-label={title ?? (fr ? "Graphique des résultats" : "Results chart")}>
      <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={COLORS.main} stopOpacity="0.2" /><stop offset="1" stopColor={COLORS.main} stopOpacity="0.02" /></linearGradient></defs>
      {scale.ticks.map((tick) => <g key={tick}>
        <line x1={left} x2={width - RIGHT} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth="1" />
        <text x={left - 6} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="13">{axisNumber.format(tick)}</text>
      </g>)}
      {current && currentX !== undefined && (line
        ? <line data-export-skip="" x1={currentX} x2={currentX} y1={TOP} y2={AXIS} stroke="var(--muted)" strokeWidth="1" />
        : <rect data-export-skip="" className="analysis-chart-band" x={currentX - band / 2} width={band} y={TOP} height={AXIS - TOP} />)}
      {line && <>
        {showMain && seriesRuns((slot) => slot.main).map((run, index) => run.length > 1 && <path key={index} d={areaOf(run)} fill={`url(#${gradientId})`} />)}
        {showComparison && seriesRuns((slot) => slot.comparison).map((run, index) => <polyline key={index} className="analysis-line-comparison" fill="none" stroke={COLORS.comparison} strokeOpacity="0.85" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" points={pointsOf(run)} />)}
        {showMain && seriesRuns((slot) => slot.main).map((run, index) => <polyline key={index} className="analysis-line-path" pathLength={1500} fill="none" stroke={COLORS.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pointsOf(run)} />)}
        {showDots && slots.map((slot, index) => showMain && slot.main && <circle key={slot.key} cx={positions[index]} cy={y(slot.main.value)} r="4" fill={COLORS.main} stroke="var(--surface)" strokeWidth="2" />)}
      </>}
      {!line && slots.map((slot, index) => {
        let cursor = positions[index] - (barWidth * drawnBars + (drawnBars > 1 ? 2 : 0)) / 2;
        const bar = (point: SeriesPoint | undefined, id: SeriesId) => {
          const x = cursor;
          cursor += barWidth + 2;
          return point && point.value !== 0 ? <path key={id} className="analysis-chart-rect" d={barPath(x, barWidth, y(point.value), baseline)} fill={COLORS[id]} {...(id === "comparison" ? { fillOpacity: 0.45, stroke: COLORS.comparison, strokeDasharray: "3 2" } : {})} /> : null;
        };
        return <g key={slot.key}>{showMain && bar(slot.main, "main")}{showComparison && bar(slot.comparison, "comparison")}</g>;
      })}
      <line x1={left} x2={width - RIGHT} y1={baseline} y2={baseline} stroke="var(--muted)" strokeWidth="1" />
      {ticks.map((tick) => <text key={tick.index} className="analysis-axis-label" x={positions[tick.index]} y="201" textAnchor={anchorFor(tick)} fill="var(--muted)" fontSize="13">{tick.label}</text>)}
      {current && currentX !== undefined && line && <g data-export-skip="">
        {showComparison && current.comparison && <circle cx={currentX} cy={y(current.comparison.value)} r="5" fill="var(--surface)" stroke={COLORS.comparison} strokeWidth="2" />}
        {showMain && current.main && <circle cx={currentX} cy={y(current.main.value)} r="6" fill={COLORS.main} stroke="var(--surface)" strokeWidth="2" />}
      </g>}
      {slots.map((slot, index) => {
        const halfBefore = index === 0 ? (line ? 0 : band / 2) : (positions[index] - positions[index - 1]) / 2;
        const halfAfter = index === slots.length - 1 ? (line ? RIGHT : band / 2) : (positions[index + 1] - positions[index]) / 2;
        return <rect key={slot.key} data-export-skip="" className="analysis-chart-target" ref={(element) => { targets.current[index] = element; }}
          x={positions[index] - halfBefore} width={halfBefore + halfAfter} y={0} height={AXIS + 6} fill="transparent" role="img" aria-label={accessibleLabel(slot)} tabIndex={index === Math.min(rove, slots.length - 1) ? 0 : -1}
          onPointerEnter={() => choose(index, false)} onPointerDown={() => choose(index, false)} onFocus={() => choose(index, false)} onBlur={() => setActive(null)} onKeyDown={(event) => onKey(event, index)} />;
      })}
    </svg>
    <div ref={tooltip} className="analysis-tooltip" aria-hidden="true" data-open={!!current}>
      {current && <>
        {showMain && current.main && <strong>{formatChartValue(current.main.value, unit, language)}</strong>}
        {showMain && current.main && <span className="analysis-tooltip-label">{fullLabel(current.main.row.label, language)}</span>}
        {showMain && current.main && <span className="analysis-tooltip-meta">{entryCount(current.main.row.count, language)}{current.delta !== null && <em data-trend={current.delta > 0 ? "up" : current.delta < 0 ? "down" : "flat"}><span aria-hidden="true">{current.delta > 0 ? "▲" : current.delta < 0 ? "▼" : "="}</span> {formatDelta(current.delta, language)}</em>}</span>}
        {showComparison && current.comparison && <span className="analysis-tooltip-comparison"><span className="analysis-chart-key" data-series="comparison" aria-hidden="true" /><b>{formatChartValue(current.comparison.value, unit, language)}</b> {fullLabel(current.comparison.row.label, language)} · {entryCount(current.comparison.row.count, language)}</span>}
      </>}
    </div>
    {allSlots.length > MAX_CHART_POINTS && <p className="analysis-chart-note">{fr ? `Courbe simplifiée : ${slots.length} points affichés sur ${allSlots.length}. Le tableau et l’export CSV contiennent tout.` : `Simplified chart: ${slots.length} of ${allSlots.length} points shown. The table and CSV export contain every point.`}</p>}
    {exportError && <p className="form-error" role="alert">{exportError}</p>}
  </div>;
}
