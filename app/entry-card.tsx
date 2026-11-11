import { CalendarDays, Pencil } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import { formatDisplayName, formatFieldValue, formatForEntry, t, valuesByField, type Collection, type Entry, type Language } from "../lib/brainy";
import EntryRowActions from "./entry-row-actions";
import LinkPreviewCard from "./link-preview-card";
import { previewableUrl } from "../lib/link-preview";

function dateTime(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function EntryCard({ entry, collection, language, selected, onDetails, onEdit, onDelete, onCopy, onReminder, onLinks }: { entry: Entry; collection: Collection; language: Language; selected?: boolean; onDetails: () => void; onEdit: () => void; onDelete: () => void; onCopy: () => void; onReminder?: () => void; onLinks?: () => void }) {
  const format = formatForEntry(collection, entry);
  const values = valuesByField(entry);
  const visible = format.fields.filter((field) => values[field.id]?.trim());
  const titleField = visible.find((field) => field.kind === "TITLE");
  const title = titleField ? values[titleField.id] : null;
  const preview = visible.find((field) => field.id !== titleField?.id);
  const previewValue = preview && preview.kind !== "OBJECT_REF" && preview.kind !== "ATTACHMENT" ? formatFieldValue(preview, values[preview.id], language, entry.values.find((item) => item.fieldId === preview.id)?.unitSnapshot, collection) : null;
  // Without a title the first value heads the row, so the next readable one takes the preview place.
  const second = title ? undefined : visible.slice(1).find((field) => field.kind !== "OBJECT_REF" && field.kind !== "ATTACHMENT");
  const secondValue = second ? formatFieldValue(second, values[second.id], language, entry.values.find((item) => item.fieldId === second.id)?.unitSnapshot, collection) : null;
  // T48: only Saved links collections, and only when the link field holds a web address.
  const linkUrl = collection.templateId === "links" ? format.fields.filter((field) => field.kind === "LINK").map((field) => previewableUrl(values[field.id])).find(Boolean) ?? null : null;
  const edited = Math.abs(new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime()) > 2000;
  return (
    <article className="entry-card entry-row" style={formatColorStyle(format.color)} data-selected={selected || undefined}>
      <div className="entry-row-body">
        <div className="entry-row-meta">
          <span className="entry-format-label">{formatDisplayName(format, language)}</span>
          <span className="entry-date"><CalendarDays size={14} /> {t(language, "created")} {dateTime(entry.createdAt, language)}</span>
          {edited && <span className="entry-edited"><Pencil size={13} aria-hidden="true" /> {t(language, "edited")} {dateTime(entry.updatedAt, language)}</span>}
          {entry.contributionLinkId && entry.contributionReceivedAt && <span className="entry-edited">{language === "fr" ? "Contribution externe reçue le" : "External contribution received"} {dateTime(entry.contributionReceivedAt, language)}</span>}
          {format.appendOnly && <span className="entry-edited">{language === "fr" ? "Écriture" : "Writing"} #{entry.ledgerSequence}{entry.correctionOf ? ` · ${language === "fr" ? "Correction de" : "Correction of"} ${entry.correctionOf}` : ""}</span>}
        </div>
        <div className="entry-row-content">
          <h3 className="entry-title"><button type="button" onClick={onDetails} title={title ?? undefined}>{title ?? previewValue ?? formatDisplayName(format, language)}</button></h3>
          {title && previewValue && <span className="entry-preview" title={previewValue}>{previewValue}</span>}
          {secondValue && <span className="entry-preview" title={secondValue}>{secondValue}</span>}
          {linkUrl && <LinkPreviewCard url={linkUrl} language={language} />}
        </div>
        <EntryRowActions language={language} appendOnly={!!format.appendOnly} onDetails={onDetails} onCopy={onCopy} onEdit={onEdit} onDelete={onDelete} onLinks={onLinks} onReminder={onReminder} />
      </div>
    </article>
  );
}
