"use client";

import { useEffect, useState, type CSSProperties, type SyntheticEvent } from "react";
import { cachedTile } from "../lib/tile-cache";

type Props = { url: string; current?: boolean; style: CSSProperties; onLoad?: () => void; onError?: (event: SyntheticEvent<HTMLImageElement>) => void };

/**
 * One map tile, read from the tile cache when allowed (T38/2). Without Cache
 * Storage, or when the tile is neither cached nor reachable by fetch, the
 * image loads directly, as before.
 */
export function CachedTile({ url, current, style, onLoad, onError }: Props) {
  const [loaded, setLoaded] = useState<{ url: string; src: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    cachedTile(url, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = blob ? URL.createObjectURL(blob) : null;
        setLoaded({ url, src: objectUrl ?? url });
      })
      .catch(() => { if (!controller.signal.aborted) setLoaded({ url, src: url }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  const src = loaded?.url === url ? loaded.src : undefined;
  if (!src) return null;
  // Third-party map tiles: next/image would route them through this server.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="osm-map-tile" data-url={url} data-current={current || undefined} src={src} alt="" draggable={false} decoding="async" style={style} onLoad={onLoad} onError={onError} />;
}
