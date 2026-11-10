/**
 * Zoom on a chart's horizontal axis (T23/4): a window of consecutive points,
 * end excluded. Same rules as `brainy/lib/chart_zoom.dart`.
 */
export type ChartWindow = { start: number; end: number };

/** The narrowest window keeps enough points to read a trend. */
export const MIN_ZOOM_POINTS = 5;
export const ZOOM_STEP = 0.5;

export const fullWindow = (total: number): ChartWindow => ({ start: 0, end: total });
export const isZoomed = (window: ChartWindow, total: number) => window.start > 0 || window.end < total;
export const canZoomIn = (window: ChartWindow, total: number) => window.end - window.start > Math.min(total, MIN_ZOOM_POINTS);

/** Keeps a window inside the data, at least MIN_ZOOM_POINTS wide when there are that many. */
export function clampWindow(window: ChartWindow, total: number): ChartWindow {
  if (total <= 0) return { start: 0, end: 0 };
  const span = Math.min(total, Math.max(Math.min(total, MIN_ZOOM_POINTS), Math.round(window.end - window.start)));
  const start = Math.max(0, Math.min(total - span, Math.round(window.start)));
  return { start, end: start + span };
}

/**
 * Scales the window by `factor` (below 1 zooms in) around `anchor`, a share of
 * the visible width from 0 (left edge) to 1 (right edge): the point under the
 * pointer stays under it.
 */
export function zoomWindow(window: ChartWindow, total: number, factor: number, anchor = 0.5): ChartWindow {
  const span = window.end - window.start;
  const next = Math.min(total, Math.max(Math.min(total, MIN_ZOOM_POINTS), Math.round(span * factor)));
  if (next === span) return clampWindow(window, total);
  const share = Math.max(0, Math.min(1, anchor));
  const focus = window.start + share * span;
  return clampWindow({ start: focus - share * next, end: focus - share * next + next }, total);
}

/** Moves the window by `delta` points, stopping at both ends. */
export const shiftWindow = (window: ChartWindow, total: number, delta: number): ChartWindow =>
  clampWindow({ start: window.start + delta, end: window.end + delta }, total);
