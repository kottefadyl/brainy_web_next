import type { Language } from "./brainy";

export type DayRange = { from: string; to: string };

const pad = (value: number) => String(value).padStart(2, "0");
export const isoDay = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Current week (Monday to Sunday), month and year, in the viewer's own calendar. */
export function periodRanges(today = new Date()): { week: DayRange; month: DayRange; year: DayRange } {
  const year = today.getFullYear(), month = today.getMonth(), day = today.getDate();
  const sinceMonday = (today.getDay() + 6) % 7;
  return {
    week: { from: isoDay(new Date(year, month, day - sinceMonday)), to: isoDay(new Date(year, month, day - sinceMonday + 6)) },
    month: { from: isoDay(new Date(year, month, 1)), to: isoDay(new Date(year, month + 1, 0)) },
    year: { from: `${year}-01-01`, to: `${year}-12-31` },
  };
}

/** Accepts "12 500", "12500,50" or "12500.50" and returns the stored form, or null when it is not an amount. */
export function parseAmount(text: string): string | null {
  const compact = text.replace(/\s/g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(compact) ? compact : null;
}

/** Groups thousands without going through a float, so a total stays exact. */
export function formatAmount(value: string, language: Language): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;
  const [groupMark, decimalMark] = language === "fr" ? [" ", ","] : [",", "."];
  const whole = match[2].replace(/\B(?=(\d{3})+$)/g, groupMark);
  return `${match[1]}${whole}${match[3] ? decimalMark + match[3] : ""}`;
}
