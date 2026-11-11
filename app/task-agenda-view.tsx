"use client";

// T49: Day and Calendar views of the Task list template. Each day of a repeating task has its own check.
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, PenLine, Plus, Repeat } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import { translateError, type Collection, type Entry, type Language } from "../lib/brainy";
import { addDays, addMonths, dayLabel as rawDayLabel, monthLabel as rawMonthLabel, monthStart, taskPlannerApi, weekdayNames, weekStart, type TaskAgenda, type TaskOccurrence } from "../lib/task-planner";
import { todayLocalIso } from "../lib/date-input";
import { Button } from "./components/ui/Button";
import "./task-agenda.css";

const capital = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);
const dayLabel = (...args: Parameters<typeof rawDayLabel>) => capital(rawDayLabel(...args));
const monthLabel = (...args: Parameters<typeof rawMonthLabel>) => capital(rawMonthLabel(...args));

type Props = { collection: Collection; mode: "TASK_DAY" | "TASK_CALENDAR"; language: Language; changeSignal: unknown; onEdit: (entry: Entry) => void; onNewTask: () => void };

export default function TaskAgendaView({ collection, mode, language, changeSignal, onEdit, onNewTask }: Props) {
  const fr = language === "fr";
  const today = todayLocalIso();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(monthStart(today));
  const [agenda, setAgenda] = useState<TaskAgenda | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const range = useMemo(() => {
    if (mode === "TASK_DAY") return { from: day, to: day };
    const from = weekStart(month);
    return { from, to: addDays(from, 41) };
  }, [mode, day, month]);
  const fetchAgenda = useCallback(() => taskPlannerApi.agenda(collection.id, range.from, range.to, today), [collection.id, range.from, range.to, today]);
  useEffect(() => {
    let active = true;
    fetchAgenda().then((value) => { if (active) { setAgenda(value); setError(""); } }).catch((cause) => { if (active) setError(translateError(cause, language)); });
    return () => { active = false; };
  }, [fetchAgenda, changeSignal, language]);

  async function toggle(item: TaskOccurrence) {
    const key = `${item.entryId}-${item.date}`;
    setBusy(key);
    setAgenda((current) => current && { ...current, occurrences: current.occurrences.map((occurrence) => occurrence === item ? { ...item, done: !item.done } : occurrence) });
    try { await taskPlannerApi.setDone(collection.id, item.entryId, item.date, !item.done); setAgenda(await fetchAgenda()); }
    catch (cause) { setError(translateError(cause, language)); setAgenda(await fetchAgenda().catch(() => agenda)); }
    finally { setBusy(""); }
  }

  const planner = collection.taskPlanner!;
  const format = collection.formats.find((item) => item.id === planner.formatId);
  const entryById = new Map((agenda?.entries ?? []).map((entry) => [entry.id, entry]));
  const value = (entry: Entry | undefined, fieldId: string) => entry?.values.find((item) => item.fieldId === fieldId)?.value ?? "";
  const title = (entry: Entry | undefined) => value(entry, format?.fields.find((field) => field.kind === "TITLE")?.id ?? "") || (fr ? "Tâche sans titre" : "Untitled task");
  const detail = (item: TaskOccurrence, entry: Entry | undefined) => {
    if (item.repeating) return value(entry, planner.repeatFieldId);
    const start = value(entry, planner.startFieldId), end = value(entry, planner.endFieldId);
    if (start && end && start !== end) return fr ? `Du ${dayLabel(start, language, "short")} au ${dayLabel(end, language, "short")}` : `${dayLabel(start, language, "short")} to ${dayLabel(end, language, "short")}`;
    if (end) return `${fr ? "Échéance" : "Due"} ${dayLabel(end, language, "short")}`;
    return "";
  };

  const dayList = (date: string) => {
    const items = (agenda?.occurrences ?? []).filter((item) => item.date === date);
    const groups: [string, TaskOccurrence[]][] = [
      [fr ? "En retard" : "Overdue", items.filter((item) => item.overdue && !item.done)],
      [fr ? "À faire" : "To do", items.filter((item) => !item.overdue && !item.done)],
      [fr ? "Faites" : "Done", items.filter((item) => item.done)],
    ];
    const done = items.filter((item) => item.done).length;
    return <section className="task-day" aria-label={dayLabel(date, language)}>
      {items.length > 0 && <div className="task-progress" role="status"><span>{fr ? `Faites : ${done} sur ${items.length}` : `Done: ${done} of ${items.length}`}</span><span className="task-progress-bar"><span style={{ width: `${Math.round(done / items.length * 100)}%` }} /></span></div>}
      {!items.length && <div className="task-empty"><CalendarDays size={28} aria-hidden="true" /><p>{fr ? "Rien de prévu ce jour." : "Nothing planned this day."}</p><Button onClick={onNewTask}><Plus size={16} />{fr ? "Nouvelle tâche" : "New task"}</Button></div>}
      {groups.filter(([, list]) => list.length).map(([label, list]) => <div key={label} className="task-group">
        <h4>{label} <span>{list.length}</span></h4>
        <ul>{list.map((item) => {
          const entry = entryById.get(item.entryId);
          const name = title(entry);
          const info = detail(item, entry);
          return <li key={`${item.entryId}-${item.date}`} className={`task-item ${item.done ? "is-done" : ""} ${item.overdue ? "is-overdue" : ""}`} style={formatColorStyle(format?.color ?? "#FFF5EB")}>
            <label className="task-check"><input type="checkbox" checked={item.done} disabled={busy === `${item.entryId}-${item.date}`} onChange={() => void toggle(item)} /><span className="task-text"><span className="task-name">{name}</span>{info && <span className="task-info">{item.repeating && <Repeat size={13} aria-hidden="true" />}{info}</span>}</span></label>
            {entry && <button type="button" className="task-edit" onClick={() => onEdit(entry)} aria-label={`${fr ? "Modifier" : "Edit"} : ${name}`}><PenLine size={16} /></button>}
          </li>;
        })}</ul>
      </div>)}
    </section>;
  };

  const header = mode === "TASK_DAY"
    ? <div className="task-nav">
        <button type="button" className="icon-button" onClick={() => setDay(addDays(day, -1))} aria-label={fr ? "Jour précédent" : "Previous day"}><ChevronLeft size={20} /></button>
        <h3>{dayLabel(day, language)}{day === today && <span className="task-today-badge">{fr ? "Aujourd’hui" : "Today"}</span>}</h3>
        <button type="button" className="icon-button" onClick={() => setDay(addDays(day, 1))} aria-label={fr ? "Jour suivant" : "Next day"}><ChevronRight size={20} /></button>
        <input type="date" aria-label={fr ? "Choisir un jour" : "Choose a day"} value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
        {day !== today && <Button variant="subtle" onClick={() => setDay(today)}>{fr ? "Aujourd’hui" : "Today"}</Button>}
        <Button className="task-new" onClick={onNewTask}><Plus size={16} />{fr ? "Nouvelle tâche" : "New task"}</Button>
      </div>
    : <div className="task-nav">
        <button type="button" className="icon-button" onClick={() => setMonth(addMonths(month, -1))} aria-label={fr ? "Mois précédent" : "Previous month"}><ChevronLeft size={20} /></button>
        <h3>{monthLabel(month, language)}</h3>
        <button type="button" className="icon-button" onClick={() => setMonth(addMonths(month, 1))} aria-label={fr ? "Mois suivant" : "Next month"}><ChevronRight size={20} /></button>
        {(month !== monthStart(today) || day !== today) && <Button variant="subtle" onClick={() => { setMonth(monthStart(today)); setDay(today); }}>{fr ? "Aujourd’hui" : "Today"}</Button>}
        <Button className="task-new" onClick={onNewTask}><Plus size={16} />{fr ? "Nouvelle tâche" : "New task"}</Button>
      </div>;

  return <div className="task-agenda">
    {header}
    {error && <p className="form-error" role="alert">{error} <button type="button" onClick={() => { setError(""); void fetchAgenda().then(setAgenda).catch(() => undefined); }}>{fr ? "Réessayer" : "Retry"}</button></p>}
    {!agenda && !error && <div className="task-skeleton" aria-busy="true"><span /><span /><span /></div>}
    {agenda && mode === "TASK_DAY" && dayList(day)}
    {agenda && mode === "TASK_CALENDAR" && <div className="task-calendar-layout">
      <div className="task-calendar" role="grid" aria-label={monthLabel(month, language)}>
        <div className="task-calendar-head" role="row">{weekdayNames(language).map((name) => <span key={name} role="columnheader">{name}</span>)}</div>
        {Array.from({ length: 6 }, (_, week) => <div key={week} className="task-calendar-row" role="row">{Array.from({ length: 7 }, (_, index) => {
          const date = addDays(range.from, week * 7 + index);
          const items = agenda.occurrences.filter((item) => item.date === date);
          const done = items.filter((item) => item.done).length;
          const outside = date.slice(0, 7) !== month.slice(0, 7);
          return <button key={date} type="button" role="gridcell" aria-selected={date === day} className={`task-cell ${outside ? "is-outside" : ""} ${date === today ? "is-today" : ""} ${date === day ? "is-selected" : ""}`} onClick={() => setDay(date)}
            aria-label={`${dayLabel(date, language)} : ${items.length ? (fr ? `${done} sur ${items.length} faites` : `${done} of ${items.length} done`) : (fr ? "aucune tâche" : "no task")}`}>
            <span className="task-cell-day">{Number(date.slice(8, 10))}</span>
            {items.length > 0 && <span className={`task-cell-count ${done === items.length ? "is-complete" : items.some((item) => item.overdue) ? "is-late" : ""}`}>{done}/{items.length}</span>}
            <span className="task-cell-items">{items.slice(0, 3).map((item) => <span key={item.entryId} className={item.done ? "is-done" : ""}>{title(entryById.get(item.entryId))}</span>)}{items.length > 3 && <span className="task-cell-more">+{items.length - 3}</span>}</span>
          </button>;
        })}</div>)}
      </div>
      <div className="task-calendar-day"><h3>{dayLabel(day, language)}</h3>{dayList(day)}</div>
    </div>}
  </div>;
}
