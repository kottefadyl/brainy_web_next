// T48: link previews for the Saved links template. One request per address, shared by every row.
import { request } from "./api";

export type LinkPreview = { url: string; available: boolean; title?: string | null; description?: string | null; siteName?: string | null; image?: string | null; video: boolean };

const cache = new Map<string, Promise<LinkPreview>>();

/** A value is previewed only when it is a public web address (http or https). */
export function previewableUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export function loadLinkPreview(url: string): Promise<LinkPreview> {
  let pending = cache.get(url);
  if (!pending) {
    pending = request<{ linkPreview: LinkPreview }>("query($url:String!){linkPreview(url:$url){url available title description siteName image video}}", { url }).then((data) => data.linkPreview);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
