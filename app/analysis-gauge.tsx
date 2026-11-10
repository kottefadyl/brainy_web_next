"use client";

import { useId, useState } from "react";
import type { Language } from "../lib/brainy";
import { formatChartValue } from "../lib/chart-math";

/** Parses a target typed with a comma or a point; undefined unless it is a positive number. */
export function parseTarget(text: string): number | undefined {
  const value = Number(text.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Progress toward a target, from 0 to 1, with the share as a whole percentage. */
export function gaugeProgress(value: number, target: number): { ratio: number; percent: number } {
  const share = target > 0 ? value / target : 0;
  return { ratio: Math.max(0, Math.min(1, share)), percent: Math.round(Math.max(0, share) * 100) };
}

const R = 60, CX = 75, CY = 72;
const arc = (ratio: number) => {
  const angle = Math.PI * (1 - ratio);
  const x = CX + R * Math.cos(angle), y = CY - R * Math.sin(angle);
  return `M${CX - R} ${CY}A${R} ${R} 0 ${ratio > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
};

/** A key figure against a target typed by the person (T23/1 gauge). The target is not stored. */
export function KeyFigureGauge({ value, unit, language }: { value: number; unit?: string; language: Language }) {
  const fr = language === "fr";
  const id = useId();
  const [text, setText] = useState("");
  const target = parseTarget(text);
  const progress = target === undefined ? null : gaugeProgress(value, target);
  const reached = !!progress && progress.percent >= 100;
  const description = progress && target !== undefined
    ? (fr ? `${progress.percent} % de l’objectif : ${formatChartValue(value, unit, language)} sur ${formatChartValue(target, unit, language)}` : `${progress.percent}% of the target: ${formatChartValue(value, unit, language)} of ${formatChartValue(target, unit, language)}`)
    : "";
  return <div className="analysis-gauge">
    <label htmlFor={id}>{fr ? "Objectif (facultatif)" : "Target (optional)"}
      <input id={id} type="text" inputMode="decimal" value={text} placeholder={fr ? "ex. 1 000" : "e.g. 1,000"} onChange={(event) => setText(event.target.value)} aria-describedby={progress ? `${id}-text` : undefined} />
    </label>
    {text.trim() !== "" && target === undefined && <p className="analysis-chart-note">{fr ? "Entrez un nombre supérieur à zéro." : "Enter a number above zero."}</p>}
    {progress && <div className="analysis-gauge-figure">
      <svg viewBox="0 0 150 84" role="img" aria-label={description}>
        <path d={arc(1)} fill="none" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" />
        {progress.ratio > 0 && <path d={arc(progress.ratio)} fill="none" stroke={reached ? "var(--chart-2)" : "var(--chart-1)"} strokeWidth="12" strokeLinecap="round" />}
        <text x={CX} y={CY - 6} textAnchor="middle" fill="var(--ink)" fontSize="22" fontWeight="700">{progress.percent} %</text>
      </svg>
      <p id={`${id}-text`}><b>{reached ? (fr ? "Objectif atteint" : "Target reached") : (fr ? "En cours" : "In progress")}</b><br />{description}</p>
    </div>}
  </div>;
}
