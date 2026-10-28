import { api, ApiError } from "./api";

export type PendingEntry = {
  id: string;
  collectionId: string;
  entryId?: string;
  formatId: string;
  values: { fieldId: string; value: string }[];
  expectedUpdatedAt?: string;
  createdAt: string;
  status: "pending" | "conflict";
  error?: string;
};

const key = (userId: string) => `brainy-offline-entries:${userId}`;
export function pendingEntries(userId: string): PendingEntry[] {
  try { const value = JSON.parse(localStorage.getItem(key(userId)) ?? "[]"); return Array.isArray(value) ? value as PendingEntry[] : []; }
  catch { return []; }
}
function persist(userId: string, rows: PendingEntry[]): void {
  if (rows.length > 100 || JSON.stringify(rows).length > 2_000_000) throw new Error("Offline storage is full. Sync pending entries before adding more.");
  localStorage.setItem(key(userId), JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent("brainy-offline-change", { detail: userId }));
}
export function queueEntry(userId: string, row: PendingEntry): void {
  const rows = pendingEntries(userId);
  const old = rows.findIndex((item) => item.entryId && item.entryId === row.entryId && item.collectionId === row.collectionId && item.status === "pending");
  if (old >= 0) rows[old] = { ...row, id: rows[old].id, expectedUpdatedAt: rows[old].expectedUpdatedAt };
  else rows.push(row);
  persist(userId, rows);
}
export function reviseQueuedEntry(userId: string, visibleEntryId: string, values: PendingEntry['values']): PendingEntry {
  const rows = pendingEntries(userId);
  const row = rows.find((item) => item.entryId === visibleEntryId || `offline:${item.id}` === visibleEntryId);
  if (!row) throw new Error('Pending entry was not found on this device. Reload before editing.');
  const updated = { ...row, values, status: 'pending' as const, error: undefined };
  persist(userId, rows.map((item) => item.id === row.id ? updated : item));
  return updated;
}
export function discardEntry(userId: string, id: string): void { persist(userId, pendingEntries(userId).filter((row) => row.id !== id)); }
export function updatePending(userId: string, row: PendingEntry): void { persist(userId, pendingEntries(userId).map((item) => item.id === row.id ? row : item)); }

export async function syncPending(userId: string): Promise<{ synced: number; stopped?: string }> {
  let synced = 0;
  for (const row of pendingEntries(userId)) {
    if (row.status === "conflict") return { synced, stopped: row.error };
    try {
      const saved = await api.saveEntry(row.collectionId, row.values, row.entryId, row.formatId, { clientMutationId: row.id, expectedUpdatedAt: row.expectedUpdatedAt });
      const server = new Map(saved.values.map((value) => [value.fieldId, value.value]));
      if (row.values.some((value) => value.value.trim() && server.get(value.fieldId) !== value.value)) {
        const message = 'The server saved an earlier version of this change. Review the conflict.';
        updatePending(userId, { ...row, entryId: saved.id, status: 'conflict', error: message });
        return { synced, stopped: message };
      }
      discardEntry(userId, row.id);
      synced++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (cause instanceof ApiError && /Could not reach|temporarily unavailable/i.test(message)) return { synced, stopped: message };
      updatePending(userId, { ...row, status: "conflict", error: message });
      return { synced, stopped: message };
    }
  }
  return { synced };
}
