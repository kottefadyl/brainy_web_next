"use client";

// T57: choose the voice and speed read aloud on this device; say clearly when no voice exists for the language.
import { useState } from "react";
import { Volume2 } from "lucide-react";
import type { Language } from "../lib/brainy";
import { installVoiceHelp, readVoiceChoices, saveVoiceChoice, speak, speechLanguageOf, speechRates, useVoices } from "../lib/card-voices";
import { speechLanguages } from "../lib/flash-cards";
import { Button } from "./components/ui/Button";

/** A short greeting in the language read aloud, to try a voice. */
const SAMPLES: Record<string, string> = { en: "Hello! This is how your cards will sound.", fr: "Bonjour ! Voici la voix de vos cartes.", es: "¡Hola! Así sonarán tus tarjetas.", de: "Hallo! So klingen deine Karten.", it: "Ciao! Ecco la voce delle tue carte.", pt: "Olá! Assim soarão os seus cartões.", nl: "Hallo! Zo klinken je kaarten.", ar: "مرحبا! هكذا ستبدو بطاقاتك.", zh: "你好！这是你的卡片的声音。", ja: "こんにちは！カードの声です。", ko: "안녕하세요! 카드의 목소리입니다.", ru: "Привет! Так будут звучать ваши карточки." };

export default function CardVoiceSettings({ language: chosenLanguage, uiLanguage }: { language?: string | null; uiLanguage: Language }) {
  const fr = uiLanguage === "fr";
  const language = speechLanguageOf(chosenLanguage);
  const { voices, supported, ready } = useVoices(language);
  const [choice, setChoice] = useState(() => readVoiceChoices()[language] ?? {});
  const [shownFor, setShownFor] = useState(language);
  if (shownFor !== language) { setShownFor(language); setChoice(readVoiceChoices()[language] ?? {}); }
  const update = (next: typeof choice) => { setChoice(next); saveVoiceChoice(language, next); };
  const languageName = speechLanguages.find(([code]) => code.toLowerCase() === language.toLowerCase())?.[fr ? 2 : 1] ?? language;
  const sample = SAMPLES[language.slice(0, 2).toLowerCase()] ?? "1, 2, 3";

  if (!supported) return <p className="card-voice-missing" role="status">{fr ? "Ce navigateur ne sait pas lire à voix haute." : "This browser cannot read aloud."}</p>;
  if (ready && !voices.length) return <div className="card-voice-missing" role="status">
    <strong>{fr ? `Aucune voix « ${languageName} » sur cet appareil.` : `No “${languageName}” voice on this device.`}</strong>
    <span>{fr ? "La lecture utiliserait une autre langue ou resterait muette. " : "Reading would use another language or stay silent. "}{installVoiceHelp(fr)}</span>
  </div>;
  return <div className="card-voice-settings">
    <label className="input-label">{fr ? "Voix (sur cet appareil)" : "Voice (on this device)"}
      <select value={choice.voice ?? ""} onChange={(event) => update({ ...choice, voice: event.target.value || undefined })} disabled={!voices.length}>
        <option value="">{fr ? "Automatique" : "Automatic"}</option>
        {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}{voice.localService ? "" : fr ? " (en ligne)" : " (online)"} · {voice.lang}</option>)}
      </select>
    </label>
    <label className="input-label">{fr ? "Vitesse" : "Speed"}
      <select value={String(choice.rate ?? 1)} onChange={(event) => update({ ...choice, rate: Number(event.target.value) === 1 ? undefined : Number(event.target.value) })}>
        {speechRates.map((rate) => <option key={rate} value={rate}>{rate === 1 ? (fr ? "Normale" : "Normal") : `× ${String(rate).replace(".", fr ? "," : ".")}`}</option>)}
      </select>
    </label>
    <Button type="button" variant="secondary" onClick={() => speak(sample, language)}><Volume2 size={16} />{fr ? "Essayer" : "Try"}</Button>
  </div>;
}
