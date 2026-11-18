// A web link that leads to a picture, a sound or a video is shown in place (cards, entry details).
// Nothing is downloaded or stored by Brainy: the file stays on its own site.

export type LinkMedia =
  | { kind: "image" | "audio" | "video"; src: string }
  | { kind: "embed"; src: string; title: string };

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i;
const AUDIO = /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac|weba)$/i;
const VIDEO = /\.(mp4|webm|ogv|mov|m4v)$/i;
/** Picture services whose addresses carry no file extension (search thumbnails, photo hosts). */
const IMAGE_HOSTS = /(^|\.)(encrypted-tbn\d\.gstatic\.com|images\.unsplash\.com|lh\d\.googleusercontent\.com|i\.imgur\.com|i\.pinimg\.com|pbs\.twimg\.com|upload\.wikimedia\.org|picsum\.photos)$/i;

function parse(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch { return null; }
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const match = url.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
  return match?.[2] ?? null;
}

/** What a link shows: a known picture, sound or video, or null when the address gives no clue. */
export function linkMedia(value: string | null | undefined): LinkMedia | null {
  const url = value ? parse(value) : null;
  if (!url) return null;
  const path = url.pathname;
  if (IMAGE.test(path) || IMAGE_HOSTS.test(url.hostname)) return { kind: "image", src: url.href };
  if (AUDIO.test(path)) return { kind: "audio", src: url.href };
  if (VIDEO.test(path)) return { kind: "video", src: url.href };
  const youtube = youtubeId(url);
  if (youtube && /^[\w-]{6,20}$/.test(youtube)) return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${youtube}`, title: "YouTube" };
  const vimeo = url.hostname.replace(/^www\./, "") === "vimeo.com" ? path.match(/^\/(\d+)/)?.[1] : null;
  if (vimeo) return { kind: "embed", src: `https://player.vimeo.com/video/${vimeo}`, title: "Vimeo" };
  return null;
}

/** A web address that may still be a picture (no clue in the address): worth trying to show as one. */
export function maybeImage(value: string | null | undefined): string | null {
  const url = value ? parse(value) : null;
  return url && url.hostname.includes(".") ? url.href : null;
}
