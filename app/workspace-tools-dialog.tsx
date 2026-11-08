"use client";

import { X, SlidersHorizontal } from "lucide-react";
import WorkspaceBackupPanel from "./workspace-backup-panel";
import BackgroundJobsPanel from "./background-jobs-panel";
import type { Collection, Language } from "../lib/brainy";
import { t } from "../lib/brainy";

export default function WorkspaceToolsDialog({
  collections,
  language,
  onClose,
  onRestored,
}: {
  collections: Collection[];
  language: Language;
  onClose: () => void;
  onRestored: () => void;
}) {
  const fr = language === "fr";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-wide workspace-tools-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-tools-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="workspace-tools-head">
            <span className="workspace-tools-icon">
              <SlidersHorizontal size={20} />
            </span>
            <div>
              <h2 id="workspace-tools-title">
                {fr ? "Outils de l’espace de travail" : "Workspace tools"}
              </h2>
              <p className="workspace-tools-subtitle">
                {fr
                  ? "Sauvegardes complètes, restaurations et traitements asynchrones"
                  : "Full workspace backups, restores, and background processing"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t(language, "close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body workspace-tools-body">
          <div className="workspace-tools-section">
            <WorkspaceBackupPanel language={language} onRestored={onRestored} />
          </div>
          <div className="workspace-tools-section">
            <BackgroundJobsPanel collections={collections} language={language} />
          </div>
        </div>
      </div>
    </div>
  );
}

