"use client";

// Duration field: typed in the unit chosen on the field ("45" minutes) or with words ("1 h 30", "2 j"),
// with the understood value shown right away. Months are not accepted: their length varies.
import type { Language } from "../lib/brainy";
import { durationPlaceholder, durationUnitCodes, durationUnitLabel, formatDuration, isDurationUnit, parseDuration } from "../lib/duration";

export function DurationFieldInput({ unit, value, language, autoFocus, onChange }: { unit?: string | null; value: string; language: Language; autoFocus?: boolean; onChange: (value: string) => void }) {
  const fr = language === "fr";
  const seconds = value.trim() ? parseDuration(value, unit) : null;
  const hint = !value.trim() ? (isDurationUnit(unit) ? (fr ? `En ${durationUnitLabel(unit, language).toLocaleLowerCase("fr")}, ou avec des mots : 1 h 30, 2 j` : `In ${durationUnitLabel(unit, language).toLocaleLowerCase("en")}, or with words: 1 h 30, 2 d`) : (fr ? "Heures:minutes, ou avec des mots : 1 h 30" : "Hours:minutes, or with words: 1 h 30"))
    : seconds === null ? (fr ? "Durée non comprise (les mois ne sont pas acceptés)" : "Duration not understood (months are not accepted)")
    : `= ${formatDuration(seconds, language)}`;
  return <span className="duration-input">
    <input type="text" inputMode="text" autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} maxLength={80} placeholder={durationPlaceholder(unit, language)} aria-invalid={value.trim() !== "" && seconds === null} />
    <small className={seconds === null && value.trim() ? "duration-hint invalid" : "duration-hint"} aria-live="polite">{hint}</small>
  </span>;
}

/** Unit choice of a duration field in the data format editor; it can change at any time (values stay exact). */
export function DurationUnitSelect({ value, language, onChange, label }: { value: string; language: Language; onChange: (unit: string) => void; label: string }) {
  return <label className="input-label field-unit">{label}
    <select value={isDurationUnit(value) ? value : ""} onChange={(event) => onChange(event.target.value)}>
      <option value="">{language === "fr" ? "Heures:minutes (1:30)" : "Hours:minutes (1:30)"}</option>
      {durationUnitCodes.map((code) => <option key={code} value={code}>{durationUnitLabel(code, language)}</option>)}
    </select>
  </label>;
}
