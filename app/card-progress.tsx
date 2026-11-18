"use client";

// T57: my learning progress on two-sided cards — daily goal, statistics and the cards I forget most.
// Personal learning figures: shown even when "Calculations and statistics" is off for the collection.
import { useEffect, useState, type FormEvent } from "react";
import { Flame, Target } from "lucide-react";
import { translateError, type Language } from "../lib/brainy";
import { flashCardsApi, type CardStats } from "../lib/flash-cards";
import { Button } from "./components/ui/Button";
import "./card-progress.css";

const dayLabel = (day: string, language: Language, style: "short" | "weekday" = "short") =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", style === "weekday" ? { weekday: "short", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });

/** "12 / 20 today · 3 days in a row" — for the banner and the review page. */
export function CardGoalLine({ stats, language }: { stats: CardStats; language: Language }) {
  const fr = language === "fr";
  const { reviewed, goal, streak } = stats.today;
  const ratio = goal ? Math.min(1, reviewed / goal) : 0;
  return <span className="card-goal-line">
    {goal ? <>
      <span className="card-goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(reviewed, goal)} aria-label={fr ? "Objectif du jour" : "Today's goal"}><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
      <span className="card-goal-figure"><Target size={14} aria-hidden="true" />{fr ? `${reviewed} / ${goal} aujourd’hui` : `${reviewed} / ${goal} today`}{reviewed >= goal ? " ✓" : ""}</span>
    </> : <span className="card-goal-figure">{fr ? `${reviewed} carte(s) révisée(s) aujourd’hui` : `${reviewed} card(s) reviewed today`}</span>}
    {streak > 0 && <span className="card-goal-streak"><Flame size={14} aria-hidden="true" />{fr ? `${streak} jour${streak > 1 ? "s" : ""} de suite` : `${streak} day${streak > 1 ? "s" : ""} in a row`}</span>}
  </span>;
}

export function useCardStats(collectionId: string, formatId: string | null, refresh: unknown) {
  const [stats, setStats] = useState<CardStats | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let alive = true;
    flashCardsApi.stats(collectionId, formatId).then((value) => { if (alive) { setStats(value); setError(null); } }).catch((cause) => { if (alive) setError(cause); });
    return () => { alive = false; };
  }, [collectionId, formatId, refresh]);
  return { stats, error, setStats };
}

export default function CardProgressPanel({ collectionId, formatId, formatName, language, refresh }: { collectionId: string; formatId: string | null; formatName?: string; language: Language; refresh: unknown }) {
  const fr = language === "fr";
  const [saved, setSaved] = useState(0);
  const { stats, error } = useCardStats(collectionId, formatId, `${String(refresh)}-${saved}`);
  if (error) return <p className="form-error" role="alert">{translateError(error, language)}</p>;
  if (!stats) return <section className="card-progress-panel" aria-busy="true"><p className="card-setup-count">{fr ? "Chargement des progrès…" : "Loading progress…"}</p></section>;
  const percent = stats.successRate30 == null ? "—" : `${Math.round(stats.successRate30 * 100)} %`;
  const maxDay = Math.max(1, ...stats.days.map((day) => day.answers));
  const maxDue = Math.max(1, ...stats.forecast);
  const today = stats.days.at(-1)?.day ?? "";
  return <section className="card-progress-panel" aria-label={fr ? "Mes progrès" : "My progress"}>
    <div className="card-progress-head">
      <h2>{fr ? "Mes progrès" : "My progress"}{formatName ? <small> · {formatName}</small> : null}</h2>
      <CardGoalLine stats={stats} language={language} />
    </div>

    <div className="card-stat-tiles">
      <Tile label={fr ? "Nouvelles" : "New"} value={stats.fresh} hint={fr ? "jamais révisées" : "never reviewed"} />
      <Tile label={fr ? "En cours" : "Learning"} value={stats.learning} hint={fr ? "retour avant 21 j" : "back within 21 d"} />
      <Tile label={fr ? "Acquises" : "Learned"} value={stats.mature} hint={fr ? "retour à 21 j ou plus" : "back in 21 d or more"} />
      <Tile label={fr ? "Révisions" : "Reviews"} value={stats.reviewed7} hint={fr ? `7 jours · ${stats.reviewed30} sur 30` : `7 days · ${stats.reviewed30} in 30`} />
      <Tile label={fr ? "Réussite" : "Success"} value={percent} hint={fr ? "réponses autres que « À revoir », 30 j" : "answers other than Again, 30 d"} />
    </div>

    <figure className="card-mini-chart">
      <figcaption>{fr ? "Révisions des 30 derniers jours" : "Reviews over the last 30 days"}</figcaption>
      <div className="card-bars" role="list">
        {stats.days.map((day) => {
          const text = fr ? `${dayLabel(day.day, language)} : ${day.answers} réponse(s), ${day.remembered} retenue(s)` : `${dayLabel(day.day, language)}: ${day.answers} answer(s), ${day.remembered} remembered`;
          return <span key={day.day} role="listitem" className={`card-bar${day.day === today ? " is-today" : ""}`} title={text} aria-label={text} tabIndex={0}>
            <span style={{ height: `${day.answers ? Math.max(6, day.answers / maxDay * 100) : 0}%` }} />
          </span>;
        })}
      </div>
      <div className="card-bars-axis" aria-hidden="true"><span>{dayLabel(stats.days[0].day, language)}</span><span>{fr ? "aujourd’hui" : "today"}</span></div>
    </figure>

    <figure className="card-mini-chart">
      <figcaption>{fr ? "À revoir les 7 prochains jours" : "Due over the next 7 days"}</figcaption>
      <div className="card-bars card-bars-forecast" role="list">
        {stats.forecast.map((count, index) => {
          const day = shiftDay(today, index);
          const name = index === 0 ? (fr ? "Auj." : "Today") : dayLabel(day, language, "weekday");
          const text = `${name} : ${count}`;
          return <span key={day} role="listitem" className="card-bar card-bar-labelled" title={text} aria-label={fr ? `${name} : ${count} carte(s)` : `${name}: ${count} card(s)`} tabIndex={0}>
            <b>{count || ""}</b>
            <span style={{ height: `${count ? Math.max(6, count / maxDue * 100) : 0}%` }} />
            <small>{name}</small>
          </span>;
        })}
      </div>
    </figure>

    {stats.hardest.length > 0 && <div className="card-hardest">
      <h3>{fr ? "Les plus souvent oubliées" : "Most often forgotten"}</h3>
      <ol>{stats.hardest.map((card) => <li key={card.entryId}><span>{card.title}</span><small>{fr ? `${card.forgotten} fois « À revoir »` : `“Again” ${card.forgotten}×`}</small></li>)}</ol>
    </div>}

    <GoalForm collectionId={collectionId} stats={stats} language={language} onSaved={() => setSaved((value) => value + 1)} />
  </section>;
}

function Tile({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return <div className="card-stat-tile"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

function shiftDay(day: string, delta: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
}

function GoalForm({ collectionId, stats, language, onSaved }: { collectionId: string; stats: CardStats; language: Language; onSaved: () => void }) {
  const fr = language === "fr";
  const [reviews, setReviews] = useState(stats.today.goal?.toString() ?? "");
  const [fresh, setFresh] = useState(stats.today.newLimit?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const parse = (value: string) => value.trim() ? Number(value) : null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try { await flashCardsApi.setGoal(collectionId, parse(reviews), parse(fresh)); setMessage(fr ? "Objectif enregistré." : "Goal saved."); onSaved(); }
    catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(false); }
  }
  return <form className="card-goal-form" onSubmit={submit}>
    <h3>{fr ? "Mon objectif quotidien" : "My daily goal"}</h3>
    <p>{fr ? "Rien que pour vous : chaque personne choisit le sien. Laissez vide pour ne rien fixer." : "Just for you: each person chooses their own. Leave empty for none."}</p>
    <div className="card-goal-fields">
      <label className="input-label">{fr ? "Cartes à réviser par jour" : "Cards to review per day"}<input type="number" min={1} max={9999} step={1} inputMode="numeric" value={reviews} onChange={(event) => setReviews(event.target.value)} placeholder={fr ? "Aucun objectif" : "No goal"} /></label>
      <label className="input-label">{fr ? "Nouvelles cartes par jour, au plus" : "New cards per day, at most"}<input type="number" min={1} max={9999} step={1} inputMode="numeric" value={fresh} onChange={(event) => setFresh(event.target.value)} placeholder={fr ? "Sans limite" : "No limit"} /></label>
    </div>
    <small className="card-goal-note">{fr ? "La limite de nouvelles cartes s’applique à l’ordre « À revoir aujourd’hui, puis nouvelles »." : "The new-card limit applies to the order “Due today, then new cards”."}</small>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="card-goal-saved" role="status">{message}</p>}
    <div className="card-setup-actions"><Button type="submit" variant="secondary" disabled={busy}>{busy ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Enregistrer l’objectif" : "Save the goal")}</Button></div>
  </form>;
}
