// T32 — data sources (connectors): GraphQL calls, EN/FR labels and error texts.
import { request } from "./api";
import { translateError, type Language } from "./brainy";

export type DataSourceMapping = { column: string; fieldId: string; unitColumn?: string | null };
export type DataSource = {
  id: string; collectionId: string; name: string; formatId: string; formatVersion: number;
  recordIdColumn: string; observedAtColumn?: string | null; qualityColumn?: string | null; statusColumn?: string | null;
  decimalSeparator: "DOT" | "COMMA"; delimiter: string; updatePolicy: "UPDATE" | "KEEP_FIRST";
  mappings: DataSourceMapping[]; keyHint?: string | null; keyCreatedAt?: string | null; createdAt: string; updatedAt: string;
};
export type DataSourceInput = Omit<DataSource, "id" | "collectionId" | "formatVersion" | "keyHint" | "keyCreatedAt" | "createdAt" | "updatedAt">;
export type DataSourceRejection = { row: number; recordId?: string | null; code: string; message: string; cells: string[] };
export type DataSourceRun = {
  id: string; sourceId: string; deliveryId: string; origin: "UPLOAD" | "PUSH" | "RETRY"; state: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  total: number; processed: number; createdCount: number; updatedCount: number; unchangedCount: number; olderCount: number; rejectedCount: number;
  ignoredColumns: string[]; failure?: string | null; receivedAt: string; finishedAt?: string | null; durationMs: number;
  rowsPerSecond?: number | null; maxLagSeconds?: number | null; rejections?: DataSourceRejection[];
};

/** Field kinds a data source can fill (same list as the API). */
export const dataSourceKinds = new Set(["TITLE", "TEXT", "LONG_TEXT", "CHARACTER", "LINK", "DATE", "DATETIME", "TIME", "DURATION", "NUMBER", "MEASURE", "BOOLEAN", "SELECT", "CODE"]);

const sourceFields = "id collectionId name formatId formatVersion recordIdColumn observedAtColumn qualityColumn statusColumn decimalSeparator delimiter updatePolicy mappings { column fieldId unitColumn } keyHint keyCreatedAt createdAt updatedAt";
const runFields = "id sourceId deliveryId origin state total processed createdCount updatedCount unchangedCount olderCount rejectedCount ignoredColumns failure receivedAt finishedAt durationMs rowsPerSecond maxLagSeconds";

export const dataSourceApi = {
  async list(collectionId: string) { return (await request<{ dataSources: DataSource[] }>(`query($c:String!){dataSources(collectionId:$c){${sourceFields}}}`, { c: collectionId })).dataSources; },
  async create(collectionId: string, input: DataSourceInput) { return (await request<{ createDataSource: DataSource }>(`mutation($c:String!,$i:DataSourceInput!){createDataSource(collectionId:$c,input:$i){${sourceFields}}}`, { c: collectionId, i: input })).createDataSource; },
  async update(sourceId: string, input: DataSourceInput) { return (await request<{ updateDataSource: DataSource }>(`mutation($s:String!,$i:DataSourceInput!){updateDataSource(sourceId:$s,input:$i){${sourceFields}}}`, { s: sourceId, i: input })).updateDataSource; },
  async remove(sourceId: string) { return (await request<{ deleteDataSource: boolean }>("mutation($s:String!){deleteDataSource(sourceId:$s)}", { s: sourceId })).deleteDataSource; },
  async rotateKey(sourceId: string) { return (await request<{ rotateDataSourceKey: { key: string; source: DataSource } }>(`mutation($s:String!){rotateDataSourceKey(sourceId:$s){key source{${sourceFields}}}}`, { s: sourceId })).rotateDataSourceKey; },
  async revokeKey(sourceId: string) { return (await request<{ revokeDataSourceKey: DataSource }>(`mutation($s:String!){revokeDataSourceKey(sourceId:$s){${sourceFields}}}`, { s: sourceId })).revokeDataSourceKey; },
  async upload(sourceId: string, deliveryId: string, content: string, contentType: string) {
    return (await request<{ uploadDataSourceDelivery: DataSourceRun }>(`mutation($s:String!,$d:String!,$c:String!,$t:String!){uploadDataSourceDelivery(sourceId:$s,deliveryId:$d,content:$c,contentType:$t){${runFields}}}`, { s: sourceId, d: deliveryId, c: content, t: contentType })).uploadDataSourceDelivery;
  },
  async runs(sourceId: string) { return (await request<{ dataSourceRuns: DataSourceRun[] }>(`query($s:String!){dataSourceRuns(sourceId:$s){${runFields}}}`, { s: sourceId })).dataSourceRuns; },
  async run(runId: string) { return (await request<{ dataSourceRun: DataSourceRun }>(`query($r:String!){dataSourceRun(runId:$r){${runFields} rejections{row recordId code message cells}}}`, { r: runId })).dataSourceRun; },
  async rejectionsCsv(runId: string) { return (await request<{ dataSourceRejectionsCsv: string }>("query($r:String!){dataSourceRejectionsCsv(runId:$r)}", { r: runId })).dataSourceRejectionsCsv; },
  async cancel(runId: string) { return (await request<{ cancelDataSourceRun: DataSourceRun }>(`mutation($r:String!){cancelDataSourceRun(runId:$r){${runFields}}}`, { r: runId })).cancelDataSourceRun; },
  async resume(runId: string) { return (await request<{ resumeDataSourceRun: DataSourceRun }>(`mutation($r:String!){resumeDataSourceRun(runId:$r){${runFields}}}`, { r: runId })).resumeDataSourceRun; },
  async retry(runId: string) { return (await request<{ retryDataSourceRejections: DataSourceRun }>(`mutation($r:String!){retryDataSourceRejections(runId:$r){${runFields}}}`, { r: runId })).retryDataSourceRejections; },
};

/** Same file → same delivery ID, so sending it twice never imports it twice. */
export async function deliveryIdFor(content: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return `file-${Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const tr = (language: Language, en: string, fr: string) => (language === "fr" ? fr : en);

export const rejectionLabel = (code: string, language: Language) => ({
  MISSING_RECORD_ID: tr(language, "Missing record ID", "Identifiant manquant"),
  DUPLICATE_IN_DELIVERY: tr(language, "Repeated in this delivery", "Répété dans cette livraison"),
  EMPTY_ROW: tr(language, "No mapped value", "Aucune valeur correspondante"),
  INVALID_OBSERVED_AT: tr(language, "Invalid fact date", "Date du fait invalide"),
  UNIT_MISMATCH: tr(language, "Different unit", "Unité différente"),
  INVALID_VALUE: tr(language, "Invalid value", "Valeur invalide"),
  LOCKED_ENTRY: tr(language, "Entry locked", "Entrée verrouillée"),
  COLUMN_COUNT: tr(language, "Wrong number of columns", "Nombre de colonnes incorrect"),
  CHANGED_DURING_RUN: tr(language, "Edited during the delivery", "Modifiée pendant la livraison"),
} as Record<string, string>)[code] ?? code;

export const runStateLabel = (state: string, language: Language) => ({
  QUEUED: tr(language, "Waiting", "En attente"), RUNNING: tr(language, "In progress", "En cours"), COMPLETED: tr(language, "Finished", "Terminée"),
  FAILED: tr(language, "Stopped by an error", "Arrêtée par une erreur"), CANCELLED: tr(language, "Cancelled", "Annulée"),
} as Record<string, string>)[state] ?? state;

export const originLabel = (origin: string, language: Language) => ({
  UPLOAD: tr(language, "File sent", "Fichier envoyé"), PUSH: tr(language, "Sent with the key", "Envoyé avec la clé"), RETRY: tr(language, "Rejected rows retried", "Lignes rejetées relancées"),
} as Record<string, string>)[origin] ?? origin;

const frErrors: [string, string][] = [
  ["Only a collection owner", "Seul le propriétaire de la collection peut faire cette action."],
  ["Read-only members", "Les lecteurs ne peuvent pas envoyer de données."],
  ["needs access to every field", "Cette source de données demande l’accès à tous les champs de son format de données."],
  ["MISSING_COLUMN", "Colonne absente du fichier : "],
  ["already used for different content", "Cet identifiant de livraison a déjà servi pour un autre contenu."],
  ["A delivery cannot exceed 4 MB", "Une livraison ne peut pas dépasser 4 Mo."],
  ["rows per delivery", "Envoyez de 1 à 10 000 lignes par livraison."],
  ["A quoted CSV value is not closed", "Une valeur CSV entre guillemets n’est pas fermée."],
  ["Column names must be present and distinct", "Les noms de colonnes doivent être présents et distincts."],
  ["Send a JSON array", "Envoyez un tableau JSON d’objets."],
  ["not valid JSON", "Le fichier n’est pas un JSON valide."],
  ["cannot write into a register", "Une source de données ne peut pas écrire dans un registre ni dans un format de données avec flux d’états."],
  ["cannot be filled by a data source", "Ce type de champ ne peut pas être rempli par une source de données."],
  ["Map a column to the object name", "Associez une colonne au nom de l’objet."],
  ["Map 1 to 30 columns", "Associez de 1 à 30 colonnes."],
  ["Each column and field can be mapped once", "Chaque colonne et chaque champ ne peuvent être associés qu’une fois."],
  ["Choose the record ID column", "Choisissez la colonne d’identifiant de l’enregistrement."],
  ["Name the data source", "Nommez la source de données (80 caractères au plus)."],
  ["up to 20 data sources", "Une collection peut avoir 20 sources de données au plus."],
  ["target data format of a data source cannot change", "Le format de données cible ne peut pas changer ; créez une autre source."],
  ["Cancel the running delivery", "Annulez la livraison en cours avant de supprimer cette source."],
  ["Only cancelled or failed deliveries can be resumed", "Seule une livraison annulée ou arrêtée peut reprendre."],
  ["No rejected row to retry", "Aucune ligne rejetée à relancer."],
  ["Wait for the delivery to finish", "Attendez la fin de la livraison."],
];

export function dataSourceError(cause: unknown, language: Language): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (language === "fr") {
    const match = frErrors.find(([key]) => message.includes(key));
    if (match) return match[0] === "MISSING_COLUMN" ? match[1] + message.replace(/^.*Missing column:\s*/, "") : match[1];
  }
  return translateError(cause, language);
}

/** MAPPING_STALE explains itself; other failures keep the server text. */
export function failureText(failure: string, language: Language): string {
  if (failure.startsWith("MAPPING_STALE")) return tr(language, "A mapped field was removed or changed type. Update the mapping, then resume.", "Un champ associé a été supprimé ou a changé de type. Mettez à jour la correspondance, puis reprenez.") + ` (${failure.replace(/^MAPPING_STALE:\s*/, "")})`;
  return failure;
}
