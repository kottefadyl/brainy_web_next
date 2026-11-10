import type { AnalysisResult, Language } from "./brainy";

type Row = AnalysisResult["rows"][number];
export type SeriesPoint = { row: Row; value: number };
export type ChartSlot = { key: string; label: string; main?: SeriesPoint; comparison?: SeriesPoint; delta: number | null };
export type AxisTick = { index: number; label: string };
type Period = "month" | "day" | null;

const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}/;
const toValue = (row: Row): number => { const value = Number(row.value); return Number.isFinite(value) ? value : 0; };

/** Periods are read as UTC so that a browser time zone cannot move a month or a day. */
function periodDate(label: string): Date | null {
  if (MONTH.test(label)) return new Date(`${label}-01T00:00:00Z`);
  if (DAY.test(label)) return new Date(`${label.slice(0, 10)}T00:00:00Z`);
  return null;
}

/** A period axis only when every known group is a month, or every known group is a date. */
export function periodKind(labels: string[]): Period {
  const known = labels.filter((label) => label !== "Missing date");
  if (!known.length) return null;
  if (known.every((label) => MONTH.test(label))) return "month";
  return known.every((label) => DAY.test(label)) ? "day" : null;
}

/** Relative change from the previous value; null when there is nothing to compare with. */
export function deltaPercent(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return (current - previous) / Math.abs(previous) * 100;
}

/**
 * Lines the two series up: periods by position (the first month with the first
 * compared month), categories by their key. A key found only in the compared
 * period keeps its own slot, so no result disappears from the chart.
 */
export function alignSeries(rows: Row[], comparison: Row[] = []): ChartSlot[] {
  const byPosition = periodKind([...rows, ...comparison].map((row) => row.label)) !== null;
  const compared = new Map(comparison.map((row, index) => [byPosition ? String(index) : row.group, row]));
  const slots: ChartSlot[] = rows.map((row, index) => {
    const key = byPosition ? String(index) : row.group;
    const match = compared.get(key);
    compared.delete(key);
    const value = toValue(row);
    return { key, label: row.label, main: { row, value }, comparison: match ? { row: match, value: toValue(match) } : undefined, delta: deltaPercent(value, index > 0 ? toValue(rows[index - 1]) : undefined) };
  });
  for (const [key, row] of compared) slots.push({ key, label: row.label, comparison: { row, value: toValue(row) }, delta: null });
  return slots;
}

/** Largest-Triangle-Three-Buckets: the indices of `threshold` points that keep peaks, troughs and trend. */
export function lttbIndices(values: number[], threshold: number): number[] {
  const count = values.length;
  if (threshold >= count || threshold < 3) return values.map((_, index) => index);
  const kept = [0];
  const bucket = (count - 2) / (threshold - 2);
  let anchor = 0;
  for (let index = 0; index < threshold - 2; index++) {
    const nextStart = Math.floor((index + 1) * bucket) + 1;
    const nextEnd = Math.min(Math.floor((index + 2) * bucket) + 1, count);
    let averageX = 0;
    let averageY = 0;
    for (let cursor = nextStart; cursor < nextEnd; cursor++) { averageX += cursor; averageY += values[cursor]; }
    const size = Math.max(1, nextEnd - nextStart);
    averageX /= size;
    averageY /= size;
    let best = -1;
    let bestArea = -1;
    for (let cursor = Math.floor(index * bucket) + 1; cursor < nextStart; cursor++) {
      const area = Math.abs((anchor - averageX) * (values[cursor] - values[anchor]) - (anchor - cursor) * (averageY - values[anchor]));
      if (area > bestArea) { bestArea = area; best = cursor; }
    }
    kept.push(best);
    anchor = best;
  }
  kept.push(count - 1);
  return kept;
}

export const MAX_CHART_POINTS = 100;

export function sampleSlots(slots: ChartSlot[]): ChartSlot[] {
  if (slots.length <= MAX_CHART_POINTS) return slots;
  return lttbIndices(slots.map((slot) => slot.main?.value ?? slot.comparison?.value ?? 0), MAX_CHART_POINTS).map((index) => slots[index]);
}

/** Round graduations around zero, so that bars keep their baseline. */
export function niceScale(values: number[], intervals = 4): { low: number; high: number; ticks: number[] } {
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;
  const rough = range / intervals;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((item) => item * power >= rough) ?? 10) * power;
  const low = Math.floor(minimum / step) * step;
  const high = maximum === minimum ? step * intervals : Math.ceil(maximum / step) * step;
  const ticks: number[] = [];
  for (let index = 0; low + index * step <= high + step / 2; index++) ticks.push(Number((low + index * step).toPrecision(12)));
  return { low: ticks[0], high: ticks.at(-1)!, ticks: ticks.reverse() };
}

type TickStyle = "day" | "month" | "year";
type Grid = { bucket: (date: Date) => number; style: TickStyle };

const dayNumber = (date: Date) => Math.round(date.getTime() / 86_400_000);
// 1970-01-05 is a Monday, day 4 of the epoch.
const weekNumber = (date: Date) => Math.floor((dayNumber(date) - 4) / 7);
const monthNumber = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth();
const everyMonths = (step: number, style: TickStyle = "month"): Grid => ({ bucket: (date) => Math.floor(monthNumber(date) / step), style });
const monthGrids: Grid[] = [everyMonths(1), everyMonths(2), everyMonths(3), everyMonths(6), everyMonths(12, "year"), everyMonths(24, "year"), everyMonths(60, "year")];
const dayGrids: Grid[] = [
  { bucket: dayNumber, style: "day" },
  { bucket: weekNumber, style: "day" },
  { bucket: (date) => Math.floor(weekNumber(date) / 2), style: "day" },
  everyMonths(1), everyMonths(3), everyMonths(6), everyMonths(12, "year"), everyMonths(60, "year"),
];

function tickText(date: Date, style: TickStyle, language: Language): string {
  const options: Intl.DateTimeFormatOptions = style === "year" ? { year: "numeric" } : style === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat(language, { ...options, timeZone: "UTC" }).format(date);
}

export function axisLabel(label: string, kind: Period, language: Language): string {
  const date = kind ? periodDate(label) : null;
  if (!date) return label;
  return new Intl.DateTimeFormat(language, kind === "month" ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

export function fullLabel(label: string, language: Language): string {
  const date = periodDate(label);
  if (!date) return label;
  return new Intl.DateTimeFormat(language, MONTH.test(label) ? { month: "long", year: "numeric", timeZone: "UTC" } : { dateStyle: "long", timeZone: "UTC" }).format(date);
}

const CHARACTER_WIDTH = 7;
const shorten = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, Math.max(1, limit - 1))}…` : text);

/**
 * Graduations of the horizontal axis. Periods land on calendar boundaries
 * (months, quarters, years, Mondays); other labels are evenly spaced. The
 * finest grid whose labels do not touch is kept.
 */
export function chooseAxisTicks(labels: string[], positions: number[], language: Language): AxisTick[] {
  const kind = periodKind(labels);
  const rendered = labels.map((label) => axisLabel(label, kind, language));
  if (kind) {
    const dates = labels.map(periodDate);
    for (const grid of kind === "month" ? monthGrids : dayGrids) {
      // The first point of each period: a thinned series rarely keeps the exact boundary.
      const hits = dates.flatMap((date, index) => {
        const before = dates.slice(0, index).reverse().find(Boolean);
        return date && (!before || grid.bucket(before) !== grid.bucket(date)) ? [index] : [];
      });
      const texts = hits.map((index) => tickText(dates[index]!, grid.style, language));
      const gap = Math.max(...texts.map((text) => text.length), 0) * CHARACTER_WIDTH + 12;
      if (hits.length >= 2 && hits.every((index, order) => order === 0 || positions[index] - positions[hits[order - 1]] >= gap)) return hits.map((index, order) => ({ index, label: texts[order] }));
    }
  }
  const longest = Math.min(14, Math.max(...rendered.map((label) => label.length)));
  const slotGap = longest * CHARACTER_WIDTH + 12;
  const span = positions.at(-1)! - positions[0];
  const fit = Math.max(2, Math.floor(span / slotGap) + 1);
  const step = Math.max(1, Math.ceil((positions.length - 1) / (fit - 1)));
  const ticks: AxisTick[] = [];
  for (let index = 0; index < positions.length; index += step) ticks.push({ index, label: shorten(rendered[index], longest) });
  return ticks;
}

const CURRENCIES = new Set(["EUR", "USD", "GBP", "NGN"]);

export function formatChartValue(value: number, unit: string | undefined, language: Language): string {
  const fixed = unit && CURRENCIES.has(unit) ? 2 : undefined;
  const number = new Intl.NumberFormat(language, { minimumFractionDigits: fixed, maximumFractionDigits: fixed ?? 6 }).format(value);
  return unit ? `${number} ${unit}` : number;
}

export const formatDelta = (delta: number, language: Language) => `${new Intl.NumberFormat(language, { signDisplay: "exceptZero", maximumFractionDigits: 1 }).format(delta)} %`;

export function entryCount(count: number, language: Language): string {
  const number = new Intl.NumberFormat(language).format(count);
  if (language === "fr") return `${number} ${count > 1 ? "entrées" : "entrée"}`;
  return `${number} ${count === 1 ? "entry" : "entries"}`;
}

export const MAX_SERIES = 4;
const PERIOD_GROUPS = new Set(["DAY", "MONTH"]);
const SERIES_GROUPS = new Set(["CATEGORY", "OBJECT"]);
export type MultiSeries = {
  periods: string[];
  series: { key: string; label: string; total: number; points: (SeriesPoint | undefined)[] }[];
  hiddenSeries: number;
  skippedRows: number;
};

/**
 * Turns a cross-tabulation of periods × categories into one series per
 * category, all in the same unit. The categories with the largest totals are
 * drawn; the table keeps every cell. Null when the result has no period axis.
 */
export function splitCrossTab(rows: Row[], groupBy: string | undefined, secondaryGroupBy: string | undefined): MultiSeries | null {
  const periodFirst = PERIOD_GROUPS.has(groupBy ?? "") && SERIES_GROUPS.has(secondaryGroupBy ?? "");
  const periodSecond = SERIES_GROUPS.has(groupBy ?? "") && PERIOD_GROUPS.has(secondaryGroupBy ?? "");
  if (!periodFirst && !periodSecond) return null;
  const cells: { period: string; key: string; label: string; row: Row }[] = [];
  let skippedRows = 0;
  for (const row of rows) {
    if (!row.rowKey || !row.columnKey) return null;
    const period = periodFirst ? row.rowKey : row.columnKey;
    const key = periodFirst ? row.columnKey : row.rowKey;
    if (!periodDate(period)) { skippedRows += 1; continue; }
    // The API writes "<row label> × <column label>"; a period is written as its own key.
    const label = periodFirst
      ? (row.label.startsWith(`${period} × `) ? row.label.slice(period.length + 3) : key)
      : (row.label.endsWith(` × ${period}`) ? row.label.slice(0, -(period.length + 3)) : key);
    cells.push({ period, key, label, row });
  }
  const periods = [...new Set(cells.map((cell) => cell.period))].sort();
  if (periods.length < 2) return null;
  const totals = new Map<string, { label: string; total: number }>();
  for (const cell of cells) {
    const current = totals.get(cell.key) ?? { label: cell.label, total: 0 };
    current.total += Math.abs(toValue(cell.row));
    totals.set(cell.key, current);
  }
  const chosen = [...totals.entries()].sort((a, b) => b[1].total - a[1].total || a[1].label.localeCompare(b[1].label)).slice(0, MAX_SERIES);
  const index = new Map(periods.map((period, position) => [period, position]));
  const series = chosen.map(([key, { label, total }]) => {
    const points: (SeriesPoint | undefined)[] = periods.map(() => undefined);
    for (const cell of cells) if (cell.key === key) points[index.get(cell.period)!] = { row: cell.row, value: toValue(cell.row) };
    return { key, label, total, points };
  });
  return { periods, series, hiddenSeries: totals.size - chosen.length, skippedRows };
}

/** Quotes a cell; text that a spreadsheet would run as a formula is neutralized. */
function csvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** Every row, including those thinned out of the drawing. Values keep their exact stored form. */
export function chartCsv(rows: Row[], comparison: Row[] | undefined, unit: string | undefined, language: Language): string {
  const fr = language === "fr";
  const header = fr ? ["Groupe", "Libellé", "Valeur", "Unité", "Nombre"] : ["Group", "Label", "Value", "Unit", "Count"];
  const compared = !!comparison?.length;
  const line = (row: Row, series: string) => [csvText(row.group), csvText(row.label), `"${row.value}"`, csvText(unit ?? ""), String(row.count), ...(compared ? [csvText(series)] : [])].join(",");
  const main = fr ? "Période principale" : "Main period";
  const other = fr ? "Période comparée" : "Comparison period";
  return [[...header, ...(compared ? [fr ? "Série" : "Series"] : [])].map(csvText).join(","), ...rows.map((row) => line(row, main)), ...(comparison ?? []).map((row) => line(row, other))].join("\r\n");
}
