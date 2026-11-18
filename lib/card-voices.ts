// T57: read-aloud voices of two-sided cards. Only the voices installed on this device are used (nothing is sent
// or stored online); the chosen voice and speed are remembered on this device, per language.
import { useEffect, useState } from "react";

export type VoiceChoice = { voice?: string; rate?: number };
const KEY = "brainy_card_voices";
export const speechRates = [0.6, 0.8, 1, 1.25, 1.5] as const;

/** The language read aloud: the data format's choice, otherwise the device's. */
export const speechLanguageOf = (language?: string | null) => language || (typeof navigator !== "undefined" ? navigator.language : "en-GB");

const sameLanguage = (voiceLang: string, language: string) => voiceLang.replace("_", "-").toLowerCase().slice(0, 2) === language.toLowerCase().slice(0, 2);

export function readVoiceChoices(): Record<string, VoiceChoice> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, VoiceChoice>; } catch { return {}; }
}

export function saveVoiceChoice(language: string, choice: VoiceChoice) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readVoiceChoices(), [language]: choice })); } catch { /* private window: the choice lasts this visit only */ }
}

export function voicesFor(language: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const exact = language.toLowerCase();
  return window.speechSynthesis.getVoices().filter((voice) => sameLanguage(voice.lang, language))
    .sort((a, b) => Number(b.lang.toLowerCase() === exact) - Number(a.lang.toLowerCase() === exact) || a.name.localeCompare(b.name));
}

/** Voices of this device for a language; the list arrives late in some browsers (voiceschanged). */
export function useVoices(language: string): { voices: SpeechSynthesisVoice[]; supported: boolean; ready: boolean } {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [state, setState] = useState<{ voices: SpeechSynthesisVoice[]; ready: boolean }>({ voices: [], ready: false });
  useEffect(() => {
    if (!supported) return;
    const update = () => setState({ voices: voicesFor(language), ready: window.speechSynthesis.getVoices().length > 0 });
    update();
    // Some browsers never fire voiceschanged when there is no voice at all: stop waiting after a moment.
    const timer = window.setTimeout(() => setState((value) => ({ ...value, ready: true })), 1500);
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => { window.clearTimeout(timer); window.speechSynthesis.removeEventListener("voiceschanged", update); };
  }, [language, supported]);
  return { ...state, supported };
}

/** Where to install a voice, for the device in use. */
export function installVoiceHelp(fr: boolean): string {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/Android/i.test(agent)) return fr ? "Sur Android : Paramètres › Système › Langues › Synthèse vocale, puis installez les données vocales de la langue (Services vocaux de Google)." : "On Android: Settings › System › Languages › Text-to-speech output, then install the voice data for the language (Speech Services by Google).";
  if (/iPhone|iPad|iPod/i.test(agent)) return fr ? "Sur iPhone ou iPad : Réglages › Accessibilité › Contenu énoncé › Voix, puis téléchargez une voix de la langue." : "On iPhone or iPad: Settings › Accessibility › Spoken Content › Voices, then download a voice for the language.";
  if (/Mac OS X/i.test(agent)) return fr ? "Sur Mac : Réglages Système › Accessibilité › Contenu énoncé › Voix du système › Gérer les voix." : "On Mac: System Settings › Accessibility › Spoken Content › System voice › Manage Voices.";
  if (/Windows/i.test(agent)) return fr ? "Sur Windows : Paramètres › Heure et langue › Voix › Ajouter des voix, puis redémarrez le navigateur." : "On Windows: Settings › Time & language › Speech › Add voices, then restart the browser.";
  return fr ? "Installez une voix de cette langue dans les réglages de synthèse vocale de votre appareil, puis rouvrez le navigateur." : "Install a voice for this language in your device's text-to-speech settings, then reopen the browser.";
}

/** Reads a text aloud with this device's voice for the language (the chosen one if any) and the chosen speed. */
export function speak(text: string, language?: string | null): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const lang = speechLanguageOf(language);
  const choice = readVoiceChoices()[lang] ?? {};
  const voices = voicesFor(lang);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voice = voices.find((item) => item.voiceURI === choice.voice) ?? voices[0];
  if (voice) utterance.voice = voice;
  if (choice.rate) utterance.rate = choice.rate;
  window.speechSynthesis.speak(utterance);
  return true;
}
