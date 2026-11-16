// T56: Two-sided cards — review sessions and spaced repetition (API in flash-cards.service.ts).
import { collectionFields, entryFields, request } from "./api";
import type { Collection, Entry, Language } from "./brainy";

export const FLASH_CARDS_TEMPLATE = "cards";
export type CardGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type CardOrder = "DUE" | "OLDEST" | "NEWEST" | "RANDOM";
export type CardDeck = { formatId: string; total: number; due: number; fresh: number };
export type ReviewCard = { entry: Entry; state: { intervalDays: number; reps: number; lapses: number; due: string } | null; preview: { again: number; hard: number; good: number; easy: number } };

export const isFlashCards = (collection?: Pick<Collection, "templateId"> | null) => collection?.templateId === FLASH_CARDS_TEMPLATE;

export const flashCardsApi = {
  async decks(collectionId: string): Promise<CardDeck[]> {
    return (await request<{ cardDecks: CardDeck[] }>("query($c:String!){cardDecks(collectionId:$c){formatId total due fresh}}", { c: collectionId })).cardDecks;
  },
  async session(collectionId: string, formatId: string, count: number, order: CardOrder): Promise<ReviewCard[]> {
    return (await request<{ cardReviewSession: ReviewCard[] }>(`query($c:String!,$f:String!,$n:Int!,$o:CardReviewOrder!){cardReviewSession(collectionId:$c,formatId:$f,count:$n,order:$o){entry{ ${entryFields} } state{intervalDays reps lapses due} preview{again hard good easy}}}`, { c: collectionId, f: formatId, n: count, o: order })).cardReviewSession;
  },
  async grade(collectionId: string, entryId: string, grade: CardGrade): Promise<void> {
    await request("mutation($c:String!,$e:String!,$g:CardGrade!){gradeCard(collectionId:$c,entryId:$e,grade:$g){entryId}}", { c: collectionId, e: entryId, g: grade });
  },
  async setSpeechLanguage(collectionId: string, formatId: string, language: string | null): Promise<Collection> {
    return (await request<{ setCardSpeechLanguage: Collection }>(`mutation($c:String!,$f:String!,$l:String){setCardSpeechLanguage(collectionId:$c,formatId:$f,language:$l){ ${collectionFields} }}`, { c: collectionId, f: formatId, l: language })).setCardSpeechLanguage;
  },
};

/** "10 min", "1 d", "3 wk"… for the hint under an answer button. */
export function intervalLabel(minutes: number, language: Language): string {
  const fr = language === "fr";
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  const days = Math.round(minutes / 1440);
  if (days < 30) return fr ? `${days} j` : `${days} d`;
  if (days < 365) return fr ? `${Math.round(days / 30)} mois` : `${Math.round(days / 30)} mo`;
  return fr ? `${Math.round(days / 365 * 10) / 10} an(s)` : `${Math.round(days / 365 * 10) / 10} y`;
}

/** Which face a field is on: its own choice, otherwise the title on the front and the rest on the back. */
export function faceOf(field: { kind: string; face?: "FRONT" | "BACK" | null }): "FRONT" | "BACK" {
  return field.face ?? (field.kind === "TITLE" ? "FRONT" : "BACK");
}

const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i;
const AUDIO = /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac|weba)(\?.*)?$/i;
/** A web link shown as a picture or a sound on a card (nothing is stored: the file stays where it is). */
export function mediaKind(url: string): "image" | "audio" | null {
  try { const path = new URL(url).pathname; return IMAGE.test(path) ? "image" : AUDIO.test(path) ? "audio" : null; } catch { return null; }
}

export const speechLanguages = [
  ["en-GB", "English (UK)", "Anglais (Royaume-Uni)"], ["en-US", "English (US)", "Anglais (États-Unis)"], ["fr-FR", "French", "Français"], ["es-ES", "Spanish", "Espagnol"],
  ["de-DE", "German", "Allemand"], ["it-IT", "Italian", "Italien"], ["pt-PT", "Portuguese", "Portugais"], ["pt-BR", "Portuguese (Brazil)", "Portugais (Brésil)"],
  ["nl-NL", "Dutch", "Néerlandais"], ["ar-SA", "Arabic", "Arabe"], ["zh-CN", "Chinese", "Chinois"], ["ja-JP", "Japanese", "Japonais"], ["ko-KR", "Korean", "Coréen"], ["ru-RU", "Russian", "Russe"],
] as const;

/** Reads a text aloud with the device's own voice (nothing is sent or stored). */
export function speak(text: string, language?: string | null): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (language) {
    utterance.lang = language;
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.replace("_", "-").toLowerCase().startsWith(language.toLowerCase().slice(0, 2)));
    if (voice) utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
  return true;
}
