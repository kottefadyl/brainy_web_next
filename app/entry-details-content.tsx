import type { ReactNode } from "react";
import { CalendarDays, Link2, Pencil } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import { formatDisplayName, formatFieldValue, formatForEntry, t, valuesByField, type Collection, type Entry, type Language } from "../lib/brainy";

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
  return <div className="entry-detail">
    <div className="entry-detail-meta">
      <span className="entry-detail-format" style={formatColorStyle(format.color)}>{formatDisplayName(format, language)}</span>
      <span><CalendarDays size={14} aria-hidden="true" />{t(language, "created")} {date(entry.createdAt)}</span>
      {edited && <span><Pencil size={14} aria-hidden="true" />{t(language, "edited")} {date(entry.updatedAt)}</span>}
    </div>
    <dl className="entry-detail-fields">{fields.map((field) => <div key={field.id}>
      <dt>{field.name}</dt>
      <dd>{field.kind === "OBJECT_REF" ? renderReference(field) : field.kind === "LINK" ? <a href={values[field.id]} target="_blank" rel="noopener noreferrer"><Link2 size={15} />{values[field.id]}</a> : field.kind === "ATTACHMENT" ? <button type="button" className="attachment-download" onClick={() => onDownload(field)}>{values[field.id]}</button> : formatFieldValue(field, values[field.id], language, entry.values.find((item) => item.fieldId === field.id)?.unitSnapshot, collection)}</dd>
    </div>)}</dl>
  </div>;
}
