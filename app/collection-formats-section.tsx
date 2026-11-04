import { Copy, Link2, Palette, Pencil, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import {
  fieldKindLabel, formatColors, formatDisplayName, t,
  type Collection, type Language,
} from "../lib/brainy";

type Props = {
  collection: Collection;
  language: Language;
  onAdd: () => void;
  onEdit: (formatId: string) => void;
  onColor: (formatId: string) => void;
  onCopy: (formatId: string) => void;
  onLink: (formatId: string) => void;
  onReviewUpdate: (formatId: string) => void;
};

export default function CollectionFormatsSection({ collection, language, onAdd, onEdit, onColor, onCopy, onLink, onReviewUpdate }: Props) {
  return (
    <section className="format-strip" aria-label={t(language, "formats")}>
      <div className="format-strip-head">
        <div><span className="section-overline">{t(language, "formats")}</span><p>{t(language, "formatHelp")}</p></div>
        <button type="button" className="button button-secondary" disabled={collection.formats.length >= formatColors.length} onClick={onAdd}>
          <Plus size={16} /> {t(language, "addFormat")}
        </button>
      </div>
      <div className="format-cards">
        {collection.formats.map((format) => {
          const name = formatDisplayName(format, language);
          return (
            <div key={format.id} className="format-card" style={{ "--format-color": format.color } as CSSProperties}>
              <div className="format-card-head">
                <strong>{name}</strong>
                <div className="format-card-actions">
                  <button type="button" onClick={() => onEdit(format.id)} aria-label={`${t(language, "editFormat")}: ${name}`} title={t(language, "editFormat")}><Pencil size={16} /></button>
                  <button type="button" onClick={() => onColor(format.id)} aria-label={`${t(language, "changeColor")}: ${name}`} title={t(language, "changeColor")}><Palette size={16} /></button>
                  <button type="button" onClick={() => onCopy(format.id)} aria-label={`${language === "fr" ? "Copier vers" : "Copy to"}: ${name}`} title={language === "fr" ? "Copier vers…" : "Copy to…"}><Copy size={16} /></button>
                  <button type="button" onClick={() => onLink(format.id)} aria-label={`${language === "fr" ? "Partager par lien" : "Share by link"}: ${name}`} title={language === "fr" ? "Partager par lien…" : "Share by link…"}><Link2 size={16} /></button>
                </div>
              </div>
              {format.linkedSource && <div className="format-linked-source"><span>{language === "fr" ? "Version source acceptée" : "Accepted source version"}: {format.linkedSource.acceptedVersion}</span><button type="button" onClick={() => onReviewUpdate(format.id)}>{language === "fr" ? "Voir les mises à jour" : "Review updates"}</button></div>}
              <div className="format-card-fields">
                {format.fields.map((field) => <span key={field.id} className="format-tag">{field.name}<small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
