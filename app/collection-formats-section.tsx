import { Copy, Layers3, Link2, Palette, Pencil, Plus } from "lucide-react";
import { ActionPopover } from "./components/ui/ActionPopover";
import { formatColorStyle } from "../lib/format-colors";
import { FormatAuthors } from "./entry-authors";
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
          <FormatAuthors collection={collection} language={language} />
          <div className="format-card-head"><span className="format-card-symbol" aria-hidden="true"><Layers3 size={18} /></span><div className="format-card-title"><strong>{name}</strong><span className="format-card-subtitle">{fieldText} · {entryText}</span></div></div>
          {format.linkedSource && <div className="format-linked-source"><span>{fr ? "Version source acceptée" : "Accepted source version"}: {format.linkedSource.acceptedVersion}</span><button type="button" onClick={() => onReviewUpdate(format.id)}>{fr ? "Voir les mises à jour" : "Review updates"}</button></div>}
          <div className="format-card-fields">
            {format.fields.slice(0, 3).map((field) => <span key={field.id} className="format-tag">{field.name}<small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>)}
            {format.fields.length > 3 && <details className="format-fields-extra"><summary>{fr ? `${format.fields.length - 3} autre${format.fields.length > 4 ? "s champs" : " champ"}` : `${format.fields.length - 3} more field${format.fields.length > 4 ? "s" : ""}`}</summary><div>{format.fields.slice(3).map((field) => <span key={field.id} className="format-tag">{field.name}<small>{fieldKindLabel(language, field.kind)}{field.unit ? ` · ${field.unit}` : ""}</small></span>)}</div></details>}
          </div>
          <div className="format-card-footer">
            <button type="button" className="format-add-entry" onClick={() => onAddEntry(format.id)}><Plus size={17} aria-hidden="true" /> {fr ? "Ajouter une entrée" : "Add entry"}</button>
            <ActionPopover label={fr ? `Actions pour le format de données ${name}` : `Actions for data format ${name}`} actions={[
              { label: t(language, "editFormat"), icon: <Pencil size={16} aria-hidden="true" />, onSelect: () => onEdit(format.id) },
              { label: t(language, "changeColor"), icon: <Palette size={16} aria-hidden="true" />, onSelect: () => onColor(format.id) },
              { label: fr ? "Copier vers une collection" : "Copy to a collection", icon: <Copy size={16} aria-hidden="true" />, onSelect: () => onCopy(format.id) },
              { label: fr ? "Partager par lien" : "Share by link", icon: <Link2 size={16} aria-hidden="true" />, onSelect: () => onLink(format.id) },
            ]} />
          </div>
        </article>;
      })}
    </div>
  </section>;
}
