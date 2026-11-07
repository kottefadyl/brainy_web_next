"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, Link2, Package, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { domainPackageApi, type DomainPackageInstall, type DomainPackagePreview, type DomainPackageSummary } from "../lib/api";
import type { Collection, Language } from "../lib/brainy";
import { AccessibleListbox } from "./components/ui/AccessibleListbox";
import { Button } from "./components/ui/Button";
import Modal from "./components/ui/Modal";
import { Tabs } from "./components/ui/Tabs";
import "./domain-packages.css";

type Props = { collections: Collection[]; current?: Collection | null; userId: string; userName: string; language: Language; onClose: () => void; onInstalled: (collectionId: string) => void };
type Tab = "library" | "import" | "manage";
const NEW = "__new__";
const slug = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const message = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);

export default function DomainPackagesDialog({ collections, current, userId, userName, language, onClose, onInstalled }: Props) {
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;
  const owned = collections.filter((item) => !item.ownerId || item.ownerId === userId);
  const [tab, setTab] = useState<Tab>("library");
  const [pilots, setPilots] = useState<DomainPackageSummary[] | null>(null);
  const [source, setSource] = useState<{ json: string; label: string } | null>(null);
  const [target, setTarget] = useState(NEW);
  const [collectionName, setCollectionName] = useState("");
  const [preview, setPreview] = useState<DomainPackagePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    let active = true;
    domainPackageApi.pilots(language).then((items) => { if (active) setPilots(items); }).catch((cause) => { if (active) { setPilots([]); setError(message(cause)); } });
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    if (!source) return;
    let active = true;
    // Preview follows the chosen package, target and language; no state is changed until the user confirms.
    domainPackageApi.preview(source.json, language, target === NEW ? undefined : target)
      .then((result) => { if (active) { setPreview(result); setError(""); setCollectionName((name) => name || result.name); } })
      .catch((cause) => { if (active) { setPreview(null); setError(message(cause)); } })
      .finally(() => { if (active) setPreviewing(false); });
    return () => { active = false; };
  }, [source, target, language]);

  function choose(json: string, label: string) { setError(""); setPreview(null); setCollectionName(""); setPreviewing(true); setSource({ json, label }); }

  async function fromFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 512 * 1024) { setError(L("This file is larger than 512 KiB.", "Ce fichier dépasse 512 Kio.")); return; }
    choose(await file.text(), file.name);
  }

  async function fromLink() {
    setError("");
    let url: URL;
    try { url = new URL(link.trim()); } catch { setError(L("Enter a complete https link.", "Saisissez un lien https complet.")); return; }
    if (url.protocol !== "https:") { setError(L("Only https links are accepted.", "Seuls les liens https sont acceptés.")); return; }
    setBusy(true);
    try {
      const response = await fetch(url, { credentials: "omit", cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const text = await response.text();
      if (text.length > 512 * 1024) throw new Error("size");
      choose(text, url.hostname);
    } catch {
      setError(L("This link could not be read. The site may refuse browser downloads; save the file and import it instead.", "Ce lien n’a pas pu être lu. Le site refuse peut-être les téléchargements depuis le navigateur ; enregistrez le fichier puis importez-le."));
    } finally { setBusy(false); }
  }

  async function install() {
    if (!source || !preview?.allowed) return;
    setBusy(true); setError("");
    try {
      const result = await domainPackageApi.install(source.json, language, target === NEW ? { collectionName: collectionName.trim() || undefined } : { collectionId: target });
      onInstalled(result.collectionId);
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }

  const tabs = [
    { id: "library", label: L("Library", "Bibliothèque") },
    { id: "import", label: L("Import", "Importer") },
    { id: "manage", label: L("Manage", "Gérer"), disabled: !current },
  ] as const;
  const targetOptions = [{ id: NEW, label: L("A new collection", "Une nouvelle collection") }, ...owned.map((item) => ({ id: item.id, label: item.name }))];
  const actionLabel = preview?.mode === "UPDATE" ? L(`Update to ${preview.version}`, `Mettre à jour vers ${preview.version}`) : L("Install a local copy", "Installer une copie locale");

  return <Modal title={L("Domain packages", "Paquets de domaine")} closeLabel={L("Close", "Fermer")} onClose={onClose} size="wide">
    <div className="domain-packages">
      <p className="modal-intro">{L("A package copies data formats, units, code lists, views and formulas into a collection. It never contains code or anyone’s entries, and your copy stays yours to change.", "Un paquet copie des formats de données, unités, listes de codes, vues et formules dans une collection. Il ne contient jamais de code ni les entrées de quiconque, et votre copie reste modifiable.")}</p>
      <Tabs label={L("Package source", "Source du paquet")} items={tabs} value={tab} onChange={(id) => setTab(id as Tab)} idPrefix="packages" />
      {tab === "library" && <section id="packages-library" role="tabpanel" aria-labelledby="packages-tab-library" className="package-panel">
        {pilots === null ? <div className="package-grid" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} className="package-card package-skeleton skeleton" />)}</div>
          : <div className="package-grid">{pilots.map((item) => <button type="button" key={item.id} className="package-card" aria-pressed={source?.json === item.packageJson} onClick={() => choose(item.packageJson, item.name)}>
            <span className="package-tile" aria-hidden="true"><Package size={18} /></span>
            <strong>{item.name}</strong><span>{item.description}</span><small>{L("Version", "Version")} {item.version}</small>
          </button>)}</div>}
      </section>}
      {tab === "import" && <section id="packages-import" role="tabpanel" aria-labelledby="packages-tab-import" className="package-panel package-import">
        <label className="package-file"><Upload size={18} aria-hidden="true" /><span>{L("Choose a package file (.json, 512 KiB maximum)", "Choisir un fichier de paquet (.json, 512 Kio maximum)")}</span><input type="file" accept=".json,application/json" onChange={(event) => { void fromFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
        <form className="package-link" onSubmit={(event) => { event.preventDefault(); void fromLink(); }}>
          <label className="input-label">{L("Or a https link", "Ou un lien https")}<input type="url" inputMode="url" placeholder="https://" value={link} onChange={(event) => setLink(event.target.value)} /></label>
          <Button type="submit" variant="secondary" disabled={busy || !link.trim()}><Link2 size={16} aria-hidden="true" /> {L("Read link", "Lire le lien")}</Button>
        </form>
        <p className="field-help">{L("Brainy reads the file in your browser and checks it before anything is installed. There is no public package store.", "Brainy lit le fichier dans votre navigateur et le vérifie avant toute installation. Il n’existe pas de boutique publique de paquets.")}</p>
      </section>}
      {tab === "manage" && current && <ManagePanel collection={current} userName={userName} language={language} />}

      {tab !== "manage" && source && <section className="package-preview" aria-live="polite" aria-busy={previewing}>
        <div className="package-target">
          <AccessibleListbox label={L("Install into", "Installer dans")} value={target} options={targetOptions} onChange={(value) => { setPreviewing(true); setTarget(value); }} />
          {target === NEW && <label className="input-label">{L("Collection name", "Nom de la collection")}<input value={collectionName} maxLength={80} onChange={(event) => setCollectionName(event.target.value)} /></label>}
        </div>
        {previewing && !preview && <div className="package-skeleton package-skeleton-wide skeleton" />}
        {preview && <PreviewDetails preview={preview} language={language} />}
      </section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {tab !== "manage" && source && preview && !preview.allowed && <p className="field-help package-blocked">{preview.signatureStatus === "INVALID" ? L("Installation is blocked because the signature does not match the file.", "L’installation est bloquée car la signature ne correspond pas au fichier.") : L("Installation is blocked until the conflicts above are resolved, for example by choosing a new collection.", "L’installation est bloquée tant que les conflits ci-dessus ne sont pas résolus, par exemple en choisissant une nouvelle collection.")}</p>}
      {tab !== "manage" && !source && <p className="field-help">{L("Choose a package to see what it adds before installing.", "Choisissez un paquet pour voir ce qu’il ajoute avant l’installation.")}</p>}
      {tab !== "manage" && <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>{L("Cancel", "Annuler")}</Button>
        <Button variant="primary" disabled={busy || previewing || !preview?.allowed} onClick={() => void install()}>{busy ? L("Installing…", "Installation…") : actionLabel}</Button>
      </div>}
    </div>
  </Modal>;
}

function PreviewDetails({ preview, language }: { preview: DomainPackagePreview; language: Language }) {
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;
  const date = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { dateStyle: "medium" }).format(new Date(`${preview.publishedAt}T12:00:00`));
  const groups: [string, string[]][] = [
    [L("Data formats", "Formats de données"), preview.dataFormats], [L("New fields", "Nouveaux champs"), preview.addedFields], [L("Local units", "Unités locales"), preview.units],
    [L("Code lists", "Listes de codes"), preview.codeLists], [L("Views", "Vues"), preview.views], [L("Formulas", "Formules"), preview.formulas], [L("Stock rules", "Règles de stock"), preview.stockRules],
  ];
  const empty = groups.every(([, items]) => !items.length) && !preview.exampleObjects;
  return <div className="package-details">
    <header><div><h3>{preview.name}</h3><p>{preview.description}</p></div>
      <span className={`package-mode mode-${preview.mode.toLowerCase()}`}>{preview.mode === "UPDATE" ? L(`Update ${preview.installedVersion} → ${preview.version}`, `Mise à jour ${preview.installedVersion} → ${preview.version}`) : preview.mode === "INSTALL" ? L("Add to this collection", "Ajout à cette collection") : L("New collection", "Nouvelle collection")}</span></header>
    <dl className="package-provenance">
      <div><dt>{L("Author", "Auteur")}</dt><dd>{preview.author}</dd></div><div><dt>{L("Version", "Version")}</dt><dd>{preview.version}</dd></div>
      <div><dt>{L("Licence", "Licence")}</dt><dd>{preview.license}</dd></div><div><dt>{L("Published", "Publié le")}</dt><dd>{date}</dd></div>
      <div><dt>{L("Signature", "Signature")}</dt><dd className={`signature-${preview.signatureStatus.toLowerCase()}`}>{preview.signatureStatus === "VALID" ? <><ShieldCheck size={15} aria-hidden="true" /> {L("Matches key", "Correspond à la clé")} {preview.keyFingerprint}</> : preview.signatureStatus === "INVALID" ? <><ShieldAlert size={15} aria-hidden="true" /> {L("Invalid", "Invalide")}</> : L("Not signed", "Non signé")}</dd></div>
    </dl>
    {preview.signatureStatus === "VALID" && <p className="field-help">{L("A signature proves the file was not changed since signing with this key. It does not prove who the author is.", "Une signature prouve que le fichier n’a pas changé depuis sa signature avec cette clé. Elle ne prouve pas l’identité de l’auteur.")}</p>}
    {preview.notice && <p className="package-notice">{preview.notice}</p>}
    {preview.conflicts.length > 0 && <div className="package-alert package-conflicts" role="alert"><AlertTriangle size={16} aria-hidden="true" /><div><strong>{L("Conflicts to resolve", "Conflits à résoudre")}</strong><ul>{preview.conflicts.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
    {preview.adjustments.length > 0 && <div className="package-alert package-adjustments"><div><strong>{L("Adjustments", "Ajustements")}</strong><ul>{preview.adjustments.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
    {empty ? <p className="field-help">{L("Nothing new to add.", "Rien de nouveau à ajouter.")}</p> : <div className="package-groups">
      {groups.filter(([, items]) => items.length).map(([title, items]) => <div key={title}><h4>{title} <span>{items.length}</span></h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
      {preview.exampleObjects > 0 && <div><h4>{L("Example objects", "Objets d’exemple")} <span>{preview.exampleObjects}</span></h4><p>{L("Editable examples you can delete.", "Exemples modifiables, supprimables.")}</p></div>}
    </div>}
    {preview.dependencies.length > 0 && <details className="package-dependencies"><summary>{L("Dependencies", "Dépendances")} ({preview.dependencies.length})</summary><ul>{preview.dependencies.map((item) => <li key={item}>{item}</li>)}</ul></details>}
    {preview.mode === "UPDATE" && <p className="field-help">{L("An update only adds elements. Nothing you changed or entered is modified or removed.", "Une mise à jour ne fait qu’ajouter des éléments. Rien de ce que vous avez modifié ou saisi n’est changé ni supprimé.")}</p>}
  </div>;
}

function ManagePanel({ collection, userName, language }: { collection: Collection; userName: string; language: Language }) {
  const fr = language === "fr";
  const L = (en: string, frText: string) => fr ? frText : en;
  const [installs, setInstalls] = useState<DomainPackageInstall[] | null>(null);
  const [confirming, setConfirming] = useState("");
  const [form, setForm] = useState({ packageId: `${slug(userName) || "me"}.${slug(collection.name) || "package"}`, version: "1.0.0", name: collection.name, description: "", author: userName, license: "CC-BY-4.0" });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const load = () => domainPackageApi.installs(collection.id).then(setInstalls).catch((cause) => { setInstalls([]); setError(message(cause)); });
  useEffect(() => { void load(); }, [collection.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function detach(id: string) {
    setBusy(true); setError("");
    try { await domainPackageApi.detach(id); setConfirming(""); setDone(L("Package detached. Data formats and entries stay in the collection.", "Paquet détaché. Les formats de données et les entrées restent dans la collection.")); await load(); }
    catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }

  async function exportPackage() {
    setBusy(true); setError(""); setDone("");
    try {
      const result = await domainPackageApi.exportPackage(collection.id, { ...form, description: form.description || undefined }, language);
      const url = URL.createObjectURL(new Blob([result.packageJson], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = result.fileName; anchor.click();
      URL.revokeObjectURL(url);
      setWarnings(result.warnings);
      setDone(L(`Package exported with ${result.dataFormats} data formats and no entries.`, `Paquet exporté avec ${result.dataFormats} formats de données et aucune entrée.`));
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <section id="packages-manage" role="tabpanel" aria-labelledby="packages-tab-manage" className="package-panel package-manage">
    <h3>{L("Installed packages", "Paquets installés")}</h3>
    {installs === null ? <div className="package-skeleton skeleton" /> : installs.length === 0 ? <p className="field-help">{L("No package is linked to this collection.", "Aucun paquet n’est lié à cette collection.")}</p>
      : <ul className="package-installs">{installs.map((item) => <li key={item.id}>
        <div><strong>{item.name}</strong><span>{item.version} · {item.author} · {item.license} · {L(`${item.dataFormatCount} data formats`, `${item.dataFormatCount} formats de données`)}</span></div>
        {confirming === item.id ? <div className="package-confirm"><span>{L("Detach? Nothing is deleted.", "Détacher ? Rien n’est supprimé.")}</span><Button variant="subtle" onClick={() => setConfirming("")}>{L("Keep", "Garder")}</Button><Button variant="secondary" disabled={busy} onClick={() => void detach(item.id)}>{L("Detach", "Détacher")}</Button></div>
          : <Button variant="secondary" onClick={() => setConfirming(item.id)}>{L("Detach…", "Détacher…")}</Button>}
      </li>)}</ul>}
    <form className="package-export" onSubmit={(event) => { event.preventDefault(); void exportPackage(); }}>
      <h3>{L("Share this structure as a package", "Partager cette structure en paquet")}</h3>
      <p className="field-help">{L("The file holds data formats, local units, code lists, views, formulas and stock rules only. Entries, objects, files, members and shared links are never exported.", "Le fichier contient uniquement formats de données, unités locales, listes de codes, vues, formules et règles de stock. Entrées, objets, fichiers, membres et liens partagés ne sont jamais exportés.")}</p>
      <div className="package-form-grid">
        <label className="input-label">{L("Package name", "Nom du paquet")}<input required maxLength={80} value={form.name} onChange={set("name")} /></label>
        <label className="input-label">{L("Identifier", "Identifiant")}<input required pattern="[a-z0-9][a-z0-9.\-]{2,80}" value={form.packageId} onChange={set("packageId")} aria-describedby="package-id-help" /><small id="package-id-help">{L("Lowercase letters, digits, dots and dashes. Keep it for later versions.", "Minuscules, chiffres, points et tirets. Gardez-le pour les versions suivantes.")}</small></label>
        <label className="input-label">{L("Version", "Version")}<input required pattern="\d{1,4}\.\d{1,4}\.\d{1,4}" value={form.version} onChange={set("version")} /></label>
        <label className="input-label">{L("Author", "Auteur")}<input required maxLength={120} value={form.author} onChange={set("author")} /></label>
        <label className="input-label">{L("Licence", "Licence")}<input required maxLength={80} value={form.license} onChange={set("license")} /></label>
        <label className="input-label package-wide">{L("Description (optional)", "Description (facultative)")}<input maxLength={400} value={form.description} onChange={set("description")} /></label>
      </div>
      {warnings.length > 0 && <div className="package-alert package-adjustments"><div><strong>{L("Not included", "Non inclus")}</strong><ul>{warnings.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
      {done && <p className="package-done" role="status">{done}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button type="submit" variant="primary" disabled={busy}><Download size={16} aria-hidden="true" /> {L("Export package", "Exporter le paquet")}</Button></div>
    </form>
  </section>;
}
