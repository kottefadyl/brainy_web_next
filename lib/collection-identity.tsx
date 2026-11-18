// A collection's look: an icon for its kind (from the template it was created with) on a tile tinted with the
// color of its first data format. Presentation only: nothing is stored.
import { createElement, type CSSProperties } from "react";
import { BookOpen, CalendarDays, Dumbbell, FolderHeart, FolderInput, Inbox, Layers, Link2, ListChecks, NotebookPen, Store, Wallet, type LucideIcon } from "lucide-react";
import type { Collection } from "./brainy";
import { formatColorStyle } from "./format-colors";

const ICONS: Record<string, LucideIcon> = {
  tasks: ListChecks, cards: Layers, expenses: Wallet, links: Link2, book: BookOpen, notes: NotebookPen,
  agenda: CalendarDays, fitness: Dumbbell, shop: Store, capture: Inbox,
};

export function collectionIcon(collection: Pick<Collection, "templateId" | "sharedBy">): LucideIcon {
  return (collection.templateId && ICONS[collection.templateId]) || (collection.sharedBy ? FolderInput : FolderHeart);
}

export function collectionTint(collection: Pick<Collection, "formats">): CSSProperties {
  return formatColorStyle(collection.formats[0]?.color ?? "#EEF5FF");
}

/** The collection's icon on its tinted tile (sidebar, drawer, header). */
export function CollectionGlyph({ collection, size = 18, className = "" }: { collection: Pick<Collection, "templateId" | "sharedBy" | "formats">; size?: number; className?: string }) {
  return <span className={`collection-glyph ${className}`.trim()} style={collectionTint(collection)} aria-hidden="true">{createElement(collectionIcon(collection), { size })}</span>;
}
