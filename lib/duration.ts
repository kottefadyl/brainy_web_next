// Durations: one exact number of seconds, typed in a unit chosen on the field (same rules as the API's duration.ts).
// Months are left out: 28 to 31 days long, they cannot be added up exactly.
import type { Language } from "./brainy";

export const DURATION_UNITS = { s: 1, min: 60, h: 3600, d: 86400, w: 604800 } as const;
export type DurationUnit = keyof typeof DURATION_UNITS;
export const durationUnitCodes = Object.keys(DURATION_UNITS) as DurationUnit[];
const MAX = 999999 * 3600;
const order: DurationUnit[] = ["w", "d", "h", "min", "s"];
const words: [RegExp, DurationUnit][] = [
  [/^(w|wk|wks|week|weeks|sem|sems|semaine|semaines)$/, "w"],
  [/^(d|day|days|j|jr|jrs|jour|jours)$/, "d"],
  [/^(h|hr|hrs|hour|hours|heure|heures)$/, "h"],
  [/^(m|mn|min|mins|minute|minutes)$/, "min"],
  [/^(s|sec|secs|second|seconds|seconde|secondes)$/, "s"],
];

export const isDurationUnit = (unit?: string | null): unit is DurationUnit => !!unit && unit in DURATION_UNITS;

export function durationUnitLabel(unit: DurationUnit, language: Language): string {
  const labels: Record<DurationUnit, [string, string]> = { s: ["Seconds", "Secondes"], min: ["Minutes", "Minutes"], h: ["Hours", "Heures"], d: ["Days", "Jours"], w: ["Weeks", "Semaines"] };
  return labels[unit][language === "fr" ? 1 : 0];
}

/** Seconds in "45" (field unit; hours without one), "1:30", "2 h 30", "1d 4h", "1,5 h", "3 j", "2 sem"; null otherwise. */
export function parseDuration(text: string, unit?: string | null): number | null {
  const clean = text.trim().toLowerCase().replace(/,/g, ".");
  if (!clean || clean.length > 80) return null;
  const clock = /^(\d{1,6}):([0-5]\d)(?::([0-5]\d))?$/.exec(clean);
  let seconds: number;
  if (clock) seconds = Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0);
  else if (/^\d+(\.\d+)?$/.test(clean)) seconds = Number(clean) * DURATION_UNITS[isDurationUnit(unit) ? unit : "h"];
  else {
    const parts = clean.match(/\d+(?:\.\d+)?|[a-zéè]+/g);
    if (!parts || parts.join("") !== clean.replace(/\s+/g, "")) return null;
    seconds = 0;
    let last: DurationUnit | null = null;
    for (let index = 0; index < parts.length; index++) {
      const amount = Number(parts[index]);
      if (!Number.isFinite(amount)) return null;
      const word = parts[index + 1];
      let found: DurationUnit | undefined;
      if (word !== undefined && !/^\d/.test(word)) { found = words.find(([pattern]) => pattern.test(word))?.[1]; if (!found) return null; index++; }
      else if (last && last !== "s") found = order[order.indexOf(last) + 1];
      else return null;
      if (last && order.indexOf(found) <= order.indexOf(last)) return null;
      seconds += amount * DURATION_UNITS[found];
      last = found;
    }
  }
  seconds = Math.round(seconds);
  return Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX ? seconds : null;
}

/** "1 wk 2 d 3 h 30 min" / "1 sem 2 j 3 h 30 min"; at most the two largest parts when [short]. */
export function formatDuration(seconds: number, language: Language, short = false): string {
  const fr = language === "fr";
  const symbols: Record<DurationUnit, string> = { w: fr ? "sem" : "wk", d: fr ? "j" : "d", h: "h", min: "min", s: "s" };
  if (seconds <= 0) return "0 min";
  let rest = seconds;
  const parts: string[] = [];
  for (const key of order) { const count = Math.floor(rest / DURATION_UNITS[key]); if (count) { parts.push(`${count} ${symbols[key]}`); rest -= count * DURATION_UNITS[key]; } }
  return (short ? parts.slice(0, 2) : parts).join(" ");
}

/** Readable text of a stored duration; a field without a unit keeps its hours:minutes look. */
export function displayDuration(value: string, unit: string | null | undefined, language: Language): string {
  if (!isDurationUnit(unit)) return value;
  const seconds = parseDuration(value, unit);
  return seconds === null ? value : formatDuration(seconds, language);
}

/** Example shown in an empty duration input. */
export function durationPlaceholder(unit: string | null | undefined, language: Language): string {
  if (!isDurationUnit(unit)) return "1:30";
  const fr = language === "fr";
  const examples: Record<DurationUnit, string> = { s: fr ? "90 ou 1 min 30" : "90 or 1 min 30", min: fr ? "45 ou 1 h 30" : "45 or 1 h 30", h: fr ? "2 ou 1 h 30" : "2 or 1 h 30", d: fr ? "3 ou 1 j 4 h" : "3 or 1 d 4 h", w: fr ? "2 ou 1 sem 3 j" : "2 or 1 wk 3 d" };
  return examples[unit];
}
