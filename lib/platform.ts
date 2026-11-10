import { useEffect, useSyncExternalStore } from "react";
import type { Language } from "./brainy";

/**
 * What the hosting runs. On Vercel's free plan the API freezes reminders,
 * background processing, data sources and large files, and keeps 3 MiB of
 * attachments per entry; the interface hides what is frozen.
 */
export type FreezableModule = "reminders" | "backgroundJobs" | "dataSources" | "largeFiles";
export type Platform = { frozenModules: FreezableModule[]; maxEntryAttachmentBytes: number };

const FULL: Platform = { frozenModules: [], maxEntryAttachmentBytes: 8 * 1024 * 1024 };
let current: Platform = FULL;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Loads once per page; until then, and if the API is older, nothing is frozen. */
function load(): Promise<void> {
  loading ??= import("./api")
    .then(({ request }) => request<{ platformCapabilities: Platform }>("query { platformCapabilities { frozenModules maxEntryAttachmentBytes } }"))
    .then(({ platformCapabilities }) => {
      current = platformCapabilities;
      listeners.forEach((listener) => listener());
    })
    .catch(() => undefined);
  return loading;
}

export const currentPlatform = (): Platform => current;
export const isFrozen = (module: FreezableModule, platform: Platform = current) => platform.frozenModules.includes(module);

export function usePlatform(): Platform {
  useEffect(() => { void load(); }, []);
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => current, () => FULL);
}

/** "3 MB" / "3 Mo", as the file size messages of the interface. */
export function entryAttachmentLimit(language: Language, platform: Platform = current): string {
  const mebibytes = Math.round(platform.maxEntryAttachmentBytes / 1024 / 1024 * 10) / 10;
  return `${new Intl.NumberFormat(language).format(mebibytes)} ${language === "fr" ? "Mo" : "MB"}`;
}
