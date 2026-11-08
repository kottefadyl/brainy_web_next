import type { Language } from "./brainy";

/**
 * Calendar logic for Brainy's date fields. A date is the plain string
 * YYYY-MM-DD: every computation below goes through UTC so that no browser time
 * zone or daylight-saving change can move a stored day.
 */

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

function toUtc(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

const fromUtc = (date: Date) => `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function isoFromParts(year: number, month: number, day: number): string | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
  return fromUtc(toUtc(iso)) === iso ? iso : null;
}

/** Two-digit years stay within 30 years ahead, so "85" means 1985. */
function fullYear(text: string, now: Date): number {
  if (text.length !== 2) return Number(text);
  const century = Math.floor(now.getFullYear() / 100) * 100;
  const year = century + Number(text);
  return year > now.getFullYear() + 30 ? year - 100 : year;
}

/**
 * Reads a typed date: day first in French, month first in English, and
 * YYYY-MM-DD in both. `complete` refuses a date without a year, so a partial
 * value is not reported while the person is still typing.
 */
export function parseDateText(text: string, language: Language, complete = false, now = new Date()): string | null {
  const value = text.trim();
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(value);
  if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const compact = /^(\d{2})(\d{2})(\d{4}|\d{2})?$/.exec(value);
  const separated = /^(\d{1,2})[\s/.-]+(\d{1,2})(?:[\s/.-]+(\d{4}|\d{2}))?[\s/.-]*$/.exec(value);
  const match = compact ?? separated;
  if (!match || (complete && !match[3])) return null;
  const [day, month] = language === "fr" ? [match[1], match[2]] : [match[2], match[1]];
  return isoFromParts(match[3] ? fullYear(match[3], now) : now.getFullYear(), Number(month), Number(day));
}

export function formatDateText(iso: string, language: Language): string {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-");
  return language === "fr" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}

export const datePlaceholder = (language: Language) => (language === "fr" ? "JJ/MM/AAAA" : "MM/DD/YYYY");

/** Reads 14:30, 14h30, 1430, 9, 2:30 PM. The result is always HH:mm. */
export function parseTimeText(text: string, complete = false): string | null {
  const match = /^(\d{1,2})(?:\s*[:h.]\s*(\d{2})?)?\s*([ap])?\.?m?\.?$/i.exec(text.trim()) ?? /^(\d{1,2})(\d{2})\s*([ap])?\.?m?\.?$/i.exec(text.trim());
  if (!match || (complete && match[2] === undefined)) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === "p" ? 12 : 0);
  }
  return hours > 23 ? null : `${pad(hours)}:${pad(minutes)}`;
}

export function formatTimeText(time: string, language: Language): string {
  if (!/^\d{2}:\d{2}$/.test(time) || language === "fr") return time;
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${pad(minutes)} ${hours < 12 ? "AM" : "PM"}`;
}

export const timePlaceholder = (language: Language) => (language === "fr" ? "HH:MM" : "h:mm AM");

/** The person's current calendar day, not the UTC one. */
export function todayLocalIso(now = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Converts a stored instant to the wall-clock YYYY-MM-DDTHH:mm of this device. */
export function localInputFromIso(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return value.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${todayLocalIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Moves by whole months and keeps the day when it exists (31 Mar → 30 Apr). */
export function addMonths(iso: string, months: number): string {
  const date = toUtc(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(2000, date.getUTCMonth() + 1, 0));
  last.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, last.getUTCDate()));
  return fromUtc(date);
}

export function clampIso(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

const firstWeekday = (language: Language) => (language === "fr" ? 1 : 0);

export function weekBounds(iso: string, language: Language): [string, string] {
  const offset = (toUtc(iso).getUTCDay() - firstWeekday(language) + 7) % 7;
  return [addDays(iso, -offset), addDays(iso, 6 - offset)];
}

/** Six full weeks, so the calendar keeps its height from one month to the next. */
export function monthWeeks(iso: string, language: Language): string[][] {
  const [start] = weekBounds(`${iso.slice(0, 7)}-01`, language);
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)));
}

export function weekdayLabels(language: Language): { short: string; long: string }[] {
  // 2024-01-07 is a Sunday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = toUtc(addDays("2024-01-07", index + firstWeekday(language)));
    const label = (weekday: "short" | "long") => new Intl.DateTimeFormat(language, { weekday, timeZone: "UTC" }).format(date);
    return { short: label("short"), long: label("long") };
  });
}

export const monthTitle = (iso: string, language: Language) => new Intl.DateTimeFormat(language, { month: "long", year: "numeric", timeZone: "UTC" }).format(toUtc(iso));

export const fullDateLabel = (iso: string, language: Language) => new Intl.DateTimeFormat(language, { dateStyle: "full", timeZone: "UTC" }).format(toUtc(iso));
