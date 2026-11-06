import { Copy, Layers3, Link2, MoreHorizontal, Palette, Pencil, Plus } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import {
  fieldKindLabel, formatColors, formatDisplayName, t,
  type Collection, type Language,
} from "../lib/brainy";

type Props = {
  collection: Collection;
  language: Language;
  entryCounts?: Record<string, number>;
  countPartial?: boolean;
  onAdd: () => void;
  onAddEntry: (formatId: string) => void;
  onEdit: (formatId: string) => void;
  onColor: (formatId: string) => void;
  onCopy: (formatId: string) => void;
  onLink: (formatId: string) => void;
  onReviewUpdate: (formatId: string) => void;
};

export default function CollectionFormatsSection({ collection, language, entryCounts, countPartial, onAdd, onAddEntry, onEdit, onColor, onCopy, onLink, onReviewUpdate }: Props) {
  const fr = language === "fr";
  const action = (event: React.MouseEvent<HTMLButtonElement>, callback: () => void) => {
    const details = event.currentTarget.closest("details");
    if (details) details.open = false;
    callback();
  };
  return <section className="format-strip" aria-label={t(language, "formats")}>
    <div className="format-strip-head">
      <div><span className="section-overline">{t(language, "formats")}</span><p>{t(language, "formatHelp")}</p></div>
      <button type="button" className="button button-secondary" disabled={collection.formats.length >= formatColors.length} onClick={onAdd}>
        <Plus size={16} /> {t(language, "addFormat")}
      </button>
    </div>
    {collection.formats.length >= formatColors.length && <p className="action-help">{fr ? "Cette collection utilise les 24 couleurs disponibles. Vous pouvez modifier ses formats de données existants." : "This collection uses all 24 available colors. You can edit its existing data formats."}</p>}
    <div className="format-cards">
      {collection.formats.map((format) => {
        const name = formatDisplayName(format, language);
        const count = entryCounts?.[format.id] ?? 0;
        const fieldText = fr ? `${format.fields.length} ${format.fields.length === 1 ? "champ" : "champs"}` : `${format.fields.length} ${format.fields.length === 1 ? "field" : "fields"}`;
        const entryText = fr ? `${count} ${count === 1 ? "entrée" : "entrées"}${countPartial ? count === 1 ? " affichée" : " affichées" : ""}` : `${count} ${count === 1 ? "entry" : "entries"}${countPartial ? " shown" : ""}`;
        return <article key={format.id} className="format-card" style={formatColorStyle(format.color)}>
          <div className="format-card-head"><span className="format-card-symbol" aria-hidden="true"><Layers3 size={18} /></span><div className="format-card-title"><strong>{name}</strong><span className="format-card-subtitle">{fieldText} · {entryText}</span></div></div>
          {format.linkedSource && <div className="format-linked-source"><span>{fr ? "Version source acceptée" : "Accepted source version"}: {format.linkedSource.acceptedVersion}</span><button type="button" onClick={() => onReviewUpdate(format.id)}>{fr ? "Voir les mises à jour" : "Review updates"}</button></div>}
          <div className="format-card-fields">
            {format.fields.slice(0, 3).map((field) => <span key={field.id} className="format-tag">{field.name}<small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>)}
            {format.fields.length > 3 && <details className="format-fields-extra"><summary>{fr ? `${format.fields.length - 3} autre${format.fields.length > 4 ? "s champs" : " champ"}` : `${format.fields.length - 3} more field${format.fields.length > 4 ? "s" : ""}`}</summary><div>{format.fields.slice(3).map((field) => <span key={field.id} className="format-tag">{field.name}<small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>)}</div></details>}
          </div>
          <div className="format-card-footer">
            <button type="button" className="format-add-entry" onClick={() => onAddEntry(format.id)}><Plus size={17} aria-hidden="true" /> {fr ? "Ajouter une entrée" : "Add entry"}</button>
            <details className="format-card-more" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
              <summary aria-label={fr ? `Actions pour le format de données ${name}` : `Actions for data format ${name}`} title={fr ? "Autres actions" : "More actions"}><MoreHorizontal size={20} aria-hidden="true" /></summary>
              <div className="format-card-menu">
                <button type="button" onClick={(event) => action(event, () => onEdit(format.id))}><Pencil size={16} aria-hidden="true" />{t(language, "editFormat")}</button>
                <button type="button" onClick={(event) => action(event, () => onColor(format.id))}><Palette size={16} aria-hidden="true" />{t(language, "changeColor")}</button>
                <button type="button" onClick={(event) => action(event, () => onCopy(format.id))}><Copy size={16} aria-hidden="true" />{fr ? "Copier vers une collection" : "Copy to a collection"}</button>
                <button type="button" onClick={(event) => action(event, () => onLink(format.id))}><Link2 size={16} aria-hidden="true" />{fr ? "Partager par lien" : "Share by link"}</button>
              </div>
            </details>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
