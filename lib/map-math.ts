/** Web Mercator (EPSG:3857) arithmetic for the map. World coordinates run from 0 to 1. */
export const TILE_SIZE = 256;
export const MAX_ZOOM = 19;
const MAX_LATITUDE = 85.05112878;
const FIT_MAX_ZOOM = 15;
const SINGLE_POINT_ZOOM = 13;

export type WorldPoint = { x: number; y: number };
export type MapView = WorldPoint & { zoom: number };
export type Tile = { key: string; url: string; left: number; top: number; width: number; height: number };

export function project(latitude: number, longitude: number): WorldPoint {
  const bounded = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const radians = bounded * Math.PI / 180;
  return { x: (longitude + 180) / 360, y: (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 };
}

export const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom;

/** The closest zoom at which the world still fills the viewport. */
export const minZoomFor = (width: number, height: number) => Math.max(0, Math.log2(Math.max(width, height, 1) / TILE_SIZE));

export function clampView(view: MapView, width: number, height: number): MapView {
  const zoom = Math.max(minZoomFor(width, height), Math.min(MAX_ZOOM, view.zoom));
  const size = worldSize(zoom);
  const bound = (value: number, viewport: number) => {
    const half = viewport / 2 / size;
    return half >= 0.5 ? 0.5 : Math.max(half, Math.min(1 - half, value));
  };
  return { x: bound(view.x, width), y: bound(view.y, height), zoom };
}

export function toScreen(point: WorldPoint, view: MapView, width: number, height: number): { left: number; top: number } {
  const size = worldSize(view.zoom);
  return { left: (point.x - view.x) * size + width / 2, top: (point.y - view.y) * size + height / 2 };
}

export function panBy(view: MapView, dx: number, dy: number): MapView {
  const size = worldSize(view.zoom);
  return { ...view, x: view.x - dx / size, y: view.y - dy / size };
}

/** Changes the zoom while the world point under (left, top) stays under it. */
export function zoomAround(view: MapView, zoom: number, left: number, top: number, width: number, height: number): MapView {
  const size = worldSize(view.zoom);
  const world = { x: view.x + (left - width / 2) / size, y: view.y + (top - height / 2) / size };
  const nextSize = worldSize(zoom);
  return { x: world.x - (left - width / 2) / nextSize, y: world.y - (top - height / 2) / nextSize, zoom };
}

/** The view that contains every point, with room for the marker pins. */
export function fitBounds(points: WorldPoint[], width: number, height: number, padding = 56): MapView {
  if (!points.length) return clampView({ x: 0.5, y: 0.5, zoom: 0 }, width, height);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const usable = (viewport: number) => Math.max(1, viewport - padding * 2);
  const fit = (span: number, viewport: number) => (span > 0 ? Math.log2(usable(viewport) / (TILE_SIZE * span)) : Infinity);
  const zoom = Math.min(fit(maxX - minX, width), fit(maxY - minY, height));
  return clampView({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: Number.isFinite(zoom) ? Math.min(FIT_MAX_ZOOM, zoom) : SINGLE_POINT_ZOOM }, width, height);
}

export const tileLevel = (zoom: number) => Math.max(0, Math.min(MAX_ZOOM, Math.round(zoom)));

export const tileUrl = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/** The tiles of one level that cover the viewport, on whole pixels so that no seam shows. */
export function visibleTiles(view: MapView, z: number, width: number, height: number): Tile[] {
  const count = 2 ** z;
  const span = worldSize(view.zoom) / count;
  const first = (center: number, viewport: number) => Math.floor(((center * worldSize(view.zoom)) - viewport / 2) / span);
  const last = (center: number, viewport: number) => Math.floor(((center * worldSize(view.zoom)) + viewport / 2) / span);
  const tiles: Tile[] = [];
  for (let y = Math.max(0, first(view.y, height)); y <= Math.min(count - 1, last(view.y, height)); y++) {
    for (let x = Math.max(0, first(view.x, width)); x <= Math.min(count - 1, last(view.x, width)); x++) {
      const start = toScreen({ x: x / count, y: y / count }, view, width, height);
      const end = toScreen({ x: (x + 1) / count, y: (y + 1) / count }, view, width, height);
      const [left, top] = [Math.round(start.left), Math.round(start.top)];
      tiles.push({ key: `${z}/${x}/${y}`, url: tileUrl(z, x, y), left, top, width: Math.round(end.left) - left, height: Math.round(end.top) - top });
    }
  }
  return tiles;
}
