"use client";

// T52: "Collaborators" page: personal link to send, list of collaborators, end of a collaboration.
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, MessageCircle, RefreshCw, Share2, ShieldCheck, UserMinus, Users } from "lucide-react";
import { translateError, type Language } from "../lib/brainy";
import { collaboratorsApi, inviteUrl, type Collaborator } from "../lib/collaborators";
import { Button } from "./components/ui/Button";
import "./collaborators.css";

function FacebookMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M14 8.5V6.8c0-.8.5-1.3 1.4-1.3H17V2.2C16.6 2.1 15.4 2 14.1 2 11.3 2 9.6 3.7 9.6 6.6v1.9H6.5V12h3.1v10H14V12h2.9l.5-3.5H14Z" /></svg>;
}

function Avatar({ person }: { person: Collaborator }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!person.hasPhoto) return;
    let alive = true;
    collaboratorsApi.photo(person.userId).then((value) => { if (alive) setPhoto(value); }).catch(() => {});
    return () => { alive = false; };
  }, [person.userId, person.hasPhoto]);
  return <span className="collab-avatar" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the API */}
    {photo ? <img src={photo} alt="" /> : person.name.charAt(0).toUpperCase()}
  </span>;
}

export default function CollaboratorsPage({ language, onClose, onChanged }: { language: Language; onClose: () => void; onChanged: () => void }) {
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;
  const [link, setLink] = useState("");
  const [people, setPeople] = useState<Collaborator[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [ending, setEnding] = useState<Collaborator | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([collaboratorsApi.inviteToken(), collaboratorsApi.list()])
      .then(([token, list]) => { setLink(inviteUrl(token)); setPeople(list); })
      .catch((cause) => setError(translateError(cause, language)));
  }, [language]);

  const message = L(`Let's collaborate on Brainy: ${link}`, `Collaborons sur Brainy : ${link}`);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setError(L("Copy failed: select the link and copy it by hand.", "La copie a échoué : sélectionnez le lien et copiez-le à la main.")); }
  }
  async function regenerate() {
    setBusy(true); setError("");
    try { setLink(inviteUrl(await collaboratorsApi.regenerate())); setConfirmRegenerate(false); setNotice(L("New link ready. The previous link no longer works.", "Nouveau lien prêt. L’ancien lien ne fonctionne plus.")); }
    catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); }
  }
  async function end(person: Collaborator) {
    setBusy(true); setError("");
    try { await collaboratorsApi.end(person.userId); setPeople((current) => current?.filter((item) => item.userId !== person.userId) ?? null); setEnding(null); setNotice(L(`Collaboration with ${person.name} ended.`, `Collaboration avec ${person.name} terminée.`)); onChanged(); }
    catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); }
  }

  return <section className="collab-page" aria-labelledby="collab-title">
    <button type="button" className="analysis-back" onClick={onClose}><ArrowLeft size={16} />{L("Back to collection", "Retour à la collection")}</button>
    <header className="collab-hero">
      <span className="collab-hero-icon"><Users size={26} aria-hidden="true" /></span>
      <div>
        <h1 id="collab-title">{L("Collaborators", "Collaborateurs")}</h1>
        <p>{L("Send your link to a colleague. Once they accept, you are collaborators: you can then share a collection with them, in read only or read and write.", "Envoyez votre lien à un collègue. Dès que ce lien est accepté, vous êtes collaborateurs : vous pouvez alors partager une collection avec cette personne, en lecture seule ou en lecture et écriture.")}</p>
      </div>
    </header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="collab-notice" role="status"><Check size={16} aria-hidden="true" />{notice}</p>}

    <section className="collab-card" aria-labelledby="collab-link-title">
      <h2 id="collab-link-title">{L("Your collaboration link", "Votre lien de collaboration")}</h2>
      <label className="collab-link-field"><span className="sr-only">{L("Collaboration link", "Lien de collaboration")}</span><input readOnly value={link || L("Loading…", "Chargement…")} onFocus={(event) => event.currentTarget.select()} /></label>
      <div className="collab-link-actions">
        <Button variant="primary" onClick={copy} disabled={!link}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? L("Copied", "Copié") : L("Copy link", "Copier le lien")}</Button>
        {canShare && <Button onClick={() => navigator.share({ title: "Brainy", text: message, url: link }).catch(() => {})} disabled={!link}><Share2 size={16} />{L("Share…", "Partager…")}</Button>}
        <a className="button button-secondary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" aria-disabled={!link}><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>
        <a className="button button-secondary" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" aria-disabled={!link}><FacebookMark />Facebook</a>
      </div>
      <p className="collab-help"><ShieldCheck size={16} aria-hidden="true" />{L("Being collaborators gives no access to your data. You choose, collection by collection, what each collaborator can see.", "Être collaborateurs ne donne accès à aucune de vos données. Vous choisissez, collection par collection, ce que chaque collaborateur peut voir.")}</p>
      {!confirmRegenerate
        ? <button type="button" className="collab-text-button" onClick={() => setConfirmRegenerate(true)}><RefreshCw size={15} aria-hidden="true" />{L("Create a new link", "Créer un nouveau lien")}</button>
        : <div className="collab-confirm" role="group" aria-label={L("Create a new link", "Créer un nouveau lien")}>
          <p>{L("The current link will stop working. People who already accepted stay your collaborators.", "Le lien actuel cessera de fonctionner. Les personnes qui l’ont déjà accepté restent vos collaborateurs.")}</p>
          <div><Button onClick={() => setConfirmRegenerate(false)}>{L("Cancel", "Annuler")}</Button><Button variant="primary" onClick={regenerate} disabled={busy}>{L("Create a new link", "Créer un nouveau lien")}</Button></div>
        </div>}
    </section>

    <section className="collab-card" aria-labelledby="collab-list-title">
      <h2 id="collab-list-title">{L("Your collaborators", "Vos collaborateurs")}{people && <span className="collab-count">{people.length}</span>}</h2>
      {people === null && !error && <p className="collab-help" role="status">{L("Loading…", "Chargement…")}</p>}
      {people?.length === 0 && <div className="collab-empty"><Users size={32} strokeWidth={1.5} aria-hidden="true" /><p>{L("No collaborator yet. Send your link to a colleague to get started.", "Aucun collaborateur pour l’instant. Envoyez votre lien à un collègue pour commencer.")}</p></div>}
      {!!people?.length && <ul className="collab-list">
        {people.map((person) => <li key={person.userId}>
          <Avatar person={person} />
          <div className="collab-person"><strong>{person.name}</strong><span>{person.email}</span><small>{L("Since", "Depuis le")} {new Date(person.since).toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</small></div>
          {ending?.userId === person.userId
            ? <div className="collab-confirm inline" role="group" aria-label={L("End collaboration", "Mettre fin à la collaboration")}>
              <p>{L(`Every collection shared between you and ${person.name} will be unshared, both ways.`, `Toutes les collections partagées entre vous et ${person.name} cesseront de l’être, dans les deux sens.`)}</p>
              <div><Button onClick={() => setEnding(null)}>{L("Cancel", "Annuler")}</Button><Button variant="danger" onClick={() => end(person)} disabled={busy}>{L("End", "Mettre fin")}</Button></div>
            </div>
            : <Button variant="subtle" className="collab-end" onClick={() => setEnding(person)} aria-label={L(`End collaboration with ${person.name}`, `Mettre fin à la collaboration avec ${person.name}`)}><UserMinus size={16} />{L("End", "Mettre fin")}</Button>}
        </li>)}
      </ul>}
    </section>
  </section>;
}
