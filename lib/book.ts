// T47: book view model. Pure functions (outline, light Markdown) plus the small API surface it needs.
import { request } from "./api";
import type { Collection, CollectionFormat, Entry, EntryRelation, Language } from "./brainy";

export type BookRole = "COVER" | "TITLE_PAGE" | "DEDICATION" | "EPIGRAPH" | "FOREWORD" | "PREFACE" | "ACKNOWLEDGEMENTS" | "INTRODUCTION" | "PART" | "CHAPTER" | "SECTION" | "SUBSECTION" | "CONCLUSION" | "AFTERWORD" | "APPENDIX" | "TERM" | "SOURCE";
export type BookFont = "SERIF" | "SANS" | "GARAMOND" | "MONO";
export type BookViewSettings = {
  enabled: boolean; bodyFont: BookFont; headingFont: BookFont; fontSize: number; lineHeight: number; paragraphSpacing: number;
  firstLineIndent: number; marginMm: number; textAlign: "LEFT" | "JUSTIFY"; pageSize: "A5" | "A4" | "POCKET"; showRuler: boolean; chapterOnNewPage: boolean;
  roles: { formatId: string; role: BookRole }[];
};
export const bookViewFields = "templateId bookView { enabled bodyFont headingFont fontSize lineHeight paragraphSpacing firstLineIndent marginMm textAlign pageSize showRuler chapterOnNewPage roles { formatId role } }";

export const bookApi = {
  async setBookView(collectionId: string, settings: BookViewSettings): Promise<BookViewSettings> {
    const { roles: _roles, ...input } = settings;
    void _roles;
    return (await request<{ setBookView: { bookView: BookViewSettings } }>(`mutation($id:String!,$input:BookViewSettingsInput!){setBookView(collectionId:$id,input:$input){${bookViewFields}}}`, { id: collectionId, input })).setBookView.bookView;
  },
  /** T47/3: shows a data format in the book with a role, or hides it (null). */
  async setFormatRole(collectionId: string, formatId: string, role: BookRole | null): Promise<BookViewSettings> {
    return (await request<{ setBookFormatRole: { bookView: BookViewSettings } }>(`mutation($id:String!,$formatId:String!,$role:String){setBookFormatRole(collectionId:$id,formatId:$formatId,role:$role){${bookViewFields}}}`, { id: collectionId, formatId, role })).setBookFormatRole.bookView;
  },
  async parentRelations(collectionId: string): Promise<EntryRelation[]> {
    return (await request<{ collectionParentRelations: EntryRelation[] }>("query($id:String!){collectionParentRelations(collectionId:$id){id collectionId fromEntryId toEntryId kind label createdAt}}", { id: collectionId })).collectionParentRelations;
  },
};

export const pageWidthMm: Record<BookViewSettings["pageSize"], number> = { A5: 148, A4: 210, POCKET: 110 };
export const pageHeightMm: Record<BookViewSettings["pageSize"], number> = { A5: 210, A4: 297, POCKET: 178 };
export const fontStacks: Record<BookFont, string> = {
  SERIF: "Georgia, Cambria, 'Times New Roman', serif",
  SANS: "var(--font-inter, Inter), system-ui, 'Segoe UI', sans-serif",
  GARAMOND: "Garamond, 'EB Garamond', 'Cormorant Garamond', Palatino, 'Book Antiqua', serif",
  MONO: "ui-monospace, 'Cascadia Mono', Consolas, monospace",
};

export const frontRoles: BookRole[] = ["COVER", "TITLE_PAGE", "DEDICATION", "EPIGRAPH", "FOREWORD", "PREFACE", "ACKNOWLEDGEMENTS", "INTRODUCTION"];
export const backSingles: BookRole[] = ["CONCLUSION", "AFTERWORD"];
/** T47/3: roles the owner can give to any data format. */
export const assignableRoles: BookRole[] = ["PART", "CHAPTER", "SECTION", "SUBSECTION", "APPENDIX", "TERM", "SOURCE"];
export const childRole: Partial<Record<BookRole, BookRole>> = { PART: "CHAPTER", CHAPTER: "SECTION", SECTION: "SUBSECTION" };

export type BookNode = { entry: Entry; format: CollectionFormat; role: BookRole; title: string; text: string; order: number | null; children: BookNode[]; number: number };
export type BookOutline = {
  front: BookNode[]; parts: BookNode[]; looseChapters: BookNode[]; unplaced: BookNode[]; back: BookNode[]; appendices: BookNode[];
  glossary: BookNode[]; sources: BookNode[]; indexTerms: { term: string; chapters: { id: string; label: string }[] }[];
  formatByRole: Partial<Record<BookRole, CollectionFormat>>; hiddenFormats: CollectionFormat[];
};

const valueOf = (entry: Entry, fieldId?: string) => fieldId ? entry.values.find((item) => item.fieldId === fieldId)?.value ?? "" : "";
export const fieldOf = (format: CollectionFormat, kind: string, index = 0) => format.fields.filter((field) => field.kind === kind)[index];
export function textValues(node: BookNode, kind: string): string[] { return node.format.fields.filter((field) => field.kind === kind).map((field) => valueOf(node.entry, field.id)); }

function node(entry: Entry, format: CollectionFormat, role: BookRole): BookNode {
  const order = valueOf(entry, fieldOf(format, "NUMBER")?.id);
  return { entry, format, role, title: valueOf(entry, fieldOf(format, "TITLE")?.id), text: valueOf(entry, fieldOf(format, "LONG_TEXT")?.id), order: order === "" ? null : Number(order), children: [], number: 0 };
}
const byOrder = (a: BookNode, b: BookNode) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.entry.createdAt.localeCompare(b.entry.createdAt);

export function buildOutline(collection: Collection, entries: Entry[], relations: EntryRelation[]): BookOutline {
  const roles = collection.bookView?.roles ?? [];
  const roleOf = new Map(roles.map((item) => [item.formatId, item.role]));
  const formatByRole: BookOutline["formatByRole"] = {};
  for (const item of roles) { const format = collection.formats.find((candidate) => candidate.id === item.formatId); if (format) formatByRole[item.role] = format; }
  const nodes = new Map<string, BookNode>();
  for (const entry of entries) {
    const format = collection.formats.find((item) => item.id === entry.formatId);
    const role = format && roleOf.get(format.id);
    if (format && role) nodes.set(entry.id, node(entry, format, role));
  }
  const parentOf = new Map<string, string>();
  for (const relation of relations) if (relation.kind === "PARENT" && nodes.has(relation.fromEntryId) && nodes.has(relation.toEntryId)) parentOf.set(relation.fromEntryId, relation.toEntryId);
  const all = [...nodes.values()];
  const placed = new Set<string>();
  for (const child of all) {
    const parent = nodes.get(parentOf.get(child.entry.id) ?? "");
    if (parent && childRole[parent.role] === child.role) { parent.children.push(child); placed.add(child.entry.id); }
  }
  for (const item of all) item.children.sort(byOrder);
  const ofRole = (role: BookRole) => all.filter((item) => item.role === role).sort(byOrder);
  const parts = ofRole("PART");
  const looseChapters = ofRole("CHAPTER").filter((item) => !placed.has(item.entry.id));
  parts.forEach((part, index) => { part.number = index + 1; });
  let chapterNumber = 0;
  for (const chapter of [...parts.flatMap((part) => part.children), ...looseChapters]) {
    chapter.number = ++chapterNumber;
    chapter.children.forEach((section, index) => { section.number = index + 1; section.children.forEach((sub, subIndex) => { sub.number = subIndex + 1; }); });
  }
  const unplaced = [...ofRole("SECTION"), ...ofRole("SUBSECTION")].filter((item) => !placed.has(item.entry.id));
  const terms = ofRole("TERM").sort((a, b) => a.title.localeCompare(b.title));
  const flag = (item: BookNode, index: number) => valueOf(item.entry, item.format.fields.filter((field) => field.kind === "BOOLEAN")[index]?.id) === "true";
  const chapters = [...parts.flatMap((part) => part.children), ...looseChapters];
  const subtreeText = (item: BookNode): string => [item.title, item.text, ...item.children.map(subtreeText)].join("\n").toLocaleLowerCase();
  const chapterTexts = chapters.map((chapter) => ({ id: chapter.entry.id, label: String(chapter.number), text: subtreeText(chapter) }));
  return {
    front: frontRoles.flatMap((role) => ofRole(role).slice(0, 1)),
    parts, looseChapters, unplaced,
    back: backSingles.flatMap((role) => ofRole(role).slice(0, 1)),
    appendices: ofRole("APPENDIX"),
    glossary: terms.filter((item) => flag(item, 0)),
    sources: ofRole("SOURCE").sort((a, b) => (textValues(a, "TEXT")[0] || a.title).localeCompare(textValues(b, "TEXT")[0] || b.title)),
    indexTerms: terms.filter((item) => flag(item, 1) && item.title.trim()).map((item) => ({ term: item.title, chapters: chapterTexts.filter((chapter) => chapter.text.includes(item.title.toLocaleLowerCase())).map(({ id, label }) => ({ id, label })) })),
    formatByRole,
    hiddenFormats: collection.formats.filter((format) => !roleOf.has(format.id)),
  };
}

export function roman(value: number): string {
  const table: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = value, result = "";
  for (const [size, letters] of table) while (rest >= size) { result += letters; rest -= size; }
  return result;
}

/** Light Markdown kept as plain text in the entry: **bold**, *italic*, # heading, > quote, *** scene break. */
export type InlineRun = { text: string; bold: boolean; italic: boolean };
export function inlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) runs.push({ text: text.slice(last, match.index), bold: false, italic: false });
    const token = match[0];
    runs.push(token.startsWith("**") ? { text: token.slice(2, -2), bold: true, italic: false } : { text: token.slice(1, -1), bold: false, italic: true });
    last = match.index! + token.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false, italic: false });
  return runs;
}
export type TextBlock = { kind: "paragraph" | "heading" | "quote" | "break"; text: string };
export function textBlocks(text: string): TextBlock[] {
  return text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean).map((chunk): TextBlock => {
    if (/^(\*\s*){3}$|^-{3,}$/.test(chunk)) return { kind: "break", text: "" };
    if (chunk.startsWith("# ")) return { kind: "heading", text: chunk.slice(2) };
    if (chunk.startsWith("> ")) return { kind: "quote", text: chunk.split("\n").map((line) => line.replace(/^>\s?/, "")).join("\n") };
    return { kind: "paragraph", text: chunk };
  });
}

/** Wraps the selection of a textarea with a Markdown marker and returns the new value and selection. */
export function wrapSelection(value: string, start: number, end: number, marker: string): { value: string; start: number; end: number } {
  const selected = value.slice(start, end) || (marker === "**" ? "bold" : "italic");
  const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
  return { value: next, start: start + marker.length, end: start + marker.length + selected.length };
}
export function prefixParagraph(value: string, start: number, prefix: string): { value: string; caret: number } {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const already = value.startsWith(prefix, lineStart);
  const next = already ? value.slice(0, lineStart) + value.slice(lineStart + prefix.length) : value.slice(0, lineStart) + prefix + value.slice(lineStart);
  return { value: next, caret: start + (already ? -prefix.length : prefix.length) };
}

const labels = {
  en: { COVER: "Cover", TITLE_PAGE: "Title page", DEDICATION: "Dedication", EPIGRAPH: "Epigraph", FOREWORD: "Foreword", PREFACE: "Preface", ACKNOWLEDGEMENTS: "Acknowledgements", INTRODUCTION: "Introduction", PART: "Part", CHAPTER: "Chapter", SECTION: "Section", SUBSECTION: "Subsection", CONCLUSION: "Conclusion", AFTERWORD: "Afterword", APPENDIX: "Appendix", TERM: "Term", SOURCE: "Source" },
  fr: { COVER: "Couverture", TITLE_PAGE: "Page de titre", DEDICATION: "Dédicace", EPIGRAPH: "Épigraphe", FOREWORD: "Avant-propos", PREFACE: "Préface", ACKNOWLEDGEMENTS: "Remerciements", INTRODUCTION: "Introduction", PART: "Partie", CHAPTER: "Chapitre", SECTION: "Section", SUBSECTION: "Sous-section", CONCLUSION: "Conclusion", AFTERWORD: "Postface", APPENDIX: "Annexe", TERM: "Terme", SOURCE: "Source" },
} satisfies Record<Language, Record<BookRole, string>>;
export const roleLabel = (role: BookRole, language: Language) => labels[language][role];
