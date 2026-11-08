"use client";

import { LocalizedDateTimeInput } from "./components/ui/LocalizedDateInput";
import { useEffect, useState, type FormEvent } from "react";
import { api, type WorkflowNotification } from "../lib/api";
import { formatColors, translateError, type Collection, type CollectionFormat, type CollectionRole, type Entry, type EntryPage, type Language, type User, type WorkflowDefinition } from "../lib/brainy";
import { formatColorOptions } from "../lib/format-color-names";
import { AccessibleListbox } from "./components/ui/AccessibleListbox";
import "./workflow.css";

const copy = (language: Language, en: string, fr: string) => language === "fr" ? fr : en;
const dateTime = (value: string, language: Language) => new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const localInputDate = (value: string) => { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; };

function WorkflowConfigurator({ collection, format, language, onSaved }: { collection: Collection; format: CollectionFormat; language: Language; onSaved: (collection: Collection) => void }) {
  const choices = format.fields.filter((field) => field.kind === "SELECT" && (field.options?.length ?? 0) >= 2);
  const [fieldId, setFieldId] = useState(format.workflow?.stateFieldId ?? choices[0]?.id ?? "");
  const field = choices.find((item) => item.id === fieldId);
  const states = field?.options ?? [];
  const [initialState, setInitialState] = useState(format.workflow?.initialState ?? states[0] ?? "");
  const [transitions, setTransitions] = useState<WorkflowDefinition["transitions"]>(format.workflow?.transitions ?? (states.length > 1 ? states.slice(0, -1).map((state, index) => ({ from: state, to: states[index + 1], minimumRole: "EDITOR" as CollectionRole })) : []));
  const [requirements, setRequirements] = useState<WorkflowDefinition["requirements"]>(format.workflow?.requirements ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chooseField = (id: string) => {
    const next = choices.find((item) => item.id === id)?.options ?? [];
    setFieldId(id); setInitialState(next[0] ?? ""); setTransitions(next.slice(0, -1).map((state, index) => ({ from: state, to: next[index + 1], minimumRole: "EDITOR" }))); setRequirements([]);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { onSaved(await api.setWorkflow(collection.id, format.id, { stateFieldId: fieldId, initialState, transitions, requirements, expectedVersion: format.version ?? 1 })); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  };
  return <form className="workflow-box workflow-form" onSubmit={save}>
    <h3>{copy(language, "Configure state flow", "Configurer le flux d’états")}</h3>
    <p>{copy(language, "Use a single-choice field for the state. Ordinary entry editing cannot skip a transition.", "Utilisez un champ à choix unique pour l’état. La modification ordinaire d’une entrée ne peut pas contourner une transition.")}</p>
    {!choices.length ? <p role="status">{copy(language, "Add a single-choice field with at least two choices to this data format first.", "Ajoutez d’abord un champ à choix unique avec au moins deux choix à ce format de données.")}</p> : <>
      <label>{copy(language, "State field", "Champ d’état")}<select value={fieldId} onChange={(event) => chooseField(event.target.value)}>{choices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{copy(language, "Initial state", "État initial")}<select value={initialState} onChange={(event) => setInitialState(event.target.value)}>{states.map((state) => <option key={state}>{state}</option>)}</select></label>
      <div className="workflow-subhead"><strong>{copy(language, "Allowed transitions", "Transitions autorisées")}</strong><button type="button" onClick={() => setTransitions((current) => [...current, { from: states[0], to: states[1], minimumRole: "EDITOR" }])}>{copy(language, "Add transition", "Ajouter une transition")}</button></div>
      {transitions.map((item, index) => <div className="workflow-transition" key={index}>
        <label>{copy(language, "From", "De")}<select value={item.from} onChange={(event) => setTransitions((current) => current.map((row, i) => i === index ? { ...row, from: event.target.value } : row))}>{states.map((state) => <option key={state}>{state}</option>)}</select></label>
        <label>{copy(language, "To", "Vers")}<select value={item.to} onChange={(event) => setTransitions((current) => current.map((row, i) => i === index ? { ...row, to: event.target.value } : row))}>{states.map((state) => <option key={state}>{state}</option>)}</select></label>
        <label>{copy(language, "Minimum role", "Rôle requis")}<select value={item.minimumRole} onChange={(event) => setTransitions((current) => current.map((row, i) => i === index ? { ...row, minimumRole: event.target.value as CollectionRole } : row))}><option value="EDITOR">{copy(language, "Editor", "Éditeur")}</option><option value="OWNER">{copy(language, "Owner", "Propriétaire")}</option></select></label>
        <button type="button" aria-label={copy(language, "Remove transition", "Retirer la transition")} onClick={() => setTransitions((current) => current.filter((_, i) => i !== index))}>×</button>
      </div>)}
      <div className="workflow-subhead"><strong>{copy(language, "Fields required in each state", "Champs requis selon l’état")}</strong></div>
      {states.map((state) => <fieldset className="workflow-required" key={state}><legend>{state}</legend>{format.fields.filter((item) => item.id !== fieldId).map((item) => <label key={item.id}><input type="checkbox" checked={requirements.find((row) => row.state === state)?.fieldIds.includes(item.id) ?? false} onChange={(event) => setRequirements((current) => { const ids = current.find((row) => row.state === state)?.fieldIds ?? []; const next = event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id); return [...current.filter((row) => row.state !== state), ...(next.length ? [{ state, fieldIds: next }] : [])]; })} />{item.name}</label>)}</fieldset>)}
      {error && <p className="workflow-error" role="alert">{error}</p>}
      <button className="workflow-primary" type="submit" disabled={busy || !transitions.length}>{busy ? copy(language, "Saving…", "Enregistrement…") : copy(language, "Save state flow", "Enregistrer le flux d’états")}</button>
    </>}
  </form>;
}

function WorkflowEntry({ entry, format, collection, user, language, onSaved }: { entry: Entry; format: CollectionFormat; collection: Collection; user: User; language: Language; onSaved: (entry: Entry) => void }) {
  const flow = format.workflow!;
  const current = entry.values.find((item) => item.fieldId === flow.stateFieldId)?.value ?? flow.initialState;
  const role: CollectionRole = collection.ownerId === user.id ? "OWNER" : collection.members?.find((item) => item.userId === user.id)?.role ?? "READER";
  const transitions = flow.transitions.filter((item) => item.from === current && (role === "OWNER" || item.minimumRole === "EDITOR" && role === "EDITOR"));
  const [assignee, setAssignee] = useState(entry.workflow?.assigneeUserId ?? "");
  const [due, setDue] = useState(entry.workflow?.dueAt ? localInputDate(entry.workflow.dueAt) : "");
  const [minutes, setMinutes] = useState(entry.workflow?.reminderMinutesBefore ?? 60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = entry.values.find((item) => item.fieldId === format.fields.find((field) => field.kind === "TITLE")?.id)?.value || format.name;
  const people = [{ userId: collection.ownerId ?? user.id, name: copy(language, "Collection owner", "Propriétaire de la collection") }, ...(collection.members ?? []).filter((member) => member.role !== "READER" && (!member.sharedFieldIds?.length || format.fields.every((field) => member.sharedFieldIds!.includes(field.id)))).map((member) => ({ userId: member.userId, name: member.name || member.email }))];
  const action = async (run: () => Promise<Entry>) => { setBusy(true); setError(""); try { onSaved(await run()); } catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); } };
  return <details className="workflow-entry" open={false}>
    <summary><strong>{name}</strong><span>{current}</span>{entry.workflow?.dueAt && <time>{dateTime(entry.workflow.dueAt, language)}</time>}</summary>
    <div className="workflow-entry-body">
      {transitions.length > 0 && <div className="workflow-actions"><strong>{copy(language, "Change state", "Changer l’état")}</strong>{transitions.map((item) => <button key={item.to} type="button" disabled={busy} onClick={() => action(() => api.transitionWorkflowEntry(entry.id, item.to, entry.updatedAt))}>{item.to}</button>)}</div>}
      {role !== "READER" && <div className="workflow-assignment"><strong>{copy(language, "Assignment and due date", "Assignation et échéance")}</strong>
        <label>{copy(language, "Account", "Compte")}<select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="">{copy(language, "Unassigned", "Non assigné")}</option>{people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select></label>
        <label>{copy(language, "Due date (optional)", "Échéance (facultative)")}<LocalizedDateTimeInput language={language} value={due} onChange={setDue} /></label>
        <label>{copy(language, "Remind minutes before", "Rappeler combien de minutes avant")}<input type="number" min={0} max={43200} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
        <button type="button" disabled={busy} onClick={() => action(() => api.assignWorkflowEntry(entry.id, { assigneeUserId: assignee, dueAt: due ? new Date(due).toISOString() : undefined, reminderMinutesBefore: minutes, expectedUpdatedAt: entry.updatedAt }))}>{copy(language, "Save assignment", "Enregistrer l’assignation")}</button>
      </div>}
      <div className="workflow-history"><strong>{copy(language, "History", "Historique")}</strong>{entry.workflow?.history?.length ? <ol>{entry.workflow.history.map((event, index) => <li key={`${event.at}-${index}`}>{dateTime(event.at, language)} · {event.kind.startsWith("IMPORTED_") ? copy(language, "Imported", "Importé") + " · " : ""}{event.from} → {event.to} · {collection.members?.find((member) => member.userId === event.actorUserId)?.name ?? (event.actorUserId === collection.ownerId ? copy(language, "Owner", "Propriétaire") : event.actorUserId)}</li>)}</ol> : <p>{copy(language, "No transition yet.", "Aucune transition pour le moment.")}</p>}</div>
      {error && <p className="workflow-error" role="alert">{error}</p>}
    </div>
  </details>;
}

export default function WorkflowPanel({ collection, user, language, onClose, onCollectionChanged, onEntriesChanged }: { collection: Collection; user: User; language: Language; onClose: () => void; onCollectionChanged: (value: Collection) => void; onEntriesChanged: () => void }) {
  const [formatId, setFormatId] = useState(collection.formats.find((item) => item.workflow)?.id ?? collection.formats[0]?.id ?? "");
  const format = collection.formats.find((item) => item.id === formatId);
  const [template, setTemplate] = useState<"TASK" | "APPROVAL" | "CASE">("TASK");
  const [color, setColor] = useState<string>(formatColors.find((item) => !collection.formats.some((format) => format.color === item)) ?? formatColors[0]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<EntryPage>({ entries: [], hasMore: false });
  const [previous, setPrevious] = useState<(string | null)[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [notices, setNotices] = useState<WorkflowNotification[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const owner = collection.ownerId === user.id;
  useEffect(() => { const timer = window.setTimeout(() => setSearch(searchText.trim()), 300); return () => window.clearTimeout(timer); }, [searchText]);
  useEffect(() => { api.workflowNotifications().then(setNotices).catch(() => {}); }, []);
  useEffect(() => {
    if (!format?.workflow) return;
    let active = true;
    api.entriesPage(collection.id, { formatId: format.id, search: search || undefined }).then((result) => { if (active) { setPage(result); setAfter(null); setPrevious([]); setError(""); } }).catch((cause) => { if (active) setError(translateError(cause, language)); });
    return () => { active = false; };
  }, [collection.id, format?.id, format?.workflow, search, language]);
  const pageAt = async (cursor: string | null, backwards = false) => {
    if (!format) return; setBusy(true); setError("");
    try { const result = await api.entriesPage(collection.id, { formatId: format.id, search: search || undefined, after: cursor ?? undefined }); setPage(result); setAfter(cursor); setPrevious((current) => backwards ? current.slice(0, -1) : [...current, after]); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  };
  const addTemplate = async () => {
    setBusy(true); setError("");
    try { const updated = await api.addWorkflowTemplate(collection.id, template, color, language); onCollectionChanged(updated); setFormatId(updated.formats.at(-1)!.id); setColor(formatColors.find((item) => !updated.formats.some((format) => format.color === item)) ?? formatColors[0]); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  };
  const entrySaved = (saved: Entry) => { setPage((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === saved.id ? saved : entry) })); onEntriesChanged(); };
  return <section className="workflow-page analysis-page">
    <button type="button" className="analysis-back" onClick={onClose}>← {copy(language, "Collection", "Collection")}</button>
    <header><span className="section-overline">{copy(language, "Optional process", "Processus facultatif")}</span><h1>{copy(language, "States and approvals", "États et validations")}</h1><p>{copy(language, "Assign entries, set a due date and move through allowed states. Notes without a state flow stay simple.", "Assignez des entrées, fixez une échéance et suivez les états autorisés. Les notes sans flux restent simples.")}</p></header>
    {owner && <div className="workflow-box workflow-template"><h2>{copy(language, "Start with a model", "Commencer avec un modèle")}</h2><div className="workflow-inline"><label>{copy(language, "Model", "Modèle")}<select value={template} onChange={(event) => setTemplate(event.target.value as typeof template)}><option value="TASK">{copy(language, "Task", "Tâche")}</option><option value="APPROVAL">{copy(language, "Approval request", "Demande à valider")}</option><option value="CASE">{copy(language, "Tracked case", "Dossier suivi")}</option></select></label><AccessibleListbox label={copy(language, "Pastel color", "Couleur pastel")} value={color} options={formatColorOptions(language, collection.formats.map((format) => format.color))} onChange={setColor} /><button type="button" disabled={busy || collection.formats.length >= 24} onClick={addTemplate}>{copy(language, "Add data format", "Ajouter le format de données")}</button></div></div>}
    <label className="workflow-format-label">{copy(language, "Data format", "Format de données")}<select value={formatId} onChange={(event) => setFormatId(event.target.value)}>{collection.formats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {format && owner && <WorkflowConfigurator key={`${format.id}-${format.version}`} collection={collection} format={format} language={language} onSaved={onCollectionChanged} />}
    {format?.workflow && <div className="workflow-box"><div className="workflow-subhead"><h2>{copy(language, "Entries", "Entrées")}</h2><label>{copy(language, "Search", "Rechercher")}<input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label></div>
      {page.entries.length ? <div className="workflow-list">{page.entries.map((entry) => <WorkflowEntry key={`${entry.id}-${entry.updatedAt}`} entry={entry} format={format} collection={collection} user={user} language={language} onSaved={entrySaved} />)}</div> : <p>{copy(language, "No entries on this page.", "Aucune entrée sur cette page.")}</p>}
      {(previous.length > 0 || page.nextCursor) && <div className="workflow-pagination">{previous.length > 0 && <button disabled={busy} onClick={() => pageAt(previous.at(-1) ?? null, true)}>{copy(language, "Previous page", "Page précédente")}</button>}{page.nextCursor && <button disabled={busy} onClick={() => pageAt(page.nextCursor!, false)}>{copy(language, "Next page", "Page suivante")}</button>}</div>}
    </div>}
    {notices.some((item) => item.collectionId === collection.id) && <div className="workflow-box"><h2>{copy(language, "Assignments for you", "Assignations pour vous")}</h2>{notices.filter((item) => item.collectionId === collection.id).map((item) => <div className="workflow-notice" key={item.id}><span>{copy(language, "Assigned", "Assigné")} · {dateTime(item.createdAt, language)}</span>{!item.readAt && <button type="button" onClick={async () => { try { await api.readWorkflowNotification(item.id); setNotices((current) => current.map((notice) => notice.id === item.id ? { ...notice, readAt: new Date().toISOString() } : notice)); } catch (cause) { setError(translateError(cause, language)); } }}>{copy(language, "Mark read", "Marquer comme lu")}</button>}</div>)}</div>}
    {error && <p className="workflow-error" role="alert">{error}</p>}
  </section>;
}
