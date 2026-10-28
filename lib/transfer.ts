import { api } from "./api";
import { formatFieldValue, type Collection, type FieldKind, type Language, type UnitSnapshot } from "./brainy";

export type TransferValue = { fieldId: string; value: string; unitSnapshot?: UnitSnapshot | null; attachmentBase64?: string; attachmentMimeType?: string };
export type TransferEntry = { id: string; formatId: string; sourceObjectId?: string | null; createdAt: string; updatedAt: string; values: TransferValue[] };
export type TransferBundle = {
  brainyExportVersion: 1;
  exportedAt: string;
  collection: { id: string; name: string; units: Collection["units"]; exchangeRates: Collection["exchangeRates"]; sharedObjects?: Collection["sharedObjects"]; formats: { id: string; name: string; color: string; objectModel?: boolean; fields: { id: string; name: string; kind: FieldKind; unit?: string | null; options?: string[] | null; targetObjectFormatId?: string | null; multiple?: boolean | null; variableName?: string | null; referenceMode?: "CURRENT" | "SNAPSHOT" | null }[] }[] };
  entries: TransferEntry[];
  links?: { fromSourceId: string; toSourceId: string; label: string }[];
};

export async function exportCollection(collection: Collection): Promise<TransferBundle> {
  const entries: TransferEntry[] = [];
  const links: { fromSourceId: string; toSourceId: string; label: string }[] = [];
  const seenLinks = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await api.entriesPage(collection.id, { after: cursor });
    for (const entry of page.entries) {
      const format = collection.formats.find((item) => item.id === entry.formatId) ?? collection.formats[0];
      const values: TransferValue[] = [];
      for (const value of entry.values) {
        const field = format.fields.find((item) => item.id === value.fieldId);
        if (field?.kind === "ATTACHMENT") {
          const attachment = await api.entryAttachment(entry.id, field.id);
          values.push({ ...value, attachmentBase64: attachment.base64, attachmentMimeType: attachment.mimeType });
        } else values.push(value);
      }
      entries.push({ id: entry.id, formatId: format.id, ...(entry.sourceObjectId ? { sourceObjectId: entry.sourceObjectId } : {}), createdAt: entry.createdAt, updatedAt: entry.updatedAt, values });
      for (const link of await api.entryLinks(collection.id, entry.id)) if (!seenLinks.has(link.id)) {
        seenLinks.add(link.id);
        links.push({ fromSourceId: link.fromEntryId, toSourceId: link.toEntryId, label: link.label });
      }
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return {
    brainyExportVersion: 1,
    exportedAt: new Date().toISOString(),
    collection: { id: collection.id, name: collection.name, units: collection.units ?? [], exchangeRates: collection.exchangeRates ?? [], sharedObjects: collection.sharedObjects ?? [], formats: collection.formats.map((format) => ({ id: format.id, name: format.name, color: format.color, objectModel: format.objectModel ?? false, fields: format.fields.map((field) => ({ ...field })) })) },
    entries, links,
  };
}

export function bookText(bundle: TransferBundle, language: Language): string {
  const formatById = new Map(bundle.collection.formats.map((format) => [format.id, format]));
  const titleById = new Map(bundle.entries.map((entry) => {
    const format = formatById.get(entry.formatId);
    const titleId = format?.fields.find((field) => field.kind === "TITLE")?.id;
    return [entry.id, entry.values.find((value) => value.fieldId === titleId)?.value || format?.name || entry.id] as const;
  }));
  const numbered = bundle.entries.map((entry) => {
    const format = formatById.get(entry.formatId)!;
    const orderId = format.fields.find((field) => field.kind === "NUMBER" && ["ordre", "order"].includes(field.name.toLocaleLowerCase()))?.id;
    const rawOrder = entry.values.find((value) => value.fieldId === orderId)?.value?.trim();
    const order = rawOrder ? Number(rawOrder) : Number.POSITIVE_INFINITY;
    return { entry, format, order: orderId && Number.isFinite(order) ? order : Number.POSITIVE_INFINITY };
  }).sort((a, b) => a.order - b.order || a.entry.createdAt.localeCompare(b.entry.createdAt) || a.entry.id.localeCompare(b.entry.id));
  const lines = [bundle.collection.name, ""];
  for (const { entry, format } of numbered) {
    lines.push(`${format.name} — ${titleById.get(entry.id)}`, "");
    for (const field of format.fields) {
      if (field.kind !== "LONG_TEXT" && field.kind !== "TEXT") continue;
      const value = entry.values.find((item) => item.fieldId === field.id)?.value;
      if (value) lines.push(value, "");
    }
    const related = (bundle.links ?? []).filter((link) => link.fromSourceId === entry.id || link.toSourceId === entry.id).map((link) => {
      const target = link.fromSourceId === entry.id ? link.toSourceId : link.fromSourceId;
      return `• ${link.label ? `${link.label}: ` : ""}${titleById.get(target) ?? target}`;
    });
    if (related.length) lines.push(language === "fr" ? "Entrées liées :" : "Linked entries:", ...related, "");
  }
  return lines.join("\n").trim() + "\n";
}

export function parseTransfer(raw: unknown): TransferBundle {
  if (!raw || typeof raw !== "object") throw new Error("Invalid Brainy file");
  const bundle = raw as TransferBundle;
  if (bundle.brainyExportVersion !== 1 || !bundle.collection || typeof bundle.collection.id !== "string" || typeof bundle.collection.name !== "string" || !Array.isArray(bundle.collection.formats) || !bundle.collection.formats.length || !Array.isArray(bundle.entries)) throw new Error("Invalid Brainy file");
  const formatIds = new Set<string>();
  bundle.collection.units ??= [];
  bundle.collection.exchangeRates ??= [];
  if (!Array.isArray(bundle.collection.units) || !Array.isArray(bundle.collection.exchangeRates)) throw new Error("Invalid unit catalog in Brainy file");
  const unitIds = new Set<string>();
  for (const unit of bundle.collection.units) {
    if (!unit || typeof unit.id !== "string" || !unit.id || unitIds.has(unit.id) || typeof unit.name !== "string" || typeof unit.symbol !== "string" || typeof unit.dimension !== "string" || typeof unit.factor !== "string") throw new Error("Invalid unit in Brainy file");
    unitIds.add(unit.id);
  }
  for (const format of bundle.collection.formats) {
    if (typeof format.id !== "string" || !format.id || formatIds.has(format.id) || typeof format.name !== "string" || typeof format.color !== "string" || !Array.isArray(format.fields) || !format.fields.length) throw new Error("Invalid data format in Brainy file");
    formatIds.add(format.id);
    const fieldIds = new Set<string>();
    for (const field of format.fields) {
      if (typeof field.id !== "string" || !field.id || fieldIds.has(field.id) || typeof field.name !== "string" || typeof field.kind !== "string" || (field.options != null && !Array.isArray(field.options))) throw new Error("Invalid field in Brainy file");
      fieldIds.add(field.id);
    }
  }
  const entryIds = new Set<string>();
  for (const entry of bundle.entries) {
    const format = bundle.collection.formats.find((item) => item.id === entry.formatId);
    if (!format || typeof entry.id !== "string" || !entry.id || entryIds.has(entry.id) || !Array.isArray(entry.values) || !entry.values.length || Number.isNaN(Date.parse(entry.createdAt)) || Number.isNaN(Date.parse(entry.updatedAt))) throw new Error("Invalid entry in Brainy file");
    entryIds.add(entry.id);
    const seen = new Set<string>();
    for (const value of entry.values) {
      if (!format.fields.some((field) => field.id === value.fieldId) || seen.has(value.fieldId) || typeof value.value !== "string" || (value.attachmentBase64 != null && typeof value.attachmentBase64 !== "string")) throw new Error(`Invalid value in entry ${entry.id}`);
      seen.add(value.fieldId);
    }
  }
  for (const entry of bundle.entries) if (entry.sourceObjectId) {
    const source = bundle.entries.find((item) => item.id === entry.sourceObjectId);
    if (!source || !bundle.collection.formats.some((format) => format.id === source.formatId && format.objectModel)) throw new Error(`Invalid object link in entry ${entry.id}`);
  }
  bundle.links ??= [];
  if (!Array.isArray(bundle.links) || bundle.links.some((link) => !entryIds.has(link.fromSourceId) || !entryIds.has(link.toSourceId) || link.fromSourceId === link.toSourceId || typeof link.label !== "string" || link.label.length > 120)) throw new Error("Invalid entry links in Brainy file");
  return bundle;
}

export function transferMapping(bundle: TransferBundle, target: Collection): Map<string, { formatId: string; fields: Map<string, string> }> {
  const mapping = new Map<string, { formatId: string; fields: Map<string, string> }>();
  const unitMapping = new Map(bundle.collection.units.map((unit) => [unit.id, target.units.find((item) => item.name.toLocaleLowerCase() === unit.name.toLocaleLowerCase() && item.symbol === unit.symbol && item.dimension === unit.dimension)?.id]));
  for (const source of bundle.collection.formats) {
    const targetFormat = target.formats.find((item) => item.name.toLocaleLowerCase() === source.name.toLocaleLowerCase());
    if (!targetFormat) throw new Error(`Missing data format: ${source.name}`);
    if (source.objectModel && !targetFormat.objectModel) throw new Error(`Data format must be an object model: ${source.name}`);
    const fields = new Map<string, string>();
    for (const field of source.fields) {
      const expectedUnit = field.unit?.startsWith("local:") ? `local:${unitMapping.get(field.unit.slice(6)) ?? "missing"}` : field.unit;
      const targetField = targetFormat.fields.find((item) => item.name.toLocaleLowerCase() === field.name.toLocaleLowerCase() && item.kind === field.kind && (item.unit ?? "") === (expectedUnit ?? ""));
      if (!targetField) throw new Error(`Missing compatible field: ${source.name} → ${field.name}`);
      fields.set(field.id, targetField.id);
    }
    mapping.set(source.id, { formatId: targetFormat.id, fields });
  }
  return mapping;
}

export async function importCollection(bundle: TransferBundle, target: Collection, dryRun: boolean): Promise<{ valid: number; created: number; skipped: number; errors: { sourceId: string; message: string }[] }> {
  if (bundle.collection.formats.some((format) => format.fields.some((field) => field.kind === "OBJECT_REF"))) throw new Error("Object reference IDs need remapping. Use Copy to collection for linked objects.");
  const mapping = transferMapping(bundle, target);
  const unitMapping = new Map(bundle.collection.units.map((unit) => [unit.id, target.units.find((item) => item.name.toLocaleLowerCase() === unit.name.toLocaleLowerCase() && item.symbol === unit.symbol && item.dimension === unit.dimension)?.id]));
  let valid = 0, created = 0, skipped = 0;
  const errors: { sourceId: string; message: string }[] = [];
  const importKey = `brainy-${bundle.collection.id}`.slice(0, 100).replace(/[^\w.-]/g, "_");
  for (const format of bundle.collection.formats) {
    const targetFormat = mapping.get(format.id)!;
    const rows = bundle.entries.filter((entry) => entry.formatId === format.id).map((entry) => ({
      sourceId: entry.id,
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
      values: entry.values.map((value) => ({ ...value, fieldId: targetFormat.fields.get(value.fieldId)!, ...(value.unitSnapshot && unitMapping.has(value.unitSnapshot.id) ? { unitSnapshot: { ...value.unitSnapshot, id: unitMapping.get(value.unitSnapshot.id)!, root: unitMapping.get(value.unitSnapshot.root) ?? value.unitSnapshot.root } } : {}) })),
    }));
    for (let index = 0; index < rows.length;) {
      const batch: typeof rows = [];
      let bytes = 0;
      while (index < rows.length && batch.length < 50) {
        const row = rows[index];
        const size = JSON.stringify(row).length;
        if (batch.length && bytes + size > 6_000_000) break;
        batch.push(row); bytes += size; index++;
      }
      const result = await api.importEntriesBatch(target.id, { formatId: targetFormat.formatId, importKey, dryRun, rows: batch });
      valid += result.validCount; created += result.createdCount; skipped += result.skippedCount;
      errors.push(...result.errors);
      if (errors.length && !dryRun) break;
    }
  }
  if (!errors.length && !dryRun) {
    const links = bundle.entries.filter((entry) => entry.sourceObjectId).map((entry) => ({ sourceId: entry.id, sourceObjectId: entry.sourceObjectId! }));
    for (let index = 0; index < links.length; index += 50) await api.linkImportedObjects(target.id, importKey, links.slice(index, index + 50));
    for (let index = 0; index < (bundle.links?.length ?? 0); index += 50) await api.linkImportedEntries(target.id, importKey, bundle.links!.slice(index, index + 50));
  }
  return { valid, created, skipped, errors };
}

function csvCell(value: string): string { return `"${value.replaceAll('"', '""')}"`; }
export function transferCsv(bundle: TransferBundle, language: Language): string {
  const lines = [["collection", "data_format", "entry_id", "created_at", "updated_at", "field", "type", "unit", "value"].map(csvCell).join(",")];
  for (const entry of bundle.entries) {
    const format = bundle.collection.formats.find((item) => item.id === entry.formatId)!;
    for (const value of entry.values) {
      const field = format.fields.find((item) => item.id === value.fieldId)!;
      const readable = field.kind === "ATTACHMENT" ? `[${value.value}]` : formatFieldValue(field, value.value, language, value.unitSnapshot);
      const symbol = field.unit?.startsWith("local:") ? bundle.collection.units.find((unit) => unit.id === field.unit?.slice(6))?.symbol ?? field.unit : field.unit ?? "";
      lines.push([bundle.collection.name, format.name, entry.id, entry.createdAt, entry.updatedAt, field.name, field.kind, symbol, readable].map(csvCell).join(","));
    }
  }
  for (const link of bundle.links ?? []) {
    const source = bundle.entries.find((entry) => entry.id === link.fromSourceId);
    const format = bundle.collection.formats.find((item) => item.id === source?.formatId);
    lines.push([bundle.collection.name, format?.name ?? "", link.fromSourceId, source?.createdAt ?? "", source?.updatedAt ?? "", language === "fr" ? "Entrée liée" : "Related entry", "ENTRY_LINK", "", `${link.toSourceId}${link.label ? ` · ${link.label}` : ""}`].map(csvCell).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadTransfer(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
