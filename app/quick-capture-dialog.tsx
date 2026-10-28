"use client";

import { useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Collection, CollectionFormat, Entry, Language } from "../lib/brainy";

type Props = { collections: Collection[]; userId: string; language: Language; incoming?: { title?: string; text?: string; url?: string }; onClose: () => void; onSaved: (collectionId: string, entry: Entry) => void; onOpen: (collectionId: string, entry: Entry) => void };
const key = (userId: string) => `brainy:capture:${userId}`;
const looksLikeUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

export default function QuickCaptureDialog({ collections, userId, language, incoming, onClose, onSaved, onOpen }: Props) {
  const fr = language === "fr";
  const saved = typeof window === "undefined" ? "" : localStorage.getItem(key(userId)) ?? "";
  const [collectionId, setCollectionId] = useState(() => collections.some((item) => item.id === saved) ? saved : collections[0]?.id ?? "");
  const activeCollectionId = collections.some((item) => item.id === collectionId) ? collectionId : collections[0]?.id ?? "";
  const collection = collections.find((item) => item.id === activeCollectionId);
  const candidates = useMemo(() => collection?.formats.filter((format) => !format.objectModel && format.fields.some((field) => ["LINK", "TEXT", "LONG_TEXT", "TITLE", "ATTACHMENT"].includes(field.kind))) ?? [], [collection]);
  const [formatId, setFormatId] = useState("");
  const format = candidates.find((item) => item.id === formatId) ?? candidates[0];
  const [title, setTitle] = useState(incoming?.title ?? "");
  const [content, setContent] = useState(incoming?.url ?? incoming?.text ?? "");
  const [note, setNote] = useState(incoming?.url && incoming.text && incoming.text !== incoming.url ? incoming.text : "");
  const [file, setFile] = useState<File | null>(null);
  const [duplicate, setDuplicate] = useState<Entry[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const linkField = format?.fields.find((field) => field.kind === "LINK");
  const contentField = looksLikeUrl(content) && linkField ? linkField : format?.fields.find((field) => ["LONG_TEXT", "TEXT", "TITLE"].includes(field.kind));
  const noteField = format?.fields.find((field) => field.kind === "LONG_TEXT" && field.id !== contentField?.id) ?? format?.fields.find((field) => field.kind === "TEXT" && field.id !== contentField?.id && field.name.toLocaleLowerCase() !== "source");
  const titleField = format?.fields.find((field) => field.kind === "TITLE" && field.id !== contentField?.id);
  const attachmentField = format?.fields.find((field) => field.kind === "ATTACHMENT");
  const sourceField = format?.fields.find((field) => field.kind === "TEXT" && field.name.toLocaleLowerCase() === "source" && field.id !== contentField?.id && field.id !== noteField?.id);
  const clearDuplicate = () => { setDuplicate([]); setChecked(false); };
  const chooseCollection = (id: string) => { setCollectionId(id); setFormatId(""); clearDuplicate(); localStorage.setItem(key(userId), id); };
  const paste = async () => { try { setContent(await navigator.clipboard.readText()); clearDuplicate(); } catch { setError(fr ? "Presse-papiers indisponible. Collez le contenu ici." : "Clipboard unavailable. Paste the content here."); } };
  const values = async () => {
    if (!format) throw new Error(fr ? "Choisissez un format de données." : "Choose a data format.");
    const result: { fieldId: string; value: string; attachmentBase64?: string; attachmentMimeType?: string }[] = [];
    if (content.trim() && contentField) result.push({ fieldId: contentField.id, value: content.trim() });
    if (title.trim() && titleField) result.push({ fieldId: titleField.id, value: title.trim() });
    if (note.trim() && noteField) result.push({ fieldId: noteField.id, value: note.trim() });
    if (incoming && sourceField) result.push({ fieldId: sourceField.id, value: "Browser share" });
    if (file) {
      if (!attachmentField || file.size > 2 * 1024 * 1024) throw new Error(fr ? "Choisissez un champ pièce jointe et un fichier de 2 Mio maximum." : "Choose an attachment field and a file up to 2 MiB.");
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file); });
      result.push({ fieldId: attachmentField.id, value: file.name, attachmentBase64: base64, attachmentMimeType: file.type || "application/octet-stream" });
    }
    if (!result.length) throw new Error(fr ? "Ajoutez un lien, du texte ou un fichier." : "Add a link, text or file.");
    return result;
  };
  const save = async (allowDuplicate = false) => {
    if (!collection || !format) return;
    setBusy(true); setError("");
    try {
      const payload = await values();
      if (linkField && contentField?.id === linkField.id && !checked && !allowDuplicate) {
        const matches = await api.duplicateLinks(collection.id, format.id, linkField.id, content.trim());
        setDuplicate(matches); setChecked(true);
        if (matches.length) return;
      }
      const entry = await api.saveEntry(collection.id, payload, undefined, format.id);
      onSaved(collection.id, entry);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  return <div className="quick-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quick-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-title">
      <header><h2 id="quick-title">{fr ? "Capture rapide" : "Quick capture"}</h2><button type="button" onClick={onClose} aria-label={fr ? "Fermer" : "Close"}>×</button></header>
      <p>{fr ? "Le contenu reste ici si l'enregistrement échoue." : "Your content stays here if saving fails."}</p>
      <label>{fr ? "Collection" : "Collection"}<select value={activeCollectionId} onChange={(event) => chooseCollection(event.target.value)}>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{fr ? "Format de données" : "Data format"}<select value={format?.id ?? ""} onChange={(event) => { setFormatId(event.target.value); clearDuplicate(); }}>{candidates.map((item: CollectionFormat) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{fr ? "Titre" : "Title"}<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>{fr ? "Lien ou texte" : "Link or text"}<textarea value={content} onChange={(event) => { setContent(event.target.value); clearDuplicate(); }} rows={3} /></label>
      <button type="button" className="quick-subtle" onClick={paste}>{fr ? "Coller depuis le presse-papiers" : "Paste from clipboard"}</button>
      <label>{fr ? "Note de contexte" : "Context note"}<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} /></label>
      {attachmentField && <label>{fr ? "Image ou fichier" : "Image or file"}<input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>}
      {note && !noteField && <p role="alert">{fr ? "Ce format de données n'a pas de champ pour la note. Ajoutez-en un avant de sauvegarder." : "This data format has no note field. Add one before saving."}</p>}
      {duplicate.length > 0 && <div role="alert"><p>{fr ? "Ce lien existe déjà." : "This link already exists."}</p>{duplicate.map((entry) => <button key={entry.id} type="button" onClick={() => onOpen(activeCollectionId, entry)}>{fr ? "Ouvrir l'entrée existante" : "Open existing entry"}</button>)}<button type="button" onClick={() => void save(true)}>{fr ? "Ajouter quand même" : "Add anyway"}</button></div>}
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>{fr ? "Annuler" : "Cancel"}</button><button type="button" disabled={busy || !collection || !format || !!note && !noteField} onClick={() => void save()}>{busy ? fr ? "Enregistrement…" : "Saving…" : fr ? "Enregistrer" : "Save"}</button></footer>
    </section>
  </div>;
}
