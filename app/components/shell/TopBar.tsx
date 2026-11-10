"use client";

import type { ReactNode, Ref } from "react";
import { LoaderCircle, Menu, RefreshCw } from "lucide-react";
import { t, type Language } from "../../../lib/brainy";

type Props = {
  brand: ReactNode;
  selectedName?: string;
  language: Language;
  themeControl: ReactNode;
  languageControl: ReactNode;
  account?: ReactNode;
  refreshBusy: boolean;
  menuOpen: boolean;
  menuButtonRef: Ref<HTMLButtonElement>;
  onCapture: () => void;
  onRefresh: () => void;
  onToggleMenu: () => void;
};

export function TopBar({ brand, selectedName, language, themeControl, languageControl, account, refreshBusy, menuOpen, menuButtonRef, onCapture, onRefresh, onToggleMenu }: Props) {
  const refreshing = language === "fr" ? "Actualisation…" : "Refreshing…";
  return <header className="topbar">
    <div className="mobile-brand">{brand}</div>
    <nav className="topbar-path" aria-label={language === "fr" ? "Fil d’Ariane" : "Breadcrumb"}>
      <span aria-current={selectedName ? undefined : "page"}>{t(language, "workspace")}</span>
      {selectedName && <><span className="slash" aria-hidden="true">/</span><span className="topbar-current" aria-current="page" title={selectedName}>{selectedName}</span></>}
    </nav>
    <div className="topbar-right">
      <button type="button" className="quick-topbar" onClick={onCapture}>{language === "fr" ? "Capturer" : "Capture"}</button>
      {themeControl}{languageControl}
      <button type="button" className="icon-button refresh-button" onClick={onRefresh} disabled={refreshBusy} aria-label={refreshBusy ? refreshing : t(language, "refresh")} title={refreshBusy ? refreshing : t(language, "refresh")} aria-busy={refreshBusy}>
        {refreshBusy ? <LoaderCircle size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}<span>{refreshBusy ? refreshing : t(language, "refresh")}</span>
      </button>
      {account}
      <button type="button" ref={menuButtonRef} className="mobile-menu-button" onClick={onToggleMenu} aria-label={menuOpen ? language === "fr" ? "Fermer les collections" : "Close collections" : language === "fr" ? "Ouvrir les collections" : "Open collections"} aria-expanded={menuOpen} aria-haspopup="dialog" aria-controls="mobile-collection-menu"><Menu size={22} aria-hidden="true" /></button>
    </div>
  </header>;
}
