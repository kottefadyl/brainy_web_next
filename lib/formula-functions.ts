export type FormulaNode = Record<string, unknown> & { kind: string };
type Fail = (fr: string, en: string) => never;
export type FunctionCategory = "logic" | "number" | "date" | "text" | "relation";
export type FormulaFunction = {
  id: string;
  fr: string;
  en: string;
  category: FunctionCategory;
  min: number;
  max: number;
  paramsFr: string;
  paramsEn: string;
  helpFr: string;
  helpEn: string;
  /** Set for functions that take a path to linked objects rather than values. */
  related?: string;
  build?: (args: FormulaNode[], fail: Fail) => FormulaNode;
};

/** Case and accents never matter in function names, so ANNÉE and annee are the same. */
export const fold = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleUpperCase("en");

const textKinds = new Set(["textField", "textLiteral", "textProperty", "unitOf", "coalesceText", "upper", "lower", "proper", "concat", "substring", "formatText"]);
export const isTextNode = (node: FormulaNode): boolean => textKinds.has(node.kind);
export const coalesceNode = (args: FormulaNode[]): FormulaNode => ({ kind: isTextNode(args[0]) ? "coalesceText" : "coalesce", args });

function literal(node: FormulaNode, fail: Fail, fr: string, en: string): string {
  if (node.kind !== "textLiteral") fail(fr, en);
  return node.value as string;
}

const one = (kind: string, key: string) => (args: FormulaNode[]): FormulaNode => ({ kind, [key]: args[0] });
const many = (kind: string) => (args: FormulaNode[]): FormulaNode => ({ kind, args });
const diff = (unit: string) => (args: FormulaNode[]): FormulaNode => ({ kind: "dateDiff", unit, end: args[0], start: args[1] });
const part = (name: string) => (args: FormulaNode[]): FormulaNode => ({ kind: "datePart", part: name, date: args[0] });
const durationIn = (unit: string) => (args: FormulaNode[]): FormulaNode => ({ kind: "durationIn", unit, duration: args[0] });
const logical = (operator: string) => (args: FormulaNode[]): FormulaNode => ({ kind: "logical", operator, args });

type Row = [id: string, fr: string, en: string, category: FunctionCategory, min: number, max: number, paramsFr: string, paramsEn: string, helpFr: string, helpEn: string, build?: FormulaFunction["build"], related?: string];
const MANY = 64;

const rows: Row[] = [
  ["if", "SI", "IF", "logic", 3, 3, "condition; si_vrai; si_faux", "condition; if_true; if_false", "Donne une valeur ou une autre selon la condition.", "Gives one value or another depending on the condition.", (a) => ({ kind: "conditional", condition: a[0], then: a[1], else: a[2] })],
  ["and", "ET", "AND", "logic", 1, MANY, "condition1; condition2; …", "condition1; condition2; …", "Vrai si toutes les conditions sont vraies. S'écrit aussi a ET b.", "True when every condition is true. Also written a AND b.", logical("AND")],
  ["or", "OU", "OR", "logic", 1, MANY, "condition1; condition2; …", "condition1; condition2; …", "Vrai si au moins une condition est vraie. S'écrit aussi a OU b.", "True when at least one condition is true. Also written a OR b.", logical("OR")],
  ["not", "NON", "NOT", "logic", 1, 1, "condition", "condition", "Inverse une condition.", "Reverses a condition.", one("not", "arg")],
  ["coalesce", "COALESCENCE", "COALESCE", "logic", 2, MANY, "valeur; repli; …", "value; fallback; …", "Donne la première valeur présente. S'écrit aussi a ?? b.", "Gives the first value that is present. Also written a ?? b.", coalesceNode],

  ["min", "MIN", "MIN", "number", 2, MANY, "a; b; …", "a; b; …", "La plus petite des valeurs.", "The smallest of the values.", many("min")],
  ["max", "MAX", "MAX", "number", 2, MANY, "a; b; …", "a; b; …", "La plus grande des valeurs.", "The largest of the values.", many("max")],
  ["abs", "ABS", "ABS", "number", 1, 1, "x", "x", "Valeur absolue.", "Absolute value.", one("abs", "value")],
  ["floor", "PLANCHER", "FLOOR", "number", 1, 1, "x", "x", "Arrondit vers le bas à l'entier.", "Rounds down to a whole number.", one("floor", "value")],
  ["ceil", "PLAFOND", "CEIL", "number", 1, 1, "x", "x", "Arrondit vers le haut à l'entier.", "Rounds up to a whole number.", one("ceil", "value")],
  ["modulo", "MODULO", "MOD", "number", 2, 2, "a; b", "a; b", "Reste de la division de a par b.", "Remainder of a divided by b.", (a) => ({ kind: "modulo", left: a[0], right: a[1] })],
  ["round", "ARRONDI", "ROUND", "number", 2, 3, "x; décimales; \"HALF_EVEN\"", "x; decimals; \"HALF_EVEN\"", "Arrondit à 0–6 décimales. Option : arrondi au pair.", "Rounds to 0–6 decimals. Option: round half to even.", (a, fail) => {
    if (a[1].kind !== "number" || a[1].unit) fail("Indiquez le nombre de décimales avec un nombre simple.", "Give the number of decimals as a plain number.");
    const mode = a[2] ? literal(a[2], fail, "Le mode d'arrondi s'écrit entre guillemets.", "Write the rounding mode in quotes.") : "HALF_UP";
    return { kind: "round", digits: Number(a[1].value), mode, value: a[0] };
  }],

  ["date", "DATE", "DATE", "date", 1, 1, "\"2026-03-01\"", "\"2026-03-01\"", "Une date fixe, au format année-mois-jour.", "A fixed date, written year-month-day.", (a, fail) => ({ kind: "dateLiteral", value: literal(a[0], fail, "Écrivez la date entre guillemets : \"2026-03-01\".", "Write the date in quotes: \"2026-03-01\".") })],
  ["diffDays", "DIFF_JOURS", "DIFF_DAYS", "date", 2, 2, "fin; début", "end; start", "Nombre de jours entre deux dates.", "Number of days between two dates.", diff("DAYS")],
  ["diffHours", "DIFF_HEURES", "DIFF_HOURS", "date", 2, 2, "fin; début", "end; start", "Nombre d'heures entre deux dates.", "Number of hours between two dates.", diff("HOURS")],
  ["diffMonths", "DIFF_MOIS", "DIFF_MONTHS", "date", 2, 2, "fin; début", "end; start", "Nombre de mois complets entre deux dates.", "Number of complete months between two dates.", diff("MONTHS")],
  ["addDays", "AJOUTER_JOURS", "ADD_DAYS", "date", 2, 2, "date; n", "date; n", "Décale une date de n jours, négatif pour reculer.", "Shifts a date by n days, negative to go back.", (a) => ({ kind: "addDays", date: a[0], days: a[1] })],
  ["startOfMonth", "DEBUT_MOIS", "START_OF_MONTH", "date", 1, 1, "date", "date", "Premier jour du mois.", "First day of the month.", one("startOfMonth", "date")],
  ["endOfMonth", "FIN_MOIS", "END_OF_MONTH", "date", 1, 1, "date", "date", "Dernier jour du mois.", "Last day of the month.", one("endOfMonth", "date")],
  ["year", "ANNEE", "YEAR", "date", 1, 1, "date", "date", "L'année d'une date.", "The year of a date.", part("YEAR")],
  ["month", "MOIS", "MONTH", "date", 1, 1, "date", "date", "Le mois d'une date, de 1 à 12.", "The month of a date, from 1 to 12.", part("MONTH")],
  ["day", "JOUR", "DAY", "date", 1, 1, "date", "date", "Le jour du mois.", "The day of the month.", part("DAY")],
  ["weekday", "JOUR_SEMAINE", "WEEKDAY", "date", 1, 1, "date", "date", "Jour de la semaine : lundi = 1, dimanche = 7.", "Day of the week: Monday = 1, Sunday = 7.", part("WEEKDAY")],
  ["inMinutes", "DUREE_EN_MINUTES", "DURATION_IN_MINUTES", "date", 1, 1, "durée", "duration", "Convertit une durée en minutes.", "Converts a duration to minutes.", durationIn("MINUTES")],
  ["inHours", "DUREE_EN_HEURES", "DURATION_IN_HOURS", "date", 1, 1, "durée", "duration", "Convertit une durée en heures.", "Converts a duration to hours.", durationIn("HOURS")],

  ["upper", "MAJUSCULE", "UPPER", "text", 1, 1, "texte", "text", "Met le texte en majuscules.", "Converts text to upper case.", one("upper", "text")],
  ["lower", "MINUSCULE", "LOWER", "text", 1, 1, "texte", "text", "Met le texte en minuscules.", "Converts text to lower case.", one("lower", "text")],
  ["proper", "PROPRE", "PROPER", "text", 1, 1, "texte", "text", "Met une majuscule au début de chaque mot.", "Capitalises the start of each word.", one("proper", "text")],
  ["concat", "CONCATENER", "CONCAT", "text", 2, MANY, "texte1; texte2; …", "text1; text2; …", "Assemble plusieurs textes.", "Joins several texts.", many("concat")],
  ["length", "LONGUEUR", "LEN", "text", 1, 1, "texte", "text", "Nombre de caractères.", "Number of characters.", one("textLength", "text")],
  ["substring", "SOUS_CHAINE", "SUBSTRING", "text", 3, 3, "texte; début; longueur", "text; start; length", "Extrait une partie du texte, en comptant à partir de 1.", "Extracts part of a text, counting from 1.", (a) => ({ kind: "substring", text: a[0], start: a[1], length: a[2] })],
  ["format", "TEXTE", "TEXT", "text", 2, 3, "valeur; \"format\"; \"fr\"", "value; \"format\"; \"fr\"", "Écrit un nombre (\"0.00\", \"#,##0.00\") ou une date (\"DD/MM/YYYY\") en texte.", "Writes a number (\"0.00\", \"#,##0.00\") or a date (\"DD/MM/YYYY\") as text.", (a, fail) => {
    const pattern = literal(a[1], fail, "Écrivez le format entre guillemets.", "Write the format in quotes.");
    const locale = a[2] ? literal(a[2], fail, "Écrivez la langue entre guillemets : \"fr\" ou \"en\".", "Write the language in quotes: \"fr\" or \"en\".") : undefined;
    return { kind: "formatText", value: a[0], pattern, ...(locale ? { locale } : {}) };
  }],
  ["unit", "UNITE", "UNIT", "text", 1, 1, "valeur", "value", "L'unité d'une valeur, en texte.", "The unit of a value, as text.", one("unitOf", "value")],

  ["sumRelated", "SOMME_LIES", "SUM_RELATED", "relation", 1, 1, "[Liens].[Propriété]", "[Links].[Property]", "Somme d'une propriété des objets liés.", "Sum of a property of the linked objects.", undefined, "sumRelated"],
  ["avgRelated", "MOYENNE_LIES", "AVG_RELATED", "relation", 1, 1, "[Liens].[Propriété]", "[Links].[Property]", "Moyenne d'une propriété des objets liés.", "Average of a property of the linked objects.", undefined, "avgRelated"],
  ["minRelated", "MIN_LIES", "MIN_RELATED", "relation", 1, 1, "[Liens].[Propriété]", "[Links].[Property]", "Plus petite valeur parmi les objets liés.", "Smallest value among the linked objects.", undefined, "minRelated"],
  ["maxRelated", "MAX_LIES", "MAX_RELATED", "relation", 1, 1, "[Liens].[Propriété]", "[Links].[Property]", "Plus grande valeur parmi les objets liés.", "Largest value among the linked objects.", undefined, "maxRelated"],
  ["countRelated", "COMPTE_LIES", "COUNT_RELATED", "relation", 1, 1, "[Liens] ou [Liens].[Propriété]", "[Links] or [Links].[Property]", "Nombre d'objets liés, ou de ceux qui ont la propriété.", "Number of linked objects, or of those with the property.", undefined, "countRelated"],
];

export const formulaFunctions: FormulaFunction[] = rows.map(([id, fr, en, category, min, max, paramsFr, paramsEn, helpFr, helpEn, build, related]) => ({ id, fr, en, category, min, max, paramsFr, paramsEn, helpFr, helpEn, build, related }));

const byName = new Map(formulaFunctions.flatMap((item) => [[item.fr, item], [item.en, item]] as const));
export const findFunction = (name: string): FormulaFunction | undefined => byName.get(fold(name));
export const functionById = (id: string): FormulaFunction => formulaFunctions.find((item) => item.id === id)!;
