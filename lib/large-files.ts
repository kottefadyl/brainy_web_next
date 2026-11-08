// T44 — large attachments by reference: resumable chunked upload, signed download link, integrity check.
// Only one 6 MiB part is in memory at a time; the file is read with Blob.slice.
import { request } from "./api";
import type { Language } from "./brainy";

export const LARGE_FILE_THRESHOLD = 2_097_152;
export type LargeFileUpload = { id: string; fileName: string; size: number; chunkSize: number; partCount: number; receivedParts: number[]; state: string; sha256?: string | null };
export type LargeFileStatus = { largeFileId: string; fileName: string; size: number; state: "AVAILABLE" | "MISSING" | "CORRUPTED" | string; checkedAt?: string | null };

const uploadFields = "id fileName size chunkSize partCount receivedParts state sha256";

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  return btoa(binary);
}

export const largeFileApi = {
  async start(collectionId: string, file: File) {
    return (await request<{ startLargeFileUpload: LargeFileUpload }>(`mutation($c:String!,$i:StartLargeFileUploadInput!){startLargeFileUpload(collectionId:$c,input:$i){${uploadFields}}}`, { c: collectionId, i: { fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size } })).startLargeFileUpload;
  },
  async part(uploadId: string, partNumber: number, base64: string, sha256: string) {
    return (await request<{ uploadLargeFilePart: LargeFileUpload }>(`mutation($u:String!,$n:Int!,$b:String!,$s:String!){uploadLargeFilePart(uploadId:$u,partNumber:$n,base64:$b,sha256:$s){${uploadFields}}}`, { u: uploadId, n: partNumber, b: base64, s: sha256 })).uploadLargeFilePart;
  },
  async complete(uploadId: string, sha256: string) {
    return (await request<{ completeLargeFileUpload: LargeFileUpload }>(`mutation($u:String!,$s:String!){completeLargeFileUpload(uploadId:$u,sha256:$s){${uploadFields}}}`, { u: uploadId, s: sha256 })).completeLargeFileUpload;
  },
  async abort(uploadId: string) { return (await request<{ abortLargeFileUpload: boolean }>("mutation($u:String!){abortLargeFileUpload(uploadId:$u)}", { u: uploadId })).abortLargeFileUpload; },
  async link(entryId: string, fieldId: string) {
    return (await request<{ largeFileDownloadLink: { url: string; expiresAt: string; fileName: string; size: number; sha256?: string | null } }>("query($e:String!,$f:String!){largeFileDownloadLink(entryId:$e,fieldId:$f){url expiresAt fileName size sha256}}", { e: entryId, f: fieldId })).largeFileDownloadLink;
  },
  async verify(entryId: string, fieldId: string) {
    return (await request<{ verifyLargeFile: LargeFileStatus }>("mutation($e:String!,$f:String!){verifyLargeFile(entryId:$e,fieldId:$f){largeFileId fileName size state checkedAt}}", { e: entryId, f: fieldId })).verifyLargeFile;
  },
};

export type UploadProgress = { sent: number; total: number; resumed: boolean };

/**
 * Uploads a file above 2 MiB part by part. Choosing the same file again (same name and size)
 * resumes the server-side session: only missing parts are sent. Stops between parts on abort.
 */
export async function uploadLargeFile(collectionId: string, file: File, onProgress: (progress: UploadProgress) => void, signal: AbortSignal): Promise<string> {
  const session = await largeFileApi.start(collectionId, file);
  if (session.state !== "UPLOADING" && session.state !== "COMPLETE") throw new Error("Upload cannot continue");
  const received = new Set(session.receivedParts);
  const hashes: string[] = [];
  let sent = 0;
  const resumed = received.size > 0;
  for (let number = 1; number <= session.partCount; number += 1) {
    if (signal.aborted) throw new DOMException("Upload paused", "AbortError");
    const start = (number - 1) * session.chunkSize;
    const bytes = new Uint8Array(await file.slice(start, Math.min(file.size, start + session.chunkSize)).arrayBuffer());
    const hash = await sha256Hex(bytes);
    hashes.push(hash);
    if (!received.has(number)) {
      for (let attempt = 1; ; attempt += 1) {
        try { await largeFileApi.part(session.id, number, toBase64(bytes), hash); break; }
        catch (error) {
          if (attempt >= 3 || signal.aborted) throw error;
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
      }
    }
    sent += bytes.length;
    onProgress({ sent, total: file.size, resumed });
  }
  const done = await largeFileApi.complete(session.id, await sha256Hex(new TextEncoder().encode(hashes.join("\n"))));
  if (done.state !== "COMPLETE") throw new Error("Upload did not complete");
  return session.id;
}

export async function openLargeFile(entryId: string, fieldId: string): Promise<void> {
  const link = await largeFileApi.link(entryId, fieldId);
  const anchor = document.createElement("a");
  anchor.href = link.url;
  anchor.rel = "noopener";
  anchor.click();
}

const tr = (language: Language, en: string, fr: string) => (language === "fr" ? fr : en);

export function largeFileStateLabel(state: string, language: Language): string {
  return ({
    AVAILABLE: tr(language, "Verified: intact", "Vérifié : intact"),
    MISSING: tr(language, "Missing from storage", "Absent du stockage"),
    CORRUPTED: tr(language, "Altered: fingerprint differs", "Altéré : empreinte différente"),
  } as Record<string, string>)[state] ?? state;
}

export function formatBytes(size: number, language: Language): string {
  const units = language === "fr" ? ["o", "Kio", "Mio", "Gio"] : ["B", "KiB", "MiB", "GiB"];
  let value = size; let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: unit ? 1 : 0 }).format(value)} ${units[unit]}`;
}

const frErrors: [string, string][] = [
  ["Large files are limited to", "Ce fichier dépasse la taille maximale des fichiers volumineux."],
  ["Finish uploading the large file", "Terminez l’envoi du fichier volumineux avant d’enregistrer."],
  ["missing from storage", "Le fichier volumineux est absent du stockage."],
  ["fingerprint does not match", "L’empreinte ne correspond pas : le fichier a changé pendant l’envoi. Rechoisissez-le."],
  ["Some parts are missing", "Des morceaux manquent : reprenez l’envoi."],
  ["not configured", "Le stockage des fichiers volumineux n’est pas configuré sur ce serveur."],
  ["Read-only members", "Les lecteurs ne peuvent pas ajouter de fichier."],
];

export function largeFileError(cause: unknown, language: Language): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (language === "fr") return frErrors.find(([key]) => message.includes(key))?.[1] ?? message;
  return message;
}
