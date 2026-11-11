// T49: Task list planner (Day and Calendar views). Dates are local days (YYYY-MM-DD).
import { entryFields, request } from "./api";
import type { Entry, Language } from "./brainy";

export type TaskPlanner = { formatId: string; doneFieldId: string; startFieldId: string; endFieldId: string; repeatFieldId: string; intervalFieldId: string; weekdaysFieldId: string; completedFieldId?: string | null };
export type TaskOccurrence = { entryId: string; date: string; done: boolean; overdue: boolean; repeating: boolean };
export type TaskAgenda = { occurrences: TaskOccurrence[]; entries: Entry[] };

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const taskPlannerApi = {
  async agenda(collectionId: string, from: string, to: string, today: string): Promise<TaskAgenda> {
    return (await request<{ taskAgenda: TaskAgenda }>(`query($id:String!,$from:String!,$to:String!,$today:String!,$tz:String!){taskAgenda(collectionId:$id,from:$from,to:$to,today:$today,timeZone:$tz){occurrences{entryId date done overdue repeating} entries{${entryFields} taskCompletions}}}`, { id: collectionId, from, to, today, tz: localTimeZone() })).taskAgenda;
  },
  async setDone(collectionId: string, entryId: string, date: string, done: boolean): Promise<void> {
    await request("mutation($id:String!,$entry:String!,$date:String!,$done:Boolean!,$tz:String!){setTaskDayDone(collectionId:$id,entryId:$entry,date:$date,done:$done,timeZone:$tz){id}}", { id: collectionId, entry: entryId, date, done, tz: localTimeZone() });
  },
};

const time = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day: string, count: number) => new Date(time(day) + count * 86_400_000).toISOString().slice(0, 10);
export const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
export const addMonths = (day: string, count: number) => { const date = new Date(time(monthStart(day))); date.setUTCMonth(date.getUTCMonth() + count); return date.toISOString().slice(0, 10); };
/** Monday of the week that contains the day. */
export const weekStart = (day: string) => addDays(day, -((new Date(time(day)).getUTCDay() + 6) % 7));

export function dayLabel(day: string, language: Language, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(language, style === "long" ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(time(day)));
}
export const monthLabel = (day: string, language: Language) => new Intl.DateTimeFormat(language, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(time(day)));
export const weekdayNames = (language: Language) => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 9 + index))));

const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const repeatChoices: Record<string, string[]> = { ONCE: ["Once", "Une seule fois"], EVERY_N_DAYS: ["Every N days", "Tous les N jours"], WEEKDAYS: ["Some weekdays", "Certains jours de la semaine"], DAILY: ["Every day", "Chaque jour"], WEEKLY: ["Every week", "Chaque semaine"], MONTHLY: ["Every month", "Chaque mois"] };
export function repeatKind(value: string | undefined): string {
  if (!value) return "ONCE";
  return Object.entries(repeatChoices).find(([, labels]) => labels.some((label) => fold(label) === fold(value)))?.[0] ?? "ONCE";
}
/** T49: in the task form, show only the fields that matter for the chosen Repeat. */
export function hiddenTaskFields(planner: TaskPlanner | null | undefined, formatId: string | undefined | null, values: Record<string, string>): Set<string> {
  if (!planner || formatId !== planner.formatId) return new Set();
  const repeat = repeatKind(values[planner.repeatFieldId]);
  const hidden = new Set<string>();
  if (repeat !== "EVERY_N_DAYS") hidden.add(planner.intervalFieldId);
  if (repeat !== "WEEKDAYS") hidden.add(planner.weekdaysFieldId);
  if (repeat !== "ONCE") { hidden.add(planner.doneFieldId); if (planner.completedFieldId) hidden.add(planner.completedFieldId); }
  return hidden;
}
