import type { AnalysisOperationId, Language } from "./brainy";

/** Names of the analysis operations, shared by the analysis screen and the privacy journal. */
export const OPERATIONS: { id: AnalysisOperationId; fr: string; en: string }[] = [
  { id: "COUNT", fr: "Nombre", en: "Count" },
  { id: "SUM", fr: "Somme", en: "Sum" },
  { id: "AVERAGE", fr: "Moyenne", en: "Average" },
  { id: "MIN", fr: "Minimum", en: "Min" },
  { id: "MAX", fr: "Maximum", en: "Max" },
  { id: "MEDIAN", fr: "Médiane", en: "Median" },
  { id: "PERCENTILE", fr: "Centile", en: "Percentile" },
  { id: "PERCENTILE_25", fr: "Quantile P25", en: "25th percentile (P25)" },
  { id: "PERCENTILE_75", fr: "Quantile P75", en: "75th percentile (P75)" },
  { id: "PERCENTILE_95", fr: "Quantile P95", en: "95th percentile (P95)" },
  { id: "MODE", fr: "Mode (valeur la plus fréquente)", en: "Mode (most frequent value)" },
  { id: "VARIANCE", fr: "Variance", en: "Variance" },
  { id: "STDDEV", fr: "Écart-type", en: "Standard deviation" },
  { id: "STDDEV_SAMPLE", fr: "Écart-type (échantillon)", en: "Standard deviation (sample)" },
  { id: "RANGE", fr: "Étendue (Max − Min)", en: "Range (Max − Min)" },
  { id: "RATE_PER_N", fr: "Taux pour N", en: "Rate per N" },
  { id: "CROSSTAB", fr: "Tableau croisé (2D)", en: "Cross-tabulation (2D)" },
  { id: "CUMULATIVE", fr: "Cumul", en: "Cumulative sum" },
  { id: "MOVING_AVERAGE", fr: "Moyenne mobile", en: "Moving average" },
  { id: "SUCCESSIVE_DIFF", fr: "Écart successif (compteur)", en: "Successive difference (meter)" },
  { id: "SUCCESSIVE_VARIATION", fr: "Variation successive (%)", en: "Successive variation (%)" },
  { id: "LINEAR_TREND", fr: "Tendance linéaire", en: "Linear trend" },
];

/** A code the client does not know stays readable rather than hidden. */
export function operationLabel(id: string, language: Language): string {
  const known = OPERATIONS.find((item) => item.id === id);
  return known ? known[language] : id.toLowerCase().replaceAll("_", " ");
}
