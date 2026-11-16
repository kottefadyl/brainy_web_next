"use client";

// Durations in the task views: planned time ("Estimated duration") and time actually spent ("Time spent"),
// per task and per day, so a day's load is visible before starting it.
import { useState } from "react";
import { Hourglass, Timer } from "lucide-react";
import { translateError, type Collection, type Entry, type Language } from "../lib/brainy";
import { formatDuration, parseDuration } from "../lib/duration";
import { taskPlannerApi } from "../lib/task-planner";
import { Button } from "./components/ui/Button";

export type TaskDurations = { estimate: (entry: Entry | undefined) => number | null; spent: (entry: Entry | undefined) => number | null };

/** Reads the estimate and the time spent of a task, in seconds (null when empty or not set up). */
export function taskDurations(collection: Collection): TaskDurations {
  const planner = collection.taskPlanner;
  const format = collection.formats.find((item) => item.id === planner?.formatId);
  const read = (fieldId?: string | null) => (entry: Entry | undefined) => {
    const field = format?.fields.find((item) => item.id === fieldId);
    const value = entry?.values.find((item) => item.fieldId === fieldId)?.value;
    return field && value ? parseDuration(value, field.unit) : null;
  };
  return { estimate: read(planner?.estimateFieldId), spent: read(planner?.spentFieldId) };
}

/** "⏱ 45 min" and, once work started, "30 min spent of 45 min" with a bar (amber when over the estimate). */
export function TaskTime({ estimate, spent, language }: { estimate: number | null; spent: number | null; language: Language }) {
  const fr = language === "fr";
  if (estimate === null && spent === null) return null;
  const over = estimate !== null && spent !== null && spent > estimate;
  const label = spent !== null
    ? estimate !== null ? (fr ? `${formatDuration(spent, language, true)} passées sur ${formatDuration(estimate, language, true)}` : `${formatDuration(spent, language, true)} spent of ${formatDuration(estimate, language, true)}`) : (fr ? `${formatDuration(spent, language, true)} passées` : `${formatDuration(spent, language, true)} spent`)
    : formatDuration(estimate!, language, true);
  return <span className={`task-time${over ? " is-over" : ""}`} title={over ? (fr ? "Plus long que prévu" : "Longer than planned") : undefined}>
    {spent !== null ? <Hourglass size={13} aria-hidden="true" /> : <Timer size={13} aria-hidden="true" />}
    <span>{label}</span>
    {spent !== null && estimate ? <span className="task-time-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round(spent / estimate * 100))}%` }} /></span> : null}
  </span>;
}

/** Day summary: planned, still to do and spent, from the tasks of that day. */
export function DayTime({ planned, remaining, spent, language }: { planned: number; remaining: number; spent: number; language: Language }) {
  const fr = language === "fr";
  if (!planned && !spent) return null;
  return <p className="task-day-time" role="status">
    <Timer size={15} aria-hidden="true" />
    {planned > 0 && <span><strong>{formatDuration(planned, language, true)}</strong> {fr ? "prévues" : "planned"}</span>}
    {planned > 0 && <span><strong>{formatDuration(remaining, language, true)}</strong> {fr ? "restantes" : "left"}</span>}
    {spent > 0 && <span><strong>{formatDuration(spent, language, true)}</strong> {fr ? "passées" : "spent"}</span>}
  </p>;
}

/** Task lists made before durations existed: the owner adds the two fields in one click. */
export function AddTaskDurations({ collection, language, onCollectionChanged }: { collection: Collection; language: Language; onCollectionChanged?: (collection: Collection) => void }) {
  const fr = language === "fr";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!collection.taskPlanner || collection.taskPlanner.estimateFieldId || collection.sharedBy || !onCollectionChanged) return null;
  return <div className="task-durations-offer">
    <Timer size={18} aria-hidden="true" />
    <p>{fr ? "Ajoutez « Durée estimée » et « Temps passé » à vos tâches pour voir le temps prévu de chaque jour." : "Add “Estimated duration” and “Time spent” to your tasks to see how much time each day needs."}</p>
    <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { onCollectionChanged(await taskPlannerApi.addDurationFields(collection.id, language)); } catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); } }}>{fr ? "Ajouter les durées" : "Add durations"}</Button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
