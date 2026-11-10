"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { Language } from "../lib/brainy";
import { canZoomIn, clampWindow, fullWindow, isZoomed, shiftWindow, ZOOM_STEP, zoomWindow, type ChartWindow } from "../lib/chart-zoom";

/** Where the plot area sits inside the SVG viewBox. */
export type PlotFrame = { width: number; left: number; plotWidth: number };

/**
 * Zoom state of a chart (T23/4). Ctrl + wheel and trackpad pinch zoom around
 * the pointer; two fingers pinch on touch screens; a mouse drag pans once
 * zoomed. A plain wheel keeps scrolling the page.
 */
export function useChartZoom(total: number, svg: RefObject<SVGSVGElement | null>) {
  const [window, setWindow] = useState<ChartWindow>(() => fullWindow(total));
  const [lastTotal, setLastTotal] = useState(total);
  if (lastTotal !== total) { setLastTotal(total); setWindow(fullWindow(total)); }
  const current = clampWindow(window, total);
  // The chart writes its plot frame here after each render; handlers read it.
  const frameRef = useRef<PlotFrame>({ width: 1, left: 0, plotWidth: 1 });
  const windowRef = useRef(current);
  useEffect(() => { windowRef.current = current; });

  const zoomBy = (factor: number, anchor = 0.5) => setWindow(zoomWindow(windowRef.current, total, factor, anchor));
  const shift = (delta: number) => setWindow(shiftWindow(windowRef.current, total, delta));
  const reset = () => setWindow(fullWindow(total));
  const moveTo = (start: number) => {
    const span = windowRef.current.end - windowRef.current.start;
    setWindow(clampWindow({ start, end: start + span }, total));
  };
  const setFrame = (frame: PlotFrame) => { frameRef.current = frame; };

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setWindow(zoomWindow(windowRef.current, total, Math.exp(event.deltaY * 0.01), shareOf(element, frameRef.current, event.clientX)));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [svg, total]);
  const shareAt = (clientX: number) => (svg.current ? shareOf(svg.current, frameRef.current, clientX) : 0.5);

  // Pinch with two touches, or drag with the mouse once zoomed.
  const touches = useRef(new Map<number, number>());
  const pinch = useRef<{ distance: number; window: ChartWindow; anchor: number } | null>(null);
  const drag = useRef<{ x: number; window: ChartWindow; moved: boolean } | null>(null);
  const pointsPerPixel = () => {
    const element = svg.current;
    const box = element?.getBoundingClientRect();
    const { width, plotWidth } = frameRef.current;
    const span = windowRef.current.end - windowRef.current.start;
    return box ? span / Math.max(1, plotWidth * box.width / Math.max(1, width)) : 0;
  };
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "touch") {
      touches.current.set(event.pointerId, event.clientX);
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        pinch.current = { distance: Math.max(8, Math.abs(a - b)), window: windowRef.current, anchor: shareAt((a + b) / 2) };
      }
    } else if (event.button === 0 && isZoomed(windowRef.current, total)) {
      drag.current = { x: event.clientX, window: windowRef.current, moved: false };
    }
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "touch" && touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, event.clientX);
      if (pinch.current && touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        setWindow(zoomWindow(pinch.current.window, total, pinch.current.distance / Math.max(8, Math.abs(a - b)), pinch.current.anchor));
      }
      return;
    }
    const start = drag.current;
    if (!start || !(event.buttons & 1)) return;
    const dx = event.clientX - start.x;
    if (!start.moved && Math.abs(dx) < 5) return;
    start.moved = true;
    setWindow(shiftWindow(start.window, total, -Math.round(dx * pointsPerPixel())));
  };
  const onPointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    touches.current.delete(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    if (event.pointerType !== "touch") drag.current = null;
  };

  return {
    window: current, zoomed: isZoomed(current, total), canZoomIn: canZoomIn(current, total),
    setFrame, zoomBy, shift, moveTo, reset, pinching: () => pinch.current !== null || !!drag.current?.moved,
    plotHandlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
  };
}

/** Share of the plot width under a client x coordinate, from 0 to 1. */
function shareOf(element: SVGSVGElement, { width, left, plotWidth }: PlotFrame, clientX: number): number {
  const box = element.getBoundingClientRect();
  const x = (clientX - box.left) * width / Math.max(1, box.width);
  return Math.max(0, Math.min(1, (x - left) / Math.max(1, plotWidth)));
}

type Zoom = ReturnType<typeof useChartZoom>;

export function ChartZoomButtons({ zoom, language }: { zoom: Zoom; language: Language }) {
  const fr = language === "fr";
  return <div className="analysis-view-switch analysis-zoom-switch" role="group" aria-label={fr ? "Zoom" : "Zoom"}>
    <button type="button" aria-label={fr ? "Zoom avant" : "Zoom in"} title={fr ? "Zoom avant (+)" : "Zoom in (+)"} disabled={!zoom.canZoomIn} onClick={() => zoom.zoomBy(ZOOM_STEP)}><ZoomIn size={18} aria-hidden="true" /></button>
    <button type="button" aria-label={fr ? "Zoom arrière" : "Zoom out"} title={fr ? "Zoom arrière (−)" : "Zoom out (−)"} disabled={!zoom.zoomed} onClick={() => zoom.zoomBy(1 / ZOOM_STEP)}><ZoomOut size={18} aria-hidden="true" /></button>
    {zoom.zoomed && <button type="button" aria-label={fr ? "Tout afficher" : "Show all"} title={fr ? "Tout afficher (0)" : "Show all (0)"} onClick={zoom.reset}><Maximize2 size={18} aria-hidden="true" /></button>}
  </div>;
}

/** Keyboard zoom on a focused point: + and − around it, 0 to show everything. */
export function zoomKey(event: KeyboardEvent, zoom: Zoom, anchor: number): boolean {
  if (event.key === "+" || event.key === "=") { zoom.zoomBy(ZOOM_STEP, anchor); return true; }
  if (event.key === "-" || event.key === "_") { zoom.zoomBy(1 / ZOOM_STEP, anchor); return true; }
  if (event.key === "0" && zoom.zoomed) { zoom.reset(); return true; }
  return false;
}

/** A scroll bar for the zoomed window, operable by pointer and keyboard. */
export function ChartScrubber({ zoom, total, label, language }: { zoom: Zoom; total: number; label: string; language: Language }) {
  const fr = language === "fr";
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef<{ x: number; start: number } | null>(null);
  if (!zoom.zoomed) return null;
  const { start, end } = zoom.window;
  const span = end - start;
  const move = (next: number) => zoom.moveTo(next);
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = ({ ArrowRight: start + 1, ArrowLeft: start - 1, PageUp: start - span, PageDown: start + span, Home: 0, End: total - span } as Record<string, number | undefined>)[event.key];
    if (next !== undefined) { event.preventDefault(); move(next); }
  };
  return <div ref={track} className="analysis-scrubber" role="slider" tabIndex={0}
    aria-label={fr ? "Période affichée" : "Shown period"} aria-valuemin={0} aria-valuemax={total - span} aria-valuenow={start} aria-valuetext={label}
    onKeyDown={onKey}
    onPointerDown={(event) => {
      const box = track.current!.getBoundingClientRect();
      const ratio = (event.clientX - box.left) / box.width;
      const thumbStart = start / total, thumbEnd = end / total;
      if (ratio < thumbStart || ratio > thumbEnd) move(Math.round(ratio * total - span / 2));
      grab.current = { x: event.clientX, start: ratio < thumbStart || ratio > thumbEnd ? Math.round(ratio * total - span / 2) : start };
      track.current!.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!grab.current) return;
      const box = track.current!.getBoundingClientRect();
      move(grab.current.start + Math.round((event.clientX - grab.current.x) / box.width * total));
    }}
    onPointerUp={() => { grab.current = null; }} onPointerCancel={() => { grab.current = null; }}>
    <span className="analysis-scrubber-thumb" style={{ left: `${start / total * 100}%`, width: `${span / total * 100}%` }} />
  </div>;
}
