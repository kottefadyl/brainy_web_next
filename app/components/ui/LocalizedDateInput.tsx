"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type RefObject } from "react";
import { CalendarDays } from "lucide-react";
import type { FieldKind, Language } from "../../../lib/brainy";
import { datePlaceholder, formatDateText, formatTimeText, localInputFromIso, parseDateText, parseTimeText, timePlaceholder } from "../../../lib/date-input";
import { DateCalendar } from "./DateCalendar";

type Shared = {
  language: Language; value: string; onChange: (value: string) => void;
  id?: string; required?: boolean; disabled?: boolean; autoFocus?: boolean; "aria-label"?: string;
};
type Issue = "" | "invalid" | "min" | "max";

/**
 * Keeps what the person is typing apart from the stored value. The parent only
 * receives a valid value, or "" while the text does not form one.
 */
function useTypedValue({ value, onChange, parse, format, check }: {
  value: string; onChange: (value: string) => void;
  parse: (text: string, complete: boolean) => string | null;
  format: (value: string) => string;
  check?: (value: string) => Issue;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [issue, setIssue] = useState<Issue>("");
  const emit = (next: string) => { if (next !== value) onChange(next); };
  const input = (text: string) => {
    setDraft(text); setIssue("");
    const parsed = parse(text, true);
    emit(parsed !== null && !check?.(parsed) ? parsed : "");
  };
  /** Accepts shorter forms such as 8/11; returns false when the text is refused. */
  const commit = () => {
    if (draft === null) return true;
    const text = draft.trim();
    const parsed = text ? parse(text, false) : "";
    const problem: Issue = parsed === null ? "invalid" : parsed ? check?.(parsed) ?? "" : "";
    if (problem) { setIssue(problem); emit(""); return false; }
    setDraft(null); setIssue(""); emit(parsed ?? "");
    return true;
  };
  const replace = (next: string) => { setDraft(null); setIssue(""); emit(next); };
  return { text: draft ?? format(value), issue, input, commit, replace };
}

/** A control nested in a <label> would otherwise add its own name to the field's. */
function useLabelText(input: RefObject<HTMLInputElement | null>, explicit?: string) {
  useLayoutEffect(() => {
    const element = input.current;
    const label = element?.closest("label");
    if (!element || !label || explicit) return;
    const name = Array.from(label.childNodes).filter((node) => !node.contains(element)).map((node) => node.textContent).join(" ").trim();
    if (name) element.setAttribute("aria-label", name);
  });
}

function useFieldMessage(input: RefObject<HTMLInputElement | null>, message: string) {
  useEffect(() => { input.current?.setCustomValidity(message); }, [input, message]);
}

export function LocalizedDateInput({ language, value, onChange, min, max, id, required, disabled, autoFocus, "aria-label": ariaLabel, problem = "" }: Shared & { min?: string; max?: string; problem?: string }) {
  const fr = language === "fr";
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const field = useTypedValue({
    value, onChange,
    parse: (text, complete) => parseDateText(text, language, complete),
    format: (iso) => formatDateText(iso, language),
    check: (iso) => (min && iso < min ? "min" : max && iso > max ? "max" : ""),
  });
  const placeholder = datePlaceholder(language);
  const issueMessage = field.issue === "invalid"
    ? fr ? `Date invalide. Format attendu : ${placeholder}.` : `Invalid date. Expected format: ${placeholder}.`
    : field.issue === "min" ? fr ? `Choisissez le ${formatDateText(min ?? "", language)} ou une date ultérieure.` : `Choose ${formatDateText(min ?? "", language)} or a later date.`
    : field.issue === "max" ? fr ? `Choisissez le ${formatDateText(max ?? "", language)} ou une date antérieure.` : `Choose ${formatDateText(max ?? "", language)} or an earlier date.`
    : "";
  const message = issueMessage || problem;
  useFieldMessage(input, message);
  useLabelText(input, ariaLabel);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && event.altKey) { event.preventDefault(); field.commit(); setOpen(true); }
    if (event.key === "Enter" && !field.commit()) event.preventDefault();
  };
  const close = (restoreFocus: boolean) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); };
  return <span ref={root} className="brainy-date">
    <span className="brainy-date-control">
      <input ref={input} id={id} type="text" autoComplete="off" spellCheck={false} placeholder={placeholder} required={required} disabled={disabled} autoFocus={autoFocus}
        aria-label={ariaLabel} aria-invalid={message ? true : undefined} aria-describedby={message ? errorId : undefined}
        value={field.text} onChange={(event) => field.input(event.target.value)} onBlur={field.commit} onKeyDown={onKeyDown} />
      <button ref={trigger} type="button" className="brainy-date-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
        aria-label={fr ? "Ouvrir le calendrier" : "Open calendar"} title={fr ? "Ouvrir le calendrier" : "Open calendar"} onClick={() => setOpen(!open)}>
        <CalendarDays size={18} aria-hidden="true" />
      </button>
    </span>
    {open && <DateCalendar language={language} value={value} min={min} max={max} anchor={root} onClose={close} onSelect={(iso) => { field.replace(iso); close(true); }} />}
    {message && <small id={errorId} className="brainy-date-error" role="alert">{message}</small>}
  </span>;
}

export function LocalizedTimeInput({ language, value, onChange, id, required, disabled, autoFocus, "aria-label": ariaLabel, problem = "" }: Shared & { problem?: string }) {
  const fr = language === "fr";
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const field = useTypedValue({ value, onChange, parse: parseTimeText, format: (time) => formatTimeText(time, language) });
  const message = (field.issue ? fr ? "Heure invalide. Exemple : 14:30." : "Invalid time. Example: 2:30 PM." : "") || problem;
  useFieldMessage(input, message);
  useLabelText(input, ariaLabel);
  return <span className="brainy-date brainy-time">
    <input ref={input} id={id} type="text" autoComplete="off" spellCheck={false} placeholder={timePlaceholder(language)} required={required} disabled={disabled} autoFocus={autoFocus}
      aria-label={ariaLabel} aria-invalid={message ? true : undefined} aria-describedby={message ? errorId : undefined}
      value={field.text} onChange={(event) => field.input(event.target.value)} onBlur={field.commit}
      onKeyDown={(event) => { if (event.key === "Enter" && !field.commit()) event.preventDefault(); }} />
    {message && <small id={errorId} className="brainy-date-error" role="alert">{message}</small>}
  </span>;
}

/** Same value as a native datetime-local field: YYYY-MM-DDTHH:mm on this device's clock. */
export function LocalizedDateTimeInput({ language, value, onChange, id, required, disabled, autoFocus, "aria-label": ariaLabel }: Shared) {
  const fr = language === "fr";
  const stored = localInputFromIso(value);
  const [partial, setPartial] = useState<{ date: string; time: string } | null>(null);
  const [left, setLeft] = useState(false);
  const date = partial?.date ?? stored.slice(0, 10);
  const time = partial?.time ?? stored.slice(11, 16);
  const update = (next: { date: string; time: string }) => {
    const complete = !!next.date && !!next.time;
    setPartial(complete || (!next.date && !next.time) ? null : next);
    onChange(complete ? `${next.date}T${next.time}` : "");
  };
  const onBlur = (event: FocusEvent<HTMLSpanElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setLeft(true); };
  return <span className="brainy-datetime" onBlur={onBlur} onFocus={() => setLeft(false)}>
    <LocalizedDateInput language={language} value={date} onChange={(next) => update({ date: next, time })} id={id} required={required} disabled={disabled} autoFocus={autoFocus} aria-label={ariaLabel}
      problem={left && time && !date ? fr ? "Indiquez aussi la date." : "Enter the date as well." : ""} />
    <LocalizedTimeInput language={language} value={time} onChange={(next) => update({ date, time: next })} required={required} disabled={disabled} aria-label={fr ? "Heure" : "Time"}
      problem={left && date && !time ? fr ? "Indiquez aussi l’heure." : "Enter the time as well." : ""} />
  </span>;
}

export type TemporalKind = Extract<FieldKind, "DATE" | "DATETIME" | "TIME">;
export const isTemporalKind = (kind: FieldKind): kind is TemporalKind => kind === "DATE" || kind === "DATETIME" || kind === "TIME";

export function TemporalFieldInput({ kind, ...props }: Shared & { kind: TemporalKind }) {
  if (kind === "DATE") return <LocalizedDateInput {...props} />;
  if (kind === "TIME") return <LocalizedTimeInput {...props} />;
  return <LocalizedDateTimeInput {...props} />;
}
