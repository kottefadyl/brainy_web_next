"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "./components/ui/Button";
import type { Collection, Language } from "../lib/brainy";
import "./book-view.css";
import "./starter-dialog.css";

/** T47: the Book template shows the three classic sections of a book. */
function BookTemplateArt({ fr }: { fr: boolean }) {
  const parts = fr ? [["I", "Pages liminaires", "Titre, dédicace, préface…"], ["II", "Corps de l’ouvrage", "Parties, chapitres, sections"], ["III", "Parties finales", "Annexes, glossaire, index"]] : [["I", "Front matter", "Title, dedication, preface…"], ["II", "Body", "Parts, chapters, sections"], ["III", "Back matter", "Appendices, glossary, index"]];
  return <span className="book-template-art" aria-hidden="true">{parts.map(([number, name, detail]) => <span key={number}><b>{number}</b><span><em>{name}</em><small>{detail}</small></span></span>)}</span>;
}

export default function StarterDialog({ language, onClose, onCreated, onPackages }: { language: Language; onClose: () => void; onCreated: (collection: Collection) => void; onPackages?: () => void }) {
  const fr = language === "fr";
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api.starterTemplates(language)
      .then((result) => { if (active) { setTemplates(result); setSelected(result[0]?.id ?? ""); setName((current) => current || (result[0]?.name ?? "")); } })
      .catch(() => { if (active) setLoadError(fr ? "Impossible de charger les modèles. Vérifiez votre connexion, puis réessayez." : "Could not load the templates. Check your connection, then try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language, attempt, fr]);
  function retry() { setLoadError(""); setLoading(true); setAttempt((value) => value + 1); }
  async function create() { if (!name.trim() || !selected) return; setBusy(true); setError(""); try { onCreated(await api.createFromTemplate(selected, name.trim(), language)); } catch (cause) { setError(String(cause)); } finally { setBusy(false); } }
  return <form className="starter-dialog" onSubmit={(event) => { event.preventDefault(); void create(); }}>
    <p className="modal-intro">{fr ? "Choisissez un point de départ. Les formats de données restent modifiables et la collection n’a pas de type permanent." : "Choose a starting point. Data formats stay editable and the collection has no permanent type."}</p>
    {onPackages && <Button variant="subtle" className="starter-packages" onClick={onPackages}><Package size={16} aria-hidden="true" /> {fr ? "Installer un paquet de domaine (fichier, lien ou paquet Brainy)…" : "Install a domain package (file, link or Brainy package)…"}</Button>}
    <label className="starter-name">{fr ? "Nom de la collection" : "Collection name"}<input value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} /></label>
    <fieldset className="starter-choices"><legend>{fr ? "Point de départ" : "Starting point"}</legend>{loading && <p className="starter-status" role="status">{fr ? "Chargement des modèles…" : "Loading templates…"}</p>}{loadError && <p className="starter-status form-error" role="alert">{loadError} <button type="button" className="starter-retry" onClick={retry}>{fr ? "Réessayer" : "Try again"}</button></p>}<div className="starter-grid">{templates.map((template) => <button type="button" aria-pressed={selected === template.id} className={selected === template.id ? "selected" : ""} key={template.id} onClick={() => { setName((current) => current === templates.find((item) => item.id === selected)?.name ? template.name : current); setSelected(template.id); }}><strong>{template.name}</strong><span>{template.description}</span>{template.id === "book" && <BookTemplateArt fr={fr} />}</button>)}</div></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" onClick={onClose}>{fr ? "Annuler" : "Cancel"}</button><button type="submit" disabled={busy || !selected || !name.trim()}>{busy ? fr ? "Création…" : "Creating…" : fr ? "Créer la collection" : "Create collection"}</button></div>
  </form>;
}
