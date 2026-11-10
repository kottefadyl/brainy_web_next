"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { t, translateError, type Language, type User } from "../lib/brainy";
import { hobbySuggestions, interestSuggestions, occupationSuggestions } from "../lib/profile-suggestions";
import { LanguagePicker } from "./components/shell/LanguagePicker";
import { ThemeToggle, type ColorMode } from "./components/shell/ThemeToggle";
import { ProfilePhotoPicker } from "./profile-photo-picker";
import { SuggestField, SuggestTagsField } from "./profile-suggest-field";

/** Loads the signed-in user's profile photo once it is known to exist; null otherwise. */
export function useProfilePhoto(user: User | null | undefined) {
  const [photo, setPhoto] = useState<string | null>(null);
  const userId = user?.id;
  const hasPhoto = Boolean(user?.hasProfilePhoto);
  useEffect(() => {
    if (!userId || !hasPhoto) return;
    let live = true;
    api.profilePhoto().then((value) => { if (live) setPhoto(value); }).catch(() => {});
    return () => { live = false; };
  }, [userId, hasPhoto]);
  return [hasPhoto ? photo : null, setPhoto] as const;
}

type Props = {
  brand: ReactNode; user: User; photo: string | null; language: Language; onLanguage: (value: Language) => void;
  colorMode: ColorMode; onColorMode: (mode: ColorMode) => void; onSaved: (user: User, photo: string | null) => void;
  onCancel?: () => void; onSignOut: () => void;
};

const optional = (language: Language, label: string) => <>{label} <span className="optional-label">{t(language, "optional")}</span></>;

export function ProfileScreen({ brand, user, photo: savedPhoto, language, onLanguage, colorMode, onColorMode, onSaved, onCancel, onSignOut }: Props) {
  const [name, setName] = useState(user.name);
  const [profession, setProfession] = useState(user.profession ?? "");
  const [job, setJob] = useState(user.job ?? "");
  const [fieldOfStudy, setFieldOfStudy] = useState(user.fieldOfStudy ?? "");
  const [interests, setInterests] = useState<string[]>(user.interests ?? []);
  const [hobbies, setHobbies] = useState<string[]>(user.hobbies ?? []);
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shownPhoto = photo === undefined ? savedPhoto : photo;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError(t(language, "nameRule"));
    if (!interests.length && !hobbies.length) return setError(t(language, "profileInterestRule"));
    if ([interests, hobbies].some((list) => list.length > 12 || list.some((item) => item.length > 60))) return setError(t(language, "profileLimit"));
    setBusy(true);
    try {
      if (photo !== undefined && photo !== savedPhoto) await api.updateProfilePhoto(photo);
      const updated = await api.updateProfile({ name: name.trim(), profession: profession.trim(), job: job.trim(), fieldOfStudy: fieldOfStudy.trim(), interests, hobbies });
      onSaved(updated, shownPhoto ?? null);
    } catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  }
  return <div className="profile-shell">
    <div className="profile-top">{brand}<div className="theme-controls"><ThemeToggle language={language} mode={colorMode} onChange={onColorMode} /><LanguagePicker language={language} onChange={onLanguage} /></div></div>
    <section className="profile-card">
      <div className="profile-intro"><span className="eyebrow blue"><Sparkles size={16} /> brainy</span><h1>{t(language, user.profileCompleted ? "editProfile" : "setupProfile")}</h1><p>{t(language, "profileIntro")}</p><small>{t(language, "profilePrivate")}</small></div>
      <form className="profile-form" onSubmit={submit}>
        <div className="profile-wide"><ProfilePhotoPicker language={language} name={name} photo={shownPhoto ?? null} onChange={setPhoto} onBusy={setPhotoBusy} /></div>
        <label className="input-label profile-wide">{t(language, "name")}<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label>
        <SuggestField label={optional(language, t(language, "profession"))} language={language} suggestions={occupationSuggestions} maxLength={100} value={profession} onChange={setProfession} />
        <SuggestField label={optional(language, t(language, "job"))} language={language} suggestions={occupationSuggestions} maxLength={100} value={job} onChange={setJob} />
        <label className="input-label profile-wide"><span>{optional(language, t(language, "fieldOfStudy"))}</span><input value={fieldOfStudy} onChange={(event) => setFieldOfStudy(event.target.value)} maxLength={100} /></label>
        <div className="profile-wide"><SuggestTagsField label={t(language, "interests")} language={language} suggestions={interestSuggestions} maxLength={60} values={interests} onChange={setInterests} /></div>
        <div className="profile-wide"><SuggestTagsField label={t(language, "hobbies")} language={language} suggestions={hobbySuggestions} maxLength={60} values={hobbies} onChange={setHobbies} /></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="profile-actions">
          {onCancel && <button type="button" className="button button-secondary" onClick={onCancel}>{t(language, "cancel")}</button>}
          <button type="submit" className="button button-primary" disabled={busy || photoBusy}>{busy ? t(language, "saving") : t(language, user.profileCompleted ? "saveProfile" : "continueToWorkspace")} <ArrowRight size={17} /></button>
        </div>
      </form>
    </section>
    {!user.profileCompleted && <button type="button" className="profile-signout" onClick={onSignOut}>{t(language, "signOut")}</button>}
  </div>;
}
