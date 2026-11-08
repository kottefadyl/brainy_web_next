import type { ClassificationCode, Language } from "./brainy";

/** Tree and search over a code list. Same rules as the Flutter client (lib/code_tree.dart). */
export const MAX_CODE_LEVELS = 8;
/** Asking for the deepest level groups every entry by its exact code. */
export const EXACT_CODE_DEPTH = MAX_CODE_LEVELS - 1;

export type CodeNode = { item: ClassificationCode; code: string; label: string; path: string[]; level: number; children: string[]; parent?: string };
export type CodeTree = { nodes: Map<string, CodeNode>; roots: string[] };

/** Lower case without accents, so that "epice" finds "Épicerie". */
export const foldText = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/œ/gi, "oe").replace(/æ/gi, "ae").toLowerCase();

export function buildCodeTree(codes: ClassificationCode[], language: Language): CodeTree {
  const usable = codes.filter((item) => item.code);
  const byCode = new Map(usable.map((item) => [item.code, item]));
  const label = (item: ClassificationCode) => (language === "fr" ? item.labelFr : item.labelEn) || item.code;
  const nodes = new Map<string, CodeNode>(usable.map((item) => {
    const path: string[] = [];
    // A draft being edited may contain a cycle: the walk must still end.
    const seen = new Set([item.code]);
    let parent = item.parentCode ? byCode.get(item.parentCode) : undefined;
    while (parent && !seen.has(parent.code)) {
      seen.add(parent.code);
      path.unshift(label(parent));
      parent = parent.parentCode ? byCode.get(parent.parentCode) : undefined;
    }
    return [item.code, { item, code: item.code, label: label(item), path, level: path.length + 1, children: [], parent: item.parentCode && byCode.has(item.parentCode) ? item.parentCode : undefined }];
  }));
  const roots: string[] = [];
  for (const node of nodes.values()) {
    if (node.parent) nodes.get(node.parent)!.children.push(node.code);
    else roots.push(node.code);
  }
  return { nodes, roots };
}

/** Best matches first: code prefix, label prefix, word start, then anywhere. */
export function searchCodes(tree: CodeTree, query: string, accept: (node: CodeNode) => boolean, limit = 60): { results: CodeNode[]; total: number } {
  const needle = foldText(query.trim());
  if (!needle) return { results: [], total: 0 };
  const ranked: { node: CodeNode; rank: number; order: number }[] = [];
  let order = 0;
  for (const node of tree.nodes.values()) {
    order += 1;
    if (!accept(node)) continue;
    const code = foldText(node.code);
    const label = foldText(node.label);
    const at = label.indexOf(needle);
    const rank = code.startsWith(needle) ? 0 : at === 0 ? 1 : at > 0 && /[^\p{L}\p{N}]/u.test(label[at - 1]) ? 2 : at > 0 || code.includes(needle) ? 3 : -1;
    if (rank >= 0) ranked.push({ node, rank, order });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return { results: ranked.slice(0, limit).map((item) => item.node), total: ranked.length };
}

export function descendantCodes(tree: CodeTree, code: string): Set<string> {
  const found = new Set<string>();
  const pending = [...(tree.nodes.get(code)?.children ?? [])];
  while (pending.length) {
    const next = pending.pop()!;
    if (found.has(next)) continue;
    found.add(next);
    pending.push(...(tree.nodes.get(next)?.children ?? []));
  }
  return found;
}

export function maxCodeLevels(codes: ClassificationCode[]): number {
  let deepest = 1;
  for (const node of buildCodeTree(codes, "en").nodes.values()) deepest = Math.max(deepest, node.level);
  return Math.min(deepest, MAX_CODE_LEVELS);
}

/** The codes whose ancestors must stay visible so that `accept`ed codes can be reached. */
export function reachableCodes(tree: CodeTree, accept: (node: CodeNode) => boolean): Set<string> {
  const reachable = new Set<string>();
  for (const node of tree.nodes.values()) {
    if (!accept(node)) continue;
    let cursor: CodeNode | undefined = node;
    while (cursor && !reachable.has(cursor.code)) {
      reachable.add(cursor.code);
      cursor = cursor.parent ? tree.nodes.get(cursor.parent) : undefined;
    }
  }
  return reachable;
}
