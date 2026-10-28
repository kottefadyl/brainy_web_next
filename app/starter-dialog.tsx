"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Collection, Language } from "../lib/brainy";

export default function StarterDialog({ language, onClose, onCreated }: { language: Language; onClose: () => void; onCreated: (collection: Collection) => void }) {
  const fr = language === "fr";
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; api.starterTemplates(language).then((result) => { if (active) { setTemplates(result); setSelected(result[0]?.id ?? ""); setName(result[0]?.name ?? ""); } }).catch((cause) => { if (active) setError(String(cause)); }); return () => { active = false; }; }, [language]);
  async function create() { if (!name.trim() || !selected) return; setBusy(true); setError(""); try { onCreated(await api.createFromTemplate(selected, name.trim(), language)); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } }
  return <form className="starter-dialog" onSubmit={(event) => { event.preventDefault(); void create(); }}>
    <p className="modal-intro">{fr ? "Choisissez un point de départ. Les formats de données restent modifiables et la collection n’a pas de type permanent." : "Choose a starting point. Data formats stay editable and the collection has no permanent type."}</p>
    <label className="starter-name">{fr ? "Nom de la collection" : "Collection name"}<input value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} /></label>
    <fieldset className="starter-choices"><legend>{fr ? "Point de départ" : "Starting point"}</legend><div className="starter-grid">{templates.map((template) => <button type="button" aria-pressed={selected === template.id} className={selected === template.id ? "selected" : ""} key={template.id} onClick={() => { setName((current) => current === templates.find((item) => item.id === selected)?.name ? template.name : current); setSelected(template.id); }}><strong>{template.name}</strong><span>{template.description}</span></button>)}</div></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" onClick={onClose}>{fr ? "Annuler" : "Cancel"}</button><button type="submit" disabled={busy || !selected || !name.trim()}>{busy ? fr ? "Création…" : "Creating…" : fr ? "Créer la collection" : "Create collection"}</button></div>
  </form>;
}
