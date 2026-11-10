"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";
import { Maximize, Minus, Plus, X } from "lucide-react";
import type { GeoPoint, Language } from "../lib/brainy";
import { formatColorStyle } from "../lib/format-colors";
import { clampView, fitBounds, fromScreen, panBy, project, roundCoordinate, tileLevel, toScreen, unproject, visibleTiles, zoomAround, type MapView } from "../lib/map-math";
import { CachedTile } from "./cached-tile";

const TILES_PREFERENCE = "brainy:map:osm-tiles";
const PIN_WIDTH = 44, PIN_HEIGHT = 44, KEY_PAN = 80;

function readPreference(): boolean {
  try { return localStorage.getItem(TILES_PREFERENCE) === "on"; } catch { return false; }
}

function writePreference(enabled: boolean): void {
  try { if (enabled) localStorage.setItem(TILES_PREFERENCE, "on"); else localStorage.removeItem(TILES_PREFERENCE); } catch { /* The choice then lasts for this visit only. */ }
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Slippy map. No tile is requested until the person turns the OpenStreetMap
 * background on (product rule 13); without it the points stay fully usable.
 */
export default function OsmMap({ points, formatColor, language, selected, onOpenEntry, onPick }: {
  points: GeoPoint[]; formatColor?: string; language: Language; selected: string[]; onOpenEntry: (id: string) => void;
  /** Pointing mode (T38/3): a click, a tap, or Enter for the centre, gives a position. */
  onPick?: (latitude: number, longitude: number) => void;
}) {
  const fr = language === "fr";
  const viewport = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const animation = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rawView, setRawView] = useState<MapView>({ x: 0.5, y: 0.5, zoom: 0 });
  const [fittedFor, setFittedFor] = useState<string | null>(null);
  const [tilesOn, setTilesOn] = useState(readPreference);
  const [tileZ, setTileZ] = useState(0);
  const [previousZ, setPreviousZ] = useState<number | null>(null);
  const [failed, setFailed] = useState(0);
  const [retry, setRetry] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [roveId, setRoveId] = useState<string | null>(null);

  const { width, height } = size;
  const placed = useMemo(() => points.map((point) => ({ point, world: project(point.latitude, point.longitude) })), [points]);
  const pointsKey = points.map((point) => `${point.entryId}:${point.latitude}:${point.longitude}`).join("|");

  // Frames the points when they change: a new page, search or position field.
  if (width > 0 && fittedFor !== pointsKey) {
    const framed = fitBounds(placed.map((item) => item.world), width, height);
    setFittedFor(pointsKey);
    setRawView(framed);
    setTileZ(tileLevel(framed.zoom));
    setPreviousZ(null);
    setOpenId(null);
  }
  const view = width > 0 ? clampView(rawView, width, height) : rawView;
  const targetZ = tileLevel(view.zoom);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Tiles of a new level are only requested once the zoom pauses.
  useEffect(() => {
    if (targetZ === tileZ) return;
    const timer = setTimeout(() => { setPreviousZ(tileZ); setTileZ(targetZ); setFailed(0); }, 140);
    return () => clearTimeout(timer);
  }, [targetZ, tileZ]);
  useEffect(() => {
    if (previousZ === null) return;
    const timer = setTimeout(() => setPreviousZ(null), 800);
    return () => clearTimeout(timer);
  }, [previousZ, tileZ]);
  useEffect(() => {
    const onOnline = () => { setFailed(0); setRetry((value) => value + 1); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);

  const animateTo = (target: MapView) => {
    cancelAnimationFrame(animation.current);
    if (reducedMotion()) { setRawView(target); return; }
    const from = view;
    let started: number | undefined;
    const step = (now: number) => {
      started ??= now;
      const progress = Math.min(1, (now - started) / 220);
      const eased = 1 - (1 - progress) ** 3;
      setRawView({ x: from.x + (target.x - from.x) * eased, y: from.y + (target.y - from.y) * eased, zoom: from.zoom + (target.zoom - from.zoom) * eased });
      if (progress < 1) animation.current = requestAnimationFrame(step);
    };
    animation.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    // React listens to wheel passively: stopping the page scroll needs a native listener.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimationFrame(animation.current);
      const box = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      setRawView((current) => zoomAround(current, current.zoom - delta / 400, event.clientX - box.left, event.clientY - box.top, box.width, box.height));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (amount: number) => animateTo(zoomAround(view, view.zoom + amount, width / 2, height / 2, width, height));
  const fitAll = () => { setOpenId(null); animateTo(fitBounds(placed.map((item) => item.world), width, height)); };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button, a, .osm-map-popup, .osm-map-consent")) return;
    cancelAnimationFrame(animation.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = 0;
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId).map(([, point]) => point);
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    const dx = next.x - before.x, dy = next.y - before.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    if (others.length === 1) {
      const other = others[0];
      const box = event.currentTarget.getBoundingClientRect();
      const ratio = Math.hypot(next.x - other.x, next.y - other.y) / Math.max(1, Math.hypot(before.x - other.x, before.y - other.y));
      setRawView((current) => panBy(zoomAround(current, current.zoom + Math.log2(ratio), (next.x + other.x) / 2 - box.left, (next.y + other.y) / 2 - box.top, box.width, box.height), dx / 2, dy / 2));
    } else if (others.length === 0) setRawView((current) => panBy(current, dx, dy));
  };
  const pick = (left: number, top: number) => {
    const { latitude, longitude } = unproject(fromScreen(left, top, view, width, height));
    onPick?.(roundCoordinate(latitude), roundCoordinate(longitude));
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (moved.current < 5) setOpenId(null);
    if (moved.current < 5 && onPick && !pointers.current.size && event.type === "pointerup") {
      const box = event.currentTarget.getBoundingClientRect();
      pick(event.clientX - box.left, event.clientY - box.top);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onPick && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); pick(width / 2, height / 2); return; }
    const pans: Record<string, [number, number]> = { ArrowLeft: [KEY_PAN, 0], ArrowRight: [-KEY_PAN, 0], ArrowUp: [0, KEY_PAN], ArrowDown: [0, -KEY_PAN] };
    if (pans[event.key]) { event.preventDefault(); animateTo(panBy(view, ...pans[event.key])); }
    else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomBy(1); }
    else if (event.key === "-") { event.preventDefault(); zoomBy(-1); }
    else if (event.key === "Escape" && openId) { event.stopPropagation(); closePopup(); }
  };
  const closePopup = () => { const id = openId; setOpenId(null); if (id) markers.current.get(id)?.focus({ preventScroll: true }); };
  const onTileLoad = () => setFailed(0);
  const onTileError = (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.style.visibility = "hidden"; setFailed((value) => value + 1); };
  const changeTiles = (enabled: boolean) => { writePreference(enabled); setTilesOn(enabled); setFailed(0); };

  const currentTiles = tilesOn && width > 0 ? visibleTiles(view, tileZ, width, height) : [];
  const backdropTiles = tilesOn && width > 0 && previousZ !== null && previousZ !== tileZ ? visibleTiles(view, previousZ, width, height) : [];
  const offline = tilesOn && failed >= Math.min(3, currentTiles.length || 1);
  const onScreen = placed.map((item) => ({ ...item, at: toScreen(item.world, view, width, height) })).filter(({ at }) => at.left > -PIN_WIDTH && at.left < width + PIN_WIDTH && at.top > -PIN_HEIGHT && at.top < height + PIN_HEIGHT);
  const tabbable = onScreen.some((item) => item.point.entryId === roveId) ? roveId : onScreen[0]?.point.entryId;
  const openItem = onScreen.find((item) => item.point.entryId === openId);

  const onMarkerKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    event.stopPropagation();
    const next = onScreen[(index + step + onScreen.length) % onScreen.length].point.entryId;
    setRoveId(next);
    markers.current.get(next)?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    const element = popup.current;
    if (!element || !openItem) return;
    const left = Math.max(8, Math.min(openItem.at.left - element.offsetWidth / 2, width - element.offsetWidth - 8));
    const above = openItem.at.top - PIN_HEIGHT - element.offsetHeight - 2;
    element.style.transform = `translate(${Math.round(left)}px, ${Math.round(above >= 8 ? above : Math.min(openItem.at.top + 6, height - element.offsetHeight - 8))}px)`;
  });

  // Tiles already seen are kept for offline use (T38/2, cached-tile.tsx).
  const renderTiles = (tiles: typeof currentTiles, interactive: boolean) => tiles.map((tile) => <CachedTile key={`${tile.key}#${retry}`} url={tile.url} current={interactive}
    style={{ left: tile.left, top: tile.top, width: tile.width, height: tile.height }} onLoad={interactive ? onTileLoad : undefined} onError={interactive ? onTileError : undefined} />);
  const title = (point: GeoPoint) => point.name || point.entryId;

  return <div className="osm-map" data-tiles={tilesOn && !offline ? "on" : "off"} style={formatColor ? formatColorStyle(formatColor) : undefined}>
    <div ref={viewport} className="osm-map-viewport" role="group" tabIndex={0} aria-label={`${fr ? `Carte, ${points.length} points. Flèches pour déplacer, plus et moins pour zoomer.` : `Map, ${points.length} points. Arrow keys to move, plus and minus to zoom.`}${onPick ? (fr ? " Entrée choisit le centre de la carte." : " Enter picks the centre of the map.") : ""}`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onKeyDown={onKeyDown}>
      <div className="osm-map-tiles" aria-hidden="true">{renderTiles(backdropTiles, false)}{renderTiles(currentTiles, true)}</div>
      {onScreen.map(({ point, at }, index) => <button key={point.entryId} type="button" className="osm-map-marker" data-selected={selected.includes(point.entryId)}
        ref={(element) => { if (element) markers.current.set(point.entryId, element); else markers.current.delete(point.entryId); }}
        style={{ transform: `translate(${Math.round(at.left - PIN_WIDTH / 2)}px, ${Math.round(at.top - PIN_HEIGHT)}px)` }}
        tabIndex={point.entryId === tabbable ? 0 : -1} aria-label={title(point)} aria-haspopup="dialog" aria-expanded={openId === point.entryId}
        onClick={() => setOpenId(point.entryId)} onFocus={() => setRoveId(point.entryId)} onKeyDown={(event) => onMarkerKey(event, index)}>
        <svg viewBox="0 0 24 32" width="27" height="36" aria-hidden="true"><path d="M12 31S23 18.5 23 11.5a11 11 0 0 0-22 0C1 18.5 12 31 12 31Z" /><circle cx="12" cy="11.5" r="4" /></svg>
      </button>)}
      {openItem && <div ref={popup} className="osm-map-popup" role="dialog" aria-label={title(openItem.point)}>
        <button type="button" className="osm-map-popup-close" aria-label={fr ? "Fermer" : "Close"} onClick={closePopup}><X size={16} aria-hidden="true" /></button>
        <strong>{title(openItem.point)}</strong>
        <span>{openItem.point.latitude}, {openItem.point.longitude}{openItem.point.accuracy === undefined || openItem.point.accuracy === null ? "" : ` ±${openItem.point.accuracy} m`}</span>
        <button type="button" className="osm-map-popup-open" onClick={() => onOpenEntry(openItem.point.entryId)}>{fr ? "Ouvrir la fiche" : "Open entry"}</button>
      </div>}
      <div className="osm-map-controls">
        <button type="button" aria-label={fr ? "Zoom avant" : "Zoom in"} title={fr ? "Zoom avant" : "Zoom in"} onClick={() => zoomBy(1)}><Plus size={18} aria-hidden="true" /></button>
        <button type="button" aria-label={fr ? "Zoom arrière" : "Zoom out"} title={fr ? "Zoom arrière" : "Zoom out"} onClick={() => zoomBy(-1)}><Minus size={18} aria-hidden="true" /></button>
        <button type="button" disabled={!points.length} aria-label={fr ? "Afficher tous les points" : "Show all points"} title={fr ? "Afficher tous les points" : "Show all points"} onClick={fitAll}><Maximize size={17} aria-hidden="true" /></button>
      </div>
      {!tilesOn && <div className="osm-map-consent">
        <p>{fr ? "Le fond OpenStreetMap transmet à ce service votre adresse IP et les zones consultées. Vos points restent visibles sans lui." : "The OpenStreetMap background sends this service your IP address and the areas you view. Your points stay visible without it."}</p>
        <button type="button" onClick={() => changeTiles(true)}>{fr ? "Activer le fond de carte" : "Turn on map background"}</button>
      </div>}
      {offline && <span className="osm-map-offline" role="status">{fr ? "Fond de carte hors-ligne" : "Map background offline"}</span>}
      {tilesOn && !offline && <a className="osm-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>}
    </div>
    {tilesOn && <button type="button" className="osm-map-disable" onClick={() => changeTiles(false)}>{fr ? "Désactiver le fond de carte" : "Turn off map background"}</button>}
  </div>;
}
