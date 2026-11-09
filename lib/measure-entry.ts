import type { Entry } from "./brainy";

export type MeasureDetails = NonNullable<Entry["values"][number]["measureValue"]>;

export function measuresByField(entry?: Entry | null): Record<string, MeasureDetails> {
  return Object.fromEntries((entry?.values ?? []).flatMap((item) => item.measureValue ? [[item.fieldId, item.measureValue]] : []));
}

/** The API input has no `value` key and an unset detail is left out rather than sent as null. */
export function measureInput(details?: MeasureDetails & { value?: string }): MeasureDetails | undefined {
  if (!details) return undefined;
  const kept = Object.entries(details).filter(([key, item]) => key !== "value" && item !== null && item !== undefined && item !== "");
  return kept.length ? Object.fromEntries(kept) as MeasureDetails : undefined;
}

export const isAbsentMeasure = (details?: MeasureDetails) => details?.status === "ABSENT";

export const normalizedMeasure = (value: string) => value.trim().replace(",", ".");
