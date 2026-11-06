"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult, Language } from "../lib/brainy";

export function AnalysisResultChart({ rows, unit, language }: {
  rows: AnalysisResult["rows"]; unit?: string; language: Language;
}) {
  const fr = language === "fr";
  const chartRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(560);
  const hasCurve = rows.length > 1;
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(chart);
    return () => observer.disconnect();
  }, [hasCurve]);
  if (rows.length === 1) {
    const row = rows[0];
    return <div className="analysis-key-figure">
      <span className="section-overline">{fr ? "Chiffre clé" : "Key figure"}</span>
      <strong>{row.value}<small>{unit}</small></strong>
      <span>{row.label} · {row.count} {fr ? row.count === 1 ? "entrée" : "entrées" : row.count === 1 ? "entry" : "entries"}</span>
    </div>;
  }
  if (rows.length < 2) return null;
  const values = rows.map((row) => Number(row.value) || 0);
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const span = Math.max(1, high - low);
  const x = (index: number) => 52 + index * (width - 66) / (rows.length - 1);
  const y = (value: number) => 176 - (value - low) / span * 142;
  const ticks = [0, 1, 2, 3, 4].map((index) => high - index * span / 4);
  const tickLabel = new Intl.NumberFormat(language, { notation: "compact", maximumSignificantDigits: 3 });
  const labelLimit = Math.max(6, Math.floor((width - 66) / 16));
  const shortLabel = (label: string) => label.length > labelLimit ? `${label.slice(0, labelLimit - 1)}…` : label;
  return <div className="insights-chart analysis-line-chart">
    <svg ref={chartRef} viewBox={`0 0 ${width} 210`} role="img" aria-label={fr ? "Courbe des résultats" : "Results line chart"}>
      {ticks.map((tick, index) => <g key={index}>
        <line x1="52" x2={width - 14} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth="1" />
        <text x="46" y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="13">{tickLabel.format(tick)}</text>
      </g>)}
      <polyline className="analysis-line-path" fill="none" stroke="var(--chart-1)" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        points={values.map((value, index) => `${x(index)},${y(value)}`).join(" ")} />
      {rows.map((row, index) => <circle key={row.group} cx={x(index)} cy={y(values[index])} r="5"
        fill="var(--chart-1)" stroke="var(--surface)" strokeWidth="2" tabIndex={0} aria-label={`${row.label}: ${row.value} ${unit ?? ""}`}>
        <title>{row.label}: {row.value} {unit ?? ""}</title>
      </circle>)}
      <text x="52" y="201" fill="var(--muted)" fontSize="13"><title>{rows[0].label}</title>{shortLabel(rows[0].label)}</text>
      <text x={width - 14} y="201" textAnchor="end" fill="var(--muted)" fontSize="13"><title>{rows.at(-1)!.label}</title>{shortLabel(rows.at(-1)!.label)}</text>
    </svg>
    <div className="analysis-chart-legend"><span className="analysis-chart-key" aria-hidden="true" />{fr ? "Résultat par groupe" : "Result by group"}{unit ? ` · ${unit}` : ""}</div>
  </div>;
}
