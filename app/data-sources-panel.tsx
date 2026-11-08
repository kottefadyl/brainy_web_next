"use client";

// T32 — data sources of a collection: files or another system feed one data format, with explained rejections.
import { useCallback, useEffect, useRef, useState } from "react";
import { DatabaseZap } from "lucide-react";
import { Button } from "./components/ui/Button";
import { EmptyState } from "./components/ui/EmptyState";
import DataSourceForm from "./data-source-form";
import DataSourceRuns from "./data-source-runs";
import type { Collection, Language, User } from "../lib/brainy";
import { formatDisplayName } from "../lib/brainy";
import { dataSourceApi, dataSourceError, deliveryIdFor, type DataSource, type DataSourceInput } from "../lib/data-sources";
import "./data-sources.css";

const tr = (language: Language, en: string, fr: string) => (language === "fr" ? fr : en);
const maxBytes = 4_000_000;

export default function DataSourcesPanel({ collection, user, language, onClose, onEntriesChanged }: { collection: Collection; user: User; language: Language; onClose: () => void; onEntriesChanged: () => void }) {
  const role = collection.ownerId === user.id ? "OWNER" : collection.members?.find((member) => member.userId === user.id)?.role ?? "READER";
  const isOwner = role === "OWNER";
  const [sources, setSources] = useState<DataSource[] | null>(null);
  const [editing, setEditing] = useState<DataSource | "new" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [key, setKey] = useState<{ sourceId: string; value: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    try { setSources(await dataSourceApi.list(collection.id)); setError(""); }
    catch (cause) { setError(dataSourceError(cause, language)); setSources((current) => current ?? []); }
  }, [collection.id, language]);
  useEffect(() => {
    dataSourceApi.list(collection.id).then(setSources).catch((cause) => { setError(dataSourceError(cause, language)); setSources([]); });
  }, [collection.id, language]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); await load(); } catch (cause) { setError(dataSourceError(cause, language)); } finally { setBusy(false); }
  };
  const save = (input: DataSourceInput) => void act(async () => {
    const saved = editing && editing !== "new" ? await dataSourceApi.update(editing.id, input) : await dataSourceApi.create(collection.id, input);
    setEditing(null); setOpenId(saved.id);
  });
  const chooseFile = (sourceId: string) => { uploadFor.current = sourceId; fileInput.current?.click(); };
  const sendFile = (file: File) => void act(async () => {
    const sourceId = uploadFor.current;
    if (!sourceId) return;
    if (file.size > maxBytes) throw new Error(tr(language, "A delivery cannot exceed 4 MB. Split the file and send each part.", "Une livraison ne peut pas dépasser 4 Mo. Découpez le fichier et envoyez chaque partie."));
    const content = await file.text();
    const json = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    const run = await dataSourceApi.upload(sourceId, await deliveryIdFor(content), content, json ? "application/json" : "text/csv");
    setOpenId(sourceId); setRefresh((value) => value + 1);
    setNotice(run.state === "COMPLETED" ? tr(language, "This file was already received; its delivery is shown below.", "Ce fichier a déjà été reçu ; sa livraison est affichée ci-dessous.") : tr(language, "File received. Brainy checks it row by row.", "Fichier reçu. Brainy le vérifie ligne par ligne."));
  });
  const remove = (source: DataSource) => {
    if (!window.confirm(tr(language, `Delete “${source.name}”? Its delivery history is removed; entries already written stay in the collection.`, `Supprimer « ${source.name} » ? L’historique des livraisons est retiré ; les entrées déjà écrites restent dans la collection.`))) return;
    void act(() => dataSourceApi.remove(source.id));
  };
  const rotate = (source: DataSource) => {
    if (source.keyHint && !window.confirm(tr(language, "Create a new key? Systems using the current key will stop working.", "Créer une nouvelle clé ? Les systèmes qui utilisent la clé actuelle ne fonctionneront plus."))) return;
    void act(async () => { const result = await dataSourceApi.rotateKey(source.id); setKey({ sourceId: source.id, value: result.key }); });
  };
  const endpoint = typeof window === "undefined" ? "/api/graphql" : `${window.location.origin}/api/graphql`;

  return <section className="data-sources-panel">
    <header className="data-sources-head">
      <Button variant="subtle" onClick={onClose}>{tr(language, "← Collection", "← Collection")}</Button>
      <h1>{tr(language, "Data sources", "Sources de données")}</h1>
      <p>{tr(language, "Feed a data format from CSV or JSON files, or from another system with a key. Brainy keeps the fact date, never adds a record twice and explains every rejected row.", "Alimentez un format de données avec des fichiers CSV ou JSON, ou depuis un autre système avec une clé. Brainy garde la date du fait, n’ajoute jamais deux fois un enregistrement et explique chaque ligne rejetée.")}</p>
      <p className="data-source-muted">{tr(language, "Up to 10,000 rows and 4 MB per delivery. This is not a real-time or certified industrial pipeline.", "Jusqu’à 10 000 lignes et 4 Mo par livraison. Ce n’est pas une chaîne industrielle temps réel ni certifiée.")}</p>
    </header>
    <input ref={fileInput} type="file" accept=".csv,.json,text/csv,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) sendFile(file); }} />
    {error && <p role="alert" className="data-source-error">{error}</p>}
    {notice && <p role="status" className="data-source-notice">{notice}</p>}
    {editing ? <DataSourceForm collection={collection} language={language} source={editing === "new" ? undefined : editing} busy={busy} onSubmit={save} onCancel={() => setEditing(null)} />
      : isOwner && sources && sources.length > 0 && <Button variant="primary" onClick={() => setEditing("new")}>{tr(language, "New data source", "Nouvelle source de données")}</Button>}
    {sources === null ? <div className="data-source-skeleton" aria-busy="true" aria-label={tr(language, "Loading data sources", "Chargement des sources de données")} />
      : !sources.length && !editing ? <EmptyState icon={<DatabaseZap size={28} aria-hidden="true" />}
        title={tr(language, "No data source yet", "Aucune source de données")}
        description={isOwner ? tr(language, "Describe which file columns fill which fields, then send a first file.", "Indiquez quelles colonnes du fichier remplissent quels champs, puis envoyez un premier fichier.") : tr(language, "The collection owner can set up a data source. You can then send files to it.", "Le propriétaire de la collection peut créer une source de données. Vous pourrez ensuite y envoyer des fichiers.")}
        action={isOwner ? <Button variant="primary" onClick={() => setEditing("new")}>{tr(language, "Create a data source", "Créer une source de données")}</Button> : undefined} />
      : <ul className="data-source-list">{sources.map((source) => {
        const format = collection.formats.find((item) => item.id === source.formatId);
        const open = openId === source.id;
        return <li key={source.id} className="data-source-card">
          <div className="data-source-card-head">
            <div>
              <h2>{source.name}</h2>
              <p className="data-source-muted">
                {format && <span className="data-source-format"><span className="data-source-swatch" style={{ background: format.color }} aria-hidden="true" />{formatDisplayName(format, language)}</span>}
                {" · "}{tr(language, `${source.mappings.length} columns`, `${source.mappings.length} colonnes`)}{" · "}{tr(language, `ID column “${source.recordIdColumn}”`, `identifiant « ${source.recordIdColumn} »`)}
              </p>
              <p className="data-source-muted">{source.keyHint ? tr(language, `Sending key active (…${source.keyHint})`, `Clé d’envoi active (…${source.keyHint})`) : tr(language, "No sending key", "Aucune clé d’envoi")}</p>
            </div>
            <div className="data-source-actions">
              {role !== "READER" && <Button variant="primary" disabled={busy} onClick={() => chooseFile(source.id)}>{tr(language, "Send a file", "Envoyer un fichier")}</Button>}
              <Button aria-expanded={open} onClick={() => setOpenId(open ? null : source.id)}>{open ? tr(language, "Hide deliveries", "Masquer les livraisons") : tr(language, "Deliveries", "Livraisons")}</Button>
            </div>
          </div>
          {isOwner && <details className="data-source-manage">
            <summary>{tr(language, "Manage", "Gérer")}</summary>
            <div className="data-source-actions">
              <Button disabled={busy} onClick={() => setEditing(source)}>{tr(language, "Edit mapping", "Modifier la correspondance")}</Button>
              <Button disabled={busy} onClick={() => rotate(source)}>{source.keyHint ? tr(language, "Replace sending key", "Remplacer la clé d’envoi") : tr(language, "Create sending key", "Créer une clé d’envoi")}</Button>
              {source.keyHint && <Button disabled={busy} onClick={() => void act(() => dataSourceApi.revokeKey(source.id))}>{tr(language, "Revoke key", "Révoquer la clé")}</Button>}
              <Button variant="danger" disabled={busy} onClick={() => remove(source)}>{tr(language, "Delete source", "Supprimer la source")}</Button>
            </div>
          </details>}
          {key?.sourceId === source.id && <div className="data-source-key" role="status">
            <p><strong>{tr(language, "Copy this key now. It is shown only once.", "Copiez cette clé maintenant. Elle n’est affichée qu’une fois.")}</strong> {tr(language, "It can only send deliveries to this source; it cannot read any data.", "Elle permet seulement d’envoyer des livraisons à cette source ; elle ne lit aucune donnée.")}</p>
            <div className="data-source-key-row"><input readOnly value={key.value} aria-label={tr(language, "Sending key", "Clé d’envoi")} onFocus={(event) => event.target.select()} /><Button onClick={() => void navigator.clipboard.writeText(key.value)}>{tr(language, "Copy", "Copier")}</Button></div>
            <details><summary>{tr(language, "Example request", "Exemple de requête")}</summary>
              <pre>{`curl -s ${endpoint} -H 'content-type: application/json' \\\n  -d '{"query":"mutation($k:String!,$d:String!,$c:String!){pushDataSourceDelivery(key:$k,deliveryId:$d,content:$c,contentType:\\"text/csv\\"){id state}}","variables":{"k":"<key>","d":"delivery-001","c":"${source.recordIdColumn}${source.delimiter === "\t" ? "\\t" : source.delimiter}${source.mappings[0]?.column ?? ""}\\n..."}}'`}</pre>
              <p className="data-source-muted">{tr(language, "Reuse the same delivery ID to resend safely; at most 120 deliveries per hour.", "Réutilisez le même identifiant de livraison pour renvoyer sans risque ; 120 livraisons par heure au plus.")}</p>
            </details>
          </div>}
          {open && <DataSourceRuns sourceId={source.id} language={language} refreshKey={refresh} onEntriesChanged={onEntriesChanged} />}
        </li>;
      })}</ul>}
  </section>;
}
