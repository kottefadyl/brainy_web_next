"use client";

import { t, type Language } from "../../../lib/brainy";

type Props = { name: string; photo: string | null; language: Language; onClick: () => void };

/** Top bar account button: profile photo (or initial) and name; opens the profile. */
export function AccountButton({ name, photo, language, onClick }: Props) {
  const label = `${t(language, "editProfile")}: ${name}`;
  return <button type="button" className="account-button" onClick={onClick} aria-label={label} title={label}>
    <span className={`account-avatar${photo ? " has-photo" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing for next/image to optimise */}
      {photo ? <img src={photo} alt="" /> : name.trim().charAt(0).toUpperCase() || "?"}
    </span>
    <span className="account-name">{name}</span>
  </button>;
}
