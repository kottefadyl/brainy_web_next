import { numberUnits, type Collection, type CollectionFormat, type Field, type Language } from "./brainy";
import { coalesceNode, findFunction, fold, functionById, type FormulaNode } from "./formula-functions";

export type FormulaContext = { collection: Collection; format: CollectionFormat; language: Language };
export class FormulaSyntaxError extends Error {}

const textFieldKinds = new Set(["TEXT", "TITLE", "CODE", "LINK"]);
const OR_WORDS = ["OU", "OR"];
const AND_WORDS = ["ET", "AND"];
const comparisons: Record<string, string> = { "=": "EQ", "==": "EQ", "!=": "NEQ", "<>": "NEQ", "<": "LT", "<=": "LTE", ">": "GT", ">=": "GTE" };
const comparisonSymbols: Record<string, string> = { EQ: "=", NEQ: "!=", LT: "<", LTE: "<=", GT: ">", GTE: ">=" };
const builtInUnits = [...numberUnits.map((item) => ({ id: item.code, symbol: item.symbol })), ...["d", "bpm", "item"].map((id) => ({ id, symbol: id }))];

type Token = { type: "number" | "string" | "ref" | "word" | "op"; value: string; unit?: string; at: number };

const unitId = (name: string, context: FormulaContext): string | undefined => {
  const local = context.collection.units.find((item) => item.symbol === name || item.id === name);
  return local?.id ?? builtInUnits.find((item) => item.id === name || item.symbol === name)?.id;
};

function tokenize(text: string, context: FormulaContext): Token[] {
  const fr = context.language === "fr";
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) { index += 1; continue; }
    const at = index;
    if (char === '"' || char === "[") {
      const close = char === '"' ? '"' : "]";
      let value = "";
      index += 1;
      while (index < text.length && text[index] !== close) {
        if (text[index] === "\\" && index + 1 < text.length) index += 1;
        value += text[index];
        index += 1;
      }
      if (index >= text.length) throw new FormulaSyntaxError(char === '"' ? (fr ? "Il manque le guillemet fermant." : "The closing quote is missing.") : (fr ? "Il manque le crochet fermant ]." : "The closing bracket ] is missing."));
      index += 1;
      tokens.push({ type: char === '"' ? "string" : "ref", value, at });
      continue;
    }
    const number = /^\d+(?:[.,]\d+)?/.exec(text.slice(index));
    if (number) {
      index += number[0].length;
      const token: Token = { type: "number", value: number[0].replace(",", "."), at };
      const unit = /^\s*(?:\{([^}]*)\}|([\p{L}°%€$£₦][\p{L}\p{N}°]*)(?!\s*\())/u.exec(text.slice(index));
      const name = unit?.[1] ?? unit?.[2];
      const id = name === undefined ? undefined : unitId(name, context);
      if (unit && id) { token.unit = id; index += unit[0].length; }
      else if (unit?.[1] !== undefined) throw new FormulaSyntaxError(fr ? `Unité inconnue : ${unit[1]}` : `Unknown unit: ${unit[1]}`);
      tokens.push(token);
      continue;
    }
    const word = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(text.slice(index));
    if (word) { tokens.push({ type: "word", value: word[0], at }); index += word[0].length; continue; }
    const operator = ["??", "<=", ">=", "!=", "<>", "==", "=", "<", ">", "+", "-", "*", "/", "(", ")", ";", ",", "."].find((item) => text.startsWith(item, index));
    if (!operator) throw new FormulaSyntaxError(fr ? `Caractère inattendu : ${char}` : `Unexpected character: ${char}`);
    tokens.push({ type: "op", value: operator, at });
    index += operator.length;
  }
  return tokens;
}

const sameName = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Turns the text of a formula into the expression stored by the API. Types and units are left to the API. */
export function parseFormula(text: string, context: FormulaContext): FormulaNode {
  const fr = context.language === "fr";
  const fail = (frMessage: string, enMessage: string): never => { throw new FormulaSyntaxError(fr ? frMessage : enMessage); };
  const tokens = tokenize(text, context);
  if (!tokens.length) fail("Écrivez une formule.", "Write a formula.");
  let index = 0;
  const peek = (): Token | undefined => tokens[index];
  const isOp = (value: string): boolean => peek()?.type === "op" && peek()?.value === value;
  const isWord = (words: string[]): boolean => peek()?.type === "word" && words.includes(fold(peek()!.value));
  const eatOp = (value: string): boolean => { if (!isOp(value)) return false; index += 1; return true; };
  const unexpected = (): never => { const token = peek(); return token ? fail(`Texte inattendu : ${token.value}`, `Unexpected text: ${token.value}`) : fail("La formule est incomplète.", "The formula is incomplete."); };

  const referenceSegments = (first: string): string[] => {
    const segments = [first];
    while (isOp(".")) {
      index += 1;
      if (peek()?.type !== "ref") fail("Choisissez une propriété entre crochets après le point.", "Choose a property in brackets after the dot.");
      segments.push(tokens[index].value);
      index += 1;
    }
    return segments;
  };

  const fieldNode = (segments: string[]): FormulaNode => {
    if (segments[0].startsWith("=") && segments.length === 1) {
      const name = segments[0].slice(1).trim();
      const formula = context.collection.formulas.find((item) => item.formatId === context.format.id && sameName(item.name, name));
      return formula ? { kind: "formula", formulaId: formula.id } : fail(`Formule introuvable : ${name}`, `Formula not found: ${name}`);
    }
    let format: CollectionFormat | undefined = context.format;
    const steps: Field[] = [];
    for (const [position, name] of segments.entries()) {
      const field: Field | undefined = format?.fields.find((item) => sameName(item.name, name));
      if (!field) return fail(`Champ introuvable : ${name}`, `Field not found: ${name}`);
      steps.push(field);
      if (position === segments.length - 1) break;
      if (field.kind !== "OBJECT_REF") return fail(`${field.name} n'est pas une référence d'objet.`, `${field.name} is not an object reference.`);
      if (field.multiple) return fail(`${field.name} lie plusieurs objets : utilisez SOMME_LIES ou une fonction voisine.`, `${field.name} links several objects: use SUM_RELATED or a similar function.`);
      format = context.collection.formats.find((item) => item.id === field.targetObjectFormatId);
    }
    const last = steps[steps.length - 1];
    if (steps.length === 1) {
      if (last.kind === "NUMBER") return { kind: "field", fieldId: last.id };
      if (last.kind === "DATE" || last.kind === "DATETIME") return { kind: "dateField", fieldId: last.id };
      if (textFieldKinds.has(last.kind)) return { kind: "textField", fieldId: last.id };
      if (last.kind === "DURATION") return { kind: "durationField", fieldId: last.id };
      if (last.kind === "OBJECT_REF") return fail(`Ajoutez un point après ${last.name} pour choisir une propriété.`, `Add a dot after ${last.name} to choose a property.`);
      return fail(`Le champ ${last.name} ne peut pas servir dans une formule.`, `The field ${last.name} cannot be used in a formula.`);
    }
    const kind = last.kind === "NUMBER" ? "property" : textFieldKinds.has(last.kind) ? "textProperty" : undefined;
    if (!kind) return fail(`La propriété ${last.name} ne peut pas servir dans une formule.`, `The property ${last.name} cannot be used in a formula.`);
    const through = steps.slice(1, -1).map((item) => item.id);
    return { kind, referenceFieldId: steps[0].id, ...(through.length ? { through } : {}), propertyFieldId: last.id };
  };

  const relatedNode = (kind: string, segments: string[]): FormulaNode => {
    const reference = context.format.fields.find((item) => sameName(item.name, segments[0]));
    if (reference?.kind !== "OBJECT_REF") return fail("Choisissez un champ de référence d'objet.", "Choose an object reference field.");
    const target = context.collection.formats.find((item) => item.id === reference.targetObjectFormatId);
    if (segments.length > 2) return fail("Choisissez une seule propriété des objets liés.", "Choose a single property of the linked objects.");
    if (segments.length === 1) return kind === "countRelated" ? { kind, referenceFieldId: reference.id } : fail(`Ajoutez la propriété à utiliser : [${reference.name}].[…]`, `Add the property to use: [${reference.name}].[…]`);
    const property = target?.fields.find((item) => sameName(item.name, segments[1]));
    return property ? { kind, referenceFieldId: reference.id, propertyFieldId: property.id } : fail(`Propriété introuvable : ${segments[1]}`, `Property not found: ${segments[1]}`);
  };

  const parseCall = (name: string): FormulaNode => {
    const definition = findFunction(name);
    if (!definition) return fail(`Fonction inconnue : ${name}`, `Unknown function: ${name}`);
    const label = definition[context.language];
    eatOp("(");
    if (definition.related) {
      if (peek()?.type !== "ref") fail(`${label} attend un champ de référence entre crochets.`, `${label} needs a reference field in brackets.`);
      const first = tokens[index].value;
      index += 1;
      const node = relatedNode(definition.related, referenceSegments(first));
      if (!eatOp(")")) unexpected();
      return node;
    }
    const args: FormulaNode[] = [];
    if (!isOp(")")) {
      do { args.push(parseOr()); } while (eatOp(";") || eatOp(","));
    }
    if (!eatOp(")")) unexpected();
    if (args.length < definition.min || args.length > definition.max) {
      const expected = definition.min === definition.max ? String(definition.min) : definition.max > 32 ? (fr ? `au moins ${definition.min}` : `at least ${definition.min}`) : `${definition.min}–${definition.max}`;
      fail(`${label} attend ${expected} valeur(s), reçu ${args.length}.`, `${label} takes ${expected} value(s), got ${args.length}.`);
    }
    return definition.build!(args, fail);
  };

  const parsePrimary = (): FormulaNode => {
    const token = peek();
    if (!token) return unexpected();
    if (eatOp("(")) {
      const inner = parseOr();
      if (!eatOp(")")) unexpected();
      return inner;
    }
    if (token.type === "number") { index += 1; return { kind: "number", value: token.value, ...(token.unit ? { unit: token.unit } : {}) }; }
    if (token.type === "string") { index += 1; return { kind: "textLiteral", value: token.value }; }
    if (token.type === "ref") { index += 1; return fieldNode(referenceSegments(token.value)); }
    if (token.type === "word") {
      index += 1;
      if (isOp("(")) return parseCall(token.value);
      const word = fold(token.value);
      if (word === "VRAI" || word === "TRUE") return { kind: "boolean", value: true };
      if (word === "FAUX" || word === "FALSE") return { kind: "boolean", value: false };
      return fail(`Mot inconnu : ${token.value}. Mettez les noms de champs entre crochets : [${token.value}]`, `Unknown word: ${token.value}. Put field names in brackets: [${token.value}]`);
    }
    return unexpected();
  };

  const parseUnary = (): FormulaNode => {
    if (!eatOp("-")) return parsePrimary();
    const operand = parseUnary();
    if (operand.kind === "number" && !String(operand.value).startsWith("-")) return { ...operand, value: `-${operand.value}` };
    return { kind: "operation", operator: "MULTIPLY", args: [operand, { kind: "number", value: "-1" }] };
  };

  const binaryLevel = (next: () => FormulaNode, operators: Record<string, string>) => (): FormulaNode => {
    let left = next();
    for (;;) {
      const token = peek();
      if (token?.type !== "op" || !operators[token.value]) return left;
      index += 1;
      left = { kind: "operation", operator: operators[token.value], args: [left, next()] };
    }
  };
  const parseMultiplicative = binaryLevel(parseUnary, { "*": "MULTIPLY", "/": "DIVIDE" });
  const parseAdditive = binaryLevel(parseMultiplicative, { "+": "ADD", "-": "SUBTRACT" });

  const parseCoalesce = (): FormulaNode => {
    const args = [parseAdditive()];
    while (eatOp("??")) args.push(parseAdditive());
    return args.length === 1 ? args[0] : coalesceNode(args);
  };

  const parseComparison = (): FormulaNode => {
    const left = parseCoalesce();
    const token = peek();
    if (token?.type !== "op" || !comparisons[token.value]) return left;
    index += 1;
    return { kind: "comparison", operator: comparisons[token.value], left, right: parseCoalesce() };
  };

  const logicalLevel = (next: () => FormulaNode, words: string[], operator: string) => (): FormulaNode => {
    const args = [next()];
    while (isWord(words)) { index += 1; args.push(next()); }
    return args.length === 1 ? args[0] : { kind: "logical", operator, args };
  };
  const parseAnd = logicalLevel(parseComparison, AND_WORDS, "AND");
  function parseOr(): FormulaNode { return logicalLevel(parseAnd, OR_WORDS, "OR")(); }

  const result = parseOr();
  if (peek()) unexpected();
  return result;
}

const escapeName = (name: string): string => name.replace(/[\\\]]/g, "\\$&");
const escapeText = (text: string): string => text.replace(/[\\"]/g, "\\$&");
class Unprintable extends Error {}

/** Levels follow the parser: a child at a lower level than its context needs parentheses. */
const LEVEL = { or: 1, and: 2, comparison: 3, additive: 5, multiplicative: 6, atom: 9 };

/** Rewrites a stored expression as text. Returns null when it cannot be shown without losing part of it. */
export function printFormula(expression: string, context: FormulaContext): string | null {
  const name = (id: string): string => functionById(id)[context.language];
  const call = (id: string, ...parts: string[]): string => `${name(id)}(${parts.join("; ")})`;
  const fieldOf = (format: CollectionFormat | undefined, id: unknown): Field => {
    const field = format?.fields.find((item) => item.id === id);
    if (!field) throw new Unprintable();
    return field;
  };
  const ref = (field: Field): string => `[${escapeName(field.name)}]`;
  const targetOf = (field: Field): CollectionFormat | undefined => context.collection.formats.find((item) => item.id === field.targetObjectFormatId);
  const relatedPath = (node: FormulaNode): string => {
    const reference = fieldOf(context.format, node.referenceFieldId);
    return node.propertyFieldId === undefined ? ref(reference) : `${ref(reference)}.${ref(fieldOf(targetOf(reference), node.propertyFieldId))}`;
  };
  const path = (node: FormulaNode): string => {
    const steps = [node.referenceFieldId, ...((node.through ?? []) as string[])];
    let format: CollectionFormat | undefined = context.format;
    const parts = steps.map((id) => {
      const field = fieldOf(format, id);
      format = targetOf(field);
      return ref(field);
    });
    return [...parts, ref(fieldOf(format, node.propertyFieldId))].join(".");
  };
  const unitText = (unit: string): string => {
    const symbol = context.collection.units.find((item) => item.id === unit)?.symbol ?? unit;
    return /^[\p{L}°%€$£₦][\p{L}\p{N}°]*$/u.test(symbol) ? symbol : `{${symbol}}`;
  };
  const value = (node: unknown): string => write(node as FormulaNode, 0);
  const grouped = (text: string, level: number, context_: number): string => (level < context_ ? `(${text})` : text);
  const dateDiffName: Record<string, string> = { DAYS: "diffDays", HOURS: "diffHours", MONTHS: "diffMonths" };
  const partName: Record<string, string> = { YEAR: "year", MONTH: "month", DAY: "day", WEEKDAY: "weekday" };

  function write(node: FormulaNode, level: number): string {
    switch (node.kind) {
      case "number": return `${node.value}${node.unit ? ` ${unitText(node.unit as string)}` : ""}`;
      case "boolean": return node.value ? (context.language === "fr" ? "VRAI" : "TRUE") : (context.language === "fr" ? "FAUX" : "FALSE");
      case "textLiteral": return `"${escapeText(node.value as string)}"`;
      case "dateLiteral": return call("date", `"${node.value}"`);
      case "field": case "dateField": case "textField": case "durationField": return ref(fieldOf(context.format, node.fieldId));
      case "property": case "textProperty": return path(node);
      case "formula": {
        const formula = context.collection.formulas.find((item) => item.id === node.formulaId);
        if (!formula) throw new Unprintable();
        return `[=${escapeName(formula.name)}]`;
      }
      case "operation": {
        const [left, right] = node.args as FormulaNode[];
        const operator = node.operator as string;
        const own = operator === "ADD" || operator === "SUBTRACT" ? LEVEL.additive : LEVEL.multiplicative;
        const symbol = { ADD: "+", SUBTRACT: "-", MULTIPLY: "*", DIVIDE: "/" }[operator];
        if (!symbol) throw new Unprintable();
        return grouped(`${write(left, own)} ${symbol} ${write(right, own + 1)}`, own, level);
      }
      case "comparison": return grouped(`${write(node.left as FormulaNode, LEVEL.comparison + 1)} ${comparisonSymbols[node.operator as string]} ${write(node.right as FormulaNode, LEVEL.comparison + 1)}`, LEVEL.comparison, level);
      case "logical": {
        const args = node.args as FormulaNode[];
        const isAnd = node.operator === "AND";
        if (args.length < 2) return call(isAnd ? "and" : "or", ...args.map(value));
        const own = isAnd ? LEVEL.and : LEVEL.or;
        return grouped(args.map((item) => write(item, own + 1)).join(` ${name(isAnd ? "and" : "or")} `), own, level);
      }
      case "not": return call("not", value(node.arg));
      case "conditional": return call("if", value(node.condition), value(node.then), value(node.else));
      case "min": case "max": return call(node.kind, ...(node.args as FormulaNode[]).map(value));
      case "coalesce": case "coalesceText": return call("coalesce", ...(node.args as FormulaNode[]).map(value));
      case "abs": case "floor": case "ceil": return call(node.kind, value(node.value));
      case "modulo": return call("modulo", value(node.left), value(node.right));
      case "round": return call("round", value(node.value), String(node.digits), ...(node.mode === "HALF_EVEN" ? ['"HALF_EVEN"'] : []));
      case "dateDifference": {
        const id = node.unit === "h" ? "diffHours" : "diffDays";
        return call(id, ref(fieldOf(context.format, node.toFieldId)), ref(fieldOf(context.format, node.fromFieldId)));
      }
      case "dateDiff": return call(dateDiffName[node.unit as string], value(node.end), value(node.start));
      case "datePart": return call(partName[node.part as string], value(node.date));
      case "addDays": return call("addDays", value(node.date), value(node.days));
      case "startOfMonth": case "endOfMonth": return call(node.kind, value(node.date));
      case "durationIn": return call(node.unit === "HOURS" ? "inHours" : "inMinutes", value(node.duration));
      case "upper": case "lower": case "proper": return call(node.kind, value(node.text));
      case "concat": return call("concat", ...(node.args as FormulaNode[]).map(value));
      case "textLength": return call("length", value(node.text));
      case "substring": return call("substring", value(node.text), value(node.start), value(node.length));
      case "formatText": return call("format", value(node.value), `"${escapeText(node.pattern as string)}"`, ...(node.locale ? [`"${node.locale}"`] : []));
      case "unitOf": return call("unit", value(node.value));
      case "sumRelated": case "avgRelated": case "minRelated": case "maxRelated": case "countRelated": return call(node.kind, relatedPath(node));
      default: throw new Unprintable();
    }
  }

  try {
    const stored = JSON.parse(expression) as FormulaNode & { round?: { digits: number; mode?: string } };
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return null;
    // Older web formulas kept rounding in a `round` key beside a date difference.
    if (stored.kind === "dateDifference" && stored.round) return call("round", write(stored, 0), String(stored.round.digits), ...(stored.round.mode === "HALF_EVEN" ? ['"HALF_EVEN"'] : []));
    return write(stored, 0);
  } catch {
    return null;
  }
}
