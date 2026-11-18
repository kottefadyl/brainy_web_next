"use client";

import { useState, type ReactNode } from "react";
import { linkMedia, maybeImage } from "../lib/link-media";
import "./link-media.css";

/**
 * Shows a link that leads to a picture, a sound or a video in place.
 * `probe` also tries an address with no clue as a picture; on failure, `fallback` is shown.
 */
export default function LinkMediaView({ url, label, probe = false, fallback }: { url: string; label: string; probe?: boolean; fallback: ReactNode }) {
  const media = linkMedia(url);
  const probed = !media && probe ? maybeImage(url) : null;
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === url || (!media && !probed)) return <>{fallback}</>;
  const fail = () => setFailed(url);
  if (!media || media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element -- remote picture from any site, not optimised by Next
    return <img className="link-media link-media-image" src={media?.src ?? probed!} alt={label} loading="lazy" referrerPolicy="no-referrer" onError={fail} />;
  }
  if (media.kind === "audio") return <audio className="link-media" controls preload="none" src={media.src} onError={fail}>{label}</audio>;
  if (media.kind === "video") return <video className="link-media link-media-video" controls preload="metadata" playsInline src={media.src} onError={fail}>{label}</video>;
  if (media.kind !== "embed") return <>{fallback}</>;
  return <div className="link-media link-media-embed"><iframe src={media.src} title={`${media.title} · ${label}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>;
}
