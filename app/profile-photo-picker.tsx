"use client";

import { useId, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { t, type Language } from "../lib/brainy";
import { formatPhotoSize, prepareProfilePhoto, ProfilePhotoError } from "../lib/profile-photo";

type Props = { language: Language; name: string; photo: string | null; onChange: (photo: string | null) => void; onBusy?: (busy: boolean) => void };

/** Round profile photo preview with choose/remove actions; large photos are compressed before upload. */
export function ProfilePhotoPicker({ language, name, photo, onChange, onBusy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const [preparing, setPreparing] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  async function choose(file: File | undefined) {
    if (!file) return;
    setPreparing(true); onBusy?.(true); setStatus(null);
    try {
      const prepared = await prepareProfilePhoto(file);
      onChange(prepared.dataUrl);
      if (prepared.compressed) setStatus({ text: t(language, "photoCompressed").replace("{size}", formatPhotoSize(prepared.bytes, language)), error: false });
    } catch (cause) {
      const reason = cause instanceof ProfilePhotoError ? cause.reason : "unreadable";
      setStatus({ text: t(language, reason === "tooLarge" ? "photoTooLarge" : "photoUnreadable"), error: true });
    } finally {
      setPreparing(false); onBusy?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return <div className="profile-photo-picker">
    <div className="profile-photo-preview" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing for next/image to optimise */}
      {photo ? <img src={photo} alt="" /> : <span>{initial}</span>}
    </div>
    <div className="profile-photo-body">
      <strong>{t(language, "profilePhoto")} <span className="optional-label">{t(language, "optional")}</span></strong>
      <div className="profile-photo-actions">
        <button type="button" className="button secondary" disabled={preparing} aria-describedby={statusId} onClick={() => inputRef.current?.click()}>
          <Camera size={16} aria-hidden="true" /> {preparing ? t(language, "photoPreparing") : t(language, photo ? "changePhoto" : "choosePhoto")}
        </button>
        {photo && !preparing && <button type="button" className="button subtle" onClick={() => { onChange(null); setStatus(null); }}>
          <Trash2 size={16} aria-hidden="true" /> {t(language, "removePhoto")}
        </button>}
      </div>
      <small id={statusId} className={status?.error ? "profile-photo-status error" : "profile-photo-status"} role={status?.error ? "alert" : "status"}>
        {status?.text ?? t(language, "photoHint")}
      </small>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => void choose(event.target.files?.[0])} />
    </div>
  </div>;
}
