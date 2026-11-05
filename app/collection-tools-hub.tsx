"use client";

import { useState } from "react";
import {
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  BookLock,
  Box,
  GitBranch,
  Inbox,
  MapPin,
  ShieldCheck,
  Workflow,
  Ruler,
  SlidersHorizontal,
} from "lucide-react";
import type { Collection, Language, User } from "../lib/brainy";
import { t } from "../lib/brainy";

export default function CollectionToolsHub({
  collection,
  user,
  language,
  onOpenSection,
  onOpenDialog,
}: {
  collection: Collection;
  user: User;
  language: Language;
  onOpenSection: (
    section:
      | "insights"
      | "stock"
      | "classifications"
      | "map"
      | "workflow"
      | "contributions"
      | "ledger"
      | "sensitivity"
  ) => void;
  onOpenDialog: (kind: "units" | "objects") => void;
}) {
  const [open, setOpen] = useState(false);
  const isOwner = collection.ownerId === user.id;
  const fr = language === "fr";
  const count = isOwner ? 10 : 9;

  return (
    <section
      className="collection-tools-wrapper"
      aria-label={fr ? "Outils de la collection" : "Collection tools"}
    >
      <button
        type="button"
        className={`collection-tools-toggle ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="tools-toggle-left">
          <span className="tools-toggle-icon">
            <SlidersHorizontal size={17} />
          </span>
          <div className="tools-toggle-text">
            <strong>{fr ? "Outils & options avancées" : "Advanced collection tools"}</strong>
            <small>
              {fr
                ? "Statistiques, stocks, cartes, nomenclatures, flux et registre"
                : "Analytics, stocks, maps, code lists, workflows, and ledger"}
            </small>
          </div>
        </div>
        <div className="tools-toggle-right">
          <span className="tools-badge">{count}</span>
          <ChevronDown className={`tools-chevron ${open ? "open" : ""}`} size={18} />
        </div>
      </button>

      {open && (
        <div className="collection-tools-drawer">
          {/* Groupe 1 : Analyse & Métier */}
          <div className="collection-tools-group">
            <h4 className="collection-tools-group-heading">
              {fr ? "Analyse & Métier" : "Analytics & Operations"}
            </h4>
            <div className="collection-tools-group-grid">
              <button
                type="button"
                className="collection-hub-card collection-hub-featured"
                onClick={() => onOpenSection("insights")}
              >
                <span className="collection-hub-icon">
                  <ChartNoAxesCombined size={22} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Calculs et graphiques" : "Calculations and charts"}</strong>
                  <small>
                    {fr ? "Explorer et analyser vos données" : "Explore and visualize your data"}
                  </small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>

              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenSection("stock")}
              >
                <span className="collection-hub-icon">
                  <Boxes size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Stock" : "Stock"}</strong>
                  <small>
                    {fr ? "Positions et mouvements validés" : "Positions and confirmed movements"}
                  </small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>

              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenSection("map")}
              >
                <span className="collection-hub-icon">
                  <MapPin size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Carte" : "Map"}</strong>
                  <small>{fr ? "Positions GPS et zones" : "GPS positions and zones"}</small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>
            </div>
          </div>

          {/* Groupe 2 : Structure & Modèles */}
          <div className="collection-tools-group">
            <h4 className="collection-tools-group-heading">
              {fr ? "Structure & Modèles" : "Structure & Models"}
            </h4>
            <div className="collection-tools-group-grid">
              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenDialog("units")}
              >
                <span className="collection-hub-icon">
                  <Ruler size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{t(language, "manageUnits")}</strong>
                  <small>{fr ? "Mesures et conversions" : "Measures and conversions"}</small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>

              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenDialog("objects")}
              >
                <span className="collection-hub-icon">
                  <Box size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Objets" : "Objects"}</strong>
                  <small>{fr ? "Modèles et références" : "Models and references"}</small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>

              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenSection("classifications")}
              >
                <span className="collection-hub-icon">
                  <GitBranch size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Classifications" : "Classifications"}</strong>
                  <small>{fr ? "Nomenclatures et listes de codes" : "Controlled code lists"}</small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>
            </div>
          </div>

          {/* Groupe 3 : Gouvernance & Sécurité */}
          <div className="collection-tools-group">
            <h4 className="collection-tools-group-heading">
              {fr ? "Gouvernance & Sécurité" : "Governance & Security"}
            </h4>
            <div className="collection-tools-group-grid">
              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenSection("workflow")}
              >
                <span className="collection-hub-icon">
                  <Workflow size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "États et validations" : "States and approvals"}</strong>
                  <small>
                    {fr
                      ? "Assignations, échéances et historique"
                      : "Assignments, due dates and history"}
                  </small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>

              {isOwner && (
                <button
                  type="button"
                  className="collection-hub-card"
                  onClick={() => onOpenSection("contributions")}
                >
                  <span className="collection-hub-icon">
                    <Inbox size={21} />
                  </span>
                  <span className="collection-hub-copy">
                    <strong>{fr ? "Contributions publiques" : "Public contributions"}</strong>
                    <small>
                      {fr
                        ? "Liens et réponses en quarantaine"
                        : "Links and submissions in quarantine"}
                    </small>
                  </span>
                  <ArrowRight className="collection-hub-arrow" size={17} />
                </button>
              )}

              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenSection("ledger")}
              >
                <span className="collection-hub-icon">
                  <BookLock size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Registre" : "Register"}</strong>
                  <small>
                    {fr
                      ? "Écritures, intégrité et corrections"
                      : "Writings, integrity and corrections"}
                  </small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>

              <button
                type="button"
                className="collection-hub-card"
                onClick={() => onOpenSection("sensitivity")}
              >
                <span className="collection-hub-icon">
                  <ShieldCheck size={21} />
                </span>
                <span className="collection-hub-copy">
                  <strong>{fr ? "Confidentialité" : "Privacy"}</strong>
                  <small>{fr ? "Niveaux et seuils d’analyse" : "Levels and analysis limits"}</small>
                </span>
                <ArrowRight className="collection-hub-arrow" size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
