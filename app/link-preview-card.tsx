"use client";

// T48: WhatsApp-like preview of a saved link: image, title, description and site. Loaded when visible.
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Link2, Play } from "lucide-react";
import { hostOf, loadLinkPreview, type LinkPreview } from "../lib/link-preview";
import type { Language } from "../lib/brainy";
import "./link-preview.css";

/** `compact`: one slim line inside an entry row (small thumbnail, title, site); the full card elsewhere. */
export default function LinkPreviewCard({ url, language, compact = false }: { url: string; language: Language; compact?: boolean }) {
  const fr = language === "fr";
  const box = useRef<HTMLAnchorElement>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [state, setState] = useState<"waiting" | "done" | "error">("waiting");
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    let active = true;
    const start = () => loadLinkPreview(url).then((value) => { if (active) { setPreview(value); setState("done"); } }).catch(() => { if (active) setState("error"); });
    if (typeof IntersectionObserver === "undefined") { void start(); return () => { active = false; }; }
    const observer = new IntersectionObserver((items) => { if (items.some((item) => item.isIntersecting)) { observer.disconnect(); void start(); } }, { rootMargin: "200px" });
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [url]);
  const site = preview?.siteName || hostOf(url);
  const rich = state === "done" && !!preview?.available;
  const label = `${fr ? "Ouvrir le lien" : "Open link"} : ${preview?.title || site}${fr ? " (nouvel onglet)" : " (new tab)"}`;
  return <a ref={box} className={`link-preview ${compact ? "compact " : ""}${rich ? "is-rich" : state === "waiting" ? "is-loading" : "is-plain"}`} href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={label} aria-busy={state === "waiting" || undefined}>
    {state === "waiting" ? <>
      <span className="link-preview-thumb link-preview-skeleton" aria-hidden="true" />
      <span className="link-preview-text"><span className="link-preview-line link-preview-skeleton" /><span className="link-preview-line short link-preview-skeleton" /></span>
    </> : rich ? <>
      {preview!.image ? <span className="link-preview-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element -- image copied by the API as a data URL */}
        <img src={preview!.image} alt="" loading="lazy" />
        {preview!.video && <span className="link-preview-play" aria-hidden="true"><Play size={compact ? 10 : 18} fill="currentColor" /></span>}
      </span> : <span className="link-preview-thumb link-preview-icon" aria-hidden="true"><Link2 size={22} /></span>}
      <span className="link-preview-text">
        {preview!.title && <strong>{preview!.title}</strong>}
        {preview!.description && !compact && <span className="link-preview-description">{preview!.description}</span>}
        <span className="link-preview-site">{site}<ExternalLink size={12} aria-hidden="true" /></span>
      </span>
    </> : <>
      <span className="link-preview-thumb link-preview-icon small" aria-hidden="true"><Link2 size={16} /></span>
      <span className="link-preview-text"><span className="link-preview-site">{site}<ExternalLink size={12} aria-hidden="true" /></span><span className="link-preview-note">{fr ? "Aperçu indisponible pour ce site" : "No preview for this site"}</span></span>
    </>}
  </a>;
}
