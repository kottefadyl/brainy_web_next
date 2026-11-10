/**
 * Map tiles already seen stay available offline (T38/2). Nothing is fetched
 * ahead: the OpenStreetMap tile policy forbids bulk downloads. Each tile
 * keeps the server's own rules: fresh for `max-age`, then refreshed from the
 * network; when the network fails, still shown for `stale-if-error`.
 * Same rules as `brainy/lib/tile_cache.dart`.
 */
export const TILE_CACHE = "brainy-osm-tiles-v1";
export const MAX_CACHED_TILES = 2000;
const FETCHED_AT = "x-brainy-fetched-at";

export type TilePolicy = { maxAge: number; staleIfError: number };

/** Seconds from a Cache-Control header; one day fresh and a week on error when it says nothing. */
export function parseTilePolicy(cacheControl: string | null): TilePolicy {
  const seconds = (name: string, fallback: number) => {
    const match = cacheControl?.match(new RegExp(`(?:^|,)\\s*${name}=(\\d+)`, "i"));
    return match ? Number(match[1]) : fallback;
  };
  return { maxAge: seconds("max-age", 86_400), staleIfError: seconds("stale-if-error", 604_800) };
}

export type TileUse = "fresh" | "refresh" | "offline-only" | "expired";

/** What a cached tile of `ageSeconds` may still be used for. */
export function tileUse(ageSeconds: number, policy: TilePolicy): TileUse {
  if (ageSeconds <= policy.maxAge) return "fresh";
  return ageSeconds <= policy.maxAge + policy.staleIfError ? "offline-only" : "expired";
}

let writes = 0;
async function trim(cache: Cache) {
  const keys = await cache.keys();
  // Cache Storage keeps insertion order: the oldest tiles go first.
  for (const request of keys.slice(0, Math.max(0, keys.length - MAX_CACHED_TILES))) await cache.delete(request);
}

/**
 * A blob for the tile at `url`, from the cache when allowed, else from the
 * network. Null when neither works or Cache Storage is unavailable (the
 * caller then loads the image directly).
 */
export async function cachedTile(url: string, signal?: AbortSignal, now = Date.now()): Promise<Blob | null> {
  if (typeof caches === "undefined") return null;
  let cache: Cache;
  try { cache = await caches.open(TILE_CACHE); } catch { return null; }
  const cached = await cache.match(url).catch(() => undefined);
  const use = cached ? tileUse((now - Number(cached.headers.get(FETCHED_AT) ?? 0)) / 1000, parseTilePolicy(cached.headers.get("cache-control"))) : "expired";
  if (cached && use === "fresh") return cached.blob();
  try {
    const response = await fetch(url, { mode: "cors", signal });
    if (!response.ok) throw new Error(`Tile ${response.status}`);
    const blob = await response.blob();
    const headers = new Headers({ "content-type": response.headers.get("content-type") ?? "image/png", [FETCHED_AT]: String(now) });
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) headers.set("cache-control", cacheControl);
    await cache.delete(url).catch(() => false);
    await cache.put(url, new Response(blob, { headers })).catch(() => undefined);
    if (++writes % 50 === 0) void trim(cache).catch(() => undefined);
    return blob;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    return cached && use === "offline-only" ? cached.blob() : null;
  }
}
