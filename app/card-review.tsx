"use client";

// T56: review of two-sided cards. The front is shown, the person turns the card, then answers how well they knew it;
// Brainy schedules when the card comes back (spaced repetition, per person). Only in Two-sided cards collections.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Layers, RotateCcw, Volume2 } from "lucide-react";
import { formatColorStyle } from "../lib/format-colors";
import { formatDisplayName, formatFieldValue, translateError, type Collection, type Entry, type Language } from "../lib/brainy";
import { faceOf, flashCardsApi, intervalLabel, mediaKind, speak, speechLanguages, type CardDeck, type CardGrade, type CardOrder, type ReviewCard } from "../lib/flash-cards";
import { Button } from "./components/ui/Button";
import "./card-review.css";

type Field = Collection["formats"][number]["fields"][number];

/** Summary above the entries: cards to review today, and the button to start. */
export function CardReviewBanner({ collection, language, onStart }: { collection: Collection; language: Language; onStart: () => void }) {
  const fr = language === "fr";
  const [decks, setDecks] = useState<CardDeck[] | null>(null);
  useEffect(() => { let alive = true; flashCardsApi.decks(collection.id).then((value) => { if (alive) setDecks(value); }).catch(() => undefined); return () => { alive = false; }; }, [collection]);
  const total = decks?.reduce((sum, deck) => sum + deck.total, 0) ?? 0;
  const due = decks?.reduce((sum, deck) => sum + deck.due, 0) ?? 0;
  const fresh = decks?.reduce((sum, deck) => sum + deck.fresh, 0) ?? 0;
  return <section className="card-banner" aria-label={fr ? "Révision des cartes" : "Card review"}>
    <span className="card-banner-icon" aria-hidden="true"><Layers size={22} /></span>
    <div className="card-banner-text">
      <strong>{fr ? "Révision" : "Review"}</strong>
      <span>{decks === null ? (fr ? "Chargement…" : "Loading…") : total === 0 ? (fr ? "Ajoutez des cartes pour commencer à réviser." : "Add cards to start reviewing.") : fr ? `${due} à revoir aujourd’hui · ${fresh} nouvelle(s) · ${total} au total` : `${due} due today · ${fresh} new · ${total} in all`}</span>
    </div>
    <Button variant="primary" disabled={!total} onClick={onStart}><Layers size={16} />{fr ? "Réviser" : "Review"}</Button>
  </section>;
}

type Phase = "setup" | "review" | "done";

export default function CardReview({ collection, language, owner, onClose, onCollectionChanged }: { collection: Collection; language: Language; owner: boolean; onClose: () => void; onCollectionChanged: (collection: Collection) => void }) {
  const fr = language === "fr";
  const [decks, setDecks] = useState<CardDeck[] | null>(null);
  const [formatId, setFormatId] = useState(collection.formats[0]?.id ?? "");
  const [count, setCount] = useState(20);
  const [order, setOrder] = useState<CardOrder>("DUE");
  const [phase, setPhase] = useState<Phase>("setup");
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [index, setIndex] = useState(0);
  const [turned, setTurned] = useState(false);
  const [answers, setAnswers] = useState<Record<CardGrade, number>>({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 });
  const [repeated, setRepeated] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const format = collection.formats.find((item) => item.id === formatId) ?? collection.formats[0];
  const deck = decks?.find((item) => item.formatId === format?.id);
  const available = !deck ? 0 : order === "DUE" ? deck.due + deck.fresh : deck.total;
  const front = useMemo(() => format?.fields.filter((field) => faceOf(field) === "FRONT") ?? [], [format]);
  const back = useMemo(() => format?.fields.filter((field) => faceOf(field) === "BACK") ?? [], [format]);
  const current = queue[index];

  useEffect(() => { let alive = true; flashCardsApi.decks(collection.id).then((value) => { if (alive) { setDecks(value); const first = value.find((item) => item.total > 0); if (first) setFormatId((id) => value.some((item) => item.formatId === id && item.total > 0) ? id : first.formatId); } }).catch((cause) => { if (alive) setError(translateError(cause, language)); }); return () => { alive = false; }; }, [collection.id, language, phase]);

  async function start() {
    setBusy(true); setError("");
    try {
      const cards = await flashCardsApi.session(collection.id, format.id, count, order);
      setQueue(cards); setIndex(0); setTurned(false); setRepeated(new Set()); setAnswers({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 });
      setPhase(cards.length ? "review" : "done");
    } catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); }
  }

  const answer = useCallback(async (grade: CardGrade) => {
    if (!current || busy) return;
    setBusy(true); setError("");
    try {
      await flashCardsApi.grade(collection.id, current.entry.id, grade);
      setAnswers((value) => ({ ...value, [grade]: value[grade] + 1 }));
      // A forgotten card comes back once more at the end of this session.
      if (grade === "AGAIN" && !repeated.has(current.entry.id)) { setQueue((value) => [...value, { ...current, preview: { again: 10, hard: 1440, good: 1440, easy: 5760 } }]); setRepeated((value) => new Set(value).add(current.entry.id)); }
      if (index + 1 >= queue.length + (grade === "AGAIN" && !repeated.has(current.entry.id) ? 1 : 0)) setPhase("done");
      else { setIndex(index + 1); setTurned(false); }
    } catch (cause) { setError(translateError(cause, language)); } finally { setBusy(false); }
  }, [busy, collection.id, current, index, language, queue.length, repeated]);

  useEffect(() => {
    if (phase !== "review") return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("input, select, textarea")) return;
      if (!turned && (event.key === " " || event.key === "Enter")) { event.preventDefault(); setTurned(true); }
      else if (turned) { const grade = ({ "1": "AGAIN", "2": "HARD", "3": "GOOD", "4": "EASY" } as Record<string, CardGrade>)[event.key]; if (grade) { event.preventDefault(); void answer(grade); } else if (event.key === " ") { event.preventDefault(); void answer("GOOD"); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, turned, answer]);

  const grades: { grade: CardGrade; label: string; minutes: (card: ReviewCard) => number }[] = [
    { grade: "AGAIN", label: fr ? "À revoir" : "Again", minutes: (card) => card.preview.again },
    { grade: "HARD", label: fr ? "Difficile" : "Hard", minutes: (card) => card.preview.hard },
    { grade: "GOOD", label: fr ? "Bien" : "Good", minutes: (card) => card.preview.good },
    { grade: "EASY", label: fr ? "Facile" : "Easy", minutes: (card) => card.preview.easy },
  ];

  return <section className="card-review analysis-page" aria-label={fr ? "Révision des cartes" : "Card review"}>
    <button type="button" className="analysis-back" onClick={onClose}><ArrowLeft size={17} />{fr ? "Retour aux cartes" : "Back to the cards"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}

    {phase === "setup" && <div className="card-setup">
      <h2>{fr ? "Préparer une révision" : "Set up a review"}</h2>
      {collection.formats.length > 1 && <label className="input-label">{fr ? "Format de données" : "Data format"}<select value={format?.id} onChange={(event) => setFormatId(event.target.value)}>{collection.formats.map((item) => <option key={item.id} value={item.id}>{formatDisplayName(item, language)}</option>)}</select></label>}
      <label className="input-label">{fr ? "Ordre" : "Order"}<select value={order} onChange={(event) => setOrder(event.target.value as CardOrder)}>
        <option value="DUE">{fr ? "À revoir aujourd’hui, puis nouvelles" : "Due today, then new cards"}</option>
        <option value="OLDEST">{fr ? "De la plus ancienne à la plus récente" : "Oldest to newest"}</option>
        <option value="NEWEST">{fr ? "De la plus récente à la plus ancienne" : "Newest to oldest"}</option>
        <option value="RANDOM">{fr ? "Au hasard" : "Random"}</option>
      </select></label>
      <label className="input-label">{fr ? "Nombre de cartes" : "Number of cards"}<select value={count} onChange={(event) => setCount(Number(event.target.value))}>{[5, 10, 20, 50, 100, 200].map((value) => <option key={value} value={value}>{value === 200 ? (fr ? "Toutes (200 au plus)" : "All (up to 200)") : value}</option>)}</select></label>
      <label className="input-label">{fr ? "Lecture à voix haute" : "Read aloud"}<select value={format?.speechLanguage ?? ""} disabled={!owner} onChange={async (event) => { try { onCollectionChanged(await flashCardsApi.setSpeechLanguage(collection.id, format.id, event.target.value || null)); } catch (cause) { setError(translateError(cause, language)); } }}>
        <option value="">{fr ? "Langue de l’appareil" : "Device language"}</option>
        {speechLanguages.map(([code, en, frLabel]) => <option key={code} value={code}>{fr ? frLabel : en}</option>)}
      </select></label>
      <p className="card-setup-count" role="status">{deck ? (fr ? `${deck.due} à revoir aujourd’hui · ${deck.fresh} nouvelle(s) · ${deck.total} au total` : `${deck.due} due today · ${deck.fresh} new · ${deck.total} in all`) : (fr ? "Chargement…" : "Loading…")}</p>
      <div className="card-setup-actions"><Button variant="primary" disabled={busy || !available} onClick={start}><Layers size={16} />{available ? (fr ? `Commencer (${Math.min(count, available)})` : `Start (${Math.min(count, available)})`) : (fr ? "Rien à revoir pour l’instant" : "Nothing to review right now")}</Button></div>
    </div>}

    {phase === "review" && current && format && <div className="card-session">
      <div className="card-progress" role="status"><span>{fr ? `Carte ${index + 1} sur ${queue.length}` : `Card ${index + 1} of ${queue.length}`}</span><span className="card-progress-bar" aria-hidden="true"><span style={{ width: `${Math.round(index / queue.length * 100)}%` }} /></span></div>
      <article className={`flash-card${turned ? " is-turned" : ""}`} style={formatColorStyle(format.color)} aria-live="polite">
        <CardFace fields={front} entry={current.entry} collection={collection} language={language} speech={format.speechLanguage} label={fr ? "Recto" : "Front"} />
        {turned && <><hr className="flash-card-fold" /><CardFace fields={back} entry={current.entry} collection={collection} language={language} speech={format.speechLanguage} label={fr ? "Verso" : "Back"} /></>}
      </article>
      {!turned
        ? <div className="card-turn"><Button variant="primary" onClick={() => setTurned(true)}><RotateCcw size={16} />{fr ? "Retourner la carte" : "Turn the card"}</Button><small>{fr ? "ou touche Espace" : "or press Space"}</small></div>
        : <div className="card-grades" role="group" aria-label={fr ? "Comment vous en êtes-vous souvenu ?" : "How well did you remember it?"}>
            {grades.map(({ grade, label, minutes }, position) => <button key={grade} type="button" className={`card-grade grade-${grade.toLowerCase()}`} disabled={busy} onClick={() => void answer(grade)}>
              <strong>{label}</strong><small>{intervalLabel(minutes(current), language)}</small><kbd aria-hidden="true">{position + 1}</kbd>
            </button>)}
          </div>}
    </div>}

    {phase === "done" && <div className="card-done">
      <span className="card-done-icon" aria-hidden="true"><Check size={28} /></span>
      <h2>{queue.length ? (fr ? "Révision terminée" : "Review finished") : (fr ? "Rien à revoir pour l’instant" : "Nothing to review right now")}</h2>
      {queue.length > 0 && <p>{fr ? `${answers.GOOD + answers.EASY} bien su(s) · ${answers.HARD} difficile(s) · ${answers.AGAIN} à revoir` : `${answers.GOOD + answers.EASY} known · ${answers.HARD} hard · ${answers.AGAIN} to see again`}</p>}
      <p className="card-done-note">{fr ? "Chaque carte reviendra au bon moment : plus vous la connaissez, plus elle revient tard." : "Each card comes back at the right time: the better you know it, the later it returns."}</p>
      <div className="card-setup-actions"><Button variant="secondary" onClick={() => setPhase("setup")}>{fr ? "Nouvelle révision" : "New review"}</Button><Button variant="primary" onClick={onClose}>{fr ? "Terminer" : "Finish"}</Button></div>
    </div>}
  </section>;
}

function CardFace({ fields, entry, collection, language, speech, label }: { fields: Field[]; entry: Entry; collection: Collection; language: Language; speech?: string | null; label: string }) {
  const fr = language === "fr";
  const values = new Map(entry.values.map((item) => [item.fieldId, item]));
  const filled = fields.filter((field) => values.get(field.id)?.value.trim());
  const spoken = filled.filter((field) => ["TITLE", "TEXT", "LONG_TEXT"].includes(field.kind)).map((field) => values.get(field.id)!.value).join(". ");
  return <div className="flash-card-face">
    <div className="flash-card-face-head"><span>{label}</span>{spoken && <button type="button" className="card-listen" onClick={() => speak(spoken, speech)} aria-label={fr ? `Écouter : ${label}` : `Listen: ${label}`} title={fr ? "Écouter" : "Listen"}><Volume2 size={16} />{fr ? "Écouter" : "Listen"}</button>}</div>
    {!filled.length && <p className="flash-card-empty">{fr ? "Rien sur cette face." : "Nothing on this side."}</p>}
    {filled.map((field) => {
      const value = values.get(field.id)!;
      const media = field.kind === "LINK" ? mediaKind(value.value) : null;
      return <div key={field.id} className={`flash-card-field kind-${field.kind.toLowerCase()}`}>
        {field.kind !== "TITLE" && <span className="flash-card-label">{field.name}</span>}
        {media === "image" ? <CardPicture src={value.value} alt={field.name} />
          : media === "audio" ? <audio controls preload="none" src={value.value}>{field.name}</audio>
          : field.kind === "LINK" ? <a href={value.value} target="_blank" rel="noopener noreferrer">{value.value}</a>
          : <span className="flash-card-value">{formatFieldValue(field, value.value, language, value.unitSnapshot, collection)}</span>}
      </div>;
    })}
  </div>;
}

/** T56: front or back of the card, for a field in the data format editor. */
export function CardFaceToggle({ value, language, onChange }: { value: "FRONT" | "BACK"; language: Language; onChange: (face: "FRONT" | "BACK") => void }) {
  const fr = language === "fr";
  return <span className="card-face-toggle" role="radiogroup" aria-label={fr ? "Face de la carte" : "Card side"}>
    {(["FRONT", "BACK"] as const).map((face) => <button key={face} type="button" role="radio" aria-checked={value === face} className={value === face ? "is-on" : ""} onClick={() => onChange(face)}>{face === "FRONT" ? (fr ? "Recto" : "Front") : (fr ? "Verso" : "Back")}</button>)}
  </span>;
}

/** A picture shown from its own site (never stored by Brainy). */
function CardPicture({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- remote picture from any site, not optimised by Next
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />;
}
