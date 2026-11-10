import { request } from "./api";
import type { ClassificationCode, Collection, Language } from "./brainy";

/** Referential imports (T39/1) and server-side code search for large lists (T39/3). */
export type ReferentialFormat = "CSV" | "JSON";
export type ReferentialPreview = { codeCount: number; levels: number; large: boolean; errors: { row: number; message: string }[]; sample: ClassificationCode[] };
export type FoundCode = { code: string; label: string; path: string[]; level: number; active: boolean; hasChildren: boolean };

/** Below Vercel's 4.5 MB request limit, with room for the rest of the request. */
export const MAX_REFERENTIAL_BYTES = 4_200_000;

export const formatOf = (fileName: string, content: string): ReferentialFormat => (/\.json$/i.test(fileName) || /^\s*[[{]/.test(content) ? "JSON" : "CSV");

export const referentialApi = {
  async preview(format: ReferentialFormat, content: string): Promise<ReferentialPreview> {
    return (await request<{ previewReferential: ReferentialPreview }>("query($f:String!,$c:String!){previewReferential(format:$f,content:$c){codeCount levels large errors{row message} sample{code labelEn labelFr parentCode active}}}", { f: format, c: content })).previewReferential;
  },
  async import(collectionId: string, name: string, format: ReferentialFormat, content: string, listId?: string, expectedVersion?: number): Promise<Pick<Collection, "id" | "codeLists">> {
    return (await request<{ importReferential: Pick<Collection, "id" | "codeLists"> }>("mutation($c:String!,$n:String!,$f:String!,$t:String!,$l:String,$v:Int){importReferential(collectionId:$c,name:$n,format:$f,content:$t,listId:$l,expectedVersion:$v){id codeLists{id name version external codeCount levels codes{code labelEn labelFr parentCode active mergedInto}}}}", { c: collectionId, n: name, f: format, t: content, l: listId, v: expectedVersion })).importReferential;
  },
  async search(collectionId: string, listId: string, options: { query?: string; parentCode?: string; language: Language; includeInactive?: boolean }): Promise<FoundCode[]> {
    return (await request<{ searchClassificationCodes: FoundCode[] }>("query($c:String!,$l:String!,$q:String,$p:String,$lang:String,$i:Boolean){searchClassificationCodes(collectionId:$c,listId:$l,query:$q,parentCode:$p,language:$lang,includeInactive:$i,limit:50){code label path level active hasChildren}}", { c: collectionId, l: listId, q: options.query || undefined, p: options.parentCode || undefined, lang: options.language, i: options.includeInactive ?? false })).searchClassificationCodes;
  },
  async byValue(collectionId: string, listId: string, codes: string[]): Promise<ClassificationCode[]> {
    if (!codes.length) return [];
    return (await request<{ classificationCodesByValue: ClassificationCode[] }>("query($c:String!,$l:String!,$codes:[String!]!){classificationCodesByValue(collectionId:$c,listId:$l,codes:$codes){code labelEn labelFr parentCode active}}", { c: collectionId, l: listId, codes })).classificationCodesByValue;
  },
};
