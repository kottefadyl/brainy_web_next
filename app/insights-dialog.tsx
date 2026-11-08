"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { buildFormulaExpression, readFormulaDraft } from "../lib/formula-editor";
import type { AnalysisInput, AnalysisOperationId, AnalysisResult, Collection, EntryFilter, ForecastResult, Formula, Language } from "../lib/brainy";
import { AnalysisResultChart } from "./analysis-result-chart";
import { AccessibleListbox } from "./components/ui/AccessibleListbox";

type Props = {
  collection: Collection;
  language: Language;
  onClose: () => void;
  onCollectionChanged: (collection: Collection) => void;
  onOpenEntry: (entryId: string) => void;
};

const OPERATIONS: { id: AnalysisOperationId; fr: string; en: string }[] = [
  { id: "COUNT", fr: "Nombre", en: "Count" },
  { id: "SUM", fr: "Somme", en: "Sum" },
  { id: "AVERAGE", fr: "Moyenne", en: "Average" },
  { id: "MIN", fr: "Minimum", en: "Min" },
  { id: "MAX", fr: "Maximum", en: "Max" },
  { id: "MEDIAN", fr: "Médiane", en: "Median" },
  { id: "PERCENTILE", fr: "Centile", en: "Percentile" },
  { id: "VARIANCE", fr: "Variance", en: "Variance" },
  { id: "STDDEV", fr: "Écart-type", en: "Standard deviation" },
  { id: "RANGE", fr: "Étendue (Max − Min)", en: "Range (Max − Min)" },
  { id: "RATE_PER_N", fr: "Taux pour N", en: "Rate per N" },
  { id: "CROSSTAB", fr: "Tableau croisé (2D)", en: "Cross-tabulation (2D)" },
  { id: "CUMULATIVE", fr: "Cumul", en: "Cumulative sum" },
  { id: "MOVING_AVERAGE", fr: "Moyenne mobile", en: "Moving average" },
  { id: "SUCCESSIVE_DIFF", fr: "Écart successif (compteur)", en: "Successive difference (meter)" },
  { id: "SUCCESSIVE_VARIATION", fr: "Variation successive (%)", en: "Successive variation (%)" },
  { id: "LINEAR_TREND", fr: "Tendance linéaire", en: "Linear trend" },
];

export default function InsightsDialog({ collection, language, onClose, onCollectionChanged, onOpenEntry }: Props) {
  const fr = language === "fr";
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [formatId, setFormatId] = useState(collection.formats[0]?.id ?? "");
  const format = useMemo(() => collection.formats.find((item) => item.id === formatId) ?? collection.formats[0], [collection.formats, formatId]);
  const numericFields = useMemo(() => format?.fields.filter((field) => field.kind === "NUMBER") ?? [], [format]);
  const dateFields = useMemo(() => format?.fields.filter((field) => field.kind === "DATE" || field.kind === "DATETIME") ?? [], [format]);
  const formulas = useMemo(() => collection.formulas.filter((formula) => formula.formatId === format?.id), [collection.formulas, format?.id]);
  const sources = useMemo(() => [
    ...numericFields.map((field) => ({ id: field.id, label: `${field.name}${field.unit ? ` (${field.unit})` : ""}` })),
    ...formulas.map((formula) => ({ id: `formula:${formula.id}`, label: `${formula.name} (=)` })),
  ], [formulas, numericFields]);

  const [formulaId, setFormulaId] = useState<string | undefined>();
  const [formulaVersion, setFormulaVersion] = useState<number | undefined>();
  const [formulaName, setFormulaName] = useState("");
  const [formulaKind, setFormulaKind] = useState<"arithmetic" | "dateDifference">("arithmetic");
  const [left, setLeft] = useState(sources[0]?.id ?? "");
  const [operator, setOperator] = useState("MULTIPLY");
  const [right, setRight] = useState(sources[1]?.id ?? "");
  const [constant, setConstant] = useState("2");
  const [fromDateField, setFromDateField] = useState(dateFields[0]?.id ?? "");
  const [toDateField, setToDateField] = useState(dateFields[1]?.id ?? dateFields[0]?.id ?? "");
  const [dateUnit, setDateUnit] = useState("d");
  const [roundDigits, setRoundDigits] = useState("");
  const [roundMode, setRoundMode] = useState("HALF_UP");

  const [measure, setMeasure] = useState(sources[0]?.id ?? "");
  const [operation, setOperation] = useState<AnalysisOperationId>("SUM");
  const [measureKind, setMeasureKind] = useState<AnalysisInput["measureKind"]>("EVENT");
  const [groupBy, setGroupBy] = useState<AnalysisInput["groupBy"]>("NONE");
  const [dateFieldId, setDateFieldId] = useState(dateFields[0]?.id ?? "");
  const [groupFieldId, setGroupFieldId] = useState("");
  const [groupDepth, setGroupDepth] = useState(2);
  const zoneFormats = collection.formats.filter((candidate) => candidate.fields.some((field) => field.kind === "ZONE"));
  const [zoneFormatId, setZoneFormatId] = useState(zoneFormats[0]?.id ?? "");
  const [zoneFieldId, setZoneFieldId] = useState("");
  const zoneFields = collection.formats.find((candidate) => candidate.id === zoneFormatId)?.fields.filter((field) => field.kind === "ZONE") ?? [];
  const [secondaryGroupBy, setSecondaryGroupBy] = useState<NonNullable<AnalysisInput["secondaryGroupBy"]>>("CATEGORY");
  const [secondaryGroupFieldId, setSecondaryGroupFieldId] = useState("");
  const [percentile, setPercentile] = useState("50");
  const [rateBase, setRateBase] = useState("100");
  const [denominatorFieldId, setDenominatorFieldId] = useState("");
  const [denominatorValue, setDenominatorValue] = useState("1000");
  const [weightFieldId, setWeightFieldId] = useState("");
  const [windowSize, setWindowSize] = useState("3");
  const [counterResetFieldId, setCounterResetFieldId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [comparisonFrom, setComparisonFrom] = useState("");
  const [comparisonTo, setComparisonTo] = useState("");
  const [filterFieldId, setFilterFieldId] = useState("");
  const [filterOperator, setFilterOperator] = useState<EntryFilter["operator"]>("EQ");
  const [filterValue, setFilterValue] = useState("");
  const [filters, setFilters] = useState<EntryFilter[]>([]);
  const [chart, setChart] = useState<"TABLE" | "BAR" | "LINE" | "PIE">("BAR");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [forecastMethod, setForecastMethod] = useState<"MEAN" | "LINEAR">("MEAN");
  const [forecastFrequency, setForecastFrequency] = useState<"DAY" | "MONTH">("DAY");
  const [forecastHorizon, setForecastHorizon] = useState(3);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState("");
  const [backgroundNotice, setBackgroundNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const groupFields = useMemo(() => format?.fields.filter((field) =>
    groupBy === "OBJECT" ? field.kind === "OBJECT_REF" : groupBy === "ZONE" ? field.kind === "POSITION" : field.kind === "SELECT" || field.kind === "TEXT" || field.kind === "CODE",
  ) ?? [], [format, groupBy]);
  const secondaryGroupFields = useMemo(() => format?.fields.filter((field) =>
    secondaryGroupBy === "OBJECT" ? field.kind === "OBJECT_REF" : field.kind === "SELECT" || field.kind === "TEXT" || field.kind === "CODE",
  ) ?? [], [format, secondaryGroupBy]);
  const selectedFilterField = format?.fields.find((field) => field.id === filterFieldId);
  const quickChartFormat = collection.formats.find((candidate) => candidate.fields.some((field) => field.kind === "NUMBER"));
  const quickChartNum = quickChartFormat?.fields.find((field) => field.kind === "NUMBER");
  const quickChartOption = quickChartFormat && quickChartNum ? {
    format: quickChartFormat,
    num: quickChartNum,
    date: quickChartFormat.fields.find((field) => field.kind === "DATE" || field.kind === "DATETIME"),
    group: quickChartFormat.fields.find((field) => field.kind === "SELECT" || field.kind === "TEXT" || field.kind === "OBJECT_REF"),
  } : null;

  function editFormula(formula: Formula) {
    const draft = readFormulaDraft(formula.expression);
    if (!draft) return;
    setFormulaId(formula.id);
    setFormulaVersion(formula.version);
    setFormulaName(formula.name);
    setFormulaKind(draft.kind);
    setRoundDigits(draft.roundDigits);
    setRoundMode(draft.roundMode);
    if (draft.kind === "dateDifference") {
      setFromDateField(draft.fromFieldId);
      setToDateField(draft.toFieldId);
      setDateUnit(draft.unit);
    } else {
      setOperator(draft.operator);
      setLeft(draft.left);
      setRight(draft.right);
      setConstant(draft.constant);
    }
  }

  async function saveFormula() {
    if (!format) return;
    setBusy(true); setError("");
    try {
      const expression = buildFormulaExpression(formulaKind === "dateDifference"
        ? { kind: "dateDifference", fromFieldId: fromDateField, toFieldId: toDateField, unit: dateUnit, roundDigits, roundMode }
        : { kind: "arithmetic", operator, left: left || sources[0]?.id || "", right, constant, roundDigits, roundMode });
      const updated = await api.saveFormula(collection.id, { name: formulaName, formatId: format.id, expression: JSON.stringify(expression), expectedVersion: formulaVersion }, formulaId);
      onCollectionChanged(updated);
      setFormulaId(undefined); setFormulaVersion(undefined); setFormulaName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function analysisInput(extra: Partial<AnalysisInput> = {}): AnalysisInput {
    const activeMeasure = measure || sources[0]?.id || "";
    const activeDate = dateFieldId || dateFields[0]?.id || undefined;
    const activeGroup = groupFieldId || groupFields[0]?.id || undefined;
    const activeSecondaryGroup = secondaryGroupFieldId || secondaryGroupFields[0]?.id || undefined;
    return {
      formatId: format?.id ?? "",
      fieldId: operation === "COUNT" || activeMeasure.startsWith("formula:") ? undefined : activeMeasure || undefined,
      formulaId: operation !== "COUNT" && activeMeasure.startsWith("formula:") ? activeMeasure.slice(8) : undefined,
      operation,
      measureKind,
      groupBy,
      dateFieldId: activeDate,
      groupFieldId: groupBy === "CATEGORY" || groupBy === "OBJECT" || groupBy === "ZONE" ? activeGroup : undefined,
      zoneFormatId: groupBy === "ZONE" ? zoneFormatId || zoneFormats[0]?.id : undefined,
      zoneFieldId: groupBy === "ZONE" ? zoneFieldId || zoneFields[0]?.id : undefined,
      groupDepth: groupBy === "CATEGORY" && format?.fields.some((field) => field.id === activeGroup && field.kind === "CODE") ? groupDepth : undefined,
      language,
      secondaryGroupBy: operation === "CROSSTAB" ? secondaryGroupBy : undefined,
      secondaryGroupFieldId: operation === "CROSSTAB" && (secondaryGroupBy === "CATEGORY" || secondaryGroupBy === "OBJECT") ? activeSecondaryGroup : undefined,
      percentile: operation === "PERCENTILE" ? Number(percentile.replace(",", ".")) : undefined,
      rateBase: operation === "RATE_PER_N" ? Number(rateBase.replace(",", ".")) : undefined,
      denominatorFieldId: operation === "RATE_PER_N" && denominatorFieldId ? denominatorFieldId : undefined,
      denominatorValue: operation === "RATE_PER_N" && !denominatorFieldId ? denominatorValue.replace(",", ".") : undefined,
      weightFieldId: operation === "AVERAGE" && weightFieldId ? weightFieldId : undefined,
      windowSize: operation === "MOVING_AVERAGE" ? Number.parseInt(windowSize, 10) || 3 : undefined,
      counterResetFieldId: (operation === "SUCCESSIVE_DIFF" || operation === "SUCCESSIVE_VARIATION") && counterResetFieldId ? counterResetFieldId : undefined,
      from: from || undefined,
      to: to || undefined,
      comparisonFrom: comparisonFrom || undefined,
      comparisonTo: comparisonTo || undefined,
      filters,
      ...extra,
    };
  }

  async function runAnalysis() {
    if (!format) return;
    setBusy(true); setError("");
    try {
      setResult(await api.analyse(collection.id, analysisInput()));
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function queueAnalysis(kind: "RECALCULATE" | "CHART") {
    if (!format) return;
    setBusy(true); setError(""); setBackgroundNotice("");
    try {
      await api.startBackgroundJob(collection.id, kind, analysisInput());
      setBackgroundNotice(fr ? "Traitement lancé. Suivez sa progression dans « Traitements en arrière-plan » de la collection." : "Task started. Track it in the collection’s Background tasks panel.");
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }

  async function runQuickChart() {
    if (!quickChartOption) return;
    const nextGroupBy: AnalysisInput["groupBy"] = quickChartOption.date
      ? "DAY"
      : quickChartOption.group?.kind === "OBJECT_REF"
        ? "OBJECT"
        : quickChartOption.group
          ? "CATEGORY"
          : "NONE";
    const nextChart = quickChartOption.date ? "LINE" : "BAR";
    setFormatId(quickChartOption.format.id);
    setMeasure(quickChartOption.num.id);
    setOperation("SUM");
    setMeasureKind("EVENT");
    setGroupBy(nextGroupBy);
    setDateFieldId(quickChartOption.date?.id ?? "");
    setGroupFieldId(quickChartOption.group?.id ?? "");
    setChart(nextChart);
    setBusy(true); setError("");
    try {
      setResult(await api.analyse(collection.id, {
        formatId: quickChartOption.format.id,
        fieldId: quickChartOption.num.id,
        operation: "SUM",
        measureKind: "EVENT",
        groupBy: nextGroupBy,
        dateFieldId: quickChartOption.date?.id,
        groupFieldId: nextGroupBy === "CATEGORY" || nextGroupBy === "OBJECT" ? quickChartOption.group?.id : undefined,
        filters: [],
      }));
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function runForecast() {
    const activeMeasure = measure || sources[0]?.id || "";
    const activeDate = dateFieldId || dateFields[0]?.id || "";
    if (!format || !activeMeasure || activeMeasure.startsWith("formula:") || !activeDate) return;
    setBusy(true); setError("");
    try {
      setForecastResult(await api.forecast(collection.id, { formatId: format.id, fieldId: activeMeasure, dateFieldId: activeDate, frequency: forecastFrequency, method: forecastMethod, measureKind, from: from || undefined, to: to || undefined, horizon: forecastHorizon, holdout: 2 }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function queueForecast() {
    const activeMeasure = measure || sources[0]?.id || "";
    const activeDate = dateFieldId || dateFields[0]?.id || "";
    if (!format || !activeMeasure || activeMeasure.startsWith("formula:") || !activeDate) return;
    setBusy(true); setError(""); setBackgroundNotice("");
    try {
      await api.startBackgroundJob(collection.id, "FORECAST", { formatId: format.id, fieldId: activeMeasure, dateFieldId: activeDate, frequency: forecastFrequency, method: forecastMethod, measureKind, from: from || undefined, to: to || undefined, horizon: forecastHorizon, holdout: 2 });
      setBackgroundNotice(fr ? "Prévision lancée. Suivez-la dans « Traitements en arrière-plan » de la collection." : "Forecast started. Track it in the collection’s Background tasks panel.");
    } catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }

  async function loadMore(group: string, comparison = false) {
    if (!result) return;
    const key = comparison ? "comparisonRows" : "rows";
    const current = result[key]?.find((row) => row.group === group);
    if (!current) return;
    setBusy(true);
    try {
      const more = await api.analyse(collection.id, analysisInput({ sourceGroup: group, sourceOffset: current.sources.length }));
      const incoming = more[key]?.find((row) => row.group === group);
      if (!incoming) return;
      const seen = new Set(current.sources.map((item) => item.entryId));
      current.sources = [...current.sources, ...incoming.sources.filter((item) => !seen.has(item.entryId))];
      current.sourcesHasMore = incoming.sourcesHasMore;
      setResult({ ...result });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const rows = useMemo(() => result?.rows ?? [], [result]);
  const values = useMemo(() => rows.map((row) => Number(row.value) || 0), [rows]);
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  const nonnegative = values.every((value) => value >= 0);
  const total = values.reduce((sum, value) => sum + (value > 0 ? value : 0), 0);
  const canLine = nonnegative && (groupBy === "DAY" || groupBy === "MONTH" || ["CUMULATIVE", "MOVING_AVERAGE", "LINEAR_TREND"].includes(operation));
  const effectiveChart = (chart === "PIE" && (!nonnegative || total <= 0)) || (chart === "LINE" && !canLine) || (chart === "BAR" && !nonnegative) ? "TABLE" : chart;

  return (
    <div className="insights-layout">
      <p className="insights-intro">{fr ? "Choisissez un format de données, lancez un calcul ou tracez un graphique sans modifier vos entrées." : "Choose a data format, run a calculation, or draw a chart without changing your entries."}</p>
      {quickChartOption && (
        <div className="insights-quick-start">
          <span>
            <strong>{fr ? "Démarrage rapide" : "Quick start"}</strong>
            <small>{quickChartOption.format.name} · {quickChartOption.num.name}</small>
          </span>
          <button type="button" className="insights-quick" disabled={busy} onClick={runQuickChart}>
            {fr ? "Graphique rapide" : "Quick chart"}
          </button>
        </div>
      )}
      <AccessibleListbox label={fr ? "Format de données" : "Data format"} value={format?.id ?? ""} options={collection.formats.map((item) => ({ id: item.id, label: item.name, swatch: item.color }))} onChange={(value) => { setFormatId(value); setResult(null); setFilters([]); }} />

      <details className="insights-section insights-formulas">
        <summary>{fr ? "Formules enregistrées" : "Saved formulas"}</summary>
        <div className="insights-fields">
          <label>{fr ? "Nom" : "Name"}<input value={formulaName} onChange={(event) => setFormulaName(event.target.value)} /></label>
          <label>{fr ? "Type" : "Type"}
            <select value={formulaKind} onChange={(event) => setFormulaKind(event.target.value as "arithmetic" | "dateDifference")}>
              <option value="arithmetic">{fr ? "Arithmétique" : "Arithmetic"}</option>
              <option value="dateDifference">{fr ? "Écart entre dates" : "Date difference"}</option>
            </select>
          </label>
          {formulaKind === "arithmetic" ? <>
            <label>{fr ? "Valeur 1" : "Value 1"}<select value={left} onChange={(event) => setLeft(event.target.value)}>{sources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label>{fr ? "Opération" : "Operation"}<select value={operator} onChange={(event) => setOperator(event.target.value)}><option value="MULTIPLY">×</option><option value="ADD">+</option><option value="SUBTRACT">−</option><option value="DIVIDE">÷</option></select></label>
            <label>{fr ? "Valeur 2" : "Value 2"}<select value={right} onChange={(event) => setRight(event.target.value)}><option value="">{fr ? "Nombre fixe" : "Fixed number"}</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            {!right && <label>{fr ? "Nombre fixe" : "Fixed number"}<input value={constant} onChange={(event) => setConstant(event.target.value)} /></label>}
          </> : <>
            <label>{fr ? "Début" : "Start"}<select value={fromDateField} onChange={(event) => setFromDateField(event.target.value)}>{dateFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>{fr ? "Fin" : "End"}<select value={toDateField} onChange={(event) => setToDateField(event.target.value)}>{dateFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>{fr ? "Unité" : "Unit"}<select value={dateUnit} onChange={(event) => setDateUnit(event.target.value)}><option value="d">{fr ? "Jours" : "Days"}</option><option value="h">{fr ? "Heures" : "Hours"}</option></select></label>
          </>}
          <label>{fr ? "Décimales" : "Decimals"}<select value={roundDigits} onChange={(event) => setRoundDigits(event.target.value)}><option value="">{fr ? "Aucun arrondi" : "No rounding"}</option>{[0, 1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          {roundDigits !== "" && <label>{fr ? "Règle" : "Rule"}<select value={roundMode} onChange={(event) => setRoundMode(event.target.value)}><option value="HALF_UP">{fr ? "Moitié vers le haut" : "Half up"}</option><option value="HALF_EVEN">{fr ? "Moitié vers le pair" : "Half even"}</option></select></label>}
        </div>
        {!formulaName.trim() && <p className="action-help">{fr ? "Nommez la formule pour continuer." : "Name the formula to continue."}</p>}
        <button type="button" disabled={busy || !formulaName.trim()} onClick={saveFormula}>{formulaId ? (fr ? "Mettre à jour" : "Update") : (fr ? "Enregistrer la formule" : "Save formula")}</button>
        <ul>
          {formulas.map((formula) => <li key={formula.id}><span>{formula.name}</span>{readFormulaDraft(formula.expression) ? <button type="button" onClick={() => editFormula(formula)}>{fr ? "Modifier" : "Edit"}</button> : <em className="formula-advanced-badge">{fr ? "Formule avancée (lecture seule)" : "Advanced formula (read-only)"}</em>}<button type="button" onClick={async () => onCollectionChanged(await api.deleteFormula(collection.id, formula.id))}>{fr ? "Supprimer" : "Delete"}</button></li>)}
        </ul>
      </details>

      <section className="insights-section">
        <h3>{fr ? "Analyse et graphique" : "Analysis and chart"}</h3>
        <div className="insights-fields">
          <label>{fr ? "Mesure" : "Measure"}<select id="analysis-measure" value={measure} onChange={(event) => setMeasure(event.target.value)}>{sources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>{fr ? "Calcul" : "Calculation"}
            <select value={operation} onChange={(event) => setOperation(event.target.value as AnalysisOperationId)}>
              {OPERATIONS.filter((item) => groupBy !== "ZONE" || item.id === "COUNT").map((item) => <option key={item.id} value={item.id}>{fr ? item.fr : item.en}</option>)}
            </select>
          </label>
          <label>{fr ? "Nature" : "Meaning"}<select value={measureKind} disabled={groupBy === "ZONE"} onChange={(event) => setMeasureKind(event.target.value as AnalysisInput["measureKind"])}><option value="EVENT">{fr ? "Événements" : "Events"}</option><option value="SNAPSHOT">{fr ? "Mesures instantanées" : "Point-in-time"}</option><option value="RATE">{fr ? "Taux" : "Rates"}</option></select></label>
          <label>{fr ? "Regrouper" : "Group by"}<select value={groupBy} onChange={(event) => { const choice = event.target.value as AnalysisInput["groupBy"]; setGroupBy(choice); if (choice === "ZONE") { setOperation("COUNT"); setMeasureKind("EVENT"); } }}><option value="NONE">{fr ? "Aucun" : "None"}</option><option value="DAY">{fr ? "Jour" : "Day"}</option><option value="MONTH">{fr ? "Mois" : "Month"}</option><option value="CATEGORY">{fr ? "Catégorie" : "Category"}</option><option value="OBJECT">{fr ? "Objet" : "Object"}</option>{zoneFormats.length > 0 && format?.fields.some((field) => field.kind === "POSITION") && <option value="ZONE">{fr ? "Zone" : "Zone"}</option>}</select></label>
          {dateFields.length > 0 && <label>{fr ? "Champ date" : "Date field"}<select value={dateFieldId} onChange={(event) => setDateFieldId(event.target.value)}>{dateFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          {(groupBy === "CATEGORY" || groupBy === "OBJECT" || groupBy === "ZONE") && <label>{groupBy === "ZONE" ? fr ? "Champ position" : "Position field" : fr ? "Champ groupe" : "Group field"}<select value={groupFieldId} onChange={(event) => setGroupFieldId(event.target.value)}>{groupFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          {groupBy === "ZONE" && <><label>{fr ? "Format de données des zones" : "Zone data format"}<select value={zoneFormatId} onChange={(event) => { setZoneFormatId(event.target.value); setZoneFieldId(""); }}>{zoneFormats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>{fr ? "Champ zone" : "Zone field"}<select value={zoneFieldId} onChange={(event) => setZoneFieldId(event.target.value)}>{zoneFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></>}
          {groupBy === "CATEGORY" && format?.fields.some((field) => field.id === (groupFieldId || groupFields[0]?.id) && field.kind === "CODE") && <label>{fr ? "Niveau de regroupement" : "Grouping level"}<select value={groupDepth} onChange={(event) => setGroupDepth(Number(event.target.value))}><option value={0}>{fr ? "Racine" : "Root"}</option><option value={1}>{fr ? "Intermédiaire" : "Middle"}</option><option value={2}>{fr ? "Code précis" : "Exact code"}</option></select></label>}
          {operation === "CROSSTAB" && <>
            <label>{fr ? "Second axe (colonnes)" : "Secondary group (columns)"}
              <select value={secondaryGroupBy} onChange={(event) => setSecondaryGroupBy(event.target.value as NonNullable<AnalysisInput["secondaryGroupBy"]>)}>
                <option value="DAY">{fr ? "Jour" : "Day"}</option>
                <option value="MONTH">{fr ? "Mois" : "Month"}</option>
                <option value="CATEGORY">{fr ? "Catégorie" : "Category"}</option>
                <option value="OBJECT">{fr ? "Objet" : "Object"}</option>
              </select>
            </label>
            {(secondaryGroupBy === "CATEGORY" || secondaryGroupBy === "OBJECT") && (
              <label>{fr ? "Champ du second axe" : "Secondary group field"}
                <select value={secondaryGroupFieldId} onChange={(event) => setSecondaryGroupFieldId(event.target.value)}>
                  {secondaryGroupFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            )}
          </>}
          {operation === "PERCENTILE" && <label>{fr ? "Centile (0–100)" : "Percentile (0–100)"}<input type="number" min={0} max={100} step="1" value={percentile} onChange={(event) => setPercentile(event.target.value)} /></label>}
          {operation === "RATE_PER_N" && <>
            <label>{fr ? "Base du taux (N)" : "Rate base (N)"}<input type="number" min={1} step="1" value={rateBase} onChange={(event) => setRateBase(event.target.value)} /></label>
            <label>{fr ? "Champ dénominateur" : "Denominator field"}
              <select value={denominatorFieldId} onChange={(event) => setDenominatorFieldId(event.target.value)}>
                <option value="">{fr ? "Valeur fixe ci-dessous" : "Fixed value below"}</option>
                {numericFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {!denominatorFieldId && <label>{fr ? "Dénominateur fixe" : "Fixed denominator"}<input type="number" min={0.0001} step="any" value={denominatorValue} onChange={(event) => setDenominatorValue(event.target.value)} /></label>}
          </>}
          {operation === "AVERAGE" && numericFields.length > 1 && (
            <label>{fr ? "Pondération (optionnelle)" : "Weight field (optional)"}
              <select value={weightFieldId} onChange={(event) => setWeightFieldId(event.target.value)}>
                <option value="">{fr ? "Aucune (moyenne simple)" : "None (simple average)"}</option>
                {numericFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          {operation === "MOVING_AVERAGE" && <label>{fr ? "Fenêtre (périodes)" : "Window (periods)"}<input type="number" min={1} max={365} value={windowSize} onChange={(event) => setWindowSize(event.target.value)} /></label>}
          {(operation === "SUCCESSIVE_DIFF" || operation === "SUCCESSIVE_VARIATION") && (
            <label>{fr ? "Champ de remise à zéro" : "Counter reset field"}
              <select value={counterResetFieldId} onChange={(event) => setCounterResetFieldId(event.target.value)}>
                <option value="">{fr ? "Détection automatique" : "Auto-detect decrease"}</option>
                {format?.fields.filter((f) => f.kind === "BOOLEAN" || f.kind === "TEXT" || f.kind === "SELECT").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          <label>{fr ? "Du" : "From"}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>{fr ? "Au" : "To"}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label>{fr ? "Comparer du" : "Compare from"}<input type="date" value={comparisonFrom} onChange={(event) => setComparisonFrom(event.target.value)} /></label>
          <label>{fr ? "Comparer au" : "Compare to"}<input type="date" value={comparisonTo} onChange={(event) => setComparisonTo(event.target.value)} /></label>
          <label>{fr ? "Filtrer un champ" : "Filter field"}<select value={filterFieldId} onChange={(event) => setFilterFieldId(event.target.value)}><option value="">—</option>{format?.fields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {selectedFilterField && <>
            <label>{fr ? "Condition" : "Condition"}<select value={filterOperator} onChange={(event) => setFilterOperator(event.target.value as EntryFilter["operator"])}><option value="EQ">=</option><option value="CONTAINS">{fr ? "Contient" : "Contains"}</option>{selectedFilterField.kind === "NUMBER" && <><option value="GT">&gt;</option><option value="GTE">≥</option><option value="LT">&lt;</option><option value="LTE">≤</option></>}</select></label>
            <label>{fr ? "Valeur" : "Value"}<input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} /></label>
            <button type="button" onClick={() => { if (filterFieldId && filterValue) { setFilters([...filters, { fieldId: filterFieldId, operator: filterOperator, value: filterValue }]); setFilterValue(""); } }}>{fr ? "Ajouter le filtre" : "Add filter"}</button>
          </>}
        </div>
        {filters.length > 0 && <p>{filters.map((item, index) => <button key={index} type="button" onClick={() => setFilters(filters.filter((_, idx) => idx !== index))}>{format?.fields.find((field) => field.id === item.fieldId)?.name} {item.operator} {item.value} ×</button>)}</p>}
        <div className="insights-actions">
          <button type="button" className="btn primary" disabled={busy} onClick={runAnalysis}>{fr ? "Calculer" : "Calculate"}</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void queueAnalysis("RECALCULATE")}>{fr ? "Recalculer en arrière-plan" : "Recalculate in background"}</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void queueAnalysis("CHART")}>{fr ? "Préparer un graphique" : "Prepare chart"}</button>
          {quickChartOption && <button type="button" className="insights-quick" disabled={busy} onClick={runQuickChart}>{fr ? "Graphique rapide" : "Quick chart"}</button>}
        </div>
      </section>

      <section className="insights-section forecast-section">
        <h3>{fr ? "Prévision limitée" : "Limited forecast"}</h3>
        <p>{fr ? "Une tendance issue des périodes choisies, toujours séparée des faits. Ce n'est pas un avis médical ou financier." : "A trend from the selected periods, always separate from recorded facts. Not medical or financial advice."}</p>
        <div className="insights-fields">
          <label>{fr ? "Méthode" : "Method"}<select value={forecastMethod} onChange={(event) => setForecastMethod(event.target.value as "MEAN" | "LINEAR")}><option value="MEAN">{fr ? "Moyenne" : "Mean"}</option><option value="LINEAR">{fr ? "Tendance linéaire" : "Linear trend"}</option></select></label>
          <label>{fr ? "Fréquence" : "Frequency"}<select value={forecastFrequency} onChange={(event) => setForecastFrequency(event.target.value as "DAY" | "MONTH")}><option value="DAY">{fr ? "Jour" : "Day"}</option><option value="MONTH">{fr ? "Mois" : "Month"}</option></select></label>
          <label>{fr ? "Horizon" : "Horizon"}<select value={forecastHorizon} onChange={(event) => setForecastHorizon(Number(event.target.value))}>{[1, 2, 3, 6, 12].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        {(!measure || measure.startsWith("formula:") || !(dateFieldId || dateFields[0]?.id)) && <p className="action-help">{fr ? "Choisissez une mesure numérique et un champ date pour continuer." : "Choose a numeric measure and a date field to continue."}</p>}
        <div className="forecast-actions">
          <button type="button" className="btn secondary" disabled={busy || !measure || measure.startsWith("formula:") || !(dateFieldId || dateFields[0]?.id)} onClick={runForecast}>{fr ? "Estimer" : "Estimate"}</button>
          <button type="button" className="btn secondary" disabled={busy || !measure || measure.startsWith("formula:") || !(dateFieldId || dateFields[0]?.id)} onClick={() => void queueForecast()}>{fr ? "Estimer en arrière-plan" : "Estimate in background"}</button>
        </div>
        {forecastResult && <div className="forecast-results">
          <p>{fr ? "Sources" : "Sources"} : {forecastResult.sourceFrom} → {forecastResult.sourceTo} ({forecastResult.trainingCount} {fr ? "périodes d'apprentissage" : "training periods"}, {forecastResult.holdoutCount} {fr ? "périodes tenues à l'écart" : "held-out periods"}).</p>
          <p>{fr ? "Erreur moyenne sur la période tenue à l'écart" : "Mean error on held-out period"} : <strong>{forecastResult.holdoutMae} {forecastResult.unit}</strong> · {fr ? "Incertitude" : "Uncertainty"} : ±{forecastResult.uncertainty}</p>
          <div className="forecast-columns">
            <div><h4>{fr ? "Observations vérifiées" : "Held-out check"}</h4>{forecastResult.validation.map((point) => <p key={point.date}>{point.date} : {fr ? "observé" : "observed"} {point.observed} / {fr ? "estimé" : "estimated"} {point.estimate}</p>)}</div>
            <div><h4>{fr ? "Prévision (distincte des faits)" : "Forecast (separate from facts)"}</h4>{forecastResult.forecast.map((point) => <p key={point.date}><strong>{point.date}</strong> : {point.estimate} {forecastResult.unit} [{point.lower} – {point.upper}]</p>)}</div>
          </div>
        </div>}
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {backgroundNotice && <p role="status">{backgroundNotice}</p>}
      {result ? (
        <section ref={resultsRef} className="insights-section insights-results">
          <h3>{OPERATIONS.find((item) => item.id === result.operation)?.[fr ? "fr" : "en"] ?? result.operation} · {rows.length === 1 ? `${rows[0].value} ${result.unit ?? ""} · ` : ""}{rows.reduce((sum, row) => sum + row.count, 0)} {fr ? "entrées" : "entries"} · {result.skippedMissingCount ?? 0} {fr ? "ignorées" : "skipped"}</h3>
          <p>{fr ? "Mis à jour" : "Updated"} {new Date(result.refreshedAt).toLocaleString(language)}</p>
          <details className="analysis-technical"><summary>{fr ? "Détails techniques" : "Technical details"}</summary><p>v{result.operationVersion}{result.explanation ? ` · ${result.explanation}` : ""}{result.slope ? ` · ${fr ? "Pente" : "Slope"} : ${result.slope}` : ""}</p></details>
          <AccessibleListbox label={fr ? "Affichage" : "Display"} value={effectiveChart} options={[
            { id: "TABLE", label: fr ? "Tableau" : "Table" },
            ...(nonnegative ? [{ id: "BAR", label: fr ? "Barres" : "Bars" }] : []),
            ...(canLine ? [{ id: "LINE", label: fr ? "Courbe" : "Line" }] : []),
            ...(nonnegative && total > 0 ? [{ id: "PIE", label: fr ? "Répartition" : "Shares" }] : []),
          ]} onChange={(value) => setChart(value as typeof chart)} />
          {rows.length === 1 && <AnalysisResultChart rows={rows} unit={result.unit} language={language} />}
          {rows.length > 1 && effectiveChart === "BAR" && (
            <div className="insights-chart" role="img" aria-label={fr ? "Graphique en barres" : "Bar chart"}>
              {rows.map((row) => <div key={row.group} className="insights-bar"><span>{row.label}</span><div><i style={{ width: `${Math.abs(Number(row.value) || 0) / max * 100}%` }} /></div><strong>{row.value} {result.unit ?? ""}</strong></div>)}
            </div>
          )}
          {rows.length > 1 && effectiveChart === "LINE" && <AnalysisResultChart rows={rows} unit={result.unit} language={language} />}
          {rows.length > 1 && effectiveChart === "PIE" && (
            <div className="insights-chart insights-pie-layout" role="img" aria-label={fr ? "Graphique de répartition" : "Share chart"}>
              <div className="insights-pie" style={{ background: `conic-gradient(${rows.map((row, idx) => { const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"]; const start = rows.slice(0, idx).reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0) / total * 360; const end = start + Math.max(0, Number(row.value) || 0) / total * 360; return `${colors[idx % colors.length]} ${start}deg ${end}deg`; }).join(", ")})` }} />
              <div className="insights-pie-list">{rows.map((row) => <div key={row.group}><span>{row.label}</span><strong>{row.value} {result.unit ?? ""}</strong></div>)}</div>
            </div>
          )}
          <div className="insights-table-wrap">
            <table>
              <thead><tr><th>{fr ? "Groupe" : "Group"}</th><th>{fr ? "Valeur" : "Value"}</th><th>{fr ? "Entrées" : "Entries"}</th><th>{fr ? "Sources" : "Sources"}</th></tr></thead>
              <tbody>
                {rows.map((row) => <tr key={row.group}><td>{row.label}</td><td>{row.value} {result.unit ?? ""}</td><td>{row.count}</td><td>
                  <details><summary>{fr ? "Voir les entrées" : "View entries"}</summary>
                    {row.sources.map((source) => <button key={source.entryId} type="button" onClick={() => onOpenEntry(source.entryId)}>{source.entryId} · {source.value}</button>)}
                    {row.sourcesHasMore && <button type="button" disabled={busy} onClick={() => loadMore(row.group)}>{fr ? "Afficher 100 de plus" : "Show 100 more"}</button>}
                  </details>
                </td></tr>)}
              </tbody>
            </table>
          </div>
          {result.comparisonRows && <div className="insights-table-wrap">
            <h4>{fr ? "Période comparée" : "Comparison period"}</h4>
            <table><tbody>
              {result.comparisonRows.map((row) => <tr key={row.group}><td>{row.label}</td><td>{row.value} {result.unit ?? ""}</td><td>{row.count}</td><td>
                <details><summary>{fr ? "Voir les entrées" : "View entries"}</summary>
                  {row.sources.map((source) => <button key={source.entryId} type="button" onClick={() => onOpenEntry(source.entryId)}>{source.entryId} · {source.value}</button>)}
                  {row.sourcesHasMore && <button type="button" disabled={busy} onClick={() => loadMore(row.group, true)}>{fr ? "Afficher 100 de plus" : "Show 100 more"}</button>}
                </details>
              </td></tr>)}
            </tbody></table>
          </div>}
        </section>
      ) : (
        <div className="insights-empty-result">
          <span className="insights-empty-icon" aria-hidden="true">✦</span>
          <strong>{fr ? "Prêt à explorer vos données" : "Ready to explore your data"}</strong>
          <span>{fr ? "Choisissez une mesure et lancez un calcul pour découvrir ce que racontent vos données." : "Choose a measure and calculate to see the story in your data."}</span>
          <button type="button" className="btn secondary" onClick={() => document.getElementById("analysis-measure")?.focus()}>{fr ? "Choisir une mesure" : "Choose a measure"}</button>
        </div>
      )}
      <button type="button" className="insights-close" onClick={onClose}>{fr ? "Retour à la collection" : "Back to collection"}</button>
    </div>
  );
}
