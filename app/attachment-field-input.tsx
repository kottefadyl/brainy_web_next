"use client";

// Attachment field of the entry editor. Up to 2 MiB the file travels with the entry;
// above, it is uploaded as a large file by reference (T44) with progress, pause and resume.
import { isMediaFile, mediaRefusedText } from "../lib/media-file";
import { useEffect, useRef, useState } from "react";
import type { Entry, Field, Language } from "../lib/brainy";
import { fileTooLargeText, t } from "../lib/brainy";
import { isFrozen, usePlatform } from "../lib/platform";
import { LARGE_FILE_THRESHOLD, formatBytes, largeFileApi, largeFileError, largeFileStateLabel, openLargeFile, uploadLargeFile } from "../lib/large-files";
import "./large-files.css";

const tr = (language: Language, en: string, fr: string) => (language === "fr" ? fr : en);

export default function AttachmentFieldInput({ field, language, collectionId, entry, value, smallFile, largeFileId, onSmallFile, onLargeFile, onClear, onUploadingChange, onError, onDownloadSmall }: {
  field: Field; language: Language; collectionId: string; entry?: Entry; value: string; smallFile?: File; largeFileId?: string;
  onSmallFile: (file: File) => void; onLargeFile: (largeFileId: string, fileName: string) => void; onClear: () => void;
  onUploadingChange: (uploading: boolean) => void; onError: (message: string) => void; onDownloadSmall: () => void;
}) {
  const platform = usePlatform();
  const saved = entry?.values.find((item) => item.fieldId === field.id);
  const savedLarge = saved?.largeFileId && saved.value === value && !largeFileId ? saved : undefined;
  const [pending, setPending] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ sent: number; total: number; resumed: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState("");
  const [status, setStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const upload = async (file: File) => {
    controller.current = new AbortController();
    setPending(file); setUploading(true); setFailure(""); setStatus(""); onUploadingChange(true);
    try {
      const id = await uploadLargeFile(collectionId, file, setProgress, controller.current.signal);
      setPending(null);
      onLargeFile(id, file.name);
    } catch (cause) {
      setFailure(cause instanceof DOMException && cause.name === "AbortError" ? tr(language, "Upload paused. Resume to send the remaining parts.", "Envoi en pause. Reprenez pour envoyer les morceaux restants.") : largeFileError(cause, language));
    } finally { setUploading(false); onUploadingChange(false); }
  };
  const choose = (file: File) => {
    if (!file.size) { onError(fileTooLargeText(language)); return; }
    if (isFrozen("mediaFiles", platform) && isMediaFile(file)) { onError(mediaRefusedText(language)); return; }
    if (file.size <= LARGE_FILE_THRESHOLD) { setPending(null); setProgress(null); onSmallFile(file); return; }
    // Large files need storage and uploads this hosting does not offer.
    if (isFrozen("largeFiles", platform)) { onError(fileTooLargeText(language)); return; }
    void upload(file);
  };
  const run = (action: () => Promise<unknown>) => { setStatus(""); action().catch((cause) => onError(largeFileError(cause, language))); };
  const percent = progress ? Math.floor((progress.sent / progress.total) * 100) : 0;
  const size = savedLarge?.attachmentSize ?? (largeFileId ? progress?.total : undefined);

  return <div className="input-label attachment-input">
    <span>{field.name} · {t(language, "attachment")}</span>
    <input type="file" disabled={uploading} aria-label={`${t(language, "chooseFile")}: ${field.name}`} aria-describedby={`large-help-${field.id}`} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) choose(file); }} />
    <small id={`large-help-${field.id}`} className="large-file-help">{tr(language, "Files above 2 MiB are stored separately and sent in parts; if the connection drops, choose the same file again to resume.", "Au-delà de 2 Mio, le fichier est stocké à part et envoyé par morceaux ; en cas de coupure, rechoisissez le même fichier pour reprendre.")}</small>
    {(uploading || (pending && progress)) && <div className="large-file-progress">
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={tr(language, `Sending ${pending?.name ?? ""}`, `Envoi de ${pending?.name ?? ""}`)}><span style={{ width: `${percent}%` }} /></div>
      <small>{pending?.name} · {formatBytes(progress?.sent ?? 0, language)} / {formatBytes(pending?.size ?? 0, language)}{progress?.resumed ? ` · ${tr(language, "resumed", "repris")}` : ""}</small>
    </div>}
    {failure && <p className="large-file-failure" role="status">{failure}</p>}
    <div className="attachment-actions">
      {uploading && <button type="button" onClick={() => controller.current?.abort()}>{tr(language, "Pause", "Mettre en pause")}</button>}
      {!uploading && pending && <button type="button" onClick={() => void upload(pending)}>{tr(language, "Resume upload", "Reprendre l’envoi")}</button>}
      {!uploading && value && !pending && <>
        <span>{value}{size ? ` · ${formatBytes(size, language)}` : ""}{(savedLarge || largeFileId) && <em className="large-file-badge">{tr(language, "large file", "fichier volumineux")}</em>}</span>
        <button type="button" onClick={() => { setProgress(null); setStatus(""); onClear(); }}>{t(language, "removeFile")}</button>
        {entry && savedLarge && <>
          <button type="button" onClick={() => run(() => openLargeFile(entry.id, field.id))}>{t(language, "downloadFile")}</button>
          <button type="button" onClick={() => run(async () => setStatus(largeFileStateLabel((await largeFileApi.verify(entry.id, field.id)).state, language)))}>{tr(language, "Check integrity", "Vérifier l’intégrité")}</button>
        </>}
        {entry && !savedLarge && !largeFileId && !smallFile && saved?.value === value && <button type="button" onClick={onDownloadSmall}>{t(language, "downloadFile")}</button>}
      </>}
    </div>
    {status && <p className="large-file-status" role="status">{status}</p>}
  </div>;
}
