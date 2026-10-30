"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ledgerApi, type LedgerIntegrity } from "../lib/api";
import { translateError, type Collection, type Entry, type Language } from "../lib/brainy";
import "./ledger.css";

const tr = (language: Language, en: string, fr: string) => language === "fr" ? fr : en;
const opposite = (value: string) => value.startsWith("-") ? value.slice(1) : value === "0" ? "0" : `-${value}`;

export default function LedgerPanel({ collection, language, userId, onCollectionChanged, onEntriesChanged }: {
  collection: Collection; language: Language; userId: string; onCollectionChanged: (collection: Collection) => void; onEntriesChanged: () => void;
}) {
  const isOwner = collection.ownerId === userId;
  const canEdit = isOwner || collection.members?.some((item) => item.userId === userId && item.role !== "READER");
  const [formatId, setFormatId] = useState(collection.formats.find((item) => item.appendOnly)?.id ?? collection.formats[0]?.id ?? "");
  const format = collection.formats.find((item) => item.id === formatId);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [integrity, setIntegrity] = useState<LedgerIntegrity | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState("");
  const [correcting, setCorrecting] = useState<Entry | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [masking, setMasking] = useState<Entry | null>(null);
  const [maskFields, setMaskFields] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const all = await api.entries(collection.id);
    setEntries(all.filter((entry) => entry.formatId === formatId));
    setIntegrity(format?.appendOnly ? await ledgerApi.verify(collection.id, formatId) : null);
  };
  useEffect(() => {
    let live = true;
    void Promise.all([api.entries(collection.id), format?.appendOnly ? ledgerApi.verify(collection.id, formatId) : Promise.resolve(null)])
      .then(([all, result]) => { if (live) { setEntries(all.filter((entry) => entry.formatId === formatId)); setIntegrity(result); } })
      .catch((cause) => { if (live) setError(translateError(cause, language)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [collection.id, formatId, format?.appendOnly, language]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await action(); await load(); } catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  };
  const startCorrection = (entry: Entry) => {
    setCorrecting(entry); setMasking(null);
    setDraft(Object.fromEntries(entry.values.filter((value) => value.value !== "[redacted]" && !["ATTACHMENT", "OBJECT_REF"].includes(format?.fields.find((field) => field.id === value.fieldId)?.kind ?? "")).map((value) => [value.fieldId,
      format?.fields.find((field) => field.id === value.fieldId)?.kind === "NUMBER" ? opposite(value.value) : value.value])));
  };
  const submitCorrection = (event: FormEvent) => {
    event.preventDefault(); if (!correcting) return;
    void run(async () => {
      await ledgerApi.correct(correcting.id, Object.entries(draft).filter(([, value]) => value.trim()).map(([id, value]) => ({ fieldId: id, value: value.trim() })));
      setCorrecting(null); onEntriesChanged();
    });
  };
  const submitMask = (event: FormEvent) => {
    event.preventDefault(); if (!masking) return;
    void run(async () => { await ledgerApi.redact(collection.id, formatId, masking.id, maskFields, reason); setMasking(null); setMaskFields([]); setReason(""); onEntriesChanged(); });
  };
  const exportProof = () => void run(async () => {
    const proof = await ledgerApi.proof(collection.id, formatId);
    const url = URL.createObjectURL(new Blob([proof], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `brainy-register-${formatId}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  return <section className="ledger-panel" aria-label={tr(language, "Register", "Registre")}>
    <header><h1>{tr(language, "Register", "Registre")}</h1><p>{tr(language, "Writings are added in order. Corrections remain linked to the original.", "Les écritures s’ajoutent dans l’ordre. Les corrections restent liées à l’originale.")}</p></header>
    <label>{tr(language, "Data format", "Format de données")}<select value={formatId} onChange={(event) => { setLoading(true); setError(""); setBalance(null); setFieldId(""); setFormatId(event.target.value); }}>{collection.formats.map((item) => <option key={item.id} value={item.id}>{item.name}{item.appendOnly ? ` · ${tr(language, "register", "registre")}` : ""}</option>)}</select></label>
    {loading ? <p role="status">{tr(language, "Loading…", "Chargement…")}</p> : format && !format.appendOnly ? <div className="ledger-box"><p>{tr(language, "Turn on the register for an empty data format. This cannot be undone here.", "Activez le registre pour un format de données vide. Cette action ne peut pas être annulée ici.")}</p>{isOwner && <button type="button" disabled={busy || entries.length > 0 || !!format.objectModel || !!format.workflow} onClick={() => void run(async () => { onCollectionChanged(await ledgerApi.enable(collection.id, format.id)); })}>{tr(language, "Enable register", "Activer le registre")}</button>}{entries.length > 0 && <p>{tr(language, "This data format already has entries.", "Ce format de données contient déjà des entrées.")}</p>}</div> : format && <>
      <div className="ledger-box"><h2>{tr(language, "Integrity", "Intégrité")}</h2><p role="status">{integrity?.valid ? tr(language, `${integrity.checked} writings verified`, `${integrity.checked} écritures vérifiées`) : integrity?.problem ?? tr(language, "Verification needed", "Vérification nécessaire")}</p><div className="ledger-actions"><button type="button" disabled={busy} onClick={() => void run(async () => { setIntegrity(await ledgerApi.verify(collection.id, formatId)); })}>{tr(language, "Verify integrity", "Vérifier l’intégrité")}</button><button type="button" disabled={busy} onClick={exportProof}>{tr(language, "Export proof", "Exporter la preuve")}</button></div><small>{tr(language, "Integrity evidence only; no accounting, medical or regulatory certification.", "Preuve d’intégrité uniquement ; aucune certification comptable, médicale ou réglementaire.")}</small></div>
      {isOwner && format.fields.some((field) => field.kind === "NUMBER") && <div className="ledger-box"><h2>{tr(language, "Current balance", "Solde courant")}</h2><label>{tr(language, "Number field", "Champ numérique")}<select value={fieldId} onChange={(event) => { setFieldId(event.target.value); setBalance(null); }}><option value="">—</option>{format.fields.filter((field) => field.kind === "NUMBER").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><button type="button" disabled={busy || !fieldId} onClick={() => void run(async () => setBalance(await ledgerApi.balance(collection.id, formatId, fieldId)))}>{tr(language, "Calculate", "Calculer")}</button>{balance !== null && <output>{balance}</output>}</div>}
      <div className="ledger-box"><h2>{tr(language, "Writings", "Écritures")}</h2>{entries.length ? <ol className="ledger-list">{entries.map((entry) => <li key={entry.id}><div><strong>#{entry.ledgerSequence}</strong> · <time>{new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</time>{entry.correctionOf && <small> · {tr(language, "Correction of", "Correction de")} {entry.correctionOf}</small>}</div><dl>{entry.values.map((value) => <div key={value.fieldId}><dt>{format.fields.find((field) => field.id === value.fieldId)?.name ?? value.fieldId}</dt><dd>{value.value === "[redacted]" ? tr(language, "[masked]", "[masqué]") : value.value}</dd></div>)}</dl><div className="ledger-actions">{canEdit && <button type="button" disabled={busy} onClick={() => startCorrection(entry)}>{tr(language, "Counter-writing", "Contre-écriture")}</button>}{isOwner && <button type="button" disabled={busy} onClick={() => { setMasking(entry); setCorrecting(null); setMaskFields([]); }}>{tr(language, "Mask fields", "Masquer des champs")}</button>}</div></li>)}</ol> : <p>{tr(language, "No writings yet. Add an entry in this data format to begin.", "Aucune écriture. Ajoutez une entrée dans ce format de données pour commencer.")}</p>}</div>
    </>}
    {correcting && format && <form className="ledger-box" onSubmit={submitCorrection}><h2>{tr(language, "Counter-writing", "Contre-écriture")}</h2><p>{tr(language, "Number fields must contain the opposite amount.", "Les champs numériques doivent contenir le montant opposé.")}</p>{format.fields.filter((field) => draft[field.id] !== undefined).map((field) => <label key={field.id}>{field.name}<input value={draft[field.id] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))} /></label>)}<div className="ledger-actions"><button type="submit" disabled={busy}>{tr(language, "Add correction", "Ajouter la correction")}</button><button type="button" onClick={() => setCorrecting(null)}>{tr(language, "Cancel", "Annuler")}</button></div></form>}
    {masking && format && <form className="ledger-box" onSubmit={submitMask}><h2>{tr(language, "Mask fields", "Masquer des champs")}</h2><p>{tr(language, "Selected values are erased; number amounts remain and a trace is kept.", "Les valeurs choisies sont effacées ; les montants restent et une trace est conservée.")}</p>{format.fields.filter((field) => !["NUMBER", "MEASURE"].includes(field.kind) && masking.values.some((value) => value.fieldId === field.id && value.value !== "[redacted]")).map((field) => <label className="ledger-check" key={field.id}><input type="checkbox" checked={maskFields.includes(field.id)} onChange={(event) => setMaskFields((current) => event.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id))} />{field.name}</label>)}<label>{tr(language, "Reason", "Motif")}<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required /></label><div className="ledger-actions"><button type="submit" disabled={busy || !maskFields.length}>{tr(language, "Mask selected fields", "Masquer les champs choisis")}</button><button type="button" onClick={() => setMasking(null)}>{tr(language, "Cancel", "Annuler")}</button></div></form>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
