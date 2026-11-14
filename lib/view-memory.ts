// Remembers, per account, the last open collection, the view chosen in each collection and the page size,
// so Brainy reopens as the person left it on every device: the account keeps the reference copy
// (saved shortly after each change), this device a local copy read instantly. Storage may be
// unavailable (private mode): every access is guarded and falls back to the defaults.
import { api } from "./api";
import type { ViewPreferences } from "./brainy";

export const PAGE_SIZES = [30, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null): void {
  try { if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export function rememberedCollectionId(userId: string): string | null {
  return read(`brainy_collection:${userId}`);
}
export function rememberCollection(userId: string, collectionId: string): void {
  if (read(`brainy_collection:${userId}`) === collectionId) return;
  write(`brainy_collection:${userId}`, collectionId);
  saveToAccount(userId);
}

/** The view last chosen in this collection, if it still exists; "" = the default list. */
export function rememberedViewId(userId: string, collection: { id: string; savedViews?: { id: string }[] | null } | undefined): string {
  if (!collection) return "";
  const id = read(`brainy_view:${userId}:${collection.id}`);
  return id && collection.savedViews?.some((view) => view.id === id) ? id : "";
}
export function rememberView(userId: string, collectionId: string, viewId: string): void {
  if ((read(`brainy_view:${userId}:${collectionId}`) ?? "") === viewId) return;
  write(`brainy_view:${userId}:${collectionId}`, viewId || null);
  saveToAccount(userId);
}

export function rememberedPageSize(userId: string): PageSize {
  const value = Number(read(`brainy_page_size:${userId}`));
  return (PAGE_SIZES as readonly number[]).includes(value) ? value as PageSize : 30;
}
export function rememberPageSize(userId: string, size: PageSize): void {
  write(`brainy_page_size:${userId}`, String(size));
  saveToAccount(userId);
}

/** Takes the account's copy (another device may have changed it) before the first reading. */
export function adoptAccountPreferences(userId: string, preferences: ViewPreferences | null | undefined): void {
  if (!preferences) return;
  try {
    for (const key of Object.keys(window.localStorage)) if (key.startsWith(`brainy_view:${userId}:`)) window.localStorage.removeItem(key);
  } catch { /* storage unavailable */ }
  for (const choice of preferences.views) write(`brainy_view:${userId}:${choice.collectionId}`, choice.viewId);
  if (preferences.lastCollectionId) write(`brainy_collection:${userId}`, preferences.lastCollectionId);
  if (preferences.pageSize && (PAGE_SIZES as readonly number[]).includes(preferences.pageSize)) write(`brainy_page_size:${userId}`, String(preferences.pageSize));
}

function snapshot(userId: string): ViewPreferences {
  const views: ViewPreferences["views"] = [];
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(`brainy_view:${userId}:`)) continue;
      const viewId = window.localStorage.getItem(key);
      if (viewId) views.push({ collectionId: key.slice(`brainy_view:${userId}:`.length), viewId });
    }
  } catch { /* storage unavailable */ }
  const size = Number(read(`brainy_page_size:${userId}`));
  return { lastCollectionId: read(`brainy_collection:${userId}`), pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : null, views };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Several quick changes make one save; a failed save is retried with the next change. */
function saveToAccount(userId: string): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void api.saveViewPreferences(snapshot(userId)).catch(() => undefined); }, 1500);
}
