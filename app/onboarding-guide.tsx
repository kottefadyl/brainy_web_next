"use client";

// T50: five-page welcome guide shown once after sign-up. Illustrations are small Brainy UI mock-ups.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, Check, CheckSquare, FolderHeart, LayoutTemplate, Link2, Lock, Sparkles, Users, Wallet } from "lucide-react";
import { api, request } from "../lib/api";
import { formatColors, translateError, type Collection, type Language, type User } from "../lib/brainy";
import { formatColorStyle } from "../lib/format-colors";
import { Button } from "./components/ui/Button";
import { FormatColorPicker } from "./format-color-picker";
import "./onboarding.css";

type Props = { user: User; language: Language; brand: ReactNode; onFinished: (user: User, created?: Collection, openTemplates?: boolean) => void };

export async function setOnboardingCompleted(completed: boolean): Promise<User> {
  return (await request<{ setOnboardingCompleted: User }>("mutation($done:Boolean!){setOnboardingCompleted(completed:$done){id name email profession job fieldOfStudy interests hobbies profileCompleted hasProfilePhoto onboardingCompleted}}", { done: completed })).setOnboardingCompleted;
}

const pastel = (color: string) => formatColorStyle(color) as CSSProperties;

function Entry({ title, meta, color }: { title: string; meta: string; color: string }) {
  return <div className="ob-entry" style={pastel(color)}><span className="ob-dot" aria-hidden="true" /><strong>{title}</strong><small>{meta}</small></div>;
}

function WelcomeArt({ fr }: { fr: boolean }) {
  return <div className="ob-art ob-art-welcome" aria-hidden="true">
    <div className="ob-float a" style={pastel("#FFF5EB")}><CheckSquare size={18} /><span>{fr ? "Arroser les plantes" : "Water the plants"}</span></div>
    <div className="ob-float b" style={pastel("#FFF0F4")}><Wallet size={18} /><span>{fr ? "Pain · 500 FCFA" : "Bread · 2.50 €"}</span></div>
    <div className="ob-float c" style={pastel("#EDF9F3")}><Link2 size={18} /><span>{fr ? "Recette de crêpes" : "Pancake recipe"}</span></div>
    <div className="ob-float d" style={pastel("#F4F0FF")}><BookOpen size={18} /><span>{fr ? "Chapitre 1" : "Chapter 1"}</span></div>
    <div className="ob-brain"><Sparkles size={28} /></div>
  </div>;
}

function LanguageArt({ fr }: { fr: boolean }) {
  return <div className="ob-art ob-art-language" aria-hidden="true">
    <div className="ob-collection">
      <div className="ob-collection-head"><FolderHeart size={18} /><b>{fr ? "Maison" : "Home"}</b><span className="ob-step">1</span></div>
      <div className="ob-formats">
        <div className="ob-format" style={pastel("#FFF0F4")}><b>{fr ? "Dépense" : "Expense"}</b><span className="ob-step">2</span><div className="ob-pills"><i>{fr ? "Titre" : "Title"}</i><i>{fr ? "Montant" : "Amount"}</i><i>Date</i></div></div>
        <div className="ob-format" style={pastel("#FFF5EB")}><b>{fr ? "Tâche" : "Task"}</b><div className="ob-pills"><i>{fr ? "Titre" : "Title"}</i><i>{fr ? "Terminée" : "Done"}</i></div></div>
      </div>
      <div className="ob-entries">
        <div className="ob-entry-with-step"><Entry title={fr ? "Pain" : "Bread"} meta={fr ? "500 FCFA · aujourd’hui" : "€2.50 · today"} color="#FFF0F4" /><span className="ob-step">3</span></div>
        <Entry title={fr ? "Électricité" : "Electricity"} meta={fr ? "12 000 FCFA · 3 nov." : "€48 · Nov 3"} color="#FFF0F4" />
        <Entry title={fr ? "Sortir les poubelles" : "Take out the bins"} meta={fr ? "chaque lundi" : "every Monday"} color="#FFF5EB" />
      </div>
    </div>
  </div>;
}

function DailyArt({ fr }: { fr: boolean }) {
  return <div className="ob-art ob-art-daily" aria-hidden="true">
    <div className="ob-tile"><span className="ob-tile-icon t1"><CheckSquare size={18} /></span><b>{fr ? "Tâches du jour" : "Today’s tasks"}</b>
      <div className="ob-check done"><Check size={12} /> {fr ? "Arroser" : "Water"}</div><div className="ob-check"><span /> {fr ? "Sport" : "Workout"}</div></div>
    <div className="ob-tile"><span className="ob-tile-icon t2"><Wallet size={18} /></span><b>{fr ? "Dépenses" : "Expenses"}</b>
      <div className="ob-total"><small>{fr ? "Cette semaine" : "This week"}</small><strong>{fr ? "12 500 FCFA" : "€52.40"}</strong></div></div>
    <div className="ob-tile"><span className="ob-tile-icon t3"><Link2 size={18} /></span><b>{fr ? "Liens et notes" : "Links and notes"}</b>
      <div className="ob-link"><span className="ob-thumb" /><span><i /><i className="short" /></span></div></div>
    <div className="ob-tile"><span className="ob-tile-icon t4"><BarChart3 size={18} /></span><b>{fr ? "Calculs et graphiques" : "Totals and charts"}</b>
      <div className="ob-bars">{[40, 65, 50, 85, 60, 95].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div></div>
  </div>;
}

function PrivacyArt({ fr }: { fr: boolean }) {
  return <div className="ob-art ob-art-privacy" aria-hidden="true">
    <div className="ob-shield"><Lock size={34} /></div>
    <ol className="ob-levels">
      <li className="on"><Lock size={15} /><span><b>{fr ? "Privé" : "Private"}</b>{fr ? "par défaut, pour vous seul" : "by default, only you"}</span></li>
      <li><Users size={15} /><span><b>{fr ? "Partagé" : "Shared"}</b>{fr ? "avec qui vous invitez" : "with people you invite"}</span></li>
      <li><Sparkles size={15} /><span><b>{fr ? "Public" : "Public"}</b>{fr ? "seulement si vous le décidez" : "only if you decide"}</span></li>
    </ol>
  </div>;
}

export default function OnboardingGuide({ user, language, brand, onFinished }: Props) {
  const fr = language === "fr";
  const [page, setPage] = useState(0);
  const [collectionName, setCollectionName] = useState("");
  const [formatName, setFormatName] = useState("");
  const [color, setColor] = useState<string>(formatColors[0]);
  const [withDate, setWithDate] = useState(true);
  const [entryTitle, setEntryTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const firstName = user.name.split(" ")[0];
  useEffect(() => { heading.current?.focus(); }, [page]);

  async function skip(openTemplates = false) {
    setBusy(true); setError("");
    try { onFinished(await setOnboardingCompleted(true), undefined, openTemplates); }
    catch (cause) { setError(translateError(cause, language)); setBusy(false); }
  }

  async function create() {
    if (!collectionName.trim() || !formatName.trim() || !entryTitle.trim()) { setError(fr ? "Remplissez les trois étapes pour créer votre collection." : "Fill in the three steps to create your collection."); return; }
    setBusy(true); setError("");
    try {
      const fields = [{ name: fr ? "Titre" : "Title", kind: "TITLE" as const }, ...(withDate ? [{ name: "Date", kind: "DATE" as const }] : [])];
      const collection = await api.createCollection(collectionName.trim(), fields, formatName.trim(), color);
      const format = collection.formats[0];
      const values = [{ fieldId: format.fields[0].id, value: entryTitle.trim() }];
      if (withDate) { const now = new Date(); values.push({ fieldId: format.fields[1].id, value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` }); }
      await api.saveEntry(collection.id, values, undefined, format.id);
      onFinished(await setOnboardingCompleted(true), collection);
    } catch (cause) { setError(translateError(cause, language)); setBusy(false); }
  }

  const pages: { kicker: string; title: string; art: ReactNode; body: ReactNode }[] = [
    {
      kicker: fr ? "Bienvenue" : "Welcome",
      title: fr ? `Bonjour ${firstName}, voici Brainy` : `Hello ${firstName}, meet Brainy`,
      art: <WelcomeArt fr={fr} />,
      body: <>
        <p className="ob-lead">{fr ? "Votre carnet personnel, organisé à votre façon, sur téléphone, ordinateur et web." : "Your personal notebook, organized your way, on phone, computer and web."}</p>
        <ul className="ob-verbs"><li><b>{fr ? "Notez" : "Write down"}</b>{fr ? "ce qui compte" : "what matters"}</li><li><b>{fr ? "Rangez" : "Organize"}</b>{fr ? "comme vous voulez" : "the way you like"}</li><li><b>{fr ? "Retrouvez" : "Find"}</b>{fr ? "en un instant" : "in a moment"}</li></ul>
      </>,
    },
    {
      kicker: fr ? "La langue de Brainy" : "Brainy’s words",
      title: fr ? "Trois mots suffisent" : "Three words are enough",
      art: <LanguageArt fr={fr} />,
      body: <>
        <ol className="ob-words">
          <li><span className="ob-step">1</span><div><b>{fr ? "Collection" : "Collection"}</b>{fr ? "Un grand classeur : Maison, Travail, Santé…" : "A big binder: Home, Work, Health…"}</div></li>
          <li><span className="ob-step">2</span><div><b>{fr ? "Format de données" : "Data format"}</b>{fr ? "Le modèle de vos fiches : leurs champs et leur couleur." : "The template of your cards: their fields and color."}</div></li>
          <li><span className="ob-step">3</span><div><b>{fr ? "Entrée" : "Entry"}</b>{fr ? "Une fiche remplie, comme « Pain, 500 FCFA »." : "A filled-in card, like “Bread, €2.50”."}</div></li>
        </ol>
        <p className="ob-note">{fr ? "Vous décidez de la structure. Commencez avec un seul champ : tout reste modifiable." : "You decide the structure. Start with one field: everything stays editable."}</p>
      </>,
    },
    {
      kicker: fr ? "Au quotidien" : "Every day",
      title: fr ? "Brainy vous aide chaque jour" : "Brainy helps you every day",
      art: <DailyArt fr={fr} />,
      body: <>
        <ul className="ob-uses">
          <li><CheckSquare size={18} aria-hidden="true" />{fr ? "Cochez vos tâches du jour, uniques ou qui reviennent." : "Check off today’s tasks, one-off or repeating."}</li>
          <li><Wallet size={18} aria-hidden="true" />{fr ? "Suivez vos dépenses et vos totaux de la semaine." : "Track your spending and weekly totals."}</li>
          <li><Link2 size={18} aria-hidden="true" />{fr ? "Gardez liens, idées et notes au même endroit." : "Keep links, ideas and notes in one place."}</li>
          <li><LayoutTemplate size={18} aria-hidden="true" />{fr ? "Partez d’un modèle prêt : tâches, agenda, livre, sport…" : "Start from a ready template: tasks, calendar, book, sport…"}</li>
        </ul>
      </>,
    },
    {
      kicker: fr ? "Vos données" : "Your data",
      title: fr ? "Privées, toujours à votre main" : "Private, always in your hands",
      art: <PrivacyArt fr={fr} />,
      body: <>
        <p>{fr ? "Ce que vous enregistrez est privé : personne d’autre ne le voit. Vous partagez seulement quand vous le choisissez, en invitant quelqu’un ou en exportant." : "What you save is private: nobody else sees it. You share only when you choose, by inviting someone or exporting."}</p>
        <div className="ob-vision">
          <span className="ob-badge">{fr ? "Notre vision à long terme" : "Our long-term vision"}</span>
          <p>{fr ? "Faire de Brainy un outil capable de traiter des données à l’échelle industrielle et d’aider aux études scientifiques, mathématiques et statistiques, sur des données de tous types et de tous domaines : santé, agriculture, météo, commerce, éducation…" : "Make Brainy able to handle data at industrial scale and to support scientific, mathematical and statistical studies on data of every type and field: health, farming, weather, trade, education…"}</p>
          <p className="ob-small">{fr ? "Les calculs, graphiques et prévisions existent déjà ; le reste arrive peu à peu. Vos données ne deviendront publiques que si vous le décidez." : "Totals, charts and forecasts already exist; the rest is coming step by step. Your data becomes public only if you decide so."}</p>
        </div>
      </>,
    },
  ];

  const last = page === 4;
  const preview = <div className="ob-art ob-art-preview" aria-label={fr ? "Aperçu" : "Preview"}>
    <div className="ob-collection">
      <div className="ob-collection-head"><FolderHeart size={18} /><b>{collectionName.trim() || (fr ? "Ma collection" : "My collection")}</b></div>
      <div className="ob-formats"><div className="ob-format" style={pastel(color)}><b>{formatName.trim() || (fr ? "Mon format de données" : "My data format")}</b><div className="ob-pills"><i>{fr ? "Titre" : "Title"}</i>{withDate && <i>Date</i>}</div></div></div>
      <div className="ob-entries"><Entry title={entryTitle.trim() || (fr ? "Ma première entrée" : "My first entry")} meta={withDate ? (fr ? "aujourd’hui" : "today") : (fr ? "à l’instant" : "just now")} color={color} /></div>
    </div>
  </div>;

  return <div className="ob-screen">
    <header className="ob-top">{brand}<Button variant="subtle" disabled={busy} onClick={() => void skip()}>{fr ? "Passer le guide" : "Skip the guide"}</Button></header>
    <main className="ob-card" aria-live="polite">
      <div className="ob-visual">{last ? preview : pages[page].art}</div>
      <section className="ob-text" key={page}>
        <p className="ob-kicker">{last ? (fr ? "À vous de jouer" : "Your turn") : pages[page].kicker} · {page + 1}/5</p>
        <h1 ref={heading} tabIndex={-1}>{last ? (fr ? "Créons votre première collection" : "Let’s create your first collection") : pages[page].title}</h1>
        {last ? <form className="ob-wizard" onSubmit={(event) => { event.preventDefault(); void create(); }}>
          <fieldset><legend><span className="ob-step">1</span>{fr ? "Nommez votre collection" : "Name your collection"}</legend>
            <input value={collectionName} maxLength={80} onChange={(event) => setCollectionName(event.target.value)} aria-label={fr ? "Nom de la collection" : "Collection name"} placeholder={fr ? "Par exemple : Maison" : "For example: Home"} />
            <div className="ob-chips">{(fr ? ["Maison", "Travail", "Études", "Santé"] : ["Home", "Work", "Studies", "Health"]).map((item) => <button key={item} type="button" onClick={() => setCollectionName(item)}>{item}</button>)}</div>
          </fieldset>
          <fieldset><legend><span className="ob-step">2</span>{fr ? "Créez un format de données" : "Create a data format"}</legend>
            <input value={formatName} maxLength={80} onChange={(event) => setFormatName(event.target.value)} aria-label={fr ? "Nom du format de données" : "Data format name"} placeholder={fr ? "Par exemple : Dépense" : "For example: Expense"} />
            <div className="ob-chips">{(fr ? ["Note", "Tâche", "Dépense", "Idée"] : ["Note", "Task", "Expense", "Idea"]).map((item) => <button key={item} type="button" onClick={() => setFormatName(item)}>{item}</button>)}</div>
            <label className="ob-check-field"><input type="checkbox" checked={withDate} onChange={(event) => setWithDate(event.target.checked)} />{fr ? "Ajouter un champ Date en plus du Titre" : "Add a Date field next to the Title"}</label>
            <details className="ob-colors"><summary>{fr ? "Choisir une couleur" : "Choose a color"}</summary><FormatColorPicker language={language} value={color} unavailable={[]} onChange={setColor} /></details>
          </fieldset>
          <fieldset><legend><span className="ob-step">3</span>{fr ? "Écrivez votre première entrée" : "Write your first entry"}</legend>
            <input value={entryTitle} maxLength={200} onChange={(event) => setEntryTitle(event.target.value)} aria-label={fr ? "Titre de la première entrée" : "First entry title"} placeholder={fr ? "Par exemple : Pain, 500 FCFA" : "For example: Bread"} />
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="ob-wizard-actions">
            <Button variant="primary" type="submit" disabled={busy}>{busy ? (fr ? "Création…" : "Creating…") : (fr ? "Créer et commencer" : "Create and start")}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void skip(true)}><LayoutTemplate size={16} />{fr ? "Partir d’un modèle" : "Start from a template"}</Button>
          </div>
        </form> : pages[page].body}
        {!last && error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
    <nav className="ob-nav" aria-label={fr ? "Pages du guide" : "Guide pages"}>
      <Button variant="secondary" disabled={page === 0 || busy} onClick={() => setPage(page - 1)}><ArrowLeft size={16} />{fr ? "Retour" : "Back"}</Button>
      <div className="ob-dots">{Array.from({ length: 5 }, (_, index) => <button key={index} type="button" className={index === page ? "on" : ""} aria-label={`${fr ? "Page" : "Page"} ${index + 1}`} aria-current={index === page ? "step" : undefined} onClick={() => setPage(index)} />)}</div>
      {!last ? <Button variant="primary" onClick={() => setPage(page + 1)}>{fr ? "Suivant" : "Next"}<ArrowRight size={16} /></Button> : <span className="ob-nav-spacer" />}
    </nav>
  </div>;
}
