// T56: Two-sided cards — review sessions and spaced repetition (API in flash-cards.service.ts).
import { collectionFields, entryFields, request } from "./api";
import type { Collection, Entry, Language } from "./brainy";

export const FLASH_CARDS_TEMPLATE = "cards";
export type CardGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";
export type CardOrder = "DUE" | "OLDEST" | "NEWEST" | "RANDOM";
export type CardDeck = { formatId: string; total: number; due: number; fresh: number };
export type ReviewCard = { entry: Entry; state: { intervalDays: number; reps: number; lapses: number; due: string } | null; preview: { again: number; hard: number; good: number; easy: number } };

export type CardStats = {
  total: number; fresh: number; learning: number; mature: number; reviewed7: number; reviewed30: number; successRate30: number | null;
  days: { day: string; answers: number; remembered: number }[]; forecast: number[]; hardest: { entryId: string; title: string; forgotten: number }[];
  today: { reviewed: number; newCards: number; goal: number | null; newLimit: number | null; streak: number };
};
/** Minutes east of UTC: days, goals and streaks follow the person's own clock. */
const utcOffset = () => -new Date().getTimezoneOffset();

export const isFlashCards = (collection?: Pick<Collection, "templateId"> | null) => collection?.templateId === FLASH_CARDS_TEMPLATE;

export const flashCardsApi = {
  async decks(collectionId: string): Promise<CardDeck[]> {
    return (await request<{ cardDecks: CardDeck[] }>("query($c:String!){cardDecks(collectionId:$c){formatId total due fresh}}", { c: collectionId })).cardDecks;
  },
  async session(collectionId: string, formatId: string, count: number, order: CardOrder): Promise<ReviewCard[]> {
    return (await request<{ cardReviewSession: ReviewCard[] }>(`query($c:String!,$f:String!,$n:Int!,$o:CardReviewOrder!,$z:Int){cardReviewSession(collectionId:$c,formatId:$f,count:$n,order:$o,utcOffsetMinutes:$z){entry{ ${entryFields} } state{intervalDays reps lapses due} preview{again hard good easy}}}`, { c: collectionId, f: formatId, n: count, o: order, z: utcOffset() })).cardReviewSession;
  },
  async grade(collectionId: string, entryId: string, grade: CardGrade): Promise<void> {
    await request("mutation($c:String!,$e:String!,$g:CardGrade!,$z:Int){gradeCard(collectionId:$c,entryId:$e,grade:$g,utcOffsetMinutes:$z){entryId}}", { c: collectionId, e: entryId, g: grade, z: utcOffset() });
  },
  /** T57: my learning progress (whole collection, or one data format). */
  async stats(collectionId: string, formatId?: string | null): Promise<CardStats> {
    return (await request<{ cardStats: CardStats }>("query($c:String!,$f:String,$z:Int){cardStats(collectionId:$c,formatId:$f,utcOffsetMinutes:$z){total fresh learning mature reviewed7 reviewed30 successRate30 days{day answers remembered} forecast hardest{entryId title forgotten} today{reviewed newCards goal newLimit streak}}}", { c: collectionId, f: formatId ?? null, z: utcOffset() })).cardStats;
  },
  async setGoal(collectionId: string, reviewsPerDay: number | null, newPerDay: number | null): Promise<void> {
    await request("mutation($c:String!,$r:Int,$n:Int){setCardGoal(collectionId:$c,reviewsPerDay:$r,newPerDay:$n){reviewsPerDay}}", { c: collectionId, r: reviewsPerDay, n: newPerDay });
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

export const speechLanguages = [
  ["en-GB", "English (UK)", "Anglais (Royaume-Uni)"], ["en-US", "English (US)", "Anglais (États-Unis)"], ["fr-FR", "French", "Français"], ["es-ES", "Spanish", "Espagnol"],
  ["de-DE", "German", "Allemand"], ["it-IT", "Italian", "Italien"], ["pt-PT", "Portuguese", "Portugais"], ["pt-BR", "Portuguese (Brazil)", "Portugais (Brésil)"],
  ["nl-NL", "Dutch", "Néerlandais"], ["ar-SA", "Arabic", "Arabe"], ["zh-CN", "Chinese", "Chinois"], ["ja-JP", "Japanese", "Japonais"], ["ko-KR", "Korean", "Coréen"], ["ru-RU", "Russian", "Russe"],
] as const;

export { speak } from "./card-voices";
