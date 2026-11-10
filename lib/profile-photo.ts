/** Largest stored profile photo in bytes (1 MiB), matching the API limit. */
export const PROFILE_PHOTO_MAX_BYTES = 1024 * 1024;
const keptAsIs = ["image/jpeg", "image/png", "image/webp"];

export class ProfilePhotoError extends Error {
  constructor(readonly reason: "unreadable" | "tooLarge") { super(reason); }
}

export type PreparedPhoto = { dataUrl: string; bytes: number; compressed: boolean };

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ProfilePhotoError("unreadable"));
    reader.readAsDataURL(blob);
  });
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* fall back to <img>, which some browsers decode more broadly */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ProfilePhotoError("unreadable");
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Keeps JPEG, PNG and WebP photos of 1 MiB or less unchanged. Larger or other image types are
 * re-encoded as JPEG, lowering quality and then size until the result fits under 1 MiB.
 */
export async function prepareProfilePhoto(file: File): Promise<PreparedPhoto> {
  if (file.type && !file.type.startsWith("image/")) throw new ProfilePhotoError("unreadable");
  if (file.size <= PROFILE_PHOTO_MAX_BYTES && keptAsIs.includes(file.type)) {
    return { dataUrl: await readDataUrl(file), bytes: file.size, compressed: false };
  }
  const image = await decode(file);
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context || !image.width || !image.height) throw new ProfilePhotoError("unreadable");
    let side = Math.min(1600, Math.max(image.width, image.height));
    let quality = 0.86;
    while (side >= 160) {
      const scale = side / Math.max(image.width, image.height);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
      const blob = await encode(canvas, quality);
      if (!blob) throw new ProfilePhotoError("unreadable");
      if (blob.size <= PROFILE_PHOTO_MAX_BYTES) return { dataUrl: await readDataUrl(blob), bytes: blob.size, compressed: true };
      if (quality > 0.6) quality -= 0.13;
      else side = Math.floor(side * 0.75);
    }
    throw new ProfilePhotoError("tooLarge");
  } finally {
    image.close();
  }
}

export function formatPhotoSize(bytes: number, language: "en" | "fr"): string {
  const kilobytes = bytes / 1024;
  if (kilobytes < 1000) return `${Math.max(1, Math.round(kilobytes))} ${language === "fr" ? "Ko" : "KB"}`;
  return `${(bytes / (1024 * 1024)).toLocaleString(language === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 })} ${language === "fr" ? "Mo" : "MB"}`;
}
