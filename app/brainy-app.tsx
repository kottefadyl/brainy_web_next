"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, Boxes, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, Copy, FileText,
  FolderHeart, Globe2, Link2, LogOut, Moon, MoreHorizontal, Pencil, Plus, Ruler,
  RefreshCw, Sparkles, Sun, Trash2, X,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import InsightsDialog from "./insights-dialog";
import StockPanel from "./stock-panel";
import StarterDialog from "./starter-dialog";
import EntryLinksDialog from "./entry-links-dialog";
import QuickCaptureDialog from "./quick-capture-dialog";
import QuickEntryDialog from "./quick-entry-dialog";
import { bookText, downloadTransfer, exportCollection, importCollection, parseTransfer, transferCsv, transferMapping, type TransferBundle } from "../lib/transfer";
import {
  entryClipboardText, fieldKindLabel, fieldKinds, formatColors, formatDisplayName, formatFieldValue, formatForEntry, numberUnits,
  t, translateError, unitCategories, unitLabel, valuesByField,
  type Collection, type CollectionUnit, type Entry, type EntryFilter, type EntryPage, type FieldKind, type Language, type SavedView, type EntryReminder, type User,
} from "../lib/brainy";

type Dialog =
  | { kind: "starter" }
  | { kind: "entryLinks"; entry: Entry }
  | { kind: "collection" }
  | { kind: "addFormat" }
  | { kind: "editFormat"; formatId: string }
  | { kind: "formatColor"; formatId: string }
  | { kind: "entry"; entry?: Entry; formatId?: string }
  | { kind: "rename" }
  | { kind: "deleteCollection" }
  | { kind: "deleteEntry"; entry: Entry }
  | { kind: "transfer" }
  | { kind: "units" }
  | { kind: "objects" }
  | { kind: "copyObject"; objectId: string }
  | { kind: "moveObject"; objectId: string }
  | { kind: "shareObject"; object: Entry }
  | { kind: "copyFormat"; formatId: string }
  | { kind: "linkFormat"; formatId: string }
  | { kind: "linkedFormatUpdate"; formatId: string }
  | { kind: "view"; viewId?: string }
  | { kind: "reminder"; entry: Entry }
  | null;

function dateTime(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(error: unknown, language: Language): string {
  return translateError(error, language);
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Copy failed");
}

async function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

async function downloadAttachment(entryId: string, fieldId: string): Promise<void> {
  const attachment = await api.entryAttachment(entryId, fieldId);
  const binary = atob(attachment.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      {/* The mark comes from the Brainy logo supplied for this project. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brainy-mark.png" alt="" className="brand-mark" />
      <span>brainy<span className="brand-dot">.</span></span>
    </div>
  );
}

function LanguagePicker({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return (
    <label className="language-picker">
      <Globe2 size={17} aria-hidden="true" />
      <span className="sr-only">{t(language, "language")}</span>
      <select value={language} onChange={(event) => onChange(event.target.value as Language)} aria-label={t(language, "language")}>
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

type ColorMode = "light" | "dark";
function ThemeToggle({ language, mode, onChange }: { language: Language; mode: ColorMode; onChange: (mode: ColorMode) => void }) {
  const next = mode === "dark" ? "light" : "dark";
  const label = language === "fr" ? next === "dark" ? "Activer le thème sombre" : "Activer le thème clair" : next === "dark" ? "Use dark theme" : "Use light theme";
  return <button type="button" className="theme-toggle" onClick={() => onChange(next)} title={label} aria-label={label}>{mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}<span>{language === "fr" ? mode === "dark" ? "Clair" : "Sombre" : mode === "dark" ? "Light" : "Dark"}</span></button>;
}

function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "subtle" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function Modal({ title, closeLabel, onClose, children, size = "normal" }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode; size?: "normal" | "wide" }) {
  const modalRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    if (!modalRef.current?.contains(document.activeElement)) focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; previousFocus?.focus(); };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={modalRef} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}><X size={20} /></button></div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function AuthScreen({ language, onLanguage, colorMode, onColorMode, onAuthenticated }: { language: Language; onLanguage: (value: Language) => void; colorMode: ColorMode; onColorMode: (mode: ColorMode) => void; onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && !name.trim()) return setError(t(language, "requiredName"));
    if (mode === "register" && name.trim().length < 2) return setError(t(language, "nameRule"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t(language, "invalidEmail"));
    if (mode === "register" && (password.length < 8 || password.length > 128)) return setError(t(language, "passwordLength"));
    if (mode === "register" && password !== confirm) return setError(t(language, "passwordMismatch"));
    setBusy(true);
    try {
      const user = mode === "login" ? await api.login(email.trim(), password) : await api.register(name.trim(), email.trim(), password);
      onAuthenticated(user);
    } catch (error) { setError(errorMessage(error, language)); }
    finally { setBusy(false); }
  }

  async function google() {
    setError("");
    setBusy(true);
    try {
      const { googleIdToken } = await import("../lib/firebase-client");
      onAuthenticated(await api.google(await googleIdToken()));
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError(errorMessage(error, language));
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-visual-top"><Brand /><div className="theme-controls"><ThemeToggle language={language} mode={colorMode} onChange={onColorMode} /><LanguagePicker language={language} onChange={onLanguage} /></div></div>
        <div className="auth-story">
          <div className="eyebrow"><Sparkles size={16} /> {t(language, "tagline")}</div>
          <h1>{language === "fr" ? <>Donnez une place à <em>chaque idée.</em></> : <>A home for <em>every thought.</em></>}</h1>
          <p>{t(language, "intro")}</p>
          <div className="story-preview" aria-hidden="true">
            <div className="preview-top"><span className="preview-dots"><i /><i /><i /></span><span>brainy / {language === "fr" ? "mes idées" : "my ideas"}</span></div>
            <div className="preview-content">
              <div className="preview-side"><span /><span /><span /></div>
              <div className="preview-note"><div className="preview-pill" /><div className="preview-line wide" /><div className="preview-line" /><div className="preview-line short" /><div className="preview-bottom"><span /><span /></div></div>
              <div className="preview-note second"><div className="preview-pill" /><div className="preview-line" /><div className="preview-line wide" /><div className="preview-bottom"><span /><span /></div></div>
            </div>
          </div>
        </div>
        <div className="auth-visual-foot">{language === "fr" ? "Vos pensées, en ordre." : "Your thoughts, in order."}</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-mobile-top"><Brand compact /><div className="theme-controls"><ThemeToggle language={language} mode={colorMode} onChange={onColorMode} /><LanguagePicker language={language} onChange={onLanguage} /></div></div>
        <div className="auth-card">
          <div className="auth-icon"><BookOpen size={25} /></div>
          <h2>{t(language, mode === "login" ? "welcome" : "start")}</h2>
          <p>{t(language, mode === "login" ? "welcomeDetail" : "startDetail")}</p>
          <button type="button" onClick={google} disabled={busy} className="google-button"><span className="google-g">G</span>{t(language, "google")}</button>
          <div className="auth-divider"><span>{t(language, "or")}</span></div>
          <form onSubmit={submit} className="form-stack">
            {mode === "register" && <label className="input-label">{t(language, "name")}<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>}
            <label className="input-label">{t(language, "email")}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="input-label">{t(language, "password")}<span className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={t(language, showPassword ? "hidePassword" : "showPassword")}>{t(language, showPassword ? "hide" : "show")}</button></span></label>
            {mode === "register" && <label className="input-label">{t(language, "confirmPassword")}<input type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <Button type="submit" disabled={busy} className="auth-submit">{busy ? t(language, "loading") : t(language, mode === "login" ? "signIn" : "signUp")} {!busy && <ArrowRight size={18} />}</Button>
          </form>
          <p className="auth-switch">{t(language, mode === "login" ? "newHere" : "alreadyHere")} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{t(language, mode === "login" ? "signUp" : "signIn")}</button></p>
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ user, language, onLanguage, colorMode, onColorMode, onSaved, onCancel, onSignOut }: { user: User; language: Language; onLanguage: (value: Language) => void; colorMode: ColorMode; onColorMode: (mode: ColorMode) => void; onSaved: (user: User) => void; onCancel?: () => void; onSignOut: () => void }) {
  const [name, setName] = useState(user.name);
  const [profession, setProfession] = useState(user.profession ?? "");
  const [job, setJob] = useState(user.job ?? "");
  const [fieldOfStudy, setFieldOfStudy] = useState(user.fieldOfStudy ?? "");
  const [interests, setInterests] = useState(user.interests?.join(", ") ?? "");
  const [hobbies, setHobbies] = useState(user.hobbies?.join(", ") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const items = (value: string) => value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanInterests = items(interests);
    const cleanHobbies = items(hobbies);
    if (name.trim().length < 2) return setError(t(language, "nameRule"));
    if (!cleanInterests.length && !cleanHobbies.length) return setError(t(language, "profileInterestRule"));
    if ([cleanInterests, cleanHobbies].some((list) => list.length > 12 || list.some((item) => item.length > 60))) return setError(t(language, "profileLimit"));
    if ([cleanInterests, cleanHobbies].some((list) => new Set(list.map((item) => item.toLocaleLowerCase())).size !== list.length)) return setError(t(language, "profileDuplicate"));
    setBusy(true);
    try { onSaved(await api.updateProfile({ name: name.trim(), profession: profession.trim(), job: job.trim(), fieldOfStudy: fieldOfStudy.trim(), interests: cleanInterests, hobbies: cleanHobbies })); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <div className="profile-shell">
    <div className="profile-top"><Brand compact /><div className="theme-controls"><ThemeToggle language={language} mode={colorMode} onChange={onColorMode} /><LanguagePicker language={language} onChange={onLanguage} /></div></div>
    <section className="profile-card">
      <div className="profile-intro"><span className="eyebrow blue"><Sparkles size={16} /> brainy</span><h1>{t(language, user.profileCompleted ? "editProfile" : "setupProfile")}</h1><p>{t(language, "profileIntro")}</p><small>{t(language, "profilePrivate")}</small></div>
      <form className="profile-form" onSubmit={submit}>
        <label className="input-label">{t(language, "name")}<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
        <label className="input-label">{t(language, "profession")} <span className="optional-label">{t(language, "optional")}</span><input value={profession} onChange={(event) => setProfession(event.target.value)} maxLength={100} /></label>
        <label className="input-label">{t(language, "job")} <span className="optional-label">{t(language, "optional")}</span><input value={job} onChange={(event) => setJob(event.target.value)} maxLength={100} /></label>
        <label className="input-label">{t(language, "fieldOfStudy")} <span className="optional-label">{t(language, "optional")}</span><input value={fieldOfStudy} onChange={(event) => setFieldOfStudy(event.target.value)} maxLength={100} /></label>
        <label className="input-label">{t(language, "interests")}<textarea rows={2} value={interests} onChange={(event) => setInterests(event.target.value)} placeholder={t(language, "listHint")} maxLength={730} /></label>
        <label className="input-label">{t(language, "hobbies")}<textarea rows={2} value={hobbies} onChange={(event) => setHobbies(event.target.value)} placeholder={t(language, "listHint")} maxLength={730} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="profile-actions">{onCancel && <Button type="button" variant="secondary" onClick={onCancel}>{t(language, "cancel")}</Button>}<Button type="submit" disabled={busy}>{busy ? t(language, "saving") : t(language, user.profileCompleted ? "saveProfile" : "continueToWorkspace")} <ArrowRight size={17} /></Button></div>
      </form>
    </section>
    {!user.profileCompleted && <button type="button" className="profile-signout" onClick={onSignOut}>{t(language, "signOut")}</button>}
  </div>;
}

type DraftField = { key: number; id?: string; name: string; kind: FieldKind; unit: string; optionsText: string; custom?: boolean; targetObjectFormatId?: string; multiple?: boolean; variableName?: string; referenceMode?: "CURRENT" | "SNAPSHOT" };

function CollectionEditor({ language, collection, editingFormat, onClose, onSaved }: { language: Language; collection?: Collection; editingFormat?: Collection["formats"][number]; onClose: () => void; onSaved: (collection: Collection) => void }) {
  const [name, setName] = useState("");
  const [formatName, setFormatName] = useState(editingFormat?.name ?? `${t(language, "format")} ${collection ? collection.formats.length + 1 : 1}`);
  const [color, setColor] = useState("");
  const [fields, setFields] = useState<DraftField[]>(editingFormat ? editingFormat.fields.map((field, index) => ({ key: index + 1, id: field.id, name: field.name, kind: field.kind, unit: field.unit ?? "", optionsText: field.options?.join("\n") ?? "", custom: !!field.unit && !field.unit.startsWith("local:") && !numberUnits.some((unit) => unit.code === field.unit), targetObjectFormatId: field.targetObjectFormatId ?? "", multiple: field.multiple ?? false, variableName: field.variableName ?? "", referenceMode: field.referenceMode ?? "SNAPSHOT" })) : [{ key: 1, name: t(language, "title"), kind: "TITLE", unit: "", optionsText: "" }]);
  const [objectModel, setObjectModel] = useState(editingFormat?.objectModel ?? false);
  const [nextKey, setNextKey] = useState((editingFormat?.fields.length ?? 1) + 1);
  const [impact, setImpact] = useState<{ entryCount: number; populatedFieldIds: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (collection && editingFormat) api.formatImpact(collection.id, editingFormat.id).then(setImpact).catch((cause) => setError(errorMessage(cause, language))); }, [collection, editingFormat, language]);

  function update(key: number, patch: Partial<DraftField>) { setFields((current) => current.map((field) => field.key === key ? { ...field, ...patch } : field)); }
  function addField() {
    if (fields.length >= 30) return setError(t(language, "fieldLimit"));
    setFields((current) => [...current, { key: nextKey, name: "", kind: "TEXT", unit: "", optionsText: "" }]);
    setNextKey((current) => current + 1);
    setError("");
  }
  function moveField(key: number, direction: -1 | 1) {
    setFields((current) => { const next = [...current]; const index = next.findIndex((field) => field.key === key); const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanName = name.trim();
    const cleanFields = fields.map((field) => ({ ...(field.id ? { id: field.id } : {}), name: field.name.trim(), kind: field.kind, ...(field.kind === "NUMBER" && field.unit.trim() ? { unit: field.unit.trim() } : {}), ...(["SELECT", "MULTI_SELECT"].includes(field.kind) ? { options: field.optionsText.split("\n").map((value) => value.trim()).filter(Boolean) } : {}), ...(field.kind === "OBJECT_REF" ? { targetObjectFormatId: field.targetObjectFormatId, multiple: field.multiple ?? false, variableName: field.variableName?.trim() || undefined, referenceMode: field.referenceMode ?? "SNAPSHOT" } : {}) }));
    if ((!collection && (!cleanName || cleanName.length > 80)) || cleanFields.some((field) => !field.name || field.name.length > 80)) return setError(t(language, "invalidCollection"));
    if (!formatName.trim()) return setError(t(language, "nameFormat"));
    if (objectModel && !cleanFields.some((field) => field.kind === "TITLE")) return setError(language === "fr" ? "Un modèle d’objet a besoin d’un champ titre." : "An object model needs a title field.");
    if (!editingFormat && !color) return setError(t(language, "chooseColor"));
    if (!editingFormat && collection?.formats.some((format) => format.color === color)) return setError(t(language, "colorUsed"));
    if (collection?.formats.some((format) => format.id !== editingFormat?.id && format.name.toLocaleLowerCase() === formatName.trim().toLocaleLowerCase())) return setError(t(language, "duplicateFormats"));
    if (new Set(cleanFields.map((field) => field.name.toLocaleLowerCase())).size !== fields.length) return setError(t(language, "duplicateFields"));
    if (fields.some((field) => field.kind === "NUMBER" && field.custom && !field.unit.trim())) return setError(t(language, "customUnitRequired"));
    if (cleanFields.some((field) => field.unit && !field.unit.startsWith("local:") && field.unit.length > 24)) return setError(t(language, "unitLimit"));
    if (cleanFields.some((field) => "options" in field && (field.options!.length < 2 || field.options!.length > 30 || new Set(field.options!.map((value) => value.toLocaleLowerCase())).size !== field.options!.length))) return setError(t(language, "choicesRule"));
    if (fields.some((field) => field.kind === "OBJECT_REF" && !field.targetObjectFormatId)) return setError(language === "fr" ? "Choisissez un modèle d’objets de cette collection." : "Choose an object model in this collection.");
    setBusy(true);
    try { onSaved(editingFormat && collection ? await api.updateFormat(collection.id, editingFormat.id, formatName.trim(), editingFormat.version ?? 1, cleanFields) : collection ? await api.addFormat(collection.id, formatName.trim(), color, cleanFields, objectModel) : await api.createCollection(cleanName, cleanFields, formatName.trim(), color, objectModel)); }
    catch (error) { setError(errorMessage(error, language)); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={t(language, editingFormat ? "editFormat" : collection ? "addFormat" : "newCollection")} closeLabel={t(language, "close")} onClose={onClose} size="wide">
      <form onSubmit={submit} className="modal-form">
        <p className="modal-intro">{t(language, editingFormat ? "formatSafeEdit" : collection ? "formatGuide" : "collectionGuide")}</p>
        {editingFormat && <p className="modal-intro">{t(language, "formatImpact")}: {impact?.entryCount ?? "…"}</p>}
        {!collection && <label className="input-label">{t(language, "collectionName")}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={t(language, "collectionNameHint")} maxLength={80} required /></label>}
        <label className="input-label">{t(language, "formatName")}<input autoFocus={!!collection} value={formatName} onChange={(event) => setFormatName(event.target.value)} maxLength={80} required /></label>
        {!editingFormat && <fieldset className="format-color-picker"><legend>{t(language, "formatColor")}</legend><p>{t(language, "formatColorHelp")}</p><div className="format-color-options">{formatColors.map((option, index) => <button key={option} type="button" className={`format-color-option ${color === option ? "selected" : ""}`} style={{ backgroundColor: option }} disabled={collection?.formats.some((format) => format.color === option)} onClick={() => setColor(option)} aria-label={`${t(language, "formatColor")} ${index + 1}`} aria-pressed={color === option}>{color === option && <Check size={17} />}</button>)}</div></fieldset>}
        {!editingFormat && <label className="object-choice"><input type="checkbox" checked={objectModel} onChange={(event) => setObjectModel(event.target.checked)} />{language === "fr" ? "Utiliser ce format de données pour des objets" : "Use this data format for objects"}</label>}
        <div className="form-section-title"><div><h3>{t(language, "collectionFormat")}</h3><p>{t(language, "formatHelp")}</p></div><span className="count-chip">{fields.length} {t(language, fields.length === 1 ? "field" : "fields")}</span></div>
        <div className="field-list">
          {fields.map((field, index) => (
            <div className="field-editor" key={field.key}>
              <span className="field-index">{String(index + 1).padStart(2, "0")}</span>
              <label className="input-label field-name">{t(language, "fieldName")}<input value={field.name} onChange={(event) => update(field.key, { name: event.target.value })} placeholder={t(language, "fieldName")} maxLength={80} required /></label>
              <label className="input-label field-type">{t(language, "type")}<select value={field.kind} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onChange={(event) => update(field.key, { kind: event.target.value as FieldKind, unit: "", optionsText: "", custom: false })}>{fieldKinds.filter((kind) => kind !== "OBJECT_REF" || collection?.formats.some((item) => item.objectModel)).map((kind) => <option key={kind} value={kind}>{fieldKindLabel(language, kind)}</option>)}</select></label>
              <div className="field-actions"><button type="button" className="icon-button" aria-label={t(language, "moveUp")} title={t(language, "moveUp")} disabled={index === 0} onClick={() => moveField(field.key, -1)}>↑</button><button type="button" className="icon-button" aria-label={t(language, "moveDown")} title={t(language, "moveDown")} disabled={index === fields.length - 1} onClick={() => moveField(field.key, 1)}>↓</button>{fields.length > 1 && <button type="button" className="icon-button field-remove" aria-label={t(language, "removeField")} title={t(language, "removeField")} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onClick={() => setFields((current) => current.filter((item) => item.key !== field.key))}><X size={18} /></button>}</div>
              {field.kind === "NUMBER" && <label className="input-label field-unit">{t(language, "unit")}
                <select value={field.custom ? "custom" : field.unit} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onChange={(event) => update(field.key, { custom: event.target.value === "custom", unit: event.target.value === "custom" ? "" : event.target.value })}>
                  <option value="">{t(language, "noUnit")}</option>
                  {unitCategories.map((category) => <optgroup key={category} label={t(language, category)}>{numberUnits.filter((unit) => unit.category === category).map((unit) => <option key={unit.code} value={unit.code}>{unitLabel(unit, language)}</option>)}</optgroup>)}
                  {collection?.units.length ? <optgroup label={t(language, "localUnits")}>{collection.units.map((unit) => <option key={unit.id} value={`local:${unit.id}`}>{unit.name} ({unit.symbol})</option>)}</optgroup> : null}
                  <option value="custom">{t(language, "customUnit")}</option>
                </select>
                {field.custom && <input className="custom-unit-input" value={field.unit} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onChange={(event) => update(field.key, { unit: event.target.value })} placeholder={t(language, "customUnitHint")} maxLength={24} required />}
              </label>}
              {["SELECT", "MULTI_SELECT"].includes(field.kind) && <label className="input-label field-unit">{t(language, "options")}<textarea rows={3} value={field.optionsText} onChange={(event) => update(field.key, { optionsText: event.target.value })} /></label>}
              {field.kind === "OBJECT_REF" && <div className="field-unit"><label className="input-label">{language === "fr" ? "Modèle d’objets cible" : "Target object model"}<select value={field.targetObjectFormatId ?? ""} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onChange={(event) => update(field.key, { targetObjectFormatId: event.target.value })}><option value="">—</option>{collection?.formats.filter((item) => item.objectModel).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{collection?.sharedObjects.filter((item) => !item.revokedAt).map((item) => <option key={item.id} value={item.sourceFormatId}>{item.sourceName} · {item.objectName} ({language === "fr" ? "lié" : "linked"})</option>)}</select></label><label className="input-label">{language === "fr" ? "Variable d’objet (facultatif)" : "Object variable (optional)"}<input value={field.variableName ?? ""} onChange={(event) => update(field.key, { variableName: event.target.value })} placeholder="produit" maxLength={40} /></label><label className="object-choice"><input type="checkbox" checked={field.multiple ?? false} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onChange={(event) => update(field.key, { multiple: event.target.checked })} />{language === "fr" ? "Plusieurs objets" : "Multiple objects"}</label><label className="input-label">{language === "fr" ? "Valeurs des propriétés" : "Property values"}<select value={field.referenceMode ?? "SNAPSHOT"} disabled={!!field.id && !!impact?.populatedFieldIds.includes(field.id)} onChange={(event) => update(field.key, { referenceMode: event.target.value as "CURRENT" | "SNAPSHOT" })}><option value="SNAPSHOT">{language === "fr" ? "Figées à l’enregistrement" : "Snapshot when saved"}</option><option value="CURRENT">{language === "fr" ? "Valeurs actuelles" : "Current values"}</option></select></label></div>}
            </div>
          ))}
        </div>
        <Button type="button" variant="subtle" onClick={addField} className="add-field"><Plus size={17} /> {t(language, "addField")}</Button>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button><Button type="submit" disabled={busy}>{busy ? t(language, "saving") : t(language, editingFormat ? "save" : collection ? "addFormat" : "createCollection")} <ArrowRight size={17} /></Button></div>
      </form>
    </Modal>
  );
}

function FormatColorEditor({ collection, formatId, language, onClose, onSaved }: { collection: Collection; formatId: string; language: Language; onClose: () => void; onSaved: (collection: Collection) => void }) {
  const format = collection.formats.find((item) => item.id === formatId)!;
  const [color, setColor] = useState(format.color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try { onSaved(await api.setFormatColor(collection.id, formatId, color)); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={t(language, "changeColor")} closeLabel={t(language, "close")} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <p className="modal-intro">{formatDisplayName(format, language)} · {t(language, "formatColorHelp")}</p>
      <fieldset className="format-color-picker"><legend>{t(language, "formatColor")}</legend><div className="format-color-options">{formatColors.map((option, index) => <button key={option} type="button" className={`format-color-option ${color === option ? "selected" : ""}`} style={{ backgroundColor: option }} disabled={collection.formats.some((item) => item.id !== formatId && item.color === option)} onClick={() => setColor(option)} aria-label={`${t(language, "formatColor")} ${index + 1}`} aria-pressed={color === option}>{color === option && <Check size={17} />}</button>)}</div></fieldset>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button><Button type="submit" disabled={busy}>{busy ? t(language, "saving") : t(language, "save")}</Button></div>
    </form>
  </Modal>;
}

function ObjectReferencePicker({ collection, field, language, value, entryId, onChange }: { collection: Collection; field: Collection["formats"][number]["fields"][number]; language: Language; value: string; entryId?: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<EntryPage | null>(null);
  const [known, setKnown] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const selected = (() => { try { return JSON.parse(value || "[]") as string[]; } catch { return []; } })();
  const target = collection.formats.find((item) => item.id === field.targetObjectFormatId);
  const grants = collection.sharedObjects.filter((item) => !item.revokedAt && item.sourceFormatId === field.targetObjectFormatId && (item.mode === "CURRENT" || field.referenceMode === "SNAPSHOT"));
  const titleId = target?.fields.find((item) => item.kind === "TITLE")?.id ?? grants[0]?.snapshot.find((item) => item.kind === "TITLE")?.fieldId;
  useEffect(() => {
    if (!field.targetObjectFormatId) return;
    if (!target) {
      const matching = collection.sharedObjects.filter((item) => !item.revokedAt && item.sourceFormatId === field.targetObjectFormatId && (item.mode === "CURRENT" || field.referenceMode === "SNAPSHOT") && item.objectName.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
      queueMicrotask(() => setPage({ entries: matching.map((item) => ({ id: item.objectId, formatId: item.sourceFormatId, values: item.snapshot.map((property) => ({ fieldId: property.fieldId, value: property.value })), createdAt: item.createdAt, updatedAt: item.createdAt })), nextCursor: null, hasMore: false }));
      return;
    }
    let active = true;
    api.objectsPage(collection.id, field.targetObjectFormatId, { search: search || undefined }).then((result) => { if (active) setPage(result); }).catch((cause) => { if (active) setError(errorMessage(cause, language)); });
    return () => { active = false; };
  }, [collection, target, field.targetObjectFormatId, field.referenceMode, search, language]);
  useEffect(() => {
    if (!entryId) return;
    api.entryObjectReferences(entryId).then((references) => setKnown(Object.fromEntries(references.filter((item) => item.fieldId === field.id).map((item) => [item.objectId, item.name ?? item.objectId])))).catch(() => {});
  }, [entryId, field.id]);
  function choose(id: string) {
    onChange(JSON.stringify(field.multiple ? selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id] : [id]));
  }
  return <div className="input-label object-reference-picker"><span>{field.name} · {fieldKindLabel(language, "OBJECT_REF")}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === "fr" ? "Rechercher un objet" : "Search for an object"} /><div className="object-reference-results">{page?.entries.map((item) => { const name = item.values.find((entryValue) => entryValue.fieldId === titleId)?.value ?? item.id; return <button type="button" key={item.id} className={selected.includes(item.id) ? "selected" : ""} aria-pressed={selected.includes(item.id)} onClick={() => choose(item.id)}>{name} {selected.includes(item.id) ? "✓" : ""}</button>; })}</div>{page?.nextCursor && <button type="button" onClick={() => api.objectsPage(collection.id, field.targetObjectFormatId!, { after: page.nextCursor!, search: search || undefined }).then((next) => setPage({ entries: [...page.entries, ...next.entries], nextCursor: next.nextCursor, hasMore: next.hasMore })).catch((cause) => setError(errorMessage(cause, language)))}>{language === "fr" ? "Voir plus" : "Load more"}</button>}{selected.length > 0 && <div>{language === "fr" ? "Sélection" : "Selected"}: {selected.map((id) => page?.entries.find((item) => item.id === id)?.values.find((item) => item.fieldId === titleId)?.value ?? known[id] ?? id).join(", ")} <button type="button" onClick={() => onChange("")}>{language === "fr" ? "Effacer" : "Clear"}</button></div>}{error && <span role="alert">{error}</span>}</div>;
}

function EntryEditor({ collection, entry, initialFormatId, language, onClose, onSaved }: { collection: Collection; entry?: Entry; initialFormatId?: string; language: Language; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const [values, setValues] = useState<Record<string, string>>(entry ? valuesByField(entry) : {});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [formatId, setFormatId] = useState(entry?.formatId ?? initialFormatId ?? collection.formats[0].id);
  const format = collection.formats.find((item) => item.id === formatId) ?? collection.formats[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<{ key: string; count: number } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const clean = format.fields.map((field) => ({ fieldId: field.id, value: (values[field.id] ?? "").trim() })).filter((item) => item.value && item.value !== "[]");
    if (!clean.length) return setError(t(language, "emptyEntry"));
    const chosenFiles = Object.values(files);
    if (chosenFiles.some((file) => file.size === 0 || file.size > 2_097_152) || chosenFiles.reduce((total, file) => total + file.size, 0) > 8_388_608) return setError(t(language, "fileTooLarge"));
    for (const item of clean) {
      const field = format.fields.find((field) => field.id === item.fieldId)!;
      if (item.value.length > (field.kind === "LONG_TEXT" ? 50000 : 10000)) return setError(t(language, "tooLong"));
      if (field.kind === "NUMBER") {
        item.value = item.value.replace(",", ".");
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(item.value) || !Number.isFinite(Number(item.value))) return setError(t(language, "invalidNumber"));
      }
      if (field.kind === "DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(item.value)) return setError(t(language, "invalidDate"));
      if (field.kind === "TIME" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.value)) return setError(t(language, "invalidTime"));
      if (field.kind === "LINK") {
        try { const url = new URL(item.value); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
        catch { return setError(t(language, "invalidLink")); }
      }
      if (field.kind === "CHARACTER" && [...item.value].length !== 1) return setError(t(language, "oneCharacter"));
      if (field.kind === "DATETIME") {
        const date = new Date(item.value);
        if (Number.isNaN(date.getTime())) return setError(t(language, "invalidDateTime"));
        item.value = date.toISOString();
      }
      if (field.kind === "DURATION" && !/^\d{1,6}:[0-5]\d$/.test(item.value)) return setError(t(language, "invalidDuration"));
    }
    setBusy(true);
    try {
      for (const item of clean) {
        const field = format.fields.find((candidate) => candidate.id === item.fieldId)!;
        if (field.kind !== "LINK") continue;
        const key = `${format.id}:${field.id}:${new URL(item.value).href}`;
        if (duplicate?.key === key) continue;
        const matches = await api.duplicateLinks(collection.id, format.id, field.id, item.value, entry?.id);
        if (matches.length) { setDuplicate({ key, count: matches.length }); return; }
      }
      const payload = await Promise.all(clean.map(async (item) => files[item.fieldId] ? { ...item, attachmentBase64: await fileBase64(files[item.fieldId]), attachmentMimeType: files[item.fieldId].type || "application/octet-stream" } : item));
      onSaved(await api.saveEntry(collection.id, payload, entry?.id, format.id));
    }
    catch (error) { setError(errorMessage(error, language)); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={format.objectModel ? (language === "fr" ? entry ? "Modifier l’objet" : "Créer un objet" : entry ? "Edit object" : "Create object") : t(language, entry ? "editEntry" : "newEntry")} closeLabel={t(language, "close")} onClose={onClose} size="wide">
      <form onSubmit={submit} className="modal-form entry-form">
        <div className="entry-form-context"><FolderHeart size={18} /> {collection.name}</div>
        {entry || initialFormatId ? <div className="selected-format" style={{ "--format-color": format.color } as CSSProperties}>{formatDisplayName(format, language)}</div> : <label className="input-label">{t(language, "chooseFormat")}<select value={formatId} onChange={(event) => setFormatId(event.target.value)}>{collection.formats.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item, language)}</option>)}</select></label>}
        <div className="entry-format-fields" style={{ "--format-color": format.color } as CSSProperties}>
        {format.fields.map((field, index) => field.kind === "ATTACHMENT" ? <div className="input-label attachment-input" key={field.id}><span>{field.name} · {t(language, "attachment")}</span><input type="file" aria-label={`${t(language, "chooseFile")}: ${field.name}`} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.size || file.size > 2_097_152) { setError(t(language, "fileTooLarge")); return; } setFiles((current) => ({ ...current, [field.id]: file })); setValues((current) => ({ ...current, [field.id]: file.name })); setError(""); }} />{values[field.id] && <div className="attachment-actions"><span>{values[field.id]}</span><button type="button" onClick={() => { setValues((current) => ({ ...current, [field.id]: "" })); setFiles((current) => { const next = { ...current }; delete next[field.id]; return next; }); }}>{t(language, "removeFile")}</button>{entry && !files[field.id] && <button type="button" onClick={() => downloadAttachment(entry.id, field.id).catch((cause) => setError(errorMessage(cause, language)))}>{t(language, "downloadFile")}</button>}</div>}</div> : field.kind === "OBJECT_REF" ? <ObjectReferencePicker key={field.id} collection={collection} field={field} language={language} value={values[field.id] ?? ""} entryId={entry?.id} onChange={(next) => setValues((current) => ({ ...current, [field.id]: next }))} /> : <label className={`input-label ${field.kind === "TITLE" ? "entry-field-title" : ["TEXT", "LONG_TEXT", "MULTI_SELECT", "LINK"].includes(field.kind) ? "entry-field-long" : ""}`} key={field.id}><span className="entry-field-heading"><strong>{field.name}</strong><small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>
          {field.kind === "TEXT" || field.kind === "LONG_TEXT" ? <textarea rows={field.kind === "LONG_TEXT" ? 6 : 3} autoFocus={index === 0} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} maxLength={field.kind === "LONG_TEXT" ? 50000 : 10000} /> : field.kind === "BOOLEAN" ? <select value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">—</option><option value="true">{t(language, "yes")}</option><option value="false">{t(language, "no")}</option></select> : field.kind === "SELECT" ? <select value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}><option value="">—</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.kind === "MULTI_SELECT" ? <select multiple size={Math.min(6, Math.max(3, field.options?.length ?? 3))} value={(() => { try { return JSON.parse(values[field.id] || "[]") as string[]; } catch { return []; } })()} onChange={(event) => setValues((current) => ({ ...current, [field.id]: JSON.stringify(Array.from(event.target.selectedOptions, (option) => option.value)) }))}>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input autoFocus={index === 0} type={field.kind === "DATE" ? "date" : field.kind === "DATETIME" ? "datetime-local" : field.kind === "TIME" ? "time" : field.kind === "LINK" ? "url" : "text"} inputMode={field.kind === "NUMBER" || field.kind === "DURATION" ? "decimal" : undefined} value={field.kind === "DATETIME" && values[field.id] ? (() => { const date = new Date(values[field.id]); if (Number.isNaN(date.getTime())) return values[field.id]; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); })() : values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} maxLength={field.kind === "CHARACTER" ? 2 : 10000} placeholder={field.kind === "LINK" ? "https://" : field.kind === "NUMBER" ? "0" : field.kind === "DURATION" ? "1:30" : undefined} />}
        </label>)}
        </div>
        {duplicate && <div className="form-error" role="status">{language === "fr" ? `Ce lien existe déjà dans ${duplicate.count} entrée(s). Enregistrer encore ?` : `This link already exists in ${duplicate.count} entry(s). Save anyway?`} <button type="button" onClick={() => setDuplicate(null)}>{language === "fr" ? "Vérifier le lien" : "Check link"}</button></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button><Button type="submit" disabled={busy}>{busy ? t(language, "saving") : format.objectModel ? language === "fr" ? "Enregistrer l’objet" : "Save object" : t(language, "saveEntry")} <Check size={17} /></Button></div>
      </form>
    </Modal>
  );
}

function EntryReferenceDetails({ entry, field, language }: { entry: Entry; field: Collection["formats"][number]["fields"][number]; language: Language }) {
  const [references, setReferences] = useState<Awaited<ReturnType<typeof api.entryObjectReferences>> | null>(null);
  const [error, setError] = useState("");
  const count = entry.values.find((item) => item.fieldId === field.id)?.objectIds?.length ?? 0;
  return <details className="entry-reference-details" onToggle={(event) => { if (event.currentTarget.open) api.entryObjectReferences(entry.id).then(setReferences).catch((cause) => setError(errorMessage(cause, language))); }}><summary>{field.name}: {count} {language === "fr" ? "objet(s)" : "object(s)"}</summary>{references?.filter((item) => item.fieldId === field.id).map((item) => <div key={item.objectId}><strong>{item.name ?? item.objectId}</strong> · {item.mode === "SNAPSHOT" ? language === "fr" ? "valeurs figées" : "snapshot" : language === "fr" ? "valeurs actuelles" : "current values"}{item.capturedAt && <small> · {dateTime(item.capturedAt, language)}</small>}{item.missing ? <p>{language === "fr" ? "Objet indisponible" : "Object unavailable"}</p> : <ul>{item.properties.map((property) => <li key={property.fieldId}>{property.name}: {formatFieldValue({ id: property.fieldId, name: property.name, kind: property.kind }, property.value, language, property.unitSnapshot)}</li>)}</ul>}</div>)}{error && <span role="alert">{error}</span>}</details>;
}

function CopyToCollection({ source, targets, objectId, formatId, move = false, link = false, language, onClose, onCopied }: { source: Collection; targets: Collection[]; objectId?: string; formatId?: string; move?: boolean; link?: boolean; language: Language; onClose: () => void; onCopied: () => void }) {
  const [targetId, setTargetId] = useState("");
  const [withEntries, setWithEntries] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.objectCopyPreview>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!targetId) return;
    let active = true;
    const query = objectId ? move ? api.objectMovePreview(objectId, targetId) : api.objectCopyPreview(objectId, targetId) : api.dataFormatCopyPreview(formatId!, targetId, withEntries && !link);
    query.then((result) => { if (active) setPreview(result); }).catch((cause) => { if (active) setError(errorMessage(cause, language)); });
    return () => { active = false; };
  }, [targetId, objectId, formatId, withEntries, language, move, link]);
  async function copy() {
    if (!targetId || !preview?.allowed) return;
    setBusy(true); setError("");
    try { if (objectId) { if (move) await api.moveObject(objectId, targetId); else await api.copyObject(objectId, targetId); } else if (link) await api.linkDataFormat(formatId!, targetId); else await api.copyDataFormat(formatId!, targetId, withEntries); onCopied(); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={link ? language === "fr" ? "Lier un format de données" : "Link a data format" : move ? language === "fr" ? "Déplacer vers une collection" : "Move to a collection" : language === "fr" ? "Copier vers une collection" : "Copy to a collection"} closeLabel={t(language, "close")} onClose={onClose}>
    <div className="modal-form">
      <p className="modal-intro">{source.name} · {objectId ? language === "fr" ? "Objet et dépendances" : "Object and dependencies" : language === "fr" ? "Format de données et dépendances" : "Data format and dependencies"}</p>
      <label className="input-label">{language === "fr" ? "Collection cible" : "Target collection"}<select value={targetId} onChange={(event) => { setTargetId(event.target.value); setPreview(null); setError(""); }}><option value="">—</option>{targets.filter((item) => item.id !== source.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {formatId && !link && <label className="object-choice"><input type="checkbox" checked={withEntries} onChange={(event) => { setWithEntries(event.target.checked); setPreview(null); }} />{language === "fr" ? "Copier aussi les entrées et objets référencés" : "Also copy entries and referenced objects"}</label>}
      {link && <p className="modal-intro">{language === "fr" ? "La cible garde sa propre version. Elle choisira quand accepter les changements de la source." : "The target keeps its own version and chooses when to accept source changes."}</p>}
      {preview && <section className="copy-preview"><p>{preview.entries} {language === "fr" ? "entrée(s), dont" : "entries, including"} {preview.objects} {language === "fr" ? "objet(s)" : "objects"}</p><p>{language === "fr" ? "Formats de données" : "Data formats"}: {preview.dataFormats.join(", ")}</p>{preview.units.length > 0 && <p>{language === "fr" ? "Unités" : "Units"}: {preview.units.join(", ")}</p>}{preview.formulas.length > 0 && <p>{language === "fr" ? "Formules copiées" : "Copied formulas"}: {preview.formulas.join(", ")}</p>}{preview.stockMovementCount > 0 && <p role="note">{language === "fr" ? `${preview.stockMovementCount} mouvement(s) de stock restent dans la collection source. La copie ne crée aucun stock dans la cible.` : `${preview.stockMovementCount} stock movements remain in the source collection. Copying creates no stock in the target.`}</p>}{preview.conflicts.map((item) => <p role="alert" key={item}>{item}</p>)}</section>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button><Button disabled={busy || !preview?.allowed} onClick={copy}>{link ? language === "fr" ? "Lier" : "Link" : move ? language === "fr" ? "Déplacer" : "Move" : language === "fr" ? "Copier" : "Copy"}</Button></div>
    </div>
  </Modal>;
}

function LinkedFormatUpdate({ collection, formatId, language, onClose, onChanged }: { collection: Collection; formatId: string; language: Language; onClose: () => void; onChanged: (updated: Collection) => void }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof api.linkedDataFormatUpdatePreview>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.linkedDataFormatUpdatePreview(collection.id, formatId).then(setPreview).catch((cause) => setError(errorMessage(cause, language))); }, [collection.id, formatId, language]);
  async function act(detach: boolean) {
    if (!preview && !detach) return;
    setBusy(true); setError("");
    try {
      const updated = detach ? await api.detachLinkedDataFormat(collection.id, formatId) : await api.acceptLinkedDataFormatVersion(collection.id, formatId, preview!.sourceVersion);
      onChanged(updated);
    } catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={language === "fr" ? "Mise à jour du format de données lié" : "Linked data format update"} closeLabel={t(language, "close")} onClose={onClose}>
    <div className="modal-form">
      {preview && <section className="copy-preview">
        <p>{language === "fr" ? "Version acceptée" : "Accepted version"}: {preview.acceptedVersion} · {language === "fr" ? "Version source" : "Source version"}: {preview.sourceVersion}</p>
        {preview.addedFields.length > 0 && <p>{language === "fr" ? "Champs ajoutés" : "Added fields"}: {preview.addedFields.join(", ")}</p>}
        {preview.changedFields.length > 0 && <p>{language === "fr" ? "Champs modifiés" : "Changed fields"}: {preview.changedFields.join(", ")}</p>}
        {preview.removedFields.length > 0 && <p>{language === "fr" ? "Champs supprimés" : "Removed fields"}: {preview.removedFields.join(", ")}</p>}
        {preview.conflicts.map((item) => <p role="alert" key={item}>{item}</p>)}
      </section>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button><Button variant="secondary" disabled={busy} onClick={() => act(true)}>{language === "fr" ? "Détacher" : "Detach"}</Button><Button disabled={busy || !preview?.allowed} onClick={() => act(false)}>{language === "fr" ? "Accepter la version" : "Accept version"}</Button></div>
    </div>
  </Modal>;
}

function ShareObjectToCollection({ source, targets, object, language, onClose, onShared }: { source: Collection; targets: Collection[]; object: Entry; language: Language; onClose: () => void; onShared: () => void }) {
  const format = source.formats.find((item) => item.id === object.formatId)!;
  const title = format.fields.find((item) => item.kind === "TITLE")!;
  const [targetId, setTargetId] = useState("");
  const [propertyIds, setPropertyIds] = useState<string[]>([title.id]);
  const [mode, setMode] = useState<"CURRENT" | "SNAPSHOT">("CURRENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const conflict = targets.find((item) => item.id === targetId)?.sharedObjects.some((item) => item.objectId === object.id && !item.revokedAt);
  async function share() {
    if (!targetId || conflict) return;
    setBusy(true); setError("");
    try { await api.shareObject(object.id, targetId, propertyIds, mode); onShared(); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={language === "fr" ? "Partager un objet par lien" : "Share an object by link"} closeLabel={t(language, "close")} onClose={onClose}>
    <div className="modal-form">
      <p className="modal-intro">{source.name} · {object.values.find((item) => item.fieldId === title.id)?.value}</p>
      <label className="input-label">{language === "fr" ? "Collection cible" : "Target collection"}<select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">—</option>{targets.filter((item) => item.id !== source.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <fieldset className="share-properties"><legend>{language === "fr" ? "Caractéristiques autorisées" : "Allowed properties"}</legend>{format.fields.filter((item) => item.kind !== "OBJECT_REF" && item.kind !== "ATTACHMENT").map((item) => <label key={item.id}><input type="checkbox" checked={propertyIds.includes(item.id)} disabled={item.id === title.id} onChange={(event) => setPropertyIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />{item.name}</label>)}</fieldset>
      <label className="input-label">{language === "fr" ? "Valeurs accessibles" : "Accessible values"}<select value={mode} onChange={(event) => setMode(event.target.value as "CURRENT" | "SNAPSHOT")}><option value="CURRENT">{language === "fr" ? "Actuelles jusqu’à révocation" : "Current until revoked"}</option><option value="SNAPSHOT">{language === "fr" ? "Figées au partage" : "Snapshot when shared"}</option></select></label>
      <p className="modal-intro">{language === "fr" ? "Le partage donne accès aux caractéristiques choisies. Le stock et ses mouvements restent dans la collection source." : "Sharing grants access to the chosen properties. Stock and its movements remain in the source collection."}</p>
      {conflict && <p role="alert">{language === "fr" ? "Cet objet est déjà lié à cette collection." : "This object is already linked to this collection."}</p>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button><Button disabled={busy || !targetId || !!conflict} onClick={share}>{language === "fr" ? "Partager par lien" : "Share by link"}</Button></div>
    </div>
  </Modal>;
}

function EntryCard({ entry, collection, language, onEdit, onDelete, onCopy, onReminder, onLinks }: { entry: Entry; collection: Collection; language: Language; onEdit: () => void; onDelete: () => void; onCopy: () => void; onReminder?: () => void; onLinks?: () => void }) {
  const format = formatForEntry(collection, entry);
  const values = valuesByField(entry);
  const visible = format.fields.filter((field) => values[field.id]?.trim());
  const titleField = visible.find((field) => field.kind === "TITLE");
  const title = titleField ? values[titleField.id] : null;
  const other = visible.filter((field) => field.id !== titleField?.id);
  const edited = Math.abs(new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime()) > 2000;
  return (
    <article className="entry-card entry-row" style={{ "--format-color": format.color } as CSSProperties}>
      <div className="entry-row-body">
        <div className="entry-row-meta">
          <span className="entry-format-label">{formatDisplayName(format, language)}</span>
          <span className="entry-date"><CalendarDays size={14} /> {t(language, "created")} {dateTime(entry.createdAt, language)}</span>
          {edited && <span className="entry-edited">{t(language, "edited")} {dateTime(entry.updatedAt, language)}</span>}
        </div>
        <div className="entry-row-content">
          {title && <h3 className="entry-title">{title}</h3>}
          <div className="entry-values">
            {other.map((field) => <div className="entry-value" key={field.id}>{field.kind === "OBJECT_REF" ? <EntryReferenceDetails entry={entry} field={field} language={language} /> : <><span className="entry-field-name">{field.name}</span>{field.kind === "LINK" ? <a href={values[field.id]} target="_blank" rel="noopener noreferrer"><Link2 size={13} />{values[field.id]}</a> : field.kind === "ATTACHMENT" ? <button type="button" className="attachment-download" onClick={() => downloadAttachment(entry.id, field.id).catch((cause) => window.alert(errorMessage(cause, language)))} title={t(language, "downloadFile")}>{values[field.id]}</button> : <span className="entry-field-value">{formatFieldValue(field, values[field.id], language, entry.values.find((item) => item.fieldId === field.id)?.unitSnapshot)}</span>}</>}</div>)}
          </div>
        </div>
        <div className="entry-actions"><button type="button" className="small-action copy-action" onClick={onCopy} title={t(language, "copyEntry")}><Copy size={16} /><span>{t(language, "copyEntry")}</span></button>{onLinks && <button type="button" className="small-action" onClick={onLinks} title={language === "fr" ? "Liens entre entrées" : "Entry links"} aria-label={language === "fr" ? "Liens entre entrées" : "Entry links"}><Link2 size={16} /></button>}{onReminder && <button type="button" className="small-action" onClick={onReminder} title={language === "fr" ? "Rappels" : "Reminders"} aria-label={language === "fr" ? "Rappels" : "Reminders"}><Bell size={16} /></button>}<button type="button" className="small-action" onClick={onEdit} title={t(language, "edit")} aria-label={t(language, "edit")}><Pencil size={16} /></button><button type="button" className="small-action danger-hover" onClick={onDelete} title={t(language, "delete")} aria-label={t(language, "delete")}><Trash2 size={16} /></button></div>
      </div>
    </article>
  );
}

function ObjectLibrary({ collection, language, onClose, onCollection, onCreate, onEdit, onCopyTo, onMoveTo, onShareTo, onChanged }: {
  collection: Collection; language: Language; onClose: () => void; onCollection: (value: Collection) => void;
  onCreate: (formatId: string) => void; onEdit: (entry: Entry) => void; onCopyTo: (objectId: string) => void; onMoveTo: (objectId: string) => void; onShareTo: (object: Entry) => void; onChanged: () => void;
}) {
  const models = collection.formats.filter((format) => format.objectModel);
  const [formatId, setFormatId] = useState(models[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof api.objectTemplates>>>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [existingId, setExistingId] = useState("");
  const [target, setTarget] = useState("");
  const [pendingConversion, setPendingConversion] = useState<{ formatId: string; count: number } | null>(null);
  const [setupOpen, setSetupOpen] = useState(models.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textFields = collection.formats.filter((format) => !format.objectModel).flatMap((format) => format.fields.filter((field) => ["TITLE", "TEXT", "LONG_TEXT"].includes(field.kind)).map((field) => ({ format, field })));

  useEffect(() => { api.objectTemplates(language).then(setTemplates).catch((cause) => setError(errorMessage(cause, language))); }, [language]);
  useEffect(() => {
    if (!formatId) return;
    let active = true;
    api.objectsPage(collection.id, formatId, { search: search || undefined }).then((page) => {
      if (active) { setEntries(page.entries); setCursor(page.nextCursor ?? null); }
    }).catch((cause) => { if (active) setError(errorMessage(cause, language)); });
    return () => { active = false; };
  }, [collection.id, formatId, search, language]);
  async function reload() {
    const page = await api.objectsPage(collection.id, formatId, { search: search || undefined });
    setEntries(page.entries); setCursor(page.nextCursor ?? null); onChanged();
  }
  async function addTemplate() {
    const color = formatColors.find((candidate) => !collection.formats.some((format) => format.color === candidate));
    if (!templateId || !templateName.trim() || !color) return;
    setBusy(true); setError("");
    try { const updated = await api.addObjectTemplate(collection.id, templateId, templateName.trim(), color, language); onCollection(updated); setFormatId(updated.formats.at(-1)?.id ?? ""); setTemplateId(""); setTemplateName(""); setSetupOpen(false); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function markExisting(expectedEntryCount?: number) {
    const format = collection.formats.find((item) => item.id === existingId);
    if (!format) return;
    setBusy(true); setError("");
    try {
      if (expectedEntryCount === undefined) {
        const impact = await api.formatImpact(collection.id, format.id);
        if (impact.entryCount > 0) { setPendingConversion({ formatId: format.id, count: impact.entryCount }); return; }
      }
      const updated = await api.setObjectModel(collection.id, format.id, true, format.version ?? 1, expectedEntryCount);
      onCollection(updated); setFormatId(format.id); setExistingId(""); setPendingConversion(null); setSetupOpen(false);
    }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function showDetail(entry: Entry) {
    setBusy(true); setError("");
    try { setDetail(await api.objectDetail(entry.id)); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function duplicate() {
    if (!detail) return;
    setBusy(true); setError("");
    try { await api.duplicateObject(detail.id); setDetail(null); await reload(); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function useInEntry() {
    if (!detail || !target) return;
    const [targetFormatId, targetFieldId] = target.split("|");
    setBusy(true); setError("");
    try { await api.useObject(detail.id, targetFormatId, targetFieldId); setDetail(null); await reload(); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  const model = collection.formats.find((format) => format.id === formatId);
  const titleField = model?.fields.find((field) => field.kind === "TITLE");
  return <Modal title={language === "fr" ? "Objets de la collection" : "Collection objects"} closeLabel={t(language, "close")} onClose={onClose} size="wide">
    <div className="object-library">
      <p className="modal-intro">{language === "fr" ? "Un objet est une entrée nommée de cette collection. Ses caractéristiques restent modifiables." : "An object is a named entry in this collection. You can edit its characteristics."}</p>
      <section className="object-model-setup"><button type="button" className="object-model-toggle" aria-expanded={setupOpen} onClick={() => setSetupOpen((current) => !current)}><span>{language === "fr" ? "Ajouter un modèle d’objets" : "Add an object model"}</span><ChevronDown size={18} /></button>
      {setupOpen && <div className="object-model-setup-body"><p className="modal-intro">{language === "fr" ? "Copiez un modèle proposé ou transformez un format de données existant." : "Copy a suggested model or use an existing data format."}</p>
      <div className="object-setup">
        <label>{language === "fr" ? "Modèle de départ" : "Starter model"}<select value={templateId} onChange={(event) => { setTemplateId(event.target.value); setTemplateName(templates.find((item) => item.id === event.target.value)?.name ?? ""); }}><option value="">—</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{t(language, "formatName")}<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} /></label>
        <Button variant="secondary" disabled={busy || !templateId || !templateName.trim() || collection.formats.length >= 24} onClick={addTemplate}>{language === "fr" ? "Copier le modèle ici" : "Copy model here"}</Button>
      </div>
      <div className="object-setup"><label>{language === "fr" ? "Format de données existant" : "Existing data format"}<select value={existingId} onChange={(event) => { setExistingId(event.target.value); setPendingConversion(null); }}><option value="">—</option>{collection.formats.filter((format) => !format.objectModel && format.fields.some((field) => field.kind === "TITLE")).map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label><Button variant="secondary" disabled={busy || !existingId} onClick={() => void markExisting()}>{language === "fr" ? "Utiliser pour des objets" : "Use for objects"}</Button></div>
      {pendingConversion?.formatId === existingId && <div className="object-setup" role="group" aria-label={language === "fr" ? "Confirmer la conversion" : "Confirm conversion"}><p className="modal-intro">{language === "fr" ? `Les ${pendingConversion.count} entrées de ce format de données deviendront des objets. Leurs valeurs seront conservées.` : `All ${pendingConversion.count} entries in this data format will become objects. Their values will be kept.`}</p><Button disabled={busy} onClick={() => void markExisting(pendingConversion.count)}>{language === "fr" ? "Confirmer la conversion" : "Confirm conversion"}</Button><Button variant="secondary" onClick={() => setPendingConversion(null)}>{t(language, "cancel")}</Button></div>}</div>}
      </section>
      {models.length > 0 && <><div className="object-setup"><label>{language === "fr" ? "Modèle d’objet" : "Object model"}<select value={formatId} onChange={(event) => { setFormatId(event.target.value); setDetail(null); }}><option value="">—</option>{models.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label><label>{language === "fr" ? "Rechercher des objets" : "Search objects"}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label><Button disabled={!formatId} onClick={() => onCreate(formatId)}><Plus size={16} />{language === "fr" ? "Créer un objet" : "Create object"}</Button></div>
      <div className="object-list">{entries.length ? entries.map((entry) => <button type="button" key={entry.id} onClick={() => void showDetail(entry)}><strong>{entry.values.find((value) => value.fieldId === titleField?.id)?.value ?? "—"}</strong><span>{dateTime(entry.updatedAt, language)}</span></button>) : <p className="object-empty">{language === "fr" ? "Aucun objet pour ce modèle." : "No objects in this model yet."}</p>}</div>
      {cursor && <Button variant="secondary" disabled={busy} onClick={async () => { if (!cursor) return; setBusy(true); try { const page = await api.objectsPage(collection.id, formatId, { after: cursor, search: search || undefined }); setEntries((current) => [...current, ...page.entries]); setCursor(page.nextCursor ?? null); } catch (cause) { setError(errorMessage(cause, language)); } finally { setBusy(false); } }}>{t(language, "loadMore")}</Button>}</>}
      {detail && model && <section className="object-detail"><h3>{detail.values.find((value) => value.fieldId === titleField?.id)?.value}</h3><p>{t(language, "created")} {dateTime(detail.createdAt, language)} · {t(language, "edited")} {dateTime(detail.updatedAt, language)}</p>{model.fields.map((field) => { const value = detail.values.find((item) => item.fieldId === field.id); return value ? <div key={field.id}><b>{field.name}</b><span>{formatFieldValue(field, value.value, language, value.unitSnapshot)}</span></div> : null; })}<p>{language === "fr" ? "Versions précédentes" : "Previous versions"}: {detail.revisions?.length ?? 0}</p>{detail.revisions?.map((revision, index) => <details key={`${revision.at}-${index}`}><summary>{dateTime(revision.at, language)}</summary>{revision.values.map((value) => { const field = model.fields.find((item) => item.id === value.fieldId); return field ? <div key={value.fieldId}><b>{field.name}</b><span>{formatFieldValue(field, value.value, language, value.unitSnapshot)}</span></div> : null; })}</details>)}<div className="object-detail-actions"><Button variant="secondary" onClick={() => onEdit(detail)}>{t(language, "edit")}</Button><Button variant="secondary" disabled={busy} onClick={duplicate}>{language === "fr" ? "Dupliquer" : "Duplicate"}</Button><Button variant="secondary" onClick={() => onCopyTo(detail.id)}>{language === "fr" ? "Copier vers…" : "Copy to…"}</Button><Button variant="secondary" onClick={() => onShareTo(detail)}>{language === "fr" ? "Partager par lien…" : "Share by link…"}</Button></div><div className="object-setup"><label>{language === "fr" ? "Champ de destination" : "Destination field"}<select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">—</option>{textFields.map(({ format, field }) => <option key={`${format.id}|${field.id}`} value={`${format.id}|${field.id}`}>{format.name} · {field.name}</option>)}</select></label><Button variant="secondary" disabled={busy || !target} onClick={useInEntry}>{language === "fr" ? "Utiliser dans une entrée" : "Use in an entry"}</Button></div><p className="modal-intro">{language === "fr" ? "Cette action crée une entrée avec un résumé figé de l’objet." : "This creates an entry with a snapshot of the object's details."}</p></section>}
      {detail && model && <div className="object-detail-actions"><Button variant="secondary" onClick={() => onMoveTo(detail.id)}>{language === "fr" ? "Déplacer vers…" : "Move to…"}</Button></div>}
      {collection.sharedObjects.length > 0 && <section className="linked-objects"><h3>{language === "fr" ? "Objets liés à cette collection" : "Objects linked to this collection"}</h3>{collection.sharedObjects.map((grant) => <div key={grant.id}><span>{grant.sourceName} · {grant.objectName} · {grant.mode === "CURRENT" ? language === "fr" ? "actuel" : "current" : language === "fr" ? "instantané" : "snapshot"}</span>{grant.revokedAt ? <span>{language === "fr" ? "Révoqué" : "Revoked"}</span> : <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await api.revokeObjectShare(collection.id, grant.id); onChanged(); } catch (cause) { setError(errorMessage(cause, language)); } finally { setBusy(false); } }}>{language === "fr" ? "Révoquer" : "Revoke"}</Button>}</div>)}</section>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "close")}</Button></div>
    </div>
  </Modal>;
}

function UnitEditor({ collection, language, onClose, onSaved }: { collection: Collection; language: Language; onClose: () => void; onSaved: (collection: Collection) => void }) {
  const [available, setAvailable] = useState<CollectionUnit[]>([]);
  const [editing, setEditing] = useState<CollectionUnit | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [dimension, setDimension] = useState("COUNT");
  const [baseUnitId, setBaseUnitId] = useState("");
  const [factor, setFactor] = useState("1");
  const [objectFormatId, setObjectFormatId] = useState("");
  const [amount, setAmount] = useState("20");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("km");
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [conversion, setConversion] = useState("");
  const [rateFrom, setRateFrom] = useState("EUR");
  const [rateTo, setRateTo] = useState("USD");
  const [rate, setRate] = useState("");
  const [unitEditorOpen, setUnitEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api.availableUnits(collection.id).then(setAvailable).catch((cause) => setError(errorMessage(cause, language))); }, [collection.id, collection.units, language]);
  const unitName = (unit: CollectionUnit) => numberUnits.find((item) => item.code === unit.id) ? unitLabel(numberUnits.find((item) => item.code === unit.id)!, language) : `${unit.name} (${unit.symbol})`;
  function edit(unit: CollectionUnit | null) { setEditing(unit); setName(unit?.name ?? ""); setSymbol(unit?.symbol ?? ""); setDimension(unit?.dimension ?? "COUNT"); setBaseUnitId(unit?.baseUnitId ?? ""); setFactor(unit?.factor ?? "1"); setObjectFormatId(unit?.objectFormatId ?? ""); setUnitEditorOpen(true); setError(""); }
  async function saveUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { const updated = await api.saveUnit(collection.id, { name, symbol, dimension: dimension.toUpperCase(), baseUnitId: baseUnitId || undefined, factor: factor.replace(",", "."), objectFormatId: objectFormatId || undefined, expectedVersion: editing?.version }, editing?.id); onSaved(updated); edit(null); setUnitEditorOpen(false); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function convert() {
    setBusy(true); setError("");
    try { const result = await api.convertQuantity(collection.id, amount.replace(",", "."), from, to, `${asOf}T23:59:59Z`); setConversion(`${amount} ${result.fromSymbol} = ${result.value} ${result.toSymbol}${result.rateDate ? ` · ${new Date(result.rateDate).toLocaleDateString(language)}` : ""}`); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function saveRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { const updated = await api.recordExchangeRate(collection.id, { from: rateFrom, to: rateTo, rate: rate.replace(",", "."), effectiveAt: `${asOf}T00:00:00Z` }); onSaved(updated); setRate(""); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  const money = available.filter((unit) => unit.dimension === "CURRENCY");
  return <Modal title={t(language, "manageUnits")} closeLabel={t(language, "close")} onClose={onClose} size="wide"><div className="units-panel">
    <section className="unit-converter"><h3>{t(language, "convert")}</h3><p className="modal-intro">{language === "fr" ? "Choisissez une quantité et deux unités compatibles." : "Choose an amount and two compatible units."}</p><div className="unit-form"><label>{t(language, "amount")}<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /></label><label>{t(language, "fromUnit")}<select value={from} onChange={(event) => setFrom(event.target.value)}>{available.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label><label>{t(language, "toUnit")}<select value={to} onChange={(event) => setTo(event.target.value)}>{available.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label><label>{t(language, "asOf")}<input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} /></label><Button type="button" disabled={busy} onClick={convert}>{t(language, "convert")}</Button>{conversion && <strong className="unit-result" role="status">{conversion}</strong>}</div>
      <details className="form-disclosure"><summary>{t(language, "exchangeRate")}</summary><p>{t(language, "rateHelp")}</p><form onSubmit={saveRate} className="unit-form"><label>{t(language, "fromUnit")}<select value={rateFrom} onChange={(event) => setRateFrom(event.target.value)}>{money.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label><label>{t(language, "toUnit")}<select value={rateTo} onChange={(event) => setRateTo(event.target.value)}>{money.map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label><label>{t(language, "rateValue")}<input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" required /></label><Button type="submit" disabled={busy}>{t(language, "saveRate")}</Button></form></details>
    </section>
    <section className="unit-library"><div className="form-card-heading"><h3>{t(language, "localUnits")}</h3><Button variant="secondary" onClick={() => edit(null)}><Plus size={16} />{t(language, "newUnit")}</Button></div><div className="local-unit-list">{collection.units.length ? collection.units.map((unit) => <button key={unit.id} type="button" onClick={() => edit(unit)}>{unit.name} <span>{unit.symbol} · {unit.dimension} · ×{unit.factor}</span><Pencil size={14} /></button>) : <p className="modal-intro">{language === "fr" ? "Aucune unité locale pour le moment." : "No collection units yet."}</p>}</div>
      {unitEditorOpen && <form onSubmit={saveUnit} className="unit-form unit-editor-form"><div className="form-card-heading"><h3>{editing ? language === "fr" ? "Modifier l’unité" : "Edit unit" : t(language, "newUnit")}</h3><button type="button" className="form-text-action" onClick={() => setUnitEditorOpen(false)}>{t(language, "cancel")}</button></div><label>{t(language, "unitName")}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label><label>{t(language, "unitSymbol")}<input value={symbol} onChange={(event) => setSymbol(event.target.value)} maxLength={24} required /></label><label>{t(language, "unitDimension")}<input value={dimension} onChange={(event) => setDimension(event.target.value.toUpperCase())} maxLength={40} list="unit-dimensions" required /><datalist id="unit-dimensions">{["DISTANCE", "MASS", "VOLUME", "TIME", "COUNT", "AREA", "TEMPERATURE", "CURRENCY", "RATIO"].map((value) => <option key={value} value={value} />)}</datalist></label><label>{t(language, "baseUnit")}<select value={baseUnitId} onChange={(event) => { setBaseUnitId(event.target.value); setFactor(event.target.value ? factor : "1"); }}><option value="">—</option>{available.filter((unit) => unit.dimension === dimension && unit.id !== editing?.id).map((unit) => <option key={unit.id} value={unit.id}>{unitName(unit)}</option>)}</select></label><label>{t(language, "unitFactor")}<input type="text" inputMode="decimal" value={factor} onChange={(event) => setFactor(event.target.value)} required /></label>{dimension === "COUNT" && <label>{t(language, "objectModel")}<select value={objectFormatId} onChange={(event) => setObjectFormatId(event.target.value)}><option value="">{t(language, "noObjectModel")}</option>{collection.formats.map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label>}<p>{t(language, "unitFactorHelp")}</p><Button type="submit" disabled={busy}>{t(language, "saveUnit")}</Button></form>}
    </section>
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "close")}</Button></div>
  </div></Modal>;
}

function TransferEditor({ collection, language, onClose, onImported }: { collection: Collection | null; language: Language; onClose: () => void; onImported: (collection: Collection) => void }) {
  const [bundle, setBundle] = useState<TransferBundle | null>(null);
  const [targetMode, setTargetMode] = useState<"new" | "current">("new");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [ready, setReady] = useState(false);
  const mappingError = bundle && collection && targetMode === "current" ? (() => { try { transferMapping(bundle, collection); return ""; } catch (cause) { return String(cause instanceof Error ? cause.message : cause); } })() : "";

  async function download(kind: "json" | "csv" | "txt") {
    if (!collection) return;
    setBusy(true); setError("");
    try {
      const data = await exportCollection(collection);
      const safe = collection.name.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 40) || "collection";
      downloadTransfer(`brainy-${safe}.${kind}`, kind === "json" ? JSON.stringify(data, null, 2) : kind === "csv" ? transferCsv(data, language) : bookText(data, language), kind === "json" ? "application/json" : kind === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8");
    } catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    setError(""); setReady(false); setBundle(null); setProgress("");
    if (!file) return;
    try {
      if (file.size > 100_000_000) throw new Error("File is too large (100 MB maximum)");
      const data = parseTransfer(JSON.parse(await file.text()));
      setBundle(data);
    } catch { setError(t(language, "importInvalid")); }
  }

  async function runImport() {
    if (!bundle || mappingError) return;
    setBusy(true); setError(""); setReady(false);
    let target: Collection | null = targetMode === "current" ? collection : null;
    try {
      if (!target) {
        target = await api.createCollectionWithFormats(bundle.collection.name, bundle.collection.formats.map((format) => ({
          name: format.name, color: format.color, objectModel: format.objectModel,
          fields: format.fields.map((field) => ({ name: field.name, kind: field.kind, ...(field.unit ? { unit: field.unit } : {}), ...(field.options ? { options: field.options } : {}) })),
        })), bundle.collection.units, bundle.collection.exchangeRates);
      }
      const validation = await importCollection(bundle, target, true);
      if (validation.errors.length) {
        setError(validation.errors.slice(0, 12).map((item) => `${item.sourceId}: ${item.message}`).join("\n"));
        if (targetMode === "new") await api.deleteCollection(target.id);
        return;
      }
      setReady(true);
      const result = await importCollection(bundle, target, false);
      setProgress(`${t(language, "importDone")}: ${result.created} ${language === "fr" ? "créées" : "created"}, ${result.skipped} ${language === "fr" ? "ignorées" : "skipped"}.`);
      if (result.errors.length) setError(result.errors.slice(0, 12).map((item) => `${item.sourceId}: ${item.message}`).join("\n"));
      onImported(target);
    } catch (cause) {
      setError(errorMessage(cause, language));
      if (target && targetMode === "new") onImported(target);
    } finally { setBusy(false); }
  }

  return <Modal title={t(language, "importPreview")} closeLabel={t(language, "close")} onClose={onClose} size="wide">
    <div className="transfer-panel">
      {collection && <div className="transfer-export"><strong>{t(language, "exportData")}</strong><div><Button variant="secondary" disabled={busy} onClick={() => download("json")}>{t(language, "exportJson")}</Button><Button variant="secondary" disabled={busy} onClick={() => download("csv")}>{t(language, "exportCsv")}</Button>{collection.formats.some((format) => format.fields.some((field) => field.kind === "LONG_TEXT") && format.fields.some((field) => field.kind === "NUMBER" && ["ordre", "order"].includes(field.name.toLocaleLowerCase()))) && <Button variant="secondary" disabled={busy} onClick={() => download("txt")}>{language === "fr" ? "Texte du livre" : "Book text"}</Button>}</div></div>}
      <div className="transfer-import"><strong>{t(language, "importData")}</strong><label className="input-label">{t(language, "importFile")}<input type="file" accept=".json,application/json" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label></div>
      {bundle && <div className="transfer-preview"><h3>{bundle.collection.name}</h3><p>{bundle.entries.length} {t(language, "entries")} · {bundle.collection.formats.length} {t(language, "formats")}</p><div className="transfer-choice"><label><input type="radio" name="import-target" checked={targetMode === "new"} onChange={() => setTargetMode("new")} /> {t(language, "importIntoNew")}</label>{collection && <label><input type="radio" name="import-target" checked={targetMode === "current"} onChange={() => setTargetMode("current")} /> {t(language, "importIntoCurrent")}: {collection.name}</label>}</div><strong>{t(language, "importMapping")}</strong><div className="transfer-columns">{bundle.collection.formats.map((format) => <div key={format.id}><b>{format.name}</b><span>{format.fields.map((field) => `${field.name} (${field.kind}${field.unit ? ` · ${field.unit}` : ""})`).join("  →  ")}</span></div>)}</div><p>{t(language, "importResume")}</p></div>}
      {mappingError && <div className="form-error" role="alert">{mappingError}</div>}
      {error && <div className="form-error" role="alert" style={{ whiteSpace: "pre-line" }}>{error}</div>}
      {progress && <div className="notice-inline" role="status">{progress}</div>}
      {ready && busy && <p>{t(language, "importReady")}</p>}
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "close")}</Button>{bundle && <Button disabled={busy || !!mappingError} onClick={runImport}>{busy ? t(language, "loading") : t(language, "importConfirm")}</Button>}</div>
    </div>
  </Modal>;
}

function SavedViewEditor({ collection, existing, current, language, onClose, onSaved }: { collection: Collection; existing?: SavedView; current: { search: string; formatId: string; filterFieldId: string; filterOperator: EntryFilter["operator"]; filterValue: string }; language: Language; onClose: () => void; onSaved: (updated: Collection, id?: string) => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [layout, setLayout] = useState<SavedView["layout"]>(existing?.layout ?? "LIST");
  const [formatIds, setFormatIds] = useState(existing?.formatIds ?? (current.formatId ? [current.formatId] : collection.formats.map((item) => item.id)));
  const [columnFieldIds, setColumnFieldIds] = useState(existing?.columnFieldIds ?? []);
  const [sort, setSort] = useState<SavedView["sort"]>(existing?.sort ?? "NEWEST");
  const [manualOrderFieldIds, setManualOrderFieldIds] = useState(existing?.manualOrderFieldIds ?? []);
  const [groupByFormat, setGroupByFormat] = useState(existing?.groupByFormat ?? false);
  const [taskDoneFieldId, setTaskDoneFieldId] = useState(existing?.taskDoneFieldId ?? "");
  const [taskDueFieldId, setTaskDueFieldId] = useState(existing?.taskDueFieldId ?? "");
  const [taskCompletedFieldId, setTaskCompletedFieldId] = useState(existing?.taskCompletedFieldId ?? "");
  const [taskPriorityFieldId, setTaskPriorityFieldId] = useState(existing?.taskPriorityFieldId ?? "");
  const [calendarStartFieldId, setCalendarStartFieldId] = useState(existing?.calendarStartFieldId ?? "");
  const [calendarEndFieldId, setCalendarEndFieldId] = useState(existing?.calendarEndFieldId ?? "");
  const [calendarTimeZone, setCalendarTimeZone] = useState(existing?.calendarTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = collection.formats.filter((format) => formatIds.includes(format.id)).flatMap((format) => format.fields.map((field) => ({ ...field, formatName: format.name })));
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const input: Omit<SavedView, "id"> = { name: name.trim(), layout, formatIds, columnFieldIds: columnFieldIds.filter((id) => fields.some((field) => field.id === id)), search: existing?.search ?? current.search, filterFieldId: existing?.filterFieldId ?? (formatIds.length === 1 && formatIds[0] === current.formatId ? current.filterFieldId || null : null), filterOperator: existing?.filterOperator ?? (current.filterFieldId ? current.filterOperator : null), filterValue: existing?.filterValue ?? (current.filterFieldId ? current.filterValue : null), sort, manualOrderFieldIds: sort === "MANUAL" ? manualOrderFieldIds.filter((id) => fields.some((field) => field.id === id)) : [], groupByFormat, ...(layout === "TASKS" ? { taskDoneFieldId, taskDueFieldId: taskDueFieldId || null, taskCompletedFieldId: taskCompletedFieldId || null, taskPriorityFieldId: taskPriorityFieldId || null } : {}), ...(layout === "CALENDAR" ? { calendarStartFieldId, calendarEndFieldId, calendarTimeZone } : {}) };
      if (!input.filterFieldId) { input.filterOperator = null; input.filterValue = null; }
      const updated = await api.saveView(collection.id, input, existing?.id);
      onSaved(updated, existing?.id ?? updated.savedViews.at(-1)?.id);
    } catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={existing ? language === "fr" ? "Modifier la vue" : "Edit view" : language === "fr" ? "Enregistrer une vue" : "Save a view"} closeLabel={t(language, "close")} onClose={onClose}>
    <form className="modal-form" onSubmit={save}>
      <label className="input-label">{language === "fr" ? "Nom de la vue" : "View name"}<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="input-label">{language === "fr" ? "Présentation" : "Layout"}<select value={layout} onChange={(event) => { const next = event.target.value as SavedView["layout"]; setLayout(next); if (["TASKS", "CALENDAR"].includes(next)) { setFormatIds((ids) => ids.slice(0, 1)); setSort("NEWEST"); } }}><option value="LIST">{language === "fr" ? "Liste" : "List"}</option><option value="TABLE">{language === "fr" ? "Tableau" : "Table"}</option><option value="CARDS">{language === "fr" ? "Fiches" : "Cards"}</option><option value="TASKS">{language === "fr" ? "Tâches" : "Tasks"}</option><option value="CALENDAR">{language === "fr" ? "Agenda" : "Calendar"}</option></select></label>
      <fieldset className="view-choices"><legend>{language === "fr" ? "Formats de données" : "Data formats"}</legend>{collection.formats.map((format) => <label key={format.id}><input type="checkbox" checked={formatIds.includes(format.id)} onChange={(event) => setFormatIds((currentIds) => event.target.checked ? ["TASKS", "CALENDAR"].includes(layout) ? [format.id] : [...currentIds, format.id] : currentIds.filter((id) => id !== format.id))} />{format.name}</label>)}</fieldset>
      {layout === "TASKS" && <div className="view-time-fields"><label>{language === "fr" ? "Champ terminé (oui/non)" : "Done field (yes/no)"}<select required value={taskDoneFieldId} onChange={(event) => setTaskDoneFieldId(event.target.value)}><option value="">—</option>{fields.filter((field) => field.kind === "BOOLEAN").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label>{language === "fr" ? "Échéance" : "Due date"}<select value={taskDueFieldId} onChange={(event) => setTaskDueFieldId(event.target.value)}><option value="">—</option>{fields.filter((field) => ["DATE", "DATETIME"].includes(field.kind)).map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label>{language === "fr" ? "Date d’achèvement" : "Completion date"}<select value={taskCompletedFieldId} onChange={(event) => setTaskCompletedFieldId(event.target.value)}><option value="">—</option>{fields.filter((field) => field.kind === "DATETIME").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label>{language === "fr" ? "Priorité" : "Priority"}<select value={taskPriorityFieldId} onChange={(event) => setTaskPriorityFieldId(event.target.value)}><option value="">—</option>{fields.filter((field) => ["SELECT", "NUMBER"].includes(field.kind)).map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label></div>}
      {layout === "CALENDAR" && <div className="view-time-fields"><label>{language === "fr" ? "Début" : "Start"}<select required value={calendarStartFieldId} onChange={(event) => setCalendarStartFieldId(event.target.value)}><option value="">—</option>{fields.filter((field) => field.kind === "DATETIME").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label>{language === "fr" ? "Fin" : "End"}<select required value={calendarEndFieldId} onChange={(event) => setCalendarEndFieldId(event.target.value)}><option value="">—</option>{fields.filter((field) => field.kind === "DATETIME").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label><label>{language === "fr" ? "Fuseau horaire IANA" : "IANA time zone"}<input required value={calendarTimeZone} onChange={(event) => setCalendarTimeZone(event.target.value)} placeholder="Africa/Lagos" /></label></div>}
      {layout === "TABLE" && <fieldset className="view-choices"><legend>{language === "fr" ? "Colonnes" : "Columns"}</legend>{fields.map((field) => <label key={field.id}><input type="checkbox" checked={columnFieldIds.includes(field.id)} onChange={(event) => setColumnFieldIds((ids) => event.target.checked ? [...ids, field.id] : ids.filter((id) => id !== field.id))} />{field.formatName} · {field.name}</label>)}</fieldset>}
      <label className="input-label">{language === "fr" ? "Tri" : "Sort"}<select value={sort} onChange={(event) => setSort(event.target.value as SavedView["sort"])}><option value="NEWEST">{language === "fr" ? "Plus récent d’abord" : "Newest first"}</option><option value="OLDEST">{language === "fr" ? "Plus ancien d’abord" : "Oldest first"}</option>{!(["TASKS", "CALENDAR"].includes(layout)) && <option value="MANUAL">{language === "fr" ? "Ordre saisi" : "Entered order"}</option>}</select></label>
      {sort === "MANUAL" && collection.formats.filter((format) => formatIds.includes(format.id)).map((format) => <label className="input-label" key={format.id}>{language === "fr" ? "Champ d’ordre" : "Order field"} · {format.name}<select required value={format.fields.find((field) => manualOrderFieldIds.includes(field.id))?.id ?? ""} onChange={(event) => setManualOrderFieldIds((ids) => [...ids.filter((id) => !format.fields.some((field) => field.id === id)), event.target.value])}><option value="">—</option>{format.fields.filter((field) => field.kind === "NUMBER").map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>)}
      <label className="object-choice"><input type="checkbox" checked={groupByFormat} onChange={(event) => setGroupByFormat(event.target.checked)} />{language === "fr" ? "Grouper par format de données" : "Group by data format"}</label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><Button variant="secondary" type="button" onClick={onClose}>{t(language, "cancel")}</Button><Button disabled={busy || !formatIds.length} type="submit">{t(language, "save")}</Button></div>
    </form>
  </Modal>;
}

function RecurrenceEditor({ collection, view, entry, language, onClose, onSaved }: { collection: Collection; view: SavedView; entry: Entry; language: Language; onClose: () => void; onSaved: () => void }) {
  const [frequency, setFrequency] = useState(entry.recurrence?.frequency ?? "WEEKLY");
  const [interval, setInterval] = useState(entry.recurrence?.interval ?? 1);
  const [timeZone, setTimeZone] = useState(entry.recurrence?.timeZone ?? view.calendarTimeZone ?? "UTC");
  const [untilDate, setUntilDate] = useState(entry.recurrence?.untilDate ?? "");
  const [excludedDates, setExcludedDates] = useState(entry.recurrence?.excludedDates ?? []);
  const [exceptionDate, setExceptionDate] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(clear = false) {
    setBusy(true); setError("");
    try { await api.setEntryRecurrence(collection.id, view.id, entry.id, clear ? undefined : { frequency, interval, timeZone, untilDate: untilDate || undefined, excludedDates }); onSaved(); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={language === "fr" ? "Récurrence du rendez-vous" : "Event recurrence"} closeLabel={t(language, "close")} onClose={onClose}><div className="modal-form">
    <label className="input-label">{language === "fr" ? "Répéter" : "Repeat"}<select value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}><option value="DAILY">{language === "fr" ? "Chaque jour" : "Daily"}</option><option value="WEEKLY">{language === "fr" ? "Chaque semaine" : "Weekly"}</option><option value="MONTHLY">{language === "fr" ? "Chaque mois" : "Monthly"}</option></select></label>
    <label className="input-label">{language === "fr" ? "Intervalle" : "Interval"}<input type="number" min={1} max={30} value={interval} onChange={(event) => setInterval(Number(event.target.value))} /></label>
    <label className="input-label">{language === "fr" ? "Fuseau horaire" : "Time zone"}<input value={timeZone} onChange={(event) => setTimeZone(event.target.value)} /></label>
    <label className="input-label">{language === "fr" ? "Jusqu’au (facultatif)" : "Until (optional)"}<input type="date" value={untilDate} onChange={(event) => setUntilDate(event.target.value)} /></label>
    <label className="input-label">{language === "fr" ? "Exception" : "Exception"}<span className="view-exception-row"><input type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} /><button type="button" disabled={!exceptionDate} onClick={() => { setExcludedDates((current) => [...new Set([...current, exceptionDate])].sort()); setExceptionDate(""); }}>{language === "fr" ? "Ajouter" : "Add"}</button></span></label>
    {excludedDates.map((date) => <div key={date} className="view-exception-row"><span>{date}</span><button type="button" onClick={() => setExcludedDates((current) => current.filter((item) => item !== date))}>{language === "fr" ? "Retirer" : "Remove"}</button></div>)}
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "cancel")}</Button>{entry.recurrence && <Button variant="secondary" disabled={busy} onClick={() => save(true)}>{language === "fr" ? "Arrêter la répétition" : "Stop repeating"}</Button>}<Button disabled={busy} onClick={() => save()}>{t(language, "save")}</Button></div>
  </div></Modal>;
}

function ReminderEditor({ collection, entry, view, language, onClose }: { collection: Collection; entry: Entry; view?: SavedView; language: Language; onClose: () => void }) {
  const fields = collection.formats.find((item) => item.id === entry.formatId)?.fields.filter((field) => ["DATE", "DATETIME"].includes(field.kind) && entry.values.some((value) => value.fieldId === field.id)) ?? [];
  const [reminders, setReminders] = useState<EntryReminder[]>([]), [capabilities, setCapabilities] = useState<{ email: boolean; push: boolean } | null>(null), [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? ""), [minutesBefore, setMinutesBefore] = useState(15), [email, setEmail] = useState(false), [push, setPush] = useState(false);
  const [timeZone, setTimeZone] = useState(view?.calendarTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"), [timeOfDay, setTimeOfDay] = useState("09:00"), [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([api.entryReminders(entry.id), api.reminderCapabilities(), api.pushDevices()]).then(([saved, available, registered]) => { setReminders(saved); setCapabilities(available); setDevices(registered); setEmail(available.email); }).catch((cause) => setError(errorMessage(cause, language))); }, [entry.id, language]);
  async function registerBrowser() {
    setBusy(true); setError("");
    try { const { browserPushToken } = await import("../lib/firebase-client"); const token = await browserPushToken(); await api.registerPushDevice(token, "WEB", language === "fr" ? "Navigateur web" : "Web browser"); setDevices(await api.pushDevices()); setPush(true); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    try { await api.saveEntryReminder(entry.id, { fieldId, minutesBefore, channels: [...(email ? ["EMAIL"] : []), ...(push ? ["PUSH"] : [])], timeZone, ...(fields.find((field) => field.id === fieldId)?.kind === "DATE" ? { timeOfDay } : {}), ...(view?.layout === "CALENDAR" && view.calendarStartFieldId === fieldId ? { viewId: view.id } : {}) }, editingId); setReminders(await api.entryReminders(entry.id)); setEditingId(undefined); }
    catch (cause) { setError(errorMessage(cause, language)); }
    finally { setBusy(false); }
  }
  return <Modal title={language === "fr" ? "Rappels de l’entrée" : "Entry reminders"} closeLabel={t(language, "close")} onClose={onClose}><div className="modal-form">
    {reminders.map((item) => <div key={item.id} className="reminder-saved"><span>{fields.find((field) => field.id === item.fieldId)?.name ?? item.fieldId} · {item.minutesBefore} min · {item.channels.join(" + ")} · {item.state}{item.nextAt ? ` · ${dateTime(item.nextAt, language)}` : ""}</span><button type="button" onClick={() => { setEditingId(item.id); setFieldId(item.fieldId); setMinutesBefore(item.minutesBefore); setEmail(item.channels.includes("EMAIL")); setPush(item.channels.includes("PUSH")); setTimeZone(item.timeZone); setTimeOfDay(item.timeOfDay ?? "09:00"); }}>{t(language, "edit")}</button><button type="button" onClick={async () => { try { await api.cancelEntryReminder(item.id); setReminders(await api.entryReminders(entry.id)); } catch (cause) { setError(errorMessage(cause, language)); } }}>{language === "fr" ? "Annuler" : "Cancel"}</button></div>)}
    <label className="input-label">{language === "fr" ? "Champ date" : "Date field"}<select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>
    <label className="input-label">{language === "fr" ? "Minutes avant" : "Minutes before"}<input type="number" min={0} max={43200} value={minutesBefore} onChange={(event) => setMinutesBefore(Number(event.target.value))} /></label>
    <label className="input-label">{language === "fr" ? "Fuseau horaire IANA" : "IANA time zone"}<input value={timeZone} onChange={(event) => setTimeZone(event.target.value)} /></label>
    {fields.find((field) => field.id === fieldId)?.kind === "DATE" && <label className="input-label">{language === "fr" ? "Heure du jour" : "Time of day"}<input type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} /></label>}
    <label className="object-choice"><input type="checkbox" checked={email} disabled={!capabilities?.email} onChange={(event) => setEmail(event.target.checked)} />{language === "fr" ? "E-mail" : "Email"}{capabilities && !capabilities.email && <small> · {language === "fr" ? "SMTP non configuré" : "SMTP not configured"}</small>}</label>
    <label className="object-choice"><input type="checkbox" checked={push} disabled={!capabilities?.push || devices.length === 0} onChange={(event) => setPush(event.target.checked)} />Push{capabilities && !capabilities.push && <small> · {language === "fr" ? "Firebase non configuré" : "Firebase not configured"}</small>}</label>
    {capabilities?.push && <div className="reminder-devices"><button type="button" disabled={busy} onClick={registerBrowser}>{language === "fr" ? "Activer le push sur ce navigateur" : "Enable push on this browser"}</button>{devices.map((device) => <span key={device.id}>{device.label} <button type="button" onClick={async () => { await api.unregisterPushDevice(device.id); setDevices(await api.pushDevices()); }}>×</button></span>)}</div>}
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t(language, "close")}</Button><Button disabled={busy || !fieldId || !(email || push)} onClick={save}>{t(language, "save")}</Button></div>
  </div></Modal>;
}

function CalendarView({ collection, view, language, refreshToken, onEdit, onReminder }: { collection: Collection; view: SavedView; language: Language; refreshToken: number; onEdit: (entry: Entry) => void; onReminder: (entry: Entry) => void }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: view.calendarTimeZone ?? "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [date, setDate] = useState(today), [mode, setMode] = useState<"DAY" | "WEEK" | "MONTH">("WEEK");
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.calendarOccurrences>>>([]);
  const [editing, setEditing] = useState<Entry | null>(null), [error, setError] = useState(""), [refreshKey, setRefreshKey] = useState(0);
  const addDays = (value: string, days: number) => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  const selected = new Date(`${date}T00:00:00Z`);
  const start = mode === "DAY" ? date : mode === "WEEK" ? addDays(date, -(selected.getUTCDay() + 6) % 7) : `${date.slice(0, 7)}-01`;
  const end = mode === "DAY" ? addDays(start, 1) : mode === "WEEK" ? addDays(start, 7) : new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const days = Array.from({ length: Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) }, (_, i) => addDays(start, i));
  useEffect(() => { let active = true; api.calendarOccurrences(collection.id, view.id, `${addDays(start, -1)}T00:00:00Z`, `${addDays(end, 1)}T00:00:00Z`).then((result) => { if (active) { setItems(result.filter((item) => item.localDate >= start && item.localDate < end)); setError(""); } }).catch((cause) => { if (active) setError(errorMessage(cause, language)); }); return () => { active = false; }; }, [collection.id, view.id, start, end, language, refreshKey, refreshToken]);
  const shift = (direction: number) => { if (mode === "MONTH") { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + direction); setDate(d.toISOString().slice(0, 10)); } else setDate(addDays(date, direction * (mode === "WEEK" ? 7 : 1))); };
  const title = (entry: Entry) => { const format = collection.formats.find((item) => item.id === entry.formatId); const field = format?.fields.find((item) => item.kind === "TITLE"); return entry.values.find((item) => item.fieldId === field?.id)?.value ?? format?.name ?? entry.id; };
  return <section className="calendar-view"><div className="calendar-toolbar"><button type="button" onClick={() => shift(-1)} aria-label={language === "fr" ? "Période précédente" : "Previous period"}>‹</button><strong>{start} → {addDays(end, -1)}</strong><button type="button" onClick={() => shift(1)} aria-label={language === "fr" ? "Période suivante" : "Next period"}>›</button><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="DAY">{language === "fr" ? "Jour" : "Day"}</option><option value="WEEK">{language === "fr" ? "Semaine" : "Week"}</option><option value="MONTH">{language === "fr" ? "Mois" : "Month"}</option></select></div>
    {error && <p role="alert">{error}</p>}
    <div className={mode === "MONTH" ? "calendar-days month" : "calendar-days"}>{days.map((day) => <section key={day} className="calendar-day"><h3>{new Intl.DateTimeFormat(language, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</h3>{items.filter((item) => item.localDate === day).map((item) => <div key={`${item.entry.id}-${item.startAt}`} className="calendar-event"><button type="button" onClick={() => onEdit(item.entry)}><strong>{title(item.entry)}</strong><span>{new Intl.DateTimeFormat(language, { timeZone: item.timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(item.startAt))}–{new Intl.DateTimeFormat(language, { timeZone: item.timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(item.endAt))}</span></button><button type="button" onClick={() => onReminder(item.entry)} title={language === "fr" ? "Rappels" : "Reminders"}><Bell size={14} /></button><button type="button" onClick={() => setEditing(item.entry)} title={language === "fr" ? "Récurrence et exceptions" : "Recurrence and exceptions"}>↻</button>{item.recurring && <button type="button" onClick={async () => { try { const recurrence = item.entry.recurrence!; await api.setEntryRecurrence(collection.id, view.id, item.entry.id, { ...recurrence, untilDate: recurrence.untilDate ?? undefined, excludedDates: [...new Set([...recurrence.excludedDates, item.localDate])] }); setRefreshKey((value) => value + 1); } catch (cause) { setError(errorMessage(cause, language)); } }} title={language === "fr" ? "Ignorer cette occurrence" : "Skip this occurrence"}>×</button>}</div>)}</section>)}</div>
    {editing && <RecurrenceEditor collection={collection} view={view} entry={editing} language={language} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setRefreshKey((value) => value + 1); }} />}
  </section>;
}

export default function BrainyApp() {
  const [language, setLanguage] = useState<Language>("en");
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("brainy_theme");
    return saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"collection" | "insights" | "stock">("collection");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [filterFormatId, setFilterFormatId] = useState("");
  const [filterFieldId, setFilterFieldId] = useState("");
  const [filterOperator, setFilterOperator] = useState<EntryFilter["operator"]>("EQ");
  const [filterValueText, setFilterValueText] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [selectedViewId, setSelectedViewId] = useState("");
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [quickCapture, setQuickCapture] = useState(false);
  const [quickEntry, setQuickEntry] = useState(false);
  const [sharedContent, setSharedContent] = useState<{ title?: string; text?: string; url?: string }>();
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [rename, setRename] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const entryGeneration = useRef(0);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const selected = useMemo(() => collections.find((item) => item.id === selectedId) ?? null, [collections, selectedId]);
  useEffect(() => { window.scrollTo(0, 0); }, [activeSection, selectedId]);
  const selectedView = selected?.savedViews?.find((item) => item.id === selectedViewId);
  const filterFormat = selected?.formats.find((item) => item.id === filterFormatId);
  const filterField = filterFormat?.fields.find((item) => item.id === filterFieldId);
  const pageOptions = () => selectedViewId ? { viewId: selectedViewId } : { search: search || undefined, formatId: filterFormatId || undefined, filters: filterFieldId && filterValue.trim() ? [{ fieldId: filterFieldId, operator: filterOperator, value: filterValue.trim() }] : undefined };

  useEffect(() => {
    const stored = window.localStorage.getItem("brainy_language");
    const next: Language = stored === "fr" || stored === "en" ? stored : navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
    queueMicrotask(() => setLanguage(next));
    api.me().then(setUser).catch(() => {}).finally(() => setBooting(false));
  }, []);
  useEffect(() => { document.documentElement.lang = language; window.localStorage.setItem("brainy_language", language); }, [language]);
  useEffect(() => { document.documentElement.dataset.theme = colorMode; window.localStorage.setItem("brainy_theme", colorMode); }, [colorMode]);
  useEffect(() => {
    if (!user?.profileCompleted) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("capture")) return;
    const shared = { title: url.searchParams.get("title") ?? "", text: url.searchParams.get("text") ?? "", url: url.searchParams.get("url") ?? "" };
    queueMicrotask(() => { setSharedContent(shared); setQuickCapture(true); });
    for (const field of ["capture", "title", "text", "url"]) url.searchParams.delete(field);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [user?.profileCompleted]);
  useEffect(() => { if (!user?.id) return; let unsubscribe: (() => void) | undefined; import("../lib/firebase-client").then(({ listenForForegroundReminders }) => listenForForegroundReminders()).then((stop) => { unsubscribe = stop; }).catch(() => {}); return () => unsubscribe?.(); }, [user?.id]);
  useEffect(() => { const timer = window.setTimeout(() => setSearch(searchText.trim()), 300); return () => window.clearTimeout(timer); }, [searchText]);
  useEffect(() => { const timer = window.setTimeout(() => setFilterValue(filterValueText.trim()), 300); return () => window.clearTimeout(timer); }, [filterValueText]);
  useEffect(() => {
    if (!user?.profileCompleted) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadingCollections(true);
      api.collections().then((result) => { if (!cancelled) { setCollections(result); setSelectedId((current) => result.some((item) => item.id === current) ? current : result[0]?.id ?? null); setLoadError(null); } })
        .catch((error) => { if (!cancelled) { if (error instanceof ApiError && error.unauthenticated) setUser(null); else setLoadError(error); } })
        .finally(() => { if (!cancelled) setLoadingCollections(false); });
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.profileCompleted]);
  useEffect(() => {
    if (!user?.profileCompleted || !selectedId) return;
    let cancelled = false;
    const generation = ++entryGeneration.current;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadingEntries(true);
      setEntries([]);
      setNextCursor(null);
      api.entriesPage(selectedId, selectedViewId ? { viewId: selectedViewId } : { search: search || undefined, formatId: filterFormatId || undefined, filters: filterFieldId && filterValue ? [{ fieldId: filterFieldId, operator: filterOperator, value: filterValue }] : undefined })
        .then((result) => { if (!cancelled && generation === entryGeneration.current) { setEntries(result.entries); setNextCursor(result.nextCursor ?? null); setLoadError(null); } })
        .catch((error) => { if (!cancelled) { if (error instanceof ApiError && error.unauthenticated) setUser(null); else setLoadError(error); } })
        .finally(() => { if (!cancelled) setLoadingEntries(false); });
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.profileCompleted, selectedId, selectedViewId, search, filterFormatId, filterFieldId, filterOperator, filterValue]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3500); return () => window.clearTimeout(timer); }, [notice]);

  async function refresh() {
    if (!user) return;
    setLoadError(null); setLoadingCollections(true);
    try {
      const result = await api.collections();
      setCollections(result);
      const id = result.some((item) => item.id === selectedId) ? selectedId : result[0]?.id;
      setSelectedId(id ?? null);
      if (id) { const generation = ++entryGeneration.current; setLoadingEntries(true); const page = await api.entriesPage(id, pageOptions()); if (generation === entryGeneration.current) { setEntries(page.entries); setNextCursor(page.nextCursor ?? null); setCalendarRefresh((current) => current + 1); } }
    } catch (error) { setLoadError(error); }
    finally { setLoadingCollections(false); setLoadingEntries(false); }
  }
  async function loadMoreEntries() {
    if (!selectedId || !nextCursor || loadingMore) return;
    const generation = entryGeneration.current;
    setLoadingMore(true);
    try {
      const page = await api.entriesPage(selectedId, { ...pageOptions(), after: nextCursor });
      if (generation === entryGeneration.current) {
        setEntries((current) => [...current, ...page.entries.filter((entry) => !current.some((item) => item.id === entry.id))]);
        setNextCursor(page.nextCursor ?? null);
      }
    } catch (error) { setLoadError(error); }
    finally { setLoadingMore(false); }
  }
  function selectCollection(id: string) {
    setActiveSection("collection");
    if (id === selectedId) return;
    ++entryGeneration.current;
    setSearchText(""); setSearch(""); setFilterFormatId(""); setFilterFieldId(""); setFilterValueText(""); setFilterValue(""); setSelectedViewId("");
    setSelectedId(id);
  }
  async function signOut() {
    try { await api.signOut(); }
    catch (error) { setNotice(errorMessage(error, language)); return; }
    import("../lib/firebase-client").then(({ googleSignOut }) => googleSignOut().catch(() => {}));
    setUser(null); setCollections([]); setEntries([]); setSelectedId(null); setMenuOpen(false); setProfileEditing(false);
  }
  async function copy(entry: Entry) {
    if (!selected) return;
    try { await copyText(entryClipboardText(selected, entry, language)); setNotice(t(language, "copied")); }
    catch { setNotice(t(language, "copyFailed")); }
  }
  async function renameCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || !rename.trim()) return;
    setBusy(true); setDialogError("");
    try { const updated = await api.renameCollection(selected.id, rename.trim()); setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); setDialog(null); }
    catch (error) { setDialogError(errorMessage(error, language)); }
    finally { setBusy(false); }
  }
  async function removeCollection() {
    if (!selected) return;
    setBusy(true); setDialogError("");
    try { await api.deleteCollection(selected.id); const rest = collections.filter((item) => item.id !== selected.id); setCollections(rest); setSelectedId(rest[0]?.id ?? null); setDialog(null); }
    catch (error) { setDialogError(errorMessage(error, language)); }
    finally { setBusy(false); }
  }
  async function removeEntry(entry: Entry) {
    setBusy(true); setDialogError("");
    try { await api.deleteEntry(entry.id); setEntries((current) => current.filter((item) => item.id !== entry.id)); setDialog(null); }
    catch (error) { setDialogError(errorMessage(error, language)); }
    finally { setBusy(false); }
  }

  if (booting) return <div className="boot-screen"><Brand /><div className="boot-spinner" /><p>{t(language, "loading")}</p></div>;
  if (!user) return <AuthScreen language={language} onLanguage={setLanguage} colorMode={colorMode} onColorMode={setColorMode} onAuthenticated={setUser} />;
  if (!user.profileCompleted || profileEditing) return <ProfileScreen user={user} language={language} onLanguage={setLanguage} colorMode={colorMode} onColorMode={setColorMode} onSaved={(updated) => { setUser(updated); setProfileEditing(false); }} onCancel={user.profileCompleted ? () => setProfileEditing(false) : undefined} onSignOut={signOut} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top"><Brand /><p>{t(language, "tagline")}</p></div>
        <div className="sidebar-heading"><span>{t(language, "collections")}</span><button type="button" className="icon-button" title={t(language, "newCollection")} aria-label={t(language, "newCollection")} onClick={() => setDialog({ kind: "collection" })}><Plus size={18} /></button></div>
        <nav className="collection-nav" aria-label={t(language, "collections")}>
          {collections.map((collection) => <button type="button" key={collection.id} className={`nav-item ${selectedId === collection.id ? "active" : ""}`} onClick={() => selectCollection(collection.id)}><FolderHeart size={18} /><span>{collection.name}</span><span className="nav-count">{collection.formats.length}</span></button>)}
          {!loadingCollections && collections.length === 0 && <p className="sidebar-empty">{t(language, "noCollectionsDetail")}</p>}
        </nav>
        <Button variant="secondary" className="sidebar-create" onClick={() => setDialog({ kind: "starter" })}><Plus size={18} /> {language === "fr" ? "Créer avec un modèle" : "Create from template"}</Button>
        <Button variant="secondary" className="sidebar-create" onClick={() => setDialog({ kind: "collection" })}>{language === "fr" ? "Créer manuellement" : "Create manually"}</Button>
        <Button variant="secondary" className="sidebar-create" onClick={() => setDialog({ kind: "transfer" })}>{t(language, "importData")} / {t(language, "exportData")}</Button>
        <div className="sidebar-bottom"><div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div><button type="button" className="profile-info profile-edit-button" onClick={() => setProfileEditing(true)} title={t(language, "editProfile")}><strong>{user.name}</strong><span>{user.email}</span></button><button type="button" className="icon-button" onClick={signOut} title={t(language, "signOut")} aria-label={t(language, "signOut")}><LogOut size={18} /></button></div>
      </aside>

      <main className="workspace">
        <header className="topbar"><div className="mobile-brand"><Brand compact /></div><span className="topbar-path">{t(language, "workspace")}{selected && <><span className="slash">/</span><strong>{selected.name}</strong></>}</span><div className="topbar-right"><button type="button" className="quick-topbar" onClick={() => { setSharedContent(undefined); setQuickCapture(true); }}>{language === "fr" ? "Capturer" : "Capture"}</button><ThemeToggle language={language} mode={colorMode} onChange={setColorMode} /><LanguagePicker language={language} onChange={setLanguage} /><button type="button" className="icon-button refresh-button" onClick={refresh} aria-label={t(language, "refresh")} title={t(language, "refresh")}><RefreshCw size={18} /></button><button type="button" className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={t(language, "menu")}><MoreHorizontal size={22} /></button></div></header>
        {menuOpen && <div className="mobile-menu"><div className="mobile-menu-title">{t(language, "collections")}</div>{collections.map((item) => <button key={item.id} type="button" onClick={() => { selectCollection(item.id); setMenuOpen(false); }}>{item.name}</button>)}<button type="button" onClick={() => { setDialog({ kind: "collection" }); setMenuOpen(false); }}><Plus size={16} />{t(language, "newCollection")}</button><button type="button" onClick={() => { setProfileEditing(true); setMenuOpen(false); }}><Pencil size={16} />{t(language, "editProfile")}</button><button type="button" onClick={signOut}><LogOut size={16} />{t(language, "signOut")}</button></div>}

        <div className="workspace-body">
          {activeSection === "collection" && <div className="workspace-greeting"><span className="eyebrow blue"><Sparkles size={15} /> {t(language, "workspace")}</span><h1>{t(language, "workspace")}<span className="heading-sparkle">✳</span></h1><p>{t(language, "collectionSubtitle")}</p></div>}
          {selected && activeSection === "collection" && <button type="button" className="quick-mobile-action" onClick={() => { setSharedContent(undefined); setQuickCapture(true); }}>{language === "fr" ? "Capture rapide" : "Quick capture"}</button>}
          {!!loadError && <div className="load-error" role="alert"><span>{errorMessage(loadError, language)}</span><Button variant="secondary" onClick={refresh}>{t(language, "retry")}</Button></div>}
          {selected && activeSection === "insights" && <section className="analysis-page" aria-label={language === "fr" ? "Calculs et graphiques" : "Calculations and charts"}>
            <header className="analysis-page-head"><button type="button" className="analysis-back" onClick={() => setActiveSection("collection")}><ArrowLeft size={18} />{language === "fr" ? "Collection" : "Collection"}</button><div className="analysis-page-title"><span className="analysis-page-icon"><ChartNoAxesCombined size={26} /></span><div><span className="section-overline">{selected.name}</span><h1>{language === "fr" ? "Calculs et graphiques" : "Calculations and charts"}</h1><p>{language === "fr" ? "Explorez vos données, comparez les valeurs et retrouvez les entrées sources." : "Explore your data, compare values, and return to the source entries."}</p></div></div></header>
            <InsightsDialog key={selected.id} collection={selected} language={language} onClose={() => setActiveSection("collection")} onCollectionChanged={(updated) => setCollections((current) => current.map((item) => item.id === updated.id ? updated : item))} onOpenEntry={async (id) => { try { const entry = entries.find((item) => item.id === id) ?? await api.entry(selected.id, id); setDialog({ kind: "entry", entry }); } catch (cause) { setDialogError(String(cause)); } }} />
          </section>}
          {selected && activeSection === "stock" && <section className="analysis-page"><button type="button" className="analysis-back" onClick={() => setActiveSection("collection")}><ArrowLeft size={18} />{language === "fr" ? "Collection" : "Collection"}</button><StockPanel key={selected.id} collection={selected} language={language} onCollectionChanged={(updated) => setCollections((current) => current.map((item) => item.id === updated.id ? updated : item))} /></section>}
          {!selected && !loadingCollections ? <div className="empty-state first-empty"><div className="empty-art"><FolderHeart size={52} strokeWidth={1.4} /></div><h2>{t(language, "noCollections")}</h2><p>{t(language, "noCollectionsDetail")}</p><Button onClick={() => setDialog({ kind: "starter" })}><Plus size={18} /> {t(language, "createCollection")}</Button></div> : selected && activeSection === "collection" && <>
            <section className="collection-hero"><div className="collection-hero-main"><div className="collection-icon"><FolderHeart size={27} /></div><div><span className="eyebrow">{t(language, "collection")}</span><h2>{selected.name}</h2><div className="collection-meta"><span><FileText size={15} /> {entries.length} {t(language, "entries")}</span><span>{selected.formats.length} {t(language, selected.formats.length === 1 ? "format" : "formats")}</span></div></div></div><div className="collection-hero-actions"><Button variant="secondary" onClick={() => { setRename(selected.name); setDialogError(""); setDialog({ kind: "rename" }); }}><Pencil size={16} /> {t(language, "rename")}</Button><Button variant="subtle" className="hero-delete" onClick={() => { setDialogError(""); setDialog({ kind: "deleteCollection" }); }}><Trash2 size={17} /> {t(language, "delete")}</Button></div></section>
            <nav className="collection-hub" aria-label={language === "fr" ? "Outils de la collection" : "Collection tools"}>
              <button type="button" className="collection-hub-card" onClick={() => setActiveSection("stock")}><span className="collection-hub-icon"><Boxes size={22} /></span><span className="collection-hub-copy"><strong>{language === "fr" ? "Stock" : "Stock"}</strong><small>{language === "fr" ? "Positions et mouvements validés" : "Positions and confirmed movements"}</small></span><ArrowRight className="collection-hub-arrow" size={18} /></button>
              <button type="button" className="collection-hub-card collection-hub-featured" onClick={() => setActiveSection("insights")}><span className="collection-hub-icon"><ChartNoAxesCombined size={23} /></span><span className="collection-hub-copy"><strong>{language === "fr" ? "Calculs et graphiques" : "Calculations and charts"}</strong><small>{language === "fr" ? "Une page pour explorer vos données" : "A page to explore your data"}</small></span><ArrowRight className="collection-hub-arrow" size={18} /></button>
              <button type="button" className="collection-hub-card" onClick={() => setDialog({ kind: "units" })}><span className="collection-hub-icon"><Ruler size={22} /></span><span className="collection-hub-copy"><strong>{t(language, "manageUnits")}</strong><small>{language === "fr" ? "Mesures et conversions" : "Measures and conversions"}</small></span><ArrowRight className="collection-hub-arrow" size={18} /></button>
              <button type="button" className="collection-hub-card" onClick={() => setDialog({ kind: "objects" })}><span className="collection-hub-icon"><Boxes size={22} /></span><span className="collection-hub-copy"><strong>{language === "fr" ? "Objets" : "Objects"}</strong><small>{language === "fr" ? "Modèles et références" : "Models and references"}</small></span><ArrowRight className="collection-hub-arrow" size={18} /></button>
            </nav>
            <section className="format-strip">
              <div className="format-strip-head"><div><span className="section-overline">{t(language, "formats")}</span><p>{t(language, "formatHelp")}</p></div><Button variant="secondary" disabled={selected.formats.length >= formatColors.length} onClick={() => setDialog({ kind: "addFormat" })}><Plus size={16} /> {t(language, "addFormat")}</Button></div>
              <div className="format-cards">{selected.formats.map((format) => <div key={format.id} className="format-card" style={{ "--format-color": format.color } as CSSProperties}>
                <div className="format-card-head"><strong>{formatDisplayName(format, language)}</strong><div className="format-card-actions">
                  <button type="button" onClick={() => setDialog({ kind: "editFormat", formatId: format.id })} aria-label={`${t(language, "editFormat")}: ${formatDisplayName(format, language)}`} title={t(language, "editFormat")}><Pencil size={15} /></button>
                  <button type="button" onClick={() => setDialog({ kind: "formatColor", formatId: format.id })} aria-label={`${t(language, "changeColor")}: ${formatDisplayName(format, language)}`} title={t(language, "changeColor")}><span aria-hidden="true">◉</span></button>
                  <button type="button" onClick={() => setDialog({ kind: "copyFormat", formatId: format.id })} aria-label={`${language === "fr" ? "Copier vers" : "Copy to"}: ${format.name}`} title={language === "fr" ? "Copier vers…" : "Copy to…"}><Copy size={15} /></button>
                  <button type="button" onClick={() => setDialog({ kind: "linkFormat", formatId: format.id })} aria-label={`${language === "fr" ? "Partager par lien" : "Share by link"}: ${format.name}`} title={language === "fr" ? "Partager par lien…" : "Share by link…"}><Link2 size={15} /></button>
                </div></div>
                {format.linkedSource && <div className="format-linked-source"><span>{language === "fr" ? "Version source acceptée" : "Accepted source version"}: {format.linkedSource.acceptedVersion}</span><button type="button" onClick={() => setDialog({ kind: "linkedFormatUpdate", formatId: format.id })}>{language === "fr" ? "Voir les mises à jour" : "Review updates"}</button></div>}
                <div className="format-card-fields">{format.fields.map((field) => <span key={field.id} className="format-tag">{field.name}<small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>)}</div>
              </div>)}</div>
            </section>
            <div className="entries-heading"><div><span className="section-overline">{t(language, "savedEntries")}</span><h2>{t(language, "entries")} <span>{entries.length}{nextCursor ? "+" : ""}</span></h2></div><Button variant="secondary" onClick={() => setQuickEntry(true)}>{language === "fr" ? "Saisie rapide" : "Quick entry"}</Button><Button onClick={() => setDialog({ kind: "entry" })}><Plus size={19} /> {t(language, "newEntry")}</Button></div>
            <div className="saved-view-bar">
              <label>{language === "fr" ? "Vue" : "View"}<select value={selectedViewId} onChange={(event) => setSelectedViewId(event.target.value)}><option value="">{language === "fr" ? "Liste par défaut" : "Default list"}</option>{selected.savedViews?.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}</select></label>
              <Button variant="secondary" onClick={() => setDialog({ kind: "view" })}><Plus size={16} />{language === "fr" ? "Enregistrer une vue" : "Save a view"}</Button>
              {selectedView && <><Button variant="secondary" onClick={() => setDialog({ kind: "view", viewId: selectedView.id })}>{language === "fr" ? "Modifier la vue" : "Edit view"}</Button><Button variant="subtle" onClick={async () => { try { const updated = await api.deleteView(selected.id, selectedView.id); setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelectedViewId(""); } catch (cause) { setLoadError(cause); } }}>{language === "fr" ? "Supprimer la vue" : "Delete view"}</Button></>}
            </div>
            {!selectedView && <div className="entry-tools">
              <label>{t(language, "searchEntries")}<input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label>
              <label>{t(language, "chooseFormat")}<select value={filterFormatId} onChange={(event) => { setFilterFormatId(event.target.value); setFilterFieldId(""); setFilterValueText(""); setFilterValue(""); }}><option value="">{t(language, "allFormats")}</option>{selected.formats.map((format) => <option key={format.id} value={format.id}>{formatDisplayName(format, language)}</option>)}</select></label>
              {filterFormat && <label>{t(language, "filterField")}<select value={filterFieldId} onChange={(event) => { setFilterFieldId(event.target.value); setFilterOperator("EQ"); setFilterValueText(""); setFilterValue(""); }}><option value="">{t(language, "noFilter")}</option>{filterFormat.fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select></label>}
              {filterField && <><label>{t(language, "filterField")}<select value={filterOperator} onChange={(event) => setFilterOperator(event.target.value as EntryFilter["operator"])}><option value="EQ">{t(language, "equals")}</option>{["TITLE", "TEXT", "LONG_TEXT", "LINK", "CHARACTER", "ATTACHMENT"].includes(filterField.kind) && <option value="CONTAINS">{t(language, "contains")}</option>}{["NUMBER", "DURATION", "DATE", "DATETIME", "TIME"].includes(filterField.kind) && <><option value="GT">{t(language, "greaterThan")}</option><option value="LT">{t(language, "lessThan")}</option></>}</select></label><label>{t(language, "filterValue")}{filterField.kind === "BOOLEAN" || ["SELECT", "MULTI_SELECT"].includes(filterField.kind) ? <select value={filterValueText} onChange={(event) => setFilterValueText(event.target.value)}><option value="">—</option>{(filterField.kind === "BOOLEAN" ? ["true", "false"] : filterField.options ?? []).map((option) => <option key={option} value={option}>{option === "true" ? t(language, "yes") : option === "false" ? t(language, "no") : option}</option>)}</select> : <input value={filterValueText} onChange={(event) => setFilterValueText(event.target.value)} type={filterField.kind === "DATE" ? "date" : filterField.kind === "NUMBER" ? "number" : "text"} />}</label></>}
            </div>}
            {selectedView?.layout === "CALENDAR" ? <CalendarView collection={selected} view={selectedView} language={language} refreshToken={calendarRefresh} onEdit={(entry) => setDialog({ kind: "entry", entry })} onReminder={(entry) => setDialog({ kind: "reminder", entry })} /> : loadingEntries ? <div className="entries-loading"><div className="boot-spinner" />{t(language, "loading")}</div> : entries.length ? <>
              {selectedView?.layout === "TASKS" ? <div className="task-list">{entries.map((entry) => { const titleField = selected.formats.find((item) => item.id === entry.formatId)?.fields.find((field) => field.kind === "TITLE"); const done = entry.values.find((item) => item.fieldId === selectedView.taskDoneFieldId)?.value === "true"; const due = entry.values.find((item) => item.fieldId === selectedView.taskDueFieldId)?.value; const priority = entry.values.find((item) => item.fieldId === selectedView.taskPriorityFieldId)?.value; return <div key={entry.id} className="task-row"><label><input type="checkbox" checked={done} onChange={async (event) => { try { const updated = await api.setTaskCompleted(selected.id, selectedView.id, entry.id, event.target.checked); setEntries((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (cause) { setLoadError(cause); } }} /><span className={done ? "done" : ""}>{entry.values.find((item) => item.fieldId === titleField?.id)?.value ?? selected.formats.find((item) => item.id === entry.formatId)?.name}</span></label>{priority && <small>{priority}</small>}{due && <time>{due.slice(0, 16).replace("T", " ")}</time>}<button type="button" onClick={() => setDialog({ kind: "reminder", entry })}><Bell size={15} /> {language === "fr" ? "Rappel" : "Reminder"}</button><button type="button" onClick={() => setDialog({ kind: "entry", entry })}>{t(language, "edit")}</button></div>; })}</div> : selectedView?.layout === "TABLE" ? <div className="saved-view-table-wrap"><table className="saved-view-table"><thead><tr><th>{language === "fr" ? "Format de données" : "Data format"}</th><th>{language === "fr" ? "Créée" : "Created"}</th>{selectedView.columnFieldIds.map((fieldId) => <th key={fieldId}>{selected.formats.flatMap((format) => format.fields).find((field) => field.id === fieldId)?.name ?? fieldId}</th>)}<th>{language === "fr" ? "Action" : "Action"}</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{selected.formats.find((format) => format.id === entry.formatId)?.name}</td><td>{dateTime(entry.createdAt, language)}</td>{selectedView.columnFieldIds.map((fieldId) => { const format = selected.formats.find((item) => item.id === entry.formatId); const field = format?.fields.find((item) => item.id === fieldId); const value = entry.values.find((item) => item.fieldId === fieldId); return <td key={fieldId}>{field && value ? formatFieldValue(field, value.value, language, value.unitSnapshot) : "—"}</td>; })}<td><button type="button" onClick={() => setDialog({ kind: "entry", entry })}>{t(language, "edit")}</button></td></tr>)}</tbody></table></div> : selectedView?.groupByFormat ? selected.formats.filter((format) => entries.some((entry) => entry.formatId === format.id)).map((format) => <section key={format.id} className="saved-view-group"><h3>{format.name}</h3><div className={selectedView.layout === "LIST" ? "entry-grid saved-view-list" : "entry-grid"}>{entries.filter((entry) => entry.formatId === format.id).map((entry) => <EntryCard key={entry.id} entry={entry} collection={selected} language={language} onEdit={() => setDialog({ kind: "entry", entry })} onDelete={() => { setDialogError(""); setDialog({ kind: "deleteEntry", entry }); }} onCopy={() => copy(entry)} onLinks={() => setDialog({ kind: "entryLinks", entry })} onReminder={selected.formats.find((item) => item.id === entry.formatId)?.fields.some((field) => ["DATE", "DATETIME"].includes(field.kind) && entry.values.some((value) => value.fieldId === field.id)) ? () => setDialog({ kind: "reminder", entry }) : undefined} />)}</div></section>) : <div className={selectedView?.layout === "LIST" ? "entry-grid saved-view-list" : "entry-grid"}>{entries.map((entry) => <EntryCard key={entry.id} entry={entry} collection={selected} language={language} onEdit={() => setDialog({ kind: "entry", entry })} onDelete={() => { setDialogError(""); setDialog({ kind: "deleteEntry", entry }); }} onCopy={() => copy(entry)} onLinks={() => setDialog({ kind: "entryLinks", entry })} onReminder={selected.formats.find((item) => item.id === entry.formatId)?.fields.some((field) => ["DATE", "DATETIME"].includes(field.kind) && entry.values.some((value) => value.fieldId === field.id)) ? () => setDialog({ kind: "reminder", entry }) : undefined} />)}</div>}
              {nextCursor && <div className="more-entries"><Button variant="secondary" onClick={loadMoreEntries} disabled={loadingMore}>{loadingMore ? t(language, "loading") : t(language, "loadMore")}</Button></div>}
            </> : <div className="empty-state entries-empty"><div className="empty-art"><BookOpen size={46} strokeWidth={1.4} /></div><h2>{search || filterFormatId || selectedView ? t(language, "noMatches") : t(language, "noEntries")}</h2><p>{search || filterFormatId || selectedView ? "" : t(language, "noEntriesDetail")}</p>{!search && !filterFormatId && !selectedView && <Button variant="secondary" onClick={() => setDialog({ kind: "entry" })}><Plus size={17} /> {t(language, "writeEntry")}</Button>}</div>}
          </>}
        </div>
      </main>
      {notice && <div className="toast" role="status"><Check size={18} />{notice}</div>}
      {quickCapture && <QuickCaptureDialog collections={collections} userId={user.id} language={language} incoming={sharedContent} onClose={() => setQuickCapture(false)} onSaved={(collectionId, entry) => { setQuickCapture(false); setSelectedId(collectionId); if (selectedId === collectionId) setEntries((current) => [entry, ...current]); }} onOpen={(collectionId, entry) => { setQuickCapture(false); setSelectedId(collectionId); setDialog({ kind: "entry", entry }); }} />}
      {quickEntry && selected && <QuickEntryDialog collection={selected} userId={user.id} language={language} onClose={() => setQuickEntry(false)} onSaved={(entry) => { setEntries((current) => [entry, ...current]); setQuickEntry(false); }} />}
      {dialog?.kind === "starter" && <Modal title={language === "fr" ? "Choisir un modèle" : "Choose a template"} closeLabel={t(language, "close")} onClose={() => setDialog(null)} size="wide"><StarterDialog language={language} onClose={() => setDialog(null)} onCreated={(collection) => { setCollections((current) => [collection, ...current]); setSelectedId(collection.id); setDialog(null); }} /></Modal>}
      {dialog?.kind === "entryLinks" && selected && <Modal title={language === "fr" ? "Liens entre entrées" : "Entry links"} closeLabel={t(language, "close")} onClose={() => setDialog(null)} size="wide"><EntryLinksDialog collection={selected} entry={dialog.entry} language={language} onClose={() => setDialog(null)} onOpenEntry={(entry) => setDialog({ kind: "entry", entry })} /></Modal>}
      {dialog?.kind === "collection" && <CollectionEditor language={language} onClose={() => setDialog(null)} onSaved={(collection) => { setCollections((current) => [collection, ...current]); setSelectedId(collection.id); setDialog(null); }} />}
      {dialog?.kind === "addFormat" && selected && <CollectionEditor key={selected.id} collection={selected} language={language} onClose={() => setDialog(null)} onSaved={(updated) => { setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); setDialog(null); }} />}
      {dialog?.kind === "editFormat" && selected && <CollectionEditor key={`${selected.id}-${dialog.formatId}`} collection={selected} editingFormat={selected.formats.find((item) => item.id === dialog.formatId)} language={language} onClose={() => setDialog(null)} onSaved={(updated) => { setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); setDialog(null); }} />}
      {dialog?.kind === "formatColor" && selected && <FormatColorEditor key={`${selected.id}-${dialog.formatId}`} collection={selected} formatId={dialog.formatId} language={language} onClose={() => setDialog(null)} onSaved={(updated) => { setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); setDialog(null); }} />}
      {dialog?.kind === "entry" && selected && <EntryEditor key={dialog.entry?.id ?? dialog.formatId ?? "new"} collection={selected} entry={dialog.entry} initialFormatId={dialog.formatId} language={language} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); void refresh(); }} />}
      {dialog?.kind === "objects" && selected && <ObjectLibrary collection={selected} language={language} onClose={() => setDialog(null)} onCollection={(updated) => setCollections((current) => current.map((item) => item.id === updated.id ? updated : item))} onCreate={(formatId) => setDialog({ kind: "entry", formatId })} onEdit={(entry) => setDialog({ kind: "entry", entry })} onCopyTo={(objectId) => setDialog({ kind: "copyObject", objectId })} onMoveTo={(objectId) => setDialog({ kind: "moveObject", objectId })} onShareTo={(object) => setDialog({ kind: "shareObject", object })} onChanged={() => { void refresh(); }} />}
      {dialog?.kind === "copyObject" && selected && <CopyToCollection source={selected} targets={collections} objectId={dialog.objectId} language={language} onClose={() => setDialog(null)} onCopied={() => { setDialog(null); void api.collections().then(setCollections); }} />}
      {dialog?.kind === "moveObject" && selected && <CopyToCollection source={selected} targets={collections} objectId={dialog.objectId} move language={language} onClose={() => setDialog(null)} onCopied={() => { setDialog(null); void refresh(); }} />}
      {dialog?.kind === "shareObject" && selected && <ShareObjectToCollection source={selected} targets={collections} object={dialog.object} language={language} onClose={() => setDialog(null)} onShared={() => { setDialog(null); void api.collections().then(setCollections); }} />}
      {dialog?.kind === "copyFormat" && selected && <CopyToCollection source={selected} targets={collections} formatId={dialog.formatId} language={language} onClose={() => setDialog(null)} onCopied={() => { setDialog(null); void api.collections().then(setCollections); }} />}
      {dialog?.kind === "linkFormat" && selected && <CopyToCollection source={selected} targets={collections} formatId={dialog.formatId} link language={language} onClose={() => setDialog(null)} onCopied={() => { setDialog(null); void api.collections().then(setCollections); }} />}
      {dialog?.kind === "linkedFormatUpdate" && selected && <LinkedFormatUpdate collection={selected} formatId={dialog.formatId} language={language} onClose={() => setDialog(null)} onChanged={(updated) => { setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); setDialog(null); }} />}
      {dialog?.kind === "view" && selected && <SavedViewEditor collection={selected} existing={selected.savedViews?.find((item) => item.id === dialog.viewId)} current={{ search, formatId: filterFormatId, filterFieldId, filterOperator, filterValue }} language={language} onClose={() => setDialog(null)} onSaved={(updated, id) => { setCollections((current) => current.map((item) => item.id === updated.id ? updated : item)); if (id) setSelectedViewId(id); setDialog(null); }} />}
      {dialog?.kind === "reminder" && selected && <ReminderEditor collection={selected} entry={dialog.entry} view={selectedView} language={language} onClose={() => setDialog(null)} />}
      {dialog?.kind === "transfer" && <TransferEditor collection={selected} language={language} onClose={() => setDialog(null)} onImported={(updated) => { setCollections((current) => current.some((item) => item.id === updated.id) ? current : [updated, ...current]); if (updated.id === selectedId) void refresh(); else selectCollection(updated.id); }} />}
      {dialog?.kind === "units" && selected && <UnitEditor collection={selected} language={language} onClose={() => setDialog(null)} onSaved={(updated) => setCollections((current) => current.map((item) => item.id === updated.id ? updated : item))} />}
      {dialog?.kind === "rename" && selected && <Modal title={t(language, "renameCollection")} closeLabel={t(language, "close")} onClose={() => setDialog(null)}><form onSubmit={renameCollection} className="modal-form"><label className="input-label">{t(language, "collectionName")}<input autoFocus value={rename} onChange={(event) => setRename(event.target.value)} maxLength={80} required /></label>{dialogError && <div className="form-error" role="alert">{dialogError}</div>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setDialog(null)}>{t(language, "cancel")}</Button><Button type="submit" disabled={busy}>{busy ? t(language, "saving") : t(language, "save")}</Button></div></form></Modal>}
      {dialog?.kind === "deleteCollection" && selected && <Modal title={t(language, "deleteCollectionQuestion")} closeLabel={t(language, "close")} onClose={() => setDialog(null)}><div className="confirm-body"><p>{t(language, "deleteCollectionDetail")}</p><strong>{selected.name}</strong>{dialogError && <div className="form-error" role="alert">{dialogError}</div>}<div className="modal-actions"><Button variant="secondary" onClick={() => setDialog(null)}>{t(language, "cancel")}</Button><Button variant="danger" disabled={busy} onClick={removeCollection}>{t(language, "deleteCollection")}</Button></div></div></Modal>}
      {dialog?.kind === "deleteEntry" && <Modal title={t(language, "deleteEntryQuestion")} closeLabel={t(language, "close")} onClose={() => setDialog(null)}><div className="confirm-body"><p>{t(language, "deleteEntryDetail")}</p>{dialogError && <div className="form-error" role="alert">{dialogError}</div>}<div className="modal-actions"><Button variant="secondary" onClick={() => setDialog(null)}>{t(language, "cancel")}</Button><Button variant="danger" disabled={busy} onClick={() => removeEntry(dialog.entry)}>{t(language, "deleteEntry")}</Button></div></div></Modal>}
    </div>
  );
}

