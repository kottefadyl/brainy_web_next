import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { t, type Collection, type Language } from "../../../lib/brainy";
import CollectionSidebar from "../../collection-sidebar";

type Props = {
  brand: ReactNode;
  collections: Collection[];
  selectedId: string | null;
  loading: boolean;
  language: Language;
  userName: string;
  userEmail: string;
  userPhoto?: string | null;
  onSelect: (id: string) => void;
  onTemplate: () => void;
  onManual: () => void;
  onTransfer: () => void;
  onTools: () => void;
  onGuide?: () => void;
  onGuideCenter?: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
};

export function Sidebar({ brand, collections, selectedId, loading, language, userName, userEmail, userPhoto, onSelect, onTemplate, onManual, onTransfer, onTools, onGuide, onGuideCenter, onEditProfile, onSignOut }: Props) {
  return <aside className="sidebar" aria-label={t(language, "collections")}>
    <div className="sidebar-top">{brand}<p>{t(language, "tagline")}</p></div>
    <CollectionSidebar collections={collections} selectedId={selectedId} loading={loading} language={language} onSelect={onSelect} onTemplate={onTemplate} onManual={onManual} onTransfer={onTransfer} onTools={onTools} onGuide={onGuide} onGuideCenter={onGuideCenter} />
    <div className="sidebar-bottom">
      <div className={`profile-avatar${userPhoto ? " has-photo" : ""}`} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, nothing for next/image to optimise */}
        {userPhoto ? <img src={userPhoto} alt="" /> : userName.charAt(0).toUpperCase()}
      </div>
      <button type="button" className="profile-info profile-edit-button" onClick={onEditProfile} title={t(language, "editProfile")} aria-label={`${t(language, "editProfile")}: ${userName}`}>
        <strong title={userName}>{userName}</strong><span title={userEmail}>{userEmail}</span>
      </button>
      <button type="button" className="icon-button sign-out-button" onClick={onSignOut} title={t(language, "signOut")} aria-label={t(language, "signOut")}><LogOut size={18} aria-hidden="true" /></button>
    </div>
  </aside>;
}
