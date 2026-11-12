// Pictures, videos, sound and PDF files are not stored on Vercel's free plan ("mediaFiles" frozen).
// The browser checks the name and type first; the API also checks the file's first bytes.
import type { Language } from "./brainy";

const MEDIA_EXTENSIONS = /\.(jpe?g|jfif|png|gif|webp|avif|heic|heif|bmp|tiff?|ico|svg|psd|raw|cr2|nef|mp4|m4v|mov|avi|mkv|webm|wmv|flv|3gp|mpe?g|ogv|mp3|m4a|wav|ogg|oga|flac|aac|opus|wma|amr|pdf)$/i;

export function isMediaFile(file: { name: string; type?: string }): boolean {
  const type = (file.type ?? "").toLowerCase();
  return /^(image|video|audio)\//.test(type) || type === "application/pdf" || MEDIA_EXTENSIONS.test(file.name.trim());
}

export const mediaRefusedText = (language: Language) => language === "fr"
  ? "Les images, vidéos, sons et fichiers PDF ne sont pas enregistrés sur cet hébergement. Ajoutez plutôt un lien vers le fichier."
  : "Pictures, videos, sound and PDF files are not stored on this hosting. Add a link to the file instead.";
