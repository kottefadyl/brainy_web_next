// Scatter plot and radar (T23/1): pure logic shared by the charts and their checks.
import type { Entry, Field, Language } from "./brainy";

export type ScatterPoint = { entryId: string; x: number; y: number; label: string };

/** Fields a scatter axis can use: plain numbers and measures. */
export const isScatterField = (field: Field) => field.kind === "NUMBER" || field.kind === "MEASURE";

/** One point per entry holding both numbers; entries missing either value are counted apart. */
export function scatterPoints(entries: Entry[], xFieldId: string, yFieldId: string, labelFieldId?: string): { points: ScatterPoint[]; skipped: number } {
  const points: ScatterPoint[] = [];
  let skipped = 0;
  for (const entry of entries) {
    const read = (fieldId: string) => { const raw = entry.values.find((item) => item.fieldId === fieldId)?.value; const value = raw === undefined || raw === "" ? NaN : Number(raw); return Number.isFinite(value) ? value : undefined; };
    const x = read(xFieldId), y = read(yFieldId);
    if (x === undefined || y === undefined) { skipped++; continue; }
    const label = (labelFieldId && entry.values.find((item) => item.fieldId === labelFieldId)?.value) || "";
    points.push({ entryId: entry.id, x, y, label });
  }
  return { points, skipped };
}

/** Pearson correlation; null with fewer than 3 points or when one axis never varies. */
export function pearson(points: { x: number; y: number }[]): number | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((sum, point) => sum + point.x, 0) / n;
  const my = points.reduce((sum, point) => sum + point.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const { x, y } of points) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (sxx === 0 || syy === 0) return null;
  return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
}

/** Least-squares line y = slope·x + intercept; null when x never varies. */
export function linearFit(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((sum, point) => sum + point.x, 0) / n;
  const my = points.reduce((sum, point) => sum + point.y, 0) / n;
  let sxy = 0, sxx = 0;
  for (const { x, y } of points) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/** The strength of a correlation in plain words, with the usual thresholds (0.3 and 0.7). */
export function correlationWords(r: number | null, language: Language): string {
  const fr = language === "fr";
  if (r === null) return fr ? "Pas assez de points variés pour mesurer un lien." : "Not enough varied points to measure a link.";
  const strength = Math.abs(r) >= 0.7 ? (fr ? "fort" : "strong") : Math.abs(r) >= 0.3 ? (fr ? "modéré" : "moderate") : (fr ? "faible ou absent" : "weak or none");
  if (Math.abs(r) < 0.3) return fr ? `Lien ${strength}.` : `Link: ${strength}.`;
  const direction = r > 0 ? (fr ? "quand l’un augmente, l’autre augmente aussi" : "when one rises, the other tends to rise") : (fr ? "quand l’un augmente, l’autre diminue" : "when one rises, the other tends to fall");
  return fr ? `Lien ${strength} : ${direction}.` : `${strength[0].toUpperCase()}${strength.slice(1)} link: ${direction}.`;
}

/** Radar axes are spread clockwise from the top; returns the point of `ratio` (0..1) on axis `index`. */
export function radarPoint(index: number, count: number, ratio: number, cx: number, cy: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  return { x: cx + Math.cos(angle) * radius * ratio, y: cy + Math.sin(angle) * radius * ratio };
}

/** A radar needs 3 to 12 categories, none negative, and something above zero. */
export function canRadar(values: number[], groupBy: string | undefined): boolean {
  return (groupBy === "CATEGORY" || groupBy === "OBJECT" || groupBy === "PERSON") && values.length >= 3 && values.length <= 12 && values.every((value) => Number.isFinite(value) && value >= 0) && values.some((value) => value > 0);
}

/** CSV of the plotted points, with the same protection against formulas as the other exports. */
export function scatterCsv(points: ScatterPoint[], xName: string, yName: string, language: Language): string {
  const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  const header = [language === "fr" ? "Entrée" : "Entry", xName, yName].map(cell).join(",");
  return [header, ...points.map((point) => [cell(point.label || point.entryId), String(point.x), String(point.y)].join(","))].join("\r\n");
}
