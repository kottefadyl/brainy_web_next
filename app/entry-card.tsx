import type { MouseEvent } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import { formatDisplayName, formatFieldValue, formatForEntry, t, valuesByField, type Collection, type Entry, type Language } from "../lib/brainy";
import EntryRowActions from "./entry-row-actions";
import LinkPreviewCard from "./link-preview-card";
import { previewableUrl } from "../lib/link-preview";
import { EntryAuthors } from "./entry-authors";
import "./entry-item.css";
import { listFields } from "./format-entry-rules-inputs";

function dateTime(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function shortDate(value: string, language: Language): string {
  const date = new Date(value);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(language, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function time(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language, { timeStyle: "short" }).format(new Date(value));
}

/** Up to three labelled values shown under the title: enough to recognise an entry at a glance. */
const FACTS_SHOWN = 3;

/**
 * One entry in the list: a title, a few labelled values, the data format and the dates. A double-click
 * anywhere on the row (or the title, or Details) opens the details; the ⋯ menu holds the other actions.
 */
export default function EntryCard({ entry, collection, language, selected, onDetails, onEdit, onDelete, onCopy, onReminder, onLinks }: { entry: Entry; collection: Collection; language: Language; selected?: boolean; onDetails: () => void; onEdit: () => void; onDelete: () => void; onCopy: () => void; onReminder?: () => void; onLinks?: () => void }) {
  const fr = language === "fr";
  const format = formatForEntry(collection, entry);
  const values = valuesByField(entry);
  const visible = format.fields.filter((field) => values[field.id]?.trim());
  const titleField = visible.find((field) => field.kind === "TITLE");
  const readable = visible.filter((field) => field.kind !== "OBJECT_REF");
  const display = (field: (typeof readable)[number]) => formatFieldValue(field, values[field.id], language, entry.values.find((item) => item.fieldId === field.id)?.unitSnapshot, collection);
  // Without a title, the first readable value heads the row and the next ones become its facts.
  const headingField = titleField ?? readable[0];
  const heading = headingField ? display(headingField) : formatDisplayName(format, language);
  // T48: only Saved links collections, and only when the link field holds a web address.
  const linkField = collection.templateId === "links" ? format.fields.find((field) => field.kind === "LINK" && previewableUrl(values[field.id])) : undefined;
  const linkUrl = linkField ? previewableUrl(values[linkField.id]) ?? null : null;
  // The preview already shows the link: its raw address is not repeated among the values.
  // The fields chosen for the list in the data format (3 at most), otherwise the first filled ones.
  const chosen = listFields(format.fields);
  const factFields = (chosen ? readable.filter((field) => chosen.some((item) => item.id === field.id)) : readable).filter((field) => field.id !== headingField?.id && field.id !== linkField?.id);
  const facts = factFields.slice(0, linkUrl ? 1 : FACTS_SHOWN).map((field) => ({ id: field.id, label: field.name, value: display(field) }));
  const hiddenCount = factFields.length - facts.length;
  const edited = Math.abs(new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime()) > 2000;
  const openOnDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, a, summary, input, select, textarea, details")) return;
    window.getSelection()?.removeAllRanges();
    onDetails();
  };
  return (
    <article
      className={`entry-card entry-row entry-item${linkUrl ? " has-link" : ""}`}
      style={formatColorStyle(format.color)}
      data-selected={selected || undefined}
      aria-label={heading}
      title={fr ? "Double-cliquez pour voir les détails" : "Double-click to see the details"}
      onDoubleClick={openOnDoubleClick}
      onMouseDown={(event) => { if (event.detail > 1) event.preventDefault(); }}
    >
      <div className="entry-item-body">
        <div className="entry-item-main">
          <h3 className="entry-title entry-item-title"><button type="button" onClick={onDetails} title={heading}>{heading}</button></h3>
          {linkUrl && <LinkPreviewCard url={linkUrl} language={language} compact />}
          {facts.length > 0 && (
            <dl className="entry-item-facts">
              {facts.map((fact) => <div key={fact.id}><dt>{fact.label}</dt><dd title={fact.value}>{fact.value}</dd></div>)}
              {hiddenCount > 0 && <div className="entry-item-more"><dd>+{hiddenCount}</dd></div>}
            </dl>
          )}
        </div>
        <div className="entry-item-meta">
          <span className="entry-format-label">{formatDisplayName(format, language)}</span>
          <span className="entry-item-date" title={`${t(language, "created")} ${dateTime(entry.createdAt, language)}`}>
            <CalendarDays size={14} aria-hidden="true" />
            <span className="entry-item-label">{t(language, "created")}</span>
            <time dateTime={entry.createdAt}>{shortDate(entry.createdAt, language)}</time>
            <span className="entry-item-time">{time(entry.createdAt, language)}</span>
          </span>
          {edited && <span className="entry-item-edited" title={`${t(language, "edited")} ${dateTime(entry.updatedAt, language)}`}><Pencil size={12} aria-hidden="true" /> {t(language, "edited")} {shortDate(entry.updatedAt, language)}</span>}
          {entry.contributionLinkId && entry.contributionReceivedAt && <span className="entry-item-tag">{fr ? "Contribution externe" : "External contribution"} · {shortDate(entry.contributionReceivedAt, language)}</span>}
          {format.appendOnly && <span className="entry-item-tag">{fr ? "Écriture" : "Writing"} #{entry.ledgerSequence}{entry.correctionOf ? ` · ${fr ? "Correction" : "Correction"}` : ""}</span>}
          <EntryAuthors entry={entry} collection={collection} language={language} />
        </div>
        <EntryRowActions language={language} appendOnly={!!format.appendOnly} onDetails={onDetails} onCopy={onCopy} onEdit={onEdit} onDelete={onDelete} onLinks={onLinks} onReminder={onReminder} />
      </div>
    </article>
  );
}
