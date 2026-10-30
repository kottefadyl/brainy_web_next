"use client";

import { useState, type FormEvent } from "react";
import { api, sensitivityApi } from "../lib/api";
import { defaultFieldSensitivity, effectiveFieldSensitivity, translateError, type Collection, type CollectionRole, type Language, type SensitivityLevel } from "../lib/brainy";
import "./sensitivity.css";

const levels: SensitivityLevel[] = ["ORDINARY", "PERSONAL", "SENSITIVE"];
const label = (level: SensitivityLevel, fr: boolean) => level === "ORDINARY" ? fr ? "Ordinaire" : "Ordinary" : level === "PERSONAL" ? fr ? "Personnel" : "Personal" : fr ? "Sensible" : "Sensitive";

export default function SensitivityPanel({ collection, userId, language, onChanged }: { collection: Collection; userId: string; language: Language; onChanged: (value: Collection) => void }) {
  const fr = language === "fr";
  const owner = collection.ownerId === userId;
  const [formatId, setFormatId] = useState(collection.formats[0]?.id ?? "");
  const format = collection.formats.find((item) => item.id === formatId) ?? collection.formats[0];
  const [minimum, setMinimum] = useState(collection.minAggregateSize ?? 5);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollectionRole>("READER");
  const [approved, setApproved] = useState<string[]>([]);
  const [sharedFieldIds, setSharedFieldIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const protectedFields = collection.formats.flatMap((item) => item.fields.filter((field) => effectiveFieldSensitivity(item, field) !== "ORDINARY").map((field) => ({ format: item, field })));
  const run = async (action: () => Promise<Collection>) => {
    setBusy(true); setError(""); setMessage("");
    try { onChanged(await action()); setMessage(fr ? "Réglages enregistrés." : "Settings saved."); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  };
  const share = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await api.addCollectionMember(collection.id, email.trim(), role, sharedFieldIds.length ? [...new Set([...sharedFieldIds, ...approved])] : [], approved);
      setEmail(""); setRole("READER"); setApproved([]); setSharedFieldIds([]);
      return result;
    });
  };
  return <section className="sensitivity-panel" aria-label={fr ? "Confidentialité" : "Privacy"}>
    <header><h1>{fr ? "Confidentialité" : "Privacy"}</h1><p>{fr ? "Choisissez la sensibilité des données et les limites des analyses." : "Choose data sensitivity and analysis limits."}</p></header>
    <p className="sensitivity-notice">{fr ? "Les champs personnels et sensibles sont masqués dans les partages et exclus des exports par défaut. Le seuil réduit certaines divulgations, sans anonymiser les données." : "Personal and sensitive fields are hidden in shares and excluded from exports by default. The threshold limits some disclosures; it does not anonymize data."}</p>
    <div className="sensitivity-box"><h2>{fr ? "Analyses sensibles" : "Sensitive analyses"}</h2><label>{fr ? "Observations minimum par groupe" : "Minimum observations per group"}<input type="number" min={2} max={100} step={1} value={minimum} disabled={!owner || busy} onChange={(event) => setMinimum(Number(event.target.value))} /></label><button type="button" disabled={!owner || busy || !Number.isInteger(minimum) || minimum < 2 || minimum > 100} onClick={() => void run(() => sensitivityApi.setMinimum(collection.id, minimum))}>{fr ? "Enregistrer le seuil" : "Save threshold"}</button><small>{fr ? "L’API refuse un groupe sous le seuil, les filtres, comparaisons et détails de sources pour une analyse sensible." : "The API rejects groups below the threshold, filters, comparisons and source details for sensitive analyses."}</small></div>
    <div className="sensitivity-box"><h2>{fr ? "Niveaux des données" : "Data levels"}</h2><label>{fr ? "Format de données" : "Data format"}<select value={format?.id ?? ""} onChange={(event) => setFormatId(event.target.value)}>{collection.formats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{format && <><label>{fr ? "Niveau du format de données" : "Data format level"}<select value={format.sensitivity ?? "ORDINARY"} disabled={!owner || busy} onChange={(event) => void run(() => sensitivityApi.setFormat(collection.id, format.id, event.target.value as SensitivityLevel, format.version ?? 1))}>{levels.map((level) => <option key={level} value={level}>{label(level, fr)}</option>)}</select></label><div className="sensitivity-fields">{format.fields.map((field) => <label key={field.id}>{field.name}<select value={defaultFieldSensitivity(field)} disabled={!owner || busy} onChange={(event) => void run(() => sensitivityApi.setField(collection.id, format.id, field.id, event.target.value as SensitivityLevel, format.version ?? 1))}>{levels.map((level) => <option key={level} value={level}>{label(level, fr)}</option>)}</select></label>)}</div><small>{fr ? "Le niveau le plus élevé entre le format de données et le champ s’applique." : "The higher level between the data format and field applies."}</small></>}</div>
    {owner && <details className="sensitivity-box"><summary>{fr ? "Accès des membres" : "Member access"}</summary><p>{fr ? "Un membre ne voit aucun champ personnel ou sensible sans choix explicite ici." : "A member sees no personal or sensitive field unless you select it here."}</p><div className="sensitivity-members">{collection.members?.map((member) => <button key={member.userId} type="button" onClick={() => { setEmail(member.email); setRole(member.role); setApproved(member.sensitiveFieldIds ?? []); setSharedFieldIds(member.sharedFieldIds ?? []); }}>{member.name || member.email} · {member.role}</button>)}</div><form onSubmit={share}><label>{fr ? "Adresse e-mail du membre" : "Member email"}<input type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setSharedFieldIds([]); setApproved([]); }} /></label><label>{fr ? "Rôle" : "Role"}<select value={role} onChange={(event) => setRole(event.target.value as CollectionRole)}><option value="READER">{fr ? "Lecture" : "Reader"}</option><option value="EDITOR">{fr ? "Édition" : "Editor"}</option></select></label><fieldset><legend>{fr ? "Champs protégés à partager explicitement" : "Protected fields to share explicitly"}</legend>{protectedFields.length ? protectedFields.map(({ format: item, field }) => <label className="sensitivity-check" key={field.id}><input type="checkbox" checked={approved.includes(field.id)} onChange={(event) => setApproved((current) => event.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id))} />{item.name} · {field.name}</label>) : <p>{fr ? "Aucun champ protégé." : "No protected fields."}</p>}</fieldset><button type="submit" disabled={busy || !email.trim()}>{fr ? "Enregistrer l’accès" : "Save access"}</button></form></details>}
    {message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
