"use client";

import { useEffect, useState, type FormEvent } from "react";
import { TemporalFieldInput } from "./components/ui/LocalizedDateInput";
import { api } from "../lib/api";
import type { Collection, Entry, Language } from "../lib/brainy";
import { formatAmount, isoDay, parseAmount, periodRanges, type DayRange } from "../lib/period-totals";
import "./period-totals.css";

type Props = { collection: Collection; entries: Entry[]; language: Language; onSaved: (entry: Entry) => void };
type Totals = { week: string; month: string; year: string };

export default function PeriodTotalsPanel({ collection, entries, language, onSaved }: Props) {
  const fr = language === "fr";
  const config = collection.periodTotals;
  const format = collection.formats.find((item) => item.id === config?.formatId);
  const dateField = format?.fields.find((item) => item.id === config?.dateFieldId);
  const amountField = format?.fields.find((item) => item.id === config?.amountFieldId);
  const collectionId = collection.id, formatId = format?.id, dateFieldId = dateField?.id, amountFieldId = amountField?.id;

  const [totals, setTotals] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => isoDay());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Entries are paginated, so the sums always come from the API; any change to the list refreshes them.
  useEffect(() => {
    if (!formatId || !dateFieldId || !amountFieldId) return;
    let active = true;
    const sum = (range: DayRange) => api.analyse(collectionId, { formatId, fieldId: amountFieldId, dateFieldId, groupBy: "NONE", operation: "SUM", measureKind: "EVENT", from: range.from, to: range.to }).then((result) => result.rows[0]?.value ?? "0");
    const ranges = periodRanges();
    Promise.all([sum(ranges.week), sum(ranges.month), sum(ranges.year)])
      .then(([week, month, year]) => { if (active) { setTotals({ week, month, year }); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [collectionId, formatId, dateFieldId, amountFieldId, entries, attempt]);

  if (!format || !dateField || !amountField) return null;

  const unit = amountField.unit ? ` ${amountField.unit}` : "";
  const shown = (value?: string) => value === undefined ? "…" : formatAmount(value, language) + unit;
  const monthName = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-US", { month: "long", year: "numeric" }).format(new Date());

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setNotice("");
    const stored = parseAmount(amount);
    if (stored === null) { setError(fr ? "Saisissez un montant, par exemple 12500." : "Enter an amount, for example 12500."); return; }
    if (!date) { setError(fr ? "Choisissez la date." : "Choose the date."); return; }
    setBusy(true);
    try {
      onSaved(await api.saveEntry(collectionId, [{ fieldId: dateField.id, value: date }, { fieldId: amountField.id, value: stored }], undefined, format.id));
      setNotice(`${fr ? "Enregistré :" : "Saved:"} ${formatAmount(stored, language)}${unit}`);
      setAmount(""); setDate(isoDay());
    } catch (cause) {
      setError(fr ? `Enregistrement impossible : ${cause instanceof Error ? cause.message : cause}` : `Could not save: ${cause instanceof Error ? cause.message : cause}`);
    } finally { setBusy(false); }
  };

  return <section className="period-totals" aria-label={fr ? "Totaux des ventes" : "Sales totals"}>
    <div className="period-totals-figures">
      <div className="period-totals-month">
        <span>{fr ? "Ce mois-ci" : "This month"}</span>
        <strong>{shown(totals?.month)}</strong>
        <small>{monthName}</small>
      </div>
      <dl>
        <div><dt>{fr ? "Cette semaine" : "This week"}</dt><dd>{shown(totals?.week)}</dd></div>
        <div><dt>{fr ? "Cette année" : "This year"}</dt><dd>{shown(totals?.year)}</dd></div>
      </dl>
      {failed && <p className="period-totals-failed" role="alert">{fr ? "Les totaux n’ont pas pu être chargés." : "The totals could not be loaded."} <button type="button" onClick={() => setAttempt((value) => value + 1)}>{fr ? "Réessayer" : "Retry"}</button></p>}
    </div>
    <form className="period-totals-form" onSubmit={(event) => void save(event)} noValidate>
      <h3>{fr ? "Bilan du jour" : "Today’s sales"}</h3>
      <label className="period-totals-amount"><span>{amountField.name}{amountField.unit ? ` · ${amountField.unit}` : ""}</span><input type="text" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <div className="period-totals-date"><span>{dateField.name}</span><TemporalFieldInput kind="DATE" language={language} value={date} onChange={setDate} /></div>
      <button type="submit" className="button button-primary" disabled={busy}>{busy ? fr ? "Enregistrement…" : "Saving…" : fr ? "Enregistrer" : "Save"}</button>
      {error && <p className="period-totals-error" role="alert">{error}</p>}
      {notice && <p className="period-totals-notice" role="status">{notice}</p>}
    </form>
  </section>;
}
