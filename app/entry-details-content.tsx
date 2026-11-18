import type { ReactNode } from "react";
import { CalendarDays, Link2, Pencil } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import { formatDisplayName, formatFieldValue, formatForEntry, t, valuesByField, type Collection, type Entry, type Language } from "../lib/brainy";
import { previewableUrl } from "../lib/link-preview";
import LinkPreviewCard from "./link-preview-card";
import { FieldKindIcon } from "../lib/field-kind-icons";
import LinkMediaView from "./link-media";
import { linkMedia } from "../lib/link-media";
import { Avatar } from "./entry-authors";

type Field = Collection["formats"][number]["fields"][number];

export default function EntryDetailsContent({ entry, collection, language, renderReference, onDownload }: {
  entry: Entry;
  collection: Collection;
  language: Language;
  renderReference: (field: Field) => ReactNode;
  onDownload: (field: Field) => void;
}) {
  const format = formatForEntry(collection, entry);
  const values = valuesByField(entry);
  const fields = format.fields.filter((field) => values[field.id]?.trim());
  const edited = Math.abs(new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime()) > 2000;
  const date = (value: string) => new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  // A web address gets a rich preview (image, title, description, site) above the address itself, as in a chat app.
  // Only here, in the details: the list keeps its compact rows.
  const renderLink = (value: string) => {
    const url = previewableUrl(value);
    const address = <a href={value} target="_blank" rel="noopener noreferrer"><Link2 size={15} />{value}</a>;
    if (linkMedia(value)?.kind !== "embed" && linkMedia(value)) return <div className="link-media-with-address"><LinkMediaView url={value} label={value} fallback={null} />{address}</div>;
    return url ? <div className="entry-detail-link"><LinkPreviewCard url={url} language={language} />{address}</div> : address;
  };
  return <div className="entry-detail">
    <div className="entry-detail-meta">
      <span className="entry-detail-format" style={formatColorStyle(format.color)}>{formatDisplayName(format, language)}</span>
      {!entry.createdBy && <span><CalendarDays size={14} aria-hidden="true" />{t(language, "created")} {date(entry.createdAt)}</span>}
      {!entry.createdBy && edited && <span><Pencil size={14} aria-hidden="true" />{t(language, "edited")} {date(entry.updatedAt)}</span>}
    </div>
    {/* Who created the entry and, once it was changed, who changed it last, in every collection. */}
    {entry.createdBy && <dl className="entry-detail-people">
      <div><dt><CalendarDays size={14} aria-hidden="true" />{language === "fr" ? "Créée par" : "Created by"}</dt><dd><Avatar person={entry.createdBy} /><strong>{entry.createdBy.name}</strong><span>{date(entry.createdAt)}</span></dd></div>
      {edited && entry.updatedBy && <div><dt><Pencil size={14} aria-hidden="true" />{language === "fr" ? "Dernière modification par" : "Last modified by"}</dt><dd><Avatar person={entry.updatedBy} /><strong>{entry.updatedBy.name}</strong><span>{date(entry.updatedAt)}</span></dd></div>}
    </dl>}
    <dl className="entry-detail-fields">{fields.map((field) => <div key={field.id}>
      <dt><FieldKindIcon kind={field.kind} size={14} />{field.name}</dt>
      <dd>{field.kind === "OBJECT_REF" ? renderReference(field) : field.kind === "LINK" ? renderLink(values[field.id]) : field.kind === "ATTACHMENT" ? <button type="button" className="attachment-download" onClick={() => onDownload(field)}>{values[field.id]}</button> : formatFieldValue(field, values[field.id], language, entry.values.find((item) => item.fieldId === field.id)?.unitSnapshot, collection)}</dd>
    </div>)}</dl>
  </div>;
}
