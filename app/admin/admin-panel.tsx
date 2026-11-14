"use client";

// Brainy administration: every account with the storage it uses; block, unblock, erase its data or
// delete it. Only the administrator gets past the access check (the API checks again on every call).
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Ban, Database, HardDrive, LogOut, RefreshCw, Search, ShieldCheck, Trash2, UserRoundCheck, Users } from "lucide-react";
import { api } from "../../lib/api";
import { adminApi, formatBytes, type AdminOverview, type AdminUser } from "../../lib/admin";
import { translateError, type Language } from "../../lib/brainy";
import { BrainyLogo } from "../components/brand/BrainyLogo";
import Modal from "../components/ui/Modal";
import "./admin.css";

type Access = "loading" | "signed-out" | "refused" | "granted";
type Pending = { kind: "erase" | "delete"; user: AdminUser } | null;

function storedLanguage(): Language {
  try {
    const saved = window.localStorage.getItem("brainy_language");
    if (saved === "fr" || saved === "en") return saved;
  } catch { /* storage unavailable */ }
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export default function AdminPanel() {
  const [language, setLanguage] = useState<Language>("en");
  const fr = language === "fr";
  const [access, setAccess] = useState<Access>("loading");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      if (!(await adminApi.access())) {
        const signedIn = await api.me().then(() => true).catch(() => false);
        setAccess(signedIn ? "refused" : "signed-out");
        return;
      }
      setOverview(await adminApi.overview());
      setAccess("granted");
    } catch (cause) {
      setError(translateError(cause, storedLanguage()));
      setAccess((current) => current === "loading" ? "signed-out" : current);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { setLanguage(storedLanguage()); void load(); });
  }, [load]);

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 4000); return () => window.clearTimeout(timer); }, [notice]);

  const users = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    return (overview?.users ?? []).filter((user) => !query || user.name.toLocaleLowerCase().includes(query) || user.email.toLowerCase().includes(query));
  }, [overview, filter]);
  const largest = Math.max(1, ...(overview?.users ?? []).map((user) => user.totalBytes));
  const date = (value?: string | null) => value ? new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(value)) : "—";
  const number = (value: number) => new Intl.NumberFormat(language).format(value);

  async function toggleBlocked(user: AdminUser) {
    setBusy(user.id); setError("");
    try {
      const blocked = await adminApi.setBlocked(user.id, !user.blocked);
      setOverview((current) => current && { ...current, blockedCount: current.blockedCount + (blocked ? 1 : -1), users: current.users.map((item) => item.id === user.id ? { ...item, blocked } : item) });
      setNotice(blocked ? (fr ? `${user.name} est bloqué.` : `${user.name} is blocked.`) : (fr ? `${user.name} est débloqué.` : `${user.name} is unblocked.`));
    } catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(null); }
  }

  async function signOut() {
    await api.signOut().catch(() => undefined);
    setOverview(null);
    setAccess("signed-out");
  }

  return (
    <main className="admin-page">
      <header className="admin-top">
        <Link href="/" className="admin-brand"><BrainyLogo size={30} /><strong>Brainy</strong><span>{fr ? "Administration" : "Administration"}</span></Link>
        <div className="admin-top-actions">
          <button type="button" className="admin-button subtle" onClick={() => { const next = fr ? "en" : "fr"; setLanguage(next); try { window.localStorage.setItem("brainy_language", next); } catch { /* storage unavailable */ } }}>{fr ? "English" : "Français"}</button>
          {access === "granted" && <button type="button" className="admin-button subtle" onClick={signOut} aria-label={fr ? "Se déconnecter" : "Sign out"}><LogOut size={16} aria-hidden="true" /><span>{fr ? "Se déconnecter" : "Sign out"}</span></button>}
        </div>
      </header>

      {access === "loading" && <p className="admin-state" role="status">{fr ? "Chargement…" : "Loading…"}</p>}
      {access === "signed-out" && <AdminSignIn language={language} onSignedIn={load} initialError={error} />}
      {access === "refused" && (
        <section className="admin-card admin-state">
          <ShieldCheck size={28} aria-hidden="true" />
          <h1>{fr ? "Accès réservé" : "Restricted access"}</h1>
          <p>{fr ? "Ce compte n’a pas accès à l’administration de Brainy." : "This account has no access to Brainy’s administration."}</p>
          <div className="admin-row-actions"><button type="button" className="admin-button" onClick={signOut}>{fr ? "Changer de compte" : "Use another account"}</button><Link className="admin-button subtle" href="/">{fr ? "Retour à Brainy" : "Back to Brainy"}</Link></div>
        </section>
      )}

      {access === "granted" && overview && (
        <>
          <section className="admin-heading">
            <div>
              <h1>{fr ? "Utilisateurs de Brainy" : "Brainy users"}</h1>
              <p>{fr ? "Mis à jour le" : "Updated"} {new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(overview.generatedAt))}</p>
            </div>
            <button type="button" className="admin-button" onClick={load}><RefreshCw size={16} aria-hidden="true" />{fr ? "Actualiser" : "Refresh"}</button>
          </section>

          <section className="admin-stats" aria-label={fr ? "Résumé" : "Summary"}>
            <div className="admin-stat"><span className="admin-stat-icon blue"><Users size={18} aria-hidden="true" /></span><div><strong>{number(overview.userCount)}</strong><span>{fr ? "comptes" : "accounts"}</span></div></div>
            <div className="admin-stat"><span className="admin-stat-icon red"><Ban size={18} aria-hidden="true" /></span><div><strong>{number(overview.blockedCount)}</strong><span>{fr ? "bloqués" : "blocked"}</span></div></div>
            <div className="admin-stat"><span className="admin-stat-icon green"><HardDrive size={18} aria-hidden="true" /></span><div><strong>{formatBytes(overview.totalBytes, language)}</strong><span>{fr ? "stockage utilisé" : "storage used"}</span></div></div>
          </section>

          <label className="admin-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">{fr ? "Chercher un utilisateur" : "Find a user"}</span>
            <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={fr ? "Nom ou adresse e-mail" : "Name or email address"} />
          </label>

          {error && <p className="admin-error" role="alert">{error}</p>}
          {notice && <p className="admin-notice" role="status">{notice}</p>}

          <section className="admin-card admin-users" aria-label={fr ? "Comptes" : "Accounts"}>
            <div className="admin-users-head" aria-hidden="true">
              <span>{fr ? "Utilisateur" : "User"}</span><span>{fr ? "Activité" : "Activity"}</span><span>{fr ? "Données" : "Data"}</span><span>{fr ? "Stockage" : "Storage"}</span><span />
            </div>
            {users.length === 0 && <p className="admin-empty">{fr ? "Aucun utilisateur ne correspond." : "No user matches."}</p>}
            {users.map((user) => (
              <article key={user.id} className="admin-user" data-blocked={user.blocked || undefined}>
                <div className="admin-user-id">
                  <span className="admin-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{user.name}</strong>
                    <span className="admin-email">{user.email}</span>
                    <span className="admin-badges">
                      {user.admin && <span className="admin-badge blue">{fr ? "Administrateur" : "Administrator"}</span>}
                      {user.blocked && <span className="admin-badge red">{fr ? "Bloqué" : "Blocked"}</span>}
                      {user.googleSignIn && <span className="admin-badge">Google</span>}
                    </span>
                  </div>
                </div>
                <div className="admin-user-activity">
                  <span><span className="admin-label">{fr ? "Inscrit" : "Joined"}</span> {date(user.createdAt)}</span>
                  <span><span className="admin-label">{fr ? "Actif" : "Active"}</span> {date(user.lastActiveAt)}</span>
                </div>
                <div className="admin-user-data">
                  <span>{number(user.collections)} {fr ? (user.collections === 1 ? "collection" : "collections") : (user.collections === 1 ? "collection" : "collections")}</span>
                  <span>{number(user.entries)} {fr ? (user.entries === 1 ? "entrée" : "entrées") : (user.entries === 1 ? "entry" : "entries")}</span>
                </div>
                <div className="admin-user-storage">
                  <strong>{formatBytes(user.totalBytes, language)}</strong>
                  <span className="admin-bar" aria-hidden="true"><span style={{ width: `${Math.max(2, (user.totalBytes / largest) * 100)}%` }} /></span>
                  <span className="admin-label"><Database size={12} aria-hidden="true" /> {formatBytes(user.databaseBytes, language)}{user.fileBytes > 0 && <> · <HardDrive size={12} aria-hidden="true" /> {formatBytes(user.fileBytes, language)}</>}</span>
                </div>
                <div className="admin-row-actions">
                  {user.admin ? <span className="admin-label">{fr ? "Votre compte" : "Your account"}</span> : <>
                    <button type="button" className="admin-button" disabled={busy === user.id} onClick={() => toggleBlocked(user)}>
                      {user.blocked ? <><UserRoundCheck size={16} aria-hidden="true" />{fr ? "Débloquer" : "Unblock"}</> : <><Ban size={16} aria-hidden="true" />{fr ? "Bloquer" : "Block"}</>}
                    </button>
                    <button type="button" className="admin-button" disabled={busy === user.id} onClick={() => setPending({ kind: "erase", user })}><Database size={16} aria-hidden="true" />{fr ? "Effacer les données" : "Erase data"}</button>
                    <button type="button" className="admin-button danger" disabled={busy === user.id} onClick={() => setPending({ kind: "delete", user })}><Trash2 size={16} aria-hidden="true" />{fr ? "Supprimer le compte" : "Delete account"}</button>
                  </>}
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {pending && <ConfirmErase language={language} pending={pending} onClose={() => setPending(null)} onDone={(message) => { setPending(null); setNotice(message); void load(); }} />}
    </main>
  );
}

function AdminSignIn({ language, onSignedIn, initialError }: { language: Language; onSignedIn: () => void; initialError: string }) {
  const fr = language === "fr";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try { await api.login(email.trim(), password); onSignedIn(); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  }
  return (
    <section className="admin-card admin-signin">
      <ShieldCheck size={28} aria-hidden="true" />
      <h1>{fr ? "Administration de Brainy" : "Brainy administration"}</h1>
      <p>{fr ? "Réservé à l’administrateur. Connectez-vous avec votre compte Brainy." : "For the administrator only. Sign in with your Brainy account."}</p>
      <form onSubmit={submit}>
        <label>{fr ? "Adresse e-mail" : "Email address"}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>{fr ? "Mot de passe" : "Password"}<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button type="submit" className="admin-button primary" disabled={busy}>{busy ? (fr ? "Connexion…" : "Signing in…") : (fr ? "Se connecter" : "Sign in")}</button>
      </form>
      <p className="admin-hint">{fr ? "Compte Google : connectez-vous d’abord sur " : "Google account: sign in first on "}<Link href="/">{fr ? "la page d’accueil de Brainy" : "Brainy’s home page"}</Link>{fr ? ", puis revenez ici." : ", then come back here."}</p>
    </section>
  );
}

function ConfirmErase({ language, pending, onClose, onDone }: { language: Language; pending: NonNullable<Pending>; onClose: () => void; onDone: (message: string) => void }) {
  const fr = language === "fr";
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deleting = pending.kind === "delete";
  const matches = typed.trim().toLowerCase() === pending.user.email.toLowerCase();
  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!matches) return;
    setBusy(true); setError("");
    try {
      const result = await adminApi.erase(pending.user.id, typed, deleting);
      onDone(deleting
        ? (fr ? `Compte de ${pending.user.name} supprimé (${result.collections} collections, ${result.documents} éléments).` : `${pending.user.name}’s account deleted (${result.collections} collections, ${result.documents} items).`)
        : (fr ? `Données de ${pending.user.name} effacées (${result.collections} collections, ${result.documents} éléments). Le compte reste.` : `${pending.user.name}’s data erased (${result.collections} collections, ${result.documents} items). The account stays.`));
    } catch (cause) { setError(translateError(cause, language)); setBusy(false); }
  }
  return (
    <Modal title={deleting ? (fr ? "Supprimer le compte" : "Delete the account") : (fr ? "Effacer toutes les données" : "Erase all data")} closeLabel={fr ? "Fermer" : "Close"} onClose={busy ? () => undefined : onClose}>
      <form className="admin-confirm" onSubmit={confirm}>
        <p>{deleting
          ? (fr ? `Le compte de ${pending.user.name} et tout ce qu’il possède seront supprimés définitivement : collections, entrées, fichiers, liens, rappels, collaborations. Cette action est irréversible.` : `${pending.user.name}’s account and everything it owns will be permanently deleted: collections, entries, files, links, reminders, collaborations. This cannot be undone.`)
          : (fr ? `Tout ce que possède ${pending.user.name} sera supprimé définitivement : collections, entrées, fichiers, liens, rappels, collaborations et profil. Le compte reste, vide, avec son nom et son e-mail. Cette action est irréversible.` : `Everything ${pending.user.name} owns will be permanently deleted: collections, entries, files, links, reminders, collaborations and profile. The account stays, empty, with its name and email. This cannot be undone.`)}</p>
        <label>{fr ? "Pour confirmer, tapez l’adresse e-mail du compte :" : "To confirm, type the account’s email address:"} <strong>{pending.user.email}</strong>
          <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoFocus spellCheck={false} />
        </label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-row-actions">
          <button type="button" className="admin-button subtle" onClick={onClose} disabled={busy}>{fr ? "Annuler" : "Cancel"}</button>
          <button type="submit" className="admin-button danger solid" disabled={!matches || busy}>{busy ? (fr ? "Suppression…" : "Deleting…") : deleting ? (fr ? "Supprimer définitivement" : "Delete permanently") : (fr ? "Effacer définitivement" : "Erase permanently")}</button>
        </div>
        {!matches && typed && <p className="admin-hint">{fr ? "L’adresse ne correspond pas encore." : "The address does not match yet."}</p>}
      </form>
    </Modal>
  );
}
