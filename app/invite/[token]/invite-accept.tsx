"use client";

// T52: shows who sends the collaboration link, then lets the person accept it (after signing in if needed).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Users } from "lucide-react";
import { api } from "../../../lib/api";
import { translateError, type Language, type User } from "../../../lib/brainy";
import { collaboratorsApi, PENDING_INVITE_KEY, type CollaborationInvitePreview } from "../../../lib/collaborators";
import { BrainyLogo } from "../../components/brand/BrainyLogo";
import "../../collaborators.css";

type State = { kind: "loading" } | { kind: "invalid"; message: string } | { kind: "ready"; preview: CollaborationInvitePreview; user: User | null } | { kind: "accepted"; name: string };

function storedLanguage(): Language {
  try {
    const saved = window.localStorage.getItem("brainy_language");
    if (saved === "fr" || saved === "en") return saved;
  } catch { /* storage unavailable */ }
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export default function InviteAccept({ token }: { token: string }) {
  const [language, setLanguage] = useState<Language>("en");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [error, setError] = useState("");
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;

  useEffect(() => {
    const lang = storedLanguage();
    queueMicrotask(() => setLanguage(lang));
    document.documentElement.lang = lang;
    Promise.all([collaboratorsApi.preview(token), api.me().catch(() => null)])
      .then(([preview, user]) => setState({ kind: "ready", preview, user }))
      .catch((cause) => setState({ kind: "invalid", message: translateError(cause, lang) }));
  }, [token]);

  function signIn() {
    try { window.localStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* storage unavailable */ }
    router.push("/");
  }
  async function accept(name: string) {
    setBusy(true); setError("");
    try { await collaboratorsApi.accept(token); setState({ kind: "accepted", name }); }
    catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); }
  }

  return <main className="invite-page">
    <div className="invite-top"><span className="invite-brand"><BrainyLogo size={28} /><strong>Brainy</strong></span><button type="button" className="button button-subtle" onClick={() => setLanguage(fr ? "en" : "fr")}>{fr ? "English" : "Français"}</button></div>
    <section className="invite-card" aria-live="polite">
      <span className="collab-hero-icon"><Users size={28} aria-hidden="true" /></span>
      {state.kind === "loading" && <p role="status">{L("Loading…", "Chargement…")}</p>}
      {state.kind === "invalid" && <>
        <h1>{L("Link unavailable", "Lien indisponible")}</h1>
        <p>{state.message}</p>
        <Link className="button button-secondary" href="/">{L("Open Brainy", "Ouvrir Brainy")}</Link>
      </>}
      {state.kind === "ready" && (() => {
        const { preview, user } = state;
        if (preview.isSelf) return <>
          <h1>{L("This is your own link", "C’est votre propre lien")}</h1>
          <p>{L("Send it to a colleague: when they accept it, you become collaborators.", "Envoyez-le à un collègue : dès que ce lien est accepté, vous devenez collaborateurs.")}</p>
          <Link className="button button-primary" href="/">{L("Open Brainy", "Ouvrir Brainy")}</Link>
        </>;
        if (preview.alreadyCollaborator) return <>
          <h1>{L(`You already collaborate with ${preview.inviterName}`, `Vous collaborez déjà avec ${preview.inviterName}`)}</h1>
          <p>{L("Collections they share with you appear under “Shared with me”.", "Les collections partagées avec vous apparaissent sous « Partagées avec moi ».")}</p>
          <Link className="button button-primary" href="/">{L("Open Brainy", "Ouvrir Brainy")}</Link>
        </>;
        return <>
          <h1>{L(`${preview.inviterName} invites you to collaborate`, `${preview.inviterName} vous invite à collaborer`)}</h1>
          <p>{L("As collaborators, each of you can share collections with the other, in read only or read and write.", "En tant que collaborateurs, chacun de vous pourra partager des collections avec l’autre, en lecture seule ou en lecture et écriture.")}</p>
          <p className="collab-help"><ShieldCheck size={16} aria-hidden="true" />{L("Accepting gives nobody access to your data. Each person decides what they share.", "Accepter ne donne accès à aucune de vos données. Chacun décide de ce qu’il partage.")}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          {user
            ? <div className="invite-actions"><Link className="button button-secondary" href="/">{L("Not now", "Pas maintenant")}</Link><button type="button" className="button button-primary" disabled={busy} onClick={() => accept(preview.inviterName)}>{busy ? L("Accepting…", "Acceptation…") : L("Accept the collaboration", "Accepter la collaboration")}</button></div>
            : <div className="invite-actions"><button type="button" className="button button-primary" onClick={signIn}>{L("Sign in or create an account", "Se connecter ou créer un compte")}</button></div>}
          {user && <p className="invite-account">{L(`Signed in as ${user.email}`, `Connecté en tant que ${user.email}`)}</p>}
          {!user && <p className="invite-account">{L("You will come back here to accept once signed in.", "Vous reviendrez ici pour accepter une fois connecté.")}</p>}
        </>;
      })()}
      {state.kind === "accepted" && <>
        <span className="invite-success"><Check size={18} aria-hidden="true" />{L("Collaboration accepted", "Collaboration acceptée")}</span>
        <h1>{L(`You and ${state.name} are now collaborators`, `${state.name} et vous êtes maintenant collaborateurs`)}</h1>
        <p>{L("Collections they share with you will appear under “Shared with me”.", "Les collections partagées avec vous apparaîtront sous « Partagées avec moi ».")}</p>
        <Link className="button button-primary" href="/">{L("Open Brainy", "Ouvrir Brainy")}</Link>
      </>}
    </section>
  </main>;
}
